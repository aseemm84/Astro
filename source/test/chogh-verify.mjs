/* Choghaḍiyā, checked where it is actually computed.
 *
 * There were three copies of this scheme: panchanga.js (the calendar and the
 * pañcāṅga pages), the report's muhūrta section, and the report's Now tab.
 * The two in the report were daytime-only, spelled the names in ASCII, and
 * answered "night — not tabulated" for every hour between sunset and sunrise.
 * They now share one derivation, and panchanga.js has its own copy of the
 * same one, because the two bundles cannot see each other.
 *
 * Two copies need a check that they have not drifted, and the check has to
 * load both pages because only one of them exposes each. This is that check.
 * It also pins both against the standard tables, which is what caught the
 * first derivation getting the night STEP wrong — it advanced one place at a
 * time like the day instead of five, an error invisible in the first slot of
 * every weekday, which is the slot anyone would spot-check.
 */
const { createRequire } = await import("node:module");
const { chromium } = createRequire(import.meta.url)("playwright");
const ROOT = "file://" + process.cwd() + "/";

let pass = 0, fail = 0;
function head(t){ console.log("\n" + t); }
function is(c, t){ if (c) { pass++; console.log("  ok   " + t); }
                   else { fail++; console.log("  FAIL " + t); } }

const DAY = [
  ["Udvega","Cala","Lābha","Amṛta","Kāla","Śubha","Roga","Udvega"],
  ["Amṛta","Kāla","Śubha","Roga","Udvega","Cala","Lābha","Amṛta"],
  ["Roga","Udvega","Cala","Lābha","Amṛta","Kāla","Śubha","Roga"],
  ["Lābha","Amṛta","Kāla","Śubha","Roga","Udvega","Cala","Lābha"],
  ["Śubha","Roga","Udvega","Cala","Lābha","Amṛta","Kāla","Śubha"],
  ["Cala","Lābha","Amṛta","Kāla","Śubha","Roga","Udvega","Cala"],
  ["Kāla","Śubha","Roga","Udvega","Cala","Lābha","Amṛta","Kāla"]
];
const NIGHT = [
  ["Śubha","Amṛta","Cala","Roga","Kāla","Lābha","Udvega","Śubha"],
  ["Cala","Roga","Kāla","Lābha","Udvega","Śubha","Amṛta","Cala"],
  ["Kāla","Lābha","Udvega","Śubha","Amṛta","Cala","Roga","Kāla"],
  ["Udvega","Śubha","Amṛta","Cala","Roga","Kāla","Lābha","Udvega"],
  ["Amṛta","Cala","Roga","Kāla","Lābha","Udvega","Śubha","Amṛta"],
  ["Roga","Kāla","Lābha","Udvega","Śubha","Amṛta","Cala","Roga"],
  ["Lābha","Udvega","Śubha","Amṛta","Cala","Roga","Kāla","Lābha"]
];

const browser = await chromium.launch();
const errs = [];
async function runsFrom(page, url, getter) {
  const p = await browser.newPage();
  p.on("pageerror", e => errs.push(url + ": " + e.message));
  p.on("console", m => { if (m.type() === "error") errs.push(url + " console: " + m.text()); });
  await p.goto(ROOT + url);
  await p.waitForFunction(getter.probe, null, { timeout: 25000 }).catch(() => {});
  const out = await p.evaluate(getter.read);
  await p.close();
  return out;
}

head("The pañcāṅga layer (calendar.html)");
const np = await runsFrom(null, "calendar.html", {
  probe: () => !!(window.NP && window.NP.chogRun),
  read: () => { const o = { day: [], night: [] };
    for (let w = 0; w < 7; w++) { o.day.push(window.NP.chogRun(w, false));
                                  o.night.push(window.NP.chogRun(w, true)); }
    /* and the thing that was broken: a time after sunset must come back named */
    const f = { sunrise: Date.UTC(2026,9,30,1,30), sunset: Date.UTC(2026,9,30,13,0),
                nextSunrise: Date.UTC(2026,9,31,1,30) };
    f.ms = f.sunset + 3600000;
    const c = window.NP.choghadiya(f);
    o.afterSunset = !!(c && c.name && c.night === true && c.to > c.from);
    f.ms = f.sunrise - 3600000;                       /* before dawn */
    const c2 = window.NP.choghadiya(f);
    o.beforeDawn = !!(c2 && c2.name && c2.night === true);
    return o; }
});
is(!!np && np.day.length === 7, "NP.chogRun is reachable");
is(np && JSON.stringify(np.day) === JSON.stringify(DAY), "its day runs match the standard tables");
is(np && JSON.stringify(np.night) === JSON.stringify(NIGHT), "its night runs match the standard tables");
is(np && np.afterSunset, "an hour after sunset is named, timed and flagged as night");
is(np && np.beforeDawn, "and so is an hour before dawn, which belongs to the night before");

head("The report's own copy (kundli.html)");
const rep = await runsFrom(null, "kundli.html", {
  probe: () => !!window.__chogRun,
  read: () => { const o = { day: [], night: [] };
    for (let w = 0; w < 7; w++) { o.day.push(window.__chogRun(w, false));
                                  o.night.push(window.__chogRun(w, true)); }
    o.good = window.__chogGood; return o; }
});
is(!!rep && rep.day.length === 7, "__chogRun is reachable");
is(rep && JSON.stringify(rep.day) === JSON.stringify(DAY), "its day runs match the standard tables");
is(rep && JSON.stringify(rep.night) === JSON.stringify(NIGHT), "its night runs match the standard tables");
is(rep && rep.good && rep.good["Amṛta"] && rep.good["Śubha"] &&
   rep.good["Lābha"] && rep.good["Cala"] && !rep.good["Kāla"] && !rep.good["Roga"] &&
   !rep.good["Udvega"], "the four well-named slots are the four, and no others");

head("The two copies agree");
is(np && rep && JSON.stringify(np.day) === JSON.stringify(rep.day) &&
   JSON.stringify(np.night) === JSON.stringify(rep.night),
   "pañcāṅga and report produce identical runs, day and night, all seven weekdays");

head("The pages behave");
is(errs.length === 0, "no console errors" + (errs.length ? " — " + errs[0].slice(0, 140) : ""));

await browser.close();
console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
