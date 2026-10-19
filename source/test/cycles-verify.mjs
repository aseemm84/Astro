/* Do the long cycles find what is actually there?
 *
 *   node source/test/cycles-verify.mjs
 *
 * These nodes claim to find every Pūrṇimā, every combustion, every
 * conjunction of a pair over centuries, and to report how many directions
 * they cluster into and after how many the longitude returns. None of that is
 * checkable by looking at a picture — a root-finder that drifts, or one that
 * silently skips every second event, draws a perfectly handsome figure.
 *
 * So the finder is checked against quantities that are known independently of
 * it and were never given to it:
 *
 *   the synodic month, which must fall out of the full-Moon gaps;
 *   the METONIC CYCLE — 235 lunations returning to the same longitude after
 *     19 years — which this code has never been told exists;
 *   the Venus pentagram — five arms, and a near-return after ten
 *     conjunctions in about eight years;
 *   Mercury's synodic period from its combustions and its stations;
 *   and the plain structural facts: events strictly increasing in time, gaps
 *     with no gross outlier (which is what a skipped event looks like), and
 *     every event actually at the longitude it claims.
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
const T={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".webmanifest":"application/manifest+json"};
const server=createServer(async(q,r)=>{const u=decodeURIComponent((q.url||"/").split("?")[0]);
 try{const b=await readFile(join(ROOT,normalize(u).replace(/^(\.\.[/\\])+/,"")));
  r.writeHead(200,{"content-type":T[extname(u)]||"application/octet-stream"});r.end(b);}catch{r.writeHead(404).end("no");}});
const port=await new Promise(r=>server.listen(0,"127.0.0.1",()=>r(server.address().port)));
const br=await chromium.launch();
const pg=await br.newPage();
const errs=[]; pg.on("pageerror",e=>errs.push(String(e)));
await pg.addInitScript(()=>localStorage.clear());
await pg.goto(`http://127.0.0.1:${port}/studio-pro.html`,{waitUntil:"load"});
await pg.waitForFunction(()=>window.__spUI && window.SPCycles,{timeout:30000});

const A = await pg.evaluate(() => {
  const DAY = 86400000;
  function ctx(days) {
    const C = window.__spUI.ctx();
    return { J: C.J, when: Date.UTC(2026, 0, 1), place: C.place,
             day: C.day, spanDays: days, birth: C.birth };
  }
  function val(id, days) {
    const n = window.SPNodes.byId(id);
    if (!n) return null;
    return n.get(ctx(days));
  }
  function gaps(v) {
    const g = [];
    for (let i = 1; i < v.events.length; i++)
      g.push((v.events[i].t - v.events[i-1].t) / DAY);
    return g;
  }
  function stats(g) {
    const mean = g.reduce((a,b)=>a+b,0)/g.length;
    return { mean, min: Math.min(...g), max: Math.max(...g), n: g.length };
  }
  const out = {};
  const t0 = performance.now();

  // ---- the synodic month, and the Metonic cycle
  const pur = val("cyc.purnima", 365*25);
  out.purnima = { n: pur.n, ...stats(gaps(pur)), arms: pur.arms,
                  closure: pur.closure, years: pur.spanYears };
  const ama = val("cyc.amavasya", 365*25);
  out.amavasya = { n: ama.n, ...stats(gaps(ama)), closure: ama.closure };
  // the 235th new moon from the first, measured directly
  if (ama.events.length > 235) {
    const d = ((ama.events[235].lon - ama.events[0].lon) % 360 + 540) % 360 - 180;
    out.metonic = { err: Math.abs(d),
      years: (ama.events[235].t - ama.events[0].t)/DAY/365.2564 };
  }
  // strictly increasing, and no gap that is a multiple of the others
  out.monotone = ama.events.every((e,i)=> i===0 || e.t > ama.events[i-1].t);
  const ag = gaps(ama);
  out.noSkip = ag.every(g => g > 28 && g < 31);

  // ---- Venus: the pentagram
  const ven = val("cyc.conj.Sūrya-Śukra", 365*40);
  out.venus = { n: ven.n, arms: ven.arms, closure: ven.closure,
                ...stats(gaps(ven)) };

  // ---- Mercury
  const mer = val("cyc.conj.Sūrya-Budha", 365*25);
  out.mercury = { n: mer.n, arms: mer.arms, ...stats(gaps(mer)) };
  const venI = val("cyc.inferior.Śukra", 365*40);
  out.venusInf = { n: venI.n, arms: venI.arms, closure: venI.closure, ...stats(gaps(venI)) };
  const merI = val("cyc.inferior.Budha", 365*25);
  out.mercuryInf = { n: merI.n, arms: merI.arms, ...stats(gaps(merI)) };
  const merC = val("cyc.combust.Budha", 365*25);
  out.mercuryCombust = { n: merC.n, ...stats(gaps(merC)) };
  const merS = val("cyc.station.Budha", 365*15);
  out.mercuryStations = { n: merS.n, ...stats(gaps(merS)) };

  // ---- Mars stations and Jupiter-Saturn
  const marS = val("cyc.station.Maṅgala", 365*40);
  out.marsStations = { n: marS.n, ...stats(gaps(marS)) };
  const js = val("cyc.conj.Guru-Śani", 365*120);
  out.jupSat = { n: js.n, arms: js.arms, ...stats(gaps(js)), closure: js.closure };

  // ---- the longitudes really are the longitudes
  const probe = ven.events.slice(0, 6).map(e => {
    const sun = window.__kSidAt("Sun", new Date(e.t));
    const v = window.__kSidAt("Venus", new Date(e.t));
    const d = ((v - sun) % 360 + 540) % 360 - 180;
    return { sep: Math.abs(d), lonErr: Math.abs(((e.lon - sun) % 360 + 540) % 360 - 180) };
  });
  out.atConjunction = probe.every(q => q.sep < 0.05);
  out.lonIsPlotted  = probe.every(q => q.lonErr < 0.05);
  out.probe = probe[0];

  // ---- combustion really is at the stated orb
  const vc = val("cyc.combust.Śukra", 365*25);
  const vcp = vc.events.slice(0, 5).map(e => {
    const sun = window.__kSidAt("Sun", new Date(e.t));
    const v = window.__kSidAt("Venus", new Date(e.t));
    return Math.abs(((v - sun) % 360 + 540) % 360 - 180);
  });
  out.combustAtOrb = vcp.every(s => Math.abs(s - window.SPCycles.ORB["Śukra"]) < 0.08);
  out.combustSeps = vcp.map(x => +x.toFixed(3));

  // ---- the node count, and how long all this takes
  out.nodeCount = window.SPNodes.all().filter(n => n.dom === "cycles").length;
  out.ms = performance.now() - t0;

  // ---- a composer actually draws it
  const sel = ["cyc.conj.Sūrya-Śukra"];
  const r = window.__spUI.select(sel);
  out.composer = r && r.composer;
  return out;
});

const C = [
  ["the synodic month falls out of the full Moons",
   Math.abs(A.purnima.mean - 29.5306) < 0.02],
  ["no new Moon is skipped and they are strictly in order",
   A.monotone === true && A.noSkip === true],
  ["the Metonic cycle appears without being told it exists",
   A.metonic && A.metonic.err < 1.5 && Math.abs(A.metonic.years - 19) < 0.05],
  /* ALL of Venus's conjunctions means inferior AND superior — two per
     synodic period — so the mean gap is half the synodic period and the
     figure has ten points, not five. An earlier draft of this file asserted
     five and 583.92 and was simply asking the wrong question: the pentagram
     is the INFERIOR conjunctions, which now have a node of their own. Both
     are checked, because both are true and they are different facts. */
  /* The combined set has twice as many events and the SAME five arms, which
     is a fact worth stating rather than a tolerance worth loosening. Half a
     synodic period advances the Sun by 287.7°, and 287.7 is 4 × 72 to within
     a third of a degree — so every superior conjunction falls on a vertex of
     the pentagram the inferior ones trace. An earlier draft of this test
     asserted ten arms on the assumption that two interleaved pentagons must
     make a decagon. They do not: they coincide. */
  ["all Venus conjunctions are both kinds, so twice per synodic period",
   Math.abs(A.venus.mean - 583.92/2) < 1.5],
  ["and the superior ones land on the same five arms as the inferior ones",
   A.venus.arms === 5 && A.venusInf.arms === 5 && A.venus.n > A.venusInf.n * 1.8],
  ["a long run of new Moons does not cluster, and says so rather than " +
   "inventing a number", A.purnima.arms === 0],
  ["the inferior conjunctions alone make the pentagram",
   A.venusInf.arms === 5 && Math.abs(A.venusInf.mean - 583.92) < 2],
  ["and close after five of them, in about eight years",
   A.venusInf.closure && A.venusInf.closure.n === 5 &&
   Math.abs(A.venusInf.closure.years - 8) < 0.1],
  ["the same holds for Mercury",
   Math.abs(A.mercury.mean - 115.88/2) < 1.5 &&
   Math.abs(A.mercuryInf.mean - 115.88) < 1.5],
  ["Mercury's entries into combustion come once per conjunction",
   Math.abs(A.mercuryCombust.mean - 115.88/2) < 4],
  ["Mercury's stations alternate at about half its synodic period",
   Math.abs(A.mercuryStations.mean - 115.88/2) < 4],
  ["Mars stations alternate at about half its synodic period",
   Math.abs(A.marsStations.mean - 779.9/2) < 14],
  ["the great conjunction comes out at about twenty years",
   Math.abs(A.jupSat.mean/365.2564 - 19.86) < 0.25],
  ["every conjunction really is a conjunction", A.atConjunction === true],
  ["and is plotted at the longitude it happens at", A.lonIsPlotted === true],
  ["a combustion really is at the stated orb", A.combustAtOrb === true],
  ["the cycle nodes are published", A.nodeCount >= 55],
  ["and a composer draws them", A.composer === "rose"],
  ["all of that computes in a usable time", A.ms < 60000],
  ["no page errors", errs.length === 0]
];
let bad = 0;
for (const [w, ok] of C) { if (!ok) bad++; console.log((ok?"  ok   ":"  FAIL ")+w); }
console.log("");
console.log("  full Moons: " + A.purnima.n + " over " + A.purnima.years.toFixed(1) +
  " yr, mean gap " + A.purnima.mean.toFixed(4) + " d (" +
  A.purnima.min.toFixed(2) + "–" + A.purnima.max.toFixed(2) + ")");
if (A.metonic) console.log("  Metonic: 235 new Moons = " + A.metonic.years.toFixed(4) +
  " years, returning within " + A.metonic.err.toFixed(3) + "°");
console.log("  Venus inferior: " + A.venusInf.n + " conj, mean " +
  A.venusInf.mean.toFixed(2) + " d, " + A.venusInf.arms + " arms, closes at " +
  (A.venusInf.closure ? A.venusInf.closure.n + " after " +
   A.venusInf.closure.years.toFixed(3) + " yr within " +
   A.venusInf.closure.err.toFixed(3) + "\u00b0" : "never"));
console.log("  Venus: " + A.venus.n + " conjunctions, mean " + A.venus.mean.toFixed(2) +
  " d, " + A.venus.arms + " arms, closes at " + (A.venus.closure ?
  A.venus.closure.n + " after " + A.venus.closure.years.toFixed(3) + " yr within " +
  A.venus.closure.err.toFixed(3) + "°" : "never"));
console.log("  Mercury: conj " + A.mercury.mean.toFixed(2) + " d, combust " +
  A.mercuryCombust.mean.toFixed(2) + " d, stations " + A.mercuryStations.mean.toFixed(2) + " d");
console.log("  Mars stations " + A.marsStations.mean.toFixed(1) + " d; Guru–Śani " +
  (A.jupSat.mean/365.2564).toFixed(3) + " yr, " + A.jupSat.arms + " arms");
console.log("  Śukra combustion separations: " + JSON.stringify(A.combustSeps));
console.log("  " + A.nodeCount + " cycle nodes; the whole run took " +
  (A.ms/1000).toFixed(1) + " s");
await br.close(); server.close();
console.log(bad ? "\nFAIL " + bad + " check(s)" : "\nPASS cycles-verify");
process.exit(bad?1:0);
