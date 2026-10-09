/* ===== Full JSON export =====
   Everything an analyst — human or machine — needs to work the chart without
   re-running this page. Birth data and engine output sit at the top level; every
   figure this page derives sits under `derived`; and anything describing the sky at
   the moment of export is quarantined under `as_of`, because that is not a fact
   about the nativity. */
function jxRound(x,n){ return x==null?null:Math.round(x*Math.pow(10,n||4))/Math.pow(10,n||4); }
function jxSign(lon){ return Math.floor(((lon%360)+360)%360/30)%12; }

function jxPanchanga(D){
  var s=D.P.Sun, m=D.P.Moon; if(!s||!m) return null;
  var i=D.input, pc=panchanga(s.sid,m.sid);
  var ni=nakOf(m.sid);
  var VARAS=["Ravivara","Somavara","Mangalavara","Budhavara","Guruvara","Shukravara","Shanivara"];
  var elapsed=(((m.sid-s.sid)%360+360)%360)/12;
  var sunAtNM=((s.sid-elapsed*0.9856*(29.53/30))%360+360)%360;
  var amanta=LMONTH[Math.floor(sunAtNM/30)%12];
  var trop=((s.sid+D.ayan)%360+360)%360;
  return {tithi:pc.tithi, paksha:pc.paksha, yoga:pc.yoga, karana:pc.karana,
    vara:VARAS[(D.weekday!=null?D.weekday:0)],
    nakshatra:ni.name, nakshatra_pada:ni.pada, nakshatra_lord:ni.lord,
    lunar_month_amanta:amanta,
    lunar_month_purnimanta:(pc.paksha_sa==="Krishna")?LMONTH[(Math.floor(sunAtNM/30)+1)%12]:amanta,
    ritu:RITU[amanta]||null,
    ayana:(trop>=90&&trop<270)?"Dakshinayana":"Uttarayana",
    vikram_samvat:i.year+57, saka_samvat:i.year-78,
    sun_sign_tropical:Math.floor(trop/30)%12};
}
function jxAvakhada(D){
  var m=D.P.Moon; if(!m) return null;
  var ni=nakOf(m.sid), v=VASHYA[m.sign];
  if(v&&v.indexOf("/")>=0) v=(m.deg<15)?v.split("/")[0]:v.split("/")[1];
  return {varna:VARNA[m.sign], vashya:v, yoni:NAKY[ni.idx], gana:NAKG[ni.idx],
          nadi:NAKN[ni.idx], tatva:TATWA[m.sign], rashi:m.sign, rashi_lord:LORD[m.sign],
          nakshatra:ni.name, pada:ni.pada, syllable:SYL[(ni.idx*4+(ni.pada-1))%SYL.length]};
}
function jxUpagrahas(D){
  var out={dhumadi:[],gulikadi:[]};
  if(D.P.Sun){
    var s=D.P.Sun.sid, dh=((s+133+20/60)%360+360)%360, vy=((360-dh)%360+360)%360,
        pa=((vy+180)%360+360)%360, ic=((360-pa)%360+360)%360, uk=((ic+16+40/60)%360+360)%360;
    [["Dhuma",dh],["Vyatipata",vy],["Parivesha",pa],["Indrachapa",ic],["Upaketu",uk]]
    .forEach(function(x){
      out.dhumadi.push({name:x[0], longitude:jxRound(x[1]), sign:jxSign(x[1]),
        house:((jxSign(x[1])-D.LS)%12+12)%12+1, nakshatra:nakOf(x[1]).name, pada:nakOf(x[1]).pada});
    });
  }
  if(D.sunriseH!=null&&D.sunsetH!=null){
    var i=D.input, bh=i.hour+i.minute/60, day=(bh>=D.sunriseH&&bh<D.sunsetH);
    var len=day?((D.sunsetH-D.sunriseH+24)%24):(24-((D.sunsetH-D.sunriseH+24)%24));
    var part=len/8, base=day?D.sunriseH:D.sunsetH;
    var L=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];
    var start=day?D.weekday:(D.weekday+4)%7;
    [["Gulika","Saturn"],["Mandi","Saturn"],["Kala","Sun"],["Mrityu","Mars"],
     ["Ardhaprahara","Mercury"],["Yamaghantaka","Jupiter"],["Kantaka","Venus"]].forEach(function(u){
      var k=0; for(var q=0;q<8;q++){ if(L[(start+q)%7]===u[1]){ k=q; break; } }
      out.gulikadi.push({name:u[0], ruler:u[1], part_of_eight:k+1,
        begins_local_hours:jxRound(((base+k*part)%24+24)%24,4)});
    });
    out.gulikadi_note="These are moments of the day, not longitudes. Times are local clock "+
      "time on the birth date, measured from "+(day?"sunrise (a day birth)":"sunset (a night birth)")+".";
  }
  return out;
}
function jxSripati(D){
  if(D.mcSid==null) return null;
  function arc(a,b){ return ((b-a)%360+360)%360; }
  var asc=D.lagna.sidereal_deg, mc=D.mcSid, mad=new Array(13);
  mad[1]=asc; mad[10]=mc; mad[7]=(asc+180)%360; mad[4]=(mc+180)%360;
  var q1=arc(mc,asc)/3; mad[11]=(mc+q1)%360; mad[12]=(mc+2*q1)%360;
  var q2=arc(asc,mad[4])/3; mad[2]=(asc+q2)%360; mad[3]=(asc+2*q2)%360;
  mad[5]=(mad[11]+180)%360; mad[6]=(mad[12]+180)%360;
  mad[8]=(mad[2]+180)%360; mad[9]=(mad[3]+180)%360;
  var sandhi=new Array(13);
  for(var h=1;h<=12;h++){ var nx=mad[h===12?1:h+1]; sandhi[h]=(mad[h]+arc(mad[h],nx)/2)%360; }
  function houseOf(lon){
    for(var h2=1;h2<=12;h2++){ var lo=sandhi[h2===1?12:h2-1];
      if(arc(lo,lon)<arc(lo,sandhi[h2])) return h2; }
    return 1;
  }
  var occ={}; D.planets.forEach(function(p){ occ[p.en]=houseOf(p.sid); });
  return {midheaven:jxRound(mc), bhava_madhya:mad.slice(1).map(function(x){return jxRound(x);}),
          bhava_sandhi:sandhi.slice(1).map(function(x){return jxRound(x);}), houses:occ,
          note:"Porphyry quadrant trisection. bhava_madhya is the midpoint of each house, "+
               "bhava_sandhi its ending boundary."};
}
function jxAvasthas(D){
  var WATERY=[3,7,11], BEN=["Jupiter","Venus","Mercury","Moon"], aspBy={};
  D.planets.forEach(function(q){ (ASPOFF[q.en]||[6]).forEach(function(o){
    var h=((q.house-1+o)%12)+1; (aspBy[h]=aspBy[h]||[]).push(q.en); }); });
  var in5=D.planets.filter(function(p){ return p.house===5 &&
    ["Sun","Saturn","Mars","Rahu","Ketu"].indexOf(p.en)>=0; }).map(function(p){return p.en;});
  return ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"].map(function(n){
    var p=D.P[n]; if(!p) return null;
    var a=aspBy[p.house]||[], ctx={house:{},dig:{},watery:{},maleficAspect:{},beneficAspect:{},
      beneficConj:{},withSun:{},withIn5:in5};
    ctx.house[n]=p.house; ctx.dig[n]=p.dig; ctx.watery[n]=WATERY.indexOf(p.sign)>=0;
    ctx.maleficAspect[n]=a.some(function(x){return BEN.indexOf(x)<0&&x!==n;});
    ctx.beneficAspect[n]=a.some(function(x){return BEN.indexOf(x)>=0&&x!==n;});
    ctx.beneficConj[n]=D.planets.some(function(q){return q.en!==n&&q.house===p.house&&BEN.indexOf(q.en)>=0;});
    ctx.withSun[n]=(n!=="Sun")&&D.P.Sun&&D.P.Sun.house===p.house;
    var d=deeptadi(n,p.dig,{combust:{},war:{}});
    if(p.combust) d=["Vikala","crippled — combust"];
    return {graha:n, baladi:p.avastha, baladi_strength_percent:p.avpct,
            jagradadi:jagradadi(p.dig)[0], deeptadi:d[0], lajjitadi:lajjitadi(n,ctx)};
  }).filter(Boolean);
}
function jxDrishti(D){
  var BEN=["Jupiter","Venus","Mercury","Moon"], out=[];
  D.planets.forEach(function(p){
    var offs=ASPOFF[p.en]||[6], hs=offs.map(function(o){ return ((p.house-1+o)%12)+1; });
    var tg=[]; D.planets.forEach(function(q){ if(q.en!==p.en&&hs.indexOf(q.house)>=0) tg.push(q.en); });
    out.push({graha:p.en, from_house:p.house, aspects_houses:hs.sort(function(a,b){return a-b;}),
      aspects_grahas:tg, nature:(BEN.indexOf(p.en)>=0?"benefic":"malefic")});
  });
  return out;
}
function jxRashiDrishti(D){
  function mode(s){ return s%3; }
  var out=[];
  for(var h=1;h<=12;h++){
    var sg=(D.LS+h-1)%12, m=mode(sg), t=[];
    for(var x=0;x<12;x++){
      if(x===sg) continue; var mx=mode(x);
      if(m===0&&mx===1&&x!==((sg+1)%12)) t.push(x);
      else if(m===1&&mx===0&&x!==((sg+11)%12)) t.push(x);
      else if(m===2&&mx===2) t.push(x);
    }
    out.push({house:h, sign:sg, modality:["movable","fixed","dual"][m], aspects_signs:t});
  }
  return out;
}
function jxArgala(D){
  var occ={}; D.planets.forEach(function(p){ (occ[p.house]=occ[p.house]||[]).push(p.en); });
  var PRI=[[2,12],[4,10],[11,3],[5,9]], out=[];
  for(var h=1;h<=12;h++){
    var list=[];
    PRI.forEach(function(pr){
      var ah=((h-1+pr[0]-1)%12)+1, oh=((h-1+pr[1]-1)%12)+1;
      var a=occ[ah]||[], o=occ[oh]||[];
      if(!a.length) return;
      list.push({from_house:pr[0], grahas:a, obstruction_house:pr[1], obstructing_grahas:o,
                 obstructed:o.length>=a.length});
    });
    out.push({house:h, argalas:list});
  }
  return out;
}
function jxFriendship(D){
  var P=ORD.filter(function(k){return D.P[k];}), nat={}, tmp={}, comp={};
  P.forEach(function(a){ nat[a]={}; tmp[a]={}; comp[a]={};
    P.forEach(function(b){ if(a===b) return;
      var n=natFriend(a,b);
      var d=((D.P[b].house-D.P[a].house)%12+12)%12+1;
      var t=([2,3,4,10,11,12].indexOf(d)>=0)?"friend":"enemy";
      var c;
      if(n==="friend"&&t==="friend") c="great friend";
      else if(n==="enemy"&&t==="enemy") c="great enemy";
      else if(n==="neutral") c=t;
      else if(n===t) c=n; else c="neutral";
      nat[a][b]=n; tmp[a][b]=t; comp[a][b]=c;
    });
  });
  return {naisargika:nat, tatkalika:tmp, panchadha:comp};
}

function jxVimsopaka(D){
  return ORD.slice(0,7).map(function(k){
    var got=0,max=0;
    D.vargas.forEach(function(v){
      var w=VW[v.code]; if(w==null||v.pos[k]==null) return;
      max+=w; var dg=v.dig[k];
      if(dg==="friend"||dg==="enemy"||dg==="neutral"){
        var lord=LORD[v.pos[k]], pk=D.P[k], pl=D.P[lord];
        if(pk&&pl&&lord!==k){
          var dist=((pl.house-pk.house)%12+12)%12+1;
          var temp=([2,3,4,10,11,12].indexOf(dist)>=0)?"friend":"enemy";
          if(dg==="friend"&&temp==="friend") dg="greatfriend";
          else if(dg==="enemy"&&temp==="enemy") dg="greatenemy";
          else if(dg==="neutral") dg=temp;
          else if(dg!==temp) dg="neutral";
        }
      }
      var f=VF[dg]; if(f!=null) got+=w*f;
    });
    var grade=got>15?"wholly favourable":got>10?"mediocre":got>5?"some good effects":"not capable of good";
    return {graha:k, score_of_20:jxRound(got,3), percent:jxRound(got/max*100,1), grade:grade};
  });
}
function jxBhavaBala(D,J){
  var sb=J&&J.shadbala&&J.shadbala.planets; if(!sb) return null;
  var byP={}; sb.forEach(function(p){ byP[p.graha]=p; });
  var HUMAN=[2,5,6,10], QUAD=[0,1,4,8,9], WATER=[3,7,11], BEN=["Jupiter","Venus","Mercury","Moon"];
  var aspBy={};
  D.planets.forEach(function(q){ (ASPOFF[q.en]||[6]).forEach(function(o){
    var h=((q.house-1+o)%12)+1; (aspBy[h]=aspBy[h]||[]).push(q.en); }); });
  var out=[];
  for(var h=1;h<=12;h++){
    var sg=(D.LS+h-1)%12, lord=LORD[sg], lp=byP[lord], adhip=lp?lp.total_virupa:0;
    var dig=(HUMAN.indexOf(sg)>=0&&[1,2,3,4].indexOf(h)>=0)?60:
            (QUAD.indexOf(sg)>=0&&h===10)?60:(WATER.indexOf(sg)>=0&&h===4)?60:30;
    var a=aspBy[h]||[], drik=0;
    a.forEach(function(x){ drik+=(BEN.indexOf(x)>=0?15:-15); });
    out.push({house:h, sign:sg, lord:lord, lord_shadbala_virupa:jxRound(adhip,2),
      dig_bala:dig, drik_bala:drik, total_virupa:jxRound(adhip+dig+drik,2),
      rupa:jxRound((adhip+dig+drik)/60,3)});
  }
  return out;
}
function jxIshtaKashta(J){
  var sb=J&&J.shadbala&&J.shadbala.planets; if(!sb) return null;
  return sb.map(function(p){
    var i=Math.sqrt(Math.max(0,p.uchcha)*Math.max(0,p.cheshta));
    var k=Math.sqrt(Math.max(0,60-p.uchcha)*Math.max(0,60-p.cheshta));
    return {graha:p.graha, uchcha_ray:jxRound(p.uchcha,3), cheshta_ray:jxRound(p.cheshta,3),
            ishta:jxRound(i,3), kashta:jxRound(k,3), net:jxRound(i-k,3)};
  });
}
function jxDivisionalAv(D){
  var AVTAB=(window.__AVT||{}); if(!AVTAB.Sun) return null;
  var order=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"], out={};
  ["D9","D10"].forEach(function(code){
    var v=null; D.vargas.forEach(function(x){ if(x.code===code) v=x; });
    if(!v||v.lagna==null) return;
    var sarva=new Array(12).fill(0), per=[];
    order.forEach(function(pl){
      var b=new Array(12).fill(0);
      Object.keys(AVTAB[pl]).forEach(function(c){
        var from=(c==="Lagna")?v.lagna:v.pos[c];
        if(from==null) return;
        AVTAB[pl][c].forEach(function(h){ b[(from+h-1)%12]++; });
      });
      per.push({graha:pl, bindus:b, total:b.reduce(function(a,x){return a+x;},0)});
      for(var i=0;i<12;i++) sarva[i]+=b[i];
    });
    out[code]={varga_lagna:v.lagna, bhinna:per, sarva:sarva,
               sarva_total:sarva.reduce(function(a,x){return a+x;},0)};
  });
  return out;
}
function jxDashaTree(D){
  var tree=buildTree(D); if(!tree) return null;
  function per(x){ return {lord:x.lord, start_jd:jxRound(x.start,5), end_jd:jxRound(x.end,5),
                           years:jxRound(x.years,5), partial:!!x.partial}; }
  return tree.map(function(md){
    var o=per({lord:md.lord,start:md.dispStart,end:md.end,years:md.years,partial:md.partial});
    o.antardashas=md.ads.map(function(ad){
      var a=per(ad);
      a.pratyantardashas=(ad.pds||[]).map(per);
      return a;
    });
    return o;
  });
}
function jxAshtottari(D){
  if(!D.P.Moon||!D.mds) return null;
  var seg=40/3, mn=((D.P.Moon.sid%360)+360)%360, ni=Math.floor(mn/seg), grp=null, pos=0;
  ASHT_GROUP.forEach(function(g){ var k=g[1].indexOf(ni); if(k>=0){ grp=g[0]; pos=k; } });
  if(!grp) return null;
  var size=ASHT_GROUP.filter(function(g){return g[0]===grp;})[0][1].length;
  var frac=(pos+(mn-ni*seg)/seg)/size, bal=ASHT_YEARS[grp]*(1-frac);
  var jd=D.mds[0].start, i0=ASHT_SEQ.indexOf(grp), out=[];
  for(var k=0;k<8;k++){
    var lord=ASHT_SEQ[(i0+k)%8], yrs=(k===0)?bal:ASHT_YEARS[lord], end=jd+yrs*365.2564;
    out.push({lord:lord, years:jxRound(yrs,5), start_jd:jxRound(jd,5), end_jd:jxRound(end,5),
              balance_at_birth:k===0});
    jd=end;
  }
  return out;
}
function jxYogini(D){
  if(!D.P.Moon||!D.mds) return null;
  var seg=40/3, mn=((D.P.Moon.sid%360)+360)%360, ni=Math.floor(mn/seg);
  var within=(mn-ni*seg)/seg, idx=((ni+1+3)%8+8)%8, start=(idx===0)?7:idx-1;
  var bal=YOGINI[start][2]*(1-within), jd=D.mds[0].start, out=[];
  /* The cycle totals 36 years, so unlike Vimśottarī it repeats within a lifetime.
     Showing one pass stops the table in the native's thirties and hides the very
     thing that distinguishes the system. Run it out to the same 120-year frame
     Vimśottarī uses — three and a third cycles — and number each pass. */
  var LIMIT=120, elapsed=0, k=0;
  while(elapsed<LIMIT && k<64){
    var y=YOGINI[(start+k)%8], yrs=(k===0)?bal:y[2], end=jd+yrs*365.2564;
    out.push({yogini:y[0], lord:y[1], cycle:Math.floor((start+k)/8)+1,
      position_in_cycle:((start+k)%8)+1,
      years:jxRound(yrs,5), start_jd:jxRound(jd,5), end_jd:jxRound(end,5),
      balance_at_birth:k===0,
      current:(D.nowJd>=jd&&D.nowJd<end),
      age_at_start:jxRound(elapsed,3)});
    jd=end; elapsed+=yrs; k++;
  }
  return out;
}
function jxYoginiMeta(){
  return {source:"BPHS Ch. 46, vv. 195\u2013199", cycle_years:36,
    note:"Eight yogin\u012bs of one to eight years, thirty-six years in all, so the "+
      "cycle repeats about three and a third times across the 120-year frame "+
      "Vim\u015battar\u012b uses. The opening yogin\u012b comes from the Moon's nak\u1e63atra "+
      "number plus three, divided by eight. Each period carries its cycle number, so a "+
      "returning yogin\u012b can be told from its first appearance."};
}
function jxSensitivity(J){
  var S=null; try{ S=sensCompute(J); }catch(e){}
  if(!S) return null;
  function pack(m){ return {lagna_changes_sign:!!m.lagna, lagna_moves_arcmin:jxRound(m.lagMin,2),
    padas_changing:m.padas.map(function(k){return EN[k]||k;}),
    houses_changing:m.houses.map(function(k){return EN[k]||k;}),
    varga_lagnas_changing:m.vargas}; }
  return {plus_minus_1_minute:pack(S.m1), plus_minus_4_minutes:pack(S.m4),
    note:"Computed by casting the chart again either side of the recorded time. "+
         "Anything listed here is not safe to rely on unless the birth time is exact."};
}
function jxConventions(J){
  var out={ayanamsa_in_use:J.ayanamsa_name, ayanamsa_mode:J.ayanamsa_mode,
           node_mode:J.node_mode||"mean", house_system:"whole sign",
           alternatives:{}};
  try{
    var modes=["lahiri","raman","kp","truechitra"];
    modes.forEach(function(m){
      var i={}; for(var k in J.input) i[k]=J.input[k]; i.ayanamsa=m;
      var Jv=window.buildLocalChart(i);
      out.alternatives[m]={name:Jv.ayanamsa_name, ayanamsa_deg:jxRound(Jv.ayanamsha_deg,5),
        lagna:jxRound(Jv.lagna.sidereal_deg,4),
        graha_signs:Jv.grahas.reduce(function(a,g){ a[EN[g.key]||g.key]=g.rashi.idx; return a; },{})};
    });
  }catch(e){}
  out.note="Ayanamsa, node and house system are choices, not facts. Everything else in this "+
    "file assumes the ones named above.";
  return out;
}

/* --- the sky at export time, kept separate from the nativity --- */
function jxAsOf(D,J){
  var cp=J.current_phase||{}, out={
    generated_iso:new Date().toISOString(),
    generated_jd:jxRound(D.nowJd,5),
    WARNING:"Everything under as_of describes the sky at the moment this file was written, "+
      "NOT the birth chart. Gochara, kaksha, Sade Sati, ingresses, eclipses and the day tools "+
      "all go stale. Re-derive them for the date you are actually judging.",
    transits:(cp.transits||[]).map(function(t){
      return {graha:t.en, longitude:jxRound(t.sidereal_deg), sign:ridx(t.rashi),
              nakshatra:(t.nakshatra&&t.nakshatra.en)||null, pada:t.nakshatra_pada,
              retrograde:!!t.retrograde};
    }),
    transit_aspects_to_natal:cp.transitRelations||[],
    panchanga_now:cp.panchang||null,
    sade_sati:cp.sadeSati||null
  };
  /* gochara from the natal Moon, with vedha */
  if(D.P.Moon&&out.transits.length){
    var mSign=D.P.Moon.sign, ts={};
    out.transits.forEach(function(t){ ts[t.graha]=t.sign; });
    out.gochara={from_natal_moon_sign:mSign, note:"Gochara is judged from the natal Moon. "+
      "A vedha in the named house cancels the transit; Sun and Saturn do not obstruct each "+
      "other, nor do Moon and Mercury.", grahas:[]};
    Object.keys(GOOD_FROM_MOON).forEach(function(p){
      if(ts[p]==null) return;
      var h=((ts[p]-mSign)%12+12)%12+1, fav=GOOD_FROM_MOON[p].indexOf(h)>=0;
      var vh=VEDHA[p][h], blocker=null;
      if(vh) Object.keys(ts).forEach(function(q){
        if(q===p||NO_VEDHA[p]===q) return;
        if(((ts[q]-mSign)%12+12)%12+1===vh) blocker=q; });
      out.gochara.grahas.push({graha:p, house_from_moon:h, favourable_houses:GOOD_FROM_MOON[p],
        favourable:fav, vedha_house:vh||null, obstructed_by:blocker});
    });
  }
  return out;
}
/* --- a short orientation for whatever reads this file --- */
function jxGuide(){
  return {
    purpose:"A complete Janma Kundali export: birth data, computed positions, and every "+
      "derived layer this page displays, so an analyst can work the chart without the page.",
    units:{longitudes:"degrees, sidereal, 0-360 measured from the start of Mesha",
      signs:"0-11, 0 = Mesha (Aries)", houses:"1-12, whole sign from the lagna unless stated",
      times:"Julian Day, UTC, unless a field says local", strength:"Virupas; 60 Virupas = 1 rupa",
      arcmin:"arcminutes"},
    reading_order:["input and lagna","grahas with dignity and avastha","bhavas","vargas",
      "shadbala and the strength layers","dasha","derived.sensitivity before trusting fine detail"],
    cautions:[
      "Whole-sign houses are the default; derived.sripati gives the cusp alternative and they disagree.",
      "derived.sensitivity says which figures a one-minute birth-time error would change. "+
        "Divisional lagnas and anything built on them are the first to move.",
      "Nathonnatha within shadbala is measured from clock noon rather than local apparent noon.",
      "Vimsopaka weights and Varga Visva values follow BPHS Ch. 7 vv. 21-25.",
      "Drik Bala uses the exact Sphuta Drishti formula of BPHS Ch. 26.",
      "Arudha exception cases take the 4th from the house when the pada falls in the 7th; "+
        "some software takes the 10th instead.",
      "Trimsamsa has unequal parts, so no meaningful degree within the varga sign is defined.",
      "The as_of block is not part of the nativity and goes stale.",
      "This is an educational reckoning of traditional doctrine. It is not a prediction, a "+
        "diagnosis, or advice, and nothing here should drive a medical, legal, financial or "+
        "safety decision."
    ]
  };
}
function buildFullExport(D,J){
  var x={};
  try{ x.panchanga_at_birth=jxPanchanga(D); }catch(e){}
  try{ x.avakhada=jxAvakhada(D); }catch(e){}
  try{ x.upagrahas=jxUpagrahas(D); }catch(e){}
  try{ x.sripati=jxSripati(D); }catch(e){}
  try{ x.avasthas_full=jxAvasthas(D); }catch(e){}
  try{ x.graha_drishti=jxDrishti(D); }catch(e){}
  try{ x.rashi_drishti=jxRashiDrishti(D); }catch(e){}
  try{ x.argala=jxArgala(D); }catch(e){}
  try{ x.friendship=jxFriendship(D); }catch(e){}
  try{ x.vimsopaka=jxVimsopaka(D); }catch(e){}
  try{ x.bhava_bala=jxBhavaBala(D,J); }catch(e){}
  try{ x.ishta_kashta=jxIshtaKashta(J); }catch(e){}
  try{ x.divisional_ashtakavarga=jxDivisionalAv(D); }catch(e){}
  try{ x.karakamsha=(D.ckar&&D.ckar.length&&D.d9)?
        {atmakaraka:EN[D.ckar[0].graha]||D.ckar[0].graha,
         navamsa_sign:D.d9[EN[D.ckar[0].graha]||D.ckar[0].graha]}:null; }catch(e){}
  try{ x.vimshottari_tree=jxDashaTree(D); }catch(e){}
  try{ x.ashtottari=jxAshtottari(D); }catch(e){}
  try{ x.yogini=jxYogini(D); x.yogini_meta=jxYoginiMeta(); }catch(e){}
  try{ x.sensitivity=jxSensitivity(J); }catch(e){}
  try{ x.conventions=jxConventions(J); }catch(e){}
  try{ x.varga_analysis=buildVargaAnalysis(D); }catch(e){}
  try{ x.readings=buildReadings(D,J); }catch(e){}
  return x;
}
