/* --- Saptavargaja --- */
function gbSapta(D,J,p){
  var sb=(J.shadbala&&J.shadbala.planets||[]).filter(function(x){return x.graha===p;})[0];
  if(!sb) return "";
  function natRel(a,bb){
    if(FR[a]&&FR[a].indexOf(bb)>=0) return "friend";
    if(EM[a]&&EM[a].indexOf(bb)>=0) return "enemy";
    return "neutral";
  }
  var rows="", tot=0, pk=D.P[p];
  GB_SEVEN.forEach(function(code){
    var v=null; D.vargas.forEach(function(x){ if(x.code===code) v=x; });
    if(!v||v.pos[p]==null) return;
    var sg=v.pos[p], lord=LORD[sg], val, how;
    if(sg===EXALT[p]){ val=45; how="exaltation sign"; }
    else if(lord===p||OWN[p].indexOf(sg)>=0){ val=30; how="own sign"; }
    else {
      var nat=natRel(p,lord), pl=D.P[lord], temp="enemy";
      if(pk&&pl){ var dist=((pl.house-pk.house)%12+12)%12+1;
        temp=([2,3,4,10,11,12].indexOf(dist)>=0)?"friend":"enemy"; }
      var comp;
      if(nat==="friend"&&temp==="friend") comp="greatfriend";
      else if(nat==="enemy"&&temp==="enemy") comp="greatenemy";
      else if(nat==="neutral"&&temp==="friend") comp="friend";
      else if(nat==="neutral"&&temp==="enemy") comp="enemy";
      else if(nat===temp) comp=nat; else comp="neutral";
      val=GB_SAPTA_VAL[comp];
      how="naturally "+nat+", temporally "+temp+" → "+comp;
    }
    tot+=val;
    rows+=gbRow(code+" — "+SA[sg]+" <span class=\"kmut\">(lord "+esc(lord)+")</span>",
                val+" Virupas", how);
  });
  rows+=gbRow("<b>Saptavargaja Bala</b>","<b>"+gbFmt(tot,2)+"</b> Virupas","sum of the seven");
  return gbWrap("Saptavargaja Bala for "+p,"BPHS Ch. 27, vv. 2–4",rows,
    "Moolatrikona 45, own 30, extreme friend 20, friend 15, neutral 10, enemy 4, extreme enemy 2 — scored in "+
    "the rāśi, horā, drekkāṇa, saptāṃśa, navāṃśa, dvādaśāṃśa and triṃśāṃśa. &lsquo;Extreme&rsquo; friendship is "+
    "the compound relationship: the natural verdict combined with the temporal one.",
    {ok:Math.abs(tot-sb.saptavargaja)<0.01, detail:gbFmt(tot)+" vs "+gbFmt(sb.saptavargaja)});
}
