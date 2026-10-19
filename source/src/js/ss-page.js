/* ===== The Sūrya Siddhānta page ===========================================

   Everything on this page is generated from the engine rather than written
   out, which is deliberate: a table of parameters typed into HTML is a table
   that can disagree with the code computing from it, and the disagreement
   would be invisible. These are the numbers the engine is actually using, at
   the moment you are reading them.

   The drift chart is the point of the page. A sentence saying a classical
   siddhānta differs from a modern ephemeris is a fact to be taken on trust;
   a line climbing steadily across fifteen centuries, with the year length
   that causes it printed beside it, is a thing a reader can check. */

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  var SA = ["Sūrya", "Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani",
            "Rāhu", "Ketu"];
  var EN = { "Sūrya": "Sun", "Candra": "Moon", "Maṅgala": "Mars",
             "Budha": "Mercury", "Guru": "Jupiter", "Śukra": "Venus",
             "Śani": "Saturn" };
  var RS = ["Meṣa", "Vṛṣabha", "Mithuna", "Karka", "Siṃha", "Kanyā", "Tulā",
            "Vṛścika", "Dhanus", "Makara", "Kumbha", "Mīna"];
  function norm(x) { return ((x % 360) + 360) % 360; }
  function sdiff(a, b) { var d = norm(a - b); return d > 180 ? d - 360 : d; }
  function dms(d) {
    var x = norm(d), s = Math.floor(x / 30), r = x - s * 30;
    var deg = Math.floor(r), m = Math.round((r - deg) * 60);
    if (m === 60) { m = 0; deg++; }
    return deg + "° " + String(m).padStart(2, "0") + "′  " + RS[s];
  }
  function modern(sa, ms) {
    if (!EN[sa]) return null;
    try { return window.__kSidAt(EN[sa], new Date(ms)); } catch (e) { return null; }
  }

  var WHEN = Date.now();

  /* ---- the parameters ----------------------------------------------------- */
  function params() {
    var S = window.SSEngine, host = $("ss-params");
    if (!host) return;
    host.innerHTML = "";
    var K = S.constants();

    var t = el("table", "tbl");
    var th = el("thead"), hr = el("tr");
    ["", "Revolutions in a Mahāyuga", "Manda epicycle", "Śīghra epicycle",
     "Mandocca"].forEach(function (h) { hr.appendChild(el("th", null, h)); });
    th.appendChild(hr); t.appendChild(th);
    var tb = el("tbody");
    ["Sūrya", "Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani"]
      .forEach(function (sa) {
        var r = el("tr");
        r.appendChild(el("td", null, sa));
        var rev = S.YUGA.rev[sa];
        r.appendChild(el("td", "num", rev == null ? "—" : rev.toLocaleString("en")));
        var E = S.EPI[sa] || {};
        r.appendChild(el("td", "num", E.manda
          ? E.manda[0].toFixed(2) + "° / " + E.manda[1].toFixed(2) + "°" : "—"));
        r.appendChild(el("td", "num", E.sighra
          ? E.sighra[0] + "° / " + E.sighra[1] + "°" : "—"));
        r.appendChild(el("td", "num", S.MANDOCCA[sa] != null
          ? S.MANDOCCA[sa].toFixed(2) + "°" : "moves"));
        tb.appendChild(r);
      });
    [["Moon's apogee", S.YUGA.rev["candraUcca"]],
     ["Rāhu (backwards)", S.YUGA.rev["Rāhu"]]].forEach(function (q) {
      var r2 = el("tr");
      r2.appendChild(el("td", null, q[0]));
      r2.appendChild(el("td", "num", q[1].toLocaleString("en")));
      r2.appendChild(el("td", "num", "—"));
      r2.appendChild(el("td", "num", "—"));
      r2.appendChild(el("td", "num", "—"));
      tb.appendChild(r2);
    });
    t.appendChild(tb);
    host.appendChild(t);

    var ul = el("ul", "sslist");
    [["Civil days in a Mahāyuga", S.YUGA.civilDays.toLocaleString("en")],
     ["Years in a Mahāyuga", S.YUGA.years.toLocaleString("en")],
     ["Sidereal year implied", K.sidYearDays.toFixed(7) + " days — " +
        K.yearExcessSeconds.toFixed(1) + " s a year longer than the modern value"],
     ["Synodic month implied", K.synodicMonthDays.toFixed(7) + " days — out by " +
        Math.abs((K.synodicMonthDays - 29.5305889) * 86400).toFixed(2) + " s"],
     ["Sidereal month implied", K.sidMonthDays.toFixed(7) + " days — out by " +
        Math.abs((K.sidMonthDays - 27.321661547) * 86400).toFixed(2) + " s"],
     ["Epoch", "Kaliyuga, on the meridian of Ujjain (" +
        S.UJJAIN_LON.toFixed(2) + "° E), reckoned from mean sunrise"],
     ["Ahargaṇa now", Math.floor(S.ahargana(WHEN)).toLocaleString("en") + " days"],
     ["Radius of the sine table", S.RAD + " — the minutes of arc in a radian, " +
        "which is why that number and not another"],
     ["Obliquity", S.OBLIQUITY + "°, against a modern 23.44° and shrinking"],
     ["Ayanāṃśa now", S.ayanamsa(WHEN).toFixed(3) + "° by the " +
        S.OPT.ayana + " reading"],
     ["Anomalistic month", S.constants().anomalisticMonthDays.toFixed(6) +
        " days — out by " +
        Math.abs((S.constants().anomalisticMonthDays - 27.554549878) * 86400)
          .toFixed(2) + " s"],
     ["Draconitic month", S.constants().draconiticMonthDays.toFixed(6) +
        " days — out by " +
        Math.abs((S.constants().draconiticMonthDays - 27.212220817) * 86400)
          .toFixed(2) + " s"],
     ["An intercalary month", "every " +
        S.constants().adhikaMasaYears.toFixed(3) + " years, which follows from " +
        "the year holding " + S.constants().monthsPerYear.toFixed(6) +
        " lunar months"],
     ["Elapsed Kali", S.era(WHEN).kaliElapsed.toLocaleString("en") + " years"]
    ].forEach(function (q) {
      var li = el("li");
      li.appendChild(el("b", null, q[0] + ": "));
      li.appendChild(document.createTextNode(q[1]));
      ul.appendChild(li);
    });
    host.appendChild(ul);
  }

  /* ---- the two skies, now -------------------------------------------------- */
  function now() {
    var S = window.SSEngine, host = $("ss-now");
    if (!host) return;
    host.innerHTML = "";
    var P = S.positions(WHEN);
    var t = el("table", "tbl");
    var th = el("thead"), hr = el("tr");
    ["Graha", "Sūrya Siddhānta", "Modern", "Difference", "Daily motion"]
      .forEach(function (h) { hr.appendChild(el("th", null, h)); });
    th.appendChild(hr); t.appendChild(th);
    var tb = el("tbody");
    SA.forEach(function (sa) {
      var q = P.grahas[sa];
      if (!q) return;
      var m = modern(sa, WHEN);
      var r = el("tr");
      r.appendChild(el("td", null, sa));
      r.appendChild(el("td", "num", dms(q.lon)));
      r.appendChild(el("td", "num", m == null ? "—" : dms(m)));
      var d = m == null ? null : sdiff(q.lon, m);
      var c = el("td", "num", d == null ? "—" :
        (d > 0 ? "+" : "") + d.toFixed(2) + "°");
      if (d != null && Math.abs(d) > 4) c.className = "num warn";
      r.appendChild(c);
      var sp = S.motion(sa, WHEN);
      r.appendChild(el("td", "num", sp == null ? "—" :
        sp.toFixed(3) + "°" + (sp < 0 ? "  vakrī" : "")));
      tb.appendChild(r);
    });
    t.appendChild(tb);
    host.appendChild(t);
    host.appendChild(el("p", "ssnote",
      "The modern column is this site's own ephemeris, sidereal, with the " +
      "same ayanāṃśa the rest of the site uses. The difference is not an " +
      "error in either: it is the distance between a fifth-century theory " +
      "and a modern one, and it is what this page exists to show."));
  }

  /* ---- the working, for one graha ------------------------------------------ */
  function working() {
    var S = window.SSEngine, host = $("ss-working"), pick = $("ss-pick");
    if (!host || !pick) return;
    var sa = pick.value;
    host.innerHTML = "";
    var q = S.trueLongitude(sa, S.ahargana(WHEN));
    if (!q) { host.appendChild(el("p", "ssnote", "—")); return; }
    var rows = [["Mean longitude", norm(q.mean).toFixed(4) + "°",
                 "revolutions × 360 × ahargaṇa ÷ civil days"]];
    if (q.ucca != null)
      rows.push(["Apogee (mandocca)", norm(q.ucca).toFixed(4) + "°",
                 "its own revolution count — the Moon's apogee moves"]);
    else if (q.mandocca != null)
      rows.push(["Apogee (mandocca)", q.mandocca.toFixed(4) + "°", "held fixed"]);
    if (q.sighrocca != null)
      rows.push(["Śīghrocca", norm(q.sighrocca).toFixed(4) + "°",
                 (sa === "Budha" || sa === "Śukra")
                   ? "its own revolution count — for the inner grahas it is " +
                     "the mean place that is the Sun's"
                   : "the Sun's mean place"]);
    rows.push(["Manda correction", (q.manda >= 0 ? "+" : "") + q.manda.toFixed(4) + "°",
               "the equation of centre"]);
    if (q.sighra)
      rows.push(["Śīghra correction", (q.sighra >= 0 ? "+" : "") +
                 q.sighra.toFixed(4) + "°",
                 "the correction that makes a graha appear to stop and reverse"]);
    rows.push(["True longitude", norm(q.lon).toFixed(4) + "°   " + dms(q.lon),
               q.sighra ? "after all four steps" : "after the one correction"]);
    var m = modern(sa, WHEN);
    if (m != null)
      rows.push(["Modern, for comparison", dms(m),
                 (sdiff(q.lon, m) >= 0 ? "+" : "") + sdiff(q.lon, m).toFixed(3) +
                 "° apart"]);
    var t = el("table", "tbl");
    var tb = el("tbody");
    rows.forEach(function (r) {
      var tr = el("tr");
      tr.appendChild(el("td", null, r[0]));
      tr.appendChild(el("td", "num", r[1]));
      tr.appendChild(el("td", "muted", r[2]));
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    host.appendChild(t);
  }


  /* ---- the day --------------------------------------------------------- */
  var PLACE = { n: "Delhi", lat: 28.6139, lon: 77.209, tz: 5.5 };
  function hm(ms) {
    var d = new Date(ms + PLACE.tz * 3600000);
    return String(d.getUTCHours()).padStart(2, "0") + ":" +
           String(d.getUTCMinutes()).padStart(2, "0");
  }
  function dayPanel() {
    var S = window.SSEngine, host = $("ss-day");
    if (!host) return;
    host.innerHTML = "";
    var D = S.sunriseSunset(WHEN, PLACE);
    if (!D) return;
    var mo = null;
    try { mo = window.NP ? window.NP.day(WHEN, PLACE) : null; } catch (e) {}
    var rows = [
      ["Sunrise", hm(D.sunrise), mo ? "a modern ephemeris: " + hm(mo.sunrise) +
        "  ·  " + ((D.sunrise - mo.sunrise) / 60000).toFixed(1) + " min apart" : ""],
      ["Sunset", hm(D.sunset), mo ? "a modern ephemeris: " + hm(mo.sunset) : ""],
      ["Length of the day", D.dayHours.toFixed(4) + " h",
        "twelve hours plus twice the cara"],
      ["Declination of the Sun", D.declination.toFixed(4) + "°",
        "of the sāyana longitude, at an obliquity of " + S.OBLIQUITY + "°"],
      ["Cara", D.cara.toFixed(4) + "°",
        "the ascensional difference — what makes a summer day long"],
      ["Bhujāntara", D.bhujantaraMinutes.toFixed(2) + " min",
        "the Sun's own equation of centre, as time"],
      ["Udayāntara", D.udayantaraMinutes.toFixed(2) + " min",
        "the obliquity's share of the equation of time"],
      ["Equation of time", D.equationOfTimeMinutes.toFixed(2) + " min",
        "the two together"]
    ];
    var L = S.lagna(WHEN, PLACE);
    if (L) rows.push(["Lagna rising", dms(L.lon),
      "walked out of the oblique ascensions; sāyana " + dms(L.tropical)]);
    host.appendChild(table3(rows));
    host.appendChild(el("p", "ssnote",
      "Computed for " + PLACE.n + ". The place matters: the deśāntara shifts " +
      "every mean place by the longitude's share of a day, and the cara is a " +
      "function of the latitude."));
  }
  function table3(rows) {
    var t = el("table", "tbl"), tb = el("tbody");
    rows.forEach(function (r) {
      var tr = el("tr");
      tr.appendChild(el("td", null, r[0]));
      tr.appendChild(el("td", "num", r[1]));
      tr.appendChild(el("td", "muted", r[2] || ""));
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    return t;
  }

  /* ---- the pañcāṅga ---------------------------------------------------- */
  function panchangaPanel() {
    var S = window.SSEngine, host = $("ss-panchanga");
    if (!host) return;
    host.innerHTML = "";
    var p = S.panchanga(WHEN, PLACE);
    var m = null;
    try { m = window.NP ? window.NP.day(WHEN, PLACE) : null; } catch (e) {}
    var modT = m ? m.at.tithi.n + (m.at.tithi.paksha === "kṛṣṇa" ? 15 : 0) : null;
    host.appendChild(table3([
      ["Vāra", p.vara.name + " — " + p.vara.english,
        "from the ahargaṇa alone: " + Math.floor(p.ahargana).toLocaleString("en") +
        " days since the epoch, modulo seven"],
      ["Tithi", p.tithi.paksha + " " + p.tithi.name + "  (" + p.tithi.n + " of 30)",
        modT ? "a modern pañcāṅga: " + modT +
          (modT === p.tithi.n ? " — the same" : " — one apart") : ""],
      ["Nakṣatra", p.nakshatra.name + ", pāda " + p.nakshatra.pada,
        m ? "a modern pañcāṅga: " + m.at.nak.name : ""],
      ["Yoga", p.yoga.name + "  (" + p.yoga.n + ")",
        m && m.at.yoga ? "a modern pañcāṅga: " + m.at.yoga.name : ""],
      ["Karaṇa", p.karana.name, "the half-tithi"],
      ["Sun", dms(p.sun), "Sūrya Siddhānta"],
      ["Moon", dms(p.moon), "Sūrya Siddhānta"]
    ]));
  }

  /* ---- eclipses --------------------------------------------------------- */
  function eclipsePanel() {
    var S = window.SSEngine, host = $("ss-eclipses");
    if (!host) return;
    host.innerHTML = "";
    var from = +($("ss-efrom") || { value: 2024 }).value;
    var to = +($("ss-eto") || { value: 2032 }).value;
    if (!(to > from)) return;
    if (to - from > 60) to = from + 60;
    var list;
    try { list = S.eclipsesIn(Date.UTC(from, 0, 1), Date.UTC(to, 0, 1), PLACE); }
    catch (e) { return; }
    if (!list.length) {
      host.appendChild(el("p", "ssnote", "None found in that span."));
      return;
    }
    var t = el("table", "tbl");
    var th = el("thead"), hr = el("tr");
    ["Kind", "When", "Magnitude", "Moon's latitude", "Half-duration"]
      .forEach(function (h) { hr.appendChild(el("th", null, h)); });
    th.appendChild(hr); t.appendChild(th);
    var tb = el("tbody");
    list.forEach(function (q) {
      var e = q.e, tr = el("tr");
      tr.appendChild(el("td", null, q.kind === "lunar" ? "Lunar" : "Solar"));
      tr.appendChild(el("td", "num",
        new Date(e.at + PLACE.tz * 3600000).toISOString().slice(0, 16).replace("T", "  ")));
      tr.appendChild(el("td", "num", e.magnitude.toFixed(2) +
        (e.total ? "  total" : (e.annular ? "  annular" : ""))));
      tr.appendChild(el("td", "num", e.latitude.toFixed(3) + "°"));
      tr.appendChild(el("td", "num", e.halfDurationHours != null
        ? (e.halfDurationHours * 60).toFixed(0) + " min" : "—"));
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    host.appendChild(t);
    host.appendChild(el("p", "ssnote",
      list.length + " in " + (to - from) + " years. It finds the deep ones " +
      "reliably and misses some of the slight ones, and the reason is its " +
      "node: the draconitic month is right to about two seconds, but two " +
      "seconds carried across the circuits the node has made since the epoch " +
      "puts it a few degrees from the truth — and an eclipse season sits " +
      "where the node says it does. Solar eclipses are judged for " + PLACE.n +
      ", because parallax makes a solar eclipse a question about where you " +
      "are standing."));
  }

  /* ---- the trigonometry -------------------------------------------------- */
  function trigPanel() {
    var S = window.SSEngine, host = $("ss-trig");
    if (!host) return;
    host.innerHTML = "";
    var keep = S.OPT.sines;
    S.options({ sines: "exact" });
    var ex = S.positions(WHEN).grahas;
    S.options({ sines: "table" });
    var tb = S.positions(WHEN).grahas;
    S.options({ sines: keep });
    var rows = [];
    S.SA.forEach(function (sa) {
      if (!ex[sa] || !tb[sa]) return;
      var d = S.norm(tb[sa].lon - ex[sa].lon);
      if (d > 180) d -= 360;
      rows.push([sa, (d * 60).toFixed(2) + "′",
                 "table " + tb[sa].lon.toFixed(4) + "°, exact " +
                 ex[sa].lon.toFixed(4) + "°"]);
    });
    host.appendChild(el("p", "ssnote",
      "What the table costs, at this moment, in minutes of arc:"));
    host.appendChild(table3(rows));
    /* the table itself */
    var t = el("table", "tbl");
    var th = el("thead"), hr = el("tr");
    ["Arc", "Jyā", "The sine function", "Out by"].forEach(function (h) {
      hr.appendChild(el("th", null, h)); });
    th.appendChild(hr); t.appendChild(th);
    var tbody = el("tbody");
    S.JYA.forEach(function (v, i) {
      var arc = i * 3.75;
      var exact = S.RAD * Math.sin(arc * Math.PI / 180);
      var tr = el("tr");
      tr.appendChild(el("td", "num", arc.toFixed(2) + "°"));
      tr.appendChild(el("td", "num", String(v)));
      tr.appendChild(el("td", "num", exact.toFixed(2)));
      tr.appendChild(el("td", "num", (v - exact).toFixed(2)));
      tbody.appendChild(tr);
    });
    t.appendChild(tbody);
    host.appendChild(t);
  }

  /* ---- what is absent ---------------------------------------------------- */
  function absentPanel() {
    var S = window.SSEngine, host = $("ss-absent");
    if (!host) return;
    host.innerHTML = "";
    S.ABSENT.forEach(function (q) {
      var li = el("li");
      li.appendChild(el("b", null, q.what + " — "));
      li.appendChild(document.createTextNode(q.why));
      host.appendChild(li);
    });
  }

  /* ---- the drift ----------------------------------------------------------- */
  function drift() {
    var S = window.SSEngine, cv = $("ss-drift");
    if (!cv) return;
    var from = +($("ss-from") || { value: 500 }).value;
    var to = +($("ss-to") || { value: 2100 }).value;
    if (!(to > from)) return;
    var which = ($("ss-body") || { value: "Sūrya" }).value;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = cv.clientWidth || 700, h = 300;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    var c = cv.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);

    /* EVERY SAMPLE AT THE SAME POINT IN THE YEAR.

       Sampling at evenly spaced instants put each one at a different season,
       and the difference between the two theories has an annual term of about
       a degree — so the plotted line came out as a saw with teeth a degree
       deep, which is not a property of the drift at all but of where the
       samples happened to land. Snapping each one to the first of January
       removes the aliasing and leaves the thing being asked about: the slow
       part. The remaining wobble on the Moon's line is real, because the
       Moon's unmodelled terms do not have a yearly period. */
    var N = 220, pts = [];
    for (var i = 0; i <= N; i++) {
      var y = Math.round(from + (to - from) * (i / N));
      var ms = Date.UTC(y, 0, 1);
      if (pts.length && pts[pts.length - 1].y === y) continue;
      var q = S.trueLongitude(which, S.ahargana(ms));
      var mo = modern(which, ms);
      if (!q || mo == null) continue;
      pts.push({ y: y, d: sdiff(q.lon, mo) });
    }
    if (pts.length < 2) return;
    var lo = Math.min.apply(null, pts.map(function (p) { return p.d; }));
    var hi = Math.max.apply(null, pts.map(function (p) { return p.d; }));
    var pad = Math.max(1, (hi - lo) * 0.15);
    lo -= pad; hi += pad;
    var L = 54, R = 12, Tp = 14, B = 30;
    function X(y) { return L + (w - L - R) * (y - from) / (to - from); }
    function Y(d) { return Tp + (h - Tp - B) * (1 - (d - lo) / (hi - lo)); }

    /* the zero line, which is the thing the curve is measured against */
    c.strokeStyle = "#c9c9d8"; c.lineWidth = 1;
    c.beginPath(); c.moveTo(L, Y(0)); c.lineTo(w - R, Y(0)); c.stroke();
    c.fillStyle = "#6c7089";
    c.font = "11px system-ui,-apple-system,sans-serif";
    c.textAlign = "right"; c.textBaseline = "middle";
    [lo + pad, 0, hi - pad].forEach(function (v) {
      c.fillText(v.toFixed(1) + "°", L - 6, Y(v));
      c.strokeStyle = "#eceaf2";
      c.beginPath(); c.moveTo(L, Y(v)); c.lineTo(w - R, Y(v)); c.stroke();
    });
    c.textAlign = "center"; c.textBaseline = "top";
    for (var k = 0; k <= 4; k++) {
      var yy = from + (to - from) * k / 4;
      c.fillText(Math.round(yy), X(yy), h - B + 6);
    }
    c.strokeStyle = "#c9a24b"; c.lineWidth = 2;
    c.beginPath();
    pts.forEach(function (p, i2) {
      if (i2) c.lineTo(X(p.y), Y(p.d)); else c.moveTo(X(p.y), Y(p.d));
    });
    c.stroke();
    /* where we are now */
    var nowY = new Date().getUTCFullYear();
    if (nowY > from && nowY < to) {
      c.strokeStyle = "#b5533c"; c.setLineDash([4, 4]);
      c.beginPath(); c.moveTo(X(nowY), Tp); c.lineTo(X(nowY), h - B); c.stroke();
      c.setLineDash([]);
      c.fillStyle = "#b5533c"; c.textAlign = "left";
      c.fillText("now", X(nowY) + 4, Tp + 2);
    }
    var note = $("ss-driftnote");
    if (note) {
      var first = pts[0], last = pts[pts.length - 1];
      note.textContent = which + ": " +
        first.d.toFixed(2) + "° in " + Math.round(first.y) + ", " +
        last.d.toFixed(2) + "° in " + Math.round(last.y) +
        "  ·  a change of " + (last.d - first.d).toFixed(2) + "° over " +
        Math.round(last.y - first.y) + " years" +
        (which === "Sūrya"
          ? "  ·  which is what a year " +
            S.constants().yearExcessSeconds.toFixed(0) +
            " seconds too long does over that time"
          : "");
    }
  }

  function redraw() {
    params(); now(); working(); trigPanel(); dayPanel(); panchangaPanel();
    eclipsePanel(); absentPanel(); drift();
  }

  /* ---- wiring --------------------------------------------------------------- */
  function bind() {
    if (!window.SSEngine || !$("ss-params")) return;
    var when = $("ss-when");
    if (when) {
      var d = new Date(WHEN - new Date().getTimezoneOffset() * 60000);
      when.value = d.toISOString().slice(0, 16);
      when.addEventListener("change", function () {
        var t = Date.parse(when.value);
        WHEN = isFinite(t) ? t : Date.now();
        redraw();
      });
    }
    var pick = $("ss-pick");
    if (pick) {
      ["Sūrya", "Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani"]
        .forEach(function (sa) {
          var o = el("option", null, sa); o.value = sa;
          if (sa === "Śani") o.selected = true;
          pick.appendChild(o);
        });
      pick.addEventListener("change", working);
    }
    var body = $("ss-body");
    if (body) {
      ["Sūrya", "Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani"]
        .forEach(function (sa) {
          var o = el("option", null, sa); o.value = sa;
          body.appendChild(o);
        });
      body.addEventListener("change", drift);
    }
    ["ss-from", "ss-to"].forEach(function (id) {
      var e = $(id);
      if (e) e.addEventListener("change", drift);
    });
    var si = $("ss-sines");
    if (si) si.addEventListener("change", function () {
      window.SSEngine.options({ sines: si.value }); redraw(); });
    var ay = $("ss-ayana");
    if (ay) ay.addEventListener("change", function () {
      window.SSEngine.options({ ayana: ay.value }); redraw(); });
    ["ss-efrom", "ss-eto"].forEach(function (id) {
      var e = $(id);
      if (e) e.addEventListener("change", eclipsePanel);
    });
    redraw();
    window.addEventListener("resize", function () { drift(); });
    try {
      window.__ss = { when: function () { return WHEN; }, redraw: redraw,
                      setWhen: function (t) { WHEN = t; redraw(); },
                      place: function () { return PLACE; } };
    } catch (e) {}
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
