/* --- Drik Bala --- */
function gbDrik(D,J,p){
  var sb=(J.shadbala&&J.shadbala.planets||[]).filter(function(x){return x.graha===p;})[0];
  if(!sb) return "";
  var BEN=["Jupiter","Venus","Mercury","Moon"], rows="", net=0;
  ORD.forEach(function(q){
    if(q===p||!D.P[q]) return;
    var d=((D.P[p].sid-D.P[q].sid)%360+360)%360, v=0, extra="";
    if(d>30&&d<=60) v=(d-30)/2;
    else if(d>60&&d<=90) v=(d-60)+15;
    else if(d>90&&d<=120) v=(120-d)/2+30;
    else if(d>120&&d<=150) v=150-d;
    else if(d>150&&d<=180) v=(d-150)*2;
    else if(d>180&&d<300) v=(300-d)/2;
    if(q==="Mars"&&((d>=90&&d<=120)||(d>=210&&d<=240))){v+=15;extra=" +15 (Mars)";}
    if(q==="Jupiter"&&((d>=120&&d<=150)||(d>=240&&d<=270))){v+=30;extra=" +30 (Jupiter)";}
    if(q==="Saturn"&&((d>=60&&d<=90)||(d>=270&&d<=300))){v+=45;extra=" +45 (Saturn)";}
    v=Math.max(0,Math.min(60,v));
    if(!v) return;
    var ben=BEN.indexOf(q)>=0;
    net += (ben? v : -v)/4;
    rows+=gbRow("from "+esc(q)+" ("+(ben?"benefic":"malefic")+")",
      (ben?"+":"−")+gbFmt(v,2), "angle "+gbFmt(d,2)+"°"+extra);
  });
  rows+=gbRow("<b>Dṛk Bala</b>","<b>"+gbFmt(net,2)+"</b> Virupas","(benefic total − malefic total) ÷ 4");
  return gbWrap("Dṛk Bala for "+p,"BPHS Ch. 26 (Sphuṭa Dṛṣṭi)",rows,
    "The aspectual angle is measured <i>from</i> the aspecting planet <i>to</i> this one. Six rules convert that "+
    "angle into Virupas, and Mars, Jupiter and Saturn receive extra allowances over their special ranges.",
    {ok:Math.abs(net-sb.drik)<0.01, detail:gbFmt(net)+" vs "+gbFmt(sb.drik)});
}
