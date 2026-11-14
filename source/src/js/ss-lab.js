/* ===== The Sūrya Siddhānta page, part two: the sandbox and the geometry =====

   ss-page.js tabulates what the engine is doing. This adds the four things a
   table cannot carry:

     the jyā table drawn against a true sine, with its residual magnified;
     the manda and śīghra constructions drawn as the geometry they are;
     a sandbox over the engine's own correctable constants, scored live;
     the three skies — text, fitted tier, modern — on one ring.

   SEPARATE FILE ON PURPOSE. ss-page.js is working, verified code that owns
   every existing panel on this page. Nothing here touches it: this module
   reads window.SSEngine and window.__ss (the handle ss-page.js already
   publishes) and writes only into hosts that did not exist before.

   THE ONE THING TO GET RIGHT IS THE FRAME. The fitted tier was fitted in the
   site's own Lahiri sidereal frame, not in the text's libration ayanāṃśa — the
   provenance in the data file says so in as many words — so a score taken in
   any other frame would be measuring the frame and not the constants. Every
   comparison here subtracts the same Lahiri polynomial the fit used, carried in
   the data file beside the constants for exactly this reason, from a modern
   TROPICAL longitude. That is the identical recipe
   siddhanta-measured-verify.mjs uses, so a number printed here and a number
   printed by the harness mean the same thing. */
(function () {
  "use strict";

  var SA7 = ["Sūrya", "Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani"];
  var EN = { "Sūrya": "Sun", "Candra": "Moon", "Maṅgala": "Mars",
             "Budha": "Mercury", "Guru": "Jupiter", "Śukra": "Venus",
             "Śani": "Saturn" };
  var RS = ["Meṣa", "Vṛṣabha", "Mithuna", "Karka", "Siṃha", "Kanyā", "Tulā",
            "Vṛścika", "Dhanus", "Makara", "Kumbha", "Mīna"];
  /* the five that carry a śīghra epicycle; the Sun and Moon take manda alone */
  var STAR = { "Maṅgala": 1, "Budha": 1, "Guru": 1, "Śukra": 1, "Śani": 1 };

  function $(id) { return document.getElementById(id); }
  function norm(x) { return ((x % 360) + 360) % 360; }
  function sdiff(a, b) { var d = norm(a - b); return d > 180 ? d - 360 : d; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function dm(L) {
    var x = norm(L), s = Math.floor(x / 30), r = x - s * 30;
    var d = Math.floor(r), m = Math.round((r - d) * 60);
    if (m === 60) { m = 0; d++; }
    return d + "°" + (m < 10 ? "0" : "") + m + "′ " + RS[s];
  }
  function mins(x) {       /* a signed quantity in degrees, shown in arcminutes */
    return (x >= 0 ? "+" : "−") + (Math.abs(x) * 60).toFixed(2) + "′";
  }
  var DEG = Math.PI / 180;

  var S = null, FIT = null, LAH = null;
  var WHEN = Date.now();
  var ANOM = 90, SPIN = null, EBODY = "Śani", SBODY = "Sūrya";
  var MODE = "bare";                 /* bare | fitted | custom */
  var CUSTOM = null;                 /* params in force when MODE === "custom" */

  /* ---- the frame, and the score ------------------------------------------- */
  function lahiriAt(jd) {
    var T = (jd - 2451545.0) / 36525.0;
    return LAH[2] + LAH[1] * T + LAH[0] * T * T;
  }
  /* The modern sky in the frame the fit used. __kEclip gives the TROPICAL
     longitude as well as the sidereal one; the tropical is what this wants,
     because the site's own ayanāṃśa setting must not enter a score of the
     siddhānta's constants. */
  function refLon(sa, ms) {
    try {
      var e = window.__kEclipModern(EN[sa], ms);
      if (!e) return null;
      return norm(e.trop - lahiriAt(ms / 86400000 + 2440587.5));
    } catch (err) { return null; }
  }

  /* The sample. Fixed before the reader touches anything, spread across the
     band the modern engine is certified over, and deterministic — a score that
     moved when you re-rolled the sample would be worthless for comparing one
     set of constants with another. */
  var SAMPLE = [], REF = {};
  function buildSample() {
    SAMPLE = [];
    /* SIXTY-FOUR, AND THE PHASES IRRATIONALLY SPACED.
       The first version took twenty-four samples at years evenly spaced across
       the band, with the day-of-year stepped by a small integer. Six of the
       seven grahas scored within a tenth of the project's own published
       figure; Maṅgala came out at 33′ against a published 58′, which looked
       like an improvement and was aliasing. Even year spacing over 1800–2200
       is a step of 17.4 years, and Maṅgala's synodic period is 2.14 — eight
       steps to the cycle, so the sample kept landing at the same phase of the
       term the fit cannot model, and missed its peaks. Spacing the phase by
       the golden ratio is incommensurate with every period in the problem, and
       sixty-four samples then reproduce all seven published figures. */
    var N = 64, PHI = 0.6180339887498949;
    for (var i = 0; i < N; i++) {
      var y = 1800 + (2200 - 1800) * i / (N - 1);
      var days = ((i * PHI) % 1) * 365.2425;
      SAMPLE.push(Date.UTC(Math.floor(y), 0, 1, 6, 0, 0) +
                  Math.round((y - Math.floor(y)) * 365.2425 * 86400000) +
                  Math.round(days * 86400000));
    }
    REF = {};
    SA7.forEach(function (sa) {
      REF[sa] = SAMPLE.map(function (ms) { return refLon(sa, ms); });
    });
    var n = $("ss-nsamp");
    if (n) n.textContent = SAMPLE.length;
  }
  /* rms of (siddhānta − modern) in arcminutes, for one graha, as the engine
     currently stands */
  function score(sa) {
    var s = 0, k = 0;
    for (var i = 0; i < SAMPLE.length; i++) {
      if (REF[sa][i] == null) continue;
      var q = S.trueLongitude(sa, S.ahargana(SAMPLE[i]));
      if (!q) continue;
      var d = sdiff(q.lon, REF[sa][i]) * 60;
      s += d * d; k++;
    }
    return k ? Math.sqrt(s / k) : null;
  }

  /* ---- applying a parameter set ------------------------------------------- */
  /* Driven through the engine's own documented door — setMeasured() then
     measured() — rather than by reaching into its constants. The engine keeps
     an untouched copy of every original value and bare() restores it exactly;
     that guarantee is asserted elsewhere and this module must not be the thing
     that breaks it. */
  function neutral() {
    var P = {};
    SA7.forEach(function (sa) {
      P["bija." + sa] = 0; P["epoch." + sa] = 0; P["mandocca." + sa] = 0;
      P["mandaOdd." + sa] = 1; P["mandaEven." + sa] = 1;
      if (STAR[sa]) { P["sighraOdd." + sa] = 1; P["sighraEven." + sa] = 1; }
    });
    P["bija.candraUcca"] = 0; P["epoch.candraUcca"] = 0;
    return P;
  }
  /* THE BORROWED-QUANTITY DISCLOSURE, rendered from the engine.
   *
   * The Pañcasiddhāntikā tier carries four quantities that are the Later
   * Sūrya Siddhānta's, because the edition in the project is page images and
   * the OCR never reached the chapter that would give them. The page used to
   * name those four in hardcoded prose, which is a claim about the engine
   * written somewhere the engine cannot correct — close one of them and the
   * prose would go on asserting four. Rendered from
   * panchaSauraInfo().borrowed instead, so the disclosure is whatever the
   * tier actually does. */
  function psBorrowList() {
    var host = document.getElementById("ss-psborrow");
    if (!host || !S.panchaSauraInfo) return;
    var b = (S.panchaSauraInfo().borrowed || []);
    if (!b.length) {
      host.innerHTML = "<li>None — every constant in this tier is the text's own.</li>";
      return;
    }
    host.innerHTML = b.map(function (x) {
      return '<li><b>' + esc(x.what) + '</b> <code>' + esc(x.path) + '</code><br>' +
             esc(x.why) + '</li>';
    }).join("");
  }

  function apply() {
    if (MODE === "bare") { S.bare(); S.setMeasured(FIT); return; }
    /* The Pañcasiddhāntikā tier is a CONSTANTS tier, not a fitted one: it
       carries an older recension's own numbers and takes no bīja, so it goes
       through bare() first and never touches setMeasured(). Four of its
       quantities USED to be the Later SS's (closed from Ch. IX on 14 Nov 2026), and
       the page prints that list from panchaSauraInfo().borrowed — a tier that
       is partly someone else's numbers under Varāhamihira's name would be a
       worse object than no tier at all. */
    if (MODE === "ps") { S.bare(); S.panchaSaura(); S.setMeasured(FIT); return; }
    /* (psBorrowList() below renders the disclosure from the engine's own
       list, so the page cannot claim a different set of borrows than the
       tier actually has.) */
    /* bare() FIRST, always. Before the Pañcasiddhāntikā tier existed, every
       mode here was a set of offsets over one fixed set of constants, so
       nothing had to be cleared. Now a mode can REPLACE the constants, and
       dragging a slider from that tier would have layered a bīja on top of
       Varāhamihira's revolutions and called the result "your own constants".
       One line, and the modes cannot compound. */
    S.bare();
    var P = MODE === "fitted" ? FIT.params : CUSTOM;
    S.setMeasured({ params: P });
    S.measured();
    S.setMeasured(FIT);     /* leave the real fitted doc in place for next time */
  }
  function keysFor(sa) {
    /* the parameters the optimiser used FOR THIS BODY, read from the data file
       rather than listed here, so the sandbox offers exactly the knobs the
       fitted tier was allowed and no others */
    var r = FIT.residuals[sa];
    return r && r.params ? Object.keys(r.params) : [];
  }
  var RANGE = {
    bija: [-600, 600, 0.5, "revolutions added per Mahāyuga"],
    epoch: [-180, 180, 0.05, "degrees added at the Kali epoch"],
    mandocca: [-180, 180, 0.1, "degrees added to the apsis"],
    mandaOdd: [0.4, 1.6, 0.002, "× the stated manda paridhi, odd quadrants"],
    mandaEven: [0.4, 1.6, 0.002, "× the stated manda paridhi, even quadrants"],
    sighraOdd: [0.4, 1.6, 0.002, "× the stated śīghra paridhi, odd quadrants"],
    sighraEven: [0.4, 1.6, 0.002, "× the stated śīghra paridhi, even quadrants"]
  };
  function kindOf(k) { return k.split(".")[0]; }
  function neutralFor(k) {
    var kind = kindOf(k);
    return (kind === "mandaOdd" || kind === "mandaEven" ||
            kind === "sighraOdd" || kind === "sighraEven") ? 1 : 0;
  }
  function labelFor(k) {
    var p = k.split("."), kind = p[0], who = p[1];
    var what = { bija: "bīja on the revolutions", epoch: "longitude at epoch",
                 mandocca: "mandocca", mandaOdd: "manda paridhi, odd",
                 mandaEven: "manda paridhi, even",
                 sighraOdd: "śīghra paridhi, odd",
                 sighraEven: "śīghra paridhi, even" }[kind] || kind;
    return what + (who === "candraUcca" ? " (the Moon's apogee)" : "");
  }

  /* ---- the sandbox -------------------------------------------------------- */
  function sliders() {
    var host = $("ss-sliders");
    if (!host) return;
    var ks = keysFor(SBODY);
    /* "ps" takes neutral() with "bare", not CUSTOM. The sliders carry
       OFFSETS — a bīja on revolutions, degrees on an apsis, a scale on a
       paridhi — and the Pañcasiddhāntikā tier applies none of them: it
       replaces the constants outright. Falling through to CUSTOM here left it
       null and threw on the first slider read. */
    var cur = (MODE === "bare" || MODE === "ps") ? neutral()
            : (MODE === "fitted" ? FIT.params : CUSTOM);
    host.innerHTML = ks.map(function (k) {
      var R = RANGE[kindOf(k)] || [-1, 1, 0.01, ""];
      var v = cur[k] != null ? cur[k] : neutralFor(k);
      return '<label class="sslab"><span class="sslabk">' + esc(labelFor(k)) +
        '</span><input type="range" class="sslide" data-sskey="' + esc(k) +
        '" min="' + R[0] + '" max="' + R[1] + '" step="' + R[2] +
        '" value="' + v + '"><output class="sslabv" data-ssout="' + esc(k) +
        '">' + fmtVal(k, v) + '</output><span class="sslabu">' + esc(R[3]) +
        "</span></label>";
    }).join("") || '<p class="ssnote">This graha has no fitted parameters.</p>';
  }
  function fmtVal(k, v) {
    var kind = kindOf(k);
    if (kind === "bija") return (v >= 0 ? "+" : "") + (+v).toFixed(2);
    if (kind === "epoch" || kind === "mandocca")
      return (v >= 0 ? "+" : "") + (+v).toFixed(3) + "°";
    return (+v).toFixed(3) + "×";
  }
  function scoreTable() {
    var host = $("ss-score");
    if (!host) return;
    var rows = SA7.map(function (sa) {
      var now = score(sa), r = FIT.residuals[sa];
      return { sa: sa, now: now,
               bare: r ? r.bare.rms : null,
               fit: r ? r.holdout.rms : null };
    });
    /* the bar is scaled to the worst BARE figure, so the scale does not move
       under the reader as they improve one graha */
    var top = Math.max.apply(null, rows.map(function (r) {
      return Math.max(r.bare || 0, r.now || 0); }));
    host.innerHTML = '<div class="aytabwrap"><table class="aytab ssscore"><thead><tr>' +
      '<th>Graha</th><th>as it stands now</th><th></th>' +
      '<th>the text as written</th><th>the fitted tier, out of sample</th>' +
      '</tr></thead><tbody>' + rows.map(function (r) {
        var w = r.now == null ? 0 : Math.min(100, r.now / top * 100);
        var good = r.bare != null && r.now != null && r.now < r.bare;
        return "<tr" + (r.sa === SBODY ? ' class="on"' : "") + "><td>" + esc(r.sa) +
          '</td><td class="num"><b>' + (r.now == null ? "—" : r.now.toFixed(2) + "′") +
          '</b></td><td class="ssbarcell"><span class="ssbar' +
          (good ? " good" : "") + '"><i style="width:' + w.toFixed(1) +
          '%"></i></span></td><td class="num">' +
          (r.bare == null ? "—" : r.bare.toFixed(1) + "′") +
          '</td><td class="num">' +
          (r.fit == null ? "—" : r.fit.toFixed(2) + "′") + "</td></tr>";
      }).join("") + "</tbody></table></div>";

    var note = $("ss-scorenote");
    if (note) {
      var tot = rows.reduce(function (a, r) { return a + (r.now || 0); }, 0);
      var bareTot = rows.reduce(function (a, r) { return a + (r.bare || 0); }, 0);
      note.innerHTML = "Showing <b>" +
        (MODE === "bare" ? "the text as written"
          : MODE === "fitted" ? "the fitted tier — the text's method carrying " +
            "measured numbers, not the text's answer"
          : MODE === "ps" ? "Varāhamihira's Saura — the same equations carrying " +
            "an older recension's own constants, four of which are the Later " +
            "Sūrya Siddhānta's because the text could not be read for them"
          : "your own constants — the text's method carrying your numbers") +
        "</b>. Summed across the seven: <b>" + tot.toFixed(1) +
        "′</b> against the bare text's " + bareTot.toFixed(1) +
        "′. The last column is the project's own published figure, measured on " +
        "instants its optimiser never saw; this page's own score, in the second " +
        "column, is taken on " + SAMPLE.length + " instants that are fixed but " +
        "not held out, so it is the easier of the two tests.";
    }
  }

  /* A small coordinate descent, so a reader can see what the fit was doing
     rather than only its result. Deliberately crude and deliberately bounded:
     it is a demonstration of the method, not the optimiser that produced the
     committed constants — that one is source/test/fit-siddhanta.mjs, runs for
     1500 iterations and fits against ERFA rather than against this page. */
  function autoFit(sa) {
    var ks = keysFor(sa);
    if (!ks.length) return;
    if (MODE !== "custom") {
      CUSTOM = {};
      var base = MODE === "fitted" ? FIT.params : neutral();
      for (var k in base) CUSTOM[k] = base[k];
      MODE = "custom";
    }
    var best = (apply(), score(sa));
    for (var pass = 0; pass < 14; pass++) {
      var moved = false;
      for (var i = 0; i < ks.length; i++) {
        var key = ks[i], R = RANGE[kindOf(key)] || [-1, 1, 0.01];
        var stepBase = (R[1] - R[0]) / 40 / (1 + pass);
        for (var sgn = -1; sgn <= 1; sgn += 2) {
          var was = CUSTOM[key] != null ? CUSTOM[key] : neutralFor(key);
          var tryV = Math.max(R[0], Math.min(R[1], was + sgn * stepBase));
          CUSTOM[key] = tryV;
          apply();
          var got = score(sa);
          if (got != null && got < best - 1e-6) { best = got; moved = true; }
          else CUSTOM[key] = was;
        }
      }
      if (!moved) break;
    }
    apply();
  }

  /* ---- the jyā table, drawn ----------------------------------------------- */
  function jyaPanel() {
    var host = $("ss-jya");
    if (!host) return;
    var W = 760, H = 300, L = 56, R = 14, T = 16, B = 86;
    var mid = T + (H - T - B) * 0;
    var sx = function (a) { return L + (W - L - R) * a / 90; };
    var sy = function (v) { return T + (H - T - B) * (1 - v / S.RAD); };
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="sslsvg" role="img" ' +
      'aria-label="The text\'s twenty-four tabulated sines against a true sine, ' +
      'with the difference magnified fifty times"><title>The jyā table</title>';
    /* the frame */
    [0, 0.25, 0.5, 0.75, 1].forEach(function (f) {
      o += '<line x1="' + L + '" y1="' + sy(f * S.RAD).toFixed(1) + '" x2="' +
           (W - R) + '" y2="' + sy(f * S.RAD).toFixed(1) + '" class="ssl-grid"/>' +
           '<text x="' + (L - 7) + '" y="' + (sy(f * S.RAD) + 4).toFixed(1) +
           '" class="ssl-ax">' + Math.round(f * S.RAD) + "</text>";
    });
    /* the true sine on the radius-3438 scale */
    var p = "";
    for (var a = 0; a <= 90; a += 0.5) {
      p += (a ? "L" : "M") + sx(a).toFixed(1) + " " +
           sy(S.RAD * Math.sin(a * DEG)).toFixed(1) + " ";
    }
    o += '<path d="' + p + '" class="ssl-true"/>';
    /* the twenty-four entries, as the text gives them */
    var worst = 0, worstAt = 0, lin = 0, linAt = 0;
    /* JYA holds twenty-five values, JYA[0] = 0 and JYA[24] = 3438, so the
       entry for an arc of i × 3°45′ is JYA[i] and not JYA[i−1]. Indexing it
       the other way put every point one interval out and reported the worst
       entry as 6.5% of the radius instead of 0.02%, which is how the mistake
       surfaced: the figure disagreed with the project's own measurement. */
    for (var i = 1; i <= 24; i++) {
      var arc = i * 3.75, v = S.JYA[i];
      var err = v - S.RAD * Math.sin(arc * DEG);
      if (Math.abs(err) > Math.abs(worst)) { worst = err; worstAt = arc; }
      o += '<circle cx="' + sx(arc).toFixed(1) + '" cy="' + sy(v).toFixed(1) +
           '" r="3.4" class="ssl-entry"><title>' + arc.toFixed(2) + "° → " + v +
           " (true " + (S.RAD * Math.sin(arc * DEG)).toFixed(2) + ")</title></circle>";
    }
    /* the residual of the WHOLE interpolated function, magnified */
    var MAG = 50, base = H - B + 46, half = 30;
    o += '<line x1="' + L + '" y1="' + base + '" x2="' + (W - R) +
         '" y2="' + base + '" class="ssl-grid"/>';
    var q = "";
    for (var b = 0; b <= 90; b += 0.25) {
      var e2 = S.jya(b) - S.RAD * Math.sin(b * DEG);
      if (Math.abs(e2) > Math.abs(lin)) { lin = e2; linAt = b; }
      q += (b ? "L" : "M") + sx(b).toFixed(1) + " " +
           (base - Math.max(-half, Math.min(half, e2 * MAG))).toFixed(1) + " ";
    }
    o += '<path d="' + q + '" class="ssl-res"/>';
    o += '<text x="' + L + '" y="' + (base - 36) + '" class="ssl-cap">' +
         "the interpolated table minus a true sine, ×" + MAG + "</text>";
    o += '<text x="' + L + '" y="' + (H - 6) + '" class="ssl-cap">' +
         "arc, 0° to 90° — one tabulated entry every 3°45′</text>";
    o += "</svg>";
    host.innerHTML = o;

    /* and the number that matters: what the table costs as an angle */
    var note = $("ss-jyanote");
    if (note) {
      /* recovering an arc from a sine is the other direction through the same
         table, and it is the worse of the two — so it is measured, not assumed */
      var arcErr = 0, arcAt = 0;
      for (var c = 0.5; c < 90; c += 0.25) {
        var back = S.arcJyaTable(S.RAD * Math.sin(c * DEG));
        if (Math.abs(back - c) > Math.abs(arcErr)) { arcErr = back - c; arcAt = c; }
      }
      note.innerHTML = "Worst tabulated entry: <b>" + Math.abs(worst).toFixed(2) +
        "</b> of 3438, at " + worstAt.toFixed(2) + "° — about " +
        (Math.abs(worst) / S.RAD * 100).toFixed(3) + "% of the radius. Worst " +
        "<b>interpolated</b> value: <b>" + Math.abs(lin).toFixed(2) + "</b> at " +
        linAt.toFixed(2) + "°, which is where the straight line between two " +
        "entries is furthest from the curve. Read backwards, recovering an arc " +
        "from a sine, the table is out by at most <b>" +
        Math.abs(arcErr).toFixed(3) + "°</b> near " + arcAt.toFixed(1) +
        "°. Every equation on this page is an arc recovered that way, which is " +
        "why that last figure is the one that reaches a longitude.";
    }
  }

  /* ---- the epicycle construction ------------------------------------------ */
  function epiPanel() {
    var host = $("ss-epi");
    if (!host) return;
    var E = S.EPI[EBODY] || {};
    var kinds = [];
    if (E.manda) kinds.push("manda");
    if (E.sighra) kinds.push("sighra");
    var W = 760, H = 380, o = '<svg viewBox="0 0 ' + W + ' ' + H +
      '" class="sslsvg" role="img" aria-label="The manda and śīghra epicycle ' +
      'constructions at the chosen anomaly"><title>The two constructions</title>';
    var pan = W / kinds.length;
    kinds.forEach(function (kind, idx) {
      o += panel(kind, idx * pan, pan, H, E);
    });
    o += "</svg>";
    host.innerHTML = o;
    epiNote(E);

    function panel(kind, x0, w, h, E) {
      var pair = kind === "manda" ? E.manda : E.sighra;
      var cx = x0 + w / 2, cy = h / 2 - 6, Rd = Math.min(w, h) * 0.30;
      var kap = ANOM * DEG;
      var c = pair[0] + (pair[1] - pair[0]) * Math.abs(S.jya(ANOM)) / S.RAD;
      var rr = Rd * c / 360;
      var r0 = Rd * pair[0] / 360, r1 = Rd * pair[1] / 360;
      var g = "";
      /* the deferent, and the direction the anomaly is counted from */
      g += '<circle cx="' + cx + '" cy="' + cy + '" r="' + Rd.toFixed(1) +
           '" class="ssl-def"/>';
      var M, G, lab;
      if (kind === "manda") {
        /* the apsis to the right; the mean graha at the anomaly from it; the
           graha displaced toward the perigee by the epicycle radius */
        M = { x: cx + Rd * Math.cos(kap), y: cy - Rd * Math.sin(kap) };
        G = { x: M.x - rr, y: M.y };
        lab = "mandocca";
      } else {
        /* the mean graha to the right; the śīghrocca at the anomaly from it */
        M = { x: cx + Rd, y: cy };
        G = { x: M.x + rr * Math.cos(kap), y: M.y - rr * Math.sin(kap) };
        lab = "mean graha";
      }
      g += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + Rd + 22) +
           '" y2="' + cy + '" class="ssl-apsis"/>' +
           '<text x="' + (cx + Rd + 26) + '" y="' + (cy + 4) +
           '" class="ssl-tag">' + esc(lab) + "</text>";
      /* the two stated circumferences, dashed, and the one in use, solid */
      g += '<circle cx="' + M.x.toFixed(1) + '" cy="' + M.y.toFixed(1) +
           '" r="' + r0.toFixed(1) + '" class="ssl-epid"/>' +
           '<circle cx="' + M.x.toFixed(1) + '" cy="' + M.y.toFixed(1) +
           '" r="' + r1.toFixed(1) + '" class="ssl-epid"/>' +
           '<circle cx="' + M.x.toFixed(1) + '" cy="' + M.y.toFixed(1) +
           '" r="' + rr.toFixed(1) + '" class="ssl-epi"/>';
      /* O→M, O→G, M→G, and the bahu dropped from G onto OM */
      g += '<line x1="' + cx + '" y1="' + cy + '" x2="' + M.x.toFixed(1) +
           '" y2="' + M.y.toFixed(1) + '" class="ssl-arm"/>';
      g += '<line x1="' + M.x.toFixed(1) + '" y1="' + M.y.toFixed(1) + '" x2="' +
           G.x.toFixed(1) + '" y2="' + G.y.toFixed(1) + '" class="ssl-arm2"/>';
      g += '<line x1="' + cx + '" y1="' + cy + '" x2="' + G.x.toFixed(1) +
           '" y2="' + G.y.toFixed(1) + '" class="ssl-karna"/>';
      g += '<circle cx="' + cx + '" cy="' + cy + '" r="3.5" class="ssl-o"/>' +
           '<circle cx="' + M.x.toFixed(1) + '" cy="' + M.y.toFixed(1) +
           '" r="3.5" class="ssl-m"/>' +
           '<circle cx="' + G.x.toFixed(1) + '" cy="' + G.y.toFixed(1) +
           '" r="5" class="ssl-g"/>';
      /* the equation as a wedge at the centre, between OM and OG */
      var a1 = Math.atan2(cy - M.y, M.x - cx), a2 = Math.atan2(cy - G.y, G.x - cx);
      var wr = Rd * 0.42;
      g += '<path d="M' + (cx + wr * Math.cos(a1)).toFixed(1) + " " +
           (cy - wr * Math.sin(a1)).toFixed(1) + "A" + wr.toFixed(1) + " " +
           wr.toFixed(1) + " 0 0 " + (a2 > a1 ? 0 : 1) + " " +
           (cx + wr * Math.cos(a2)).toFixed(1) + " " +
           (cy - wr * Math.sin(a2)).toFixed(1) + '" class="ssl-eqarc"/>';
      var eq = kind === "manda" ? S.mandaEquation(EBODY, ANOM)
                                : S.sighraEquation(EBODY, ANOM);
      g += '<text x="' + cx + '" y="' + (cy - Rd - 18) + '" class="ssl-head">' +
           (kind === "manda" ? "manda — the apsidal correction"
                             : "śīghra — the solar correction") + "</text>";
      g += '<text x="' + cx + '" y="' + (h - 40) + '" class="ssl-cap mid">' +
           "paridhi in use " + c.toFixed(2) + "° of " + pair[0] + "°/" + pair[1] +
           "°  ·  equation " + (eq >= 0 ? "" : "−") +
           Math.abs(eq).toFixed(3) + "°</text>";
      g += '<text x="' + cx + '" y="' + (h - 24) + '" class="ssl-cap mid">' +
           (kind === "manda"
             ? "the text divides the bahu by the RADIUS here"
             : "and by the karṇa here — the long line from the centre") +
           "</text>";
      return g;
    }
  }

  function epiNote(E) {
    var note = $("ss-epinote");
    if (!note) return;
    var out = [];
    if (E.manda) {
      /* The observation worth printing: the manda equation takes the hypotenuse
         to BE the radius, where the geometry drawn beside it has a hypotenuse
         that is not. The difference is computed, not asserted. */
      var pair = E.manda;
      var c = pair[0] + (pair[1] - pair[0]) * Math.abs(S.jya(ANOM)) / S.RAD;
      var r = c / 360 * S.RAD;
      var bahu = r * Math.sin(ANOM * DEG), koti = r * Math.cos(ANOM * DEG);
      var karna = Math.sqrt((S.RAD - koti) * (S.RAD - koti) + bahu * bahu);
      var text = S.mandaEquation(EBODY, ANOM);
      var exact = Math.asin(Math.max(-1, Math.min(1, bahu / karna))) / DEG;
      out.push("At this anomaly the manda epicycle puts the graha <b>" +
        Math.abs(bahu).toFixed(1) + "</b> of 3438 off the line from the centre, " +
        "on a hypotenuse of <b>" + karna.toFixed(1) + "</b>. The text divides " +
        "that offset by 3438 and gets <b>" + text.toFixed(4) + "°</b>; dividing " +
        "by the hypotenuse instead gives <b>" + exact.toFixed(4) + "°</b>, a " +
        "difference of <b>" + mins(text - exact) + "</b>. The śīghra step " +
        "<i>does</i> divide by its hypotenuse, so this is a choice the method " +
        "makes in one place and not the other, and not an oversight you can " +
        "patch without changing what the text says.");
    }
    if (E.sighra) {
      var q = S.sighraFull(EBODY, ANOM);
      out.push("The śīghra karṇa here is <b>" + q.karna.toFixed(1) +
        "</b> against a radius of 3438 — " +
        (q.karna > S.RAD ? "longer" : "shorter") + ", which is the graha being " +
        (q.karna > S.RAD ? "further from" : "nearer") + " the centre than the " +
        "deferent alone would place it. That same hypotenuse is what the engine " +
        "reuses for the apparent diameters and the latitude, which is why it is " +
        "returned rather than discarded.");
    }
    var read = $("ss-anomread");
    if (read) read.textContent = ANOM.toFixed(1) + "° anomaly";
    note.innerHTML = out.join(" ");
  }

  /* the two equations across the whole anomaly */
  function curvePanel() {
    var host = $("ss-curve");
    if (!host) return;
    var E = S.EPI[EBODY] || {};
    var W = 760, H = 230, L = 52, R = 120, T = 18, B = 34;
    var series = [];
    if (E.manda) series.push({ cls: "manda", name: "manda",
      f: function (a) { return S.mandaEquation(EBODY, a); } });
    if (E.sighra) series.push({ cls: "sighra", name: "śīghra",
      f: function (a) { return S.sighraEquation(EBODY, a); } });
    if (!series.length) { host.innerHTML = ""; return; }
    var all = [];
    series.forEach(function (s2) {
      s2.pts = [];
      for (var a = 0; a <= 360; a += 1) { var v = s2.f(a); s2.pts.push([a, v]); all.push(v); }
    });
    var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
    var pad = Math.max(0.2, (hi - lo) * 0.12); lo -= pad; hi += pad;
    var sx = function (a) { return L + (W - L - R) * a / 360; };
    var sy = function (v) { return T + (H - T - B) * (1 - (v - lo) / (hi - lo)); };
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="sslsvg" role="img" ' +
      'aria-label="The manda and śīghra equations across the whole anomaly">' +
      "<title>The equations as curves</title>";
    o += '<line x1="' + L + '" y1="' + sy(0).toFixed(1) + '" x2="' + (W - R) +
         '" y2="' + sy(0).toFixed(1) + '" class="ssl-grid"/>';
    [lo + pad, 0, hi - pad].forEach(function (v) {
      o += '<text x="' + (L - 7) + '" y="' + (sy(v) + 4).toFixed(1) +
           '" class="ssl-ax">' + v.toFixed(1) + "°</text>";
    });
    /* the quadrant ends — where the interpolated paridhi turns round */
    [90, 180, 270].forEach(function (a) {
      o += '<line x1="' + sx(a).toFixed(1) + '" y1="' + T + '" x2="' +
           sx(a).toFixed(1) + '" y2="' + (H - B) + '" class="ssl-quad"/>';
    });
    [0, 90, 180, 270, 360].forEach(function (a) {
      o += '<text x="' + sx(a).toFixed(1) + '" y="' + (H - B + 16) +
           '" class="ssl-cap mid">' + a + "°</text>";
    });
    series.forEach(function (s2, i) {
      o += '<path d="' + s2.pts.map(function (p, j) {
        return (j ? "L" : "M") + sx(p[0]).toFixed(1) + " " + sy(p[1]).toFixed(1);
      }).join(" ") + '" class="ssl-cv ' + s2.cls + '"/>';
      o += '<text x="' + (W - R + 10) + '" y="' + (T + 14 + i * 18) +
           '" class="ssl-leg ' + s2.cls + '">' + esc(s2.name) + " — peak " +
           Math.max.apply(null, s2.pts.map(function (p) { return Math.abs(p[1]); }))
             .toFixed(2) + "°</text>";
    });
    o += '<line x1="' + sx(ANOM).toFixed(1) + '" y1="' + T + '" x2="' +
         sx(ANOM).toFixed(1) + '" y2="' + (H - B) + '" class="ssl-ptr"/>';
    o += "</svg>";
    host.innerHTML = o;
  }

  /* ---- the three skies on one ring ---------------------------------------- */
  function ringPanel() {
    var host = $("ss-ring");
    if (!host) return;
    /* each tier read with the engine actually in that state, then put back —
       the whole point is that these are three computations and not one */
    var saved = MODE, savedC = CUSTOM;
    var tiers = {};
    MODE = "bare"; apply();
    tiers.bare = SA7.map(function (sa) {
      var q = S.trueLongitude(sa, S.ahargana(WHEN)); return q ? q.lon : null; });
    MODE = "fitted"; apply();
    tiers.fit = SA7.map(function (sa) {
      var q = S.trueLongitude(sa, S.ahargana(WHEN)); return q ? q.lon : null; });
    MODE = saved; CUSTOM = savedC; apply();
    tiers.mod = SA7.map(function (sa) { return refLon(sa, WHEN); });

    var W = 720, cx = 360, cy = 360, o = '<svg viewBox="0 0 ' + W + ' ' + W +
      '" class="sslsvg" role="img" aria-label="The seven grahas placed by the ' +
      'bare text, by the fitted tier and by the modern engine, on one ring">' +
      "<title>Three skies</title>";
    var RO = 318, RI = 232;
    for (var s = 0; s < 12; s++) {
      var a0 = -s * 30 - 90;
      o += wedge(cx, cy, RI, RO, a0, a0 - 30, "ssl-sign" + (s % 2 ? " alt" : ""));
      var am = (a0 - 15) * DEG;
      o += '<text x="' + (cx + (RO + RI) / 2 * Math.cos(am)).toFixed(1) + '" y="' +
           (cy - (RO + RI) / 2 * Math.sin(am) + 4).toFixed(1) +
           '" class="ssl-signlab">' + esc(RS[s].slice(0, 4)) + "</text>";
    }
    var rings = [["mod", 206, "modern"], ["fit", 172, "fitted"], ["bare", 138, "text"]];
    rings.forEach(function (R) {
      o += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R[1] +
           '" class="ssl-orb"/>';
      SA7.forEach(function (sa, i) {
        var L = tiers[R[0]][i];
        if (L == null) return;
        var a = (-L - 90) * DEG;
        o += '<circle cx="' + (cx + R[1] * Math.cos(a)).toFixed(1) + '" cy="' +
             (cy - R[1] * Math.sin(a)).toFixed(1) + '" r="6" class="ssl-mark ' +
             R[0] + '"><title>' + esc(sa) + " · " + esc(R[2]) + " · " +
             esc(dm(L)) + "</title></circle>";
      });
      o += '<text x="' + cx + '" y="' + (cy - R[1] + 4) + '" class="ssl-orblab ' +
           R[0] + '">' + esc(R[2]) + "</text>";
    });
    /* the spokes, so a reader can see which three marks belong together */
    SA7.forEach(function (sa, i) {
      var a = (-(tiers.mod[i] == null ? 0 : tiers.mod[i]) - 90) * DEG;
      if (tiers.mod[i] == null) return;
      o += '<text x="' + (cx + (RI - 14) * Math.cos(a)).toFixed(1) + '" y="' +
           (cy - (RI - 14) * Math.sin(a) + 4).toFixed(1) +
           '" class="ssl-ptname">' + esc(sa) + "</text>";
    });
    o += '<text x="' + cx + '" y="' + (cy + 4) + '" class="ssl-hub">' +
         new Date(WHEN).toISOString().slice(0, 10) + "</text>";
    o += "</svg>";
    host.innerHTML = o;

    var tab = $("ss-ringtab");
    if (tab) {
      tab.innerHTML = '<div class="aytabwrap"><table class="aytab"><thead><tr>' +
        "<th>Graha</th><th>the text as written</th><th>the fitted tier</th>" +
        "<th>modern</th><th>text − modern</th><th>fitted − modern</th>" +
        "</tr></thead><tbody>" + SA7.map(function (sa, i) {
          var b = tiers.bare[i], f = tiers.fit[i], m = tiers.mod[i];
          if (m == null) return "";
          return "<tr><td>" + esc(sa) + "</td><td>" + esc(dm(b)) + "</td><td>" +
            esc(dm(f)) + "</td><td>" + esc(dm(m)) + '</td><td class="num">' +
            sdiff(b, m).toFixed(2) + '°</td><td class="num">' +
            sdiff(f, m).toFixed(2) + "°</td></tr>";
        }).join("") + "</tbody></table></div>";
    }
  }
  function wedge(cx, cy, ri, ro, a0, a1, cls) {
    var r0 = a0 * DEG, r1 = a1 * DEG;
    var x0 = cx + ro * Math.cos(r0), y0 = cy - ro * Math.sin(r0);
    var x1 = cx + ro * Math.cos(r1), y1 = cy - ro * Math.sin(r1);
    var x2 = cx + ri * Math.cos(r1), y2 = cy - ri * Math.sin(r1);
    var x3 = cx + ri * Math.cos(r0), y3 = cy - ri * Math.sin(r0);
    return '<path d="M' + x0.toFixed(1) + " " + y0.toFixed(1) + "A" + ro + " " +
      ro + " 0 0 1 " + x1.toFixed(1) + " " + y1.toFixed(1) + "L" + x2.toFixed(1) +
      " " + y2.toFixed(1) + "A" + ri + " " + ri + " 0 0 0 " + x3.toFixed(1) +
      " " + y3.toFixed(1) + 'Z" class="' + cls + '"/>';
  }

  /* ---- wiring ------------------------------------------------------------- */
  function redrawLab() {
    sliders(); scoreTable(); ringPanel(); psBorrowList();
  }
  function redrawGeom() { epiPanel(); curvePanel(); }

  function bind() {
    S = window.SSEngine;
    if (!S || !$("ss-sliders")) return;
    var raw = $("data-siddhanta-measured");
    try { FIT = JSON.parse(raw.textContent); } catch (e) { FIT = null; }
    if (!FIT || !FIT.params || !FIT.lahiri) {
      var h = $("ss-score");
      if (h) h.innerHTML = '<p class="ssnote">The fitted constants did not ' +
        "load, so the sandbox and the three-ring comparison are unavailable " +
        "on this page. Everything above is unaffected.</p>";
      return;
    }
    LAH = FIT.lahiri;
    S.setMeasured(FIT);
    if (window.__ss && window.__ss.when) WHEN = window.__ss.when();

    [["ss-sbody", function (v) { SBODY = v; redrawLab(); }],
     ["ss-epibody", function (v) { EBODY = v; redrawGeom(); }]
    ].forEach(function (pair) {
      var sel = $(pair[0]);
      if (!sel) return;
      SA7.forEach(function (sa) {
        var op = document.createElement("option");
        op.value = sa; op.textContent = sa;
        if ((pair[0] === "ss-epibody" && sa === EBODY) ||
            (pair[0] === "ss-sbody" && sa === SBODY)) op.selected = true;
        sel.appendChild(op);
      });
      sel.addEventListener("change", function () { pair[1](sel.value); });
    });

    var an = $("ss-anom");
    if (an) an.addEventListener("input", function () {
      ANOM = +an.value; stopSpin(); redrawGeom(); });

    document.addEventListener("input", function (e) {
      var k = e.target.getAttribute && e.target.getAttribute("data-sskey");
      if (!k) return;
      if (MODE !== "custom") {
        CUSTOM = {};
        var base = MODE === "fitted" ? FIT.params : neutral();
        for (var kk in base) CUSTOM[kk] = base[kk];
        MODE = "custom";
      }
      CUSTOM[k] = +e.target.value;
      var out = document.querySelector('[data-ssout="' + k + '"]');
      if (out) out.textContent = fmtVal(k, CUSTOM[k]);
      apply();
      scoreTable(); ringPanel();
    });

    document.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-ss]") : null;
      if (!b) return;
      var k = b.getAttribute("data-ss");
      if (k === "bare") { MODE = "bare"; CUSTOM = null; apply(); redrawLab(); }
      else if (k === "fitted") { MODE = "fitted"; apply(); redrawLab(); }
      else if (k === "ps") { MODE = "ps"; CUSTOM = null; apply(); redrawLab(); }
      else if (k === "auto") {
        b.disabled = true;
        var was = b.textContent;
        b.textContent = "fitting…";
        setTimeout(function () {
          autoFit(SBODY);
          b.disabled = false; b.textContent = was;
          redrawLab();
        }, 20);
      } else if (k === "anomnow") {
        var q = S.trueLongitude(EBODY, S.ahargana(WHEN));
        if (q && q.anomaly != null) ANOM = q.anomaly;
        else if (q && q.mandocca != null) ANOM = norm(q.mean - q.mandocca);
        var sl = $("ss-anom");
        if (sl) sl.value = ANOM;
        stopSpin(); redrawGeom();
      } else if (k === "anomspin") { SPIN ? stopSpin() : startSpin(b); }
    });

    var when = $("ss-when");
    if (when) when.addEventListener("change", function () {
      var t = Date.parse(when.value);
      WHEN = isFinite(t) ? t : Date.now();
      ringPanel(); redrawGeom();
    });
    /* the sine and ayanāṃśa switches belong to ss-page.js; the score has to
       follow them, because the frame a score is taken in is part of the score */
    ["ss-sines", "ss-ayana"].forEach(function (id) {
      var e2 = $(id);
      if (e2) e2.addEventListener("change", function () {
        buildSample(); redrawLab(); redrawGeom(); });
    });

    buildSample();
    MODE = "bare"; apply();
    redrawLab(); redrawGeom(); jyaPanel();

    try {
      window.__sslab = {
        score: score, mode: function () { return MODE; },
        setMode: function (m) { MODE = m; apply(); redrawLab(); },
        apply: apply, samples: function () { return SAMPLE.slice(); },
        ref: refLon, autoFit: autoFit, fit: function () { return FIT; },
        setAnom: function (a) { ANOM = a; redrawGeom(); },
        setWhen: function (t) { WHEN = t; ringPanel(); redrawGeom(); }
      };
    } catch (e) {}
  }
  function startSpin(btn) {
    if (btn) btn.textContent = "Stop";
    var t0 = performance.now(), a0 = ANOM;
    SPIN = requestAnimationFrame(function step(t) {
      ANOM = norm(a0 + (t - t0) / 24);
      var sl = $("ss-anom");
      if (sl) sl.value = ANOM;
      redrawGeom();
      SPIN = requestAnimationFrame(step);
    });
  }
  function stopSpin() {
    if (SPIN) cancelAnimationFrame(SPIN);
    SPIN = null;
    var b = document.querySelector('[data-ss="anomspin"]');
    if (b) b.textContent = "Sweep";
  }

  /* ss-page.js binds on DOMContentLoaded and publishes window.__ss at the end
     of its own bind(); this has to come after that, so it waits a tick rather
     than racing it. */
  function go() { setTimeout(bind, 0); }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", go);
  else go();
})();
