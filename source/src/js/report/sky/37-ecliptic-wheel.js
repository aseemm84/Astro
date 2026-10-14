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
function skyWedge(cx,cy,r0,r1,a0,a1,fill,op){
  var p=[skyXY(cx,cy,r1,a0),skyXY(cx,cy,r1,a1),skyXY(cx,cy,r0,a1),skyXY(cx,cy,r0,a0)];
  var lg=(((a1-a0)%360+360)%360)>180?1:0;
  return '<path d="M'+p[0][0].toFixed(1)+','+p[0][1].toFixed(1)+
    ' A'+r1+','+r1+' 0 '+lg+' 1 '+p[1][0].toFixed(1)+','+p[1][1].toFixed(1)+
    ' L'+p[2][0].toFixed(1)+','+p[2][1].toFixed(1)+
    ' A'+r0+','+r0+' 0 '+lg+' 0 '+p[3][0].toFixed(1)+','+p[3][1].toFixed(1)+
    ' Z" fill="'+fill+'" fill-opacity="'+op+'"/>';
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
        Rahu:true,Ketu:true}
};

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
  o+='<circle cx="360" cy="360" r="350" fill="#fbf8f0" stroke="#1d2340" stroke-width="2"/>';
  for(var s=0;s<12;s++){
    var a0=s*30;
    o+=skyWedge(cx,cy,300,350,a0,a0+30,SKY_ELEM[s],0.16);
    o+='<line x1="'+skyXY(cx,cy,300,a0)[0].toFixed(1)+'" y1="'+skyXY(cx,cy,300,a0)[1].toFixed(1)+
       '" x2="'+skyXY(cx,cy,350,a0)[0].toFixed(1)+'" y2="'+skyXY(cx,cy,350,a0)[1].toFixed(1)+
       '" stroke="#1d2340" stroke-width="1"/>';
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
    if(n%2===0) o+=skyWedge(cx,cy,252,300,b0,b0+seg,"#1d2340",0.05);
    o+='<line x1="'+skyXY(cx,cy,252,b0)[0].toFixed(1)+'" y1="'+skyXY(cx,cy,252,b0)[1].toFixed(1)+
       '" x2="'+skyXY(cx,cy,300,b0)[0].toFixed(1)+'" y2="'+skyXY(cx,cy,300,b0)[1].toFixed(1)+
       '" stroke="#8b8fa8" stroke-width="0.7"/>';
    for(var q=1;q<4;q++){
      var t=b0+q*seg/4;
      o+='<line x1="'+skyXY(cx,cy,252,t)[0].toFixed(1)+'" y1="'+skyXY(cx,cy,252,t)[1].toFixed(1)+
         '" x2="'+skyXY(cx,cy,264,t)[0].toFixed(1)+'" y2="'+skyXY(cx,cy,264,t)[1].toFixed(1)+
         '" stroke="#b9bccd" stroke-width="0.5"/>';
    }
    var nm=skyXY(cx,cy,276,b0+seg/2);
    o+='<text x="'+nm[0].toFixed(1)+'" y="'+nm[1].toFixed(1)+'" class="sk-nak" transform="rotate('+
       (((b0+seg/2)>90&&(b0+seg/2)<270)?(180-(b0+seg/2)-90):(-(b0+seg/2)+90)).toFixed(1)+
       ' '+nm[0].toFixed(1)+' '+nm[1].toFixed(1)+')">'+SKY_NAKA[n]+'</text>';
  }
  o+='<circle cx="360" cy="360" r="252" fill="none" stroke="#1d2340" stroke-width="1"/>';
  // degree ticks every 10°
  for(var d=0;d<360;d+=10){
    var r0=(d%30===0)?232:242;
    o+='<line x1="'+skyXY(cx,cy,r0,d)[0].toFixed(1)+'" y1="'+skyXY(cx,cy,r0,d)[1].toFixed(1)+
       '" x2="'+skyXY(cx,cy,252,d)[0].toFixed(1)+'" y2="'+skyXY(cx,cy,252,d)[1].toFixed(1)+
       '" stroke="#c3c6d6" stroke-width="0.6"/>';
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
function skyLiveKey(){ return SKY_VARGA+"|"+(SKY_OPT.nakshatra?1:0)+"|"+(SKY_OPT.natal?1:0); }
function skyLiveMount(host,S){
  host.innerHTML='<svg viewBox="0 0 720 720" class="skysvg" role="img" aria-label="Ecliptic wheel: '+
    'the rāśis with each graha at its true longitude, animated through time">'+
    '<title>Ecliptic wheel</title>'+
    skyFurniture(S,SKY_VARGA==="D1"&&SKY_OPT.nakshatra)+'</svg>';
  var svg=host.firstChild;
  var tiltG=sklEl("g",{"class":"sk-tilt"},svg);        // everything that moves lives in here
  var C={svg:svg,tilt:tiltG,key:skyLiveKey(),rad:{},natal:{},tran:{},trail:{},asp:{}};

  sklEl("circle",{cx:360,cy:360,r:120,fill:"none",stroke:"#d8d8e4","stroke-width":1},tiltG);
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
    C.tran[n]={g:g,inner:inner,tick:tick,retro:rr,deg:dg,arrow:ar};
    C.trail[n]=sklEl("path",{fill:"none","stroke-width":2,"stroke-linecap":"round",opacity:0.75},C.trailG);
    C.rad[n]=null;
  });
  C.c1=sklEl("text",{x:360,y:316,"text-anchor":"middle","class":"sk-c1"},tiltG);
  C.c2=sklEl("text",{x:360,y:334,"text-anchor":"middle","class":"sk-c2"},tiltG);
  SKL=C;
  return C;
}
var SKY_LIVE_R=[232,204,176,148];
var SKY_NATAL_R=[124,98,72];
/* longitude of a graha at an arbitrary instant, in whatever varga is showing —
   used by the trails, which need positions the snapshot does not carry */
function skyLonAt(en,date){
  var sid=window.__kSidAt(en,date);
  return sid==null?null:skyVargaLon(SKY_VARGA,sid);
}
function skyLiveSync(S,date,dt){
  var C=SKL; if(!C) return;
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
  if(SKY_OPT.lanes) skyLanes(cur,SKY_LIVE_R,13);
  else cur.forEach(function(p){ p.r=SKY_LIVE_R[0]; p.lane=0; });
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
    N.retro.setAttribute("opacity",(show&&SKY_OPT.retro&&p.retro)?1:0);
    N.deg.textContent=(show&&SKY_OPT.degrees&&!p.hasInner)?skyDM(p.lon):"";
    N.deg.setAttribute("y",(SKY_OPT.tilt?(20*invY):20).toFixed(1));
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
