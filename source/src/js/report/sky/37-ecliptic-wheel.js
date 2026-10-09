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
function skyWedge(cx,cy,r0,r1,a0,a1,fill,op){
  var p=[skyXY(cx,cy,r1,a0),skyXY(cx,cy,r1,a1),skyXY(cx,cy,r0,a1),skyXY(cx,cy,r0,a0)];
  var lg=(((a1-a0)%360+360)%360)>180?1:0;
  return '<path d="M'+p[0][0].toFixed(1)+','+p[0][1].toFixed(1)+
    ' A'+r1+','+r1+' 0 '+lg+' 0 '+p[1][0].toFixed(1)+','+p[1][1].toFixed(1)+
    ' L'+p[2][0].toFixed(1)+','+p[2][1].toFixed(1)+
    ' A'+r0+','+r0+' 0 '+lg+' 1 '+p[3][0].toFixed(1)+','+p[3][1].toFixed(1)+
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
function skyAspectChords(plots,cx,cy,rad){
  if(SKY_ASPECT==="none") return "";
  var o='<g class="sk-asp">';
  plots.forEach(function(p){
    if(SKY_ASPECT!==p.en) return;
    var offs=SKY_ASPOFF[p.en]||[180], ben=!!SKY_BEN[p.en], only=true;
    offs.forEach(function(off){
      var a=skyXY(cx,cy,rad,p.sid), b=skyXY(cx,cy,rad,(p.sid+off)%360);
      o+='<line x1="'+a[0].toFixed(1)+'" y1="'+a[1].toFixed(1)+'" x2="'+b[0].toFixed(1)+
         '" y2="'+b[1].toFixed(1)+'" stroke="'+(ben?"#2f7d55":"#b5533c")+
         '" stroke-width="'+(only?1.5:0.7)+'" opacity="'+(only?0.85:0.3)+
         '"'+(off===180?'':' stroke-dasharray="5 4"')+'/>';
      if(only){
        var h=skyXY(cx,cy,rad-9,(p.sid+off)%360);
        o+='<circle cx="'+h[0].toFixed(1)+'" cy="'+h[1].toFixed(1)+'" r="3.2" fill="'+
           (ben?"#2f7d55":"#b5533c")+'"/>';
      }
    });
  });
  return o+'</g>';
}
function skyWheel(S){
  var cx=360,cy=360,R=350, o='';
  o+='<svg viewBox="0 0 720 720" class="skysvg" role="img" aria-label="Ecliptic wheel showing the rāśis, '+
     'nakṣatras, pādas and the grahas at their true longitudes"><title>Ecliptic wheel</title>';
  o+='<circle cx="360" cy="360" r="350" fill="#fbf8f0" stroke="#1d2340" stroke-width="2"/>';
  // rashi ring
  for(var s=0;s<12;s++){
    var a0=s*30, a1=a0+30;
    o+=skyWedge(cx,cy,300,350,a0,a1,SKY_ELEM[s],0.16);
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
  for(var n=0;SKY_VARGA==="D1"&&n<27;n++){
    var b0=n*seg, b1=b0+seg;
    if(n%2===0) o+=skyWedge(cx,cy,252,300,b0,b1,"#1d2340",0.05);
    o+='<line x1="'+skyXY(cx,cy,252,b0)[0].toFixed(1)+'" y1="'+skyXY(cx,cy,252,b0)[1].toFixed(1)+
       '" x2="'+skyXY(cx,cy,300,b0)[0].toFixed(1)+'" y2="'+skyXY(cx,cy,300,b0)[1].toFixed(1)+
       '" stroke="#8b8fa8" stroke-width="0.7"/>';
    for(var q=1;q<4;q++){
      var t=b0+q*seg/4;
      o+='<line x1="'+skyXY(cx,cy,252,t)[0].toFixed(1)+'" y1="'+skyXY(cx,cy,252,t)[1].toFixed(1)+
         '" x2="'+skyXY(cx,cy,264,t)[0].toFixed(1)+'" y2="'+skyXY(cx,cy,264,t)[1].toFixed(1)+
         '" stroke="#b9bccd" stroke-width="0.5"/>';
    }
    var nm=skyXY(cx,cy,276,b0+seg/2), ang=-(b0+seg/2)+90;
    o+='<text x="'+nm[0].toFixed(1)+'" y="'+nm[1].toFixed(1)+'" class="sk-nak" transform="rotate('+
       (((b0+seg/2)>90&&(b0+seg/2)<270)?(180-(b0+seg/2)-90):(-(b0+seg/2)+90)).toFixed(1)+
       ' '+nm[0].toFixed(1)+' '+nm[1].toFixed(1)+')">'+SKY_NAKA[n]+'</text>';
  }
  o+='<circle cx="360" cy="360" r="252" fill="none" stroke="#1d2340" stroke-width="1"/>';
  o+='<circle cx="360" cy="360" r="120" fill="none" stroke="#d8d8e4" stroke-width="1"/>';
  // degree ticks every 10°
  for(var d=0;d<360;d+=10){
    var r0=(d%30===0)?232:242;
    o+='<line x1="'+skyXY(cx,cy,r0,d)[0].toFixed(1)+'" y1="'+skyXY(cx,cy,r0,d)[1].toFixed(1)+
       '" x2="'+skyXY(cx,cy,252,d)[0].toFixed(1)+'" y2="'+skyXY(cx,cy,252,d)[1].toFixed(1)+
       '" stroke="#c3c6d6" stroke-width="0.6"/>';
  }
  // lagna / MC axes
  function axis(deg,label,col){
    var p0=skyXY(cx,cy,0,deg), p1=skyXY(cx,cy,252,deg), lp=skyXY(cx,cy,140,deg);
    return '<line x1="360" y1="360" x2="'+p1[0].toFixed(1)+'" y2="'+p1[1].toFixed(1)+
      '" stroke="'+col+'" stroke-width="2" stroke-dasharray="6 4"/>'+
      '<text x="'+lp[0].toFixed(1)+'" y="'+lp[1].toFixed(1)+'" class="sk-axis" fill="'+col+'">'+label+'</text>';
  }
  o+=axis(skyVargaLon(SKY_VARGA,S.lagna),"Lagna","#a1493a");
  if(SKY_VARGA==="D1") o+=axis(S.mc,"MC","#3f6fa6");
  // planets, staggered outward when crowded
  var VG=SKY_VARGA;
  var sorted=S.planets.map(function(p){
    return {en:p.en, sid:skyVargaLon(VG,p.sid), retro:p.retro};
  }).sort(function(a,b){return a.sid-b.sid;});
  o+=skyAspectChords(sorted,cx,cy,212);
  var lastDeg=-99, lane=0;
  sorted.forEach(function(p){
    if(Math.abs(p.sid-lastDeg)<9) lane=(lane+1)%3; else lane=0;
    lastDeg=p.sid;
    var r=225-lane*34, pt=skyXY(cx,cy,r,p.sid), tick=skyXY(cx,cy,250,p.sid), tin=skyXY(cx,cy,r+12,p.sid);
    o+='<line x1="'+tick[0].toFixed(1)+'" y1="'+tick[1].toFixed(1)+'" x2="'+tin[0].toFixed(1)+
       '" y2="'+tin[1].toFixed(1)+'" stroke="#1d2340" stroke-width="0.8"/>';
    o+='<circle cx="'+pt[0].toFixed(1)+'" cy="'+pt[1].toFixed(1)+'" r="13" fill="#fff" stroke="#1d2340" stroke-width="1"/>';
    o+='<text x="'+pt[0].toFixed(1)+'" y="'+(pt[1]+4).toFixed(1)+'" class="sk-pl">'+GL[p.en]+'</text>';
    var dl=skyXY(cx,cy,r-20,p.sid);
    o+='<text x="'+dl[0].toFixed(1)+'" y="'+(dl[1]+3).toFixed(1)+'" class="sk-deg">'+
       Math.floor(p.sid%30)+'°</text>';
  });
  var vlag=skyVargaLon(SKY_VARGA,S.lagna);
  o+='<text x="360" y="316" class="sk-c1">'+(SKY_VARGA==="D1"?"ecliptic":esc(SKY_VARGA))+'</text>'+
     '<text x="360" y="334" class="sk-c2">'+(SKY_VARGA==="D1"?"sidereal · ":"varga lagna ")+
     SA[Math.floor(vlag/30)%12]+(SKY_VARGA==="D1"?" rising":"")+'</text>';
  o+='</svg>';
  return o;
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

