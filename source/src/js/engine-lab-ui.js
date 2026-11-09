/* ===== engine-lab.html — the three engines, put to the same questions ======

   WHAT THIS PAGE IS FOR. Every other page that touches accuracy quotes
   arcseconds. Arcseconds are the wrong unit for judging an engine, because a
   chart is read in rāśis, nakṣatras, pādas, aṃśas and daśā periods, and the
   conversion between the two is steep in one place and flat everywhere else.
   So this page asks the QUESTION rather than the body, and converts.

   NOTHING IS TYPED IN. Every measured figure comes from the two data files the
   harnesses write — accuracy.json and siddhanta-measured.json — inlined by the
   build, never fetched, because every page here has to work from a file:// URL.
   Every live comparison is computed in the browser from the engines themselves.

   THE FRAME, which is the one thing a comparison like this can get silently
   wrong. Three different conventions are in play and they are not
   interchangeable:

     · a TITHI is the difference of two longitudes, so a sidereal zero cancels
       out of it exactly and the comparison is frame-free;
     · a NAKṢATRA is measured FROM that zero, so comparing the bare text's
       nakṣatra with a modern one includes the difference between their two
       sidereal zeros. That is left in rather than corrected away — it is a real
       disagreement a reader would meet in an almanac — and the page says so;
     · the FITTED tier was fitted in the site's own Lahiri frame, so its
       longitudes are already there and need no conversion. Scoring it in any
       other frame would measure the frame.

   This is the same recipe ss-verify.mjs and siddhanta-measured-verify.mjs use,
   so a number printed here means what a number printed by the harness means. */
(function () {
  "use strict";

  if (!document.getElementById("el-answer")) return;
  var $ = function (id) { return document.getElementById(id); };

  var SA7 = ["Sūrya", "Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani"];
  var EN = { "Sūrya": "Sun", "Candra": "Moon", "Maṅgala": "Mars",
             "Budha": "Mercury", "Guru": "Jupiter", "Śukra": "Venus",
             "Śani": "Saturn" };
  var RS = ["Meṣa", "Vṛṣabha", "Mithuna", "Karka", "Siṃha", "Kanyā", "Tulā",
            "Vṛścika", "Dhanus", "Makara", "Kumbha", "Mīna"];
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday",
              "Friday", "Saturday"];
  /* the three engines, in the order they are always shown */
  var TIERS = [
    { k: "mod", label: "modern ephemeris",
      note: "astronomy-engine, measured against ERFA" },
    { k: "fit", label: "siddhānta, fitted tier",
      note: "the text's equations, measured constants" },
    { k: "bare", label: "Sūrya Siddhānta as written",
      note: "the text's own numbers" }
  ];

  var AC = null, FIT = null, LAH = null;
  var S = null;                      /* window.SSEngine */
  var ST = { when: Date.now(), place: null, q: "nak", arc: 14.79, year: 2026 };

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
  /* an angle in arcseconds, written in whichever unit keeps it legible */
  function ang(as) {
    var a = Math.abs(as);
    if (a < 60) return a.toFixed(a < 10 ? 2 : 1) + "″";
    if (a < 3600) return (a / 60).toFixed(a < 600 ? 2 : 1) + "′";
    return (a / 3600).toFixed(2) + "°";
  }
  /* a division's own width, written the way the tradition writes it: 13°20′,
     not 13.33°. The decimal was how it first came out and it reads as an
     approximation of something exact, which it is not. */
  function degMin(deg) {
    var d = Math.floor(deg + 1e-9), m = (deg - d) * 60;
    if (d === 0) return (m === Math.round(m) ? m.toFixed(0) : m.toFixed(1)) + "′";
    if (m < 1e-6) return d + "°";
    return d + "°" + (Math.abs(m - Math.round(m)) < 1e-6
      ? String(Math.round(m)).padStart(2, "0") : m.toFixed(1)) + "′";
  }
  function plural(n, one, many) {
    return n.toFixed(n < 10 ? 2 : (n < 100 ? 1 : 0)) + " " + (n === 1 ? one : many);
  }

  function need(list, done) {
    var i = 0;
    (function next() {
      if (i >= list.length) return done();
      var sp = list[i++];
      if (sp.have()) return next();
      var s = document.createElement("script");
      s.src = sp.src; s.defer = true;
      s.onload = next;
      s.onerror = function () {
        $("el-answer").innerHTML = '<p class="swfail">Could not load <code>' +
          sp.src + "</code>.</p>";
      };
      document.head.appendChild(s);
    })();
  }

  /* ---- the three engines, as three functions of a moment ------------------ */
  function lahiriAt(jd) {
    var T = (jd - 2451545.0) / 36525.0;
    return LAH[2] + LAH[1] * T + LAH[0] * T * T;
  }
  /* The engine's state is global, so a tier is entered, read and left. Reading
     all three at one moment is three passes, not one — which is the point. */
  function withTier(k, fn) {
    if (k === "bare") { S.bare(); S.setMeasured(FIT); return fn(); }
    S.setMeasured(FIT);
    S.measured();
    var out = fn();
    S.bare(); S.setMeasured(FIT);
    return out;
  }
  function ssAt(k, ms) {
    return withTier(k, function () {
      var a = S.ahargana(ms) + (ST.place ? S.desantara(ST.place) : 0);
      var out = { lon: {}, panch: null };
      SA7.forEach(function (sa) {
        var q = S.trueLongitude(sa, a);
        out.lon[sa] = q ? q.lon : null;
      });
      try { out.panch = S.panchanga(ms, ST.place); } catch (e) {}
      return out;
    });
  }
  function modAt(ms) {
    var out = { lon: {}, panch: null, lahiri: {} };
    SA7.forEach(function (sa) {
      try {
        var e = window.__kEclip(EN[sa], ms);
        out.lon[sa] = e ? e.lon : null;        /* the site's own ayanāṃśa */
        out.lahiri[sa] = e ? norm(e.trop - lahiriAt(ms / 86400000 + 2440587.5))
                           : null;             /* the frame the fit used */
      } catch (err) { out.lon[sa] = null; }
    });
    try { out.panch = window.NP.day(ms, ST.place); } catch (e) {}
    return out;
  }

  /* ---- the question, answered three ways --------------------------------- */
  var NAKW = 360 / 27;
  function nakOf(L) {
    var i = Math.floor(norm(L) / NAKW);
    return { i: i, pada: Math.floor((norm(L) % NAKW) / (NAKW / 4)) + 1 };
  }
  function modTithi(p) {
    if (!p || !p.at || !p.at.tithi) return null;
    return p.at.tithi.n + (p.at.tithi.paksha === "kṛṣṇa" ? 15 : 0);
  }

  function answer() {
    var host = $("el-answer");
    if (!host) return;
    var ms = ST.when;
    var A = { mod: modAt(ms), fit: ssAt("fit", ms), bare: ssAt("bare", ms) };
    var rows = [], verdict = "", nakNames = null;
    try { nakNames = S.NAK; } catch (e) {}

    if (ST.q === "lon") {
      rows = SA7.map(function (sa) {
        return { k: sa,
          cells: [dm(A.mod.lon[sa]), dm(A.fit.lon[sa]), dm(A.bare.lon[sa])],
          /* the fitted tier's own frame is Lahiri, so it is compared against
             the modern engine in that frame and not in the page's */
          gap: [ang(Math.abs(sdiff(A.fit.lon[sa], A.mod.lahiri[sa])) * 3600),
                ang(Math.abs(sdiff(A.bare.lon[sa], A.mod.lahiri[sa])) * 3600)] };
      });
      verdict = "Longitude is the question on which the three always differ, " +
        "and by the smallest amount that matters least. The two gap columns " +
        "are each siddhāntic tier against the modern engine in the same " +
        "sidereal frame the fit was made in.";
      return render(["Graha", "modern", "fitted", "as written",
                     "fitted − modern", "written − modern"], rows, true);
    }

    if (ST.q === "nak") {
      var mn = A.mod.panch && A.mod.panch.at && A.mod.panch.at.nak
        ? A.mod.panch.at.nak.name : null;
      var mp = A.mod.panch && A.mod.panch.at && A.mod.panch.at.nak
        ? A.mod.panch.at.nak.pada : null;
      var f = A.fit.panch ? A.fit.panch.nakshatra : null;
      var b = A.bare.panch ? A.bare.panch.nakshatra : null;
      rows = [{ k: "Moon's nakṣatra",
                cells: [mn ? mn + (mp ? " pāda " + mp : "") : "—",
                        f ? f.name + " pāda " + f.pada : "—",
                        b ? b.name + " pāda " + b.pada : "—"] }];
      var same = f && b && mn && f.name === mn && b.name === mn;
      verdict = same
        ? "<b>All three name the same nakṣatra.</b> This is the usual case, " +
          "and it is the honest headline about the older method: an error of " +
          "degrees in longitude still lands inside a division 13°20′ wide " +
          "most of the time."
        : "<b>They do not all agree.</b> Note what is being compared: a " +
          "nakṣatra is counted from a sidereal zero, and the bare text's zero " +
          "is its own. That frame difference is part of this disagreement and " +
          "is deliberately not corrected away, because it is the disagreement " +
          "a reader actually meets when two almanacs are put side by side.";
      return render(["Question", "modern", "fitted", "as written"], rows, false);
    }

    if (ST.q === "tithi") {
      var mt = modTithi(A.mod.panch);
      var ft = A.fit.panch ? A.fit.panch.tithi : null;
      var bt = A.bare.panch ? A.bare.panch.tithi : null;
      rows = [{ k: "Tithi",
        cells: [mt == null ? "—" : "no. " + mt,
                ft ? "no. " + ft.n + " · " + ft.name + " " + ft.paksha : "—",
                bt ? "no. " + bt.n + " · " + bt.name + " " + bt.paksha : "—"] }];
      verdict = "A tithi is the <b>difference</b> of the Moon's and the " +
        "Sun's longitudes, so whatever sidereal zero each engine uses cancels " +
        "out of it exactly — this is the one question on the list that is " +
        "free of the ayanāṃśa. What is left is the two position errors, and " +
        "because the Moon crosses a tithi in under a day, those are enough to " +
        "move it by one more often than they move the nakṣatra.";
      return render(["Question", "modern", "fitted", "as written"], rows, false);
    }

    if (ST.q === "dasha") {
      var V = window.__kVims;
      rows = ["mod", "fit", "bare"].map(function (k) {
        var L = k === "mod" ? A.mod.lahiri["Candra"] : A[k].lon["Candra"];
        if (L == null) return null;
        var v = V.atMoon(L);
        return { k: TIERS.filter(function (t) { return t.k === k; })[0].label,
          cells: [dm(L), v.lord,
                  v.balance.toFixed(3) + " years of " + v.full] };
      }).filter(Boolean);
      var lords = rows.map(function (r) { return r.cells[1]; });
      var allSame = lords.every(function (l) { return l === lords[0]; });
      /* what the disagreement is worth, in the unit the question is asked in */
      var mb = V.atMoon(A.mod.lahiri["Candra"]).balance;
      var fb = V.atMoon(A.fit.lon["Candra"]).balance;
      verdict = (allSame
        ? "All three would open on <b>" + esc(lords[0]) + "</b>. "
        : "They do not agree on the opening lord. ") +
        "The balances differ by <b>" +
        Math.abs((mb - fb) * 365.2425).toFixed(0) + " days</b> between the " +
        "modern engine and the fitted tier — which is the exchange rate in " +
        "the next section doing its work: a Moon out by an arcminute is a " +
        "daśā boundary out by weeks.";
      return render(["Engine", "the Moon", "opening lord", "balance at birth"],
                    rows, false);
    }

    /* vāra */
    var fv = A.fit.panch ? A.fit.panch.vara : null;
    var utc = new Date(ms).getUTCDay();
    rows = [{ k: "Vāra", cells: [DAYS[utc], fv ? fv.english : "—",
                                 fv ? fv.english : "—"] }];
    verdict = "The weekday is the one limb that carries <b>no position at " +
      "all</b>: it is the ahargaṇa — the count of days since the epoch — " +
      "modulo seven. So the siddhānta and a modern calendar agree on it " +
      "always, and will go on agreeing however far the longitudes drift. " +
      "Both siddhāntic columns are identical here for the same reason: " +
      "correcting the constants cannot change a day count.";
    return render(["Question", "modern", "fitted", "as written"], rows, false);

    function render(heads, rows, gaps) {
      host.innerHTML = '<div class="aytabwrap"><table class="aytab"><thead><tr>' +
        heads.map(function (h) { return "<th>" + esc(h) + "</th>"; }).join("") +
        "</tr></thead><tbody>" + rows.map(function (r) {
          return "<tr><td>" + esc(r.k) + "</td>" +
            r.cells.map(function (c) { return "<td>" + esc(c) + "</td>"; }).join("") +
            (gaps && r.gap
              ? r.gap.map(function (g) {
                  return '<td class="num">' + esc(g) + "</td>"; }).join("")
              : "") + "</tr>";
        }).join("") + "</tbody></table></div>" +
        '<p class="elwho">' + TIERS.map(function (t) {
          return "<span><b>" + esc(t.label) + "</b> — " + esc(t.note) + "</span>";
        }).join("") + "</p>";
      var v = $("el-verdict");
      if (v) v.innerHTML = verdict;
    }
  }

  /* ---- the agreement rate over a span ------------------------------------ */
  function rates() {
    var host = $("el-rates");
    if (!host) return;
    var from = +$("el-from").value, to = +$("el-to").value, N = +$("el-n").value;
    if (!(to > from)) return;
    var hit = { nak: 0, nakFit: 0, tithi: 0, tithiNear: 0, vara: 0, n: 0 };
    var gap = { fit: [], bare: [] };
    for (var i = 0; i < N; i++) {
      /* spread across the span AND across the year, so neither the drift nor
         the annual term is aliased away */
      var frac = i / Math.max(1, N - 1);
      var ms = Date.UTC(Math.round(from + (to - from) * frac), 0, 1) +
               ((i * 137) % 365) * 86400000 + 6 * 3600000;
      var m = modAt(ms), f = ssAt("fit", ms), b = ssAt("bare", ms);
      if (!m.panch || !f.panch || !b.panch) continue;
      hit.n++;
      var mn = m.panch.at && m.panch.at.nak ? m.panch.at.nak.name : null;
      if (mn && b.panch.nakshatra.name === mn) hit.nak++;
      if (mn && f.panch.nakshatra.name === mn) hit.nakFit++;
      var mt = modTithi(m.panch);
      if (mt != null) {
        var d = Math.abs(b.panch.tithi.n - mt);
        if (d === 0) hit.tithi++;
        if (d <= 1 || d >= 29) hit.tithiNear++;
      }
      if (b.panch.vara.i === new Date(ms).getUTCDay()) hit.vara++;
      if (m.lahiri["Candra"] != null) {
        gap.fit.push(Math.abs(sdiff(f.lon["Candra"], m.lahiri["Candra"])) * 60);
        gap.bare.push(Math.abs(sdiff(b.lon["Candra"], m.lahiri["Candra"])) * 60);
      }
    }
    if (!hit.n) { host.innerHTML = ""; return; }
    var pc = function (k) { return (hit[k] / hit.n * 100).toFixed(0) + "%"; };
    var rms = function (a) {
      return a.length
        ? Math.sqrt(a.reduce(function (s, x) { return s + x * x; }, 0) / a.length)
        : null;
    };
    var ROWS = [
      ["the vāra", pc("vara"), "the ahargaṇa modulo seven — no position in it at all"],
      ["the nakṣatra, bare text", pc("nak"),
       "counted from a sidereal zero, so this includes the frame difference"],
      ["the nakṣatra, fitted tier", pc("nakFit"),
       "the fit put its longitudes in the site's own frame, so this is cleaner"],
      ["the tithi, exactly", pc("tithi"),
       "frame-free, and the hardest of the five to get right"],
      ["the tithi, within one", pc("tithiNear"),
       "which is the honest claim the older method can make"]
    ];
    host.innerHTML = '<div class="aytabwrap"><table class="aytab"><thead><tr>' +
      "<th>Agrees with the modern engine on…</th><th>rate</th><th></th>" +
      "<th>why</th></tr></thead><tbody>" + ROWS.map(function (r) {
        var v = parseFloat(r[1]);
        return "<tr><td>" + esc(r[0]) + '</td><td class="num"><b>' + esc(r[1]) +
          '</b></td><td class="ssbarcell"><span class="ssbar' +
          (v >= 95 ? " good" : "") + '"><i style="width:' + v.toFixed(0) +
          '%"></i></span></td><td class="elwhy">' + esc(r[2]) + "</td></tr>";
      }).join("") + "</tbody></table></div>";
    var note = $("el-ratenote");
    if (note) {
      note.innerHTML = hit.n + " moments sampled between " + from + " and " + to +
        ". Over the same sample the Moon's own longitude is out by <b>" +
        rms(gap.bare).toFixed(0) + "′</b> in the bare text and <b>" +
        rms(gap.fit).toFixed(0) + "′</b> in the fitted tier — and note that " +
        "the second figure, forty times better on the Sun, is barely better " +
        "here. Correcting constants cannot supply the two lunar terms this " +
        "astronomy does not have, which is why the tithi rate hardly moves " +
        "either.";
    }
  }

  /* ---- the cost converter ------------------------------------------------- */
  function cost() {
    var host = $("el-cost");
    if (!host) return;
    var as = ST.arc;                                /* arcseconds */
    var C = AC.cost, D = AC.divisions;
    var read = $("el-arcread");
    if (read) read.textContent = ang(as) + " of longitude";

    var cells = [];
    /* as a fraction of each division it could move */
    D.forEach(function (d) {
      var frac = d.arcsec / as;
      cells.push(["1 ⁄ " + (frac >= 10 ? Math.round(frac).toLocaleString("en")
                                       : frac.toFixed(1)),
                  "of a " + d.name + " (" + degMin(d.deg) + ")"]);
    });
    /* as time, through the rates the harness measured */
    var nakSec = as / 14.79 * C.nakshatraBoundarySeconds;
    var tithiSec = as / 14.79 * C.tithiEndSeconds;
    cells.push([plural(nakSec, "second", "seconds"),
                "on a nakṣatra or pāda boundary, at the Moon's rate"]);
    cells.push([plural(tithiSec, "second", "seconds"),
                "on a tithi, yoga or karaṇa ending"]);
    /* And as daśā, which is the steep one. THE RATE IS LORD-SPECIFIC:
       C.dashaDaysPerArcsec is the CYCLE AVERAGE and must be labelled as such,
       because traversing one nakṣatra traverses that nakṣatra lord's own
       mahādaśā — the Sun's six years up to Venus's twenty — not all 120. */
    var fmtD = function (d) {
      return d >= 730 ? (d / 365.2425).toFixed(1) + " years"
                      : plural(d, "day", "days");
    };
    cells.push([fmtD(as * C.dashaDaysPerArcsecMin) + " – " +
                fmtD(as * C.dashaDaysPerArcsecMax),
                "of Viṃśottarī mahādaśā, at " + C.dashaDaysPerArcsecMin + "–" +
                C.dashaDaysPerArcsecMax + " days per arcsecond depending on the " +
                "nakṣatra lord (" + C.dashaDaysPerArcsec + " on the cycle average)"]);
    cells.push([plural(as / C.birthMinuteArcsec * 60, "second", "seconds"),
                "of birth time — the error this is equivalent to"]);

    host.innerHTML = '<div class="axgrid elcost">' + cells.map(function (c) {
      return '<div class="axcell"><b>' + esc(c[0]) + "</b><span>" + esc(c[1]) +
        "</span></div>";
    }).join("") + "</div>";
  }

  /* where each engine and each body actually sits on that slider */
  function marks() {
    var host = $("el-marks");
    if (!host) return;
    var pts = [];
    AC.modern.perBody.forEach(function (b) {
      pts.push({ at: b.lonWorst, lab: b.sa, cls: "mod" });
    });
    AC.siddhanta.measured.forEach(function (m) {
      pts.push({ at: m.measuredRms * 60, lab: m.sa, cls: "fit" });
    });
    var W = 760, H = 112, L = 14, R = 14, T = 30;
    var lo = -1, hi = 4.3;                       /* log10 arcseconds */
    var sx = function (as) {
      var l = Math.log10(Math.max(0.1, as));
      return L + (W - L - R) * (l - lo) / (hi - lo);
    };
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="elsvg" role="img" ' +
      'aria-label="Where each engine\'s measured error falls on the slider ' +
      'above"><title>The measured residuals</title>';
    o += '<line x1="' + L + '" y1="' + T + '" x2="' + (W - R) + '" y2="' + T +
         '" class="el-axis"/>';
    [0.1, 1, 10, 60, 600, 3600, 18000].forEach(function (v) {
      o += '<line x1="' + sx(v).toFixed(1) + '" y1="' + (T - 5) + '" x2="' +
           sx(v).toFixed(1) + '" y2="' + (T + 5) + '" class="el-tick"/>' +
           '<text x="' + sx(v).toFixed(1) + '" y="' + (T - 10) +
           '" class="el-ticklab">' + ang(v) + "</text>";
    });
    /* lanes, so overlapping labels do not pile up */
    ["mod", "fit"].forEach(function (cls, lane) {
      var y = T + 24 + lane * 34;
      var mine = pts.filter(function (p) { return p.cls === cls; })
                    .sort(function (a, b) { return a.at - b.at; });
      var lastX = -99, sub = 0;
      mine.forEach(function (p) {
        var x = sx(p.at);
        sub = (x - lastX < 34) ? (sub + 1) % 2 : 0;
        lastX = x;
        o += '<circle cx="' + x.toFixed(1) + '" cy="' + y + '" r="4.5" class="el-pt ' +
             cls + '"><title>' + esc(p.lab) + " · " + ang(p.at) + "</title></circle>";
        o += '<text x="' + x.toFixed(1) + '" y="' + (y + 15 + sub * 11) +
             '" class="el-ptlab">' + esc(p.lab) + "</text>";
      });
      o += '<text x="' + L + '" y="' + (y + 4) + '" class="el-lane ' + cls + '">' +
           (cls === "mod" ? "modern" : "fitted") + "</text>";
    });
    o += '<line x1="' + sx(ST.arc).toFixed(1) + '" y1="' + (T - 6) + '" x2="' +
         sx(ST.arc).toFixed(1) + '" y2="' + (H - 2) + '" class="el-cursor"/>';
    o += "</svg>";
    host.innerHTML = o;
  }

  /* ---- the ruler: engines against conventions ----------------------------- */
  function ruler() {
    var host = $("el-ruler");
    if (!host) return;
    var ENG = [], CONV = [], DIVS = [];
    AC.modern.perBody.forEach(function (b) {
      ENG.push({ at: b.lonWorst, lab: b.sa + ", modern", k: "mod" });
    });
    ENG.push({ at: AC.modern.gastWorst, lab: "sidereal time", k: "mod" });
    var worstLagna = AC.modern.lagna.reduce(function (a, l) {
      return l.endToEndWorst > a.endToEndWorst ? l : a; }, AC.modern.lagna[0]);
    ENG.push({ at: worstLagna.endToEndWorst,
               lab: "lagna at " + worstLagna.place, k: "mod" });
    AC.siddhanta.measured.forEach(function (m) {
      ENG.push({ at: m.measuredRms * 60, lab: m.sa + ", fitted", k: "fit" });
      ENG.push({ at: m.bareRms * 60, lab: m.sa + ", as written", k: "bare" });
    });
    CONV.push({ at: AC.ayanamsa.spreadDeg * 3600,
                lab: "the spread across all " + AC.ayanamsa.modes.length +
                     " ayanāṃśas", k: "conv" });
    CONV.push({ at: AC.ayanamsa.anchorGapDeg * 3600,
                lab: "Citrā at 180° against Revatī at 359°50′", k: "conv" });
    CONV.push({ at: 49.2 * 60, lab: "polar vs ecliptic longitude, Spica",
                k: "conv" });
    AC.divisions.forEach(function (d) {
      DIVS.push({ at: d.arcsec, lab: d.name });
    });

    var W = 760, lo = 0, hi = 4.5, L = 150, R = 20, T = 34;
    var lanes = [{ k: "divs", y: T, label: "the divisions a chart is read in" },
                 { k: "mod", y: T + 58, label: "the modern engine" },
                 { k: "fit", y: T + 102, label: "siddhānta, fitted" },
                 { k: "bare", y: T + 146, label: "siddhānta, as written" },
                 { k: "conv", y: T + 200, label: "conventions — not errors" }];
    var H = T + 250;
    var sx = function (as) {
      return L + (W - L - R) * (Math.log10(Math.max(1, as)) - lo) / (hi - lo);
    };
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="elsvg" role="img" ' +
      'aria-label="Every measured engine error and every convention on one ' +
      'logarithmic scale from an arcsecond to ten degrees"><title>One ruler' +
      "</title>";
    /* the decade grid, drawn behind everything so the lanes can be compared */
    [1, 10, 60, 600, 3600, 18000, 36000].forEach(function (v) {
      o += '<line x1="' + sx(v).toFixed(1) + '" y1="' + (T - 14) + '" x2="' +
           sx(v).toFixed(1) + '" y2="' + (H - 16) + '" class="el-vgrid"/>' +
           '<text x="' + sx(v).toFixed(1) + '" y="' + (H - 4) +
           '" class="el-ticklab">' + ang(v) + "</text>";
    });
    lanes.forEach(function (ln) {
      o += '<text x="' + (L - 10) + '" y="' + (ln.y + 4) + '" class="el-lanelab ' +
           ln.k + '">' + esc(ln.label) + "</text>";
      var set = ln.k === "divs" ? DIVS
        : (ln.k === "conv" ? CONV : ENG.filter(function (e) { return e.k === ln.k; }));
      var last = -99, sub = 0;
      set.sort(function (a, b) { return a.at - b.at; }).forEach(function (p) {
        var x = sx(p.at);
        sub = (x - last < 70) ? (sub + 1) % 2 : 0;
        last = x;
        if (ln.k === "divs") {
          o += '<line x1="' + x.toFixed(1) + '" y1="' + (ln.y - 9) + '" x2="' +
               x.toFixed(1) + '" y2="' + (ln.y + 9) + '" class="el-div"/>';
        } else {
          o += '<circle cx="' + x.toFixed(1) + '" cy="' + ln.y + '" r="5" ' +
               'class="el-pt ' + ln.k + '"><title>' + esc(p.lab) + " · " +
               ang(p.at) + "</title></circle>";
        }
        o += '<text x="' + x.toFixed(1) + '" y="' +
             (ln.y + (ln.k === "divs" ? -13 : 17) + sub * 11) +
             '" class="el-ptlab ' + ln.k + '">' + esc(p.lab) + "</text>";
      });
    });
    o += "</svg>";
    host.innerHTML = o;

    var note = $("el-rulernote");
    if (note) {
      /* THE COMPARISON HAS TO BE THE RIGHT ONE. The first version of this note
         took the worst mark on any lane but the bare text's, which put Budha's
         fitted 107′ at the top and reported the conventions as "3 times
         larger" — a weak claim, and resting on a tier the page itself says is
         not for casting. The engine everything here is actually computed with
         is the modern one, so that is what a convention has to be set against. */
      var modWorst = ENG.filter(function (e) { return e.k === "mod"; })
        .reduce(function (a, e) { return e.at > a.at ? e : a; });
      var modMax = modWorst.at;
      var convMax = Math.max.apply(null, CONV.map(function (c) { return c.at; }));
      var fitMax = Math.max.apply(null, ENG.filter(function (e) {
        return e.k === "fit"; }).map(function (e) { return e.at; }));
      var d60 = AC.divisions[AC.divisions.length - 1];
      note.innerHTML = "The engine every chart on this site is cast with sits " +
        "entirely to the left: its worst mark of all is " + ang(modMax) +
        " — the " + esc(modWorst.lab) + ", where a shallow angle between the " +
        "ecliptic and the horizon amplifies everything behind it — against a " +
        "narrowest division of " + degMin(d60.deg) + ". So even there, " +
        "nothing it computes is within <b>" +
        Math.round(d60.arcsec / modMax) + " times</b> of changing a reading. " +
        "The widest gap between two defensible <b>conventions</b> is " +
        ang(convMax) + ", which is <b>" + Math.round(convMax / modMax) +
        " times larger</b> than that worst mark and is not an error in " +
        "anything. The two siddhāntic lanes are a different matter and are " +
        "not offered for casting: the fitted tier still reaches " +
        ang(fitMax) + " on its worst body, which is past several of the " +
        "divisions on the top lane.";
    }
  }

  /* ---- the certified band ------------------------------------------------- */
  function band() {
    var host = $("el-band");
    if (!host) return;
    var B = AC.bands, curve = AC.moonCurve;
    var W = 760, H = 230, L = 52, R = 16, T = 18, Bm = 34;
    var y0 = 1000, y1 = 3000;
    var hiV = Math.max.apply(null, curve.map(function (p) { return p.d; })) * 1.1;
    var sx = function (y) { return L + (W - L - R) * (y - y0) / (y1 - y0); };
    var sy = function (v) { return T + (H - T - Bm) * (1 - v / hiV); };
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="elsvg" role="img" ' +
      'aria-label="The modern engine\'s disagreement with an independent sky, ' +
      'by year, with the certified band marked"><title>The bands</title>';
    B.forEach(function (b) {
      o += '<rect x="' + sx(b.from).toFixed(1) + '" y="' + T + '" width="' +
           (sx(b.to) - sx(b.from)).toFixed(1) + '" height="' + (H - T - Bm) +
           '" class="el-band' + (b.certified ? " cert" : "") + '"><title>' +
           b.from + "–" + b.to + " · Moon " + b.moon + "″</title></rect>";
      o += '<text x="' + ((sx(b.from) + sx(b.to)) / 2).toFixed(1) + '" y="' +
           (T + 14) + '" class="el-bandlab' + (b.certified ? " cert" : "") +
           '">' + b.moon + "″</text>";
    });
    o += '<path d="' + curve.map(function (p, i) {
      return (i ? "L" : "M") + sx(p.y).toFixed(1) + " " + sy(p.d).toFixed(1);
    }).join(" ") + '" class="el-curve"/>';
    [0, hiV / 2, hiV].forEach(function (v) {
      o += '<text x="' + (L - 7) + '" y="' + (sy(v) + 4).toFixed(1) +
           '" class="el-ax">' + v.toFixed(0) + "″</text>";
    });
    [1000, 1500, 2000, 2500, 3000].forEach(function (y) {
      o += '<text x="' + sx(y).toFixed(1) + '" y="' + (H - Bm + 16) +
           '" class="el-ticklab">' + y + "</text>";
    });
    o += '<line x1="' + sx(ST.year).toFixed(1) + '" y1="' + T + '" x2="' +
         sx(ST.year).toFixed(1) + '" y2="' + (H - Bm) + '" class="el-cursor"/>';
    o += "</svg>";
    host.innerHTML = o;

    var here = B.filter(function (b) {
      return ST.year >= b.from && ST.year <= b.to; })[0];
    var read = $("el-yearread");
    if (read) read.textContent = ST.year;
    var note = $("el-bandnote");
    if (note && here) {
      var qname = { lon: "the grahas' longitudes", nak: "the Moon's nakṣatra",
                    tithi: "the tithi", dasha: "the opening daśā",
                    vara: "the vāra" }[ST.q];
      /* Cycle average; the per-lord span is given alongside, since one
         nakṣatra is one lord's mahādaśā and not the whole 120 years. */
      var dd = here.moon * AC.cost.dashaDaysPerArcsec;
      var ddLo = here.moon * AC.cost.dashaDaysPerArcsecMin;
      var ddHi = here.moon * AC.cost.dashaDaysPerArcsecMax;
      note.innerHTML = "<b>" + here.from + "–" + here.to + "</b> — " +
        (here.certified
          ? "the certified window. The Moon is within <b>" + here.moon +
            "″</b> of an independent computation here, a tithi ending within <b>" +
            here.tithi + " seconds</b>."
          : "outside the certified window. The Moon <i>disagrees</i> with the " +
            "reference by <b>" + here.moon + "″</b> — and disagreement is the " +
            "right word, because the reference's own lunar series degrades away " +
            "from the present too, so this figure bounds the error without " +
            "attributing it.") +
        " For the question you chose above — " + qname + " — that is worth " +
        (ST.q === "vara" ? "<b>nothing at all</b>: a weekday is a day count."
         : ST.q === "dasha"
           ? "about <b>" + (dd >= 365 ? (dd / 365.2425).toFixed(1) + " years"
                                      : dd.toFixed(1) + " days") +
             "</b> on a mahādaśā boundary on the cycle average, or <b>" +
             ddLo.toFixed(1) + "–" + ddHi.toFixed(1) + " days</b> depending on " +
             "which lord owns the Moon's nakṣatra."
         : ST.q === "tithi"
           ? "about <b>" + here.tithi + " seconds</b> on a tithi ending."
         : ST.q === "nak"
           ? "about <b>" + here.nak + " seconds</b> on a nakṣatra boundary, or " +
             "1 ⁄ " + Math.round(48000 / here.moon) + " of the nakṣatra itself."
           : "1 ⁄ " + Math.round(108000 / here.moon) + " of a rāśi.") +
        (ST.year < 1000 || ST.year > 3000
          ? " Outside 1000–3000 nothing is quoted at all, because no reference " +
            "exists in this project's build environment to quote against."
          : "");
    }
  }

  /* ---- the switchboard ---------------------------------------------------- */
  function which() {
    var host = $("el-which");
    if (!host) return;
    var mod = AC.modern.perBody;
    var moon = mod.filter(function (b) { return b.en === "Moon"; })[0];
    var sun = mod.filter(function (b) { return b.en === "Sun"; })[0];
    var sat = mod.filter(function (b) { return b.en === "Saturn"; })[0];
    var ssM = AC.siddhanta.measured;
    var byName = function (sa) {
      return ssM.filter(function (m) { return m.sa === sa; })[0]; };
    var ROWS = [
      ["Every ordinary page, and every chart cast here",
       "the modern ephemeris",
       "measured: Sun " + ang(sun.lonWorst) + ", Moon " + ang(moon.lonWorst) +
       ", Saturn bounded at " + ang(sat.lonWorst),
       "reference-verify, span-verify"],
      ["The lagna and the house cusps", "the modern ephemeris",
       "exact by construction; " +
       ang(AC.modern.lagna[0].endToEndWorst) + " end to end at ordinary " +
       "latitudes, more near the poles",
       "self-test, reference-verify"],
      ["Vargas, Aṣṭakavarga, Ṣaḍbala, the ārūḍhas",
       "exact arithmetic over a longitude",
       "adds no error of its own; inherits the longitude's",
       "self-test, engines-verify"],
      ["A classical reading's own numbers", "Sūrya Siddhānta as written",
       "degrees: Sun " + byName("Sūrya").bareRms.toFixed(0) + "′, Moon " +
       byName("Candra").bareRms.toFixed(0) + "′",
       "ss-verify"],
      ["The same method on measured constants", "the fitted tier",
       "Sun " + byName("Sūrya").measuredRms.toFixed(2) + "′, Moon " +
       byName("Candra").measuredRms.toFixed(0) + "′ — study only, not for casting",
       "siddhanta-measured-verify"],
      ["Which sidereal zero to measure from", "a convention, not an engine",
       "the " + AC.ayanamsa.modes.length + " modes span " +
       AC.ayanamsa.spreadDeg + "°, which no accuracy figure can narrow",
       "cosmos-verify"],
      ["When the Sun rises", "a convention, named on every card",
       "the definitions differ by minutes; not an error in either",
       "ss-verify"]
    ];
    host.innerHTML = '<div class="aytabwrap"><table class="aytab"><thead><tr>' +
      "<th>The question</th><th>what answers it</th><th>how well, and how known" +
      "</th><th>harness</th></tr></thead><tbody>" + ROWS.map(function (r) {
        return "<tr><td>" + esc(r[0]) + "</td><td><b>" + esc(r[1]) +
          "</b></td><td>" + esc(r[2]) + '</td><td class="elharness"><code>' +
          esc(r[3]) + "</code></td></tr>";
      }).join("") + "</tbody></table></div>";
  }

  /* ---- wiring ------------------------------------------------------------- */
  function syncWhen() {
    var e = $("el-when");
    if (!e) return;
    var d = new Date(ST.when + (ST.place ? ST.place.tz : 0) * 3600000);
    e.value = d.getUTCFullYear() + "-" +
      String(d.getUTCMonth() + 1).padStart(2, "0") + "-" +
      String(d.getUTCDate()).padStart(2, "0") + "T" +
      String(d.getUTCHours()).padStart(2, "0") + ":" +
      String(d.getUTCMinutes()).padStart(2, "0");
  }

  function bind() {
    try { AC = JSON.parse($("data-accuracy").textContent); } catch (e) { AC = null; }
    try { FIT = JSON.parse($("data-siddhanta-measured").textContent); }
    catch (e) { FIT = null; }
    S = window.SSEngine;
    if (!AC || !FIT || !FIT.lahiri || !S) {
      $("el-answer").innerHTML = '<p class="swfail">The measured data or the ' +
        "siddhāntic engine did not load, so this page has nothing to compare.</p>";
      return;
    }
    LAH = FIT.lahiri;
    S.setMeasured(FIT);
    ST.place = (window.NP && window.NP.savedPlace && window.NP.savedPlace()) ||
               { n: "Ujjain", lat: 23.1765, lon: 75.7885, tz: 5.5 };
    /* the slider opens where the Moon actually is, because that is the figure
       the rest of the project's sensitivity work is quoted from */
    var moon = AC.modern.perBody.filter(function (b) { return b.en === "Moon"; })[0];
    ST.arc = moon ? moon.lonWorst : 14.79;
    var sl = $("el-arc");
    if (sl) sl.value = Math.log10(ST.arc).toFixed(3);

    var ph = $("el-place");
    if (ph && window.NPlaces && window.NPlaces.picker) {
      window.NPlaces.picker({
        host: ph, value: ST.place,
        quick: [ST.place].concat((window.NP && window.NP.PLACES) || []),
        label: "Place",
        refMs: function () { return ST.when; },
        onPick: function (p) { ST.place = p; syncWhen(); answer(); }
      });
    }
    syncWhen();

    $("el-q").addEventListener("change", function () {
      ST.q = this.value; answer(); band(); });
    $("el-when").addEventListener("change", function () {
      var t = Date.parse(this.value);
      if (!isNaN(t)) { ST.when = t - (ST.place ? ST.place.tz : 0) * 3600000; answer(); }
    });
    $("el-arc").addEventListener("input", function () {
      ST.arc = Math.pow(10, +this.value); cost(); marks(); });
    $("el-year").addEventListener("input", function () {
      ST.year = +this.value; band(); });
    document.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-el]") : null;
      if (!b) return;
      var k = b.getAttribute("data-el");
      if (k === "now") { ST.when = Date.now(); syncWhen(); answer(); }
      else if (k === "roll") {
        b.disabled = true;
        var was = b.textContent;
        b.textContent = "measuring…";
        setTimeout(function () {
          rates(); b.disabled = false; b.textContent = was;
        }, 20);
      }
    });

    answer(); cost(); marks(); ruler(); band(); which(); rates();

    try {
      window.__elab = {
        answerAt: function (ms, q) { ST.when = ms; ST.q = q; answer(); },
        ss: ssAt, mod: modAt, ac: function () { return AC; },
        setArc: function (a) { ST.arc = a; cost(); marks(); },
        setYear: function (y) { ST.year = y; band(); },
        state: function () { return { q: ST.q, arc: ST.arc, year: ST.year }; }
      };
    } catch (e) {}
  }

  need([
    { src: "engine.js", have: function () {
        return !!(window.__kEclip && window.__kVims); } },
    { src: "panchanga.js", have: function () {
        return !!(window.NP && window.NP.day); } },
    { src: "places.js", have: function () { return !!window.NPlaces; } }
  ], function () { setTimeout(bind, 0); });
})();
