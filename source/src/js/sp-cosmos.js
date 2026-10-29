/* ===== The sky behind the page, and the moment of casting ================

   WHY THIS EXISTS. A chart is a photograph of the sky at one instant, and
   the builder was presenting it the way a bank presents a statement. The
   arithmetic was never the problem; the page simply did not look like what
   it was about. Two things fix most of that: something living behind the
   content, and a moment of ceremony when the chart is actually cast.

   THE PART THAT IS TRUE RATHER THAN DECORATIVE. The casting animation does
   not play a canned swirl. It takes the nine grahas where they ARE right
   now, takes them where they WERE at the birth instant, and winds them
   between the two along their real sidereal longitudes while the date
   counts back. Someone born in 1984 watches Śani crawl and Candra race,
   because that is what those two did over those years. The arcs are drawn
   from the same ephemeris that casts the chart. It is a loading screen
   that happens to be an orrery, and it tells the truth.

   WHAT IT COSTS. The starfield is one canvas, drawn once and then only
   rotated by a cheap transform — no per-frame particle maths — and it
   pauses entirely when the tab is hidden or the user has asked for reduced
   motion. The ceremony runs for a bounded time and dismisses itself on a
   timeout even if the chart never arrives, because a decorative overlay
   that can trap a reader is not decorative, it is a bug.

   ON LIGHT PALETTES there are no stars. A starfield on Rishi Paper would
   be a nonsense, so the backdrop only mounts for the dark palettes, and
   everything else here — the glass, the ornaments, the glow on the chart —
   adapts rather than switching off. */

(function () {
  "use strict";

  function calm() {
    try {
      return window.matchMedia &&
             window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) { return false; }
  }
  function darkTheme() {
    var t = document.documentElement.getAttribute("data-theme");
    return t === "midnight" || t === "peetambari" || t === "emerald";
  }

  /* ---- 1. the starfield ---------------------------------------------------
     Stars are drawn once into an offscreen canvas at twice the visible
     size, then that single bitmap is blitted with a slow rotation. One
     draw call a frame instead of twelve hundred, which is the difference
     between a backdrop and a fan heater. */
  var CV = null, CTX = null, STARS = null, RAF = null, T0 = 0;

  function makeStars(w, h) {
    var off = document.createElement("canvas");
    off.width = w; off.height = h;
    var c = off.getContext("2d");
    var n = Math.round(Math.min(900, (w * h) / 2600));
    /* a deterministic scatter: the same page always has the same sky, so
       a reload does not reshuffle the stars in front of the reader */
    var seed = 20260101;
    function rnd() {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    }
    for (var i = 0; i < n; i++) {
      var x = rnd() * w, y = rnd() * h;
      var r = rnd();
      var size = r > 0.985 ? 1.9 : (r > 0.9 ? 1.25 : 0.75);
      var a = 0.18 + rnd() * 0.55;
      /* a few warm ones among the cold, which is what a real field looks
         like and what keeps it from reading as noise */
      var warm = rnd() > 0.86;
      c.beginPath();
      c.arc(x, y, size, 0, 6.2832);
      c.fillStyle = warm ? "rgba(255,226,170," + a + ")"
                         : "rgba(214,228,255," + a + ")";
      c.fill();
    }
    return off;
  }

  function sizeCanvas() {
    if (!CV) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = window.innerWidth, h = window.innerHeight;
    CV.width = Math.round(w * dpr);
    CV.height = Math.round(h * dpr);
    CV.style.width = w + "px";
    CV.style.height = h + "px";
    CTX = CV.getContext("2d");
    CTX.setTransform(dpr, 0, 0, dpr, 0, 0);
    /* the star bitmap is square and oversized so a rotation never shows a
       corner */
    var d = Math.ceil(Math.sqrt(w * w + h * h)) + 40;
    STARS = makeStars(d, d);
  }

  function frame(ts) {
    RAF = null;
    if (!CTX || !STARS) return;
    if (!T0) T0 = ts;
    var t = (ts - T0) / 1000;
    var w = window.innerWidth, h = window.innerHeight;
    CTX.clearRect(0, 0, w, h);
    CTX.save();
    CTX.translate(w / 2, h / 2);
    /* one revolution in roughly twenty minutes: perceptible if you watch
       for it, invisible if you are reading */
    CTX.rotate(t * 0.0052);
    CTX.globalAlpha = 1;
    CTX.drawImage(STARS, -STARS.width / 2, -STARS.height / 2);
    CTX.restore();
    schedule();
  }
  function schedule() {
    if (RAF || document.hidden || calm()) return;
    RAF = requestAnimationFrame(frame);
  }

  function mountSky() {
    /* The desktop app lays a real material behind the window, and an opaque
       canvas of stars on top of it would hide the thing entirely. The class is
       only ever present in the --app build, so the website is unaffected. */
    if (document.documentElement.classList.contains("app")) return;
    if (CV || !darkTheme()) return;
    CV = document.createElement("canvas");
    CV.className = "cosmos";
    CV.setAttribute("aria-hidden", "true");
    document.body.insertBefore(CV, document.body.firstChild);
    sizeCanvas();
    if (calm()) {
      /* reduced motion still gets the sky, it simply does not turn */
      var w = window.innerWidth, h = window.innerHeight;
      CTX.save();
      CTX.translate(w / 2, h / 2);
      CTX.drawImage(STARS, -STARS.width / 2, -STARS.height / 2);
      CTX.restore();
    } else schedule();
  }
  function unmountSky() {
    if (!CV) return;
    if (RAF) { cancelAnimationFrame(RAF); RAF = null; }
    CV.parentNode && CV.parentNode.removeChild(CV);
    CV = null; CTX = null; STARS = null; T0 = 0;
  }
  function syncSky() {
    if (darkTheme()) mountSky(); else unmountSky();
  }

  /* ---- 2. the casting ceremony ------------------------------------------- */
  var BODIES = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus",
                "Saturn", "Rahu", "Ketu"];
  var GLYPH = { Sun: "☉", Moon: "☾", Mars: "♂", Mercury: "☿", Jupiter: "♃",
                Venus: "♀", Saturn: "♄", Rahu: "☊", Ketu: "☋" };
  var HUE = { Sun: "#f6b73c", Moon: "#cfd8ea", Mars: "#e4674a",
              Mercury: "#67d08a", Jupiter: "#f2c76b", Venus: "#8fd2e8",
              Saturn: "#9aa6c8", Rahu: "#a78bd0", Ketu: "#c58a6a" };

  function sidAt(name, date) {
    try { return window.__kSidAt(name, date); } catch (e) { return null; }
  }

  var OVER = null, OVRAF = null, OVDONE = null;

  function ceremony(birthDate, opts) {
    opts = opts || {};
    if (OVER) return;                    /* one at a time */
    var now = new Date();
    if (!(birthDate instanceof Date) || isNaN(birthDate.getTime()))
      birthDate = now;

    var from = {}, to = {}, anyKnown = false;
    BODIES.forEach(function (b) {
      var a = sidAt(b, now), z = sidAt(b, birthDate);
      if (a != null && z != null) { from[b] = a; to[b] = z; anyKnown = true; }
    });
    if (!anyKnown) return;               /* no engine, no ceremony */

    var reduced = calm();
    OVER = document.createElement("div");
    OVER.className = "castover";
    OVER.setAttribute("role", "status");
    OVER.setAttribute("aria-live", "polite");
    OVER.innerHTML =
      '<div class="castinner">' +
      '<div class="castwheelwrap"><svg class="castwheel" viewBox="-130 -130 260 260" aria-hidden="true">' +
      '<circle class="castring" r="104"/><circle class="castring2" r="86"/>' +
      '<g class="castspokes"></g><g class="casttrails"></g><g class="castbodies"></g>' +
      '</svg></div>' +
      '<p class="castline" id="cast-line">जन्म-क्षण की ओर लौट रहा है आकाश…</p>' +
      '<p class="castsub">Winding the sky back to the birth moment</p>' +
      '<p class="castdate" id="cast-date"></p>' +
      '<p class="casthint">Every position below is computed, not animated — ' +
      'each graha is moving along its own real longitude.</p>' +
      '</div>';
    document.body.appendChild(OVER);
    document.body.classList.add("casting");

    var svg = OVER.querySelector(".castwheel");
    var spokes = svg.querySelector(".castspokes");
    var trails = svg.querySelector(".casttrails");
    var bodies = svg.querySelector(".castbodies");
    var NS = "http://www.w3.org/2000/svg";
    /* twelve spokes: the rāśi boundaries, so the ring is a zodiac rather
       than a spinner */
    for (var i = 0; i < 12; i++) {
      var a = (i * 30 - 90) * Math.PI / 180;
      var l = document.createElementNS(NS, "line");
      l.setAttribute("x1", (Math.cos(a) * 86).toFixed(2));
      l.setAttribute("y1", (Math.sin(a) * 86).toFixed(2));
      l.setAttribute("x2", (Math.cos(a) * 104).toFixed(2));
      l.setAttribute("y2", (Math.sin(a) * 104).toFixed(2));
      l.setAttribute("class", "castspoke");
      spokes.appendChild(l);
    }
    var marks = {};
    BODIES.forEach(function (b, k) {
      if (from[b] == null) return;
      var g = document.createElementNS(NS, "g");
      g.setAttribute("class", "castbody");
      var c = document.createElementNS(NS, "circle");
      c.setAttribute("r", b === "Sun" ? 6.5 : (b === "Moon" ? 5.5 : 4.2));
      c.setAttribute("fill", HUE[b] || "#fff");
      var t = document.createElementNS(NS, "text");
      t.setAttribute("class", "castglyph");
      t.setAttribute("y", -9);
      t.setAttribute("fill", HUE[b] || "#fff");
      t.textContent = GLYPH[b] || "";
      g.appendChild(c); g.appendChild(t);
      bodies.appendChild(g);
      var tr = document.createElementNS(NS, "path");
      tr.setAttribute("class", "casttrail");
      tr.setAttribute("stroke", HUE[b] || "#fff");
      trails.appendChild(tr);
      marks[b] = { g: g, trail: tr, r: 58 + (k % 5) * 9 };
    });

    var dateEl = OVER.querySelector("#cast-date");
    var DUR = reduced ? 420 : (opts.ms || 2400);
    var start = null;
    var msFrom = now.getTime(), msTo = birthDate.getTime();

    function place(p) {
      /* ease so it settles rather than stopping dead */
      var e = p >= 1 ? 1 : 1 - Math.pow(1 - p, 3);
      BODIES.forEach(function (b) {
        var m = marks[b];
        if (!m) return;
        /* interpolate along the SHORT way round, which is the direction
           the body actually travelled when the span is under a turn, and
           is visually right for longer ones too */
        var d = to[b] - from[b];
        while (d > 180) d -= 360;
        while (d < -180) d += 360;
        var lon = from[b] + d * e;
        var a = (lon - 90) * Math.PI / 180;
        var x = Math.cos(a) * m.r, y = Math.sin(a) * m.r;
        m.g.setAttribute("transform", "translate(" + x.toFixed(2) + "," +
          y.toFixed(2) + ")");
        /* the trail is the arc it has covered so far */
        var a0 = (from[b] - 90) * Math.PI / 180;
        var big = Math.abs(d * e) > 180 ? 1 : 0;
        var sweep = d > 0 ? 1 : 0;
        m.trail.setAttribute("d",
          "M" + (Math.cos(a0) * m.r).toFixed(2) + "," +
          (Math.sin(a0) * m.r).toFixed(2) +
          " A" + m.r + "," + m.r + " 0 " + big + " " + sweep + " " +
          x.toFixed(2) + "," + y.toFixed(2));
      });
      var ms = msFrom + (msTo - msFrom) * e;
      var d2 = new Date(ms);
      if (dateEl) dateEl.textContent = isNaN(d2.getTime()) ? "" :
        d2.toLocaleDateString(undefined,
          { year: "numeric", month: "short", day: "numeric" });
    }

    place(0);
    function step(ts) {
      OVRAF = null;
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / DUR);
      place(p);
      if (p < 1) { OVRAF = requestAnimationFrame(step); return; }
      OVER.classList.add("settled");
    }
    OVRAF = requestAnimationFrame(step);

    /* It dismisses when the chart lands, or on a hard ceiling if it never
       does. A loading veil that can outlive the thing it is veiling is not
       a flourish, it is a trap. */
    /* The chart usually lands in under half a second — faster than the
       animation it is waiting behind. Closing on arrival therefore cut the
       ceremony off a third of the way through, which made it read as a
       flicker rather than as a moment. The veil now lifts no earlier than
       the wind-back finishes, plus a beat to let the settled sky be seen.
       The ceiling is still there in case the chart never arrives. */
    var floorAt = Date.now() + DUR + (reduced ? 0 : 420);
    var ceiling = setTimeout(close, reduced ? 1200 : 9000);
    OVDONE = function () {
      var wait = Math.max(0, floorAt - Date.now());
      setTimeout(function () { clearTimeout(ceiling); close(); }, wait);
    };

    function close() {
      if (!OVER) return;
      if (OVRAF) { cancelAnimationFrame(OVRAF); OVRAF = null; }
      OVER.classList.add("gone");
      var node = OVER;
      OVER = null; OVDONE = null;
      document.body.classList.remove("casting");
      setTimeout(function () {
        node.parentNode && node.parentNode.removeChild(node);
      }, reduced ? 0 : 420);
    }
  }

  function endCeremony() {
    if (!OVDONE) return;
    var f = OVDONE;
    OVDONE = null;            /* claim it, so a polling caller fires once */
    f();
  }

  /* ---- 3. wiring ---------------------------------------------------------- */
  function birthFromForm() {
    var d = document.getElementById("k-dob");
    var t = document.getElementById("k-tob");
    var z = document.getElementById("k-tz");
    if (!d || !d.value) return null;
    var tm = (t && t.value) || "12:00";
    var off = parseFloat((z && z.value) || "0") || 0;
    var ms = Date.parse(d.value + "T" + (tm.length === 5 ? tm : "12:00") + ":00Z");
    if (isNaN(ms)) return null;
    return new Date(ms - off * 3600000);
  }

  function wire() {
    var go = document.getElementById("k-go");
    if (go && !go.__cosmos) {
      go.__cosmos = true;
      go.addEventListener("click", function () {
        var b = birthFromForm();
        if (b) ceremony(b);
      });
    }
    /* the chart's arrival is the cue to lift the veil */
    var seen = null;
    setInterval(function () {
      try {
        var D = window.__kApi && window.__kApi.chart && window.__kApi.chart();
        var id = D && D.jd;
        if (id && id !== seen) { seen = id; endCeremony(); }
      } catch (e) {}
    }, 220);
  }

  function boot() {
    syncSky();
    wire();
    window.addEventListener("nirayana:theme", syncSky);
    window.addEventListener("resize", function () {
      if (!CV) return;
      clearTimeout(sizeCanvas.__t);
      sizeCanvas.__t = setTimeout(function () { sizeCanvas(); schedule(); }, 180);
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { if (RAF) { cancelAnimationFrame(RAF); RAF = null; } }
      else schedule();
    });
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.SPCosmos = { ceremony: ceremony, end: endCeremony,
                      sky: syncSky, mount: mountSky, unmount: unmountSky };
})();
