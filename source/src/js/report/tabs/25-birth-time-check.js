/* ================= 5. Birth-time check ================= */
var BT_CODES=[["D1","Rāśi — the house frame"],["D9","Navāṃśa — marriage, dharma"],["D10","Daśāṃśa — career"],
  ["D7","Saptāṃśa — children"],["D12","Dvādaśāṃśa — parents"],["D60","Ṣaṣṭyāṃśa — finest karmic layer"]];
function btClock(inp,offMin){ var t=inp.hour*60+inp.minute+offMin, s=Math.round(t*60); s=((s%86400)+86400)%86400;
  return String(Math.floor(s/3600)).padStart(2,"0")+":"+String(Math.floor(s%3600/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0"); }
function varEdges(D,code,range,step){
  var inp=D.input, cache={};
  function A(m){ var k=m.toFixed(5); if(cache[k]==null) cache[k]=window.__kAsc(inp,m); return cache[k]; }
  function v(m){ return vargaLagna(code,A(m)); }
  var v0=v(0);
  function edge(dir){ for(var m=0; Math.abs(m)<range; m+=dir*step){ var n=m+dir*step;
      if(v(n)!==v0){ var a=m,b=n; for(var k=0;k<14;k++){ var c=(a+b)/2; if(v(c)===v0) a=c; else b=c; } return {m:Math.abs(b),next:v(b)}; } }
    return null; }
  return {sign:v0,before:edge(-1),after:edge(1),A:A};
}
function lagnaMargins(D){
  if(!window.__kAsc||D.input.hour==null) return null;
  var e=varEdges(D,"D1",360,1); if(!e.before||!e.after) return null;
  return {before:e.before.m,after:e.after.m,from:btClock(D.input,-e.before.m).slice(0,5),to:btClock(D.input,e.after.m).slice(0,5)};
}
function birthTimePane(D){
  if(!window.__kAsc||D.input.hour==null) return '<p class="kmut">Needs the built-in engine.</p>';
  var inp=D.input, rows=[], ruler='', RW=900, L=150, R=10, SPAN=60;
  var xr=function(m){ return L+(m+SPAN)/(2*SPAN)*(RW-L-R); };
  var shared=varEdges(D,"D1",360,1);
  BT_CODES.forEach(function(c,ci){
    var e=varEdges(D,c[0],360,c[0]==="D1"?1:0.25);
    var b=e.before?e.before.m:null, a=e.after?e.after.m:null, mn=Math.min(b==null?999:b,a==null?999:a);
    var verdict=mn<3?'<span class="kbad">fragile</span>':mn<10?'<span class="kmid">sensitive</span>':'<span class="kgood">steady</span>';
    rows.push('<tr><td><b>'+c[0]+'</b> <span class="kmut">'+c[1]+'</span></td><td>'+SA[e.sign]+'</td>'+
      '<td class="knum">'+(b!=null?btClock(inp,-b):"—")+' – '+(a!=null?btClock(inp,a):"—")+'</td>'+
      '<td class="knum">'+(b!=null?'−'+b.toFixed(1)+' min → '+SA[e.before.next]:"—")+'</td>'+
      '<td class="knum">'+(a!=null?'+'+a.toFixed(1)+' min → '+SA[e.after.next]:"—")+'</td><td>'+verdict+'</td></tr>');
    // ruler row: signs across ±60 minutes
    var y=24+ci*26, prev=null, segS=-SPAN;
    ruler+='<text x="'+(L-8)+'" y="'+(y+12)+'" class="lab">'+c[0]+'</text>';
    for(var m=-SPAN; m<=SPAN+0.001; m+=0.25){
      var s=vargaLagna(c[0],shared.A(m));
      if(prev!==null&&(s!==prev||m>=SPAN)){
        var x1=xr(segS), x2=xr(m), w=x2-x1;
        ruler+='<g><title>'+c[0]+' lagna '+SA[prev]+' · '+btClock(inp,segS).slice(0,5)+' – '+btClock(inp,m).slice(0,5)+'</title>'+
          '<rect x="'+x1.toFixed(1)+'" y="'+y+'" width="'+w.toFixed(1)+'" height="18" fill="'+(prev===e.sign?"#e9dcb5":(prev%2?"#dfe6ef":"#eef1f5"))+'" stroke="#fff"/>';
        if(w>34) ruler+='<text x="'+(x1+w/2).toFixed(1)+'" y="'+(y+12.5)+'" class="bl" style="fill:#1d2340">'+SA[prev].slice(0,4)+'</text>';
        ruler+='</g>'; segS=m;
      }
      prev=s;
    }
  });
  var H=24+BT_CODES.length*26+26;
  var svg='<svg viewBox="0 0 '+RW+' '+H+'" class="kwsvg kruler" role="img" aria-label="Varga lagnas across an hour either side of the birth time">'+ruler;
  for(var t=-SPAN;t<=SPAN;t+=15){ var xx=xr(t);
    svg+='<line x1="'+xx.toFixed(1)+'" y1="20" x2="'+xx.toFixed(1)+'" y2="'+(H-22)+'" stroke="#cfc6ad" stroke-width="0.7" stroke-dasharray="2 3"/>'+
      '<text x="'+xx.toFixed(1)+'" y="'+(H-8)+'" class="ty">'+(t===0?"birth":(t>0?"+":"−")+Math.abs(t)+"m")+'</text>'; }
  svg+='<line x1="'+xr(0).toFixed(1)+'" y1="16" x2="'+xr(0).toFixed(1)+'" y2="'+(H-20)+'" stroke="#a1493a" stroke-width="2"/></svg>';
  // Moon: nakshatra-pada window and dasha sensitivity
  var mtxt='';
  try{
    var mo=D.P.Moon, seg=10/3, p0=Math.floor(mo.sid/seg);
    var pAt=function(min){ var s=sidAt("Moon",D.jd+min/1440); return Math.floor(s/seg); };
    var edgeM=function(dir){ for(var m=0;Math.abs(m)<2880;m+=dir*10){ var n=m+dir*10; if(pAt(n)!==p0){ var a=m,b=n;
      for(var k=0;k<12;k++){ var c=(a+b)/2; if(pAt(c)===p0) a=c; else b=c; } return Math.abs(b);} } return null; };
    var mb=edgeM(-1), ma=edgeM(1);
    var spd=(mo.speed!=null?mo.speed:13.2), lord=D.birthNak.lord;
    var shift=(1/1440-VY[lord]*spd/1440/(40/3)*DPY)*10;   // days the daśā dates move per 10 minutes later
    mtxt='<h4 class="ksub">The Moon and the daśā dates</h4><p class="knote">The Moon stays in <b>'+esc(mo.nak)+' pāda '+mo.pada+'</b> for birth times '+
      (mb!=null?'from '+fmtMin(inp,-mb):'')+(ma!=null?' to '+fmtMin(inp,ma):'')+', so the daśā <i>sequence</i> is settled unless the time is off by '+
      (Math.min(mb||9e9,ma||9e9)/60).toFixed(1)+' hours or more. The daśā <i>dates</i> move with every minute: each 10 minutes later '+
      'shifts every period boundary about <b>'+Math.abs(shift).toFixed(0)+' days '+(shift<0?'earlier':'later')+'</b>.</p>';
  }catch(e){}
  var d1=varEdges(D,"D1",360,1), tip='';
  if(d1.before&&d1.after){ var mm=Math.min(d1.before.m,d1.after.m);
    tip=mm<5?'The lagna itself is on a knife-edge: an error of '+mm.toFixed(1)+' minutes flips the rising sign and every house. Treat house-based readings as provisional until the time is confirmed.':
      mm<15?'The lagna has a working margin but not a large one; verify the recorded time (hospital record, not memory) before relying on houses.':
      'The lagna is secure against ordinary rounding. The finer divisions below are where birth-time error bites.'; }
  return '<p class="knote">How much of this chart depends on the exact minute of birth? The engine recomputes the lagna of each '+
    'division for times either side of the one entered, and shows when it would change. The finer the division, the tighter the window.</p>'+
    note("Study note — reading the margins",tip,'Recorded birth times are often rounded to the nearest 5 or 15 minutes. A varga whose window is narrower than '+
      'that rounding cannot be trusted; D60 changes about every two minutes, so it is only meaningful with a rectified time.',["varga","lagna"])+
    tbl(["Division","Lagna","Holds for birth times","Earlier edge","Later edge","Margin"],rows)+
    '<h4 class="ksub">An hour either side</h4>'+svg+
    '<p class="klegend">Gold marks the sign given by the entered time. Each band is one lagna sign for that division.</p>'+mtxt+
    '<h4 class="ksub">Recast at a nearby time</h4><div class="kday-bar">'+
    [-15,-5,-2,2,5,15].map(function(s){ return '<button type="button" class="k-btn sec" data-kshift="'+s+'">'+(s>0?"+":"−")+Math.abs(s)+' min</button>'; }).join("")+
    '</div><p class="klegend">This changes the time in the form and recasts; the form keeps the new time. Use '+tabLink("events","Life events")+
    ' to test which candidate time the dated events fit best.</p>';
}
function fmtMin(inp,m){ var d=Math.floor((inp.hour*60+inp.minute+m)/1440);
  return btClock(inp,m).slice(0,5)+(d<0?' the day before':d>0?' the next day':''); }

