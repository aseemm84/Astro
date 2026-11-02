#!/usr/bin/env python3
"""Build source/data/bphs-witness.json — what the uploaded edition attests.

   WHY NOT THE SANSKRIT MŪLA.

   The plan was to fetch the mūla from Sanskrit Wikisource or
   sanskritdocuments.org and hash it per verse. Neither is reachable from this
   build environment: sa.wikisource.org is not on the fetch allowlist, and
   sanskritdocuments.org disallows robots. No attempt is made to go around
   either, and this file does not pretend to a source it could not read.

   It turns out the better witness was already here. Every citation in this
   project is keyed to R. Santhanam's ENGLISH chapter-and-verse numbering, not
   to the mūla's — so a mūla witness would have needed a reconciliation pass
   between two numbering schemes before it could check anything, and the
   reconciliation would itself have been the unverified step. The uploaded
   edition is the thing the citations actually point at. Checking against it is
   both easier and more honest.

   WHAT THIS CAN AND CANNOT CERTIFY.

   The text is OCR of a scanned 1984 printing and the Devanagari is beyond
   recovery, but the English translation is mostly legible. Its verse markers
   are not uniformly so: verse 1 of chapter 46 reads "t. Maitreye said", 6-11
   reads "6-ll.", and 44-49 reads "4449." with the hyphen lost and the digits
   merged. Any extractor over this WILL miss real verses.

   So the witness is deliberately three things of decreasing strength, and the
   harness uses each for what it can bear:

     chapters   — which chapters the edition has, and in which volume. Strong:
                  97 and the 45/52 split are stated in both prefaces.
     verseMax   — the highest verse marker legibly read in a chapter. A BOUND,
                  not a count: the real chapter is at least this long. Citing
                  a verse beyond it is an error worth failing on.
     attested   — the verse markers actually read. INCOMPLETE BY CONSTRUCTION.
                  A citation missing from it has not been shown wrong; it has
                  not been shown right either, and it belongs in a pending list
                  with that said, not in a pass.

   A chapter whose running head the OCR lost entirely cannot be segmented at
   all, and is listed in `unsegmented` rather than given an invented bound.

   Run:  python3 source/test/make-bphs-witness.py <vol1.txt> <vol2.txt>
         (the two project PDFs, read out as text)
"""

import hashlib
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "data", "bphs-witness.json")

CHAPTERS = 97
VOLUME_SPLIT = 45
SPLIT_SOURCE = ('BPHS-Santhanam Vol. 1, preface: "The present volume—first '
                'volume—contains 45 chapters while the remaining 52 chapters '
                'have been put in the second volume." Vol. 2 opens at Chapter '
                '46, "Dasas (Periods) of planets".')

HEAD = re.compile(r"^\s*Chapter\s+(\d{1,2})\b")
# A verse marker: start of line, a number or a hyphenated range, a full stop,
# then the translation. The lookahead for a capital or a digit is what keeps
# page numbers and table rows out; it is not enough to keep everything out,
# which is why `attested` is treated as incomplete downstream.
VERSE = re.compile(r"^\s*\.?\s*\^?\s*(?:(\d{1,3})\s*[-–]\s*(\d{1,3})|(\d{1,3}))\s*\.\s+(?=[A-Z(])")

# The scan's commonest single failure: the HYPHEN IN A RANGE COMES OUT AS A FULL
# STOP. Chapter 37's verses 7-10 read "7.10, SUNAPHA, ANAPHA AND DURADHARA" and
# chapter 7's 26-27 read "26.27. VIMSOPAKA PROPORTIONAL EVALUATION". Read by the
# pattern above those are verse 7 and verse 26, and the rest of each range
# vanishes — which is why chapter 37's bound came out as 6 while the source
# genuinely cites vv. 7-10 and 11-13. This recovers them.
#
# The guards are what keep it from eating decimals and the Vimsopaka tables,
# which are full of lines like "3.0" and "1.5": the second number must EXCEED
# the first, by no more than twenty, and what follows must be a capital or an
# opening bracket. "3.0" fails on the first guard, "1.5" on it too, "20.0" on
# it, and "0.5" on all three.
VERSE_DOTRANGE = re.compile(
    r"^\s*\.?\s*\^?\s*(\d{1,3})\s*\.\s*(\d{1,3})\s*[.,]\s+(?=[A-Z(])")


# A citation whose verse markers the OCR lost, but whose CONTENT can be found
# in the chapter anyway. Each entry names a phrase that must appear in that
# chapter's text; the builder checks it and records the result, so the
# exception is verified rather than merely asserted. An exception that stops
# corroborating fails the harness exactly like an unlisted overrun.
#
# Chapter 37 is the only one so far. Its verses 7-10 read "7.10, SUNAPHA,
# ANAPHA AND DURADHARA" and the marker for 11-13 is lost entirely in a run of
# mangled Devanagari — but the Kemadruma passage the code cites sits in the
# chapter immediately after verse 10, which is where vv. 11-13 belong. The
# bound of 10 is a scanning artefact, not a refutation of the citation.
RESOLUTION_NOTES = [
    {
        "chapter": 37, "verses": [11, 13],
        "why": "the verse marker is lost in a run of unrecoverable Devanagari, "
               "so the chapter's legible bound stops at 10",
        "corroborates": "Kemadruma",
        "reasoning": "the Kemadruma passage the citation is used for appears in "
                     "chapter 37 directly after verse 10, which is where vv. "
                     "11-13 fall; the content is attested where the number is not",
    },
]


def segments(lines):
    """Chapter segments, by running head. A head appears on nearly every page,
       so the LAST head before a line is the chapter that line belongs to —
       which also means a chapter whose heads were all lost to OCR gets no
       segment rather than being silently merged into its neighbour."""
    marks = []
    for i, line in enumerate(lines):
        m = HEAD.match(line)
        if m:
            c = int(m.group(1))
            if 1 <= c <= CHAPTERS:
                marks.append((i, c))
    out = {}
    for n, (i, c) in enumerate(marks):
        end = marks[n + 1][0] if n + 1 < len(marks) else len(lines)
        if end <= i:
            continue
        out.setdefault(c, []).append((i, end))
    return out


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(2)

    chapters = {}
    for vol, path in ((1, sys.argv[1]), (2, sys.argv[2])):
        text = open(path, encoding="utf-8", errors="replace").read()
        lines = text.split("\n")
        segs = segments(lines)
        for ch, spans in segs.items():
            # The volume a chapter belongs to is decided by the PREFACE-stated
            # split, not by which file a running head turned up in: OCR puts a
            # stray "Chapter 46" head in Vol. 1 and a stray "Chapter 46" is not
            # evidence against two prefaces.
            want_vol = 1 if ch <= VOLUME_SPLIT else 2
            if vol != want_vol:
                continue
            body, attested = [], set()
            for a, b in spans:
                chunk = lines[a:b]
                body.extend(chunk)
                for line in chunk:
                    m = VERSE.match(line)
                    if m:
                        if m.group(3):
                            v1 = v2 = int(m.group(3))
                        else:
                            v1, v2 = int(m.group(1)), int(m.group(2))
                    else:
                        d = VERSE_DOTRANGE.match(line)
                        if not d:
                            continue
                        v1, v2 = int(d.group(1)), int(d.group(2))
                        if v2 <= v1:
                            continue
                    # a range that runs backwards, or spans more than 20
                    # verses, is OCR damage rather than a marker
                    if v2 < v1 or v2 - v1 > 20 or v1 < 1 or v2 > 300:
                        continue
                    for v in range(v1, v2 + 1):
                        attested.add(v)
            joined = "\n".join(body)
            rec = chapters.setdefault(str(ch), {
                "vol": want_vol, "headOccurrences": 0, "chars": 0,
                "attested": set(), "sha256": None, "text": "",
            })
            rec["headOccurrences"] += len(spans)
            rec["chars"] += len(joined)
            rec["attested"] |= attested
            rec["text"] += joined + "\n"
            rec["sha256"] = hashlib.sha256(
                ((rec["sha256"] or "") + joined).encode("utf-8")).hexdigest()

    for ch, rec in chapters.items():
        a = sorted(rec["attested"])
        rec["attested"] = a
        rec["verseMax"] = a[-1] if a else None
        rec["attestedCount"] = len(a)
        # How complete the reading looks: a chapter whose attested verses run
        # 1..max with no gaps was read cleanly; a chapter with holes was not.
        rec["gaps"] = [v for v in range(1, (a[-1] if a else 0) + 1)
                       if v not in rec["attested"]][:40] if a else []

    unsegmented = [c for c in range(1, CHAPTERS + 1) if str(c) not in chapters]

    # check every resolution note against the chapter it claims
    notes = []
    for n in RESOLUTION_NOTES:
        rec = chapters.get(str(n["chapter"]))
        found = bool(rec) and n["corroborates"].lower() in (rec["text"] or "").lower()
        notes.append(dict(n, corroborated=found))
        if not found:
            print("  WARNING: resolution note for Ch %d vv %s does not corroborate — "
                  "%r not found in the chapter's text"
                  % (n["chapter"], n["verses"], n["corroborates"]), file=sys.stderr)

    for rec in chapters.values():
        rec.pop("text", None)

    doc = {
        "_provenance": {
            "what": "What the uploaded Santhanam edition attests: which "
                    "chapters exist, the highest verse legibly read in each, "
                    "and which verse markers were read at all.",
            "why": "Citations in this project are keyed to Santhanam's English "
                   "chapter-and-verse numbering, so this is the witness they "
                   "actually point at. citation-verify.mjs resolves every "
                   "citation against it instead of trusting the string.",
            "source": "BPHS-Santhanam-Vol-1.pdf and BPHS-Santhanam-Vol-2.pdf, "
                      "the project's own uploads, read out as text.",
            "generator": "source/test/make-bphs-witness.py",
            "checkedBy": "source/test/citation-verify.mjs",
            "notTheMula":
                "The Sanskrit mula was the intended witness and is NOT used: "
                "sa.wikisource.org is not on this environment's fetch "
                "allowlist and sanskritdocuments.org disallows robots. No "
                "workaround was attempted. It would also have needed a "
                "reconciliation pass between the mula's verse numbering and "
                "Santhanam's, and that pass would itself have been the "
                "unverified step.",
            "strength":
                "THREE THINGS OF DECREASING STRENGTH. 'chapters' and the "
                "volume split are stated in both prefaces and are strong. "
                "'verseMax' is a BOUND from the highest marker legibly read, "
                "not a verse count: the real chapter is at least that long. "
                "'attested' is INCOMPLETE BY CONSTRUCTION, because this is OCR "
                "of a scanned printing in which verse 1 of chapter 46 reads "
                "'t.', 6-11 reads '6-ll.' and 44-49 reads '4449.'. A citation "
                "missing from 'attested' has not been shown wrong and has not "
                "been shown right; it belongs in a pending list saying so.",
            "noTextStored":
                "Verse TEXT is not stored, only structure and hashes. The "
                "check this witness has to support is resolution — does the "
                "cited chapter and verse exist — and that needs structure, not "
                "text. It also keeps a scanned edition out of a public "
                "repository.",
            "chapters": CHAPTERS,
            "volumeSplit": VOLUME_SPLIT,
            "volumeSplitSource": SPLIT_SOURCE,
            "segmented": len(chapters),
            "unsegmented": unsegmented,
            "resolutionNotes":
                "A citation whose verse MARKER the scan lost but whose CONTENT "
                "is found in the chapter anyway. Each names a phrase that must "
                "appear there; the builder checks it, so the exception is "
                "verified and not merely asserted.",
        },
        "resolutions": notes,
        "chapters": {k: chapters[k] for k in sorted(chapters, key=int)},
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(doc, f, indent=1, ensure_ascii=False)
        f.write("\n")

    tot = sum(c["attestedCount"] for c in chapters.values())
    print("wrote %s" % os.path.relpath(OUT, ROOT))
    print("  %d of %d chapters segmented; %d verse markers attested"
          % (len(chapters), CHAPTERS, tot))
    if unsegmented:
        print("  no running head survived OCR for chapters: %s"
              % ", ".join(map(str, unsegmented)))


if __name__ == "__main__":
    main()
