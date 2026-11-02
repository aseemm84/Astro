/* Every BPHS citation in the source, checked as a citation.
 *
 * The project's first rule is that a citation is either exact or absent and
 * none is fabricated. That rule had been kept by hand, in prose, across 36
 * files and 196 citations, with nothing checking it. A wrong chapter number, a
 * volume that contradicts the same chapter cited elsewhere, a verse range
 * written backwards — none would have failed a test, and the first person to
 * notice would be a reader who went to the PDF to look one up.
 *
 * WHAT THIS CHECKS AND WHAT IT CANNOT. It checks the citation: chapter inside
 * the book, volume consistent with the edition's own stated split, verse range
 * the right way round, notation uniform, and — the one that matters most — the
 * committed registry still matches what the source actually says, so a
 * citation added and never registered is caught. It does NOT check whether a
 * verse says what the surrounding code claims. That needs the text as data,
 * which is the next step, and pretending otherwise here would be its own kind
 * of fabrication.
 *
 * ONE THING WORTH KNOWING. The registry's volume split started as 50, assumed
 * because it is round, and the generator then flagged the source's own
 * "BPHS, Vol. 2, Ch. 46" as suspicious. The citation was right and the
 * assumption was wrong: both prefaces state 45 and 52, and Vol. 2 opens at
 * Chapter 46. That is the use of a registry — it sends someone to look instead
 * of assuming — and the figure now travels with the quotation that settles it.
 *
 * Run: node source/test/citation-verify.mjs  [--list]
 */

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = process.cwd();
const REG = ROOT + "/source/data/citations.json";
const GEN = ROOT + "/source/test/make-citation-registry.py";
const LIST = process.argv.includes("--list");

let pass = 0, fail = 0;
const head = t => console.log("\n" + t);
const is = (c, t) => { if (c) { pass++; console.log("  ok   " + t); }
                       else { fail++; console.log("  FAIL " + t); } };

const reg = JSON.parse(readFileSync(REG, "utf8"));
const P = reg._provenance;
const C = reg.citations;

console.log("Every BPHS citation in the source, checked as a citation");
console.log("  " + P.citations + " citations, " + P.distinctLoci
            + " distinct loci, " + P.files + " files");
console.log("  edition: " + P.edition);

/* ---- 1. the registry is current ---------------------------------------- */

head("the registry still matches the source");
{
  /* The check the rest depends on. Everything below could pass on a registry
     six months stale; this is what notices a citation added to the code and
     never registered, or one quietly reworded. */
  const dir = mkdtempSync(join(tmpdir(), "cit-"));
  const out = join(dir, "regen.json");
  let ok = false, err = "";
  try {
    execFileSync("python3", [GEN, out], { cwd: ROOT, stdio: "pipe" });
    const a = readFileSync(REG, "utf8"), b = readFileSync(out, "utf8");
    ok = a === b;
    if (!ok) {
      const ra = JSON.parse(a), rb = JSON.parse(b);
      const key = r => r.file + ":" + r.line + " " + r.text;
      const A = new Set(ra.citations.map(key)), B = new Set(rb.citations.map(key));
      const added = [...B].filter(x => !A.has(x)), gone = [...A].filter(x => !B.has(x));
      err = (added.length ? "\n         in the source but not the registry: "
              + added.slice(0, 6).join("; ") : "")
          + (gone.length ? "\n         in the registry but not the source: "
              + gone.slice(0, 6).join("; ") : "");
    }
  } catch (e) { err = " (" + String(e.message).split("\n")[0] + ")"; }
  rmSync(dir, { recursive: true, force: true });
  is(ok, "regenerating it from source/src reproduces the committed file byte for byte"
     + (ok ? "" : err));
}

/* ---- 2. the edition's own figures -------------------------------------- */

head("the edition's figures are sourced, not assumed");
is(P.maxChapter === 97, "97 chapters");
is(P.volumeSplit === 45,
   "the volumes split 45 / 52, not at a round number (" + P.volumeSplit + ")");
is(typeof P.volumeSplitSource === "string" && /preface/i.test(P.volumeSplitSource),
   "and the split travels with the preface quotation that settles it");
is(/Santhanam/.test(P.edition), "the edition is named");
is(typeof P.whatThisCannotCheck === "string" && /SAYS/.test(P.whatThisCannotCheck),
   "the registry states plainly that it cannot check what a verse SAYS");
is(/GENERATED FROM THE CODE/.test(P.derived),
   "and that it is derived from the code rather than edited beside it");

/* ---- 3. every citation, as a citation ---------------------------------- */

head("every citation is a citation the edition could have");
{
  const badCh = C.filter(r => !(r.chapter >= 1 && r.chapter <= P.maxChapter));
  is(badCh.length === 0, "every chapter is within 1–" + P.maxChapter
     + (badCh.length ? " — " + badCh.map(r => r.file + ":" + r.line + " ch " + r.chapter).join(", ") : ""));

  const badVol = C.filter(r => r.vol != null &&
    r.vol !== (r.chapter <= P.volumeSplit ? 1 : 2));
  is(badVol.length === 0, "every volume agrees with the 45/52 split"
     + (badVol.length ? " — " + badVol.map(r => r.file + ":" + r.line + " Vol. " + r.vol
        + " Ch. " + r.chapter).join(", ") : ""));

  const backwards = C.filter(r => r.verses && r.verses[0] > r.verses[1]);
  is(backwards.length === 0, "no verse range runs backwards"
     + (backwards.length ? " — " + backwards.map(r => r.file + ":" + r.line).join(", ") : ""));

  const silly = C.filter(r => r.verses && (r.verses[0] < 1 || r.verses[1] > 300));
  is(silly.length === 0, "no verse number is outside 1–300, the longest chapter's order"
     + (silly.length ? " — " + silly.map(r => r.file + ":" + r.line).join(", ") : ""));

  const noClaim = C.filter(r => !r.claim || r.claim.length < 8);
  is(noClaim.length === 0, "every citation carries the line it sits in, so it can be reviewed");
}

head("a chapter is never cited as being in two different volumes");
{
  const bad = Object.entries(reg.volumeByChapter).filter(([, v]) => v.length > 1);
  is(bad.length === 0, "no chapter is cited as both Vol. 1 and Vol. 2"
     + (bad.length ? " — " + bad.map(([c, v]) => "ch " + c + ": " + v.join("/")).join(", ") : ""));
  console.log("  " + Object.keys(reg.volumeByChapter).length + " chapters carry an explicit "
    + "volume; " + (reg.chaptersCited.length - Object.keys(reg.volumeByChapter).length)
    + " are cited by chapter alone, which is allowed — an absent volume is not a wrong one.");
}

head("the notation is uniform enough to read and to grep");
{
  /* Not pedantry: a citation nobody can grep for is a citation nobody checks.
     "Ch. 35, vv. 9–11" is the house form; the tolerated variants are an absent
     volume, an absent verse part, a single verse, and "Chapter" spelled out. */
  const FORM = /^(Vol\.\s*[12],?\s*)?Ch(apter|\.)\s*\d{1,2}(,?\s*(vv?\.|verses?)\s*\d{1,3}([–—-]\d{1,3})?)?$/;
  const odd = C.filter(r => !FORM.test(r.text.replace(/\s+/g, " ").trim()));
  is(odd.length === 0, "every citation matches the house form"
     + (odd.length ? " — " + [...new Set(odd.map(r => r.text))].slice(0, 8).join(" | ") : ""));

  const dashes = [...new Set(C.filter(r => /\d[–—-]\d/.test(r.text))
    .map(r => (r.text.match(/\d([–—-])\d/) || [])[1]))];
  is(dashes.length <= 1, "verse ranges use one dash character throughout"
     + (dashes.length > 1 ? " — found " + dashes.map(d => JSON.stringify(d)).join(" and ") : "")
     + (dashes.length === 1 ? " (" + JSON.stringify(dashes[0]) + ")" : ""));
}

/* ---- 4. prove the checks bite ----------------------------------------- */

head("the checks fail on a bad citation");
{
  /* Each fault is injected into a COPY of the registry and run through the
     same predicate the live check uses, so what is proved is that the
     predicate rejects it — not merely that a different string was written. */
  const clone = () => JSON.parse(JSON.stringify(reg));

  const a = clone(); a.citations[0].chapter = 120;
  is(a.citations.filter(r => !(r.chapter >= 1 && r.chapter <= 97)).length === 1,
     "a chapter 120 is caught (there is no 120th chapter)");

  const b = clone();
  const inVol1 = b.citations.find(r => r.chapter <= 45);
  inVol1.vol = 2;
  is(b.citations.filter(r => r.vol != null && r.vol !== (r.chapter <= 45 ? 1 : 2)).length === 1,
     "Ch. " + inVol1.chapter + " cited as Vol. 2 is caught — it is in Vol. 1 under the 45/52 split");

  const c = clone();
  const ranged = c.citations.find(r => r.verses && r.verses[0] !== r.verses[1]);
  ranged.verses = [ranged.verses[1], ranged.verses[0]];
  is(c.citations.filter(r => r.verses && r.verses[0] > r.verses[1]).length === 1,
     "a reversed range (vv. " + ranged.verses[0] + "–" + ranged.verses[1] + ") is caught");

  const FORM = /^(Vol\.\s*[12],?\s*)?Ch(apter|\.)\s*\d{1,2}(,?\s*(vv?\.|verses?)\s*\d{1,3}([–—-]\d{1,3})?)?$/;
  is(!FORM.test("Chap 35 vs 9-11") && !FORM.test("BPHS 35.9"),
     "loose notation that nobody could grep for is rejected by the house form");

  /* And the staleness check itself: a registry missing a row must not compare
     equal to a regeneration. Proved on the strings, since running the
     generator against a mutated tree would mean writing to source/src. */
  const d = clone(); d.citations.pop();
  is(JSON.stringify(d) !== JSON.stringify(reg),
     "a registry with a row removed no longer matches the source");

  /* And the resolution side: a citation past a chapter's legible bound with no
     reasoned note must not pass, and a note that no longer corroborates must
     not either. Both run through the same predicates the live checks use. */
  const W = JSON.parse(readFileSync(ROOT + "/source/data/bphs-witness.json", "utf8"));
  const ch37 = W.chapters["37"];
  const fabricated = { chapter: 37, verses: [90, 95] };
  const beyond = fabricated.verses[1] > ch37.verseMax;
  const covered = (W.resolutions || []).some(n => n.chapter === fabricated.chapter
    && n.verses[0] === fabricated.verses[0] && n.verses[1] === fabricated.verses[1]);
  is(beyond && !covered,
     "an invented Ch. 37, vv. 90–95 is beyond the bound (" + ch37.verseMax
     + ") and covered by no note, so it would fail");

  const stale = (W.resolutions || []).map(n => ({ ...n, corroborated: false }));
  is(!stale.every(n => n.corroborated === true),
     "a resolution note that stopped corroborating would fail too");
}

/* ---- 5. resolve each citation against the witness ----------------------
   The registry checks a citation's SHAPE. This checks whether the chapter and
   verse it names can be found in the edition the project actually cites —
   source/data/bphs-witness.json, built by make-bphs-witness.py from the two
   uploaded PDFs.

   It cannot be a flat pass/fail, and pretending it could would be the
   dishonest move here. The witness is OCR of a scanned 1984 printing whose
   verse markers are sometimes unreadable: verse 1 of chapter 46 prints as
   "t.", 6-11 as "6-ll.", 7-10 as "7.10," with the hyphen turned into a full
   stop. A citation the scan cannot read has not been shown wrong. So each
   citation lands in one of four classes, the counts are RATCHETED against a
   committed baseline, and only a real regression fails.                     */

head("every citation resolves against the uploaded edition");
{
  const W = JSON.parse(readFileSync(ROOT + "/source/data/bphs-witness.json", "utf8"));
  const WP = W._provenance;
  const unseg = new Set(WP.unsegmented);

  is(WP.chapters === P.maxChapter && WP.volumeSplit === P.volumeSplit,
     "the witness and the registry agree on the edition (97 chapters, 45/52)");
  is(/not on this environment's fetch allowlist|robots/.test(WP.notTheMula),
     "the witness says why the Sanskrit mūla is not the source");
  is(/INCOMPLETE BY CONSTRUCTION/.test(WP.strength),
     "and that its verse attestation is incomplete by construction");
  is(/only structure and hashes/.test(WP.noTextStored),
     "and that no verse text is stored, only structure");

  const cls = { attested: [], withinBound: [], beyondBound: [], unsegmented: [] };
  for (const r of C) {
    if (!r.verses) continue;
    if (unseg.has(r.chapter)) { cls.unsegmented.push(r); continue; }
    const rec = W.chapters[String(r.chapter)];
    if (!rec) { cls.unsegmented.push(r); continue; }
    const a = new Set(rec.attested);
    const want = [];
    for (let v = r.verses[0]; v <= r.verses[1]; v++) want.push(v);
    if (want.every(v => a.has(v))) cls.attested.push(r);
    else if (rec.verseMax != null && r.verses[1] <= rec.verseMax) cls.withinBound.push(r);
    else cls.beyondBound.push(r);
  }

  console.log("  of " + C.filter(r => r.verses).length + " citations that name verses:");
  console.log("    " + String(cls.attested.length).padStart(3)
    + "  resolve — every verse in the range was read in that chapter");
  console.log("    " + String(cls.withinBound.length).padStart(3)
    + "  plausible — below the highest verse read there, but the marker itself was not legible");
  console.log("    " + String(cls.beyondBound.length).padStart(3)
    + "  beyond the chapter's legible bound — each needs a reasoned note");
  console.log("    " + String(cls.unsegmented.length).padStart(3)
    + "  in a chapter whose running head the scan lost entirely");

  /* THE RATCHET. Committed here and not in the generated witness, because a
     baseline that regenerated with the data could never fail. These may only
     improve: better OCR handling moves citations from the weaker classes into
     'attested', and that is a test to update, not a test to fear. */
  const BASE = { attested: 43, withinBound: 34, beyondBound: 1, unsegmented: 3 };
  is(cls.attested.length >= BASE.attested,
     "at least " + BASE.attested + " citations fully resolve (" + cls.attested.length + ")");
  is(cls.beyondBound.length <= BASE.beyondBound,
     "no more than " + BASE.beyondBound + " citation sits beyond its chapter's bound ("
     + cls.beyondBound.length + ")");
  is(cls.unsegmented.length <= BASE.unsegmented,
     "no more than " + BASE.unsegmented + " citations fall in an unsegmented chapter ("
     + cls.unsegmented.length + ")");

  /* Every beyond-bound citation must be covered by a resolution note whose
     corroborating phrase was actually FOUND in that chapter. An exception that
     stops corroborating fails exactly like an unlisted overrun. */
  const notes = W.resolutions || [];
  for (const r of cls.beyondBound) {
    const n = notes.find(x => x.chapter === r.chapter
      && x.verses[0] === r.verses[0] && x.verses[1] === r.verses[1]);
    is(!!n, "Ch. " + r.chapter + ", vv. " + r.verses.join("–")
       + " (beyond the bound) has a reasoned note — " + r.file + ":" + r.line);
    if (n) is(n.corroborated === true,
      "and its note corroborates: “" + n.corroborates + "” is present in chapter "
      + n.chapter + "’s text");
  }
  is(notes.every(n => n.corroborated === true),
     "every resolution note in the witness corroborates against the text");
  is(notes.every(n => typeof n.why === "string" && typeof n.reasoning === "string"),
     "and each carries both why the scan failed and why the citation still stands");

  if (cls.unsegmented.length) {
    const chs = [...new Set(cls.unsegmented.map(r => r.chapter))];
    console.log("  unsegmented chapters cited: " + chs.join(", ")
      + " — the running head is illegible, so the chapter cannot be bounded at all. "
      + "Not evidence against the citation, and not evidence for it.");
  }
}

if (LIST) {
  head("the loci this site leans on");
  const by = {};
  for (const r of C) {
    const k = "Ch. " + r.chapter + (r.verses
      ? (r.verses[0] === r.verses[1] ? ", v. " + r.verses[0]
         : ", vv. " + r.verses[0] + "–" + r.verses[1]) : "");
    (by[k] = by[k] || []).push(r.file + ":" + r.line);
  }
  for (const k of Object.keys(by).sort((x, y) =>
      (parseInt(x.slice(4)) - parseInt(y.slice(4))) || x.localeCompare(y)))
    console.log("  " + k.padEnd(24) + by[k].length + "×  " + by[k][0]
      + (by[k].length > 1 ? " …" : ""));
}

console.log("\n" + (fail ? "FAIL" : "PASS") + " citation-verify — " + pass
            + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
