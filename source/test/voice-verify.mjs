/* ===== The voiceover text and the voice track =============================

   TWO THINGS ARE CHECKED HERE, both of which were wrong before and neither
   of which any other harness would notice.

   THE SPOKEN TEXT. The script panel's text is built to be looked at: it
   carries beat numbers, second marks, degree signs, Greek letters and bar
   dividers, all of which a synthesiser reads out loud as themselves. A
   voice handed "3. [12.4s] Mūla, 240°–253°20′ · Jyeṣṭhā" says "three dot
   bracket twelve point four ess" and then mispronounces the rest. So every
   explainer reel is rendered in all three languages and swept for anything
   that is not a word; and the Hindi tab, whose whole reason to exist is
   that a Hindi voice says Sanskrit correctly, is swept for English as well.

   THE TRACK ITSELF. A voice that drifts against the picture is worse than
   no voice, and drift cannot be seen in a still. So a WAV with silence and
   two short tones at known times is encoded into a reel, the file is read
   back, and the tones are required to still be at those times. That is the
   one measurement that proves sync rather than assuming it. */

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

/* the same two-step the other harnesses use: playwright may be installed
   where the import map can see it or only where require can */
let chromium;
try { ({ chromium } = await import("playwright")); }
catch { ({ chromium } = createRequire(import.meta.url)("playwright")); }

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log("  ok   " + m); };
const no = (m) => { fail++; console.log("  FAIL " + m); };
const is = (c, m) => (c ? ok(m) : no(m));
const head = (h) => console.log("\n" + h);

/* a 6.4-second mono WAV: silence, a tone from 1.0 to 1.2, another from
   5.0 to 5.2 — written by hand so the harness owns its own fixture */
function tone(path) {
  const r = 48000, n = Math.round(6.4 * r);
  const d = Buffer.alloc(44 + n * 2);
  d.write("RIFF", 0); d.writeUInt32LE(36 + n * 2, 4); d.write("WAVE", 8);
  d.write("fmt ", 12); d.writeUInt32LE(16, 16); d.writeUInt16LE(1, 20);
  d.writeUInt16LE(1, 22); d.writeUInt32LE(r, 24); d.writeUInt32LE(r * 2, 28);
  d.writeUInt16LE(2, 32); d.writeUInt16LE(16, 34);
  d.write("data", 36); d.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const t = i / r;
    const on = (t >= 1.0 && t < 1.2) || (t >= 5.0 && t < 5.2);
    d.writeInt16LE(on ? Math.round(9600 * Math.sin(2 * Math.PI * 440 * t)) : 0,
                   44 + i * 2);
  }
  writeFileSync(path, d);
}

const dir = mkdtempSync(join(tmpdir(), "voice-"));
const wav = join(dir, "blips.wav");
tone(wav);
const caf = join(dir, "spoken.caf");
/* a CAF header and nothing behind it: enough for the extension and the magic
   to be what they claim, which is all the refusal path looks at */
writeFileSync(caf, Buffer.concat([Buffer.from("caff"),
                                  Buffer.alloc(12)]));

const br = await chromium.launch();
const pg = await br.newPage();
const errs = [];
pg.on("pageerror", (e) => errs.push(String(e)));
pg.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
await pg.goto("file://" + process.cwd() + "/reel.html");
await pg.waitForFunction(() => window.SPStories && window.SPStories.ready() &&
                               window.SPScript && window.SPVoice,
                         null, { timeout: 60000 });

/* ---- 1. nothing unspeakable survives ----------------------------------- */
head("The spoken text carries only words");
const keys = [];
for (let i = 1; i <= 27; i++) keys.push("learn.nakshatra." + i);
for (let i = 1; i <= 12; i++) keys.push("learn.rashi." + i);
for (let i = 1; i <= 12; i++) keys.push("learn.bhava." + i);

const sweep = await pg.evaluate((ks) => {
  /* Every mark that is silent on the page and loud in a voice. A leading
     "10." is NOT one of them: that is the bhāva's own number and a voice
     says "ten", which is what the line means. A bare "2 d" is, because a
     voice says "dee". */
  const MARKS = /[[\]°′″·—–−]|\d+\.\d+\s*s\b|\b\d+\s*[dhmsy]\b/;
  /* Latin that is not a proper name a catalogue gave us. The Bayer letter,
     the constellation in the genitive, the one program name and the place
     are all meant to stay as they are — a Hindi astronomer says "lambda
     Scorpii" in Latin too. */
  const KEEP = /^(Stellarium|Abu|Dhabi|alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Arietis|Tauri|Orionis|Geminorum|Hydrae|Leonis|Corvi|Virginis|Boötis|Librae|Scorpii|Sagittarii|Aquilae|Delphini|Aquarii|Pegasi|Piscium|Cancri|Capricorni|Ophiuchi|Australis|Canis|Majoris|Minoris)$/;
  const bad = [], empty = [];
  ks.forEach((k) => {
    let S;
    try { S = window.SPStories.build(k, { t0: Date.parse("2026-01-01") }); }
    catch (e) { empty.push(k + " did not build"); return; }
    ["en", "hinglish", "hi"].forEach((l) => {
      const t = window.SPScript.speech(S, l);
      if (!t) { empty.push(k + "/" + l); return; }
      t.split("\n\n").forEach((para) => {
        const m = para.match(MARKS);
        if (m) bad.push(k + "/" + l + ": " + m[0]);
      });
    });
    /* the Hindi tab: Latin words that are not catalogue names */
    const hi = window.SPScript.speech(S, "hi");
    const latin = (hi.match(/[A-Za-z][A-Za-zÀ-ɏ]*/g) || [])
      .filter((w) => !KEEP.test(w));
    /* A star's own proper name is allowed — Sheratan is Sheratan in every
       language. It is taken from the reel's own facts rather than a list
       written here, so a new star cannot quietly become an exception: only
       the name this reel actually names is excused, and anything else
       English in a Hindi line still fails. */
    const F = S.facts || {};
    const names = String([F.star, F.bayer, F.place, F.prevStar, F.nextStar]
                         .filter(Boolean).join(" ")).split(/[^A-Za-z]+/);
    const left = latin.filter((w) => names.indexOf(w) < 0);
    if (left.length) bad.push(k + "/hi English: " + left.slice(0, 4).join(" "));
  });
  return { bad: bad, empty: empty };
}, keys);

is(sweep.empty.length === 0,
   "every explainer speaks in all three languages" +
   (sweep.empty.length ? " — " + sweep.empty.slice(0, 4).join(", ") : ""));
is(sweep.bad.length === 0,
   "no beat numbers, second marks, degree signs or bar dividers survive" +
   (sweep.bad.length ? " — " + sweep.bad.slice(0, 5).join("; ") : ""));

head("Degrees, units and letters are expanded");
const words = await pg.evaluate(() => {
  const S = window.SPStories.build("learn.nakshatra.19",
                                   { t0: Date.parse("2026-01-01") });
  const en = window.SPScript.speech(S, "en");
  const hi = window.SPScript.speech(S, "hi");
  const R = window.SPStories.build("learn.rashi.9",
                                   { t0: Date.parse("2026-01-01") });
  return { en: en, hi: hi, rEn: window.SPScript.speech(R, "en"),
           rHi: window.SPScript.speech(R, "hi") };
});
is(/253 degrees 20 minutes/.test(words.en), "253°20′ is read as degrees and minutes");
is(/अंश/.test(words.hi) && !/degrees/.test(words.hi),
   "the Hindi tab says अंश, not “degrees”");
is(/lambda/.test(words.en), "λ is read as lambda");
is(/\d+ (day|days|hour|hours)\b/.test(words.rEn) && !/\b\d+ [dh]\b/.test(words.rEn),
   "“2 d 11 h” is read as days and hours");
is(/दिन|घंटे/.test(words.rHi) && !/\bdays\b/.test(words.rHi),
   "the Hindi tab says दिन and घंटे");
is(/अग्नि|पृथ्वी|वायु|जल/.test(words.rHi) && !/\bfire\b|\bdual\b/.test(words.rHi),
   "element and modality are Hindi on the Hindi tab");

/* ---- 2. the file picker ------------------------------------------------- */
head("The voice file");
is(await pg.$("#reel-voice") !== null, "there is a picker");
await pg.setInputFiles("#reel-voice", caf);
await pg.waitForTimeout(1200);
const cafNote = (await pg.textContent("#reel-voicenote")) || "";
is(/Core Audio/.test(cafNote) && /Encode Media/.test(cafNote),
   "a .caf is refused by name, with the Shortcut action that fixes it");
is(await pg.isHidden("#reel-voicefit"),
   "a refused file leaves nothing to set the reel to");

await pg.setInputFiles("#reel-voice", wav);
await pg.waitForTimeout(1500);
const note = (await pg.textContent("#reel-voicenote")) || "";
is(/6\.4s/.test(note), "a WAV decodes and its real length is reported: " +
   note.replace(/\s+/g, " ").slice(0, 60));
is(!/kHz/.test(note),
   "the resampled rate is not reported as the file's own");

/* ---- 3. the track lands where it was put -------------------------------- */
head("The voice is in sync with the picture");
const got = await pg.evaluate(async () => {
  const cv = document.getElementById("reel-canvas");
  const R = window.__reel.reel();
  const r = await window.SPEncode.encode(cv, {
    seconds: 8, fps: 12,
    drawAt: function (x) {
      window.SPReel.frameAt(cv.getContext("2d"), cv.width, cv.height, R, x);
    },
    audio: window.SPVoice.buffer()
  });
  /* read the track back out of the encoded file the only way a page can:
     decode it again and look at where the loud parts are */
  const ab = await r.blob.arrayBuffer();
  const C = new (window.AudioContext || window.webkitAudioContext)();
  const buf = await C.decodeAudioData(ab.slice(0));
  const d = buf.getChannelData(0), rate = buf.sampleRate;
  const win = Math.round(rate * 0.02), spans = [];
  let on = null;
  for (let i = 0; i + win < d.length; i += win) {
    let s = 0;
    for (let k = i; k < i + win; k++) s += d[k] * d[k];
    const loud = Math.sqrt(s / win) > 0.03;
    if (loud && on === null) on = i / rate;
    if (!loud && on !== null) { spans.push([on, i / rate]); on = null; }
  }
  return { audioCodec: r.audioCodec, seconds: buf.duration, spans: spans };
});
is(got.audioCodec !== null, "the export carries an audio track (" +
   got.audioCodec + ")");
is(got.spans.length === 2,
   "both tones survive encoding — found " + got.spans.length);
if (got.spans.length === 2) {
  const a = got.spans[0][0], b = got.spans[1][0];
  is(Math.abs(a - 1.0) < 0.05 && Math.abs(b - 5.0) < 0.05,
     "they are still at 1.00s and 5.00s — measured " + a.toFixed(2) + "s and " +
     b.toFixed(2) + "s, so there is no drift");
}
is(Math.abs(got.seconds - 6.4) < 0.15,
   "the track is not padded or truncated: " + got.seconds.toFixed(2) + "s");

head("The page behaves");
is(errs.length === 0, "no console errors" +
   (errs.length ? " — " + errs[0].slice(0, 120) : ""));

await br.close();
console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
