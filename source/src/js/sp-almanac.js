/* ===== The almanac card — an ornate pañcāṅga leaf =========================

   Everything else this studio draws is a diagram: a ring, a bar, a spiral.
   This one is a PAGE — the printed almanac leaf, with a foliated arch over
   it, scroll-work in the corners, a sun medallion on the crown and the day's
   five limbs set in two columns. It is the only thing here whose job is to be
   beautiful first and legible second, because it is the card somebody keeps.

   DRAWN, NOT PLACED. There is no image file behind any of this. The arch is a
   half-ellipse with cusped foils computed along it; the corner flourishes are
   logarithmic spirals with leaves hung off them; the rosettes, the dividers
   and the nine row icons are all paths. That matters for a reason beyond
   tidiness: the card has to compose itself for any date, any place and any
   shape of frame, and a decorated PNG cannot stretch from 4:5 to 9:16 without
   tearing.

   THE ANIMATION, and what each part of it is for:

     the sun on the crown breathes and its corona turns, which gives the card
       a heartbeat without moving anything a reader is trying to read;

     a band of light sweeps down the leaf once per cycle and lifts each row
       into gold as it crosses it. This is the only part that is really doing
       work: it walks the eye down the five limbs in order, which is the order
       a pañcāṅga is read in, and it means a ten-second reel teaches the
       sequence rather than showing a static poster for ten seconds;

     sparks catch and fade on the gold work, seeded so they do not shimmer at
       random between frames;

     and the whole leaf drifts a fraction of a percent, because a perfectly
       still frame reads as a photograph of a card rather than a card. */

(function () {
  "use strict";

  var SERIF = '"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif';
  var SANS = 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
  var DEVA = '"Noto Sans Devanagari","Nirmala UI","Mangal",system-ui,sans-serif';
  var R2 = Math.PI / 180;

  /* The leaf has its own palette. The studio's four are for diagrams on a
     dark field; this is a printed page, and the two things it needs — aged
     paper and leaf gold — are not in those. A light studio palette flips the
     leaf to a true paper version rather than forcing navy onto parchment. */
  function inks(P) {
    var light = (P.bg.charCodeAt(1) > 55);   /* a pale background */
    return light ? {
      paper: "#ece0c4", edge: "#c9b98e", panel: "#f7f1e2", panel2: "#efe6d2",
      rule: "#a8842f", gold: "#8a6a1e", goldHi: "#a86f0c", ink: "#4a4232",
      dim: "#857a5e", star: "#8a7d5c", glow: "#b08a2c", dark: false
    } : {
      paper: "#e9ddbf", edge: "#cbb98e", panel: "#0d1430", panel2: "#161f45",
      /* ink and goldHi were #f6f0dd and #fff0c2 — a warm white and a slightly
         warmer white. The sweep lifted each row from one to the other and
         nothing visibly happened. A row at rest is now quiet parchment and a
         row in the light is unmistakably gold. */
      rule: "#c9a24b", gold: "#dcb871", goldHi: "#ffd27a", ink: "#ded5bd",
      dim: "#9d9276", star: "#ffe9b0", glow: "#ffcf72", dark: true
    };
  }
  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  /* A foliated arch: a half-ellipse with n cusps riding on it. Sampled rather
     than built from arcs, because the cusps have to sit ON the ellipse and
     the join between an arc and its neighbour is where a hand-built arch goes
     visibly wrong. */
  function archPath(c, cx, baseY, halfW, hgt, foils, bite) {
    var N = 420;
    c.beginPath();
    for (var i = 0; i <= N; i++) {
      var t = i / N;                       /* 0 = left spring, 1 = right */
      var a = Math.PI * (1 - t);           /* π → 0 across the top */
      var scallop = Math.abs(Math.sin(foils * Math.PI * t));
      var rad = 1 - bite * scallop;
      var x = cx + Math.cos(a) * halfW * rad;
      var y = baseY - Math.sin(a) * hgt * rad;
      if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
  }

  /* A corner scroll: a spiral with leaves. Four of these, mirrored, is what
     reads as "illuminated" without a single imported glyph. */
  function flourish(c, x, y, s, flipX, flipY, I, alpha) {
    c.save();
    c.translate(x, y);
    c.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    c.globalAlpha = alpha;
    c.strokeStyle = I.rule;
    c.lineWidth = Math.max(1, s * 0.022);
    c.lineCap = "round";
    /* The corner itself: two strokes running along the panel edges that turn
       inward and meet. Without them the scroll floated in the corner like a
       sticker; with them it is a corner piece. */
    c.beginPath();
    c.moveTo(s * 1.55, 0);
    c.lineTo(s * 0.34, 0);
    c.bezierCurveTo(s * 0.12, 0, 0, s * 0.12, 0, s * 0.34);
    c.lineTo(0, s * 1.55);
    c.stroke();
    /* the vine inside it */
    c.beginPath();
    c.moveTo(s * 1.20, s * 0.14);
    c.bezierCurveTo(s * 0.62, s * 0.16, s * 0.30, s * 0.34, s * 0.26, s * 0.76);
    c.stroke();
    c.beginPath();
    c.moveTo(s * 0.14, s * 1.20);
    c.bezierCurveTo(s * 0.16, s * 0.62, s * 0.34, s * 0.30, s * 0.76, s * 0.26);
    c.stroke();
    /* the scroll at the elbow */
    c.beginPath();
    for (var i = 0; i <= 90; i++) {
      var t = i / 90, th = t * Math.PI * 2.6;
      var r = s * 0.26 * Math.exp(-0.40 * th);
      var sx = s * 0.52 + Math.cos(th + 2.3) * r;
      var sy = s * 0.52 + Math.sin(th + 2.3) * r;
      if (i === 0) c.moveTo(sx, sy); else c.lineTo(sx, sy);
    }
    c.stroke();
    /* two small leaves on the vine, not three floating ones */
    [[0.74, 0.22, 0.5], [0.22, 0.74, 1.07]].forEach(function (L) {
      c.beginPath();
      c.ellipse(s * L[0], s * L[1], s * 0.105, s * 0.042, L[2], 0, Math.PI * 2);
      c.stroke();
    });
    c.restore();
  }

  function rosette(c, cx, cy, r, n, I, alpha) {
    c.save();
    c.globalAlpha = alpha;
    c.strokeStyle = I.rule;
    c.lineWidth = Math.max(1, r * 0.09);
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2;
      c.beginPath();
      c.ellipse(cx + Math.cos(a) * r * 0.46, cy + Math.sin(a) * r * 0.46,
                r * 0.46, r * 0.20, a, 0, Math.PI * 2);
      c.stroke();
    }
    c.beginPath(); c.arc(cx, cy, r * 0.17, 0, Math.PI * 2); c.stroke();
    c.restore();
  }

  /* the sun on the crown: a disc, a corona that turns, and a pulse */
  function sunMedallion(c, cx, cy, r, t, I) {
    c.save();
    /* the rim */
    c.fillStyle = I.dark ? "#121a3c" : "#e8dcbd";
    c.beginPath(); c.arc(cx, cy, r * 1.30, 0, Math.PI * 2); c.fill();
    c.strokeStyle = I.rule; c.lineWidth = Math.max(1.5, r * 0.055);
    c.beginPath(); c.arc(cx, cy, r * 1.30, 0, Math.PI * 2); c.stroke();
    /* the corona, turning */
    var puls = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
    c.save();
    c.translate(cx, cy);
    c.rotate(t * Math.PI * 0.6);
    c.globalCompositeOperation = "lighter";
    for (var i = 0; i < 24; i++) {
      var a = i / 24 * Math.PI * 2;
      var len = r * (1.02 + 0.22 * (i % 2 ? 1 : 0.55) * (0.6 + 0.4 * puls));
      c.strokeStyle = I.glow;
      c.globalAlpha = 0.30 + 0.28 * puls;
      c.lineWidth = Math.max(1, r * 0.055);
      c.beginPath();
      c.moveTo(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86);
      c.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      c.stroke();
    }
    c.restore();
    /* the disc */
    var g = c.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.1, cx, cy, r);
    g.addColorStop(0, "#fff3cf");
    g.addColorStop(0.45, "#f2a73a");
    g.addColorStop(1, "#b5451a");
    c.fillStyle = g;
    c.beginPath(); c.arc(cx, cy, r * (0.82 + 0.03 * puls), 0, Math.PI * 2); c.fill();
    c.restore();
  }

  /* the Moon at the day's real elongation */
  function moonDisc(c, cx, cy, r, elong, I) {
    c.save();
    c.fillStyle = I.dark ? "#1a2347" : "#ddd2b4";
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
    var ph = (((elong % 360) + 360) % 360) / 360;
    var k = Math.cos(ph * Math.PI * 2);        /* +1 new, −1 full */
    c.save();
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.clip();
    c.fillStyle = "#f3e7c4";
    c.beginPath();
    /* lit limb: a half disc plus an ellipse whose width is the terminator */
    var waxing = ph < 0.5;
    c.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, !waxing);
    c.ellipse(cx, cy, r * Math.abs(k), r, 0, Math.PI / 2, -Math.PI / 2,
              waxing === (k > 0));
    c.fill();
    c.restore();
    c.strokeStyle = I.rule; c.lineWidth = Math.max(1.2, r * 0.07);
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
    c.restore();
  }

  /* --- the nine row icons, all paths ------------------------------------- */
  function icon(c, kind, x, y, s, col) {
    c.save();
    c.translate(x, y);
    c.strokeStyle = col; c.fillStyle = col;
    c.lineWidth = Math.max(1, s * 0.07);
    c.lineJoin = "round"; c.lineCap = "round";
    var i, a;
    if (kind === "lotus") {
      for (i = -2; i <= 2; i++) {
        c.save(); c.rotate(i * 0.42);
        c.beginPath();
        c.ellipse(0, -s * 0.34, s * 0.16, s * 0.40, 0, 0, Math.PI * 2);
        c.stroke(); c.restore();
      }
      c.beginPath(); c.moveTo(-s * 0.55, s * 0.12);
      c.quadraticCurveTo(0, s * 0.42, s * 0.55, s * 0.12); c.stroke();
    } else if (kind === "star") {
      c.beginPath();
      for (i = 0; i < 16; i++) {
        a = i / 16 * Math.PI * 2;
        var r = (i % 2 ? s * 0.22 : s * 0.62);
        var px = Math.cos(a - Math.PI / 2) * r, py = Math.sin(a - Math.PI / 2) * r;
        if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.closePath(); c.stroke();
    } else if (kind === "om") {
      c.font = "600 " + Math.round(s * 1.18) + "px " + DEVA;
      c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText("ॐ", 0, 0);
    } else if (kind === "orbit") {
      c.beginPath(); c.arc(0, 0, s * 0.30, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.ellipse(0, 0, s * 0.62, s * 0.30, -0.4, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(s * 0.50, -s * 0.20, s * 0.09, 0, Math.PI * 2); c.fill();
    } else if (kind === "saturn") {
      c.beginPath(); c.arc(0, 0, s * 0.34, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.ellipse(0, 0, s * 0.64, s * 0.20, -0.42, 0, Math.PI * 2); c.stroke();
    } else if (kind === "planet") {
      c.beginPath(); c.arc(0, 0, s * 0.45, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.ellipse(0, 0, s * 0.45, s * 0.17, 0, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.ellipse(0, 0, s * 0.17, s * 0.45, 0, 0, Math.PI * 2); c.stroke();
    } else if (kind === "seal") {
      c.save(); c.rotate(Math.PI / 4);
      c.strokeRect(-s * 0.42, -s * 0.42, s * 0.84, s * 0.84); c.restore();
      c.strokeRect(-s * 0.42, -s * 0.42, s * 0.84, s * 0.84);
      for (i = 0; i < 8; i++) {
        a = i / 8 * Math.PI * 2;
        c.beginPath();
        c.ellipse(Math.cos(a) * s * 0.17, Math.sin(a) * s * 0.17,
                  s * 0.17, s * 0.08, a, 0, Math.PI * 2);
        c.stroke();
      }
    } else if (kind === "sunrise") {
      c.beginPath(); c.arc(0, s * 0.10, s * 0.32, Math.PI, 0); c.stroke();
      c.beginPath(); c.moveTo(-s * 0.62, s * 0.12); c.lineTo(s * 0.62, s * 0.12); c.stroke();
      for (i = -2; i <= 2; i++) {
        a = -Math.PI / 2 + i * 0.55;
        c.beginPath();
        c.moveTo(Math.cos(a) * s * 0.44, s * 0.10 + Math.sin(a) * s * 0.44);
        c.lineTo(Math.cos(a) * s * 0.62, s * 0.10 + Math.sin(a) * s * 0.62);
        c.stroke();
      }
    } else if (kind === "moon") {
      c.beginPath(); c.arc(0, 0, s * 0.46, 0, Math.PI * 2); c.stroke();
      c.beginPath();
      c.arc(0, 0, s * 0.46, Math.PI / 2, -Math.PI / 2);
      c.ellipse(0, 0, s * 0.18, s * 0.46, 0, -Math.PI / 2, Math.PI / 2, true);
      c.fill();
    }
    c.restore();
  }

  /* deterministic sparks, so they do not jitter between frames */
  function sparks(c, W, H, t, I, n) {
    var seed = 991;
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    c.save();
    c.globalCompositeOperation = "lighter";
    for (var i = 0; i < n; i++) {
      var x = rnd() * W, y = rnd() * H, ph = rnd(), sz = 0.4 + rnd() * 0.8;
      var k = Math.sin((t + ph) * Math.PI * 2);
      if (k <= 0) continue;
      var a = k * k * 0.85, s = sz * W * 0.006 * (0.6 + 0.6 * k);
      c.globalAlpha = a; c.strokeStyle = I.star;
      c.lineWidth = Math.max(0.8, W * 0.0013);
      c.beginPath();
      c.moveTo(x - s, y); c.lineTo(x + s, y);
      c.moveTo(x, y - s); c.lineTo(x, y + s);
      c.stroke();
    }
    c.restore();
  }

  /* ---- the card ---------------------------------------------------------- */
  /* A is the packaged day; see the almanac node in sp-nodes.js. */
  function draw(c, W, H, A, p, P, opts) {
    opts = opts || {};
    var I = inks(P);
    var U = W;

    /* the drift: a fraction of a percent, which is the difference between a
       card and a photograph of a card */
    var dz = 1 + 0.010 * (0.5 - 0.5 * Math.cos(p * Math.PI * 2));
    var dy = H * 0.004 * Math.sin(p * Math.PI * 2);
    c.save();
    c.translate(W / 2, H / 2); c.scale(dz, dz); c.translate(-W / 2, -H / 2 + dy);

    /* 1 — the paper */
    c.fillStyle = I.paper; c.fillRect(-W, -H, W * 3, H * 3);
    var vg = c.createRadialGradient(W / 2, H / 2, W * 0.1, W / 2, H / 2, W * 0.95);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, I.dark ? "rgba(40,28,8,0.30)" : "rgba(90,70,30,0.18)");
    c.fillStyle = vg; c.fillRect(0, 0, W, H);

    /* 2 — the panel */
    var m = W * 0.052, pr = W * 0.030;
    var px = m, py = m * (H / W) * 0.62, pw = W - m * 2, ph = H - py * 2;
    c.save();
    rr(c, px, py, pw, ph, pr);
    var pg = c.createLinearGradient(0, py, 0, py + ph);
    pg.addColorStop(0, I.panel); pg.addColorStop(1, I.panel2);
    c.fillStyle = pg; c.fill();
    c.restore();

    /* 3 — the faint sky inside it */
    c.save();
    rr(c, px, py, pw, ph, pr); c.clip();
    var seed = 7717;
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    c.globalAlpha = I.dark ? 0.55 : 0.25;
    for (var i = 0; i < 170; i++) {
      c.fillStyle = I.star;
      c.globalAlpha = (I.dark ? 0.18 : 0.10) + rnd() * 0.35;
      var sx = px + rnd() * pw, sy = py + rnd() * ph, sr = rnd() * W * 0.0022 + W * 0.0006;
      c.beginPath(); c.arc(sx, sy, sr, 0, Math.PI * 2); c.fill();
    }
    /* constellation arcs — the printed star-chart under the text */
    c.globalAlpha = I.dark ? 0.085 : 0.06;
    c.strokeStyle = I.rule; c.lineWidth = Math.max(1, W * 0.0012);
    for (var k = 0; k < 7; k++) {
      var ccx = px + rnd() * pw, ccy = py + rnd() * ph, crr = pw * (0.12 + rnd() * 0.38);
      c.beginPath(); c.arc(ccx, ccy, crr, rnd() * 6, rnd() * 6 + 2); c.stroke();
    }
    c.restore();

    /* 4 — the gold double rule */
    c.save();
    c.strokeStyle = I.rule;
    c.globalAlpha = 0.95; c.lineWidth = Math.max(2, W * 0.0040);
    rr(c, px, py, pw, ph, pr); c.stroke();
    c.globalAlpha = 0.55; c.lineWidth = Math.max(1, W * 0.0018);
    rr(c, px + W * 0.012, py + W * 0.012, pw - W * 0.024, ph - W * 0.024, pr * 0.8);
    c.stroke();
    c.restore();

    /* 5 — the arch and the corner scrolls.

       The first cut drew the arch at a tenth of the panel height in a thin
       half-transparent line and it simply could not be seen: the card read as
       a plain box with text in it. An arch is the whole reason the head looks
       like a leaf from an almanac rather than a slide, so it is drawn heavy,
       it springs from the panel's own sides, and the head sits INSIDE it. */
    /* Taller and narrower than the first cut, which spanned the whole panel
       at a sixth of its height and read as a shallow dish. And the crown is
       placed from the PANEL TOP rather than from the apex, because an apex
       computed from a height is free to walk off the top of the frame — which
       is exactly what it did, clipping the sun's corona at every ratio. */
    /* The arch has to ENCLOSE the head, not cross it. Deriving the base from
       the apex put the springing line below the date, so the curve ran
       straight through "19 October 2026". Both ends are fixed instead: the
       apex sits where the crown sits, the springing line sits just above the
       divider, and the height is whatever that leaves. The crown straddles
       the panel's top edge, which is where it belongs on a printed leaf. */
    var archBase = py + ph * 0.212;
    var sunCy = py + ph * 0.045, sunR = W * 0.048;
    var archTop = archBase - sunCy;
    c.save();
    /* a wash under the arch, so the head reads as a recessed niche */
    archPath(c, W / 2, archBase, pw * 0.430, archTop, 9, 0.105);
    c.lineTo(px + pw * 0.030, py + W * 0.012);
    c.lineTo(px + pw * 0.970, py + W * 0.012);
    c.closePath();
    c.fillStyle = I.dark ? "rgba(255,221,150,0.045)" : "rgba(120,92,28,0.055)";
    c.fill();
    c.strokeStyle = I.rule; c.globalAlpha = 1;
    c.lineWidth = Math.max(2.4, W * 0.0046);
    archPath(c, W / 2, archBase, pw * 0.430, archTop, 9, 0.105);
    c.stroke();
    c.globalAlpha = 0.62; c.lineWidth = Math.max(1.2, W * 0.0022);
    archPath(c, W / 2, archBase - W * 0.017, pw * 0.396, archTop * 0.900, 9, 0.105);
    c.stroke();
    c.restore();
    var fs = pw * 0.105, fo = W * 0.030;
    flourish(c, px + fo, py + fo, fs, false, false, I, 0.60);
    flourish(c, px + pw - fo, py + fo, fs, true, false, I, 0.60);
    flourish(c, px + fo, py + ph - fo, fs, false, true, I, 0.60);
    flourish(c, px + pw - fo, py + ph - fo, fs, true, true, I, 0.60);

    /* 6 — the crown, sitting on the apex rather than off the top edge */
    sunMedallion(c, W / 2, sunCy, sunR, p, I);

    /* ---- type ----------------------------------------------------------- */
    function txt(s, x, y, size, col, align, weight, font) {
      if (s == null || s === "") return;
      c.fillStyle = col; c.textAlign = align || "center"; c.textBaseline = "middle";
      c.font = (weight || 600) + " " + Math.round(size) + "px " + (font || SANS);
      c.fillText(String(s), x, y);
    }
    function fit(s, size, maxW, weight, font) {
      var f = size;
      for (var z = 0; z < 22; z++) {
        c.font = (weight || 600) + " " + Math.round(f) + "px " + (font || SANS);
        if (c.measureText(String(s)).width <= maxW) break;
        f *= 0.95;
      }
      return f;
    }
    function txtFit(s, x, y, size, col, align, weight, maxW, font) {
      txt(s, x, y, fit(s, size, maxW, weight, font), col, align, weight, font);
    }

    txt("Nirayana — निरयन", W / 2, py + ph * 0.072,
        U * 0.027, I.gold, "center", 500, SERIF);

    /* the moon disc and the date share a line */
    var dateY = py + ph * 0.118;
    moonDisc(c, px + pw * 0.175, dateY, W * 0.052, A.elongation, I);
    txtFit(A.dateLine, W / 2 + pw * 0.055, dateY, U * 0.078, I.goldHi, "center",
           600, pw * 0.66, SERIF);
    txtFit(A.subLine, W / 2 + pw * 0.055, dateY + ph * 0.040, U * 0.0245,
           I.gold, "center", 500, pw * 0.70, SERIF);

    /* the divider under the head */
    function divider(y, big) {
      c.save();
      c.strokeStyle = I.rule; c.globalAlpha = big ? 0.85 : 0.55;
      c.lineWidth = Math.max(1, W * (big ? 0.0022 : 0.0014));
      var x0 = px + pw * 0.055, x1 = px + pw * 0.945, gap = pw * (big ? 0.085 : 0.030);
      c.beginPath();
      c.moveTo(x0, y); c.lineTo(W / 2 - gap, y);
      c.moveTo(W / 2 + gap, y); c.lineTo(x1, y);
      c.stroke();
      if (big) {
        c.beginPath();
        c.moveTo(W / 2 - gap * 0.55, y); c.lineTo(W / 2 - gap * 0.18, y);
        c.moveTo(W / 2 + gap * 0.18, y); c.lineTo(W / 2 + gap * 0.55, y);
        c.stroke();
      }
      /* the star at the centre */
      c.globalAlpha = 0.95; c.fillStyle = I.rule;
      var s4 = W * (big ? 0.013 : 0.009);
      c.beginPath();
      c.moveTo(W / 2, y - s4); c.lineTo(W / 2 + s4 * 0.34, y);
      c.lineTo(W / 2, y + s4); c.lineTo(W / 2 - s4 * 0.34, y);
      c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(W / 2 - s4, y); c.lineTo(W / 2, y - s4 * 0.34);
      c.lineTo(W / 2 + s4, y); c.lineTo(W / 2, y + s4 * 0.34);
      c.closePath(); c.fill();
      c.restore();
    }
    divider(py + ph * 0.234, true);

    /* ---- the rows -------------------------------------------------------
       The sweep lifts a row into gold as it crosses. Its position is the
       playhead, held at each row a moment longer than the gaps between them
       so the eye has time — a linear sweep across five rows reads as a wipe
       rather than as reading. */
    var top = py + ph * 0.256, bottom = py + ph * 0.952;
    var rows = A.rows;
    var band = (bottom - top) / rows.length;
    var sweepY = top + (bottom - top) * ((p * 1.18) % 1);

    rows.forEach(function (row, ri) {
      var y = top + band * ri;
      if (ri > 0) divider(y, false);
      var cy = y + band * 0.50;
      /* The window was six tenths of a row and squared, which left the
         brightest row at a third of full and nothing ever looked lit. It is a
         whole row wide now and eased rather than squared, so exactly one row
         is unmistakably in the light at any moment and the next is coming up. */
      var hot = Math.max(0, 1 - Math.abs(cy - sweepY) / (band * 1.00));
      hot = hot * hot * (3 - 2 * hot);
      var cols = row.cols;
      cols.forEach(function (col, ci) {
        var full = cols.length === 1;
        var cx = full ? px + pw * 0.14 : px + pw * (ci === 0 ? 0.135 : 0.555);
        var wid = full ? pw * 0.80 : pw * 0.335;
        var ix = cx - pw * 0.065;
        icon(c, col.icon, ix, cy - band * 0.02, U * 0.030,
             hot > 0.3 ? I.goldHi : I.rule);
        txt(col.label, cx, cy - band * 0.235, U * 0.0235,
            hot > 0.3 ? I.goldHi : I.dim, "left", 600, SERIF);
        c.save();
        if (hot > 0.3 && I.dark) {
          c.shadowColor = "rgba(255,200,110," + (0.75 * hot).toFixed(2) + ")";
          c.shadowBlur = U * 0.022 * hot;
        }
        txtFit(col.value, cx, cy - band * 0.055, U * 0.049,
               hot > 0.3 ? I.goldHi : I.ink, "left", 600, wid, SERIF);
        c.restore();
        if (col.detail)
          txtFit(col.detail, cx, cy + band * (col.detail2 ? 0.130 : 0.175),
                 U * 0.0230, hot > 0.4 ? I.gold : I.dim, "left", 500,
                 full ? pw * 0.80 : wid * 1.08, SERIF);
        if (col.detail2)
          txtFit(col.detail2, cx, cy + band * 0.265, U * 0.0230,
                 hot > 0.4 ? I.gold : I.dim, "left", 500, pw * 0.80, SERIF);
      });
      /* the light itself, over the row it is on */
      if (hot > 0.02) {
        c.save();
        c.globalCompositeOperation = "lighter";
        var lg = c.createLinearGradient(px, 0, px + pw, 0);
        lg.addColorStop(0, "rgba(255,210,120,0)");
        lg.addColorStop(0.5, "rgba(255,221,150," + (0.60 * hot).toFixed(3) + ")");
        lg.addColorStop(1, "rgba(255,210,120,0)");
        c.fillStyle = lg;
        c.fillRect(px, cy - band * 0.46, pw, band * 0.085);
        c.restore();
      }
    });

    /* 7 — the sparks, last so they sit on top of the gold */
    sparks(c, W, H, p, I, 46);

    if (opts.foot)
      txt(opts.foot, W / 2, py + ph * 0.985, U * 0.020, I.dim, "center", 500, SERIF);
    c.restore();
  }

  window.SPAlmanac = { draw: draw, inks: inks };
})();
