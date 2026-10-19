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
     ["Ahargaṇa now", Math.floor(S.ahargana(WHEN)).toLocaleString("en") + " days"]
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
        params(); now(); working();
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
    params(); now(); working(); drift();
    window.addEventListener("resize", function () { drift(); });
    try {
      window.__ss = { when: function () { return WHEN; },
                      redraw: function () { params(); now(); working(); drift(); },
                      setWhen: function (t) { WHEN = t; this.redraw(); } };
    } catch (e) {}
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
