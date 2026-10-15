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
Bhāva Sripati (Porphyry cusps with bhāva spaṣṭa) · Ārūḍha Lagna · Kārakāṃśa in both
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
chart · muhūrta day tools (Rāhu kālam, Yamaganda, Gulika kālam, choghaḍiyā)

**Context** — birth particulars with full time reductions · birth pañcāṅga ·
Avakhaḍa chakra · Bhayāta/Bhabhoga · the three friendship chakras · kārakas ·
ārūḍhas · yogas · current transits

Each section carries a plain-language **study note** composed from the site's own
rules, linking back to the reference page the rule came from. A brief/detailed toggle
controls depth. Print to PDF, download the JSON, or copy it.

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

- **Dṛk Bala** uses the graded whole-sign glance, not the exact Virupa-by-angle formula
- **Nathonnatha** is measured from clock noon, not local apparent noon
- **Vimśopaka** is a transparent weighted index, not the canonical scheme
- **Ārūḍha** exception cases follow the rule on the Special Points page; other software differs
- **Śayanādi** avasthās are omitted — they need the person's name-syllable
- **Piṇḍa** multipliers and Ekādhipatya rules are the commonly cited set; editions vary

### Not implemented, deliberately

The rāśi-daśā family — Kālachakra, Chara/Narayana, Sthira, Niryāṇa Śūla, Dṛg,
Navāṃśa, Lagna-Kendrādi — genuinely differs between lineages. Rather than present one
variant as authoritative, they are left out and the Dashas page explains the
disagreement. KP sub-lords are absent for the same reason: a different system, not a
BPHS one.

Longevity and Maraka timing are computable and deliberately excluded from the tool.
The Avasthas & Longevity page teaches the method academically; the report does not
output a lifespan.

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

A plain static site — no build step, no dependencies, no server code.

```bash
git clone https://github.com/aseemm84/Astro.git
cd Astro
python3 -m http.server 8000     # open http://localhost:8000
```

Every page is a single self-contained HTML file with CSS and JavaScript inlined.
Deployment is GitHub Pages from the repository root.

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

- **Primary source** — *Bṛhat Parāśara Horā Śāstra*, R. Santhanam translation
- **Ephemeris** — [astronomy-engine](https://github.com/cosinekitty/astronomy) by Don Cross (MIT)
- **Place data** — [GeoNames](https://www.geonames.org/) (CC BY 4.0)
- **Star data** — the [HYG database](https://github.com/astronexus/HYG-Database) (CC BY-SA 4.0)
- **Validation references** — Swiss Ephemeris; Parashara's Light 9.0
