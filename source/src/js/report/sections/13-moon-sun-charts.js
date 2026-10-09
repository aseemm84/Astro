/* ===== Confident-eight batch ===== */
function chartFromSign(D,base,title,sub,extraLabel){
  var occ={};
  D.planets.forEach(function(p){ (occ[p.sign]=occ[p.sign]||[]).push(GL[p.en]+(p.retro?"℞":"")); });
  return northChart(function(h){return (base+h-1)%12;},
    function(h){var sg=(base+h-1)%12,a=(occ[sg]||[]).slice(); if(h===1)a.unshift(extraLabel||"Lg"); return a;},
    title,sub);
}
function moonSunChartSection(D){
  if(!D.P.Moon||!D.P.Sun) return "";
  return '<p class="knote">The same planets read from the Moon and from the Sun. The <b>Chandra kuṇḍalī</b> is '+
    'the standard second reference in Parāśarī practice — a house strong from the lagna but weak from the Moon '+
    'is read as promising less than it appears. The <b>Sūrya kuṇḍalī</b> is used the same way for matters of '+
    'soul, authority and the father.</p><div class="kcharts">'+
    chartFromSign(D,D.LS,"Lagna kuṇḍalī","houses from the ascendant")+
    chartFromSign(D,D.P.Moon.sign,"Chandra kuṇḍalī","houses from the Moon","Mo")+
    chartFromSign(D,D.P.Sun.sign,"Sūrya kuṇḍalī","houses from the Sun","Su")+
    '</div>';
}
