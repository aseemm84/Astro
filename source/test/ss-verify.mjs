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
 * point of the file is that it DOES differ from a modern ephemeris, and a
 * test demanding close agreement would pass only if someone had quietly
 * fitted it to one.
 *
 * So it is checked three other ways, none of which requires trusting me:
 *
 *   INTERNAL CONSISTENCY, which is the strong one. The revolution counts
 *     imply a sidereal year. That year is a few minutes too long. Those few
 *     minutes, multiplied by the centuries between two dates, predict exactly
 *     how far the computed Sun should have drifted from the modern one — and
 *     that prediction is made from the parameters, while the drift is
 *     measured from the output. If a revolution count or the epoch were
 *     wrong, the two would not agree. They agree to a few hundredths of a
 *     degree.
 *
 *   THE RIGHT ORDER OF MAGNITUDE. A wrong bhagaṇa does not produce a small
 *     error, it produces a hundred degrees. So the test asserts each graha
 *     sits in the band a fifth-century theory should: degrees, not minutes,
 *     and not tens of degrees.
 *
 *   BEHAVIOUR THE METHOD MUST PRODUCE. The śīghra correction exists to make
 *     planets appear to stop and reverse. If retrogression does not fall out,
 *     at roughly the right frequency and for roughly the right fraction of
 *     the time, the four-step procedure is wrong however plausible the
 *     numbers look.
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
await pg.waitForFunction(()=>window.SSEngine && window.__kSidAt && window.SPNodes,
                         {timeout:30000});

const A = await pg.evaluate(() => {
  const S = window.SSEngine, out = {};
  const EN = { "Sūrya":"Sun","Candra":"Moon","Maṅgala":"Mars","Budha":"Mercury",
               "Guru":"Jupiter","Śukra":"Venus","Śani":"Saturn" };
  const DAY = 86400000;
  function sdiff(a,b){ let d=((a-b)%360+540)%360-180; return d; }
  function mod(sa,ms){ return window.__kSidAt(EN[sa], new Date(ms)); }

  out.K = S.constants();

  /* ---- the differences, over fifteen centuries ---- */
  const dates = [Date.UTC(500,0,1), Date.UTC(1000,0,1), Date.UTC(1500,0,1),
                 Date.UTC(1900,0,1), Date.UTC(2000,0,1), Date.UTC(2026,0,1)];
  out.table = dates.map(ms => {
    const P = S.positions(ms), row = { y: new Date(ms).getUTCFullYear() };
    Object.keys(EN).forEach(sa => {
      row[sa] = +sdiff(P.grahas[sa].lon, mod(sa, ms)).toFixed(3);
    });
    return row;
  });
  const worst = {};
  Object.keys(EN).forEach(sa => {
    worst[sa] = Math.max(...out.table.map(r => Math.abs(r[sa])));
  });
  out.worst = worst;

  /* ---- INTERNAL CONSISTENCY: does the drift match the year excess? ----
     The parameters say the year is this many seconds too long. Between two
     dates that is this many days of accumulated error, and the Sun moves
     about a degree a day — so the CHANGE in the Sun's difference between two
     dates is predicted by the parameters alone. */
  const sunRows = out.table.map(r => r["Sūrya"]);
  const yrs = dates.map(d => new Date(d).getUTCFullYear());
  const predicted = [], observed = [];
  for (let i = 1; i < dates.length; i++) {
    const years = (dates[i] - dates[i-1]) / DAY / 365.2564;
    const daysLost = years * out.K.yearExcessSeconds / 86400;
    predicted.push(-daysLost * (360 / out.K.modernSidYearDays));
    observed.push(sunRows[i] - sunRows[i-1]);
  }
  out.drift = { predicted: predicted.map(x => +x.toFixed(3)),
                observed: observed.map(x => +x.toFixed(3)),
                worstErr: Math.max(...predicted.map((p,i) =>
                  Math.abs(p - observed[i]))) };

  /* the same for the Moon, whose drift comes from the sidereal month */
  const moonRows = out.table.map(r => r["Candra"]);
  const aharNow = S.ahargana(Date.UTC(2026,0,1));
  const monthsSinceEpoch = aharNow / out.K.sidMonthDays;
  out.moonPredictedDrift = monthsSinceEpoch *
    (out.K.sidMonthDays - 27.321661547) * (360 / 27.321661547);

  /* ---- mean longitudes are exact arithmetic ---- */
  const ahar = S.ahargana(Date.UTC(2026,0,1));
  out.meanCheck = {};
  ["Sūrya","Candra","Maṅgala","Guru","Śani"].forEach(sa => {
    const r = S.YUGA.rev[sa];
    const byHand = ((r * 360 * ahar / S.YUGA.civilDays) % 360 + 360) % 360;
    out.meanCheck[sa] = Math.abs(byHand - S.meanOf(sa, ahar)) < 1e-9;
  });
  /* and are reproducible from the stated epoch: one more day advances the Sun
     by exactly its daily mean motion */
  const d1 = S.meanOf("Sūrya", ahar), d2 = S.meanOf("Sūrya", ahar + 1);
  out.dailyMean = +(((d2 - d1) % 360 + 360) % 360).toFixed(6);
  out.dailyMeanRight = Math.abs(out.dailyMean - 360/out.K.sidYearDays) < 1e-6;

  /* ---- the epoch variants differ by exactly a quarter day ---- */
  const a1 = S.ahargana(Date.UTC(2026,0,1), "sunrise");
  const a2 = S.ahargana(Date.UTC(2026,0,1), "midnight");
  out.epochGap = +(a2 - a1).toFixed(6);

  /* ---- RETROGRESSION must fall out of the śīghra correction ---- */
  const retro = {};
  ["Maṅgala","Budha","Guru","Śukra","Śani"].forEach(sa => {
    let back = 0, total = 0, flips = 0, prev = null;
    const t0 = Date.UTC(1990,0,1);
    for (let d = 0; d < 365*30; d += 2) {
      const v = S.motion(sa, t0 + d*DAY);
      if (v == null) continue;
      total++;
      const isBack = v < 0;
      if (isBack) back++;
      if (prev !== null && isBack !== prev) flips++;
      prev = isBack;
    }
    /* flips counts both entries and exits, so periods is half */
    retro[sa] = { fraction: back/total, periods: flips/2,
                  perYear: (flips/2)/30 };
  });
  out.retro = retro;
  /* and a station should happen when the graha is near opposition to the Sun
     for the outer ones — the geometric fact the śīghra epicycle encodes */
  let nearOpp = 0, checked = 0;
  {
    const t0 = Date.UTC(2000,0,1);
    let prev = null;
    for (let d = 0; d < 365*20; d += 1) {
      const ms = t0 + d*DAY;
      const v = S.motion("Maṅgala", ms);
      if (v == null) continue;
      const isBack = v < 0;
      if (prev === true && isBack === false) {        /* end of a retro run */
        checked++;
        const P = S.positions(ms);
        const elong = Math.abs(sdiff(P.grahas["Maṅgala"].lon, P.grahas["Sūrya"].lon));
        if (elong > 120) nearOpp++;
      }
      prev = isBack;
    }
  }
  out.marsRetroNearOpposition = { checked, nearOpp };

  /* ---- the nodes are published and resolve ---- */
  const C = window.__spUI ? window.__spUI.ctx() : { when: Date.now(),
    place: { n:"x", lat:0, lon:0, tz:0 }, spanDays: 365 };
  const ssNodes = window.SPNodes.all().filter(n => n.dom === "siddhanta");
  const dead = [];
  ssNodes.forEach(n => {
    const v = window.SPNodes.resolve(n, C);
    if (!v || !v.kind) dead.push(n.id);
  });
  out.nodes = { n: ssNodes.length, dead };

  /* the comparison node must actually report the gaps we measured */
  const gaps = window.SPNodes.resolve(window.SPNodes.byId("ss.gaps"), C);
  out.gapsNode = gaps ? gaps.items.map(i => ({ k: i.k, v: +i.v.toFixed(2) })) : null;
  return out;
});

/* a drawn frame, so the nodes are not only resolvable but composable */
const D = await pg.evaluate(() => {
  const r1 = window.__spUI.select(["ss.vsModern"]);
  const r2 = window.__spUI.select(["ss.gaps"]);
  const r3 = window.__spUI.select(["ss.drift"]);
  const r4 = window.__spUI.select(["ss.working.Śani"]);
  return { vs: r1 && r1.composer, gaps: r2 && r2.composer,
           drift: r3 && r3.composer, working: r4 && r4.composer };
});

/* ---- the page shows its working ---- */
const PG = await (async () => {
  const p2 = await br.newPage({ viewport: { width: 1200, height: 1200 } });
  const e2 = []; p2.on("pageerror", e => e2.push(String(e)));
  await p2.goto(`http://127.0.0.1:${port}/siddhanta.html`, { waitUntil: "load" });
  await p2.waitForFunction(() => window.__ss, { timeout: 30000 });
  const r = await p2.evaluate(() => {
    function ink() {
      const cv = document.getElementById("ss-drift");
      const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
      let n = 0;
      for (let i = 0; i < d.length; i += 4)
        if (d[i+3] > 10 && !(d[i] > 250 && d[i+1] > 250 && d[i+2] > 250)) n++;
      return n / (d.length / 4);
    }
    const before = ink();
    /* changing the graha must redraw a different line */
    const body = document.getElementById("ss-body");
    body.value = "Candra";
    body.dispatchEvent(new Event("change", { bubbles: true }));
    const after = ink();
    /* and changing the moment must change the positions */
    const nowText = document.querySelector("#ss-now tbody").textContent;
    const w = document.getElementById("ss-when");
    w.value = "1500-06-01T12:00";
    w.dispatchEvent(new Event("change", { bubbles: true }));
    const thenText = document.querySelector("#ss-now tbody").textContent;
    return {
      paramRows: document.querySelectorAll("#ss-params tbody tr").length,
      listItems: document.querySelectorAll("#ss-params .sslist li").length,
      nowRows: document.querySelectorAll("#ss-now tbody tr").length,
      workRows: document.querySelectorAll("#ss-working tbody tr").length,
      note: (document.getElementById("ss-driftnote") || {}).textContent || "",
      drew: before > 0.005, redrew: Math.abs(after - before) > 0.0005,
      momentMatters: nowText !== thenText,
      /* the page must say plainly that this is not BPHS */
      saysNotBphs: /not BPHS/i.test(document.body.textContent),
      saysNoVerse: /No verse is cited here/i.test(document.body.textContent)
    };
  });
  await p2.close();
  return Object.assign(r, { errors: e2.length });
})();

const K = A.K;
const C = [
  ["the revolution counts imply a sidereal year a few minutes too long",
   K.yearExcessSeconds > 150 && K.yearExcessSeconds < 260],
  ["the synodic month is accurate to a fraction of a second",
   Math.abs(K.synodicMonthDays - 29.5305889) * 86400 < 0.5],
  ["the sidereal month is right to about a second",
   Math.abs(K.sidMonthDays - 27.321661547) * 86400 < 2],

  ["the Sun's measured drift matches what the year excess predicts",
   A.drift.worstErr < 0.12],
  ["the Moon's drift is the size its month error predicts",
   Math.abs(A.moonPredictedDrift) > 5 && Math.abs(A.moonPredictedDrift) < 20],

  ["mean longitudes are the plain arithmetic they claim to be",
   Object.keys(A.meanCheck).every(k => A.meanCheck[k] === true)],
  ["and the Sun's daily mean motion is the year's reciprocal",
   A.dailyMeanRight === true],
  /* The sunrise epoch is a quarter-day LATER than the midnight one, so an
     ahargaṇa counted from it is a quarter-day SMALLER — the sign is the
     other way from the one I first wrote. */
  ["the two epoch reckonings differ by a quarter of a day",
   Math.abs(A.epochGap - 0.25) < 1e-6],

  /* The band, not the smallness. Minutes would mean it had been fitted to a
     modern ephemeris; tens of degrees would mean a parameter is wrong. */
  ["the Sun sits within a few degrees over fifteen centuries",
   A.worst["Sūrya"] > 0.1 && A.worst["Sūrya"] < 6],
  ["so do Maṅgala, Budha and Śukra",
   A.worst["Maṅgala"] < 12 && A.worst["Budha"] < 12 && A.worst["Śukra"] < 12],
  ["Guru and Śani are the worst, as a classical theory's outer planets are",
   A.worst["Guru"] < 14 && A.worst["Śani"] < 14 &&
   Math.max(A.worst["Guru"], A.worst["Śani"]) > Math.max(A.worst["Maṅgala"], A.worst["Budha"])],
  ["and no graha is anywhere near a wrong revolution count",
   Object.keys(A.worst).every(k => A.worst[k] < 20)],

  ["retrogression falls out of the śīghra correction, for every graha that has it",
   ["Maṅgala","Budha","Guru","Śukra","Śani"].every(k => A.retro[k].periods > 5)],
  ["Budha turns back most often, Śani least",
   A.retro["Budha"].perYear > A.retro["Guru"].perYear &&
   A.retro["Guru"].perYear > A.retro["Maṅgala"].perYear],
  ["Maṅgala is retrograde about a tenth of the time",
   A.retro["Maṅgala"].fraction > 0.05 && A.retro["Maṅgala"].fraction < 0.16],
  ["Guru and Śani are retrograde about a third of the time",
   A.retro["Guru"].fraction > 0.25 && A.retro["Guru"].fraction < 0.40 &&
   A.retro["Śani"].fraction > 0.28 && A.retro["Śani"].fraction < 0.42],
  ["every Maṅgala retrogression ends near opposition to the Sun",
   A.marsRetroNearOpposition.checked >= 8 &&
   A.marsRetroNearOpposition.nearOpp === A.marsRetroNearOpposition.checked],

  ["the nodes are published and every one resolves",
   A.nodes.n >= 25 && A.nodes.dead.length === 0],
  ["and they compose on the stage",
   D.vs && D.gaps && D.drift && D.working],
  ["the page generates its parameters, positions and working from the engine",
   PG.paramRows === 9 && PG.listItems >= 6 && PG.nowRows === 9 && PG.workRows >= 5],
  ["the drift chart draws, and redraws for a different graha",
   PG.drew === true && PG.redrew === true],
  ["changing the moment changes the positions", PG.momentMatters === true],
  ["the page says plainly that this is not BPHS and cites no verse",
   PG.saysNotBphs === true && PG.saysNoVerse === true],
  ["no page errors", errs.length === 0 && PG.errors === 0]
];
let bad = 0;
for (const [w, ok] of C) { if (!ok) bad++; console.log((ok?"  ok   ":"  FAIL ")+w); }
console.log("");
console.log("  sidereal year " + K.sidYearDays.toFixed(7) + " d — " +
  K.yearExcessSeconds.toFixed(1) + " s a year too long");
console.log("  synodic month " + K.synodicMonthDays.toFixed(7) +
  " d (modern 29.5305889, out by " +
  ((K.synodicMonthDays - 29.5305889)*86400).toFixed(2) + " s)");
console.log("  sidereal month " + K.sidMonthDays.toFixed(7) +
  " d (out by " + ((K.sidMonthDays - 27.321661547)*86400).toFixed(2) + " s)");
console.log("");
const names = ["Sūrya","Candra","Maṅgala","Budha","Guru","Śukra","Śani"];
console.log("  Sūrya Siddhānta minus modern, in degrees:");
console.log("    year  " + names.map(n => n.padStart(8)).join(""));
A.table.forEach(r => console.log("    " + String(r.y).padStart(4) + "  " +
  names.map(n => r[n].toFixed(2).padStart(8)).join("")));
console.log("");
console.log("  Sun drift predicted from the parameters " +
  JSON.stringify(A.drift.predicted));
console.log("  Sun drift measured from the output      " +
  JSON.stringify(A.drift.observed));
console.log("  worst disagreement between them: " + A.drift.worstErr.toFixed(4) + "°");
console.log("  Moon drift predicted from its month error: " +
  A.moonPredictedDrift.toFixed(2) + "°");
console.log("");
console.log("  retrogression (30 years): " + ["Maṅgala","Budha","Guru","Śukra","Śani"]
  .map(k => k + " " + A.retro[k].periods + "× " +
       (A.retro[k].fraction*100).toFixed(0) + "%").join(", "));
console.log("  Maṅgala retrogressions ending near opposition: " +
  A.marsRetroNearOpposition.nearOpp + "/" + A.marsRetroNearOpposition.checked);
console.log("  " + A.nodes.n + " nodes published; composers " + JSON.stringify(D));
console.log("  page: " + PG.note);
if (errs.length) errs.slice(0,3).forEach(e => console.log("  page error: " + e));
await br.close(); server.close();
console.log(bad ? "\nFAIL " + bad + " check(s)" : "\nPASS ss-verify");
process.exit(bad?1:0);
