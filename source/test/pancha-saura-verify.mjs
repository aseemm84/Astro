/* pancha-saura-verify — Varāhamihira's Saura as a constants tier.
 *
 * WHAT THIS GUARDS, in order of how badly it would hurt:
 *
 *  1. bare() MUST restore bit-identically. This is a CONSTANTS tier: unlike
 *     measured(), which corrects revolutions through a multiplicative bīja
 *     applied at use, this one mutates YUGA.rev and YUGA.civilDays directly.
 *     restoreConstants() had been snapshotting the revolutions all along and
 *     never putting them back, because nothing had ever changed them. If
 *     bare() misses them, every later caller silently gets Varāhamihira's
 *     numbers under the Later Sūrya Siddhānta's name — a wrong answer with no
 *     symptom. So the suite computes a full position set bare, switches to the
 *     PS tier, switches back, and demands the identical numbers.
 *
 *  2. Nothing is borrowed any more, and that is asserted, not assumed. Four
 *     quantities used to be the Later SS's because the OCR had not reached
 *     them; on 14 November 2026 all four were read from Ch. IX (not XVI, where
 *     the old note looked) and replaced with the text's own. The list stays,
 *     empty, and the page must print "none" from it.
 *
 *  3. The text-verified figures must be the text's. Spot-checked against
 *     claude/pancasiddhantika-cross-check.md and
 *     claude/romaka-and-pancha-saura-parameters.md, which record the OCR.
 *
 * Run from the repo root: node source/test/pancha-saura-verify.mjs
 */
import { createRequire } from "module";
let chromium;
try { ({ chromium } = await import("playwright")); }
catch { ({ chromium } = createRequire(import.meta.url)("playwright")); }

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log("  ok   " + m); };
const no = (m) => { fail++; console.log("  FAIL " + m); };
const is = (c, m) => (c ? ok(m) : no(m));
const head = (h) => console.log("\n" + h);

const br = await chromium.launch();
const pg = await br.newPage();
const errs = [];
pg.on("pageerror", (e) => errs.push(String(e)));
await pg.goto("file://" + process.cwd() + "/siddhanta.html");
await pg.waitForFunction(() => window.SSEngine && window.SSEngine.positions,
  null, { timeout: 40000 });

head("the tier is present and starts off");
is(await pg.evaluate(() => typeof window.SSEngine.panchaSaura) === "function",
  "SSEngine.panchaSaura() exists");
is(await pg.evaluate(() => window.SSEngine.isPanchaSaura()) === false,
  "and is NOT on by default — bare() is the shipped state");

/* ---- 1. the restore regression ---------------------------------------- */
head("bare() restores bit-identically after the tier has run");
const snap = () => pg.evaluate(() => {
  const E = window.SSEngine;
  const out = { rev: {}, civilDays: E.YUGA.civilDays, epi: {}, mandocca: {}, pos: {} };
  for (const k in E.YUGA.rev) out.rev[k] = E.YUGA.rev[k];
  for (const k in E.EPI) out.epi[k] = JSON.stringify(E.EPI[k]);
  for (const k in E.MANDOCCA) out.mandocca[k] = E.MANDOCCA[k];
  /* four widely spaced instants, so a constant that only matters far from
     epoch cannot hide */
  [-62135596800000, 0, 946684800000, 1762000000000].forEach((ms, i) => {
    const p = E.positions(ms, "sunrise");
    const g = {};
    for (const b in p.grahas) g[b] = p.grahas[b].lon;
    out.pos["t" + i] = { ahargana: p.ahargana, g };
  });
  return out;
});
const before = await snap();
await pg.evaluate(() => window.SSEngine.panchaSaura());
is(await pg.evaluate(() => window.SSEngine.isPanchaSaura()) === true,
  "the tier reports itself on after panchaSaura()");
const during = await snap();
await pg.evaluate(() => window.SSEngine.bare());
is(await pg.evaluate(() => window.SSEngine.isPanchaSaura()) === false,
  "and off again after bare()");
const after = await snap();

is(JSON.stringify(before.rev) === JSON.stringify(after.rev),
  "YUGA.rev is restored exactly — the gap this tier exposed in restoreConstants()");
is(before.civilDays === after.civilDays,
  "YUGA.civilDays is restored (" + after.civilDays + ")");
is(JSON.stringify(before.epi) === JSON.stringify(after.epi),
  "EPI is restored exactly, both quadrant entries");
is(JSON.stringify(before.mandocca) === JSON.stringify(after.mandocca),
  "MANDOCCA is restored exactly");
is(JSON.stringify(before.pos) === JSON.stringify(after.pos),
  "and every computed longitude at four instants is bit-identical to before");

/* The check above is worthless unless the tier actually MOVED something. */
is(JSON.stringify(during.pos) !== JSON.stringify(before.pos),
  "the tier does change the positions while it is on — so the restore check " +
  "above is not vacuous");

/* ---- 2. nothing is borrowed: the four are Ch. IX's ---------------------- */
head("the four once-borrowed quantities are the text's own, from Ch. IX");
const info = await pg.evaluate(() => window.SSEngine.panchaSauraInfo());
is(Array.isArray(info.borrowed) && info.borrowed.length === 0,
  "no quantity is declared borrowed (got " + (info.borrowed || []).length + ")");
is(/R = 120/.test(info.notImplemented || ""),
  "and the tier still states that the PS's own R = 120 trigonometry is NOT implemented");
is(/Kuppanna Sastry/.test(info.source || "") && /1993/.test(info.source || "") && /IX/.test(info.source || ""),
  "the edition is named, with its date, and Ch. IX is among the chapters cited");
const SRC = info.sources || {};
is(/IX\.3–4/.test(SRC["YUGA.rev.candraUcca"] || "") && /IX\.5–6/.test(SRC["YUGA.rev.Rāhu"] || "") &&
   /IX\.7–8/.test(SRC["EPI.Candra"] || "") && /IX\.7/.test(SRC["MANDOCCA.Sūrya"] || ""),
  "each of the four carries its verse");

await pg.evaluate(() => window.SSEngine.panchaSaura());
const live = await pg.evaluate(() => ({
  candraUcca: window.SSEngine.YUGA.rev.candraUcca,
  rahu: window.SSEngine.YUGA.rev["Rāhu"],
  candraEpi: window.SSEngine.EPI.Candra.manda.slice(),
  suryaMandocca: window.SSEngine.MANDOCCA["Sūrya"]
}));
/* IX.3–4 and IX.5–6 as written, over the Mahāyuga; Sastry's notes give the
   integers these must land on: 4,88,219 and 2,32,226 */
const D = 1577917800;
const apo = (D * 900 / 2908789) * (1 + 10 / (297 * 1296000));
const nod = D * 2700 / 18345827;
is(Math.abs(live.candraUcca - apo) < 1e-6 && Math.abs(live.candraUcca - 488219) < 0.001,
  "the Moon's apogee: IX.3–4's rule, " + live.candraUcca.toFixed(5) +
  " revolutions per Mahāyuga — Sastry's 4,88,219 (the Later SS has " +
  before.rev.candraUcca.toLocaleString("en-US") + ")");
is(Math.abs(-live.rahu - nod) < 1e-6 && Math.abs(-live.rahu - 232226) < 0.01,
  "the node: IX.5–6's rule, " + (-live.rahu).toFixed(4) +
  " — Sastry's 2,32,226 with the 46″ excess he notes the author neglected (Later SS " +
  (-before.rev["Rāhu"]).toLocaleString("en-US") + ")");
is(live.rahu < 0, "and the node still runs backwards, deducted from 12 rāśis as IX.6 says");
is(live.candraEpi[0] === 31 && live.candraEpi[1] === 31,
  "the Moon's epicycle is IX.7–8's single 31°, in both quadrant entries (Later SS " +
  before.epi.Candra + ")");
is(live.suryaMandocca === 80,
  "the Sun's apogee is IX.7's 80° (Later SS " + before.mandocca["Sūrya"].toFixed(2) + "°)");

/* SASTRY'S OWN WORKED EXAMPLE, IX.4 Ex. 3: 5,28,931 days from epoch, Ujjain
   mean noon on 21 May 1953 (06:57 UT). His apogee is rā. 5-5-33.2. The node is
   worked here by IX.5–6's rule as printed, for the same day. The tier counts
   from Kali with the text's epoch longitudes; the verse counts from Śaka 427
   with a kṣepa — two routes to one number, so they must agree. */
const ex = await pg.evaluate(() => {
  const E = window.SSEngine, ms = Date.UTC(1953, 4, 21, 6, 57);
  E.bare(); let a = E.ahargana(ms);
  const bare = { apo: E.trueLongitude("Candra", a).ucca, rahu: E.trueLongitude("Rāhu", a).lon };
  E.panchaSaura(); a = E.ahargana(ms);
  const ps = { apo: E.trueLongitude("Candra", a).ucca, rahu: E.trueLongitude("Rāhu", a).lon };
  /* left in the tier, as found: the checks below read its live constants */
  return { bare, ps };
});
const days = 528931;
const xr = (days * 2700 + 6313219) / 18345827, ruleRahu = ((-xr % 1) + 1) % 1 * 360;
const sastryApo = 150 + 5 + 33.2 / 60;
const dm = (a, b) => { let x = a - b; while (x > 180) x -= 360; while (x < -180) x += 360; return Math.abs(x) * 60; };
is(dm(ex.ps.apo, sastryApo) < 3,
  "Sastry's Example 3: the apogee is rā. 5-5-33.2; the tier gives " + ex.ps.apo.toFixed(3) +
  "°, " + dm(ex.ps.apo, sastryApo).toFixed(1) + "′ apart (the later constants: " +
  (dm(ex.bare.apo, sastryApo) / 60).toFixed(1) + "° apart)");
is(dm(ex.ps.rahu, ruleRahu) < 3,
  "and IX.5–6's rule, worked for that day, gives Rāhu " + ruleRahu.toFixed(3) + "°; the tier " +
  ex.ps.rahu.toFixed(3) + "°, " + dm(ex.ps.rahu, ruleRahu).toFixed(1) + "′ apart");

/* ---- 3. the text's own figures ---------------------------------------- */
head("the text-verified constants are the text's");
is(during.civilDays === 1577917800,
  "yuga civil days are 1,577,917,800 (PS I.14 ×24)");
is(before.civilDays - during.civilDays === 28,
  "which is 28 days short of the Later SS — the Ardharātrika gap");
const yr = during.civilDays / 4320000;
is(Math.abs(yr - 365.25875) < 1e-6,
  "implied year 365.258750 d (" + yr.toFixed(6) + ")");
const REV = { "Sūrya": 4320000, "Candra": 57753336, "Maṅgala": 2296824,
              "Budha": 17937000, "Guru": 364220, "Śukra": 7022388,
              "Śani": 146564 };
Object.keys(REV).forEach((b) => {
  is(during.rev[b] === REV[b], b + " revolutions " + REV[b].toLocaleString("en-US"));
});
is(during.rev.Guru === before.rev.Guru,
  "Guru is the one that agrees exactly with the Later SS — a result, not a default");
is(during.rev["Candra"] === 2406389 * 24,
  "Candra is PS I.14's 2,406,389 lunar revolutions × 24");

head("one circumference, not two — the later recension added the second");
const EPI_PS = { "Maṅgala": [70, 234], "Budha": [28, 132], "Guru": [32, 72],
                 "Śukra": [14, 260], "Śani": [60, 40] };
const liveEpi = await pg.evaluate(() => {
  const o = {}; for (const k in window.SSEngine.EPI)
    o[k] = { manda: window.SSEngine.EPI[k].manda.slice(),
             sighra: window.SSEngine.EPI[k].sighra
               ? window.SSEngine.EPI[k].sighra.slice() : null };
  return o;
});
Object.keys(EPI_PS).forEach((b) => {
  const e = liveEpi[b], [m, s] = EPI_PS[b];
  is(e.manda[0] === m && e.manda[1] === m,
    b + " manda is " + m + " in BOTH quadrant entries, so it does not breathe");
  is(e.sighra[0] === s && e.sighra[1] === s,
    b + " śīghra is " + s + " in both");
});
is(liveEpi["Sūrya"].manda[0] === 14 && liveEpi["Sūrya"].manda[1] === 14,
  "the Sun's manda is 14 — the text notes Śukra's manda 14° IS the Sun's own");

head("mandocca agrees exactly on all five star-planets");
["Maṅgala", "Budha", "Guru", "Śukra", "Śani"].forEach((b) => {
  is(during.mandocca[b] === before.mandocca[b],
    b + " mandocca unchanged (" + during.mandocca[b] + "°) — text-verified agreement");
});

/* ---- 4. what the swap is worth, structurally -------------------------- */
head("the measured consequences follow from which constants changed");
const d = await pg.evaluate(() => {
  const E = window.SSEngine;
  const at = (y) => Date.UTC(y, 2, 15, 6, 0, 0);
  const grab = () => {
    const o = {};
    [500, 2026].forEach((y) => {
      const p = E.positions(at(y), "sunrise"), g = {};
      for (const b in p.grahas) g[b] = p.grahas[b].lon;
      o[y] = g;
    });
    return o;
  };
  E.bare(); const ss = grab();
  E.panchaSaura(); const ps = grab();
  E.bare();
  const out = {};
  Object.keys(ss[500]).forEach((b) => {
    out[b] = {};
    [500, 2026].forEach((y) => {
      let x = ps[y][b] - ss[y][b];
      while (x > 180) x -= 360; while (x < -180) x += 360;
      out[b][y] = Math.abs(x * 60);        /* arcminutes */
    });
  });
  return out;
});
const star = ["Maṅgala", "Budha", "Guru", "Śukra", "Śani"];
is(star.every((b) => d.Guru[2026] <= d[b][2026]),
  "Guru moves least of the five star-planets (" + d.Guru[2026].toFixed(1) +
  "′), because its revolutions are the one figure that agrees exactly");
is(d.Budha[2026] > d.Budha[500] * 2,
  "Budha's gap GROWS with distance from epoch (" + d.Budha[500].toFixed(0) +
  "′ at 500 CE to " + d.Budha[2026].toFixed(0) + "′ at 2026), which is what a " +
  "60-revolution difference on the śīghrocca has to do");
is(d.Budha[2026] > 120,
  "and reaches degrees by now (" + (d.Budha[2026] / 60).toFixed(1) +
  "°) — the largest single disagreement between the recensions");
is(d["Sūrya"][2026] > 1 && d["Sūrya"][2026] < 30,
  "the Sun moves a few arcminutes (" + d["Sūrya"][2026].toFixed(1) +
  "′) — the 28-day civil-day gap and nothing else");
/* Rāhu USED to be the check on the disclosure: borrowed revolutions kept it
   still. With IX.5–6's own count it now moves, by about 12 revolutions per
   Mahāyuga — 1° per thousand years — so the gap must GROW from 500 CE and
   stand near five degrees by now. A still node would mean the tier is not
   applying the text's count. */
is(d["Rāhu"][2026] > d["Rāhu"][500] && d["Rāhu"][2026] / 60 > 4.5 && d["Rāhu"][2026] / 60 < 5.8,
  "Rāhu now moves, " + (d["Rāhu"][500] / 60).toFixed(2) + "° at 500 CE to " +
  (d["Rāhu"][2026] / 60).toFixed(2) + "° by 2026 — the text's 2,32,226 revolutions against the later 2,32,238");

/* ---- 5. the lab's third button ---------------------------------------- */
head("the siddhānta lab offers it, and the modes cannot compound");
await pg.evaluate(() => window.SSEngine.bare());
await pg.waitForTimeout(1500);
const hasBtn = await pg.$('[data-ss="ps"]');
is(!!hasBtn, "the page carries a Varāhamihira's Saura button");
const scoreOf = () => pg.evaluate(() => {
  const e = document.getElementById("ss-score");
  return e ? (e.textContent.match(/[\d.]+′/g) || []).slice(0, 4).join(",") : "";
});
const sBare = await scoreOf();
if (hasBtn) {
  await hasBtn.click();
  await pg.waitForTimeout(2000);
  const sPs = await scoreOf();
  is(sPs !== "" && sPs !== sBare,
    "clicking it moves the live score (" + sBare + " → " + sPs + ")");
  /* This was a real failure: sliders() fell through to CUSTOM, which is null
     in this mode, and threw — which aborted redrawLab() before scoreTable()
     ran, so the score silently stayed stale. A changing score is therefore
     also the check that the panel did not throw. */
  is(await pg.evaluate(() => window.SSEngine.isPanchaSaura()) === true,
    "and the engine is really in the tier, not just labelled");
  /* THE PAGE'S DISCLOSURE MUST BE THE ENGINE'S LIST, not prose about it.
     It was hardcoded prose naming four quantities — a claim about the engine
     written where the engine cannot correct it, so closing one borrow would
     leave the page still asserting four. It renders from
     panchaSauraInfo().borrowed now, and this check is what keeps the two
     tied: when Ch. XVI is finally OCR'd and a borrow is closed, the page
     follows and the suite confirms it followed. */
  const shown = await pg.evaluate(() =>
    [...document.querySelectorAll("#ss-psborrow li")].map((li) => li.textContent));
  is(shown.length === 1 && /^None/.test(shown[0] || ""),
    "the page's disclosure, rendered from the engine's now-empty list, says none (" +
    (shown[0] || "nothing") + ")");
  const bareBtn = await pg.$('[data-ss="bare"]');
  await bareBtn.click();
  await pg.waitForTimeout(2000);
  is(await scoreOf() === sBare,
    "and going back to the bare text restores the score exactly");
  is(await pg.evaluate(() => window.SSEngine.isPanchaSaura()) === false,
    "with the tier off again");

  /* NO LAYERING. Dragging a slider from the PS tier used to put a bīja on top
     of Varāhamihira's revolutions and call the result "your own constants".
     apply() now calls bare() first for every offset mode. */
  await hasBtn.click();
  await pg.waitForTimeout(1200);
  const slid = await pg.$(".sslide");
  if (slid) {
    await pg.evaluate(() => {
      const s = document.querySelector(".sslide");
      s.value = String(Number(s.value) + Number(s.step || 1) * 4);
      s.dispatchEvent(new Event("input", { bubbles: true }));
      s.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await pg.waitForTimeout(1800);
    const rev = await pg.evaluate(() => ({
      maṅgala: window.SSEngine.YUGA.rev["Maṅgala"],
      civil: window.SSEngine.YUGA.civilDays,
      ps: window.SSEngine.isPanchaSaura()
    }));
    is(rev.ps === false,
      "moving a slider leaves the PS tier rather than sitting on top of it");
    is(rev.civil === 1577917828 && rev.maṅgala === 2296832,
      "and the constants underneath are the Later SS's again, not Varāhamihira's " +
      "(civilDays " + rev.civil + ", Maṅgala " + rev.maṅgala + ")");
  } else {
    no("no slider found to test layering with");
  }
}

await pg.evaluate(() => window.SSEngine.bare());
head("clean exit");
is(await pg.evaluate(() => window.SSEngine.isPanchaSaura()) === false,
  "the engine is left bare");
is(errs.length === 0, "no page errors" + (errs.length ? ": " + errs[0] : ""));

await br.close();
console.log("\n" + (fail ? "FAIL" : "PASS") + "  " + pass + " ok, " + fail + " failed");
process.exit(fail ? 1 : 0);
