# Nirayana — brand assets

## What the build uses

| File | Where it appears |
|---|---|
| `mark.svg` | The masthead on every page. Referenced, not inlined — see below. |
| `icon-180.png` | `apple-touch-icon`, for a home-screen shortcut on iOS |
| `icon-192.png`, `icon-512.png` | Android / PWA sizes, available if a manifest is ever added |
| `../og-nirayana.png` | The 1200×630 social card named in the Open Graph tags |
| `favicon.svg` | Reference copy of the reduced mark. The shipped favicon is the same
  artwork as a data URI in `src/pages/_head.frag`, so a local copy makes no request. |

`sun-source.png` is the sun with its alpha channel, extracted from the master
below. `mark.svg` embeds it; keep it if the mark is ever regenerated.

## Why the mark is referenced rather than inlined

It carries the photographic sun, so it is about 108 KB. Inlined into all
nineteen pages that would be nine times the weight of the base64 JPEG it
replaced. As a file it is fetched once and cached across the site, and `<img
src>` is not subject to the restriction that blocks `fetch()` on `file://`, so
an offline copy still shows it with no server.

Nothing draws it into a canvas. The motion watermark and the print cover each
carry their own copy of the *reduced* mark as a small inline SVG, because an
`<img>` pointing at an SVG file taints a canvas over `file://`, which would
break "save this frame".

## The reduced mark

At 32px the two rings merge and at 16px the full emblem is an indistinct blob,
so the favicon, the motion watermark and the print cover use a simplified
version: one gold ring, a solid disc for the sun, the pale offset arc, and four
ticks. It reads at 16px. It is six shapes, duplicated in three places on
purpose — each needs to be self-contained.

## Geometry

Measured off the master by radial and angular profiling, in a 512 viewBox:

- gold ring r=174, stroke 10.5; eight ticks at exactly 45°, from r=152 to r=180
- slate ring r=232, stroke 17, broken between −48° and +3°
- pale arc r=232, stroke 21, spanning −45° to 0° — this is the ayanāṃśa, the
  offset between the tropical and the sidereal zero point, and the whole reason
  the name is *Nirayana*. It must survive at every size.

## Colour

Navy `#1d2340`, gold `#c9a24b`, pale gold `#e7d19a`, slate `#46496c`.

Gold measures 2.3:1 against white, so gold linework must never sit on a light
ground. On light backgrounds the rings and the wordmark go navy and gold is kept
for the offset arc alone — that is what `nirayana-horizontal-light.jpg` shows.

## Masters

`nirayana-logo-horizontal.jpg`, `nirayana-stacked-navy.jpg`,
`nirayana-horizontal-light.jpg` and `nirayana-icon-navy.jpg` are the originals
everything else was derived from. They carry three different navy backgrounds,
none of them `#1d2340`; the derived assets are normalised.

## Renaming

The name lives in `source/build.py` under `BRAND`. Sources reach it through
`{{BRAND}}`, `{{BRAND_DEVA}}`, `{{BRAND_SLUG}}`, `{{TAGLINE}}` and `{{GLOSS}}`.
Four strings that look like branding are identifiers and must not be renamed;
`BRAND` says which and why, and each carries a comment at its own site.
