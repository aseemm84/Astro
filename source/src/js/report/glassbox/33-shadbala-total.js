/* --- Shadbala total --- */
function gbTotal(D,J,p){
  var sb=(J.shadbala&&J.shadbala.planets||[]).filter(function(x){return x.graha===p;})[0];
  if(!sb) return "";
  var parts=[["Sthāna (positional)",sb.sthana],["Dig (directional)",sb.dig],["Kāla (temporal)",sb.kala],
             ["Cheṣṭā (motional)",sb.cheshta],["Naisargika (natural)",sb.naisargika],["Dṛk (aspectual)",sb.drik]];
  var rows="", sum=0;
  parts.forEach(function(x){ sum+=x[1]; rows+=gbRow(x[0], gbFmt(x[1],2), ""); });
  rows+=gbRow("<b>Total</b>","<b>"+gbFmt(sum,2)+"</b> Virupas","sum of the six");
  rows+=gbRow("In rupas", gbFmt(sum/60,3), "60 Virupas = 1 rupa");
  rows+=gbRow("Required of "+p, gbFmt(sb.required_rupa,1)+" rupas","BPHS Ch. 27, vv. 32–33");
  rows+=gbRow("<b>Ratio</b>","<b>"+gbFmt(sb.ratio,2)+"</b>", sb.ratio>=1?"meets the requirement":"below the requirement");
  return gbWrap("Ṣaḍbala total for "+p,"BPHS Ch. 27",rows,
    "Each component has its own derivation — the ones instrumented here are Uchcha, Saptavargaja and Dṛk; "+
    "click those in the sub-component table.",
    {ok:Math.abs(sum-sb.total_virupa)<0.01, detail:gbFmt(sum)+" vs "+gbFmt(sb.total_virupa)});
}
