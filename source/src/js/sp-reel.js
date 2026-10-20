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
  /* the same twelve in mixed case, for the paper theme, where small caps
     would fight the italic serif the whole sheet is set in */
  var RASHI_SOFT = ["Meṣa", "Vṛṣabha", "Mithuna", "Karka", "Siṃha", "Kanyā",
                    "Tulā", "Vṛścika", "Dhanu", "Makara", "Kumbha", "Mīna"];
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
      /* restored to NONE, not to whatever it was. Tracking is ambient
         canvas state, and a routine that puts back what it found passes a
         leak along faithfully for ever: the kicker's tracking was still set
         when the subtitle drew, so the paper theme's subtitle came out
         letterspaced while its title did not, and tracing it across frames
         showed nothing because the state was clean at both ends. Every
         piece of text here now says what tracking it wants. */
      c.letterSpacing = "0px"; c.textAlign = pa;
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
  /* no tracking, said out loud rather than assumed */
  function plain(c) {
    if ("letterSpacing" in c) c.letterSpacing = "0px";
    return c;
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
  /* TWO KINDS OF PALETTE, AND THEY ARE NOT VARIATIONS ON EACH OTHER.

     A dark palette is an EXPOSURE: strokes are added to a dark floor and the
     sum is bloomed, which is why gold on black works and why the floor has
     to be dark for light to have anything to be added to.

     Paper is not an exposure at all. It is ink and wash on a sheet — a
     watercolour ground of pale teal and sand, a thin ochre line, names set
     in italic serif, and the twelve rāśis drawn as a banded wheel with the
     signs tinted. Running it through the additive pipeline would turn the
     ochre white, so `dark: false` chooses the other render path entirely
     rather than recolouring this one. */
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
    paper: { key: "paper", label: "Watercolour paper", dark: false,
             banded: true,
             bg: "#efe7d6", ink: "#3b3022", gold: "#9a6f2c", warm: "#b98a3c",
             dim: "#6f6150", line: "#a98a52", hot: "#8a5a1e", accent: "#c0762a",
             band: "#f6efdd",
             wash: ["#efe9da", "#bcd4d2", "#e3d3ae", "#cfdcd6", "#efdcc2"],
             signs: ["#f2ded2", "#e5e8d2", "#dde7ef", "#eadfe8",
                     "#f4e9d2", "#dceae0", "#f0e2d8", "#e2e6ef",
                     "#efe3cf", "#e6e4d6", "#dfe9ee", "#eee0e6"] },
    dusk: { key: "dusk", label: "Dusk paper", dark: false,
            banded: true,
            bg: "#e8e0e6", ink: "#362b33", gold: "#8d5a73", warm: "#a9708a",
            dim: "#6b5c66", line: "#a07f93", hot: "#7a3f5e", accent: "#c0708f",
            band: "#f2e8ee",
            wash: ["#ece3e8", "#c6d3e4", "#e8d6d2", "#d8cfe2", "#f0dfd4"],
            signs: ["#f0dcdc", "#e8e4d6", "#dde4ef", "#ead9e6",
                    "#f3e6d6", "#dde8e2", "#f1e0d9", "#e0e4ee",
                    "#eee2d4", "#e6e2d8", "#dfe7ee", "#ecdee6"] }
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
      foot: { y: H * 0.948 }
    };
  }

  function titleFont(P) { return (P.banded ? "italic " : "600 "); }
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
    c.fillStyle = P.banded ? P.ink : P.warm;
    if (P.banded)
      fitTracked(c, reel.title, W / 2,
                 B.title.y + W * (reel.kicker ? 0.095 : 0.072),
                 W * 0.90, W * 0.070, 0.004, "center", "italic 600");
    else
      fitTracked(c, reel.title.toUpperCase(), W / 2,
                 B.title.y + W * (reel.kicker ? 0.093 : 0.070),
                 W * 0.88, W * 0.072, 0.055, "center", "600");
    plain(c);
    c.fillStyle = P.banded ? P.dim : P.ink;
    c.globalAlpha = intro * (P.banded ? 0.95 : 0.72);
    c.font = (P.banded ? "italic " : "") + (W * 0.0255).toFixed(1) + "px " + SERIF;
    var lines = wrapTo(c, reel.subtitle || "", W * 0.84);
    for (var i = 0; i < Math.min(3, lines.length); i++) {
      if (P.banded) c.fillText(lines[i], W / 2,
        B.title.y + W * (reel.kicker ? 0.132 : 0.108) + i * W * 0.032);
      else tracked(c, lines[i], W / 2,
        B.title.y + W * (reel.kicker ? 0.128 : 0.105) + i * W * 0.030,
        W * 0.0012, "center");
    }
    c.restore();
  }

  /* ---- the mark -----------------------------------------------------------
     The same assets/brand/mark.svg the cards and the Studio draw, loaded once
     and kept. It must be LOADED BEFORE A RECORDING STARTS, not merely
     requested: an image that arrives on frame forty gives a video whose first
     second and a half is unbranded, and nobody watching a reel back notices
     that the logo faded in — they notice it on the second viewing, by which
     time the file is posted. So `markReady` returns a promise and the
     recorder waits on it. */
  var MARK = null;
  function markReady() {
    if (MARK) return Promise.resolve(MARK);
    if (!window.NMark) return Promise.resolve(null);
    return window.NMark.ready().then(function (im) { MARK = im; return im; });
  }

  /* The lockup: mark, handle, promise. Centred as one group rather than
     pinned to the corners, because a reel is watched in a feed where the
     corners are where the platform puts its own furniture. */
  function drawFoot(c, W, H, B, reel, P, p) {
    var fade = smooth(clamp(p / 0.05, 0, 1));
    var mk = W * 0.062;
    var gap = W * 0.019;
    c.save();
    c.textBaseline = "alphabetic";
    c.font = "600 " + (W * 0.0245).toFixed(1) + "px " + SERIF;
    var handle = "@Nirayana.Soft";
    var hw = c.measureText(handle).width + W * 0.0245 * 0.06 * (handle.length - 1);
    c.font = (W * 0.0165).toFixed(1) + "px " + SERIF;
    var pw = c.measureText(reel.foot).width;
    var textW = Math.max(hw, pw);
    var total = (MARK ? mk + gap : 0) + textW;
    var x = (W - total) / 2;
    var baseY = B.foot.y;

    if (MARK) {
      c.globalAlpha = 0.92 * fade;
      try { c.drawImage(MARK, x, baseY - mk * 0.78, mk, mk); } catch (e) {}
      x += mk + gap;
    }
    c.textAlign = "left";
    c.globalAlpha = 0.88 * fade;
    c.fillStyle = P.gold;
    c.font = "600 " + (W * 0.0245).toFixed(1) + "px " + SERIF;
    tracked(c, handle, x, baseY - W * 0.019, W * 0.0245 * 0.06, "left");
    plain(c);
    c.globalAlpha = 0.56 * fade;
    c.fillStyle = P.dim;
    c.font = (W * 0.0165).toFixed(1) + "px " + SERIF;
    c.fillText(reel.foot, x, baseY + W * 0.006);
    c.restore();
  }

  /* The year counter: large, ghosted, sitting behind the caption. It is the
     single element that most makes a long run feel long, because it is the
     only thing on the frame moving continuously. */
  function drawClock(c, W, H, B, reel, P, now) {
    var yrs = (now.t - reel.tl.t0) / DAY / 365.2564;
    var txt;
    if (reel.clockMode === "year") txt = String(new Date(now.t).getUTCFullYear());
    else if (reel.clockMode === "days") {
      var d = (now.t - reel.tl.t0) / DAY;
      txt = "DAY " + (d < 10 ? d.toFixed(2) : d.toFixed(1));
    } else txt = "YEAR " + (yrs < 10 ? yrs.toFixed(1) : Math.round(yrs));
    c.save();
    c.globalAlpha = P.banded ? 0.20 : 0.13;
    c.fillStyle = P.banded ? P.line : P.gold;
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
    c.fillStyle = P.banded ? P.hot : P.gold;
    fitTracked(c, e.big, W / 2, y, W * 0.84, W * 0.054,
               P.banded ? 0.012 : 0.045, "center",
               P.banded ? "italic 600" : "600");
    y += W * 0.045;
    if (e.small) {
      plain(c);
      c.fillStyle = P.ink;
      c.globalAlpha = a;
      c.font = (P.banded ? "italic " : "") + (W * 0.0265).toFixed(1) + "px " + SERIF;
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
  function G() { return window.SPGlow; }
  function drawClosing(c, W, H, B, reel, P, closeP) {
    var a = smooth(clamp(closeP * 2.1, 0, 1));
    if (a <= 0.004) return;
    c.save();
    /* A FLAT RECTANGLE HAS A TOP EDGE, and on the dark themes the ground
       under it carries a vignette, so the edge showed as a seam straight
       across the frame. A gradient that starts at nothing has no edge to
       see. */
    var top = B.cap.y - W * 0.06;
    var fade = c.createLinearGradient(0, top, 0, top + W * 0.10);
    var base = P.banded ? P.band : P.bg;
    fade.addColorStop(0, G().rgba(base, 0));
    fade.addColorStop(1, G().rgba(base, P.banded ? 0.86 : 0.80));
    c.globalAlpha = a;
    c.fillStyle = fade;
    c.fillRect(0, top, W, W * 0.10);
    c.fillStyle = G().rgba(base, P.banded ? 0.86 : 0.80);
    c.fillRect(0, top + W * 0.10 - 1, W, H - top - W * 0.10 + 1);
    c.globalAlpha = a;
    c.textAlign = "center";
    var y = B.cap.y + W * 0.055;
    c.fillStyle = P.banded ? P.ink : P.warm;
    fitTracked(c, reel.closing.big, W / 2, y, W * 0.86, W * 0.062,
               P.banded ? 0.012 : 0.05, "center",
               P.banded ? "italic 600" : "600");
    y += W * 0.055;
    plain(c);
    c.fillStyle = P.ink;
    c.font = (P.banded ? "italic " : "") + (W * 0.0255).toFixed(1) + "px " + SERIF;
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

     EVERY STAGE IS THREE FUNCTIONS, NOT ONE, and splitting them is what made
     the reels smooth.

       base(c, R, reel, P)              the furniture: rings, ticks, labels.
                                        Drawn once.
       append(c, R, reel, P, from, to)  the items numbered [from, to). Drawn
                                        once each, ever.
       live(c, R, reel, P, now, idx)    the moving head. Drawn every frame.

     The first two go into a TRAIL canvas that persists between frames. A
     thread reel draws fifteen hundred chords over its run; the old single
     draw() redrew all fifteen hundred for each of nine hundred frames, and
     the frame before had already drawn fourteen hundred and ninety-nine of
     them. Now the trail is kept and only the difference is appended, so the
     per-frame cost stops depending on how far through the run you are.

     The trail is rebuilt from scratch only when the playhead goes backwards,
     which is what scrubbing does and what a recording's single pass never
     does.

     AND THE BODIES ARE REAL. Where a stage shows a graha it asks SPBody for
     the lit disc this site already knows how to generate — the Moon with its
     maria and its true phase, Guru with its belts — instead of a glowing
     dot. The dot is still there for the accumulated marks, because a hundred
     lamps is a smear and a hundred dots is a shape. */

  function sub(R, fx, fy, fw, fh) {
    return { x: R.x + R.w * fx, y: R.y + R.h * fy, w: R.w * fw, h: R.h * fh };
  }

  /* A rāśi rim. On a dark palette it is a thin gold line; on paper it is the
     banded wheel of the explainer films, twelve pale segments between two
     ochre circles with the names set along it. */
  function rim(c, G, cx, cy, r, P, alpha, opt) {
    opt = opt || {};
    var i, a;
    var al = alpha == null ? 1 : alpha;
    c.save();
    if (P.banded) {
      var inner = r * 0.884;
      for (i = 0; i < 12; i++) {
        var a0 = (i * 30 - 90) * R2, a1 = ((i + 1) * 30 - 90) * R2;
        c.beginPath();
        c.arc(cx, cy, r, a0, a1);
        c.arc(cx, cy, inner, a1, a0, true);
        c.closePath();
        c.globalAlpha = al * (opt.fill == null ? 1 : opt.fill);
        c.fillStyle = P.signs ? P.signs[i] : P.band;
        c.fill();
        c.globalAlpha = al * 0.75;
        c.strokeStyle = P.line;
        c.lineWidth = Math.max(1, r * 0.0035);
        c.stroke();
      }
      c.globalAlpha = al * 0.9;
      c.strokeStyle = P.line;
      c.lineWidth = Math.max(1, r * 0.005);
      c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.stroke();
      c.beginPath(); c.arc(cx, cy, inner, 0, TAU); c.stroke();
      /* the names set ALONG the rim, each rotated to its own segment, which
         is how the explainer films do it and is why their wheel reads as a
         wheel rather than as a circle with a list round it */
      c.fillStyle = P.ink;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.font = "italic " + (r * 0.058).toFixed(1) + "px " + SERIF;
      c.globalAlpha = al;
      for (i = 0; i < 12; i++) {
        var m = ((i * 30 + 15) - 90) * R2, q = r * 1.075;
        var x = cx + Math.cos(m) * q, y = cy + Math.sin(m) * q;
        c.save();
        c.translate(x, y);
        /* Text set along a circle reads correctly while its own rotation
           stays within a quarter turn of upright. The rotation here is the
           tangent, m + 90°, so the test is on the tangent and not on m:
           flipping where cos(m) < 0 turned the LEFT half over and left the
           bottom half upside down, which is the half that actually needs
           it. */
        var rot = m + Math.PI / 2;
        if (Math.sin(m) > 0) rot += Math.PI;
        c.rotate(rot);
        plain(c);
        c.fillText(RASHI_SOFT[i], 0, 0);
        c.restore();
      }
      c.restore();
      return;
    }
    c.globalAlpha = al * 0.70;
    c.strokeStyle = G.rgba(P.line, 0.8);
    c.lineWidth = Math.max(1, r * 0.0035);
    c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.stroke();
    c.globalAlpha = al * 0.65;
    for (i = 0; i < 12; i++) {
      a = (i * 30 - 90) * R2;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      c.lineTo(cx + Math.cos(a) * r * 0.968, cy + Math.sin(a) * r * 0.968);
      c.stroke();
    }
    c.fillStyle = G.rgba(P.ink, 0.80);
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = "600 " + (r * 0.060).toFixed(1) + "px " + SERIF;
    c.globalAlpha = al * 0.85;
    for (i = 0; i < 12; i++) {
      var mm = ((i * 30 + 15) - 90) * R2, qq = r * 1.085;
      tracked(c, RASHI[i], cx + Math.cos(mm) * qq, cy + Math.sin(mm) * qq,
              r * 0.008, "center");
    }
    c.restore();
  }

  /* the geometry each stage agrees on, so base/append/live cannot disagree */
  function geom(stage, R, reel) {
    var cx = R.x + R.w / 2, cy = R.y + R.h * 0.47;
    if (stage === "drift") {
      var rim1 = Math.min(R.w * 0.40, R.h * 0.42);
      return { cx: cx, cy: cy, rim: rim1, r: rim1 / 1.42 };
    }
    var r = Math.min(R.w * 0.40, R.h * 0.42);
    if (stage === "thread" || stage === "loops" || stage === "orbit")
      r = Math.min(R.w * 0.42, R.h * 0.44);
    return { cx: cx, cy: cy, rim: r, r: r };
  }

  /* --- 1. the node wheel ---------------------------------------------------
     Every syzygy plotted where in the circle it fell, with its distance from
     the ring being the Moon's real latitude. That one decision is what makes
     the picture answer the question: the band of dots crosses the ring twice
     per draconic period and the eclipses are precisely the dots ON it. */
  var S_nodes = {
    base: function (c, G, R, reel, P) {
      var g = geom("nodes", R, reel), r = g.r;
      var K = r * 0.072;
      var LI = reel.inner == null ? 0.9 : reel.inner;
      var LO = reel.outer == null ? 1.57 : reel.outer;
      c.save();
      /* Every alpha in these stages was set while a heavy bloom was
         doubling it back. With the bloom cut to a third, the same numbers
         render a murky brown ring and a thread you have to squint at: the
         drawing has to carry itself now. */
      c.globalAlpha = P.dark ? 0.045 : 0.14;
      c.fillStyle = G.rgba(P.accent, 1);
      c.beginPath();
      c.arc(g.cx, g.cy, r + LO * K, 0, TAU);
      c.arc(g.cx, g.cy, r - LO * K, 0, TAU, true);
      c.fill();
      c.globalAlpha = P.dark ? 0.42 : 0.5;
      c.strokeStyle = G.rgba(P.accent, 1);
      c.lineWidth = Math.max(0.7, r * 0.002);
      [LO, LI].forEach(function (L) {
        c.beginPath(); c.arc(g.cx, g.cy, r + L * K, 0, TAU); c.stroke();
        c.beginPath(); c.arc(g.cx, g.cy, r - L * K, 0, TAU); c.stroke();
      });
      c.restore();
      rim(c, G, g.cx, g.cy, r, P, 0.9);
      c.save();
      c.globalAlpha = P.dark ? 0.72 : 0.85;
      c.fillStyle = G.rgba(P.dim, 1);
      c.textAlign = "center";
      c.font = (r * 0.068).toFixed(1) + "px " + SERIF;
      c.fillText("the ring is the Sun’s path · a dot’s distance " +
                 "from it is the Moon’s latitude",
                 g.cx, Math.min(g.cy + r * 1.33, R.y + R.h - r * 0.03));
      c.restore();
    },
    append: function (c, G, R, reel, P, from, to) {
      var g = geom("nodes", R, reel), r = g.r, K = r * 0.072;
      var ev = reel.events, i;
      c.save();
      c.strokeStyle = G.rgba(P.gold, 1);
      c.globalAlpha = P.dark ? 0.20 : 0.26;
      c.lineWidth = Math.max(0.8, r * 0.0032);
      c.beginPath();
      for (i = Math.max(0, from - 1); i < to; i++) {
        var e = ev[i];
        if (!isFinite(e.lon) || !isFinite(e.lat)) continue;
        var a = (e.lon - 90) * R2, q = r + e.lat * K;
        var x = g.cx + Math.cos(a) * q, y = g.cy + Math.sin(a) * q;
        if (i > Math.max(0, from - 1)) c.lineTo(x, y); else c.moveTo(x, y);
      }
      c.stroke();
      c.restore();
      for (i = from; i < to; i++) {
        var e2 = ev[i];
        if (!isFinite(e2.lon) || !isFinite(e2.lat)) continue;
        var a2 = (e2.lon - 90) * R2, q2 = r + e2.lat * K;
        var x2 = g.cx + Math.cos(a2) * q2, y2 = g.cy + Math.sin(a2) * q2;
        if (e2.band === "central")
          G.dot(c, x2, y2, r * 0.016, P.hot, 0.95);
        else
          G.dot(c, x2, y2, r * 0.0105,
                e2.band === "partial" ? P.accent : P.gold,
                e2.band === "partial" ? 0.92 : 0.70);
      }
    },
    live: function (c, G, R, reel, P, now, idx, k, p) {
      var g = geom("nodes", R, reel), r = g.r, K = r * 0.072;
      if (reel.nodeAt) {
        var nl = reel.nodeAt(now.t);
        if (nl != null) {
          var a0 = (nl - 90) * R2, R1 = r * 1.28;
          c.save();
          c.globalAlpha = 0.5;
          c.strokeStyle = G.rgba(P.accent, 0.9);
          c.lineWidth = Math.max(1, r * 0.0045);
          c.beginPath();
          c.moveTo(g.cx + Math.cos(a0) * R1, g.cy + Math.sin(a0) * R1);
          c.lineTo(g.cx - Math.cos(a0) * R1, g.cy - Math.sin(a0) * R1);
          c.stroke();
          c.restore();
          G.dot(c, g.cx + Math.cos(a0) * r, g.cy + Math.sin(a0) * r,
                r * 0.013, P.accent, 0.9);
          G.dot(c, g.cx - Math.cos(a0) * r, g.cy - Math.sin(a0) * r,
                r * 0.013, P.accent, 0.9);
        }
      }
      /* the Moon itself, at its real phase for this instant — a new Moon
         reel shows a new Moon, which is the kind of thing that was being
         thrown away by drawing a star */
      if (idx >= 0 && idx < reel.events.length) {
        var e = reel.events[idx];
        if (isFinite(e.lon) && isFinite(e.lat)) {
          var a3 = (e.lon - 90) * R2, q3 = r + e.lat * K;
          var x = g.cx + Math.cos(a3) * q3, y = g.cy + Math.sin(a3) * q3;
          if (e.band === "central") G.glow(c, x, y, r * 0.030, P.hot,
            { reach: 2.6, core: 0.5 });
          /* AT AMĀVĀSYĀ THE MOON IS UNLIT, and an unlit disc on a dark
             ground is a hole punched in the frame. The sky solves this the
             same way: earthshine, the thin ash-grey ring that is the only
             reason anyone has ever seen a new Moon at all. */
          drawBody(c, G, "Moon", x, y, r * 0.040, P,
                   { phase: reel.full ? 180 : 0, progress: p,
                     earthshine: !reel.full });
        }
      }
      /* the Earth, which all of this is seen from */
      drawBody(c, G, "Earth", g.cx, g.cy, r * 0.026, P, {});
    }
  };

  /* --- 2. the thread -------------------------------------------------------
     A line between two planets every few days, never rubbed out. The
     envelope is a fact about the ratio of their periods and about nothing
     else — no curve is fitted and no symmetry imposed. */
  var S_thread = {
    base: function (c, G, R, reel, P) {
      var g = geom("thread", R, reel);
      rim(c, G, g.cx, g.cy, g.r, P, P.dark ? 0.40 : 0.85);
    },
    append: function (c, G, R, reel, P, from, to) {
      var g = geom("thread", R, reel), S = reel.thread;
      var scale = g.r * 0.97 / S.maxR;
      c.save();
      c.strokeStyle = G.rgba(P.gold, 1);
      c.globalAlpha = S.alpha;
      c.lineWidth = Math.max(0.55, g.r * 0.0016);
      c.beginPath();
      for (var i = from; i < to; i++) {
        c.moveTo(g.cx + S.a[i].x * scale, g.cy + S.a[i].y * scale);
        c.lineTo(g.cx + S.b[i].x * scale, g.cy + S.b[i].y * scale);
      }
      c.stroke();
      c.restore();
    },
    live: function (c, G, R, reel, P, now, idx, k, p) {
      var g = geom("thread", R, reel), S = reel.thread;
      var scale = g.r * 0.97 / S.maxR;
      if (k > 0) {
        var j = k - 1;
        var ax = g.cx + S.a[j].x * scale, ay = g.cy + S.a[j].y * scale;
        var bx = g.cx + S.b[j].x * scale, by = g.cy + S.b[j].y * scale;
        c.save();
        c.strokeStyle = G.rgba(P.hot, 0.9);
        c.globalAlpha = P.dark ? 0.85 : 0.7;
        c.lineWidth = Math.max(1.1, g.r * 0.0055);
        c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
        c.restore();
        drawBody(c, G, S.aName, ax, ay, g.r * 0.030, P, { progress: p });
        drawBody(c, G, S.bName, bx, by, g.r * 0.036, P, { progress: p });
      }
      drawBody(c, G, "Sun", g.cx, g.cy, g.r * 0.040, P, { progress: p });
    }
  };

  /* --- 3. the whirl --------------------------------------------------------
     One bead per event at the longitude it happened, spiralling in. When the
     events advance by a near-constant angle they fall into arms, and the arm
     count is a fact about the ratio of two periods. */
  var S_whirl = {
    base: function (c, G, R, reel, P) {
      var g = geom("whirl", R, reel);
      rim(c, G, g.cx, g.cy, g.r, P, 0.85);
    },
    append: function (c, G, R, reel, P, from, to) {
      var g = geom("whirl", R, reel), ev = reel.events, n = ev.length;
      var big = n < 60;
      for (var i = from; i < to; i++) {
        var q = g.r * (0.90 - 0.56 * (n > 1 ? i / (n - 1) : 0));
        var a = (ev[i].lon - 90) * R2;
        G.dot(c, g.cx + Math.cos(a) * q, g.cy + Math.sin(a) * q,
              g.r * (big ? 0.016 : 0.0105),
              ev[i].marked ? P.hot : P.gold, P.dark ? 0.88 : 0.9);
      }
    },
    live: function (c, G, R, reel, P, now, idx, k, p) {
      var g = geom("whirl", R, reel), ev = reel.events, n = ev.length;
      if (idx >= 0 && idx < n) {
        var q = g.r * (0.90 - 0.56 * (n > 1 ? idx / (n - 1) : 0));
        var a = (ev[idx].lon - 90) * R2;
        var x = g.cx + Math.cos(a) * q, y = g.cy + Math.sin(a) * q;
        G.glow(c, x, y, g.r * 0.022, P.hot, { reach: 2.8, core: 0.6 });
        if (reel.bodyName)
          drawBody(c, G, reel.bodyName, x, y, g.r * 0.034, P, { progress: p });
      }
      drawBody(c, G, "Sun", g.cx, g.cy, g.r * 0.030, P, { progress: p });
    }
  };

  /* --- 4. the loops --------------------------------------------------------
     The path of one graha as it is actually seen: longitude against real
     distance, so a retrograde is a loop rather than a line that reverses. */
  var S_loops = {
    base: function (c, G, R, reel, P) {
      var g = geom("loops", R, reel);
      rim(c, G, g.cx, g.cy, g.r, P, P.dark ? 0.55 : 0.85);
    },
    append: function (c, G, R, reel, P, from, to) {
      var g = geom("loops", R, reel), T = reel.track;
      var span = T.rMax - T.rMin || 1;
      c.save();
      c.globalAlpha = P.dark ? 0.78 : 0.85;
      c.strokeStyle = G.rgba(P.gold, 1);
      c.lineWidth = Math.max(1, g.r * 0.0038);
      c.beginPath();
      for (var i = Math.max(0, from - 1); i < to; i++) {
        var a = (T.lon[i] - 90) * R2;
        var q = g.r * (0.40 + 0.55 * (1 - (T.r[i] - T.rMin) / span));
        var x = g.cx + Math.cos(a) * q, y = g.cy + Math.sin(a) * q;
        if (i > Math.max(0, from - 1)) c.lineTo(x, y); else c.moveTo(x, y);
      }
      c.stroke();
      c.restore();
    },
    live: function (c, G, R, reel, P, now, idx, k, p) {
      var g = geom("loops", R, reel), T = reel.track;
      var span = T.rMax - T.rMin || 1;
      if (k > 0) {
        var j = k - 1;
        var a = (T.lon[j] - 90) * R2;
        var q = g.r * (0.40 + 0.55 * (1 - (T.r[j] - T.rMin) / span));
        var x = g.cx + Math.cos(a) * q, y = g.cy + Math.sin(a) * q;
        drawBody(c, G, reel.bodyName || "Mars", x, y, g.r * 0.038, P,
                 { progress: p });
      }
      drawBody(c, G, "Earth", g.cx, g.cy, g.r * 0.022, P, {});
    }
  };

  /* --- 5. the drift --------------------------------------------------------
     Two engines asked the same question; the ring is where the modern
     ephemeris puts the graha and the dot's distance from it is how far the
     Sūrya Siddhānta puts it somewhere else. The scale is measured from the
     run and printed, because a deviation plot without its scale is a shape
     rather than a measurement. */
  var S_drift = {
    base: function (c, G, R, reel, P) {
      var g = geom("drift", R, reel), r = g.r, D = reel.drift;
      var K = r * 0.34 / Math.max(0.25, D.scale);
      c.save();
      c.globalAlpha = P.dark ? 0.45 : 0.75;
      c.strokeStyle = G.rgba(P.accent, 0.8);
      c.lineWidth = Math.max(1, r * 0.004);
      c.beginPath(); c.arc(g.cx, g.cy, r, 0, TAU); c.stroke();
      c.globalAlpha = P.dark ? 0.14 : 0.3;
      c.strokeStyle = G.rgba(P.line, 1);
      c.lineWidth = Math.max(0.6, r * 0.002);
      [-1, 1].forEach(function (s) {
        for (var k = 1; k <= 3; k++) {
          c.beginPath();
          c.arc(g.cx, g.cy, r + s * k * (D.scale / 3) * K, 0, TAU);
          c.stroke();
        }
      });
      c.restore();
      rim(c, G, g.cx, g.cy, g.rim, P, 0.6);
      c.save();
      c.globalAlpha = P.dark ? 0.55 : 0.85;
      c.fillStyle = G.rgba(P.dim, 1);
      c.textAlign = "center";
      c.font = (g.rim * 0.048).toFixed(1) + "px " + SERIF;
      plain(c);
      c.fillText("the ring is the modern place · each step out is " +
                 (D.scale / 3).toFixed(1) + "°",
                 g.cx, Math.min(g.cy + g.rim * 1.30, R.y + R.h - g.rim * 0.01));
      c.restore();
    },
    append: function (c, G, R, reel, P, from, to) {
      var g = geom("drift", R, reel), r = g.r, D = reel.drift;
      var K = r * 0.34 / Math.max(0.25, D.scale);
      c.save();
      c.globalAlpha = P.dark ? 0.8 : 0.95;
      c.strokeStyle = G.rgba(P.gold, 1);
      c.lineWidth = Math.max(1, r * 0.005);
      c.beginPath();
      for (var i = Math.max(0, from - 1); i < to; i++) {
        var a = (D.lon[i] - 90) * R2, q = r + D.err[i] * K;
        var x = g.cx + Math.cos(a) * q, y = g.cy + Math.sin(a) * q;
        if (i > Math.max(0, from - 1)) c.lineTo(x, y); else c.moveTo(x, y);
      }
      c.stroke();
      c.restore();
    },
    live: function (c, G, R, reel, P, now, idx, k, p) {
      var g = geom("drift", R, reel), r = g.r, D = reel.drift;
      var K = r * 0.34 / Math.max(0.25, D.scale);
      if (k > 0) {
        var j = k - 1;
        var a = (D.lon[j] - 90) * R2, q = r + D.err[j] * K;
        var x = g.cx + Math.cos(a) * q, y = g.cy + Math.sin(a) * q;
        c.save();
        c.strokeStyle = G.rgba(P.hot, 0.75);
        c.globalAlpha = P.dark ? 0.8 : 0.6;
        c.lineWidth = Math.max(1, r * 0.005);
        c.beginPath();
        c.moveTo(g.cx + Math.cos(a) * r, g.cy + Math.sin(a) * r);
        c.lineTo(x, y);
        c.stroke();
        c.restore();
        G.dot(c, g.cx + Math.cos(a) * r, g.cy + Math.sin(a) * r,
              r * 0.011, P.accent, 0.85);
        drawBody(c, G, reel.bodyName || "Jupiter", x, y, r * 0.034, P,
                 { progress: p });
      }
      drawBody(c, G, "Earth", g.cx, g.cy, r * 0.018, P, {});
    }
  };

  /* --- 6. a simulated orbit ------------------------------------------------ */
  var S_orbit = {
    base: function (c, G, R, reel, P) {
      var g = geom("orbit", R, reel), O = reel.orbit;
      var K = g.r * 0.92 / Math.max(1e-9, O.extent);
      c.save();
      c.globalAlpha = P.dark ? 0.3 : 0.5;
      c.strokeStyle = G.rgba(P.line, 1);
      c.lineWidth = Math.max(0.6, g.r * 0.002);
      c.beginPath();
      c.arc(g.cx, g.cy, Math.max(2, O.earthR * K), 0, TAU);
      c.stroke();
      c.restore();
    },
    append: function (c, G, R, reel, P, from, to) {
      var g = geom("orbit", R, reel), O = reel.orbit;
      var K = g.r * 0.92 / Math.max(1e-9, O.extent);
      c.save();
      c.globalAlpha = P.dark ? 0.7 : 0.9;
      c.strokeStyle = G.rgba(P.gold, 1);
      c.lineWidth = Math.max(1, g.r * 0.0038);
      c.beginPath();
      for (var i = Math.max(0, from - 1); i < to; i++) {
        var x = g.cx + O.x[i] * K, y = g.cy + O.y[i] * K;
        if (i > Math.max(0, from - 1)) c.lineTo(x, y); else c.moveTo(x, y);
      }
      c.stroke();
      c.restore();
    },
    live: function (c, G, R, reel, P, now, idx, k, p) {
      var g = geom("orbit", R, reel), O = reel.orbit;
      var K = g.r * 0.92 / Math.max(1e-9, O.extent);
      var j = Math.max(0, k - 1);
      if (O.sun) {
        var sa = Math.atan2(O.sun.y[j], O.sun.x[j]);
        c.save();
        c.globalAlpha = 0.4;
        c.strokeStyle = G.rgba(P.accent, 1);
        c.setLineDash([g.r * 0.03, g.r * 0.03]);
        c.lineWidth = Math.max(1, g.r * 0.0035);
        c.beginPath();
        c.moveTo(g.cx, g.cy);
        c.lineTo(g.cx + Math.cos(sa) * g.r * 1.04, g.cy + Math.sin(sa) * g.r * 1.04);
        c.stroke();
        c.restore();
        c.save();
        c.globalAlpha = 0.6;
        c.fillStyle = G.rgba(P.accent, 1);
        c.textAlign = "center";
        c.font = (g.r * 0.058).toFixed(1) + "px " + SERIF;
        plain(c);
        c.fillText("to the Sun", g.cx + Math.cos(sa) * g.r * 1.16,
                   g.cy + Math.sin(sa) * g.r * 1.16);
        c.restore();
      }
      drawBody(c, G, "Moon", g.cx + O.x[j] * K, g.cy + O.y[j] * K,
               g.r * 0.034, P, { progress: p, phase: 150 });
      drawBody(c, G, "Earth", g.cx, g.cy, g.r * 0.030, P, {});
    }
  };

  /* ---- bodies ------------------------------------------------------------
     One call site, so every stage gets the same treatment and the fallback
     is in one place. The Earth has no texture in the body renderer, so it is
     drawn as the blue disc it is. */
  function drawBody(c, G, name, x, y, r, P, opt) {
    opt = opt || {};
    if (!isFinite(x) || !isFinite(y) || !(r > 0)) return;
    if (name === "Earth") {
      c.save();
      c.globalCompositeOperation = "source-over";
      var g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
      g.addColorStop(0, "#9fd0ff");
      g.addColorStop(0.55, "#4f7fc4");
      g.addColorStop(1, "#24406e");
      c.fillStyle = g;
      c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      c.restore();
      return;
    }
    if (window.SPBody && window.SPBody.ready()) {
      var spin = window.SPBody.spinFor(name, opt.progress || 0, r);
      window.SPBody.draw(c, name, x, y, r, {
        phase: opt.phase, spinDeg: spin,
        halo: P.dark ? (name === "Sun" ? 0.55 : 0.22) : 0,
        haloCol: name === "Sun" ? P.warm : P.hot,
        haloReach: name === "Sun" ? 3.0 : 2.1,
        fallback: P.gold
      });
      return;
    }
    G.glow(c, x, y, r, name === "Sun" ? P.warm : P.gold,
           { reach: 2.4, core: 0.5 });
  }

  var STAGES = { nodes: S_nodes, thread: S_thread, whirl: S_whirl,
                 loops: S_loops, drift: S_drift, orbit: S_orbit };

  /* how many items a stage has, and how many of them have happened by `now` */
  function countOf(reel) {
    switch (reel.stage) {
      case "thread": return reel.thread.t.length;
      case "loops": return reel.track.t.length;
      case "drift": return reel.drift.t.length;
      case "orbit": return reel.orbit.t.length;
      default: return reel.events.length;
    }
  }
  function timesOf(reel) {
    switch (reel.stage) {
      case "thread": return reel.thread.t;
      case "loops": return reel.track.t;
      case "drift": return reel.drift.t;
      case "orbit": return reel.orbit.t;
      default: return null;
    }
  }
  function shownBy(reel, t) {
    var ts = timesOf(reel);
    if (!ts) {
      var k = 0, ev = reel.events;
      while (k < ev.length && ev[k].t <= t) k++;
      return k;
    }
    var n = 0;
    /* a binary search, because this is called every frame and a linear walk
       over fifteen hundred samples is work the cache was built to avoid */
    var lo = 0, hi = ts.length;
    while (lo < hi) {
      var mid = (lo + hi) >> 1;
      if (ts[mid] <= t) lo = mid + 1; else hi = mid;
    }
    n = lo;
    return n;
  }

  /* ---- the trail ----------------------------------------------------------
     A canvas holding the stage's base and everything appended so far. It is
     rebuilt only when it cannot be appended to: a different reel, a
     different size or palette, or a playhead that moved backwards. */
  var TRAIL = null, TKEY = "", TN = 0;
  function trailFor(reel, W, H, R, P, upto) {
    var G = window.SPGlow;
    var key = reel.key + "|" + reel.t0 + "|" + reel.seconds + "|" + W + "x" + H +
              "|" + P.key + "|" + reel.stage;
    if (!TRAIL || TRAIL.width !== W || TRAIL.height !== H) {
      TRAIL = G.fresh(W, H); TKEY = ""; TN = 0;
    }
    var c = TRAIL.getContext("2d");
    var S = STAGES[reel.stage] || S_whirl;
    /* THE TRAIL MUST BE A FUNCTION OF THE PLAYHEAD AND NOTHING ELSE.

       Appending is exact for the marks, which are drawn once each, but not
       quite for the polylines: a path split into two strokes paints the
       joining vertex in both, and under additive blending that vertex comes
       out brighter. So the same playhead reached by playing differed, by a
       few pixels at a few joints, from the same playhead reached by
       scrubbing — which the determinism check caught and which a recorder
       would eventually have shown as a flicker.

       Playback steps the trail forward by a fraction of a percent a frame,
       so appending stays worth having. Anything larger than a small step —
       a scrub, a jump, a new reel — rebuilds from zero, which costs one
       frame and makes (reel, p) decide the picture outright. */
    var step = upto - TN;
    var jump = step < 0 || step > Math.max(4, countOf(reel) * 0.08);
    if (TKEY !== key || jump) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalCompositeOperation = "source-over";
      c.globalAlpha = 1;
      c.clearRect(0, 0, W, H);
      c.save();
      if (P.dark) { c.globalCompositeOperation = "lighter"; c.lineCap = "round"; }
      S.base(c, G, R, reel, P);
      c.restore();
      TKEY = key; TN = 0;
    }
    if (upto > TN) {
      c.save();
      if (P.dark) { c.globalCompositeOperation = "lighter"; c.lineCap = "round"; }
      S.append(c, G, R, reel, P, TN, upto);
      c.restore();
      TN = upto;
    }
    return TRAIL;
  }
  function trailReset() { TKEY = ""; TN = 0; }
  function trailState() { return { key: TKEY, n: TN }; }

  /* ---- the frame ==========================================================
     ONE definition of "the frame at p", as everywhere else in this codebase,
     so preview, playback, recorder and still export cannot diverge.

     Two render paths, because the palettes are not variations on each other.
     A DARK palette is an exposure: strokes are added, the sum is bloomed, and
     the floor must be dark for light to be added to. PAPER is not — it is
     ink and wash on a sheet, laid down with ordinary alpha, and running it
     through an additive pipeline would turn the ochre line white. So the
     trail is composited one way or the other, and everything above it is the
     same either way. */
  function frameAt(c, W, H, reel, p) {
    var G = window.SPGlow, P = reel.pal, B = bands(W, H);
    p = clamp(p, 0, 1);
    var now = clockAt(reel.tl, p);

    var idx = -1;
    for (var i = 0; i < reel.events.length; i++)
      if (reel.events[i].t <= now.t) idx = i; else break;
    var k = shownBy(reel, now.t);

    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = "source-over";
    c.globalAlpha = 1;

    if (P.dark) {
      c.fillStyle = P.bg;
      c.fillRect(0, 0, W, H);
      backdrop(c, W, H, P, reel.seed);
    } else {
      G.wash(c, W, H, P.wash, reel.seed || 7);
    }

    var trail = trailFor(reel, W, H, B.stage, P, k);
    if (P.dark) {
      G.develop(c, trail, { gain: 1, tight: reel.bloomTight,
                            wide: reel.bloomWide,
                            rect: { x: 0, y: B.stage.y - H * 0.03,
                                    w: W, h: B.stage.h + H * 0.07 } });
    } else {
      c.save();
      c.globalCompositeOperation = "source-over";
      c.drawImage(trail, 0, 0);
      c.restore();
    }

    /* the live layer: the moving head, drawn fresh. It is a handful of
       shapes, so it costs nothing and does not need the cache. */
    var S = STAGES[reel.stage] || S_whirl;
    if (S.live) {
      c.save();
      S.live(c, G, B.stage, reel, P, now, idx, k, p);
      c.restore();
    }

    if (P.dark && reel.grade > 0.002) G.grade(c, W, H, reel.grade);

    drawTitle(c, W, H, B, reel, P, p);
    if (now.phase !== "close") {
      drawClock(c, W, H, B, reel, P, now);
      drawCaption(c, W, H, B, reel, P, now, idx);
      drawTally(c, W, H, B, reel, P, idx);
    } else {
      drawClosing(c, W, H, B, reel, P, now.closeP);
    }
    drawFoot(c, W, H, B, reel, P, p);

    return now;
  }

  /* a faint star field and a central warmth, cached: a field rebuilt per
     frame is both slow and, because it is reseeded, visibly boiling */
  var BACK = null, BACKKEY = "";
  function backdrop(c, W, H, P, seed) {
    var G = window.SPGlow;
    var key = W + "x" + H + "|" + P.key + "|" + seed;
    if (BACKKEY !== key) {
      BACK = G.fresh(W, H);
      var cc = BACK.getContext("2d");
      var s = (seed || 7) >>> 0;
      cc.globalAlpha = 0.5;
      for (var i = 0; i < 150; i++) {
        s = (s * 1664525 + 1013904223) >>> 0;
        var x = (s >>> 8) % W;
        s = (s * 1664525 + 1013904223) >>> 0;
        var y = (s >>> 8) % H;
        s = (s * 1664525 + 1013904223) >>> 0;
        var b = 0.08 + ((s >>> 16) % 100) / 100 * 0.30;
        cc.fillStyle = G.rgba(P.ink, b);
        cc.fillRect(x, y, 1.1, 1.1);
      }
      cc.globalAlpha = 1;
      var g = cc.createRadialGradient(W / 2, H * 0.40, 0, W / 2, H * 0.40, W * 0.72);
      g.addColorStop(0, G.rgba(P.gold, 0.045));
      g.addColorStop(1, G.rgba(P.gold, 0));
      cc.fillStyle = g;
      cc.fillRect(0, 0, W, H);
      /* the vignette and the grain belong to the GROUND, not to the frame:
         neither of them changes from one frame to the next, and laying them
         over the finished picture cost two megapixels of blending twice a
         frame for a texture that stands still */
      G.vignette(cc, W, H, 0.34);
      G.grainInto(cc, W, H, 0.05, 3, "overlay");
      BACKKEY = key;
    }
    c.drawImage(BACK, 0, 0);
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
    /* the mark first: an unbranded first second and a half is the kind of
       thing nobody sees until the file is posted */
    return markReady().then(function () {
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
    });
  }
  var RECJOB = null;
  function cancelRecording() { if (RECJOB) RECJOB.cancel = true; }
  function isRecording() { return !!RECJOB; }

  window.SPReel = {
    record: record, markReady: markReady, mark: function () { return MARK; },
    resetTrail: trailReset, trailState: trailState, cancelRecording: cancelRecording, isRecording: isRecording,
    PALETTES: PALETTES, pal: pal, bands: bands, frameAt: frameAt,
    buildTimeline: buildTimeline, clockAt: clockAt,
    SERIF: SERIF, RASHI: RASHI, dateCaps: dateCaps,
    tracked: tracked, fitTracked: fitTracked, wrapTo: wrapTo,
    norm: norm, clamp: clamp, smooth: smooth, DAY: DAY
  };
})();
