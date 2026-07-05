function catColor(catId){const i=state.categories.findIndex(c=>c.id===catId);return chartColor(i<0?0:i);}

/* ---------- HISTORY (ezbookkeeping-style grouped list) ---------- */
/* Filter state lives on window.__hf and drives a local re-render of the list
   only (the filter bar itself is never re-rendered, so text-search keeps focus).
   Rows carry class "hrow" + data-id so the existing exportHist action in
   14_actions_init.js keeps working and exports exactly the filtered set. */

function histState(){
  if(!window.__hf) window.__hf={type:"all",acct:"",cat:"",tag:"",villa:"",month:"",q:""};
  return window.__hf;
}
function histMatch(t,hf){
  if(hf.type&&hf.type!=="all"&&t.type!==hf.type) return false;
  if(hf.acct){
    if(t.type==="transfer"){ if(t.acctId!==hf.acct&&t.toAcctId!==hf.acct) return false; }
    else if(t.acctId!==hf.acct) return false;
  }
  if(hf.cat){ if(!(t.catId===hf.cat||catRollupId(t.catId)===hf.cat)) return false; }
  if(hf.tag&&!(t.tags||[]).includes(hf.tag)) return false;
  if(hf.villa&&t.villaId!==hf.villa) return false;
  if(hf.month&&monthKey(t.date)!==hf.month) return false;
  if(hf.q){
    const c=catById(t.catId);
    const v=t.villaId?(state.villas||[]).find(x=>x.id===t.villaId):null;
    let hay=`${t.note||""} ${c?c.name:""} ${v?v.name:""} ${(t.tags||[]).join(" ")}`;
    if(t.type==="transfer"){
      const f=(state.accounts||[]).find(a=>a.id===t.acctId),to=(state.accounts||[]).find(a=>a.id===t.toAcctId);
      hay+=` ${f?f.name:""} ${to?to.name:""}`;
    }
    if(!hay.toLowerCase().includes(hf.q)) return false;
  }
  return true;
}
function histFiltered(){
  const hf=histState();
  return state.transactions
    .filter(t=>histMatch(t,hf))
    .sort((a,b)=>b.date.localeCompare(a.date)||(b._m||0)-(a._m||0));
}
function histNet(list){
  let inc=0,exp=0;
  list.forEach(t=>{ if(t.type==="income")inc+= +t.amount||0; else if(t.type==="expense")exp+= +t.amount||0; });
  return {inc,exp,net:inc-exp};
}
function histDayLabel(iso){
  const today=todayISO();
  const d=new Date(iso+"T00:00");
  const yd=new Date(Date.now()-86400000).toISOString().slice(0,10);
  const opts={weekday:"short",month:"short",day:"numeric"};
  if(d.getFullYear()!==new Date().getFullYear()) opts.year="numeric";
  const nice=d.toLocaleDateString(undefined,opts);
  if(iso===today) return `Today · ${nice}`;
  if(iso===yd) return `Yesterday · ${nice}`;
  return nice;
}

function hRow(t){
  const isTf=t.type==="transfer", isInc=t.type==="income";
  const c=catById(t.catId);
  const v=t.villaId?(state.villas||[]).find(x=>x.id===t.villaId):null;
  const ic=isTf?"🔁":(isInc?"💸":(c.emoji||"📦"));
  const title=isTf?transferLabel(t):esc(c.name);
  const acct=isTf?"":((state.accounts||[]).find(a=>a.id===t.acctId)||{}).name;
  const parts=[];
  if(!isTf&&acct) parts.push(esc(acct));
  else if(!isTf&&t.bank) parts.push(esc(t.bank));
  if(v) parts.push(`${v.emoji||"🏠"} ${esc(v.name)}`);
  if(t.note) parts.push(esc(t.note));
  const tags=tagChips(t.tags);
  let sub=parts.join(" · ");
  if(tags) sub+=(sub?" ":"")+tags;
  const cls=isTf?"tf":(isInc?"inc":"exp");
  const sign=isTf?"":(isInc?"+":"−");
  return `<div class="tx-line hrow" data-id="${t.id}" data-edittx="${t.id}" style="cursor:pointer">
    <div class="tx-ic">${ic}</div>
    <div class="tx-main">
      <div class="tx-t">${title}</div>
      <div class="tx-s">${sub||"&nbsp;"}</div>
    </div>
    <div class="tx-amt ${cls}">${sign}${money(t.amount)}</div>
  </div>`;
}

function histListInner(list){
  if(!list.length) return `<div class="empty" style="padding:26px 8px">${emptyState("🔍","No matches","Try clearing a filter or the search box.")}</div>`;
  let out="",lastDay=null,bucket="";
  const flush=()=>{
    if(lastDay===null) return;
    const day=list.filter(t=>t.date===lastDay);
    const n=histNet(day);
    const netCls=n.net>=0?"inc":"exp";
    out+=`<div class="day-group"><div class="day-head"><span>${histDayLabel(lastDay)}</span><span class="net ${netCls}">${n.net>=0?"+":"−"}${money(Math.abs(n.net))}</span></div>${bucket}</div>`;
    bucket="";
  };
  list.forEach(t=>{ if(t.date!==lastDay){ flush(); lastDay=t.date; } bucket+=hRow(t); });
  flush();
  // hidden markers so exportHist ($$('.hrow')) is unnecessary — rows already carry .hrow.
  return out;
}

function histRender(){
  const list=histFiltered();
  const w=$("#histListWrap"); if(w) w.innerHTML=histListInner(list);
  const cn=$("#histN"); if(cn) cn.textContent=`${list.length} ${list.length===1?"entry":"entries"}`;
  const nt=$("#histNet"); if(nt){ const n=histNet(list); nt.className=`tx-amt ${n.net>=0?"inc":"exp"}`; nt.textContent=`${n.net>=0?"+":"−"}${money(Math.abs(n.net))}`; }
}
function histApply(){
  const hf=histState();
  const g=id=>{const e=$("#"+id);return e?e.value:"";};
  window.__hf={type:hf.type||"all",acct:g("hfAcct"),cat:g("hfCat"),tag:g("hfTag"),villa:g("hfVilla"),month:g("hfMonth"),q:g("hfSearch").toLowerCase().trim()};
  histRender();
}
function histSetType(v){
  const hf=histState(); hf.type=v; window.__hf=hf;
  $$("#hfType .chip").forEach(c=>c.classList.toggle("on",c.dataset.v===v));
  histRender();
}

function History(){
  window.__histType="all"; // neutralise the legacy external filter in 13_shared_render.js
  const hf=histState();
  const head=`<div class="page-head"><h2>Transactions 📜</h2><p>Every transaction, newest first. Tap a row to edit.</p></div>`;
  if(!state.transactions.length) return head+`<div class="card">${emptyState("📜","Nothing yet","Add your first entry from the Add page.")}</div>`;

  const months=[...new Set(state.transactions.map(t=>monthKey(t.date)))].sort().reverse();
  const tags=allTags();
  const accts=state.accounts||[];
  const villas=state.villas||[];

  const typeChips=[["all","All"],["expense","Expense"],["income","Income"],["transfer","Transfer"]]
    .map(([v,l])=>`<button class="chip ${hf.type===v?"on":""}" data-v="${v}" onclick="histSetType('${v}')">${l}</button>`).join("");

  const catSel=`<select id="hfCat" onchange="histApply()"><option value="">All categories</option>${
    topCats().map(p=>{
      const kids=childCats(p.id);
      const pOpt=`<option value="${p.id}" ${hf.cat===p.id?"selected":""}>${p.emoji||"📦"} ${esc(p.name)}</option>`;
      if(!kids.length) return pOpt;
      return `<optgroup label="${esc(p.name)}">${pOpt}${kids.map(k=>`<option value="${k.id}" ${hf.cat===k.id?"selected":""}>   ${k.emoji||"•"} ${esc(k.name)}</option>`).join("")}</optgroup>`;
    }).join("")
  }</select>`;

  const acctSel=accts.length?`<select id="hfAcct" onchange="histApply()"><option value="">All accounts</option>${accts.map(a=>`<option value="${a.id}" ${hf.acct===a.id?"selected":""}>${esc(a.name)}${a.currency==="EUR"?" (EUR)":""}</option>`).join("")}</select>`:"";
  const villaSel=villas.length?`<select id="hfVilla" onchange="histApply()"><option value="">All villas</option>${villas.map(v=>`<option value="${v.id}" ${hf.villa===v.id?"selected":""}>${v.emoji||"🏠"} ${esc(v.name)}</option>`).join("")}</select>`:"";
  const tagSel=tags.length?`<select id="hfTag" onchange="histApply()"><option value="">All tags</option>${tags.map(g=>`<option value="${esc(g)}" ${hf.tag===g?"selected":""}>#${esc(g)}</option>`).join("")}</select>`:"";
  const monthSel=`<select id="hfMonth" onchange="histApply()"><option value="">All months</option>${months.map(m=>`<option value="${m}" ${hf.month===m?"selected":""}>${monthName(m)}</option>`).join("")}</select>`;
  const search=`<input id="hfSearch" placeholder="Search note, category, villa…" value="${esc(hf.q)}" oninput="histApply()" style="flex:1;min-width:150px">`;

  const list=histFiltered();
  const n=histNet(list);

  return head+`
  <div class="card mb">
    <div class="filterbar">
      <div class="chip-row" id="hfType" style="flex-basis:100%">${typeChips}</div>
      ${catSel}${acctSel}${villaSel}${tagSel}${monthSel}${search}
    </div>
  </div>
  <div class="card">
    <div class="flex wrap" style="align-items:center;gap:10px;margin-bottom:6px">
      <h3 id="histN" style="margin:0">${list.length} ${list.length===1?"entry":"entries"}</h3>
      <span id="histNet" class="tx-amt ${n.net>=0?"inc":"exp"}">${n.net>=0?"+":"−"}${money(Math.abs(n.net))}</span>
      <button class="btn sm secondary" data-act="exportHist">📥 Export CSV</button>
      <button class="btn sm secondary right" data-go="add">Add +</button>
    </div>
    <div id="histListWrap">${histListInner(list)}</div>
  </div>`;
}

/* ---------- REPORTS (month + year, merged) ---------- */
