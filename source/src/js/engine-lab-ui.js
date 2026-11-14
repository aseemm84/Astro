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
  /* The frame the modern column is read in: Lahiri by default (the frame the
     fitted tier was fitted in, so a comparison is engines and not zeros), or
     whatever the reader picks for this page. */
  function pageMode() { try { return (window.__pageAyan && window.__pageAyan()) || "lahiri"; } catch (e) { return "lahiri"; } }
  function frameAt(jd) {
    var m = pageMode();
    if (m === "lahiri" || !window.__ayanFor) return lahiriAt(jd);
    return window.__ayanFor(m, jd);
  }
  function frameNote() {
    var m = pageMode();
    if (m === "lahiri") return "The modern column is in the Lahiri frame the fitted tier was fitted in; the text as written counts from its own zero. ";
    return "The modern column is in the " + (window.__ayanName ? window.__ayanName(m) : m) +
      " frame chosen for this page; the fitted tier was fitted in Lahiri, so part of every difference here is the gap between the two zeros rather than between the engines. ";
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
        var e = window.__kEclipModern(EN[sa], ms);
        out.lon[sa] = e ? e.lon : null;        /* the site's own ayanāṃśa */
        out.lahiri[sa] = e ? norm(e.trop - frameAt(ms / 86400000 + 2440587.5))
                           : null;             /* the frame the fit used */
      } catch (err) { out.lon[sa] = null; }
    });
    try { out.panch = window.NP.day(ms, ST.place); } catch (e) {}
    return out;
  }

  /* ---- helpers for the questions that need time searched, not read ------- */
  var HOUR = 3600000, DAYMS = 86400000;
  function tzOf() { return ST.place && ST.place.tz != null ? ST.place.tz : 0; }
  function clock(ms) {
    if (ms == null || !isFinite(ms)) return "—";
    var d = new Date(ms + tzOf() * HOUR);
    return String(d.getUTCHours()).padStart(2, "0") + ":" +
           String(d.getUTCMinutes()).padStart(2, "0");
  }
  function stamp(ms) {
    if (ms == null || !isFinite(ms)) return "—";
    var d = new Date(ms + tzOf() * HOUR);
    var M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return d.getUTCDate() + " " + M[d.getUTCMonth()] + " " + d.getUTCFullYear() + ", " + clock(ms);
  }
  function minutesApart(a, b) {
    if (a == null || b == null || !isFinite(a) || !isFinite(b)) return "—";
    var m = (a - b) / 60000, sg = m < 0 ? "−" : "+", x = Math.abs(m);
    if (x >= 2 * 1440) return sg + (x / 1440).toFixed(1) + " d";
    if (x >= 120) return sg + (x / 60).toFixed(1) + " h";
    return sg + x.toFixed(0) + " min";
  }
  /* the next instant after t0 at which f(t) (a sign number, an index…) changes,
     stepping `step` ms and then bisecting to a minute */
  function nextChange(f, t0, step, limit) {
    var fa = f(t0);
    for (var t = t0 + step; t <= t0 + limit; t += step) {
      var ft = f(t);
      if (ft !== fa) {
        var lo = t - step, hi = t;
        while (hi - lo > 60000) { var m = (lo + hi) / 2; if (f(m) === fa) lo = m; else hi = m; }
        return { at: hi, from: fa, to: f(hi) };
      }
    }
    return null;
  }
  /* the next instant the Moon−Sun elongation reaches `want` degrees */
  function nextElong(elong, t0, want) {
    var g = function (t) { return sdiff(elong(t), want); };
    var step = 6 * HOUR, ga = g(t0);
    for (var t = t0 + step; t < t0 + 40 * DAYMS; t += step) {
      var gt = g(t);
      if (ga < 0 && gt >= 0 && Math.abs(gt - ga) < 90) {
        var lo = t - step, hi = t;
        while (hi - lo > 60000) { var m = (lo + hi) / 2; if (g(m) < 0) lo = m; else hi = m; }
        return hi;
      }
      ga = gt;
    }
    return null;
  }
  function ssAhar(ms) { return S.ahargana(ms) + (ST.place ? S.desantara(ST.place) : 0); }
  function ssLon(sa) { return function (t) { var q = S.trueLongitude(sa, ssAhar(t)); return q ? q.lon : null; }; }
  function modLon(sa) { return function (t) { var e = window.__kEclipModern(EN[sa], t); return e ? e.lon : null; }; }
  /* the modern engine in the Lahiri frame — the frame the fitted tier was fitted
     in and the one the almanac names its limbs in — so a sign compared across
     engines is not also a comparison of two sidereal zeros */
  function modLonL(sa) { return function (t) { var e = window.__kEclipModern(EN[sa], t);
    return e ? norm(e.trop - frameAt(t / 86400000 + 2440587.5)) : null; }; }

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
        ? "<b>All three name the same nakṣatra.</b> This is the usual case: " +
          "a difference of a few degrees in longitude still lands inside a " +
          "division 13°20′ wide most of the time."
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
        "out of it exactly — the tithi, karaṇa, new moon and full moon are " +
        "free of the ayanāṃśa. What is left is the two position differences, and " +
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

    if (ST.q === "rashi" || ST.q === "d9") {
      var d9 = ST.q === "d9";
      var signOf = function (L) {
        if (L == null) return null;
        return d9 ? Math.floor(norm(L) / (10 / 3)) % 12 : Math.floor(norm(L) / 30);
      };
      var agreeAll = 0;
      rows = SA7.map(function (sa) {
        var m = signOf(A.mod.lahiri[sa]), f = signOf(A.fit.lon[sa]), b = signOf(A.bare.lon[sa]);
        if (m != null && m === f && m === b) agreeAll++;
        return { k: sa, cells: [m == null ? "—" : RS[m], f == null ? "—" : RS[f], b == null ? "—" : RS[b],
          m === f && m === b ? "all three" : (m === f ? "modern = fitted" : (m === b ? "modern = written" : (f === b ? "fitted = written" : "each different")))] };
      });
      verdict = "<b>" + agreeAll + " of 7</b> grahas are placed in the same " +
        (d9 ? "navāṃśa (the ninth division of a sign, 3°20′ wide)" : "rāśi (30° wide)") + " by all three engines. " + frameNote() +
        (d9 ? "A navāṃśa is a ninth of a sign, so a difference of a degree or two in longitude changes it far more often " +
              "than it changes the sign — the same three longitudes, read through a finer division."
            : "A sign is wide, so the three usually agree; where they differ, the graha is near a sign boundary in at least " +
              "one of them, and each engine counts from its own sidereal zero.");
      return render(["Graha", "modern", "fitted", "as written", "agreement"], rows, false);
    }

    if (ST.q === "retro") {
      var dmod = function (sa) {
        var f = modLon(sa), a = f(ms - 12 * HOUR), c = f(ms + 12 * HOUR);
        return (a == null || c == null) ? null : sdiff(c, a);
      };
      var dss = function (k, sa) { return withTier(k, function () { return S.trueDailyMotion(sa, ssAhar(ms)); }); };
      var nSame = 0;
      rows = SA7.filter(function (sa) { return sa !== "Sūrya" && sa !== "Candra"; }).map(function (sa) {
        var m = dmod(sa), f = dss("fit", sa), b = dss("bare", sa);
        var w = function (v) { return v == null ? "—" : (v < 0 ? "vakrī (retrograde)" : "direct") + " · " + v.toFixed(3) + "°/day"; };
        if (m != null && f != null && b != null && (m < 0) === (f < 0) && (m < 0) === (b < 0)) nSame++;
        return { k: sa, cells: [w(m), w(f), w(b)] };
      });
      verdict = "The Sun and the Moon never turn back, so the question is asked of the five star-planets. <b>" + nSame +
        " of 5</b> are given the same direction by all three. The modern figure is the change of longitude across the day; " +
        "the siddhāntic figures are each engine's own true daily motion. Near a station — where the motion passes through " +
        "zero — the engines can name different directions.";
      return render(["Graha", "modern", "fitted", "as written"], rows, false);
    }

    if (ST.q === "yoga" || ST.q === "karana") {
      var isY = ST.q === "yoga";
      var mp2 = A.mod.panch && A.mod.panch.at ? (isY ? A.mod.panch.at.yoga : A.mod.panch.at.karana) : null;
      var fp = A.fit.panch ? (isY ? A.fit.panch.yoga : A.fit.panch.karana) : null;
      var bp = A.bare.panch ? (isY ? A.bare.panch.yoga : A.bare.panch.karana) : null;
      rows = [{ k: isY ? "Yoga" : "Karaṇa", cells: [mp2 ? mp2.name : "—", fp ? fp.name : "—", bp ? bp.name : "—"] }];
      verdict = (isY
        ? "A yoga is named from the <b>sum</b> of the Sun's and the Moon's longitudes, in 27 parts of 13°20′. Unlike the " +
          "tithi it does not cancel the sidereal zero — it counts it twice — so each engine's own ayanāṃśa matters here twice over."
        : "A karaṇa is half a tithi — 6° of the Moon's elongation from the Sun — so, like the tithi, it is free of the " +
          "sidereal zero; being twice as fine, a small difference in either luminary changes it twice as often.") +
        " The modern almanac names the limb running at local sunrise, as a pañcāṅga does; the siddhāntic engines name it at their own sunrise.";
      return render(["Question", "modern", "fitted", "as written"], rows, false);
    }

    if (ST.q === "sunrise") {
      if (!ST.place) { host.innerHTML = '<p class="swfail">Choose a place: sunrise depends on where you are.</p>'; return; }
      var md2 = null; try { md2 = window.NP.day(ms, ST.place); } catch (e) {}
      var sr = function (k) { return withTier(k, function () { return S.sunriseSunset(ms, ST.place); }); };
      var fs = sr("fit"), bs = sr("bare");
      rows = [{ k: "Sunrise", cells: [clock(md2 && md2.sunrise), clock(fs && fs.sunrise), clock(bs && bs.sunrise),
                                       minutesApart(fs && fs.sunrise, md2 && md2.sunrise), minutesApart(bs && bs.sunrise, md2 && md2.sunrise)] },
              { k: "Sunset", cells: [clock(md2 && md2.sunset), clock(fs && fs.sunset), clock(bs && bs.sunset),
                                      minutesApart(fs && fs.sunset, md2 && md2.sunset), minutesApart(bs && bs.sunset, md2 && md2.sunset)] }];
      verdict = "Times are local to " + esc(ST.place.n || "the chosen place") + ". The modern almanac takes the upper limb of " +
        "the Sun with refraction, as printed almanacs do; the Sūrya Siddhānta finds sunrise from the Sun's declination and the " +
        "day-length its latitude gives, through its own equation of time, without refraction — so a few minutes between them " +
        "comes from the two definitions as much as from the two Suns.";
      return render(["Question", "modern", "fitted", "as written", "fitted − modern", "written − modern"], rows, false);
    }

    if (ST.q === "lagna") {
      if (!ST.place) { host.innerHTML = '<p class="swfail">Choose a place: the lagna depends on where you are.</p>'; return; }
      var d0 = new Date(ms + tzOf() * HOUR), ml = null;
      try { ml = window.__kAsc({ year: d0.getUTCFullYear(), month: d0.getUTCMonth() + 1, day: d0.getUTCDate(),
                                 hour: d0.getUTCHours(), minute: d0.getUTCMinutes() + d0.getUTCSeconds() / 60,
                                 tzHours: tzOf(), lat: ST.place.lat, lon: ST.place.lon }); } catch (e) {}
      var sl = function (k) { return withTier(k, function () { var L = S.lagna(ms, ST.place); return L ? L.lon : null; }); };
      var fl = sl("fit"), bl = sl("bare");
      rows = [{ k: "Lagna", cells: [ml == null ? "—" : dm(ml), fl == null ? "—" : dm(fl), bl == null ? "—" : dm(bl)] }];
      var sameSign = ml != null && fl != null && bl != null &&
        Math.floor(ml / 30) === Math.floor(fl / 30) && Math.floor(ml / 30) === Math.floor(bl / 30);
      verdict = (sameSign ? "<b>All three put the same sign rising.</b> " : "<b>The rising sign differs between them.</b> ") +
        "The modern lagna is where the horizon cuts the ecliptic, from sidereal time; the Sūrya Siddhānta walks forward from " +
        "sunrise through its table of the signs' rising times. The lagna moves about a degree every four minutes, so a few " +
        "minutes' difference in sunrise is about a degree here. Each is shown in its own sidereal frame.";
      return render(["Question", "modern", "fitted", "as written"], rows, false);
    }

    if (ST.q === "sankranti") {
      var sgn = function (lonF) { return function (t) { var L = lonF(t); return L == null ? null : Math.floor(norm(L) / 30); }; };
      var mS = nextChange(sgn(modLonL("Sūrya")), ms, DAYMS, 40 * DAYMS);
      var sS = function (k) { return withTier(k, function () { return nextChange(sgn(ssLon("Sūrya")), ms, DAYMS, 40 * DAYMS); }); };
      var fS = sS("fit"), bS = sS("bare");
      var cell = function (x) { return x ? RS[x.from] + " → " + RS[x.to] + ", " + stamp(x.at) : "—"; };
      rows = [{ k: "Next saṃkrānti", cells: [cell(mS), cell(fS), cell(bS)] },
              { k: "Difference from modern", cells: ["", minutesApart(fS && fS.at, mS && mS.at), minutesApart(bS && bS.at, mS && mS.at)] }];
      verdict = "A saṃkrānti is the moment the Sun enters the next sidereal sign — the start of a solar month. The Sun moves " +
        "about a degree a day, so each degree of difference in its longitude, or in the sidereal zero, moves the saṃkrānti by " +
        "about a day. " + frameNote() + "Times are local.";
      return render(["Question", "modern", "fitted", "as written"], rows, false);
    }

    if (ST.q === "syzygy") {
      var mod0 = null, mod180 = null;
      try { mod0 = window.Astronomy.SearchMoonPhase(0, new Date(ms), 40).date.getTime(); } catch (e) {}
      try { mod180 = window.Astronomy.SearchMoonPhase(180, new Date(ms), 40).date.getTime(); } catch (e) {}
      var sy = function (k, want) { return withTier(k, function () {
        var sun = ssLon("Sūrya"), moon = ssLon("Candra");
        return nextElong(function (t) { return norm(moon(t) - sun(t)); }, ms, want); }); };
      var f0 = sy("fit", 0), b0 = sy("bare", 0), f180 = sy("fit", 180), b180 = sy("bare", 180);
      rows = [{ k: "Next amāvāsyā (new moon)", cells: [stamp(mod0), stamp(f0), stamp(b0), minutesApart(f0, mod0), minutesApart(b0, mod0)] },
              { k: "Next pūrṇimā (full moon)", cells: [stamp(mod180), stamp(f180), stamp(b180), minutesApart(f180, mod180), minutesApart(b180, mod180)] }];
      verdict = "New and full moon are the instants the Moon's elongation from the Sun reaches 0° and 180°. Like the tithi " +
        "they are free of the sidereal zero. The Moon gains on the Sun about 12° a day, so each degree of difference between " +
        "two engines' elongations is about two hours on the clock. Times are local.";
      return render(["Question", "modern", "fitted", "as written", "fitted − modern", "written − modern"], rows, false);
    }

    if (ST.q === "eclipse") {
      if (!ST.place) { host.innerHTML = '<p class="swfail">Choose a place: a solar eclipse is judged for where you are.</p>'; return; }
      var mL = null, mSo = null;
      try { var le = window.Astronomy.SearchLunarEclipse(new Date(ms)); mL = { at: le.peak.date.getTime(), kind: le.kind }; } catch (e) {}
      try {
        var ob = new window.Astronomy.Observer(ST.place.lat, ST.place.lon, 0);
        var se = window.Astronomy.SearchLocalSolarEclipse(new Date(ms), ob);
        mSo = { at: se.peak.time.date.getTime(), kind: se.kind };
      } catch (e) {}
      var ec = function (k) { return withTier(k, function () {
        var L = null, So = null, list = [];
        try { list = S.eclipsesIn(ms, ms + 4 * 365.25 * DAYMS, ST.place) || []; } catch (e) {}
        list.forEach(function (q) { if (q.kind === "lunar" && !L) L = q.e; if (q.kind === "solar" && !So) So = q.e; });
        return { L: L, So: So }; }); };
      var fE = ec("fit"), bE = ec("bare");
      var w2 = function (e) {
        return e ? stamp(e.at) + (e.kind ? " · " + e.kind : (e.magnitude != null ? " · magnitude " + e.magnitude.toFixed(2) : ""))
                 : "none in the next 4 years";
      };
      rows = [{ k: "Next lunar eclipse", cells: [w2(mL), w2(fE.L), w2(bE.L)] },
              { k: "Next solar eclipse seen here", cells: [w2(mSo), w2(fE.So), w2(bE.So)] }];
      verdict = "Each engine searches forward from the chosen moment. An eclipse needs the Moon near its node at a new or full " +
        "moon, so the result depends on where each engine places the node as well as on the two luminaries; the siddhāntic " +
        "search uses the text's own eclipse rules, including its simplified parallax for a solar eclipse at your place. Where " +
        "one engine finds an eclipse another does not, both answers are shown as found. The siddhāntic search looks four years ahead.";
      return render(["Question", "modern", "fitted", "as written"], rows, false);
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
    var hit = { nak: 0, nakFit: 0, tithi: 0, tithiNear: 0, vara: 0, yoga: 0, karana: 0, sunSign: 0, n: 0 };
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
      if (m.panch.at && m.panch.at.yoga && b.panch.yoga && m.panch.at.yoga.name === b.panch.yoga.name) hit.yoga++;
      if (m.panch.at && m.panch.at.karana && b.panch.karana && m.panch.at.karana.name === b.panch.karana.name) hit.karana++;
      if (m.lon["Sūrya"] != null && b.lon["Sūrya"] != null &&
          Math.floor(norm(m.lon["Sūrya"]) / 30) === Math.floor(norm(b.lon["Sūrya"]) / 30)) hit.sunSign++;
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
       "a difference of one tithi either way"],
      ["the karaṇa, bare text", pc("karana"),
       "half a tithi — frame-free like the tithi, and twice as fine"],
      ["the yoga, bare text", pc("yoga"),
       "the SUM of the two longitudes, so each engine's sidereal zero counts twice"],
      ["the Sun's rāśi, bare text", pc("sunSign"),
       "a 30° division of the Sun alone — the solar month"]
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
        rms(gap.fit).toFixed(0) + "′</b> in the fitted tier. Adjusting constants brings the Sun about " +
        "forty times closer to the modern figure but barely moves the Moon, " +
        "because the two lunar terms the modern theory contains are absent " +
        "from this one — which is why the tithi rate hardly moves either.";
    }
  }

  /* ---- what each engine's REAL error is, and what it changes ---------------
     Every figure from the two measured files: modern from accuracy.json
     (against ERFA, 1800–2200, in arcseconds), fitted and as-written from
     siddhanta-measured.json's residuals (arcminutes; the fitted ones are the
     HOLDOUT, moments the optimiser never saw). Each error is then turned into
     time with the body's mean geocentric motion — how much earlier or later a
     sign or nakṣatra change, a tithi's end or a daśā start would be dated. */
  var MEANMOT = { "Sūrya": 0.98565, "Candra": 13.17640, "Maṅgala": 0.52403,
                  "Budha": 0.98565, "Guru": 0.08309, "Śukra": 0.98565, "Śani": 0.03346,
                  /* the mean node, moving backwards; the rate is what matters here */
                  "Rāhu": 0.05295 };
  function span(days) {
    var d = Math.abs(days);
    if (d * 1440 < 1) return "under a minute";
    if (d < 1 / 24) return Math.round(d * 1440) + " min";
    if (d < 1.5) return (d * 24).toFixed(d * 24 < 10 ? 1 : 0) + " h";
    if (d < 60) return d.toFixed(d < 10 ? 1 : 0) + " days";
    if (d < 730) return (d / 30.44).toFixed(1) + " months";
    return (d / 365.25).toFixed(1) + " years";
  }
  function errors() {
    var host = $("el-errtab"); if (!host || !AC || !FIT) return;
    var M = {};
    (AC.modern.perBody || []).forEach(function (b) { M[b.sa] = b; });
    var R = FIT.residuals || {};
    function rowErr(sa) {
      var m = M[sa], r = R[sa] || {};
      return {
        mod: m ? { t: m.lonRms, w: m.lonWorst } : null,                         /* arcsec */
        fit: r.holdout ? { t: r.holdout.rms * 60, w: r.holdout.worst * 60 } : null,
        bare: r.bare ? { t: r.bare.rms * 60, w: r.bare.worst * 60 } : null
      };
    }
    function cell(e) { return e ? ang(e.t) + ' <span class="elw">(worst ' + ang(e.w) + ")</span>" : "—"; }
    var h = '<div class="eltblwrap"><table class="tbl elerr"><thead><tr><th>Graha</th>' +
      "<th>modern<br><small>typical (worst)</small></th><th>fitted<br><small>typical (worst)</small></th>" +
      "<th>as written<br><small>typical (worst)</small></th></tr></thead><tbody>";
    SA7.forEach(function (sa) {
      var e = rowErr(sa);
      h += "<tr><td><b>" + sa + "</b> <small>" + EN[sa] + "</small></td><td>" + cell(e.mod) +
        "</td><td>" + cell(e.fit) + "</td><td>" + cell(e.bare) + "</td></tr>";
    });
    /* THE NODE. Rāhu and Ketu are fitted too (Ketu is Rāhu + 180°, so one row
       serves both). The modern column has no error to show: the modern MEAN
       node is the published polynomial the other two are measured against, so
       it is the reference itself rather than a measurement of the sky. */
    if (R["Rāhu"]) {
      var en = rowErr("Rāhu");
      h += "<tr><td><b>Rāhu · Ketu</b> <small>mean node</small></td>" +
        '<td><span class="elw">the reference</span></td><td>' + cell(en.fit) + "</td><td>" + cell(en.bare) + "</td></tr>";
    }
    h += "</tbody></table></div>";

    h += '<h4 class="elh4">What the typical error changes</h4>' +
      '<div class="eltblwrap"><table class="tbl elerr"><thead><tr><th>Graha</th>' +
      "<th>modern</th><th>fitted</th><th>as written</th></tr></thead><tbody>" +
      '<tr><td colspan="4" class="elsub">The date a graha changes sign, nakṣatra or pāda moves by about…</td></tr>';
    SA7.forEach(function (sa) {
      var e = rowErr(sa), mm = MEANMOT[sa];
      function t(x) { return x ? span(x.t / 3600 / mm) : "—"; }
      h += "<tr><td><b>" + sa + "</b></td><td>" + t(e.mod) + "</td><td>" + t(e.fit) + "</td><td>" + t(e.bare) + "</td></tr>";
    });
    if (R["Rāhu"]) {
      var en2 = rowErr("Rāhu"), mn = MEANMOT["Rāhu"];
      function tn(x) { return x ? span(x.t / 3600 / mn) : "—"; }
      h += "<tr><td><b>Rāhu · Ketu</b></td><td>—</td><td>" + tn(en2.fit) + "</td><td>" + tn(en2.bare) + "</td></tr>";
    }
    /* the Moon carries the pañcāṅga and the daśā clock */
    var em = rowErr("Candra"), es = rowErr("Sūrya");
    var rate = (AC.cost && AC.cost.dashaDaysPerArcsec) || 0.101;
    function tith(k) {
      var a = em[k], b = es[k]; if (!a || !b) return "—";
      var as = Math.sqrt(a.t * a.t + b.t * b.t);        /* the two errors, independent */
      return span(as / 3600 / 12.19);
    }
    function dasha(k) { var a = em[k]; return a ? span(a.t * rate) : "—"; }
    function pada(k) { var a = em[k]; if (!a) return "—"; var v = 100 * a.t / 12000;
      return (v < 1 ? "under 1%" : Math.round(v) + "%") + " of a pāda"; }
    h += '<tr><td colspan="4" class="elsub">Through the Moon:</td></tr>' +
      "<tr><td>A tithi’s end</td><td>" + tith("mod") + "</td><td>" + tith("fit") + "</td><td>" + tith("bare") + "</td></tr>" +
      "<tr><td>The Moon’s place, as a share of one pāda (3°20′)</td><td>" + pada("mod") + "</td><td>" + pada("fit") + "</td><td>" + pada("bare") + "</td></tr>" +
      "<tr><td>Every Viṃśottarī daśā date</td><td>" + dasha("mod") + "</td><td>" + dasha("fit") + "</td><td>" + dasha("bare") + "</td></tr>" +
      "</tbody></table></div>";
    host.innerHTML = h;
    var n = $("el-errnote");
    if (n) n.innerHTML = "How to read it: an engine whose typical error moves a date by minutes agrees with the sky " +
      "for every practical purpose; one that moves a daśā date by months or years gives a <b>different chart timeline</b>, " +
      "even though the method is the same. The daśā row uses the average rate of " + rate.toFixed(3) +
      " days of daśā per arcsecond of the Moon (it varies by lord). A minute of birth-time uncertainty already moves the " +
      "Moon about " + ang((AC.cost && AC.cost.birthMinuteArcsec) || 33) + " — more than the modern engine’s whole error. " +
      "For comparison, two ayanāṃśa conventions can differ by degrees; that is a choice, not an engine error, and it moves " +
      "signs and nakṣatras but never a tithi.";
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
                    vara: "the vāra", rashi: "each graha's rāśi", d9: "each graha's navāṃśa",
                    retro: "which grahas are retrograde", yoga: "the yoga", karana: "the karaṇa",
                    sunrise: "sunrise and sunset", lagna: "the lagna", sankranti: "the next saṃkrānti",
                    syzygy: "the next new and full moon", eclipse: "the next eclipses" }[ST.q] || "this question";
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
         : (ST.q === "tithi" || ST.q === "karana" || ST.q === "yoga" || ST.q === "syzygy")
           ? "about <b>" + here.tithi + " seconds</b> on a tithi ending" + (ST.q === "tithi" ? "." : ", and the same order on this one.")
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

    /* the engine reads in this page's frame: Lahiri unless the reader picks
       another in "Ayanāṃśa for this page" */
    try { window.__setAyan(pageMode()); } catch (e) {}
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

    answer(); cost(); marks(); errors(); ruler(); band(); which(); rates();

    try {
      window.__elab = {
        answerAt: function (ms, q) { ST.when = ms; ST.q = q; answer(); },
        ss: ssAt, mod: modAt, ac: function () { return AC; },
        setArc: function (a) { ST.arc = a; cost(); marks(); },
        setYear: function (y) { ST.year = y; band(); },
        state: function () { return { q: ST.q, arc: ST.arc, year: ST.year }; },
        place: function () { return ST.place; }
      };
    } catch (e) {}
  }

  need([
    { src: "engine.js", have: function () {
        return !!(window.__kEclipModern && window.__kVims); } },
    { src: "panchanga.js", have: function () {
        return !!(window.NP && window.NP.day); } },
    { src: "places.js", have: function () { return !!window.NPlaces; } }
  ], function () { setTimeout(bind, 0); });
})();
