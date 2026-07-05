function Goals(){
  const g=state.goals;
  return `
  <div class="page-head"><h2>Savings Goals 🎯</h2><p>Name what you’re saving for. Watch it grow, bit by bit.</p></div>
  <div class="card mb">
    <h3>New goal</h3>
    <div class="row">
      <div class="field" style="flex:1.5"><label>Goal</label><input id="gName" placeholder="e.g. Emergency fund" /></div>
      <div class="field"><label>Emoji</label><input id="gEmoji" placeholder="🐷" maxlength="2" /></div>
    </div>
    <div class="row">
      <div class="field"><label>Target amount</label><input id="gTarget" type="number" inputmode="decimal" placeholder="0" /></div>
      <div class="field"><label>Saved so far</label><input id="gSaved" type="number" inputmode="decimal" placeholder="0" /></div>
    </div>
    <button class="btn" data-act="addGoal">Add goal</button>
  </div>
  ${g.length?g.map(goalCard).join(""):`<div class="card">${emptyState("🎯","No goals yet","What would feel good to save toward?")}</div>`}`;
}
function goalCard(g){
  const pct=g.target>0?clamp(Math.round(g.saved/g.target*100),0,100):0;
  return `<div class="card">
    <div class="flex"><h3>${g.emoji||'🎯'} ${esc(g.name)}</h3><button class="x right" data-delgoal="${g.id}">✕</button></div>
    <div class="flex wrap small muted" style="justify-content:space-between;gap:6px"><span>${money(g.saved)} of ${money(g.target)}</span><span>${pct}%</span></div>
    <div class="bar mt ${pct>=50?'':'warn'}"><i style="width:${pct}%"></i></div>
    <div class="flex wrap mt">
      <button class="btn sm secondary" data-addsave="${g.id}">＋ Add money</button>
      ${pct>=100?'<span class="pill good">Reached! 🎉</span>':`<span class="small muted right">${money(g.target-g.saved)} to go</span>`}
    </div>
  </div>`;
}
function goalMini(g){
  const pct=g.target>0?clamp(Math.round(g.saved/g.target*100),0,100):0;
  return `<div class="mt"><div class="flex wrap small" style="justify-content:space-between;gap:6px"><span>${g.emoji||'🎯'} ${esc(g.name)}</span><span class="muted">${pct}%</span></div><div class="bar" style="margin-top:5px"><i style="width:${pct}%"></i></div></div>`;
}

/* ---------- DEBTS ---------- */
function Debts(){
  const d=state.debts;
  const total=sum(d,x=>+x.total), paid=sum(d,x=>+x.paid);
  return `
  <div class="page-head"><h2>Debt Payoff 💳</h2><p>One payment at a time. Progress counts, however small.</p></div>
  <div class="grid kpi mb">
    ${kpi("Total debt",money(total),"💳")}
    ${kpi("Paid off",money(paid),"✅","good")}
    ${kpi("Remaining",money(total-paid),"⏳", (total-paid)>0?'warn':'good')}
    ${kpi("Overall",total>0?Math.round(paid/total*100)+"%":"—","📈")}
  </div>
  <div class="card mb">
    <h3>Add a debt</h3>
    <div class="row">
      <div class="field" style="flex:1.5"><label>Name</label><input id="dName" placeholder="e.g. Credit card" /></div>
      <div class="field"><label>Emoji</label><input id="dEmoji" placeholder="💳" maxlength="2" /></div>
    </div>
    <div class="row">
      <div class="field"><label>Total owed</label><input id="dTotal" type="number" inputmode="decimal" placeholder="0" /></div>
      <div class="field"><label>Already paid</label><input id="dPaid" type="number" inputmode="decimal" placeholder="0" /></div>
    </div>
    <button class="btn" data-act="addDebt">Add debt</button>
  </div>
  ${d.length?d.map(debtCard).join(""):`<div class="card">${emptyState("🌈","Debt-free here","Nothing to track — or add one above to start a payoff plan.")}</div>`}`;
}
function debtCard(d){
  const pct=d.total>0?clamp(Math.round(d.paid/d.total*100),0,100):0;
  return `<div class="card">
    <div class="flex"><h3>${d.emoji||'💳'} ${esc(d.name)}</h3><button class="x right" data-deldebt="${d.id}">✕</button></div>
    <div class="flex wrap small muted" style="justify-content:space-between;gap:6px"><span>${money(d.paid)} paid of ${money(d.total)}</span><span>${pct}%</span></div>
    <div class="bar mt ${pct>=100?'':'warn'}"><i style="width:${pct}%"></i></div>
    <div class="flex wrap mt">
      <button class="btn sm secondary" data-addpay="${d.id}">＋ Log payment</button>
      ${pct>=100?'<span class="pill good">Cleared! 🎉</span>':`<span class="small muted right">${money(d.total-d.paid)} left</span>`}
    </div>
  </div>`;
}

/* ---------- BUSINESS: villas / investors / construction ---------- */