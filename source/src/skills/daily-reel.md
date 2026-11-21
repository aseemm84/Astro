---
name: daily-reel
title: Today's reel / आज की रील
tools: get_today, list_layouts, get_facts, write_script, verify_script, finish
includes: hindi-voice-style, astro-reel
---

# Daily reel

Make one reel for today from the Studio's ideas.

## Steps
1. Call `get_today` with today's date and the place. It returns the Studio's ideas,
   each with a suggested layout and a reason.
2. Choose **one** idea. Prefer, in order: something that happens **today** (an
   ingress, a station, a tithi that names a festival, an eclipse) → something this
   week → a teaching layout that matches today's nakṣatra or tithi.
3. Continue exactly as in **astro-reel** from `get_facts` onwards.
4. The hook says why today ("आज चंद्रमा रोहिणी में है —"), but only if the facts say
   so; otherwise open with the layout's own question.

## Never
Nothing is posted. The reel is saved on this device for the reader to review.
