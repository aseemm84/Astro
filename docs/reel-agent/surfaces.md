# Reel Agent — surfaces

Every animating surface and its `window.__bridge` status. The contract test reads
the **Status** column: a surface marked `done` must answer all seven methods and
render deterministically.

Status values: `planned` · `in progress` · `done` · `blocked`.

| Surface | Page | Drawing | Existing hooks | Script source for `beats()` | Phase | Status |
|---|---|---|---|---|---|---|
| Reel Studio | `reel.html` | canvas 2D (`sp-reel`, `sp-reelui`) | `window.__reel` (choose, ready, reel, at(p), keys, palette, size, place); `window.SPScript` | `SPScript.render(reel, lang)` — hi / hinglish / en; festival reels in Hindi from `ra-hi.js` | 2 | done |
| Studio (ideas, not an animation) | `studio.html` | — | `__stIdeas`, `__stIdeasFor`, `__stDay`, `__stCaption` | maps an idea to a Reel Studio layout (`ra-studio.js`: "Make today's reel" on each idea card) | 4 | done |
| Director Pro | `director-pro.html` | canvas (`dp-render`) | `window.__dp` (doc, ctx, total) → `DPRender.renderTo(cv, w, h, doc, ctx, t)` | each scene's own text and band layers (tokens expanded); a scene with none is narrated from its view layers' node values | 5 | done |
| Studio Pro | `studio-pro.html` | canvas (`sp-compose`) | `window.__spUI.reelSpec()` (read-only: selection, pinned view, length, storyboard) → `SPStage.frameAt` on the agent's canvas | one line per selected node: its label and resolved value, in the shot it belongs to | 5 | done |
| Motion | `motion.html` | canvas 2D | `window.__moRA` (report module `69-motion-reelagent.js`): draw(p), info(p), the recorder's own pacing schedule | the scene's title and span, then the date and sub-line the scene itself prints at each sampled playhead | 5 | done |
| Kinetic Workstation | `kinetic-workstation.html` | SVG diamonds, photographed once (`SvgFilm.snapshot`) | `SPWorkstation.reel()` (read-only: the two diamonds' markup, the lagna, which grahas change house) | lagna; whole-sign; Śrīpati chalita; which grahas move — **personal: on-device only** | 5 | done |
| Casting ceremony | `ceremony.html` | SVG, photographed per frame | `SPCosmos.frame()` set / read / pause / svg; async `drawAt` in `sp-encode` | the moment, the ring, the time — **personal when wound to the stored birth moment** | 5 | done |
| Ayanāṃśa film | `ayanamsa.html` | SVG, photographed per frame | `window.__ayFilm` (svg, at(year), value, paint, done) | the selected ayanāṃśa at 501 BCE, 2000 CE and 3500 CE, and the years per degree between — all from the page's own `ayanAt` | 5 | done |
| Kundli sky scenes | `motion.html` (the scenes in `MO_NEEDS_CHART`, with a chart stored) | canvas 2D | the Motion adapter | as Motion — **personal: on-device only** | 5 | done |
| Kahani (cartoon) and Nirayana story | inside the panel | canvas, the kahani kit ported (`ra-kahani.js`), sanitised SVG fragments | — | `kahani_scenes` and `get_sky` from the agent (Connected mode) | 5 | done |

## Notes per surface

- **Kahani** (done, Phase 5; **ported from the kit** on 22 Nov 2026, from
  github.com/aseemm84/kahani-reels `src/kahani/`). `ra-kahani.js` is the kit's
  Remotion components on one canvas, frame for frame: `theme.ts` palette;
  `Background` (70 seeded twinkling stars, hills, seven bobbing diyas, vignette);
  `Camera` (1 → 1.08 push-in about 50 %/45 %); `KahaniReel` timing (line + 0.35 s,
  9-frame crossfades); `Kicker` (monospace kicker, title with a gold box); the
  `Caption` pill (navy, 800 weight, 58 px, `*gold*` key word — drawn by the renderer
  from `describe().pill`); `Props` (Moon, Mountains, Cloud, Tree); and the eight
  `astro/` layouts of the nirayana-story skill (ZodiacWheel, NakshatraArc, MoonPhase,
  InfoCards, Timeline, BigStat, GrahaOrb, RetroLoop), with Remotion's `spring()`
  solved in closed form. Differences, on purpose: character art is a sanitised SVG
  fragment rasterised once (a page cannot compile per-story React, and must never
  run model-written code); every number a layout shows is checked against the facts
  like the narration (the kit's `verify_numbers.py`, applied to the picture);
  BigStat's count stops at its value (the kit's spring overshoot would show 121 for
  120). `get_sky` gives the grahas, Moon phase and next 30 days of events from the
  page's almanac engine, as `bridge.mjs data sky/events` does. Skills: `kahani-reel`
  (kit style guide and frame zones) and `nirayana-story` (new). Needs Connected mode:
  offline there is no story writer.
- **The other surfaces** (done, `ra-surfaces.js`). Each page publishes a small
  read-only handle and the adapter points the page's own renderer at the agent's
  canvas: nothing is drawn twice. The SVG pages are photographed per frame, so
  `sp-encode` accepts a `drawAt` that returns a promise and `ra-render` composes
  through it; a plain return keeps the old synchronous path exactly as it was.
  The ceremony and the ayanāṃśa page are borrowed for the render and put back
  afterwards (`release`). Every page's own Record button is unchanged.
- **Personal surfaces.** The Workstation's kuṇḍalī, a Motion scene that needs the
  chart, the ceremony at the stored birth moment, and a Studio/Director selection
  whose nodes read the chart say `personal: true`. While their panel is open
  `RA.net.hold()` keeps the gate shut — no agent, no cloud voice, no model list —
  even with Connected mode switched on, and the panel says so.
- **Not done:** the native share sheet (needs `objc2-app-kit` on macOS and
  `windows-collections` on Windows as direct dependencies — both already in
  `Cargo.lock` through Tauri and `windows`, but a new line in `Cargo.toml` waits
  for approval); in the app "Share" saves and shows the file in its folder.

- **Reel Studio** (done, Phase 2). The adapter builds its own reel with
  `SPStories.build` and draws with `SPReel.frameAt(…, { text: false })` — a new,
  optional argument that leaves out the reel's own English type so the Hindi
  title and captions go into the same bands. Called without it, every existing
  caller gets the same frame as before. Pure Hindi narration exists for the
  nakṣatra, rāśi, bhāva and framework sets (SPScript) and for the nine festival
  "why the date moves" reels (`ra-hi.js`). Eclipses, threads, the hiding, going
  backwards, two engines, what-if, cycles and the festival "month" reels narrate
  in Hindi through `RA.hi.line`: the engine's English sentences come in a small
  number of shapes, each translated as a pattern that carries the grahas, rāśis
  and numbers across, and a translation whose numbers differ from the engine's
  sentence is refused (the line stays English and is marked). The framework
  concept reels (14) are authored teaching prose and still narrate in English.
  Some stage art carries English labels inside the picture (star names, "33 of
  49 in this stretch fall inside"); those are part of the drawing, not the
  caption layer, and are left as they are.

- **Kundli sky scenes** are the only surface that sits beside a person's chart. In
  Connected mode their facts are limited to the sky event itself (ingress date, graha,
  sign); the adapter never exposes the birth data or chart-derived houses, and the
  privacy test runs with a chart loaded to prove it.
- **Motion, Kinetic Workstation, ceremony**: their own record buttons keep working as
  they do now. Reel Agent drives `frame(p)` instead of their MediaRecorder path.
