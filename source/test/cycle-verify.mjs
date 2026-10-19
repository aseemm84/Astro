/* Does the pattern scene find every occurrence, and is the figure it reports
 * the figure the occurrences actually make?
 *
 *   node source/test/cycle-verify.mjs
 *
 * This scene draws a conclusion — "twelve arms", "it returns after 235" — from
 * a few hundred events it found for itself, and a scene that silently missed
 * every second event would still draw a clean figure and still report a tidy
 * number. So three separate things are checked:
 *
 *   1. COMPLETENESS. The scene finds its events by scanning for the first two
 *      and then walking forward from each one. That is fast and it is exactly
 *      the kind of shortcut that skips. So for each event type the whole span
 *      is ALSO scanned exhaustively, here, by brute force, and the two lists
 *      must agree event for event to within a minute.
 *
 *   2. THE FIGURE. The arm count and the tightest return are re-derived from
 *      the longitudes by rules written out again in this file, so the scene's
 *      own closure code is not the thing marking its own homework.
 *
 *   3. THE PHYSICS. Three quantities here are known independently of this
 *      ephemeris and of each other, and all three fall out of the event list
 *      rather than being put into it:
 *        - the mean interval between syzygies is the synodic month, 29.5306 d;
 *        - 235 of them is the Metonic cycle and comes to 19 tropical years;
 *        - Śukra's conjunctions close a pentagram in 8 years.
 *      If the scene's events were wrong, these would not land.
 *
 *   4. AND ONE NEGATIVE. Maṅgala must report NO closure. A pattern-finder that
 *      finds a pattern in everything has found nothing, so the one case that
 *      must come back empty is asserted to come back empty.
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
await pg.waitForFunction(()=>window.__moCycleFacts && window.__kSidAt,{timeout:30000});

const R = await pg.evaluate(() => {
  const norm=x=>((x%360)+360)%360;
  const sd=(a,b)=>{let d=norm(a-b);return d>180?d-360:d;};
  const sid=(n,ms)=>window.__kSidAt(n,new Date(ms));

  /* the brute-force list: every sign change, both directions, no prediction */
  function brute(rootFn, t0, t1, step) {
    const out=[]; let prev=rootFn(t0);
    for (let t=t0+step; t<=t1; t+=step) {
      const cur=rootFn(t);
      if (prev==null||cur==null){prev=cur;continue;}
      if ((prev<0)!==(cur<0) && Math.abs(prev)<90 && Math.abs(cur)<90) {
        let lo=t-step, hi=t; const up=prev<0;
        for(let k=0;k<40;k++){const m=(lo+hi)/2; if((rootFn(m)<0)===up) lo=m; else hi=m;}
        out.push((lo+hi)/2);
      }
      prev=cur;
    }
    return out;
  }
  const ROOTS = {
    purnima: (t)=>{const m=sid("Moon",t),s=sid("Sun",t); return (m==null||s==null)?null:sd(norm(m-s),180);},
    amavasya:(t)=>{const m=sid("Moon",t),s=sid("Sun",t); return (m==null||s==null)?null:sd(norm(m-s),0);},
    venus:   (t)=>{const p=sid("Venus",t),s=sid("Sun",t); return (p==null||s==null)?null:sd(norm(p-s),0);},
    mercury: (t)=>{const p=sid("Mercury",t),s=sid("Sun",t); return (p==null||s==null)?null:sd(norm(p-s),0);},
    mars:    (t)=>{const p=sid("Mars",t),s=sid("Sun",t); return (p==null||s==null)?null:sd(norm(p-s),0);},
    jupiter: (t)=>{const p=sid("Jupiter",t),s=sid("Sun",t); return (p==null||s==null)?null:sd(norm(p-s),0);},
    saturn:  (t)=>{const p=sid("Saturn",t),s=sid("Sun",t); return (p==null||s==null)?null:sd(norm(p-s),0);}
  };
  const STEP = { purnima:0.5, amavasya:0.5, venus:1, mercury:1, mars:2, jupiter:2, saturn:2 };
  const SPAN = { purnima:20, amavasya:20, venus:16, mercury:15, mars:30, jupiter:24, saturn:30 };

  const out={};
  for (const kind of Object.keys(ROOTS)) {
    const yrs=SPAN[kind];
    const F=window.__moCycleFacts(kind, yrs);
    if (!F) { out[kind]={fail:"no facts"}; continue; }
    /* The brute scan has to reach PAST the last event and start BEFORE the
       first, because a crossing is detected between two samples: without the
       margin the first and last events of the scene's list have no bracket to
       be found in, and the comparison reports exactly one missing every time —
       which is what it did, for all seven event types, before the margin was
       added. One missing in every case is a boundary, not a bug. */
    const marg=STEP[kind]*86400000*2;
    const t0=F.ts[0]-1, t1=F.ts[F.ts.length-1]+1;
    const B=brute(ROOTS[kind], t0-marg, t1+marg, STEP[kind]*86400000);
    /* every scene event must appear in the brute list and vice versa */
    let maxOff=0, missing=0;
    for (const t of F.ts) {
      let best=Infinity;
      for (const b of B) best=Math.min(best, Math.abs(b-t));
      if (best>60000) missing++;
      maxOff=Math.max(maxOff,best);
    }
    const extra = B.filter(b=>b>=F.ts[0]-1000 && b<=F.ts[F.ts.length-1]+1000)
                   .filter(b=>!F.ts.some(t=>Math.abs(t-b)<60000)).length;

    /* re-derive the figure */
    const adv=[]; for(let i=1;i<F.lons.length;i++) adv.push(norm(F.lons[i]-F.lons[i-1]));
    const meanAdv=adv.reduce((a,b)=>a+b,0)/adv.length;
    const eff=Math.min(meanAdv,360-meanAdv);
    let arms=null;
    for(let n=3;n<=60&&n<F.lons.length;n++)
      if(Math.abs(sd(F.lons[n],F.lons[0]))<eff/2){arms={n,err:Math.abs(sd(F.lons[n],F.lons[0]))};break;}
    let tight=null;
    for(let n=3;n<F.lons.length;n++){
      const e=Math.abs(sd(F.lons[n],F.lons[0]));
      if(e<15&&(!tight||e<tight.err)) tight={n,err:e,years:(F.ts[n]-F.ts[0])/31556952000};
    }
    const agreeArms = (arms===null)===(F.arms===null) &&
      (arms===null || (arms.n===F.arms.n && Math.abs(arms.err-F.arms.err)<1e-6));
    const agreeTight = (tight===null)===(F.tight===null) &&
      (tight===null || tight.n===F.tight.n);
    out[kind]={
      n:F.ts.length, bruteN:B.length, missing, extra, maxOffSec:+(maxOff/1000).toFixed(1),
      meanDays:+(((F.ts[F.ts.length-1]-F.ts[0])/(F.ts.length-1))/86400000).toFixed(4),
      meanAdv:+meanAdv.toFixed(3), turns:+((F.lons.length-1)*meanAdv/360).toFixed(2),
      arms:F.arms?{n:F.arms.n,err:+F.arms.err.toFixed(2)}:null,
      tight:F.tight?{n:F.tight.n,err:+F.tight.err.toFixed(3),years:+F.tight.years.toFixed(2)}:null,
      agreeArms, agreeTight
    };
  }
  return out;
});

console.log("  event      found  brute  miss extra   interval d   advance°  turns   arms        tightest return");
let bad=0;
for (const [k,v] of Object.entries(R)) {
  if (v.fail) { console.log(`  ${k.padEnd(10)} ${v.fail}`); bad++; continue; }
  const ok = v.missing===0 && v.extra===0 && v.agreeArms && v.agreeTight;
  if (!ok) bad++;
  console.log(`  ${k.padEnd(10)} ${String(v.n).padStart(5)} ${String(v.bruteN).padStart(6)} ` +
    `${String(v.missing).padStart(5)} ${String(v.extra).padStart(5)} ` +
    `${String(v.meanDays).padStart(12)} ${String(v.meanAdv).padStart(10)} ${String(v.turns).padStart(6)}  ` +
    `${(v.arms?`${v.arms.n} @ ${v.arms.err}°`:"none").padEnd(12)} ` +
    `${v.tight?`${v.tight.n} = ${v.tight.years}y @ ${v.tight.err}°`:"none"}` +
    (ok?"":"   <<< DISAGREES"));
}

const P=R.purnima, V=R.venus, MA=R.mars;
console.log("\n  independent physical checks");
const checks=[
  ["every scene event is a real crossing, and none is missed",
   Object.values(R).every(v=>!v.fail && v.missing===0 && v.extra===0)],
  ["the arm count re-derives", Object.values(R).every(v=>!v.fail && v.agreeArms)],
  ["the tightest return re-derives", Object.values(R).every(v=>!v.fail && v.agreeTight)],
  [`syzygy interval is the synodic month (29.5306 d; got ${P.meanDays})`,
   Math.abs(P.meanDays-29.5306)<0.01],
  [`235 syzygies is the Metonic cycle, 19 years (got ${P.tight?P.tight.n+" = "+P.tight.years+"y":"none"})`,
   !!P.tight && P.tight.n===235 && Math.abs(P.tight.years-19)<0.05 && P.tight.err<1],
  [`syzygies show 12 arms (got ${P.arms?P.arms.n:"none"})`, !!P.arms && P.arms.n===12],
  [`Śukra closes a pentagram in 8 years (got ${V.tight?V.tight.n+" ev = "+V.tight.years+"y":"none"})`,
   !!V.tight && Math.abs(V.tight.years-8)<0.1 && V.tight.err<4],
  [`Śukra shows 5 arms (got ${V.arms?V.arms.n:"none"})`, !!V.arms && V.arms.n===5],
  ["Maṅgala reports NO closure, as it must", MA.arms===null]
];
for (const [n,ok] of checks){ if(!ok) bad++; console.log(`  ${ok?"ok  ":"FAIL"} ${n}`); }
if (errs.length){ console.log("\npage errors:"); errs.slice(0,4).forEach(e=>console.log("  "+e)); }
console.log(bad ? "\nFAIL" : "\nevery figure is the figure its own occurrences make");
await br.close(); server.close();
process.exit(bad?1:0);
