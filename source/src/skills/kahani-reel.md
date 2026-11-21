---
name: kahani-reel
title: Animated story reel / कहानी रील
tools: get_facts, kahani_scenes, write_script, verify_script, finish
includes: hindi-voice-style
---

# Kahani reel

A short animated cartoon story — a nakṣatra legend, a festival story, a myth about a
graha — told in Hindi over simple SVG scenes.

## Steps
1. If the topic is a Jyotiṣa object (a nakṣatra, rāśi, graha, festival), call
   `get_facts` **first** with the matching layout, so the story's astronomy — the
   nakṣatra's degrees, its star, the festival's rule — comes from the engine.
2. Plan 4–7 scenes. Call `kahani_scenes` with one entry per scene:
   - `svg`: one SVG **fragment** (no `<svg>` wrapper) drawn in a 1080×1920 space, using
     only shapes, paths, gradients and text. Bold, flat, warm colours; large shapes.
     No scripts, no links, no images, no `foreignObject`, no external references.
   - `props`: any of `moon`, `mountains`, `cloud`, `tree`, `diya`, `stars`.
   - `motion`: `{ entrance: "fade"|"rise"|"zoom", bob: 0–1, parallax: 0–1, sway: 0–1 }`.
   - `seconds`: 4–10.
   - `kicker`: ≤ 3 words for the top band.
3. `write_script` with one line per scene (`beats: [i, i]`), then `verify_script`, then
   `finish`.

## Story rules
- Mythology is **story**: "कथा है कि…", "पुराणों में कहा गया है…". Never present it as
  history or as astronomy.
- When the story touches the sky, the sky part comes from the facts and is said
  plainly as observation ("रोहिणी का तारा Aldebaran, 48.90° पर").
- Gentle, family-friendly, no fear, no curse, no prediction.
