/* Does Director mode actually hand over control?
 *
 *   node source/test/sp-director.mjs
 *
 * Every claim this mode makes is a claim about PIXELS CHANGING WHEN A FIELD
 * CHANGES, and not one of them is visible in a screenshot of a dark canvas.
 * A panel full of sliders that are wired to nothing looks exactly like a
 * panel full of sliders that work, which is why this file compares rendered
 * frames rather than reading the document back:
 *
 *   taking control produces a document, and the document renders;
 *   moving a layer moves pixels, and moves them WHERE it says;
 *   a time window actually withholds a layer — present at one playhead,
 *     absent at another;
 *   every entry, exit and idle motion animates, which is to say two frames
 *     inside its window differ, rather than silently doing nothing;
 *   the editing handles are on the screen and NOT in the export, which is the
 *     one failure here that would be invisible until something was posted;
 *   a recording made in Director records the Director document and not the
 *     Auto reading of the same nodes;
 *   dragging and the keyboard move the thing that was picked;
 *   a saved composition reopens as the same pixels;
 *   and the panel still responds while the animation is running, which is the
 *     fault this page was most recently shipped with.
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
const pg=await br.newPage();
const errs=[]; pg.on("pageerror",e=>errs.push(String(e)));

await pg.addInitScript(() => {
  localStorage.setItem("nirayana.birth", JSON.stringify({
    year:1984,month:5,day:17,hour:14,minute:30,lat:26.85,lon:80.95,
    tzHours:5.5,ayanamsa:"lahiri",node:"mean",name:"Test"}));
  localStorage.removeItem("nirayana.studiopro");
  localStorage.removeItem("nirayana.studio.compositions");
});
await pg.goto(`${base}/studio-pro.html`,{waitUntil:"load"});
await pg.waitForFunction(()=>window.__spUI && window.__spUI.nodeCount()>0,
                         {timeout:30000});

/* ---- helpers inside the page ------------------------------------------- */
await pg.evaluate(() => {
  /* A cheap, stable fingerprint of the canvas, plus one of an arbitrary
     rectangle of it, so a test can ask "did anything change INSIDE this box,
     and did anything change outside it" — which is how placement is checked
     without a reference image. */
  window.__t = {
    hash: function (box) {
      var cv = document.getElementById("sp-canvas");
      var c = cv.getContext("2d");
      var x = box ? Math.round(box.x * cv.width) : 0;
      var y = box ? Math.round(box.y * cv.height) : 0;
      var w = box ? Math.max(1, Math.round(box.w * cv.width)) : cv.width;
      var h = box ? Math.max(1, Math.round(box.h * cv.height)) : cv.height;
      var d = c.getImageData(x, y, w, h).data;
      var a = 5381, b = 52711, ink = 0;
      for (var i = 0; i < d.length; i += 4) {
        var v = d[i] + d[i + 1] * 3 + d[i + 2] * 7;
        a = (a * 33 + v) & 0x7fffffff;
        b = (b ^ (v + i)) & 0x7fffffff;
        if (d[i] + d[i + 1] + d[i + 2] > 120) ink++;
      }
      return { h: a + ":" + b, ink: ink, px: (d.length / 4) };
    },
    /* how much of a box is lit — the measure that says "something is drawn
       here" without caring what */
    lit: function (box) { var q = this.hash(box); return q.ink / q.px; }
  };
});

const A = {};

/* ======================================================================
   1. Auto is the default, and taking control is reversible
   ====================================================================== */
A.autoFirst = await pg.evaluate(() => window.__spUI.dirOn());

A.take = await pg.evaluate(() => {
  window.__spUI.select(["sky.lon.Sūrya", "sky.lon.Candra"]);
  var auto = window.__t.hash();
  var d = window.__spUI.take("single");
  window.__spUI.exportFrame(1);
  var dir = window.__t.hash();
  return { on: window.__spUI.dirOn(), layers: d.layers.length,
           kinds: d.layers.map(function (L) { return L.kind; }),
           autoInk: auto.ink, dirInk: dir.ink,
           /* the picture is taken over, not replaced: at the end of the reel
              a one-layer document of the same selection should be lit to
              about the same extent as the Auto frame it came from */
           ratio: dir.ink / Math.max(1, auto.ink) };
});
A.backToAuto = await pg.evaluate(() => {
  var was = window.__spUI.dirOn();
  var now = window.__spUI.setAuto();
  return { was: was, now: now };
});

A.split = await pg.evaluate(() => {
  window.__spUI.select(["sky.all", "bala.total_rupa", "dasha.maha"]);
  var d = window.__spUI.take("split");
  return { layers: d.layers.length,
           views: d.layers.filter(function (L) { return L.kind === "view"; }).length,
           /* a split document must not stack every layer at zero, or it is
              four animations sharing a canvas rather than one scene */
           starts: d.layers.filter(function (L) { return L.kind === "view"; })
                     .map(function (L) { return +L.t0.toFixed(2); }) };
});
A.solo = await pg.evaluate(() => {
  window.__spUI.select(["sky.lon.Sūrya", "sky.lon.Candra", "geo.naks"]);
  var d = window.__spUI.take("solo");
  return { views: d.layers.filter(function (L) { return L.kind === "view"; }).length };
});

/* ======================================================================
   2. Placement — does moving a layer move the picture, and move it there?
   ====================================================================== */
A.place = await pg.evaluate(() => {
  var D = window.SPDirector;
  window.__spUI.select(["sky.all"]);
  window.__spUI.take("single");
  var L = D.doc().layers.filter(function (q) { return q.kind === "view"; })[0];
  D.pick(L.id);
  /* top-left quarter, then bottom-right quarter; the lit box must follow */
  L.rect = { x: 0.02, y: 0.10, w: 0.44, h: 0.30 };
  L.enter = { k: "none", len: 0 };
  window.__spUI.exportFrame(1);
  var tlThere = window.__t.lit({ x: 0.02, y: 0.10, w: 0.44, h: 0.30 });
  var brEmpty = window.__t.lit({ x: 0.54, y: 0.55, w: 0.44, h: 0.30 });
  L.rect = { x: 0.54, y: 0.55, w: 0.44, h: 0.30 };
  window.__spUI.exportFrame(1);
  var tlAfter = window.__t.lit({ x: 0.02, y: 0.10, w: 0.44, h: 0.30 });
  var brThere = window.__t.lit({ x: 0.54, y: 0.55, w: 0.44, h: 0.30 });
  return { tlThere: tlThere, brEmpty: brEmpty, tlAfter: tlAfter, brThere: brThere };
});

/* resizing, and the stated minimum */
A.resize = await pg.evaluate(() => {
  var D = window.SPDirector, L = D.current();
  L.rect = { x: 0.1, y: 0.2, w: 0.8, h: 0.5 };
  window.__spUI.exportFrame(1);
  var big = window.__t.lit({ x: 0.1, y: 0.2, w: 0.8, h: 0.5 }) ;
  L.rect = { x: 0.1, y: 0.2, w: 0.25, h: 0.16 };
  window.__spUI.exportFrame(1);
  var small = window.__t.lit({ x: 0.1, y: 0.2, w: 0.8, h: 0.5 });
  return { big: big, small: small, shrank: small < big * 0.6 };
});

/* dragging, through the same code path the pointer uses */
A.drag = await pg.evaluate(() => {
  var D = window.SPDirector, L = D.current();
  L.rect = { x: 0.20, y: 0.30, w: 0.40, h: 0.25 };
  var g = D.hit(0.40, 0.42, 1, "rect");     /* inside it — a move grab */
  var start = { x: L.rect.x, y: L.rect.y, w: L.rect.w, h: L.rect.h };
  D.dragTo(g, start, 0.10, -0.05, false);
  var moved = { x: +L.rect.x.toFixed(3), y: +L.rect.y.toFixed(3),
                w: +L.rect.w.toFixed(3), h: +L.rect.h.toFixed(3) };
  /* a corner handle must resize, not move */
  L.rect = { x: 0.20, y: 0.30, w: 0.40, h: 0.25 };
  var g2 = D.hit(0.60, 0.55, 1, "rect");    /* the SE corner */
  D.dragTo(g2, { x: 0.20, y: 0.30, w: 0.40, h: 0.25 }, 0.10, 0.10, false);
  var sized = { x: +L.rect.x.toFixed(3), y: +L.rect.y.toFixed(3),
                w: +L.rect.w.toFixed(3), h: +L.rect.h.toFixed(3) };
  /* snapping to the grid */
  L.rect = { x: 0.20, y: 0.30, w: 0.40, h: 0.25 };
  D.dragTo(g, { x: 0.20, y: 0.30, w: 0.40, h: 0.25 }, 0.013, 0.013, true);
  /* full precision: rounding the result to four places before asking whether
     it sits on a twenty-fourth is a test that fails on its own arithmetic */
  var snapped = { x: L.rect.x, y: L.rect.y };
  var grid = 1 / 24;
  return { grab: g && g.mode, moved: moved, grab2: g2 && g2.mode, sized: sized,
           snapped: snapped,
           onGrid: Math.abs(snapped.x / grid - Math.round(snapped.x / grid)) < 1e-6 &&
                   Math.abs(snapped.y / grid - Math.round(snapped.y / grid)) < 1e-6 };
});

/* a locked layer is not picked up */
A.locked = await pg.evaluate(() => {
  var D = window.SPDirector, L = D.current();
  L.rect = { x: 0.2, y: 0.3, w: 0.4, h: 0.25 };
  L.locked = true;
  var g = D.hit(0.40, 0.42, 1, "rect");
  var sameLayer = !!(g && g.id === L.id);
  L.locked = false;
  return { pickedAnyway: sameLayer };
});

/* ======================================================================
   3. Time — does a window actually withhold a layer?
   ====================================================================== */
/* Measured against the SAME FRAME WITH THE LAYER HIDDEN rather than against
   zero. A dark canvas is not empty — it carries a gradient, a hundred and
   fifty stars and, with the safe zones on, two guide rectangles — so "is
   anything lit here" cannot distinguish a withheld layer from a present one.
   What can: hide the layer, render the identical frame, and compare. An
   earlier draft of this file asserted against an absolute threshold and
   passed in one direction and failed in the other for that reason, which is
   the test being wrong rather than the code. */
A.time = await pg.evaluate(() => {
  var D = window.SPDirector;
  D.newDoc({ on: true });
  D.setOn(true);
  var box = { x: 0.10, y: 0.12, w: 0.80, h: 0.40 };
  var L = D.add({ kind: "view", sel: ["sky.all"], rect: box,
                  t0: 0.50, t1: 1.00, enter: { k: "none", len: 0 } });
  function at(p) { window.__spUI.exportFrame(p); return window.__t.lit(box); }
  function bare(p) {
    L.hidden = true; var q = at(p); L.hidden = false; return q;
  }
  var before = at(0.20), beforeBare = bare(0.20);
  var during = at(0.80), duringBare = bare(0.80);
  L.t0 = 0; L.t1 = 0.40;
  var early = at(0.20), earlyBare = bare(0.20);
  var after = at(0.90), afterBare = bare(0.90);
  return {
    /* "absent" means indistinguishable from the frame without the layer */
    beforeAbsent: Math.abs(before - beforeBare) < 1e-9,
    afterAbsent: Math.abs(after - afterBare) < 1e-9,
    duringPresent: during - duringBare > 0.004,
    earlyPresent: early - earlyBare > 0.004,
    nums: { before: before, beforeBare: beforeBare, during: during,
            duringBare: duringBare, early: early, earlyBare: earlyBare,
            after: after, afterBare: afterBare } };
});

/* sequencing presets put layers in a row rather than on top of each other */
A.sequence = await pg.evaluate(() => {
  var D = window.SPDirector;
  window.__spUI.select(["sky.all", "bala.total_rupa", "dasha.maha"]);
  window.__spUI.take("split");
  D.sequence("relay");
  var Ls = D.doc().layers.filter(function (L) { return !L.hidden; });
  var wins = Ls.map(function (L) { return [+L.t0.toFixed(3), +L.t1.toFixed(3)]; });
  var overlap = 0;
  for (var i = 1; i < wins.length; i++)
    if (wins[i][0] < wins[i - 1][1] - 1e-6) overlap++;
  return { n: wins.length, wins: wins, overlap: overlap };
});

/* arrangement presets actually re-lay the views */
A.arrange = await pg.evaluate(() => {
  var D = window.SPDirector, out = {};
  window.__spUI.select(["sky.all", "bala.total_rupa", "dasha.maha"]);
  window.__spUI.take("split");
  Object.keys(D.ARRANGE).forEach(function (k) {
    D.arrange(k);
    var vs = D.doc().layers.filter(function (L) { return L.kind === "view"; });
    out[k] = vs.map(function (L) {
      return [+L.rect.x.toFixed(3), +L.rect.y.toFixed(3),
              +L.rect.w.toFixed(3), +L.rect.h.toFixed(3)].join(","); }).join("|");
  });
  var uniq = {}, n = 0;
  Object.keys(out).forEach(function (k) { if (!uniq[out[k]]) { uniq[out[k]] = 1; n++; } });
  return { presets: Object.keys(out).length, distinct: n };
});

/* ======================================================================
   4. Motion — does every named motion actually move?
   ====================================================================== */
A.motion = await pg.evaluate(() => {
  var D = window.SPDirector;
  function frames(setup) {
    D.newDoc({ on: true }); D.setOn(true);
    var L = D.add({ kind: "view", sel: ["sky.all"],
                    rect: { x: 0.15, y: 0.15, w: 0.70, h: 0.45 },
                    enter: { k: "none", len: 0 }, exit: { k: "none", len: 0 },
                    idle: { k: "none", amt: 1 } });
    setup(L);
    var hs = [];
    [0.02, 0.18, 0.40, 0.62, 0.86, 0.99].forEach(function (p) {
      window.__spUI.exportFrame(p);
      hs.push(window.__t.hash().h);
    });
    var u = {}, n = 0;
    hs.forEach(function (h) { if (!u[h]) { u[h] = 1; n++; } });
    return n;
  }
  var enters = {}, exits = {}, idles = {};
  Object.keys(D.ENTER).forEach(function (k) {
    enters[k] = frames(function (L) { L.enter = { k: k, len: 0.5 }; });
  });
  Object.keys(D.EXIT).forEach(function (k) {
    exits[k] = frames(function (L) {
      L.enter = { k: "none", len: 0 }; L.exit = { k: k, len: 0.5 }; });
  });
  Object.keys(D.IDLE).forEach(function (k) {
    idles[k] = frames(function (L) { L.idle = { k: k, amt: 1 }; });
  });
  return { enters: enters, exits: exits, idles: idles };
});

/* a move between two rectangles */
A.travel = await pg.evaluate(() => {
  var D = window.SPDirector;
  D.newDoc({ on: true }); D.setOn(true);
  var L = D.add({ kind: "view", sel: ["sky.all"],
                  rect: { x: 0.03, y: 0.08, w: 0.42, h: 0.28 },
                  to:   { x: 0.55, y: 0.58, w: 0.42, h: 0.28 },
                  enter: { k: "none", len: 0 }, ease: "linear" });
  window.__spUI.exportFrame(0.0);
  var startTL = window.__t.lit({ x: 0.03, y: 0.08, w: 0.42, h: 0.28 });
  var startBR = window.__t.lit({ x: 0.55, y: 0.58, w: 0.42, h: 0.28 });
  window.__spUI.exportFrame(1.0);
  var endTL = window.__t.lit({ x: 0.03, y: 0.08, w: 0.42, h: 0.28 });
  var endBR = window.__t.lit({ x: 0.55, y: 0.58, w: 0.42, h: 0.28 });
  return { startTL: startTL, startBR: startBR, endTL: endTL, endBR: endBR };
});

/* the composer's own clock: held means held */
A.clock = await pg.evaluate(() => {
  var D = window.SPDirector;
  function hashes(clock) {
    D.newDoc({ on: true }); D.setOn(true);
    D.add({ kind: "view", sel: ["dasha.gears"],
            rect: { x: 0.1, y: 0.15, w: 0.8, h: 0.5 },
            enter: { k: "none", len: 0 }, clock: clock, at: 0.5 });
    var a = (window.__spUI.exportFrame(0.25), window.__t.hash().h);
    var b = (window.__spUI.exportFrame(0.85), window.__t.hash().h);
    return a === b;
  }
  return { frozenIsStill: hashes("frozen"), layerMoves: !hashes("layer") };
});

/* ======================================================================
   5. The handles are on the screen and never in the export
   ====================================================================== */
A.handles = await pg.evaluate(() => {
  var D = window.SPDirector;
  window.__spUI.select(["sky.all"]);
  window.__spUI.take("single");
  var L = D.doc().layers.filter(function (q) { return q.kind === "view"; })[0];
  D.pick(L.id);
  window.__spUI.exportFrame(0.6);
  var exp = window.__t.hash();
  window.__spUI.screenFrame(0.6);
  var scr = window.__t.hash();
  /* and with nothing picked, the two must be identical — the overlay is the
     only difference between them */
  D.pick(null);
  window.__spUI.exportFrame(0.6);
  var exp2 = window.__t.hash();
  window.__spUI.screenFrame(0.6);
  var scr2 = window.__t.hash();
  return { differWhenPicked: exp.h !== scr.h,
           sameWhenNot: exp2.h === scr2.h,
           overlayAdds: scr.ink > exp.ink };
});

/* ======================================================================
   6. A recording in Director records the Director document
   ====================================================================== */
A.record = await pg.evaluate(async () => {
  var D = window.SPDirector;
  D.newDoc({ on: true }); D.setOn(true);
  /* a document deliberately unlike anything Auto would draw for this
     selection: the diagram in a corner and a line of text across the top */
  D.add({ kind: "view", sel: ["sky.all"],
          rect: { x: 0.55, y: 0.62, w: 0.42, h: 0.28 },
          enter: { k: "none", len: 0 } });
  D.add({ kind: "text", text: "DIRECTOR", size: 0.06, lines: 1,
          rect: { x: 0.08, y: 0.06, w: 0.84, h: 0.10 },
          enter: { k: "none", len: 0 } });
  var head = window.__t.lit({ x: 0.08, y: 0.06, w: 0.84, h: 0.10 });
  var frames = [];
  var res = await window.SPStage.record(["sky.all"], window.__spUI.ctx(), 2, 10,
    null, function () { frames.push(window.__t.lit({ x: 0.08, y: 0.06, w: 0.84, h: 0.10 })); });
  return { ok: !!res.blob, bytes: res.blob.size, frames: frames.length,
           headlineLitBeforeRecord: head,
           /* every captured frame must still show the text layer in the place
              the document puts it; an Auto frame would have nothing there */
           headlineLitInEveryFrame: frames.length > 2 &&
             frames.every(function (q) { return q > 0.001; }) };
});

/* ======================================================================
   7. Tokens, and saving
   ====================================================================== */
A.tokens = await pg.evaluate(() => {
  var D = window.SPDirector, C = window.__spUI.ctx();
  var out = {};
  D.tokens().forEach(function (t) { out[t] = D.expand(t, C); });
  return { map: out,
           unresolved: Object.keys(out).filter(function (k) { return out[k] === k; }),
           /* a token that does not exist prints as itself rather than as
              "undefined", so a typo is visible on the frame */
           bogus: D.expand("{nosuch}", C) };
});

A.save = await pg.evaluate(() => {
  var D = window.SPDirector;
  D.newDoc({ on: true }); D.setOn(true);
  D.add({ kind: "view", sel: ["bala.total_rupa"],
          rect: { x: 0.12, y: 0.22, w: 0.62, h: 0.34 },
          t0: 0.1, t1: 0.9, enter: { k: "pop", len: 0.3 },
          idle: { k: "drift", amt: 1.5 }, rot: 7, opacity: 0.85 });
  D.add({ kind: "text", text: "{tithi}", size: 0.04,
          rect: { x: 0.1, y: 0.70, w: 0.8, h: 0.08 } });
  window.__spUI.exportFrame(0.55);
  var before = window.__t.hash().h;
  var name = D.save("harness");
  D.newDoc({ on: true }); D.setOn(true);
  window.__spUI.exportFrame(0.55);
  var blank = window.__t.hash().h;
  var ok = D.load("harness");
  window.__spUI.exportFrame(0.55);
  var after = window.__t.hash().h;
  var listed = D.saved().map(function (q) { return q.name; });
  D.drop("harness");
  return { name: name, loaded: ok, same: before === after,
           blankDiffers: blank !== before, listed: listed,
           goneAfterDrop: D.saved().filter(function (q) {
             return q.name === "harness"; }).length === 0 };
});

/* ======================================================================
   8. Every layer kind draws, and nothing in the document can throw
   ====================================================================== */
A.kinds = await pg.evaluate(() => {
  var D = window.SPDirector, out = {};
  Object.keys(D.KINDS).forEach(function (k) {
    D.newDoc({ on: true }); D.setOn(true);
    var o = { kind: k, rect: { x: 0.1, y: 0.2, w: 0.8, h: 0.3 },
              enter: { k: "none", len: 0 } };
    if (k === "view") o.sel = ["sky.all"];
    if (k === "text") { o.text = "Example line of text"; o.size = 0.04; }
    if (k === "band") { o.text = "A headline"; o.sub = "and a sub-line"; }
    if (k === "stamp") o.text = "{date}";
    D.add(o);
    var rep = window.SPDirector.render(window.__spUI.ctx(), 0.7, false);
    out[k] = { lit: window.__t.lit({ x: 0.08, y: 0.18, w: 0.84, h: 0.34 }),
               errors: (rep.errors || []).length,
               empty: (rep.empty || []).length };
  });
  return out;
});

/* The almanac leaf is a whole page — it paints paper to the frame's edge and
   carries its own foot. Placed in a box it must stay in the box, and "stay"
   is again measured against the same frame without it rather than against an
   empty canvas, which the safe-zone guides alone would fail. */
A.leaf = await pg.evaluate(() => {
  var D = window.SPDirector;
  D.newDoc({ on: true }); D.setOn(true);
  var L = D.add({ kind: "view", sel: ["day.almanac"],
                  rect: { x: 0.30, y: 0.30, w: 0.40, h: 0.30 },
                  enter: { k: "none", len: 0 } });
  var IN = { x: 0.31, y: 0.31, w: 0.38, h: 0.28 };
  var OUT = { x: 0.02, y: 0.80, w: 0.26, h: 0.14 };
  window.__spUI.exportFrame(0.9);
  var inLit = window.__t.lit(IN), outLit = window.__t.lit(OUT);
  L.hidden = true;
  window.__spUI.exportFrame(0.9);
  var inBare = window.__t.lit(IN), outBare = window.__t.lit(OUT);
  return { inGain: inLit - inBare, outGain: Math.abs(outLit - outBare),
           inLit: inLit, outLit: outLit };
});

/* Clipping. A composer sizes its diagram from the rect but puts its labels
   where its own layout puts them, which in a small rect can be outside it —
   right in Auto mode, where the rect is the whole stage, and wrong the moment
   two layers sit side by side. The box must be able to mean what it looks
   like it means. */
A.clip = await pg.evaluate(() => {
  var D = window.SPDirector;
  D.newDoc({ on: true }); D.setOn(true);
  /* A case that certainly overflows: a line of type far taller than the box
     it is placed in. An earlier draft used a diagram composer in a small rect
     and measured no spill, which proved only that THAT composer keeps to its
     rect — a property of the composer, not of clipping. */
  var BOX = { x: 0.10, y: 0.480, w: 0.80, h: 0.010 };
  var OUT = { x: 0.10, y: 0.515, w: 0.80, h: 0.050 };
  var L = D.add({ kind: "text", text: "Mg", size: 0.14, lines: 1,
                  col: "ink", rect: BOX, enter: { k: "none", len: 0 } });
  L.hidden = true;
  window.__spUI.exportFrame(1);
  var bare = window.__t.lit(OUT);
  L.hidden = false; L.clip = false;
  window.__spUI.exportFrame(1);
  var loose = window.__t.lit(OUT);
  L.clip = true;
  window.__spUI.exportFrame(1);
  var tight = window.__t.lit(OUT);
  var inside = window.__t.lit(BOX);
  return { bare: bare, loose: loose, tight: tight, inside: inside,
           spillsWhenLoose: loose - bare > 1e-9,
           noSpillWhenClipped: Math.abs(tight - bare) < 1e-9,
           stillDrawsInside: inside > 0.01 };
});

/* a layer whose nodes do not resolve says so rather than drawing nothing in
   silence — the page's standing promise about anything it drops */
A.honest = await pg.evaluate(() => {
  var D = window.SPDirector;
  D.newDoc({ on: true }); D.setOn(true);
  D.add({ kind: "view", sel: [], rect: { x: 0.1, y: 0.2, w: 0.8, h: 0.3 } });
  D.add({ kind: "view", sel: ["no.such.node"], rect: { x: 0.1, y: 0.6, w: 0.8, h: 0.3 } });
  var rep = window.SPDirector.render(window.__spUI.ctx(), 0.8, false);
  return { empty: (rep.empty || []).length, missing: (rep.missing || []).length,
           reasons: (rep.empty || []).map(function (q) { return q.why; }) };
});

/* ======================================================================
   9. The panel still responds while the animation runs — in Director too
   ====================================================================== */
A.perf = await (async () => {
  await pg.evaluate(() => {
    var D = window.SPDirector;
    window.__spUI.select(["sky.all", "bala.total_rupa", "dasha.maha", "av.sav"]);
    window.__spUI.take("split");
    /* a deliberately heavy document: eight layers, all moving */
    D.doc().layers.forEach(function (L, i) {
      L.hidden = false;
      L.idle = { k: ["drift", "bob", "pulse", "sway"][i % 4], amt: 1 };
      L.enter = { k: ["rise", "pop", "wipeL", "zoom"][i % 4], len: 0.3 };
    });
    window.__spUI.refreshDir(true);
  });
  const cdp = await pg.context().newCDPSession(pg);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  /* Timed at frameAt, which is what the playback loop actually calls — the
     loop reaches it through window, so wrapping it here measures the real
     frames rather than the ones the harness asks for. */
  await pg.evaluate(() => {
    window.__fr = [];
    var raw = window.SPStage.frameAt;
    window.SPStage.frameAt = function () {
      var t = performance.now();
      var r = raw.apply(window.SPStage, arguments);
      window.__fr.push(performance.now() - t);
      return r;
    };
  });
  await pg.click("#sp-play");
  await pg.evaluate(() => new Promise(r => setTimeout(r, 2200)));
  /* while it plays: change a layer, and pause */
  const during = await pg.evaluate(async () => {
    var D = window.SPDirector;
    var t0 = performance.now();
    var btns = document.querySelectorAll("#sp-presets .spbtn");
    btns[1].click();                                /* an arrangement */
    var arranged = performance.now() - t0;
    var L = D.doc().layers.filter(function (q) { return q.kind === "view"; })[0];
    var took = L.rect.y !== null;
    /* and the real test of a live panel: pick a different layer from the
       stack while the reel is running */
    var rows = document.querySelectorAll("#sp-stack .spdname");
    var was = D.picked();
    if (rows.length > 1) rows[1].click();
    return { arrangeMs: arranged, took: took,
             pickChanged: D.picked() !== was, playing: window.__spUI.playing() };
  });
  const t0 = Date.now();
  await pg.click("#sp-play");
  const clickMs = Date.now() - t0;
  const after = await pg.evaluate(async () => {
    var lab = document.getElementById("sp-play").textContent;
    var a = window.SPStage.S.p;
    await new Promise(r => setTimeout(r, 450));
    var b = window.SPStage.S.p;
    var f = (window.__fr || []).slice().sort(function (x, y) { return x - y; });
    return { label: lab, frozen: Math.abs(a - b) < 1e-9,
             median: f.length ? f[Math.floor(f.length / 2)] : 0,
             worst: f.length ? f[f.length - 1] : 0, n: f.length };
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  return Object.assign({}, during, after, { clickMs: clickMs });
})();

/* ======================================================================
   10. On a phone
   A panel with thirty fields per layer is the easiest thing on this site to
   make unusable at 393 pixels wide, and the failure is silent: everything
   renders, nothing overflows visibly, and the controls are simply too small
   and too close to hit. So the targets are measured rather than looked at.
   ====================================================================== */
A.phone = await (async () => {
  const ph = await br.newPage({ viewport: { width: 393, height: 852 },
                                isMobile: true, hasTouch: true,
                                deviceScaleFactor: 3 });
  const perr = []; ph.on("pageerror", e => perr.push(String(e)));
  await ph.addInitScript(() => {
    localStorage.setItem("nirayana.birth", JSON.stringify({
      year:1984,month:5,day:17,hour:14,minute:30,lat:26.85,lon:80.95,
      tzHours:5.5,ayanamsa:"lahiri",node:"mean",name:"Test"}));
    localStorage.removeItem("nirayana.studiopro");
  });
  await ph.goto(`${base}/studio-pro.html`, { waitUntil: "load" });
  await ph.waitForFunction(() => window.__spUI && window.__spUI.nodeCount() > 0,
                           { timeout: 30000 });
  const out = await ph.evaluate(() => {
    window.__spUI.select(["sky.all", "bala.total_rupa"]);
    window.__spUI.take("split");
    var small = [], sel = "#sp-dirpanel button, #sp-dirpanel select, " +
                          "#sp-dirpanel input, #sp-timeline .spdtbar";
    [].forEach.call(document.querySelectorAll(sel), function (e) {
      if (e.type === "checkbox" || e.type === "range" || e.hidden) return;
      var r = e.getBoundingClientRect();
      if (r.width < 1 && r.height < 1) return;
      if (r.height < 36) small.push((e.id || e.className || e.tagName) +
                                    " " + Math.round(r.height));
    });
    return {
      layers: window.SPDirector.doc().layers.length,
      overflow: document.documentElement.scrollWidth -
                document.documentElement.clientWidth,
      smallTargets: small.slice(0, 6), smallCount: small.length,
      panelWidth: Math.round(
        document.getElementById("sp-dirpanel").getBoundingClientRect().width),
      canvasTouch: getComputedStyle(document.getElementById("sp-canvas")).touchAction
    };
  });
  /* and a real finger: drag a layer across the frame */
  const moved = await ph.evaluate(async () => {
    var D = window.SPDirector;
    var L = D.doc().layers.filter(function (q) { return q.kind === "view"; })[0];
    D.pick(L.id);
    L.rect = { x: 0.20, y: 0.30, w: 0.50, h: 0.25 };
    window.__spUI.screenFrame(0.9);
    var cv = document.getElementById("sp-canvas");
    var r = cv.getBoundingClientRect();
    function pt(type, fx, fy) {
      cv.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true,
        pointerId: 1, pointerType: "touch", isPrimary: true,
        clientX: r.left + r.width * fx, clientY: r.top + r.height * fy }));
    }
    pt("pointerdown", 0.45, 0.42);
    pt("pointermove", 0.55, 0.52);
    pt("pointerup", 0.55, 0.52);
    return { x: +L.rect.x.toFixed(3), y: +L.rect.y.toFixed(3) };
  });
  await ph.close();
  return Object.assign(out, { dragged: moved, errors: perr.length });
})();

/* the panel exists and is wired */
A.panel = await pg.evaluate(() => ({
  modeButtons: document.querySelectorAll("#sp-modebar .spv").length,
  stackRows: document.querySelectorAll("#sp-stack .spdlayer").length,
  inspectorFields: document.querySelectorAll("#sp-insp input, #sp-insp select").length,
  timelineRows: document.querySelectorAll("#sp-timeline .spdtrow").length,
  addButtons: document.querySelectorAll("#sp-addbar .spbtn").length,
  arrangeButtons: document.querySelectorAll("#sp-presets .spbtn").length,
  autoPaneHidden: !!document.getElementById("sp-autoonly").hidden,
  status: (document.getElementById("sp-dstat") || {}).textContent || ""
}));

/* ---- the assertions ----------------------------------------------------- */
const checks = [
  ["Auto is the mode a visitor lands in", A.autoFirst === false],
  ["taking control builds a document that renders",
   A.take.on === true && A.take.layers >= 3 && A.take.dirInk > 500],
  ["taking control keeps the picture rather than replacing it",
   A.take.ratio > 0.45 && A.take.ratio < 2.2],
  ["the document carries the chrome as editable layers",
   A.take.kinds.indexOf("band") >= 0 && A.take.kinds.indexOf("stamp") >= 0],
  ["Auto is one click back", A.backToAuto.was === true && A.backToAuto.now === false],
  ["taking a selection apart gives each kind its own layer", A.split.views >= 3],
  ["a split document staggers its layers rather than stacking them at zero",
   new Set(A.split.starts).size > 1],
  ["one layer per node does that", A.solo.views === 3],

  ["moving a layer moves the picture with it",
   A.place.tlThere > 0.004 && A.place.brEmpty < A.place.tlThere * 0.25 &&
   A.place.brThere > 0.004 && A.place.tlAfter < A.place.brThere * 0.25],
  ["resizing a layer resizes the picture", A.resize.shrank === true],
  ["dragging the body moves and does not resize",
   A.drag.grab === "move" && Math.abs(A.drag.moved.x - 0.30) < 1e-6 &&
   Math.abs(A.drag.moved.y - 0.25) < 1e-6 &&
   Math.abs(A.drag.moved.w - 0.40) < 1e-6],
  ["dragging a corner resizes and does not move",
   /^(se|e|s)$/.test(A.drag.grab2) &&
   Math.abs(A.drag.sized.x - 0.20) < 1e-6 && A.drag.sized.w > 0.40],
  ["Shift snaps to the grid", A.drag.onGrid === true],
  ["a locked layer is not picked up by dragging", A.locked.pickedAnyway === false],

  ["a time window withholds a layer before it starts",
   A.time.duringPresent === true && A.time.beforeAbsent === true],
  ["and after it ends",
   A.time.earlyPresent === true && A.time.afterAbsent === true],
  ["the one-at-a-time preset leaves no two layers overlapping",
   A.sequence.n >= 3 && A.sequence.overlap === 0],
  ["every arrangement preset produces a different geometry",
   A.arrange.distinct === A.arrange.presets],

  ["every entry animates", Object.keys(A.motion.enters).every(k =>
    k === "none" ? true : A.motion.enters[k] >= 3)],
  ["every exit animates", Object.keys(A.motion.exits).every(k =>
    k === "none" ? true : A.motion.exits[k] >= 3)],
  ["every continuous motion animates", Object.keys(A.motion.idles).every(k =>
    k === "none" ? true : A.motion.idles[k] >= 3)],
  ["a layer travels from its first rectangle to its second",
   A.travel.startTL > 0.004 && A.travel.startBR < A.travel.startTL * 0.25 &&
   A.travel.endBR > 0.004 && A.travel.endTL < A.travel.endBR * 0.25],
  ["a held clock holds the drawing still, a layer clock does not",
   A.clock.frozenIsStill === true && A.clock.layerMoves === true],

  ["the editing handles are drawn on the screen",
   A.handles.differWhenPicked === true && A.handles.overlayAdds === true],
  ["and the export is the frame without them", A.handles.sameWhenNot === true],

  ["a recording in Director records the Director document",
   A.record.ok === true && A.record.bytes > 2000 &&
   A.record.headlineLitInEveryFrame === true],

  ["every token resolves against this moment",
   A.tokens.unresolved.length === 0],
  ["an unknown token prints as itself rather than as nothing",
   A.tokens.bogus === "{nosuch}"],
  ["a composition saves and reopens as the same frame",
   A.save.name === "harness" && A.save.loaded === true &&
   A.save.same === true && A.save.blankDiffers === true],
  ["and can be forgotten", A.save.goneAfterDrop === true],

  ["every layer kind draws something", Object.keys(A.kinds).every(k =>
    A.kinds[k].lit > 0.0004 && A.kinds[k].errors === 0)],
  ["the almanac leaf placed in a box stays in the box",
   A.leaf.inGain > 0.02 && A.leaf.outGain < 1e-9],
  ["a layer can be clipped to its box, and is not by default",
   A.clip.spillsWhenLoose === true && A.clip.noSpillWhenClipped === true &&
   A.clip.stillDrawsInside === true],
  ["a layer that can draw nothing says why rather than drawing nothing",
   A.honest.empty === 2 && A.honest.reasons.every(r => !!r)],

  ["the panel responds while the animation is running",
   A.perf.took === true && A.perf.pickChanged === true && A.perf.playing === true],
  ["an arrangement applied mid-playback returns promptly",
   A.perf.arrangeMs < 400],
  ["Pause works while the animation is running",
   A.perf.label === "Play" && A.perf.frozen === true],
  ["playback does not block the main thread in long chunks",
   A.perf.median < 90 && A.perf.worst < 450],

  ["the panel is built and wired",
   A.panel.modeButtons === 2 && A.panel.stackRows >= 3 &&
   A.panel.inspectorFields >= 12 && A.panel.timelineRows >= 4 &&
   A.panel.addButtons === 6 && A.panel.arrangeButtons >= 11 &&
   A.panel.autoPaneHidden === true],
  ["the panel is usable on a phone",
   A.phone.layers >= 3 && A.phone.overflow <= 1 && A.phone.smallCount === 0],
  ["a finger drags a layer on a phone",
   Math.abs(A.phone.dragged.x - 0.30) < 0.02 &&
   Math.abs(A.phone.dragged.y - 0.40) < 0.02],
  ["the canvas only swallows touch while layers are draggable",
   A.phone.canvasTouch === "none"],
  ["no page errors", errs.length === 0 && A.phone.errors === 0]
];

let bad = 0;
for (const [what, ok] of checks) {
  if (!ok) bad++;
  console.log((ok ? "  ok   " : "  FAIL ") + what);
}
console.log("");
console.log("  took control: " + A.take.layers + " layers, ink ratio to Auto " +
            A.take.ratio.toFixed(2));
console.log("  motions: " + Object.keys(A.motion.enters).length + " entries, " +
            Object.keys(A.motion.exits).length + " exits, " +
            Object.keys(A.motion.idles).length + " continuous");
console.log("  arrangements: " + A.arrange.presets + ", all distinct: " +
            (A.arrange.distinct === A.arrange.presets));
console.log("  while playing in Director: median frame " +
            A.perf.median.toFixed(1) + "ms, worst " + A.perf.worst.toFixed(1) +
            "ms over " + A.perf.n + " frames; arrangement mid-play " +
            A.perf.arrangeMs.toFixed(0) + "ms; pause \"" + A.perf.label + "\"");
console.log("  recorded " + Math.round(A.record.bytes / 1024) + " KB with the " +
            "text layer present in all " + A.record.frames + " sampled frames");
console.log("  phone: " + A.phone.panelWidth + "px panel, " + A.phone.smallCount + " undersized target(s) " + JSON.stringify(A.phone.smallTargets) + ", dragged to " + JSON.stringify(A.phone.dragged));
console.log("  panel: " + A.panel.status);
if (errs.length) errs.slice(0, 4).forEach(e => console.log("  page error: " + e));

await br.close(); server.close();
console.log(bad ? "\nFAIL " + bad + " check(s)" : "\nPASS sp-director");
process.exit(bad ? 1 : 0);
