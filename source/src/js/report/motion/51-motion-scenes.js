/* ===== The six scenes =====
   Each one declares a span of real time and knows how to draw a single instant of it.
   Progress runs 0→1 across whatever duration is set, so "the whole retrograde in
   fifteen seconds" is one control rather than a rate to work out. */

var MO_CACHE={};
/* The glances each graha casts, counted from itself. Everything looks at the 7th;
   Maṅgala adds the 4th and 8th, Guru the 5th and 9th, Śani the 3rd and 10th. */
var MO_SPECIAL={Sun:[180],Moon:[180],Mercury:[180],Venus:[180],
                Mars:[90,180,210],Jupiter:[120,180,240],Saturn:[60,180,270],
                Rahu:[180],Ketu:[180]};
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
  moText(moG(en),x,y+r*0.06,r*(MO.opt.symbols?1.15:0.95),P.ink,"center",700);
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
      moText(moSign(((sg%12)+12)%12),(X(a)+X(b))/2,by-S.w*0.035,S.w*0.030,P.dim,"center",600);
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
  var t0=Date.now(), t1=t0+moSpanMs();
  var ms=t0+(t1-t0)*p, R=st.R, cx=st.cx, cy=st.cy;
  moStars();
  /* rāśi ring */
  for(var s=0;s<12;s++){
    var a0=(180-s*30)*Math.PI/180, a1=(180-(s*30+30))*Math.PI/180;
    c.beginPath(); c.arc(cx,cy,R,-a0,-a1,false); c.arc(cx,cy,R*0.86,-a1,-a0,true); c.closePath();
    c.fillStyle=(s%2)?"rgba(255,255,255,0.055)":"rgba(255,255,255,0.02)"; c.fill();
    var am=(180-(s*30+15))*Math.PI/180;
    if(MO.opt.labels) moText(moSign(s),cx+Math.cos(am)*R*0.93,cy-Math.sin(am)*R*0.93,
      S.w*0.026,P.dim,"center",600);
  }
  c.strokeStyle=P.line; c.lineWidth=2;
  c.beginPath(); c.arc(cx,cy,R,0,6.2832); c.stroke();
  c.beginPath(); c.arc(cx,cy,R*0.86,0,6.2832); c.stroke();
  /* ingress flashes */
  var yrs=(t1-t0)/31556952000;
  var ing=moCached("ing|"+MO.opt.spanN+MO.opt.spanU,function(){
    var out=[], N=Math.min(1400,Math.max(60,Math.round(yrs*26)));
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
  var t0=moBirthMs(), t1=t0+moSpanMs();
  var ms=t0+(t1-t0)*p, cx=st.cx, cy=st.cy;
  var tilt=(28+22*Math.sin(p*Math.PI*2))*Math.PI/180;      // the camera breathes
  var kY=Math.cos(tilt);
  /* The lift is what pushed glyphs off the stage: at a steep tilt and a high multiplier
     a latitude of 5° could throw the Moon a long way past the frame. The ring and the
     worst lift together are measured against the stage, and everything is scaled to fit
     with a margin for the glyph and its label — so no slider setting can overflow. */
  var maxLat=0;
  MO_NAMES.forEach(function(en){
    if(!MO.show[en]||en==="Rahu"||en==="Ketu") return;
    try{ var e=Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body[en],new Date(ms),true));
         maxLat=Math.max(maxLat,Math.abs(e.elat)); }catch(e2){}
  });
  var lift=Math.sin(tilt)*(MO.opt.exag||26);
  var R=st.R*1.08;
  var halfH=R*kY+maxLat*lift+S.w*0.075;                   // glyph radius plus a little air
  var limit=st.h*0.46;
  if(halfH>limit){ var k=limit/halfH; R*=k; lift*=k; }
  if(R*1.0+S.w*0.05>st.w*0.5) R=st.w*0.5-S.w*0.05;
  moStars();
  function proj(lon,lat,rad){
    var a=(180-lon)*Math.PI/180, rr=(rad==null?R:rad);
    return [cx+Math.cos(a)*rr, cy-Math.sin(a)*rr*kY-lat*lift];
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
    moText(moSign(s),q[0],q[1]+(q[1]<cy?-S.w*0.028:S.w*0.030),S.w*0.024,P.dim,"center",600);
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
  /* crowding steps inward along the bearing, exactly as the wheel does, so a graha is
     never drawn at a longitude it is not at */
  moSpread(items,R,S.w*0.034);
  items.sort(function(a,b){ return proj(a.lon,a.lat,a.r)[1]-proj(b.lon,b.lat,b.r)[1]; });
  items.forEach(function(q){
    var pt=proj(q.lon,q.lat,q.r), base=proj(q.lon,0,q.r);
    c.strokeStyle=P.glow; c.globalAlpha=.85; c.lineWidth=3;
    c.beginPath(); c.moveTo(base[0],base[1]); c.lineTo(pt[0],pt[1]); c.stroke();
    moGlowDot(base[0],base[1],3.2,P.line,P.line); c.globalAlpha=1;
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
  var b=moBirthMs(), half=moSpanMs()/2;
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

/* ------------------------------------------------- 6. what turns and what does not */
{key:"frames", label:"What actually turns", title:"The rāśis never move",
 sub:"the lagna slides, the bhāvas follow, the zodiac stays put",
 draw:function(p){
  var P=moPal(), S=moSize(), st=moStage(), c=MO.ctx;
  var i=MO.J&&MO.J.input; if(!i) throw new Error("no birth data");
  /* one sidereal day, so the lagna makes exactly one circuit and the loop is seamless */
  var b=moBirthMs(), t0=b, t1=b+86164091, ms=t0+(t1-t0)*p;
  var sky=null;
  try{
    var d=new Date(ms), ut=d.getUTCHours()+d.getUTCMinutes()/60+d.getUTCSeconds()/3600;
    sky=window.quickSky({year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:d.getUTCDate(),
      hour:ut,minute:0,second:0,tzHours:0,lat:i.lat,lon:i.lon,ayanamsa:i.ayanamsa||"lahiri"});
  }catch(e){ throw e; }
  var lag=sky.lagna, R=st.R, cx=st.cx, cy=st.cy;
  var mode=MO.opt.houses||"both";
  moStars();
  /* the rāśi ring: FIXED. drawn at absolute sidereal longitude and never rotated */
  for(var s=0;s<12;s++){
    var a0=(180-s*30)*Math.PI/180, a1=(180-(s*30+30))*Math.PI/180;
    c.beginPath(); c.arc(cx,cy,R,-a0,-a1,false); c.arc(cx,cy,R*0.86,-a1,-a0,true); c.closePath();
    c.fillStyle=(s%2)?"rgba(255,255,255,0.07)":"rgba(255,255,255,0.025)"; c.fill();
    var am=(180-(s*30+15))*Math.PI/180;
    moText(moSign(s),cx+Math.cos(am)*R*0.93,cy-Math.sin(am)*R*0.93,
      S.w*(MO.opt.symbols?0.034:0.025),P.dim,"center",600);
  }
  c.strokeStyle=P.line; c.lineWidth=2.5;
  c.beginPath(); c.arc(cx,cy,R,0,6.2832); c.stroke();
  c.beginPath(); c.arc(cx,cy,R*0.86,0,6.2832); c.stroke();

  /* WHOLE SIGN: the bhāva is the whole rāśi the lagna is in, so the ring steps a
     sign at a time, roughly every two hours. That is not a shortcut in the drawing —
     it is what the convention says, and seeing it step is the point. */
  var h1=Math.floor(lag/30)%12;
  if(mode!=="equal"){
    for(var k=0;k<12;k++){
      var sg=(h1+k)%12, w0=sg*30, w1=w0+30;
      var q0=(180-w0)*Math.PI/180, q1=(180-w1)*Math.PI/180;
      c.beginPath(); c.arc(cx,cy,R*0.82,-q0,-q1,false); c.arc(cx,cy,R*0.56,-q1,-q0,true); c.closePath();
      c.fillStyle=(k===0)?"rgba(217,182,104,0.32)":
                  (k===3||k===6||k===9)?"rgba(217,182,104,0.13)":"rgba(255,255,255,0.03)";
      c.fill();
      c.strokeStyle=P.line; c.lineWidth=1.2; c.stroke();
      var bm=(180-(w0+15))*Math.PI/180;
      moText(String(k+1),cx+Math.cos(bm)*R*0.70,cy-Math.sin(bm)*R*0.70,
        S.w*0.030,k===0?P.gold:P.dim,"center",700);
    }
  }
  /* EQUAL FROM THE LAGNA: cusps at the lagna degree and every 30° after it, so they
     slide continuously — about one degree every four minutes. This is the motion the
     whole-sign ring is quietly counting. */
  if(mode!=="whole"){
    for(var e=0;e<12;e++){
      var cu=lag+e*30, ea=(180-cu)*Math.PI/180;
      c.strokeStyle=(e===0)?P.gold:P.benefic;
      c.lineWidth=(e===0)?3.5:2; c.globalAlpha=(e===0)?1:0.65;
      c.beginPath();
      c.moveTo(cx+Math.cos(ea)*R*0.38,cy-Math.sin(ea)*R*0.38);
      c.lineTo(cx+Math.cos(ea)*R*0.86,cy-Math.sin(ea)*R*0.86);
      c.stroke(); c.globalAlpha=1;
      if(mode==="equal"){
        var em=(180-(cu+15))*Math.PI/180;
        moText(String(e+1),cx+Math.cos(em)*R*0.62,cy-Math.sin(em)*R*0.62,
          S.w*0.028,e===0?P.gold:P.dim,"center",700);
      }
    }
  }
  /* the lagna degree itself — the only thing here that moves smoothly */
  var la=(180-lag)*Math.PI/180;
  c.strokeStyle=P.gold; c.lineWidth=4.5;
  c.beginPath();
  c.moveTo(cx+Math.cos(la)*R*1.05,cy-Math.sin(la)*R*1.05);
  c.lineTo(cx-Math.cos(la)*R*0.38,cy+Math.sin(la)*R*0.38);
  c.stroke();
  moGlowDot(cx+Math.cos(la)*R*0.94,cy-Math.sin(la)*R*0.94,S.w*0.017,P.gold,P.gold);
  var llx=Math.max(S.w*0.12,Math.min(S.w*0.88,cx+Math.cos(la)*R*1.16));
  moText("lagna",llx,cy-Math.sin(la)*R*1.16,S.w*0.028,P.gold,"center",700);

  /* the grahas: over a single day they barely move either, which is the other half
     of the point. Drawn inside the equal-house spokes so nothing overlaps. */
  var ring=[], gR=S.w*0.024;
  MO_NAMES.forEach(function(en){
    if(!MO.show[en]) return;
    var qq=null; sky.planets.forEach(function(z){ if(z.en===en) qq=z; });
    if(qq) ring.push({en:en,lon:qq.sid});
  });
  moSpread(ring,R*0.26,gR);
  ring.forEach(function(qq){
    var aa=(180-qq.lon)*Math.PI/180;
    moGlyph(cx+Math.cos(aa)*qq.r,cy-Math.sin(aa)*qq.r,gR,qq.en,P,false);
  });

  /* the moment the whole-sign ring steps round, called out as the event it is */
  var prevLag=null;
  try{
    var pm=ms-(t1-t0)/600, pd=new Date(pm);
    var put=pd.getUTCHours()+pd.getUTCMinutes()/60+pd.getUTCSeconds()/3600;
    prevLag=window.quickSky({year:pd.getUTCFullYear(),month:pd.getUTCMonth()+1,day:pd.getUTCDate(),
      hour:put,minute:0,second:0,tzHours:0,lat:i.lat,lon:i.lon,ayanamsa:i.ayanamsa||"lahiri"}).lagna;
  }catch(e){}
  if(prevLag!=null && Math.floor(prevLag/30)%12!==h1 && mode!=="equal"){
    var txt="lagna enters "+SA[h1]+" — the bhāvas step round";
    c.font='700 '+(S.w*0.034)+'px system-ui,sans-serif';
    var tw=c.measureText(txt).width;
    c.fillStyle=P.bg; c.globalAlpha=.88;
    c.fillRect(cx-tw/2-S.w*0.025,cy-S.w*0.042,tw+S.w*0.05,S.w*0.068); c.globalAlpha=1;
    moText(txt,cx,cy-S.w*0.009,S.w*0.034,P.gold,"center",700);
  }
  moText(mode==="equal"?"equal houses — the cusps slide":
         mode==="whole"?"whole-sign bhāvas — the ring steps":
         "gold spokes slide · the shaded ring steps",
    cx,cy+st.h*0.45,S.w*0.028,P.dim,"center",600);
  moText("rāśis fixed",cx,cy-st.h*0.45,S.w*0.030,P.dim,"center",600);
  var mins=(ms-b)/60000;
  return {ms:ms, sub:"lagna "+SA[h1]+" "+skyDM(lag)+" · "+
          (mins<60?(mins.toFixed(0)+" min"):((mins/60).toFixed(1)+" h"))+" after birth"};
 }},

/* ------------------------------------------------------------------ 7. ayanāṃśa */
{key:"ayanamsa", label:"Ayanāṃśa", title:"Two zodiacs, drifting apart",
 sub:"the equinox slips about one degree every seventy-two years",
 draw:function(p){
  var P=moPal(), S=moSize(), st=moStage(), c=MO.ctx;
  /* 4000 years, so the whole precessional story is visible in one loop */
  var y0=-500, y1=3500, yr=y0+(y1-y0)*p;
  var jd=2451545.0+(yr-2000)*365.2425;
  var ay=0;
  try{ ay=window.__ayanFor?window.__ayanFor("lahiri",jd):0; }catch(e){}
  var R=st.R, cx=st.cx, cy=st.cy;
  moStars();
  /* the sidereal ring — fixed to the stars, so it never rotates */
  for(var s=0;s<12;s++){
    var a0=(180-s*30)*Math.PI/180, a1=(180-(s*30+30))*Math.PI/180;
    c.beginPath(); c.arc(cx,cy,R,-a0,-a1,false); c.arc(cx,cy,R*0.82,-a1,-a0,true); c.closePath();
    c.fillStyle=(s%2)?"rgba(217,182,104,0.14)":"rgba(217,182,104,0.05)"; c.fill();
    var am=(180-(s*30+15))*Math.PI/180;
    moText(moSign(s),cx+Math.cos(am)*R*0.91,cy-Math.sin(am)*R*0.91,
      S.w*(MO.opt.symbols?0.032:0.023),P.gold,"center",600);
  }
  c.strokeStyle=P.gold; c.lineWidth=2.5; c.globalAlpha=.8;
  c.beginPath(); c.arc(cx,cy,R,0,6.2832); c.stroke(); c.globalAlpha=1;
  /* the tropical ring — tied to the equinox, so it creeps backwards against the stars */
  var rt=R*0.76;
  for(var t=0;t<12;t++){
    var b0=t*30+ay, b1=b0+30;
    var q0=(180-b0)*Math.PI/180, q1=(180-b1)*Math.PI/180;
    c.beginPath(); c.arc(cx,cy,rt,-q0,-q1,false); c.arc(cx,cy,rt*0.80,-q1,-q0,true); c.closePath();
    c.fillStyle=(t%2)?"rgba(111,124,192,0.22)":"rgba(111,124,192,0.08)"; c.fill();
    var tm=(180-(b0+15))*Math.PI/180;
    moText(moSign(t),cx+Math.cos(tm)*rt*0.90,cy-Math.sin(tm)*rt*0.90,
      S.w*(MO.opt.symbols?0.030:0.021),P.glow,"center",600);
  }
  c.strokeStyle=P.glow; c.lineWidth=2; c.globalAlpha=.8;
  c.beginPath(); c.arc(cx,cy,rt,0,6.2832); c.stroke(); c.globalAlpha=1;
  /* the gap between the two zero points IS the ayanāṃśa */
  var sa=(180-0)*Math.PI/180, ta=(180-ay)*Math.PI/180;
  [[sa,P.gold,"sidereal 0°"],[ta,P.glow,"tropical 0°"]].forEach(function(z){
    c.strokeStyle=z[1]; c.lineWidth=3.5;
    c.beginPath(); c.moveTo(cx,cy);
    c.lineTo(cx+Math.cos(z[0])*R*1.03,cy-Math.sin(z[0])*R*1.03); c.stroke();
    var lx=cx+Math.cos(z[0])*R*1.13, ly=cy-Math.sin(z[0])*R*1.13;
    lx=Math.max(S.w*0.13,Math.min(S.w*0.87,lx));      // never let the label leave the frame
    moText(z[2],lx,ly,S.w*0.024,z[1],"center",600);
  });
  c.strokeStyle=P.ink; c.lineWidth=5; c.globalAlpha=.9;
  c.beginPath(); c.arc(cx,cy,R*0.40,-sa,-ta,false); c.stroke(); c.globalAlpha=1;
  var mid=(180-ay/2)*Math.PI/180;
  moText(ay.toFixed(2)+"°",cx+Math.cos(mid)*R*0.30,cy-Math.sin(mid)*R*0.30,
    S.w*0.042,P.ink,"center",800);
  moText(yr<0?(Math.abs(Math.round(yr))+" BCE"):(Math.round(yr)+" CE"),
    cx,cy-st.h*0.44,S.w*0.046,P.ink,"center",700);
  moText("they met around 285 CE, and have separated ever since",
    cx,cy+st.h*0.44,S.w*0.026,P.dim,"center",500);
  return {ms:null, sub:"ayanāṃśa "+ay.toFixed(2)+"° · Lahiri"};
 }},

/* -------------------------------------------------------------------- 8. dṛṣṭi */
{key:"drishti", label:"Dṛṣṭi sweep", title:"Where a graha looks",
 sub:"every graha glances at the 7th; some glance further",
 draw:function(p){
  var P=moPal(), S=moSize(), st=moStage(), c=MO.ctx;
  var en=MO.opt.subject, t0=Date.now(), t1=t0+moSpanMs(), ms=t0+(t1-t0)*p;
  var L=moSidAt(en,ms); if(L==null) throw new Error("no position");
  var R=st.R, cx=st.cx, cy=st.cy;
  moStars();
  for(var s=0;s<12;s++){
    var a0=(180-s*30)*Math.PI/180, a1=(180-(s*30+30))*Math.PI/180;
    c.beginPath(); c.arc(cx,cy,R,-a0,-a1,false); c.arc(cx,cy,R*0.86,-a1,-a0,true); c.closePath();
    c.fillStyle=(s%2)?"rgba(255,255,255,0.055)":"rgba(255,255,255,0.02)"; c.fill();
    var am=(180-(s*30+15))*Math.PI/180;
    moText(moSign(s),cx+Math.cos(am)*R*0.93,cy-Math.sin(am)*R*0.93,
      S.w*(MO.opt.symbols?0.032:0.024),P.dim,"center",600);
  }
  c.strokeStyle=P.line; c.lineWidth=2;
  c.beginPath(); c.arc(cx,cy,R,0,6.2832); c.stroke();
  c.beginPath(); c.arc(cx,cy,R*0.86,0,6.2832); c.stroke();
  var offs=MO_SPECIAL[en]||[180], ben=!!MO_BEN[en], col=ben?P.benefic:P.malefic;
  function pt(deg,rad){ var a=(180-deg)*Math.PI/180;
    return [cx+Math.cos(a)*rad, cy-Math.sin(a)*rad]; }
  var src=pt(L,R*0.80);
  offs.forEach(function(off,ix){
    var tgt=pt(L+off,R*0.80);
    var full=(off===180);
    c.strokeStyle=col; c.lineWidth=full?5:3; c.globalAlpha=full?0.95:0.6;
    if(!full) c.setLineDash([12,10]);
    c.beginPath(); c.moveTo(src[0],src[1]); c.lineTo(tgt[0],tgt[1]); c.stroke();
    c.setLineDash([]); c.globalAlpha=1;
    moGlowDot(tgt[0],tgt[1],S.w*0.014,col,col);
    /* the sign the glance lands in gets lit */
    var sg=Math.floor(((L+off)%360+360)%360/30);
    var g0=(180-sg*30)*Math.PI/180, g1=(180-(sg*30+30))*Math.PI/180;
    c.beginPath(); c.arc(cx,cy,R,-g0,-g1,false); c.arc(cx,cy,R*0.86,-g1,-g0,true); c.closePath();
    c.fillStyle=col; c.globalAlpha=full?0.26:0.14; c.fill(); c.globalAlpha=1;
    var hn=Math.round(off/30)+1;
    moText(hn+"th",pt(L+off,R*1.09)[0],pt(L+off,R*1.09)[1],S.w*0.026,col,"center",700);
  });
  moGlyph(src[0],src[1],S.w*0.044,en,P,true);
  if(moSpeed(en,ms)<0) moText("R",src[0]+S.w*0.040,src[1]-S.w*0.036,S.w*0.024,P.malefic,"center",800);
  var note = (en==="Mars")?"Maṅgala adds the 4th and the 8th"
           : (en==="Jupiter")?"Guru adds the 5th and the 9th"
           : (en==="Saturn")?"Śani adds the 3rd and the 10th"
           : "the 7th alone — the full glance every graha casts";
  moText(note,cx,cy+st.h*0.44,S.w*0.028,P.dim,"center",600);
  return {ms:ms, sub:MO_FULL[en]+" in "+SA[Math.floor(L/30)%12]+" "+skyDM(L)};
 }},

/* --------------------------------------------------------------------- 9. tithi */
{key:"tithi", label:"Tithi & pakṣa", title:"A tithi is an angle",
 sub:"twelve degrees of the Moon pulling away from the Sun",
 draw:function(p){
  var P=moPal(), S=moSize(), st=moStage(), c=MO.ctx;
  var t0=Date.now(), t1=t0+29.530589*86400000, ms=t0+(t1-t0)*p;   // one synodic month
  var su=moSidAt("Sun",ms), mo=moSidAt("Moon",ms);
  if(su==null||mo==null) throw new Error("no position");
  var el=((mo-su)%360+360)%360;
  var ti=Math.floor(el/12)+1, pak=el<180?"Śukla":"Kṛṣṇa";
  var tiIn=ti>15?ti-15:ti;
  var R=st.R*0.86, cx=st.cx, cy=st.cy-st.h*0.06;
  moStars();
  /* the Moon's disc, lit by the elongation — the thing a tithi actually counts */
  var mr=st.R*0.42;
  /* The terminator is drawn as an explicit polygon rather than with arc/ellipse sweep
     flags, which are easy to get subtly wrong: at 230° the flagged version drew a full
     Moon instead of an 82% gibbous one. Here the lit edge is the limb and the inner edge
     is the terminator, whose projected half-width is r·cos(phase) — zero at the quarters,
     the full radius at new and at full, and bulging to whichever side the sign dictates. */
  c.fillStyle="#1a1f33";
  c.beginPath(); c.arc(cx,cy,mr,0,6.2832); c.fill();
  (function(){
    var waxing=el<180, ph=(waxing?el:360-el)*Math.PI/180, k=Math.cos(ph), sx=waxing?1:-1;
    var N=84, i, t;
    c.beginPath();
    for(i=0;i<=N;i++){ t=-Math.PI/2+Math.PI*i/N;
      var x=cx+sx*mr*Math.cos(t), y=cy+mr*Math.sin(t);
      if(i===0) c.moveTo(x,y); else c.lineTo(x,y); }
    for(i=N;i>=0;i--){ t=-Math.PI/2+Math.PI*i/N;
      c.lineTo(cx+sx*mr*k*Math.cos(t), cy+mr*Math.sin(t)); }
    c.closePath();
    c.fillStyle="#efe9d8"; c.fill();
  })();
  c.strokeStyle=P.line; c.lineWidth=2.5;
  c.beginPath(); c.arc(cx,cy,mr,0,6.2832); c.stroke();
  /* the angle itself, drawn as a dial around the disc */
  c.strokeStyle=P.line; c.lineWidth=1.6; c.globalAlpha=.5;
  c.beginPath(); c.arc(cx,cy,R,0,6.2832); c.stroke(); c.globalAlpha=1;
  function at2(deg,rad){ var a=(180-deg)*Math.PI/180;
    return [cx+Math.cos(a)*rad, cy-Math.sin(a)*rad]; }
  var sp=at2(0,R), mp=at2(el,R);
  c.strokeStyle=P.gold; c.lineWidth=3.5;
  c.beginPath(); c.moveTo(cx,cy); c.lineTo(sp[0],sp[1]); c.stroke();
  c.strokeStyle=P.ink; c.lineWidth=3.5;
  c.beginPath(); c.moveTo(cx,cy); c.lineTo(mp[0],mp[1]); c.stroke();
  c.strokeStyle=P.benefic; c.lineWidth=6; c.globalAlpha=.85;
  c.beginPath(); c.arc(cx,cy,R*0.62,-(180)*Math.PI/180,-(180-el)*Math.PI/180,true); c.stroke();
  c.globalAlpha=1;
  moGlowDot(sp[0],sp[1],S.w*0.030,"#f0b847","#ffd37a");
  moText(moG("Sun"),sp[0],sp[1],S.w*0.024,"#3a2a06","center",800);
  moGlowDot(mp[0],mp[1],S.w*0.028,"#e8eaf6","#ffffff");
  moText(moG("Moon"),mp[0],mp[1],S.w*0.022,"#2a2f45","center",800);
  /* the 30 tithi marks */
  for(var t=0;t<30;t++){
    var d0=at2(t*12,R*0.94), d1=at2(t*12,R);
    c.strokeStyle=(t%15===0)?P.gold:P.line; c.lineWidth=(t%15===0)?2.5:1;
    c.beginPath(); c.moveTo(d0[0],d0[1]); c.lineTo(d1[0],d1[1]); c.stroke();
  }
  moText(pak+" pakṣa",cx,cy-st.h*0.40,S.w*0.034,
    el<180?P.benefic:P.dim,"center",600);
  moSerif("Tithi "+tiIn,cx,cy+st.h*0.33,S.w*0.060,P.ink);
  moText(el.toFixed(1)+"° between them",cx,cy+st.h*0.40,S.w*0.027,P.dim,"center",500);
  return {ms:ms, sub:pak+" · tithi "+tiIn+" of 15 · elongation "+el.toFixed(1)+"°"};
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

/* ------------------------------------------------------------------ 10. eclipses */
function moEclipses(){
  return moCached("ecl|"+MO.opt.eclN,function(){
    var out=[], n=MO.opt.eclN||10, start=new Date();
    try{
      var e=Astronomy.SearchGlobalSolarEclipse(start);
      for(var i=0;i<n;i++){
        out.push({kind:"solar",type:e.kind,ms:e.peak.date.getTime(),
                  obsc:e.obscuration==null?1:e.obscuration,
                  lat:e.latitude,lon:e.longitude});
        e=Astronomy.NextGlobalSolarEclipse(e.peak);
      }
    }catch(err){}
    try{
      var l=Astronomy.SearchLunarEclipse(start);
      for(var j=0;j<n;j++){
        out.push({kind:"lunar",type:l.kind,ms:l.peak.date.getTime(),
                  obsc:l.obscuration==null?0:l.obscuration,
                  pen:l.sd_penum,par:l.sd_partial,tot:l.sd_total});
        l=Astronomy.NextLunarEclipse(l.peak);
      }
    }catch(err2){}
    out.sort(function(a,b){ return a.ms-b.ms; });
    /* the Jyotiṣa part: where it falls, and how near the node it is */
    out.forEach(function(x){
      var su=moSidAt("Sun",x.ms), mo=moSidAt("Moon",x.ms), ra=moSidAt("Rahu",x.ms);
      x.sun=su; x.moon=mo; x.rahu=ra;
      x.lon = (x.kind==="solar")?su:mo;
      if(x.lon!=null&&ra!=null){
        var d1=Math.abs(((x.lon-ra)%360+360)%360); if(d1>180)d1=360-d1;
        var d2=Math.abs(((x.lon-ra-180)%360+360)%360); if(d2>180)d2=360-d2;
        x.node=Math.min(d1,d2); x.which=(d1<=d2)?"Rāhu":"Ketu";
      }
    });
    return out;
  });
}
var MO_ECOL={total:"#e07a60",annular:"#d9b668",partial:"#8f96bb",penumbral:"#5a6a90",hybrid:"#c06a9a"};


/* Every eclipse inside an arbitrary window, rather than a fixed count from today.
   Both searches walk forward from the start of the span and stop once they pass its end. */
function moEclipsesIn(t0,t1){
  return moCached("eclin|"+Math.round(t0/3600000)+"|"+Math.round(t1/3600000),function(){
    var out=[], guard=0;
    try{
      var e=Astronomy.SearchGlobalSolarEclipse(new Date(t0));
      while(e && e.peak.date.getTime()<=t1 && guard++<400){
        out.push({kind:"solar",type:e.kind,ms:e.peak.date.getTime(),
                  obsc:e.obscuration==null?1:e.obscuration});
        e=Astronomy.NextGlobalSolarEclipse(e.peak);
      }
    }catch(err){}
    guard=0;
    try{
      var l=Astronomy.SearchLunarEclipse(new Date(t0));
      while(l && l.peak.date.getTime()<=t1 && guard++<400){
        out.push({kind:"lunar",type:l.kind,ms:l.peak.date.getTime(),
                  obsc:l.obscuration==null?0:l.obscuration});
        l=Astronomy.NextLunarEclipse(l.peak);
      }
    }catch(err2){}
    out.sort(function(a,b){ return a.ms-b.ms; });
    out.forEach(function(x){
      var ra=moSidAt("Rahu",x.ms);
      x.lon=(x.kind==="solar")?moSidAt("Sun",x.ms):moSidAt("Moon",x.ms);
      if(x.lon!=null&&ra!=null){
        var d1=Math.abs(((x.lon-ra)%360+360)%360); if(d1>180)d1=360-d1;
        var d2=Math.abs(((x.lon-ra-180)%360+360)%360); if(d2>180)d2=360-d2;
        x.node=Math.min(d1,d2); x.which=(d1<=d2)?"Rāhu":"Ketu";
      }
    });
    return out;
  });
}
/* The ecliptic limits: beyond roughly these distances from a node the geometry simply
   cannot line up. The solar limit is the wider of the two, which is why solar eclipses
   outnumber lunar ones. */
var MO_SOLAR_LIMIT=18.5, MO_LUNAR_LIMIT=12.2;

var MO_MORE=[

{key:"eclipseseason", label:"Eclipse seasons", title:"Why eclipses come in seasons",
 sub:"the nodes retreat, the Sun catches them twice a year",
 draw:function(p){
  var P=moPal(), S=moSize(), st=moStage(), c=MO.ctx;
  var t0=Date.now(), t1=t0+moSpanMs(), ms=t0+(t1-t0)*p;
  var su=moSidAt("Sun",ms), ra=moSidAt("Rahu",ms);
  if(su==null||ra==null) throw new Error("no position");
  var ke=((ra+180)%360+360)%360;
  var mo=moSidAt("Moon",ms);
  var E=moEclipsesIn(t0,t1);
  var R=st.R, cx=st.cx, cy=st.cy;
  moStars();
  function at4(deg,rad){ var a=(180-deg)*Math.PI/180;
    return [cx+Math.cos(a)*rad, cy-Math.sin(a)*rad]; }
  function band(centre,half,rIn,rOut,fill,alpha){
    var a0=(180-(centre-half))*Math.PI/180, a1=(180-(centre+half))*Math.PI/180;
    c.beginPath(); c.arc(cx,cy,rOut,-a0,-a1,false); c.arc(cx,cy,rIn,-a1,-a0,true); c.closePath();
    c.fillStyle=fill; c.globalAlpha=alpha; c.fill(); c.globalAlpha=1;
  }
  /* the zodiac, faint — this scene is about the geometry, not the signs */
  for(var s=0;s<12;s++){
    var a0=(180-s*30)*Math.PI/180, a1=(180-(s*30+30))*Math.PI/180;
    c.beginPath(); c.arc(cx,cy,R,-a0,-a1,false); c.arc(cx,cy,R*0.90,-a1,-a0,true); c.closePath();
    c.fillStyle=(s%2)?"rgba(255,255,255,0.045)":"rgba(255,255,255,0.015)"; c.fill();
    if(MO.opt.labels){
      var am=(180-(s*30+15))*Math.PI/180;
      moText(moSign(s),cx+Math.cos(am)*R*0.95,cy-Math.sin(am)*R*0.95,
        S.w*(MO.opt.symbols?0.028:0.020),P.dim,"center",600);
    }
  }
  /* the eclipse windows around each node: wider for solar, narrower for lunar */
  var dSun=Math.min(Math.abs(((su-ra)%360+360)%360)>180?360-Math.abs(((su-ra)%360+360)%360):Math.abs(((su-ra)%360+360)%360),
                    Math.abs(((su-ke)%360+360)%360)>180?360-Math.abs(((su-ke)%360+360)%360):Math.abs(((su-ke)%360+360)%360));
  var season=dSun<=MO_SOLAR_LIMIT;
  [ra,ke].forEach(function(nd){
    band(nd,MO_SOLAR_LIMIT,R*0.56,R*0.90,season?"#d9b668":"#6f7cc0",season?0.30:0.13);
    band(nd,MO_LUNAR_LIMIT,R*0.56,R*0.90,season?"#e07a60":"#6f7cc0",season?0.22:0.10);
  });
  c.strokeStyle=P.line; c.lineWidth=2;
  c.beginPath(); c.arc(cx,cy,R,0,6.2832); c.stroke();
  c.beginPath(); c.arc(cx,cy,R*0.90,0,6.2832); c.stroke();
  /* the nodal axis — the slow hand of this clock */
  var rp=at4(ra,R*0.90), kp=at4(ke,R*0.90);
  c.strokeStyle=P.glow; c.lineWidth=4; c.globalAlpha=.9;
  c.beginPath(); c.moveTo(rp[0],rp[1]); c.lineTo(kp[0],kp[1]); c.stroke(); c.globalAlpha=1;
  /* where the axis started, so its retreat is visible */
  var ra0=moSidAt("Rahu",t0);
  if(ra0!=null){
    var q0=at4(ra0,R*0.90), q1=at4(ra0+180,R*0.90);
    c.strokeStyle=P.glow; c.lineWidth=1.5; c.globalAlpha=.28; c.setLineDash([6,8]);
    c.beginPath(); c.moveTo(q0[0],q0[1]); c.lineTo(q1[0],q1[1]); c.stroke();
    c.setLineDash([]); c.globalAlpha=1;
  }
  /* Sun, Moon and the two nodes */
  var sp=at4(su,R*0.73);
  if(mo!=null && MO.show.Moon){
    var mp=at4(mo,R*0.73);
    c.strokeStyle=P.dim; c.lineWidth=1.6; c.globalAlpha=.45;
    c.beginPath(); c.moveTo(sp[0],sp[1]); c.lineTo(mp[0],mp[1]); c.stroke(); c.globalAlpha=1;
    moGlowDot(mp[0],mp[1],S.w*0.030,"#e8eaf6","#ffffff");
    moText(moG("Moon"),mp[0],mp[1],S.w*0.022,"#2a2f45","center",800);
  }
  moGlowDot(sp[0],sp[1],S.w*0.038,"#f0b847","#ffd37a");
  moText(moG("Sun"),sp[0],sp[1],S.w*0.026,"#3a2a06","center",800);
  [[ra,"Rahu"],[ke,"Ketu"]].forEach(function(nd){
    var q=at4(nd[0],R*0.90);
    moGlyph(q[0],q[1],S.w*0.030,nd[1],P,true);
  });
  /* an eclipse happening right now, and the running tally */
  /* The flash marks an eclipse as the playhead passes it. Its width is set in frames
     rather than in days: a fixed number of days would be invisible at a long span and a
     fixed fraction of the span would, at twenty years, announce an eclipse three months
     away while the geometry on screen plainly says none is possible. */
  var win=(t1-t0)/80, flash=null, done=0;
  E.forEach(function(x){
    if(x.ms<=ms) done++;
    if(Math.abs(ms-x.ms)<win && (flash==null||Math.abs(ms-x.ms)<Math.abs(ms-flash.ms))) flash=x;
  });
  if(flash){
    var k=1-Math.abs(ms-flash.ms)/win;
    var fl=at4(flash.lon!=null?flash.lon:su,R*0.73);
    c.strokeStyle=flash.kind==="solar"?"#f0b847":"#c89078";
    c.lineWidth=4; c.globalAlpha=k;
    c.beginPath(); c.arc(fl[0],fl[1],S.w*0.055+(1-k)*S.w*0.06,0,6.2832); c.stroke();
    c.globalAlpha=1;
    var txt=(flash.type||"").charAt(0).toUpperCase()+(flash.type||"").slice(1)+" "+
            (flash.kind==="solar"?"solar":"lunar")+" eclipse  ·  "+moFmtDate(flash.ms);
    c.font='700 '+(S.w*0.030)+'px system-ui,sans-serif';
    var tw=c.measureText(txt).width;
    c.fillStyle=P.bg; c.globalAlpha=k*0.85;
    c.fillRect(cx-tw/2-S.w*0.025,cy-S.w*0.038,tw+S.w*0.05,S.w*0.064); c.globalAlpha=1;
    c.globalAlpha=Math.max(0.25,k);
    moText(txt,cx,cy-S.w*0.006,S.w*0.030,flash.kind==="solar"?P.gold:"#c89078","center",700);
    c.globalAlpha=1;
  } else {
    moText(season?"eclipse season":"no eclipse possible",cx,cy-S.w*0.012,S.w*0.034,
      season?P.gold:P.dim,"center",700);
    moText(dSun.toFixed(1)+"° from the node",cx,cy+S.w*0.028,S.w*0.026,P.dim,"center",500);
  }
  /* the strip of the whole span */
  var sy=st.capY-st.h*0.035, x0=S.w*0.08, x1=S.w*0.92;
  c.strokeStyle=P.line; c.lineWidth=1.5;
  c.beginPath(); c.moveTo(x0,sy); c.lineTo(x1,sy); c.stroke();
  E.forEach(function(x){
    var ex=x0+(x1-x0)*(x.ms-t0)/(t1-t0);
    c.fillStyle=MO_ECOL[x.type]||P.dim; c.globalAlpha=(x.ms<=ms)?0.95:0.3;
    c.beginPath(); c.arc(ex,sy+(x.kind==="solar"?-S.w*0.011:S.w*0.011),S.w*0.006,0,6.2832); c.fill();
    c.globalAlpha=1;
  });
  var px=x0+(x1-x0)*p;
  c.strokeStyle=P.gold; c.lineWidth=2.5;
  c.beginPath(); c.moveTo(px,sy-S.w*0.024); c.lineTo(px,sy+S.w*0.024); c.stroke();
  moText("☉ above the line · ☾ below",x0,sy+S.w*0.042,S.w*0.019,P.dim,"left",500);
  var moved=null;
  if(ra0!=null){ moved=((ra0-ra)%360+360)%360; if(moved>180) moved-=360; }
  moText("the nodes retreat 19.3° a year — this axis has moved "+
    (moved==null?"—":Math.abs(moved).toFixed(0)+"°")+" so far",
    cx,cy+R*1.10,S.w*0.024,P.dim,"center",500);
  return {ms:ms, sub:done+" of "+E.length+" eclipses · Sūrya "+dSun.toFixed(1)+"° from "+
          (Math.abs(((su-ra)%360+360)%360)<90||Math.abs(((su-ra)%360+360)%360)>270?"Rāhu":"Ketu")};
 }},
{key:"eclipse", label:"Eclipses ahead", title:"Eclipses only happen at the nodes",
 sub:"every one of them within a few degrees of Rāhu or Ketu",
 draw:function(p){
  var P=moPal(), S=moSize(), st=moStage(), c=MO.ctx;
  var E=moEclipses(); if(!E.length) throw new Error("no eclipse data");
  var n=E.length, each=1/n, idx=Math.min(n-1,Math.floor(p/each)), q=(p-idx*each)/each;
  var x=E[idx];
  moStars();
  var cx=st.cx, cy=st.cy-st.h*0.06, R=st.R*0.56;
  /* the discs. The type, the time and the depth are computed; the path across the
     disc is schematic — a real one depends on where on Earth you stand. */
  var sep=(1-Math.abs(q*2-1));                 // 0 at the edges of the slot, 1 at peak
  var ease=sep*sep*(3-2*sep);
  var dir=(q<0.5)?-1:1;                        // in from one side, out the other
  if(x.kind==="solar"){
    /* At peak the centres are separated by (1 − obscuration) of a radius: zero for a
       total, the full radius when almost nothing is covered. An annular Moon is drawn
       smaller than the Sun, which is what makes the ring. Everything is clipped to the
       Sun's own disc, so the Moon only ever darkens the Sun rather than floating beside it. */
    var obsc=(x.obsc==null?1:x.obsc);
    var peakSep=R*(1-Math.max(0,Math.min(1,obsc)));
    var dx=dir*(peakSep+(1-ease)*(R*2.2));
    var mr=R*(x.type==="annular"?0.88:1.03);
    moGlowDot(cx,cy,R,"#f0b847","#ffd37a");
    c.save();
    c.beginPath(); c.arc(cx,cy,R,0,6.2832); c.clip();
    c.fillStyle=P.bg;
    c.beginPath(); c.arc(cx+dx,cy,mr,0,6.2832); c.fill();
    c.restore();
    c.strokeStyle="#ffd37a"; c.lineWidth=2; c.globalAlpha=.55;
    c.beginPath(); c.arc(cx,cy,R,0,6.2832); c.stroke(); c.globalAlpha=1;
    /* the Moon's own outline, so its path is readable even outside the Sun */
    c.strokeStyle=P.dim; c.lineWidth=1.5; c.globalAlpha=.35;
    c.beginPath(); c.arc(cx+dx,cy,mr,0,6.2832); c.stroke(); c.globalAlpha=1;
  } else {
    /* Earth's shadow, with the Moon crossing it. How deep it goes is set by the type:
       a total eclipse passes through the middle, a penumbral only grazes the outer cone. */
    /* Earth's umbra is about two and a half Moon-widths across at the Moon's distance,
       which is why a total lunar eclipse can last an hour. How deep the Moon goes is set
       by the type, not guessed: a total passes through the middle and turns red, a partial
       clips the umbra's edge, and a penumbral never reaches the umbra at all — which is
       exactly why a penumbral eclipse is so easy to miss. */
    var ru=R*0.96, rp=R*1.72, mr2=ru/2.6;
    c.fillStyle="rgba(90,106,144,0.16)";
    c.beginPath(); c.arc(cx,cy,rp,0,6.2832); c.fill();
    c.strokeStyle=P.line; c.lineWidth=1.5; c.globalAlpha=.55;
    c.beginPath(); c.arc(cx,cy,rp,0,6.2832); c.stroke(); c.globalAlpha=1;
    c.fillStyle="rgba(16,20,34,0.94)";
    c.beginPath(); c.arc(cx,cy,ru,0,6.2832); c.fill();
    moText("umbra",cx,cy+ru*0.62,S.w*0.021,P.dim,"center",500);
    moText("penumbra",cx,cy+rp*0.80,S.w*0.020,P.dim,"center",500);
    var my = (x.type==="total") ? cy
           : (x.type==="partial") ? cy-(ru-mr2*0.55)
           : cy-(ru+mr2*0.85);                       // penumbral: never touches the umbra
    var mx=cx+dir*(1-ease)*rp*1.9;
    var d=Math.hypot(mx-cx,my-cy);
    var col;
    if(x.type==="penumbral") col="#ddd8c8";          // only dimmed, never reddened
    else if(d<ru-mr2*0.6) col="#a85c45";
    else if(d<ru+mr2*0.6) col="#c89078";
    else col="#efe9d8";
    moGlowDot(mx,my,mr2,col,"#ffffff");
    c.strokeStyle=P.line; c.lineWidth=1.2; c.globalAlpha=.4;
    c.beginPath(); c.arc(mx,my,mr2,0,6.2832); c.stroke(); c.globalAlpha=1;
  }
  /* which rāśi and nakṣatra it lands in, and how far from the node */
  var ty=cy+R*(x.kind==="solar"?1.45:2.25);
  var label=(x.type||"").charAt(0).toUpperCase()+(x.type||"").slice(1);
  moSerif(label+" "+(x.kind==="solar"?"solar":"lunar")+" eclipse",cx,st.y+st.h*0.09,S.w*0.052,P.ink);
  moText(moFmtDate(x.ms)+" · "+new Date(x.ms).toISOString().slice(11,16)+" UTC",
    cx,st.y+st.h*0.145,S.w*0.028,P.gold,"center",600);
  if(x.lon!=null){
    var nk=null; try{ nk=nakOf(x.lon); }catch(e){}
    moText((x.kind==="solar"?"Sūrya":"Candra")+" in "+SA[Math.floor(x.lon/30)%12]+" "+skyDM(x.lon)+
      (nk?("  ·  "+nk.name+" pāda "+nk.pada):""),
      cx,st.capY-st.h*0.13,S.w*0.026,P.dim,"center",500);
  }
  if(x.node!=null)
    moText(x.node.toFixed(1)+"° from "+x.which,cx,st.capY-st.h*0.08,S.w*0.034,
      x.node<12?P.benefic:P.dim,"center",700);
  /* the strip of everything coming */
  var sy=st.capY-st.h*0.030, x0=S.w*0.08, x1=S.w*0.92;
  c.strokeStyle=P.line; c.lineWidth=1.5;
  c.beginPath(); c.moveTo(x0,sy); c.lineTo(x1,sy); c.stroke();
  E.forEach(function(ev,k){
    var ex=x0+(x1-x0)*k/Math.max(1,n-1);
    var col=MO_ECOL[ev.type]||P.dim;
    c.fillStyle=col; c.globalAlpha=(k===idx)?1:0.45;
    c.beginPath(); c.arc(ex,sy,(k===idx)?S.w*0.011:S.w*0.006,0,6.2832); c.fill();
    c.globalAlpha=1;
    if(k===idx) moText(ev.kind==="solar"?"☉":"☾",ex,sy-S.w*0.030,S.w*0.024,col,"center",700);
  });
  return {ms:null, sub:(idx+1)+" of "+n+" ahead · the geometry is schematic, the timing is computed"};
 }},

/* ------------------------------------------------------------- 11. combustion */
{key:"astanga", label:"Combustion", title:"Swallowed by the Sun",
 sub:"astaṅgata — a graha too close to Sūrya to be seen",
 draw:function(p){
  var P=moPal(), S=moSize(), st=moStage(), c=MO.ctx;
  var t0=Date.now(), t1=t0+moSpanMs(), ms=t0+(t1-t0)*p;
  var su=moSidAt("Sun",ms); if(su==null) throw new Error("no Sun");
  var R=st.R, cx=st.cx, cy=st.cy;
  moStars();
  /* the zodiac, drawn relative to the Sun so Sūrya stays at the top and the
     grahas drift past him — which is what combustion actually looks like */
  for(var s=0;s<12;s++){
    var base=s*30-su+90;
    var a0=(180-base)*Math.PI/180, a1=(180-(base+30))*Math.PI/180;
    c.beginPath(); c.arc(cx,cy,R,-a0,-a1,false); c.arc(cx,cy,R*0.88,-a1,-a0,true); c.closePath();
    c.fillStyle=(s%2)?"rgba(255,255,255,0.05)":"rgba(255,255,255,0.018)"; c.fill();
    var am=(180-(base+15))*Math.PI/180;
    moText(moSign(s),cx+Math.cos(am)*R*0.94,cy-Math.sin(am)*R*0.94,
      S.w*(MO.opt.symbols?0.030:0.022),P.dim,"center",600);
  }
  c.strokeStyle=P.line; c.lineWidth=2;
  c.beginPath(); c.arc(cx,cy,R,0,6.2832); c.stroke();
  function at3(rel,rad){ var a=(180-(rel+90))*Math.PI/180;
    return [cx+Math.cos(a)*rad, cy-Math.sin(a)*rad]; }
  /* the glare: each graha has its own orb, so the zone is drawn per graha, widest first */
  var orbs=[["Mars",17],["Saturn",16],["Mercury",14],["Moon",12],["Jupiter",11],["Venus",10]];
  orbs.forEach(function(o,k){
    var g=c.createRadialGradient(at3(0,R*0.72)[0],at3(0,R*0.72)[1],2,
                                 at3(0,R*0.72)[0],at3(0,R*0.72)[1],R*0.9);
    g.addColorStop(0,"rgba(240,184,71,0.16)"); g.addColorStop(1,"rgba(240,184,71,0)");
    if(k===0){ c.fillStyle=g; c.beginPath(); c.arc(cx,cy,R*0.96,0,6.2832); c.fill(); }
    var a0=(180-(90-o[1]))*Math.PI/180, a1=(180-(90+o[1]))*Math.PI/180;
    c.strokeStyle="rgba(240,184,71,0.5)"; c.lineWidth=1.2; c.setLineDash([3,6]);
    [o[1],-o[1]].forEach(function(e){
      var q=at3(e,R*0.88), q2=at3(e,R*0.40);
      c.beginPath(); c.moveTo(q2[0],q2[1]); c.lineTo(q[0],q[1]); c.stroke();
    });
    c.setLineDash([]);
  });
  var sp=at3(0,R*0.72);
  moGlowDot(sp[0],sp[1],S.w*0.050,"#f0b847","#ffd37a");
  moText(moG("Sun"),sp[0],sp[1],S.w*0.030,"#3a2a06","center",800);
  var items=[], burnt=[];
  [["Moon",12],["Mars",17],["Mercury",14],["Jupiter",11],["Venus",10],["Saturn",16]].forEach(function(o){
    if(!MO.show[o[0]]) return;
    var L=moSidAt(o[0],ms); if(L==null) return;
    var rel=((L-su)%360+360)%360; if(rel>180) rel-=360;
    var comb=Math.abs(rel)<=o[1];
    items.push({en:o[0],lon:((rel+360)%360),rel:rel,comb:comb,orb:o[1]});
    if(comb) burnt.push(o[0]);
  });
  moSpread(items,R*0.72,S.w*0.033);
  items.forEach(function(it){
    var q=at3(it.rel,it.r);
    if(it.comb){ c.globalAlpha=.45; }
    moGlyph(q[0],q[1],S.w*0.033,it.en,P,!it.comb);
    c.globalAlpha=1;
    if(it.comb) moText("astaṅgata",q[0],q[1]+S.w*0.052,S.w*0.019,P.gold,"center",600);
    else moText(Math.abs(it.rel).toFixed(0)+"°",q[0],q[1]+S.w*0.050,S.w*0.020,P.dim,"center",500);
  });
  moText("the dashed lines are each graha's own orb — 17° for Maṅgala, 10° for Śukra",
    cx,cy+st.h*0.45,S.w*0.024,P.dim,"center",500);
  return {ms:ms, sub: burnt.length ? ("combust: "+burnt.map(function(x){return MO_FULL[x];}).join(", "))
                                   : "nothing combust at this moment"};
 }},

/* --------------------------------------------------------------- 12. dignity */
{key:"dignity", label:"Dignity sweep", title:"The same graha, better and worse",
 sub:"exaltation, own sign, friend, enemy, fall",
 draw:function(p){
  var P=moPal(), S=moSize(), st=moStage(), c=MO.ctx;
  var en=MO.opt.subject==="Moon"?"Mars":MO.opt.subject;
  var t0=Date.now(), t1=t0+moSpanMs(), ms=t0+(t1-t0)*p;
  var L=moSidAt(en,ms); if(L==null) throw new Error("no position");
  var R=st.R, cx=st.cx, cy=st.cy;
  var COL={exalted:P.benefic,moolatrikona:"#7fc9a0",own:"#9fd0b4",friend:"#9aa7d6",
           neutral:P.dim,enemy:"#d29a86",debilitated:P.malefic,node:P.dim};
  moStars();
  for(var s=0;s<12;s++){
    var dg="neutral";
    try{ dg=dignity(en,s,15); }catch(e){}
    var a0=(180-s*30)*Math.PI/180, a1=(180-(s*30+30))*Math.PI/180;
    c.beginPath(); c.arc(cx,cy,R,-a0,-a1,false); c.arc(cx,cy,R*0.70,-a1,-a0,true); c.closePath();
    c.fillStyle=COL[dg]||P.dim; c.globalAlpha=(dg==="neutral")?0.10:0.30; c.fill(); c.globalAlpha=1;
    c.strokeStyle=P.line; c.lineWidth=1; c.stroke();
    var am=(180-(s*30+15))*Math.PI/180;
    moText(moSign(s),cx+Math.cos(am)*R*0.93,cy-Math.sin(am)*R*0.93,
      S.w*(MO.opt.symbols?0.032:0.023),P.ink,"center",600);
    if(dg!=="neutral"&&dg!=="friend")
      moText(dg==="moolatrikona"?"mūlatrikoṇa":dg,
        cx+Math.cos(am)*R*0.79,cy-Math.sin(am)*R*0.79,S.w*0.018,COL[dg],"center",700);
  }
  c.strokeStyle=P.line; c.lineWidth=2.5;
  c.beginPath(); c.arc(cx,cy,R,0,6.2832); c.stroke();
  var sg=Math.floor(L/30)%12, dgNow="neutral";
  try{ dgNow=dignity(en,sg,L%30); }catch(e){}
  var a=(180-L)*Math.PI/180;
  var gx=cx+Math.cos(a)*R*0.56, gy=cy-Math.sin(a)*R*0.56;
  c.strokeStyle=COL[dgNow]; c.lineWidth=3; c.globalAlpha=.6;
  c.beginPath(); c.moveTo(cx,cy); c.lineTo(gx,gy); c.stroke(); c.globalAlpha=1;
  moGlyph(gx,gy,S.w*0.044,en,P,true);
  moSerif(dgNow==="moolatrikona"?"mūlatrikoṇa":dgNow,cx,cy+st.h*0.42,S.w*0.052,COL[dgNow]);
  return {ms:ms, sub:MO_FULL[en]+" in "+SA[sg]+" "+skyDM(L)};
 }},

/* -------------------------------------------------------------- 13. sade sati */
{key:"sadesati", label:"Sade Sati", title:"Śani over the Moon",
 sub:"the twelfth, the first and the second from Candra",
 draw:function(p){
  var P=moPal(), S=moSize(), st=moStage(), c=MO.ctx;
  if(!MO.D||!MO.D.P||!MO.D.P.Moon) throw new Error("no natal Moon");
  var moonSid=MO.D.P.Moon.sid, mSign=Math.floor(moonSid/30)%12;
  var b=moBirthMs(), t0=b, t1=b+90*31556952000, ms=t0+(t1-t0)*p;
  var sa=moSidAt("Saturn",ms); if(sa==null) throw new Error("no Śani");
  var R=st.R, cx=st.cx, cy=st.cy;
  moStars();
  var phase=((Math.floor(sa/30)%12)-mSign+12)%12;
  var inSS=(phase===11||phase===0||phase===1);
  var dhaiya=(phase===3||phase===7);
  for(var s=0;s<12;s++){
    var rel=(s-mSign+12)%12;
    var a0=(180-s*30)*Math.PI/180, a1=(180-(s*30+30))*Math.PI/180;
    c.beginPath(); c.arc(cx,cy,R,-a0,-a1,false); c.arc(cx,cy,R*0.72,-a1,-a0,true); c.closePath();
    c.fillStyle=(rel===11||rel===0||rel===1)?"rgba(224,122,96,0.30)":
                (rel===3||rel===7)?"rgba(217,182,104,0.20)":"rgba(255,255,255,0.03)";
    c.fill();
    c.strokeStyle=P.line; c.lineWidth=1; c.stroke();
    var am=(180-(s*30+15))*Math.PI/180;
    moText(moSign(s),cx+Math.cos(am)*R*0.93,cy-Math.sin(am)*R*0.93,
      S.w*(MO.opt.symbols?0.032:0.023),P.dim,"center",600);
    if(rel===11||rel===0||rel===1)
      moText(["rising","peak","setting"][rel===11?0:(rel===0?1:2)],
        cx+Math.cos(am)*R*0.80,cy-Math.sin(am)*R*0.80,S.w*0.019,P.malefic,"center",700);
  }
  c.strokeStyle=P.line; c.lineWidth=2.5;
  c.beginPath(); c.arc(cx,cy,R,0,6.2832); c.stroke();
  var ma=(180-moonSid)*Math.PI/180;
  moGlowDot(cx+Math.cos(ma)*R*0.56,cy-Math.sin(ma)*R*0.56,S.w*0.034,"#e8eaf6","#ffffff");
  moText(moG("Moon"),cx+Math.cos(ma)*R*0.56,cy-Math.sin(ma)*R*0.56,S.w*0.024,"#2a2f45","center",800);
  moText("natal Candra",cx+Math.cos(ma)*R*0.40,cy-Math.sin(ma)*R*0.40,S.w*0.020,P.dim,"center",500);
  var sa2=(180-sa)*Math.PI/180;
  moGlyph(cx+Math.cos(sa2)*R*0.86,cy-Math.sin(sa2)*R*0.86,S.w*0.040,"Saturn",P,true);
  var age=(ms-b)/31556952000;
  moSerif(inSS?"Sade Sati":(dhaiya?"Dhaiyā":"clear"),cx,cy+st.h*0.42,S.w*0.054,
    inSS?P.malefic:(dhaiya?P.gold:P.benefic));
  moText("age "+age.toFixed(0),cx,cy-st.h*0.45,S.w*0.034,P.ink,"center",700);
  return {ms:ms, sub:"Śani in "+SA[Math.floor(sa/30)%12]+" · "+
          (inSS?(["rising","peak","setting"][phase===11?0:(phase===0?1:2)]+" phase")
               :(dhaiya?("Dhaiyā — the "+(phase+1)+"th from Candra"):"not over the Moon"))};
 }}
];
MO_SCENES=MO_SCENES.concat(MO_MORE);


