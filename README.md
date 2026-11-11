# Nirayana — Jyotiṣa reference and chart engine

A static website for learning and applying classical Vedic astrology, grounded in
*Bṛhat Parāśara Horā Śāstra*. Fourteen reference pages, a chart builder that computes
a forty-section technical report **entirely in the browser**, and a filterable table of
the 108 nakṣatra pādas.

No server. No API key. No account. No third-party calls. Works offline.

**Live:** https://aseemm84.github.io/Astro/

---

## Contents

| | |
| --- | --- |
| **Build a Kundli** | `kundli.html` — birth details in, a 40-section report out |
| **Reference library** | 14 topic pages covering the BPHS framework |
| **108 Nakṣatra Pādas** | every pāda with a nine-graha grid and bhāva overlay (English + Hindi) |

### The reference library

Grahas · Dignity · Rashis · Bhavas · Lagna · Vargas · Aspects · Strength ·
Special Points · Yogas · Avasthas & Longevity · Dashas · Ashtakavarga

Each page cites BPHS by chapter and keeps three layers visibly distinct:
what the **verses** say, what the **translator** added, and what is **synthesis**
offered here. Where lineages disagree, the page says so rather than picking a side
silently.

### What the chart builder produces

**Sky** — a tilted **star wheel** with the horizon fixed and the zodiac turning behind it: all 27
yogatārās at catalogued positions against the equal 13°20′ divisions, with a connector showing where
the two disagree (seven of the 27 do) · an all-sky horizon dome · a flat ecliptic wheel

**Charts** — rāśi in North and South Indian styles · navāṃśa · all sixteen vargas as
charts with their own lagnas · Chandra and Sūrya kuṇḍalī · Bhāva Chalit (equal cusps) ·
Śrīpati bhāva chart (quadrants trisected, with each madhya and sandhi) · Ārūḍha Lagna · Kārakāṃśa in both
rāśi and navāṃśa · Bhāva, Horā and Ghaṭika lagnas · Sudarśana Chakra · Dhūmādi
upagrahas · ashtakavarga charts

**Position and strength** — grahas with degree, speed, dignity, compound status,
nakṣatra-pāda, avasthā and state · four avasthā schemes · bhāvas with lords and
occupants · graha dṛṣṭi · rāśi dṛṣṭi · argala · Ṣaḍbala with all six components and
their sub-parts · Bhāva Bala · Iṣṭa and Kaṣṭa phala · ṣoḍaśavarga strength index

**Ashtakavarga** — Bhinna and Sarva · the three śodhanas (Trikoṇa, Ekādhipatya,
Piṇḍa) · kakṣā transits · ashtakavarga computed inside D9 and D10

**Timing** — Vimśottarī to pratyantardaśā across the full 120 years (729 periods,
expandable) · Aṣṭottarī · Yoginī · gochara from the Moon with vedha · Sade Sati
timeline past and future · ingress and retrograde calendar · eclipses placed in the
chart · muhūrta day tools (Rāhu kālam, Yamaganda, Gulika kālam, choghaḍiyā) ·
Jaimini Chara daśā, labelled as Jaimini rather than Parāśara · Tājika **Varṣaphala**
for the running year — the solar return to the natal sidereal longitude, the annual
chart, Muntha, the five candidates for lord of the year (named, deliberately not ranked)
and Mudda daśā — labelled as Tājika, which is not in the BPHS edition used here

**Context** — birth particulars with full time reductions · birth pañcāṅga ·
Avakhaḍa chakra · Bhayāta/Bhabhoga · the three friendship chakras · kārakas ·
ārūḍhas · yogas · current transits

**Two paddhatis** — the bhāva toggle selects a *tradition*, not just a house division.
Whole-sign follows BPHS throughout. Śrīpati follows *Śrīpatipaddhati* for every quantity
his text gives — bhāvas as unequal arcs, bhāva-phala weights, his dṛṣṭi table, pakṣa,
Ayana and Saptavargaja rules, geometric Iṣṭa/Kaṣṭa and exact Bhāva Bala — and where he
is silent, BPHS is used *and said to be used*. The report, the dashboard, the printed
kuṇḍalī and both JSON exports follow the same toggle.

Each section carries a plain-language **study note** composed from the site's own
rules, linking back to the reference page the rule came from. A brief/detailed toggle
controls depth. Print to PDF, download the JSON, or copy it.

The **analyst JSON** (schema `LearnHoroJyotishaChartPayload` v1.1) carries every figure
the report shows, computed by the same code, with conventions and birth-time
sensitivity placed first. Anything that depends on the moment of export rather than the
birth — transits, gochara, Sade Sati, and the running year's Varṣaphala — sits under
`derived.as_of` and says that it goes stale.

---

## How it computes

| Layer | Source |
| --- | --- |
| Sun, planets | VSOP87, via [astronomy-engine](https://github.com/cosinekitty/astronomy) (MIT) |
| Moon | Improved Lunar Ephemeris (1954), same library |
| Lunar nodes | mean node, standard polynomial |
| Ayanāṃśa | Lahiri, quadratic fitted to Swiss Ephemeris |
| Sunrise / sunset | disc centre at the geometric horizon, unrefracted — the Jyotiṣa convention |
| Everything else | derived here from those positions using the classical rules |

The library is inlined, so the page is a single self-contained file.

### Accuracy, measured

Validated against Swiss Ephemeris and against printed charts from Parashara's Light 9.0:

- **Ayanāṃśa** — within 0.01″ of Swiss Ephemeris Lahiri
- **Planetary longitudes** — 13–19″ of Swiss Ephemeris, across all seven
- **Lagna** — within 0.3′
- **Sunrise, Iṣṭakāla, Bhabhoga, tithi, yoga, karaṇa, Avakhaḍa, Saṃvat** — match
  Parashara's Light exactly
- **Vimśottarī balance at birth** — within one day
- **Ashtakavarga** — 84/84 bindus and SAV identical to an independent engine; total 337
- **Yogas** — 15/15 present/absent verdicts agree with an independent engine

For scale: a nakṣatra pāda spans 3000″ and a D60 aṃśa 1800″, so arcsecond-level
differences never move a placement.

### Stated simplifications

Labelled in the page itself, not buried here:

- **Dṛk Bala** applies the quarter rule of BPHS Ch. 27 v. 19 on the exact dṛṣṭi speculum,
  but not that verse's final "super add" clause — a decision on record, explained in the
  report, because both readings of it void the verse's own first clause
- **Nathonnatha** is measured from clock noon, not local apparent noon
- **Vimśopaka** is a transparent weighted index, not the canonical scheme
- **Ārūḍha** exception cases follow the rule on the Special Points page; other software differs
- **Śayanādi** avasthās are omitted — they need the person's name-syllable
- **Piṇḍa** multipliers and Ekādhipatya rules are the commonly cited set; editions vary

### Not implemented, deliberately

The rest of the rāśi-daśā family — Kālachakra, Narayana, Sthira, Niryāṇa Śūla, Dṛg,
Navāṃśa, Lagna-Kendrādi — genuinely differs between lineages. Rather than present one
variant as authoritative, they are left out and the Dashas page explains the
disagreement. Chara daśā is the one exception, included with every point where the
tradition divides stated where it appears. KP sub-lords are absent for the same reason: a different system, not a
BPHS one.

Longevity and Maraka timing are computable and deliberately excluded from the tool.
The Avasthas & Longevity page teaches the method academically; the report does not
output a lifespan, under either paddhati — Śrīpati's own daśā system is left out for
the same reason, since it needs a computed lifespan to run.

In Varṣaphala, Pañcavargīya bala, the Sahamas and the Tājika yogas are not computed,
and the JSON lists them as not computed rather than leaving them silently absent.

---

## City search

Bundled and offline: 44,426 places from GeoNames (CC BY 4.0) — 34,006 worldwide towns
plus 10,420 Indian localities from the postal set, giving roughly 15 km average spacing
across India. Historical spellings resolve (Bombay, Calcutta, Madras, Bangalore, Poona,
Benares, Trivandrum). Selecting a city sets the coordinates and the **UTC offset that
applied on the birth date**, including historical daylight saving.

`cities.json` loads lazily on the first search and is then cached. It needs `http(s)`;
opening the folder directly from disk disables search but nothing else.

---

## Running it

A plain static site — no dependencies at runtime, no server code. The served pages
are **built** from `source/` and committed, so serving needs nothing:

```bash
git clone https://github.com/aseemm84/Astro.git
cd Astro
python3 -m http.server 8000     # open http://localhost:8000
```

Every page is a single self-contained HTML file with CSS and JavaScript inlined.
Deployment is GitHub Pages from the repository root. To change a page, edit
`source/src/` and rebuild — a built file edited by hand is overwritten by the next
build (see `source/README-dev.md`):

```bash
python3 source/build.py          # the website, into the repository root
python3 source/build.py --app    # the macOS / Windows desktop app, into app/
```

The desktop apps are built from the same pages by CI on every push.

### Verification

The whole gate is one command, run from the repository root after a build:

```bash
python3 source/build.py && node source/test/run-all.mjs
```

It runs the correctness suites in parallel and the two suites that assert
wall-clock budgets (a reel template builds in under 9 s; the ceremony is brief)
afterwards, alone — timing measured on a busy machine fails for the wrong reason.
Any single harness also runs on its own, e.g. `node source/test/varshaphala-verify.mjs`.
Among them:

- `reference-verify.mjs` — the engine against an independent sky (ERFA)
- `citation-verify.mjs` — every BPHS citation resolved against the edition it cites
- `quotation-verify.mjs` — quotation from the Santhanam translation is kept brief. It
  checks every shipped page against a fingerprint of the translation that can
  recognise a verbatim passage but cannot be read back into one, since the
  translation is not ours to publish
- `sripati-paddhati-verify.mjs`, `sripati-sync-verify.mjs`, `shadbala-verify.mjs` —
  Śrīpati's rules against his own worked tables, and every surface against every other
- `varshaphala-verify.mjs` — the analyst JSON's Varṣaphala against the report pane and
  against independent recomputation, under both paddhatis

Where a harness checks for a fault, the fault has been planted to prove the check
catches it.

---

## Scope

This is an **educational reference on traditional doctrine**. It is not a scientific
claim and not a prediction about any person. Nothing here forecasts health, illness,
lifespan, wealth, marriage, children or misfortune; classical indications are
conditional by nature and are presented as material for study.

For medical, legal, financial, relationship or safety matters, consult a qualified
professional.

---

## Credits

The same list, with what each piece is used for, is on the site's
**Credits & licences** page (`credits.html`), linked from every page's footer. Full
terms are in `LICENSE.md`.

- **Primary source** — *Bṛhat Parāśara Horā Śāstra*, R. Santhanam translation
- **Other texts cited** — *Śrīpatipaddhati*, V. Subrahmanya Sastri translation (1937) ·
  *Pañcasiddhāntikā*, T. S. Kuppanna Sastry translation · *Sūrya Siddhānta*, the
  recension Ebenezer Burgess translated
- **Ephemeris** — [astronomy-engine](https://github.com/cosinekitty/astronomy) by Don Cross (MIT)
- **Place data** — [GeoNames](https://www.geonames.org/) (CC BY 4.0)
- **Star data** — the [HYG database](https://github.com/astronexus/HYG-Database) (CC BY-SA 4.0)
- **Dashboard charts** — [Apache ECharts](https://echarts.apache.org/) (Apache 2.0), with
  its drawing layer [ZRender](https://github.com/ecomfe/zrender) (BSD 3-Clause, © Baidu Inc.)
- **Validation references** — Swiss Ephemeris; Parashara's Light 9.0
