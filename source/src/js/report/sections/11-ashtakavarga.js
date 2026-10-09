/* --- Ashtakavarga as charts + Vimsopaka-style divisional index --- */
function avCharts(D){
  if(!D.av||!D.av.bhinna)return "";
  var g='<div class="kvgrid">';
  D.av.bhinna.forEach(function(b){
    g+=northChart(function(h){return (D.LS+h-1)%12;},
      function(h){return [String(b.bindus[(D.LS+h-1)%12])];},
      b.graha+" — BAV", "total "+b.total);
  });
  g+=northChart(function(h){return (D.LS+h-1)%12;},
    function(h){return [String(D.av.sarva[(D.LS+h-1)%12])];},"Sarvāṣṭakavarga","total "+D.av.sarva_total);
  g+='</div>';
  return '<p class="knote">Each planet\'s bindus placed house by house, and the combined SAV. In a Bhinnāṣṭakavarga '+
    'chart, 4 or more bindus in a house is the usual threshold for that planet to do well there — especially under '+
    'transit.</p>'+g;
}
var VW={D1:3.5,D2:1,D3:1,D4:0.5,D7:0.5,D9:3,D10:0.5,D12:0.5,D16:2,D20:0.5,D24:0.5,D27:0.5,D30:1,D40:0.5,D45:0.5,D60:4};
/* Varga Viśva, BPHS Ch.7 v.25: own 20, great friend 18, friend 15, neutral 10,
   enemy 7, great enemy 5 — out of 20. Exaltation and Moolatrikona count as own. */
var VF={exalted:1,moolatrikona:1,own:1,greatfriend:0.9,friend:0.75,neutral:0.5,
        enemy:0.35,greatenemy:0.25,debilitated:0.25,node:null};
function vimsopaka(D){
  var rows=ORD.slice(0,7).map(function(k){
    var got=0,max=0;
    D.vargas.forEach(function(v){var w=VW[v.code];if(w==null||v.pos[k]==null)return;
      max+=w;
      var dg=v.dig[k];
      // BPHS specifies the compound (panchadha) relationship, so upgrade the plain
      // friend/enemy verdict using the temporal relation with that varga's lord
      if(dg==="friend"||dg==="enemy"||dg==="neutral"){
        var lord=LORD[v.pos[k]], pk=D.P[k], pl=D.P[lord];
        if(pk&&pl&&lord!==k){
          var dist=((pl.house-pk.house)%12+12)%12+1;
          var temp=([2,3,4,10,11,12].indexOf(dist)>=0)?"friend":"enemy";
          if(dg==="friend"&&temp==="friend") dg="greatfriend";
          else if(dg==="enemy"&&temp==="enemy") dg="greatenemy";
          else if(dg==="neutral"&&temp==="friend") dg="friend";
          else if(dg==="neutral"&&temp==="enemy") dg="enemy";
          else if(dg!==temp) dg="neutral";
        }
      }
      var f=VF[dg];if(f!=null)got+=w*f;});
    var pct=max?got/max*100:0;
    var score=got;   // out of 20
    var grade=score>15?"wholly favourable":score>10?"mediocre":score>5?"some good effects":"not capable of good";
    return {k:k,got:got,pct:pct,grade:grade};
  }).sort(function(a,b){return b.pct-a.pct;});
  var body=tbl(["Graha","Vimśopaka (of 20)","%","Grade",""],rows.map(function(r){
    return '<tr><td><b>'+esc(r.k)+'</b></td><td class="knum">'+r.got.toFixed(2)+'</td>'+
      '<td class="knum">'+r.pct.toFixed(0)+'%</td><td>'+esc(r.grade)+'</td>'+
      '<td><div class="kpbar" style="width:130px"><span style="width:'+r.pct.toFixed(0)+'%"></span></div></td></tr>';}));
  return '<p class="knote">A Vimśopaka-style index: each of the sixteen divisions carries its classical weight '+
    '(D1 3.5, D9 3, D60 4, and so on, summing to 20 — BPHS Ch.&nbsp;7, vv.&nbsp;21–25), scaled by the '+
    '<b>Varga Viśva</b> of the planet\'s dignity there: own 20, great friend 18, friend 15, neutral 10, enemy 7, '+
    'great enemy 5, out of 20 (v.&nbsp;25). The grade follows vv.&nbsp;26–27: above 15 wholly favourable, '+
    '10–15 mediocre, 5–10 some good effects, below 5 not capable of good.</p>'+body+
    '<div class="kbox">Both the division weights and the Varga Viśva values are taken from BPHS Ch.&nbsp;7 as '+
    'cited above, so this is the canonical Vimśopaka rather than an approximation. The sage specifies the '+
    '<i>compound</i> (pañchadhā) relationship for the dignity; nodes are excluded, having no sign dignity.</div>';
}


function subPeriods(lord,start,totalYears){
  var out=[],s=start,i0=VSEQ.indexOf(lord);
  for(var i=0;i<9;i++){var l=VSEQ[(i0+i)%9],y=totalYears*VY[l]/120;
    out.push({lord:l,start:s,end:s+y*DPY,years:y}); s+=y*DPY;}
  return out;
}
function clipTo(list,from){
  return list.filter(function(p){return p.end>from;}).map(function(p){
    return {lord:p.lord,start:Math.max(p.start,from),end:p.end,years:p.years,partial:p.start<from,pds:p.pds};});
}
function buildTree(D){
  if(!D.mds||!D.birthNak)return null;
  var birth=D.mds[0].start, lb=D.birthNak.lord;
  var t0=birth-(VY[lb]-D.birthNak.balance)*DPY;      // theoretical start of the first mahadasha
  var tree=[],s=t0,i0=VSEQ.indexOf(lb);
  for(var k=0;k<9;k++){
    var lord=VSEQ[(i0+k)%9],yrs=VY[lord];
    var md={lord:lord,start:s,end:s+yrs*DPY,years:yrs};
    var ads=subPeriods(lord,md.start,yrs);
    ads.forEach(function(ad){ad.pds=clipTo(subPeriods(ad.lord,ad.start,ad.years),birth);});
    md.ads=clipTo(ads,birth);
    md.partial=md.start<birth; md.dispStart=Math.max(md.start,birth);
    tree.push(md); s=md.end;
  }
  return tree;
}
function ymd(years){
  var d=Math.round(years*365.2564);
  if(d<31)return d+"d";
  var y=Math.floor(years),m=Math.floor((years-y)*12),dd=Math.round((((years-y)*12)-m)*30.44);
  if(dd>=30){dd=0;m++;} if(m>=12){m=0;y++;}
  return ((y?y+"y ":"")+(m?m+"m ":"")+(dd?dd+"d":"")).trim();
}
function inPer(s,e,now){return now>=s&&now<e;}
function dashaTreeSection(D){
  var tree=buildTree(D); if(!tree)return "";
  var now=D.nowJd,h='';
  h+='<div class="kdt-bar"><button type="button" class="k-btn sec" data-kdt="open">Expand all</button>'+
     '<button type="button" class="k-btn sec" data-kdt="close">Collapse all</button>'+
     '<button type="button" class="k-btn sec" data-kdt="now">Show current period</button></div>';
  tree.forEach(function(md){
    var cur=inPer(md.dispStart,md.end,now);
    h+='<details class="kdt-md'+(cur?' kdt-cur':'')+'"'+(cur?' open':'')+'><summary>'+
      '<b>'+esc(md.lord)+'</b>&nbsp;mahādaśā<span class="kdt-d">'+fdate(md.dispStart)+' → '+fdate(md.end)+
      '</span><span class="kdt-y">'+(md.partial?ymd((md.end-md.dispStart)/DPY)+" (balance)":md.years+"y")+'</span>'+
      (cur?'<span class="kdt-tag">current</span>':'')+'</summary><div class="kdt-body">';
    md.ads.forEach(function(ad){
      var ac=inPer(ad.start,ad.end,now);
      h+='<details class="kdt-ad'+(ac?' kdt-cur':'')+'"'+(ac?' open':'')+'><summary>'+
        esc(md.lord)+' → <b>'+esc(ad.lord)+'</b><span class="kdt-d">'+fdate(ad.start)+' → '+fdate(ad.end)+
        '</span><span class="kdt-y">'+ymd((ad.end-ad.start)/DPY)+(ad.partial?" (part)":"")+'</span>'+
        (ac?'<span class="kdt-tag">current</span>':'')+'</summary>'+
        '<div class="ktwrap"><table class="ktbl kdt-pd"><thead><tr><th>Pratyantardaśā</th><th>From</th><th>To</th><th>Length</th></tr></thead><tbody>';
      ad.pds.forEach(function(pd){
        var pc=inPer(pd.start,pd.end,now);
        h+='<tr'+(pc?' class="khl"':'')+'><td>'+esc(md.lord)+' → '+esc(ad.lord)+' → <b>'+esc(pd.lord)+'</b>'+
          (pc?' ← now':'')+'</td><td>'+fdate(pd.start)+'</td><td>'+fdate(pd.end)+'</td>'+
          '<td class="knum">'+ymd((pd.end-pd.start)/DPY)+(pd.partial?" (part)":"")+'</td></tr>';
      });
      h+='</tbody></table></div></details>';
    });
    h+='</div></details>';
  });
  return '<p class="knote">The full 120-year cycle: each mahādaśā opens into its nine antardaśās, and each '+
    'antardaśā into its nine pratyantardaśās — 729 periods in all. Every level uses the same proportion: a '+
    'sub-period lasts (parent length × sub-lord years ÷ 120), beginning with the parent\'s own lord and following '+
    'the Vimśottarī order. The first mahādaśā is only a balance, so its sub-periods are laid out from its '+
    'theoretical start before birth; those already over at birth are dropped, and one straddling the birth moment '+
    'is marked "part".</p>'+h+
    '<p class="klegend">Dates are local to the birth place. Printing includes only the periods you have expanded.</p>';
}


/* running levels at an instant, standard method: natural sub-period lengths from the theoretical MD start */
function levelsAt(D,jd){
  var tree=buildTree(D); if(!tree)return null;
  var md=null; tree.forEach(function(m){ if(jd>=m.start&&jd<m.end) md=m; });
  if(!md) return null;
  var out=[{lvl:"Mahādaśā",lord:md.lord,start:md.dispStart,end:md.end}];
  var parent={lord:md.lord,start:md.start,years:md.years};
  ["Antardaśā","Pratyantar","Sūkṣma","Prāṇa"].forEach(function(name){
    if(!parent)return;
    var kids=subPeriods(parent.lord,parent.start,parent.years), hit=null;
    kids.forEach(function(k){ if(jd>=k.start&&jd<k.end) hit=k; });
    if(hit){ out.push({lvl:name,lord:hit.lord,start:hit.start,end:hit.end}); parent=hit; } else parent=null;
  });
  return out;
}
function shadbalaSection(D,J){
  var sb=J&&J.shadbala; if(!sb||sb.error||!sb.planets) return "";
  var c=sb.context||{};
  var rows=sb.planets.map(function(p){
    var col=p.ratio>=1?"#1c6b46":(p.ratio>=0.85?"#b08a2e":"#a1493a");
    return '<tr><td><b>'+esc(p.graha)+'</b></td>'+
      '<td class="knum">'+p.sthana.toFixed(1)+'</td><td class="knum">'+p.dig.toFixed(1)+'</td>'+
      '<td class="knum">'+p.kala.toFixed(1)+'</td><td class="knum">'+p.cheshta.toFixed(1)+'</td>'+
      '<td class="knum">'+p.naisargika.toFixed(1)+'</td><td class="knum">'+gbButton("drik",p.graha,p.drik.toFixed(1),"Show every aspect and its Virupa value")+'</td>'+
      '<td class="knum">'+gbButton("total",p.graha,'<b>'+p.total_virupa.toFixed(0)+'</b>',"Show the six components")+'</td>'+
      '<td class="knum"><b>'+p.total_rupa.toFixed(2)+'</b></td>'+
      '<td class="knum">'+p.required_rupa.toFixed(1)+'</td>'+
      '<td class="knum" style="color:'+col+';font-weight:700">'+p.ratio.toFixed(2)+'</td>'+
      '<td><div class="kpbar" style="width:90px"><span style="width:'+
        Math.max(2,Math.min(100,p.ratio/1.8*100)).toFixed(0)+'%"></span></div></td></tr>';
  });
  var sub=sb.planets.map(function(p){
    return '<tr><td><b>'+esc(p.graha)+'</b></td>'+
      ['uchcha','saptavargaja','ojha','kendradi','drekkana'].map(function(k){
        var v=p[k].toFixed(1);
        if(k==='uchcha') v=gbButton('uchcha',p.graha,v,'Show the Uchcha Bala arithmetic');
        if(k==='saptavargaja') v=gbButton('sapta',p.graha,v,'Show the seven divisions scored');
        return '<td class="knum">'+v+'</td>';}).join('')+
      ['nathonnatha','paksha','tribhaga','lord_bala','ayana'].map(function(k){
        return '<td class="knum">'+p[k].toFixed(1)+'</td>';}).join('')+'</tr>';
  });
  return '<p class="knote">Strength in <b>virupas</b> (60 virupas = 1 rupa). Each planet is scored on six '+
    'sources, summed, and compared with the minimum rupas classically required of it — the ratio column is '+
    'total ÷ required, so 1.00 means the planet exactly meets its requirement.</p>'+
    tbl(["Graha","Sthāna","Dig","Kāla","Cheṣṭā","Naisargika","Dṛk","Total (v)","Rupa","Required","Ratio",""],rows)+
    '<h4 class="ksub">Sub-components</h4>'+
    '<p class="knote">Sthāna Bala breaks into five parts and Kāla Bala into five more.</p>'+
    tbl(["Graha","Uchcha","Saptavargaja","Ojha","Kendrādi","Drekkāṇa",
         "Nathonnatha","Pakṣa","Tribhāga","Lord-of-period","Ayana"],sub)+
    '<p class="klegend">Birth was by '+(c.day_birth?"day":"night")+
    ' · hora lord '+esc(c.hora_lord||"—")+' · weekday lord '+esc(c.weekday_lord||"—")+
    ' · month lord '+esc(c.masa_lord||"—")+' · year lord '+esc(c.varsha_lord||"—")+
    ' · pakṣa arc '+(c.paksha_arc!=null?c.paksha_arc.toFixed(1)+"°":"—")+'.</p>'+
    '<div class="kbox"><b>How exact this is</b>Sthāna, Dig, Cheṣṭā, Naisargika and Dṛk Bala all follow the '+
    'classical definitions directly. Cheṣṭā is measured from each planet\'s arc to its śīghrocca, which needs the '+
    'daily speeds. <b>Dṛk Bala</b> uses the exact Sphuṭa Dṛṣṭi formula of BPHS Ch.&nbsp;26 — the six angular '+
    'rules with the extra allowances for Mars, Jupiter and Saturn — not a whole-sign approximation. The '+
    'required-rupa minimums are BPHS Ch.&nbsp;27, vv.&nbsp;32–33 verbatim. One part remains simplified: '+
    '<b>Nathonnatha</b> is measured from clock noon rather than local apparent noon.</div>';
}

function padaLink(nakName,pada){
  if(!nakName) return "—";
  return '<a href="108-nakshatra-padas.html#q='+encodeURIComponent(nakName)+'">'+esc(nakName)+
         (pada?' · '+pada:'')+'</a>';
}

var TRIKONA_SETS=[[0,4,8],[1,5,9],[2,6,10],[3,7,11]];
var EKA_PAIRS=[[0,7],[1,6],[2,5],[8,11],[9,10]];          // Mars, Venus, Mercury, Jupiter, Saturn (Cancer/Leo excluded)
var RASIMANA=[7,10,8,4,10,5,7,8,9,5,11,12];
var GRAHAMANA={Sun:5,Moon:5,Mars:8,Mercury:5,Jupiter:10,Venus:7,Saturn:5};
function trikonaShodhana(b){
  var r=b.slice();
  TRIKONA_SETS.forEach(function(set){
    var vals=set.map(function(s){return r[s];}), mn=Math.min.apply(null,vals);
    if(mn===0) return;                                   // a zero in the trine blocks reduction
    set.forEach(function(s){ r[s]-=mn; });
  });
  return r;
}
function ekadhipatyaShodhana(r,occupied){
  var o=r.slice();
  EKA_PAIRS.forEach(function(pr){
    var a=pr[0],c=pr[1], oa=occupied[a], oc=occupied[c];
    if(oa&&oc) return;                                   // both occupied — no reduction
    if(!oa&&!oc){
      if(o[a]===o[c]){ o[a]=0; o[c]=0; }
      else { var m=Math.min(o[a],o[c]); o[a]=m; o[c]=m; }
      return;
    }
    var vac=oa?c:a, occ=oa?a:c;                          // exactly one is occupied
    if(o[vac]>o[occ]) o[vac]=o[occ];
    else if(o[vac]===o[occ]) o[vac]=0;
  });
  return o;
}
function pindaOf(rect,signOf,graha){
  var rasiPinda=0;
  for(var s=0;s<12;s++) rasiPinda+=rect[s]*RASIMANA[s];
  var grahaPinda=0;
  Object.keys(GRAHAMANA).forEach(function(p){
    if(signOf[p]==null) return;
    grahaPinda+=rect[signOf[p]]*GRAHAMANA[p];
  });
  return {rasi:rasiPinda,graha:grahaPinda,total:rasiPinda+grahaPinda};
}
function shodhanaAll(av,signOf){
  var occupied=new Array(12).fill(false);
  Object.keys(GRAHAMANA).forEach(function(p){ if(signOf[p]!=null) occupied[signOf[p]]=true; });
  return av.bhinna.map(function(b){
    var t=trikonaShodhana(b.bindus), e=ekadhipatyaShodhana(t,occupied);
    return {graha:b.graha, original:b.bindus, trikona:t, ekadhipatya:e,
            pinda:pindaOf(e,signOf,b.graha),
            total_orig:b.bindus.reduce(function(x,y){return x+y;},0),
            total_rect:e.reduce(function(x,y){return x+y;},0)};
  });
}
