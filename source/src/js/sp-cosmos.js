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

  var RASHI_SA = ["Meṣa","Vṛṣabha","Mithuna","Karka","Siṃha","Kanyā",
                  "Tulā","Vṛścika","Dhanus","Makara","Kumbha","Mīna"];
  /* drawn size of each graha on the ring, in viewBox units */
  var BODY_R = { Sun:26, Moon:20, Mars:15, Mercury:13, Jupiter:22,
                 Venus:17, Saturn:21, Rahu:13, Ketu:13 };

  /* ---- the graha sprites ---------------------------------------------------
     SPBody wraps 54-motion-bodies.js, which builds each surface per pixel and
     lights it. One sprite per graha, converted to a data URI once and then
     scaled by the SVG — the lighting does not change during a wind-back, so
     there is nothing to redraw. Rāhu and Ketu have no texture and get none
     invented for them: they are nodes, not bodies, and are drawn as shadow
     discs instead. */
  var HREF = {};
  function shadowDisc(R) {
    var S = R * 2, cv = document.createElement("canvas");
    cv.width = S; cv.height = S;
    var c = cv.getContext("2d");
    var g = c.createRadialGradient(R, R, R * 0.1, R, R, R);
    g.addColorStop(0, "rgba(58,44,78,.92)");
    g.addColorStop(0.72, "rgba(42,32,58,.80)");
    g.addColorStop(1, "rgba(150,126,196,.26)");
    c.fillStyle = g; c.beginPath(); c.arc(R, R, R * 0.97, 0, 6.2832); c.fill();
    c.strokeStyle = "rgba(176,152,220,.55)"; c.lineWidth = Math.max(1, R * 0.07);
    c.beginPath(); c.arc(R, R, R * 0.93, 0, 6.2832); c.stroke();
    return cv;
  }
  function bodyHref(name) {
    if (HREF[name] !== undefined) return HREF[name];
    var cv = null, R = 46;
    try {
      if (name === "Rahu" || name === "Ketu") cv = shadowDisc(R);
      else if (window.__moDisc) cv = window.__moDisc(name, R, { phase: 180 });
      else if (window.SPBody && window.SPBody.ready())
        cv = window.SPBody.disc(name, R, { phase: 180 });
    } catch (e) { cv = null; }
    var href = null;
    try { href = cv ? cv.toDataURL("image/png") : null; } catch (e) { href = null; }
    HREF[name] = href;
    return href;
  }

  /* The lagna, if the form carries a place to compute one from. Omitted
     rather than guessed when it does not: a mark on the ring claiming to be
     the ascendant has to be the ascendant. */
  function ascFromForm(birthDate) {
    try {
      var la = parseFloat((document.getElementById("k-lat") || {}).value);
      var lo = parseFloat((document.getElementById("k-lon") || {}).value);
      var tz = parseFloat((document.getElementById("k-tz") || {}).value);
      if (isNaN(la) || isNaN(lo) || isNaN(tz) || !window.__kAsc) return null;
      var d = birthDate;
      var v = window.__kAsc({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1,
                              day: d.getUTCDate(),
                              hour: d.getUTCHours(), minute: d.getUTCMinutes(),
                              lat: la, lon: lo, tzHours: 0 });
      var deg = (v && (v.sidereal_deg != null ? v.sidereal_deg : v));
      return typeof deg === "number" && isFinite(deg) ? deg : null;
    } catch (e) { return null; }
  }

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
      '<div class="castwheelwrap"><svg class="castwheel" viewBox="-150 -150 300 300" ' +
      'role="img" aria-label="The sky winding back to the birth moment">' +
      '<g class="castplane">' +
      '<g class="castnak"></g><g class="castspokes"></g><g class="castsigns"></g>' +
      '<circle class="castring2" r="60"/>' +
      '<g class="castlagna"></g><g class="casttrails"></g><g class="castbodies"></g>' +
      '</g></svg></div>' +
      '<p class="castline" id="cast-line">जन्म-क्षण की ओर लौट रहा है आकाश…</p>' +
      '<p class="castsub">Winding the sky back to the birth moment</p>' +
      '<p class="castdate" id="cast-date"></p>' +
      '<p class="casthint">Every position below is computed, not animated — ' +
      'each graha is moving along its own real longitude. ' +
      '<b>Drag to turn the ring.</b></p>' +
      '<div class="castacts"><button type="button" class="k-btn castreveal" id="cast-reveal">' +
      'Reveal Kundli</button></div>' +
      '</div>';
    document.body.appendChild(OVER);
    document.body.classList.add("casting");

    var svg = OVER.querySelector(".castwheel");
    var plane = svg.querySelector(".castplane");
    var nakg = svg.querySelector(".castnak");
    var spokes = svg.querySelector(".castspokes");
    var signs = svg.querySelector(".castsigns");
    var lagg = svg.querySelector(".castlagna");
    var trails = svg.querySelector(".casttrails");
    var bodies = svg.querySelector(".castbodies");
    var NS = "http://www.w3.org/2000/svg";

    /* ---- the ring, in three dimensions ----------------------------------
       The tilt is ONE affine transform on the plane group: rotate by the
       spin, then squash y by cos(tilt). Every child therefore keeps its true
       polar coordinates — a graha's translate is still its real longitude —
       which is what lets the harness read the wind-back straight out of the
       DOM and compare it with the ephemeris. Depth is restored per body as
       a scale and an opacity, which that reading ignores. */
    var SPIN = 0, TILT = 58 * Math.PI / 180, DRIFT = reduced ? 0 : 0.045;
    function applyPlane(){
      plane.setAttribute("transform",
        "scale(1," + Math.cos(TILT).toFixed(4) + ") rotate(" + SPIN.toFixed(2) + ")");
    }
    function depthAt(lon){                 /* -1 far, +1 near */
      return Math.sin((lon - 90 + SPIN) * Math.PI / 180);
    }

    var RNAK_O = 132, RNAK_I = 112, RSPOKE = 60, RBODY = 96;
    var i, k2;
    /* 27 nakṣatra sectors, alternately shaded, as real sectors rather than
       tick marks — this is the ring the grahas land on */
    function sector(r0, r1, a0, a1, cls){
      var pts = [], st = (a1 - a0) / 8, a;
      for (a = a0; a <= a1 + 1e-9; a += st)
        pts.push([Math.cos((a-90)*Math.PI/180)*r1, Math.sin((a-90)*Math.PI/180)*r1]);
      for (a = a1; a >= a0 - 1e-9; a -= st)
        pts.push([Math.cos((a-90)*Math.PI/180)*r0, Math.sin((a-90)*Math.PI/180)*r0]);
      var d = "M" + pts.map(function(q){ return q[0].toFixed(2)+","+q[1].toFixed(2); }).join("L") + "Z";
      var el = document.createElementNS(NS, "path");
      el.setAttribute("d", d); el.setAttribute("class", cls);
      return el;
    }
    for (i = 0; i < 27; i++)
      nakg.appendChild(sector(RNAK_I, RNAK_O, i*(360/27), (i+1)*(360/27),
                              "castnakseg" + (i % 2 ? " alt" : "")));
    /* the twelve rāśi boundaries, and their names at the mid-sign */
    for (i = 0; i < 12; i++) {
      var a = (i * 30 - 90) * Math.PI / 180;
      var l = document.createElementNS(NS, "line");
      l.setAttribute("x1", (Math.cos(a) * RSPOKE).toFixed(2));
      l.setAttribute("y1", (Math.sin(a) * RSPOKE).toFixed(2));
      l.setAttribute("x2", (Math.cos(a) * RNAK_I).toFixed(2));
      l.setAttribute("y2", (Math.sin(a) * RNAK_I).toFixed(2));
      l.setAttribute("class", "castspoke");
      spokes.appendChild(l);
      var am = ((i * 30 + 15) - 90) * Math.PI / 180;
      var tx = document.createElementNS(NS, "text");
      tx.setAttribute("class", "castsign");
      tx.setAttribute("x", (Math.cos(am) * 86).toFixed(2));
      tx.setAttribute("y", (Math.sin(am) * 86).toFixed(2));
      tx.textContent = RASHI_SA[i];
      signs.appendChild(tx);
    }
    /* the lagna, when the form has a place to compute one from */
    var lagLon = ascFromForm(birthDate);
    if (lagLon != null) {
      var la = (lagLon - 90) * Math.PI / 180;
      var lm = document.createElementNS(NS, "line");
      lm.setAttribute("x1", (Math.cos(la) * RSPOKE).toFixed(2));
      lm.setAttribute("y1", (Math.sin(la) * RSPOKE).toFixed(2));
      lm.setAttribute("x2", (Math.cos(la) * (RNAK_O + 8)).toFixed(2));
      lm.setAttribute("y2", (Math.sin(la) * (RNAK_O + 8)).toFixed(2));
      lm.setAttribute("class", "castlagnamark");
      lagg.appendChild(lm);
    }

    var marks = {};
    BODIES.forEach(function (b, k) {
      if (from[b] == null) return;
      var g = document.createElementNS(NS, "g");
      g.setAttribute("class", "castbody");
      /* The real graha, generated per pixel by 54-motion-bodies.js — the
         Moon's maria at their selenographic coordinates, Guru's belts at
         their real latitudes — not a coloured dot. One sprite each, drawn
         once and then scaled, because the lighting does not change during
         the wind-back and re-rasterising per frame would cost everything. */
      var href = bodyHref(b);
      if (href) {
        var im = document.createElementNS(NS, "image");
        im.setAttribute("href", href);
        im.setAttribute("x", (-BODY_R[b] / 2).toFixed(2));
        im.setAttribute("y", (-BODY_R[b] / 2).toFixed(2));
        im.setAttribute("width", BODY_R[b].toFixed(2));
        im.setAttribute("height", BODY_R[b].toFixed(2));
        im.setAttribute("class", "castdisc");
        g.appendChild(im);
      } else {
        var c = document.createElementNS(NS, "circle");
        c.setAttribute("r", b === "Sun" ? 6.5 : (b === "Moon" ? 5.5 : 4.2));
        c.setAttribute("fill", HUE[b] || "#fff");
        g.appendChild(c);
      }
      var t2 = document.createElementNS(NS, "text");
      t2.setAttribute("class", "castglyph");
      t2.setAttribute("y", -(BODY_R[b] / 2 + 3).toFixed(2));
      t2.setAttribute("fill", HUE[b] || "#fff");
      t2.textContent = GLYPH[b] || "";
      g.appendChild(t2);
      bodies.appendChild(g);
      var tr = document.createElementNS(NS, "path");
      tr.setAttribute("class", "casttrail");
      tr.setAttribute("stroke", HUE[b] || "#fff");
      trails.appendChild(tr);
      marks[b] = { g: g, trail: tr, r: RBODY + (k % 5) * 5 };
    });
    applyPlane();

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
        /* The translate stays TRUE polar — the harness reads the wind-back
           out of it and checks it against the ephemeris, so nothing about
           the 3D may touch it. Depth goes in the scale and the opacity,
           which that reading does not look at. */
        var dep = depthAt(lon);                     /* -1 far, +1 near */
        var sc = 0.74 + 0.30 * (dep + 1) / 2;
        /* The plane is squashed to tilt the ring; a graha is a sphere and
           must not be. Undoing the squash on the y axis only keeps each
           body round while it still sits on the tilted ring — the ring is
           an ellipse because it is a circle seen at an angle, the bodies
           are not because they are not. */
        var ky = 1 / Math.max(0.12, Math.cos(TILT));
        m.g.setAttribute("transform", "translate(" + x.toFixed(2) + "," +
          y.toFixed(2) + ") scale(" + sc.toFixed(3) + "," +
          (sc * ky).toFixed(3) + ")");
        m.g.setAttribute("opacity", (0.45 + 0.55 * (dep + 1) / 2).toFixed(3));
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
    /* The ring keeps turning after the grahas land, slowly, so the settled
       sky is something to watch rather than a frozen diagram. Dragging takes
       it over; letting go hands it back. */
    var DRAG = null;
    function spinLoop(ts) {
      if (!OVER) return;
      if (!DRAG) { SPIN += DRIFT; applyPlane(); }
      SPINRAF = requestAnimationFrame(spinLoop);
    }
    var SPINRAF = requestAnimationFrame(spinLoop);

    svg.addEventListener("pointerdown", function (e) {
      DRAG = { x: e.clientX, y: e.clientY };
      svg.classList.add("dragging");
      try { svg.setPointerCapture(e.pointerId); } catch (x) {}
      linger();                                   /* interest resets the clock */
    });
    svg.addEventListener("pointermove", function (e) {
      if (!DRAG) return;
      SPIN += (e.clientX - DRAG.x) * 0.5;
      TILT = Math.max(0, Math.min(78 * Math.PI / 180,
                                  TILT + (e.clientY - DRAG.y) * 0.006));
      DRAG.x = e.clientX; DRAG.y = e.clientY;
      applyPlane();
    });
    function dragEnd() { DRAG = null; svg.classList.remove("dragging"); }
    svg.addEventListener("pointerup", dragEnd);
    svg.addEventListener("pointercancel", dragEnd);



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

    /* ---- how it lifts ----------------------------------------------------
       The ring is now something to play with, so the veil has to be allowed
       to stay — and that is exactly the shape of the trap the first rule
       here warns about. So it is bounded in three ways at once. Reveal
       Kundli, Escape and a click outside the ring lift it at once. Left
       alone it lifts itself after LINGER. Interacting resets that clock but
       not the HARD cap, so there is no sequence of events, including a
       script holding the pointer down, that leaves a reader sealed out of
       their own report. */
    var LINGER = reduced ? 300 : 9000, HARD = reduced ? 1500 : 45000;
    var lingerT = null;
    var hardT = setTimeout(close, HARD);
    function linger() {
      if (!OVER || !OVER.classList.contains("ready")) return;
      if (lingerT) clearTimeout(lingerT);
      lingerT = setTimeout(close, LINGER);
    }
    OVDONE = function () {
      var wait = Math.max(0, floorAt - Date.now());
      setTimeout(function () {
        if (!OVER) return;
        clearTimeout(ceiling);
        OVER.classList.add("ready");        /* the report is behind the veil now */
        linger();
      }, wait);
    };

    var revealBtn = OVER.querySelector("#cast-reveal");
    if (revealBtn) revealBtn.addEventListener("click", function () { close(); });
    OVER.addEventListener("click", function (e) {
      /* a click on the backdrop, not on the ring or the controls */
      if (e.target === OVER) close();
    });
    function onKey(e) {
      if (e.key === "Escape" || e.key === "Esc") close();
    }
    document.addEventListener("keydown", onKey);

    function close() {
      if (!OVER) return;
      if (OVRAF) { cancelAnimationFrame(OVRAF); OVRAF = null; }
      if (SPINRAF) { cancelAnimationFrame(SPINRAF); SPINRAF = null; }
      if (lingerT) { clearTimeout(lingerT); lingerT = null; }
      clearTimeout(hardT); clearTimeout(ceiling);
      document.removeEventListener("keydown", onKey);
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
    /* Here & now, and opening a saved chart, arrive at a report the same way
       Cast does, so they get the same ceremony. Here & now has no wind-back
       to perform — the sky is already where it is — and that is worth
       seeing rather than hiding: the grahas settle onto the ring from where
       they stand, and the ring is there to turn either way.

       Both fill the form and then click Cast, so the ceremony would fire
       from the handler above anyway. What these do is start it at the moment
       the reader pressed THEIR button, before the geolocation or the file
       read, so the veil covers the wait instead of appearing after it. */
    var here = document.getElementById("k-here");
    if (here && !here.__cosmos) {
      here.__cosmos = true;
      here.addEventListener("click", function () { ceremony(new Date()); });
    }
    var openf = document.getElementById("k-openfile");
    if (openf && !openf.__cosmos) {
      openf.__cosmos = true;
      openf.addEventListener("change", function () {
        /* the file has not been parsed yet, so the birth moment is not known;
           the form is filled first, then Cast fires and replaces this with
           the real one */
        setTimeout(function () {
          var b = birthFromForm();
          if (b) ceremony(b);
        }, 60);
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
