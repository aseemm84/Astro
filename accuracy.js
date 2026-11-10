/* accuracy.html — draws the measured figures.
 *
 * Every number comes from the JSON the build inlined into the page as
 * <script type="application/json" id="data-accuracy">, written by
 * source/test/make-accuracy-data.mjs. Nothing is typed here, nothing is
 * fetched, and the page works opened from a file:// URL with no server.
 *
 * The charts are hand-rolled SVG rather than a library, for the usual reason
 * on this site: a charting library is 60–200 KB to draw eight small pictures,
 * and it would be a second thing deciding what the colours mean. Everything
 * here takes its colour from the theme tokens so the page is legible in all
 * five palettes, which report-contrast.mjs measures.
 */
(function () {
  "use strict";

  var el = document.getElementById("data-accuracy");
  if (!el) return;
  var D;
  try { D = JSON.parse(el.textContent); } catch (e) { return; }

  var $ = function (id) { return document.getElementById(id); };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  /* A colour that exists in every palette. The fallbacks matter: an inline
     style with no fallback is the one thing that beats every theme rule, which
     is how this site's dark mode broke once already. */
  var C = {
    ink:  "var(--ink, #23201c)",
    mute: "var(--muted, #6b6459)",
    line: "var(--border-2, #d9d2c6)",
    good: "var(--sem-good, #1c6b46)",
    bad:  "var(--sem-bad, #a1493a)",
    warn: "var(--sem-warn, #8a6d1f)",
    band: "var(--surface-2, #f2eee6)",
    accent: "var(--accent, #2f5d8a)"
  };

  var svgNS = "http://www.w3.org/2000/svg";
  function svg(w, h, label) {
    var s = document.createElementNS(svgNS, "svg");
    s.setAttribute("viewBox", "0 0 " + w + " " + h);
    s.setAttribute("class", "axsvg");
    s.setAttribute("role", "img");
    s.setAttribute("aria-label", label || "");
    return s;
  }
  function add(p, name, attrs, text) {
    var n = document.createElementNS(svgNS, name);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    p.appendChild(n);
    return n;
  }

  /* ---- the headline cards ---------------------------------------------- */

  function card(k, v, sub) {
    return '<div class="axcard"><div class="axk">' + esc(k) + '</div>' +
           '<div class="axv">' + v + '</div>' +
           (sub ? '<div class="axs">' + sub + '</div>' : '') + '</div>';
  }
  var sun = D.modern.perBody[0], moon = D.modern.perBody[1];
  var sat = D.modern.perBody[D.modern.perBody.length - 1];
  var g = $("ax-headline");
  if (g) g.innerHTML =
    card("Sūrya", moon ? sun.lonWorst + "″" : "—",
         "worst of " + D._provenance.denseSamples + " samples") +
    card("Candra", moon.lonWorst + "″",
         "1/" + Math.round(1800 / moon.lonWorst) + " of a D60 aṃśa") +
    card("Śani", sat.lonWorst + "″",
         "bounded; the reference’s own error is " + sat.referenceOwnError + "″") +
    card("Lagna", D.modern.lagna[0].constructionWorst.toFixed(3) + "″",
         "the construction itself, on identical inputs") +
    card("Ayanāṃśa spread", D.ayanamsa.spreadDeg + "°",
         "across " + D.ayanamsa.modes.length + " modes — convention, not error") +
    /* The spread above is a CONVENTION spread — admissible choices, no correct
       value among them. This card is a different kind of statement: the one
       epoch the measurable evidence supports. Without it the page reads as
       though the whole 5.83° were equally open, which is not what the evidence
       says. */
    (D.ayanamsa.measuredZero
      ? card("Measured sidereal zero",
             D.ayanamsa.measuredZero.epochCE + " ± " +
               D.ayanamsa.measuredZero.sigmaYears + " CE",
             "a ±" + D.ayanamsa.measuredZero.bandArcmin + "′ band — the 27-star " +
             "dhruvakā ensemble and the solar apogee of three texts, combined")
      : "");

  /* ---- inline spans ---------------------------------------------------- */

  var SPANS = {
    denseSamples: D._provenance.denseSamples,
    span: D._provenance.span.replace("-", "–"),
    ayanSpread: D.ayanamsa.spreadDeg + "°",
    moonWorst: moon.lonWorst + "″",
    dashaPerArcsec: D.cost.dashaDaysPerArcsec,
    dashaPerArcsecMin: D.cost.dashaDaysPerArcsecMin,
    dashaPerArcsecMax: D.cost.dashaDaysPerArcsecMax,
    birthMinuteArcsec: D.cost.birthMinuteArcsec + "″",
    birthMinuteDashaDays: Math.round(D.cost.birthMinuteDashaDays),
    engineBirthSeconds: D.cost.engineEquivalentBirthSeconds + " seconds",
    fitParams: D.siddhanta.fitProvenance.parameters,
    holdoutSamples: D.siddhanta.fitProvenance.holdoutSamples,
    generated: D._provenance.generated,
    exactToSwiss: D.ayanamsa.exactToSwiss,
    anchorGap: D.ayanamsa.anchorGapDeg + "\u00b0",
    lagnaConstruction: D.modern.lagna[0].constructionWorst.toFixed(3) + "\u2033",
    lagnaPolar: (D.modern.lagna.filter(function (l) { return l.polar; })[0]
                 || D.modern.lagna[0]).endToEndWorst + "\u2033",
    refGuru: (D.modern.perBody.filter(function (b) { return b.en === "Jupiter"; })[0]
              || {}).referenceOwnError + "\u2033",
    refSani: (D.modern.perBody.filter(function (b) { return b.en === "Saturn"; })[0]
              || {}).referenceOwnError + "\u2033"
  };
  Array.prototype.forEach.call(document.querySelectorAll(".axn"), function (n) {
    var k = n.getAttribute("data-k");
    if (SPANS[k] != null) n.textContent = SPANS[k];
  });

  /* ---- 0 · what the engines do ---------------------------------------- */

  (function () {
    var K = D.capabilities; if (!K) return;

    /* the counter row */
    var g0 = $("ax-counts");
    if (g0) g0.innerHTML =
      card("Report sections", K.reportSections, "in " + K.tabs + " tabs") +
      card("Divisional charts", K.vargas, "the ṣoḍaśa varga, D1 to D60") +
      card("Ayanāṃśa conventions", K.ayanamsaModes,
           "switchable after the chart is cast") +
      card("Yoga rules", K.yogaRules, "each with its cancellation conditions") +
      card("Motion scenes", K.motionScenes, "animated, rendered in the browser") +
      card("Reference pages", K.referencePages, "on the tradition itself");

    /* the family bars — a horizontal stack, which reads better than a treemap
       at this size and does not need a legend */
    (function () {
      var host = $("ax-families"); if (!host) return;
      var F = K.families.slice().sort(function (a, b) { return b.count - a.count; });
      var W = 760, rowH = 30, T = 16, L = 158, R = 46;
      var H = T + F.length * rowH + 22;
      var max = F.reduce(function (m, f) { return Math.max(m, f.count); }, 0);
      var x = function (n) { return (n / max) * (W - L - R); };
      var s2 = svg(W, H, "The report's sections grouped into families.");
      F.forEach(function (f, i) {
        var y = T + i * rowH;
        add(s2, "rect", { x: L, y: y, width: Math.max(x(f.count), 2), height: 18,
                          rx: 3, fill: C.accent, "fill-opacity": 0.82 });
        add(s2, "text", { x: L - 10, y: y + 13, "text-anchor": "end", fill: C.ink,
                          "font-size": 12 }, f.name);
        add(s2, "text", { x: L + x(f.count) + 8, y: y + 13, fill: C.mute,
                          "font-size": 11.5 }, f.count);
      });
      add(s2, "text", { x: L, y: H - 7, fill: C.mute, "font-size": 10.5 },
          K.reportSections + " sections in all");
      host.appendChild(s2);
    })();

    /* the pipeline — numbered steps with connecting rule */
    (function () {
      var host = $("ax-pipeline"); if (!host) return;
      var P = K.pipeline, W = 760, rowH = 38, T = 14;
      var H = T + P.length * rowH + 6;
      var s2 = svg(W, H, "What goes in and what comes out of the engines.");
      add(s2, "line", { x1: 18, y1: T + 4, x2: 18, y2: T + (P.length - 1) * rowH + 4,
                        stroke: C.line, "stroke-width": 1.5 });
      P.forEach(function (p, i) {
        var y = T + i * rowH;
        add(s2, "circle", { cx: 18, cy: y + 4, r: 6.5, fill: C.band,
                            stroke: C.accent, "stroke-width": 1.6 });
        add(s2, "text", { x: 18, y: y + 7.5, "text-anchor": "middle", fill: C.accent,
                          "font-size": 8.5, "font-weight": 600 }, i + 1);
        add(s2, "text", { x: 36, y: y + 8, fill: C.ink, "font-size": 12.5,
                          "font-weight": 600 }, p.step);
        add(s2, "text", { x: 36, y: y + 24, fill: C.mute, "font-size": 11.5 }, p.detail);
      });
      host.appendChild(s2);
    })();

    /* the reach timeline */
    (function () {
      var host = $("ax-reach"); if (!host) return;
      var R = K.reach, W = 760, rowH = 40, T = 32, L = 192, PAD = 34;
      var H = T + R.length * rowH + 26;
      var lo = R.reduce(function (m, r) { return Math.min(m, r.from); }, 9999);
      var hi = R.reduce(function (m, r) { return Math.max(m, r.to); }, -9999);
      var x = function (y) { return L + (y - lo) / (hi - lo) * (W - L - PAD); };
      var s2 = svg(W, H, "The span of years each engine will stand behind.");
      [-3000, -2000, -1000, 0, 1000, 2000, 3000].forEach(function (y) {
        if (y < lo || y > hi) return;
        add(s2, "line", { x1: x(y), y1: T - 14, x2: x(y), y2: H - 22, stroke: C.line,
                          "stroke-width": 0.8, "stroke-dasharray": "2 4" });
        add(s2, "text", { x: x(y), y: T - 18, "text-anchor": "middle", fill: C.mute,
                          "font-size": 10 },
            y === 0 ? "1 BCE" : (y < 0 ? Math.abs(y) + " BCE" : y));
      });
      R.forEach(function (r, i) {
        var y = T + i * rowH, checked = /checked|Measured/.test(r.what);
        add(s2, "rect", { x: x(r.from), y: y, width: Math.max(x(r.to) - x(r.from), 3),
                          height: 15, rx: 3,
                          fill: checked ? C.good : C.warn,
                          "fill-opacity": checked ? 0.85 : 0.45 });
        add(s2, "text", { x: L - 10, y: y + 12, "text-anchor": "end", fill: C.ink,
                          "font-size": 12 }, r.what);
        add(s2, "text", { x: L, y: y + 29, fill: C.mute, "font-size": 11 }, r.note);
      });
      host.appendChild(s2);
    })();
  })();

  /* ---- 1 · the logarithmic scale --------------------------------------- */

  (function () {
    var host = $("ax-scale"); if (!host) return;
    var W = 760, L = 142, R = 30, T = 34;
    /* Sized from the content. It was a flat 300 at first and the last two
       grahas fell out of the box, through the axis and into the caption —
       which no probe reports, because the SVG renders perfectly well with
       its contents outside the viewBox. */
    var dvH = D.divisions.length * 26, gH = D.modern.perBody.length * 20;
    var gy = T + dvH + 28;
    var H = gy + gH + 44;
    var lo = Math.log10(1), hi = Math.log10(30 * 3600);      /* 1″ to 30° */
    var x = function (a) { return L + (Math.log10(a) - lo) / (hi - lo) * (W - L - R); };
    var s = svg(W, H, "Every graha's worst measured error against the divisions of the zodiac, on a logarithmic scale.");

    /* division bands */
    D.divisions.slice().reverse().forEach(function (d, i) {
      var y = T + i * 26;
      add(s, "rect", { x: x(1), y: y, width: x(d.arcsec) - x(1), height: 18,
                       fill: C.band, stroke: C.line, "stroke-width": 0.6, rx: 2 });
      add(s, "text", { x: x(1) - 8, y: y + 13, "text-anchor": "end",
                       fill: C.mute, "font-size": 11 }, d.name);
      add(s, "text", { x: x(d.arcsec) + 5, y: y + 13, fill: C.mute,
                       "font-size": 10 }, d.deg >= 1 ? d.deg.toFixed(d.deg < 10 ? 2 : 0) + "°"
                                                      : (d.deg * 60).toFixed(0) + "′");
    });

    /* A guide from each division's right edge down through the graha rows. The
       two halves were readable separately and impossible to compare: the whole
       point is that every dot sits left of every band's end, and without a
       line to follow the eye cannot check it. */
    D.divisions.forEach(function (d) {
      add(s, "line", { x1: x(d.arcsec), y1: T, x2: x(d.arcsec), y2: H - 22,
                       stroke: C.line, "stroke-width": 0.8, "stroke-dasharray": "2 4" });
    });

    /* the grahas */
    D.modern.perBody.forEach(function (b, i) {
      var y = gy + i * 20;
      add(s, "line", { x1: x(1), y1: y, x2: x(b.lonWorst), y2: y,
                       stroke: C.line, "stroke-width": 1 });
      add(s, "circle", { cx: x(b.lonWorst), cy: y, r: 4.5,
                         fill: b.lonWorst < 20 ? C.good : C.warn });
      add(s, "text", { x: x(1) - 8, y: y + 4, "text-anchor": "end",
                       fill: C.ink, "font-size": 11.5 }, b.sa);
      add(s, "text", { x: x(b.lonWorst) + 9, y: y + 4, fill: C.mute,
                       "font-size": 10.5 }, b.lonWorst + "″");
    });

    /* axis */
    var ticks = [1, 10, 60, 600, 3600, 36000, 108000];
    var ay = H - 16;
    add(s, "line", { x1: x(1), y1: ay - 8, x2: x(30 * 3600), y2: ay - 8,
                     stroke: C.line, "stroke-width": 1 });
    ticks.forEach(function (t) {
      if (t > 30 * 3600) return;
      add(s, "line", { x1: x(t), y1: ay - 12, x2: x(t), y2: ay - 4, stroke: C.line });
      var lab = t < 60 ? t + "″" : t < 3600 ? (t / 60) + "′" : (t / 3600) + "°";
      add(s, "text", { x: x(t), y: ay + 9, "text-anchor": "middle",
                       fill: C.mute, "font-size": 10 }, lab);
    });
    add(s, "text", { x: L, y: 16, fill: C.mute, "font-size": 11 },
        "worst measured error →  logarithmic");
    host.appendChild(s);
  })();

  /* ---- the division table --------------------------------------------- */

  (function () {
    var host = $("ax-divtable"); if (!host) return;
    var h = '<table class="axtab"><thead><tr><th>Division</th><th>Width</th>' +
            '<th>Candra ' + moon.lonWorst + '″ is</th>' +
            '<th>Śani ' + sat.lonWorst + '″ is</th></tr></thead><tbody>';
    D.divisions.forEach(function (d) {
      h += '<tr><td>' + esc(d.name) + '</td><td>' +
           (d.deg >= 1 ? d.deg.toFixed(d.deg < 10 ? 3 : 0) + "°"
                       : (d.deg * 60).toFixed(0) + "′") +
           '</td><td>1 part in ' + d.moonFraction.toLocaleString() +
           '</td><td>1 part in ' + d.saturnFraction.toLocaleString() + '</td></tr>';
    });
    host.innerHTML = h + '</tbody></table>';
  })();

  /* ---- 2 · the ayanāṃśa ruler ----------------------------------------- */

  (function () {
    var host = $("ax-ayan"); if (!host) return;
    var M = D.ayanamsa.modes;
    var W = 760, L = 34, R = 34, T = 96;
    var lo = M[0].deg - 0.22, hi = M[M.length - 1].deg + 0.22;
    var x = function (v) { return L + (v - lo) / (hi - lo) * (W - L - R); };

    /* SEVENTEEN LABELS IN SIX DEGREES DO NOT FIT ON TWO ROWS. Alternating them
       above and below the rule was the first attempt and produced "T. Revatī
       SS Revatī Nir. Revatī" written on top of each other — three modes within
       a tenth of a degree of one another. So each label is placed on the first
       row where it clears the last one placed there, with a leader line down to
       its tick. Rows fill upward from the rule, so the crowded clusters stack
       and the isolated modes stay close to it. */
    var ROWW = 54, ROWH = 15, rows = [];
    var placed = M.map(function (m) {
      var cx = x(m.deg), r = 0;
      while (rows[r] != null && cx - rows[r] < ROWW) r++;
      rows[r] = cx;
      return { m: m, cx: cx, row: r };
    });
    var nrows = rows.length;
    T = 26 + nrows * ROWH;
    /* Room for the caption lines below the axis. The measured-zero line added
       a fourth and overflowed the viewBox at 92 — accuracy-verify's "no chart
       spills outside its own viewBox" check caught it, which is exactly what
       that check is for. Conditional, so a build without the data keeps the
       old height rather than a band of empty space. */
    var H = T + (D.ayanamsa.measuredZero ? 112 : 92);
    var s2 = svg(W, H, "Nineteen ayanamsa conventions spanning nearly six degrees, with the engine's own Moon error drawn to the same scale, and the measured sidereal zero stated beneath.");

    add(s2, "line", { x1: L, y1: T, x2: W - R, y2: T, stroke: C.line, "stroke-width": 1.5 });
    for (var d = Math.ceil(lo); d <= Math.floor(hi); d++) {
      add(s2, "line", { x1: x(d), y1: T - 5, x2: x(d), y2: T + 5, stroke: C.line });
      add(s2, "text", { x: x(d), y: T + 19, "text-anchor": "middle", fill: C.mute,
                        "font-size": 10.5 }, d + "\u00b0");
    }
    placed.forEach(function (p) {
      var ty = T - 10 - (nrows - 1 - p.row) * ROWH;
      var col = p.m.exactToSwiss ? C.accent : C.mute;
      add(s2, "line", { x1: p.cx, y1: T - 6, x2: p.cx, y2: ty + 3,
                        stroke: col, "stroke-width": p.m.exactToSwiss ? 1.4 : 1,
                        "stroke-dasharray": p.m.exactToSwiss ? null : "2 2" });
      add(s2, "text", { x: p.cx, y: ty, "text-anchor": "middle", fill: C.ink,
                        "font-size": 10 }, p.m.tag);
    });

    /* the engine's own Moon error, at the same scale */
    var mw = moon.lonWorst / 3600, yb = T + 46;
    add(s2, "rect", { x: L, y: yb - 4, width: Math.max(x(lo + mw) - L, 1.2), height: 8,
                      fill: C.bad });
    add(s2, "text", { x: L + 14, y: yb + 3, fill: C.bad, "font-size": 11.5 },
        "\u2190 the engine\u2019s worst Moon error at this scale: " + moon.lonWorst
        + "\u2033, which is " + mw.toFixed(5) + "\u00b0");
    add(s2, "text", { x: L, y: yb + 26, fill: C.mute, "font-size": 11 },
        "the span above is " + D.ayanamsa.spreadDeg + "\u00b0 \u2014 about "
        + Math.round(D.ayanamsa.spreadDeg * 3600 / moon.lonWorst).toLocaleString()
        + " times larger, and every bit of it is convention");
    add(s2, "text", { x: L, y: yb + 44, fill: C.mute, "font-size": 10.5 },
        D.ayanamsa.exactToSwiss + " of the " + M.length
        + " reproduce Swiss Ephemeris to 0.000\u2033 (marked in the accent colour), "
        + "so none of this spread is imprecision");
    /* "All convention" is true and incomplete: the choices are conventions,
       but the evidence is not silent about which one the sky supports. Saying
       only the first half invites the reading that any mode is as defensible
       as any other. */
    if (D.ayanamsa.measuredZero) {
      var mz = D.ayanamsa.measuredZero;
      add(s2, "text", { x: L, y: yb + 62, fill: C.mute, "font-size": 10.5 },
          "convention is not the same as unconstrained: the measurable evidence "
          + "puts the sidereal zero at " + mz.epochCE + " \u00b1 " + mz.sigmaYears
          + " CE, a \u00b1" + mz.bandArcmin + "\u2032 band");
    }
    host.appendChild(s2);
  })();

  /* ---- 3 · what it costs ---------------------------------------------- */

  (function () {
    var host = $("ax-cost"); if (!host) return;
    var c = D.cost;
    host.innerHTML =
      card("Nakṣatra or pāda boundary", c.nakshatraBoundarySeconds + " s",
           "the Moon at 0.549″ per second") +
      card("Tithi, yoga, karaṇa end", c.tithiEndSeconds + " s",
           "the elongation closes at 0.449″ per second") +
      card("Viṃśottarī mahādaśā",
           c.mahadashaDaysMin.toFixed(1) + "–" + c.mahadashaDaysMax.toFixed(1) + " days",
           c.dashaDaysPerArcsecMin + "–" + c.dashaDaysPerArcsecMax +
           " days per arcsecond of Moon by nakṣatra lord, " +
           c.dashaDaysPerArcsec + " on the cycle average") +
      card("Antardaśā in a 20-year period",
           c.antardashaDays.toFixed(1) + " days", "scaled by 20/120") +
      card("Equivalent birth-time error",
           c.engineEquivalentBirthSeconds + " s",
           "against ≈" + Math.round(c.birthMinuteDashaDays)
           + " days of daśā per minute of birth time");
  })();

  /* ---- 4 · the band curve --------------------------------------------- */

  (function () {
    var host = $("ax-bands"); if (!host) return;
    var pts = D.moonCurve;
    var W = 760, H = 230, L = 52, R = 18, T = 20, B = 40;
    var y0 = pts.reduce(function (m, p) { return Math.max(m, p.d); }, 0);
    var x = function (y) { return L + (y - 1000) / 2000 * (W - L - R); };
    var y = function (v) { return H - B - (v / (y0 * 1.05)) * (H - T - B); };
    var s = svg(W, H, "The Moon's disagreement with the reference from 1000 to 3000, with the checked window shaded.");

    var win = D._provenance.certifiedWindow;
    add(s, "rect", { x: x(win[0]), y: T, width: x(win[1]) - x(win[0]),
                     height: H - T - B, fill: C.band, stroke: C.line,
                     "stroke-width": 0.6 });
    add(s, "text", { x: (x(win[0]) + x(win[1])) / 2, y: T + 13, "text-anchor": "middle",
                     fill: C.mute, "font-size": 10 }, win[0] + "–" + win[1]);

    var dpath = pts.map(function (p, i) {
      return (i ? "L" : "M") + x(p.y).toFixed(1) + " " + y(p.d).toFixed(1);
    }).join(" ");
    add(s, "path", { d: dpath, fill: "none", stroke: C.accent, "stroke-width": 1.2,
                     "stroke-opacity": 0.85 });

    add(s, "line", { x1: L, y1: H - B, x2: W - R, y2: H - B, stroke: C.line });
    [1000, 1400, 1800, 2200, 2600, 3000].forEach(function (yy) {
      add(s, "line", { x1: x(yy), y1: H - B, x2: x(yy), y2: H - B + 5, stroke: C.line });
      add(s, "text", { x: x(yy), y: H - B + 18, "text-anchor": "middle",
                       fill: C.mute, "font-size": 10 }, yy);
    });
    [0, 60, 120, 180, 240].forEach(function (v) {
      if (v > y0 * 1.05) return;
      add(s, "line", { x1: L - 4, y1: y(v), x2: L, y2: y(v), stroke: C.line });
      add(s, "text", { x: L - 8, y: y(v) + 3.5, "text-anchor": "end", fill: C.mute,
                       "font-size": 10 }, v + "″");
    });
    host.appendChild(s);
  })();

  (function () {
    var host = $("ax-bandtable"); if (!host) return;
    var h = '<table class="axtab"><thead><tr><th>Years</th><th>Moon, worst</th>' +
            '<th>Tithi end</th><th>Nakṣatra end</th></tr></thead><tbody>';
    D.bands.forEach(function (b) {
      h += '<tr' + (b.certified ? ' class="axnow"' : '') + '><td>' + b.from +
           "–" + b.to + (b.certified ? ' <i>checked</i>' : '') +
           '</td><td>' + b.moon + '″</td><td>' +
           (b.tithi < 100 ? b.tithi + " s" : Math.round(b.tithi / 60) + " min") +
           '</td><td>' +
           (b.nak < 100 ? b.nak + " s" : Math.round(b.nak / 60) + " min") +
           '</td></tr>';
    });
    host.innerHTML = h + '</tbody></table>';
  })();

  /* ---- 5 · the bare siddhānta ----------------------------------------- */

  (function () {
    var host = $("ax-bare"); if (!host) return;
    var rows = D.siddhanta.bareByYear, bodies = D.siddhanta.measured.map(function (m) { return m.sa; });
    var h = '<table class="axtab"><thead><tr><th>Year</th>';
    bodies.forEach(function (b) { h += '<th>' + esc(b) + '</th>'; });
    h += '</tr></thead><tbody>';
    rows.forEach(function (r) {
      h += '<tr><td>' + r.year + '</td>';
      bodies.forEach(function (b) {
        var v = r[b];
        h += '<td style="color:' + (Math.abs(v) > 3 ? C.bad : C.mute) + '">' +
             (v > 0 ? "+" : "") + v.toFixed(2) + '°</td>';
      });
      h += '</tr>';
    });
    host.innerHTML = h + '</tbody></table><p class="axcap">The Sūrya Siddhānta’s ' +
      'own constants, minus this site’s modern engine, in <b>degrees</b>. ' +
      'Not a fault in the implementation — the method’s own accuracy.</p>';
  })();

  /* ---- 6 · bare against measured -------------------------------------- */

  (function () {
    var host = $("ax-fit"); if (!host) return;
    var M = D.siddhanta.measured;
    var W = 760, H = 44 + M.length * 34, L = 92, R = 70, T = 30;
    var lo = Math.log10(0.5), hi = Math.log10(600);          /* arcminutes */
    var x = function (v) { return L + (Math.log10(Math.max(v, 0.5)) - lo) / (hi - lo) * (W - L - R); };
    var s = svg(W, H, "Each graha before and after measuring the constants, logarithmic, in arcminutes.");

    [1, 10, 60, 600].forEach(function (t) {
      add(s, "line", { x1: x(t), y1: T - 12, x2: x(t), y2: H - 14, stroke: C.line,
                       "stroke-dasharray": "2 3" });
      add(s, "text", { x: x(t), y: T - 16, "text-anchor": "middle", fill: C.mute,
                       "font-size": 10 }, t >= 60 ? (t / 60) + "°" : t + "′");
    });
    M.forEach(function (m, i) {
      var y = T + i * 34;
      add(s, "line", { x1: x(m.measuredRms), y1: y + 7, x2: x(m.bareRms), y2: y + 7,
                       stroke: C.line, "stroke-width": 7, "stroke-linecap": "round" });
      add(s, "circle", { cx: x(m.bareRms), cy: y + 7, r: 5, fill: C.bad });
      add(s, "circle", { cx: x(m.measuredRms), cy: y + 7, r: 5,
                         fill: m.measuredRms < 15 ? C.good : C.warn });
      add(s, "text", { x: L - 10, y: y + 11, "text-anchor": "end", fill: C.ink,
                       "font-size": 11.5 }, m.sa);
      add(s, "text", { x: W - R + 8, y: y + 11, fill: C.mute, "font-size": 10.5 },
          "×" + m.gain);
      add(s, "text", { x: x(m.measuredRms), y: y - 3, "text-anchor": "middle",
                       fill: C.mute, "font-size": 9.5 },
          m.measuredRms < 10 ? m.measuredRms.toFixed(2) + "′"
                             : Math.round(m.measuredRms) + "′");
    });
    add(s, "text", { x: L - 10, y: H - 2, "text-anchor": "end", fill: C.bad,
                     "font-size": 10 }, "● bare text");
    add(s, "text", { x: L + 70, y: H - 2, fill: C.good, "font-size": 10 },
        "● measured constants");
    host.appendChild(s);
  })();

  /* ---- 7 · the evection cards ----------------------------------------- */

  (function () {
    var host = $("ax-evection"); if (!host) return;
    var L = D.siddhanta.lunarDiagnostic;
    host.innerHTML =
      card("Correlation", L.correlationWithEvection,
           "the residual against sin(2D − M), the evection argument") +
      card("Evection recovered", L.amplitudeArcmin.evection + "′",
           "from the residual alone; the textbook value is "
           + L.textbookArcmin.evection + "′") +
      card("Variation recovered", Math.abs(L.amplitudeArcmin.variation) + "′",
           "the textbook value is " + L.textbookArcmin.variation + "′") +
      card("Scatter, before and after", L.rms + "′ → " + L.rmsAfterRemovingThem + "′",
           "removing just those two terms");
  })();

  /* ---- 8 · precision -------------------------------------------------- */

  (function () {
    var host = $("ax-precision"); if (!host) return;
    var L = D.modern.lagna;
    var h = '<table class="axtab"><thead><tr><th>Quantity</th><th>Precision</th>' +
            '<th>What it means</th></tr></thead><tbody>';
    function row(a, b, c) {
      h += '<tr><td>' + a + '</td><td><b>' + b + '</b></td><td>' + c + '</td></tr>';
    }
    row("Lagna construction", L[0].constructionWorst.toFixed(3) + "″",
        "the closed form against an independent vector construction, on identical inputs — exact");
    row("Ayanāṃśa polynomials", "0.000″",
        D.ayanamsa.exactToSwiss + " of " + D.ayanamsa.modes.length +
        " modes reproduce Swiss Ephemeris exactly");
    row("Mean node", D.modern.meanNodeWorst + "″",
        "the same polynomial both sides — a typo check, not a theory check");
    row("Sidereal time", D.modern.gastWorst + "″",
        "against ERFA gst06a; different nutation series and UT1 treatment");
    row("Vargas, Ashṭakavarga, Ṣaḍbala", "exact",
        "integer and rational arithmetic on a longitude; they add no error of their own");
    L.forEach(function (p) {
      row("Lagna end to end — " + esc(p.place) + " (" + p.lat.toFixed(2) + "°)",
          p.endToEndWorst + "″",
          p.polar ? "near the pole the ecliptic meets the horizon shallowly, amplifying the sidereal-time gap about ninefold"
                  : "entirely the sidereal-time gap above, seen through the geometry");
    });
    host.innerHTML = h + '</tbody></table>';
  })();
})();
;
