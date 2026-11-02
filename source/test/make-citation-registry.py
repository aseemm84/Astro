#!/usr/bin/env python3
"""Extract every BPHS citation in the source into source/data/citations.json.

   WHY THIS EXISTS.

   The project's first rule is that a citation is either exact or absent, and
   none of them is fabricated. That rule has been kept by hand, in prose, in 38
   files: "BPHS Ch. 35, vv. 9–11", "Vol. 1, Ch. 6", "BPHS, Vol. 2, Ch. 46, vv.
   12–16". Nothing checked them. A wrong chapter number, a volume that
   contradicts the same chapter cited elsewhere, a verse range written backwards
   — none of it would fail a test, and a reader who went to the PDF to look one
   up would be the first to know.

   This writes them down as data so they CAN be checked. It does not verify
   that a verse says what the surrounding code claims — that needs the text
   itself, which is step 2 — but it catches the whole class of error that lives
   in the citation rather than in the claim: a chapter outside the book, a
   volume that disagrees with itself, a range that runs backwards, a citation
   that drifted from the form every other one uses.

   WHAT IT DOES NOT DO. It does not rewrite the source. The registry is
   generated FROM the code, so the code stays the single place a citation is
   written and the registry stays a derived index of it. A registry that had to
   be edited in step with the prose would simply be a second thing to forget.

   Run:  python3 source/test/make-citation-registry.py
"""

import json
import os
import re
import sys
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)                     # source/
SRC = os.path.join(ROOT, "src")
# An optional argument sends the output elsewhere, which is how
# citation-verify.mjs regenerates the registry into a scratch file and compares
# it against the committed one. That comparison is the check that matters: it
# is what notices a citation added to the code and never registered.
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "data", "citations.json")

# Santhanam's edition as this project uses it: 97 chapters in two volumes,
# split 45 / 52. NOT a round number, and not a guess — both prefaces state it:
#
#   Vol. 1: "The present volume—first volume—contains 45 chapters while the
#            remaining 52 chapters have been put in the second volume."
#   Vol. 2: "The book BRIHAT PARASARA HORA SASTRA is made up of 97 chapters,
#            45 of which have already been published as Vol. I. … the remaining
#            52 chapters."
#
# This started as VOLUME_SPLIT = 50, assumed because it was round, and the
# generator then flagged the source's own "BPHS, Vol. 2, Ch. 46" as suspicious.
# The citation was right and the assumption was wrong: Vol. 2 opens at Chapter
# 46, "Dasas (Periods) of planets". Worth recording, because that is the whole
# use of a registry — it made someone go and look instead of assuming, and the
# thing that was wrong was the assumption.
VOLUME_SPLIT = 45
MAX_CHAPTER = 97
SPLIT_SOURCE = ('BPHS-Santhanam Vol. 1, preface: "The present volume—first '
                'volume—contains 45 chapters while the remaining 52 chapters '
                'have been put in the second volume." Vol. 2 opens at Chapter '
                '46, "Dasas (Periods) of planets".')

# Every notation the source actually uses, in one place. "Ch." dominates;
# "Chapter" appears in prose; the volume prefix is sometimes absent and the
# verse part is often absent. The dash in a range may be an en-dash, an
# em-dash, a hyphen or " to ".
CITE = re.compile(
    # The volume digit is NAMED. It was an unnamed inner group at first, read
    # back as m.group(3) — which is actually the chapter, because the named
    # groups shift the numbering. Every citation then recorded its chapter as
    # its volume, and the generator cheerfully reported "chapter 46 cited as
    # Vol. 46". Positional groups in a pattern that also has named ones are a
    # trap; nothing here uses a number any more.
    r"(?:Vol\.?\s*(?P<voln>[12])[,\s]+)?"
    r"(?:Ch(?:apter|\.)?\s*(?P<ch>\d{1,2}))"
    # The separator and the second number are ONE optional group. They were
    # independently optional at first, so "v. 9 — Śukra always" matched with
    # the em-dash consumed and no second number, and the citation came out as
    # "Vol. 2, Ch. 79, v. 9 —" with a dangling dash that then failed the house
    # form. The source was fine; the extractor was eating the next sentence.
    r"(?:[,\s]+(?:vv?\.|verses?)\s*(?P<v1>\d{1,3})"
    r"(?:(?:\s*[–—\-]\s*|\s+to\s+)(?P<v2>\d{1,3}))?)?",
    re.IGNORECASE)

# A citation counts as a BPHS citation only if BPHS or Parāśara is named near
# it. "Ch. 7" on its own, in a sentence about this site's own sections, is not
# a claim about the text and must not be swept in.
NEAR = re.compile(r"BPHS|Br\.?hat|Parāśara|Parasara|Santhanam", re.IGNORECASE)
NEAR_WINDOW = 90

SKIP_DIRS = {"__pycache__", "node_modules", ".git"}
EXTS = {".js", ".html", ".json", ".md", ".frag"}


def context_of(line, start, end):
    """The claim the citation sits in, trimmed to something readable. Taken
       from the line rather than the paragraph: a line is what a grep shows and
       what a reviewer will compare against the verse."""
    s = line.strip()
    s = re.sub(r"\s+", " ", s)
    if len(s) <= 220:
        return s
    # keep the citation in view
    at = max(0, start - 90)
    return ("…" if at else "") + s[at:at + 220].strip() + "…"


def main():
    rows = []
    for dirpath, dirnames, filenames in os.walk(SRC):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in sorted(filenames):
            if os.path.splitext(fn)[1] not in EXTS:
                continue
            path = os.path.join(dirpath, fn)
            rel = os.path.relpath(path, ROOT)
            try:
                text = open(path, encoding="utf-8").read()
            except UnicodeDecodeError:
                continue
            for i, line in enumerate(text.splitlines(), 1):
                for m in CITE.finditer(line):
                    a = max(0, m.start() - NEAR_WINDOW)
                    b = min(len(line), m.end() + NEAR_WINDOW)
                    if not NEAR.search(line[a:b]):
                        continue
                    ch = int(m.group("ch"))
                    v1 = m.group("v1")
                    v2 = m.group("v2")
                    vol = m.group("voln")
                    rows.append({
                        "file": rel.replace(os.sep, "/"),
                        "line": i,
                        "text": m.group(0).strip(),
                        "vol": int(vol) if vol else None,
                        "chapter": ch,
                        "verses": ([int(v1), int(v2)] if v2 else
                                   ([int(v1), int(v1)] if v1 else None)),
                        "claim": context_of(line, m.start(), m.end()),
                    })

    # group the distinct loci, so the harness can check each once and a reader
    # can see at a glance which chapters this site actually leans on
    loci = defaultdict(list)
    for r in rows:
        key = "%d%s" % (r["chapter"],
                        ":%d-%d" % tuple(r["verses"]) if r["verses"] else "")
        loci[key].append(r)

    by_chapter = defaultdict(set)
    for r in rows:
        if r["vol"]:
            by_chapter[r["chapter"]].add(r["vol"])

    doc = {
        "_provenance": {
            "what": "Every BPHS chapter/verse citation in source/src, with the "
                    "file and line it appears on and the claim it sits in.",
            "why": "The project's rule is that a citation is either exact or "
                   "absent. That has been kept by hand in prose across 38 "
                   "files with nothing checking it: a wrong chapter, a volume "
                   "that contradicts the same chapter cited elsewhere, or a "
                   "verse range written backwards would all have shipped "
                   "silently.",
            "generator": "source/test/make-citation-registry.py",
            "checkedBy": "source/test/citation-verify.mjs",
            "derived":
                "GENERATED FROM THE CODE, never edited by hand. The code stays "
                "the one place a citation is written; this is an index of it. A "
                "registry that had to be edited in step with the prose would "
                "just be a second thing to forget.",
            "whatThisCannotCheck":
                "Whether a verse SAYS what the surrounding code claims. That "
                "needs the text as data, which is the next step. What it does "
                "check is the citation itself: chapter in range, volume "
                "self-consistent, verse range not backwards, notation uniform.",
            "edition": "BPHS, R. Santhanam translation, 2 volumes, 97 chapters "
                       "(the uploaded edition this project cites).",
            "volumeSplit": VOLUME_SPLIT,
            "volumeSplitSource": SPLIT_SOURCE,
            "maxChapter": MAX_CHAPTER,
            "citations": len(rows),
            "distinctLoci": len(loci),
            "files": len(set(r["file"] for r in rows)),
        },
        "chaptersCited": sorted(set(r["chapter"] for r in rows)),
        "volumeByChapter": {str(k): sorted(v) for k, v in sorted(by_chapter.items())},
        "citations": sorted(rows, key=lambda r: (r["file"], r["line"], r["chapter"])),
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(doc, f, indent=1, ensure_ascii=False)
        f.write("\n")
    print("wrote %s — %d citations, %d distinct loci, %d files"
          % (os.path.relpath(OUT, ROOT), len(rows), len(loci), doc["_provenance"]["files"]))

    # a quick look at anything suspicious, so a human sees it at generation time
    bad = []
    for ch, vols in sorted(by_chapter.items()):
        if len(vols) > 1:
            bad.append("chapter %d is cited as BOTH Vol. %s" % (ch, " and Vol. ".join(map(str, vols))))
        for v in vols:
            want = 1 if ch <= VOLUME_SPLIT else 2
            if v != want:
                bad.append("chapter %d cited as Vol. %d, but the split at %d puts it in Vol. %d"
                           % (ch, v, VOLUME_SPLIT, want))
    for r in rows:
        if r["chapter"] < 1 or r["chapter"] > MAX_CHAPTER:
            bad.append("%s:%d chapter %d is outside 1-%d" % (r["file"], r["line"], r["chapter"], MAX_CHAPTER))
        if r["verses"] and r["verses"][0] > r["verses"][1]:
            bad.append("%s:%d verse range %d-%d runs backwards"
                        % (r["file"], r["line"], r["verses"][0], r["verses"][1]))
    if bad:
        print("\nsuspicious (the harness will fail on these):", file=sys.stderr)
        for b in sorted(set(bad)):
            print("  " + b, file=sys.stderr)
    else:
        print("nothing suspicious in the citations themselves")


if __name__ == "__main__":
    main()
