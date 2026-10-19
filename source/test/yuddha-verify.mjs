/* Do the three verdicts follow from the three stated rules?
 *
 *   node source/test/yuddha-verify.mjs
 *
 * This scene is the riskiest thing in the motion bundle, because it does not
 * only draw geometry — it applies three interpretive rules and attributes each
 * one to a named source. Getting the geometry wrong would be a bug; getting a
 * verdict backwards and printing "BPHS TEXT" over it would be a misquotation,
 * which is worse. So the test re-derives all three from the latitudes and
 * longitudes, by rules written out here independently of the scene's code:
 *
 *   BPHS Vol. 2, ch. 79, v. 9 ..... Venus wins if present; else the NORTHER
 *                                   of the two (greater signed latitude).
 *   Translator's note, Vol 1 ch 11  the LESSER LONGITUDE wins — except where
 *                                   the longitudes are equal to within 0.001°,
 *                                   which at a conjunction is common, and then
 *                                   the test separates nothing and the verdict
 *                                   is "no winner on this test".
 *   C. G. Rajan, in that note ..... both must be the SAME SIDE of the ecliptic
 *                                   or there is no war; then the GREATER
 *                                   ABSOLUTE latitude wins.
 *
 * It runs them over every war in a six-year window, not only the next one, so
 * a rule that happens to give the right answer on today's pair is still caught.
 * It also asserts the three cases that would make the scene pointless if they
 * never occurred: a Venus war, an opposite-sides war, and a war where the
 * three tests disagree.
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
const T = { ".html":"text/html",".js":"text/javascript",".css":"text/css",
            ".json":"application/json",".svg":"image/svg+xml",".png":"image/png",
            ".webmanifest":"application/manifest+json" };
const server = createServer(async (req,res)=>{
  const u=decodeURIComponent((req.url||"/").split("?")[0]);
  try { const b=await readFile(join(ROOT,normalize(u).replace(/^(\.\.[/\\])+/,"")));
    res.writeHead(200,{"content-type":T[extname(u)]||"application/octet-stream"}); res.end(b);
  } catch { res.writeHead(404).end("no"); } });
const port = await new Promise(r=>server.listen(0,"127.0.0.1",()=>r(server.address().port)));
const br = await chromium.launch(); const pg = await br.newPage();
const errs=[]; pg.on("pageerror",e=>errs.push(String(e)));
await pg.goto(`http://127.0.0.1:${port}/kundli.html`,{waitUntil:"load"});
await pg.waitForFunction(()=>window.__moYuddhaNext && window.__moYuddhaVerdicts,
                         {timeout:30000});

const R = await pg.evaluate(() => {
  const G=["Mars","Mercury","Jupiter","Venus","Saturn"];
  const norm=x=>((x%360)+360)%360;
  const sep=(a,b,ms)=>{const A=window.__kEclip(a,ms),B=window.__kEclip(b,ms);
    if(!A||!B)return null; let d=norm(A.lon-B.lon); return d>180?360-d:d;};
  /* every war in the window, found the same way the scene's search does but
     driven from here so the scene's own loop is not the thing under test */
  const wars=[]; const t0=Date.UTC(2026,0,1), t1=Date.UTC(2032,0,1), step=86400000;
  for(let i=0;i<G.length;i++) for(let j=i+1;j<G.length;j++){
    const a=G[i],b=G[j]; let found=null;
    for(let t=t0;t<=t1;t+=step){
      const s=sep(a,b,t); if(s==null)continue;
      if(s<1.0){ if(!found||s<found.s) found={t,s}; }
      else if(found){
        let lo=found.t-step,hi=found.t+step;
        for(let k=0;k<44;k++){const m1=lo+(hi-lo)/3,m2=hi-(hi-lo)/3;
          const v1=sep(a,b,m1),v2=sep(a,b,m2); if(v1==null||v2==null)break;
          if(v1<v2)hi=m2; else lo=m1;}
        wars.push({a,b,ms:(lo+hi)/2}); found=null;
      }
    }
  }
  /* the three rules, written out here */
  const ref=(a,b,A,B)=>{
    const bphs = (a==="Venus"||b==="Venus") ? "Venus" : (A.lat>B.lat?a:b);
    const note = Math.abs(A.lon-B.lon) < 0.001 ? null : (A.lon<B.lon ? a : b);
    const same = (A.lat>=0)===(B.lat>=0);
    const rajan = same ? (Math.abs(A.lat)>Math.abs(B.lat)?a:b) : null;
    return [bphs,note,rajan];
  };
  let mism=0; const rows=[]; let venusN=0, oppN=0, differN=0, degenN=0;
  for(const w of wars){
    const A=window.__kEclip(w.a,w.ms), B=window.__kEclip(w.b,w.ms);
    const want=ref(w.a,w.b,A,B);
    const got=window.__moYuddhaVerdicts(w.a,w.b,A,B).map(v=>v.v.who);
    const ok = want[0]===got[0] && want[1]===got[1] && want[2]===got[2];
    if(!ok) mism++;
    if(w.a==="Venus"||w.b==="Venus") venusN++;
    if(((A.lat>=0)!==(B.lat>=0))) oppN++;
    if(!(got[0]===got[1]&&got[1]===got[2])) differN++;
    if(got[1]===null) degenN++;
    rows.push({ms:w.ms,a:w.a,b:w.b,
      aLat:+A.lat.toFixed(3),bLat:+B.lat.toFixed(3),
      want,got,ok});
  }
  /* and the scene's own next-war search must land on a real war in the list */
  const next = window.__moYuddhaNext(Date.now(), 420);
  return { n:wars.length, mism, rows, venusN, oppN, differN, degenN,
           next: next ? {a:next.a,b:next.b,ms:next.ms,sep:+next.sep.toFixed(4)} : null };
});

console.log(`${R.n} graha yuddha found 2026–2032; all three verdicts re-derived for each\n`);
const show = R.rows.filter((_,i)=> i%7===0 || !R.rows[i].ok).slice(0,12);
console.log("  date         pair               lat N+/S-        BPHS 79.9   lesser-lon  Rajan");
for (const r of show) {
  const d=new Date(r.ms).toISOString().slice(0,10);
  console.log(`  ${d}  ${(r.a+"/"+r.b).padEnd(17)} ${String(r.aLat).padStart(6)}/${String(r.bLat).padStart(6)}  ` +
    `${(r.got[0]||"—").padEnd(11)} ${(r.got[1]||"—").padEnd(11)} ${(r.got[2]||"no war")}` +
    (r.ok ? "" : "   <<< MISMATCH"));
}
console.log(`\n  verdicts re-derived and matching ....... ${R.n - R.mism}/${R.n}`);
console.log(`  wars involving Śukra (the exception) ... ${R.venusN}`);
console.log(`  wars on opposite sides of the ecliptic . ${R.oppN}  (Rajan: no war)`);
console.log(`  wars where the three tests disagree .... ${R.differN}`);
console.log(`  wars where the longitudes are equal .... ${R.degenN}  (lesser-longitude test decides nothing)`);
if (R.next) console.log(`\n  the scene's own next war: ${R.next.a}/${R.next.b} ` +
  `on ${new Date(R.next.ms).toISOString().slice(0,16).replace("T"," ")}, ${R.next.sep}° apart`);

const checks = [
  ["all three verdicts follow from their stated rules", R.mism === 0],
  ["the Śukra exception actually occurs", R.venusN > 0],
  ["opposite-sided wars occur, so Rajan's 'no war' is reachable", R.oppN > 0],
  ["the tests disagree somewhere, which is the scene's point", R.differN > 0],
  ["the lesser-longitude test's degeneracy is detected, not papered over", R.degenN > 0],
  ["the scene's search finds a real war", !!R.next && R.next.sep < 1.0]
];
console.log("");
let bad=0;
for (const [n,ok] of checks) { if(!ok) bad++; console.log(`  ${ok?"ok  ":"FAIL"} ${n}`); }
if (errs.length) { console.log("\npage errors:"); errs.slice(0,4).forEach(e=>console.log("  "+e)); }
console.log(bad ? "\nFAIL" : "\nevery verdict traces to its named source");
await br.close(); server.close();
process.exit(bad?1:0);
