---
name: nirayana-story
title: Nirayana story — engine data, own layout / निरायण कहानी
tools: get_sky, get_facts, list_layouts, kahani_scenes, write_script, verify_script, finish
includes: hindi-voice-style
---

# Nirayana story reel — engine data, own layout, own story

Three rules: **every number comes from the engine**, **every scene is designed for this
story**, **the story has an arc** (not a list of facts). This is the kahani kit's
nirayana-story skill, made inside the page.

## 1. Get the data
- `get_sky(date, time)` — the nine grahas (sidereal longitude, rāśi, nakṣatra, pāda,
  retrograde), the Moon's phase (illumination, elongation, tithi) and the next 30 days
  of ingresses, stations and new/full moons, at the saved place.
- `get_facts(layout)` — one Reel Studio layout's facts, for a nakṣatra, rāśi, festival
  or cycle (use `list_layouts` to find it).
Pull what the topic needs and read it fully. Tradition fields (deity, gaṇa, yoni, nāḍī)
are framed as tradition ("परम्परा के अनुसार…"), never as Parāśara.

## 2. Design the story (round(length / 6) scenes)
1. **Hook** (≤ 3 s): a question or surprise built on one real number.
2. **Setup**: where we are in the sky (wheel, arc, card).
3. **Turn**: the key fact, shown big (stat, highlight, timeline).
4. **Meaning**: what the tradition says, or the legend — clearly as story, no predictions.
5. **Payoff + CTA**: a one-line takeaway; "ऐसी और जानकारी के लिए फ़ॉलो करें".
Vary layouts — never the same layout twice in a row.

## 3. Scenes → `kahani_scenes`
Same call as the kahani reel (title, kicker, say, caption, seconds, props, motion), with
a `layout` per scene. Copy values from the data exactly — the page refuses a layout
whose numbers are not in the facts:
- `{ "type": "wheel", "grahas": [ {graha, lon, retro} … from get_sky ], "highlightRashi": 1–12, "highlightArc": [a, b] }`
  — grahas fly in to their real longitudes on the rāśi chakra with the 27-nakṣatra ring.
- `{ "type": "nakshatra", "name": "रोहिणी", "start": 40, "end": 53.33, "padas": [{ "pada": 1, "navamsha": { "hi": "धनु" } }, …], "star": { "name": "Aldebaran", "lon": 49.8 }, "activePada": 1 }`
- `{ "type": "moon", "illumination": 0.16, "elongation": 48, "label": "शुक्ल चतुर्थी", "sub": "…" }`
- `{ "type": "cards", "title": "…", "rows": [{ "label": "तिथि", "value": "…" }], "highlight": 0 }` (up to 6 rows)
- `{ "type": "timeline", "items": [{ "date": "11 दिसम्बर", "text": "शनि मार्गी", "graha": "Saturn" }] }` (up to 5)
- `{ "type": "stat", "value": 19, "suffix": " वर्ष", "label": "शनि महादशा" }`
- `{ "type": "orb", "graha": "Saturn", "retro": true, "label": "शनि" }`
- `{ "type": "retro", "graha": "Mars" }` — the apparent retrograde loop.
Grahas are named in English keys (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu,
Ketu). Keep content inside y 330–1450.

## 4. Script
`write_script` with one line per scene (`beats: [i, i]`). **Write numbers as digits**
("16 अंश"); dates naturally ("11 दिसम्बर"); times as "सुबह 5 बजकर 23 मिनट". Then
`verify_script` until it returns ok, then `finish` with 2–3 Hindi caption lines and
hashtags #ज्योतिष #Jyotish #VedicAstrology #Nirayana plus topic tags.

## Never
- A number that is not in the data.
- A prediction about any person, a remedy, or fear ("शनि का प्रकोप").
- Sade Sati or any later-tradition idea presented as BPHS.
