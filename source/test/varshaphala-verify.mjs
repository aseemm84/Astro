/* The running year's varṣaphala, held to three things at once.
 *
 * WHY THIS EXISTS. The report computed a varṣaphala and the analyst JSON
 * carried none — a surface without its export, the same gap closed earlier
 * for bhāva-phala and exact bhāva bala. Both now read one computation
 * (varshaphalaData in 75-varshaphala.js). This suite checks:
 *
 *   1. the JSON against the PANE — what a reader sees and what an analyst
 *      receives must be the same year, the same entry, the same Muntha;
 *   2. the JSON against an INDEPENDENT recomputation — the Sun recomputed at
 *      the stated entry, Muntha from its one-line rule, Mudda daśā summing to
 *      the year, the entry bracketed by the export moment;
 *   3. the JSON's honesty — Tājika labelled as not-BPHS, Varṣeśa NOT asserted,
 *      and the things not computed named rather than silently absent.
 *
 * Both paddhatis, because the annual chart is cast through the same engine
 * and its houses follow the frame.
 *
 * Falsified before trusting: run with --plant to corrupt the JSON's Muntha
 * and its entry time in-page; the suite must fail.
 *
 * Run from the repository root:  node source/test/varshaphala-verify.mjs [--plant]
 */
import { createRequire } from "node:module";
let chromium;
try { ({ chromium } = await import("playwright")); }
catch { ({ chromium } = createRequire("/opt/npm-tools/package.json")("playwright")); }

const CWD = process.cwd();
const PLANT = process.argv.includes("--plant");
let pass = 0, fail = 0;
const head = (t) => console.log("\n" + t);
const is = (c, t) => { if (c) { pass++; console.log("  ok   " + t); }
                       else { fail++; console.log("  FAIL " + t); } };

const BIRTH = { year: 1990, month: 3, day: 15, hour: 10, minute: 30,
                lat: 28.6139, lon: 77.2090, tzHours: 5.5 };
const SA = ["Meṣa","Vṛṣabha","Mithuna","Karka","Siṃha","Kanyā",
            "Tulā","Vṛścika","Dhanus","Makara","Kumbha","Mīna"];

const browser = await chromium.launch();
const errs = [];

async function run(mode) {
  const pg = await browser.newPage();
  pg.on("pageerror", (e) => errs.push(mode + ": " + e.message));
  await pg.goto("file://" + CWD + "/kundli.html");
  await pg.waitForFunction(() => window.buildLocalChart && window.buildKundliReport &&
    window.buildJyotishaPayload && window.__deriveForExport && window.__kSidAt,
    null, { timeout: 45000 });
  return pg.evaluate(([b, m, plant]) => {
    const J = window.buildLocalChart(Object.assign({}, b, { houseSystem: m }));
    const html = window.buildKundliReport(J);
    J.derived = window.__deriveForExport(J) || {};
    const P = window.buildJyotishaPayload(J);
    const asof = (P.derived && P.derived.as_of) || {};
    const V = asof.varshaphala || null;
    if (plant && V && V.available) {
      V.muntha.sign = (V.muntha.sign + 1) % 12;
      V.varsha_pravesha.jd_utc += 0.5;
    }

    /* the pane, read as a reader reads it */
    const host = document.createElement("div"); host.innerHTML = html;
    const tables = [...host.querySelectorAll("table")];
    const cellsAfter = (label) => {
      for (const t of tables) for (const tr of t.querySelectorAll("tr")) {
        const td = [...tr.querySelectorAll("td")];
        for (let i = 0; i < td.length - 1; i++)
          if (td[i].textContent.trim() === label) return td[i + 1].textContent.trim();
      }
      return null;
    };
    const office = tables.find((t) => [...t.querySelectorAll("th")]
      .map((x) => x.textContent.trim()).join("|") === "Office|Graha|In the annual chart|By what rule");
    const offices = office ? [...office.querySelectorAll("tr")].map((tr) =>
      [...tr.querySelectorAll("td")].map((x) => x.textContent.trim())).filter((r) => r.length) : [];
    const mudda = tables.find((t) => [...t.querySelectorAll("th")]
      .map((x) => x.textContent.trim()).join("|") === "Lord|Length|From – to|");
    const muddaLords = mudda ? [...mudda.querySelectorAll("tr td:first-child b")]
      .map((x) => x.textContent.trim()) : [];
    const pane = { year: cellsAfter("Year"), entry: cellsAfter("Varṣapraveśa"),
      lagna: cellsAfter("Varṣa lagna"), muntha: cellsAfter("Muntha"),
      munthaHouse: cellsAfter("Muntha house"), offices, muddaLords };

    /* independent recomputation, in-page, from the engine's own Sun */
    let indep = null;
    if (V && V.available) {
      const at = (jd) => window.__kSidAt("Sun", new Date((jd - 2440587.5) * 86400000));
      /* grahas are keyed by Sanskrit name; a lookup that silently found nothing
         would compare against null and fail for the wrong reason */
      const natSun = J.grahas.find((g) => g.key === "Sūrya");
      if (!natSun) throw new Error("natal Sun not found in J.grahas");
      const natSid = natSun.sidereal_deg;
      const d = (a, c) => ((((a - c) + 540) % 360) - 180);
      indep = {
        natalSun: natSid,
        sunAtEntryErrArcsec: Math.abs(d(at(V.varsha_pravesha.jd_utc), natSid)) * 3600,
        sunAtNextErrArcsec: V.next_varsha_pravesha_jd_utc == null ? null
          : Math.abs(d(at(V.next_varsha_pravesha_jd_utc), natSid)) * 3600,
        natalLagnaSign: J.lagna && J.lagna.rashi && J.lagna.rashi.idx,
        exportJd: asof.generated_jd,
        birthJd: J.jd_utc
      };
    }
    const rdSame = JSON.stringify(asof.running_dasha || null) === JSON.stringify(P.derived.running_dasha || null)
                   && !!P.derived.running_dasha;
    const cautionRd = /derived\.running_dasha/.test((P.derived.guide && P.derived.guide.caution) || "");
    return { V, pane, indep, rdSame, cautionRd, mode: J.house_system && J.house_system.mode,
             reading: (P.derived.guide && P.derived.guide.reading_order) || [],
             warning: asof.WARNING || "" };
  }, [BIRTH, mode, PLANT]);
}

for (const mode of ["whole-sign", "sripati"]) {
  const r = await run(mode);
  const V = r.V, X = r.indep, Pn = r.pane;
  head(`[${mode}] the JSON carries the year`);
  is(V && V.available === true, "derived.as_of.varshaphala present and available");
  if (!V || !V.available) continue;
  is(r.reading.includes("derived.as_of.varshaphala"), "guide.reading_order names it");
  is(/varshaphala/.test(r.warning), "as_of WARNING says the varṣaphala goes stale");
  is(r.rdSame, "the running daśā is also inside as_of, identical to derived.running_dasha");
  is(/running daśā/.test(r.warning) && r.cautionRd,
     "and both the as_of WARNING and the guide say it goes stale");

  head(`[${mode}] honesty — tier, Varṣeśa, what is not computed`);
  is(/Tājika/.test(V.tier) && /NOT in the uploaded Santhanam edition/.test(V.tier),
     "tier says Tājika and not BPHS");
  is(V.varshesha.asserted === false, "Varṣeśa is not asserted");
  is(V.varshesha.candidates.length === 5, "five office-bearers named");
  is(/Pañcavargīya/.test(V.varshesha.reason), "reason names Pañcavargīya bala as uncomputed");
  is(V.not_computed.includes("Sahamas") && V.not_computed.some((x) => /Tājika yogas/.test(x)),
     "Sahamas and Tājika yogas listed as not computed");

  head(`[${mode}] against independent recomputation`);
  is(X.sunAtEntryErrArcsec < 1, `Sun at the stated entry is ${X.sunAtEntryErrArcsec.toFixed(3)}″ from natal (< 1″)`);
  is(X.sunAtNextErrArcsec == null || X.sunAtNextErrArcsec < 1, "Sun at the next entry likewise");
  is(V.varsha_pravesha.jd_utc <= X.exportJd + 1e-6, "the entry is not after the export moment");
  is(V.next_varsha_pravesha_jd_utc == null || V.next_varsha_pravesha_jd_utc > X.exportJd - 1e-6,
     "the next entry is not before it — this is the running year");
  is(V.muntha.sign === (X.natalLagnaSign + V.completed_years) % 12,
     `Muntha = natal lagna + completed years (${SA[V.muntha.sign]})`);
  is(V.muntha.house_from_varsha_lagna === ((V.muntha.sign - V.varsha_lagna.sign + 12) % 12) + 1,
     "Muntha house counted by rāśi from the varṣa lagna, as its house_rule says");
  is(V.year_number === V.completed_years + 1, "year number = completed years + 1");
  const sumDays = V.mudda_dasha.periods.reduce((a, p) => a + p.days, 0);
  const expect = V.year_length_days * (1 - (1 - V.mudda_dasha.balance_at_entry) * (
    { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 }
    [V.mudda_dasha.starting_lord] / 120));
  is(Math.abs(sumDays - expect) < 0.01, `Mudda periods sum to the year less the expired share (${sumDays.toFixed(3)} d)`);
  is(V.mudda_dasha.periods.every((p, i, a) => i === 0 || Math.abs(p.start_jd - a[i - 1].end_jd) < 1e-5),
     "Mudda periods are contiguous");
  is(V.annual_chart_house_system === r.mode, `annual chart's houses follow the frame (${r.mode})`);

  head(`[${mode}] the JSON against the pane`);
  is(Pn.year && Pn.year.startsWith(String(V.year_number)), `year ${V.year_number} on both`);
  is(Pn.muntha === SA[V.muntha.sign], `Muntha ${SA[V.muntha.sign]} on both`);
  is(Pn.munthaHouse && Pn.munthaHouse.startsWith(String(V.muntha.house_from_varsha_lagna)), "Muntha house on both");
  is(Pn.lagna && Pn.lagna.startsWith(SA[V.varsha_lagna.sign]), "varṣa lagna sign on both");
  is(Pn.entry && Pn.entry.includes(V.varsha_pravesha.local_time), `entry ${V.varsha_pravesha.local_time} local on both`);
  is(Pn.offices.length === 5 && Pn.offices.every((o, i) =>
     o[0] === V.varshesha.candidates[i].office && o[1] === V.varshesha.candidates[i].graha),
     "the five offices and their grahas on both");
  is(Pn.muddaLords.join(",") === V.mudda_dasha.periods.map((p) => p.lord).join(","),
     "Mudda lords in the same order on both");
}

head("no page errors");
is(errs.length === 0, errs.length ? errs.join(" | ") : "none");
await browser.close();
console.log(`\n${pass} passed, ${fail} failed${PLANT ? "  (PLANTED FAULT RUN — failures expected)" : ""}`);
process.exit(fail ? 1 : 0);
