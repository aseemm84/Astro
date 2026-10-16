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
/* Every retrograde period of a graha inside a window, rather than the one nearest
   to today. A coarse scan finds each change of direction and a bisection pins it
   down; the stride is chosen so it cannot step over the shortest retrograde there
   is — Budha's, at about three weeks — while still costing only a few hundred
   samples for a decade.

   A period already running when the window opens, or still running when it
   closes, is kept and marked as clipped: it is a real retrograde and leaving it
   out would be a lie about the window. */
var MO_RSTRIDE={Mercury:2,Venus:3,Mars:4,Jupiter:5,Saturn:6};
function moRetroLoops(en,t0,t1){
  return moCached("rloops|"+en+"|"+Math.round(t0/3600000)+"|"+Math.round(t1/3600000),function(){
    var DAY=86400000, stride=(MO_RSTRIDE[en]||4)*DAY;
    var pre=160*DAY;                       /* reach back far enough to catch one in progress */
    var n=Math.ceil((t1-t0+pre*2)/stride), out=[];
    if(n>6000) { stride=(t1-t0+pre*2)/6000; n=6000; }
    function retroAt(m){ return moSpeed(en,m)<0; }
    function station(a,b,wantRetro){
      /* bisect to the hour: the direction differs at the ends by construction */
      for(var i=0;i<40&&b-a>3600000;i++){
        var mid=(a+b)/2;
        if(retroAt(mid)===wantRetro) b=mid; else a=mid;
      }
      return (a+b)/2;
    }
    var prevM=t0-pre, prevR=retroAt(prevM), openAt=prevR?prevM:null, openClipped=prevR;
    for(var k=1;k<=n;k++){
      var m=t0-pre+k*stride, r=retroAt(m);
      if(r&&!prevR){ openAt=station(prevM,m,true); openClipped=false; }
      else if(!r&&prevR&&openAt!=null){
        var endAt=station(prevM,m,false);
        if(endAt>t0&&openAt<t1)
          out.push({s:openAt,e:endAt,cs:openClipped||openAt<t0,ce:endAt>t1});
        openAt=null; openClipped=false;
      }
      prevM=m; prevR=r;
    }
    if(openAt!=null&&openAt<t1) out.push({s:openAt,e:t1,cs:openClipped||openAt<t0,ce:true});
    /* fill in where each one begins and ends in the zodiac */
    out.forEach(function(w){
      w.lonS=moSidAt(en,w.s); w.lonE=moSidAt(en,w.e);
      w.days=(w.e-w.s)/DAY;
    });
    return out;
  });
}
/* When the window holds none, it helps to say when the next one is rather than
   leaving a blank frame. Searched forward from the end of the window. */
function moNextRetro(en,from){
  return moCached("rnext|"+en+"|"+Math.round(from/3600000),function(){
    var DAY=86400000, stride=(MO_RSTRIDE[en]||4)*DAY;
    var prevM=from, prev=moSpeed(en,from)<0;
    for(var k=1;k<900;k++){
      var m=from+k*stride, r=moSpeed(en,m)<0;
      if(r&&!prev){
        /* bisect, or the date quoted on the frame is only as good as the stride —
           up to six days adrift for Śani, which is no use as a date */
        var a=prevM, b=m;
        for(var i=0;i<40&&b-a>3600000;i++){
          var mid=(a+b)/2;
          if(moSpeed(en,mid)<0) b=mid; else a=mid;
        }
        return (a+b)/2;
      }
      prev=r; prevM=m;
    }
    return null;
  });
}
/* The mean interval between one retrograde and the next: the synodic period. */
var MO_SYNODIC={Mercury:115.9,Venus:583.9,Mars:780.0,Jupiter:398.9,Saturn:378.1};

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
 sub:"every loop inside the window you choose · longitude across, latitude up",
 draw:function(p){
  var P=moPal(), S=moSize(), st=moStage(), c=MO.ctx, en=MO.opt.subject, U=Math.min(S.w,S.h);
  var w0=(MO.opt.from==="birth")?moBirthMs():Date.now();
  var w1=w0+moSpanMs();
  var loops=moRetroLoops(en,w0,w1);
  moStars();

  /* ---- the strip of the whole window, with every loop found marked on it */
  var sy=st.capY-st.h*0.085, x0=S.w*0.08, x1=S.w*0.92;
  function TX(m){ return x0+(x1-x0)*Math.max(0,Math.min(1,(m-w0)/(w1-w0))); }

  if(!loops.length){
    /* An empty window is an answer, not a failure — so say what the answer is, and
       when the next one comes, rather than leaving the frame blank. */
    var nx=moNextRetro(en,w1);
    var syn=MO_SYNODIC[en];
    moText(moP("noRetro",moTgraha(en)),st.cx,st.cy-U*0.055,U*0.042,P.ink,"center",700);
    moText(moP("inWindow"),st.cx,st.cy-U*0.008,U*0.030,P.dim,"center",500);
    moText(nx?("the next one begins "+moFmtDate(nx)):"none found within three years of it",
      st.cx,st.cy+U*0.045,U*0.028,P.gold,"center",600);
    if(syn) moText(moTgraha(en)+" turns retrograde about every "+
      (syn>400?(syn/365.25).toFixed(1)+" years":Math.round(syn)+" days")+
      " — widen the span to catch one",
      st.cx,st.cy+U*0.085,U*0.022,P.dim,"center",500);
    c.strokeStyle=P.line; c.lineWidth=1.5;
    c.beginPath(); c.moveTo(x0,sy); c.lineTo(x1,sy); c.stroke();
    moText(moFmtDate(w0),x0,sy+U*0.030,U*0.019,P.dim,"left",500);
    moText(moFmtDate(w1),x1,sy+U*0.030,U*0.019,P.dim,"right",500);
    return {ms:w0+(w1-w0)*p, sub:moTgraha(en)+" · no retrograde in this window"};
  }

  /* ---- one loop per slot of the playhead, so each keeps its shape */
  var MAXL=8, shown=Math.min(loops.length,MAXL);
  var each=1/shown, idx=Math.min(shown-1,Math.floor(p/each)), q=(p-idx*each)/each;
  var L=loops[idx];
  /* padding either side, so the loop is seen entering and leaving rather than
     starting mid-turn */
  var pad=(L.e-L.s)*0.55;
  var t0=L.s-pad, t1=L.e+pad, ms=t0+(t1-t0)*q;

  var path=moCached("rpath|"+en+"|"+Math.round(t0/3600000)+"|"+Math.round(t1/3600000),function(){
    var out=[], N=240;
    for(var i=0;i<=N;i++){
      var m=t0+(t1-t0)*i/N, Lo=moSidAt(en,m);
      var lat=0;
      try{ var ev=Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body[en],new Date(m),true));
           lat=ev.elat; }catch(e){}
      if(Lo!=null) out.push({ms:m,lon:Lo,lat:lat,retro:moSpeed(en,m)<0});
    }
    return out;
  });
  if(!path.length) return {ms:ms};
  var lo=1e9,hi=-1e9,la=1e9,ha=-1e9;
  path.forEach(function(z){ var u=z.lon; lo=Math.min(lo,u); hi=Math.max(hi,u);
    la=Math.min(la,z.lat); ha=Math.max(ha,z.lat); });
  if(hi-lo>180){ path.forEach(function(z){ if(z.lon<180) z.lon+=360; });
    lo=1e9;hi=-1e9; path.forEach(function(z){ lo=Math.min(lo,z.lon); hi=Math.max(hi,z.lon); }); }
  var mx=(hi-lo)*0.12||1, my=(ha-la)*0.35||0.4;
  lo-=mx; hi+=mx; la-=my; ha+=my;
  var bx=S.w*0.11, bw=S.w-bx*2, by=st.cy-st.h*0.30, bh=st.h*0.52;
  function X(l){ return bx+bw*(l-lo)/(hi-lo); }
  function Y(bb){ return by+bh-bh*(bb-la)/(ha-la); }
  /* sign bands and boundaries */
  for(var sg=Math.floor(lo/30);sg<=Math.floor(hi/30);sg++){
    var aa=Math.max(lo,sg*30), bq=Math.min(hi,sg*30+30);
    if(bq<=aa) continue;
    c.fillStyle=(sg%2)?"rgba(255,255,255,0.035)":"rgba(255,255,255,0.012)";
    c.fillRect(X(aa),by,X(bq)-X(aa),bh);
    if(sg*30>lo){ c.strokeStyle=P.gold; c.globalAlpha=.45; c.setLineDash([6,8]); c.lineWidth=2;
      c.beginPath(); c.moveTo(X(sg*30),by); c.lineTo(X(sg*30),by+bh); c.stroke();
      c.setLineDash([]); c.globalAlpha=1; }
    if(MO.opt.labels && X(bq)-X(aa)>S.w*0.12)
      moText(moSign(((sg%12)+12)%12),(X(aa)+X(bq))/2,by-U*0.035,U*0.030,P.dim,"center",600);
  }
  /* the ecliptic plane */
  if(MO.opt.grid && la<0 && ha>0){
    c.strokeStyle=P.line; c.lineWidth=2; c.setLineDash([5,7]);
    c.beginPath(); c.moveTo(bx,Y(0)); c.lineTo(bx+bw,Y(0)); c.stroke(); c.setLineDash([]);
    moText(moP("eclPlane"),bx+bw,Y(0)-U*0.022,U*0.022,P.dim,"right",500);
  }
  /* The whole path, faint: the shape of the loop is the point of the scene, so the
     frame should never be a stub of a curve in an empty field. The travelled part is
     then drawn bright over it. */
  c.strokeStyle=P.dim; c.globalAlpha=.30; c.lineWidth=Math.max(2,S.w*0.0035);
  c.beginPath();
  path.forEach(function(z,i){ var x=X(z.lon), y=Y(z.lat);
    if(i) c.lineTo(x,y); else c.moveTo(x,y); });
  c.stroke(); c.globalAlpha=1;
  /* trail up to now */
  var cut=Math.round(q*(path.length-1));
  var from=MO.opt.trail?Math.max(0,cut-Math.round(path.length*MO.opt.trailLen)):cut-1;
  c.lineWidth=Math.max(3,S.w*0.006); c.lineJoin="round"; c.lineCap="round";
  for(var i2=Math.max(1,from);i2<=cut;i2++){
    var z0=path[i2-1], z1=path[i2];
    var al=(i2-from)/Math.max(1,cut-from);
    c.globalAlpha=0.15+0.85*al;
    c.strokeStyle=z1.retro?P.malefic:P.gold;
    c.beginPath(); c.moveTo(X(z0.lon),Y(z0.lat)); c.lineTo(X(z1.lon),Y(z1.lat)); c.stroke();
  }
  c.globalAlpha=1;
  /* the two stations of THIS loop */
  [[L.s,moP("turnsBack")],[L.e,moP("resumes")]].forEach(function(k){
    var t=k[0]; if(t==null||t>ms) return;
    var near=path.reduce(function(aq,bq2){ return Math.abs(bq2.ms-t)<Math.abs(aq.ms-t)?bq2:aq; },path[0]);
    moGlowDot(X(near.lon),Y(near.lat),S.w*0.011,P.gold,P.gold);
    if(MO.opt.labels) moText(k[1],X(near.lon),Y(near.lat)-U*0.034,U*0.024,P.gold,"center",600);
  });
  var cur=path[cut];
  var r=S.w*0.043;
  moGlyph(X(cur.lon),Y(cur.lat),r,en,P,true);
  if(cur.retro) moText("R",X(cur.lon)+r*0.95,Y(cur.lat)-r*0.85,r*0.62,P.malefic,"center",800);

  /* ---- which loop of how many, and where it sits in the window */
  var hy=by+bh+U*0.040;
  moText(moP("loopOf",idx+1,loops.length)+
         (loops.length>MAXL?(" — first "+MAXL+" shown"):""),
    st.cx,hy,U*0.026,P.gold,"center",700);
  moText(moP("daysSpan",moFmtDate(L.s),moFmtDate(L.e),Math.round(L.days))+
         (L.cs||L.ce?"  (runs past the window)":""),
    st.cx,hy+U*0.034,U*0.022,P.dim,"center",500);
  c.strokeStyle=P.line; c.lineWidth=1.5;
  c.beginPath(); c.moveTo(x0,sy); c.lineTo(x1,sy); c.stroke();
  loops.forEach(function(lp,i){
    var on=(i===idx);
    c.strokeStyle=on?P.gold:P.malefic; c.globalAlpha=on?0.95:0.45;
    c.lineWidth=on?U*0.013:U*0.008; c.lineCap="butt";
    c.beginPath(); c.moveTo(TX(lp.s),sy); c.lineTo(Math.max(TX(lp.e),TX(lp.s)+2),sy); c.stroke();
    c.globalAlpha=1;
  });
  var px=TX(ms);
  c.strokeStyle=P.ink; c.lineWidth=2;
  c.beginPath(); c.moveTo(px,sy-U*0.016); c.lineTo(px,sy+U*0.016); c.stroke();
  moText(moFmtDate(w0),x0,sy+U*0.032,U*0.018,P.dim,"left",500);
  moText(moFmtDate(w1),x1,sy+U*0.032,U*0.018,P.dim,"right",500);
  moText(moP("retroCount",loops.length,loops.length===1?"":"s"),
    st.cx,sy+U*0.032,U*0.018,P.dim,"center",500);
  return {ms:ms, sub:moTgraha(en)+" · "+moP("loopOf",idx+1,loops.length)+" · "+
          (cur.retro?moP("retrograde"):moP("direct"))+" · "+moP("latIs",
          (cur.lat>=0?"+":"")+cur.lat.toFixed(2))};
 }},

/* ------------------------------------------------------------------- 2. gochara */
{key:moP("gochara"), label:"Gochara run", title:"Where the slow grahas go",
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
    var txt=moP("entersSign",moTgraha(flash.en),moTrasi(flash.sign));
    c.font='700 '+(S.w*0.040)+'px system-ui,sans-serif';
    var tw=c.measureText(txt).width;
    c.fillStyle=P.bg; c.globalAlpha=k*0.82;
    c.fillRect(cx-tw/2-S.w*0.03,cy-S.w*0.055,tw+S.w*0.06,S.w*0.075);
    c.globalAlpha=k*0.95;
    moText(txt,cx,cy-S.w*0.018,S.w*0.040,P.gold,"center",700);
    c.globalAlpha=1;
  } else if(MO.opt.labels){
    moText("gochara",cx,cy-S.w*0.012,S.w*0.028,P.dim,"center",600);
    moText(moP("natalInside"),cx,cy+S.w*0.028,S.w*0.022,P.dim,"center",500);
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
  return {ms:ms, sub: mo? (moP("fromPlane",moTgraha("Moon"),(mo.lat>=0?"+":"")+mo.lat.toFixed(2))
          +(Math.abs(mo.lat)<0.4?(" \u2014 "+moP("atTheNode")):"")) : null};
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
  moText(moP("lagnaRising"),lagA[0]-S.w*0.085,lagA[1],S.w*0.024,P.gold,"center",600);
  return {ms:ms, sub:moP("dayNight",day?moP("daylight"):moP("night"),moTrasi(Math.floor(sky.lagna/30)%12),
          (below.length?below.map(function(x){return moTgl(x);}).join(" "):"\u2014"))};
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
  moText(moP("ecliptic"),cx+bw/2,Yy(0)-S.w*0.024,S.w*0.021,P.dim,"right",500);
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
      moText(moTnak(ni),mid,cy+st.h*0.26,S.w*0.026,
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
  moSerif(moTnak(idx),cx,ty,S.w*0.074,P.gold);
  moText(moP("starName",star.star,star.bayer),cx,ty+S.w*0.064,S.w*0.032,P.ink,"center",600);
  moText(moP("starAt",star.mag.toFixed(2),star.sid.toFixed(2),
           (star.lat>=0?"+":"")+star.lat.toFixed(2)),
         cx,ty+S.w*0.106,S.w*0.025,P.dim,"center",500);
  moText(star.inside?moP("starInside")
                    :"falls outside the division named after it",
         cx,cy+st.h*0.36,S.w*0.027,star.inside?P.benefic:P.malefic,"center",600);
  return {ms:null, sub:moP("nakOfN",idx+1,27)};
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
  moText(moP("lagna"),llx,cy-Math.sin(la)*R*1.16,S.w*0.028,P.gold,"center",700);

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
    var txt=moP("lagnaEnters",moTrasi(h1));
    c.font='700 '+(S.w*0.034)+'px system-ui,sans-serif';
    var tw=c.measureText(txt).width;
    c.fillStyle=P.bg; c.globalAlpha=.88;
    c.fillRect(cx-tw/2-S.w*0.025,cy-S.w*0.042,tw+S.w*0.05,S.w*0.068); c.globalAlpha=1;
    moText(txt,cx,cy-S.w*0.009,S.w*0.034,P.gold,"center",700);
  }
  moText(mode==="equal"?moP("housesEqual"):
         mode==="whole"?moP("housesWhole"):
         moP("spokesSlide"),
    cx,cy+st.h*0.45,S.w*0.028,P.dim,"center",600);
  moText(moP("rasisFixed"),cx,cy-st.h*0.45,S.w*0.030,P.dim,"center",600);
  var mins=(ms-b)/60000;
  return {ms:ms, sub:moP("lagnaAfter",moTrasi(h1),skyDM(lag),
          (mins<60?(mins.toFixed(0)+"m"):((mins/60).toFixed(1)+"h")))};
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
  [[sa,P.gold,moP("siderealLbl")+" 0°"],[ta,P.glow,moP("tropicalLbl")+" 0°"]].forEach(function(z){
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
  moText(moP("ayanSep"),
    cx,cy+st.h*0.44,S.w*0.026,P.dim,"center",500);
  return {ms:null, sub:moP("ayanIs",ay.toFixed(2),"Lahiri")};
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
  var note = (en==="Mars")?moP("adds48",moTgraha("Mars"))
           : (en==="Jupiter")?moP("adds59",moTgraha("Jupiter"))
           : (en==="Saturn")?moP("adds310",moTgraha("Saturn"))
           : "the 7th alone — the full glance every graha casts";
  moText(note,cx,cy+st.h*0.44,S.w*0.028,P.dim,"center",600);
  return {ms:ms, sub:moTgraha(en)+" in "+moTrasi(Math.floor(L/30)%12)+" "+skyDM(L)};
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
  var ti=Math.floor(el/12)+1, pak=el<180?moP("shukla"):moP("krishnaP");
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
  moText(moP("pakshaOf",pak),cx,cy-st.h*0.40,S.w*0.034,
    el<180?P.benefic:P.dim,"center",600);
  moSerif(moP("tithiN",tiIn),cx,cy+st.h*0.33,S.w*0.060,P.ink);
  moText(moP("degBetween",el.toFixed(1)),cx,cy+st.h*0.40,S.w*0.027,P.dim,"center",500);
  return {ms:ms, sub:moP("tithiOf",pak,tiIn,el.toFixed(1))};
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
    moText(moP("antarWithin",moTgraha(cur.lord)),bx,ay+ah*1.75,S.w*0.023,P.dim,"left",500);
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
  if(cur) moText(moP("mahadasha",moTgraha(cur.lord)),cx,by+bh*3.2,S.w*0.034,P.gold,"center",700);
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
        x.node=Math.min(d1,d2); x.which=(d1<=d2)?moTgraha("Rahu"):moTgraha("Ketu");
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
/* The inclination of Candra's orbit to the ecliptic, and the latitude limits at syzygy:
   past about 1.58° at a new moon, or 1.03° at a full one, the cones miss entirely. These
   are the numbers behind the ecliptic limits above — the limits are what those latitudes
   work out to as a distance from the node along the ecliptic.

   A full moon has two limits, not one: past 1.03° Candra misses the umbra, but it still
   grazes the penumbra out to about 1.57°, which is why February and August 2027 both
   carry a penumbral eclipse at latitudes a shade over one degree. */
var MO_INCL=5.145, MO_SOLZONE=1.58, MO_LUNZONE=1.03, MO_PENZONE=1.57;

/* --- the zodiac band the tilt scene wears -----------------------------------
   The scene answers "why no eclipse this month" in latitude, which is a question
   about the plane. It never said WHERE along the ring any of it was happening, so
   Rahu at 7 deg Mina and Rahu at 7 deg Kanya looked the same. This band supplies the
   longitude frame: twelve rasi spokes, twenty-seven naksatra ticks, and the arc
   holding each of the four bodies lit.

   It is drawn through the scene's own proj(), so it sits in the same tilted
   perspective as the ecliptic ring rather than floating flat in front of it. A
   separate flat ring would read as a second, contradictory plane. */
var MO_NAKW=40/3;                               /* 13 deg 20' */
function moNak(lon){
  var l=((lon%360)+360)%360, n=Math.floor(l/MO_NAKW);
  return {n:n, pada:Math.floor((l-n*MO_NAKW)/(MO_NAKW/4))+1,
          name:moTnak(n)};
}
function moRasiOf(lon){
  var l=((lon%360)+360)%360, i=Math.floor(l/30);
  return {i:i, deg:l-i*30,
          name:moTrasi(i)};
}
/* An arc of the band, swept in longitude at a fixed radius. Short arcs still get a
   few segments, so a naksatra arc does not degenerate into a chord. */
function moBandArc(proj,l0,l1,rad,col,w,alpha){
  var c=MO.ctx, n=Math.max(6,Math.ceil((l1-l0)/2));
  c.beginPath();
  for(var i=0;i<=n;i++){
    var q=proj(l0+(l1-l0)*i/n,0,rad);
    if(i===0) c.moveTo(q[0],q[1]); else c.lineTo(q[0],q[1]);
  }
  c.strokeStyle=col; c.lineWidth=w; c.globalAlpha=alpha;
  c.stroke(); c.globalAlpha=1;
}

var MO_MORE=[

{key:"panchanga", label:"Pañcāṅga", title:"The five limbs of the day",
 sub:"tithi · vāra · nakṣatra · yoga · karaṇa",
 draw:function(p){
  var P=moPal(), S=moSize(), st=moStage(), c=MO.ctx;
  var t0=Date.now(), t1=t0+moSpanMs(), ms=t0+(t1-t0)*p;
  var su=moSidAt("Sun",ms), mo=moSidAt("Moon",ms);
  if(su==null||mo==null) throw new Error("no position");
  var jd=ms/86400000+2440587.5;
  /* the site's own pañcāṅga, so this can never disagree with the Overview tab */
  var pc=panchanga(su,mo);
  var nk=nakOf(mo);
  var vi=(Math.floor(jd+1.5)%7+7)%7;
  var ayn=0; try{ ayn=window.__ayanFor?window.__ayanFor("lahiri",jd):0; }catch(e){}
  var MS=masaOf(su,mo,ayn);                 /* māsa, ṛtu, ayana — the pañcāṅga heading */
  var elong=((mo-su)%360+360)%360;
  var yogaRaw=((mo+su)%360+360)%360;
  /* U is the frame's short side. Type and spacing are keyed to it rather than to the
     width, because the width doubles in landscape while the height halves — a size of
     S.w*0.03 that reads well at 9:16 becomes twice as tall a line on a frame half as
     tall. At 9:16 and 1:1, U is the width, so those two layouts are unchanged. */
  var U=Math.min(S.w,S.h)/moTypeK();
  /* Sūrya and Candra ride a rim outside the outermost ring, so the stage radius alone is
     not the constraint — the dot and its glyph have to fit too, or a graha sitting at 0°
     or 180° is sliced off by the frame edge. The budget is twice the dot radius, not one:
     moGlowDot blurs by r*2.4, so a disc that merely fits still spills its halo over the
     edge — which on an exported frame looks like a mistake. */
  /* In landscape the five readings will not fit inside the wheel: the height caps the
     wheel at a radius whose centre disc is narrower than "Budhavara · Wednesday" set at a
     legible size. So in a frame wider than it is tall the wheel moves left and the
     readings become a column beside it, where the empty width actually is. */
  var wide=S.w>S.h*1.15;
  var rimK=1.07, dotR=U*0.027, cx=wide?S.w*0.30:st.cx, cy=st.cy;
  /* The māsa heading needs a band above the wheel. Reserving it after sizing the wheel
     would only work at 9:16, where there is height to spare; in landscape the wheel fills
     the frame and the heading lands on the outer ring. So the band is reserved first and
     the wheel takes what is left, the same discipline the tilt scene uses. */
  var headH=U*0.125;
  var R=Math.min(st.R,(S.w*0.5-dotR*2)/rimK,(cy-headH-U*0.02)/rimK);
  moStars();
  /* Five rings, outermost to innermost, each a limb. The lit wedge is the division the
     day is in; the brighter sliver inside it is how far through that division we are. */
  var LIMBS=[
    {n:27, i:nk.idx,            f:(mo%(40/3))/(40/3),          col:"#6f7cc0",
     lab:moP("limbNak"), val:moNakName(mo)+" · "+moP("padaN",nk.pada)},
    {n:27, i:Math.floor(yogaRaw/(800/60)), f:(yogaRaw%(800/60))/(800/60), col:"#5fbf8f",
     lab:moP("limbYoga"),     val:moTyoga(pc.yoga)},
    {n:30, i:Math.floor(elong/12), f:(elong%12)/12,            col:"#d9b668",
     lab:moP("limbTithi"),    val:moTtithiName(pc.tithi)+" · "+moTpaksha(pc.paksha)},
    {n:60, i:Math.floor(elong/6),  f:(elong%6)/6,              col:"#e07a60",
     lab:moP("limbKarana"),   val:moTkarana(pc.karana)},
    {n:7,  i:vi, f:((jd+1.5)%1+1)%1,                           col:"#c89078",
     lab:moP("limbVara"),     val:moP("varaBoth",moTvara(vi),VARAE[vi])}
  ];
  var rOut=1.00, rIn=0.44, gap=0.012;
  var th=(rOut-rIn)/LIMBS.length;
  LIMBS.forEach(function(L,k){
    var a=R*(rOut-k*th), b=R*(rOut-(k+1)*th+gap);
    var step=360/L.n;
    for(var j=0;j<L.n;j++){
      var a0=(180-j*step)*Math.PI/180, a1=(180-(j+1)*step)*Math.PI/180;
      c.beginPath(); c.arc(cx,cy,a,-a0,-a1,false); c.arc(cx,cy,b,-a1,-a0,true); c.closePath();
      if(j===L.i){ c.fillStyle=L.col; c.globalAlpha=0.38; }
      else { c.fillStyle="#ffffff"; c.globalAlpha=(j%2)?0.055:0.022; }
      c.fill(); c.globalAlpha=1;
      if(L.n<=30){
        c.strokeStyle=P.line; c.lineWidth=0.8; c.globalAlpha=.5; c.stroke(); c.globalAlpha=1;
      }
    }
    /* how far through the current division */
    var s0=(180-L.i*step)*Math.PI/180, s1=(180-(L.i+L.f)*step)*Math.PI/180;
    c.beginPath(); c.arc(cx,cy,a,-s0,-s1,false); c.arc(cx,cy,b,-s1,-s0,true); c.closePath();
    c.fillStyle=L.col; c.globalAlpha=0.85; c.fill(); c.globalAlpha=1;
    c.strokeStyle=L.col; c.lineWidth=2; c.globalAlpha=.9;
    c.beginPath(); c.arc(cx,cy,a,0,6.2832); c.stroke(); c.globalAlpha=1;
  });
  /* Sūrya and Candra on the outer rim, because every limb but the vāra is some
     combination of exactly these two longitudes */
  function rim(deg,rad){ var ang=(180-deg)*Math.PI/180;
    return [cx+Math.cos(ang)*rad, cy-Math.sin(ang)*rad]; }
  var sp=rim(su,R*rimK), mp=rim(mo,R*rimK);
  moGlowDot(sp[0],sp[1],U*0.026,"#f0b847","#ffd37a");
  moText(moG("Sun"),sp[0],sp[1],U*0.019,"#3a2a06","center",800);
  moGlowDot(mp[0],mp[1],U*0.024,"#e8eaf6","#ffffff");
  moText(moG("Moon"),mp[0],mp[1],U*0.018,"#2a2f45","center",800);
  /* the five readings: inside the wheel in portrait, beside it in landscape */
  var tx, align, rowH;
  if(wide){
    tx=S.w*0.56; align="left"; rowH=Math.min(U*0.112,st.h*0.17);
  } else {
    c.fillStyle=P.bg; c.globalAlpha=.80;
    c.beginPath(); c.arc(cx,cy,R*0.425,0,6.2832); c.fill(); c.globalAlpha=1;
    tx=cx; align="center"; rowH=R*0.148;
  }
  /* the type follows the row, not the frame, so a shorter row never overlaps the next */
  var vs=Math.min(U*0.028,rowH*0.42), ls=Math.min(U*0.019,rowH*0.28);
  var y0=cy-rowH*2;
  LIMBS.forEach(function(L,k){
    var y=y0+k*rowH;
    /* "TITHI 10 of 30" rather than a bare name: it says at once how far through the
       limb's cycle the day sits, and it stops the rings being read as longitude rings.
       Only the nakṣatra ring is one — the other four are dials of their own count. */
    moText(moP("limbOf",L.lab.toUpperCase(),L.i+1,L.n),tx,y-rowH*0.28,ls,L.col,align,700);
    moText(L.val,tx,y+rowH*0.16,vs,P.ink,align,600);
  });
  /* The heading a printed pañcāṅga carries above the five limbs: the lunar month, the
     season and the half-year. The pūrṇimānta name is shown only in the dark fortnight,
     which is the only time it differs from the amānta one. */
  var hy=Math.max(U*0.065, cy-R*rimK-U*0.072);
  moText(moP("masaAmanta"),cx,hy-U*0.034,U*0.019,P.gold,"center",700);
  moSerif(moTmasa(MS.amanta),cx,hy+U*0.014,U*0.046,P.ink,"center");
  var tail=(MS.purnimanta!==MS.amanta?(moTmasa(MS.purnimanta)+"  ·  "):"")+
           moP("rituAyana",moTritu(MS.ritu),moTayana(MS.ayana));
  moText(tail,cx,hy+U*0.052,U*0.021,P.dim,"center",500);
  return {ms:ms, sub:moTmasa(MS.amanta)+" "+moTpaksha(pc.paksha)+" · "+moTtithiName(pc.tithi)+" · "+moTvara(vi)+" · "+
                     moNakName(mo)+" · "+moTyoga(pc.yoga)+" · "+moTkarana(pc.karana)};
 }},

/* ------------------------------------------------------- the tilt, seen from outside ---
   The seasons scene above is a flat clock: it shows WHEN the nodes line up with the Sun.
   It cannot show WHY a new moon away from the nodes produces nothing, because on a flat
   wheel the Sun and Moon look like they meet. They do not — they pass, one above the
   other. This scene is the same geometry viewed from outside the plane, so the miss is
   visible as a gap you can measure. */
{key:"tilt", label:"Tilt & nodes", title:"Why most months have no eclipse",
 sub:"Candra's path is tilted 5°, so at most new moons the shadow passes above or below",
 draw:function(p){
  var P=moPal(), S=moSize(), st=moStage(), c=MO.ctx;
  var t0=Date.now(), t1=t0+moSpanMs(), ms=t0+(t1-t0)*p;
  var su=moSidAt("Sun",ms), mo=moSidAt("Moon",ms), ra=moSidAt("Rahu",ms);
  if(su==null||mo==null||ra==null) throw new Error("no position");
  var ke=((ra+180)%360+360)%360;
  /* The four the band reports on. Closures rather than values, so the readout and the
     arcs cannot drift apart from the positions the diagram is drawn from. */
  var MO_TILTB=[
    {sa:moTgraha("Sun"), col:"#f0b847", lon:function(){ return su; }},
    {sa:moTgraha("Moon"),col:"#e8eaf6", lon:function(){ return mo; }},
    {sa:moTgraha("Rahu"),  col:"#9f8fe0", lon:function(){ return ra; }},
    {sa:moTgraha("Ketu"),  col:"#d59a72", lon:function(){ return ke; }}
  ];
  /* Candra's true ecliptic latitude. Sūrya's is zero by definition — the ecliptic IS its
     path — and that is the whole reason this scene works: one body defines the plane, the
     other is tilted away from it. */
  var blat=0;
  try{ blat=Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body.Moon,new Date(ms),true)).elat; }
  catch(e){}
  var U=Math.min(S.w,S.h)/moTypeK();  /* short side; see the pañcāṅga scene */
  /* U is a TYPE unit: moText multiplies what it is given by moTypeK(), so U*0.03 is
     the same rendered height on every frame. A vertical OFFSET gets no such
     multiplication, so the same U*0.03 is 1.78x larger on 16:9 than on 9:16 — which
     is why this scene's three verdict lines stood twice as far apart there as the
     type they separate, and why the foot reserve ate half the stage. UT is the unit
     an offset wants: the rendered size of U, which comes out the same on all three
     frames. Sizes keep U, offsets take UT. */
  var UT=U*moTypeK();
  var ex=MO.opt.latx||6;
  /* The camera breathes, as the orrery's does, but never flattens towards top-down: at a
     shallow angle the two rings project onto each other and the tilt — the whole subject
     of the scene — stops being visible. */
  var tilt=(38+14*Math.sin(p*Math.PI*2))*Math.PI/180;
  var kY=Math.cos(tilt), kZ=Math.sin(tilt);
  /* The scene is laid out from the bottom up, because three things have to share the
     height and only the diagram can give way: the latitude strip sits at the foot, the
     three-line verdict above it, and the diagram takes whatever is left. Fixing the
     diagram first and hoping the text fits is what makes a layout collide at 16:9, where
     the height is barely half what it is at 9:16. */
  var sy=st.capY-st.h*0.085, amp=st.h*0.028;          // the strip, and its half-height
  /* The four-body readout adds two rows under the verdict, so the diagram gives up
     that much height. The scene is laid out from the foot up precisely so this can
     be a number rather than a collision. */
  var footRes=((MO.opt.tring==null)?"nak":MO.opt.tring)==="off"?0.175:0.250;
  var topY=UT*0.03, floorY=sy-amp*1.4-UT*footRes;     // the band left for the diagram
  var cx=st.cx, cy=(topY+floorY)/2, limit=Math.max(UT*0.12,(floorY-topY)/2);
  /* the vertical reach is the ring seen edge-on plus the worst exaggerated latitude */
  var R=st.R*0.86;
  /* The band rides outside the ecliptic ring, so the fit has to allow for its outer
     edge, not the ring's. Leaving this at R is how a new outer element silently
     clips off the top of a 16:9 frame. */
  var tring=(MO.opt.tring==null)?"nak":MO.opt.tring;     /* off | rasi | nak */
  var ringF=(tring==="off")?1:1.155;
  var halfH=R*ringF*kY+R*Math.sin(MO_INCL*Math.PI/180)*ex*kZ+UT*0.085;
  if(halfH>limit) R*=limit/halfH;
  moStars();
  function proj(lon,lat,rad){
    var a=(180-lon)*Math.PI/180, rr=(rad==null?R:rad);
    return [cx+Math.cos(a)*rr,
            cy-Math.sin(a)*rr*kY-Math.sin(lat*Math.PI/180)*rr*ex*kZ];
  }
  function far(lon){ var l=((lon%360)+360)%360; return l>0&&l<180; }   // the half behind Earth
  /* A ring at a constant latitude above or below the ecliptic, drawn in two halves so the
     near half can be drawn over the far one and the whole thing reads as a solid. */
  function ring(latOf,col,w,alphaFar,alphaNear,dash){
    [[0,180,alphaFar],[180,360,alphaNear]].forEach(function(seg){
      c.beginPath();
      for(var l=seg[0];l<=seg[1];l+=2){
        var q=proj(l,latOf(l)); if(l===seg[0]) c.moveTo(q[0],q[1]); else c.lineTo(q[0],q[1]);
      }
      c.strokeStyle=col; c.lineWidth=w; c.globalAlpha=seg[2];
      if(dash) c.setLineDash(dash);
      c.stroke(); c.setLineDash([]); c.globalAlpha=1;
    });
  }
  var zero=function(){ return 0; };
  /* The shadow corridor: Candra must be within about a degree and a half of the ecliptic
     at the moment of syzygy, or the cones miss. Drawn as two faint rails so the corridor
     reads as a slab the tilted orbit dips in and out of. */
  ring(function(){ return  MO_SOLZONE; },P.gold,1.5,0.10,0.26,[5,7]);
  ring(function(){ return -MO_SOLZONE; },P.gold,1.5,0.10,0.26,[5,7]);
  /* Label the rails a quarter turn from the nodes — that is where the orbit stands
     furthest from the corridor, so the text never lands on a node glyph. */
  var labLon=far(ra+90)?ra+270:ra+90, cl=proj(labLon,MO_SOLZONE);
  moText(moP("shadowCorr",MO_SOLZONE),cl[0],cl[1]-UT*0.026,U*0.018,P.gold,"center",600);
  ring(zero,P.line,3.5,0.30,1,null);                      /* the ecliptic itself */
  /* ---- the zodiac band ---------------------------------------------------- */
  var RI=R*1.045, RM=R*1.10, RO=R*1.155;
  if(tring!=="off"){
    /* the two rims, in the same two halves the other rings use */
    [RI,RO].forEach(function(rr){
      [[0,180,0.22],[180,360,0.55]].forEach(function(seg){
        c.beginPath();
        for(var l=seg[0];l<=seg[1];l+=2){
          var q=proj(l,0,rr); if(l===seg[0]) c.moveTo(q[0],q[1]); else c.lineTo(q[0],q[1]);
        }
        c.strokeStyle=P.line; c.lineWidth=1.4; c.globalAlpha=seg[2]; c.stroke();
        c.globalAlpha=1;
      });
    });
    if(tring==="nak"){
      for(var nk=0;nk<27;nk++){
        var nl=nk*MO_NAKW, qa=proj(nl,0,RI), qb=proj(nl,0,RI+(RO-RI)*0.45);
        c.strokeStyle=P.line; c.lineWidth=1; c.globalAlpha=far(nl)?0.18:0.45;
        c.beginPath(); c.moveTo(qa[0],qa[1]); c.lineTo(qb[0],qb[1]); c.stroke();
        c.globalAlpha=1;
      }
    }
    for(var rs=0;rs<12;rs++){
      var rl=rs*30, ra0=proj(rl,0,RI), rb0=proj(rl,0,RO);
      c.strokeStyle=P.line; c.lineWidth=1.6; c.globalAlpha=far(rl)?0.28:0.70;
      c.beginPath(); c.moveTo(ra0[0],ra0[1]); c.lineTo(rb0[0],rb0[1]); c.stroke();
      c.globalAlpha=1;
      /* the rasi name, on the near half only — on the far half the ellipse squeezes
         the spokes together and the names overprint each other */
      if(MO.opt.labels && !far(rl+15)){
        var rq=proj(rl+15,0,RO+R*0.055);
        moText(moTrasi(rs),
          rq[0],rq[1],U*0.0165,P.dim,"center",500);
      }
    }
    /* the arcs holding the four bodies: rasi faint and wide, naksatra bright and
       narrow, so the two scales are told apart at a glance */
    MO_TILTB.forEach(function(B){
      var lon=B.lon(); if(lon==null) return;
      var rr=moRasiOf(lon), nn=moNak(lon), a=far(lon)?0.35:1;
      moBandArc(proj, rr.i*30, rr.i*30+30, RM, B.col, R*0.052, a*0.20);
      if(tring==="nak")
        moBandArc(proj, nn.n*MO_NAKW, (nn.n+1)*MO_NAKW, RM, B.col, R*0.052, a*0.60);
      /* a stub pointing from the ring out to the band, so the arc is unambiguously
         this body's and not its neighbour's */
      var s0=proj(lon,0,R*1.0), s1=proj(lon,0,RO);
      c.strokeStyle=B.col; c.lineWidth=2; c.globalAlpha=a*0.75;
      c.beginPath(); c.moveTo(s0[0],s0[1]); c.lineTo(s1[0],s1[1]); c.stroke();
      c.globalAlpha=1;
    });
  }
  /* Candra's orbit: a great circle inclined MO_INCL° to the ecliptic, crossing it at the
     nodes. Swept by the argument from the ascending node, which is where Rāhu sits, so the
     ring is tied to the same node the chart uses. */
  function orbLat(lon){
    var u=Math.atan2(Math.sin((lon-ra)*Math.PI/180),Math.cos((lon-ra)*Math.PI/180)*Math.cos(MO_INCL*Math.PI/180));
    return Math.asin(Math.sin(MO_INCL*Math.PI/180)*Math.sin(u))*180/Math.PI;
  }
  ring(orbLat,P.glow,4,0.30,0.95,null);
  /* Earth at the centre, and the nodes where the two rings cross */
  moGlowDot(cx,cy,UT*0.013,"#6ea9d9","#9fd0ff");
  [[ra,"Rahu"],[ke,"Ketu"]].forEach(function(nd){
    var q=proj(nd[0],0);
    c.globalAlpha=far(nd[0])?0.5:1;
    moGlyph(q[0],q[1],UT*0.028,nd[1],P,true);
    c.globalAlpha=1;
  });
  /* Sūrya, always exactly on the ecliptic ring */
  var sp=proj(su,0), mp=proj(mo,blat), mf=proj(mo,0);      /* mf is Candra's foot on the plane */
  c.strokeStyle=P.dim; c.lineWidth=1.4; c.globalAlpha=.30;
  c.beginPath(); c.moveTo(cx,cy); c.lineTo(sp[0],sp[1]); c.stroke();
  c.beginPath(); c.moveTo(cx,cy); c.lineTo(mf[0],mf[1]); c.stroke(); c.globalAlpha=1;
  /* the dropline: the gap between Candra and the plane, which is the whole argument */
  c.strokeStyle=Math.abs(blat)<=MO_SOLZONE?P.gold:P.malefic;
  c.lineWidth=3; c.globalAlpha=.85;
  c.beginPath(); c.moveTo(mf[0],mf[1]); c.lineTo(mp[0],mp[1]); c.stroke(); c.globalAlpha=1;
  c.fillStyle=P.dim; c.beginPath(); c.arc(mf[0],mf[1],UT*0.007,0,6.2832); c.fill();
  moGlowDot(sp[0],sp[1],UT*0.034,"#f0b847","#ffd37a");
  moText(moG("Sun"),sp[0],sp[1],U*0.023,"#3a2a06","center",800);
  moGlowDot(mp[0],mp[1],UT*0.028,"#e8eaf6","#ffffff");
  moText(moG("Moon"),mp[0],mp[1],U*0.020,"#2a2f45","center",800);
  moText(Math.abs(blat).toFixed(2)+"° "+(blat>=0?"N":"S"),
    mp[0]+UT*0.055,mp[1]-UT*0.010,U*0.022,
    Math.abs(blat)<=MO_SOLZONE?P.gold:P.dim,"left",700);
  /* the verdict for this moment */
  var el=((mo-su)%360+360)%360;
  var toNew=Math.min(el,360-el), toFull=Math.abs(el-180);
  var syz=Math.min(toNew,toFull), isNew=toNew<=toFull;
  var zoneNow=isNew?MO_SOLZONE:MO_LUNZONE;
  var E=moEclipsesIn(t0,t1), near=null;
  E.forEach(function(x){ if(near==null||Math.abs(x.ms-ms)<Math.abs(near.ms-ms)) near=x; });
  var hit=near&&Math.abs(near.ms-ms)<43200000;            /* within half a day of a real one */
  var line1, line2, col;
  if(syz>6){
    line1=moP("noSyzygy");
    line2=moP("fromLining",syz.toFixed(0));
    col=P.dim;
  } else if(hit){
    line1=(near.type||"").charAt(0).toUpperCase()+(near.type||"").slice(1)+" "+
          (near.kind==="solar"?"solar":"lunar")+" eclipse";
    line2=moP("insideCorr",Math.abs(blat).toFixed(2));
    col=P.gold;
  } else if(Math.abs(blat)<=zoneNow){
    line1=(isNew?"new moon, in the corridor":"full moon, in the corridor");
    line2="Candra "+Math.abs(blat).toFixed(2)+"° off the ecliptic, inside the "+
          zoneNow.toFixed(2)+"° limit";
    col=P.gold;
  } else if(!isNew && Math.abs(blat)<=MO_PENZONE){
    /* past the umbra but still in the penumbra — a real eclipse, and a faint one */
    line1="full moon — the penumbra only";
    line2="Candra "+Math.abs(blat).toFixed(2)+"° off the ecliptic: past the "+
          MO_LUNZONE.toFixed(2)+"° umbral limit, inside the "+MO_PENZONE.toFixed(2)+"° penumbral one";
    col=P.benefic;
  } else {
    line1=(isNew?"new moon — and no eclipse":"full moon — and no eclipse");
    line2="Candra passes "+Math.abs(blat).toFixed(2)+"° "+(blat>=0?"above":"below")+
          " the ecliptic, past the "+(isNew?MO_SOLZONE:MO_PENZONE).toFixed(2)+"° limit";
    col=P.malefic;
  }
  var ty=cy+R*ringF*kY+R*Math.sin(MO_INCL*Math.PI/180)*ex*kZ+UT*0.085;
  moText(line1,cx,ty,U*0.034,col,"center",700);
  moText(line2,cx,ty+UT*0.040,U*0.023,P.dim,"center",500);
  moText(moP("latTimes",ex),
    cx,ty+UT*0.074,U*0.019,P.dim,"center",500);
  /* Where each of the four stands in longitude, in words. The band shows it; this
     says it, because four labels crowded onto a tilted ellipse collide — Surya and
     Candra sit within a degree of each other at every new moon. */
  if(tring!=="off"){
    var ry=ty+UT*0.112, colX=[cx-S.w*0.215, cx+S.w*0.215];
    MO_TILTB.forEach(function(B,i){
      var lon=B.lon(); if(lon==null) return;
      var rr=moRasiOf(lon), nn=moNak(lon);
      var bx=colX[i%2], by=ry+Math.floor(i/2)*UT*0.040;
      moText(B.sa,bx-S.w*0.085,by,U*0.021,B.col,"right",700);
      moText(rr.name+" "+rr.deg.toFixed(1)+"°"+
        (tring==="nak"?("  ·  "+nn.name+" "+nn.pada):""),
        bx-S.w*0.072,by,U*0.021,P.ink,"left",500);
    });
  }
  /* The proof strip: Candra's latitude as a wave across the whole span, with every new
     and full moon marked on it. The eclipses are exactly the marks that sit near zero. */
  var x0=S.w*0.07, x1=S.w*0.93;                       /* sy and amp are set at the top */
  var wave=moCached("tiltwave|"+MO.opt.spanN+MO.opt.spanU,function(){
    /* The wave swings through its whole range every 27 days, so the sample count has to
       follow the span or the curve aliases into a smear. Four samples a day resolves it
       comfortably; the cap keeps a very long span from costing a visible pause, and the
       span control offers only days and months so that cap is rarely reached. */
    var N=Math.max(300,Math.min(3000,Math.round((t1-t0)/86400000*4))), w=[];
    for(var i=0;i<=N;i++){
      var m=t0+(t1-t0)*i/N, b=0, L=moSidAt("Moon",m), s2=moSidAt("Sun",m);
      try{ b=Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body.Moon,new Date(m),true)).elat; }
      catch(e2){}
      var e2d=(L==null||s2==null)?null:((L-s2)%360+360)%360;
      w.push({m:m,b:b,el:e2d});
    }
    return w;
  });
  c.strokeStyle=P.gold; c.globalAlpha=.20; c.lineWidth=1;
  [1,-1].forEach(function(sgn){
    var yy=sy-sgn*amp*MO_SOLZONE/5.3;
    c.beginPath(); c.moveTo(x0,yy); c.lineTo(x1,yy); c.stroke();
  });
  c.globalAlpha=1;
  c.strokeStyle=P.line; c.lineWidth=1.5;
  c.beginPath(); c.moveTo(x0,sy); c.lineTo(x1,sy); c.stroke();
  c.strokeStyle=P.glow; c.lineWidth=2; c.globalAlpha=.85; c.beginPath();
  wave.forEach(function(w,i){
    var wx=x0+(x1-x0)*(w.m-t0)/(t1-t0), wy=sy-amp*w.b/5.3;
    if(i===0) c.moveTo(wx,wy); else c.lineTo(wx,wy);
  });
  c.stroke(); c.globalAlpha=1;
  /* every syzygy in the span, from the sampled elongation crossing 0° or 180° */
  for(var i2=1;i2<wave.length;i2++){
    var a2=wave[i2-1], b2=wave[i2];
    if(a2.el==null||b2.el==null) continue;
    var cross=null;
    if(a2.el>b2.el) cross="new";                                  /* wrapped past 360 → 0 */
    else if(a2.el<180&&b2.el>=180) cross="full";
    if(!cross) continue;
    var wx2=x0+(x1-x0)*(b2.m-t0)/(t1-t0), wy2=sy-amp*b2.b/5.3;
    /* the full-moon test uses the penumbral limit, so a penumbral eclipse is marked gold
       like any other — it is one, and the sampled latitude is a little coarse besides */
    var inZone=Math.abs(b2.b)<=(cross==="new"?MO_SOLZONE:MO_PENZONE)*1.12;
    c.fillStyle=inZone?P.gold:P.dim; c.globalAlpha=inZone?0.95:0.45;
    c.beginPath(); c.arc(wx2,wy2,U*(inZone?0.009:0.006),0,6.2832); c.fill(); c.globalAlpha=1;
  }
  var px=x0+(x1-x0)*p;
  c.strokeStyle=P.gold; c.lineWidth=2.5;
  c.beginPath(); c.moveTo(px,sy-amp*1.25); c.lineTo(px,sy+amp*1.25); c.stroke();
  moText(moP("latAcross"),
    cx,sy+amp*1.95,U*0.019,P.dim,"center",500);
  /* distance to the NEARER node, not to Rāhu: when Candra sits by Ketu the Rāhu figure
     reads 174°, which says the opposite of what the picture shows */
  var dR=Math.abs(((mo-ra)%360+360)%360); if(dR>180) dR=360-dR;
  var dK=Math.abs(((mo-ke)%360+360)%360); if(dK>180) dK=360-dK;
  return {ms:ms, sub:moP("latOff",moTgraha("Moon"),(blat>=0?"+":"")+blat.toFixed(2))+" · "+
          (isNew?moP("fromNewMoon",syz.toFixed(0)):moP("fromFullMoon",syz.toFixed(0)))+" · "+
          moP("fromNode",Math.min(dR,dK).toFixed(0),(dR<=dK?moTgraha("Rahu"):moTgraha("Ketu")))};
 }},

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
    moText(season?moP("eclSeason"):moP("noEclPoss"),cx,cy-S.w*0.012,S.w*0.034,
      season?P.gold:P.dim,"center",700);
    moText(moP("degFromNode",dSun.toFixed(1)),cx,cy+S.w*0.028,S.w*0.026,P.dim,"center",500);
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
  moText(moP("aboveBelow"),x0,sy+S.w*0.042,S.w*0.019,P.dim,"left",500);
  var moved=null;
  if(ra0!=null){ moved=((ra0-ra)%360+360)%360; if(moved>180) moved-=360; }
  moText(moP("nodesRetreat","19.3",(moved==null?"\u2014":Math.abs(moved).toFixed(0))),
    cx,cy+R*1.10,S.w*0.024,P.dim,"center",500);
  return {ms:ms, sub:moP("eclCount",done,E.length,dSun.toFixed(1))+" "+
          (Math.abs(((su-ra)%360+360)%360)<90||Math.abs(((su-ra)%360+360)%360)>270?moTgraha("Rahu"):moTgraha("Ketu"))};
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
    moText(moP("umbra"),cx,cy+ru*0.62,S.w*0.021,P.dim,"center",500);
    moText(moP("penumbra"),cx,cy+rp*0.80,S.w*0.020,P.dim,"center",500);
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
  moSerif(moP("eclTitle",moTeclKind(label),x.kind==="solar"?moT("solar"):moT("lunar")),cx,st.y+st.h*0.09,S.w*0.052,P.ink);
  moText(moFmtDate(x.ms)+" · "+new Date(x.ms).toISOString().slice(11,16)+" UTC",
    cx,st.y+st.h*0.145,S.w*0.028,P.gold,"center",600);
  if(x.lon!=null){
    var nk=null; try{ nk=nakOf(x.lon); }catch(e){}
    moText(moP("candraIn",(x.kind==="solar"?moTgraha("Sun"):moTgraha("Moon")),moTrasi(Math.floor(x.lon/30)%12),skyDM(x.lon))+
      (nk?("  ·  "+moNakName(x.lon)+" "+moP("padaN",nk.pada)):""),
      cx,st.capY-st.h*0.13,S.w*0.026,P.dim,"center",500);
  }
  if(x.node!=null)
    moText(moP("degFromWhich",x.node.toFixed(1),x.which),cx,st.capY-st.h*0.08,S.w*0.034,
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
  return {ms:null, sub:moP("eclAhead",idx+1,n)};
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
    if(it.comb) moText(moP("astangata"),q[0],q[1]+S.w*0.052,S.w*0.019,P.gold,"center",600);
    else moText(Math.abs(it.rel).toFixed(0)+"°",q[0],q[1]+S.w*0.050,S.w*0.020,P.dim,"center",500);
  });
  moText(moP("orbNote2"),
    cx,cy+st.h*0.45,S.w*0.024,P.dim,"center",500);
  return {ms:ms, sub: burnt.length ? moP("combustList",burnt.map(function(x){return moTgraha(x);}).join(", "))
                                   : moP("nothingCombust")};
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
      moText(moTdignity(dg),
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
  moSerif(moTdignity(dgNow),cx,cy+st.h*0.42,S.w*0.052,COL[dgNow]);
  return {ms:ms, sub:moTgraha(en)+" in "+moTrasi(sg)+" "+skyDM(L)};
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
      moText([moP("rising"),moP("peak"),moP("setting")][rel===11?0:(rel===0?1:2)],
        cx+Math.cos(am)*R*0.80,cy-Math.sin(am)*R*0.80,S.w*0.019,P.malefic,"center",700);
  }
  c.strokeStyle=P.line; c.lineWidth=2.5;
  c.beginPath(); c.arc(cx,cy,R,0,6.2832); c.stroke();
  var ma=(180-moonSid)*Math.PI/180;
  moGlowDot(cx+Math.cos(ma)*R*0.56,cy-Math.sin(ma)*R*0.56,S.w*0.034,"#e8eaf6","#ffffff");
  moText(moG("Moon"),cx+Math.cos(ma)*R*0.56,cy-Math.sin(ma)*R*0.56,S.w*0.024,"#2a2f45","center",800);
  moText(moP("natalCandra"),cx+Math.cos(ma)*R*0.40,cy-Math.sin(ma)*R*0.40,S.w*0.020,P.dim,"center",500);
  var sa2=(180-sa)*Math.PI/180;
  moGlyph(cx+Math.cos(sa2)*R*0.86,cy-Math.sin(sa2)*R*0.86,S.w*0.040,"Saturn",P,true);
  var age=(ms-b)/31556952000;
  moSerif(inSS?moP("sadeSati"):(dhaiya?moP("dhaiya"):moP("clear")),cx,cy+st.h*0.42,S.w*0.054,
    inSS?P.malefic:(dhaiya?P.gold:P.benefic));
  moText(moP("age",age.toFixed(0)),cx,cy-st.h*0.45,S.w*0.034,P.ink,"center",700);
  return {ms:ms, sub:moP("saniIn",moTrasi(Math.floor(sa/30)%12),
          (inSS?moP("phasePost",[moP("rising"),moP("peak"),moP("setting")][phase===11?0:(phase===0?1:2)])
               :(dhaiya?moP("dhaiyaFrom",phase+1):moP("notOverMoon"))))};
 }}
];
MO_SCENES=MO_SCENES.concat(MO_MORE);


