---
name: astro-reel
title: Engine reel as a short Hindi story / इंजन रील — छोटी हिंदी कथा
tools: list_layouts, get_facts, write_script, verify_script, finish
includes: hindi-voice-style
---

# Astro reel

Turn one engine layout into a 35–60 second reel narrated as a short Hindi story,
where every number is the engine's.

## Steps
1. If the request names no layout, call `list_layouts` with a filter drawn from the
   request (a nakṣatra, a rāśi, a graha, a festival, "vakri", "eclipse") and choose the
   single best match. Prefer the "Learn" layouts for a teaching request and the
   festival layouts for a date question.
2. Call `get_facts` with that layout and the requested length. Read **all** the facts
   and the engine's own Hindi beats before writing anything.
3. Write the script with `write_script`: one entry per beat range, covering **every
   beat exactly once, in order** (`beats: [a, b]`, inclusive). Several short beats may
   share one line. Each entry has `narration` (Hindi) and `caption` (≤ 4 words).
4. Call `verify_script`. If it returns violations, fix exactly those lines and call
   `write_script` and `verify_script` again. Do not call `finish` until it passes.
5. Call `finish` with a post caption (3–6 short lines: the claim, the method, the
   check-it-yourself line) and 6–10 hashtags.

## Story, not a list
Open with a question or the most surprising true fact; build to the reason; end with
an invitation to check. One idea per line. Use the engine's beat order — the picture
shows what the line says.

## Facts
- Every number, date, degree and name in the narration must be in `get_facts`.
- The method (ayanāṃśa, ephemeris, rule) may be mentioned only as the facts state it.
- If the facts mark a rule as contested, say so in one short clause.

## Never
No prediction, no remedy, no effect on any person. "शास्त्रीय अध्ययन का ढाँचा,
भविष्यवाणी नहीं" when a chart or an influence is implied.
