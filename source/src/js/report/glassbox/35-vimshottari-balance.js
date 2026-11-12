/* --- Vimshottari balance --- */
function gbBalance(D,J){
  if(!D.birthNak) return "";
  var seg=40/3, mn=((D.P.Moon.sid%360)+360)%360, ni=Math.floor(mn/seg);
  var into=mn-ni*seg, frac=into/seg, lord=D.birthNak.lord, full=VY[lord];
  var rows="";
  rows+=gbRow("Moon’s longitude", gbFmt(mn,4)+"°", SA[Math.floor(mn/30)%12]+" "+gbFmt(mn%30,4)+"°");
  rows+=gbRow("Nakṣatra", NAKS[ni]+" (no. "+(ni+1)+")", "each spans 13°20′");
  rows+=gbRow("Arc already travelled", gbFmt(into,4)+"°", "of 13.3333°");
  rows+=gbRow("Fraction elapsed", gbFmt(frac*100,2)+"%", gbFmt(into,4)+" ÷ 13.3333");
  rows+=gbRow("Lord of the nakṣatra", esc(lord), "full term "+full+" years");
  rows+=gbRow("<b>Balance at birth</b>","<b>"+gbFmt(full*(1-frac),4)+"</b> years",
    full+" × (1 − "+gbFmt(frac,4)+")");
  return gbWrap("Vimśottarī balance at birth","BPHS — Vimśottarī from the Moon’s nakṣatra",rows,
    "The first mahādaśā is only the unspent remainder of its lord’s term. Every later period, and every "+
    "sub-period, is measured forward from that point.",
    {ok:Math.abs(full*(1-frac)-D.birthNak.balance)<1e-6,
     detail:gbFmt(full*(1-frac),4)+" vs "+gbFmt(D.birthNak.balance,4)});
}
var GB_KINDS={dignity:gbDignity,uchcha:gbUchcha,sapta:gbSapta,drik:gbDrik,
              total:gbTotal,vimsopaka:gbVimsopaka,balance:gbBalance};
/* for the harnesses: a derivation panel is only worth having if it agrees
   with the figure it explains, and that needs reaching from a test */
try{ window.__gbKinds=GB_KINDS; }catch(e){}
function gbButton(kind,arg,inner,title){
  return '<button type="button" class="gbq" data-gb="'+kind+'" data-gbarg="'+esc(arg||"")+'" '+
    'title="'+esc(title||"Show how this was computed")+'">'+inner+'</button>';
}
document.addEventListener("click",function(ev){
  var t=ev.target;
  if(t && t.classList && t.classList.contains("gbclose")){
    var pan=t.closest(".gbpanel"); if(pan) pan.parentNode.removeChild(pan); return;
  }
  var b=t && t.closest ? t.closest(".gbq") : null;
  if(!b) return;
  ev.preventDefault();
  var host=b.closest("section")||b.parentNode;
  var existing=host.querySelector(".gbpanel");
  if(existing) existing.parentNode.removeChild(existing);
  var J=window.__kdata; if(!J) return;
  var D;
  try{ D=window.__derive ? window.__derive(J) : null; }catch(e){ D=null; }
  if(!D) return;
  var fn=GB_KINDS[b.getAttribute("data-gb")];
  if(!fn) return;
  var html;
  try{ html=fn(D,J,b.getAttribute("data-gbarg")); }
  catch(e){ html='<div class="gbpanel"><p class="gbcheck bad">Could not rebuild this derivation: '+
    esc(e.message)+'</p></div>'; }
  if(!html) return;
  var wrap=document.createElement("div"); wrap.innerHTML=html;
  var node=wrap.firstChild;
  b.closest("table") ? b.closest(".ktwrap").parentNode.insertBefore(node, b.closest(".ktwrap").nextSibling)
                     : host.appendChild(node);
  node.scrollIntoView({behavior:"smooth",block:"nearest"});
});
/* ===== Sensitivity: how much of this chart depends on the birth minute,
   and what changes under the conventions that are genuinely open ===== */
var SENS=null;
function sensSnapshot(inp){
  var J=window.buildLocalChart(inp);
  var s={lagSign:J.lagna.rashi.idx, lagDeg:J.lagna.sidereal_deg, pada:{}, sign:{}, varga:{}, bal:null};
  J.grahas.forEach(function(g){ s.sign[g.key]=g.rashi.idx;
    s.pada[g.key]=nakOf(g.sidereal_deg).name+"-"+nakOf(g.sidereal_deg).pada; });
  J.vargas.forEach(function(v){ s.varga[v.varga]=vargaLagna(v.varga,J.lagna.sidereal_deg); });
  var seg=40/3, mn=J.grahas.filter(function(g){return g.key==="Candra";})[0].sidereal_deg;
  var ni=Math.floor(((mn%360)+360)%360/seg);
  s.bal=(1-((((mn%360)+360)%360)-ni*seg)/seg);
  s.houses={}; J.grahas.forEach(function(g){
    s.houses[g.key]=((g.rashi.idx-J.lagna.rashi.idx)%12+12)%12+1; });
  return s;
}
function sensDiff(a,b){
  var d={lagna:a.lagSign!==b.lagSign, padas:[], signs:[], houses:[], vargas:[],
         lagMin:Math.abs(a.lagDeg-b.lagDeg)*60};
  Object.keys(a.pada).forEach(function(k){ if(a.pada[k]!==b.pada[k]) d.padas.push(k); });
  Object.keys(a.sign).forEach(function(k){ if(a.sign[k]!==b.sign[k]) d.signs.push(k); });
  Object.keys(a.houses).forEach(function(k){ if(a.houses[k]!==b.houses[k]) d.houses.push(k); });
  Object.keys(a.varga).forEach(function(k){ if(a.varga[k]!==b.varga[k]) d.vargas.push(k); });
  return d;
}
function sensCompute(J){
  if(!J||!J.input) return null;
  var base=J.input, out={};
  function at(minutes){
    var i={}; for(var k in base) i[k]=base[k];
    var t=i.hour*60+i.minute+minutes;
    var dayShift=Math.floor(t/1440); t=((t%1440)+1440)%1440;
    i.hour=Math.floor(t/60); i.minute=t%60;
    if(dayShift){ var dt=new Date(Date.UTC(i.year,i.month-1,i.day+dayShift));
      i.year=dt.getUTCFullYear(); i.month=dt.getUTCMonth()+1; i.day=dt.getUTCDate(); }
    return sensSnapshot(i);
  }
  var b=at(0);
  out.one=[sensDiff(b,at(-1)), sensDiff(b,at(1))];
  out.four=[sensDiff(b,at(-4)), sensDiff(b,at(4))];
  out.base=b;
  function merge(pair){
    return {lagna:pair[0].lagna||pair[1].lagna,
            padas:pair[0].padas.concat(pair[1].padas.filter(function(x){return pair[0].padas.indexOf(x)<0;})),
            houses:pair[0].houses.concat(pair[1].houses.filter(function(x){return pair[0].houses.indexOf(x)<0;})),
            vargas:pair[0].vargas.concat(pair[1].vargas.filter(function(x){return pair[0].vargas.indexOf(x)<0;})),
            lagMin:Math.max(pair[0].lagMin,pair[1].lagMin)};
  }
  out.m1=merge(out.one); out.m4=merge(out.four);
  return out;
}
/* ===== THE ±15-MINUTE SWEEP: where things change, to the second =====

   sensCompute answers "does anything change within one or four minutes?" by
   casting the chart again either side. That says THAT a boundary is near, not
   WHERE. A birth time is usually known to a few minutes, so the useful answer
   is the exact moment, within a quarter-hour either side, at which each
   time-sensitive quantity changes: the lagna's sign, the D9, D10 and D60
   lagnas, the Moon's nakṣatra and pāda — and, under Śrīpati, any graha
   changing bhāva as the cusps move under it.

   A BOUNDARY IS FOUND, NOT SAMPLED. Every quantity is evaluated on a grid
   and each change between neighbours is then bisected to half a second, so
   no crossing between two samples is reported at a sample's time. The grid
   (15 s) is finer than any quantity here can change twice in: D60's lagna
   moves every 0.5° of ascendant, two minutes or more anywhere off the poles.

   THE CHART'S OWN AYANĀṂŚA. __kAsc and __kSidAt read the engine's current
   mode, which is whatever was cast last — the export casts all nineteen for
   its alternatives table — so the mode is set to this chart's for the sweep
   and put back after. */
function sensBoundaries(J, spanMin){
  if(!J||!J.input||!window.__kAsc||!window.__kSidAt) return null;
  spanMin=spanMin||15;
  var inp=J.input, setA=window.__setAyan||function(){return null;};
  var prev=setA(null), mode=inp.ayanamsa||"lahiri";
  setA(mode);
  try{
    var sp=!!(J.house_system&&J.house_system.mode==="sripati"&&!J.house_system.fell_back&&
              window.SPSripati&&window.SPSripati.build&&window.__kMC);
    var GR=["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"];
    var nodeLon={};
    (J.grahas||[]).forEach(function(g){ var n=EN[g.key]||g.key;
      if(n==="Rahu"||n==="Ketu") nodeLon[n]=g.sidereal_deg; });
    function dateAt(off){
      var ut=inp.hour+inp.minute/60+off/60-inp.tzHours;
      return new Date(Date.UTC(inp.year,inp.month-1,inp.day,0,0,0)+ut*3600000);
    }
    function state(off){
      var asc=window.__kAsc(inp,off), d=dateAt(off), moon=window.__kSidAt("Moon",d);
      var s={lagna:Math.floor(asc/30)%12, D9:vargaLagna("D9",asc), D10:vargaLagna("D10",asc),
             D60:vargaLagna("D60",asc),
             moon_nakshatra:Math.floor(moon/(40/3))%27, moon_pada:Math.floor(moon/(10/3))%108};
      if(sp){
        var jd=d.getTime()/86400000+2440587.5, T=(jd-2451545)/36525;
        var eps=23.439291111-0.0130041667*T;
        var ay=(((J.ayanamsha_deg||0)));               /* ayanāṃśa moves 0.0000014°/min */
        var mc=window.__kMC(d,inp.lon,eps,ay);
        var F=window.SPSripati.build(asc,mc);
        if(F&&F.houseOf) GR.forEach(function(g){
          var lon=(g==="Rahu"||g==="Ketu")?nodeLon[g]:window.__kSidAt(g,d);
          if(lon!=null) s["bhava_"+g]=F.houseOf(lon);
        });
      }
      return s;
    }
    var KEYS=Object.keys(state(0));
    var step=0.25, grid=[], off;
    for(off=-spanMin; off<=spanMin+1e-9; off+=step) grid.push({off:off, s:state(off)});
    var events=[];
    KEYS.forEach(function(k){
      for(var i=1;i<grid.length;i++){
        var a=grid[i-1], b=grid[i];
        if(a.s[k]===b.s[k]) continue;
        var lo=a.off, hi=b.off, vlo=a.s[k];
        while((hi-lo)*60>0.5){
          var mid=(lo+hi)/2, v=state(mid)[k];
          if(v===vlo) lo=mid; else hi=mid;
        }
        events.push({quantity:k, offset_sec:Math.round((lo+hi)/2*60*10)/10,
                     from:a.s[k], to:b.s[k]});
      }
    });
    events.sort(function(x,y){ return x.offset_sec-y.offset_sec; });
    /* for each quantity, how far the time can move before it changes */
    var base=state(0), safe={};
    KEYS.forEach(function(k){
      var before=null, after=null;
      events.forEach(function(e){ if(e.quantity!==k) return;
        if(e.offset_sec<0) before=(before==null)?e.offset_sec:Math.max(before,e.offset_sec);
        else after=(after==null)?e.offset_sec:Math.min(after,e.offset_sec); });
      safe[k]={value:base[k], earlier_sec:before, later_sec:after,
               stable_for_whole_span:before==null&&after==null};
    });
    return {span_minutes:spanMin, step_sec:step*60, precision_sec:0.5,
            ayanamsa_mode:mode, paddhati:sp?"sripati":"bphs",
            quantities:KEYS, at_recorded_time:base, events:events, stability:safe,
            note:"Each event is the moment, in seconds from the recorded birth time, at "+
              "which the quantity changes — found by bisection to half a second, not read "+
              "off a sample. stability gives, for each quantity, the nearest change "+
              "before and after; null means none within the span. Values: signs 0–11 "+
              "(0 = Meṣa), nakṣatra 0–26, pāda 0–107 counted from Aśvinī 1"+
              (sp?", bhāva 1–12 under Śrīpati's cusps.":".")};
  } finally { setA(prev||mode); }
}
try{ window.__sensBoundaries=sensBoundaries; }catch(e){}
/* which inputs a section leans on, so its badge means something specific */
var SENS_DEPS={
  "Birth particulars":"time","Special ascendants":"time","Upagrahas":"time","Dhūmādi upagrahas":"planets",
  "The chart":"lagna","Chandra & Sūrya kuṇḍalī":"planets","Special ascendant charts":"time",
  "Grahas":"planets","Avasthās":"planets","Bhāva Chalit":"lagna","Bhāva (Sripati)":"lagna",
  "Bhāvas":"lagna","Graha dṛṣṭi":"planets","Rāśi dṛṣṭi":"lagna","Argala":"lagna",
  "Ashtakavarga":"lagna","Divisional ashtakavarga":"varga","Ṣoḍaśa varga":"varga",
  "Divisional charts":"varga","Ṣoḍaśavarga strength":"varga","Ṣaḍbala":"lagna","Bhāva Bala":"lagna",
  "Iṣṭa & Kaṣṭa phala":"planets","Kārakāṃśa":"varga","Ārūḍha & Kārakāṃśa charts":"lagna",
  "Sudarśana Chakra":"planets","Planetary friendship":"lagna","Yogas":"lagna",
  "Kārakas & ārūḍhas":"lagna","Vimśottarī daśā":"moon","Antardaśā & pratyantardaśā":"moon",
  "Aṣṭottarī daśā":"moon","Yoginī daśā":"moon","Gochara":"planets","Kakṣā transit":"planets",
  "Sade Sati timeline":"planets","Ingress & retrograde":"planets","Eclipses":"planets",
  "Day tools":"time","Current sky":"planets"
};
function sensLevelFor(dep,S){
  if(!S) return null;
  function hit(m){
    if(dep==="lagna") return m.lagna;
    if(dep==="varga") return m.vargas.length>0;
    if(dep==="planets") return m.padas.length>0;
    if(dep==="moon") return m.padas.indexOf("Candra")>=0;
    if(dep==="time") return true;   // anything measured from sunrise moves with the clock
    return false;
  }
  if(dep==="time") return {cls:"sens-mid",label:"moves with the clock",
    why:"measured from the birth moment itself, so it shifts by exactly the amount your recorded time is wrong"};
  if(hit(S.m1)) return {cls:"sens-hi",label:"very sensitive",
    why:"something here already changes with a one-minute shift in birth time"};
  if(hit(S.m4)) return {cls:"sens-mid",label:"sensitive",
    why:"stable at one minute, but changes within four"};
  return {cls:"sens-lo",label:"stable",
    why:"unchanged by a four-minute shift in birth time"};
}
function sensBadge(title){
  var L=sensLevelFor(SENS_DEPS[title]||"planets",SENS);
  if(!L) return "";
  return '<span class="sensb '+L.cls+'" title="'+esc(L.why)+'">'+esc(L.label)+'</span>';
}
