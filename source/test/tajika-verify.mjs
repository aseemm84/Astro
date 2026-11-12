/* The Tājika reckonings of the year, held to Raman's legible text and to
 * independent re-derivation.
 *
 * Source: B. V. Raman, "Varshaphal or the Hindu Progressed Horoscope", cited by
 * article. Not BPHS — Tājika, later tradition, labelled so on every surface.
 *
 *   Hadda       Raman's legible Meṣa and Mīna rows, and the Egyptian-term
 *               totals (Jupiter 79, Venus 82, Mercury 76, Mars 66, Saturn 57)
 *   Pañcavargīya re-derived here for every graha from the annual chart's
 *               longitudes by Arts. 32–40, written out independently
 *   Tri-rāśi    Raman's two legible examples (Makara by day → Mars, Vṛṣabha by
 *               night → Moon)
 *   Varṣeśa     the strongest eligible candidate; Dina-rātri is a SIGN lord
 *   Sahams      the 30° rule both ways; Puṇya by hand
 *   Pātyāyinī   shares sum to the year; order ascending by kṛṣāṃśa
 *
 * Run from the repository root:  node source/test/tajika-verify.mjs
 */
import { createRequire } from "node:module";
let chromium;
try { ({ chromium } = await import("playwright")); }
catch { ({ chromium } = createRequire("/opt/npm-tools/package.json")("playwright")); }

let pass = 0, fail = 0;
const head = (t) => console.log("\n" + t);
const is = (c, t) => { if (c) { pass++; console.log("  ok   " + t); } else { fail++; console.log("  FAIL " + t); } };
const br = await chromium.launch(); const pg = await br.newPage();
const errs = []; pg.on("pageerror", (e) => errs.push(e.message));
await pg.goto("file://" + process.cwd() + "/kundli.html");
await pg.waitForFunction(() => window.__tajika && window.buildLocalChart && window.buildJyotishaPayload && window.__deriveForExport,
  null, { timeout: 60000 });

head("Hadda — the Egyptian terms");
const H = await pg.evaluate(() => window.__tajika.hadda);
const row = (s) => H[s].map((x) => x[0] + " " + x[1]).join(", ");
is(row(0) === "Jupiter 6, Venus 12, Mercury 20, Mars 25, Saturn 30", `Meṣa matches Raman Art. 36: ${row(0)}`);
is(row(11) === "Venus 12, Jupiter 16, Mercury 19, Mars 28, Saturn 30", `Mīna matches Raman Art. 36: ${row(11)}`);
const tot = {}; H.forEach((r) => { let p = 0; r.forEach(([g, e]) => { tot[g] = (tot[g] || 0) + e - p; p = e; }); });
is(H.every((r) => r[r.length - 1][1] === 30 && new Set(r.map((x) => x[0])).size === 5), "every sign spans 30° and holds each of the five once");
is(tot.Jupiter === 79 && tot.Venus === 82 && tot.Mercury === 76 && tot.Mars === 66 && tot.Saturn === 57,
   `the classical totals: Jupiter ${tot.Jupiter}, Venus ${tot.Venus}, Mercury ${tot.Mercury}, Mars ${tot.Mars}, Saturn ${tot.Saturn}`);

head("Tri-rāśi lords");
const TR = await pg.evaluate(() => window.__tajika.trirashi);
is(TR[9][0] === "Mars", "Makara by day → Mars (Raman Art. 46 example)");
is(TR[1][1] === "Moon", "Vṛṣabha by night → Moon (Raman Art. 46 example)");

for (const mode of ["whole", "sripati"]) for (const B of [
  { year: 1984, month: 12, day: 15, hour: 13, minute: 31, lat: 28.8389, lon: 78.7768 },
  { year: 1987, month: 1, day: 18, hour: 4, minute: 6, lat: 27.8817, lon: 79.9092 }]) {
  const R = await pg.evaluate(([b, m]) => {
    const J = window.buildLocalChart(Object.assign({ tzHours: 5.5, ayanamsa: "lahiri", node: "mean", name: "T", houseSystem: m }, b));
    const html = window.buildKundliReport(J); J.derived = window.__deriveForExport(J) || {};
    const P = window.buildJyotishaPayload(J), V = P.derived.as_of.varshaphala;
    /* the annual chart, recast from the stated entry, independently of the module */
    const jd = V.varsha_pravesha.jd_utc, d = new Date((jd - 2440587.5) * 86400000 + 5.5 * 3600000);
    const AJ = window.buildLocalChart(Object.assign({}, J.input, { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
      hour: d.getUTCHours(), minute: d.getUTCMinutes() }));
    const lon = {}; AJ.grahas.forEach((g) => { lon[({ "Sūrya": "Sun", "Candra": "Moon", "Maṅgala": "Mars", "Budha": "Mercury", "Guru": "Jupiter",
      "Śukra": "Venus", "Śani": "Saturn", "Rāhu": "Rahu", "Ketu": "Ketu" })[g.key]] = g.sidereal_deg; });
    return { V, lon, lag: AJ.lagna.sidereal_deg, pane: /Pañcavargīya bala/.test(html) && /Pātyāyinī daśā/.test(html) && /Varṣeśa: /.test(html) };
  }, [B, mode]);
  const V = R.V, tag = `[${B.year} · ${mode}]`;
  head(`${tag} the year`);
  is(R.pane, "the pane shows Pañcavargīya bala, the Varṣeśa and Pātyāyinī daśā");
  /* Pañcavargīya, independently */
  const LORD = ["Mars","Venus","Mercury","Moon","Sun","Mercury","Venus","Mars","Jupiter","Saturn","Saturn","Jupiter"];
  const camp = { Sun: 0, Moon: 0, Mars: 0, Jupiter: 0, Mercury: 1, Venus: 1, Saturn: 1 };
  const rel = (p, l) => p === l ? 1 : camp[p] === camp[l] ? 0.5 : 0.25;
  const ex = { Sun: 10, Moon: 33, Mars: 298, Mercury: 165, Jupiter: 95, Venus: 357, Saturn: 200 };
  let worst = 0;
  for (const g of Object.keys(camp)) {
    const L = ((R.lon[g] % 360) + 360) % 360, s = Math.floor(L / 30), dg = L - s * 30;
    let hl = null; for (const [p, e] of H[s]) if (dg < e) { hl = p; break; }
    let dd = Math.abs(L - (ex[g] + 180) % 360); if (dd > 180) dd = 360 - dd;
    const t = 30 * rel(g, LORD[s]) + dd / 9 + 15 * rel(g, hl) + 10 * rel(g, LORD[(s + 4 * Math.floor(dg / 10)) % 12]) + 5 * rel(g, LORD[Math.floor(L * 0.3) % 12]);
    worst = Math.max(worst, Math.abs(t / 4 - V.panchavargiya_bala.grahas[g].quarter));
  }
  is(worst < 1e-3, `Pañcavargīya ÷ 4 re-derived for all seven grahas (worst difference ${worst.toExponential(1)})`);
  /* Varṣeśa */
  const C = V.varshesha.candidates, elig = C.filter((c) => c.aspects_varsha_lagna), pool = elig.length ? elig : C;
  const best = Math.max(...pool.map((c) => c.panchavargiya_quarter));
  is(pool.some((c) => c.graha === V.varshesha.graha && Math.abs(c.panchavargiya_quarter - best) < 1e-9), `Varṣeśa ${V.varshesha.graha} is the strongest eligible candidate`);
  const lum = V.sahams.entry_by === "day" ? "Sun" : "Moon", lumSign = Math.floor((((R.lon[lum] % 360) + 360) % 360) / 30);
  is(C[4].graha === LORD[lumSign], `Dina-rātri lord is the lord of the ${lum}'s sign (${C[4].graha}), not the ${lum} itself`);
  const vl = V.varsha_lagna.sign;
  is(C[3].graha === ["Sun","Venus","Saturn","Venus","Jupiter","Moon","Mercury","Mars","Saturn","Mars","Jupiter","Moon"].concat()[vl] && V.sahams.entry_by === "day" ||
     C[3].graha === ["Jupiter","Moon","Mercury","Mars","Sun","Venus","Saturn","Venus","Saturn","Moon","Mercury","Mars"][vl] && V.sahams.entry_by === "night",
     `Tri-rāśi lord follows the table for the varṣa lagna by ${V.sahams.entry_by}`);
  /* Puṇya saham by hand */
  const m = (x) => ((x % 360) + 360) % 360;
  const [A, Bv] = V.sahams.entry_by === "day" ? [R.lon.Moon, R.lon.Sun] : [R.lon.Sun, R.lon.Moon];
  const btw = m(R.lag - Bv) < m(A - Bv), pun = m(A - Bv + R.lag + (btw ? 0 : 30));
  is(Math.abs(m(pun - V.sahams.sahams.punya.longitude + 180) - 180) < 1e-3 && V.sahams.sahams.punya.added_30 === !btw,
     `Puṇya saham by hand: ${pun.toFixed(3)}° (${btw ? "lagna between, no 30°" : "lagna not between, +30°"})`);
  /* Pātyāyinī */
  const pa = V.patyayini_dasha.periods, sum = pa.reduce((a, x) => a + x.days, 0);
  is(Math.abs(sum - V.year_length_days) < 0.01 && pa.length === 8, `Pātyāyinī: eight periods summing to the year (${sum.toFixed(3)} of ${V.year_length_days} d)`);
  is(pa.every((x, i) => i === 0 || x.krishamsha >= pa[i - 1].krishamsha) && pa.every((x, i, a) => i === 0 || Math.abs(x.start_jd - a[i - 1].end_jd) < 1e-5),
     "in ascending kṛṣāṃśa, contiguous");
  /* yogas: every Itthaśāla is within orb and closing */
  const Y = V.tajika_aspects_and_yogas.pairs;
  is(Y.every((y) => !y.yoga || (Math.abs(y.degree_gap) <= y.orb && (y.yoga === "Itthaśāla") === (y.degree_gap >= 0))),
     `every Itthaśāla/Īśarāpha is within orb and on the right side (${Y.filter((y) => y.yoga).length} found)`);
}
head("no page errors"); is(errs.length === 0, errs.join(" | ") || "none");
await br.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
