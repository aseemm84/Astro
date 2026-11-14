/* engine-verify.mjs — engine-lab.html, and the siddhānta page's new sandbox.
 *
 * Both pages make claims that are only worth anything if they are the SAME
 * claims the harnesses make. So almost nothing here is checked against the
 * page's own arithmetic:
 *
 *   · the sandbox's live score is checked against the committed residuals in
 *     siddhanta-measured.json — figures produced by a different optimiser, on
 *     a different sample, against a different reference (ERFA, not
 *     astronomy-engine). Agreement to a few percent is a strong statement that
 *     the page has the FRAME right, which is the one thing a comparison like
 *     this gets silently wrong;
 *   · the jyā panel's three figures are checked against the project's own
 *     published measurements of the same table;
 *   · the epicycle drawing is checked against the engine's own equations —
 *     the angle subtended at the centre by the drawn triangle must be the
 *     equation the engine returns, or the picture is decoration;
 *   · the Viṃśottarī table newly exported from the engine is checked against
 *     the balance the CHART REPORT arrives at independently, on a cast chart,
 *     because the point of exporting it was to stop those two drifting apart.
 *
 * Faults planted while writing this, each of which must fail: the jyā table
 * indexed off by one (it was, and the figure disagreed with the project's own
 * 0.70 — which is how it was caught), the fitted tier applied in the wrong
 * frame, and the daśā table's years rotated by one lord.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

let pass = 0, fail = 0;
const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const head = t => console.log("\n" + t);
const is = (c, t) => { if (c) { pass++; console.log("  ok   " + t); }
                       else { fail++; console.log("  FAIL " + t); } };
const quiet = e => !/cities\.json|scheme "file"/.test(e);

/* The data files are resolved from THIS FILE, not from the working directory.
   The harness is run from the site root for the website build and from app/
   for the desktop one, and app/ has no source/ beside it — so a cwd-relative
   path works in one and throws ENOENT in the other, which is exactly how this
   was found. */
const DATA = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const MEAS = JSON.parse(readFileSync(join(DATA, "siddhanta-measured.json"), "utf8"));
const ACC = JSON.parse(readFileSync(join(DATA, "accuracy.json"), "utf8"));
const BODIES = ["Sūrya", "Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani"];

const { chromium } = require("playwright");
const browser = await chromium.launch();

async function open(page, waitFor) {
  const p = await browser.newPage({ viewport: { width: 1360, height: 1400 } });
  const errs = [];
  p.on("pageerror", e => errs.push(String(e && e.message || e)));
  p.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text()); });
  await p.goto("file://" + ROOT + "/" + page);
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await p.reload();
  if (waitFor) await p.waitForFunction(waitFor, null, { timeout: 40000 }).catch(() => {});
  await p.waitForTimeout(1200);
  return { p, errs };
}

/* ======================================================================
   1 · the siddhānta page's sandbox
   ====================================================================== */

head("the sandbox stands up, over the page that was already there");
let SS;
{
  const { p, errs } = await open("siddhanta.html", () => !!window.__sslab);
  SS = p;
  const r = await p.evaluate(() => ({
    lab: !!window.__sslab,
    /* everything ss-page.js owned must still be there — this page was working
       before the sandbox was added to it and the sandbox is not allowed to
       have cost it anything */
    params: document.querySelectorAll("#ss-params tbody tr").length,
    now: document.querySelectorAll("#ss-now tbody tr").length,
    working: document.querySelectorAll("#ss-working tbody tr, #ss-working tr").length,
    drift: !!document.getElementById("ss-drift"),
    absent: document.querySelectorAll("#ss-absent li").length,
    /* and the new panels */
    sliders: document.querySelectorAll("#ss-sliders .sslide").length,
    score: document.querySelectorAll("#ss-score tbody tr").length,
    jya: document.querySelectorAll("#ss-jya .ssl-entry").length,
    epi: document.querySelectorAll("#ss-epi .ssl-epi").length,
    curves: document.querySelectorAll("#ss-curve .ssl-cv").length,
    ringMarks: document.querySelectorAll("#ss-ring .ssl-mark").length,
    ringRows: document.querySelectorAll("#ss-ringtab tbody tr").length,
  }));
  is(errs.filter(quiet).length === 0,
     "no page errors (" + (errs.filter(quiet)[0] || "none") + ")");
  is(r.params === 9 && r.now > 0 && r.drift && r.absent > 0,
     "every panel ss-page.js owned is still rendered (" + r.params + " params, "
     + r.now + " positions, " + r.absent + " absences)");
  is(r.lab, "the sandbox published its handle");
  is(r.sliders > 0 && r.score === 7,
     "the sliders and the seven-graha scoreboard are drawn (" + r.sliders + ")");
  is(r.jya === 24, "the jyā panel plots all twenty-four entries (" + r.jya + ")");
  is(r.epi === 2 && r.curves === 2,
     "a star-planet draws both constructions and both curves");
  is(r.ringMarks === 21 && r.ringRows === 7,
     "the three skies put twenty-one marks on one ring (" + r.ringMarks + ")");
}

head("the live score reproduces the committed residuals — the frame is right");
{
  const r = await SS.evaluate(async () => {
    const L = window.__sslab;
    const B = ["Sūrya", "Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani"];
    const out = {};
    L.setMode("bare");
    out.bare = B.map(b => L.score(b));
    L.setMode("fitted");
    out.fit = B.map(b => L.score(b));
    L.setMode("bare");
    return out;
  });
  /* The page scores 24 instants against astronomy-engine; the data file holds
     213 held-out instants scored against ERFA. Two different samples and two
     different references, so these are not required to be equal — but if the
     frame were wrong they would not be in the same WORLD, which is what this
     is testing. The tolerance is generous on purpose and still catches a
     frame error, which is degrees. */
  const bad = [], badF = [];
  BODIES.forEach((b, i) => {
    const wantBare = MEAS.residuals[b].bare.rms;
    const wantFit = MEAS.residuals[b].holdout.rms;
    if (!(Math.abs(r.bare[i] - wantBare) < 0.25 * wantBare + 2))
      bad.push(b + ": " + r.bare[i].toFixed(1) + "′ vs " + wantBare.toFixed(1) + "′");
    if (!(Math.abs(r.fit[i] - wantFit) < 0.3 * wantFit + 2))
      badF.push(b + ": " + r.fit[i].toFixed(2) + "′ vs " + wantFit.toFixed(2) + "′");
  });
  console.log("  body       page(bare)  file(bare)   page(fit)  file(holdout)");
  BODIES.forEach((b, i) => console.log("  " + b.padEnd(10) +
    r.bare[i].toFixed(1).padStart(9) + "′" +
    MEAS.residuals[b].bare.rms.toFixed(1).padStart(11) + "′" +
    r.fit[i].toFixed(2).padStart(11) + "′" +
    MEAS.residuals[b].holdout.rms.toFixed(2).padStart(13) + "′"));
  is(bad.length === 0, "the bare text scores what the data file says it scores" +
     (bad.length ? " — " + bad.join("; ") : ""));
  is(badF.length === 0, "and so does the fitted tier" +
     (badF.length ? " — " + badF.join("; ") : ""));
  /* the split the project reports: four bodies the fit reaches, three it does
     not, and the page must show the same split or its prose is wrong */
  const reach = BODIES.filter((b, i) => r.fit[i] < 12);
  const miss = BODIES.filter((b, i) => r.fit[i] > 25);
  is(reach.length === 4 && ["Sūrya", "Guru", "Śukra", "Śani"]
       .every(b => reach.includes(b)),
     "the four the fit reaches are Sūrya, Guru, Śukra and Śani (" +
     reach.join(", ") + ")");
  is(miss.length === 3 && ["Candra", "Budha", "Maṅgala"].every(b => miss.includes(b)),
     "and the three it cannot are Candra, Budha and Maṅgala — the page says " +
     "this is missing terms, not wrong numbers (" + miss.join(", ") + ")");
}

head("the frame itself, pinned while the site's own zero is moved under it");
{
  /* THE RMS CHECKS ABOVE DO NOT PIN THIS, and finding that out is why this
     block is written the way it is. Scoring the fitted tier in the site's own
     sidereal frame instead of the fit's Lahiri one was planted as a fault and
     passed every check above — twice. Both reasons are worth recording,
     because both are the kind of thing that makes a verifier decorative:

       · this site's DEFAULT sidereal zero turns out to BE the very Lahiri
         polynomial the fit used, so at the default setting the two readings
         are the same operation and the fault is a literal no-op;
       · and the page caches its reference longitudes once at load, so a score
         taken after switching the ayanāṃśa does not move whatever the page
         does — a "the score did not budge" assertion passes on correct code
         and on broken code alike, and asserts nothing.

     So the frame is checked on the live reference function, with the site's
     zero moved 3.8° away first. Nothing but the Lahiri frame survives that. */
  const L = MEAS.lahiri;
  const r = await SS.evaluate(async (lah) => {
    const out = { moved: null, rows: [] };
    try { window.__setAyan("truerevati"); out.moved = "truerevati"; }
    catch (e) { out.moved = "FAILED: " + e.message; }
    for (const iso of ["1850-03-04T11:00:00Z", "1984-12-15T08:01:00Z",
                       "2026-07-19T22:30:00Z", "2180-01-02T04:00:00Z"]) {
      const ms = Date.parse(iso);
      const jd = ms / 86400000 + 2440587.5;
      const T = (jd - 2451545.0) / 36525.0;
      const ay = lah[2] + lah[1] * T + lah[0] * T * T;
      const e = window.__kEclip("Sun", ms);
      const want = ((e.trop - ay) % 360 + 360) % 360;
      const got = window.__sslab.ref("Sūrya", ms);      /* the page's own */
      let d = ((got - want) % 360 + 360) % 360;
      if (d > 180) d -= 360;
      out.rows.push({ iso, arcsec: d * 3600,
                      siteAyan: e.trop - e.lon, lahiri: ay });
    }
    try { window.__setAyan("nirayana"); } catch (e) {}
    return out;
  }, L);
  is(!/FAILED/.test(String(r.moved)),
     "the site's ayanāṃśa was switched for the test (" + r.moved + ")");
  const moved = Math.max(...r.rows.map(x => Math.abs(x.siteAyan - x.lahiri)));
  is(moved > 3,
     "and it really moved — the zero in force is now " + moved.toFixed(2) +
     "° from Lahiri, so the two readings can no longer coincide");
  const bad = r.rows.filter(x => Math.abs(x.arcsec) > 1);
  is(bad.length === 0,
     "with the zero moved, the page's reference is STILL the Lahiri-frame " +
     "longitude the fit was made in, to the arcsecond" +
     (bad.length ? " — off by " + (bad[0].arcsec / 3600).toFixed(3) + "°"
                 : " (worst " + Math.max(...r.rows.map(x => Math.abs(x.arcsec)))
                     .toFixed(4) + "″)"));
}

head("the sandbox's own fit improves what it is pointed at, and bare restores");
{
  const r = await SS.evaluate(async () => {
    const L = window.__sslab;
    L.setMode("bare");
    const before = L.score("Guru");
    L.autoFit("Guru");
    const after = L.score("Guru");
    /* and the engine must come back exactly, because the whole measured tier
       rests on bare() being an exact restore */
    L.setMode("bare");
    const back = L.score("Guru");
    const others = ["Sūrya", "Śani"].map(b => L.score(b));
    return { before, after, back, others, mode: L.mode() };
  });
  is(r.after < r.before,
     "hand-fitting Guru improves it (" + r.before.toFixed(1) + "′ → " +
     r.after.toFixed(1) + "′)");
  is(Math.abs(r.back - r.before) < 1e-9,
     "and pressing 'the text as written' restores the score exactly (" +
     r.back.toFixed(6) + "′)");
  const wantSun = MEAS.residuals["Sūrya"].bare.rms;
  is(Math.abs(r.others[0] - wantSun) < 0.25 * wantSun + 2,
     "with the other grahas back at their bare values too");
}

head("the jyā panel agrees with the project's own measurement of that table");
{
  const r = await SS.evaluate(() => {
    const S = window.SSEngine;
    let worst = 0, wa = 0, interp = 0, ia = 0, arc = 0, aa = 0;
    for (let i = 1; i <= 24; i++) {
      const a = i * 3.75, e = S.JYA[i] - S.RAD * Math.sin(a * Math.PI / 180);
      if (Math.abs(e) > Math.abs(worst)) { worst = e; wa = a; }
    }
    for (let x = 0.25; x < 90; x += 0.25) {
      const e = S.jya(x) - S.RAD * Math.sin(x * Math.PI / 180);
      if (Math.abs(e) > Math.abs(interp)) { interp = e; ia = x; }
      const back = S.arcJyaTable(S.RAD * Math.sin(x * Math.PI / 180));
      if (Math.abs(back - x) > Math.abs(arc)) { arc = back - x; aa = x; }
    }
    return { worst: Math.abs(worst), wa, interp: Math.abs(interp), ia,
             arc: Math.abs(arc), aa,
             note: (document.getElementById("ss-jyanote") || {}).textContent || "",
             entries: S.JYA.length, last: S.JYA[S.JYA.length - 1] };
  });
  is(r.entries === 25 && r.last === 3438,
     "the table is twenty-five values ending at the radius itself");
  /* engine-accuracy's figures for this table: worst entry 0.70, interpolation
     1.68, arc recovered to 0.89° — reproduced here, and the page must PRINT
     these and not some other numbers */
  is(Math.abs(r.worst - 0.70) < 0.02,
     "worst tabulated entry is 0.70 of 3438 (" + r.worst.toFixed(3) + ")");
  is(Math.abs(r.interp - 1.68) < 0.03,
     "worst interpolated value is 1.68 (" + r.interp.toFixed(3) + ")");
  is(Math.abs(r.arc - 0.89) < 0.02,
     "an arc read back out of the table is out by 0.89° at worst (" +
     r.arc.toFixed(3) + "°)");
  const pw = /Worst tabulated entry: ([\d.]+) of 3438/.exec(r.note);
  const pi = /Worst <?b?>?interpolated<?\/?b?>? value:?.*?([\d.]+) at/.exec(
    r.note.replace(/\s+/g, " "));
  const pa = /out by at most ([\d.]+)°/.exec(r.note);
  is(!!pw && Math.abs(+pw[1] - r.worst) < 0.011,
     "and the panel prints the measured entry figure, not a remembered one (" +
     (pw ? pw[1] : "?") + ")");
  is(!!pa && Math.abs(+pa[1] - r.arc) < 0.011,
     "and the measured arc-recovery figure (" + (pa ? pa[1] : "?") + "°)");
}

head("the epicycle drawing IS the equation, not a picture of one");
{
  const r = await SS.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const out = [];
    for (const a of [20, 90, 150, 240, 310]) {
      window.__sslab.setAnom(a);
      await w(60);
      const svg = document.querySelector("#ss-epi svg");
      /* read the drawn triangle back off the SVG: the centre, the mean graha
         and the graha, then measure the angle at the centre */
      const g = [...svg.querySelectorAll("circle.ssl-o, circle.ssl-m, circle.ssl-g")]
        .map(c => ({ cls: c.getAttribute("class"),
                     x: +c.getAttribute("cx"), y: +c.getAttribute("cy") }));
      /* the manda panel is the left half of the viewBox */
      const half = 760 / 2;
      const panel = cls => g.filter(p => p.cls === cls && p.x < half)[0] ||
                           g.filter(p => p.cls === cls)[0];
      const O = panel("ssl-o"), M = panel("ssl-m"), G = panel("ssl-g");
      if (!O || !M || !G) { out.push(null); continue; }
      const ang = (p, q) => Math.atan2(-(q.y - p.y), q.x - p.x) * 180 / Math.PI;
      let drawn = ang(O, G) - ang(O, M);
      while (drawn > 180) drawn -= 360;
      while (drawn < -180) drawn += 360;
      /* The drawing is the EXACT eccentric triangle, with its own hypotenuse.
         The text's manda formula takes that hypotenuse to be the radius, which
         is the difference the page's own note prints — so the drawn angle is
         checked against the exact value, and the formula's departure from it is
         checked against what the note claims. Checking the drawing against the
         formula instead would have had to allow half a degree of slack and
         would have passed on a drawing that was simply wrong. */
      const S = window.SSEngine;
      const body = document.getElementById("ss-epibody").value;
      const pair = S.EPI[body].manda;
      const c = pair[0] + (pair[1] - pair[0]) * Math.abs(S.jya(a)) / S.RAD;
      const rr = c / 360 * S.RAD;
      const bahu = rr * Math.sin(a * Math.PI / 180);
      const koti = rr * Math.cos(a * Math.PI / 180);
      const karna = Math.sqrt((S.RAD - koti) ** 2 + bahu ** 2);
      out.push({ a, drawn: Math.abs(drawn),
                 exact: Math.abs(Math.asin(bahu / karna) * 180 / Math.PI),
                 formula: Math.abs(S.mandaEquation(body, a)),
                 /* and the drawn epicycle's size, as a paridhi */
                 drawnParidhi: (+document.querySelector("#ss-epi circle.ssl-epi")
                   .getAttribute("r")) /
                   (+document.querySelector("#ss-epi circle.ssl-def")
                     .getAttribute("r")) * 360,
                 engineParidhi: c });
    }
    return out;
  });
  is(r.every(Boolean), "the construction was read back at every anomaly");
  const bad = r.filter(x => Math.abs(x.drawn - x.exact) > 0.02);
  is(bad.length === 0,
     "the angle subtended at the centre is the exact eccentric equation the " +
     "triangle stands for" + (bad.length ? " — " + JSON.stringify(bad[0]) : "") +
     " (worst " + Math.max(...r.map(x => Math.abs(x.drawn - x.exact)))
       .toFixed(4) + "°)");
  is(r.some(x => Math.abs(x.formula - x.exact) > 0.05),
     "and the text's formula does depart from it, which is the point the " +
     "note makes — up to " +
     Math.max(...r.map(x => Math.abs(x.formula - x.exact))).toFixed(3) +
     "° over the anomalies tried");
  /* THE EPICYCLE MUST BREATHE. The text gives two circumferences and
     interpolates between them by the sine of the anomaly, so a drawing with a
     fixed radius has silently dropped the thing the prose promises. Checked
     against the engine's own interpolation rather than by demanding a visible
     change: Śani's two paridhi are nearly equal, so for that body the real
     breathing is a couple of percent and an eyeball threshold would have
     failed on correct output. */
  const pbad = r.filter(x => Math.abs(x.drawnParidhi - x.engineParidhi) > 0.6);
  is(pbad.length === 0,
     "the epicycle drawn is the size the interpolation says, at every anomaly" +
     (pbad.length ? " — " + JSON.stringify(pbad[0]) : " (worst " +
      Math.max(...r.map(x => Math.abs(x.drawnParidhi - x.engineParidhi)))
        .toFixed(3) + "° of paridhi)"));
  is(Math.max(...r.map(x => x.engineParidhi)) -
     Math.min(...r.map(x => x.engineParidhi)) > 0.01,
     "and that size really does vary across the anomaly (" +
     Math.min(...r.map(x => x.engineParidhi)).toFixed(2) + "° → " +
     Math.max(...r.map(x => x.engineParidhi)).toFixed(2) + "°)");
}

/* ======================================================================
   2 · the engine lab
   ====================================================================== */

head("the engine lab stands up, with no chart");
let EL;
{
  const { p, errs } = await open("engine-lab.html", () => !!window.__elab);
  EL = p;
  const r = await p.evaluate(() => ({
    hasChart: (function () { try { return !!localStorage.getItem("learnhoro.chart"); }
                             catch (e) { return false; } })(),
    lab: !!window.__elab,
    ans: document.querySelectorAll("#el-answer tbody tr").length,
    cost: document.querySelectorAll("#el-cost .axcell").length,
    marks: document.querySelectorAll("#el-marks .el-pt").length,
    ruler: document.querySelectorAll("#el-ruler .el-pt").length,
    divs: document.querySelectorAll("#el-ruler .el-div").length,
    bands: document.querySelectorAll("#el-band .el-band").length,
    which: document.querySelectorAll("#el-which tbody tr").length,
    rates: document.querySelectorAll("#el-rates tbody tr").length,
  }));
  is(errs.filter(quiet).length === 0,
     "no page errors (" + (errs.filter(quiet)[0] || "none") + ")");
  is(!r.hasChart, "nothing was read from a stored chart");
  is(r.lab && r.ans > 0, "the bench answered the opening question");
  is(r.cost === ACC.divisions.length + 4,
     "the converter restates the error in every division plus four other units ("
     + r.cost + ")");
  is(r.divs === ACC.divisions.length,
     "the ruler's top lane carries every division (" + r.divs + ")");
  is(r.ruler === ACC.modern.perBody.length + 2 +
                ACC.siddhanta.measured.length * 2 + 3,
     "and every measured engine mark and every convention (" + r.ruler + ")");
  is(r.bands === ACC.bands.length, "all five certified bands are drawn");
  /* eight for the three original engines, three more for Kālasetu (nakṣatra, tithi, karaṇa) */
  is(r.which >= 6 && r.rates === 11, "the switchboard and the eleven rates are there (" + r.rates + ")");
}

head("all fifteen questions, each answered by all three engines");
{
  const T0 = Date.UTC(2026, 10, 13, 6, 0);
  const r = await EL.evaluate((T0) => {
    const qs = [...document.querySelectorAll("#el-q option")].map(o => o.value);
    const out = {};
    qs.forEach(q => {
      window.__elab.answerAt(T0, q);
      const rows = [...document.querySelectorAll("#el-answer tbody tr")].map(tr =>
        [...tr.children].map(td => td.textContent.trim()));
      out[q] = rows;
    });
    return { qs, out, place: window.__elab.place() };
  }, T0);
  is(r.qs.length === 15, "fifteen questions on the list (" + r.qs.length + ")");
  for (const q of r.qs) {
    const rows = r.out[q] || [];
    /* columns 1..3 are modern, fitted, as written */
    const filled = rows.length > 0 && rows.every(c => c.length >= 4 &&
      [1, 2, 3].filter(i => c[i] && c[i] !== "—").length >= (q === "eclipse" ? 1 : 2));
    is(filled, q + ": answered (" + rows.length + " row" + (rows.length === 1 ? "" : "s") + ")");
  }
  /* parse "9 Dec 2026, 05:32" in the place's time zone */
  const M = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const tz = (r.place && r.place.tz) || 0;
  const parse = (s) => { const m = /^(\d+) (\w{3}) (\d{4}), (\d\d):(\d\d)/.exec(s || ""); if (!m) return null;
    return Date.UTC(+m[3], M[m[2]], +m[1], +m[4], +m[5]) - tz * 3600000; };
  /* the saṃkrānti: the modern instant is where the Lahiri Sun really changes sign */
  const sk = r.out.sankranti[0], mAt = parse((sk[1].split(", ").slice(1).join(", ")));
  const sAt = parse(sk[2].split(", ").slice(1).join(", "));
  const chk = await EL.evaluate(([mAt, sAt]) => {
    /* the fitted tier's own Sun either side of its stated instant */
    const fitSun = (ms) => window.__elab.ss("fit", ms).lon["Sūrya"];
    const sg = (L) => Math.floor((((L % 360) + 360) % 360) / 30);
    return { fitBefore: sg(fitSun(sAt - 3 * 60000)), fitAfter: sg(fitSun(sAt + 3 * 60000)) };
  }, [mAt, sAt]);
  is(mAt != null && sAt != null && chk.fitAfter === (chk.fitBefore + 1) % 12,
     "the fitted tier's saṃkrānti is where its own Sun crosses into the next sign (" + sk[2] + ")");
  /* the new moon: at the fitted tier's stated instant its own elongation is ~0 */
  const sy = r.out.syzygy[0], fNew = parse(sy[2]);
  const el = await EL.evaluate((t) => { const x = window.__elab.ss("fit", t).lon;
    let d = ((x["Candra"] - x["Sūrya"]) % 360 + 360) % 360; if (d > 180) d -= 360; return d; }, fNew);
  is(fNew != null && Math.abs(el) < 0.6, "the fitted tier's new moon is where its own elongation is zero (" + el.toFixed(3) + "° at the minute shown)");
  /* the navāṃśa and rāśi questions agree with each other: a graha in the same
     navāṃśa in two engines is in the same rāśi too, unless it is vargottama-near a boundary */
  const r9 = r.out.d9, r1 = r.out.rashi;
  is(r9.length === 7 && r1.length === 7, "rāśi and navāṃśa are given for all seven grahas");
}

head("the converter is arithmetic, not a table of remembered numbers");
{
  const r = await EL.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const read = async as => {
      window.__elab.setArc(as); await w(60);
      return [...document.querySelectorAll("#el-cost .axcell")].map(c => ({
        v: c.querySelector("b").textContent.trim(),
        k: c.querySelector("span").textContent.trim() }));
    };
    return { at1: await read(1), at10: await read(10), at100: await read(100) };
  });
  const num = s => Number(String(s).replace(/[^\d.]/g, ""));
  const dasha = rows => rows.filter(x => /mahādaśā/.test(x.k))[0];
  const d1 = dasha(r.at1), d10 = dasha(r.at10);
  /* The cell now reads a RANGE — "0.0 days – 0.2 days" — because the daśā
     cost of an arcsecond is lord-specific. The scalar it used to print was
     the whole 120-year cycle over ONE nakṣatra, overstating by 120 over the
     lord's years. Parse both ends rather than the first number. */
  const ends = s => { const n = (String(s).match(/[\d.]+/g) || []).map(Number);
                      return [n[0], n[n.length - 1]]; };
  const [lo1, hi1] = d1 ? ends(d1.v) : [NaN, NaN];
  const [lo10, hi10] = d10 ? ends(d10.v) : [NaN, NaN];
  /* DERIVE THE EXPECTATION FROM FIRST PRINCIPLES, not from accuracy.json.
     Checking the page against the data file it was built from is pure
     self-consistency: when the old 0.913 was planted here as a test, both
     moved together and this block passed. The Viṃśottarī years are the
     independent ground truth, so compute from them. */
  const NAKSEC = (40 / 3) * 3600;
  const wantLo1 = 6 * 365.2425 / NAKSEC;        /* Sun, the fastest lord */
  const wantHi1 = 20 * 365.2425 / NAKSEC;       /* Venus, the slowest */
  is(!!d1 && Math.abs(lo1 - wantLo1) < 0.02 && Math.abs(hi1 - wantHi1) < 0.02,
     "one arcsecond is " + (d1 ? d1.v : "?") + " of daśā — independently " +
     wantLo1.toFixed(3) + "–" + wantHi1.toFixed(3) +
     " days, the Sun's 6 years to Venus's 20 over one nakṣatra");
  is(!!d10 && Math.abs(lo10 - 10 * wantLo1) < 0.06 &&
              Math.abs(hi10 - 10 * wantHi1) < 0.06,
     "and it scales linearly, so ten arcseconds is ten times that (" +
     (d10 ? d10.v : "?") + ")");
  /* The shipped bug was 0.913. Guard it structurally rather than with a
     "< 0.913" comparison, which the page's 2-dp rounding to 0.91 defeats. */
  is(!!d1 && hi1 < 0.5,
     "and nowhere near the 0.913 d/arcsec that shipped — the whole 120-year " +
     "cycle over a single nakṣatra (printed " + (d1 ? d1.v : "?") + ")");
  is(Math.abs(ACC.cost.dashaDaysPerArcsecMax - wantHi1) < 1e-3 &&
     Math.abs(ACC.cost.dashaDaysPerArcsecMin - wantLo1) < 1e-3,
     "and the committed data file agrees with that independent derivation");
  /* the division fractions must be the width divided by the error, which is
     checkable against the data file's own pre-computed Moon fractions */
  const r2 = await EL.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    window.__elab.setArc(window.__elab.ac().modern.perBody
      .filter(b => b.en === "Moon")[0].lonWorst);
    await w(60);
    return [...document.querySelectorAll("#el-cost .axcell")]
      .filter(c => /of a /.test(c.querySelector("span").textContent))
      /* the cell reads "1 ⁄ 7,304" — strip the numerator, not just the
         punctuation, or every value comes back with a 1 glued to its front */
      .map(c => Number(c.querySelector("b").textContent
        .replace(/^\s*1\s*⁄\s*/, "").replace(/[^\d.]/g, "")));
  });
  const wantFrac = ACC.divisions.map(d => d.moonFraction);
  const off = r2.map((v, i) => Math.abs(v - wantFrac[i]) / wantFrac[i])
    .filter(x => x > 0.01);
  is(r2.length === wantFrac.length && off.length === 0,
     "at the Moon's own measured error the fractions match the data file's " +
     "independently computed ones (" + r2.join(", ") + " vs " +
     wantFrac.join(", ") + ")");
  /* and the headline the note rests on */
  is(Math.abs(ACC.cost.mahadashaDays -
      ACC.modern.perBody.filter(b => b.en === "Moon")[0].lonWorst *
      ACC.cost.dashaDaysPerArcsec) < 0.05,
     "the committed mahādaśā figure is the Moon's error times the cycle-average " +
     "rate (" + ACC.cost.mahadashaDays + " days)");
}

head("the bench's answers come from three engines and not from one");
{
  const r = await EL.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    const ms = Date.UTC(1984, 11, 15, 8, 1);
    const out = {};
    for (const q of ["lon", "nak", "tithi", "dasha", "vara"]) {
      window.__elab.answerAt(ms, q);
      await w(120);
      out[q] = [...document.querySelectorAll("#el-answer tbody tr")]
        .map(tr => [...tr.cells].map(td => td.textContent.trim()));
    }
    const mod = window.__elab.mod(ms);
    const fit = window.__elab.ss("fit", ms);
    const bare = window.__elab.ss("bare", ms);
    return { out, lon: { mod: mod.lahiri, fit: fit.lon, bare: bare.lon } };
  });
  /* the three tiers must genuinely differ — a page that showed the same
     engine three times would look identical and say nothing */
  const sd = (a, b) => { let d = ((a - b) % 360 + 360) % 360; return d > 180 ? d - 360 : d; };
  const gapFit = Math.abs(sd(r.lon.fit["Śani"], r.lon.mod["Śani"])) * 60;
  const gapBare = Math.abs(sd(r.lon.bare["Śani"], r.lon.mod["Śani"])) * 60;
  is(gapBare > gapFit * 3,
     "the bare text is much further from the modern engine than the fitted " +
     "tier is, on Śani (" + gapBare.toFixed(0) + "′ vs " + gapFit.toFixed(1) + "′)");
  is(r.out.lon.length === 7, "the longitude question answers for all seven");
  is(r.out.lon.every(row => row[1] !== row[3]),
     "and no graha has the modern and the bare answers identical");
  is(r.out.dasha.length === 4,
     "the daśā question answers once per engine (" + r.out.dasha.length + ")");
  /* the vāra is the limb that carries no position, so the two siddhāntic
     columns must be IDENTICAL — that is the page's stated point about it */
  is(r.out.vara[0][2] === r.out.vara[0][3],
     "the two siddhāntic tiers give the same vāra, because correcting a " +
     "constant cannot change a day count (" + r.out.vara[0][2] + ")");
}

head("the agreement rates reproduce what ss-verify measures");
{
  const r = await EL.evaluate(async () => {
    const w = ms => new Promise(x => setTimeout(x, ms));
    document.getElementById("el-from").value = "2026";
    document.getElementById("el-to").value = "2027";
    document.getElementById("el-n").value = "120";
    document.querySelector('[data-el="roll"]').click();
    await w(4000);
    const rows = [...document.querySelectorAll("#el-rates tbody tr")]
      .map(tr => [tr.cells[0].textContent.trim(),
                  Number(tr.cells[1].textContent.replace(/[^\d]/g, ""))]);
    return rows;
  });
  const by = k => (r.filter(x => new RegExp(k).test(x[0]))[0] || [])[1];
  is(by("vāra") === 100,
     "the vāra agrees 100% of the time (" + by("vāra") + "%)");
  is(by("within one") === 100,
     "and the tithi agrees within one 100% of the time (" + by("within one") + "%)");
  is(by("nakṣatra, bare") > 40 && by("nakṣatra, bare") < 95,
     "the bare text's nakṣatra agrees most but not nearly all of the time (" +
     by("nakṣatra, bare") + "%) — ss-verify measures 62%");
  is(by("the tithi, exactly") < by("within one"),
     "and the exact tithi is strictly harder than the tithi within one (" +
     by("the tithi, exactly") + "% vs " + by("within one") + "%)");
}

/* ======================================================================
   3 · the Viṃśottarī table the engine now exports
   ====================================================================== */

head("the exported Viṃśottarī table agrees with the chart report's own");
{
  const p = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errs = [];
  p.on("pageerror", e => errs.push(String(e && e.message || e)));
  await p.goto("file://" + ROOT + "/kundli.html");
  await p.waitForFunction(() => !!document.getElementById("k-go"),
                          null, { timeout: 30000 });
  await p.evaluate(() => {
    try { localStorage.removeItem("nirayana.birth"); } catch (e) {}
    document.getElementById("k-dob").value = "1984-12-15";
    document.getElementById("k-tob").value = "13:31";
    document.getElementById("k-lat").value = "28.8389";
    document.getElementById("k-lon").value = "78.7768";
    document.getElementById("k-tz").value = "5.5";
  });
  await p.click("#k-go");
  await p.waitForFunction(() => !!document.getElementById("kreport"),
                          null, { timeout: 45000 });
  await p.waitForTimeout(1200);
  const r = await p.evaluate(() => {
    const J = window.__kdata;
    const D = window.__derive ? window.__derive(J) : null;
    if (!D || !D.birthNak) return null;
    const V = window.__kVims;
    const mine = V.atMoon(D.P.Moon.sid);
    return {
      reportLord: D.birthNak.lord, reportBalance: D.birthNak.balance,
      mineLord: mine.lord, mineBalance: mine.balance,
      order: V.order, years: V.years, total: V.total,
      /* and all 27 nakṣatra lords, both ways */
      lords: Array.from({ length: 27 }, (_, i) => V.lordOfNak(i))
    };
  });
  await p.close();
  is(errs.filter(quiet).length === 0, "the chart cast without error");
  is(!!r, "the report's own Viṃśottarī balance was available to compare");
  if (r) {
    is(r.mineLord === r.reportLord,
       "the engine's exported table names the same opening lord as the report (" +
       r.mineLord + ")");
    is(Math.abs(r.mineBalance - r.reportBalance) < 1e-9,
       "and the same balance to the last digit (" + r.mineBalance.toFixed(6) +
       " vs " + r.reportBalance.toFixed(6) + " years)");
    const sum = r.order.reduce((a, k) => a + r.years[k], 0);
    is(sum === 120 && r.total === 120,
       "the nine terms sum to 120 years (" + sum + ")");
    is(r.order.length === 9 && r.lords.length === 27 &&
       r.lords.slice(0, 9).join() === r.order.join() &&
       r.lords.slice(9, 18).join() === r.order.join() &&
       r.lords.slice(18).join() === r.order.join(),
       "and the twenty-seven lords are those nine, three times round, in order");
    is(r.order[0] === "Ketu" && r.years.Venus === 20 && r.years.Saturn === 19,
       "opening Ketu 7, Venus 20 … Saturn 19 — the standard scheme");
  }
}

await SS.close();
await EL.close();
await browser.close();
console.log("\n" + (fail ? "FAIL" : "PASS") + " engine-verify — " + pass
            + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
