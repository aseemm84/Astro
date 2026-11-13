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
their sub-parts, and planetary war (yuddha bala) by each paddhati's own rule · Bhāva Bala ·
Iṣṭa and Kaṣṭa phala (under Śrīpati also per varga, from his saptavarga tables) ·
Vimśopaka by BPHS Ch. 7 vv. 21–25

**Ashtakavarga** — Bhinna and Sarva · the three śodhanas (Trikoṇa, Ekādhipatya,
Piṇḍa) · kakṣā transits · ashtakavarga computed inside D9 and D10

**Explain in simple language** — every page, on the website and in the desktop app,
opens with a box of that name: one line saying what the page is for, and when opened,
what the page shows, how to use it, how to read it, and where to be careful — written
for a reader with no background in astronomy or Jyotiṣa. All forty live in one file,
`source/src/pages/_plain.py`; the build refuses to run if a page has none, and
`plain-verify.mjs` checks every built page.

**Timing** — Vimśottarī to pratyantardaśā across the full 120 years (729 periods,
expandable) · Aṣṭottarī · Yoginī · the rest of BPHS Ch. 46, each cited to its verses:
the eight conditional nakṣatra daśās (Ṣoḍaśottarī, Dvādaśottarī, Pañcottarī, Śatābdikā,
Caturaśīti-sama, Dvisaptati-sama, Ṣaṣṭi-hāyanī, Ṣaṭtriṃśat-sama) with each condition
tested against the chart, Kāla, Cakra and Kālacakra (Savya/Apasavya, deha and jīva,
gatis), and the rāśi daśās — Chara by the BPHS rule, Sthira with its Brahma Graha,
Yogārdha, Kendrādi (rāśi and graha), Kāraka, Maṇḍūka, Trikoṇa, Dṛg, Rāśi, Sandhyā with
Pācaka, and Tārā · gochara from the Moon with vedha · Sade Sati
timeline past and future · ingress and retrograde calendar · eclipses placed in the
chart · muhūrta day tools (Rāhu kālam, Yamaganda, Gulika kālam, choghaḍiyā) ·
Jaimini Chara daśā beside the BPHS one, with where they differ · Tājika **Varṣaphala**
for the running year — the solar return to the natal sidereal longitude, the annual
chart, Muntha, Pañcavargīya bala, the Varṣeśa chosen from the five office-bearers,
Itthaśāla and Īśarāpha, ten sahams, Mudda and Pātyāyinī daśās — labelled as Tājika
(B. V. Raman's statement of it), which is not in the BPHS edition used here

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
| ΔT | observed values 1955–2025 (IERS/USNO), Espenak–Meeus outside them; published per chart with JD(TT), sidereal time and both obliquities |
| Lunar nodes | mean node (polynomial) or true node (osculating), checked against Swiss Ephemeris |
| Ayanāṃśa | Lahiri by default; Raman, KP, Yukteshwar, Bhasin, Fagan–Bradley, the true-star and Sūrya Siddhānta modes, and this site's Nirayana and Samanvaya definitions — each with its accuracy stated |
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
- **Vimśopaka** follows BPHS Ch. 7 vv. 21–25 (ṣoḍaśavarga weights, the Varga Viśva
  values, the compound relationship with the temporal part counted by rāśi); a
  debilitated placement is scored as a great enemy's 5, since the verse names no value for it
- **Ārūḍha** exception cases follow the rule on the Special Points page; other software differs
- **Śayanādi** avasthās are omitted — they need the person's name-syllable
- **Piṇḍa** multipliers and Ekādhipatya rules are the commonly cited set; editions vary

### Not implemented, deliberately

Every daśā of BPHS Ch. 46 is computed by the rule its verse states, except these, and
the page and the JSON say why: Śūla daśā (vv. 181–182) is given for the time of death;
Piṇḍa, Aṃśa, Naisargika and Aṣṭakavarga daśās (vv. 201–203) take their spans from the
longevity figures; Pañcasvara (vv. 191–194) needs the native's name-syllable and its
letter table did not survive the scan; and Ṣaṣṭi-hāyanī is given with its condition and
lords but no dates, because its nakṣatra table is likewise lost. Where the translation is
ambiguous, the reading taken is stated beside the result, and every worked example in the
book is pinned in `bphs-dasha-verify.mjs` — including the one (Caturaśīti-sama) that
contradicts its own verse. Lineage daśās outside BPHS (Nārāyaṇa, Niryāṇa Śūla) and KP
sub-lords are absent: different systems, not BPHS ones.

Longevity and Maraka timing are computable and deliberately excluded from the tool.
The Avasthas & Longevity page teaches the method academically; the report does not
output a lifespan, under either paddhati — Śrīpati's own daśā system is left out for
the same reason, since it needs a computed lifespan to run.

In Varṣaphala, the Tājika yogas beyond Itthaśāla and Īśarāpha and the sahams beyond
Raman's ten are not computed — no legible source for their rules was available — and the
JSON lists them as not computed rather than leaving them silently absent.

---

## City search

Bundled and offline: 44,426 places from GeoNames (CC BY 4.0) — 34,006 worldwide towns
plus 10,420 Indian localities from the postal set, giving roughly 15 km average spacing
across India. Historical spellings resolve (Bombay, Calcutta, Madras, Bangalore, Poona,
Benares, Trivandrum). Selecting a city sets the coordinates and the **UTC offset that
applied on the birth date**, including historical daylight saving.

The place list loads lazily on the first search and is then cached. Served over
`http(s)` it is read as `cities.json`; opened straight from disk, where a browser will not
fetch a file, the same rows load from `cities.js` instead — so search works offline either way.

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
- `varshaphala-verify.mjs`, `tajika-verify.mjs` — the analyst JSON's Varṣaphala against
  the report pane and against independent recomputation, and the Tājika strengths against
  Raman's legible text, under both paddhatis
- `bphs-dasha-verify.mjs` — every daśā of BPHS Ch. 46 against the book's own worked examples
- `yuddha-bala-verify.mjs`, `vimsopaka-verify.mjs`, `timescale-verify.mjs`,
  `sweep-verify.mjs` — planetary war, Vimśopaka, ΔT and sidereal time against independent
  formulas, and every birth-time boundary within ±15 minutes against full recasts

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
