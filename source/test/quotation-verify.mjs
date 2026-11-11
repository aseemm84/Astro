/* Is quotation from the Santhanam translation still brief?
 *
 * LICENSE.md and the Credits page both promise that quotation from
 * R. Santhanam's translation of BPHS is "kept brief and always attributed".
 * The second half has a harness (citation-verify.mjs). This is the first half.
 *
 * HOW. make-translation-fingerprint.py writes a Bloom filter over every run of
 * eight consecutive words in the translation — a fingerprint that can recognise
 * a verbatim passage and cannot be read back into one, because this repository
 * is public and committing the text to check it would be the thing the check
 * exists to prevent. This harness walks every page and script the build ships,
 * normalises them the same way, and finds UNBROKEN runs of fingerprint hits.
 * A run of r consecutive 8-word hits is a verbatim stretch of r+7 words.
 *
 *   REPORT  ≥ 12 words — printed, so a person can look.
 *   FAIL    ≥ FAIL_WORDS words — not brief by any reading.
 *
 * WHAT IT CANNOT DO. It sees only verbatim text; a close paraphrase passes,
 * and should — paraphrase is what the site is supposed to do. It cannot tell
 * the translator's English from the Sanskrit transliteration in the same PDF,
 * so a long run of transliterated verse would be reported; the printed span
 * shows which it is. And a hit is a 1-in-70 chance per 8-word window, so a
 * SHORT run can be coincidence — which is why nothing under 12 words is
 * reported at all.
 *
 * Falsified before trusted:
 *   node source/test/quotation-verify.mjs --plant VOL1.txt
 * splices a 40-word passage of the translation into one page's text in memory;
 * the run must fail.
 *
 * Run from the repository root:  node source/test/quotation-verify.mjs
 */
import { readFileSync, readdirSync } from "node:fs";

const CWD = process.cwd();
const META = JSON.parse(readFileSync(CWD + "/source/data/santhanam-fingerprint.json", "utf8"));
const BITS = readFileSync(CWD + "/source/data/santhanam-fingerprint.bloom");
const N = META.shingle_words, M = META.m_bits, K = META.k;
const REPORT_WORDS = 12, FAIL_WORDS = 25;

let pass = 0, fail = 0;
const head = (t) => console.log("\n" + t);
const is = (c, t) => { if (c) { pass++; console.log("  ok   " + t); }
                       else { fail++; console.log("  FAIL " + t); } };

/* --- the same normalisation and hash as the generator, line for line --- */
const words = (s) => (s.normalize("NFKD").replace(/\p{Mn}/gu, "").toLowerCase()
                        .match(/[a-z0-9]+/g) || []);
function fnv1a(s, seed) {
  let h = seed >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
function fmix32(h) {
  h ^= h >>> 16; h = Math.imul(h, 0x85EBCA6B) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0xC2B2AE35) >>> 0;
  h ^= h >>> 16; return h >>> 0;
}
function indices(sh) {
  const h1 = fmix32(fnv1a(sh, 0x811C9DC5)), h2 = (fmix32(fnv1a(sh, 0x050C5D1F)) | 1) >>> 0, out = [];
  for (let i = 0; i < K; i++) out.push(((h1 + Math.imul(i, h2)) >>> 0) % M);
  return out;
}
const has = (sh) => indices(sh).every((ix) => (BITS[ix >> 3] >> (ix & 7)) & 1);

/* --- what a reader receives: tags dropped, entities decoded --- */
const NAMED = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  mdash: " ", ndash: " ", rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"',
  hellip: " ", middot: " ", rarr: " ", larr: " ", prime: " ", Prime: " ",
  deg: " ", times: " ", copy: " ", szlig: "ss", aelig: "ae" };
function decode(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&([a-zA-Z])(acute|grave|circ|tilde|uml|macr|dot|cedil|ring|caron);/g, "$1")
    .replace(/&([a-zA-Z]+);/g, (m, n) => (n in NAMED ? NAMED[n] : " "));
}
const readerText = (raw) => decode(raw.replace(/<[^>]+>/g, " "));

/* maximal unbroken runs of fingerprint hits */
function runs(w) {
  const out = []; let start = -1;
  for (let i = 0; i <= w.length - N; i++) {
    const hit = has(w.slice(i, i + N).join(" "));
    if (hit && start < 0) start = i;
    if ((!hit || i === w.length - N) && start >= 0) {
      const end = hit ? i : i - 1;              /* last hitting window */
      out.push({ start, words: end - start + N });
      start = -1;
    }
  }
  return out;
}

console.log("Quotation from the Santhanam translation, checked for brevity");
console.log(`  fingerprint: ${META.distinct_shingles} distinct ${N}-word sequences from ` +
  `${META.source_words} words; per-sequence false positive ${META.per_shingle_false_positive}`);

head("the harness and the generator agree");
{
  const sc = META.self_check;
  is(JSON.stringify(indices(sc.string)) === JSON.stringify(sc.indices),
     "same normalisation and hash: self-check indices match the generator's");
  is(words("Bṛhat Parāśara’s ŚĀSTRA").join(" ") === "brhat parasara s sastra",
     "diacritics folded the same way the generator folds them");
  /* The filter's real false-positive rate, MEASURED, held to the rate it
     claims. The first version of this guard derived its second hash from its
     first, collapsed to a 21-bit hash set, and ran at ~14% against a claimed
     1.4% — so ordinary site prose "matched" the book. Random shingles drawn
     from the very vocabulary that fooled it must now hit at about the claimed
     rate; a degenerate filter fails here instead of producing false alarms. */
  const vocab = ("the of a sun moon lord house planet sign star is in and to by with " +
                 "full chart pick layer bhava will be from its").split(" ");
  let s = 12345, hits = 0; const n = 40000;
  const rnd = () => (s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296;
  for (let j = 0; j < n; j++) {
    const sh = []; for (let k = 0; k < N; k++) sh.push(vocab[(rnd() * vocab.length) | 0]);
    if (has(sh.join(" "))) hits++;
  }
  const fp = hits / n, claimed = META.per_shingle_false_positive;
  is(fp < claimed * 2 + 0.002,
     `measured false-positive rate ${(fp * 100).toFixed(2)}% is consistent with the claimed ${(claimed * 100).toFixed(2)}%`);
}

/* --- the corpus: every page and script the build ships --- */
const files = readdirSync(CWD).filter((f) => /\.(html|js)$/.test(f) && f !== "sw.js").sort();
const PLANT_AT = process.argv.indexOf("--plant");
let planted = null;
if (PLANT_AT > 0) {
  const src = readFileSync(process.argv[PLANT_AT + 1], "utf8");
  const w = words(src), mid = Math.floor(w.length / 2);
  planted = w.slice(mid, mid + 40).join(" ");
  console.log("\n  PLANTED: a 40-word passage of the translation spliced into index.html");
}

head(`${files.length} shipped files scanned`);
const reported = [];
let longest = { words: 0 };
for (const f of files) {
  let t = readerText(readFileSync(CWD + "/" + f, "utf8"));
  if (planted && f === "index.html") t += " " + planted + " ";
  const w = words(t);
  for (const r of runs(w)) {
    if (r.words > longest.words) longest = { file: f, words: r.words };
    if (r.words >= REPORT_WORDS)
      reported.push({ file: f, words: r.words, text: w.slice(r.start, r.start + r.words).join(" ") });
  }
}
reported.sort((a, b) => b.words - a.words);
if (reported.length) {
  console.log(`\n  verbatim runs of ${REPORT_WORDS}+ words (shown so a person can judge):`);
  for (const r of reported.slice(0, 25))
    console.log(`    ${String(r.words).padStart(3)} w  ${r.file}: “${r.text.slice(0, 160)}${r.text.length > 160 ? "…" : ""}”`);
} else console.log(`\n  no verbatim run of ${REPORT_WORDS} or more words anywhere`);

is(reported.every((r) => r.words < FAIL_WORDS),
   `no verbatim passage of ${FAIL_WORDS}+ words (longest: ${longest.words} words` +
   (longest.file ? ` in ${longest.file}` : "") + ")");

console.log(`\n${pass} passed, ${fail} failed${planted ? "  (PLANTED FAULT RUN — a failure is expected)" : ""}`);
process.exit(fail ? 1 : 0);
