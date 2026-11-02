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
  /* The teardown used to run 1.5 seconds after window.print() was called.
     In a browser that is safe: print() blocks until the dialog is dismissed,
     so the timer only starts once the reader has finished. In the desktop app
     it is not — the system print panel is a sheet that does NOT block the
     script, so the timer fired while the panel was still open and deleted the
     document out from under it. The reader got a blank or half-built page,
     which is exactly "the Print button does not work properly".

     afterprint is the real signal and was always listened for. The timer is
     now only a last resort for a window that never fires it, and it is long
     enough that nobody reaches it by reading the print dialog. */
  setTimeout(function(){
    try{ window.print(); }
    catch(e){
      cleanup();
      alert("This window would not open a print dialog. Use the browser or "+
            "system print command instead — the report is already laid out for it.");
      return;
    }
    setTimeout(cleanup,120000);
  },250);
}
window.__printFullReport=printFullReport;
window.__buildPrintDoc=buildPrintDoc;

/* ---------- handing a document to the machine's own browser ----------

   WHY THIS EXISTS. Two buttons in the app need to end up somewhere the app
   itself is not: the visual dashboard, which the reader wants in a real
   browser window, and Print, whose dialog the webview does not reliably
   raise. Both run into the same wall, and it is worth stating because the
   obvious fixes all fail:

     * localStorage cannot carry the chart. The app serves from its own
       scheme and a browser opening a file:// page is a different origin, so
       the handoff the website uses finds nothing at the other end.
     * The URL fragment cannot carry it either. A full export is several
       hundred kilobytes; a fragment is not.
     * Writing a temporary file and opening it would need the filesystem and
       shell capabilities this build deliberately does not have. The app has
       no plugin that can reach the disk or the network, and that is a
       property worth more than a convenience.

   What is left, and what this does: build ONE self-contained file with the
   document and its data already inside it, and save it the way every other
   download on this site is saved — a blob and an anchor, no capability
   beyond what a web page already has. The reader opens it in whatever
   browser they use, and it works offline forever because nothing in it is
   fetched.

   On the website neither button needs any of this, and neither uses it. */
function appSave(html,filename,note){
  try{
    var blob=new Blob([html],{type:"text/html"});
    var u=URL.createObjectURL(blob), a=document.createElement("a");
    a.href=u; a.download=filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(u); },4000);
    appNote(note||("Saved as <b>"+esc(filename)+"</b> — it is in your Downloads, and "+
      "opens in your default browser. Everything it needs is inside the file."));
    return true;
  }catch(e){
    appNote("<b>The file could not be saved.</b> "+esc(e.message||String(e)),true);
    return false;
  }
}
/* A line under the buttons rather than an alert: an alert in a webview is a
   modal the reader has to dismiss before they can act on what it told them. */
function appNote(html,bad){
  var bar=document.querySelector(".kreport .krdash")||document.querySelector(".kreport .krprint");
  if(!bar) return;
  var n=bar.parentNode.querySelector(".kappnote");
  if(!n){ n=document.createElement("p"); n.className="kappnote";
          bar.parentNode.insertBefore(n,bar.nextSibling); }
  n.innerHTML=html; n.classList.toggle("bad",!!bad);
  clearTimeout(n.__t); n.__t=setTimeout(function(){ n.innerHTML=""; },20000);
}
function chartSlug(){
  return String(window.__kname||"kundli").replace(/[^\w\- ]+/g,"")
    .replace(/\s+/g,"-").toLowerCase()||"kundli";
}

/* The dashboard, as one file with the chart already in it.
   dashboard.html is read from the app's own bundle — same origin, no network,
   the same read a stylesheet does — and the chart is substituted into the
   empty payload slot it already carries for exactly this purpose. */
function dashboardStandalone(){
  if(!window.__kdata){ appNote("<b>Cast a chart first.</b>",true); return; }
  appNote("Building the dashboard…");
  fetch("dashboard.html").then(function(r){
    if(!r.ok) throw new Error("HTTP "+r.status);
    return r.text();
  }).then(function(src){
    var slot='<script id="kundali-data" type="application/json">';
    var i=src.indexOf(slot);
    if(i<0) throw new Error("the dashboard's data slot was not found");
    var j=src.indexOf("<\/script>",i);
    /* "</" inside a script body would close it early, so the only character
       that has to be escaped is the slash of a closing tag. */
    var payload=JSON.stringify(window.__kdata).replace(/<\//g,"<\\/");
    var out=src.slice(0,i+slot.length)+payload+src.slice(j);
    /* The app build of this page links app-shell.css and app-shell.js, which
       exist only inside the bundle. A copy opened from Downloads asked for
       both, got two file-not-found errors in the console, and briefly tried
       to wear chrome belonging to an application it is no longer part of.
       They are dropped: this file is for a browser. */
    out=out.replace(/<link[^>]+app-shell\.css[^>]*>/g,"")
           .replace(/<script[^>]+app-shell\.js[^>]*><\/script>/g,"");
    appSave(out,chartSlug()+"-dashboard.html",
      "Saved as <b>"+esc(chartSlug())+"-dashboard.html</b> — in your Downloads, with the "+
      "chart already inside it. Open it and your default browser draws the whole dashboard; "+
      "nothing is fetched, so it keeps working offline and after this app is closed.");
  }).catch(function(e){
    appNote("<b>The dashboard could not be built.</b> "+esc(e.message||String(e))+
      " Opening it in this window instead.",true);
    try{ location.href="dashboard.html"; }catch(e2){}
  });
}

/* The full report, as one file laid out for printing.
   window.print() is the right thing in a browser and unreliable in this
   webview — raising no dialog and throwing nothing, so there is nothing to
   catch and nothing to report. Rather than guess at why, the app produces the
   same document the print path builds, standalone, and lets the browser print
   it: Cmd-P there also gives Save as PDF, which is what most people pressing
   Print on a 44-page report actually wanted. */
function printStandalone(){
  var w=buildPrintDoc();
  if(!w){ appNote("<b>Cast a chart first.</b>",true); return; }
  var css="";
  try{
    /* the page's own stylesheets, inlined, so the file needs nothing beside it */
    [].forEach.call(document.querySelectorAll("style"),function(s){ css+=s.textContent+"\n"; });
  }catch(e){}
  var body=w.outerHTML||w.innerHTML||"";
  var doc='<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">'+
    '<meta name="viewport" content="width=device-width, initial-scale=1">'+
    '<title>'+esc(window.__kname||"Kundli")+' — full report</title><style>'+css+
    /* the print rules the app applies through a body class, made unconditional
       here because this file exists only to be printed */
    /* The report's own rules hide #kprintdoc on screen and reveal it only
       inside @media print, and they do it by hiding every OTHER child of
       body. In this file there are no other children — the report is the
       whole document — so both rules have nothing to do but get in the way:
       the first left a reader staring at a blank page, and the second would
       have hidden the wrapper and printed nothing at all. Overridden here
       rather than loosened in app.css, where they are correct. */
    '\nbody{background:#fff;margin:0;padding:18px}\n'+
    '#kprintdoc{display:block!important}\n'+
    '.kprintonly{display:block}\n'+
    '@media print{body.printing>*{display:block!important}#kprintdoc{display:block!important}}\n'+
    '@page{margin:14mm}\n'+
    '</style></head><body class="printing"><div class="kreport">'+
    '<p class="prbanner">Press <b>Ctrl-P</b> or <b>Cmd-P</b> to print this, or to save it as a '+
    'PDF. This file holds the whole report and needs nothing else — it works offline, and '+
    'it will still work when this app is closed.</p>'+body+'</div>'+
    /* No auto-print. A file the reader has just opened may be one they want
       to look at before printing, and a dialog that appears unasked over a
       page they have not seen is the same discourtesy as the veil over the
       error message was. The browser's own Cmd-P is one keystroke away and
       the banner says so. */
    '</body></html>';
  var d=document.getElementById("kprintdoc"); if(d) d.parentNode.removeChild(d);
  appSave(doc,chartSlug()+"-full-report.html",
    "Saved as <b>"+esc(chartSlug())+"-full-report.html</b> — in your Downloads. Open it and "+
    "your browser offers the print dialog straight away, with <b>Save as PDF</b> in the same "+
    "place. Every tab is in it, laid out for paper.");
}
window.__dashboardStandalone=dashboardStandalone;
window.__printStandalone=printStandalone;
document.addEventListener("click",function(ev){
  /* closest(), not ev.target. These are two buttons whose labels contain a
     span and an entity, and a click that lands on an inner node has a target
     that is not the button — the attribute lookup then finds nothing and the
     click does nothing at all, silently. It happened to work wherever the
     label was a single text node. */
  var t=ev.target&&ev.target.closest?ev.target.closest("[data-krprint],[data-kdash]"):ev.target;
  if(!t||!t.getAttribute) return;

  if(t.getAttribute("data-krprint")!=null){
    ev.preventDefault();
    /* In the app, window.print() raises no dialog and throws nothing, so
       there is neither a result nor an error to report — the button simply
       appeared dead. It writes the same document to a file instead, where
       the browser's own print dialog is a certainty rather than a hope. */
    if(window.__isApp) printStandalone(); else printFullReport();
    return;
  }

  if(t.getAttribute("data-kdash")!=null){
    if(window.__isApp){
      /* The dashboard belongs in a real browser window, which is where the
         reader asked for it. It cannot be handed the chart through
         localStorage — a browser opening a file is a different origin from
         this app — so it is handed a copy of itself with the chart already
         inside. See appSave above for why the alternatives do not work. */
      ev.preventDefault();
      dashboardStandalone();
      return;
    }
    try{
      /* Storage key, not branding: dashboard.html reads this exact string. Renaming
         it here alone makes the handoff fail silently, with the dashboard simply
         finding nothing. */
      if(window.__kdata) localStorage.setItem("learnhoro.chart",JSON.stringify(window.__kdata));
    }catch(e){ /* quota or private mode — the dashboard will ask for a file instead */ }
  }
});
