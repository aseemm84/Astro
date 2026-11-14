/* The Kālasetu Siddhānta long-span engine (kalasetu-engine.js): what it claims, and
 * that the site says it.
 *
 * THE CLAIM. Across 13000 BCE – 3600 CE, in three fitted sets, in the
 * Samanvaya–Ecliptic frame, the engine reproduces its reference — JPL DE422
 * over 3000 BCE – 3000 CE and an integration started from DE422 beyond it
 * (source/data/kalasetu-reference.json) — to arcminutes, on instants no fit
 * saw. The claim is tested on the reference file's own verification draw, made
 * with a different seed from every fit's, so the published residuals cannot be
 * flattering a fit's hold-out by accident of draw. Before 3000 BCE the Moon has
 * no independent reference; there it is reported, not held to a ceiling.
 *
 * THE OTHER CLAIMS, each a way it could quietly go wrong:
 *   – it holds across the span, not on average: no 600-year band is allowed to
 *     run away from the rest (that is exactly how the fitted Sūrya Siddhānta
 *     tier fails, and this suite measures that failure too, for contrast);
 *   – the frame really is Samanvaya–Ecliptic: the fitter's polynomial is
 *     engine.js's, and the fitter's copy of the modern true node is the
 *     engine's;
 *   – it is standalone: flipping the Sūrya Siddhānta between its tiers does
 *     not move it;
 *   – a chart cast with it says so, says the span, and says when a date falls
 *     outside it; Settings states its cost; Engine Lab shows the measurement;
 *   – a chart for a year 0–99 CE is placed in that year (Date.UTC reads those
 *     as 1900–1999 — found while building this engine).
 *
 * Run from the repo root: node source/test/kalasetu-verify.mjs
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { loadAstro, loadSL, sdiff, norm, SAMANVAYA, trueNodeModern, loadStoredReference } from "./fit-kalasetu.mjs";
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); }
catch (e) { ({ chromium } = createRequire("/opt/npm-tools/package.json")("playwright")); }

const ROOT = process.cwd();
let pass = 0, fail = 0;
const head = t => console.log("\n" + t);
const is = (c, t) => { if (c) { pass++; console.log("  ok   " + t); } else { fail++; console.log("  FAIL " + t); } };
const rms = a => Math.sqrt(a.reduce((p, c) => p + c * c, 0) / a.length);
const worst = a => Math.max(...a.map(Math.abs));

const DOC = JSON.parse(readFileSync(ROOT + "/source/data/kalasetu.json", "utf8"));
const DOCS = { core: DOC, early: JSON.parse(readFileSync(ROOT + "/source/data/kalasetu-early.json", "utf8")),
               deep: JSON.parse(readFileSync(ROOT + "/source/data/kalasetu-deep.json", "utf8")) };
const A = loadAstro(), SL = loadSL(A);

/* ---- 1. the data files, and the engine reading them ---------------------- */
head("the fitted numbers load, and the engine knows them");
is(SL.setData(DOC) && SL.isFitted(), "setData accepts kalasetu.json and the engine reports itself fitted");
is(SL.setData(DOCS.early, "early") && SL.setData(DOCS.deep, "deep"), "and its two earlier sets, kalasetu-early.json and kalasetu-deep.json");
is(Object.values(DOCS).every(d => d.frame === "samanvaya_ecliptic"), "every file names its frame: samanvaya_ecliptic");
is(DOC.span.label === "5000 BCE – 3600 CE" && DOCS.early.span.label === "9000 – 3000 BCE" && DOCS.deep.span.label === "13000 – 8000 BCE",
   "the three files carry their own spans");
is(SL.SPAN.label === "13000 BCE – 3600 CE", `with all three loaded the engine's span is their union (${SL.SPAN.label})`);
is(Object.entries(DOCS).every(([n, d]) => d.set === n && SL.BODIES.every(b => d.params[b] && SL.keysOf(b).every(k => n !== "core" ? typeof d.params[b][k] === "number" : true))),
   "every set names itself, and the older sets carry every parameter the engine has");
is(/notTheText/.test(JSON.stringify(DOC._provenance)) && /DE422/.test(DOC._provenance.target) && /Agreement with the reference/.test(DOC._provenance.limits),
   "the provenance says it is not the text's answer, that the reference is DE422 and an integration, and that it agrees with that reference");
is(DOC.moon && DOC.moon.fitted === true && DOCS.early.moon.fitted === false && DOCS.deep.moon.fitted === false,
   "the Moon is fitted on DE422 in the core set and carried, not refitted, into the older sets");
{
  const R = JSON.parse(readFileSync(ROOT + "/source/data/kalasetu-reference.json", "utf8"));
  const IC = R.integrator_check.bodies;
  is(Object.values(IC).every(x => x.worst < 10) && IC.Mercury.worst < 1.5 && IC.Earth.worst < 1.5,
     "the integration that stands in for DE422 stayed within 10″ of DE422 across DE422's own 6000 years (" +
     Object.entries(IC).map(([b, x]) => b + " " + x.worst + "″").join(", ") + ")");
  is(DOC.reference && DOC.reference.integrator_check && DOC.reference.modern_vs_reference, "the core file carries the reference's own measurements for the pages");
}

/* ---- 2. the claim, on a fresh draw ------------------------------------- */
head("a fresh sample across all sixteen millennia, drawn with a different seed from every fit's");
const FRESH = loadStoredReference("verify");
const inDE = s => s.src === "de422";
is(FRESH.length === 1800 && FRESH.some(s => new Date(s.ms).getUTCFullYear() < -12000), `the verification draw: ${FRESH.length} moments, 13000 BCE – 3600 CE`);
/* ceilings: the engine's real promise, per body, in Auto (every date read
   from the fit made for it, blended across seams). The planets everywhere;
   the Moon and true node where there is an independent reference (DE422). */
const CEIL = { "Sūrya": 0.6, "Rāhu": 0.3, "Budha": 2, "Śukra": 2, "Maṅgala": 3, "Guru": 1.5, "Śani": 1.5 };
const fresh = {};
for (const b of Object.keys(CEIL)) {
  const r = FRESH.map(s => sdiff(SL.longitude(b, s.ms), s.ref[b]) * 60);
  fresh[b] = { rms: rms(r), worst: worst(r) };
  is(fresh[b].rms <= CEIL[b], `${b}: ${fresh[b].rms.toFixed(2)}′ rms across the whole span (ceiling ${CEIL[b]}′), worst ${fresh[b].worst.toFixed(1)}′`);
}
{
  const de = FRESH.filter(inDE), m = de.map(s => sdiff(SL.longitude("Candra", s.ms), s.ref.Candra) * 60);
  const pub = DOC.residuals["Candra"].de.rms;
  is(rms(m) <= Math.max(pub * 1.35, pub + 0.15) && rms(m) < 1,
     `the Moon within DE422: ${rms(m).toFixed(2)}′ rms on ${de.length} fresh moments (published ${pub.toFixed(2)}′), worst ${worst(m).toFixed(1)}′`);
  const t = de.map(s => sdiff(SL.trueNode(s.ms), s.ref["Rāhu-true"]) * 60), tp = DOC.residuals["Rāhu (true)"].de.rms;
  is(rms(t) <= Math.max(tp * 1.35, tp + 0.15) && rms(t) < 2.5,
     `the true node within DE422: ${rms(t).toFixed(2)}′ rms (published ${tp.toFixed(2)}′) — the 1.5° wobble the Siddhānta tiers cannot give`);
  const out = FRESH.filter(s => !inDE(s) && new Date(s.ms).getUTCFullYear() < -2999).map(s => sdiff(SL.longitude("Candra", s.ms), s.ref.Candra) * 60);
  console.log(`       (before 3000 BCE the Moon is extrapolated: it differs from the corrected modern Moon by ${rms(out).toFixed(0)}′ rms — reported, not held to a ceiling)`);
}
{
  const lat = FRESH.filter(inDE).map(s => (SL.latitude("Candra", s.ms) - s.lat["Candra"]) * 60);
  is(rms(lat) < 2, `the Moon's latitude within DE422: ${rms(lat).toFixed(2)}′ rms`);
  const pl = ["Maṅgala", "Budha", "Guru", "Śukra", "Śani"].map(b => rms(FRESH.map(s => (SL.latitude(b, s.ms) - s.lat[b]) * 60)));
  /* latitude is fitted alongside longitude but weighs on nothing a chart
     prints except planetary war; the older fits' planes, against an ecliptic
     of date that is itself extrapolated there, are the hardest */
  is(Math.max(...pl) < 20, `the planets' latitudes: worst body ${Math.max(...pl).toFixed(2)}′ rms`);
}
{
  const all = Object.keys(CEIL).map(b => fresh[b].worst);
  is(Math.max(...all) < 60, `no planet on the fresh draw is a degree out at any moment — worst of all ${Math.max(...all).toFixed(1)}′`);
  const de = Object.keys(CEIL).map(b => worst(FRESH.filter(inDE).map(s => sdiff(SL.longitude(b, s.ms), s.ref[b]) * 60)));
  is(Math.max(...de) < 30, `within DE422 no planet is a D60 aṃśa (30′) out — worst ${Math.max(...de).toFixed(1)}′`);
}
{
  /* the seams: across the middle of each overlap the answer is blended, so a
     day's step never jumps */
  /* at each edge of each blend zone, a minute's motion before and after
     agree: no step, only the graha's own motion */
  const S = SL.sets(), edges = [];
  for (const [newer, older] of [["core", "early"], ["early", "deep"]]) {
    const lo = S[newer].from, hi = S[older].to;
    edges.push(lo + 0.2 * (hi - lo), hi - 0.2 * (hi - lo), (lo + hi) / 2);
  }
  const kink = t => Math.max(...["Sūrya", "Candra", "Budha", "Maṅgala", "Guru", "Śani"].map(b =>
    Math.abs(sdiff(SL.longitude(b, t + 60000), SL.longitude(b, t)) - sdiff(SL.longitude(b, t), SL.longitude(b, t - 60000))) * 3600));
  const z = edges.map(kink);
  is(z.every(x => x < 0.05), `at both seams' blend edges a minute's motion changes by under 0.05″ — no step (worst ${Math.max(...z).toFixed(4)}″)`);
  const f = y => { const t = new Date(Date.UTC(2000, 6, 1)); t.setUTCFullYear(y); return SL.setAt(t.getTime()); };
  is(f(2000).set === "core" && f(-6000).set === "early" && f(-11000).set === "deep" && f(-4000).blendWith === "early" && f(-8500).blendWith === "deep",
     "Auto reads 2000 CE from Core, 6001 BCE from Early, 11001 BCE from Deep, and blends across 4001 and 8501 BCE");
}

/* ---- 3. it holds across the span, not on average ------------------------ */
head("uniform across each fit's span");
for (const [n, d] of Object.entries(DOCS)) {
  const want = { core: 14, early: 10, deep: 8 }[n];
  for (const b of Object.keys(CEIL)) {
    const B = d.residuals[b].bands, top = Math.max(...B.map(x => x.rms));
    is(B.length === want && top <= Math.max(3.2 * d.residuals[b].holdout.rms, 0.5) && B.every(x => x.bias != null),
       `${n} · ${b}: worst 600-year band ${top.toFixed(2)}′ against ${d.residuals[b].holdout.rms.toFixed(2)}′ overall, every band with its bias`);
  }
}
{
  /* the contrast that is the reason this engine exists: the fitted Sūrya
     Siddhānta tier, fitted on 1800–2200, at the far end of the span */
  const g = { console, Date, Math, JSON, parseFloat, parseInt, isNaN, isFinite, String, Number, Array, Object, RegExp, Error };
  g.window = g; g.globalThis = g;
  const vm = await import("node:vm");
  vm.runInContext(readFileSync(ROOT + "/source/src/js/ss-engine.js", "utf8"), vm.createContext(g));
  const S = g.SSEngine; S.setMeasured(JSON.parse(readFileSync(ROOT + "/source/data/siddhanta-measured.json", "utf8"))); S.measured();
  const LAH = [0.000307083556492, 1.39688796382, 23.857092356];
  const lah = jd => { const T = (jd - 2451545) / 36525; return (LAH[0] * T + LAH[1]) * T + LAH[2]; };
  const far = FRESH.filter(s => inDE(s) && new Date(s.ms).getUTCFullYear() < -2400);
  const sam = far.map(s => (s.ref.Candra + (SAMANVAYA[0] * ((s.jd - 2451545) / 36525) ** 2 + SAMANVAYA[1] * ((s.jd - 2451545) / 36525) + SAMANVAYA[2])));
  const ssfit = rms(far.map((s, i) => sdiff(S.trueLongitude("Candra", S.ahargana(s.ms)).lon, norm(sam[i] - lah(s.jd))) * 60));
  const ours = rms(far.map(s => sdiff(SL.longitude("Candra", s.ms), s.ref.Candra) * 60));
  is(ssfit > 100 && ours < 2, `in 3000–2400 BCE the fitted SS tier's Moon is ${(ssfit / 60).toFixed(1)}° out of DE422; this engine's ${ours.toFixed(2)}′`);
}

/* ---- 4. the frame, and the fitter's copies of engine code ---------------- */
head("the frame and the copied references are the engine's own");
const ENG = readFileSync(ROOT + "/source/src/js/engine.js", "utf8");
{
  const m = ENG.match(/samanvaya_ecliptic:\s*\{[\s\S]*?c:\[([^\]]+)\]/);
  const c = m ? m[1].split(",").map(Number) : [];
  is(c.length === 3 && c.every((v, i) => v === SAMANVAYA[i]),
     "fit-kalasetu's polynomial is engine.js AYAN_MODES.samanvaya_ecliptic, digit for digit");
}
is(/function trueNodeModern\(date\)\{\s*var dt=0\.0005;/.test(ENG) && /Math\.atan2\(h\.x,-h\.y\)/.test(ENG),
   "engine.js's modern true node is the construction fit-kalasetu copies (osculating plane, ±0.0005 d)");

/* ---- 5. the span edges ---------------------------------------------------- */
head("the span, and outside it");
is(SL.inSpan(Date.UTC(-12999, 0, 1, 12)) && SL.inSpan(Date.UTC(3600, 11, 31, 12)), "1 Jan 13000 BCE and 31 Dec 3600 CE are inside");
is(!SL.inSpan(Date.UTC(-13000, 11, 31, 12)) && !SL.inSpan(Date.UTC(3601, 0, 1, 12)), "the day before and the day after are not");
{
  const a = SL.accuracyAt("Śani", Date.UTC(-10500, 6, 1)), m = SL.accuracyAt("Candra", Date.UTC(1500, 6, 1));
  is(a && a.set === "deep" && a.rms > 0 && a.bias != null && m && m.set === "core" && m.rms < 1,
     `accuracyAt gives the error bar for a graha in its era (Śani in 10501 BCE: ${a && a.rms}′ from the Deep fit; the Moon in 1500 CE: ${m && m.rms}′)`);
}

/* ---- 6. the site ---------------------------------------------------------- */
const browser = await chromium.launch();
async function page(file) {
  const c = await browser.newContext({ viewport: { width: 1280, height: 1400 } });
  const p = await c.newPage(); const errs = [];
  p.on("pageerror", e => errs.push(String(e && e.message || e)));
  await p.goto("file://" + ROOT + "/" + file);
  return { p, errs };
}

head("Kundli: casting with it");
{
  const { p, errs } = await page("kundli.html");
  await p.waitForFunction(() => window.buildLocalChart && window.__kEclipModern && window.KalasetuEngine, null, { timeout: 60000 });
  const opt = await p.evaluate(() => [...document.querySelectorAll("#k-engine option")].map(o => o.value));
  is(opt.includes("kalasetu"), "the Kundli engine picker offers it");
  const R = await p.evaluate(() => {
    const base = { month: 6, day: 21, hour: 12, minute: 0, lat: 23.1765, lon: 75.7885, tzHours: 5.5,
                   ayanamsa: "lahiri", houseSystem: "whole" };
    const one = (year, engine, node) => window.buildLocalChart(Object.assign({}, base, { year, engine, node: node || "mean", ssframe: "own" }));
    const out = {};
    for (const y of [-2500, 50, 1984, 3200]) {
      const L = one(y, "kalasetu", "true"), M = one(y, "modern", "true");
      const t = new Date(Date.UTC(2000, 5, 21, 6, 30)); t.setUTCFullYear(y);
      const jd = t.getTime() / 86400000 + 2440587.5;
      const d = {};
      L.grahas.forEach(g => { const m = M.grahas.find(x => x.key === g.key);
        /* the modern chart is in Lahiri; carry both to tropical to compare engines alone */
        d[g.key] = ((g.sidereal_deg + window.__ayanFor(L.ayanamsa_mode, jd)) -
                    (m.sidereal_deg + window.__ayanFor(M.ayanamsa_mode, jd))); });
      out[y] = { d, eng: L.engine, ay: L.ayanamsa_mode, nodeMode: L.node_mode, nodeNote: L.node_note, stamp: L.substrate_stamp };
    }
    const far = one(5000, "kalasetu");
    out.far = { eng: far.engine };
    /* the 0–99 CE instant: the modern chart for 50 CE must have its Sun where
       the modern ephemeris puts the Sun in 50 CE, not 1950 */
    const c50 = one(50, "modern");
    const sun50 = c50.grahas.find(g => g.key === "Sūrya" || g.key === "Sun").sidereal_deg;
    const ms50 = (() => { const d = new Date(Date.UTC(2000, 5, 21, 6, 30)); d.setUTCFullYear(50); return d.getTime(); })();
    const ref50 = window.__kEclipModern("Sun", ms50).trop - window.__ayanFor("lahiri", ms50 / 86400000 + 2440587.5);
    out.sun50 = { got: sun50, want: ((ref50 % 360) + 360) % 360 };
    return out;
  });
  /* against the modern chart where the modern engine is sound; at 2501 BCE
     the modern engine's own Moon and Saturn are about a degree off DE422, so
     only the inner planets are compared there */
  for (const y of [50, 1984, 3200]) {
    const d = Object.values(R[y].d).map(x => Math.abs((((x % 360) + 540) % 360 - 180) * 60));
    is(Math.max(...d) < 20, `${y + " CE"}: every graha and node within ${Math.max(...d).toFixed(1)}′ of the modern chart (tropical, so the frame drops out)`);
  }
  {
    const d = ["Sūrya", "Budha", "Śukra", "Maṅgala"].map(k => R[-2500].d[k]).filter(x => x != null).map(x => Math.abs((((x % 360) + 540) % 360 - 180) * 60));
    is(d.length === 4 && Math.max(...d) < 5, `2501 BCE: the Sun, Mercury, Venus and Mars within ${Math.max(...d).toFixed(1)}′ of the modern chart`);
  }
  is(R[1984].ay === "samanvaya_ecliptic", "in its own frame the chart is read in Samanvaya–Ecliptic, whatever was requested");
  is(R[1984].eng.mode === "kalasetu" && /Kālasetu Siddhānta/.test(R[1984].eng.name), "the payload names the engine");
  is(R[-2500].eng.span && R[-2500].eng.span.in_span === true && /inside the span/.test(R[-2500].eng.note) &&
     R[-2500].eng.span.fit && R[-2500].eng.span.fit.set === "core" && R[-2500].eng.span.expected_error["Candra"] && /Core fit/.test(R[-2500].eng.note),
     "2501 BCE is inside the span; the note names the fit it reads and the payload carries every graha's measured error there");
  is(R.far.eng.span && R.far.eng.span.in_span === false && /OUTSIDE THE SPAN/.test(R.far.eng.note),
     "5000 CE is outside it, and the note says so in capitals");
  is(R[1984].nodeMode === "true" && R[1984].nodeNote == null,
     "a true-node request is answered with the true node — this engine carries its periodic terms");
  is(/kalasetu-engine\.js/.test(R[1984].stamp), "the substrate stamp names kalasetu-engine.js");
  is(Math.abs(sdiff(R.sun50.got, R.sun50.want)) * 60 < 5,
     `a chart for 50 CE puts the Sun where 50 CE has it (${(sdiff(R.sun50.got, R.sun50.want) * 60).toFixed(2)}′) — not 1950`);

  /* the report badge */
  await p.evaluate(() => {
    const set = (id, v) => { const el = document.getElementById(id); el.value = String(v);
      el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); };
    set("k-name", "Long"); set("k-dob", "1984-12-15"); set("k-tob", "13:31");
    set("k-lat", 28.8386); set("k-lon", 78.7733); set("k-tz", 5.5); set("k-engine", "kalasetu"); set("k-ssframe", "own");
  });
  await p.click("#k-go");
  await p.waitForFunction(() => window.__kdata && window.__kdata.derived, null, { timeout: 60000 });
  await p.waitForTimeout(300);
  const badge = await p.evaluate(() => { const b = document.getElementById("k-engine-badge"); return b ? b.textContent : ""; });
  is(/Kālasetu Siddhānta/.test(badge) && /13000 BCE – 3600 CE/.test(badge) && /DE422/.test(badge) && /Core/.test(badge),
     "the report's badge names the engine, the span, its reference, and the fit this date reads");
  const conv = await p.evaluate(() => (document.getElementById("k-conv") || document.querySelector(".k-conv") || {}).textContent || document.body.textContent);
  is(/Samanvaya–Ecliptic \(the long-span engine's frame\)/.test(conv), "the conventions line names the frame");
  is(errs.length === 0, `no page errors (${errs.join("; ")})`);
}

head("Independence from the Sūrya Siddhānta's tiers");
{
  const { p } = await page("siddhanta.html");
  await p.waitForFunction(() => window.KalasetuEngine && window.SSEngine, null, { timeout: 60000 });
  const r = await p.evaluate(() => {
    const ms = Date.UTC(1000, 2, 1), a = window.KalasetuEngine.longitude("Candra", ms);
    window.SSEngine.panchaSaura(); const b = window.KalasetuEngine.longitude("Candra", ms);
    window.SSEngine.bare(); const c = window.KalasetuEngine.longitude("Candra", ms);
    return [a, b, c];
  });
  is(r[0] === r[1] && r[1] === r[2], "switching the Sūrya Siddhānta to the Pañca-saura tier and back leaves it bit-identical");
}

head("Settings: what choosing it as the default costs");
{
  const { p } = await page("kundli.html");
  await p.waitForFunction(() => window.__engineModes, null, { timeout: 60000 });
  const ok = await p.evaluate(() => !!window.__engineModes.kalasetu);
  is(ok, "the site's engine table carries it");
  const opened = await p.evaluate(() => { const b = document.querySelector("[data-nset-open],#nset-open,.nset-open"); if (b) b.click(); return !!b; });
  await p.waitForTimeout(300);
  const has = await p.evaluate(() => !!document.querySelector('select[data-nset="engine"] option[value="kalasetu"], [name="engine"] option[value="kalasetu"]'));
  if (opened && has) {
    await p.evaluate(() => { const s = document.querySelector('select[data-nset="engine"], [name="engine"]');
      s.value = "kalasetu"; s.dispatchEvent(new Event("change", { bubbles: true })); });
    await p.waitForTimeout(200);
    const t = await p.evaluate(() => (document.querySelector(".nsconfirm") || {}).textContent || "");
    is(/′ from JPL DE422 over 3000 BCE – 3000 CE/.test(t) && /13000 BCE – 3600 CE/.test(t),
       "the confirm box states its Moon in arcminutes against DE422, and the span");
  } else {
    const src = readFileSync(ROOT + "/source/src/js/settings.js", "utf8");
    is(/\["kalasetu", "Kālasetu Siddhānta — long span/.test(src) && /from JPL DE422 over/.test(src),
       "Settings offers it and its confirm states the cost (checked in source; the panel did not open here)");
  }
}

head("Engine Lab shows the measurement");
{
  const { p, errs } = await page("engine-lab.html");
  await p.waitForFunction(() => window.__slLab && document.querySelector("#el-sltab table"), null, { timeout: 60000 });
  const r = await p.evaluate(() => ({
    rows: document.querySelectorAll("#el-sltab tbody tr").length,
    heads: [...document.querySelectorAll("#el-sltab thead th")].map(t => t.textContent),
    live: document.querySelectorAll("#el-sllive tbody tr").length,
    note: document.getElementById("el-slnote").textContent }));
  is(r.rows === 9, "the residual table has the seven grahas and both nodes");
  is(r.heads.includes("13000 BCE") && r.heads.includes("3201 CE") && r.heads.length === 31,
     "its 28 era columns run from 13000 BCE to 3201 CE (the last takes the span to 3600 CE)");
  is(r.live === 9 && /never saw/.test(r.note) && /DE422/.test(r.note), "the live comparison fills, and the note says the figures are held back, against DE422");
  const before = await p.evaluate(() => document.getElementById("el-sllive").textContent);
  await p.evaluate(() => { const s = document.getElementById("el-slyear"); s.value = "2500"; s.dispatchEvent(new Event("input")); });
  const after = await p.evaluate(() => [document.getElementById("el-sllive").textContent, document.getElementById("el-slyearread").textContent]);
  is(after[0] !== before && /2500 CE/.test(after[1]), "dragging the year recomputes it");
  is(errs.length === 0, `no page errors (${errs.join("; ")})`);
}

head("The Kālasetu page");
{
  const { p, errs } = await page("kalasetu.html");
  await p.waitForFunction(() => window.__ksPage && document.querySelector("#ks-skytab tbody tr"), null, { timeout: 60000 });
  const r = await p.evaluate(() => ({
    sky: document.querySelectorAll("#ks-skytab tbody tr").length,
    wheel: document.querySelectorAll("#ks-wheel .ks-dot").length,
    steps: document.querySelectorAll("#ks-steps li").length,
    bands: document.querySelectorAll("#ks-bands rect").length,
    moon: document.querySelectorAll("#ks-moontab tbody tr").length,
    measure: document.querySelectorAll("#ks-measure tbody tr").length,
    charts: ["ks-gi", "ks-dt", "ks-node"].every(id => document.querySelector("#" + id + " path")),
    eras: document.querySelectorAll("#ks-eras tbody tr").length,
    errcol: [...document.querySelectorAll("#ks-skytab tbody tr:not(.ks-lagrow) td:nth-child(4)")].every(td => /±/.test(td.textContent)),
    cost: document.querySelectorAll("#ks-cost tbody tr").length,
    nav: !!document.querySelector('nav a[href="kalasetu.html"]'),
    wide: document.documentElement.scrollWidth > window.innerWidth + 1 }));
  is(r.sky === 11 && r.wheel === 9, "the sky table places the nine grahas, the true node and the lagna, and the wheel draws all nine");
  is(r.steps >= 5 && r.bands === 28 && r.moon === 36 && r.measure === 8 && r.cost === 9,
     "the steps, the 28 era bars, all 36 lunar terms, the measurement and the cost table render");
  is(r.eras === 28 && r.errcol, "the era table has every 600 years from 13000 BCE, and every graha in the sky table carries its error bar");
  is(r.charts, "the great-inequality, ΔT and node charts draw");
  is(r.nav, "the page is in the site navigation");
  /* a BCE moment, typed in, through the page's own controls */
  await p.evaluate(() => { const set = (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event("change", { bubbles: true })); };
    set("ks-era", "BCE"); set("ks-year", "3102"); set("ks-month", "2"); set("ks-day", "18"); set("ks-time", "00:00"); });
  const bce = await p.evaluate(() => ({ note: document.getElementById("ks-skynote").textContent, fit: document.getElementById("ks-fitread").textContent,
    diffs: [...document.querySelectorAll("#ks-skytab tbody tr:not(.ks-lagrow)")].slice(0, 4).map(tr => parseFloat(tr.lastElementChild.textContent)) }));
  /* the Sun, Moon, Mars and Mercury rows; the modern engine's Moon is itself ~1.5° off DE422 here, so the Moon is not compared */
  const inner = [bce.diffs[0], bce.diffs[2], bce.diffs[3]];
  is(/3102 BCE/.test(bce.note) && /Core/.test(bce.fit) && inner.every(d => Math.abs(d) < 5),
     `a BCE date typed into the page is placed, read from the Core fit, and the Sun, Mars and Mercury are within ${Math.max(...inner.map(Math.abs)).toFixed(1)}′ of the modern engine`);
  /* thirteen thousand years back: typed in, read from Deep, the Moon flagged as extrapolated */
  const deep = await p.evaluate(() => { const set = (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event("change", { bubbles: true })); };
    set("ks-era", "BCE"); set("ks-year", "12500"); set("ks-month", "3"); set("ks-day", "21"); set("ks-time", "06:00");
    return { note: document.getElementById("ks-skynote").textContent, fit: document.getElementById("ks-fitread").textContent,
             moon: document.querySelector("#ks-skytab tbody tr:nth-child(2) td:nth-child(4)").textContent }; });
  is(/12500 BCE/.test(deep.note) && /Deep/.test(deep.fit) && /extrapolated/.test(deep.moon) && /extrapolated from DE422/.test(deep.note),
     "12500 BCE typed in: read from the Deep fit, and the Moon's error bar and the note say it is extrapolated");
  const forced = await p.evaluate(() => { window.__ksPage.useFit("core"); const t = document.getElementById("ks-fitread").textContent;
    window.__ksPage.useFit("auto"); return t; });
  is(/Forced to the Core fit/.test(forced) && /outside that fit's own span/.test(forced), "forcing the Core fit at 12500 BCE says its error bars do not apply there");
  /* the place: the lagna, the clock, and the grahas unmoved */
  const pl = await p.evaluate(() => {
    const set = (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event("change", { bubbles: true })); };
    set("ks-tmode", "zone");
    set("ks-era", "CE"); set("ks-year", "1984"); set("ks-month", "12"); set("ks-day", "15"); set("ks-time", "13:31");
    const read = () => ({ ms: window.__ksPage.state().ms, lag: document.querySelector(".ks-lagrow td:nth-child(2)").textContent,
      sun: document.querySelector("#ks-skytab tbody tr td:nth-child(2)").textContent, note: document.getElementById("ks-skynote").textContent });
    const a = read();                                  /* Ujjain, the place's clock (IST) */
    set("ks-lat", "51.4769"); set("ks-lon", "-0.0005");
    const b = read();                                  /* Greenwich, same clock reading */
    set("ks-tmode", "lmt");
    const c = read();
    return { a, b, c };
  });
  is(pl.a.ms === Date.UTC(1984, 11, 15, 8, 1), `13:31 on the place's clock at Ujjain is 08:01 UT (${new Date(pl.a.ms).toISOString()})`);
  is(pl.b.lag !== pl.a.lag, `moving the place moves the lagna (${pl.a.lag} at Ujjain, ${pl.b.lag} at Greenwich)`);
  is(/Custom coordinates/.test(pl.b.note) && /local mean time|UT/.test(pl.c.note), "the note names the place and the clock");
  is(pl.c.ms === pl.b.ms, "changing what the clock means keeps the instant and rewrites the clock");
  /* the time scroller: a month is a calendar month, a century is a hundred years, the slider reaches back */
  const sc = await p.evaluate(() => {
    const set = (id, v, ev) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event(ev || "change", { bubbles: true })); };
    set("ks-tmode", "ut");
    set("ks-era", "CE"); set("ks-year", "2000"); set("ks-month", "1"); set("ks-day", "31"); set("ks-time", "06:00");
    const out = {};
    set("ks-unit", "month"); document.querySelector('[data-ks-step="1"]').click();
    out.month = new Date(window.__ksPage.state().ms).toISOString();
    set("ks-unit", "century"); document.querySelector('[data-ks-step="-10"]').click();
    out.century = new Date(window.__ksPage.state().ms).toISOString();
    set("ks-unit", "year"); set("ks-scrub", "-150", "input");
    out.scrub = new Date(window.__ksPage.state().ms).getUTCFullYear();
    out.read = document.getElementById("ks-scrubread").textContent;
    set("ks-scrub", "-150", "change");
    out.after = document.getElementById("ks-scrub").value;
    set("ks-unit", "century"); for (let i = 0; i < 20; i++) document.querySelector('[data-ks-step="-10"]').click();
    out.edge = new Date(window.__ksPage.state().ms).getUTCFullYear();
    return out;
  });
  is(/^2000-02-29T06:00/.test(sc.month), `one month on from 31 January 2000 is the last day of February (${sc.month.slice(0, 10)})`);
  is(/^1000-02-28T06:00/.test(sc.century), `ten centuries back from 29 Feb 2000 is 28 Feb 1000, not a leap year (${sc.century.slice(0, 10)})`);
  is(sc.scrub === 850 && /150 years/.test(sc.read), `the slider reaches 150 years back (${sc.scrub}) and says so`);
  is(sc.after === "0", "releasing the slider picks it up again from the new moment");
  is(sc.edge === -12999, "stepping back stops at the span's first year, 13000 BCE");
  /* the step-through ends on the engine's own number */
  const st = await p.evaluate(() => { const g = document.getElementById("ks-graha"); g.value = "Śani"; g.dispatchEvent(new Event("change"));
    const li = [...document.querySelectorAll("#ks-steps li")]; return { n: li.length, last: li[li.length - 1].textContent }; });
  is(st.n >= 8 && /Samanvaya–Ecliptic/.test(st.last), `Śani's working runs to the answer in ${st.n} steps`);
  /* switching off Candraśekhara's terms makes the Moon measurably worse */
  const mo = await p.evaluate(() => { const before = document.getElementById("ks-moonerr").textContent;
    const c = document.querySelector('[data-ks-group="cs"]'); c.checked = false; c.dispatchEvent(new Event("change", { bubbles: true }));
    return [before, document.getElementById("ks-moonerr").textContent]; });
  const num = t => { const m = t.match(/typically ([\d.]+)(°|′)/); return m ? (+m[1]) * (m[2] === "°" ? 60 : 1) : NaN; };
  is(num(mo[1]) > 20 * num(mo[0]), `without Candraśekhara's three terms the Moon goes from ${num(mo[0]).toFixed(2)}′ to ${num(mo[1]).toFixed(0)}′`);
  is(errs.length === 0, `no page errors (${errs.join("; ")})`);
  const ph = await browser.newPage({ viewport: { width: 400, height: 900 } });
  await ph.goto("file://" + ROOT + "/kalasetu.html");
  await ph.waitForFunction(() => window.__ksPage, null, { timeout: 60000 });
  is(await ph.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "at phone width the page does not scroll sideways");
}

head("Engine Lab carries Kālasetu as its fourth engine");
{
  const { p, errs } = await page("engine-lab.html");
  await p.waitForFunction(() => document.querySelector("#el-answer table"), null, { timeout: 60000 });
  const cols = await p.evaluate(() => { const out = {};
    for (const q of ["lon", "rashi", "d9", "retro", "tithi", "nak", "yoga", "karana", "vara", "sunrise", "lagna", "sankranti", "syzygy"]) {
      const s = document.getElementById("el-q"); s.value = q; s.dispatchEvent(new Event("change"));
      out[q] = [...document.querySelectorAll("#el-answer thead th")].map(t => t.textContent); }
    return out; });
  is(Object.values(cols).every(h => h.includes("Kālasetu")), "every question carries a Kālasetu column");
  const err = await p.evaluate(() => [...document.querySelectorAll("#el-errtab thead th")].some(t => /Kālasetu/.test(t.textContent)));
  is(err, "the error table carries Kālasetu");
  await p.evaluate(() => { document.getElementById("el-n").value = "120"; document.querySelector('[data-el="roll"]').click(); });
  await p.waitForFunction(() => /Kālasetu/.test(document.getElementById("el-rates").textContent), null, { timeout: 60000 });
  const rates = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll("#el-rates tbody tr")]
    .map(r => [r.children[0].textContent, parseFloat(r.children[1].textContent)])));
  is(rates["the nakṣatra, Kālasetu"] >= 98 && rates["the tithi exactly, Kālasetu"] >= 98,
     `over 1900–2100 Kālasetu names the almanac's nakṣatra ${rates["the nakṣatra, Kālasetu"]}% and tithi ${rates["the tithi exactly, Kālasetu"]}% of the time`);
  is(errs.length === 0, `no page errors (${errs.join("; ")})`);
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) { console.log("FAIL"); process.exit(1); }
console.log("the long-span engine holds across the span, and the site says what it is");
