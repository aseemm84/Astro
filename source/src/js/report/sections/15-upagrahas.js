/* --- Dhumadi upagrahas (fixed offsets from the Sun) --- */
function dhumadiSection(D){
  if(!D.P.Sun) return "";
  var s=D.P.Sun.sid;
  var dhuma=((s+133+20/60)%360+360)%360;
  var vyat=((360-dhuma)%360+360)%360;
  var pari=((vyat+180)%360+360)%360;
  var indra=((360-pari)%360+360)%360;
  var upak=((indra+16+40/60)%360+360)%360;
  var list=[["Dhūma","Sun + 133°20′",dhuma],["Vyatīpāta","360° − Dhūma",vyat],
            ["Parivesha","Vyatīpāta + 180°",pari],["Indracāpa","360° − Parivesha",indra],
            ["Upaketu","Indracāpa + 16°40′",upak]];
  var rows=list.map(function(x){
    var sg=Math.floor(x[2]/30)%12, h=((sg-D.LS)%12+12)%12+1, nk=nakOf(x[2]);
    return '<tr><td><b>'+esc(x[0])+'</b></td><td class="kmut">'+esc(x[1])+'</td>'+
      '<td>'+SA[sg]+' '+dm(x[2]%30)+'</td><td class="knum">'+h+'</td>'+
      '<td>'+padaLink(nk.name,nk.pada)+'</td></tr>';
  });
  var occ={};
  list.forEach(function(x){ var sg=Math.floor(x[2]/30)%12; (occ[sg]=occ[sg]||[]).push(x[0].slice(0,2)); });
  var chart=northChart(function(h){return (D.LS+h-1)%12;},
    function(h){var sg=(D.LS+h-1)%12,a=(occ[sg]||[]).slice(); if(h===1)a.unshift("Lg"); return a;},
    "Dhūmādi upagrahas","the five Sun-derived points");
  return '<p class="knote">The <b>Dhūmādi</b> group is derived from the Sun by fixed offsets, so each is a '+
    'calculable point rather than a body. They are read as sensitive spots: a planet or house they fall on takes '+
    'on their shadowy character. Upaketu plus 30° returns to the Sun, which is the arithmetic check.</p>'+
    '<div class="kcharts">'+chart+'<div class="ksudnote">'+
    tbl(["Upagraha","Derivation","Position","House","Nakṣatra"],rows)+'</div></div>';
}
