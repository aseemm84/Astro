# Nirayana — source

The site is **built, not hand-edited**. `kundli.html` and the fourteen reference pages
are assembled by `build.py` from the files in `src/`. Editing a built file directly
works until the next build overwrites it, so make every change here.

Put this folder in the repository as `source/`. Running `python3 build.py` from
inside it writes the fifteen HTML files to the repository root, where GitHub Pages
serves them.

```
source/
  build.py                assembles all 15 HTML files
  vendor/                 astronomy-engine (MIT), inlined at build time
  src/
    kundli.shell.html       the Build-a-Kundli page skeleton
    logo.svg.frag           the brand mark
    css/app.css             the kundli page and dashboard styles
    css/pages.css           the reference pages
    js/engine.js            THE ENGINE — positions, ayanāṃśa, vargas, ṣaḍbala, yogas
    js/star-catalogue.js    27 yogatārās + 22 bright stars, from HYG
    js/starwheel-geom.js    the tilted-ecliptic projection
    js/ui.js                form, city search, save/open, download
    js/report/              46 modules, grouped below
    pages/                  the 14 reference pages and their shell
  test/self-test.html     352 checks — development only, not linked from the site
  test/reference-verify.mjs       the engine against an INDEPENDENT sky
  test/make-reference-fixture.py  writes the fixture that harness holds it to
  test/fixtures/                  reference-ecliptic.json — 400 ERFA samples
  test/span-verify.mjs            the certified window, its band and tolerances
  test/citation-verify.mjs        every BPHS citation, checked as a citation
  test/make-citation-registry.py  writes data/citations.json from the source
  test/quotation-verify.mjs       quotation from the translation kept brief
  test/make-translation-fingerprint.py  writes data/santhanam-fingerprint.*
                                  (a Bloom filter: recognises a verbatim run of
                                  the translation, cannot be read back into it)
  test/varshaphala-verify.mjs     analyst JSON's varṣaphala vs the pane and an
                                  independent recomputation, both paddhatis
  data/citations.json             196 citations, 82 loci, 36 files
  test/make-bphs-witness.py       writes data/bphs-witness.json from the PDFs
  data/bphs-witness.json          what the uploaded edition attests
  test/fit-siddhanta.mjs          fits the text's constants to a modern sky
  test/siddhanta-measured-verify.mjs   and holds that fit honest
  data/siddhanta-measured.json    46 fitted constants and their residuals
```

## The certified window

1800–2200 is where the engine is **checked**, not where it stops working. The
ayanāṃśa polynomials were fitted over it and `reference-verify.mjs` holds the
positions to an independent sky across it. Outside it the engine still answers —
the Sūrya Siddhānta page exists to look at 500 CE, and refusing would make it
useless — but the report now says what the date costs instead of answering with
the same confidence and saying nothing.

`window.__kSpan(jd)` returns the year, whether it is inside, and the measured
Moon disagreement for its band; `spanBand(D)` in `report/core/01-helpers.js`
renders that as a box, and returns the empty string inside the window. The band
leads the **Overview** tab, not only the Full report.

Two things the measurement settled, both contrary to the obvious guess:

* **The ayanāṃśa is not the limit.** Its linear and quadratic coefficients
  reproduce IAU 2006 accumulated precession to five figures (5028.7967 against
  5028.7962 ″/cy; 1.105501 against 1.105435 ″/cy²), so the polynomial omits only
  that series' cubic and higher — 0.31″ at 1000 CE, 0.16″ at 3000 CE, and not
  37″ until 1500 BCE. A quadratic fitted over four centuries had no right to
  extrapolate twenty that well. Cautioning about it would have been a false
  alarm, and would have sent someone tightening the wrong thing.
* **The Moon is the limit.** Worst-case disagreement with the reference by band,
  from `fixtures/reference-ecliptic-wide.json` (300 samples, 1000–3000):
  205″ for 1000–1399, 73″ for 1400–1799, **10″ inside the window**, 56″ for
  2201–2599, 164″ for 2600–3000. Either side may be responsible — ERFA's own
  lunar series degrades away from 1900–2100 too — so the band calls it a
  disagreement and therefore an uncertainty, not an engine error. Past 1000–3000
  nothing is quoted at all, because the reference is itself only documented over
  that range.

Regenerate the wide fixture with
`python3 test/make-reference-fixture.py 300 1000 3000 wide`. `span-verify.mjs`
remeasures every quoted figure and fails if one falls below its measurement
**or** exceeds twice it. That check has caught three real slips so far: two
bands quoted a tenth of an arcsecond low, and the certified window quoted 10″
because it had been remeasured from the 60 samples the *wide* fixture happens to
place inside it, when the dense 400-sample fixture that actually certifies the
window measures 14.8″. **Each band now names the fixture that samples it best
(`ref: "dense"` or `"wide"`) and the harness asserts the pairing** — a band
remeasured from the wrong fixture is the failure mode that passes every check.

### What the figures are worth in time

Each band also carries the end-instant error in **seconds**, measured rather
than divided out of the Moon figure. A tithi, yoga or karaṇa boundary is a
condition on the Moon's *elongation* from the Sun, which closes at about
0.45″/s at its slowest, so the Sun and Moon errors combine through the
elongation and not through the Moon's own motion — estimating it from the Moon
alone understated 1000–1399 by about a fifth. A nakṣatra boundary is the Moon
alone, at about 0.49″/s.

| Band | Moon | tithi end | nakṣatra end |
|---|---|---|---|
| 1000–1399 | 205″ | 452 s | 416 s |
| 1400–1799 | 73″ | 162 s | 148 s |
| **1800–2200** | **15″** | **34 s** | **31 s** |
| 2201–2599 | 56″ | 123 s | 113 s |
| 2600–3000 | 164″ | 359 s | 333 s |

Inside the window both timing figures are under a minute, which is **why
printing every instant to the minute is honest** — and nothing on the site ever
printed a computed instant to the second, so that part was already right. What
was missing is that an unqualified "05:42" reads as exact. `now.html` and
`calendar.html` now carry a tolerance line filled from these same figures at
render time, so the sentence cannot drift from the measurement.

The split between the two pages is deliberate: **the calendar refuses outside
1800–2200 and the chart engine discloses.** `panchanga.js` has enforced
`NP.RANGE` all along and the year input declares `min`/`max` on itself, so a
month grid of end-times nobody should rely on is never printed; a chart for 500
CE is worth casting with a band on it. That also means the calendar's note needs
no out-of-window branch — one would be unreachable code masquerading as a
safeguard.

### One thing the ΔT line in `reference-verify.mjs` does *not* mean

It prints the gap between the UT that puts the engine at the fixture's TT and
the fixture's UTC — about 375 s by 2200. An earlier version of that comment
called it "a real uncertainty in civil-time results after 2027". **That
overstated it.** astropy runs here with no IERS data, so its UT1 is just UTC and
its TT−UTC is the definitional 32.184 s plus leap seconds — not a ΔT model at
all. The printed quantity is therefore very nearly **ΔT itself**, not the spread
between predictions of it. astronomy-engine uses an observed table through 2027
and a prediction after; predictions diverge the further out they run; and
nothing here measures that spread, because two sources are not enough and one of
them is not modelling the quantity. It is printed as a magnitude and nothing is
claimed from it.

Its last section casts real charts in a browser and reads `innerText`. That
exists because the first version of the band was pushed onto the Full report
only: it was in the DOM, in no visible tab, and every other check passed. A
disclosure nobody can read is not a disclosure, and `innerHTML` cannot tell the
difference.

## The one check that is not the site checking itself

Everything in `test/` except `reference-verify.mjs` compares the site to itself:
two copies of the varga formulas against each other, the prastāra against the
bhinna totals it must sum to, the Chara lengths against cases counted by hand.
All of that has caught real regressions and none of it would notice if the
POSITIONS went wrong, because there was nothing to compare them to.

`reference-verify.mjs` compares them to a sky computed by ERFA — the IAU's own
SOFA algorithms, through astropy — on 400 instants spread over 1800–2200 and
stratified so every month and every hour appears. Regenerate the fixture with
`python3 test/make-reference-fixture.py` (needs astropy; takes about 25 s) and
run the harness with `node test/reference-verify.mjs`, or `--verbose` for the
fixture's provenance. It needs no browser and takes two seconds.

Three things worth knowing before changing a bar in it:

* **It compares on Terrestrial Time, not UTC.** astronomy-engine treats its
  Date as UT and applies its own ΔT; the fixture's TT predicts nothing. At a
  common UTC the two ΔT models disagree by about 375 s by 2200, which displaces
  the Moon 219″ and is indistinguishable from an ephemeris fault — it showed as
  a clean monotonic ramp and was only obvious once the residual was bucketed by
  half-century. The harness solves for the UT that puts the engine at each
  sample's TT, and reports the ΔT gap separately: it is a genuine uncertainty in
  civil-time results after 2027, so it is printed rather than hidden, and not
  failed on.
* **The bars are unequal on purpose.** ERFA's `plan94` has a documented
  longitude error of 71″ for Jupiter and 81″ for Saturn against 0.1″ for the
  Sun, and the fixture carries that table so every bar can be justified from it
  rather than chosen to pass. A tight Saturn bar would fail on the reference,
  not the engine. The Sun and Moon — which fix the ayanāṃśa frame, the nakṣatra,
  the tithi and every daśā boundary — are where the reference is strongest and
  the bars are tightest, which is the right way round here.
* **It found a real bug on its first run.** `ascendant()` returned the
  DESCENDANT above the Arctic circle: zero disagreement at or below 66°, 4% at
  67°, 21% at 70°, 38% at 80°. Every bhāva was rotated by six for anyone born
  that far north, silently. The branch is tested now instead of assumed, and the
  harness asserts both halves of that — the flip fires at Tromsø and moves the
  lagna by 180°, and at the three ordinary latitudes it never fires and the
  lagna is bit-identical to before the fix.

The lagna is checked in two separated pieces, which is worth copying elsewhere:
given the engine's own sidereal time and obliquity, its closed form must equal
an independent horizon-plane intersection exactly (it does — 0.000″ at all four
places), and what remains when the reference supplies its own Earth orientation
is the 12.4″ sidereal-time gap seen through the geometry, amplified about
ninefold near the pole. Testing the construction and its inputs separately is
why a 112″ polar residual could be attributed rather than merely tolerated.

A JPL DE kernel would beat `plan94` for the outer planets. `naif.jpl.nasa.gov`
is not reachable from this environment, so if it ever becomes so, set
`EPHEMERIS` in the generator to `de440s` and every planet bar can drop by an
order of magnitude with no other change.

## Citations

The project's first rule is that a citation is either exact or absent and none
is fabricated. That rule had been kept by hand, in prose, across **36 files and
196 citations**, with nothing checking it. A wrong chapter, a volume that
contradicts the same chapter cited elsewhere, or a verse range written backwards
would all have shipped, and the first person to notice would have been a reader
who went to the PDF to look one up.

`make-citation-registry.py` extracts them all into `data/citations.json` — file,
line, chapter, verses, and the line of code the citation sits in so it can be
reviewed. The registry is **generated from the code, never edited beside it**:
the code stays the one place a citation is written, and a registry you had to
update in step with the prose would just be a second thing to forget.

`citation-verify.mjs` then checks, in 20 assertions:

* **The registry still matches the source.** It reruns the generator into a
  scratch file and compares byte for byte. This is the check the others depend
  on — everything else could pass on a registry six months stale, and this is
  what notices a citation added to the code and never registered.
* Every chapter inside 1–97; every explicit volume consistent with the
  edition's split; no verse range backwards; no chapter cited as being in both
  volumes; every citation carrying the line it sits in.
* **Notation uniform enough to grep.** Not pedantry: a citation nobody can grep
  for is a citation nobody checks. The house form is `Ch. 35, vv. 9–11`, with an
  absent volume, an absent verse part, a single verse and a spelled-out
  "Chapter" tolerated.

### What it cannot check, and says so

Whether a verse **says** what the surrounding code claims. That needs the text
as data, which is the next step. The registry's own provenance block states this
rather than leaving a reader to assume the stronger thing.

### The volume split is 45 / 52, and that is not a round number

Both prefaces state it. Vol. 1: *"The present volume—first volume—contains 45
chapters while the remaining 52 chapters have been put in the second volume."*
Vol. 2 opens at Chapter 46, "Dasas (Periods) of planets".

Worth recording because the generator started with `VOLUME_SPLIT = 50`, assumed
because it was round, and promptly flagged the source's own `BPHS, Vol. 2, Ch.
46` as suspicious. **The citation was right and the assumption was wrong.** That
is the use of a registry — it sent someone to look instead of assuming — and the
figure now travels with the quotation that settles it.

### Resolving a citation against the edition

The registry checks a citation's **shape**. `data/bphs-witness.json` lets
`citation-verify.mjs` also ask whether the chapter and verse it names can be
**found** — built by `make-bphs-witness.py` from the project's own two PDFs read
out as text.

**Not the Sanskrit mūla, and the witness says so.** That was the plan;
`sa.wikisource.org` is not on this environment's fetch allowlist and
`sanskritdocuments.org` disallows robots. No workaround was attempted. It turned
out to be the better outcome anyway: every citation here is keyed to Santhanam's
**English** numbering, so a mūla witness would have needed a reconciliation pass
between two numbering schemes — and that pass would itself have been the
unverified step. The edition the citations point at is the right thing to check
them against.

**No verse text is stored, only structure and hashes.** The check this has to
support is resolution — does the cited chapter and verse exist — and that needs
structure. It also keeps a scanned edition out of a public repository.

The witness is three things of decreasing strength, and the harness uses each
for only what it can bear:

| | |
|---|---|
| `chapters` | which chapters exist and in which volume. **Strong** — stated in both prefaces. |
| `verseMax` | the highest verse marker legibly read. A **bound**, not a count. |
| `attested` | the markers actually read. **Incomplete by construction.** |

That last word matters. This is OCR of a scanned 1984 printing: verse 1 of
chapter 46 prints as `t.`, 6–11 as `6-ll.`, 44–49 as `4449.`. A citation the
scan cannot read **has not been shown wrong**, so a flat pass/fail would be the
dishonest shape here. Each citation lands in one of four classes instead:

```
43  resolve      every verse in the range was read in that chapter
34  plausible    below the chapter's legible bound, marker not legible
 1  beyond bound needs a reasoned note
 3  unsegmented  the chapter's running head is illegible
```

The counts are **ratcheted against a baseline committed in the harness**, not in
the generated witness — a baseline that regenerated with the data could never
fail. They may only improve.

### Reasoned notes, which are checked and not merely asserted

A citation past its chapter's bound needs an entry in `RESOLUTION_NOTES` naming
a phrase that must appear in that chapter, and the builder checks it. There is
one, and it is instructive.

`BPHS Ch. 37, vv. 11–13` backs the Kemadruma rule. The chapter's legible bound
is 10, because vv. 7–10 print as `7.10, SUNAPHA, ANAPHA AND DURADHARA` and the
marker for 11–13 is lost in a run of unrecoverable Devanagari. But the Kemadruma
passage sits in chapter 37 directly after verse 10, which is where vv. 11–13
fall — so the note names `Kemadruma`, the builder confirms it is there, and the
harness fails if it ever stops being. **The content is attested where the number
is not.** An exception that stops corroborating fails exactly like an unlisted
overrun.

Recovering the `N.M.` range pattern was worth doing before any of this: it took
chapter 7's bound from 29 to 43 and chapter 37's from 6 to 10, and dropped the
beyond-bound count from 9 citations to 1. Its guards — the second number must
exceed the first by no more than twenty, and a capital must follow — are what
keep it out of the Vimsopaka tables, which are full of lines like `3.0` and
`20.0`.

Regenerate with
`python3 test/make-bphs-witness.py <vol1.txt> <vol2.txt>`, the two project PDFs
read out as text.

### What the first run found

Seven real notation drifts, now normalised: five citations written `ch.`
lower-case or with the comma missing (`Vol. 2 ch. 79 v. 9`), and two verse ranges
using a hyphen where every other one uses an en-dash. Nothing wrong with the
scholarship — exactly the drift that accumulates in prose nobody can grep.

It also found two bugs in its own extractor, which are the more instructive
ones. The volume digit was an unnamed inner group read back positionally, so
named groups shifted the numbering and every citation recorded its *chapter* as
its volume. And the range separator was optional independently of the second
number, so `v. 9 — Śukra always` matched with the em-dash swallowed and came out
as `v. 9 —`. Both times the source was fine and the tool was wrong, which is the
normal case and worth expecting.

## The measured siddhānta tier

`ss-engine.js` computes with the Sūrya Siddhānta's own constants and lands
degrees from the real sky. That is the method's accuracy, the engine reports it
rather than hiding it, and it makes the file a good scholarly object and a
useless one for casting a chart.

`SSEngine.measured()` swaps in constants fitted by `test/fit-siddhanta.mjs`,
keeping **every equation exactly as it is** — madhyama, manda, śīghra, the
epicycle interpolation, the 24-entry sine table. What moves is a bīja on each
body's revolutions, an epoch longitude, a scale on each paridhi of the pair the
text states, and an offset on each mandocca: 46 numbers, every one a quantity
the tradition itself treats as correctable. `bare()` puts them all back, and
`siddhanta-measured-verify.mjs` asserts the restored engine is **bit-identical**
to one that never heard of the tier.

**It is not the Sūrya Siddhānta's answer** and any page showing it must say so.
It is the text's method carrying measured numbers.

### What it reaches, out of sample

213 instants the optimiser never saw:

| | | | |
|---|---|---|---|
| Sūrya **1.0′** | Guru **6.0′** | Śani **7.3′** | Śukra **8.4′** |
| Maṅgala 58′ | Candra 62′ | Budha 107′ | |

Against the bare text that is ×38 for the Sun and ×52 for Saturn — and only
×6, ×3.5 and ×1.4 for the Moon, Mars and Mercury.

### The split is a finding, not a shortcoming of the fit

Obvious readings deserve testing, so the Moon's residual is regressed on the
arguments of the two largest terms this theory does not have. It yields an
**evection of 75.9′ against the textbook 76.4′** and a **variation of 39.7′
against 39.5′** — recovered from the residual alone, to under one per cent — and
removing just those two drops its rms from 62′ to 14′.

So the Moon's limit here is **the absence of terms, not the value of numbers**,
and no bīja, paridhi or mandocca could supply them: an evection is a function of
the elongation and nothing in the parameter set is. Budha's and Maṅgala's
eccentricities are likewise past what a single epicycle can carry. Supplying the
missing terms would make this a different astronomy wearing the same parameters,
which is the line this tier does not cross. The diagnostic is **re-measured by
the harness, not quoted from the file**.

### Three decisions that make it science rather than curve-drawing

* **Out of sample.** The 400 reference samples split by a deterministic hash of
  the instant; the holdout half is never seen by the optimiser and is what gets
  reported. The split was alternate indices at first, which was wrong — the grid
  advances about a year per sample, so even/odd is a two-year cadence and Mars's
  period is 1.88 years. Fit and holdout were sampling nearly the same phase of
  Mars's cycle, the one thing a holdout must not do. A hash has no period to
  resonate with.
* **One parameter per classical quantity.** No free terms. The harness asserts
  every parameter name is a classical quantity and that no body carries more
  than eight.
* **Fitted the way production calls it** — ahargaṇa from the civil instant, not
  from TT. A siddhānta has no ΔT, so fitting in TT would have reported residuals
  no user could reproduce. ΔT stays an unmodelled systematic inside the holdout
  numbers, which is the honest place for it.

The frame is the site's own Lahiri sidereal, not the text's libration ayanāṃśa,
because a measured tier exists to be comparable with the modern engine on the
same chart. The text's ayanāṃśa stays on the unfitted path.

**The epoch longitude was the parameter that mattered.** Without it the Sun
stalled at 15.6′ where a single-epicycle Sun should reach two or three, because
the bīja had to absorb both the constant offset between the text's sidereal zero
and the frame being fitted to *and* the drift, with one number for two jobs.
Adding it is not a liberty: a correction to where a graha stood at the epoch is
precisely what a saṃskāra is. The Sun went to 1.04′.

Refit with `node test/fit-siddhanta.mjs --iters 1500 --write` (about four minutes; without `--write` it reports and changes nothing).

## The report modules

`src/js/report/` holds the report in 46 files, grouped by what they do. They are
**slices of one closure, concatenated in the order given by `_order.json`** — not
independent modules. The folders are for a human reading the tree; the manifest is
what the build obeys.

| Folder | What lives there |
| --- | --- |
| `core/` | constants, helpers, varga lagnas, the derive step, chart SVG, aspects, the rule base |
| `sections/` | the report's own sections — dṛṣṭi, friendship, ashtakavarga, avasthās, cusps, upagrahas, ārūḍhas, Yoginī, transit scan |
| `tabs/` | one file per tab — Overview, Now, Life timeline, Birth-time check, Reading path, Life events, Compatibility |
| `glassbox/` | the clickable derivations, one per figure, plus the sensitivity probe |
| `sky/` | the ecliptic wheel, the sky pane, the star wheel, the legends |
| `export/` | the JSON export, the divisional analysis, the rule-based readings |
| `print/` | the full-report print document |
| `assemble/` | `99-main.js`, which registers the tabs and assembles the Full report |

Because they share one scope, **a name collision between two modules is a real bug
and the build will not catch it**. It has happened twice: a helper called `nb` that
an earlier module already used as an array, and a `PRINT_EXPAND` reference that was
pushed to before it was declared. Both surfaced only at runtime. Grep before naming
anything short.

## After any change

1. `python3 build.py`
2. serve the output folder and open **`test/self-test.html`**, then press *Run the suite*
3. if a check goes red, fix the engine rather than the test

`python3 build.py --check` rebuilds and compares against the files already in the
output folder, reporting *identical to the current output* when nothing shipped has
changed. Use it to prove a refactor changed nothing.

`test/self-test.html` is a **development tool, not part of the site**. Nothing links
to it. It runs a fixed set of reference charts and compares against published
figures, which is a question readers do not have. It stays in the repository because
these checks have repeatedly caught real regressions — a shadowed variable that
silently emptied the chara kārakas, a cusp loop that clobbered two houses, a wrong
deep-debilitation constant, a missing clause in the Kemadruma rule.

What users get instead is better suited to them: the glass box, where any figure in
the report opens its own derivation and recomputes itself, and the sensitivity
badges, which say which parts of *their* chart a small birth-time error would move.

## The build id

`build.py` prints a build id and stamps it into the accuracy section of
`kundli.html`. It is a hash of the shell, the styles and all the JavaScript, so it
changes whenever anything shipped changes and stays put when nothing does. Use it to
confirm a deploy landed rather than guessing from the visuals.

## The dashboard

`dashboard.html` and `kundali-dashboard-template.html` are **not built by `build.py`**.
They are maintained directly, and `inject_kundali.py` embeds a chart JSON into the
template. The template carries its own inlined copy of Apache ECharts so the page
needs no network.

## Why everything is inlined

`kundli.html` carries the engine, the styles and the logo inside it. That is
deliberate: the page opens from a folder with no server, works offline, and cannot be
broken by a CDN. The cost is a 636 KB file. Keep it that way unless there is a
stronger reason than tidiness.
