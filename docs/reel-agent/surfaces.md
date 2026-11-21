# Reel Agent — surfaces

Every animating surface and its `window.__bridge` status. The contract test reads
the **Status** column: a surface marked `done` must answer all seven methods and
render deterministically.

Status values: `planned` · `in progress` · `done` · `blocked`.

| Surface | Page | Drawing | Existing hooks | Script source for `beats()` | Phase | Status |
|---|---|---|---|---|---|---|
| Reel Studio | `reel.html` | canvas 2D (`sp-reel`, `sp-reelui`) | `window.__reel` (choose, ready, reel, at(p), keys, palette, size, place); `window.SPScript` | `SPScript.render(reel, lang)` — hi / hinglish / en; festival reels in Hindi from `ra-hi.js` | 2 | done |
| Studio (ideas, not an animation) | `studio.html` | — | `__stIdeas`, `__stIdeasFor`, `__stDay`, `__stCaption` | maps an idea to a Reel Studio layout | 4 | planned |
| Director Pro | `director-pro.html` | canvas (`sp-director`, `sp-dirui`) | none yet — needs a `frameAt(p)` export from the scene player | its own keyframe timeline | 5 | planned |
| Studio Pro | `studio-pro.html` | canvas (`sp-workstation`) | none yet — needs a `frameAt(p)` export | its own event timeline | 5 | planned |
| Motion | `motion.html` | canvas 2D; records with MediaRecorder today | none yet — its draw loop is wall-clock driven and needs a seek(p) | ingress / station / tithi events | 5 | planned |
| Kinetic Workstation | `kinetic-workstation.html` | canvas 2D; records with MediaRecorder today | none yet — wall-clock driven, needs a seek(p) | its own event timeline | 5 | planned |
| Casting ceremony | `ceremony.html` | SVG (`ceremony-record.js` → `SvgFilm`) | `SPCosmos.frame().set({p, spin})` exists; needs an async frame path in the encoder (SVG is photographed, not drawn) | the ceremony's own stages | 5 | planned |
| Ayanāṃśa film | `ayanamsa.html` | SVG (`SvgFilm`) | `film().at(ms)` is internal; needs a page hook and the async frame path | the film's own stages | 5 | planned |
| Kundli sky scenes | `kundli.html` (report `sky/`) | canvas + SVG | none yet | sky events for the chart (**never sends chart data**; offline only unless the user removes the chart from the facts) | 5 | planned |
| Kahani (cartoon) | inside the panel | canvas + sanitised SVG fragments, `ra-kahani.js` | — | `kahani_scenes` from the agent (Connected mode) | 5 | done |

## Notes per surface

- **Kahani** (done, Phase 5). Built to the brief's description of the kahani kit
  (star-and-diya background, props, camera push-in, entrance/bob/parallax/sway,
  kicker), because the kit itself (`~/kahani-reels/src/kahani/`) was not reachable
  from the session that wrote it. Scenes are sanitised (`ra-sanitize.js`) and drawn
  only as images from blobs. Needs Connected mode: offline there is no story writer.
  **To do when the kit is shared:** replace the drawings with the kit's look; the
  contract, the sanitiser and the tests stay.
- **What the planned surfaces need.** Two kinds of work, neither a rewrite:
  (1) the canvas pages (Director Pro, Studio Pro, Motion, Kinetic Workstation) draw
  from a wall-clock loop and need a pure `frameAt(p)` / `seek(p)` export so a frame
  can be drawn at any p, in any order; (2) the SVG pages (ceremony, ayanāṃśa film)
  already put their drawing into a given state, but photograph it asynchronously, so
  `sp-encode` needs an optional async `drawAt` and `ra-render` an async compose.
  Their own Record buttons keep working as they do now in either case.

- **Reel Studio** (done, Phase 2). The adapter builds its own reel with
  `SPStories.build` and draws with `SPReel.frameAt(…, { text: false })` — a new,
  optional argument that leaves out the reel's own English type so the Hindi
  title and captions go into the same bands. Called without it, every existing
  caller gets the same frame as before. Pure Hindi narration exists for the
  nakṣatra, rāśi, bhāva and framework sets (SPScript) and for the nine festival
  "why the date moves" reels (`ra-hi.js`). Eclipses, threads, the hiding, going
  backwards, two engines, what-if, cycles and the festival "month" reels still
  narrate in English when Hindi is asked for; the panel says so on the result.
  Some stage art carries English labels inside the picture (star names, "33 of
  49 in this stretch fall inside"); those are part of the drawing, not the
  caption layer, and are left as they are.

- **Kundli sky scenes** are the only surface that sits beside a person's chart. In
  Connected mode their facts are limited to the sky event itself (ingress date, graha,
  sign); the adapter never exposes the birth data or chart-derived houses, and the
  privacy test runs with a chart loaded to prove it.
- **Motion, Kinetic Workstation, ceremony**: their own record buttons keep working as
  they do now. Reel Agent drives `frame(p)` instead of their MediaRecorder path.
