/* Financial TVM — invoice / receipt / bank-statement scanner.
   Standalone Node HTTP service (systemd binky-financial-scan.service, 127.0.0.1:8082),
   proxied by nginx at /financial/api/scan.
   POST { image: base64, mime: "image/jpeg" | "image/png" | "application/pdf" }
   -> { items: [ { name, amount, freq:"monthly"|"once", dueDate?:"YYYY-MM-DD", dueDay?:1-31, confidence } ] }

   Runs on the Link AI OAuth subscription (NOT metered API credits) — per Mike's hard rule
   internal/pre-live tools call Claude via the OAuth token, so scans cost nothing extra.
   Auth: Authorization: Bearer $ANTHROPIC_OAUTH_TOKEN + header anthropic-beta: oauth-2025-04-20.
   (No `tools` in the request, so the Claude-Code identity-block requirement does not apply.) */

const http = require("http");

const MODEL = process.env.SCAN_MODEL || "claude-haiku-4-5-20251001";
const PORT = +process.env.SCAN_PORT || 8082;
const OAUTH = process.env.ANTHROPIC_OAUTH_TOKEN || "";

const PROMPT = `You are a finance assistant that extracts money items from a photo of an invoice/bill/receipt OR a bank e-statement, for a bookkeeping app.

Return ONLY a JSON object, no prose, in exactly this shape:
{"items":[{"name":string,"amount":number,"freq":"monthly"|"once","dueDate":"YYYY-MM-DD"|null,"dueDay":number|null,"confidence":"high"|"medium"|"low"}]}

Rules:
- "name": short payee/description (e.g. "Electricity - PLN", "Villa Ann deposit", "Ace Hardware", "Netflix").
- "amount": the amount as a plain number (no currency symbol, no thousands separators). Use the total / amount-due, not subtotals. Indonesian format "Rp 1.250.000" means 1250000.
- Receipt already paid -> "freq":"once", "dueDate" = the receipt date (YYYY-MM-DD), "dueDay":null.
- Invoice/bill with a specific due date -> "freq":"once", "dueDate" that date, "dueDay":null.
- Recurring monthly bill with only a day-of-month -> "freq":"monthly", "dueDay" (1-31), "dueDate":null.
- Bank statement -> list distinct outgoing payments you can identify; ignore deposits/income.
- If you cannot find any item, return {"items":[]}.
- Never invent amounts or dates. Use "confidence":"low" when unsure.`;

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function extractJson(text) {
  if (!text) return { items: [] };
  const objMatch = text.match(/\{[\s\S]*\}/);
  try {
    if (objMatch) {
      const parsed = JSON.parse(objMatch[0]);
      if (Array.isArray(parsed)) return { items: parsed };
      if (parsed && Array.isArray(parsed.items)) return parsed;
    }
  } catch (e) {}
  const arrMatch = text.match(/\[[\s\S]*\]/);
  try {
    if (arrMatch) return { items: JSON.parse(arrMatch[0]) };
  } catch (e) {}
  return { items: [] };
}

async function handle(req, res) {
  const send = (code, obj) => {
    res.writeHead(code, { "content-type": "application/json", "access-control-allow-origin": "*" });
    res.end(JSON.stringify(obj));
  };
  if (req.method === "OPTIONS") { res.writeHead(200); return res.end(); }
  if (req.method !== "POST") return send(405, { error: "POST only" });
  if (!OAUTH) return send(500, { error: "Server missing ANTHROPIC_OAUTH_TOKEN" });

  let body;
  try { body = JSON.parse((await readBody(req)) || "{}"); }
  catch (e) { return send(400, { error: "Invalid JSON body" }); }

  const { image, mime } = body;
  if (!image) return send(400, { error: "No image provided" });

  const isPdf = (mime || "").includes("pdf");
  const source = { type: "base64", media_type: isPdf ? "application/pdf" : (mime || "image/jpeg"), data: image };
  const block = isPdf ? { type: "document", source } : { type: "image", source };

  const payload = JSON.stringify({
    model: MODEL,
    max_tokens: 1500,
    // OAuth-subscription endpoint requires the Claude Code identity as the first system block.
    system: [{ type: "text", text: "You are Claude Code, Anthropic's official CLI for Claude." }],
    messages: [{ role: "user", content: [{ type: "text", text: PROMPT }, block] }],
  });
  try {
    // The subscription is shared with our Claude Code sessions, so brief 429s happen when it's
    // saturated. Retry a few times with backoff so an occasional collision recovers transparently.
    let r, data;
    for (let attempt = 0; attempt < 4; attempt++) {
      r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "authorization": "Bearer " + OAUTH,
          "anthropic-version": "2023-06-01",
          "anthropic-beta": "oauth-2025-04-20",
        },
        body: payload,
      });
      data = await r.json();
      if (r.status !== 429) break;
      await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)));
    }
    if (r.status === 429) return send(429, { error: "AI is busy right now (rate limit). Please try again in a moment." });
    if (!r.ok) return send(502, { error: (data && data.error && data.error.message) || ("AI service error " + r.status) });
    const text = (data.content || []).map((c) => c.text || "").join("");
    const parsed = extractJson(text);
    const items = (parsed.items || [])
      .filter((it) => it && it.name && Number(it.amount) > 0)
      .map((it) => ({
        name: String(it.name).slice(0, 80),
        amount: Number(it.amount),
        freq: it.freq === "once" ? "once" : "monthly",
        dueDate: it.dueDate || null,
        dueDay: it.dueDay ? Math.max(1, Math.min(31, Number(it.dueDay))) : null,
        confidence: it.confidence || "medium",
      }));
    return send(200, { items });
  } catch (e) {
    return send(500, { error: String((e && e.message) || e) });
  }
}

http.createServer((req, res) => {
  handle(req, res).catch((e) => { try { res.writeHead(500); res.end(JSON.stringify({ error: String(e) })); } catch (_) {} });
}).listen(PORT, "127.0.0.1", () => console.log("scan service on 127.0.0.1:" + PORT + " model=" + MODEL));
