
/* =====================================================================
   TRUE CRIME CALENDAR · lógica de la interfaz
   ===================================================================== */
const GROUPS = {
  angeles:"Ángeles de la muerte", envenenadoras:"Envenenadoras", freeway:"Freeway Killers",
  andes:"Andes", urss:"Antigua URSS", weimar:"Alemania entreguerras", londres:"Londres",
  mataviejas:"Mataviejas", nobles:"Aristócratas", espana:"España", argentina:"Argentina",
  sin_resolver:"Sin resolver", golpes:"Grandes golpes", estafas:"Estafas", desapariciones:"Desapariciones",
  sectas:"Sectas", errores_judiciales:"Errores judiciales", hispanoamerica:"Hispanoamérica"
};
const grpName = g => GROUPS[g] || String(g).replace(/_/g," ").replace(/^./,c=>c.toUpperCase());
/* Qué se conmemora: tipo_efemeride de los casos nuevos (los 100 estrella, nacimiento) */
const EFEM = {
  nacimiento:{lab:"Nacimiento", de:"del nacimiento"}, crimen:{lab:"Crimen", de:"del crimen"},
  detencion:{lab:"Detención", de:"de la detención"}, condena:{lab:"Condena", de:"de la condena"},
  hallazgo:{lab:"Hallazgo", de:"del hallazgo"}, desaparicion:{lab:"Desaparición", de:"de la desaparición"},
  golpe:{lab:"Golpe", de:"del golpe"}
};
const WOMEN = new Set(["letby","puente","ishikawa","wuornos","toppan","homolka","beck","murano","jones","hindley","bathory","cotton","doss","gilbert","rwest","barraza"]);
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const MES3 = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
const pad = n => String(n).padStart(2,"0");
const isLeap = y => (y%4===0 && y%100!==0) || y%400===0;
const RM = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : {matches:false};
const reduced = () => RM.matches;
function hashId(s){ let h=2166136261; for(const c of String(s)){ h^=c.charCodeAt(0); h=Math.imul(h,16777619); } return h>>>0; }
/* pequeña imperfección determinista (rotaciones, desplazamientos) */
const jitter = (seed,amp) => ((hashId(seed)%1000)/1000*2-1)*amp;

/* ---------- Sonidos del cuaderno: abrir/cerrar carpeta y pasar página ----------
   Se decodifican al arrancar y solo suenan tras un toque del usuario (nunca a destiempo,
   por ejemplo al abrir un expediente desde una notificación). */
const SFX=(()=>{
  const FILES={open:["sfx/carpeta-abrir.ogg"],close:["sfx/carpeta-cerrar.ogg"],page:["sfx/pagina-1.ogg","sfx/pagina-2.ogg","sfx/pagina-3.ogg"]};
  let on=true; try{ on=localStorage.getItem("tcc_sfx")!=="0"; }catch(_){}
  const AC=window.AudioContext||window.webkitAudioContext;
  let ctx=null; try{ if(AC) ctx=new AC(); }catch(_){ ctx=null; }
  const buf={}, last={};
  if(ctx){
    Object.entries(FILES).forEach(([k,list])=>{ buf[k]=[];
      list.forEach(u=>fetch(u).then(r=>r.ok?r.arrayBuffer():Promise.reject(r.status))
        .then(a=>ctx.decodeAudioData(a)).then(b=>buf[k].push(b)).catch(()=>{})); });
    const unlock=()=>{ if(ctx.state!=="running") ctx.resume().catch(()=>{}); };
    ["pointerdown","touchstart","keydown"].forEach(t=>addEventListener(t,unlock,{capture:true,passive:true}));
  }
  function play(k){
    if(!on||!ctx) return;
    const list=buf[k]; if(!list||!list.length) return;
    const gesture=!navigator.userActivation||navigator.userActivation.isActive;
    if(ctx.state!=="running"){ if(!gesture) return; ctx.resume().catch(()=>{}); }
    const now=ctx.currentTime;
    if(last[k]&&now-last[k]<0.12) return;          // sin ráfagas al pasar muchas páginas seguidas
    last[k]=now;
    let vol=0.6; try{ if(PS.playing) vol=0.35; }catch(_){}  // más bajo si suena un podcast
    const src=ctx.createBufferSource(), g=ctx.createGain();
    src.buffer=list[Math.floor(Math.random()*list.length)];
    src.playbackRate.value=0.9+Math.random()*0.08;   // un poco más grave y cada vez algo distinto
    g.gain.value=vol; src.connect(g).connect(ctx.destination); src.start();
  }
  return {play, get on(){ return on; }, set on(v){ on=!!v; try{ localStorage.setItem("tcc_sfx",on?"1":"0"); }catch(_){} }};
})();

/* ---------- Puente con Android ---------- */
const NATIVE = (typeof window.TCCNative==="object" || typeof window.TCCNative==="function") && window.TCCNative ? window.TCCNative : null;
function nat(method,...args){
  if(!NATIVE) return undefined;
  try{ if(typeof NATIVE[method]==="function") return NATIVE[method](...args); }
  catch(err){ console.warn("TCCNative."+method+" ha fallado:",err); }
  return undefined;
}
function parseMaybe(v){ if(v==null) return null; if(typeof v==="string"){ try{ return JSON.parse(v); }catch(_){ return null; } } return typeof v==="object"?v:null; }

/* ---------- Datos ---------- */
const FUENTES_ = (typeof FUENTES!=="undefined" && FUENTES && typeof FUENTES==="object") ? FUENTES : {};
D.sort((a,b)=>a.m-b.m || a.d-b.d || a.y-b.y);
const BY = {};
D.forEach((e,i)=>{
  e.i=i; e.g=Array.isArray(e.g)?e.g:[]; e.links=[]; e.loc=Array.isArray(e.loc)?e.loc:[];
  ["n","a","v","p","per","st","c","mo"].forEach(k=>{ if(e[k]==null) e[k]=""; });
  e.e = e.estrella!==false;                                        // los 100 de la v3 son estrella
  const t=norm(e.tipo_efemeride||"").replace(/[^a-z]/g,""); e.t = EFEM[t] ? t : "nacimiento";
  const sx=norm(e.sexo||"");
  e.w = WOMEN.has(e.id) || /^(m|f|mujer|femenino)$/.test(sx);
  e.sx = e.e || !!sx;                                               // ¿se conoce el sexo del protagonista?
  /* vc: el nombre del expediente no es el del autor (la víctima o el propio caso, p. ej. la Dalia Negra) */
  e.vc = !!(e.autor && norm(e.autor).trim()!==norm(e.n).trim());
  e.title = e.vc ? (e.titulo_caso||e.n) : e.n;                      // nombre grande de fichas y expediente
  e.sub = e.vc ? (e.title!==e.n ? e.n : "") : (e.a ? "«"+e.a+"»" : "");
  BY[e.id]=e;
});
D.forEach(e=>(e.vin||[]).forEach(([to,t,note])=>{
  const o=BY[to]; if(!o) return;
  e.links.push({id:to,t,note});
  if(!o.links.some(l=>l.id===e.id)) o.links.push({id:e.id,t,note});
}));
D.forEach(e=>{ e.hay = norm([e.n,e.a,e.titulo_caso||"",e.autor||"",e.v,e.p,e.c,e.y,e.loc.map(l=>l[2]).join(" ")].join(" ")); });
const expNo = e => e.y + "-" + String(e.i+1).padStart(3,"0");
const dayIn = (e,y) => (e.m===2 && e.d===29 && !isLeap(y)) ? 28 : e.d;   // 29-feb → 28-feb en años no bisiestos
const isTodayIn = (e,y) => y===today.getFullYear() && e.m===today.getMonth()+1 && dayIn(e,y)===today.getDate();
/* «Nació un día como hoy · hace 88 años», «Hoy hace 79 años del hallazgo», «Hace 79 años del hallazgo (1947)» */
function efemText(e,yr,isToday){
  const n=yr-e.y, anos=n===1?"1 año":n+" años";
  if(e.t==="nacimiento") return n<1 ? `Nació en ${e.y}` : isToday ? `Nació un día como hoy · hace ${anos}` : `Nació en ${e.y} · hace ${anos}`;
  const de=EFEM[e.t].de;
  if(n<1) return `${EFEM[e.t].lab} en ${e.y}`;
  return isToday ? `Hoy hace ${anos} ${de}` : `Hace ${anos} ${de} (${e.y})`;
}
/* apellido o título corto para la hoja del calendario */
const shortName = e => e.vc ? e.title.replace(/^(el|la|los|las)\s+/i,"") : e.n.split(" ").slice(-1)[0];
const SIN_RESOLVER=/sin resolver|no resuelto|nunca se resolvi|nunca (fue|ha sido) (identificad|detenid|resuelt)|sin identificar|sin culpable|sin esclarecer/i;

function estado(e){
  const s=e.st||"", a=e.w?"A":"O";
  if(e.vc){                                     // expediente de la víctima o del caso: el sello habla del caso
    if(SIN_RESOLVER.test(s)) return ["SIN RESOLVER","blue"];
    if(/absuelt|absoluci/i.test(s)) return ["ABSOLUCIÓN","blue"];
    if(/condenad|culpable|sentencia|ejecutad|cadena perpetua|prisi[oó]n/i.test(s)) return ["CASO CERRADO",""];
    return ["ARCHIVADO",""];
  }
  if(!e.e && SIN_RESOLVER.test(s)) return ["SIN RESOLVER","blue"];
  if(/absuelt/i.test(s)) return ["ABSUELT"+a,"blue"];
  if(/ejecutad|guillotinad|ahorcad/i.test(s)) return ["EJECUTAD"+a,""];
  if(/muri[oó]|muerto|asesinad|hallado muerto|confinada/i.test(s)) return ["FALLECID"+a,""];
  if(/liberad|libre/i.test(s)) return ["EN LIBERTAD","blue"];
  if(!e.e) return /condenad/i.test(s) ? ["CONDENAD"+a,""] : ["ARCHIVADO",""];   // casos nuevos: sin suponer que sigue preso
  return ["EN PRISIÓN",""];
}
/* fuentes del expediente: las del caso nuevo y las de web/datos/fuentes.json (solo enlaces http/https) */
function fuentesDe(e){
  const out=[], seen=new Set();
  [...(Array.isArray(e.fuentes)?e.fuentes:[]), ...(Array.isArray(FUENTES_[e.id])?FUENTES_[e.id]:[])].forEach(f=>{
    if(!f || typeof f.url!=="string" || !/^https?:\/\//i.test(f.url.trim()) || seen.has(f.url.trim())) return;
    seen.add(f.url.trim()); out.push({titulo:String(f.titulo||f.url).trim(), url:f.url.trim(), tipo:String(f.tipo||"").trim()});
  });
  return out;
}

/* ---------- Trazos a mano (círculos de tinta, clip) ---------- */
const RINGS = [
  "M6 15.5C4.6 8 11.2 2.6 19.6 3.2c7.8.6 11.6 6.2 8.6 11.8-3 5.4-12.2 7.6-18.4 4.4C5.4 17 4.6 11.6 9 7.6",
  "M27.5 9.6C25.6 4.4 17.6 2 11.4 3.6 4.6 5.4 3 12 7.6 16.4c4.6 4.4 14.2 4 18.6-.4 3.6-3.6 1.6-9-2.4-11.2",
  "M9.4 5.2C14.6 1.8 25.6 2.8 28.4 8.8c2.6 5.8-3.4 11-11.4 11.2C9.6 20.2 3.8 16.2 4.6 11c.6-3.8 4.2-6.4 8.6-7.6",
  "M5.6 12.4C5 6.6 10.8 3 18 3.2s11.2 4.6 10 9.6c-1.2 5-8 7.6-14.6 6.8C7.6 18.8 4.2 15 6.6 10.4"
];
const ringSvg = d => `<svg class="ring" viewBox="0 0 34 24" aria-hidden="true"><path d="${RINGS[d%RINGS.length]}"/></svg>`;
/* círculo a lápiz (casos del archivo): dos pasadas de grafito */
const pencilSvg = d => `<svg class="ring pencil" viewBox="0 0 34 24" aria-hidden="true"><path d="${RINGS[d%RINGS.length]}"/><path class="p2" d="${RINGS[(d+1)%RINGS.length]}"/></svg>`;
function starPath(cx,cy,R,r){ let p=""; for(let k=0;k<10;k++){ const a=-Math.PI/2+k*Math.PI/5, q=k%2?r:R; p+=(k?"L":"M")+(cx+q*Math.cos(a)).toFixed(2)+" "+(cy+q*Math.sin(a)).toFixed(2); } return p+"z"; }
const STAR_D = starPath(17,29.9,4.4,1.85);
/* sello de goma con estrella (casos estrella): doble aro abierto abajo y la estrella en el hueco */
const sealSvg = d => `<svg class="seal ink" viewBox="0 0 34 34" aria-hidden="true" style="--sr:${(jitter("s"+d,14)).toFixed(1)}deg"><path d="M12.61 31.34A15 15 0 1 1 21.39 31.34"/><path class="in" d="M12.63 28.39A12.2 12.2 0 1 1 21.37 28.39"/><path class="st" d="${STAR_D}"/></svg>`;
const STAR_MINI = `<svg viewBox="0 0 34 34" aria-hidden="true"><circle cx="17" cy="17" r="14.6" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="17" cy="17" r="11.4" fill="none" stroke="currentColor" stroke-width="1"/><path d="${starPath(17,17.6,7.6,3.1)}" fill="currentColor"/></svg>`;
const CLIP = `<svg class="clipx" viewBox="0 0 15 42" aria-hidden="true"><path d="M5 31V9.5a3.4 3.4 0 0 1 6.8 0V33a5.4 5.4 0 0 1-10.8 0V12" stroke="#7d8186" stroke-width="1.7"/><path d="M5.6 30V10a2.6 2.6 0 0 1 2.4-3" stroke="#e3e5e8" stroke-width=".6"/></svg>`;
const ICO = {
  play:`<svg viewBox="0 0 16 16" class="ico-play"><path d="M4 2.6l9.6 5.4L4 13.4z"/></svg>`,
  pause:`<svg viewBox="0 0 16 16" class="ico-pause"><path d="M3.6 2.6h3v10.8h-3zM9.4 2.6h3v10.8h-3z"/></svg>`,
  rew:`<svg viewBox="0 0 16 16"><path d="M8 3v10L1.5 8zM15 3v10L8.5 8z"/></svg>`,
  ff:`<svg viewBox="0 0 16 16"><path d="M1 3v10l6.5-5zM8 3v10l6.5-5z"/></svg>`,
  read:`<svg viewBox="0 0 20 20"><path d="M3 3.5h10.5l3 3V17H3z"/><path d="M6 8h8M6 11h8M6 14h5"/></svg>`,
  reel:`<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#efe9da"/><circle cx="20" cy="20" r="7.5" fill="#2a2622"/>${[0,60,120,180,240,300].map(a=>`<rect x="18.4" y="11" width="3.2" height="5" fill="#efe9da" transform="rotate(${a} 20 20)"/>`).join("")}<circle cx="20" cy="20" r="18" fill="none" stroke="rgba(0,0,0,.25)"/></svg>`
};

/* ---------- Estado de la vista ---------- */
let filter="all", query="";
let today=new Date(); today.setHours(0,0,0,0);
let vy=today.getFullYear(), vm=today.getMonth()+1, selDay=null;
function matches(e){
  if(query && !e.hay.includes(query)) return false;
  if(filter==="links") return e.links.length>0;
  if(filter==="estrella") return e.e;
  if(filter!=="all") return e.g.includes(filter);
  return true;
}

/* ---------- Grupos (pestañas de cartulina): solo se ven con la búsqueda abierta ---------- */
const MIXED = D.some(e=>!e.e);                     // hay casos estrella y casos del archivo
const usedG = new Set(D.flatMap(e=>e.g));
$("filters").innerHTML=[["all","Todos"],...(MIXED?[["estrella","Casos estrella"]]:[]),["links","Con vínculos"],
    ...Object.keys(GROUPS).filter(g=>usedG.has(g)).map(g=>[g,GROUPS[g]]), ...[...usedG].filter(g=>!GROUPS[g]).map(g=>[g,grpName(g)])]
  .map(([k,l])=>`<button class="tag" data-f="${esc(k)}" aria-pressed="${k==="all"}">${esc(l)}</button>`).join("");
if(!MIXED){ const lp=$("lgPencil"); if(lp) lp.hidden=true; }
$("filters").addEventListener("click",ev=>{
  const b=ev.target.closest(".tag"); if(!b) return;
  filter=b.dataset.f; [...$("filters").children].forEach(c=>c.setAttribute("aria-pressed",c===b));
  renderAll();
});

/* ---------- Pestañas de meses (canto del cuaderno) ---------- */
$("mtabs").innerHTML=MES3.map((m,i)=>`<button class="mtab" data-m="${i+1}" aria-label="${MESES[i]}"><span>${m.toUpperCase()}</span></button>`).join("");
$("mtabs").addEventListener("click",ev=>{
  const b=ev.target.closest(".mtab"); if(!b) return;
  const m=+b.dataset.m;
  if(document.body.classList.contains("v-map") || query){ clearSearch(false); showView("cal"); }
  if(m!==vm){ const dir=m>vm?1:-1; vm=m; selDay=null; renderCal(dir); }
  scrollToCal();
});
function syncTabs(){ [...$("mtabs").children].forEach(b=>b.setAttribute("aria-current",+b.dataset.m===vm)); }
function scrollToCal(){ const top=$("calStage").getBoundingClientRect().top; if(top<0||top>innerHeight*.6) scrollTo({top:Math.max(0,scrollY+top-hdrH()-6),behavior:reduced()?"auto":"smooth"}); }
function hdrH(){ return $("top").offsetHeight; }
/* altura de la tapa → variable CSS (pestañas, mapa) */
function syncHdr(){ document.documentElement.style.setProperty("--hdr",hdrH()+"px"); }
if(window.ResizeObserver) new ResizeObserver(syncHdr).observe($("top")); else addEventListener("resize",syncHdr);
syncHdr();

/* ---------- Nota de hoy / próxima efeméride ---------- */
function renderSlip(){
  const y=today.getFullYear(), tm=today.getMonth()+1;
  const occ = e => { let yy=y, d=new Date(yy,e.m-1,dayIn(e,yy)); if(d<today){ yy++; d=new Date(yy,e.m-1,dayIn(e,yy)); } return d; };
  const list=D.map(e=>({e,d:occ(e)})).sort((a,b)=>a.d-b.d);
  const first=list[0], sameDay=list.filter(x=>+x.d===+first.d);
  const days=Math.round((first.d-today)/864e5), isToday=days===0;
  const fecha=`${today.getDate()} de ${MESES[tm-1].toLowerCase()} de ${y}`;
  const who=sameDay.map(x=>`${esc(x.e.title)}${x.e.sub?` <span>${esc(x.e.sub)}</span>`:""}`).join(" · ");
  const what=sameDay.length===1 ? efemText(first.e,first.d.getFullYear(),isToday) : "";
  $("slip").innerHTML=`<span class="tape" style="--tr:-4deg"></span><div style="flex:1;min-width:0"><div class="lbl">${isToday?"Efeméride de hoy":"Próxima efeméride"}</div><div class="lbl2">Hoy es ${fecha}${isToday?"":" · "+(days===1?"mañana":"dentro de "+days+" días")}</div><div class="who">${who}</div>${what?`<div class="what">${esc(what)}</div>`:""}</div>`+
    `<div class="when"><svg viewBox="0 0 60 40" preserveAspectRatio="none" aria-hidden="true"><path d="M8 26C3 14 15 4 33 4c16 0 25 8 21 19-4 10-24 15-38 10C6 30 4 20 13 11"/></svg>${pad(first.d.getDate())} ${MES3[first.d.getMonth()]}</div>`;
  $("slip").setAttribute("aria-label",`${isToday?"Efeméride de hoy":"Próxima efeméride"}: ${sameDay.map(x=>x.e.title).join(", ")}, ${first.d.getDate()} de ${MESES[first.d.getMonth()].toLowerCase()}${what?". "+what:""}`);
  $("slip").onclick=()=>{
    const dir=Math.sign((first.d.getFullYear()*12+first.d.getMonth()+1)-(vy*12+vm));
    vy=first.d.getFullYear(); vm=first.d.getMonth()+1; selDay=first.d.getDate(); showView("cal"); renderCal(dir);
    if(sameDay.length===1) openP(first.e.id); else $("cards").scrollIntoView({behavior:"smooth"});
  };
}

/* ---------- Calendario mensual (hoja de agenda) ---------- */
function monthEvents(y,m){ return D.filter(e=>e.m===m && matches(e)); }
function stripIds(n){ n.removeAttribute("id"); n.querySelectorAll("[id]").forEach(x=>x.removeAttribute("id")); n.querySelectorAll("button").forEach(b=>{b.tabIndex=-1;}); return n; }
let flipTimer=0;
function renderCal(dir){
  const cal=$("cal"), stage=$("calStage");
  const canFlip = dir && !reduced() && cal.offsetParent!==null;
  if(dir && cal.offsetParent!==null) SFX.play("page");
  stage.querySelectorAll(".flip").forEach(n=>n.remove());
  const before = canFlip ? stripIds(cal.cloneNode(true)) : null;  // la hoja que se va conserva su color
  cal.dataset.mes = vm;                                             // cada mes, su tinta y su cartulina

  const first=new Date(vy,vm-1,1), lead=(first.getDay()+6)%7, dim=new Date(vy,vm,0).getDate();
  const prevDim=new Date(vy,vm-1,0).getDate();
  const evs=monthEvents(vy,vm);
  const byDay={}; evs.forEach(e=>{ const d=dayIn(e,vy); (byDay[d]=byDay[d]||[]).push(e); });
  $("calTitle").innerHTML=`<span class="mn ink">${MESES[vm-1]}</span><span class="yr">${vy}</span><small>${evs.length} expediente${evs.length===1?"":"s"} este mes</small>`;
  let h="", total=Math.ceil((lead+dim)/7)*7;
  for(let k=0;k<total;k++){
    const d=k-lead+1, col=k%7;
    if(d<1||d>dim){ const n=d<1?prevDim+d:d-dim; h+=`<div class="cell out${col===6?" sun":""}" aria-hidden="true"><span class="num">${n}</span></div>`; continue; }
    const list=byDay[d]||[];
    const isT = vy===today.getFullYear() && vm===today.getMonth()+1 && d===today.getDate();
    const cls=["cell", col===6?"sun":"", list.length?"has":"", isT?"today":"", selDay===d?"sel":""].join(" ");
    const lbl=`${d} de ${MESES[vm-1]}${isT?" (hoy)":""}${list.length?": "+list.map(e=>e.title+(MIXED&&e.e?" (caso estrella)":"")).join(", "):""}`;
    const tally=list.map(e=>`<i class="${e.links.length?"l":""}"></i>`).join("");
    const names=list.slice(0,2).map(e=>`<span class="${e.links.length?"l":e.e?"":"p"}">${esc(shortName(e))}</span>`).join("")+(list.length>2?`<em>+${list.length-2} más</em>`:"");
    const mark = list.some(e=>e.e) ? sealSvg(d+vm) : pencilSvg(d+vm);
    h+= list.length
      ? `<button class="${cls}" data-d="${d}" aria-label="${esc(lbl)}"><span class="num">${mark}${d}</span><div class="tally">${tally}</div><div class="names">${names}</div></button>`
      : `<div class="${cls}" aria-label="${esc(lbl)}"><span class="num">${d}</span></div>`;
  }
  $("days").innerHTML=h;
  syncTabs();
  renderList(evs);
  if(before) flipPage(stage,cal,before,dir);
}
function flipPage(stage,cal,before,dir){
  clearTimeout(flipTimer);
  const parts=[];
  if(dir>0){ before.classList.add("flip","flip-out"); parts.push(before); }
  else{ before.classList.add("flip","flip-under"); const after=stripIds(cal.cloneNode(true)); after.classList.add("flip","flip-in"); parts.push(before,after); }
  parts.forEach(p=>{ p.setAttribute("aria-hidden","true"); stage.appendChild(p); });
  const done=()=>parts.forEach(p=>p.remove());
  parts[parts.length-1].addEventListener("animationend",ev=>{ if(ev.target===parts[parts.length-1]) done(); });
  flipTimer=setTimeout(done,900);
}
function card(e,y){
  const yr=y||vy;
  const lk=e.links.length?`<span>${e.links.length} vínculo${e.links.length>1?"s":""}</span>`:"";
  const leapNote=(e.m===2&&e.d===29&&!isLeap(yr))?" (29 feb)":"";
  const r=jitter(e.id,.9).toFixed(2), dx=jitter(e.id+"x",4).toFixed(1);
  const star = MIXED && e.e;
  return `<button class="card${star?" star":""}" data-id="${e.id}" style="--r:${r}deg;--dx:${dx}px">${e.links.length?CLIP:""}
    <span class="ref">Nº ${expNo(e)}</span>${star?`<span class="cstar ink" aria-hidden="true">${STAR_MINI}</span>`:""}
    <div class="dbox ink"><b>${pad(dayIn(e,yr))}</b><span>${MES3[e.m-1]}</span></div>
    <div class="bd">${star?`<span class="sr">Caso estrella. </span>`:""}<div class="nm">${esc(e.title)}</div>${e.sub?`<div class="al">${esc(e.sub)}</div>`:""}
    <div class="meta">${e.v?`<span>Víctimas: <b>${esc(e.v)}</b></span>`:""}${e.p?`<span>${esc(e.p)}</span>`:""}${lk}</div>
    <span class="ann">${esc(efemText(e,yr,isTodayIn(e,yr)))}${leapNote}</span></div></button>`;
}
function renderList(evs){
  let list=evs;
  if(selDay){ list=evs.filter(e=>dayIn(e,vy)===selDay); }
  $("listTitle").textContent = selDay ? `Expedientes del ${selDay} de ${MESES[vm-1].toLowerCase()}` : `Expedientes de ${MESES[vm-1].toLowerCase()}`;
  $("listCount").textContent = `(${list.length})`;
  $("showMonth").hidden=!selDay;
  $("cards").innerHTML = list.length ? list.map(e=>card(e)).join("") : `<div class="empty">${filter==="all"&&!query?(selDay?"Ningún expediente del archivo tiene efeméride este día.":"Sin expedientes este mes."):`Sin expedientes ${selDay?"este día":"este mes"} con el filtro actual.`}</div>`;
}
$("days").addEventListener("click",ev=>{
  const c=ev.target.closest(".cell.has"); if(!c) return;
  const d=+c.dataset.d;
  const list=monthEvents(vy,vm).filter(e=>dayIn(e,vy)===d);
  selDay = d; renderCal(0);
  if(list.length===1) openP(list[0].id); else $("cards").scrollIntoView({behavior:"smooth",block:"start"});
});
function moveMonth(k){ vm+=k; if(vm<1){vm=12;vy--;} if(vm>12){vm=1;vy++;} selDay=null; renderCal(k); }
function goToday(){ const dir=Math.sign((today.getFullYear()*12+today.getMonth()+1)-(vy*12+vm)); vy=today.getFullYear(); vm=today.getMonth()+1; selDay=null; renderCal(dir); }
$("prevM").onclick=()=>moveMonth(-1);
$("nextM").onclick=()=>moveMonth(1);
$("goToday").onclick=goToday;
$("showMonth").onclick=()=>{ selDay=null; renderCal(0); };
/* deslizar la hoja para cambiar de mes */
(function(){ let x0=null,y0=0,t0=0; const el=$("calStage");
  el.addEventListener("touchstart",e=>{ if(e.touches.length!==1){x0=null;return;} x0=e.touches[0].clientX; y0=e.touches[0].clientY; t0=Date.now(); },{passive:true});
  el.addEventListener("touchend",e=>{ if(x0===null) return; const dx=e.changedTouches[0].clientX-x0, dy=e.changedTouches[0].clientY-y0;
    if(Math.abs(dx)>55 && Math.abs(dx)>Math.abs(dy)*1.5 && Date.now()-t0<900) moveMonth(dx<0?1:-1); x0=null; },{passive:true});
})();

/* ---------- Búsqueda ---------- */
function renderRes(){
  const list=D.filter(matches);
  $("resCount").textContent=`(${list.length})`;
  let h="", lastM=0;
  list.forEach(e=>{ if(e.m!==lastM){ h+=`<div class="month-sep">${MESES[e.m-1]}</div>`; lastM=e.m; } h+=card(e,today.getFullYear()); });
  $("resCards").innerHTML = h || `<div class="empty">No hay expedientes que coincidan.</div>`;
}
$("page").addEventListener("click",ev=>{ const b=ev.target.closest(".card"); if(b) openP(b.dataset.id); });
function renderAll(){
  // Con la búsqueda abierta, elegir un grupo también muestra la lista de sus casos.
  const searching = !!query || (!$("searchWrap").hidden && filter!=="all");
  if(!document.body.classList.contains("v-map")) document.body.classList.toggle("v-res",searching);
  renderCal(0); if(searching) renderRes();
  if(world) drawWorld();
}
let qt;
$("q").addEventListener("input",ev=>{
  $("searchWrap").classList.toggle("has",!!ev.target.value);
  clearTimeout(qt); qt=setTimeout(()=>{ query=norm(ev.target.value.trim()); renderAll(); },140);
});
$("q").addEventListener("keydown",ev=>{ if(ev.key==="Enter") ev.target.blur(); });
function clearSearch(focus){ $("q").value=""; $("searchWrap").classList.remove("has"); if(query){ query=""; renderAll(); } if(focus) $("q").focus(); }
$("clr").onclick=()=>clearSearch(true);
function setFilter(f){ filter=f; [...$("filters").children].forEach(c=>c.setAttribute("aria-pressed",c.dataset.f===f)); }
$("tSearch").onclick=()=>{
  const w=$("searchWrap"), open=w.hidden;
  w.hidden=!open; $("filters").hidden=!open; $("tSearch").setAttribute("aria-expanded",open);
  if(open){ $("q").focus(); return; }
  // Al cerrar la búsqueda se quitan el texto y el grupo: el calendario nunca queda filtrado a escondidas.
  $("q").value=""; $("searchWrap").classList.remove("has"); query=""; setFilter("all"); renderAll();
};

/* ---------- Mapas ---------- */
const HAS_L = typeof L!=="undefined";
const TILE="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}";
const ATTR='Teselas &copy; Esri';
let LAND=null;
let detail=false; try{ detail=localStorage.getItem("cc_detail")==="1"; }catch(_){}
const maps=new Set();
function landGeo(){
  if(LAND!==null) return LAND;
  try{ LAND=(typeof WORLD!=="undefined" && typeof topojson!=="undefined") ? topojson.feature(WORLD,WORLD.objects.countries) : false; }catch(_){ LAND=false; }
  /* los países que cruzan el antimeridiano (Rusia, Fiyi…) se dibujaban como bandas horizontales */
  const unwrap=r=>{ let off=0; for(let i=1;i<r.length;i++){ let x=r[i][0]+off; const d=x-r[i-1][0]; if(d>180){off-=360;x-=360;} else if(d<-180){off+=360;x+=360;} r[i]=[x,r[i][1]]; } };
  if(LAND) (LAND.features||[]).forEach(f=>{ const g=f.geometry; if(!g) return;
    if(g.type==="Polygon") g.coordinates.forEach(unwrap); else if(g.type==="MultiPolygon") g.coordinates.forEach(p=>p.forEach(unwrap)); });
  return LAND;
}
const DetailCtl = HAS_L ? L.Control.extend({ options:{position:"topright"},
  onAdd(m){ const b=L.DomUtil.create("button","detail-btn"); b.type="button";
    const upd=()=>{ b.textContent=detail?"Detalle: SÍ":"Detalle: NO"; b.setAttribute("aria-pressed",detail); };
    upd(); m._detBtn=upd;
    L.DomEvent.on(b,"click",ev=>{ L.DomEvent.stop(ev); setDetail(!detail); });
    return b; } }) : null;
function setDetail(on){
  detail=on; try{ localStorage.setItem("cc_detail",on?"1":"0"); }catch(_){}
  maps.forEach(m=>{ if(on){ if(!m._tiles) m._tiles=L.tileLayer(TILE,{attribution:ATTR,maxZoom:18}); m._tiles.addTo(m); } else if(m._tiles) m.removeLayer(m._tiles); m._detBtn&&m._detBtn(); });
}
function baseMap(el,opts){
  const m=L.map(el,Object.assign({worldCopyJump:true,maxBounds:[[-85,-400],[85,400]],maxZoom:18},opts||{}));
  m.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a> · Mapa: Natural Earth');
  m.createPane("land"); m.getPane("land").style.zIndex=150;
  const g=landGeo();
  if(g) L.geoJSON(g,{pane:"land",renderer:L.canvas({pane:"land"}),interactive:false,
        style:{color:"#8f7d58",weight:.7,fillColor:"#eadcb6",fillOpacity:1}}).addTo(m);
  new DetailCtl().addTo(m);
  if(detail){ m._tiles=L.tileLayer(TILE,{attribution:ATTR,maxZoom:18}).addTo(m); }
  maps.add(m); m.on("unload",()=>maps.delete(m));
  return m;
}
const maxZ = () => detail ? 11 : 6;
/* chincheta que cae sobre el mapa */
function tack(ll,blue,small,delay){
  return L.marker(ll,{icon:L.divIcon({className:"tackw"+(reduced()?"":" drop"),html:`<i class="tack${blue?" b":""}${small?" s":""}" style="--dl:${delay|0}ms"></i>`,iconSize:[20,18],iconAnchor:[10,9],popupAnchor:[0,-8],tooltipAnchor:[8,0]}),keyboard:true,riseOnHover:true});
}
/* hilo rojo: curva con algo de caída entre dos puntos */
function threadLine(a,b){
  const pts=[], mx=(a[0]+b[0])/2, my=(a[1]+b[1])/2, dx=b[1]-a[1], dy=b[0]-a[0], len=Math.hypot(dx,dy)||1;
  const sag=Math.min(6,len*.12), c=[mx-Math.abs(dx)/len*sag, my+dy/len*sag*.3];
  for(let t=0;t<=1.0001;t+=1/16){ pts.push([(1-t)*(1-t)*a[0]+2*(1-t)*t*c[0]+t*t*b[0],(1-t)*(1-t)*a[1]+2*(1-t)*t*c[1]+t*t*b[1]]); }
  return L.polyline(pts,{color:"#b3261e",weight:1.6,opacity:.9,className:"thread",interactive:false});
}
function markThreads(layer){ layer.eachLayer(l=>{ if(l instanceof L.Polyline && l._path){ l._path.setAttribute("pathLength","1"); } }); }
let world=null, worldLayer=null;
function drawWorld(){
  worldLayer.clearLayers();
  const list=D.filter(matches), shown=new Set(list.map(e=>e.id));
  list.forEach(e=>(e.vin||[]).forEach(([to])=>{
    const o=BY[to]; if(!o||!shown.has(to)||!e.loc.length||!o.loc.length) return;
    const a=e.loc[0], b=o.loc[0]; if(a[0]===b[0]&&a[1]===b[1]) return;
    threadLine([a[0],a[1]],[b[0],b[1]]).addTo(worldLayer);
  }));
  let k=0;
  list.forEach(e=>e.loc.forEach(l=>{
    tack([l[0],l[1]], e.links.length>0, true, Math.min(700,k++*5)).addTo(worldLayer)
      .bindPopup(`<b>${esc(e.title)}</b><div class="pl">${esc(l[2])}</div><button data-open="${e.id}">Abrir expediente</button>`);
  }));
  markThreads(worldLayer);
  const c=world.getContainer(); c.classList.remove("drawn"); void c.offsetWidth; if(!reduced()) c.classList.add("drawn");
}
function showView(v){
  const map=v==="map";
  document.body.classList.toggle("v-map",map);
  document.body.classList.toggle("v-res",!map && !!query);
  const t=$("tView"); t.setAttribute("aria-pressed",map); t.setAttribute("aria-label",map?"Ver el calendario":"Ver el mapa");
  t.querySelector(".ico-map").toggleAttribute("hidden",map); t.querySelector(".ico-cal").toggleAttribute("hidden",!map);
  if(map){
    if(!HAS_L){ $("worldmap").innerHTML='<div class="empty">No se pudo cargar el mapa.</div>'; return; }
    if(!world){ world=baseMap($("worldmap"),{minZoom:1}).setView([28,0],innerWidth<760?1:2); worldLayer=L.layerGroup().addTo(world); drawWorld(); }
    setTimeout(()=>world.invalidateSize(),60);
  }
}
$("tView").onclick=()=>showView(document.body.classList.contains("v-map")?"cal":"map");
$("worldmap").addEventListener("click",ev=>{ const b=ev.target.closest("[data-open]"); if(b) openP(b.dataset.open); });

/* ---------- Retrato robot genérico (estilo policial) ---------- */
function identikit(e){
  const h=hashId(e.id), id="k"+e.id;
  const photofit = h%2===0;
  const hairV = (h>>>3)%3, glasses=(h>>>6)%5;
  const ink = photofit ? "#141312" : "#2a2725";
  const R = `filter="url(#r${id})"`;
  const st=(w,o)=>`stroke="${ink}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"${o?` opacity="${o}"`:""}`;
  const M=[
    `<path d="M37 96C28 60 40 20 76 16c38-2 49 34 38 80-3-18-7-31-13-38-12-7-34-5-49 1-7 9-11 21-15 37z"/>`,
    `<path d="M42 88C37 56 52 30 77 29c24 0 37 21 32 59-2-16-6-27-12-32-10-6-27-4-39-2-8 6-12 18-16 34z"/>`,
    `<path d="M41 102c-4-28-1-46 11-56 3 10 4 21 2 32-6 6-10 14-13 24zM109 102c4-28 1-46-11-56-3 10-4 21-2 32 6 6 10 14 13 24z"/>`+Array.from({length:8},(_,i)=>`<path d="M${55+i*5} ${42-(i%4)}q2 -6 ${i%2?4:-3} -9" stroke="#3a3633" stroke-width="1" fill="none" opacity=".6"/>`).join("")
  ];
  const F=[
    `<path d="M28 140C20 72 36 18 75 17c40 1 56 55 47 123-6 4-11 1-13-6 2-24 0-42-3-55H45c-3 13-5 31-3 55-2 7-7 10-14 6z"/>`,
    `<path d="M33 178C24 110 30 22 75 20c45 2 51 90 42 158-5 2-10-1-11-5 3-40 4-70 0-92-6-20-17-30-31-34-14 4-25 14-31 34-4 22-3 52 0 92-1 4-6 7-11 5z"/>`,
    `<path d="M41 92C36 55 52 30 75 29s39 26 34 63c-2-18-7-29-13-34-8-5-34-5-42 0-6 5-11 16-13 34z"/><ellipse cx="75" cy="20" rx="17" ry="11"/>`
  ];
  const hair = (e.w?F:M)[hairV];
  const hairTex = Array.from({length:9},(_,i)=>`<path d="M${44+i*7} ${e.w&&hairV!==2?30:34}q${(i%3)-1} 4 ${(i%2?3:-3)} ${14+i%4*3}" stroke="#5c5752" stroke-width="1" fill="none" opacity=".55"/>`).join("");
  const fringe = e.w && hairV===0 ? Array.from({length:12},(_,i)=>`<path d="M${47+i*5} 58l${i%2?1:-1} 19" stroke="#55504b" stroke-width="1" opacity=".6"/>`).join("") : "";
  let gl="";
  if(glasses===3) gl=`<g ${st(4.2)}><rect x="47" y="82" width="26" height="17" rx="3"/><rect x="77" y="82" width="26" height="17" rx="3"/><path d="M73 88h4M47 86l-6-2M103 86l6-2"/></g>`;
  if(glasses===4) gl=`<g ${st(1.6)}><circle cx="61" cy="90" r="11"/><circle cx="89" cy="90" r="11"/><path d="M72 89q3-2 6 0M50 88l-8-3M100 88l8-3"/></g>`;
  let pf="";
  if(photofit){
    const codes=["F"+(10+h%80),"A","B","C","D","S"+(1+h%9),"N"+(10+(h>>>4)%60),"M"+(1+(h>>>2)%9),"Z","Y","X"];
    pf+=[66,101,121].map(y=>`<path d="M30 ${y}H120" stroke="#fff" stroke-width="1.2" opacity=".85"/><path d="M30 ${y+1.2}H120" stroke="#000" stroke-width=".5" opacity=".35"/>`).join("");
    pf+=`<rect x="128" y="0" width="22" height="200" fill="#e8e6e0"/><path d="M128 0v200" stroke="#000" stroke-width=".6" opacity=".4"/>`;
    pf+=codes.map((c,i)=>`<text x="131" y="${16+i*17}" font-family="Arial,Helvetica,sans-serif" font-size="${c.length>1?7:6}" font-weight="700" fill="#222">${c}</text><path d="M128 ${20+i*17}h${i%2?6:10}" stroke="#222" stroke-width=".8"/>`).join("");
    pf+=`<rect x="131" y="2" width="9" height="3" fill="#222"/>`;
  }
  return `<svg viewBox="0 0 150 200" role="img" aria-label="Retrato robot genérico" preserveAspectRatio="xMidYMid slice">
  <defs>
    <filter id="r${id}" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="${photofit?.04:.9}" numOctaves="2" seed="${h%50}"/><feDisplacementMap in="SourceGraphic" scale="${photofit?1.5:3.2}"/></filter>
    <filter id="g${id}"><feTurbulence type="fractalNoise" baseFrequency="${photofit?1.4:1.1}" numOctaves="2" seed="${h%30}"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${photofit?.12:.15} 0"/></filter>
    <radialGradient id="f${id}" cx="50%" cy="44%" r="62%"><stop offset="55%" stop-color="${photofit?"#efede8":"#f1ede4"}"/><stop offset="100%" stop-color="${photofit?"#9a968e":"#bfb8aa"}"/></radialGradient>
  </defs>
  <rect width="150" height="200" fill="${photofit?"#f4f3ef":"#efebe2"}"/>
  <g ${R} opacity="${photofit?1:.9}">
    <path d="M18 200c6-26 26-38 44-42l1-18h24l1 18c18 4 38 16 44 42z" fill="${photofit?"#d4d1cb":"none"}" ${st(1.4,.8)}/>
    <path d="M62 158q13 9 26 0" ${st(1.2,.6)}/>
    <path d="M41 88c-6-2-7 16 1 20M109 88c6-2 7 16-1 20" fill="url(#f${id})" ${st(1.6)}/>
    <path d="M43 82C42 50 57 36 75 36s33 14 32 46c0 30-9 56-32 68-23-12-32-38-32-68z" fill="url(#f${id})" ${st(photofit?1.2:2)}/>
    <g fill="${photofit?"#151413":"#24211f"}">${hair}</g>${hairTex}${fringe}
    <ellipse cx="61" cy="88" rx="12" ry="7" fill="${ink}" opacity=".09"/><ellipse cx="89" cy="88" rx="12" ry="7" fill="${ink}" opacity=".09"/>
    <path d="M67 112q-7 9-5 18M83 112q7 9 5 18" ${st(.9,.35)}/>
    ${Array.from({length:7},(_,i)=>`<path d="M${46+i*1.5} ${96+i*6}l6 -4" ${st(.7,.3)}/>`).join("")}
    <path d="M50 81q10-7 21-2M79 79q11-5 21 2" ${st(photofit?3.6:3)}/>
    <path d="M52 90q9-6 18 0q-9 4-18 0zM80 90q9-6 18 0q-9 4-18 0z" fill="#f6f4ef" ${st(1.3)}/>
    <circle cx="61" cy="89.6" r="3.2" fill="${ink}"/><circle cx="89" cy="89.6" r="3.2" fill="${ink}"/>
    <path d="M51 89.5q10-7.5 20 0M79 89.5q10-7.5 20 0" ${st(2.2)}/>
    <path d="M53 95q8 3 16 0M81 95q8 3 16 0" ${st(.8,.45)}/>
    <path d="M75 93l-3 20" ${st(1.1,.7)}/><path d="M71 104q-3 7 1 12" ${st(.9,.4)}/>
    <path d="M67 116q4 3 7 1M76 117q3 2 7-1" ${st(1.5)}/><ellipse cx="75" cy="114" rx="5" ry="3" fill="${ink}" opacity=".12"/>
    <path d="M63 127q6-3 12 0q6-3 12 0" ${st(1.1,.7)}/><path d="M62 128q13 4 26 0" ${st(2)}/>
    <ellipse cx="75" cy="133" rx="9" ry="2.6" fill="${ink}" opacity=".18"/>
    <path d="M66 145q9 4 18 0" ${st(.9,.35)}/>
    ${Array.from({length:6},(_,i)=>`<path d="M${47+i} ${104+i*5}l-4 5M${103-i} ${104+i*5}l4 5" ${st(.8,.35)}/>`).join("")}
    ${gl}
  </g>
  ${pf}
  <rect width="150" height="200" filter="url(#g${id})"/>
</svg>`;
}

/* Expedientes de la víctima o del caso: nada de retrato robot (la víctima no es sospechosa).
   Autor desconocido → silueta sin rostro ante la regla de alturas; si no, hueco de foto vacío. */
const autorDesconocido = e => /desconocid|sin identificar|an[oó]nim|nunca (fue|ha sido) identificad/i.test(e.autor||"");
function casePlaceholder(e){
  const rule=[40,70,100,130,160,190].map((y,i)=>`<path d="M0 ${y}H150" stroke="#3a3632" stroke-width=".7" opacity=".28"/><text x="4" y="${y-3}" font-family="Courier New,monospace" font-size="7" fill="#3a3632" opacity=".5">${190-i*10}</text>`).join("");
  if(autorDesconocido(e)) return `<svg viewBox="0 0 150 200" role="img" aria-label="Autor sin identificar" preserveAspectRatio="xMidYMid slice"><rect width="150" height="200" fill="#e7e2d6"/>${rule}
    <path d="M75 46c-16 0-27 12-27 29 0 12 6 22 14 28-23 6-38 23-43 52l-3 45h118l-3-45c-5-29-20-46-43-52 8-6 14-16 14-28 0-17-11-29-27-29z" fill="#2c2825" opacity=".86"/>
    <text x="75" y="96" text-anchor="middle" font-family="Special Elite,Courier New,monospace" font-size="46" fill="#e7e2d6" opacity=".9">?</text></svg>`;
  return `<svg viewBox="0 0 150 200" role="img" aria-label="Sin fotografía" preserveAspectRatio="xMidYMid slice"><rect width="150" height="200" fill="#ece7db"/>
    <path d="M14 18L136 182M136 18L14 182" stroke="#57534c" stroke-width="1.1" opacity=".35" stroke-linecap="round"/>
    <rect x="30" y="86" width="90" height="28" fill="#ece7db"/><text x="75" y="104" text-anchor="middle" font-family="Courier New,monospace" font-weight="700" font-size="10" letter-spacing="1" fill="#463f35">SIN FOTO</text></svg>`;
}

/* ---------- Fotografías reales: Wikipedia / Wikimedia Commons ---------- */
const photoCache = new Map();
function normPhotoName(s){
  return String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase()
    .replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
}
function photoNameScore(personName, candidateName){
  const wanted=normPhotoName(personName).split(" ").filter(x=>x.length>2);
  const found=normPhotoName(candidateName).split(" ");
  if(!wanted.length||!found.length) return 0;
  return wanted.filter(t=>found.includes(t)).length/wanted.length;
}
async function photoFetchJson(url){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch(url,{signal:controller.signal,cache:"force-cache"});
    if(!response.ok) throw new Error("HTTP "+response.status);
    const data=await response.json();
    if(data.error) throw new Error(data.error.info||data.error.code||"Error de API");
    return data;
  }finally{ clearTimeout(timeout); }
}
function wikiApiUrl(lang, params){
  const q=new URLSearchParams({...params,format:"json",origin:"*"});
  return `https://${lang}.wikipedia.org/w/api.php?${q.toString()}`;
}
/* Solo se acepta un retrato si el texto de la fuente confirma que habla del criminal
   (evita fotos de homónimos: deportistas, actores…). */
const CRIME_RE=/(asesin|crimin|homicid|murder|killer|serial|condenad|convict|envenen|poison|mug ?shot|ficha policial|executed|ejecutad|guillotin|ahorcad|violador|rapist|secuestr|kidnap|acusad|accused|prisi[oó]n|prison|reclus|inmate|matanza|v[ií]ctimas|victims)/i;
/* el título debe nombrar a la persona y poco más (apellido incluido) */
function titleMatches(name,title){
  const t=String(title||"").replace(/\([^)]*\)/g," ").replace(/\.(jpe?g|png|gif|tiff?|webp)$/i,"");
  const want=normPhotoName(name).split(" ").filter(x=>x.length>2), got=normPhotoName(t).split(" ").filter(x=>x.length>2);
  if(!want.length||!got.length) return false;
  const last=want[want.length-1];
  return got.includes(last) && photoNameScore(name,t)>=0.66 && got.filter(x=>want.includes(x)).length/got.length>=0.75;
}
async function photoFromWikipedia(person,lang){
  const base={prop:"pageimages|info|extracts",piprop:"thumbnail",pithumbsize:720,inprop:"url",exintro:1,explaintext:1,exsentences:3,exlimit:"max"};
  const ok=x=>x.thumbnail?.source && titleMatches(person.n,x.title) && CRIME_RE.test(x.extract||"");
  const pack=(page)=>({image:page.thumbnail.source,page:page.fullurl||`https://${lang}.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g,"_"))}`,title:page.title,source:"Wikipedia"});
  const direct=await photoFetchJson(wikiApiUrl(lang,{action:"query",titles:person.n,redirects:1,...base}));
  let page=Object.values(direct.query?.pages||{}).find(ok);
  if(page) return pack(page);
  const search=await photoFetchJson(wikiApiUrl(lang,{action:"query",generator:"search",gsrsearch:person.n,gsrnamespace:0,gsrlimit:10,...base}));
  page=Object.values(search.query?.pages||{}).filter(ok).sort((a,b)=>photoNameScore(person.n,b.title)-photoNameScore(person.n,a.title))[0];
  return page ? pack(page) : null;
}
async function photoFromCommons(person){
  const params={action:"query",generator:"search",gsrsearch:`filetype:bitmap "${person.n}"`,gsrnamespace:6,gsrlimit:12,prop:"imageinfo",iiprop:"url|extmetadata",iiurlwidth:720};
  const data=await photoFetchJson(`https://commons.wikimedia.org/w/api.php?${new URLSearchParams({...params,format:"json",origin:"*"})}`);
  const pages=Object.values(data.query?.pages||{}).map(page=>{
    const info=page.imageinfo?.[0]; if(!info) return null;
    const title=page.title.replace(/^File:/i,""), meta=info.extmetadata||{};
    const text=`${title} ${stripMarkup(meta.ImageDescription?.value||"")} ${stripMarkup(meta.Categories?.value||"")}`;
    if(!CRIME_RE.test(text) || /(chart|graph|statistic|data|diagram|map|convictions|timeline|logo|signature|firma|grave|tumba|cover|poster)/i.test(title) || !titleMatches(person.n,title)) return null;
    return {score:photoNameScore(person.n,title),image:info.thumburl||info.url,page:info.descriptionurl||`https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g,"_"))}`,title,source:"Wikimedia Commons"};
  }).filter(x=>x&&x.image&&x.score>=0.75).sort((a,b)=>b.score-a.score);
  return pages[0]||null;
}
async function findRealPhoto(person){
  if(photoCache.has(person.id)) return photoCache.get(person.id);
  const task=(async()=>{
    for(const lang of ["es","en"]){
      try{ const result=await photoFromWikipedia(person,lang); if(result) return result; }
      catch(err){ console.warn(`No se pudo consultar Wikipedia (${lang}) para ${person.n}:`,err); }
    }
    try{ return await photoFromCommons(person); }
    catch(err){ console.warn(`No se pudo consultar Wikimedia Commons para ${person.n}:`,err); return null; }
  })();
  photoCache.set(person.id,task);
  return task;
}
async function loadDossierPhoto(person){
  const frame=$("realPhotoFrame"), img=$("realPhoto"), caption=$("photoCaption");
  if(!frame||!img||!caption) return;
  if(person.vc){
    caption.innerHTML = autorDesconocido(person) ? 'AUTOR SIN IDENTIFICAR<span class="photo-credit">No hay retrato posible</span>' : 'SIN FOTOGRAFÍA<span class="photo-credit">Expediente del caso</span>';
    return;
  }
  caption.innerHTML='BUSCANDO FOTOGRAFÍA<span class="photo-credit">Consultando Wikimedia…</span>';
  const result=await findRealPhoto(person);
  if(current!==person || !frame.isConnected) return;
  if(!result){ caption.innerHTML='RETRATO ILUSTRATIVO<span class="photo-credit">Sin fotografía fiable localizada</span>'; return; }
  img.onload=()=>{
    if(current!==person || !frame.isConnected) return;
    frame.classList.add("has-real");
    caption.innerHTML=`FOTOGRAFÍA DE ARCHIVO<span class="photo-credit"><a href="${esc(result.page)}" target="_blank" rel="noopener">${esc(result.source)} · ${esc(result.title)}</a></span>`;
  };
  img.onerror=()=>{
    if(current!==person || !frame.isConnected) return;
    frame.classList.remove("has-real");
    caption.innerHTML='RETRATO ILUSTRATIVO<span class="photo-credit">La imagen localizada no se puede cargar</span>';
  };
  img.referrerPolicy="no-referrer";
  img.src=result.image;
}

/* ---------- Material documental del caso: Wikimedia Commons ---------- */
const investigationCache = new Map();
const investigationPositive = /\b(trial|court|police|investigation|arrest|prison|jail|hospital|street|house|building|home|residence|apartment|hotel|school|station|newspaper|archive|courtroom|document|press|detention|inquiry|memorial|museum|property|mansion|clinic|office)\b/i;
const investigationExcluded = /\b(mug\s?shot|portrait|headshot|selfie|blood|corpse|dead body|autopsy|execution|hanging|firearm|weapon|gun|knife|pistol|rifle|bomb|explosive|graphic|crime scene)\b/i;
function stripMarkup(value){
  return String(value||"").replace(/<[^>]*>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&")
    .replace(/&#0*39;/g,"'").replace(/&quot;/gi,'"').replace(/\s+/g," ").trim();
}
function commonsSearchUrl(q){
  const params=new URLSearchParams({action:"query",generator:"search",gsrsearch:q,gsrnamespace:"6",gsrlimit:"18",prop:"imageinfo",iiprop:"url|extmetadata",iiurlwidth:"760",format:"json",origin:"*"});
  return `https://commons.wikimedia.org/w/api.php?${params.toString()}`;
}
function investigationQueries(person){
  const queries=[`"${person.n}" (trial OR court OR police OR investigation OR arrest OR prison)`];
  person.loc.slice(0,2).forEach(place=>{
    const name=String(place[2]||"").replace(/\([^)]*\)/g," ").replace(/\s+/g," ").trim();
    if(name.length>3) queries.push(`"${name}" (court OR police OR hospital OR street OR building OR house)`);
  });
  return queries;
}
async function investigationResultsForQuery(q,person){
  const data=await photoFetchJson(commonsSearchUrl(q));
  return Object.values(data.query?.pages||{}).map(page=>{
    const info=page.imageinfo?.[0];
    if(!info) return null;
    const title=String(page.title||"").replace(/^File:/i,"");
    const meta=info.extmetadata||{};
    const description=stripMarkup(meta.ImageDescription?.value||meta.ObjectName?.value||"");
    const searchable=`${title} ${description}`;
    if(!info.thumburl && !info.url) return null;
    if(investigationExcluded.test(searchable)) return null;
    if(!investigationPositive.test(searchable)) return null;
    const nameScore=photoNameScore(person.n,searchable);
    const placeScore=Math.max(0,...person.loc.map(place=>photoNameScore(String(place[2]||"").replace(/\([^)]*\)/g," "),searchable)));
    if(nameScore<0.34 && placeScore<0.34) return null;
    const titleBoost=investigationPositive.test(title)?0.18:0;
    const pageUrl=info.descriptionurl||`https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g,"_"))}`;
    return {image:info.thumburl||info.url,page:pageUrl,title,source:"Wikimedia Commons",score:Math.max(nameScore,placeScore)+titleBoost};
  }).filter(Boolean);
}
async function findInvestigationPhotos(person){
  if(investigationCache.has(person.id)) return investigationCache.get(person.id);
  const task=(async()=>{
    const found=new Map();
    for(const q of investigationQueries(person)){
      try{ (await investigationResultsForQuery(q,person)).forEach(item=>{ if(!found.has(item.image) || found.get(item.image).score<item.score) found.set(item.image,item); }); }
      catch(err){ console.warn(`No se pudo consultar el material documental de ${person.n}:`,err); }
    }
    return [...found.values()].sort((a,b)=>b.score-a.score).slice(0,4);
  })();
  investigationCache.set(person.id,task);
  return task;
}
async function loadInvestigationGallery(person){
  const gallery=$("investigationGallery");
  if(!gallery) return;
  gallery.innerHTML='<div class="gallery-note">Buscando fotografías de lugares, archivos y contexto judicial…</div>';
  const results=await findInvestigationPhotos(person);
  if(current!==person || !gallery.isConnected) return;
  if(!results.length){
    gallery.innerHTML='<div class="gallery-note">No hay material gráfico suficientemente relacionado con este expediente en Wikimedia Commons. Mejor no mostrar imágenes genéricas o de otros casos.</div>';
    return;
  }
  gallery.innerHTML=results.map((item,i)=>`<figure class="case-photo" style="--r:${(i%2?1.6:-1.4)+jitter(item.title,.8)}deg"><span class="tape"></span><a href="${esc(item.page)}" target="_blank" rel="noopener noreferrer" title="Abrir la fuente original"><img src="${esc(item.image)}" alt="Imagen documental relacionada con ${esc(person.n)}: ${esc(item.title)}" loading="lazy" referrerpolicy="no-referrer"><figcaption>${esc(item.title)}<small>Fuente: Wikimedia Commons · abrir ficha original</small></figcaption></a></figure>`).join("");
  gallery.querySelectorAll("img").forEach((img,i)=>{
    const fig=img.closest(".case-photo");
    const show=()=>setTimeout(()=>fig.classList.add("in"),reduced()?0:i*120);
    if(img.complete && img.naturalWidth) show(); else img.addEventListener("load",show,{once:true});
    img.addEventListener("error",()=>{
      fig.remove();
      if(!gallery.querySelector(".case-photo")) gallery.innerHTML='<div class="gallery-note">Las imágenes localizadas no se han podido cargar. Puedes consultar las fuentes desde la ficha de referencia.</div>';
    },{once:true});
  });
}

/* =====================================================================
   PODCAST: guiones (assets/podcast/<id>.json) y audios (assets/audio)
   Conviven dos formatos: episodio único (v2) y caso contado en cintas (v3, contrato 7).
   ===================================================================== */
const scripts=new Map(), scriptsDone=new Map(), tapeCache=new Map();
let AIDX=null;                               // contenido de audio/index.json
const audioIdxReady=(async()=>{
  try{ const r=await fetch("audio/index.json",{cache:"no-cache"}); if(!r.ok) throw 0; const j=await r.json(); AIDX=(j&&typeof j==="object")?j:{}; }
  catch(_){ AIDX={}; }
  tapeCache.clear();
  return AIDX;
})();
const audioInfo = id => (AIDX && AIDX[id] && typeof AIDX[id]==="object") ? AIDX[id] : null;
/* entrada v2: { durationMs, bloquesMs } · entrada v3: { cintas:[{ n, titulo, url, durationMs, bloquesMs }] } */
const v2Audio = id => { const inf=audioInfo(id); return inf && !Array.isArray(inf.cintas) ? inf : null; };
const tapeAudio = id => { const inf=audioInfo(id); return inf && Array.isArray(inf.cintas) && inf.cintas.length ? inf.cintas : null; };
function scriptFor(id){
  if(scripts.has(id)) return scripts.get(id);
  const p=(async()=>{
    let j=null;
    try{
      const r=await fetch(`podcast/${encodeURIComponent(id)}.json`,{cache:"no-cache"});
      if(r.ok) j=await r.json();
    }catch(_){ j=null; }
    if(j && Array.isArray(j.cintas)){            // v3: una hoja por cinta
      j.v3=true;
      j.cintas=j.cintas.filter(c=>c && typeof c==="object").map((c,i)=>({n:+c.n||i+1, titulo:String(c.titulo||""), tipo:String(c.tipo||""),
        bloques:(Array.isArray(c.bloques)?c.bloques:[]).filter(b=>b && typeof b.texto==="string")})).sort((a,b)=>a.n-b.n);
    } else if(j && Array.isArray(j.bloques)){
      j.bloques=j.bloques.filter(b=>b && typeof b.texto==="string");
    } else j=null;
    scriptsDone.set(id,j); tapeCache.delete(id);
    return j;
  })();
  scripts.set(id,p);
  return p;
}
const fmt = ms => { ms=Math.max(0,ms|0); const s=Math.floor(ms/1000); return pad(Math.floor(s/60))+":"+pad(s%60); };
const fmtShort = ms => fmt(ms).replace(/^0(\d)/,"$1");
const durWords = ms => { const s=Math.round(ms/1000), m=Math.floor(s/60); return (m?m+" min ":"")+(s%60)+" s"; };

/* ---------- Cintas de un caso: une el guion v3 y la entrada v3 de audio/index.json ---------- */
const TIPO_CINTA={expediente:"Expediente",hallazgo:"El hallazgo",notas:"Notas del inspector",declaraciones:"Declaraciones",hemeroteca:"Hemeroteca",juicio:"El juicio",epilogo:"Lo que nunca se aclaró"};
const SHELLS=["#3b3733","#5b4635","#2f3a40","#4d2d29","#4f4c45"];
function isV3(id){ if(tapeAudio(id)) return true; const sc=scriptsDone.get(id); return !!(sc && sc.v3); }
/* url relativa a la página («audio/brady/cinta-1.ogg») o absoluta («https://…»); «asset:///» → relativa */
const tapeSrc = u => String(u||"").trim().replace(/^asset:\/\/\//i,"");
function tapesOf(id){
  if(tapeCache.has(id)) return tapeCache.get(id);
  const au=(tapeAudio(id)||[]).map((c,i)=>({c,n:+c.n||i+1})), sc=scriptsDone.get(id), sl=sc && sc.v3 ? sc.cintas : [];
  const ns=[...new Set([...au.map(x=>x.n),...sl.map(c=>c.n)])].sort((a,b)=>a-b);
  const list=ns.map(n=>{
    const a=(au.find(x=>x.n===n)||{}).c, s=sl.find(c=>c.n===n);
    return {n, titulo:String((a&&a.titulo)||(s&&s.titulo)||("Cinta "+n)), tipo:(s&&s.tipo)||"",
      url:a ? String(a.url||`audio/${id}/cinta-${n}.ogg`) : null, durationMs:a ? Math.max(0,+a.durationMs||0) : 0,
      bloquesMs:a && Array.isArray(a.bloquesMs) ? a.bloquesMs.map(Number) : null, bloques:s ? s.bloques : null};
  });
  if(AIDX!==null) tapeCache.set(id,list);
  return list;
}
const caseTitle = e => e.titulo_caso || e.a || ("Expediente de "+e.n);
const tapeLabel = (t,total) => total===1 ? `«${t.titulo}»` : `cinta ${t.n}: ${t.titulo}`;
function caseSpec(e,desde,posMs){
  return {id:e.id, titulo:caseTitle(e), subtitulo:e.title,
    cintas:tapesOf(e.id).filter(t=>t.url).map(t=>({n:t.n,titulo:t.titulo,url:t.url,durationMs:t.durationMs})),
    desde, posMs:Math.max(0,Math.round(posMs||0))};
}

/* ---------- Progreso: localStorage «tcc_progreso» = { id: { n, posMs, escuchadas:[n…], t } } ----------
   (t = cuándo se escuchó por última vez; sirve para el «Seguir escuchando» de la portada) */
const PROG_KEY="tcc_progreso";
let PROG={}, progTimer=0;
try{ const p=JSON.parse(localStorage.getItem(PROG_KEY)||"{}"); if(p && typeof p==="object" && !Array.isArray(p)) PROG=p; }catch(_){}
function progOf(id){
  const p=PROG[id]; if(!p || typeof p!=="object") return null;
  return {n:Math.max(1,+p.n||1), posMs:Math.max(0,+p.posMs||0), escuchadas:Array.isArray(p.escuchadas)?p.escuchadas.map(Number).filter(x=>x>0):[], t:+p.t||0};
}
function progWrite(){ clearTimeout(progTimer); progTimer=0; try{ localStorage.setItem(PROG_KEY,JSON.stringify(PROG)); }catch(_){} }
function progSet(id,p,now){
  PROG[id]={n:p.n, posMs:Math.round(p.posMs), escuchadas:p.escuchadas, t:Date.now()};
  if(now) progWrite(); else if(!progTimer) progTimer=setTimeout(progWrite,2500);
}
addEventListener("pagehide",()=>{ if(progTimer) progWrite(); });
document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="hidden" && progTimer) progWrite(); });
let trackPrev=null;
function trackProgress(){
  if(!PS.id || !PS.cintas || !PS.cinta){ trackPrev=null; return; }
  const id=PS.id, n=PS.cinta, old=progOf(id), done=new Set(old?old.escuchadas:[]), before=done.size;
  let now=!old || old.n!==n || !PS.playing;
  // una cinta cuenta como escuchada al llegar a su final (también la que acaba de salir en el cambio automático)
  if(!PS.cambiando && PS.durationMs>0 && (PS.ended || PS.positionMs>=PS.durationMs-2500)) done.add(n);
  if(trackPrev && trackPrev.id===id && trackPrev.n!==n && trackPrev.dur>0 && trackPrev.pos>=trackPrev.dur-2500) done.add(trackPrev.n);
  if(done.size!==before) now=true;
  // mientras carga, busca o suena la grabadora no se guarda la posición (llegaría un 0 provisional):
  // se conserva la guardada si es la misma cinta (p. ej. «Seguir escuchando» durante «insertar»)
  const busy=PS.buffering || (pendingSeek && pendingSeek.id===id);
  const pos=(PS.cambiando || busy) ? (old && old.n===n ? old.posMs : 0) : PS.positionMs;
  progSet(id,{n,posMs:pos,escuchadas:[...done].sort((a,b)=>a-b)},now);
  if(!PS.cambiando && !busy) trackPrev={id,n,pos:PS.positionMs,dur:PS.durationMs};
}
/* Dónde retomar: la cinta y el punto guardados; si esa cinta ya acabó, la siguiente sin escuchar;
   si se escucharon todas, desde la primera («again»). */
function resumeFrom(id,tapes){
  const pl=tapes.filter(t=>t.url), ns=pl.map(t=>t.n); if(!ns.length) return null;
  const p=progOf(id); if(!p) return {n:ns[0],posMs:0,kind:"start"};
  const done=new Set(p.escuchadas), all=ns.every(n=>done.has(n)), t=pl.find(x=>x.n===p.n);
  if(t){
    const near=t.durationMs>0 && p.posMs>=t.durationMs-2500;
    if(!near && (!done.has(p.n) || p.posMs>1500 || (all && p.n!==ns[ns.length-1]))) return {n:p.n,posMs:p.posMs,kind:"resume"};
  }
  if(!all){ const nx=ns.find(n=>n>p.n && !done.has(n)); return {n:nx!=null?nx:ns.find(n=>!done.has(n)),posMs:0,kind:"resume"}; }
  return {n:ns[0],posMs:0,kind:"again"};
}
function tapeStatus(id,n){
  const p=progOf(id);
  if(p && p.escuchadas.includes(n)) return "done";
  if(PS.id===id && PS.cintas && PS.cinta===n && !PS.cambiando && PS.positionMs>1500) return "half";
  if(p && p.n===n && p.posMs>1500) return "half";
  return "new";
}

/* ---------- Reproductor: nativo (TCCNative) o <audio> en el navegador ---------- */
const PS={id:null,titulo:"",subtitulo:"",playing:false,buffering:false,ended:false,positionMs:0,durationMs:0,cinta:null,cintas:0,cintaTitulo:"",cambiando:false,expulsando:false};
const NATIVE_TAPES = !!(NATIVE && typeof NATIVE.playCase==="function");
/* Motor que suena: el nativo o <audio>. Dentro de una app sin cintas nativas (versión anterior), las cintas suenan en la página. */
let engine = NATIVE ? "native" : "web";
const useNative = () => !!NATIVE && engine==="native";
let pendingSeek=null, webAudio=null, webMeta={id:null,titulo:"",subtitulo:""}, webT=null, webSfx={}, lastStateAt=0;
function onPlayerState(s){
  s=parseMaybe(s); if(!s) return;
  PS.id = s.id ? String(s.id) : null;
  PS.titulo = s.titulo||""; PS.subtitulo = s.subtitulo||"";
  PS.playing = !!s.playing; PS.buffering = !!s.buffering; PS.ended = !!s.ended;
  PS.positionMs = Math.max(0,+s.positionMs||0); PS.durationMs = Math.max(0,+s.durationMs||0);
  PS.cintas = PS.id ? Math.max(0,+s.cintas||0) : 0;
  PS.cinta = PS.cintas ? (+s.cinta||1) : null;
  PS.cintaTitulo = PS.cintas ? String(s.cintaTitulo||"") : "";
  PS.cambiando = !!(PS.cintas && s.cambiando);
  PS.expulsando = !!(PS.cintas && s.expulsando);   // suena «stop y expulsar»: la cinta sale
  if(PS.cintas){
    const t=tapesOf(PS.id).find(x=>x.n===PS.cinta);
    if(t){ if(!PS.durationMs) PS.durationMs=t.durationMs; if(!PS.cintaTitulo) PS.cintaTitulo=t.titulo; }
  } else if(PS.id && !PS.durationMs){ const inf=v2Audio(PS.id); if(inf) PS.durationMs=+inf.durationMs||0; }
  lastStateAt=Date.now();
  if(pendingSeek){
    if(PS.id!==pendingSeek.id || Date.now()-pendingSeek.t>8000) pendingSeek=null;
    else if(pendingSeek.cinta!=null && (PS.cinta!==pendingSeek.cinta || PS.cambiando)){ /* aún está entrando la cinta */ }
    else if(!PS.buffering && Math.abs(PS.positionMs-pendingSeek.ms)>2500){ const ms=pendingSeek.ms; pendingSeek=null; Player.seekTo(ms); }
    else if(Math.abs(PS.positionMs-pendingSeek.ms)<=2500) pendingSeek=null;
  }
  trackProgress();
  playerUI();
}
window.TCC_onPlayerState = function(state){ try{ if(engine==="native") onPlayerState(state); }catch(err){ console.warn("TCC_onPlayerState:",err); } };
function webEmit(){
  const a=webAudio; if(!a || engine!=="web") return;
  if(webT){
    // mientras suena un sonido de la grabadora (T.sfx) la cinta que entra está a 0
    const T=webT, t=T.list[T.k]||{}, fx=!!T.sfx, ch=T.sfx==="cambio", ex=T.sfx==="expulsar";
    const dur = !fx && isFinite(a.duration) && a.duration>0 ? Math.round(a.duration*1000) : (+t.durationMs||0);
    // al expulsar, la cinta que sale: entera si acabó o el punto donde se expulsó
    const pos = ex ? (T.ejectPos!=null ? Math.min(T.ejectPos,dur||T.ejectPos) : dur) : fx ? 0 : T.pos!=null ? T.pos : Math.round((a.currentTime||0)*1000);
    onPlayerState({id:webMeta.id,titulo:webMeta.titulo,subtitulo:webMeta.subtitulo,
      playing: fx ? !T.paused : (!a.paused && !a.ended), buffering: T.sfx==="insertar" || (!fx && !a.paused && a.readyState<3), ended:T.ended,
      positionMs:pos, durationMs:dur, cinta:t.n, cintas:T.list.length, cintaTitulo:t.titulo||"", cambiando:ch, expulsando:ex});
    return;
  }
  const inf=v2Audio(webMeta.id);
  onPlayerState({id:webMeta.id,titulo:webMeta.titulo,subtitulo:webMeta.subtitulo,playing:!!webMeta.id && !a.paused && !a.ended,
    buffering:!!webMeta.id && !a.paused && a.readyState<3,ended:a.ended,positionMs:Math.round((a.currentTime||0)*1000),
    durationMs:isFinite(a.duration)&&a.duration>0?Math.round(a.duration*1000):(inf?+inf.durationMs||0:0)});
}
function getWebAudio(){
  if(webAudio) return webAudio;
  webAudio=document.createElement("audio"); webAudio.preload="metadata"; webAudio.volume=tapeVol;
  ["play","pause","timeupdate","waiting","playing","seeked","durationchange"].forEach(ev=>webAudio.addEventListener(ev,webEmit));
  webAudio.addEventListener("loadedmetadata",()=>{ if(webT && webT.pos!=null){ try{ webAudio.currentTime=webT.pos/1000; }catch(_){} webT.pos=null; } webEmit(); });
  webAudio.addEventListener("ended",()=>{ if(webT) webTapeEnded(); else webEmit(); });
  webAudio.addEventListener("error",()=>{ if(webMeta.id){ console.warn("No se pudo cargar el audio de",webMeta.id); } webEmit(); });
  return webAudio;
}
/* sonidos de la grabadora (contrato 7.3): meter la cinta al empezar y cambio entre cintas */
const WEB_SFX={insertar:"sfx/insertar-cinta.ogg", cambio:"sfx/cambio-cinta.ogg", expulsar:"sfx/expulsar-cinta.ogg"};
function getWebSfx(kind){
  let s=webSfx[kind];
  if(!s){ s=webSfx[kind]=document.createElement("audio"); s.preload="auto"; s.src=WEB_SFX[kind]; }
  s.volume=tapeVol;
  return s;
}
function webPlay(){
  const a=getWebAudio(), p=a.play();
  if(p && p.catch) p.catch(err=>{ if(err && err.name!=="AbortError") console.warn("Reproducción no iniciada:",err); webEmit(); });
  webEmit();
}
function webStopSfx(){ Object.values(webSfx).forEach(s=>{ s.onended=s.onerror=null; try{ s.pause(); }catch(_){} }); }
function webReset(){
  if(webT) clearTimeout(webT.timer);
  webT=null; webStopSfx();
  if(webAudio){ webAudio.pause(); webMeta={id:null,titulo:"",subtitulo:""}; webAudio.removeAttribute("src"); try{ webAudio.load(); }catch(_){} }
}
/* Cintas en <audio>: misma lógica que el reproductor nativo (contrato 7.3 y 7.4) */
function webTapesStart(spec){
  const list=(spec.cintas||[]).map(c=>({n:+c.n,titulo:String(c.titulo||""),url:c.url,durationMs:+c.durationMs||0}));
  if(!list.length) return;
  const k=Math.max(0,list.findIndex(c=>c.n===+spec.desde)), pos=Math.max(0,+spec.posMs||0);
  getWebSfx("insertar"); getWebSfx("cambio"); getWebSfx("expulsar");   // se cargan ya para que suenen a tiempo
  if(webT && webMeta.id===spec.id){                           // caso ya cargado: salta a la cinta sin recargar la lista
    webT.list=list;
    if(webT.ended || webT.sfx==="expulsar"){ webGoTape(k,pos,"insertar"); return; }   // la cinta estaba fuera: se mete
    if(k===webT.k && !webT.sfx){ webT.ended=false; if(pos){ try{ getWebAudio().currentTime=pos/1000; }catch(_){} } webPlay(); }
    else webGoTape(k,pos,k!==webT.k?"cambio":null);
    return;
  }
  webReset();
  webMeta={id:spec.id,titulo:spec.titulo||"",subtitulo:spec.subtitulo||""};
  webT={list,k,sfx:null,paused:false,ended:false,pos:null,timer:0,go:null};
  webGoTape(k,pos,"insertar");                                 // meter la cinta y «play»
}
function webLoadTape(k,posMs){
  const T=webT, t=T && T.list[k]; if(!t) return;
  T.k=k; T.sfx=null; T.paused=false; T.ended=false; T.pos=posMs>0?posMs:null;
  getWebAudio().src=tapeSrc(t.url);
  webPlay();
}
/* pasa a la cinta k; kind = "insertar", "cambio" o null (sin sonido de la grabadora) */
function webGoTape(k,posMs,kind){
  const T=webT; if(!T) return;
  k=Math.max(0,Math.min(T.list.length-1,k));
  clearTimeout(T.timer); webStopSfx();
  if(!kind){ webLoadTape(k,posMs); return; }
  const a=getWebAudio(), s=getWebSfx(kind);
  a.pause();
  T.k=k; T.sfx=kind; T.paused=false; T.ended=false; T.pos=posMs>0?posMs:null;
  const go=()=>{ if(webT!==T || T.sfx!==kind || T.paused) return; clearTimeout(T.timer); s.onended=s.onerror=null; webLoadTape(T.k,T.pos||0); };
  T.go=go;
  s.onended=go;
  s.onerror=()=>{ clearTimeout(T.timer); T.timer=setTimeout(go,700); };   // sin el sonido: una pausa breve
  try{ s.currentTime=0; }catch(_){}
  const p=s.play(); if(p && p.catch) p.catch(()=>{ clearTimeout(T.timer); T.timer=setTimeout(go,kind==="cambio"?2200:1400); });
  T.timer=setTimeout(go,5000);                                           // por si el sonido no avisa al terminar
  webEmit();
}
function webTapeEnded(){
  const T=webT; if(!T) return;
  if(T.k<T.list.length-1) webGoTape(T.k+1,0,"cambio");
  else webEjectSound(T,()=>{ T.sfx=null; T.ended=true; webEmit(); });   // la última: «stop y expulsar»
}
/* «stop y expulsar» (contrato 7.3); al acabar, fin() */
function webEjectSound(T,fin){
  clearTimeout(T.timer); webStopSfx();
  const a=getWebAudio(), s=getWebSfx("expulsar");
  a.pause(); T.sfx="expulsar"; T.paused=false;
  let hecho=false;
  const go=()=>{ if(hecho || webT!==T) return; hecho=true; clearTimeout(T.timer); s.onended=s.onerror=null; fin(); };
  s.onended=go; s.onerror=()=>{ clearTimeout(T.timer); T.timer=setTimeout(go,500); };
  try{ s.currentTime=0; }catch(_){}
  const p=s.play(); if(p && p.catch) p.catch(()=>{ clearTimeout(T.timer); T.timer=setTimeout(go,900); });
  T.timer=setTimeout(go,3000);
  webEmit();
}
/* botón de expulsar en el navegador: suena, la cinta sale y se para */
function webEject(){
  const T=webT; if(!T) return;
  if(T.sfx!=="expulsar") T.ejectPos = T.sfx ? 0 : Math.round((getWebAudio().currentTime||0)*1000);
  webEjectSound(T,()=>{ webReset(); onPlayerState({id:null,playing:false,positionMs:0,durationMs:0}); });
}
const Player={
  play(id,titulo,subtitulo){                                  // episodio único (v2)
    if(NATIVE){ engine="native"; webReset(); nat("play",id,titulo,subtitulo); pullPlayer(); setTimeout(pullPlayer,350); return; }
    const a=getWebAudio();
    if(webT || webMeta.id!==id){ webReset(); webMeta={id,titulo,subtitulo}; a.src=`audio/${encodeURIComponent(id)}.ogg`; }
    if(a.ended) a.currentTime=0;
    webPlay();
  },
  playCase(spec){                                             // caso en cintas (v3)
    if(NATIVE_TAPES){ engine="native"; webReset(); nat("playCase",JSON.stringify(spec)); pullPlayer(); setTimeout(pullPlayer,350); return; }
    if(NATIVE && engine==="native"){ nat("stop"); engine="web"; }
    webTapesStart(spec);
  },
  playTape(n){
    if(useNative()){ nat("playTape",n); pullPlayer(); setTimeout(pullPlayer,350); return; }
    if(webT){ const k=webT.list.findIndex(c=>c.n===n); if(k>=0) webGoTape(k,0,k!==webT.k?"cambio":null); }
  },
  nextTape(){ bayHint=null; if(useNative()){ nat("nextTape"); pullPlayer(); return; } if(webT && webT.k<webT.list.length-1) webGoTape(webT.k+1,0,"cambio"); },
  prevTape(){ bayHint=null; if(useNative()){ nat("prevTape"); pullPlayer(); return; } if(webT && webT.k>0) webGoTape(webT.k-1,0,"cambio"); },
  pause(){
    if(useNative()){ nat("pause"); pullPlayer(); return; }
    if(webT && webT.sfx){ webT.paused=true; clearTimeout(webT.timer); getWebSfx(webT.sfx).pause(); webEmit(); return; }
    if(webAudio) webAudio.pause();
  },
  resume(){
    if(useNative()){ nat("resume"); pullPlayer(); return; }
    if(webT && webT.sfx){
      const T=webT; T.paused=false; clearTimeout(T.timer);
      const p=getWebSfx(T.sfx).play(); if(p && p.catch) p.catch(()=>{ clearTimeout(T.timer); T.timer=setTimeout(T.go,600); });
      T.timer=setTimeout(T.go,5000); webEmit(); return;
    }
    if(webAudio){ const p=webAudio.play(); if(p&&p.catch) p.catch(()=>{}); }
  },
  eject(){                                                    // expulsar la cinta: suena y luego para
    bayHint=null;
    if(useNative()){
      if(NATIVE && typeof NATIVE.ejectTape==="function"){ nat("ejectTape"); pullPlayer(); setTimeout(pullPlayer,350); }
      else { nat("stop"); pullPlayer(); }
      return;
    }
    if(webT) webEject(); else this.stop();
  },
  stop(){
    bayHint=null;
    if(useNative()){ nat("stop"); pullPlayer(); return; }
    webReset();
    onPlayerState({id:null,playing:false,positionMs:0,durationMs:0});
    if(NATIVE) engine="native";
  },
  seekTo(ms){
    ms=Math.max(0,Math.round(ms));
    if(useNative()){ nat("seekTo",ms); PS.positionMs=ms; playerUI(true); return; }
    if(webT && webT.sfx){ webT.pos=ms; return; }
    if(webAudio){ webAudio.currentTime=ms/1000; webEmit(); }
  },
  seekBy(d){
    if(useNative()){ nat("seekBy",Math.round(d)); PS.positionMs=Math.max(0,Math.min(PS.durationMs||Infinity,PS.positionMs+d)); playerUI(true); return; }
    if(webT && webT.sfx) return;
    if(webAudio){ const dur=isFinite(webAudio.duration)?webAudio.duration:Infinity; webAudio.currentTime=Math.max(0,Math.min(dur-0.25,webAudio.currentTime+d/1000)); webEmit(); }
  }
};
function pullPlayer(){ if(engine!=="native") return; const s=parseMaybe(nat("getPlayerState")); if(s) onPlayerState(s); }
async function startCase(e,fromMs){
  const sc=await Promise.race([scriptFor(e.id),new Promise(r=>setTimeout(()=>r(null),900))]);
  const titulo=(sc&&sc.titulo)||("Expediente de "+e.n), sub=e.n;
  Player.play(e.id,titulo,sub);
  if(fromMs!=null){ pendingSeek={id:e.id,ms:fromMs,t:Date.now()}; Player.seekTo(fromMs); }
}
function togglePlay(e){
  if(!v2Audio(e.id)) return;
  if(PS.id===e.id){
    if(PS.ended){ Player.play(e.id,PS.titulo,PS.subtitulo); Player.seekTo(0); }
    else if(PS.playing) Player.pause(); else Player.resume();
  } else startCase(e);
}
/* Mete la cinta n del caso e en la grabadora (arrastre, toque, «Seguir escuchando», lectura…).
   posMs indefinido: desde donde se quedó esa cinta. */
let bayHint=null;
function playTapeOf(e,n,posMs){
  const t=tapesOf(e.id).find(x=>x.n===n); if(!t || !t.url) return;
  const mine=PS.id===e.id && PS.cintas>0;
  if(!bayHint || bayHint.id!==e.id || bayHint.n!==n) bayHint={id:e.id,n,t:Date.now(),mode:""};
  if(mine && !posMs){
    if(PS.cinta===n && !PS.ended){ if(!PS.playing && !PS.cambiando) Player.resume(); }
    else Player.playTape(n);
  } else {
    if(posMs==null){ const p=progOf(e.id); posMs = p && p.n===n && !p.escuchadas.includes(n) ? p.posMs : 0; }
    Player.playCase(caseSpec(e,n,posMs));
    if(mine && posMs>0 && engine==="native") pendingSeek={id:e.id,cinta:n,ms:posMs,t:Date.now()};
  }
  playerUI(true);
}
/* «Pulsar play» cuando el caso cargado ya terminó: desde la primera cinta (o el episodio desde el principio) */
function restartPlaying(){
  const e=BY[PS.id];
  if(PS.cintas && e){ const tp=tapesOf(e.id).filter(t=>t.url); if(tp.length) playTapeOf(e,tp[0].n,0); return; }
  Player.play(PS.id,PS.titulo,PS.subtitulo); Player.seekTo(0);
}

/* ---------- Interfaz del reproductor (grabadora + minirreproductor) ---------- */
let deckSeen=false, scrubbing=null, lastP={deck:-1,mini:-1}, nowBlock=null, userScrollAt=0, lastPSid;
function setProgress(el,p,key,smooth){
  const prev=lastP[key]; lastP[key]=p;
  const sm = smooth && prev>=0 && p>=prev && p-prev<0.03;
  el.classList.toggle("smooth",!!sm);
  el.style.setProperty("--tt",(useNative()?1000:280)+"ms");
  el.style.setProperty("--p",p.toFixed(4));
}
function playerUI(jump){
  const deck=$("deck");
  if(deck && current){ if(deck.dataset.kind==="v3") tapeUI(deck,current,jump); else deckUI(deck,current,jump); }
  miniUI(jump);
  if(PS.id!==lastPSid){ lastPSid=PS.id; renderResumeSlip(); }
}
function deckUI(deck,e,jump){
  const mine = PS.id===e.id;
  const inf=v2Audio(e.id);
  const st = !inf ? "na" : !mine ? "idle" : PS.ended ? "ended" : PS.playing ? "playing" : "paused";
  deck.dataset.st=st;
  const dur = (mine && PS.durationMs) || (inf && +inf.durationMs) || 0;
  const pos = mine ? Math.min(PS.positionMs,dur||PS.positionMs) : 0;
  const p = dur ? Math.min(1,pos/dur) : 0;
  const key=deck.querySelector(".key.play"), lab=key.querySelector("span");
  const txt = st==="na"?"Audio en preparación": st==="playing"?"Pausa": st==="paused"?"Seguir": st==="ended"?"Escuchar de nuevo":"Escuchar el caso";
  if(lab.textContent!==txt) lab.textContent=txt;
  key.setAttribute("aria-label", st==="playing"?"Pausar":txt);
  deck.querySelectorAll(".key").forEach(k=>{ k.disabled = st==="na" || (k!==key && st==="idle"); });
  if(!scrubbing){
    setProgress(deck.querySelector(".scrub"),p,"deck",!jump && st==="playing");
    deck.querySelector(".t-pos").textContent=fmt(pos);
    const sl=deck.querySelector(".scrub"); sl.setAttribute("aria-valuenow",Math.round(pos/1000)); sl.setAttribute("aria-valuetext",fmt(pos)+" de "+fmt(dur)); sl.setAttribute("aria-valuemax",Math.round(dur/1000));
  }
  deck.querySelector(".t-dur").textContent=dur?fmt(dur):"--:--";
  setCounter(deck,pos);
  deck.querySelectorAll(".reel .pack").forEach((pk,i)=>pk.style.setProperty("--k",(i===0?0.95-0.55*p:0.4+0.55*p).toFixed(3)));
  highlightBlock(mine ? blockAt(e.id,pos) : -1);
}
function setCounter(deck,pos){
  const s=Math.floor(pos/1000), digits=pad(Math.floor(s/60)%100)+pad(s%60);
  deck.querySelectorAll(".counter i").forEach((d,i)=>{ if(d.textContent!==digits[i]) d.textContent=digits[i]; });
}
function miniUI(jump){
  const mini=$("mini"), mine = current && PS.id===current.id;
  const sheetOpen=$("sheet").classList.contains("on");
  const show = !!PS.id && (!sheetOpen || !mine || !deckSeen);
  mini.classList.toggle("on",show);
  document.body.classList.toggle("has-mini",show);
  mini.classList.toggle("playing",PS.playing && !PS.cambiando);
  mini.classList.toggle("changing",PS.cambiando);
  if(!PS.id) return;
  const e=BY[PS.id];
  if(PS.cintas){
    $("miniTitle").textContent=PS.cintas===1 ? PS.cintaTitulo : `Cinta ${PS.cinta}/${PS.cintas} · ${PS.cintaTitulo}`;
    $("miniSub").textContent=PS.expulsando ? "Expulsando la cinta…" : PS.cambiando ? "Cambiando de cinta…" : (PS.subtitulo||(e?e.title:""))+(PS.durationMs?" · "+fmt(PS.positionMs)+" / "+fmt(PS.durationMs):"");
  } else {
    $("miniTitle").textContent=PS.titulo||(e?("Expediente de "+e.n):PS.id);
    $("miniSub").textContent=(PS.subtitulo||(e?e.n:""))+(PS.durationMs?" · "+fmt(PS.positionMs)+" / "+fmt(PS.durationMs):"");
  }
  $("miniToggle").setAttribute("aria-label",PS.playing?"Pausar":"Reproducir");
  setProgress(mini,!PS.cambiando && PS.durationMs?Math.min(1,PS.positionMs/PS.durationMs):0,"mini",!jump&&PS.playing&&!PS.cambiando);
}
function blockAt(id,pos){
  const inf=v2Audio(id); const b=inf&&Array.isArray(inf.bloquesMs)?inf.bloquesMs:null; if(!b||!b.length) return -1;
  let i=-1; for(let k=0;k<b.length;k++){ if(b[k]<=pos+150) i=k; else break; } return i;
}
function blockAtTape(t,pos){
  const b=t && t.bloquesMs; if(!b || !b.length) return -1;
  let i=-1; for(let k=0;k<b.length;k++){ if(b[k]<=pos+150) i=k; else break; } return i;
}
/* resalta el bloque i (de la hoja de la cinta c, en v3) y sigue la lectura si el usuario la estaba siguiendo */
let followNext=false;
function highlightBlock(i,c){
  const tr=$("transcript"); if(!tr){ nowBlock=null; return; }
  const key = i<0 ? "-" : (c==null?"":c+":")+i;
  if(key===nowBlock) return;
  const body=$("pBody"), br=body.getBoundingClientRect();
  const old=tr.querySelector(".blk.now");
  let following=followNext; followNext=false;
  if(old){ const r=old.getBoundingClientRect(); following = following || (r.height>0 && r.bottom>br.top && r.top<br.bottom); old.classList.remove("now"); old.removeAttribute("aria-current"); }
  nowBlock=key;
  if(i<0) return;
  const blk=tr.querySelector(c==null ? `.blk[data-i="${i}"]` : `.tr-pane[data-n="${c}"] .blk[data-i="${i}"]`); if(!blk) return;
  blk.classList.add("now"); blk.setAttribute("aria-current","true");
  if(following && !tr.hidden && !blk.closest("[hidden]") && PS.playing && Date.now()-userScrollAt>1500){
    const r=blk.getBoundingClientRect(), miniH=$("mini").classList.contains("on")?70:0;
    if(r.top<br.top+30 || r.bottom>br.bottom-miniH-30) body.scrollTo({top:body.scrollTop+(r.top-br.top)-br.height*.25,behavior:reduced()?"auto":"smooth"});
  }
}
$("miniToggle").onclick=()=>{ if(!PS.id) return; if(PS.ended) restartPlaying(); else if(PS.playing) Player.pause(); else Player.resume(); };
$("miniStop").onclick=()=>Player.stop();
$("miniOpen").onclick=()=>{
  if(!PS.id||!BY[PS.id]) return;
  if(current && current.id===PS.id){ const d=$("deck"); if(d) d.scrollIntoView({behavior:reduced()?"auto":"smooth",block:"center"}); }
  else openP(PS.id);
};

/* ---------- Grabadora de la versión 2 (episodio único) ---------- */
function deckHtml(e){
  return `<section class="deck" id="deck" data-kind="v2" data-st="idle" aria-label="Escuchar el caso">
    <span class="dymo"><span aria-hidden="true">${"ESCUCHAR EL CASO".split("").map(c=>c===" "?"<i></i>":`<b>${c}</b>`).join("")}</span><span class="sr">Escuchar el caso</span></span>
    <div class="recorder">
      <div class="cassette" aria-hidden="true">
        <div class="cs-label"><span class="cs-a">A</span><span class="cs-t" id="csTitle">${esc(e.a||e.title)}</span>
          <div class="cs-win"><span class="reel"><i class="pack"></i>${ICO.reel}</span><span class="reel"><i class="pack"></i>${ICO.reel}</span></div>
          <span class="cs-n">Exp. ${expNo(e)} · ${esc(e.n)}</span></div>
        <span class="na-note">Audio en preparación</span>
      </div>
      <div class="counter" aria-hidden="true"><i>0</i><i>0</i><i>0</i><i>0</i></div>
      <div class="keys">
        <button class="key" data-k="back" aria-label="Retroceder 15 segundos">${ICO.rew}<small>15</small></button>
        <button class="key play" data-k="play" aria-label="Escuchar el caso">${ICO.play}${ICO.pause}<span>Escuchar el caso</span></button>
        <button class="key" data-k="fwd" aria-label="Avanzar 30 segundos"><small>30</small>${ICO.ff}</button>
      </div>
    </div>
    <div class="scrub" role="slider" tabindex="0" aria-label="Posición de la grabación" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0"><div class="scrub-track"><i class="scrub-fill"></i></div><div class="scrub-head"><i></i></div></div>
    <div class="times"><span class="t-pos">00:00</span><span class="t-dur">--:--</span></div>
    <div class="deck-actions"><button class="readbtn" id="readBtn" aria-expanded="false" aria-controls="transcript" disabled>${ICO.read}<span>Leer el caso</span></button><span class="hint" id="deckHint"></span></div>
  </section>
  <section class="transcript" id="transcript" hidden aria-label="Versión para leer"></section>`;
}
const podcastHtml = e => `<div id="podcast">${isV3(e.id)?tapeDeckHtml(e):deckHtml(e)}</div>`;
function wirePodcast(e){ const d=$("deck"); if(!d) return; if(d.dataset.kind==="v3") wireTapeDeck(e); else wireDeck(e); }
/* barra de progreso táctil, común a las dos grabadoras: durOf() y seek(ms) dependen de cada una */
function wireScrub(deck,canUse,durOf,seek,keyStep){
  const sl=deck.querySelector(".scrub");
  const frac=ev=>{ const r=sl.getBoundingClientRect(); return Math.max(0,Math.min(1,(ev.clientX-r.left)/r.width)); };
  const preview=f=>{ sl.classList.remove("smooth"); sl.style.setProperty("--p",f.toFixed(4)); deck.querySelector(".t-pos").textContent=fmt(f*durOf()); };
  sl.addEventListener("pointerdown",ev=>{ if(!canUse()) return; scrubbing={f:frac(ev)}; try{sl.setPointerCapture(ev.pointerId);}catch(_){} preview(scrubbing.f); ev.preventDefault(); });
  sl.addEventListener("pointermove",ev=>{ if(!scrubbing) return; scrubbing.f=frac(ev); preview(scrubbing.f); });
  sl.addEventListener("pointerup",()=>{ if(!scrubbing) return; const ms=scrubbing.f*durOf(); scrubbing=null; lastP.deck=-1; seek(ms); });
  sl.addEventListener("pointercancel",()=>{ scrubbing=null; playerUI(true); });
  sl.addEventListener("keydown",ev=>{
    if(!keyStep()) return;
    if(ev.key==="ArrowRight"){ Player.seekBy(5000); ev.preventDefault(); }
    else if(ev.key==="ArrowLeft"){ Player.seekBy(-5000); ev.preventDefault(); }
  });
}
function wireReadBtn(){
  $("readBtn").onclick=()=>{
    const tr=$("transcript"), open=tr.hidden;
    tr.hidden=!open; $("readBtn").setAttribute("aria-expanded",open);
    $("readBtn").querySelector("span").textContent=open?"Ocultar la lectura":"Leer el caso";
    if(open){
      // en v3 se abre la hoja de la cinta que suena
      if(tr.querySelector(".tr-tabs") && current && PS.id===current.id && PS.cintas && tr.querySelector(`.tr-tab[data-n="${PS.cinta}"]`)) selectTab(PS.cinta);
      nowBlock=null; playerUI(true); tr.scrollIntoView({behavior:reduced()?"auto":"smooth",block:"start"});
    }
  };
}
let deckIO=null;
function observeDeck(el){
  if(deckIO){ deckIO.disconnect(); deckIO=null; }
  if(!el) return;
  if(window.IntersectionObserver){
    const io=new IntersectionObserver(en=>{ if(io!==deckIO) return; deckSeen=en[en.length-1].isIntersecting; playerUI(true); },{root:$("pBody"),threshold:.15});
    io.observe(el); observers.push(io); deckIO=io;
  } else deckSeen=true;
}
function wireDeck(e){
  const deck=$("deck"); if(!deck) return;
  deck.querySelector('[data-k="play"]').onclick=()=>togglePlay(e);
  deck.querySelector('[data-k="back"]').onclick=()=>{ if(PS.id===e.id) Player.seekBy(-15000); };
  deck.querySelector('[data-k="fwd"]').onclick=()=>{ if(PS.id===e.id) Player.seekBy(30000); };
  const durOf=()=>(PS.id===e.id&&PS.durationMs)||(v2Audio(e.id)&&+v2Audio(e.id).durationMs)||0;
  wireScrub(deck,()=>!!v2Audio(e.id),durOf,ms=>{ if(PS.id===e.id) Player.seekTo(ms); else startCase(e,ms); },()=>PS.id===e.id);
  wireReadBtn();
  $("transcript").addEventListener("click",ev=>{
    const b=ev.target.closest(".blk"); if(!b || ev.target.closest("a")) return;
    seekToBlock(e,+b.dataset.i);
  });
  $("transcript").addEventListener("keydown",ev=>{ if((ev.key==="Enter"||ev.key===" ") && ev.target.classList.contains("blk")){ ev.preventDefault(); seekToBlock(e,+ev.target.dataset.i); } });
  observeDeck(deck);
}
function seekToBlock(e,i){
  const inf=v2Audio(e.id); const b=inf&&Array.isArray(inf.bloquesMs)?inf.bloquesMs:null;
  if(!b || b[i]==null) return;
  if(PS.id===e.id){ Player.seekTo(b[i]); if(!PS.playing){ if(PS.ended){ Player.play(e.id,PS.titulo,PS.subtitulo); Player.seekTo(b[i]); } else Player.resume(); } }
  else startCase(e,b[i]);
  highlightBlock(i);
}
async function fillPodcast(e){
  const [sc]=await Promise.all([scriptFor(e.id),audioIdxReady]);
  if(current!==e || !$("deck")) return;
  const want=isV3(e.id)?"v3":"v2";
  if($("deck").dataset.kind!==want){ $("podcast").innerHTML = want==="v3" ? tapeDeckHtml(e) : deckHtml(e); wirePodcast(e); }
  if(want==="v3"){ fillTapes(e); return; }
  const inf=v2Audio(e.id);
  if(sc && sc.titulo) $("csTitle").textContent=sc.titulo;
  const hint=$("deckHint"), rb=$("readBtn");
  rb.disabled=!sc;
  hint.textContent = !sc && !inf ? "Guion y audio en preparación" : !sc ? "Transcripción en preparación" : !inf ? "Puedes leerlo mientras se graba el audio" : "";
  const tr=$("transcript");
  if(sc){
    const seek=!!(inf && Array.isArray(inf.bloquesMs));
    tr.classList.toggle("seekable",seek);
    tr.innerHTML=`<div class="tr-h">Transcripción de la cinta · Exp. ${expNo(e)}</div><div class="tr-t">${esc(sc.titulo||e.n)}</div>`+
      `<p class="tr-legend">Texto mecanografiado: Ximena, narradora. Notas a mano: Álvaro, copresentador.${seek?" Toca un párrafo para escucharlo desde ahí.":""}</p>`+
      sc.bloques.map((b,i)=>b.voz==="alvaro"
        ? `<p class="blk al" data-i="${i}"${seek?' tabindex="0"':""}><span class="who">Álvaro</span>${esc(b.texto)}</p>`
        : `<p class="blk xi" data-i="${i}"${seek?' tabindex="0"':""}>${esc(b.texto)}</p>`).join("");
  } else {
    tr.innerHTML=`<p class="tr-na">La transcripción de este caso todavía está en preparación.</p>`;
  }
  nowBlock=null;
  playerUI(true);
}

/* =====================================================================
   CAJA DE CINTAS (versión 3): caja de pruebas + grabadora con ranura
   Arrastrar un casete a la grabadora (Pointer Events) o tocarlo lo mete y suena.
   ===================================================================== */
const COARSE = window.matchMedia ? matchMedia("(pointer: coarse)").matches : false;
let bayN=null, boxSig="", lastTapeN=null, trSel=null, dragState=null, boxDirty=false;
function tapeDeckHtml(e){
  const dy="ESCUCHAR EL CASO".split("").map(c=>c===" "?"<i></i>":`<b>${c}</b>`).join("");
  return `<section class="deck tapes" id="deck" data-kind="v3" data-st="idle" aria-label="Escuchar el caso en cintas">
    <span class="dymo"><span aria-hidden="true">${dy}</span><span class="sr">Escuchar el caso</span></span>
    <div class="recorder" id="recorder" role="group" aria-label="Grabadora">
      <div class="bay" id="bay">
        <div class="bay-empty" aria-hidden="true"><span class="spindle"></span><span class="spindle"></span><em id="bayMsg">Mete aquí una cinta</em></div>
        <div class="bay-tape" id="bayTape" aria-hidden="true"></div>
        <span class="na-note">Audio en preparación</span>
      </div>
      <div class="counter" aria-hidden="true"><i>0</i><i>0</i><i>0</i><i>0</i></div>
      <button class="key eject" data-k="eject" aria-label="Expulsar la cinta y parar"><svg viewBox="0 0 16 16"><path d="M8 2.6l5.6 6.2H2.4zM2.6 11h10.8v2.4H2.6z"/></svg></button>
      <div class="keys">
        <button class="key sm" data-k="prev" aria-label="Cinta anterior"><svg viewBox="0 0 16 16"><path d="M2.4 2.6h2.2v10.8H2.4zM14 2.6v10.8L5.4 8z"/></svg></button>
        <button class="key sm" data-k="back" aria-label="Retroceder 15 segundos">${ICO.rew}<small>15</small></button>
        <button class="key play" data-k="play" aria-label="Escuchar el caso">${ICO.play}${ICO.pause}<span>Escuchar</span></button>
        <button class="key sm" data-k="fwd" aria-label="Avanzar 30 segundos"><small>30</small>${ICO.ff}</button>
        <button class="key sm" data-k="next" aria-label="Cinta siguiente"><svg viewBox="0 0 16 16"><path d="M11.4 2.6h2.2v10.8h-2.2zM2 2.6v10.8L10.6 8z"/></svg></button>
      </div>
    </div>
    <div class="scrub" role="slider" tabindex="0" aria-label="Posición en la cinta" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0"><div class="scrub-track"><i class="scrub-fill"></i></div><div class="scrub-head"><i></i></div></div>
    <div class="times"><span class="t-pos">00:00</span><span class="t-tape" id="tTape"></span><span class="t-dur">--:--</span></div>
    <button class="resume-btn" id="resumeBtn" hidden>${ICO.play}<span></span></button>
    <div class="tapebox" role="group" aria-labelledby="tbTitle">
      <div class="tb-lid"><span class="tb-st ink" id="tbTitle">Pruebas · Cintas</span><span class="tb-lab" id="tbLab">Exp. Nº ${expNo(e)}</span></div>
      <div class="tb-grid" id="tbGrid"></div>
      <p class="tb-help" id="tbHelp">${COARSE?"Toca una cinta para escucharla, o mantenla pulsada y arrástrala a la grabadora.":"Arrastra una cinta hasta la grabadora o haz clic en ella para escucharla."}</p>
    </div>
    <p class="tb-aviso">Reconstrucción narrada a partir de documentos públicos: las voces pertenecen al archivo, no a los protagonistas.</p>
    <div class="deck-actions"><button class="readbtn" id="readBtn" aria-expanded="false" aria-controls="transcript" disabled>${ICO.read}<span>Leer el caso</span></button><span class="hint" id="deckHint"></span></div>
    <span class="sr" aria-live="polite" id="tapeLive"></span>
  </section>
  <section class="transcript tapes" id="transcript" hidden aria-label="Versión para leer"></section>`;
}
function cassetteHtml(e,t,total){
  return `<div class="cassette" data-n="${t.n}" style="--shell:${SHELLS[(t.n-1)%SHELLS.length]}"><div class="cs-label"><span class="cs-a">${t.n}</span><span class="cs-t">${esc(t.titulo)}</span>
    <div class="cs-win"><span class="reel"><i class="pack"></i>${ICO.reel}</span><span class="reel"><i class="pack"></i>${ICO.reel}</span></div>
    <span class="cs-n">${total===1?"Cinta única":`Cinta ${t.n} de ${total}`} · ${esc(e.title)}</span></div></div>`;
}
/* la cinta que se ve en la grabadora: al cambiar, la anterior se expulsa y la nueva entra */
function bayShow(e,tapes,n,mode){
  const bay=$("bayTape"); if(!bay) return;
  if(bay.dataset.e===e.id && n===bayN) return;
  bay.dataset.e=e.id; bayN=n;
  const anim=!reduced();
  const old=bay.querySelector(".cassette:not(.out)");
  if(old){ if(anim){ old.classList.remove("in","late","drop"); old.classList.add("out"); setTimeout(()=>old.remove(),650); } else old.remove(); }
  $("bay").classList.toggle("full",n!=null);
  if(n==null) return;
  const t=tapes.find(x=>x.n===n); if(!t) return;
  bay.insertAdjacentHTML("beforeend",cassetteHtml(e,t,tapes.length));
  if(anim){ const c=bay.lastElementChild; c.classList.add("in"); if(mode==="drop") c.classList.add("drop"); else if(old) c.classList.add("late"); }
}
const ST_TXT={new:"Sin escuchar",half:"A medias",done:"Escuchada",na:"En preparación"};
function tapeBtnHtml(e,x,total,p){
  const t=x.t, half = x.st==="half" && p && p.n===t.n ? " · "+fmt(p.posMs) : "";
  const label=`${total===1?`Cinta «${t.titulo}»`:`Cinta ${t.n} de ${total}: ${t.titulo}`}. ${t.durationMs?durWords(t.durationMs)+". ":""}${ST_TXT[x.st]}${half}.${t.url?(COARSE?" Toca para meterla en la grabadora.":" Pulsa para meterla en la grabadora."):""}`;
  return `<div class="tb-slot${x.inDeck?" indeck":""}">${x.inDeck?`<span class="tb-gone" aria-hidden="true">En la grabadora</span>`:""}
    <button class="tc st-${x.st}" data-n="${t.n}" style="--shell:${SHELLS[(t.n-1)%SHELLS.length]};--r:${jitter(e.id+"c"+t.n,2).toFixed(2)}deg" aria-label="${esc(label)}"${x.inDeck?" hidden":""}${t.url?"":' aria-disabled="true"'}>
      <span class="tc-lab"><b class="tc-n">${t.n}</b><span class="tc-t">${esc(t.titulo)}</span><span class="tc-win" aria-hidden="true"><i></i><i></i></span></span>
      <span class="tc-foot"><span class="tc-d">${t.durationMs?fmtShort(t.durationMs):"--:--"}</span><span class="tc-s">${ST_TXT[x.st]}${half}</span></span>
      ${x.st==="done"?`<span class="tc-stamp ink" aria-hidden="true">Escuchada</span>`:""}
    </button></div>`;
}
function renderBox(e,tapes,shown){
  const grid=$("tbGrid"); if(!grid) return;
  const p=progOf(e.id);
  const items=tapes.map(t=>({t, st:t.url?tapeStatus(e.id,t.n):"na", inDeck:t.n===shown}));
  const sig=e.id+"|"+tapes.length+"|"+items.map(x=>x.t.n+x.st+(x.inDeck?"*":"")+(x.st==="half"&&!x.inDeck&&p&&p.n===x.t.n?Math.floor(p.posMs/1000):"")).join(",");
  if(sig===boxSig) return;
  if(dragState){ boxDirty=true; return; }                   // no se repinta en pleno arrastre
  boxSig=sig;
  const focusN = document.activeElement && document.activeElement.closest && document.activeElement.closest("#tbGrid .tc") ? +document.activeElement.dataset.n : null;
  grid.innerHTML=items.map(x=>tapeBtnHtml(e,x,tapes.length,p)).join("");
  if(focusN!=null){ const b=grid.querySelector(`.tc[data-n="${focusN}"]:not([hidden])`); if(b) b.focus({preventScroll:true}); }
}
function tapeUI(deck,e,jump){
  const tapes=tapesOf(e.id), playable=tapes.filter(t=>t.url);
  const mine = PS.id===e.id && PS.cintas>0;
  const res = resumeFrom(e.id,tapes);
  const st = !playable.length ? "na" : !mine ? "idle" : PS.expulsando ? "ejecting" : PS.cambiando ? "changing" : PS.ended ? "ended" : PS.playing ? "playing" : "paused";
  deck.dataset.st=st;
  if(bayHint && (bayHint.id!==e.id || Date.now()-bayHint.t>4000 || (mine && PS.cinta===bayHint.n))){
    if(mine && bayHint.id===e.id && PS.cinta===bayHint.n && bayN!==PS.cinta) bayShow(e,tapes,PS.cinta,bayHint.mode);
    bayHint=null;
  }
  const shown = bayHint ? bayHint.n : (mine && !PS.expulsando && !PS.ended) ? PS.cinta : null;
  bayShow(e,tapes,shown,bayHint?bayHint.mode:"");
  renderBox(e,tapes,shown);
  const cur = shown!=null ? tapes.find(t=>t.n===shown) : null;
  const ref = cur || (res && tapes.find(t=>t.n===res.n)) || tapes[0];
  // teclas
  const key=deck.querySelector(".key.play"), lab=key.querySelector("span");
  const idleTxt = !res ? "Escuchar" : res.kind==="resume" ? "Seguir" : res.kind==="again" ? "De nuevo" : "Escuchar";
  const txt = st==="na"?"Escuchar": (st==="playing"||st==="changing"||st==="ejecting")?"Pausa": st==="paused"?"Seguir": st==="ended"?"De nuevo": idleTxt;
  if(lab.textContent!==txt) lab.textContent=txt;
  key.setAttribute("aria-label", st==="na"?"Audio en preparación": (st==="playing"||st==="changing"||st==="ejecting")?"Pausar": st==="paused"?"Seguir escuchando":
    (st==="ended" || (res && res.kind==="again"))?"Escuchar el caso de nuevo desde la primera cinta": res && res.kind==="resume"?`Seguir escuchando: cinta ${res.n}, desde ${fmt(res.posMs)}`:"Escuchar el caso desde la primera cinta");
  deck.classList.toggle("is-playing",st==="playing");
  deck.classList.toggle("single",tapes.length===1);         // una sola cinta: sin cinta anterior/siguiente
  const ix = mine ? playable.findIndex(t=>t.n===PS.cinta) : -1;
  const dis={play:st==="na", prev:!mine||ix<=0, next:!mine||ix<0||ix>=playable.length-1, back:!mine||PS.cambiando||PS.expulsando, fwd:!mine||PS.cambiando||PS.expulsando, eject:!mine||PS.expulsando||PS.ended};
  deck.querySelectorAll(".key").forEach(k=>{ const d=!!dis[k.dataset.k]; if(k.disabled!==d) k.disabled=d; });
  // posición en la cinta
  const dur = mine ? (PS.cambiando ? (cur?cur.durationMs:0) : (PS.durationMs || (cur?cur.durationMs:0))) : (ref?ref.durationMs:0);
  const pos = mine ? (PS.cambiando ? 0 : Math.min(PS.positionMs,dur||PS.positionMs)) : (res && res.kind==="resume" && ref && res.n===ref.n ? res.posMs : 0);
  const p = dur ? Math.min(1,pos/dur) : 0;
  const sl=deck.querySelector(".scrub");
  if(!scrubbing){
    setProgress(sl,p,"deck",!jump && st==="playing");
    deck.querySelector(".t-pos").textContent=fmt(pos);
    sl.setAttribute("aria-valuenow",Math.round(pos/1000)); sl.setAttribute("aria-valuetext",(ref?`Cinta ${ref.n}: `:"")+fmt(pos)+" de "+fmt(dur)); sl.setAttribute("aria-valuemax",Math.round(dur/1000));
  }
  deck.querySelector(".t-dur").textContent=dur?fmt(dur):"--:--";
  const tt = !ref ? "" : PS.expulsando && mine ? "Expulsando la cinta…" : tapes.length===1 ? "Cinta única" : PS.cambiando && mine ? `Cambiando a la cinta ${ref.n}…` : `Cinta ${ref.n} de ${tapes.length}`;
  if($("tTape").textContent!==tt) $("tTape").textContent=tt;
  setCounter(deck,pos);
  deck.querySelectorAll(".bay .cassette:not(.out) .reel .pack").forEach((pk,i)=>pk.style.setProperty("--k",(i===0?0.95-0.55*p:0.4+0.55*p).toFixed(3)));
  const msg = !(res && res.kind==="resume" && !mine) ? "Mete aquí una cinta" : tapes.length===1 ? (res.posMs>=1000 ? `Te quedaste en ${fmt(res.posMs)}` : "Mete aquí la cinta") : `Ibas por la cinta ${res.n}${res.posMs>=1000?" · "+fmt(res.posMs):""}`;
  if($("bayMsg").textContent!==msg) $("bayMsg").textContent=msg;
  // «Seguir escuchando»
  const rb=$("resumeBtn"), showRes = !mine && !!res && res.kind==="resume" && st!=="na";
  rb.hidden=!showRes;
  if(showRes){ const rt=tapes.find(t=>t.n===res.n), s=`Seguir escuchando${rt?" · "+tapeLabel(rt,tapes.length):""}${res.posMs>=1000?" · "+fmt(res.posMs):""}`; const sp=rb.querySelector("span"); if(sp.textContent!==s) sp.textContent=s; }
  // cambio de cinta: aviso para lectores de pantalla y la hoja de lectura sigue a la cinta
  if(mine){
    if(PS.cinta!==lastTapeN){
      const prev=lastTapeN; lastTapeN=PS.cinta;
      if(prev!=null){
        const t=tapes.find(x=>x.n===PS.cinta); $("tapeLive").textContent=`Cinta ${PS.cinta} de ${tapes.length}${t?": "+t.titulo:""}`;  // solo hay cambio con 2 o más
        if(trSel===prev && !$("transcript").hidden) followTab(PS.cinta);
      }
    }
  } else lastTapeN=null;
  highlightBlock(mine && !PS.cambiando && cur && cur.n===trSel ? blockAtTape(cur,pos) : -1, mine?PS.cinta:null);
}
/* leer el caso: una hoja por cinta */
function buildTapeTranscript(e,tapes){
  const tr=$("transcript"); if(!tr) return;
  const withText=tapes.filter(t=>t.bloques && t.bloques.length);
  if(!withText.length){ tr.innerHTML=`<p class="tr-na">La transcripción de estas cintas todavía está en preparación.</p>`; trSel=null; return; }
  const tabs = withText.length>1;
  tr.innerHTML=`<div class="tr-h">Transcripción ${tapes.length>1?"de las cintas":"de la cinta"} · Exp. Nº ${expNo(e)}</div>
    ${tabs?`<div class="tr-tabs" role="tablist" aria-label="Cintas del caso">${withText.map(t=>`<button class="tr-tab" role="tab" id="trTab${t.n}" data-n="${t.n}" aria-controls="trPane${t.n}" aria-selected="false" tabindex="-1" title="${esc(t.titulo)}"><b>${t.n}</b><span>${esc(t.titulo)}</span></button>`).join("")}</div>`:""}`+
    withText.map((t,k)=>{
      const seek=!!(t.url && t.bloquesMs), nx=withText[k+1];
      return `<div class="tr-pane${seek?" seekable":""}"${tabs?` role="tabpanel" aria-labelledby="trTab${t.n}" tabindex="-1"`:""} id="trPane${t.n}" data-n="${t.n}" hidden>
        <div class="tr-cinta">${tapes.length===1?"Cinta única":`Cinta ${t.n} de ${tapes.length}`}${TIPO_CINTA[t.tipo]&&t.tipo!=="expediente"?" · "+TIPO_CINTA[t.tipo]:""}</div>
        <div class="tr-t">${esc(t.titulo)}</div>
        <p class="tr-legend">Texto mecanografiado: la archivera. Notas a mano: el inspector.${seek?" Toca un párrafo para escucharlo desde ahí.":""}</p>
        ${t.bloques.map((b,i)=>b.voz==="alvaro"
          ? `<p class="blk al" data-i="${i}"${seek?' tabindex="0"':""}><span class="who">El inspector</span>${esc(b.texto)}</p>`
          : `<p class="blk xi" data-i="${i}"${seek?' tabindex="0"':""}>${esc(b.texto)}</p>`).join("")}
        ${nx?`<button class="tr-next" data-go="${nx.n}">Cinta ${nx.n}: ${esc(nx.titulo)} ›</button>`:`<p class="tr-end">Fin del expediente.</p>`}
      </div>`;
    }).join("");
  const mine=PS.id===e.id && PS.cintas>0, res=resumeFrom(e.id,tapes);
  const want = mine ? PS.cinta : trSel!=null ? trSel : res ? res.n : withText[0].n;
  selectTab(withText.some(t=>t.n===want) ? want : withText[0].n);
}
function selectTab(n,focus){
  const tr=$("transcript"); if(!tr) return;
  const strip=tr.querySelector(".tr-tabs");
  tr.querySelectorAll(".tr-tab").forEach(b=>{
    const on=+b.dataset.n===n; b.setAttribute("aria-selected",on); b.tabIndex=on?0:-1;
    if(on){ if(focus) b.focus({preventScroll:true}); if(strip) strip.scrollTo({left:Math.max(0,b.offsetLeft-24),behavior:reduced()?"auto":"smooth"}); }
  });
  tr.querySelectorAll(".tr-pane").forEach(p=>{ p.hidden=+p.dataset.n!==n; });
  trSel=n; nowBlock=null; playerUI(true);
}
/* la cinta que suena cambia: si se estaba leyendo la anterior, se pasa a la hoja de la nueva */
function followTab(n){
  const tr=$("transcript"); if(!tr || !tr.querySelector(`.tr-tab[data-n="${n}"]`)) return;
  const body=$("pBody"), br=body.getBoundingClientRect(), r=tr.getBoundingClientRect();
  const reading = r.bottom>br.top && r.top<br.bottom;
  selectTab(n);
  if(reading){
    const strip=tr.querySelector(".tr-tabs").getBoundingClientRect();
    if(strip.top<br.top) body.scrollTo({top:body.scrollTop+(strip.top-br.top)-8,behavior:reduced()?"auto":"smooth"});
    followNext=true;
  }
}
function seekToBlockTape(e,n,i){
  const t=tapesOf(e.id).find(x=>x.n===n), b=t && t.bloquesMs;
  if(!t || !t.url || !b || b[i]==null) return;
  if(PS.id===e.id && PS.cintas && PS.cinta===n && !PS.cambiando){
    Player.seekTo(b[i]);
    if(!PS.playing){ if(PS.ended) playTapeOf(e,n,b[i]); else Player.resume(); }
  } else playTapeOf(e,n,b[i]);
  highlightBlock(i,n);
}
/* vuelo del casete de la caja a la grabadora (solo transform y opacity) */
function ghostOf(btn,r){
  const g=btn.cloneNode(true);
  g.removeAttribute("id"); g.removeAttribute("aria-label"); g.classList.add("tc-ghost"); g.setAttribute("aria-hidden","true"); g.tabIndex=-1;
  g.style.left=r.left+"px"; g.style.top=r.top+"px"; g.style.width=r.width+"px"; g.style.height=r.height+"px";
  document.body.appendChild(g);
  return g;
}
function flyGhost(g,from,to,done){
  const s=to.width/from.width, dx=(to.left+to.width/2)-(from.left+from.width/2), dy=(to.top+to.height/2)-(from.top+from.height/2);
  g.classList.add("fly");
  void g.offsetWidth;
  g.style.transform=`translate3d(${dx.toFixed(1)}px,${dy.toFixed(1)}px,0) scale(${s.toFixed(3)})`;
  g.style.opacity="0";
  let fin=false; const f=()=>{ if(fin) return; fin=true; g.remove(); if(done) done(); };
  g.addEventListener("transitionend",ev=>{ if(ev.propertyName==="opacity") f(); });
  setTimeout(f,520);
}
function insertAnimated(e,n,posMs,btn){
  const grid=$("tbGrid"), tgt=$("bayTape");
  btn = btn || (grid && grid.querySelector(`.tc[data-n="${n}"]`));
  let mode="";
  if(btn && tgt && !btn.hidden && !reduced()){
    const r=btn.getBoundingClientRect(), t=tgt.getBoundingClientRect(), br=$("pBody").getBoundingClientRect();
    const vis=x=>x.width>0 && x.bottom>br.top && x.top<br.bottom;
    if(vis(r) && vis(t)){ btn.classList.add("lifted"); flyGhost(ghostOf(btn,r),r,t); mode="drop"; }
  }
  bayHint={id:e.id,n,t:Date.now(),mode};
  playTapeOf(e,n,posMs);
}
/* arrastre a medias al cerrar o cambiar de expediente */
function cancelDrag(){
  if(dragState){ clearTimeout(dragState.timer); dragState=null; }
  document.querySelectorAll(".tc-ghost").forEach(g=>g.remove());
}
function wireTapeBox(e){
  const grid=$("tbGrid"), rec=$("recorder"), deck=$("deck"), body=$("pBody"); if(!grid || !rec) return;
  let suppressUntil=0, raf=0, scrollRaf=0;
  const overRec=(x,y)=>{ const r=rec.getBoundingClientRect(); return x>=r.left-16 && x<=r.right+16 && y>=r.top-20 && y<=r.bottom+16; };
  const paint=()=>{
    raf=0; const d=dragState; if(!d || !d.ghost) return;
    d.ghost.style.transform=`translate3d(${(d.x-d.x0).toFixed(1)}px,${(d.y-d.y0).toFixed(1)}px,0) rotate(-5deg) scale(1.06)`;
    const ok=overRec(d.x,d.y); if(ok!==d.over){ d.over=ok; rec.classList.toggle("drop-ok",ok); }
  };
  // si la grabadora no se ve, la carpeta se desplaza al acercar el casete al borde
  const autoScroll=()=>{
    scrollRaf=0; const d=dragState; if(!d || !d.started) return;
    const br=body.getBoundingClientRect(), edge=72; let v=0;
    if(d.y<br.top+edge) v=-Math.ceil((br.top+edge-d.y)/5); else if(d.y>br.bottom-edge) v=Math.ceil((d.y-(br.bottom-edge))/5);
    if(v){ const before=body.scrollTop; body.scrollTop+=Math.max(-16,Math.min(16,v)); if(body.scrollTop!==before) paint(); }
    scrollRaf=requestAnimationFrame(autoScroll);
  };
  const lift=()=>{
    const d=dragState; if(!d || d.started || !d.btn.isConnected) return;
    clearTimeout(d.timer); d.started=true;
    d.r=d.btn.getBoundingClientRect(); d.ghost=ghostOf(d.btn,d.r); d.ghost.classList.add("drag");
    d.btn.classList.add("lifted"); rec.classList.add("drop-wait"); deck.classList.add("dragging");
    if(d.type==="touch" && navigator.vibrate){ try{ navigator.vibrate(12); }catch(_){} }
    paint(); scrollRaf=requestAnimationFrame(autoScroll);
  };
  const end=ok=>{
    const d=dragState; if(!d) return; dragState=null;
    clearTimeout(d.timer); cancelAnimationFrame(scrollRaf); cancelAnimationFrame(raf); raf=0; scrollRaf=0;
    rec.classList.remove("drop-ok","drop-wait"); deck.classList.remove("dragging");
    if(!d.started) return;
    suppressUntil=Date.now()+450;
    if(ok){
      const tgt=$("bayTape").getBoundingClientRect();
      d.ghost.classList.remove("drag");
      if(reduced()) d.ghost.remove(); else flyGhost(d.ghost,d.r,tgt);
      bayHint={id:e.id,n:d.n,t:Date.now(),mode:"drop"};
      playTapeOf(e,d.n);
    } else {
      // fuera de la grabadora: el casete vuelve a su sitio en la caja
      const g=d.ghost, btn=d.btn;
      const back=()=>{ g.remove(); btn.classList.remove("lifted"); };
      if(reduced()) back();
      else{ g.classList.remove("drag"); g.classList.add("back"); void g.offsetWidth; g.style.transform="translate3d(0,0,0)"; setTimeout(back,300); }
    }
    if(boxDirty){ boxDirty=false; boxSig=""; playerUI(true); }
  };
  grid.addEventListener("pointerdown",ev=>{
    const b=ev.target.closest(".tc");
    if(!b || dragState || b.getAttribute("aria-disabled")==="true" || (ev.pointerType==="mouse" && ev.button!==0)) return;
    dragState={btn:b,n:+b.dataset.n,pid:ev.pointerId,type:ev.pointerType,x0:ev.clientX,y0:ev.clientY,x:ev.clientX,y:ev.clientY,started:false,over:false};
    if(ev.pointerType==="touch") dragState.timer=setTimeout(lift,230);   // táctil: mantener pulsado para levantar el casete
    else{ try{ b.setPointerCapture(ev.pointerId); }catch(_){} }
  });
  grid.addEventListener("pointermove",ev=>{
    const d=dragState; if(!d || ev.pointerId!==d.pid) return;
    d.x=ev.clientX; d.y=ev.clientY;
    if(!d.started){
      const dx=d.x-d.x0, dy=d.y-d.y0, dist=Math.hypot(dx,dy);
      if(d.type==="touch"){
        // en táctil, un gesto vertical rápido es desplazar la carpeta; uno lateral levanta el casete
        if(dist>10){ if(Math.abs(dx)>Math.abs(dy)*1.2) lift(); else { clearTimeout(d.timer); dragState=null; return; } }
      } else if(dist>6) lift();
      if(!d.started) return;
    }
    if(!raf) raf=requestAnimationFrame(paint);
  });
  grid.addEventListener("pointerup",ev=>{
    const d=dragState; if(!d || ev.pointerId!==d.pid) return;
    if(!d.started){ clearTimeout(d.timer); dragState=null; return; }    // toque: lo resuelve «click»
    d.x=ev.clientX; d.y=ev.clientY; end(overRec(d.x,d.y));
  });
  grid.addEventListener("pointercancel",ev=>{ const d=dragState; if(d && ev.pointerId===d.pid) end(false); });
  grid.addEventListener("touchmove",ev=>{ if(dragState && dragState.started && ev.cancelable) ev.preventDefault(); },{passive:false});
  grid.addEventListener("contextmenu",ev=>{ if(ev.target.closest(".tc")) ev.preventDefault(); });
  grid.addEventListener("click",ev=>{
    const b=ev.target.closest(".tc"); if(!b || Date.now()<suppressUntil || b.getAttribute("aria-disabled")==="true") return;
    insertAnimated(e,+b.dataset.n,undefined,b);
  });
}
function wireTapeDeck(e){
  const deck=$("deck"); if(!deck) return;
  bayN=null; boxSig=""; lastTapeN=null; trSel=null;
  if(bayHint && bayHint.id!==e.id) bayHint=null;
  const mine=()=>PS.id===e.id && PS.cintas>0;
  const resume=()=>{ const r=resumeFrom(e.id,tapesOf(e.id)); if(r) insertAnimated(e,r.n,r.posMs); };
  deck.querySelector('[data-k="play"]').onclick=()=>{
    if(!mine()) return resume();
    if(PS.ended) restartPlaying(); else if(PS.playing) Player.pause(); else Player.resume();
  };
  deck.querySelector('[data-k="prev"]').onclick=()=>{ if(mine()) Player.prevTape(); };
  deck.querySelector('[data-k="next"]').onclick=()=>{ if(mine()) Player.nextTape(); };
  deck.querySelector('[data-k="back"]').onclick=()=>{ if(mine() && !PS.cambiando) Player.seekBy(-15000); };
  deck.querySelector('[data-k="fwd"]').onclick=()=>{ if(mine() && !PS.cambiando) Player.seekBy(30000); };
  deck.querySelector('[data-k="eject"]').onclick=()=>{ if(mine()) Player.eject(); };
  $("resumeBtn").onclick=resume;
  // barra: la cinta en curso o, si no suena este caso, la que toca retomar
  const refTape=()=>{ const tp=tapesOf(e.id); if(mine()) return tp.find(t=>t.n===PS.cinta); const r=resumeFrom(e.id,tp); return r ? tp.find(t=>t.n===r.n) : null; };
  const durOf=()=>{ if(mine() && PS.durationMs && !PS.cambiando) return PS.durationMs; const t=refTape(); return t ? t.durationMs : 0; };
  wireScrub(deck,()=>!!refTape() && !(mine() && PS.cambiando),durOf,ms=>{
    if(mine() && !PS.cambiando) Player.seekTo(ms); else { const t=refTape(); if(t) playTapeOf(e,t.n,ms); }
  },()=>mine() && !PS.cambiando);
  wireTapeBox(e);
  wireReadBtn();
  const tr=$("transcript");
  tr.addEventListener("click",ev=>{
    const tab=ev.target.closest(".tr-tab"); if(tab){ selectTab(+tab.dataset.n); return; }
    const nx=ev.target.closest(".tr-next");
    if(nx){ selectTab(+nx.dataset.go); const s=tr.querySelector(".tr-tabs"); if(s) s.scrollIntoView({behavior:reduced()?"auto":"smooth",block:"start"}); return; }
    const b=ev.target.closest(".blk"); if(!b || ev.target.closest("a")) return;
    const pane=b.closest(".tr-pane"); if(pane && pane.classList.contains("seekable")) seekToBlockTape(e,+pane.dataset.n,+b.dataset.i);
  });
  tr.addEventListener("keydown",ev=>{
    const tab=ev.target.closest && ev.target.closest(".tr-tab");
    if(tab && ["ArrowRight","ArrowLeft","Home","End"].includes(ev.key)){
      const tabs=[...tr.querySelectorAll(".tr-tab")], k=tabs.indexOf(tab);
      const to = ev.key==="Home" ? 0 : ev.key==="End" ? tabs.length-1 : (k+(ev.key==="ArrowRight"?1:-1)+tabs.length)%tabs.length;
      selectTab(+tabs[to].dataset.n,true); ev.preventDefault(); return;
    }
    if((ev.key==="Enter"||ev.key===" ") && ev.target.classList.contains("blk")){
      const pane=ev.target.closest(".tr-pane"); if(!pane || !pane.classList.contains("seekable")) return;
      ev.preventDefault(); seekToBlockTape(e,+pane.dataset.n,+ev.target.dataset.i);
    }
  });
  observeDeck($("recorder"));
}
function fillTapes(e){
  tapeCache.delete(e.id);
  const tapes=tapesOf(e.id), playable=tapes.some(t=>t.url), hasText=tapes.some(t=>t.bloques && t.bloques.length);
  $("readBtn").disabled=!hasText;
  $("deckHint").textContent = !playable && !hasText ? "Cintas en preparación" : !playable ? "Puedes leerlas mientras se graban" : !hasText ? "Transcripción en preparación" : "";
  $("tbLab").textContent=`Exp. Nº ${expNo(e)} · ${tapes.length} cinta${tapes.length===1?"":"s"}`;
  if(tapes.length===1){
    $("tbTitle").textContent="Pruebas · Cinta";
    $("tbHelp").textContent=COARSE?"Toca la cinta para escucharla, o mantenla pulsada y arrástrala a la grabadora.":"Arrastra la cinta hasta la grabadora o haz clic en ella para escucharla.";
  }
  buildTapeTranscript(e,tapes);
  boxSig=""; nowBlock=null;
  playerUI(true);
}
/* «Seguir escuchando» en la portada: el último caso en cintas que se dejó a medias */
function renderResumeSlip(){
  const el=$("resumeSlip"); if(!el || AIDX===null) return;
  let best=null;
  Object.keys(PROG).forEach(id=>{
    const e=BY[id]; if(!e || id===PS.id || !tapeAudio(id)) return;
    const r=resumeFrom(id,tapesOf(id)), p=progOf(id);
    if(r && r.kind==="resume" && (!best || p.t>best.p.t)) best={e,r,p};
  });
  if(!best){ el.hidden=true; return; }
  const tp=tapesOf(best.e.id), t=tp.find(x=>x.n===best.r.n);
  el.hidden=false;
  el.innerHTML=`<span class="rs-cas" aria-hidden="true"><i></i><i></i></span><span class="rs-t"><small>Seguir escuchando</small><b>${esc(best.e.title)}</b><span>${tp.length>1?`Cinta ${best.r.n} de ${tp.length}${t?" · "+esc(t.titulo):""}`:esc(t?t.titulo:"")}${best.r.posMs>=1000?" · "+fmt(best.r.posMs):""}</span></span>${ICO.play}`;
  el.setAttribute("aria-label",`Seguir escuchando ${best.e.title}${t?": "+tapeLabel(t,tp.length):""}${best.r.posMs>=1000?", desde "+fmt(best.r.posMs):""}`);
  el.onclick=()=>{ const e=best.e; openP(e.id); const r=resumeFrom(e.id,tapesOf(e.id)); if(r){ bayHint={id:e.id,n:r.n,t:Date.now(),mode:""}; playTapeOf(e,r.n,r.posMs); } };
}

/* =====================================================================
   EXPEDIENTE
   ===================================================================== */
let pmap=null, current=null, observers=[];
function dropObservers(){ observers.forEach(o=>o.disconnect()); observers=[]; }
function openP(id,fromHistory){
  const e=BY[id]; if(!e) return;
  const sheet=$("sheet");
  const wasOpen=sheet.classList.contains("on");
  if(!(wasOpen && current===e)) SFX.play(wasOpen?"page":"open");  // otro expediente con la carpeta abierta: pasa la hoja
  if(settingsOpen) hideSettings();
  cancelDrag();
  current=e; deckSeen=false; nowBlock=null; lastP.deck=-1;
  dropObservers(); deckIO=null;
  if(pmap){ pmap.remove(); pmap=null; }
  $("pExp").textContent="Nº "+expNo(e)+" · "+e.title.toUpperCase(); $("pExp").title="Expediente Nº "+expNo(e);
  const [stTxt,stCls]=estado(e);
  const direct=e.links, grp=e.g.map(g=>({g,others:D.filter(o=>o!==e&&o.g.includes(g))})).filter(x=>x.others.length);
  let lh="";
  if(direct.length){
    lh=`<div class="board" id="board"><svg class="threads" aria-hidden="true"></svg><div class="origin"><i class="pin"></i>${esc(e.title)}</div><div class="links">`+
      direct.map(l=>{const o=BY[l.id];return `<button class="lnk" data-id="${o.id}" style="--r:${jitter(o.id+e.id,1).toFixed(2)}deg"><i class="pin"></i><span class="k ${l.t}">${l.t==="c"?"Cómplice":"Relación"}</span><b>${esc(o.title)}</b><span class="n">${esc(l.note)}</span></button>`;}).join("")+`</div></div>`;
  }
  grp.forEach(x=>{ lh+=`<div class="grp-t">Mismo patrón · ${esc(grpName(x.g))}</div><div class="more">`+x.others.map(o=>`<button class="btn" data-id="${o.id}">${esc(o.title)}</button>`).join("")+`</div>`; });
  if(!lh) lh=`<p class="nolink">No consta vínculo directo con ningún otro expediente de este archivo.</p>`;
  const ownK=new Set(e.loc.map(p=>p[0]+","+p[1]));
  const extra=direct.flatMap(l=>BY[l.id].loc.map(p=>[...p,BY[l.id].n])).filter(p=>!ownK.has(p[0]+","+p[1]));
  const wiki="https://es.wikipedia.org/w/index.php?search="+encodeURIComponent(e.vc?e.title:e.n);
  const prev=D[(e.i-1+D.length)%D.length], next=D[(e.i+1)%D.length];
  const yr=today.getFullYear(), age=yr-e.y;
  const pr=(-1.5+jitter(e.id,1.4)).toFixed(2), sr=(-8+jitter(e.id+"s",5)).toFixed(1);
  /* ficha: si el expediente es de la víctima o del caso (vc), habla del caso y no trata a la víctima como autora */
  const fld=(dt,dd,cls)=>`<div class="f"><dt>${dt}</dt><dd${cls?` class="${cls}"`:""}>${dd}</dd></div>`;
  const fecha=`${e.d} ${MESES[e.m-1].toLowerCase()} ${e.y}${age>0?`<span class="note">hace ${age} año${age===1?"":"s"}</span>`:""}`;
  const rows = e.vc ? [
      `<div class="f"><dt>Caso</dt><dd class="big" id="pName">${esc(e.title)}</dd></div>`,
      e.title!==e.n ? fld("Nombre",esc(e.n)) : "",
      e.a && e.a!==e.title ? fld("Alias",`«${esc(e.a)}»`,"al") : "",
      fld("Autor",esc(e.autor)),
      fld(EFEM[e.t].lab,fecha),
      e.p ? fld("País",esc(e.p)) : "",
      e.per ? fld("Periodo",esc(e.per)) : "",
      e.v ? fld("Víctimas",esc(e.v),"vic") : ""
    ] : [
      `<div class="f"><dt>Nombre</dt><dd class="big" id="pName">${esc(e.n)}</dd></div>`,
      e.a ? fld("Alias",`«${esc(e.a)}»`,"al") : "",
      e.titulo_caso && e.titulo_caso!==e.a ? fld("Caso",esc(e.titulo_caso)) : "",
      fld(EFEM[e.t].lab,fecha),
      e.sx ? fld("Sexo",e.w?"Mujer":"Varón") : "",
      e.p ? fld("País",esc(e.p)) : "",
      fld("Actividad",esc(e.per||"—")),
      fld("Víctimas",esc(e.v||"—"),"vic")
    ];
  const fuentes=fuentesDe(e);
  const host=u=>{ try{ return new URL(u).hostname.replace(/^www\./,""); }catch(_){ return ""; } };

  $("pBody").innerHTML=`<div class="sh-in">
    <article class="doc first">
      <span class="conf-st ink">Confidencial</span>
      <div class="doc-h"><span>TRUE CRIME CALENDAR · Archivo</span><span class="pg">Hoja 1 de 2</span></div>
      <p class="efem">${esc(efemText(e,yr,isTodayIn(e,yr)))}</p>
      <div class="file">
        <div class="pcol"><div class="photo" id="realPhotoFrame" style="--pr:${pr}deg"><span class="tape l"></span><span class="tape r"></span>
          <div class="frame"><img id="realPhoto" alt="Fotografía histórica de ${esc(e.n)}" decoding="async"><div class="fallback-portrait">${e.vc?casePlaceholder(e):identikit(e)}</div></div>
          <div class="cap" id="photoCaption">FOTOGRAFÍA<span class="photo-credit">Buscando imagen…</span></div></div>
          <div class="rubber ink ${stCls}" style="--sr:${sr}deg">${stTxt}</div></div>
        <dl class="fields">
          ${rows.join("")}
        </dl>
      </div>
      <div class="sec" style="margin-top:34px"><h4>Situación judicial</h4><div class="status">${esc(e.st||"—")}</div></div>
    </article>
    ${podcastHtml(e)}
    <article class="doc two">
      <div class="doc-h"><span>Exp. Nº ${expNo(e)} · ${esc(e.title)}</span><span class="pg">Hoja 2 de 2</span></div>
      <div class="sec" style="margin-top:0"><h4>Resumen del caso</h4><p class="typed">${esc(e.c||"")}</p></div>
      ${e.mo || !e.vc ? `<div class="sec"><h4>Modus operandi</h4><p class="typed">${esc(e.mo||"—")}</p></div>` : ""}
    </article>
    <section class="on-folder"><h4 class="lab-h">Material gráfico de la investigación</h4><div class="case-gallery" id="investigationGallery"><div class="gallery-note">Preparando la consulta de imágenes…</div></div></section>
    <section class="on-folder"><h4 class="lab-h">Mapa de los hechos</h4>
      <div class="mapclip"><span class="tape a"></span><span class="tape b"></span><div class="pmap" id="pmap"></div></div>
      <ul class="places">${e.loc.map(l=>`<li>${esc(l[2])}</li>`).join("")}${extra.map(l=>`<li class="lk">${esc(l[3])}: ${esc(l[2])}</li>`).join("")}</ul>
    </section>
    <section class="on-folder"><h4 class="lab-h">Vínculos con otros expedientes</h4>${lh}</section>
    ${fuentes.length?`<section class="on-folder"><h4 class="lab-h">Fuentes</h4><ol class="fuentes">${fuentes.map(f=>`<li><a href="${esc(f.url)}" target="_blank" rel="noopener noreferrer"><span class="fti">${esc(f.titulo)}</span>${f.tipo?`<span class="ft">${esc(f.tipo)}</span>`:""}${host(f.url)?`<small>${esc(host(f.url))}</small>`:""}</a></li>`).join("")}</ol></section>`:""}
    <section class="on-folder"><h4 class="lab-h">Más información</h4><div class="more"><a class="btn" href="${wiki}" target="_blank" rel="noopener">Consultar ficha de referencia (Wikipedia)</a></div></section>
    <div class="navrow"><button class="btn" data-id="${prev.id}"><span>‹ ${esc(prev.title)}</span></button><button class="btn" data-id="${next.id}"><span>${esc(next.title)} ›</span></button></div>
  </div>`;
  $("pBody").scrollTop=0;
  // animación: la carpeta se abre (solo al abrir; al pasar de expediente, cambio rápido)
  sheet.style.setProperty("--d0", wasOpen||reduced() ? "0ms" : "380ms");
  sheet.classList.remove("swap");
  const fc=$("fcover"); fc.classList.remove("anim");
  if(!wasOpen && !reduced()){
    fc.innerHTML=`<div class="lab">TRUE CRIME CALENDAR<b>${esc(e.title)}</b>Expediente Nº ${expNo(e)}</div><span class="conf ink">Confidencial</span>`;
    void fc.offsetWidth; fc.classList.add("anim");
  } else if(wasOpen && !reduced()){ void sheet.offsetWidth; sheet.classList.add("swap"); }
  loadDossierPhoto(e);
  loadInvestigationGallery(e);
  wirePodcast(e); fillPodcast(e); playerUI(true);
  $("pPrev").onclick=()=>openP(prev.id); $("pNext").onclick=()=>openP(next.id);
  sheet.classList.add("on"); $("bd").classList.add("on"); document.body.style.overflow="hidden";
  if(!fromHistory){
    const st={p:id};
    if(wasOpen || (history.state && history.state.s)) history.replaceState(st,"","#"+id); else history.pushState(st,"","#"+id);
  }
  lazyDossier(e,extra);
  if(!wasOpen) setTimeout(()=>{ if(current===e) $("pClose").focus({preventScroll:true}); },reduced()?0:400);
}
/* mapa e hilo rojo: se preparan cuando entran en pantalla */
function lazyDossier(e,extra){
  const pm=$("pmap"), board=$("board");
  if(!window.IntersectionObserver){ setTimeout(()=>{ buildPMap(e,extra); drawThreads(true); },700); return; }
  const io=new IntersectionObserver(en=>{
    en.forEach(x=>{
      if(!x.isIntersecting || current!==e) return;
      if(x.target===pm && !pmap) buildPMap(e,extra);
      if(x.target===board) drawThreads(true);
      io.unobserve(x.target);
    });
  },{root:$("pBody"),rootMargin:"0px 0px 120px 0px",threshold:.05});
  if(pm) io.observe(pm); if(board) io.observe(board);
  observers.push(io);
}
function buildPMap(e,extra){
  if(pmap){ pmap.remove(); pmap=null; }
  const el=$("pmap"); if(!el) return;
  if(!HAS_L||!e.loc.length){ el.parentNode.style.display="none"; return; }
  pmap=baseMap(el,{scrollWheelZoom:false});
  const pts=[]; let k=0;
  e.loc.forEach(l=>{ tack([l[0],l[1]],false,false,120+k++*160).addTo(pmap).bindTooltip(esc(l[2].split(" (")[0]),{permanent:true,direction:"right",className:"plbl",offset:[8,0]}); pts.push([l[0],l[1]]); });
  extra.forEach(l=>{ tack([l[0],l[1]],true,true,120+k++*160).addTo(pmap).bindPopup(`<b>${esc(l[3])} (vinculado)</b><div class="pl">${esc(l[2])}</div>`); pts.push([l[0],l[1]]); });
  if(pts.length===1) pmap.setView(pts[0],maxZ()); else pmap.fitBounds(pts,{padding:[30,30],maxZoom:maxZ()});
  setTimeout(()=>pmap&&pmap.invalidateSize(),200);
}
function drawThreads(animate){
  const board=$("board"); if(!board) return;
  const svg=board.querySelector(".threads"), origin=board.querySelector(".origin .pin");
  const bb=board.getBoundingClientRect(); if(!bb.width) return;
  const o=origin.getBoundingClientRect(), ox=o.left+o.width/2-bb.left, oy=o.top+o.height/2-bb.top;
  svg.setAttribute("width",bb.width); svg.setAttribute("height",bb.height); svg.setAttribute("viewBox",`0 0 ${bb.width.toFixed(1)} ${bb.height.toFixed(1)}`);
  let h="";
  board.querySelectorAll(".lnk .pin").forEach((p,i)=>{
    const r=p.getBoundingClientRect(), x=r.left+r.width/2-bb.left, y=r.top+r.height/2-bb.top;
    const cx=(ox+x)/2-10, cy=Math.max(oy,y)+14;
    const d=`M${ox.toFixed(1)} ${oy.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
    const dl=`animation-delay:${i*180}ms`;
    h+=`<path class="sh" d="${d}" transform="translate(1 2)" pathLength="1" style="${dl}"/><path d="${d}" pathLength="1" style="${dl}"/>`;
  });
  svg.innerHTML=h;
  if(animate && !reduced()){ board.classList.remove("in"); void board.offsetWidth; board.classList.add("in"); }
  else svg.querySelectorAll("path").forEach(p=>p.style.strokeDashoffset="0");
}
addEventListener("resize",()=>{ if(current && $("board") && $("board").classList.contains("in")) drawThreads(false); });
function closeP(fromHistory){
  const sheet=$("sheet");
  if(!sheet.classList.contains("on")) return;
  SFX.play("close");
  sheet.classList.remove("on","swap"); $("bd").classList.remove("on"); document.body.style.overflow="";
  $("fcover").classList.remove("anim");
  dropObservers();
  setTimeout(()=>{ if(pmap&&!sheet.classList.contains("on")){pmap.remove();pmap=null;} },350);
  if(!fromHistory && history.state && history.state.p) history.back();
  current=null; deckSeen=false; nowBlock=null; cancelDrag(); deckIO=null;
  playerUI(true); renderResumeSlip();
}
$("pBody").addEventListener("click",ev=>{ const b=ev.target.closest("[data-id]"); if(b) openP(b.dataset.id); });
["touchmove","wheel"].forEach(t=>$("pBody").addEventListener(t,()=>{ userScrollAt=Date.now(); },{passive:true}));
$("pClose").onclick=()=>closeP();
$("bd").onclick=()=>closeP();
document.addEventListener("keydown",ev=>{
  if(settingsOpen && ev.key==="Escape"){ closeSettings(); return; }
  if(!current) return;
  if(ev.target.closest && ev.target.closest(".scrub,input,[role=tab],.tc")) return;
  if(ev.key==="Escape") closeP();
  else if(ev.key==="ArrowRight") openP(D[(current.i+1)%D.length].id);
  else if(ev.key==="ArrowLeft") openP(D[(current.i-1+D.length)%D.length].id);
});
/* deslizar hacia abajo la pestaña de la carpeta para cerrarla (móvil) */
(function(){ const sh=$("sheet"), head=$("shHead"); let y0=null, dy=0;
  head.addEventListener("touchstart",e=>{ if(e.target.closest("button")) return; y0=e.touches[0].clientY; dy=0; sh.style.transition="none"; },{passive:true});
  head.addEventListener("touchmove",e=>{ if(y0===null) return; dy=Math.max(0,e.touches[0].clientY-y0); if(innerWidth<1000) sh.style.transform=`translateY(${dy}px)`; },{passive:true});
  head.addEventListener("touchend",()=>{ if(y0===null) return; sh.style.transition=""; sh.style.transform=""; if(dy>110&&innerWidth<1000) closeP(); y0=null; });
})();

/* =====================================================================
   FICHA DE AJUSTES: sonido, volumen de las cintas y avisos diarios
   (los avisos solo existen dentro de la app)
   ===================================================================== */
let settingsOpen=false, notif={enabled:false,hour:9,minute:0,permissionGranted:true,xiaomi:false};
// Al pulsar «Sí» sin permiso, Android muestra su diálogo: mientras tanto la casilla sigue en «Sí».
let pendingEnable=null, permDenied=false;
function applyNotif(s){
  s=parseMaybe(s); if(!s) return;
  notif={enabled:!!s.enabled,hour:Number.isFinite(+s.hour)?+s.hour:9,minute:Number.isFinite(+s.minute)?+s.minute:0,
         permissionGranted:s.permissionGranted!==false,xiaomi:!!s.xiaomi};
  if(notif.enabled){ pendingEnable=null; permDenied=false; }
  const on=notif.enabled||!!pendingEnable;
  $("nYes").checked=on; $("nNo").checked=!on;
  const t=pad(notif.hour)+":"+pad(notif.minute); if($("nTime").value!==t) $("nTime").value=t;
  $("nTime").disabled=!notif.enabled; $("nTest").disabled=false;
  const msg = pendingEnable ? "Android te pedirá permiso para mostrar avisos."
    : permDenied ? "Sin permiso, Android no deja avisarte. Pulsa «Sí» otra vez para abrir sus ajustes."
    : (notif.enabled && !notif.permissionGranted) ? "Android ya no tiene permiso para mostrar avisos. Concédelo en los ajustes del teléfono."
    : "";
  $("nPerm").textContent=msg; $("nPerm").hidden=!msg;
  $("nXiaomi").hidden=!(notif.xiaomi && notif.enabled);
}
window.TCC_onNotificationSettings=function(s){
  try{
    s=parseMaybe(s);
    // 1.ª llamada: la respuesta inmediata al pulsar «Sí»; 2.ª: el resultado del diálogo de Android.
    if(pendingEnable && s && !s.enabled && ++pendingEnable.calls>=2){ pendingEnable=null; permDenied=true; }
    applyNotif(s);
  }catch(err){ console.warn("TCC_onNotificationSettings:",err); }
};
// Vuelta de los ajustes de Android (permiso denegado antes): se lee el resultado.
document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState!=="visible" || !pendingEnable || !NATIVE) return;
  setTimeout(()=>{ if(!pendingEnable) return; pendingEnable=null; readNotif(); if(!notif.enabled){ permDenied=true; applyNotif(notif); } },400);
});
function readNotif(){ if(NATIVE) applyNotif(nat("getNotificationSettings")); }
/* Casos que cumplen aniversario un día dado (29 de febrero → 28 en años no bisiestos) */
function casesOn(d){ return D.filter(e=>e.m===d.getMonth()+1 && dayIn(e,d.getFullYear())===d.getDate()); }
function nextCaseDay(){
  for(let i=1;i<=366;i++){ const d=new Date(today); d.setDate(d.getDate()+i); const l=casesOn(d); if(l.length) return {d,l}; }
  return null;
}

/* Volumen de las cintas (0-1): en la app lo guarda Android; en el navegador, localStorage. */
let tapeVol=1;
if(NATIVE){ const v=parseFloat(nat("getTapeVolume")); if(Number.isFinite(v)) tapeVol=Math.max(0,Math.min(1,v)); }
else { try{ const v=localStorage.getItem("tcc_vol"); if(v!=null&&v!=="") tapeVol=Math.max(0,Math.min(1,+v)); }catch(_){} }
function showTapeVol(){
  const pct=Math.round(tapeVol*100), r=$("tVol");
  if(+r.value!==pct) r.value=pct;
  r.style.setProperty("--p",pct+"%"); $("tVolOut").textContent=pct+" %";
  r.setAttribute("aria-valuetext",pct+" por ciento");
}
function setTapeVol(v){
  tapeVol=Math.max(0,Math.min(1,v)); showTapeVol();
  if(NATIVE) nat("setTapeVolume",tapeVol);
  else{ try{ localStorage.setItem("tcc_vol",String(tapeVol)); }catch(_){} }
  if(webAudio) webAudio.volume=tapeVol;
  Object.values(webSfx).forEach(x=>{ x.volume=tapeVol; });
}

function openSettings(){
  if(settingsOpen) return;
  readNotif(); showTapeVol(); $("sYes").checked=SFX.on; $("sNo").checked=!SFX.on;
  settingsOpen=true; $("settings").hidden=false; $("sbd").classList.add("on");
  requestAnimationFrame(()=>requestAnimationFrame(()=>$("settings").classList.add("on")));
  $("tAlerts").setAttribute("aria-expanded","true");
  history.pushState({s:1},"");
  setTimeout(()=>$("setClose").focus({preventScroll:true}),200);
}
function hideSettings(){
  if(!settingsOpen) return;
  settingsOpen=false; $("settings").classList.remove("on"); $("sbd").classList.remove("on");
  $("tAlerts").setAttribute("aria-expanded","false");
  setTimeout(()=>{ if(!settingsOpen) $("settings").hidden=true; },reduced()?0:360);
}
function closeSettings(fromHistory){
  if(!settingsOpen) return;
  hideSettings();
  if(!fromHistory && history.state && history.state.s) history.back();
}
$("tAlerts").hidden=false;
$("tAlerts").onclick=openSettings;
$("setClose").onclick=()=>closeSettings();
$("sbd").onclick=()=>closeSettings();
$("sYes").onchange=()=>{ if($("sYes").checked){ SFX.on=true; SFX.play("page"); } };
$("sNo").onchange=()=>{ if($("sNo").checked) SFX.on=false; };
$("tVol").addEventListener("input",()=>setTapeVol(+$("tVol").value/100));
showTapeVol();
if(NATIVE){
  $("nYes").onchange=()=>{
    if(!$("nYes").checked) return;
    permDenied=false;
    if(!notif.permissionGranted) pendingEnable={calls:0};
    nat("setNotificationsEnabled",true); applyNotif(notif); setTimeout(readNotif,1500);
  };
  $("nNo").onchange=()=>{ if(!$("nNo").checked) return; pendingEnable=null; permDenied=false; nat("setNotificationsEnabled",false); setTimeout(readNotif,250); };
  $("nTime").onchange=()=>{ const m=/^(\d{1,2}):(\d{2})/.exec($("nTime").value); if(m){ nat("setNotificationTime",+m[1],+m[2]); setTimeout(readNotif,250); } };
  $("nAppSet").onclick=()=>nat("openAppSettings");
  // Solo hay notificación si hoy hay algún caso: los demás días se explica aquí, sin enviar nada.
  $("nTest").onclick=()=>{
    const s=$("nSent"), m=$("nTestMsg");
    if(casesOn(today).length){
      m.hidden=true; nat("testNotification");
      s.hidden=false; clearTimeout(s._t); s._t=setTimeout(()=>{ s.hidden=true; },2600);
      return;
    }
    s.hidden=true;
    const nx=nextCaseDay();
    m.textContent="Hoy no hay ningún caso en el archivo, así que no se envía aviso."+
      (nx?` El próximo será el ${nx.d.getDate()} de ${MESES[nx.d.getMonth()].toLowerCase()}: ${nx.l.map(e=>e.n).join(", ")}.`:"");
    m.hidden=false;
  };
} else {
  $("secAvisos").remove();
}

/* ---------- Historial (botón Atrás de Android) ---------- */
addEventListener("popstate",ev=>{
  const st=ev.state||{};
  if(!st.s && settingsOpen) hideSettings();
  if(st.p) openP(st.p,true); else closeP(true);
});
/* Android abre un expediente desde una notificación con la página ya cargada */
window.TCC_openCase=function(id){
  try{
    id=String(id==null?"":id).replace(/^#/,"").trim();
    if(BY[id]){
      const e=BY[id];
      if(!$("sheet").classList.contains("on")){ vy=today.getFullYear(); vm=e.m; selDay=dayIn(e,vy); if(document.body.classList.contains("v-map")) showView("cal"); renderCal(0); }
      openP(id);
    } else openToday();
  }catch(err){ console.warn("TCC_openCase:",err); }
};
/* Android: notificación con varios casos del día → mes actual con hoy seleccionado */
function openToday(){
  if(settingsOpen) closeSettings();
  if(current) closeP();
  if(query){ clearSearch(false); }
  if(!$("searchWrap").hidden){ $("searchWrap").hidden=true; $("filters").hidden=true; $("tSearch").setAttribute("aria-expanded","false"); }
  if(filter!=="all"){ setFilter("all"); if(world) drawWorld(); }
  showView("cal");
  const dir=Math.sign((today.getFullYear()*12+today.getMonth()+1)-(vy*12+vm));
  vy=today.getFullYear(); vm=today.getMonth()+1; selDay=today.getDate();
  renderCal(dir);
  setTimeout(()=>{ const h=document.querySelector("#calView .list-head"); if(!h) return;
    const top=h.getBoundingClientRect().top+scrollY-hdrH()-10;
    scrollTo({top:Math.max(0,top),behavior:reduced()?"auto":"smooth"}); },80);
}
window.TCC_openToday=function(){ try{ openToday(); }catch(err){ console.warn("TCC_openToday:",err); } };
addEventListener("hashchange",()=>{ const h=decodeURIComponent(location.hash.slice(1)); if(BY[h] && (!current || current.id!==h)) window.TCC_openCase(h); });

/* ---------- Arranque ---------- */
renderSlip(); renderAll();
setInterval(()=>{ const n=new Date(); n.setHours(0,0,0,0); if(+n!==+today){ const wasCur=vy===today.getFullYear()&&vm===today.getMonth()+1; today=n; if(wasCur){vy=n.getFullYear();vm=n.getMonth()+1;} renderSlip(); renderCal(0); } },60000);
if(NATIVE){
  document.documentElement.classList.add("in-app");
  nat("setCases",JSON.stringify(D.map(e=>({id:e.id,n:e.n,a:e.a,m:e.m,d:e.d,y:e.y,t:e.t,e:e.e}))));
  readNotif();
  pullPlayer();
}
audioIdxReady.then(()=>{ playerUI(true); renderResumeSlip(); });
const startHash=decodeURIComponent(location.hash.slice(1));
if(BY[startHash]){ history.replaceState(null,"",location.pathname+location.search); vm=BY[startHash].m; selDay=dayIn(BY[startHash],vy); renderCal(0); openP(startHash); }
/* la tapa se levanta en cuanto la página está lista */
(function(){ const c=$("cover"); if(!c) return; c.classList.add("go"); setTimeout(()=>c.remove(),1300); })();
