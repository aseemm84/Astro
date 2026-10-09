/* --- Vimsopaka --- */
function gbVimsopaka(D,J,p){
  var rows="", got=0;
  D.vargas.forEach(function(v){
    var w=VW[v.code]; if(w==null||v.pos[p]==null) return;
    var dg=v.dig[p];
    if(dg==="friend"||dg==="enemy"||dg==="neutral"){
      var lord=LORD[v.pos[p]], pk=D.P[p], pl=D.P[lord];
      if(pk&&pl&&lord!==p){
        var dist=((pl.house-pk.house)%12+12)%12+1;
        var temp=([2,3,4,10,11,12].indexOf(dist)>=0)?"friend":"enemy";
        if(dg==="friend"&&temp==="friend") dg="greatfriend";
        else if(dg==="enemy"&&temp==="enemy") dg="greatenemy";
        else if(dg==="neutral"&&temp==="friend") dg="friend";
        else if(dg==="neutral"&&temp==="enemy") dg="enemy";
        else if(dg!==temp) dg="neutral";
      }
    }
    var f=VF[dg]; if(f==null) return;
    var vv=w*f; got+=vv;
    rows+=gbRow(v.code+" — "+SA[v.pos[p]], gbFmt(vv,3),
      "weight "+w+" × "+esc(dg)+" ("+Math.round(f*20)+"/20)");
  });
  rows+=gbRow("<b>Vimśopaka</b>","<b>"+gbFmt(got,2)+"</b> of 20","sum of the sixteen");
  return gbWrap("Vimśopaka for "+p,"BPHS Ch. 7, vv. 21–25",rows,
    "Each division carries a fixed weight (D1 3.5, D9 3, D60 4, the rest smaller, totalling 20) scaled by the "+
    "Varga Viśva of the dignity there: own 20, great friend 18, friend 15, neutral 10, enemy 7, great enemy 5. "+
    "The relationship used is the compound one.");
}
