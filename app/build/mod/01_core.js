"use strict";
/* =========================================================
   Financial TVM — gentle budget planner (single-file PWA)
   Data stays in localStorage. Backup/restore for multi-device.
   ========================================================= */
const PASSWORDS = ["LetsgetRich!"]; // Soof + Afni shared (internal soft gate)
const STORE_KEY = "slowdough_v1";
const CLOUD = "https://binkylinkai.com/financial/api/state";
const CLOUD_TOKEN = "sdk_e7c4d7d100c3528134509111";
const $ = (s,el=document)=>el.querySelector(s);
const $$ = (s,el=document)=>[...el.querySelectorAll(s)];
const uid = ()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-3);
const todayISO = ()=>new Date().toISOString().slice(0,10);
const monthKey = (d)=> (d||todayISO()).slice(0,7);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

/* ---------- Default state ---------- */
const DEFAULT_CATS = [
  {id:"groceries",name:"Groceries",emoji:"🛒",budget:0,type:"expense"},
  {id:"dining",name:"Dining & Coffee",emoji:"☕",budget:0,type:"expense"},
  {id:"transport",name:"Transport",emoji:"🚗",budget:0,type:"expense"},
  {id:"housing",name:"Rent & Utilities",emoji:"🏠",budget:0,type:"expense"},
  {id:"family",name:"Family & Care",emoji:"🤍",budget:0,type:"expense"},
  {id:"health",name:"Health",emoji:"💊",budget:0,type:"expense"},
  {id:"fun",name:"Fun & Leisure",emoji:"🎉",budget:0,type:"expense"},
  {id:"shopping",name:"Shopping",emoji:"🛍️",budget:0,type:"expense"},
  {id:"savings",name:"Savings",emoji:"🐷",budget:0,type:"expense"},
  {id:"other",name:"Other",emoji:"📦",budget:0,type:"expense"},
  {id:"salary",name:"Salary",emoji:"💼",budget:0,type:"income"},
  {id:"side",name:"Side income",emoji:"✨",budget:0,type:"income"},
  {id:"gift",name:"Gifts received",emoji:"🎁",budget:0,type:"income"},
];
function freshState(){
  return {
    onboarded:false,
    settings:{ name:"", currency:"Rp", currencyPos:"before", monthlyIncome:0, theme:"light", eurRate:20382 },
    accounts:[       // {id,name,currency('IDR'|'EUR'),amount,_m} — real cash per bank; balance = sum (EUR×eurRate)
      {id:"acc_wise",name:"Wise",currency:"EUR",amount:4200},
      {id:"acc_cash",name:"Cash",currency:"IDR",amount:30000000},
      {id:"acc_bca",name:"BCA",currency:"IDR",amount:0},
      {id:"acc_permata",name:"Permata",currency:"IDR",amount:58000000},
      {id:"acc_cimb",name:"CIMB Niaga",currency:"IDR",amount:125000000},
    ],
    categories:JSON.parse(JSON.stringify(DEFAULT_CATS)),
    transactions:[], // {id,date,type,amount,catId,note}
    bills:[],        // {id,name,amount,dueDay,catId,paid:{'2026-06':true}}
    goals:[],        // {id,name,target,saved,emoji,deadline}
    debts:[],        // {id,name,total,paid,emoji}
    villas:[],       // {id,name,emoji,income,expense}  — per-property P&L
    investors:[],    // {id,name,emoji,contributed,repaid,note}
    furniture:[],    // {id,project,item,cost,paid,status,vendor,note} — furniture business, per order
    project:null,    // {name,budget,spent}  — construction project
    _del:{},         // tombstones {id:ts} so deletes survive a merge
  };
}
// merge-keys that are arrays of {id,...} records
const ARR_KEYS=["categories","transactions","bills","goals","debts","villas","investors","furniture","accounts"];
function touch(o){ if(o) o._m=Date.now(); return o; }
function tomb(id){ state._del=state._del||{}; state._del[id]=(typeof stampNow==='function'?stampNow():Date.now()); }
let state = load();
function load(){
  try{const r=JSON.parse(localStorage.getItem(STORE_KEY));const st=r?{...freshState(),...r}:freshState();if(st.settings&&st.settings.currency==="$")st.settings.currency="Rp";return st;}
  catch(e){return freshState();}
}
function save(){ localStorage.setItem(STORE_KEY,JSON.stringify(state)); cloudPush(); }
function saveLocalOnly(){ localStorage.setItem(STORE_KEY,JSON.stringify(state)); }
function normCur(st){ if(st&&st.settings&&st.settings.currency==="$") st.settings.currency="Rp"; return st; }

/* ---- record-level merge so two devices (Soof + Afni) don't overwrite each other ----
   Arrays merge by id (newer _m wins). Deletes are tombstoned in _del so a deleted
   record can't be resurrected by the other device. Legacy records have no _m (=0),
   so nothing existing is ever dropped — only explicit post-upgrade deletes apply. */
function mergeStates(a,b){
  a=a||freshState(); b=b||{};
  const out=freshState();
  const del={...(a._del||{}),...(b._del||{})};
  for(const k in (b._del||{})){ if(!del[k]||(b._del[k]>del[k])) del[k]=b._del[k]; }
  out._del=del;
  ARR_KEYS.forEach(k=>{
    const map={};
    (a[k]||[]).forEach(r=>{ if(r&&r.id) map[r.id]=r; });
    (b[k]||[]).forEach(r=>{ if(!r||!r.id) return; const e=map[r.id]; if(!e||(+r._m||0)>(+e._m||0)) map[r.id]=r; });
    out[k]=Object.values(map).filter(r=>{ const dt=del[r.id]; return !(dt&&dt>=(+r._m||0)); });
  });
  // settings: newer wins (stamped via _m)
  out.settings = ((+((b.settings||{})._m)||0) > (+((a.settings||{})._m)||0)) ? {...out.settings,...b.settings} : {...out.settings,...a.settings};
  // construction project: newer wins
  const pa=a.project,pb=b.project;
  out.project = (pb&&(+pb._m||0)>(+(pa&&pa._m)||0)) ? pb : (pa||pb||null);
  out.onboarded = !!(a.onboarded||b.onboarded);
  // keep the monotonic clock ahead of anything merged in, so local edits keep winning
  let mx=Math.max(+a._clk||0,+b._clk||0);
  ARR_KEYS.forEach(k=>(out[k]||[]).forEach(r=>{ if(r&&(+r._m||0)>mx) mx=+r._m; }));
  if((+((out.settings||{})._m)||0)>mx) mx=+out.settings._m;
  out._clk=mx;
  return normCur(out);
}
let _cloudT=null;
function cloudPush(){ clearTimeout(_cloudT); _cloudT=setTimeout(async()=>{
  try{
    const r=await fetch(CLOUD,{headers:{"x-sd-token":CLOUD_TOKEN}});
    if(r.ok){ const d=await r.json(); if(d&&d.state){ state=mergeStates(state,d.state); saveLocalOnly(); if(typeof render==="function") render(); } }
  }catch(e){}
  fetch(CLOUD,{method:"PUT",headers:{"content-type":"application/json","x-sd-token":CLOUD_TOKEN},body:JSON.stringify({state,ts:Date.now()})}).catch(()=>{});
},800); }
// a brand-new device still on default seed data: adopt cloud wholesale (don't merge
// template defaults into the real data). Only merge once this device has real edits.
function isPristine(){
  return !state.transactions.length && !state.bills.length && !state.goals.length && !state.debts.length
    && !(state.villas||[]).length && !(state.investors||[]).length && !(state.furniture||[]).length
    && !Object.keys(state._del||{}).length && !state.categories.some(c=>c._m);
}
async function cloudPull(){ try{
  const r=await fetch(CLOUD,{headers:{"x-sd-token":CLOUD_TOKEN}}); if(!r.ok) return;
  const d=await r.json(); if(d&&d.state){
    state = isPristine() ? normCur({...freshState(),...d.state}) : mergeStates(state,d.state);
    saveLocalOnly(); if(typeof render==="function") render();
  }
}catch(e){} }
/* wholesale overwrite (reset / import) — bypasses merge on purpose */
function forcePush(){ saveLocalOnly(); fetch(CLOUD,{method:"PUT",headers:{"content-type":"application/json","x-sd-token":CLOUD_TOKEN},body:JSON.stringify({state,ts:Date.now()})}).catch(()=>{}); }

/* ---------- Money helpers ---------- */