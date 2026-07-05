function Setup(){
  const s=state.settings;
  return `
  <div class="page-head"><h2>Setup ⚙️</h2><p>Make it yours. You can change any of this anytime.</p></div>
  <div class="card mb">
    <h3>The basics</h3>
    <div class="field"><label>Your name (optional)</label><input id="sName" value="${esc(s.name)}" placeholder="What should we call you?" /></div>
    <div class="row">
      <div class="field"><label>Currency symbol</label><input id="sCur" value="${esc(s.currency)}" maxlength="3" placeholder="Rp" /></div>
      <div class="field"><label>Symbol position</label><select id="sPos"><option value="before" ${s.currencyPos==='before'?'selected':''}>Before  ($100)</option><option value="after" ${s.currencyPos==='after'?'selected':''}>After  (100€)</option></select></div>
      <div class="field"><label>Monthly income</label><input id="sInc" type="number" inputmode="decimal" value="${s.monthlyIncome||''}" placeholder="0" /></div>
    </div>
    <button class="btn" data-act="saveSettings">Save basics</button>
  </div>
  <div class="card mb">
    <h3>💱 Multi-currency</h3>
    <div class="sub">The EUR → Rp rate drives how EUR accounts (like Wise) convert into your total Rupiah balance everywhere in the app.</div>
    <div class="flex wrap small muted" style="justify-content:space-between;gap:6px"><span>Current rate</span><span><b>1 EUR = ${money(eurRate(),'Rp')}</b></span></div>
    ${hasAccounts()?`<button class="btn sm secondary mt" data-act="editAccounts">✏️ Edit accounts & rate</button>`:`<div class="small muted mt">Add bank accounts from your Home balance card to enable multi-currency.</div>`}
  </div>
  <div class="card">
    <div class="flex"><h3>Categories & budgets</h3><button class="btn sm secondary right" data-act="addCat">＋ Category</button></div>
    <div class="sub">Set a monthly budget per category (optional) to power the Budget vs Actual tracker.</div>
    <div class="list mt">${state.categories.map(catRow).join("")}</div>
  </div>`;
}
function catRow(c){
  return `<div class="item">
    <div class="emoji">${c.emoji}</div>
    <div class="main"><div class="t">${esc(c.name)} <span class="tag">${c.type}</span></div>
    <div class="s">${c.type==='expense'?'Monthly budget':'Income source'}</div></div>
    ${c.type==='expense'?`<input class="catbudget" data-cat="${c.id}" type="number" inputmode="decimal" value="${c.budget||''}" placeholder="0" style="width:92px;padding:8px;border:1px solid var(--line);border-radius:9px;background:var(--surface-2);color:var(--ink);text-align:right" />`:''}
    <button class="x" data-delcat="${c.id}">✕</button>
  </div>`;
}

/* ---------- BACKUP ---------- */
function Backup(){
  const size=(JSON.stringify(state).length/1024).toFixed(1);
  const count=state.transactions.length;
  return `
  <div class="page-head"><h2>Backup & Data 💾</h2><p>Your data syncs securely across your devices. You can also keep your own backup file.</p></div>
  <div class="card mb" style="border-color:var(--brand);background:var(--brand-soft)">
    <h3>🔄 Synced across your devices</h3>
    <p class="small" style="margin:6px 0 0;color:var(--brand-ink)">You and Afni share the same live data. When one of you adds something, it shows up for the other on the next open — and your entries won't overwrite each other. The export below is just an extra personal copy.</p>
  </div>
  <div class="card mb">
    <h3>Your data</h3>
    <div class="flex wrap small muted mt"><span class="pill">${count} transactions</span><span class="pill">${state.goals.length} goals</span><span class="pill">${state.bills.length} bills</span><span class="pill">${size} KB</span></div>
    <div class="flex wrap mt">
      <button class="btn sm" data-act="export">📥 Export backup</button>
      <button class="btn sm secondary" data-act="importBtn">📤 Import backup</button>
      <input type="file" id="importFile" accept="application/json,.json" class="hidden" />
    </div>
  </div>
  <div class="card mb">
    <h3>How your sync works</h3>
    <p class="small muted" style="margin:6px 0 0">Your data is stored on your own private TVM server and encrypted in transit. It loads on each device and merges changes per entry, so two people editing at once is safe. Export anytime for an offline copy.</p>
  </div>
  <div class="card" style="border-color:var(--danger-soft)">
    <h3>Danger zone</h3>
    <p class="small muted" style="margin:6px 0 12px">Export a backup first — this can’t be undone.</p>
    <button class="btn sm danger" data-act="reset">🗑️ Reset all data</button>
  </div>`;
}

/* ===================== SHARED UI BITS ===================== */