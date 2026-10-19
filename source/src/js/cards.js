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

  /* The mark comes from NMark, which carries it as a data: URI rather than
     fetching assets/brand/mark.svg. Fetching it taints the canvas when the
     page is opened as a local file — see brand-mark.js — and a tainted
     canvas cannot export the card it has just drawn. */
  var MARK = null;
  NCard.mark = function (cb) {
    if (MARK) return cb(MARK);
    if (!window.NMark) return cb(null);
    window.NMark.ready().then(function (im) { MARK = im; cb(im); });
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
    elongation: {
      label: "Sun-to-Moon angle", hint: "the ring, both instants, with the arc between",
      fields: [["size", "Height", "0.36"]],
      run: function (c, S, s, draw) {
        /* ONE RING, TWO MOMENTS. A tithi is the angle from the Sun to the Moon
           and nothing else, so the honest picture of it is the two bodies on a
           circle with the arc between them drawn. Putting sunrise and now on
           the SAME ring is what makes the card worth reading twice: the Sun
           has barely moved, the Moon visibly has, and the arc between them has
           grown by the few degrees that are the difference between the tithi
           an almanac prints and the tithi running at this minute.

           The ticks are every 12°, because 12° is one tithi. Counting them
           round to the Moon is the definition, performed. */
        var E = S.ctx.elong;
        var frac = Math.max(0.16, Math.min(0.6, parseFloat(s.size) || 0.36));
        /* Scaled by S.u/S.W along with everything else. A slot sized only from
           the frame does not shrink when the card rescales to fit, so the fit
           pass can shrink every word on the card and still be eighteen pixels
           over — which is exactly what this did at 4:5. */
        var R = Math.min(S.inner * 0.40, S.room * frac * 0.46) * (S.u / S.W);
        var h = R * 2.56;
        if (!E || E.sunrise == null) {
          if (draw) {
            c.font = "500 " + Math.round(S.u * 0.026) + "px " + SANS;
            c.fillStyle = PAL.dim;
            c.fillText("(the diagram needs the day's longitudes)", S.pad, S.y + S.u * 0.04);
          }
          return S.u * 0.07;
        }
        if (!draw) return h;

        var cx = S.W / 2, cy = S.y + h * 0.545;
        function at(lon, r) {
          var a = (lon - 90) * Math.PI / 180;
          return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
        }
        /* the ecliptic, and the thirty twelve-degree steps a tithi is one of */
        c.strokeStyle = "rgba(255,255,255,0.14)";
        c.lineWidth = Math.max(1, S.u * 0.0018);
        c.beginPath(); c.arc(cx, cy, R, 0, 6.2832); c.stroke();
        for (var t = 0; t < 30; t++) {
          var p0 = at(t * 12, R * 0.955), p1 = at(t * 12, R);
          c.strokeStyle = (t % 5 === 0) ? "rgba(255,255,255,0.34)" : "rgba(255,255,255,0.15)";
          c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.stroke();
        }
        /* the two arcs: sunrise set back and dim, now in front and bright */
        function arc(sun, moon, r, col, alpha, w) {
          c.save();
          c.globalAlpha = alpha;
          c.strokeStyle = col; c.lineWidth = w;
          c.beginPath();
          c.arc(cx, cy, r, (sun - 90) * Math.PI / 180,
                (sun - 90) * Math.PI / 180 + ((moon - sun + 360) % 360) * Math.PI / 180);
          c.stroke();
          c.restore();
        }
        function body(lon, r, col, glyph, dim) {
          var q = at(lon, r);
          c.save();
          if (!dim) { c.shadowColor = col; c.shadowBlur = R * 0.14; }
          c.globalAlpha = dim ? 0.45 : 1;
          c.fillStyle = col;
          c.beginPath(); c.arc(q[0], q[1], R * (dim ? 0.055 : 0.075), 0, 6.2832); c.fill();
          c.restore();
          c.save();
          c.globalAlpha = dim ? 0.6 : 1;
          c.font = "700 " + Math.round(R * (dim ? 0.07 : 0.095)) + "px " + SANS;
          c.fillStyle = PAL.navy; c.textAlign = "center"; c.textBaseline = "middle";
          c.fillText(glyph, q[0], q[1]);
          c.restore();
          c.textAlign = "left"; c.textBaseline = "alphabetic";
        }
        if (E.now) {
          arc(E.sunrise.sun, E.sunrise.moon, R * 0.74, PAL.dim, 0.5, R * 0.075);
          body(E.sunrise.sun, R * 0.74, PAL.dim, "S", true);
          body(E.sunrise.moon, R * 0.74, PAL.dim, "M", true);
        }
        var cur = E.now || E.sunrise;
        arc(cur.sun, cur.moon, R, PAL.gold, 0.85, R * 0.105);
        body(cur.sun, R, PAL.gold, "S", false);
        body(cur.moon, R, PAL.ink, "M", false);

        /* the angle, in the middle, which is the whole quantity */
        c.textAlign = "center";
        c.font = "700 " + Math.round(R * 0.24) + "px " + SANS;
        c.fillStyle = PAL.ink;
        c.fillText(cur.elong.toFixed(2) + "°", cx, cy + R * 0.03);
        c.font = "500 " + Math.round(R * 0.095) + "px " + SANS;
        c.fillStyle = PAL.dim;
        c.fillText("Sun → Moon", cx, cy + R * 0.17);
        c.fillText("each tick 12° = one tithi", cx, cy + R * 0.30);
        /* Which arc is which. Without this the two read as one thick arc with
           a shadow, and the whole point of drawing both is lost. */
        if (E.now) {
          c.font = "700 " + Math.round(R * 0.095) + "px " + SANS;
          c.fillStyle = PAL.gold;
          c.fillText("now", cx, cy - R * 1.20);
          c.fillStyle = PAL.dim;
          c.fillText("at sunrise", cx, cy - R * 1.05);
        }
        c.textAlign = "left";
        return h;
      }
    },
    twotimes: {
      label: "Sunrise and now", hint: "the five limbs at both instants, with the equations",
      fields: [],
      run: function (c, S, s, draw) {
        /* WHY A CARD SHOWS BOTH. An almanac names the day by the tithi running
           AT SUNRISE. A chart is cast for the minute of birth. Those are
           answers to two different questions and they disagree on roughly half
           of all days, which is the single commonest reason somebody says
           their nakṣatra "does not match the calendar". Printing both, with
           the subtraction under each, settles it on the card itself. */
        var E = S.ctx.elong;
        if (!E || !E.now) {
          if (draw) {
            c.font = "500 " + Math.round(S.u * 0.026) + "px " + SANS;
            c.fillStyle = PAL.dim;
            c.fillText("(this needs both instants)", S.pad, S.y + S.u * 0.04);
          }
          return S.u * 0.07;
        }
        var cols = [
          { k: "sunrise", lab: "AT SUNRISE", when: E.sunriseClock, v: E.sunrise },
          { k: "now", lab: "AT THIS MOMENT", when: E.nowClock, v: E.now }
        ];
        var fl = Math.round(S.u * 0.019), fn = Math.round(S.u * 0.031),
            fw = Math.round(S.u * 0.0205), fr = Math.round(S.u * 0.025);
        /* Measured from what the draw loop below actually advances by, with
           one wrapped row of limbs allowed for. The first figure reserved more
           than three extra rows' worth, which pushed the card over the height
           of a 4:5 post for no reason — an overestimate is the safe direction
           and still a wrong number. */
        var rowH = fl * 1.25 + fn * 1.05 + fw * 2.60 + fr * 2.70 + S.u * 0.030;
        if (!draw) return rowH * 2;

        var y = S.y;
        cols.forEach(function (col, ci) {
          var v = col.v;
          y += fl * 1.25;
          c.font = "700 " + fl + "px " + SANS;
          c.fillStyle = ci ? PAL.gold : PAL.dim;
          c.fillText(col.lab + "   " + col.when, S.pad, y);
          y += fn * 1.05;
          c.font = "600 " + fn + "px " + SERIF;
          c.fillStyle = PAL.ink;
          c.fillText(v.tithiName, S.pad, y);
          y += fw * 1.35;
          c.font = "500 " + fw + "px " + SANS;
          c.fillStyle = PAL.dim;
          c.fillText("Moon " + v.moon.toFixed(2) + "° − Sun " + v.sun.toFixed(2) +
                     "° = " + v.elong.toFixed(2) + "°", S.pad, y);
          y += fw * 1.25;
          c.fillText(v.elong.toFixed(2) + "° ÷ 12° = " + (v.elong / 12).toFixed(2) +
                     "  →  tithi " + (Math.floor(v.elong / 12) + 1) + " of 30, " +
                     Math.round(((v.elong / 12) % 1) * 100) + "% through",
                     S.pad, y);
          /* the other three limbs, marked where they differ from sunrise */
          y += fr * 1.35;
          c.font = "500 " + fr + "px " + SANS;
          var bits = [["Nakṣatra", v.nak], ["Yoga", v.yoga], ["Karaṇa", v.karana]];
          var x = S.pad;
          bits.forEach(function (b) {
            var changed = ci === 1 && b[1] !== cols[0].v[b[0] === "Nakṣatra" ? "nak"
                          : b[0] === "Yoga" ? "yoga" : "karana"];
            c.fillStyle = PAL.dim;
            c.fillText(b[0] + " ", x, y);
            x += c.measureText(b[0] + " ").width;
            c.fillStyle = changed ? PAL.gold : PAL.ink;
            c.font = (changed ? "700 " : "500 ") + fr + "px " + SANS;
            c.fillText(b[1], x, y);
            x += c.measureText(b[1]).width + S.u * 0.022;
            c.font = "500 " + fr + "px " + SANS;
            if (x > S.W - S.padR - S.u * 0.10) { x = S.pad; y += fr * 1.35; }
          });
          y += S.u * 0.030;
        });
        return rowH * 2;
      }
    },
    taragrid: {
      label: "Tāra Bala, all 27", hint: "every birth star, so a reader finds their own",
      fields: [],
      run: function (c, S, s, draw) {
        /* ALL TWENTY-SEVEN, not the four-line summary. The compact version
           answers "which stars have a hard day"; this one answers "what about
           MINE", which is the question that makes somebody stop scrolling and
           send the card to a cousin. Three columns of nine is the shape that
           fits a card and keeps the nakṣatras in their own order, so a reader
           can count to theirs rather than hunt. */
        var G = S.ctx.tara;
        if (!G) {
          if (draw) {
            c.font = "500 " + Math.round(S.u * 0.026) + "px " + SANS;
            c.fillStyle = PAL.dim;
            c.fillText("(this needs the day's Moon)", S.pad, S.y + S.u * 0.04);
          }
          return S.u * 0.07;
        }
        var colW = S.inner / 3, rowH = S.u * 0.0335;
        var h = 9 * rowH + S.u * 0.016;
        if (!draw) return h;
        G.rows.forEach(function (r, i) {
          var col = Math.floor(i / 9), row = i % 9;
          var x = S.pad + colW * col, y = S.y + rowH * (row + 1);
          var good = r.tara && r.tara.good;
          c.font = "500 " + Math.round(S.u * 0.0185) + "px " + SANS;
          c.fillStyle = PAL.dim;
          c.fillText(r.name, x, y);
          var w = c.measureText(r.name + " ").width;
          c.font = "700 " + Math.round(S.u * 0.0185) + "px " + SANS;
          c.fillStyle = r.tara ? (good ? PAL.ben : PAL.mal) : PAL.dim;
          c.fillText(" " + (r.tara ? r.tara.name : "—"), x + w, y);
        });
        return h;
      }
    },
    monthgrid: {
      label: "Month grid", hint: "the whole month, each day with its real Moon",
      fields: [],
      run: function (c, S, s, draw) {
        /* A MONTH WHOSE MOONS ARE REAL. Every printed calendar draws the same
           four stock phase icons at the quarter days. This one draws the
           terminator for each day's actual elongation, so the crescent thins
           and fattens across the grid at the rate the Moon really moves —
           which is also why the full moon is not always on the fifteenth cell
           of a pakṣa. Ekādaśī and the syzygies are marked because they are the
           days people are looking for. */
        var M = S.ctx.month;
        if (!M) {
          if (draw) {
            c.font = "500 " + Math.round(S.u * 0.026) + "px " + SANS;
            c.fillStyle = PAL.dim;
            c.fillText("(the grid needs the month)", S.pad, S.y + S.u * 0.04);
          }
          return S.u * 0.07;
        }
        var cw = S.inner / 7, ch = cw * 0.82;
        var first = M.days.find(function (x) { return x; });
        var lead = first ? first.wd : 0;
        var rows = Math.ceil((lead + M.last) / 7);
        var head = S.u * 0.030;
        var h = head + rows * ch + S.u * 0.020;
        if (!draw) return h;

        var WD = ["S", "M", "T", "W", "T", "F", "S"];
        c.textAlign = "center";
        c.font = "700 " + Math.round(S.u * 0.019) + "px " + SANS;
        c.fillStyle = PAL.dim;
        for (var w = 0; w < 7; w++)
          c.fillText(WD[w], S.pad + cw * (w + 0.5), S.y + head * 0.72);

        M.days.forEach(function (day, i) {
          if (!day) return;
          var cell = lead + i;
          var cx = S.pad + cw * (cell % 7 + 0.5);
          var cy = S.y + head + ch * Math.floor(cell / 7);
          var r = cw * 0.21;
          NCard.phase(c, cx, cy + ch * 0.44, r, day.elong);
          c.font = "600 " + Math.round(S.u * 0.0185) + "px " + SANS;
          c.fillStyle = day.full || day.newmoon ? PAL.gold : PAL.ink;
          c.fillText(String(day.d), cx, cy + ch * 0.17);
          /* the days people look for */
          var tag = day.full ? "P" : day.newmoon ? "A" : day.ekadashi ? "11" : "";
          if (tag) {
            c.font = "700 " + Math.round(S.u * 0.0135) + "px " + SANS;
            c.fillStyle = PAL.gold;
            c.fillText(tag, cx + r * 1.35, cy + ch * 0.26);
          }
          if (day.fest.length) {
            c.beginPath();
            c.arc(cx, cy + ch * 0.76, Math.max(2, S.u * 0.0035), 0, 6.2832);
            c.fillStyle = PAL.ben; c.fill();
          }
        });
        c.textAlign = "left";
        return h;
      }
    },
    lunation: {
      label: "This moon", hint: "new moon to new moon, with where today sits",
      fields: [],
      run: function (c, S, s, draw) {
        /* ONE LUNATION, END TO END. Drawn from the new moon that began it to
           the one that ends it, with a disc every day at that day's real
           elongation — so the strip is 29 or 30 discs long depending on the
           lunation, not a fixed thirty, because a synodic month is 29.27 to
           29.83 days and never the same twice. */
        var L = S.ctx.lunation;
        if (!L) {
          if (draw) {
            c.font = "500 " + Math.round(S.u * 0.026) + "px " + SANS;
            c.fillStyle = PAL.dim;
            c.fillText("(this needs the lunation)", S.pad, S.y + S.u * 0.04);
          }
          return S.u * 0.07;
        }
        var n = Math.round(L.days);
        var h = S.u * 0.165;
        if (!draw) return h;
        var step = S.inner / n, r = Math.min(step * 0.40, S.u * 0.026);
        var y = S.y + h * 0.42;
        for (var i = 0; i <= n; i++) {
          var f = i / n;
          /* elongation runs 0 to 360 across the lunation by definition */
          NCard.phase(c, S.pad + step * i + step * 0.0, y, r, f * 360);
        }
        /* where today stands */
        var tx = S.pad + S.inner * Math.max(0, Math.min(1, L.f));
        c.strokeStyle = PAL.gold; c.lineWidth = Math.max(2, S.u * 0.003);
        c.beginPath(); c.moveTo(tx, y - r * 2.0); c.lineTo(tx, y + r * 2.0); c.stroke();
        c.textAlign = "center";
        c.font = "700 " + Math.round(S.u * 0.0185) + "px " + SANS;
        c.fillStyle = PAL.gold;
        c.fillText("today", tx, y + r * 3.4);
        c.textAlign = "left";
        c.font = "500 " + Math.round(S.u * 0.0185) + "px " + SANS;
        c.fillStyle = PAL.dim;
        c.fillText(L.days.toFixed(2) + " days from new moon to new moon",
                   S.pad, S.y + h * 0.98);
        return h;
      }
    },
    timeline: {
      label: "The day's windows", hint: "sunrise to sunrise, with the kālas marked",
      fields: [],
      run: function (c, S, s, draw) {
        /* THE DAY AS A BAR. Sunrise to sunrise, daylight light and night dark,
           with the windows people actually plan around laid on it. Abhijit is
           the eighth of the fifteen daytime muhūrtas and is computed here
           rather than taken as a fixed midday band, because the fifteen are
           fifteenths of THIS day's length and a fixed band drifts by tens of
           minutes across a year. */
        var W = S.ctx.windows;
        if (!W) {
          if (draw) {
            c.font = "500 " + Math.round(S.u * 0.026) + "px " + SANS;
            c.fillStyle = PAL.dim;
            c.fillText("(this needs the day's sunrise)", S.pad, S.y + S.u * 0.04);
          }
          return S.u * 0.07;
        }
        var barH = S.u * 0.042, h = barH + S.u * 0.085;
        if (!draw) return h;
        var y = S.y + S.u * 0.012;
        function X(ms) {
          return S.pad + S.inner * Math.max(0, Math.min(1, (ms - W.from) / (W.to - W.from)));
        }
        /* day and night */
        c.fillStyle = "rgba(255,255,255,0.10)";
        c.fillRect(S.pad, y, X(W.sunset) - S.pad, barH);
        c.fillStyle = "rgba(255,255,255,0.03)";
        c.fillRect(X(W.sunset), y, S.pad + S.inner - X(W.sunset), barH);
        c.strokeStyle = PAL.dim; c.lineWidth = 1;
        c.strokeRect(S.pad, y, S.inner, barH);
        /* the windows */
        (W.bands || []).forEach(function (b) {
          c.fillStyle = b.col; c.globalAlpha = 0.80;
          c.fillRect(X(b.from), y, Math.max(2, X(b.to) - X(b.from)), barH);
          c.globalAlpha = 1;
        });
        /* now, if the day is today */
        if (W.now != null && W.now >= W.from && W.now <= W.to) {
          c.strokeStyle = PAL.ink; c.lineWidth = Math.max(2, S.u * 0.003);
          c.beginPath(); c.moveTo(X(W.now), y - barH * 0.22);
          c.lineTo(X(W.now), y + barH * 1.22); c.stroke();
        }
        /* the legend, which is what makes the bar readable */
        var ly = y + barH + S.u * 0.034, lx = S.pad;
        c.font = "600 " + Math.round(S.u * 0.0175) + "px " + SANS;
        (W.bands || []).forEach(function (b) {
          c.fillStyle = b.col;
          c.fillRect(lx, ly - S.u * 0.013, S.u * 0.016, S.u * 0.016);
          c.fillStyle = PAL.ink;
          c.fillText(" " + b.n + " " + b.t, lx + S.u * 0.019, ly);
          lx += c.measureText(" " + b.n + " " + b.t).width + S.u * 0.044;
          if (lx > S.W - S.padR - S.u * 0.14) { lx = S.pad; ly += S.u * 0.030; }
        });
        return h;
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
      fields: [["size", "Height", "0.36"]],
      run: function (c, S, s, draw) {
        /* a fraction of the room this card actually has, not of the frame:
           with Instagram's strips kept clear a 9:16 card loses a quarter of its
           height, and a wheel sized off the frame would eat what was left */
        var frac = Math.max(0.2, Math.min(0.6, parseFloat(s.size) || 0.42));
        var k = wheelExtent();
        /* ×(S.u/S.W) for the reason the elongation slot gives: a slot sized
           only from the frame cannot take part in the card's fit pass. */
        var R = Math.min(S.inner * 0.52, S.room * frac / k) * (S.u / S.W);
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
    working: {
      label: "The working", hint: "the arithmetic behind each pañcāṅga value",
      fields: [],
      run: function (c, S, s, draw) {
        /* THE SLOT THAT MAKES A CARD WORTH KEEPING. Every other pañcāṅga card
           on the internet states the tithi. This one states the subtraction
           that produced it, with the two longitudes it came from. The numbers
           were always in the day object; nothing here is new arithmetic, only
           arithmetic that was being thrown away after use. */
        var L = S.ctx.limbs;
        if (!L) {
          if (draw) {
            c.font = "500 " + Math.round(S.u * 0.026) + "px " + SANS;
            c.fillStyle = PAL.dim;
            c.fillText("(the working needs the day's longitudes)", S.pad, S.y + S.u * 0.04);
          }
          return S.u * 0.07;
        }
        var rows = [
          ["TITHI", L.tithi.name, L.tithi.work + " = " + L.tithi.v.toFixed(2), PAL.gold],
          ["KARAṆA", L.karana.name, L.karana.work + " = " + L.karana.v.toFixed(2), PAL.ben],
          ["NAKṢATRA", L.nak.name + " pāda " + L.nak.pada,
           L.nak.work + " = " + L.nak.v.toFixed(2), PAL.pale],
          ["YOGA", L.yoga.name, L.yoga.work + " = " + L.yoga.v.toFixed(2), PAL.mal]
        ];
        var f = Math.round(S.u * 0.030), fs = Math.round(S.u * 0.0225);
        var h = rows.length * (f * 1.15 + fs * 1.5);
        if (draw) {
          var y = S.y;
          rows.forEach(function (r) {
            y += f * 1.00;
            c.font = "700 " + Math.round(S.u * 0.019) + "px " + SANS;
            c.fillStyle = r[3];
            c.fillText(r[0], S.pad, y);
            var lw = c.measureText(r[0] + "   ").width;
            c.font = "600 " + f + "px " + SANS; c.fillStyle = PAL.ink;
            c.fillText(r[1], S.pad + lw, y);
            y += fs * 1.35;
            c.font = "500 " + fs + "px " + SANS; c.fillStyle = PAL.dim;
            c.fillText(r[2], S.pad, y);
            y += fs * 0.15;
          });
        }
        return h;
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
    /* A slot measures itself generously — it reserves whole line-heights and
       rounds up — so a card can come out a handful of pixels "over" while
       every word of it sits comfortably inside the frame. The warning exists
       to catch content landing under the foot, not to be pixel-exact, and one
       that fires on six pixels is one that gets ignored when it fires on two
       hundred. One per cent of the room is below anything the eye can find. */
    var SLACK = room * 0.01;
    var need = measure();
    if (need > room + SLACK) {
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
    { scene: "monthwalk", span: "1m", speed: "1", secs: 21,
      title: "A month of real moons",
      why: "Your month as a grid, every cell carrying the Moon as it really is that morning — and the tithi number beside it stumbles: it repeats on the days a tithi spans two sunrises and skips on the days one fits between them. That stumble is the clearest proof that a tithi is not a day.",
      post: "The calendar everyone thinks they understand, with the part nobody notices." },
    { scene: "fiverings", span: "3d", speed: "1", secs: 15,
      title: "The five, with the working",
      why: "Tithi, karaṇa, nakṣatra and yoga are all divisions of the same two numbers, and the frame prints the division beside each one. Nobody else shows the subtraction, and it is the only thing that turns a pañcāṅga card into a reason to follow the account.",
      post: "Pin this. It is the clearest statement of what the site is for." },
    { scene: "necklace", span: "27d", speed: "1", secs: 21,
      title: "The Moon's necklace",
      why: "Twenty-seven beads and the Moon walking them, with the gold band showing the Sun-to-Moon angle that every 12° of is one tithi. It names the hour the next nakṣatra begins at your place.",
      post: "The one people check against their own birth star." },
    { scene: "orbitrose", span: "8y", speed: "1.5", secs: 22,
      title: "The orbit rose",
      why: "The literal construction: Sun at the centre, Earth and one planet on their real orbits, a line drawn between them every few days. Venus gives five petals because the two draw level five times in eight years — and the frame counts the meetings rather than quoting the number.",
      post: "Change the planet and the figure changes. Saturn is the strangest." },
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
      post: "The slowest to earn its shape and the one people replay." },
    { scene: "twoclocks", span: "3d", speed: "1", secs: 15,
      title: "Two scales, one ring",
      why: "A tithi and a nakṣatra sit side by side in every pañcāṅga as though they were two readings of one instrument. They are not. One ring carries both: the twenty-seven nailed to the stars and never moving, the thirty drawn from the Sun and visibly sliding as the days run. The frame counts the boundaries each crosses and prints the subtraction for both.",
      post: "The explainer. Everything else here assumes somebody has seen this one." },
    { scene: "yuddha", span: "4d", speed: "1", secs: 16,
      title: "Graha Yuddha",
      why: "Two grahas closing to within a degree, drawn through a narrow field with the ecliptic across it so north is up. Three victor tests are applied live — the verse at Vol. 2 ch. 79, and two positions from the translator's notes — and on most meetings they disagree, so each verdict carries its source. Watch the lesser-longitude verdict reverse as they cross.",
      post: "The rare case where the honest answer is three answers, and the card says which is the verse." },
    { scene: "cycles", span: "20y", speed: "1.4", secs: 25,
      title: "Where it keeps landing",
      why: "Every pūrṇimā for twenty years, each one marked on the nakṣatra ring where it actually happened and drawn in towards the Earth on a shorter orbit than the one before. Twelve arms appear, leaning backwards, because twelve lunations fall 10.8° short of a full turn — and after 235 of them the figure lies back down on itself to within 0.15°, which is nineteen years. Switch the event to Śukra and five arms appear instead; switch to Maṅgala and the frame says it never closes.",
      post: "The one that rewards a rewatch. Every number on it is counted from the occurrences, not quoted." }
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
      { key: "calday", name: "Today in full", ratio: "4:5",
        blurb: "The whole day on one card — the five limbs, the Moon as it " +
               "actually is, and the day drawn as a bar from sunrise to " +
               "sunrise with Brahma muhūrta, Abhijit and Rāhu kāla laid on it.",
        make: function () {
          return [
            { type: "kicker", text: (hi ? "निरयन" : "NIRAYANA") + " · " + dateline.toUpperCase() },
            { type: "headline", text: tithi },
            { type: "moon", text: masa + " · " + (D ? D.vara : "") },
            { type: "timeline" },
            { type: "rule" },
            { type: "facts", text: D ? [
                "Nakṣatra: " + D.at.nak.name + " pāda " + D.at.nak.pada,
                "Yoga: " + D.at.yoga.name,
                "Karaṇa: " + D.at.karana.name,
                "Sunrise: " + hhmm(D.sunrise) + "   Sunset: " + hhmm(D.sunset)
              ].join("\n") : "" }
          ];
        } },
      { key: "calmonth", name: "This month", ratio: "4:5",
        blurb: "The month as a grid, every day carrying the Moon as it really " +
               "is that morning — so the crescent thins and fattens at the rate " +
               "the Moon actually moves. Pūrṇimā, amāvāsyā and the ekādaśīs are " +
               "marked, and a dot shows a festival.",
        make: function () {
          var M = null;
          try { M = window.__ncMonth(S.date.y, S.date.m, S.place); } catch (e) {}
          var names = [];
          if (M) M.days.forEach(function (x) {
            if (x) x.fest.forEach(function (f) { if (names.indexOf(f) < 0) names.push(f); });
          });
          return [
            { type: "kicker", text: (hi ? "निरयन" : "NIRAYANA") + " · " +
              ["", "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY",
               "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"][S.date.m] +
              " " + S.date.y },
            { type: "headline", text: masa },
            { type: "monthgrid" },
            { type: "rule" },
            { type: "facts", text: (names.length
                ? "This month: " + names.slice(0, 6).join(", ")
                : "No major festival this month by the rules this site applies") +
              "\nP pūrṇimā   A amāvāsyā   11 ekādaśī   • festival" }
          ];
        } },
      { key: "calmoon", name: "This moon", ratio: "4:5",
        blurb: "One lunation end to end — new moon to new moon — with a disc " +
               "for every day at that day's real elongation, and today marked. " +
               "The strip is 29 or 30 long depending on the lunation, because a " +
               "synodic month is never the same length twice.",
        make: function () {
          var L = null;
          try { L = window.__ncLunation(D); } catch (e) {}
          return [
            { type: "kicker", text: dateline.toUpperCase() },
            { type: "headline", text: hi ? "यह चान्द्र मास" : "This moon" },
            { type: "sub", text: masa + " · " + (D ? D.masa.ritu : "") },
            { type: "lunation" },
            { type: "rule" },
            { type: "facts", text: (D ? [
                "Today: " + tithi,
                "Illumination: " + Math.round((1 - Math.cos((D.elongation || 0) *
                  Math.PI / 180)) / 2 * 100) + "%",
                "Elongation: " + (D.elongation || 0).toFixed(2) + "°"
              ].join("\n") : "") + (L ? "\nThis lunation: " + L.days.toFixed(2) +
                " days (29.27 to 29.83 is the real range)" : "") }
          ];
        } },
      { key: "calahead", name: "What is coming", ratio: "4:5",
        blurb: "The festivals and syzygies this month, each with its date — the " +
               "card to post at the start of a month so people save it.",
        make: function () {
          var M = null;
          try { M = window.__ncMonth(S.date.y, S.date.m, S.place); } catch (e) {}
          var rows = [];
          if (M) M.days.forEach(function (x) {
            if (!x) return;
            var MN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug",
                      "Sep", "Oct", "Nov", "Dec"][S.date.m - 1];
            x.fest.forEach(function (f) { rows.push(x.d + " " + MN + ": " + f); });
            if (x.full) rows.push(x.d + " " + MN + ": Pūrṇimā");
            if (x.newmoon) rows.push(x.d + " " + MN + ": Amāvāsyā");
          });
          return [
            { type: "kicker", text: (hi ? "आगे क्या है" : "WHAT IS COMING") },
            { type: "headline", text: masa },
            { type: "rule" },
            { type: "facts", text: rows.length ? rows.slice(0, 9).join("\n")
                : "Nothing major this month by the rules this site applies" },
            { type: "pill", text: S.place.n }
          ];
        } },
      { key: "twomoments", name: "Pañcāṅga, twice", ratio: "4:5",
        blurb: "The same day read at both instants — the sunrise that names it, " +
               "and this minute — with the Sun-to-Moon angle drawn on one ring " +
               "and the subtraction printed under each. This is the card that " +
               "answers \u201cwhy does my nak\u1e63atra not match the calendar?\u201d",
        make: function () {
          return [
            { type: "kicker", text: (hi ? "निरयन" : "NIRAYANA") + " · " + dateline.toUpperCase() },
            { type: "headline", text: hi ? "एक दिन, दो क्षण" : "One day, two moments" },
            { type: "elongation", size: "0.30" },
            { type: "rule" },
            { type: "twotimes" }
          ];
        } },
      { key: "working", name: "Show the working",
        blurb: "The five limbs with the arithmetic that produced each one — the " +
               "two longitudes, the division, the number. Every other pañcāṅga " +
               "card states the tithi; this one shows where it came from, which " +
               "is the reason to follow the account.",
        make: function () {
          return [
            { type: "kicker", text: (hi ? "निरयन" : "NIRAYANA") + " · " + dateline.toUpperCase() },
            { type: "headline", text: hi ? "गणित सामने" : "Show the working" },
            { type: "sub", text: hi ? "चार अंग दो ही संख्याओं से निकलते हैं"
                                    : "four of the five come from two numbers" },
            { type: "rule" },
            { type: "working" }
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
      { key: "taraday", name: "Tāra Bala, all 27", ratio: "4:5",
        blurb: "Every one of the twenty-seven birth stars with its tāra for " +
               "today, so a reader finds their own rather than a group. The " +
               "card people screenshot. Muhūrta tradition, not BPHS.",
        make: function () {
          var G = null;
          try { G = window.NP && D ? window.NP.taraGrid(D) : null; } catch (e) {}
          return [
            { type: "kicker", text: dateline.toUpperCase() },
            { type: "headline", text: hi ? "सब २७ के लिए" : "All 27, today" },
            { type: "sub", text: G ? "counted from the Moon in " + G.todayName : "" },
            { type: "rule" },
            { type: "taragrid" },
            { type: "pill", text: hi ? "मुहूर्त परम्परा — बृ.पा.हो.शा. नहीं"
                                     : "muhūrta tradition, not BPHS" }
          ];
        } },
      { key: "zeroshadow", name: "The day with no shadow", ratio: "4:5",
        blurb: "The two dates a year when the noon Sun stands overhead and a " +
               "vertical stick casts nothing. Only happens between the tropics " +
               "— and the card says so plainly where it cannot happen, rather " +
               "than inventing a date.",
        make: function () {
          var Z = null;
          try { Z = window.NP.zeroShadowDays(S.place, S.date.y); } catch (e) {}
          var MN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug",
                    "Sep", "Oct", "Nov", "Dec"];
          function dstr(ms) {
            var d = new Date(ms + (S.place.tz || 0) * 3600000);
            return d.getUTCDate() + " " + MN[d.getUTCMonth()];
          }
          var rows;
          if (Z && Z.days.length) {
            rows = Z.days.map(function (ms) {
              return dstr(ms) + "   noon Sun overhead, no shadow";
            });
            /* The latitude read BACK OUT of the shadow, which is the point of
               the exercise: the stick measures the place. */
            rows.push("");
            rows.push("Latitude here: " + S.place.lat.toFixed(4) + "°");
            rows.push("On those two days the Sun's noon declination equals it");
          } else {
            rows = [S.place.n + " is at " + S.place.lat.toFixed(2) + "°",
                    "The Sun never reaches further than 23.44°",
                    "", "So there is no zero-shadow day here — ever.",
                    "It happens only between the tropics."];
          }
          return [
            { type: "kicker", text: (hi ? "निरयन" : "NIRAYANA") + " · " + S.date.y },
            { type: "headline", text: hi ? "छायाहीन दिन" : "The day with no shadow" },
            { type: "sub", text: S.place.n },
            { type: "rule" },
            { type: "facts", text: rows.join("\n") },
            { type: "pill", text: hi ? "खगोल — परम्परा नहीं" : "astronomy, not tradition" }
          ];
        } },
      { key: "astawin", name: "When a graha is burnt", ratio: "4:5",
        blurb: "Asta — a planet too close to the Sun to be seen, which the " +
               "muhūrta tradition treats as a pause for ceremonies. Computed " +
               "from the real elongation against each graha's classical orb, " +
               "for the year ahead.",
        make: function () {
          var now = D ? D.ms : Date.now(), out = [];
          var MN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug",
                    "Sep", "Oct", "Nov", "Dec"];
          function dstr(ms) {
            if (ms == null) return "…";
            var d = new Date(ms + (S.place.tz || 0) * 3600000);
            return d.getUTCDate() + " " + MN[d.getUTCMonth()];
          }
          ["Venus", "Jupiter", "Mercury", "Mars", "Saturn"].forEach(function (g) {
            var W = null;
            try { W = window.NP.astaWindows(g, now, now + 400 * 86400000); } catch (e) {}
            if (!W || !W.windows.length) return;
            var w = W.windows[0];
            out.push(g + " (orb " + W.orb + "°): " + dstr(w.from) + " – " + dstr(w.to));
          });
          return [
            { type: "kicker", text: dateline.toUpperCase() },
            { type: "headline", text: hi ? "अस्त" : "Asta — burnt by the Sun" },
            { type: "sub", text: hi ? "सूर्य के बहुत निकट, अदृश्य"
                                    : "too near the Sun to be seen" },
            { type: "rule" },
            { type: "facts", text: out.length
                ? "Next window for each, within a year:\n" + out.join("\n")
                : "No asta window for the major grahas in the year ahead" },
            { type: "pill", text: hi ? "शास्त्रीय कक्षा — मुहूर्त परम्परा"
                                     : "classical orbs · muhūrta tradition" }
          ];
        } },
      { key: "lunardist", name: "How far the Moon is", ratio: "4:5",
        blurb: "The Moon's distance tonight, and the next perigee and apogee — " +
               "found as real extrema of the distance, so the figures do not " +
               "depend on anybody's definition of “supermoon”. That label " +
               "does, so the card gives the kilometres and names the threshold.",
        make: function () {
          var now = D ? D.ms : Date.now();
          var km = null, X = [];
          try { km = window.NP.moonDistance(now); } catch (e) {}
          try { X = window.NP.lunarExtremes(now, now + 45 * 86400000) || []; } catch (e) {}
          var MN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug",
                    "Sep", "Oct", "Nov", "Dec"];
          function dstr(ms) {
            var d = new Date(ms + (S.place.tz || 0) * 3600000);
            return d.getUTCDate() + " " + MN[d.getUTCMonth()] + " " + hhmm(ms);
          }
          var rows = [];
          if (km != null) rows.push("Right now: " + Math.round(km).toLocaleString() + " km");
          X.slice(0, 4).forEach(function (e) {
            rows.push((e.kind === "perigee" ? "Perigee " : "Apogee  ") +
                      dstr(e.ms) + "   " + Math.round(e.km).toLocaleString() + " km");
          });
          rows.push("");
          rows.push("Mean distance 384,400 km. The popular");
          rows.push("“supermoon” line is drawn at 360,000 km — a");
          rows.push("convention, not a classical or physical fact.");
          return [
            { type: "kicker", text: dateline.toUpperCase() },
            { type: "headline", text: hi ? "चन्द्र की दूरी" : "How far the Moon is" },
            { type: "moon", text: tithi },
            { type: "rule" },
            { type: "facts", text: rows.join("\n") },
            { type: "pill", text: hi ? "खगोल" : "astronomy" }
          ];
        } },
      { key: "festrule", name: "Why that date", ratio: "4:5",
        blurb: "A festival with the RULE that fixes its date printed under it — " +
               "which tithi, which month, which reckoning — because the rule is " +
               "the interesting part and almost nobody posts it. Shows today's " +
               "festival if there is one, otherwise the next one this month.",
        make: function () {
          var F = null, when = null;
          try { F = D ? window.NP.festivalsOn(D) : null; } catch (e) {}
          var f = F && F.length ? F[0] : null;
          if (!f) {
            /* nothing today — walk the month for the next one */
            var M = null;
            try { M = window.__ncMonth(S.date.y, S.date.m, S.place); } catch (e) {}
            if (M) for (var i = 0; i < M.days.length; i++) {
              var x = M.days[i];
              if (x && x.d >= (S.date.d || 1) && x.festFull && x.festFull.length) {
                f = x.festFull[0]; when = x.d; break;
              }
            }
          }
          if (!f) return [
            { type: "kicker", text: dateline.toUpperCase() },
            { type: "headline", text: hi ? "नियम" : "Why that date" },
            { type: "rule" },
            { type: "facts", text: "No festival today or later this month by the\n" +
                "rules this site applies. The rules themselves are\n" +
                "on the calendar page — every date here is derived,\n" +
                "never looked up in a list." }
          ];
          var rows = [];
          if (f.rule) rows.push("Rule: " + f.rule);
          if (f.note) rows.push("");
          if (f.note) rows.push(f.note);
          if (f.close) rows.push("");
          if (f.close) rows.push("Close call: " + (f.closeWhy || "boundary near sunrise"));
          return [
            { type: "kicker", text: (hi ? "नियम क्यों" : "WHY THAT DATE") +
              (when ? " · " + when : " · " + dateline.toUpperCase()) },
            { type: "headline", text: f.name },
            { type: "sub", text: when ? "later this month" : (D ? D.vara + " · " + tithi : "") },
            { type: "rule" },
            { type: "facts", text: rows.join("\n") },
            { type: "pill", text: hi ? "नियम से निकाला, सूची से नहीं"
                                     : "derived from the rule, not a list" }
          ];
        } },
      { key: "horastory", name: "The day's horās", ratio: "9:16",
        blurb: "All twenty-four horās of the day with their lords and times, " +
               "the one running now marked. Twelve rows of two, because a " +
               "twenty-four line list does not fit a story once Instagram's " +
               "own strips are kept clear.",
        make: function () {
          var H = [], live = -1;
          if (D && D.sunrise != null && D.nextSunrise != null) {
            var span = (D.nextSunrise - D.sunrise) / 24;
            for (var i = 0; i < 24; i++) {
              /* NP.hora reads D.ms, so a copied day at the middle of each slot
                 gets that slot's lord from the real implementation rather than
                 a second copy of the order table here. */
              var h = null;
              try { h = window.NP.hora(dayAt(D, D.sunrise + span * (i + 0.5))); }
              catch (e) {}
              if (!h) continue;
              if (D.ms >= h.from && D.ms < h.to) live = H.length;
              H.push(h);
            }
          }
          /* Twelve rows, two horās each — the day's first twelve on the left
             and the second twelve on the right, so a reader scans down one
             column rather than across a page. */
          var rows = [];
          for (var r = 0; r < 12 && r < H.length; r++) {
            var a = H[r], b = H[r + 12];
            rows.push((live === r ? "▸" : " ") + hhmm(a.from) + " " + a.lord +
                      (b ? "   " + (live === r + 12 ? "▸" : " ") +
                           hhmm(b.from) + " " + b.lord : ""));
          }
          return [
            { type: "kicker", text: (hi ? "होरा" : "HORĀ") + " · " + dateline.toUpperCase() },
            { type: "headline", text: hi ? "दिन के २४ होरा" : "The day's 24 horās" },
            { type: "sub", text: hi ? "सूर्योदय से सूर्योदय का चौबीसवाँ भाग"
                                    : "a twenty-fourth of sunrise to sunrise" },
            { type: "rule" },
            { type: "facts", text: rows.join("\n") },
            { type: "pill", text: (live >= 0 ? "▸ running now · " : "") +
                                  (hi ? "मुहूर्त परम्परा" : "muhūrta tradition") }
          ];
        } },
      { key: "choghastory", name: "Today's choghaḍiyā", ratio: "9:16",
        blurb: "The eight daytime choghaḍiyā with their names and times, the " +
               "current one marked. Each is one eighth of sunrise to sunset, " +
               "so they stretch and shrink with the season.",
        make: function () {
          var rows = [];
          if (D && D.sunrise != null && D.sunset != null) {
            var part = (D.sunset - D.sunrise) / 8;
            for (var i = 0; i < 8; i++) {
              var C = null;
              try { C = window.NP.choghadiya(dayAt(D, D.sunrise + part * (i + 0.5))); }
              catch (e) {}
              if (!C || C.night) continue;
              var live = D.ms >= C.from && D.ms < C.to;
              rows.push((live ? "▸ " : "  ") + hhmm(C.from) + "–" + hhmm(C.to) +
                        "  " + C.name);
            }
          }
          return [
            { type: "kicker", text: (hi ? "चौघड़िया" : "CHOGHAḌIYĀ") + " · " +
              dateline.toUpperCase() },
            { type: "headline", text: hi ? "आज के आठ" : "Today's eight" },
            { type: "sub", text: D ? "sunrise " + hhmm(D.sunrise) + " · sunset " +
                                     hhmm(D.sunset) : "" },
            { type: "rule" },
            { type: "facts", text: rows.join("\n") },
            { type: "facts", text: "Each is one eighth of the day's own length,\n" +
                "so they are longer in summer and shorter in\n" +
                "winter. The clock hour has nothing to do with it." },
            { type: "pill", text: hi ? "मुहूर्त परम्परा — बृ.पा.हो.शा. नहीं"
                                     : "muhūrta tradition, not BPHS" }
          ];
        } },
      { key: "blank", name: "Empty",
        blurb: "Nothing but the frame and the foot. Build it slot by slot.",
        make: function () { return [{ type: "headline", text: "" }]; } }
    ];
  }

  /* The same day object read at a different instant.

     NP.hora and NP.choghadiya both answer "which one is running", reading
     D.ms — which is the right shape for a clock and the wrong one for a card
     that wants all twenty-four. Rather than copy the order tables here, where
     they would be free to drift from the real ones, the recipes ask the real
     functions once per slot with the day's own ms moved into that slot. One
     shallow copy per call, and the answer comes from the implementation the
     rest of the site uses. */
  function dayAt(D, ms) {
    var o = {};
    for (var k in D) if (Object.prototype.hasOwnProperty.call(D, k)) o[k] = D[k];
    o.ms = ms;
    return o;
  }

  /* The five limbs with their working, from a day object. Mirrors the motion
     bundle's mgLimbs — the two cannot share code because panchanga.js does not
     load on the chart page, so the test asserts they agree instead. */
  function limbsOf(D) {
    if (!D || D.sunDeg == null || D.moonDeg == null) return null;
    function n(x) { return ((x % 360) + 360) % 360; }
    var su = n(D.sunDeg), mo = n(D.moonDeg);
    var el = n(mo - su), sum = n(mo + su);
    var ti = el / 12, ki = el / 6, ni = mo / (40 / 3), yi = sum / (40 / 3);
    return {
      sun: su, moon: mo, elong: el,
      tithi: { v: ti, name: (D.at.tithi.paksha === "śukla" ? "Śukla " : "Kṛṣṇa ") + D.at.tithi.name,
               work: "(Moon " + mo.toFixed(2) + "° − Sun " + su.toFixed(2) + "°) ÷ 12°" },
      karana: { v: ki, name: D.at.karana.name, work: el.toFixed(2) + "° ÷ 6°" },
      nak: { v: ni, name: D.at.nak.name, pada: D.at.nak.pada,
             work: "Moon " + mo.toFixed(2) + "° ÷ 13°20′" },
      yoga: { v: yi, name: D.at.yoga.name,
              work: "(Sun + Moon" + (su + mo >= 360 ? " − 360°" : "") + ") ÷ 13°20′" }
    };
  }
  try { window.__ncLimbsOf = limbsOf; } catch (e) {}

  /* The same day read at two instants: the sunrise that NAMES it, and the
     moment the card is made. Both carry their own longitudes, so the card can
     print the subtraction for each rather than a difference with no operands.

     "Now" means now when the date on screen is today, and local noon otherwise
     — "at this moment" on a card for next March would be a figure for an
     instant that has not happened, which is worse than useless because it
     looks right. */
  function elongPair(D, S) {
    if (!D || !window.NP || !window.NP.atMoment) return null;
    function clock(ms) {
      var d = new Date(ms + (S.place.tz || 0) * 3600000);
      return String(d.getUTCHours()).padStart(2, "0") + ":" +
             String(d.getUTCMinutes()).padStart(2, "0");
    }
    function pack(at, nameFn) {
      if (!at || at.sun == null || at.moon == null) return null;
      return { sun: ((at.sun % 360) + 360) % 360,
               moon: ((at.moon % 360) + 360) % 360,
               elong: at.elongation,
               tithiName: nameFn(at),
               nak: at.nak.name + " " + at.nak.pada,
               yoga: at.yoga.name, karana: at.karana.name };
    }
    function nm(at) {
      return (at.tithi.paksha === "śukla" ? "Śukla " : "Kṛṣṇa ") + at.tithi.name;
    }
    /* sunrise: D.at is already read there, and D carries its longitudes */
    var sr = pack({ sun: D.sunDeg, moon: D.moonDeg, elongation: D.elongation,
                    tithi: D.at.tithi, nak: D.at.nak, yoga: D.at.yoga,
                    karana: D.at.karana }, nm);
    var now = Date.now();
    var isToday = D.nextSunrise != null && now >= D.sunrise && now < D.nextSunrise;
    var atMs = isToday ? now : (D.sunset != null
             ? D.sunrise + (D.sunset - D.sunrise) / 2 : D.sunrise + 6 * 3600000);
    var R = null;
    try { R = window.NP.atMoment(D, atMs); } catch (e) {}
    return {
      sunrise: sr, sunriseClock: clock(D.sunrise),
      now: R ? pack(R.atMoment, nm) : null,
      nowClock: clock(atMs) + (isToday ? "" : " · midday"),
      isToday: isToday,
      differs: R ? R.differs : null
    };
  }
  try { window.__ncElongPair = elongPair; } catch (e) {}

  /* ===== a month, computed once ===========================================
     Thirty-ish days each needing its own sunrise search and its own boundary
     bisections, which is a second of work — so it is built once per month and
     place and kept, rather than rebuilt every time a slider moves. */
  var MONTH_CACHE = {};
  function monthData(y, m, P) {
    var key = y + "-" + m + "|" + P.lat.toFixed(3) + "," + P.lon.toFixed(3);
    if (MONTH_CACHE[key]) return MONTH_CACHE[key];
    var NP = window.NP;
    if (!NP) return null;
    var last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    var days = [];
    for (var d = 1; d <= last; d++) {
      var D = null;
      try { D = NP.dayOfDate(y, m, d, P, { ends: true, month: true }); } catch (e) {}
      if (!D) { days.push(null); continue; }
      var f = [];
      try { f = NP.festivalsOn(D, { minor: false }) || []; } catch (e) {}
      days.push({
        d: d, D: D, elong: D.elongation,
        tithi: D.at.tithi, nak: D.at.nak,
        paksha: D.at.tithi.paksha,
        full: D.at.tithi.i === 14, newmoon: D.at.tithi.i === 29,
        ekadashi: D.at.tithi.i === 10 || D.at.tithi.i === 25,
        fest: f.map(function (x) { return x.name || x.key; }),
        festFull: f,
        wd: new Date(Date.UTC(y, m - 1, d)).getUTCDay()
      });
    }
    var out = { y: y, m: m, days: days, last: last,
                masa: days.find(function (x) { return x; }) };
    MONTH_CACHE[key] = out;
    return out;
  }
  try { window.__ncMonth = monthData; } catch (e) {}

  /* The lunation this day sits in: new moon to new moon, with where we stand. */
  function lunationOf(D) {
    var NP = window.NP;
    if (!NP || !NP.newMoonNear || !D) return null;
    var prev = null, next = null;
    try {
      prev = NP.newMoonNear(D.sunrise - 20 * 86400000);
      next = NP.newMoonNear(D.sunrise + 20 * 86400000);
      /* newMoonNear returns the nearest; walk until one sits either side */
      if (prev > D.sunrise) prev = NP.newMoonNear(D.sunrise - 32 * 86400000);
      if (next < D.sunrise) next = NP.newMoonNear(D.sunrise + 32 * 86400000);
    } catch (e) { return null; }
    if (prev == null || next == null || next <= prev) return null;
    return { from: prev, to: next, days: (next - prev) / 86400000,
             f: (D.sunrise - prev) / (next - prev) };
  }
  try { window.__ncLunation = lunationOf; } catch (e) {}

  /* The day as a span with its named windows on it. Abhijit is derived here —
     the eighth of fifteen daytime muhūrtas — because NP does not carry it and
     a fixed midday band would be wrong by tens of minutes across a year. */
  function dayWindows(D, S) {
    var NP = window.NP;
    if (!NP || !D || D.sunrise == null || D.sunset == null) return null;
    var to = D.nextSunrise != null ? D.nextSunrise : D.sunrise + 86400000;
    var day = D.sunset - D.sunrise, mu = day / 15;
    var bands = [];
    var rk = null, bm = null;
    try { rk = NP.rahuKala(D); } catch (e) {}
    try { bm = NP.brahmaMuhurta(D); } catch (e) {}
    function hhmm(ms) {
      var d = new Date(ms + (S.place.tz || 0) * 3600000);
      return String(d.getUTCHours()).padStart(2, "0") + ":" +
             String(d.getUTCMinutes()).padStart(2, "0");
    }
    if (bm) bands.push({ n: "Brahma muhūrta", t: hhmm(bm.from) + "–" + hhmm(bm.to),
                         from: bm.from, to: bm.to, col: "#7f9fd8" });
    bands.push({ n: "Abhijit", t: hhmm(D.sunrise + 7 * mu) + "–" + hhmm(D.sunrise + 8 * mu),
                 from: D.sunrise + 7 * mu, to: D.sunrise + 8 * mu, col: PAL.ben });
    if (rk) bands.push({ n: "Rāhu kāla", t: hhmm(rk.from) + "–" + hhmm(rk.to),
                         from: rk.from, to: rk.to, col: PAL.mal });
    var now = Date.now();
    return { from: Math.min(D.sunrise, bm ? bm.from : D.sunrise), to: to,
             sunset: D.sunset, bands: bands,
             now: (now >= D.sunrise && now <= to) ? now : null };
  }
  try { window.__ncWindows = dayWindows; } catch (e) {}

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
        if (r.used <= r.room + r.room * 0.01) { m.textContent = ""; return; }
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
    try { window.__ncSlots = function () { return C.slots; };
          window.__ncCtx = function () { return C.ctx; }; } catch (e) {}
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
      /* The same five divisions the glassbox scenes print, computed here from
         the day's own sunrise longitudes so a card and a frame cannot
         disagree about the arithmetic they both show. */
      C.ctx.limbs = limbsOf(D);
      C.ctx.elong = elongPair(D, S);
      C.ctx.month = monthData(S.date.y, S.date.m, S.place);
      C.ctx.lunation = lunationOf(D);
      C.ctx.windows = dayWindows(D, S);
      try { C.ctx.tara = window.NP.taraGrid(D); } catch (e) { C.ctx.tara = null; }
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
