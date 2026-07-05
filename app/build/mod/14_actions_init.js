document.addEventListener("click",e=>{
  const t=e.target.closest("[data-go],[data-act],[data-modal],[data-more],[data-type],[data-freq],[data-edittx],[data-delbill],[data-paybill],[data-unpaybill],[data-delgoal],[data-addsave],[data-deldebt],[data-addpay],[data-delcat],[data-catview],[data-villaview],[data-acctview],[data-addcattx],[data-delvilla],[data-delinv],[data-villaio],[data-invrepay],[data-furnpay],[data-furnstatus],[data-delfurn]");
  if(!t) return;
  const d=t.dataset;
  if(d.go){go(d.go);return;}
  if(d.more){openMore();return;}
  if(d.modal==="guide"){openGuide();return;}
  if(d.type){addType=d.type;render();return;}
  if(d.freq){billFreq=d.freq;render();return;}
  if(d.edittx){editTx(d.edittx);return;}
  if(d.delbill){tomb(d.delbill);state.bills=state.bills.filter(x=>x.id!==d.delbill);save();render();return;}
  if(d.paybill){const b=state.bills.find(x=>x.id===d.paybill);if(b){const s=billStatus(b);if((b.freq||'monthly')==='once'){b.paidOnce=true;}else{b.paid=b.paid||{};b.paid[s.periodKey]=true;}touch(b);save();render();toast("Marked paid ✓");}return;}
  if(d.unpaybill){const b=state.bills.find(x=>x.id===d.unpaybill);if(b){if((b.freq||'monthly')==='once'){b.paidOnce=false;}else{b.paid=b.paid||{};b.paid[monthKey()]=false;}touch(b);save();render();}return;}
  if(d.delgoal){tomb(d.delgoal);state.goals=state.goals.filter(x=>x.id!==d.delgoal);save();render();return;}
  if(d.addsave){addToGoal(d.addsave);return;}
  if(d.deldebt){tomb(d.deldebt);state.debts=state.debts.filter(x=>x.id!==d.deldebt);save();render();return;}
  if(d.addpay){logPayment(d.addpay);return;}
  if(d.delcat){catDelete(d.delcat);return;}
  if(d.delvilla){tomb(d.delvilla);state.villas=state.villas.filter(x=>x.id!==d.delvilla);save();render();return;}
  if(d.delinv){tomb(d.delinv);state.investors=state.investors.filter(x=>x.id!==d.delinv);save();render();return;}
  if(d.villaio){villaEntry(d.villaio);return;}
  if(d.invrepay){investorRepay(d.invrepay);return;}
  if(d.furnpay){furnPay(d.furnpay);return;}
  if(d.furnstatus){furnCycleStatus(d.furnstatus);return;}
  if(d.delfurn){tomb(d.delfurn);state.furniture=state.furniture.filter(x=>x.id!==d.delfurn);save();render();toast("Deleted");return;}
  if(d.catview){selCat=d.catview;go("catview");return;}
  if(d.villaview){selVilla=d.villaview;go("villaview");return;}
  if(d.acctview){selAcct=d.acctview;go("acctview");return;}
  if(d.addcattx){addCatTx(d.addcattx);return;}
  if(d.act){ACTIONS[d.act]&&ACTIONS[d.act]();return;}
});

const ACTIONS={
  dismissWelcome(){state.onboarded=true;save();render();},
  editAccounts(){
    const accs=state.accounts||[];
    const rows=accs.map(a=>`<div class="field"><label>${esc(a.name)} ${a.currency==='EUR'?'(EUR)':'(Rp)'}</label><input class="acc-amt" data-id="${a.id}" type="number" inputmode="decimal" value="${+a.amount||0}"/></div>`).join("");
    openModal(`<h3>Edit account balances</h3>${rows}<div class="field"><label>EUR → Rp rate</label><input id="accEur" type="number" inputmode="decimal" value="${eurRate()}"/></div><button class="btn" id="accSave">Save</button>`);
    $("#accSave").onclick=()=>{
      document.querySelectorAll(".acc-amt").forEach(inp=>{const a=(state.accounts||[]).find(x=>x.id===inp.dataset.id);if(a){a.amount=+inp.value||0;a._m=stampNow();}});
      state.settings.eurRate=+$("#accEur").value||20382; state.settings._m=stampNow();
      save();closeModal();render();toast("Balances updated ✓");
    };
  },
  addTx(){
    const amt=+$("#amt").value;if(!amt||amt<=0)return toast("Enter an amount");
    const date=$("#date").value||todayISO();
    const villaId=($("#txVilla")?$("#txVilla").value:"")||"";
    const tags=[...new Set((($("#txTags")?$("#txTags").value:"")||"").split(/[,\s]+/).map(s=>s.trim()).filter(Boolean))];
    const note=$("#note")?$("#note").value.trim():"";
    if(addType==="transfer"){
      const from=$("#txFrom")?$("#txFrom").value:"";
      const to=$("#txTo")?$("#txTo").value:"";
      if(!from||!to)return toast("Pick both accounts");
      if(from===to)return toast("Pick two different accounts");
      state.transactions.push({id:uid(),date,type:"transfer",amount:amt,acctId:from,toAcctId:to,villaId,tags,note,_m:stampNow()});
      applyTransfer(from,to,amt,1);
      save();render();toast("Transfer logged ✓");
      return;
    }
    const catId=($("#txCatChild")&&$("#txCatChild").value)||($("#txCatParent")?$("#txCatParent").value:"")||"";
    const acctId=$("#txAcct")?$("#txAcct").value:"";
    const bank=($("#txBank")?$("#txBank").value.trim():"")||"";
    state.transactions.push({id:uid(),date,type:addType,amount:amt,catId,acctId,villaId,tags,bank,note,_m:stampNow()});
    acctDelta(acctId,addType,amt,1);
    save();render();toast(acctId?"Added · balance updated ✓":"Added ✓");
  },
  repeatLastMonth(){
    const months=[...new Set(state.transactions.map(t=>monthKey(t.date)))].sort();
    const cur=monthKey();
    const prev=months.filter(m=>m<cur).pop();
    if(!prev) return toast("No earlier month to copy");
    const src=state.transactions.filter(t=>monthKey(t.date)===prev);
    if(!src.length) return toast("Nothing to repeat");
    openModal(`<h3>Repeat ${monthName(prev)}? 🔁</h3><p class="small muted">This copies all ${src.length} ${src.length===1?'entry':'entries'} from ${monthName(prev)} into ${monthName(cur)}, same day each. You can edit any of them after.</p><button class="btn" id="repOk">Copy ${src.length} into ${monthName(cur)}</button>`);
    $("#repOk").onclick=()=>{
      const [cy,cm]=cur.split("-");
      src.forEach(t=>{const day=t.date.slice(8,10);const nt={id:uid(),date:`${cy}-${cm}-${day}`,type:t.type,amount:+t.amount,catId:t.catId,acctId:t.acctId||"",toAcctId:t.toAcctId||"",villaId:t.villaId||"",tags:(t.tags||[]).slice(),note:t.note||"",_m:stampNow()};state.transactions.push(nt);if(nt.type==='transfer')applyTransfer(nt.acctId,nt.toAcctId,nt.amount,1);else acctDelta(nt.acctId,nt.type,nt.amount,1);});
      save();closeModal();render();toast(`Copied ${src.length} into ${monthName(cur)} ✓`);
    };
  },
  exportMonth(){
    const sel=($("#monthSel")&&$("#monthSel").value)||window.__selMonth||monthKey();
    const tx=state.transactions.filter(t=>monthKey(t.date)===sel).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
    if(!tx.length) return toast("No entries that month");
    const villaName=id=>{const v=(state.villas||[]).find(x=>x.id===id);return v?v.name:"";};
    const q=s=>{s=String(s==null?"":s);return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
    const rows=[["Date","Type","Category","Villa/Project","Note","Amount"]];
    tx.forEach(t=>rows.push([t.date,t.type,catById(t.catId).name,villaName(t.villaId),t.note||"",(+t.amount||0)]));
    const csv=rows.map(r=>r.map(q).join(",")).join("\r\n");
    const blob=new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`TVM_statement_${sel}.csv`;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1500);
    toast("Statement exported ✓");
  },
  exportHist(){
    const rows=$$('.hrow:not(.hide)');
    if(!rows.length) return toast("Nothing to export");
    const villaName=id=>{const v=(state.villas||[]).find(x=>x.id===id);return v?v.name:"";};
    const q=s=>{s=String(s==null?"":s);return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
    const out=[["Date","Type","Category","Villa","Bank","Amount","Note"]];
    rows.forEach(r=>{const t=state.transactions.find(x=>x.id===r.dataset.id);if(!t)return;out.push([t.date,t.type,catById(t.catId).name,villaName(t.villaId),t.bank||"",(+t.amount||0),t.note||""]);});
    if(out.length<2) return toast("Nothing to export");
    const csv=out.map(r=>r.map(q).join(",")).join("\r\n");
    const blob=new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`TVM_filtered_${todayISO()}.csv`;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1500);
    toast("Filtered list exported ✓");
  },
  addBill(){
    const name=$("#bName").value.trim();const amt=+$("#bAmt").value;
    if(!name||!amt)return toast("Name and amount needed");
    const bill={id:uid(),name,amount:amt,freq:billFreq,paid:{},_m:Date.now()};
    if(billFreq==="once"){bill.dueDate=$("#bDate").value||todayISO();bill.paidOnce=false;}
    else{bill.dueDay=clamp(+$("#bDay").value||1,1,31);}
    state.bills.push(bill);
    save();render();toast("Added to schedule ✓");
  },
  addGoal(){
    const name=$("#gName").value.trim();const target=+$("#gTarget").value;
    if(!name||!target)return toast("Name and target needed");
    state.goals.push({id:uid(),name,target,saved:+$("#gSaved").value||0,emoji:($("#gEmoji").value||"🎯").trim(),_m:Date.now()});
    save();render();toast("Goal added ✓");
  },
  addDebt(){
    const name=$("#dName").value.trim();const total=+$("#dTotal").value;
    if(!name||!total)return toast("Name and total needed");
    state.debts.push({id:uid(),name,total,paid:+$("#dPaid").value||0,emoji:($("#dEmoji").value||"💳").trim(),_m:Date.now()});
    save();render();toast("Debt added ✓");
  },
  addVilla(){
    const name=$("#vName").value.trim();if(!name)return toast("Villa name needed");
    state.villas.push({id:uid(),name,emoji:($("#vEmoji").value||"🏝️").trim(),income:0,expense:0,_m:Date.now()});
    save();render();toast("Villa added ✓");
  },
  addInvestor(){
    const name=$("#iName").value.trim();if(!name)return toast("Investor name needed");
    state.investors.push({id:uid(),name,emoji:"🤝",contributed:+$("#iAmt").value||0,repaid:0,_m:Date.now()});
    save();render();toast("Investor added ✓");
  },
  addFurniture(){
    const project=$("#fProj").value.trim();const item=$("#fItem").value.trim();
    const cost=+$("#fCost").value||0;
    if(!project)return toast("Villa / project needed");
    if(!item)return toast("Item needed");
    state.furniture.push({id:uid(),project,item,cost,paid:+$("#fPaid").value||0,status:$("#fStatus").value||"Ordered",_m:Date.now()});
    save();render();toast("Order added ✓");
  },
  addProject(){
    const name=$("#pName").value.trim();if(!name)return toast("Project name needed");
    state.project={name,budget:+$("#pBudget").value||0,spent:0,_m:Date.now()};
    save();render();toast("Project tracking on ✓");
  },
  delProject(){ state.project=null; save(); render(); },
  projSpend(){
    if(!state.project)return;
    openModal(`<h3>Log spend — ${esc(state.project.name)}</h3><div class="field"><label>Amount spent</label><input id="psAmt" type="number" inputmode="decimal" placeholder="0" autofocus/></div><button class="btn" id="psSave">Log spend</button>`);
    $("#psSave").onclick=()=>{const a=+$("#psAmt").value;if(!a)return toast("Enter amount");state.project.spent=(+state.project.spent||0)+a;state.project._m=Date.now();save();closeModal();render();toast("Logged 🏗️");};
  },
  saveSettings(){
    const s=state.settings;
    s.name=$("#sName").value.trim();s.currency=$("#sCur").value.trim()||"Rp";
    s.currencyPos=$("#sPos").value;s.monthlyIncome=+$("#sInc").value||0;s._m=Date.now();
    save();render();toast("Saved ✓");
  },
  addCat(){
    openModal(`<h3>New category</h3>
      <div class="field"><label>Name</label><input id="ncName" placeholder="e.g. Pak Oki"/></div>
      <div class="row"><div class="field"><label>Emoji</label><input id="ncEmoji" placeholder="📦" maxlength="2"/></div>
      <div class="field"><label>Type</label><select id="ncType"><option value="expense">Expense / payable</option><option value="income">Income / receivable</option></select></div></div>
      <div class="row"><div class="field"><label>Tracked total (optional)</label><input id="ncTarget" type="number" inputmode="decimal" placeholder="e.g. 222000"/></div>
      <div class="field"><label>Currency (optional)</label><input id="ncCur" maxlength="4" placeholder="AUD"/></div></div>
      <div class="sub">Set a tracked total to make it a payment tracker (shows received + remaining). Leave currency blank to use ${esc(state.settings.currency)}.</div>
      <button class="btn" id="ncSave">Add category</button>`);
    $("#ncSave").onclick=()=>{
      const name=$("#ncName").value.trim();if(!name)return toast("Name needed");
      const cat={id:uid(),name,emoji:($("#ncEmoji").value||"📦").trim(),type:$("#ncType").value,budget:0,_m:Date.now()};
      const tg=+$("#ncTarget").value; if(tg>0)cat.target=tg;
      const cur=$("#ncCur").value.trim(); if(cur)cat.cur=cur;
      state.categories.push(cat);
      save();closeModal();render();toast("Category added ✓");
    };
  },
  export(){
    const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);
    a.download=`slowdough-backup-${todayISO()}.json`;a.click();URL.revokeObjectURL(a.href);
    toast("Backup downloaded 📥");
  },
  importBtn(){$("#importFile").click();},
  reset(){
    openModal(`<h3>Reset everything?</h3><p class="small muted">This deletes all transactions, goals, bills and settings on this device. Make sure you exported a backup first.</p>
    <div class="flex mt"><button class="btn danger" id="rYes">Yes, delete all</button><button class="btn secondary" id="rNo">Cancel</button></div>`);
    $("#rYes").onclick=()=>{state=freshState();forcePush();closeModal();go("home");toast("All clear");};
    $("#rNo").onclick=closeModal;
  }
};
function addToGoal(id){
  const g=state.goals.find(x=>x.id===id);if(!g)return;
  openModal(`<h3>Add to “${esc(g.name)}”</h3><div class="field"><label>Amount to add</label><input id="addAmt" type="number" inputmode="decimal" placeholder="0" autofocus/></div>
  <label class="small inline"><input type="checkbox" id="logTx" checked style="width:auto"/> Also log as a Savings expense</label>
  <button class="btn mt" id="addGoSave">Add</button>`);
  $("#addGoSave").onclick=()=>{
    const a=+$("#addAmt").value;if(!a)return toast("Enter amount");
    g.saved=+g.saved+a;touch(g);
    if($("#logTx").checked){const sc=state.categories.find(c=>c.id==="savings")||{id:"savings"};state.transactions.push({id:uid(),date:todayISO(),type:"expense",amount:a,catId:sc.id,note:`Saved → ${g.name}`,_m:Date.now()});}
    save();closeModal();render();toast("Added to goal 🎯");
  };
}
function addCatTx(catId){
  const c=catById(catId); const tracker=isTracker(c);
  openModal(`<h3>Add ${tracker&&!c.ledger?'payment':'entry'} — ${esc(c.name)}</h3>
    ${c.ledger?`<div class="field"><label>Type</label><select id="ctType"><option value="income">📥 Money in</option><option value="expense">📤 Money out</option></select></div>`:''}
    <div class="row"><div class="field" style="flex:1.3"><label>Amount${c.cur?` (${esc(c.cur)})`:''}</label><input id="ctAmt" type="number" inputmode="decimal" placeholder="0" autofocus/></div>
    <div class="field"><label>Date</label><input id="ctDate" type="date" value="${todayISO()}"/></div></div>
    <div class="field"><label>Note (optional)</label><input id="ctNote" placeholder=""/></div>
    <button class="btn" id="ctSave">Add</button>`);
  $("#ctSave").onclick=()=>{
    const a=+$("#ctAmt").value;if(!a||a<=0)return toast("Enter an amount");
    const ty=c.ledger?$("#ctType").value:c.type;
    state.transactions.push({id:uid(),date:$("#ctDate").value||todayISO(),type:ty,amount:a,catId,note:$("#ctNote").value.trim(),_m:Date.now()});
    save();closeModal();render();toast("Added ✓");
  };
}
function logPayment(id){
  const d=state.debts.find(x=>x.id===id);if(!d)return;
  openModal(`<h3>Log payment — ${esc(d.name)}</h3><div class="field"><label>Payment amount</label><input id="payAmt" type="number" inputmode="decimal" placeholder="0" autofocus/></div>
  <label class="small inline"><input type="checkbox" id="logTxD" checked style="width:auto"/> Also log as an expense</label>
  <button class="btn mt" id="paySave">Log payment</button>`);
  $("#paySave").onclick=()=>{
    const a=+$("#payAmt").value;if(!a)return toast("Enter amount");
    d.paid=clamp(+d.paid+a,0,d.total);touch(d);
    if($("#logTxD").checked){state.transactions.push({id:uid(),date:todayISO(),type:"expense",amount:a,catId:"other",note:`Debt payment → ${d.name}`,_m:Date.now()});}
    save();closeModal();render();toast("Payment logged 💳");
  };
}
function villaEntry(id){
  const v=state.villas.find(x=>x.id===id);if(!v)return;
  openModal(`<h3>Log for ${esc(v.name)}</h3>
    <div class="field"><label>Type</label><select id="veType"><option value="income">📥 Rental income</option><option value="expense">📤 Cost</option></select></div>
    <div class="field"><label>Amount</label><input id="veAmt" type="number" inputmode="decimal" placeholder="0" autofocus/></div>
    <button class="btn" id="veSave">Add</button>`);
  $("#veSave").onclick=()=>{const a=+$("#veAmt").value;if(!a||a<=0)return toast("Enter an amount");
    if($("#veType").value==="income")v.income=(+v.income||0)+a;else v.expense=(+v.expense||0)+a;
    v._m=Date.now();save();closeModal();render();toast("Logged ✓");};
}
function furnPay(id){
  const o=state.furniture.find(x=>x.id===id);if(!o)return;
  const left=Math.max(0,(+o.cost||0)-(+o.paid||0));
  openModal(`<h3>Log payment — ${esc(o.item)}</h3><div class="sub">${esc(o.project)} · ${money(left)} left</div>
    <div class="field"><label>Amount</label><input id="fpAmt" type="number" inputmode="decimal" placeholder="0" autofocus/></div>
    <button class="btn" id="fpSave">Log payment</button>`);
  $("#fpSave").onclick=()=>{const a=+$("#fpAmt").value;if(!a||a<=0)return toast("Enter amount");
    o.paid=clamp((+o.paid||0)+a,0,+o.cost||a);o._m=Date.now();save();closeModal();render();toast("Payment logged 🪑");};
}
function furnCycleStatus(id){
  const o=state.furniture.find(x=>x.id===id);if(!o)return;
  const i=FURN_STATUS.indexOf(o.status||"Ordered");
  o.status=FURN_STATUS[(i+1)%FURN_STATUS.length];o._m=Date.now();
  save();render();toast(`Status: ${o.status}`);
}
function investorRepay(id){
  const x=state.investors.find(i=>i.id===id);if(!x)return;
  openModal(`<h3>Repay ${esc(x.name)}</h3><div class="field"><label>Repayment amount</label><input id="irAmt" type="number" inputmode="decimal" placeholder="0" autofocus/></div><button class="btn" id="irSave">Log repayment</button>`);
  $("#irSave").onclick=()=>{const a=+$("#irAmt").value;if(!a)return toast("Enter amount");x.repaid=clamp((+x.repaid||0)+a,0,+x.contributed||a);x._m=Date.now();save();closeModal();render();toast("Repayment logged 🤝");};
}
$("#importFile")&&0; // placeholder
document.addEventListener("change",e=>{
  if(e.target.id==="importFile"){
    const f=e.target.files[0];if(!f)return;
    const rd=new FileReader();
    rd.onload=()=>{
      try{const data=JSON.parse(rd.result);
        if(!data||typeof data!=="object"||!("transactions" in data))throw 0;
        openModal(`<h3>Import this backup?</h3><p class="small muted">Found ${data.transactions.length} transactions, ${(data.goals||[]).length} goals. This replaces what’s on this device.</p>
        <div class="flex mt"><button class="btn" id="impYes">Replace & import</button><button class="btn secondary" id="impNo">Cancel</button></div>`);
        $("#impYes").onclick=()=>{state={...freshState(),...data};forcePush();closeModal();applyTheme();go("home");toast("Backup imported ✓");};
        $("#impNo").onclick=closeModal;
      }catch(err){toast("That file isn’t a valid backup");}
      e.target.value="";
    };
    rd.readAsText(f);
  }
});

/* ---------- Modal / sheet / toast ---------- */
function openModal(html){$("#modal").innerHTML=html;$("#modalBg").classList.add("show");}
function closeModal(){$("#modalBg").classList.remove("show");}
$("#modalBg").addEventListener("click",e=>{if(e.target.id==="modalBg")closeModal();});
function openGuide(){
  openModal(`<h3>📖 Quick guide</h3>
  <div class="accordion"><details open><summary>Start here <span>＋</span></summary><div class="body">
    <ul><li><b>Add</b> — log money in and out as it happens.</li>
    <li><b>Home</b> — your balance and this month at a glance.</li>
    <li><b>History</b> — every transaction, newest first.</li>
    <li><b>Reports</b> — the same money summarised: month, year, by category.</li>
    <li><b>Business</b> — your villas, investors and the build.</li></ul>
    <p class="small muted" style="margin-top:8px">Everything else (Bills, Goals, Setup, Backup) is under ☰ More.</p></div></details></div>
  <div class="accordion"><details><summary>Keep your data safe <span>＋</span></summary><div class="body">
    Your data syncs across your devices automatically (you and Afni share it, safely). For an extra offline copy, use <b>Backup &amp; Data → Export</b> anytime. 🤍</div></details></div>
  <div class="accordion"><details><summary>The Financial TVM way <span>＋</span></summary><div class="body">
    No shame, no pressure. Going over budget isn’t failure — it’s information. Show up, log honestly, be kind to yourself. 🌱</div></details></div>
  <button class="btn" onclick="document.getElementById('modalBg').classList.remove('show')">Let’s go ✨</button>`);
}
function openMore(){
  const items=PAGES.filter(p=>p.more);
  openModal(`<h3>More</h3><div class="list">${items.map(p=>`<button class="item" style="width:100%;text-align:left" data-go="${p.id}"><div class="emoji">${p.icon}</div><div class="main"><div class="t">${p.label}</div></div><span class="muted">›</span></button>`).join("")}</div>`);
  $$("#modal [data-go]").forEach(b=>b.addEventListener("click",()=>{closeModal();go(b.dataset.go);}));
}
let toastT;
function toast(msg){const el=$("#toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove("show"),1900);}

/* ---------- Theme ---------- */
function applyTheme(){
  const dark=state.settings.theme==="dark";
  document.documentElement.setAttribute("data-theme",dark?"dark":"light");
  const tb=$("#themeBtn");if(tb)tb.textContent=dark?"☀️":"🌙";
  const meta=document.querySelector('meta[name=theme-color]');if(meta)meta.content=dark?"#15161A":"#EE853F";
}
$("#themeBtn").addEventListener("click",()=>{state.settings.theme=state.settings.theme==="dark"?"light":"dark";state.settings._m=Date.now();save();applyTheme();});
$("#quickAdd").addEventListener("click",()=>go("add"));
$("#moreBtn").addEventListener("click",openMore);
/* Force a fresh pull from the cloud (cloud wins) — kills any stale local copy */
$("#syncBtn").addEventListener("click",async()=>{
  const b=$("#syncBtn"); b.textContent="⏳";
  try{
    const r=await fetch(CLOUD,{headers:{"x-sd-token":CLOUD_TOKEN},cache:"no-store"});
    if(r.ok){ const d=await r.json(); if(d&&d.state){ state=normCur({...freshState(),...d.state}); saveLocalOnly(); applyTheme(); render(); toast("Synced from cloud ✓"); } else toast("Sync failed"); }
    else toast("Sync failed");
  }catch(e){ toast("Sync failed — check connection"); }
  b.textContent="↻";
});

/* ---------- Helpers ---------- */
function esc(s){return (s==null?"":String(s)).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}
function getGreeting(){const h=new Date().getHours();return h<12?"Good morning":h<18?"Good afternoon":"Good evening";}
function monthName(mk){const[y,m]=mk.split("-");return new Date(y,m-1,1).toLocaleDateString(undefined,{month:"long",year:"numeric"});}
function prettyDate(iso){const d=new Date(iso+"T00:00");return d.toLocaleDateString(undefined,{month:"short",day:"numeric"});}

/* ---------- Lock screen ---------- */
function unlock(){
  if(PASSWORDS.includes($("#pw").value)){
    sessionStorage.setItem("sd_unlocked","1");
    $("#lock").style.display="none";$("#app").style.display="block";
    cloudPull();
    applyTheme();render();
  }else{$("#lockErr").textContent="❌ Wrong password. Try again.";}
}
$("#unlock").addEventListener("click",unlock);
$("#pw").addEventListener("keydown",e=>{if(e.key==="Enter")unlock();});
$("#eye").addEventListener("click",()=>{const p=$("#pw");p.type=p.type==="password"?"text":"password";});
if(sessionStorage.getItem("sd_unlocked")==="1"){$("#lock").style.display="none";$("#app").style.display="block";applyTheme();render();cloudPull();}

/* ---------- Re-render when crossing the desktop breakpoint ---------- */
let _wasDesktop=matchMedia('(min-width:1024px)').matches,_rzT=null;
window.addEventListener("resize",()=>{clearTimeout(_rzT);_rzT=setTimeout(()=>{const d=matchMedia('(min-width:1024px)').matches;if(d!==_wasDesktop){_wasDesktop=d;if($("#app").style.display!=="none")render();}},180);});

/* ---------- Service worker ---------- */
if("serviceWorker" in navigator){navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{});if(window.caches){caches.keys().then(ks=>ks.forEach(k=>caches.delete(k))).catch(()=>{});}}