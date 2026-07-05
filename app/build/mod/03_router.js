function go(id){ route=id; render(); window.scrollTo({top:0,behavior:"smooth"}); }

function buildNav(){
  // side
  let html="",lastGrp=null;
  PAGES.forEach(p=>{
    if(p.grp!==lastGrp){ if(p.grp) html+=`<div class="nav-group">${p.grp}</div>`; lastGrp=p.grp; }
    html+=`<button class="nav-item ${route===p.id?'active':''}" data-go="${p.id}"><span class="ic">${p.icon}</span>${p.label}</button>`;
  });
  $("#sideNav").innerHTML=html;
  // mobile
  const mob=MOBILE_NAV.map(id=>{
    if(id==="more"){return `<button data-more="1" class="${['furniture','bills','goals','debts','cats','catview','villaview','acctview','month','year','setup','backup'].includes(route)?'active':''}"><span class="ic">☰</span>More</button>`;}
    const p=PAGES.find(x=>x.id===id);
    return `<button data-go="${id}" class="${route===id?'active':''}"><span class="ic">${p.icon}</span>${p.short||p.label}</button>`;
  }).join("");
  $("#mobNav").innerHTML=mob;
}

/* ===================== RENDER ===================== */
function render(){
  buildNav();
  const c=$("#content");
  const fn={home:Home,sheet:SheetPage,add:AddPage,history:History,reports:Reports,accounts:Accounts,tags:Tags,bills:Bills,goals:Goals,debts:Debts,cats:Cats,catview:CatView,biz:Biz,villaview:VillaView,acctview:AcctView,furniture:Furniture,dash:Reports,month:Reports,year:Reports,setup:Setup,backup:Backup}[route]||Home;
  c.innerHTML=`<div class="page">${fn()}</div>`;
  afterRender();
}

/* ---------- GOOGLE SHEET ---------- */