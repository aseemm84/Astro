/* ===== cards.js — the reel strip, and a card you compose yourself ===========

   WHY THESE LIVE ON THE STUDIO PAGE. The Studio already knows the date, the
   place, the language and the export ratio; it already loads the engine, the
   pañcāṅga and the place database; and it already draws one card. Two more
   pages would have meant three copies of all of that, three place pickers to
   keep in step and three things to break when the engine moves. These are
   sections, not pages, for the same reason the calendar's four views are one
   page: they share every input they have.

   WHAT IS HERE.

     The reel strip — five animations that are different every day, each a
     single click that opens the scene with the right span, speed, ratio, safe
     layout AND PLACE already applied, and starts recording. The scenes
     themselves are in the motion bundle on the chart page; what this file
     contributes is the decision about which five, and the settings that make
     each one land between ten and thirty seconds.

     NCard — a card renderer built from SLOTS rather than from one fixed
     layout. studio.js has a card of its own with a layout chosen for one kind
     of content; this is the general case, where the reader decides what goes
     on and in what order. Everything is measured before anything is placed, so
     a card with two slots and a card with nine are both composed rather than
     stacked from the top with whatever falls off the bottom.

     The composer — the slot list as an editable thing, with recipes that fill
     it. A recipe is not a template the reader is stuck inside: it writes slots,
     and every slot it wrote can then be edited, moved or removed. That is the
     difference between "choose one of five designs" and "here is a good
     starting point for the design you are making".

   ON THE STAR WHEEL. The wheel on the chart page is SVG. Rasterising an SVG
   into a canvas taints it over file://, and this site must work from a folder
   on a laptop with no server, so a tainted canvas would mean no download at
   all. The geometry is already shared — swProject, swRingPath and the rest are
   exported from engine.js, not from the chart bundle — so the canvas wheel here
   is the same projection drawn with a different pen, not a second model of the
   sky that could drift away from the first. */

(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };

  /* ===== the palette, which is the Studio card's own ======================= */
  var PAL = {
    navy: "#141a33", navy2: "#232a4d", gold: "#c9a24b", pale: "#e7d19a",
    ink: "#f4f2ea", dim: "#9aa0c0", line: "rgba(201,162,75,0.5)",
    ben: "#6fcf97", mal: "#e0785f", star: "#ffe9a8"
  };
  var SANS = '"Inter","Helvetica Neue",system-ui,-apple-system,sans-serif';
  var SERIF = '"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif';
  var RATIOS = {
    "4:5": { w: 1080, h: 1350, label: "Feed post 4:5" },
    "1:1": { w: 1080, h: 1080, label: "Square 1:1" },
    "9:16": { w: 1080, h: 1920, label: "Story / Reel 9:16" }
  };
  /* Instagram's own furniture, as the motion bundle measures it. A still posted
     to a Story loses the same strips a reel does. */
  var SAFE = { bottom: 0.18, right: 0.13, top: 0.07 };

  var NAK = ["Aśvinī", "Bharaṇī", "Kṛttikā", "Rohiṇī", "Mṛgaśira", "Ārdrā",
    "Punarvasu", "Puṣya", "Āśleṣā", "Maghā", "P.Phalgunī", "U.Phalgunī", "Hasta",
    "Citrā", "Svātī", "Viśākhā", "Anurādhā", "Jyeṣṭhā", "Mūla", "P.Āṣāḍhā",
    "U.Āṣāḍhā", "Śravaṇa", "Dhaniṣṭhā", "Śatabhiṣā", "P.Bhādra", "U.Bhādra", "Revatī"];
  var RASHI = ["Meṣa", "Vṛṣabha", "Mithuna", "Karka", "Siṃha", "Kanyā", "Tulā",
    "Vṛścika", "Dhanu", "Makara", "Kumbha", "Mīna"];
  var GL = { Sun: "Sū", Moon: "Ca", Mars: "Ma", Mercury: "Bu", Jupiter: "Gu",
             Venus: "Śu", Saturn: "Śa", Rahu: "Rā", Ketu: "Ke" };
  var BEN = { Jupiter: 1, Venus: 1, Mercury: 1, Moon: 1 };

  /* ===== NCard ============================================================= */
  var NCard = {};
  NCard.RATIOS = RATIOS;
  NCard.PAL = PAL;

  var MARK = null, MARK_TRIED = false;
  NCard.mark = function (cb) {
    if (MARK || MARK_TRIED) return cb(MARK);
    var im = new Image();
    im.onload = function () { MARK = im; MARK_TRIED = true; cb(im); };
    im.onerror = function () { MARK_TRIED = true; cb(null); };
    im.src = "assets/brand/mark.svg";
  };

  function wrap(c, text, maxW) {
    var words = String(text == null ? "" : text).split(/\s+/), out = [], cur = "";
    for (var i = 0; i < words.length; i++) {
      var t = cur ? cur + " " + words[i] : words[i];
      if (c.measureText(t).width > maxW && cur) { out.push(cur); cur = words[i]; }
      else cur = t;
    }
    if (cur) out.push(cur);
    return out;
  }
  NCard.wrap = wrap;

  /* A size at which this string fits one line, or the size unchanged if it
     already does. Used where a headline must not wrap however long it is. */
  function fitOne(c, text, size, maxW, font) {
    for (var i = 0; i < 20; i++) {
      c.font = font(Math.round(size));
      if (c.measureText(text).width <= maxW) break;
      size *= 0.95;
    }
    return size;
  }

  /* ===== the frame ========================================================= */
  NCard.frame = function (c, W, H, o) {
    o = o || {};
    var g = c.createLinearGradient(0, 0, W * 0.4, H);
    g.addColorStop(0, PAL.navy2); g.addColorStop(1, PAL.navy);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    /* a fixed starfield, seeded by index — a field that reshuffles reads as noise */
    c.fillStyle = "rgba(255,255,255,0.5)";
    for (var i = 0; i < 54; i++) {
      c.globalAlpha = 0.22 + (i % 5) * 0.12;
      c.beginPath();
      c.arc((i * 97.13 % W), (i * 211.7 % H), (i % 3) * 0.6 + 0.7, 0, 7);
      c.fill();
    }
    c.globalAlpha = 1;
    c.fillStyle = PAL.gold; c.fillRect(0, H - 10, W, 10);
  };

  /* ===== the foot: mark, place, promise, handle ============================ */
  NCard.foot = function (c, W, H, o) {
    o = o || {};
    var pad = o.pad, mk = W * 0.082, fx = pad, fy = H - W * 0.155;
    if (MARK) { try { c.drawImage(MARK, fx, fy, mk, mk); } catch (e) {} }
    var tx = fx + mk + W * 0.022;
    c.textAlign = "left";
    c.font = "600 " + Math.round(W * 0.030) + "px " + SANS;
    c.fillStyle = PAL.ink;
    c.fillText(o.place || "", tx, fy + mk * 0.42);
    c.font = "500 " + Math.round(W * 0.024) + "px " + SANS;
    c.fillStyle = PAL.dim;
    c.fillText(o.hi ? "ब्राउज़र में गणना — कुछ भी भेजा नहीं जाता"
                    : "computed in the browser · nothing is sent anywhere",
               tx, fy + mk * 0.86);
    c.textAlign = "right";
    c.fillStyle = PAL.pale;
    c.font = "600 " + Math.round(W * 0.030) + "px " + SANS;
    c.fillText("@Nirayana.Soft", W - (o.padR || pad), fy + mk * 0.42);
    c.textAlign = "left";
  };

  /* ===== the moon, drawn as a terminator ellipse ===========================
     A crescent clipped out of a circle gets its inner edge wrong, and the eye
     catches it every time. The lit region is half a disc plus half an ellipse
     whose semi-axis follows the illuminated fraction and goes negative for a
     crescent, which is what turns the inner edge the right way round. */
  NCard.phase = function (c, x, y, r, elongDeg) {
    var e = ((elongDeg % 360) + 360) % 360;
    var k = (1 - Math.cos(e * Math.PI / 180)) / 2;
    var waxing = e < 180;
    c.save();
    c.beginPath(); c.arc(x, y, r, 0, 6.2832);
    c.fillStyle = "rgba(255,255,255,0.08)"; c.fill();
    c.strokeStyle = PAL.dim; c.lineWidth = Math.max(1, r * 0.04); c.stroke();
    c.beginPath();
    c.arc(x, y, r, -Math.PI / 2, Math.PI / 2, !waxing);
    c.ellipse(x, y, Math.abs(r * (2 * k - 1)), r, 0, Math.PI / 2, -Math.PI / 2,
              (2 * k - 1) > 0 ? !waxing : waxing);
    c.closePath();
    c.fillStyle = PAL.ink; c.fill();
    c.restore();
  };

  /* ===== the star wheel, on canvas ========================================= */
  /* Returns null rather than throwing when the engine is not there: a card
     missing its wheel should still be a card. */
  NCard.sky = function (ms, P) {
    if (!window.quickSky) return null;
    var d = new Date(ms);
    var ut = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
    try {
      return window.quickSky({
        year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
        hour: ut, minute: 0, second: 0, tzHours: 0,
        lat: P.lat, lon: P.lon, ayanamsa: "lahiri"
      });
    } catch (e) { return null; }
  };

  /* How tall the projected disc actually is, as a multiple of R.

     The ecliptic is a circle tilted away from the viewer, so its height on
     screen is R·cos(tilt) above the centre and the same below — in principle.
     In practice the tilt constant lives in engine.js and the glyph ring sits at
     a smaller radius with discs of its own, so the honest way to reserve space
     for this slot is to ask the projection, not to reason about it. Reasoning
     about it is what left a third of the slot empty: the block was centred on a
     height no ink ever reached, so the whole card sat too high with a band of
     nothing above the foot.

     Measured once — it depends only on the tilt, which is a constant. */
  var WHEEL_K = null;
  function wheelExtent() {
    if (WHEEL_K != null) return WHEEL_K;
    if (!window.swProject) return 1.16;
    var lo = 0, hi = 0;
    for (var i = 0; i < 180; i++) {
      var p = window.swProject(i * 2, 0, 0, 1000, 0, 0, window.SW_TILT_DEG);
      if (p.y < lo) lo = p.y;
      if (p.y > hi) hi = p.y;
    }
    /* plus the glyph ring, which can stand a little proud of the band */
    WHEEL_K = (hi - lo) / 1000 + 0.14;
    return WHEEL_K;
  }
  NCard.wheelExtent = wheelExtent;

  NCard.wheel = function (c, cx, cy, R, sky, o) {
    o = o || {};
    if (!sky || !window.swProject) return;
    var lag = sky.lagna, T = window.SW_TILT_DEG;
    function pt(lon, beta, r) { return window.swProject(lon, lag, beta || 0, r, cx, cy, T); }

    /* the rāśi band, drawn as twelve wedges so the alternation reads */
    function band(l0, l1, rIn, rOut, fill, stroke) {
      var n = 14, i, p;
      c.beginPath();
      for (i = 0; i <= n; i++) {
        p = pt(l0 + (l1 - l0) * (i / n), 0, rOut);
        if (i === 0) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y);
      }
      for (i = n; i >= 0; i--) {
        p = pt(l0 + (l1 - l0) * (i / n), 0, rIn);
        c.lineTo(p.x, p.y);
      }
      c.closePath();
      if (fill) { c.fillStyle = fill; c.fill(); }
      if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1; c.stroke(); }
    }
    var rNakIn = R * 0.80, rNakOut = R * 0.92, rRasIn = R * 0.92, rRasOut = R;
    for (var k = 0; k < 27; k++)
      band(k * (40 / 3), (k + 1) * (40 / 3), rNakIn, rNakOut,
           k % 2 ? "rgba(17,26,52,0.85)" : "rgba(13,21,41,0.85)", "rgba(38,50,90,0.9)");
    for (var s = 0; s < 12; s++)
      band(s * 30, (s + 1) * 30, rRasIn, rRasOut,
           s % 2 ? "rgba(28,39,72,0.9)" : "rgba(22,32,60,0.9)", "rgba(49,64,110,0.95)");

    /* the ecliptic itself */
    c.beginPath();
    for (var i2 = 0; i2 <= 200; i2++) {
      var p2 = pt(lag - (i2 / 200) * 360, 0, rRasIn);
      if (i2 === 0) c.moveTo(p2.x, p2.y); else c.lineTo(p2.x, p2.y);
    }
    c.closePath();
    c.strokeStyle = "rgba(122,103,51,0.9)"; c.lineWidth = Math.max(1.5, R * 0.006);
    c.stroke();

    /* the horizon: the fixed thing, drawn across the disc at the east and west
       points, which is where phi = 0 and phi = 180 land by construction */
    var e0 = pt(lag, 0, rRasOut), w0 = pt(lag + 180, 0, rRasOut);
    c.strokeStyle = "rgba(99,120,140,0.95)";
    c.lineWidth = Math.max(1.5, R * 0.007);
    c.beginPath(); c.moveTo(e0.x, e0.y); c.lineTo(w0.x, w0.y); c.stroke();

    /* rāśi names, where there is room for them */
    if (o.labels !== false) {
      c.textAlign = "center"; c.textBaseline = "middle";
      for (var s2 = 0; s2 < 12; s2++) {
        var q = pt(s2 * 30 + 15, 0, (rRasIn + rRasOut) / 2);
        var f = Math.max(9, R * 0.052 * q.scale);
        c.font = "600 " + Math.round(f) + "px " + SANS;
        c.fillStyle = q.above ? PAL.dim : "rgba(154,160,192,0.45)";
        c.fillText(RASHI[s2], q.x, q.y);
      }
    }

    /* the yogatārās, which are what a nakṣatra is named after */
    if (o.stars !== false && window.YOGATARAS) {
      window.YOGATARAS.forEach(function (st) {
        var lon = st.lon != null ? st.lon : st.sid;
        if (lon == null) return;
        var q = pt(lon, st.lat || st.beta || 0, rNakIn * 0.985);
        c.globalAlpha = q.above ? 0.95 : 0.35;
        c.fillStyle = PAL.star;
        c.beginPath(); c.arc(q.x, q.y, Math.max(1.2, R * 0.009 * q.scale), 0, 6.2832);
        c.fill();
        c.globalAlpha = 1;
      });
    }

    /* the grahas, each at its own ecliptic latitude so two a degree apart in
       longitude are still told apart */
    var put = [];
    (sky.planets || []).forEach(function (pl) {
      var q = pt(pl.sid, pl.lat || 0, rNakIn * 0.86);
      var r = Math.max(7, R * 0.055 * q.scale);
      /* nudged outward from the centre when it would sit on a neighbour */
      for (var a = 0; a < 12; a++) {
        var clash = false;
        for (var j = 0; j < put.length; j++)
          if (Math.hypot(put[j][0] - q.x, put[j][1] - q.y) < r * 1.85) { clash = true; break; }
        if (!clash) break;
        var th = Math.atan2(q.y - cy, q.x - cx) || a;
        q = { x: q.x + Math.cos(th) * r * 0.8, y: q.y + Math.sin(th) * r * 0.8,
              scale: q.scale, above: q.above };
      }
      put.push([q.x, q.y]);
      var col = (pl.en === "Rahu" || pl.en === "Ketu") ? PAL.dim
              : (BEN[pl.en] ? PAL.ben : PAL.mal);
      c.globalAlpha = q.above ? 1 : 0.45;
      c.save(); c.shadowColor = col; c.shadowBlur = r * 1.6;
      c.fillStyle = PAL.navy; c.beginPath(); c.arc(q.x, q.y, r, 0, 6.2832); c.fill();
      c.restore();
      c.strokeStyle = col; c.lineWidth = Math.max(1.5, r * 0.16);
      c.beginPath(); c.arc(q.x, q.y, r, 0, 6.2832); c.stroke();
      c.textAlign = "center"; c.textBaseline = "middle";
      c.font = "700 " + Math.round(r * 0.95) + "px " + SANS;
      c.fillStyle = PAL.ink;
      c.fillText(GL[pl.en] || pl.en, q.x, q.y);
      c.globalAlpha = 1;
    });

    /* the lagna, on the eastern horizon by construction — which is the whole
       invariant this projection rests on, so it is marked */
    if (o.lagna !== false) {
      var L = pt(lag, 0, rRasOut);
      c.save(); c.shadowColor = PAL.gold; c.shadowBlur = R * 0.05;
      c.fillStyle = PAL.gold;
      c.beginPath(); c.arc(L.x, L.y, Math.max(3, R * 0.018), 0, 6.2832); c.fill();
      c.restore();
      c.textAlign = "right"; c.textBaseline = "middle";
      c.font = "600 " + Math.round(R * 0.048) + "px " + SANS;
      c.fillStyle = PAL.gold;
      c.fillText(o.hi ? "लग्न" : "lagna", L.x - R * 0.035, L.y);
    }
    c.textAlign = "left"; c.textBaseline = "alphabetic";
  };

  /* ===== slots =============================================================
     Each slot knows how tall it is before anything is drawn, so the whole block
     can be centred in the space the frame leaves. Measuring and drawing are the
     same function with a `draw` flag, which is the only way they cannot drift
     apart — two functions would, the first time a slot changed. */
  var SLOTS = {
    kicker: {
      label: "Kicker", hint: "small line at the top — brand, date, section",
      fields: [["text", "Text", "NIRAYANA · 18 OCT 2026"]],
      run: function (c, S, s, draw) {
        var f = S.u * 0.030;
        if (draw) {
          c.font = "600 " + Math.round(f) + "px " + SANS;
          c.fillStyle = PAL.pale;
          c.fillText(s.text || "", S.pad, S.y + f * 0.8);
        }
        return f * 1.5;
      }
    },
    headline: {
      label: "Headline", hint: "the big line — keep it to a few words",
      fields: [["text", "Text", "One tithi, two sunrises"]],
      run: function (c, S, s, draw) {
        var size = S.u * 0.098, lines;
        for (var k = 0; k < 24; k++) {
          c.font = "600 " + Math.round(size) + "px " + SERIF;
          lines = wrap(c, s.text || "", S.inner);
          if (lines.length <= 3) break;
          size *= 0.93;
        }
        if (draw) {
          c.fillStyle = PAL.ink; var y = S.y;
          lines.forEach(function (ln) { y += size * 1.06; c.fillText(ln, S.pad, y); });
        }
        return lines.length * size * 1.06 + S.u * 0.012;
      }
    },
    sub: {
      label: "Subtitle", hint: "one gold line under the headline",
      fields: [["text", "Text", "a tithi is 12° of elongation, not a day"]],
      run: function (c, S, s, draw) {
        var f = S.u * 0.040;
        c.font = "500 " + Math.round(f) + "px " + SANS;
        var lines = wrap(c, s.text || "", S.inner).slice(0, 2);
        if (draw) {
          c.fillStyle = PAL.gold; var y = S.y;
          lines.forEach(function (ln) { y += f * 1.25; c.fillText(ln, S.pad, y); });
        }
        return lines.length * f * 1.25 + S.u * 0.015;
      }
    },
    pill: {
      label: "Pill", hint: "a rounded chip — a label, a pakṣa, a tag",
      fields: [["text", "Text", "Śukla Daśamī"]],
      run: function (c, S, s, draw) {
        var f = S.u * 0.032, padx = f * 0.85, h = f * 2.1;
        c.font = "600 " + Math.round(f) + "px " + SANS;
        var w = c.measureText(s.text || "").width + padx * 2;
        if (draw) {
          var y = S.y + f * 0.3, r = h / 2;
          c.beginPath();
          if (c.roundRect) c.roundRect(S.pad, y, w, h, r);
          else {
            c.moveTo(S.pad + r, y); c.lineTo(S.pad + w - r, y);
            c.arc(S.pad + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
            c.lineTo(S.pad + r, y + h); c.arc(S.pad + r, y + r, r, Math.PI / 2, -Math.PI / 2);
          }
          c.closePath();
          c.fillStyle = "rgba(201,162,75,0.16)"; c.fill();
          c.strokeStyle = PAL.gold; c.lineWidth = Math.max(1.5, S.u * 0.002); c.stroke();
          c.fillStyle = PAL.pale; c.textBaseline = "middle";
          c.fillText(s.text || "", S.pad + padx, y + h / 2);
          c.textBaseline = "alphabetic";
        }
        return h + S.u * 0.030;
      }
    },
    rule: {
      label: "Divider", hint: "a thin gold rule",
      fields: [],
      run: function (c, S, s, draw) {
        if (draw) { c.fillStyle = PAL.line; c.fillRect(S.pad, S.y + S.u * 0.018, S.inner, 2); }
        return S.u * 0.046;
      }
    },
    facts: {
      label: "Facts", hint: "label: value, one per line",
      fields: [["text", "Lines", "Sunrise: 06:24\nTithi: Śukla Daśamī\nNakṣatra: Śravaṇa"]],
      run: function (c, S, s, draw) {
        var rows = String(s.text || "").split("\n").filter(function (t) { return t.trim(); });
        var f = Math.round(S.u * 0.034), y = S.y;
        rows.forEach(function (t) {
          var parts = String(t).split(/:\s(.+)/);
          y += f * 1.25;
          if (draw) {
            c.font = "600 " + f + "px " + SANS; c.fillStyle = PAL.dim;
            c.fillText(parts[0], S.pad, y);
            var lw = c.measureText(parts[0] + "   ").width;
            c.font = "500 " + f + "px " + SANS; c.fillStyle = PAL.ink;
            wrap(c, parts[1] || "", S.inner - lw).slice(0, 2).forEach(function (ln, j) {
              c.fillText(ln, S.pad + lw, y + j * f * 1.2);
            });
          }
          y += f * 0.70;
        });
        /* the trailing gap after the last row is already in the loop, so it is
           not added again here — counting it twice tilted the whole block up */
        return rows.length * f * 1.95;
      }
    },
    moon: {
      label: "Moon", hint: "the phase as it actually is, with a line beside it",
      fields: [["text", "Caption", "Śukla pakṣa · waxing"]],
      run: function (c, S, s, draw) {
        var r = S.u * 0.075, h = r * 2.2;
        if (draw) {
          NCard.phase(c, S.pad + r, S.y + r * 1.1, r,
                      s.elong != null ? s.elong : (S.ctx.elong || 0));
          c.font = "600 " + Math.round(S.u * 0.034) + "px " + SANS;
          c.fillStyle = PAL.ink; c.textBaseline = "middle";
          c.fillText(s.text || "", S.pad + r * 2.5, S.y + r * 1.1);
          c.textBaseline = "alphabetic";
        }
        return h + S.u * 0.022;
      }
    },
    wheel: {
      label: "Star wheel", hint: "the sky at this moment, as a tilted disc",
      fields: [["size", "Height", "0.42"]],
      run: function (c, S, s, draw) {
        /* a fraction of the room this card actually has, not of the frame:
           with Instagram's strips kept clear a 9:16 card loses a quarter of its
           height, and a wheel sized off the frame would eat what was left */
        var frac = Math.max(0.2, Math.min(0.6, parseFloat(s.size) || 0.42));
        var k = wheelExtent();
        var R = Math.min(S.inner * 0.52, S.room * frac / k);
        /* Reserved from what the wheel DRAWS, not from what it was allotted.
           The ecliptic is a disc tilted 58° away from the viewer, so its height
           from the projection itself, so the slot reserves what it draws. */
        var h = R * k;
        if (draw) NCard.wheel(c, S.W / 2, S.y + h * 0.50, R, S.ctx.sky, { hi: S.ctx.hi });
        return h;
      }
    },
    image: {
      label: "Your image", hint: "a PNG you add — a saved frame, a chart, anything",
      fields: [],
      run: function (c, S, s, draw) {
        var im = s._img;
        if (!im || !im.width) {
          if (draw) {
            c.font = "500 " + Math.round(S.u * 0.028) + "px " + SANS;
            c.fillStyle = PAL.dim;
            c.fillText("(choose a file for this slot)", S.pad, S.y + S.u * 0.05);
          }
          return S.u * 0.08;
        }
        var w = S.inner, h = w * (im.height / im.width);
        var cap = S.room * 0.52;
        if (h > cap) { h = cap; w = h * (im.width / im.height); }
        if (draw) { try { c.drawImage(im, S.W / 2 - w / 2, S.y, w, h); } catch (e) {} }
        return h + S.u * 0.030;
      }
    },
    space: {
      label: "Gap", hint: "breathing room",
      fields: [["size", "Height", "0.05"]],
      run: function (c, S, s) {
        return S.room * Math.max(0.01, Math.min(0.3, parseFloat(s.size) || 0.05));
      }
    }
  };
  NCard.SLOTS = SLOTS;

  /* ===== render ============================================================ */
  NCard.render = function (cv, spec) {
    var R = RATIOS[spec.ratio] || RATIOS["4:5"], W = R.w, H = R.h;
    cv.width = W; cv.height = H;
    var c = cv.getContext("2d");
    NCard.frame(c, W, H);

    var pad = W * 0.085;
    /* The right-hand column Instagram draws its buttons over, kept clear only
       when the reader asked for it — it is a fact about one platform. */
    var padR = spec.safe ? Math.max(pad, W * SAFE.right + W * 0.02) : pad;
    var topY = spec.safe ? H * SAFE.top + W * 0.03 : W * 0.075;
    var footTop = H - W * 0.20 - (spec.safe ? H * SAFE.bottom : 0);

    var room = footTop - topY;
    var S = { W: W, H: H, u: W, room: room, pad: pad, padR: padR,
              inner: W - pad - padR, y: 0, ctx: spec.ctx || {} };
    c.textAlign = "left"; c.textBaseline = "alphabetic";

    var slots = (spec.slots || []).filter(function (s) { return SLOTS[s.type]; });
    function measure() {
      var n = 0;
      slots.forEach(function (s) { S.y = 0; n += SLOTS[s.type].run(c, S, s, false); });
      return n;
    }
    /* Measured first, then placed: stacking from the top is how a card ends up
       with a third of itself empty and the handle printed over the last line.

       And measured AGAIN at a smaller type unit when the first pass does not
       fit. A card is a fixed rectangle with a variable amount of content in it,
       so something has to give, and type size is the thing a reader minds least
       — far less than a pañcāṅga block disappearing under the foot, which is
       what an overfull card did before and which looked deliberate. The floor
       is there because shrinking without limit turns an overfull card into an
       unreadable one, and at that point saying so is the honest answer — a
       star wheel and a pañcāṅga block genuinely do not both fit a square with
       a quarter of it reserved, and the useful reply to that is the name of a
       shape where they do. */
    var need = measure();
    if (need > room) {
      S.u = W * Math.max(0.62, room / need);
      need = measure();
    }
    var y = topY + Math.max(0, (room - need) / 2);
    slots.forEach(function (s) {
      S.y = y;
      y += SLOTS[s.type].run(c, S, s, true);
    });

    NCard.foot(c, W, H, { pad: pad, padR: padR, place: spec.place || "",
                          hi: spec.hi, });
    return { w: W, h: H, used: need, room: room, scale: S.u / W };
  };

  /* ===== a ZIP file, written here =========================================

     A carousel is eight images and a caption file. Handing those over as eight
     separate downloads means eight prompts, and Chrome stops obliging after
     the first few; handing them over as one archive means one click and a
     folder. There is no library to do that, and there will not be: this site
     loads nothing from anywhere.

     So: a minimal ZIP writer. Entries are STORED, not deflated — a PNG is
     already compressed and deflating it again would cost code and save
     nothing. That leaves the format almost trivial: a local header before each
     file, a central directory after them all, and a CRC-32 of each payload.

     The CRC table is built once on first use rather than written out, because
     256 constants typed by hand is 256 chances to be wrong, and the whole file
     is worthless if one of them is. Verified by writing an archive here and
     opening it with a real unzip implementation. */
  var CRC_T = null;
  function crc32(buf) {
    if (!CRC_T) {
      CRC_T = new Int32Array(256);
      for (var n = 0; n < 256; n++) {
        var c = n;
        for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        CRC_T[n] = c;
      }
    }
    var crc = -1;
    for (var i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ CRC_T[(crc ^ buf[i]) & 0xFF];
    return (crc ^ -1) >>> 0;
  }
  function dosTime(d) {
    return ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF;
  }
  function dosDate(d) {
    return (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;
  }
  /* files: [{name, data: Uint8Array}] → Blob */
  NCard.zip = function (files) {
    var parts = [], central = [], offset = 0, now = new Date();
    var enc = new TextEncoder();
    files.forEach(function (f) {
      var name = enc.encode(f.name), data = f.data;
      var crc = crc32(data), t = dosTime(now), dt = dosDate(now);
      var lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true);     /* local file header */
      lh.setUint16(4, 20, true);             /* version needed */
      lh.setUint16(6, 0x0800, true);         /* UTF-8 names */
      lh.setUint16(8, 0, true);              /* stored */
      lh.setUint16(10, t, true); lh.setUint16(12, dt, true);
      lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true);
      lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), name, data);

      var cd = new DataView(new ArrayBuffer(46));
      cd.setUint32(0, 0x02014b50, true);     /* central directory header */
      cd.setUint16(4, 20, true); cd.setUint16(6, 20, true);
      cd.setUint16(8, 0x0800, true); cd.setUint16(10, 0, true);
      cd.setUint16(12, t, true); cd.setUint16(14, dt, true);
      cd.setUint32(16, crc, true);
      cd.setUint32(20, data.length, true); cd.setUint32(24, data.length, true);
      cd.setUint16(28, name.length, true);
      cd.setUint32(42, offset, true);
      central.push(new Uint8Array(cd.buffer), name);
      offset += 30 + name.length + data.length;
    });
    var cdSize = central.reduce(function (a, b) { return a + b.length; }, 0);
    var end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);      /* end of central directory */
    end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    return new Blob(parts.concat(central, [new Uint8Array(end.buffer)]),
                    { type: "application/zip" });
  };
  /* a canvas as raw PNG bytes, for the archive */
  NCard.pngBytes = function (cv) {
    return new Promise(function (res) {
      cv.toBlob(function (b) {
        if (!b) return res(null);
        var r = new FileReader();
        r.onload = function () { res(new Uint8Array(r.result)); };
        r.readAsArrayBuffer(b);
      }, "image/png");
    });
  };

  window.NCard = NCard;

  /* ======================================================================== */
  /* ===== the reel strip ==================================================== */
  /* ======================================================================== */

  /* Span and speed are chosen so the derived duration lands between ten and
     thirty seconds, which is where a reel holds attention and where Instagram
     stops treating it as a loop. The duration model is (12 + 6·log10 days) /
     speed, so the figures below are arithmetic, not taste. */
  var REELS = [
    { scene: "twotithi", span: "4d", speed: "1", secs: 16,
      title: "One tithi, two sunrises",
      why: "The single most misunderstood thing in a pañcāṅga, drawn instead of asserted: tithi bands of unequal length against sunrise lines that are not. It names the next adhika and the next kṣaya tithi for your place.",
      post: "Pin this one. It answers the comment you get every week." },
    { scene: "tonight", span: "1d", speed: "1", secs: 12,
      title: "The sky tonight",
      why: "Sunset to sunrise at your own place, every graha tracing its own arc across an all-sky disc. Different every single night, and the only one here that someone can walk outside and check.",
      post: "Post in the evening. It is the most shareable of the five." },
    { scene: "shadow", span: "1d", speed: "1", secs: 12,
      title: "The shadow stick",
      why: "A twelve-aṅgula śaṅku and its chāyā through today. The shortest shadow gives true north and local apparent noon; the akṣabhā gives your latitude. Siddhānta, not BPHS — and the frame says so.",
      post: "Pairs with a photo of an actual stick in actual sunlight." },
    { scene: "moondrift", span: "30d", speed: "1", secs: 21,
      title: "Why the Moon is late every day",
      why: "Thirty moonrises from today, each with the Moon's real phase on it, drifting later down the frame. The one day a month the Moon does not rise at all is the moment the chain visibly breaks.",
      post: "The drift is never the same two days running — that is the hook." },
    { scene: "solstice", span: "100y", speed: "1.5", secs: 26,
      title: "Where the solstice used to stand",
      why: "Five thousand years of precession against the twenty-seven nakṣatras. It computes the era the Vedāṅga Jyotiṣa describes rather than quoting it — and prints the uncertainty, because a quadratic ayanāṃśa run back to 3500 BCE is worth about a century either way.",
      post: "The one that gets argued with. Everything on it is checkable." },
    { scene: "wheels", span: "1y", speed: "1.15", secs: 24,
      title: "Where this moment sits",
      why: "A dive from the kalpa down to the day, each ring a cycle inside the one outside it, with how far through each one we stand. Fourteen manvantaras plus fifteen sandhis come to exactly one kalpa, and the build refuses to ship if they do not.",
      post: "Cosmic scale with a real number on every ring." },
    { scene: "venusrose", span: "8y", speed: "1.5", secs: 22,
      title: "The Venus rose",
      why: "Eight years of Śukra's elongation against the season, which closes into five petals because five synodic returns are within days of eight years. Morning star and evening star in two colours.",
      post: "The slowest to earn its shape and the one people replay." }
  ];

  function reelLink(r, place, ratio) {
    var q = "kundli.html#sky=" + encodeURIComponent(r.scene) +
            "&span=" + r.span + "&speed=" + encodeURIComponent(r.speed) +
            "&ratio=" + encodeURIComponent(ratio || "9:16") + "&safe=1";
    if (place) q += "&place=" + encodeURIComponent(
      [place.n, place.lat, place.lon, place.tz || 0].join("|"));
    return q;
  }

  function mountReels(S) {
    var host = $("streels"); if (!host) return;
    host.innerHTML = REELS.map(function (r, i) {
      return '<article class="strcard">' +
        '<header><span class="strno">' + (i + 1) + "</span><h3>" + esc(r.title) +
          '</h3><span class="strsec">' + r.secs + " s</span></header>" +
        "<p>" + esc(r.why) + "</p>" +
        '<p class="strpost">' + esc(r.post) + "</p>" +
        '<div class="stact">' +
          '<a class="stbtn" data-strrec="' + i + '" href="' +
            reelLink(r, S.place, "9:16") + '">Make the video</a>' +
          '<a class="stbtn sec" data-stropen="' + i + '" href="' +
            reelLink(r, S.place, "9:16").replace("&safe=1", "&safe=1") +
            '">Open without recording</a>' +
        "</div>" +
      "</article>";
    }).join("");
    /* The recording link carries rec=1; the other does not. Written here rather
       than in the markup above so the two cannot drift apart. */
    host.querySelectorAll("[data-strrec]").forEach(function (a) {
      a.setAttribute("href", a.getAttribute("href") + "&rec=1");
    });
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch];
    });
  }

  /* ======================================================================== */
  /* ===== the composer ====================================================== */
  /* ======================================================================== */

  /* A carousel is the format that earns saves, so the composer holds SLIDES
     and `slots` is simply whichever one is being edited. Keeping `slots` as a
     live reference into `slides` rather than an index means every function
     that edits a card carries on working unchanged. */
  var C = { ratio: "4:5", safe: false, slides: [[]], slide: 0, slots: [], ctx: {} };
  function useSlide(i) {
    C.slide = Math.max(0, Math.min(C.slides.length - 1, i));
    C.slots = C.slides[C.slide];
  }

  /* Recipes write slots. They are a starting point, not a cage: everything a
     recipe produces can then be edited, reordered or thrown away, which is the
     difference between picking a design and making one. */
  function recipes(D, S) {
    var P = S.place, hi = S.lang === "hi";
    var tithi = D ? ((D.at.tithi.paksha === "śukla" ? "Śukla " : "Kṛṣṇa ") +
                     D.at.tithi.name) : "";
    var dateline = D ? fmtDate(D.sunrise, P.tz) : "";
    var masa = D ? (D.masa.amantaIAST || D.masa.amanta) : "";
    function hhmm(ms) {
      if (ms == null) return "—";
      var d = new Date(ms + (P.tz || 0) * 3600000);
      return String(d.getUTCHours()).padStart(2, "0") + ":" +
             String(d.getUTCMinutes()).padStart(2, "0");
    }
    return [
      { key: "sky", name: "The sky at this moment", ratio: "9:16",
        blurb: "The star wheel on top, the date small, the event large, then the " +
               "Moon and the month, a pill, and the pañcāṅga block under it. This " +
               "is the one to use for a festival, a birth, or any dated moment.",
        make: function () {
          return [
            { type: "wheel", size: "0.42" },
            { type: "kicker", text: dateline.toUpperCase() },
            { type: "headline", text: "Name this moment" },
            { type: "moon", text: masa + " · " + tithi },
            { type: "pill", text: D ? D.vara + " · " + D.masa.ritu : "" },
            { type: "rule" },
            { type: "facts", text: D ? [
                "Sunrise: " + hhmm(D.sunrise),
                "Sunset: " + hhmm(D.sunset),
                "Nakṣatra: " + D.at.nak.name + " pāda " + D.at.nak.pada,
                "Yoga: " + D.at.yoga.name
              ].join("\n") : "" }
          ];
        } },
      { key: "panchanga", name: "Today's pañcāṅga",
        blurb: "The five limbs, plainly, with the month and the era. The card to " +
               "post every morning without thinking about it.",
        make: function () {
          return [
            { type: "kicker", text: (hi ? "निरयन" : "NIRAYANA") + " · " + dateline.toUpperCase() },
            { type: "headline", text: tithi },
            { type: "sub", text: masa + " · " + (D ? D.masa.ritu : "") },
            { type: "rule" },
            { type: "facts", text: D ? [
                "Vāra: " + D.vara,
                "Nakṣatra: " + D.at.nak.name + " pāda " + D.at.nak.pada,
                "Yoga: " + D.at.yoga.name,
                "Karaṇa: " + D.at.karana.name,
                "Sunrise: " + hhmm(D.sunrise),
                "Sunset: " + hhmm(D.sunset)
              ].join("\n") : "" },
            /* .vikrama, not the object — samvat() returns the Vikrama and
               Śaka years together with a note, and concatenating the whole
               thing printed "Vikrama [object Object]" on the card. */
            { type: "pill", text: D ? ("Vikrama " + D.samvat.vikrama) : "" }
          ];
        } },
      { key: "teach", name: "One rule, explained",
        blurb: "A headline that states a rule, a line that qualifies it, and the " +
               "numbers that make it checkable. The shape that travels furthest, " +
               "because it is the shape of something worth knowing.",
        make: function () {
          return [
            { type: "kicker", text: hi ? "नियम" : "THE RULE" },
            { type: "headline", text: "The tithi at sunrise is the tithi of the day" },
            { type: "sub", text: "which is why two cities can disagree about a date" },
            { type: "rule" },
            { type: "facts", text: "Span: 12° of Moon − Sun elongation\n" +
                "Length: 19 to 26 hours, never exactly a day\n" +
                "Adhika: two sunrises inside one tithi\n" +
                "Kṣaya: no sunrise inside it at all" },
            { type: "pill", text: "BPHS · pañcāṅga" }
          ];
        } },
      { key: "frame", name: "Your own image, framed",
        blurb: "A slot for a PNG you already have — a frame saved from an " +
               "animation, a chart export, a photograph — with the brand frame, " +
               "a headline and the handle around it.",
        make: function () {
          return [
            { type: "kicker", text: dateline.toUpperCase() },
            { type: "image" },
            { type: "headline", text: "Say what this is" },
            { type: "sub", text: "one line of context" }
          ];
        } },
      { key: "tarabala", name: "Tāra Bala today",
        blurb: "Which birth stars have an easy day and which a hard one, from " +
               "today's Moon. This is the card people check for themselves and " +
               "send to somebody else, which is the whole reason it is here. " +
               "Muhūrta tradition, not BPHS — and the card says so.",
        make: function () {
          var G = null;
          try { G = window.NP && D ? window.NP.taraGrid(D) : null; } catch (e) {}
          if (!G) return [{ type: "headline", text: "Tāra Bala" }];
          /* The nine tāras in groups of three stars each. Listing all 27 would
             not fit and would not be read; the hard ones and the best one are
             what anybody actually looks for. */
          function starsIn(name) {
            return G.rows.filter(function (r) { return r.tara && r.tara.name === name; })
                         .map(function (r) { return r.name; }).join(", ");
          }
          var hard = ["Vipat", "Pratyari", "Vadha"];
          var facts = [];
          hard.forEach(function (n) { facts.push(n + ": " + starsIn(n)); });
          facts.push("Ati-Mitra: " + starsIn("Ati-Mitra"));
          facts.push("Janma: " + starsIn("Janma"));
          return [
            { type: "kicker", text: dateline.toUpperCase() },
            { type: "headline", text: "Tāra Bala today" },
            { type: "sub", text: "counted from the Moon in " + G.todayName },
            { type: "rule" },
            { type: "facts", text: facts.join("\n") },
            { type: "pill", text: hi ? "मुहूर्त परम्परा — बृ.पा.हो.शा. नहीं"
                                     : "muhūrta tradition, not BPHS" }
          ];
        } },
      { key: "blank", name: "Empty",
        blurb: "Nothing but the frame and the foot. Build it slot by slot.",
        make: function () { return [{ type: "headline", text: "" }]; } }
    ];
  }

  function fmtDate(ms, tz) {
    var d = new Date(ms + (tz || 0) * 3600000);
    var M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return d.getUTCDate() + " " + M[d.getUTCMonth()] + " " + d.getUTCFullYear();
  }

  function mountComposer(S, D) {
    var host = $("stcompose"); if (!host) return;
    var RS = recipes(D, S);

    host.innerHTML =
      '<div class="stcbar">' +
        '<span class="stlab">Start from</span>' +
        '<select id="stcrecipe" class="stsel">' +
          RS.map(function (r) { return '<option value="' + r.key + '">' + esc(r.name) + "</option>"; }).join("") +
        "</select>" +
        '<span class="stlab">Shape</span>' +
        '<select id="stcratio" class="stsel">' +
          Object.keys(RATIOS).map(function (k) {
            return '<option value="' + k + '"' + (k === C.ratio ? " selected" : "") +
                   ">" + RATIOS[k].label + "</option>"; }).join("") +
        "</select>" +
        '<label class="stchk"><input type="checkbox" id="stcsafe"> Keep Instagram’s strips clear</label>' +
        '<button type="button" class="stbtn" id="stcsave">Download this slide</button>' +
        '<button type="button" class="stbtn sec" id="stczip">Download all slides (.zip)</button>' +
        '<button type="button" class="stbtn sec" id="stcall">All three shapes (.zip)</button>' +
        '<span class="stmsg" id="stcmsg"></span>' +
      "</div>" +
      '<div class="stslides" id="stcslides"></div>' +
      '<p class="stnote" id="stcblurb"></p>' +
      '<div class="stclayout">' +
        '<div class="stcslots"><div id="stcrows"></div>' +
          '<div class="stcadd"><select id="stcnew" class="stsel">' +
            Object.keys(SLOTS).map(function (k) {
              return '<option value="' + k + '">' + esc(SLOTS[k].label) + " — " +
                     esc(SLOTS[k].hint) + "</option>"; }).join("") +
          '</select><button type="button" class="stbtn sec" id="stcaddbtn">Add</button></div>' +
        "</div>" +
        '<div class="stcprev"><canvas id="stccv"></canvas></div>' +
      "</div>";

    function pickRecipe() {
      var k = $("stcrecipe").value;
      var r = RS.filter(function (x) { return x.key === k; })[0] || RS[0];
      C.slides = [r.make()]; useSlide(0);
      /* A recipe that was designed tall says so and gets the shape it was
         designed for. The sky card wants the wheel across the top half and a
         pañcāṅga block under it, which is a 9:16 idea; offered on a 4:5 card it
         simply ran out of room, and a preview showing the overflow tucked under
         the foot looks like a design rather than a fault. */
      if (r.ratio) {
        var rs = $("stcratio");
        if (rs && rs.value !== r.ratio) rs.value = r.ratio;
      }
      $("stcblurb").textContent = r.blurb;
      slideBar(); rows(); draw();
    }

    function slideBar() {
      var h = '<span class="stlab">Slides</span>';
      C.slides.forEach(function (_, i) {
        h += '<button type="button" class="stslide' + (i === C.slide ? " on" : "") +
             '" data-slide="' + i + '">' + (i + 1) + "</button>";
      });
      h += '<button type="button" class="stslide add" id="stcaddslide" ' +
           'title="Add a slide">+</button>';
      if (C.slides.length > 1)
        h += '<button type="button" class="stslide rm" id="stcdelslide" ' +
             'title="Remove this slide">\u00d7</button>';
      h += '<span class="stnote">' + C.slides.length +
           (C.slides.length === 1 ? " slide \u2014 add more for a carousel"
                                  : " slides \u2014 Instagram takes up to 10") + "</span>";
      $("stcslides").innerHTML = h;
      $("stcslides").querySelectorAll("[data-slide]").forEach(function (b) {
        b.addEventListener("click", function () {
          useSlide(+b.getAttribute("data-slide")); slideBar(); rows(); draw();
        });
      });
      $("stcaddslide").addEventListener("click", function () {
        /* A new slide starts from the current one rather than blank: a
           carousel is a set, and every slide after the first is usually the
           previous one with its text changed. */
        C.slides.splice(C.slide + 1, 0,
          C.slots.map(function (x) { var y = {}; for (var k in x) y[k] = x[k]; return y; }));
        useSlide(C.slide + 1); slideBar(); rows(); draw();
      });
      var del = $("stcdelslide");
      if (del) del.addEventListener("click", function () {
        C.slides.splice(C.slide, 1); useSlide(C.slide); slideBar(); rows(); draw();
      });
    }

    function rows() {
      $("stcrows").innerHTML = C.slots.map(function (s, i) {
        var def = SLOTS[s.type];
        return '<div class="stcrow" data-i="' + i + '">' +
          '<div class="stchead"><b>' + esc(def.label) + "</b>" +
            '<span class="stcmove">' +
              '<button type="button" data-up="' + i + '" title="Move up">↑</button>' +
              '<button type="button" data-dn="' + i + '" title="Move down">↓</button>' +
              '<button type="button" data-rm="' + i + '" title="Remove">×</button>' +
            "</span></div>" +
          def.fields.map(function (f) {
            var v = s[f[0]] != null ? s[f[0]] : "";
            if (f[0] === "text" && (s.type === "facts" || String(v).indexOf("\n") >= 0))
              return '<textarea data-f="' + f[0] + '" rows="4" placeholder="' +
                     esc(f[2]) + '">' + esc(v) + "</textarea>";
            return '<input data-f="' + f[0] + '" value="' + esc(v) +
                   '" placeholder="' + esc(f[2]) + '">';
          }).join("") +
          (s.type === "image"
            ? '<input type="file" accept="image/*" data-file="' + i + '">' : "") +
        "</div>";
      }).join("");

      $("stcrows").querySelectorAll("[data-f]").forEach(function (el) {
        el.addEventListener("input", function () {
          var i = +el.closest(".stcrow").getAttribute("data-i");
          C.slots[i][el.getAttribute("data-f")] = el.value;
          draw();
        });
      });
      $("stcrows").querySelectorAll("[data-up],[data-dn],[data-rm]").forEach(function (b) {
        b.addEventListener("click", function () {
          var up = b.getAttribute("data-up"), dn = b.getAttribute("data-dn"),
              rm = b.getAttribute("data-rm");
          var i = +(up != null ? up : dn != null ? dn : rm);
          if (rm != null) C.slots.splice(i, 1);
          else {
            var j = up != null ? i - 1 : i + 1;
            if (j < 0 || j >= C.slots.length) return;
            var t = C.slots[i]; C.slots[i] = C.slots[j]; C.slots[j] = t;
          }
          rows(); draw();
        });
      });
      /* A file chosen here is read with FileReader and never leaves the page —
         the same promise the foot of every card prints. */
      $("stcrows").querySelectorAll("[data-file]").forEach(function (inp) {
        inp.addEventListener("change", function () {
          var i = +inp.getAttribute("data-file"), f = inp.files && inp.files[0];
          if (!f) return;
          var rd = new FileReader();
          rd.onload = function () {
            var im = new Image();
            im.onload = function () { C.slots[i]._img = im; draw(); };
            im.src = rd.result;
          };
          rd.readAsDataURL(f);
        });
      });
    }

    var CV = null;
    function draw() {
      CV = CV || $("stccv");
      if (!CV) return;
      C.ratio = $("stcratio").value;
      C.safe = $("stcsafe").checked;
      NCard.mark(function () {
        var r = NCard.render(CV, {
          ratio: C.ratio, slots: C.slots, safe: C.safe,
          place: S.place.n, hi: S.lang === "hi", ctx: C.ctx
        });
        /* An overfull card is the one fault a preview hides, because the
           overflow lands under the foot and looks like a design choice. */
        var m = $("stcmsg");
        if (!m) return;
        if (r.used <= r.room) { m.textContent = ""; return; }
        /* Name the way out rather than the problem. A tall stack almost always
           wants a taller frame, and the reader is one control away from it. */
        var tall = C.ratio !== "9:16";
        m.textContent = tall
          ? "Taller than this shape — try Story / Reel 9:16, or remove a slot."
          : (C.safe
              ? "Taller than the card once Instagram\u2019s strips are kept clear — remove a slot."
              : "Taller than the card — remove a slot or shorten one.");
      });
    }

    /* Render one slide at one shape, off-screen, at full export size. */
    function renderSlide(slots, ratio) {
      var cv = document.createElement("canvas");
      NCard.render(cv, { ratio: ratio, slots: slots, safe: C.safe,
                         place: S.place.n, hi: S.lang === "hi", ctx: C.ctx });
      return cv;
    }
    function stamp() {
      var d = S.date;
      return d.y + "-" + String(d.m).padStart(2, "0") + "-" + String(d.d).padStart(2, "0");
    }
    function saveBlob(blob, name) {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    }
    /* Everything in one archive rather than one download per image. Chrome
       stops granting automatic downloads after the first few, so a nine-slide
       carousel handed over as nine files arrives as three. */
    function zipOut(entries, name, msg) {
      var m = $("stcmsg");
      if (m) m.textContent = "building\u2026";
      NCard.mark(function () {
        var jobs = entries.map(function (e) {
          return NCard.pngBytes(e.cv).then(function (d) {
            return { name: e.name, data: d };
          });
        });
        Promise.all(jobs).then(function (files) {
          files = files.filter(function (f) { return f.data; });
          if (msg) {
            var enc = new TextEncoder();
            files.push({ name: "captions.txt", data: enc.encode(msg) });
          }
          var z = NCard.zip(files);
          saveBlob(z, name);
          if (m) {
            m.textContent = files.length + " files \u00b7 " +
                            Math.round(z.size / 1048576 * 10) / 10 + " MB";
            setTimeout(function () { m.textContent = ""; }, 6000);
          }
        });
      });
    }

    $("stczip").addEventListener("click", function () {
      zipOut(C.slides.map(function (sl, i) {
        return { name: String(i + 1).padStart(2, "0") + "-slide." + "png",
                 cv: renderSlide(sl, C.ratio) };
      }), "nirayana-carousel-" + stamp() + "-" + C.ratio.replace(":", "x") + ".zip");
    });
    $("stcall").addEventListener("click", function () {
      var out = [];
      Object.keys(RATIOS).forEach(function (r) {
        C.slides.forEach(function (sl, i) {
          out.push({ name: r.replace(":", "x") + "/" + String(i + 1).padStart(2, "0") + "-slide.png",
                     cv: renderSlide(sl, r) });
        });
      });
      zipOut(out, "nirayana-card-" + stamp() + "-all-shapes.zip");
    });

    $("stcrecipe").addEventListener("change", pickRecipe);
    $("stcratio").addEventListener("change", draw);
    $("stcsafe").addEventListener("change", draw);
    $("stcaddbtn").addEventListener("click", function () {
      var t = $("stcnew").value, def = SLOTS[t], s = { type: t };
      def.fields.forEach(function (f) { s[f[0]] = f[2]; });
      C.slots.push(s); rows(); draw();
    });
    $("stcsave").addEventListener("click", function () {
      var cv = document.createElement("canvas");
      NCard.mark(function () {
        NCard.render(cv, { ratio: C.ratio, slots: C.slots, safe: C.safe,
                           place: S.place.n, hi: S.lang === "hi", ctx: C.ctx });
        cv.toBlob(function (b) {
          if (!b) { $("stcmsg").textContent = "the image could not be made"; return; }
          var a = document.createElement("a");
          a.href = URL.createObjectURL(b);
          a.download = "nirayana-card-" + stamp() + "-" +
                       (C.slides.length > 1 ? String(C.slide + 1).padStart(2, "0") + "-" : "") +
                       C.ratio.replace(":", "x") + ".png";
          document.body.appendChild(a); a.click();
          setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
          $("stcmsg").textContent = Math.round(b.size / 1024) + " KB";
          setTimeout(function () { $("stcmsg").textContent = ""; }, 4000);
        }, "image/png");
      });
    });

    /* The pack builds slides and then needs this composer to show them, but it
       is defined after this function runs. Publishing the two entry points it
       needs is cheaper and clearer than hoisting the whole composer. */
    useSlideExternal = function () { useSlide(0); };
    rebuildComposer = function () { slideBar(); rows(); draw(); };

    pickRecipe();
  }

  /* ======================================================================== */
  /* ===== the pack, and the month ========================================== */
  /* ======================================================================== */

  /* ONE CLICK, ONE DAY'S POSTING. The Studio could already say what was worth
     posting and draw a card for it. What it could not do was hand over the
     finished set, and the gap between "here is a good idea" and "here is the
     folder you drag into Instagram" is where a posting habit dies.

     The pack is a carousel built from what the day actually holds — the
     pañcāṅga, the best ideas the ranker found, the tāra bala grid — plus the
     captions in a text file and the reel settings written down. All of it in
     one archive, all of it computed, nothing from a template. */
  function packSlides(D, S, ideas) {
    var P = S.place, hi = S.lang === "hi";
    function hhmm(ms) {
      if (ms == null) return "\u2014";
      var d = new Date(ms + (P.tz || 0) * 3600000);
      return String(d.getUTCHours()).padStart(2, "0") + ":" +
             String(d.getUTCMinutes()).padStart(2, "0");
    }
    var dateline = fmtDate(D.sunrise, P.tz);
    var tithi = (D.at.tithi.paksha === "śukla" ? "Śukla " : "Kṛṣṇa ") + D.at.tithi.name;
    var masa = D.masa.amantaIAST || D.masa.amanta;
    var out = [];

    /* 1 — the cover: the day, named */
    out.push({ name: "cover", slots: [
      { type: "kicker", text: (hi ? "निरयन" : "NIRAYANA") + " \u00b7 " + dateline.toUpperCase() },
      { type: "headline", text: tithi },
      { type: "moon", text: masa + " \u00b7 " + D.vara },
      { type: "rule" },
      { type: "facts", text: [
          "Nakṣatra: " + D.at.nak.name + " pāda " + D.at.nak.pada,
          "Yoga: " + D.at.yoga.name,
          "Sunrise: " + hhmm(D.sunrise),
          "Sunset: " + hhmm(D.sunset)
        ].join("\n") },
      { type: "pill", text: hi ? ("विक्रम " + D.samvat.vikrama)
                             : ("Vikrama " + D.samvat.vikrama) }
    ] });

    /* 2 — the sky at midday, as a wheel */
    out.push({ name: "sky", slots: [
      { type: "wheel", size: "0.42" },
      { type: "kicker", text: (hi ? "मध्याह्न का आकाश" : "THE SKY AT MIDDAY") },
      { type: "headline", text: hi ? "आज का आकाश" : "Today's sky" },
      { type: "sub", text: P.n },
      { type: "rule" },
      { type: "facts", text: "Lagna at midday: computed in the browser\n" +
          "Moon: " + D.at.nak.name + "\nTithi: " + tithi }
    ] });

    /* 3 — the best idea the ranker found, as its own card */
    if (ideas && ideas.length) {
      var top = ideas[0];
      out.push({ name: "today", slots: [
        { type: "kicker", text: hi ? "आज क्या ख़ास है" : "WORTH SAYING TODAY" },
        { type: "headline", text: top.headline || top.hook },
        { type: "sub", text: top.sub || "" },
        { type: "rule" },
        { type: "facts", text: (top.facts || []).slice(0, 5).join("\n") }
      ] });
    }

    /* 4 — tāra bala, the slide people send to each other */
    var G = null;
    try { G = window.NP.taraGrid(D); } catch (e) {}
    if (G) {
      function starsIn(n) {
        return G.rows.filter(function (r) { return r.tara && r.tara.name === n; })
                     .map(function (r) { return r.name; }).join(", ");
      }
      out.push({ name: "tarabala", slots: [
        { type: "kicker", text: dateline.toUpperCase() },
        { type: "headline", text: hi ? "तारा बल" : "Tāra Bala today" },
        { type: "sub", text: (hi ? "चन्द्र " : "counted from the Moon in ") + G.todayName },
        { type: "rule" },
        { type: "facts", text: ["Vipat", "Pratyari", "Vadha", "Ati-Mitra"]
            .map(function (n) { return n + ": " + starsIn(n); }).join("\n") },
        { type: "pill", text: hi ? "मुहूर्त परम्परा" : "muhūrta tradition, not BPHS" }
      ] });
    }
    return out;
  }

  function packCaptions(D, S, ideas) {
    var L = [];
    L.push("NIRAYANA \u2014 " + fmtDate(D.sunrise, S.place.tz) + " \u00b7 " + S.place.n);
    L.push("");
    L.push("SLIDE 1 \u2014 the day");
    L.push((D.at.tithi.paksha === "śukla" ? "Śukla " : "Kṛṣṇa ") + D.at.tithi.name +
           " \u00b7 " + (D.masa.amantaIAST || D.masa.amanta) + " \u00b7 " + D.vara);
    L.push("");
    (ideas || []).slice(0, 3).forEach(function (idea, i) {
      L.push("IDEA " + (i + 1) + " \u2014 " + idea.hook);
      try { L.push(window.__stCaption(i)); } catch (e) {
        (idea.facts || []).forEach(function (f) { L.push("\u2022 " + f); });
      }
      L.push("");
    });
    L.push("REELS \u2014 open the Studio and use the strip; each link carries its own");
    L.push("span, speed, shape, safe layout and this place, and starts recording.");
    L.push("");
    L.push("Every figure above was computed in the browser for " + S.place.n + ".");
    L.push("Nothing was sent anywhere. @Nirayana.Soft");
    return L.join("\n");
  }

  function mountPack(S, D) {
    var host = $("stpack"); if (!host) return;
    host.innerHTML =
      '<div class="stcbar">' +
        '<button type="button" class="stbtn" id="stpackgo">Build today\u2019s pack (.zip)</button>' +
        '<span class="stlab">Shape</span>' +
        '<select id="stpackratio" class="stsel">' +
          Object.keys(RATIOS).map(function (k) {
            return '<option value="' + k + '"' + (k === "4:5" ? " selected" : "") +
                   ">" + RATIOS[k].label + "</option>"; }).join("") +
        "</select>" +
        '<label class="stchk"><input type="checkbox" id="stpacksafe"> Keep Instagram\u2019s strips clear</label>' +
        '<button type="button" class="stbtn sec" id="stpackedit">Open it in the composer</button>' +
        '<span class="stmsg" id="stpackmsg"></span>' +
      "</div>" +
      '<div id="stplan" class="stplan"></div>';

    function build(toComposer) {
      var ideas = window.__stIdeas || [];
      var slides = packSlides(D, S, ideas);
      if (toComposer) {
        C.slides = slides.map(function (x) { return x.slots; });
        useSlideExternal();
        var sel = $("stcrecipe"); if (sel) sel.value = "blank";
        $("stcblurb").textContent = "Today's pack, opened for editing \u2014 " +
          slides.length + " slides, every one computed for " + S.place.n + ".";
        rebuildComposer();
        host.scrollIntoView ? $("stcompose").scrollIntoView({ behavior: "smooth", block: "start" }) : 0;
        return;
      }
      var ratio = $("stpackratio").value, safe = $("stpacksafe").checked;
      var msg = $("stpackmsg");
      msg.textContent = "building\u2026";
      NCard.mark(function () {
        var jobs = slides.map(function (sl, i) {
          var cv = document.createElement("canvas");
          NCard.render(cv, { ratio: ratio, slots: sl.slots, safe: safe,
                             place: S.place.n, hi: S.lang === "hi", ctx: C.ctx });
          return NCard.pngBytes(cv).then(function (d) {
            return { name: String(i + 1).padStart(2, "0") + "-" + sl.name + ".png", data: d };
          });
        });
        Promise.all(jobs).then(function (files) {
          files = files.filter(function (f) { return f.data; });
          files.push({ name: "captions.txt",
                       data: new TextEncoder().encode(packCaptions(D, S, ideas)) });
          var z = NCard.zip(files);
          var d = S.date;
          var a = document.createElement("a");
          a.href = URL.createObjectURL(z);
          a.download = "nirayana-pack-" + d.y + "-" + String(d.m).padStart(2, "0") +
                       "-" + String(d.d).padStart(2, "0") + ".zip";
          document.body.appendChild(a); a.click();
          setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
          msg.textContent = files.length + " files \u00b7 " +
                            Math.round(z.size / 1048576 * 10) / 10 + " MB";
          setTimeout(function () { msg.textContent = ""; }, 6000);
        });
      });
    }
    /* The pack's slides are checkable as text before they are drawn, which is
       the only place a canvas card can be checked at all. */
    window.__ncPackSlides = function () { return packSlides(D, S, window.__stIdeas || []); };
    $("stpackgo").addEventListener("click", function () { build(false); });
    $("stpackedit").addEventListener("click", function () { build(true); });
    drawPlan(S);
  }

  /* THE MONTH AHEAD. The ranker already decides what is worth posting on a
     given day; run it forward and the question "what do I post on the 14th"
     has an answer before the 14th. Computed on demand rather than on load,
     because thirty days of ephemeris is a second of work and most visits to
     this page do not want it. */
  function drawPlan(S) {
    var host = $("stplan"); if (!host) return;
    host.innerHTML = '<button type="button" class="stbtn sec" id="stplango">' +
      "Plan the next 30 days</button>" +
      '<p class="stnote">What the ranker would pick for each day, so a month ' +
      "can be scheduled in one sitting. Each row opens that day in the Studio.</p>";
    $("stplango").addEventListener("click", function () {
      host.innerHTML = '<p class="stnote">Reading thirty days of sky\u2026</p>';
      setTimeout(function () {
        var rows = [], NP = window.NP;
        for (var i = 0; i < 30; i++) {
          var base = new Date(Date.UTC(S.date.y, S.date.m - 1, S.date.d) + i * 86400000);
          var D = NP.dayOfDate(base.getUTCFullYear(), base.getUTCMonth() + 1,
                               base.getUTCDate(), S.place, { ends: true, month: true });
          if (!D) continue;
          var ev = [];
          try { ev = NP.scanEvents(D.sunrise - 86400000, D.sunrise + 86400000, {}); } catch (e) {}
          var ideas = [];
          try { ideas = window.__stIdeasFor ? window.__stIdeasFor(D, ev) : []; } catch (e) {}
          var best = ideas[0];
          rows.push({
            d: base, D: D,
            tithi: (D.at.tithi.paksha === "śukla" ? "Śu " : "Kṛ ") + D.at.tithi.name,
            nak: D.at.nak.name,
            hook: best ? best.hook : "pañcāṅga of the day",
            scene: best && best.rec ? best.rec.scene : null
          });
        }
        host.innerHTML = '<table class="stahead stplantab"><tbody>' + rows.map(function (r) {
          var ds = r.d.getUTCDate() + " " +
            ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][r.d.getUTCMonth()];
          var wd = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][r.d.getUTCDay()];
          return '<tr><td class="stpd">' + esc(wd + " " + ds) + "</td>" +
                 "<td>" + esc(r.tithi) + "</td><td>" + esc(r.nak) + "</td>" +
                 '<td class="stph">' + esc(r.hook) + "</td>" +
                 "<td>" + (r.scene ? '<a class="stbtn sec" href="' +
                    reelLink({ scene: r.scene, span: "1y", speed: "1", secs: 0 },
                             S.place, "9:16") + '">reel</a>' : "") + "</td></tr>";
        }).join("") + "</tbody></table>" +
        '<p class="stnote">' + rows.length + " days planned for " + esc(S.place.n) +
        ". The hook is what the ranker would lead with; change the date above to " +
        "build that day's pack.</p>";
      }, 30);
    });
  }

  /* Hooks the pack uses to drive the composer that was built before it. */
  var useSlideExternal = function () {}, rebuildComposer = function () {};

  /* ===== start ============================================================= */
  /* Driven by the Studio's own state and redrawn when it changes, so the place
     and date controls at the top of the page govern these sections too — which
     is the whole reason they are on this page rather than on their own. */
  function go() {
    if (!window.__stState || !window.NP) return;
    var S = window.__stState();
    if (!S.place || !S.date) return;
    var D = null;
    try {
      D = window.NP.dayOfDate(S.date.y, S.date.m, S.date.d, S.place,
                              { ends: true, month: true });
    } catch (e) {}
    C.ctx.hi = S.lang === "hi";
    if (D) {
      C.ctx.elong = D.elongation;
      C.ctx.sky = NCard.sky(D.sunrise + (D.sunset != null
        ? (D.sunset - D.sunrise) / 2 : 6 * 3600000), S.place);
    }
    mountReels(S);
    mountComposer(S, D);
    if (D) mountPack(S, D);
  }
  window.__ncRefresh = go;

  function boot() {
    if (!$("streels") && !$("stcompose")) return;
    /* The Studio builds itself first; these sections read its state, so they
       wait for it rather than racing it. */
    var tries = 0;
    (function wait() {
      if (window.__stState && window.NP && window.__stState().place) return go();
      if (tries++ > 200) return;
      setTimeout(wait, 60);
    })();
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
