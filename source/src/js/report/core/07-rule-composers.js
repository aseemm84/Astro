/* --- per-section composers --- */
function aChart(D){
  var LS=D.LS,ll=LORD[LS],lp=D.P[ll],mo=D.P.Moon,su=D.P.Sun;
  var b="The lagna is <b>"+SA[LS]+"</b>, so <b>"+ll+"</b> governs the chart as lagna lord";
  if(lp){b+=", placed in the "+ord(lp.house)+" ("+SA[lp.sign]+") in "+DIGM[lp.dig]+".";}else{b+=".";}
  var d="";
  if(lp){
    d="A lagna lord that is "+(DRANK[lp.dig]>=2?"well placed":(DRANK[lp.dig]<=-1?"under pressure":"moderately placed"))+
      " is the foundation the rest of the chart is read against — BPHS treats the 1st as body, vitality and the "+
      "overall shape of life. ";
    var asp=aspectsFrom(ll,lp.house);
    d+=ll+" casts its glance on the "+list(asp.map(ord))+" from there. ";
  }
  if(mo)d+="The Moon — the mind — is in "+SA[mo.sign]+" in the "+ord(mo.house)+", "+DIGM[mo.dig]+". ";
  if(su)d+="The Sun — soul and authority — is in "+SA[su.sign]+" in the "+ord(su.house)+". ";
  d+="A first reading works outward from these three before any single placement is weighted.";
  return note("Study note — reading the chart",b,d,["lagna","bhava","graha"]);
}

function aGrahas(D){
  var strong=[],weak=[],flags=[];
  D.planets.forEach(function(p){
    if(p.en==="Rahu"||p.en==="Ketu")return;
    if(DRANK[p.dig]>=2)strong.push(p.en+" ("+p.dig+" in "+SA[p.sign]+")");
    if(DRANK[p.dig]<=-1)weak.push(p.en+" ("+p.dig+")");
    if(p.combust)flags.push(p.en+" is combust, only "+p.sep.toFixed(1)+"° from the Sun, so its expression is scorched");
    if(p.retro&&p.en!=="Rahu"&&p.en!=="Ketu")flags.push(p.en+" is retrograde, which intensifies but inwardly turns its significations");
    if(p.digbala===p.house)flags.push(p.en+" holds directional strength in the "+ord(p.house));
  });
  var b="";
  if(strong.length)b+="Strongest by dignity: <b>"+list(strong)+"</b>. ";
  if(weak.length)b+="Under pressure: <b>"+list(weak)+"</b>. ";
  if(!strong.length&&!weak.length)b+="No planet is exalted or debilitated; dignity is moderate across the chart. ";
  var d="";
  if(flags.length)d+="Notable states: "+list(flags)+". ";
  var av=D.planets.filter(function(p){return p.avpct===0;}).map(function(p){return p.en;});
  if(av.length)d+="The engine places "+list(av)+" in Mṛta avasthā, which tempers how fully even a dignified "+
    "placement expresses — dignity describes the ground, avasthā how awake the planet is on it. ";
  d+="Each planet should then be read through its house ownership from this lagna, not by its natural character alone.";
  return note("Study note — the grahas",b,d,["graha","dignity","strength"]);
}

function aBhavas(D){
  var LS=D.LS,best=null,worst=null,occ=[];
  D.bhavas.forEach(function(b){
    if(b.sav!=null){if(!best||b.sav>best.sav)best=b;if(!worst||b.sav<worst.sav)worst=b;}
    if(b.occ.length>=2)occ.push("the "+ord(b.n)+" ("+list(b.occ)+")");
  });
  // houses whose lord sits in them
  var ownhome=D.bhavas.filter(function(b){var lp=D.P[b.lord];return lp&&lp.house===b.n;});
  var s="";
  if(ownhome.length)s+="The "+list(ownhome.map(function(b){return ord(b.n)+" (lord "+b.lord+" in its own house)";}))+
    " — a house whose lord is placed in it, and dignified, is read as well-supported. ";
  if(occ.length)s+="Weighted houses: "+list(occ)+". ";
  var d="";
  if(best&&worst)d+="By ashtakavarga the "+ord(best.n)+" carries the most support ("+best.sav+
    ") and the "+ord(worst.n)+" the least ("+worst.sav+"). ";
  // aspects onto houses
  var asp={};D.planets.forEach(function(p){aspectsFrom(p.en,p.house).forEach(function(h){(asp[h]=asp[h]||[]).push(p.en);});});
  var ben=[];D.bhavas.forEach(function(b){
    var a=(asp[b.n]||[]).filter(function(x){return ["Jupiter","Venus"].indexOf(x)>=0;});
    if(a.length&&[1,4,5,7,9,10].indexOf(b.n)>=0)ben.push("the "+ord(b.n)+" by "+list(a));});
  if(ben.length)d+="Benefic glances fall on "+list(ben)+", which BPHS treats as protective of those matters. ";
  d+="A house is judged from four things together — its significations, its lord's condition, its occupants and "+
    "the aspects it receives — never from one alone.";
  return note("Study note — the houses",s||"Each house is read through its lord, occupants and aspects. ",d,["bhava","aspect","av"]);
}

function aAv(D){
  if(!D.av||!D.av.sarva)return "";
  var LS=D.LS,hi=[],lo=[];
  for(var h=1;h<=12;h++){var v=D.av.sarva[(LS+h-1)%12];
    if(v>=30)hi.push("the "+ord(h)+" ("+v+")");if(v<25)lo.push("the "+ord(h)+" ("+v+")");}
  var b="Well-supported: "+(hi.length?list(hi):"none above 30")+". Under-supported: "+(lo.length?list(lo):"none below 25")+".";
  var top=null;D.av.bhinna.forEach(function(x){if(!top||x.total>top.total)top=x;});
  var d="Totals sum to "+D.av.sarva_total+", the standard 337, which confirms the computation. ";
  if(top)d+=top.graha+" carries the highest individual total ("+top.total+"). ";
  d+="Ashtakavarga grades <i>support</i>, not outcome: a high score weights the odds for transits and for the "+
   "matters of that house, but the result still depends on the chart as a whole and the daśā in force.";
  return note("Study note — ashtakavarga",b,d,["av"]);
}

function aVarga(D){
  var good=[],bad=[];
  ORD.slice(0,7).forEach(function(k){
    var g=0,n=0;D.vargas.forEach(function(v){if(v.pos[k]==null)return;n++;if(DRANK[v.dig[k]]>=1)g++;});
    if(n){if(g/n>=0.55)good.push(k+" ("+g+"/"+n+")");if(g/n<=0.3)bad.push(k+" ("+g+"/"+n+")");}
  });
  var b="Holding up best across the divisions: "+(good.length?list(good):"none stands out")+
    (bad.length?". Thinnest: "+list(bad):"")+".";
  var d="A varga refines what the rāśi chart already promises — it shows quality and detail, not a new promise. "+
    "A planet dignified in D1 and again in the relevant division is genuinely strong; one strong in D1 but weak "+
    "across the divisions tends to under-deliver. ";
  d+=(D.vargottama.length?"Vargottama here: "+list(D.vargottama)+", reinforced by repeating the same sign in D9.":
    "No planet is vargottama in this chart.");
  return note("Study note — the divisions",b,d,["varga","strength"]);
}

function aDivisional(D){
  var notes=[];
  ["D9","D10","D4","D7"].forEach(function(code){
    var v=null;D.vargas.forEach(function(x){if(x.code===code)v=x;});
    if(!v||v.lagna==null||!CRUX[code])return;
    var cx=CRUX[code],cs=(v.lagna+cx[0]-1)%12,lord=LORD[cs];
    var occ=[];Object.keys(v.pos).forEach(function(k){if(v.pos[k]===cs)occ.push(k);});
    var lh=(v.pos[lord]!=null)?(((v.pos[lord]-v.lagna)%12+12)%12+1):null;
    var ld=(v.pos[lord]!=null)?dignity(lord,v.pos[lord],null):null;
    var t=code+" ("+VSUBJ[code]+"): the "+ord(cx[0])+" is "+SA[cs]+
      (occ.length?", holding "+list(occ):", empty")+"; its lord "+lord+
      (lh?" sits in the "+ord(lh)+" of that chart on "+DIGM[ld]:"")+".";
    notes.push(t);
  });
  var b=notes.length?notes[0]:"";
  var d=notes.slice(1).join(" ")+" Read the crux house first, then the rest of that chart as the universal house "+
    "meanings refracted into its subject. House-by-house reading inside a varga is later analytical practice, "+
    "not explicit BPHS verses.";
  return note("Study note — divisional charts",b,d,["varga","bhava"]);
}

function aYogas(D){
  var pres=D.yogas.filter(function(y){return y.present;});
  if(!pres.length)return note("Study note — yogas","No catalogued yoga in this set is formed.",
    "Absence of a named yoga is not weakness: the ordinary strength of lords, houses and daśās carries most of a reading.",["yoga"]);
  var pos=pres.filter(function(y){return y.category!=="Subtractive";}).map(function(y){return y.iast||y.key;});
  var neg=pres.filter(function(y){return y.category==="Subtractive";}).map(function(y){return y.iast||y.key;});
  var b="Formed: <b>"+list(pos)+"</b>"+(neg.length?"; and the subtractive <b>"+list(neg)+"</b>":"")+".";
  var d="";
  // Kemadruma mitigation check
  if(neg.indexOf("Kemadruma")>=0&&D.P.Moon){
    var asp=[];D.planets.forEach(function(p){
      if(p.en==="Moon")return;
      if(aspectsFrom(p.en,p.house).indexOf(D.P.Moon.house)>=0&&["Jupiter","Venus","Mercury"].indexOf(p.en)>=0)asp.push(p.en);});
    if(asp.length)d+="Kemadruma is materially softened here: "+list(asp)+" aspect"+(asp.length>1?"":"s")+
      " the Moon, and benefic support of the Moon is the classical mitigation. ";
  }
  d+="A yoga is a promise, not a delivery. Judge each on five points — is the formation exactly met, are the "+
    "planets strong and dignified, does it hold in the relevant varga, is it afflicted or cancelled, and which "+
    "daśā activates it. Presence alone guarantees nothing.";
  return note("Study note — yogas",b,d,["yoga","dasha"]);
}

function aDasha(D){
  if(!D.mds||!D.curMd)return "";
  var cm=D.curMd,nx=D.nextMd,cp=D.P[cm.lord];
  var b="Running <b>"+cm.lord+"</b> mahādaśā to "+fmy(cm.end)+
    (cp?", with "+cm.lord+" natally in the "+ord(cp.house)+" on "+DIGM[cp.dig]:"")+
    (nx?"; <b>"+nx.lord+"</b> follows for "+Math.round(nx.years)+" years":"")+".";
  var d="";
  if(nx){
    var np=D.P[nx.lord],owns=(D.owns[nx.lord]||[]);
    d+="The incoming lord "+nx.lord+(owns.length?" owns the "+list(owns.map(ord)):"")+
      (np?" and sits in the "+ord(np.house)+" on "+DIGM[np.dig]:"")+". ";
    if(np&&DRANK[np.dig]>=2&&owns.filter(function(h){return [1,4,5,7,9,10].indexOf(h)>=0;}).length)
      d+="A dignified lord of an angle or trine running its own long period is classically read as a constructive "+
        "season for the matters it governs — conditionally, and subject to its strength and the sub-periods. ";
  }
  d+="Daśā results are conditional on the lord's dignity, ownership, placement and association — there is no "+
    "blanket rule that one planet's period is good or another's bad. Sub-periods recolour the theme throughout.";
  return note("Study note — timing",b,d,["dasha","graha"]);
}


