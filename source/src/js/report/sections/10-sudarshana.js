/* --- Sudarshana Chakra: three concentric wheels (Lagna, Moon, Sun) --- */
function sudarshana(D){
  var cx=210,cy=210,R=[200,158,116,74],rings=[
    {name:"Sūrya",base:D.P.Sun?D.P.Sun.sign:D.LS},
    {name:"Candra",base:D.P.Moon?D.P.Moon.sign:D.LS},
    {name:"Lagna",base:D.LS}];
  var o='<svg viewBox="0 0 420 420" class="kchartsvg" role="img" aria-label="Sudarshana Chakra">';
  o+='<circle cx="210" cy="210" r="200" fill="#fbf8f0" stroke="#1d2340" stroke-width="2"/>';
  [158,116,74].forEach(function(r){o+='<circle cx="210" cy="210" r="'+r+'" fill="none" stroke="#1d2340" stroke-width="1.2"/>';});
  for(var k=0;k<12;k++){var a=(k*30-90)*Math.PI/180;
    o+='<line x1="'+(cx+74*Math.cos(a)).toFixed(1)+'" y1="'+(cy+74*Math.sin(a)).toFixed(1)+
       '" x2="'+(cx+200*Math.cos(a)).toFixed(1)+'" y2="'+(cy+200*Math.sin(a)).toFixed(1)+'" stroke="#1d2340" stroke-width="0.8"/>';}
  rings.forEach(function(ring,ri){
    var rout=R[ri],rin=R[ri+1],rm=(rout+rin)/2;
    for(var h=1;h<=12;h++){
      var sg=(ring.base+h-1)%12, a=((h-1)*30-90+15)*Math.PI/180;
      var occ=D.planets.filter(function(p){return p.sign===sg;}).map(function(p){return GL[p.en];});
      var x=cx+rm*Math.cos(a), y=cy+rm*Math.sin(a);
      o+='<text x="'+x.toFixed(1)+'" y="'+(y-4).toFixed(1)+'" class="sc-h">'+h+'</text>';
      if(occ.length)o+='<text x="'+x.toFixed(1)+'" y="'+(y+8).toFixed(1)+'" class="sc-p">'+occ.join(" ")+'</text>';
    }
  });
  o+='<text x="210" y="214" class="sc-c">ॐ</text></svg>';
  return '<div class="kcharts"><figure class="kchartfig"><figcaption><b>Sudarśana Chakra</b>'+
    '<span>outer Sūrya · middle Candra · inner Lagna</span></figcaption>'+o+'</figure>'+
    '<div class="ksudnote"><p class="knote">Three charts on one wheel: houses counted from the Sun (outer ring), '+
    'from the Moon (middle) and from the Lagna (inner). Reading a house across all three rings at once is the '+
    'classical way to test whether a matter is supported from every reference point — a house strong from the '+
    'Lagna but weak from the Moon and Sun is read as promising less than it appears.</p>'+
    '<p class="klegend">Ring bases — Sūrya: '+SA[rings[0].base]+' · Candra: '+SA[rings[1].base]+
    ' · Lagna: '+SA[rings[2].base]+'.</p></div></div>';
}

