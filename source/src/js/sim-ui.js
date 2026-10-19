/* ===== The simulation page ================================================

   Picks a scenario, runs it, plays it, and prints what followed. The one
   thing worth saying about the wiring: the run happens once, when the
   scenario is chosen, and playback is a walk through frames that already
   exist. Integrating inside the animation loop would put the physics on the
   frame path, and the frame path is where this codebase has already learnt
   not to put anything expensive. */

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  var CUR = null;          /* the current consequences object */
  var P = 0, PLAY = false, RAF = null, T0 = 0, DUR = 16;
  var WHEN = Date.now();

  function stage() { return $("sim-canvas"); }

  function fit() {
    var cv = stage(), box = $("sim-stagebox");
    if (!cv || !box) return;
    var w = Math.max(240, box.clientWidth - 2);
    var h = Math.round(w * 0.62);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.style.width = w + "px";
    cv.style.height = h + "px";
    if (cv.width !== Math.round(w * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
  }

  function drawFrame() {
    var cv = stage();
    if (!cv || !CUR) return;
    var c = cv.getContext("2d");
    c.setTransform(1, 0, 0, 1, 0, 0);
    window.SimDraw.scene(c, cv.width, cv.height, CUR.result, CUR, P, {});
  }

  function tick() {
    if (!PLAY) return;
    RAF = requestAnimationFrame(tick);
    var el2 = (Date.now() - T0) / 1000;
    P = (el2 % DUR) / DUR;
    drawFrame();
    var sc = $("sim-scrub");
    if (sc && !tick.n) { sc.value = String(Math.round(P * 1000)); }
    tick.n = (tick.n || 0) + 1;
    if (tick.n > 6) tick.n = 0;
  }
  function play(on) {
    PLAY = on;
    var b = $("sim-play");
    if (b) b.textContent = on ? "Pause" : "Play";
    if (on) { T0 = Date.now() - P * DUR * 1000; tick(); }
    else if (RAF) { cancelAnimationFrame(RAF); RAF = null; }
  }

  /* ---- the picker --------------------------------------------------------- */
  function picker() {
    var host = $("sim-picker");
    if (!host) return;
    host.innerHTML = "";
    var Z = window.SimScenarios;
    Z.groups().forEach(function (g) {
      var sec = el("div", "simgroup");
      sec.appendChild(el("h4", null, g));
      var wrap = el("div", "simchips");
      Z.SCENARIOS.filter(function (s) { return s.group === g; })
        .forEach(function (s) {
          var b = el("button", "simchip" +
            (CUR && CUR.id === s.id ? " on" : ""), s.label);
          b.type = "button";
          b.title = s.question;
          b.addEventListener("click", function () { choose(s.id); });
          wrap.appendChild(b);
        });
      sec.appendChild(wrap);
      host.appendChild(sec);
    });
  }

  function choose(id) {
    var Z = window.SimScenarios;
    var s = Z.byId(id);
    if (!s) return;
    var note = $("sim-running");
    if (note) { note.hidden = false; note.textContent = "Integrating…"; }
    /* let the browser paint the note before the run blocks it */
    setTimeout(function () {
      var t0 = performance.now();
      var cons = null;
      try { cons = Z.simulate(s, WHEN, { samples: 900 }); }
      catch (e) { cons = null; }
      if (note) note.hidden = true;
      if (!cons) { flash("That run could not be set up."); return; }
      cons.ms = performance.now() - t0;
      CUR = cons;
      P = 0;
      fit();
      drawFrame();
      picker();
      report();
      play(true);
    }, 16);
  }

  /* ---- the report --------------------------------------------------------- */
  function table(rows, cls) {
    var t = el("table", "tbl " + (cls || ""));
    var tb = el("tbody");
    rows.forEach(function (r) {
      var tr = el("tr");
      tr.appendChild(el("td", null, r[0]));
      tr.appendChild(el("td", "simval", r[1]));
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    return t;
  }

  function report() {
    var host = $("sim-report");
    if (!host || !CUR) return;
    host.innerHTML = "";

    host.appendChild(el("p", "simq", CUR.question));
    if (CUR.headline) {
      var h = el("p", "simhead", CUR.headline);
      host.appendChild(h);
    }

    /* THE NOISE FLOOR. When the change asked about is smaller than the
       simulator's own error, the simulator says so and does the arithmetic
       instead. This is the panel that distinguishes a tool from a toy. */
    if (CUR.resolvable === false && CUR.analytic) {
      var box = el("div", "simnoise");
      box.appendChild(el("h4", null, "Too small to simulate — so here is the arithmetic"));
      box.appendChild(el("p", null, CUR.analytic.lead));
      box.appendChild(table(CUR.analytic.rows));
      if (CUR.analytic.moral) box.appendChild(el("p", "simmoral", CUR.analytic.moral));
      if (CUR.noiseDays != null)
        box.appendChild(el("p", "simnote",
          "For comparison: this simulation's own month, run with nothing " +
          "changed, sits " + (CUR.noiseDays * 24 * 60).toFixed(1) +
          " minutes from the real one. Anything smaller than that is below " +
          "what it can see, and drawing it would be a picture of rounding error."));
      host.appendChild(box);
    } else if (CUR.resolvable === false && CUR.id !== "none" && CUR.gravitational) {
      host.appendChild(el("p", "simnote",
        "The change is below what this simulation can resolve — its own " +
        "month, with nothing altered, is " +
        ((CUR.noiseDays || 0) * 24 * 60).toFixed(1) + " minutes from the real " +
        "one, and this scenario moves it less than that."));
    }

    if (CUR.rows.length) {
      host.appendChild(el("h3", "simsec", "What happens"));
      host.appendChild(table(CUR.rows));
    }
    if (CUR.jyotisha.length) {
      host.appendChild(el("h3", "simsec",
        "What it does to the system this site teaches"));
      host.appendChild(table(CUR.jyotisha, "simjy"));
    }
    if (CUR.note) {
      var n = el("p", "simnote");
      n.appendChild(el("b", null, "A limit of the model: "));
      n.appendChild(document.createTextNode(CUR.note));
      host.appendChild(n);
    }
    discs();
    var stat = $("sim-stat");
    if (stat) stat.textContent =
      "Integrated " + CUR.days.toFixed(1) + " days in " +
      (CUR.result ? CUR.result.steps.toLocaleString("en") : "?") + " steps, " +
      (CUR.ms || 0).toFixed(0) + " ms. Energy conserved to " +
      (CUR.energyDrift != null ? CUR.energyDrift.toExponential(1) : "—") +
      " of itself.";
  }

  function flash(m) {
    var f = $("sim-flash");
    if (!f) return;
    f.textContent = m; f.hidden = false;
    clearTimeout(flash._t);
    flash._t = setTimeout(function () { f.hidden = true; }, 3600);
  }

  /* ---- the comparison of discs, its own small canvas ---------------------- */
  function discs() {
    var cv = $("sim-discs");
    if (!cv || !CUR) return;
    var box = cv.parentNode;
    var w = Math.max(220, box.clientWidth - 2), h = Math.round(w * 0.52);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.style.width = w + "px"; cv.style.height = h + "px";
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    var c = cv.getContext("2d");
    window.SimDraw.background(c, cv.width, cv.height);
    window.SimDraw.discs(c, cv.width, cv.height, CUR, {});
  }

  function absent() {
    var host = $("sim-absent");
    if (!host) return;
    host.innerHTML = "";
    window.SimScenarios.ABSENT.forEach(function (q) {
      var li = el("li");
      li.appendChild(el("b", null, q.what + " — "));
      li.appendChild(document.createTextNode(q.why));
      host.appendChild(li);
    });
  }

  /* ---- boot --------------------------------------------------------------- */
  function bind() {
    if (!window.SimEngine || !window.SimScenarios || !window.SimDraw) return;
    if (!stage()) return;
    if (!window.__kState) { setTimeout(bind, 150); return; }

    var w = $("sim-when");
    if (w) {
      var d = new Date(WHEN - new Date().getTimezoneOffset() * 60000);
      w.value = d.toISOString().slice(0, 16);
      w.addEventListener("change", function () {
        var t = Date.parse(w.value);
        WHEN = isFinite(t) ? t : Date.now();
        if (CUR) choose(CUR.id);
      });
    }
    $("sim-play") && $("sim-play").addEventListener("click", function () {
      play(!PLAY); });
    var sc = $("sim-scrub");
    if (sc) sc.addEventListener("input", function () {
      play(false); P = (+sc.value) / 1000; drawFrame(); });
    var sp = $("sim-speed");
    if (sp) sp.addEventListener("change", function () {
      DUR = +sp.value; if (PLAY) { T0 = Date.now() - P * DUR * 1000; } });

    picker();
    absent();
    window.addEventListener("resize", function () { fit(); drawFrame(); discs(); });
    choose("none");
    setTimeout(discs, 400);

    try {
      window.__sim = {
        choose: function (id) { choose(id); return true; },
        current: function () { return CUR; },
        at: function (p) { P = p; drawFrame(); return P; },
        playing: function () { return PLAY; },
        setWhen: function (t) { WHEN = t; if (CUR) choose(CUR.id); },
        ids: function () {
          return window.SimScenarios.SCENARIOS.map(function (s) { return s.id; }); }
      };
    } catch (e) {}
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", function () { setTimeout(bind, 60); });
  else setTimeout(bind, 60);
})();
