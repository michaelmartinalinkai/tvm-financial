function Biz(){
  const villas=villaRows();
  const portfolioNet=sum(villas,v=>v.net);
  const inv=investorTotals();
  const p=state.project;
  const projRem=p?((+p.budget||0)-(+p.spent||0)):0;
  return `
  <div class="page-head"><h2>Villas & Investors 🏝️</h2><p>The business side — per-villa profit, investor money, and the build. Your personal money stays on the other pages.</p></div>
  <div class="grid kpi mb">
    ${kpi("Portfolio net",money(portfolioNet),portfolioNet>=0?"🏝️":"⚠️",portfolioNet>=0?'good':'bad')}
    ${kpi("Raised",money(inv.contributed),"🤝")}
    ${kpi("Owed to investors",money(inv.outstanding),inv.outstanding>0?"⏳":"✅",inv.outstanding>0?'warn':'good')}
    ${kpi("Build left",p?money(projRem):"—","🏗️",p&&projRem<0?'bad':'good')}
  </div>

  <div class="card mb">
    <h3>🏝️ Villas</h3>
    <div class="sub">Track income and costs per property. Net = profit so far.</div>
    <div class="row mt">
      <div class="field" style="flex:1.5"><label>Villa name</label><input id="vName" placeholder="e.g. Villa Padonan"/></div>
      <div class="field"><label>Emoji</label><input id="vEmoji" placeholder="🏝️" maxlength="2"/></div>
    </div>
    <button class="btn" data-act="addVilla">Add villa</button>
    <div class="list mt">${villas.length?villas.map(villaCard).join(""):emptyState("🏝️","No villas yet","Add your first property above.")}</div>
  </div>

  <div class="card mb">
    <h3>🤝 Investors</h3>
    <div class="sub">Who put money in, and how much you've paid back.</div>
    <div class="row mt">
      <div class="field" style="flex:1.5"><label>Investor</label><input id="iName" placeholder="e.g. Sikhou"/></div>
      <div class="field"><label>Contributed</label><input id="iAmt" type="number" inputmode="decimal" placeholder="0"/></div>
    </div>
    <button class="btn" data-act="addInvestor">Add investor</button>
    ${(state.investors||[]).length?`<div class="list mt">${state.investors.map(invCard).join("")}</div>`:`<div class="mt">${emptyState("🤝","No investors yet","Add who's funding the business.")}</div>`}
  </div>

  <div class="card">
    <h3>🏗️ Construction project</h3>
    ${p?`
      <div class="flex"><b>${esc(p.name)}</b><button class="x right" data-act="delProject">✕</button></div>
      <div class="grid three mt mb">
        ${kpi("Budget",money(p.budget),"💰")}
        ${kpi("Spent",money(p.spent||0),"💸","bad")}
        ${kpi("Remaining",money(projRem),projRem>=0?"🌱":"⚠️",projRem>=0?'good':'bad')}
      </div>
      <div class="bar ${(+p.budget>0&&+p.spent>+p.budget)?'bad':((+p.budget>0&&+p.spent>+p.budget*0.85)?'warn':'')}"><i style="width:${+p.budget>0?clamp(Math.round((+p.spent||0)/p.budget*100),0,100):0}%"></i></div>
      <button class="btn sm secondary mt" data-act="projSpend">＋ Log spend</button>
    `:`
      <div class="sub">One project at a time. Set the budget, then log spend as it goes.</div>
      <div class="row mt">
        <div class="field" style="flex:1.5"><label>Project name</label><input id="pName" placeholder="e.g. Seseh build"/></div>
        <div class="field"><label>Budget</label><input id="pBudget" type="number" inputmode="decimal" placeholder="0"/></div>
      </div>
      <button class="btn" data-act="addProject">Start tracking</button>
    `}
  </div>

  <button class="card mt" data-go="furniture" style="width:100%;text-align:left;cursor:pointer;border:0">
    <div class="flex"><h3>🪑 Furniture business</h3><span class="small muted right">${(state.furniture||[]).length} order${(state.furniture||[]).length!==1?'s':''} · ${money(furnTotals().out)} left →</span></div>
    <div class="sub">Per-order, per-villa tracking — cost, paid and status.</div>
  </button>`;
}
function villaCard(v){
  const net=(+v.income||0)-(+v.expense||0);
  const stCls={'Owned':'good','Rented':'good','Lease-out':'good','Construction':'warn'}[v.status]||'';
  const pill=v.status?`<span class="pill ${stCls}" style="margin-left:6px">${esc(v.status)}</span>`:'';
  const meta=[ v.code?esc(v.code):null, (v.owner&&v.owner!=='TVM')?esc(v.owner):null,
               v.rentYear?`Rent ${money(v.rentYear)}/yr`:null ].filter(Boolean).join(' · ');
  /* whole card is tappable → VillaView; the click-delegate in 14_actions_init.js walks up
     via closest(), so the inner ＋Log / ✕ buttons still win over the card's data-villaview. */
  return `<div class="item" data-villaview="${v.id}" style="align-items:flex-start;cursor:pointer">
    <div class="emoji">${v.emoji||'🏝️'}</div>
    <div class="main"><div class="t">${esc(v.name)}${pill}</div>
    ${meta?`<div class="s">${meta}</div>`:''}
    <div class="s">In ${money(v.income||0)} · Out ${money(v.expense||0)}</div>
    ${v.note?`<div class="s" style="white-space:normal;opacity:.82;margin-top:2px">${esc(v.note)}</div>`:''}</div>
    <div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;max-width:40%">
      <div class="amt ${net>=0?'inc':'exp'}" style="max-width:100%;overflow:hidden;text-overflow:ellipsis" title="${money(Math.abs(net))}">${net>=0?'+':'−'}${money(Math.abs(net))}</div>
      <button class="btn sm secondary" data-villaio="${v.id}">＋ Log</button>
    </div>
    <span class="muted" style="font-size:18px;line-height:1;align-self:center;flex-shrink:0">›</span>
    <button class="x" data-delvilla="${v.id}" title="Delete villa">✕</button>
  </div>`;
}
function invCard(x){
  const out=(+x.contributed||0)-(+x.repaid||0);
  const pct=+x.contributed>0?clamp(Math.round((+x.repaid||0)/x.contributed*100),0,100):0;
  return `<div class="item">
    <div class="emoji">${x.emoji||'🤝'}</div>
    <div class="main"><div class="t">${esc(x.name)}</div>
    <div class="s">In ${money(x.contributed||0)} · Repaid ${money(x.repaid||0)} · Owe ${money(out)}</div>
    <div class="bar mt ${pct>=100?'':'warn'}"><i style="width:${pct}%"></i></div></div>
    <div style="text-align:right">${out>0?`<button class="btn sm secondary" data-invrepay="${x.id}">Repay</button>`:'<span class="pill good">Repaid</span>'}</div>
    <button class="x" data-delinv="${x.id}">✕</button>
  </div>`;
}

/* ---------- FURNITURE BUSINESS (per order, per villa) ---------- */
const FURN_STATUS=["Ordered","In production","Delivered","Installed"];
function furnStatusCls(s){return {"Ordered":"warn","In production":"warn","Delivered":"","Installed":"good"}[s]||"";}
function furnList(){return (state.furniture||[]).map(o=>{
  const dp=/\bDP\b/i.test(o.item||"");            // "DP" = Down Payment = 50%
  const cost=+o.cost||0;
  const fullCost=dp?cost*2:cost;                   // a DP entry covers 50%, so the full order is double
  const paid=+o.paid||0;
  return {...o,dp,fullCost,out:Math.max(0,fullCost-paid)};
});}
function furnTotals(){const f=furnList();return {n:f.length,cost:sum(f,o=>o.fullCost),paid:sum(f,o=>+o.paid||0),out:sum(f,o=>o.out)};}
function furnByProject(){const m={};furnList().forEach(o=>{(m[o.project||"Unassigned"]=m[o.project||"Unassigned"]||[]).push(o);});return m;}
function Furniture(){
  const t=furnTotals();
  const groups=furnByProject();
  const villaOpts=[...new Set([...(state.villas||[]).map(v=>v.name),...Object.keys(groups)])].filter(Boolean);
  const groupHtml=Object.keys(groups).sort().map(proj=>{
    const list=groups[proj];
    const c=sum(list,o=>o.fullCost),p=sum(list,o=>+o.paid||0),o=Math.max(0,c-p);
    return `<div class="card mb">
      <div class="flex"><h3>🏠 ${esc(proj)}</h3><span class="small muted right">${list.length} order${list.length!==1?'s':''}</span></div>
      <div class="flex wrap" style="gap:6px;margin:6px 0 4px">
        <span class="pill">Cost ${money(c)}</span><span class="pill ${p>=c&&c>0?'good':''}">Paid ${money(p)}</span><span class="pill ${o>0?'warn':'good'}">${o>0?`Outstanding ${money(o)}`:'Fully paid ✓'}</span></div>
      <div class="list mt">${list.map(furnRow).join("")}</div>
    </div>`;
  }).join("");
  return `
  <div class="page-head"><h2>Furniture business 🪑</h2><p>Every order, grouped per villa — cost, paid and status. Separate from your personal money.</p></div>
  <div class="grid kpi mb">
    ${kpi("Orders",t.n,"🪑")}
    ${kpi("Total cost",money(t.cost),"💰")}
    ${kpi("Paid",money(t.paid),"✅","good")}
    ${kpi("Outstanding",money(t.out),t.out>0?"⏳":"✅",t.out>0?'warn':'good')}
  </div>
  <div class="card mb">
    <h3>＋ New order</h3>
    <div class="sub">Add a furniture order and tag it to a villa.</div>
    <div class="row mt">
      <div class="field" style="flex:1.4"><label>Villa / project</label><input id="fProj" list="fProjList" placeholder="e.g. Villa 1"/><datalist id="fProjList">${villaOpts.map(v=>`<option value="${esc(v)}">`).join("")}</datalist></div>
      <div class="field" style="flex:1.6"><label>Item</label><input id="fItem" placeholder="e.g. Sofa set"/></div>
    </div>
    <div class="row">
      <div class="field"><label>Cost</label><input id="fCost" type="number" inputmode="decimal" placeholder="0"/></div>
      <div class="field"><label>Paid (optional)</label><input id="fPaid" type="number" inputmode="decimal" placeholder="0"/></div>
      <div class="field"><label>Status</label><select id="fStatus">${FURN_STATUS.map(s=>`<option value="${s}">${s}</option>`).join("")}</select></div>
    </div>
    <button class="btn" data-act="addFurniture">Add order</button>
  </div>
  ${t.n?groupHtml:`<div class="card">${emptyState("🪑","No orders yet","Add your first furniture order above.")}</div>`}`;
}
function furnRow(o){
  return `<div class="item" style="align-items:flex-start">
    <div class="emoji">🪑</div>
    <div class="main"><div class="t">${esc(o.item||"Order")} ${o.dp?'<span class="pill warn" style="margin-left:4px">DP 50%</span>':''}<span class="pill ${furnStatusCls(o.status)}" style="margin-left:4px" data-furnstatus="${o.id}">${esc(o.status||"Ordered")}</span></div>
    <div class="s">Cost ${money(o.fullCost)}${o.dp?` (DP ${money(o.cost||0)})`:''} · Paid ${money(o.paid||0)}${o.out>0?` · <b>${money(o.out)} left</b>`:' · paid ✓'}</div></div>
    <div style="text-align:right">
      ${o.out>0?`<button class="btn sm secondary" data-furnpay="${o.id}">＋ Pay</button>`:'<span class="pill good">Paid</span>'}
    </div>
    <button class="x" data-delfurn="${o.id}">✕</button>
  </div>`;
}

/* ---------- HISTORY (all transactions) ---------- */