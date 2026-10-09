/* ---------- SVG chart builders ---------- */
var NPOS=[[200,100],[100,33],[33,100],[100,200],[33,300],[100,367],[200,300],[300,367],[367,300],[300,200],[367,100],[300,33]];
function northChart(signOf,occOf,title,sub){
  var o='<svg viewBox="0 0 400 400" class="kchartsvg" role="img" aria-label="'+esc(title)+
        (sub?', '+esc(sub):'')+'"><title>'+esc(title)+(sub?' — '+esc(sub):'')+'</title>';
  o+='<rect x="0" y="0" width="400" height="400" fill="#fbf8f0" stroke="#1d2340" stroke-width="2.5"/>';
  o+='<path d="M0,0 L400,400 M400,0 L0,400 M200,0 L400,200 L200,400 L0,200 Z" fill="none" stroke="#1d2340" stroke-width="1.4"/>';
  for(var i=0;i<12;i++){var h=i+1,x=NPOS[i][0],y=NPOS[i][1],sg=signOf(h),occ=occOf(h);
    o+='<text x="'+x+'" y="'+(y-22)+'" class="hn">'+h+'</text>';
    o+='<text x="'+x+'" y="'+(y-8)+'" class="hs">'+SA[sg]+'</text>';
    occ.forEach(function(pl,k){o+='<text x="'+x+'" y="'+(y+8+k*13)+'" class="hp">'+pl+'</text>';});}
  return '<figure class="kchartfig"><figcaption><b>'+esc(title)+'</b><span>'+esc(sub)+'</span></figcaption>'+o+'</svg></figure>';
}
function southChart(map,LS,title,sub){
  var grid={11:[0,0],0:[0,1],1:[0,2],2:[0,3],3:[1,3],4:[2,3],5:[3,3],6:[3,2],7:[3,1],8:[3,0],9:[2,0],10:[1,0]};
  var o='<svg viewBox="0 0 400 400" class="kchartsvg" role="img" aria-label="'+esc(title)+
        (sub?', '+esc(sub):'')+'"><title>'+esc(title)+(sub?' — '+esc(sub):'')+'</title>';
  o+='<rect x="0" y="0" width="400" height="400" fill="#fbf8f0" stroke="#1d2340" stroke-width="2.5"/>';
  Object.keys(grid).forEach(function(k){var sg=+k,r=grid[k][0],c=grid[k][1],x=c*100,y=r*100,hl=(sg===LS);
    o+='<rect x="'+x+'" y="'+y+'" width="100" height="100" fill="'+(hl?"#f4edda":"#fbf8f0")+'" stroke="#1d2340" stroke-width="1.2"/>';
    o+='<text x="'+(x+6)+'" y="'+(y+15)+'" class="ss">'+SA[sg]+'</text>';
    o+='<text x="'+(x+94)+'" y="'+(y+15)+'" class="sh">'+(((sg-LS)%12+12)%12+1)+'</text>';
    (map[sg]||[]).forEach(function(pl,i){o+='<text x="'+(x+50)+'" y="'+(y+36+i*14)+'" class="sp">'+pl+'</text>';});
    if(hl)o+='<text x="'+(x+50)+'" y="'+(y+92)+'" class="slag">Lagna</text>';});
  return '<figure class="kchartfig"><figcaption><b>'+esc(title)+'</b><span>'+esc(sub)+'</span></figcaption>'+o+'</svg></figure>';
}
function savChart(D){
  if(!D.av||!D.av.sarva)return "";
  var sav=D.av.sarva,W=760,H=150,pad=34,bw=(W-2*pad)/12;
  var o='<svg viewBox="0 0 '+W+' '+H+'" class="kwsvg" role="img" aria-label="Sarvashtakavarga by house">';
  [35,30,25,20].forEach(function(val){var y=H-40-(val-15)*4.2;
    o+='<line x1="'+pad+'" y1="'+y.toFixed(1)+'" x2="'+(W-pad)+'" y2="'+y.toFixed(1)+'" stroke="#ded6c0" stroke-width="1" stroke-dasharray="3 3"/>';
    o+='<text x="'+(pad-6)+'" y="'+(y+3).toFixed(1)+'" class="ax" style="text-anchor:end">'+val+'</text>';});
  for(var h=1;h<=12;h++){var sg=(D.LS+h-1)%12,v=sav[sg],x=pad+(h-1)*bw+3,bh=Math.max((v-15)*4.2,2),y=H-40-bh;
    var col=v>=30?"#1c6b46":(v>=25?"#b08a2e":"#a1493a");
    o+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+(bw-6).toFixed(1)+'" height="'+bh.toFixed(1)+'" fill="'+col+'" rx="2"/>';
    o+='<text x="'+(x+(bw-6)/2).toFixed(1)+'" y="'+(y-5).toFixed(1)+'" class="bv">'+v+'</text>';
    o+='<text x="'+(x+(bw-6)/2).toFixed(1)+'" y="'+(H-24)+'" class="ax">'+h+'</text>';
    o+='<text x="'+(x+(bw-6)/2).toFixed(1)+'" y="'+(H-11)+'" class="axs">'+SA[sg].slice(0,4)+'</text>';}
  o+='<line x1="'+pad+'" y1="'+(H-40)+'" x2="'+(W-pad)+'" y2="'+(H-40)+'" stroke="#1d2340" stroke-width="1.2"/></svg>';
  return o;
}
function timeline(D){
  if(!D.mds)return "";
  var mds=D.mds,t0=mds[0].start,t1=mds[8].end,span=t1-t0,W=760,H=120,pad=10,now=D.nowJd;
  var cols={Ketu:"#8a6a5c",Venus:"#b58fb0",Sun:"#c08a3e",Moon:"#8fa9c4",Mars:"#a1493a",Rahu:"#6a5a86",Jupiter:"#1c6b46",Saturn:"#4a5064",Mercury:"#2b7a6f"};
  var o='<svg viewBox="0 0 '+W+' '+H+'" class="kwsvg" role="img" aria-label="Vimshottari life timeline">';
  mds.forEach(function(m){var x=pad+(m.start-t0)/span*(W-2*pad),w=(m.end-m.start)/span*(W-2*pad);
    o+='<rect x="'+x.toFixed(1)+'" y="34" width="'+Math.max(w,1).toFixed(1)+'" height="34" fill="'+cols[m.lord]+'" opacity="0.9"/>';
    if(w>34){o+='<text x="'+(x+w/2).toFixed(1)+'" y="55" class="tl">'+m.lord.slice(0,2)+'</text>';
      o+='<text x="'+(x+w/2).toFixed(1)+'" y="80" class="ty">'+fmy(m.start).slice(-4)+'</text>';}});
  var xn=pad+(now-t0)/span*(W-2*pad);
  o+='<line x1="'+xn.toFixed(1)+'" y1="24" x2="'+xn.toFixed(1)+'" y2="78" stroke="#a1493a" stroke-width="2"/>';
  o+='<circle cx="'+xn.toFixed(1)+'" cy="24" r="3.5" fill="#a1493a"/><text x="'+xn.toFixed(1)+'" y="17" class="now">now</text>';
  o+='<text x="'+pad+'" y="103" class="ty" style="text-anchor:start">birth · '+fmy(t0)+'</text>';
  o+='<text x="'+(W-pad)+'" y="103" class="ty" style="text-anchor:end">'+fmy(t1)+'</text></svg>';
  return o;
}
function prog(lab,lord,pct,s,e2){
  return '<div class="kprow"><div class="kplab">'+esc(lab)+'<b>'+esc(lord)+'</b></div>'+
   '<div class="kpbar"><span style="width:'+pct.toFixed(1)+'%"></span></div>'+
   '<div class="kppct">'+Math.round(pct)+'%</div>'+
   '<div class="kpdate">'+fdate(s)+' → '+fdate(e2)+'</div></div>';
}
function tbl(head,rows,cls){
  return '<div class="ktwrap" tabindex="0" role="group"><table class="ktbl '+(cls||"")+'"><thead><tr>'+
   head.map(function(h){return '<th scope="col">'+h+"</th>";}).join("")+
   '</tr></thead><tbody>'+rows.join("")+'</tbody></table></div>';
}
var __secN=0, __secList=[], __secUsed={};
/* stable, readable ids ("Vimśottarī daśā" → ks-vimsottari-dasa) so other panes can link into the report */
function slug(t){ return String(t).normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase()
  .replace(/&/g," and ").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,""); }
function secId(title){ ++__secN; var s="ks-"+slug(title), id=s, n=2;
  while(__secUsed[id]) id=s+"-"+(n++); __secUsed[id]=1; return id; }
function sec(title,side,body){
  var id=secId(title); __secList.push({id:id,title:title});
  return '<section class="ksec" id="'+id+'" aria-labelledby="'+id+'-h"><h3 class="kh" id="'+id+'-h">'+
    esc(title)+sensBadge(title)+(side?'<span>'+esc(side)+'</span>':'')+'</h3>'+body+'</section>';
}
function sectionIndex(){
  if(__secList.length<4) return "";
  return '<nav class="kindex" aria-label="Report sections"><b>Jump to</b><div class="kindex-links">'+
    __secList.map(function(s){ return '<a href="#'+s.id+'">'+esc(s.title)+'</a>'; }).join("")+
    '</div></nav>';
}


function vargaCharts(D){
  var g='<div class="kvgrid">';
  D.vargas.forEach(function(v){
    if(v.lagna==null)return;
    var vl=v.lagna;
    var occ={};Object.keys(v.pos).forEach(function(k){(occ[v.pos[k]]=occ[v.pos[k]]||[]).push(GL[k]);});
    g+=northChart(function(h){return (vl+h-1)%12;},
      function(h){var sg=(vl+h-1)%12,a=(occ[sg]||[]).slice();if(h===1)a.unshift("Lg");return a;},
      v.code+" · "+(v.en||""), "lagna "+SA[vl]);
  });
  g+='</div>';
  var rows=D.vargas.map(function(v){
    if(v.lagna==null)return "";
    var cx=CRUX[v.code];if(!cx)return "";
    var cs=(v.lagna+cx[0]-1)%12, lord=LORD[cs];
    var occ=[];Object.keys(v.pos).forEach(function(k){if(v.pos[k]===cs)occ.push(k);});
    var lh=(v.pos[lord]!=null)?(((v.pos[lord]-v.lagna)%12+12)%12+1):null;
    var ld=(v.pos[lord]!=null)?dignity(lord,v.pos[lord],null):null;
    return '<tr><td><b>'+esc(v.code)+'</b> <span class="kmut">'+esc(v.en||"")+'</span></td>'+
      '<td>'+SA[v.lagna]+'</td><td>'+cx[0]+' — '+esc(cx[1])+'</td><td>'+SA[cs]+'</td>'+
      '<td>'+(occ.join(", ")||"—")+'</td>'+
      '<td>'+esc(lord)+(lh?" — H"+lh+" "+chip(ld):"")+'</td></tr>';
  }).filter(Boolean);
  return '<p class="knote">Each division rendered as its own chart, with its own lagna computed from the ascendant '+
   'degree. Houses are counted from that varga lagna. The table then reads the house that <i>is</i> the subject of '+
   'each division — its sign, what sits there, and where its lord went.</p>'+g+
   '<h4 class="ksub">The crux house of each division</h4>'+
   tbl(["Division","Varga lagna","Crux house","Its sign","Occupants","Lord of crux house"],rows)+
   '<div class="kbox">Varga lagna formulas are standard Parāśarī reckonings; each was checked against the engine\'s '+
   'own planet positions for this chart and reproduces all nine exactly. Reading all twelve houses inside a varga is '+
   'later analytical practice rather than explicit BPHS verses.</div>';
}



