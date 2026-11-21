# Reel Agent — plan

*Draft for approval, 21 Nov 2026. Nothing below is built yet. Phase 1 is this
document, `surfaces.md` beside it, and the README privacy wording in §9.*

Reel creation becomes a native feature of Nirayana — website and desktop app —
with the agent, the skills, the voice, the composition and the export all in the
page. No terminal, no separate tool, no backend. Nothing is ever posted.

---

## 0. What I found in the repository that shapes the plan

| Finding | Consequence |
|---|---|
| `src-tauri/capabilities/default.json` says the app has "no capability to reach the network or the disk … which is what makes the site's claim structural rather than a promise". `main.rs` has no http, shell, fs or dialog plugin. | Connected mode and Save/Share **end that structural claim** for the desktop binary. §8 proposes how to keep it as strong as possible (Rust-only networking to three hard-coded hosts, the webview still offline) and the README must say so honestly (§9). |
| The **website has no Content-Security-Policy at all** (no `<meta http-equiv>` in any built page). Its "sends nothing" is a property of the code, not of a policy. | "Widen the CSP" has nothing to widen on the web. I propose instead to **add** a CSP to the Reel Agent surfaces that is *tighter* than today (§9.3). That changes existing pages, so it needs your OK. |
| A `<meta>` CSP **cannot be widened at runtime**: once parsed, a page can only add stricter policies. | "Widen only when Connected mode is on" is not achievable with a meta CSP. On the web the two AI hosts are either in the page's policy or not. §9.3 gives the options. |
| The app's Tauri CSP already restricts `connect-src` to `'self'`, data, blob and asset. | If all AI and TTS calls go through Rust (`reqwest`), **the app's CSP does not change at all**. The webview keeps having no route to the network. |
| `sp-encode.js` already writes WebCodecs + vendored `mp4-muxer` with frames stamped n/fps, probes codecs, and has the audio path wired. | `ra-render` reuses it. No new JS dependency needed for encoding. |
| The headless Chromium the gate runs on (Linux) **has neither H.264 nor AAC** — `sp-encode` falls back to VP9 + Opus WebM there. | The "AAC stream present" test cannot pass on the Linux gate. Proposal in §11: the Linux gate checks the Opus path and duration; the **macOS CI job** runs the H.264 + AAC assertions. |
| `window.__reel` (Reel Studio) already exposes `choose / ready / reel / at(p) / keys / palette / size / place`, and `window.SPScript` gives `render(reel, lang)` → beats with `need` seconds, in `hi / hinglish / en`. | The Reel Studio adapter is mostly a wrapper. `facts()` needs new work: the reel object carries the numbers, but not as a flat citable list. |
| `sp-voice.js` decodes an uploaded file into an AudioBuffer and rejects CAF by name. | The `upload` voice provider wraps it unchanged. |
| `svg-film.js` (`window.SvgFilm`) photographs a live SVG per frame (ceremony, ayanāṃśa film). | SVG surfaces get `frame(p)` through it. Tens of ms a frame, so those reels render slower; the panel will say so. |
| Motion, Kinetic Workstation and the ceremony still record with **MediaRecorder** (wall-clock timing — the bug `sp-encode` was written to fix). | Their adapters must drive `frame(p)` deterministically, not their existing recorders. Their own record buttons stay as they are unless you ask. |
| `studio.js` exposes `__stIdeas / __stIdeasFor / __stDay / __stCaption`. | `get_today` and "Make today's reel" read these; no change to Studio's logic. |
| Your kahani kit is at `~/kahani-reels/src/kahani/` **on your Mac**. This session is not linked to it and there is no GitHub repo of that name. | **Blocking for Phase 5 only.** Push it to a (private) repo or attach the folder, and I port from the real code instead of from a description. |

---

## 1. Shape of the feature

```
            ┌──────────── any animated page ────────────┐
 user  ───▶ │ "Make reel / रील बनाएँ"  →  RA panel       │
            │ reel-agent.html (free text)                │
            │ studio.html  "Make today's reel"           │
            └───────────────┬────────────────────────────┘
                            ▼
   ra-agent.js  (Connected)      or     offline pipeline (default)
   tool loop: list_layouts, get_facts,   SPScript beats → lines
   get_today, write_script,
   verify_script, kahani_scenes, finish
                            ▼
   ra-verify.js   — every number/date/degree must be in facts(); beat coverage; caption ≤4 words; fit ≤4× stretch
                            ▼
   ra-voice.js    — system (desktop) | gemini-tts | elevenlabs | upload | silent   → one clip per line, cached
                            ▼
   ra-render.js   — piecewise time map → frame(p) on OffscreenCanvas + captions + hook/end cards
                    → OfflineAudioContext mix (duck −12 dB, −14 LUFS) → sp-encode.js
                    → .mp4 (or .webm where no H.264), .srt, thumb.jpg, caption.txt
                            ▼
   Reels library (IndexedDB) · preview · script editor · Download / Share · Copy caption
```

The agent never touches audio or pixels; the pipeline is identical in both modes.
Offline mode simply replaces the agent with the engine's own script.

---

## 2. Modules (all in `source/src/js/`, inlined by build.py)

| File | Role | New / reuse |
|---|---|---|
| `ra-adapter.js` | `window.__bridge` contract, registry of surfaces, Reel Studio adapter first | new; wraps `__reel`, `SPScript` |
| `ra-facts.js` | turns a surface's state into a flat list of citable facts (value, unit, label, source) and a normaliser for Devanagari numerals and spoken Hindi number words | new |
| `ra-verify.js` | script checker (§4 of your brief) | new |
| `ra-voice.js` | provider interface, per-line clips, IndexedDB cache keyed by SHA-256(text+voice+provider+model) | new; `upload` wraps `sp-voice.js` |
| `ra-render.js` | time map, compositor, captions, cards, audio mix, loudness, encode, SRT, thumbnail | new; encodes through `sp-encode.js` |
| `ra-loudness.js` | ITU-R BS.1770 K-weighted integrated loudness, written here (no dependency) | new |
| `ra-agent.js` | provider-neutral tool loop, step limit, token/cost meter | new |
| `ra-providers.js` | Anthropic Messages tool use / Gemini function calling request+response shapes; mock provider for tests | new |
| `ra-sanitize.js` | SVG allow-list sanitiser for kahani fragments | new |
| `ra-kahani.js` | vanilla-JS + SVG port of the kahani scene runtime | new (Phase 5, needs your kit) |
| `ra-library.js` | IndexedDB store of finished reels (blobs + metadata + script) | new |
| `ra-panel.js` | the panel UI, progress, preview, editor | new |
| `ra-settings.js` | mode, keys, model, voice, language, music folder, daily reel, custom skills | new |
| `ra-native.js` | thin wrapper over Tauri `invoke` (desktop) with web fallbacks | new |
| `src/skills/*.md`, `pronunciation-hi.json` | skills as data; build.py compiles them into `ra-skills.js` | new |

Naming: every new global is prefixed `RA` / `__ra` to avoid the shared-scope
collisions the dev README warns about.

---

## 3. The adapter contract

Exactly as your brief (`describe / configure / ready / duration / beats / facts / frame`), plus two notes:

- **`facts()` is the source of truth for the verifier.** Each fact is
  `{ id, label_en, label_hi, value, unit, kind: number|degree|date|time|name, source }`.
  Mythology is never a fact.
- **`frame(p, ctx)` must be deterministic.** The contract test renders p = 0.137
  twice and compares pixel hashes; it also renders 0.5 → 0.2 → 0.5 to catch hidden
  state that depends on the order of calls.

Status of every surface is tracked in `surfaces.md`.

---

## 4. Offline mode (default; no key, no network)

1. Surface `configure(spec)`; take `beats(lang)` from `SPScript` (Reel Studio) or
   the surface's own event timeline.
2. Lines = beats, one line per beat (or merged where a beat is under ~1.2 s).
3. Verify (the engine script is fact-derived, so this should always pass; it is
   still run, so a bad template is caught).
4. Voice:
   - **desktop**: OS system voice through Rust `tts_system` → WAV.
     macOS `say -v <voice> -o out.aiff` (or `--data-format=LEI16@24000` to WAV directly),
     Lekha or any installed Hindi voice, listed by `say -v '?'`.
     Windows `Windows.Media.SpeechSynthesis` (Kalpana / Hemant / Swara where installed).
     If no Hindi voice is installed the panel says which voice to install and how.
   - **web**: the uploaded file (existing `sp-voice`) — one file for the whole reel,
     split by silence or used as a single clip — or **silent**.
5. Render (§6).

---

## 5. Connected mode (opt-in; bring your own key)

**Providers and models — read from the provider, not hard-coded.**
When a key is saved, the settings page calls the provider's own model-list
endpoint (Anthropic `GET /v1/models`, Gemini `models.list`) and offers what the key
can use. The defaults, as of the docs read today, are the fastest and cheapest:

| Use | Default | Why |
|---|---|---|
| Claude agent | `claude-haiku-5-5` | Anthropic's fastest current model, from $0.10 / $0.50 per MTok; supports tool use |
| Gemini agent | the current Flash-Lite model the key lists (`gemini-3.5-flash-lite` at time of writing) | cheapest Flash tier with function calling |
| Gemini TTS | the current Flash TTS model the key lists | supports Hindi (hi-IN); returns raw 24 kHz 16-bit PCM |
| ElevenLabs | optional, off by default | needs its own key; one more host |

I will re-read the official model pages at the start of Phase 3 and pin the
fallback strings then; the picker overrides them anyway.

**Before the first call** the panel shows a "What will be sent" sheet: the exact
JSON body (system prompt = skill text, the brief, and the template facts), the
host, the model, and an estimated cost. Nothing about the user's kundli or birth
data is ever in it — the agent's tools read only surface/template state, and
`ra-agent` refuses to build a request if a body contains any kundli/birth field
name (`dob`, `tob`, `lat`, `lon`, `birth`, `jd`, `name` of a chart …). The
privacy test asserts this.

**Keys.** Desktop: OS keychain via Rust `keyring`; the webview never sees the key.
Web: localStorage after an explicit warning ("anyone with access to this browser
profile can read it; use a key with a spending limit"), with a one-click Forget.

**Where calls are made.** Desktop: Rust `ai_request(provider, body)` with the key
injected in Rust, to a **hard-coded allow-list of three hosts**
(`api.anthropic.com`, `generativelanguage.googleapis.com`, `api.elevenlabs.io`).
Web: direct `fetch` (Anthropic with `anthropic-dangerous-direct-browser-access:
true`; Gemini supports CORS).

**Agent loop.** Provider-neutral messages and tools; step limit 12; running token
and cost estimate in the panel; Cancel at any step. `verify_script` failures are
fed back as tool results and the agent must fix them before `finish` is accepted.

---

## 6. Rendering

- **Time map.** Line *i* covers reel time [beat aᵢ.from, beat bᵢ.to]; that span is
  stretched linearly to `clipᵢ + 0.35 s`; a 1.5 s hold ends the reel. Stretch is
  capped at 4×; beyond that the verifier has already failed the line.
- **Frame composition** on an OffscreenCanvas at 1080×1920: surface `frame(p)` →
  caption pill(s) inside `safeZones.caption` with the key word highlighted → optional
  1.2 s hook card → end card with the handle.
- **Audio** in an OfflineAudioContext at 48 kHz: clips on the timeline, music ducked
  ~12 dB under voice (side-chain envelope from the voice track), then integrated
  loudness measured (BS.1770) and gain applied to ≈ −14 LUFS with a −1 dBTP ceiling.
- **Encode** through `sp-encode.js`: 1080×1920, 30 fps, H.264 + AAC in MP4 where the
  browser offers them (Chrome/Edge on macOS and Windows, the desktop app's WebView on
  macOS); otherwise VP9 + Opus WebM, and the panel says which it wrote.
  The finished file's duration is read back and asserted against the plan.
- **Also written:** `.srt`, `thumb.jpg` (densest frame + hook text), `caption.txt`.
- **Chunked** (yield every N frames), with progress and Cancel.
- **No WebCodecs** (older Safari, Firefox on some platforms): the panel says so and
  offers the desktop app. **Mobile web** works but is slower; the panel states the
  expected time from a quick benchmark before starting.

> **Windows desktop note.** WebView2 is Chromium, so WebCodecs and H.264 are
> available. **macOS desktop note.** Tauri uses WKWebView; WebCodecs `VideoEncoder`
> is available in Safari 16.4+ / macOS 13.3+. On macOS 11–13.2 (the app's stated
> minimum is 11.0) the encoder may be absent — Phase 2 will measure this on the CI
> runner and, if needed, add a Rust-side encode fallback (that would need your OK
> for a crate).

---

## 7. Skills

Markdown in `source/src/skills/`, compiled by build.py into `ra-skills.js`:
`astro-reel.md`, `kahani-reel.md`, `daily-reel.md`, `hindi-voice-style.md`,
`pronunciation-hi.json`. Each skill states its rules in a short, checkable list; the
non-negotiables (every number from `facts()`, mythology as story, no predictions,
"शास्त्रीय अध्ययन का ढाँचा, भविष्यवाणी नहीं" where needed) are also **enforced in code**
by `ra-verify`, so a custom skill cannot switch them off.

Settings lets the user read each skill, duplicate it into a custom skill (localStorage
/ app storage), edit it, and pick it per run. The bundled ones are read-only.

The pronunciation lexicon is applied to the text sent to TTS only, never to captions.

---

## 8. Desktop-only native pieces

**Tauri commands** (all in `src-tauri/src/`):

| Command | Notes |
|---|---|
| `keychain_get / set / delete` | `keyring` crate; service `com.aseemm84.nirayana.reel-agent` |
| `ai_request(provider, body)` | `reqwest` (rustls); allow-list of three hosts compiled in; key injected here; 60 s timeout; response size cap |
| `tts_system(text, voice)` / `tts_list_voices()` | macOS: `std::process::Command("say")` (no shell plugin, fixed argv, text passed via a temp file so it is never parsed as arguments). Windows: `Windows.Media.SpeechSynthesis` through the `windows` crate |
| `save_file(bytes, suggestedName)` | native save dialog |
| `share_file(path)` | macOS `NSSharingServicePicker`; Windows `DataTransferManager`. If either is disproportionate in code, I fall back to **Reveal in Finder / Explorer** and tell you |
| `reveal_in_finder(path)` | |

**Daily reel.** Setting "Prepare today's reel at 06:30" (off by default). While the app
runs, a timer fires `daily-reel`; optionally a launch-at-login agent. On success a native
notification "आज की रील तैयार है". Nothing is posted. In offline mode it uses the engine
script and the system voice, so it works with no key.

**Capabilities** stay minimal: only the new commands plus the dialog/notification/autostart
permissions they need.

---

## 9. Privacy — the wording for the README (please approve or edit)

### 9.1 Replace the line under the title

> ~~No server. No API key. No account. No third-party calls. Works offline.~~
>
> **No server. No account. Works offline.** Everything is computed on your machine and
> nothing is sent anywhere — with one exception you have to switch on yourself:
> Reel Agent's optional *Connected mode*, described below.

### 9.2 New section "Privacy" (before "Scope")

> ## Privacy
>
> **By default Nirayana sends nothing anywhere.** Charts, calendars, the reference pages
> and the reel maker all run in your browser or in the desktop app, on your machine. There
> is no server, no account, no analytics and no tracking. You can disconnect from the
> internet and every page keeps working.
>
> **The one exception is Reel Agent's Connected mode, which is off unless you turn it on.**
> It exists because writing a narrated story, choosing a layout from a plain-language
> request, and producing a natural-sounding neural voice need an AI service. If you switch
> it on:
>
> - **You bring your own key** from Anthropic (Claude) or Google (Gemini), and optionally
>   ElevenLabs. Nirayana has no key of its own and no account with these services on your
>   behalf; their terms and their billing apply to you directly.
> - **Only reel material is sent:** the brief you typed and the facts of the animation you
>   chose (for example, "Rohiṇī, the 4th nakṣatra, 40°00′–53°20′ in Vṛṣabha") and, for a
>   neural voice, the narration text. Before the first request the app shows you exactly
>   what will be sent and to which service.
> - **Your birth details and your kundli are never sent** — not in Connected mode, not in
>   any mode. The reel tools cannot read them, and a request containing them is refused
>   before it leaves.
> - **Where your key is kept:** in the desktop app, in your operating system's keychain;
>   on the website, in this browser's local storage, which anyone with access to this
>   browser profile could read. You can remove it at any time.
> - **Who makes the request:** in the desktop app, the request is made by the app itself
>   (not the web page inside it), and only to `api.anthropic.com`,
>   `generativelanguage.googleapis.com` and `api.elevenlabs.io`; no other address can be
>   reached. On the website, your browser contacts the service you chose directly. There
>   is no Nirayana server in between.
> - **Nothing is posted.** Reels are saved on your machine. Publishing one anywhere is
>   always something you do yourself.
>
> Turning Connected mode off stops all of this immediately; offline reels (the engine's
> own script, your system's voice or a voice file you supply) need no network at all.

### 9.3 The CSP question on the website — choose one

| Option | What it means |
|---|---|
| **A (recommended)** | Add a CSP `<meta>` to the pages that host the panel (`reel-agent.html`, `reel.html`, `studio.html`, and the other animated pages as their adapters land) with `connect-src 'self' data: blob: https://api.anthropic.com https://generativelanguage.googleapis.com https://api.elevenlabs.io`. That is **stricter than today** (no CSP at all); the JS gate refuses any call unless Connected mode is on. |
| B | Same, but the AI hosts appear **only on `reel-agent.html`**; the panel on other pages hands off to that page for Connected runs. Every other page gets `connect-src 'self' data: blob:` — a structural no-network guarantee on most of the site, which it does not have today. |
| C | No CSP anywhere (as today); rely on code only. |

Desktop: the Tauri CSP **does not change**, because the webview never talks to the
network — Rust does.

---

## 10. Dependencies I need your OK for

**JavaScript: none.** Encoding uses the vendored muxer; loudness, SRT, sanitiser and
the cache are written here. (If you would rather use DOMPurify for the sanitiser than a
hand-written allow-list, say so — it would be vendored, not fetched.)

**Rust crates (desktop only):**

| Crate | Purpose |
|---|---|
| `keyring` | OS keychain (Keychain on macOS, Credential Manager on Windows) |
| `reqwest` (`rustls-tls`, `json`, no default features) | Rust-side HTTPS for Connected mode |
| `tauri-plugin-dialog` | native save dialog |
| `tauri-plugin-notification` | "आज की रील तैयार है" |
| `tauri-plugin-autostart` | optional launch-at-login for the 06:30 reel |
| `windows` (Windows only, `Media_SpeechSynthesis`, `Storage_Streams`, `ApplicationModel_DataTransfer`) | Windows system TTS and the share sheet |
| `objc2` + `objc2-app-kit` (macOS only) | the share sheet (`NSSharingServicePicker`); skipped if share falls back to Reveal |
| `sha2` | cache keys on the Rust side (optional; JS can use SubtleCrypto instead) |

Plus `tokio` features already pulled in by Tauri; nothing else.

---

## 11. Tests

`source/test/reel-agent-verify.mjs` (Playwright), wired into `run-all.mjs`, with a
**mock AI provider and a mock TTS** (deterministic sine-tone clips of known length):

| Check | How |
|---|---|
| adapter contract | every surface marked **done** in `surfaces.md` answers all seven methods; `frame(p)` pixel-hash is stable and order-independent |
| offline end to end | MP4/WebM written; duration = Σclips + Σgaps + tail within one frame (read back from the file) |
| audio stream | Linux gate: an Opus track is present. **macOS CI job: an AAC track and H.264 video** (a new step in `desktop.yml` running this one suite) |
| captions in safe zone | caption pill boxes recorded by the compositor are inside `safeZones.caption` on every frame sampled |
| agent loop with mock | run completes; an invented-number fixture is blocked by `verify_script`; a beat-gap fixture is blocked |
| sanitiser | hostile SVG fixture (script, foreignObject, on*, `href="http…"`, `style="url(…)"`, `xlink:href`, CSS `@import`) comes back clean |
| privacy | Connected **off**: zero network requests during a full run (Playwright `page.route('**')`). Connected **on** (mock key, routed to a fake server): requests go only to the chosen provider host, and no body contains a kundli/birth field even when a chart is loaded in the same browser |
| Rust | `cargo test`: keychain round-trip (macOS CI), `tts_system` returns a non-empty WAV (macOS CI) |
| budget | a 45 s offline reel renders within a limit **stated after measuring on CI in Phase 2** (I will not pick a number before I have one); runs among the timed suites, alone |

Where a check guards against a fault, the fault is planted once to prove it fires —
the repo's existing convention.

---

## 12. Order of work and what you see after each phase

| Phase | Scope | You get |
|---|---|---|
| **1** | this plan, `surfaces.md`, privacy wording | **your OK** on the plan, the README wording, §9.3, §10 and the existing-page changes in §13 |
| **2** | Reel Studio adapter; `ra-facts`, `ra-render`, `ra-loudness`; offline mode end to end (engine script + desktop system voice + uploaded voice on the web); minimal panel on `reel.html` | Rohiṇī reel (`learn.nakshatra.4`) and Diwali reel (`fest.when.diwali`) + 3-frame contact sheet; measured render times; the macOS WebCodecs finding |
| **3** | Connected mode: keys, `ra-agent`, providers, skills, `ra-verify`, Gemini TTS, script editor, library | contact sheet; a Connected Rohiṇī reel made with your key (you run it — I never hold a key) or the mock |
| **4** | `reel-agent.html`, Studio "Make today's reel", daily reel in the app | contact sheet |
| **5** | remaining surfaces' adapters; Kahani mode with the sanitiser | contact sheet; **needs your kahani kit** |
| **6** | tests complete, README "Reel Agent" section; web build, `--app` build, `run-all`, desktop CI all green | release notes |

Commits go to `main` and `app-shell` only at the end of each phase, after the gate
passes. No key is ever committed; a pre-commit grep for `sk-ant-` / `AIza` patterns
is added to the gate.

---

## 13. Changes to existing page behaviour (each needs your OK)

1. A **"Make reel / रील बनाएँ"** button on Reel Studio, the kundli sky scenes, Director
   Pro, Studio Pro, Motion, Kinetic Workstation, the ceremony and the ayanāṃśa film. It
   opens the panel; nothing else on those pages changes.
2. A **"Make today's reel"** button on each Studio idea card.
3. **Settings** gains a "Reel Agent" section.
4. A **CSP `<meta>`** on the pages in §9.3 (option A or B).
5. The **README** opening line and a new Privacy section (§9).
6. The **site navigation** gains "Reel Agent / रील एजेंट".
7. `desktop.yml` gains a macOS step that runs `reel-agent-verify` (H.264 + AAC) and
   `cargo test`.

---

## 14. Open risks

- **macOS WKWebView WebCodecs** on macOS 11–13.2 (see §6); measured in Phase 2.
- **Hindi system voices** are not installed by default on every Mac/PC; the panel must
  say how to install one, and offline reels fall back to silent captions.
- **Gemini TTS Hindi quality** for Jyotiṣa terms depends on the lexicon; budget a pass
  of listening tests in Phase 3.
- **Kahani SVG from a model** is the largest attack surface; the sanitiser runs before
  anything touches the DOM, and fragments are drawn into an isolated `<img>` from a
  blob, never inserted as live markup.
- **Render time on SVG surfaces** (ceremony, ayanāṃśa film) is tens of ms per frame;
  a 45 s reel there may take a few minutes. The panel will estimate it up front.
