/* --- special lagnas as charts --- */
function specialLagnaCharts(D){
  if(!D.specialLagnas||!D.specialLagnas.length) return "";
  var out='<div class="kcharts">';
  D.specialLagnas.forEach(function(s){
    if(s.sign==null) return;
    out+=chartFromSign(D,s.sign,s.name,"rāśi planets from this lagna",s.abbr);
  });
  out+='</div>';
  return '<p class="knote">The computed ascendants rendered as charts, so each can be read house by house in '+
    'the same way as the rāśi chart.</p>'+out;
}
