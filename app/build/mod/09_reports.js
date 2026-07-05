function Reports(){
  const view=["overview","month","year"].includes(window.__repView)?window.__repView:"overview";
  const seg=`<div class="seg mb" id="repSeg"><button data-rep="overview" class="${view==='overview'?'on':''}">📈 Overview</button><button data-rep="month" class="${view==='month'?'on':''}">📅 Month</button><button data-rep="year" class="${view==='year'?'on':''}">📆 Year</button></div>`;
  if(view==='year') return reportsYear(seg);
  if(view==='month') return reportsMonth(seg);
  return reportsOverview(seg);
}
function reportsOverview(seg){
  const N=[3,6,12].includes(window.__anaRange)?window.__anaRange:6;
  const months=lastNMonths(N); const data=trendData(N);
  const totIn=sum(data,d=>d.income), totOut=sum(data,d=>d.expense); const net=totIn-totOut;
  const avgSpend=Math.round(totOut/N);
  const byCatSub=spendByCatRange(months);            // subcategory-level (transfers already excluded)
  const roll=window.__anaRollup?1:0;
  const byCat=roll?rollupByParent(byCatSub):byCatSub; // toggle: rolled up to parent categories
  const top=byCat[0];
  const byTag=spendByTagRange(months);               // expense per tag across range
  const at=allTimeTotals(); const balance=hasAccounts()?accountsTotalIDR():(at.income-at.expense);
  const villas=villaRows();
  const rangeSeg=`<div class="seg mb" id="anaRange"><button data-ana="3" class="${N===3?'on':''}">3 months</button><button data-ana="6" class="${N===6?'on':''}">6 months</button><button data-ana="12" class="${N===12?'on':''}">12 months</button></div>`;
  const rollSeg=`<div class="seg" style="max-width:230px"><button onclick="window.__anaRollup=0;render()" class="${roll?'':'on'}">Detailed</button><button onclick="window.__anaRollup=1;render()" class="${roll?'on':''}">Grouped</button></div>`;
  return `<div class="page-head"><h2>Statistics &amp; Analysis 📊</h2><p>The full picture — trends, categories and every villa, side by side.</p></div>${seg}${rangeSeg}
  <div class="grid kpi mb">
    ${kpi("Balance now",moneyShort(balance),"💰",balance>=0?'good':'bad')}
    ${kpi("Net · "+N+"mo",(net>=0?'+':'')+moneyShort(net),net>=0?"🌱":"⚠️",net>=0?'good':'bad')}
    ${kpi("Avg spend / mo",moneyShort(avgSpend),"📉")}
    ${kpi("Top category",top?`${top.cat.emoji} ${top.cat.name}`:"—","🏆")}
  </div>
  <div class="card mb"><div class="flex"><h3>Income vs expense</h3><span class="right small muted">last ${N} months</span></div>
    <div class="sub">Green = in, coral = out</div>${trendBars(data)}</div>
  <div class="card mb"><div class="flex"><h3>Estimated balance</h3><span class="right small muted">trend</span></div>
    <div class="sub">Where your cash has been heading, month by month</div>${lineChart(balanceTrend(N))}</div>
  <div class="flex mb" style="align-items:center;gap:10px"><h3 style="margin:0">Expense breakdown</h3><div class="right">${rollSeg}</div></div>
  <div class="grid two mb">
    <div class="card"><h3>By ${roll?'group':'category'}</h3><div class="sub">Share of expenses · last ${N} months</div>${donutFromData(byCat)}</div>
    <div class="card"><h3>Top spending</h3><div class="sub">Biggest ${roll?'groups':'categories'} · tap to drill in</div>${catBarsFromData(byCat)}</div>
  </div>
  <div class="card mb"><div class="flex"><h3>🏷️ Spending by tag</h3><span class="right small muted">last ${N} months</span></div>
    <div class="sub">Expenses grouped by the tags on your entries</div>
    ${byTag.length?catBarsFromData(byTag):emptyState("🏷️","No tags yet","Add tags to transactions to see this breakdown.")}</div>
  <div class="card"><div class="flex"><h3>🏝️ Villas compared</h3><button class="btn sm secondary right" data-go="biz">Manage</button></div>
    <div class="sub">Income, cost and net profit per property — tap one for the full breakdown</div>
    ${villaCompare(villas)}</div>`;
}
/* ---- expense-per-tag across a month range; transfers excluded via type filter, trackers excluded.
   a multi-tagged entry counts toward each of its tags, so this is a bar list (not a 100%-share donut). */
function spendByTagRange(months){
  const set=new Set(months); const tr=trackerIds(); const m={};
  state.transactions.filter(t=>t.type==="expense"&&!tr.has(t.catId)&&set.has(monthKey(t.date)))
    .forEach(t=>(t.tags||[]).forEach(g=>{if(g)m[g]=(m[g]||0)+ +t.amount;}));
  return Object.entries(m).map(([tag,val])=>({cat:{emoji:'🏷️',name:tag},id:null,val})).sort((a,b)=>b.val-a.val);
}
/* roll a subcategory-level spend array up to its parent category via catRollupId */
function rollupByParent(data){
  const m={};
  data.forEach(d=>{const rid=catRollupId(d.id); if(!m[rid])m[rid]={cat:catById(rid),id:rid,val:0}; m[rid].val+=d.val;});
  return Object.values(m).sort((a,b)=>b.val-a.val);
}
function villaCompare(villas){
  villas=villas||villaRows();
  if(!villas.length) return emptyState("🏝️","No villas yet","Add properties in Business to compare them here.");
  const max=Math.max(...villas.map(v=>Math.max(v.income,v.expense)),1);
  return `<div class="list mt">${villas.map(v=>`
    <button class="item" data-villaview="${v.id}" style="width:100%;text-align:left;cursor:pointer;align-items:flex-start">
      <div class="emoji">${v.emoji||'🏝️'}</div>
      <div class="main"><div class="t">${esc(v.name)}${v.status?` <span class="tag">${esc(v.status)}</span>`:''}</div>
        <div style="margin-top:7px;display:flex;flex-direction:column;gap:5px">
          <div class="cbrow" style="grid-template-columns:34px 1fr auto"><span class="cbn small muted">In</span><span class="cbbar"><i style="width:${Math.max(3,Math.round(v.income/max*100))}%;background:var(--good)"></i></span><span class="cbv">${moneyShort(v.income)}</span></div>
          <div class="cbrow" style="grid-template-columns:34px 1fr auto"><span class="cbn small muted">Out</span><span class="cbbar"><i style="width:${Math.max(3,Math.round(v.expense/max*100))}%;background:var(--danger)"></i></span><span class="cbv">${moneyShort(v.expense)}</span></div>
        </div>
      </div>
      <div style="text-align:right"><div class="amt ${v.net>=0?'inc':'exp'}">${v.net>=0?'+':'−'}${moneyShort(Math.abs(v.net))}</div><div class="small muted">net ›</div></div>
    </button>`).join("")}</div>`;
}
function reportsMonth(seg){
  const months=[...new Set(state.transactions.map(t=>monthKey(t.date)))].sort().reverse();
  const sel=(window.__selMonth&&months.includes(window.__selMonth))?window.__selMonth:(months[0]||monthKey());
  const t=monthTotals(sel); const byCat=spendByCat(sel);
  return `<div class="page-head"><h2>Statistics &amp; Analysis 📊</h2><p>Where your money goes — month by month and across the year.</p></div>${seg}
  <div class="card mb"><div class="field" style="margin:0 0 10px"><label>Month</label>
    <select id="monthSel">${(months.length?months:[sel]).map(m=>`<option value="${m}" ${m===sel?'selected':''}>${monthName(m)}</option>`).join("")}</select></div>
    <button class="btn sm secondary" data-act="exportMonth">📥 Export ${monthName(sel)} statement (CSV)</button></div>
  <div class="grid kpi mb">
    ${kpi("In",moneyShort(t.income),"💰","good")}
    ${kpi("Out",moneyShort(t.expense),"💸","bad")}
    ${kpi("Net",moneyShort(t.net),t.net>=0?"🌱":"⚠️",t.net>=0?'good':'bad')}
    ${kpi("Top",byCat[0]?byCat[0].cat.emoji:"—","🏆")}
  </div>
  <div class="card mb"><h3>By category</h3><div class="sub">${monthName(sel)}</div>${catBarsBlock(sel)}</div>
  <div class="card mb"><h3>Daily flow</h3><div class="sub">In vs out this month</div>${barChart(sel)}</div>
  <div class="card mb"><h3>Budget vs actual</h3><div class="sub">Set budgets in Setup to track these.</div><div class="list mt">${budgetVsActual(sel)}</div></div>
  <div class="card"><h3>Story of ${monthName(sel)}</h3><p class="small muted">${monthNarrative(sel,t,byCat)}</p></div>`;
}
function reportsYear(seg){
  const yr=window.__selYear||String(new Date().getFullYear());
  const months=Array.from({length:12},(_,i)=>`${yr}-${String(i+1).padStart(2,'0')}`);
  const data=months.map(mk=>({mk,...monthTotals(mk)}));
  const tot=data.reduce((a,b)=>({income:a.income+b.income,expense:a.expense+b.expense}),{income:0,expense:0});
  const years=[...new Set(state.transactions.map(t=>t.date.slice(0,4)))]; if(!years.includes(yr))years.push(yr);
  return `<div class="page-head"><h2>Statistics &amp; Analysis 📊</h2><p>The big picture for the year.</p></div>${seg}
  <div class="card mb"><div class="field" style="margin:0"><label>Year</label>
    <select id="yearSel">${years.sort().reverse().map(y=>`<option ${y===yr?'selected':''}>${y}</option>`).join("")}</select></div></div>
  <div class="grid three mb">
    ${kpi("Total in",moneyShort(tot.income),"💰","good")}
    ${kpi("Total out",moneyShort(tot.expense),"💸","bad")}
    ${kpi("Net",moneyShort(tot.income-tot.expense),(tot.income-tot.expense)>=0?"🌱":"⚠️",(tot.income-tot.expense)>=0?'good':'bad')}
  </div>
  <div class="card"><h3>Month by month</h3><div class="sub">Green = in, coral = out</div>${yearBars(data)}</div>`;
}

/* ---------- DASHBOARD ---------- */
function Dash(){
  const mk=monthKey(); const t=monthTotals(mk);
  const byCat=spendByCat(mk);
  const budgeted=sum(state.categories.filter(c=>c.type==="expense"),c=>+c.budget);
  return `
  <div class="page-head"><h2>Dashboard 📊</h2><p>${monthName(mk)} at a glance.</p></div>
  <div class="grid kpi mb">
    ${kpi("Income",money(t.income),"💰","good")}
    ${kpi("Expenses",money(t.expense),"💸","bad")}
    ${kpi("Net",money(t.net),t.net>=0?"🌱":"⚠️",t.net>=0?'good':'bad')}
    ${kpi("Budget used",budgeted>0?Math.round(t.expense/budgeted*100)+"%":"—","🎚️")}
  </div>
  <div class="grid two">
    <div class="card"><h3>Spending by category</h3><div class="sub">Where the money went</div>${donutBlock(mk)}</div>
    <div class="card"><h3>Daily flow</h3><div class="sub">Income vs expense this month</div>${barChart(mk)}</div>
  </div>
  <div class="card mt">
    <h3>Budget vs actual</h3><div class="sub">Set category budgets in Setup to track these.</div>
    <div class="list mt">${budgetVsActual(mk)}</div>
  </div>`;
}
function budgetVsActual(mk){
  const spend={}; spendByCat(mk).forEach(s=>spend[s.id]=s.val);
  const cats=state.categories.filter(c=>c.type==="expense"&&(+c.budget>0||spend[c.id]));
  if(!cats.length) return emptyState("🎚️","No budgets set","Add budgets per category in Setup to see this.");
  return cats.map(c=>{
    const sp=spend[c.id]||0, bd=+c.budget||0;
    const pct=bd>0?clamp(Math.round(sp/bd*100),0,140):0;
    const cls=bd>0&&sp>bd?'bad':(bd>0&&sp>bd*0.85?'warn':'');
    return `<div>
      <div class="flex small" style="justify-content:space-between"><span>${c.emoji} ${c.name}</span>
      <span class="muted">${money(sp)}${bd>0?` / ${money(bd)}`:''}</span></div>
      <div class="bar ${cls}" style="margin:6px 0 12px"><i style="width:${bd>0?pct:0}%"></i></div>
    </div>`;
  }).join("");
}

/* ---------- MONTHLY RECAP ---------- */
function Month(){
  const months=[...new Set(state.transactions.map(t=>monthKey(t.date)))].sort().reverse();
  const sel=window.__selMonth||months[0]||monthKey();
  const t=monthTotals(sel); const byCat=spendByCat(sel);
  const top=byCat[0];
  return `
  <div class="page-head"><h2>Monthly Recap 📅</h2><p>Reflect on a full month, kindly.</p></div>
  <div class="card mb">
    <div class="field"><label>Choose month</label>
      <select id="monthSel">${(months.length?months:[sel]).map(m=>`<option value="${m}" ${m===sel?'selected':''}>${monthName(m)}</option>`).join("")}</select>
    </div>
  </div>
  <div class="grid kpi mb">
    ${kpi("Earned",money(t.income),"💰","good")}
    ${kpi("Spent",money(t.expense),"💸","bad")}
    ${kpi("Saved",money(t.net),t.net>=0?"🌱":"😬",t.net>=0?'good':'bad')}
    ${kpi("Top category",top?`${top.cat.emoji}`:"—","🏆")}
  </div>
  <div class="card">
    <h3>Story of ${monthName(sel)}</h3>
    <p class="small muted">${monthNarrative(sel,t,byCat)}</p>
    <hr/>
    <div class="legend">${byCat.length?byCat.map((s,i)=>`<div class="li"><span class="sw" style="background:${chartColor(i)}"></span><span class="nm">${s.cat.emoji} ${s.cat.name}</span><span class="vl">${money(s.val)}</span></div>`).join(""):'<span class="muted small">No expenses logged.</span>'}</div>
  </div>`;
}
function monthNarrative(mk,t,byCat){
  if(!txInMonth(mk).length) return "No entries this month yet — a fresh page whenever you’re ready.";
  const rate=t.income?Math.round((t.income-t.expense)/t.income*100):0;
  let s=`You brought in ${money(t.income)} and spent ${money(t.expense)}, `;
  s+= t.net>=0?`keeping ${money(t.net)} — a ${rate}% savings rate. Nicely done. 🌱`:`going over by ${money(-t.net)}. It happens — next month is a clean start. 🤍`;
  if(byCat[0]) s+=` Your biggest area was ${byCat[0].cat.name} at ${money(byCat[0].val)}.`;
  return s;
}

/* ---------- YEARLY ---------- */
function Year(){
  const yr=window.__selYear||String(new Date().getFullYear());
  const months=Array.from({length:12},(_,i)=>`${yr}-${String(i+1).padStart(2,'0')}`);
  const data=months.map(mk=>({mk,...monthTotals(mk)}));
  const tot=data.reduce((a,b)=>({income:a.income+b.income,expense:a.expense+b.expense}),{income:0,expense:0});
  const years=[...new Set(state.transactions.map(t=>t.date.slice(0,4)))];
  if(!years.includes(yr)) years.push(yr);
  return `
  <div class="page-head"><h2>Yearly Overview 📆</h2><p>The big picture for ${yr}.</p></div>
  <div class="card mb"><div class="field"><label>Year</label>
    <select id="yearSel">${years.sort().reverse().map(y=>`<option ${y===yr?'selected':''}>${y}</option>`).join("")}</select></div></div>
  <div class="grid three mb">
    ${kpi("Total income",money(tot.income),"💰","good")}
    ${kpi("Total spent",money(tot.expense),"💸","bad")}
    ${kpi("Net saved",money(tot.income-tot.expense),(tot.income-tot.expense)>=0?"🌱":"⚠️",(tot.income-tot.expense)>=0?'good':'bad')}
  </div>
  <div class="card"><h3>Month by month</h3><div class="sub">Green = income, coral = expense</div>${yearBars(data)}</div>`;
}

/* ---------- CATEGORIES (list + per-category drill-down) ---------- */