---
name: kahani-reel
title: Animated story reel / कहानी रील
tools: get_facts, get_sky, kahani_scenes, write_script, verify_script, finish
includes: hindi-voice-style
---

# Kahani reel

A short animated cartoon story — a nakṣatra legend, a festival story, a myth about a
graha — told in pure Hindi over storybook scenes. The look is the kahani kit's
(github.com/aseemm84/kahani-reels): night-blue sky with twinkling stars, soft hills, a
row of glowing diyas, a slow push-in on every scene, a gold-highlighted title and navy
caption pills. The page draws all of that; you supply the scenes.

## Steps
1. **Jyotiṣa topics** (a nakṣatra, rāśi, graha, festival): call `get_facts` **first**
   with the matching layout (e.g. `learn.nakshatra.4` for Rohiṇī), and treat it as the
   factual base — lord, deity, degrees, rāśi, daśā years must match it exactly. The
   legend itself (Candra and his 27 wives, Rohiṇī his favourite) is traditional story:
   keep it respectful and faithful.
2. **Plan** round(length / 6) scenes of 4–7 s. Scene 1 is a hook in under 3 s (a question
   or a surprising line). The last scene is the payoff with a soft CTA
   ("ऐसी और कहानियों के लिए फ़ॉलो करें").
3. Call `kahani_scenes` with `title` (2–4 words, one `*highlighted*` word),
   `kicker` (e.g. "निरायण · नक्षत्र कथा") and one entry per scene:
   - `say`: the line (≈ 2.3 spoken words per second).
   - `caption`: 2–5 words in the narration's script, ONE word in `*stars*`.
   - `seconds`: 4–7.
   - `svg`: the character art as one SVG **fragment** (no `<svg>` wrapper) in a
     1080×1920 space — flat vector storybook art, big head (about ⅓ of the height),
     simple shapes, expressive eyes, 3–4 flat colours plus a highlight; no outline
     thicker than 4 px; no gradients except glows. Build each character the same way
     in every scene so it looks identical. Only shapes, paths, gradients and text: no
     scripts, links, images, `foreignObject` or external references.
   - `props`: any of `moon`, `mountains`, `cloud`, `tree`, either by name or as
     `{ "p": "cloud", "x": 300, "y": 380, "s": 0.8 }`.
   - `motion`: `{ entrance: "rise"|"fade"|"zoom"|"none", bob: 0–1, parallax: 0–1, sway: 0–1 }`
     — every scene needs an entrance and one ambient loop (bob or sway, or drifting
     clouds).
   - `layout` (optional, for the sky part of a story): see the nirayana-story skill.
4. `write_script` with one line per scene (`beats: [i, i]`) — the scene's `say` and
   `caption` — then `verify_script`, then `finish`.

## Frame zones (1080×1920)
- 0–330: title and kicker (the page draws them) — keep empty.
- 330–1450: the action. Hero centred around y ≈ 850–1000, 450–700 px tall.
- 1450–1620: caption pill (the page draws it) — keep faces and text out.
- 1700–1920: the diya row (the page draws it).

## Palette (use only these)
sky #0b1a4a → #1d3f9a · ink #0a1230 · gold #ffc83d · deep gold #f29d12 ·
saffron #ff7a1a · cream #fff4dc · leaf #3fae6a / #21734a · mountain #2a4fb8 / #1a3380 ·
cloud #e9eefc · white.

## Story rules
- Mythology is **story**: "कथा है कि…", "पुराणों में कहा गया है…". Never present it as
  history or as astronomy.
- When the story touches the sky, the sky part comes from the facts and is said
  plainly as observation ("रोहिणी का तारा Aldebaran, 48.90° पर").
- Gentle, family-friendly, no fear, no curse, no prediction.
