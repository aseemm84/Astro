/* ===== Reel Agent — the other surfaces ===================================

   reel-agent-verify.mjs holds Reel Studio, the verifier and the file to
   account. This suite does the same for the six surfaces ra-surfaces.js
   adds — Studio Pro, Director Pro, Motion, the Kinetic Workstation, the
   casting ceremony and the ayanāṃśa film — each on its own page:

   THE BUTTON. "Make reel" is placed beside the page's own recorder.

   THE CONTRACT. All seven methods; configure() then a frame; for the canvas
   surfaces the same p gives the same pixels whatever was drawn before it.

   THE FILE. A Hindi reel with the mock voice is rendered whole and read
   back: duration Σclips + 0.35·lines + 1.5 s to within two frames (WebM
   reports the last frame's START, so a length that is not a whole number
   of frames reads up to one frame short, plus the frame itself), every
   line Devanāgarī, the fact check passing, and zero network requests.

   THE PAGE IS PUT BACK. The ayanāṃśa page's year and the ceremony overlay
   are restored after the render — a reel must not leave the reader's page
   somewhere else.

   PRIVACY. The Workstation's kuṇḍalī is personal: the adapter says so, and
   with Connected mode switched ON in settings the gate still refuses while
   its panel is open, and opens again when the panel closes.

   HINDI. Every Reel Studio template in the eight sets that used to narrate
   in English now narrates in Devanāgarī, and RA.hi.line refuses a
   translation whose numbers differ from the engine's sentence. */
import { createRequire } from "node:module";

let chromium;
try { ({ chromium } = await import("playwright")); }
catch { ({ chromium } = createRequire(import.meta.url)("playwright")); }

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log("  ok   " + m); };
const no = (m) => { fail++; console.log("  FAIL " + m); };
const is = (c, m) => (c ? ok(m) : no(m));
const head = (h) => console.log("\n" + h);
const ROOT = "file://" + process.cwd() + "/";

const br = await chromium.launch(process.env.RA_CHANNEL ? { channel: process.env.RA_CHANNEL } : {});

async function open(page, setup) {
  const pg = await br.newPage();
  const errs = [], net = [];
  pg.on("pageerror", (e) => errs.push(e.message));
  pg.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  pg.on("request", (r) => { const u = r.url(); if (!/^(file|data|blob):/.test(u)) net.push(u); });
  await pg.goto(ROOT + page);
  await pg.waitForFunction(() => window.RA && window.RA.surfaces && window.SPEncode, null, { timeout: 60000 });
  if (setup) await setup(pg);
  return { pg, errs, net };
}

const CASES = [
  { id: "studio-pro", page: "studio-pro.html", canvas: true, setup: async (pg) => {
      await pg.waitForFunction(() => window.__spUI && window.__spUI.select, null, { timeout: 60000 });
      await pg.evaluate(() => window.__spUI.select(["sky.all", "sky.elong"]));
  } },
  { id: "director-pro", page: "director-pro.html", canvas: true, ownWords: true, setup: async (pg) => {
      await pg.waitForFunction(() => window.__dp && window.__dp.doc(), null, { timeout: 60000 });
  } },
  { id: "motion", page: "motion.html", canvas: true },
  { id: "ayanamsa-film", page: "ayanamsa.html", restore: true },
  { id: "ceremony", page: "ceremony.html", restore: true },
  { id: "kinetic", page: "kinetic-workstation.html", personal: true, setup: async (pg) => {
      await pg.waitForFunction(() => !!document.getElementById("k-go"), null, { timeout: 60000 });
      await pg.evaluate(() => {
        const set = (id, v) => { const e = document.getElementById(id); if (!e) return; e.value = v;
          ["input", "change"].forEach((t) => e.dispatchEvent(new Event(t, { bubbles: true }))); };
        set("k-dob", "1984-03-17"); set("k-tob", "14:30");
        set("k-lat", "24.4539"); set("k-lon", "54.3773"); set("k-tz", "4");
      });
      await pg.click("#k-go");
      await pg.waitForFunction(() => window.SPWorkstation && window.SPWorkstation.reel && window.SPWorkstation.reel(),
                               null, { timeout: 60000 });
  } }
];

for (const C of CASES) {
  head(C.id + " (" + C.page + ")");
  const { pg, errs, net } = await open(C.page, C.setup);
  let btn = true;
  try { await pg.waitForSelector("#ra-make", { timeout: 20000, state: "attached" }); } catch { btn = false; }
  is(btn, "a Make reel button sits beside the page's recorder");

  const before = await pg.evaluate(() => ({
    year: window.__ayFilm ? window.__ayFilm.year() : null }));
  const r = await pg.evaluate(async ({ id, canvas }) => {
    const A = RA.surfaces.make(id);
    const methods = ["describe", "configure", "ready", "duration", "beats", "facts", "frame"];
    const missing = methods.filter((m) => typeof A[m] !== "function");
    const personal = A.describe().personal;
    await A.configure({ layout: "current", lang: "hi", seconds: 15 });
    const c = document.createElement("canvas"); c.width = 1080; c.height = 1920;
    const g = c.getContext("2d");
    const grab = async (p) => { await A.frame(p, g); return c.toDataURL("image/png"); };
    let same = true, order = true;
    if (canvas) {
      const a = await grab(0.37), b = await grab(0.37);
      await grab(0.8); const again = await grab(0.37);
      same = a === b; order = a === again;
    } else await grab(0.5);
    if (A.release) A.release();
    let out;
    try {
      out = await RA.render.run({ adapter: A, layout: "current", lang: "hi", seconds: 15,
                                  voice: { provider: "mock" }, captions: true });
    } catch (e) { return { missing, personal, err: e.message + " " + JSON.stringify(e.violations || "") }; }
    return { missing, personal, same, order, ready: true, dur: out.duration, exp: out.expected,
             lines: out.lines.map((l) => l.narration), english: out.english, viol: out.violations.length,
             facts: A.facts().length, boxes: out.boxes.length };
  }, { id: C.id, canvas: !!C.canvas });
  is(r.missing.length === 0, "answers all seven methods" + (r.missing.length ? " — missing " + r.missing : ""));
  is(!!r.personal === !!C.personal, "personal is " + !!C.personal + (C.personal ? " — the reader's own chart" : ""));
  if (C.canvas) {
    is(r.same, "frame(0.37) twice gives identical pixels");
    is(r.order, "frame(0.37) is the same after another frame is drawn");
  }
  if (r.err) { no("the reel renders — " + r.err); }
  else {
    is(r.dur != null && Math.abs(r.dur - r.exp) <= 2 / 30 + 1e-3,
       "duration " + (r.dur || 0).toFixed(3) + " s against " + r.exp.toFixed(3) + " s planned");
    if (C.ownWords) is(r.lines.length > 0 && r.lines.every((l) => l.trim()), "every scene is narrated from the document's own words (" + r.lines.length + " lines)");
    else is(!r.english && r.lines.every((l) => RA_dev(l)), "every line is in Devanāgarī (" + r.lines.length + " lines)");
    is(r.viol === 0, "the fact check passes (" + r.facts + " facts)");
    is(r.boxes > 0, "caption pills were drawn");
  }
  if (C.restore) {
    const after = await pg.evaluate(() => ({
      year: window.__ayFilm ? window.__ayFilm.year() : null,
      over: !!(window.SPCosmos && window.SPCosmos.frame && window.SPCosmos.frame()) }));
    if (C.id === "ayanamsa-film") is(after.year === before.year, "the page's year is put back (" + after.year + ")");
    if (C.id === "ceremony") is(!after.over, "the ceremony overlay is closed after the render");
  }
  is(net.length === 0, "no network requests" + (net.length ? " — " + net.slice(0, 2) : ""));
  is(errs.length === 0, "no console errors" + (errs.length ? " — " + errs.slice(0, 2).join(" | ") : ""));

  if (C.personal) {
    const g = await pg.evaluate(() => {
      RA.core.save({ mode: "connected" });
      const free = RA.net.allowed();
      document.getElementById("ra-make").click();
      const open = !!RA.panel.current(), held = RA.net.allowed();
      let refused = false;
      try { RA.net.assert("a test call"); } catch (e) { refused = true; }
      const note = /this device only/.test(document.querySelector(".ra-pn").textContent);
      RA.panel.close();
      const after = RA.net.allowed();
      RA.core.save({ mode: "offline" });
      return { free, open, held, refused, note, after };
    });
    is(g.free && g.open, "Connected mode on, and the panel opens");
    is(!g.held && g.refused, "while the kuṇḍalī's panel is open the gate refuses");
    is(g.note, "the panel says the reel is made on this device only");
    is(g.after, "the gate opens again when the panel closes");
  }
  await pg.close();
}

/* ---- Hindi for the Reel Studio sets ------------------------------------ */
head("Hindi narration for the sets that were English");
{
  const { pg } = await open("reel-agent.html");
  await pg.waitForFunction(() => window.SPStories, null, { timeout: 60000 });
  const h = await pg.evaluate(async () => {
    const want = /^(Eclipses|The golden thread|The hiding|Going backwards|Two engines|What if|Everything that|Festivals — the month)/;
    const res = [];
    for (const t of SPStories.TEMPLATES) {
      if (!want.test(t.group)) continue;
      const A = RA.adapter.make("reel-studio");
      try { await A.configure({ layout: t.key, lang: "hi" }); } catch (e) { res.push([t.key, "build: " + e.message]); continue; }
      const b = A.beats("hi");
      const eng = b.filter((x) => x.english);
      res.push([t.key, eng.length ? eng[0].say.slice(0, 80) : null]);
    }
    const planted = RA.hi.line("Śukra hides in MITHUNA — within 10° of Sūrya");
    const swapped = RA.hi.sameNumbers("within 10° of Sūrya", "सूर्य से 12 अंश के भीतर");
    const unknown = RA.hi.line("Śukra hides in ATLANTIS — within 10° of Sūrya");
    return { res, planted, swapped, unknown };
  });
  const bad = h.res.filter((x) => x[1]);
  is(h.res.length >= 50, h.res.length + " templates checked across the eight sets");
  is(bad.length === 0, "every beat is Devanāgarī" + (bad.length ? " — " + bad.slice(0, 3).map((x) => x[0] + ": " + x[1]).join(" | ") : ""));
  is(h.planted === "शुक्र मिथुन में छिपता है — सूर्य से 10 अंश के भीतर", "a pattern carries graha, rāśi and number across: " + h.planted);
  is(h.swapped === false, "a translation with a different number is refused");
  is(h.unknown === null, "a sentence with an unknown rāśi stays English rather than guessing");
  await pg.close();
}

await br.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

function RA_dev(s) {
  let d = 0, l = 0;
  String(s).replace(/[ऀ-ॿ]/g, () => { d++; return ""; }).replace(/[A-Za-z]/g, () => { l++; return ""; });
  return d + l ? d / (d + l) >= 0.5 : false;
}
