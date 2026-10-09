/* ---------- derive ---------- */
function derive(J){
  var D={},LS=ridx(J.lagna&&J.lagna.rashi);
  D.LS=LS; D.lagna=J.lagna||{};
  D.lagDeg=(J.lagna&&J.lagna.rashi&&J.lagna.rashi.degInSign!=null)?J.lagna.rashi.degInSign:(J.lagna?J.lagna.sidereal_deg%30:0);
  D.lagNak=nakOf(J.lagna?J.lagna.sidereal_deg:0);
  var sunDeg=0;(J.grahas||[]).forEach(function(g){if(EN[g.key]==="Sun")sunDeg=g.sidereal_deg;});
  var avm={};(J.avasthas||[]).forEach(function(a){avm[EN[a.graha]]=a;});
  D.planets=(J.grahas||[]).map(function(g){
    var en=EN[g.key]||g.key,s=ridx(g.rashi),deg=(g.rashi&&g.rashi.degInSign!=null)?g.rashi.degInSign:g.sidereal_deg%30;
    var nk=nakOf(g.sidereal_deg),sep=Math.abs(((g.sidereal_deg-sunDeg+180)%360+360)%360-180);
    return {en:en,iast:g.iast||en,sign:s,deg:deg,sid:g.sidereal_deg,house:((s-LS)%12+12)%12+1,
      nak:nk.name,pada:nk.pada,naklord:nk.lord,dig:dignity(en,s,deg),retro:!!g.retrograde,
      combust:(COMB[en]!=null&&sep<=COMB[en]&&en!=="Sun"),sep:sep,
      speed:(g.speed_deg_per_day!=null?g.speed_deg_per_day:null),
      avastha:avm[en]?avm[en].avastha_iast:null,avpct:avm[en]?avm[en].strength_percent:null,
      digbala:DIGB[en]};
  });
  D.P={};D.planets.forEach(function(p){D.P[p.en]=p;});
  (function(){
    var FRN={Sun:["Moon","Mars","Jupiter"],Moon:["Sun","Mercury"],Mars:["Sun","Moon","Jupiter"],
      Mercury:["Sun","Venus"],Jupiter:["Sun","Moon","Mars"],Venus:["Mercury","Saturn"],Saturn:["Mercury","Venus"]};
    var ENM2={Sun:["Venus","Saturn"],Moon:[],Mars:["Mercury"],Mercury:["Moon"],
      Jupiter:["Mercury","Venus"],Venus:["Sun","Moon"],Saturn:["Sun","Moon","Mars"]};
    D.planets.forEach(function(p){
      var disp=LORD[p.sign];
      if(p.en==="Rahu"||p.en==="Ketu"||disp===p.en){ p.status=(disp===p.en?"own sign":"—"); return; }
      var dp=D.P[disp]; if(!dp){ p.status="—"; return; }
      var nat=(FRN[p.en]&&FRN[p.en].indexOf(disp)>=0)?"friend":((ENM2[p.en]&&ENM2[p.en].indexOf(disp)>=0)?"enemy":"neutral");
      var d=((dp.house-p.house)%12+12)%12+1;
      var tmp=([2,3,4,10,11,12].indexOf(d)>=0)?"friend":"enemy";
      var r;
      if(nat==="friend"&&tmp==="friend") r="great friend";
      else if(nat==="enemy"&&tmp==="enemy") r="great enemy";
      else if(nat==="neutral"&&tmp==="friend") r="friend";
      else if(nat==="neutral"&&tmp==="enemy") r="enemy";
      else if(nat===tmp) r=nat; else r="neutral";
      p.status=r;
    });
  })();
  D.owns={};for(var h=1;h<=12;h++){var sg=(LS+h-1)%12,l=LORD[sg];(D.owns[l]=D.owns[l]||[]).push(h);}
  var sav=(J.ashtakavarga&&J.ashtakavarga.sarva)||null;
  D.bhavas=(J.bhavas||[]).map(function(b){
    var n=b.idx+1,sg=ridx(b.rashi),cls=[];
    if([1,4,7,10].indexOf(n)>=0)cls.push("Kendra");
    if([1,5,9].indexOf(n)>=0)cls.push("Trikona");
    if([6,8,12].indexOf(n)>=0)cls.push("Dusthana");
    if([3,6,10,11].indexOf(n)>=0)cls.push("Upachaya");
    if([2,7].indexOf(n)>=0)cls.push("Maraka");
    return {n:n,sign:sg,sa:b.iast||"",lord:EN[b.ruler]||b.ruler,
      occ:(b.occupants||[]).map(function(o){return EN[o]||o;}),cls:cls,sav:sav?sav[sg]:null};
  });
  D.vargas=(J.vargas||[]).map(function(v){
    var pos={},dg={};
    Object.keys(v.positions||{}).forEach(function(k){var en=EN[k]||k;pos[en]=v.positions[k];dg[en]=dignity(en,v.positions[k],null);});
    return {code:v.varga,sa:v.sa,en:v.en,pos:pos,dig:dg};
  });
  var byc={};D.vargas.forEach(function(v){byc[v.code]=v;});
  var lsid=(J.lagna&&J.lagna.sidereal_deg)||0;
  D.vargas.forEach(function(v){ v.lagna=vargaLagna(v.code,lsid); });
  D.d9=byc.D9?byc.D9.pos:null;
  D.vargottama=[];
  if(byc.D1&&byc.D9)Object.keys(byc.D1.pos).forEach(function(k){if(byc.D1.pos[k]===byc.D9.pos[k])D.vargottama.push(k);});
  D.av=J.ashtakavarga||null; D.yogas=J.yogas||[]; D.arudhas=J.arudhas||[];
  D.ckar=J.chara_karakas||[]; D.nkar=J.naisargika_karakas||[];
  var cp=J.current_phase||{}; D.cp=cp; D.vim=cp.vimshottari||null; D.sade=cp.sadeSati||null;
  D.panch=cp.panchang||null; D.transits=cp.transits||[]; D.trel=cp.transitRelations||[];
  D.nowJd=cp.asOf_jd_utc||J.jd_utc; D.asof=cp.asOf_iso||"";
  D.stamp=J.substrate_stamp||""; D.ayan=J.ayanamsha_deg; D.jd=J.jd_utc; D.input=J.input||{};
  TZOFF=(D.input&&typeof D.input.tzHours==="number")?D.input.tzHours:0;
  try{ var _i=D.input,
           _ev=sunEventsPrecise(_i.year,_i.month,_i.day,_i.lat,_i.lon,_i.tzHours)
              || sunEvents(_i.year,_i.month,_i.day,_i.lat,_i.lon,_i.tzHours);
       D.sunriseH=_ev?_ev.rise:null; D.sunsetH=_ev?_ev.set:null;
       D.sunrisePrecise=!!(_ev&&_ev.riseDate);
       if(_ev&&_ev.riseDate){
         try{
           var _rjd=jdFrom(_i.year,_i.month,_i.day,(_ev.rise-_i.tzHours));
           D.sunAtSunrise=((Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body.Sun,_ev.riseDate,true)).elon
                            -AY(_rjd))%360+360)%360;
         }catch(e){ D.sunAtSunrise=null; }
       }
       D.weekday=(Math.floor(jdFrom(_i.year,_i.month,_i.day,0)+1.5)%7+7)%7;
  }catch(e){ D.sunriseH=null; D.sunsetH=null; D.weekday=0; }
  try{
    var _q=D.input, _ut=_q.hour+_q.minute/60-_q.tzHours;
    var _jd=jdFrom(_q.year,_q.month,_q.day,_ut);
    var _d=new Date(Date.UTC(_q.year,_q.month-1,_q.day,0,0,0)+_ut*3600000);
    var _ay=AY(_jd), _gast=Astronomy.SiderealTime(_d);
    var _lst=((_gast+_q.lon/15)%24+24)%24, _ramc=_lst*15*Math.PI/180;
    var _T=(_jd-2451545.0)/36525.0, _eps=(23.439291111-0.0130041667*_T)*Math.PI/180;
    var _mc=Math.atan2(Math.tan(_ramc),Math.cos(_eps))*180/Math.PI;
    if(Math.cos(_ramc)<0) _mc+=180;
    D.mcSid=((_mc-_ay)%360+360)%360;
  }catch(e){ D.mcSid=null; }
  try{
    var _s=(D.sunAtSunrise!=null?D.sunAtSunrise:(D.P.Sun?D.P.Sun.sid:0)), _el=((D.input.hour+D.input.minute/60)-(D.sunriseH||0)+24)%24;
    var _mk=function(nm,ab,hps){ var L=((_s+(_el/hps)*30)%360+360)%360;
      return {name:nm,abbr:ab,lon:L,sign:Math.floor(L/30)%12}; };
    D.specialLagnas=[_mk("Bhāva Lagna","BL",2),_mk("Horā Lagna","HL",1),_mk("Ghaṭika Lagna","GL",0.4)];
  }catch(e){ D.specialLagnas=[]; }
  // vimshottari from birth
  if(D.P.Moon){
    var seg=40/3,mn=((D.P.Moon.sid%360)+360)%360,ni=Math.floor(mn/seg),lb=NL9[ni%9];
    var frac=(mn-ni*seg)/seg,bal=VY[lb]*(1-frac);
    D.birthNak={nak:NAKS[ni],lord:lb,frac:frac,balance:bal};
    var mds=[],jd=J.jd_utc,i0=VSEQ.indexOf(lb);
    for(var i=0;i<9;i++){var lo=VSEQ[(i0+i)%9],yr=(i===0)?bal:VY[lo];
      mds.push({lord:lo,start:jd,end:jd+yr*DPY,years:yr,partial:i===0});jd+=yr*DPY;}
    D.mds=mds;
    D.antars=function(md){var out=[],s=md.start,j0=VSEQ.indexOf(md.lord);
      for(var i=0;i<9;i++){var l=VSEQ[(j0+i)%9],ay=VY[md.lord]*VY[l]/120;
        out.push({lord:l,start:s,end:s+ay*DPY,years:ay});s+=ay*DPY;}return out;};
    var cur=null;mds.forEach(function(m){if(D.nowJd>=m.start&&D.nowJd<m.end)cur=m;});
    D.curMd=cur;
    var nxt=null;for(var k=0;k<mds.length;k++){if(cur&&mds[k].lord===cur.lord&&k+1<mds.length){nxt=mds[k+1];break;}}
    D.nextMd=nxt;
  }
  return D;
}

