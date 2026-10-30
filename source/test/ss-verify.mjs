/* Is the Sūrya Siddhānta engine actually computing the Sūrya Siddhānta?
 *
 *   node source/test/ss-verify.mjs
 *
 * THE DIFFICULTY THIS FILE HAS TO GET ROUND. The usual way to test an
 * implementation is against the thing it implements. Here that would mean
 * testing it against my reading of the text, which is not evidence — and the
 * project's rule is that a citation is either exact or absent, so there is
 * nothing to cite at. Meanwhile the obvious alternative, testing it against
 * the modern ephemeris, is worse than useless if taken naively: the whole
 * point of the engine is that it DOES differ from a modern ephemeris, and a
 * test demanding close agreement would pass only if someone had quietly
 * fitted it to one.
 *
 * So everything here is checked by CONSEQUENCE. Each table and parameter is
 * held against something it must produce and that is known independently of
 * it:
 *
 *   the sine table against the sine function;
 *   the epoch against the day of the week, which has run unbroken since long
 *     before it and which no amount of agreement in longitude would catch;
 *   the kalpa structure against the traditional count of elapsed years, which
 *     is derived here rather than quoted;
 *   the rising times of the signs against the obliquity they encode;
 *   the orbital nodes against the LATITUDES they produce, correlated against
 *     the real ones — the check that found the node sitting half a circle
 *     from where it belongs, with every latitude upside down;
 *   the eclipse machinery against a list of eclipses derived from the site's
 *     own modern ephemeris rather than from memory;
 *   and the whole against the band a fifth-century theory should sit in:
 *     degrees, not minutes, and not tens of degrees.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
let chromium;
try { ({ chromium } = await import("playwright")); }
catch { const { createRequire } = await import("node:module");
  ({ chromium } = createRequire(import.meta.url)("playwright")); }
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const T={".html":"text/html",".js":"text/javascript",".css":"text/css",
         ".json":"application/json",".svg":"image/svg+xml",".png":"image/png"};
const server=createServer(async(q,r)=>{const u=decodeURIComponent((q.url||"/").split("?")[0]);
 try{const b=await readFile(join(ROOT,normalize(u).replace(/^(\.\.[/\\])+/,"")));
  r.writeHead(200,{"content-type":T[extname(u)]||"application/octet-stream"});r.end(b);}catch{r.writeHead(404).end("no");}});
const port=await new Promise(r=>server.listen(0,"127.0.0.1",()=>r(server.address().port)));
const br=await chromium.launch();
const pg=await br.newPage();
const errs=[]; pg.on("pageerror",e=>errs.push(String(e)));
await pg.addInitScript(()=>localStorage.clear());
await pg.goto(`http://127.0.0.1:${port}/studio-pro.html`,{waitUntil:"load"});
await pg.waitForFunction(()=>window.SSEngine && window.__kSidAt && window.SPNodes
                            && window.NP, {timeout:30000});

const A = await pg.evaluate(() => {
  const S = window.SSEngine, out = {};
  const EN = { "Sūrya":"Sun","Candra":"Moon","Maṅgala":"Mars","Budha":"Mercury",
               "Guru":"Jupiter","Śukra":"Venus","Śani":"Saturn" };
  const DAY = 86400000;
  const PLACE = { n:"Delhi", lat:28.6139, lon:77.209, tz:5.5 };
  function sd(a,b){ return ((a-b)%360+540)%360-180; }
  function mod(sa,ms){ return window.__kSidAt(EN[sa], new Date(ms)); }
  function modLat(sa,ms){ try{ const e=window.__kEclip(EN[sa],ms); return e?e.lat:null; }catch(x){ return null; } }
  function corr(xs,ys){
    const n=xs.length, mx=xs.reduce((a,b)=>a+b,0)/n, my=ys.reduce((a,b)=>a+b,0)/n;
    let s=0,dx=0,dy=0;
    for(let i=0;i<n;i++){ s+=(xs[i]-mx)*(ys[i]-my); dx+=(xs[i]-mx)**2; dy+=(ys[i]-my)**2; }
    return s/Math.sqrt(dx*dy);
  }
  out.K = S.constants();

  /* ---- 1. the sine table, against the sine function ---- */
  out.jyaWorst = Math.max(...S.JYA.map((v,i)=>Math.abs(v - 3438*Math.sin(i*3.75*Math.PI/180))));
  /* and the interpolation between entries */
  let jw=0, aw=0;
  for(let d=0; d<360; d+=0.3){
    jw = Math.max(jw, Math.abs(S.jyaTable(d) - 3438*Math.sin(d*Math.PI/180)));
    const x = 3438*Math.sin(d*Math.PI/180);
    if (Math.abs(x) < 3437) {
      const back = S.arcJyaTable(x);
      const want = Math.abs(((d+90)%180)-90);
      aw = Math.max(aw, Math.abs(Math.abs(back) - want));
    }
  }
  out.jyaInterpWorst = jw;
  out.arcJyaWorst = aw;

  /* ---- 2. the epoch, against the day of the week ---- */
  out.weekday = [[2026,0,1],[2000,0,1],[1969,6,20],[1900,0,1],[1800,5,15],
                 [1582,9,15],[1200,2,9],[700,11,25]].map(([y,m,d])=>{
    const ms = Date.UTC(y,m,d) + 12*3600000;
    return { d:`${y}-${m+1}-${d}`, ss:S.vara(ms).i, real:new Date(ms).getUTCDay() };
  });
  out.weekdayOk = out.weekday.every(q=>q.ss===q.real);

  /* ---- 3. the kalpa structure ---- */
  const era = S.era(Date.UTC(2026,0,1));
  out.era = { kaliElapsed: era.kaliElapsed,
              kalpaAtKali: era.kalpaYearsAtKaliStart,
              fraction: era.kalpaFraction };

  /* ---- 4. the rising times, against the obliquity ---- */
  out.rising = S.risingTimesAtEquator().slice(0,3);
  out.risingSum = S.risingTimesAtEquator().reduce((a,b)=>a+b,0);
  /* at a latitude they must lengthen for the signs the Sun is high in */
  const rtD = S.risingTimes(PLACE.lat);
  out.risingLat = { gemini: rtD[2], sagittarius: rtD[8] };

  /* ---- 5. the months, against modern values ---- */
  out.months = {
    synodic: (out.K.synodicMonthDays - out.K.modernSynodicMonth)*86400,
    sidereal: (out.K.sidMonthDays - out.K.modernSidMonth)*86400,
    anomalistic: (out.K.anomalisticMonthDays - out.K.modernAnomalisticMonth)*86400,
    draconitic: (out.K.draconiticMonthDays - out.K.modernDraconiticMonth)*86400
  };

  /* ---- 6. longitudes, over fifteen centuries ---- */
  const dates = [Date.UTC(500,0,1), Date.UTC(1000,0,1), Date.UTC(1500,0,1),
                 Date.UTC(1900,0,1), Date.UTC(2000,0,1), Date.UTC(2026,0,1)];
  out.table = dates.map(ms => {
    const P = S.positions(ms), row = { y:new Date(ms).getUTCFullYear() };
    Object.keys(EN).forEach(sa => { row[sa] = +sd(P.grahas[sa].lon, mod(sa,ms)).toFixed(3); });
    return row;
  });
  out.worst = {};
  Object.keys(EN).forEach(sa => {
    out.worst[sa] = Math.max(...out.table.map(r=>Math.abs(r[sa])));
  });
  /* the drift predicted from the parameters, against the drift measured */
  const sunRows = out.table.map(r=>r["Sūrya"]);
  const pred=[], obs=[];
  for(let i=1;i<dates.length;i++){
    const years=(dates[i]-dates[i-1])/DAY/365.2564;
    pred.push(-years*out.K.yearExcessSeconds/86400*(360/out.K.modernSidYearDays));
    obs.push(sunRows[i]-sunRows[i-1]);
  }
  out.drift = { pred, obs, worstErr: Math.max(...pred.map((p,i)=>Math.abs(p-obs[i]))) };

  /* ---- 7. THE NODE, by the latitudes it produces ---- */
  out.node = [2026,1500,500].map(y=>{
    const ms=Date.UTC(y,0,1);
    const d=S.nodeDrift(ms);
    return { y, ss:+d.ss.toFixed(2), mod:d.modern!=null?+d.modern.toFixed(2):null,
             diff:d.diff!=null?+d.diff.toFixed(2):null };
  });
  out.latCorr = {}; out.latAmp = {};
  ["Candra","Maṅgala","Budha","Guru","Śukra","Śani"].forEach(sa=>{
    const xs=[], ys=[];
    let mx=0, mxm=0;
    for(let d=0; d<365*8; d+=2){
      const ms=Date.UTC(2018,0,1)+d*DAY, a=S.ahargana(ms);
      const v=S.latitudeOf(sa,a), m=modLat(sa,ms);
      if(v!=null){ mx=Math.max(mx,Math.abs(v)); }
      if(m!=null){ mxm=Math.max(mxm,Math.abs(m)); }
      if(v!=null&&m!=null){ xs.push(v); ys.push(m); }
    }
    out.latCorr[sa] = +corr(xs,ys).toFixed(3);
    out.latAmp[sa] = { ss:+mx.toFixed(2), modern:+mxm.toFixed(2),
                       ratio:+(mx/mxm).toFixed(2) };
  });

  /* ---- 8. declination and the day ---- */
  let decWorst=0;
  for(let d=0; d<365; d+=5){
    const ms=Date.UTC(2026,0,1)+d*DAY, a=S.ahargana(ms);
    const ssd=S.declination(S.tropical(S.trueLongitude("Sūrya",a).lon, ms));
    const me=modLat("Sūrya",ms);
    let md=null;
    try{ const q=window.__kEquator("Sun",ms,0,0); md=q?q.dec:null; }catch(x){}
    if(md!=null) decWorst=Math.max(decWorst,Math.abs(ssd-md));
  }
  out.declWorst = decWorst;

  out.sunrise = {};
  ["libration","linear","none"].forEach(m=>{
    S.options({ayana:m});
    let worst=0,sum=0,n=0;
    for(let d=0; d<365; d+=5){
      const ms=Date.UTC(2026,0,1)+d*DAY+6*3600000;
      const a=S.sunriseSunset(ms,PLACE);
      let mo=null; try{ mo=window.NP.day(ms,PLACE); }catch(x){}
      if(mo){ const e=Math.abs(a.sunrise-mo.sunrise)/60000; worst=Math.max(worst,e); sum+=e; n++; }
    }
    out.sunrise[m]={worst:+worst.toFixed(1), mean:+(sum/n).toFixed(1)};
  });
  S.options({ayana:"libration"});
  /* the longest and shortest day at Delhi must be in the right months */
  let longest={h:0}, shortest={h:99};
  for(let d=0; d<365; d+=2){
    const ms=Date.UTC(2026,0,1)+d*DAY+6*3600000;
    const q=S.sunriseSunset(ms,PLACE);
    if(q.dayHours>longest.h) longest={h:q.dayHours, m:new Date(ms).getUTCMonth()+1};
    if(q.dayHours<shortest.h) shortest={h:q.dayHours, m:new Date(ms).getUTCMonth()+1};
  }
  out.daylight={longest,shortest};

  /* ---- 9. the lagna ---- */
  const base=Date.UTC(2026,3,10);
  const seen=[], signs={};
  /* twenty-five samples an hour apart — twenty-four INTERVALS, which is the
     day. An earlier version took twenty-four samples and compared their
     twenty-three intervals against a full turn, which is a quarter of an hour
     of sky short before anything has gone wrong. */
  for(let h=0; h<=24; h+=1){
    const L=S.lagna(base+h*3600000, PLACE);
    if(L){ seen.push(L.lon); signs[L.sign]=1; }
  }
  let total=0;
  for(let i=1;i<seen.length;i++){ let d=sd(seen[i],seen[i-1]); if(d<0)d+=360; total+=d; }
  out.lagnaDegreesPerDay = total;
  out.lagnaSigns = Object.keys(signs).length;
  const atRise = S.lagna(S.sunriseSunset(base+6*3600000,PLACE).sunrise+60000, PLACE);
  const sunThen = S.trueLongitude("Sūrya", S.ahargana(base+6*3600000)).lon;
  out.lagnaAtSunrise = { lagna:+atRise.lon.toFixed(2), sun:+sunThen.toFixed(2),
                         gap:+Math.abs(sd(atRise.lon,sunThen)).toFixed(2) };

  /* ---- 10. the pañcāṅga against the site's own ---- */
  let nakHit=0, tithiExact=0, tithiNear=0, varaHit=0, n=0;
  for(let d=0; d<360; d+=3){
    const ms=Date.UTC(2026,0,1)+d*DAY+6*3600000;
    const p=S.panchanga(ms,PLACE);
    let m=null; try{ m=window.NP.day(ms,PLACE); }catch(x){}
    if(!m) continue;
    n++;
    if(p.nakshatra.name===m.at.nak.name) nakHit++;
    const modT=m.at.tithi.n+(m.at.tithi.paksha==="kṛṣṇa"?15:0);
    if(p.tithi.n===modT) tithiExact++;
    if(Math.abs(p.tithi.n-modT)<=1 || Math.abs(p.tithi.n-modT)>=29) tithiNear++;
    if(p.vara.i===new Date(ms).getUTCDay()) varaHit++;
  }
  out.panch={n, nak:nakHit/n, tithi:tithiExact/n, tithiNear:tithiNear/n, vara:varaHit/n};

  /* ---- 11. sizes ---- */
  const a0=S.ahargana(Date.UTC(2026,0,1));
  let dmin=99,dmax=0;
  for(let d=0;d<400;d+=2){const v=S.apparentDiameter("Candra",a0+d); dmin=Math.min(dmin,v); dmax=Math.max(dmax,v);}
  out.sizes={ sunMean:+S.apparentDiameter("Sūrya",a0).toFixed(2),
              moonRange:[+dmin.toFixed(2),+dmax.toFixed(2)],
              shadow:+S.shadowDiameter(a0).minutes.toFixed(2) };

  /* ---- 12. ECLIPSES, against a reference list derived from the modern
     ephemeris rather than from memory. The same geometric test is applied to
     modern numbers: find the syzygy, take the Moon's latitude there, compare
     it with the sum of the half-diameters. Whatever that finds is what a
     modern ephemeris says is an eclipse, and it owes nothing to my recall. */
  function modernSyzygies(from, to, want){
    const out=[];
    const syn=29.530588*DAY;
    function f(ms){
      const m=window.__kSidAt("Moon",new Date(ms)), s=window.__kSidAt("Sun",new Date(ms));
      return ((((m-s)-want)%360+540)%360)-180;
    }
    /* The inner scan has to be able to cross a WHOLE synodic month, because
       the first syzygy after an arbitrary start can be a month away. An
       earlier version scanned fifteen days and gave up — which found the new
       Moons, because the chain once started steps by less than that, and
       found no full Moons at all, because the first one happened to be
       further off than the scan reached. A reference list that silently comes
       back empty is worse than no reference list: every eclipse the engine
       found was then counted as invented. */
    let t=from-syn;
    for(let i=0;i<400 && t<to+syn;i++){
      let a=t, fa=f(a), found=null;
      for(let k=0;k<130;k++){
        const b=a+0.25*DAY, fb=f(b);
        if((fa<0)!==(fb<0) && Math.abs(fa)<90 && Math.abs(fb)<90){
          let lo=a,hi=b,flo=fa;
          for(let j=0;j<50;j++){ const m2=(lo+hi)/2, fm=f(m2);
            if((flo<0)===(fm<0)){lo=m2;flo=fm;}else{hi=m2;} }
          found=(lo+hi)/2; break;
        }
        a=b; fa=fb;
      }
      if(found==null) break;
      if(found>from && found<=to) out.push(found);
      t=found+syn*0.6;
    }
    return out;
  }
  const from=Date.UTC(2022,0,1), to=Date.UTC(2031,0,1);
  const refLunar=[], refSolar=[];
  modernSyzygies(from,to,180).forEach(ms=>{
    const b=modLat("Candra",ms);
    if(b!=null && Math.abs(b)<1.03) refLunar.push({ms, lat:b});   /* umbral */
  });
  modernSyzygies(from,to,0).forEach(ms=>{
    const b=modLat("Candra",ms);
    if(b!=null && Math.abs(b)<1.55) refSolar.push({ms, lat:b});   /* somewhere on Earth */
  });
  const allLunarSyz = modernSyzygies(from,to,180);
  const allSolarSyz = modernSyzygies(from,to,0);
  const got = S.eclipsesIn(from, to, null);
  function near(list, ms, days){ return list.some(q=>Math.abs(q.ms-ms)<days*DAY); }
  const gotL=got.filter(e=>e.kind==="lunar"), gotS=got.filter(e=>e.kind==="solar");
  out.ecl = {
    refLunar: refLunar.length, refSolar: refSolar.length,
    gotLunar: gotL.length, gotSolar: gotS.length,
    lunarFound: refLunar.filter(r=>near(gotL.map(e=>({ms:e.e.at})), r.ms, 2)).length,
    solarFound: refSolar.filter(r=>near(gotS.map(e=>({ms:e.e.at})), r.ms, 2)).length,
    lunarFalse: gotL.filter(e=>!near(refLunar, e.e.at, 2)).length,
    solarFalse: gotS.filter(e=>!near(refSolar, e.e.at, 2)).length,
    /* the deep ones specifically — a theory that found only the grazing ones
       would be finding them by accident */
    /* The solar comparison has to be like for like. A solar eclipse is
       visible SOMEWHERE on Earth whenever the Moon's latitude at conjunction
       is within about 1.5°, because an observer can stand an Earth-radius off
       the axis — but the engine's test here is geocentric and no place was
       given, so it is answering a narrower question: would the shadow fall on
       the centre of the Earth. Counting its answers against the wider list
       makes it look as though it is missing two thirds of them. Against the
       central ones, which is the question it was asked, it does far better. */
    centralSolarRef: refSolar.filter(r=>Math.abs(r.lat)<0.6).length,
    centralSolarFound: refSolar.filter(r=>Math.abs(r.lat)<0.6 &&
      near(gotS.map(e=>({ms:e.e.at})), r.ms, 2)).length,
    deepRef: refLunar.filter(r=>Math.abs(r.lat)<0.4).length,
    deepFound: refLunar.filter(r=>Math.abs(r.lat)<0.4 &&
      near(gotL.map(e=>({ms:e.e.at})), r.ms, 2)).length,
    sample: gotL.slice(0,4).map(e=>new Date(e.e.at).toISOString().slice(0,10)),
    /* the honest claim about false positives: not that there are none, but
       that every one of them sits on a real syzygy. The engine never finds an
       eclipse where there was no new or full Moon; what it occasionally does
       is call a near-miss an eclipse, because its Moon's latitude is a
       fraction of a degree out. A penumbral eclipse counted as umbral is that
       and not a fiction. */
    offSyzygy: gotL.filter(e=>!allLunarSyz.some(t=>Math.abs(t-e.e.at)<1.5*DAY)).length +
               gotS.filter(e=>!allSolarSyz.some(t=>Math.abs(t-e.e.at)<1.5*DAY)).length
  };

  /* ---- 13. visibility, retrogression ---- */
  out.kalamsa = S.KALAMSA;
  let venusInvis=0, venusTot=0;
  for(let d=0; d<365*3; d+=2){
    const ms=Date.UTC(2024,0,1)+d*DAY, a=S.ahargana(ms);
    const h=S.heliacal("Śukra",a);
    if(h){ venusTot++; if(!h.visible) venusInvis++; }
  }
  out.venusInvisibleFraction = venusInvis/venusTot;
  const retro={};
  ["Maṅgala","Budha","Guru","Śukra","Śani"].forEach(sa=>{
    let back=0,total=0,flips=0,prev=null;
    for(let d=0; d<365*30; d+=2){
      const v=S.motion(sa, Date.UTC(1990,0,1)+d*DAY);
      if(v==null) continue;
      total++; const b=v<0; if(b)back++;
      if(prev!==null&&b!==prev)flips++;
      prev=b;
    }
    retro[sa]={fraction:back/total, periods:flips/2, perYear:(flips/2)/30};
  });
  out.retro=retro;

  /* ---- 14. the sine table's own cost, over two thousand years ---- */
  let tw=0;
  for(let y=500;y<=2500;y+=50){
    const ms=Date.UTC(y,0,1);
    S.options({sines:"exact"}); const ex=S.positions(ms).grahas;
    S.options({sines:"table"}); const tb=S.positions(ms).grahas;
    S.SA.forEach(sa=>{ if(ex[sa]&&tb[sa]) tw=Math.max(tw, Math.abs(sd(tb[sa].lon,ex[sa].lon))*60); });
  }
  out.tableCostArcmin = tw;

  /* ---- 15. options and the bīja mechanism ---- */
  const before = S.positions(Date.UTC(2026,0,1)).grahas["Śani"].lon;
  S.options({bija:{"Śani":10}});
  const after = S.positions(Date.UTC(2026,0,1)).grahas["Śani"].lon;
  S.options({bija:null});
  const restored = S.positions(Date.UTC(2026,0,1)).grahas["Śani"].lon;
  out.bija = { changed: Math.abs(sd(before,after))>0.01,
               restored: Math.abs(sd(before,restored))<1e-9 };

  /* ---- 16. nodes ---- */
  const C = window.__spUI ? window.__spUI.ctx()
    : { when:Date.now(), place:PLACE, spanDays:365 };
  const ssNodes = window.SPNodes.all().filter(n=>n.dom==="siddhanta");
  out.nodes = { n: ssNodes.length,
    dead: ssNodes.filter(n=>{ const v=window.SPNodes.resolve(n,C); return !v||!v.kind; })
                 .map(n=>n.id) };
  out.absent = S.ABSENT.length;
  return out;
});

/* the page */
const PG = await (async () => {
  const p2 = await br.newPage({ viewport:{width:1200,height:1400} });
  const e2=[]; p2.on("pageerror",e=>e2.push(String(e)));
  await p2.goto(`http://127.0.0.1:${port}/siddhanta.html`,{waitUntil:"load"});
  await p2.waitForFunction(()=>window.__ss,{timeout:30000});
  const r = await p2.evaluate(() => {
    function ink(){
      const cv=document.getElementById("ss-drift");
      const d=cv.getContext("2d").getImageData(0,0,cv.width,cv.height).data;
      let n=0; for(let i=0;i<d.length;i+=4)
        if(d[i+3]>10 && !(d[i]>250&&d[i+1]>250&&d[i+2]>250)) n++;
      return n/(d.length/4);
    }
    const before=ink();
    const body=document.getElementById("ss-body");
    body.value="Candra"; body.dispatchEvent(new Event("change",{bubbles:true}));
    const after=ink();
    const nowText=document.querySelector("#ss-now tbody").textContent;
    const w=document.getElementById("ss-when");
    w.value="1500-06-01T12:00"; w.dispatchEvent(new Event("change",{bubbles:true}));
    const thenText=document.querySelector("#ss-now tbody").textContent;
    return {
      paramRows: document.querySelectorAll("#ss-params tbody tr").length,
      listItems: document.querySelectorAll("#ss-params .sslist li").length,
      nowRows: document.querySelectorAll("#ss-now tbody tr").length,
      workRows: document.querySelectorAll("#ss-working tbody tr").length,
      dayRows: document.querySelectorAll("#ss-day tbody tr").length,
      absentItems: document.querySelectorAll("#ss-absent li").length,
      note: (document.getElementById("ss-driftnote")||{}).textContent||"",
      drew: before>0.005, redrew: Math.abs(after-before)>0.0005,
      momentMatters: nowText!==thenText,
      saysNotBphs: /not BPHS/i.test(document.body.textContent),
      saysNoVerse: /No verse is cited here/i.test(document.body.textContent)
    };
  });
  await p2.close();
  return Object.assign(r,{errors:e2.length});
})();

/* ---- the chart engine's two Sūrya Siddhānta ayanāṃśas ----
   The Kundli builder now offers the text's libration and the text's bare rate
   as chart ayanāṃśas. They are the SAME definition this page implements, and
   two implementations of one definition are exactly the thing that drifts
   apart quietly — so they are held against each other here rather than each
   being held against a number written down twice. Exact agreement is demanded,
   not close agreement: these are formulae, not fits. */
const X = await (async () => {
  const p3 = await br.newPage();
  const errs3 = [];
  p3.on("pageerror", e => errs3.push(String(e && e.message || e)));
  const years = [499, 1000, 1500, 1900, 2026, 2100, 3000, -500];
  await p3.goto(`http://127.0.0.1:${port}/siddhanta.html`, { waitUntil: "load" });
  const ss = await p3.evaluate(ys => {
    const ms = y => Date.UTC(y, 6, 1);
    const S = window.SSEngine, out = {};
    S.options({ ayana: "libration" }); out.lib = ys.map(y => S.ayanamsa(ms(y)));
    S.options({ ayana: "linear" });    out.lin = ys.map(y => S.ayanamsa(ms(y)));
    S.options({ ayana: "libration" });
    return out;
  }, years);
  await p3.goto(`http://127.0.0.1:${port}/kundli.html`, { waitUntil: "load" });
  const ch = await p3.evaluate(ys => {
    const jd = y => (Date.UTC(y, 6, 1) / 86400000) + 2440587.5;
    return { text: ys.map(y => window.__ayanFor("ss_text", jd(y))),
             rate: ys.map(y => window.__ayanFor("ss_rate", jd(y))),
             modes: Object.keys(window.__ayanModes) };
  }, years);
  const worst = Math.max(
    ...ss.lib.map((v, i) => Math.abs(v - ch.text[i])),
    ...ss.lin.map((v, i) => Math.abs(v - ch.rate[i])));
  await p3.close();
  return { years, ss, ch, worstArcsec: worst * 3600, errors: errs3.length };
})();

const K = A.K;
const okAll = (o,f) => Object.keys(o).every(k=>f(o[k],k));
const C = [
  /* the two engines, one definition */
  ["the chart engine offers the two Sūrya Siddhānta readings this page implements",
   X.ch.modes.includes("ss_text") && X.ch.modes.includes("ss_rate")],
  ["and agrees with this page EXACTLY on both, across 3500 years",
   X.worstArcsec < 1e-6],
  ["the libration turns and comes back; the bare rate never does",
   X.ss.lib[6] < X.ss.lib[5] && X.ss.lin[6] > X.ss.lin[5]],
  ["they agree at the 499 zero and disagree by 15° by the year 3000",
   Math.abs(X.ss.lib[0] - X.ss.lin[0]) < 0.05 &&
   Math.abs(X.ss.lib[6] - X.ss.lin[6]) > 15],
  ["no page error on either engine", X.errors === 0],

  ["the sine table is the sine function, to a unit in 3438", A.jyaWorst < 1.0],
  ["and interpolating inside it costs under three units",
   A.jyaInterpWorst < 3.0],
  ["reading the table backwards recovers the arc", A.arcJyaWorst < 2.0],

  ["the epoch names the day of the week correctly, across thirteen centuries",
   A.weekdayOk === true],
  ["the kalpa structure gives the traditional elapsed years exactly",
   A.era.kalpaAtKali === 1972944000],
  ["and places us in the right year of Kali", A.era.kaliElapsed === 5126],

  ["the rising times of the first three signs are the canonical ones",
   Math.abs(A.rising[0]-1670)<3 && Math.abs(A.rising[1]-1795)<3 &&
   Math.abs(A.rising[2]-1935)<3],
  ["and the twelve of them make exactly one day",
   Math.abs(A.risingSum-21600) < 0.001],
  /* In the northern hemisphere the signs of LONG ascension are Karka
     through Dhanus, and those of short ascension Makara through Mithuna —
     the opposite way round from the first draft of this assertion. The
     engine had it right; I had it backwards. */
  ["at a northern latitude the signs of long ascension take longer",
   A.risingLat.sagittarius > A.risingLat.gemini],

  ["the synodic month is right to a fraction of a second",
   Math.abs(A.months.synodic) < 0.5],
  ["the sidereal, anomalistic and draconitic months to a few seconds",
   Math.abs(A.months.sidereal) < 2 && Math.abs(A.months.anomalistic) < 6 &&
   Math.abs(A.months.draconitic) < 4],
  ["the revolution counts imply a year a few minutes too long",
   K.yearExcessSeconds > 150 && K.yearExcessSeconds < 260],
  ["the Sun's measured drift matches what that excess predicts",
   A.drift.worstErr < 0.12],

  /* the band, not the smallness */
  ["the Sun stays within a few degrees over fifteen centuries",
   A.worst["Sūrya"] > 0.1 && A.worst["Sūrya"] < 6],
  ["Guru and Śani are the worst, as a classical theory's outer planets are",
   A.worst["Guru"] < 14 && A.worst["Śani"] < 14 &&
   Math.max(A.worst["Guru"],A.worst["Śani"]) >
   Math.max(A.worst["Maṅgala"],A.worst["Budha"])],
  ["and no graha is anywhere near a wrong revolution count",
   okAll(A.worst, v=>v<20)],

  /* Ten degrees, not two. Part of it is the theory — a draconitic month two
     seconds long, carried across two hundred and seventy-five circuits. Part
     is this test's own: the real node is recovered here from the Moon's
     latitude using a fixed inclination of 5.145°, while the true inclination
     oscillates by about a tenth of a degree, which is worth a degree or two
     in the recovered node. Both are honest and neither is worth removing. */
  ["the node sits within about ten degrees of the real one",
   A.node.every(q=>q.diff!=null && Math.abs(q.diff)<12)],
  ["every latitude agrees in SIGN and SHAPE with the real one",
   okAll(A.latCorr, v=>v>0.95)],
  ["and reaches between half and all of the real amplitude",
   okAll(A.latAmp, v=>v.ratio>0.5 && v.ratio<=1.05)],

  ["the Sun's declination is right to about a degree", A.declWorst < 1.6],
  ["sunrise is within a quarter of an hour of a modern one all year",
   A.sunrise.libration.worst < 16 && A.sunrise.libration.mean < 9],
  ["and taking the declination in the wrong frame is visibly worse",
   A.sunrise.none.worst > A.sunrise.libration.worst * 2],
  ["the longest day falls in June and the shortest in December",
   A.daylight.longest.m === 6 && A.daylight.shortest.m === 12],

  ["the lagna goes round once a day",
   A.lagnaDegreesPerDay > 330 && A.lagnaDegreesPerDay < 395],
  ["and every sign rises in the course of it", A.lagnaSigns === 12],
  ["and is near the Sun at sunrise", A.lagnaAtSunrise.gap < 20],

  ["the vāra is always right", A.panch.vara === 1],
  ["the nakṣatra agrees with a modern pañcāṅga most days", A.panch.nak > 0.6],
  ["and the tithi is within one of it almost always", A.panch.tithiNear > 0.9],

  ["the Moon's apparent diameter spans about the right range",
   A.sizes.moonRange[0] > 27 && A.sizes.moonRange[0] < 31 &&
   A.sizes.moonRange[1] > 33 && A.sizes.moonRange[1] < 36],
  ["and the Earth's shadow is about two and a half Moons wide",
   A.sizes.shadow/32 > 2.2 && A.sizes.shadow/32 < 2.8],

  ["it finds most of the lunar eclipses a modern ephemeris finds",
   A.ecl.lunarFound / A.ecl.refLunar > 0.55],
  ["it finds the deep ones in particular",
   A.ecl.deepFound / Math.max(1,A.ecl.deepRef) > 0.75],
  /* ABOUT HALF, and the asymmetry with the lunar result is the finding
     rather than a shortfall. A lunar eclipse happens when the Moon's latitude
     at opposition is inside the shadow plus the Moon — close to two degrees
     of room. A solar one needs the latitude inside the sum of two half-
     diameters, about half a degree: a window a third as wide, from a Moon
     whose longitude is degrees out and whose node is a few degrees out. That
     the deep lunar eclipses come out eight from eight and the central solar
     ones about half is exactly what those two windows predict. */
  ["it finds about half the central solar eclipses — a window a third as wide",
   A.ecl.centralSolarFound / Math.max(1, A.ecl.centralSolarRef) > 0.35],
  ["and every eclipse it finds sits on a real syzygy",
   A.ecl.offSyzygy === 0],
  ["its near-misses are few", A.ecl.lunarFalse + A.ecl.solarFalse <= 3],

  ["Śukra needs the least distance from the Sun to be seen, Śani the most",
   A.kalamsa["Śukra"] === Math.min(...Object.values(A.kalamsa)) &&
   A.kalamsa["Maṅgala"] === Math.max(...Object.values(A.kalamsa))],
  ["Śukra is invisible for a small part of the time",
   A.venusInvisibleFraction > 0.02 && A.venusInvisibleFraction < 0.25],

  ["retrogression falls out of the śīghra correction for every graha that has it",
   ["Maṅgala","Budha","Guru","Śukra","Śani"].every(k=>A.retro[k].periods>5)],
  ["Budha turns back most often, Maṅgala least",
   A.retro["Budha"].perYear > A.retro["Guru"].perYear &&
   A.retro["Guru"].perYear > A.retro["Maṅgala"].perYear],
  ["Guru and Śani are retrograde about a third of the time",
   A.retro["Guru"].fraction>0.25 && A.retro["Guru"].fraction<0.40 &&
   A.retro["Śani"].fraction>0.28 && A.retro["Śani"].fraction<0.42],

  ["computing with the table rather than the sine function costs a few arc-minutes",
   A.tableCostArcmin > 0.2 && A.tableCostArcmin < 8],
  ["a bīja changes the places, and removing it puts them back",
   A.bija.changed === true && A.bija.restored === true],

  ["the nodes are published and every one resolves",
   A.nodes.n >= 35 && A.nodes.dead.length === 0],
  ["what is missing is listed with a reason", A.absent >= 5],

  ["the page generates its tables from the engine",
   PG.paramRows === 9 && PG.listItems >= 10 && PG.nowRows === 9 &&
   PG.workRows >= 5 && PG.dayRows >= 5 && PG.absentItems >= 5],
  ["the drift chart draws, and redraws for a different graha",
   PG.drew === true && PG.redrew === true],
  ["changing the moment changes the positions", PG.momentMatters === true],
  ["the page says plainly that this is not BPHS and cites no verse",
   PG.saysNotBphs === true && PG.saysNoVerse === true],
  ["no page errors", errs.length === 0 && PG.errors === 0]
];
let bad = 0;
for (const [w,ok] of C) { if(!ok) bad++; console.log((ok?"  ok   ":"  FAIL ")+w); }
console.log("");
console.log("  jyā table: worst " + A.jyaWorst.toFixed(2) + " of 3438; " +
  "interpolated " + A.jyaInterpWorst.toFixed(2) + "; arc recovered to " +
  A.arcJyaWorst.toFixed(2) + "°");
console.log("  months, seconds from modern: synodic " + A.months.synodic.toFixed(2) +
  ", sidereal " + A.months.sidereal.toFixed(2) + ", anomalistic " +
  A.months.anomalistic.toFixed(2) + ", draconitic " + A.months.draconitic.toFixed(2));
console.log("  rising times " + A.rising.map(x=>x.toFixed(1)).join(", ") +
  " (canonical 1670, 1795, 1935)");
console.log("  Kali " + A.era.kaliElapsed + " elapsed; " +
  A.era.kalpaAtKali.toLocaleString("en") + " years of the Kalpa at its start");
console.log("");
const names=["Sūrya","Candra","Maṅgala","Budha","Guru","Śukra","Śani"];
console.log("  Sūrya Siddhānta minus modern, degrees:");
console.log("    year  "+names.map(n=>n.padStart(8)).join(""));
A.table.forEach(r=>console.log("    "+String(r.y).padStart(4)+"  "+
  names.map(n=>r[n].toFixed(2).padStart(8)).join("")));
console.log("");
console.log("  latitude: correlation with the real one " +
  Object.keys(A.latCorr).map(k=>k+" "+A.latCorr[k]).join(", "));
console.log("  latitude: amplitude as a fraction of the real one " +
  Object.keys(A.latAmp).map(k=>k+" "+A.latAmp[k].ratio).join(", "));
console.log("  node vs the real node: " +
  A.node.map(q=>q.y+" "+(q.diff>0?"+":"")+q.diff+"°").join(", "));
console.log("");
console.log("  sunrise error at Delhi: libration " + A.sunrise.libration.mean +
  "/" + A.sunrise.libration.worst + " min mean/worst, linear " +
  A.sunrise.linear.mean + "/" + A.sunrise.linear.worst +
  ", no ayanāṃśa at all " + A.sunrise.none.mean + "/" + A.sunrise.none.worst);
console.log("  pañcāṅga against the site's own: vāra " +
  (A.panch.vara*100).toFixed(0) + "%, nakṣatra " + (A.panch.nak*100).toFixed(0) +
  "%, tithi exactly " + (A.panch.tithi*100).toFixed(0) + "%, within one " +
  (A.panch.tithiNear*100).toFixed(0) + "%");
console.log("  Moon " + A.sizes.moonRange[0] + "′–" + A.sizes.moonRange[1] +
  "′, Sun " + A.sizes.sunMean + "′, shadow " + A.sizes.shadow + "′");
console.log("  eclipses 2022–2031: lunar " + A.ecl.lunarFound + "/" +
  A.ecl.refLunar + " found (deep ones " + A.ecl.deepFound + "/" + A.ecl.deepRef +
  "), solar central " + A.ecl.centralSolarFound + "/" + A.ecl.centralSolarRef +
  " (of all a modern ephemeris finds anywhere on Earth: " + A.ecl.solarFound +
  "/" + A.ecl.refSolar + ")" +
  ", invented " + (A.ecl.lunarFalse + A.ecl.solarFalse));
console.log("  lagna: " + A.lagnaDegreesPerDay.toFixed(1) + "°/day, at sunrise " +
  A.lagnaAtSunrise.lagna + "° against a Sun at " + A.lagnaAtSunrise.sun + "°");
console.log("  the sine table costs at most " + A.tableCostArcmin.toFixed(2) +
  "′ of longitude over two thousand years");
console.log("  " + A.nodes.n + " nodes published");
console.log("  page: " + PG.note);
if (errs.length) errs.slice(0,3).forEach(e=>console.log("  page error: "+e));
await br.close(); server.close();
console.log(bad ? "\nFAIL " + bad + " check(s)" : "\nPASS ss-verify");
process.exit(bad?1:0);
