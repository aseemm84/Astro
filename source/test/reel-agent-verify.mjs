/* ===== Reel Agent ==========================================================

   What has to be true for a reel the site makes on its own to be trusted:

   THE CONTRACT. Every surface docs/reel-agent/surfaces.md marks "done"
   answers all seven methods, and frame(p) is deterministic: the same p gives
   the same pixels, whatever was drawn before it.

   THE FACT CHECK. A number the facts do not contain is refused however it is
   written — digits, Devanagari digits, Hindi number words — and a script that
   skips or repeats a beat is refused. Each fault is planted to prove the
   check fires.

   THE FILE. An offline reel (engine script, mock voice) is rendered whole and
   read back: its duration is Σclips + 0.35·lines + 1.5 s to within a frame,
   it carries an audio track (AAC in MP4 where the browser has it — the macOS
   CI job; Opus in WebM on the headless Linux gate, which has no AAC), and
   every caption pill sits inside the surface's caption safe zone.

   PRIVACY. With Connected mode off, a full run makes zero network requests,
   and the gate refuses a network call before it is made.

   THE BUDGET. A 45 s offline reel must render within BUDGET_S of wall clock.
   Measured at about 70 s on the development container (software VP9 at
   1080×1920); the limit is three and a half times that, because a budget
   that fails on a busy machine fails for the wrong reason. Runs alone. */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";

let chromium;
try { ({ chromium } = await import("playwright")); }
catch { ({ chromium } = createRequire(import.meta.url)("playwright")); }

const BUDGET_S = 240;
let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log("  ok   " + m); };
const no = (m) => { fail++; console.log("  FAIL " + m); };
const is = (c, m) => (c ? ok(m) : no(m));
const head = (h) => console.log("\n" + h);

/* surfaces marked done in the tracker */
const tracker = readFileSync("docs/reel-agent/surfaces.md", "utf8");
const DONE = tracker.split("\n").filter((l) => /^\|/.test(l) && /\|\s*done\s*\|\s*$/.test(l))
  .map((l) => l.split("|")[1].trim());

/* RA_CHANNEL=chrome on the macOS CI job: Google Chrome has the H.264 and AAC
   encoders Playwright's own Chromium leaves out, so there the MP4 path is
   asserted (RA_EXPECT_AAC=1) rather than the Linux gate's WebM fallback. */
const br = await chromium.launch(process.env.RA_CHANNEL ? { channel: process.env.RA_CHANNEL } : {});
const pg = await br.newPage();
const errs = [], net = [];
pg.on("pageerror", (e) => errs.push(e.message));
pg.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
pg.on("request", (r) => { const u = r.url(); if (!/^(file|data|blob):/.test(u)) net.push(u); });
await pg.goto("file://" + process.cwd() + "/reel.html");
await pg.waitForFunction(() => window.RA && window.RA.render && window.__bridge, null, { timeout: 60000 });

head("The adapter contract");
is(DONE.length > 0, "surfaces.md marks at least one surface done (" + DONE.join(", ") + ")");
const contract = await pg.evaluate(async () => {
  const A = RA.adapter.make("reel-studio");
  const methods = ["describe", "configure", "ready", "duration", "beats", "facts", "frame"];
  const missing = methods.filter((m) => typeof A[m] !== "function");
  await A.configure({ layout: "learn.nakshatra.4", seconds: 45, lang: "hi" });
  const c = document.createElement("canvas"); c.width = 1080; c.height = 1920;
  const g = c.getContext("2d");
  const grab = (p) => { A.frame(p, g); return c.toDataURL("image/png"); };
  const a = grab(0.137), b = grab(0.137);
  grab(0.5); const after = grab(0.2); grab(0.9); const again = grab(0.2);
  const D = A.describe();
  return { missing, same: a === b, order: after === again, ready: A.ready(), dur: A.duration(),
           layouts: D.layouts.length, zones: !!(D.safeZones && D.safeZones.caption),
           beats: A.beats("hi").length, facts: A.facts().length };
});
is(contract.missing.length === 0, "Reel Studio answers all seven methods" + (contract.missing.length ? " — missing " + contract.missing : ""));
is(contract.ready && contract.dur > 0, "configure() builds and ready() reports it (" + contract.dur + " s)");
is(contract.same, "frame(0.137) twice gives identical pixels");
is(contract.order, "frame(0.2) is the same before and after other frames are drawn");
is(contract.layouts >= 100 && contract.zones, contract.layouts + " layouts and a caption safe zone are described");
is(contract.beats > 0 && contract.facts > 20, contract.beats + " beats and " + contract.facts + " facts");

head("Numbers are read however they are written");
const nums = await pg.evaluate(() => {
  const v = (s) => RA.facts.numbersIn(s).map((n) => +n.v.toFixed(4));
  return { a: v("चालीस अंश"), b: v("४८.९०°"), c: v("दो हज़ार छब्बीस"), d: v("साढ़े तीन दिन"), e: v("13°20′ का खाना"), f: v("forty-nine stars") };
});
is(nums.a.includes(40), "“चालीस” reads as 40");
is(nums.b.includes(48.9), "“४८.९०°” reads as 48.9");
is(nums.c.includes(2026), "“दो हज़ार छब्बीस” reads as 2026");
is(nums.d.includes(3.5), "“साढ़े तीन” reads as 3.5");
is(nums.e.some((x) => Math.abs(x - 13.3333) < 0.001), "“13°20′” reads as 13.333…");

head("The fact check refuses what the facts do not hold");
const vr = await pg.evaluate(async () => {
  const A = RA.adapter.make("reel-studio");
  await A.configure({ layout: "learn.nakshatra.4", seconds: 45, lang: "hi" });
  const B = A.beats("hi"), F = A.facts(), L = RA.verify.linesFromBeats(B, "hi");
  const good = RA.verify.verify(L, B, F, { lang: "hi" });
  const inv = JSON.parse(JSON.stringify(L)); inv[1].narration = "इस पट्टी में सत्तासी तारे हैं।";
  const invD = JSON.parse(JSON.stringify(L)); invD[2].narration = "इस पट्टी में ७७ तारे हैं।";
  const gap = JSON.parse(JSON.stringify(L)); gap.splice(2, 1);
  const cap = JSON.parse(JSON.stringify(L)); cap[0].caption = "एक दो तीन चार पाँच";
  return { good: good.ok, goodV: good.violations.map((v) => v.en),
           inv: RA.verify.verify(inv, B, F).violations.filter((v) => v.kind === "number").map((v) => v.raw),
           invD: RA.verify.verify(invD, B, F).violations.filter((v) => v.kind === "number").map((v) => v.raw),
           gap: RA.verify.verify(gap, B, F).violations.some((v) => v.kind === "cover"),
           cap: RA.verify.verify(cap, B, F).violations.some((v) => v.kind === "caption") };
});
is(vr.good, "the engine's own script passes" + (vr.good ? "" : " — " + vr.goodV.join("; ")));
is(vr.inv.includes("सत्तासी"), "an invented number in words (सत्तासी = 87) is refused");
is(vr.invD.includes("77"), "an invented number in Devanagari digits (७७) is refused");
is(vr.gap, "a script that skips a beat is refused");
is(vr.cap, "a five-word caption is refused");

head("Privacy");
const gate = await pg.evaluate(() => {
  try { RA.net.assert("test"); return "allowed"; } catch (e) { return e.message; }
});
is(/refused before it was made/.test(gate), "with Connected mode off the gate refuses a request");

head("A whole offline reel, read back");
const t0 = Date.now();
const r = await pg.evaluate(async () => {
  const out = await RA.render.run({ adapter: RA.adapter.make("reel-studio"), layout: "learn.nakshatra.4",
                                    lang: "hi", seconds: 45, voice: { provider: "mock" }, captions: true });
  const sum = out.clips.reduce((a, b) => a + b, 0);
  const Z = out.zones.caption;
  const inside = out.boxes.every((b) => b.x >= Z.x - 1 && b.y >= Z.y - 1 && b.x + b.w <= Z.x + Z.w + 1 && b.y + b.h <= Z.y + Z.h + 1);
  return { duration: out.duration, expected: out.expected, sum, n: out.lines.length, audio: out.file.audioCodec,
           container: out.file.container, inside, boxes: out.boxes.length, srt: out.srt.split("-->").length - 1,
           hasThumb: !!out.thumb && out.thumb.size > 1000, loud: out.loudness.after };
});
const wall = (Date.now() - t0) / 1000;
const want = r.sum + 0.35 * r.n + 1.5;
is(Math.abs(r.expected - want) < 1e-6, "planned length is Σclips + 0.35·lines + 1.5 s (" + want.toFixed(2) + " s)");
is(r.duration != null && Math.abs(r.duration - want) <= 1 / 30 + 1e-3,
   "the finished file is that long to within one frame — read back " + (r.duration && r.duration.toFixed(3)) + " s");
is(!!r.audio, "the file carries an audio track (" + r.audio + " in " + r.container + ")");
if (process.env.RA_EXPECT_AAC)
  is(r.container === "mp4" && r.audio === "AAC", "this browser writes the MP4 path: H.264 video with an AAC track (" + r.container + ", " + r.audio + ")");
is(r.inside && r.boxes > 10, "every caption pill sampled (" + r.boxes + ") lies inside the caption safe zone");
is(r.srt === r.n, "the .srt has one cue per line (" + r.srt + ")");
is(r.hasThumb, "a thumbnail is written");
is(Math.abs(r.loud + 14) < 0.5, "the mix is normalised to −14 LUFS (" + r.loud.toFixed(2) + ")");
is(net.length === 0, "the whole run made zero network requests" + (net.length ? " — " + net[0] : ""));
is(wall < BUDGET_S, "a " + want.toFixed(0) + " s offline reel rendered in " + wall.toFixed(0) + " s (budget " + BUDGET_S + " s)");

head("The agent loop, with a scripted provider");
const ag = await pg.evaluate(async () => {
  RA.core.save({ mode: "connected" });
  const lastFacts = (o) => {
    for (let i = o.messages.length - 1; i >= 0; i--) {
      const m = o.messages[i];
      if (m.results) for (const r of m.results) if (r.name === "get_facts") return r.content;
    }
    return null;
  };
  const linesFrom = (F, bad) => F.beats.map((b, i) => ({ beats: [i, i], narration: (bad && i === 1) ? "इस पट्टी में सत्तासी तारे हैं।" : (b.say || "—"), caption: "रोहिणी" }));
  let verifyResults = [], early = null;
  const script = [
    { text: "", calls: [{ id: "a", name: "list_layouts", input: { filter: "rohini" } }], usage: { in: 100, out: 20 } },
    { text: "", calls: [{ id: "b", name: "get_facts", input: { layout: "learn.nakshatra.4", seconds: 45 } }], usage: { in: 200, out: 20 } },
    (o) => ({ text: "", calls: [{ id: "c", name: "write_script", input: { lines: linesFrom(lastFacts(o), true) } }], usage: { in: 900, out: 300 } }),
    { text: "", calls: [{ id: "d", name: "verify_script", input: {} }], usage: { in: 950, out: 10 } },
    (o) => { const r = o.messages[o.messages.length - 1].results[0].content; verifyResults.push(r);
             return { text: "", calls: [{ id: "e", name: "write_script", input: { lines: linesFrom(lastFacts(o), false) } }], usage: { in: 1000, out: 300 } }; },
    { text: "", calls: [{ id: "f", name: "finish", input: { caption_text: "early" } }], usage: { in: 1000, out: 10 } },
    (o) => { early = o.messages[o.messages.length - 1].results[0].content;
             return { text: "", calls: [{ id: "g", name: "verify_script", input: {} }], usage: { in: 1000, out: 10 } }; },
    (o) => { verifyResults.push(o.messages[o.messages.length - 1].results[0].content);
             return { text: "", calls: [{ id: "h", name: "finish", input: { caption_text: "रोहिणी — 40°00′ से 53°20′", hashtags: ["#nakshatra"] } }], usage: { in: 1000, out: 30 } }; }
  ];
  const P = RA.providers.mock(script);
  const st = await RA.agent.run({ brief: "रोहिणी नक्षत्र पर 45 सेकंड की रील", lang: "hi", seconds: 45, skill: "astro-reel",
                                  adapter: RA.adapter.make("reel-studio"), providerImpl: P });
  const earlyFinish = early;
  RA.core.save({ mode: "offline" });
  return { layout: st.layout, steps: st.steps, lines: st.lines.length, finish: !!st.finish, usage: st.usage,
           firstVerify: verifyResults[0], secondVerify: verifyResults[1], earlyFinish,
           sys: P.calls[0].system.slice(0, 2000), tools: P.calls[0].tools.map((t) => t.name) };
});
is(ag.finish && ag.layout === "learn.nakshatra.4", "the scripted run finishes on the layout it chose (" + ag.steps + " steps)");
is(ag.firstVerify && ag.firstVerify.ok === false && ag.firstVerify.violations.some((v) => v.kind === "number"),
   "verify_script blocks the invented number (सत्तासी)");
is(ag.earlyFinish && /verify_script must return ok/.test(ag.earlyFinish.error || ""), "finish is refused until the script has been verified" + (ag.earlyFinish && ag.earlyFinish.error ? "" : " — got " + JSON.stringify(ag.earlyFinish).slice(0, 160)));
is(ag.secondVerify && ag.secondVerify.ok === true, "the corrected script passes");
is(/शास्त्रीय अध्ययन का ढाँचा/.test(ag.sys) && /get_facts/.test(ag.sys), "the system prompt carries the skill and the non-negotiable rules");
is(ag.tools.join(",") === "list_layouts,get_facts,get_today,write_script,verify_script,kahani_scenes,finish", "all seven tools are offered");

head("Connected mode: requests go only to the chosen host, and never carry the chart");
const hits = [];
await pg.route("https://api.anthropic.com/**", async (route) => {
  const body = route.request().postData() || "";
  hits.push({ url: route.request().url(), body, headers: route.request().headers() });
  await route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" },
    body: JSON.stringify({ content: [{ type: "tool_use", id: "x1", name: "finish", input: { caption_text: "x" } }], stop_reason: "tool_use", usage: { input_tokens: 10, output_tokens: 5 } }) });
});
const before = net.length;
const pv = await pg.evaluate(async () => {
  localStorage.setItem("learnhoro.chart", JSON.stringify({ name: "Pariksha Testname", date: "1990-07-14", place: "Testpur Nagar" }));
  RA.core.save({ mode: "connected", provider: "anthropic" });
  localStorage.setItem("nirayana.reelAgent.key.anthropic", "sk-ant-test-0000");
  const out = {};
  try { await RA.agent.run({ brief: "रोहिणी पर रील", lang: "hi", seconds: 45, skill: "astro-reel", provider: "anthropic", adapter: RA.adapter.make("reel-studio") }); }
  catch (e) { out.runErr = e.message; }
  try { await RA.agent.run({ brief: "मेरी कुंडली Testpur Nagar में", lang: "hi", provider: "anthropic", adapter: RA.adapter.make("reel-studio") }); out.leak = "sent"; }
  catch (e) { out.leak = e.message; }
  try { RA.providers.privacy({ dob: "1990-07-14" }); out.field = "passed"; } catch (e) { out.field = e.message; }
  RA.core.save({ mode: "offline" });
  try { await RA.providers.anthropic.call({ system: "x", messages: [{ role: "user", text: "x" }], tools: [] }); out.off = "sent"; }
  catch (e) { out.off = e.message; }
  localStorage.removeItem("learnhoro.chart"); localStorage.removeItem("nirayana.reelAgent.key.anthropic");
  return out;
});
await pg.unroute("https://api.anthropic.com/**");
const others = net.slice(before).filter((u) => !/^https:\/\/api\.anthropic\.com\//.test(u));
is(hits.length >= 1, "with Connected mode on, the request reached the chosen provider (" + hits.length + ")");
is(others.length === 0, "and no other host was contacted" + (others.length ? " — " + others[0] : ""));
is(hits.every((h) => !/Pariksha|1990-07-14|Testpur/.test(h.body)), "no request body carried the stored chart's name, date or place");
is(hits.every((h) => !/"(dob|tob|birth\w*|latitude|longitude|natal\w*)"\s*:/i.test(h.body)), "no request body carried a chart or birth field");
is(/Refused/.test(pv.leak || ""), "a brief containing the chart's place is refused before it is sent");
is(/Refused/.test(pv.field || ""), "a body with a dob field is refused");
is(/Connected mode is off/.test(pv.off || ""), "switching Connected mode off stops the provider call before it is made");
is(hits.every((h) => h.headers["anthropic-dangerous-direct-browser-access"] === "true" && h.headers["x-api-key"] === "sk-ant-test-0000"),
   "the website request carries the reader's key and the browser-access header");

head("The skills are bundled as data");
const sk = await pg.evaluate(() => ({ names: Object.keys(RA.skills || {}), lex: Object.keys(RA.lexicon || {}).length,
  rules: ["astro-reel", "kahani-reel", "daily-reel", "hindi-voice-style"].every((k) => RA.skills[k] && RA.skills[k].body.length > 300) }));
is(sk.rules, "four skills compiled from source/src/skills (" + sk.names.join(", ") + ")");
is(sk.lex > 10, "the pronunciation lexicon rides along (" + sk.lex + " entries)");

head("The SVG sanitiser");
const san = await pg.evaluate(() => {
  const hostile =
    '<script>alert(1)</script>' +
    '<g onload="alert(2)" onclick="x()"><circle cx="10" cy="10" r="5" fill="url(#g1)" onmouseover="y()"/></g>' +
    '<foreignObject><div xmlns="http://www.w3.org/1999/xhtml">hi</div></foreignObject>' +
    '<image href="https://evil.example/x.png" width="10" height="10"/>' +
    '<use xlink:href="#a" xmlns:xlink="http://www.w3.org/1999/xlink"/>' +
    '<a href="javascript:alert(3)"><rect width="5" height="5"/></a>' +
    '<rect width="9" height="9" style="fill:url(https://evil.example/f)"/>' +
    '<path d="M0 0L5 5" fill="url(https://evil.example/p)" stroke="red"/>' +
    '<style>@import url(https://evil.example/c.css);</style>' +
    '<linearGradient id="g1"><stop offset="0" stop-color="#fff"/></linearGradient>' +
    '<text x="5" y="5" font-size="40">रोहिणी</text>';
  const r = RA.sanitize.svg(hostile);
  return { ok: r.ok, removed: r.removed, svg: r.svg };
});
is(san.ok, "a hostile fragment still parses and is cleaned rather than rejected");
is(!/script|alert/i.test(san.svg), "script elements and their text are gone");
is(!/\son\w+=/i.test(san.svg), "every on* event attribute is gone");
is(!/foreignObject|<image|<use|<a[\s>]|<style/i.test(san.svg), "foreignObject, image, use, a and style are gone");
is(!/https?:|javascript:|evil\.example/i.test(san.svg), "no external reference or javascript: survives");
is(/url\(#g1\)/.test(san.svg) && /<circle/.test(san.svg) && /रोहिणी/.test(san.svg), "same-document gradients, shapes and Devanagari text are kept");
is(san.removed >= 8, "the caller is told how much was removed (" + san.removed + ")");

head("Kahani — a story surface through the same contract");
const kh = await pg.evaluate(async () => {
  const K = RA.adapter.make("kahani");
  const acc = K.accept([
    { svg: '<circle cx="540" cy="900" r="200" fill="#f4c95d"/><script>bad()</script>', props: ["moon", "mountains"], motion: { entrance: "rise", bob: 0.5 }, seconds: 5, kicker: "रोहिणी की कथा", say: "कथा है कि…" },
    { svg: '<rect x="300" y="700" width="480" height="300" fill="#7a4cc2"/>', props: ["tree", "cloud", "diya"], motion: { entrance: "zoom", sway: 1 }, seconds: 6, kicker: "चंद्र", say: "चंद्रमा…" }
  ]);
  await K.configure({ layout: "kahani" });
  const methods = ["describe", "configure", "ready", "duration", "beats", "facts", "frame"].filter((m) => typeof K[m] !== "function");
  const c = document.createElement("canvas"); c.width = 1080; c.height = 1920; const g = c.getContext("2d");
  const grab = (p) => { K.frame(p, g); return c.toDataURL("image/png"); };
  const a = grab(0.3), b = grab(0.3); grab(0.9); const d = grab(0.3);
  return { removed: acc.removed, methods, dur: K.duration(), beats: K.beats().length, same: a === b && a === d, ready: K.ready() };
});
is(kh.methods.length === 0 && kh.ready, "the kahani surface answers all seven methods");
is(kh.dur === 11 && kh.beats === 2, "two scenes make two beats over 11 s");
is(kh.same, "a kahani frame is deterministic whatever was drawn before it");
is(kh.removed >= 1, "scene fragments pass through the sanitiser (" + kh.removed + " removed)");

head("The page behaves");
is(errs.length === 0, "no console errors" + (errs.length ? " — " + errs[0].slice(0, 140) : ""));

await br.close();
console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
