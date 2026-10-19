/* ===== Studio Pro — the stage, and the composers =========================

   HOW A SELECTION BECOMES A PICTURE. The registry hands this file values with
   declared shapes and no idea what they mean. Each composer here declares
   which shapes it can consume and scores itself against a selection; the best
   score draws. That is the whole mechanism, and it is what makes the page
   combinatorial rather than a gallery: a composer that draws "two longitudes
   and the angle between them" draws the Sun and the Moon, Lagna and the
   Arūḍha, a daśā lord and its dispositor, or a transiting graha and its own
   natal place, without knowing that any of those things exist.

   SCORING, AND WHY IT IS HONEST ABOUT WHAT IT DROPS. A composer scores by how
   much of the selection it consumes. The winner is the one that consumes most,
   and the stage PRINTS WHATEVER IT COULD NOT USE. A studio that quietly
   ignored half a selection would teach its user nothing about why the picture
   looks wrong; one that says "these three are drawn, this one has no place in
   this view, try Layers" is a studio.

   THE LAYERS COMPOSER is what guarantees every combination renders. When the
   selection is too heterogeneous for any single view, Layers splits the stage
   into panels and runs the best sub-composer in each. It always scores above
   zero, so there is no such thing as a selection that draws nothing.

   THE RECORDER. A second implementation of frame-accurate capture, the first
   being the motion pane's on the chart page. The two cannot share code — one
   is inside the report bundle and this page does not load it — so they are
   held together the same way the Viṃśottarī is: a test asserts a recording
   made here lasts the length it advertises, exactly as reel-duration.mjs
   asserts it there. */

(function () {
  "use strict";

  var PALS = {
    midnight: { key: "midnight", label: "Midnight", bg: "#0b1020", bg2: "#161d3a",
      ink: "#f2efe4", dim: "#8f96bb", line: "#2b3358", gold: "#d9b668",
      ben: "#5fbf8f", mal: "#e07a60", star: "#dfe6ff", glow: "#6f7cc0" },
    eclipse: { key: "eclipse", label: "Eclipse", bg: "#000000", bg2: "#0a0a0f",
      ink: "#ffffff", dim: "#9a9a9a", line: "#2a2a33", gold: "#ffc83d",
      ben: "#4dffa6", mal: "#ff6b4a", star: "#ffffff", glow: "#ffb02e" },
    parchment: { key: "parchment", label: "Parchment", bg: "#f7f3e8", bg2: "#eee7d6",
      ink: "#1d2340", dim: "#6c7089", line: "#d8d0ba", gold: "#a17c2a",
      ben: "#2f7d55", mal: "#b5533c", star: "#4a5078", glow: "#c9a24b" },
    ink: { key: "ink", label: "Ink", bg: "#101014", bg2: "#1a1a20", ink: "#ece9e2",
      dim: "#8b8b96", line: "#2e2e38", gold: "#c9a227", ben: "#6fb08a",
      mal: "#c96f55", star: "#d8d8e4", glow: "#7f8aa8" }
  };
  var RATIOS = {
    "9:16": { w: 1080, h: 1920, label: "Story / Reel" },
    "4:5":  { w: 1080, h: 1350, label: "Feed post" },
    "1:1":  { w: 1080, h: 1080, label: "Square" }
  };
  /* Instagram covers these strips with its own chrome. Measured as fractions
     of the frame so they hold at every ratio. */
  var SAFE = { top: 0.14, bottom: 0.20, right: 0.14 };
  var SANS = 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
  var R2 = Math.PI / 180;

  var S = {
    pal: "midnight", ratio: "9:16", safe: true, speed: 1, p: 0, tile: false,
    /* The render size as a fraction of the export size. The stage preview is
       about three hundred CSS pixels wide; rendering it at 1080 was six times
       the pixels anyone could see, and at twenty milliseconds a frame it was
       most of the reason playback ran at four frames a second on a phone.
       Export always goes back to 1 — see withFullSize. */
    quality: 1,
    ctx: null, cv: null, W: 1080, H: 1920, U: 1080,
    headline: "", sub: "", handle: "@Nirayana.Soft"
  };

  function pal() { return PALS[S.pal] || PALS.midnight; }
  function norm(x) { return ((x % 360) + 360) % 360; }

  /* ---- text -------------------------------------------------------------- */
  function txt(s, x, y, size, col, align, weight) {
    if (s == null || s === "") return;
    var c = S.ctx;
    c.fillStyle = col; c.textAlign = align || "center"; c.textBaseline = "middle";
    c.font = (weight || 600) + " " + Math.round(size) + "px " + SANS;
    c.fillText(String(s), x, y);
  }
  /* The size at which a line finally fits a width — a centred line that does
     not fit loses the same number of words at each end, which is the one
     failure that reads as deliberate.

     MEMOISED, because it is the single most expensive thing on the page. Each
     call can run twenty measureText probes, a frame can carry twenty such
     calls, and the answer depends only on the string, the starting size, the
     width and the weight — none of which change between frames of the same
     card. Four hundred text measurements per frame was most of the reason the
     almanac cost six times what any other composer costs. */
  var FITS = {}, FITN = 0;
  function fit(s, size, maxW, weight) {
    var key = (weight || 600) + "|" + Math.round(size) + "|" + Math.round(maxW) + "|" + s;
    var hit = FITS[key];
    if (hit !== undefined) return hit;
    var c = S.ctx, f = size;
    for (var i = 0; i < 20; i++) {
      c.font = (weight || 600) + " " + Math.round(f) + "px " + SANS;
      if (c.measureText(String(s)).width <= maxW) break;
      f *= 0.94;
    }
    /* an unbounded cache on a page that can scrub through a year of dates
       would grow without end; this is a cache, not a ledger */
    if (++FITN > 1200) { FITS = {}; FITN = 0; }
    FITS[key] = f;
    return f;
  }
  function txtFit(s, x, y, size, col, align, weight, maxW) {
    txt(s, x, y, fit(s, size, maxW, weight), col, align, weight);
  }
  /* wrap into at most `lines` rows, returning how many it used */
  function wrap(s, x, y, size, col, maxW, lines, lh) {
    var c = S.ctx, words = String(s).split(/\s+/), row = "", out = [];
    c.font = "500 " + Math.round(size) + "px " + SANS;
    for (var i = 0; i < words.length; i++) {
      var t = row ? row + " " + words[i] : words[i];
      if (c.measureText(t).width > maxW && row) { out.push(row); row = words[i]; }
      else row = t;
      if (out.length >= lines) break;
    }
    if (row && out.length < lines) out.push(row);
    out.forEach(function (r, i) { txt(r, x, y + i * (lh || size * 1.35), size, col, "center", 500); });
    return out.length;
  }

  /* ---- the frame --------------------------------------------------------- */
  function stage() {
    var topPad = S.safe ? S.H * SAFE.top : S.H * 0.045;
    var botPad = S.safe ? S.H * SAFE.bottom : S.H * 0.045;
    var side = S.safe ? S.W * SAFE.right * 0.55 : S.W * 0.055;
    /* the caption band sits inside the bottom pad when the strips are off */
    var band = S.H * 0.115;
    return { x: side, y: topPad, w: S.W - side * 2, h: S.H - topPad - botPad - band,
             cx: S.W / 2, cy: topPad + (S.H - topPad - botPad - band) / 2,
             bandY: S.H - botPad - band, bandH: band, side: side };
  }
  function background() {
    var c = S.ctx, P = pal();
    var g = c.createLinearGradient(0, 0, 0, S.H);
    g.addColorStop(0, P.bg); g.addColorStop(1, P.bg2);
    c.fillStyle = g; c.fillRect(0, 0, S.W, S.H);
  }
  /* a fixed star field, seeded so it does not shimmer between frames */
  var STARS = null;
  function stars() {
    var c = S.ctx, P = pal();
    if (!STARS || STARS.w !== S.W || STARS.h !== S.H) {
      var seed = 20260101, pts = [];
      function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
      for (var i = 0; i < 150; i++)
        pts.push({ x: rnd() * S.W, y: rnd() * S.H, r: rnd() * 1.6 + 0.4, a: rnd() * 0.5 + 0.12 });
      STARS = { w: S.W, h: S.H, pts: pts };
    }
    c.save();
    STARS.pts.forEach(function (s) {
      c.globalAlpha = s.a; c.fillStyle = P.star;
      c.beginPath(); c.arc(s.x, s.y, s.r, 0, Math.PI * 2); c.fill();
    });
    c.restore();
  }
  function captionBand(title, sub) {
    var c = S.ctx, P = pal(), st = stage();
    if (S.tile) {
      /* one line, no rule, no handle: a thumbnail wants to say what it is
         and nothing else */
      txtFit(title || "", S.W / 2, st.bandY + st.bandH * 0.42,
             S.W * 0.054, P.ink, "center", 700, S.W * 0.90);
      return;
    }
    c.save();
    c.strokeStyle = P.gold; c.globalAlpha = 0.6;
    c.lineWidth = Math.max(1.5, S.W * 0.0018);
    c.beginPath(); c.moveTo(0, st.bandY); c.lineTo(S.W, st.bandY); c.stroke();
    c.restore();
    var y = st.bandY + st.bandH * 0.30;
    txtFit(title || "", S.W / 2, y, S.W * 0.042, P.ink, "center", 700, S.W * 0.86);
    if (sub) wrap(sub, S.W / 2, y + st.bandH * 0.30, S.W * 0.021, P.dim, S.W * 0.84, 2);
    txt(S.handle, S.W - st.side, st.bandY + st.bandH * 0.86, S.W * 0.021, P.dim, "right", 500);
  }
  function safeGuides() {
    if (!S.safe || S.tile) return;
    var c = S.ctx, P = pal();
    c.save();
    c.strokeStyle = P.gold; c.globalAlpha = 0.14;
    c.setLineDash([10, 10]); c.lineWidth = 2;
    c.strokeRect(S.W * SAFE.right * 0.25, S.H * SAFE.top,
                 S.W - S.W * SAFE.right * 1.1, S.H * (1 - SAFE.top - SAFE.bottom));
    c.restore();
  }

  /* ---- drawing primitives the composers share ---------------------------- */
  function ringTicks(cx, cy, r, n, alpha, len) {
    var c = S.ctx, P = pal();
    c.save();
    c.strokeStyle = P.dim; c.globalAlpha = alpha == null ? 0.4 : alpha;
    c.lineWidth = Math.max(1, S.U * 0.0013);
    for (var i = 0; i < n; i++) {
      var a = (i * 360 / n - 90) * R2;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      c.lineTo(cx + Math.cos(a) * r * (1 + (len || 0.07)), cy + Math.sin(a) * r * (1 + (len || 0.07)));
      c.stroke();
    }
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
    c.restore();
  }
  function marker(cx, cy, r, deg, label, tone, size) {
    var c = S.ctx, P = pal();
    var col = tone === "gold" ? P.gold : (tone === "dim" ? P.dim : P.glow);
    var a = (deg - 90) * R2, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    c.save();
    c.strokeStyle = col; c.globalAlpha = 0.5;
    c.lineWidth = Math.max(1, S.U * 0.0016);
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(x, y); c.stroke();
    c.globalAlpha = 1; c.fillStyle = col;
    c.beginPath(); c.arc(x, y, Math.max(3, S.U * (size || 0.0055)), 0, Math.PI * 2);
    c.fill();
    c.restore();
    if (label) {
      var lx = cx + Math.cos(a) * r * 1.17, ly = cy + Math.sin(a) * r * 1.17;
      txt(label, lx, ly, S.U * 0.020, col, "center", 700);
    }
    return { x: x, y: y, a: a };
  }
  function arcBand(cx, cy, r, from, to, col, alpha, width) {
    var c = S.ctx;
    c.save();
    c.strokeStyle = col; c.globalAlpha = alpha == null ? 0.35 : alpha;
    c.lineWidth = width || Math.max(6, S.U * 0.016);
    c.beginPath();
    c.arc(cx, cy, r, (from - 90) * R2, (to - 90) * R2);
    c.stroke();
    c.restore();
  }
  /* a readout line: what a longitude is, in every division that names it */
  function placeWords(deg) {
    var NK = window.SPNodes.NAK, RS = window.SPNodes.RASHI;
    var d = norm(deg);
    var ni = Math.floor(d / (40 / 3));
    var pada = Math.floor((d % (40 / 3)) / (10 / 3)) + 1;
    return RS[Math.floor(d / 30)] + " " + (d % 30).toFixed(2) + "°   ·   " +
           NK[ni] + " pāda " + pada;
  }

  /* =======================================================================
     THE COMPOSERS
     Each declares `score(bag)` — how many selected items it can consume, or
     -1 for "cannot draw this at all" — and `draw(bag, p, st)`.
     ======================================================================= */
  /* How much of item i, of n, is drawn at playhead p.

     Every composer used to animate by revealing one more item per step, which
     does exactly nothing when the selection holds one item: a single bar, a
     single chord, one ring. Five of the sampled selections rendered four
     identical frames for that reason — a still presented as an animation.

     This gives each item its own 0→1 growth, staggered across the set, so a
     set of twenty reveals in sequence AND a set of one still grows. The last
     item finishes before the playhead does, so the final frame is the whole
     picture rather than something caught mid-build. */
  function grow(p, i, n) {
    var stagger = n > 1 ? 0.55 : 0;
    var start = n > 1 ? (i / n) * stagger : 0;
    var len = 1 - stagger;
    var f = (Math.min(1, p / 0.92) - start) / len;
    return f <= 0 ? 0 : (f >= 1 ? 1 : f * f * (3 - 2 * f));
  }

  var COMPOSERS = [];
  function composer(key, label, blurb, score, draw) {
    COMPOSERS.push({ key: key, label: label, blurb: blurb, score: score, draw: draw });
  }
  function count(bag, kind) { return (bag[kind] || []).length; }
  function all(bag) {
    var n = 0;
    for (var k in bag) if (bag.hasOwnProperty(k)) n += bag[k].length;
    return n;
  }

  /* --- 1. one longitude, placed ----------------------------------------- */
  composer("mark", "Pointer on the ring",
    "one longitude, with every division that names it",
    function (bag) {
      return (count(bag, "lon") === 1 && all(bag) === 1) ? 1 : -1;
    },
    function (bag, p, st) {
      var P = pal(), v = bag.lon[0].v;
      var r = Math.min(st.w * 0.40, st.h * 0.34);
      var cy = st.y + st.h * 0.40;
      ringTicks(st.cx, cy, r, 27, 0.35);
      ringTicks(st.cx, cy, r * 0.90, 12, 0.5, 0.045);
      /* the pointer sweeps up to its place, so the frame has motion even for
         a single static value */
      var ease = p < 0.6 ? (p / 0.6) : 1;
      marker(st.cx, cy, r, v.deg * ease, v.label, v.tone, 0.007);
      txt(v.label, st.cx, cy, S.U * 0.030, P.ink, "center", 700);
      txt(norm(v.deg).toFixed(3) + "°", st.cx, cy + S.U * 0.038,
          S.U * 0.024, P.gold, "center", 600);
      txtFit(placeWords(v.deg), st.cx, cy + r * 1.42, S.U * 0.021, P.dim,
             "center", 500, st.w * 0.92);
      if (v.arc)
        arcBand(st.cx, cy, r * 0.96, v.arc.from, v.arc.to, P.gold, 0.25);
    });

  /* --- 2. two longitudes and the angle between them ---------------------- */
  composer("angle", "The angle between",
    "two longitudes, the arc, and the subtraction that gives it",
    function (bag) {
      return (count(bag, "lon") === 2 && all(bag) === 2) ? 2 : -1;
    },
    function (bag, p, st) {
      var P = pal(), a = bag.lon[0].v, b = bag.lon[1].v;
      var r = Math.min(st.w * 0.38, st.h * 0.32);
      var cy = st.y + st.h * 0.37;
      ringTicks(st.cx, cy, r, 12, 0.4);
      var d = norm(b.deg - a.deg);
      var shown = d * (p < 0.7 ? p / 0.7 : 1);
      arcBand(st.cx, cy, r * 0.82, a.deg, a.deg + shown, P.gold, 0.40);
      marker(st.cx, cy, r, a.deg, a.label, a.tone);
      marker(st.cx, cy, r, b.deg, b.label, b.tone);
      txt(d.toFixed(3) + "°", st.cx, cy, S.U * 0.040, P.gold, "center", 700);
      var short = d > 180 ? 360 - d : d;
      txt(short.toFixed(2) + "° the short way", st.cx, cy + S.U * 0.038,
          S.U * 0.019, P.dim, "center", 500);
      var y = cy + r * 1.36;
      txtFit(b.label + " " + norm(b.deg).toFixed(2) + "°  −  " +
             a.label + " " + norm(a.deg).toFixed(2) + "°  =  " + d.toFixed(2) + "°",
             st.cx, y, S.U * 0.021, P.ink, "center", 600, st.w * 0.95);
      /* any classical relation the separation satisfies, named */
      var rel = [];
      if (short < 1) rel.push("within a degree — a graha yuddha");
      if (Math.abs(d - 180) < 6) rel.push("opposition — the seventh");
      if (Math.abs(short - 120) < 6) rel.push("trine — the fifth and ninth");
      if (Math.abs(short - 90) < 6) rel.push("square — the fourth and tenth");
      if (Math.abs(short - 60) < 6) rel.push("sextile — the third and eleventh");
      if (short < 12) rel.push("same tithi-width of each other");
      txtFit(rel.length ? rel.join("   ·   ") : "no classical aspect at this separation",
             st.cx, y + S.U * 0.038, S.U * 0.019,
             rel.length ? P.gold : P.dim, "center", 500, st.w * 0.95);
    });

  /* --- 3. several longitudes, and what relates them ---------------------- */
  composer("web", "The ring, with everything on it",
    "every selected point placed, and the relations between them drawn",
    function (bag) {
      var n = count(bag, "lon") + count(bag, "lonset");
      if (n === 0) return -1;
      if (all(bag) !== n) return -1;
      /* A set is always welcome here however few points it holds. Demanding
         three left a one-member set — "the vargottama grahas", of which a
         chart may have exactly one — with no composer anywhere, so it fell to
         Layers and Layers drew nothing. Loose longitudes still need three,
         because one is `mark` and two are `angle`, both of which say more. */
      if (count(bag, "lonset") === 0) {
        var pts = count(bag, "lon");
        if (pts < 3) return -1;
      }
      return n;
    },
    function (bag, p, st) {
      var P = pal();
      var pts = [];
      (bag.lon || []).forEach(function (x) {
        pts.push({ deg: x.v.deg, label: x.v.label, tone: x.v.tone }); });
      (bag.lonset || []).forEach(function (x) {
        x.v.items.forEach(function (it) {
          pts.push({ deg: it.deg, label: it.label, tone: it.tone }); }); });
      var r = Math.min(st.w * 0.36, st.h * 0.30);
      var cy = st.y + st.h * 0.36;
      ringTicks(st.cx, cy, r, 12, 0.45, 0.05);
      ringTicks(st.cx, cy, r * 1.08, 27, 0.22, 0.03);
      /* chords between any pair within six degrees of a classical angle */
      var ANG = [[180, "opposition"], [120, "trine"], [90, "square"], [60, "sextile"]];
      var shown = Math.max(1, Math.round(pts.length * Math.min(1, p * 1.4)));
      var c = S.ctx;
      c.save();
      c.globalCompositeOperation = "lighter";
      for (var i = 0; i < shown; i++) for (var j = i + 1; j < shown; j++) {
        var d = norm(pts[j].deg - pts[i].deg); if (d > 180) d = 360 - d;
        var hit = null;
        ANG.forEach(function (A) { if (Math.abs(d - A[0]) < 6) hit = A; });
        if (!hit) continue;
        var a1 = (pts[i].deg - 90) * R2, a2 = (pts[j].deg - 90) * R2;
        c.strokeStyle = P.gold; c.globalAlpha = 0.30;
        c.lineWidth = Math.max(1, S.U * 0.0018);
        c.beginPath();
        c.moveTo(st.cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
        c.lineTo(st.cx + Math.cos(a2) * r, cy + Math.sin(a2) * r);
        c.stroke();
      }
      c.restore();
      for (var k = 0; k < shown; k++)
        marker(st.cx, cy, r, pts[k].deg, pts[k].label, pts[k].tone, 0.0048);
      txt(shown + " of " + pts.length, st.cx, cy, S.U * 0.026, P.dim, "center", 600);
      /* count the relations rather than asserting them */
      var rels = 0;
      for (var a = 0; a < pts.length; a++) for (var b2 = a + 1; b2 < pts.length; b2++) {
        var dd = norm(pts[b2].deg - pts[a].deg); if (dd > 180) dd = 360 - dd;
        ANG.forEach(function (A) { if (Math.abs(dd - A[0]) < 6) rels++; });
      }
      txtFit(rels ? rels + " pairs sit within 6° of a classical angle"
                  : "no pair here sits within 6° of a classical angle",
             st.cx, cy + r * 1.40, S.U * 0.021, rels ? P.gold : P.dim,
             "center", 600, st.w * 0.95);
    });

  /* --- 4. a point inside a division -------------------------------------
     A REAL magnification, not a highlight.

     The first version drew the full circle and shaded the arc the point fell
     in. It was correct and it was not a zoom: the picture stayed at one scale
     throughout, so "13°20′ wide" was a caption rather than something seen.

     Here the ring is drawn through a magnifying map — screen angle is the true
     angle measured from the centre of the target arc and multiplied by a
     magnification that climbs from 1 to 360/span. At the end the chosen arc
     fills the whole circle, its own subdivisions are legible across it, and
     the rest of the zodiac has been pushed off the edge. Three stages run in
     sequence: the whole ecliptic, the rāśi, then the division asked for. */
  composer("zoom", "Deep zoom",
    "a longitude magnified down through a division until it fills the ring",
    function (bag) {
      return (count(bag, "lon") >= 1 && count(bag, "lanes") === 1 &&
              all(bag) === count(bag, "lon") + 1)
        ? count(bag, "lon") + 1 : -1;
    },
    function (bag, p, st) {
      var P = pal(), L = bag.lanes[0].v, v = bag.lon[0].v;
      var d = norm(v.deg);
      var cy = st.y + st.h * 0.36;
      var r = Math.min(st.w * 0.38, st.h * 0.30);
      var signIdx = Math.floor(d / 30);

      /* the three windows, outermost first */
      var levels = [{ from: 0, to: 360, cap: "the whole ecliptic",
                      sub: "360°", n: 12, names: window.SPNodes.RASHI }];
      levels.push({ from: signIdx * 30, to: signIdx * 30 + 30,
                    cap: window.SPNodes.RASHI[signIdx], sub: "30°",
                    n: L.of === "sign" ? L.n : 9, names: null });
      var aFrom, aTo, cap3, n3, nm3;
      if (L.of === "sign") {
        var within = d - signIdx * 30, li = Math.floor(within / L.size);
        aFrom = signIdx * 30 + li * L.size; aTo = aFrom + L.size;
        cap3 = L.label + " " + (li + 1) + " of " + L.n;
        n3 = 4; nm3 = null;
      } else {
        var gi = Math.floor(d / L.size);
        aFrom = gi * L.size; aTo = aFrom + L.size;
        cap3 = (L.names && L.names[gi]) ? L.names[gi] : (L.label + " " + (gi + 1));
        n3 = 4; nm3 = null;   /* quarters: a pāda is a quarter of a nakṣatra */
      }
      levels.push({ from: aFrom, to: aTo, cap: cap3,
                    sub: (aTo - aFrom).toFixed(3) + "°", n: n3, names: nm3 });

      /* where the playhead sits between the three windows */
      var t = Math.min(2.999, p * 3), li2 = Math.floor(t), f = t - li2;
      var A = levels[li2], B = levels[Math.min(2, li2 + 1)];
      /* interpolate the WINDOW, in log of its width, so the magnification
         climbs smoothly rather than lurching at each step */
      var wA = A.to - A.from, wB = B.to - B.from;
      var w = Math.exp(Math.log(wA) + (Math.log(wB) - Math.log(wA)) * f);
      var cA = A.from + wA / 2, cB = B.from + wB / 2;
      var cen = cA + (cB - cA) * f;
      var mag = 360 / w;

      /* map a true longitude to its place on the magnified ring; null when it
         has been pushed outside the window */
      function M(deg) {
        var off = norm(deg - cen); if (off > 180) off -= 360;
        var a = off * mag;
        return (a < -180 || a > 180) ? null : a;
      }
      var c = S.ctx;
      /* the division ticks that are visible at this magnification: draw the
         finest division whose ticks are still further apart than a degree
         on screen */
      var DIVS = [[12, "rāśi"], [27, "nakṣatra"], [108, "pāda"],
                  [L.of === "sign" ? L.n * 12 : L.n, L.label]];
      c.save();
      DIVS.forEach(function (D, di) {
        var step = 360 / D[0];
        if (step * mag < 2.2) return;            /* too fine to resolve */
        if (step * mag > 400) return;            /* only one tick in view */
        c.strokeStyle = di === 3 ? P.gold : P.dim;
        c.globalAlpha = di === 3 ? 0.75 : 0.30;
        c.lineWidth = Math.max(1, S.U * (di === 3 ? 0.0020 : 0.0012));
        var k0 = Math.floor((cen - w) / step) - 1, k1 = Math.ceil((cen + w) / step) + 1;
        for (var k = k0; k <= k1; k++) {
          var a = M(k * step); if (a == null) continue;
          var rad = (a - 90) * R2;
          var inner = di === 3 ? 0.88 : 0.94;
          c.beginPath();
          c.moveTo(st.cx + Math.cos(rad) * r * inner, cy + Math.sin(rad) * r * inner);
          c.lineTo(st.cx + Math.cos(rad) * r * 1.07, cy + Math.sin(rad) * r * 1.07);
          c.stroke();
        }
      });
      c.globalAlpha = 0.35; c.strokeStyle = P.dim;
      c.lineWidth = Math.max(1, S.U * 0.0014);
      c.beginPath(); c.arc(st.cx, cy, r, 0, Math.PI * 2); c.stroke();
      c.restore();

      /* the target arc, which fills the ring by the end */
      var t0 = M(levels[2].from), t1 = M(levels[2].to);
      if (t0 != null && t1 != null && t1 > t0)
        arcBand(st.cx, cy, r * 0.93, t0, t1, P.gold, 0.30,
                Math.max(8, S.U * 0.020));

      /* the point itself */
      var pa = M(d);
      if (pa != null) marker(st.cx, cy, r, pa, v.label, "gold", 0.0065);

      txt(li2 === 0 ? levels[0].cap : (li2 === 1 ? levels[1].cap : levels[2].cap),
          st.cx, cy - S.U * 0.020, S.U * 0.030, P.ink, "center", 700);
      txt("window " + w.toFixed(w < 1 ? 3 : 2) + "°   ·   ×" + mag.toFixed(1),
          st.cx, cy + S.U * 0.020, S.U * 0.021, P.gold, "center", 600);
      txtFit(placeWords(d), st.cx, cy + r * 1.30, S.U * 0.021, P.dim,
             "center", 500, st.w * 0.92);
      txtFit(L.label + " — " + (L.of === "sign" ? L.n * 12 : L.n) +
             " on the circle, " +
             (360 / (L.of === "sign" ? L.n * 12 : L.n)).toFixed(4) + "° each",
             st.cx, cy + r * 1.30 + S.U * 0.034, S.U * 0.019, P.dim,
             "center", 500, st.w * 0.92);
      var through = (d - levels[2].from) / (levels[2].to - levels[2].from);
      txt((through * 100).toFixed(1) + "% through " + levels[2].cap,
          st.cx, cy + r * 1.30 + S.U * 0.068, S.U * 0.020, P.gold, "center", 600);
    });

  /* --- 5. concentric divisions ------------------------------------------ */
  composer("rings", "Divisions of the circle",
    "one division, or several nested inside each other, with a hand reading them",
    function (bag) {
      /* ONE is enough. Requiring two left a single division — "the navāṃśa
         division", say — with no composer at all: it fell to Layers, whose
         sub-pick also refused it, and the panel drew nothing. A lone division
         is a perfectly good picture; it just needs the sweeping hand to be
         an animation rather than a diagram. */
      return (count(bag, "lanes") >= 1 &&
              all(bag) === count(bag, "lanes") + count(bag, "lon"))
        ? count(bag, "lanes") + count(bag, "lon") : -1;
    },
    function (bag, p, st) {
      var P = pal();
      var Ls = bag.lanes.map(function (x) { return x.v; });
      var cy = st.y + st.h * 0.40;
      var rOut = Math.min(st.w * 0.40, st.h * 0.34);
      var step = rOut * 0.62 / Math.max(1, Ls.length - 1 || 1);
      var shown = Math.max(1, Math.round(Ls.length * Math.min(1, p * 1.3)));
      Ls.forEach(function (L, i) {
        if (i >= shown) return;
        var r = rOut - i * step;
        var n = L.of === "sign" ? L.n * 12 : L.n;
        ringTicks(st.cx, cy, r, Math.min(n, 120), 0.45 - i * 0.06, 0.035);
        txt(L.label + " · " + n, st.cx, cy - r - S.U * 0.020,
            S.U * 0.019, i === 0 ? P.gold : P.dim, "center", 700);
      });
      (bag.lon || []).forEach(function (x) {
        marker(st.cx, cy, rOut, x.v.deg, x.v.label, x.v.tone, 0.006); });
      /* A set of divisions has nothing of its own that moves, so a hand sweeps
         the circle and names the arc it is crossing in each ring. Without it
         this view is a still photograph presented as an animation. */
      var sweep = p * 360;
      var ca = S.ctx;
      ca.save();
      ca.strokeStyle = P.gold; ca.globalAlpha = 0.85;
      ca.lineWidth = Math.max(2, S.U * 0.0030);
      ca.beginPath(); ca.moveTo(st.cx, cy);
      ca.lineTo(st.cx + Math.cos((sweep - 90) * R2) * rOut * 1.06,
                cy + Math.sin((sweep - 90) * R2) * rOut * 1.06);
      ca.stroke(); ca.restore();
      var readout = Ls.map(function (L) {
        var n2 = L.of === "sign" ? L.n * 12 : L.n;
        var idx = Math.floor(norm(sweep) / (360 / n2));
        var nm = (L.names && L.names[idx % L.names.length]) || (idx + 1);
        return L.label + " " + nm;
      }).join("   ·   ");
      txtFit(norm(sweep).toFixed(1) + "°", st.cx, cy - S.U * 0.016,
             S.U * 0.028, P.gold, "center", 700, st.w * 0.5);
      txtFit(readout, st.cx, cy + S.U * 0.022, S.U * 0.018, P.ink,
             "center", 500, rOut * 1.5);
      var totals = Ls.map(function (L) {
        return (L.of === "sign" ? L.n * 12 : L.n); });
      txtFit(totals.join(" · ") + "  arcs on one circle",
             st.cx, cy + rOut * 1.30, S.U * 0.021, P.ink, "center", 600, st.w * 0.9);
      txtFit("the finest here is " +
             (360 / Math.max.apply(null, totals)).toFixed(4) + "° wide",
             st.cx, cy + rOut * 1.30 + S.U * 0.034, S.U * 0.019, P.dim,
             "center", 500, st.w * 0.9);
    });

  /* --- 6. magnitudes side by side --------------------------------------- */
  composer("bars", "Comparison",
    "magnitudes on one axis, with the working under each",
    function (bag) {
      var n = count(bag, "sset") + count(bag, "scalar");
      if (!n) return -1;
      return (all(bag) === n) ? n : -1;
    },
    function (bag, p, st) {
      var P = pal();
      var rows = [];
      (bag.sset || []).forEach(function (x) {
        x.v.items.forEach(function (it) {
          rows.push({ k: it.k, v: it.v, work: it.work, unit: x.v.unit,
                      max: x.v.max, grp: x.v.label }); }); });
      (bag.scalar || []).forEach(function (x) {
        rows.push({ k: x.v.label, v: x.v.v, work: x.v.work, unit: x.v.unit,
                    max: x.v.max, grp: null }); });
      if (!rows.length) return;
      /* a shared axis only when the units agree; otherwise each bar is scaled
         to its own maximum and the frame says so, because bars on different
         axes that look comparable are a lie */
      var units = [];
      rows.forEach(function (r) { if (units.indexOf(r.unit) < 0) units.push(r.unit); });
      var shared = units.length === 1;
      var gmax = 0;
      rows.forEach(function (r) {
        gmax = Math.max(gmax, Math.abs(r.v), r.max || 0); });
      var n = Math.min(rows.length, 14);
      var top = st.y + st.h * 0.08;
      var hgt = Math.min(st.h * 0.072, (st.h * 0.74) / n);
      var x0 = st.x + st.w * 0.26, bw = st.w * 0.62;
      for (var i = 0; i < n; i++) {
        var r = rows[i], y = top + i * hgt;
        var mx = shared ? gmax : Math.max(Math.abs(r.v), r.max || Math.abs(r.v) || 1);
        var frac = (mx ? Math.abs(r.v) / mx : 0) * grow(p, i, n);
        txt(r.k, st.x + st.w * 0.24, y + hgt * 0.45, S.U * 0.019, P.ink, "right", 600);
        var c = S.ctx;
        c.save();
        c.fillStyle = P.line; c.globalAlpha = 0.5;
        c.fillRect(x0, y + hgt * 0.22, bw, hgt * 0.46);
        c.fillStyle = r.v < 0 ? P.mal : P.gold; c.globalAlpha = 0.9;
        c.fillRect(x0, y + hgt * 0.22, bw * frac, hgt * 0.46);
        c.restore();
        /* the number counts up with its bar, so a single-row comparison is
           still something happening rather than a photograph of a bar */
        var showv = r.v * grow(p, i, n);
        var lab = (Math.abs(r.v) >= 1000 ? Math.round(showv).toLocaleString()
                                         : showv.toFixed(2)) + (r.unit ? " " + r.unit : "");
        txt(lab, x0 + bw * frac + S.U * 0.010, y + hgt * 0.45,
            S.U * 0.017, P.dim, "left", 600);
        if (r.work)
          txt(r.work, st.x + st.w * 0.24, y + hgt * 0.78, S.U * 0.014,
              P.dim, "right", 500);
      }
      var foot = top + n * hgt + S.U * 0.030;
      txtFit(rows[0].grp || "comparison", st.cx, foot, S.U * 0.023, P.ink,
             "center", 700, st.w * 0.9);
      txtFit(shared ? "one axis — every bar is to the same scale, max " +
                      gmax.toFixed(2) + " " + (units[0] || "")
                    : "different units: each bar is scaled to its own maximum, " +
                      "so their lengths are NOT comparable",
             st.cx, foot + S.U * 0.032, S.U * 0.018,
             shared ? P.dim : P.mal, "center", 500, st.w * 0.92);
      if (rows.length > n)
        txt("+" + (rows.length - n) + " more not shown", st.cx, foot + S.U * 0.062,
            S.U * 0.017, P.dim, "center", 500);
    });

  /* --- 7. a network ----------------------------------------------------- */
  composer("graph", "Relation network",
    "pairs drawn as chords on the ring, each labelled with its reason",
    function (bag) {
      return (count(bag, "edges") >= 1 &&
              all(bag) === count(bag, "edges") + count(bag, "lon"))
        ? count(bag, "edges") + count(bag, "lon") : -1;
    },
    function (bag, p, st) {
      var P = pal();
      var items = [];
      bag.edges.forEach(function (x) {
        x.v.items.forEach(function (e) { items.push(e); }); });
      var r = Math.min(st.w * 0.36, st.h * 0.30);
      var cy = st.y + st.h * 0.35;
      ringTicks(st.cx, cy, r, 12, 0.45, 0.05);
      var shown = Math.max(1, Math.round(items.length * Math.min(1, p * 1.3)));
      var c = S.ctx;
      c.save();
      c.globalCompositeOperation = "lighter";
      for (var i = 0; i < items.length; i++) {
        var g = grow(p, i, items.length);
        if (g <= 0) continue;
        var e = items[i];
        var a1 = (e.a - 90) * R2, a2 = (e.b - 90) * R2;
        c.strokeStyle = P.gold; c.globalAlpha = 0.34 * g;
        c.lineWidth = Math.max(1, S.U * 0.0020) * (0.5 + 0.5 * g);
        c.beginPath();
        /* drawn from a toward b as it grows, bowed through the centre so
           parallel chords stay distinguishable */
        var x1 = st.cx + Math.cos(a1) * r, y1 = cy + Math.sin(a1) * r;
        var x2 = st.cx + Math.cos(a2) * r, y2 = cy + Math.sin(a2) * r;
        var ex = x1 + (x2 - x1) * g, ey = y1 + (y2 - y1) * g;
        c.moveTo(x1, y1);
        c.quadraticCurveTo(st.cx + (x1 - st.cx) * (1 - g) * 0.4,
                           cy + (y1 - cy) * (1 - g) * 0.4, ex, ey);
        c.stroke();
      }
      c.restore();
      var seen = {};
      items.slice(0, shown).forEach(function (e) {
        if (!seen[e.aLabel]) { marker(st.cx, cy, r, e.a, e.aLabel, "glow", 0.0045);
                               seen[e.aLabel] = 1; }
        if (!seen[e.bLabel]) { marker(st.cx, cy, r, e.b, e.bLabel, "gold", 0.0045);
                               seen[e.bLabel] = 1; }
      });
      (bag.lon || []).forEach(function (x) {
        marker(st.cx, cy, r, x.v.deg, x.v.label, "gold", 0.006); });
      txt(shown + " of " + items.length, st.cx, cy, S.U * 0.026, P.dim, "center", 600);
      var y = cy + r * 1.34;
      txtFit(bag.edges[0].v.label, st.cx, y, S.U * 0.024, P.ink, "center", 700, st.w * 0.9);
      /* the reason of whichever edge the playhead is on, so the frame teaches
         rather than decorating */
      var cur = items[Math.min(items.length - 1, shown - 1)];
      if (cur)
        txtFit(cur.aLabel + " → " + cur.bLabel + "   ·   " + cur.why,
               st.cx, y + S.U * 0.036, S.U * 0.020, P.gold, "center", 500, st.w * 0.95);
    });

  /* --- 8. nested time --------------------------------------------------- */
  composer("gears", "Daśā gears",
    "periods as wheels, the inner one turning inside the outer",
    function (bag) {
      var ss = (bag.spanset || []).filter(function (x) { return x.v.nested; });
      return (ss.length === 1 && all(bag) === count(bag, "spanset")) ? all(bag) : -1;
    },
    function (bag, p, st) {
      var P = pal();
      var items = bag.spanset[0].v.items;
      var rings = [[], []];
      items.forEach(function (s) { rings[s.ring === 1 ? 1 : 0].push(s); });
      var cy = st.y + st.h * 0.40;
      var rOut = Math.min(st.w * 0.40, st.h * 0.34);
      var t0 = Math.min.apply(null, rings[0].map(function (s) { return s.from; }));
      var t1 = Math.max.apply(null, rings[0].map(function (s) { return s.to; }));
      var now = t0 + (t1 - t0) * p;
      [0, 1].forEach(function (ri) {
        var list = rings[ri]; if (!list.length) return;
        var r = rOut * (ri === 0 ? 1 : 0.58);
        var a0 = Math.min.apply(null, list.map(function (s) { return s.from; }));
        var a1 = Math.max.apply(null, list.map(function (s) { return s.to; }));
        list.forEach(function (s) {
          var f = (s.from - a0) / (a1 - a0) * 360, t = (s.to - a0) / (a1 - a0) * 360;
          var live = now >= s.from && now < s.to;
          arcBand(st.cx, cy, r, f, t, live ? P.gold : P.dim,
                  live ? 0.85 : 0.28, Math.max(10, S.U * (ri === 0 ? 0.030 : 0.026)));
          var mid = (f + t) / 2 * R2 - Math.PI / 2;
          if (t - f > 11)
            txt(s.label, st.cx + Math.cos(mid) * r, cy + Math.sin(mid) * r,
                S.U * 0.016, live ? P.bg : P.ink, "center", 700);
        });
      });
      /* which pair is running, named */
      var md = null, ad = null;
      rings[0].forEach(function (s) { if (now >= s.from && now < s.to) md = s; });
      rings[1].forEach(function (s) { if (now >= s.from && now < s.to) ad = s; });
      txt(md ? md.label : "—", st.cx, cy - S.U * 0.016, S.U * 0.030, P.ink, "center", 700);
      txt(ad ? "antara " + ad.label : "", st.cx, cy + S.U * 0.020,
          S.U * 0.021, P.gold, "center", 600);
      var d = new Date(now);
      txt(d.toISOString().slice(0, 10), st.cx, cy + rOut * 1.28,
          S.U * 0.022, P.dim, "center", 500);
      txtFit(bag.spanset[0].v.label, st.cx, cy + rOut * 1.28 + S.U * 0.036,
             S.U * 0.020, P.dim, "center", 500, st.w * 0.9);
    });

  /* --- 9. a flat timeline ----------------------------------------------- */
  composer("timeline", "Timeline",
    "intervals laid along the day or the span, with the playhead on them",
    function (bag) {
      var n = count(bag, "span") + count(bag, "spanset");
      if (!n) return -1;
      var nested = (bag.spanset || []).some(function (x) { return x.v.nested; });
      if (nested) return -1;
      return (all(bag) === n) ? n : -1;
    },
    function (bag, p, st) {
      var P = pal();
      var lanes2 = [];
      (bag.spanset || []).forEach(function (x) {
        lanes2.push({ label: x.v.label, items: x.v.items }); });
      (bag.span || []).forEach(function (x) {
        lanes2.push({ label: x.v.label, items: [{ from: x.v.from, to: x.v.to,
                                                  label: x.v.label }] }); });
      var t0 = Infinity, t1 = -Infinity;
      lanes2.forEach(function (L) { L.items.forEach(function (s) {
        t0 = Math.min(t0, s.from); t1 = Math.max(t1, s.to); }); });
      if (!isFinite(t0) || t1 <= t0) return;
      var top = st.y + st.h * 0.16;
      var lh = Math.min(st.h * 0.16, (st.h * 0.62) / lanes2.length);
      var x0 = st.x + st.w * 0.05, bw = st.w * 0.90;
      var now = t0 + (t1 - t0) * p;
      lanes2.forEach(function (L, li) {
        var y = top + li * lh;
        txt(L.label, x0, y - S.U * 0.012, S.U * 0.019, P.dim, "left", 600);
        L.items.forEach(function (s, si) {
          var a = x0 + bw * (s.from - t0) / (t1 - t0);
          var w = bw * (s.to - s.from) / (t1 - t0);
          var live = now >= s.from && now < s.to;
          var c = S.ctx;
          c.save();
          c.fillStyle = live ? P.gold : (si % 2 ? P.line : P.glow);
          c.globalAlpha = live ? 0.92 : 0.40;
          c.fillRect(a, y, Math.max(1, w - 1), lh * 0.46);
          c.restore();
          if (w > st.w * 0.07)
            txt(s.label, a + w / 2, y + lh * 0.23, S.U * 0.015,
                live ? P.bg : P.ink, "center", 700);
        });
      });
      /* the playhead */
      var px = x0 + bw * p;
      var c2 = S.ctx;
      c2.save();
      c2.strokeStyle = P.gold; c2.lineWidth = Math.max(2, S.U * 0.0028);
      c2.beginPath(); c2.moveTo(px, top - S.U * 0.016);
      c2.lineTo(px, top + lanes2.length * lh); c2.stroke();
      c2.restore();
      var d = new Date(now);
      var hh = ("0" + d.getUTCHours()).slice(-2);
      var mm = ("0" + d.getUTCMinutes()).slice(-2);
      var days = (t1 - t0) / 86400000;
      txt(days > 3 ? d.toISOString().slice(0, 10) : hh + ":" + mm + " UTC",
          st.cx, top + lanes2.length * lh + S.U * 0.040,
          S.U * 0.024, P.gold, "center", 700);
      txtFit("span " + (days > 3 ? days.toFixed(1) + " days"
                                 : (days * 24).toFixed(2) + " hours"),
             st.cx, top + lanes2.length * lh + S.U * 0.075,
             S.U * 0.019, P.dim, "center", 500, st.w * 0.9);
    });

  /* --- 10. a quantity over time ----------------------------------------- */
  composer("trace", "Over time",
    "a quantity plotted as the days run, with the playhead reading it off",
    function (bag) {
      return (count(bag, "series") >= 1 && all(bag) === count(bag, "series"))
        ? count(bag, "series") : -1;
    },
    function (bag, p, st, ctxData) {
      var P = pal();
      var sers = bag.series.map(function (x) { return x.v; });
      var when = (ctxData && ctxData.when) || Date.now();
      var days = (ctxData && ctxData.spanDays) || 365;
      var t0 = when, t1 = when + days * 86400000;
      var top = st.y + st.h * 0.14, hgt = st.h * 0.58;
      var x0 = st.x + st.w * 0.08, bw = st.w * 0.86;
      var N = 180;
      /* sample once, find the range, then draw — a plot auto-scaled per frame
         would jitter as the playhead moved */
      var cols = sers.map(function (s) {
        var vals = [];
        for (var i = 0; i <= N; i++) {
          var v = s.at(t0 + (t1 - t0) * i / N);
          vals.push(typeof v === "number" && isFinite(v) ? v : null);
        }
        return vals;
      });
      var lo = Infinity, hi = -Infinity;
      cols.forEach(function (v) { v.forEach(function (x) {
        if (x != null) { lo = Math.min(lo, x); hi = Math.max(hi, x); } }); });
      if (!isFinite(lo) || hi <= lo) { lo = 0; hi = 1; }
      var pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
      function Y(v) { return top + hgt * (1 - (v - lo) / (hi - lo)); }
      var c = S.ctx;
      /* axis */
      c.save();
      c.strokeStyle = P.line; c.globalAlpha = 0.6; c.lineWidth = 1.5;
      [0, 0.25, 0.5, 0.75, 1].forEach(function (f) {
        var y = top + hgt * f;
        c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + bw, y); c.stroke();
        txt((hi - (hi - lo) * f).toFixed(1), x0 - S.U * 0.010, y,
            S.U * 0.015, P.dim, "right", 500);
      });
      c.restore();
      var upto = Math.round(N * p);
      cols.forEach(function (vals, si) {
        c.save();
        c.strokeStyle = si === 0 ? P.gold : P.glow;
        c.lineWidth = Math.max(2, S.U * 0.0026);
        c.globalAlpha = 0.95;
        c.beginPath();
        var started = false;
        for (var i = 0; i <= upto; i++) {
          if (vals[i] == null) { started = false; continue; }
          var x = x0 + bw * i / N, y = Y(vals[i]);
          /* a longitude wraps at 360 and a line drawn across the wrap is a
             stripe through the middle of the plot that means nothing */
          if (i > 0 && vals[i - 1] != null &&
              sers[si].range && Math.abs(vals[i] - vals[i - 1]) > (hi - lo) * 0.6)
            started = false;
          if (!started) { c.moveTo(x, y); started = true; } else c.lineTo(x, y);
        }
        c.stroke();
        c.restore();
        var cv = vals[Math.min(N, upto)];
        if (cv != null) {
          c.save(); c.fillStyle = si === 0 ? P.gold : P.glow;
          c.beginPath();
          c.arc(x0 + bw * upto / N, Y(cv), Math.max(3, S.U * 0.005), 0, Math.PI * 2);
          c.fill(); c.restore();
          txt(sers[si].label + "  " + cv.toFixed(2) + (sers[si].unit || ""),
              st.cx, top + hgt + S.U * (0.040 + si * 0.030),
              S.U * 0.021, si === 0 ? P.gold : P.glow, "center", 600);
        }
      });
      var d = new Date(t0 + (t1 - t0) * p);
      txt(d.toISOString().slice(0, 10), st.cx,
          top + hgt + S.U * (0.040 + sers.length * 0.030),
          S.U * 0.022, P.ink, "center", 700);
      txtFit(days.toFixed(0) + " days from today", st.cx,
             top + hgt + S.U * (0.072 + sers.length * 0.030),
             S.U * 0.018, P.dim, "center", 500, st.w * 0.9);
    });

  /* --- 11. a matrix ----------------------------------------------------- */
  composer("heat", "Table",
    "a grid of numbers, shaded by value",
    function (bag) {
      return (count(bag, "grid") === 1 && all(bag) === 1) ? 1 : -1;
    },
    function (bag, p, st) {
      var P = pal(), G = bag.grid[0].v;
      var rows = G.rows, cols = G.cols || [];
      var nR = Math.min(rows.length, 18), nC = Math.min(cols.length || 1, 14);
      var top = st.y + st.h * 0.14;
      var left = st.x + st.w * 0.22;
      var cw = (st.w * 0.74) / nC;
      var ch = Math.min(st.h * 0.062, (st.h * 0.66) / nR);
      var mx = G.max || 0;
      if (!mx) rows.forEach(function (r) { (r.vals || []).forEach(function (v) {
        if (typeof v === "number") mx = Math.max(mx, v); }); });
      if (!mx) mx = 1;
      for (var ci = 0; ci < nC; ci++)
        txt(String(cols[ci] || ci + 1).slice(0, 7), left + cw * (ci + 0.5),
            top - S.U * 0.016, S.U * 0.014, P.dim, "center", 600);
      for (var ri = 0; ri < nR; ri++) {
        var r = rows[ri], y = top + ri * ch;
        var g = grow(p, ri, nR);
        txt(r.label || r.k, left - S.U * 0.012, y + ch * 0.5,
            S.U * 0.017, P.ink, "right", 600);
        if (g <= 0) continue;
        for (var ci2 = 0; ci2 < nC; ci2++) {
          var v = (r.vals || [])[ci2];
          var c = S.ctx;
          c.save();
          if (typeof v === "number") {
            c.fillStyle = P.gold;
            c.globalAlpha = (0.14 + 0.72 * Math.min(1, v / mx)) * g;
          } else { c.fillStyle = P.line; c.globalAlpha = 0.25 * g; }
          c.fillRect(left + cw * ci2 + 1, y + 1, cw - 2, ch - 2);
          c.restore();
          if (typeof v === "number" && g > 0.6)
            txt(String(v), left + cw * (ci2 + 0.5), y + ch * 0.5,
                S.U * 0.015, v / mx > 0.55 ? P.bg : P.ink, "center", 700);
        }
      }
      var foot = top + nR * ch + S.U * 0.030;
      txtFit(G.label, st.cx, foot, S.U * 0.023, P.ink, "center", 700, st.w * 0.9);
      txtFit("shaded against " + mx + (G.max ? " — the classical maximum" : " — the largest here"),
             st.cx, foot + S.U * 0.032, S.U * 0.018, P.dim, "center", 500, st.w * 0.9);
    });

  /* --- the kundli, in both conventions ----------------------------------

     The two diagrams carry the same twelve cells and disagree about what is
     nailed down. The NORTH fixes the houses — the first is always the top
     diamond — and rotates the signs through them, so a reader sees the shape
     of the life. The SOUTH fixes the signs in the frame and moves the house
     numbers, so a reader sees the shape of the zodiac. Offering one and
     calling it "the chart" would be taking a side; both are here and the
     perspective switcher moves between them. */

  /* centroids of the North Indian diamond, as fractions of its box. House 1
     is the top centre, and the count runs anticlockwise, which is the
     convention every printed North Indian chart uses. */
  var NORTH = [
    [0.50, 0.25], [0.26, 0.11], [0.11, 0.26], [0.25, 0.50], [0.11, 0.74],
    [0.26, 0.89], [0.50, 0.75], [0.74, 0.89], [0.89, 0.74], [0.75, 0.50],
    [0.89, 0.26], [0.74, 0.11]
  ];
  /* the South Indian frame: sign index at each cell of the 4×4 ring, Meṣa at
     the second cell of the top row and running clockwise */
  var SOUTH = [
    [11, 0], [0, 1], [1, 2], [2, 3],
    [10, 0], null, null, [3, 3],
    [9, 0], null, null, [4, 3],
    [8, 0], [7, 1], [6, 2], [5, 3]
  ];

  function kundliFrame(st) {
    var side = Math.min(st.w * 0.92, st.h * 0.74);
    return { x: st.cx - side / 2, y: st.y + st.h * 0.10, s: side };
  }
  function drawCell(F, cx, cy, cell, P, hot, showHouse, showSign) {
    var u = F.s;
    var lines = cell.items.map(function (it) {
      return it.label + (it.retro ? " ℞" : ""); });
    var head = [];
    if (showSign) head.push(window.SPNodes.RASHI[cell.sign].slice(0, 4));
    if (showHouse) head.push(String(cell.house));
    txt(head.join(" · "), cx, cy - u * 0.045, u * 0.026,
        hot ? P.gold : P.dim, "center", 700);
    lines.slice(0, 5).forEach(function (L, i) {
      txt(L, cx, cy - u * 0.012 + i * u * 0.030, u * 0.028,
          L.indexOf("Sūrya") === 0 ? P.gold : P.ink, "center", 600);
    });
  }
  composer("kundliN", "North Indian kundli",
    "the diamond — houses fixed, signs rotating through them",
    function (bag) {
      return (count(bag, "houses") === 1 && all(bag) === 1) ? 1.4 : -1;
    },
    function (bag, p, st) {
      var P = pal(), H = bag.houses[0].v, F = kundliFrame(st), c = S.ctx;
      var x = F.x, y = F.y, u = F.s;
      c.save();
      c.strokeStyle = P.dim; c.globalAlpha = 0.7;
      c.lineWidth = Math.max(1.5, S.U * 0.0020);
      c.strokeRect(x, y, u, u);
      /* the two diagonals and the inner diamond make all twelve cells */
      c.beginPath();
      c.moveTo(x, y); c.lineTo(x + u, y + u);
      c.moveTo(x + u, y); c.lineTo(x, y + u);
      c.moveTo(x + u / 2, y); c.lineTo(x + u, y + u / 2);
      c.lineTo(x + u / 2, y + u); c.lineTo(x, y + u / 2); c.closePath();
      c.stroke();
      c.restore();
      var lit = Math.round(12 * Math.min(1, p * 1.2));
      H.cells.forEach(function (cell, i) {
        if (i >= lit) return;
        var pos = NORTH[i];
        drawCell(F, x + pos[0] * u, y + pos[1] * u, cell, P,
                 cell.house === 1, true, true);
      });
      txtFit(H.label + " — " + H.from + " in " +
             window.SPNodes.RASHI[H.lagna], st.cx, y + u + S.U * 0.034,
             S.U * 0.022, P.ink, "center", 600, st.w * 0.92);
      txtFit("North Indian: the first house is always the top diamond; the " +
             "signs turn through it", st.cx, y + u + S.U * 0.068,
             S.U * 0.018, P.dim, "center", 500, st.w * 0.92);
    });

  composer("kundliS", "South Indian kundli",
    "the square — signs fixed in the frame, the house numbers moving",
    function (bag) {
      return (count(bag, "houses") === 1 && all(bag) === 1) ? 1.3 : -1;
    },
    function (bag, p, st) {
      var P = pal(), H = bag.houses[0].v, F = kundliFrame(st), c = S.ctx;
      var x = F.x, y = F.y, u = F.s, q = u / 4;
      var bySign = {};
      H.cells.forEach(function (cl) { bySign[cl.sign] = cl; });
      c.save();
      c.strokeStyle = P.dim; c.globalAlpha = 0.7;
      c.lineWidth = Math.max(1.5, S.U * 0.0020);
      c.strokeRect(x, y, u, u);
      for (var k = 1; k < 4; k++) {
        /* only the outer ring is divided: the middle four cells are one box */
        c.beginPath(); c.moveTo(x + q * k, y); c.lineTo(x + q * k, y + q); c.stroke();
        c.beginPath(); c.moveTo(x + q * k, y + u - q); c.lineTo(x + q * k, y + u); c.stroke();
        c.beginPath(); c.moveTo(x, y + q * k); c.lineTo(x + q, y + q * k); c.stroke();
        c.beginPath(); c.moveTo(x + u - q, y + q * k); c.lineTo(x + u, y + q * k); c.stroke();
      }
      c.strokeRect(x + q, y + q, u - 2 * q, u - 2 * q);
      c.restore();
      var lit = Math.round(12 * Math.min(1, p * 1.2));
      var shown = 0;
      SOUTH.forEach(function (cellSpec, idx) {
        if (!cellSpec) return;
        var sign = cellSpec[0], cl = bySign[sign];
        if (!cl) return;
        if (shown++ >= lit) return;
        var col = idx % 4, row = Math.floor(idx / 4);
        var ccx = x + q * (col + 0.5), ccy = y + q * (row + 0.5);
        if (cl.house === 1) {
          c.save();
          c.fillStyle = P.gold; c.globalAlpha = 0.13;
          c.fillRect(x + q * col, y + q * row, q, q);
          c.restore();
        }
        drawCell({ s: q * 2.6 }, ccx, ccy, cl, P, cl.house === 1, true, true);
      });
      txtFit(H.label + " — " + H.from + " in " +
             window.SPNodes.RASHI[H.lagna], st.cx, y + u + S.U * 0.034,
             S.U * 0.022, P.ink, "center", 600, st.w * 0.92);
      txtFit("South Indian: the signs are nailed to the frame; the lit cell " +
             "is the first house", st.cx, y + u + S.U * 0.068,
             S.U * 0.018, P.dim, "center", 500, st.w * 0.92);
    });

  /* --- Sudarśana: the same chart from three first houses ----------------- */
  composer("sudarshana", "Sudarśana Cakra",
    "one chart read from Lagna, from Candra and from Sūrya, as three rings",
    function (bag) {
      return (count(bag, "houseset") === 1 && all(bag) === 1) ? 1.5 : -1;
    },
    function (bag, p, st) {
      var P = pal(), H = bag.houseset[0].v, c = S.ctx;
      var cy = st.y + st.h * 0.40;
      var rOut = Math.min(st.w * 0.46, st.h * 0.37);
      /* Three rings have to share one radius, and the first version gave the
         innermost a quarter of it — too little to hold a house number and two
         graha names, so the middle of the frame became a knot. Equal-WIDTH
         annuli rather than equal ratios: each ring gets the same room, and the
         hub is just large enough to be a hub. */
      var RING = [rOut, rOut * 0.785, rOut * 0.570];
      var HUB = rOut * 0.355;
      var sweep = p * 360;
      H.items.forEach(function (ch, ri) {
        var r = RING[ri], rin = ri < 2 ? RING[ri + 1] : HUB;
        c.save();
        c.strokeStyle = P.dim; c.globalAlpha = 0.45;
        c.lineWidth = Math.max(1, S.U * 0.0014);
        c.beginPath(); c.arc(st.cx, cy, r, 0, Math.PI * 2); c.stroke();
        for (var i = 0; i < 12; i++) {
          var a = (i * 30 - 90) * R2;
          c.beginPath();
          c.moveTo(st.cx + Math.cos(a) * rin, cy + Math.sin(a) * rin);
          c.lineTo(st.cx + Math.cos(a) * r, cy + Math.sin(a) * r);
          c.stroke();
        }
        c.restore();
        ch.cells.forEach(function (cell, hi) {
          var mid = ((hi * 30) + 15 - 90) * R2;
          var rr = (r + rin) / 2;
          var live = Math.floor(norm(sweep) / 30) === hi;
          if (live) {
            c.save(); c.fillStyle = P.gold; c.globalAlpha = 0.14;
            c.beginPath();
            c.arc(st.cx, cy, r, (hi * 30 - 90) * R2, ((hi + 1) * 30 - 90) * R2);
            c.arc(st.cx, cy, rin, ((hi + 1) * 30 - 90) * R2, (hi * 30 - 90) * R2, true);
            c.closePath(); c.fill(); c.restore();
          }
          var names = cell.items.map(function (it) {
            return it.label.slice(0, 2); }).join("·");
          var tx = st.cx + Math.cos(mid) * rr, ty = cy + Math.sin(mid) * rr;
          var band = (r - rin);
          txt(String(cell.house), tx, ty - band * 0.17,
              S.U * 0.0155, live ? P.gold : P.dim, "center", 700);
          if (names)
            txtFit(names, tx, ty + band * 0.20, S.U * 0.0135, P.ink,
                   "center", 600, band * 1.5);
        });
        /* the ring's name on the left margin, where no cell text goes */
        txt(ch.from, st.cx - (r + rin) / 2, cy - (r - rin) * 0.42,
            S.U * 0.0155, ri === 0 ? P.gold : P.dim, "center", 700);
      });
      /* the hub, so the three rings read as rings rather than a pie */
      c.save();
      c.fillStyle = P.bg; c.globalAlpha = 1;
      c.beginPath(); c.arc(st.cx, cy, HUB, 0, Math.PI * 2); c.fill();
      c.strokeStyle = P.dim; c.globalAlpha = 0.45;
      c.lineWidth = Math.max(1, S.U * 0.0014);
      c.beginPath(); c.arc(st.cx, cy, HUB, 0, Math.PI * 2); c.stroke();
      c.restore();
      var hi2 = Math.floor(norm(sweep) / 30);
      txt(String(hi2 + 1), st.cx, cy - S.U * 0.012, S.U * 0.040, P.gold,
          "center", 700);
      txt("bhāva", st.cx, cy + S.U * 0.018, S.U * 0.016, P.dim, "center", 500);
      var who = H.items.map(function (ch) {
        var names = ch.cells[hi2].items.map(function (it) { return it.label; });
        return ch.from + " " + (hi2 + 1) + ": " + (names.length ? names.join(", ") : "—");
      }).join("    ·    ");
      txtFit("house " + (hi2 + 1) + " from each", st.cx, cy + rOut * 1.22,
             S.U * 0.023, P.ink, "center", 700, st.w * 0.9);
      txtFit(who, st.cx, cy + rOut * 1.22 + S.U * 0.034, S.U * 0.018,
             P.gold, "center", 500, st.w * 0.95);
      txtFit("a house is strong when it is strong from all three",
             st.cx, cy + rOut * 1.22 + S.U * 0.066, S.U * 0.018,
             P.dim, "center", 500, st.w * 0.9);
    });

  /* --- the almanac leaf ------------------------------------------------- *
     Its own composer because it is its own thing: a printed page rather than
     a diagram, drawn edge to edge rather than inside the stage box, and so
     it ignores the stage's margins and takes the whole frame. */
  composer("almanac", "The almanac leaf",
    "the day as an ornate pañcāṅga card, with the light walking down the limbs",
    function (bag) {
      return (count(bag, "almanac") === 1 && all(bag) === 1) ? 2 : -1;
    },
    function (bag, p) {
      window.SPAlmanac.draw(S.ctx, S.W, S.H, bag.almanac[0].v, p, pal(),
                            { foot: S.handle });
    });

  /* --- 12. the catch-all: panels ---------------------------------------- *
     Always scores, so there is no selection that draws nothing. It splits the
     stage and runs the best single-group composer in each panel. */
  composer("layers", "Layers",
    "the stage split into panels, each drawn by whatever fits it",
    function (bag) { return all(bag) ? 0.5 : -1; },
    function (bag, p, st, ctxData) {
      var P = pal();
      /* one group per kind present, in a stable order */
      var ORDER = ["lon", "lonset", "lanes", "edges", "sset", "scalar",
                   "spanset", "span", "series", "grid"];
      var groups = [];
      ORDER.forEach(function (k) {
        if ((bag[k] || []).length) {
          var g = {}; g[k] = bag[k];
          /* a lone longitude riding with a lanes group belongs with it */
          groups.push(g);
        }
      });
      /* merge lon into lanes, and lon into edges, so the panels are the
         meaningful pairs rather than one panel per kind */
      var merged = [];
      groups.forEach(function (g) {
        var k = Object.keys(g)[0];
        if (k === "lon" && groups.some(function (o) { return o.lanes; })) return;
        if (k === "lon" && groups.some(function (o) { return o.edges; })) return;
        if (k === "lanes" && bag.lon) g.lon = bag.lon;
        if (k === "edges" && bag.lon) g.lon = bag.lon;
        merged.push(g);
      });
      if (!merged.length) merged = groups;
      var n = Math.min(merged.length, 3);
      var ph = st.h / n;
      for (var i = 0; i < n; i++) {
        var sub = { x: st.x, y: st.y + ph * i, w: st.w, h: ph * 0.94,
                    cx: st.cx, cy: st.y + ph * i + ph * 0.47,
                    bandY: st.bandY, bandH: st.bandH, side: st.side };
        var best = pick(merged[i], true);
        if (best) {
          S.ctx.save();
          S.ctx.beginPath();
          S.ctx.rect(0, sub.y - ph * 0.02, S.W, ph * 0.98);
          S.ctx.clip();
          best.draw(merged[i], p, sub, ctxData);
          S.ctx.restore();
        }
        if (i < n - 1) {
          var c = S.ctx;
          c.save();
          c.strokeStyle = P.line; c.globalAlpha = 0.5; c.lineWidth = 1;
          c.beginPath();
          c.moveTo(st.x, sub.y + ph * 0.96); c.lineTo(st.x + st.w, sub.y + ph * 0.96);
          c.stroke(); c.restore();
        }
      }
      if (merged.length > 3)
        txt((merged.length - 3) + " more group(s) not shown — remove a node",
            st.cx, st.y + st.h - S.U * 0.012, S.U * 0.017, P.mal, "center", 500);
    });

  /* ---- the matcher ------------------------------------------------------ */
  /* the rest of this codebase is ES5 by habit, and a studio page that failed
     to parse on an older browser would fail silently and completely */
  function withScore(K, s) {
    return { key: K.key, label: K.label, blurb: K.blurb, draw: K.draw, s: s };
  }
  function pick(bag, noLayers) {
    var best = null;
    COMPOSERS.forEach(function (K) {
      if (noLayers && K.key === "layers") return;
      var s = -1;
      try { s = K.score(bag); } catch (e) { s = -1; }
      if (s > 0 && (!best || s > best.s)) best = withScore(K, s);
    });
    return best;
  }
  /* every composer that can draw this selection at all, best first — this is
     the perspective switcher */
  function options(bag) {
    var out = [];
    COMPOSERS.forEach(function (K) {
      var s = -1;
      try { s = K.score(bag); } catch (e) { s = -1; }
      if (s > 0) out.push({ key: K.key, label: K.label, blurb: K.blurb, s: s });
    });
    return out.sort(function (a, b) { return b.s - a.s; });
  }

  /* ---- bagging a selection ---------------------------------------------- */
  function bagOf(sel, C) {
    var bag = {}, missing = [];
    sel.forEach(function (id) {
      var node = window.SPNodes.byId(id);
      if (!node) { missing.push({ id: id, why: "no such node" }); return; }
      var v = window.SPNodes.resolve(node, C);
      if (!v) { missing.push({ id: id, label: node.label,
                               why: "not available for this chart or moment" }); return; }
      (bag[v.kind] = bag[v.kind] || []).push({ node: node, v: v });
    });
    return { bag: bag, missing: missing };
  }

  /* ---- the public draw -------------------------------------------------- */
  /* `quiet` skips the work only the side panels need. render() is called
     sixty times a second during playback and scoring every composer to build
     a list of alternatives that nothing reads is pure waste. */
  function render(sel, C, p, forceKey, quiet) {
    var B = bagOf(sel, C);
    background();
    if (pal().key !== "parchment") stars();
    var st = stage();
    var P = pal();
    var chosen = null;
    if (forceKey) {
      COMPOSERS.forEach(function (K) {
        if (K.key !== forceKey) return;
        var s = -1;
        try { s = K.score(B.bag); } catch (e) {}
        if (s > 0) chosen = withScore(K, s);
      });
    }
    if (!chosen) chosen = pick(B.bag);
    if (!chosen) {
      /* Two different nothings, and they deserve different words. An empty
         selection is an invitation; a selection whose every node came back
         empty is a finding, and the reason belongs on the frame rather than
         in a console nobody opens. */
      if (!sel.length) {
        txt("Pick something from the wall", st.cx, st.cy, S.U * 0.030,
            P.dim, "center", 500);
      } else {
        txtFit("nothing to draw for this selection", st.cx,
               st.cy - S.U * 0.030, S.U * 0.028, P.ink, "center", 600, st.w * 0.9);
        B.missing.slice(0, 4).forEach(function (m, i) {
          txtFit((m.label || m.id) + " — " + m.why, st.cx,
                 st.cy + S.U * (0.010 + i * 0.034), S.U * 0.019, P.dim,
                 "center", 500, st.w * 0.92);
        });
      }
      captionBand(S.headline || "Studio Pro", S.sub);
      safeGuides();
      return { composer: null, missing: B.missing, options: quiet ? null : [] };
    }
    /* The leaf is a whole page: it paints its own paper to the frame's edge
       and carries its own foot, so the stage's background, stars and caption
       band would all be drawing over or under a finished card. */
    var ownsFrame = chosen.key === "almanac";
    if (ownsFrame) { background(); }
    try { chosen.draw(B.bag, p, st, C); }
    catch (e) {
      txt("this combination could not be drawn", st.cx, st.cy, S.U * 0.026,
          P.mal, "center", 500);
      txtFit(String(e && e.message || e), st.cx, st.cy + S.U * 0.040,
             S.U * 0.017, P.dim, "center", 500, st.w * 0.9);
    }
    /* What the chosen view could not take is returned to the page, not
       swallowed: a studio that silently drops half a selection teaches its
       user nothing about why the picture looks wrong. */
    if (!ownsFrame) captionBand(S.headline || chosen.label, S.sub || chosen.blurb);
    else if (S.headline) {
      /* a headline the user typed still belongs on the leaf, set in its own
         gold rather than in the diagram band's */
      txt(S.headline, S.W / 2, S.H * 0.045, S.U * 0.034,
          pal().gold, "center", 700);
    }
    safeGuides();
    return { composer: chosen.key, label: chosen.label, missing: B.missing,
             options: quiet ? null : options(B.bag) };
  }

  /* ---- the storyboard ----------------------------------------------------

     A reel that makes one point is a card with motion. A reel that makes three
     in sequence — here is the claim, here is the geometry, here is the number
     — is the thing people watch twice. A shot is a selection, a pinned view
     and a length; the storyboard plays them end to end and the recorder
     captures the whole run rather than one shot.

     The dip between shots is not decoration. A hard cut between two dark
     canvases of similar composition reads as a glitch rather than an edit,
     and the eye needs the beat to accept that the subject changed. */
  function storyTotal(shots) {
    var t = 0;
    (shots || []).forEach(function (sh) { t += Math.max(1, sh.seconds || 5); });
    return t || 1;
  }
  function shotAt(shots, p) {
    var total = storyTotal(shots), acc = 0, want = p * total;
    for (var i = 0; i < shots.length; i++) {
      var len = Math.max(1, shots[i].seconds || 5);
      if (want < acc + len || i === shots.length - 1)
        return { i: i, shot: shots[i], local: Math.min(1, (want - acc) / len),
                 len: len, total: total, at: want };
      acc += len;
    }
    return null;
  }
  function renderStory(shots, C, p) {
    if (!shots || !shots.length) return render([], C, p, null);
    var cur = shotAt(shots, p);
    if (!cur) return render([], C, p, null);
    var out = render(cur.shot.sel || [], C, cur.local, cur.shot.force || null, true);
    /* the dip: a quarter-second at each join, strongest at the boundary */
    var dipFor = 0.22;
    var into = cur.local * cur.len, left = cur.len - into;
    var a = 0;
    if (cur.i > 0 && into < dipFor) a = 1 - into / dipFor;
    if (cur.i < shots.length - 1 && left < dipFor) a = Math.max(a, 1 - left / dipFor);
    if (a > 0) {
      var c = S.ctx;
      c.save(); c.fillStyle = pal().bg; c.globalAlpha = a * 0.92;
      c.fillRect(0, 0, S.W, S.H); c.restore();
    }
    /* which shot, and how many — a viewer scrubbing needs to know where they
       are, and a three-part reel benefits from the viewer knowing it is three */
    if (shots.length > 1) {
      var st = stage(), P = pal(), c2 = S.ctx;
      var bw = st.w * 0.30, bx = st.cx - bw / 2, by = st.y - S.H * 0.016;
      for (var k = 0; k < shots.length; k++) {
        var seg = bw / shots.length, x = bx + seg * k;
        c2.save();
        c2.fillStyle = k === cur.i ? P.gold : P.line;
        c2.globalAlpha = k === cur.i ? 0.9 : 0.45;
        c2.fillRect(x + 1, by, seg - 2, Math.max(2, S.H * 0.0022));
        c2.restore();
      }
    }
    out.shot = cur.i;
    out.shots = shots.length;
    return out;
  }

  /* ---- the recorder ------------------------------------------------------
     Frame-accurate: the canvas is driven at a fixed step and the stream is
     fed one frame per step, so the file lasts exactly as long as it says
     rather than as long as the machine happened to take. */
  /* The recording in flight, so it can be stopped.

     It used to be unstoppable: once started, its own loop drove the playhead
     for the whole length and nothing could interrupt it. The Pause button sat
     there enabled, writing PLAY = false, which the recorder never read — so
     pressing Pause during a recording did exactly nothing, and pressing Play
     put a SECOND writer on the playhead and would have corrupted the capture.
     A transport control that is enabled and inert is worse than one that is
     greyed out, because the only thing the reader learns is that the page
     does not work. */
  var JOB = null;
  function isRecording() { return !!JOB; }
  function cancelRecording() { if (JOB) JOB.cancel = true; return !!JOB; }

  /* `sel` is either a selection (one shot) or an array of shots, in which
     case `seconds` is ignored and the storyboard's own total is used. */
  function record(sel, C, seconds, fps, forceKey, onFrame) {
    var shots = (sel && sel.length && typeof sel[0] === "object" && sel[0].sel)
      ? sel : null;
    if (shots) seconds = storyTotal(shots);
    return new Promise(function (resolve, reject) {
      var stream = null;
      try { stream = S.cv.captureStream(0); }
      catch (e) { reject(new Error("this browser cannot capture a canvas")); return; }
      var track = stream.getVideoTracks()[0];
      if (!track || !track.requestFrame) {
        reject(new Error("this browser cannot drive frames one at a time"));
        return;
      }
      var types = ["video/mp4;codecs=avc1", "video/webm;codecs=vp9",
                   "video/webm;codecs=vp8", "video/webm"];
      var mime = "";
      types.forEach(function (t) {
        if (!mime && window.MediaRecorder && MediaRecorder.isTypeSupported(t)) mime = t;
      });
      if (!mime) { reject(new Error("no supported recording format")); return; }
      var chunks = [], rec;
      try { rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12000000 }); }
      catch (e) { reject(e); return; }
      var job = { cancel: false };
      JOB = job;
      rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = function () {
        JOB = null;
        resolve({ blob: new Blob(chunks, { type: mime }), mime: mime,
                  seconds: seconds, frames: total, cancelled: job.cancel,
                  madeSeconds: Math.min(i, total) / fps });
      };
      var total = Math.max(2, Math.round(seconds * fps)), i = 0;
      rec.start();
      function step() {
        if (job.cancel || i > total) { try { rec.stop(); } catch (e) {} return; }
        S.p = i / total;
        if (shots) renderStory(shots, C, S.p);
        else render(sel, C, S.p, forceKey);
        try { track.requestFrame(); } catch (e) {}
        if (onFrame) onFrame(i / total);
        i++;
        /* a timeout rather than rAF: rAF is throttled in a background tab and
           a reel recorded while the user looked at another tab would be short */
        setTimeout(step, Math.max(4, 1000 / fps / 4));
      }
      step();
    });
  }

  /* Render a composition into SOMEBODY ELSE'S canvas at an arbitrary size.

     The stage is a singleton — one canvas, one size — because the director
     stage is one thing. The sample strip needs a dozen small pictures a
     second from the same composers, and standing up a second stage would be
     a second set of composers to keep in step. So the singleton is lent out:
     its canvas, size and chrome flags are swapped, the composition is drawn,
     and everything is put back. Every composer sizes from S.U, so a tile is
     the same picture at a smaller scale rather than a cropped one.

     The flags matter: a thumbnail has no business reserving Instagram's
     strips or drawing guide rectangles, and its caption band would be two
     unreadable lines, so all three stand down for the duration. */
  function renderTo(cv, w, h, sel, C, p, force) {
    var keep = { cv: S.cv, ctx: S.ctx, W: S.W, H: S.H, U: S.U,
                 safe: S.safe, head: S.headline, sub: S.sub, tile: S.tile };
    if (cv.width !== w) cv.width = w;
    if (cv.height !== h) cv.height = h;
    S.cv = cv; S.ctx = cv.getContext("2d");
    S.W = w; S.H = h; S.U = w; S.safe = false; S.tile = true;
    S.headline = ""; S.sub = "";
    var out = null;
    try { out = render(sel, C, p, force, true); } catch (e) { out = null; }
    S.cv = keep.cv; S.ctx = keep.ctx; S.W = keep.W; S.H = keep.H; S.U = keep.U;
    S.safe = keep.safe; S.headline = keep.head; S.sub = keep.sub; S.tile = keep.tile;
    return out;
  }

  window.SPStage = {
    S: S, PALS: PALS, RATIOS: RATIOS, SAFE: SAFE, renderTo: renderTo,
    attach: function (canvas) {
      S.cv = canvas; S.ctx = canvas.getContext("2d");
      this.resize();
    },
    resize: function () {
      var r = RATIOS[S.ratio] || RATIOS["9:16"];
      var q = Math.max(0.25, Math.min(1, S.quality || 1));
      S.W = Math.round(r.w * q); S.H = Math.round(r.h * q); S.U = S.W;
      if (S.cv) { S.cv.width = S.W; S.cv.height = S.H; }
      STARS = null;
    },
    /* Run something at true export size, then put the preview size back.
       Every composer sizes from S.U, so the picture is identical either way —
       only the number of pixels differs. */
    withFullSize: function (fn) {
      var q = S.quality;
      S.quality = 1; this.resize();
      try { return fn(); } finally { S.quality = q; this.resize(); }
    },
    render: render, renderStory: renderStory, record: record,
    isRecording: isRecording, cancelRecording: cancelRecording,
    storyTotal: storyTotal, shotAt: shotAt, options: options, bagOf: bagOf,
    composers: function () { return COMPOSERS.map(function (K) {
      return { key: K.key, label: K.label, blurb: K.blurb }; }); }
  };
})();
