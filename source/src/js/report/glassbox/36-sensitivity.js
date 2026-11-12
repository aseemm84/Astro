/* --- the forks: choices that are genuinely open --- */
function sensForksSection(D,J){
  if(!J||!J.input) return "";
  var base=J.input, rows="";
  function variant(over){
    var i={}; for(var k in base) i[k]=base[k];
    for(var k2 in over) i[k2]=over[k2];
    return window.buildLocalChart(i);
  }
  // 1. ayanamsa
  var modes=Object.keys(window.__ayanModes||{});
  if(!modes.length) modes=["lahiri","raman","kp","truechitra"];
  /* The baseline is the mode this chart was actually cast with, not the literal
     string "lahiri". Hardcoding it meant that a chart cast on Nirayana–Revatī got
     a "changes sign" column measured against a chart the reader was not looking
     at, and an "← in use" marker on a row that was not in use. Both follow the
     input now, so the table describes the chart above it. */
  var CUR=(J.input&&J.input.ayanamsa)||"lahiri";
  if(modes.indexOf(CUR)<0) CUR=modes[0];
  var V={};
  modes.forEach(function(m){ V[m]=variant({ayanamsa:m}); });
  var ayRows=modes.map(function(m){
    var Jv=V[m], moved=[];
    Jv.grahas.forEach(function(g,ix){
      if(g.rashi.idx!==V[CUR].grahas[ix].rashi.idx) moved.push(EN[g.key]||g.key); });
    var lagDiff=Jv.lagna.rashi.idx!==V[CUR].lagna.rashi.idx;
    return '<tr'+(m===CUR?' class="khl"':'')+'><td><b>'+esc(Jv.ayanamsa_name)+'</b>'+
      (m===CUR?' <span class="kmut">← in use</span>':'')+'</td>'+
      '<td class="knum">'+Jv.ayanamsha_deg.toFixed(4)+'°</td>'+
      '<td>'+SA[Jv.lagna.rashi.idx]+' '+dm(Jv.lagna.rashi.degInSign)+(lagDiff?' <b style="color:var(--sem-bad,#a1493a)">changes</b>':'')+'</td>'+
      '<td>'+(m===CUR?'<span class="kmut">— baseline</span>':(moved.length?moved.join(", "):'<span class="kmut">no sign changes</span>'))+'</td></tr>';
  }).join("");
  // 2. node
  var nm=variant({node:"mean"}), nt=variant({node:"true"});
  function nodeCell(Jv){
    var r=Jv.grahas.filter(function(g){return g.key==="Rāhu";})[0];
    return SA[r.rashi.idx]+" "+dm(r.rashi.degInSign)+" · "+nakOf(r.sidereal_deg).name+" "+nakOf(r.sidereal_deg).pada;
  }
  var rM=nm.grahas.filter(function(g){return g.key==="Rāhu";})[0];
  var rT=nt.grahas.filter(function(g){return g.key==="Rāhu";})[0];
  var nodeRows='<tr'+((J.node_mode||"mean")==="mean"?' class="khl"':'')+'><td><b>Mean node</b>'+
      ((J.node_mode||"mean")==="mean"?' <span class="kmut">← in use</span>':'')+'</td><td colspan="2">'+nodeCell(nm)+'</td>'+
      '<td class="kmut">the smoothed average; always retrograde</td></tr>'+
    '<tr'+(J.node_mode==="true"?' class="khl"':'')+'><td><b>True node</b>'+
      (J.node_mode==="true"?' <span class="kmut">← in use</span>':'')+'</td><td colspan="2">'+nodeCell(nt)+'</td>'+
      '<td class="kmut">the instantaneous node; differs here by '+
      (Math.abs(((rT.sidereal_deg-rM.sidereal_deg+180)%360+360)%360-180)*60).toFixed(1)+'′</td></tr>';
  // 3. house system
  var lag=D.lagna.sidereal_deg, start=((lag-15)%360+360)%360;
  var hs=D.planets.map(function(p){
    var ws=((p.sign-D.LS)%12+12)%12+1, ch=Math.floor((((p.sid-start)%360)+360)%360/30)+1;
    var sri=(D.mcSid!=null)?null:null;
    return {en:p.en, ws:ws, ch:ch};
  });
  var diff=hs.filter(function(x){return x.ws!==x.ch;});
  /* WHICH ROW IS IN USE FOLLOWS THE CHART. This table marked whole-sign
     "← in use" unconditionally, so a Śrīpati chart was told, in the section
     about choices, that it had made the other one. The comparison column
     (equal cusps) is measured from the rāśi, so it is labelled by what it is. */
  var spIn=!!(J&&J.house_system&&J.house_system.mode==="sripati"&&!J.house_system.fell_back);
  var inUse=' <span class="kmut">← in use</span>';
  var houseRows='<tr'+(spIn?'':' class="khl"')+'><td><b>Whole sign</b>'+(spIn?'':inUse)+'</td>'+
      '<td colspan="2">the sign is the house</td><td class="kmut">the BPHS default on this site</td></tr>'+
    '<tr><td><b>Equal cusps (chalit)</b></td><td colspan="2">'+
      (diff.length?diff.map(function(x){return x.en+" "+x.ws+"→"+x.ch;}).join(", "):"no planet moves")+'</td>'+
      '<td class="kmut">houses centred on the lagna degree, compared with whole-sign</td></tr>'+
    '<tr'+(spIn?' class="khl"':'')+'><td><b>Śrīpati</b>'+(spIn?inUse:'')+'</td><td colspan="2">shown in its own section</td>'+
      '<td class="kmut">unequal quadrant trisection — and his own rules for what follows from it</td></tr>';
  return '<p class="knote">Three things about this chart are <b>choices, not facts</b>. Changing any of them '+
    'changes the reading. They are laid out here so the choice is visible rather than buried in a default.</p>'+
    '<h4 class="ksub">Ayanāṃśa</h4>'+
    tbl(["Setting","Value","Lagna","Planets that change sign"],[ayRows])+
    '<h4 class="ksub">Lunar nodes</h4>'+
    tbl(["Setting","Rāhu","",""],[nodeRows])+
    '<h4 class="ksub">House system</h4>'+
    tbl(["Setting","Effect","",""],[houseRows])+
    '<div class="kbox">None of these has a single right answer. Lahiri is the Indian civil standard and '+
    'everything on this site is validated against it; the mean node is the usual Jyotiṣa choice; whole-sign is '+
    'what BPHS uses. The alternatives are offered because a reader deserves to see how much rests on the '+
    'convention rather than on the sky.</div>';
}
/* the ±15-minute sweep as a reader sees it: one row per boundary, in time order */
var SENS_QNAME={lagna:"Lagna sign",D9:"D9 lagna",D10:"D10 lagna",D60:"D60 lagna",
  moon_nakshatra:"Moon's nakṣatra",moon_pada:"Moon's pāda"};
function sensQName(k){ return SENS_QNAME[k]||(k.indexOf("bhava_")===0?k.slice(6)+"'s bhāva (Śrīpati)":k); }
function sensQVal(k,v){
  if(v==null) return "—";
  if(k==="moon_nakshatra") return NAKS[v];
  if(k==="moon_pada") return NAKS[Math.floor(v/4)]+" "+(v%4+1);
  if(k.indexOf("bhava_")===0) return "bhāva "+v;
  return SA[v];
}
function sensFmtOff(s){ var a=Math.abs(s), m=Math.floor(a/60), r=a-m*60;
  return (s<0?"−":"+")+m+"m "+(r<10?"0":"")+r.toFixed(1)+"s"; }
function sensBoundaryTable(J){
  var B=null; try{ B=sensBoundaries(J,15); }catch(e){ B=null; }
  if(!B) return "";
  var rows=B.events.map(function(e){
    return '<tr><td class="knum">'+sensFmtOff(e.offset_sec)+'</td><td><b>'+esc(sensQName(e.quantity))+'</b></td>'+
      '<td>'+esc(sensQVal(e.quantity,e.from))+' → '+esc(sensQVal(e.quantity,e.to))+'</td></tr>';
  }).join("");
  var stable=B.quantities.filter(function(k){ return B.stability[k].stable_for_whole_span; })
    .map(sensQName);
  return '<h4 class="ksub">Every boundary within a quarter-hour</h4>'+
    '<p class="knote">The exact moment, either side of the recorded time, at which each time-sensitive '+
    'quantity changes — found by bisection to half a second rather than read off a sample. If the true birth '+
    'time lies beyond a row, that row\'s change applies.</p>'+
    (rows?tbl(["From recorded time","What changes","From → to"],[rows])
         :'<p class="kmut">Nothing listed changes within fifteen minutes either side.</p>')+
    (stable.length?'<p class="klegend">Unchanged across the whole ±15 minutes: '+esc(stable.join(", "))+'.</p>':'');
}
function sensSummarySection(D,J){
  var S=SENS; if(!S) return "";
  function line(m,label){
    var bits=[];
    if(m.lagna) bits.push("<b>the lagna changes sign</b>");
    if(m.vargas.length) bits.push(m.vargas.length+" divisional lagna"+(m.vargas.length>1?"s":"")+
      " shift ("+m.vargas.slice(0,6).join(", ")+(m.vargas.length>6?"…":"")+")");
    if(m.padas.length) bits.push("pāda changes for "+m.padas.map(function(k){return EN[k]||k;}).join(", "));
    if(m.houses.length) bits.push("house changes for "+m.houses.map(function(k){return EN[k]||k;}).join(", "));
    return '<tr><td><b>'+label+'</b></td><td class="knum">'+m.lagMin.toFixed(1)+'′</td><td>'+
      (bits.length?bits.join("; "):'<span class="kmut">nothing changes</span>')+'</td></tr>';
  }
  return '<p class="knote">Birth times are recorded to the minute at best, and often rounded to five or fifteen. '+
    'This is what a small error would actually do to <i>this</i> chart — computed, not asserted, by casting it '+
    'again a minute and four minutes either side.</p>'+
    tbl(["Shift in birth time","Lagna moves","What changes"],[line(S.m1,"± 1 minute"),line(S.m4,"± 4 minutes")])+
    sensBoundaryTable(J)+
    '<div class="kbox">The badge on each section heading follows from this. <span class="sensb sens-lo" title="nothing this section rests on moved within four minutes">stable</span> '+
    'means nothing that section rests on moved within four minutes; <span class="sensb sens-mid" title="moved within four minutes but not within one">sensitive</span> '+
    'means it moved within four but not one; <span class="sensb sens-hi" title="already changes with a one-minute shift">very sensitive</span> means one minute '+
    'is already enough. <span class="sensb sens-mid" title="measured from the birth moment itself, so it shifts by exactly the error in your recorded time">moves with the clock</span> marks the sections measured from '+
    'the birth moment itself — Iṣṭakāla, the upagrahas, the special lagnas — which shift by exactly whatever your '+
    'recorded time is out by.</div>';
}
