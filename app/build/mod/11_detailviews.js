/* one row for a villa-tagged transaction — handles income/expense normally, and shows a
   villa-tagged transfer as a neutral (non P&L) line instead of mis-coloring it as an expense. */
function villaTxRow(t){
  const c=catById(t.catId);
  const isTransfer=t.type==="transfer";
  const inc=t.type==="income";
  const chips=tagChips(t.tags);
  const title=isTransfer?transferLabel(t):(esc(t.note)||esc(c.name));
  const sub=isTransfer?`Transfer (not P&L) · ${prettyDate(t.date)}`:`${c.name} · ${prettyDate(t.date)}`;
  const cls=isTransfer?'tf':(inc?'inc':'exp');
  const sign=isTransfer?'':(inc?'+':'−');
  return `<div class="tx-line">
    <div class="tx-ic">${isTransfer?'🔁':c.emoji}</div>
    <div class="tx-main">
      <div class="tx-t">${title}</div>
      <div class="tx-s">${sub}</div>
      ${chips?`<div style="margin-top:4px">${chips}</div>`:''}
    </div>
    <div class="tx-amt ${cls}" style="max-width:38%;overflow:hidden;text-overflow:ellipsis" title="${money(t.amount)}">${sign}${money(t.amount)}</div>
    <button class="x" data-edittx="${t.id}" title="Edit" style="font-size:15px;flex-shrink:0">✎</button>
  </div>`;
}
function VillaView(){
  const v=(state.villas||[]).find(x=>x.id===selVilla);
  const head=`<button class="btn sm secondary mb" data-go="biz">‹ Villas & Investors</button>`;
  if(!v) return head+`<div class="card">${emptyState("🏝️","Villa not found","It may have been deleted.")}</div>`;
  const tg=villaTagTotals(v.id);
  const income=(+v.income||0)+tg.inc, expense=(+v.expense||0)+tg.exp, net=income-expense;
  const tx=villaTx(v.id);
  const catSpend=villaCatSpend(v.id);
  const meta=[ v.code?esc(v.code):null, (v.owner&&v.owner!=='TVM')?`Owner: ${esc(v.owner)}`:null,
               v.rentYear?`Rent ${money(v.rentYear)}/yr`:null, v.status?esc(v.status):null ].filter(Boolean).join(' · ');
  const manualNote=((+v.income||0)||(+v.expense||0))?`<div class="small muted mt">Includes manual totals logged via ＋ Log (In ${money(v.income||0)} · Out ${money(v.expense||0)}) plus ${tx.length} tagged transaction${tx.length===1?'':'s'}.</div>`:'';
  const list=tx.length? tx.slice(0,40).map(villaTxRow).join("")
    : emptyState("🗒️","No tagged transactions","Tag a villa when you Add income or an expense, or use ＋ Log.");
  return `${head}
    <div class="page-head"><h2>${v.emoji||'🏝️'} ${esc(v.name)}</h2><p style="overflow-wrap:anywhere">${meta||'Per-property profit & loss.'}</p></div>
    <div class="grid three mb">
      ${kpi("Income",money(income),"📥","good")}
      ${kpi("Expenses",money(expense),"📤","bad")}
      ${kpi("Net profit",(net>=0?'+':'−')+money(Math.abs(net)),net>=0?"🌱":"⚠️",net>=0?'good':'bad')}
    </div>
    <div class="flex wrap mb" style="gap:8px">
      <button class="btn sm" data-villaio="${v.id}">＋ Log income / cost</button>
      <button class="btn sm secondary" data-go="add">Add tagged transaction</button>
    </div>
    ${v.note?`<div class="card mb"><h3>Notes</h3><p class="small muted" style="white-space:pre-wrap;margin:6px 0 0;overflow-wrap:anywhere">${esc(v.note)}</p></div>`:''}
    <div class="card mb"><h3>Expenses by category</h3><div class="sub">Tagged costs for this villa · tap to drill in</div>${catBarsFromData(catSpend)}</div>
    <div class="card"><div class="flex"><h3>Transactions (${tx.length})</h3></div>
      ${manualNote}
      <div class="mt">${list}</div></div>`;
}

/* ---------- ACCOUNT DETAIL (drill-down from Home / Accounts) ---------- */
/* every transaction touching this account, from either side of a transfer.
   acctTx(aid) only matches t.acctId (expense/income/transfer-FROM); a transfer where this
   account is the destination only carries toAcctId, so it's merged in separately. */
function acctTxAll(aid){
  const own=acctTx(aid);
  const inboundTransfers=(state.transactions||[]).filter(t=>t.type==="transfer"&&t.toAcctId===aid&&t.acctId!==aid);
  return [...own,...inboundTransfers].sort((x,y)=>y.date.localeCompare(x.date)||(y._m||0)-(x._m||0));
}
/* one row for an account transaction — transfers show direction (in/out) + transferLabel
   instead of a category, and always affect this account's in/out KPIs. */
function acctTxRow(t,aid){
  const isTransfer=t.type==="transfer";
  const isInboundTransfer=isTransfer&&t.toAcctId===aid;
  const inc=t.type==="income"||isInboundTransfer;
  const c=catById(t.catId);
  const v=t.villaId?(state.villas||[]).find(x=>x.id===t.villaId):null;
  const title=isTransfer?transferLabel(t):(esc(t.note)||esc(c.name));
  const sub=isTransfer?`${isInboundTransfer?'Transfer in':'Transfer out'} · ${prettyDate(t.date)}`
                      :`${c.name} · ${prettyDate(t.date)}${v?` · ${v.emoji||'🏠'} ${esc(v.name)}`:''}`;
  return `<div class="tx-line">
    <div class="tx-ic">${isTransfer?'🔁':c.emoji}</div>
    <div class="tx-main">
      <div class="tx-t">${title}</div>
      <div class="tx-s">${sub}</div>
    </div>
    <div class="tx-amt ${inc?'inc':'exp'}" style="max-width:38%;overflow:hidden;text-overflow:ellipsis" title="${money(t.amount)}">${inc?'+':'−'}${money(t.amount)}</div>
    <button class="x" data-edittx="${t.id}" title="Edit" style="font-size:15px;flex-shrink:0">✎</button>
  </div>`;
}
function Accounts(){
  const accs=state.accounts||[];
  const totalAssets=sum(accs.filter(a=>(+a.amount||0)>=0),a=>(+a.amount||0)*(a.currency==='EUR'?eurRate():1));
  const totalLiab=Math.abs(sum(accs.filter(a=>(+a.amount||0)<0),a=>(+a.amount||0)*(a.currency==='EUR'?eurRate():1)));
  const net=totalAssets-totalLiab;
  return `
  <div class="page-head"><h2>Accounts 🏦</h2><p>Your real cash across every account.</p></div>
  <div class="card mb">
    <div class="asset-sum">
      <div class="as-b"><div class="as-l">Net assets</div><div class="as-v">${moneyShort(net)}</div></div>
      <div class="as-b"><div class="as-l">Total assets</div><div class="as-v" style="color:var(--good)">${moneyShort(totalAssets)}</div></div>
      <div class="as-b"><div class="as-l">Liabilities</div><div class="as-v" style="color:var(--danger)">${moneyShort(totalLiab)}</div></div>
    </div>
    <button class="btn secondary mt" data-act="editAccounts">✎ Edit balances &amp; EUR rate</button>
  </div>
  <div class="card">
    <div class="flex"><h3>All accounts</h3><span class="right small muted">${accs.length}</span></div>
    <div class="list mt">${accs.length?accs.map(a=>{
      const idr=(+a.amount||0)*(a.currency==='EUR'?eurRate():1);
      return `<div class="tx-line" style="cursor:pointer" onclick="selAcct='${a.id}';go('acctview')"><div class="tx-ic">🏦</div><div class="tx-main"><div class="tx-t">${esc(a.name)}</div><div class="tx-s">${a.currency==='EUR'?'EUR account':'Rupiah account'}</div></div><div class="tx-amt ${idr>=0?'inc':'exp'}">${a.currency==='EUR'?'€'+(+a.amount||0).toLocaleString('id-ID')+' · ':''}${money(idr)}</div></div>`;
    }).join(""):emptyState("🏦","No accounts yet","Add them from Setup.")}</div>
  </div>`;
}
function AcctView(){
  const a=(state.accounts||[]).find(x=>x.id===selAcct);
  const head=`<button class="btn sm secondary mb" data-go="home">‹ Home</button>`;
  if(!a) return head+`<div class="card">${emptyState("🏦","Account not found","It may have been removed.")}</div>`;
  const tx=acctTxAll(a.id);
  const inc=sum(tx.filter(t=>t.type==="income"),t=>+t.amount)
          + sum(tx.filter(t=>t.type==="transfer"&&t.toAcctId===a.id),t=>+t.amount);
  const exp=sum(tx.filter(t=>t.type==="expense"),t=>+t.amount)
          + sum(tx.filter(t=>t.type==="transfer"&&t.acctId===a.id),t=>+t.amount);
  const idr=(+a.amount||0)*(a.currency==="EUR"?eurRate():1);
  const balLine=a.currency==="EUR"?`€${(+a.amount||0).toLocaleString('id-ID')} · ${money(idr)}`:money(idr);
  /* show money-in/out in the account's own currency so it matches the balance unit (fixes EUR mismatch) */
  const acur=(v)=>a.currency==="EUR"?`€${Math.round(v/eurRate()).toLocaleString('id-ID')}`:money(v);
  const list=tx.length? tx.slice(0,60).map(t=>acctTxRow(t,a.id)).join("")
    : emptyState("🗒️","No transactions on this account","When you Add money, pick this account to see it here.");
  return `${head}
    <div class="page-head"><h2>🏦 ${esc(a.name)}</h2><p>Current balance and every transaction linked to this account, including transfers.</p></div>
    <div class="grid three mb">
      ${kpi("Balance",balLine,"💰",idr>=0?'good':'bad')}
      ${kpi("Money in",acur(inc),"📥","good")}
      ${kpi("Money out",acur(exp),"📤","bad")}
    </div>
    <div class="flex wrap mb" style="gap:8px">
      <button class="btn sm secondary" data-act="editAccounts">Edit balances</button>
      <button class="btn sm secondary" data-go="add">Add transaction</button>
    </div>
    <div class="card"><div class="flex"><h3>Transactions (${tx.length})</h3></div>
      <div class="mt">${list}</div></div>`;
}

/* ---------- SETUP ---------- */