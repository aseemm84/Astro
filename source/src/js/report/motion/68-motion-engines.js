/* ===== Three scenes over the three new engines ============================

   Chara daśā, Varṣaphala and the kakṣyā division each got a section in the
   report. A table is the right place to READ them and a poor place to see
   what they are: a sign-based clock turning, a year closing on itself, a
   graha crossing ground that supports it and then ground that does not.
   These three draw exactly the quantities those sections tabulate — from the
   same functions, not from a second computation — so a figure here and the
   same figure in the report cannot disagree.

   All three need a chart and say so through MO_NEEDS_CHART rather than by
   drawing something empty. */

/* -------------------------------------------------- 1. the kakṣyā crossing */
MO_SCENES.push({
 key:"kakshya", label:"Kakṣyā crossing", title:"The eighths of a sign",
 sub:"a graha crossing supported ground and unsupported · 3°45′ at a time",
 draw:function(p){
  var P=moPal(), S=moSize(), st=moStage(), c=MO.ctx, U=Math.min(S.w,S.h)/moTypeK();
  var D=MO.D, J=MO.J;
  if(!D||!J||!J.ashtakavarga||!J.ashtakavarga.prastara) throw new Error("no chart");
  var AV=J.ashtakavarga, PR=AV.prastara, ORDK=AV.kakshya_order;
  var en=MO.opt.subject||"Saturn";
  if(!PR[en]) en="Saturn";
  moStars();

  /* The window is the scene's own span, and the subject's longitude across it.
     A slow graha crosses two or three kakṣyās in a year, which is the point:
     the strip below is a year of ground, not a year of events. */
  var t0=(MO.opt.from==="birth")?moBirthMs():Date.now(), t1=t0+moSpanMs();
  var ms=t0+(t1-t0)*p;
  var lon=moSidAt(en,ms); if(lon==null) throw new Error("no position");
  var sg=Math.floor((((lon%360)+360)%360)/30)%12, deg=(((lon%360)+360)%360)-sg*30;
  var k=Math.min(7,Math.floor(deg/3.75)), lord=ORDK[k];
  var row=PR[en][lord], has=row?!!row[sg]:false;

  /* ---- the sign, drawn as its eight kakṣyās, left to right ---- */
  var x0=S.w*0.09, x1=S.w*0.91, w=(x1-x0)/8;
  var yTop=st.cy-U*0.30, h=U*0.46;
  for(var i=0;i<8;i++){
    var L=ORDK[i], r2=PR[en][L], on=r2?!!r2[sg]:false;
    var here=(i===k);
    c.globalAlpha=here?(on?0.52:0.44):(on?0.20:0.07);
    c.fillStyle=on?"#5fbf8f":"#c2604c";
    c.fillRect(x0+i*w+1,yTop,w-2,h);
    c.globalAlpha=1;
    c.strokeStyle=here?P.gold:"rgba(255,255,255,.18)";
    c.lineWidth=here?2.4:0.8;
    c.strokeRect(x0+i*w+1,yTop,w-2,h);
    moText(String(i+1),x0+i*w+w/2,yTop-U*0.045,U*0.030,P.dim,"center",700);
    moText(L==="Lagna"?"Lg":(moTgl(L)||L.slice(0,2)),x0+i*w+w/2,yTop+h*0.30,U*0.034,
           on?"#bfe9d2":"#f0c3b8","center",700);
    moText(on?"bindu":"none",x0+i*w+w/2,yTop+h*0.62,U*0.024,
           on?"#8fd6b0":"#dba396","center",500);
  }
  /* the graha itself, riding the strip at its true degree in the sign */
  var gx=x0+(deg/30)*(x1-x0);
  moGlowDot(gx,yTop+h+U*0.075,U*0.030,P.gold,P.gold);
  moText(moTgraha(en),gx,yTop+h+U*0.155,U*0.032,P.ink,"center",700);
  c.strokeStyle=P.gold; c.lineWidth=1.6; c.globalAlpha=0.65;
  c.beginPath(); c.moveTo(gx,yTop+h); c.lineTo(gx,yTop+h+U*0.040); c.stroke();
  c.globalAlpha=1;

  /* ---- the reading, in one line, because that is all it is ---- */
  var bh=(AV.bhinna||[]).filter(function(b){return b.graha===en;})[0];
  moText(SA[sg]+" "+dm(deg),st.cx,yTop-U*0.135,U*0.044,P.ink,"center",700);
  moText("kakṣyā "+(k+1)+" of 8 · "+lord+"’s"+
         (bh?"   ·   the sign carries "+bh.bindus[sg]+" of 8":""),
         st.cx,yTop-U*0.078,U*0.030,P.dim,"center",500);
  moText(has?"this eighth is supported":"this eighth is not supported",
         st.cx,yTop+h+U*0.245,U*0.040,has?"#8fd6b0":"#e8a79a","center",700);
  moCaption(ms,"Kakṣyā · "+en);
 }
});

/* ------------------------------------------------ 2. the Chara daśā wheel */
MO_SCENES.push({
 key:"chara", label:"Chara daśā", title:"A clock made of signs",
 sub:"Jaimini · each rāśi held for as long as the distance to its own lord",
 draw:function(p){
  var P=moPal(), S=moSize(), st=moStage(), c=MO.ctx, U=Math.min(S.w,S.h)/moTypeK();
  var D=MO.D; if(!D||!window.__charaDasha) throw new Error("no chart");
  var CD=window.__charaDasha(D), seq=CD.seq;
  var total=seq.reduce(function(a,s){return a+s.years;},0);
  /* the hand sweeps one whole cycle across the scene, so the scene IS the cycle */
  var at=p*total, run=0, cur=seq[0], curF=0;
  for(var i=0;i<seq.length;i++){
    if(at<run+seq[i].years){ cur=seq[i]; curF=(at-run)/seq[i].years; break; }
    run+=seq[i].years;
  }
  moStars();
  var R=Math.min(st.R,U*0.62), cx=st.cx, cy=st.cy-U*0.02;
  /* Twelve wedges sized by YEARS, not by equal twelfths — the whole point of
     Chara daśā is that the signs are not equal in time. */
  var a0=-Math.PI/2, acc=0;
  seq.forEach(function(m,k){
    var frac=m.years/total, a1=a0+frac*Math.PI*2;
    var on=(m===cur);
    c.beginPath(); c.moveTo(cx,cy); c.arc(cx,cy,R,a0,a1); c.closePath();
    c.fillStyle=on?P.gold:"#ffffff";
    c.globalAlpha=on?0.30:(k%2?0.070:0.035);
    c.fill(); c.globalAlpha=1;
    c.strokeStyle="rgba(255,255,255,.16)"; c.lineWidth=0.9; c.stroke();
    var mid=(a0+a1)/2, lr=R*0.74;
    moText(SA[m.sign].slice(0,4),cx+Math.cos(mid)*lr,cy+Math.sin(mid)*lr,
           U*0.030,on?P.ink:P.dim,"center",on?700:600);
    moText(m.years+"y",cx+Math.cos(mid)*(R*0.92),cy+Math.sin(mid)*(R*0.92),
           U*0.024,on?P.gold:P.dim,"center",600);
    a0=a1;
  });
  /* the hand */
  var ha=-Math.PI/2+(at/total)*Math.PI*2;
  c.strokeStyle=P.gold; c.lineWidth=2.6; c.globalAlpha=0.9;
  c.beginPath(); c.moveTo(cx,cy); c.lineTo(cx+Math.cos(ha)*R*1.02,cy+Math.sin(ha)*R*1.02);
  c.stroke(); c.globalAlpha=1;
  /* A solid centre, because the three lines below sat directly on the spokes
     and on the hand — legible in one frame and unreadable in the next as the
     hand swept under them. */
  c.beginPath(); c.arc(cx,cy,R*0.50,0,Math.PI*2);
  c.fillStyle=P.bg; c.globalAlpha=0.92; c.fill(); c.globalAlpha=1;
  c.strokeStyle="rgba(255,255,255,.12)"; c.lineWidth=1; c.stroke();
  /* no hub dot: it landed squarely on the middle line of the three below it.
     The disc is the hub. */
  /* the centre reads what the hand is on */
  moText(SA[cur.sign],cx,cy-U*0.062,U*0.050,P.ink,"center",700);
  moText(cur.years+" years · lord "+cur.lord,cx,cy+U*0.010,U*0.028,P.dim,"center",500);
  moText((CD.direction?"counting forward":"counting backward")+" from "+SA[D.LS],
         cx,cy+U*0.055,U*0.024,P.dim,"center",500);
  moText(Math.round(at)+" of "+total+" years",st.cx,Math.min(cy+R+U*0.085,st.capY-U*0.075),U*0.028,P.dim,"center",600);
  moCaption(D.jd? (D.jd-2440587.5)*86400000 + at*365.2564*86400000 : Date.now(),
            "Chara daśā · Jaimini");
 }
});

/* ------------------------------------------------- 3. the year closing */
MO_SCENES.push({
 key:"varsha", label:"Solar return", title:"The year closing on itself",
 sub:"Tājika · the Sun coming back to the degree it held at birth",
 draw:function(p){
  var P=moPal(), S=moSize(), st=moStage(), c=MO.ctx, U=Math.min(S.w,S.h)/moTypeK();
  var D=MO.D; if(!D||!D.P||!D.P.Sun) throw new Error("no chart");
  var natal=D.P.Sun.sid;
  /* one year of the Sun, from one return to the next, drawn on the ecliptic */
  var age=Math.max(0,Math.floor((D.nowJd-D.jd)/365.2563627));
  var a=window.__varshaPravesha?window.__varshaPravesha(D.jd,natal,age):null;
  var b=window.__varshaPravesha?window.__varshaPravesha(D.jd,natal,age+1):null;
  if(!a||!b) throw new Error("no return");
  var jd=a.jd+(b.jd-a.jd)*p, ms=(jd-2440587.5)*86400000;
  var lon=moSidAt("Sun",ms); if(lon==null) throw new Error("no position");
  moStars();
  var R=Math.min(st.R,U*0.56), cx=st.cx, cy=st.cy-U*0.02;
  /* the twelve signs as a plain ring, so the one degree that matters stands out */
  for(var i=0;i<12;i++){
    var s0=(i*30-90)*Math.PI/180, s1=((i+1)*30-90)*Math.PI/180;
    c.beginPath(); c.arc(cx,cy,R,s0,s1); c.arc(cx,cy,R*0.86,s1,s0,true); c.closePath();
    c.fillStyle="#ffffff"; c.globalAlpha=(i%2)?0.065:0.028; c.fill(); c.globalAlpha=1;
    var m2=(s0+s1)/2;
    /* three letters, because two cannot tell Mithuna from Mīna nor
       Karka from Kanyā, and a ring that mislabels a sign is worse than one
       that labels none */
    moText(SA[i].slice(0,3),cx+Math.cos(m2)*R*0.935,cy+Math.sin(m2)*R*0.935,
           U*0.021,P.dim,"center",600);
  }
  /* the natal degree — the mark the year is measured to */
  var na=(natal-90)*Math.PI/180;
  c.strokeStyle=P.gold; c.lineWidth=2.2; c.globalAlpha=0.85;
  c.beginPath(); c.moveTo(cx+Math.cos(na)*R*0.80,cy+Math.sin(na)*R*0.80);
  c.lineTo(cx+Math.cos(na)*R*1.06,cy+Math.sin(na)*R*1.06); c.stroke(); c.globalAlpha=1;
  /* the arc already travelled */
  var tr=(((lon-natal)%360)+360)%360;
  c.strokeStyle=P.gold; c.lineWidth=U*0.018; c.globalAlpha=0.30;
  c.beginPath(); c.arc(cx,cy,R*0.93,na,na+tr*Math.PI/180); c.stroke(); c.globalAlpha=1;
  /* the Sun */
  var sa=(lon-90)*Math.PI/180;
  moGlowDot(cx+Math.cos(sa)*R*0.93,cy+Math.sin(sa)*R*0.93,U*0.034,"#ffcb63","#ff9b2f");
  var left=360-tr;
  moText(dm(tr)+" travelled",cx,cy-U*0.045,U*0.042,P.ink,"center",700);
  moText(left<0.5?"the year closes":dm(left)+" to go",cx,cy+U*0.012,U*0.030,
         left<0.5?P.gold:P.dim,"center",600);
  moText("natal Sun "+SA[Math.floor(natal/30)%12]+" "+dm(natal%30),
         cx,cy+U*0.062,U*0.024,P.dim,"center",500);
  moCaption(ms,"Varṣaphala · year "+(age+1));
 }
});

/* All three are natal — there is no kakṣyā without an ashtakavarga, no Chara
   sequence without a lagna and no solar return without a natal Sun — and they
   are declared so in MO_NEEDS_CHART in 47-motion-pacing.js, beside the other
   nine. Declaring them here instead left the gate list in the source saying
   one thing and the gate in force saying another, which the app-shell harness
   caught the moment it ran. */
