/* ============================================================================
   Four scenes built on the procedural bodies and on the horizon itself.

   The lagna scene answers a question the chart alone cannot: a chart shows the
   rising sign as a label in a box, which hides the fact that the sign is rising
   because the Earth is turning, that the point rising is a point and not a box,
   and that the twelve signs do not take the same time to climb out of the sea.
   BPHS says so in its first chapter — the ascendant is to be found "with the
   help of Rāśi durations applicable to the respective places" — and those
   durations are what the bars along the foot of the frame show.
   ============================================================================ */

var MO_SKY=[];

/* --------------------------------------------------------- shared horizon --- */
var MO_EPS=23.4393;                                   /* obliquity, near enough */
/* Where the observer is. The chart's own place, so the horizon on screen is the
   horizon the chart was cast for, not some generic one. */
function moWhere(){
  var i=MO.J&&MO.J.input;
  return {lat:(i&&i.lat!=null)?i.lat:28.6139, lon:(i&&i.lon!=null)?i.lon:77.2090,
          named:!!(i&&i.lat!=null)};
}
function moLST(jd,lonE){
  var T=(jd-2451545.0)/36525.0;
  var g=280.46061837+360.98564736629*(jd-2451545.0)+0.000387933*T*T;
  return ((g+lonE)%360+360)%360;
}
/* A point of the ecliptic, given its SIDEREAL longitude, placed on the sky.
   Validated against the engine's own Horizon to better than a hundredth of a
   degree; the engine is not called here only because this runs a few hundred
   times a frame and that would not hold sixty frames a second. */
function moAltAz(lonSid,ayan,lst,latDeg){
  var R=Math.PI/180;
  var lt=(lonSid+ayan)*R;                              /* tropical, which is what
                                                          the obliquity acts on */
  var se=Math.sin(MO_EPS*R), ce=Math.cos(MO_EPS*R);
  var ra=Math.atan2(ce*Math.sin(lt),Math.cos(lt))/R;
  var dec=Math.asin(se*Math.sin(lt))/R;
  var H=((lst-ra)%360+360)%360, h=H*R, phi=latDeg*R, de=dec*R;
  var alt=Math.asin(Math.sin(phi)*Math.sin(de)+Math.cos(phi)*Math.cos(de)*Math.cos(h))/R;
  var az=(Math.atan2(-Math.cos(de)*Math.sin(h),
          Math.sin(de)*Math.cos(phi)-Math.cos(de)*Math.sin(phi)*Math.cos(h))/R+360)%360;
  return {alt:alt,az:az,ra:ra,dec:dec};
}
/* The rising time of each rāśi at this latitude, in minutes of clock time.
   This is the classical oblique ascension: the right ascension the sign spans,
   less the ascensional difference its declination buys it. It is exactly the
   quantity BPHS calls the rāśi duration, and it is why the lagna sits in Kanyā
   for two and a half hours at Delhi and in Mīna for barely one. */
function moRisingTimes(latDeg,ayan){
  return moCached("rise|"+latDeg.toFixed(3)+"|"+ayan.toFixed(3),function(){
    var R=Math.PI/180, se=Math.sin(MO_EPS*R), ce=Math.cos(MO_EPS*R), phi=latDeg*R;
    function oa(lonSid){
      var lt=(lonSid+ayan)*R;
      var ra=Math.atan2(ce*Math.sin(lt),Math.cos(lt))/R; if(ra<0) ra+=360;
      var dec=Math.asin(se*Math.sin(lt));
      var x=Math.tan(phi)*Math.tan(dec);
      if(x>=1||x<=-1) return null;                     /* the sign never rises */
      return ra-Math.asin(x)/R;
    }
    var out=[], tot=0;
    for(var s=0;s<12;s++){
      var a=oa(s*30), b=oa(s*30+30);
      if(a==null||b==null){ out.push(null); continue; }
      var d=b-a; while(d<0) d+=360; while(d>=360) d-=360;
      out.push(d); tot+=d;
    }
    /* Sidereal degrees become clock minutes: the sky turns 360.9856° of hour
       angle in a mean solar day, so one degree is just under four minutes. */
    return {deg:out, min:out.map(function(d){ return d==null?null:d*1440/360.9856; }),
            total:tot};
  });
}

/* =========================================================== 1. the lagna === */
MO_SKY.push({key:"lagna", label:"Lagna", title:"The sign climbing out of the east",
 sub:"the lagna is a point on the ecliptic, and the Earth's turning brings it up",
 draw:function(p){
  var P=moPal(), S=moSize(), st=moStage(), c=MO.ctx, U=Math.min(S.w,S.h)/moTypeK();
  var W=moWhere();
  var t0=moBirthMs(), t1=t0+moSpanMs(), ms=t0+(t1-t0)*p;
  var d=new Date(ms), jd=ms/86400000+2440587.5;
  var ayan=0; try{ ayan=window.__ayanFor?window.__ayanFor("lahiri",jd):23.9; }catch(e){ ayan=23.9; }
  var lst=moLST(jd,W.lon);
  /* The lagna itself comes from the site's own engine, not from the drawing, so
     the degree on screen is the degree the chart would be cast on. */
  var lag=null, pos=null;
  try{
    var ut=d.getUTCHours()+d.getUTCMinutes()/60+d.getUTCSeconds()/3600+d.getUTCMilliseconds()/3600000;
    var q=window.quickSky({year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:d.getUTCDate(),
      hour:ut,minute:0,second:0,tzHours:0,lat:W.lat,lon:W.lon,
      ayanamsa:(MO.J&&MO.J.input&&MO.J.input.ayanamsa)||"lahiri"});
    lag=q.lagna; pos=q.positions||q.sky||null;
  }catch(e){}
  if(lag==null) throw new Error("no lagna");

  /* ---- the frame, measured from the bottom up: the rising-time bars sit at the
     foot, the reading above them, the strip of ground under the horizon, and the
     sky takes what is left. Sizing the sky first and hoping the text fits beneath
     is what makes a layout collide, so it is sized last. */
  var barH=st.h*0.180, readH=U*0.136, grndH=U*0.058;
  var hzY=st.capY-barH-readH-grndH;
  var skyT=U*0.030;
  var AZ0=90, AZSPAN=78;                                /* ±78° about due east */
  var kx=(S.w*0.46)/AZSPAN, ky=(hzY-skyT)/52;           /* 52° of altitude shown */
  function sky(az,alt){
    var da=((az-AZ0+540)%360)-180;
    return [st.cx+da*kx, hzY-alt*ky];
  }
  function onStage(q){ return q[0]>U*0.035 && q[0]<S.w-U*0.035 &&
                              q[1]>skyT+U*0.025 && q[1]<hzY+U*0.01; }
  moStars();
  /* the ground, and the horizon it meets */
  var gr=c.createLinearGradient(0,hzY,0,hzY+grndH*1.6);
  gr.addColorStop(0,P.key==="parchment"?"#cfc4a8":"#141a2e");
  gr.addColorStop(1,P.bg);
  c.fillStyle=gr; c.fillRect(0,hzY,S.w,grndH*1.6);
  c.strokeStyle=P.gold; c.globalAlpha=.55; c.lineWidth=2.5;
  c.beginPath(); c.moveTo(0,hzY); c.lineTo(S.w,hzY); c.stroke(); c.globalAlpha=1;
  /* compass marks along it */
  [[45,"NE"],[90,"E"],[135,"SE"]].forEach(function(cm){
    var q=sky(cm[0],0); if(q[0]<0||q[0]>S.w) return;
    c.strokeStyle=P.line; c.lineWidth=1.5; c.globalAlpha=.8;
    c.beginPath(); c.moveTo(q[0],hzY); c.lineTo(q[0],hzY+U*0.016); c.stroke(); c.globalAlpha=1;
    moText(cm[1],q[0],hzY+U*0.036,U*0.020,P.dim,"center",700);
  });
  /* altitude rings, so the height of the ecliptic can be read off */
  [15,30,45].forEach(function(a){
    c.strokeStyle=P.line; c.globalAlpha=.30; c.lineWidth=1;
    c.setLineDash([3,7]);
    c.beginPath(); c.moveTo(0,hzY-a*ky); c.lineTo(S.w,hzY-a*ky); c.stroke();
    c.setLineDash([]); c.globalAlpha=1;
    moText(a+"°",U*0.018,hzY-a*ky-U*0.012,U*0.016,P.dim,"left",500);
  });

  /* ---- the ecliptic, and the rāśis strung along it */
  var pts=[];
  for(var L=0;L<=360;L+=1.5){
    var A=moAltAz(L,ayan,lst,W.lat);
    pts.push({L:L,a:A.alt,z:A.az,q:sky(A.az,A.alt)});
  }
  c.strokeStyle=P.glow; c.lineWidth=3.5; c.globalAlpha=.85;
  c.beginPath();
  var pen=false;
  pts.forEach(function(o){
    var vis=o.a>-6 && Math.abs(((o.z-AZ0+540)%360)-180)<AZSPAN+6;
    if(!vis){ pen=false; return; }
    if(!pen){ c.moveTo(o.q[0],o.q[1]); pen=true; } else c.lineTo(o.q[0],o.q[1]);
  });
  c.stroke(); c.globalAlpha=1;
  /* rāśi boundaries: a tick on the ecliptic and the glyph beside it */
  for(var s2=0;s2<12;s2++){
    var B=moAltAz(s2*30,ayan,lst,W.lat);
    if(B.alt<-2) continue;
    var qb=sky(B.az,B.alt); if(!onStage(qb)) continue;
    c.strokeStyle=P.dim; c.lineWidth=2; c.globalAlpha=.75;
    c.beginPath(); c.arc(qb[0],qb[1],U*0.008,0,6.2832); c.stroke(); c.globalAlpha=1;
    var M=moAltAz(s2*30+15,ayan,lst,W.lat);
    if(M.alt<0) continue;
    var qm=sky(M.az,M.alt); if(!onStage(qm)) continue;
    if(MO.opt.labels)
      moText(moSign(s2),qm[0],qm[1]-U*0.030,U*(MO.opt.symbols?0.030:0.021),P.dim,"center",600);
  }
  /* the grahas, where they actually stand in that sky */
  MO_NAMES.forEach(function(en){
    if(!MO.show[en]) return;
    var Ls=moSidAt(en,ms); if(Ls==null) return;
    var A2=moAltAz(Ls,ayan,lst,W.lat);
    var qg=sky(A2.az,A2.alt);
    if(!onStage(qg)) return;
    c.globalAlpha=A2.alt<0?0.30:1;                      /* below the horizon: faint */
    moGlyph(qg[0],qg[1],U*0.024,en,P,true);
    c.globalAlpha=1;
  });

  /* ---- the lagna itself: the point of the ecliptic standing on the horizon */
  var LA=moAltAz(lag,ayan,lst,W.lat);
  var ql=sky(LA.az,0);
  /* a shaft of light up the ecliptic from the rising point, tapered so it reads as
     a beam rather than as a rectangle laid over the sky */
  var beam=c.createLinearGradient(ql[0],hzY,ql[0],hzY-U*0.40);
  beam.addColorStop(0,"rgba(240,184,71,0.45)");
  beam.addColorStop(1,"rgba(240,184,71,0)");
  c.fillStyle=beam;
  c.beginPath(); c.moveTo(ql[0]-U*0.026,hzY); c.lineTo(ql[0]+U*0.026,hzY);
  c.lineTo(ql[0]+U*0.008,hzY-U*0.40); c.lineTo(ql[0]-U*0.008,hzY-U*0.40);
  c.closePath(); c.fill();
  moGlowDot(ql[0],ql[1],U*0.019,"#f0b847","#ffd37a");
  c.strokeStyle=P.gold; c.lineWidth=2.5;
  c.beginPath(); c.arc(ql[0],ql[1],U*0.040,0,6.2832); c.stroke();
  var sgn=Math.floor(lag/30)%12, deg=lag%30;
  var dm=Math.floor(deg), mn=Math.floor((deg-dm)*60);

  /* ---- the reading, in the band kept for it */
  var nk=nakOf(lag), lord=moTgraha(LORD[sgn]);
  var lordL=moSidAt(lord,ms);
  var ty=hzY+grndH+U*0.026;
  moText(moP("LAGNA"),st.cx,ty-U*0.004,U*0.019,P.gold,"center",700);
  moSerif(dm+"° "+(mn<10?"0":"")+mn+"′  "+moTrasi(sgn),st.cx,ty+U*0.032,U*0.038,P.ink,"center");
  moText(moNakName(lag)+" "+moP("padaN",nk.pada)+"  ·  "+moP("lordIs",lord)+
         (lordL==null?"":" in "+moTrasi(Math.floor(lordL/30)%12)),
    st.cx,ty+U*0.066,U*0.021,P.dim,"center",500);

  /* ---- the rāśi durations: the part a boxed chart cannot show */
  var RT=moRisingTimes(W.lat,ayan);
  var bTop=st.capY-barH, bBase=st.capY-U*0.046;        /* the bars stand on bBase */
  var bw=S.w*0.88, bx0=st.cx-bw/2, cw=bw/12;
  var maxm=0; RT.min.forEach(function(m){ if(m!=null&&m>maxm) maxm=m; });
  var bMax=bBase-bTop-U*0.030;
  moText("how long each rāśi takes to rise at "+Math.abs(W.lat).toFixed(1)+"° "+
         (W.lat>=0?"N":"S")+" — BPHS asks for exactly these durations",
    st.cx,bTop-U*0.008,U*0.019,P.dim,"center",500);
  for(var s3=0;s3<12;s3++){
    var m3=RT.min[s3], x3=bx0+s3*cw;
    var hgt=(m3==null)?0:(m3/maxm)*bMax;
    var on=(s3===sgn);
    c.fillStyle=on?P.gold:P.line; c.globalAlpha=on?0.92:0.55;
    c.fillRect(x3+cw*0.16,bBase-hgt,cw*0.68,hgt);
    c.globalAlpha=1;
    moText(moSign(s3),x3+cw/2,bBase+U*0.024,U*(MO.opt.symbols?0.023:0.0155),
      on?P.gold:P.dim,"center",on?800:600);
    /* the figure goes inside the bar, where it cannot collide with the heading */
    if(m3!=null)
      moText((m3/60).toFixed(1)+"h",x3+cw/2,bBase-hgt+U*0.016,U*0.0145,
        on?"#2a2206":P.ink,"center",700);
  }
  return {ms:ms, sub:moP("lagnaRise",dm+"° "+(mn<10?"0":"")+mn+"′",moTrasi(sgn),
          (RT.min[sgn]==null?moP("circumpolar"):(RT.min[sgn]/60).toFixed(2)))};
 }});

/* The disc is rendered at full size when the playhead is still and at a reduced
   size while it runs. A still is what gets exported, so it should be as sharp as
   the frame allows; a running scene is judged on whether it moves smoothly, and
   nobody can see the difference at thirty frames a second. */
function moR2(Rdraw,cap){
  var lim=MO.playing?Math.min(cap,200):cap;
  return Math.max(36,Math.round(Math.min(lim,Rdraw)));
}

/* =========================================================== 2. Candra ====== */
MO_SKY.push({key:"moon", label:"Candra", title:"Candra, lit as the sky lights it",
 sub:"the phase, the libration and the distance are the real ones for the moment shown",
 draw:function(p){
  var P=moPal(), S=moSize(), st=moStage(), c=MO.ctx, U=Math.min(S.w,S.h)/moTypeK();
  var t0=Date.now(), t1=t0+moSpanMs(), ms=t0+(t1-t0)*p, dt=new Date(ms);
  var su=moSidAt("Sun",ms), mo=moSidAt("Moon",ms);
  if(su==null||mo==null) throw new Error("no position");
  var el=((mo-su)%360+360)%360, waxing=el<180;
  var ill=null, lib=null;
  try{ ill=Astronomy.Illumination(Astronomy.Body.Moon,dt); }catch(e){}
  try{ lib=Astronomy.Libration(dt); }catch(e){}
  if(!ill||!lib) throw new Error("no ephemeris");
  var pc=panchanga(su,mo), nk=nakOf(mo);
  moStars();
  /* The drawn size follows the real apparent size. It swings by a seventh across
     a month — perigee to apogee — and that swing is the whole of the "supermoon",
     so it is worth showing rather than normalising away. */
  var meanDiam=0.5181;
  var Rbase=Math.min(S.w*0.355,(st.h-U*0.19)*0.42);
  var Rdraw=Rbase*(lib.diam_deg/meanDiam);
  var cx=st.cx, cy=st.y+(st.h-U*0.14)*0.50;
  /* Light direction in view space. The phase angle is Sun-Moon-Earth, so at zero
     the Moon is full and at 180° new; the sign of the sideways component is what
     puts the lit edge on the right while waxing. */
  var pa=ill.phase_angle*Math.PI/180;
  var lx=(waxing?1:-1)*Math.sin(pa), lz=Math.cos(pa);
  /* Earthshine. The Earth's phase is the Moon's turned inside out, so the dark
     side is most strongly lit when the Moon is thinnest — which is exactly when
     it is visible to the eye. The brightness here is raised far above its true
     ratio, as any photograph of it must be. */
  var esh=(1-ill.phase_fraction);
  /* Scaled so a thin crescent shows the ashen disc plainly and a gibbous Moon
     shows none, which is how it behaves — and how a photograph has to render it,
     since the true ratio of earthshine to sunlight is far beyond any screen. */
  var es=esh*esh*42;
  if(!isFinite(Rdraw)||Rdraw<=0) Rdraw=Rbase;
  var R2=moR2(Rdraw,430);
  var disc=moBody(R2,{tex:moMoonTex(), lx:lx, ly:0.02, lz:lz, rot:lib.elon,
                      axis:-lib.elat, relief:1.0, b:0.85, exposure:1.18,
                      night:[es*2.2,es*2.4,es*3.1]});
  /* a soft halo, the way a bright Moon sits in a real sky */
  var ha=(0.13*ill.phase_fraction+0.02);
  var hq=Math.round(ha*40)/40;                        /* bucketed, so it caches */
  var hs=moGlowSprite("moonhalo"+hq,[[0,"rgba(190,205,255,"+hq.toFixed(3)+")"],
    [0.43,"rgba(190,205,255,"+hq.toFixed(3)+")"],[1,"rgba(190,205,255,0)"]]);
  c.drawImage(hs,cx-Rdraw*2.1,cy-Rdraw*2.1,Rdraw*4.2,Rdraw*4.2);
  c.drawImage(disc,cx-Rdraw,cy-Rdraw,Rdraw*2,Rdraw*2);

  /* Named features, placed by their real selenographic coordinates and shown
     only where the Sun has actually reached them. The same rotation and tilt the
     disc was built with are applied here, so a label cannot drift off its mare. */
  if(MO.opt.labels){
    var ct=Math.cos(-lib.elat*Math.PI/180), stt=Math.sin(-lib.elat*Math.PI/180);
    [["Mare Imbrium",-16,33],["Mare Serenitatis",17,28],["Mare Tranquillitatis",31,8],
     ["Mare Crisium",59,17],["Oceanus Procellarum",-57,18],["Tycho",-11,-43]
    ].forEach(function(f){
      var lo=(f[1]-lib.elon)*Math.PI/180, la=f[2]*Math.PI/180;
      var wx=Math.cos(la)*Math.sin(lo), wy=Math.sin(la), wz=Math.cos(la)*Math.cos(lo);
      var yv=-(wy*ct+wz*stt), zv=-wy*stt+wz*ct;
      if(zv<0.22) return;                                /* round the limb */
      var nxv=wx, nyv=-yv, nzv=zv;
      if(nxv*lx+nyv*0.02+nzv*lz<0.06) return;            /* still in the dark */
      var fx=cx+wx*Rdraw, fy=cy+yv*Rdraw;
      c.strokeStyle="rgba(255,255,255,0.75)"; c.globalAlpha=.8; c.lineWidth=1.2;
      c.beginPath(); c.arc(fx,fy,U*0.006,0,6.2832); c.stroke(); c.globalAlpha=1;
      /* a dark outline, because these labels sit on bright highland as often as
         on dark mare and grey-on-grey is unreadable on either */
      c.save(); c.font='600 '+(U*0.016)+'px system-ui,sans-serif';
      c.textAlign="center"; c.textBaseline="middle";
      c.lineWidth=3.5; c.strokeStyle="rgba(6,8,16,0.85)"; c.lineJoin="round";
      c.strokeText(f[0],fx,fy-U*0.017);
      c.fillStyle="#e8ecfa"; c.fillText(f[0],fx,fy-U*0.017); c.restore();
    });
  }

  /* the reading */
  var ry=cy+Rdraw+U*0.075;
  moSerif(moTtithiName(pc.tithi)+"  ·  "+moP("pakshaOf",moTpaksha(pc.paksha)),st.cx,ry,U*0.040,P.ink,"center");
  moText(moP("pctLit",(waxing?moP("waxing"):moP("waning")),
           (ill.phase_fraction*100).toFixed(1),el.toFixed(1),moTgraha("Sun")),
    st.cx,ry+U*0.042,U*0.023,P.gold,"center",600);
  moText(moP("moonWhere",moNakName(mo),nk.pada,moTrasi(Math.floor(mo/30)%12),
           Math.round(lib.dist_km).toLocaleString()),
    st.cx,ry+U*0.076,U*0.020,P.dim,"center",500);
  moText(moP("moonSurface"),st.cx,ry+U*0.104,U*0.016,P.dim,"center",500);
  return {ms:ms, sub:moTtithiName(pc.tithi)+" "+moTpaksha(pc.paksha)+" · "+(ill.phase_fraction*100).toFixed(0)+
          "% · "+(lib.diam_deg*60).toFixed(1)+"′"};
 }});

/* =========================================================== 3. Sūrya ====== */
MO_SKY.push({key:"sun", label:"Sūrya", title:"Sūrya, the one graha with no phase",
 sub:"granulation, limb darkening and spots — and a latitude of zero, always",
 draw:function(p){
  var P=moPal(), S=moSize(), st=moStage(), c=MO.ctx, U=Math.min(S.w,S.h)/moTypeK();
  var t0=Date.now(), t1=t0+moSpanMs(), ms=t0+(t1-t0)*p, dt=new Date(ms);
  var su=moSidAt("Sun",ms); if(su==null) throw new Error("no position");
  var ill=null; try{ ill=Astronomy.Illumination(Astronomy.Body.Sun,dt); }catch(e){}
  /* geo_dist, not helio_dist: the Sun's heliocentric distance is zero, which
     divided into the mean angular diameter gives an infinite disc and takes the
     whole scene down with it. */
  var dist=(ill&&ill.geo_dist)?ill.geo_dist:1;         /* Earth-Sun, in AU */
  var diam=0.5331/dist;                                /* degrees, from 1 AU */
  var nk=nakOf(su), sgn=Math.floor(su/30)%12;
  var ayan=0; try{ ayan=window.__ayanFor?window.__ayanFor("lahiri",ms/86400000+2440587.5):23.9; }catch(e){}
  var trop=((su+ayan)%360+360)%360;
  moStars();
  var Rbase=Math.min(S.w*0.355,(st.h-U*0.17)*0.42);
  var Rdraw=Rbase*(diam/0.5331);
  if(!isFinite(Rdraw)||Rdraw<=0) Rdraw=Rbase;
  var cx=st.cx, cy=st.y+(st.h-U*0.12)*0.50;
  /* The equator turns in about 25 days, the poles in 34 — the texture here turns
     rigidly at the equatorial rate, so the spots march across at the right pace
     but do not shear apart as the real ones do. */
  var rot=((ms-t0)/86400000)*(360/25.38);
  /* The glow around the disc. In white light the corona is a millionth of the
     photosphere and invisible except at totality, so what belongs here is not a
     crown of rays but the soft bloom any bright source leaves in an optic — and
     a faint, irregular inner structure rather than clean spokes. */
  var cs=moGlowSprite("suncorona",[[0,"rgba(255,214,146,0.30)"],
    [0.369,"rgba(255,214,146,0.30)"],[0.438,"rgba(255,186,96,0.10)"],
    [1,"rgba(255,170,80,0)"]]);
  c.drawImage(cs,cx-Rdraw*2.6,cy-Rdraw*2.6,Rdraw*5.2,Rdraw*5.2);
  c.save(); c.globalCompositeOperation="lighter";
  for(var k=0;k<13;k++){
    var a=(k/13)*Math.PI*2+rot*0.003+((k*7)%5)*0.09;
    var len=Rdraw*(1.10+0.42*((k*37)%11)/11);
    var g2=c.createLinearGradient(cx+Math.cos(a)*Rdraw,cy+Math.sin(a)*Rdraw,
                                  cx+Math.cos(a)*len,cy+Math.sin(a)*len);
    g2.addColorStop(0,"rgba(255,206,132,0.038)"); g2.addColorStop(1,"rgba(255,186,100,0)");
    c.strokeStyle=g2; c.lineWidth=Rdraw*(0.22+0.26*((k*53)%7)/7);
    c.beginPath(); c.moveTo(cx+Math.cos(a)*Rdraw*0.99,cy+Math.sin(a)*Rdraw*0.99);
    c.lineTo(cx+Math.cos(a)*len,cy+Math.sin(a)*len); c.stroke();
  }
  c.restore();
  var R2=moR2(Rdraw,400);
  c.drawImage(moSunDisc(R2,rot),cx-Rdraw,cy-Rdraw,Rdraw*2,Rdraw*2);
  /* prominences: loops of cool gas held in the magnetic field, pink because they
     shine in hydrogen alpha rather than in the continuum */
  /* Prominences: loops of cooler gas held up by the magnetic field, pink because
     they shine in hydrogen alpha rather than in the continuum. Small and thin —
     the largest reach a twentieth of the disc, not a fifth. */
  c.save(); c.globalCompositeOperation="lighter";
  /* the chromosphere: a thin warm rim just outside the photosphere, which is the
     layer the prominences rise out of */
  var chs=moGlowSprite("sunchromo",[[0,"rgba(255,120,110,0)"],
    [0.938,"rgba(255,120,110,0)"],[0.958,"rgba(255,124,112,0.22)"],
    [1,"rgba(255,120,110,0)"]]);
  c.drawImage(chs,cx-Rdraw*1.05,cy-Rdraw*1.05,Rdraw*2.1,Rdraw*2.1);
  for(var q=0;q<4;q++){
    var pa2=((q*131+40)%360)*Math.PI/180+rot*0.010;
    var hh=Rdraw*(0.020+0.028*((q*41)%9)/9);
    var wd=Rdraw*(0.028+0.026*((q*29)%5)/5);
    c.save(); c.translate(cx+Math.cos(pa2)*Rdraw*0.99,cy+Math.sin(pa2)*Rdraw*0.99);
    c.rotate(pa2);
    var pg=c.createLinearGradient(0,0,hh,0);
    pg.addColorStop(0,"rgba(255,104,116,0.42)"); pg.addColorStop(1,"rgba(255,104,116,0)");
    c.fillStyle=pg;
    c.beginPath(); c.moveTo(0,-wd);
    c.bezierCurveTo(hh*0.75,-wd*1.1,hh*0.95,-wd*0.25,hh,0);
    c.bezierCurveTo(hh*0.95,wd*0.25,hh*0.75,wd*1.1,0,wd);
    c.closePath(); c.fill();
    c.restore();
  }
  c.restore();
  /* the reading */
  var ry=cy+Rdraw+U*0.085;
  moSerif(dmsShort(su%30)+"  "+moTrasi(sgn),st.cx,ry,U*0.040,P.ink,"center");
  moText(moP("sunWhere",moNakName(su),nk.pada,
           trop>=90&&trop<270?moP("dakshinayana"):moP("uttarayana")),
    st.cx,ry+U*0.042,U*0.023,P.gold,"center",600);
  moText(moP("sunFacts",dist.toFixed(4),(diam*60).toFixed(2)),
    st.cx,ry+U*0.076,U*0.020,P.dim,"center",500);
  moText(moP("sunSpots","30"),st.cx,ry+U*0.104,U*0.016,P.dim,"center",500);
  return {ms:ms, sub:moTrasi(sgn)+" "+dmsShort(su%30)+" · "+dist.toFixed(4)+" AU · "+
          (diam*60).toFixed(2)+"′"};
 }});
function dmsShort(v){ var d=Math.floor(v), m=Math.floor((v-d)*60);
  return d+"°"+(m<10?"0":"")+m+"′"; }

/* ====================================================== 4. the five worlds == */
var MO_WORLD=[
  {en:"Mercury", tex:moMercuryTex, axis:0,   col:[1,1,1],        km:4879,   relief:1.0,
   note:"mercuryNote"},
  {en:"Venus",   tex:moVenusTex,   axis:0,   col:[1,1,1],        km:12104,  relief:0,
   note:"venusNote"},
  {en:"Mars",    tex:moMarsTex,    axis:25,  col:[1,1,1],        km:6779,   relief:0.9,
   note:"marsNote"},
  {en:"Jupiter", tex:moJupiterTex, axis:3,   col:[1,1,1],        km:139820, relief:0,
   note:"jupiterNote"},
  {en:"Saturn",  tex:moSaturnTex,  axis:27,  col:[1,1,1],        km:116460, relief:0,
   note:"saturnNote"}
];
MO_SKY.push({key:"worlds", label:"The five worlds", title:"The tārā grahas as worlds",
 sub:"each at its true phase, with its real size and distance beside it",
 draw:function(p){
  var P=moPal(), S=moSize(), st=moStage(), c=MO.ctx, U=Math.min(S.w,S.h)/moTypeK();
  var t0=Date.now(), t1=t0+moSpanMs(), ms=t0+(t1-t0)*p, dt=new Date(ms);
  var n=MO_WORLD.length, each=1/n;
  /* Either hold one graha for the whole span, or take the five in turn across it.
     Holding one is what you want to watch a phase close or Śani's rings open;
     the turn is what you want to see them against each other. */
  var pick=MO.opt.world, idx=-1;
  if(pick) for(var wi=0;wi<n;wi++) if(MO_WORLD[wi].en===pick) idx=wi;
  if(idx<0) idx=Math.min(n-1,Math.floor(p/each));
  var Wd=MO_WORLD[idx], en=Wd.en;
  var ill=null; try{ ill=Astronomy.Illumination(Astronomy.Body[en],dt); }catch(e){}
  if(!ill) throw new Error("no ephemeris");
  var L=moSidAt(en,ms);
  /* Apparent diameter from the real distance. Everything is magnified by the
     same factor, so the comparison between the five is honest even though no
     eye ever sees them this large. */
  var dkm=ill.geo_dist*149597870.7;
  var appArc=(Wd.km/dkm)*206264.8;                     /* arcseconds */
  /* Two ways to size the disc, and they answer different questions. At one
     magnification for all five, Guru is a disc and Maṅgala a dot, which is the
     truth and is why a small telescope shows one and not the other. Filled to the
     frame, each is legible but the comparison is gone. The control picks; the
     frame says which is in force either way. */
  var room=Math.min(S.w*0.355,(st.h-U*0.26)*0.40);
  var ringK=(en==="Saturn")?2.42:1.0;                  /* the rings reach this far */
  var same=(MO.opt.wsame===true);
  var MAG=room/48;                                     /* px per arcsecond, for all */
  var Rdraw=same?Math.max(U*0.012,appArc*MAG)
                :Math.max(U*0.05,room*0.96);
  Rdraw=Rdraw/ringK;
  if(!isFinite(Rdraw)||Rdraw<=0) Rdraw=U*0.10;
  /* Centre the body and its reading in the room left above the size strip, so a
     small disc does not leave the frame looking half empty. */
  var availT=U*0.04, availB=st.h-U*0.175;
  var blockH=2*Rdraw*ringK+U*0.20;
  var cx=st.cx, cy=Math.max(availT+Rdraw*ringK,
                            (availT+availB-blockH)/2+Rdraw*ringK);
  moStars();
  /* phase: same construction as the Moon's, and for the same reason */
  var el=null, sl=moSidAt("Sun",ms);
  if(L!=null&&sl!=null){ el=((L-sl)%360+360)%360; }
  var pa=ill.phase_angle*Math.PI/180;
  var lx=((el!=null&&el<180)?1:-1)*Math.sin(pa), lz=Math.cos(pa);
  var rot=((ms-t0)/86400000)*((en==="Jupiter")?880:(en==="Saturn")?810:(en==="Mars")?350:60);
  var R2=moR2(Rdraw,380);
  var disc=moBody(R2,{tex:Wd.tex(), lx:lx, ly:0.03, lz:lz, rot:rot, axis:Wd.axis,
                      relief:(Wd.tex().gx?Wd.relief:0), b:(Wd.relief?0.82:0.25), exposure:1.15,
                      night:[2,2,3]});
  if(en==="Saturn") moRings(cx,cy,Rdraw,dt,lx,lz,P);
  c.drawImage(disc,cx-Rdraw,cy-Rdraw,Rdraw*2,Rdraw*2);
  if(en==="Saturn") moRings(cx,cy,Rdraw,dt,lx,lz,P,true);
  /* the reading */
  var ry=cy+Rdraw*ringK+U*0.080;
  moSerif(moTgraha(en),st.cx,ry,U*0.044,P.ink,"center");
  moText(moP("worldLit",(ill.phase_fraction*100).toFixed(0),appArc.toFixed(1),ill.mag.toFixed(1)),st.cx,ry+U*0.044,U*0.023,P.gold,"center",600);
  moText((L==null?"":moTrasi(Math.floor(L/30)%12)+" "+dmsShort(L%30)+"  ·  ")+
         ill.geo_dist.toFixed(3)+" AU from Earth",
    st.cx,ry+U*0.078,U*0.020,P.dim,"center",500);
  moText(moP(Wd.note),st.cx,ry+U*0.106,U*0.017,P.dim,"center",500);
  moText(same?("every disc at one magnification — "+Math.round(MAG)+" px per arcsecond, "+
               "so these five can be compared")
             :moP("worldFilled"),
    st.cx,ry+U*0.130,U*0.016,P.dim,"center",500);
  /* a size strip, so the five can be compared rather than taken one at a time */
  var sBase=st.capY-U*0.052, bw=S.w*0.84, bx0=st.cx-bw/2, cw=bw/5;
  var arcs=MO_WORLD.map(function(w){
    try{ return (w.km/(Astronomy.Illumination(Astronomy.Body[w.en],dt).geo_dist*149597870.7))*206264.8; }
    catch(e){ return 0; }
  });
  var amax=Math.max.apply(null,arcs)||1;
  var srMax=Math.min(cw*0.30,U*0.038);
  moText(moP("oneMag"),
    st.cx,sBase-srMax*2-U*0.030,U*0.018,P.dim,"center",500);
  MO_WORLD.forEach(function(w,i){
    var rr=Math.max(1.5,(arcs[i]/amax)*srMax);
    var x=bx0+i*cw+cw/2, on=(i===idx);
    c.fillStyle=on?P.gold:P.dim; c.globalAlpha=on?0.95:0.45;
    c.beginPath(); c.arc(x,sBase-srMax,rr,0,6.2832); c.fill(); c.globalAlpha=1;
    moText(moG(w.en),x,sBase+U*0.010,U*0.017,on?P.gold:P.dim,"center",700);
    moText(arcs[i].toFixed(0)+"″",x,sBase+U*0.030,U*0.014,P.dim,"center",500);
  });
  return {ms:ms, sub:moTgraha(en)+" · "+(ill.phase_fraction*100).toFixed(0)+"% lit · "+
          appArc.toFixed(1)+"″ · "+ill.geo_dist.toFixed(3)+" AU"};
 }});

/* Saturn's rings. The opening angle is real: it comes from where the planet's
   pole points, which is why they shut to a line every fifteen years or so and
   why Galileo lost them entirely between one year and the next. */
function moRings(cx,cy,R,dt,lx,lz,P,front){
  var c=MO.ctx, B=16;
  /* The engine reports the ring tilt directly, so there is no reason to derive it
     from the pole by hand and a good reason not to: the hand version would be a
     second implementation of the same quantity, free to disagree with the first. */
  try{ B=Astronomy.Illumination(Astronomy.Body.Saturn,dt).ring_tilt; }catch(e){ B=16; }
  var ky=Math.abs(Math.sin(B*Math.PI/180));
  /* C, B, A and F, by their real radii in planet radii, with the Cassini division
     as the gap between B and A. Each is a filled annulus in projection — stroking
     an ellipse instead gives a hoop of even thickness all the way round, which is
     not what a tilted flat ring looks like from the side. */
  var RINGS=[[1.24,1.52,0.14],[1.52,1.95,0.80],[2.03,2.27,0.46]];
  c.save();
  c.beginPath();
  var up=(B>=0);
  if(front===!!up){ c.rect(cx-R*4,cy-R*4,R*8,R*4); }     /* the half above centre */
  else { c.rect(cx-R*4,cy,R*8,R*4); }
  c.clip();
  RINGS.forEach(function(rg){
    c.beginPath();
    c.ellipse(cx,cy,R*rg[1],R*rg[1]*ky,0,0,6.2832);
    c.ellipse(cx,cy,R*rg[0],R*rg[0]*ky,0,0,6.2832,true);   /* cut the hole */
    c.fillStyle="rgba(228,216,192,"+rg[2].toFixed(2)+")";
    c.fill("evenodd");
  });
  c.restore();
  if(!front){
    moText(moP("ringsOpen",Math.abs(B).toFixed(1)),cx,cy-R*2.0-Math.max(12,R*0.16),
      Math.max(11,R*0.14),P.dim,"center",500);
  }
}

MO_SCENES=MO_SCENES.concat(MO_SKY);
