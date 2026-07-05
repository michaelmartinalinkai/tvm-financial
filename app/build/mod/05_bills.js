function daysInMonth(y,m){return new Date(y,m+1,0).getDate();}
function billStatus(b){
  const freq=b.freq||"monthly";
  const today=new Date();today.setHours(0,0,0,0);
  if(freq==="once"){
    const iso=b.dueDate||todayISO();
    const due=new Date(iso+"T00:00");
    return {freq,nextDue:due,nextDueISO:iso,periodKey:monthKey(iso),donePeriod:!!b.paidOnce,daysLeft:Math.round((due-today)/86400000)};
  }
  // monthly: find soonest UNPAID occurrence (could be overdue this month)
  let y=today.getFullYear(),m=today.getMonth(),guard=0;
  while(guard++<48){
    const day=Math.min(b.dueDay||1,daysInMonth(y,m));
    const occ=new Date(y,m,day);
    const key=`${y}-${String(m+1).padStart(2,"0")}`;
    if(!(b.paid&&b.paid[key])){
      return {freq,nextDue:occ,nextDueISO:`${key}-${String(day).padStart(2,"0")}`,periodKey:key,donePeriod:false,daysLeft:Math.round((occ-today)/86400000)};
    }
    m++; if(m>11){m=0;y++;}
  }
  return {freq,nextDue:today,nextDueISO:todayISO(),periodKey:monthKey(),donePeriod:true,daysLeft:0};
}
function dueChip(s){
  if(s.donePeriod) return `<span class="pill good">Paid</span>`;
  if(s.daysLeft<0) return `<span class="pill bad">Overdue ${-s.daysLeft}d</span>`;
  if(s.daysLeft===0) return `<span class="pill bad">Due today</span>`;
  if(s.daysLeft<=7) return `<span class="pill warn">In ${s.daysLeft}d</span>`;
  return `<span class="pill">In ${s.daysLeft}d</span>`;
}
function dueDateLabel(s){
  const d=s.nextDue;
  const lbl=d.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"});
  return s.freq==="once"?`📅 ${lbl} · one-time`:`📅 ${lbl} · monthly`;
}
let billFreq="monthly";
function Bills(){
  const mk=monthKey();
  const monthly=state.bills.filter(b=>(b.freq||"monthly")==="monthly");
  const onceThis=state.bills.filter(b=>b.freq==="once"&&monthKey(b.dueDate)===mk);
  const scheduled=sum(monthly,b=>+b.amount)+sum(onceThis,b=>+b.amount);
  const paidAmt=sum(monthly.filter(b=>b.paid&&b.paid[mk]),b=>+b.amount)+sum(onceThis.filter(b=>b.paidOnce),b=>+b.amount);
  // upcoming = soonest unpaid occurrence per bill, sorted by date
  const upcoming=state.bills.map(b=>({b,s:billStatus(b)}))
      .filter(x=>!x.s.donePeriod)
      .sort((a,b)=>a.s.nextDue-b.s.nextDue);
  const overdue=upcoming.filter(x=>x.s.daysLeft<0);
  const future=upcoming.filter(x=>x.s.daysLeft>=0);
  const next=upcoming[0];
  // paid this month list (for undo)
  const paidList=state.bills.filter(b=> (b.freq||"monthly")==="monthly" ? (b.paid&&b.paid[mk]) : (b.freq==="once"&&monthKey(b.dueDate)===mk&&b.paidOnce));
  return `
  <div class="page-head"><h2>Payments 🧾</h2><p>Everything you need to pay — and exactly when. A, B, C, D, all lined up.</p></div>
  <div class="card mb" style="border-color:var(--brand)">
    <h3>📷 Scan an invoice or bank e-statement</h3>
    <div class="sub">Drop a photo or PDF — AI reads the amounts & due dates, you confirm before anything saves.</div>
    <label class="dropzone" id="dropzone">
      <input type="file" id="scanFile" accept="image/*,application/pdf,.pdf" class="hidden" />
      <div class="dz-inner"><span class="dz-emoji">🧾</span><b>Drop invoice / e-statement here</b><span class="small muted">or tap to choose · JPG, PNG or PDF</span></div>
    </label>
    <div id="scanStatus" class="small mt"></div>
  </div>
  <div class="grid kpi mb">
    ${kpi("Due this month",money(scheduled),"🧾")}
    ${kpi("Paid",money(paidAmt),"✅","good")}
    ${kpi("Still to pay",money(scheduled-paidAmt),(scheduled-paidAmt)>0?"⏳":"🎉",(scheduled-paidAmt)>0?'warn':'good')}
    ${kpi("Next up", next?dueDateShort(next.s):"—", overdue.length?"🔴":"📌", overdue.length?'bad':undefined)}
  </div>

  <div class="card mb">
    <h3>Schedule a payment</h3><div class="sub">Add what you know is coming — rent, cards, school fees, subscriptions.</div>
    <div class="row">
      <div class="field" style="flex:1.5"><label>What is it?</label><input id="bName" placeholder="e.g. Electricity bill" /></div>
      <div class="field"><label>Amount</label><input id="bAmt" type="number" inputmode="decimal" placeholder="0" /></div>
    </div>
    <div class="field"><label>How often?</label>
      <div class="seg" id="freqSeg">
        <button data-freq="monthly" class="${billFreq==='monthly'?'on':''}">🔁 Every month</button>
        <button data-freq="once" class="${billFreq==='once'?'on':''}">1️⃣ One-time</button>
      </div>
    </div>
    <div class="row">
      <div class="field ${billFreq==='monthly'?'':'hidden'}" id="dayWrap"><label>Due day of month</label><input id="bDay" type="number" min="1" max="31" placeholder="e.g. 25" /></div>
      <div class="field ${billFreq==='once'?'':'hidden'}" id="dateWrap"><label>Due date</label><input id="bDate" type="date" value="${todayISO()}" /></div>
    </div>
    <button class="btn" data-act="addBill">Add to schedule</button>
  </div>

  ${overdue.length?`<div class="card mb" style="border-color:var(--danger);background:var(--danger-soft)">
    <h3>🔴 Overdue (${overdue.length})</h3><div class="sub">Pay these as soon as you can — no shame, just next steps.</div>
    <div class="list">${overdue.map(x=>billRow(x.b,x.s)).join("")}</div></div>`:""}

  <div class="card">
    <div class="flex"><h3>Upcoming</h3><span class="right small muted">sorted by date</span></div>
    <div class="sub">Tap the circle when paid.</div>
    <div class="list">${future.length?future.map(x=>billRow(x.b,x.s)).join(""):emptyState("🗓️","Nothing upcoming","Add a payment above and it’ll show up here by date.")}</div>
  </div>

  ${paidList.length?`<div class="card mt"><div class="flex"><h3>Paid this month</h3><span class="right pill good">${monthName(mk)}</span></div>
    <div class="list">${paidList.map(b=>paidRow(b)).join("")}</div></div>`:""}`;
}
function dueDateShort(s){
  if(s.daysLeft<0) return `${-s.daysLeft}d late`;
  if(s.daysLeft===0) return "Today";
  return s.nextDue.toLocaleDateString(undefined,{month:"short",day:"numeric"});
}
function billRow(b,s){
  return `<div class="item">
    <button class="emoji" data-paybill="${b.id}" title="Mark paid">⭕</button>
    <div class="main"><div class="t">${esc(b.name)}</div><div class="s">${dueDateLabel(s)}</div></div>
    <div style="text-align:right;flex-shrink:0;max-width:46%">
      <div class="amt exp" style="white-space:normal;overflow-wrap:break-word">${money(b.amount)}</div>
      <div style="margin-top:3px">${dueChip(s)}</div>
    </div>
    <button class="x" data-delbill="${b.id}">✕</button>
  </div>`;
}
function paidRow(b){
  const isOnce=(b.freq||"monthly")==="once";
  return `<div class="item">
    <button class="emoji" data-unpaybill="${b.id}" title="Mark unpaid" style="background:var(--brand-soft)">✅</button>
    <div class="main"><div class="t">${esc(b.name)}</div><div class="s">${isOnce?'one-time':'monthly'} · tap ✓ to undo</div></div>
    <div class="amt exp" style="white-space:normal;overflow-wrap:break-word;flex-shrink:0;max-width:46%;text-align:right">${money(b.amount)}</div>
    <button class="x" data-delbill="${b.id}">✕</button>
  </div>`;
}

/* ---------- GOALS ---------- */