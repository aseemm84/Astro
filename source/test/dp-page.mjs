/* Does Director Pro actually keyframe?
 *
 *   node source/test/dp-page.mjs
 *
 * Every claim this page makes is a claim about pixels changing when a key
 * moves, and not one of them shows up in a screenshot of a dark canvas. A
 * keyframe editor whose keys are decorative looks exactly like one whose keys
 * drive the picture, so this file compares rendered frames:
 *
 *   a key written at one time and another at a second actually interpolates
 *     between them, and does so with the easing it was given;
 *   a preset BAKES — it writes keys rather than setting a mode, which is
 *     checked by moving a key the preset wrote and seeing the motion change;
 *   every entry, exit and continuous preset writes keys and animates;
 *   every transition renders and is genuinely between two scenes;
 *   a transition does not change where any later scene starts;
 *   effects, masks and blend modes change the frame;
 *   text animators arrive over time rather than all at once;
 *   the camera moves the whole scene and not one layer;
 *   undo restores the exact frame, which is a stronger claim than restoring
 *     the document, because it catches a field that was missed;
 *   the handles are on the screen and never in the export;
 *   a recording lasts the length it advertises;
 *   and the panel still responds while the reel is playing.
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
const pg=await br.newPage({viewport:{width:1600,height:1100}});
const errs=[]; pg.on("pageerror",e=>errs.push(String(e)));

await pg.addInitScript(() => {
  localStorage.setItem("nirayana.birth", JSON.stringify({
    year:1984,month:5,day:17,hour:14,minute:30,lat:26.85,lon:80.95,
    tzHours:5.5,ayanamsa:"lahiri",node:"mean",name:"Test"}));
  localStorage.removeItem("nirayana.directorpro");
  localStorage.removeItem("nirayana.directorpro.reels");
});
await pg.goto(`${base}/director-pro.html`,{waitUntil:"load"});
await pg.waitForFunction(()=>window.__dp,{timeout:30000});

await pg.evaluate(() => {
  window.__t = {
    hash: function (box) {
      var cv = document.getElementById("dp-canvas");
      var c = cv.getContext("2d");
      var x = box ? Math.round(box.x * cv.width) : 0;
      var y = box ? Math.round(box.y * cv.height) : 0;
      var w = box ? Math.max(1, Math.round(box.w * cv.width)) : cv.width;
      var h = box ? Math.max(1, Math.round(box.h * cv.height)) : cv.height;
      var d = c.getImageData(x, y, w, h).data;
      var a = 5381, b = 52711, ink = 0, sx = 0, sy = 0, n = 0;
      for (var i = 0; i < d.length; i += 4) {
        var v = d[i] + d[i+1] * 3 + d[i+2] * 7;
        a = (a * 33 + v) & 0x7fffffff;
        b = (b ^ (v + i)) & 0x7fffffff;
        if (d[i] + d[i+1] + d[i+2] > 150) {
          ink++;
          var px = (i / 4) % w, py = Math.floor((i / 4) / w);
          sx += px; sy += py; n++;
        }
      }
      return { h: a + ":" + b, ink: ink, px: d.length / 4,
               /* the centroid of what is lit — the measure that says WHERE a
                  thing is without a reference image */
               cx: n ? sx / n / w : 0, cy: n ? sy / n / h : 0, n: n };
    },
    lit: function (box) { var q = this.hash(box); return q.ink / q.px; }
  };
  /* a clean, known document to test against rather than whatever the page
     opened with */
  window.__fresh = function (o) {
    var M = window.DPModel;
    var d = M.doc(Object.assign({ name: "harness" }, o || {}));
    window.__dp.setDoc(d);
    return window.__dp.doc();
  };
});

const A = {};

/* ===================================================================
   1. Boot
   =================================================================== */
A.boot = await pg.evaluate(() => {
  var d = window.__dp.doc();
  return { scenes: d.scenes.length, layers: d.scenes[0].layers.length,
           total: window.__dp.total(),
           libChips: document.querySelectorAll("#dp-lib .dpchip").length,
           /* the default document must draw something, or the page opens
              looking broken */
           litOnLoad: window.__t.lit() };
});

/* ===================================================================
   2. Keyframes interpolate, and the easing is real
   =================================================================== */
A.interp = await pg.evaluate(() => {
  var M = window.DPModel;
  var d = window.__fresh({ scenes: [{ name: "S", seconds: 10 }] });
  var L = window.__dp.add({ kind: "shape", shape: "disc", col: "gold",
    t0: 0, t1: 10, base: { x: 10, y: 10, w: 16, h: 9 } });
  M.setKey(L.tracks.x, 0, 4, "linear");
  M.setKey(L.tracks.x, 10, 80, "linear");
  function cxAt(t) { window.__dp.exportFrame(t); return window.__t.hash().cx; }
  var a = cxAt(0), mid = cxAt(5), b = cxAt(10);
  /* linear: the midpoint must be about halfway between the ends */
  var half = (a + b) / 2;
  var linErr = Math.abs(mid - half);
  /* now the same two keys with a hold: the value must not move at all until
     the second key */
  L.tracks.x[0].e = "hold";
  var h1 = cxAt(2), h2 = cxAt(9), h3 = cxAt(10);
  /* and with an ease-in, the midpoint must lag the halfway mark */
  L.tracks.x[0].e = "in";
  var easeMid = cxAt(5);
  return { a: a, mid: mid, b: b, half: half, linErr: linErr,
           heldStill: Math.abs(h1 - h2) < 0.004,
           heldThenJumped: Math.abs(h3 - b) < 0.02,
           easeLags: easeMid < half - 0.02 };
});

/* a single key is a constant, and no keys falls back to the base */
A.degenerate = await pg.evaluate(() => {
  var M = window.DPModel;
  window.__fresh({ scenes: [{ name: "S", seconds: 6 }] });
  var L = window.__dp.add({ kind: "shape", shape: "disc", col: "gold",
    t0: 0, t1: 6, base: { x: 40, y: 40, w: 14, h: 8 } });
  window.__dp.exportFrame(1);
  var noKeys = window.__t.hash().cx;
  M.setKey(L.tracks.x, 3, 12, "smooth");
  window.__dp.exportFrame(0.5);
  var oneA = window.__t.hash().cx;
  window.__dp.exportFrame(5.5);
  var oneB = window.__t.hash().cx;
  return { noKeys: noKeys, oneA: oneA, oneB: oneB,
           oneKeyIsConstant: Math.abs(oneA - oneB) < 0.004,
           oneKeyMoved: Math.abs(oneA - noKeys) > 0.02 };
});

/* ===================================================================
   3. Presets BAKE — the whole contract of this page
   =================================================================== */
A.bake = await pg.evaluate(() => {
  var M = window.DPModel, out = { entries: {}, exits: {}, idles: {} };
  function fresh() {
    window.__fresh({ scenes: [{ name: "S", seconds: 8 }] });
    /* a VIEW layer, because "Draw itself" drives the composer's own playhead
       and a shape has none — testing the presets on a shape would pass a
       preset that does nothing for the one kind it is really for */
    return window.__dp.add({ kind: "view", sel: ["sky.all"],
      t0: 0, t1: 8, base: { x: 10, y: 20, w: 80, h: 45 } });
  }
  function keyCount(L) {
    var n = 0;
    M.PROP_ORDER.forEach(function (k) { n += L.tracks[k].length; });
    return n;
  }
  function frames(L) {
    var hs = [];
    [0.05, 1.2, 3, 5, 7, 7.95].forEach(function (t) {
      window.__dp.exportFrame(t);
      hs.push(window.__t.hash().h);
    });
    var u = {}, n = 0;
    hs.forEach(function (h) { if (!u[h]) { u[h] = 1; n++; } });
    return n;
  }
  Object.keys(M.ENTRIES).forEach(function (k) {
    var L = fresh();
    M.applyEntry(L, window.__dp.doc().scenes[0], k, 2);
    out.entries[k] = { keys: keyCount(L), frames: frames(L) };
  });
  Object.keys(M.EXITS).forEach(function (k) {
    var L = fresh();
    M.applyExit(L, window.__dp.doc().scenes[0], k, 2);
    out.exits[k] = { keys: keyCount(L), frames: frames(L) };
  });
  Object.keys(M.IDLES).forEach(function (k) {
    var L = fresh();
    M.applyIdle(L, window.__dp.doc().scenes[0], k, 1, 1);
    out.idles[k] = { keys: keyCount(L), frames: frames(L) };
  });
  return out;
});

/* The real proof that a preset baked rather than set a mode: move one of the
   keys it wrote and the motion must change. If "rise" were a mode the
   renderer interpreted, dragging its key would do nothing. */
A.bakedIsEditable = await pg.evaluate(() => {
  var M = window.DPModel;
  window.__fresh({ scenes: [{ name: "S", seconds: 8 }] });
  var L = window.__dp.add({ kind: "shape", shape: "disc", col: "gold",
    t0: 0, t1: 8, base: { x: 30, y: 30, w: 30, h: 18 } });
  M.applyEntry(L, window.__dp.doc().scenes[0], "rise", 2);
  window.__dp.exportFrame(1.0);
  var before = window.__t.hash();
  /* stretch the rise from two seconds to six by moving its last key */
  var yk = L.tracks.y;
  yk[yk.length - 1].t = 6;
  M.sortTrack(yk);
  window.__dp.exportFrame(1.0);
  var after = window.__t.hash();
  return { keysOnY: yk.length, changed: before.h !== after.h,
           /* at one second the slower rise must be HIGHER up (less far along
              its travel), which is a direction, not just a difference */
           higher: after.cy > before.cy };
});

/* ===================================================================
   4. Scenes, transitions and the timeline arithmetic
   =================================================================== */
A.scenes = await pg.evaluate(() => {
  var M = window.DPModel;
  var d = window.__fresh({ scenes: [
    { name: "A", seconds: 4, trans: { k: "cut", seconds: 0 } },
    { name: "B", seconds: 6, trans: { k: "cut", seconds: 0 } },
    { name: "C", seconds: 5 }] });
  var t0 = M.total(d);
  var startsCut = [0, 1, 2].map(function (i) { return M.sceneStart(d, i); });
  /* a transition must not move any later scene */
  d.scenes[0].trans = { k: "dissolve", seconds: 1.2 };
  d.scenes[1].trans = { k: "wipeL", seconds: 0.8 };
  var t1 = M.total(d);
  var startsTrans = [0, 1, 2].map(function (i) { return M.sceneStart(d, i); });
  return { total: t0, totalAfter: t1, startsCut: startsCut,
           startsTrans: startsTrans,
           unchanged: JSON.stringify(startsCut) === JSON.stringify(startsTrans) &&
                      Math.abs(t0 - t1) < 1e-9 };
});

A.transitions = await pg.evaluate(() => {
  var M = window.DPModel, out = {};
  Object.keys(M.TRANSITIONS).forEach(function (k) {
    var d = window.__fresh({ scenes: [
      { name: "A", seconds: 3, trans: { k: k, seconds: 1 },
        bg: { style: "flat", stars: false } },
      { name: "B", seconds: 3, bg: { style: "flat", stars: false } }] });
    /* two unmistakably different scenes, so a transition between them is
       visible as a transition rather than as two similar dark frames */
    d.scenes[0].layers.push(M.layer({ kind: "wash", shape: "flat", col: "custom",
      /* NOT white: the flash transition peaks at white, so a white first
         scene makes the peak indistinguishable from the scene and the test
         fails on its own choice of colour rather than on the code. */
      hex: "#2244ff", t0: 0, t1: 3, base: { x: 0, y: 0, w: 100, h: 100 } }));
    d.scenes[1].layers.push(M.layer({ kind: "wash", shape: "flat", col: "custom",
      hex: "#ff0000", t0: 0, t1: 3, base: { x: 0, y: 0, w: 100, h: 100 } }));
    window.__dp.setDoc(d);
    window.__dp.exportFrame(1.0);
    var before = window.__t.hash();
    window.__dp.exportFrame(2.5);
    var mid = window.__t.hash();
    window.__dp.exportFrame(3.4);
    var after = window.__t.hash();
    out[k] = { changes: k === "cut"
                 ? (before.h !== after.h)
                 : (before.h !== mid.h && mid.h !== after.h) };
  });
  return out;
});

/* ===================================================================
   5. Effects, masks, blends
   =================================================================== */
A.effects = await pg.evaluate(() => {
  var M = window.DPModel, out = {};
  function base() {
    window.__fresh({ scenes: [{ name: "S", seconds: 4,
      bg: { style: "flat", stars: false } }] });
    return window.__dp.add({ kind: "shape", shape: "disc", col: "gold",
      t0: 0, t1: 4, base: { x: 25, y: 30, w: 50, h: 28 } });
  }
  var L0 = base();
  window.__dp.exportFrame(2);
  var plain = window.__t.hash();
  [["blur", 14], ["glow", 30], ["chroma", 8], ["bright", 1.8],
   ["contrast", 2.2], ["sat", 0.1], ["hue", 120], ["grain", 0.8],
   ["opacity", 0.35], ["reveal", 0.4], ["scale", 1.6], ["rot", 35],
   ["skewX", 20]].forEach(function (q) {
    var L = base();
    L.base[q[0]] = q[1];
    window.__dp.exportFrame(2);
    out[q[0]] = window.__t.hash().h !== plain.h;
  });
  /* blends, against a frame with something under them to blend with */
  var blends = {};
  M.BLENDS.forEach(function (b) {
    window.__fresh({ scenes: [{ name: "S", seconds: 4,
      bg: { style: "flat", stars: false } }] });
    window.__dp.add({ kind: "wash", shape: "flat", col: "custom", hex: "#4466cc",
      t0: 0, t1: 4, base: { x: 0, y: 0, w: 100, h: 100 } });
    var top = window.__dp.add({ kind: "shape", shape: "disc", col: "custom",
      hex: "#ffaa22", t0: 0, t1: 4, base: { x: 20, y: 30, w: 60, h: 34 } });
    top.base.opacity = 1;
    top.blend = "source-over";
    window.__dp.exportFrame(2);
    var normal = window.__t.hash().h;
    top.blend = b;
    window.__dp.exportFrame(2);
    blends[b] = b === "source-over" ? (window.__t.hash().h === normal)
                                    : (window.__t.hash().h !== normal);
  });
  /* masks */
  var Lm = base();
  window.__dp.exportFrame(2);
  var unmasked = window.__t.hash();
  Lm.mask = { shape: "ellipse", x: 0.3, y: 0.3, w: 0.2, h: 0.1,
              feather: 0, invert: false, rot: 0 };
  window.__dp.exportFrame(2);
  var masked = window.__t.hash();
  Lm.mask.invert = true;
  window.__dp.exportFrame(2);
  var inverted = window.__t.hash();
  return { props: out, blends: blends,
           maskCuts: masked.ink < unmasked.ink * 0.6,
           maskInverts: inverted.h !== masked.h && inverted.ink > masked.ink };
});

/* ===================================================================
   6. Text animators arrive over time
   =================================================================== */
A.text = await pg.evaluate(() => {
  var out = {};
  Object.keys(window.DPRender.ANIMATORS).forEach(function (k) {
    window.__fresh({ scenes: [{ name: "S", seconds: 6,
      bg: { style: "flat", stars: false } }] });
    window.__dp.add({ kind: "text", text: "Candra in Uttara Ashadha",
      size: 0.05, lines: 2, col: "ink", animator: k, animSeconds: 3,
      t0: 0, t1: 6, base: { x: 8, y: 40, w: 84, h: 16 } });
    window.__dp.exportFrame(0.3);
    var early = window.__t.hash();
    window.__dp.exportFrame(1.5);
    var mid = window.__t.hash();
    window.__dp.exportFrame(5.5);
    var late = window.__t.hash();
    out[k] = { arrives: k === "none" ? true
                 : (early.ink < late.ink * 0.92 && mid.h !== late.h),
               litAtEnd: late.ink > 200 };
  });
  /* tracking must change the width of a line */
  window.__fresh({ scenes: [{ name: "S", seconds: 4,
    bg: { style: "flat", stars: false } }] });
  var L = window.__dp.add({ kind: "text", text: "WIDTH", size: 0.06, lines: 1,
    col: "ink", animator: "none", animSeconds: 0, t0: 0, t1: 4,
    base: { x: 5, y: 40, w: 90, h: 12 } });
  window.__dp.exportFrame(2);
  var tight = window.__t.hash();
  L.tracking = 0.5;
  window.__dp.exportFrame(2);
  var loose = window.__t.hash();
  return { animators: out, trackingWorks: tight.h !== loose.h };
});

/* ===================================================================
   7. The camera moves the scene, not a layer
   =================================================================== */
A.camera = await pg.evaluate(() => {
  var M = window.DPModel;
  var d = window.__fresh({ scenes: [{ name: "S", seconds: 6,
    bg: { style: "flat", stars: false } }] });
  /* One disc in the MIDDLE. An earlier draft put two near the edges and
     asserted that zooming in lit more pixels; zooming about the centre
     pushes edge content off the frame, so it lit fewer — the assumption was
     wrong, not the camera. A centred subject grows when you zoom into it. */
  window.__dp.add({ kind: "shape", shape: "disc", col: "gold", t0: 0, t1: 6,
    base: { x: 40, y: 45, w: 20, h: 11 } });
  window.__dp.exportFrame(1);
  var still = window.__t.hash();
  var s = d.scenes[0];
  M.setKey(s.camera.tracks.zoom, 0, 1, "linear");
  M.setKey(s.camera.tracks.zoom, 6, 2.2, "linear");
  window.__dp.exportFrame(1);
  var zA = window.__t.hash();
  window.__dp.exportFrame(5.5);
  var zB = window.__t.hash();
  /* panning must move everything, so the centroid of the whole frame shifts */
  M.setKey(s.camera.tracks.panX, 0, 0, "linear");
  M.setKey(s.camera.tracks.panX, 6, -25, "linear");
  window.__dp.exportFrame(5.5);
  var panned = window.__t.hash();
  return { zoomChanges: still.h !== zA.h || zA.h !== zB.h,
           zoomGrows: zB.ink > zA.ink,
           panMoves: Math.abs(panned.cx - zB.cx) > 0.02 };
});

/* ===================================================================
   8. Undo restores the FRAME, not just the document
   =================================================================== */
A.undo = await pg.evaluate(() => {
  var M = window.DPModel;
  window.__fresh({ scenes: [{ name: "S", seconds: 6,
    bg: { style: "flat", stars: false } }] });
  var L = window.__dp.add({ kind: "shape", shape: "disc", col: "gold",
    t0: 0, t1: 6, base: { x: 20, y: 20, w: 30, h: 18 } });
  window.__dp.exportFrame(3);
  var before = window.__t.hash().h;
  window.__dp.mark();
  L.base.x = 70; L.base.rot = 40;
  M.applyEntry(L, window.__dp.doc().scenes[0], "pop", 1.5);
  window.__dp.exportFrame(3);
  var changed = window.__t.hash().h;
  window.__dp.undo();
  window.__dp.exportFrame(3);
  var restored = window.__t.hash().h;
  window.__dp.redo();
  window.__dp.exportFrame(3);
  var redone = window.__t.hash().h;
  return { changed: before !== changed, restored: restored === before,
           redone: redone === changed };
});

/* ===================================================================
   9. The handles never reach an export
   =================================================================== */
A.handles = await pg.evaluate(() => {
  window.__fresh({ scenes: [{ name: "S", seconds: 6 }] });
  var L = window.__dp.add({ kind: "shape", shape: "ring", col: "gold",
    t0: 0, t1: 6, base: { x: 20, y: 25, w: 50, h: 30 } });
  window.__dp.pick(L.id);
  window.__dp.exportFrame(3);
  var exp = window.__t.hash();
  window.__dp.screenFrame(3);
  var scr = window.__t.hash();
  /* With nothing picked the overlay still draws the platform guides, and
     those are overlay-only too — so the export is NOT expected to match the
     screen; it is expected to match the screen with the overlay turned off.
     That is the real claim: nothing the overlay draws survives into a file. */
  window.__dp.pick(null);
  window.__dp.exportFrame(3);
  var exp2 = window.__t.hash();
  window.__dp.screenFrame(3);
  var scr2 = window.__t.hash();
  var keep = window.DPRender.S.showGuides;
  window.DPRender.S.showGuides = false;
  window.__dp.screenFrame(3);
  var scrNoGuides = window.__t.hash();
  window.DPRender.S.showGuides = keep;
  return { differ: exp.h !== scr.h, overlayAdds: scr.ink > exp.ink,
           guidesAreOverlayOnly: exp2.h !== scr2.h && exp2.ink < scr2.ink,
           exportIsTheFrameAlone: scrNoGuides.h === exp2.h };
});

/* ===================================================================
   10. A recording lasts the length it advertises
   =================================================================== */
A.record = await pg.evaluate(async () => {
  var M = window.DPModel;
  window.__fresh({ scenes: [{ name: "A", seconds: 2,
                              trans: { k: "dissolve", seconds: 0.5 } },
                            { name: "B", seconds: 2 }] });
  var d = window.__dp.doc();
  d.fps = 20;
  d.scenes[0].layers.push(M.layer({ kind: "shape", shape: "disc", col: "gold",
    t0: 0, t1: 2, base: { x: 20, y: 30, w: 50, h: 30 } }));
  d.scenes[1].layers.push(M.layer({ kind: "text", text: "SECOND",
    size: 0.08, lines: 1, col: "gold", animator: "charRise", animSeconds: 1,
    t0: 0, t1: 2, base: { x: 10, y: 40, w: 80, h: 14 } }));
  var seen = [];
  var res = await window.DPExport.record(d, window.__dp.ctx(),
    { fps: 20, mbps: 6, withAudio: false },
    function (f, i, n) { if (i % 10 === 0) seen.push(window.__t.lit()); });
  return { ok: !!res.blob, bytes: res.blob.size, mime: res.mime,
           seconds: res.seconds, frames: res.frames, fps: res.fps,
           /* the recorder drives its own clock; the frame count has to be the
              advertised length times the frame rate and nothing else */
           frameCountRight: res.frames === Math.round(4 * 20),
           lengthRight: Math.abs(res.seconds - 4) < 1e-9,
           drewThroughout: seen.length > 2 && seen.every(function (q) { return q > 0; }) };
});

A.still = await pg.evaluate(async () => {
  var b = await window.DPExport.still(window.__dp.doc(), window.__dp.ctx(), 1);
  return { ok: !!b, bytes: b.size, type: b.type };
});

/* ===================================================================
   11. Still responsive while playing
   =================================================================== */
A.perf = await (async () => {
  await pg.evaluate(() => {
    var M = window.DPModel;
    /* a deliberately heavy reel: three scenes, effects on every layer */
    window.__fresh({ scenes: [{ name: "A", seconds: 4 }, { name: "B", seconds: 4 },
                              { name: "C", seconds: 4 }] });
    var d = window.__dp.doc();
    d.scenes.forEach(function (s, si) {
      ["sky.all", "geo.rashis", "pan.horas"].forEach(function (id, i) {
        var L = M.layer({ kind: "view", sel: [id], t0: 0, t1: 0,
          base: { x: 5 + i * 3, y: 10 + i * 18, w: 60, h: 28,
                  blur: i === 0 ? 2 : 0, glow: i === 1 ? 10 : 0 } });
        L.t1 = s.seconds;
        M.applyEntry(L, s, "rise", 1);
        M.applyIdle(L, s, "drift", 1, 1);
        s.layers.push(L);
      });
      M.setKey(s.camera.tracks.zoom, 0, 1, "inOut");
      M.setKey(s.camera.tracks.zoom, s.seconds, 1.2, "inOut");
    });
    window.__dp.refresh();
    window.__frames = [];
    var raw = window.DPRender.render;
    window.DPRender.render = function () {
      var t = performance.now();
      var r = raw.apply(window.DPRender, arguments);
      window.__frames.push(performance.now() - t);
      return r;
    };
  });
  const cdp = await pg.context().newCDPSession(pg);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await pg.click("#dp-play");
  await pg.evaluate(() => new Promise(r => setTimeout(r, 2500)));
  const during = await pg.evaluate(() => {
    var t0 = performance.now();
    /* change something through the real UI while it plays */
    var rows = document.querySelectorAll("#dp-stack .dpname");
    var before = window.__dp.picked();
    if (rows.length) rows[0].click();
    var clickMs = performance.now() - t0;
    var sliders = document.querySelectorAll("#dp-insp .dpslider");
    var moved = false;
    if (sliders.length) {
      var s = sliders[sliders.length - 1];
      s.value = String(parseFloat(s.value) + (parseFloat(s.max) - parseFloat(s.min)) * 0.1);
      s.dispatchEvent(new Event("input", { bubbles: true }));
      moved = true;
    }
    return { clickMs: clickMs, picked: window.__dp.picked() !== before,
             sliderMoved: moved, playing: window.__dp.playing() };
  });
  const t0 = Date.now();
  await pg.click("#dp-play");
  const pauseMs = Date.now() - t0;
  const after = await pg.evaluate(async () => {
    var lab = document.getElementById("dp-play").textContent;
    var a = window.__dp.at ? null : null;
    var p1 = document.getElementById("dp-time").textContent;
    await new Promise(r => setTimeout(r, 420));
    var p2 = document.getElementById("dp-time").textContent;
    var f = (window.__frames || []).slice().sort(function (x, y) { return x - y; });
    return { label: lab, frozen: p1 === p2,
             median: f.length ? f[Math.floor(f.length / 2)] : 0,
             worst: f.length ? f[f.length - 1] : 0, n: f.length };
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  return Object.assign({}, during, after, { pauseMs: pauseMs });
})();

/* ===================================================================
   12. The panel is built, and works on a phone
   =================================================================== */
A.panel = await pg.evaluate(() => {
  window.__dp.pick(null);
  window.__dp.refresh();
  var any = document.querySelectorAll("#dp-stack .dpname");
  if (any.length) any[0].click();
  return {
    topFields: document.querySelectorAll("#dp-top select").length,
    libChips: document.querySelectorAll("#dp-lib .dpchip").length,
    addButtons: document.querySelectorAll("#dp-add .dpbtn").length,
    stackRows: document.querySelectorAll("#dp-stack .dplayer").length,
    timelineRows: document.querySelectorAll("#dp-timeline .dptrow").length,
    inspectorFields: document.querySelectorAll("#dp-insp input, #dp-insp select").length,
    stopwatches: document.querySelectorAll("#dp-insp .dpstop").length,
    sceneTiles: document.querySelectorAll("#dp-scenes .dpscene").length,
    exportButtons: document.querySelectorAll("#dp-export .dpbtn").length
  };
});

A.keysOnTimeline = await pg.evaluate(() => {
  var M = window.DPModel;
  window.__fresh({ scenes: [{ name: "S", seconds: 8 }] });
  var L = window.__dp.add({ kind: "shape", shape: "disc", col: "gold",
    t0: 0, t1: 8, base: { x: 20, y: 20, w: 30, h: 18 } });
  M.applyEntry(L, window.__dp.doc().scenes[0], "rise", 2);
  M.applyExit(L, window.__dp.doc().scenes[0], "sink", 2);
  window.__dp.pick(L.id);
  window.__dp.refresh();
  /* open the layer's property rows */
  var nm = document.querySelectorAll("#dp-timeline .dptname");
  var opened = 0;
  for (var i = 0; i < nm.length; i++) {
    if (nm[i].textContent.indexOf("Shape") >= 0 || i === 1) { nm[i].click(); opened++; break; }
  }
  return { diamonds: document.querySelectorAll("#dp-timeline .dptkey").length,
           propRows: document.querySelectorAll("#dp-timeline .dptprop").length,
           opened: opened };
});

A.phone = await (async () => {
  const ph = await br.newPage({ viewport: { width: 393, height: 852 },
                                isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const perr = []; ph.on("pageerror", e => perr.push(String(e)));
  await ph.addInitScript(() => {
    localStorage.setItem("nirayana.birth", JSON.stringify({
      year:1984,month:5,day:17,hour:14,minute:30,lat:26.85,lon:80.95,
      tzHours:5.5,ayanamsa:"lahiri",node:"mean",name:"Test"}));
    localStorage.removeItem("nirayana.directorpro");
  });
  await ph.goto(`${base}/director-pro.html`, { waitUntil: "load" });
  await ph.waitForFunction(() => window.__dp, { timeout: 30000 });
  const out = await ph.evaluate(() => {
    var any = document.querySelectorAll("#dp-stack .dpname");
    if (any.length) any[0].click();
    var small = [], sel = "#dp-insp button, #dp-insp select, #dp-insp input, " +
      "#dp-add .dpbtn, #dp-stack button, #dp-timeline .dptbar, #dp-timeline .dptkey";
    [].forEach.call(document.querySelectorAll(sel), function (e) {
      if (e.type === "checkbox" || e.type === "color" || e.hidden) return;
      var r = e.getBoundingClientRect();
      if (r.width < 1 && r.height < 1) return;
      if (r.height < 34) small.push((e.className || e.tagName) + " " + Math.round(r.height));
    });
    return { overflow: document.documentElement.scrollWidth -
                       document.documentElement.clientWidth,
             smallCount: small.length, small: small.slice(0, 6),
             boots: !!window.__dp };
  });
  /* a finger drags a layer on the stage */
  const dragged = await ph.evaluate(() => {
    var M = window.DPModel;
    window.__dp.setDoc(M.doc({ name: "harness",
      scenes: [{ name: "S", seconds: 6 }] }));
    var L = window.__dp.add({ kind: "shape", shape: "disc", col: "gold",
      t0: 0, t1: 6, base: { x: 20, y: 30, w: 50, h: 25 } });
    window.__dp.pick(L.id);
    window.__dp.screenFrame(3);
    var cv = document.getElementById("dp-canvas");
    var r = cv.getBoundingClientRect();
    function pt(type, fx, fy) {
      cv.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true,
        pointerId: 1, pointerType: "touch", isPrimary: true,
        clientX: r.left + r.width * fx, clientY: r.top + r.height * fy }));
    }
    pt("pointerdown", 0.45, 0.42);
    pt("pointermove", 0.55, 0.52);
    pt("pointerup", 0.55, 0.52);
    return { x: Math.round(L.base.x), y: Math.round(L.base.y) };
  });
  await ph.close();
  return Object.assign(out, { dragged: dragged, errors: perr.length });
})();

/* ---- assertions ---------------------------------------------------- */
const okAll = (o, f) => Object.keys(o).every(k => f(o[k], k));
const checks = [
  ["the page opens on something drawn",
   A.boot.scenes === 1 && A.boot.layers >= 2 && A.boot.litOnLoad > 0.004 &&
   A.boot.libChips > 100],

  ["two keys interpolate between them", A.interp.linErr < 0.03 &&
   Math.abs(A.interp.b - A.interp.a) > 0.2],
  ["a hold key holds, then jumps",
   A.interp.heldStill === true && A.interp.heldThenJumped === true],
  ["an ease-in lags the midpoint", A.interp.easeLags === true],
  ["one key is a constant, no keys is the base value",
   A.degenerate.oneKeyIsConstant === true && A.degenerate.oneKeyMoved === true],

  /* "draw" is held to two distinct frames rather than three, and the reason
     is a real distinction. Every other preset animates a property of the
     LAYER, so it necessarily differs at three sampled instants. "draw" hands
     a rising playhead to the composer inside and lets the composer animate
     itself — so how many distinct frames come out is a fact about that
     composer, not about the preset. Requiring three would be asserting that
     every composer in the registry builds up smoothly across its whole
     playhead, which is not something this page promises and not something it
     should fail over. Two says what is actually claimed: before the entry and
     after it are different pictures. */
  ["every entry preset writes keys and animates",
   okAll(A.bake.entries, (v, k) => k === "none" ? true
     : v.keys >= 2 && v.frames >= (k === "draw" ? 2 : 3))],
  ["every exit preset writes keys and animates",
   okAll(A.bake.exits, (v, k) => k === "none" ? true : v.keys >= 2 && v.frames >= 3)],
  ["every continuous preset writes keys and animates",
   okAll(A.bake.idles, (v, k) => k === "none" ? true : v.keys >= 2 && v.frames >= 3)],
  ["a preset's keys can be dragged, which proves it baked rather than set a mode",
   A.bakedIsEditable.changed === true && A.bakedIsEditable.higher === true &&
   A.bakedIsEditable.keysOnY >= 2],

  ["the reel is as long as the sum of its scenes", A.scenes.total === 15],
  ["adding a transition does not retime any later scene", A.scenes.unchanged === true],
  ["every transition renders between the two scenes",
   okAll(A.transitions, v => v.changes === true)],

  ["every visual property changes the frame",
   okAll(A.effects.props, v => v === true)],
  ["every blend mode composites differently from normal",
   okAll(A.effects.blends, v => v === true)],
  ["a mask cuts the layer, and inverts",
   A.effects.maskCuts === true && A.effects.maskInverts === true],

  ["every text animator arrives over time",
   okAll(A.text.animators, (v, k) => v.litAtEnd === true &&
     (k === "none" ? true : v.arrives === true))],
  ["tracking changes the set of a line", A.text.trackingWorks === true],

  ["the camera zooms the whole scene",
   A.camera.zoomChanges === true && A.camera.zoomGrows === true],
  ["and pans it", A.camera.panMoves === true],

  ["undo restores the exact frame, and redo returns to it",
   A.undo.changed === true && A.undo.restored === true && A.undo.redone === true],

  ["the handles are drawn on the screen",
   A.handles.differ === true && A.handles.overlayAdds === true],
  ["and never in the export — nor are the guides",
   A.handles.guidesAreOverlayOnly === true &&
   A.handles.exportIsTheFrameAlone === true],

  ["a recording lasts exactly the length it advertises",
   A.record.ok === true && A.record.lengthRight === true &&
   A.record.frameCountRight === true && A.record.bytes > 3000],
  ["and draws the document throughout", A.record.drewThroughout === true],
  ["a still exports", A.still.ok === true && A.still.bytes > 2000],

  ["the panel responds while the reel plays",
   A.perf.picked === true && A.perf.sliderMoved === true &&
   A.perf.playing === true && A.perf.clickMs < 400],
  ["Pause works while the reel plays",
   A.perf.label === "Play" && A.perf.frozen === true],
  ["playback does not block the main thread in long chunks",
   A.perf.median < 90 && A.perf.worst < 500],

  ["the workstation is built and wired",
   A.panel.topFields === 4 && A.panel.addButtons === 7 &&
   A.panel.stackRows >= 1 && A.panel.timelineRows >= 2 &&
   A.panel.inspectorFields >= 10 && A.panel.stopwatches >= 18 &&
   A.panel.sceneTiles >= 1 && A.panel.exportButtons >= 3],
  ["keyframes show on the timeline as draggable diamonds",
   A.keysOnTimeline.diamonds >= 4 && A.keysOnTimeline.propRows >= 2],

  ["it works on a phone",
   A.phone.boots === true && A.phone.overflow <= 1 && A.phone.smallCount === 0],
  ["a finger drags a layer on a phone",
   Math.abs(A.phone.dragged.x - 30) <= 2 && Math.abs(A.phone.dragged.y - 40) <= 2],

  ["no page errors", errs.length === 0 && A.phone.errors === 0]
];

let bad = 0;
for (const [what, ok] of checks) {
  if (!ok) bad++;
  console.log((ok ? "  ok   " : "  FAIL ") + what);
}
console.log("");
console.log("  presets: " + Object.keys(A.bake.entries).length + " entries, " +
            Object.keys(A.bake.exits).length + " exits, " +
            Object.keys(A.bake.idles).length + " continuous");
console.log("  transitions failing: " + JSON.stringify(Object.keys(A.transitions).filter(k=>!A.transitions[k].changes)));
console.log("  entries failing: " + JSON.stringify(Object.keys(A.bake.entries).filter(k=>k!=="none"&&!(A.bake.entries[k].keys>=2&&A.bake.entries[k].frames>=3)).map(k=>k+":"+JSON.stringify(A.bake.entries[k]))));
console.log("  camera: " + JSON.stringify(A.camera));
console.log("  transitions: " + Object.keys(A.transitions).length +
            ", blends: " + Object.keys(A.effects.blends).length +
            ", animators: " + Object.keys(A.text.animators).length);
console.log("  recorded " + A.record.seconds + "s = " + A.record.frames +
            " frames at " + A.record.fps + " fps, " +
            Math.round(A.record.bytes / 1024) + " KB (" + A.record.mime + ")");
console.log("  while playing: median frame " + A.perf.median.toFixed(1) +
            "ms, worst " + A.perf.worst.toFixed(1) + "ms over " + A.perf.n +
            " frames; pause \"" + A.perf.label + "\" in " + A.perf.pauseMs + "ms");
console.log("  phone: " + A.phone.smallCount + " undersized target(s) " +
            JSON.stringify(A.phone.small));
if (errs.length) errs.slice(0, 4).forEach(e => console.log("  page error: " + e));

await br.close(); server.close();
console.log(bad ? "\nFAIL " + bad + " check(s)" : "\nPASS dp-page");
process.exit(bad ? 1 : 0);
