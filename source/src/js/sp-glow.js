/* ===== The light ==========================================================

   WHAT THIS FILE LEARNED THE HARD WAY.

   The first version treated every bright point as a fresh radial gradient and
   every frame as a fresh exposure of everything that had ever been drawn.
   Both are wrong, and they are wrong in the same way: they redo, sixty times
   a second, work whose answer has not changed.

     A GLOW IS A SPRITE, NOT A GRADIENT. createRadialGradient allocates, and
       filling a disc through one is a per-pixel shade. Forty-four of them a
       frame — which is what an eclipse reel asks for once its marked events
       have accumulated — is forty-four allocations and forty-four shaded
       fills per frame. Draw the glow ONCE into a small canvas and every
       later one is a drawImage. The measured difference was a tenth of a
       second a frame, appearing as a stutter several times a second.

     AN ACCUMULATION IS A CACHE, NOT A REPLAY. A reel's stage is defined as
       "everything up to the playhead", and for a run of fifteen hundred
       chords that is fifteen hundred strokes redrawn for each of nine
       hundred frames. But the frame before it drew fourteen hundred and
       ninety-nine of the same strokes. Keep the canvas, append the
       difference, and the per-frame cost stops depending on how far through
       the run you are.

   AND THE GLOW ITSELF WAS TOO MUCH. Two bloom radii at better than half
   strength, a warm grade over the whole frame and a heavy vignette turned
   every figure into a lamp. Light is what makes density readable; past that
   it only hides the drawing. The defaults here are now a third of what they
   were, the second bloom radius is folded into the first so it costs one
   composite instead of two, and every part of it can be turned off.

   NOTHING HERE IS RANDOM PER FRAME. The grain is seeded from the frame
   index, so the same playhead gives the same pixels every time — which a
   recorder depends on and the harness checks. */

(function () {
  "use strict";

  var TAU = 6.283185307179586;

  /* ---- scratch surfaces, allocated once ---------------------------------- */
  var BUF = null, SMALL = null, TINY = null;
  function surface(hold, w, h) {
    if (!hold || hold.cv.width !== w || hold.cv.height !== h) {
      var cv = document.createElement("canvas");
      cv.width = w; cv.height = h;
      hold = { cv: cv, c: cv.getContext("2d") };
    }
    return hold;
  }
  function clear(h) {
    h.c.setTransform(1, 0, 0, 1, 0, 0);
    h.c.globalCompositeOperation = "source-over";
    h.c.globalAlpha = 1;
    h.c.clearRect(0, 0, h.cv.width, h.cv.height);
  }
  function fresh(w, h) {
    var cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    return cv;
  }

  /* ---- the accumulation buffer -------------------------------------------
     Hand it a function that draws; everything that function draws is summed
     rather than layered. The caller never sets globalCompositeOperation
     itself — that is the point of the wrapper: one place decides that this
     is an exposure. */
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
     ONE upscale, not two. The wide halo is folded into the tight one while
     both are still small — a four-pixel-wide blur of a 135x240 image costs
     nothing, and the single composite up to two megapixels is the part that
     is expensive. Downscaling with the browser's own smoothing IS a blur, of
     exactly the right width for the reduction. */
  function bloom(c, src, opt) {
    opt = opt || {};
    var tight = opt.tight == null ? 0.20 : opt.tight;
    var wide = opt.wide == null ? 0.12 : opt.wide;
    if (tight <= 0.002 && wide <= 0.002) return;
    /* ONLY OVER THE RECT THAT HAS ANYTHING IN IT. The figure occupies the
       middle band of the frame; blooming the title and the caption as well
       costs the same again and does nothing but soften type. At 1080x1920
       that is the difference between two megapixels of additive composite
       and one. */
    var rx = 0, ry = 0, rw = src.width, rh = src.height;
    if (opt.rect) {
      rx = Math.max(0, Math.floor(opt.rect.x));
      ry = Math.max(0, Math.floor(opt.rect.y));
      rw = Math.min(src.width - rx, Math.ceil(opt.rect.w));
      rh = Math.min(src.height - ry, Math.ceil(opt.rect.h));
      if (rw < 4 || rh < 4) return;
    }
    var w = rw, h = rh;
    var w1 = Math.max(2, w >> 3), h1 = Math.max(2, h >> 3);
    SMALL = surface(SMALL, w1, h1);
    clear(SMALL);
    SMALL.c.imageSmoothingEnabled = true;
    SMALL.c.globalAlpha = 1;
    SMALL.c.drawImage(src, rx, ry, rw, rh, 0, 0, w1, h1);
    if (wide > 0.002) {
      var w2 = Math.max(2, w1 >> 2), h2 = Math.max(2, h1 >> 2);
      TINY = surface(TINY, w2, h2);
      clear(TINY);
      TINY.c.imageSmoothingEnabled = true;
      TINY.c.drawImage(SMALL.cv, 0, 0, w2, h2);
      SMALL.c.globalCompositeOperation = "lighter";
      SMALL.c.globalAlpha = Math.min(1, wide / Math.max(0.02, tight));
      SMALL.c.drawImage(TINY.cv, 0, 0, w1, h1);
      SMALL.c.globalCompositeOperation = "source-over";
      SMALL.c.globalAlpha = 1;
    }
    c.save();
    c.globalCompositeOperation = "lighter";
    c.globalAlpha = Math.max(tight, 0.0001);
    c.imageSmoothingEnabled = true;
    c.drawImage(SMALL.cv, rx, ry, rw, rh);
    c.restore();
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

  /* ---- sprites -------------------------------------------------------------
     A cached picture of a light, drawn once per (colour, kind, size bucket)
     and thereafter a drawImage. Sizes are bucketed to the nearest few pixels
     so a point that grows smoothly does not mint a sprite per frame; the
     bucket is then scaled on the way out, which is invisible at these radii
     and is the difference between a cache that works and a cache that is a
     memory leak with extra steps. */
  var SPR = {}, SPR_KEYS = [];
  function bucket(r) {
    if (r < 8) return Math.max(2, Math.round(r));
    if (r < 32) return Math.round(r / 2) * 2;
    return Math.round(r / 8) * 8;
  }
  function spriteFor(key, R, paint) {
    var hit = SPR[key];
    if (hit) return hit;
    var N = Math.max(8, Math.ceil(R * 2) + 2);
    var cv = fresh(N, N);
    var c = cv.getContext("2d");
    paint(c, N / 2, N / 2, R);
    if (SPR_KEYS.length > 160) delete SPR[SPR_KEYS.shift()];
    SPR[key] = cv; SPR_KEYS.push(key);
    return cv;
  }

  /* A point of light: a core that clips to white and a falloff that reaches
     a few times further. `reach` is how far the halo goes in core radii —
     the old fixed value of six is why everything looked like a street lamp. */
  function glow(c, x, y, r, col, opt) {
    if (!isFinite(x) || !isFinite(y) || !isFinite(r) || r <= 0) return;
    opt = opt || {};
    var reach = opt.reach == null ? 3.2 : opt.reach;
    var core = opt.core == null ? 0.72 : opt.core;
    var b = bucket(r), R = b * reach;
    var key = "g|" + col + "|" + b + "|" + reach.toFixed(2) + "|" + core.toFixed(2);
    var sp = spriteFor(key, R, function (cc, cx, cy, RR) {
      var rr = RR / reach;
      var g = cc.createRadialGradient(cx, cy, 0, cx, cy, RR);
      g.addColorStop(0, col);
      g.addColorStop(Math.min(0.5, 0.30 / reach), col);
      g.addColorStop(Math.min(0.85, 1.1 / reach), rgba(col, 0.26));
      g.addColorStop(1, rgba(col, 0));
      cc.fillStyle = g;
      cc.beginPath(); cc.arc(cx, cy, RR, 0, TAU); cc.fill();
      if (core > 0.01) {
        cc.globalAlpha = core;
        cc.fillStyle = "#fff";
        cc.beginPath(); cc.arc(cx, cy, rr * 0.5, 0, TAU); cc.fill();
      }
    });
    var s = (r / b) * sp.width;
    c.save();
    c.globalCompositeOperation = opt.blend || "lighter";
    if (opt.alpha != null) c.globalAlpha = opt.alpha;
    c.drawImage(sp, x - s / 2, y - s / 2, s, s);
    c.restore();
  }

  /* A flat mark: no halo at all. Most of what accumulates on a stage should
     be one of these — a hundred lamps is a smear, a hundred dots is a shape. */
  function dot(c, x, y, r, col, alpha) {
    if (!isFinite(x) || !isFinite(y) || !isFinite(r) || r <= 0) return;
    c.save();
    c.globalAlpha = alpha == null ? 1 : alpha;
    c.fillStyle = col;
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    c.restore();
  }

  /* kept for callers that still ask for the old four-spiked lamp; it is now
     simply a glow, because the spikes were the single most artificial thing
     on the frame */
  function star(c, x, y, r, col, opt) {
    glow(c, x, y, r, col, opt);
  }

  /* #rrggbb or rgb()/rgba() at a given alpha, cached — this is called inside
     inner loops. */
  var CACHE = {}, CACHE_N = 0;
  function rgba(col, a) {
    var k = col + "|" + a;
    var hit = CACHE[k];
    if (hit) return hit;
    var p = parse(col);
    var out = "rgba(" + p[0] + "," + p[1] + "," + p[2] + "," + a + ")";
    if (CACHE_N > 4000) { CACHE = {}; CACHE_N = 0; }
    CACHE[k] = out; CACHE_N++;
    return out;
  }
  function parse(col) {
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
    return [r, g, b];
  }
  function mix(a, b, t) {
    var x = parse(a), y = parse(b);
    return "rgb(" + Math.round(x[0] + (y[0] - x[0]) * t) + "," +
                    Math.round(x[1] + (y[1] - x[1]) * t) + "," +
                    Math.round(x[2] + (y[2] - x[2]) * t) + ")";
  }

  /* ---- vignette ----------------------------------------------------------- */
  function vignette(c, w, h, amount) {
    amount = amount == null ? 0.30 : amount;
    if (amount <= 0.002) return;
    var r = Math.max(w, h) * 0.80;
    var g = c.createRadialGradient(w / 2, h * 0.46, r * 0.34, w / 2, h * 0.46, r);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.70, "rgba(0,0,0," + (amount * 0.22).toFixed(3) + ")");
    g.addColorStop(1, "rgba(0,0,0," + amount.toFixed(3) + ")");
    c.save();
    c.globalCompositeOperation = "source-over";
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.restore();
  }

  /* ---- grain --------------------------------------------------------------
     Deterministic: the seed is the frame index, so re-rendering a playhead
     reproduces its pixels exactly. A tile is drawn once per seed and
     repeated, because per-pixel noise over two million pixels is not a thing
     to do sixty times a second. */
  var GRAIN = {}, GRAIN_KEYS = [];
  function grainTile(seed) {
    var key = "g" + seed;
    if (GRAIN[key]) return GRAIN[key];
    var N = 128;
    var cv = fresh(N, N);
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
    if (GRAIN_KEYS.length > 16) delete GRAIN[GRAIN_KEYS.shift()];
    GRAIN[key] = cv; GRAIN_KEYS.push(key);
    return cv;
  }
  /* Grain laid into a surface ONCE, for the cached background. Over the
     final frame it is a two-megapixel blend every frame — eleven
     milliseconds of the thirty-nine this page was spending — and what it
     buys is a texture that does not move. Baking it into the ground gets the
     same texture for nothing. */
  function grainInto(c, w, h, amount, seed, mode) {
    grain(c, w, h, amount, seed, mode);
  }
  function grain(c, w, h, amount, seed, mode) {
    if (!(amount > 0.002)) return;
    var t = grainTile((seed | 0) % 8);
    var pat = c.createPattern(t, "repeat");
    if (!pat) return;
    c.save();
    c.globalCompositeOperation = mode || "overlay";
    c.globalAlpha = Math.min(0.2, amount);
    c.fillStyle = pat;
    c.fillRect(0, 0, w, h);
    c.restore();
  }

  /* ---- a warm grade -------------------------------------------------------
     Light, now. A plain additive sum of gold strokes climbs the green channel
     fastest and arrives at a sour yellow-white; a touch of warmth puts the
     climb back through orange. At the old strength it also flattened
     everything into the same amber, which is half of what "too much glow"
     meant. */
  function grade(c, w, h, strength) {
    strength = strength == null ? 0.35 : strength;
    if (strength <= 0.002) return;
    c.save();
    c.globalCompositeOperation = "soft-light";
    c.globalAlpha = 0.22 * strength;
    c.fillStyle = "#c98a2e";
    c.fillRect(0, 0, w, h);
    c.restore();
  }

  /* ---- a watercolour wash -------------------------------------------------
     For the paper theme, where there is no additive light at all. Soft blots
     of two or three colours at low alpha, laid down once into a cached tile
     and scaled up — a wash that is recomputed per frame is both slow and,
     because it moves, wrong. */
  var WASH = null, WASH_KEY = "";
  function wash(c, w, h, cols, seed) {
    var key = w + "x" + h + "|" + cols.join(",") + "|" + seed;
    if (WASH_KEY !== key) {
      var N = 192, M = Math.round(N * h / w);
      var cv = fresh(N, M), cc = cv.getContext("2d");
      cc.fillStyle = cols[0];
      cc.fillRect(0, 0, N, M);
      var s = (seed * 2654435761) >>> 0;
      function rnd() { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }
      for (var i = 0; i < 34; i++) {
        var col = cols[1 + (i % (cols.length - 1))];
        var x = rnd() * N, y = rnd() * M, r = (0.16 + rnd() * 0.42) * N;
        var g = cc.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, rgba(col, 0.40));
        g.addColorStop(0.55, rgba(col, 0.16));
        g.addColorStop(1, rgba(col, 0));
        cc.fillStyle = g;
        cc.fillRect(x - r, y - r, r * 2, r * 2);
      }
      grain(cc, N, M, 0.07, 5, "multiply");
      WASH = cv; WASH_KEY = key;
    }
    c.save();
    c.globalCompositeOperation = "source-over";
    c.imageSmoothingEnabled = true;
    c.drawImage(WASH, 0, 0, w, h);
    c.restore();
  }

  window.SPGlow = {
    expose: expose, develop: develop, bloom: bloom,
    glow: glow, dot: dot, star: star, sprite: spriteFor, fresh: fresh,
    vignette: vignette, grain: grain, grainInto: grainInto,
    grade: grade, wash: wash,
    rgba: rgba, mix: mix, parse: parse,
    _grainTile: grainTile,
    _sprites: function () { return SPR_KEYS.length; }
  };
})();
