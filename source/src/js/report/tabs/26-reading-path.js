/* ================= 9. Reading path ================= */
function pathPane(D,J){
  var LS=D.LS, ll=LORD[LS], lp=D.P[ll], mo=D.P.Moon, steps=[];
  function step(title,method,here,tryit,learn,see){
    steps.push({t:title,b:'<div class="kstep-cols"><div><h5>The method</h5><p>'+method+'</p></div><div><h5>In this chart</h5><p>'+here+'</p></div></div>'+
      '<div class="kstep-try"><b>Try this</b> '+tryit+'</div><div class="kasrc">'+learn.map(pageLink).join(" ")+' '+see+'</div>'});
  }
  var in1=D.planets.filter(function(p){ return p.house===1; }).map(function(p){ return p.en; });
  var asp1=aspectedBy(D,1);
  step("The lagna","The lagna — the sign rising in the east at birth — becomes the 1st house. It fixes which house every planet "+
    "falls in and which houses each planet rules, so every later step is counted from here.",
    '<b>'+SA[LS]+'</b> ('+SIGNS[LS]+') rises at '+dm(D.lagDeg)+', in '+padaLink(D.lagNak.name,D.lagNak.pada)+'. '+
    (in1.length?'In the 1st: '+list(in1)+'. ':'The 1st is empty. ')+(asp1.length?'Aspecting it: '+list(asp1)+'.':'No planet aspects it.'),
    "Find the top diamond of the chart on the Overview tab and click it. Which planets touch the 1st? They colour the whole temperament.",
    ["lagna","bhava"],secLink("The chart"));
  step("The lagna lord","The ruler of the rising sign is the chart's pilot. The house it occupies shows where the person's energy "+
    "habitually goes; its dignity shows how comfortably it gets there.",
    lordLine(ll,D)+'. '+(lp?'So the self is tied to the '+ord(lp.house)+' — '+HSIG[lp.house]+'. It stands on '+DIGM[lp.dig]+'.':''),
    "Read the significations of the house the lagna lord occupies. Which of them are recurring themes in the person's life?",
    ["dignity","bhava"],secLink("Grahas"));
  var kem=D.yogas.filter(function(y){ return y.key==="Kemadruma"; })[0];
  step("The Moon","The Moon is the mind and the body's rhythms, and in Jyotiṣa it is almost a second lagna: transits and daśās are "+
    "read from it. Its sign, nakṣatra, brightness and company matter most.",
    mo?'Moon in <b>'+SA[mo.sign]+'</b>, '+padaLink(mo.nak,mo.pada)+', the '+ord(mo.house)+' house, '+DIGW[mo.dig]+'; '+
      (isWaxing(D)?'waxing, which BPHS counts as benefic':'waning, which BPHS counts as weaker')+'. '+
      (aspectedBy(D,mo.house).length?'Aspected by '+list(aspectedBy(D,mo.house).filter(function(x){return x!=="Moon";}))+'. ':'')+
      (kem?(kem.present?'Kemadruma is formed — the Moon stands alone.':'Kemadruma is not formed — '+esc(kem.detail)+'.'):''):'—',
    "Compare the chart from the Moon (Chandra kuṇḍalī) with the lagna chart. Do the same houses stand out in both?",
    ["graha","sp"],secLink("Chandra & Sūrya kuṇḍalī"));
  var sb=sbOf(J);
  step("Strength","Before judging what a planet promises, judge whether it can deliver. Ṣaḍbala measures six kinds of strength "+
    "against a classical minimum; dignity and vargottama add quality.",
    (sb?'Above their minimum: '+list(sb.filter(function(p){return p.ratio>=1;}).map(function(p){ return p.graha+' ('+p.ratio.toFixed(2)+')'; }))+'. '+
      (sb.filter(function(p){return p.ratio<1;}).length?'Below: '+list(sb.filter(function(p){return p.ratio<1;}).map(function(p){ return p.graha+' ('+p.ratio.toFixed(2)+')'; }))+'. ':''):'')+
    (D.vargottama.length?'Vargottama: '+list(D.vargottama)+'.':'No planet is vargottama.'),
    "Take the strongest planet and list the houses it rules. Those matters have the most dependable support in this chart.",
    ["strength","dignity"],secLink("Ṣaḍbala"));
  var pres=D.yogas.filter(function(y){ return y.present; });
  step("Yogas","A yoga is a named combination of lords and houses. It is a promise that needs strength to be real and a daśā of one of its "+
    "planets to be delivered.",
    pres.length?pres.map(function(y){ return '<b>'+esc(y.iast||y.key)+'</b>: '+esc(y.detail); }).join('<br>'):'No catalogued yoga forms here — which is common and says nothing bad on its own.',
    "For each yoga formed, find the daśā periods of the planets that make it on the Life timeline tab. That is when tradition expects it to show.",
    ["yoga","dasha"],secLink("Yogas"));
  var LV=levelsAt(D,D.nowJd);
  step("The running daśā","The Vimśottarī daśā says which planet's agenda is live. A lord gives the results of the houses it rules and "+
    "occupies, filtered by its strength; the antardaśā lord adds its own colour.",
    LV&&LV[1]?lordLine(LV[0].lord,D)+' runs the mahādaśā to '+fmy(LV[0].end)+'; '+lordLine(LV[1].lord,D)+' the antardaśā to '+fmy(LV[1].end)+'.':'—',
    "Look back at the last antardaśā change. Did the themes of the new lord's houses come forward? Log it on the Life events tab.",
    ["dasha","bhava"],secLink("Vimśottarī daśā"));
  var sat=transitOf(D,"Saturn"), jup=transitOf(D,"Jupiter");
  step("Transits","Transits (gochara) trigger what the daśā has made ready. Slow planets matter most; they are read from the natal Moon "+
    "and weighed by ashtakavarga bindus.",
    sat&&jup&&mo?'Saturn transits the '+ord(hFrom(ridx(sat.rashi),mo.sign))+' from the Moon ('+(D.av?D.av.sarva[ridx(sat.rashi)]+' bindus':'')+'), '+
      'Jupiter the '+ord(hFrom(ridx(jup.rashi),mo.sign))+' ('+(D.av?D.av.sarva[ridx(jup.rashi)]+' bindus':'')+').'+
      (D.sade&&D.sade.active?' A Sade Sati or dhaiyā phase is running.':''):'—',
    "Open the Now tab. Is the running daśā lord also being transited by Saturn or Jupiter? That overlap is where tradition looks first.",
    ["av","aspect"],secLink("Gochara"));
  var nav='<div class="kpath-nav" role="tablist">'+steps.map(function(s,i){
    return '<button type="button" data-kstep-go="'+(i+1)+'"'+(i===0?' class="on"':'')+'><span>'+(i+1)+'</span>'+esc(s.t)+'</button>'; }).join("")+'</div>';
  var body=steps.map(function(s,i){ return '<div class="kstep" data-kstep="'+(i+1)+'"'+(i?' hidden':'')+'><h4 class="ksub">Step '+(i+1)+' of '+steps.length+' — '+esc(s.t)+'</h4>'+s.b+'</div>'; }).join("");
  return '<p class="knote">A first reading, in the order a teacher would take it. Each step pairs the method (from this site\'s reference '+
    'pages) with what it finds in this chart.</p><div class="kpath">'+nav+body+
    '<div class="kpath-foot"><button type="button" class="k-btn sec" data-kstep-go="prev" disabled>← Previous</button>'+
    '<button type="button" class="k-btn" data-kstep-go="next">Next step →</button></div></div>';
}

