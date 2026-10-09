/* ---------- slow-planet scan over the life: Saturn, Jupiter, Rāhu signs ---------- */
var __scan=null;
function slowScan(D){
  var key=D.jd+"|"+D.P.Moon.sid; if(__scan&&__scan.key===key) return __scan.S;
  var S=[], end=D.jd+100*365.25;
  for(var jd=D.jd; jd<=end; jd+=12) S.push({jd:jd,sat:signAt("Saturn",jd),jup:signAt("Jupiter",jd),rahu:signAt("Rahu",jd)});
  __scan={key:key,S:S}; return S;
}
function runs(S,fn){
  var out=[],cur=null;
  S.forEach(function(s){ var k=fn(s);
    if(k!=null&&cur&&cur.k===k){ cur.e=s.jd; return; }
    if(cur){ out.push(cur); cur=null; }
    if(k!=null) cur={k:k,s:s.jd,e:s.jd};
  });
  if(cur) out.push(cur); return out;
}
function mergeRuns(r,gap,minLen){
  var m=[]; r.forEach(function(x){ var l=m[m.length-1];
    if(l&&l.k===x.k&&(x.s-l.e)<gap) l.e=x.e; else m.push({k:x.k,s:x.s,e:x.e}); });
  return m.filter(function(x){ return (x.e-x.s)>=minLen; });
}
var SS_NAME={11:"Sade Sati — rising",0:"Sade Sati — peak",1:"Sade Sati — setting",3:"Dhaiyā (4th from Moon)",7:"Dhaiyā (8th from Moon)"};
function lifeCycles(D){
  var S=slowScan(D), mS=D.P.Moon.sign;
  var nat={Saturn:D.P.Saturn&&D.P.Saturn.sign,Jupiter:D.P.Jupiter&&D.P.Jupiter.sign,Rahu:D.P.Rahu&&D.P.Rahu.sign};
  // a phase begins at Saturn's first ingress; retrograde slips back into the previous sign are folded into it
  var raw=runs(S,function(s){ var r=hFrom(s.sat,mS)-1; return [11,0,1,3,7].indexOf(r)>=0?r:null; }), sade=[];
  raw.forEach(function(x){ var l=null; for(var i=sade.length-1;i>=0;i--){ if(sade[i].k===x.k){ l=sade[i]; break; } }
    if(l&&(x.s-l.e)<500) l.e=Math.max(l.e,x.e); else sade.push({k:x.k,s:x.s,e:x.e}); });
  sade.sort(function(a,b){ return a.s-b.s; });
  for(var i=0;i<sade.length-1;i++) if(sade[i].e>sade[i+1].s) sade[i].e=sade[i+1].s;
  sade=sade.filter(function(x){ return (x.e-x.s)>=120; });
  var whole=mergeRuns(runs(S,function(s){ var r=hFrom(s.sat,mS)-1; return (r===11||r===0||r===1)?"SS":null; }),400,300);
  var ret=[];
  mergeRuns(runs(S,function(s){ return s.jup===nat.Jupiter?"Jupiter":null; }),200,40).forEach(function(r){ ret.push(r); });
  mergeRuns(runs(S,function(s){ return s.sat===nat.Saturn?"Saturn":null; }),400,60).forEach(function(r){ ret.push(r); });
  mergeRuns(runs(S,function(s){ return s.rahu===nat.Rahu?"Rahu":null; }),200,60).forEach(function(r){ ret.push(r); });
  // the natal placement itself is not a "return": drop runs that start at birth
  ret=ret.filter(function(r){ return r.s>D.jd+300; }).sort(function(a,b){ return a.s-b.s; });
  return {sade:sade,whole:whole,returns:ret};
}
/* next sign change of a slow planet after jd (scanned daily, then to the hour) */
function nextIngress(en,jd){
  var s0=signAt(en,jd); if(s0==null) return null;
  var lim=en==="Saturn"?1200:(en==="Jupiter"?500:(en==="Rahu"||en==="Ketu"?700:120));
  for(var d=1; d<=lim; d++){ var s=signAt(en,jd+d); if(s!==s0){
    var a=jd+d-1,b=jd+d; for(var k=0;k<6;k++){ var c=(a+b)/2; if(signAt(en,c)===s0) a=c; else b=c; }
    return {jd:b,sign:s}; } }
  return null;
}

