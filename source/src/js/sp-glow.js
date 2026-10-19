/* ===== The light =========================================================

   WHAT ACTUALLY SEPARATES A DIAGRAM FROM A REEL.

   Put the same data in front of two people and one picture reads as a
   textbook figure and the other stops the thumb. The difference is almost
   never the data. It is that the second one is made of LIGHT rather than of
   lines: thousands of hairline strokes, each nearly invisible, added
   together so that density becomes brightness, and then bloomed so the dense
   places spill.

   That is a real optical model and not a style. A long exposure of a moving
   point IS the sum of where it was; where the path crosses itself the film
   receives twice the light; a bright enough place scatters in the lens and
   grows a halo. So the pipeline here is the camera's:

     accumulate   every stroke added, never painted over — composite
                  "lighter", alpha low enough that a single stroke is almost
                  nothing and a hundred overlapping strokes are white;

     bloom        the accumulation buffer reduced, smoothed and added back,
                  twice, at two radii — a tight halo and a wide one;

     grade        a warm curve, because gold on black is the palette and a
                  straight additive sum goes to white too fast;

     vignette     and grain, which are what stop a canvas looking like a
                  canvas.

   NOTHING HERE IS RANDOM PER FRAME. The grain is seeded from the frame
   index, so the same playhead gives the same pixels every time. A recorder
   that re-renders a frame must get the frame it got before, and a test that
   compares two renderings of the same instant must see them agree — which
   is also how this file is checked.

   Two canvases are kept and reused rather than allocated per frame. At
   1080x1920, allocating a scratch canvas per frame is tens of megabytes a
   second of churn and the frame path is where this codebase has already
   learnt not to do that. */

(function () {
  "use strict";

  /* ---- scratch surfaces, allocated once ---------------------------------- */
  var BUF = null, SMALL = null, TINY = null;
  function surface(hold, w, h) {
    if (!hold || hold.cv.width !== w || hold.cv.height !== h) {
      var cv = document.createElement("canvas");
      cv.width = w; cv.height = h;
      hold = { cv: cv, c: cv.getContext("2d", { willReadFrequently: false }) };
    }
    return hold;
  }
  function clear(h) {
    h.c.setTransform(1, 0, 0, 1, 0, 0);
    h.c.globalCompositeOperation = "source-over";
    h.c.globalAlpha = 1;
    h.c.clearRect(0, 0, h.cv.width, h.cv.height);
  }

  /* ---- the accumulation buffer -------------------------------------------
     Hand it a function that draws; everything that function draws is summed
     rather than layered, and the sum is returned for grading and blooming.

     The caller never sets globalCompositeOperation itself. That is the whole
     point of the wrapper: one place decides that this is an exposure. */
  function expose(w, h, draw) {
    BUF = surface(BUF, w, h);
    clear(BUF);
    var c = BUF.c;
    c.save();
    c.globalCompositeOperation = "lighter";
    c.lineCap = "round";
    c.lineJoin = "round";
    try { draw(c); } finally { c.restore(); }
    return BUF.cv;
  }

  /* ---- bloom --------------------------------------------------------------
     A reduce-and-add, twice. Downscaling with the browser's own smoothing IS
     a blur — a box filter of exactly the right width for the reduction — and
     it costs a fraction of what a separable Gaussian in JavaScript costs,
     which matters because this runs sixty times a second during a recording.

     Two radii rather than one. A single halo looks like a glow effect; a
     tight one plus a wide one looks like a lens, because that is what a lens
     does. */
  function bloom(c, src, opt) {
    opt = opt || {};
    var tight = opt.tight == null ? 0.55 : opt.tight;
    var wide = opt.wide == null ? 0.38 : opt.wide;
    var w = src.width, h = src.height;
    if (tight > 0.001) {
      var w1 = Math.max(2, w >> 3), h1 = Math.max(2, h >> 3);
      SMALL = surface(SMALL, w1, h1);
      clear(SMALL);
      SMALL.c.imageSmoothingEnabled = true;
      SMALL.c.drawImage(src, 0, 0, w1, h1);
      c.save();
      c.globalCompositeOperation = "lighter";
      c.globalAlpha = tight;
      c.imageSmoothingEnabled = true;
      c.drawImage(SMALL.cv, 0, 0, w, h);
      c.restore();
    }
    if (wide > 0.001) {
      var w2 = Math.max(2, w >> 5), h2 = Math.max(2, h >> 5);
      TINY = surface(TINY, w2, h2);
      clear(TINY);
      TINY.c.imageSmoothingEnabled = true;
      TINY.c.drawImage(src, 0, 0, w2, h2);
      c.save();
      c.globalCompositeOperation = "lighter";
      c.globalAlpha = wide;
      c.imageSmoothingEnabled = true;
      c.drawImage(TINY.cv, 0, 0, w, h);
      c.restore();
    }
  }

  /* Draw an exposure onto the page canvas: the sum itself, then its halo. */
  function develop(c, src, opt) {
    opt = opt || {};
    c.save();
    c.globalCompositeOperation = opt.blend || "lighter";
    c.globalAlpha = opt.gain == null ? 1 : opt.gain;
    c.drawImage(src, 0, 0, src.width, src.height);
    c.restore();
    bloom(c, src, opt);
  }

  /* ---- a point of light ---------------------------------------------------
     Not a filled circle. A filled circle at this scale reads as a sticker;
     what reads as a light is a core that clips to white, a falloff that
     reaches several times further than the core, and — above about a tenth
     of the frame's brightness — four spikes, because every lens anyone has
     ever looked through puts spikes on a bright point. */
  function star(c, x, y, r, col, opt) {
    opt = opt || {};
    var spikes = opt.spikes == null ? 1 : opt.spikes;
    var g = c.createRadialGradient(x, y, 0, x, y, Math.max(0.6, r * 6));
    g.addColorStop(0, col);
    g.addColorStop(0.06, col);
    g.addColorStop(0.22, rgba(col, 0.45));
    g.addColorStop(0.55, rgba(col, 0.10));
    g.addColorStop(1, rgba(col, 0));
    c.save();
    c.globalCompositeOperation = "lighter";
    c.fillStyle = g;
    c.beginPath();
    c.arc(x, y, r * 6, 0, 6.283185307179586);
    c.fill();
    c.fillStyle = "#fff";
    c.globalAlpha = opt.core == null ? 0.9 : opt.core;
    c.beginPath();
    c.arc(x, y, Math.max(0.5, r * 0.55), 0, 6.283185307179586);
    c.fill();
    if (spikes > 0) {
      c.globalAlpha = 0.5 * spikes;
      c.strokeStyle = rgba(col, 0.7);
      c.lineWidth = Math.max(0.6, r * 0.22);
      var L = r * (opt.spikeLen || 7);
      c.beginPath();
      c.moveTo(x - L, y); c.lineTo(x + L, y);
      c.moveTo(x, y - L * 0.62); c.lineTo(x, y + L * 0.62);
      c.stroke();
    }
    c.restore();
  }

  /* #rrggbb or rgb()/rgba() to rgba() at a given alpha, without a regex
     round-trip per stroke — this is called inside the inner loop. */
  var CACHE = {};
  function rgba(col, a) {
    var k = col + "|" + a;
    var hit = CACHE[k];
    if (hit) return hit;
    var r = 255, g = 210, b = 140;
    if (col.charAt(0) === "#") {
      var s = col.length === 4
        ? col.charAt(1) + col.charAt(1) + col.charAt(2) + col.charAt(2) +
          col.charAt(3) + col.charAt(3)
        : col.slice(1, 7);
      var n = parseInt(s, 16);
      r = (n >> 16) & 255; g = (n >> 8) & 255; b = n & 255;
    } else {
      var m = col.match(/(\d+(?:\.\d+)?)/g);
      if (m && m.length >= 3) { r = +m[0]; g = +m[1]; b = +m[2]; }
    }
    var out = "rgba(" + r + "," + g + "," + b + "," + a + ")";
    if (CACHE_N > 4000) { CACHE = {}; CACHE_N = 0; }
    CACHE[k] = out; CACHE_N++;
    return out;
  }
  var CACHE_N = 0;

  /* ---- vignette ----------------------------------------------------------- */
  function vignette(c, w, h, amount) {
    amount = amount == null ? 0.55 : amount;
    if (amount <= 0.001) return;
    var r = Math.max(w, h) * 0.78;
    var g = c.createRadialGradient(w / 2, h * 0.46, r * 0.26, w / 2, h * 0.46, r);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.62, "rgba(0,0,0," + (amount * 0.25).toFixed(3) + ")");
    g.addColorStop(1, "rgba(0,0,0," + amount.toFixed(3) + ")");
    c.save();
    c.globalCompositeOperation = "source-over";
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.restore();
  }

  /* ---- grain --------------------------------------------------------------
     Deterministic. The seed is the frame index, so re-rendering a playhead
     reproduces its pixels exactly — which a recorder depends on and a test
     can check. A tile is drawn once per seed and repeated, because per-pixel
     noise over two million pixels is not a thing to do sixty times a second. */
  var GRAIN = {}, GRAIN_KEYS = [];
  function grainTile(seed) {
    var key = "g" + seed;
    if (GRAIN[key]) return GRAIN[key];
    var N = 128;
    var cv = document.createElement("canvas");
    cv.width = N; cv.height = N;
    var c = cv.getContext("2d");
    var img = c.createImageData(N, N);
    var d = img.data, s = (seed * 2654435761) >>> 0;
    for (var i = 0; i < d.length; i += 4) {
      s = (s * 1664525 + 1013904223) >>> 0;
      var v = (s >>> 24);
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    if (GRAIN_KEYS.length > 24) { delete GRAIN[GRAIN_KEYS.shift()]; }
    GRAIN[key] = cv; GRAIN_KEYS.push(key);
    return cv;
  }
  function grain(c, w, h, amount, seed) {
    if (!(amount > 0.001)) return;
    var t = grainTile((seed | 0) % 12);
    var pat = c.createPattern(t, "repeat");
    if (!pat) return;
    c.save();
    c.globalCompositeOperation = "overlay";
    c.globalAlpha = Math.min(0.2, amount);
    c.fillStyle = pat;
    c.fillRect(0, 0, w, h);
    c.restore();
  }

  /* ---- a warm grade -------------------------------------------------------
     A plain additive sum of gold strokes climbs the green channel fastest
     and arrives at a sour yellow-white. One multiply pass in a warm tint
     and one screen pass in a deep amber puts the climb back where gold
     climbs: through orange into white. */
  function grade(c, w, h, strength) {
    strength = strength == null ? 1 : strength;
    if (strength <= 0.001) return;
    c.save();
    c.globalCompositeOperation = "soft-light";
    c.globalAlpha = 0.30 * strength;
    c.fillStyle = "#c98a2e";
    c.fillRect(0, 0, w, h);
    c.globalCompositeOperation = "source-over";
    c.globalAlpha = 0.05 * strength;
    c.fillStyle = "#1a1206";
    c.fillRect(0, 0, w, h);
    c.restore();
  }

  window.SPGlow = {
    expose: expose, develop: develop, bloom: bloom, star: star,
    vignette: vignette, grain: grain, grade: grade, rgba: rgba,
    /* exposed for the harness: proves the grain is a function of the seed
       and of nothing else */
    _grainTile: grainTile
  };
})();
