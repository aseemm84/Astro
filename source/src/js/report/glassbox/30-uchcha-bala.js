/* --- Uchcha Bala --- */
function gbUchcha(D,J,p){
  var sb=(J.shadbala&&J.shadbala.planets||[]).filter(function(x){return x.graha===p;})[0];
  if(!sb) return "";
  var lon=D.P[p].sid, dd=GB_DEEP_DEB[p];
  var arc=Math.abs(((lon-dd)%360+360)%360), used=arc>180?360-arc:arc;
  var val=used/3, rows="";
  rows+=gbRow("Planet’s longitude", gbFmt(lon,4)+"°", SA[D.P[p].sign]+" "+gbFmt(D.P[p].deg,4)+"°");
  rows+=gbRow("Deep debilitation point", dd+"°", SA[DEBIL[p]]+" "+GB_EXALT_DEG[p]+"°");
  rows+=gbRow("Arc from that point", gbFmt(arc,4)+"°", arc>180?"exceeds 180°, so subtract from 360°":"under 180°, used as it is");
  if(arc>180) rows+=gbRow("Reduced arc", gbFmt(used,4)+"°","360° − "+gbFmt(arc,4)+"°");
  rows+=gbRow("<b>Uchcha Bala</b>","<b>"+gbFmt(val,2)+"</b> Virupas", gbFmt(used,4)+"° ÷ 3");
  return gbWrap("Uchcha Bala for "+p,"BPHS Ch. 27, v. 1",rows,
    "Zero at the deepest fall, 60 Virupas at the deepest exaltation, sliding linearly between.",
    {ok:Math.abs(val-sb.uchcha)<0.01, detail:gbFmt(val)+" vs "+gbFmt(sb.uchcha)});
}
