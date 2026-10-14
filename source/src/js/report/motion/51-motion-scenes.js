/* ===== The six scenes =====
   Each one declares a span of real time and knows how to draw a single instant of it.
   Progress runs 0→1 across whatever duration is set, so "the whole retrograde in
   fifteen seconds" is one control rather than a rate to work out. */

var MO_CACHE={};
function moCached(key,make){
  if(MO_CACHE[key]===undefined) MO_CACHE[key]=make();
  return MO_CACHE[key];
}
function moSidAt(en,ms){
  try{ return window.__kSidAt(en,new Date(ms)); }catch(e){ return null; }
}
function moSpeed(en,ms){
  var a=moSidAt(en,ms-43200000), b=moSidAt(en,ms+43200000);
  if(a==null||b==null) return 0;
  var d=b-a; if(d>180)d-=360; if(d<-180)d+=360;
  return d;
}
function moBirthMs(){
  var i=MO.J&&MO.J.input; if(!i) return Date.now();
  return Date.UTC(i.year,i.month-1,i.day,i.hour,i.minute)-i.tzHours*3600000;
}
/* The retrograde nearest to today for a given graha: scan forward, then back. */
function moRetroWindow(en){
  return moCached("retro|"+en,function(){
    var now=Date.now(), DAY=86400000, stride=2*DAY;
    var found=null, prev=null;
    for(var k=-220;k<=900 && !found;k++){
      var ms=now+k*stride, s=moSpeed(en,ms)<0;
      if(prev!=null && s && !prev) found={start:ms};
      prev=s;
    }
    if(!found) return {t0:now-60*DAY,t1:now+60*DAY,s:null,e:null};
    var e=null;
    for(var j=1;j<220;j++){ var m2=found.start+j*stride; if(moSpeed(en,m2)>=0){ e=m2; break; } }
    if(e==null) e=found.start+70*DAY;
    var pad=(e-found.start)*0.55;
    return {t0:found.start-pad, t1:e+pad, s:found.start, e:e};
  });
}
function moSceneOf(k){ for(var i=0;i<MO_SCENES.length;i++) if(MO_SCENES[i].key===k) return MO_SCENES[i]; return MO_SCENES[0]; }
function moGlyph(x,y,r,en,P,bold){
  var ben=MO_BEN[en], col=(en==="Rahu"||en==="Ketu")?P.dim:(ben?P.benefic:P.malefic);
  var c=MO.ctx;
  moGlowDot(x,y,r,P.bg,col);
  c.strokeStyle=col; c.lineWidth=Math.max(2,r*0.16);
  c.beginPath(); c.arc(x,y,r,0,6.2832); c.stroke();
  moText(GL[en],x,y+r*0.06,r*0.95,bold?P.ink:P.ink,"center",700);
  return col;
}

var MO_SCENES=[
/* ---------------------------------------------------------------- 1. retrograde */
{key:"retro", label:"Retrograde loop", title:"Retrograde is not backwards",
 sub:"longitude across · ecliptic latitude up",
 span:function(){ var w=moRetroWindow(MO.opt.subject); return {t0:w.t0,t1:w.t1}; },
 draw:function(p){
  var P=moPal(), S=moSize(), st=moStage(), c=MO.ctx, en=MO.opt.subject;
  var w=moRetroWindow(en), t0=w.t0, t1=w.t1, ms=t0+(t1-t0)*p;
  moStars();
  /* the path, sampled once and reused */
  var path=moCached("rpath|"+en,function(){
    var out=[], N=240;
    for(var i=0;i<=N;i++){
      var m=t0+(t1-t0)*i/N, L=moSidAt(en,m);
      var lat=0;
      try{ var ev=Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body[en],new Date(m),true));
           lat=ev.elat; }catch(e){}
      if(L!=null) out.push({ms:m,lon:L,lat:lat,retro:moSpeed(en,m)<0});
    }
    return out;
  });
  if(!path.length) return {ms:ms};
  var lo=1e9,hi=-1e9,la=1e9,ha=-1e9;
  path.forEach(function(q){ var u=q.lon; lo=Math.min(lo,u); hi=Math.max(hi,u);
    la=Math.min(la,q.lat); ha=Math.max(ha,q.lat); });
  if(hi-lo>180){ path.forEach(function(q){ if(q.lon<180) q.lon+=360; });
    lo=1e9;hi=-1e9; path.forEach(function(q){ lo=Math.min(lo,q.lon); hi=Math.max(hi,q.lon); }); }
  var mx=(hi-lo)*0.12||1, my=(ha-la)*0.35||0.4;
  lo-=mx; hi+=mx; la-=my; ha+=my;
  var bx=S.w*0.11, bw=S.w-bx*2, by=st.cy-st.h*0.30, bh=st.h*0.60;
  function X(l){ return bx+bw*(l-lo)/(hi-lo); }
  function Y(b){ return by+bh-bh*(b-la)/(ha-la); }
  /* sign bands and boundaries */
  for(var sg=Math.floor(lo/30);sg<=Math.floor(hi/30);sg++){
    var a=Math.max(lo,sg*30), b=Math.min(hi,sg*30+30);
    if(b<=a) continue;
    c.fillStyle=(sg%2)?"rgba(255,255,255,0.035)":"rgba(255,255,255,0.012)";
    c.fillRect(X(a),by,X(b)-X(a),bh);
    if(sg*30>lo){ c.strokeStyle=P.gold; c.globalAlpha=.45; c.setLineDash([6,8]); c.lineWidth=2;
      c.beginPath(); c.moveTo(X(sg*30),by); c.lineTo(X(sg*30),by+bh); c.stroke();
      c.setLineDash([]); c.globalAlpha=1; }
    if(MO.opt.labels && X(b)-X(a)>S.w*0.12)
      moText(SA[((sg%12)+12)%12],(X(a)+X(b))/2,by-S.w*0.035,S.w*0.030,P.dim,"center",600);
  }
  /* the ecliptic plane */
  if(MO.opt.grid && la<0 && ha>0){
    c.strokeStyle=P.line; c.lineWidth=2; c.setLineDash([5,7]);
    c.beginPath(); c.moveTo(bx,Y(0)); c.lineTo(bx+bw,Y(0)); c.stroke(); c.setLineDash([]);
    moText("ecliptic plane",bx+bw,Y(0)-S.w*0.022,S.w*0.022,P.dim,"right",500);
  }
  /* The whole path, faint: the shape of the loop is the point of the scene, so the
     frame should never be a stub of a curve in an empty field. The travelled part is
     then drawn bright over it. */
  c.strokeStyle=P.dim; c.globalAlpha=.30; c.lineWidth=Math.max(2,S.w*0.0035);
  c.beginPath();
  path.forEach(function(q,i){ var x=X(q.lon), y=Y(q.lat);
    if(i) c.lineTo(x,y); else c.moveTo(x,y); });
  c.stroke(); c.globalAlpha=1;
  /* trail up to now */
  var cut=Math.round(p*(path.length-1));
  var from=MO.opt.trail?Math.max(0,cut-Math.round(path.length*MO.opt.trailLen)):cut-1;
  c.lineWidth=Math.max(3,S.w*0.006); c.lineJoin="round"; c.lineCap="round";
  for(var i=Math.max(1,from);i<=cut;i++){
    var q0=path[i-1], q1=path[i];
    var al=(i-from)/Math.max(1,cut-from);
    c.globalAlpha=0.15+0.85*al;
    c.strokeStyle=q1.retro?P.malefic:P.gold;
    c.beginPath(); c.moveTo(X(q0.lon),Y(q0.lat)); c.lineTo(X(q1.lon),Y(q1.lat)); c.stroke();
  }
  c.globalAlpha=1;
  /* stations */
  [["s","turns back"],["e","resumes"]].forEach(function(k){
    var t=w[k[0]]; if(t==null||t>ms) return;
    var near=path.reduce(function(a,b){ return Math.abs(b.ms-t)<Math.abs(a.ms-t)?b:a; },path[0]);
    moGlowDot(X(near.lon),Y(near.lat),S.w*0.011,P.gold,P.gold);
    if(MO.opt.labels) moText(k[1],X(near.lon),Y(near.lat)-S.w*0.034,S.w*0.024,P.gold,"center",600);
  });
  var cur=path[cut];
  var r=S.w*0.043;
  moGlyph(X(cur.lon),Y(cur.lat),r,en,P,true);
  if(cur.retro) moText("R",X(cur.lon)+r*0.95,Y(cur.lat)-r*0.85,r*0.62,P.malefic,"center",800);
  return {ms:ms, sub:MO_FULL[en]+" · "+(cur.retro?"retrograde":"direct")+" · lat "+
          (cur.lat>=0?"+":"")+cur.lat.toFixed(2)+"°"};
 }},

/* ------------------------------------------------------------------- 2. gochara */
{key:"gochara", label:"Gochara run", title:"Where the slow grahas go",
 sub:"the natal chart inside, the transiting sky outside",
 draw:function(p){
  var P=moPal(), S=moSize(), st=moStage(), c=MO.ctx;
  var yrs=MO.opt.years||12, t0=Date.now(), t1=t0+yrs*365.2564*86400000;
  var ms=t0+(t1-t0)*p, R=st.R, cx=st.cx, cy=st.cy;
  moStars();
  /* rāśi ring */
  for(var s=0;s<12;s++){
    var a0=(180-s*30)*Math.PI/180, a1=(180-(s*30+30))*Math.PI/180;
    c.beginPath(); c.arc(cx,cy,R,-a0,-a1,false); c.arc(cx,cy,R*0.86,-a1,-a0,true); c.closePath();
    c.fillStyle=(s%2)?"rgba(255,255,255,0.055)":"rgba(255,255,255,0.02)"; c.fill();
    var am=(180-(s*30+15))*Math.PI/180;
    if(MO.opt.labels) moText(SA[s],cx+Math.cos(am)*R*0.93,cy-Math.sin(am)*R*0.93,
      S.w*0.026,P.dim,"center",600);
  }
  c.strokeStyle=P.line; c.lineWidth=2;
  c.beginPath(); c.arc(cx,cy,R,0,6.2832); c.stroke();
  c.beginPath(); c.arc(cx,cy,R*0.86,0,6.2832); c.stroke();
  /* ingress flashes */
  var ing=moCached("ing|"+yrs,function(){
    var out=[], N=Math.min(1200,Math.round(yrs*26));
    ["Jupiter","Saturn","Rahu","Mars"].forEach(function(en){
      var prev=null;
      for(var i=0;i<=N;i++){
        var m=t0+(t1-t0)*i/N, L=moSidAt(en,m); if(L==null) break;
        var sg=Math.floor(L/30)%12;
        if(prev!=null&&sg!==prev) out.push({ms:m,en:en,sign:sg});
        prev=sg;
      }
    });
    return out;
  });
  var flashWin=(t1-t0)*0.02, flash=null;
  ing.forEach(function(e){ if(ms>=e.ms && ms-e.ms<flashWin) flash=e; });
  /* natal ring */
  var gN=S.w*0.026;
  var nat=(MO.D&&MO.D.P)?MO_NAMES.filter(function(n){return MO.D.P[n]&&MO.show[n];})
          .map(function(n){ return {en:n,lon:MO.D.P[n].sid}; }):[];
  moSpread(nat,R*0.42,gN);
  nat.forEach(function(q){
    var a=(180-q.lon)*Math.PI/180;
    c.globalAlpha=.6;
    moGlyph(cx+Math.cos(a)*q.r,cy-Math.sin(a)*q.r,gN,q.en,P,false);
    c.globalAlpha=1;
  });
  c.strokeStyle=P.line; c.globalAlpha=.5; c.setLineDash([3,6]);
  c.beginPath(); c.arc(cx,cy,R*0.52,0,6.2832); c.stroke(); c.setLineDash([]); c.globalAlpha=1;
  /* transiting grahas, with trails */
  var SLOWT={Mars:1,Jupiter:1,Saturn:1,Rahu:1,Ketu:1};
  var tr=[];
  MO_NAMES.forEach(function(en){
    if(!MO.show[en]) return;
    var L0=moSidAt(en,ms); if(L0!=null) tr.push({en:en,lon:L0});
  });
  var gT=S.w*0.036;
  moSpread(tr,R*0.74,gT);
  MO_NAMES.forEach(function(en){
    if(!MO.show[en]) return;
    /* a trail is only meaningful for a graha slow enough to leave one: the Moon would
       wrap the ring several times over and read as a solid band */
    if(MO.opt.trail && SLOWT[en]){
      var span=(t1-t0)*MO.opt.trailLen*0.25;
      c.lineWidth=Math.max(2,S.w*0.004); c.strokeStyle=P.gold;
      for(var i=10;i>=1;i--){
        var m0=ms-span*i/10, m1=ms-span*(i-1)/10;
        var L0=moSidAt(en,m0), L1=moSidAt(en,m1); if(L0==null||L1==null) continue;
        var d=L1-L0; if(d>180)d-=360; if(d<-180)d+=360;
        c.globalAlpha=0.06+0.5*(1-i/10);
        var a0=(180-L0)*Math.PI/180, a1=(180-(L0+d))*Math.PI/180;
        c.beginPath(); c.arc(cx,cy,R*0.74,-a0,-a1,d<0); c.stroke();
      }
      c.globalAlpha=1;
    }
    var me=null; tr.forEach(function(q){ if(q.en===en) me=q; });
    if(!me) return;
    var a=(180-me.lon)*Math.PI/180, x=cx+Math.cos(a)*me.r, y=cy-Math.sin(a)*me.r;
    moGlyph(x,y,gT,en,P,true);
    if(moSpeed(en,ms)<0) moText("R",x+gT*0.95,y-gT*0.85,S.w*0.022,P.malefic,"center",800);
  });
  if(flash){
    var k=1-(ms-flash.ms)/flashWin;
    c.globalAlpha=k*0.95;
    var txt=MO_FULL[flash.en]+" enters "+SA[flash.sign];
    c.font='700 '+(S.w*0.040)+'px system-ui,sans-serif';
    var tw=c.measureText(txt).width;
    c.fillStyle=P.bg; c.globalAlpha=k*0.82;
    c.fillRect(cx-tw/2-S.w*0.03,cy-S.w*0.055,tw+S.w*0.06,S.w*0.075);
    c.globalAlpha=k*0.95;
    moText(txt,cx,cy-S.w*0.018,S.w*0.040,P.gold,"center",700);
    c.globalAlpha=1;
  } else if(MO.opt.labels){
    moText("gochara",cx,cy-S.w*0.012,S.w*0.028,P.dim,"center",600);
    moText("natal inside",cx,cy+S.w*0.028,S.w*0.022,P.dim,"center",500);
  }
  return {ms:ms};
 }},

/* -------------------------------------------------------------------- 3. orrery */
{key:"orrery", label:"Tilted orrery", title:"Nothing sits on the ecliptic",
 sub:"each graha lifted by its true ecliptic latitude",
 draw:function(p){
  var P=moPal(), S=moSize(), st=moStage(), c=MO.ctx;
  var t0=moBirthMs(), t1=t0+(MO.opt.years||2)*365.2564*86400000;
  var ms=t0+(t1-t0)*p, R=st.R*1.08, cx=st.cx, cy=st.cy;
  var tilt=(28+22*Math.sin(p*Math.PI*2))*Math.PI/180;      // the camera breathes
  var kY=Math.cos(tilt), lift=Math.sin(tilt)*(MO.opt.exag||26);
  moStars();
  function proj(lon,lat){
    var a=(180-lon)*Math.PI/180;
    return [cx+Math.cos(a)*R, cy-Math.sin(a)*R*kY-lat*lift];
  }
  /* the ring: far half dimmer, so the disc reads as a disc */
  [[0,180,0.32],[180,360,1]].forEach(function(seg){
    c.beginPath();
    for(var l=seg[0];l<=seg[1];l+=2){ var q=proj(l,0);
      if(l===seg[0]) c.moveTo(q[0],q[1]); else c.lineTo(q[0],q[1]); }
    c.strokeStyle=P.line; c.globalAlpha=seg[2]; c.lineWidth=3; c.stroke(); c.globalAlpha=1;
  });
  if(MO.opt.labels) for(var s=0;s<12;s++){
    var q=proj(s*30+15,0);
    var back=(s*30+15)>0&&(s*30+15)<180;
    c.globalAlpha=back?0.4:0.95;
    moText(SA[s],q[0],q[1]+(q[1]<cy?-S.w*0.028:S.w*0.030),S.w*0.024,P.dim,"center",600);
    c.globalAlpha=1;
  }
  var items=[];
  MO_NAMES.forEach(function(en){
    if(!MO.show[en]) return;
    var L=moSidAt(en,ms); if(L==null) return;
    var lat=0;
    if(en!=="Rahu"&&en!=="Ketu"){
      try{ var ev=Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body[en],new Date(ms),true));
           lat=ev.elat; }catch(e){}
    }
    items.push({en:en,lon:L,lat:lat});
  });
  items.sort(function(a,b){ return proj(a.lon,a.lat)[1]-proj(b.lon,b.lat)[1]; });
  items.forEach(function(q){
    var pt=proj(q.lon,q.lat), base=proj(q.lon,0);
    c.strokeStyle=P.line; c.globalAlpha=.8; c.lineWidth=2;
    c.beginPath(); c.moveTo(base[0],base[1]); c.lineTo(pt[0],pt[1]); c.stroke(); c.globalAlpha=1;
    moGlyph(pt[0],pt[1],S.w*0.034,q.en,P,true);
  });
  var mo=items.filter(function(x){return x.en==="Moon";})[0];
  return {ms:ms, sub: mo? ("Candra "+(mo.lat>=0?"+":"")+mo.lat.toFixed(2)+"° from the plane"
          +(Math.abs(mo.lat)<0.4?" — at the node":"")) : null};
 }},

/* ----------------------------------------------------------------- 4. birth sky */
{key:"birthsky", label:"Sky at birth", title:"The sky you were born under",
 sub:"zenith at the centre, horizon at the rim",
 draw:function(p){
  var P=moPal(), S=moSize(), st=moStage(), c=MO.ctx;
  var i=MO.J&&MO.J.input; if(!i) throw new Error("no birth data");
  var b=moBirthMs(), half=(MO.opt.hours||14)*3600000/2;
  var t0=b-half, t1=b+half, ms=t0+(t1-t0)*p;
  var R=st.R*1.05, cx=st.cx, cy=st.cy;
  var sky=null;
  try{
    var d=new Date(ms), ut=d.getUTCHours()+d.getUTCMinutes()/60+d.getUTCSeconds()/3600;
    sky=window.quickSky({year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:d.getUTCDate(),
      hour:ut,minute:0,second:0,tzHours:0,lat:i.lat,lon:i.lon,ayanamsa:i.ayanamsa||"lahiri"});
  }catch(e){ throw e; }
  var sun=sky.planets.filter(function(x){return x.en==="Sun";})[0];
  var day=sun&&sun.hz&&sun.hz.alt>0;
  /* the dome darkens as the Sun sets — the whole point of the scene */
  var k=sun&&sun.hz?Math.max(0,Math.min(1,(sun.hz.alt+14)/26)):0;
  c.save();
  c.beginPath(); c.arc(cx,cy,R,0,6.2832); c.clip();
  var g=c.createRadialGradient(cx,cy,R*0.1,cx,cy,R);
  g.addColorStop(0, day?"#9fc0e8":"#0d1430");
  g.addColorStop(1, day?"#dfeaf7":"#05070f");
  c.fillStyle=g; c.fillRect(cx-R,cy-R,R*2,R*2);
  c.restore();
  if(!day){ c.save(); c.beginPath(); c.arc(cx,cy,R,0,6.2832); c.clip(); moStars(); c.restore(); }
  c.strokeStyle=P.gold; c.lineWidth=3;
  c.beginPath(); c.arc(cx,cy,R,0,6.2832); c.stroke();
  [30,60].forEach(function(alt){
    c.strokeStyle=P.line; c.globalAlpha=.55; c.lineWidth=1.6; c.setLineDash([4,7]);
    c.beginPath(); c.arc(cx,cy,R*(90-alt)/90,0,6.2832); c.stroke(); c.setLineDash([]); c.globalAlpha=1;
  });
  [["N",0],["E",90],["S",180],["W",270]].forEach(function(q){
    var a=(q[1]-90)*Math.PI/180;
    moText(q[0],cx+Math.cos(a)*(R+S.w*0.040),cy+Math.sin(a)*(R+S.w*0.040),S.w*0.030,P.gold,"center",700);
  });
  function hxy(alt,az){ var r=R*(90-alt)/90, a=(az-90)*Math.PI/180;
    return [cx+Math.cos(a)*r, cy+Math.sin(a)*r]; }
  /* the ecliptic arc across the sky */
  if(MO.opt.grid){
    c.strokeStyle=P.gold; c.globalAlpha=.4; c.lineWidth=2; c.setLineDash([4,6]); c.beginPath();
    var started=false;
    for(var L=0;L<360;L+=3){
      var eq=skyEqOf(L,sky), h=skyHorizonOf(eq,sky);
      if(h&&h.alt>-1){ var q2=hxy(h.alt,h.az);
        if(!started){ c.moveTo(q2[0],q2[1]); started=true; } else c.lineTo(q2[0],q2[1]); }
      else started=false;
    }
    c.stroke(); c.setLineDash([]); c.globalAlpha=1;
  }
  var below=[], placed=[];
  sky.planets.slice().sort(function(a,b){
    return (b.en==="Sun"?2:b.en==="Moon"?1:0)-(a.en==="Sun"?2:a.en==="Moon"?1:0); })
  .forEach(function(q){
    if(!MO.show[q.en]||!q.hz) return;
    if(q.hz.alt<-1){ below.push(q.en); return; }
    var pt=hxy(q.hz.alt,q.hz.az);
    var rr=S.w*(q.en==="Sun"?0.050:q.en==="Moon"?0.045:0.032);
    pt=moNudge(pt,placed,rr*2.15,cx,cy);
    placed.push(pt);
    if(q.en==="Sun"){ moGlowDot(pt[0],pt[1],rr,"#f0b847","#ffd37a");
      moText("Sū",pt[0],pt[1],rr*0.8,"#3a2a06","center",800); }
    else if(q.en==="Moon"){ moGlowDot(pt[0],pt[1],rr,"#e8eaf6","#ffffff");
      moText("Mo",pt[0],pt[1],rr*0.8,"#2a2f45","center",800); }
    else moGlyph(pt[0],pt[1],rr,q.en,P,true);
  });
  var lagA=hxy(0,90);
  moText("lagna rising",lagA[0]-S.w*0.085,lagA[1],S.w*0.024,P.gold,"center",600);
  return {ms:ms, sub:(day?"daylight":"night")+" · lagna "+SA[Math.floor(sky.lagna/30)%12]+
          (below.length?(" · below the horizon: "+below.map(function(x){return GL[x];}).join(" ")):"")};
 }},

/* ---------------------------------------------------------------- 5. nakshatras */
{key:"nakshatra", label:"Nakṣatra zoom", title:"The star behind the name",
 sub:"the yogatārā each nakṣatra is named after",
 draw:function(p){
  var P=moPal(), S=moSize(), st=moStage(), c=MO.ctx;
  var Y=(window.YOGATARAS||[]), n=Y.length||27;
  var each=1/n, idx=Math.min(n-1,Math.floor(p/each)), q=(p-idx*each)/each;
  var star=Y[idx]; if(!star) throw new Error("no star catalogue");
  /* hold wide, close in, hold tight — the ease is what makes it feel like a camera */
  var z=q<0.22?0:(q>0.72?1:(q-0.22)/0.5); z=z*z*(3-2*z);
  /* The ecliptic is drawn as a strip rather than a ring: on a vertical frame a ring
     puts the subject at the edge, and the whole point is the one star in the middle. */
  var halfWide=24, halfTight=2.2;                 // degrees of longitude either side
  var half=halfWide+(halfTight-halfWide)*z;
  var cx=st.cx, cy=st.cy, bw=S.w*0.94;
  var latSpan=12+(2.6-12)*z;
  function X(sid){ var d=sid-star.sid; if(d>180)d-=360; if(d<-180)d+=360;
                   return cx+(d/half)*(bw/2); }
  function Yy(lat){ return cy-(lat/latSpan)*(st.h*0.30); }
  moStars();
  /* the ecliptic itself */
  c.strokeStyle=P.line; c.lineWidth=2.5; c.globalAlpha=.75; c.setLineDash([7,9]);
  c.beginPath(); c.moveTo(cx-bw/2,Yy(0)); c.lineTo(cx+bw/2,Yy(0)); c.stroke();
  c.setLineDash([]); c.globalAlpha=1;
  moText("ecliptic",cx+bw/2,Yy(0)-S.w*0.024,S.w*0.021,P.dim,"right",500);
  /* nakṣatra boundaries, named */
  var seg=40/3;
  for(var k=-2;k<=2;k++){
    var ni=((idx+k)%27+27)%27, b0=ni*seg, b1=b0+seg;
    var x0=X(b0), x1=X(b1);
    if(x1<cx-bw/2-40||x0>cx+bw/2+40) continue;
    c.strokeStyle=P.gold; c.globalAlpha=.42; c.lineWidth=2; c.setLineDash([5,8]);
    c.beginPath(); c.moveTo(x0,cy-st.h*0.27); c.lineTo(x0,cy+st.h*0.30); c.stroke();
    c.setLineDash([]); c.globalAlpha=1;
    if(k===0){
      c.fillStyle="rgba(217,182,104,0.055)";
      c.fillRect(Math.max(cx-bw/2,x0),cy-st.h*0.27,
                 Math.min(cx+bw/2,x1)-Math.max(cx-bw/2,x0),st.h*0.57);
    }
    var mid=(x0+x1)/2;
    if(MO.opt.labels && x1-x0>S.w*0.18 && mid>cx-bw/2+S.w*0.06 && mid<cx+bw/2-S.w*0.06)
      moText(SKY_NAKA[ni],mid,cy+st.h*0.26,S.w*0.026,
             k===0?P.gold:P.dim,"center",k===0?700:500);
  }
  /* every bright star near the ecliptic that falls in view */
  (window.BRIGHT_STARS||[]).forEach(function(bs){
    var x=X(bs.sid); if(x<cx-bw/2-20||x>cx+bw/2+20) return;
    var y=Yy(bs.lat); if(y<st.y||y>st.capY) return;
    var r=(3.4-Math.min(3.2,bs.mag))*(2.2+z*5);
    c.globalAlpha=.8; moGlowDot(x,y,Math.max(2,r),P.star,P.star); c.globalAlpha=1;
    if(z>0.5 && MO.opt.labels)
      moText(bs.star,x,y-r-S.w*0.020,S.w*0.019,P.dim,"center",500);
  });
  /* the yogatārā */
  var sx=X(star.sid), sy=Yy(star.lat);
  var rr=S.w*(0.012+0.022*z);
  moGlowDot(sx,sy,rr,P.gold,P.gold);
  c.strokeStyle=P.gold; c.lineWidth=2.5; c.globalAlpha=.85;
  c.beginPath(); c.arc(sx,sy,rr*2.8+S.w*0.012,0,6.2832); c.stroke(); c.globalAlpha=1;
  /* a line down to the ecliptic, so the latitude is a distance you can see */
  c.strokeStyle=P.gold; c.globalAlpha=.5; c.lineWidth=1.8; c.setLineDash([3,5]);
  c.beginPath(); c.moveTo(sx,sy); c.lineTo(sx,Yy(0)); c.stroke();
  c.setLineDash([]); c.globalAlpha=1;
  /* type, drawn flat so nothing ever distorts */
  var ty=cy-st.h*0.40;
  moSerif(star.nak,cx,ty,S.w*0.074,P.gold);
  moText(star.star+"  ·  "+star.bayer,cx,ty+S.w*0.064,S.w*0.032,P.ink,"center",600);
  moText("magnitude "+star.mag.toFixed(2)+"   ·   "+star.sid.toFixed(2)+"° sidereal   ·   "+
         (star.lat>=0?"+":"")+star.lat.toFixed(2)+"° latitude",
         cx,ty+S.w*0.106,S.w*0.025,P.dim,"center",500);
  moText(star.inside?"falls inside the division named after it"
                    :"falls outside the division named after it",
         cx,cy+st.h*0.36,S.w*0.027,star.inside?P.benefic:P.malefic,"center",600);
  return {ms:null, sub:"nakṣatra "+(idx+1)+" of 27"};
 }},

/* -------------------------------------------------------------------- 6. daśā */
{key:"dasha", label:"Daśā ribbon", title:"A life in nine periods",
 sub:"Viṃśottarī mahādaśā and antardaśā",
 draw:function(p){
  var P=moPal(), S=moSize(), st=moStage(), c=MO.ctx;
  var tree=null;
  try{ tree=buildTree(MO.D); }catch(e){}
  if(!tree||!tree.length) throw new Error("no daśā tree");
  var j0=tree[0].dispStart!=null?tree[0].dispStart:tree[0].start;
  var j1=tree[tree.length-1].end;
  var jd=j0+(j1-j0)*p;
  var ms=(jd-2440587.5)*86400000;
  moStars();
  var bx=S.w*0.08, bw=S.w-bx*2;
  var by=st.cy-st.h*0.20, bh=st.h*0.11;
  function X(j){ return bx+bw*(j-j0)/(j1-j0); }
  /* mahādaśā band */
  tree.forEach(function(md,k){
    var s=md.dispStart!=null?md.dispStart:md.start;
    var x0=X(s), x1=X(md.end);
    var ben=MO_BEN[md.lord];
    c.fillStyle=(k%2)?"rgba(255,255,255,0.10)":"rgba(255,255,255,0.045)";
    c.fillRect(x0,by,x1-x0,bh);
    c.strokeStyle=P.line; c.lineWidth=1.5; c.strokeRect(x0,by,x1-x0,bh);
    if(x1-x0>S.w*0.035)
      moText(GL[md.lord],(x0+x1)/2,by+bh*0.5,S.w*0.028,ben?P.benefic:P.malefic,"center",700);
  });
  /* antardaśā band of the running mahādaśā */
  var cur=null;
  tree.forEach(function(md){ var s=md.dispStart!=null?md.dispStart:md.start;
    if(jd>=s&&jd<md.end) cur=md; });
  if(cur){
    var ay=by+bh*1.5, ah=bh*0.7;
    var s0=cur.dispStart!=null?cur.dispStart:cur.start;
    (cur.ads||[]).forEach(function(ad,k){
      var x0=bx+bw*0+ (ad.start-s0)/(cur.end-s0)*bw, x1=(ad.end-s0)/(cur.end-s0)*bw+bx;
      x0=bx+(ad.start-s0)/(cur.end-s0)*bw;
      c.fillStyle=(k%2)?"rgba(217,182,104,0.22)":"rgba(217,182,104,0.10)";
      c.fillRect(x0,ay,x1-x0,ah);
      if(x1-x0>S.w*0.03)
        moText(GL[ad.lord],(x0+x1)/2,ay+ah*0.5,S.w*0.022,P.ink,"center",600);
    });
    moText("antardaśā within "+MO_FULL[cur.lord],bx,ay+ah*1.75,S.w*0.023,P.dim,"left",500);
  }
  /* playhead */
  var px=X(jd);
  c.strokeStyle=P.gold; c.lineWidth=4;
  c.beginPath(); c.moveTo(px,by-S.w*0.03); c.lineTo(px,by+bh*2.35); c.stroke();
  moGlowDot(px,by-S.w*0.034,S.w*0.011,P.gold,P.gold);
  /* the chart turning beneath */
  var R=st.R*0.62, cx=st.cx, cy=st.cy+st.h*0.28;
  c.strokeStyle=P.line; c.lineWidth=2;
  c.beginPath(); c.arc(cx,cy,R,0,6.2832); c.stroke();
  var ring=[], gD=S.w*0.027;
  MO_NAMES.forEach(function(en){
    if(!MO.show[en]) return;
    var L=moSidAt(en,ms); if(L!=null) ring.push({en:en,lon:L});
  });
  moSpread(ring,R*0.84,gD);
  ring.forEach(function(q){
    var a=(180-q.lon)*Math.PI/180;
    moGlyph(cx+Math.cos(a)*q.r,cy-Math.sin(a)*q.r,gD,q.en,P,false);
  });
  if(cur) moText(MO_FULL[cur.lord]+" mahādaśā",cx,by+bh*3.2,S.w*0.034,P.gold,"center",700);
  var age=(jd-(MO.D&&MO.D.jd!=null?MO.D.jd:j0))/365.2564;
  return {ms:ms, sub:"age "+Math.max(0,age).toFixed(1)};
 }}
];
