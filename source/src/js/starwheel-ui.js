/* starwheel.html — the whole sky, for any day, with no birth chart.
 *
 * WHAT IS REUSED AND WHY. The wheel itself is drawn by swhRender(), the SAME
 * function the report's Star wheel tab uses: build.py concatenates
 * report/sky/40-star-wheel.js into this bundle rather than this file carrying a
 * second copy. Two implementations of a projection would eventually disagree,
 * and a wheel that disagreed with the report's would be worse than no wheel.
 * swhRender is pure — it takes a sky snapshot and returns SVG — so it needed no
 * change to be used from here; only its report-page controller is left unused.
 *
 * The sky comes from window.quickSky, which needs a moment and a place and
 * nothing else. That is the whole of what makes this page chart-independent:
 * there was never anything natal in the wheel except the points swhNatalPoints
 * adds, and they are simply not asked for.
 *
 * The pañcāṅga comes from window.NP (panchanga.js, shipped as calendar.js), so
 * this page and the Calendar cannot disagree about which day it is. The card is
 * composed with window.NCard, the same composer the Studio uses.
 *
 * Nothing here touches the network. Every script it pulls is local, and the
 * card is drawn and downloaded from a canvas that was never tainted.
 */
(function () {
  "use strict";

  var host = document.getElementById("swhost");
  if (!host) return;

  var $ = function (id) { return document.getElementById(id); };
  var S = {
    day: null,          /* ms at local midnight of the chosen civil day */
    when: "sunrise",
    time: "06:00",
    place: null,
    ayan: "lahiri",
    sky: null, pan: null, ms: null,
    ratio: "4:5", theme: null, head: "tithi"
  };

  /* ---- the scripts this page needs, pulled only once it is wanted -------
     Same bargain the Calendar makes: a reader who never opens this page never
     pays for the engine, the pañcāṅga or the card composer. */
  function need(list, done) {
    var i = 0;
    (function next() {
      if (i >= list.length) return done();
      var spec = list[i++];
      if (spec.have()) return next();
      var s = document.createElement("script");
      s.src = spec.src; s.defer = true;
      s.onload = next;
      s.onerror = function () { fail(spec.src); };
      document.head.appendChild(s);
    })();
  }
  function fail(src) {
    host.innerHTML = '<p class="swfail">Could not load <code>' + src +
      '</code>. The page needs it to compute anything, and it is served from ' +
      'beside this file.</p>';
  }

  /* ---- time -------------------------------------------------------------
     Every instant on this page is built from the chosen civil day and the
     place's own offset, never from the reader's machine clock, so the same URL
     shows the same sky wherever it is opened. */
  function tz() { return (S.place && S.place.tz) || 0; }
  function localMidnight(y, m, d) { return Date.UTC(y, m - 1, d) - tz() * 3600000; }
  function parseDay(v) {
    var p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || "");
    return p ? localMidnight(+p[1], +p[2], +p[3]) : null;
  }
  function dayStr(ms) {
    var d = new Date(ms + tz() * 3600000);
    return d.getUTCFullYear() + "-" +
      String(d.getUTCMonth() + 1).padStart(2, "0") + "-" +
      String(d.getUTCDate()).padStart(2, "0");
  }
  function clock(ms) {
    if (ms == null) return "—";
    var d = new Date(ms + tz() * 3600000);
    return String(d.getUTCHours()).padStart(2, "0") + ":" +
           String(d.getUTCMinutes()).padStart(2, "0");
  }
  var MON = ["January", "February", "March", "April", "May", "June", "July",
             "August", "September", "October", "November", "December"];
  function longDate(ms) {
    var d = new Date(ms + tz() * 3600000);
    return d.getUTCDate() + " " + MON[d.getUTCMonth()] + " " + d.getUTCFullYear();
  }
  /* NP gives the pakṣa lower-case ("kṛṣṇa"), which is right in running prose
     and wrong as a headline. */
  function cap(s) {
    return s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : "";
  }
  function esc2(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* the instant the wheel is drawn for */
  function instantFor(pan) {
    if (S.when === "now") return Date.now();
    if (S.when === "sunrise") return pan && pan.sunrise != null ? pan.sunrise : S.day + 6 * 3600000;
    if (S.when === "sunset") {
      var ss = window.NP && window.NP.riseSet
        ? window.NP.riseSet(pan ? pan.sunrise : S.day, S.place, -1) : null;
      return ss != null ? ss : S.day + 18 * 3600000;
    }
    if (S.when === "midnight") return S.day;
    if (S.when === "noon") return S.day + 12 * 3600000;
    var p = /^(\d{1,2}):(\d{2})/.exec(S.time || "06:00");
    return S.day + ((p ? +p[1] : 6) * 60 + (p ? +p[2] : 0)) * 60000;
  }

  /* ---- compute --------------------------------------------------------- */

  function compute() {
    var NP = window.NP;
    if (!NP || !window.quickSky) return false;
    if (!NP.inRange(new Date(S.day + tz() * 3600000).getUTCFullYear())) {
      S.pan = null; S.sky = null; return "range";
    }
    S.pan = NP.day(S.day + 8 * 3600000, S.place, {});
    if (!S.pan) return false;
    S.ms = instantFor(S.pan);
    var d = new Date(S.ms + tz() * 3600000);
    S.sky = window.quickSky({
      year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
      hour: d.getUTCHours(), minute: d.getUTCMinutes(), second: d.getUTCSeconds(),
      tzHours: tz(), lat: S.place.lat, lon: S.place.lon, ayanamsa: S.ayan
    });
    return true;
  }

  /* The limbs across the WHOLE day, which is the thing this page exists for:
     every segment of every limb that touches sunrise-to-next-sunrise, with the
     instant each closes. NP.endOf and NP.startOf do the root-finding, so these
     are the same boundaries the Calendar prints. */
  function limbRuns(from, to) {
    var NP = window.NP, out = {};
    /* NAMING. The tithi tables are PER PAKṢA — fifteen śukla and fifteen kṛṣṇa
       — and the karaṇa cycle is not a flat sixty-entry list either, so indexing
       them as if they were printed raw numbers: "23" where "Aṣṭamī" belongs.
       Named the way NP.day itself does instead, which also keeps this page and
       the Calendar saying the same words about the same instant. */
    var nameOf = {
      tithi: function (i) {
        return (i < 15 ? NP.NAMES.tithi[i] : NP.NAMES.tithiK[i - 15]) || String((i % 15) + 1);
      },
      nakshatra: function (i) { return NP.NAMES.nak[i] || String(i + 1); },
      yoga: function (i) { return NP.NAMES.yoga[i] || String(i + 1); },
      /* NP.NAMES.karana is a FUNCTION, not a table — the karaṇa cycle has four
         fixed members (Kiṃstughna first, then Śakuni, Catuṣpada and Nāga last)
         around seven that repeat, so no array index can name it. Indexing it
         as one returned undefined and printed "47". */
      karana: function (i) {
        var f = NP.NAMES.karana;
        return (typeof f === "function" ? f(i) : null) || String(i + 1);
      }
    };
    var KIND = [
      ["tithi", 12, NP.tithiIdx],
      ["nakshatra", 40 / 3, NP.nakIdx],
      ["yoga", 40 / 3, NP.yogaIdx],
      ["karana", 6, NP.karanaIdx]
    ];
    KIND.forEach(function (k) {
      var name = k[0], step = k[1], idxAt = k[2];
      var runs = [], t = from, guard = 0;
      while (t < to && guard++ < 24) {
        var i = idxAt(t);
        if (i == null) break;
        if (runs.length && runs[runs.length - 1].idx === i) break;
        var end = NP.endOf(t, step, idxAt);
        var start = NP.startOf(t, step, idxAt);
        runs.push({
          idx: i, name: nameOf[name](i),
          paksha: name === "tithi" ? (i < 15 ? "Śukla" : "Kṛṣṇa") : null,
          start: start, end: end,
          startsInDay: start != null && start > from,
          endsInDay: end != null && end < to
        });
        if (end == null || end <= t) break;
        /* Step a minute past the boundary, not a second. NP.endOf bisects to a
           20-second bracket, so landing one second beyond its answer can still
           be inside the old segment — which listed Āśleṣā twice before this,
           once legitimately and once as the same run found again. The index
           guard below is the belt to this file's braces. */
        t = end + 60000;
      }
      out[name] = runs;
    });
    return out;
  }

  /* ---- the wheel ------------------------------------------------------- */

  function drawWheel() {
    if (!S.sky) return;
    /* swhRender wants a natal object; a chart-independent page has none, and
       passing the empty shape is the whole of what "chart-independent" means
       here — the wheel never needed a chart, only the extra points did. */
    host.innerHTML = swhRender(S.sky, { upagrahas: [], special: [], arudhas: [], lagna: null });
    var st = $("sw-stamp");
    if (st) st.innerHTML = esc2(longDate(S.ms)) + " at <b>" + esc2(clock(S.ms)) +
      "</b> &middot; " + esc2(S.place.n) + " &middot; lagna " +
      esc2(dm(((S.sky.lagna % 30) + 30) % 30)) + " of " +
      esc2(["Meṣa","Vṛṣabha","Mithuna","Karka","Siṃha","Kanyā","Tulā","Vṛścika",
            "Dhanus","Makara","Kumbha","Mīna"][Math.floor(S.sky.lagna / 30) % 12]);
    var wn = $("sw-wheelnote");
    if (wn) {
      var below = S.sky.planets.filter(function (p) { return p.hz && p.hz.alt < 0; });
      wn.innerHTML = below.length
        ? "<b>" + below.length + " of the nine are below the horizon</b> at this moment — " +
          esc2(below.map(function (p) { return p.en; }).join(", ")) +
          ". The wheel shows it; a flat chart cannot."
        : "Every graha is above the horizon at this moment, which is uncommon.";
    }
  }

  function toggles() {
    var h = $("sw-toggles"); if (!h) return;
    var OPT = [["grahas", "Grahas"], ["stars", "Yogatārās"], ["connect", "Join each to its star"]];
    h.innerHTML = OPT.map(function (o) {
      return '<label class="swchk"><input type="checkbox" data-swtog="' + o[0] + '"' +
        (SWH_SHOW[o[0]] ? " checked" : "") + "> " + o[1] + "</label>";
    }).join("");
  }

  /* ---- the day --------------------------------------------------------- */

  function drawDay() {
    var NP = window.NP, from = S.pan.sunrise;
    var next = NP.riseSet(from + 20 * 3600000, S.place, +1);
    var to = next != null ? next : from + 86400000;
    var runs = limbRuns(from, to);

    /* the strip */
    var hostS = $("sw-strip");
    if (hostS) {
      var W = 900, rowH = 44, T = 26, L = 108, R = 18;
      var ROWS = [["Tithi", "tithi"], ["Nakṣatra", "nakshatra"],
                  ["Yoga", "yoga"], ["Karaṇa", "karana"]];
      var H = T + ROWS.length * rowH + 26;
      var x = function (ms) { return L + (ms - from) / (to - from) * (W - L - R); };
      var o = ['<svg viewBox="0 0 ' + W + " " + H + '" class="swsvg" role="img" ' +
               'aria-label="Every segment of each limb that touches the day, and when each closes.">'];
      /* hour gridlines */
      for (var t = from; t <= to; t += 3 * 3600000) {
        o.push('<line x1="' + x(t).toFixed(1) + '" y1="' + (T - 12) + '" x2="' +
               x(t).toFixed(1) + '" y2="' + (H - 22) +
               '" stroke="var(--border,#e8e2d8)" stroke-width="0.8" stroke-dasharray="2 4"/>');
        o.push('<text x="' + x(t).toFixed(1) + '" y="' + (T - 16) +
               '" text-anchor="middle" fill="var(--muted,#6b6459)" font-size="10">' +
               clock(t) + "</text>");
      }
      ROWS.forEach(function (r, i) {
        var y = T + i * rowH;
        o.push('<text x="' + (L - 10) + '" y="' + (y + 13) +
               '" text-anchor="end" fill="var(--ink,#23201c)" font-size="12">' + r[0] + "</text>");
        (runs[r[1]] || []).forEach(function (run, k) {
          var a = Math.max(x(run.start != null ? run.start : from), L);
          var b = Math.min(x(run.end != null ? run.end : to), W - R);
          if (b - a < 1) return;
          o.push('<rect x="' + a.toFixed(1) + '" y="' + y + '" width="' + (b - a).toFixed(1) +
                 '" height="18" rx="3" fill="var(--accent,#2f5d8a)" fill-opacity="' +
                 (k % 2 ? 0.5 : 0.78) + '"/>');
          if (b - a > 54)
            o.push('<text x="' + ((a + b) / 2).toFixed(1) + '" y="' + (y + 13) +
                   '" text-anchor="middle" fill="#fff" font-size="10.5">' +
                   esc2(run.name) + "</text>");
          if (run.endsInDay)
            o.push('<text x="' + b.toFixed(1) + '" y="' + (y + 31) +
                   '" text-anchor="middle" fill="var(--muted,#6b6459)" font-size="10">' +
                   clock(run.end) + "</text>");
        });
      });
      o.push('<text x="' + L + '" y="' + (H - 6) +
             '" fill="var(--muted,#6b6459)" font-size="10.5">sunrise ' + clock(from) +
             " to sunrise " + clock(to) + "</text>");
      hostS.innerHTML = o.join("") + "</svg>";
    }

    /* the five limbs at sunrise, which is what names the day */
    var hostL = $("sw-limbs");
    if (hostL) {
      var P = S.pan, L = S.pan.at;
      function card(k, v, s) {
        return '<div class="axcard"><div class="axk">' + esc2(k) + '</div><div class="axv">' +
               esc2(v) + '</div>' + (s ? '<div class="axs">' + s + "</div>" : "") + "</div>";
      }
      var fest = NP.festivalsOn ? (NP.festivalsOn(P.ms, S.place) || []) : [];
      hostL.innerHTML =
        card("Tithi", cap(L.tithi.paksha) + " " + L.tithi.name,
             "number " + L.tithi.n + " of 30 · ends " + clock(runs.tithi[0] && runs.tithi[0].end)) +
        card("Nakṣatra", L.nak.name,
             "pāda " + (L.nak.pada || "—") + " · ends " +
             clock(runs.nakshatra[0] && runs.nakshatra[0].end)) +
        card("Yoga", L.yoga.name, "ends " + clock(runs.yoga[0] && runs.yoga[0].end)) +
        card("Karaṇa", L.karana.name, "ends " + clock(runs.karana[0] && runs.karana[0].end)) +
        card("Vāra", P.vara, "turns at sunrise, not midnight") +
        card("Māsa", (P.masa && P.masa.amanta) || "—",
             "amānta · pūrṇimānta " + ((P.masa && P.masa.purnimanta) || "—")) +
        card("Sunrise", clock(from), "sunset " + clock(NP.riseSet(from, S.place, -1))) +
        (fest.length ? card("Observance", fest[0].name || fest[0],
                            fest.length > 1 ? fest.length + " today" : "") : "");
    }

    drawTithi(runs.tithi, from, to);
    return runs;
  }

  /* The tithi panel. Its reason for existing is the two awkward cases: a tithi
     that spans two sunrises is counted on both days (adhika), and one that
     begins and ends between two sunrises is counted on neither (kṣaya). Both
     are what make a lunar calendar drift against a civil one, and a page that
     printed one tithi per day would hide exactly that. */
  function drawTithi(runs, from, to) {
    var h = $("sw-tithi"); if (!h) return;
    var NP = window.NP;
    var o = ['<table class="axtab"><thead><tr><th>Tithi</th><th>Pakṣa</th>' +
             '<th>Begins</th><th>Ends</th><th>Runs for</th><th>Standing</th></tr></thead><tbody>'];
    runs.forEach(function (r) {
      var hours = (r.start != null && r.end != null) ? (r.end - r.start) / 3600000 : null;
      var atSunrise = r.start != null && r.end != null && r.start <= from && r.end > from;
      var standing = atSunrise ? "names the day"
        : (r.start > from && r.end != null && r.end < to
            ? "<b>begins and ends inside the day</b> — a kṣaya tithi, counted on no day"
            : "runs on into the next day");
      o.push("<tr><td>" + esc2(r.name) + "</td><td>" + esc2(r.paksha || "") + "</td><td>" +
        (r.start != null ? (r.start < from ? "<i>before sunrise</i> " : "") + clock(r.start) : "—") +
        "</td><td>" + (r.end != null ? clock(r.end) : "—") + "</td><td>" +
        (hours != null ? hours.toFixed(1) + " h" : "—") + "</td><td>" + standing + "</td></tr>");
    });
    o.push("</tbody></table>");

    var kshaya = runs.filter(function (r) {
      return r.start != null && r.end != null && r.start > from && r.end < to;
    });
    var spans = runs.filter(function (r) { return r.end != null && r.end >= to; });
    if (kshaya.length)
      o.push('<div class="note"><b>A kṣaya tithi today.</b> ' + esc2(kshaya[0].name) +
        " begins at " + clock(kshaya[0].start) + " and ends at " + clock(kshaya[0].end) +
        ", both between one sunrise and the next, so no civil day carries it. " +
        "A pañcāṅga that lists one tithi per day simply omits it.</div>");
    if (spans.length)
      o.push('<div class="note"><b>' + esc2(spans[0].name) +
        " runs past the next sunrise</b>, so it names tomorrow as well as part of today — " +
        "an adhika tithi, counted twice.</div>");
    h.innerHTML = o.join("");
  }

  /* ---- the card -------------------------------------------------------- */

  function drawCard() {
    var C = window.NCard, cv = $("sw-canvas");
    if (!C || !cv || !S.sky || !S.pan) return;
    var R = C.RATIOS[S.ratio] || C.RATIOS["4:5"], W = R.w, H = R.h;
    cv.width = W; cv.height = H;
    var c = cv.getContext("2d");
    /* theme() installs the palette into NCard's shared PAL and returns it;
       frame(), foot(), wheel() and phase() all read that rather than taking a
       palette argument, so it has to be set BEFORE any of them is called. */
    var th = S.theme || Object.keys(C.THEMES)[0];
    var pal = C.theme(th);

    var P = S.pan, L = P.at, pad = Math.round(W * 0.085), y = Math.round(H * 0.105);
    var ink = pal.ink, mute = pal.dim;

    C.frame(c, W, H, { pad: pad });

    /* the headline */
    var head = S.head === "nak" ? L.nak.name
      : S.head === "date" ? longDate(S.day)
      : S.head === "masa" ? ((P.masa && P.masa.amanta) || "") + " māsa"
      : (cap(L.tithi.paksha) + " " + L.tithi.name);
    c.fillStyle = ink;
    c.textAlign = "left";
    c.font = "600 " + Math.round(W * 0.082) + "px Georgia, 'Times New Roman', serif";
    c.fillText(head, pad, y);
    y += Math.round(W * 0.052);
    c.fillStyle = mute;
    c.font = Math.round(W * 0.032) + "px Georgia, serif";
    c.fillText(longDate(S.day) + ($("sw-c-place").checked ? "  ·  " + S.place.n : ""), pad, y);

    /* the wheel */
    if ($("sw-c-wheel").checked) {
      var R2 = Math.round(W * 0.31), cy = Math.round(H * (S.ratio === "9:16" ? 0.40 : 0.44));
      C.wheel(c, Math.round(W / 2), cy, R2, S.sky, { stars: true, labels: true });
      y = cy + R2 + Math.round(W * 0.06);
    } else {
      y += Math.round(W * 0.05);
    }

    /* the moon phase */
    if ($("sw-c-phase").checked && C.phase) {
      var el = P.elongation != null ? P.elongation
        : (S.sky ? ((S.sky.planets[1].sid - S.sky.planets[0].sid) % 360 + 360) % 360 : 0);
      C.phase(c, W - pad - Math.round(W * 0.055), Math.round(H * 0.105) - Math.round(W * 0.018),
              Math.round(W * 0.052), el);
    }

    /* THE BLOCK IS LAID OUT AGAINST A RESERVED FOOTER ZONE, not flowed down
       the canvas. foot() draws at H − W·0.155 whatever has already been
       written there, so flowing the limbs downward put the vāra row, the
       end-times line and the brand footer on top of one another. The rows are
       measured first and the line height is shrunk to fit what is left. */
    var footTop = Math.round(window.NCard.footTop(W, H) - W * 0.045);
    var rows = [];
    if ($("sw-c-limbs").checked) {
      rows = [["Tithi", L.tithi.name], ["Nakṣatra", L.nak.name],
              ["Yoga", L.yoga.name], ["Karaṇa", L.karana.name], ["Vāra", P.vara]];
      if ($("sw-c-sun").checked)
        rows.push(["Sunrise", clock(P.sunrise) + "   sunset " +
                   clock(window.NP.riseSet(P.sunrise, S.place, -1))]);
    }
    var fest = ($("sw-c-fest").checked && window.NP.festivalsOn)
      ? (window.NP.festivalsOn(P.ms, S.place) || []) : [];
    var endsOn = $("sw-c-ends").checked && S.runs;

    /* how many lines have to fit, and therefore how tall each may be */
    var extra = (endsOn ? 1 : 0) + (fest.length ? 1 : 0);
    var lines = rows.length + extra;
    var avail = footTop - y;
    var lh = lines ? Math.min(Math.round(W * 0.047), Math.floor(avail / lines)) : 0;
    /* when the cap wins there is slack left over; split it so the block sits
       centred between the wheel and the footer rather than hugging the wheel
       with a field of empty sky beneath it */
    if (lines) y += Math.floor((avail - lines * lh) / 2);

    rows.forEach(function (r) {
      c.fillStyle = mute;
      c.font = Math.round(Math.min(W * 0.026, lh * 0.56)) + "px Georgia, serif";
      c.textAlign = "left";
      c.fillText(r[0].toUpperCase(), pad, y);
      c.fillStyle = ink;
      c.font = Math.round(Math.min(W * 0.034, lh * 0.72)) + "px Georgia, serif";
      c.textAlign = "right";
      c.fillText(String(r[1]), W - pad, y);
      y += lh;
    });
    c.textAlign = "left";

    if (fest.length) {
      c.fillStyle = ink;
      c.font = "600 " + Math.round(Math.min(W * 0.036, lh * 0.76)) + "px Georgia, serif";
      c.fillText(String(fest[0].name || fest[0]), pad, y);
      y += lh;
    }

    if (endsOn) {
      var ends = [];
      ["tithi", "nakshatra", "yoga", "karana"].forEach(function (k) {
        var r = S.runs[k] && S.runs[k][0];
        if (r && r.end != null)
          ends.push(k.charAt(0).toUpperCase() + k.slice(1, 4) + " " + clock(r.end));
      });
      if (ends.length) {
        c.fillStyle = mute;
        c.font = Math.round(Math.min(W * 0.027, lh * 0.58)) + "px Georgia, serif";
        c.fillText("ends   " + ends.join("    "), pad, y);
      }
    }

    /* recorded so the harness can assert the invariant this layout exists to
       keep: the block must end above where foot() starts drawing */
    c.canvas.dataset.swBlockBottom = String(Math.round(y));
    c.canvas.dataset.swFootTop = String(Math.round(window.NCard.footTop(W, H)));

    C.foot(c, W, H, { pad: pad, place: $("sw-c-place").checked ? S.place.n : "" });
  }

  function caption() {
    var P = S.pan; if (!P) return "";
    var L = P.at;
    var f = (window.NP.festivalsOn ? (window.NP.festivalsOn(P.ms, S.place) || []) : []);
    var lines = [
      cap(L.tithi.paksha) + " " + L.tithi.name + " · " + L.nak.name,
      longDate(S.day) + " · " + S.place.n,
      "Tithi ends " + clock(S.runs && S.runs.tithi[0] && S.runs.tithi[0].end) +
        ", nakṣatra " + clock(S.runs && S.runs.nakshatra[0] && S.runs.nakshatra[0].end),
      "Yoga " + L.yoga.name + " · Karaṇa " + L.karana.name + " · " + P.vara,
      "Māsa " + ((P.masa && P.masa.amanta) || "") + " (amānta)"
    ];
    if (f.length) lines.push(String(f[0].name || f[0]));
    lines.push("", "Computed in the browser, sidereal, " +
      (window.__ayanModes && window.__ayanModes[S.ayan]
        ? window.__ayanModes[S.ayan].name : S.ayan) + " ayanāṃśa.");
    return lines.join("\n");
  }

  /* ---- wiring ---------------------------------------------------------- */

  function render() {
    var ok = compute();
    if (ok === "range") {
      host.innerHTML = '<p class="swfail">This page covers ' + window.NP.RANGE.min + "–" +
        window.NP.RANGE.max + ' only. ' + esc2(window.NP.rangeWhy || "") + "</p>";
      return;
    }
    if (!ok) { host.innerHTML = '<p class="swfail">Could not compute that day.</p>'; return; }
    drawWheel();
    S.runs = drawDay();
    drawCard();
    var cap = $("sw-caption");
    if (cap && !cap.dataset.touched) cap.value = caption();
  }

  function fillSelects() {
    var a = $("sw-ayan");
    if (a && window.__ayanModes && !a.options.length) {
      var M = window.__ayanModes;
      a.innerHTML = Object.keys(M).map(function (k) {
        return '<option value="' + k + '"' + (k === S.ayan ? " selected" : "") + ">" +
               esc2(M[k].name) + "</option>";
      }).join("");
    }
    var r = $("sw-ratio");
    if (r && window.NCard && !r.options.length) {
      var R = window.NCard.RATIOS;
      r.innerHTML = Object.keys(R).map(function (k) {
        return '<option value="' + k + '"' + (k === S.ratio ? " selected" : "") + ">" +
               esc2(R[k].label || k) + "</option>";
      }).join("");
    }
    var t = $("sw-theme");
    /* NCard.THEMES is an OBJECT keyed by name, each entry carrying .key and
       .label — not an array of pairs. Treating it as one threw
       "THEMES.map is not a function" and left the select empty. */
    if (t && window.NCard && window.NCard.THEMES && !t.options.length) {
      var TH = window.NCard.THEMES;
      t.innerHTML = Object.keys(TH).map(function (k) {
        return '<option value="' + esc2(k) + '">' + esc2(TH[k].label || k) + "</option>";
      }).join("");
      S.theme = t.value;
    }
  }

  function bind() {
    document.addEventListener("change", function (ev) {
      var t = ev.target;
      if (t.id === "sw-date") { S.day = parseDay(t.value); render(); }
      else if (t.id === "sw-when") {
        S.when = t.value;
        $("sw-timewrap").hidden = t.value !== "custom";
        render();
      }
      else if (t.id === "sw-time") { S.time = t.value; render(); }
      else if (t.id === "sw-ayan") { S.ayan = t.value; render(); }
      else if (t.id === "sw-ratio") { S.ratio = t.value; drawCard(); }
      else if (t.id === "sw-theme") { S.theme = t.value; drawCard(); }
      else if (t.id === "sw-head") { S.head = t.value; drawCard(); }
      else if (t.id && /^sw-c-/.test(t.id)) drawCard();
      else if (t.getAttribute && t.getAttribute("data-swtog")) {
        SWH_SHOW[t.getAttribute("data-swtog")] = t.checked;
        drawWheel();
      }
    });
    document.addEventListener("click", function (ev) {
      var b = ev.target.closest ? ev.target.closest("[data-sw]") : null;
      if (!b) return;
      var a = b.getAttribute("data-sw");
      if (a === "step") {
        var k = +b.getAttribute("data-k");
        S.day += k * 86400000;
        /* re-anchor to local midnight: a day is not always 86,400,000 ms away
           from the one before it once a zone offset is in play */
        S.day = parseDay(dayStr(S.day));
        $("sw-date").value = dayStr(S.day);
        render();
      } else if (a === "today") {
        S.day = parseDay(dayStr(Date.now()));
        $("sw-date").value = dayStr(S.day);
        render();
      } else if (a === "png") {
        var cv = $("sw-canvas");
        if (!cv) return;
        cv.toBlob(function (blob) {
          if (!blob) { msg("The browser would not produce a file."); return; }
          var u = URL.createObjectURL(blob), link = document.createElement("a");
          link.href = u;
          link.download = "nirayana-" + dayStr(S.day) + "-" + S.ratio.replace(":", "x") + ".png";
          document.body.appendChild(link); link.click();
          document.body.removeChild(link);
          setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
          msg("Saved.");
        }, "image/png");
      } else if (a === "copy") {
        var cap = $("sw-caption");
        if (!cap) return;
        cap.select();
        var done = false;
        try { done = document.execCommand("copy"); } catch (e) {}
        if (!done && navigator.clipboard) {
          navigator.clipboard.writeText(cap.value).then(function () { msg("Copied."); },
            function () { msg("Select the caption and copy it."); });
          return;
        }
        msg(done ? "Copied." : "Select the caption and copy it.");
      }
    });
    var cap = $("sw-caption");
    if (cap) cap.addEventListener("input", function () { cap.dataset.touched = "1"; });
  }
  var msgT = null;
  function msg(s) {
    var m = $("sw-msg"); if (!m) return;
    m.textContent = s;
    clearTimeout(msgT);
    msgT = setTimeout(function () { m.textContent = ""; }, 2600);
  }

  /* ---- start ----------------------------------------------------------- */

  host.innerHTML = '<p class="swfail">Computing the sky…</p>';
  need([
    { src: "engine.js", have: function () { return !!window.quickSky; } },
    /* panchanga.js, NOT calendar.js. calendar.js is that page's controller and
       defines no NP of its own — the build emits window.NP from panchanga.js +
       festivals.js under the name panchanga.js, and asking for the wrong one
       loaded a page controller and left NP undefined. */
    { src: "panchanga.js", have: function () { return !!(window.NP && window.NP.day); } },
    { src: "places.js", have: function () { return !!window.NPlaces; } },
    { src: "cards.js", have: function () { return !!window.NCard; } }
  ], function () {
    S.place = (window.NP.savedPlace && window.NP.savedPlace()) ||
              (window.NP.PLACES && window.NP.PLACES[0]) ||
              { n: "Ujjain", lat: 23.1765, lon: 75.7885, tz: 5.5 };
    var p = $("sw-place");
    if (p) p.textContent = S.place.n;
    S.day = parseDay(dayStr(Date.now()));
    var di = $("sw-date");
    if (di) {
      di.value = dayStr(S.day);
      di.min = window.NP.RANGE.min + "-01-01";
      di.max = window.NP.RANGE.max + "-12-31";
    }
    fillSelects();
    toggles();
    bind();
    render();
  });
})();
