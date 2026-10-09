/* ===== Rule-based readings =====
   The report already composes study notes from the site's rule base. Those notes are
   HTML built for the page, so nothing downstream can use them. This turns the same
   rules into structured text for the JSON, and adds readings for the blocks the
   original composers predate.

   These are a transparent synthesis from stated rules — not BPHS quotations, and not
   predictions. Every one names the figures it rests on so a reader can disagree with
   the reasoning rather than just the conclusion. */
function rdStrip(html){
  return String(html).replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ")
    .replace(/&amp;/g,"&").replace(/&rsquo;/g,"\u2019").replace(/&mdash;/g,"\u2014")
    .replace(/\s+/g," ").trim();
}
function rdFromNote(key,title,html){
  var txt=rdStrip(html);
  var t=rdStrip(title);
  if(txt.indexOf(t)===0) txt=txt.slice(t.length).trim();
  txt=txt.replace(/\s*Read more on[^.]*\.?\s*$/i,"").trim();
  return {section:key, heading:t, text:txt};
}
function rdStrength(D,J){
  var sb=J&&J.shadbala&&J.shadbala.planets; if(!sb||!sb.length) return null;
  var srt=sb.slice().sort(function(a,b){return b.ratio-a.ratio;});
  var top=srt[0], bot=srt[srt.length-1];
  var below=sb.filter(function(p){return p.ratio<1;});
  var s="Ṣaḍbala measures each graha against the minimum BPHS sets for it, so the figure "+
    "that matters is the ratio to requirement rather than the raw total. ";
  s+="Here "+top.graha+" is strongest at "+top.ratio.toFixed(2)+" times its requirement, and "+
    bot.graha+" weakest at "+bot.ratio.toFixed(2)+". ";
  s+=below.length?("Below the classical minimum: "+below.map(function(p){
      return p.graha+" ("+p.ratio.toFixed(2)+")"; }).join(", ")+
      ". A graha under its requirement is not thereby harmful; it means its results arrive "+
      "with less force and depend more on the houses it rules and the daśā that activates it. ")
    :"Every graha meets its classical minimum, which is uncommon and leaves the reading to "+
     "rest on placement and lordship rather than on weakness. ";
  s+="Strength says how much a graha can deliver, never whether what it delivers is welcome.";
  return {section:"strength", heading:"Reading the strength figures", text:s};
}
function rdVargaAnalysis(D){
  var VA=null; try{ VA=buildVargaAnalysis(D); }catch(e){}
  if(!VA||!VA.dignity_tally) return null;
  var T=VA.dignity_tally.filter(function(x){return x.counted;});
  var best=T.slice().sort(function(a,b){return (b.strong-b.weak)-(a.strong-a.weak);})[0];
  var worst=T.slice().sort(function(a,b){return (a.strong-a.weak)-(b.strong-b.weak);})[0];
  var vg=T.filter(function(x){return x.vargottama>0;});
  var P=VA.varga_profile.slice().sort(function(a,b){return b.score-a.score;});
  var s="Read across all sixteen divisions rather than one, "+best.graha+" holds up best — "+
    best.strong+" dignified placements against "+best.weak+" weak ones — while "+worst.graha+
    " fares worst at "+worst.strong+" against "+worst.weak+". ";
  if(vg.length) s+="Vargottama (the same sign in a division as in the rāśi chart) occurs for "+
    vg.map(function(x){return x.graha+" in "+x.vargottama_in.join(", ");}).join("; ")+
    ", which the tradition reads as a placement that holds its character under scrutiny. ";
  else s+="No graha repeats its rāśi sign in another division here. ";
  s+="By division, "+P[0].code+" ("+P[0].name+") carries the most dignified grahas and "+
    P[P.length-1].code+" ("+P[P.length-1].name+") the fewest — relevant because each division "+
    "governs its own subject, so a weak division narrows that topic rather than the life.";
  return {section:"divisional", heading:"Reading the divisions together", text:s};
}
function rdYogini(D){
  var y=null; try{ y=jxYogini(D); }catch(e){}
  if(!y||!y.length) return null;
  var cur=y.filter(function(x){return x.current;})[0];
  var s="Yoginī runs eight periods of one to eight years — thirty-six in all — so unlike "+
    "Vimśottarī it repeats within a life. ";
  if(cur) s+="The chart is presently in "+cur.yogini+" ("+cur.lord+"), cycle "+cur.cycle+
    ", which means this yoginī has been met before and its earlier pass is the natural "+
    "comparison. ";
  s+="Because the same yoginī returns roughly every thirty-six years, the system cannot by "+
    "itself distinguish one pass from another; it is read against Vimśottarī, where it "+
    "subdivides a long mahādaśā. Source: BPHS Ch. 46, vv. 195–199.";
  return {section:"yogini", heading:"Reading the Yoginī cycle", text:s};
}
function rdSensitivity(J){
  var s=null; try{ s=jxSensitivity(J); }catch(e){}
  if(!s) return null;
  var m1=s.plus_minus_1_minute, m4=s.plus_minus_4_minutes;
  var t="A chart is only as firm as the minute it was recorded. ";
  if(m4.lagna_changes_sign) t+="<<critical>> Four minutes either way changes the lagna's sign "+
    "here, which changes every house and most of the reading. Nothing house-based should be "+
    "relied on unless the birth time is known to be exact. ";
  else if(m1.lagna_changes_sign) t+="One minute either way changes the lagna's sign. ";
  else t+="The lagna sign holds across ±4 minutes, so the broad frame is stable. ";
  t+="At ±1 minute the lagna moves "+m1.lagna_moves_arcmin+" arcminutes";
  if(m1.varga_lagnas_changing&&m1.varga_lagnas_changing.length)
    t+=", and these divisional ascendants change: "+m1.varga_lagnas_changing.join(", ");
  t+=". Divisional charts are the first thing a recording error breaks, D60 soonest of all.";
  return {section:"sensitivity", heading:"How much rests on the birth minute",
          text:t.replace("<<critical>> ",""), critical:!!m4.lagna_changes_sign};
}
function buildReadings(D,J){
  var out=[];
  function push(k,title,fn){
    try{ var h=fn(); if(h) out.push(rdFromNote(k,title,h)); }catch(e){}
  }
  push("chart","Study note — reading the chart",function(){return aChart(D);});
  push("grahas","Study note — the grahas",function(){return aGrahas(D);});
  push("bhavas","Study note — the bhāvas",function(){return aBhavas(D);});
  push("ashtakavarga","Study note — ashtakavarga",function(){return aAv(D);});
  push("vargas","Study note — the vargas",function(){return aVarga(D);});
  push("divisional_charts","Study note — divisional charts",function(){return aDivisional(D);});
  push("yogas","Study note — yogas",function(){return aYogas(D);});
  push("dasha","Study note — daśā",function(){return aDasha(D);});
  [rdStrength(D,J),rdVargaAnalysis(D),rdYogini(D),rdSensitivity(J)].forEach(function(r){
    if(r) out.push(r);
  });
  return {note:"Composed from this site's stated rules — a transparent synthesis, not BPHS "+
      "quotations and not predictions. Each reading names the figures it rests on so the "+
      "reasoning can be checked rather than taken on trust.",
    readings:out};
}
