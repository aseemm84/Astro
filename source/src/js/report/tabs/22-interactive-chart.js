/* ================= 7. Interactive chart ================= */
var NPOLY={1:"200,0 300,100 200,200 100,100",2:"0,0 200,0 100,100",3:"0,0 100,100 0,200",4:"0,200 100,100 200,200 100,300",
  5:"0,200 100,300 0,400",6:"0,400 100,300 200,400",7:"100,300 200,200 300,300 200,400",8:"200,400 300,300 400,400",
  9:"400,400 300,300 400,200",10:"200,200 300,100 400,200 300,300",11:"400,200 300,100 400,0",12:"400,0 300,100 200,0"};
function interactiveChart(D,J){
  var LS=D.LS, sb=sbOf(J), sbm={}; if(sb) sb.forEach(function(p){ sbm[p.graha]=p; });
  var tree=buildTree(D)||[], now=D.nowJd;
  var o='<svg viewBox="0 0 400 400" class="kchartsvg kichart" role="group" aria-label="Interactive rāśi chart — select a planet or a house">';
  o+='<rect x="0" y="0" width="400" height="400" fill="#fbf8f0"/>';
  for(var h=1;h<=12;h++) o+='<polygon class="kih" data-kip="h:'+h+'" data-h="'+h+'" points="'+NPOLY[h]+'" tabindex="0" role="button" aria-label="House '+h+'"/>';
  o+='<path d="M0,0 L400,400 M400,0 L0,400 M200,0 L400,200 L200,400 L0,200 Z" fill="none" stroke="#1d2340" stroke-width="1.4" pointer-events="none"/>';
  o+='<rect x="1.25" y="1.25" width="397.5" height="397.5" fill="none" stroke="#1d2340" stroke-width="2.5" pointer-events="none"/>';
  for(var i=0;i<12;i++){ var hh=i+1,x=NPOS[i][0],y=NPOS[i][1],sg=(LS+i)%12;
    o+='<text x="'+x+'" y="'+(y-22)+'" class="hn" pointer-events="none">'+hh+'</text>';
    o+='<text x="'+x+'" y="'+(y-8)+'" class="hs" pointer-events="none">'+SA[sg]+'</text>';
    var occ=D.planets.filter(function(p){ return p.house===hh; }), k=0;
    if(hh===1){ o+='<text x="'+x+'" y="'+(y+8)+'" class="hp kilg" pointer-events="none">Lg</text>'; k=1; }
    occ.forEach(function(p){
      o+='<text x="'+x+'" y="'+(y+8+k*13)+'" class="hp kip" data-kip="p:'+p.en+'" tabindex="0" role="button" aria-label="'+p.en+'">'+
        GL[p.en]+(p.retro?"℞":"")+'</text>'; k++; });
  }
  o+='</svg>';
  var panels='<div class="kipanel" data-panel="none"><b>Select a planet or a house.</b><p>Planets are the two-letter labels. '+
    'The chart then shades where that planet sits (gold), the houses it aspects (blue) and the houses it rules (green); '+
    'a house shows its lord, occupants and the glances it receives.</p></div>';
  D.planets.forEach(function(p){
    var own=D.owns[p.en]||[], asp=aspectsFrom(p.en,p.house), onto=[];
    D.planets.forEach(function(q){ if(q.en!==p.en&&asp.indexOf(q.house)>=0) onto.push(q.en); });
    var by=aspectedBy(D,p.house).filter(function(x){ return x!==p.en; });
    var withp=D.planets.filter(function(q){ return q.en!==p.en&&q.house===p.house; }).map(function(q){ return q.en; });
    var st=[]; if(p.retro&&p.en!=="Rahu"&&p.en!=="Ketu") st.push("retrograde"); if(p.combust) st.push("combust ("+p.sep.toFixed(1)+"° from the Sun)");
    if(p.digbala===p.house) st.push("directional strength"); if(D.vargottama.indexOf(p.en)>=0) st.push("vargottama");
    var md=null; tree.forEach(function(m){ if(m.lord===p.en) md=m; });
    var nextAd=null; tree.forEach(function(m){ (m.ads||[]).forEach(function(a){ if(!nextAd&&a.lord===p.en&&a.end>now) nextAd={md:m.lord,a:a}; }); });
    var t=transitOf(D,p.en);
    var rows=[
      ["Position",SA[p.sign]+' '+dm(p.deg)+' · the '+ord(p.house)+' house · '+chip(p.dig)+' '+esc(DIGW[p.dig])],
      ["Nakṣatra",padaLink(p.nak,p.pada)+' <span class="kmut">lord '+esc(p.naklord)+'</span>'],
      ["Rules",own.length?own.map(function(x){ return 'the '+ord(x)+' <span class="kmut">('+shortSig(x)+')</span>'; }).join("; "):'no sign — a node acts for its dispositor '+esc(LORD[p.sign])],
      ["Aspects","the "+list(asp.map(ord))+(onto.length?' — reaching '+list(onto):'')],
      ["Aspected by",by.length?list(by):"—"],
      ["Sits with",withp.length?list(withp):"—"],
      ["State",st.length?list(st):"—"],
      ["Ṣaḍbala",sbm[p.en]?sbm[p.en].total_rupa.toFixed(2)+' rupa · '+sbm[p.en].ratio.toFixed(2)+'× required':"—"],
      ["Mahādaśā",md?fdate(Math.max(md.start,D.jd))+' → '+fdate(md.end)+(now>=md.start&&now<md.end?' <span class="kdt-tag">current</span>':''):"—"],
      ["Next antardaśā",nextAd?esc(nextAd.md)+' → '+esc(p.en)+': '+fdate(Math.max(nextAd.a.start,now))+' → '+fdate(nextAd.a.end):"—"],
      ["Transiting now",t?SA[ridx(t.rashi)]+' — the '+ord(hFrom(ridx(t.rashi),LS))+' from the lagna'+(t.retrograde&&p.en!=="Rahu"&&p.en!=="Ketu"?', retrograde':''):"—"]
    ];
    panels+='<div class="kipanel" data-panel="p:'+p.en+'" data-at="'+p.house+'" data-asp="'+asp.join(",")+'" data-own="'+own.join(",")+'" hidden>'+
      '<b class="kiph">'+esc(p.en)+' <span class="kmut">'+esc(p.iast)+' — '+esc(PKAR[p.en]||"")+'</span></b>'+
      '<table class="ktbl kkv"><tbody>'+rows.map(function(r){ return '<tr><td class="kk">'+r[0]+'</td><td>'+r[1]+'</td></tr>'; }).join("")+'</tbody></table>'+
      '<div class="kasrc"><a href="grahas.html">Grahas</a> · <a href="dignity.html">Dignity</a> · <a href="aspects.html">Aspects</a></div></div>';
  });
  for(var n=1;n<=12;n++){
    var sg2=(LS+n-1)%12, lord=LORD[sg2], lp=D.P[lord], b=D.bhavas[n-1]||{occ:[],cls:[]};
    var by2=aspectedBy(D,n);
    var rows2=[
      ["Sign",SA[sg2]+' ('+SIGNS[sg2]+')'],
      ["Signifies",esc(HSIG[n])],
      ["Class",b.cls&&b.cls.length?b.cls.join(" · "):"—"],
      ["Lord",lordLine(lord,D)],
      ["Occupants",b.occ.length?list(b.occ):"empty"],
      ["Aspected by",by2.length?list(by2):"—"],
      ["Sarvāṣṭakavarga",b.sav!=null?b.sav+' bindus '+(b.sav>=30?'<span class="kgood">well supported</span>':b.sav<25?'<span class="kbad">under-supported</span>':'<span class="kmut">average</span>'):"—"],
      ["Natural kāraka",HKAR[n]]
    ];
    panels+='<div class="kipanel" data-panel="h:'+n+'" data-at="'+n+'" data-asp="" data-own="'+(lp?lp.house:"")+'" hidden>'+
      '<b class="kiph">The '+ord(n)+' house <span class="kmut">'+esc(BHN[n-1])+'</span></b>'+
      '<table class="ktbl kkv"><tbody>'+rows2.map(function(r){ return '<tr><td class="kk">'+r[0]+'</td><td>'+r[1]+'</td></tr>'; }).join("")+'</tbody></table>'+
      '<p class="klegend">Green marks where the lord sits.</p><div class="kasrc"><a href="bhavas.html">Bhavas</a></div></div>';
  }
  return '<div class="kinteract"><div class="kichartwrap">'+o+
    '<p class="klegend"><span class="kkey kk-at"></span>sits · <span class="kkey kk-asp"></span>aspects · <span class="kkey kk-own"></span>rules / lord sits</p></div>'+
    '<div class="kipanels" aria-live="polite">'+panels+'</div></div>';
}
var BHN=["Tanu","Dhana","Sahaja","Bandhu","Putra","Ripu","Kalatra","Āyu","Bhāgya / Dharma","Karma","Lābha","Vyaya / Mokṣa"];

