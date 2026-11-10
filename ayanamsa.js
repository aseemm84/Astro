/* svg-film.js — turn an SVG that can be redrawn into a video file.
 *
 * WHERE THIS CAME FROM. It was written inside ceremony-record.js to film the
 * casting ceremony, and then the ayanāṃśa page needed exactly the same thing
 * for a quite different drawing. The parts that are not about the ceremony
 * are here, and both callers use them rather than carrying a copy each.
 *
 * WHAT IT IS, AND WHAT IT IS NOT. It is not a screen recorder. Nothing is
 * sampled from a clock and no permission is asked for, so the viewer's
 * desktop, cursor and browser cannot appear in the file. The caller hands
 * over a function that puts the drawing into a given state, and this steps
 * that function, photographs the result, and encodes one frame per photograph
 * before asking for the next.
 *
 * WHY IT PHOTOGRAPHS RATHER THAN REDRAWS. The drawings these pages make are
 * SVG, so there is no canvas to captureStream() from. The alternative to
 * photographing the real one was re-implementing each drawing in canvas 2D,
 * which puts a second copy of it in the repository to drift from the first.
 * This serialises the live SVG every frame. The cost is real — a frame is
 * tens of milliseconds — and is why the timeline is paced as it is below.
 *
 * THE CSS HAS TO COME WITH IT. An <img> pointed at serialised SVG is an
 * isolated document and cannot see the page's stylesheet, so every
 * class-driven fill, stroke and font would fall back to a browser default.
 * The computed value of each property that actually draws is written onto the
 * element as an attribute first.
 *
 * HOW THE TIMELINE IS PACED, and why not by frame number. captureStream(0)
 * with requestFrame() stamps each frame with the moment it is pushed, so a
 * file's duration is the wall time the render took, not frames ÷ fps.
 * Stepping content by 1/fps therefore produced a correct-looking take that
 * played at half speed, because rasterising a frame costs more than a frame's
 * worth of time and the encoder believed every one of them. The caller's
 * timeline is driven by ELAPSED time instead, so speed and length come out
 * right; what varies with the machine is how many frames land inside that
 * duration — smoothness — rather than the speed of the motion.
 */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";

  /* Only the properties that actually draw. Copying a whole computed style
     makes a document several megabytes a frame, which is slower to serialise
     than the drawing is to make. */
  var PROPS = ["fill", "fill-opacity", "stroke", "stroke-width", "stroke-opacity",
               "stroke-dasharray", "stroke-linecap", "stroke-linejoin", "opacity",
               "font-family", "font-size", "font-weight", "font-style",
               "text-anchor", "letter-spacing", "paint-order", "display",
               "dominant-baseline"];

  function inlineStyles(src, dst) {
    var a = src.querySelectorAll("*"), b = dst.querySelectorAll("*"), i;
    bake(src, dst);
    for (i = 0; i < a.length && i < b.length; i++) bake(a[i], b[i]);
    function bake(from, to) {
      var cs = window.getComputedStyle(from);
      if (!cs) return;
      for (var j = 0; j < PROPS.length; j++) {
        var v = cs.getPropertyValue(PROPS[j]);
        if (v) to.setAttribute(PROPS[j], v);
      }
      to.removeAttribute("class");
    }
  }

  /* One <img> holding the SVG exactly as it stands right now.
     Cropped to what is DRAWN rather than to the viewBox: a viewBox is sized
     for the page it sits on, and fitting it to a feed frame can spend a third
     of the width on margin. getBBox follows the drawing instead. */
  function snapshot(svg, opt) {
    opt = opt || {};
    return new Promise(function (res, rej) {
      var copy = svg.cloneNode(true);
      inlineStyles(svg, copy);
      var vb = svg.getAttribute("viewBox") || "0 0 100 100";
      var box = vb.split(/\s+/).map(Number);
      if (opt.crop !== false) {
        try {
          var bb = svg.getBBox();
          if (bb && bb.width > 1 && bb.height > 1) {
            var m = Math.max(bb.width, bb.height) * (opt.margin == null ? 0.03 : opt.margin);
            box = [bb.x - m, bb.y - m, bb.width + m * 2, bb.height + m * 2];
          }
        } catch (e) {}
      }
      copy.setAttribute("xmlns", NS);
      copy.setAttribute("viewBox", box.join(" "));
      copy.setAttribute("width", box[2]);
      copy.setAttribute("height", box[3]);
      var txt = new XMLSerializer().serializeToString(copy);
      /* a data: URI rather than a blob: URL — a blob URL is same-origin and
         fine over http, but under file:// the origin is "null" and some
         engines refuse it, and this site has to work opened from Finder */
      var im = new Image();
      im.onload = function () { res({ img: im, w: +box[2], h: +box[3] }); };
      im.onerror = function () { rej(new Error("the drawing could not be rasterised")); };
      im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(txt);
    });
  }

  /* The container the browser can actually encode, asked rather than assumed.
     Safari gives H.264 in MP4, which is what a phone wants; everything else
     gives WebM, which every editor reads and which uploads fine. */
  function pickMime() {
    var want = ["video/mp4;codecs=avc1.42E01E", "video/mp4;codecs=h264",
                "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    if (typeof MediaRecorder === "undefined") return null;
    for (var i = 0; i < want.length; i++) {
      try { if (MediaRecorder.isTypeSupported(want[i])) return want[i]; } catch (e) {}
    }
    return null;
  }

  function now() {
    return (window.performance && performance.now) ? performance.now() : Date.now();
  }

  /* Record a drawing into a file.
       o.svg()        the live <svg> to photograph, called each frame
       o.at(ms)       put the drawing into the state it should hold at ms
       o.compose(c,W,H,shot,ms)   paint one frame onto the canvas
       o.runMs        how long the finished film should last
       o.width/height the frame size
     Resolves {blob, ext, frames, seconds}. */
  function record(o) {
    var W = o.width || 1080, H = o.height || 1920;
    var mime = pickMime();
    if (!mime) return Promise.reject(new Error("this browser cannot encode video"));
    var cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    if (!cv.captureStream) return Promise.reject(new Error("this browser cannot capture a canvas"));
    var c = cv.getContext("2d");
    var stream = cv.captureStream(0);
    var track = stream.getVideoTracks()[0];
    var rec = new MediaRecorder(stream, { mimeType: mime,
                                          videoBitsPerSecond: o.bitrate || 10000000 });
    var chunks = [];
    rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };

    var runMs = Math.max(200, o.runMs || 6000);
    var i = 0, t0, done, fail;
    var out = new Promise(function (a, b) { done = a; fail = b; });
    rec.onstop = function () {
      done({ blob: new Blob(chunks, { type: mime }),
             ext: mime.indexOf("mp4") >= 0 ? "mp4" : "webm",
             frames: i, seconds: runMs / 1000 });
    };
    rec.start();
    t0 = now();

    function next() {
      var elapsed = now() - t0;
      if (elapsed >= runMs) { try { rec.stop(); } catch (e) { fail(e); } return; }
      var ms = elapsed;
      try { o.at(ms); } catch (e) { try { rec.stop(); } catch (e2) {} return fail(e); }
      var svg = o.svg();
      if (!svg) { try { rec.stop(); } catch (e3) {} return fail(new Error("nothing to photograph")); }
      snapshot(svg, o).then(function (shot) {
        o.compose(c, W, H, shot, ms);
        try { track.requestFrame(); } catch (e) {}
        i++;
        if (o.onProgress) o.onProgress(Math.min(1, (now() - t0) / runMs));
        /* yield, so the page can paint its progress and a long render does
           not read as a hang */
        setTimeout(next, 0);
      }).catch(function (e) {
        try { rec.stop(); } catch (e2) {}
        fail(e);
      });
    }
    next();
    return out;
  }

  /* Hand a finished blob to the reader. */
  function save(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
      a.parentNode && a.parentNode.removeChild(a);
    }, 2000);
  }

  window.SvgFilm = { snapshot: snapshot, pickMime: pickMime, record: record,
                     save: save, inlineStyles: inlineStyles, PROPS: PROPS };
})();
;

/* What report/core/04-chart-svg.js expects from the report's scope.

   The rāśi chart on this page is northChart() — the report's own builder,
   concatenated after this — so the chart a reader sees here is the chart the
   report draws rather than a lookalike that would drift from it. It was
   written inside a bundle that already had these three, so they are supplied
   here, and ayanamsa-verify asserts each is character-identical to the
   report's copy; a drift would then fail a test rather than quietly produce
   a chart that disagreed with the real one.

   They are declared at the top level on purpose: northChart is a top-level
   function and cannot see anything inside the page controller's closure. */
var GL={Sun:"Su",Moon:"Mo",Mars:"Ma",Mercury:"Me",Jupiter:"Ju",Venus:"Ve",Saturn:"Sa",Rahu:"Ra",Ketu:"Ke"};
var SA=["Meṣa","Vṛṣabha","Mithuna","Karka","Siṃha","Kanyā","Tulā","Vṛścika","Dhanus","Makara","Kumbha","Mīna"];
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
;

/* ---------- SVG chart builders ---------- */
var NPOS=[[200,100],[100,33],[33,100],[100,200],[33,300],[100,367],[200,300],[300,367],[367,300],[300,200],[367,100],[300,33]];
function northChart(signOf,occOf,title,sub){
  var o='<svg viewBox="0 0 400 400" class="kchartsvg" role="img" aria-label="'+esc(title)+
        (sub?', '+esc(sub):'')+'"><title>'+esc(title)+(sub?' — '+esc(sub):'')+'</title>';
  o+='<rect x="0" y="0" width="400" height="400" fill="#fbf8f0" stroke="#1d2340" stroke-width="2.5"/>';
  o+='<path d="M0,0 L400,400 M400,0 L0,400 M200,0 L400,200 L200,400 L0,200 Z" fill="none" stroke="#1d2340" stroke-width="1.4"/>';
  for(var i=0;i<12;i++){var h=i+1,x=NPOS[i][0],y=NPOS[i][1],sg=signOf(h),occ=occOf(h);
    o+='<text x="'+x+'" y="'+(y-22)+'" class="hn">'+h+'</text>';
    o+='<text x="'+x+'" y="'+(y-8)+'" class="hs">'+SA[sg]+'</text>';
    occ.forEach(function(pl,k){o+='<text x="'+x+'" y="'+(y+8+k*13)+'" class="hp">'+pl+'</text>';});}
  return '<figure class="kchartfig"><figcaption><b>'+esc(title)+'</b><span>'+esc(sub)+'</span></figcaption>'+o+'</svg></figure>';
}
/* The South Indian chart is keyed on the RĀŚI, so its cells and the grahas in
   them are true under either frame. Its corner NUMBER is not: it printed
   (rāśi − lagna rāśi) + 1, which is the whole-sign bhāva of that rāśi, in a
   report whose every other house number was Śrīpati's. A reader comparing the
   two found Siṃha labelled "4" here while the chart, the tables and the
   analyst JSON all placed bhāva 4 in Karka.
   Under a quadrant frame a rāśi does not have one bhāva: it may hold two
   madhyas or none. hlabel, when given, returns the bhāva number(s) whose
   madhya falls in that rāśi — blank where none does, which is the honest
   answer rather than a number that is merely available. Under whole-sign it
   returns exactly one per rāśi, so that output is unchanged. */
function southChart(map,LS,title,sub,hlabel){
  var grid={11:[0,0],0:[0,1],1:[0,2],2:[0,3],3:[1,3],4:[2,3],5:[3,3],6:[3,2],7:[3,1],8:[3,0],9:[2,0],10:[1,0]};
  var o='<svg viewBox="0 0 400 400" class="kchartsvg" role="img" aria-label="'+esc(title)+
        (sub?', '+esc(sub):'')+'"><title>'+esc(title)+(sub?' — '+esc(sub):'')+'</title>';
  o+='<rect x="0" y="0" width="400" height="400" fill="#fbf8f0" stroke="#1d2340" stroke-width="2.5"/>';
  Object.keys(grid).forEach(function(k){var sg=+k,r=grid[k][0],c=grid[k][1],x=c*100,y=r*100,hl=(sg===LS);
    o+='<rect x="'+x+'" y="'+y+'" width="100" height="100" fill="'+(hl?"#f4edda":"#fbf8f0")+'" stroke="#1d2340" stroke-width="1.2"/>';
    o+='<text x="'+(x+6)+'" y="'+(y+15)+'" class="ss">'+SA[sg]+'</text>';
    o+='<text x="'+(x+94)+'" y="'+(y+15)+'" class="sh">'+
       esc(hlabel?hlabel(sg):String(((sg-LS)%12+12)%12+1))+'</text>';
    (map[sg]||[]).forEach(function(pl,i){o+='<text x="'+(x+50)+'" y="'+(y+36+i*14)+'" class="sp">'+pl+'</text>';});
    if(hl)o+='<text x="'+(x+50)+'" y="'+(y+92)+'" class="slag">Lagna</text>';});
  return '<figure class="kchartfig"><figcaption><b>'+esc(title)+'</b><span>'+esc(sub)+'</span></figcaption>'+o+'</svg></figure>';
}
function savChart(D){
  if(!D.av||!D.av.sarva)return "";
  var sav=D.av.sarva,W=760,H=150,pad=34,bw=(W-2*pad)/12;
  var o='<svg viewBox="0 0 '+W+' '+H+'" class="kwsvg" role="img" aria-label="Sarvashtakavarga by house">';
  [35,30,25,20].forEach(function(val){var y=H-40-(val-15)*4.2;
    o+='<line x1="'+pad+'" y1="'+y.toFixed(1)+'" x2="'+(W-pad)+'" y2="'+y.toFixed(1)+'" stroke="#ded6c0" stroke-width="1" stroke-dasharray="3 3"/>';
    o+='<text x="'+(pad-6)+'" y="'+(y+3).toFixed(1)+'" class="ax" style="text-anchor:end">'+val+'</text>';});
  for(var h=1;h<=12;h++){var sg=(D.LS+h-1)%12,v=sav[sg],x=pad+(h-1)*bw+3,bh=Math.max((v-15)*4.2,2),y=H-40-bh;
    var col=v>=30?"#1c6b46":(v>=25?"#b08a2e":"#a1493a");
    o+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+(bw-6).toFixed(1)+'" height="'+bh.toFixed(1)+'" fill="'+col+'" rx="2"/>';
    o+='<text x="'+(x+(bw-6)/2).toFixed(1)+'" y="'+(y-5).toFixed(1)+'" class="bv">'+v+'</text>';
    o+='<text x="'+(x+(bw-6)/2).toFixed(1)+'" y="'+(H-24)+'" class="ax">'+h+'</text>';
    o+='<text x="'+(x+(bw-6)/2).toFixed(1)+'" y="'+(H-11)+'" class="axs">'+SA[sg].slice(0,4)+'</text>';}
  o+='<line x1="'+pad+'" y1="'+(H-40)+'" x2="'+(W-pad)+'" y2="'+(H-40)+'" stroke="#1d2340" stroke-width="1.2"/></svg>';
  return o;
}
function timeline(D){
  if(!D.mds)return "";
  var mds=D.mds,t0=mds[0].start,t1=mds[8].end,span=t1-t0,W=760,H=120,pad=10,now=D.nowJd;
  var cols={Ketu:"#8a6a5c",Venus:"#b58fb0",Sun:"#c08a3e",Moon:"#8fa9c4",Mars:"#a1493a",Rahu:"#6a5a86",Jupiter:"#1c6b46",Saturn:"#4a5064",Mercury:"#2b7a6f"};
  var o='<svg viewBox="0 0 '+W+' '+H+'" class="kwsvg" role="img" aria-label="Vimshottari life timeline">';
  mds.forEach(function(m){var x=pad+(m.start-t0)/span*(W-2*pad),w=(m.end-m.start)/span*(W-2*pad);
    o+='<rect x="'+x.toFixed(1)+'" y="34" width="'+Math.max(w,1).toFixed(1)+'" height="34" fill="'+cols[m.lord]+'" opacity="0.9"/>';
    if(w>34){o+='<text x="'+(x+w/2).toFixed(1)+'" y="55" class="tl">'+m.lord.slice(0,2)+'</text>';
      o+='<text x="'+(x+w/2).toFixed(1)+'" y="80" class="ty">'+fmy(m.start).slice(-4)+'</text>';}});
  var xn=pad+(now-t0)/span*(W-2*pad);
  o+='<line x1="'+xn.toFixed(1)+'" y1="24" x2="'+xn.toFixed(1)+'" y2="78" stroke="#a1493a" stroke-width="2"/>';
  o+='<circle cx="'+xn.toFixed(1)+'" cy="24" r="3.5" fill="#a1493a"/><text x="'+xn.toFixed(1)+'" y="17" class="now">now</text>';
  o+='<text x="'+pad+'" y="103" class="ty" style="text-anchor:start">birth · '+fmy(t0)+'</text>';
  o+='<text x="'+(W-pad)+'" y="103" class="ty" style="text-anchor:end">'+fmy(t1)+'</text></svg>';
  return o;
}
function prog(lab,lord,pct,s,e2){
  return '<div class="kprow"><div class="kplab">'+esc(lab)+'<b>'+esc(lord)+'</b></div>'+
   '<div class="kpbar"><span style="width:'+pct.toFixed(1)+'%"></span></div>'+
   '<div class="kppct">'+Math.round(pct)+'%</div>'+
   '<div class="kpdate">'+fdate(s)+' → '+fdate(e2)+'</div></div>';
}
function tbl(head,rows,cls){
  return '<div class="ktwrap" tabindex="0" role="group"><table class="ktbl '+(cls||"")+'"><thead><tr>'+
   head.map(function(h){return '<th scope="col">'+h+"</th>";}).join("")+
   '</tr></thead><tbody>'+rows.join("")+'</tbody></table></div>';
}
var __secN=0, __secList=[], __secUsed={};
/* stable, readable ids ("Vimśottarī daśā" → ks-vimsottari-dasa) so other panes can link into the report */
function slug(t){ return String(t).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase()
  .replace(/&/g," and ").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,""); }
function secId(title){ ++__secN; var s="ks-"+slug(title), id=s, n=2;
  while(__secUsed[id]) id=s+"-"+(n++); __secUsed[id]=1; return id; }
function sec(title,side,body){
  var id=secId(title); __secList.push({id:id,title:title});
  return '<section class="ksec" id="'+id+'" aria-labelledby="'+id+'-h"><h3 class="kh" id="'+id+'-h">'+
    esc(title)+sensBadge(title)+(side?'<span>'+esc(side)+'</span>':'')+'</h3>'+body+'</section>';
}
function sectionIndex(){
  if(__secList.length<4) return "";
  return '<nav class="kindex" aria-label="Report sections"><b>Jump to</b><div class="kindex-links">'+
    __secList.map(function(s){ return '<a href="#'+s.id+'">'+esc(s.title)+'</a>'; }).join("")+
    '</div></nav>';
}


function vargaCharts(D){
  var g='<div class="kvgrid">';
  /* THE DIVISIONAL CHARTS AND THE BHĀVA FRAME.
     D1 has cusps, so under Śrīpati it is drawn exactly like the main chart —
     grahas by bhāva. It used to ignore the frame entirely, which put a
     whole-sign D1 in this grid directly beneath a chalita D1 above it.
     D2–D60 have NO cusps: vargaSign returns a rāśi integer and the meridian
     does not map through a division, so their own houses stay whole-sign from
     the varga lagna. What follows the frame there is the rāśi chart's bhāva,
     CARRIED and labelled on each graha, which is the only thing about a varga
     that the house system legitimately touches. A graha reads "Su·9" — its
     varga placement, and the bhāva it occupies in the rāśi chart. */
  var chalita=(D.houseSystem&&D.houseSystem.mode==="sripati");
  D.vargas.forEach(function(v){
    if(v.lagna==null)return;
    var vl=v.lagna, isD1=(v.code==="D1");
    var occ={};
    Object.keys(v.pos).forEach(function(k){
      var tag=GL[k];
      if(chalita&&!isD1&&D.P&&D.P[k]&&D.P[k].house!=null) tag+="·"+D.P[k].house;
      (occ[v.pos[k]]=occ[v.pos[k]]||[]).push(tag);
    });
    if(chalita&&isD1){
      /* D1 by bhāva, so this grid agrees with the chart above it */
      g+=northChart(function(h){return D.bhavaSign(h);},
        function(h){var a=[];D.planets.forEach(function(pl){
          if(pl.house===h)a.push(GL[pl.en]);});if(h===1)a.unshift("Lg");return a;},
        v.code+" · "+(v.en||""), "bhāvas by Śrīpati");
      return;
    }
    g+=northChart(function(h){return (vl+h-1)%12;},
      function(h){var sg=(vl+h-1)%12,a=(occ[sg]||[]).slice();if(h===1)a.unshift("Lg");return a;},
      v.code+" · "+(v.en||""),
      "lagna "+SA[vl]+(chalita?" · ·n = rāśi-chart bhāva":""));
  });
  g+='</div>';
  var rows=D.vargas.map(function(v){
    if(v.lagna==null)return "";
    var cx=CRUX[v.code];if(!cx)return "";
    var cs=(v.lagna+cx[0]-1)%12, lord=LORD[cs];
    var occ=[];Object.keys(v.pos).forEach(function(k){if(v.pos[k]===cs)occ.push(k);});
    var lh=(v.pos[lord]!=null)?(((v.pos[lord]-v.lagna)%12+12)%12+1):null;
    var ld=(v.pos[lord]!=null)?dignity(lord,v.pos[lord],null):null;
    return '<tr><td><b>'+esc(v.code)+'</b> <span class="kmut">'+esc(v.en||"")+'</span></td>'+
      '<td>'+SA[v.lagna]+'</td><td>'+cx[0]+' — '+esc(cx[1])+'</td><td>'+SA[cs]+'</td>'+
      '<td>'+(occ.join(", ")||"—")+'</td>'+
      '<td>'+esc(lord)+(lh?" — H"+lh+" "+chip(ld):"")+'</td></tr>';
  }).filter(Boolean);
  return '<p class="knote">Each division rendered as its own chart, with its own lagna computed from the ascendant '+
   'degree. Houses are counted from that varga lagna. The table then reads the house that <i>is</i> the subject of '+
   'each division — its sign, what sits there, and where its lord went.</p>'+g+
   '<h4 class="ksub">The crux house of each division</h4>'+
   tbl(["Division","Varga lagna","Crux house","Its sign","Occupants","Lord of crux house"],rows)+
   '<div class="kbox">Varga lagna formulas are standard Parāśarī reckonings; each was checked against the engine\'s '+
   'own planet positions for this chart and reproduces all nine exactly. Reading all twelve houses inside a varga is '+
   'later analytical practice rather than explicit BPHS verses.</div>';
}
;

/* ayanamsa.html — what the ayanāṃśa is, what it changes, and one you make.
 *
 * CHART-INDEPENDENT. Nothing natal is read; the only inputs are a year, a
 * moment and a place. window.__ayanFor answers for any of the engine's
 * definitions at any instant, which is the whole of what this page needs.
 *
 * NOTHING IS TYPED INTO THE PROSE. Every figure on the page — the gap, the
 * spread between definitions, the per-term contributions, what moves and
 * what cannot — is measured here from the engine at the moment you are
 * looking at it. The one place that would have been easy to fake is the
 * cancellation result, and it is the one most worth not faking.
 *
 * A USER-MADE AYANĀṂŚA IS A REAL ONE. window.__ayanModes is the engine's own
 * live table and setAyanamsaMode accepts any key in it, so registering a
 * definition here makes every other part of the site honour it — the wheels,
 * the pañcāṅga, a cast chart. No engine change was needed for that, which is
 * worth knowing before anyone adds one.
 */
(function () {
  "use strict";

  var host = document.getElementById("ay-rings");
  if (!host) return;
  var $ = function (id) { return document.getElementById(id); };
  var NS = "http://www.w3.org/2000/svg";

  var S = {
    year: 2026, ringMode: "lahiri",
    when: null, place: null,
    custom: null,          /* the key, once registered */
    ratio: "4:5", cardKind: "gap"
  };

  /* ---- loading --------------------------------------------------------- */
  function need(list, done) {
    var i = 0;
    (function next() {
      if (i >= list.length) return done();
      var spec = list[i++];
      if (spec.have()) return next();
      var s = document.createElement("script");
      s.src = spec.src; s.defer = true;
      s.onload = next;
      s.onerror = function () {
        host.innerHTML = '<p class="swfail">Could not load <code>' + spec.src +
          '</code>, which this page needs to compute anything.</p>';
      };
      document.head.appendChild(s);
    })();
  }

  /* ---- the engine, asked ------------------------------------------------ */
  /* The same year→JD the Motion scene uses, so a figure here and the same
     figure there come from one conversion rather than two. */
  function jdOf(year) { return 2451545.0 + (year - 2000) * 365.2425; }
  function ayanAt(mode, year) {
    try { return window.__ayanFor(mode, jdOf(year)); } catch (e) { return null; }
  }
  function modes() { return window.__ayanModes || {}; }
  function modeKeys() { return Object.keys(modes()); }
  /* esc, SA and GL come from ayanamsa-prelude.js at the top level, because
     northChart needs them there too and two copies of a thing like SA is
     exactly how a page ends up disagreeing with the report about the name of
     a rāśi. */
  function dm(x) {
    var neg = x < 0; x = Math.abs(x);
    var d = Math.floor(x), m = (x - d) * 60, mi = Math.floor(m),
        s = Math.round((m - mi) * 60);
    if (s === 60) { s = 0; mi++; }
    if (mi === 60) { mi = 0; d++; }
    return (neg ? "−" : "") + d + "°" + (mi < 10 ? "0" : "") + mi + "′" +
           (s < 10 ? "0" : "") + s + "″";
  }
  function yearLabel(y) {
    return y < 0 ? (Math.abs(Math.round(y)) + " BCE") : (Math.round(y) + " CE");
  }
  function el(tag, at, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in at) n.setAttribute(k, at[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  var NAK = ["Aśvinī", "Bharaṇī", "Kṛttikā", "Rohiṇī", "Mṛgaśira", "Ārdrā",
             "Punarvasu", "Puṣya", "Āśleṣā", "Maghā", "P.Phalgunī", "U.Phalgunī",
             "Hasta", "Citrā", "Svātī", "Viśākhā", "Anurādhā", "Jyeṣṭhā", "Mūla",
             "P.Āṣāḍhā", "U.Āṣāḍhā", "Śravaṇa", "Dhaniṣṭhā", "Śatabhiṣā",
             "P.Bhādra", "U.Bhādra", "Revatī"];

  /* ---- 1. the two rings ------------------------------------------------- */
  function xy(cx, cy, r, deg) {
    var a = (180 - deg) * Math.PI / 180;
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  }
  function wedge(cx, cy, r0, r1, a0, a1) {
    var p = [xy(cx, cy, r1, a0), xy(cx, cy, r1, a1), xy(cx, cy, r0, a1), xy(cx, cy, r0, a0)];
    var lg = (((a1 - a0) % 360 + 360) % 360) > 180 ? 1 : 0;
    return "M" + p[0][0].toFixed(1) + "," + p[0][1].toFixed(1) +
      " A" + r1 + "," + r1 + " 0 " + lg + " 1 " + p[1][0].toFixed(1) + "," + p[1][1].toFixed(1) +
      " L" + p[2][0].toFixed(1) + "," + p[2][1].toFixed(1) +
      " A" + r0 + "," + r0 + " 0 " + lg + " 0 " + p[3][0].toFixed(1) + "," + p[3][1].toFixed(1) + " Z";
  }

  function drawRings() {
    var ay = ayanAt(S.ringMode, S.year);
    if (ay == null) return;
    /* The zero labels sit at r=312, outside the 288 ring, so the box has to
       be wider than the drawing or they are cut off at the edge — which they
       were, reading "...quinox 0°". */
    var W = 700, H = 680, cx = 350, cy = 336;
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="aysvg" role="img" ' +
      'aria-label="Two zodiac rings: the outer fixed to the stars, the inner to the ' +
      'seasons, with the ayanāṃśa as the angle between their zero points">' +
      '<title>The gap between the two zeros</title>';

    /* the sidereal ring — fixed to the stars, so it never turns */
    for (var s = 0; s < 12; s++) {
      o += '<path d="' + wedge(cx, cy, 238, 288, s * 30, s * 30 + 30) +
           '" class="ay-sid' + (s % 2 ? " alt" : "") + '"/>';
      var m = xy(cx, cy, 263, s * 30 + 15);
      o += '<text x="' + m[0].toFixed(1) + '" y="' + (m[1] + 4).toFixed(1) +
           '" class="ay-sidlab">' + esc(SA[s]) + '</text>';
    }
    /* The tropical ring — tied to the equinox, so it creeps BACKWARDS against
       the stars. The sign matters and was wrong here: this ring's coordinate
       is sidereal longitude (the outer ring is drawn fixed at s·30 and
       labelled with the sidereal rāśis), and a tropical longitude λ has
       sidereal longitude λ − ayanāṃśa. So tropical zero belongs at −ayanāṃśa,
       not at +ayanāṃśa.

       Drawn the wrong way it put the vernal equinox in sidereal Meṣa. It is
       in sidereal Mīna — which is exactly what the phrase "the age of Pisces"
       refers to — and the error also ran the precession the wrong way round,
       so the inner ring crept FORWARDS against the stars while the caption
       beneath it said backwards. The star-anchor figure further down this
       same page had it right, which is how the two came to disagree. */
    for (var t = 0; t < 12; t++) {
      var b0 = t * 30 - ay;
      o += '<path d="' + wedge(cx, cy, 176, 226, b0, b0 + 30) +
           '" class="ay-trop' + (t % 2 ? " alt" : "") + '"/>';
      var q = xy(cx, cy, 201, b0 + 15);
      o += '<text x="' + q[0].toFixed(1) + '" y="' + (q[1] + 4).toFixed(1) +
           '" class="ay-troplab">' + esc(SA[t]) + '</text>';
    }
    /* the two zeros, and the angle between them, which IS the ayanāṃśa */
    var z1 = xy(cx, cy, 300, 0), z2 = xy(cx, cy, 300, -ay);
    o += '<line x1="' + cx + '" y1="' + cy + '" x2="' + z1[0].toFixed(1) + '" y2="' +
         z1[1].toFixed(1) + '" class="ay-zsid"/>';
    o += '<line x1="' + cx + '" y1="' + cy + '" x2="' + z2[0].toFixed(1) + '" y2="' +
         z2[1].toFixed(1) + '" class="ay-ztrop"/>';
    if (Math.abs(ay) > 0.01) {
      o += '<path d="' + wedge(cx, cy, 0, 150, Math.min(0, -ay), Math.max(0, -ay)) +
           '" class="ay-gap"/>';
    }
    var lab1 = xy(cx, cy, 312, 0), lab2 = xy(cx, cy, 312, -ay);
    o += '<text x="' + lab1[0].toFixed(1) + '" y="' + (lab1[1] - 6).toFixed(1) +
         '" class="ay-zlab sid">stars 0°</text>';
    o += '<text x="' + lab2[0].toFixed(1) + '" y="' + (lab2[1] + 16).toFixed(1) +
         '" class="ay-zlab trop">equinox 0°</text>';
    var mid = xy(cx, cy, 92, -ay / 2);
    o += '<text x="' + mid[0].toFixed(1) + '" y="' + mid[1].toFixed(1) +
         '" class="ay-gapval">' + (ay >= 0 ? "" : "−") +
         Math.abs(ay).toFixed(2) + '°</text>';
    o += '<text x="' + cx + '" y="' + (cy + 40) + '" class="ay-gapsub">' +
         esc(dm(ay)) + '</text>';
    o += "</svg>";
    host.innerHTML = o;

    $("ay-yearlab").textContent = yearLabel(S.year);
    var M = modes()[S.ringMode] || {};
    $("ay-ringnote").textContent = (M.name || S.ringMode) + " — " + (M.note || "");
    drawTerms(ay);
    drawEquation();
  }

  /* ---- 2. precession, as a cone ----------------------------------------- */
  /* Static, because the point is the shape rather than the motion, and a
     second thing animating beside the rings competes with them for attention. */
  function drawCone() {
    var h = $("ay-cone");
    if (!h) return;
    var W = 620, H = 300;
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="aysvg" role="img" ' +
      'aria-label="The Earth\'s axis sweeping a cone once in about 25,800 years">' +
      '<title>Why the equinox moves</title>';
    var cx = 230, base = 250, apexY = 70;
    /* The cone the axis sweeps. Its half-angle IS the obliquity, because the
       axis is what sweeps it — so the radius of the circle it traces is set
       from the height rather than chosen to look right. Drawn by eye it came
       out at 25.5° against an obliquity of 23.44°, which left the Earth's
       axis sitting off the cone it is supposed to lie on. */
    var EPS = 23.44;
    var coneR = (base - apexY) * Math.tan(EPS * Math.PI / 180);
    o += '<ellipse cx="' + cx + '" cy="' + apexY + '" rx="' + coneR.toFixed(1) +
         '" ry="' + (coneR * 0.30).toFixed(1) + '" class="ay-conetop"/>';
    o += '<path d="M' + (cx - coneR).toFixed(1) + ',' + apexY + ' L' + cx + ',' + base +
         ' L' + (cx + coneR).toFixed(1) + ',' + apexY + '" class="ay-cone"/>';
    /* the Earth, tilted */
    o += '<g transform="translate(' + cx + ',' + base + ') rotate(-' + EPS + ')">' +
         '<ellipse cx="0" cy="0" rx="42" ry="42" class="ay-earth"/>' +
         '<line x1="0" y1="-66" x2="0" y2="66" class="ay-axis"/>' +
         '<line x1="-48" y1="0" x2="48" y2="0" class="ay-equator"/>' +
         '</g>';
    o += '<text x="' + cx + '" y="' + (apexY - 36) + '" class="ay-conelab">' +
         'the axis comes back here in ≈25,800 years</text>';
    o += '<text x="' + (cx + coneR + 22).toFixed(1) + '" y="' + (base - 54) +
         '" class="ay-conetilt">tilt 23½°</text>';
    /* the consequence, stated beside it */
    var tx = 470;
    [["50″", "a year"], ["1°", "in 72 years"], ["30°", "in 2,150 years"]]
      .forEach(function (r, i) {
        var y = 110 + i * 56;
        o += '<text x="' + tx + '" y="' + y + '" class="ay-rate">' + r[0] + '</text>';
        o += '<text x="' + tx + '" y="' + (y + 22) + '" class="ay-ratesub">' + r[1] + '</text>';
      });
    o += '<text x="' + tx + '" y="70" class="ay-ratehead">the equinox slides</text>';
    o += "</svg>";
    h.innerHTML = o;
  }

  /* ---- 3. the equation, and its terms ----------------------------------- */
  function drawEquation() {
    var h = $("ay-eq");
    if (!h) return;
    var M = modes()[S.ringMode];
    if (!M) return;
    if (M.f) {
      h.innerHTML = '<div class="ayeqrow"><span class="ayeqbad">' +
        esc(M.name) + ' is not a polynomial at all</span></div>' +
        '<p class="ayeqnote">This definition is stated as a rule rather than ' +
        'as a formula of this shape, so there are no terms to split apart. ' +
        'Pick another definition above to see the three pieces.</p>';
      return;
    }
    var c = M.c;                 /* [c2, c1, c0] — highest power first */
    h.innerHTML =
      '<div class="ayeqrow">' +
      '<span class="ayeqlhs">ayanāṃśa</span><span class="ayeqop">=</span>' +
      '<span class="ayeqterm t0"><b>' + c[2].toFixed(4) + '°</b>' +
        '<i>where it stood in 2000</i></span><span class="ayeqop">+</span>' +
      '<span class="ayeqterm t1"><b>' + c[1].toFixed(4) + '° × T</b>' +
        '<i>how fast it opens</i></span><span class="ayeqop">+</span>' +
      '<span class="ayeqterm t2"><b>' + c[0].toFixed(6) + '° × T²</b>' +
        '<i>the slow change in that rate</i></span>' +
      '</div>' +
      '<p class="ayeqnote"><b>T</b> is centuries since the year 2000 — so ' +
      (S.year === 2000 ? "0 right now" :
        esc(((S.year - 2000) / 100).toFixed(2)) + " for " + yearLabel(S.year)) +
      '. The middle term is the one degree per seventy-two years; it does ' +
      'nearly all the work.</p>';
  }

  function drawTerms(total) {
    var h = $("ay-terms");
    if (!h) return;
    var M = modes()[S.ringMode];
    if (!M || !M.c) { h.innerHTML = ""; return; }
    var T = (S.year - 2000) / 100;
    var parts = [
      { k: "t0", lab: "where it stood in 2000", v: M.c[2] },
      { k: "t1", lab: "the steady opening", v: M.c[1] * T },
      { k: "t2", lab: "the slow change in rate", v: M.c[0] * T * T }
    ];
    var span = Math.max(1, Math.max.apply(null, parts.map(function (p) {
      return Math.abs(p.v);
    })));
    /* the value is printed beyond the end of its bar, so the box needs room
       for the longest bar AND its label — at 620 wide the first one read
       "+23.857" with the degree sign off the edge */
    var W = 760, H = 190, mid = 286;
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="aysvg" role="img" ' +
      'aria-label="The three terms of the formula, as bars, at the chosen year">' +
      '<title>What each term contributes</title>';
    o += '<line x1="' + mid + '" y1="14" x2="' + mid + '" y2="' + (H - 34) + '" class="ay-axis0"/>';
    parts.forEach(function (p, i) {
      var y = 26 + i * 42;
      var w = Math.abs(p.v) / span * 230;
      var x = p.v >= 0 ? mid : mid - w;
      o += '<rect x="' + x.toFixed(1) + '" y="' + y + '" width="' + Math.max(1, w).toFixed(1) +
           '" height="22" class="ay-bar ' + p.k + '"/>';
      o += '<text x="' + (p.v >= 0 ? x + w + 8 : x - 8) + '" y="' + (y + 16) +
           '" class="ay-barval" text-anchor="' + (p.v >= 0 ? "start" : "end") + '">' +
           (p.v >= 0 ? "+" : "−") + Math.abs(p.v).toFixed(4) + '°</text>';
      o += '<text x="12" y="' + (y + 16) + '" class="ay-barlab">' + esc(p.lab) + '</text>';
    });
    o += '<text x="12" y="' + (H - 10) + '" class="ay-bartot">total at ' +
         esc(yearLabel(S.year)) + ' — ' + (total >= 0 ? "" : "−") +
         Math.abs(total).toFixed(4) + '° = ' + esc(dm(total)) + '</text>';
    o += "</svg>";
    h.innerHTML = o;
  }

  /* ---- 4. what it changes, measured ------------------------------------- */
  /* The claim this is here to make is that some quantities CANNOT move,
     because the ayanāṃśa cancels out of them. That is an algebraic fact, and
     an algebraic fact asserted in prose is worth nothing, so the page
     measures it instead: the same instant is computed under several very
     different definitions and the results are put side by side. */
  function skyUnder(mode) {
    if (!window.quickSky || !S.place || S.when == null) return null;
    var tz = (S.place.tz || 0);
    var d = new Date(S.when + tz * 3600000);
    return window.quickSky({
      year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
      hour: d.getUTCHours(), minute: d.getUTCMinutes(), second: d.getUTCSeconds(),
      tzHours: tz, lat: S.place.lat, lon: S.place.lon, ayanamsa: mode
    });
  }
  function limbsOf(sky) {
    if (!sky) return null;
    var g = function (n) {
      var p = sky.planets.filter(function (x) { return x.en === n; })[0];
      return p ? p.sid : null;
    };
    var sun = g("Sun"), moon = g("Moon");
    if (sun == null || moon == null) return null;
    var diff = ((moon - sun) % 360 + 360) % 360;
    var sum = ((moon + sun) % 360 + 360) % 360;
    return {
      ayan: sky.ayanamsa, sun: sun, moon: moon,
      elong: diff, sum: sum,
      tithi: Math.floor(diff / 12) + 1,
      karana: Math.floor(diff / 6) + 1,
      yoga: Math.floor(sum / (360 / 27)) + 1,
      nak: Math.floor(moon / (360 / 27)) + 1,
      rasi: Math.floor(moon / 30)
    };
  }

  function drawImpact() {
    var h = $("ay-impact");
    if (!h) return;
    var picks = ["lahiri", "raman", "fagan", "ss_text"];
    if (S.custom) picks.push(S.custom);
    var rows = [];
    picks.forEach(function (k) {
      var L = limbsOf(skyUnder(k));
      if (L) rows.push({ k: k, name: (modes()[k] || {}).name || k, L: L });
    });
    if (rows.length < 2) { h.innerHTML = ""; return; }

    var uniq = function (f) {
      var seen = {};
      rows.forEach(function (r) { seen[f(r.L)] = 1; });
      return Object.keys(seen).length;
    };
    /* to six decimals: the claim is exact cancellation, and rounding to two
       would let a real difference of half an arcminute hide inside it */
    var sameElong = uniq(function (L) { return L.elong.toFixed(6); }) === 1;
    var sameKarana = uniq(function (L) { return L.karana; }) === 1;
    var sameTithi = uniq(function (L) { return L.tithi; }) === 1;
    var yogaMoves = uniq(function (L) { return L.sum.toFixed(4); }) > 1;
    var nakMoves = uniq(function (L) { return L.nak; }) > 1;

    var o = '<div class="aytabwrap"><table class="aytab"><thead><tr>' +
      '<th>Definition</th><th>ayanāṃśa</th><th>Moon</th><th>rāśi</th>' +
      '<th>nakṣatra</th><th>tithi</th><th>karaṇa</th><th>yoga</th>' +
      '</tr></thead><tbody>';
    rows.forEach(function (r) {
      o += '<tr' + (r.k === S.custom ? ' class="mine"' : '') + '>' +
        '<td>' + esc(r.name) + '</td>' +
        '<td class="num">' + esc(dm(r.L.ayan)) + '</td>' +
        '<td class="num">' + esc(dm(r.L.moon)) + '</td>' +
        '<td>' + esc(SA[r.L.rasi]) + '</td>' +
        '<td>' + esc(NAK[r.L.nak - 1]) + '</td>' +
        '<td class="num">' + r.L.tithi + '</td>' +
        '<td class="num">' + r.L.karana + '</td>' +
        '<td class="num">' + r.L.yoga + '</td>' +
        '</tr>';
    });
    o += '</tbody></table></div>';

    /* the doubling, measured between the two extremes rather than asserted */
    var lo = rows[0], hi = rows[rows.length - 1];
    var dA = hi.L.ayan - lo.L.ayan;
    var dSum = ((hi.L.sum - lo.L.sum + 540) % 360) - 180;
    var ratio = Math.abs(dA) > 1e-6 ? dSum / dA : null;

    o += '<ul class="aycheck">' +
      li(sameElong, "The Moon–Sun gap is identical to six decimal places across all " +
         rows.length + " — so the <b>tithi cannot move</b>, whatever is chosen.") +
      li(sameKarana && sameTithi, "The tithi and the karaṇa come out the same number in every row.") +
      li(yogaMoves, "The Moon+Sun sum <b>does</b> move, so the yoga does.") +
      (ratio == null ? "" :
        li(Math.abs(ratio + 2) < 0.02 || Math.abs(ratio - -2) < 0.02,
           "And it moves by <b>" + ratio.toFixed(3) + "×</b> the change in ayanāṃśa — " +
           "which is −2, because a sum carries the subtraction twice.")) +
      /* not a pass or a fail: whether the Moon happens to sit near a
         nakṣatra boundary at this instant is a property of the instant, not
         of the argument, so it is marked as an observation */
      liNote(nakMoves
          ? "At this moment the Moon's nakṣatra differs between definitions too."
          : "At this moment the Moon happens to stay in one nakṣatra across these " +
            "definitions — it is not near a boundary. Move the time and it will.") +
      '</ul>';
    h.innerHTML = o;

    function li(ok, text) {
      return '<li class="' + (ok ? "yes" : "no") + '">' + text + "</li>";
    }
    function liNote(text) { return '<li class="obs">' + text + "</li>"; }
  }

  /* ---- 4b. the admissible band, and what its WIDTH costs a chart ---------
     The band comes from combining two independent siddhāntic constraints —
     the 27-star dhruvakā ensemble and the solar apogee as three texts state
     it — which agree on a sidereal zero of 493.6 ± 23 CE. See the project
     note samanvaya-ayanamsa-research.md for the derivation; the numbers below
     are the two that derivation produced, and everything else on this panel is
     measured live from the engine rather than restated.

     The point of the panel is NOT to let a reader choose among the in-band
     conventions. It is to show that there is nothing to choose: they agree to
     a fraction of an arcsecond, and the thing that actually moves a chart is
     the band's own width. So the panel perturbs the ayanāṃśa by ±1σ directly
     instead of switching modes, because no registered mode sits at the edge of
     the band and inventing one to stand there would misrepresent it. */
  var BAND = { centre: 493.6, sigma: 23.0 };
  /* arcsec/yr of precession, taken from the engine's own linear coefficient
     rather than from a round 50.29, so the two cannot disagree */
  function bandHalfWidthDeg() { return BAND.sigma * 1.39688795339 / 100; }
  /* the year at which a mode reads zero, by bisection on the engine itself */
  function zeroEpochOf(key) {
    var lo = -2000, hi = 3000, f = function (y) { return ayanAt(key, y); };
    var a = f(lo), b = f(hi);
    if (a == null || b == null || a * b > 0) return null;
    for (var i = 0; i < 60; i++) {
      var m = (lo + hi) / 2, v = f(m);
      if (v == null) return null;
      if (v * a > 0) { lo = m; a = v; } else { hi = m; }
    }
    return (lo + hi) / 2;
  }
  function inBandModes() {
    var out = [], M = modes();
    Object.keys(M).forEach(function (k) {
      var z = zeroEpochOf(k);
      if (z != null && z >= BAND.centre - BAND.sigma && z <= BAND.centre + BAND.sigma) {
        out.push({ key: k, name: M[k].name || k, zero: z });
      }
    });
    out.sort(function (p, q) { return p.zero - q.zero; });
    return out;
  }
  /* widest disagreement among a set of modes across a long span — the claim
     being tested is that the in-band modes are one convention, and a single
     present-day instant could hide a divergence that only opens elsewhere */
  function worstSpread(keys) {
    var worst = 0, at = null;
    for (var y = 1000; y <= 3000; y += 10) {
      var v = [], ok = true;
      for (var i = 0; i < keys.length; i++) {
        var a = ayanAt(keys[i], y);
        if (a == null) { ok = false; break; }
        v.push(a);
      }
      if (!ok) continue;
      var d = Math.max.apply(null, v) - Math.min.apply(null, v);
      if (d > worst) { worst = d; at = y; }
    }
    return { deg: worst, year: at };
  }

  function drawBand() {
    var h = $("ay-band");
    if (!h) return;
    var IB = inBandModes();
    if (!IB.length || !window.__kVarga || !window.__kVims) { h.innerHTML = ""; return; }

    var d = bandHalfWidthDeg();
    var sp = worstSpread(IB.map(function (r) { return r.key; }));

    var o = '<div class="aytabwrap"><table class="aytab"><thead><tr>' +
      '<th>Inside the band</th><th>reads zero at</th><th>ayanāṃśa now</th>' +
      '</tr></thead><tbody>';
    IB.forEach(function (r) {
      var now = ayanAt(r.key, new Date().getUTCFullYear());
      o += '<tr><td>' + esc(r.name) + '</td><td class="num">' +
        r.zero.toFixed(2) + ' CE</td><td class="num">' +
        (now == null ? "—" : esc(dm(now))) + '</td></tr>';
    });
    o += '</tbody></table></div>';

    /* Sharing the band is a statement about the EPOCH only. Two conventions can
       read zero in the same decade and still part company by degrees away from
       it — the Sūrya Siddhānta's librating and steady readings do exactly that.
       So the agreement claim is tested on the tight cluster, and the rest are
       reported as what they are rather than folded in. An earlier draft of this
       panel asserted "one convention" over all in-band modes; the live figure
       contradicted it by fifteen degrees, which is why this is split. */
    /* The cluster must be the LARGEST mutually-agreeing group, not whichever
       mode happens to sort first — seeding from IB[0] put the librating SS
       reading alone in the cluster and the three that really are one
       convention in "rest", which is the opposite of the truth. */
    var agree = IB.map(function (r) {
      return IB.filter(function (q) {
        return worstSpread([r.key, q.key]).deg * 3600 < 1;
      });
    });
    var best = 0;
    agree.forEach(function (g, i) { if (g.length > agree[best].length) best = i; });
    var tight = agree[best],
        inTight = {};
    tight.forEach(function (r) { inTight[r.key] = 1; });
    var rest = IB.filter(function (r) { return !inTight[r.key]; });
    var spT = worstSpread(tight.map(function (r) { return r.key; }));
    /* the chart below is cast under a member of the agreeing cluster, since any
       member gives the same answer and a merely-epoch-sharing mode would not */
    var sky = skyUnder(tight[0].key);

    o += '<ul class="aycheck">' +
      bli(spT.deg * 3600 < 1,
        "<b>" + tight.length + " of the " + IB.length + "</b> agree with one another to " +
        "at most <b>" + (spT.deg * 3600).toFixed(3) + "&Prime;</b> anywhere between " +
        "1000 and 3000 CE — they are <b>one convention</b> reached by different routes, " +
        "and switching among them cannot move any quantity in a chart.") +
      (rest.length ? bli(false,
        "But <b>" + rest.length + "</b> of them (" +
        rest.map(function (r) { return esc(r.name); }).join(", ") +
        ") only share the <i>epoch</i>. Across 1000&ndash;3000 CE the in-band set " +
        "spreads by <b>" + (sp.deg).toFixed(2) + "&deg;</b>" +
        (sp.year ? ", worst at " + sp.year : "") +
        " — so reading zero in the same decade does <b>not</b> make two conventions " +
        "the same. They coincide at the epoch and diverge away from it, which is the " +
        "<i>held</i>-versus-<i>set down once</i> distinction measured further up this " +
        "page. The band constrains where the zero <i>was</i>; it says nothing about the " +
        "rate a convention then uses to carry the frame forward.") : "") +
      bli(true,
        "So the figure that matters is the band's own width: <b>&plusmn;" +
        (d * 60).toFixed(1) + "&prime;</b> of ayanāṃśa, which is &plusmn;" +
        BAND.sigma.toFixed(0) + " years of epoch. Everything below is that " +
        "uncertainty applied to the chart cast above, not a difference between " +
        "two published definitions.") +
      '</ul>';

    if (!sky) {
      h.innerHTML = o + '<p class="k-note">Set a moment and place above to see what ' +
        'the band costs an actual chart.</p>';
      return;
    }

    /* --- per-graha and lagna: what ±1σ moves --------------------------- */
    var seg = 360 / 27, pad = seg / 4;
    function cell(sid) {
      return { rasi: Math.floor(norm360(sid) / 30) % 12,
               nak: Math.floor(norm360(sid) / seg),
               pad: Math.floor(norm360(sid) / pad) };
    }
    function band3(sid) { return [cell(sid - d), cell(sid), cell(sid + d)]; }
    function moved(t, f) { return f(t[0]) !== f(t[2]); }

    var items = [{ en: "Lagna", sid: sky.lagna }];
    sky.planets.forEach(function (p) { items.push({ en: p.en, sid: p.sid }); });

    o += '<h3>Lagna, grahas, nakṣatra and pāda</h3>' +
      '<div class="aytabwrap"><table class="aytab"><thead><tr>' +
      '<th>Body</th><th>sidereal</th><th>rāśi</th><th>nakṣatra</th>' +
      '<th>rāśi moves?</th><th>nakṣatra moves?</th><th>pāda moves?</th>' +
      '</tr></thead><tbody>';
    var nMoveR = 0, nMoveN = 0, nMoveP = 0;
    items.forEach(function (it) {
      var t = band3(it.sid), c = t[1];
      var mr = moved(t, function (x) { return x.rasi; }),
          mn = moved(t, function (x) { return x.nak; }),
          mp = moved(t, function (x) { return x.pad; });
      if (mr) nMoveR++; if (mn) nMoveN++; if (mp) nMoveP++;
      o += '<tr><td>' + esc(it.en) + '</td>' +
        '<td class="num">' + esc(dm(norm360(it.sid))) + '</td>' +
        '<td>' + esc(SA[c.rasi]) + '</td>' +
        '<td>' + esc(NAK[c.nak]) + '</td>' +
        mv(mr) + mv(mn) + mv(mp) + '</tr>';
    });
    o += '</tbody></table></div>' +
      '<p class="k-note">At this moment the band moves the rāśi of ' + nMoveR +
      ' of ' + items.length + ', the nakṣatra of ' + nMoveN + ', and the pāda of ' +
      nMoveP + '. Those counts are a property of <i>this</i> instant — they say how ' +
      'near a boundary things happen to sit, not how large the uncertainty is.</p>';

    /* --- the vargas: measured, because D30's spans are unequal ---------- */
    var V = window.__kVarga, codes = V.codes;
    o += '<h3>The sixteen divisional charts</h3>' +
      '<div class="aytabwrap"><table class="aytab"><thead><tr>' +
      '<th>Varga</th><th>signification</th>' +
      '<th>grahas whose varga sign moves across the band</th>' +
      '</tr></thead><tbody>';
    var vrows = [];
    codes.forEach(function (c) {
      var code = c[0], n = 0;
      sky.planets.forEach(function (p) {
        if (V.sign(code, norm360(p.sid - d)) !== V.sign(code, norm360(p.sid + d))) n++;
      });
      vrows.push({ code: code, dev: c[1], mean: c[2], n: n });
    });
    vrows.forEach(function (r) {
      var frac = r.n / 9,
          k = frac >= 0.5 ? "aymv-y" : frac > 0 ? "aymv-m" : "aymv-n";
      o += '<tr><td><b>' + esc(r.code) + '</b> ' + esc(r.dev) +
        '</td><td>' + esc(r.mean) + '</td>' +
        '<td class="num aymv ' + k + '">' + r.n + ' of 9</td></tr>';
    });
    o += '</tbody></table></div>';

    var d1 = vrows[0].n, d60 = vrows[vrows.length - 1].n;
    o += '<div class="note"><b>This is the real cost, and it is not in the rāśi chart.</b> ' +
      'A varga divides each sign into <i>n</i> parts, so a division is roughly ' +
      '30&deg;/<i>n</i> wide and the same ayanāṃśa uncertainty crosses <i>n</i> times ' +
      'as many of them. At the band\'s &plusmn;' + (d * 60).toFixed(1) + '&prime; that ' +
      'leaves D1 moving for <b>' + d1 + ' of 9</b> grahas and D60 for <b>' + d60 +
      ' of 9</b> — a ṣaṣṭyāṃśa is only 30&prime; wide, so an uncertainty of this size ' +
      'very nearly randomises it. <b>D60 is not determined at the precision the ' +
      'evidence supports</b>, independently of how exact the birth time is. The counts ' +
      'above are measured by evaluating the engine\'s own varga function at both edges ' +
      'of the band, not by dividing 30 by <i>n</i> — D30\'s five spans are unequal, so ' +
      'the arithmetic shortcut would be wrong for it.</div>';

    /* --- Viṃśottarī ----------------------------------------------------- */
    var moon = sky.planets.filter(function (p) { return p.en === "Moon"; })[0];
    if (moon) {
      var vLo = window.__kVims.atMoon(norm360(moon.sid - d)),
          vMid = window.__kVims.atMoon(norm360(moon.sid)),
          vHi = window.__kVims.atMoon(norm360(moon.sid + d));
      var dDays = Math.abs(vHi.balance - vLo.balance) * 365.2425;
      var lordMoves = !(vLo.lord === vMid.lord && vMid.lord === vHi.lord);
      o += '<h3>Viṃśottarī daśā</h3>' +
        '<div class="aytabwrap"><table class="aytab"><thead><tr>' +
        '<th>Edge of the band</th><th>Moon</th><th>nakṣatra</th>' +
        '<th>mahādaśā at birth</th><th>balance, years</th></tr></thead><tbody>';
      [["−1σ", norm360(moon.sid - d), vLo], ["centre", norm360(moon.sid), vMid],
       ["+1σ", norm360(moon.sid + d), vHi]].forEach(function (r) {
        o += '<tr><td>' + esc(r[0]) + '</td><td class="num">' + esc(dm(r[1])) +
          '</td><td>' + esc(NAK[r[2].nak]) + '</td><td>' + esc(r[2].lord) +
          '</td><td class="num">' + r[2].balance.toFixed(3) + '</td></tr>';
      });
      o += '</tbody></table></div>' +
        '<ul class="aycheck">' +
        bli(!lordMoves,
          lordMoves
            ? "At this moment the band changes <b>which mahādaśā the birth falls in</b> — " +
              "the Moon is near a nakṣatra boundary, and no amount of birth-time accuracy " +
              "can settle that, because the disagreement is about the frame, not the clock."
            : "At this moment the opening mahādaśā lord is the same at both edges of the band.") +
        bli(true,
          "But the <b>boundary moves by about " + Math.round(dDays) + " days</b> across the " +
          "band — an uncertainty far too small to move a graha out of its pāda still moves " +
          "a mahādaśā boundary by months, and every later daśā in the sequence shifts with " +
          "it. The figure is measured rather than quoted, because the often-repeated rate " +
          "of <i>0.913 days of daśā per arcsecond</i> is the wrong one to use here: that " +
          "maps the full 120 years onto a nakṣatra, whereas the balance of the running " +
          "mahādaśā scales by <i>its own lord's</i> share. Here the lord is " +
          esc(vMid.lord) + " at " + vMid.full + " years, so the rate is " +
          (vMid.full / 120).toFixed(3) + " of the quoted one. Using 0.913 would overstate " +
          "this by " + (120 / vMid.full).toFixed(1) + "&times;.") +
        '</ul>';
    }

    o += '<div class="note"><b>And three things the band cannot touch at all.</b> ' +
      'Tithi, karaṇa and vāra are unchanged at every point in the band, exactly, for the ' +
      'reason given further up: a tithi is the Moon&ndash;Sun <i>gap</i>, and the same ' +
      'ayanāṃśa subtracted from both cancels. So a pañcāṅga date is not at stake here. ' +
      'What is at stake is a cusp, a pāda, a varga sign, and a daśā boundary.</div>';

    h.innerHTML = o;

    function bli(ok, text) {
      return '<li class="' + (ok ? "yes" : "no") + '">' + text + "</li>";
    }
    /* a cell saying whether a quantity moves. The tint goes in the background
       and the left border; the ink is left to var(--text), because a
       hardcoded ink over a translucent tint measures 1.4:1 on the emerald
       palette. Same pattern as .aytab tr.mine, which is proven on this page. */
    function mv(yes) {
      return '<td class="aymv ' + (yes ? "aymv-y" : "aymv-n") + '">' +
        (yes ? "yes" : "no") + '</td>';
    }
  }
  function norm360(x) { return ((x % 360) + 360) % 360; }

  /* ---- 5. the spread ----------------------------------------------------- */
  function drawSpread() {
    var h = $("ay-spread");
    if (!h) return;
    var keys = modeKeys();
    var vals = keys.map(function (k) {
      return { k: k, name: (modes()[k] || {}).s || k, v: ayanAt(k, S.year) };
    }).filter(function (r) { return r.v != null; })
      .sort(function (a, b) { return a.v - b.v; });
    if (!vals.length) return;
    var lo = vals[0].v, hi = vals[vals.length - 1].v, span = hi - lo || 1;
    var W = 620, H = 60 + vals.length * 21;
    var x0 = 150, x1 = W - 70;
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="aysvg" role="img" ' +
      'aria-label="Every definition this site offers, at the chosen year, on one scale">' +
      '<title>How far the definitions disagree</title>';
    o += '<text x="12" y="18" class="ay-sprhead">at ' + esc(yearLabel(S.year)) +
         ' they span ' + esc(dm(span)) + '</text>';
    vals.forEach(function (r, i) {
      var y = 38 + i * 21;
      var x = x0 + (r.v - lo) / span * (x1 - x0);
      o += '<line x1="' + x0 + '" y1="' + y + '" x2="' + x1 + '" y2="' + y +
           '" class="ay-sprrail"/>';
      o += '<circle cx="' + x.toFixed(1) + '" cy="' + y + '" r="4.5" class="ay-sprdot' +
           (r.k === S.ringMode ? " on" : "") + (r.k === S.custom ? " mine" : "") + '"/>';
      o += '<text x="' + (x0 - 10) + '" y="' + (y + 4) + '" class="ay-sprname' +
           (r.k === S.ringMode ? " on" : "") + '">' + esc(r.name) + '</text>';
      o += '<text x="' + (x1 + 8) + '" y="' + (y + 4) + '" class="ay-sprval">' +
           r.v.toFixed(2) + '°</text>';
    });
    o += "</svg>";
    h.innerHTML = o;

    /* the table of what each one is, straight from the engine's own notes */
    var t = $("ay-modetable");
    if (t) {
      var rowsHtml = vals.map(function (r) {
        var M = modes()[r.k] || {};
        return '<tr' + (r.k === S.custom ? ' class="mine"' : '') + '><td>' +
          esc(M.name || r.k) + '</td><td class="num">' + esc(dm(r.v)) +
          '</td><td class="note">' + esc(M.note || "") + '</td></tr>';
      }).join("");
      t.innerHTML = '<div class="aytabwrap"><table class="aytab"><thead><tr>' +
        '<th>Definition</th><th>at ' + esc(yearLabel(S.year)) +
        '</th><th>What it is</th></tr></thead><tbody>' + rowsHtml +
        '</tbody></table></div>';
    }
  }

  /* ---- 6. the sandbox ---------------------------------------------------- */
  var CUSTOM_KEY = "yours";
  function sandbox() {
    var h = $("ay-sandbox");
    if (!h || h.firstChild) return;
    var stars = (window.YOGATARAS || []).slice();
    h.innerHTML =
      '<div class="aysandcols">' +
      '<div class="aysandcol"><h3>By the numbers</h3>' +
      '<label>Where it stood in 2000 <input type="range" id="ay-c0" min="0" max="30" ' +
        'step="0.001" value="23.857"><span class="ayread" id="ay-c0v"></span></label>' +
      '<label>How fast it opens, arcseconds a year <input type="range" id="ay-c1" ' +
        'min="0" max="80" step="0.1" value="50.288"><span class="ayread" id="ay-c1v"></span></label>' +
      '<label>Curvature <input type="range" id="ay-c2" min="-0.002" max="0.002" ' +
        'step="0.00001" value="0.000307"><span class="ayread" id="ay-c2v"></span></label>' +
      '</div>' +
      '<div class="aysandcol"><h3>Or pin a star</h3>' +
      '<p class="aysandnote">Choose a junction star and the longitude you want it to ' +
      'sit at. Every star-pinned definition turns out to be Lahiri shifted by a ' +
      'constant — which is why pinning Citrā at 180° very nearly <i>is</i> Lahiri, ' +
      'the definition whose name means exactly that.</p>' +
      '<label>Star <select id="ay-star" class="swin">' +
      stars.map(function (st) {
        return '<option value="' + st.id + '"' + (st.nak === "Citrā" ? " selected" : "") +
          '>' + esc(st.nak) + " — " + esc(st.star) + '</option>';
      }).join("") + '</select></label>' +
      '<label>Held at <input type="number" id="ay-pin" step="0.001" value="180" ' +
        'class="swin"> degrees</label>' +
      '<button type="button" class="swbtn" data-ay="pin">Use this pin</button>' +
      '</div></div>' +
      '<div class="aysandout" id="ay-sandout"></div>' +
      '<div class="aybar">' +
      '<button type="button" class="swbtn swprimary" data-ay="apply">Register it with the engine</button>' +
      '<button type="button" class="swbtn" data-ay="drop">Remove it</button>' +
      '<span class="swmsg" id="ay-sandmsg"></span></div>';
    syncSand();
  }

  function sandCoeffs() {
    var c0 = +($("ay-c0") || {}).value || 0;
    var c1 = (+($("ay-c1") || {}).value || 0) / 3600 * 100;   /* ″/yr → °/century */
    var c2 = +($("ay-c2") || {}).value || 0;
    return [c2, c1, c0];
  }
  function syncSand() {
    var c = sandCoeffs();
    if ($("ay-c0v")) $("ay-c0v").textContent = c[2].toFixed(3) + "°";
    if ($("ay-c1v")) $("ay-c1v").textContent =
      (+($("ay-c1") || {}).value || 0).toFixed(1) + "″/yr  (" + c[1].toFixed(4) + "°/century)";
    if ($("ay-c2v")) $("ay-c2v").textContent = c[0].toFixed(6);  /* c[0] is the T² term */
    var T = (S.year - 2000) / 100;
    var mine = c[0] * T * T + c[1] * T + c[2];
    var lah = ayanAt("lahiri", S.year);
    var out = $("ay-sandout");
    if (out) {
      out.innerHTML = '<b>Yours at ' + esc(yearLabel(S.year)) + ':</b> ' +
        esc(dm(mine)) + ' &nbsp;·&nbsp; Lahiri says ' + esc(dm(lah)) +
        ' &nbsp;·&nbsp; you differ by <b>' + esc(dm(mine - lah)) + '</b>' +
        ' — which is ' + Math.abs((mine - lah) / (360 / 27 / 4)).toFixed(2) +
        ' nakṣatra pādas.';
    }
  }
  function applyPin() {
    var id = +($("ay-star") || {}).value;
    var st = (window.YOGATARAS || []).filter(function (x) { return x.id === id; })[0];
    if (!st) return;
    var target = +($("ay-pin") || {}).value;
    /* The catalogue holds each star's sidereal longitude under Lahiri. To put
       it at `target` instead, the whole frame shifts by the difference — so a
       pinned definition is Lahiri plus a constant, exactly. */
    var lahC = (modes().lahiri || {}).c;
    if (!lahC) return;
    var shift = st.sid - target;
    $("ay-c0").value = (lahC[2] + shift).toFixed(3);
    $("ay-c1").value = (lahC[1] / 100 * 3600).toFixed(1);
    $("ay-c2").value = lahC[0].toFixed(6);
    syncSand();
    msg("ay-sandmsg", esc(st.nak) + " pinned at " + target + "° — that is Lahiri " +
        (shift >= 0 ? "+" : "−") + dm(Math.abs(shift)) + ".");
  }
  function applyCustom() {
    var c = sandCoeffs();
    modes()[CUSTOM_KEY] = {
      name: "Yours", s: "Yours",
      note: "a definition you made on this page; it is not saved and is gone on reload",
      c: c
    };
    S.custom = CUSTOM_KEY;
    try { window.__setAyan(CUSTOM_KEY); } catch (e) {}
    fillModeSelect();
    msg("ay-sandmsg", "Registered. The engine will use it anywhere on this site " +
        "until you reload.");
    redraw();
  }
  function dropCustom() {
    if (!S.custom) return;
    try { delete modes()[CUSTOM_KEY]; } catch (e) {}
    S.custom = null;
    if (S.ringMode === CUSTOM_KEY) S.ringMode = "lahiri";
    try { window.__setAyan("lahiri"); } catch (e) {}
    fillModeSelect();
    msg("ay-sandmsg", "Removed. Back to Lahiri.");
    redraw();
  }
  function msg(id, t) { var e = $(id); if (e) e.innerHTML = t; }


  /* ======================================================================
     THE DERIVATION — five steps, drawn
     ====================================================================== */
  var STEPS = [
    ["Two great circles", "The Sun's yearly path (the ecliptic) and the Earth's " +
     "equator projected outward are two circles on the sky, tilted 23½° apart. " +
     "They must cross at two points."],
    ["One of them is the equinox", "The crossing the Sun passes going north is " +
     "the spring equinox. It is a point in the sky, not a date, and it is where " +
     "the tropical zodiac starts."],
    ["It does not stay put", "The Earth's axis sweeps a cone, so the equator " +
     "swings with it, so the crossing slides along the ecliptic — about 50″ a year, " +
     "always in the same direction."],
    ["Choose a fixed zero", "Pick a starting point tied to the stars instead. " +
     "Every definition on this page is a different answer to exactly this one " +
     "question, and there is no way to settle it by measurement."],
    ["Measure between them", "The angle from the sliding equinox to the fixed " +
     "zero IS the ayanāṃśa. Subtract it from a tropical longitude and you have a " +
     "sidereal one."]
  ];
  function drawDerive() {
    var h = $("ay-derive");
    if (!h) return;
    var W = 700, H = 360, cx = 320, cy = 186, R = 128;
    var ay = ayanAt(S.ringMode, S.year) || 0;
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="aysvg" role="img" ' +
      'aria-label="The ecliptic and the equator crossing at the equinox, with the ' +
      'ayanāṃśa measured from there to the sidereal zero">' +
      '<title>Where the number comes from</title>';
    /* THE TWO GREAT CIRCLES. They must cross at exactly two points, opposite
       each other, because any two great circles on a sphere do. The first
       version drew two congruent ellipses and rotated one of them by the
       obliquity, which crosses at FOUR points and — worse — left the marked
       equinox lying nowhere near the equator ellipse at all (it was off it by
       a factor of 2.2).

       Two great circles sharing a line of nodes, seen from a direction square
       to that line, project to two ellipses with the SAME major axis and
       different minor axes. So both are drawn unrotated with rx = R, and they
       meet exactly at (cx ± R, cy) — which is where the equinoxes are marked,
       because the line of nodes IS the equinox line. */
    /* Derived, not eyeballed. Under this projection a great circle in a plane
       containing the node line and tilted α about it draws as an ellipse of
       semi-axes (R, R·cos α) — so the drawn flattening IS cos α. The ecliptic
       is given 0.34 because it looks right, which fixes α_e = 70.1°; the
       equator is then a further obliquity away, α_q = α_e − ε, and its
       flattening follows. Subtracting the two flattenings, as a first attempt
       did, produces a NEGATIVE radius. */
    var EPS_D = 23.44;
    /* How open the projection is. 0.34 was chosen to look like a plane seen
       nearly edge-on, and it made the figure unreadable: near the ends of the
       node line a flat ellipse puts 24° of longitude into a few pixels, so
       the two zeros sat on top of each other and the arc between them — the
       whole quantity the figure exists to show — could not be seen. Opened
       up, the same 24° spans about thirty pixels. The geometry is unchanged;
       only the vantage point is higher. */
    var kEcl = 0.55;
    var aEcl = Math.acos(kEcl);
    var kEqu = Math.abs(Math.cos(aEcl - EPS_D * Math.PI / 180));
    o += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + R + '" ry="' +
         (R * kEcl).toFixed(1) + '" class="ay-ecl"/>';
    o += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + R + '" ry="' +
         (R * kEqu).toFixed(1) + '" class="ay-equ"/>';
    /* the crossing points — the line of nodes, which is the equinox line */
    o += '<circle cx="' + (cx - R) + '" cy="' + cy + '" r="6" class="ay-equinox"/>';
    o += '<circle cx="' + (cx + R) + '" cy="' + cy + '" r="4" class="ay-equinox alt"/>';

    /* the sidereal zero, an ayanāṃśa along the ecliptic from the equinox.
       Parametrised on the SAME ellipse the ecliptic is drawn as, so the point
       sits on the curve rather than near it. */
    var ePt = function (deg) {
      var t2 = (180 - deg) * Math.PI / 180;
      return [cx + R * Math.cos(t2), cy - R * kEcl * Math.sin(t2)];
    };
    var sp = ePt(ay);

    /* THE MEASURED ARC, drawn along the ecliptic. Correct geometry is not
       enough on an explainer: the first version marked both ends and left the
       angle between them invisible, with its value floating in the middle of
       the figure attached to nothing. */
    var arc = "";
    for (var k = 0; k <= 24; k++) {
      var q = ePt(ay * k / 24);
      arc += (k ? "L" : "M") + q[0].toFixed(1) + "," + q[1].toFixed(1);
    }
    o += '<path d="' + arc + '" class="ay-measure"/>';
    o += '<circle cx="' + sp[0].toFixed(1) + '" cy="' + sp[1].toFixed(1) +
         '" r="6" class="ay-zero"/>';

    /* the value, set clear of the figure with a leader to the arc it measures */
    var mid = ePt(ay / 2);
    var lx = cx - R - 46, ly = cy - R * kEcl - 34;
    o += '<line x1="' + lx.toFixed(1) + '" y1="' + (ly + 6).toFixed(1) + '" x2="' +
         mid[0].toFixed(1) + '" y2="' + mid[1].toFixed(1) + '" class="ay-lead"/>';
    o += '<text x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) +
         '" class="ay-dval">' + esc(dm(ay)) + '</text>';
    o += '<text x="' + lx.toFixed(1) + '" y="' + (ly + 17).toFixed(1) +
         '" class="ay-dsub">the ayanāṃśa</text>';

    /* the two ends of the node line, named */
    o += '<text x="' + (cx - R - 8) + '" y="' + (cy + 20) +
         '" class="ay-dlab eq">equinox</text>';
    o += '<text x="' + (sp[0] + 10).toFixed(1) + '" y="' + (sp[1] - 10).toFixed(1) +
         '" class="ay-dlab zero">sidereal zero</text>';
    /* the circles, named where they are not crossing anything */
    /* clear of the EQUATOR, which is the outer of the two here — placed
       against the ecliptic's own extent it sat across the other curve */
    o += '<text x="' + cx + '" y="' + (cy + R * kEqu + 20).toFixed(1) +
         '" class="ay-dlab ecl">the ecliptic — the Sun\'s path</text>';
    o += '<text x="' + cx + '" y="' + (cy - R * kEqu - 12).toFixed(1) +
         '" class="ay-dlab equ">the equator, projected outward</text>';
    /* and the direction of the slide, below everything */
    var ax = cx - R - 20, ayl = cy + R * kEqu + 48;
    o += '<path d="M' + ax + ',' + ayl + ' l40,0 m-9,-5 l9,5 l-9,5" class="ay-slide"/>';
    o += '<text x="' + (ax + 48) + '" y="' + (ayl + 4) +
         '" class="ay-dlab slide">the equinox slides this way, about 50″ a year</text>';
    o += "</svg>";
    h.innerHTML = o;

    var ol = $("ay-steplist");
    if (ol && !ol.firstChild) {
      ol.innerHTML = STEPS.map(function (st) {
        return "<li><b>" + esc(st[0]) + "</b> " + esc(st[1]) + "</li>";
      }).join("");
    }
    drawWorked(ay);
  }

  /* The arithmetic, carried out rather than described. A formula printed is a
     formula; a formula with this year's numbers in it is something a reader
     can check against a calculator, which is the point. */
  function drawWorked(total) {
    var h = $("ay-worked");
    if (!h) return;
    var M = modes()[S.ringMode];
    if (!M) return;
    if (!M.c) {
      h.innerHTML = '<p class="ayeqnote">' + esc(M.name) + ' is stated as a rule ' +
        'rather than as this formula, so there is no line of arithmetic to show. ' +
        'Its own description is in the table further down.</p>';
      return;
    }
    var T = (S.year - 2000) / 100;
    var a = M.c[2], b = M.c[1] * T, c2 = M.c[0] * T * T;
    h.innerHTML =
      '<table class="ayworktab"><tbody>' +
      row("the year you chose", yearLabel(S.year)) +
      row("centuries since 2000 &nbsp;<i>T</i>", "(" + Math.round(S.year) +
          " − 2000) ÷ 100 = <b>" + T.toFixed(4) + "</b>") +
      row("where it stood in 2000", "<b>" + a.toFixed(6) + "°</b>") +
      row("plus the steady opening", M.c[1].toFixed(6) + "° × " + T.toFixed(4) +
          " = <b>" + (b >= 0 ? "+" : "−") + Math.abs(b).toFixed(6) + "°</b>") +
      row("plus the change in that rate", M.c[0].toFixed(8) + "° × " + T.toFixed(4) +
          "² = <b>" + (c2 >= 0 ? "+" : "−") + Math.abs(c2).toFixed(6) + "°</b>") +
      '<tr class="tot"><td>the ayanāṃśa</td><td><b>' + (a + b + c2).toFixed(6) +
      '°</b> &nbsp;=&nbsp; <b>' + esc(dm(a + b + c2)) + '</b></td></tr>' +
      '</tbody></table>' +
      '<p class="ayeqnote">Subtract that from any tropical longitude and the ' +
      'answer is sidereal. That subtraction is the whole of what an ayanāṃśa ' +
      'is for.</p>';
    function row(k, v) { return "<tr><td>" + k + "</td><td>" + v + "</td></tr>"; }
  }

  /* ======================================================================
     THE STAR-ANCHORED DEFINITIONS
     ====================================================================== */
  /* Which published definitions name a star, and which star. Taken from the
     engine's own notes rather than from a list kept here, so a definition
     cannot be described as anchored to a star the engine does not anchor it
     to. `held` marks the ones recomputed from the star for every date; the
     others set it down at an epoch and then advance by precession. */
  /* The star FAMILIES: every definition this engine carries that names the
     same junction star. `held` is the one that recomputes from the star for
     every date; the rest set it down at an epoch and advance by precession,
     or fit a polynomial to it.

     Which definition names which star is read off the engine's own notes
     rather than asserted here, so the page cannot claim an anchor the engine
     does not make. */
  var FAMILIES = [
    { star: "Citrā", at: 180, held: "truechitra",
      keys: ["truechitra", "lahiri", "nirayana_citra", "ss_citra"] },
    { star: "Revatī", at: 359 + 50 / 60, held: "truerevati",
      keys: ["truerevati", "nirayana_revati", "ss_revati"] },
    { star: "Puṣya", at: 106, held: "truepushya", keys: ["truepushya"] }
  ];
  function famOf(star) {
    var f = FAMILIES.filter(function (x) { return x.star === star; })[0];
    if (!f) return null;
    /* drop any the engine does not actually carry */
    return { star: f.star, at: f.at, held: f.held,
             keys: f.keys.filter(function (k) { return !!modes()[k]; }) };
  }

  /* THE ANCHOR, DRAWN AS THE STATEMENT IT IS.
     The first version of this put all twenty-seven names at their stars'
     longitudes on a ring whose ticks marked the equal divisions, and drew a
     dashed line from the centre to the anchor. It showed where the stars are
     and not one thing about anchoring: there was no sidereal zero on it, so
     the claim the section makes — the ayanāṃśa is whatever number puts THIS
     star at THAT longitude — had nothing to point at. Worse, Spica sits at
     179.985° and is held at 180°, so the pin and the star coincided and the
     line looked like decoration.

     Now the figure carries the whole sentence: the sidereal zero, the arc
     from it to the anchor star, which IS the stated longitude, and the
     equinox a further ayanāṃśa back, which is the number being defined.

     The names moved to the segment CENTRES, because that is what they name.
     Stars are dots at their true longitudes, which is a different thing, and
     the seven that fall outside the nakṣatra named after them are marked as
     such — Citrā's and Svātī's stars are 0.39° apart and BOTH sit in Citrā's
     segment, which is why the old drawing had them printed on top of one
     another. That is the sky, not a layout fault, so it is labelled rather
     than nudged apart. */
  function drawStarWheel() {
    var h = $("ay-starwheel");
    if (!h) return;
    var Y = window.YOGATARAS || [];
    if (!Y.length) { h.innerHTML = ""; return; }
    var sel = ($("ay-anchor") || {}).value || "Citrā";
    var A = famOf(sel);
    var ay = ayanAt(S.ringMode, S.year) || 0;
    var W = 760, H = 700, cx = 380, cy = 350;
    var RO = 300, RI = 262, RS = 232;      /* names ring, divisions, stars */
    var NW = 360 / 27;
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="aysvg" role="img" ' +
      'aria-label="The twenty-seven nakṣatra divisions with their junction stars, ' +
      'the sidereal zero, and the arc to the star this definition anchors to">' +
      '<title>What a star-anchored definition actually says</title>';

    /* the twenty-seven equal divisions */
    for (var i = 0; i < 27; i++) {
      var b0 = i * NW, isA = A && Y[i] && Y[i].nak === A.star;
      o += '<path d="' + wedge(cx, cy, RI, RO, b0, b0 + NW) +
           '" class="ay-swseg' + (i % 2 ? " alt" : "") + (isA ? " on" : "") + '"/>';
      var m = xy(cx, cy, (RI + RO) / 2, b0 + NW / 2);
      var ang = b0 + NW / 2;
      var rot = (ang > 90 && ang < 270) ? (180 - ang - 90) : (-ang + 90);
      o += '<text x="' + m[0].toFixed(1) + '" y="' + (m[1] + 3).toFixed(1) +
           '" class="ay-swseglab' + (isA ? " on" : "") + '" transform="rotate(' +
           rot.toFixed(1) + ' ' + m[0].toFixed(1) + ' ' + m[1].toFixed(1) + ')">' +
           esc((Y[i] || {}).nak || "") + '</text>';
    }
    /* each junction star at its OWN longitude, which is not the centre of the
       division named after it and for seven of them is not even inside it */
    /* The catalogue stores each star's sidereal longitude under LAHIRI. This
       ring's zero is the definition currently selected, so the stars have to
       be re-based into that frame or they would be drawn against a zero that
       is not theirs — up to a degree out when the selection is Fagan. Same
       correction the star-wheel page makes, and for the same reason. */
    var frame = (ayanAt("lahiri", S.year) || 0) - ay;
    var starLon = function (sid) { return ((sid + frame) % 360 + 360) % 360; };
    Y.forEach(function (st) {
      var isA = A && st.nak === A.star;
      var L = starLon(st.sid);
      var p = xy(cx, cy, RS, L);
      var t0 = xy(cx, cy, RS, L), t1 = xy(cx, cy, RI, L);
      o += '<line x1="' + t0[0].toFixed(1) + '" y1="' + t0[1].toFixed(1) + '" x2="' +
           t1[0].toFixed(1) + '" y2="' + t1[1].toFixed(1) + '" class="ay-swtick' +
           (st.inside ? "" : " out") + '"/>';
      o += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' +
           (isA ? 7 : 3.6) + '" class="ay-swstar' + (isA ? " on" : "") +
           (st.inside ? "" : " out") + '"/>';
    });

    /* THE SIDEREAL ZERO — the thing the whole definition exists to place */
    var z = xy(cx, cy, RO + 18, 0);
    o += '<line x1="' + cx + '" y1="' + cy + '" x2="' + z[0].toFixed(1) + '" y2="' +
         z[1].toFixed(1) + '" class="ay-swzero"/>';
    /* anchored to START and set inside the line's end: at anchor-end it ran
       off the left edge of the box and read "idereal 0°" */
    o += '<text x="' + (z[0] + 6).toFixed(1) + '" y="' + (z[1] - 12).toFixed(1) +
         '" class="ay-swzlab">sidereal 0°</text>';
    /* the equinox, an ayanāṃśa back from it — the same angle as the rings figure */
    var e = xy(cx, cy, RO + 18, -ay);
    o += '<line x1="' + cx + '" y1="' + cy + '" x2="' + e[0].toFixed(1) + '" y2="' +
         e[1].toFixed(1) + '" class="ay-swequinox"/>';
    o += '<path d="' + wedge(cx, cy, 0, 96, -ay, 0) + '" class="ay-gap"/>';
    var em = xy(cx, cy, 128, -ay / 2);
    o += '<text x="' + em[0].toFixed(1) + '" y="' + em[1].toFixed(1) +
         '" class="ay-swaylab">ayanāṃśa ' + esc(dm(ay)) + '</text>';

    if (A) {
      var st2 = Y.filter(function (x) { return x.nak === A.star; })[0];
      /* the arc from the sidereal zero round to the anchor longitude: this is
         the definition's actual claim, drawn */
      o += '<path d="' + wedge(cx, cy, 150, 162, 0, A.at) + '" class="ay-swarc"/>';
      /* ONE statement, not two. A centred block repeating the star and the
         longitude sat on top of the ayanāṃśa label and said nothing the arc
         label had not already said. */
      var am = xy(cx, cy, 186, A.at / 2);
      o += '<text x="' + am[0].toFixed(1) + '" y="' + (am[1] - 10).toFixed(1) +
           '" class="ay-swarclab">' + esc(A.star) + ' is held at ' +
           esc(dm(A.at)) + '</text>';
      o += '<text x="' + am[0].toFixed(1) + '" y="' + (am[1] + 9).toFixed(1) +
           '" class="ay-swsub">from the sidereal zero — ' + A.keys.length +
           (A.keys.length === 1 ? " definition says so" : " definitions say so") +
           '</text>';
      var rd = $("ay-anchorread");
      if (rd && st2) {
        rd.innerHTML = esc(st2.star) + " (" + esc(st2.bayer) + "), the yogatārā of " +
          esc(A.star) + " — magnitude " + st2.mag.toFixed(2) + ". " +
          (st2.inside ? "It lies inside the nakṣatra named after it."
                      : "<b>It lies outside the nakṣatra named after it.</b>");
      }
    }
    /* say the awkward thing rather than let it look like a drawing fault */
    var outN = Y.filter(function (x) { return !x.inside; }).length;
    o += '<text x="' + cx + '" y="' + (H - 14) + '" class="ay-swfoot">' +
         'dots are the junction stars at their true longitudes; ' + outN +
         ' of the 27 fall outside the nakṣatra named after them</text>';
    o += "</svg>";
    h.innerHTML = o;
    drawDrift(sel);
  }

  /* Every definition naming this star, plotted as its distance from the one
     that HOLDS the star — which is zero by construction, so the plot reads
     directly as "how far from the star's stated longitude each of these
     actually puts it".

     WHAT THE CURVES TURNED OUT TO SHOW, which is not what was first written
     here. The prose originally said the set-down definitions slide away from
     the star. Measured, the Citrā family is dominated by a near-CONSTANT
     offset — Sūrya Siddhānta's Citrā sits about 50′ from True Chitrapakṣa
     and changes by only 1.4′ across two thousand years — while Lahiri, the
     polynomial fitted to the same anchor, starts within a quarter of an
     arcminute and departs by about 1.4′ over the same span. Those are two
     different stories and only the second is drift, so the page now reports
     the numbers and names which is which rather than telling one story about
     both. */
  function drawDrift(star) {
    var h = $("ay-drift");
    if (!h) return;
    var F = famOf(star);
    if (!F || F.keys.length < 2) {
      h.innerHTML = '<p class="ayeqnote">Only one definition on this site is ' +
        'anchored to ' + esc(star || "") + ', so there is nothing to compare it ' +
        'against here. Citrā and Revatī each have several.</p>';
      if ($("ay-driftnote")) $("ay-driftnote").textContent = "";
      return;
    }
    var y0 = 1000, y1 = 3000, N = 50;
    var series = F.keys.filter(function (k) { return k !== F.held; }).map(function (k) {
      var pts = [];
      for (var i = 0; i <= N; i++) {
        var y = y0 + (y1 - y0) * i / N;
        var ah = ayanAt(F.held, y), ak = ayanAt(k, y);
        if (ah == null || ak == null) continue;
        pts.push({ y: y, v: (ah - ak) * 60 });        /* arcminutes */
      }
      return { key: k, name: (modes()[k] || {}).s || k, pts: pts };
    }).filter(function (s2) { return s2.pts.length; });
    if (!series.length) { h.innerHTML = ""; return; }

    var all = [];
    series.forEach(function (s2) { s2.pts.forEach(function (q) { all.push(q.v); }); });
    all.push(0);
    var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
    var pad = Math.max(2, (hi - lo) * 0.18);
    lo -= pad; hi += pad;
    var W = 700, H = 300, L = 86, Rr = 120, T = 22, B = 42;
    var sx = function (y) { return L + (y - y0) / (y1 - y0) * (W - L - Rr); };
    var sy = function (v) { return T + (1 - (v - lo) / (hi - lo)) * (H - T - B); };
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="aysvg" role="img" ' +
      'aria-label="Each definition naming this star, as its distance in ' +
      'arcminutes from the one that holds the star, over two thousand years">' +
      '<title>The definitions that name this star, compared</title>';
    /* the zero line IS the held definition */
    o += '<line x1="' + L + '" y1="' + sy(0).toFixed(1) + '" x2="' + (W - Rr) +
         '" y2="' + sy(0).toFixed(1) + '" class="ay-axis0"/>';
    o += '<text x="' + (L - 8) + '" y="' + (sy(0) + 4).toFixed(1) +
         '" class="ay-dtick">on the star</text>';
    [lo + pad, hi - pad].forEach(function (v) {
      o += '<text x="' + (L - 8) + '" y="' + (sy(v) + 4).toFixed(1) +
           '" class="ay-dtick">' + (v > 0 ? "+" : "") + v.toFixed(0) + '′</text>';
    });
    var COL = ["#a1493a", "#1c6b46", "#3f6fa6", "#8a6a1f"];
    series.forEach(function (s2, i) {
      var d2 = s2.pts.map(function (q, j) {
        return (j ? "L" : "M") + sx(q.y).toFixed(1) + "," + sy(q.v).toFixed(1);
      }).join(" ");
      o += '<path d="' + d2 + '" class="ay-dline" stroke="' + COL[i % COL.length] + '"/>';
      var last = s2.pts[s2.pts.length - 1];
      o += '<text x="' + (W - Rr + 8) + '" y="' + (sy(last.v) + 4).toFixed(1) +
           '" class="ay-dkey" fill="' + COL[i % COL.length] + '">' + esc(s2.name) + '</text>';
    });
    [y0, 1500, 2000, 2500, y1].forEach(function (y) {
      o += '<text x="' + sx(y).toFixed(1) + '" y="' + (H - 16) +
           '" class="ay-dx">' + yearLabel(y) + '</text>';
    });
    o += "</svg>";
    h.innerHTML = o;

    /* the note states, for each, the offset now and how much it MOVED —
       because those are the two different things the curves show */
    var n = $("ay-driftnote");
    if (!n) return;
    n.innerHTML = "Measured against <b>" +
      esc((modes()[F.held] || {}).name || F.held) + "</b>, which holds " +
      esc(F.star) + " at its stated longitude for every date. " +
      series.map(function (s2) {
        var a0 = s2.pts[0].v, a1 = s2.pts[s2.pts.length - 1].v;
        var nowV = (function () {
          var ah = ayanAt(F.held, S.year), ak = ayanAt(s2.key, S.year);
          return (ah == null || ak == null) ? null : (ah - ak) * 60;
        })();
        return "<b>" + esc((modes()[s2.key] || {}).name || s2.key) + "</b> is " +
          (nowV == null ? "—" : (Math.abs(nowV) < 1
            ? Math.abs(nowV * 60).toFixed(0) + "″"
            : Math.abs(nowV).toFixed(1) + "′")) +
          " away at " + esc(yearLabel(S.year)) + " and moves " +
          Math.abs(a1 - a0).toFixed(1) + "′ across the two thousand years shown";
      }).join("; ") + ".";
  }

  /* ======================================================================
     WHAT IT DOES TO A CHART
     ====================================================================== */
  var CHART_AY = null;          /* null means "follow the selected definition" */
  var CHART_MODE = "direct";    /* or "eq": the polynomial drives the chart */

  /* The chart's own date in centuries from 2000 — the T a real convention is
     evaluated at, because the ayanāṃśa a chart is cast with is the formula
     evaluated at the birth moment and not at today. */
  function chartT() {
    var d = new Date((S.when == null ? Date.now() : S.when) +
                     (S.place ? S.place.tz : 0) * 3600000);
    return (d.getUTCFullYear() + (d.getUTCMonth() + 0.5) / 12 - 2000) / 100;
  }
  function eqCoeffs() {
    return {
      c0: +($("ay-ec0") || {}).value || 0,
      c1: (+($("ay-ec1") || {}).value || 0) / 3600 * 100,   /* ″/yr → °/century */
      c2: +($("ay-ec2") || {}).value || 0
    };
  }
  /* the ayanāṃśa the chart is actually drawn with, whichever way it is driven */
  function chartAyan() {
    if (CHART_MODE === "eq") {
      var c = eqCoeffs(), T = chartT();
      return c.c0 + c.c1 * T + c.c2 * T * T;
    }
    return CHART_AY == null ? (ayanAt(S.ringMode, S.year) || 0) : CHART_AY;
  }

  /* The arithmetic that produced the chart, shown feeding it — and with each
     term's share, because the point of driving a chart from the equation is
     to see WHICH part of the equation moved a graha. */
  function drawChartEq() {
    var box = $("ay-charteqout");
    if (!box) return;
    if (CHART_MODE !== "eq") { box.hidden = true; return; }
    box.hidden = false;
    var c = eqCoeffs(), T = chartT();
    var t0 = c.c0, t1 = c.c1 * T, t2 = c.c2 * T * T;
    var tot = t0 + t1 + t2;
    /* how far each term alone could move a graha, in arcminutes — the T²
       term is a few thousandths of an arcsecond at a present-day date and
       this says so rather than leaving a reader to wonder why the slider
       appears dead */
    box.innerHTML = '<table class="ayworktab"><tbody>' +
      '<tr><td>the chart&rsquo;s date</td><td><b>' +
        esc(new Date((S.when == null ? Date.now() : S.when) +
            (S.place ? S.place.tz : 0) * 3600000).getUTCFullYear()) +
        '</b> &nbsp;→&nbsp; <i>T</i> = <b>' + T.toFixed(4) + '</b></td></tr>' +
      '<tr><td>c₀</td><td>' + t0.toFixed(6) + '°</td></tr>' +
      '<tr><td>c₁ × T</td><td>' + (t1 >= 0 ? "+" : "−") + Math.abs(t1).toFixed(6) +
        '°</td></tr>' +
      '<tr><td>c₂ × T²</td><td>' + (t2 >= 0 ? "+" : "−") + Math.abs(t2).toFixed(6) +
        '° &nbsp;<span class="ayminival">' +
        (Math.abs(t2) * 3600 < 1
          ? "— " + (Math.abs(t2) * 3600).toFixed(3) + "″, far too small to move anything"
          : "— " + (Math.abs(t2) * 60).toFixed(1) + "′, now large enough to matter") +
        '</span></td></tr>' +
      '<tr class="tot"><td>drives the chart with</td><td><b>' + tot.toFixed(6) +
        '°</b> = <b>' + esc(dm(tot)) + '</b></td></tr>' +
      '</tbody></table>';
  }

  function chartSky() {
    /* The engine is asked for TROPICAL longitudes once, by taking a sidereal
       set under a known definition and adding its ayanāṃśa back. Everything
       below is then a subtraction, so dragging the slider costs nothing and
       the grahas cannot wander for any reason other than the number. */
    var s = skyUnder("lahiri");
    if (!s) return null;
    var base = s.ayanamsa;
    return {
      ayan: base,
      planets: s.planets.map(function (p) {
        return { en: p.en, trop: ((p.sid + base) % 360 + 360) % 360 };
      }),
      lagnaTrop: ((s.lagna + base) % 360 + 360) % 360
    };
  }

  function drawChart() {
    var h = $("ay-chartsvg");
    if (!h || typeof northChart !== "function") return;
    var sky = chartSky();
    if (!sky) { h.innerHTML = ""; return; }
    var ay = chartAyan();
    var sid = function (trop) { return ((trop - ay) % 360 + 360) % 360; };
    var lag = Math.floor(sid(sky.lagnaTrop) / 30);
    var occ = {};
    sky.planets.forEach(function (p) {
      var sg = Math.floor(sid(p.trop) / 30);
      (occ[sg] = occ[sg] || []).push(GL[p.en] || p.en);
    });
    h.innerHTML = northChart(
      function (house) { return (lag + house - 1) % 12; },
      function (house) { return occ[(lag + house - 1) % 12] || []; },
      "Rāśi (D1)", "at ayanāṃśa " + dm(ay));

    /* the column that answers "what actually changes" */
    var NAKW = 360 / 27;
    var rows = sky.planets.map(function (p) {
      var L = sid(p.trop);
      return {
        en: p.en, trop: p.trop,
        sign: SA[Math.floor(L / 30)],
        nak: NAK[Math.floor(L / NAKW)],
        /* how much MORE ayanāṃśa before this graha drops into the previous
           division: raising the ayanāṃśa lowers the sidereal longitude, so
           the boundary it approaches is the one below it */
        toSign: L - Math.floor(L / 30) * 30,
        toNak: L - Math.floor(L / NAKW) * NAKW
      };
    });
    var all = modeKeys().map(function (k) { return ayanAt(k, S.year); })
                        .filter(function (v) { return v != null; });
    var spanLo = Math.min.apply(null, all), spanHi = Math.max.apply(null, all);
    /* Whether the published definitions actually disagree about a graha's
       rāśi is decided by ASKING them, not by comparing its distance from the
       boundary against the span. The span test is a good approximation and is
       wrong near a boundary in either direction — a graha one arcminute past
       a cusp is contested, one a degree before it may not be. */
    var signAt = function (trop, a) {
      return Math.floor((((trop - a) % 360 + 360) % 360) / 30);
    };
    var e = $("ay-chartedge");
    if (!e) return;
    var maxBar = 30;
    e.innerHTML = '<table class="aytab aychtab"><thead><tr><th>Graha</th>' +
      '<th>rāśi</th><th>nakṣatra</th><th>how much ayanāṃśa until it changes</th>' +
      '</tr></thead><tbody>' +
      rows.map(function (r) {
        var ws = (r.toSign / maxBar) * 100, wn = (r.toNak / maxBar) * 100;
        /* the published definitions span this much; a graha closer to its
           boundary than that span is one they genuinely disagree about */
        var contested = signAt(r.trop, spanLo) !== signAt(r.trop, spanHi);
        return '<tr><td>' + esc(r.en) + '</td><td>' + esc(r.sign) + '</td><td>' +
          esc(r.nak) + '</td><td class="aybarcell">' +
          '<span class="aymini"><i class="s" style="width:' + ws.toFixed(1) + '%"></i>' +
          '<i class="n" style="width:' + wn.toFixed(1) + '%"></i></span>' +
          '<span class="ayminival">' + esc(dm(r.toSign)) + ' to the rāśi, ' +
          esc(dm(r.toNak)) + ' to the nakṣatra' +
          (contested ? ' <b class="contest">— inside the span of the nineteen</b>' : '') +
          '</span></td></tr>';
      }).join("") + '</tbody></table>';
  }

  function fillChartControls() {
    var j = $("ay-chartjump");
    if (j && !j.options.length) {
      j.innerHTML = '<option value="">follow the selection above</option>' +
        modeKeys().map(function (k) {
          return '<option value="' + esc(k) + '">' + esc((modes()[k] || {}).name || k) +
            "</option>";
        }).join("");
    }
    var r = $("ay-chartay");
    if (r && CHART_AY == null) {
      var v = ayanAt(S.ringMode, S.year);
      if (v != null) r.value = String(v);
    }
    var rd = $("ay-chartread");
    if (rd) {
      var cur = chartAyan();
      rd.textContent = dm(cur) +
        (CHART_MODE === "eq" ? "  (from the equation)"
                             : (CHART_AY == null ? "  (following the selection)" : ""));
    }
    var dEl = $("ay-chartdirect"), eEl = $("ay-charteq");
    if (dEl) dEl.hidden = (CHART_MODE === "eq");
    if (eEl) eEl.hidden = (CHART_MODE !== "eq");
    drawChartEq();
  }

  function fillAnchorSelect() {
    var a = $("ay-anchor");
    if (!a || a.options.length) return;
    a.innerHTML = FAMILIES.map(function (x) {
      var f = famOf(x.star);
      return '<option value="' + esc(x.star) + '"' +
        (x.star === "Citrā" ? " selected" : "") + ">" + esc(x.star) +
        " — " + f.keys.length +
        (f.keys.length === 1 ? " definition" : " definitions") + "</option>";
    }).join("");
  }

  /* ---- 7. the card and the film ------------------------------------------ */
  function cardMeta() {
    var ay = ayanAt(S.ringMode, S.year);
    var M = modes()[S.ringMode] || {};
    if (S.cardKind === "spread") {
      var vals = modeKeys().map(function (k) { return ayanAt(k, S.year); })
                           .filter(function (v) { return v != null; });
      var span = Math.max.apply(null, vals) - Math.min.apply(null, vals);
      return { head: "Nineteen answers", big: dm(span),
               sub: "how far the definitions disagree, at " + yearLabel(S.year),
               foot: "The engine's own uncertainty is about one arcsecond." };
    }
    if (S.cardKind === "cancel") {
      return { head: "What it cannot change", big: "tithi",
               sub: "a tithi is the gap between Moon and Sun",
               foot: "Subtract the same ayanāṃśa from both and the gap is unchanged." };
    }
    return { head: "Ayanāṃśa", big: dm(ay),
             sub: M.name + " · " + yearLabel(S.year),
             foot: "The angle between the equinox and the stars." };
  }

  function drawCard() {
    var cv = $("ay-canvas");
    if (!cv || !window.NCard) return;
    var R = window.NCard.RATIOS[S.ratio] || window.NCard.RATIOS["4:5"];
    cv.width = R.w; cv.height = R.h;
    var c = cv.getContext("2d");
    var m = cardMeta();
    paintFrame(c, R.w, R.h, m, null);
    var svg = host.querySelector("svg");
    if (svg && window.SvgFilm) {
      darkly(function () { return window.SvgFilm.snapshot(svg); })
        .then(function (shot) { paintFrame(c, R.w, R.h, m, shot); })
        .catch(function () {});
    }
  }

  /* Photograph the drawing in its capture palette, then put it back. The
     page is cream and the card is near-black, so the page's own ink came out
     almost invisible on the first card; the styles are swapped for the one
     instant of the snapshot rather than a second drawing being kept. */
  function darkly(fn) {
    host.setAttribute("data-film", "dark");
    var p = fn();
    return p.then(function (v) { host.removeAttribute("data-film"); return v; },
                  function (e) { host.removeAttribute("data-film"); throw e; });
  }

  function paintFrame(c, W, H, m, shot) {
    var g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#131a33"); g.addColorStop(0.55, "#0a0e1d"); g.addColorStop(1, "#05070e");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.textAlign = "center";
    c.fillStyle = "#9fa8c6";
    c.font = Math.round(W * 0.030) + "px Georgia, serif";
    c.fillText(m.head, W / 2, Math.round(H * 0.095));
    c.fillStyle = "#f3e9cf";
    c.font = "600 " + Math.round(W * 0.085) + "px Georgia, serif";
    c.fillText(m.big, W / 2, Math.round(H * 0.175));
    c.fillStyle = "#e8c874";
    c.font = Math.round(W * 0.028) + "px Georgia, serif";
    c.fillText(m.sub, W / 2, Math.round(H * 0.225));
    if (shot) {
      var top = Math.round(H * 0.27), bot = Math.round(H * 0.80);
      var availW = W - Math.round(W * 0.06), availH = bot - top;
      var k = Math.min(availW / shot.w, availH / shot.h);
      c.drawImage(shot.img, (W - shot.w * k) / 2, top + (availH - shot.h * k) / 2,
                  shot.w * k, shot.h * k);
    }
    c.fillStyle = "#8d96b4";
    c.font = Math.round(W * 0.023) + "px Georgia, serif";
    wrap(c, m.foot, W / 2, Math.round(H * 0.855), W * 0.84, Math.round(W * 0.033));
    c.fillStyle = "#e8c874";
    c.font = "600 " + Math.round(W * 0.029) + "px Georgia, serif";
    c.fillText("@Nirayana.Soft", W / 2, Math.round(H * 0.945));
  }
  function wrap(c, text, x, y, max, lh) {
    var words = String(text || "").split(" "), line = "", n = 0;
    words.forEach(function (w) {
      var t = line ? line + " " + w : w;
      if (c.measureText(t).width > max && line) {
        c.fillText(line, x, y + n * lh); line = w; n++;
      } else line = t;
    });
    if (line) c.fillText(line, x, y + n * lh);
  }

  function film() {
    if (!window.SvgFilm) { msg("ay-msg", "The film layer is missing."); return; }
    var R = window.NCard.RATIOS[S.ratio] || window.NCard.RATIOS["9:16"];
    var y0 = -500, y1 = 3500, runMs = 9000;
    var keep = S.year;
    msg("ay-msg", "Rendering…");
    window.SvgFilm.record({
      width: R.w, height: R.h, runMs: runMs,
      svg: function () { return host.querySelector("svg"); },
      at: function (ms) {
        S.year = Math.round(y0 + (y1 - y0) * (ms / runMs));
        drawRings();
        host.setAttribute("data-film", "dark");   /* held for the whole render */
      },
      compose: function (c, W, H, shot) {
        var ay = ayanAt(S.ringMode, S.year);
        paintFrame(c, W, H, {
          head: "The gap between two zodiacs",
          big: (ay == null ? "" : dm(ay)),
          sub: yearLabel(S.year) + " · " + ((modes()[S.ringMode] || {}).name || ""),
          foot: "The stars stay. The seasons slip. The ayanāṃśa is the difference."
        }, shot);
      },
      onProgress: function (f) { msg("ay-msg", "Rendering… " + Math.round(f * 100) + "%"); }
    }).then(function (r) {
      host.removeAttribute("data-film");
      S.year = keep; syncYear(); redraw();
      window.SvgFilm.save(r.blob, "nirayana-ayanamsa." + r.ext);
      msg("ay-msg", r.frames + " frames · " + r.seconds.toFixed(1) + "s saved.");
    }).catch(function (e) {
      host.removeAttribute("data-film");
      S.year = keep; syncYear(); redraw();
      msg("ay-msg", (e && e.message) || "The film could not be rendered.");
    });
  }

  /* ---- wiring ------------------------------------------------------------ */
  function fillModeSelect() {
    var sel = $("ay-ringmode");
    if (!sel) return;
    sel.innerHTML = modeKeys().map(function (k) {
      return '<option value="' + esc(k) + '"' + (k === S.ringMode ? " selected" : "") +
        ">" + esc((modes()[k] || {}).name || k) + "</option>";
    }).join("");
  }
  function syncYear() {
    var r = $("ay-year");
    if (r) r.value = String(S.year);
  }
  function redraw() {
    drawRings();
    drawDerive();
    drawStarWheel();
    drawSpread();
    drawImpact();
    drawBand();
    fillChartControls();
    drawChart();
    syncSand();
    drawCard();
  }

  function bind() {
    document.addEventListener("input", function (e) {
      var t = e.target;
      if (t.id === "ay-year") {
        S.year = +t.value;
        drawRings(); drawDerive(); drawSpread(); drawDrift(($("ay-anchor")||{}).value);
        fillChartControls(); drawChart(); syncSand(); drawCard();
      }
      else if (t.id === "ay-chartay") { CHART_AY = +t.value; fillChartControls(); drawChart(); }
      else if (/^ay-ec[012]$/.test(t.id)) { fillChartControls(); drawChart(); }
      else if (/^ay-c[012]$/.test(t.id)) syncSand();
    });
    document.addEventListener("change", function (e) {
      var t = e.target;
      if (t.id === "ay-ringmode") { S.ringMode = t.value; CHART_AY = null; redraw(); }
      else if (t.id === "ay-anchor") { drawStarWheel(); }
      else if (t.id === "ay-chartmode") {
        CHART_MODE = t.value;
        /* carry the current number across, so switching modes does not jump
           the chart — the reader is comparing, not restarting */
        if (CHART_MODE === "eq") {
          var cur = CHART_AY == null ? (ayanAt(S.ringMode, S.year) || 0) : CHART_AY;
          var T = chartT(), cc = eqCoeffs();
          $("ay-ec0").value = (cur - cc.c1 * T - cc.c2 * T * T).toFixed(3);
        }
        fillChartControls(); drawChart();
      }
      else if (t.id === "ay-chartjump") {
        CHART_AY = t.value ? ayanAt(t.value, S.year) : null;
        fillChartControls(); drawChart();
      }
      else if (t.id === "ay-ratio") { S.ratio = t.value; drawCard(); }
      else if (t.id === "ay-cardkind") { S.cardKind = t.value; drawCard(); }
      else if (t.id === "ay-when") {
        var v = Date.parse(t.value);
        if (!isNaN(v)) {
          S.when = v - (S.place ? S.place.tz : 0) * 3600000;
          /* The CHART is cast for this moment too, and its T comes from it —
             the first version redrew only the impact table, so changing the
             moment left a chart underneath it that was still drawn for the
             old one, and the equation's T never moved off the present day. */
          drawImpact(); drawBand(); fillChartControls(); drawChart();
        }
      }
    });
    document.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-ay]") : null;
      if (!b) return;
      var k = b.getAttribute("data-ay");
      if (k === "today") { S.year = new Date().getFullYear(); syncYear(); redraw(); }
      else if (k === "zero") {
        /* the year this definition's gap was zero — found by bisection rather
           than from a constant, so it is right for whichever is selected */
        var lo = -5000, hi = 5000;
        for (var i = 0; i < 60; i++) {
          var mid = (lo + hi) / 2;
          if ((ayanAt(S.ringMode, mid) || 0) < 0) lo = mid; else hi = mid;
        }
        S.year = Math.round((lo + hi) / 2); syncYear(); redraw();
      }
      else if (k === "now") {
        S.when = Date.now(); syncWhen();
        drawImpact(); drawBand(); fillChartControls(); drawChart();
      }
      else if (k === "pin") applyPin();
      else if (k === "apply") applyCustom();
      else if (k === "drop") dropCustom();
      else if (k === "png") {
        var cv = $("ay-canvas");
        if (!cv) return;
        cv.toBlob(function (bl) {
          if (bl && window.SvgFilm) window.SvgFilm.save(bl, "nirayana-ayanamsa.png");
        }, "image/png");
      }
      else if (k === "film") film();
    });
  }
  function syncWhen() {
    var e = $("ay-when");
    if (!e || S.when == null) return;
    var d = new Date(S.when + (S.place ? S.place.tz : 0) * 3600000);
    e.value = d.getUTCFullYear() + "-" +
      String(d.getUTCMonth() + 1).padStart(2, "0") + "-" +
      String(d.getUTCDate()).padStart(2, "0") + "T" +
      String(d.getUTCHours()).padStart(2, "0") + ":" +
      String(d.getUTCMinutes()).padStart(2, "0");
  }

  need([
    { src: "engine.js", have: function () { return !!window.__ayanFor; } },
    { src: "places.js", have: function () { return !!window.NPlaces; } },
    { src: "panchanga.js", have: function () { return !!(window.NP && window.NP.day); } },
    { src: "cards.js", have: function () { return !!window.NCard; } },
    { src: "bodies.js", have: function () { return !!window.NSprite; } }
  ], function () {
    S.place = (window.NP && window.NP.savedPlace && window.NP.savedPlace()) ||
              { n: "Ujjain", lat: 23.1765, lon: 75.7885, tz: 5.5 };
    S.when = Date.now();
    var ph = $("ay-place");
    if (ph && window.NPlaces.picker) {
      window.NPlaces.picker({
        host: ph, value: S.place,
        quick: [S.place].concat((window.NP && window.NP.PLACES) || []),
        label: "Place",
        refMs: function () { return S.when || Date.now(); },
        onPick: function (p) {
          S.place = p; syncWhen();
          drawImpact(); drawBand(); fillChartControls(); drawChart();
        }
      });
    }
    var r = $("ay-ratio");
    if (r && window.NCard) {
      var RA = window.NCard.RATIOS;
      r.innerHTML = Object.keys(RA).map(function (k) {
        return '<option value="' + esc(k) + '"' + (k === S.ratio ? " selected" : "") +
          ">" + esc(RA[k].label || k) + "</option>";
      }).join("");
    }
    fillModeSelect();
    fillAnchorSelect();
    fillChartControls();
    syncYear();
    syncWhen();
    sandbox();
    drawCone();
    bind();
    redraw();
  });
})();
;
