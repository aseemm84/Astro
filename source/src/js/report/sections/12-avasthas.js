/* --- avastha schemes beyond Baladi --- */
function jagradadi(dig){
  if(dig==="exalted"||dig==="moolatrikona"||dig==="own") return ["Jāgrat","awake — acts at full force"];
  if(dig==="friend"||dig==="neutral") return ["Svapna","dreaming — acts partially"];
  return ["Suṣupti","sleeping — barely acts"];
}
function deeptadi(p,dig,ctx){
  if(ctx.war&&ctx.war[p]) return ["Pīḍita","struck — defeated in planetary war"];
  if(ctx.combust&&ctx.combust[p]) return ["Vikala","crippled — combust"];
  if(dig==="exalted") return ["Dīpta","radiant — exalted"];
  if(dig==="moolatrikona"||dig==="own") return ["Svastha","at ease — in its own ground"];
  if(dig==="friend") return ["Muditā","glad — in a friend's sign"];
  if(dig==="neutral") return ["Śānta","quiet — neutral ground"];
  if(dig==="enemy") return ["Dīna","wretched — in an enemy's sign"];
  if(dig==="debilitated") return ["Khala","harsh — debilitated"];
  return ["Śakta","capable"];
}
function lajjitadi(p,ctx){
  var out=[];
  if(ctx.house[p]===5 && ctx.withIn5.length) out.push("Lajjitā (in the 5th with "+ctx.withIn5.join(", ")+")");
  if(ctx.dig[p]==="exalted"||ctx.dig[p]==="moolatrikona") out.push("Garvitā (exalted or Moolatrikona)");
  if(ctx.dig[p]==="enemy") out.push("Kṣudhitā (in an enemy's sign)");
  if(ctx.watery[p] && ctx.maleficAspect[p] && !ctx.beneficAspect[p]) out.push("Tṛṣitā (watery sign, malefic glance, no benefic)");
  if(ctx.dig[p]==="friend" || ctx.beneficConj[p]) out.push("Muditā (friend's sign or with a benefic)");
  if(ctx.withSun[p] || ctx.maleficAspect[p]) out.push("Kṣobhitā (with the Sun or under a malefic glance)");
  return out;
}


function shodhanaSection(D){
  if(!D.av||!D.av.bhinna) return "";
  var signOf={}; D.planets.forEach(function(p){ signOf[p.en]=p.sign; });
  var rows=shodhanaAll(D.av,signOf);
  var hdr='<th>Graha</th>';
  for(var h=1;h<=12;h++) hdr+='<th>'+SA[(D.LS+h-1)%12].slice(0,4)+'<br><span class="kthin">H'+h+'</span></th>';
  hdr+='<th>Total</th><th>Piṇḍa</th>';
  var body=rows.map(function(r){
    var c='';
    for(var h=1;h<=12;h++){ var sg=(D.LS+h-1)%12, o=r.original[sg], v=r.ekadhipatya[sg];
      var red=(v<o);
      c+='<td class="kb"'+(red?' style="background:rgba(161,73,58,.10)"':'')+'>'+v+
         (red?'<span class="kmut" style="font-size:9px"> ('+o+')</span>':'')+'</td>'; }
    return '<tr><td><b>'+esc(r.graha)+'</b></td>'+c+
      '<td class="knum">'+r.total_rect+' <span class="kmut">/'+r.total_orig+'</span></td>'+
      '<td class="knum">'+r.pinda.total.toFixed(0)+'</td></tr>';
  });
  return '<h4 class="ksub">After the three reductions</h4>'+
    '<p class="knote">BPHS purifies the figures before they are used for fine timing: <b>Trikoṇa Śodhana</b> '+
    'subtracts the least value within each trine of signs (skipped where one of the three is zero), '+
    '<b>Ekādhipatya Śodhana</b> reconciles the two signs owned by one planet according to whether each is '+
    'occupied, and <b>Piṇḍa Sādhana</b> multiplies the rectified figures by the sign and planet measures. '+
    'Reduced cells show the original in brackets.</p>'+
    '<div class="ktwrap"><table class="ktbl khm"><thead><tr>'+hdr+'</tr></thead><tbody>'+body.join("")+
    '</tbody></table></div>'+
    '<div class="kbox">The Ekādhipatya rules and the Rāśi/Graha multipliers used for Piṇḍa are the commonly '+
    'cited set; editions differ on the details, so treat the Piṇḍa column as indicative. Cancer and Leo are '+
    'excluded from Ekādhipatya, having a single lord each.</div>';
}
function avasthaSection(D){
  var P=D.P, ORD2=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];
  var WATERY=[3,7,11], BEN=["Jupiter","Venus","Mercury","Moon"];
  var ASP={Sun:[6],Moon:[6],Mercury:[6],Venus:[6],Mars:[3,6,7],Jupiter:[4,6,8],Saturn:[2,6,9],Rahu:[6],Ketu:[6]};
  var aspBy={};
  D.planets.forEach(function(q){ (ASP[q.en]||[6]).forEach(function(o){
    var h=((q.house-1+o)%12)+1; (aspBy[h]=aspBy[h]||[]).push(q.en); }); });
  var in5=D.planets.filter(function(p){return p.house===5 &&
      ["Sun","Saturn","Mars","Rahu","Ketu"].indexOf(p.en)>=0;}).map(function(p){return p.en;});
  var rows=ORD2.map(function(n){
    var p=P[n]; if(!p) return "";
    var a=aspBy[p.house]||[];
    var ctx={house:{},dig:{},watery:{},maleficAspect:{},beneficAspect:{},beneficConj:{},withSun:{},withIn5:in5};
    ctx.house[n]=p.house; ctx.dig[n]=p.dig;
    ctx.watery[n]=WATERY.indexOf(p.sign)>=0;
    ctx.maleficAspect[n]=a.some(function(x){return BEN.indexOf(x)<0 && x!==n;});
    ctx.beneficAspect[n]=a.some(function(x){return BEN.indexOf(x)>=0 && x!==n;});
    ctx.beneficConj[n]=D.planets.some(function(q){return q.en!==n&&q.house===p.house&&BEN.indexOf(q.en)>=0;});
    ctx.withSun[n]=(n!=="Sun")&&P.Sun&&P.Sun.house===p.house;
    var j=jagradadi(p.dig), d=deeptadi(n,p.dig,{combust:{},war:{}});
    if(p.combust) d=["Vikala","crippled — combust"];
    var l=lajjitadi(n,ctx);
    return '<tr><td><b>'+esc(n)+'</b></td>'+
      '<td>'+esc(p.avastha||"—")+'</td>'+
      '<td><b>'+esc(j[0])+'</b> <span class="kmut">'+esc(j[1])+'</span></td>'+
      '<td><b>'+esc(d[0])+'</b> <span class="kmut">'+esc(d[1])+'</span></td>'+
      '<td>'+(l.length?l.map(esc).join("; "):'<span class="kmut">none</span>')+'</td></tr>';
  });
  return '<p class="knote">BPHS gives several parallel schemes of avasthā (state). They are read as modifiers '+
    'layered on dignity: a planet may be well placed yet only half awake.</p>'+
    tbl(["Graha","Bāladi (age)","Jāgradādi (alertness)","Dīptādi (condition)","Lajjitādi (situational)"],rows)+
    '<div class="kbox">Bāladi comes from the planet\'s degree within its sign; Jāgradādi and Dīptādi from its '+
    'dignity and state; Lajjitādi from placement, company and aspect, so a planet can hold more than one at once '+
    '(or none). The twelve <b>Śayanādi</b> states are omitted: they are computed from a formula involving the '+
    'person\'s name-syllable, which this page does not ask for.</div>';
}

/* ===== Tier A, batch 1: chalit, special ascendants, upagrahas, karakamsa,
        rashi drishti, argala, graha yuddha ===== */
function chalitSection(D){
  var lag=D.lagna.sidereal_deg, start=((lag-15)%360+360)%360;
  var rows=D.planets.map(function(p){
    var off=((p.sid-start)%360+360)%360, ch=Math.floor(off/30)+1;
    var same=(ch===p.house);
    return '<tr><td><b>'+esc(p.iast)+'</b> <span class="kmut">'+esc(p.en)+'</span></td>'+
      '<td>'+SA[p.sign]+' '+dm(p.deg)+'</td><td class="knum">'+p.house+'</td>'+
      '<td class="knum"><b>'+ch+'</b></td>'+
      '<td>'+(same?'<span class="kmut">same</span>':
        '<span style="color:#a1493a;font-weight:600">moves '+(ch>p.house?'forward':'back')+'</span>')+'</td></tr>';
  });
  var moved=D.planets.filter(function(p){
    var off=((p.sid-((lag-15)%360+360)%360)%360+360)%360; return Math.floor(off/30)+1!==p.house;});
  var occ={};
  D.planets.forEach(function(p){ var off=((p.sid-start)%360+360)%360, ch=Math.floor(off/30)+1;
    (occ[ch]=occ[ch]||[]).push(GL[p.en]+(p.retro?"℞":"")); });
  var chart=northChart(function(h){return (D.LS+h-1)%12;},
    function(h){var a=(occ[h]||[]).slice(); if(h===1)a.unshift("Lg"); return a;},
    "Bhāva Chalit","equal cusps centred on the lagna");
  return '<p class="knote">The whole-sign chart puts a planet in the house matching its sign. The '+
    '<b>chalit</b> (cusp) chart counts houses from the lagna <i>degree</i>, so a planet near a sign boundary '+
    'can land in a different house. Where the two disagree, BPHS practice is to read the significations from '+
    'the chalit position while keeping sign-based lordship and dignity from the rāśi chart.</p>'+
    '<div class="kcharts">'+chart+'<div class="ksudnote">'+
    tbl(["Graha","Rāśi &amp; degree","Whole-sign house","Chalit house","Shift"],rows)+'</div></div>'+
    '<p class="klegend">'+(moved.length?moved.length+' planet'+(moved.length>1?'s':'')+' shift house: '+
      moved.map(function(p){return p.en;}).join(", ")+'.':'No planet changes house — the two charts agree.')+
    ' Cusps here are equal houses centred on the lagna; other conventions (Sripati, Placidus) place the '+
    'boundaries slightly differently.</p>';
}
function specialLagnaSection(D,J){
  var i=D.input, sr=D.sunriseH, birthH=i.hour+i.minute/60;
  if(sr==null) return "";
  var elapsed=((birthH-sr)+24)%24;                       // hours since sunrise
  var sunSid=(D.sunAtSunrise!=null?D.sunAtSunrise:(D.P.Sun?D.P.Sun.sid:0));
  function lagAt(hoursPerSign){
    var signs=elapsed/hoursPerSign;
    return ((sunSid+signs*30)%360+360)%360;
  }
  var defs=[
    ["Bhāva Lagna","one sign per 5 ghaṭīs (2 hours) from sunrise","a second reference for the body and yogas",lagAt(2)],
    ["Horā Lagna","one sign per 2½ ghaṭīs (1 hour)","wealth and financial standing",lagAt(1)],
    ["Ghaṭika Lagna","one sign per 1 ghaṭī (24 minutes)","power, status and authority",lagAt(0.4)]
  ];
  // Pranapada: from the Sun, 1 sign per 6 minutes of elapsed time (15 vighatis)
  var pp=((sunSid + (elapsed*60/6)*30)%360+360)%360;
  var base=Math.floor(sunSid/30)%12;
  if(base%3===1) pp=((pp+240)%360); else if(base%3===2) pp=((pp+120)%360);   // fixed +9th, dual +5th
  defs.push(["Prāṇapada Lagna","one sign per 6 minutes from sunrise, adjusted by the Sun's modality",
             "vitality; used in birth-time rectification",pp]);
  // Sree lagna: lagna + the fraction of the Moon's nakshatra traversed, in signs
  if(D.P.Moon){
    var seg=40/3, mn=((D.P.Moon.sid%360)+360)%360, frac=(mn-Math.floor(mn/seg)*seg)/seg;
    defs.push(["Śrī Lagna","lagna advanced by the part of the Moon's nakṣatra already travelled",
               "prosperity and the goddess of fortune",((D.lagna.sidereal_deg+frac*360)%360+360)%360]);
  }
  var rows=defs.map(function(d){
    var sg=Math.floor(d[3]/30)%12, h=((sg-D.LS)%12+12)%12+1;
    return '<tr><td><b>'+esc(d[0])+'</b></td><td>'+SA[sg]+' '+dm(d[3]%30)+'</td>'+
      '<td class="knum">'+h+'</td><td class="kmut">'+esc(d[1])+'</td><td class="kmut">'+esc(d[2])+'</td></tr>';
  });
  return '<p class="knote">Besides the rāśi lagna, BPHS uses several computed ascendants, each advancing from '+
    'sunrise at its own rate. They are refinements layered on the rāśi lagna, never replacements, and all are '+
    'as reliable as the recorded birth time.</p>'+
    tbl(["Special lagna","Position","House from lagna","Rate","Read for"],rows)+
    '<div class="kbox">Editions differ on the exact Prāṇapada and Śrī Lagna reckonings; the common forms are '+
    'used here and the rate is printed beside each so you can check the arithmetic.</div>';
}
function upagrahaSection(D){
  var sr=D.sunriseH, ss=D.sunsetH, i=D.input;
  if(sr==null||ss==null) return "";
  var birthH=i.hour+i.minute/60, isDay=(birthH>=sr&&birthH<ss);
  var dayLen=((ss-sr)+24)%24, nightLen=24-dayLen;
  var wd=D.weekday!=null?D.weekday:0;
  var LORDS=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];
  // eighth-parts; the eighth belongs to no lord
  var part=(isDay?dayLen:nightLen)/8, base=isDay?sr:ss;
  // the first part of the day belongs to the weekday lord, then in weekday order
  var UP=[["Gulika","Saturn"],["Māndi","Saturn"],["Kāla","Sun"],["Mṛtyu","Mars"],
          ["Ardhaprahara","Mercury"],["Yamaghaṇṭaka","Jupiter"],["Kaṇṭaka/Ardhayāma","Venus"]];
  function partIndexFor(lord){
    var start=isDay?wd:(wd+4)%7;                 // night sequence starts from the 5th lord
    for(var k=0;k<8;k++){ if(LORDS[(start+k)%7]===lord) return k; }
    return 0;
  }
  var rows=UP.map(function(u){
    var k=partIndexFor(u[1]);
    var t=((base+k*part)%24+24)%24;
    // the ascendant rising at that moment, approximated from the elapsed fraction of the day
    var elapsed=((t-sr)+24)%24;
    var sg=null;
    return '<tr><td><b>'+esc(u[0])+'</b></td><td>'+esc(u[1])+'</td>'+
      '<td class="knum">'+String(Math.floor(t)).padStart(2,"0")+":"+String(Math.round((t%1)*60)).padStart(2,"0")+
      '</td><td class="kmut">part '+(k+1)+' of 8</td></tr>';
  });
  return '<p class="knote">The <b>upagrahas</b> are shadowy sensitive points, not bodies. The day (sunrise to '+
    'sunset) and the night are each divided into eight parts; each part is ruled by a planet in weekday order, '+
    'and the moment a given planet\'s part begins fixes its upagraha. <b>Gulika</b> (Saturn\'s part) is the one '+
    'most used in practice.</p>'+
    tbl(["Upagraha","Ruling planet","Begins at","Portion"],rows)+
    '<div class="kbox">Times are local clock time on the birth date, from the computed sunrise '+
    '('+String(Math.floor(sr)).padStart(2,"0")+":"+String(Math.round((sr%1)*60)).padStart(2,"0")+
    ') and sunset ('+String(Math.floor(ss)).padStart(2,"0")+":"+String(Math.round((ss%1)*60)).padStart(2,"0")+
    '). Birth was by '+(isDay?"day":"night")+', so the '+(isDay?"day":"night")+' division applies. '+
    'Converting each moment into a zodiacal longitude requires the ascendant at that instant; this table gives '+
    'the timings, which is the part all editions agree on.</div>';
}
function karakamsaSection(D){
  if(!D.ckar||!D.ckar.length||!D.d9) return "";
  var ak=D.ckar[0], akEn=EN[ak.graha]||ak.graha;
  var ks=D.d9[akEn]; if(ks==null) return "";
  var occ={}; Object.keys(D.d9).forEach(function(k){ (occ[D.d9[k]]=occ[D.d9[k]]||[]).push(GL[k]); });
  var chart=northChart(function(h){return (ks+h-1)%12;},
    function(h){var sg=(ks+h-1)%12,a=(occ[sg]||[]).slice(); if(h===1)a.unshift("AK"); return a;},
    "Kārakāṃśa","the Ātmakāraka's navāṃśa as lagna");
  var rows=[];
  for(var h=1;h<=12;h++){
    var sg=(ks+h-1)%12, who=Object.keys(D.d9).filter(function(k){return D.d9[k]===sg;});
    if(!who.length) continue;
    rows.push('<tr><td class="knum">'+h+'</td><td>'+SA[sg]+'</td><td>'+who.join(", ")+'</td></tr>');
  }
  return '<p class="knote">The <b>Kārakāṃśa</b> is the navāṃśa sign occupied by the Ātmakāraka — here '+
    esc(akEn)+' in '+SA[ks]+' — projected back as a lagna. Read from it, planets and signs describe the '+
    'soul\'s agenda: innate talents, vocation and the karmic themes of the life.</p>'+
    '<div class="kcharts">'+chart+'<div class="ksudnote">'+
    (rows.length?tbl(["House","Rāśi","Occupants (D9)"],rows):'')+'</div></div>'+
    '<p class="klegend">Ātmakāraka: '+esc(akEn)+' at '+ak.deg_in_sign.toFixed(2)+'° — the highest degree in the '+
    'chart. Benefics in or aspecting the Kārakāṃśa are read for learning and grace, malefics for sharp or '+
    'technical gifts.</p>';
}
function rashiDrishtiSection(D){
  var MODE=["Movable","Fixed","Dual"];
  function modeOf(s){ return s%3; }
  function aspectsOf(s){
    var m=modeOf(s), out=[];
    for(var t=0;t<12;t++){
      if(t===s) continue;
      var mt=modeOf(t);
      if(m===0&&mt===1 && t!==((s+1)%12)) out.push(t);
      else if(m===1&&mt===0 && t!==((s+11)%12)) out.push(t);
      else if(m===2&&mt===2) out.push(t);
    }
    return out;
  }
  var rows=[];
  for(var h=1;h<=12;h++){
    var sg=(D.LS+h-1)%12, tgt=aspectsOf(sg);
    var occ=D.planets.filter(function(p){return p.sign===sg;}).map(function(p){return GL[p.en];});
    rows.push('<tr><td><b>'+h+'</b> '+SA[sg]+' <span class="kmut">'+MODE[modeOf(sg)]+'</span></td>'+
      '<td>'+(occ.join(" ")||"—")+'</td>'+
      '<td>'+tgt.map(function(t){return SA[t]+" ("+(((t-D.LS)%12+12)%12+1)+")";}).join(", ")+'</td></tr>');
  }
  return '<p class="knote">Signs aspect signs by <b>modality</b>, independent of the planets in them, and a '+
    'planet inherits the aspect of the sign it occupies. Movable signs aspect the three fixed signs except the '+
    'adjacent one; fixed aspect the three movable except the adjacent one; dual signs aspect the other three '+
    'dual signs. This is the Jaimini layer — keep it separate from graha dṛṣṭi.</p>'+
    tbl(["Rāśi (house · modality)","Occupants","Aspects these signs (house)"],rows);
}
function argalaSection(D){
  var occBy={};
  D.planets.forEach(function(p){ (occBy[p.house]=occBy[p.house]||[]).push(p.en); });
  var PRI=[[2,12],[4,10],[11,3],[5,9]];
  var rows=[];
  for(var h=1;h<=12;h++){
    var parts=[];
    PRI.forEach(function(pair){
      var ah=((h-1+pair[0]-1)%12)+1, oh=((h-1+pair[1]-1)%12)+1;
      var a=occBy[ah]||[], o=occBy[oh]||[];
      if(!a.length) return;
      var blocked=o.length>=a.length;
      parts.push('<span style="color:'+(blocked?"#a1493a":"#1c6b46")+'">'+pair[0]+'th: '+a.join(",")+
        (blocked?' <span class="kmut">(obstructed by '+o.join(",")+' in the '+pair[1]+'th)</span>':' <b>active</b>')+'</span>');
    });
    rows.push('<tr><td><b>'+h+'</b> '+SA[(D.LS+h-1)%12]+'</td><td>'+(parts.join("<br>")||'<span class="kmut">no argala</span>')+'</td></tr>');
  }
  return '<p class="knote"><b>Argala</b> is intervention: planets in the 2nd, 4th, 11th and 5th from a house '+
    'influence its matters, and planets in the 12th, 10th, 3rd and 9th respectively obstruct that intervention '+
    '(<b>virodhārgala</b>). An argala counts as obstructed when the blocking house holds at least as many '+
    'planets as the intervening one.</p>'+
    tbl(["House","Argala on it"],rows)+
    '<div class="kbox">Benefic argala helps the matters of the house, malefic argala stresses them. Counting '+
    'by number of planets is the common working rule; some lineages weigh strength instead.</div>';
}
function yuddhaSection(D){
  var out=[], names=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn"];
  for(var a=0;a<names.length;a++) for(var b2=a+1;b2<names.length;b2++){
    var P1=D.P[names[a]], P2=D.P[names[b2]];
    if(!P1||!P2) continue;
    if(names[a]==="Sun"||names[b2]==="Sun"||names[a]==="Moon"||names[b2]==="Moon") continue;
    var sep=Math.abs(((P1.sid-P2.sid+180)%360+360)%360-180);
    if(sep>1) continue;
    var win=(P1.sid<P2.sid)?P1:P2, lose=(win===P1)?P2:P1;
    out.push('<tr><td>'+esc(P1.en)+' &amp; '+esc(P2.en)+'</td><td class="knum">'+sep.toFixed(3)+'°</td>'+
      '<td style="color:#1c6b46;font-weight:600">'+esc(win.en)+'</td>'+
      '<td style="color:#a1493a">'+esc(lose.en)+'</td></tr>');
  }
  return '<p class="knote"><b>Graha yuddha</b> — planetary war — occurs when two non-luminous planets come '+
    'within about a degree of each other. The one with the lower longitude is taken as the victor; the loser '+
    'is weakened, and this feeds Cheṣṭā Bala.</p>'+
    (out.length?tbl(["Pair","Separation","Victor","Defeated"],out)
      :'<p class="kmut">No planetary war in this chart — no two non-luminous planets are within a degree.</p>');
}

var AY=function(jd){ return (window.__ayan? window.__ayan(jd)
  : (function(T){return 23.8570923503+1.39688795809*T+0.000307097768994*T*T;})((jd-2451545.0)/36525.0)); };
/* ===== Tier A, batch 2: gochara, kaksha, sade sati timeline, ingress/retro,
        eclipses, day tools, ashtottari, bhava bala, ishta/kashta ===== */
var GOOD_FROM_MOON={Sun:[3,6,10,11],Moon:[1,3,6,7,10,11],Mars:[3,6,11],Mercury:[2,4,6,8,10,11],
  Jupiter:[2,5,7,9,11],Venus:[1,2,3,4,5,8,9,11,12],Saturn:[3,6,11],Rahu:[3,6,10,11],Ketu:[3,6,11]};
var VEDHA={Sun:{3:9,6:12,10:4,11:5},Moon:{1:5,3:9,6:12,7:2,10:4,11:8},Mars:{3:12,6:9,11:5},
  Mercury:{2:5,4:3,6:9,8:1,10:7,11:12},Jupiter:{2:12,5:4,7:3,9:10,11:8},
  Venus:{1:8,2:7,3:1,4:10,5:9,8:5,9:11,11:6,12:3},Saturn:{3:12,6:9,11:5},Rahu:{},Ketu:{}};
var NO_VEDHA={Sun:"Saturn",Saturn:"Sun",Moon:"Mercury",Mercury:"Moon"};
function gocharaSection(D){
  if(!D.P.Moon||!D.transits||!D.transits.length) return "";
  var mSign=D.P.Moon.sign, tsign={};
  D.transits.forEach(function(t){ var en=t.en==="Rāhu"?"Rahu":t.en; tsign[en]=ridx(t.rashi); });
  var rows=Object.keys(GOOD_FROM_MOON).map(function(p){
    if(tsign[p]==null) return "";
    var h=((tsign[p]-mSign)%12+12)%12+1;
    var fav=GOOD_FROM_MOON[p].indexOf(h)>=0;
    var vh=VEDHA[p][h], blocked=null;
    if(vh){ Object.keys(tsign).forEach(function(q){
      if(q===p||NO_VEDHA[p]===q) return;
      if(((tsign[q]-mSign)%12+12)%12+1===vh) blocked=q; }); }
    var verdict=fav?(blocked?"favourable, but obstructed":"favourable"):(blocked?"unfavourable, but obstructed":"unfavourable");
    var col=fav?(blocked?"#b08a2e":"#1c6b46"):(blocked?"#b08a2e":"#a1493a");
    return '<tr><td><b>'+esc(p)+'</b></td><td>'+SA[tsign[p]]+'</td><td class="knum">'+h+'</td>'+
      '<td class="kmut">'+GOOD_FROM_MOON[p].join(", ")+'</td>'+
      '<td style="color:'+col+';font-weight:600">'+verdict+'</td>'+
      '<td class="kmut">'+(vh?("vedha from the "+vh+"th"+(blocked?" — "+blocked+" is there":"")):"—")+'</td></tr>';
  });
  return '<p class="knote"><b>Gochara</b> reads transits from the <i>natal Moon</i>, not the lagna. Each planet '+
    'has houses in which its transit is classically favourable. A <b>vedha</b> (obstruction) occurs when another '+
    'planet occupies the house that blocks that transit, which cancels the effect — the Sun and Saturn do not '+
    'obstruct each other, nor do the Moon and Mercury.</p>'+
    tbl(["Graha","Transiting","House from Moon","Favourable houses","Reading","Vedha"],rows.filter(Boolean))+
    '<p class="klegend">Natal Moon in '+SA[mSign]+'. Positions are for the moment this chart was generated.</p>';
}
var KAKSHA_LORDS=["Saturn","Jupiter","Mars","Sun","Venus","Mercury","Moon","Lagna"];
function kakshaSection(D){
  if(!D.av||!D.av.bhinna||!D.transits||!D.transits.length) return "";
  var signOf={}; D.planets.forEach(function(p){ signOf[p.en]=p.sign; });
  var rows=[];
  D.transits.forEach(function(t){
    var en=t.en==="Rāhu"?"Rahu":t.en;
    if(["Rahu","Ketu"].indexOf(en)>=0) return;
    var bav=D.av.bhinna.filter(function(b){return b.graha===en;})[0]; if(!bav) return;
    var sg=ridx(t.rashi), deg=(t.rashi&&t.rashi.degInSign!=null)?t.rashi.degInSign:(t.sidereal_deg%30);
    var k=Math.min(7,Math.floor(deg/3.75)), lord=KAKSHA_LORDS[k];
    var from=(lord==="Lagna")?D.LS:signOf[lord];
    var has=false;
    var AVTAB=(window.__AVT||{});
    if(from!=null && AVTAB[en] && AVTAB[en][lord]){
      var rel=((sg-from)%12+12)%12+1;
      has=AVTAB[en][lord].indexOf(rel)>=0;
    }
    rows.push('<tr><td><b>'+esc(en)+'</b></td><td>'+SA[sg]+' '+dm(deg)+'</td>'+
      '<td class="knum">'+(k+1)+' of 8</td><td>'+esc(lord)+'</td>'+
      '<td class="knum">'+bav.bindus[sg]+'/8</td>'+
      '<td style="color:'+(has?"#1c6b46":"#a1493a")+';font-weight:600">'+(has?"rekhā — supported":"bindu — unsupported")+'</td></tr>');
  });
  return '<p class="knote">Each sign divides into eight <b>kakṣās</b> of 3°45&prime;, ruled in the fixed order '+
    'Saturn, Jupiter, Mars, Sun, Venus, Mercury, Moon, Lagna. A transiting planet gives results according to '+
    'whether the kakṣā it is crossing holds that planet\'s benefic point. This is the finest level of transit '+
    'reading in Ashtakavarga.</p>'+
    tbl(["Graha","Transiting","Kakṣā","Kakṣā lord","Sign bindus","This kakṣā"],rows);
}
function sadeSatiSection(D){
  if(!D.P.Moon) return "";
  var mSign=D.P.Moon.sign, out=[], nowJd=D.nowJd;
  // scan Saturn's sign from 30 years before to 40 years after the present
  function satSignAt(jd){
    var ms=Date.now()+(jd-nowJd)*86400000, d=new Date(ms);
    try{ var ay=AY(jd);
      return Math.floor(((Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body.Saturn,d,true)).elon-ay)%360+360)%360/30)%12;
    }catch(e){ return null; }
  }
  var step=20, startJd=nowJd-30*365.25, endJd=nowJd+40*365.25;
  var prev=null, runStart=null, runRel=null;
  for(var jd=startJd; jd<=endJd; jd+=step){
    var s=satSignAt(jd); if(s==null) break;
    var rel=((s-mSign)%12+12)%12;
    var active=(rel===11||rel===0||rel===1||rel===3||rel===7);
    if(active && runRel!==rel){ if(runStart!=null) out.push([runRel,runStart,jd]); runStart=jd; runRel=rel; }
    else if(!active && runStart!=null){ out.push([runRel,runStart,jd]); runStart=null; runRel=null; }
  }
  if(runStart!=null) out.push([runRel,runStart,endJd]);
  // Saturn retrogrades across sign boundaries, splitting one phase into slivers — merge
  // consecutive segments of the same phase separated by less than a year
  var merged=[];
  out.forEach(function(seg){
    var last=merged[merged.length-1];
    if(last && last[0]===seg[0] && (seg[1]-last[2])<400) last[2]=seg[2];
    else merged.push([seg[0],seg[1],seg[2]]);
  });
  // a phase begins at Saturn's first ingress: fold a retrograde return to an earlier phase into that phase
  var fold=[];
  merged.forEach(function(x){ var l=null; for(var i=fold.length-1;i>=0;i--){ if(fold[i][0]===x[0]){ l=fold[i]; break; } }
    if(l&&(x[1]-l[2])<500) l[2]=Math.max(l[2],x[2]); else fold.push([x[0],x[1],x[2]]); });
  fold.sort(function(a,b){ return a[1]-b[1]; });
  for(var fi=0;fi<fold.length-1;fi++) if(fold[fi][2]>fold[fi+1][1]) fold[fi][2]=fold[fi+1][1];
  out=fold.filter(function(s){ return (s[2]-s[1])>120; });   // drop fragments under ~4 months
  var NAME={11:"Sade Sati — rising (12th)",0:"Sade Sati — peak (over the Moon)",1:"Sade Sati — setting (2nd)",
            3:"Dhaiyā (4th from Moon)",7:"Dhaiyā (8th from Moon)"};
  var rows=out.map(function(r){
    var cur=(nowJd>=r[1]&&nowJd<r[2]);
    return '<tr'+(cur?' class="khl"':'')+'><td><b>'+esc(NAME[r[0]]||"")+'</b>'+(cur?' ← now':'')+'</td>'+
      '<td>'+fmy(r[1])+'</td><td>'+fmy(r[2])+'</td>'+
      '<td class="knum">'+((r[2]-r[1])/365.25).toFixed(1)+' y</td></tr>';
  });
  return '<p class="knote">Saturn\'s passage over the 12th, 1st and 2nd from the natal Moon is <b>Sade Sati</b>; '+
    'its transits of the 4th and 8th are the <b>dhaiyās</b>. Tradition treats these as demanding, '+
    'consolidating periods — read them as seasons asking for patience and care, not as forecasts of misfortune.</p>'+
    (rows.length?tbl(["Phase","From","To","Length"],rows):'<p class="kmut">No phase found in the scanned window.</p>')+
    '<div class="kbox">Scanned from 30 years before to 40 years after today, at 20-day resolution, so the '+
    'boundary months are approximate. Natal Moon in '+SA[mSign]+'.</div>';
}
function ingressSection(D){
  var out=[], names=["Sun","Mercury","Venus","Mars","Jupiter","Saturn"];
  var nowJd=D.nowJd;
  function sidLon(body,jd){
    var d=new Date(Date.now()+(jd-nowJd)*86400000);
    return ((Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body[body],d,true)).elon-AY(jd))%360+360)%360;
  }
  names.forEach(function(n){
    var prevSign=null, prevRetro=null, step=(n==="Sun"||n==="Mercury"||n==="Venus")?2:5;
    for(var jd=nowJd; jd<=nowJd+730; jd+=step){
      var l=sidLon(n,jd), s=Math.floor(l/30)%12;
      var l2=sidLon(n,jd+0.5), retro=(((l2-l+540)%360)-180)<0;
      if(prevSign!=null && s!==prevSign) out.push({jd:jd,p:n,what:"enters "+SA[s]});
      if(prevRetro!=null && retro!==prevRetro) out.push({jd:jd,p:n,what:retro?"turns retrograde":"turns direct"});
      prevSign=s; prevRetro=retro;
    }
  });
  out.sort(function(a,b){return a.jd-b.jd;});
  var rows=out.slice(0,40).map(function(e){
    var sg=null;
    return '<tr><td>'+fdate(e.jd)+'</td><td><b>'+esc(e.p)+'</b></td><td>'+esc(e.what)+'</td>'+
      '<td class="kmut">'+(function(){ if(!D.P[e.p]) return "";
        var s=e.what.indexOf("enters")===0?e.what.slice(7):null; if(!s) return "";
        var idx=SA.indexOf(s); if(idx<0) return "";
        return "house "+(((idx-D.LS)%12+12)%12+1)+" from your lagna"; })()+'</td></tr>';
  });
  return '<p class="knote">Sign changes and retrograde stations over the next two years, for the planets whose '+
    'movement is quick enough to matter. Dates are resolved to within a few days.</p>'+
    tbl(["Date","Graha","Event","Relative to this chart"],rows)+
    '<p class="klegend">Showing the first 40 events. The Moon and the nodes are omitted — the Moon changes sign '+
    'every 2½ days, and the nodes move slowly and always retrograde.</p>';
}
function eclipseSection(D){
  var rows=[];
  try{
    var t=Astronomy.MakeTime(new Date());
    var se=Astronomy.SearchGlobalSolarEclipse(t);
    for(var i=0;i<4&&se;i++){
      var jd=D.nowJd+(se.peak.date.getTime()-Date.now())/86400000;
      var ay=AY(jd);
      var lon=((Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body.Sun,se.peak.date,true)).elon-ay)%360+360)%360;
      var sg=Math.floor(lon/30)%12, h=((sg-D.LS)%12+12)%12+1;
      rows.push('<tr><td>'+se.peak.date.toISOString().slice(0,10)+'</td><td>Solar ('+esc(se.kind)+')</td>'+
        '<td>'+SA[sg]+' '+dm(lon%30)+'</td><td class="knum">'+h+'</td>'+
        '<td class="kmut">'+nakOf(lon).name+'</td></tr>');
      se=Astronomy.NextGlobalSolarEclipse(se.peak);
    }
    var le=Astronomy.SearchLunarEclipse(new Date());
    for(var j=0;j<4&&le;j++){
      var jd2=D.nowJd+(le.peak.date.getTime()-Date.now())/86400000, ay2=AY(jd2);
      var ml=((Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body.Moon,le.peak.date,true)).elon-ay2)%360+360)%360;
      var sg2=Math.floor(ml/30)%12, h2=((sg2-D.LS)%12+12)%12+1;
      rows.push('<tr><td>'+le.peak.date.toISOString().slice(0,10)+'</td><td>Lunar ('+esc(le.kind)+')</td>'+
        '<td>'+SA[sg2]+' '+dm(ml%30)+'</td><td class="knum">'+h2+'</td>'+
        '<td class="kmut">'+nakOf(ml).name+'</td></tr>');
      le=Astronomy.NextLunarEclipse(le.peak);
    }
  }catch(e){ return '<p class="kmut">Eclipse search unavailable ('+esc(e.message)+').</p>'; }
  rows.sort();
  return '<p class="knote">The next few eclipses, placed in the sidereal zodiac and in the houses of this chart. '+
    'Tradition watches eclipses falling on natal points; treat that as a prompt for reflection, not a prediction.</p>'+
    tbl(["Date (UTC)","Type","Sidereal position","House here","Nakṣatra"],rows);
}
function dayToolsSection(D){
  var sr=D.sunriseH, ss=D.sunsetH;
  if(sr==null||ss==null) return "";
  var dayLen=((ss-sr)+24)%24, part=dayLen/8, wd=D.weekday||0;
  function hm2(x){x=((x%24)+24)%24;var m=Math.round(x*60);return String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0");}
  var RAHU=[8,2,7,5,6,4,3], YAMA=[5,4,3,2,1,7,6], GULI=[7,6,5,4,3,2,1];
  function span(n){ var s=sr+(n-1)*part; return hm2(s)+" – "+hm2(s+part); }
  var rows=[
    ["Rāhu kālam",span(RAHU[wd]),"avoided for beginnings"],
    ["Yamaganda",span(YAMA[wd]),"avoided for beginnings"],
    ["Gulika kālam",span(GULI[wd]),"avoided for beginnings"]
  ].map(function(r){ return '<tr><td><b>'+esc(r[0])+'</b></td><td class="knum">'+esc(r[1])+'</td><td class="kmut">'+esc(r[2])+'</td></tr>'; });
  var CHOG_DAY=[["Udvega",0],["Chara",1],["Labha",2],["Amrita",3],["Kala",4],["Shubha",5],["Roga",6],["Udvega",7]];
  var CH_SEQ={0:["Udvega","Chara","Labha","Amrita","Kala","Shubha","Roga","Udvega"],
              1:["Amrita","Kala","Shubha","Roga","Udvega","Chara","Labha","Amrita"],
              2:["Roga","Udvega","Chara","Labha","Amrita","Kala","Shubha","Roga"],
              3:["Labha","Amrita","Kala","Shubha","Roga","Udvega","Chara","Labha"],
              4:["Shubha","Roga","Udvega","Chara","Labha","Amrita","Kala","Shubha"],
              5:["Chara","Labha","Amrita","Kala","Shubha","Roga","Udvega","Chara"],
              6:["Kala","Shubha","Roga","Udvega","Chara","Labha","Amrita","Kala"]};
  var GOODCH=["Amrita","Shubha","Labha","Chara"];
  var ch=(CH_SEQ[wd]||CH_SEQ[0]).map(function(nm,k){
    return '<tr><td class="knum">'+(k+1)+'</td><td>'+span(k+1)+'</td>'+
      '<td style="color:'+(GOODCH.indexOf(nm)>=0?"#1c6b46":"#a1493a")+';font-weight:600">'+esc(nm)+'</td></tr>';});
  return '<p class="knote">Day divisions for the <b>birth date at the birth place</b>, from the computed sunrise '+
    '('+hm2(sr)+') and sunset ('+hm2(ss)+'). These are muhūrta tools — the inauspicious eighth-parts, and the '+
    'choghaḍiyā of the day.</p>'+
    tbl(["Period","Time","Note"],rows)+
    '<h4 class="ksub">Choghaḍiyā (day)</h4>'+tbl(["#","Time","Quality"],ch)+
    '<div class="kbox">Choghaḍiyā and the inauspicious periods follow the common weekday tables; regional '+
    'traditions vary. Night choghaḍiyā is omitted.</div>';
}
var ASHT_YEARS={Sun:6,Moon:15,Mars:8,Mercury:17,Saturn:10,Jupiter:19,Rahu:12,Venus:21};
var ASHT_SEQ=["Sun","Moon","Mars","Mercury","Saturn","Jupiter","Rahu","Venus"];
var ASHT_GROUP=[["Sun",[5,6,7]],["Moon",[8,9,10,11]],["Mars",[12,13,14]],["Mercury",[15,16,17,18]],
  ["Saturn",[19,20,21]],["Jupiter",[22,23,24,25]],["Rahu",[26,0,1]],["Venus",[2,3,4]]];
function ashtottariSection(D){
  if(!D.P.Moon||!D.mds) return "";
  var seg=40/3, mn=((D.P.Moon.sid%360)+360)%360, ni=Math.floor(mn/seg);
  var grp=null,pos=0;
  ASHT_GROUP.forEach(function(g){ var k=g[1].indexOf(ni); if(k>=0){ grp=g[0]; pos=k; } });
  if(!grp) return "";
  var size=ASHT_GROUP.filter(function(g){return g[0]===grp;})[0][1].length;
  var within=(mn-ni*seg)/seg;
  var frac=(pos+within)/size;
  var bal=ASHT_YEARS[grp]*(1-frac);
  var birth=D.mds[0].start, jd=birth, rows=[], i0=ASHT_SEQ.indexOf(grp);
  for(var k=0;k<8;k++){
    var lord=ASHT_SEQ[(i0+k)%8], yrs=(k===0)?bal:ASHT_YEARS[lord];
    var end=jd+yrs*365.2564;
    var cur=(D.nowJd>=jd&&D.nowJd<end);
    rows.push('<tr'+(cur?' class="khl"':'')+'><td><b>'+esc(lord)+'</b>'+(cur?' ← current':'')+'</td>'+
      '<td class="knum">'+yrs.toFixed(2)+'</td><td>'+fdate(jd)+'</td><td>'+fdate(end)+'</td>'+
      '<td class="kmut">'+(k===0?"balance at birth":"")+'</td></tr>');
    jd=end;
  }
  return '<p class="knote"><b>Aṣṭottarī</b> is a 108-year daśā of eight planets (Ketu is omitted). BPHS gives it '+
    'as a <i>conditional</i> system, applied when specific birth conditions are met rather than universally — so '+
    'read it alongside Vimśottarī, not instead of it.</p>'+
    tbl(["Lord","Years","From","To",""],rows)+
    '<p class="klegend">Birth Moon in '+NAKS[ni]+', which falls in the '+esc(grp)+' group — leaving a balance of '+
    bal.toFixed(2)+' years. Durations: Sun 6, Moon 15, Mars 8, Mercury 17, Saturn 10, Jupiter 19, Rāhu 12, Venus 21.</p>';
}
function bhavaBalaSection(D,J){
  var sb=J&&J.shadbala&&J.shadbala.planets; if(!sb) return "";
  var byP={}; sb.forEach(function(p){ byP[p.graha]=p; });
  // Bhava Dig Bala: by the nature of the sign on the house
  var HUMAN=[2,5,6,10], QUAD=[0,1,4,8,9], WATER=[3,7,11], INSECT=[7];
  var rows=[];
  var aspBy={};
  D.planets.forEach(function(q){ (ASPOFF[q.en]||[6]).forEach(function(o){
    var h=((q.house-1+o)%12)+1; (aspBy[h]=aspBy[h]||[]).push(q.en); }); });
  var BEN=["Jupiter","Venus","Mercury","Moon"];
  for(var h=1;h<=12;h++){
    var sg=(D.LS+h-1)%12, lord=LORD[sg], lp=byP[lord];
    var adhip=lp?lp.total_virupa:0;
    var dig= (HUMAN.indexOf(sg)>=0 && [1,2,3,4].indexOf(h)>=0) ? 60 :
             (QUAD.indexOf(sg)>=0 && [10].indexOf(h)>=0) ? 60 :
             (WATER.indexOf(sg)>=0 && [4].indexOf(h)>=0) ? 60 : 30;
    var a=aspBy[h]||[], drik=0;
    a.forEach(function(x){ drik += (BEN.indexOf(x)>=0?15:-15); });
    var tot=adhip+dig+drik;
    rows.push('<tr><td><b>'+h+'</b> '+SA[sg]+'</td><td>'+esc(lord)+'</td>'+
      '<td class="knum">'+adhip.toFixed(0)+'</td><td class="knum">'+dig+'</td>'+
      '<td class="knum">'+drik+'</td><td class="knum"><b>'+tot.toFixed(0)+'</b></td>'+
      '<td class="knum">'+(tot/60).toFixed(2)+'</td></tr>');
  }
  return '<p class="knote">A house is scored as well as a planet. <b>Bhāva Bala</b> combines the strength of the '+
    'house lord (its full Ṣaḍbala), the house\'s own directional strength, and the net of benefic and malefic '+
    'glances falling on it. A strong house delivers its significations; a weak one under-delivers even under a '+
    'capable lord.</p>'+
    tbl(["Bhāva","Lord","Lord's Ṣaḍbala","Dig","Dṛk","Total (v)","Rupa"],rows)+
    '<div class="kbox">Bhāva Dig Bala is scored by the nature of the sign on the house (human signs in the 1st '+
    'to 4th, quadruped in the 10th, watery in the 4th) and Bhāva Dṛk at ±15 virupas per glance — the simplified '+
    'forms; the exact treatment weighs each glance in Virupas by angle.</div>';
}
function ishtaKashtaSection(D,J){
  var sb=J&&J.shadbala&&J.shadbala.planets; if(!sb) return "";
  var rows=sb.slice().sort(function(a,b){return b.uchcha-a.uchcha;}).map(function(p){
    var ishta=Math.sqrt(Math.max(0,p.uchcha)*Math.max(0,p.cheshta));
    var kashta=Math.sqrt(Math.max(0,60-p.uchcha)*Math.max(0,60-p.cheshta));
    var net=ishta-kashta;
    return '<tr><td><b>'+esc(p.graha)+'</b></td><td class="knum">'+p.uchcha.toFixed(1)+'</td>'+
      '<td class="knum">'+p.cheshta.toFixed(1)+'</td>'+
      '<td class="knum" style="color:#1c6b46;font-weight:600">'+ishta.toFixed(1)+'</td>'+
      '<td class="knum" style="color:#a1493a;font-weight:600">'+kashta.toFixed(1)+'</td>'+
      '<td class="knum" style="color:'+(net>=0?"#1c6b46":"#a1493a")+'"><b>'+(net>=0?"+":"")+net.toFixed(1)+'</b></td></tr>';
  });
  return '<p class="knote">From a planet\'s exaltation ray (Uchcha) and motional ray (Cheṣṭā), BPHS derives two '+
    'opposed potencies: <b>Iṣṭa phala</b>, the capacity to give agreeable results, and <b>Kaṣṭa phala</b>, the '+
    'capacity to give difficult ones. Each is the geometric mean of the two rays — Iṣṭa of the rays themselves, '+
    'Kaṣṭa of their complements.</p>'+
    tbl(["Graha","Uchcha ray","Cheṣṭā ray","Iṣṭa","Kaṣṭa","Net"],rows)+
    '<div class="kbox">A high-Iṣṭa planet tends to bless the matters it touches; a high-Kaṣṭa one tends to '+
    'stress them. Read alongside dignity and Ṣaḍbala, never alone.</div>';
}

