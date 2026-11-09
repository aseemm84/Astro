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

/* calendar.html likewise. It pulls in panchanga.js and engine.js itself once it
   knows it is wanted, so a reader who never opens the calendar never pays for
   either — which is the same bargain the chart engine already makes. */
(function(){
  if(!document.getElementById("cbody")) return;
  var s=document.createElement("script");
  s.src="calendar.js"; s.defer=true;
  document.head.appendChild(s);
})();

/* studio.html, on the same bargain: nobody who never opens it pays for it.
   cards.js carries the reel strip and the composer; it waits for studio.js to
   publish its state rather than being sequenced here, so a slow load of one
   cannot leave the other half-built. */
(function(){
  if(!document.getElementById("stcards")) return;
  ["studio.js","cards.js"].forEach(function(src){
    var s=document.createElement("script");
    s.src=src; s.defer=true;
    document.head.appendChild(s);
  });
})();

/* The service worker, so the hosted site works offline the way a local copy
   already does, and a repeat visit does not re-fetch 200 KB of engine.
   Registered here rather than in each page's head: one place, every page.

   Only over http(s). A service worker cannot be registered from file://, and
   attempting it throws — which matters because opening the site from Finder is a
   supported way to use it, not an edge case. Registration failure of any kind is
   swallowed: a reader whose browser refuses workers should get the site, not an
   error, since every page already works without one. */
(function(){
  if(!("serviceWorker" in navigator)) return;
  if(location.protocol!=="http:" && location.protocol!=="https:") return;
  window.addEventListener("load",function(){
    navigator.serviceWorker.register("sw.js").catch(function(){});
  });
})();
;

/* ===== the master settings panel =========================================

   One overlay, reachable from every page, holding the settings that used to
   live on whichever page happened to need them. Before this, the ayanāṃśa and
   the bhāva frame were controls on the Kundli form, the sunrise convention was
   a control on the pañcāṅga views, and the theme was a picker in the nav —
   four places, three storage schemes, and no single answer to "what is this
   site set to".

   WHY IT IS CONCATENATED INTO site.js RATHER THAN SHIPPED AS ITS OWN FILE.
   site.js is referenced by the shell, so it is already on all 65 pages, in the
   desktop app's file table, and in the service worker's precache list. A new
   shared file would have had to be added to each of those three by hand, and
   the one that gets forgotten is the service worker — which then serves a
   previous build's pages against a new build's script. One source file for
   editing, one shipped file for reliability.

   THE STORE. A single JSON object under nirayana.settings, with one
   exception: the theme stays in its own key and is read and written only
   through window.NTheme. Two writers for one setting is how they drift, and
   theme.js has to run before first paint, which this file does not.

   The sunrise convention is ALSO written to nirayana.riseconv, the key
   panchanga.js and now.js already read on their own. That is deliberate
   duplication with one writer: this file writes both, those files keep
   reading the key they always read, and nothing downstream had to change.

   EVERY TOUCH OF localStorage IS WRAPPED. This site runs from a folder of
   files as happily as from a server; in a private window or with site data
   blocked, reading throws. A store that cannot be read means defaults, not a
   broken page — the same rule theme.js states. */

(function () {
  "use strict";

  var KEY = "nirayana.settings";
  var RISEKEY = "nirayana.riseconv";

  /* The defaults ARE the site as it was before this panel existed. Whole-sign
     bhāvas, Lahiri, mean nodes, upper-limb sunrise, degrees-and-minutes, and
     cautions shown. A reader who never opens the panel must get exactly the
     site they got yesterday — the same property theme.js secures by applying
     no attribute at all until asked. */
  var DEF = { ayan: "lahiri", house: "whole", node: "mean",
              riseconv: "limb", degfmt: "dm", caution: "on" };

  var OPTS = {
    house: [["whole", "Whole-sign — rāśi is bhāva, from the lagna (BPHS)"],
            ["sripati", "Śrīpati bhāva-chalita — trisected quadrants (later tradition)"]],
    node:  [["mean", "Mean node — the averaged lunar node (BPHS's reckoning)"],
            ["true", "True node — the osculating node"]],
    riseconv: [["limb", "Upper limb with refraction — the almanac convention"],
               ["centre", "Centre of the disc with refraction"],
               ["geom", "Geometric horizon, no refraction"]],
    degfmt: [["dm", "Degrees and minutes — 12°34′"],
             ["dms", "Degrees, minutes, seconds — 12°34′56″"],
             ["dec", "Decimal degrees — 12.5822°"]],
    caution: [["on", "Show rectification cautions"],
              ["off", "Hide them — I know the birth time is approximate"]]
  };

  function clamp(k, v) {
    if (k === "ayan") return (typeof v === "string" && v) ? v : DEF.ayan;
    var L = OPTS[k]; if (!L) return DEF[k];
    for (var i = 0; i < L.length; i++) if (L[i][0] === v) return v;
    return DEF[k];
  }

  var cache = null;
  function get() {
    if (cache) return cache;
    var o = {};
    try {
      var raw = window.localStorage.getItem(KEY);
      if (raw) o = JSON.parse(raw) || {};
    } catch (e) { o = {}; }
    var out = {};
    Object.keys(DEF).forEach(function (k) { out[k] = clamp(k, o[k]); });
    /* a riseconv written by the pañcāṅga pages before this panel existed is
       the reader's real choice and must not be overwritten by the default */
    if (o.riseconv == null) {
      try {
        var rc = window.localStorage.getItem(RISEKEY);
        if (rc) out.riseconv = clamp("riseconv", rc);
      } catch (e) {}
    }
    cache = out;
    return out;
  }

  function set(patch, opts) {
    var cur = get(), next = {}, changed = [];
    Object.keys(DEF).forEach(function (k) { next[k] = cur[k]; });
    Object.keys(patch || {}).forEach(function (k) {
      if (!(k in DEF)) return;
      var v = clamp(k, patch[k]);
      if (v !== next[k]) { next[k] = v; changed.push(k); }
    });
    if (!changed.length) return { changed: [], settings: next };
    cache = next;
    try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) {}
    if (changed.indexOf("riseconv") >= 0) {
      /* write the legacy key AND tell panchanga.js, which caches its own copy
         and clears a derived cache when it is told — setting the key alone
         would leave this tab computing yesterday's sunrise */
      try { window.localStorage.setItem(RISEKEY, next.riseconv); } catch (e) {}
      try { if (window.NP && window.NP.setConv) window.NP.setConv(next.riseconv); } catch (e) {}
    }
    if (!(opts && opts.silent)) broadcast(changed, next);
    return { changed: changed, settings: next };
  }

  /* The caution setting is expressed as an attribute on <html> so that CSS
     does the hiding and no section has to ask. A note opts in by carrying
     .krect — there is no single caution marker in the report today, so this
     reaches the notes that have been marked and nothing else, which is what
     the panel claims and no more. */
  function applyAttrs(s) {
    try {
      var h = document.documentElement;
      if (s.caution === "off") h.setAttribute("data-caution", "off");
      else h.removeAttribute("data-caution");
      h.setAttribute("data-degfmt", s.degfmt);
    } catch (e) {}
  }

  function broadcast(changed, s) {
    applyAttrs(s);
    try {
      window.dispatchEvent(new CustomEvent("nirayana:settings",
        { detail: { changed: changed, settings: s } }));
    } catch (e) {}
  }

  /* ---- the overlay ------------------------------------------------------
     Built in JS and appended to <body> on every page, rather than written
     into the shell: the shell is one line shared by 65 pages and a markup
     block there is 65 copies of the same thing to keep in step. */
  var EL = null;

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function row(k, label, note, list) {
    var s = get(), o = "";
    (list || OPTS[k]).forEach(function (p) {
      o += '<option value="' + esc(p[0]) + '"' + (p[0] === s[k] ? " selected" : "") +
           ">" + esc(p[1]) + "</option>";
    });
    return '<div class="nsrow"><label for="nset-' + k + '">' + esc(label) + '</label>' +
      '<select id="nset-' + k + '" data-nset="' + k + '">' + o + '</select>' +
      (note ? '<p class="nsnote">' + note + "</p>" : "") + "</div>";
  }

  function ayanRow() {
    var M = window.__ayanModes, s = get();
    if (!M) {
      /* the engine is not on this page, so the list cannot be built from it.
         Offering a hand-written list here would be a second list to keep in
         step with AYAN_MODES — the exact bug the Kundli picker's comment
         records. The stored value is shown and left alone instead. */
      return '<div class="nsrow"><label>Ayanāṃśa</label>' +
        '<p class="nsnote">Currently <b>' + esc(s.ayan) + '</b>. The picker needs the ' +
        'engine, which this page does not load — open this panel from the Kundli ' +
        'builder, the Workstation or the Ayanāṃśa page to change it.</p></div>';
    }
    var fams = window.__ayanFamilies, done = {}, o = "";
    function opt(k) {
      done[k] = 1; var m = M[k]; if (!m) return "";
      return '<option value="' + esc(k) + '"' + (k === s.ayan ? " selected" : "") +
             ">" + esc(m.name) + "</option>";
    }
    if (fams && fams.length) fams.forEach(function (f) {
      var inner = f[2].filter(function (k) { return M[k]; }).map(opt).join("");
      if (inner) o += '<optgroup label="' + esc(f[0]) + '">' + inner + "</optgroup>";
    });
    var rest = Object.keys(M).filter(function (k) { return !done[k]; }).map(opt).join("");
    if (rest) o += '<optgroup label="Other">' + rest + "</optgroup>";
    return '<div class="nsrow"><label for="nset-ayan">Ayanāṃśa</label>' +
      '<select id="nset-ayan" data-nset="ayan">' + o + "</select>" +
      '<p class="nsnote">Where sidereal zero sits. A <b>convention, not a measurement</b>: ' +
      'the nineteen offered span about 5° today, so they give different charts rather than ' +
      'refinements of one. Lahiri is the Indian civil standard and everything on this site ' +
      'is validated against it.</p></div>';
  }

  function build() {
    if (EL || !document.body) return;
    EL = document.createElement("div");
    EL.className = "nsover";
    EL.setAttribute("hidden", "");
    EL.innerHTML =
      '<div class="nsback" data-nset-close="1"></div>' +
      '<div class="nspanel" role="dialog" aria-modal="true" aria-labelledby="nset-h">' +
        '<div class="nshead"><h2 id="nset-h">Settings</h2>' +
          '<button type="button" class="nsx" data-nset-close="1" aria-label="Close settings">×</button></div>' +
        '<div class="nsbody">' +
          '<p class="nsnote nslede">These apply to <b>the whole site</b> — every page and ' +
          'every new chart, in the browser and in the desktop app. They are kept in this ' +
          'browser only and nothing is sent anywhere.</p>' +

          '<h3>Reckoning</h3>' +
          ayanRow() +
          row("house", "Bhāva frame (house system)",
            'Decides how every bhāva is reckoned — which bhāva each graha occupies, which ' +
            'rāśi gives each bhāva its lord, and the strengths that follow. Whole-sign is ' +
            'what BPHS uses. Under Śrīpati a bhāva can span two rāśis and its lord is taken ' +
            'from the rāśi holding the <i>madhya</i>. Divisional charts have no cusps of ' +
            'their own, so they keep whole-sign houses and carry the rāśi chart’s bhāva ' +
            'alongside, labelled.') +
          row("node", "Lunar nodes",
            'BPHS reckons Rāhu and Ketu as the mean node. The true node can sit up to about ' +
            '1½° away.') +
          row("riseconv", "Sunrise",
            'Re-dates everything downstream: the vāra, the ghaṭī count, which tithi is ' +
            'today’s, and therefore which day a festival lands on.') +

          '<h3>Presentation</h3>' +
          /* no <label> here: theme.js brings its own (.themepickl), and two
             would read as two settings */
          '<div class="nsrow" id="nset-theme-slot">' +
            '<p class="nsnote">Palette for the whole site. The desktop app follows ' +
            'the system appearance until a choice is made here.</p></div>' +
          row("degfmt", "Degrees",
            'Applies to the chart report. The standalone visualisation pages (Ayanāṃśa, ' +
            'the labs, Divisions) each format their own figures to suit their own scale ' +
            'and are <b>not</b> changed by this — thirteen different formatters exist ' +
            'across the site and they round differently on purpose.') +
          /* NO "rectification cautions" ROW, deliberately, though the store and
             the data-caution attribute below support one. The site's birth-time
             caveats are not standalone notes: they are clauses inside
             informative paragraphs ("...all are as reliable as the recorded
             birth time", "...a birth time a few minutes out would move it
             back"). Hiding them would mutilate the sentence and take real
             content with it. Separating caveat from content across those
             sections is editorial work, not a toggle. The plumbing is in place
             so a note can opt in with class="krect" and the row can be added
             the moment there is something for it to act on — shipping the
             control before then would be a switch that visibly does nothing,
             which is the thing this project refuses to do elsewhere. */

          '<div class="nsfoot">' +
            '<button type="button" class="nsbtn" data-nset-reset="1">Reset to defaults</button>' +
            '<span class="nsnote nsfootnote">Changes apply at once. A chart already on screen ' +
            'is offered a re-cast rather than silently recomputed.</span>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(EL);

    EL.addEventListener("click", function (e) {
      var t = e.target;
      if (t && t.getAttribute && t.getAttribute("data-nset-close")) { close(); return; }
      if (t && t.getAttribute && t.getAttribute("data-nset-reset")) {
        set(DEF); refresh(); return;
      }
    });
    EL.addEventListener("change", function (e) {
      var t = e.target, k = t && t.getAttribute && t.getAttribute("data-nset");
      if (!k) return;
      set.call(null, (function () { var p = {}; p[k] = t.value; return p; })());
    });
    /* Escape closes, and focus goes back to the button that opened it —
       otherwise a keyboard reader is left at the top of the document */
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && EL && !EL.hasAttribute("hidden")) close();
    });
    /* theme.js mounts its own control into this slot when the panel exists,
       so there is still exactly one theme picker on the page */
    try { if (window.NTheme && window.NTheme.mountInto) window.NTheme.mountInto("nset-theme-slot"); }
    catch (e) {}
  }

  function refresh() {
    if (!EL) return;
    Object.keys(DEF).forEach(function (k) {
      var el = document.getElementById("nset-" + k);
      if (el) el.value = get()[k];
    });
  }

  var opener = null;
  function open() {
    build(); if (!EL) return;
    opener = document.activeElement;
    refresh();
    EL.removeAttribute("hidden");
    var f = EL.querySelector("select, button");
    if (f) try { f.focus(); } catch (e) {}
  }
  function close() {
    if (!EL) return;
    EL.setAttribute("hidden", "");
    if (opener && opener.focus) try { opener.focus(); } catch (e) {}
  }

  /* ---- the trigger, in the nav beside the theme picker's old home ------- */
  function mount() {
    if (document.querySelector(".nsopen")) return;
    /* Not every page has nav.site. The dashboard has its own chrome
       (nav.adchrome) and the panel has to be reachable there too, so the host
       is the first of several candidates and, failing all of them, a floating
       button — a settings panel that exists on sixty-four pages out of
       sixty-five is a settings panel the reader cannot trust. The dashboard
       had no theme picker at all before this, because theme.js looks only for
       nav.site; mounting the panel there gives it one. */
    var nav = document.querySelector("nav.site")
           || document.querySelector("nav.adchrome .adchrome-links")
           || document.querySelector("nav.adchrome")
           || document.querySelector("nav");
    var floating = false;
    if (!nav) { nav = document.body; floating = true; }
    if (!nav) return;
    var b = document.createElement("button");
    if (floating) b.style.cssText =
      "position:fixed;right:14px;bottom:14px;z-index:9998";
    b.type = "button";
    b.className = "nsopen";
    b.setAttribute("aria-label", "Site settings");
    b.innerHTML = "⚙ Settings";
    b.addEventListener("click", open);
    nav.appendChild(b);
    build();
  }

  /* another tab changing the settings should change this one: the reader
     thinks of it as one site, not one site per tab */
  try {
    window.addEventListener("storage", function (e) {
      if (!e || (e.key !== KEY && e.key !== RISEKEY)) return;
      cache = null; refresh(); broadcast(Object.keys(DEF), get());
    });
  } catch (e) {}

  applyAttrs(get());
  if (document.readyState === "loading")
    /* wrapped for the same reason theme.js is: mount takes no argument today,
       but a listener passed directly receives the Event, and that is how
       theme.js's nav became an event object. Cheap insurance. */
    document.addEventListener("DOMContentLoaded", function () { mount(); });
  else mount();

  window.NSettings = { get: get, set: set, defaults: function () {
    var d = {}; Object.keys(DEF).forEach(function (k) { d[k] = DEF[k]; }); return d;
  }, open: open, close: close, options: OPTS };
})();
;
