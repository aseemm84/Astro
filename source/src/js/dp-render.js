/* ===== Director Pro — the renderer ========================================

   THE COMPOSITING MODEL, AND THE ONE DECISION THE WHOLE FILE TURNS ON.

   A layer that needs a blur, a mask, a blend mode or a chromatic split cannot
   be drawn straight onto the frame: a filter applies to what is drawn AFTER
   it is set, a blend mode mixes with what is already there, and a mask has to
   cut the layer rather than the frame. All three want the layer as a finished
   picture before it touches the frame. So a layer that needs any of them is
   rendered into a scratch canvas and composited; a layer that needs none is
   drawn straight onto the frame.

   That "straight onto the frame" branch is not an optimisation detail, it is
   most of the page's performance. A full-size scratch canvas per layer per
   frame, cleared and allocated, is the difference between a reel that plays
   and a reel that stutters — and the great majority of layers in a real
   document need nothing but a transform and an alpha. So the test for the
   expensive path is made once, from the values actually sampled at this
   instant, and a layer whose blur happens to be zero right now takes the
   cheap path even though it has a blur track.

   SCRATCH CANVASES ARE POOLED. Allocating a 1080×1920 canvas is a few
   megabytes and a garbage-collection pause; doing it four times a frame is a
   pause a second. The pool hands out canvases by size and takes them back.

   THE COMPOSERS ARE BORROWED, NOT REIMPLEMENTED. Every diagram here is one of
   Studio Pro's composers, reached through SPStage.kit, because a second set
   of pictures free to disagree with the first is the trap this codebase has
   stayed out of three times now — the recorder, the Viṃśottarī and Director
   mode. The stage singleton is lent its canvas and size for the duration of a
   layer and handed back.

   WHAT IS DRAWN AT EXPORT AND WHAT IS NOT. Guides, the grid, handles and the
   out-of-window hatching are drawn by overlay(), which the page calls after
   the frame and the recorder never calls. There is no flag to get wrong. */

(function () {
  "use strict";

  var M = null;                       /* DPModel, resolved on first use */
  function mdl() { return M || (M = window.DPModel); }
  function kit() { return window.SPStage.kit; }
  function SS() { return window.SPStage.S; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  var R2 = Math.PI / 180;
  var SANS = 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';

  /* ---- the state of a render ---------------------------------------------- */
  var S = {
    cv: null, ctx: null, W: 1080, H: 1920, U: 1080,
    quality: 1,                       /* preview scale; export always 1 */
    doc: null, C: null, t: 0,
    showGuides: true, showGrid: false, grid: 12
  };

  /* ---- the scratch pool ---------------------------------------------------- */
  var POOL = [];
  function borrowCv(w, h) {
    for (var i = 0; i < POOL.length; i++) {
      if (POOL[i].free && POOL[i].cv.width === w && POOL[i].cv.height === h) {
        POOL[i].free = false;
        var c = POOL[i].cv.getContext("2d");
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.clearRect(0, 0, w, h);
        return POOL[i];
      }
    }
    var cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    var e = { cv: cv, free: false };
    /* a document with twenty effected layers should not keep twenty canvases
       alive for ever; the pool is a working set, not a cache */
    if (POOL.length > 8) POOL.splice(0, POOL.length - 8);
    POOL.push(e);
    return e;
  }
  function giveBack(e) { if (e) e.free = true; }

  /* Lend the Studio Pro stage singleton a canvas and a size. Every composer
     sizes from S.U, so a layer drawn into a scratch canvas is the same
     picture at the same scale as one drawn onto the frame. */
  function borrowStage(ctx, w, h, u, fn) {
    var s = SS();
    var keep = { cv: s.cv, ctx: s.ctx, W: s.W, H: s.H, U: s.U, safe: s.safe,
                 tile: s.tile, head: s.headline, sub: s.sub, pal: s.pal,
                 handle: s.handle };
    s.ctx = ctx; s.W = w; s.H = h; s.U = u; s.safe = false; s.tile = true;
    s.headline = ""; s.sub = "";
    if (S.doc) { s.pal = S.doc.pal; s.handle = S.doc.handle; }
    try { return fn(); }
    finally {
      s.cv = keep.cv; s.ctx = keep.ctx; s.W = keep.W; s.H = keep.H; s.U = keep.U;
      s.safe = keep.safe; s.tile = keep.tile; s.headline = keep.head;
      s.sub = keep.sub; s.pal = keep.pal; s.handle = keep.handle;
    }
  }

  /* ---- colour -------------------------------------------------------------- */
  function pal() {
    var P = window.SPStage.PALS[S.doc ? S.doc.pal : "midnight"];
    return P || window.SPStage.PALS.midnight;
  }
  function colOf(L) {
    var P = pal();
    if (L.col === "custom") return L.hex || P.ink;
    return P[L.col] || P.ink;
  }
  /* "#rrggbb" with an alpha, without a colour library */
  function rgba(hex, a) {
    var h = String(hex || "#000000").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," +
           (n & 255) + "," + clamp(a, 0, 1) + ")";
  }

  /* ---- the backdrop --------------------------------------------------------- */
  var STARS = null;
  function stars(ctx, w, h) {
    var P = pal();
    if (!STARS || STARS.w !== w || STARS.h !== h) {
      var seed = 20260101, pts = [];
      function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff;
                       return seed / 0x7fffffff; }
      for (var i = 0; i < 190; i++)
        pts.push({ x: rnd() * w, y: rnd() * h, r: rnd() * (w / 650) + 0.4,
                   a: rnd() * 0.5 + 0.12 });
      STARS = { w: w, h: h, pts: pts };
    }
    ctx.save();
    STARS.pts.forEach(function (s) {
      ctx.globalAlpha = s.a; ctx.fillStyle = P.star;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }
  function backdrop(ctx, sc, w, h) {
    var P = pal(), st = sc.bg.style;
    if (st === "none") { ctx.clearRect(0, 0, w, h); }
    else if (st === "flat") {
      ctx.fillStyle = sc.bg.hex || P.bg; ctx.fillRect(0, 0, w, h);
    } else if (st === "vignette") {
      ctx.fillStyle = sc.bg.hex || P.bg; ctx.fillRect(0, 0, w, h);
      var g = ctx.createRadialGradient(w / 2, h * 0.42, w * 0.08,
                                       w / 2, h * 0.42, w * 1.0);
      g.addColorStop(0, P.bg2); g.addColorStop(1, sc.bg.hex || P.bg);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    } else if (st === "radial") {
      var g2 = ctx.createRadialGradient(w / 2, h * 0.34, 0, w / 2, h * 0.34, h * 0.8);
      g2.addColorStop(0, P.bg2); g2.addColorStop(1, P.bg);
      ctx.fillStyle = g2; ctx.fillRect(0, 0, w, h);
    } else {
      var g3 = ctx.createLinearGradient(0, 0, 0, h);
      g3.addColorStop(0, P.bg); g3.addColorStop(1, P.bg2);
      ctx.fillStyle = g3; ctx.fillRect(0, 0, w, h);
    }
    if (sc.bg.stars && P.key !== "parchment") stars(ctx, w, h);
  }

  /* ---- effects --------------------------------------------------------------
     Most are one CSS filter string, which the browser runs on the GPU and
     which is therefore enormously cheaper than anything this file could do by
     hand with getImageData. The two that are not — grain and chromatic
     aberration — are done by drawing, and each is written to cost nothing
     when its amount is zero. */
  function filterFor(v) {
    var f = [];
    if (v.blur > 0.01) f.push("blur(" + v.blur.toFixed(2) + "px)");
    if (Math.abs(v.bright - 1) > 0.005) f.push("brightness(" + v.bright.toFixed(3) + ")");
    if (Math.abs(v.contrast - 1) > 0.005) f.push("contrast(" + v.contrast.toFixed(3) + ")");
    if (Math.abs(v.sat - 1) > 0.005) f.push("saturate(" + v.sat.toFixed(3) + ")");
    if (Math.abs(v.hue) > 0.5) f.push("hue-rotate(" + v.hue.toFixed(1) + "deg)");
    if (v.glow > 0.5) f.push("drop-shadow(0 0 " + v.glow.toFixed(1) + "px " +
                             rgba(pal().glow, 0.9) + ")");
    return f.length ? f.join(" ") : "none";
  }
  /* A seeded grain, so it does not crawl between frames at the same time but
     does differ between times — a still grain is a texture, a random one is
     noise, and the one people actually want is a slow one. */
  var GRAIN = {};
  function grainTile(size, seed) {
    var k = size + ":" + seed;
    if (GRAIN[k]) return GRAIN[k];
    var cv = document.createElement("canvas");
    cv.width = cv.height = size;
    var c = cv.getContext("2d");
    var img = c.createImageData(size, size), d = img.data;
    var s = seed * 2654435761 % 2147483647;
    function rnd() { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }
    for (var i = 0; i < d.length; i += 4) {
      var v = 110 + rnd() * 90;
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    if (Object.keys(GRAIN).length > 12) GRAIN = {};
    GRAIN[k] = cv;
    return cv;
  }
  function applyGrain(ctx, w, h, amt, t) {
    if (amt <= 0.004) return;
    var tile = grainTile(128, 1 + (Math.floor(t * 8) % 6));
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = clamp(amt * 0.55, 0, 1);
    var p = ctx.createPattern(tile, "repeat");
    ctx.fillStyle = p; ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  function applyVignette(ctx, w, h, amt) {
    if (amt <= 0.004) return;
    var g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.30,
                                     w / 2, h / 2, Math.max(w, h) * 0.78);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0," + clamp(amt, 0, 1).toFixed(3) + ")");
    ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); ctx.restore();
  }
  /* Chromatic aberration: the red and blue channels drawn a little apart. Done
     with channel-isolating composites rather than per-pixel, so it costs three
     blits instead of a scan of four million bytes. */
  function chromatic(dst, src, w, h, px) {
    var r = borrowCv(w, h), c = r.cv.getContext("2d");
    c.clearRect(0, 0, w, h);
    c.globalCompositeOperation = "source-over";
    c.drawImage(src, 0, 0);
    dst.save();
    dst.globalCompositeOperation = "lighter";
    dst.globalAlpha = 0.5;
    dst.drawImage(r.cv, -px, 0);
    dst.drawImage(r.cv, px, 0);
    dst.globalAlpha = 1;
    dst.globalCompositeOperation = "source-over";
    dst.restore();
    giveBack(r);
  }

  /* ---- masks ----------------------------------------------------------------
     A feathered mask is a gradient drawn in destination-in, which keeps the
     layer's own alpha where the gradient is opaque. The hard case is a rect
     with feather, where four edge gradients would show their corners; a
     single blur on the mask shape is simpler and is what the eye expects. */
  function applyMask(ctx, mk, w, h) {
    if (!mk) return;
    var x = mk.x * w, y = mk.y * h, mw = mk.w * w, mh = mk.h * h;
    var r = borrowCv(w, h), c = r.cv.getContext("2d");
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, w, h);
    c.save();
    if (mk.feather > 0.001) c.filter = "blur(" + (mk.feather * Math.min(w, h) * 0.12).toFixed(1) + "px)";
    c.fillStyle = "#fff";
    if (mk.rot) {
      c.translate(x + mw / 2, y + mh / 2);
      c.rotate(mk.rot * R2);
      c.translate(-(x + mw / 2), -(y + mh / 2));
    }
    if (mk.shape === "ellipse") {
      c.beginPath();
      c.ellipse(x + mw / 2, y + mh / 2, mw / 2, mh / 2, 0, 0, Math.PI * 2);
      c.fill();
    } else if (mk.shape === "round") {
      roundRect(c, x, y, mw, mh, Math.min(mw, mh) * 0.12); c.fill();
    } else {
      c.fillRect(x, y, mw, mh);
    }
    c.restore();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = mk.invert ? "destination-out" : "destination-in";
    ctx.drawImage(r.cv, 0, 0);
    ctx.restore();
    giveBack(r);
  }
  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  /* ---- text, and its animators ---------------------------------------------
     A text animator reveals a line by character, word or line rather than
     fading the whole block, and that is the single effect that most separates
     a reel someone made from a slide someone exported. It needs per-character
     placement, so the line is measured once and each character drawn at its
     own offset with its own alpha — which is also how letter-spacing is
     implemented, since canvas has no tracking. */
  function fitSize(ctx, s, size, maxW, weight) {
    var f = size;
    for (var i = 0; i < 22; i++) {
      ctx.font = (weight || 600) + " " + Math.round(f) + "px " + SANS;
      if (ctx.measureText(s).width <= maxW) break;
      f *= 0.94;
    }
    return f;
  }
  function wrapRows(ctx, s, size, maxW, lines, weight) {
    var words = String(s == null ? "" : s).split(/\s+/), row = "", out = [];
    ctx.font = (weight || 600) + " " + Math.round(size) + "px " + SANS;
    for (var i = 0; i < words.length; i++) {
      var t = row ? row + " " + words[i] : words[i];
      if (ctx.measureText(t).width > maxW && row) { out.push(row); row = words[i]; }
      else row = t;
      if (out.length >= lines) break;
    }
    if (row && out.length < lines) out.push(row);
    return out;
  }
  /* progress of unit i of n, given an overall 0..1 and how much of the run is
     spent staggering rather than animating */
  function unitP(p, i, n, spread) {
    if (n <= 1) return clamp(p, 0, 1);
    var start = (i / n) * spread;
    var len = Math.max(0.0001, 1 - spread);
    return clamp((p - start) / len, 0, 1);
  }
  var ANIMATORS = {
    none:       { label: "All at once", unit: "line" },
    charFade:   { label: "Character by character", unit: "char" },
    charRise:   { label: "Characters rise", unit: "char" },
    charDrop:   { label: "Characters fall in", unit: "char" },
    charScale:  { label: "Characters pop", unit: "char" },
    charBlur:   { label: "Characters focus in", unit: "char" },
    typewriter: { label: "Typewriter", unit: "char" },
    wordFade:   { label: "Word by word", unit: "word" },
    wordRise:   { label: "Words rise", unit: "word" },
    lineRise:   { label: "Line by line", unit: "line" },
    wave:       { label: "Wave", unit: "char" }
  };
  function drawAnimatedLine(ctx, s, x, y, size, col, align, weight, p, kind, tracking) {
    ctx.font = (weight || 600) + " " + Math.round(size) + "px " + SANS;
    ctx.textBaseline = "middle";
    var A = ANIMATORS[kind] || ANIMATORS.none;
    var tr = (tracking || 0) * size;
    if (kind === "none" || kind === "lineRise") {
      ctx.textAlign = align || "center";
      if (tr === 0) { ctx.fillStyle = col; ctx.fillText(s, x, y); return; }
    }
    /* units: whole characters, or whole words that are drawn character-wise
       so tracking still applies */
    var units = A.unit === "word" ? String(s).split(/(\s+)/) : String(s).split("");
    var widths = units.map(function (u) { return ctx.measureText(u).width; });
    var total = 0;
    widths.forEach(function (w) { total += w; });
    total += tr * Math.max(0, units.length - 1);
    var startX = align === "left" ? x : (align === "right" ? x - total : x - total / 2);
    var n = units.length;
    var cx = startX;
    for (var i = 0; i < n; i++) {
      var u = units[i];
      if (u !== " " && u.trim() !== "") {
        var up = kind === "none" || kind === "lineRise"
          ? 1 : unitP(p, i, n, kind === "typewriter" ? 0.98 : 0.55);
        var a = 1, dy = 0, sc = 1, bl = 0;
        if (kind === "charFade" || kind === "wordFade") a = up;
        else if (kind === "charRise" || kind === "wordRise") { a = up; dy = (1 - up) * size * 0.55; }
        else if (kind === "charDrop") { a = up; dy = -(1 - up) * size * 0.55; }
        else if (kind === "charScale") { a = up; sc = 0.4 + 0.6 * up; }
        else if (kind === "charBlur") { a = up; bl = (1 - up) * size * 0.22; }
        else if (kind === "typewriter") { a = up >= 1 ? 1 : 0; }
        else if (kind === "wave") {
          a = up;
          dy = Math.sin((p * 3 - i / n * 1.6) * Math.PI * 2) * size * 0.12 * Math.min(1, up * 2);
        }
        if (a > 0.004) {
          ctx.save();
          ctx.globalAlpha = ctx.globalAlpha * a;
          if (bl > 0.1) ctx.filter = "blur(" + bl.toFixed(2) + "px)";
          ctx.fillStyle = col;
          ctx.textAlign = "left";
          if (sc !== 1) {
            ctx.translate(cx + widths[i] / 2, y + dy);
            ctx.scale(sc, sc);
            ctx.translate(-(cx + widths[i] / 2), -(y + dy));
          }
          ctx.fillText(u, cx, y + dy);
          ctx.restore();
        }
      }
      cx += widths[i] + tr;
    }
  }

  /* ---- drawing one layer's content into a rect ------------------------------ */
  function paint(ctx, L, px, t, v, w, h, report) {
    var P = pal(), m = mdl();
    if (L.kind === "view") {
      var B = window.SPStage.bagOf(L.sel, S.C);
      if (report && B.missing.length)
        B.missing.forEach(function (q) {
          report.missing.push({ layer: nameOf(L), label: q.label || q.id, why: q.why }); });
      var ip = clamp(v.inner, 0, 1);
      if (B.bag.almanac && B.bag.almanac.length) {
        var e = borrowCv(Math.max(32, Math.round(px.w)), Math.max(32, Math.round(px.h)));
        var c2 = e.cv.getContext("2d");
        c2.setTransform(1, 0, 0, 1, 0, 0);
        c2.clearRect(0, 0, e.cv.width, e.cv.height);
        try {
          window.SPAlmanac.draw(c2, e.cv.width, e.cv.height,
                                B.bag.almanac[0].v, ip, P, { foot: S.doc.handle });
        } catch (err) {}
        ctx.drawImage(e.cv, px.x, px.y, px.w, px.h);
        giveBack(e);
        if (report) report.used.push({ id: L.id, composer: "almanac" });
        return;
      }
      var st = { x: px.x, y: px.y, w: px.w, h: px.h,
                 cx: px.x + px.w / 2, cy: px.y + px.h / 2,
                 bandY: px.y + px.h * 0.88, bandH: px.h * 0.12, side: px.w * 0.05 };
      var got = borrowStage(ctx, w, h, w, function () {
        return kit().drawInto(B.bag, ip, st, S.C, L.force);
      });
      if (!got && report)
        report.empty.push({ id: L.id, name: nameOf(L),
          why: L.sel.length ? "nothing in this layer resolves at this moment"
                            : "this layer has no nodes in it" });
      else if (got && got.error && report)
        report.errors.push({ id: L.id, name: nameOf(L), why: got.error });
      else if (got && report) report.used.push({ id: L.id, composer: got.key });
      return;
    }

    if (L.kind === "text") {
      var str = expand(L.text);
      if (!str) return;
      var size = L.size * S.U;
      var rows = wrapRows(ctx, str, size, px.w, Math.max(1, L.lines), L.weight);
      /* a single line is allowed to shrink to fit; a block wraps instead,
         because shrinking a paragraph to fit a box makes it unreadable long
         before it makes it fit */
      if (rows.length === 1) size = fitSize(ctx, rows[0], size, px.w, L.weight);
      var lh = size * L.lineHeight;
      var used = rows.length;
      var top = L.valign === "top" ? px.y + size * 0.7
              : (L.valign === "bottom" ? px.y + px.h - lh * (used - 0.7)
              : px.y + px.h / 2 - lh * (used - 1) / 2);
      var x = L.align === "left" ? px.x
            : (L.align === "right" ? px.x + px.w : px.x + px.w / 2);
      var ap = L.animSeconds > 0.01
        ? clamp((t - windowA(L)) / L.animSeconds, 0, 1) : 1;
      for (var i = 0; i < rows.length; i++) {
        var rp = L.animator === "lineRise" ? unitP(ap, i, rows.length, 0.6) : ap;
        var dy = L.animator === "lineRise" ? (1 - rp) * size * 0.6 : 0;
        ctx.save();
        if (L.animator === "lineRise") ctx.globalAlpha = ctx.globalAlpha * rp;
        drawAnimatedLine(ctx, rows[i], x, top + i * lh + dy, size, colOf(L),
                         L.align, L.weight, rp, L.animator, L.tracking);
        ctx.restore();
      }
      return;
    }

    if (L.kind === "rule") {
      ctx.save();
      ctx.strokeStyle = ctx.fillStyle = colOf(L);
      var lw = Math.max(1, S.U * 0.0018);
      if (L.shape === "bar") ctx.fillRect(px.x, px.y, px.w, Math.max(1, px.h));
      else if (L.shape === "frame") { ctx.lineWidth = lw; ctx.strokeRect(px.x, px.y, px.w, px.h); }
      else if (L.shape === "round") { ctx.lineWidth = lw;
        roundRect(ctx, px.x, px.y, px.w, px.h, Math.min(px.w, px.h) * 0.08); ctx.stroke(); }
      else if (L.shape === "double") {
        ctx.lineWidth = lw; ctx.beginPath();
        ctx.moveTo(px.x, px.y); ctx.lineTo(px.x + px.w, px.y);
        ctx.moveTo(px.x, px.y + px.h); ctx.lineTo(px.x + px.w, px.y + px.h);
        ctx.stroke();
      } else {
        ctx.lineWidth = lw; ctx.beginPath();
        ctx.moveTo(px.x, px.y + px.h / 2); ctx.lineTo(px.x + px.w, px.y + px.h / 2);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    if (L.kind === "shape") {
      ctx.save();
      var cx = px.x + px.w / 2, cy = px.y + px.h / 2;
      var rx = px.w / 2, ry = px.h / 2;
      ctx.lineWidth = Math.max(1, S.U * 0.003);
      ctx.strokeStyle = ctx.fillStyle = colOf(L);
      ctx.beginPath();
      if (L.shape === "ring" || L.shape === "disc") {
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      } else if (L.shape === "star") {
        var n = Math.max(3, L.sides);
        for (var i2 = 0; i2 < n * 2; i2++) {
          var a2 = (i2 / (n * 2)) * Math.PI * 2 - Math.PI / 2;
          var f = i2 % 2 ? 0.45 : 1;
          var X = cx + Math.cos(a2) * rx * f, Y = cy + Math.sin(a2) * ry * f;
          if (i2) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
        }
        ctx.closePath();
      } else {
        var n2 = Math.max(3, L.sides);
        for (var i3 = 0; i3 < n2; i3++) {
          var a3 = (i3 / n2) * Math.PI * 2 - Math.PI / 2;
          var X2 = cx + Math.cos(a3) * rx, Y2 = cy + Math.sin(a3) * ry;
          if (i3) ctx.lineTo(X2, Y2); else ctx.moveTo(X2, Y2);
        }
        ctx.closePath();
      }
      if (L.shape === "disc" || L.shape === "solid") ctx.fill(); else ctx.stroke();
      ctx.restore();
      return;
    }

    if (L.kind === "wash") {
      ctx.save();
      var cl = colOf(L);
      if (L.shape === "vignette") {
        var g = ctx.createRadialGradient(px.x + px.w / 2, px.y + px.h / 2,
          Math.min(px.w, px.h) * 0.2, px.x + px.w / 2, px.y + px.h / 2,
          Math.max(px.w, px.h) * 0.75);
        g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, cl);
        ctx.fillStyle = g; ctx.fillRect(px.x, px.y, px.w, px.h);
      } else if (L.shape === "panel") {
        ctx.fillStyle = cl;
        roundRect(ctx, px.x, px.y, px.w, px.h, Math.min(px.w, px.h) * 0.045);
        ctx.fill();
        ctx.strokeStyle = P.gold; ctx.lineWidth = Math.max(1, S.U * 0.0014);
        ctx.globalAlpha = ctx.globalAlpha * 0.8;
        roundRect(ctx, px.x, px.y, px.w, px.h, Math.min(px.w, px.h) * 0.045);
        ctx.stroke();
      } else if (L.shape === "sweepV" || L.shape === "sweep") {
        var g2 = L.shape === "sweepV"
          ? ctx.createLinearGradient(px.x, px.y, px.x, px.y + px.h)
          : ctx.createLinearGradient(px.x, px.y, px.x + px.w, px.y);
        g2.addColorStop(0, cl); g2.addColorStop(1, rgba(L.hex2 || "#000000", 0));
        ctx.fillStyle = g2; ctx.fillRect(px.x, px.y, px.w, px.h);
      } else if (L.shape === "disc") {
        ctx.fillStyle = cl; ctx.beginPath();
        ctx.ellipse(px.x + px.w / 2, px.y + px.h / 2, px.w / 2, px.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = cl; ctx.fillRect(px.x, px.y, px.w, px.h);
      }
      ctx.restore();
      return;
    }

    if (L.kind === "band") {
      var head = expand(L.text), sb = expand(L.sub);
      if (!head && !sb) return;
      ctx.save();
      ctx.strokeStyle = P.gold; ctx.globalAlpha = ctx.globalAlpha * 0.55;
      ctx.lineWidth = Math.max(1, S.U * 0.0016);
      ctx.beginPath();
      ctx.moveTo(px.x + px.w * 0.26, px.y); ctx.lineTo(px.x + px.w * 0.74, px.y);
      ctx.stroke(); ctx.restore();
      var hp = L.animSeconds > 0.01
        ? clamp((t - windowA(L)) / L.animSeconds, 0, 1) : 1;
      if (head) {
        var hs = fitSize(ctx, head, S.U * 0.040, px.w * 0.96, 700);
        drawAnimatedLine(ctx, head, px.x + px.w / 2, px.y + px.h * 0.36, hs,
                         colOf(L), "center", 700, hp, L.animator, L.tracking);
      }
      if (sb) {
        var ss = fitSize(ctx, sb, S.U * 0.022, px.w * 0.96, 500);
        ctx.save(); ctx.globalAlpha = ctx.globalAlpha * clamp(hp * 1.4 - 0.3, 0, 1);
        ctx.fillStyle = P.dim; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.font = "500 " + Math.round(ss) + "px " + SANS;
        ctx.fillText(sb, px.x + px.w / 2, px.y + px.h * 0.76);
        ctx.restore();
      }
      return;
    }

    if (L.kind === "stamp") {
      var left = expand(L.text || "{date}  ·  {place}");
      var sz = L.size * S.U;
      ctx.save();
      ctx.textBaseline = "middle";
      ctx.fillStyle = colOf(L); ctx.textAlign = "left";
      ctx.font = "500 " + Math.round(fitSize(ctx, left, sz, px.w * 0.62, 500)) + "px " + SANS;
      ctx.fillText(left, px.x, px.y + px.h / 2);
      ctx.fillStyle = P.gold; ctx.textAlign = "right";
      ctx.font = "600 " + Math.round(sz) + "px " + SANS;
      ctx.fillText(S.doc.handle || "@Nirayana.Soft", px.x + px.w, px.y + px.h / 2);
      ctx.restore();
      return;
    }

    if (L.kind === "image" && L.src && L.src.__img) {
      var im = L.src.__img;
      if (im.complete && im.naturalWidth) {
        /* contain, so an image never arrives stretched */
        var ar = im.naturalWidth / im.naturalHeight, br = px.w / px.h;
        var dw = ar > br ? px.w : px.h * ar, dh = ar > br ? px.w / ar : px.h;
        ctx.drawImage(im, px.x + (px.w - dw) / 2, px.y + (px.h - dh) / 2, dw, dh);
      }
      return;
    }
  }

  function windowA(L) { return L.__wa || 0; }

  function nameOf(L) {
    if (L.name) return L.name;
    if (L.kind === "view") {
      if (!L.sel.length) return "Empty view";
      var n = window.SPNodes.byId(L.sel[0]);
      return (n ? n.label : L.sel[0]) + (L.sel.length > 1 ? " +" + (L.sel.length - 1) : "");
    }
    return L.kind.charAt(0).toUpperCase() + L.kind.slice(1);
  }

  /* text tokens, resolved at draw time against the live context */
  function expand(s) {
    if (!s) return "";
    if (!window.SPDirector) return s;
    return window.SPDirector.expand(s, S.C);
  }

  /* ---- one layer ------------------------------------------------------------ */
  function valuesOf(L, t) {
    var m = mdl(), v = {};
    m.PROP_ORDER.forEach(function (k) { v[k] = m.valueOf(L, k, t); });
    return v;
  }
  function needsScratch(L, v) {
    return L.blend !== "source-over" || !!L.mask ||
           v.blur > 0.01 || v.glow > 0.5 || v.chroma > 0.25 ||
           Math.abs(v.bright - 1) > 0.005 || Math.abs(v.contrast - 1) > 0.005 ||
           Math.abs(v.sat - 1) > 0.005 || Math.abs(v.hue) > 0.5 ||
           v.grain > 0.004 || v.reveal < 0.999;
  }

  function drawLayer(ctx, sc, L, t, w, h, report) {
    var m = mdl();
    if (!m.visible(sc, L)) return;
    var win = m.windowOf(L, sc);
    if (t < win.a - 1e-6 || t > win.b + 1e-6) return;
    L.__wa = win.a;
    var v = valuesOf(L, t);
    if (v.opacity <= 0.002) return;

    var px = { x: v.x / 100 * w, y: v.y / 100 * h,
               w: v.w / 100 * w, h: v.h / 100 * h };
    var cx = px.x + px.w / 2, cy = px.y + px.h / 2;
    var heavy = needsScratch(L, v);
    var ent = heavy ? borrowCv(w, h) : null;
    var target = heavy ? ent.cv.getContext("2d") : ctx;

    if (heavy) { target.setTransform(1, 0, 0, 1, 0, 0); }
    target.save();
    if (L.clip) { target.beginPath(); target.rect(px.x, px.y, px.w, px.h); target.clip(); }
    /* the transform, around the layer's own centre */
    target.translate(cx, cy);
    if (v.rot) target.rotate(v.rot * R2);
    if (v.skewX || v.skewY)
      target.transform(1, Math.tan(v.skewY * R2), Math.tan(v.skewX * R2), 1, 0, 0);
    if (v.scale !== 1) target.scale(v.scale, v.scale);
    target.translate(-cx, -cy);
    if (!heavy) target.globalAlpha = ctx.globalAlpha * clamp(v.opacity, 0, 1);
    paint(target, L, px, t, v, w, h, report);
    target.restore();

    if (!heavy) return;

    /* reveal is a wipe of the finished layer, so it cuts the effects too */
    if (v.reveal < 0.999) {
      target.save();
      target.setTransform(1, 0, 0, 1, 0, 0);
      target.globalCompositeOperation = "destination-in";
      var g = target.createLinearGradient(px.x, 0, px.x + px.w, 0);
      var r = clamp(v.reveal, 0, 1);
      g.addColorStop(0, "#fff");
      g.addColorStop(Math.max(0, r - 0.04), "#fff");
      g.addColorStop(Math.min(1, r), "rgba(255,255,255,0)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      target.fillStyle = g; target.fillRect(0, 0, w, h);
      target.restore();
    }
    if (v.grain > 0.004) applyGrain(target, w, h, v.grain, t);
    applyMask(target, L.mask, w, h);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = clamp(v.opacity, 0, 1);
    ctx.globalCompositeOperation = L.blend || "source-over";
    ctx.filter = filterFor(v);
    ctx.drawImage(ent.cv, 0, 0);
    ctx.filter = "none";
    if (v.chroma > 0.25) chromatic(ctx, ent.cv, w, h, v.chroma);
    ctx.restore();
    giveBack(ent);
  }

  /* ---- one scene ------------------------------------------------------------- */
  function drawScene(ctx, sc, t, w, h, report) {
    var m = mdl();
    backdrop(ctx, sc, w, h);
    var cam = m.cameraAt(sc, t);
    var camOn = Math.abs(cam.zoom - 1) > 0.001 || cam.panX || cam.panY || cam.rot;
    ctx.save();
    if (camOn) {
      ctx.translate(w / 2, h / 2);
      ctx.rotate(cam.rot * R2);
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-w / 2 + cam.panX / 100 * w, -h / 2 + cam.panY / 100 * h);
    }
    for (var i = 0; i < sc.layers.length; i++)
      drawLayer(ctx, sc, sc.layers[i], t, w, h, report);
    ctx.restore();
  }

  /* ---- transitions -----------------------------------------------------------
     Drawn OVER the join rather than lengthening it, so adding a dissolve does
     not retime every later scene. Both sides are rendered into scratch
     canvases and mixed; the cost is two scene renders for the half second a
     transition lasts, which is the honest price of a cross dissolve. */
  function drawTransition(ctx, d, idx, f, w, h, report) {
    var m = mdl();
    var a = d.scenes[idx], b = d.scenes[idx + 1];
    var tr = a.trans || { k: "dissolve", seconds: 0.5 };
    var k = tr.k;
    var ea = borrowCv(w, h), eb = borrowCv(w, h);
    var ca = ea.cv.getContext("2d"), cb = eb.cv.getContext("2d");
    ca.setTransform(1, 0, 0, 1, 0, 0); ca.clearRect(0, 0, w, h);
    cb.setTransform(1, 0, 0, 1, 0, 0); cb.clearRect(0, 0, w, h);
    drawScene(ca, a, a.seconds, w, h, null);
    drawScene(cb, b, 0, w, h, report);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    var e = m.ease(f, "inOut");
    if (k === "dissolve") {
      ctx.drawImage(ea.cv, 0, 0);
      ctx.globalAlpha = e; ctx.drawImage(eb.cv, 0, 0);
    } else if (k === "dip") {
      var col = tr.hex || pal().bg;
      if (f < 0.5) { ctx.drawImage(ea.cv, 0, 0); ctx.globalAlpha = f * 2; }
      else { ctx.drawImage(eb.cv, 0, 0); ctx.globalAlpha = (1 - f) * 2; }
      ctx.fillStyle = col; ctx.fillRect(0, 0, w, h);
    } else if (k === "flash") {
      ctx.drawImage(f < 0.5 ? ea.cv : eb.cv, 0, 0);
      ctx.globalAlpha = 1 - Math.abs(f - 0.5) * 2;
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h);
    } else if (k === "pushL" || k === "pushR" || k === "pushU") {
      var dx = k === "pushL" ? -w * e : (k === "pushR" ? w * e : 0);
      var dy = k === "pushU" ? -h * e : 0;
      ctx.drawImage(ea.cv, dx, dy);
      ctx.drawImage(eb.cv, dx + (k === "pushL" ? w : (k === "pushR" ? -w : 0)),
                           dy + (k === "pushU" ? h : 0));
    } else if (k === "wipeL" || k === "wipeU") {
      ctx.drawImage(ea.cv, 0, 0);
      ctx.save();
      ctx.beginPath();
      if (k === "wipeL") ctx.rect(w * (1 - e), 0, w * e, h);
      else ctx.rect(0, h * (1 - e), w, h * e);
      ctx.clip();
      ctx.drawImage(eb.cv, 0, 0);
      ctx.restore();
    } else if (k === "iris") {
      ctx.drawImage(ea.cv, 0, 0);
      ctx.save();
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, Math.max(w, h) * 0.78 * e, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(eb.cv, 0, 0);
      ctx.restore();
    } else if (k === "zoomBlur") {
      ctx.filter = "blur(" + (14 * Math.sin(f * Math.PI)).toFixed(1) + "px)";
      var z1 = 1 + 0.25 * e;
      ctx.save();
      ctx.translate(w / 2, h / 2); ctx.scale(z1, z1); ctx.translate(-w / 2, -h / 2);
      ctx.drawImage(ea.cv, 0, 0);
      ctx.restore();
      ctx.globalAlpha = e;
      var z2 = 1.25 - 0.25 * e;
      ctx.save();
      ctx.translate(w / 2, h / 2); ctx.scale(z2, z2); ctx.translate(-w / 2, -h / 2);
      ctx.drawImage(eb.cv, 0, 0);
      ctx.restore();
      ctx.filter = "none";
    } else if (k === "glitch") {
      ctx.drawImage(f < 0.5 ? ea.cv : eb.cv, 0, 0);
      var src = f < 0.5 ? eb.cv : ea.cv;
      var bands = 9, amp = (1 - Math.abs(f - 0.5) * 2) * w * 0.10;
      for (var i = 0; i < bands; i++) {
        var by = (i / bands) * h, bh = h / bands;
        var off = (((i * 97 + Math.floor(f * 60) * 31) % 13) / 13 - 0.5) * amp;
        ctx.globalAlpha = 0.85;
        ctx.drawImage(src, 0, by, w, bh, off, by, w, bh);
      }
    } else {
      ctx.drawImage(f < 0.5 ? ea.cv : eb.cv, 0, 0);
    }
    ctx.restore();
    giveBack(ea); giveBack(eb);
  }

  /* ---- the frame -------------------------------------------------------------- */
  function render(d, C, t, quiet) {
    var m = mdl();
    S.doc = d; S.C = C; S.t = t;
    var ctx = S.ctx, w = S.W, h = S.H;
    if (!ctx) return null;
    S.U = w;
    var report = quiet ? null : { used: [], missing: [], empty: [], errors: [] };
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.filter = "none";
    ctx.clearRect(0, 0, w, h);

    var cur = m.sceneAt(d, t);
    if (!cur) return report;
    /* is the playhead inside a transition into the NEXT scene? */
    var tr = cur.scene.trans || { k: "cut", seconds: 0 };
    var left = cur.scene.seconds - cur.local;
    var inTrans = cur.i < d.scenes.length - 1 && tr.k !== "cut" &&
                  tr.seconds > 0.01 && left < tr.seconds;
    if (inTrans) {
      drawTransition(ctx, d, cur.i, 1 - left / tr.seconds, w, h, report);
    } else {
      drawScene(ctx, cur.scene, cur.local, w, h, report);
    }

    /* the grade, over everything, which is what a grade is */
    var G = d.grade;
    if (G) {
      if (Math.abs(G.bright - 1) > 0.005 || Math.abs(G.contrast - 1) > 0.005 ||
          Math.abs(G.sat - 1) > 0.005 || Math.abs(G.hue) > 0.5) {
        var e = borrowCv(w, h), c2 = e.cv.getContext("2d");
        c2.setTransform(1, 0, 0, 1, 0, 0); c2.clearRect(0, 0, w, h);
        c2.drawImage(S.cv, 0, 0);
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.filter = "brightness(" + G.bright + ") contrast(" + G.contrast +
                     ") saturate(" + G.sat + ") hue-rotate(" + G.hue + "deg)";
        ctx.drawImage(e.cv, 0, 0);
        ctx.filter = "none";
        ctx.restore();
        giveBack(e);
      }
      applyVignette(ctx, w, h, G.vignette);
      applyGrain(ctx, w, h, G.grain, t);
    }
    if (report) report.scene = cur.i;
    return report;
  }

  /* ---- the overlay: guides, grid, handles --------------------------------------
     Called by the page after the frame and by nothing else, which is why none
     of it can reach an export. */
  var HANDLES = [
    { k: "nw", fx: 0, fy: 0, l: 1, t: 1 }, { k: "n", fx: 0.5, fy: 0, t: 1 },
    { k: "ne", fx: 1, fy: 0, r: 1, t: 1 }, { k: "e", fx: 1, fy: 0.5, r: 1 },
    { k: "se", fx: 1, fy: 1, r: 1, b: 1 }, { k: "s", fx: 0.5, fy: 1, b: 1 },
    { k: "sw", fx: 0, fy: 1, l: 1, b: 1 }, { k: "w", fx: 0, fy: 0.5, l: 1 }
  ];
  function overlay(d, t, pickedId) {
    var m = mdl(), ctx = S.ctx, w = S.W, h = S.H;
    if (!ctx) return;
    var P = pal();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";

    if (S.showGrid) {
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1;
      for (var i = 1; i < S.grid; i++) {
        var x = w * i / S.grid;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      var rows = Math.round(S.grid * h / w);
      for (var j = 1; j < rows; j++) {
        var y = h * j / rows;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    }
    if (S.showGuides) {
      var G = m.SAFE[d.safe] || m.SAFE.instagram;
      if (G.top || G.bottom || G.left || G.right) {
        ctx.strokeStyle = "rgba(255,255,255,0.34)";
        ctx.setLineDash([Math.max(3, w * 0.012), Math.max(3, w * 0.009)]);
        ctx.lineWidth = Math.max(1, w * 0.0018);
        ctx.strokeRect(G.left * w, G.top * h,
                       w * (1 - G.left - G.right), h * (1 - G.top - G.bottom));
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.font = "600 " + Math.round(w * 0.017) + "px " + SANS;
        ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(G.label, G.left * w + w * 0.008, G.top * h + w * 0.008);
      }
    }
    if (pickedId) {
      var f = m.findLayer(d, pickedId);
      var cur = m.sceneAt(d, t);
      if (f && cur && f.scene === cur.scene) {
        var L = f.layer, lt = cur.local;
        var win = m.windowOf(L, cur.scene);
        var on = lt >= win.a - 1e-6 && lt <= win.b + 1e-6;
        var at = clamp(lt, win.a, win.b);
        var v = valuesOf(L, at);
        var px = { x: v.x / 100 * w, y: v.y / 100 * h,
                   w: v.w / 100 * w, h: v.h / 100 * h };
        ctx.save();
        ctx.translate(px.x + px.w / 2, px.y + px.h / 2);
        if (v.rot) ctx.rotate(v.rot * R2);
        ctx.translate(-(px.x + px.w / 2), -(px.y + px.h / 2));
        ctx.setLineDash([Math.max(2, w * 0.008), Math.max(2, w * 0.006)]);
        ctx.strokeStyle = on ? P.gold : P.mal;
        ctx.lineWidth = Math.max(1, w * 0.0022);
        ctx.strokeRect(px.x, px.y, px.w, px.h);
        ctx.setLineDash([]);
        var hs = Math.max(6, w * 0.018);
        HANDLES.forEach(function (q) {
          ctx.fillStyle = P.gold;
          ctx.fillRect(px.x + px.w * q.fx - hs / 2, px.y + px.h * q.fy - hs / 2, hs, hs);
        });
        ctx.restore();
        /* the path a keyframed position traces, which is the one thing about
           a motion you cannot see by scrubbing one frame at a time */
        var tx = L.tracks.x, ty = L.tracks.y;
        if ((tx && tx.length > 1) || (ty && ty.length > 1)) {
          ctx.save();
          ctx.strokeStyle = P.ben; ctx.globalAlpha = 0.85;
          ctx.lineWidth = Math.max(1, w * 0.0018);
          ctx.beginPath();
          for (var s2 = 0; s2 <= 48; s2++) {
            var tt = win.a + (win.b - win.a) * (s2 / 48);
            var vv = valuesOf(L, tt);
            var X = (vv.x + vv.w / 2) / 100 * w, Y = (vv.y + vv.h / 2) / 100 * h;
            if (s2) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
          }
          ctx.stroke();
          /* and a dot at each key, so a path can be read as timing */
          var keys = {};
          (tx || []).forEach(function (q) { keys[q.t.toFixed(3)] = 1; });
          (ty || []).forEach(function (q) { keys[q.t.toFixed(3)] = 1; });
          Object.keys(keys).forEach(function (kt) {
            var vv2 = valuesOf(L, +kt);
            ctx.fillStyle = P.ben;
            ctx.beginPath();
            ctx.arc((vv2.x + vv2.w / 2) / 100 * w, (vv2.y + vv2.h / 2) / 100 * h,
                    Math.max(2, w * 0.006), 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.restore();
        }
        if (!on) {
          ctx.fillStyle = P.mal;
          ctx.font = "600 " + Math.round(w * 0.020) + "px " + SANS;
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText("not on screen at this moment",
                       px.x + px.w / 2, px.y + px.h / 2);
        }
      }
    }
    ctx.restore();
  }

  /* ---- hit testing, in frame fractions ------------------------------------- */
  function hitTest(d, t, fx, fy, pickedId) {
    var m = mdl(), cur = m.sceneAt(d, t);
    if (!cur) return null;
    var sc = cur.scene, lt = cur.local, tol = 0.030;
    function rectOf(L) {
      var win = m.windowOf(L, sc);
      var v = valuesOf(L, clamp(lt, win.a, win.b));
      return { x: v.x / 100, y: v.y / 100, w: v.w / 100, h: v.h / 100 };
    }
    var P = pickedId ? m.findLayer(d, pickedId) : null;
    if (P && P.scene === sc && !P.layer.locked) {
      var R = rectOf(P.layer);
      for (var i = 0; i < HANDLES.length; i++) {
        var q = HANDLES[i];
        if (Math.abs(fx - (R.x + R.w * q.fx)) < tol &&
            Math.abs(fy - (R.y + R.h * q.fy)) < tol)
          return { id: P.layer.id, mode: q.k };
      }
      if (fx > R.x && fx < R.x + R.w && fy > R.y && fy < R.y + R.h)
        return { id: P.layer.id, mode: "move" };
    }
    for (var j = sc.layers.length - 1; j >= 0; j--) {
      var L = sc.layers[j];
      if (!m.visible(sc, L) || L.locked) continue;
      var win2 = m.windowOf(L, sc);
      if (lt < win2.a - 1e-6 || lt > win2.b + 1e-6) continue;
      var R2r = rectOf(L);
      if (fx > R2r.x && fx < R2r.x + R2r.w && fy > R2r.y && fy < R2r.y + R2r.h)
        return { id: L.id, mode: "pick" };
    }
    return null;
  }

  window.DPRender = {
    S: S, HANDLES: HANDLES, ANIMATORS: ANIMATORS,
    attach: function (cv) { S.cv = cv; S.ctx = cv.getContext("2d"); },
    resize: function (d) {
      var F = mdl().FORMATS[d.format] || mdl().FORMATS.reel;
      var q = clamp(S.quality, 0.2, 1);
      S.W = Math.round(F.w * q); S.H = Math.round(F.h * q); S.U = S.W;
      if (S.cv) { S.cv.width = S.W; S.cv.height = S.H; }
      STARS = null; POOL.length = 0;
    },
    /* run something at true export size, then put the preview size back */
    atFullSize: function (d, fn) {
      var q = S.quality;
      S.quality = 1; this.resize(d);
      try { return fn(); } finally { S.quality = q; this.resize(d); }
    },
    render: render, overlay: overlay, hitTest: hitTest,
    valuesOf: valuesOf, nameOf: nameOf, pal: pal, colOf: colOf,
    /* render into somebody else's canvas — the scene strip's thumbnails */
    renderTo: function (cv, w, h, d, C, t) {
      var keep = { cv: S.cv, ctx: S.ctx, W: S.W, H: S.H, U: S.U,
                   guides: S.showGuides, grid: S.showGrid };
      if (cv.width !== w) cv.width = w;
      if (cv.height !== h) cv.height = h;
      S.cv = cv; S.ctx = cv.getContext("2d"); S.W = w; S.H = h; S.U = w;
      S.showGuides = false; S.showGrid = false;
      var out = null;
      try { out = render(d, C, t, true); } catch (e) {}
      S.cv = keep.cv; S.ctx = keep.ctx; S.W = keep.W; S.H = keep.H; S.U = keep.U;
      S.showGuides = keep.guides; S.showGrid = keep.grid;
      return out;
    }
  };
})();
