/* Does every combination draw something?
 *
 *   node source/test/sp-compose-verify.mjs
 *
 * The page's whole claim is that any selection of nodes produces a picture.
 * That is a claim about a combinatorial space far too large to enumerate, so
 * it is sampled hard instead: hundreds of random selections of one to six
 * nodes, each rendered at real export size, each checked for four things that
 * a broken composer would otherwise pass silently —
 *
 *   it must not throw;
 *   it must light pixels (a composer that computes correctly and draws
 *     nothing looks exactly like one that works, because the canvas is dark
 *     either way);
 *   it must leave Instagram's reserved strips alone;
 *   and consecutive playhead positions must differ, because a "animation"
 *     that renders four identical frames is a still.
 *
 * Every composer is also exercised deliberately with a selection built to
 * match it, so a composer that never happens to win a random draw is still
 * covered.
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
         ".json":"application/json",".svg":"image/svg+xml",".png":"image/png",
         ".webmanifest":"application/manifest+json"};
const server=createServer(async(q,r)=>{const u=decodeURIComponent((q.url||"/").split("?")[0]);
 try{const b=await readFile(join(ROOT,normalize(u).replace(/^(\.\.[/\\])+/,"")));
  r.writeHead(200,{"content-type":T[extname(u)]||"application/octet-stream"});r.end(b);}catch{r.writeHead(404).end("no");}});
const port=await new Promise(r=>server.listen(0,"127.0.0.1",()=>r(server.address().port)));
const br=await chromium.launch(); const pg=await br.newPage();
const errs=[]; pg.on("pageerror",e=>errs.push(String(e)));
await pg.goto(`http://127.0.0.1:${port}/kundli.html`,{waitUntil:"load"});
await pg.waitForFunction(()=>window.buildLocalChart,{timeout:30000});
await pg.addScriptTag({url:"/panchanga.js"});
await pg.addScriptTag({url:"/studio-pro.js"});
await pg.waitForFunction(()=>window.SPNodes&&window.SPStage,{timeout:15000});

const R = await pg.evaluate(() => {
  const J=window.buildLocalChart({year:1984,month:5,day:17,hour:14,minute:30,
    lat:26.85,lon:80.95,tzHours:5.5,ayanamsa:"lahiri",node:"mean"});
  const place={name:"Lucknow",lat:26.85,lon:80.95,tz:5.5};
  let day=null; try{ day=window.NP.day(Date.now(),place); }catch(e){}
  const C={J, when:Date.now(), place, day, spanDays:365};

  const cv=document.createElement("canvas");
  window.SPStage.attach(cv);
  window.SPStage.S.ratio="9:16"; window.SPStage.S.safe=true;
  window.SPStage.resize();
  const ctx=cv.getContext("2d");

  /* lit fraction overall, and inside each strip Instagram covers */
  function measure(){
    const W=cv.width,H=cv.height;
    const d=ctx.getImageData(0,0,W,H).data;
    let lit=0, top=0, bot=0, right=0, hash=0;
    const tH=Math.round(H*0.14), bY=Math.round(H*0.80), rX=Math.round(W*0.86);
    for(let y=0;y<H;y+=4) for(let x=0;x<W;x+=4){
      const i=(y*W+x)*4;
      /* "lit" means brighter than the darkest background gradient step */
      const v=d[i]+d[i+1]+d[i+2];
      hash=(hash*31+v)|0;
      if(v>170){
        lit++;
        if(y<tH) top++;
        if(y>bY) bot++;
        if(x>rX) right++;
      }
    }
    const n=(H/4)*(W/4);
    return {lit:lit/n, top:top/n, bot:bot/n, right:right/n, hash};
  }

  const ids=window.SPNodes.all().map(n=>n.id);
  /* deterministic sampling: a failure must be reproducible */
  let seed=424242;
  const rnd=()=>{ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; };

  const fails=[], used={}, counts={}, stills=[];
  let ok=0, tried=0, still=0;
  for (let t=0;t<260;t++){
    const k=1+Math.floor(rnd()*6);
    const sel=[];
    for(let i=0;i<k;i++){ const id=ids[Math.floor(rnd()*ids.length)];
      if(sel.indexOf(id)<0) sel.push(id); }
    tried++;
    let frames=[], res=null, threw=null;
    try{
      for(const p of [0.05,0.35,0.68,0.97]){
        res=window.SPStage.render(sel,C,p);
        frames.push(measure());
      }
    }catch(e){ threw=String(e&&e.message||e); }
    if(threw){ fails.push({sel,why:"THREW "+threw}); continue; }
    const key=res&&res.composer||"none";
    counts[key]=(counts[key]||0)+1; used[key]=1;
    const minLit=Math.min(...frames.map(f=>f.lit));
    const worstTop=Math.max(...frames.map(f=>f.top));
    const worstBot=Math.max(...frames.map(f=>f.bot));
    const worstRight=Math.max(...frames.map(f=>f.right));
    const distinct=new Set(frames.map(f=>f.hash)).size;
    /* A selection whose every node came back empty draws a frame that says
       so, and that frame is correctly identical at every playhead position.
       Counting it as a failed animation would push the page toward animating
       an apology. Only a frame that DREW something is required to move. */
    if(distinct<2 && key!=="none"){ still++; if(stills.length<8) stills.push({sel,composer:key}); }
    if(minLit<0.002){ fails.push({sel,why:"drew almost nothing ("+(minLit*100).toFixed(3)+"%)",composer:key}); continue; }
    if(worstTop>0.012||worstBot>0.012||worstRight>0.012){
      fails.push({sel,why:`into a reserved strip t/b/r ${(worstTop*100).toFixed(2)}/${(worstBot*100).toFixed(2)}/${(worstRight*100).toFixed(2)}%`,composer:key});
      continue;
    }
    ok++;
  }

  /* every composer, deliberately */
  const DELIB={
    mark:["sky.lon.Sūrya"],
    angle:["sky.lon.Sūrya","sky.lon.Candra"],
    web:["sky.all"],
    zoom:["sky.lon.Candra","geo.naks"],
    rings:["geo.rashis","geo.naks","geo.padas"],
    bars:["bala.total_rupa"],
    graph:["rel.drishti"],
    gears:["dasha.gears"],
    timeline:["pan.horas"],
    trace:["tr.track.Maṅgala"],
    heat:["av.grid"],
    kundliN:["chart.d1"],
    kundliS:["chart.d1"],
    sudarshana:["chart.sudarshana"],
    almanac:["day.almanac"],
    layers:["sky.all","bala.total","pan.horas"]
  };
  const delib={};
  for (const [k,sel] of Object.entries(DELIB)){
    let got=null, threw=null, lit=0, distinct=0;
    try{
      const hs=[];
      for(const p of [0.1,0.5,0.9]){ got=window.SPStage.render(sel,C,p,k);
        const m=measure(); lit=Math.max(lit,m.lit); hs.push(m.hash); }
      distinct=new Set(hs).size;
    }catch(e){ threw=String(e&&e.message||e); }
    delib[k]={composer:got&&got.composer, threw, lit:+(lit*100).toFixed(2), distinct,
              missing:got?got.missing.length:-1};
  }

  return {tried, ok, still, stills, fails:fails.slice(0,8), counts, delib,
          composers:window.SPStage.composers().length};
});

console.log(`${R.tried} random selections of 1–6 nodes, rendered at 1080×1920 with the safe strips on\n`);
console.log("  chosen composer: " + Object.entries(R.counts).sort((a,b)=>b[1]-a[1])
  .map(([k,n])=>`${k} ${n}`).join("   "));
console.log(`\n  drew, stayed clear of the strips .... ${R.ok}/${R.tried}`);
console.log(`  rendered identical frames .......... ${R.still}`);
if (R.stills.length){ console.log("\n  IDENTICAL FRAMES:");
  R.stills.forEach(f=>console.log(`    [${f.composer}] ${f.sel.join(" + ")}`)); }
if (R.fails.length){ console.log("\n  FAILURES:");
  R.fails.forEach(f=>console.log(`    [${f.composer||"?"}] ${f.why}\n      ${f.sel.join(" + ")}`)); }

console.log("\n  every composer, driven deliberately:");
let dbad=0;
for (const [k,v] of Object.entries(R.delib)) {
  const ok = !v.threw && v.composer===k && v.lit>0.2 && v.distinct>=2;
  if(!ok) dbad++;
  console.log(`    ${ok?"ok  ":"FAIL"} ${k.padEnd(9)} lit ${String(v.lit).padStart(5)}%  ` +
    `distinct ${v.distinct}/3  ${v.threw?("THREW "+v.threw):("chose "+v.composer)}`);
}

const checks=[
  ["every random selection drew and stayed inside the frame", R.fails.length===0],
  ["no selection rendered four identical frames", R.still===0],
  ["every composer draws when driven to it", dbad===0],
  ["the matcher used more than one composer", Object.keys(R.counts).length>=4]
];
console.log("");
let bad=0;
for(const [n,o] of checks){ if(!o) bad++; console.log(`  ${o?"ok  ":"FAIL"} ${n}`); }
if (errs.length){ console.log("\npage errors:"); errs.slice(0,5).forEach(e=>console.log("  "+e)); }
console.log(bad?"\nFAIL":"\nevery combination sampled produced a picture");
await br.close(); server.close();
process.exit(bad?1:0);
