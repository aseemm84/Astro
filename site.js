/* ===== Nirayana — the reference pages' only script =====================
   Three jobs, none of which needs the chart engine unless a chart is actually
   stored: a navigation that fits the screen, section links on narrow screens
   where the sidebar is hidden, and an "in your chart" note drawn from the
   reader's own chart when they have cast one.

   The engine is a separate file and is fetched only when there is a chart to
   compute, so a reader who has never cast one pays nothing for this.
   ====================================================================== */
(function(){
"use strict";
function $(id){ return document.getElementById(id); }
function el(t,c,h){ var e=document.createElement(t); if(c) e.className=c;
  if(h!=null) e.innerHTML=h; return e; }
function esc(s){ return String(s==null?"":s)
  .replace(/[&<>]/g,function(c){ return ({"&":"&amp;","<":"&lt;",">":"&gt;"})[c]; }); }

/* ---------------------------------------------------------------- navigation
   Sixteen links in a horizontal scroller hid 883px of itself on a phone —
   more than half the site, behind a gesture nothing on screen suggested. Wide
   screens keep the row; narrow ones get a real menu. */
function navInit(){
  var nav=document.querySelector("nav.site"); if(!nav) return;
  var links=[].slice.call(nav.querySelectorAll("a"));
  if(!links.length) return;
  var here=links.filter(function(a){ return a.classList.contains("active"); })[0];

  var bar=el("div","navbar");
  var btn=el("button","navtoggle",
    '<span class="navtoggle-i" aria-hidden="true"><i></i><i></i><i></i></span>'+
    '<span class="navtoggle-t">'+esc(here?here.textContent:"Menu")+'</span>'+
    '<span class="navtoggle-c" aria-hidden="true">▾</span>');
  btn.type="button";
  btn.setAttribute("aria-expanded","false");
  btn.setAttribute("aria-controls","navpanel");
  btn.setAttribute("aria-label","Open the site menu");
  bar.appendChild(btn);
  nav.parentNode.insertBefore(bar,nav);
  nav.id="navpanel";

  function setOpen(on){
    nav.classList.toggle("open",on);
    btn.setAttribute("aria-expanded",on?"true":"false");
    document.documentElement.classList.toggle("navlock",on);
    if(on){ var f=nav.querySelector("a.active")||nav.querySelector("a"); if(f) f.focus(); }
  }
  btn.addEventListener("click",function(){ setOpen(!nav.classList.contains("open")); });
  nav.addEventListener("click",function(e){ if(e.target.closest("a")) setOpen(false); });
  document.addEventListener("keydown",function(e){
    if(e.key==="Escape"&&nav.classList.contains("open")){ setOpen(false); btn.focus(); } });
  document.addEventListener("click",function(e){
    if(!nav.classList.contains("open")) return;
    if(e.target.closest("nav.site")||e.target.closest(".navtoggle")) return;
    setOpen(false);
  },true);
}

/* ------------------------------------------------------- section navigation
   The sidebar is hidden below 1000px, which left pages up to 5,900px tall with
   nothing to navigate by. The same links become a collapsed summary at the head
   of the page; the sidebar still serves wider screens. */
function asideInit(){
  var aside=document.querySelector("aside.onpage"); if(!aside) return;
  var links=[].slice.call(aside.querySelectorAll("a")); if(links.length<2) return;
  var main=document.querySelector("main"); if(!main) return;
  var d=el("details","onpage-m");
  var s=el("summary",null,"On this page <span>"+links.length+" sections</span>");
  d.appendChild(s);
  var ul=el("div","onpage-m-list");
  links.forEach(function(a){
    var b=el("a",null,a.innerHTML); b.href=a.getAttribute("href"); ul.appendChild(b); });
  d.appendChild(ul);
  d.addEventListener("click",function(e){ if(e.target.closest("a")) d.open=false; });
  main.insertBefore(d,main.firstChild);
}

/* ------------------------------------------------------------- your own chart
   kundli.html stores the birth particulars — about 250 bytes, no chart data —
   so a reference page can recompute. The chart itself is never stored: it is
   derived in a few milliseconds from these numbers and the engine. */
var KEY="nirayana.birth";
function readBirth(){
  /* a chart in the address bar wins, so a shared link reads as that chart */
  try{
    var h=(location.hash||"").replace(/^#/,""), o={};
    h.split("&").forEach(function(kv){ var i=kv.indexOf("="); if(i>0)
      o[kv.slice(0,i)]=decodeURIComponent(kv.slice(i+1)); });
    if(/^\d{8}$/.test(o.d||"")&&/^\d{4}$/.test(o.t||"")&&o.p){
      var p=String(o.p).split(",");
      if(p.length>=3) return {year:+o.d.slice(0,4),month:+o.d.slice(4,6),day:+o.d.slice(6,8),
        hour:+o.t.slice(0,2),minute:+o.t.slice(2,4),
        lat:+p[0],lon:+p[1],tzHours:+p[2],
        ayanamsa:o.a||"lahiri",node:o.nd||"mean",name:o.n||"",place:o.pl||""};
    }
  }catch(e){}
  try{ var v=localStorage.getItem(KEY); if(v) return JSON.parse(v); }catch(e){}
  return null;
}
function forget(){
  try{ localStorage.removeItem(KEY); }catch(e){}
  var n=document.querySelector(".inchart"); if(n) n.parentNode.removeChild(n);
  invite();
}
var ENGINE_SRC="engine.js", engineLoading=null;
function withEngine(cb){
  if(window.buildLocalChart) return cb();
  if(engineLoading){ engineLoading.push(cb); return; }
  engineLoading=[cb];
  var s=document.createElement("script");
  s.src=ENGINE_SRC; s.defer=true;
  s.onload=function(){ var q=engineLoading; engineLoading=null;
    q.forEach(function(f){ try{ f(); }catch(e){} }); };
  s.onerror=function(){ engineLoading=null; };
  document.head.appendChild(s);
}

/* --------------------------------------------------------------- the content
   One function per page. Each returns a short list of plain statements about
   the reader's own chart — placements, dignities, which lords sit where. They
   state what the chart contains and stop there: nothing here predicts, and the
   pages around them carry the interpretation. */
var SA=["Meṣa","Vṛṣabha","Mithuna","Karka","Siṃha","Kanyā","Tulā","Vṛścika","Dhanus","Makara","Kumbha","Mīna"];
var DIGN={exalted:"exalted",debilitated:"debilitated",own:"own sign",
  moolatrikona:"Mūlatrikoṇa",friend:"a friendly sign",enemy:"an enemy's sign",
  neutral:"a neutral sign","great friend":"a great friend's sign","great enemy":"a great enemy's sign"};
function gname(g){ return g.iast||g.sa||g.key; }
function rname(r){ return r&&(r.saName||r.iast||r.sa||SA[r.idx])||"?"; }
function deg(d){ var x=Math.floor(d), m=Math.round((d-x)*60);
  if(m===60){ x++; m=0; } return x+"°"+(m<10?"0":"")+m+"′"; }
function houseOf(J,g){
  var l=J.lagna.rashi.idx, i=g.rashi.idx; return ((i-l)%12+12)%12+1; }
function li(s){ return "<li>"+s+"</li>"; }

var PAGE={};
PAGE.grahas=function(J){
  return J.grahas.map(function(g){
    return li("<b>"+esc(gname(g))+"</b> — "+esc(rname(g.rashi))+" "+deg(g.rashi.degInSign)+
      ", house "+houseOf(J,g)+(g.retrograde?", retrograde":"")+(g.combust?", combust":"")); }).join("");
};
PAGE.dignity=function(J){
  var out=J.grahas.filter(function(g){ return g.key!=="Rāhu"&&g.key!=="Ketu"; })
    .map(function(g){
      return li("<b>"+esc(gname(g))+"</b> in "+esc(rname(g.rashi))+" — "+
        esc(DIGN[g.dignity]||g.dignity)+
        (g.combust?", and combust (astaṅgata)":"")+(g.retrograde?", retrograde":"")); }).join("");
  return out;
};
PAGE.rashis=function(J){
  var by={};
  J.grahas.forEach(function(g){ (by[g.rashi.idx]=by[g.rashi.idx]||[]).push(gname(g)); });
  var o=li("Lagna rises in <b>"+esc(rname(J.lagna.rashi))+"</b> at "+deg(J.lagna.rashi.degInSign)+".");
  Object.keys(by).sort(function(a,b){ return a-b; }).forEach(function(i){
    o+=li("<b>"+esc(SA[i])+"</b> holds "+esc(by[i].join(", "))+"."); });
  return o;
};
PAGE.bhavas=function(J){
  return J.bhavas.map(function(b,i){
    var occ=(b.occupants||[]).join(", ");
    return li("<b>House "+(i+1)+"</b> ("+esc(b.sa)+") — "+esc(rname(b.rashi))+
      ", lord "+esc(b.ruler)+(occ?(", holding "+esc(occ)):", empty")); }).join("");
};
PAGE.lagna=function(J){
  var l=J.lagna, lord=null;
  J.bhavas&&J.bhavas[0]&&(lord=J.bhavas[0].ruler);
  var lp=J.grahas.filter(function(g){ return g.key===lord||g.sa===lord||g.iast===lord; })[0];
  var o=li("Your lagna is <b>"+esc(rname(l.rashi))+"</b> at "+deg(l.rashi.degInSign)+
    ", nakṣatra pāda "+l.nakshatra_pada+".");
  if(lp) o+=li("Its lord <b>"+esc(gname(lp))+"</b> sits in "+esc(rname(lp.rashi))+
    ", house "+houseOf(J,lp)+" — "+esc(DIGN[lp.dignity]||lp.dignity)+".");
  if(J.rashi_rising_times) o+=li("At this latitude "+esc(rname(l.rashi))+
    " takes about "+Math.round((J.rashi_rising_times[l.rashi.idx]||0))+" minutes to rise.");
  return o;
};
PAGE.aspects=function(J){
  var sp={"Maṅgala":[4,8],"Guru":[5,9],"Śani":[3,10]};
  var o=[];
  J.grahas.forEach(function(g){
    var n=gname(g), h=houseOf(J,g), extra=sp[n];
    var hits=[7].concat(extra||[]).map(function(k){ return ((h-1+k-1)%12)+1; });
    o.push(li("<b>"+esc(n)+"</b> in house "+h+" aspects houses "+hits.join(", ")+
      (extra?" (the 7th, and its own "+extra.join(" and ")+")":" (the 7th)")));
  });
  return o.join("");
};
PAGE.vargas=function(J){
  return (J.vargas||[]).slice(0,16).map(function(v){
    return li("<b>"+esc(v.varga)+"</b> — "+esc(v.en)+": lagna in "+esc(SA[v.lagna])); }).join("");
};
PAGE.strength=function(J){
  var sb=J.shadbala&&J.shadbala.planets; if(!sb) return "";
  var rows=sb.slice().sort(function(a,b){ return (b.total_rupa||b.total||0)-(a.total_rupa||a.total||0); });
  return rows.map(function(p){
    var t=p.total_rupa!=null?p.total_rupa:p.total;
    var req=p.required_rupa!=null?p.required_rupa:p.required;
    var ratio=(req? (t/req) : null);
    return li("<b>"+esc(p.graha)+"</b> — "+(t!=null?Number(t).toFixed(2)+" rūpa":"")+
      (ratio?(", "+ratio.toFixed(2)+"× what it needs"):"")); }).join("");
};
PAGE["special-points"]=function(J){
  var o="";
  (J.chara_karakas||[]).slice(0,4).forEach(function(k){
    o+=li("<b>"+esc(k.label_short)+"</b> ("+esc(k.label_en)+") — "+esc(k.graha)+
      " at "+deg(k.deg_in_sign)); });
  (J.arudhas||[]).slice(0,2).forEach(function(a){
    o+=li("<b>"+esc(a.arudha_label)+"</b> — "+esc(a.arudha_rashi_sa)); });
  return o;
};
PAGE.yogas=function(J){
  var has=(J.yogas||[]).filter(function(y){ return y.present; });
  if(!has.length) return li("None of the yogas this engine checks is formed in your chart.");
  return has.map(function(y){
    return li("<b>"+esc(y.iast||y.key)+"</b> — "+esc((y.en||"").split("—")[0].trim())+
      (y.detail?(". "+esc(y.detail)):"")); }).join("");
};
PAGE["avasthas-longevity"]=function(J){
  return (J.avasthas||[]).map(function(a){
    return li("<b>"+esc(a.graha)+"</b> — "+esc(a.avastha_iast)+" avasthā"+
      (a.strength_percent!=null?(", "+a.strength_percent+"% of its scale"):"")); }).join("");
};
PAGE.ashtakavarga=function(J){
  var av=J.ashtakavarga; if(!av) return "";
  var o=li("Sarvāṣṭakavarga totals <b>"+av.sarva_total+"</b> bindus (the expected total is 337).");
  if(av.sarva){
    var pairs=av.sarva.map(function(v,i){ return {i:i,v:v}; }).sort(function(a,b){ return b.v-a.v; });
    o+=li("Best supported: <b>"+esc(SA[pairs[0].i])+"</b> with "+pairs[0].v+" bindus.");
    o+=li("Least: <b>"+esc(SA[pairs[pairs.length-1].i])+"</b> with "+pairs[pairs.length-1].v+".");
  }
  return o;
};
/* Viṃśottarī from the Moon's nakṣatra. The engine stops at positions, so the
   balance is worked out here: BPHS gives the 120-year scheme and the lord
   order, and the remaining fraction of the nakṣatra is the remaining fraction
   of that lord's mahādaśā. */
var VD=[["Ketu",7],["Venus",20],["Sun",6],["Moon",10],["Mars",7],
        ["Rahu",18],["Jupiter",16],["Saturn",19],["Mercury",17]];
PAGE.dashas=function(J){
  var moon=J.grahas.filter(function(g){ return /Candra|Moon/.test(g.key||g.sa||""); })[0];
  if(!moon) return "";
  var lon=moon.sidereal_deg, seg=40/3;          /* 13°20′ */
  var nk=Math.floor(lon/seg), frac=(lon-nk*seg)/seg;
  var start=nk%9, lord=VD[start], bal=lord[1]*(1-frac);
  var o=li("Moon in <b>"+esc(rname(moon.rashi))+"</b>, nakṣatra "+(nk+1)+" of 27, "+
    Math.round(frac*100)+"% elapsed.");
  o+=li("The sequence opens with <b>"+lord[0]+"</b>, with "+bal.toFixed(2)+
    " years of its "+lord[1]+" remaining at birth.");
  var t=new Date(Date.UTC(J.input.year,J.input.month-1,J.input.day));
  t=new Date(t.getTime()+bal*365.2425*864e5);
  var i=start, guard=0;
  while(t<new Date() && guard++<12){ i=(i+1)%9; t=new Date(t.getTime()+VD[i][1]*365.2425*864e5); }
  o+=li("That puts the <b>"+VD[i][0]+"</b> mahādaśā as the one running now, to about "+
    t.toISOString().slice(0,7)+". The chart page computes this exactly.");
  return o;
};

/* ------------------------------------------------------------------- render */
function pageKey(){
  var f=(location.pathname.split("/").pop()||"index.html").replace(/\.html$/,"");
  return f||"index";
}
function anchor(){
  var main=document.querySelector("main"); if(!main) return null;
  var lead=main.querySelector("p.lead");
  return {parent:main, before: lead? lead.nextSibling : main.firstChild};
}
function invite(){
  if(document.querySelector(".inchart-ask")) return;
  if(!PAGE[pageKey()]) return;
  var a=anchor(); if(!a) return;
  var d=el("p","inchart-ask",
    'Reading this with a chart of your own? <a href="kundli.html">Cast one</a> '+
    'and this page will show your own placements alongside the rule.');
  a.parent.insertBefore(d,a.before);
}
function strip(J,birth){
  var fn=PAGE[pageKey()]; if(!fn) return;
  var body="";
  try{ body=fn(J)||""; }catch(e){ return; }
  if(!body) return;
  var a=anchor(); if(!a) return;
  var ask=document.querySelector(".inchart-ask");
  if(ask) ask.parentNode.removeChild(ask);
  var who=(birth.name||"").trim();
  var box=el("section","inchart");
  box.innerHTML=
    '<h4>In your chart'+(who?(' <span>· '+esc(who)+'</span>'):'')+'</h4>'+
    '<ul>'+body+'</ul>'+
    '<p class="inchart-f">Computed here, in this browser, from the birth details you entered on the '+
    '<a href="kundli.html">chart page</a> — they are kept in this browser only and never sent anywhere. '+
    '<button type="button" class="inchart-x">Forget this chart</button></p>';
  box.querySelector(".inchart-x").addEventListener("click",forget);
  a.parent.insertBefore(box,a.before);
}
function chartInit(){
  if(!PAGE[pageKey()]) return;
  var birth=readBirth();
  if(!birth){ invite(); return; }
  withEngine(function(){
    if(!window.buildLocalChart) return;
    var J;
    try{ J=window.buildLocalChart(birth); }catch(e){ return; }
    try{ strip(J,birth); }catch(e){}
  });
}

function boot(){ try{ navInit(); }catch(e){}
                 try{ asideInit(); }catch(e){}
                 try{ chartInit(); }catch(e){} }
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot);
else boot();
})();

/* now.html carries its own script. It is injected from here rather than from a
   second <script> in the shared shell, because every other page would then pay a
   request for a file it never uses. */
(function(){
  if(!document.getElementById("nowgrid")) return;
  var s=document.createElement("script");
  s.src="now.js"; s.defer=true;
  document.head.appendChild(s);
})();
