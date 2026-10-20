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
  var PLACE = null;
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
    var palette = PALETTE, start = START, place = PLACE;
    BUILDING = true;
    play(false);
    note("Computing " + T.label + " — " + years + " years of ephemeris…");
    drawFrame();
    setTimeout(function () {
      var t = performance.now(), R = null;
      try {
        R = window.SPStories.build(key, {
          t0: start, years: years, seconds: seconds, palette: palette,
          place: place
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

  /* the note changes with the story, because the honest thing to say about
     the place differs between a reel that uses it and one that cannot */
  function placeNote() {
    var n = $("reel-placewhy");
    if (!n) return;
    var usesPlace = KEY && KEY.indexOf("fest.") === 0;
    n.textContent = usesPlace
      ? "This reel is computed for " + (PLACE ? PLACE.n : "—") +
        ". A tithi at sunrise is a local fact, so the festival's date is too " +
        "— and the frame says which place it used."
      : "A tithi at sunrise is a local fact, so a festival's date is too. " +
        "This reel does not depend on where you are; the festival ones do.";
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
            picker(); blurb(t); placeNote(); rebuild();
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

  /* WHICH EXPORTER, AND WHY IT MATTERS WHICH.

     The WebCodecs path stamps every frame with the time it belongs at, so
     the file is as long as the reel regardless of how long encoding takes.
     The MediaRecorder path stamps frames as they arrive, so the file is as
     long as the ENCODING took — three to four times too long, at seven to
     ten frames a second. The first is used wherever it exists; the second
     is kept for browsers without WebCodecs and says plainly what it is,
     because a file that is silently wrong is worse than one that warns. */
  function exact() {
    return !!(window.SPEncode && window.SPEncode.has());
  }
  /* Stop has to stop whichever one is running, and the button has to know
     when there is something to stop — two exporters, one control. */
  function busyNow() {
    return window.SPReel.isRecording() ||
           !!(window.SPEncode && window.SPEncode.busy());
  }
  function cancelAnyRecording() {
    if (window.SPEncode && window.SPEncode.busy()) window.SPEncode.cancel();
    if (window.SPReel.isRecording()) window.SPReel.cancelRecording();
  }
  function startRecording() {
    if (!REEL) return;
    if (window.SPReel.isRecording() ||
        (window.SPEncode && window.SPEncode.busy())) return;
    var cv = $("reel-canvas"), btn = $("reel-rec");
    play(false);
    var fps = +(($("reel-fps") || {}).value || 30);
    if (btn) btn.textContent = "Stop";
    var bar = $("reel-prog");
    function progress(p) { if (bar) bar.value = String(Math.round(p * 100)); }
    function paint(p) {
      P = p;
      window.SPReel.frameAt(cv.getContext("2d"), W, H, REEL, p);
    }
    function done(r) {
      if (btn) btn.textContent = "Record";
      if (!r || r.cancelled) { note(""); return; }
      var ext = (r.mime || "").indexOf("mp4") >= 0 ? "mp4" : "webm";
      save(r.blob, REEL.key.replace(/\./g, "-") + "." + ext);
      note(r.exact
        ? "Saved — " + r.seconds + "s at " + r.fps + " fps, " + r.codec +
          " in " + ext.toUpperCase() + "."
        : "Saved, but this browser cannot stamp frames, so the file runs " +
          "slower and longer than " + REEL.seconds + "s.", !r.exact);
    }
    function failed(e) {
      if (btn) btn.textContent = "Record";
      note((e && e.message) || "recording failed", true);
    }

    if (exact()) {
      note("Encoding — this takes longer than the reel; the file will be " +
           REEL.seconds + "s either way.");
      window.SPEncode.encode(cv, {
        seconds: REEL.seconds, fps: fps, drawAt: paint,
        onProgress: progress
      }).then(done).catch(failed);
      return;
    }
    note("Recording — keep this tab in front.");
    window.SPReel.record(cv, REEL.seconds, fps, function (p) {
      paint(p); progress(p);
    }, null).then(function (r) {
      r.exact = false;
      done(r);
    }).catch(failed);
  }

  /* ---- boot --------------------------------------------------------------- */
  function bind() {
    if (!$("reel-canvas")) return;
    if (!window.SPReel || !window.SPStories || !window.SPGlow) return;
    if (!window.SPStories.ready()) { setTimeout(bind, 160); return; }

    fit();
    picker();
    drawFrame();
    /* the mark is fetched once; the frame is redrawn when it lands so the
       preview and the export agree from the first frame onward */
    window.SPReel.markReady().then(function () { drawFrame(); });

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
    /* THE PLACE, for the reels that have one.

       A festival's date is the day whose sunrise carries a tithi, and
       sunrise is local — Dīvālī can fall on different Gregorian days in
       Abu Dhabi and in Kolkata. The orbit, thread and cycle reels have no
       place at all, and saying so is better than offering a control that
       does nothing: the note beside the picker says which reels it moves,
       and a reel that uses it prints the place on the frame. */
    var ph = $("reel-place");
    if (ph && window.NPlaces && window.NP) {
      var saved = window.NP.savedPlace();
      PLACE = saved || window.NP.PLACES[2] || window.NP.PLACES[0];
      window.NPlaces.picker({
        host: ph, value: PLACE, label: "Place",
        quick: (saved ? [saved] : []).concat(window.NP.PLACES),
        refMs: function () { return START; },
        onPick: function (p) {
          PLACE = p;
          try { window.NP.cacheClear(); } catch (e) {}
          placeNote();
          rebuild();
        }
      });
      placeNote();
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
      if (busyNow()) cancelAnyRecording();
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
        place: function (p) { PLACE = p; placeNote(); rebuild(); },
        placeName: function () { return PLACE ? PLACE.n : null; },
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
