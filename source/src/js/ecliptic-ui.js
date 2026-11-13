/* ecliptic.html — the ecliptic wheel, animated, for any moment and any place.
 *
 * WHAT IS REUSED AND WHY. The wheel is drawn and animated by skyLiveDraw(),
 * the SAME function the report's Sky tab uses: build.py concatenates
 * report/sky/37-ecliptic-wheel.js into this bundle rather than this file
 * carrying a second copy. It was already written to be driven from outside —
 * skyLiveMount builds the nodes once and skyLiveSync only moves them — so it
 * needed no change to be used from here; only its report-page controller
 * (skyPane, skyRedraw, skyStateAt) is left unused, and this file replaces it.
 *
 * report/core/02-varga-lagna.js is concatenated too, because the renderer
 * calls vargaLagna for every varga other than D1.
 *
 * WHAT MAKES IT CHART-INDEPENDENT. The sky comes from window.quickSky, which
 * wants a moment and a place and nothing else. The renderer's only natal
 * ingredient is SKY_NATAL, a ring of birth positions the report's pane sets;
 * this page leaves it null and SKY_OPT.natal false, so the inner ring is
 * simply never asked for. No chart is read, and clearing localStorage changes
 * nothing here — which ecliptic-verify asserts, because "it happens not to
 * read a chart today" and "it cannot read a chart" are different claims.
 *
 * Nothing here touches the network. Every script it pulls is local.
 */
(function () {
  "use strict";

  var host = document.getElementById("echost");
  if (!host) return;

  var $ = function (id) { return document.getElementById(id); };

  var S = {
    base: null,        /* the target moment, ms */
    place: null,
    /* the settings panel's ayanāṃśa, so this page and a chart agree */
    ayan: (function () { try { var N = window.NSettings && window.NSettings.get();
      return (N && N.ayan) || "samanvaya_ecliptic"; } catch (e) { return "samanvaya_ecliptic"; } })(),
    span: 43830,       /* minutes either side of the target */
    rate: 1,
    offset: 0,         /* minutes from the target, where the wheel currently is */
    playing: false,
    raf: null, last: null
  };

  /* ---- the scripts this page needs, pulled only once it is wanted ------- */
  function need(list, done) {
    var i = 0;
    (function next() {
      if (i >= list.length) return done();
      var spec = list[i++];
      if (spec.have()) return next();
      var s = document.createElement("script");
      s.src = spec.src; s.defer = true;
      s.onload = next;
      s.onerror = function () {
        host.innerHTML = '<p class="swfail">Could not load <code>' + spec.src +
          '</code>. The page needs it to compute anything, and it is served ' +
          'from beside this file.</p>';
      };
      document.head.appendChild(s);
    })();
  }

  /* ---- time -------------------------------------------------------------
     Every instant is built from the chosen date, the chosen time and the
     place's own offset, never from the reader's machine clock, so the same
     settings show the same sky wherever the page is opened. */
  function tz() { return (S.place && S.place.tz) || 0; }
  function dayStr(ms) {
    var d = new Date(ms + tz() * 3600000);
    return d.getUTCFullYear() + "-" +
      String(d.getUTCMonth() + 1).padStart(2, "0") + "-" +
      String(d.getUTCDate()).padStart(2, "0");
  }
  function timeStr(ms) {
    var d = new Date(ms + tz() * 3600000);
    return String(d.getUTCHours()).padStart(2, "0") + ":" +
           String(d.getUTCMinutes()).padStart(2, "0");
  }
  function baseFromFields() {
    var dv = /^(\d{4})-(\d{2})-(\d{2})$/.exec(($("ec-date") || {}).value || "");
    var tv = /^(\d{1,2}):(\d{2})/.exec(($("ec-time") || {}).value || "12:00");
    if (!dv) return S.base;
    var mins = (tv ? +tv[1] : 12) * 60 + (tv ? +tv[2] : 0);
    return Date.UTC(+dv[1], +dv[2] - 1, +dv[3]) + mins * 60000 - tz() * 3600000;
  }
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
             "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function stampOf(ms) {
    var d = new Date(ms + tz() * 3600000);
    return String(d.getUTCDate()).padStart(2, "0") + " " + MON[d.getUTCMonth()] +
      " " + d.getUTCFullYear() + " · " +
      String(d.getUTCHours()).padStart(2, "0") + ":" +
      String(d.getUTCMinutes()).padStart(2, "0");
  }
  /* The offset in whatever unit reads naturally at its size. Minutes all the
     way up would print "+525960 min", which is a number nobody can hold. */
  function offLabel(off) {
    if (!off) return "at the target moment";
    var a = Math.abs(off), s = off > 0 ? "+" : "−";
    var t = a < 120 ? Math.round(a) + " min"
          : a < 2880 ? (a / 60).toFixed(1) + " hours"
          : a < 43830 ? (a / 1440).toFixed(1) + " days"
          : a < 525960 ? (a / 43830).toFixed(1) + " months"
          : (a / 525960).toFixed(2) + " years";
    return s + t + " from the target";
  }
  function esc2(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ---- the sky at the current offset ------------------------------------ */
  function skyAt(off) {
    var ms = S.base + off * 60000;
    var d = new Date(ms + tz() * 3600000);
    return {
      ms: ms,
      sky: window.quickSky({
        year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
        hour: d.getUTCHours(), minute: d.getUTCMinutes(), second: d.getUTCSeconds(),
        tzHours: tz(), lat: S.place.lat, lon: S.place.lon, ayanamsa: S.ayan
      })
    };
  }

  /* ---- draw -------------------------------------------------------------
     dt is the milliseconds since the previous frame while playing and null
     otherwise; the renderer uses it to ease a graha toward a new lane instead
     of snapping it there, so a scrub and a play look different on purpose. */
  function draw(dt) {
    if (!window.quickSky || !S.place || S.base == null) return;
    var st = skyAt(S.offset);
    if (!st.sky) { host.innerHTML = '<p class="swfail">Could not compute that moment.</p>'; return; }
    /* The natal ring is what would make this chart-dependent, so it is off and
       its source is null. Set here rather than once at boot because the
       renderer is shared and the report's pane sets both the other way. */
    window.SKY_NATAL = null;
    window.SKY_OPT.natal = false;
    skyLiveDraw(host, st.sky, st.sky.date, dt == null ? null : dt);

    var stamp = $("ec-stamp");
    if (stamp) stamp.textContent = stampOf(st.ms) + " · " + S.place.n;
    var off = $("ec-off");
    if (off) off.textContent = offLabel(S.offset);
    var sc = $("ec-scrub");
    if (sc && document.activeElement !== sc) {
      sc.value = String(Math.round(1000 * S.offset / S.span));
    }
    facts(st.sky);
  }

  /* The line under the wheel. Deliberately the quantities that change as it
     plays — lagna, MC and what is retrograde — rather than a restatement of
     the controls. Rāhu and Ketu are always retrograde by construction, so
     listing them among the retrogrades every single frame says nothing. */
  function facts(sky) {
    var el = $("ec-facts");
    if (!el) return;
    var retro = sky.planets.filter(function (p) {
      return p.retro && p.en !== "Rahu" && p.en !== "Ketu";
    }).map(function (p) { return p.en; });
    el.innerHTML =
      "Lagna " + esc2(SA[Math.floor(sky.lagna / 30) % 12]) + " " + dm(sky.lagna % 30) +
      " &nbsp;·&nbsp; MC " + esc2(SA[Math.floor(sky.mc / 30) % 12]) + " " + dm(sky.mc % 30) +
      " &nbsp;·&nbsp; " + (retro.length
        ? "retrograde: " + esc2(retro.join(", "))
        : "nothing retrograde");
  }

  /* ---- the transport -----------------------------------------------------
     Play walks the offset from one end of the span to the other in a fixed
     wall-clock time, so a wider span simply moves faster through the sky
     rather than taking proportionally longer to watch. It stops at the far
     end rather than looping: a loop makes the return journey look like a
     motion the sky does not have. */
  var SWEEP_MS = 24000;
  function tick(now) {
    if (!S.playing) return;
    var dt = S.last == null ? 0 : now - S.last;
    S.last = now;
    S.offset += (2 * S.span) * (dt / SWEEP_MS) * S.rate;
    if (S.offset >= S.span) { S.offset = S.span; stop(); draw(null); return; }
    draw(dt);
    S.raf = requestAnimationFrame(tick);
  }
  function play() {
    if (S.playing) return stop();
    if (S.offset >= S.span) S.offset = -S.span;
    S.playing = true; S.last = null;
    var b = document.querySelector('[data-ec="play"]');
    if (b) b.textContent = "Pause";
    S.raf = requestAnimationFrame(tick);
  }
  function stop() {
    S.playing = false;
    if (S.raf) cancelAnimationFrame(S.raf);
    S.raf = null;
    var b = document.querySelector('[data-ec="play"]');
    if (b) b.textContent = "Play";
  }

  /* ---- the switches ------------------------------------------------------
     Built from SKY_OPT itself rather than from a list written out here, so a
     switch cannot exist in the markup without a setting behind it, or the
     other way round. */
  var SWITCH = [
    ["nakshatra", "Nakṣatras & pādas"],
    ["degrees", "Degrees"],
    ["retro", "Retrograde mark"],
    ["speed", "Speed arrows"],
    ["lanes", "Separate crowded grahas"],
    ["art", "Graha surfaces"]
  ];
  var GRAHAS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn",
                "Rahu", "Ketu"];
  function toggles() {
    var box = $("ec-toggles");
    if (!box || box.firstChild) return;
    var h = SWITCH.map(function (s) {
      return '<label class="swchk"><input type="checkbox" data-opt="' + s[0] + '"' +
        (window.SKY_OPT[s[0]] ? " checked" : "") + "> " + esc2(s[1]) + "</label>";
    }).join("");
    h += '<span class="swsp"></span>';
    h += GRAHAS.map(function (n) {
      return '<label class="swchk"><input type="checkbox" data-graha="' + n + '"' +
        (window.SKY_OPT.show[n] ? " checked" : "") + "> " + esc2(n) + "</label>";
    }).join("");
    box.innerHTML = h;
  }

  function fillSelects() {
    var a = $("ec-ayan");
    if (a && window.__ayanModes && !a.options.length) {
      var M = window.__ayanModes;
      a.innerHTML = Object.keys(M).map(function (k) {
        return '<option value="' + esc2(k) + '"' + (k === S.ayan ? " selected" : "") +
          ">" + esc2(M[k].name) + "</option>";
      }).join("");
    }
    var v = $("ec-varga");
    /* CRUX comes in with 02-varga-lagna.js and carries the divisions this
       engine actually computes, each with what it is read for, so the list
       cannot offer a varga the renderer would not know how to place. */
    if (v && typeof CRUX !== "undefined" && !v.options.length) {
      v.innerHTML = Object.keys(CRUX).map(function (k) {
        return '<option value="' + esc2(k) + '"' + (k === "D1" ? " selected" : "") +
          ">" + esc2(k) + " — " + esc2(CRUX[k][1]) + "</option>";
      }).join("");
    }
  }

  function bind() {
    var bar = document.body;
    bar.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-ec]") : null;
      if (!b) return;
      var k = b.getAttribute("data-ec");
      if (k === "play") play();
      else if (k === "back") { stop(); S.offset = -S.span; draw(null); }
      else if (k === "mid") { stop(); S.offset = 0; draw(null); }
      else if (k === "now") {
        stop();
        S.base = Date.now(); S.offset = 0;
        var d = $("ec-date"), t = $("ec-time");
        if (d) d.value = dayStr(S.base);
        if (t) t.value = timeStr(S.base);
        draw(null);
      } else if (k === "step") {
        stop();
        S.offset = Math.max(-S.span, Math.min(S.span,
          S.offset + (+b.getAttribute("data-k") || 1) * S.span / 50));
        draw(null);
      }
    });
    bar.addEventListener("change", function (e) {
      var t = e.target;
      if (!t.id && !t.dataset.opt && !t.dataset.graha) return;
      if (t.id === "ec-date" || t.id === "ec-time") {
        stop(); S.base = baseFromFields(); S.offset = 0; draw(null);
      } else if (t.id === "ec-ayan") { S.ayan = t.value; draw(null); }
      else if (t.id === "ec-theme") {
        /* The palette is CSS, scoped to [data-wtheme] on the host, so nothing
           is redrawn: the renderer's inline fills are presentation attributes
           and a CSS rule outranks them. An empty value removes the attribute
           and the page falls back to the site theme. */
        if (t.value) host.setAttribute("data-wtheme", t.value);
        else host.removeAttribute("data-wtheme");
      }
      else if (t.id === "ec-span") {
        /* Keep where we are in the span proportionally, rather than keeping the
           offset in minutes: widening the span would otherwise leave the wheel
           apparently at the target when it is nowhere near it. */
        var f = S.span ? S.offset / S.span : 0;
        S.span = +t.value || 43830;
        S.offset = f * S.span;
        draw(null);
      }
      else if (t.id === "ec-rate") { S.rate = +t.value || 1; }
      else if (t.id === "ec-varga") { window.SKY_VARGA = t.value; draw(null); }
      else if (t.id === "ec-asp") { window.SKY_ASPECT = t.value; draw(null); }
      else if (t.dataset.opt) { window.SKY_OPT[t.dataset.opt] = t.checked; draw(null); }
      else if (t.dataset.graha) { window.SKY_OPT.show[t.dataset.graha] = t.checked; draw(null); }
    });
    bar.addEventListener("input", function (e) {
      var t = e.target;
      if (t.id === "ec-scrub") {
        stop();
        S.offset = (+t.value / 1000) * S.span;
        draw(null);
      } else if (t.id === "ec-tilt") {
        window.SKY_OPT.tilt = +t.value || 0; draw(null);
      } else if (t.id === "ec-trail") {
        var pc = +t.value || 0;
        window.SKY_OPT.trail = pc > 0;
        /* The trail is expressed in days, and the span is in minutes, so the
           slider is a percentage of the span rather than a day count: at a
           ±30-year span a 90-day trail would be a dot. */
        window.SKY_OPT.trailDays = Math.max(0.02, (pc / 100) * (S.span / 1440));
        draw(null);
      } else return;
    });
    /* Playing while the tab is hidden burns the reader's battery to draw
       frames nobody is looking at, and rAF pauses anyway, which would make the
       sweep jump on return. */
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
    });
  }

  need([
    { src: "engine.js", have: function () { return !!window.quickSky; } },
    { src: "panchanga.js", have: function () { return !!(window.NP && window.NP.day); } },
    { src: "places.js", have: function () { return !!window.NPlaces; } },
    /* the lit graha surfaces, last so the wheel is on screen with lettered
       discs before the 44 KB of surface renderer arrives */
    { src: "bodies.js", have: function () { return !!window.NSprite; } }
  ], function () {
    S.place = (window.NP.savedPlace && window.NP.savedPlace()) ||
              (window.NP.PLACES && window.NP.PLACES[0]) ||
              { n: "Ujjain", lat: 23.1765, lon: 75.7885, tz: 5.5 };
    var ph = $("ec-place");
    if (ph && window.NPlaces.picker) {
      var quick = [S.place].concat(window.NP.PLACES || []);
      window.NPlaces.picker({
        host: ph, value: S.place, quick: quick, label: "Place",
        refMs: function () { return S.base || Date.now(); },
        onPick: function (p) {
          /* The offset is minutes from the target and the target is a wall
             clock reading in the place's own zone, so the base is rebuilt from
             the fields rather than kept: moving from Abu Dhabi to Delhi should
             keep noon at noon, not shift it by an hour and a half. */
          stop(); S.place = p; S.base = baseFromFields(); draw(null);
        }
      });
    }
    S.base = Date.now();
    var d = $("ec-date"), t = $("ec-time");
    if (d) {
      d.value = dayStr(S.base);
      if (window.NP.RANGE) {
        d.min = window.NP.RANGE.min + "-01-01";
        d.max = window.NP.RANGE.max + "-12-31";
      }
    }
    if (t) t.value = timeStr(S.base);
    var sp = $("ec-span");
    if (sp) S.span = +sp.value || 43830;
    window.SKY_VARGA = "D1";
    window.SKY_ASPECT = "none";
    window.SKY_OPT.natal = false;
    window.SKY_OPT.art = true;      /* this page draws surfaces; the report does not */
    window.SKY_OPT.trail = false;
    /* Opens flat, which is the chart convention; the slider leans the whole
       wheel, furniture included, so a graha cannot leave its rāśi. */
    window.SKY_OPT.tilt = 0;
    window.SKY_NATAL = null;
    fillSelects();
    toggles();
    bind();
    draw(null);
  });
})();
