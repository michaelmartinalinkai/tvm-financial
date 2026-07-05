function kpi(label,val,icon,tone){return `<div class="kpi-card"><div class="label">${icon} ${label}</div><div class="val ${tone==='bad'?'':''}" style="${tone==='good'?'color:var(--good)':tone==='bad'?'color:var(--danger)':''}">${val}</div></div>`;}
function txRow(t){
  const v=t.villaId?(state.villas||[]).find(x=>x.id===t.villaId):null;
  const vtag=v?` · ${v.emoji||'🏠'} ${esc(v.name)}`:'';
  const chips=(t.tags&&t.tags.length)?`<div style="margin-top:3px">${tagChips(t.tags)}</div>`:'';
  if(t.type==="transfer"){
    return `<div class="item">
      <div class="emoji">🔁</div>
      <div class="main"><div class="t">${esc(t.note)||'Transfer'}</div><div class="s">${transferLabel(t)} · ${prettyDate(t.date)}${vtag}</div>${chips}</div>
      <div class="amt tf" style="color:var(--ink-soft)">${money(t.amount)}</div>
      <button class="x" data-edittx="${t.id}" title="Edit" style="font-size:15px">✎</button>
    </div>`;
  }
  const c=catById(t.catId);const inc=t.type==="income";
  const parent=catParentOf(t.catId);
  const catLabel=parent?`${parent.name} › ${c.name}`:c.name;
  return `<div class="item">
    <div class="emoji">${c.emoji}</div>
    <div class="main"><div class="t">${esc(t.note)||c.name}</div><div class="s">${esc(catLabel)} · ${prettyDate(t.date)}${vtag}</div>${chips}</div>
    <div class="amt ${inc?'inc':'exp'}">${inc?'+':'−'}${money(t.amount)}</div>
    <button class="x" data-edittx="${t.id}" title="Edit" style="font-size:15px">✎</button>
  </div>`;
}
function emptyState(big,t,s){return `<div class="empty"><span class="big">${big}</span><b>${t}</b><div class="small">${s}</div></div>`;}
function editTx(id){
  const t=state.transactions.find(x=>x.id===id); if(!t) return;
  let et=t.type;
  const parentSel = (t.catId && catParentOf(t.catId)) ? catParentOf(t.catId).id : (t.catId||"");
  const childSel  = (t.catId && catParentOf(t.catId)) ? t.catId : "";
  const parentOpts=ty=>topCats(ty).map(c=>`<option value="${c.id}" ${c.id===parentSel?'selected':''}>${c.emoji} ${esc(c.name)}</option>`).join("");
  const childOpts=(pid,selId)=>{const kids=childCats(pid);return `<option value="">${kids.length?'— optional —':'— none —'}</option>`+kids.map(c=>`<option value="${c.id}" ${c.id===selId?'selected':''}>${c.emoji} ${esc(c.name)}</option>`).join("");};
  const eiType=et==='transfer'?'expense':et;
  const pForChild=parentSel||((topCats(eiType)[0]||{}).id||"");
  const tagsList=allTags();
  const _accs=state.accounts||[]; const acc0=(_accs[0]||{}).id, acc1=(_accs[1]||_accs[0]||{}).id;
  openModal(`<h3>Edit entry ✎</h3>
    <div class="seg tri mb" id="etSeg">
      <button data-ettype="expense" class="${et==='expense'?'on exp':''}">➖ Expense</button>
      <button data-ettype="income" class="${et==='income'?'on inc':''}">➕ Income</button>
      <button data-ettype="transfer" class="${et==='transfer'?'on tf':''}">🔁 Transfer</button>
    </div>
    <div class="row">
      <div class="field" style="flex:1.2"><label>Amount</label><input id="etAmt" type="number" inputmode="decimal" value="${+t.amount||''}"/></div>
      <div class="field"><label>Date</label><input id="etDate" type="date" value="${t.date}"/></div>
    </div>
    <div id="etEi" style="${et==='transfer'?'display:none':''}">
      <div class="row">
        <div class="field"><label>Category</label><select id="etCatParent">${parentOpts(eiType)}</select></div>
        <div class="field"><label>Subcategory</label><select id="etCatChild">${childOpts(pForChild,childSel)}</select></div>
      </div>
      ${hasAccounts()?`<div class="field"><label>Account <span style="color:var(--muted);font-weight:400">— balance updates</span></label><select id="etAcct">${acctOptions(t.acctId||"")}<option value="" ${!t.acctId?'selected':''}>— don't change balance —</option></select></div>`:`<div class="field"><label>Bank (optional)</label><input id="etBank" list="bankList" value="${esc(t.bank||'')}" placeholder="Bank"/><datalist id="bankList"><option>BCA</option><option>Permata</option><option>CIMB Niaga</option><option>Jago</option><option>Wise</option></datalist></div>`}
    </div>
    <div id="etTf" style="${et==='transfer'?'':'display:none'}">
      ${hasAccounts()?`<div class="row">
        <div class="field"><label>From</label><select id="etFrom">${acctOptions(t.acctId||acc0)}</select></div>
        <div class="field"><label>To</label><select id="etTo">${acctOptions(t.toAcctId||acc1)}</select></div>
      </div>`:`<p class="small muted">Add accounts first to move money between them.</p>`}
    </div>
    ${(state.villas||[]).length?`<div class="field"><label>Villa / project</label><select id="etVilla">${villaOptions(t.villaId||"")}</select></div>`:''}
    <div class="field"><label>Tags</label>
      <div class="tag-input-row"><input id="etTags" value="${esc((t.tags||[]).join(', '))}" placeholder="comma or space separated"/></div>
      ${tagsList.length?`<div class="chip-row" id="etTagSug" style="margin-top:6px">${tagsList.map(g=>`<button type="button" class="chip" data-tag="${esc(g)}">${esc(g)}</button>`).join("")}</div>`:''}
    </div>
    <div class="field"><label>Note</label><input id="etNote" value="${esc(t.note||'')}"/></div>
    <div class="flex" style="gap:8px">
      <button class="btn" id="etSave" style="flex:1">Save changes</button>
      <button class="btn danger" id="etDel" title="Delete entry">🗑️</button>
    </div>`);
  const syncEtChild=()=>{const p=$("#etCatParent"),cc=$("#etCatChild");if(!p||!cc)return;cc.innerHTML=childOpts(p.value,"");};
  $$("#modal [data-ettype]").forEach(b=>b.onclick=()=>{
    et=b.dataset.ettype;
    $$("#modal [data-ettype]").forEach(x=>x.className=x.dataset.ettype===et?(et==='expense'?'on exp':et==='income'?'on inc':'on tf'):'');
    const isTf=et==='transfer';
    $("#etEi").style.display=isTf?'none':'';
    $("#etTf").style.display=isTf?'':'none';
    if(!isTf){const p=$("#etCatParent");if(p){p.innerHTML=topCats(et).map(c=>`<option value="${c.id}">${c.emoji} ${esc(c.name)}</option>`).join("");syncEtChild();}}
  });
  const etpc=$("#etCatParent"); if(etpc) etpc.onchange=syncEtChild;
  const etsug=$("#etTagSug"); if(etsug) etsug.onclick=ev=>{const b=ev.target.closest("[data-tag]");if(!b)return;const inp=$("#etTags");const cur=inp.value.split(/[,]/).map(s=>s.trim()).filter(Boolean);if(!cur.includes(b.dataset.tag)){cur.push(b.dataset.tag);inp.value=cur.join(", ");}b.classList.toggle("on");inp.focus();};
  $("#etDel").onclick=()=>{
    if(t.type==='transfer') applyTransfer(t.acctId,t.toAcctId,+t.amount,-1);
    else acctDelta(t.acctId,t.type,+t.amount,-1);
    const i=state.transactions.findIndex(x=>x.id===t.id);
    if(i>=0) state.transactions.splice(i,1);
    if(typeof tomb==='function') tomb(t.id);
    save(); closeModal(); render(); toast("Deleted");
  };
  $("#etSave").onclick=()=>{
    const amt=+$("#etAmt").value; if(!amt||amt<=0) return toast("Enter an amount");
    const newType=et;
    let from,to,newCat,newAcct,newBank;
    if(newType==='transfer'){
      from=$("#etFrom")?$("#etFrom").value:""; to=$("#etTo")?$("#etTo").value:"";
      if(!from||!to) return toast("Pick both accounts");
      if(from===to) return toast("Pick two different accounts");
    }else{
      newCat=($("#etCatChild")&&$("#etCatChild").value)||($("#etCatParent")?$("#etCatParent").value:"")||"";
      newAcct=$("#etAcct")?$("#etAcct").value:(t.acctId||"");
      newBank=$("#etBank")?$("#etBank").value.trim():(t.bank||"");
    }
    // reverse the OLD effect
    if(t.type==='transfer') applyTransfer(t.acctId,t.toAcctId,+t.amount,-1);
    else acctDelta(t.acctId,t.type,+t.amount,-1);
    // write NEW values
    t.type=newType; t.amount=amt; t.date=$("#etDate").value||t.date;
    t.villaId=$("#etVilla")?$("#etVilla").value:(t.villaId||"");
    t.tags=[...new Set(($("#etTags")?$("#etTags").value:"").split(/[,\s]+/).map(s=>s.trim()).filter(Boolean))];
    t.note=$("#etNote")?$("#etNote").value.trim():"";
    if(newType==='transfer'){
      t.acctId=from; t.toAcctId=to; t.catId=""; t.bank="";
      applyTransfer(from,to,amt,1);
    }else{
      t.catId=newCat; t.toAcctId=""; t.acctId=newAcct; t.bank=newBank;
      acctDelta(newAcct,newType,amt,1);
    }
    t._m=stampNow();
    // apply the NEW effect
    save(); closeModal(); render(); toast("Updated ✓");
  };
}
function upcomingCard(){
  const ub=(state.bills||[]).map(b=>({b,s:billStatus(b)})).filter(x=>!x.s.donePeriod).sort((a,b)=>a.s.daysLeft-b.s.daysLeft).slice(0,5);
  if(!ub.length) return "";
  return `<div class="card mb"><div class="flex"><h3>Upcoming payments</h3><button class="btn sm secondary right" data-go="bills">All</button></div>
    <div class="list mt">${ub.map(({b,s})=>`<div class="item">
      <div class="emoji">${s.daysLeft<0?'🔴':s.daysLeft<=3?'🟠':'🧾'}</div>
      <div class="main"><div class="t">${esc(b.name)}</div><div class="s">${s.daysLeft<0?`Overdue by ${Math.abs(s.daysLeft)}d`:s.daysLeft===0?'Due today':`In ${s.daysLeft} day${s.daysLeft===1?'':'s'}`}</div></div>
      <div class="amt exp">${money(b.amount)}</div>
      <button class="btn sm secondary" data-paybill="${b.id}" style="margin-left:8px">Pay</button>
    </div>`).join("")}</div></div>`;
}

/* ---------- SVG charts ---------- */
const PALETTE=["#E5705A","#E8A13C","#4BAE9A","#C67E48","#7FB84E","#5B8FD4","#C77DBB","#E0C04A","#6C9C8E","#B98A5E","#8E7BD0","#9AA85A"];
function chartColor(i){return PALETTE[i%PALETTE.length];}
function donutFromData(data){
  const total=sum(data,d=>d.val);
  if(!total) return emptyState("🍩","Nothing spent yet","Log expenses to see the breakdown.");
  const top=data.slice(0,6);const rest=data.slice(6);
  if(rest.length) top.push({cat:{name:"Other",emoji:"📦"},val:sum(rest,r=>r.val),id:null});
  let acc=0;const R=52,C=2*Math.PI*R;
  const segs=top.map((d,i)=>{
    const frac=d.val/total;const dash=frac*C;const seg=`<circle r="${R}" cx="70" cy="70" fill="none" stroke="${chartColor(i)}" stroke-width="22" stroke-dasharray="${dash} ${C-dash}" stroke-dashoffset="${-acc*C}" transform="rotate(-90 70 70)"/>`;
    acc+=frac;return seg;
  }).join("");
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:16px;margin-top:8px">
    <svg width="210" height="210" viewBox="0 0 140 140" style="max-width:100%">${segs}
      <text x="70" y="66" text-anchor="middle" font-size="10" fill="var(--ink-soft)">Spent</text>
      <text x="70" y="82" text-anchor="middle" font-size="12.5" font-weight="700" fill="var(--ink)">${money(total)}</text></svg>
    <div class="legend" style="width:100%">${top.map((d,i)=>`<div class="li" ${d.id?`data-catview="${d.id}" style="cursor:pointer"`:''}><span class="sw" style="background:${chartColor(i)}"></span><span class="nm">${d.cat.emoji} ${d.cat.name}</span><span class="vl">${money(d.val)} · ${Math.round(d.val/total*100)}%</span></div>`).join("")}</div>
  </div>`;
}
function donutBlock(mk){return donutFromData(spendByCat(mk));}
function catBarsFromData(data){
  const total=sum(data,d=>d.val);
  if(!total) return emptyState("📊","Nothing spent yet","Log expenses to see where the money goes.");
  const max=data[0].val||1;
  return `<div class="catbars">${data.slice(0,8).map((d,i)=>`
    <div class="cbrow" ${d.id?`data-catview="${d.id}" style="cursor:pointer"`:''}><span class="cbn">${d.cat.emoji} ${esc(d.cat.name)}</span>
    <span class="cbbar"><i style="width:${Math.max(4,Math.round(d.val/max*100))}%;background:${chartColor(i)}"></i></span>
    <span class="cbv">${money(d.val)}</span></div>`).join("")}</div>`;
}
function catBarsBlock(mk){return catBarsFromData(spendByCat(mk));}
function barChart(mk){
  const days={};txInMonth(mk).forEach(t=>{const d=t.date.slice(8);if(!days[d])days[d]={inc:0,exp:0};days[d][t.type==='income'?'inc':'exp']+=+t.amount;});
  const keys=Object.keys(days).sort();
  if(!keys.length) return emptyState("📈","No data yet","Add entries to see daily flow.");
  const max=Math.max(...keys.map(k=>Math.max(days[k].inc,days[k].exp)),1);
  const W=Math.max(keys.length*22,200),H=140;
  const bars=keys.map((k,i)=>{
    const x=i*22+10;const ih=days[k].inc/max*100;const eh=days[k].exp/max*100;
    return `<rect x="${x}" y="${120-ih}" width="7" height="${ih}" rx="2" fill="var(--good)"></rect>
            <rect x="${x+8}" y="${120-eh}" width="7" height="${eh}" rx="2" fill="var(--danger)"></rect>
            ${i%Math.ceil(keys.length/8||1)===0?`<text x="${x+4}" y="134" font-size="9" text-anchor="middle" fill="var(--ink-soft)">${+k}</text>`:''}`;
  }).join("");
  return `<div style="overflow-x:auto;margin-top:8px"><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${bars}</svg></div>
  <div class="flex small muted" style="gap:14px;margin-top:4px"><span><span class="sw" style="display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--good)"></span> in</span><span><span class="sw" style="display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--danger)"></span> out</span></div>`;
}
function yearBars(data){
  const max=Math.max(...data.map(d=>Math.max(d.income,d.expense)),1);
  const W=12*46,H=170;
  const bars=data.map((d,i)=>{
    const x=i*46+14;const ih=d.income/max*120;const eh=d.expense/max*120;
    return `<rect x="${x}" y="${140-ih}" width="14" height="${ih}" rx="3" fill="var(--good)"></rect>
            <rect x="${x+16}" y="${140-eh}" width="14" height="${eh}" rx="3" fill="var(--danger)"></rect>
            <text x="${x+15}" y="156" font-size="9" text-anchor="middle" fill="var(--ink-soft)">${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i]}</text>`;
  }).join("");
  return `<div style="overflow-x:auto;margin-top:10px"><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="min-width:100%">${bars}</svg></div>`;
}
function monthShort(mk){const m=+mk.split("-")[1];return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m-1]||mk;}
/* compact IDR for chart labels — rb=ribu, jt=juta, M=miliar */
function moneyShort(n){
  const sym=(state.settings||{}).currency||'Rp'; const v=Math.abs(+n||0); const sign=(+n||0)<0?'-':'';
  let out;
  if(v>=1e9) out=(v/1e9).toFixed(v>=1e10?0:1).replace(/\.0$/,'').replace('.',',')+' M';
  else if(v>=1e6) out=(v/1e6).toFixed(v>=1e7?0:1).replace(/\.0$/,'').replace('.',',')+' jt';
  else if(v>=1e3) out=Math.round(v/1e3)+' rb';
  else out=String(Math.round(v));
  return `${sign}${sym} ${out}`;
}
/* grouped in/out bars across N months (analytics) */
function trendBars(data){
  if(!data.some(d=>d.income||d.expense)) return emptyState("📈","No data yet","Add entries to see the trend.");
  const max=Math.max(...data.map(d=>Math.max(d.income,d.expense)),1);
  const step=Math.max(40,Math.min(56,Math.round(560/data.length))); const W=data.length*step,H=176;
  const bars=data.map((d,i)=>{
    const x=i*step+step*0.16;const bw=step*0.3;const ih=d.income/max*120;const eh=d.expense/max*120;
    return `<rect x="${x}" y="${140-ih}" width="${bw}" height="${ih}" rx="3" fill="var(--good)"></rect>
            <rect x="${x+bw+3}" y="${140-eh}" width="${bw}" height="${eh}" rx="3" fill="var(--danger)"></rect>
            <text x="${x+bw+1.5}" y="156" font-size="9.5" text-anchor="middle" fill="var(--ink-soft)">${monthShort(d.mk)}</text>`;
  }).join("");
  return `<div style="overflow-x:auto;margin-top:10px"><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="min-width:100%">${bars}</svg></div>
    <div class="flex small muted" style="gap:14px;margin-top:4px"><span><span class="sw" style="display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--good)"></span> in</span><span><span class="sw" style="display:inline-block;width:10px;height:10px;border-radius:3px;background:var(--danger)"></span> out</span></div>`;
}
/* simple area+line chart for a single series [{mk,bal}] */
function lineChart(points){
  if(!points||points.length<2) return emptyState("📉","Not enough history","Log across a few months to see the trend.");
  const vals=points.map(p=>p.bal); const min=Math.min(...vals,0); const max=Math.max(...vals,1);
  const span=(max-min)||1; const pad=12,H=150,base=H-30;
  const step=Math.max(46,Math.min(70,Math.round(540/(points.length-1)))); const W=Math.max((points.length-1)*step+pad*2,220);
  const X=i=>pad+i*((W-2*pad)/(points.length-1));
  const Y=v=>10+(1-(v-min)/span)*(base-10);
  const line=points.map((p,i)=>`${X(i).toFixed(1)},${Y(p.bal).toFixed(1)}`).join(" ");
  const area=`${pad},${base} ${line} ${(W-pad).toFixed(1)},${base}`;
  const dots=points.map((p,i)=>`<circle cx="${X(i).toFixed(1)}" cy="${Y(p.bal).toFixed(1)}" r="3" fill="var(--brand)"/>`).join("");
  const labels=points.map((p,i)=>`<text x="${X(i).toFixed(1)}" y="${H-12}" font-size="9.5" text-anchor="middle" fill="var(--ink-soft)">${monthShort(p.mk)}</text>`).join("");
  return `<div style="overflow-x:auto;margin-top:8px"><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="min-width:100%">
      <polygon points="${area}" fill="var(--brand-soft)" opacity=".55"></polygon>
      <polyline points="${line}" fill="none" stroke="var(--brand)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"></polyline>
      ${dots}${labels}
    </svg></div>
    <div class="flex small muted" style="justify-content:space-between;margin-top:2px"><span>${monthShort(points[0].mk)}: ${moneyShort(points[0].bal)}</span><span>Now: <b style="color:var(--ink)">${moneyShort(points[points.length-1].bal)}</b></span></div>`;
}

/* ---------- Monetra-style Home blocks ---------- */
function mcard(ico,label,val,badge){
  return `<div class="mcard"><div class="mtop"><span class="mico">${ico}</span>${badge||''}</div><div class="ml">${label}</div><div class="mv">${val}</div></div>`;
}
function mbadge(pc,goodWhenUp){
  if(pc===null||pc===undefined) return `<span class="mbadge flat">–</span>`;
  const up=pc>=0, good=goodWhenUp?up:!up;
  return `<span class="mbadge ${good?'up':'down'}">${up?'▲':'▼'} ${Math.abs(pc)}%</span>`;
}
function homeMetrics(t,pt,balance,ytdNet){
  const pc=(cur,prev)=> (!prev ? null : Math.round((cur-prev)/Math.abs(prev)*100));
  const balBadge=`<span class="mbadge ${ytdNet>=0?'up':'down'}">${ytdNet>=0?'▲':'▼'} YTD</span>`;
  const _today=todayISO();
  const needPay=state.transactions.filter(x=>x.type==='expense' && (x.date||'').slice(0,10) > _today).reduce((s,x)=>s+(+x.amount||0),0);
  const cards=[];
  // Current balance always shows — it's the headline number and 0 is a real value.
  cards.push(mcard('💰','Current balance',money(balance),balBadge));
  // Only surface "need to be paid" when there is actually a future-dated expense (fixes empty "Rp" card).
  if(needPay>0) cards.push(mcard('💸','Need to be paid',money(needPay),''));
  // Income / expenses: show the real number; skip entirely when both are empty this month.
  if(t.income>0||t.expense>0){
    cards.push(mcard('📈','Income this month',money(t.income),mbadge(pc(t.income,pt.income),true)));
    cards.push(mcard('🧾','Expenses this month',money(t.expense),mbadge(pc(t.expense,pt.expense),false)));
  }
  return `<div class="metrics mb">${cards.join("")}</div>`;
}
function accountsCard(){
  if(!hasAccounts())return "";
  const rows=(state.accounts||[]).map(a=>{
    const idr=(+a.amount||0)*(a.currency==="EUR"?eurRate():1);
    const sub=a.currency==="EUR"?`€${(+a.amount||0).toLocaleString('id-ID')} → `:"";
    return `<button class="flex" data-acctview="${a.id}" style="width:100%;text-align:left;padding:9px 0;border-bottom:1px solid var(--line);cursor:pointer;background:none"><div>${esc(a.name)} <span class="muted" style="font-weight:400">›</span></div><div class="right">${sub}${money(idr)}</div></button>`;
  }).join("");
  return `<div class="card mb"><div class="flex"><h3>Accounts · real cash</h3><button class="btn sm secondary right" data-act="editAccounts">Edit</button></div>
    <div class="mt">${rows}</div>
    <div class="flex" style="padding-top:8px;font-weight:700"><div>Total</div><div class="right">${money(accountsTotalIDR())}</div></div>
    <div class="small muted mt">EUR rate ${eurRate().toLocaleString('id-ID')} · tap Edit to update</div></div>`;
}
function homeCashflow(){
  const yr=new Date().getFullYear();
  const M=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const data=M.map((lbl,m)=>({lbl,val:monthTotals(`${yr}-${String(m+1).padStart(2,'0')}`).expense}));
  const max=Math.max(...data.map(d=>d.val),1);
  const peak=data.reduce((a,d,i)=>d.val>data[a].val?i:a,0);
  const totalYr=sum(data,d=>d.val);
  const bars=data.map((d,i)=>`<div class="cfbar ${i===peak&&d.val>0?'hi':''}">${d.val>0?`<div class="cftip">${money(d.val)}</div>`:''}<i style="height:${d.val>0?Math.max(4,Math.round(d.val/max*100)):0}%"></i><span class="cfm">${d.lbl}</span></div>`).join("");
  return `<div class="card mb">
    <div class="cfhead"><div><h3>Cash flow</h3><div class="sub">Spending per month · ${yr}</div></div><div class="cfbig">${money(totalYr)}</div></div>
    <div class="cfbars">${bars}</div>
  </div>`;
}
/* ===================== EVENTS ===================== */
function afterRender(){
  // category budget inputs
  $$(".catbudget").forEach(inp=>inp.addEventListener("change",e=>{
    const c=state.categories.find(x=>x.id===e.target.dataset.cat);if(c){c.budget=+e.target.value||0;touch(c);save();}
  }));
  // Add page: type segment (in-place, keeps the amount typed), category cascade, tag chips
  const tSeg=$("#typeSeg");
  if(tSeg){
    const eiF=$("#eiFields"), tfF=$("#tfFields");
    const syncAddChild=()=>{
      const p=$("#txCatParent"), cc=$("#txCatChild"); if(!p||!cc) return;
      const kids=childCats(p.value);
      cc.innerHTML=`<option value="">${kids.length?'— optional —':'— none —'}</option>`+kids.map(c=>`<option value="${c.id}">${c.emoji} ${esc(c.name)}</option>`).join("");
      cc.disabled=!kids.length;
    };
    tSeg.querySelectorAll("[data-type]").forEach(b=>b.addEventListener("click",ev=>{
      ev.stopPropagation();                 // don't let the global [data-type] handler force a full re-render
      addType=b.dataset.type;
      tSeg.querySelectorAll("[data-type]").forEach(x=>x.className=x.dataset.type===addType?(addType==='expense'?'on exp':addType==='income'?'on inc':'on tf'):'');
      const isTf=addType==='transfer';
      if(eiF)eiF.style.display=isTf?'none':'';
      if(tfF)tfF.style.display=isTf?'':'none';
      if(!isTf){const p=$("#txCatParent");if(p){p.innerHTML=topCats(addType).map(c=>`<option value="${c.id}">${c.emoji} ${esc(c.name)}</option>`).join("");syncAddChild();}}
    }));
    const apc=$("#txCatParent"); if(apc) apc.addEventListener("change",syncAddChild);
    const asug=$("#txTagSug");
    if(asug) asug.addEventListener("click",ev=>{
      const b=ev.target.closest("[data-tag]"); if(!b) return;
      ev.stopPropagation();
      const inp=$("#txTags"); if(!inp) return;
      const cur=inp.value.split(/[,]/).map(s=>s.trim()).filter(Boolean);
      if(!cur.includes(b.dataset.tag)){cur.push(b.dataset.tag); inp.value=cur.join(", ");}
      b.classList.toggle("on");
      inp.focus();
    });
  }
  const ms=$("#monthSel"); if(ms) ms.addEventListener("change",e=>{window.__selMonth=e.target.value;render();});
  const ys=$("#yearSel"); if(ys) ys.addEventListener("change",e=>{window.__selYear=e.target.value;render();});
  const rseg=$("#repSeg"); if(rseg) rseg.addEventListener("click",e=>{const b=e.target.closest("[data-rep]"); if(b){window.__repView=b.dataset.rep;render();}});
  const anaR=$("#anaRange"); if(anaR) anaR.addEventListener("click",e=>{const b=e.target.closest("[data-ana]"); if(b){window.__anaRange=+b.dataset.ana;render();}});
  // history: live filter + expandable rows
  if(route==="history"){
    const apply=()=>{
      const q=(($("#histSearch")||{}).value||"").toLowerCase().trim();
      const cat=(($("#histCat")||{}).value)||"";
      const month=(($("#histMonth")||{}).value)||"";
      const villa=(($("#histVilla")||{}).value)||"";
      const typ=window.__histType||"all";
      let n=0,inS=0,outS=0;
      $$(".hrow").forEach(r=>{
        const show=(!q||(r.dataset.s||"").includes(q))&&(!cat||r.dataset.cat===cat)&&(!month||r.dataset.mk===month)&&(!villa||r.dataset.villa===villa)&&(typ==="all"||r.dataset.tt===typ);
        r.classList.toggle("hide",!show);
        if(show){n++;const a=+r.dataset.amt||0;r.dataset.tt==="income"?inS+=a:outS+=a;}
      });
      $$(".hhdr").forEach(h=>{const any=$$('.hrow[data-mk="'+h.dataset.mk+'"]').some(r=>!r.classList.contains("hide"));h.classList.toggle("hide",!any);});
      const cnt=$("#histCount");if(cnt)cnt.textContent=n+(n===1?" entry":" entries");
      const sum=$("#histSum");if(sum)sum.innerHTML=`<span class="out">▼ out <b>${money(outS)}</b></span><span class="in">▲ in <b>${money(inS)}</b></span>`;
    };
    const se=$("#histSearch");if(se)se.addEventListener("input",apply);
    const ce=$("#histCat");if(ce)ce.addEventListener("change",apply);
    const me=$("#histMonth");if(me)me.addEventListener("change",apply);
    const ve=$("#histVilla");if(ve)ve.addEventListener("change",apply);
    const so=$("#histSort");if(so)so.addEventListener("change",e=>{window.__histSort=e.target.value;render();});
    const te=$("#histType");if(te)te.addEventListener("click",e=>{const b=e.target.closest("[data-ht]");if(!b)return;window.__histType=b.dataset.ht;$$("#histType button").forEach(x=>x.className=x===b?("on"+(b.dataset.ht==="income"?" inc":b.dataset.ht==="expense"?" exp":"")):"");apply();});
    $$(".hhead").forEach(h=>h.addEventListener("click",e=>{if(e.target.closest("[data-edittx]"))return;h.parentElement.classList.toggle("open");}));
    apply();
  }
  // invoice / statement scanner
  const dz=$("#dropzone");
  if(dz){
    const fi=$("#scanFile");
    dz.addEventListener("dragover",e=>{e.preventDefault();dz.classList.add("drag");});
    dz.addEventListener("dragleave",()=>dz.classList.remove("drag"));
    dz.addEventListener("drop",e=>{e.preventDefault();dz.classList.remove("drag");if(e.dataTransfer.files[0])handleScanFile(e.dataTransfer.files[0]);});
    fi.addEventListener("change",e=>{if(e.target.files[0])handleScanFile(e.target.files[0]);});
  }
}

/* ---------- Invoice / statement scanning ---------- */
function fileToScan(file){
  return new Promise((resolve,reject)=>{
    if((file.type||"").includes("pdf")){
      const r=new FileReader();
      r.onload=()=>resolve({data:String(r.result).split(",")[1],mime:"application/pdf"});
      r.onerror=reject;r.readAsDataURL(file);return;
    }
    const img=new Image();const url=URL.createObjectURL(file);
    img.onload=()=>{
      const max=1600;let w=img.width,h=img.height;
      if(w>max||h>max){const s=Math.min(max/w,max/h);w=Math.round(w*s);h=Math.round(h*s);}
      const c=document.createElement("canvas");c.width=w;c.height=h;
      c.getContext("2d").drawImage(img,0,0,w,h);
      const durl=c.toDataURL("image/jpeg",0.82);
      URL.revokeObjectURL(url);
      resolve({data:durl.split(",")[1],mime:"image/jpeg"});
    };
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Couldn’t read that image"));};
    img.src=url;
  });
}
async function handleScanFile(file){
  const st=$("#scanStatus");if(!st)return;
  if(file.size>15*1024*1024){st.innerHTML='<span class="pill bad">File too large</span> Try a phone photo instead of a big scan.';return;}
  st.innerHTML='<span class="scan-spin"></span> Reading your document… a few seconds.';
  try{
    const {data,mime}=await fileToScan(file);
    const r=await fetch("/financial/api/scan",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({image:data,mime})});
    const out=await r.json().catch(()=>({error:"Bad response"}));
    if(!r.ok) throw new Error(out.error||("Scan failed ("+r.status+")"));
    if(!out.items||!out.items.length){st.innerHTML='🤔 Couldn’t spot a clear payment. Try a sharper photo, or add it manually below.';return;}
    st.textContent="";
    openScanConfirm(out.items);
  }catch(e){
    st.innerHTML='<span class="pill bad">Couldn’t scan</span> '+esc(e.message||"Try again")+'. You can still add manually below.';
  }
}
function openScanConfirm(items){
  const rows=items.map((it,i)=>{
    const once=it.freq==="once";
    return `<div class="card" style="padding:12px;margin:0 0 10px">
      <label class="inline small"><input type="checkbox" class="sck" data-i="${i}" checked style="width:auto"/> Include <span class="tag">${esc(it.confidence||'')}</span></label>
      <div class="row mt">
        <div class="field" style="margin:0;flex:1.5"><label>Name</label><input class="sname" data-i="${i}" value="${esc(it.name)}"/></div>
        <div class="field" style="margin:0"><label>Amount</label><input class="samt" data-i="${i}" type="number" inputmode="decimal" value="${it.amount}"/></div>
      </div>
      <div class="row mt">
        <div class="field" style="margin:0"><label>Add as</label><select class="sas" data-i="${i}"><option value="bill" selected>Upcoming bill</option><option value="expense">Expense now</option></select></div>
        <div class="field" style="margin:0"><label>Type</label><select class="sfreq" data-i="${i}"><option value="monthly" ${once?'':'selected'}>Monthly</option><option value="once" ${once?'selected':''}>One-time</option></select></div>
        <div class="field" style="margin:0"><label>When</label>
          <input class="sday" data-i="${i}" type="number" min="1" max="31" value="${it.dueDay||1}" placeholder="day" style="${once?'display:none':''}"/>
          <input class="sdate" data-i="${i}" type="date" value="${it.dueDate||todayISO()}" style="${once?'':'display:none'}"/>
        </div>
      </div>
    </div>`;
  }).join("");
  openModal(`<h3>Found ${items.length} item${items.length>1?'s':''} 🧾</h3>
    <p class="small muted">Check the details, choose <b>bill</b> (to pay later) or <b>expense</b> (already spent), edit anything, then add.</p>${rows}
    <button class="btn" id="scanAdd">Add selected</button>`);
  const syncRow=i=>{
    const asExp=$(`#modal .sas[data-i="${i}"]`).value==="expense";
    const once=$(`#modal .sfreq[data-i="${i}"]`).value==="once";
    // an expense is always a one-time dated entry → force the date picker, hide monthly day
    const freqSel=$(`#modal .sfreq[data-i="${i}"]`); freqSel.disabled=asExp;
    const showDate=asExp||once;
    $(`#modal .sday[data-i="${i}"]`).style.display=showDate?"none":"";
    $(`#modal .sdate[data-i="${i}"]`).style.display=showDate?"":"none";
  };
  $$("#modal .sfreq").forEach(sel=>sel.addEventListener("change",e=>syncRow(e.target.dataset.i)));
  $$("#modal .sas").forEach(sel=>sel.addEventListener("change",e=>syncRow(e.target.dataset.i)));
  $("#scanAdd").onclick=()=>{
    let bills=0,exps=0;
    $$("#modal .sck").forEach(ck=>{
      if(!ck.checked)return;const i=ck.dataset.i;
      const name=$(`#modal .sname[data-i="${i}"]`).value.trim();
      const amount=+$(`#modal .samt[data-i="${i}"]`).value;
      if(!name||!amount)return;
      const as=$(`#modal .sas[data-i="${i}"]`).value;
      if(as==="expense"){
        // log as an expense transaction (category "Other"; no bank-account link → balance untouched, editable later)
        const date=($(`#modal .sfreq[data-i="${i}"]`).value==="once"?$(`#modal .sdate[data-i="${i}"]`).value:"")||todayISO();
        state.transactions.push({id:uid(),date,type:"expense",amount,catId:"other",note:name,tags:[],_m:stampNow()});
        exps++;
      }else{
        const freq=$(`#modal .sfreq[data-i="${i}"]`).value;
        const bill={id:uid(),name,amount,freq,paid:{},_m:stampNow()};
        if(freq==="once"){bill.dueDate=$(`#modal .sdate[data-i="${i}"]`).value||todayISO();bill.paidOnce=false;}
        else{bill.dueDay=clamp(+$(`#modal .sday[data-i="${i}"]`).value||1,1,31);}
        state.bills.push(bill);bills++;
      }
    });
    save();closeModal();render();
    toast(`${bills?bills+" bill"+(bills>1?"s":""):""}${bills&&exps?" · ":""}${exps?exps+" expense"+(exps>1?"s":""):""} added ✓`.trim()||"Nothing added");
  };
}
