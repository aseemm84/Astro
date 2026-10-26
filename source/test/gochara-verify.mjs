/* ===== The year of transits, and the twelve readings of it ================

   THE CHECK THAT MATTERS IS THE REPLAY. A list of ingresses is a claim
   about every day of the year: that between two consecutive events, the
   graha stayed in one rāśi. So the list is replayed — for every graha, for
   every day of the year, the sign implied by the computed spans is compared
   against the sign the ephemeris actually reports. Any excursion the scan
   stepped over shows up immediately as a run of mismatched days. This is
   the only test that can catch the characteristic failure of transit code,
   which is a planet that crosses a cusp, turns retrograde, crosses back and
   crosses again, reported as one ingress instead of three.

   The rest are invariants that must hold whatever year is picked: the Sun
   changes sign twelve times, every station alternates retrograde and
   direct, Sade Sati lands on three of the twelve rāśis and the two Śani
   dhaiyās on two more, and a reading from one rāśi is a rotation of the
   reading from the next. Several of these are statements about the sky
   rather than about this code, which is what makes them worth asserting.

   Three years apart are checked, because an engine can be right about the
   year someone happened to develop against. */

import { createRequire } from "node:module";
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
await pg.goto("file://" + process.cwd() + "/kundli.html");
await pg.waitForFunction(() => window.SPGochara && window.SPRashiphal &&
                               window.__kSidAt, null, { timeout: 40000 });

const YEARS = [1977, 2027, 2061];

/* ---- 1. the replay ------------------------------------------------------ */
head("Every day of the year agrees with the ephemeris");
for (const y of YEARS) {
  const r = await pg.evaluate((yy) => {
    const G = window.SPGochara;
    const R = G.year(yy, { moon: true });
    const bad = [];
    let checked = 0;
    R.bodyList.forEach((b) => {
      /* sampled through the day rather than at midnight, so an ingress
         that happens in the small hours is not systematically missed */
      for (let jd = R.jd0 + 0.13; jd < R.jd1; jd += 0.5) {
        const a = G.signAtJd(R, b, jd), c = G.signOf(G.sid(b, jd));
        checked++;
        if (a !== c) bad.push(b + " " +
          G.jdToDate(jd).toISOString().slice(0, 13) +
          " spans=" + a + " ephemeris=" + c);
      }
    });
    return { checked, bad: bad.slice(0, 4), n: bad.length,
             events: R.events.length };
  }, y);
  is(r.n === 0, y + ": " + r.checked.toLocaleString("en-GB") +
     " half-day samples across all nine grahas reproduce the ephemeris" +
     (r.n ? " — " + r.n + " mismatches, e.g. " + r.bad[0] : "") +
     " (" + r.events + " events)");
}

/* ---- 2. invariants about the sky ---------------------------------------- */
head("Invariants that hold for any year");
for (const y of YEARS) {
  const r = await pg.evaluate((yy) => {
    const G = window.SPGochara, R = G.year(yy, { moon: true });
    const out = {};
    out.sun = R.bodies.Sun.ingresses.length;
    out.moon = R.bodies.Moon.ingresses.length;
    /* stations must alternate: two retrogrades in a row means one was
       missed, which a sign-only test would never notice */
    out.alt = true;
    R.bodyList.forEach((b) => {
      let last = null;
      R.bodies[b].stations.forEach((s) => {
        if (last === s.kind) out.alt = false;
        last = s.kind;
      });
    });
    /* an ingress must actually change the sign across the instant */
    out.sharp = 0;
    R.events.filter((e) => e.kind === "ingress").forEach((e) => {
      const a = G.signOf(G.sid(e.body, e.jd - 1 / 1440));
      const c = G.signOf(G.sid(e.body, e.jd + 1 / 1440));
      if (a === c) out.sharp++;
    });
    /* and the spans must tile the year with no gap and no overlap */
    out.tiles = true;
    R.bodyList.forEach((b) => {
      const sp = R.spans[b];
      if (Math.abs(sp[0].from - R.jd0) > 1e-9) out.tiles = false;
      if (Math.abs(sp[sp.length - 1].to - R.jd1) > 1e-9) out.tiles = false;
      for (let i = 1; i < sp.length; i++)
        if (Math.abs(sp[i].from - sp[i - 1].to) > 1e-9) out.tiles = false;
    });
    return out;
  }, y);
  is(r.sun === 12, y + ": Sūrya changes rāśi exactly 12 times — got " + r.sun);
  is(r.moon >= 12 && r.moon <= 14 * 12,
     y + ": Candra changes rāśi " + r.moon + " times, in the right range " +
     "for a body that crosses a sign in about two and a quarter days");
  is(r.alt, y + ": every station alternates retrograde and direct");
  is(r.sharp === 0, y + ": every ingress instant has a different sign a " +
     "minute either side" + (r.sharp ? " — " + r.sharp + " do not" : ""));
  is(r.tiles, y + ": the spans tile the year with no gap or overlap");
}

/* ---- 3. the readings ---------------------------------------------------- */
head("The twelve readings");
const rd = await pg.evaluate(() => {
  const G = window.SPGochara, P = window.SPRashiphal;
  const R = G.year(2027);
  const reads = P.SIGNS.map((s, i) => P.read(R, i, null));
  const out = {};
  /* Sade Sati falls on the rāśi Śani is in and its two neighbours, so
     across the twelve it must land on at least three and the dhaiyās on
     two more. This is a statement about the sky: it cannot be true of a
     table that was typed in. */
  out.ss = reads.filter((r) => r.sani.some((s) => [12, 1, 2].indexOf(s.house) >= 0))
                .map((r) => r.signName);
  out.dh = reads.filter((r) => r.sani.some((s) => [4, 8].indexOf(s.house) >= 0))
                .map((r) => r.signName);
  /* every rāśi must place every graha in some house, and the houses of one
     rāśi must be the houses of the next rotated by one */
  out.rot = true;
  for (let i = 0; i < 12; i++) {
    const a = reads[i], b = reads[(i + 1) % 12];
    a.grahas.forEach((g, k) => {
      const h1 = g.mainHouse, h2 = b.grahas[k].mainHouse;
      if (((h1 - 2 + 12) % 12) + 1 !== h2) out.rot = false;
    });
  }
  out.allHoused = reads.every((r) =>
    r.grahas.every((g) => g.mainHouse >= 1 && g.mainHouse <= 12));
  /* with no chart the one BPHS-tier rule has nothing to read, and must
     say so rather than inventing bindus */
  out.noAshtaka = reads.every((r) => r.ashtaka === null);
  /* the favourable-house lists must be houses */
  out.goodOk = Object.keys(P.GOOD).every((k) =>
    P.GOOD[k].every((h) => h >= 1 && h <= 12));
  return out;
});
is(rd.ss.length >= 3, "Sade Sati lands on " + rd.ss.length +
   " rāśis in 2027 (" + rd.ss.join(", ") + "), as it must when Śani sits " +
   "in one sign and its neighbours count the 12th and 2nd");
is(rd.dh.length >= 2, "the two Śani dhaiyās land on " + rd.dh.length +
   " more (" + rd.dh.join(", ") + ")");
is(rd.rot, "each rāśi's houses are the next rāśi's rotated by one — the " +
   "reading is a rotation, not twelve separate tables");
is(rd.allHoused, "every graha is placed in a house from every rāśi");
is(rd.noAshtaka, "with no chart loaded the one BPHS-tier rule reports " +
   "nothing rather than inventing bindus");
is(rd.goodOk, "every favourable-house list contains only real houses");

/* ---- 4. it works with no chart ------------------------------------------ */
head("No chart required");
const ui = await pg.evaluate(() => {
  const n = document.getElementById("go-run");
  return { btn: !!n, sel: !!document.getElementById("rp-sign"),
           chart: !!(window.__kApi && window.__kApi.chart &&
                     window.__kApi.chart()) };
});
is(ui.btn && ui.sel, "the panels are on the page before anything is cast");
is(!ui.chart, "and no chart has been cast");
await pg.click("#go-run");
await pg.waitForTimeout(2500);
const after = await pg.evaluate(() => ({
  year: document.getElementById("go-out").innerHTML.length,
  read: document.getElementById("rp-out").innerHTML.length,
  tiers: document.querySelectorAll("#rp-out .gotier").length,
  caution: document.querySelectorAll("#rp-out .gocaution").length
}));
is(after.year > 2000 && after.read > 2000,
   "both panels render with no chart (" + after.year + " and " +
   after.read + " chars)");
is(after.tiers >= 3, "every section of the reading carries a source tier (" +
   after.tiers + " badges)");
is(after.caution === 1, "and the reading ends with the non-prediction note");

/* ---- 5. nothing is promised --------------------------------------------- */
head("The wording stays non-deterministic");
/* The caution block is excluded, and only the caution block: it is the one
   paragraph whose job is to say that nothing here states an event WILL
   HAPPEN, so scanning it for that phrase fails the page for containing its
   own disclaimer. Everything else — every rule, every Śani phase, every
   note — is scanned. */
const words = await pg.evaluate(() => {
  const root = document.getElementById("rp-out").cloneNode(true);
  root.querySelectorAll(".gocaution").forEach((n) => n.remove());
  return root.textContent;
});
const BANNED = [/\bwill (?:bring|give|cause|happen|occur|result)/i,
                /\byou will\b/i, /\bguarantee/i, /\bcertain(?:ly)? to\b/i,
                /\bpredicts?\b/i];
const hit = BANNED.filter((re) => re.test(words));
is(hit.length === 0, "no sentence promises an outcome" +
   (hit.length ? " — matched " + hit[0] : ""));

head("The page behaves");
is(errs.length === 0, "no console errors" +
   (errs.length ? " — " + errs[0].slice(0, 140) : ""));

await br.close();
console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
