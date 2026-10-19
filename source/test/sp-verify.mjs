/* Does every Studio Pro node resolve to something real?
 *
 *   node source/test/sp-verify.mjs
 *
 * The registry is the foundation of the page: a node that silently returns a
 * malformed shape would not throw, it would just draw nothing, or draw a NaN.
 * So every node is resolved against a real chart and checked structurally —
 * the declared roles must match the shape actually returned, and no number
 * anywhere in the value may be NaN or Infinity.
 *
 * It also settles the one duplication the registry admits to. The Viṃśottarī
 * daśā is computed in sp-nodes.js as well as in the report bundle, because the
 * report bundle is not reachable from another page. Two implementations drift.
 * This test builds one chart, runs both, and asserts the nine mahādaśās agree
 * to the day — which is the only thing that makes the second copy acceptable.
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
/* kundli.html carries the ephemeris AND the report bundle, so the registry and
   the implementation it duplicates can be compared inside one page. */
await pg.goto(`http://127.0.0.1:${port}/kundli.html`,{waitUntil:"load"});
await pg.waitForFunction(()=>window.buildLocalChart,{timeout:30000});
await pg.addScriptTag({url:"/panchanga.js"});
await pg.addScriptTag({url:"/studio-pro.js"});
await pg.waitForFunction(()=>window.SPNodes,{timeout:15000});

const R = await pg.evaluate(() => {
  const inp={year:1984,month:5,day:17,hour:14,minute:30,lat:26.85,lon:80.95,
             tzHours:5.5,ayanamsa:"lahiri",node:"mean"};
  const J=window.buildLocalChart(inp);
  const place={name:"Lucknow",lat:26.85,lon:80.95,tz:5.5};
  let day=null;
  try{ day=window.NP.day(Date.now(),place); }catch(e){}
  const C={J, when:Date.now(), place, day};
  const Cnone={J:null, when:Date.now(), place, day};

  /* every number inside a value must be finite */
  const bad=[];
  const walk=(v,path,depth)=>{
    if(v==null||depth>4) return;
    if(typeof v==="number"){ if(!isFinite(v)) bad.push(path); return; }
    if(typeof v==="function") return;
    if(Array.isArray(v)){ v.slice(0,40).forEach((x,i)=>walk(x,path+"["+i+"]",depth+1)); return; }
    if(typeof v==="object") for(const k of Object.keys(v)) walk(v[k],path+"."+k,depth+1);
  };
  const KINDS={lon:"lon",lonset:"lonset",scalar:"scalar",sset:"sset",lanes:"lanes",
               edges:"edges",span:"span",spanset:"spanset",series:"series",grid:"grid",
               houses:"houses",houseset:"houseset",almanac:"almanac"};
  const rows=[], byDom={};
  let nullWith=0, nullWithout=0, roleMismatch=[], shapeBad=[];
  for (const n of window.SPNodes.all()) {
    byDom[n.dom]=(byDom[n.dom]||0)+1;
    let v=null, threw=null;
    try{ v=n.get(C); }catch(e){ threw=String(e&&e.message||e); }
    if(threw){ shapeBad.push(n.id+" THREW "+threw); continue; }
    if(v==null){ nullWith++; }
    else{
      if(!KINDS[v.kind]) shapeBad.push(n.id+" unknown kind "+v.kind);
      else if(n.roles.indexOf(v.kind)<0) roleMismatch.push(n.id+" declares ["+n.roles+"] returned "+v.kind);
      walk(v,n.id,0);
      /* a label that stringified an object is the classic silent failure */
      const s=JSON.stringify(v,(k,x)=>typeof x==="function"?undefined:x);
      if(s&&s.indexOf("[object Object]")>=0) shapeBad.push(n.id+" has [object Object]");
      if(s&&/"(label|k|why)":"(undefined|null|NaN)"/.test(s)) shapeBad.push(n.id+" has a placeholder label");
    }
    /* and it must not throw with no chart at all */
    try{ const v2=n.get(Cnone); if(v2==null) nullWithout++; }
    catch(e){ shapeBad.push(n.id+" THREW with no chart: "+String(e&&e.message||e)); }
  }

  /* the Viṃśottarī duplication, pinned */
  let vim=null;
  try{
    const mine=window.SPNodes.vimshottari(C);
    const theirs=window.__derive ? window.__derive(J).mds : null;
    if(mine&&theirs){
      /* the report bundle names grahas in English and the registry in IAST;
         the sequences are the same objects under two spellings, so compare
         through the registry's own map rather than reporting a false difference */
      const toEN=window.SPNodes.EN;
      let maxDiff=0, lordsOk=true;
      for(let i=0;i<9;i++){
        if(toEN[mine.list[i].lord]!==theirs[i].lord) lordsOk=false;
        maxDiff=Math.max(maxDiff,Math.abs(mine.list[i].start-theirs[i].start),
                                 Math.abs(mine.list[i].end-theirs[i].end));
      }
      vim={lordsOk, maxDiffDays:+maxDiff.toFixed(6),
           first:mine.list[0].lord, nak:mine.nak};
    } else vim={unavailable:!window.__derive?"derive not exposed":"no sequence"};
  }catch(e){ vim={err:String(e&&e.message||e)}; }

  /* And a third opinion, written out here from the scheme itself rather than
     copied from either implementation: nine lords in the fixed order with the
     fixed year counts, the opening one chosen by the Moon's nakṣatra and
     shortened by the part of it already travelled. If both implementations
     agreed with each other and both were wrong, this is what would catch it. */
  let indep=null;
  try{
    const SEQ=["Ketu","Śukra","Sūrya","Candra","Maṅgala","Rāhu","Guru","Śani","Budha"];
    const YRS={"Ketu":7,"Śukra":20,"Sūrya":6,"Candra":10,"Maṅgala":7,
               "Rāhu":18,"Guru":16,"Śani":19,"Budha":17};
    let moon=null;
    for(const g of J.grahas) if(g.key==="Candra") moon=g.sidereal_deg;
    const seg=40/3, m=((moon%360)+360)%360, ni=Math.floor(m/seg);
    const open=SEQ[ni%9], travelled=(m-ni*seg)/seg;
    const i0=SEQ.indexOf(open); const list=[];
    for(let i=0;i<9;i++){
      const lo=SEQ[(i0+i)%9];
      list.push({lord:lo, years:(i===0)?YRS[open]*(1-travelled):YRS[lo]});
    }
    const mine=window.SPNodes.vimshottari(C);
    /* Compared in YEARS, not in days.

       The first version compared dates and failed by 1.42 days — not because
       either sequence was wrong but because it had assumed a different length
       for a year. How many days a Viṃśottarī year holds is a convention this
       site settles once (it uses the sidereal year); how many YEARS each lord
       holds, in what order, and how much of the first is already spent, is the
       scheme itself. Only the second is a thing a third opinion can adjudicate,
       so only the second is asserted here. */
    let dy=0, lordsOk=true;
    for(let i=0;i<9;i++){
      if(list[i].lord!==mine.list[i].lord) lordsOk=false;
      dy=Math.max(dy,Math.abs(list[i].years-mine.list[i].years));
    }
    const total=list.reduce((a,b)=>a+b.years,0);
    indep={lordsOk, maxDiffYears:+dy.toFixed(9), open,
           travelledPct:+(travelled*100).toFixed(2),
           totalYears:+total.toFixed(4),
           fullTotal:+(SEQ.reduce((a,l)=>a+YRS[l],0))};
  }catch(e){ indep={err:String(e&&e.message||e)}; }

  return {indep, total:window.SPNodes.all().length, byDom, nullWith, nullWithout,
          roleMismatch:roleMismatch.slice(0,10), shapeBad:shapeBad.slice(0,10),
          nanPaths:bad.slice(0,10), vim, absent:window.SPNodes.absent.length};
});

console.log(`${R.total} nodes in the registry\n`);
const doms=Object.entries(R.byDom).sort((a,b)=>b[1]-a[1]);
console.log("  by domain: " + doms.map(([d,n])=>`${d} ${n}`).join("   "));
console.log(`\n  resolved with a chart ....... ${R.total-R.nullWith}/${R.total}`);
console.log(`  null with a chart ........... ${R.nullWith}  (greyed on the wall)`);
console.log(`  null with NO chart .......... ${R.nullWithout}  (so ${R.total-R.nullWithout} work in live mode)`);
console.log(`  declared absent, with reason  ${R.absent}`);
if (R.roleMismatch.length){ console.log("\n  ROLE MISMATCHES:"); R.roleMismatch.forEach(x=>console.log("    "+x)); }
if (R.shapeBad.length){ console.log("\n  SHAPE PROBLEMS:"); R.shapeBad.forEach(x=>console.log("    "+x)); }
if (R.nanPaths.length){ console.log("\n  NON-FINITE NUMBERS:"); R.nanPaths.forEach(x=>console.log("    "+x)); }

console.log("\n  the one duplication, pinned:");
if (R.vim && R.vim.lordsOk !== undefined)
  console.log(`    Viṃśottarī vs the report bundle — lords ${R.vim.lordsOk?"identical":"DIFFER"}, ` +
              `worst boundary difference ${R.vim.maxDiffDays} days  (janma ${R.vim.nak}, opens ${R.vim.first})`);
else console.log("    " + JSON.stringify(R.vim));
if (R.indep && R.indep.lordsOk !== undefined)
  console.log(`    and against a third derivation from the scheme — lords ` +
    `${R.indep.lordsOk?"identical":"DIFFER"}, worst period length differs by ` +
    `${R.indep.maxDiffYears} years  (opens ${R.indep.open}, ` +
    `${R.indep.travelledPct}% of the nakṣatra spent, so the sequence runs ` +
    `${R.indep.totalYears} of the full ${R.indep.fullTotal})`);

const checks=[
  ["every node returns a known shape", R.shapeBad.length===0],
  ["every node's shape matches its declared roles", R.roleMismatch.length===0],
  ["no non-finite number in any value", R.nanPaths.length===0],
  ["most of the registry resolves with a chart", R.total-R.nullWith > R.total*0.75],
  ["a useful subset resolves with NO chart", R.total-R.nullWithout >= 40],
  ["Viṃśottarī agrees with the report bundle to the day",
   !!R.vim && R.vim.lordsOk===true && R.vim.maxDiffDays < 1],
  ["and agrees with a third derivation on lords and period lengths",
   !!R.indep && R.indep.lordsOk===true && R.indep.maxDiffYears < 1e-9],
  ["the nine periods add to 120 years", !!R.indep && R.indep.fullTotal===120]
];
console.log("");
let bad=0;
for(const [n,ok] of checks){ if(!ok) bad++; console.log(`  ${ok?"ok  ":"FAIL"} ${n}`); }
if (errs.length){ console.log("\npage errors:"); errs.slice(0,5).forEach(e=>console.log("  "+e)); }
console.log(bad?"\nFAIL":"\nthe registry holds");
await br.close(); server.close();
process.exit(bad?1:0);
