# SlowDough — Gentle Budget Planner (build & spec)

A local-first, installable **PWA** budget planner. No framework, no build step — plain
HTML/CSS/JS in a single `index.html`, plus an optional serverless function for AI
invoice/statement scanning. Data is stored in the browser (`localStorage`) and can be
exported/imported as JSON for backup and moving between devices.

Live reference build: https://outputs-eight-taupe.vercel.app  (app password: `kayaraya2026!`)

---

## 1. File structure

```
/
├── index.html        # The entire app (UI + logic + styles). Self-contained.
├── manifest.json     # PWA manifest (name, icons, theme, standalone display)
├── sw.js             # Service worker (network-first for HTML, cache fallback offline)
└── api/
    └── scan.js       # Serverless function: AI reads invoices/e-statements (Vercel/Node)
```

No `package.json`, no bundler, no dependencies for the front end. The only external
call is the optional `/api/scan` endpoint, which calls the Anthropic API.

---

## 2. Tech stack

- **Frontend:** Vanilla JavaScript (ES2019+), hand-written CSS with CSS variables
  (light/dark theme). Custom-drawn SVG charts (donut + bars) — no chart library, so it
  works fully offline.
- **Storage:** `localStorage` under key `slowdough_v1`. Single JSON state object.
- **PWA:** `manifest.json` + `sw.js`. Installable; offline-capable.
- **Scanner backend:** A single Node serverless function (`api/scan.js`) deployed on
  Vercel. Uses the Anthropic Messages API with a vision/document model. The API key is
  a **server-side environment variable** — never shipped to the browser.

---

## 3. Running locally

It must be served over HTTP (service worker + `fetch` won't work from `file://`):

```bash
# from the project root
npx serve .            # or: python3 -m http.server 8000
```

Open the printed URL. The scanner won't work locally unless you also run a backend that
serves `/api/scan` with the env var set (easiest is to just test scanning on Vercel).

---

## 4. Deploying

### Option A — Netlify (no backend / scanner disabled)
Drag the folder onto https://app.netlify.com/drop. The app works fully except the AI
scanner (Netlify needs a Netlify Function equivalent — see note below).

### Option B — Vercel (recommended, enables the scanner)
```bash
npm i -g vercel
vercel deploy --prod      # follow prompts; it auto-detects /api as a function
```
Then set the environment variable (see §6) and redeploy.

> Netlify equivalent for the scanner: move `api/scan.js` to
> `netlify/functions/scan.js`, export a `handler(event)` instead of `(req,res)`, read
> the body from `event.body`, and set the same env var in Netlify settings. The request
> path becomes `/.netlify/functions/scan` (update the `fetch` URL in `index.html`).

---

## 5. Configuration

- **App password:** in `index.html`, near the top of the `<script>`:
  ```js
  const PASSWORD = "kayaraya2026!";
  ```
  ⚠️ This is a **client-side** gate (good enough for a soft paywall, not real security —
  anyone can read it in the source). For real access control you need accounts + a
  backend (see Phase 2).
- **Storage key:** `const STORE_KEY = "slowdough_v1";`
- **Default categories:** `DEFAULT_CATS` array.

---

## 6. Scanner backend (`api/scan.js`)

**Purpose:** Accepts an uploaded invoice/bill photo or a bank e-statement (image or PDF),
asks an Anthropic vision model to extract the payments, and returns structured JSON the
app turns into scheduled bills (user confirms before saving).

**Request** (`POST /api/scan`, JSON):
```json
{ "image": "<base64, no data: prefix>", "mime": "image/jpeg | image/png | application/pdf" }
```

**Response:**
```json
{ "items": [
  { "name": "Electricity - PLN", "amount": 340, "freq": "monthly", "dueDate": null, "dueDay": 20, "confidence": "high" },
  { "name": "School fee", "amount": 1200, "freq": "once", "dueDate": "2026-07-01", "dueDay": null, "confidence": "medium" }
] }
```

**Required env var (set in Vercel → Project → Settings → Environment Variables):**
```
ANTHROPIC_API_KEY = sk-ant-...          # required
SCAN_MODEL        = claude-haiku-4-5-20251001   # optional, default is a cheap vision model
```

**Client side (already in `index.html`):**
- Images are downscaled in-browser (canvas, max 1600px, JPEG q0.82) before upload to
  stay under serverless body limits (~4.5 MB on Vercel) and cut cost. PDFs are sent
  as-is (base64).
- Results open an **editable confirmation modal** — nothing is saved until the user taps
  "Add selected to schedule".

**Privacy note:** All app data stays on-device EXCEPT during a scan, when the uploaded
image/PDF is sent to the Anthropic API to be read. Make that clear to users.

---

## 7. Data model (the `state` object in localStorage)

```js
{
  onboarded: false,
  settings: { name, currency, currencyPos: "before"|"after", monthlyIncome, theme: "light"|"dark" },
  categories: [ { id, name, emoji, budget, type: "expense"|"income" } ],
  transactions: [ { id, date: "YYYY-MM-DD", type: "income"|"expense", amount, catId, note } ],
  bills: [
    // monthly:
    { id, name, amount, freq: "monthly", dueDay: 1-31, paid: { "YYYY-MM": true } },
    // one-time:
    { id, name, amount, freq: "once", dueDate: "YYYY-MM-DD", paidOnce: false }
  ],
  goals: [ { id, name, target, saved, emoji } ],
  debts: [ { id, name, total, paid, emoji } ]
}
```

### Key logic to preserve when rebuilding
- **`billStatus(bill)`** computes the soonest *unpaid* occurrence: for monthly bills it
  walks forward month by month skipping months already marked paid; returns
  `{ nextDue (Date), nextDueISO, periodKey "YYYY-MM", donePeriod, daysLeft }`.
- **Payments page** groups into: **Overdue** (daysLeft < 0), **Upcoming** (daysLeft ≥ 0,
  sorted by date), and **Paid this month** (with one-tap undo). Countdown chips:
  Overdue Nd / Due today / In Nd.
- **Dashboard** KPIs + SVG donut (spend by category) + daily in/out bars + budget-vs-actual.
- **Monthly Recap** writes a short plain-language summary; **Yearly** shows 12-month bars.
- **Backup**: Export = download `state` as JSON; Import = validate (`"transactions"` key
  present) then replace state.

---

## 8. Screens / navigation

Home · Daily Input · **Payments** (bills + AI scanner) · Goals · Debt Payoff ·
Dashboard · Monthly Recap · Yearly · Setup · Backup & Data.
Sidebar on desktop; bottom tab bar + "More" sheet on mobile (≤860px).

---

## 9. Suggested Phase 2 (not built yet)
- **Cloud sync + real login** (e.g. Supabase auth + a `state` row per user) → replaces the
  client-side password, enables automatic multi-device sync.
- **Read bank emails automatically** via Gmail OAuth (find statements/bills in the inbox)
  — needs login + backend; pairs naturally with cloud sync.
- **Recurring auto-rollover reminders / push notifications** for due dates.

---

## 10. Known limitations
- Client-side password is not real security.
- `localStorage` is per-browser and can be cleared by the user — hence Export/Import.
- Scanner accuracy depends on image quality; always shown for user confirmation.
- Vercel serverless body limit (~4.5 MB) — large multi-page PDFs may need splitting.
