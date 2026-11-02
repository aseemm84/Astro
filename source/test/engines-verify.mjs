/* The three engines added for Chara daśā, Varṣaphala and the prastāra.
 *
 * Each of them had to be checked against something other than itself, because
 * each produces plausible-looking output when wrong. The Chara lengths in
 * particular shipped a swapped pair of special cases in their first version —
 * every ordinary period a year short, the lord-in-own-sign case eleven instead
 * of twelve, and the lord-in-next-sign case twelve instead of one — and the
 * table looked entirely reasonable throughout.
 *
 * So: hand-counted cases for Chara, an independent recomputation of the Sun
 * for the solar return, and the prastāra checked against the bhinna totals it
 * must add up to.
 */
const { createRequire } = await import("node:module");
const { chromium } = createRequire(import.meta.url)("playwright");
const ROOT = "file://" + process.cwd() + "/";
let pass = 0, fail = 0;
function head(t){ console.log("\n" + t); }
function is(c, t){ if (c) { pass++; console.log("  ok   " + t); }
                   else { fail++; console.log("  FAIL " + t); } }

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const errs = [];
page.on("pageerror", e => errs.push(e.message));
page.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text()); });
await page.goto(ROOT + "kundli.html");
await page.waitForFunction(() => !!document.getElementById("k-go"), null, { timeout: 25000 });
await page.evaluate(() => {
  try { localStorage.removeItem("nirayana.birth"); } catch (e) {}
  document.getElementById("k-dob").value = "1984-12-15";
  document.getElementById("k-tob").value = "13:31";
  document.getElementById("k-lat").value = "28.8389";
  document.getElementById("k-lon").value = "78.7768";
  document.getElementById("k-tz").value = "5.5";
});
await page.click("#k-go");
await page.waitForFunction(() => !!document.getElementById("kreport"), null, { timeout: 40000 });
await page.waitForTimeout(1000);

head("Chara daśā — the counting rule, against hand-counted cases");
const chara = await page.evaluate(() => {
  const Y = window.__charaYears, S = window.__charaSpan, O = window.__charaOdd;
  return {
    /* Mīna(11) → Dhanus(8), backward: Mīna, Kumbha, Makara, Dhanus = 4 signs, −1 = 3 */
    minaToDhanus: Y(11, 8, false),
    /* Kumbha(10) → Vṛṣabha(1), backward: ten signs counted, −1 = 9 */
    kumbhaToVrisha: Y(10, 1, false),
    /* a lord in the sign it rules: the one special case, twelve years */
    ownSign: Y(8, 8, false),
    /* a lord in the very next sign counted: two signs, −1 = one year */
    nextForward: Y(0, 1, true),
    nextBackward: Y(5, 4, false),
    /* the far end: eleven signs on is twelve counted, −1 = eleven */
    far: Y(0, 11, true),
    /* direction: Meṣa–Mithuna and Tulā–Dhanus count forward, the rest back */
    odd: [0,1,2,3,4,5,6,7,8,9,10,11].map(O),
    /* the span itself is the exclusive distance, 0..11 */
    /* backward from Meṣa to Vṛṣabha is eleven signs, not one — the first
       version of this check expected 1 and was simply wrong about the
       direction, which is worth keeping as a reminder that the expectation
       needs reading as carefully as the code */
    spans: [S(0,0,true), S(0,1,true), S(0,11,true), S(0,1,false), S(0,11,false)]
  };
});
is(chara.minaToDhanus === 3, "Mīna to Dhanus backward is 3 years (4 signs counted, less one)");
is(chara.kumbhaToVrisha === 9, "Kumbha to Vṛṣabha backward is 9 years");
is(chara.ownSign === 12, "a lord in the sign it rules gives 12 years, not 11");
is(chara.nextForward === 1 && chara.nextBackward === 1,
   "a lord in the next sign counted gives 1 year, not 12");
is(chara.far === 11, "eleven signs on gives 11 years");
is(JSON.stringify(chara.odd) ===
   JSON.stringify([true,true,true,false,false,false,true,true,true,false,false,false]),
   "Meṣa–Mithuna and Tulā–Dhanus count forward; Karka–Kanyā and Makara–Mīna back");
is(JSON.stringify(chara.spans) === JSON.stringify([0,1,11,11,1]),
   "the span is the exclusive distance in the direction asked for, zero when the lord is at home");

head("Chara daśā — the sequence as a whole");
const seq = await page.evaluate(() => {
  const CD = window.__charaDasha(window.__kApi.chart());
  return { n: CD.seq.length, distinct: new Set(CD.seq.map(s => s.sign)).size,
           years: CD.seq.map(s => s.years), dir: CD.direction,
           lagna: window.__kApi.chart().LS,
           total: CD.seq.reduce((a, s) => a + s.years, 0) };
});
is(seq.n === 12 && seq.distinct === 12, "twelve periods, one per rāśi, none repeated");
is(seq.years.every(y => y >= 1 && y <= 12), "every length is between 1 and 12 years");
is(seq.dir === false && seq.lagna === 11,
   "a Mīna lagna runs the sequence backward, because Mīna counts backward");
is(seq.total >= 12 && seq.total <= 144, "the cycle totals " + seq.total + " years, inside 12–144");

head("Varṣaphala — the Sun really returns");
const vp = await page.evaluate(() => {
  const D = window.__kApi.chart(), natal = D.P.Sun.sid;
  const a = window.__varshaPravesha(D.jd, natal, 40);
  const c = window.__varshaPravesha(D.jd, natal, 41);
  if (!a || !c) return null;
  /* recompute the Sun at the answer, independently of the search */
  const at = j => window.__kSidAt("Sun", new Date((j - 2440587.5) * 86400000));
  return { natal: natal, atA: at(a.jd), atC: at(c.jd),
           gap: c.jd - a.jd, errA: a.errArcsec, errC: c.errArcsec,
           /* a day either side must straddle the natal longitude */
           before: at(c.jd - 1), after: at(c.jd + 1) };
});
is(!!vp, "the search converges for two consecutive years");
is(vp && Math.abs(vp.atA - vp.natal) * 3600 < 1 && Math.abs(vp.atC - vp.natal) * 3600 < 1,
   "the Sun recomputed at each answer is within an arcsecond of its natal longitude");
is(vp && vp.gap > 365.2 && vp.gap < 365.3,
   "consecutive returns are " + (vp ? vp.gap.toFixed(4) : "?") + " days apart — a sidereal year");
is(vp && vp.before < vp.natal && vp.after > vp.natal,
   "a day either side of the answer straddles the natal longitude, so it is a crossing and not a coincidence");

head("Mudda daśā — Viṃśottarī scaled into one year");
const mu = await page.evaluate(() => {
  const M = window.__muddaDasha(100.0, 2451545.0, 365.2563627);
  if (!M || !M.list) return null;
  const tot = M.list.reduce((a, m) => a + m.days, 0);
  const full = M.list.filter(m => !m.partial);
  return { n: M.list.length, tot: tot, span: M.list[8].end - M.list[0].start,
           /* the nine full shares must be Viṃśottarī's proportions */
           ratio: full.map(m => +(m.days / 365.2563627 * 120).toFixed(3)),
           lords: M.list.map(m => m.lord) };
});
is(mu && mu.n === 9, "nine periods");
is(mu && mu.ratio.every(r => [7,20,6,10,7,18,16,19,17].indexOf(r) >= 0),
   "each full share scales back to its Viṃśottarī years exactly");
is(mu && mu.tot < 365.26 && mu.tot > 300,
   "they fill " + (mu ? mu.tot.toFixed(1) : "?") + " days — one year less the balance already spent");
is(mu && new Set(mu.lords).size === 9, "all nine lords, none repeated");

head("Prastārāṣṭakavarga — the rows must add up to the totals");
const pr = await page.evaluate(() => {
  const J = window.__kdata, AV = J.ashtakavarga, P = AV.prastara, ord = AV.kakshya_order;
  let bad = 0, cells = 0, rows = 0;
  AV.bhinna.forEach(b => {
    ord.forEach(c => { if (P[b.graha] && P[b.graha][c]) rows++; });
    for (let sg = 0; sg < 12; sg++) {
      let n = 0;
      ord.forEach(c => { const r = P[b.graha] && P[b.graha][c]; if (r) n += r[sg]; });
      cells++; if (n !== b.bindus[sg]) bad++;
    }
  });
  /* every cell is 0 or 1 — a contributor gives a bindu or it does not */
  let notBinary = 0;
  Object.keys(P).forEach(g => Object.keys(P[g]).forEach(c =>
    P[g][c].forEach(v => { if (v !== 0 && v !== 1) notBinary++; })));
  return { bad, cells, rows, notBinary, sarva: AV.sarva.reduce((a, x) => a + x, 0),
           order: ord.join(",") };
});
is(pr.bad === 0, "all " + pr.cells + " cells sum to the bhinnāṣṭakavarga row");
is(pr.rows === 56, "seven grahas × eight contributors = " + pr.rows + " rows");
is(pr.notBinary === 0, "every cell is a bindu or no bindu, never a count");
is(pr.sarva === 337, "the sarva total is still 337, so nothing was disturbed");
is(pr.order === "Saturn,Jupiter,Mars,Sun,Venus,Mercury,Moon,Lagna",
   "the kakṣyā order is Śani first and the Lagna last");

head("Kakṣyā — the 3°45′ division");
const kk = await page.evaluate(() => {
  const K = window.__kakshyaOf;
  return { at: [0, 3.749, 3.751, 7.4, 29.99, 30, 33.76].map(K),
           all: Array.from({length: 8}, (_, i) => K(i * 3.75 + 1)) };
});
is(JSON.stringify(kk.at) === JSON.stringify([0,0,1,1,7,0,1]),
   "the boundaries fall at exact multiples of 3°45′, and reset at each sign");
is(JSON.stringify(kk.all) === JSON.stringify([0,1,2,3,4,5,6,7]),
   "a sign holds exactly eight kakṣyās");

head("The sections render");
const rendered = await page.evaluate(() => {
  const names = ["Chara daśā", "Varṣaphala", "Prastārāṣṭakavarga"];
  return names.map(n => {
    const s = [...document.querySelectorAll("#kreport .ksec")].find(x => {
      const h = x.querySelector(".kh");
      return h && h.childNodes[0].textContent.indexOf(n) >= 0; });
    return { n, there: !!s, broke: s ? /could not be computed|could not be/.test(s.innerText) : true,
             len: s ? s.innerText.length : 0 };
  });
});
rendered.forEach(r => is(r.there && !r.broke && r.len > 400,
  r.n + " renders (" + r.len + " characters, no error box)"));

head("The page behaves");
is(errs.length === 0, "no console errors" + (errs.length ? " — " + errs[0].slice(0, 140) : ""));

await browser.close();
console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
