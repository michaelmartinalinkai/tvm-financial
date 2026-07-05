function SheetPage(){
  const url="https://docs.google.com/spreadsheets/d/1zqBtmJ1--F48HecpmSY5f7iAcn6Likg8pyE2ssSUTKw/edit";
  return `
  <div class="page-head"><h2>Google Sheet 📋</h2><p>Your live Financial TVM sheet — the full spreadsheet for deeper edits.</p></div>
  <div class="card">
    <div style="text-align:center;padding:14px 6px">
      <div style="font-size:40px">📊</div>
      <h3 style="margin-top:8px">Open your Financial TVM sheet</h3>
      <p class="small muted" style="margin:6px auto 16px;max-width:380px">Google doesn't allow the sheet to be embedded here, so it opens in a new tab. Any change you make saves straight to Google Sheets.</p>
      <a class="btn" href="${url}" target="_blank" rel="noopener" style="display:inline-block;width:auto;padding:13px 22px">Open in Google Sheets ↗</a>
    </div>
  </div>`;
}

/* ---------- HOME ---------- */
/* ezBookkeeping-faithful Overview: Month-Expense summary + Asset Summary, 4 period cards,
   Income & Expense Trends. TVM identity kept: real-cash accounts, need-to-be-paid, villas, cashflow. */
function assetSummary(){
  const accs=state.accounts||[];
  let assets=0,negAcc=0;
  accs.forEach(a=>{const idr=(+a.amount||0)*(a.currency==="EUR"?eurRate():1); if(idr>=0)assets+=idr; else negAcc+=-idr;});
  const debtRem=(state.debts||[]).reduce((s,d)=>s+Math.max(0,(+d.total||0)-(+d.paid||0)),0);
  const liabilities=negAcc+debtRem;
  return {assets,liabilities,net:assets-liabilities};
}
function Home(){
  const mk=monthKey(); const t=monthTotals(mk);
  const greet=getGreeting();
  const name=state.settings.name?`, ${state.settings.name}`:"";
  const recent=[...state.transactions].sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id)).slice(0,6);
  const yr=String(new Date().getFullYear());
  const today=todayISO();
  const pT=periodTotals(today,today), pW=periodTotals(isoAddDays(today,-6),today), pM={income:t.income,expense:t.expense}, pY=ytdTotals(yr);
  const nAcc=(state.accounts||[]).length, nVilla=(state.villas||[]).length;
  const as=assetSummary();
  const bal=allTimeTotals(); const balance=hasAccounts()?accountsTotalIDR():(bal.income-bal.expense);
  const needPay=needToPayTotal();
  const futureInc=futureIncomeTotal();
  const epcard=(ic,label,range,p)=>`<div class="ez-pcard">
    <div class="ep-h">${ic} ${label}</div><div class="ep-d">${range}</div>
    <div class="ep-row"><span class="k"><span class="ep-dot i"></span>Income</span><span class="ep-in">${moneyShort(p.income)}</span></div>
    <div class="ep-row"><span class="k"><span class="ep-dot o"></span>Expense</span><span class="ep-out">${moneyShort(p.expense)}</span></div>
  </div>`;
  return `
  <div class="page-head"><h2>Overview</h2><p>${greet}${name} — stay on top of the business and personal money, in one place.</p></div>
  ${!state.onboarded?welcomeCard():""}
  <div class="ez-topgrid">
    <div class="ez-expcard">
      <div class="ez-doodle">💰</div>
      <div class="ez-mlabel">Total balance <small>all accounts</small></div>
      <div class="ez-mbig">${money(balance)}</div>
      <div class="ez-msub">Income this month <b>${money(t.income)}</b> · Spent ${money(t.expense)}</div>
      <button class="btn sm" data-go="history">View details →</button>
    </div>
    <div class="card ez-asset">
      <div class="ez-a-h">Summary</div>
      <div class="ez-a-sub">You have ${nAcc} account${nAcc===1?'':'s'}${nVilla?` · ${nVilla} villa${nVilla===1?'':'s'}`:''}</div>
      <div class="ez-a-row"><div class="ez-a-ic">🏦</div><div class="ez-a-l">Total assets</div><div class="ez-a-v pos">${money(as.assets)}</div></div>
      <div class="ez-a-row"><div class="ez-a-ic">📈</div><div class="ez-a-l">Total future income</div><div class="ez-a-v ${futureInc>0?'pos':''}">${money(futureInc)}</div></div>
      <div class="ez-a-row"><div class="ez-a-ic">💸</div><div class="ez-a-l">Need to be paid</div><div class="ez-a-v" style="color:var(--warn)">${money(needPay)}</div></div>
    </div>
  </div>
  <div class="ez-periods">
    ${epcard("📅","Today",prettyDate(today),pT)}
    ${epcard("🗓️","This week",`${prettyDate(isoAddDays(today,-6))} – ${prettyDate(today)}`,pW)}
    ${epcard("📆","This month",monthName(mk),pM)}
    ${epcard("📊","This year",yr,pY)}
  </div>
  <div class="card mb"><div class="flex"><h3>Income and Expense Trends</h3><span class="right small muted">last 12 months</span></div>${trendBars(trendData(12))}</div>
  ${accountsCard()}
  ${needToPayCard()}
  ${homeCashflow()}
  <div class="card">
    <div class="flex"><h3>Recent transactions</h3><button class="btn sm secondary right" data-go="add">Add +</button></div>
    <div class="list mt">${recent.length?recent.map(txRow).join(""):emptyState("🧺","No entries yet","Tap Add to log your first one.")}</div>
  </div>`;
}
/* expected incoming money = income transactions dated in the future (e.g. villa rent due later this month) */
function futureIncomeTotal(){
  const today=todayISO();
  return (state.transactions||[]).filter(x=>x.type==="income"&&(x.date||"").slice(0,10)>today).reduce((a,x)=>a+(+x.amount||0),0);
}
function needToPayTotal(){
  const today=todayISO();
  const bills=(state.bills||[]).map(b=>({b,s:billStatus(b)})).filter(x=>!x.s.donePeriod).reduce((a,x)=>a+(+x.b.amount||0),0);
  const fut=(state.transactions||[]).filter(x=>x.type==="expense"&&(x.date||"").slice(0,10)>today).reduce((a,x)=>a+(+x.amount||0),0);
  return bills+fut;
}
function needToPayCard(){
  const today=todayISO();
  const bills=(state.bills||[]).map(b=>({b,s:billStatus(b)})).filter(x=>!x.s.donePeriod)
    .map(({b,s})=>({name:b.name,amount:+b.amount||0,days:s.daysLeft,overdue:s.daysLeft<0,ic:'🧾'}));
  const fut=(state.transactions||[]).filter(x=>x.type==='expense'&&(x.date||'').slice(0,10)>today)
    .map(t=>({name:t.note||catById(t.catId).name,amount:+t.amount||0,days:Math.round((new Date(t.date)-new Date(today))/864e5),overdue:false,ic:'📅'}));
  const items=[...bills,...fut].sort((a,b)=>a.days-b.days);
  const total=items.reduce((s,x)=>s+x.amount,0);
  const overdue=items.filter(x=>x.overdue).length;
  if(!items.length) return `<div class="card mb"><h3>💸 Need to be paid</h3><div class="sub" style="margin-top:6px">Nothing due right now — you're all caught up. Add a bill in the Bills page to track upcoming payments.</div></div>`;
  const row=x=>`<div class="tx-line"><div class="tx-ic">${x.ic}</div><div class="tx-main"><div class="tx-t">${esc(x.name)}</div><div class="tx-s">${x.overdue?`<span style="color:var(--danger)">Overdue ${-x.days}d</span>`:x.days===0?'Due today':`In ${x.days}d`}</div></div><div class="tx-amt exp">${money(x.amount)}</div></div>`;
  return `<div class="card mb"><div class="flex"><h3>💸 Need to be paid</h3><span class="right pill ${overdue?'bad':'warn'}">${money(total)}</span></div>
    ${overdue?`<div class="small" style="color:var(--danger);margin:2px 0 6px">${overdue} overdue</div>`:''}
    <div class="list mt">${items.slice(0,6).map(row).join("")}</div>
    ${items.length>6?`<button class="btn sm secondary mt" data-go="bills">See all ${items.length}</button>`:''}
  </div>`;
}
function welcomeCard(){
  return `<div class="card mb" style="border-color:var(--brand);background:var(--brand-soft)">
    <h3>Welcome to Financial TVM! 🤍</h3>
    <p class="small" style="color:var(--brand-ink);margin:6px 0 0">
      Track the business and your personal money in one place. Your data syncs privately across your devices.
      <b>Read the quick guide</b>, set things up, then start logging.
    </p>
    <div class="flex wrap mt">
      <button class="btn sm" data-modal="guide">📖 Quick guide</button>
      <button class="btn sm secondary" data-go="setup">⚙️ Set up budget</button>
      <button class="btn sm ghost" data-act="dismissWelcome">Got it</button>
    </div>
  </div>`;
}

/* ---------- ADD / DAILY INPUT ---------- */
let addType="expense";
function AddPage(){
  const mk=monthKey(); const t=monthTotals(mk);
  const todays=state.transactions.filter(x=>x.date===todayISO()).sort((a,b)=>b.id.localeCompare(a.id));
  const isTransfer=addType==="transfer";
  const catType=addType==="income"?"income":"expense";
  const parents=topCats(catType);
  const firstParent=parents[0]||null;
  const kids=firstParent?childCats(firstParent.id):[];
  const tags=allTags();
  const _accs=state.accounts||[];
  const acc0=(_accs[0]||{}).id;
  const acc1=(_accs[1]||_accs[0]||{}).id;
  return `
  <div class="page-head"><h2>Add money ✏️</h2><p>Log money in, out, or moved between accounts. It flows into Home, Reports and Business automatically.</p></div>
  <div class="card mb">
    <div class="seg tri mb" id="typeSeg">
      <button data-type="expense" class="${addType==='expense'?'on exp':''}">➖ Expense</button>
      <button data-type="income" class="${addType==='income'?'on inc':''}">➕ Income</button>
      <button data-type="transfer" class="${isTransfer?'on tf':''}">🔁 Transfer</button>
    </div>
    <div class="field"><label>Amount</label><input id="amt" type="number" inputmode="decimal" placeholder="0" step="0.01" style="font-size:26px;font-weight:700"/></div>

    <div id="eiFields" style="${isTransfer?'display:none':''}">
      ${hasAccounts()?`<div class="field"><label>Account <span style="color:var(--muted);font-weight:400">— your balance updates</span></label><select id="txAcct">${acctOptions(acc0)}<option value="">— don't change balance —</option></select></div>`:`<div class="field"><label>Bank (optional)</label><input id="txBank" list="bankList" placeholder="Bank"/><datalist id="bankList"><option>BCA</option><option>Permata</option><option>CIMB Niaga</option><option>Jago</option><option>Wise</option></datalist></div>`}
      <div class="row">
        <div class="field"><label>Category</label><select id="txCatParent">${parents.map(c=>`<option value="${c.id}">${c.emoji} ${esc(c.name)}</option>`).join("")}</select></div>
        <div class="field"><label>Subcategory</label><select id="txCatChild" ${kids.length?'':'disabled'}><option value="">${kids.length?'— optional —':'— none —'}</option>${kids.map(c=>`<option value="${c.id}">${c.emoji} ${esc(c.name)}</option>`).join("")}</select></div>
      </div>
    </div>

    <div id="tfFields" style="${isTransfer?'':'display:none'}">
      ${hasAccounts()?`<div class="row">
        <div class="field"><label>From</label><select id="txFrom">${acctOptions(acc0)}</select></div>
        <div class="field"><label>To</label><select id="txTo">${acctOptions(acc1)}</select></div>
      </div>`:`<p class="small muted">Add accounts first (Home → Accounts) to move money between them.</p>`}
    </div>

    <div class="field"><label>Date</label><input id="date" type="date" value="${todayISO()}"/></div>
    ${(state.villas||[]).length?`<div class="field"><label>Villa / project (optional)</label><select id="txVilla">${villaOptions("")}</select></div>`:''}
    <div class="field"><label>Tags (optional)</label>
      <div class="tag-input-row"><input id="txTags" placeholder="comma or space separated, e.g. urgent villa-a"/></div>
      ${tags.length?`<div class="chip-row" id="txTagSug" style="margin-top:6px">${tags.map(g=>`<button type="button" class="chip" data-tag="${esc(g)}">${esc(g)}</button>`).join("")}</div>`:''}
    </div>
    <div class="field"><label>Note (optional)</label><input id="note" placeholder="e.g. Weekly market run" /></div>
    <button class="btn" data-act="addTx">Add entry</button>
    <button class="btn secondary mt" data-act="repeatLastMonth">🔁 Repeat last month</button>
  </div>
  <div class="card">
    <div class="flex"><h3>Today</h3><span class="right pill ${t.net<0?'bad':'good'}">Net ${money(t.net)} this month</span></div>
    <div class="sub">${todays.length} ${todays.length===1?'entry':'entries'} today</div>
    <div class="list">${todays.length?todays.map(txRow).join(""):emptyState("🌤️","Nothing logged today","Add your first entry above — even a coffee counts.")}</div>
  </div>`;
}

/* ---------- BILLS / PAYMENT SCHEDULE ---------- */