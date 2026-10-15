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
  test/self-test.html     318 checks — development only, not linked from the site
```

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
