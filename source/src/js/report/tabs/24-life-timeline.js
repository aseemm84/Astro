/* ================= 3. Life timeline ================= */
var LCOL={Ketu:"#8a6a5c",Venus:"#b58fb0",Sun:"#c08a3e",Moon:"#8fa9c4",Mars:"#a1493a",Rahu:"#6a5a86",Jupiter:"#1c6b46",Saturn:"#4a5064",Mercury:"#2b7a6f"};
var SSCOL={11:"#c9a24b",0:"#a1493a",1:"#c07a52",3:"#9a8f78",7:"#8a6a5c"};
function lifeSvg(D,from,to,tree,cyc,zoom){
  var W=900,L=96,R=12,x=function(jd){ return L+(jd-from)/(to-from)*(W-L-R); };
  var lanes=[["Mahādaśā",26],["Antardaśā",18]]; if(zoom) lanes.push(["Pratyantar",12]);
  lanes.push(["Sade Sati",14],["Returns",14]);
  var y=22, Y={}; lanes.forEach(function(l){ Y[l[0]]=[y,l[1]]; y+=l[1]+8; });
  var H=y+34, o='<svg viewBox="0 0 '+W+' '+H+'" class="kwsvg klife" role="img" aria-label="Life timeline">';
  lanes.forEach(function(l){ o+='<text x="'+(L-8)+'" y="'+(Y[l[0]][0]+Y[l[0]][1]/2+3)+'" class="lab">'+l[0]+'</text>'; });
  function bar(lane,s,e,col,label,tip,txtCol){
    if(e<=from||s>=to) return; var a=x(Math.max(s,from)), b=x(Math.min(e,to)), w=b-a, yy=Y[lane][0], hh=Y[lane][1];
    o+='<g><title>'+esc(tip)+'</title><rect x="'+a.toFixed(1)+'" y="'+yy+'" width="'+Math.max(w,0.8).toFixed(1)+'" height="'+hh+'" fill="'+col+'" stroke="#fff" stroke-width="0.6"/>';
    if(label&&w>label.length*6+4) o+='<text x="'+(a+w/2).toFixed(1)+'" y="'+(yy+hh/2+3.5)+'" class="bl"'+(txtCol?' style="fill:'+txtCol+'"':'')+'>'+esc(label)+'</text>';
    o+='</g>';
  }
  tree.forEach(function(md){
    bar("Mahādaśā",Math.max(md.start,D.jd),md.end,LCOL[md.lord],md.lord,md.lord+" mahādaśā · "+fdate(Math.max(md.start,D.jd))+" → "+fdate(md.end));
    (md.ads||[]).forEach(function(a){
      bar("Antardaśā",a.start,a.end,LCOL[a.lord],zoom?md.lord.slice(0,2)+"–"+a.lord.slice(0,2):a.lord.slice(0,2),md.lord+" → "+a.lord+" · "+fdate(a.start)+" → "+fdate(a.end));
      if(zoom&&a.end>from&&a.start<to) (a.pds||[]).forEach(function(p){
        bar("Pratyantar",p.start,p.end,LCOL[p.lord],p.lord.slice(0,2),md.lord+" → "+a.lord+" → "+p.lord+" · "+fdate(p.start)+" → "+fdate(p.end)); });
    });
  });
  cyc.sade.forEach(function(r){ bar("Sade Sati",r.s,r.e,SSCOL[r.k],r.k===3||r.k===7?"dh":"SS",SS_NAME[r.k]+" · "+fmy(r.s)+" → "+fmy(r.e)); });
  cyc.returns.forEach(function(r){ bar("Returns",r.s,r.e,LCOL[r.k],r.k.slice(0,2),r.k+" return (transiting its natal sign) · "+fmy(r.s)+" → "+fmy(r.e)); });
  // axis
  var y0=jd2d(from).y, y1=jd2d(to).y, span=(to-from)/365.25, st=span>40?10:(span>12?2:1), by=D.input.year;
  o+='<line x1="'+L+'" y1="'+(y+2)+'" x2="'+(W-R)+'" y2="'+(y+2)+'" stroke="#1d2340" stroke-width="1"/>';
  for(var yr=Math.ceil(y0/st)*st; yr<=y1; yr+=st){ var jj=jdFrom(yr,1,1,0); if(jj<from||jj>to) continue; var xx=x(jj);
    o+='<line x1="'+xx.toFixed(1)+'" y1="18" x2="'+xx.toFixed(1)+'" y2="'+(y+6)+'" stroke="#d9d1bb" stroke-width="0.7" stroke-dasharray="2 3"/>';
    o+='<text x="'+xx.toFixed(1)+'" y="'+(y+16)+'" class="ty">'+yr+'</text><text x="'+xx.toFixed(1)+'" y="'+(y+27)+'" class="ta">age '+(yr-by)+'</text>'; }
  if(D.nowJd>=from&&D.nowJd<=to){ var xn=x(D.nowJd);
    o+='<line x1="'+xn.toFixed(1)+'" y1="14" x2="'+xn.toFixed(1)+'" y2="'+(y+4)+'" stroke="#a1493a" stroke-width="2"/>'+
      '<text x="'+xn.toFixed(1)+'" y="10" class="now">now</text>'; }
  return o+'</svg>';
}
function timelinePane(D){
  var tree=buildTree(D); if(!tree) return "";
  var cyc=lifeCycles(D), now=D.nowJd;
  var whole=lifeSvg(D,D.jd,D.jd+100*365.25,tree,cyc,false);
  var zoom=lifeSvg(D,now-3*365.25,now+10*365.25,tree,cyc,true);
  // turning points in the next ten years
  var ev=[], end=now+10*365.25;
  tree.forEach(function(md){
    if(md.start>now&&md.start<end) ev.push([md.start,"<b>"+md.lord+"</b> mahādaśā begins",lordLine(md.lord,D)]);
    (md.ads||[]).forEach(function(a){ if(a.start>now&&a.start<end&&a.start!==md.start) ev.push([a.start,md.lord+" → <b>"+a.lord+"</b> antardaśā",lordLine(a.lord,D)]); });
  });
  cyc.sade.forEach(function(r){ if(r.s>now&&r.s<end) ev.push([r.s,"<b>"+SS_NAME[r.k]+"</b> begins","Saturn over the "+(r.k===11?"12th from":r.k===0?"natal":r.k===1?"2nd from":r.k===3?"4th from":"8th from")+" Moon, to about "+fmy(r.e)]); });
  cyc.returns.forEach(function(r){ if(r.s>now&&r.s<end) ev.push([r.s,"<b>"+r.k+" return</b>",r.k+" back in its natal sign ("+SA[D.P[r.k].sign]+"), to about "+fmy(r.e)]); });
  ev.sort(function(a,b){ return a[0]-b[0]; });
  return '<p class="knote">One view of the whole life: Vimśottarī periods, Saturn\'s Sade Sati and dhaiyā phases, and the '+
    'returns of Jupiter (≈12 years), Saturn (≈29½) and the nodes (≈18½) to their natal signs. Hover a band for its dates.</p>'+
    '<div class="klifebar"><button type="button" class="k-btn sec on" data-klife="zoom">Next 10 years</button>'+
    '<button type="button" class="k-btn sec" data-klife="whole">Whole life</button></div>'+
    '<div class="klifev" data-klifev="zoom">'+zoom+'</div><div class="klifev" data-klifev="whole" hidden>'+whole+'</div>'+
    '<h4 class="ksub">Turning points in the next ten years</h4>'+
    (ev.length?tbl(["Date","Change","What the lord brings in this chart"],ev.map(function(e){
      return '<tr><td>'+fdate(e[0])+'</td><td>'+e[1]+'</td><td class="kmut">'+e[2]+'</td></tr>'; })):'<p class="kmut">No change in the window.</p>')+
    '<div class="kbox">Planet positions are scanned every 12 days, so phase edges are good to about two weeks; daśā dates follow the '+
    'standard method in the '+secLink("Antardaśā & pratyantardaśā","daśā tree")+'. A period change marks a new theme, not an event.</div>';
}

