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
  var modes=["lahiri","raman","kp","truechitra"], V={};
  modes.forEach(function(m){ V[m]=variant({ayanamsa:m}); });
  var ayRows=modes.map(function(m){
    var Jv=V[m], moved=[];
    Jv.grahas.forEach(function(g,ix){
      if(g.rashi.idx!==V.lahiri.grahas[ix].rashi.idx) moved.push(EN[g.key]||g.key); });
    var lagDiff=Jv.lagna.rashi.idx!==V.lahiri.lagna.rashi.idx;
    return '<tr'+(m==="lahiri"?' class="khl"':'')+'><td><b>'+esc(Jv.ayanamsa_name)+'</b>'+
      (m==="lahiri"?' <span class="kmut">← in use</span>':'')+'</td>'+
      '<td class="knum">'+Jv.ayanamsha_deg.toFixed(4)+'°</td>'+
      '<td>'+SA[Jv.lagna.rashi.idx]+' '+dm(Jv.lagna.rashi.degInSign)+(lagDiff?' <b style="color:#a1493a">changes</b>':'')+'</td>'+
      '<td>'+(m==="lahiri"?'<span class="kmut">—</span>':(moved.length?moved.join(", "):'<span class="kmut">no sign changes</span>'))+'</td></tr>';
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
    var ws=p.house, ch=Math.floor((((p.sid-start)%360)+360)%360/30)+1;
    var sri=(D.mcSid!=null)?null:null;
    return {en:p.en, ws:ws, ch:ch};
  });
  var diff=hs.filter(function(x){return x.ws!==x.ch;});
  var houseRows='<tr class="khl"><td><b>Whole sign</b> <span class="kmut">← in use</span></td>'+
      '<td colspan="2">the sign is the house</td><td class="kmut">the BPHS default on this site</td></tr>'+
    '<tr><td><b>Equal cusps (chalit)</b></td><td colspan="2">'+
      (diff.length?diff.map(function(x){return x.en+" "+x.ws+"→"+x.ch;}).join(", "):"no planet moves")+'</td>'+
      '<td class="kmut">houses centred on the lagna degree</td></tr>'+
    '<tr><td><b>Sripati</b></td><td colspan="2">shown in its own section</td>'+
      '<td class="kmut">unequal quadrant trisection</td></tr>';
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
    '<div class="kbox">The badge on each section heading follows from this. <span class="sensb sens-lo" title="nothing this section rests on moved within four minutes">stable</span> '+
    'means nothing that section rests on moved within four minutes; <span class="sensb sens-mid" title="moved within four minutes but not within one">sensitive</span> '+
    'means it moved within four but not one; <span class="sensb sens-hi" title="already changes with a one-minute shift">very sensitive</span> means one minute '+
    'is already enough. <span class="sensb sens-mid" title="measured from the birth moment itself, so it shifts by exactly the error in your recorded time">moves with the clock</span> marks the sections measured from '+
    'the birth moment itself — Iṣṭakāla, the upagrahas, the special lagnas — which shift by exactly whatever your '+
    'recorded time is out by.</div>';
}
