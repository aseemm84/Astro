/* ===== Star wheel: the ecliptic as a tilted disc, horizon fixed, zodiac turning ===== */
var SWH_NAK=["Aśvinī","Bharaṇī","Kṛttikā","Rohiṇī","Mṛgaśira","Ārdrā","Punarvasu","Puṣya","Āśleṣā",
"Maghā","P.Phalgunī","U.Phalgunī","Hasta","Citrā","Svātī","Viśākhā","Anurādhā","Jyeṣṭhā","Mūla",
"P.Āṣāḍhā","U.Āṣāḍhā","Śravaṇa","Dhaniṣṭhā","Śatabhiṣā","P.Bhādra","U.Bhādra","Revatī"];
var SWH_W=980, SWH_H=660, SWH_CX=490, SWH_CY=366, SWH_R=330;
var SWH_SHOW={grahas:true,stars:true,connect:true,upagrahas:false,special:false,arudhas:false};

function swhEsc(s){return esc(s);}
function swhPt(lon,lag,lat,r){ return swProject(lon,lag,lat||0,r,SWH_CX,SWH_CY,SW_TILT_DEG); }

/* natal points that belong to the birth chart rather than to the moving sky */
function swhNatalPoints(D,J){
  var out={upagrahas:[],special:[],arudhas:[],lagna:null};
  if(D&&D.lagna&&D.lagna.sidereal_deg!=null) out.lagna=D.lagna.sidereal_deg;
  /* the Dhūmādi group are fixed offsets from the Sun, so they can be derived here.
     The Gulikādi group are moments of the day rather than longitudes and are not plotted. */
  if(D.P&&D.P.Sun){
    var s=D.P.Sun.sid, dh=((s+133+20/60)%360+360)%360, vy=((360-dh)%360+360)%360,
        pa=((vy+180)%360+360)%360, ic=((360-pa)%360+360)%360, uk=((ic+16+40/60)%360+360)%360;
    out.upagrahas=[{n:"Dhūma",lon:dh},{n:"Vyatīpāta",lon:vy},{n:"Parivesha",lon:pa},
                   {n:"Indracāpa",lon:ic},{n:"Upaketu",lon:uk}];
  }
  if(D&&D.specialLagnas) D.specialLagnas.forEach(function(s){
    out.special.push({n:s.abbr||s.name,lon:s.lon}); });
  if(D&&D.mcSid!=null) out.special.push({n:"MC",lon:D.mcSid});
  var al=(D.arudhas||[]).filter(function(a){return a.arudha_label==="AL";})[0];
  if(al) out.arudhas.push({n:"AL",lon:al.arudha_rashi_idx*30+15});
  if(D.ckar&&D.ckar.length&&D.d9){
    var ak=EN[D.ckar[0].graha]||D.ckar[0].graha, ks=D.d9[ak];
    if(ks!=null) out.arudhas.push({n:"KK",lon:ks*30+15});
  }
  return out;
}
var SWH_PRINT=false;
/* Paper needs the opposite of a night sky. Same geometry, inverted palette. */
function swhPal(){
  return SWH_PRINT
   ? {bg0:"#ffffff",bg1:"#f4f4fb",house:["#eceaf5","#f6f5fb"],hstroke:"#b9bccd",
      rasi:["#e6e9f6","#f1f2f9"],rstroke:"#9aa0c0",nak:["#f0f1f8","#f7f8fc"],nstroke:"#b9bccd",
      tick:"#b9bccd",ecl:"#a08a3a",horizon:"#7a8a9a",star:"#7a6a2a",bright:"#5a6aa0",
      glow:0,inside:"#8aa0b8",outside:"#c4643f"}
   : {bg0:"#141c33",bg1:"#05070e",house:["#1a2445","#141b36"],hstroke:"#2c3a66",
      rasi:["#1c2748","#16203c"],rstroke:"#31406e",nak:["#111a34","#0d1529"],nstroke:"#26325a",
      tick:"#2e3a66",ecl:"#7a6733",horizon:"#63788c",star:"#ffe9a8",bright:"#cfd9ff",
      glow:1,inside:"#4a6a8a",outside:"#c4643f"};
}
function swhRender(S,natal){
  var lag=S.lagna, R=SWH_R, o="", PAL=swhPal();
  /* The catalogue stores each star's sidereal longitude under Lahiri. A fixed star
     keeps that longitude in a sidereal zodiac, but only in the zodiac it was measured
     against — under Raman or KP the whole frame shifts, and the stars must shift with
     it or they would sit up to 87' out of place. Re-base by the difference between
     Lahiri and the ayanamsa actually in use at this instant. */
  var shift=0;
  try{ if(window.__ayanFor) shift=window.__ayanFor("lahiri",S.jd)-S.ayanamsa; }catch(e){}
  function starLon(sid){ return ((sid+shift)%360+360)%360; }
  o+='<svg viewBox="0 0 '+SWH_W+' '+SWH_H+'" class="swhsvg" role="img" aria-label="Star wheel: the '+
     'ecliptic tilted in perspective with the horizon fixed and the zodiac rotating behind it">'+
     '<title>Star wheel</title><defs>'+
     '<radialGradient id="swhbg" cx="50%" cy="46%" r="72%">'+
       ''+'<stop offset="0%" stop-color="'+PAL.bg0+'"/><stop offset="100%" stop-color="'+PAL.bg1+'"/>'+'</radialGradient>'+
     '<radialGradient id="swhglow" cx="50%" cy="50%" r="50%">'+
       '<stop offset="0%" stop-color="#fff" stop-opacity=".9"/>'+
       '<stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>';
  o+='<rect width="'+SWH_W+'" height="'+SWH_H+'" fill="url(#swhbg)"/>';

  /* --- fixed house wedges: defined by how far a point has risen, so they stay put --- */
  for(var h=1;h<=12;h++){
    var a0=lag-(h-1)*30, a1=lag-h*30;
    o+='<path d="'+swBandPath(a1,a0,R*0.995,R*1.055,lag,SWH_CX,SWH_CY,SW_TILT_DEG,10)+
       '" fill="'+((h%2)?PAL.house[0]:PAL.house[1])+'" stroke="'+PAL.hstroke+'" stroke-width="0.6"/>';
    var hp=swhPt(lag-(h-0.5)*30,lag,0,R*1.026);
    o+='<text x="'+hp.x.toFixed(1)+'" y="'+(hp.y+3).toFixed(1)+'" class="swh-h" font-size="'+
       (10.5*hp.scale).toFixed(1)+'">'+h+'</text>';
  }
  /* --- rāśi ring --- */
  for(var s=0;s<12;s++){
    o+='<path d="'+swBandPath(s*30,(s+1)*30,R*0.87,R*0.99,lag,SWH_CX,SWH_CY,SW_TILT_DEG,14)+
       '" fill="'+((s%2)?PAL.rasi[0]:PAL.rasi[1])+'" stroke="'+PAL.rstroke+'" stroke-width="0.6"/>';
    var sp=swhPt(s*30+15,lag,0,R*0.932);
    o+='<text x="'+sp.x.toFixed(1)+'" y="'+(sp.y+3).toFixed(1)+'" class="swh-rasi" font-size="'+
       (11.5*sp.scale).toFixed(1)+'">'+SA[s]+'</text>';
  }
  /* --- nakṣatra ring and pāda ticks --- */
  var seg=40/3;
  for(var n=0;n<27;n++){
    o+='<path d="'+swBandPath(n*seg,(n+1)*seg,R*0.755,R*0.87,lag,SWH_CX,SWH_CY,SW_TILT_DEG,10)+
       '" fill="'+((n%2)?PAL.nak[0]:PAL.nak[1])+'" stroke="'+PAL.nstroke+'" stroke-width="0.45"/>';
    var np=swhPt(n*seg+seg/2,lag,0,R*0.812);
    o+='<text x="'+np.x.toFixed(1)+'" y="'+(np.y+2.5).toFixed(1)+'" class="swh-nak" font-size="'+
       (7.6*np.scale).toFixed(1)+'">'+SWH_NAK[n]+'</text>';
    for(var q=1;q<4;q++){
      var t=n*seg+q*seg/4, a=swhPt(t,lag,0,R*0.755), b=swhPt(t,lag,0,R*0.785);
      o+='<line x1="'+a.x.toFixed(1)+'" y1="'+a.y.toFixed(1)+'" x2="'+b.x.toFixed(1)+'" y2="'+
         b.y.toFixed(1)+'" stroke="'+PAL.tick+'" stroke-width="0.45"/>';
    }
  }
  /* --- the ecliptic itself --- */
  o+='<path d="'+swRingPath(R*0.70,SWH_CX,SWH_CY,SW_TILT_DEG,lag)+
     '" fill="none" stroke="'+PAL.ecl+'" stroke-width="1.1" stroke-dasharray="5 5"/>';

  /* --- horizon, fixed across the view --- */
  o+='<line x1="'+(SWH_CX-R-52)+'" y1="'+SWH_CY+'" x2="'+(SWH_CX+R+52)+'" y2="'+SWH_CY+
     '" stroke="'+PAL.horizon+'" stroke-width="1.3" stroke-dasharray="7 6"/>';
  o+='<text x="'+(SWH_CX-R-58)+'" y="'+(SWH_CY-7)+'" class="swh-card swh-e">EAST</text>'+
     '<text x="'+(SWH_CX-R-58)+'" y="'+(SWH_CY+11)+'" class="swh-sub swh-e">rising</text>'+
     '<text x="'+(SWH_CX+R+58)+'" y="'+(SWH_CY-7)+'" class="swh-card swh-w">WEST</text>'+
     '<text x="'+(SWH_CX+R+58)+'" y="'+(SWH_CY+11)+'" class="swh-sub swh-w">setting</text>';

  /* --- stars, far to near, with the mismatch connectors --- */
  if(SWH_SHOW.stars){
    var items=[];
    YOGATARAS.forEach(function(y){ items.push({s:y,kind:"y"}); });
    BRIGHT_STARS.forEach(function(s){ items.push({s:s,kind:"b"}); });
    items.forEach(function(it){ it.p=swhPt(starLon(it.s.sid),lag,it.s.lat,R*0.70); });
    items.sort(function(a,b){ return b.p.depth-a.p.depth; });
    if(SWH_SHOW.connect){
      YOGATARAS.forEach(function(y){
        var mid=y.id*seg+seg/2;
        var a=swhPt(starLon(y.sid),lag,y.lat,R*0.70), b=swhPt(mid,lag,0,R*0.812);
        o+='<line x1="'+a.x.toFixed(1)+'" y1="'+a.y.toFixed(1)+'" x2="'+b.x.toFixed(1)+'" y2="'+
           b.y.toFixed(1)+'" stroke="'+(y.inside?PAL.inside:PAL.outside)+'" stroke-width="'+
           (y.inside?0.6:1.0)+'" stroke-dasharray="2 3" opacity="'+(y.inside?0.5:0.95)+'"/>';
      });
    }
    items.forEach(function(it){
      var r=Math.max(1.0,(3.3-it.s.mag*0.46)*it.p.scale), op=it.p.above?1:0.32;
      if(it.kind==="y"&&PAL.glow) o+='<circle cx="'+it.p.x.toFixed(1)+'" cy="'+it.p.y.toFixed(1)+'" r="'+
        (r*2.6).toFixed(1)+'" fill="url(#swhglow)" opacity="'+(op*0.5).toFixed(2)+'"/>';
      o+='<circle cx="'+it.p.x.toFixed(1)+'" cy="'+it.p.y.toFixed(1)+'" r="'+r.toFixed(2)+
         '" fill="'+(it.kind==="y"?PAL.star:PAL.bright)+'" opacity="'+op.toFixed(2)+'"/>';
      if(it.kind==="y"&&it.s.mag<3.3)
        o+='<text x="'+(it.p.x+5).toFixed(1)+'" y="'+(it.p.y-5).toFixed(1)+'" class="swh-star" font-size="'+
           (8.2*it.p.scale).toFixed(1)+'" opacity="'+op.toFixed(2)+'">'+swhEsc(it.s.star)+'</text>';
    });
  }
  /* --- points: grahas move with the clock, natal points do not --- */
  var pts=[];
  /* the natal ascendant. At the birth moment it lies exactly on the eastern horizon;
     step the clock and it drifts, which is precisely how far the sky has turned since. */
  if(natal.lagna!=null) pts.push({n:"Lg",lon:natal.lagna,lat:0,cls:"l",full:"natal lagna"});
  if(SWH_SHOW.grahas) S.planets.forEach(function(p){
    pts.push({n:GL[p.en]||p.en,lon:p.sid,lat:p.lat||0,cls:"g",full:p.en}); });
  if(SWH_SHOW.upagrahas) natal.upagrahas.forEach(function(x){ pts.push({n:x.n.slice(0,2),lon:x.lon,lat:0,cls:"u",full:x.n}); });
  if(SWH_SHOW.special)   natal.special.forEach(function(x){ pts.push({n:x.n,lon:x.lon,lat:0,cls:"s",full:x.n}); });
  if(SWH_SHOW.arudhas)   natal.arudhas.forEach(function(x){ pts.push({n:x.n,lon:x.lon,lat:0,cls:"a",full:x.n}); });
  pts.forEach(function(p){ p.p=swhPt(p.lon,lag,p.lat,R*0.62); });
  pts.sort(function(a,b){ return b.p.depth-a.p.depth; });
  var placed=[];
  pts.forEach(function(p){
    var q={x:p.p.x,y:p.p.y};
    for(var g=0;g<10;g++){
      var clash=placed.some(function(o2){ return Math.hypot(o2.x-q.x,o2.y-q.y)<26; });
      if(!clash) break;
      var ar=Math.atan2(q.y-SWH_CY,q.x-SWH_CX);
      q={x:q.x-Math.cos(ar)*27,y:q.y-Math.sin(ar)*27};
    }
    placed.push(q);
    var rr=(11*p.p.scale).toFixed(1);
    o+='<line x1="'+p.p.x.toFixed(1)+'" y1="'+p.p.y.toFixed(1)+'" x2="'+q.x.toFixed(1)+'" y2="'+
       q.y.toFixed(1)+'" stroke="#55628c" stroke-width="0.6"/>';
    o+='<circle cx="'+q.x.toFixed(1)+'" cy="'+q.y.toFixed(1)+'" r="'+rr+'" class="swh-pt swh-'+p.cls+'"/>';
    o+='<text x="'+q.x.toFixed(1)+'" y="'+(q.y+3.6).toFixed(1)+'" class="swh-plab" font-size="'+
       (10*p.p.scale).toFixed(1)+'">'+swhEsc(p.n)+'</text>';
  });
  o+='</svg>';
  return o;
}

/* --- pane --- */
var SWH_BASE=null, SWH_OFFSET=0, SWH_NATAL=null;
function swhStateAt(minutes){
  var i={}; for(var k in SWH_BASE) i[k]=SWH_BASE[k];
  var t=i.hour*60+i.minute+minutes, shift=Math.floor(t/1440);
  t=((t%1440)+1440)%1440; i.hour=Math.floor(t/60); i.minute=t%60;
  if(shift){ var d=new Date(Date.UTC(i.year,i.month-1,i.day+shift));
    i.year=d.getUTCFullYear(); i.month=d.getUTCMonth()+1; i.day=d.getUTCDate(); }
  return {inp:i, sky:window.quickSky(i)};
}
function swhDraw(){
  var host=document.getElementById("swhcanvas"); if(!host||!SWH_BASE) return;
  var t0=(window.performance&&performance.now)?performance.now():0;
  var st=swhStateAt(SWH_OFFSET);
  host.innerHTML=swhRender(st.sky,SWH_NATAL);
  var i=st.inp, nk=nakOf(st.sky.lagna);
  var stamp=document.getElementById("swhstamp");
  if(stamp) stamp.innerHTML=
    String(i.day).padStart(2,"0")+" "+MON[i.month]+" "+i.year+" &middot; "+
    String(i.hour).padStart(2,"0")+":"+String(i.minute).padStart(2,"0")+
    ' <span class="swh-off">'+swhOffsetLabel(SWH_OFFSET)+'</span>';
  var f=document.getElementById("swhfacts");
  if(f) f.innerHTML='Rising: <b>'+SA[Math.floor(st.sky.lagna/30)%12]+' '+dm(st.sky.lagna%30)+
    '</b> &middot; '+esc(nk.name)+' pāda '+nk.pada+
    ' &middot; <span class="kmut">'+((performance.now?performance.now():0)-t0).toFixed(1)+' ms</span>';
}
function swhOffsetLabel(m){
  if(!m) return "birth moment";
  var s=m<0?"−":"+", a=Math.abs(m);
  if(a<60) return s+a+" min from birth";
  if(a<1440) return s+Math.floor(a/60)+" h "+(a%60?(a%60)+" min":"").trim()+" from birth";
  var d=Math.floor(a/1440), rem=Math.round((a%1440)/60);
  if(d<14) return s+d+" day"+(d>1?"s":"")+(rem?" "+rem+" h":"")+" from birth";
  if(d<70) return s+Math.round(d/7)+" weeks from birth";
  if(d<730) return s+Math.round(d/30.44)+" months from birth";
  return s+(d/365.25).toFixed(1)+" years from birth";
}
/* Stepping is animated over a few frames so a one-minute change is visibly a
   rotation rather than a jump — that turning is the thing the wheel is for. */
var SWH_ANIM=null, SWH_TARGET=0;
function swhGoTo(target,animate){
  target=Math.round(target); SWH_TARGET=target;
  if(SWH_ANIM){ cancelAnimationFrame(SWH_ANIM); SWH_ANIM=null; }
  var from=SWH_OFFSET, delta=target-from;
  if(!animate || Math.abs(delta)>2880 || delta===0){ SWH_OFFSET=target; swhDraw(); return; }
  var t0=performance.now(), dur=260;
  (function step(){
    var k=Math.min(1,(performance.now()-t0)/dur);
    var e=k<0.5?2*k*k:1-Math.pow(-2*k+2,2)/2;          // ease in and out
    SWH_OFFSET=Math.round(from+delta*e);
    swhDraw();
    if(k<1) SWH_ANIM=requestAnimationFrame(step); else { SWH_OFFSET=target; swhDraw(); SWH_ANIM=null; }
  })();
}
/* Day, week, month and year steps walk the calendar rather than adding a fixed
   number of minutes, so "+1 month" lands on the same clock time next month. */
function swhStepUnit(unit,k){
  var i=SWH_BASE;
  var cur=new Date(Date.UTC(i.year,i.month-1,i.day,i.hour,i.minute)+SWH_OFFSET*60000);
  if(unit==="min") cur=new Date(cur.getTime()+k*60000);
  else if(unit==="day")  cur.setUTCDate(cur.getUTCDate()+k);
  else if(unit==="week") cur.setUTCDate(cur.getUTCDate()+7*k);
  else if(unit==="month"){
    var d0=cur.getUTCDate();
    cur.setUTCDate(1); cur.setUTCMonth(cur.getUTCMonth()+k);
    var last=new Date(Date.UTC(cur.getUTCFullYear(),cur.getUTCMonth()+1,0)).getUTCDate();
    cur.setUTCDate(Math.min(d0,last));            // 31 Jan + 1 month lands on 28/29 Feb
  }
  else if(unit==="year"){
    var d1=cur.getUTCDate();
    cur.setUTCDate(1); cur.setUTCFullYear(cur.getUTCFullYear()+k);
    var last1=new Date(Date.UTC(cur.getUTCFullYear(),cur.getUTCMonth()+1,0)).getUTCDate();
    cur.setUTCDate(Math.min(d1,last1));
  }
  var base=Date.UTC(i.year,i.month-1,i.day,i.hour,i.minute);
  return Math.round((cur.getTime()-base)/60000);
}
function swhNowOffset(){
  var i=SWH_BASE;
  var birthUTC=Date.UTC(i.year,i.month-1,i.day,i.hour,i.minute)-i.tzHours*3600000;
  return Math.round((Date.now()-birthUTC)/60000);
}
function swhControls(){
  function b(label,attr,cls){ return '<button type="button" class="swhb'+(cls?" "+cls:"")+'" '+attr+'>'+label+'</button>'; }
  var fine=[-20,-10,-5,-2,-1,1,2,5,10,20].map(function(m){
    return b((m>0?"+":"−")+Math.abs(m), 'data-swhstep="'+m+'"'); }).join("");
  var coarse=[["min","min"],["day","day"],["week","week"],["month","month"],["year","year"]].map(function(c){
    return '<span class="swhgrp">'+b("−",'data-swhunit="'+c[1]+'" data-swhn="-1"')+
           '<span class="swhgl">'+c[0]+'</span>'+b("+",'data-swhunit="'+c[1]+'" data-swhn="1"')+'</span>'; }).join("");
  return '<div class="swhctl">'+
    '<div class="swhrow"><span class="swhlbl">Anchor</span>'+
      b("Birth moment",'data-swhgo="0"',"key")+b("Now",'data-swhgo="now"')+
      '<input type="datetime-local" id="swhpick" class="swhpick" aria-label="Jump to a date and time">'+
      b("Go",'data-swhgo="pick"',"sec")+'</div>'+
    '<div class="swhrow"><span class="swhlbl">Rectify</span><span class="swhfine">'+fine+
      '</span><span class="swhgl">minutes</span></div>'+
    '<div class="swhrow"><span class="swhlbl">Travel</span>'+coarse+'</div></div>';
}
function swhChips(){
  var C=[["grahas","Grahas"],["stars","Stars"],["connect","Star ↔ division"],
         ["upagrahas","Upagrahas (Dhūmādi)"],["special","Special lagnas"],["arudhas","Ārūḍha · Kārakāṃśa"]];
  return '<div class="swhchips">'+C.map(function(c){
    return '<button type="button" class="swhchip'+(SWH_SHOW[c[0]]?" on":"")+'" data-swh="'+c[0]+'">'+
      esc(c[1])+'</button>'; }).join("")+'</div>';
}
function starWheelPane(D,J){
  if(!J||!J.input) return "";
  SWH_BASE=J.input; SWH_OFFSET=0; SWH_NATAL=swhNatalPoints(D,J);
  var out=YOGATARAS.filter(function(y){return !y.inside;});
  return '<p class="knote">The ecliptic drawn as a disc tilted away from you, with the <b>horizon fixed</b> and '+
    'the <b>zodiac turning behind it</b>. Whatever is crossing the eastern edge is the lagna — not a label placed '+
    'there, but the arithmetic itself: the sign on that edge is what the engine reports as rising. The twelve '+
    'house compartments stay put while the signs travel through them, which is the whole mechanism of a birth '+
    'chart in one picture.</p>'+
    swhControls()+swhChips()+
    '<p id="swhstamp" class="swhstamp"></p>'+
    '<p id="swhfacts" class="swhfacts"></p>'+
    '<div id="swhcanvas" class="swhcanvas"></div>'+
    wheelLegend("star")+
    '<div class="kbox"><b>Real stars against ideal divisions.</b> The '+YOGATARAS.length+' bright points in gold '+
    'are the <b>yogatārās</b> — the actual stars the nakṣatras are named after, at catalogued positions. The '+
    'bands beneath them are the equal 13°20′ divisions. A dotted line joins each star to the division that bears '+
    'its name, and <b>'+out.length+' of the 27 do not land inside it</b> — '+
    out.map(function(y){return esc(y.nak);}).join(", ")+'. Arcturus is a full nakṣatra adrift. That is not an '+
    'error in either the catalogue or the scheme: the nakṣatras are a division of the ecliptic into equal parts, '+
    'and the stars that named them are not equally spaced. Seeing the two disagree is the point.</div>'+
    '<div class="kbox"><b>What is real here and what is not.</b> The stars are catalogued objects at their true '+
    'ecliptic latitude, which is why several ride well above or below the band — Jyotiṣa works in longitude '+
    'alone and treats every body as though it lay exactly on the ecliptic. The <b>grahas</b> are real and move '+
    'when you change the time. The <b>upagrahas, special lagnas and ārūḍha points are computed longitudes, not '+
    'objects</b>, and they do not move, because they are properties of the birth chart rather than of the sky. '+
    'Only the Dhūmādi upagrahas appear: the Gulikādi group are moments of the day, not positions, so they have '+
    'no place on a wheel.</div>'+
    '<div class="kbox"><b>The natal lagna, marked Lg.</b> At the birth moment it lies exactly on the eastern '+
    'horizon — that is the ascendant, by definition. Move the clock and it drifts away from that edge, and the '+
    'gap is how far the sky has turned since. Within a few minutes either way that gap is the most useful thing '+
    'on this wheel, because it shows what an error in the recorded birth time would actually cost. Travel months '+
    'or years, though, and Lg becomes a historical marker only: it says where the ascendant was then, and '+
    'nothing whatever about the sky you are now looking at.</div>'+
    '<div class="kbox"><b>Positions and epoch.</b> Star longitudes are catalogued for J2000 under Lahiri and '+
    're-based when another ayanāṃśa is chosen, so the stars keep step with whichever sidereal frame the chart '+
    'uses. Proper motion since J2000 is not applied; over a human lifetime it moves these stars by well under an '+
    'arcminute, far below anything this drawing resolves.</div>';
}
document.addEventListener("click",function(ev){
  var t=ev.target; if(!t||!t.getAttribute) return;
  var st=t.getAttribute("data-swhstep");
  if(st!=null){ swhGoTo(SWH_OFFSET+(+st), Math.abs(+st)<=120); return; }
  var un=t.getAttribute("data-swhunit");
  if(un!=null){ var k=+(t.getAttribute("data-swhn")||1);
    swhGoTo(swhStepUnit(un,k), un==="min"); return; }
  var go=t.getAttribute("data-swhgo");
  if(go!=null){
    if(go==="now") swhGoTo(swhNowOffset(),false);
    else if(go==="pick"){
      var el=document.getElementById("swhpick");
      if(el&&el.value){
        var d=new Date(el.value), i=SWH_BASE;
        var birthLocal=Date.UTC(i.year,i.month-1,i.day,i.hour,i.minute);
        var pickLocal=Date.UTC(d.getFullYear(),d.getMonth(),d.getDate(),d.getHours(),d.getMinutes());
        swhGoTo(Math.round((pickLocal-birthLocal)/60000),false);
      }
    }
    else swhGoTo(+go,true);
    return;
  }
  var k=t.getAttribute("data-swh");
  if(k&&SWH_SHOW.hasOwnProperty(k)){
    SWH_SHOW[k]=!SWH_SHOW[k];
    t.className="swhchip"+(SWH_SHOW[k]?" on":"");
    swhDraw();
  }
});
window.__swhDraw=swhDraw;
/* offset control, used by the time buttons and by the test suite */
window.__swhSetOffset=function(m){ if(SWH_ANIM){cancelAnimationFrame(SWH_ANIM);SWH_ANIM=null;}
  SWH_OFFSET=m|0; SWH_TARGET=SWH_OFFSET; swhDraw(); return SWH_OFFSET; };
/* the offset a step is heading for — settled immediately, even mid-animation */
window.__swhGetOffset=function(){ return SWH_TARGET; };
window.__swhGetDrawn=function(){ return SWH_OFFSET; };
