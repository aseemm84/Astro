/* What report/sky/37-ecliptic-wheel.js expects from the report's scope.

   The renderer is concatenated after this, unmodified, so this page and the
   report's Sky tab animate through one implementation of the wheel rather
   than two copies of a projection that would drift apart. 02-varga-lagna.js
   follows too, because the renderer calls vargaLagna for every varga other
   than D1 and that module is self-contained — importing it is cheaper and
   safer than restating its arithmetic here.

   GL, SA, LORD, esc and dm are copied rather than imported, because the
   alternative is dragging in the whole helpers slice for five lines.
   ecliptic-verify.mjs asserts each is character-identical to the report's,
   so a copy cannot rot without a test going red.

   Deliberately NOT supplied: MON, nakOf, SKY_PRINT_R and the rest of the
   report's helpers. MON and nakOf are reached only from skyStamp and
   skyRedraw — the report pane's own controller, which this page replaces and
   never calls — and SKY_PRINT_R only from skyWheel, the static print wheel,
   which this page does not draw. A stub would let a stray call render
   something subtly wrong; leaving them undefined makes it throw where a test
   can see it. */
var GL={Sun:"Su",Moon:"Mo",Mars:"Ma",Mercury:"Me",Jupiter:"Ju",Venus:"Ve",Saturn:"Sa",Rahu:"Ra",Ketu:"Ke"};
var SA=["Meṣa","Vṛṣabha","Mithuna","Karka","Siṃha","Kanyā","Tulā","Vṛścika","Dhanus","Makara","Kumbha","Mīna"];
/* the lord of each rāśi, in sign order; skyFurniture prints its glyph inside
   each wedge, so this is drawn content and not a stub */
var LORD=["Mars","Venus","Mercury","Moon","Sun","Mercury","Venus","Mars","Jupiter","Saturn","Saturn","Jupiter"];
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
/* dm and its dmFmt are lifted VERBATIM from report/core/01-helpers.js.
   ecliptic-verify and starwheel-verify assert this copy is
   character-identical to the report's, so the two cannot drift; editing
   one without the other fails those suites by design. */
function dmFmt(){
  try{ var S=window.NSettings&&window.NSettings.get(); return (S&&S.degfmt)||"dm"; }
  catch(e){ return "dm"; }
}
function dm(x){
  var f=dmFmt();
  if(f==="dec") return (Math.round(x*1e4)/1e4).toFixed(4)+"°";
  /* The default branch is the ORIGINAL expression, character for character,
     including its treatment of negatives: Math.floor(-5.5) is -6, so a
     latitude of -5.5 prints -6°30′. An earlier version of this "improved"
     that by taking the absolute value and prefixing a sign, which prints
     -5°30′ instead — a different number. ecliptic-verify and starwheel-verify
     both caught it, because ecliptic latitudes are negative. Whatever this
     convention is, it is the one every published figure was computed with,
     and a formatting setting is not licence to change it. */
  var d=Math.floor(x),m=Math.floor((x-d)*60);
  if(f==="dms"){
    var sec=Math.round(((x-d)*60-m)*60);
    if(sec===60){sec=0;m++;}
    if(m===60){m=0;d++;}
    return d+"°"+(m<10?"0":"")+m+"′"+(sec<10?"0":"")+sec+"″";
  }
  return d+"°"+(m<10?"0":"")+m+"′";
}
;

/* ---------- divisional chart lagnas (formulas verified against engine positions) ---------- */
function vargaLagna(code,sid){
  var s=Math.floor(sid/30)%12,d=sid-s*30,odd=(s%2===0),M=s%3,p;
  switch(code){
    case "D1": return s;
    case "D2": var h=(d<15)?0:1; return odd?(h===0?4:3):(h===0?3:4);
    case "D3": return (s+[0,4,8][Math.floor(d/10)])%12;
    case "D4": return (s+[0,3,6,9][Math.floor(d/7.5)])%12;
    case "D7": p=Math.floor(d/(30/7)); return odd?(s+p)%12:(s+6+p)%12;
    case "D9": return Math.floor(sid/(30/9))%12;
    case "D10": p=Math.floor(d/3); return odd?(s+p)%12:(s+8+p)%12;
    case "D12": return (s+Math.floor(d/2.5))%12;
    case "D16": return ([0,4,8][M]+Math.floor(d/1.875))%12;
    case "D20": return ([0,8,4][M]+Math.floor(d/1.5))%12;
    case "D24": return ((odd?4:3)+Math.floor(d/1.25))%12;
    case "D27": return ([0,3,6,9][s%4]+Math.floor(d/(30/27)))%12;
    case "D30":
      if(odd){ if(d<5)return 0; if(d<10)return 10; if(d<18)return 8; if(d<25)return 2; return 6; }
      if(d<5)return 1; if(d<12)return 5; if(d<20)return 11; if(d<25)return 9; return 7;
    case "D40": return ((odd?0:6)+Math.floor(d/0.75))%12;
    case "D45": return ([0,4,8][M]+Math.floor(d/(30/45)))%12;
    case "D60": return (s+Math.floor(d*2))%12;
  }
  return null;
}
var CRUX={D1:[1,"the life as a whole"],D2:[2,"wealth & sustenance"],D3:[3,"siblings & courage"],
 D4:[4,"home, land & property"],D7:[5,"children"],D9:[7,"spouse & dharma"],D10:[10,"profession"],
 D12:[4,"parents"],D16:[4,"vehicles & comforts"],D20:[5,"spiritual practice"],D24:[5,"learning"],
 D27:[1,"vitality & strength"],D30:[6,"adversity & health"],D40:[4,"maternal legacy"],
 D45:[9,"paternal legacy & conduct"],D60:[1,"the karmic totality"]};


/* Exposed for the suite, which asserts that this and the engine's own
   vargaSign agree across the whole zodiac in all sixteen divisions. Two
   copies of the same formulas need a check that they have not drifted,
   and a check that cannot reach one of them is not a check. */
try{ window.__vargaLagna=vargaLagna; }catch(e){}
;

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
;

/* ecliptic.html — the ecliptic wheel, animated, for any moment and any place.
 *
 * WHAT IS REUSED AND WHY. The wheel is drawn and animated by skyLiveDraw(),
 * the SAME function the report's Sky tab uses: build.py concatenates
 * report/sky/37-ecliptic-wheel.js into this bundle rather than this file
 * carrying a second copy. It was already written to be driven from outside —
 * skyLiveMount builds the nodes once and skyLiveSync only moves them — so it
 * needed no change to be used from here; only its report-page controller
 * (skyPane, skyRedraw, skyStateAt) is left unused, and this file replaces it.
 *
 * report/core/02-varga-lagna.js is concatenated too, because the renderer
 * calls vargaLagna for every varga other than D1.
 *
 * WHAT MAKES IT CHART-INDEPENDENT. The sky comes from window.quickSky, which
 * wants a moment and a place and nothing else. The renderer's only natal
 * ingredient is SKY_NATAL, a ring of birth positions the report's pane sets;
 * this page leaves it null and SKY_OPT.natal false, so the inner ring is
 * simply never asked for. No chart is read, and clearing localStorage changes
 * nothing here — which ecliptic-verify asserts, because "it happens not to
 * read a chart today" and "it cannot read a chart" are different claims.
 *
 * Nothing here touches the network. Every script it pulls is local.
 */
(function () {
  "use strict";

  var host = document.getElementById("echost");
  if (!host) return;

  var $ = function (id) { return document.getElementById(id); };

  var S = {
    base: null,        /* the target moment, ms */
    place: null,
    /* the settings panel's ayanāṃśa, so this page and a chart agree */
    ayan: (function () { try { var N = window.NSettings && window.NSettings.get();
      return (N && N.ayan) || "samanvaya_ecliptic"; } catch (e) { return "samanvaya_ecliptic"; } })(),
    span: 43830,       /* minutes either side of the target */
    rate: 1,
    offset: 0,         /* minutes from the target, where the wheel currently is */
    playing: false,
    raf: null, last: null
  };

  /* ---- the scripts this page needs, pulled only once it is wanted ------- */
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
          '</code>. The page needs it to compute anything, and it is served ' +
          'from beside this file.</p>';
      };
      document.head.appendChild(s);
    })();
  }

  /* ---- time -------------------------------------------------------------
     Every instant is built from the chosen date, the chosen time and the
     place's own offset, never from the reader's machine clock, so the same
     settings show the same sky wherever the page is opened. */
  function tz() { return (S.place && S.place.tz) || 0; }
  function dayStr(ms) {
    var d = new Date(ms + tz() * 3600000);
    return d.getUTCFullYear() + "-" +
      String(d.getUTCMonth() + 1).padStart(2, "0") + "-" +
      String(d.getUTCDate()).padStart(2, "0");
  }
  function timeStr(ms) {
    var d = new Date(ms + tz() * 3600000);
    return String(d.getUTCHours()).padStart(2, "0") + ":" +
           String(d.getUTCMinutes()).padStart(2, "0");
  }
  function baseFromFields() {
    var dv = /^(\d{4})-(\d{2})-(\d{2})$/.exec(($("ec-date") || {}).value || "");
    var tv = /^(\d{1,2}):(\d{2})/.exec(($("ec-time") || {}).value || "12:00");
    if (!dv) return S.base;
    var mins = (tv ? +tv[1] : 12) * 60 + (tv ? +tv[2] : 0);
    return Date.UTC(+dv[1], +dv[2] - 1, +dv[3]) + mins * 60000 - tz() * 3600000;
  }
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
             "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function stampOf(ms) {
    var d = new Date(ms + tz() * 3600000);
    return String(d.getUTCDate()).padStart(2, "0") + " " + MON[d.getUTCMonth()] +
      " " + d.getUTCFullYear() + " · " +
      String(d.getUTCHours()).padStart(2, "0") + ":" +
      String(d.getUTCMinutes()).padStart(2, "0");
  }
  /* The offset in whatever unit reads naturally at its size. Minutes all the
     way up would print "+525960 min", which is a number nobody can hold. */
  function offLabel(off) {
    if (!off) return "at the target moment";
    var a = Math.abs(off), s = off > 0 ? "+" : "−";
    var t = a < 120 ? Math.round(a) + " min"
          : a < 2880 ? (a / 60).toFixed(1) + " hours"
          : a < 43830 ? (a / 1440).toFixed(1) + " days"
          : a < 525960 ? (a / 43830).toFixed(1) + " months"
          : (a / 525960).toFixed(2) + " years";
    return s + t + " from the target";
  }
  function esc2(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ---- the sky at the current offset ------------------------------------ */
  function skyAt(off) {
    var ms = S.base + off * 60000;
    var d = new Date(ms + tz() * 3600000);
    return {
      ms: ms,
      sky: window.quickSky({
        year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
        hour: d.getUTCHours(), minute: d.getUTCMinutes(), second: d.getUTCSeconds(),
        tzHours: tz(), lat: S.place.lat, lon: S.place.lon, ayanamsa: S.ayan
      })
    };
  }

  /* ---- draw -------------------------------------------------------------
     dt is the milliseconds since the previous frame while playing and null
     otherwise; the renderer uses it to ease a graha toward a new lane instead
     of snapping it there, so a scrub and a play look different on purpose. */
  function draw(dt) {
    if (!window.quickSky || !S.place || S.base == null) return;
    var st = skyAt(S.offset);
    if (!st.sky) { host.innerHTML = '<p class="swfail">Could not compute that moment.</p>'; return; }
    /* The natal ring is what would make this chart-dependent, so it is off and
       its source is null. Set here rather than once at boot because the
       renderer is shared and the report's pane sets both the other way. */
    window.SKY_NATAL = null;
    window.SKY_OPT.natal = false;
    skyLiveDraw(host, st.sky, st.sky.date, dt == null ? null : dt);

    var stamp = $("ec-stamp");
    if (stamp) stamp.textContent = stampOf(st.ms) + " · " + S.place.n;
    var off = $("ec-off");
    if (off) off.textContent = offLabel(S.offset);
    var sc = $("ec-scrub");
    if (sc && document.activeElement !== sc) {
      sc.value = String(Math.round(1000 * S.offset / S.span));
    }
    facts(st.sky);
  }

  /* The line under the wheel. Deliberately the quantities that change as it
     plays — lagna, MC and what is retrograde — rather than a restatement of
     the controls. Rāhu and Ketu are always retrograde by construction, so
     listing them among the retrogrades every single frame says nothing. */
  function facts(sky) {
    var el = $("ec-facts");
    if (!el) return;
    var retro = sky.planets.filter(function (p) {
      return p.retro && p.en !== "Rahu" && p.en !== "Ketu";
    }).map(function (p) { return p.en; });
    el.innerHTML =
      "Lagna " + esc2(SA[Math.floor(sky.lagna / 30) % 12]) + " " + dm(sky.lagna % 30) +
      " &nbsp;·&nbsp; MC " + esc2(SA[Math.floor(sky.mc / 30) % 12]) + " " + dm(sky.mc % 30) +
      " &nbsp;·&nbsp; " + (retro.length
        ? "retrograde: " + esc2(retro.join(", "))
        : "nothing retrograde");
  }

  /* ---- the transport -----------------------------------------------------
     Play walks the offset from one end of the span to the other in a fixed
     wall-clock time, so a wider span simply moves faster through the sky
     rather than taking proportionally longer to watch. It stops at the far
     end rather than looping: a loop makes the return journey look like a
     motion the sky does not have. */
  var SWEEP_MS = 24000;
  function tick(now) {
    if (!S.playing) return;
    var dt = S.last == null ? 0 : now - S.last;
    S.last = now;
    S.offset += (2 * S.span) * (dt / SWEEP_MS) * S.rate;
    if (S.offset >= S.span) { S.offset = S.span; stop(); draw(null); return; }
    draw(dt);
    S.raf = requestAnimationFrame(tick);
  }
  function play() {
    if (S.playing) return stop();
    if (S.offset >= S.span) S.offset = -S.span;
    S.playing = true; S.last = null;
    var b = document.querySelector('[data-ec="play"]');
    if (b) b.textContent = "Pause";
    S.raf = requestAnimationFrame(tick);
  }
  function stop() {
    S.playing = false;
    if (S.raf) cancelAnimationFrame(S.raf);
    S.raf = null;
    var b = document.querySelector('[data-ec="play"]');
    if (b) b.textContent = "Play";
  }

  /* ---- the switches ------------------------------------------------------
     Built from SKY_OPT itself rather than from a list written out here, so a
     switch cannot exist in the markup without a setting behind it, or the
     other way round. */
  var SWITCH = [
    ["nakshatra", "Nakṣatras & pādas"],
    ["degrees", "Degrees"],
    ["retro", "Retrograde mark"],
    ["speed", "Speed arrows"],
    ["lanes", "Separate crowded grahas"],
    ["art", "Graha surfaces"]
  ];
  var GRAHAS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn",
                "Rahu", "Ketu"];
  function toggles() {
    var box = $("ec-toggles");
    if (!box || box.firstChild) return;
    var h = SWITCH.map(function (s) {
      return '<label class="swchk"><input type="checkbox" data-opt="' + s[0] + '"' +
        (window.SKY_OPT[s[0]] ? " checked" : "") + "> " + esc2(s[1]) + "</label>";
    }).join("");
    h += '<span class="swsp"></span>';
    h += GRAHAS.map(function (n) {
      return '<label class="swchk"><input type="checkbox" data-graha="' + n + '"' +
        (window.SKY_OPT.show[n] ? " checked" : "") + "> " + esc2(n) + "</label>";
    }).join("");
    box.innerHTML = h;
  }

  function fillSelects() {
    var a = $("ec-ayan");
    if (a && window.__ayanModes && !a.options.length) {
      var M = window.__ayanModes;
      a.innerHTML = Object.keys(M).map(function (k) {
        return '<option value="' + esc2(k) + '"' + (k === S.ayan ? " selected" : "") +
          ">" + esc2(M[k].name) + "</option>";
      }).join("");
    }
    var v = $("ec-varga");
    /* CRUX comes in with 02-varga-lagna.js and carries the divisions this
       engine actually computes, each with what it is read for, so the list
       cannot offer a varga the renderer would not know how to place. */
    if (v && typeof CRUX !== "undefined" && !v.options.length) {
      v.innerHTML = Object.keys(CRUX).map(function (k) {
        return '<option value="' + esc2(k) + '"' + (k === "D1" ? " selected" : "") +
          ">" + esc2(k) + " — " + esc2(CRUX[k][1]) + "</option>";
      }).join("");
    }
  }

  function bind() {
    var bar = document.body;
    bar.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-ec]") : null;
      if (!b) return;
      var k = b.getAttribute("data-ec");
      if (k === "play") play();
      else if (k === "back") { stop(); S.offset = -S.span; draw(null); }
      else if (k === "mid") { stop(); S.offset = 0; draw(null); }
      else if (k === "now") {
        stop();
        S.base = Date.now(); S.offset = 0;
        var d = $("ec-date"), t = $("ec-time");
        if (d) d.value = dayStr(S.base);
        if (t) t.value = timeStr(S.base);
        draw(null);
      } else if (k === "step") {
        stop();
        S.offset = Math.max(-S.span, Math.min(S.span,
          S.offset + (+b.getAttribute("data-k") || 1) * S.span / 50));
        draw(null);
      }
    });
    bar.addEventListener("change", function (e) {
      var t = e.target;
      if (!t.id && !t.dataset.opt && !t.dataset.graha) return;
      if (t.id === "ec-date" || t.id === "ec-time") {
        stop(); S.base = baseFromFields(); S.offset = 0; draw(null);
      } else if (t.id === "ec-ayan") { S.ayan = t.value; draw(null); }
      else if (t.id === "ec-theme") {
        /* The palette is CSS, scoped to [data-wtheme] on the host, so nothing
           is redrawn: the renderer's inline fills are presentation attributes
           and a CSS rule outranks them. An empty value removes the attribute
           and the page falls back to the site theme. */
        if (t.value) host.setAttribute("data-wtheme", t.value);
        else host.removeAttribute("data-wtheme");
      }
      else if (t.id === "ec-span") {
        /* Keep where we are in the span proportionally, rather than keeping the
           offset in minutes: widening the span would otherwise leave the wheel
           apparently at the target when it is nowhere near it. */
        var f = S.span ? S.offset / S.span : 0;
        S.span = +t.value || 43830;
        S.offset = f * S.span;
        draw(null);
      }
      else if (t.id === "ec-rate") { S.rate = +t.value || 1; }
      else if (t.id === "ec-varga") { window.SKY_VARGA = t.value; draw(null); }
      else if (t.id === "ec-asp") { window.SKY_ASPECT = t.value; draw(null); }
      else if (t.dataset.opt) { window.SKY_OPT[t.dataset.opt] = t.checked; draw(null); }
      else if (t.dataset.graha) { window.SKY_OPT.show[t.dataset.graha] = t.checked; draw(null); }
    });
    bar.addEventListener("input", function (e) {
      var t = e.target;
      if (t.id === "ec-scrub") {
        stop();
        S.offset = (+t.value / 1000) * S.span;
        draw(null);
      } else if (t.id === "ec-tilt") {
        window.SKY_OPT.tilt = +t.value || 0; draw(null);
      } else if (t.id === "ec-trail") {
        var pc = +t.value || 0;
        window.SKY_OPT.trail = pc > 0;
        /* The trail is expressed in days, and the span is in minutes, so the
           slider is a percentage of the span rather than a day count: at a
           ±30-year span a 90-day trail would be a dot. */
        window.SKY_OPT.trailDays = Math.max(0.02, (pc / 100) * (S.span / 1440));
        draw(null);
      } else return;
    });
    /* Playing while the tab is hidden burns the reader's battery to draw
       frames nobody is looking at, and rAF pauses anyway, which would make the
       sweep jump on return. */
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
    });
  }

  need([
    { src: "engine.js", have: function () { return !!window.quickSky; } },
    { src: "panchanga.js", have: function () { return !!(window.NP && window.NP.day); } },
    { src: "places.js", have: function () { return !!window.NPlaces; } },
    /* the lit graha surfaces, last so the wheel is on screen with lettered
       discs before the 44 KB of surface renderer arrives */
    { src: "bodies.js", have: function () { return !!window.NSprite; } }
  ], function () {
    S.place = (window.NP.savedPlace && window.NP.savedPlace()) ||
              (window.NP.PLACES && window.NP.PLACES[0]) ||
              { n: "Ujjain", lat: 23.1765, lon: 75.7885, tz: 5.5 };
    var ph = $("ec-place");
    if (ph && window.NPlaces.picker) {
      var quick = [S.place].concat(window.NP.PLACES || []);
      window.NPlaces.picker({
        host: ph, value: S.place, quick: quick, label: "Place",
        refMs: function () { return S.base || Date.now(); },
        onPick: function (p) {
          /* The offset is minutes from the target and the target is a wall
             clock reading in the place's own zone, so the base is rebuilt from
             the fields rather than kept: moving from Abu Dhabi to Delhi should
             keep noon at noon, not shift it by an hour and a half. */
          stop(); S.place = p; S.base = baseFromFields(); draw(null);
        }
      });
    }
    S.base = Date.now();
    var d = $("ec-date"), t = $("ec-time");
    if (d) {
      d.value = dayStr(S.base);
      if (window.NP.RANGE) {
        d.min = window.NP.RANGE.min + "-01-01";
        d.max = window.NP.RANGE.max + "-12-31";
      }
    }
    if (t) t.value = timeStr(S.base);
    var sp = $("ec-span");
    if (sp) S.span = +sp.value || 43830;
    window.SKY_VARGA = "D1";
    window.SKY_ASPECT = "none";
    window.SKY_OPT.natal = false;
    window.SKY_OPT.art = true;      /* this page draws surfaces; the report does not */
    window.SKY_OPT.trail = false;
    /* Opens flat, which is the chart convention; the slider leans the whole
       wheel, furniture included, so a graha cannot leave its rāśi. */
    window.SKY_OPT.tilt = 0;
    window.SKY_NATAL = null;
    fillSelects();
    toggles();
    bind();
    draw(null);
  });
})();
;
