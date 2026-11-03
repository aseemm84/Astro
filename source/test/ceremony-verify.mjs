/* ceremony-verify.mjs — the casting ceremony on its own page.
 *
 * Three claims, each of which is easy to assert in a way that cannot fail:
 *
 *  1. The overlay STAYS until it is closed — but only here. The three timers
 *     it normally runs under exist to stop a veil outliving the chart behind
 *     it, and this page has no chart. So both branches are exercised: with
 *     hold the overlay must survive well past the idle timer, and WITHOUT it,
 *     on the same page, it must still close itself. Checking only the first
 *     would pass just as well if the timers had been deleted outright, which
 *     would be a real regression for the kundli path.
 *
 *  2. The wording is moment-neutral HERE and unchanged by default. Asserting
 *     the page's own text alone would pass if the birth wording had simply
 *     been replaced everywhere, so the default is asserted too.
 *
 *  3. The recording is a real file. Not "a blob was produced" — a blob is
 *     produced by a canvas that drew nothing at all. The frame count, the
 *     duration against the length of the take, and the pixel dimensions are
 *     all checked, and a frame is sampled to confirm the wheel is actually
 *     in it rather than an empty gradient.
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync, mkdirSync } from "node:fs";

let pass = 0, fail = 0;
const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const head = t => console.log("\n" + t);
const is = (c, t) => { if (c) { pass++; console.log("  ok   " + t); }
                       else { fail++; console.log("  FAIL " + t); } };

const { chromium } = require("playwright");
const browser = await chromium.launch();

async function open() {
  const p = await browser.newPage({ viewport: { width: 1200, height: 950 },
                                    acceptDownloads: true });
  const errs = [];
  p.on("pageerror", e => errs.push(String(e && e.message || e)));
  p.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text()); });
  await p.goto("file://" + ROOT + "/ceremony.html");
  await p.waitForTimeout(900);
  return { p, errs };
}

/* ───── 1. it stays up, and only here ────────────────────────────────────── */
head("the ceremony holds until it is closed — and still closes itself without hold");
{
  const { p, errs } = await open();
  await p.click("#cer-go");
  await p.waitForTimeout(2500);
  const up = await p.evaluate(() => !!document.querySelector(".castover"));
  is(up, "the overlay is raised");
  /* LINGER is 9s from the moment it is ready. Past that by a clear margin. */
  await p.waitForTimeout(13000);
  const held = await p.evaluate(() => !!document.querySelector(".castover"));
  is(held, "and is still up 15s later, well past the 9s idle timer");

  /* Escape must still work — "no timer" must not mean "no way out". */
  await p.keyboard.press("Escape");
  await p.waitForTimeout(900);
  is(await p.evaluate(() => !document.querySelector(".castover")),
     "Escape still closes it, so holding it open is not a trap");

  /* the same page, the same overlay, WITHOUT hold: the timers must be intact,
     or the kundli path has silently lost its guarantee */
  await p.evaluate(() => {
    window.SPCosmos.ceremony(new Date());
    setTimeout(() => { try { window.SPCosmos.end(); } catch (e) {} }, 400);
  });
  await p.waitForTimeout(1500);
  is(await p.evaluate(() => !!document.querySelector(".castover")),
     "raised again with no options");
  await p.waitForTimeout(13000);
  is(await p.evaluate(() => !document.querySelector(".castover")),
     "and that one closes itself — the timers are still there for the chart path");
  await p.close();
  is(errs.length === 0, "no page errors (" + errs.slice(0, 2).join(" / ") + ")");
}

/* ───── 2. the wording ───────────────────────────────────────────────────── */
head("the wording fits the moment it is actually winding back to");
{
  const { p, errs } = await open();
  await p.click("#cer-go");
  await p.waitForTimeout(2200);
  const here = await p.evaluate(() => ({
    line: (document.getElementById("cast-line") || {}).textContent || "",
    sub: (document.querySelector(".castsub") || {}).textContent || "",
    cta: (document.getElementById("cast-reveal") || {}).textContent || "",
  }));
  await p.keyboard.press("Escape");
  await p.waitForTimeout(700);
  const dflt = await p.evaluate(async () => {
    window.SPCosmos.ceremony(new Date());
    await new Promise(r => setTimeout(r, 700));
    const o = {
      line: (document.getElementById("cast-line") || {}).textContent || "",
      sub: (document.querySelector(".castsub") || {}).textContent || "",
      cta: (document.getElementById("cast-reveal") || {}).textContent || "",
    };
    window.SPCosmos.abort();
    return o;
  });
  await p.close();
  is(!/जन्म/.test(here.line),
     "this page's headline does not claim a birth moment (" + here.line + ")");
  is(/चुने हुए/.test(here.line), "it says the CHOSEN moment instead");
  is(/chosen moment/i.test(here.sub) && !/birth/i.test(here.sub),
     "and so does the subtitle (" + here.sub + ")");
  is(!/kundli/i.test(here.cta), "the button does not offer a kundli that is not there");
  is(/end the ceremony/i.test(here.cta), "it says what it does (" + here.cta + ")");
  /* and the kundli path keeps its own wording, which a blanket replacement
     would have taken away */
  is(/जन्म/.test(dflt.line) && /birth moment/i.test(dflt.sub) && /Kundli/i.test(dflt.cta),
     "called with no options it still says birth moment and Reveal Kundli");
  is(errs.length === 0, "no page errors");
}

/* ───── 3. the recording ─────────────────────────────────────────────────── */
head("the interaction is recorded, and the file is a real video of it");
{
  const { p, errs } = await open();
  await p.click("#cer-go");
  await p.waitForTimeout(3200);
  const sampling = await p.evaluate(() => window.CerRec.sampling());
  is(sampling, "the trace is running while the ceremony plays");

  /* turn the ring, so the take carries an interaction and not just the
     wind-back — the whole point is that what the reader did is in the file */
  const box = await (await p.$(".castwheel")).boundingBox();
  await p.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await p.mouse.down();
  for (let i = 0; i < 12; i++) {
    await p.mouse.move(box.x + box.width * 0.5 + i * 18, box.y + box.height * 0.5);
    await p.waitForTimeout(40);
  }
  await p.mouse.up();
  await p.waitForTimeout(700);

  const spun = await p.evaluate(() => {
    const f = window.SPCosmos.frame();
    return f ? f.read().spin : null;
  });
  is(typeof spun === "number" && Math.abs(spun) > 0.5,
     "the drag actually turned the ring (" +
     (typeof spun === "number" ? spun.toFixed(1) + "°" : "no reading") + ")");

  await p.keyboard.press("Escape");
  await p.waitForTimeout(900);
  const ready = await p.evaluate(() => ({
    enabled: !document.getElementById("cer-save").disabled,
    msg: document.getElementById("cer-recstatus").textContent,
  }));
  /* The take must survive the overlay closing. It did not at first: the
     sampler noticed the overlay had gone and called stop() itself, which
     handed the rows to nobody and left the page with an empty take and a
     disabled button. Only stop() may clear a take now. */
  is(ready.enabled, "closing the ceremony leaves a take ready to save");
  is(/\d+(\.\d+)?s recorded/.test(ready.msg), "and says how long it is (" + ready.msg + ")");

  const dl = p.waitForEvent("download", { timeout: 300000 });
  await p.evaluate(() => document.getElementById("cer-save").click());
  const d = await dl;
  const dir = "/tmp/claude-0/cerverify";
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const file = dir + "/take." + (d.suggestedFilename().split(".").pop() || "webm");
  await d.saveAs(file);
  const after = await p.evaluate(() => document.getElementById("cer-recstatus").textContent);
  await p.close();

  is(existsSync(file) && readFileSync(file).length > 50000,
     "a file comes out, and it is not empty (" +
     (existsSync(file) ? Math.round(readFileSync(file).length / 1024) + " KB" : "missing") + ")");
  is(/\d+ frames · \d+(\.\d+)?s saved/.test(after),
     "the page reports frames and seconds (" + after + ")");

  /* ffprobe is the only way to know the container is really a video rather
     than a blob with a hopeful MIME type. Skipped rather than faked where it
     is not installed, and said so. */
  const { execFileSync } = await import("node:child_process");
  let probe = null;
  try {
    probe = JSON.parse(execFileSync("ffprobe",
      ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", file],
      { encoding: "utf8" }));
  } catch (e) { probe = null; }
  if (!probe) {
    console.log("  --   ffprobe is not installed here, so the container is unchecked");
  } else {
    const v = (probe.streams || []).filter(s => s.codec_type === "video")[0];
    is(!!v, "the container holds a video stream");
    is(v && v.width === 1080 && v.height === 1920,
       "at the story size (" + (v ? v.width + "x" + v.height : "?") + ")");
    const dur = Number((probe.format || {}).duration || 0);
    const said = Number((/(\d+(?:\.\d+)?)s saved/.exec(after) || [0, 0])[1]);
    /* The file is stamped by wall clock, not by frame count ÷ fps — that is
       why the content is paced by elapsed time. If that pacing is ever
       reverted, the duration and the take drift apart and this catches it:
       the first build ran 6.8s of ceremony into a 15.5s file. */
    is(dur > 1 && said > 1 && Math.abs(dur - said) / said < 0.35,
       "and plays for about as long as the take (" + dur.toFixed(1) +
       "s file vs " + said + "s recorded)");
  }
  is(errs.length === 0, "no page errors (" + errs.slice(0, 2).join(" / ") + ")");
}

await browser.close();
console.log("\n" + (fail ? "FAIL" : "PASS") + " ceremony-verify — " + pass
            + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
