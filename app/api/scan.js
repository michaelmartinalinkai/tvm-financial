/* SlowDough — invoice / bank-statement scanner (Vercel serverless function)
   POST { image: base64, mime: "image/jpeg" | "image/png" | "application/pdf" }
   -> { items: [ { name, amount, freq:"monthly"|"once", dueDate?:"YYYY-MM-DD", dueDay?:1-31 } ] }
   The Anthropic API key lives ONLY in the server env var ANTHROPIC_API_KEY. */

const MODEL = process.env.SCAN_MODEL || "claude-haiku-4-5-20251001";

const PROMPT = `You are a finance assistant that extracts upcoming PAYMENTS the user needs to make, from a photo of an invoice/bill OR a bank e-statement.

Return ONLY a JSON object, no prose, in exactly this shape:
{"items":[{"name":string,"amount":number,"freq":"monthly"|"once","dueDate":"YYYY-MM-DD"|null,"dueDay":number|null,"confidence":"high"|"medium"|"low"}]}

Rules:
- "name": short payee/description (e.g. "Electricity - PLN", "Visa card", "Netflix").
- "amount": the amount DUE as a plain number (no currency symbol, no thousands separators). Use the total/amount-due, not subtotals.
- If a specific calendar due date is present, set "dueDate" (YYYY-MM-DD) and "freq":"once", leave "dueDay" null.
- If it is clearly a recurring monthly bill with only a day-of-month, set "freq":"monthly" and "dueDay" (1-31), leave "dueDate" null.
- For a bank statement, list distinct upcoming or recurring outgoing payments you can identify; ignore deposits/income and past one-off purchases that won't recur.
- If you cannot find any payment, return {"items":[]}.
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
  // Prefer a fenced or raw {...} block
  const objMatch = text.match(/\{[\s\S]*\}/);
  try {
    if (objMatch) {
      const parsed = JSON.parse(objMatch[0]);
      if (Array.isArray(parsed)) return { items: parsed };
      if (parsed && Array.isArray(parsed.items)) return parsed;
    }
  } catch (e) {}
  // Fallback: a bare array
  const arrMatch = text.match(/\[[\s\S]*\]/);
  try {
    if (arrMatch) return { items: JSON.parse(arrMatch[0]) };
  } catch (e) {}
  return { items: [] };
}

module.exports = async (req, res) => {
  // CORS (same-origin in practice; harmless to allow)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY. Add it in Vercel project settings." });

  let body;
  try {
    body = JSON.parse((await readBody(req)) || "{}");
  } catch (e) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const { image, mime } = body;
  if (!image) return res.status(400).json({ error: "No image provided" });

  const isPdf = (mime || "").includes("pdf");
  const source = isPdf
    ? { type: "base64", media_type: "application/pdf", data: image }
    : { type: "base64", media_type: mime || "image/jpeg", data: image };
  const block = isPdf ? { type: "document", source } : { type: "image", source };

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        messages: [{ role: "user", content: [{ type: "text", text: PROMPT }, block] }],
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      return res.status(502).json({ error: (data && data.error && data.error.message) || "AI service error" });
    }
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
    return res.status(200).json({ items });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
};
