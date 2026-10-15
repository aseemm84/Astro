var LH_MARK='<svg class="lhmark" viewBox="0 0 64 64" role="img" aria-label="{{BRAND}}">'+
  '<circle cx="32" cy="32" r="12.5" fill="none" stroke="#c9a24b" stroke-width="3"/>'+
  '<circle cx="32" cy="32" r="7.5" fill="#c9a24b"/>'+
  '<path d="M46.8 20.6A19 19 0 0 1 51 32" fill="none" stroke="#b08a2e" stroke-width="5"/>'+
  '<path d="M32 13.5v3.4M32 47.1v3.4M13.5 32h3.4M47.1 32h3.4" stroke="#c9a24b" stroke-width="2.6"/>'+
  '</svg>';
/* ===== Full-report print =====
   Browsers print what is visible, and the panes are hidden behind tabs, so an
   ordinary Ctrl+P yields only the tab on screen. This assembles a separate
   document containing every pane, strips the controls out of it, resolves
   everything interactive, and prints that instead. The page you were looking at
   is untouched and restored afterwards. */
var PR_STRIP=[".swhchips",".swhctl",".skytoggle",".skyvargas",".skyaspects",".skyscrub",
  ".kindex",".gbpanel","#k-rawwrap",".ktabs",".evform",".matchform"].join(",");

function prPage(title,sub,body){
  return '<section class="prpane"><h2 class="prh">'+esc(title)+
    (sub?'<span>'+esc(sub)+'</span>':'')+'</h2>'+body+'</section>';
}
function prClone(pane){
  var c=pane.cloneNode(true);
  c.removeAttribute("hidden"); c.removeAttribute("id");
  [].forEach.call(c.querySelectorAll(PR_STRIP),function(e){ e.parentNode.removeChild(e); });
  /* buttons and inputs mean nothing on paper; a glass-box trigger keeps its text */
  [].forEach.call(c.querySelectorAll("button.gbq"),function(b){
    var s=document.createElement("span"); s.innerHTML=b.innerHTML; b.parentNode.replaceChild(s,b); });
  [].forEach.call(c.querySelectorAll("button,input,select,textarea"),function(e){
    e.parentNode && e.parentNode.removeChild(e); });
  /* every collapsible section opens */
  [].forEach.call(c.querySelectorAll("details"),function(d){ d.setAttribute("open",""); });
  return c;
}
function prSkySection(J){
  /* sixteen ecliptic wheels at the birth moment, then the dome once */
  var inp=J.input, sky=window.quickSky(inp), out="";
  var VG=[["D1","Rāśi"],["D2","Horā"],["D3","Drekkāṇa"],["D4","Caturthāṃśa"],["D7","Saptāṃśa"],
    ["D9","Navāṃśa"],["D10","Daśāṃśa"],["D12","Dvādaśāṃśa"],["D16","Ṣoḍaśāṃśa"],["D20","Viṃśāṃśa"],
    ["D24","Caturviṃśāṃśa"],["D27","Saptaviṃśāṃśa"],["D30","Triṃśāṃśa"],["D40","Khavedāṃśa"],
    ["D45","Akṣavedāṃśa"],["D60","Ṣaṣṭyāṃśa"]];
  var keepV=SKY_VARGA, keepA=SKY_ASPECT;
  SKY_ASPECT="none";
  out+='<p class="prnote">The ecliptic wheel for every division, cast at the birth moment. '+
    'The nakṣatra and pāda rings appear on the rāśi chart only: those divide the actual ecliptic, '+
    'and a divisional chart is a derived circle, so drawing them there would imply a correspondence '+
    'classical practice does not make. The other fifteen wheels are therefore plainer by design.</p>';
  VG.forEach(function(v){
    SKY_VARGA=v[0];
    out+='<div class="prwheel"><h3 class="prsub">'+esc(v[0])+' — '+esc(v[1])+'</h3>'+
      skyWheel(sky)+'</div>';
  });
  SKY_VARGA=keepV; SKY_ASPECT=keepA;
  out+='<div class="prwheel"><h3 class="prsub">Local sky at birth</h3>'+skyDome(sky)+'</div>';
  return out;
}
function prStarWheel(J){
  var keep={}; for(var k in SWH_SHOW) keep[k]=SWH_SHOW[k];
  var keepOff=SWH_OFFSET;
  for(var k2 in SWH_SHOW) SWH_SHOW[k2]=true;      // every group on, as asked
  SWH_OFFSET=0;
  var st=swhStateAt(0), svg=swhRender(st.sky,SWH_NATAL);
  for(var k3 in keep) SWH_SHOW[k3]=keep[k3];
  SWH_OFFSET=keepOff;
  return '<p class="prnote">Every point group is shown at once: grahas, stars with their '+
    'nakṣatra connectors, the Dhūmādi upagrahas, the special lagnas and the ārūḍha points. '+
    'On screen these can be toggled apart; on paper they cannot, so this is necessarily dense.</p>'+
    '<div class="prwheel">'+svg+'</div>';
}
function buildPrintDoc(){
  var J=window.__kdata; if(!J) return null;
  var old=document.getElementById("kprintdoc");
  if(old) old.parentNode.removeChild(old);
  SWH_PRINT=true;
  var wrap=document.createElement("div");
  wrap.id="kprintdoc";
  wrap.className="kreport";   // all report styling is scoped under .kreport
  var i=J.input||{}, nm=i.name||"Chart";
  var when=String(i.day).padStart(2,"0")+" "+MON[i.month]+" "+i.year+" · "+
    String(i.hour).padStart(2,"0")+":"+String(i.minute).padStart(2,"0");
  var head='<section class="prcover">'+
    /* The cover carries the reduced mark inline — the same shapes the favicon uses.
       The masthead's full mark is a referenced file, and a printed page cannot rely
       on a fetch completing, so the cover draws its own rather than lifting it. */
    '<div class="prbrand"><span class="prlogo">'+LH_MARK+'</span>'+
    '<div class="prname">{{BRAND}}</div></div>'+
    '<div class="prby">Aseem Mehrotra</div>'+
    '<h1>'+esc(nm)+'</h1>'+
    '<p class="prwhen">'+esc(when)+' &middot; '+(i.lat||0).toFixed(4)+'°, '+(i.lon||0).toFixed(4)+
    '° &middot; UTC'+((i.tzHours>=0?"+":"")+i.tzHours)+'</p>'+
    '<p class="prconv">'+esc(J.ayanamsa_name||"")+' &middot; '+esc(J.node_mode||"mean")+
    ' node &middot; whole-sign houses</p>'+
    '<p class="prfoot">An educational reckoning of traditional doctrine — not a prediction, '+
    'a diagnosis, or advice. Generated '+new Date().toISOString().slice(0,10)+'.</p></section>';
  var html=[head];
  /* Motion is a studio tool, not report content. Cloning it put an empty 1080x1920
     canvas on the page — a canvas keeps its bitmap in the element, not the markup, so
     a clone is always blank — followed by a page of advice about recording reels. The
     printed report is better without both. */
  var PR_SKIP={motion:1};
  var panes=[].slice.call(document.querySelectorAll(".kpane"))
               .filter(function(p){ return !PR_SKIP[p.getAttribute("data-kpane")]; });
  panes.forEach(function(pn){
    var key=pn.getAttribute("data-kpane");
    var title=(pn.querySelector(".kpaneh")||{}).textContent||key;
    var c=prClone(pn);
    var h=c.querySelector(".kpaneh"); if(h) h.parentNode.removeChild(h);
    if(key==="sky"){
      var host=c.querySelector("#skycanvas"); if(host){ host.removeAttribute("id");
        host.innerHTML=prSkySection(J); }
    }
    if(key==="starwheel"){
      var host2=c.querySelector("#swhcanvas"); if(host2){ host2.removeAttribute("id");
        host2.innerHTML=prStarWheel(J); }
      var sp=c.querySelector("#swhstamp"); if(sp) sp.textContent="cast at the birth moment";
      var sf=c.querySelector("#swhfacts"); if(sf) sf.parentNode.removeChild(sf);
    }
    html.push(prPage(title,"",c.innerHTML));
  });
  wrap.innerHTML=html.join("");
  document.body.appendChild(wrap);
  SWH_PRINT=false;
  return wrap;
}
function printFullReport(){
  var w=buildPrintDoc();
  if(!w){ alert("Cast a chart first."); return; }
  document.body.classList.add("printing");
  function cleanup(){
    document.body.classList.remove("printing");
    var d=document.getElementById("kprintdoc"); if(d) d.parentNode.removeChild(d);
    window.removeEventListener("afterprint",cleanup);
  }
  window.addEventListener("afterprint",cleanup);
  setTimeout(function(){ window.print(); setTimeout(cleanup,1500); },250);
}
window.__printFullReport=printFullReport;
window.__buildPrintDoc=buildPrintDoc;
document.addEventListener("click",function(ev){
  var t=ev.target;
  if(t&&t.getAttribute&&t.getAttribute("data-krprint")!=null){ ev.preventDefault(); printFullReport(); }
  /* Hand the current chart to the dashboard rather than making the reader export a
     file and upload it again. localStorage is same-origin and holds only this chart;
     the dashboard clears it once read. */
  if(t&&t.getAttribute&&t.getAttribute("data-kdash")!=null){
    try{
      /* Storage key, not branding: dashboard.html reads this exact string. Renaming
         it here alone makes the handoff fail silently, with the dashboard simply
         finding nothing. */
      if(window.__kdata) localStorage.setItem("learnhoro.chart",JSON.stringify(window.__kdata));
    }catch(e){ /* quota or private mode — the dashboard will ask for a file instead */ }
  }
});
