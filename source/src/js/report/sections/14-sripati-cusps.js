/* --- Sripati (Porphyry) cusps + bhava spashta --- */
function sripatiSection(D){
  var i=D.input, jd=D.jd;
  var asc=D.lagna.sidereal_deg, mc=D.mcSid;
  if(mc==null) return "";
  function arc(a,b){ return ((b-a)%360+360)%360; }
  var mad=new Array(13);
  mad[1]=asc; mad[10]=mc; mad[7]=(asc+180)%360; mad[4]=(mc+180)%360;
  var q1=arc(mc,asc)/3;                 // MC -> Asc  gives 11, 12
  mad[11]=(mc+q1)%360; mad[12]=(mc+2*q1)%360;
  var q2=arc(asc,mad[4])/3;             // Asc -> IC  gives 2, 3
  mad[2]=(asc+q2)%360; mad[3]=(asc+2*q2)%360;
  mad[5]=(mad[11]+180)%360; mad[6]=(mad[12]+180)%360;
  mad[7]=(mad[1]+180)%360; mad[8]=(mad[2]+180)%360; mad[9]=(mad[3]+180)%360;
  // sandhi = midpoint between consecutive madhyas
  var sandhi=new Array(13);
  for(var h2=1;h2<=12;h2++){
    var nxt=mad[h2===12?1:h2+1];
    sandhi[h2]=(mad[h2]+arc(mad[h2],nxt)/2)%360;
  }
  function houseOfSripati(lon){
    for(var h=1;h<=12;h++){
      var lo=sandhi[h===1?12:h-1], hi=sandhi[h];
      if(arc(lo,lon)<arc(lo,hi)) return h;
    }
    return 1;
  }
  var rows=[];
  for(var h3=1;h3<=12;h3++){
    var m=mad[h3], sg=Math.floor(m/30)%12;
    var occ=D.planets.filter(function(p){return houseOfSripati(p.sid)===h3;}).map(function(p){return p.en;});
    rows.push('<tr><td><b>'+h3+'</b></td><td>'+SA[sg]+' '+dm(m%30)+'</td>'+
      '<td class="knum">'+m.toFixed(3)+'°</td>'+
      '<td>'+SA[Math.floor(sandhi[h3]/30)%12]+' '+dm(sandhi[h3]%30)+'</td>'+
      '<td>'+(occ.join(", ")||"—")+'</td></tr>');
  }
  var moved=D.planets.filter(function(p){return houseOfSripati(p.sid)!==p.house;});
  var occS={};
  D.planets.forEach(function(p){ var h=houseOfSripati(p.sid); (occS[h]=occS[h]||[]).push(GL[p.en]+(p.retro?"℞":"")); });
  var chart=northChart(function(h){return (D.LS+h-1)%12;},
    function(h){var a=(occS[h]||[]).slice(); if(h===1)a.unshift("Lg"); return a;},
    "Bhāva (Sripati)","cusps by the Porphyry trisection");
  return '<p class="knote">Sripati (Porphyry) houses trisect each quadrant between the ascendant and the '+
    'meridian, so the houses are unequal. The <b>bhāva madhya</b> is the midpoint of the house and the '+
    '<b>bhāva sandhi</b> its boundary; a planet belongs to the house whose madhya it lies nearest. This is the '+
    'third house convention alongside whole-sign and the equal-cusp chalit shown above.</p>'+
    '<div class="kcharts">'+chart+'<div class="ksudnote">'+
    tbl(["Bhāva","Madhya (midpoint)","Longitude","Sandhi (end)","Occupants"],rows)+'</div></div>'+
    '<p class="klegend">MC (10th madhya) '+SA[Math.floor(mc/30)%12]+' '+dm(mc%30)+
    '. '+(moved.length?moved.length+' planet'+(moved.length>1?'s':'')+' sit in a different house than whole-sign: '+
      moved.map(function(p){return p.en;}).join(", ")+'.':'No planet changes house versus whole-sign.')+'</p>';
}
