/* nak-system-verify.mjs — the site-wide equal / unequal nakṣatra setting.

   One module (src/js/nak-system.js) answers "which nakṣatra, how far through,
   which pāda" for every page, and the master panel decides between BPHS's
   equal 13°20′ and Garga's unequal widths (scaled to 360°, or on the Moon's
   mean motion with Abhijit). Every check goes through a consequence a reader
   would see: a chart field, a daśā balance, a drawn ring, a page's readout. */

import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
let chromium;
try { ({ chromium } = await import("playwright")); }
catch { ({ chromium } = createRequire("/opt/npm-tools/package.json")("playwright")); }

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log("  ok   " + m); };
const no = (m) => { fail++; console.log("  FAIL " + m); };
const is = (c, m) => (c ? ok(m) : no(m));
const head = (h) => console.log("\n" + h);
const CWD = process.cwd();
const near = (a, b, e) => Math.abs(a - b) < (e || 1e-9);

head("The module's arithmetic");
{
  const src = readFileSync(CWD + "/source/src/js/nak-system.js", "utf8");
  const load = (store) => {
    const ctx = { localStorage: { getItem: (k) => (k === "nirayana.settings" ? JSON.stringify(store) : null) }, addEventListener() {} };
    ctx.globalThis = ctx; vm.createContext(ctx); vm.runInContext(src, ctx); return ctx.NNak;
  };
  const E = load({}), U = load({ nak: "unequal" }), M = load({ nak: "unequal", naksch: "u28" });
  is(E.mode() === "equal" && U.mode() === "u27" && M.mode() === "u28", "no setting means equal; unequal defaults to the scaled form; the sub-setting picks the other");
  const eq = E.edges();
  is(eq.length === 27 && eq.every((e, k) => near(e.start, k * 40 / 3) && near(e.end, (k + 1) * 40 / 3)), "equal: 27 divisions of 13°20′ from Aśvinī 0°");
  const u = U.edges(), w = u.map((e) => e.end - e.start);
  is(u.length === 27 && near(u[26].end, 360) && [1, 5, 8, 14, 17, 23].every((i) => near(w[i], 20 / 3)) &&
     [3, 6, 11, 15, 20, 25].every((i) => near(w[i], 20)) && near(w[0], 40 / 3),
     "scaled: Bharaṇī, Ārdrā, Āśleṣā, Svātī, Jyeṣṭhā, Śatabhiṣā 6°40′; Rohiṇī, Punarvasu, Uttara Phalgunī, Viśākhā, Uttarāṣāḍhā, Uttara Bhādrapadā 20°; the rest 13°20′; closes at 360°");
  is(near(u[6].start, 220 / 3) && near(u[6].end, 280 / 3), `scaled: Punarvasu runs Mithuna 13°20′ – Karka 3°20′ (${u[6].start.toFixed(3)}°–${u[6].end.toFixed(3)}°)`);
  const m = M.edges(), mean = 13 + 10 / 60 + 35 / 3600, abh = m.filter((e) => e.i === 27)[0], ua = m.filter((e) => e.i === 20)[0];
  is(m.length === 28 && near(m[27].end, 360) && near(abh.start, ua.end) && near(abh.end - abh.start, 360 - 27 * mean, 1e-9),
     `mean motion: 28 nakṣatras, Abhijit ${(abh.end - abh.start).toFixed(4)}° straight after Uttarāṣāḍhā, closing at 360°`);
  is(near(m[6].end, 7 * mean, 1e-9), `mean motion: Punarvasu ends at Karka ${((7 * mean) - 90).toFixed(3)}° (2°14′)`);
  const a = M.at(abh.start + 1), b = M.at(ua.start + 1);
  is(a.i === 27 && a.name === "Abhijit" && a.d === 20 && b.d === 20 && near(a.dfrac, (abh.start + 1 - ua.start) / (abh.end - ua.start), 1e-9),
     "a Moon in Abhijit has no daśā lord of its own: for the daśā its arc is counted with Uttarāṣāḍhā");
  is(E.at(75).name === "Ārdrā" && U.at(75).name === "Punarvasu" && E.at(75).pada === 3 && U.at(75).pada === 1,
     "75° is Ārdrā pāda 3 in equal nakṣatras and Punarvasu pāda 1 in unequal ones");
}

const br = await chromium.launch();
const errs = [];
async function page(path, store) {
  /* a context of its own, so one page's setting never leaks into the next; the
     store is seeded once, so a reload keeps what the page itself chose */
  const cx = await br.newContext(), p = await cx.newPage();
  p.on("pageerror", (e) => errs.push(path + ": " + e));
  await p.addInitScript((s) => { try { if (!sessionStorage.getItem("seeded")) { sessionStorage.setItem("seeded", "1");
    if (s) localStorage.setItem("nirayana.settings", JSON.stringify(s)); } } catch (e) {} }, store || null);
  await p.goto("file://" + CWD + "/" + path);
  return p;
}
const INP = { year: 1990, month: 3, day: 15, hour: 10, minute: 30, lat: 28.6139, lon: 77.209, tzHours: 5.5 };

head("A chart follows the setting: names, pādas, the Vimśottarī balance");
{
  const out = {};
  for (const [k, s] of [["equal", null], ["u27", { nak: "unequal" }], ["u28", { nak: "unequal", naksch: "u28" }]]) {
    const p = await page("kundli.html", s);
    await p.waitForFunction(() => window.buildLocalChart && window.NNak, null, { timeout: 40000 });
    out[k] = await p.evaluate((inp) => {
      const J = window.buildLocalChart(inp), moon = J.grahas.filter((g) => g.key === "Candra")[0];
      const K = window.NNak.at(moon.sidereal_deg), V = window.__kVims.atMoon(moon.sidereal_deg);
      return { sys: J.nakshatra_system && J.nakshatra_system.mode, moon: moon.sidereal_deg, pada: moon.nakshatra_pada,
               kName: K.name, kPada: K.pada, vLord: V.lord, vBal: V.balance, vFrac: V.elapsed, d: K.d, dfrac: K.dfrac,
               label: J.nakshatra_system && J.nakshatra_system.name };
    }, INP);
    await p.close();
  }
  is(out.equal.sys === "equal" && out.u27.sys === "u27" && out.u28.sys === "u28" && /Garga/.test(out.u27.label),
     "every chart records the nakṣatra system it was read in (nakshatra_system)");
  is(out.equal.pada === out.equal.kPada && out.u27.pada === out.u27.kPada && out.u28.pada === out.u28.kPada,
     "the Moon's pāda in the chart is the module's under each setting");
  const LORDS = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
  is(["equal", "u27", "u28"].every((k) => out[k].vLord === LORDS[out[k].d % 9] && near(out[k].vFrac, out[k].dfrac, 1e-12)),
     "the Vimśottarī lord and the fraction elapsed come from the Moon's nakṣatra under the setting");
  is(Math.abs(out.equal.vBal - out.u27.vBal) > 1e-6 || out.equal.kName !== out.u27.kName,
     `switching to unequal changes the Moon's reading (${out.equal.kName} ${(out.equal.vFrac * 100).toFixed(1)}% → ${out.u27.kName} ${(out.u27.vFrac * 100).toFixed(1)}%)`);
}

head("The panel offers it on every page, and a page follows a change");
{
  const p = await page("calendar.html", null);
  await p.waitForFunction(() => window.NSettings && window.NNak, null, { timeout: 40000 });
  const rows = await p.evaluate(() => { window.NSettings.open && window.NSettings.open();
    const a = document.getElementById("nset-nak"), b = document.getElementById("nset-naksch");
    return { a: a && a.value, b: b && b.value, opts: a ? [...a.options].map((o) => o.value).join() : "", sopts: b ? [...b.options].map((o) => o.value).join() : "" }; });
  is(rows.a === "equal" && rows.b === "u27" && rows.opts === "equal,unequal" && rows.sopts === "u27,u28",
     "the panel has a Nakṣatras row (equal / unequal) and an Unequal scheme row (scaled / mean motion), defaulting to equal");
  await Promise.all([p.waitForNavigation({ timeout: 30000 }), p.evaluate(() => window.NSettings.set({ nak: "unequal" }))]);
  await p.waitForFunction(() => window.NNak, null, { timeout: 40000 });
  is(await p.evaluate(() => window.NNak.mode()) === "u27", "choosing unequal reloads a page that cannot redraw in place, and it comes back unequal");
  await p.close();
}

head("The Kundli builder re-casts the chart on screen instead of reloading");
{
  const p = await page("kundli.html", null);
  await p.waitForFunction(() => window.NSettings && window.buildLocalChart && document.getElementById("k-go"), null, { timeout: 40000 });
  await p.evaluate(() => {
    document.getElementById("k-dob").value = "1975-01-09"; document.getElementById("k-tob").value = "03:20";
    document.getElementById("k-lat").value = "59.9139"; document.getElementById("k-lon").value = "10.7522";
    document.getElementById("k-tz").value = "1"; document.getElementById("k-go").click(); window.__stay = 1; });
  await p.waitForTimeout(4500);
  const glass = () => p.evaluate(() => { const t = document.getElementById("k-out").innerText;
    const m = t.match(/Moon in [^,]+, ([^,]+?) · (\d)/); return { frac: m ? m[1] + " " + m[2] : null, len: t.length,
      want: window.NNak ? (function () { const J = window.buildLocalChart({ year: 1975, month: 1, day: 9, hour: 3, minute: 20, lat: 59.9139, lon: 10.7522, tzHours: 1 });
        return J.grahas.filter((g) => g.key === "Candra")[0].nakshatra_pada; })() : null }; });
  const before = await glass();
  await p.evaluate(() => window.NSettings.set({ nak: "unequal" }));
  await p.waitForTimeout(4500);
  const after = await glass(), stayed = await p.evaluate(() => window.__stay === 1);
  is(stayed && before.len > 1000 && after.len > 1000, "the page is not reloaded and the report is still on screen");
  is(before.frac != null && after.frac != null && before.frac !== after.frac,
     `the report's Moon reading re-computes under the new system (${before.frac} → ${after.frac})`);
  await p.close();
}

head("Pages that read nakṣatras follow it");
{
  const store = { nak: "unequal", naksch: "u28" };
  /* the pañcāṅga: today's nakṣatra is the module's for the Moon at sunrise */
  const p = await page("calendar.html", store);
  await p.waitForFunction(() => window.NP && window.NNak && window.NP.day, null, { timeout: 40000 }).catch(() => {});
  const pc = await p.evaluate(() => { try {
      const D = window.NP.day(new Date(), { lat: 28.6139, lon: 77.209, tz: "Asia/Kolkata" });
      return { i: D.at.nak.i, name: D.at.nak.name, want: window.NNak.at(D.moonDeg != null ? D.moonDeg : 0).i };
    } catch (e) { return { err: String(e) }; } });
  is(pc.err ? false : pc.i != null, `the pañcāṅga day object reads its nakṣatra through the setting (${pc.err || pc.name})`);
  await p.close();
  /* the Kālasetu wheel draws 28 divisions under the mean-motion scheme */
  const k = await page("kalasetu.html", store);
  await k.waitForFunction(() => window.__ksPage, null, { timeout: 60000 });
  const kw = await k.evaluate(() => ({ naks: document.querySelectorAll("#ks-wheel .ks-nak").length,
    abh: [...document.querySelectorAll("#ks-wheel .ks-nak")].some((t) => /Abh/.test(t.textContent)) }));
  is(kw.naks === 28 && kw.abh, `the Kālasetu wheel draws 28 divisions with Abhijit (${kw.naks})`);
  await k.close();
}

head("The dashboard re-casts a chart read in another system, and says so");
{
  const dk = await page("kundli.html", null);
  await dk.waitForFunction(() => window.buildLocalChart, null, { timeout: 40000 });
  const payload = await dk.evaluate((inp) => JSON.stringify(window.buildLocalChart(Object.assign({ houseSystem: "sripati", ayanamsa: "samanvaya_ecliptic" }, inp))), INP);
  await dk.close();
  const dp = await br.newPage();
  dp.on("pageerror", (e) => errs.push("dashboard: " + e));
  await dp.addInitScript((pl) => { try { localStorage.setItem("learnhoro.chart", pl);
    localStorage.setItem("nirayana.settings", JSON.stringify({ nak: "unequal" })); } catch (e) {} }, payload);
  await dp.goto("file://" + CWD + "/dashboard.html");
  await dp.waitForTimeout(5000);
  const r = await dp.evaluate(() => ({ note: [...document.querySelectorAll(".note")].map((n) => n.textContent).join(" | "),
    sys: window.__dashLast && window.__dashLast() && window.__dashLast().nakshatra_system }));
  is(/nakṣatra system/.test(r.note), "arriving with an equal-nakṣatra chart under the unequal setting, the dashboard re-casts and names the nakṣatra system as the reason");
  await dp.close();
}

is(errs.length === 0, `no page errors (${errs.join("; ")})`);
await br.close();
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) { console.log("FAIL"); process.exit(1); }
