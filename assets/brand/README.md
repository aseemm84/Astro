# Nirayana — brand assets

Source images for the rename from LearnHoro to Nirayana (निरयन). Generated with
Gemini, kept here as the masters. Nothing in the site references them yet.

| File | Use |
|---|---|
| `nirayana-logo-horizontal.jpg` | Masthead lockup, emblem left of the wordmark, navy ground |
| `nirayana-stacked-navy.jpg` | Square lockup, emblem above the wordmark — phone masthead, social card |
| `nirayana-horizontal-light.jpg` | For white pages and print: rings and wordmark in navy, gold kept only as the offset arc and the sun |
| `nirayana-icon-navy.jpg` | Square emblem, no wordmark — superseded, see note below |

The emblem is a ticked gold ring inside a broken slate ring, with a bright pale-gold
arc at the upper right. That arc is the ayanāṃśa — the offset between the tropical and
sidereal zero points — which is what the name means. It is the element that must
survive at every size.

## Still to derive (no new generation needed)

- **App icon** — crop the emblem from the stacked lockup (910px diameter there) and pad
  to ~16% inset. The existing `nirayana-icon-navy.jpg` is inset only 6.9%, so the slate
  ring clips once a platform rounds the corners, and it uses a stylised vector sun
  rather than the photographic one used everywhere else.
- **Transparent PNG** — cut from the horizontal navy master. JPEG cannot carry alpha, so
  no generated file can supply this.
- **16px favicon** — must be drawn as SVG. Every raster version is an indistinct blob at
  tab size; at 16px the mark needs to reduce to one ring plus the arc.

## Colour

Brand navy `#1d2340`, gold `#c9a24b`, pale gold `#e7d19a`.

The three navy files currently carry three different backgrounds — `#111427`,
`#1F233E` and `#20243F` — none of them the CSS value. Normalise to `#1d2340` when
these are wired in.

Gold measures 2.3:1 against white, so gold linework must never sit on a light ground.
That is why the light lockup inverts the rings and wordmark to navy.
