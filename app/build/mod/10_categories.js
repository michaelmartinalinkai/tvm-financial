function Tags(){
  const tags=allTags();
  const rows=tags.map(g=>{const txs=state.transactions.filter(t=>(t.tags||[]).includes(g));return {g,count:txs.length,spend:sum(txs.filter(t=>t.type==="expense"),t=>+t.amount)};}).sort((a,b)=>b.spend-a.spend);
  return `
  <div class="page-head"><h2>Tags 🏷️</h2><p>Labels you've added to transactions — tap to see them.</p></div>
  <div class="card">${tags.length?`<div class="list">${rows.map(r=>`<div class="tx-line" style="cursor:pointer" onclick="if(window.__hf){window.__hf.tag='${esc(r.g)}';}go('history')"><div class="tx-ic">🏷️</div><div class="tx-main"><div class="tx-t">#${esc(r.g)}</div><div class="tx-s">${r.count} transaction${r.count===1?"":"s"}</div></div><div class="tx-amt exp">${money(r.spend)}</div></div>`).join("")}</div>`:emptyState("🏷️","No tags yet","Add tags to a transaction in the Add page, then they'll show here.")}</div>`;
}
function Cats(){
  const trackers=state.categories.filter(isTracker);
  const allByCat={}, countByCat={};
  state.transactions.forEach(t=>{allByCat[t.catId]=(allByCat[t.catId]||0)+ +t.amount;countByCat[t.catId]=(countByCat[t.catId]||0)+1;});
  const tot=id=>allByCat[id]||0, cnt=id=>countByCat[id]||0;
  const kidsOf=id=>childCats(id).filter(c=>!isTracker(c));
  const rollup=id=>{const ks=kidsOf(id);return tot(id)+sum(ks,k=>tot(k.id));};
  const rollupN=id=>{const ks=kidsOf(id);return cnt(id)+sum(ks,k=>cnt(k.id));};
  const rendered=new Set();

  const trackerCard=(c)=>{
    if(c.ledger){
      const {inc,exp,net}=ledgerTotals(c);
      return `<button class="item" data-catview="${c.id}" style="width:100%;text-align:left;cursor:pointer">
        <div class="emoji">${c.emoji}</div>
        <div class="main"><div class="t">${esc(c.name)}</div>
        <div class="s">In ${money(inc,c.cur)} · Out ${money(exp,c.cur)} · Net ${money(net,c.cur)}</div></div>
        <div class="amt ${net>=0?'inc':'exp'}">${net>=0?'+':'−'}</div></button>`;
    }
    const paid=sum(catTx(c.id),t=>+t.amount); const rem=(+c.target)-paid;
    const pct=+c.target>0?clamp(Math.round(paid/c.target*100),0,100):0;
    const recvL=c.type==="income"?"Received":"Paid"; const leftL=c.type==="income"?"Outstanding":"Remaining";
    return `<button class="item" data-catview="${c.id}" style="width:100%;text-align:left;cursor:pointer">
      <div class="emoji">${c.emoji}</div>
      <div class="main"><div class="t">${esc(c.name)}</div>
      <div class="s">${recvL} ${money(paid,c.cur)} of ${money(c.target,c.cur)} · ${leftL} ${money(rem,c.cur)}</div>
      <div class="bar mt ${pct>=100?'':'warn'}"><i style="width:${pct}%"></i></div></div>
      <div class="amt">${pct}%</div></button>`;
  };

  /* A subcategory (or ungrouped) row: clickable drill-in + edit/delete */
  const subRow=(c)=>{rendered.add(c.id); const n=cnt(c.id);
    return `<div class="item" style="margin-left:14px">
      <div data-catview="${c.id}" style="flex:1;min-width:0;display:flex;align-items:center;gap:12px;cursor:pointer">
        <div class="emoji">${c.emoji}</div>
        <div class="main"><div class="t">${esc(c.name)}</div>
        <div class="s">${n} ${n===1?'entry':'entries'} · ${money(tot(c.id))}</div></div></div>
      <button class="x" title="Edit" onclick="catEdit('${c.id}')">✎</button>
      <button class="x" title="Delete" onclick="catDelete('${c.id}')">🗑️</button></div>`;
  };

  /* A top-level category: header with rollup + nested subcategories */
  const parentCard=(c)=>{rendered.add(c.id); const ks=kidsOf(c.id); const n=rollupN(c.id);
    const subs=ks.length?ks.map(subRow).join("")
      :`<div class="small muted" style="margin-left:14px;padding:4px 0">No subcategories yet.</div>`;
    return `<div class="card mb">
      <div class="item" style="border:none;padding:0;background:none">
        <div data-catview="${c.id}" style="flex:1;min-width:0;display:flex;align-items:center;gap:12px;cursor:pointer">
          <div class="emoji">${c.emoji}</div>
          <div class="main"><div class="t">${esc(c.name)} <span class="tag">${c.type}</span></div>
          <div class="s">${money(rollup(c.id))} total · ${n} ${n===1?'entry':'entries'}${ks.length?' (incl. subs)':''}</div></div></div>
        <button class="x" title="Edit" onclick="catEdit('${c.id}')">✎</button>
        <button class="x" title="Delete" onclick="catDelete('${c.id}')">🗑️</button></div>
      <div class="list mt" style="border-left:2px solid var(--line);padding-left:8px">${subs}
        <button class="btn sm secondary" style="margin-top:8px" onclick="catAddSub('${c.id}')">＋ Add subcategory</button></div>
    </div>`;
  };

  const group=(type,label)=>{
    const tops=topCats(type).filter(c=>!isTracker(c));
    if(!tops.length) return "";
    return `<h3 style="margin:16px 2px 8px">${label}</h3>${tops.map(parentCard).join("")}`;
  };

  const expSec=group('expense','Expense categories');
  const incSec=group('income','Income categories');
  /* Anything left (e.g. a subcategory whose parent is a tracker or was removed) — never lose it */
  const orphans=state.categories.filter(c=>!isTracker(c)&&!rendered.has(c.id));
  const orphanSec=orphans.length?`<div class="card mb"><h3>Other</h3><div class="list mt">${orphans.map(subRow).join("")}</div></div>`:"";
  const anyNormal=expSec||incSec||orphans.length;

  return `
  <div class="page-head"><h2>Categories 📂</h2><p>Main categories with their subcategories nested beneath. Tap any to see all its transactions.</p></div>
  ${trackers.length?`<div class="card mb"><div class="flex"><h3>Trackers</h3></div>
    <div class="sub">Contracts, balances and ledgers — kept separate from your monthly cashflow.</div>
    <div class="list mt">${trackers.map(trackerCard).join("")}</div></div>`:""}
  <div class="flex" style="margin:4px 2px 0"><h3>Categories</h3><button class="btn sm secondary right" data-act="addCat">＋ Add category</button></div>
  ${anyNormal?`${expSec}${incSec}${orphanSec}`:`<div class="card">${emptyState("📂","No categories","Add one to get started.")}</div>`}`;
}

function CatView(){
  const c=catById(selCat);
  if(!c) return `<button class="btn sm secondary mb" data-go="cats">‹ All categories</button>
    <div class="card">${emptyState("📂","Category not found","It may have been deleted.")}</div>`;
  const kids=childCats(selCat); const tracker=isTracker(c);
  const ids=[selCat,...kids.map(k=>k.id)];
  const tx=kids.length
    ? state.transactions.filter(t=>ids.includes(t.catId)).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id))
    : catTx(selCat);
  const paid=sum(tx,t=>+t.amount);
  const parent=catParentOf(selCat);
  const subtitle=c.ledger?'Ledger — money in and out'
    :tracker?'Payment tracker'
    :`${c.type==='income'?'Income':'Expense'} category${kids.length?` · ${kids.length} subcategor${kids.length===1?'y':'ies'}`:''}${parent?` · under ${esc(parent.name)}`:''}`;
  const head=`<button class="btn sm secondary mb" data-go="cats">‹ All categories</button>
    <div class="page-head"><h2>${c.emoji} ${esc(c.name)}</h2><p>${subtitle}.</p>
    <div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn sm secondary" onclick="catEdit('${c.id}')">✎ Edit</button>
      ${tracker?'':`<button class="btn sm secondary" onclick="catAddSub('${c.id}')">＋ Subcategory</button>`}
      <button class="btn sm secondary" onclick="catDelete('${c.id}')">🗑️ Delete</button></div></div>`;
  let summary="";
  if(c.ledger){
    const {inc,exp,net}=ledgerTotals(c);
    summary=`<div class="grid three mb">
      ${kpi("Money in",money(inc,c.cur),"📥","good")}
      ${kpi("Money out",money(exp,c.cur),"📤","bad")}
      ${kpi("Net",money(net,c.cur),net>=0?"🟢":"🔴",net>=0?'good':'bad')}
    </div>`;
  } else if(tracker){
    const rem=(+c.target)-paid; const pct=+c.target>0?clamp(Math.round(paid/c.target*100),0,100):0;
    const recvL=c.type==="income"?"Received":"Paid"; const leftL=c.type==="income"?"Outstanding":"Remaining";
    summary=`<div class="grid three mb">
      ${kpi("Total "+(c.type==='income'?'contract':'payable'),money(c.target,c.cur),"📄")}
      ${kpi(recvL,money(paid,c.cur),"✅","good")}
      ${kpi(leftL,money(rem,c.cur),rem<=0?"🎉":"⏳",rem<=0?'good':'bad')}
    </div>
    <div class="card mb"><div class="bar ${pct>=100?'':'warn'}"><i style="width:${pct}%"></i></div>
      <div class="small muted" style="margin-top:8px">${pct}% ${c.type==='income'?'received':'paid'}${rem>0?` · ${money(rem,c.cur)} to go`:' · complete 🎉'}</div></div>`;
  } else if(kids.length){
    /* Parent rollup: total across itself + children, and a per-subcategory breakdown */
    const brk=[{id:selCat,name:esc(c.name)+' <span class="tag">direct</span>',emoji:c.emoji},
      ...kids.map(k=>({id:k.id,name:esc(k.name),emoji:k.emoji}))]
      .map(r=>{const rt=sum(tx.filter(t=>t.catId===r.id),t=>+t.amount); const rn=tx.filter(t=>t.catId===r.id).length;
        return `<div class="item"><div class="emoji">${r.emoji}</div>
          <div class="main"><div class="t">${r.name}</div><div class="s">${rn} ${rn===1?'entry':'entries'}</div></div>
          <div class="amt ${c.type==='income'?'inc':'exp'}">${money(rt)}</div></div>`;}).join("");
    summary=`<div class="grid three mb">
      ${kpi("Total",money(paid),c.type==='income'?'📥':'📤',c.type==='income'?'good':'bad')}
      ${kpi("Subcategories",String(kids.length),"🗂️")}
      ${kpi("Entries",String(tx.length),"🧾")}
    </div>
    <div class="card mb"><div class="flex"><h3>By subcategory</h3></div><div class="list mt">${brk}</div></div>`;
  }
  const list=tx.length? tx.slice().reverse().map(t=>{
      const own=catById(t.catId); const tt=c.ledger?t.type:((own||c).type);
      const isChild=kids.length&&own&&own.id!==c.id;
      const lbl=esc(t.note)||(isChild?esc(own.name):(tracker&&!c.ledger?'Payment':c.name));
      return `<div class="item">
      <div class="main"><div class="t">${lbl}</div><div class="s">${prettyDate(t.date)}${isChild?` · ${esc(own.name)}`:''}</div></div>
      <div class="amt ${tt==='income'?'inc':'exp'}">${tt==='income'?'+':'−'}${money(t.amount,c.cur)}</div>
      <button class="x" data-edittx="${t.id}">✎</button></div>`;}).join("")
    : emptyState("🗒️","No transactions yet","Add the first one below.");
  return `${head}${summary}
    <div class="card"><div class="flex"><h3>${tracker&&!c.ledger?'Payments':'Transactions'} (${tx.length})</h3>
      <button class="btn sm secondary right" data-addcattx="${c.id}">＋ Add ${tracker&&!c.ledger?'payment':'entry'}</button></div>
      <div class="list mt">${list}</div></div>`;
}

/* ---------- Category create / edit / delete (called via inline onclick from Cats & CatView) ---------- */
function catAddSub(parentId){
  const p=catById(parentId); if(!p) return toast("Category not found");
  openModal(`<h3>New subcategory</h3>
    <div class="sub">Under <b>${esc(p.name)}</b> · ${p.type}</div>
    <div class="row"><div class="field" style="flex:2"><label>Name</label><input id="scName" placeholder="e.g. Groceries" autofocus/></div>
    <div class="field"><label>Emoji</label><input id="scEmoji" placeholder="📦" maxlength="2"/></div></div>
    <button class="btn" id="scSave">Add subcategory</button>`);
  $("#scSave").onclick=()=>{
    const name=$("#scName").value.trim(); if(!name) return toast("Name needed");
    state.categories.push({id:uid(),name,emoji:($("#scEmoji").value||"📦").trim(),type:p.type,parentId:p.id,budget:0,_m:stampNow()});
    save();closeModal();render();toast("Subcategory added ✓");
  };
}
function catEdit(id){
  const c=catById(id); if(!c) return toast("Category not found");
  const parent=catParentOf(id);
  openModal(`<h3>Edit category ✎</h3>
    ${parent?`<div class="sub">Subcategory of <b>${esc(parent.name)}</b></div>`:''}
    <div class="row"><div class="field" style="flex:2"><label>Name</label><input id="ecName" value="${esc(c.name)}" autofocus/></div>
    <div class="field"><label>Emoji</label><input id="ecEmoji" value="${esc(c.emoji||'')}" maxlength="2"/></div></div>
    <button class="btn" id="ecSave">Save</button>`);
  $("#ecSave").onclick=()=>{
    const name=$("#ecName").value.trim(); if(!name) return toast("Name needed");
    c.name=name; c.emoji=($("#ecEmoji").value||c.emoji||"📦").trim(); c._m=stampNow();
    save();closeModal();render();toast("Saved ✓");
  };
}
function catDelete(id){
  const c=catById(id); if(!c) return toast("Category not found");
  const kids=childCats(id);
  const ownTx=state.transactions.filter(t=>t.catId===id);
  const promote=()=>{kids.forEach(k=>{delete k.parentId; k._m=stampNow();});};
  const removeCat=()=>{tomb(id); state.categories=state.categories.filter(x=>x.id!==id);};
  const finish=()=>{save();closeModal();if(selCat===id)go("cats");else render();};
  if(!ownTx.length){
    openModal(`<h3>Delete “${esc(c.name)}”?</h3>
      <p class="small muted">${kids.length?`Its ${kids.length} subcategor${kids.length===1?'y':'ies'} will move up to top-level (not deleted). `:''}This can't be undone.</p>
      <div class="flex mt"><button class="btn danger" id="dcYes">Delete</button><button class="btn secondary" id="dcNo">Cancel</button></div>`);
    $("#dcYes").onclick=()=>{promote();removeCat();finish();toast("Deleted");};
    $("#dcNo").onclick=closeModal;
    return;
  }
  /* Has transactions → block a plain delete; require reassigning them first */
  const targets=state.categories.filter(x=>x.id!==id && x.type===c.type);
  const opts=targets.map(x=>`<option value="${x.id}">${esc((catParentOf(x.id)?'↳ ':'')+x.name)}</option>`).join("");
  openModal(`<h3>“${esc(c.name)}” has ${ownTx.length} transaction${ownTx.length===1?'':'s'}</h3>
    <p class="small muted">Move ${ownTx.length===1?'it':'them'} to another ${c.type} category, then delete.${kids.length?` Its ${kids.length} subcategor${kids.length===1?'y moves':'ies move'} up to top-level.`:''}</p>
    ${targets.length?`<div class="field"><label>Move transactions to</label><select id="dcTo">${opts}</select></div>
      <div class="flex mt"><button class="btn danger" id="dcMove">Move & delete</button><button class="btn secondary" id="dcNo">Cancel</button></div>`
      :`<p class="small muted">There's no other ${c.type} category to move them to — create one first, then this category can be deleted.</p>
        <div class="flex mt"><button class="btn secondary" id="dcNo">OK</button></div>`}`);
  if(targets.length){
    $("#dcMove").onclick=()=>{
      const to=$("#dcTo").value; if(!to) return;
      state.transactions.forEach(t=>{if(t.catId===id){t.catId=to; t._m=stampNow();}});
      promote();removeCat();finish();toast(`Moved ${ownTx.length} & deleted`);
    };
  }
  $("#dcNo").onclick=closeModal;
}

/* ---------- VILLA DETAIL (drill-down from Business / Reports) ---------- */
