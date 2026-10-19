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

/* ===== Reels: a story told by a computation ================================

   THE THING THAT WAS MISSING.

   This site could already draw forty scenes and record them. What it could
   not do was make a POST. The gap is not rendering and it is not data; it is
   that a reel which stops the thumb has a shape, and the shape is always the
   same five things:

     a question at the top that never moves,
     a stage in the middle that accumulates,
     a caption that changes only when something happens,
     a tally that proves it is happening, and
     a last card that says what it all came to.

   A diagram has the middle one. A reel has all five, and the reason the
   other four matter is that they turn a picture into an argument: the
   question poses it, the accumulation makes it, the captions date it, the
   tally makes it countable, and the closing card lands it.

   TWO RULES THIS FILE DOES NOT BREAK.

   First, the clock is monotonic and the events are real. A caption appears
   because a computed event occurred at that instant, never because the
   designer wanted a caption there. If the cycle finder returns eleven
   events, eleven captions appear, and if it returns none the reel says so
   rather than inventing a rhythm.

   Second, holds cost time but never skip it. When the reel pauses on a
   notable event, the clock stops — it does not jump forward to catch up
   afterwards. A viewer who times the year counter against the dates must
   find them consistent, because somebody always does. */

(function () {
  "use strict";

  var DAY = 86400000, TAU = 6.283185307179586, R2 = Math.PI / 180;
  var SERIF = '"Iowan Old Style","Palatino Linotype",Palatino,' +
              '"Book Antiqua","Times New Roman",Georgia,serif';

  function norm(d) { d %= 360; return d < 0 ? d + 360 : d; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function smooth(t) { return t <= 0 ? 0 : (t >= 1 ? 1 : t * t * (3 - 2 * t)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  var RASHI = ["MEŚA", "VṚṢABHA", "MITHUNA", "KARKA", "SIṂHA", "KANYĀ",
               "TULĀ", "VṚŚCIKA", "DHANU", "MAKARA", "KUMBHA", "MĪNA"];
  var MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN",
             "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  function dateCaps(ms) {
    var d = new Date(ms);
    return d.getUTCDate() + " " + MON[d.getUTCMonth()] + " " + d.getUTCFullYear();
  }

  /* ---- type ---------------------------------------------------------------
     Letter-spacing is the whole difference between a title that looks typeset
     and one that looks like a default. Canvas has letterSpacing only in
     recent engines, and this site must work in whatever the reader has, so
     the tracking is done by hand: measure each glyph, advance by its width
     plus the track. It costs a few hundred measureText calls per frame on
     the title, which is nothing beside the thousands of strokes the stage
     draws. */
  function tracked(c, text, x, y, track, align) {
    /* Where the engine has letterSpacing, use it: drawing glyph by glyph
       defeats kerning and shaping, and on a string like "MĪNA" the result is
       a visible gap after the first letter. The per-glyph path stays for
       engines without it, because tracking is not optional here — it is most
       of what makes the type look set rather than defaulted. */
    if ("letterSpacing" in c) {
      var prev = c.letterSpacing, pa = c.textAlign;
      c.letterSpacing = track.toFixed(2) + "px";
      c.textAlign = align === "center" ? "center" : (align === "right" ? "right" : "left");
      c.fillText(String(text), x, y);
      var wid = c.measureText(String(text)).width;
      c.letterSpacing = prev; c.textAlign = pa;
      return wid;
    }
    var chars = String(text).split("");
    var total = 0, i;
    for (i = 0; i < chars.length; i++) total += c.measureText(chars[i]).width + track;
    total -= track;
    var cx = align === "center" ? x - total / 2 : (align === "right" ? x - total : x);
    for (i = 0; i < chars.length; i++) {
      c.fillText(chars[i], cx, y);
      cx += c.measureText(chars[i]).width + track;
    }
    return total;
  }
  /* shrink until it fits, then draw tracked */
  function fitTracked(c, text, x, y, maxW, px, track, align, weight, family) {
    var size = px, has = "letterSpacing" in c;
    for (var guard = 0; guard < 40; guard++) {
      c.font = (weight || "") + " " + size.toFixed(1) + "px " + (family || SERIF);
      var w;
      if (has) {
        var prev = c.letterSpacing;
        c.letterSpacing = (track * size).toFixed(2) + "px";
        w = c.measureText(String(text)).width;
        c.letterSpacing = prev;
      } else {
        w = 0;
        var ch = String(text).split("");
        for (var i = 0; i < ch.length; i++) w += c.measureText(ch[i]).width + track * size;
        w -= track * size;
      }
      if (w <= maxW || size < px * 0.42) break;
      size *= 0.94;
    }
    tracked(c, text, x, y, track * size, align);
    return size;
  }
  function wrapTo(c, text, maxW) {
    var words = String(text).split(/\s+/), lines = [], cur = "";
    for (var i = 0; i < words.length; i++) {
      var t = cur ? cur + " " + words[i] : words[i];
      if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = words[i]; }
      else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  /* ---- the palette --------------------------------------------------------
     Gold on black is not decoration here: the whole render is additive, and
     an additive pipeline needs a dark floor or there is nothing for light to
     be added to. The parchment palette is the one exception and it inverts
     the pipeline rather than recolouring it. */
  var PALETTES = {
    gold: { key: "gold", label: "Gold on black", dark: true,
            bg: "#05060b", ink: "#f4e8cf", gold: "#f0c870", warm: "#ffd79a",
            dim: "#8a7a5c", line: "#6d5f44", hot: "#fff4dd", accent: "#ffb347" },
    moon: { key: "moon", label: "Silver on indigo", dark: true,
            bg: "#060910", ink: "#e8eefc", gold: "#bcd2f5", warm: "#dbe7ff",
            dim: "#6d7b95", line: "#4d5a73", hot: "#ffffff", accent: "#8fb6ff" },
    ember: { key: "ember", label: "Ember", dark: true,
             bg: "#0a0604", ink: "#f7e3d2", gold: "#ef9a4a", warm: "#ffc48a",
             dim: "#8a6448", line: "#6b4a34", hot: "#fff1e0", accent: "#ff7a3d" },
    leaf: { key: "leaf", label: "Ink on parchment", dark: false,
            bg: "#efe6d2", ink: "#2b2418", gold: "#8a6a24", warm: "#6b5a34",
            dim: "#7d7360", line: "#b8ab8e", hot: "#1b1710", accent: "#9c5a1e" }
  };
  function pal(k) { return PALETTES[k] || PALETTES.gold; }

  /* ---- the time map -------------------------------------------------------
     A reel is not a linear map from playhead to date. It has a cold open in
     which the clock has not started, holds at notable events in which it
     stands still, and a tail in which it is finished. The map is built once
     and queried per frame, so the per-frame cost is a binary search rather
     than a scan.

     HOLDS COST TIME, THEY DO NOT SKIP IT. The clock resumes from exactly
     where it paused. That is the difference between a reel a careful viewer
     can check and one they catch out. */
  function buildTimeline(events, opts) {
    var lead = opts.lead || 0, tail = opts.tail || 0;
    var hold = opts.hold || 0;
    var t0 = opts.t0, t1 = opts.t1;
    var body = Math.max(0.5, opts.seconds - lead - tail);
    var held = events.filter(function (e) { return e.hold; });
    var holdTotal = held.length * hold;
    var run = Math.max(0.5, body - holdTotal);
    /* if the holds would eat the whole reel, shrink them rather than the run */
    if (holdTotal > body * 0.55) {
      hold = (body * 0.55) / Math.max(1, held.length);
      holdTotal = held.length * hold;
      run = body - holdTotal;
    }
    var segs = [], s = lead, span = Math.max(1, t1 - t0);
    var prevT = t0;
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      if (!e.hold) continue;
      var dt = e.t - prevT;
      var dur = run * (dt / span);
      segs.push({ s0: s, s1: s + dur, t0: prevT, t1: e.t });
      s += dur;
      segs.push({ s0: s, s1: s + hold, t0: e.t, t1: e.t, held: true });
      s += hold;
      prevT = e.t;
    }
    segs.push({ s0: s, s1: lead + body, t0: prevT, t1: t1 });
    return { lead: lead, tail: tail, seconds: opts.seconds, segs: segs,
             holdSeconds: hold, t0: t0, t1: t1 };
  }
  function clockAt(tl, p) {
    var s = p * tl.seconds;
    if (s <= tl.lead) return { t: tl.t0, phase: "open",
                               openP: tl.lead > 0 ? s / tl.lead : 1 };
    if (s >= tl.seconds - tl.tail)
      return { t: tl.t1, phase: "close",
               closeP: tl.tail > 0 ? (s - (tl.seconds - tl.tail)) / tl.tail : 1 };
    for (var i = 0; i < tl.segs.length; i++) {
      var g = tl.segs[i];
      if (s <= g.s1 || i === tl.segs.length - 1) {
        var f = g.s1 > g.s0 ? (s - g.s0) / (g.s1 - g.s0) : 1;
        return { t: lerp(g.t0, g.t1, clamp(f, 0, 1)), phase: "run",
                 held: !!g.held, heldP: g.held ? clamp(f, 0, 1) : 0 };
      }
    }
    return { t: tl.t1, phase: "run" };
  }

  /* ---- the chrome ---------------------------------------------------------
     Five bands, and their proportions are the format. The stage gets the
     largest share it can while leaving the caption room to be read at arm's
     length on a phone — which, measured rather than guessed, means the
     caption's own date line is never smaller than 3.1% of the frame width. */
  function bands(W, H) {
    return {
      title: { y: H * 0.035, h: H * 0.105 },
      stage: { x: W * 0.045, y: H * 0.160, w: W * 0.910, h: H * 0.470 },
      cap: { y: H * 0.665, h: H * 0.205 },
      tally: { y: H * 0.896 },
      foot: { y: H * 0.945 }
    };
  }

  function drawTitle(c, W, H, B, reel, P, p) {
    var intro = smooth(clamp(p / 0.045, 0, 1));
    c.save();
    c.globalAlpha = intro;
    c.textAlign = "center";
    c.textBaseline = "alphabetic";
    c.fillStyle = P.gold;
    if (reel.kicker) {
      c.font = "600 " + (W * 0.0275).toFixed(1) + "px " + SERIF;
      c.globalAlpha = intro * 0.8;
      tracked(c, reel.kicker.toUpperCase(), W / 2, B.title.y + W * 0.028,
              W * 0.0115, "center");
      c.globalAlpha = intro;
    }
    c.fillStyle = P.warm;
    fitTracked(c, reel.title.toUpperCase(), W / 2,
               B.title.y + W * (reel.kicker ? 0.093 : 0.070),
               W * 0.88, W * 0.072, 0.055, "center", "600");
    c.fillStyle = P.ink;
    c.globalAlpha = intro * 0.72;
    c.font = (W * 0.0245).toFixed(1) + "px " + SERIF;
    var lines = wrapTo(c, reel.subtitle || "", W * 0.84);
    for (var i = 0; i < Math.min(3, lines.length); i++)
      c.fillText(lines[i], W / 2,
                 B.title.y + W * (reel.kicker ? 0.128 : 0.105) + i * W * 0.030);
    c.restore();
  }

  function drawFoot(c, W, H, B, reel, P, p) {
    c.save();
    c.globalAlpha = 0.45 * smooth(clamp(p / 0.05, 0, 1));
    c.fillStyle = P.dim;
    c.textAlign = "center";
    c.font = (W * 0.0165).toFixed(1) + "px " + SERIF;
    tracked(c, reel.foot, W / 2, B.foot.y, W * 0.006, "center");
    c.restore();
  }

  /* The year counter: large, ghosted, sitting behind the caption. It is the
     single element that most makes a long run feel long, because it is the
     only thing on the frame moving continuously. */
  function drawClock(c, W, H, B, reel, P, now) {
    var yrs = (now.t - reel.tl.t0) / DAY / 365.2564;
    var txt = reel.clockMode === "year"
      ? String(new Date(now.t).getUTCFullYear())
      : "YEAR " + (yrs < 10 ? yrs.toFixed(1) : Math.round(yrs));
    c.save();
    c.globalAlpha = 0.13;
    c.fillStyle = P.gold;
    c.textAlign = "center";
    c.font = "600 " + (W * 0.062).toFixed(1) + "px " + SERIF;
    tracked(c, txt, W / 2, B.cap.y + B.cap.h * 0.97, W * 0.010, "center");
    c.restore();
  }

  /* The caption: the most recent event, faded in, and faded out only when a
     later one replaces it. Nothing here blinks — a caption that blinks reads
     as a bug, and a caption that lingers reads as deliberate. */
  function drawCaption(c, W, H, B, reel, P, now, idx) {
    if (idx < 0) return;
    var e = reel.events[idx];
    var age = (now.t - e.t) / DAY;
    var inP = smooth(clamp(age / Math.max(0.4, reel.fadeDays), 0, 1));
    var a = inP;
    if (idx + 1 < reel.events.length) {
      var gap = (reel.events[idx + 1].t - e.t) / DAY;
      var toGo = (reel.events[idx + 1].t - now.t) / DAY;
      if (toGo < gap * 0.12) a *= clamp(toGo / (gap * 0.12), 0, 1);
    }
    if (a <= 0.004) return;
    var y = B.cap.y + W * 0.055;
    c.save();
    c.globalAlpha = a;
    c.textAlign = "center";
    c.fillStyle = P.gold;
    fitTracked(c, e.big, W / 2, y, W * 0.84, W * 0.054, 0.045, "center", "600");
    y += W * 0.045;
    if (e.small) {
      c.fillStyle = P.ink;
      c.globalAlpha = a;
      c.font = (W * 0.0265).toFixed(1) + "px " + SERIF;
      var ls = wrapTo(c, e.small, W * 0.82);
      for (var i = 0; i < Math.min(2, ls.length); i++) {
        c.fillText(ls[i], W / 2, y); y += W * 0.031;
      }
    }
    if (e.note) {
      c.fillStyle = P.accent;
      c.globalAlpha = a * 0.95;
      y += W * 0.006;
      fitTracked(c, e.note.toUpperCase(), W / 2, y, W * 0.84,
                 W * 0.0245, 0.075, "center", "600");
    }
    c.restore();
  }

  /* The tally. It is here for one reason: a claim with a number on it that
     the viewer watched tick is a different kind of claim. */
  function drawTally(c, W, H, B, reel, P, idx) {
    if (!reel.tallyKeys.length) return;
    var counts = {}, k;
    for (k = 0; k < reel.tallyKeys.length; k++) counts[reel.tallyKeys[k]] = 0;
    for (var i = 0; i <= idx && i < reel.events.length; i++) {
      var t = reel.events[i].tally;
      if (t && counts[t] != null) counts[t]++;
    }
    var parts = [];
    for (k = 0; k < reel.tallyKeys.length; k++)
      parts.push(reel.tallyKeys[k].toUpperCase() + "  " + counts[reel.tallyKeys[k]]);
    c.save();
    c.globalAlpha = 0.78;
    c.fillStyle = P.dim;
    c.textAlign = "center";
    c.font = "600 " + (W * 0.0185).toFixed(1) + "px " + SERIF;
    tracked(c, parts.join("   ·   "), W / 2, B.tally.y, W * 0.0075, "center");
    c.restore();
  }

  /* The closing card. It does not wipe the stage — the figure the run drew
     is the evidence, and taking it away to put words in its place throws
     away the only thing the viewer has been watching accumulate. */
  function drawClosing(c, W, H, B, reel, P, closeP) {
    var a = smooth(clamp(closeP * 2.1, 0, 1));
    if (a <= 0.004) return;
    c.save();
    c.globalAlpha = a * 0.72;
    c.fillStyle = P.bg;
    c.fillRect(0, B.cap.y - W * 0.03, W, H - B.cap.y + W * 0.03);
    c.globalAlpha = a;
    c.textAlign = "center";
    var y = B.cap.y + W * 0.055;
    c.fillStyle = P.warm;
    fitTracked(c, reel.closing.big, W / 2, y, W * 0.86, W * 0.062, 0.05,
               "center", "600");
    y += W * 0.055;
    c.fillStyle = P.ink;
    c.font = (W * 0.0255).toFixed(1) + "px " + SERIF;
    for (var i = 0; i < reel.closing.lines.length; i++) {
      var ls = wrapTo(c, reel.closing.lines[i], W * 0.80);
      for (var j = 0; j < ls.length; j++) {
        c.fillText(ls[j], W / 2, y); y += W * 0.033;
      }
      y += W * 0.008;
    }
    c.restore();
  }

  /* ---- stages =============================================================
     Each stage is handed a rect, the palette, the reel, the clock and the
     index of the last event that has happened. It draws into the exposure
     buffer, so everything it does is ADDED rather than painted. */

  /* A zodiac rim: the twelve names, ticks, and nothing else. Every stage in
     this file sits inside one, because the rāśi ring is the coordinate
     system the whole site is about and a figure floating in blank space has
     nowhere to be. */
  function rim(c, G, cx, cy, r, P, alpha) {
    var i;
    c.save();
    c.globalAlpha = (alpha == null ? 1 : alpha) * 0.5;
    c.strokeStyle = G.rgba(P.line, 0.5);
    c.lineWidth = Math.max(1, r * 0.004);
    c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.stroke();
    c.globalAlpha = (alpha == null ? 1 : alpha) * 0.75;
    for (i = 0; i < 12; i++) {
      var a = (i * 30 - 90) * R2;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      c.lineTo(cx + Math.cos(a) * r * 0.965, cy + Math.sin(a) * r * 0.965);
      c.stroke();
    }
    c.fillStyle = G.rgba(P.dim, 0.95);
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = "600 " + (r * 0.062).toFixed(1) + "px " + SERIF;
    for (i = 0; i < 12; i++) {
      var m = ((i * 30 + 15) - 90) * R2, q = r * 1.085;
      tracked(c, RASHI[i], cx + Math.cos(m) * q, cy + Math.sin(m) * q,
              r * 0.008, "center");
    }
    c.restore();
  }

  /* --- 1. the node wheel ---------------------------------------------------
     Every syzygy of the run plotted where in the circle it fell, spiralling
     inward with time, plus the nodal axis drawn as the line it is. The point
     the picture makes is that the dots pile into two opposite places and the
     eclipses are exactly the dots that land there. */
  /* THE RADIUS IS THE LATITUDE, and that one decision is what turns this
     from a pretty scatter into the answer to the question in the title.

     The first version spiralled the dots inward by index, which is what the
     other figures on this site do and is wrong here. Spiralled by time, the
     eclipses came out sprinkled evenly round the whole disc — and they ARE
     sprinkled evenly round the disc, because the nodes regress once every
     18.6 years, so over twenty years eclipses happen at every longitude
     there is. A viewer looking at that picture would correctly conclude the
     reel had no point.

     Plot latitude as the distance from the ring instead and the argument
     draws itself: every new Moon sits above or below the Sun's path by how
     far it actually was, the band of dots crosses the ring exactly twice per
     draconic period, and the marked ones are precisely the dots ON the ring.
     Nothing is highlighted that is not geometrically where the highlight
     says it is. */
  function stageNodes(c, G, R, reel, P, now, idx, p) {
    var cx = R.x + R.w / 2, cy = R.y + R.h * 0.47;
    var r = Math.min(R.w * 0.40, R.h * 0.42);
    var i, a, x, y;
    var K = r * 0.072;                       /* radial pixels per degree of latitude */
    var LI = reel.inner == null ? 0.9 : reel.inner;
    var LO = reel.outer == null ? 1.57 : reel.outer;

    /* The band within which a solar eclipse is certain somewhere on Earth.
       It is drawn as a region because it IS one, but faintly: the first
       version filled it at a fifth opacity and, once exposed and bloomed,
       it came out a solid gold donut that was the first and almost the only
       thing on the frame. The subject is the dots. */
    c.save();
    c.globalAlpha = 0.055;
    c.fillStyle = G.rgba(P.accent, 1);
    c.beginPath();
    c.arc(cx, cy, r + LO * K, 0, TAU);
    c.arc(cx, cy, r - LO * K, 0, TAU, true);
    c.fill();
    c.globalAlpha = 0.14;
    c.strokeStyle = G.rgba(P.accent, 1);
    c.lineWidth = Math.max(0.7, r * 0.002);
    c.beginPath(); c.arc(cx, cy, r + LO * K, 0, TAU); c.stroke();
    c.beginPath(); c.arc(cx, cy, r - LO * K, 0, TAU); c.stroke();
    c.globalAlpha = 0.20;
    c.beginPath(); c.arc(cx, cy, r + LI * K, 0, TAU); c.stroke();
    c.beginPath(); c.arc(cx, cy, r - LI * K, 0, TAU); c.stroke();
    c.restore();

    rim(c, G, cx, cy, r, P, 0.9);

    var ev = reel.events, n = ev.length;
    if (reel.nodeAt) {
      var nl = reel.nodeAt(now.t);
      if (nl != null) {
        var a0 = (nl - 90) * R2, R1 = r * 1.30;
        c.save();
        c.globalAlpha = 0.55;
        c.strokeStyle = G.rgba(P.accent, 0.9);
        c.lineWidth = Math.max(1, r * 0.005);
        c.beginPath();
        c.moveTo(cx + Math.cos(a0) * R1, cy + Math.sin(a0) * R1);
        c.lineTo(cx - Math.cos(a0) * R1, cy - Math.sin(a0) * R1);
        c.stroke();
        c.restore();
        G.star(c, cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, r * 0.020,
               P.accent, { spikes: 0.7 });
        G.star(c, cx - Math.cos(a0) * r, cy - Math.sin(a0) * r, r * 0.020,
               P.accent, { spikes: 0.7 });
      }
    }

    /* The thread through the dots in time order. Successive new Moons are
       29° apart, so this is a chord figure rather than a smooth wave, and at
       any weight above a whisper it becomes the subject. It is kept because
       it shows the order the dots arrived in; it is kept FAINT because the
       dots are the argument. */
    c.save();
    c.globalAlpha = 0.11;
    c.strokeStyle = G.rgba(P.gold, 1);
    c.lineWidth = Math.max(0.8, r * 0.0032);
    c.beginPath();
    for (i = 0; i <= idx && i < n; i++) {
      a = (ev[i].lon - 90) * R2;
      var q = r + ev[i].lat * K;
      x = cx + Math.cos(a) * q; y = cy + Math.sin(a) * q;
      if (i) c.lineTo(x, y); else c.moveTo(x, y);
    }
    c.stroke();
    c.restore();

    for (i = 0; i <= idx && i < n; i++) {
      var e = ev[i];
      a = (e.lon - 90) * R2;
      var qq = r + e.lat * K;
      x = cx + Math.cos(a) * qq; y = cy + Math.sin(a) * qq;
      var fresh = clamp(1 - (now.t - e.t) / (DAY * 70), 0, 1);
      if (e.band === "central") {
        G.star(c, x, y, r * (0.014 + 0.010 * fresh), P.hot, { spikes: 0.85 });
      } else {
        c.save();
        c.globalCompositeOperation = "lighter";
        c.fillStyle = G.rgba(e.band === "partial" ? P.accent : P.gold,
                             (e.band === "partial" ? 0.60 : 0.30) + 0.40 * fresh);
        c.beginPath();
        c.arc(x, y, r * (0.0085 + 0.005 * fresh), 0, TAU);
        c.fill();
        c.restore();
      }
    }
    /* the scale, stated on the frame rather than left to be guessed */
    c.save();
    c.globalAlpha = 0.55;
    c.fillStyle = G.rgba(P.dim, 1);
    c.textAlign = "center";
    c.font = (r * 0.068).toFixed(1) + "px " + SERIF;
    c.fillText("the ring is the Sun\u2019s path \u00b7 a dot\u2019s distance " +
               "from it is the Moon\u2019s latitude",
               cx, Math.min(cy + r * 1.33, R.y + R.h - r * 0.03));
    c.restore();
    G.star(c, cx, cy, r * 0.016, P.warm, { spikes: 0.25, core: 0.55 });
  }

  /* --- 2. the thread -------------------------------------------------------
     A line drawn between two bodies every few days and never rubbed out.
     Nothing is computed about the pattern; the pattern is what thousands of
     straight lines happen to envelope, which is why the figure that appears
     is a fact about the two periods and not a decision by anybody. */
  function stageThread(c, G, R, reel, P, now, idx, p) {
    var cx = R.x + R.w / 2, cy = R.y + R.h * 0.47;
    var r = Math.min(R.w * 0.44, R.h * 0.46);
    var S = reel.thread, n = S.a.length;
    var upto = 0;
    while (upto < n && S.t[upto] <= now.t) upto++;

    rim(c, G, cx, cy, r, P, 0.45);

    var scale = r * 0.97 / S.maxR;
    c.save();
    c.strokeStyle = G.rgba(P.gold, 1);
    c.globalAlpha = S.alpha;
    c.lineWidth = Math.max(0.55, r * 0.0016);
    c.beginPath();
    for (var i = 0; i < upto; i++) {
      c.moveTo(cx + S.a[i].x * scale, cy + S.a[i].y * scale);
      c.lineTo(cx + S.b[i].x * scale, cy + S.b[i].y * scale);
    }
    c.stroke();
    c.restore();

    if (upto > 0) {
      var k = upto - 1;
      /* the live chord, bright, so the eye has something to follow */
      c.save();
      c.strokeStyle = G.rgba(P.hot, 0.95);
      c.globalCompositeOperation = "lighter";
      c.lineWidth = Math.max(1.2, r * 0.0075);
      c.beginPath();
      c.moveTo(cx + S.a[k].x * scale, cy + S.a[k].y * scale);
      c.lineTo(cx + S.b[k].x * scale, cy + S.b[k].y * scale);
      c.stroke();
      c.restore();
      G.star(c, cx + S.a[k].x * scale, cy + S.a[k].y * scale, r * 0.022,
             P.warm, { spikes: 1 });
      G.star(c, cx + S.b[k].x * scale, cy + S.b[k].y * scale, r * 0.026,
             P.hot, { spikes: 1 });
    }
    /* the Sun, which every one of these chords is drawn around */
    G.star(c, cx, cy, r * 0.030, P.hot, { spikes: 1.1, core: 1, spikeLen: 9 });
  }

  /* --- 3. the whirl --------------------------------------------------------
     One event per bead, each at the longitude it happened at, spiralling in.
     When the events advance by a near-constant angle the beads fall into
     arms, and the number of arms is a fact about the ratio of two periods.
     The arm count is MEASURED by clustering rather than asserted, and when
     the longitudes do not cluster the reel says so instead of naming a
     number. */
  function stageWhirl(c, G, R, reel, P, now, idx, p) {
    var cx = R.x + R.w / 2, cy = R.y + R.h * 0.47;
    var r = Math.min(R.w * 0.42, R.h * 0.44);
    rim(c, G, cx, cy, r, P, 0.85);
    var ev = reel.events, n = ev.length;
    for (var i = 0; i <= idx && i < n; i++) {
      var q = r * (0.90 - 0.56 * (n > 1 ? i / (n - 1) : 0));
      var a = (ev[i].lon - 90) * R2;
      var x = cx + Math.cos(a) * q, y = cy + Math.sin(a) * q;
      var fresh = clamp(1 - (now.t - ev[i].t) / (DAY * 160), 0, 1);
      c.save();
      c.globalCompositeOperation = "lighter";
      c.fillStyle = G.rgba(ev[i].marked ? P.hot : P.gold, 0.35 + 0.5 * fresh);
      c.beginPath();
      c.arc(x, y, r * (0.010 + 0.008 * fresh), 0, TAU);
      c.fill();
      c.restore();
      if (i === idx) G.star(c, x, y, r * 0.026, P.hot, { spikes: 1 });
    }
    G.star(c, cx, cy, r * 0.018, P.warm, { spikes: 0.3, core: 0.6 });
  }

  /* --- 4. the loops --------------------------------------------------------
     The path of one graha as it is actually seen: longitude against distance,
     so the retrograde loops are loops rather than a line that reverses. */
  function stageLoops(c, G, R, reel, P, now, idx, p) {
    var cx = R.x + R.w / 2, cy = R.y + R.h * 0.47;
    var r = Math.min(R.w * 0.42, R.h * 0.44);
    rim(c, G, cx, cy, r, P, 0.7);
    var T = reel.track, n = T.lon.length;
    var upto = 0;
    while (upto < n && T.t[upto] <= now.t) upto++;
    var span = T.rMax - T.rMin || 1;
    function pt(i) {
      var a = (T.lon[i] - 90) * R2;
      var q = r * (0.40 + 0.55 * (1 - (T.r[i] - T.rMin) / span));
      return { x: cx + Math.cos(a) * q, y: cy + Math.sin(a) * q };
    }
    c.save();
    c.globalAlpha = 0.5;
    c.strokeStyle = G.rgba(P.gold, 1);
    c.lineWidth = Math.max(1, r * 0.004);
    c.beginPath();
    for (var i = 0; i < upto; i++) {
      var q = pt(i);
      if (i) c.lineTo(q.x, q.y); else c.moveTo(q.x, q.y);
    }
    c.stroke();
    c.restore();
    if (upto > 0) {
      var h = pt(upto - 1);
      G.star(c, h.x, h.y, r * 0.028, P.hot, { spikes: 1 });
    }
    G.star(c, cx, cy, r * 0.016, P.warm, { spikes: 0.3, core: 0.5 });
  }

  var STAGES = { nodes: stageNodes, thread: stageThread,
                 whirl: stageWhirl, loops: stageLoops };

  /* ---- the frame ==========================================================
     ONE definition of "the frame at p", as everywhere else in this codebase,
     so preview, playback, recorder and still export cannot diverge. */
  function frameAt(c, W, H, reel, p) {
    var G = window.SPGlow, P = reel.pal, B = bands(W, H);
    p = clamp(p, 0, 1);
    var now = clockAt(reel.tl, p);

    var idx = -1;
    for (var i = 0; i < reel.events.length; i++)
      if (reel.events[i].t <= now.t) idx = i; else break;

    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = "source-over";
    c.globalAlpha = 1;
    c.fillStyle = P.bg;
    c.fillRect(0, 0, W, H);

    if (P.dark) backdrop(c, W, H, P, reel.seed);

    /* the stage, exposed and then developed */
    var stage = STAGES[reel.stage] || stageWhirl;
    var openZoom = now.phase === "open"
      ? lerp(2.6, 1, smooth(now.openP)) : 1;
    var buf = G.expose(W, H, function (cc) {
      cc.save();
      if (openZoom !== 1) {
        var sx = B.stage.x + B.stage.w / 2, sy = B.stage.y + B.stage.h / 2;
        cc.translate(sx, sy); cc.scale(openZoom, openZoom); cc.translate(-sx, -sy);
      }
      stage(cc, G, B.stage, reel, P, now, idx, p);
      cc.restore();
    });
    G.develop(c, buf, { gain: 1, tight: reel.bloomTight, wide: reel.bloomWide });

    if (P.dark) G.grade(c, W, H, reel.grade);
    G.vignette(c, W, H, P.dark ? 0.62 : 0.18);

    drawTitle(c, W, H, B, reel, P, p);
    if (now.phase !== "close") {
      drawClock(c, W, H, B, reel, P, now);
      drawCaption(c, W, H, B, reel, P, now, idx);
      drawTally(c, W, H, B, reel, P, idx);
    } else {
      drawClosing(c, W, H, B, reel, P, now.closeP);
    }
    drawFoot(c, W, H, B, reel, P, p);

    G.grain(c, W, H, reel.grainAmount, Math.round(p * 600));
    return now;
  }

  /* a faint star field and a central warmth — the two cheapest things that
     stop a dark canvas reading as a dark rectangle */
  function backdrop(c, W, H, P, seed) {
    var G = window.SPGlow;
    var s = (seed || 7) >>> 0;
    c.save();
    c.globalAlpha = 0.55;
    for (var i = 0; i < 150; i++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      var x = (s >>> 8) % W;
      s = (s * 1664525 + 1013904223) >>> 0;
      var y = (s >>> 8) % H;
      s = (s * 1664525 + 1013904223) >>> 0;
      var b = 0.08 + ((s >>> 16) % 100) / 100 * 0.30;
      c.fillStyle = G.rgba(P.ink, b);
      c.fillRect(x, y, 1.1, 1.1);
    }
    c.restore();
    var g = c.createRadialGradient(W / 2, H * 0.40, 0, W / 2, H * 0.40, W * 0.72);
    g.addColorStop(0, G.rgba(P.gold, 0.055));
    g.addColorStop(1, G.rgba(P.gold, 0));
    c.save();
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    c.restore();
  }

  /* ---- recording ----------------------------------------------------------
     A general recorder: any canvas, any function of the playhead.

     SPStage has one of its own, and that is not an oversight. The stage
     recorder is bound to the stage singleton — its canvas, its chrome flags,
     its shot list — and rewriting it to take a callback would mean touching
     the one path in this codebase whose output is a file somebody has
     already posted. This one is the general form, used by anything that is
     not the stage, and it pumps frames exactly the same way for exactly the
     same reason: requestFrame on a zero-rate capture stream gives a constant
     frame rate, and a setTimeout pump rather than rAF keeps recording when
     the tab is in the background. A reel that came out short because the
     user looked away is a bug report nobody can reproduce. */
  function record(canvas, seconds, fps, drawAt, onProgress) {
    return new Promise(function (resolve, reject) {
      var stream;
      try { stream = canvas.captureStream(0); }
      catch (e) { reject(new Error("this browser cannot capture a canvas")); return; }
      var track = stream.getVideoTracks()[0];
      if (!track || !track.requestFrame) {
        reject(new Error("this browser cannot drive frames one at a time"));
        return;
      }
      var mime = "";
      ["video/mp4;codecs=avc1", "video/webm;codecs=vp9",
       "video/webm;codecs=vp8", "video/webm"].forEach(function (t) {
        if (!mime && window.MediaRecorder && MediaRecorder.isTypeSupported(t))
          mime = t;
      });
      if (!mime) { reject(new Error("no supported recording format")); return; }
      var chunks = [], rec;
      try {
        rec = new MediaRecorder(stream,
          { mimeType: mime, videoBitsPerSecond: 16000000 });
      } catch (e) { reject(e); return; }
      var job = { cancel: false };
      RECJOB = job;
      rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = function () {
        RECJOB = null;
        resolve({ blob: new Blob(chunks, { type: mime }), mime: mime,
                  seconds: seconds, frames: total, cancelled: job.cancel });
      };
      var total = Math.max(2, Math.round(seconds * fps)), i = 0;
      rec.start();
      (function pump() {
        if (job.cancel || i > total) { try { rec.stop(); } catch (e) {} return; }
        drawAt(i / total);
        try { track.requestFrame(); } catch (e) {}
        if (onProgress) onProgress(i / total);
        i++;
        setTimeout(pump, Math.max(4, 1000 / fps / 4));
      })();
    });
  }
  var RECJOB = null;
  function cancelRecording() { if (RECJOB) RECJOB.cancel = true; }
  function isRecording() { return !!RECJOB; }

  window.SPReel = {
    record: record, cancelRecording: cancelRecording, isRecording: isRecording,
    PALETTES: PALETTES, pal: pal, bands: bands, frameAt: frameAt,
    buildTimeline: buildTimeline, clockAt: clockAt,
    SERIF: SERIF, RASHI: RASHI, dateCaps: dateCaps,
    tracked: tracked, fitTracked: fitTracked, wrapTo: wrapTo,
    norm: norm, clamp: clamp, smooth: smooth, DAY: DAY
  };
})();

/* ===== The stories ========================================================

   A template here is not a layout. It is a QUESTION together with the
   computation that answers it, and the reel is what that computation looks
   like while it is being carried out.

   That distinction decides everything about this file. A layout can be
   filled with anything; these cannot. "Why isn't there an eclipse every
   amāvāsyā?" is answered by finding every new Moon in the span and asking,
   at each one, how far the Moon was from the node — and the reel marks the
   ones that were close because they WERE close, not because a designer
   wanted a highlight every so often. If the span contains no eclipse the
   reel says so. If the finder returns four events the reel is four events
   long. Nothing here manufactures a rhythm.

   The captions are written from the computed quantities, so a caption can
   never say something the numbers do not. Where a figure is a convention
   rather than a measurement — the limit in degrees below which a syzygy
   becomes an eclipse is a range, not a line — the reel says which
   convention it used.

   WHAT IS NOT CLAIMED. These are astronomy, and are labelled astronomy. The
   rāśi names on the rim are the sidereal signs this site computes
   throughout; the figures the runs draw are facts about ratios of periods
   and carry no interpretive weight at all. A reel that drew a pentagram and
   implied it meant something would be a different and much worse kind of
   object than this one. */

(function () {
  "use strict";

  var DAY = 86400000, R2 = Math.PI / 180;
  function norm(d) { d %= 360; return d < 0 ? d + 360 : d; }
  function sep(a, b) { var d = norm(a - b); return d > 180 ? d - 360 : d; }

  function E() { return window.__kEclip; }
  function H() { return window.__kHelio; }
  function ready() {
    return !!(window.__kEclip && window.__kHelio && window.__kSidAt);
  }

  /* Sanskrit names as this site uses them everywhere else */
  var SA = { Sun: "Sūrya", Moon: "Candra", Mercury: "Budha", Venus: "Śukra",
             Mars: "Maṅgala", Jupiter: "Guru", Saturn: "Śani", Earth: "Earth" };
  var ORDER = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
  var RASHI = window.SPReel ? window.SPReel.RASHI : [];
  function rashiOf(lon) { return RASHI[Math.floor(norm(lon) / 30) % 12]; }

  /* ---- root finding on a continuous function ------------------------------
     The same self-tuning forward scan the cycle nodes use: step forward,
     notice a sign change, bisect. It tunes its own step down to a quarter of
     the smallest gap it has seen, because any scheme that DECIDES where not
     to look can skip an event, and a skipped event is undetectable from the
     result — the figure still looks tidy. */
  function findAll(f, t0, t1, guessDays, cap) {
    cap = cap || 400;
    var out = [], step = Math.max(DAY * 0.25, (guessDays || 30) * DAY / 12);
    var minGap = Infinity, t = t0, prev = f(t);
    for (var g = 0; g < 200000 && t < t1 && out.length < cap; g++) {
      var tn = Math.min(t1, t + step), cu = f(tn);
      if (prev != null && cu != null && (prev < 0) !== (cu < 0) &&
          Math.abs(prev) < 150 && Math.abs(cu) < 150) {
        var lo = t, hi = tn, flo = prev;
        for (var k = 0; k < 60 && hi - lo > 1000; k++) {
          var mid = (lo + hi) / 2, v = f(mid);
          if (v == null) break;
          if ((flo < 0) === (v < 0)) { lo = mid; flo = v; } else hi = mid;
        }
        var r = (lo + hi) / 2;
        if (out.length) minGap = Math.min(minGap, r - out[out.length - 1]);
        out.push(r);
        if (out.length >= 3 && isFinite(minGap))
          step = Math.max(DAY * 0.25, Math.min(step, minGap / 4));
      }
      if (tn >= t1) break;
      t = tn; prev = cu;
    }
    return out;
  }

  /* THE SPAN A REEL COVERS IS THE SPAN ITS EVENTS COVER.

     The finder takes a cap, because an unbounded search over eight hundred
     years of ephemeris is a way to hang a phone. When the cap bites, the
     events stop early — and the first version went on printing the span that
     had been ASKED for. "400 hidings. 800 years." was two true numbers that
     did not belong to each other: four hundred hidings of Śani take about
     four hundred and fourteen years, and the reel had quietly stopped there.

     Every story now measures its own span off its own events, and the reel's
     clock is clamped to match, so the year counter cannot run past the last
     thing that happened. */
  function yearsOf(ev) {
    if (!ev || ev.length < 2) return 0;
    return (ev[ev.length - 1].t - ev[0].t) / DAY / 365.2564;
  }
  /* WHAT THE SPAN IS MEASURED OVER DEPENDS ON WHAT IS DRAWN.

     For a whirl or a node wheel the drawn thing IS the events, so their
     first and last bound the reel. For a thread it is not: the thread is
     drawn every few days across the whole span and the events are only the
     meetings, the last of which falls well before the end. Measuring a
     thread's span off its meetings understated Maṅgala & Earth by three
     years and stopped the clock while chords were still arriving.

     So each story declares the span of its own drawn content, and the reel's
     clock is clamped to that. */
  function cover(t0, t1) { return { t0: t0, t1: t1 }; }

  function elongFn(a, b) {
    return function (t) { var x = E()(a, t), y = E()(b, t);
      return (x && y) ? sep(x.lon, y.lon) : null; };
  }
  function oppFn(a, b) {
    return function (t) { var x = E()(a, t), y = E()(b, t);
      return (x && y) ? sep(x.lon, y.lon + 180) : null; };
  }

  /* ---- 1. the eclipse story ===============================================
     Every new Moon, and how far the Moon stood from the node at each.

     THE CONVENTION IS STATED. An eclipse is not "latitude below a number";
     whether one occurs depends on the Moon's and the Sun's apparent sizes
     and the observer's place, and the honest statement is that a solar
     eclipse somewhere on Earth is CERTAIN inside about 0.9 degrees of
     ecliptic latitude at conjunction, IMPOSSIBLE beyond about 1.6, and
     conditional between. So the reel marks three bands and names them,
     rather than drawing a line and implying one exists. */
  /* THE ECLIPSES ARE NOT DECIDED BY A THRESHOLD HERE.

     The first version classified a syzygy as an eclipse if the Moon's
     latitude was under a limit, and the limits had to be guessed: 0.9° for a
     central eclipse, 1.6° for a partial. Checked against the vendored
     ephemeris's own eclipse search over twenty years, that scheme invented
     one eclipse that does not happen and called six total-or-annular ones
     partial, because the real limits are not constants — they depend on how
     far away the Sun and the Moon happen to be that month, which is exactly
     the thing a fixed number cannot know.

     The library already solves this properly. So the reel asks it. Latitude
     is still what positions the dot, because latitude is what the picture is
     about; it is no longer what decides the label.

     The bands drawn on the ring are then MEASURED from the run rather than
     asserted: the outermost latitude that produced a central eclipse, and
     the outermost that produced any eclipse at all. */
  function eclipseList(full, t0, t1) {
    var A = window.Astronomy, out = [];
    if (!A) return null;
    try {
      if (full) {
        if (!A.SearchLunarEclipse) return null;
        var e = A.SearchLunarEclipse(new Date(t0));
        for (var g = 0; g < 2000 && e && e.peak.date.getTime() < t1; g++) {
          out.push({ t: e.peak.date.getTime(), kind: e.kind });
          e = A.NextLunarEclipse(e.peak);
        }
      } else {
        if (!A.SearchGlobalSolarEclipse) return null;
        var s = A.SearchGlobalSolarEclipse(new Date(t0));
        for (var h = 0; h < 2000 && s && s.peak.date.getTime() < t1; h++) {
          out.push({ t: s.peak.date.getTime(), kind: s.kind });
          s = A.NextGlobalSolarEclipse(s.peak);
        }
      }
    } catch (e2) { return null; }
    return out;
  }

  function eclipseStory(spec) {
    var full = spec.which === "purnima";
    var f = full ? oppFn("Moon", "Sun") : elongFn("Moon", "Sun");
    var ts = findAll(f, spec.t0, spec.t1, 29.53, 420);
    if (ts.length < 3) return null;
    var ecl = eclipseList(full, spec.t0 - 40 * DAY, spec.t1 + 40 * DAY);
    if (!ecl) return null;

    function kindAt(t) {
      for (var i = 0; i < ecl.length; i++)
        if (Math.abs(ecl[i].t - t) < 1.2 * DAY) return ecl[i].kind;
      return null;
    }

    var events = [], central = 0, partial = 0;
    var maxCentral = 0, maxAny = 0;
    for (var i = 0; i < ts.length; i++) {
      var m = E()("Moon", ts[i]);
      if (!m) continue;
      var lat = Math.abs(m.lat);
      var kind = kindAt(ts[i]);
      /* "central" means the shadow's axis reaches: total, annular or hybrid
         for the Sun; the umbra for the Moon. Everything else the library
         reports is a partial or penumbral event, which is still an eclipse. */
      var band = !kind ? "none"
        : ((full ? (kind === "total" || kind === "partial")
                 : (kind !== "partial")) ? "central" : "partial");
      if (band === "central") { central++; maxCentral = Math.max(maxCentral, lat); }
      if (band === "partial") partial++;
      if (band !== "none") maxAny = Math.max(maxAny, lat);
      events.push({
        t: ts[i], lon: m.lon, lat: m.lat, band: band, kind: kind,
        marked: band !== "none",
        hold: band === "central",
        tally: band === "none" ? (full ? "pūrṇimās" : "amāvāsyās") : band,
        big: window.SPReel.dateCaps(ts[i]),
        small: (full ? "Pūrṇimā in " : "Amāvāsyā in ") + rashiOf(m.lon) +
               " · " + lat.toFixed(2) + "° from the ecliptic",
        note: !kind ? null
          : (full ? kind.toUpperCase() + " LUNAR ECLIPSE"
                  : kind.toUpperCase() + " SOLAR ECLIPSE — SOMEWHERE ON EARTH")
      });
    }
    if (!events.length) return null;
    var yrs = yearsOf(events);
    var tot = central + partial;
    return {
      kicker: "Nirayana",
      title: full ? "Why isn\u2019t there an eclipse every Pūrṇimā?"
                  : "Why isn\u2019t there an eclipse every Amāvāsyā?",
      subtitle: "Every " + (full ? "full" : "new") + " Moon for " +
                yrs.toFixed(0) + " years, and how far each stood from the node.",
      stage: "nodes",
      inner: maxCentral || 1, outer: maxAny || 1.5,
      bandNote: "measured from this run, not assumed",
      events: events,
      tallyKeys: [full ? "pūrṇimās" : "amāvāsyās", "central", "partial"],
      /* the rim is drawn in sidereal longitude, and __kSidAt returns Rāhu
         sidereal, so no conversion is needed or wanted here */
      nodeAt: function (t) { return window.__kSidAt("Rahu", new Date(t)); },
      closing: {
        big: tot + " eclipse" + (tot === 1 ? "" : "s") + " in " +
             events.length + " " + (full ? "full" : "new") + " Moons",
        lines: [
          "The Moon\u2019s path is tilted about 5° to the Sun\u2019s. Most " +
          "months it passes above or below, and nothing happens.",
          "Only where the two paths cross can a shadow fall. The sages called " +
          "those two points Rāhu and Ketu. Astronomers call them the nodes. " +
          "They are the same two points.",
          central + " reached " + (full ? "the umbra" : "the ground as a " +
          "total or annular eclipse") + "; the other " + partial +
          " were partial. The furthest from the ecliptic any of them " +
          "managed was " + maxAny.toFixed(2) + "°."
        ]
      }
    };
  }

  /* ---- 2. the thread ======================================================
     A straight line between two planets, drawn every few days for centuries
     and never rubbed out. The envelope that appears is a fact about the
     ratio of their periods and about nothing else: no curve is fitted, no
     symmetry is imposed, and if the ratio were different the figure would be
     different without a line of this file changing. */
  function threadStory(spec) {
    var A = spec.a || "Earth", B = spec.b || "Jupiter";
    var every = spec.everyDays || 5;
    var t = spec.t0, a = [], b = [], ts = [], maxR = 0;
    var guard = 0;
    while (t <= spec.t1 && guard++ < 40000) {
      var ha = H()(A, t), hb = H()(B, t);
      if (ha && hb) {
        var pa = { x: Math.cos((ha.lon - 90) * R2) * ha.r,
                   y: Math.sin((ha.lon - 90) * R2) * ha.r };
        var pb = { x: Math.cos((hb.lon - 90) * R2) * hb.r,
                   y: Math.sin((hb.lon - 90) * R2) * hb.r };
        a.push(pa); b.push(pb); ts.push(t);
        maxR = Math.max(maxR, ha.r, hb.r);
      }
      t += every * DAY;
    }
    if (a.length < 20) return null;

    var sampleT0 = ts[0], sampleT1 = ts[ts.length - 1];
    /* the events are the meetings: every time the two line up as seen from
       the Sun, which is when the thread is shortest */
    var meets = findAll(function (q) {
      var x = H()(A, q), y = H()(B, q);
      return (x && y) ? sep(x.lon, y.lon) : null;
    }, spec.t0, spec.t1, 400, 60);
    var events = meets.map(function (q, i) {
      var y = E()(B, q);
      return {
        t: q, lon: y ? y.lon : 0, marked: true, hold: i < 3,
        tally: "meetings",
        big: window.SPReel.dateCaps(q),
        small: "Meeting " + (i + 1) + " — in a line with the Sun" +
               (y ? ", " + nameOf(B) + " in " + rashiOf(y.lon) : ""),
        note: i === 0 ? "A GOLDEN THREAD, DRAWN EVERY " + every + " DAYS" : null
      };
    });
    var yrs = (sampleT1 - sampleT0) / DAY / 365.2564;
    return {
      kicker: "Nirayana",
      title: nameOf(B) + " & " + nameOf(A),
      subtitle: "A line between them every " + every + " days. What will " +
                "they draw in " + yrs.toFixed(0) + " years?",
      stage: "thread",
      cover: cover(sampleT0, sampleT1),
      thread: { a: a, b: b, t: ts, maxR: maxR, alpha: spec.alpha || 0.14 },
      events: events,
      tallyKeys: ["meetings"],
      closing: {
        big: events.length + " meeting" + (events.length === 1 ? "" : "s") +
             ". " + yrs.toFixed(0) + " years. One figure.",
        lines: [
          "Nothing drew this but the two periods. " + nameOf(B) + " takes " +
          "about " + periodOf(B).toFixed(1) + " years to go round; " +
          nameOf(A) + " takes " + periodOf(A).toFixed(2) + ".",
          "Where the lines crowd, the light piles up. That is all the " +
          "brightness is: a long exposure of a straight line, moved " +
          Math.round((spec.t1 - spec.t0) / DAY / every).toLocaleString("en") +
          " times."
        ]
      }
    };
  }
  function nameOf(k) { return SA[k] || k; }
  var PERIOD = { Mercury: 0.2408, Venus: 0.6152, Earth: 1.0,
                 Mars: 1.8808, Jupiter: 11.862, Saturn: 29.457, Moon: 0.0748 };
  function periodOf(k) { return PERIOD[k] || 1; }

  /* ---- 3. the hiding (asta) ===============================================
     Every time a graha disappears into the Sun's glare, plotted where in the
     circle it happened. The orb is the classical one for that graha, and the
     reel names it, because "combust" is a rule with a number in it and the
     number is tradition's rather than astronomy's. */
  var ORB = { Candra: 12, Maṅgala: 17, Budha: 14, Guru: 11, Śukra: 10, Śani: 15 };
  function astaStory(spec) {
    var body = spec.body || "Venus";
    var sa = SA[body], orb = ORB[sa] || 12;
    var f = function (t) {
      var x = E()(body, t), s = E()("Sun", t);
      if (!x || !s) return null;
      return Math.abs(sep(x.lon, s.lon)) - orb;
    };
    var ts = findAll(f, spec.t0, spec.t1, body === "Mercury" ? 58 : 250, 2400);
    /* only the ENTRIES: the crossing where the gap is closing. Keeping the
       exits too doubles the count and halves the span without saying so. */
    var ev = [];
    for (var i = 0; i < ts.length; i++) {
      var before = f(ts[i] - DAY), after = f(ts[i] + DAY);
      if (before == null || after == null || !(after < before)) continue;
      var s = E()("Sun", ts[i]);
      if (!s) continue;
      ev.push({
        t: ts[i], lon: s.lon, marked: false, hold: ev.length < 3,
        tally: "hidings",
        big: window.SPReel.dateCaps(ts[i]),
        small: sa + " hides in " + rashiOf(s.lon) + " — within " + orb +
               "° of Sūrya",
        note: ev.length === 0 ? "ASTA — THE HIDING" : null
      });
    }
    if (ev.length < 3) return null;
    var lons = ev.map(function (e) { return e.lon; });
    var fit = armsFromStep(lons);
    var arms = fit && fit.visible ? fit.visible.q : (fit ? fit.q : 0);
    var yrs = yearsOf(ev);
    var step = meanStep(lons);
    return {
      kicker: "Nirayana",
      title: sa + " Asta",
      subtitle: "Every time " + sa + " hides in the Sun’s glare. Where does " +
                "it hide?",
      stage: "whirl",
      events: ev,
      tallyKeys: ["hidings"],
      closing: {
        big: ev.length + " hidings. " + yrs.toFixed(0) + " years." +
             (arms ? "  " + numword(arms) + " arms." : ""),
        lines: [
          fit ? armsLine(fit)
             : "These do not fall into arms: the step between them is not " +
               "near any simple fraction of the circle, and the reel says so " +
               "rather than naming a number.",
          "Every hiding is a date. Together they draw a whirl.",
          "The " + orb + "° limit is the classical orb for " + sa +
          ", not an astronomical boundary — the glare fades, it does not stop."
        ]
      }
    };
  }
  function meanStep(lons) {
    var s = 0, n = 0;
    for (var i = 1; i < lons.length; i++) {
      var d = norm(lons[i] - lons[i - 1]);
      s += d; n++;
    }
    return n ? s / n : 0;
  }

  /* HOW MANY ARMS, AND WHY CLUSTERING WAS THE WRONG QUESTION.

     Three hundred years of Sukra hidings plainly draw five arms, and asking
     a clusterer how many groups the longitudes fall into returned none —
     correctly. Each arm PRECESSES: the step between one hiding and the next
     is a little short of four fifths of a circle, so every arm sweeps most
     of a quadrant over the run and the longitudes end up spread everywhere.
     Cluster the raw longitudes and there is nothing to find; the arms are
     visible only because the radius carries time.

     The arms are a property of the STEP, not of the positions. So: take the
     mean step, and ask which small fraction p/q of a circle it is nearest.
     The denominator is the number of arms, the residual is how far each
     circuit falls short, and when nothing fits inside a few degrees the
     answer is honestly none. */
  function armsFromStep(lons) {
    var step = meanStep(lons);
    if (!(step > 0)) return null;
    function nearest(maxQ) {
      var best = null;
      for (var q = 2; q <= maxQ; q++)
        for (var pn = 1; pn < q; pn++) {
          if (gcd(pn, q) !== 1) continue;
          var err = Math.abs(step - 360 * pn / q);
          if (err > 180) err = 360 - err;
          if (!best || err < best.err) best = { p: pn, q: q, err: err };
        }
      /* Two bounds, and the second is what stops this finding a pattern in
         anything. A small step can be fitted by SOME fraction with a large
         denominator almost always, so the residual must also be small beside
         the step itself: a fit a quarter of a step out is not a fit, it is a
         coincidence with a big number in it. */
      if (!best || best.err > 4 || best.err > step * 0.25) return null;
      return best;
    }
    /* TWO ANSWERS, BOTH TRUE, AND THEY ARE DIFFERENT QUESTIONS.

       Budha's hidings step 57.1° — near a sixth of a circle, so the beads
       lie in six arms and six arms is what anybody looking at the figure
       counts. But 3/19 fits the step twelve times more tightly, and that is
       the number of steps before the pattern actually repeats. Reporting
       only the tight fit says "nineteen arms" about a picture with six;
       reporting only the loose one leaves out why they curl.

       So the headline counts what the eye counts, from the small
       denominators, and the closure is given separately. */
    var visible = nearest(12), closes = nearest(36);
    if (!visible && !closes) return null;
    return { step: step, visible: visible, closes: closes,
             q: (visible || closes).q, err: (visible || closes).err };
  }
  function armsLine(fit) {
    var v = fit.visible, c = fit.closes;
    var out = "Each hiding falls " + fit.step.toFixed(1) + "° on from the last";
    if (v) {
      out += " — " + v.p + "/" + v.q + " of a circle, " + v.err.toFixed(2) +
             "° short. So " + v.q + " of them carry it almost once round, " +
             "and that shortfall is why the arms curl instead of closing.";
      if (c && c.q !== v.q)
        out += " The figure repeats in earnest only after " + c.q + ".";
    } else {
      out += ", which is " + c.p + "/" + c.q + " of a circle to within " +
             c.err.toFixed(2) + "° — so the beads lie in " + c.q + " arms.";
    }
    return out;
  }
  function gcd(a, b) { while (b) { var t = a % b; a = b; b = t; } return a; }
  var WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven",
               "eight", "nine", "ten", "eleven", "twelve", "thirteen"];
  function numword(n) { return WORDS[n] ? WORDS[n][0].toUpperCase() +
                                          WORDS[n].slice(1) : String(n); }

  /* ---- 4. vakrī: the loops ================================================ */
  function vakriStory(spec) {
    var body = spec.body || "Mars", sa = SA[body];
    var every = spec.everyDays || 2;
    var t = spec.t0, lon = [], r = [], ts = [], rMin = 1e9, rMax = -1e9;
    var guard = 0;
    while (t <= spec.t1 && guard++ < 40000) {
      var g = E()(body, t), d = window.__kDist(body, t);
      if (g && d) {
        lon.push(g.lon); r.push(d); ts.push(t);
        rMin = Math.min(rMin, d); rMax = Math.max(rMax, d);
      }
      t += every * DAY;
    }
    if (lon.length < 30) return null;
    var trackT0 = ts[0], trackT1 = ts[ts.length - 1];
    /* a station is where apparent longitude stops: the derivative changes
       sign, found on the same scan */
    var f = function (q) {
      var a = E()(body, q - 0.5 * DAY), b = E()(body, q + 0.5 * DAY);
      return (a && b) ? sep(b.lon, a.lon) : null;
    };
    var sts = findAll(f, spec.t0, spec.t1, 180, 120);
    var ev = sts.map(function (q, i) {
      var g = E()(body, q);
      var after = f(q + 2 * DAY);
      var retro = after != null && after < 0;
      return {
        t: q, lon: g ? g.lon : 0, marked: true, hold: i < 2,
        tally: retro ? "turns back" : "turns forward",
        big: window.SPReel.dateCaps(q),
        small: sa + (retro ? " turns vakrī (retrograde) in "
                           : " turns mārgī (direct) in ") +
               (g ? rashiOf(g.lon) : "?"),
        note: i === 0 ? "A STATION — THE MOMENT IT STOPS" : null
      };
    });
    if (ev.length < 2) return null;
    var yrs = (trackT1 - trackT0) / DAY / 365.2564;
    return {
      kicker: "Nirayana",
      title: sa + " Vakrī",
      subtitle: "Why does a planet go backwards? Watch its real path, " +
                "longitude against distance.",
      stage: "loops",
      cover: cover(trackT0, trackT1),
      track: { lon: lon, r: r, t: ts, rMin: rMin, rMax: rMax },
      events: ev,
      tallyKeys: ["turns back", "turns forward"],
      closing: {
        big: Math.floor(ev.length / 2) + " loops in " + yrs.toFixed(0) + " years",
        lines: [
          "It never reverses. The Earth overtakes it on the inside, and from " +
          "a moving platform the slower thing appears to slide back.",
          "Drawn against distance, the reversal is a loop — which is what it " +
          "has been the whole time."
        ]
      }
    };
  }

  /* ---- 5. any cycle the site already computes ============================= */
  function cycleStory(spec) {
    var node = window.SPNodes && window.SPNodes.byId
      ? window.SPNodes.byId(spec.nodeId) : null;
    if (!node) return null;
    var ctx = { t0: spec.t0, t1: spec.t1, span: spec.t1 - spec.t0 };
    var V = null;
    try { V = node.get(ctx); } catch (e) { V = null; }
    if (!V || !V.events || V.events.length < 3) return null;
    var ev = V.events.map(function (e, i) {
      return { t: e.t, lon: e.lon, marked: false, hold: i < 2,
               tally: V.what || "events",
               big: window.SPReel.dateCaps(e.t),
               small: V.label + " in " + rashiOf(e.lon),
               note: i === 0 ? (V.what || "").toUpperCase() : null };
    });
    var yrs = yearsOf(ev);
    return {
      kicker: "Nirayana",
      title: V.label,
      subtitle: V.n + " of them in " + yrs.toFixed(0) + " years. Where do " +
                "they fall?",
      stage: "whirl",
      events: ev,
      tallyKeys: [V.what || "events"],
      closing: {
        big: V.n + " in " + yrs.toFixed(0) + " years" +
             (V.arms ? ". " + numword(V.arms) + " arms." : ""),
        lines: [
          "Mean interval " + V.meanDays.toFixed(2) + " days.",
          V.closure
            ? "The figure closes after " + V.closure.n + " — about " +
              V.closure.years.toFixed(2) + " years — to within " +
              V.closure.err.toFixed(2) + "°."
            : "These do not close on a small whole number, so no cycle is " +
              "claimed."
        ]
      }
    };
  }

  /* ---- the catalogue ====================================================== */
  var TEMPLATES = [
    { key: "eclipse.new", group: "Eclipses",
      label: "Why isn’t there an eclipse every Amāvāsyā?",
      blurb: "Every new Moon for decades, each marked with how far it stood " +
             "from the node. The eclipses are the ones that land there.",
      years: 20, seconds: 34, build: function (s) {
        s.which = "amavasya"; return eclipseStory(s); } },
    { key: "eclipse.full", group: "Eclipses",
      label: "Why isn’t there an eclipse every Pūrṇimā?",
      blurb: "The same question from the other side of the month.",
      years: 20, seconds: 34, build: function (s) {
        s.which = "purnima"; return eclipseStory(s); } },

    { key: "thread.earth-jupiter", group: "The golden thread",
      label: "Guru & Earth", blurb: "A line between them every five days " +
      "for twelve years. Eleven meetings; one star.",
      years: 12, seconds: 30,
      build: function (s) { s.a = "Earth"; s.b = "Jupiter"; s.everyDays = 5;
                            return threadStory(s); } },
    { key: "thread.earth-venus", group: "The golden thread",
      label: "Śukra & Earth", blurb: "Every three days for eight years. " +
      "Five meetings, and the figure they close.",
      years: 8, seconds: 28,
      build: function (s) { s.a = "Earth"; s.b = "Venus"; s.everyDays = 3;
                            s.alpha = 0.115; return threadStory(s); } },
    { key: "thread.earth-mars", group: "The golden thread",
      label: "Maṅgala & Earth", blurb: "Every four days for sixteen years.",
      years: 16, seconds: 30,
      build: function (s) { s.a = "Earth"; s.b = "Mars"; s.everyDays = 4;
                            return threadStory(s); } },
    { key: "thread.earth-saturn", group: "The golden thread",
      label: "Śani & Earth", blurb: "Every seven days for thirty years — " +
      "one whole circuit of Śani.",
      years: 30, seconds: 32,
      build: function (s) { s.a = "Earth"; s.b = "Saturn"; s.everyDays = 7;
                            return threadStory(s); } },
    { key: "thread.venus-jupiter", group: "The golden thread",
      label: "Śukra & Guru", blurb: "The two brightest, threaded for twelve " +
      "years.", years: 12, seconds: 30,
      build: function (s) { s.a = "Venus"; s.b = "Jupiter"; s.everyDays = 4;
                            return threadStory(s); } },

    { key: "asta.venus", group: "The hiding",
      label: "Śukra Asta", blurb: "Every time Venus hides in the glare, for " +
      "three centuries. Five arms.", years: 300, seconds: 36,
      build: function (s) { s.body = "Venus"; return astaStory(s); } },
    { key: "asta.jupiter", group: "The hiding",
      label: "Guru Asta", blurb: "Jupiter hides every thirteen months. Six " +
      "centuries of them.", years: 600, seconds: 36,
      build: function (s) { s.body = "Jupiter"; return astaStory(s); } },
    { key: "asta.mercury", group: "The hiding",
      label: "Budha Asta", blurb: "The fastest hider — about six times a " +
      "year, counting both conjunctions.", years: 60, seconds: 34,
      build: function (s) { s.body = "Mercury"; return astaStory(s); } },
    { key: "asta.saturn", group: "The hiding",
      label: "Śani Asta", blurb: "Once a year, for eight centuries.",
      years: 800, seconds: 36,
      build: function (s) { s.body = "Saturn"; return astaStory(s); } },
    { key: "asta.mars", group: "The hiding",
      label: "Maṅgala Asta", blurb: "Mars hides about every two years.",
      years: 400, seconds: 34,
      build: function (s) { s.body = "Mars"; return astaStory(s); } },

    { key: "vakri.mars", group: "Going backwards",
      label: "Maṅgala Vakrī", blurb: "Why a planet appears to reverse — " +
      "drawn against its real distance, so the reversal is a loop.",
      years: 15, seconds: 30,
      build: function (s) { s.body = "Mars"; return vakriStory(s); } },
    { key: "vakri.jupiter", group: "Going backwards",
      label: "Guru Vakrī", blurb: "Jupiter turns back once a year, every year.",
      years: 12, seconds: 30,
      build: function (s) { s.body = "Jupiter"; s.everyDays = 3;
                            return vakriStory(s); } },
    { key: "vakri.mercury", group: "Going backwards",
      label: "Budha Vakrī", blurb: "Three times a year, and the loops are " +
      "tight.", years: 6, seconds: 28,
      build: function (s) { s.body = "Mercury"; s.everyDays = 1;
                            return vakriStory(s); } },
    { key: "vakri.venus", group: "Going backwards",
      label: "Śukra Vakrī", blurb: "The rarest of the bright ones — about " +
      "every nineteen months.", years: 16, seconds: 30,
      build: function (s) { s.body = "Venus"; s.everyDays = 2;
                            return vakriStory(s); } },
    { key: "vakri.saturn", group: "Going backwards",
      label: "Śani Vakrī", blurb: "Saturn spends a third of every year " +
      "going backwards.", years: 20, seconds: 30,
      build: function (s) { s.body = "Saturn"; s.everyDays = 4;
                            return vakriStory(s); } }
  ];

  function byKey(k) {
    for (var i = 0; i < TEMPLATES.length; i++)
      if (TEMPLATES[i].key === k) return TEMPLATES[i];
    return null;
  }
  function groups() {
    var seen = {}, out = [];
    TEMPLATES.forEach(function (t) {
      if (!seen[t.group]) { seen[t.group] = 1; out.push(t.group); } });
    return out;
  }

  /* ---- assembly ===========================================================
     The template produces the content; this turns it into a reel: the
     timeline, the palette, the render settings, and the footer promise that
     every output of this site carries. */
  function build(key, opts) {
    if (!ready()) return null;
    opts = opts || {};
    var T = byKey(key);
    if (!T) return null;
    var years = opts.years || T.years;
    var t0 = opts.t0 != null ? opts.t0 : Date.now();
    var spec = { t0: t0, t1: t0 + years * 365.2564 * DAY };
    for (var k in opts) if (opts.hasOwnProperty(k) && spec[k] === undefined)
      spec[k] = opts[k];
    var S = null;
    try { S = T.build(spec); } catch (e) { S = null; }
    if (!S) return null;

    var seconds = opts.seconds || T.seconds;
    S.key = key;
    S.pal = window.SPReel.pal(opts.palette || "gold");
    S.seconds = seconds;
    S.foot = opts.foot || "nirayana · computed in your browser · nothing sent anywhere";
    S.clockMode = opts.clockMode || (years > 40 ? "year" : "elapsed");
    /* HOW LONG A CAPTION TAKES TO ARRIVE, in days of simulated time.

       Tying it to the span over the length — a fifth of a second's worth of
       clock — reads well when events are far apart and fails completely when
       they are not. Venus hides every 292 days and a three-hundred-year reel
       advances 669 days a second, so every caption was still fading in when
       the next one replaced it: three hundred years of text at a third
       opacity. It is therefore capped at a quarter of the typical gap
       between this reel's own events, which is a property of the data rather
       than of the format. */
    var gaps = [];
    for (var gi = 1; gi < S.events.length; gi++)
      gaps.push((S.events[gi].t - S.events[gi - 1].t) / DAY);
    gaps.sort(function (x, y) { return x - y; });
    var typical = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 30;
    S.fadeDays = Math.max(0.2, Math.min(
      (spec.t1 - spec.t0) / DAY / seconds * 0.22, typical * 0.22));
    S.grainAmount = opts.grain == null ? 0.045 : opts.grain;
    S.grade = opts.grade == null ? 1 : opts.grade;
    S.bloomTight = opts.bloomTight == null ? 0.55 : opts.bloomTight;
    S.bloomWide = opts.bloomWide == null ? 0.40 : opts.bloomWide;
    S.seed = (t0 / DAY) | 0;
    var last = S.events[S.events.length - 1];
    var step = S.events.length > 1
      ? (last.t - S.events[0].t) / (S.events.length - 1) : 0;
    var endT = S.cover ? S.cover.t1
                       : Math.min(spec.t1, last.t + step * 0.6);
    S.tl = window.SPReel.buildTimeline(S.events, {
      t0: spec.t0, t1: endT, seconds: seconds,
      lead: opts.lead == null ? Math.min(2.2, seconds * 0.07) : opts.lead,
      tail: opts.tail == null ? Math.min(5.5, seconds * 0.17) : opts.tail,
      hold: opts.hold == null ? 0.65 : opts.hold
    });
    S.years = Math.round((endT - spec.t0) / DAY / 365.2564);
    S.askedYears = years;
    S.truncated = S.years < years - 1;
    S.t0 = spec.t0; S.t1 = endT;
    return S;
  }

  window.SPStories = {
    TEMPLATES: TEMPLATES, byKey: byKey, groups: groups, build: build,
    ready: ready, findAll: findAll,
    /* exposed so the harness can check the finder against brute force */
    _eclipse: eclipseStory, _thread: threadStory, _asta: astaStory
  };
})();

/* ===== The Reel Studio page ==============================================

   One rule governs the wiring: the reel is BUILT once, when the template or
   its span changes, and every frame after that is a read of a finished
   object. Building means running a root finder over decades of ephemeris —
   hundreds of milliseconds — and doing that inside the animation loop would
   put it on the frame path, which is the mistake this codebase has already
   made once and measured at 234 milliseconds a frame.

   So: choose → build (with the canvas saying so) → play. Scrubbing, palette
   changes and recording all read the same built object, which is also why
   the recorder cannot drift from the preview: there is one definition of the
   frame at p and everything calls it. */

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function el(t, c, x) {
    var e = document.createElement(t);
    if (c) e.className = c;
    if (x != null) e.textContent = x;
    return e;
  }

  var REEL = null, P = 0, PLAY = false, RAF = null, T0 = 0;
  var KEY = null, YEARS = null, SECONDS = null, PALETTE = "gold";
  var START = Date.now();
  var BUILDING = false;

  /* The preview canvas is 1080×1920 internally whatever its CSS size, so
     what is previewed is pixel-for-pixel what is exported. A preview at a
     different resolution is a preview of a different picture — type that
     fits at 1080 may not fit at 405. */
  var W = 1080, H = 1920;

  function fit() {
    var cv = $("reel-canvas"), box = $("reel-stagebox");
    if (!cv || !box) return;
    var avail = Math.max(200, box.clientWidth - 2);
    var maxH = Math.max(320, window.innerHeight * 0.74);
    var w = Math.min(avail, maxH * (W / H));
    cv.style.width = w + "px";
    cv.style.height = (w * H / W) + "px";
    if (cv.width !== W) { cv.width = W; cv.height = H; }
  }

  function drawFrame() {
    var cv = $("reel-canvas");
    if (!cv) return;
    var c = cv.getContext("2d");
    if (!REEL) { placeholder(c); return; }
    window.SPReel.frameAt(c, W, H, REEL, P);
    var w = $("reel-when");
    if (w) {
      var now = window.SPReel.clockAt(REEL.tl, P);
      w.textContent = new Date(now.t).toUTCString().slice(5, 16) +
        "   ·   " + (P * REEL.seconds).toFixed(1) + " s of " +
        REEL.seconds.toFixed(0);
    }
  }
  function placeholder(c) {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = "#05060b";
    c.fillRect(0, 0, W, H);
    c.fillStyle = "#6d5f44";
    c.textAlign = "center";
    c.font = "500 34px " + window.SPReel.SERIF;
    c.fillText(BUILDING ? "computing…" : "choose a story", W / 2, H / 2);
  }

  function tick() {
    if (!PLAY) return;
    RAF = requestAnimationFrame(tick);
    if (!REEL) return;
    P = ((Date.now() - T0) / 1000 % REEL.seconds) / REEL.seconds;
    drawFrame();
    var sc = $("reel-scrub");
    if (sc && !(tick.n = (tick.n || 0) + 1) % 5) sc.value = String(Math.round(P * 1000));
    if (tick.n > 1e6) tick.n = 0;
  }
  function play(on) {
    PLAY = on && !!REEL;
    var b = $("reel-play");
    if (b) b.textContent = PLAY ? "Pause" : "Play";
    if (PLAY) { T0 = Date.now() - P * REEL.seconds * 1000; tick(); }
    else if (RAF) { cancelAnimationFrame(RAF); RAF = null; }
  }

  /* ---- building ----------------------------------------------------------- */
  /* A BUILD IN FLIGHT USED TO POISON THE NEXT ONE.

     Building is deferred by a tick so the browser can paint "computing…"
     before the root finder blocks it. The first version read KEY and YEARS
     from the outside when the tick fired, and dropped any request that
     arrived while a build was running. Click a second story quickly enough
     and the pending tick woke up with the NEW key and the OLD template's
     span: Jupiter's thread, built over the eclipse reel's twenty years,
     subtitled "twelve". Everything about the frame looked deliberate.

     So the parameters are captured here, with the key, and a request that
     arrives mid-build is remembered rather than thrown away. */
  var AGAIN = null;
  function rebuild(then) {
    if (!KEY) return;
    var T = window.SPStories.byKey(KEY);
    if (!T) return;
    if (BUILDING) { AGAIN = then || true; return; }
    var key = KEY, years = YEARS || T.years, seconds = SECONDS || T.seconds;
    var palette = PALETTE, start = START;
    BUILDING = true;
    play(false);
    note("Computing " + T.label + " — " + years + " years of ephemeris…");
    drawFrame();
    setTimeout(function () {
      var t = performance.now(), R = null;
      try {
        R = window.SPStories.build(key, {
          t0: start, years: years, seconds: seconds, palette: palette
        });
      } catch (e) { R = null; }
      BUILDING = false;
      if (AGAIN) {
        var cb = AGAIN === true ? null : AGAIN;
        AGAIN = null;
        rebuild(cb || then);
        return;
      }
      if (!R) {
        note("That span produced too few events to make a reel. Try a " +
             "longer one.", true);
        REEL = null; drawFrame(); return;
      }
      R.buildMs = performance.now() - t;
      REEL = R; P = 0;
      note("");
      stats();
      drawFrame();
      play(true);
      if (then) then();
    }, 24);
  }

  function note(m, bad) {
    var n = $("reel-note");
    if (!n) return;
    n.textContent = m || "";
    n.hidden = !m;
    n.className = bad ? "reelnote bad" : "reelnote";
  }

  function stats() {
    var s = $("reel-stats");
    if (!s || !REEL) return;
    s.innerHTML = "";
    var rows = [
      ["Events found", String(REEL.events.length)],
      ["Span", REEL.years + " years, from " +
        new Date(REEL.t0).toUTCString().slice(5, 16)],
      ["Length", REEL.seconds + " s  ·  " +
        REEL.tl.holdSeconds.toFixed(2) + " s held at each marked event"],
      ["Computed in", REEL.buildMs.toFixed(0) + " ms, in this browser"]
    ];
    var marked = REEL.events.filter(function (e) { return e.marked; }).length;
    if (marked) rows.splice(1, 0, ["Marked", marked + " of " +
      REEL.events.length + " met the test the reel names"]);
    var t = el("table", "tbl reeltbl"), tb = el("tbody");
    rows.forEach(function (r) {
      var tr = el("tr");
      tr.appendChild(el("td", null, r[0]));
      tr.appendChild(el("td", "reelval", r[1]));
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    s.appendChild(t);
    var c = $("reel-closing");
    if (c) {
      c.innerHTML = "";
      c.appendChild(el("h4", null, REEL.closing.big));
      REEL.closing.lines.forEach(function (L) {
        c.appendChild(el("p", null, L)); });
    }
  }

  /* ---- the picker --------------------------------------------------------- */
  function picker() {
    var host = $("reel-picker");
    if (!host) return;
    host.innerHTML = "";
    window.SPStories.groups().forEach(function (g) {
      var sec = el("div", "reelgroup");
      sec.appendChild(el("h4", null, g));
      var wrap = el("div", "reelchips");
      window.SPStories.TEMPLATES.filter(function (t) { return t.group === g; })
        .forEach(function (t) {
          var b = el("button", "reelchip" + (KEY === t.key ? " on" : ""), t.label);
          b.type = "button";
          b.title = t.blurb;
          b.addEventListener("click", function () {
            KEY = t.key; YEARS = null; SECONDS = null;
            syncSpan(t);
            picker(); blurb(t); rebuild();
          });
          wrap.appendChild(b);
        });
      sec.appendChild(wrap);
      host.appendChild(sec);
    });
  }
  function blurb(t) {
    var b = $("reel-blurb");
    if (b) { b.textContent = t ? t.blurb : ""; b.hidden = !t; }
  }
  function syncSpan(t) {
    var y = $("reel-years"), s = $("reel-seconds");
    if (y) y.value = String(YEARS || t.years);
    if (s) s.value = String(SECONDS || t.seconds);
    var yl = $("reel-years-out"), sl = $("reel-seconds-out");
    if (yl) yl.textContent = (YEARS || t.years) + " yr";
    if (sl) sl.textContent = (SECONDS || t.seconds) + " s";
  }

  /* ---- export ------------------------------------------------------------- */
  function stillPNG() {
    if (!REEL) return;
    var cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    window.SPReel.frameAt(cv.getContext("2d"), W, H, REEL, P);
    cv.toBlob(function (b) {
      if (b) save(b, REEL.key.replace(/\./g, "-") + "-" +
        Math.round(P * 100) + ".png");
    }, "image/png");
  }
  function save(blob, name) {
    var u = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = u; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 1500);
  }

  function startRecording() {
    if (!REEL || window.SPReel.isRecording()) return;
    var cv = $("reel-canvas"), btn = $("reel-rec");
    play(false);
    var fps = +(($("reel-fps") || {}).value || 30);
    if (btn) btn.textContent = "Stop";
    note("Recording — keep this tab in front.");
    window.SPReel.record(cv, REEL.seconds, fps, function (p) {
      P = p;
      window.SPReel.frameAt(cv.getContext("2d"), W, H, REEL, p);
      var bar = $("reel-prog");
      if (bar) bar.value = String(Math.round(p * 100));
    }, null).then(function (r) {
      if (btn) btn.textContent = "Record";
      note("");
      var ext = r.mime.indexOf("mp4") >= 0 ? "mp4" : "webm";
      save(r.blob, REEL.key.replace(/\./g, "-") + "." + ext);
    }).catch(function (e) {
      if (btn) btn.textContent = "Record";
      note(e.message || "recording failed", true);
    });
  }

  /* ---- boot --------------------------------------------------------------- */
  function bind() {
    if (!$("reel-canvas")) return;
    if (!window.SPReel || !window.SPStories || !window.SPGlow) return;
    if (!window.SPStories.ready()) { setTimeout(bind, 160); return; }

    fit();
    picker();
    drawFrame();

    var pal = $("reel-palette");
    if (pal) {
      Object.keys(window.SPReel.PALETTES).forEach(function (k) {
        var o = document.createElement("option");
        o.value = k; o.textContent = window.SPReel.PALETTES[k].label;
        pal.appendChild(o);
      });
      pal.value = PALETTE;
      pal.addEventListener("change", function () {
        PALETTE = pal.value;
        if (REEL) { REEL.pal = window.SPReel.pal(PALETTE); drawFrame(); }
      });
    }
    var st = $("reel-start");
    if (st) {
      st.value = new Date(START).toISOString().slice(0, 10);
      st.addEventListener("change", function () {
        var t = Date.parse(st.value + "T00:00:00Z");
        if (isFinite(t)) { START = t; rebuild(); }
      });
    }
    var yr = $("reel-years");
    if (yr) yr.addEventListener("change", function () {
      YEARS = +yr.value;
      var o = $("reel-years-out"); if (o) o.textContent = YEARS + " yr";
      rebuild();
    });
    if (yr) yr.addEventListener("input", function () {
      var o = $("reel-years-out"); if (o) o.textContent = yr.value + " yr"; });
    var sec = $("reel-seconds");
    if (sec) sec.addEventListener("change", function () {
      SECONDS = +sec.value;
      var o = $("reel-seconds-out"); if (o) o.textContent = SECONDS + " s";
      rebuild();
    });
    if (sec) sec.addEventListener("input", function () {
      var o = $("reel-seconds-out"); if (o) o.textContent = sec.value + " s"; });

    var pb = $("reel-play");
    if (pb) pb.addEventListener("click", function () { play(!PLAY); });
    var sc = $("reel-scrub");
    if (sc) sc.addEventListener("input", function () {
      play(false); P = (+sc.value) / 1000; drawFrame(); });
    var rc = $("reel-rec");
    if (rc) rc.addEventListener("click", function () {
      if (window.SPReel.isRecording()) window.SPReel.cancelRecording();
      else startRecording();
    });
    var pn = $("reel-still");
    if (pn) pn.addEventListener("click", stillPNG);

    window.addEventListener("resize", function () { fit(); drawFrame(); });

    /* open on the one that best shows what the page is for */
    KEY = "eclipse.new";
    var T = window.SPStories.byKey(KEY);
    syncSpan(T); picker(); blurb(T);
    rebuild();

    try {
      window.__reel = {
        choose: function (k, opt) {
          KEY = k;
          YEARS = opt && opt.years || null;
          SECONDS = opt && opt.seconds || null;
          rebuild(); return true;
        },
        ready: function () { return !!REEL && !BUILDING && !AGAIN; },
        reel: function () { return REEL; },
        at: function (p) { play(false); P = p; drawFrame(); return P; },
        keys: function () {
          return window.SPStories.TEMPLATES.map(function (t) { return t.key; }); },
        palette: function (k) {
          PALETTE = k;
          if (REEL) { REEL.pal = window.SPReel.pal(k); drawFrame(); } },
        size: function () { return { W: W, H: H }; }
      };
    } catch (e) {}
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", function () { setTimeout(bind, 60); });
  else setTimeout(bind, 60);
})();
