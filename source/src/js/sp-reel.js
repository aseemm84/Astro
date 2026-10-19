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
