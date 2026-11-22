/* ===== Reel Agent — Kahani (story) mode, ported from the kahani kit ======

   A surface like any other, so the renderer, the verifier and the voice
   treat a story reel exactly as an engine reel. This file is a port of the
   kahani kit (github.com/aseemm84/kahani-reels, src/kahani/), from Remotion
   components to one canvas, frame for frame:

     theme.ts         THEME below — the kit's night-blue storybook palette
     Background.tsx   background(): 70 seeded twinkling stars, soft hills,
                      seven bobbing diyas, the vignette fading in
     Camera.tsx       a 1 → 1.08 push-in about (50%, 45%) across each scene
     KahaniReel.tsx   scene lengths = voice + 0.35 s, 9-frame crossfades
     Kicker.tsx       kicker(): monospace kicker, big title, *gold box*
     Caption.tsx      describe().pill — the renderer draws the caption pill
                      in the kit's style (navy pill, white 800 type, *gold*)
     Props.tsx        Moon, Mountains, Cloud, Tree — same shapes, same motion
     astro/*.tsx      the Nirayana-story layouts: ZodiacWheel, NakshatraArc,
                      MoonPhase, InfoCards, Timeline, BigStat, GrahaOrb,
                      RetroLoop — each animating on its own, as in the kit
                      (Remotion's spring() is solved in closed form here)

   What differs from the kit, on purpose:
   - A scene's character art is an SVG FRAGMENT from the agent, sanitised
     (RA.sanitize) and rasterised once at configure(), then moved with
     simple motion (entrance, bob, parallax, sway). The kit's stories are
     React components written per story; a browser page cannot compile
     those, and must never run model-written code.
   - Every number a layout shows (a longitude on the wheel, a BigStat, a
     date on the timeline, a value on a card) is checked against the facts
     the agent fetched, exactly as the narration is. A layout that shows an
     unchecked number is refused with the number named — the kit's
     verify_numbers.py, applied to the picture as well as the words.
   - Fonts: Poppins is not on the page, so the Devanāgarī stack the rest of
     the Reel Agent uses stands in. */
(function () {
  "use strict";
  var RA = window.RA = window.RA || {};
  var W = 1080, H = 1920, FPS = 30, FADE = 9;

  var THEME = {
    skyTop: "#0b1a4a", skyBottom: "#1d3f9a", ink: "#0a1230", gold: "#ffc83d", goldDeep: "#f29d12",
    saffron: "#ff7a1a", cream: "#fff4dc", leaf: "#3fae6a", leafDark: "#21734a", mountain: "#2a4fb8",
    mountainDark: "#1a3380", cloud: "#e9eefc", white: "#ffffff"
  };
  var FONT = "'Poppins','Noto Sans Devanagari','Kohinoor Devanagari','Nirmala UI','Mangal',system-ui,sans-serif";
  var RASHI_HI = ["मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या", "तुला", "वृश्चिक", "धनु", "मकर", "कुम्भ", "मीन"];
  var GRAHA_COLOR = { Sun: "#ffb321", Moon: "#f3f1e6", Mars: "#ff5a3c", Mercury: "#4fd18b", Jupiter: "#ffd36b",
                      Venus: "#f7d7ff", Saturn: "#7fa2ff", Rahu: "#8d7bd6", Ketu: "#c98b5a" };
  var GRAHA_HI = { Sun: "सूर्य", Moon: "चन्द्र", Mars: "मंगल", Mercury: "बुध", Jupiter: "बृहस्पति", Venus: "शुक्र",
                   Saturn: "शनि", Rahu: "राहु", Ketu: "केतु" };

  /* ---- Remotion's helpers ------------------------------------------------ */
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function interp(x, a, b, ya, yb) {
    var u = (x - a) / (b - a);
    if (u < 0) u = 0; if (u > 1) u = 1;
    return ya + (yb - ya) * u;
  }
  /* spring(): a damped oscillator from 0 to 1, released at rest at frame 0
     (stiffness 100, mass 1 and damping 10 unless given, as in Remotion) */
  function spring(frame, cfg) {
    if (frame <= 0) return 0;
    cfg = cfg || {};
    var m = cfg.mass || 1, k = cfg.stiffness || 100, c = cfg.damping == null ? 10 : cfg.damping;
    var t = frame / FPS, w0 = Math.sqrt(k / m), z = c / (2 * Math.sqrt(k * m));
    if (z < 1) {
      var wd = w0 * Math.sqrt(1 - z * z);
      return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t));
    }
    return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  }
  var rand = function (i) { var x = Math.sin(i * 9301.17) * 43758.5453; return x - Math.floor(x); };

  /* ---- Background.tsx --------------------------------------------------- */
  var HILLS = null, DIYA = null;
  function background(c, frame) {
    if (!HILLS) { HILLS = new Path2D("M0 1720 Q270 1640 540 1700 T1080 1680 V1920 H0Z"); DIYA = new Path2D("M-22 4 Q0 26 22 4Z"); }
    var g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, THEME.skyTop); g.addColorStop(1, THEME.skyBottom);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (var i = 0; i < 70; i++) {
      var tw = 0.35 + 0.65 * Math.abs(Math.sin(frame / 25 + i));
      c.globalAlpha = tw * 0.8; c.fillStyle = "#fff";
      c.beginPath(); c.arc(rand(i) * W, rand(i + 100) * 1300, 1 + rand(i + 200) * 2.4, 0, 7); c.fill();
    }
    c.globalAlpha = 0.55; c.fillStyle = THEME.ink; c.fill(HILLS);
    for (var d = 0; d < 7; d++) {
      var x = 80 + d * 153, y = 1800 + (d % 2) * 30 + Math.sin(frame / 18 + d) * 6;
      var glow = 0.55 + 0.45 * Math.abs(Math.sin(frame / 12 + d * 1.7));
      c.save(); c.translate(x, y);
      c.globalAlpha = 0.18 * glow; c.fillStyle = THEME.gold; c.beginPath(); c.arc(0, 0, 46, 0, 7); c.fill();
      c.globalAlpha = 0.35 * glow; c.beginPath(); c.arc(0, 0, 24, 0, 7); c.fill();
      c.globalAlpha = glow; c.fillStyle = THEME.cream; c.beginPath(); c.ellipse(0, -6, 7, 13, 0, 0, 7); c.fill();
      c.globalAlpha = 1; c.fillStyle = THEME.saffron; c.fill(DIYA);
      c.restore();
    }
    c.globalAlpha = interp(frame, 0, 20, 0, 1);
    var v = c.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, Math.hypot(W / 2, H * 0.6));
    v.addColorStop(0.55, "rgba(5,10,35,0)"); v.addColorStop(1, "rgba(5,10,35,0.55)");
    c.fillStyle = v; c.fillRect(0, 0, W, H);
    c.globalAlpha = 1;
  }

  function rr(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  /* ---- Kicker.tsx ------------------------------------------------------- */
  function parts(s) { return String(s || "").split(/(\*[^*]+\*)/g).filter(Boolean); }
  function kicker(c, frame, kick, title) {
    if (!kick && !title) return;
    c.save();
    c.globalAlpha = interp(frame, 0, 12, 0, 1);
    var x0 = 70, y = 150;
    if (kick) {
      c.font = "28px ui-monospace,Menlo,Consolas,monospace"; c.fillStyle = THEME.gold; c.textBaseline = "top"; c.textAlign = "left";
      if ("letterSpacing" in c) c.letterSpacing = "4px";
      c.fillText(kick, x0, y); y += 28 + 10;
      if ("letterSpacing" in c) c.letterSpacing = "0px";
    }
    if (title) {
      var fs = 72, P = parts(title);
      c.font = "800 " + fs + "px " + FONT;
      var width = function () { return P.reduce(function (a, p) { return a + c.measureText(p.replace(/\*/g, "")).width + (p[0] === "*" ? 36 : 0); }, 0); };
      while (width() > W - 140 && fs > 44) { fs -= 4; c.font = "800 " + fs + "px " + FONT; }
      var x = x0, lh = fs * 1.15;
      c.textBaseline = "middle"; c.textAlign = "left";
      P.forEach(function (p) {
        var hi = p[0] === "*", t = hi ? p.slice(1, -1) : p, w = c.measureText(t).width;
        if (hi) {
          x += 4; c.fillStyle = THEME.gold; rr(c, x, y, w + 28, lh, 12); c.fill();
          c.fillStyle = THEME.ink; c.fillText(t, x + 14, y + lh / 2); x += w + 28 + 4;
        } else { c.fillStyle = THEME.white; c.fillText(t, x, y + lh / 2); x += w; }
      });
    }
    c.restore();
  }

  /* ---- Props.tsx -------------------------------------------------------- */
  var PROPS = {
    moon: function (c, f, o) {
      var x = o.x == null ? 760 : o.x, y = o.y == null ? 520 : o.y, r = o.r || 150, g = 0.25 + 0.08 * Math.sin(f / 20);
      var a = c.globalAlpha;
      c.fillStyle = THEME.cream; c.globalAlpha = a * g * 0.5; c.beginPath(); c.arc(x, y, r * 1.7, 0, 7); c.fill();
      c.globalAlpha = a; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
      c.fillStyle = "#f1e2bd"; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.2, r * 0.16, 0, 7); c.fill();
      c.beginPath(); c.arc(x + r * 0.35, y + r * 0.3, r * 0.11, 0, 7); c.fill();
    },
    mountains: function (c, f, o) {
      var y = o.y == null ? 1300 : o.y, off = o.offset || 0;
      c.save(); c.translate(off, 0);
      function tri(a, b, cc, col) { c.fillStyle = col; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(cc[0], cc[1]); c.closePath(); c.fill(); }
      tri([-100, y + 300], [180, y - 120], [420, y + 300], THEME.mountainDark);
      tri([250, y + 300], [560, y - 260], [880, y + 300], THEME.mountain);
      tri([700, y + 300], [980, y - 90], [1250, y + 300], THEME.mountainDark);
      c.fillStyle = THEME.cloud; c.beginPath();
      [[560, y - 260], [500, y - 150], [540, y - 170], [580, y - 140], [620, y - 180]].forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); });
      c.closePath(); c.fill(); c.restore();
    },
    cloud: function (c, f, o) {
      var x = o.x == null ? 200 : o.x, y = o.y == null ? 420 : o.y, s = o.s || 1, drift = o.drift == null ? 0.6 : o.drift;
      c.save(); c.translate(x + f * drift, y); c.scale(s, s); c.fillStyle = THEME.cloud;
      c.beginPath(); c.ellipse(0, 0, 110, 46, 0, 0, 7); c.fill();
      c.beginPath(); c.arc(-40, -30, 48, 0, 7); c.fill(); c.beginPath(); c.arc(35, -42, 60, 0, 7); c.fill();
      c.restore();
    },
    tree: function (c, f, o) {
      var x = o.x == null ? 170 : o.x, y = o.y == null ? 1500 : o.y, s = o.s || 1, sway = Math.sin(f / 22 + x) * 2;
      c.save(); c.translate(x, y); c.scale(s, s); c.rotate(sway * Math.PI / 180);
      c.fillStyle = "#6b3f1f"; rr(c, -10, -10, 20, 90, 6); c.fill();
      c.fillStyle = THEME.leafDark; c.beginPath(); c.moveTo(0, -170); c.lineTo(-80, 0); c.lineTo(80, 0); c.closePath(); c.fill();
      c.fillStyle = THEME.leaf; c.beginPath(); c.moveTo(0, -230); c.lineTo(-60, -80); c.lineTo(60, -80); c.closePath(); c.fill();
      c.restore();
    }
  };

  /* ---- astro/common.ts -------------------------------------------------- */
  function polar(cx, cy, r, lon) { var a = Math.PI - lon * Math.PI / 180; return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) }; }
  function sector(cx, cy, r0, r1, a0, a1) {
    var A = polar(cx, cy, r1, a0), B = polar(cx, cy, r1, a1), C = polar(cx, cy, r0, a1), D = polar(cx, cy, r0, a0);
    var large = Math.abs(a1 - a0) > 180 ? 1 : 0;
    return new Path2D("M " + A.x + " " + A.y + " A " + r1 + " " + r1 + " 0 " + large + " 0 " + B.x + " " + B.y +
                      " L " + C.x + " " + C.y + " A " + r0 + " " + r0 + " 0 " + large + " 1 " + D.x + " " + D.y + " Z");
  }
  function text(c, s, x, y, size, weight, fill, align, stroke) {
    c.font = (weight || 700) + " " + size + "px " + FONT; c.textAlign = align || "center"; c.textBaseline = "alphabetic";
    if (stroke) { c.lineWidth = stroke[1]; c.strokeStyle = stroke[0]; c.lineJoin = "round"; c.strokeText(s, x, y); }
    c.fillStyle = fill; c.fillText(s, x, y);
  }
  /* a circle at alpha a × the current scene alpha */
  function dot(c, x, y, r, fill, a) {
    var k = c.globalAlpha; c.globalAlpha = k * (a == null ? 1 : a); c.fillStyle = fill;
    c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.globalAlpha = k;
  }
  function withAlpha(c, a, fn) { var k = c.globalAlpha; c.globalAlpha = k * a; fn(); c.globalAlpha = k; }

  /* ---- astro layouts ---------------------------------------------------- */
  var LAYOUTS = {
    /* ZodiacWheel.tsx */
    wheel: function (c, F, o) {
      var f = F - (o.delay || 0), cx = o.cx || 540, cy = o.cy || 900, r = o.r || 420;
      var draw = interp(f, 0, 25, 0, 1), rot = o.spin === false ? 0 : interp(f, 0, 600, 8, 0);
      var edges = o.nakEdges || Array.apply(null, Array(28)).map(function (_, i) { return i * 360 / 27; });
      var glow = 0.55 + 0.35 * Math.sin(f / 9), grahas = o.grahas || [];
      var lane = {}, sorted = grahas.slice().sort(function (a, b) { return a.lon - b.lon; });
      sorted.forEach(function (g, k) { var p = sorted[k - 1]; lane[g.graha] = p && Math.abs(g.lon - p.lon) < 24 ? (lane[p.graha] + 1) % 3 : 0; });
      if (sorted.length > 1) { var a0 = sorted[0], z = sorted[sorted.length - 1];
        if (a0.lon + 360 - z.lon < 24 && lane[a0.graha] === lane[z.graha]) lane[a0.graha] = (lane[z.graha] + 1) % 3; }
      c.save(); c.globalAlpha *= draw; c.translate(cx, cy); c.rotate(rot * Math.PI / 180); c.translate(-cx, -cy);
      dot(c, cx, cy, r + 26, THEME.gold, 0.06);
      for (var i = 0; i < 12; i++) {
        var hi = o.highlightRashi === i + 1, mid = polar(cx, cy, r * 0.86, i * 30 + 15), P = sector(cx, cy, r * 0.72, r, i * 30, i * 30 + 30);
        withAlpha(c, hi ? glow : 1, function () { c.fillStyle = hi ? THEME.gold : i % 2 ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.10)"; c.fill(P); });
        c.strokeStyle = "rgba(255,255,255,0.35)"; c.lineWidth = 2; c.stroke(P);
        text(c, RASHI_HI[i], mid.x, mid.y + 14, 38, 800, hi ? THEME.ink : THEME.cream);
      }
      c.strokeStyle = THEME.cream; c.lineWidth = 2;
      withAlpha(c, 0.5, function () {
        edges.slice(0, 27).forEach(function (a) { var p0 = polar(cx, cy, r * 0.62, a), p1 = polar(cx, cy, r * 0.72, a);
          c.beginPath(); c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y); c.stroke(); });
      });
      c.strokeStyle = "rgba(255,255,255,0.3)"; c.beginPath(); c.arc(cx, cy, r * 0.62, 0, 7); c.stroke();
      if (o.highlightArc) withAlpha(c, glow, function () { c.fillStyle = THEME.saffron; c.fill(sector(cx, cy, r * 0.62, r * 0.72, o.highlightArc[0], o.highlightArc[1])); });
      grahas.forEach(function (g, k) {
        var s = spring(f - 20 - k * 6, { damping: 13 }), lon = g.lon - 90 + 90 * s;
        var L = lane[g.graha] || 0, ring = r * (0.52 - L * 0.13), p = polar(cx, cy, ring, lon), col = GRAHA_COLOR[g.graha] || THEME.gold;
        withAlpha(c, clamp01(s), function () {
          dot(c, p.x, p.y, 30, col, 0.25); dot(c, p.x, p.y, 17, col);
          text(c, (g.hi || GRAHA_HI[g.graha] || g.graha) + (g.retro && g.graha !== "Rahu" && g.graha !== "Ketu" ? " ℞" : ""),
               p.x + (L === 1 ? 30 : 0), p.y + (L === 0 ? -30 : L === 1 ? 10 : 52), 28, 700, THEME.white, L === 1 ? "left" : "center", [THEME.ink, 6]);
        });
      });
      dot(c, cx, cy, 10, THEME.gold);
      c.restore();
    },
    /* NakshatraArc.tsx */
    nakshatra: function (c, F, o) {
      var f = F - (o.delay || 0), s = clamp01(spring(f, { damping: 14 })), y = o.y || 950;
      var L = 120, R = 960, Wd = R - L, top = y - 150, start = +o.start, end = +o.end;
      var xAt = function (lon) { return L + (lon - start) / (end - start) * Wd; };
      var fmt = function (d) { var dg = Math.floor(d + 1e-6), mi = Math.round((d - dg) * 60); return mi ? dg + "°" + mi + "′" : dg + "°"; };
      c.save(); c.globalAlpha *= s; c.translate(0, (1 - s) * 60);
      var band = new Path2D("M " + L + " " + (top + 60) + " Q 540 " + (top - 40) + " " + R + " " + (top + 60) + " L " + R + " " + (top + 230) + " Q 540 " + (top + 130) + " " + L + " " + (top + 230) + " Z");
      c.fillStyle = "rgba(255,200,61,0.16)"; c.fill(band); c.strokeStyle = THEME.gold; c.lineWidth = 3; c.stroke(band);
      (o.padas || []).slice(0, 4).forEach(function (p, i) {
        var x0 = L + i * Wd / 4, x1 = L + (i + 1) * Wd / 4, on = o.activePada === p.pada, ap = interp(f, 12 + i * 8, 22 + i * 8, 0, 1);
        withAlpha(c, ap, function () {
          if (i > 0) withAlpha(c, 0.6, function () { c.save(); c.setLineDash([8, 8]); c.strokeStyle = THEME.cream; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x0, top + 20); c.lineTo(x0, top + 200); c.stroke(); c.restore(); });
          if (on) withAlpha(c, 0.35, function () { c.fillStyle = THEME.saffron; rr(c, x0 + 6, top + 40, x1 - x0 - 12, 150, 18); c.fill(); });
          text(c, "पाद " + p.pada, (x0 + x1) / 2, top + 120, 40, 800, THEME.white);
          if (p.navamsha && p.navamsha.hi) text(c, p.navamsha.hi, (x0 + x1) / 2, top + 168, 30, 400, THEME.gold);
        });
      });
      text(c, String(o.name || ""), 540, top - 70, 96, 900, THEME.gold);
      text(c, fmt(start), L, top + 290, 36, 700, THEME.cream); text(c, fmt(end), R, top + 290, 36, 700, THEME.cream);
      if (o.star) {
        var ao = interp(f, 45, 60, 0, 1), sx = xAt(+o.star.lon);
        withAlpha(c, ao, function () {
          dot(c, sx, top + 30, 22 + 6 * Math.sin(f / 6), THEME.white, 0.35);
          c.fillStyle = THEME.white; c.fill(new Path2D("M " + sx + " " + (top + 4) + " l 8 18 20 4 -15 14 4 20 -17 -10 -17 10 4 -20 -15 -14 20 -4 z"));
          text(c, String(o.star.name || ""), sx, top - 14, 32, 700, THEME.white);
        });
      }
      c.restore();
    },
    /* MoonPhase.tsx */
    moon: function (c, F, o) {
      var f = F - (o.delay || 0), cx = o.cx || 540, cy = o.cy || 860, r = o.r || 260;
      var k = interp(f, 0, 30, 0, +o.illumination || 0), waxing = (+o.elongation || 0) < 180, rx = Math.abs(1 - 2 * k) * r;
      dot(c, cx, cy, r * 1.5, THEME.cream, 0.06 + 0.04 * Math.sin(f / 10));
      dot(c, cx, cy, r, "#1b2556");
      c.fillStyle = THEME.cream;
      c.fill(new Path2D("M " + cx + " " + (cy - r) + " A " + r + " " + r + " 0 0 " + (waxing ? 1 : 0) + " " + cx + " " + (cy + r) +
                        " A " + rx + " " + r + " 0 0 " + ((k > 0.5) === waxing ? 1 : 0) + " " + cx + " " + (cy - r) + " Z"));
      dot(c, cx - r * 0.3, cy - r * 0.25, r * 0.12, "#000", 0.06); dot(c, cx + r * 0.25, cy + r * 0.3, r * 0.09, "#000", 0.06);
      if (o.label) text(c, String(o.label), cx, cy + r + 110, 76, 900, THEME.gold);
      if (o.sub) text(c, String(o.sub), cx, cy + r + 170, 40, 600, THEME.cream);
    },
    /* Cards.tsx — InfoCards */
    cards: function (c, F, o) {
      var f = F - (o.delay || 0), y = o.y || 520;
      if (o.title) text(c, String(o.title), 540, y - 40, 64, 900, THEME.gold);
      (o.rows || []).slice(0, 6).forEach(function (row, i) {
        var s = spring(f - 6 - i * 7, { damping: 14 }), yy = y + i * 150, on = o.highlight === i;
        c.save(); c.globalAlpha *= clamp01(s); c.translate((1 - s) * 200, 0);
        c.fillStyle = on ? THEME.gold : "rgba(8,14,40,0.82)"; rr(c, 110, yy, 860, 124, 26); c.fill();
        c.strokeStyle = "rgba(255,255,255,0.15)"; c.lineWidth = 2; c.stroke();
        text(c, String(row.label || ""), 150, yy + 78, 38, 600, on ? THEME.ink : THEME.cream, "left");
        text(c, String(row.value || ""), 930, yy + 80, 48, 900, on ? THEME.ink : THEME.white, "right");
        c.restore();
      });
    },
    /* Cards.tsx — Timeline */
    timeline: function (c, F, o) {
      var f = F - (o.delay || 0), y = o.y || 480, items = (o.items || []).slice(0, 5);
      var h = interp(f, 0, 20 + items.length * 10, 0, items.length * 170);
      c.strokeStyle = THEME.gold; c.lineWidth = 6; c.lineCap = "round"; c.beginPath(); c.moveTo(190, y); c.lineTo(190, y + h); c.stroke();
      items.forEach(function (it, i) {
        var s = spring(f - 8 - i * 10, { damping: 13 }), yy = y + 40 + i * 190, col = it.graha ? (GRAHA_COLOR[it.graha] || THEME.gold) : THEME.gold;
        c.save(); c.globalAlpha *= clamp01(s); c.translate((1 - s) * 120, 0);
        c.fillStyle = col; c.beginPath(); c.arc(190, yy, 24, 0, 7); c.fill(); c.strokeStyle = THEME.ink; c.lineWidth = 6; c.stroke();
        text(c, String(it.date || ""), 250, yy - 10, 46, 800, THEME.gold, "left");
        text(c, String(it.text || ""), 250, yy + 44, 46, 600, THEME.white, "left");
        c.restore();
      });
    },
    /* Cards.tsx — BigStat */
    stat: function (c, F, o) {
      var f = F - (o.delay || 0), y = o.y || 860, s = spring(f, { damping: 18, mass: 1.2 });
      /* the kit's spring overshoots by about 1 %, which would show 121 for a
         value of 120 for a few frames — a number that is not in the facts.
         The count stops at its value; the glow keeps the bounce. */
      var v = ((+o.value || 0) * Math.min(1, s)).toFixed(o.decimals || 0), suf = String(o.suffix || "");
      dot(c, 540, y - 40, 300, THEME.gold, 0.08 * clamp01(s));
      c.font = "900 230px " + FONT; var w1 = c.measureText(v).width; c.font = "900 110px " + FONT; var w2 = c.measureText(suf).width;
      var x = 540 - (w1 + w2) / 2;
      text(c, v, x, y, 230, 900, THEME.gold, "left"); text(c, suf, x + w1, y, 110, 900, THEME.gold, "left");
      withAlpha(c, interp(f, 15, 30, 0, 1), function () { text(c, String(o.label || ""), 540, y + 110, 50, 700, THEME.cream); });
    },
    /* Cards.tsx — GrahaOrb */
    orb: function (c, F, o) {
      var f = F - (o.delay || 0), cx = o.cx || 540, cy = o.cy || 860, r = o.r || 210, s = Math.max(0, spring(f, { damping: 12 }));
      var col = GRAHA_COLOR[o.graha] || THEME.gold;
      c.save(); c.translate(cx, cy); c.scale(s, s);
      dot(c, 0, 0, r * 1.6, col, 0.12 + 0.05 * Math.sin(f / 8)); dot(c, 0, 0, r, col);
      withAlpha(c, 0.25, function () { c.fillStyle = "#fff"; c.beginPath(); c.ellipse(-r * 0.3, -r * 0.35, r * 0.35, r * 0.2, 0, 0, 7); c.fill(); });
      if (o.graha === "Saturn") withAlpha(c, 0.8, function () { c.save(); c.rotate(-18 * Math.PI / 180); c.strokeStyle = "#c9d6ff"; c.lineWidth = 22;
        c.beginPath(); c.ellipse(0, 0, r * 1.7, r * 0.38, 0, 0, 7); c.stroke(); c.restore(); });
      if (o.graha === "Sun") for (var i = 0; i < 12; i++) { c.save(); c.rotate((i * 30 + f) * Math.PI / 180); c.fillStyle = col; rr(c, -8, -r * 1.45, 16, r * 0.3, 8); c.fill(); c.restore(); }
      text(c, String(o.label || GRAHA_HI[o.graha] || ""), 0, r + 110, 84, 900, THEME.white);
      if (o.retro) { c.save(); c.translate(r * 0.75, -r * 0.8); c.fillStyle = THEME.saffron; rr(c, -90, -46, 180, 80, 40); c.fill();
        text(c, "वक्री", 0, 12, 42, 900, THEME.white); c.restore(); }
      c.restore();
    },
    /* RetroLoop.tsx */
    retro: function (c, F, o) {
      var f = F - (o.delay || 0), y = o.y || 880, col = GRAHA_COLOR[o.graha] || THEME.gold;
      var segs = [[[100, y + 120], [330, y + 40], [520, y - 30], [640, y - 40]], [[640, y - 40], [760, y - 50], [720, y + 120], [560, y + 60]],
                  [[560, y + 60], [470, y + 25], [600, y - 120], [760, y - 110]], [[760, y - 110], [860, y - 100], [940, y - 150], [1000, y - 200]]];
      var d = "M 100 " + (y + 120) + segs.map(function (s) { return " C " + s[1].join(" ") + ", " + s[2].join(" ") + ", " + s[3].join(" "); }).join("");
      var path = new Path2D(d), t = interp(f, 10, 150, 0, 1), Lp = 1600;
      c.lineCap = "round"; c.lineWidth = 10; c.strokeStyle = "rgba(255,255,255,0.18)"; c.stroke(path);
      c.save(); c.setLineDash([Lp, Lp]); c.lineDashOffset = Lp * (1 - t); c.strokeStyle = THEME.gold; c.stroke(path); c.restore();
      var si = Math.min(3, Math.floor(t * 4)), u = t * 4 - si, S = segs[si];
      var B = function (i) { return Math.pow(1 - u, 3) * S[0][i] + 3 * Math.pow(1 - u, 2) * u * S[1][i] + 3 * (1 - u) * u * u * S[2][i] + u * u * u * S[3][i]; };
      var px = B(0), py = B(1), inR = t > 0.27 && t < 0.62;
      dot(c, px, py, inR ? 46 : 36, col, 0.3); dot(c, px, py, 26, col);
      text(c, GRAHA_HI[o.graha] || "", px, py - 50, 40, 800, THEME.white);
      text(c, t < 0.27 ? "→" : inR ? "← " + (o.retroLabel || "वक्री") : (o.directLabel || "मार्गी") + " →", 640, y + 230, 70, 900, inR ? THEME.saffron : THEME.leaf);
    }
  };

  /* Which parameters of a layout are DATA (checked against the facts) and
     which are placement (free): position, size, timing and indices. */
  var PLACE = { cx: 1, cy: 1, r: 1, y: 1, delay: 1, spin: 1, highlightRashi: 1, activePada: 1, highlight: 1,
                decimals: 1, type: 1, pada: 1, i: 1, nakEdges: 1 };
  function dataNumbers(o) {
    var out = [];
    (function walk(v, key) {
      if (v == null || PLACE[key]) return;
      if (typeof v === "number") { var s = String(v), dp = (s.split(".")[1] || "").length; out.push({ v: v, dp: dp, raw: s, key: key }); return; }
      if (typeof v === "string") { RA.facts.numbersIn(v).forEach(function (n) { n.key = key; out.push(n); }); return; }
      if (Array.isArray(v)) { v.forEach(function (x) { walk(x, key); }); return; }
      if (typeof v === "object") Object.keys(v).forEach(function (k) { walk(v[k], k); });
    })(o, "");
    return out;
  }
  function checkLayout(o, facts) {
    var vals = RA.facts.values(facts || []).concat(RA.facts.values(RA.facts.FRAMEWORK));
    return dataNumbers(o).filter(function (n) {
      var m = n;
      if (n.key === "illumination" && n.v >= 0 && n.v <= 1) m = { v: Math.round(n.v * 100), dp: 0, raw: n.raw };
      return !vals.some(function (fv) { return RA.facts.matches(m, fv); });
    }).map(function (n) { return (n.key ? n.key + " " : "") + (n.raw || String(n.v)); });
  }

  /* ---- the surface ------------------------------------------------------ */
  function kahani() {
    var SC = [], IMG = [], FACTS = [], T = 0, STORY = { title: "", kicker: "" };
    function describe() {
      return { surface: "kahani", label: "Kahani", size: { W: W, H: H },
               layouts: [{ id: "kahani", label: "Kahani — story reel / कहानी रील", group: "Kahani", defaultSeconds: 45 }],
               /* the kit's frame zones: title 0–330 (drawn here), caption 1450–1620, diyas below */
               safeZones: { title: null, caption: { x: 90, y: 1440, w: 900, h: 190 },
                            footer: { x: W * 0.05, y: 1840, w: W * 0.9, h: 70 } },
               pill: { fill: "rgba(8,14,40,0.88)", stroke: "rgba(255,255,255,0.12)", radius: 22, weight: 800, size: 58,
                       text: THEME.white, key: THEME.gold, font: FONT, centre: 0.5 } };
    }
    function setFacts(f) { FACTS = (f || []).slice(); }
    /* scenes are accepted (sanitised, layouts checked) first; configure rasterises them */
    function accept(scenes, story, facts) {
      if (facts) setFacts(facts);
      if (story) STORY = { title: String(story.title || "").slice(0, 60), kicker: String(story.kicker || "").slice(0, 40) };
      var removed = 0, refused = [];
      SC = (scenes || []).slice(0, 14).map(function (s, i) {
        var r = RA.sanitize.svg(s.svg || "");
        removed += r.removed;
        var m = s.motion || {}, lay = null;
        if (s.layout && LAYOUTS[s.layout.type]) {
          var bad = checkLayout(s.layout, FACTS);
          if (bad.length) refused.push({ scene: i + 1, layout: s.layout.type, numbers: bad });
          else lay = JSON.parse(JSON.stringify(s.layout));
        }
        return { svg: r.ok ? r.svg : "", seconds: Math.max(2.5, Math.min(12, +s.seconds || 6)), layout: lay,
                 props: (s.props || []).map(function (p) { return typeof p === "string" ? { p: p } : p; })
                          .filter(function (p) { return p && PROPS[p.p]; }).slice(0, 6),
                 motion: { entrance: /^(fade|rise|zoom|none)$/.test(m.entrance) ? m.entrance : "rise",
                           bob: Math.max(0, Math.min(1, m.bob == null ? 0.4 : +m.bob)), parallax: Math.max(0, Math.min(1, +m.parallax || 0)),
                           sway: Math.max(0, Math.min(1, +m.sway || 0)) },
                 say: String(s.say || s.narration || ""), caption: String(s.caption || "") };
      });
      if (!STORY.title && scenes && scenes[0] && scenes[0].kicker) STORY.title = String(scenes[0].kicker);
      timing();
      return { scenes: SC, removed: removed, refused: refused };
    }
    /* KahaniReel.tsx: each scene is its line plus 0.35 s, scenes overlap by FADE frames */
    function timing() {
      var t = 0, fd = FADE / FPS;
      SC.forEach(function (s, i) { s.len = s.seconds + 0.35; s.start = t; t += s.len - (i < SC.length - 1 ? fd : 0); });
      T = t;
    }
    function raster(s) {
      return new Promise(function (res) {
        if (!s.svg) return res(null);
        var blob = new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H + '">' + s.svg + "</svg>"], { type: "image/svg+xml" });
        var u = URL.createObjectURL(blob), im = new Image();
        im.onload = function () { URL.revokeObjectURL(u); res(im); };
        im.onerror = function () { URL.revokeObjectURL(u); res(null); };
        im.src = u;
      });
    }
    function configure(spec) {
      if (spec && spec.facts) setFacts(spec.facts);
      if (spec && spec.scenes) accept(spec.scenes, spec.story);
      return Promise.all(SC.map(raster)).then(function (ims) { IMG = ims; return describe(); });
    }
    function beats() {
      var fd = FADE / FPS;
      return SC.map(function (s, i) {
        var to = s.start + s.len - (i < SC.length - 1 ? fd : 0);
        return { i: i, from: s.start, to: to, secs: to - s.start, say: s.say, caption: s.caption };
      });
    }
    function drawScene(c, s, k, lf, alpha) {
      var d = s.len * FPS, z = interp(lf, 0, d, 1, 1.08);
      c.save(); c.globalAlpha = alpha;
      c.translate(W * 0.5, H * 0.45); c.scale(z, z); c.translate(-W * 0.5, -H * 0.45);
      var px = (lf / d - 0.5) * s.motion.parallax;
      s.props.forEach(function (p) {
        c.save(); c.translate(px * (p.p === "mountains" ? 20 : p.p === "moon" ? 30 : 50), 0);
        PROPS[p.p](c, lf, p); c.restore();
      });
      if (s.layout) { c.save(); LAYOUTS[s.layout.type](c, lf, s.layout); c.restore(); }
      if (IMG[k]) {
        var e = s.motion.entrance === "none" ? 1 : spring(lf, { damping: 14 });
        var dy = (s.motion.entrance === "rise" ? (1 - e) * 120 : 0) + Math.sin(lf / 12) * 12 * s.motion.bob;
        var sc = s.motion.entrance === "zoom" ? 0.85 + 0.15 * e : 1;
        c.save();
        if (s.motion.entrance === "fade") c.globalAlpha *= clamp01(e);
        c.translate(W / 2, H / 2 + dy); c.rotate(Math.sin(lf / 22) * 0.02 * s.motion.sway); c.scale(sc, sc); c.translate(-W / 2, -H / 2);
        c.drawImage(IMG[k], 0, 0, W, H);
        c.restore();
      }
      c.restore();
    }
    function frame(p, c) {
      var t = p * T, gf = t * FPS;
      c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = "source-over";
      background(c, gf);
      SC.forEach(function (s, k) {
        var last = k === SC.length - 1;
        if (t < s.start || (!last && t >= s.start + s.len)) return;
        var lf = (t - s.start) * FPS, d = s.len * FPS;
        var inO = k === 0 ? 1 : interp(lf, 0, FADE, 0, 1), outO = last ? 1 : interp(lf, d - FADE, d, 1, 0);
        drawScene(c, s, k, lf, Math.min(inO, outO));
      });
      kicker(c, gf, STORY.kicker, STORY.title);
    }
    return { describe: describe, configure: configure, ready: function () { return SC.length > 0; },
             duration: function () { return T; }, beats: beats,
             facts: function () { return RA.facts.FRAMEWORK.concat(FACTS); }, frame: frame,
             title: function () { return null; }, accept: accept, setFacts: setFacts, story: function () { return STORY; },
             postCaption: function () { return ""; } };
  }
  RA.adapter.register("kahani", kahani);

  /* ---- the sky, for Nirayana-story reels ----------------------------------
     What the kit's bridge.mjs `data sky` and `data events` give, from this
     page's own almanac engine (NP): the nine grahas' sidereal places, the
     Moon's phase and the next month of events. Every number returned is also
     returned as a fact, so a scene or a line may use it and the checks find
     it. A sky reel is about a date, never about a person. */
  function sky(dateStr, timeStr) {
    var NP = window.NP;
    if (!NP || !NP.sidAt) return { error: "the almanac engine is not on this page" };
    var P = NP.savedPlace ? NP.savedPlace() : null;
    var d = /^\d{4}-\d{2}-\d{2}$/.test(dateStr || "") ? dateStr : new Date().toISOString().slice(0, 10);
    var tm = /^\d{1,2}:\d{2}$/.test(timeStr || "") ? ("0" + timeStr).slice(-5) : "12:00";
    var tz = P && P.tz != null ? +P.tz : 5.5;
    var ms = Date.parse(d + "T" + tm + ":00Z") - tz * 3600000;
    var grahas = (NP.GRAHA || []).map(function (g) {
      var lon = NP.sidAt(g, ms); if (lon == null) return null;
      lon = ((lon % 360) + 360) % 360;
      var ni = window.NNak ? window.NNak.at(lon) : { i: Math.floor(lon / (40 / 3)), pada: Math.floor((lon % (40 / 3)) / (10 / 3)) + 1, name: "" };
      return { graha: g, hi: GRAHA_HI[g], lon: Math.round(lon * 10) / 10, retro: g === "Rahu" || g === "Ketu" ? true : !!NP.isRetro(g, ms),
               rashi: { i: Math.floor(lon / 30) + 1, hi: RASHI_HI[Math.floor(lon / 30)] }, degInRashi: Math.round((lon % 30) * 10) / 10,
               nakshatra: { i: ni.i + 1, name: ni.name || "", pada: ni.pada } };
    }).filter(Boolean);
    var su = grahas.filter(function (g) { return g.graha === "Sun"; })[0], mo = grahas.filter(function (g) { return g.graha === "Moon"; })[0];
    var el = su && mo ? ((mo.lon - su.lon) % 360 + 360) % 360 : null;
    var moon = el == null ? null : { elongation: Math.round(el), illumination: Math.round((1 - Math.cos(el * Math.PI / 180)) / 2 * 100) / 100,
                                     waxing: el < 180, tithi: Math.floor(el / 12) + 1 };
    var ev = [];
    try {
      ev = NP.scanEvents(ms, ms + 30 * 86400000, { bodies: ["Sun", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"] })
        .filter(function (e) { return /^(ingress|retrograde|direct|newmoon|fullmoon)$/.test(e.kind); })
        .sort(function (a, b) { return a.ms - b.ms; }).slice(0, 10)
        .map(function (e) { return { kind: e.kind, graha: e.graha || "", date: new Date(e.ms + tz * 3600000).toISOString().slice(0, 10),
                                     sign: e.sign != null ? { i: e.sign + 1, hi: RASHI_HI[e.sign] } : null }; });
    } catch (e2) {}
    var out = { date: d, time: tm, place: { name: (P && P.name) || "Delhi", tz: tz }, ayanamsa: NP.ayanKey ? NP.ayanKey() : "",
                nakshatra_system: window.NNak ? window.NNak.label() : "", grahas: grahas, moon: moon, events: ev };
    var F = RA.facts, facts = [];
    grahas.forEach(function (g) {
      facts.push({ id: "sky." + g.graha + ".lon", label: g.graha + " sidereal longitude (°)", value: g.lon, unit: "°", kind: "degree", source: "engine" });
      facts.push({ id: "sky." + g.graha + ".deg", label: g.graha + " degree in its rāśi", value: g.degInRashi, unit: "°", kind: "degree", source: "engine" });
      facts.push({ id: "sky." + g.graha + ".pada", label: g.graha + " pāda", value: g.nakshatra.pada, unit: "", kind: "number", source: "engine" });
    });
    if (moon) {
      facts.push({ id: "sky.moon.el", label: "Moon's elongation (°)", value: moon.elongation, unit: "°", kind: "degree", source: "engine" });
      facts.push({ id: "sky.moon.ill", label: "Moon lit (%)", value: Math.round(moon.illumination * 100), unit: "%", kind: "number", source: "engine" });
      facts.push({ id: "sky.moon.tithi", label: "tithi number", value: moon.tithi, unit: "", kind: "number", source: "engine" });
    }
    facts = facts.concat(F.dateFacts("sky.date", Date.parse(d + "T12:00:00Z"), "the date asked for"));
    facts.push({ id: "sky.hh", label: "hour asked for", value: +tm.split(":")[0], unit: "", kind: "number", source: "input" });
    facts.push({ id: "sky.mm", label: "minute asked for", value: +tm.split(":")[1], unit: "", kind: "number", source: "input" });
    ev.forEach(function (e, i) { facts = facts.concat(F.dateFacts("sky.ev" + i, Date.parse(e.date + "T12:00:00Z"), e.kind + " " + e.graha)); });
    return { data: out, facts: facts };
  }

  var shared = null;
  RA.kahani = {
    surface: function () { return shared || (shared = RA.adapter.make("kahani")); },
    accept: function (scenes, story, facts) { return RA.kahani.surface().accept(scenes, story, facts); },
    sky: sky, LAYOUTS: Object.keys(LAYOUTS), PROPS: Object.keys(PROPS), checkLayout: checkLayout, THEME: THEME, spring: spring
  };
})();
