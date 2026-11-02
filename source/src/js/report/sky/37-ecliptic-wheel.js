/* ===== Sky view: the ecliptic as a wheel, and the local horizon as a dome ===== */
var SKY_NAKA=["Aśvinī","Bharaṇī","Kṛttikā","Rohiṇī","Mṛgaśira","Ārdrā","Punarvasu","Puṣya","Āśleṣā",
"Maghā","P.Phalgunī","U.Phalgunī","Hasta","Citrā","Svātī","Viśākhā","Anurādhā","Jyeṣṭhā","Mūla",
"P.Āṣāḍhā","U.Āṣāḍhā","Śravaṇa","Dhaniṣṭhā","Śatabhiṣā","P.Bhādra","U.Bhādra","Revatī"];
var SKY_ELEM=["#c2492f","#6a7f3a","#c9a24b","#3f7fa6","#c2492f","#6a7f3a","#c9a24b","#3f7fa6",
              "#c2492f","#6a7f3a","#c9a24b","#3f7fa6"];
function skyXY(cx,cy,r,deg){ var a=(180-deg)*Math.PI/180; return [cx+r*Math.cos(a), cy-r*Math.sin(a)]; }
function skyArc(cx,cy,r,a0,a1){
  var p0=skyXY(cx,cy,r,a0), p1=skyXY(cx,cy,r,a1);
  var large=(((a1-a0)%360+360)%360)>180?1:0;
  return "M"+p0[0].toFixed(1)+","+p0[1].toFixed(1)+" A"+r+","+r+" 0 "+large+" 0 "+p1[0].toFixed(1)+","+p1[1].toFixed(1);
}
/* skyXY puts 0° at the left and increases clockwise on screen, so the outer arc of a
   wedge is traversed in the positive (clockwise) direction — sweep 1 — and the inner
   arc back again with sweep 0. These were the other way round until 2026-10, which bowed
   every wedge to the wrong side of its chord: about 12px at the sign ring's radius. */
/* `cls` is additive and optional: the wedges carried no class at all, so a
   page wanting to recolour the sign bands had nothing to select. A class
   changes nothing on its own — CSS beats a presentation attribute only where a
   rule exists — so the report, which defines no such rule, renders exactly as
   before. */
function skyWedge(cx,cy,r0,r1,a0,a1,fill,op,cls){
  var p=[skyXY(cx,cy,r1,a0),skyXY(cx,cy,r1,a1),skyXY(cx,cy,r0,a1),skyXY(cx,cy,r0,a0)];
  var lg=(((a1-a0)%360+360)%360)>180?1:0;
  return '<path d="M'+p[0][0].toFixed(1)+','+p[0][1].toFixed(1)+
    ' A'+r1+','+r1+' 0 '+lg+' 1 '+p[1][0].toFixed(1)+','+p[1][1].toFixed(1)+
    ' L'+p[2][0].toFixed(1)+','+p[2][1].toFixed(1)+
    ' A'+r0+','+r0+' 0 '+lg+' 0 '+p[3][0].toFixed(1)+','+p[3][1].toFixed(1)+
    ' Z" fill="'+fill+'" fill-opacity="'+op+'"'+(cls?' class="'+cls+'"':'')+'/>';
}
/* A divisional chart maps a longitude to a varga sign. To place a planet on a wheel
   we also want a position *within* that sign, so the continuous varga longitude is
   the varga sign plus however far the planet has travelled through its division,
   stretched across the 30°. Most vargas cut each sign into equal parts, so that
   fraction is well defined. Triṃśāṃśa does not — its five parts are 5°, 5°, 8°, 7°
   and 5° — so a planet there is placed at the centre of its varga sign and the note
   below says so. */
var SKY_VDIV={D1:1,D2:2,D3:3,D4:4,D7:7,D9:9,D10:10,D12:12,D16:16,D20:20,D24:24,D27:27,
              D40:40,D45:45,D60:60};
var SKY_VARGA="D1";
function skyVargaLon(code,sid){
  if(code==="D1") return sid;
  var sg=vargaLagna(code,sid);
  var N=SKY_VDIV[code];
  if(!N) return sg*30+15;                       // Triṃśāṃśa: centre of the varga sign
  var d=sid-Math.floor(sid/30)*30, w=30/N;
  var f=(d-Math.floor(d/w)*w)/w;
  return ((sg*30+f*30)%360+360)%360;
}
/* Graha dṛṣṭi as chords. Every graha aspects the 7th from itself; Mars adds the 4th
   and 8th, Jupiter the 5th and 9th, Saturn the 3rd and 10th. Drawn from the graha's
   own degree to the same degree in the aspected sign, which is where the glance
   actually falls. */
var SKY_ASPOFF={Sun:[180],Moon:[180],Mercury:[180],Venus:[180],
                Mars:[90,180,210],Jupiter:[120,180,240],Saturn:[60,180,270],
                Rahu:[180],Ketu:[180]};
var SKY_BEN={Jupiter:1,Venus:1,Mercury:1,Moon:1};
var SKY_ASPECT="none";

/* ---------------------------------------------------------------------------
   Display options. Every one of these is a switch in the pane; the renderer reads
   them and nothing else decides what is drawn.
   --------------------------------------------------------------------------- */
var SKY_OPT={
  natal:true,        // the inner ring: where the grahas stood at birth
  transit:true,      // the outer ring: where they stand at the shown moment
  nakshatra:true,    // the 27 nakṣatras and their pādas (rāśi chart only)
  degrees:true,      // position to the arc-minute under each glyph
  retro:true,        // the R mark
  speed:false,       // a short arrow showing direction and pace
  trail:false,       // where each graha has been
  trailDays:90,
  tilt:0,            // degrees; 0 is the flat wheel
  latExag:8,         // how far latitude is exaggerated when tilted
  lanes:true,        // stack crowded grahas inward instead of letting them collide
  /* Which grahas are drawn. At a gochara rate the Moon crosses the whole wheel thirteen
     times a second and Mercury is not much better, so watching Śani cross a sign means
     turning the fast ones off. Nothing is being hidden from the arithmetic — only from
     the drawing. */
  show:{Sun:true,Moon:true,Mars:true,Mercury:true,Jupiter:true,Venus:true,Saturn:true,
        Rahu:true,Ketu:true},
  /* Draw each graha as its lit surface instead of a lettered disc. OFF here:
     the report's Sky tab is a production page and keeps the discs it has
     always had, so this renderer stays byte-identical for it. ecliptic.html
     turns it on, having loaded bodies.js. If the sprites are unavailable
     NSprite.href returns null and the lettered disc is drawn, because a wheel
     with no grahas on it is worse than a plain one. */
  art:false
};
/* A drawing convention, the same one sp-cosmos.js uses: relative sizes so the
   Sun reads as the Sun and Mercury as Mercury. NOT apparent magnitude and not
   true angular diameter — the Sun and Moon subtend about half a degree each
   and every other graha is a point. */
var SKY_ART_R={Sun:1.45,Moon:1.15,Jupiter:1.25,Saturn:1.2,Venus:1.0,
               Mars:0.88,Mercury:0.8,Rahu:0.8,Ketu:0.8};
var SKY_MOON_PHASE=180;

/* ---------------------------------------------------------------------------
   Lane packing. Crowding is resolved by stacking inward, never by sliding a glyph
   along the ring: the bearing from the centre stays the graha's true longitude, so
   the wheel never lies about where anything is. A planet takes the outermost lane
   whose last occupant is far enough round the arc that the two discs cannot touch,
   and the separation needed is computed per lane, since the same gap in degrees is
   a much smaller gap in pixels on an inner lane.
   --------------------------------------------------------------------------- */
function skyLanes(list,radii,glyphR){
  var lastLon=[], out=[];
  list.forEach(function(p){
    var L=0;
    while(L<radii.length){
      var sep=(2*glyphR+6)/radii[L]*180/Math.PI;        // degrees of arc that clear two discs
      if(lastLon[L]==null || (p.lon-lastLon[L])>=sep) break;
      L++;
    }
    if(L>=radii.length) L=radii.length-1;
    lastLon[L]=p.lon;
    p.lane=L; p.r=radii[L];
    out.push(p);
  });
  return out;
}
function skyDM(lon){
  var d=lon%30, dg=Math.floor(d), mn=Math.round((d-dg)*60);
  if(mn===60){ mn=0; dg++; }
  return dg+"°"+(mn<10?"0":"")+mn+"′";
}

/* ---------------------------------------------------------------------------
   Static furniture — the rings that do not move. Shared by the printed wheel and
   the live one, so both always carry the same geometry.
   --------------------------------------------------------------------------- */
function skyFurniture(S,showNak){
  var cx=360,cy=360,o='';
  o+='<circle cx="360" cy="360" r="350" fill="#fbf8f0" stroke="#1d2340" stroke-width="2" class="sk-ground"/>';
  for(var s=0;s<12;s++){
    var a0=s*30;
    o+=skyWedge(cx,cy,300,350,a0,a0+30,SKY_ELEM[s],0.16,"sk-band sk-el"+(s%4));
    o+='<line x1="'+skyXY(cx,cy,300,a0)[0].toFixed(1)+'" y1="'+skyXY(cx,cy,300,a0)[1].toFixed(1)+
       '" x2="'+skyXY(cx,cy,350,a0)[0].toFixed(1)+'" y2="'+skyXY(cx,cy,350,a0)[1].toFixed(1)+
       '" stroke="#1d2340" stroke-width="1" class="sk-spoke"/>';
    var m=skyXY(cx,cy,325,a0+15);
    o+='<text x="'+m[0].toFixed(1)+'" y="'+(m[1]+2).toFixed(1)+'" class="sk-rasi">'+SA[s]+'</text>';
    var lm=skyXY(cx,cy,325,a0+24);
    o+='<text x="'+lm[0].toFixed(1)+'" y="'+(lm[1]+2).toFixed(1)+'" class="sk-lord">'+GL[LORD[s]]+'</text>';
  }
  /* Nakṣatras and pādas divide the actual ecliptic. A divisional chart is a derived
     circle, so drawing them there would imply a correspondence that classical practice
     does not make. They are shown for the rāśi chart only. */
  var seg=40/3;
  for(var n=0;showNak&&n<27;n++){
    var b0=n*seg;
    if(n%2===0) o+=skyWedge(cx,cy,252,300,b0,b0+seg,"#1d2340",0.05,"sk-nakband");
    o+='<line x1="'+skyXY(cx,cy,252,b0)[0].toFixed(1)+'" y1="'+skyXY(cx,cy,252,b0)[1].toFixed(1)+
       '" x2="'+skyXY(cx,cy,300,b0)[0].toFixed(1)+'" y2="'+skyXY(cx,cy,300,b0)[1].toFixed(1)+
       '" stroke="#8b8fa8" stroke-width="0.7" class="sk-nakdiv"/>';
    for(var q=1;q<4;q++){
      var t=b0+q*seg/4;
      o+='<line x1="'+skyXY(cx,cy,252,t)[0].toFixed(1)+'" y1="'+skyXY(cx,cy,252,t)[1].toFixed(1)+
         '" x2="'+skyXY(cx,cy,264,t)[0].toFixed(1)+'" y2="'+skyXY(cx,cy,264,t)[1].toFixed(1)+
         '" stroke="#b9bccd" stroke-width="0.5" class="sk-pada"/>';
    }
    var nm=skyXY(cx,cy,276,b0+seg/2);
    o+='<text x="'+nm[0].toFixed(1)+'" y="'+nm[1].toFixed(1)+'" class="sk-nak" transform="rotate('+
       (((b0+seg/2)>90&&(b0+seg/2)<270)?(180-(b0+seg/2)-90):(-(b0+seg/2)+90)).toFixed(1)+
       ' '+nm[0].toFixed(1)+' '+nm[1].toFixed(1)+')">'+SKY_NAKA[n]+'</text>';
  }
  o+='<circle cx="360" cy="360" r="252" fill="none" stroke="#1d2340" stroke-width="1" class="sk-inner"/>';
  // degree ticks every 10°
  for(var d=0;d<360;d+=10){
    var r0=(d%30===0)?232:242;
    o+='<line x1="'+skyXY(cx,cy,r0,d)[0].toFixed(1)+'" y1="'+skyXY(cx,cy,r0,d)[1].toFixed(1)+
       '" x2="'+skyXY(cx,cy,252,d)[0].toFixed(1)+'" y2="'+skyXY(cx,cy,252,d)[1].toFixed(1)+
       '" stroke="#c3c6d6" stroke-width="0.6" class="sk-tick"/>';
  }
  return o;
}
function skyAspectChords(plots,cx,cy,rad){
  if(SKY_ASPECT==="none") return "";
  var o='<g class="sk-asp">';
  plots.forEach(function(p){
    if(SKY_ASPECT!==p.en) return;
    var offs=SKY_ASPOFF[p.en]||[180], ben=!!SKY_BEN[p.en];
    offs.forEach(function(off){
      var a=skyXY(cx,cy,rad,p.lon), b=skyXY(cx,cy,rad,(p.lon+off)%360);
      o+='<line x1="'+a[0].toFixed(1)+'" y1="'+a[1].toFixed(1)+'" x2="'+b[0].toFixed(1)+
         '" y2="'+b[1].toFixed(1)+'" stroke="'+(ben?"#2f7d55":"#b5533c")+
         '" stroke-width="1.5" opacity="0.85"'+(off===180?'':' stroke-dasharray="5 4"')+'/>';
      var h=skyXY(cx,cy,rad-9,(p.lon+off)%360);
      o+='<circle cx="'+h[0].toFixed(1)+'" cy="'+h[1].toFixed(1)+'" r="3.2" fill="'+
         (ben?"#2f7d55":"#b5533c")+'"/>';
    });
  });
  return o+'</g>';
}
function skyAxisStr(deg,label,col){
  var p1=skyXY(360,360,252,deg), lp=skyXY(360,360,140,deg);
  return '<line x1="360" y1="360" x2="'+p1[0].toFixed(1)+'" y2="'+p1[1].toFixed(1)+
    '" stroke="'+col+'" stroke-width="2" stroke-dasharray="6 4"/>'+
    '<text x="'+lp[0].toFixed(1)+'" y="'+lp[1].toFixed(1)+'" class="sk-axis" fill="'+col+'">'+label+'</text>';
}
/* ---------------------------------------------------------------------------
   The printed / static wheel. One snapshot, no interaction. The pane uses the live
   renderer below instead, but both share the furniture and the lane packer so the
   paper and the screen never drift apart.
   --------------------------------------------------------------------------- */
var SKY_PRINT_R=[225,191,157,123];
function skyWheel(S){
  var cx=360,cy=360, o='';
  o+='<svg viewBox="0 0 720 720" class="skysvg" role="img" aria-label="Ecliptic wheel showing the rāśis, '+
     'nakṣatras, pādas and the grahas at their true longitudes"><title>Ecliptic wheel</title>';
  o+=skyFurniture(S,SKY_VARGA==="D1");
  o+='<circle cx="360" cy="360" r="120" fill="none" stroke="#d8d8e4" stroke-width="1"/>';
  o+=skyAxisStr(skyVargaLon(SKY_VARGA,S.lagna),"Lagna","#a1493a");
  if(SKY_VARGA==="D1") o+=skyAxisStr(S.mc,"MC","#3f6fa6");
  var VG=SKY_VARGA;
  var sorted=S.planets.map(function(p){
    return {en:p.en, lon:skyVargaLon(VG,p.sid), retro:!!p.retro};
  }).sort(function(a,b){return a.lon-b.lon;});
  o+=skyAspectChords(sorted,cx,cy,212);
  skyLanes(sorted,SKY_PRINT_R,13);
  sorted.forEach(function(p){
    var pt=skyXY(cx,cy,p.r,p.lon), tick=skyXY(cx,cy,250,p.lon), tin=skyXY(cx,cy,p.r+13,p.lon);
    o+='<line x1="'+tick[0].toFixed(1)+'" y1="'+tick[1].toFixed(1)+'" x2="'+tin[0].toFixed(1)+
       '" y2="'+tin[1].toFixed(1)+'" stroke="#1d2340" stroke-width="0.8"/>';
    o+='<circle cx="'+pt[0].toFixed(1)+'" cy="'+pt[1].toFixed(1)+'" r="13" fill="#fff" stroke="#1d2340" stroke-width="1"/>';
    o+='<text x="'+pt[0].toFixed(1)+'" y="'+(pt[1]+4).toFixed(1)+'" class="sk-pl">'+GL[p.en]+'</text>';
    if(p.retro) o+='<text x="'+(pt[0]+11).toFixed(1)+'" y="'+(pt[1]-8).toFixed(1)+'" class="sk-retro">R</text>';
    var dl=skyXY(cx,cy,p.r-20,p.lon);
    o+='<text x="'+dl[0].toFixed(1)+'" y="'+(dl[1]+3).toFixed(1)+'" class="sk-deg">'+skyDM(p.lon)+'</text>';
  });
  var vlag=skyVargaLon(SKY_VARGA,S.lagna);
  o+='<text x="360" y="316" class="sk-c1">'+(SKY_VARGA==="D1"?"ecliptic":esc(SKY_VARGA))+'</text>'+
     '<text x="360" y="334" class="sk-c2">'+(SKY_VARGA==="D1"?"sidereal · ":"varga lagna ")+
     SA[Math.floor(vlag/30)%12]+(SKY_VARGA==="D1"?" rising":"")+'</text>';
  o+='</svg>';
  return o;
}

/* ---------------------------------------------------------------------------
   The live wheel. Built once; afterwards only transforms and text change, so the
   browser never reparses the markup and the thing can actually play rather than
   step. Each graha keeps its own displayed radius and eases toward its lane, so a
   graha that changes lane glides in or out instead of snapping.
   --------------------------------------------------------------------------- */
var SKY_NS="http://www.w3.org/2000/svg";
var SKL=null;                       // live node cache, or null before the first mount
var SKY_NATAL=null;                 // natal positions, set by the pane
function sklEl(tag,attrs,parent){
  var n=document.createElementNS(SKY_NS,tag);
  for(var k in attrs) n.setAttribute(k,attrs[k]);
  if(parent) parent.appendChild(n);
  return n;
}
/* The tilt is part of the key because the furniture is markup built once: a
   change to it has to rebuild the wheel, not merely move what is in it. */
function skyLiveKey(){ return SKY_VARGA+"|"+(SKY_OPT.nakshatra?1:0)+"|"+(SKY_OPT.natal?1:0)+
  "|"+Math.round(SKY_OPT.tilt||0); }

/* Undo the group's vertical squash for each piece of lettering, about its own
   anchor point, so the wheel leans but the words do not become short and fat.
   translate(x,y) scale(1,1/kY) translate(-x,-y) leaves the anchor exactly where
   it was and stretches only the glyphs. At tilt 0 nothing is written at all,
   which is what keeps the flat wheel byte-identical to the one this replaced. */
function skyUnsquashText(g){
  var t=(SKY_OPT.tilt||0)*Math.PI/180;
  if(!SKY_OPT.tilt) return;
  var inv=1/Math.cos(t);
  var tx=g.querySelectorAll("text");
  for(var i=0;i<tx.length;i++){
    var x=parseFloat(tx[i].getAttribute("x")||0), y=parseFloat(tx[i].getAttribute("y")||0);
    /* PREPENDED, never assigned. The nakṣatra labels already carry a
       rotate() that lays each one along the ring, and setting the transform
       outright threw it away: tilted, all twenty-seven went horizontal while
       the rāśi labels — which have no rotation — looked fine, so the first
       version of this passed a test that only checked the rāśis. An SVG
       transform list applies right to left, so the unsquash goes in FRONT of
       whatever was already there. */
    var had=tx[i].getAttribute("transform")||"";
    tx[i].setAttribute("transform","translate("+x.toFixed(1)+","+y.toFixed(1)+
      ") scale(1,"+inv.toFixed(4)+") translate("+(-x).toFixed(1)+","+(-y).toFixed(1)+")"+
      (had?" "+had:""));
  }
}
/* THE TILT APPLIES TO THE WHOLE WHEEL, FURNITURE INCLUDED.
   It did not, and that was a real fault rather than a rough edge: the
   furniture — the rāśi wedges, their labels, the nakṣatra ring — was written
   into the <svg> root and the tilt group was created as its SIBLING, so
   raising the tilt squashed the grahas, the axes and the trails onto an
   ellipse while the rings that ARE the ecliptic plane stayed circular. Every
   graha was then drawn at a smaller radius than the wedge it belongs to, which
   at 40° is a visible fraction of a sign: the wheel misplaced grahas, and the
   report's own Sky tab has shipped that slider for as long as it has had one.

   The furniture is now built INSIDE the tilt group, so one transform carries
   the entire wheel and a graha cannot leave its rāśi. Two consequences handled
   below: the group's vertical squash would also squash the lettering, so each
   furniture text is counter-scaled about its own anchor; and the furniture is
   static markup made once at mount, so skyLiveKey now carries the tilt and a
   change to it remounts.

   This is an ORTHOGRAPHIC lean — the circle seen from far off, which is an
   ellipse — and not the perspective view sp-cosmos.js builds for the casting
   ceremony, where the near edge is larger than the far one. Perspective here
   would mean projecting every wedge corner per frame and depth-sorting the
   bodies, which is a rewrite of a renderer three production pages share. The
   lean is geometrically honest about where each graha is, which is the part
   that was wrong. */
function skyLiveMount(host,S){
  host.innerHTML='<svg viewBox="0 0 720 720" class="skysvg" role="img" aria-label="Ecliptic wheel: '+
    'the rāśis with each graha at its true longitude, animated through time">'+
    '<title>Ecliptic wheel</title>'+
    '<g class="sk-tilt">'+
    skyFurniture(S,SKY_VARGA==="D1"&&SKY_OPT.nakshatra)+'</g></svg>';
  var svg=host.firstChild;
  var tiltG=svg.querySelector("g.sk-tilt");            // the whole wheel lives in here
  skyUnsquashText(tiltG);
  var C={svg:svg,tilt:tiltG,key:skyLiveKey(),rad:{},natal:{},tran:{},trail:{},asp:{}};

  sklEl("circle",{cx:360,cy:360,r:120,fill:"none",stroke:"#d8d8e4","stroke-width":1,
    "class":"sk-core"},tiltG);
  if(SKY_OPT.natal){
    sklEl("circle",{cx:360,cy:360,r:142,fill:"none",stroke:"#cdd2e0","stroke-width":1,
      "stroke-dasharray":"3 5"},tiltG);
  }
  C.trailG=sklEl("g",{"class":"sk-trails"},tiltG);
  C.aspG=sklEl("g",{"class":"sk-asp"},tiltG);
  C.axisG=sklEl("g",{},tiltG);
  C.lagLine=sklEl("line",{x1:360,y1:360,stroke:"#a1493a","stroke-width":2,"stroke-dasharray":"6 4"},C.axisG);
  C.lagText=sklEl("text",{"class":"sk-axis",fill:"#a1493a"},C.axisG);
  C.lagText.textContent="Lagna";
  C.mcLine=sklEl("line",{x1:360,y1:360,stroke:"#3f6fa6","stroke-width":2,"stroke-dasharray":"6 4"},C.axisG);
  C.mcText=sklEl("text",{"class":"sk-axis",fill:"#3f6fa6"},C.axisG);
  C.mcText.textContent="MC";

  var NAMES=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"];
  // natal ring: smaller, quieter, no degree labels — it is a reference, not the subject
  var natG=sklEl("g",{"class":"sk-natal"},tiltG);
  NAMES.forEach(function(n){
    var g=sklEl("g",{},natG);
    var inner=sklEl("g",{},g);
    sklEl("circle",{cx:0,cy:0,r:11,fill:"#fbf8f0",stroke:"#9aa0b8","stroke-width":1},inner);
    var t=sklEl("text",{x:0,y:4,"text-anchor":"middle","class":"sk-plnat"},inner);
    t.textContent=GL[n];
    C.natal[n]={g:g,inner:inner,tick:sklEl("line",{stroke:"#c0c5d6","stroke-width":0.8},natG)};
  });
  // transit ring
  var tranG=sklEl("g",{"class":"sk-tran"},tiltG);
  NAMES.forEach(function(n){
    var tick=sklEl("line",{stroke:"#1d2340","stroke-width":0.8},tranG);
    var g=sklEl("g",{},tranG);
    var inner=sklEl("g",{},g);
    sklEl("circle",{cx:0,cy:0,r:13,fill:"#fff",stroke:"#1d2340","stroke-width":1},inner);
    var t=sklEl("text",{x:0,y:4,"text-anchor":"middle","class":"sk-pl"},inner);
    t.textContent=GL[n];
    var rr=sklEl("text",{x:11,y:-8,"text-anchor":"middle","class":"sk-retro",opacity:0},inner);
    rr.textContent="R";
    var ar=sklEl("line",{stroke:"#5a6a80","stroke-width":1.6,opacity:0,"marker-end":""},inner);
    var dg=sklEl("text",{x:0,y:0,"text-anchor":"middle","class":"sk-deg"},g);
    /* the lit surface, and the name under it. Both live in `inner` so the
       tilt's counter-scale applies to them exactly as it does to the disc.
       The label is NOT optional when the surface is showing: the first build
       of this drew nine unlabelled spheres, and a sphere does not say which
       graha it is the way "Ma" does. */
    /* A hairline at the sprite's own edge. The Moon is drawn at its real
       phase, so near a new Moon its surface is almost entirely unlit — an
       honest black disc that on a cream wheel simply cannot be seen. The ring
       gives every surface a locatable boundary without painting light onto a
       body that has none, which a brightened disc would. */
    var ha=sklEl("circle",{cx:0,cy:0,r:0,fill:"none",opacity:0,"class":"sk-arthalo"},inner);
    var im=sklEl("image",{x:0,y:0,width:0,height:0,opacity:0,"class":"sk-art"},inner);
    var al=sklEl("text",{x:0,y:0,"text-anchor":"middle","class":"sk-artlab",opacity:0},inner);
    al.textContent=GL[n];
    C.tran[n]={g:g,inner:inner,tick:tick,retro:rr,deg:dg,arrow:ar,
               circ:inner.firstChild,glyph:t,art:im,artlab:al,halo:ha};
    C.trail[n]=sklEl("path",{fill:"none","stroke-width":2,"stroke-linecap":"round",opacity:0.75},C.trailG);
    C.rad[n]=null;
  });
  C.c1=sklEl("text",{x:360,y:316,"text-anchor":"middle","class":"sk-c1"},tiltG);
  C.c2=sklEl("text",{x:360,y:334,"text-anchor":"middle","class":"sk-c2"},tiltG);
  SKL=C;
  return C;
}
var SKY_LIVE_R=[232,204,176,148];
/* Fewer lanes, further apart, when surfaces are drawn. The lane packer stacks
   crowded grahas INWARD, so four grahas at nearly one longitude land on four
   successive lanes — and 28px of lane spacing cannot hold a 38px sprite, which
   is why widening the packer's clearance alone changed nothing: the collision
   was radial, between lanes, not angular within one. 42px of spacing clears
   the largest surface (the Sun, 1.45 × 13 = 18.9 radius) with room for the
   caption. FOUR lanes, not three: with three, a fourth crowded graha clamps
   onto the last lane and is drawn directly on top of whatever is already
   there, which is how Guru and Ketu ended up sharing one disc and one
   caption. 36px of spacing with a 16px largest radius clears the discs; the
   caption is set BESIDE each surface rather than under it, because a caption
   hanging 26px below a disc reaches into the lane inside it whatever the
   spacing is. */
var SKY_LIVE_R_ART=[238,202,166,130];
var SKY_NATAL_R=[124,98,72];
/* longitude of a graha at an arbitrary instant, in whatever varga is showing —
   used by the trails, which need positions the snapshot does not carry */
function skyLonAt(en,date){
  var sid=window.__kSidAt(en,date);
  return sid==null?null:skyVargaLon(SKY_VARGA,sid);
}
function skyLiveSync(S,date,dt){
  var C=SKL; if(!C) return;
  /* the Moon at its real phase: the elongation from the Sun in this very
     snapshot, so the disc cannot disagree with the tithi derived from it */
  SKY_MOON_PHASE=(window.NSprite?window.NSprite.moonPhase(S):180);
  var cx=360, cy=360, VG=SKY_VARGA;
  var t=SKY_OPT.tilt*Math.PI/180, kY=Math.cos(t), lift=Math.sin(t)*SKY_OPT.latExag;
  C.tilt.setAttribute("transform", SKY_OPT.tilt?("translate(0,"+(cy*(1-kY)).toFixed(2)+") scale(1,"+kY.toFixed(4)+")"):"");
  var invY=SKY_OPT.tilt?(1/kY):1;

  /* Axes. With the natal ring showing, they start outside it rather than at the centre,
     so the dashes do not cut through the natal glyphs, and the labels sit in the gap
     between the two rings. */
  var r0=SKY_OPT.natal?146:0, rLab=SKY_OPT.natal?172:140;
  var lagL=skyVargaLon(VG,S.lagna);
  var a0=skyXY(cx,cy,r0,lagL), p1=skyXY(cx,cy,252,lagL), lp=skyXY(cx,cy,rLab,lagL);
  C.lagLine.setAttribute("x1",a0[0].toFixed(1)); C.lagLine.setAttribute("y1",a0[1].toFixed(1));
  C.lagLine.setAttribute("x2",p1[0].toFixed(1)); C.lagLine.setAttribute("y2",p1[1].toFixed(1));
  C.lagText.setAttribute("x",lp[0].toFixed(1)); C.lagText.setAttribute("y",lp[1].toFixed(1));
  var showMC=(VG==="D1");
  C.mcLine.setAttribute("opacity",showMC?1:0); C.mcText.setAttribute("opacity",showMC?1:0);
  if(showMC){
    var b0=skyXY(cx,cy,r0,S.mc), m1=skyXY(cx,cy,252,S.mc), mp=skyXY(cx,cy,rLab,S.mc);
    C.mcLine.setAttribute("x1",b0[0].toFixed(1)); C.mcLine.setAttribute("y1",b0[1].toFixed(1));
    C.mcLine.setAttribute("x2",m1[0].toFixed(1)); C.mcLine.setAttribute("y2",m1[1].toFixed(1));
    C.mcText.setAttribute("x",mp[0].toFixed(1)); C.mcText.setAttribute("y",mp[1].toFixed(1));
  }

  /* natal ring */
  var NAMES=Object.keys(C.tran);
  if(SKY_OPT.natal && SKY_NATAL){
    NAMES.forEach(function(n){ if(!SKY_OPT.show[n]){ C.natal[n].g.setAttribute("opacity",0);
      C.natal[n].tick.setAttribute("opacity",0); } });
    var nat=SKY_NATAL.filter(function(p){ return SKY_OPT.show[p.en]; })
                     .map(function(p){ return {en:p.en, lon:skyVargaLon(VG,p.sid)}; })
                     .sort(function(a,b){return a.lon-b.lon;});
    skyLanes(nat,SKY_NATAL_R,11);
    nat.forEach(function(p){
      var N=C.natal[p.en], pt=skyXY(cx,cy,p.r,p.lon);
      N.g.setAttribute("transform","translate("+pt[0].toFixed(1)+","+pt[1].toFixed(1)+")");
      N.inner.setAttribute("transform",SKY_OPT.tilt?("scale(1,"+invY.toFixed(4)+")"):"");
      N.g.setAttribute("opacity",1);
      var a=skyXY(cx,cy,142,p.lon), b=skyXY(cx,cy,p.r+11,p.lon);
      N.tick.setAttribute("x1",a[0].toFixed(1)); N.tick.setAttribute("y1",a[1].toFixed(1));
      N.tick.setAttribute("x2",b[0].toFixed(1)); N.tick.setAttribute("y2",b[1].toFixed(1));
      N.tick.setAttribute("opacity",1);
    });
  } else {
    NAMES.forEach(function(n){ C.natal[n].g.setAttribute("opacity",0);
      C.natal[n].tick.setAttribute("opacity",0); });
  }

  /* transit ring */
  var show=SKY_OPT.transit;
  NAMES.forEach(function(n){
    if(!SKY_OPT.show[n]){
      C.tran[n].g.setAttribute("opacity",0); C.tran[n].tick.setAttribute("opacity",0);
      C.trail[n].setAttribute("d","");
    }
  });
  var cur=S.planets.filter(function(p){ return SKY_OPT.show[p.en]; }).map(function(p){
    return {en:p.en, lon:skyVargaLon(VG,p.sid), lat:p.lat||0, retro:!!p.retro, speed:p.speed||0};
  }).sort(function(a,b){return a.lon-b.lon;});
  /* The lane packer clears two discs of the radius it is given. A surface is
     drawn larger than the lettered disc it replaced — the Sun at 1.45× — so
     passing 13 while drawing 19 let crowded grahas overlap again, which is
     the exact collision lanes exist to prevent. */
  var LANES=(SKY_OPT.art&&window.NSprite&&window.NSprite.ready())?SKY_LIVE_R_ART:SKY_LIVE_R;
  if(SKY_OPT.lanes) skyLanes(cur,LANES,SKY_OPT.art?19:13);
  else cur.forEach(function(p){ p.r=LANES[0]; p.lane=0; });
  // a graha with something directly inside it loses its degree label, which would print on top
  var occ=[];
  cur.forEach(function(p){
    if(p.lane>0 && occ[p.lane-1]) occ[p.lane-1].hasInner=true;
    occ[p.lane]=p;
  });
  var ease=(dt==null)?1:(1-Math.exp(-dt/320));
  cur.forEach(function(p){
    var N=C.tran[p.en];
    if(C.rad[p.en]==null) C.rad[p.en]=p.r;
    C.rad[p.en]+=(p.r-C.rad[p.en])*ease;
    var rr=C.rad[p.en];
    var yOff=SKY_OPT.tilt?(-p.lat*lift*2.2/kY):0;       // lift is applied before the group squash
    var pt=skyXY(cx,cy,rr,p.lon);
    N.g.setAttribute("transform","translate("+pt[0].toFixed(1)+","+(pt[1]+yOff).toFixed(1)+")");
    N.inner.setAttribute("transform",SKY_OPT.tilt?("scale(1,"+invY.toFixed(4)+")"):"");
    N.g.setAttribute("opacity",show?1:0);
    var t0=skyXY(cx,cy,250,p.lon), t1=skyXY(cx,cy,rr+13,p.lon);
    N.tick.setAttribute("x1",t0[0].toFixed(1)); N.tick.setAttribute("y1",t0[1].toFixed(1));
    N.tick.setAttribute("x2",t1[0].toFixed(1)); N.tick.setAttribute("y2",t1[1].toFixed(1));
    N.tick.setAttribute("opacity",show?1:0);
    /* surface or lettered disc, never both. href returns null when bodies.js
       is not loaded or a surface cannot be built, and the disc comes back. */
    var art=(SKY_OPT.art && window.NSprite && window.NSprite.ready())
      ? window.NSprite.href(p.en, 11*(SKY_ART_R[p.en]||1),
          p.en==="Moon"?SKY_MOON_PHASE:null)
      : null;
    if(art){
      var ar2=11*(SKY_ART_R[p.en]||1);
      N.art.setAttributeNS("http://www.w3.org/1999/xlink","href",art);
      N.art.setAttribute("href",art);
      N.art.setAttribute("x",(-ar2).toFixed(1)); N.art.setAttribute("y",(-ar2).toFixed(1));
      N.art.setAttribute("width",(2*ar2).toFixed(1));
      N.art.setAttribute("height",(2*ar2).toFixed(1));
      N.art.setAttribute("opacity",show?1:0);
      N.halo.setAttribute("r",ar2.toFixed(1));
      N.halo.setAttribute("opacity",show?1:0);
      /* The name and the degree go on ONE line under the surface, not two.
         Stacked, they collided — the degree text sits at a fixed y and the
         name landed on top of it, printing "¹Sa⁵⁰′". One line also keeps a
         26px sprite from carrying a two-line caption. */
      N.artlab.setAttribute("opacity",0);
      N.circ.setAttribute("opacity",0); N.glyph.setAttribute("opacity",0);
    } else {
      N.art.setAttribute("opacity",0); N.artlab.setAttribute("opacity",0);
      N.halo.setAttribute("opacity",0);
      N.circ.setAttribute("opacity",1); N.glyph.setAttribute("opacity",1);
    }
    N.retro.setAttribute("opacity",(show&&SKY_OPT.retro&&p.retro)?1:0);
    /* With a surface showing, the lettered disc is gone and this caption is
       the only thing naming the graha, so the name is always printed and the
       degree joins it when asked for. */
    var degTxt=(show&&SKY_OPT.degrees&&!p.hasInner)?skyDM(p.lon):"";
    N.deg.textContent=art?(GL[p.en]+(degTxt?" "+degTxt:"")):degTxt;
    N.deg.setAttribute("class",art?"sk-artlab":"sk-deg");
    if(art){
      /* beside, not below: the group is translated but never rotated, so
         "below" is screen-down at every longitude and reaches straight into
         the next lane in */
      /* Below, centred. Beside was tried both ways and neither works: set to
         one side it crosses back over the wheel for half the grahas, and
         flipped with the hemisphere it runs outward into the rāśi ring, which
         is only 12px beyond the outermost lane. Below has one cost — it
         reaches toward the lane inside — and that cost is paid by dropping the
         DEGREE from a crowded graha, keeping the two-letter name, which fits.
         hasInner is the renderer's own flag for "something occupies the next
         lane in at this longitude", already computed for exactly this. */
      N.deg.setAttribute("x",0);
      N.deg.setAttribute("text-anchor","middle");
      var degY=11*(SKY_ART_R[p.en]||1)+9;
      N.deg.setAttribute("y",(SKY_OPT.tilt?(degY*invY):degY).toFixed(1));
    } else {
      N.deg.setAttribute("x",0);
      N.deg.setAttribute("text-anchor","middle");
      N.deg.setAttribute("y",(SKY_OPT.tilt?(20*invY):20).toFixed(1));
    }
    if(SKY_OPT.speed && show){
      // direction and pace: the arrow points the way the graha is going, length by speed
      var k=Math.max(-1,Math.min(1,p.speed/1.2)), len=8+Math.abs(k)*12;
      N.arrow.setAttribute("x1",0); N.arrow.setAttribute("y1",-17);
      N.arrow.setAttribute("x2",(k>=0?len:-len).toFixed(1)); N.arrow.setAttribute("y2",-17);
      N.arrow.setAttribute("stroke",p.retro?"#b5533c":"#2f7d55");
      N.arrow.setAttribute("opacity",1);
    } else N.arrow.setAttribute("opacity",0);
  });

  /* trails */
  if(SKY_OPT.trail && show && date && window.__kSidAt){
    var steps=36, span=SKY_OPT.trailDays;
    cur.forEach(function(p){
      var pts=[], ok=true;
      for(var i=steps;i>=0;i--){
        var d=new Date(date.getTime()-i*span/steps*86400000);
        var L=skyLonAt(p.en,d); if(L==null){ ok=false; break; }
        var q=skyXY(cx,cy,C.rad[p.en]-16,L);
        pts.push((pts.length?"L":"M")+q[0].toFixed(1)+","+q[1].toFixed(1));
      }
      C.trail[p.en].setAttribute("d",ok?pts.join(" "):"");
      C.trail[p.en].setAttribute("stroke",p.retro?"#b5533c":"#8a6f3a");
      C.trail[p.en].setAttribute("opacity",0.7);
    });
  } else {
    NAMES.forEach(function(n){ C.trail[n].setAttribute("d",""); });
  }

  /* aspects */
  while(C.aspG.firstChild) C.aspG.removeChild(C.aspG.firstChild);
  if(SKY_ASPECT!=="none" && show && SKY_OPT.show[SKY_ASPECT]){
    var sel=null;
    cur.forEach(function(p){ if(p.en===SKY_ASPECT) sel=p; });
    if(sel){
      var offs=SKY_ASPOFF[sel.en]||[180], ben=!!SKY_BEN[sel.en];
      offs.forEach(function(off){
        var a=skyXY(cx,cy,212,sel.lon), b=skyXY(cx,cy,212,(sel.lon+off)%360);
        sklEl("line",{x1:a[0].toFixed(1),y1:a[1].toFixed(1),x2:b[0].toFixed(1),y2:b[1].toFixed(1),
          stroke:ben?"#2f7d55":"#b5533c","stroke-width":1.5,opacity:0.85,
          "stroke-dasharray":off===180?"none":"5 4"},C.aspG);
        var h=skyXY(cx,cy,203,(sel.lon+off)%360);
        sklEl("circle",{cx:h[0].toFixed(1),cy:h[1].toFixed(1),r:3.2,
          fill:ben?"#2f7d55":"#b5533c"},C.aspG);
      });
    }
  }

  C.c1.textContent=(VG==="D1"?"ecliptic":VG);
  C.c2.textContent=(VG==="D1"?"sidereal · ":"varga lagna ")+
    SA[Math.floor(lagL/30)%12]+(VG==="D1"?" rising":"");
}
/* mount if the structure changed, otherwise just move things */
function skyLiveDraw(host,S,date,dt){
  if(!SKL || SKL.svg.parentNode!==host || SKL.key!==skyLiveKey()){ skyLiveMount(host,S); dt=null; }
  skyLiveSync(S,date,dt);
}

function skyDome(S){
  var cx=360,cy=330,R=300,o='';
  o+='<svg viewBox="0 0 720 660" class="skysvg" role="img" aria-label="All-sky view from the birth place: '+
     'zenith at the centre, horizon at the rim"><title>Local sky</title>';
  var sunUp=S.planets.filter(function(p){return p.en==="Sun";})[0];
  var day=sunUp&&sunUp.hz&&sunUp.hz.alt>0;
  if(typeof SWH_PRINT!=="undefined" && SWH_PRINT) day=true;   // paper gets the light sky
  o+='<circle cx="360" cy="330" r="300" fill="'+(day?"#dce8f5":"#161a2e")+'" stroke="#1d2340" stroke-width="2"/>';
  [30,60].forEach(function(alt){
    var r=R*(90-alt)/90;
    o+='<circle cx="360" cy="330" r="'+r.toFixed(1)+'" fill="none" stroke="'+(day?"#b9cbe0":"#39406a")+
       '" stroke-width="0.8" stroke-dasharray="4 5"/>'+
       '<text x="366" y="'+(330-r+12).toFixed(1)+'" class="sk-alt" fill="'+(day?"#7d92ad":"#6f78a8")+'">'+alt+'°</text>';
  });
  [["N",0],["E",90],["S",180],["W",270]].forEach(function(c){
    var a=(c[1]-90)*Math.PI/180, x=cx+(R+18)*Math.cos(a), y=cy+(R+18)*Math.sin(a);
    o+='<text x="'+x.toFixed(1)+'" y="'+(y+4).toFixed(1)+'" class="sk-card">'+c[0]+'</text>';
  });
  function hxy(alt,az){
    var r=R*(90-alt)/90, a=(az-90)*Math.PI/180;
    return [cx+r*Math.cos(a), cy+r*Math.sin(a)];
  }
  // ecliptic path across the sky
  var pts=[];
  for(var L=0;L<360;L+=3){
    var eq=skyEqOf(L,S), h=skyHorizonOf(eq,S);
    if(h && h.alt>-2) pts.push(hxy(h.alt,h.az));
  }
  if(pts.length>2){
    o+='<polyline points="'+pts.map(function(p){return p[0].toFixed(1)+","+p[1].toFixed(1);}).join(" ")+
       '" fill="none" stroke="'+(day?"#c2a35a":"#6d5f2f")+'" stroke-width="1.6" stroke-dasharray="3 4"/>';
  }
  var below=[], placed=[];
  S.planets.forEach(function(p){
    if(!p.hz){ return; }
    if(p.hz.alt<0){ below.push(p.en); return; }
    var q=hxy(p.hz.alt,p.hz.az);
    // nudge outward until this disc clears the ones already drawn
    for(var guard=0;guard<8;guard++){
      var clash=placed.some(function(o2){
        return Math.hypot(o2[0]-q[0],o2[1]-q[1])<31; });
      if(!clash) break;
      var ar=Math.atan2(q[1]-cy,q[0]-cx);
      q=[q[0]+Math.cos(ar)*32, q[1]+Math.sin(ar)*32];
    }
    placed.push(q);
    var col=(p.en==="Sun")?"#d8a13a":(p.en==="Moon")?"#e9e9f2":"#fff";
    o+='<circle cx="'+q[0].toFixed(1)+'" cy="'+q[1].toFixed(1)+'" r="14" fill="'+col+
       '" stroke="#1d2340" stroke-width="1"/>';
    o+='<text x="'+q[0].toFixed(1)+'" y="'+(q[1]+4).toFixed(1)+'" class="sk-pl">'+GL[p.en]+'</text>';
    if(p.retro) o+='<text x="'+(q[0]+12).toFixed(1)+'" y="'+(q[1]-9).toFixed(1)+'" class="sk-retro">R</text>';
    o+='<text x="'+q[0].toFixed(1)+'" y="'+(q[1]+27).toFixed(1)+'" class="sk-halt" fill="'+
       (day?"#5a6a80":"#8d95c2")+'">'+p.hz.alt.toFixed(0)+'°</text>';
  });
  o+='<text x="360" y="656" class="sk-c2">'+(day?"daytime — the Sun is above the horizon":"night")+
     (below.length?' · below the horizon: '+below.map(function(x){return GL[x];}).join(" "):"")+'</text>';
  o+='</svg>';
  return o;
}
/* helpers: sidereal longitude -> equatorial -> horizon, for the ecliptic trace */
function skyEqOf(sidLon,S){
  var R=Math.PI/180, trop=((sidLon+S.ayanamsa)%360+360)%360, eps=S.obliquity*R;
  var ra=Math.atan2(Math.sin(trop*R)*Math.cos(eps),Math.cos(trop*R))/R/15;
  var dec=Math.asin(Math.sin(trop*R)*Math.sin(eps))/R;
  return {ra:((ra%24)+24)%24, dec:dec};
}
function skyHorizonOf(eq,S){
  var R=Math.PI/180, H=(S.lst-eq.ra)*15*R, phi=S.lat*R, dec=eq.dec*R;
  var sinAlt=Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(H);
  var alt=Math.asin(Math.max(-1,Math.min(1,sinAlt)))/R;
  var az=Math.atan2(-Math.cos(dec)*Math.sin(H),
        Math.sin(dec)*Math.cos(phi)-Math.cos(dec)*Math.sin(phi)*Math.cos(H))/R;
  return {alt:alt, az:((az%360)+360)%360};
}
