/* ayanamsa.html — what the ayanāṃśa is, what it changes, and one you make.
 *
 * CHART-INDEPENDENT. Nothing natal is read; the only inputs are a year, a
 * moment and a place. window.__ayanFor answers for any of the engine's
 * definitions at any instant, which is the whole of what this page needs.
 *
 * NOTHING IS TYPED INTO THE PROSE. Every figure on the page — the gap, the
 * spread between definitions, the per-term contributions, what moves and
 * what cannot — is measured here from the engine at the moment you are
 * looking at it. The one place that would have been easy to fake is the
 * cancellation result, and it is the one most worth not faking.
 *
 * A USER-MADE AYANĀṂŚA IS A REAL ONE. window.__ayanModes is the engine's own
 * live table and setAyanamsaMode accepts any key in it, so registering a
 * definition here makes every other part of the site honour it — the wheels,
 * the pañcāṅga, a cast chart. No engine change was needed for that, which is
 * worth knowing before anyone adds one.
 */
(function () {
  "use strict";

  var host = document.getElementById("ay-rings");
  if (!host) return;
  var $ = function (id) { return document.getElementById(id); };
  var NS = "http://www.w3.org/2000/svg";

  var S = {
    year: 2026, ringMode: "lahiri",
    when: null, place: null,
    custom: null,          /* the key, once registered */
    ratio: "4:5", cardKind: "gap"
  };

  /* ---- loading --------------------------------------------------------- */
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
          '</code>, which this page needs to compute anything.</p>';
      };
      document.head.appendChild(s);
    })();
  }

  /* ---- the engine, asked ------------------------------------------------ */
  /* The same year→JD the Motion scene uses, so a figure here and the same
     figure there come from one conversion rather than two. */
  function jdOf(year) { return 2451545.0 + (year - 2000) * 365.2425; }
  function ayanAt(mode, year) {
    try { return window.__ayanFor(mode, jdOf(year)); } catch (e) { return null; }
  }
  function modes() { return window.__ayanModes || {}; }
  function modeKeys() { return Object.keys(modes()); }
  /* esc, SA and GL come from ayanamsa-prelude.js at the top level, because
     northChart needs them there too and two copies of a thing like SA is
     exactly how a page ends up disagreeing with the report about the name of
     a rāśi. */
  function dm(x) {
    var neg = x < 0; x = Math.abs(x);
    var d = Math.floor(x), m = (x - d) * 60, mi = Math.floor(m),
        s = Math.round((m - mi) * 60);
    if (s === 60) { s = 0; mi++; }
    if (mi === 60) { mi = 0; d++; }
    return (neg ? "−" : "") + d + "°" + (mi < 10 ? "0" : "") + mi + "′" +
           (s < 10 ? "0" : "") + s + "″";
  }
  function yearLabel(y) {
    return y < 0 ? (Math.abs(Math.round(y)) + " BCE") : (Math.round(y) + " CE");
  }
  function el(tag, at, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in at) n.setAttribute(k, at[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  var NAK = ["Aśvinī", "Bharaṇī", "Kṛttikā", "Rohiṇī", "Mṛgaśira", "Ārdrā",
             "Punarvasu", "Puṣya", "Āśleṣā", "Maghā", "P.Phalgunī", "U.Phalgunī",
             "Hasta", "Citrā", "Svātī", "Viśākhā", "Anurādhā", "Jyeṣṭhā", "Mūla",
             "P.Āṣāḍhā", "U.Āṣāḍhā", "Śravaṇa", "Dhaniṣṭhā", "Śatabhiṣā",
             "P.Bhādra", "U.Bhādra", "Revatī"];

  /* ---- 1. the two rings ------------------------------------------------- */
  function xy(cx, cy, r, deg) {
    var a = (180 - deg) * Math.PI / 180;
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  }
  function wedge(cx, cy, r0, r1, a0, a1) {
    var p = [xy(cx, cy, r1, a0), xy(cx, cy, r1, a1), xy(cx, cy, r0, a1), xy(cx, cy, r0, a0)];
    var lg = (((a1 - a0) % 360 + 360) % 360) > 180 ? 1 : 0;
    return "M" + p[0][0].toFixed(1) + "," + p[0][1].toFixed(1) +
      " A" + r1 + "," + r1 + " 0 " + lg + " 1 " + p[1][0].toFixed(1) + "," + p[1][1].toFixed(1) +
      " L" + p[2][0].toFixed(1) + "," + p[2][1].toFixed(1) +
      " A" + r0 + "," + r0 + " 0 " + lg + " 0 " + p[3][0].toFixed(1) + "," + p[3][1].toFixed(1) + " Z";
  }

  function drawRings() {
    var ay = ayanAt(S.ringMode, S.year);
    if (ay == null) return;
    /* The zero labels sit at r=312, outside the 288 ring, so the box has to
       be wider than the drawing or they are cut off at the edge — which they
       were, reading "...quinox 0°". */
    var W = 700, H = 680, cx = 350, cy = 336;
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="aysvg" role="img" ' +
      'aria-label="Two zodiac rings: the outer fixed to the stars, the inner to the ' +
      'seasons, with the ayanāṃśa as the angle between their zero points">' +
      '<title>The gap between the two zeros</title>';

    /* the sidereal ring — fixed to the stars, so it never turns */
    for (var s = 0; s < 12; s++) {
      o += '<path d="' + wedge(cx, cy, 238, 288, s * 30, s * 30 + 30) +
           '" class="ay-sid' + (s % 2 ? " alt" : "") + '"/>';
      var m = xy(cx, cy, 263, s * 30 + 15);
      o += '<text x="' + m[0].toFixed(1) + '" y="' + (m[1] + 4).toFixed(1) +
           '" class="ay-sidlab">' + esc(SA[s]) + '</text>';
    }
    /* the tropical ring — tied to the equinox, so it creeps backwards */
    for (var t = 0; t < 12; t++) {
      var b0 = t * 30 + ay;
      o += '<path d="' + wedge(cx, cy, 176, 226, b0, b0 + 30) +
           '" class="ay-trop' + (t % 2 ? " alt" : "") + '"/>';
      var q = xy(cx, cy, 201, b0 + 15);
      o += '<text x="' + q[0].toFixed(1) + '" y="' + (q[1] + 4).toFixed(1) +
           '" class="ay-troplab">' + esc(SA[t]) + '</text>';
    }
    /* the two zeros, and the angle between them, which IS the ayanāṃśa */
    var z1 = xy(cx, cy, 300, 0), z2 = xy(cx, cy, 300, ay);
    o += '<line x1="' + cx + '" y1="' + cy + '" x2="' + z1[0].toFixed(1) + '" y2="' +
         z1[1].toFixed(1) + '" class="ay-zsid"/>';
    o += '<line x1="' + cx + '" y1="' + cy + '" x2="' + z2[0].toFixed(1) + '" y2="' +
         z2[1].toFixed(1) + '" class="ay-ztrop"/>';
    if (Math.abs(ay) > 0.01) {
      o += '<path d="' + wedge(cx, cy, 0, 150, Math.min(0, ay), Math.max(0, ay)) +
           '" class="ay-gap"/>';
    }
    var lab1 = xy(cx, cy, 312, 0), lab2 = xy(cx, cy, 312, ay);
    o += '<text x="' + lab1[0].toFixed(1) + '" y="' + (lab1[1] - 6).toFixed(1) +
         '" class="ay-zlab sid">stars 0°</text>';
    o += '<text x="' + lab2[0].toFixed(1) + '" y="' + (lab2[1] + 16).toFixed(1) +
         '" class="ay-zlab trop">equinox 0°</text>';
    var mid = xy(cx, cy, 92, ay / 2);
    o += '<text x="' + mid[0].toFixed(1) + '" y="' + mid[1].toFixed(1) +
         '" class="ay-gapval">' + (ay >= 0 ? "" : "−") +
         Math.abs(ay).toFixed(2) + '°</text>';
    o += '<text x="' + cx + '" y="' + (cy + 40) + '" class="ay-gapsub">' +
         esc(dm(ay)) + '</text>';
    o += "</svg>";
    host.innerHTML = o;

    $("ay-yearlab").textContent = yearLabel(S.year);
    var M = modes()[S.ringMode] || {};
    $("ay-ringnote").textContent = (M.name || S.ringMode) + " — " + (M.note || "");
    drawTerms(ay);
    drawEquation();
  }

  /* ---- 2. precession, as a cone ----------------------------------------- */
  /* Static, because the point is the shape rather than the motion, and a
     second thing animating beside the rings competes with them for attention. */
  function drawCone() {
    var h = $("ay-cone");
    if (!h) return;
    var W = 620, H = 300;
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="aysvg" role="img" ' +
      'aria-label="The Earth\'s axis sweeping a cone once in about 25,800 years">' +
      '<title>Why the equinox moves</title>';
    var cx = 230, base = 250, apexY = 70;
    /* the cone the axis sweeps */
    o += '<ellipse cx="' + cx + '" cy="' + apexY + '" rx="86" ry="26" class="ay-conetop"/>';
    o += '<path d="M' + (cx - 86) + ',' + apexY + ' L' + cx + ',' + base +
         ' L' + (cx + 86) + ',' + apexY + '" class="ay-cone"/>';
    /* the Earth, tilted */
    o += '<g transform="translate(' + cx + ',' + base + ') rotate(-23.4)">' +
         '<ellipse cx="0" cy="0" rx="42" ry="42" class="ay-earth"/>' +
         '<line x1="0" y1="-66" x2="0" y2="66" class="ay-axis"/>' +
         '<line x1="-48" y1="0" x2="48" y2="0" class="ay-equator"/>' +
         '</g>';
    o += '<text x="' + cx + '" y="' + (apexY - 36) + '" class="ay-conelab">' +
         'the axis comes back here in ≈25,800 years</text>';
    o += '<text x="' + (cx + 104) + '" y="' + (base - 54) +
         '" class="ay-conetilt">tilt 23½°</text>';
    /* the consequence, stated beside it */
    var tx = 470;
    [["50″", "a year"], ["1°", "in 72 years"], ["30°", "in 2,150 years"]]
      .forEach(function (r, i) {
        var y = 110 + i * 56;
        o += '<text x="' + tx + '" y="' + y + '" class="ay-rate">' + r[0] + '</text>';
        o += '<text x="' + tx + '" y="' + (y + 22) + '" class="ay-ratesub">' + r[1] + '</text>';
      });
    o += '<text x="' + tx + '" y="70" class="ay-ratehead">the equinox slides</text>';
    o += "</svg>";
    h.innerHTML = o;
  }

  /* ---- 3. the equation, and its terms ----------------------------------- */
  function drawEquation() {
    var h = $("ay-eq");
    if (!h) return;
    var M = modes()[S.ringMode];
    if (!M) return;
    if (M.f) {
      h.innerHTML = '<div class="ayeqrow"><span class="ayeqbad">' +
        esc(M.name) + ' is not a polynomial at all</span></div>' +
        '<p class="ayeqnote">This definition is stated as a rule rather than ' +
        'as a formula of this shape, so there are no terms to split apart. ' +
        'Pick another definition above to see the three pieces.</p>';
      return;
    }
    var c = M.c;                 /* [c2, c1, c0] — highest power first */
    h.innerHTML =
      '<div class="ayeqrow">' +
      '<span class="ayeqlhs">ayanāṃśa</span><span class="ayeqop">=</span>' +
      '<span class="ayeqterm t0"><b>' + c[2].toFixed(4) + '°</b>' +
        '<i>where it stood in 2000</i></span><span class="ayeqop">+</span>' +
      '<span class="ayeqterm t1"><b>' + c[1].toFixed(4) + '° × T</b>' +
        '<i>how fast it opens</i></span><span class="ayeqop">+</span>' +
      '<span class="ayeqterm t2"><b>' + c[0].toFixed(6) + '° × T²</b>' +
        '<i>the slow change in that rate</i></span>' +
      '</div>' +
      '<p class="ayeqnote"><b>T</b> is centuries since the year 2000 — so ' +
      (S.year === 2000 ? "0 right now" :
        esc(((S.year - 2000) / 100).toFixed(2)) + " for " + yearLabel(S.year)) +
      '. The middle term is the one degree per seventy-two years; it does ' +
      'nearly all the work.</p>';
  }

  function drawTerms(total) {
    var h = $("ay-terms");
    if (!h) return;
    var M = modes()[S.ringMode];
    if (!M || !M.c) { h.innerHTML = ""; return; }
    var T = (S.year - 2000) / 100;
    var parts = [
      { k: "t0", lab: "where it stood in 2000", v: M.c[2] },
      { k: "t1", lab: "the steady opening", v: M.c[1] * T },
      { k: "t2", lab: "the slow change in rate", v: M.c[0] * T * T }
    ];
    var span = Math.max(1, Math.max.apply(null, parts.map(function (p) {
      return Math.abs(p.v);
    })));
    /* the value is printed beyond the end of its bar, so the box needs room
       for the longest bar AND its label — at 620 wide the first one read
       "+23.857" with the degree sign off the edge */
    var W = 760, H = 190, mid = 286;
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="aysvg" role="img" ' +
      'aria-label="The three terms of the formula, as bars, at the chosen year">' +
      '<title>What each term contributes</title>';
    o += '<line x1="' + mid + '" y1="14" x2="' + mid + '" y2="' + (H - 34) + '" class="ay-axis0"/>';
    parts.forEach(function (p, i) {
      var y = 26 + i * 42;
      var w = Math.abs(p.v) / span * 230;
      var x = p.v >= 0 ? mid : mid - w;
      o += '<rect x="' + x.toFixed(1) + '" y="' + y + '" width="' + Math.max(1, w).toFixed(1) +
           '" height="22" class="ay-bar ' + p.k + '"/>';
      o += '<text x="' + (p.v >= 0 ? x + w + 8 : x - 8) + '" y="' + (y + 16) +
           '" class="ay-barval" text-anchor="' + (p.v >= 0 ? "start" : "end") + '">' +
           (p.v >= 0 ? "+" : "−") + Math.abs(p.v).toFixed(4) + '°</text>';
      o += '<text x="12" y="' + (y + 16) + '" class="ay-barlab">' + esc(p.lab) + '</text>';
    });
    o += '<text x="12" y="' + (H - 10) + '" class="ay-bartot">total at ' +
         esc(yearLabel(S.year)) + ' — ' + (total >= 0 ? "" : "−") +
         Math.abs(total).toFixed(4) + '° = ' + esc(dm(total)) + '</text>';
    o += "</svg>";
    h.innerHTML = o;
  }

  /* ---- 4. what it changes, measured ------------------------------------- */
  /* The claim this is here to make is that some quantities CANNOT move,
     because the ayanāṃśa cancels out of them. That is an algebraic fact, and
     an algebraic fact asserted in prose is worth nothing, so the page
     measures it instead: the same instant is computed under several very
     different definitions and the results are put side by side. */
  function skyUnder(mode) {
    if (!window.quickSky || !S.place || S.when == null) return null;
    var tz = (S.place.tz || 0);
    var d = new Date(S.when + tz * 3600000);
    return window.quickSky({
      year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
      hour: d.getUTCHours(), minute: d.getUTCMinutes(), second: d.getUTCSeconds(),
      tzHours: tz, lat: S.place.lat, lon: S.place.lon, ayanamsa: mode
    });
  }
  function limbsOf(sky) {
    if (!sky) return null;
    var g = function (n) {
      var p = sky.planets.filter(function (x) { return x.en === n; })[0];
      return p ? p.sid : null;
    };
    var sun = g("Sun"), moon = g("Moon");
    if (sun == null || moon == null) return null;
    var diff = ((moon - sun) % 360 + 360) % 360;
    var sum = ((moon + sun) % 360 + 360) % 360;
    return {
      ayan: sky.ayanamsa, sun: sun, moon: moon,
      elong: diff, sum: sum,
      tithi: Math.floor(diff / 12) + 1,
      karana: Math.floor(diff / 6) + 1,
      yoga: Math.floor(sum / (360 / 27)) + 1,
      nak: Math.floor(moon / (360 / 27)) + 1,
      rasi: Math.floor(moon / 30)
    };
  }

  function drawImpact() {
    var h = $("ay-impact");
    if (!h) return;
    var picks = ["lahiri", "raman", "fagan", "ss_text"];
    if (S.custom) picks.push(S.custom);
    var rows = [];
    picks.forEach(function (k) {
      var L = limbsOf(skyUnder(k));
      if (L) rows.push({ k: k, name: (modes()[k] || {}).name || k, L: L });
    });
    if (rows.length < 2) { h.innerHTML = ""; return; }

    var uniq = function (f) {
      var seen = {};
      rows.forEach(function (r) { seen[f(r.L)] = 1; });
      return Object.keys(seen).length;
    };
    /* to six decimals: the claim is exact cancellation, and rounding to two
       would let a real difference of half an arcminute hide inside it */
    var sameElong = uniq(function (L) { return L.elong.toFixed(6); }) === 1;
    var sameKarana = uniq(function (L) { return L.karana; }) === 1;
    var sameTithi = uniq(function (L) { return L.tithi; }) === 1;
    var yogaMoves = uniq(function (L) { return L.sum.toFixed(4); }) > 1;
    var nakMoves = uniq(function (L) { return L.nak; }) > 1;

    var o = '<div class="aytabwrap"><table class="aytab"><thead><tr>' +
      '<th>Definition</th><th>ayanāṃśa</th><th>Moon</th><th>rāśi</th>' +
      '<th>nakṣatra</th><th>tithi</th><th>karaṇa</th><th>yoga</th>' +
      '</tr></thead><tbody>';
    rows.forEach(function (r) {
      o += '<tr' + (r.k === S.custom ? ' class="mine"' : '') + '>' +
        '<td>' + esc(r.name) + '</td>' +
        '<td class="num">' + esc(dm(r.L.ayan)) + '</td>' +
        '<td class="num">' + esc(dm(r.L.moon)) + '</td>' +
        '<td>' + esc(SA[r.L.rasi]) + '</td>' +
        '<td>' + esc(NAK[r.L.nak - 1]) + '</td>' +
        '<td class="num">' + r.L.tithi + '</td>' +
        '<td class="num">' + r.L.karana + '</td>' +
        '<td class="num">' + r.L.yoga + '</td>' +
        '</tr>';
    });
    o += '</tbody></table></div>';

    /* the doubling, measured between the two extremes rather than asserted */
    var lo = rows[0], hi = rows[rows.length - 1];
    var dA = hi.L.ayan - lo.L.ayan;
    var dSum = ((hi.L.sum - lo.L.sum + 540) % 360) - 180;
    var ratio = Math.abs(dA) > 1e-6 ? dSum / dA : null;

    o += '<ul class="aycheck">' +
      li(sameElong, "The Moon–Sun gap is identical to six decimal places across all " +
         rows.length + " — so the <b>tithi cannot move</b>, whatever is chosen.") +
      li(sameKarana && sameTithi, "The tithi and the karaṇa come out the same number in every row.") +
      li(yogaMoves, "The Moon+Sun sum <b>does</b> move, so the yoga does.") +
      (ratio == null ? "" :
        li(Math.abs(ratio + 2) < 0.02 || Math.abs(ratio - -2) < 0.02,
           "And it moves by <b>" + ratio.toFixed(3) + "×</b> the change in ayanāṃśa — " +
           "which is −2, because a sum carries the subtraction twice.")) +
      /* not a pass or a fail: whether the Moon happens to sit near a
         nakṣatra boundary at this instant is a property of the instant, not
         of the argument, so it is marked as an observation */
      liNote(nakMoves
          ? "At this moment the Moon's nakṣatra differs between definitions too."
          : "At this moment the Moon happens to stay in one nakṣatra across these " +
            "definitions — it is not near a boundary. Move the time and it will.") +
      '</ul>';
    h.innerHTML = o;

    function li(ok, text) {
      return '<li class="' + (ok ? "yes" : "no") + '">' + text + "</li>";
    }
    function liNote(text) { return '<li class="obs">' + text + "</li>"; }
  }

  /* ---- 5. the spread ----------------------------------------------------- */
  function drawSpread() {
    var h = $("ay-spread");
    if (!h) return;
    var keys = modeKeys();
    var vals = keys.map(function (k) {
      return { k: k, name: (modes()[k] || {}).s || k, v: ayanAt(k, S.year) };
    }).filter(function (r) { return r.v != null; })
      .sort(function (a, b) { return a.v - b.v; });
    if (!vals.length) return;
    var lo = vals[0].v, hi = vals[vals.length - 1].v, span = hi - lo || 1;
    var W = 620, H = 60 + vals.length * 21;
    var x0 = 150, x1 = W - 70;
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="aysvg" role="img" ' +
      'aria-label="Every definition this site offers, at the chosen year, on one scale">' +
      '<title>How far the definitions disagree</title>';
    o += '<text x="12" y="18" class="ay-sprhead">at ' + esc(yearLabel(S.year)) +
         ' they span ' + esc(dm(span)) + '</text>';
    vals.forEach(function (r, i) {
      var y = 38 + i * 21;
      var x = x0 + (r.v - lo) / span * (x1 - x0);
      o += '<line x1="' + x0 + '" y1="' + y + '" x2="' + x1 + '" y2="' + y +
           '" class="ay-sprrail"/>';
      o += '<circle cx="' + x.toFixed(1) + '" cy="' + y + '" r="4.5" class="ay-sprdot' +
           (r.k === S.ringMode ? " on" : "") + (r.k === S.custom ? " mine" : "") + '"/>';
      o += '<text x="' + (x0 - 10) + '" y="' + (y + 4) + '" class="ay-sprname' +
           (r.k === S.ringMode ? " on" : "") + '">' + esc(r.name) + '</text>';
      o += '<text x="' + (x1 + 8) + '" y="' + (y + 4) + '" class="ay-sprval">' +
           r.v.toFixed(2) + '°</text>';
    });
    o += "</svg>";
    h.innerHTML = o;

    /* the table of what each one is, straight from the engine's own notes */
    var t = $("ay-modetable");
    if (t) {
      var rowsHtml = vals.map(function (r) {
        var M = modes()[r.k] || {};
        return '<tr' + (r.k === S.custom ? ' class="mine"' : '') + '><td>' +
          esc(M.name || r.k) + '</td><td class="num">' + esc(dm(r.v)) +
          '</td><td class="note">' + esc(M.note || "") + '</td></tr>';
      }).join("");
      t.innerHTML = '<div class="aytabwrap"><table class="aytab"><thead><tr>' +
        '<th>Definition</th><th>at ' + esc(yearLabel(S.year)) +
        '</th><th>What it is</th></tr></thead><tbody>' + rowsHtml +
        '</tbody></table></div>';
    }
  }

  /* ---- 6. the sandbox ---------------------------------------------------- */
  var CUSTOM_KEY = "yours";
  function sandbox() {
    var h = $("ay-sandbox");
    if (!h || h.firstChild) return;
    var stars = (window.YOGATARAS || []).slice();
    h.innerHTML =
      '<div class="aysandcols">' +
      '<div class="aysandcol"><h3>By the numbers</h3>' +
      '<label>Where it stood in 2000 <input type="range" id="ay-c0" min="0" max="30" ' +
        'step="0.001" value="23.857"><span class="ayread" id="ay-c0v"></span></label>' +
      '<label>How fast it opens, arcseconds a year <input type="range" id="ay-c1" ' +
        'min="0" max="80" step="0.1" value="50.288"><span class="ayread" id="ay-c1v"></span></label>' +
      '<label>Curvature <input type="range" id="ay-c2" min="-0.002" max="0.002" ' +
        'step="0.00001" value="0.000307"><span class="ayread" id="ay-c2v"></span></label>' +
      '</div>' +
      '<div class="aysandcol"><h3>Or pin a star</h3>' +
      '<p class="aysandnote">Choose a junction star and the longitude you want it to ' +
      'sit at. Every star-pinned definition turns out to be Lahiri shifted by a ' +
      'constant — which is why pinning Citrā at 180° very nearly <i>is</i> Lahiri, ' +
      'the definition whose name means exactly that.</p>' +
      '<label>Star <select id="ay-star" class="swin">' +
      stars.map(function (st) {
        return '<option value="' + st.id + '"' + (st.nak === "Citrā" ? " selected" : "") +
          '>' + esc(st.nak) + " — " + esc(st.star) + '</option>';
      }).join("") + '</select></label>' +
      '<label>Held at <input type="number" id="ay-pin" step="0.001" value="180" ' +
        'class="swin"> degrees</label>' +
      '<button type="button" class="swbtn" data-ay="pin">Use this pin</button>' +
      '</div></div>' +
      '<div class="aysandout" id="ay-sandout"></div>' +
      '<div class="aybar">' +
      '<button type="button" class="swbtn swprimary" data-ay="apply">Register it with the engine</button>' +
      '<button type="button" class="swbtn" data-ay="drop">Remove it</button>' +
      '<span class="swmsg" id="ay-sandmsg"></span></div>';
    syncSand();
  }

  function sandCoeffs() {
    var c0 = +($("ay-c0") || {}).value || 0;
    var c1 = (+($("ay-c1") || {}).value || 0) / 3600 * 100;   /* ″/yr → °/century */
    var c2 = +($("ay-c2") || {}).value || 0;
    return [c2, c1, c0];
  }
  function syncSand() {
    var c = sandCoeffs();
    if ($("ay-c0v")) $("ay-c0v").textContent = c[2].toFixed(3) + "°";
    if ($("ay-c1v")) $("ay-c1v").textContent =
      (+($("ay-c1") || {}).value || 0).toFixed(1) + "″/yr  (" + c[1].toFixed(4) + "°/century)";
    if ($("ay-c2v")) $("ay-c2v").textContent = c[0].toFixed(6);  /* c[0] is the T² term */
    var T = (S.year - 2000) / 100;
    var mine = c[0] * T * T + c[1] * T + c[2];
    var lah = ayanAt("lahiri", S.year);
    var out = $("ay-sandout");
    if (out) {
      out.innerHTML = '<b>Yours at ' + esc(yearLabel(S.year)) + ':</b> ' +
        esc(dm(mine)) + ' &nbsp;·&nbsp; Lahiri says ' + esc(dm(lah)) +
        ' &nbsp;·&nbsp; you differ by <b>' + esc(dm(mine - lah)) + '</b>' +
        ' — which is ' + Math.abs((mine - lah) / (360 / 27 / 4)).toFixed(2) +
        ' nakṣatra pādas.';
    }
  }
  function applyPin() {
    var id = +($("ay-star") || {}).value;
    var st = (window.YOGATARAS || []).filter(function (x) { return x.id === id; })[0];
    if (!st) return;
    var target = +($("ay-pin") || {}).value;
    /* The catalogue holds each star's sidereal longitude under Lahiri. To put
       it at `target` instead, the whole frame shifts by the difference — so a
       pinned definition is Lahiri plus a constant, exactly. */
    var lahC = (modes().lahiri || {}).c;
    if (!lahC) return;
    var shift = st.sid - target;
    $("ay-c0").value = (lahC[2] + shift).toFixed(3);
    $("ay-c1").value = (lahC[1] / 100 * 3600).toFixed(1);
    $("ay-c2").value = lahC[0].toFixed(6);
    syncSand();
    msg("ay-sandmsg", esc(st.nak) + " pinned at " + target + "° — that is Lahiri " +
        (shift >= 0 ? "+" : "−") + dm(Math.abs(shift)) + ".");
  }
  function applyCustom() {
    var c = sandCoeffs();
    modes()[CUSTOM_KEY] = {
      name: "Yours", s: "Yours",
      note: "a definition you made on this page; it is not saved and is gone on reload",
      c: c
    };
    S.custom = CUSTOM_KEY;
    try { window.__setAyan(CUSTOM_KEY); } catch (e) {}
    fillModeSelect();
    msg("ay-sandmsg", "Registered. The engine will use it anywhere on this site " +
        "until you reload.");
    redraw();
  }
  function dropCustom() {
    if (!S.custom) return;
    try { delete modes()[CUSTOM_KEY]; } catch (e) {}
    S.custom = null;
    if (S.ringMode === CUSTOM_KEY) S.ringMode = "lahiri";
    try { window.__setAyan("lahiri"); } catch (e) {}
    fillModeSelect();
    msg("ay-sandmsg", "Removed. Back to Lahiri.");
    redraw();
  }
  function msg(id, t) { var e = $(id); if (e) e.innerHTML = t; }


  /* ======================================================================
     THE DERIVATION — five steps, drawn
     ====================================================================== */
  var STEPS = [
    ["Two great circles", "The Sun's yearly path (the ecliptic) and the Earth's " +
     "equator projected outward are two circles on the sky, tilted 23½° apart. " +
     "They must cross at two points."],
    ["One of them is the equinox", "The crossing the Sun passes going north is " +
     "the spring equinox. It is a point in the sky, not a date, and it is where " +
     "the tropical zodiac starts."],
    ["It does not stay put", "The Earth's axis sweeps a cone, so the equator " +
     "swings with it, so the crossing slides along the ecliptic — about 50″ a year, " +
     "always in the same direction."],
    ["Choose a fixed zero", "Pick a starting point tied to the stars instead. " +
     "Every definition on this page is a different answer to exactly this one " +
     "question, and there is no way to settle it by measurement."],
    ["Measure between them", "The angle from the sliding equinox to the fixed " +
     "zero IS the ayanāṃśa. Subtract it from a tropical longitude and you have a " +
     "sidereal one."]
  ];
  function drawDerive() {
    var h = $("ay-derive");
    if (!h) return;
    var W = 700, H = 330, cx = 300, cy = 170, R = 128;
    var ay = ayanAt(S.ringMode, S.year) || 0;
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="aysvg" role="img" ' +
      'aria-label="The ecliptic and the equator crossing at the equinox, with the ' +
      'ayanāṃśa measured from there to the sidereal zero">' +
      '<title>Where the number comes from</title>';
    /* the two great circles, as ellipses seen edge-on-ish */
    o += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + R + '" ry="' + (R * 0.34) +
         '" class="ay-ecl"/>';
    o += '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + R + '" ry="' + (R * 0.34) +
         '" transform="rotate(-23.4 ' + cx + ' ' + cy + ')" class="ay-equ"/>';
    /* the crossing points */
    o += '<circle cx="' + (cx - R) + '" cy="' + cy + '" r="6" class="ay-equinox"/>';
    o += '<circle cx="' + (cx + R) + '" cy="' + cy + '" r="4" class="ay-equinox alt"/>';
    o += '<text x="' + (cx - R) + '" y="' + (cy + 28) + '" class="ay-dlab eq">equinox</text>';
    /* the sidereal zero, ay degrees along the ecliptic from the equinox */
    var t = Math.PI - ay * Math.PI / 180;
    var sx = cx + R * Math.cos(t), sy = cy - R * 0.34 * Math.sin(t);
    o += '<circle cx="' + sx.toFixed(1) + '" cy="' + sy.toFixed(1) + '" r="6" class="ay-zero"/>';
    o += '<text x="' + sx.toFixed(1) + '" y="' + (sy - 14).toFixed(1) +
         '" class="ay-dlab zero">sidereal zero</text>';
    /* the measured angle */
    o += '<path d="M' + (cx - R) + ',' + cy + ' A' + R + ',' + (R * 0.34) +
         ' 0 0 1 ' + sx.toFixed(1) + ',' + sy.toFixed(1) + '" class="ay-measure"/>';
    o += '<text x="' + cx + '" y="' + (cy - R * 0.34 - 16) + '" class="ay-dval">' +
         esc(dm(ay)) + '</text>';
    o += '<text x="' + (cx + R - 10) + '" y="' + (cy - 12) + '" class="ay-dlab ecl">ecliptic</text>';
    o += '<text x="' + (cx + 46) + '" y="' + (cy - 74) + '" class="ay-dlab equ">equator</text>';
    /* the arrow of the slide */
    o += '<path d="M' + (cx - R - 30) + ',' + (cy + 54) + ' l34,0 m-8,-5 l8,5 l-8,5" ' +
         'class="ay-slide"/>';
    o += '<text x="' + (cx - R - 30) + '" y="' + (cy + 74) +
         '" class="ay-dlab slide">the equinox slides this way, 50″ a year</text>';
    o += "</svg>";
    h.innerHTML = o;

    var ol = $("ay-steplist");
    if (ol && !ol.firstChild) {
      ol.innerHTML = STEPS.map(function (st) {
        return "<li><b>" + esc(st[0]) + "</b> " + esc(st[1]) + "</li>";
      }).join("");
    }
    drawWorked(ay);
  }

  /* The arithmetic, carried out rather than described. A formula printed is a
     formula; a formula with this year's numbers in it is something a reader
     can check against a calculator, which is the point. */
  function drawWorked(total) {
    var h = $("ay-worked");
    if (!h) return;
    var M = modes()[S.ringMode];
    if (!M) return;
    if (!M.c) {
      h.innerHTML = '<p class="ayeqnote">' + esc(M.name) + ' is stated as a rule ' +
        'rather than as this formula, so there is no line of arithmetic to show. ' +
        'Its own description is in the table further down.</p>';
      return;
    }
    var T = (S.year - 2000) / 100;
    var a = M.c[2], b = M.c[1] * T, c2 = M.c[0] * T * T;
    h.innerHTML =
      '<table class="ayworktab"><tbody>' +
      row("the year you chose", yearLabel(S.year)) +
      row("centuries since 2000 &nbsp;<i>T</i>", "(" + Math.round(S.year) +
          " − 2000) ÷ 100 = <b>" + T.toFixed(4) + "</b>") +
      row("where it stood in 2000", "<b>" + a.toFixed(6) + "°</b>") +
      row("plus the steady opening", M.c[1].toFixed(6) + "° × " + T.toFixed(4) +
          " = <b>" + (b >= 0 ? "+" : "−") + Math.abs(b).toFixed(6) + "°</b>") +
      row("plus the change in that rate", M.c[0].toFixed(8) + "° × " + T.toFixed(4) +
          "² = <b>" + (c2 >= 0 ? "+" : "−") + Math.abs(c2).toFixed(6) + "°</b>") +
      '<tr class="tot"><td>the ayanāṃśa</td><td><b>' + (a + b + c2).toFixed(6) +
      '°</b> &nbsp;=&nbsp; <b>' + esc(dm(a + b + c2)) + '</b></td></tr>' +
      '</tbody></table>' +
      '<p class="ayeqnote">Subtract that from any tropical longitude and the ' +
      'answer is sidereal. That subtraction is the whole of what an ayanāṃśa ' +
      'is for.</p>';
    function row(k, v) { return "<tr><td>" + k + "</td><td>" + v + "</td></tr>"; }
  }

  /* ======================================================================
     THE STAR-ANCHORED DEFINITIONS
     ====================================================================== */
  /* Which published definitions name a star, and which star. Taken from the
     engine's own notes rather than from a list kept here, so a definition
     cannot be described as anchored to a star the engine does not anchor it
     to. `held` marks the ones recomputed from the star for every date; the
     others set it down at an epoch and then advance by precession. */
  /* The star FAMILIES: every definition this engine carries that names the
     same junction star. `held` is the one that recomputes from the star for
     every date; the rest set it down at an epoch and advance by precession,
     or fit a polynomial to it.

     Which definition names which star is read off the engine's own notes
     rather than asserted here, so the page cannot claim an anchor the engine
     does not make. */
  var FAMILIES = [
    { star: "Citrā", at: 180, held: "truechitra",
      keys: ["truechitra", "lahiri", "nirayana_citra", "ss_citra"] },
    { star: "Revatī", at: 359 + 50 / 60, held: "truerevati",
      keys: ["truerevati", "nirayana_revati", "ss_revati"] },
    { star: "Puṣya", at: 106, held: "truepushya", keys: ["truepushya"] }
  ];
  function famOf(star) {
    var f = FAMILIES.filter(function (x) { return x.star === star; })[0];
    if (!f) return null;
    /* drop any the engine does not actually carry */
    return { star: f.star, at: f.at, held: f.held,
             keys: f.keys.filter(function (k) { return !!modes()[k]; }) };
  }

  function drawStarWheel() {
    var h = $("ay-starwheel");
    if (!h) return;
    var Y = window.YOGATARAS || [];
    if (!Y.length) { h.innerHTML = ""; return; }
    var sel = ($("ay-anchor") || {}).value || "Citrā";
    var A = famOf(sel);
    var W = 700, H = 620, cx = 350, cy = 310;
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="aysvg" role="img" ' +
      'aria-label="The twenty-seven junction stars on a ring, with the anchor star ' +
      'and the longitude it is held at marked">' +
      '<title>The junction stars, and the one this definition is pinned to</title>';
    o += '<circle cx="' + cx + '" cy="' + cy + '" r="250" class="ay-swring"/>';
    /* the 27 nakṣatra divisions, and each junction star at its own longitude */
    for (var i = 0; i < 27; i++) {
      var b0 = i * (360 / 27);
      var p0 = xy(cx, cy, 236, b0), p1 = xy(cx, cy, 264, b0);
      o += '<line x1="' + p0[0].toFixed(1) + '" y1="' + p0[1].toFixed(1) + '" x2="' +
           p1[0].toFixed(1) + '" y2="' + p1[1].toFixed(1) + '" class="ay-swdiv"/>';
    }
    Y.forEach(function (st) {
      var isA = A && st.nak === A.star;
      var p = xy(cx, cy, 250, st.sid);
      o += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' +
           (isA ? 8 : 3.4) + '" class="ay-swstar' + (isA ? " on" : "") + '"/>';
      var l = xy(cx, cy, isA ? 286 : 274, st.sid);
      o += '<text x="' + l[0].toFixed(1) + '" y="' + (l[1] + 3).toFixed(1) +
           '" class="ay-swlab' + (isA ? " on" : "") + '">' + esc(st.nak) + '</text>';
    });
    if (A) {
      /* the line from the centre to where the definition INSISTS the star sits */
      var t = xy(cx, cy, 250, A.at);
      o += '<line x1="' + cx + '" y1="' + cy + '" x2="' + t[0].toFixed(1) + '" y2="' +
           t[1].toFixed(1) + '" class="ay-swpin"/>';
      var st2 = Y.filter(function (x) { return x.nak === A.star; })[0];
      o += '<text x="' + cx + '" y="' + (cy - 14) + '" class="ay-swhead">' +
           esc(A.star) + ' held at</text>';
      o += '<text x="' + cx + '" y="' + (cy + 24) + '" class="ay-swval">' +
           esc(dm(A.at)) + '</text>';
      o += '<text x="' + cx + '" y="' + (cy + 48) + '" class="ay-swsub">' +
           A.keys.length + (A.keys.length === 1 ? " definition names it"
                                                : " definitions name it") + '</text>';
      var rd = $("ay-anchorread");
      if (rd && st2) {
        rd.innerHTML = esc(st2.star) + " (" + esc(st2.bayer) + "), the yogatārā of " +
          esc(A.star) + " — magnitude " + st2.mag.toFixed(2);
      }
    }
    o += "</svg>";
    h.innerHTML = o;
    drawDrift(sel);
  }

  /* Every definition naming this star, plotted as its distance from the one
     that HOLDS the star — which is zero by construction, so the plot reads
     directly as "how far from the star's stated longitude each of these
     actually puts it".

     WHAT THE CURVES TURNED OUT TO SHOW, which is not what was first written
     here. The prose originally said the set-down definitions slide away from
     the star. Measured, the Citrā family is dominated by a near-CONSTANT
     offset — Sūrya Siddhānta's Citrā sits about 50′ from True Chitrapakṣa
     and changes by only 1.4′ across two thousand years — while Lahiri, the
     polynomial fitted to the same anchor, starts within a quarter of an
     arcminute and departs by about 1.4′ over the same span. Those are two
     different stories and only the second is drift, so the page now reports
     the numbers and names which is which rather than telling one story about
     both. */
  function drawDrift(star) {
    var h = $("ay-drift");
    if (!h) return;
    var F = famOf(star);
    if (!F || F.keys.length < 2) {
      h.innerHTML = '<p class="ayeqnote">Only one definition on this site is ' +
        'anchored to ' + esc(star || "") + ', so there is nothing to compare it ' +
        'against here. Citrā and Revatī each have several.</p>';
      if ($("ay-driftnote")) $("ay-driftnote").textContent = "";
      return;
    }
    var y0 = 1000, y1 = 3000, N = 50;
    var series = F.keys.filter(function (k) { return k !== F.held; }).map(function (k) {
      var pts = [];
      for (var i = 0; i <= N; i++) {
        var y = y0 + (y1 - y0) * i / N;
        var ah = ayanAt(F.held, y), ak = ayanAt(k, y);
        if (ah == null || ak == null) continue;
        pts.push({ y: y, v: (ah - ak) * 60 });        /* arcminutes */
      }
      return { key: k, name: (modes()[k] || {}).s || k, pts: pts };
    }).filter(function (s2) { return s2.pts.length; });
    if (!series.length) { h.innerHTML = ""; return; }

    var all = [];
    series.forEach(function (s2) { s2.pts.forEach(function (q) { all.push(q.v); }); });
    all.push(0);
    var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
    var pad = Math.max(2, (hi - lo) * 0.18);
    lo -= pad; hi += pad;
    var W = 700, H = 300, L = 86, Rr = 120, T = 22, B = 42;
    var sx = function (y) { return L + (y - y0) / (y1 - y0) * (W - L - Rr); };
    var sy = function (v) { return T + (1 - (v - lo) / (hi - lo)) * (H - T - B); };
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="aysvg" role="img" ' +
      'aria-label="Each definition naming this star, as its distance in ' +
      'arcminutes from the one that holds the star, over two thousand years">' +
      '<title>The definitions that name this star, compared</title>';
    /* the zero line IS the held definition */
    o += '<line x1="' + L + '" y1="' + sy(0).toFixed(1) + '" x2="' + (W - Rr) +
         '" y2="' + sy(0).toFixed(1) + '" class="ay-axis0"/>';
    o += '<text x="' + (L - 8) + '" y="' + (sy(0) + 4).toFixed(1) +
         '" class="ay-dtick">on the star</text>';
    [lo + pad, hi - pad].forEach(function (v) {
      o += '<text x="' + (L - 8) + '" y="' + (sy(v) + 4).toFixed(1) +
           '" class="ay-dtick">' + (v > 0 ? "+" : "") + v.toFixed(0) + '′</text>';
    });
    var COL = ["#a1493a", "#1c6b46", "#3f6fa6", "#8a6a1f"];
    series.forEach(function (s2, i) {
      var d2 = s2.pts.map(function (q, j) {
        return (j ? "L" : "M") + sx(q.y).toFixed(1) + "," + sy(q.v).toFixed(1);
      }).join(" ");
      o += '<path d="' + d2 + '" class="ay-dline" stroke="' + COL[i % COL.length] + '"/>';
      var last = s2.pts[s2.pts.length - 1];
      o += '<text x="' + (W - Rr + 8) + '" y="' + (sy(last.v) + 4).toFixed(1) +
           '" class="ay-dkey" fill="' + COL[i % COL.length] + '">' + esc(s2.name) + '</text>';
    });
    [y0, 1500, 2000, 2500, y1].forEach(function (y) {
      o += '<text x="' + sx(y).toFixed(1) + '" y="' + (H - 16) +
           '" class="ay-dx">' + yearLabel(y) + '</text>';
    });
    o += "</svg>";
    h.innerHTML = o;

    /* the note states, for each, the offset now and how much it MOVED —
       because those are the two different things the curves show */
    var n = $("ay-driftnote");
    if (!n) return;
    n.innerHTML = "Measured against <b>" +
      esc((modes()[F.held] || {}).name || F.held) + "</b>, which holds " +
      esc(F.star) + " at its stated longitude for every date. " +
      series.map(function (s2) {
        var a0 = s2.pts[0].v, a1 = s2.pts[s2.pts.length - 1].v;
        var nowV = (function () {
          var ah = ayanAt(F.held, S.year), ak = ayanAt(s2.key, S.year);
          return (ah == null || ak == null) ? null : (ah - ak) * 60;
        })();
        return "<b>" + esc((modes()[s2.key] || {}).name || s2.key) + "</b> is " +
          (nowV == null ? "—" : (Math.abs(nowV) < 1
            ? Math.abs(nowV * 60).toFixed(0) + "″"
            : Math.abs(nowV).toFixed(1) + "′")) +
          " away at " + esc(yearLabel(S.year)) + " and moves " +
          Math.abs(a1 - a0).toFixed(1) + "′ across the two thousand years shown";
      }).join("; ") + ".";
  }

  /* ======================================================================
     WHAT IT DOES TO A CHART
     ====================================================================== */
  var CHART_AY = null;          /* null means "follow the selected definition" */

  function chartSky() {
    /* The engine is asked for TROPICAL longitudes once, by taking a sidereal
       set under a known definition and adding its ayanāṃśa back. Everything
       below is then a subtraction, so dragging the slider costs nothing and
       the grahas cannot wander for any reason other than the number. */
    var s = skyUnder("lahiri");
    if (!s) return null;
    var base = s.ayanamsa;
    return {
      ayan: base,
      planets: s.planets.map(function (p) {
        return { en: p.en, trop: ((p.sid + base) % 360 + 360) % 360 };
      }),
      lagnaTrop: ((s.lagna + base) % 360 + 360) % 360
    };
  }

  function drawChart() {
    var h = $("ay-chartsvg");
    if (!h || typeof northChart !== "function") return;
    var sky = chartSky();
    if (!sky) { h.innerHTML = ""; return; }
    var ay = CHART_AY == null ? (ayanAt(S.ringMode, S.year) || 0) : CHART_AY;
    var sid = function (trop) { return ((trop - ay) % 360 + 360) % 360; };
    var lag = Math.floor(sid(sky.lagnaTrop) / 30);
    var occ = {};
    sky.planets.forEach(function (p) {
      var sg = Math.floor(sid(p.trop) / 30);
      (occ[sg] = occ[sg] || []).push(GL[p.en] || p.en);
    });
    h.innerHTML = northChart(
      function (house) { return (lag + house - 1) % 12; },
      function (house) { return occ[(lag + house - 1) % 12] || []; },
      "Rāśi (D1)", "at ayanāṃśa " + dm(ay));

    /* the column that answers "what actually changes" */
    var NAKW = 360 / 27;
    var rows = sky.planets.map(function (p) {
      var L = sid(p.trop);
      return {
        en: p.en,
        sign: SA[Math.floor(L / 30)],
        nak: NAK[Math.floor(L / NAKW)],
        /* how much MORE ayanāṃśa before this graha drops into the previous
           division: raising the ayanāṃśa lowers the sidereal longitude, so
           the boundary it approaches is the one below it */
        toSign: L - Math.floor(L / 30) * 30,
        toNak: L - Math.floor(L / NAKW) * NAKW
      };
    });
    var all = modeKeys().map(function (k) { return ayanAt(k, S.year); })
                        .filter(function (v) { return v != null; });
    var spanLo = Math.min.apply(null, all), spanHi = Math.max.apply(null, all);
    var e = $("ay-chartedge");
    if (!e) return;
    var maxBar = 30;
    e.innerHTML = '<table class="aytab aychtab"><thead><tr><th>Graha</th>' +
      '<th>rāśi</th><th>nakṣatra</th><th>how much ayanāṃśa until it changes</th>' +
      '</tr></thead><tbody>' +
      rows.map(function (r) {
        var ws = (r.toSign / maxBar) * 100, wn = (r.toNak / maxBar) * 100;
        /* the published definitions span this much; a graha closer to its
           boundary than that span is one they genuinely disagree about */
        var contested = r.toSign < (spanHi - spanLo);
        return '<tr><td>' + esc(r.en) + '</td><td>' + esc(r.sign) + '</td><td>' +
          esc(r.nak) + '</td><td class="aybarcell">' +
          '<span class="aymini"><i class="s" style="width:' + ws.toFixed(1) + '%"></i>' +
          '<i class="n" style="width:' + wn.toFixed(1) + '%"></i></span>' +
          '<span class="ayminival">' + esc(dm(r.toSign)) + ' to the rāśi, ' +
          esc(dm(r.toNak)) + ' to the nakṣatra' +
          (contested ? ' <b class="contest">— inside the span of the seventeen</b>' : '') +
          '</span></td></tr>';
      }).join("") + '</tbody></table>';
  }

  function fillChartControls() {
    var j = $("ay-chartjump");
    if (j && !j.options.length) {
      j.innerHTML = '<option value="">follow the selection above</option>' +
        modeKeys().map(function (k) {
          return '<option value="' + esc(k) + '">' + esc((modes()[k] || {}).name || k) +
            "</option>";
        }).join("");
    }
    var r = $("ay-chartay");
    if (r && CHART_AY == null) {
      var v = ayanAt(S.ringMode, S.year);
      if (v != null) r.value = String(v);
    }
    var rd = $("ay-chartread");
    if (rd) {
      var cur = CHART_AY == null ? (ayanAt(S.ringMode, S.year) || 0) : CHART_AY;
      rd.textContent = dm(cur) + (CHART_AY == null ? "  (following the selection)" : "");
    }
  }

  function fillAnchorSelect() {
    var a = $("ay-anchor");
    if (!a || a.options.length) return;
    a.innerHTML = FAMILIES.map(function (x) {
      var f = famOf(x.star);
      return '<option value="' + esc(x.star) + '"' +
        (x.star === "Citrā" ? " selected" : "") + ">" + esc(x.star) +
        " — " + f.keys.length +
        (f.keys.length === 1 ? " definition" : " definitions") + "</option>";
    }).join("");
  }

  /* ---- 7. the card and the film ------------------------------------------ */
  function cardMeta() {
    var ay = ayanAt(S.ringMode, S.year);
    var M = modes()[S.ringMode] || {};
    if (S.cardKind === "spread") {
      var vals = modeKeys().map(function (k) { return ayanAt(k, S.year); })
                           .filter(function (v) { return v != null; });
      var span = Math.max.apply(null, vals) - Math.min.apply(null, vals);
      return { head: "Seventeen answers", big: dm(span),
               sub: "how far the definitions disagree, at " + yearLabel(S.year),
               foot: "The engine's own uncertainty is about one arcsecond." };
    }
    if (S.cardKind === "cancel") {
      return { head: "What it cannot change", big: "tithi",
               sub: "a tithi is the gap between Moon and Sun",
               foot: "Subtract the same ayanāṃśa from both and the gap is unchanged." };
    }
    return { head: "Ayanāṃśa", big: dm(ay),
             sub: M.name + " · " + yearLabel(S.year),
             foot: "The angle between the equinox and the stars." };
  }

  function drawCard() {
    var cv = $("ay-canvas");
    if (!cv || !window.NCard) return;
    var R = window.NCard.RATIOS[S.ratio] || window.NCard.RATIOS["4:5"];
    cv.width = R.w; cv.height = R.h;
    var c = cv.getContext("2d");
    var m = cardMeta();
    paintFrame(c, R.w, R.h, m, null);
    var svg = host.querySelector("svg");
    if (svg && window.SvgFilm) {
      darkly(function () { return window.SvgFilm.snapshot(svg); })
        .then(function (shot) { paintFrame(c, R.w, R.h, m, shot); })
        .catch(function () {});
    }
  }

  /* Photograph the drawing in its capture palette, then put it back. The
     page is cream and the card is near-black, so the page's own ink came out
     almost invisible on the first card; the styles are swapped for the one
     instant of the snapshot rather than a second drawing being kept. */
  function darkly(fn) {
    host.setAttribute("data-film", "dark");
    var p = fn();
    return p.then(function (v) { host.removeAttribute("data-film"); return v; },
                  function (e) { host.removeAttribute("data-film"); throw e; });
  }

  function paintFrame(c, W, H, m, shot) {
    var g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#131a33"); g.addColorStop(0.55, "#0a0e1d"); g.addColorStop(1, "#05070e");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.textAlign = "center";
    c.fillStyle = "#9fa8c6";
    c.font = Math.round(W * 0.030) + "px Georgia, serif";
    c.fillText(m.head, W / 2, Math.round(H * 0.095));
    c.fillStyle = "#f3e9cf";
    c.font = "600 " + Math.round(W * 0.085) + "px Georgia, serif";
    c.fillText(m.big, W / 2, Math.round(H * 0.175));
    c.fillStyle = "#e8c874";
    c.font = Math.round(W * 0.028) + "px Georgia, serif";
    c.fillText(m.sub, W / 2, Math.round(H * 0.225));
    if (shot) {
      var top = Math.round(H * 0.27), bot = Math.round(H * 0.80);
      var availW = W - Math.round(W * 0.06), availH = bot - top;
      var k = Math.min(availW / shot.w, availH / shot.h);
      c.drawImage(shot.img, (W - shot.w * k) / 2, top + (availH - shot.h * k) / 2,
                  shot.w * k, shot.h * k);
    }
    c.fillStyle = "#8d96b4";
    c.font = Math.round(W * 0.023) + "px Georgia, serif";
    wrap(c, m.foot, W / 2, Math.round(H * 0.855), W * 0.84, Math.round(W * 0.033));
    c.fillStyle = "#e8c874";
    c.font = "600 " + Math.round(W * 0.029) + "px Georgia, serif";
    c.fillText("@Nirayana.Soft", W / 2, Math.round(H * 0.945));
  }
  function wrap(c, text, x, y, max, lh) {
    var words = String(text || "").split(" "), line = "", n = 0;
    words.forEach(function (w) {
      var t = line ? line + " " + w : w;
      if (c.measureText(t).width > max && line) {
        c.fillText(line, x, y + n * lh); line = w; n++;
      } else line = t;
    });
    if (line) c.fillText(line, x, y + n * lh);
  }

  function film() {
    if (!window.SvgFilm) { msg("ay-msg", "The film layer is missing."); return; }
    var R = window.NCard.RATIOS[S.ratio] || window.NCard.RATIOS["9:16"];
    var y0 = -500, y1 = 3500, runMs = 9000;
    var keep = S.year;
    msg("ay-msg", "Rendering…");
    window.SvgFilm.record({
      width: R.w, height: R.h, runMs: runMs,
      svg: function () { return host.querySelector("svg"); },
      at: function (ms) {
        S.year = Math.round(y0 + (y1 - y0) * (ms / runMs));
        drawRings();
        host.setAttribute("data-film", "dark");   /* held for the whole render */
      },
      compose: function (c, W, H, shot) {
        var ay = ayanAt(S.ringMode, S.year);
        paintFrame(c, W, H, {
          head: "The gap between two zodiacs",
          big: (ay == null ? "" : dm(ay)),
          sub: yearLabel(S.year) + " · " + ((modes()[S.ringMode] || {}).name || ""),
          foot: "The stars stay. The seasons slip. The ayanāṃśa is the difference."
        }, shot);
      },
      onProgress: function (f) { msg("ay-msg", "Rendering… " + Math.round(f * 100) + "%"); }
    }).then(function (r) {
      host.removeAttribute("data-film");
      S.year = keep; syncYear(); redraw();
      window.SvgFilm.save(r.blob, "nirayana-ayanamsa." + r.ext);
      msg("ay-msg", r.frames + " frames · " + r.seconds.toFixed(1) + "s saved.");
    }).catch(function (e) {
      host.removeAttribute("data-film");
      S.year = keep; syncYear(); redraw();
      msg("ay-msg", (e && e.message) || "The film could not be rendered.");
    });
  }

  /* ---- wiring ------------------------------------------------------------ */
  function fillModeSelect() {
    var sel = $("ay-ringmode");
    if (!sel) return;
    sel.innerHTML = modeKeys().map(function (k) {
      return '<option value="' + esc(k) + '"' + (k === S.ringMode ? " selected" : "") +
        ">" + esc((modes()[k] || {}).name || k) + "</option>";
    }).join("");
  }
  function syncYear() {
    var r = $("ay-year");
    if (r) r.value = String(S.year);
  }
  function redraw() {
    drawRings();
    drawDerive();
    drawStarWheel();
    drawSpread();
    drawImpact();
    fillChartControls();
    drawChart();
    syncSand();
    drawCard();
  }

  function bind() {
    document.addEventListener("input", function (e) {
      var t = e.target;
      if (t.id === "ay-year") {
        S.year = +t.value;
        drawRings(); drawDerive(); drawSpread(); drawDrift(($("ay-anchor")||{}).value);
        fillChartControls(); drawChart(); syncSand(); drawCard();
      }
      else if (t.id === "ay-chartay") { CHART_AY = +t.value; fillChartControls(); drawChart(); }
      else if (/^ay-c[012]$/.test(t.id)) syncSand();
    });
    document.addEventListener("change", function (e) {
      var t = e.target;
      if (t.id === "ay-ringmode") { S.ringMode = t.value; CHART_AY = null; redraw(); }
      else if (t.id === "ay-anchor") { drawStarWheel(); }
      else if (t.id === "ay-chartjump") {
        CHART_AY = t.value ? ayanAt(t.value, S.year) : null;
        fillChartControls(); drawChart();
      }
      else if (t.id === "ay-ratio") { S.ratio = t.value; drawCard(); }
      else if (t.id === "ay-cardkind") { S.cardKind = t.value; drawCard(); }
      else if (t.id === "ay-when") {
        var v = Date.parse(t.value);
        if (!isNaN(v)) { S.when = v - (S.place ? S.place.tz : 0) * 3600000; drawImpact(); }
      }
    });
    document.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-ay]") : null;
      if (!b) return;
      var k = b.getAttribute("data-ay");
      if (k === "today") { S.year = new Date().getFullYear(); syncYear(); redraw(); }
      else if (k === "zero") {
        /* the year this definition's gap was zero — found by bisection rather
           than from a constant, so it is right for whichever is selected */
        var lo = -5000, hi = 5000;
        for (var i = 0; i < 60; i++) {
          var mid = (lo + hi) / 2;
          if ((ayanAt(S.ringMode, mid) || 0) < 0) lo = mid; else hi = mid;
        }
        S.year = Math.round((lo + hi) / 2); syncYear(); redraw();
      }
      else if (k === "now") {
        S.when = Date.now(); syncWhen(); drawImpact();
      }
      else if (k === "pin") applyPin();
      else if (k === "apply") applyCustom();
      else if (k === "drop") dropCustom();
      else if (k === "png") {
        var cv = $("ay-canvas");
        if (!cv) return;
        cv.toBlob(function (bl) {
          if (bl && window.SvgFilm) window.SvgFilm.save(bl, "nirayana-ayanamsa.png");
        }, "image/png");
      }
      else if (k === "film") film();
    });
  }
  function syncWhen() {
    var e = $("ay-when");
    if (!e || S.when == null) return;
    var d = new Date(S.when + (S.place ? S.place.tz : 0) * 3600000);
    e.value = d.getUTCFullYear() + "-" +
      String(d.getUTCMonth() + 1).padStart(2, "0") + "-" +
      String(d.getUTCDate()).padStart(2, "0") + "T" +
      String(d.getUTCHours()).padStart(2, "0") + ":" +
      String(d.getUTCMinutes()).padStart(2, "0");
  }

  need([
    { src: "engine.js", have: function () { return !!window.__ayanFor; } },
    { src: "places.js", have: function () { return !!window.NPlaces; } },
    { src: "panchanga.js", have: function () { return !!(window.NP && window.NP.day); } },
    { src: "cards.js", have: function () { return !!window.NCard; } },
    { src: "bodies.js", have: function () { return !!window.NSprite; } }
  ], function () {
    S.place = (window.NP && window.NP.savedPlace && window.NP.savedPlace()) ||
              { n: "Ujjain", lat: 23.1765, lon: 75.7885, tz: 5.5 };
    S.when = Date.now();
    var ph = $("ay-place");
    if (ph && window.NPlaces.picker) {
      window.NPlaces.picker({
        host: ph, value: S.place,
        quick: [S.place].concat((window.NP && window.NP.PLACES) || []),
        label: "Place",
        refMs: function () { return S.when || Date.now(); },
        onPick: function (p) { S.place = p; syncWhen(); drawImpact(); }
      });
    }
    var r = $("ay-ratio");
    if (r && window.NCard) {
      var RA = window.NCard.RATIOS;
      r.innerHTML = Object.keys(RA).map(function (k) {
        return '<option value="' + esc(k) + '"' + (k === S.ratio ? " selected" : "") +
          ">" + esc(RA[k].label || k) + "</option>";
      }).join("");
    }
    fillModeSelect();
    fillAnchorSelect();
    fillChartControls();
    syncYear();
    syncWhen();
    sandbox();
    drawCone();
    bind();
    redraw();
  });
})();
