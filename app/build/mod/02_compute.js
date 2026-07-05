function money(n,cur){
  const s=state.settings; const sym=cur||s.currency; const v=Math.abs(Number(n)||0);
  const num=v.toLocaleString('id-ID',{maximumFractionDigits:0});
  const sign=(Number(n)||0)<0?"-":"";
  return s.currencyPos==="before"? `${sign}${sym} ${num}` : `${sign}${num} ${sym}`;
}
function catById(id){return state.categories.find(c=>c.id===id)||{name:"Other",emoji:"📦",type:"expense"};}
function isTracker(c){return !!(c&&(+c.target>0||c.ledger));}
function ledgerTotals(c){const tx=catTx(c.id);const inc=sum(tx.filter(t=>t.type==="income"),t=>+t.amount);const exp=sum(tx.filter(t=>t.type==="expense"),t=>+t.amount);return {inc,exp,net:inc-exp};}
function trackerIds(){return new Set(state.categories.filter(isTracker).map(c=>c.id));}
function catTx(catId){return state.transactions.filter(t=>t.catId===catId).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));}

/* ---------- Aggregations ---------- */
function txInMonth(mk){const tr=trackerIds();return state.transactions.filter(t=>monthKey(t.date)===mk&&!tr.has(t.catId));}
function sum(arr,f){return arr.reduce((a,b)=>a+f(b),0);}
function monthTotals(mk){
  const tx=txInMonth(mk);
  const income=sum(tx.filter(t=>t.type==="income"),t=>+t.amount);
  const expense=sum(tx.filter(t=>t.type==="expense"),t=>+t.amount);
  return {income,expense,net:income-expense};
}
/* income/expense totals for a date range (inclusive ISO strings), trackers + transfers excluded */
function periodTotals(fromISO,toISO){const tr=trackerIds();const tx=state.transactions.filter(t=>!tr.has(t.catId)&&t.date>=fromISO&&t.date<=toISO);return {income:sum(tx.filter(t=>t.type==="income"),t=>+t.amount),expense:sum(tx.filter(t=>t.type==="expense"),t=>+t.amount)};}
function isoAddDays(iso,d){const dt=new Date(iso+"T00:00");dt.setDate(dt.getDate()+d);return dt.toISOString().slice(0,10);}
function spendByCat(mk){
  const m={};
  txInMonth(mk).filter(t=>t.type==="expense").forEach(t=>{m[t.catId]=(m[t.catId]||0)+ +t.amount;});
  return Object.entries(m).map(([id,val])=>({cat:catById(id),id,val})).sort((a,b)=>b.val-a.val);
}
/* all-time + YTD cashflow (cashflow categories only, trackers excluded) */
function allTimeTotals(){const tr=trackerIds();const tx=state.transactions.filter(t=>!tr.has(t.catId));return {income:sum(tx.filter(t=>t.type==="income"),t=>+t.amount),expense:sum(tx.filter(t=>t.type==="expense"),t=>+t.amount)};}
function ytdTotals(yr){const tr=trackerIds();const tx=state.transactions.filter(t=>!tr.has(t.catId)&&t.date.slice(0,4)===String(yr));return {income:sum(tx.filter(t=>t.type==="income"),t=>+t.amount),expense:sum(tx.filter(t=>t.type==="expense"),t=>+t.amount)};}
function investorTotals(){const c=sum(state.investors||[],x=>+x.contributed||0),r=sum(state.investors||[],x=>+x.repaid||0);return {contributed:c,repaid:r,outstanding:c-r};}
/* real-cash balance = sum of bank accounts, EUR converted via settings.eurRate */
function eurRate(){return +((state.settings||{}).eurRate)||20382;}
function accountsTotalIDR(){return sum(state.accounts||[],a=>(+a.amount||0)*(a.currency==="EUR"?eurRate():1));}
function hasAccounts(){return !!(state.accounts&&state.accounts.length);}
/* monotonic timestamp: always beats anything already in local state, so a device with a
   slightly-behind clock still produces a WINNING _m for the merge (fixes edits reverting). */
function stampNow(){ const t=Math.max(Date.now(),(+state._clk||0)+1); state._clk=t; return t; }
/* apply/reverse a transaction's effect on its linked bank account. tx amounts are in base Rp;
   convert to the account's currency (EUR accounts). sign=+1 apply, sign=-1 reverse. */
function acctDelta(acctId,type,amount,sign){
  if(!acctId) return; const a=(state.accounts||[]).find(x=>x.id===acctId); if(!a) return;
  const amt=(+amount||0)/(a.currency==='EUR'?eurRate():1);
  a.amount=(+a.amount||0)+((type==='income'?1:-1)*amt*sign); a._m=stampNow();
}
function acctOptions(sel){ return (state.accounts||[]).map(a=>`<option value="${a.id}" ${sel===a.id?'selected':''}>${esc(a.name)}${a.currency==='EUR'?' (EUR)':''}</option>`).join(""); }
/* ===== ezbookkeeping contract helpers (shared spine — pages build against these) ===== */
/* TRANSFER: move money between two own accounts. sign=+1 apply (from-=,to+=), -1 reverse. EUR-converted per account. Transfers never count as income/expense (totals filter by type). */
function applyTransfer(fromId,toId,amount,sign){
  const amt=+amount||0;
  if(fromId){const a=(state.accounts||[]).find(x=>x.id===fromId); if(a){a.amount=(+a.amount||0)-(amt/(a.currency==='EUR'?eurRate():1))*sign; a._m=stampNow();}}
  if(toId){const b=(state.accounts||[]).find(x=>x.id===toId); if(b){b.amount=(+b.amount||0)+(amt/(b.currency==='EUR'?eurRate():1))*sign; b._m=stampNow();}}
}
/* TWO-LEVEL CATEGORIES: a category with parentId is a subcategory. */
function topCats(type){return state.categories.filter(c=>!c.parentId&&(!type||c.type===type));}
function childCats(pid){return state.categories.filter(c=>c.parentId===pid);}
function catParentOf(id){const c=state.categories.find(x=>x.id===id); return c&&c.parentId?state.categories.find(x=>x.id===c.parentId):null;}
function catRollupId(id){const p=catParentOf(id); return p?p.id:id;} /* for reports rollup */
/* TAGS: transactions carry an optional tags:[] array. */
function allTags(){const s=new Set(); state.transactions.forEach(t=>(t.tags||[]).forEach(g=>{if(g)s.add(g);})); return [...s].sort();}
function tagChips(tags){return (tags||[]).map(g=>`<span class="tag-chip">${esc(g)}</span>`).join("");}
/* transfer display label e.g. "Wise → CIMB" */
function transferLabel(t){const f=(state.accounts||[]).find(a=>a.id===t.acctId),to=(state.accounts||[]).find(a=>a.id===t.toAcctId);return `${f?esc(f.name):'?'} → ${to?esc(to.name):'?'}`;}
function villaTagTotals(vid){const tx=state.transactions.filter(t=>t.villaId===vid);return {inc:sum(tx.filter(t=>t.type==="income"),t=>+t.amount), exp:sum(tx.filter(t=>t.type==="expense"),t=>+t.amount)};}
function villaRows(){return (state.villas||[]).map(v=>{const tg=villaTagTotals(v.id);const income=(+v.income||0)+tg.inc;const expense=(+v.expense||0)+tg.exp;return {...v,income,expense,net:income-expense};});}
function villaOptions(sel){return `<option value="">— No villa —</option>`+(state.villas||[]).map(v=>`<option value="${v.id}" ${sel===v.id?'selected':''}>${v.emoji||'🏠'} ${esc(v.name)}</option>`).join("");}
function villaTx(vid){return state.transactions.filter(t=>t.villaId===vid).sort((a,b)=>b.date.localeCompare(a.date)||(b._m||0)-(a._m||0));}
function villaCatSpend(vid){const m={};state.transactions.filter(t=>t.villaId===vid&&t.type==="expense").forEach(t=>{m[t.catId]=(m[t.catId]||0)+ +t.amount;});return Object.entries(m).map(([id,val])=>({cat:catById(id),id,val})).sort((a,b)=>b.val-a.val);}
function acctTx(aid){return state.transactions.filter(t=>t.acctId===aid).sort((a,b)=>b.date.localeCompare(a.date)||(b._m||0)-(a._m||0));}
/* ---- analytics ranges ---- */
function lastNMonths(n){const arr=[];const now=new Date();for(let i=n-1;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);arr.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);}return arr;}
function trendData(n){return lastNMonths(n).map(mk=>({mk,...monthTotals(mk)}));}
function balanceTrend(n){
  const data=trendData(n);
  const at=allTimeTotals(); const endBal=hasAccounts()?accountsTotalIDR():(at.income-at.expense);
  const bals=new Array(data.length); bals[data.length-1]=endBal;
  for(let i=data.length-2;i>=0;i--){ bals[i]=bals[i+1]-data[i+1].net; }
  return data.map((d,i)=>({mk:d.mk,bal:bals[i]}));
}
function spendByCatRange(months){
  const set=new Set(months); const tr=trackerIds(); const m={};
  state.transactions.filter(t=>t.type==="expense"&&!tr.has(t.catId)&&set.has(monthKey(t.date))).forEach(t=>{m[t.catId]=(m[t.catId]||0)+ +t.amount;});
  return Object.entries(m).map(([id,val])=>({cat:catById(id),id,val})).sort((a,b)=>b.val-a.val);
}

/* ===================== ROUTER ===================== */
const PAGES=[
  {id:"home",   grp:"",     icon:"🏠",label:"Overview",short:"Home"},
  {id:"add",    grp:"TRANSACTION DATA", icon:"✏️",label:"Add transaction",short:"Add",more:true},
  {id:"history",grp:"TRANSACTION DATA", icon:"📄",label:"Transactions",short:"Txns"},
  {id:"reports",grp:"TRANSACTION DATA", icon:"📊",label:"Statistics & Analysis",short:"Stats"},
  {id:"accounts",grp:"BASIS DATA", icon:"🏦",label:"Accounts",more:true},
  {id:"cats",   grp:"BASIS DATA", icon:"📂",label:"Categories",more:true},
  {id:"tags",   grp:"BASIS DATA", icon:"🏷️",label:"Tags",more:true},
  {id:"bills",  grp:"BASIS DATA", icon:"🧾",label:"Scheduled & Bills",more:true},
  {id:"biz",    grp:"BUSINESS",   icon:"🏝️",label:"Villas & Investors",short:"Villas"},
  {id:"furniture",grp:"BUSINESS", icon:"🪑",label:"Furniture business",more:true},
  {id:"goals",  grp:"BUSINESS",   icon:"🎯",label:"Goals",more:true},
  {id:"debts",  grp:"BUSINESS",   icon:"💳",label:"Debt payoff",more:true},
  {id:"setup",  grp:"MISCELLANEOUS", icon:"💱",label:"Exchange rates & setup",more:true},
  {id:"backup", grp:"MISCELLANEOUS", icon:"💾",label:"Backup & data",more:true},
  {id:"sheet",  grp:"MISCELLANEOUS", icon:"📋",label:"Google Sheet",more:true},
];
const MOBILE_NAV=["home","add","history","reports","biz"];
let route="home";
let selCat=null;
let selVilla=null;
let selAcct=null;