/* Validate the analyst payload against LearnHoroJyotishaChartPayload.

   The schema is not vendored as a file — it would go stale against the consumer's
   own copy. What is checked here is every constraint the schema actually states:
   required keys at each level, the two closed enums, the numeric ranges, and the
   object-vs-array shapes. Then the payload is checked back against the standard
   export, because a renamed field that no longer carries the same number is worse
   than a missing one. */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
let chromium;
try { ({ chromium } = await import("playwright")); }
catch { ({ chromium } = createRequire(import.meta.url)("playwright")); }

const here = path.dirname(fileURLToPath(import.meta.url));
const page_url = "file://" + path.join(here, "..", "..", "kundli.html");

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log("  ok   " + name); }
  else { fail++; console.log("  FAIL " + name + (extra ? "  — " + extra : "")); }
};

const DIGNITY = ["exalted","moolatrikona","own_sign","great_friend","friend",
                 "neutral","enemy","great_enemy","debilitated"];
const YOGACAT = ["Raja","Dhana","Nabhasa","Chandra","Surya","Arishta","Other"];
/* the revised spec promotes avasthas_full, ashtottari and yogini to required */
const DERIVED_REQ = ["guide","conventions","sensitivity","as_of","houses","chalit",
  "combust","status","avasthas_full","bhava_bala","vimsopaka","ishta_kashta",
  "graha_drishti","rashi_drishti","argala","ashtakavarga_shodhana",
  "divisional_ashtakavarga","vimshottari_tree","running_dasha","ashtottari","yogini",
  "panchanga_at_birth","avakhada","upagrahas","special_lagnas","karakamsha","sripati"];
const STATUS_ENUM = ["yogakaraka","functional_benefic","neutral","functional_malefic","maraka"];
const VIM_SCHEMES = ["shadvarga","saptavarga","dasavarga","shodashavarga"];
const GRAHA_REQ = ["longitude_nirayana","rashi_index","rashi_name","degree_in_rashi",
  "nakshatra_name","nakshatra_pada","speed_deg_per_day","is_retrograde","dignity"];
const META_REQ = ["name","datetime_utc","julian_day","latitude","longitude","timezone_offset"];
const MANDATORY_VARGAS = ["D1","D2","D3","D4","D7","D9","D10","D12","D16","D20",
                          "D24","D27","D30","D40","D45","D60"];

const browser = await chromium.launch();
const pg = await browser.newPage();
const errs = [];
pg.on("pageerror", e => errs.push(e.message));
await pg.goto(page_url);

const got = await pg.evaluate(() => {
  const i = { year:1984, month:12, day:15, hour:13, minute:31,
              lat:28.8389, lon:78.7768, tzHours:5.5,
              ayanamsa:"lahiri", node:"mean", name:"Test Native" };
  const J = window.buildLocalChart(i);
  J.derived = window.__deriveForExport(J);
  let P = null, err = null;
  try { P = window.buildJyotishaPayload(J); } catch (e) { err = e.message; }
  return { J, P, err, hasBuilder: typeof window.buildJyotishaPayload === "function" };
});

console.log("\nanalyst payload");
ok("builder is exposed", got.hasBuilder);
ok("builder did not throw", !got.err, got.err);
if (!got.P) { console.log("\nno payload — stopping"); await browser.close(); process.exit(1); }

const P = got.P, J = got.J;

console.log("\ntop level");
for (const k of ["meta","grahas","vargas","shadbala","ashtakavarga","yogas","derived"])
  ok("required: " + k, P[k] != null);
for (const [k, want] of [["grahas","object"],["vargas","object"],["shadbala","object"],
                         ["ashtakavarga","object"],["arudhas","object"],["yogas","array"]]) {
  const isArr = Array.isArray(P[k]);
  ok(k + " is " + want, want === "array" ? isArr : (P[k] && typeof P[k] === "object" && !isArr));
}

console.log("\nmeta");
for (const k of META_REQ) ok("required: " + k, P.meta[k] != null && P.meta[k] !== "");
ok("datetime_utc is ISO", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(P.meta.datetime_utc || ""));
ok("julian_day is a number", typeof P.meta.julian_day === "number");
ok("lat/lon round-trip", P.meta.latitude === 28.8389 && P.meta.longitude === 78.7768);
{ /* the UTC stamp must be the local birth time minus the offset */
  const d = new Date(P.meta.datetime_utc);
  const localH = d.getUTCHours() + d.getUTCMinutes() / 60 + 5.5;
  ok("datetime_utc matches the recorded local time",
     Math.abs(((localH % 24) + 24) % 24 - (13 + 31 / 60)) < 1 / 60,
     "local from UTC = " + localH.toFixed(4));
}

console.log("\ngrahas");
const names = Object.keys(P.grahas);
ok("nine grahas plus Lagna", names.length === 10, names.length + ": " + names.join(","));
ok("keyed by English name", names.includes("Sun") && names.includes("Saturn") && names.includes("Rahu"));
let gMiss = [], gEnum = [], gRange = [], gNak = [];
for (const n of names) {
  const g = P.grahas[n];
  for (const k of GRAHA_REQ) if (g[k] === undefined || g[k] === null) gMiss.push(n + "." + k);
  if (!DIGNITY.includes(g.dignity)) gEnum.push(n + "=" + g.dignity);
  if (!(g.longitude_nirayana >= 0 && g.longitude_nirayana <= 360)) gRange.push(n + ".lon");
  if (!(g.rashi_index >= 0 && g.rashi_index <= 11)) gRange.push(n + ".rashi_index");
  if (!(g.degree_in_rashi >= 0 && g.degree_in_rashi <= 30)) gRange.push(n + ".deg");
  if (!(g.nakshatra_pada >= 1 && g.nakshatra_pada <= 4)) gRange.push(n + ".pada");
  if (!g.nakshatra_name || !g.nakshatra_lord) gNak.push(n);
}
ok("every required graha field present", gMiss.length === 0, gMiss.join(" "));
ok("dignity is in the enum", gEnum.length === 0, gEnum.join(" "));
ok("numeric ranges hold", gRange.length === 0, gRange.join(" "));
ok("nakshatra name and lord on every graha", gNak.length === 0, gNak.join(" "));
{ /* the nakshatra must be the one the longitude falls in, and its lord the Viṃśottarī one */
  const NL = ["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"];
  let bad = [];
  for (const n of names) {
    const g = P.grahas[n], i = Math.min(Math.floor(g.longitude_nirayana / (40 / 3)), 26);
    if (g.nakshatra_lord !== NL[i % 9]) bad.push(n);
    const pada = Math.floor((g.longitude_nirayana - i * (40 / 3)) / (10 / 3)) + 1;
    if (g.nakshatra_pada !== pada) bad.push(n + ".pada");
  }
  ok("nakshatra lord and pada agree with the longitude", bad.length === 0, bad.join(" "));
}
{ /* the renaming must not have moved a number */
  let bad = [];
  for (const g of J.grahas) {
    const n = { "Sūrya":"Sun","Candra":"Moon","Maṅgala":"Mars","Budha":"Mercury",
                "Guru":"Jupiter","Śukra":"Venus","Śani":"Saturn","Rāhu":"Rahu","Ketu":"Ketu" }[g.key];
    const p = P.grahas[n];
    if (!p) { bad.push(g.key + " absent"); continue; }
    if (p.longitude_nirayana !== g.sidereal_deg) bad.push(n + ".lon");
    if (p.rashi_index !== g.rashi.idx) bad.push(n + ".sign");
    if (p.is_retrograde !== !!g.retrograde) bad.push(n + ".retro");
    if (p.dignity_bphs !== g.dignity) bad.push(n + ".dignity_bphs");
  }
  ok("graha figures identical to the standard export", bad.length === 0, bad.join(" "));
  ok("own_sign is the renaming of own, not a new verdict",
     Object.values(P.grahas).every(p => (p.dignity === "own_sign") === (p.dignity_bphs === "own")));
  ok("nodes keep their engine answer alongside the schema value",
     P.grahas.Rahu.dignity_bphs === "node" && DIGNITY.includes(P.grahas.Rahu.dignity));
}

console.log("\nvargas");
ok("sixteen vargas", Object.keys(P.vargas).length === 16, Object.keys(P.vargas).length + "");
const vMiss = MANDATORY_VARGAS.filter(c => !P.vargas[c]);
ok("every mandatory varga present", vMiss.length === 0, vMiss.join(","));
{
  let bad = [];
  for (const [code, v] of Object.entries(P.vargas)) {
    if (!(v.ascendant_rashi >= 0 && v.ascendant_rashi <= 11)) bad.push(code + ".asc");
    const r = Object.values(v.graha_rashis || {});
    if (r.length !== 9) bad.push(code + " has " + r.length + " grahas");
    if (r.some(x => !(x >= 0 && x <= 11))) bad.push(code + ".rashi range");
    if (!Object.keys(v.graha_rashis || {}).includes("Jupiter")) bad.push(code + " not English-keyed");
  }
  ok("varga shapes and ranges hold", bad.length === 0, bad.join(" "));
  ok("D1 reproduces the rasi chart",
     P.vargas.D1.ascendant_rashi === J.lagna.rashi.idx &&
     P.vargas.D1.graha_rashis.Sun === P.grahas.Sun.rashi_index);
  ok("D30 never lands in Karka or Simha",
     ![3, 4].includes(P.vargas.D30.ascendant_rashi) &&
     !Object.values(P.vargas.D30.graha_rashis).some(s => [3, 4].includes(s)));
}

console.log("\nshadbala");
ok("planets is an object", P.shadbala.planets && !Array.isArray(P.shadbala.planets));
{
  const need = ["sthana_bala_virupas","dig_bala_virupas","kala_bala_virupas",
    "cheshta_bala_virupas","naisargika_bala_virupas","drik_bala_virupas",
    "total_virupas","total_rupas","required_rupas","strength_ratio"];
  let miss = [], mism = [], arith = [];
  const src = {}; (J.shadbala.planets || []).forEach(p => src[p.graha] = p);
  for (const [n, s] of Object.entries(P.shadbala.planets)) {
    for (const k of need) if (typeof s[k] !== "number") miss.push(n + "." + k);
    const o = src[n];
    if (!o) { mism.push(n); continue; }
    if (s.sthana_bala_virupas !== o.sthana) mism.push(n + ".sthana");
    if (s.total_virupas !== o.total_virupa) mism.push(n + ".total");
    if (s.strength_ratio !== o.ratio) mism.push(n + ".ratio");
    if (Math.abs(s.total_rupas - s.total_virupas / 60) > 1e-9) arith.push(n + " rupas");
    if (Math.abs(s.strength_ratio - s.total_rupas / s.required_rupas) > 1e-9) arith.push(n + " ratio");
  }
  ok("every renamed strength field present", miss.length === 0, miss.join(" "));
  ok("strength figures identical to the standard export", mism.length === 0, mism.join(" "));
  ok("virupas, rupas and ratio stay consistent", arith.length === 0, arith.join(" "));
  ok("seven grahas carry shadbala", Object.keys(P.shadbala.planets).length === 7);
  ok("the component parts are kept, not dropped",
     Object.values(P.shadbala.planets).every(s => s.components &&
       typeof s.components.uchcha_virupas === "number" &&
       typeof s.components.ayana_virupas === "number"));
}

console.log("\nashtakavarga");
ok("sarvashtakavarga is twelve integers",
   Array.isArray(P.ashtakavarga.sarvashtakavarga) &&
   P.ashtakavarga.sarvashtakavarga.length === 12 &&
   P.ashtakavarga.sarvashtakavarga.every(Number.isInteger));
ok("bav_by_planet is an object of seven",
   P.ashtakavarga.bav_by_planet && Object.keys(P.ashtakavarga.bav_by_planet).length === 7);
{
  const sav = P.ashtakavarga.sarvashtakavarga;
  const sum = sav.reduce((a, x) => a + x, 0);
  ok("SAV sums to 337", sum === 337, "sum = " + sum);
  const bav = Object.values(P.ashtakavarga.bav_by_planet);
  const colwise = new Array(12).fill(0);
  bav.forEach(b => b.bindus.forEach((x, i) => colwise[i] += x));
  ok("SAV is the column sum of the seven BAVs",
     colwise.every((x, i) => x === sav[i]), colwise.join(",") + " vs " + sav.join(","));
  ok("every BAV total is its own row sum",
     bav.every(b => b.total === b.bindus.reduce((a, x) => a + x, 0)));
}

console.log("\nreading order");
{
  /* The orientation blocks must come out in front of the matrices, and must be
     reachable by a reader that only gets the first part of the file. Measured on the
     serialised bytes, not on the object, because that is what a reader sees. */
  const raw = JSON.stringify(P, null, 2);
  const keys = Object.keys(P.derived);
  for (const k of ["guide", "conventions", "sensitivity"])
    ok(k + " is in the first six derived keys", keys.indexOf(k) < 6,
       "position " + keys.indexOf(k));
  const at = k => raw.indexOf('"' + k + '":', raw.indexOf('"derived"'));
  const deep = ["vimshottari_tree", "graha_drishti", "vimsopaka", "divisional_ashtakavarga"];
  const early = ["guide", "conventions", "sensitivity"];
  const lastEarly = Math.max(...early.map(at)), firstDeep = Math.min(...deep.map(at));
  ok("every orientation block precedes every matrix", lastEarly < firstDeep,
     lastEarly + " vs " + firstDeep);
  ok("orientation sits in the first fifth of the file",
     lastEarly / raw.length < 0.2, (100 * lastEarly / raw.length).toFixed(1) + "%");
  ok("no derived key was lost or duplicated in the reorder",
     keys.length === new Set(keys).size &&
     Object.keys(J.derived).every(k => keys.includes(k)));
}

console.log("\nyogas");
ok("yogas is a non-empty array", Array.isArray(P.yogas) && P.yogas.length > 0, P.yogas.length + "");
{
  let miss = [], badcat = [], nosrc = [];
  for (const y of P.yogas) {
    for (const k of ["name","present","category","source","detail"])
      if (y[k] === undefined || y[k] === null) miss.push((y.name || y.key) + "." + k);
    if (!YOGACAT.includes(y.category)) badcat.push(y.name + "=" + y.category);
    if (!y.source || /^not stated/.test(y.source)) nosrc.push(y.name);
  }
  ok("every required yoga field present", miss.length === 0, miss.slice(0, 6).join(" "));
  ok("category is in the enum", badcat.length === 0, badcat.slice(0, 6).join(" "));
  ok("every yoga cites a source", nosrc.length === 0, nosrc.slice(0, 6).join(" "));
  ok("present is a boolean throughout", P.yogas.every(y => typeof y.present === "boolean"));
  ok("the engine's own category wording is kept",
     P.yogas.every(y => typeof y.category_detail === "string" && y.category_detail.length > 0));
  const cats = [...new Set(P.yogas.map(y => y.category))];
  ok("the mapping uses more than the Other bucket", cats.length >= 4, cats.join(","));
  const later = P.yogas.filter(y => /later tradition/i.test(y.source + " " + y.category_detail));
  ok("later-tradition yogas stay labelled", later.length > 0, later.length + " labelled");
}

console.log("\narudhas");
ok("AL and UL are present", Number.isInteger(P.arudhas.AL) && Number.isInteger(P.arudhas.UL),
   JSON.stringify(P.arudhas));
ok("arudha signs are in range", Object.values(P.arudhas).every(x => x >= 0 && x <= 11));

console.log("\nderived");
{
  const miss = DERIVED_REQ.filter(k => P.derived[k] == null);
  ok("all twenty-four required derived layers present", miss.length === 0, miss.join(","));
  ok("panchanga_at_birth names tithi, vaara, nakshatra, yoga, karana",
     ["tithi","vaara","nakshatra","yoga","karana"].every(k => P.derived.panchanga_at_birth[k]),
     JSON.stringify(P.derived.panchanga_at_birth).slice(0, 160));
  ok("running_dasha is an object with a mahadasha",
     P.derived.running_dasha && !Array.isArray(P.derived.running_dasha) &&
     P.derived.running_dasha.mahadasha && P.derived.running_dasha.mahadasha.lord);
  ok("running_dasha carries UTC as well as JD",
     /^\d{4}-/.test(P.derived.running_dasha.mahadasha.start_utc || ""));
  ok("sensitivity flags are booleans",
     typeof P.derived.sensitivity.lagna_shift_1min === "boolean" &&
     typeof P.derived.sensitivity.lagna_shift_4min === "boolean");
  ok("sensitivity keeps the arcminute detail",
     P.derived.sensitivity.plus_minus_1_minute &&
     typeof P.derived.sensitivity.plus_minus_1_minute.lagna_moves_arcmin === "number");
  ok("conventions names the ayanamsa and node reckoning",
     /Lahiri/.test(P.derived.conventions.ayanamsa || "") &&
     ["true","mean"].includes(P.derived.conventions.node_reckoning));
  ok("sripati gives madhyas and sandhis",
     P.derived.sripati.bhava_madhya.length === 12 && P.derived.sripati.bhava_sandhi.length === 12);
}

console.log("\nfunctional status");
{
  const st = P.derived.status, grahas = Object.keys(st).filter(k => k !== "note");
  ok("all nine grahas classified", grahas.length === 9, grahas.length + "");
  const bad = grahas.filter(n => !STATUS_ENUM.includes(st[n].status));
  ok("status is in the enum", bad.length === 0, bad.map(n => n + "=" + st[n].status).join(" "));
  ok("every graha states its basis", grahas.every(n => typeof st[n].basis === "string"));
  ok("the underlying flags are kept, not collapsed",
     grahas.every(n => typeof st[n].yogakaraka === "boolean" &&
                       typeof st[n].maraka === "boolean" &&
                       Array.isArray(st[n].owns_houses)));
  ok("the panchadha relation the export held is not lost",
     grahas.some(n => typeof st[n].relation_to_lagna_lord === "string"));
  /* Mina lagna: the lagna is both an angle and a trine, so its lord is yogakaraka;
     Jupiter owns 1 and 10, Mercury 4 and 7, Mars 2 and 9, the Moon 5. */
  ok("the lagna lord comes out yogakaraka", st.Jupiter.status === "yogakaraka",
     "Jupiter = " + st.Jupiter.status);
  ok("ownership agrees with the lagna", st.Jupiter.owns_houses.join(",") === "1,10" &&
     st.Mercury.owns_houses.join(",") === "4,7" && st.Moon.owns_houses.join(",") === "5",
     JSON.stringify({ J: st.Jupiter.owns_houses, Me: st.Mercury.owns_houses, Mo: st.Moon.owns_houses }));
  ok("the 2nd and 7th lords are flagged maraka",
     grahas.filter(n => st[n].maraka).every(n => st[n].owns_houses.some(h => h === 2 || h === 7)) &&
     grahas.some(n => st[n].maraka));
  ok("the nodes own nothing and stay neutral",
     st.Rahu.owns_houses.length === 0 && st.Rahu.status === "neutral");
  ok("the note says which labels are Parashara's and which are not",
     /later tradition/.test(st.note) && /yogak/.test(st.note));
}

console.log("\nvimsopaka, four schemes");
{
  const V = P.derived.vimsopaka;
  for (const k of VIM_SCHEMES) ok("scheme present: " + k, V[k] != null);
  let bad = [], sums = [];
  for (const k of VIM_SCHEMES) {
    const sch = V[k];
    const w = Object.values(sch.weights).reduce((a, x) => a + x, 0);
    if (Math.abs(w - 20) > 1e-9) sums.push(k + " weights sum to " + w);
    if (!/BPHS/.test(sch.source || "")) bad.push(k + " has no source");
    const g = Object.keys(sch.grahas);
    if (g.length !== 7) bad.push(k + " covers " + g.length + " grahas");
    for (const n of g) {
      const r = sch.grahas[n];
      if (!(r.score_of_20 >= 0 && r.score_of_20 <= 20)) bad.push(k + "." + n + " out of range");
      const tot = r.divisions.reduce((a, d) => a + d.points, 0);
      if (Math.abs(tot - r.score_of_20) > 5e-4) bad.push(k + "." + n + " parts != total");
      for (const d of r.divisions) {
        const want = d.swaviswa * d.varga_viswa / 20;
        if (Math.abs(d.points - want) > 5e-4) bad.push(k + "." + n + "." + d.varga);
      }
    }
  }
  ok("every scheme's weights sum to 20", sums.length === 0, sums.join(" "));
  ok("every scheme cites BPHS and covers the seven", bad.length === 0, bad.slice(0, 6).join(" "));
  ok("each score is the sum of swavisva x vargavisva / 20", bad.length === 0);
  /* the six Shadvarga weights are stated outright in vv. 17-19 */
  ok("Shadvarga weights are the verse's 6,2,4,5,2,1",
     JSON.stringify(V.shadvarga.weights) ===
     JSON.stringify({ D1: 6, D2: 2, D3: 4, D9: 5, D12: 2, D30: 1 }));
  /* v. 20: Rasi 3, Shashtiamsa 5, the other eight one and a half */
  ok("Dasavarga is 3 + 5 + eight at 1.5",
     V.dasavarga.weights.D1 === 3 && V.dasavarga.weights.D60 === 5 &&
     Object.values(V.dasavarga.weights).filter(x => x === 1.5).length === 8);
  ok("Shodashavarga is the sixteen-division set",
     Object.keys(V.shodashavarga.weights).length === 16 &&
     V.shodashavarga.weights.D1 === 3.5 && V.shodashavarga.weights.D60 === 4);
  ok("Saptavarga is flagged uncertain and carries both readings",
     V.saptavarga.reading_certain === false && V.saptavarga.alternative_weights &&
     /verify/i.test(V.saptavarga.caution || ""));
  ok("the alternative Saptavarga reading also sums to 20",
     Math.abs(Object.values(V.saptavarga.alternative_weights).reduce((a, x) => a + x, 0) - 20) < 1e-9);
  ok("every graha carries the alternative Saptavarga score",
     Object.values(V.saptavarga.grahas).every(r => r.alternative_reading &&
       typeof r.alternative_reading.score_of_20 === "number"));
  ok("a graha in its own varga throughout would score 20",
     Object.values(V.shodashavarga.grahas).every(r => r.max_possible === 20));
  ok("the flat Shodashavarga score the export already had is still there",
     Array.isArray(P.derived.vimsopaka_shodashavarga_flat));
  /* the one scheme the export already computed must agree with the new one */
  const flat = {}; P.derived.vimsopaka_shodashavarga_flat.forEach(r => flat[r.graha] = r.score_of_20);
  const drift = Object.keys(flat).filter(n =>
    Math.abs(flat[n] - V.shodashavarga.grahas[n].score_of_20) > 1e-6);
  ok("the new Shodashavarga score equals the export's own", drift.length === 0,
     drift.map(n => n + ": " + flat[n] + " vs " + V.shodashavarga.grahas[n].score_of_20).join(" "));
}

console.log("\ngraha drishti matrix");
{
  const G = P.derived.graha_drishti;
  ok("the matrix is quantitative", G.cast && typeof G.cast === "object" && !Array.isArray(G.cast));
  ok("the unit is named", /virupa/i.test(G.unit || ""));
  ok("the source is cited", /Ch\. 26/.test(G.source || ""));
  ok("the whole-sign view is kept alongside", Array.isArray(G.whole_sign_view));
  let bad = [];
  for (const [a, row] of Object.entries(G.cast))
    for (const [b, v] of Object.entries(row)) {
      if (a === b) bad.push("self " + a);
      if (!(v > 0 && v <= 60)) bad.push(a + "->" + b + "=" + v);
    }
  ok("every value is a virupa in (0,60]", bad.length === 0, bad.slice(0, 5).join(" "));
  ok("nine aspecting bodies", Object.keys(G.cast).length === 9, Object.keys(G.cast).length + "");
  ok("the lagna is aspected but does not aspect",
     !G.cast.Lagna && Object.values(G.cast).some(r => r.Lagna != null));
  /* received must be the transpose of cast, and its parts must add up */
  let tx = [];
  for (const [b, r] of Object.entries(G.received)) {
    for (const [a, v] of Object.entries(r.from)) if (G.cast[a][b] !== v) tx.push(a + "->" + b);
    const sum = Object.values(r.from).reduce((x, y) => x + y, 0);
    if (Math.abs(sum - r.total) > 5e-4) tx.push(b + " total");
    if (Math.abs(r.benefic + r.malefic - r.total) > 5e-4) tx.push(b + " split");
    if (Math.abs(r.benefic - r.malefic - r.net) > 5e-4) tx.push(b + " net");
  }
  ok("received is the transpose of cast and its parts add up", tx.length === 0, tx.slice(0, 5).join(" "));
  /* the matrix must be the same formula that feeds Drik Bala: each aspect quartered
     and signed. Rebuilt here from the matrix and checked against Shadbala. */
  const BEN = ["Jupiter", "Venus", "Mercury", "Moon"];
  let drift = [];
  for (const [n, sb] of Object.entries(P.shadbala.planets)) {
    const r = P.derived.graha_drishti.received[n];
    let drik = 0;
    if (r) for (const [a, v] of Object.entries(r.from)) drik += (BEN.includes(a) ? v : -v) / 4;
    if (Math.abs(drik - sb.drik_bala_virupas) > 5e-3)
      drift.push(n + ": " + drik.toFixed(3) + " vs " + sb.drik_bala_virupas.toFixed(3));
  }
  ok("the matrix reproduces Drik Bala exactly", drift.length === 0, drift.join("  "));
  /* the sage's special allowances must actually be in the numbers */
  ok("the special allowances are named", /Maṅgala|Guru|Śani/.test(G.special_allowances || ""));
}

console.log("\ndasha tree");
{
  const t = P.derived.vimshottari_tree;
  ok("tree is an array of mahadashas", Array.isArray(t) && t.length >= 9, (t || []).length + "");
  let noIso = [], gaps = [], badOrder = [];
  const walk = ns => { for (const n of ns) {
    if (!/^\d{4}-\d{2}-\d{2}T/.test(n.start_utc || "")) noIso.push(n.lord + " start");
    if (!/^\d{4}-\d{2}-\d{2}T/.test(n.end_utc || "")) noIso.push(n.lord + " end");
    if (!(n.end_jd > n.start_jd)) badOrder.push(n.lord);
    const kids = n.antardashas || n.pratyantardashas || n.sookshmas;
    if (kids && kids.length) {
      if (Math.abs(kids[0].start_jd - n.start_jd) > 1e-4) gaps.push(n.lord + " head");
      if (Math.abs(kids[kids.length - 1].end_jd - n.end_jd) > 1e-4) gaps.push(n.lord + " tail");
      walk(kids);
    }
  } };
  walk(t);
  ok("every node carries a UTC start and end", noIso.length === 0, noIso.slice(0, 5).join(" "));
  ok("every span runs forwards", badOrder.length === 0, badOrder.slice(0, 5).join(" "));
  ok("children tile their parent exactly", gaps.length === 0, gaps.slice(0, 5).join(" "));
  ok("the tree reaches pratyantardasha",
     t.some(m => (m.antardashas || []).some(a => (a.pratyantardashas || []).length > 0)));
  const iso = new Date(t[0].start_utc), jd = t[0].start_jd;
  ok("UTC and JD describe the same instant",
     Math.abs(iso.getTime() - (jd - 2440587.5) * 86400000) < 1000,
     t[0].start_utc + " vs jd " + jd);
}

console.log("\nnothing was lost on the way across");
{
  const srcKeys = Object.keys(J.derived), payKeys = Object.keys(P.derived);
  const dropped = srcKeys.filter(k => !payKeys.includes(k));
  ok("every derived layer of the standard export survives", dropped.length === 0, dropped.join(","));
  ok("as_of stays quarantined and still carries its warning",
     P.derived.as_of && /NOT the birth chart/.test(P.derived.as_of.WARNING || ""));
  ok("the engine stamp is carried into meta",
     P.meta.engine === J.substrate_stamp && /LearnHoro built-in engine/.test(P.meta.engine || ""),
     P.meta.engine);
  ok("the original input block is kept verbatim",
     JSON.stringify(P.input) === JSON.stringify(J.input));
  ok("the payload says what it is", /LearnHoroJyotishaChartPayload/.test(P.meta.schema));
}

console.log("\npage health");
ok("no page errors", errs.length === 0, errs.slice(0, 3).join(" | "));

await browser.close();
console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
