/* Does the sentence parser understand what it claims to?
 *
 *   node source/test/intent-verify.mjs
 *
 * The claim this layer makes is a strong one and an unusual one for a parser:
 * it never guesses. So the things to check are not only "does it get the easy
 * sentence right" but:
 *
 *   does EVERY generated suggestion parse to something drawable — because a
 *     suggestion list that contains a sentence the parser cannot read is a
 *     list that teaches the wrong vocabulary;
 *   does it read the spellings people actually type, not only the diacritics;
 *   does it REFUSE the impossible with a reason a person can act on — a
 *     combust Sūrya, a retrograde Moon, a conjunction with one graha named;
 *   does it report what it could not place, rather than discarding it;
 *   and does a sentence end to end produce a reel that actually renders.
 *
 * The last is the one that matters most. A parser that produces a tidy
 * intent object and a document that draws nothing has moved the failure
 * rather than fixed it.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
let chromium;
try { ({ chromium } = await import("playwright")); }
catch { const { createRequire } = await import("node:module");
  ({ chromium } = createRequire(import.meta.url)("playwright")); }
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const T={".html":"text/html",".js":"text/javascript",".css":"text/css",
         ".json":"application/json",".svg":"image/svg+xml",".png":"image/png",
         ".webmanifest":"application/manifest+json"};
const server=createServer(async(q,r)=>{const u=decodeURIComponent((q.url||"/").split("?")[0]);
 try{const b=await readFile(join(ROOT,normalize(u).replace(/^(\.\.[/\\])+/,"")));
  r.writeHead(200,{"content-type":T[extname(u)]||"application/octet-stream"});r.end(b);}catch{r.writeHead(404).end("no");}});
const port=await new Promise(r=>server.listen(0,"127.0.0.1",()=>r(server.address().port)));
const base=`http://127.0.0.1:${port}`;
const br=await chromium.launch();
const pg=await br.newPage({viewport:{width:1500,height:1000}});
const errs=[]; pg.on("pageerror",e=>errs.push(String(e)));
await pg.addInitScript(() => {
  localStorage.setItem("nirayana.birth", JSON.stringify({
    year:1984,month:5,day:17,hour:14,minute:30,lat:26.85,lon:80.95,
    tzHours:5.5,ayanamsa:"lahiri",node:"mean",name:"Test"}));
  localStorage.removeItem("nirayana.directorpro");
});
await pg.goto(`${base}/director-pro.html`,{waitUntil:"load"});
await pg.waitForFunction(()=>window.__dp && window.SPIntent,{timeout:30000});

const A = await pg.evaluate(() => {
  const I = window.SPIntent;
  const out = {};

  /* ---- the sentence that was actually asked for ---- */
  const askedFor = I.understand(
    "animate the surya and shukra mutual position for the next 200 years and create an orbit pattern");
  out.asked = { sel: askedFor.sel, force: askedFor.force,
                span: askedFor.spanDays, ok: askedFor.ok,
                understood: askedFor.parse.understood,
                ignored: askedFor.parse.ignored,
                headline: askedFor.headline, note: askedFor.note };

  /* ---- every suggestion must parse to something drawable ---- */
  const recs = I.recipes();
  const bad = [];
  recs.forEach(r => {
    const U = I.understand(r.text);
    if (!U.ok) bad.push({ text: r.text, why: U.why });
    else {
      /* and the nodes it names must exist */
      U.sel.forEach(id => {
        if (!window.SPNodes.byId(id)) bad.push({ text: r.text, why: ["no node " + id] });
      });
    }
  });
  out.recipes = { n: recs.length, bad: bad.slice(0, 6), badCount: bad.length,
                  groups: [...new Set(recs.map(r => r.group))].length };

  /* ---- spellings people actually type ---- */
  const spellings = [
    ["shukra combust over 50 years", "cyc.combust.Śukra"],
    ["Sukra combustible over 50 years", "cyc.combust.Śukra"],
    ["venus combust over 50 years", "cyc.combust.Śukra"],
    ["budh combust over 20 years", "cyc.combust.Budha"],
    ["mercury combustion over 20 years", "cyc.combust.Budha"],
    ["buddha combust over 20 years", "cyc.combust.Budha"],
    ["chandra full moon over 19 years", "cyc.purnima"],
    ["purnima over 19 years", "cyc.purnima"],
    ["pournami for 19 years", "cyc.purnima"],
    ["amavasya for 19 years", "cyc.amavasya"],
    ["brihaspati and shani conjunction over 200 years", "cyc.conj.Guru-Śani"],
    ["jupiter saturn conjunctions over 200 years", "cyc.conj.Guru-Śani"],
    ["kuja stations over 60 years", "cyc.station.Maṅgala"],
    ["mars retrograde over 60 years", "cyc.station.Maṅgala"],
    ["angaraka vakri over 60 years", "cyc.station.Maṅgala"],
    /* order should not matter for a pair */
    ["shani and guru conjunction over 100 years", "cyc.conj.Guru-Śani"],
    ["ravi and soma conjunction over 2 years", "cyc.conj.Sūrya-Candra"]
  ];
  out.spellings = spellings.map(([text, want]) => {
    const U = I.understand(text);
    return { text, want, got: U.sel[0] || null, ok: U.sel[0] === want };
  });
  out.spellingFails = out.spellings.filter(q => !q.ok);

  /* ---- spans ---- */
  const spans = [
    ["over 200 years", 200*365.2564], ["for 50 years", 50*365.2564],
    ["next 30 days", 30], ["over a century", 36525.64],
    ["for two hundred years", 200*365.2564], ["over 6 months", 6*30.44],
    ["for a decade", 3652.564], ["over 18 months", 18*30.44]
  ];
  out.spans = spans.map(([frag, want]) => {
    const U = I.understand("show every full moon " + frag);
    return { frag, want: Math.round(want), got: U.spanDays,
             ok: U.spanDays != null && Math.abs(U.spanDays - want) <= 2 };
  });
  out.spanFails = out.spans.filter(q => !q.ok);

  /* ---- honest refusals ---- */
  const refusals = [
    "show surya combust over 20 years",
    "show the moon retrograde over 20 years",
    "show rahu stations over 20 years",
    "animate the conjunction of guru over 100 years",
    "the inferior conjunctions of mars over 40 years"
  ];
  out.refusals = refusals.map(t => {
    const U = I.understand(t);
    return { text: t, ok: !U.ok, why: U.why[0] || null,
             /* a refusal must carry a reason, not just fail */
             hasReason: U.why.length > 0 && U.why[0].length > 25 };
  });
  out.refusalFails = out.refusals.filter(q => !(q.ok && q.hasReason));

  /* ---- it reports what it could not place ---- */
  const odd = I.understand("animate the quintile of shukra and jupiter in gandanta over 40 years");
  out.odd = { ignored: odd.parse.ignored, ok: odd.ok,
              reports: odd.parse.ignored.indexOf("quintile") >= 0 &&
                       odd.parse.ignored.indexOf("gandanta") >= 0 };

  /* ---- manner ---- */
  const m = I.understand("show every full moon for 19 years as a square, slowly, on parchment, no title");
  out.manner = { format: m.format, pal: m.pal, seconds: m.seconds, titles: m.titles,
                 ok: m.format === "square" && m.pal === "parchment" &&
                     m.seconds > 15 && m.titles === false };

  /* ---- a figure that cannot take a cycle set is said, not silently dropped */
  const clash = I.understand("show every full moon over 19 years as a north indian chart");
  out.clash = { note: clash.note, force: clash.force,
                ok: !!clash.note && clash.force === "rose" };
  return out;
});

/* ---- end to end: a sentence becomes a reel that renders ---- */
const E = await pg.evaluate(async () => {
  const out = {};
  function litOf() {
    const cv = document.getElementById("dp-canvas");
    const c = cv.getContext("2d");
    const d = c.getImageData(0, 0, cv.width, cv.height).data;
    let ink = 0;
    for (let i = 0; i < d.length; i += 4)
      if (d[i] + d[i+1] + d[i+2] > 150) ink++;
    return ink / (d.length / 4);
  }
  const inp = document.getElementById("si-text");
  inp.value = "animate the inferior conjunctions of shukra over 40 years as an orbit pattern";
  inp.dispatchEvent(new Event("input", { bubbles: true }));
  document.getElementById("si-go").click();
  await new Promise(r => setTimeout(r, 200));
  const d = window.__dp.doc();
  out.scenes = d.scenes.length;
  out.layers = d.scenes.map(s => s.layers.length);
  out.total = window.__dp.total();
  out.spanUsed = window.__dp.ctx().spanDays;
  /* the figure scene must actually draw the pattern */
  window.__dp.exportFrame(out.total * 0.92);
  out.litLate = litOf();
  window.__dp.exportFrame(out.total * 0.60);
  out.litMid = litOf();
  /* and the title scene must differ from the figure scene */
  window.__dp.exportFrame(0.8);
  out.litTitle = litOf();
  /* the readback is on the page */
  out.readback = document.getElementById("si-read").textContent;
  /* count the suggestions with NO filter: pressing Make it leaves the box
     holding the sentence, which filters the list, so counting here was
     counting a filtered list and calling it the whole one */
  window.SPIntentUI.suggestions("");
  out.suggestions = document.querySelectorAll("#si-list .sirecipe").length;
  /* typing filters the suggestions */
  inp.value = "combust";
  inp.dispatchEvent(new Event("input", { bubbles: true }));
  await new Promise(r => setTimeout(r, 60));
  out.filtered = document.querySelectorAll("#si-list .sirecipe").length;
  return out;
});

/* ---- and on Studio Pro, the same sentence selects ---- */
const S = await (async () => {
  const p2 = await br.newPage();
  const e2 = []; p2.on("pageerror", e => e2.push(String(e)));
  await p2.addInitScript(() => localStorage.clear());
  await p2.goto(`${base}/studio-pro.html`, { waitUntil: "load" });
  await p2.waitForFunction(() => window.__spUI && window.SPIntent, { timeout: 30000 });
  const r = await p2.evaluate(async () => {
    const inp = document.getElementById("si-text");
    inp.value = "show every full moon over 19 years as an orbit pattern";
    inp.dispatchEvent(new Event("input", { bubbles: true }));
    document.getElementById("si-go").click();
    await new Promise(r => setTimeout(r, 400));
    const last = window.__spUI.last();
    return { composer: last && last.composer,
             span: window.__spUI.ctx().spanDays,
             chips: document.querySelectorAll("#sp-tray .sprow").length };
  });
  await p2.close();
  return Object.assign(r, { errors: e2.length });
})();

const C = [
  /* "the mutual position of Sūrya and Śukra for the next 200 years as an
     orbit pattern" names no event, and over two centuries the thing that
     recurs is their conjunction — so that is what it resolves to, and the
     readback says the assumption out loud. An earlier draft of this test
     expected two bare longitudes, which would have been the right answer to
     "the mutual position of Sūrya and Śukra" and is the wrong answer to this
     sentence: two longitudes have no pattern over two hundred years, they
     have one value. */
  ["the sentence that was asked for resolves to a pattern of conjunctions",
   A.asked.ok === true && A.asked.sel.length === 1 &&
   A.asked.sel[0] === "cyc.conj.Sūrya-Śukra" && A.asked.force === "rose" &&
   Math.abs(A.asked.span - 200*365.2564) < 2],
  ["and says out loud that it assumed the event",
   !!A.asked.note && /conjunction/.test(A.asked.note)],
  ["every generated suggestion parses to something drawable",
   A.recipes.badCount === 0 && A.recipes.n >= 300],
  ["and they cover many groups", A.recipes.groups >= 10],
  ["it reads the spellings people actually type",
   A.spellingFails.length === 0],
  ["it reads spans in several forms", A.spanFails.length === 0],
  ["it refuses the impossible, with a reason", A.refusalFails.length === 0],
  ["it reports words it could not place rather than discarding them",
   A.odd.reports === true],
  ["manner words change the format, the palette, the length and the titles",
   A.manner.ok === true],
  ["a figure that cannot take the data is said, not silently swapped",
   A.clash.ok === true],

  ["a sentence builds a reel with a title and a figure scene",
   E.scenes === 2 && E.layers[0] >= 4 && E.layers[1] >= 2],
  ["the reel's span is the one the sentence asked for",
   Math.abs(E.spanUsed - 40*365.2564) < 2],
  ["the figure scene draws, and accumulates",
   E.litLate > 0.004 && E.litLate > E.litMid],
  ["the title scene is a different picture", Math.abs(E.litTitle - E.litLate) > 0.002],
  ["the readback says what it understood",
   /Understood/.test(E.readback) && /Will draw/.test(E.readback)],
  ["the suggestions are listed, and typing filters them",
   E.suggestions > 20 && E.filtered > 0 && E.filtered < E.suggestions],

  ["the same sentence works on Studio Pro",
   S.composer === "rose" && Math.abs(S.span - 19*365.2564) < 2 && S.chips >= 1],

  ["no page errors", errs.length === 0 && S.errors === 0]
];
let bad = 0;
for (const [w, ok] of C) { if (!ok) bad++; console.log((ok?"  ok   ":"  FAIL ")+w); }
console.log("");
console.log("  asked for: " + JSON.stringify(A.asked.sel) + " force=" + A.asked.force +
  " span=" + A.asked.span + "  understood=" + JSON.stringify(A.asked.understood));
console.log("  " + A.recipes.n + " suggestions in " + A.recipes.groups +
  " groups, " + A.recipes.badCount + " unparseable");
if (A.recipes.bad.length) console.log("    " + JSON.stringify(A.recipes.bad, null, 1));
if (A.spellingFails.length) console.log("  spelling fails: " + JSON.stringify(A.spellingFails));
if (A.spanFails.length) console.log("  span fails: " + JSON.stringify(A.spanFails));
if (A.refusalFails.length) console.log("  refusal fails: " + JSON.stringify(A.refusalFails));
console.log("  clash: " + JSON.stringify(A.clash));
console.log("  studio: " + JSON.stringify(S));
console.log("  refusals read like: \"" + (A.refusals[0].why || "") + "\"");
console.log("  reel: " + E.scenes + " scenes, layers " + JSON.stringify(E.layers) +
  ", " + E.total.toFixed(1) + "s; lit mid " + E.litMid.toFixed(4) +
  " → late " + E.litLate.toFixed(4));
if (errs.length) errs.slice(0,3).forEach(e => console.log("  page error: " + e));
await br.close(); server.close();
console.log(bad ? "\nFAIL " + bad + " check(s)" : "\nPASS intent-verify");
process.exit(bad?1:0);
