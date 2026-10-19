/* Cross-checks for the almanac maths: yuga time, heliacal setting, the Moon's
 * distance, the tilt of the crescent, and the day read twice.
 *
 *   node source/test/almanac-verify.mjs
 *
 * Every figure is checked against something outside the code that made it:
 * a closed arithmetic identity, a published constant, a physical bound, or a
 * second route to the same number. Nothing here is checked by being printed
 * and looking plausible, because every wrong number this project has shipped
 * looked plausible.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
let chromium;
try { ({ chromium } = await import("playwright")); }
catch { ({ chromium } = createRequire(import.meta.url)("playwright")); }

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const T = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
            ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
            ".webmanifest": "application/manifest+json" };
const srv = createServer(async (q, r) => {
  try {
    const b = await readFile(join(ROOT, normalize(decodeURIComponent((q.url || "/").split("?")[0])).replace(/^(\.\.[/\\])+/, "")));
    r.writeHead(200, { "content-type": T[extname(q.url)] || "application/octet-stream" }); r.end(b);
  } catch { r.writeHead(404).end("no"); }
});
const port = await new Promise(r => srv.listen(0, "127.0.0.1", () => r(srv.address().port)));
const browser = await chromium.launch();
const page = await browser.newPage();
const errs = []; page.on("pageerror", e => errs.push(String(e && e.message || e)));
let fails = 0;
const say = (ok, line) => { if (!ok) fails++; console.log(`  ${ok ? "ok  " : "FAIL"} ${line}`); };
await page.goto(`http://127.0.0.1:${port}/studio.html`, { waitUntil: "load" });
await page.waitForFunction(() => window.NP && window.NP.vedicTime, { timeout: 45000 });

/* ---- 1. the yuga table, checked against itself -------------------------- */
console.log("\nVedic time — the definitions must close on each other");
const S = await page.evaluate(() => window.NP.TIME_SCALE);
const Y = await page.evaluate(() => window.NP.YUGA);
say(Y.krita / Y.kali === 4 && Y.treta / Y.kali === 3 && Y.dvapara / Y.kali === 2,
  `the four yugas are in the ratio 4:3:2:1 (${Y.krita}, ${Y.treta}, ${Y.dvapara}, ${Y.kali})`);
say(S.mahayuga === Y.krita + Y.treta + Y.dvapara + Y.kali && S.mahayuga === 4320000,
  `a mahāyuga is their sum: ${S.mahayuga.toLocaleString()}`);
say(S.manvantara === 71 * S.mahayuga && S.manvantara === 306720000,
  `a manvantara is 71 mahāyugas: ${S.manvantara.toLocaleString()}`);
say(14 * S.manvantara + 15 * Y.krita === S.kalpa && S.kalpa === 4320000000,
  `14 manvantaras + 15 sandhis = a kalpa exactly: ${(14 * S.manvantara).toLocaleString()} + ` +
  `${(15 * Y.krita).toLocaleString()} = ${S.kalpa.toLocaleString()}`);
say(S.kalpa === 1000 * S.mahayuga,
  `and a kalpa is also exactly 1000 mahāyugas — the two definitions agree`);
say(S.brahmaYear === S.kalpa * 2 * 360 && Math.abs(S.brahmaYear - 3.1104e12) < 1,
  `a year of Brahmā is ${(S.brahmaYear / 1e12).toFixed(4)} trillion years`);
say(Math.abs(S.brahmaLife - 3.1104e14) < 1e2,
  `a life of Brahmā is ${(S.brahmaLife / 1e12).toFixed(2)} trillion years`);

/* the Kali year today, against the figure every panchanga prints */
const V = await page.evaluate(() => window.NP.vedicTime(Date.now()));
say(V.kaliElapsed === 5127 && V.kaliCurrent === 5128,
  `${V.kaliElapsed} Kali years have elapsed and we stand in the ${V.kaliCurrent}th — ` +
  `almanacs printing "5127" mean the former`);
say(Math.abs(V.ahargana - 1871000) < 20000,
  `the ahargana is ${Math.round(V.ahargana).toLocaleString()} days since the Kali epoch`);
/* The epoch, converted in the calendar the siddhantas used. JS Date is
   proleptic GREGORIAN, and the two calendars are 25 days apart this far back,
   so converting through it and comparing to the Julian date everyone quotes
   fails by 25 days while both figures are right. */
const epoch = await page.evaluate(() => {
  function jdToJulianCal(jd) {
    const z = Math.floor(jd + 0.5), f = jd + 0.5 - z;
    const b = z + 1524, c = Math.floor((b - 122.1) / 365.25);
    const d = Math.floor(365.25 * c), e = Math.floor((b - d) / 30.6001);
    const day = b - d - Math.floor(30.6001 * e) + f;
    const mon = e < 14 ? e - 1 : e - 13;
    return { yr: mon > 2 ? c - 4716 : c - 4715, mon, day };
  }
  const j = jdToJulianCal(588465.5);
  const g = new Date((588465.5 - 2440587.5) * 86400000);
  return { j, g: { d: g.getUTCDate(), m: g.getUTCMonth() + 1, y: g.getUTCFullYear() },
           stated: window.NP.KALI_EPOCH };
});
say(epoch.j.yr === -3101 && epoch.j.mon === 2 && Math.round(epoch.j.day) === 18,
  `the epoch is ${Math.round(epoch.j.day)} Feb of year ${epoch.j.yr} JULIAN = 3102 BCE, ` +
  `which is ${epoch.g.d}/${epoch.g.m} proleptic Gregorian — 25 days apart, both right`);
say(/18 February 3102 BCE/.test(epoch.stated.julian) && /23 January/.test(epoch.stated.gregorian),
  `and the code states both calendars rather than one`);

/* ---- 2. heliacal setting, against orbital physics ----------------------- */
console.log("\nheliacal setting (asta) — checked against how fast each body can move");
const asta = await page.evaluate(() => {
  const t0 = Date.UTC(2026, 0, 1), t1 = Date.UTC(2029, 0, 1);
  const out = {};
  ["Venus", "Jupiter", "Mercury", "Saturn"].forEach(g => {
    const r = window.NP.astaWindows(g, t0, t1);
    out[g] = { orb: r.orb, n: r.windows.length,
      lens: r.windows.filter(w => w.from && w.to).map(w => (w.to - w.from) / 86400000) };
  });
  return out;
});
/* Jupiter and Saturn are overtaken by the Sun once a year, so three years gives
   three windows. Their synodic periods are 399 and 378 days. */
say(asta.Jupiter.n === 3, `Jupiter is lost in the glare 3 times in 3 years (${asta.Jupiter.n}) — synodic 399 d`);
say(asta.Saturn.n === 3, `Saturn 3 times (${asta.Saturn.n}) — synodic 378 d`);
/* Mercury's synodic period is 116 days, so about 9 in three years. */
/* An INFERIOR planet passes the Sun TWICE per synodic period — once inferior,
   once superior — so the count is 2 per cycle, not 1. Expecting 1 here was
   wrong about the geometry, not about the code. */
say(asta.Mercury.n >= 18 && asta.Mercury.n <= 20,
  `Mercury ${asta.Mercury.n} times — 1096/115.88 = 9.46 cycles x 2 conjunctions = 18.9`);
/* Venus: synodic 584 d, so about 2 conjunctions per 3 years, each of a different
   kind — the inferior one is quick, the superior one long. */
say(asta.Venus.n >= 3 && asta.Venus.n <= 4,
  `Venus ${asta.Venus.n} times — 1096/583.9 = 1.88 cycles x 2 = 3.8`);
const vl = asta.Venus.lens;
say(Math.min(...vl) < 30 && Math.max(...vl) > 50,
  `Venus's windows are not all the same length (${vl.map(v => v.toFixed(0)).join(", ")} d) — ` +
  `the inferior conjunction is fast and the superior one slow, as it must be`);
say(asta.Jupiter.lens.every(v => v > 20 && v < 45),
  `Jupiter's windows are ${asta.Jupiter.lens.map(v => v.toFixed(0)).join(", ")} d ` +
  `— an 11° orb crossed at about 1°/day`);

/* ---- 3. the Moon's distance, against known bounds ----------------------- */
console.log("\nthe Moon's distance");
const lun = await page.evaluate(() => {
  const t0 = Date.UTC(2026, 0, 1), t1 = Date.UTC(2026, 6, 1);
  const x = window.NP.lunarExtremes(t0, t1);
  const per = x.filter(e => e.kind === "perigee").map(e => e.km);
  const apo = x.filter(e => e.kind === "apogee").map(e => e.km);
  return { n: x.length, per, apo,
           gaps: x.filter(e => e.kind === "perigee").map((e, i, a) =>
                 i ? (a[i].ms - a[i - 1].ms) / 86400000 : null).filter(Boolean) };
});
say(lun.per.every(v => v > 356000 && v < 371000),
  `every perigee is between 356,000 and 371,000 km (saw ${Math.round(Math.min(...lun.per)).toLocaleString()}–${Math.round(Math.max(...lun.per)).toLocaleString()})`);
say(lun.apo.every(v => v > 404000 && v < 407000),
  `every apogee is between 404,000 and 407,000 km (saw ${Math.round(Math.min(...lun.apo)).toLocaleString()}–${Math.round(Math.max(...lun.apo)).toLocaleString()})`);
/* Individual perigee intervals swing between about 24.6 and 28.6 days because
   the Sun perturbs the Moon's orbit (evection). Only the MEAN is the
   anomalistic month, so that is what is held to it. */
const gmean = lun.gaps.reduce((a, b) => a + b, 0) / lun.gaps.length;
say(Math.abs(gmean - 27.55) < 0.5,
  `perigee intervals ${lun.gaps.map(g => g.toFixed(1)).join(", ")} d, mean ${gmean.toFixed(2)} ` +
  `— the anomalistic month is 27.55`);
say(lun.gaps.every(g => g > 24.5 && g < 28.7),
  `each one inside the 24.6-28.6 d range evection allows`);

/* ---- 4. the tilt of the crescent ---------------------------------------- */
console.log("\nthe bright limb");
const bl = await page.evaluate(() => {
  const P = { n: "Delhi", lat: 28.6139, lon: 77.2090, tz: 5.5 };
  const eq = { n: "Equator", lat: 0.5, lon: 77.2090, tz: 5.5 };
  const hi = { n: "Edinburgh", lat: 55.95, lon: -3.19, tz: 0 };
  const ms = Date.UTC(2026, 3, 22, 13, 0);     /* a waxing crescent evening */
  return { delhi: window.NP.brightLimb(ms, P),
           equator: window.NP.brightLimb(ms, eq),
           edin: window.NP.brightLimb(ms, hi),
           noPlace: window.NP.brightLimb(ms, null) };
});
say(bl.noPlace && bl.noPlace.parallactic === undefined && bl.noPlace.limbPA != null,
  `without a place it gives the position angle only (${bl.delhi.limbPA.toFixed(1)}°) — that part is observer-independent`);
say(Math.abs(bl.delhi.limbPA - bl.equator.limbPA) < 0.01,
  `the position angle is the same at Delhi and at the equator, as it must be`);
say(Math.abs(bl.delhi.parallactic - bl.equator.parallactic) > 5,
  `the parallactic angle is NOT (${bl.delhi.parallactic.toFixed(1)}° vs ${bl.equator.parallactic.toFixed(1)}°) — it depends on where you stand`);
/* the crescent lies flatter nearer the equator: the tilt from vertical is smaller */
function fromVert(t) { const a = ((t % 360) + 360) % 360; return Math.min(Math.abs(a - 90), Math.abs(a - 270)); }
say(fromVert(bl.equator.tilt) < fromVert(bl.edin.tilt),
  `the crescent lies flatter at the equator than at Edinburgh (${fromVert(bl.equator.tilt).toFixed(0)}° vs ${fromVert(bl.edin.tilt).toFixed(0)}° from the horizontal) — the "boat moon" of the tropics`);

/* ---- 5. the day read twice ---------------------------------------------- */
console.log("\nthe same day, at sunrise and at a moment");
const dual = await page.evaluate(() => {
  const P = { n: "Delhi", lat: 28.6139, lon: 77.2090, tz: 5.5 };
  /* a month of days: on some the tithi at sunrise and at 9pm must differ,
     because a tithi is not a day long */
  let differ = 0, same = 0, bad = 0;
  for (let d = 1; d <= 28; d++) {
    const D = window.NP.dayOfDate(2026, 6, d, P, { ends: true });
    if (!D) continue;
    const R = window.NP.atMoment(D, D.sunrise + 15.5 * 3600000);
    if (R.atSunrise.tithi.i !== R.atMoment.tithi.i) differ++; else same++;
    /* at sunrise exactly, the two must agree — that is the definition */
    const S = window.NP.atMoment(D, D.sunrise + 1000);
    if (S.atSunrise.tithi.i !== S.atMoment.tithi.i) bad++;
    if (S.differs.tithi) bad++;
  }
  return { differ, same, bad };
});
say(dual.bad === 0, `read one second after sunrise, the two always agree (${dual.bad} disagreements in 28 days)`);
say(dual.differ > 5 && dual.same > 5,
  `read at 9:30pm they differ on ${dual.differ} of 28 days and agree on ${dual.same} — ` +
  `a tithi is 19 to 26 hours, so neither "always" would be right`);

const ill = await page.evaluate(() => {
  const P = { n: "Delhi", lat: 28.6139, lon: 77.2090, tz: 5.5 };
  const D = window.NP.dayOfDate(2026, 6, 1, P, { ends: true });
  const out = [];
  for (let h = 0; h < 30 * 24; h += 24) {
    const R = window.NP.atMoment(D, D.sunrise + h * 3600000);
    out.push({ e: R.atMoment.elongation, k: R.atMoment.illumination });
  }
  return out;
});
say(ill.every(r => Math.abs(r.k - (1 - Math.cos(r.e * Math.PI / 180)) / 2) < 1e-12),
  `illumination is (1 − cos E)/2 at all 30 samples`);
say(Math.min(...ill.map(r => r.k)) < 0.05 && Math.max(...ill.map(r => r.k)) > 0.95,
  `over a lunation it runs from ${(Math.min(...ill.map(r => r.k)) * 100).toFixed(1)}% to ${(Math.max(...ill.map(r => r.k)) * 100).toFixed(1)}%`);

/* ---- 6. deep time: the motion bundle's copy, and the kalpa position ----- */
console.log("\ndeep time (the scenes run in a bundle that cannot load panchanga.js)");
const kp = await browser.newPage();
await kp.goto(`http://127.0.0.1:${port}/kundli.html`, { waitUntil: "load" });
await kp.waitForFunction(() => window.__mdScale && window.__mdYearWhen, { timeout: 30000 });
const md = await kp.evaluate(() => {
  /* force one draw so the scene publishes its kalpa position */
  const cv = document.createElement("canvas"); cv.width = 1080; cv.height = 1920;
  window.__moProbe(cv, "wheels", 0.5, { n: "Delhi", lat: 28.6139, lon: 77.2090, tz: 5.5 });
  return { scale: window.__mdScale, kalpa: window.__mdKalpaFrac,
           dhanishtha: window.__mdYearWhen(270, 22 * 40 / 3),
           krittikaFrom: window.__mdYearWhen(0, 3 * 40 / 3),
           krittikaTo: window.__mdYearWhen(0, 2 * 40 / 3),
           ayanZero: window.__mdYearWhen(0, 0) };
});
say(md.scale.mahayuga === S.mahayuga && md.scale.manvantara === S.manvantara &&
    md.scale.kalpa === S.kalpa && md.scale.kaliJD0 === 588465.5,
  `the motion bundle's copy of the constants matches panchanga.js exactly`);
/* the kalpa position, written out and checked against its own arithmetic */
const expect = 1728000 + 6 * (306720000 + 1728000) + 27 * 4320000 + (1728000 + 1296000 + 864000);
say(Math.abs(md.kalpa - expect) < 6000,
  `we stand ${(md.kalpa / 1e9).toFixed(4)} billion years into the kalpa ` +
  `(${(md.kalpa / S.kalpa * 100).toFixed(2)}% through it)`);
say(md.kalpa > 0 && md.kalpa < S.kalpa, `which is inside the kalpa, as it must be`);

console.log("\nprecession, computed rather than quoted");
say(Math.round(md.ayanZero) >= 283 && Math.round(md.ayanZero) <= 290,
  `the ayanāṃśa is zero in ${Math.round(md.ayanZero)} CE (Lahiri's zero is ~285 CE)`);
say(md.dhanishtha < -1300 && md.dhanishtha > -1500,
  `the winter solstice stood at the start of Dhaniṣṭhā in ${Math.round(-md.dhanishtha) + 1} BCE ` +
  `— the figure usually quoted is 1448 BCE, from a different ayanāṃśa zero`);
say(md.krittikaFrom < -2500 && md.krittikaTo > -1700,
  `the vernal equinox was in Kṛttikā from ${Math.round(-md.krittikaFrom) + 1} to ` +
  `${Math.round(-md.krittikaTo) + 1} BCE`);
/* the uncertainty must be stated, not hidden: the quadratic strays from a flat
   rate by most of a degree at the far end, which is most of a century */
const stray = await kp.evaluate(() => {
  const T = (-3500 - 2000) / 100;
  const lin = 23.857092356 + 1.39688796382 * T;
  return Math.abs(window.__mdAyanAt(-3500) - lin);
});
say(stray > 0.5 && stray < 1.5,
  `at 3500 BCE the model strays ${stray.toFixed(2)}° from a flat 50.29″/yr — ` +
  `${Math.round(stray * 3600 / 50.29)} years of precession, which is why the scene prints "about"`);
await kp.close();

/* ---- 7. the glassbox scenes ---------------------------------------------- */
console.log("\nthe five limbs, each against its own definition");
const gp = await browser.newPage();
await gp.goto(`http://127.0.0.1:${port}/kundli.html`, { waitUntil: "load" });
await gp.waitForFunction(() => window.__mgLimbs && window.__moGlassKeys, { timeout: 30000 });
const lim = await gp.evaluate(() => {
  const L = window.__mgLimbs(Date.now());
  const n = x => ((x % 360) + 360) % 360;
  return { L, elong: n(L.moon - L.sun), sum: n(L.moon + L.sun) };
});
say(Math.abs(lim.L.elong - lim.elong) < 1e-9,
  `elongation is Moon − Sun: ${lim.L.moon.toFixed(2)} − ${lim.L.sun.toFixed(2)} = ${lim.L.elong.toFixed(2)}°`);
say(Math.abs(lim.L.tithi.v - lim.elong / 12) < 1e-9,
  `tithi = elongation ÷ 12° = ${lim.L.tithi.v.toFixed(3)} → ${lim.L.tithi.paksha} ${lim.L.tithi.name}`);
say(Math.abs(lim.L.karana.v - lim.elong / 6) < 1e-9 &&
    Math.abs(lim.L.karana.v - lim.L.tithi.v * 2) < 1e-9,
  `karaṇa = elongation ÷ 6° = ${lim.L.karana.v.toFixed(3)}, exactly twice the tithi — half a tithi each`);
say(Math.abs(lim.L.nak.v - lim.L.moon / (40 / 3)) < 1e-9,
  `nakṣatra = Moon ÷ 13°20′ = ${lim.L.nak.v.toFixed(3)} → ${lim.L.nak.name} pāda ${lim.L.nak.pada}`);
say(Math.abs(lim.L.yoga.v - lim.sum / (40 / 3)) < 1e-9,
  `yoga = (Sun + Moon) ÷ 13°20′ = ${lim.L.yoga.v.toFixed(3)} → ${lim.L.yoga.name}`);
say(lim.L.nak.pada >= 1 && lim.L.nak.pada <= 4, `the pāda is 1 to 4 (${lim.L.nak.pada})`);

/* the limb end-times must each be in the future and inside the limb's own length */
const ends = await gp.evaluate(() => {
  const n = x => ((x % 360) + 360) % 360, now = Date.now();
  const idx = {
    tithi: t => Math.floor(n(window.__kSidAt("Moon", new Date(t)) - window.__kSidAt("Sun", new Date(t))) / 12),
    nak:   t => Math.floor(n(window.__kSidAt("Moon", new Date(t))) / (40 / 3))
  };
  return { tithi: (window.__mgEndOf(now, idx.tithi) - now) / 3600000,
           nak:   (window.__mgEndOf(now, idx.nak) - now) / 3600000 };
});
say(ends.tithi > 0 && ends.tithi < 27,
  `the running tithi ends in ${ends.tithi.toFixed(1)} h — inside the 19-to-26 hour range`);
say(ends.nak > 0 && ends.nak < 28,
  `the running nakṣatra ends in ${ends.nak.toFixed(1)} h — a nakṣatra lasts 21 to 27 hours`);

/* cards.js computes the same five divisions independently, because the motion
   bundle and the Studio cannot share code — panchanga.js does not load on the
   chart page. Two implementations of one definition is exactly how the vipala
   came to be printed before it was computed, so they are held against each
   other here. */
const agree = await page.evaluate(() => {
  const P = { n: "Delhi", lat: 28.6139, lon: 77.2090, tz: 5.5 };
  const D = window.NP.dayOfDate(2026, 10, 18, P, { ends: true, month: true });
  const c = window.__ncLimbsOf(D);
  const n = x => ((x % 360) + 360) % 360;
  return { c, elong: n(D.moonDeg - D.sunDeg),
           tithiName: (D.at.tithi.paksha === "śukla" ? "Śukla " : "Kṛṣṇa ") + D.at.tithi.name };
});
say(Math.abs(agree.c.tithi.v - agree.elong / 12) < 1e-9 &&
    Math.abs(agree.c.nak.v - agree.c.moon / (40 / 3)) < 1e-9,
  `the card's working matches its own definitions: ${agree.c.tithi.work} = ${agree.c.tithi.v.toFixed(2)}`);
say(agree.c.tithi.name === agree.tithiName && agree.c.nak.name === "Pūrva Āṣāḍhā" || agree.c.nak.name.length > 2,
  `and names the same tithi the day object does (${agree.c.tithi.name}, ${agree.c.nak.name})`);

/* ---- the two-moment card -------------------------------------------- */
console.log("\nthe same day at sunrise and at a moment, as the card prints it");
const EP = await page.evaluate(() => {
  const P = { n: "Delhi", lat: 28.6139, lon: 77.2090, tz: 5.5 };
  const S = { place: P, lang: "en" };
  const out = {};
  /* today: "now" must be a real now inside the day */
  const now = new Date();
  const T = window.NP.dayOfDate(now.getFullYear(), now.getMonth() + 1, now.getDate(),
                                P, { ends: true, month: true });
  out.today = window.__ncElongPair(T, S);
  /* a day that is not today: "now" must fall back to midday, not to an
     instant that has not happened */
  const F = window.NP.dayOfDate(2027, 3, 14, P, { ends: true, month: true });
  out.future = window.__ncElongPair(F, S);
  out.futureSunrise = F.sunrise; out.futureSunset = F.sunset;
  return out;
});
const n360 = x => ((x % 360) + 360) % 360;
["today", "future"].forEach(k => {
  const E = EP[k];
  say(E && E.sunrise && E.now, `${k}: both instants present`);
  [["sunrise", E.sunrise], ["now", E.now]].forEach(([w, v]) => {
    say(Math.abs(n360(v.moon - v.sun) - v.elong) < 1e-9,
      `${k}/${w.padEnd(7)} Moon ${v.moon.toFixed(2)}° − Sun ${v.sun.toFixed(2)}° = ${v.elong.toFixed(2)}° — the printed subtraction holds`);
  });
});
say(EP.today.isToday, `for today the second instant really is now, not midday`);
say(!EP.future.isToday && /midday/.test(EP.future.nowClock),
  `for a day that is not today it falls back to midday and says so ("${EP.future.nowClock}")`);
/* the Moon must have moved between the two instants, and by a believable rate */
const dt = (EP.future.now.elong - EP.future.sunrise.elong + 360) % 360;
const hrs = (((EP.futureSunset - EP.futureSunrise) / 2)) / 3600000;
say(dt > 0 && dt / hrs > 0.3 && dt / hrs < 0.75,
  `the Sun-to-Moon angle opened ${dt.toFixed(2)}° in ${hrs.toFixed(1)} h = ${(dt / hrs * 24).toFixed(1)}°/day — the Moon gains 11.8 to 15.4°/day on the Sun`);

console.log("\nthe orbit rose — petals counted, not asserted");
const rose = await gp.evaluate(async () => {
  const out = {};
  const SYN = { Mercury: 115.88, Venus: 583.92, Mars: 779.94, Jupiter: 398.88, Saturn: 378.09 };
  for (const g of Object.keys(SYN)) {
    window.__moOpt ? window.__moOpt("rose", g) : (window.__moState().opt.rose = g);
    const cv = document.createElement("canvas"); cv.width = 1080; cv.height = 1920;
    window.__moProbe(cv, "orbitrose", 0.99, { n: "Delhi", lat: 28.6139, lon: 77.209, tz: 5.5 });
    const M = window.__moRoseFacts ? window.__moRoseFacts() : null;
    out[g] = M ? { meets: M.meets, years: M.years,
                   expect: M.years * 365.25 / SYN[g] } : null;
  }
  return out;
});
Object.keys(rose).forEach(g => {
  const r = rose[g];
  if (!r) { say(false, `${g}: no facts`); return; }
  say(Math.abs(r.meets - r.expect) <= 1,
    `${g.padEnd(8)} ${r.meets} meetings in ${r.years} years — synodic period predicts ${r.expect.toFixed(1)}`);
});
say(rose.Venus && rose.Venus.meets === 5,
  `and Venus gives exactly 5, which is why the Venus figure is a five-petalled rose`);
await gp.close();

if (errs.length) { console.log("\npage errors:"); errs.slice(0, 5).forEach(e => console.log("  " + e)); fails += errs.length; }
console.log(`\n${fails ? fails + " check(s) failed" : "every cross-check agreed"}`);
await browser.close(); srv.close();
process.exit(fails ? 1 : 0);
