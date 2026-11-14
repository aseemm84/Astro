/* kalasetu.html — the fourth engine's own page.
 *
 * Everything drawn here is computed live from window.KalasetuEngine and its
 * fitted numbers (window.__KALASETU_DATA, inlined with engine.js), against the
 * modern engine through the site engine's __kEclipModern and __kNodesModern —
 * which are modern whatever engine Settings has chosen. The fitted Sūrya
 * Siddhānta tier used in "Measure it yourself" is this page's OWN copy of
 * ss-engine.js (concatenated ahead of this file by build.py), so switching its
 * tier cannot move the site engine.
 */
(function () {
  "use strict";
  if (!document.getElementById("ks-skytab")) return;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function norm(x) { return ((x % 360) + 360) % 360; }
  function sdiff(a, b) { var d = norm(a - b); return d > 180 ? d - 360 : d; }
  function am(x) { if (x == null || !isFinite(x)) return "—"; var a = Math.abs(x);
    return (a < 1 ? x.toFixed(2) : a < 10 ? x.toFixed(1) : x.toFixed(0)) + "′"; }
  function dms(L) { L = norm(L); var d = Math.floor(L), m = (L - d) * 60, mi = Math.floor(m), s = Math.round((m - mi) * 60);
    if (s === 60) { s = 0; mi++; } if (mi === 60) { mi = 0; d++; }
    return d + "°" + String(mi).padStart(2, "0") + "′" + String(s).padStart(2, "0") + "″"; }
  function inSign(L) { L = norm(L); var s = Math.floor(L / 30), x = L - 30 * s, d = Math.floor(x), m = Math.round((x - d) * 60);
    if (m === 60) { m = 0; d++; } return RS[s] + " " + d + "°" + String(m).padStart(2, "0") + "′"; }
  function yearLabel(y) { return y <= 0 ? (1 - y) + " BCE" : y + " CE"; }
  function msFor(y, mo, d, h, mi) { var t = new Date(Date.UTC(2000, mo - 1, d, h, mi)); t.setUTCFullYear(y); return t.getTime(); }
  function jdOf(ms) { return ms / 86400000 + 2440587.5; }

  var RS = ["Meṣa", "Vṛṣabha", "Mithuna", "Karka", "Siṃha", "Kanyā", "Tulā", "Vṛścika", "Dhanus", "Makara", "Kumbha", "Mīna"];
  var NAK = ["Aśvinī", "Bharaṇī", "Kṛttikā", "Rohiṇī", "Mṛgaśira", "Ārdrā", "Punarvasu", "Puṣya", "Āśleṣā", "Maghā",
    "Pūrva Phalgunī", "Uttara Phalgunī", "Hasta", "Citrā", "Svātī", "Viśākhā", "Anurādhā", "Jyeṣṭhā", "Mūla",
    "Pūrva Āṣāḍhā", "Uttara Āṣāḍhā", "Śravaṇa", "Dhaniṣṭhā", "Śatabhiṣā", "Pūrva Bhādrapadā", "Uttara Bhādrapadā", "Revatī"];
  function nakOf(L) { L = norm(L); var i = Math.floor(L / (40 / 3)); return NAK[i] + " " + (Math.floor((L % (40 / 3)) / (10 / 3)) + 1); }
  var G = [["Sūrya", "Sun", "Su"], ["Candra", "Moon", "Mo"], ["Maṅgala", "Mars", "Ma"], ["Budha", "Mercury", "Me"],
           ["Guru", "Jupiter", "Ju"], ["Śukra", "Venus", "Ve"], ["Śani", "Saturn", "Sa"], ["Rāhu", "Rahu", "Ra"], ["Ketu", "Ketu", "Ke"]];
  var COL = { "Sūrya": "#d08a1e", "Candra": "#8a93a8", "Maṅgala": "#c0392b", "Budha": "#2e8b57", "Guru": "#c9a24b",
              "Śukra": "#c47ab0", "Śani": "#3f6fa6", "Rāhu": "#5a5e78", "Ketu": "#8a6a1f" };
  var MEANMOT = { "Sūrya": 0.98565, "Candra": 13.17640, "Maṅgala": 0.52403, "Budha": 0.98565, "Guru": 0.08309,
                  "Śukra": 0.98565, "Śani": 0.03346, "Rāhu": 0.05295, "Rāhu (true)": 0.05295 };

  var K = null, D = null, S = null,
      ST = { ms: Date.now(), place: { n: "Ujjain, Madhya Pradesh, India", lat: 23.1765, lon: 75.7885, zone: "Asia/Kolkata" } };

  /* ---- the place ---------------------------------------------------------------
     The grahas are geocentric, so a place changes only the lagna and the clock.
     The clock: local mean time is the place's own longitude ÷ 15 hours from UT,
     which is what any place kept before standard zones; "the place's clock" asks
     the browser's time-zone database, which before a zone existed returns the
     local mean time of the zone's own reference city, not of this place. */
  var QUICK = [
    { n: "Ujjain, Madhya Pradesh, India", lat: 23.1765, lon: 75.7885, tz: 5.5, zone: "Asia/Kolkata" },
    { n: "Kurukshetra, Haryana, India", lat: 29.9695, lon: 76.8783, tz: 5.5, zone: "Asia/Kolkata" },
    { n: "Varanasi, Uttar Pradesh, India", lat: 25.3176, lon: 82.9739, tz: 5.5, zone: "Asia/Kolkata" },
    { n: "Ayodhya, Uttar Pradesh, India", lat: 26.7922, lon: 82.1998, tz: 5.5, zone: "Asia/Kolkata" },
    { n: "Pataliputra (Patna), Bihar, India", lat: 25.5941, lon: 85.1376, tz: 5.5, zone: "Asia/Kolkata" },
    { n: "Delhi, India", lat: 28.6139, lon: 77.2090, tz: 5.5, zone: "Asia/Kolkata" },
    { n: "Abu Dhabi, United Arab Emirates", lat: 24.4539, lon: 54.3773, tz: 4, zone: "Asia/Dubai" },
    { n: "Greenwich, London, United Kingdom", lat: 51.4769, lon: -0.0005, tz: 0, zone: "Europe/London" }
  ];
  function lonNow() { var v = +$("ks-lon").value; return isFinite(v) ? Math.max(-180, Math.min(180, v)) : 0; }
  function latNow() { var v = +$("ks-lat").value; return isFinite(v) ? Math.max(-89.9, Math.min(89.9, v)) : 0; }
  /* hours to ADD to UT to get the clock time chosen in "Time is" */
  function offsetAt(msUT) {
    var m = $("ks-tmode").value;
    ST.zoneFell = false;
    if (m === "ut") return 0;
    if (m === "zone" && ST.place && ST.place.zone && window.NPlaces) {
      var o = window.NPlaces.offsetAt(ST.place.zone, msUT);
      if (o != null) return o;
      ST.zoneFell = true;
    }
    return lonNow() / 15;
  }
  function hm(ms) { var d = new Date(ms); return String(d.getUTCHours()).padStart(2, "0") + ":" + String(d.getUTCMinutes()).padStart(2, "0"); }

  /* ---- the moment ----------------------------------------------------------- */
  function readWhen() {
    var era = $("ks-era").value, y = Math.max(1, Math.min(era === "BCE" ? 13000 : 3600, +$("ks-year").value || 1));
    var t = ($("ks-time").value || "06:00").split(":");
    var Y = era === "BCE" ? 1 - y : y;
    var local = msFor(Y, +$("ks-month").value || 1, +$("ks-day").value || 1, +t[0] || 0, +t[1] || 0);
    var ut = local - offsetAt(local) * 3600000;
    ST.ms = local - offsetAt(ut) * 3600000;      /* once more, for a zone whose offset changes that day */
  }
  function writeWhen(ms) {
    var d = new Date(ms + offsetAt(ms) * 3600000), Y = d.getUTCFullYear();
    $("ks-era").value = Y <= 0 ? "BCE" : "CE"; $("ks-year").value = Y <= 0 ? 1 - Y : Y;
    $("ks-month").value = d.getUTCMonth() + 1; $("ks-day").value = d.getUTCDate();
    $("ks-time").value = String(d.getUTCHours()).padStart(2, "0") + ":" + String(d.getUTCMinutes()).padStart(2, "0");
    ST.ms = ms;
  }
  var PRESETS = [
    ["The span opens · 1 Jan 13000 BCE", function () { return msFor(-12999, 1, 1, 6, 0); }],
    ["Deep gives way to Early · 8500 BCE", function () { return msFor(-8499, 6, 21, 6, 0); }],
    ["Early gives way to Core · 4000 BCE", function () { return msFor(-3999, 6, 21, 6, 0); }],
    ["The Kali epoch · Ujjain midnight, JD 588465.5", function () { return (588465.5 - 2440587.5) * 86400000; }],
    ["Āryabhaṭa's zero · 21 Mar 499 CE", function () { return (1903396.75 - 2440587.5) * 86400000; }],
    ["1 CE", function () { return msFor(1, 1, 1, 6, 0); }],
    ["This moment", function () { return Date.now(); }],
    ["The span closes · 31 Dec 3600 CE", function () { return msFor(3600, 12, 31, 18, 0); }]
  ];

  /* the modern engine, sidereal in Kālasetu's frame */
  function modSid(sa, ms) {
    var jd = jdOf(ms), ay = window.__ayanFor("samanvaya_ecliptic", jd);
    if (sa === "Rāhu" || sa === "Ketu") {
      var N = window.__kNodesModern(ms);
      return norm(N.mean - ay + (sa === "Ketu" ? 180 : 0));
    }
    var e = window.__kEclipModern(G.filter(function (g) { return g[0] === sa; })[0][1], ms);
    return norm(e.trop - ay);
  }

  /* ---- the sky ----------------------------------------------------------------- */
  /* the error bar for a graha at a moment: its set's held-back figures for the
     600-year band holding the date */
  function errCell(key, ms) {
    var a = K.accuracyAt ? K.accuracyAt(key, ms) : null;
    if (!a) return '<td class="num">—</td>';
    var ex = extrapolated(key, ms);
    return '<td class="num ' + grade(a.rms) + '" title="' + esc((ex ? "no independent reference here: the spread between two extrapolations. " : "") +
      "typical " + am(a.rms) + ", bias " + am(a.bias) + ", worst " + am(a.worst) + ", from " + a.n + " held-back moments") + '">±' + am(a.rms) +
      ' <span class="elw">bias ' + am(a.bias) + " · worst " + am(a.worst) + (ex ? " · extrapolated" : "") + "</span></td>";
  }
  /* the Moon and the nodes have no independent reference outside DE422 */
  function extrapolated(key, ms) {
    var y = new Date(ms).getUTCFullYear();
    return (key === "Candra" || key === "Rāhu (true)") && (y < -2999 || y > 2999);
  }
  function grade(x) { return x == null ? "" : x < 1 ? "ks-g1" : x < 5 ? "ks-g2" : x < 30 ? "ks-g3" : "ks-g4"; }
  function sky() {
    var ms = ST.ms, rows = [], pos = {};
    G.forEach(function (g) {
      var k = K.longitude(g[0], ms), m = modSid(g[0], ms);
      pos[g[0]] = { k: k, m: m };
      rows.push("<tr><td><b>" + esc(g[0]) + "</b> <span class=\"elw\">" + esc(g[1]) + "</span></td><td>" + inSign(k) +
        "</td><td>" + nakOf(k) + "</td>" + errCell(g[0] === "Ketu" ? "Rāhu" : g[0], ms) + "<td>" + inSign(m) + "</td><td class=\"num\">" + am(sdiff(k, m) * 60) + "</td></tr>");
    });
    var tn = K.trueNode(ms), tm = norm(window.__kNodesModern(ms).true - window.__ayanFor("samanvaya_ecliptic", jdOf(ms)));
    rows.push("<tr><td><b>Rāhu</b> <span class=\"elw\">true node</span></td><td>" + inSign(tn) + "</td><td>" + nakOf(tn) +
      "</td>" + errCell("Rāhu (true)", ms) + "<td>" + inSign(tm) + "</td><td class=\"num\">" + am(sdiff(tn, tm) * 60) + "</td></tr>");
    var lat = latNow(), lon = lonNow(), asc = null;
    try { asc = norm(window.__kAscTrop(ms, lat, lon) - window.__ayanFor("samanvaya_ecliptic", jdOf(ms))); } catch (e) {}
    if (asc != null) {
      pos.Lagna = asc;
      rows.push('<tr class="ks-lagrow"><td><b>Lagna</b> <span class="elw">ascendant at the place</span></td><td>' + inSign(asc) +
        "</td><td>" + nakOf(asc) + '</td><td class="num">see the note below</td><td>' + inSign(asc) + '</td><td class="num">same method</td></tr>');
    }
    $("ks-skytab").innerHTML = '<div class="eltblwrap"><table class="aytab"><thead><tr><th>graha</th><th>Kālasetu</th>' +
      "<th>nakṣatra · pāda</th><th>error here, measured</th><th>modern engine</th><th>difference</th></tr></thead><tbody>" + rows.join("") + "</tbody></table></div>";
    fitRead();
    wheel(pos);
    /* the date and time as the reader gave them, on the clock "Time is" names;
       UT beside it when that is not UT */
    var mode = $("ks-tmode").value, d = new Date(ms + offsetAt(ms) * 3600000), Y = d.getUTCFullYear(), dt = null;
    try { var t = window.Astronomy.MakeTime(new Date(ms)); dt = (t.tt - t.ut) * 86400; } catch (e) {}
    $("ks-skynote").innerHTML = "<b>" + d.getUTCDate() + " " + ["January", "February", "March", "April", "May", "June", "July",
      "August", "September", "October", "November", "December"][d.getUTCMonth()] + " " + yearLabel(Y) + ", " +
      hm(d.getTime()) + (mode === "ut" ? " UT" : mode === "lmt" ? " local mean time" : (ST.zoneFell ? " local mean time" : " clock time")) +
      "</b> at " + esc(ST.place && ST.place.n ? ST.place.n : "the place") + " (" + lat.toFixed(2) + "°, " + lon.toFixed(2) + "°)" +
      (mode === "ut" ? "" : " = " + hm(ms) + " UT" + (new Date(ms).getUTCDate() !== d.getUTCDate() ? " (" + new Date(ms).getUTCDate() + " " +
        ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][new Date(ms).getUTCMonth()] + ")" : "")) +
      " · Samanvaya–Ecliptic ayanāṃśa " + dms(window.__ayanFor("samanvaya_ecliptic", jdOf(ms))) +
      (ST.zoneFell ? " · <b>no time zone existed here then, so local mean time is used</b>" : "") +
      (dt != null ? " · ΔT " + (Math.abs(dt) < 600 ? dt.toFixed(0) + " s" : (dt / 3600).toFixed(1) + " hours") : "") +
      " · Kali day " + Math.floor(K.ahargana(ms)).toLocaleString("en") +
      (K.inSpan(ms) ? "" : " · <b>outside the fitted span — no accuracy is claimed here</b>") +
      (function () { var y = new Date(ms).getUTCFullYear(); return y < -2999 ? " · <b>the Moon and nodes here are extrapolated from DE422, not measured</b>" : ""; })() +
      (function () {
        /* the lagna turns a full circle a day, so ΔT's own uncertainty (see the
           Earth's clock, below) moves it 15° an hour for a clock-time moment */
        var s1 = sigmaMS(Y), s2 = sigmaHuber(Y);
        if (Y >= 1000 || asc == null) return "";
        var hi = Math.max(s1, s2 || 0) / 240, lo = Math.min(s1, s2 == null ? s1 : s2) / 240;
        return ". <b>The lagna for a clock time this far back is uncertain by about ±" + Math.round(lo) + "°" +
          (hi - lo > 2 ? " to ±" + Math.round(hi) + "°" : "") + "</b>, from the Earth's clock alone (ΔT; see below)";
      })();
  }
  function wheel(pos) {
    var W = 300, c = W / 2, R1 = 132, R0 = 104, h = [];
    h.push('<svg viewBox="0 0 ' + W + " " + W + '" role="img" aria-label="Kālasetu and the modern engine on one wheel">');
    h.push('<circle class="ks-ring" cx="' + c + '" cy="' + c + '" r="' + R1 + '"/><circle class="ks-ring" cx="' + c + '" cy="' + c + '" r="' + R0 + '"/>');
    var P = function (L, r) { var a = (180 + L) * Math.PI / 180; return [c + r * Math.cos(a), c - r * Math.sin(a)]; };
    for (var s = 0; s < 12; s++) {
      var a = P(s * 30, R0), b = P(s * 30, R1), t = P(s * 30 + 15, (R0 + R1) / 2);
      h.push('<line class="ks-ring" x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) + '" x2="' + b[0].toFixed(1) + '" y2="' + b[1].toFixed(1) + '"/>');
      h.push('<text class="ks-sign" x="' + t[0].toFixed(1) + '" y="' + t[1].toFixed(1) + '">' + esc(RS[s].slice(0, 3)) + "</text>");
    }
    if (pos.Lagna != null) {
      var la = P(pos.Lagna, 34), lb = P(pos.Lagna, R1 + 6), lt = P(pos.Lagna, R1 + 15);
      h.push('<line class="ks-asc" x1="' + la[0].toFixed(1) + '" y1="' + la[1].toFixed(1) + '" x2="' + lb[0].toFixed(1) + '" y2="' + lb[1].toFixed(1) + '"/>');
      h.push('<text class="ks-glyph" x="' + lt[0].toFixed(1) + '" y="' + lt[1].toFixed(1) + '">As</text>');
    }
    G.forEach(function (g, i) {
      var r = 86 - (i % 3) * 18, k = P(pos[g[0]].k, r), m = P(pos[g[0]].m, r);
      h.push('<circle class="ks-mod" cx="' + m[0].toFixed(1) + '" cy="' + m[1].toFixed(1) + '" r="9.5"/>');
      h.push('<circle class="ks-dot" cx="' + k[0].toFixed(1) + '" cy="' + k[1].toFixed(1) + '" r="7.5" style="fill:' + COL[g[0]] + '"/>');
      h.push('<text class="ks-glyph" x="' + k[0].toFixed(1) + '" y="' + (k[1] - 14).toFixed(1) + '">' + g[2] + "</text>");
    });
    h.push("</svg>");
    $("ks-wheel").innerHTML = h.join("") + '<p class="ks-legend"><span>filled: Kālasetu</span><span>ring: modern engine</span>' +
      "<span>As: the lagna</span><span>Meṣa at the left, counter-clockwise</span></p>";
  }

  /* ---- the steps --------------------------------------------------------------- */
  var LSRC = function (i) { return i === 0 ? "the manda equation" : (i <= 3 ? "Candraśekhara" : "modern series"); };
  var LNAME = ["manda equation", "evection", "variation", "annual equation", "second harmonic of the manda", "reduction to the ecliptic"];
  function argText(a) {
    var p = [], n = ["D", "M", "M☉", "F"];
    a.slice(0, 4).forEach(function (c, i) { if (!c) return; p.push((c < 0 ? "− " : (p.length ? "+ " : "")) + (Math.abs(c) === 1 ? "" : Math.abs(c)) + n[i]); });
    return p.join(" ");
  }
  function step(title, val, why) {
    return "<li>" + title + (val != null ? " <span class=\"ks-val\">" + val + "</span>" : "") + (why ? "<span class=\"ks-why\">" + why + "</span>" : "") + "</li>";
  }
  function steps() {
    var sa = $("ks-graha").value, ms = ST.ms, t = K.trace(sa, ms), h = [];
    if (!t) { $("ks-steps").innerHTML = ""; return; }
    h.push(step("Days since the Kali epoch at Laṅkā sunrise (the ahargaṇa), counted in uniform time:",
      t.ahar.toLocaleString("en", { maximumFractionDigits: 3 }),
      "ΔT, the Earth's clock, adds " + (Math.abs(t.dt) < 600 ? t.dt.toFixed(1) + " seconds" : (t.dt / 3600).toFixed(2) + " hours") + " to the civil count here."));
    if (t.rev != null) {
      h.push(step("The text's mean place: " + Math.abs(t.rev).toLocaleString("en") + " revolutions in 1,577,917,828 days" +
        (t.rev < 0 ? ", backwards" : "") + ", times the ahargaṇa:", dms(t.textMean),
        "This is the Later Sūrya Siddhānta's own number, unchanged."));
      h.push(step("The correction on it (bīja and epoch saṃskāra, drifting slowly over the millennia):",
        (t.correction >= 0 ? "+" : "−") + dms(Math.abs(t.correction)), "Mean place now " + dms(t.mean) + "."));
    }
    if (sa === "Rāhu" || sa === "Ketu") {
      h.push(step("The mean " + (sa === "Ketu" ? "Ketu (Rāhu + 180°)" : "node") + ":", inSign(t.lon)));
      h.push(step("For the true node: the mean node's own secular drift against the ecliptic of date,", am(t.trueSecular * 60),
        "the true node is a plane measured against the moving ecliptic; the mean node is a published polynomial"));
      h.push(step("plus the periodic wobble (56 sine and cosine terms on the Moon's and Sun's places):", am(t.truePeriodic * 60)));
      h.push(step("The true node:", inSign(t.trueLon), "Modern engine: " + inSign(norm(window.__kNodesModern(ms).true -
        window.__ayanFor("samanvaya_ecliptic", jdOf(ms)) + (sa === "Ketu" ? 180 : 0))) + "."));
      $("ks-steps").innerHTML = h.join(""); return;
    }
    if (sa === "Candra") {
      h.push(step("The Moon's apogee (mandocca): the text's " + dms(t.apogeeText) + ", corrected to", dms(t.apogee)));
      h.push(step("The four arguments every lunar term is read on:", "D " + t.args.D.toFixed(2) + "° · M " + t.args.M.toFixed(2) +
        "° · M☉ " + t.args.Ms.toFixed(2) + "° · F " + t.args.F.toFixed(2) + "°",
        "D the Moon's elongation from the Sun, M its anomaly counted from the apogee as the texts count it, M☉ the Sun's anomaly, F its distance from the node"));
      var top = t.terms.slice().sort(function (a, b) { return Math.abs(b.deg) - Math.abs(a.deg); }).slice(0, 8);
      h.push(step("The terms, largest first here:", null, top.map(function (x) {
        return esc((LNAME[x.i] || "sin(" + argText(x.arg) + ")") + " — " + LSRC(x.i)) + ": " + am(x.deg * 60);
      }).join(" · ") + " · and " + (t.terms.length - top.length) + " smaller."));
      var sum = t.terms.reduce(function (a, x) { return a + x.deg; }, 0);
      h.push(step("All " + t.terms.length + " terms together:", (sum >= 0 ? "+" : "−") + dms(Math.abs(sum))));
      h.push(step("The Moon:", inSign(t.lon), "Latitude " + t.lat.toFixed(3) + "°. Modern engine: " + inSign(modSid("Candra", ms)) + "."));
      $("ks-steps").innerHTML = h.join(""); return;
    }
    var o = t.orbit;
    var who = sa === "Sūrya" ? "the Sun's own path about the Earth" : "the planet's own orbit about the Sun";
    h.push(step("Manda: " + who + ". Mandocca " + dms(o.w) + ", eccentricity " + o.e.toFixed(5) + ", anomaly " + o.M.toFixed(3) + "°; the equation of the centre:",
      (o.eqc >= 0 ? "+" : "−") + dms(Math.abs(o.eqc)), "solved exactly (Kepler's equation) rather than with the text's epicycle and sine table"));
    if (o.terms && o.terms.length) {
      var tops = o.terms.slice().sort(function (a, b) { return Math.abs(b.deg) - Math.abs(a.deg); }).slice(0, 3);
      h.push(step("Perturbations by the other planets (" + o.terms.length + " terms):", am(o.pert * 60),
        "largest: " + tops.map(function (x) { return am(x.deg * 60); }).join(", ") +
        (sa === "Guru" || sa === "Śani" ? " — the great inequality leads; see below" : "")));
    }
    if (sa !== "Sūrya") {
      h.push(step("The planet's true place about the Sun, and its distance (the manda karṇa):", dms(o.lam), o.r.toFixed(4) + " AU"));
      h.push(step("Śīghra: added, as a vector, to the Sun's true place " + dms(t.sun.lam) + " at its own distance " + t.sun.r.toFixed(4) + " AU",
        null, "true distances on both sides — the combination Nīlakaṇṭha's Tantrasaṅgraha reached for the inner planets"));
      h.push(step("Light-time: the planet is seen where it was", (t.lightDays * 1440).toFixed(1) + " minutes ago", "at " + t.dist.toFixed(4) + " AU"));
    }
    h.push(step("The answer, in Samanvaya–Ecliptic:", inSign(t.lon) + " · " + nakOf(t.lon),
      "Modern engine: " + inSign(modSid(sa, ms)) + " — a difference of " + am(sdiff(t.lon, modSid(sa, ms)) * 60) + "."));
    $("ks-steps").innerHTML = h.join("");
  }

  /* ---- accuracy ------------------------------------------------------------------ */
  var ROWS = ["Sūrya", "Candra", "Budha", "Śukra", "Maṅgala", "Guru", "Śani", "Rāhu", "Rāhu (true)"];
  var SETN = ["core", "early", "deep"];
  /* the 600-year eras across the whole span, 13000 BCE onwards; the last runs to 3600 CE */
  var ERAS = []; for (var ey = -13000; ey + 600 <= 3800; ey += 600) ERAS.push(ey);
  function eraMid(y0) { var y = y0 + 1 + (y0 + 600 > 3400 ? 400 : 300); return msFor(Math.floor(y), 7, 1, 0, 0); }
  function docOf(n) { return K.sets ? (K.sets()[n] || {}).doc : (n === "core" ? D : null); }
  function fitRead() {
    var el = $("ks-fitread"); if (!el || !K.setAt) return;
    var f = K.setAt(ST.ms);
    el.innerHTML = (K.mode() === "auto" ? "Auto reads this date from the <b>" + esc(f.name) + "</b> fit (" + esc(f.label) + ")" +
        (f.blendWith ? ", blended " + Math.round(100 * f.weight) + " : " + Math.round(100 * (1 - f.weight)) + " with the " + esc(f.blendName) + " fit" : "")
      : "Forced to the <b>" + esc(f.name) + "</b> fit (" + esc(f.label) + ")" + (f.inSetSpan ? "" : " — <b>this date is outside that fit's own span</b>, so its error bars do not apply")) + ".";
  }
  function tiles() {
    var R = D.residuals;
    $("ks-tiles").innerHTML = ROWS.map(function (b) {
      return R[b] ? '<div class="ks-tile"><b>' + am((R[b].de || R[b].holdout).rms) + "</b><span>" + esc(b === "Rāhu" ? "Rāhu · Ketu (mean)" :
        b === "Rāhu (true)" ? "Rāhu · Ketu (true)" : b) + (b === "Rāhu" ? ", against the published polynomial" : ", against DE422") + "</span></div>" : "";
    }).join("") + '<div class="ks-tile"><b>16,600</b><span>years fitted, 13000 BCE – 3600 CE, in three fits</span></div>';
  }
  function bands() {
    var b = $("ks-accbody").value;
    var cells = ERAS.map(function (y0) { var ms = eraMid(y0), a = K.accuracyAt ? K.accuracyAt(b, ms) : null;
      return { y0: y0, a: a, set: K.setAt ? K.setAt(ms).set : "core", ex: extrapolated(b, ms) }; }).filter(function (c) { return c.a; });
    if (!cells.length) return;
    var W = 640, H = 210, L = 46, B = 34, n = cells.length, bw = (W - L - 10) / n;
    var top = Math.max.apply(null, cells.map(function (c) { return c.a.rms; })) * 1.15 || 1;
    var h = ['<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Held-back error by 600-year band, 13000 BCE to 3600 CE">'];
    for (var g = 0; g <= 4; g++) { var v = top * g / 4, y = H - B - (H - B - 10) * g / 4;
      h.push('<line class="ks-ax" x1="' + L + '" y1="' + y + '" x2="' + (W - 6) + '" y2="' + y + '"/><text class="ks-axt" x="' + (L - 4) +
        '" y="' + (y + 3) + '" text-anchor="end">' + (v < 1 ? v.toFixed(2) : v < 10 ? v.toFixed(1) : v.toFixed(0)) + "′</text>"); }
    cells.forEach(function (c, i) {
      var hh = (H - B - 10) * c.a.rms / top, X = L + i * bw + 1.5;
      h.push('<rect class="ks-bar ' + c.set + (c.ex ? " ex" : "") + '" x="' + X.toFixed(1) + '" y="' + (H - B - hh).toFixed(1) + '" width="' + (bw - 3).toFixed(1) +
        '" height="' + hh.toFixed(1) + '"><title>' + esc(yearLabel(c.y0 + 1)) + ", " + c.set + " fit: " + am(c.a.rms) + " typical, bias " + am(c.a.bias) +
        ", worst " + am(c.a.worst) + (c.ex ? " — extrapolated, no independent reference" : "") + "</title></rect>");
      if (i % 4 === 0) h.push('<text class="ks-axt" x="' + (X + bw / 2).toFixed(1) + '" y="' + (H - B + 13) + '" text-anchor="middle">' + esc(yearLabel(c.y0 + 1)) + "</text>");
    });
    h.push("</svg>");
    $("ks-bands").innerHTML = h.join("") + '<p class="ks-legend"><span><i style="background:var(--accent,#c9a24b)"></i>Core fit</span>' +
      '<span><i style="background:var(--sem-info,#3f6fa6)"></i>Early fit</span><span><i style="background:var(--sem-bad,#a1493a)"></i>Deep fit</span>' +
      "<span>pale: no independent reference (the spread between two extrapolations)</span></p>";
  }
  function accTable() {
    var heads = SETN.map(function (n) { var d = docOf(n); return d ? "<th>" + esc(n.charAt(0).toUpperCase() + n.slice(1)) + "<br><small>" +
      esc(d.span.label) + "</small></th>" : ""; }).join("");
    $("ks-acctab").innerHTML = '<div class="eltblwrap"><table class="aytab"><thead><tr><th>graha</th>' + heads +
      "<th>latitude, Core</th></tr></thead><tbody>" + ROWS.map(function (b) {
        if (!D.residuals[b]) return "";
        return "<tr><td><b>" + esc(b) + "</b></td>" + SETN.map(function (n) { var d = docOf(n); if (!d) return "";
          var x = d.residuals[b]; if (!x) return "<td>—</td>";
          var lunar = b === "Candra" || b === "Rāhu (true)", spread = lunar && d.moon && d.moon.fitted === false;
          /* the Core fit's Moon is quoted where it is measured, inside DE422 */
          var q = n === "core" && lunar && x.de ? x.de : x.holdout;
          return '<td class="' + grade(q.rms) + '">' + am(q.rms) + ' <span class="elw">worst ' + am(q.worst) +
            (spread ? " · spread, not measured" : n === "core" && lunar && x.de ? " · within DE422" : "") + "</span></td>"; }).join("") +
          "<td>" + (D.residuals[b].latitude ? am(D.residuals[b].latitude.rms) : "—") + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  /* the era table: every 600 years, the selected graha's error bar, its
     basis, the modern engine's own error against the same reference, and
     how well the Earth's clock is known */
  var MKEY = { "Rāhu (true)": "Rāhu-true" };
  function eras() {
    var b = $("ks-erabody").value, MR = D.reference && D.reference.modern_vs_reference && D.reference.modern_vs_reference.bands;
    var mrows = MR ? MR[MKEY[b] || b] : null;
    $("ks-eras").innerHTML = '<div class="eltblwrap"><table class="aytab ks-era"><thead><tr><th>era</th><th>fit</th><th>typical</th><th>bias</th>' +
      "<th>worst</th><th>measured against</th><th>modern engine, typical</th><th>ΔT known to</th></tr></thead><tbody>" +
      ERAS.map(function (y0, i) {
        var ms = eraMid(y0), a = K.accuracyAt(b, ms), f = K.setAt(ms), ex = extrapolated(b, ms), y = new Date(ms).getUTCFullYear();
        var basis = ex ? "nothing independent: the spread between two extrapolations" : (y >= -2999 && y <= 2999 ? "JPL DE422" :
          (b === "Rāhu" ? "the published mean-node polynomial" : "the integration from DE422"));
        var m = mrows && mrows[i] && mrows[i].rms != null ? mrows[i].rms : null;
        var sH = sigmaHuber(y), sM = sigmaMS(y), dt = y >= 1600 ? "seconds" : y >= 1000 ? "minutes" :
          "±" + fmtH(Math.min(sM, sH == null ? sM : sH)) + (sH != null && Math.abs(sH - sM) > 600 ? " – " + fmtH(Math.max(sM, sH)) : "");
        if (!a) return "";
        return "<tr><td>" + esc(yearLabel(y0 + 1)) + "–" + esc(yearLabel(Math.min(3600, y0 + 600))) + "</td><td>" + esc(f.name) +
          (f.blendWith ? " ⇄ " + esc(f.blendName) : "") + '</td><td class="num ' + grade(a.rms) + '">' + am(a.rms) + '</td><td class="num">' + am(a.bias) +
          '</td><td class="num">' + am(a.worst) + "</td><td>" + esc(basis) + '</td><td class="num ' + grade(m) + '">' + (m == null ? "—" : m > 120 ? (m / 60).toFixed(1) + "°" : am(m)) +
          '</td><td class="num">' + dt + "</td></tr>";
      }).join("") + "</tbody></table></div>";
    var IC = D.reference && D.reference.integrator_check && D.reference.integrator_check.bodies;
    $("ks-erasnote").innerHTML = "Typical is the rms of the held-back moments in that era; bias their mean; worst the largest. Arcminutes of sidereal longitude. " +
      (IC ? "The integration that stands in for DE422 outside 3000 BCE – 3000 CE was checked by running it across DE422's own six thousand years: it stayed within " +
        Object.keys(IC).map(function (k) { return k + " " + IC[k].worst.toFixed(1) + "″"; }).join(", ") + " of DE422. " : "") +
      "“Modern engine” is the site's main engine against the same reference — before about 1000 BCE it is the larger error. " +
      "ΔT is known to seconds after 1600, minutes from 1000; before that the two published estimates of its error are shown. " +
      "An error in ΔT moves the Moon about 0.55° and the lagna 15° per hour, for a moment given on a clock.";
  }
  function fmtH(sec) { var h = sec / 3600; return h < 1 ? Math.round(sec / 60) + " min" : h < 48 ? h.toFixed(h < 10 ? 1 : 0) + " h" : (h / 24).toFixed(1) + " days"; }
  function measure() {
    var from = +$("ks-from").value, to = +$("ks-to").value, N = +$("ks-n").value;
    if (!(to > from)) { $("ks-measure").innerHTML = '<p class="swfail">“To” must be after “From”.</p>'; return; }
    var SA = ["Sūrya", "Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani", "Rāhu"], ks = {}, ss = {};
    SA.forEach(function (b) { ks[b] = []; ss[b] = []; });
    for (var i = 0; i < N; i++) {
      var f = (i + 0.37) / N, y = from + (to - from) * f, Y = Math.floor(y), frac = y - Y;
      var ms = msFor(Y, 1, 1, 0, 0) + frac * 365.2425 * 86400000 + ((i * 7919) % 1440) * 60000;
      var jd = jdOf(ms), lah = window.__ayanFor("lahiri", jd), sam = window.__ayanFor("samanvaya_ecliptic", jd);
      SA.forEach(function (b) {
        var trop = b === "Rāhu" ? window.__kNodesModern(ms).mean
          : window.__kEclipModern(G.filter(function (g) { return g[0] === b; })[0][1], ms).trop;
        ks[b].push(sdiff(K.longitude(b, ms), norm(trop - sam)) * 60);
        if (S) { var q = S.trueLongitude(b, S.ahargana(ms)); if (q) ss[b].push(sdiff(q.lon, norm(trop - lah)) * 60); }
      });
    }
    var rms = function (a) { return a.length ? Math.sqrt(a.reduce(function (s, x) { return s + x * x; }, 0) / a.length) : null; };
    $("ks-measure").innerHTML = '<div class="eltblwrap"><table class="aytab"><thead><tr><th>graha</th><th>Kālasetu</th><th>fitted Sūrya Siddhānta</th>' +
      "<th>ratio</th></tr></thead><tbody>" + SA.map(function (b) {
        var a = rms(ks[b]), c = rms(ss[b]);
        return "<tr><td><b>" + esc(b) + "</b></td><td>" + am(a) + "</td><td>" + (c == null ? "—" : (c > 120 ? (c / 60).toFixed(1) + "°" : am(c))) +
          "</td><td>" + (a && c ? "×" + (c / a).toFixed(c / a < 10 ? 1 : 0) : "—") + "</td></tr>";
      }).join("") + "</tbody></table></div>";
    $("ks-measurenote").innerHTML = N + " moments between " + yearLabel(from) + " and " + yearLabel(to) +
      ", typical (rms) difference from the modern engine. The fitted Sūrya Siddhānta tier was fitted on 1800–2200; " +
      "try a span far from it to see why a fourth engine was needed" + (from < 1000 ? ". Before 1000 CE part of every figure here is the modern engine's own error (see the era table)" : "") +
      ". Years are astronomical: 0 is 1 BCE, −12999 is 13000 BCE.";
  }

  /* ---- the Moon's terms ------------------------------------------------------------ */
  /* Meeus, Astronomical Algorithms, Table 47.A, in degrees — the size of each
     term, compared by magnitude because this engine counts the Moon's anomaly
     from the apogee (as the texts do), which flips the sign of every term odd
     in it. null where the term is below that table's printed precision. */
  var MEEUS = [6.288774, 1.274027, 0.658314, 0.185116, 0.213618, 0.114332, 0.058793, 0.057066, 0.053322, 0.045758,
    0.040923, 0.034720, 0.030383, 0.015327, 0.010980, 0.012528, 0.010675, 0.010034, 0.008548, 0.004036, 0.006766,
    0.004987, 0.005163, 0.007888, 0.002689, 0.003665, 0.003994, 0.002069, 0.002390, null, 0.003861, 0.001215, null,
    0.002120, 0.002348, null];
  var GROUPS = [["manda", "the manda equation (the text's own correction)", function (i) { return i === 0; }],
                ["cs", "Candraśekhara's three: evection, variation, annual equation", function (i) { return i >= 1 && i <= 3; }],
                ["modern", "the further terms of the modern series", function (i) { return i >= 4; }]];
  var MOONSET = null;
  function moonSamples() {
    if (MOONSET) return MOONSET;
    MOONSET = [];
    for (var i = 0; i < 200; i++) {
      var y = 1000 + 2000 * (i + 0.5) / 200, Y = Math.floor(y), ms = msFor(Y, 1, 1, 0, 0) + (y - Y) * 365.2425 * 86400000 + ((i * 6007) % 1440) * 60000;
      MOONSET.push({ ms: ms, t: K.trace("Candra", ms), ref: modSid("Candra", ms) });
    }
    return MOONSET;
  }
  function moonTerms() {
    var off = {};
    GROUPS.forEach(function (g) { var c = document.querySelector('[data-ks-group="' + g[0] + '"]'); off[g[0]] = c && !c.checked; });
    var drop = function (i) { return GROUPS.some(function (g) { return off[g[0]] && g[2](i); }); };
    var S2 = moonSamples(), err = [];
    S2.forEach(function (s) {
      var L = s.t.lon;
      s.t.terms.forEach(function (x) { if (drop(x.i)) L -= x.deg; });
      err.push(sdiff(L, s.ref) * 60);
    });
    var r = Math.sqrt(err.reduce(function (a, x) { return a + x * x; }, 0) / err.length);
    var anyOff = Object.keys(off).some(function (k) { return off[k]; });
    $("ks-moonerr").innerHTML = '<p class="ks-moonbig">With ' + (anyOff ? "the chosen terms switched off" : "every term") +
      ", the Moon is typically <b>" + (r > 120 ? (r / 60).toFixed(2) + "°" : am(r)) + "</b> from the modern engine over 1000–3000 CE" +
      " (200 moments). That is " + (r * 60 * 0.101 < 60 ? (r * 60 * 0.101).toFixed(0) + " days" : (r * 60 * 0.101 / 365.25).toFixed(1) + " years") +
      " of Viṃśottarī on the cycle average, and " + (100 * r / 200).toFixed(r < 20 ? 1 : 0) + "% of a pāda.</p>";
    var amp = (D.params && D.params["Candra"]) || {};
    var t = S2[0].t;
    $("ks-moontab").innerHTML = '<div class="eltblwrap"><table class="aytab"><thead><tr><th>#</th><th>argument</th><th>what it is</th>' +
      "<th>Kālasetu’s amplitude</th><th>textbook</th><th>from</th></tr></thead><tbody>" + t.terms.map(function (x) {
        var a = amp["L" + x.i];
        return "<tr" + (drop(x.i) ? ' style="opacity:.45"' : "") + "><td>" + (x.i + 1) + "</td><td>sin(" + esc(argText(x.arg)) + ")</td><td>" +
          esc(LNAME[x.i] || "") + "</td><td class=\"num\">" + (a == null ? "—" : Math.abs(a).toFixed(4) + "°") + "</td><td class=\"num\">" +
          (MEEUS[x.i] == null ? "—" : MEEUS[x.i].toFixed(4) + "°") + "</td><td>" + esc(LSRC(x.i)) + "</td></tr>";
      }).join("") + "</tbody></table></div>" +
      '<p class="k-note">The amplitudes were measured by the fit, not copied in, so a column agreeing with the textbook is a check on the fit. ' +
      "The annual equation comes out a little larger (0.19° against 0.185°) because the Earth's orbit was more eccentric over most of the span " +
      "than it is today. Textbook values: Meeus, Table 47.A. Latitude carries 19 further terms.</p>";
  }

  /* ---- charts across the span ------------------------------------------------------- */
  function lineChart(host, series, opt) {
    var W = 640, H = opt.H || 210, L = 52, B = 30, T = 12, xs = series[0].pts.map(function (p) { return p[0]; });
    var x0 = opt.x0 != null ? opt.x0 : Math.min.apply(null, xs), x1 = opt.x1 != null ? opt.x1 : Math.max.apply(null, xs);
    var all = []; series.forEach(function (s) { s.pts.forEach(function (p) { all.push(p[1]); }); });
    var y0 = opt.y0 != null ? opt.y0 : Math.min.apply(null, all), y1 = opt.y1 != null ? opt.y1 : Math.max.apply(null, all);
    if (y1 === y0) y1 = y0 + 1;
    var X = function (x) { return L + (W - L - 8) * (x - x0) / (x1 - x0); }, Y = function (y) { return H - B - (H - B - T) * (y - y0) / (y1 - y0); };
    var h = ['<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(opt.label) + '">'];
    for (var g = 0; g <= 4; g++) { var v = y0 + (y1 - y0) * g / 4;
      h.push('<line class="ks-ax" x1="' + L + '" y1="' + Y(v).toFixed(1) + '" x2="' + (W - 8) + '" y2="' + Y(v).toFixed(1) + '"/><text class="ks-axt" x="' + (L - 4) +
        '" y="' + (Y(v) + 3).toFixed(1) + '" text-anchor="end">' + opt.fy(v) + "</text>"); }
    (opt.xt || []).forEach(function (x) { h.push('<text class="ks-axt" x="' + X(x).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="middle">' + esc(opt.fx(x)) + "</text>"); });
    series.forEach(function (s) {
      h.push('<path class="' + s.cls + '" d="' + s.pts.map(function (p, i) { return (i ? "L" : "M") + X(p[0]).toFixed(1) + " " + Y(p[1]).toFixed(1); }).join("") + '"/>');
    });
    if (opt.mark != null) h.push('<line class="ks-mark" x1="' + X(opt.mark).toFixed(1) + '" y1="' + T + '" x2="' + X(opt.mark).toFixed(1) + '" y2="' + (H - B) + '"/>');
    h.push("</svg>");
    host.innerHTML = h.join("") + (opt.legend ? '<p class="ks-legend">' + opt.legend + "</p>" : "");
  }
  var YT = [-12999, -9999, -6999, -3999, -999, 2000];
  var GI_CACHE = null;
  function gi() {
    if (!GI_CACHE) {
      GI_CACHE = { sa: [], ju: [] };
      for (var i = 0; i <= 260; i++) {
        var y = 1000 + 2600 * i / 260, Y = Math.floor(y), ms = msFor(Y, 7, 1, 0, 0);
        GI_CACHE.sa.push([y, sdiff(K.longitude("Śani", ms), modSid("Śani", ms)) * 60]);
        GI_CACHE.ju.push([y, sdiff(K.longitude("Guru", ms), modSid("Guru", ms)) * 60]);
      }
    }
    var Y0 = new Date(ST.ms).getUTCFullYear(), all = GI_CACHE.sa.concat(GI_CACHE.ju).map(function (p) { return Math.abs(p[1]); });
    var top = Math.max(5, Math.ceil(Math.max.apply(null, all)));
    lineChart($("ks-gi"), [{ cls: "ks-l1", pts: GI_CACHE.sa }, { cls: "ks-l2", pts: GI_CACHE.ju }],
      { label: "Jupiter and Saturn: Kālasetu minus the modern engine, 1000–3600 CE", fy: function (v) { return (Math.abs(v) < 0.05 ? 0 : v).toFixed(1) + "′"; },
        fx: yearLabel, xt: [1000, 1500, 2000, 2500, 3000, 3500], y0: -top, y1: top, mark: Y0 >= 1000 && Y0 <= 3600 ? Y0 : null,
        legend: '<span><i style="background:var(--sem-info,#3f6fa6)"></i>Śani</span><span><i style="background:var(--sem-bad,#a1493a)"></i>Guru (dashed)</span><span>arcminutes; gold line: the moment chosen above</span>' });
    var w = function (a) { return Math.max.apply(null, a.map(function (p) { return Math.abs(p[1]); })); };
    $("ks-ginote").innerHTML = "Over these 261 moments Saturn never strays more than " + am(w(GI_CACHE.sa)) + " from the modern engine and Jupiter " +
      am(w(GI_CACHE.ju)) + ". The great inequality and its companions are carried as about 170 measured terms for each planet. Their sum is what the fit " +
      "measures; individually some of them trade against the orbit itself, so no single term is offered here as a physical size.";
  }
  /* How well ΔT is KNOWN, not just what it is. Two published estimates of its
     standard error, which disagree, and the disagreement is the point:
       – Morrison & Stephenson (2004): σ ≈ 0.8 t² s, t in centuries from 1820 —
         stated by its authors for 1000 BCE to 1200 CE only;
       – Huber (2000), a random walk in the length of day calibrated on
         −500 to +2000: σ = 365.25 N √((N Q / 3)(1 + N / M)) / 1000 s, with
         N years before −500, M = 2500, Q = 0.058 ms²/yr.
     Both as given on NASA's eclipse pages (Espenak). Before 720 BCE there are
     no timed eclipses at all, so every figure there is extrapolation. */
  function sigmaMS(y) { var t = (y - 1820) / 100; return 0.8 * t * t; }
  function sigmaHuber(y) { var N = -500 - y; if (N <= 0) return null;
    return 365.25 * N * Math.sqrt((N * 0.058 / 3) * (1 + N / 2500)) / 1000; }
  var DT_CACHE = null;
  function deltaT() {
    if (!DT_CACHE) { DT_CACHE = { dt: [], hu: [], ms: [] };
      for (var i = 0; i <= 240; i++) { var y = -12999 + 16599 * i / 240, ms = msFor(Math.floor(y), 7, 1, 0, 0), h = 0;
        try { var t = window.Astronomy.MakeTime(new Date(ms)); h = (t.tt - t.ut) * 24; } catch (e) {}
        DT_CACHE.dt.push([y, h]);
        var su = sigmaHuber(y); DT_CACHE.hu.push([y, su == null ? 0 : su / 3600]);
        DT_CACHE.ms.push([y, sigmaMS(y) / 3600]); } }
    var Y0 = new Date(ST.ms).getUTCFullYear(), here = null;
    try { var t0 = window.Astronomy.MakeTime(new Date(ST.ms)); here = (t0.tt - t0.ut) * 24; } catch (e) {}
    lineChart($("ks-dt"), [{ cls: "ks-l1", pts: DT_CACHE.dt }, { cls: "ks-l2", pts: DT_CACHE.hu }, { cls: "ks-l3", pts: DT_CACHE.ms }],
      { label: "ΔT across the span and how well it is known, in hours", fy: function (v) { return v.toFixed(0) + " h"; }, fx: yearLabel, xt: YT, y0: 0,
        mark: Y0 >= -12999 && Y0 <= 3600 ? Y0 : null,
        legend: '<span><i style="background:var(--sem-info,#3f6fa6)"></i>ΔT, as the modern engine models it</span>' +
          '<span><i style="background:var(--sem-bad,#a1493a)"></i>its uncertainty, Huber (dashed)</span>' +
          '<span><i style="background:var(--accent,#c9a24b)"></i>its uncertainty, Morrison &amp; Stephenson (dotted)</span>' });
    var sH = sigmaHuber(Y0), sM = sigmaMS(Y0);
    var moon = function (sec) { return (sec * 0.549 / 3600); }, earth = function (sec) { return sec / 240; };
    $("ks-dtnote").innerHTML = (here == null ? "" : "At the moment chosen above, ΔT is <b>" + (Math.abs(here) < 0.2 ? (here * 3600).toFixed(0) + " seconds" :
      here.toFixed(2) + " hours") + "</b>, which Kālasetu applies exactly as the modern engine does. ") +
      "<b>How well that figure is known</b> is another matter. " +
      (Y0 < 1200 ? "Here the two published estimates of its error are " + (sH == null ? "" : "<b>±" + (sH / 3600).toFixed(1) + " h</b> (Huber) and ") +
        "<b>±" + (sM / 3600).toFixed(sM < 3600 ? 2 : 1) + " h</b> (Morrison &amp; Stephenson" + (Y0 < -1000 ? ", stated only from 1000 BCE, so extrapolated here" : "") + "). " +
        "An error of " + ((sH || sM) / 3600).toFixed(1) + " h moves the Moon by about <b>" + moon(sH || sM).toFixed(1) + "°</b> and the Earth's turn — the lagna — by about <b>" +
        earth(sH || sM).toFixed(0) + "°</b>. " : "In this era it is known to seconds or minutes, from telescopic and modern timing. ") +
      "Before 720 BCE there is no timed eclipse to measure it from, so every value there is extrapolation; and the Earth, still rebounding " +
      "from the weight of the Ice Age ice sheets, was changing its own rotation as it did. This is a limit on what anyone can know about a clock-time moment, not on Kālasetu: the engine places " +
      "the grahas for a given moment of uniform time to arcminutes.";
  }
  function nodes() {
    var ms0 = ST.ms, pk = [], pm = [], DAY = 86400000;
    for (var i = 0; i <= 146; i++) {
      var ms = ms0 + (i - 73) * 2.5 * DAY, jd = jdOf(ms), N = window.__kNodesModern(ms), ay = window.__ayanFor("samanvaya_ecliptic", jd);
      pk.push([(i - 73) * 2.5, sdiff(K.trueNode(ms), K.longitude("Rāhu", ms))]);
      pm.push([(i - 73) * 2.5, sdiff(norm(N.true - ay), norm(N.mean - ay))]);
    }
    lineChart($("ks-node"), [{ cls: "ks-l2", pts: pm }, { cls: "ks-l1", pts: pk }],
      { label: "True minus mean node over a year", fy: function (v) { return (Math.abs(v) < 0.05 ? 0 : v).toFixed(1) + "°"; }, fx: function (x) { return (x > 0 ? "+" : "") + x + " d"; },
        xt: [-180, -90, 0, 90, 180], mark: 0,
        legend: '<span><i style="background:var(--sem-info,#3f6fa6)"></i>Kālasetu</span><span><i style="background:var(--sem-bad,#a1493a)"></i>modern engine (dashed)</span><span>true node minus mean node, degrees, over ±180 days</span>' });
    var dif = pk.map(function (p, i) { return Math.abs(p[1] - pm[i][1]) * 60; });
    var yN = new Date(ms0).getUTCFullYear();
    $("ks-nodenote").innerHTML = (yN >= 1000 ? "The two curves lie on top of each other: over this year they differ by at most " + am(Math.max.apply(null, dif)) + ". "
      : "Over this year the two differ by up to " + am(Math.max.apply(null, dif)) + ": this far back the modern engine's Moon, and so its node, has drifted (see the era table). ") +
      "The largest swing is the 2D − 2F term, about 1.5°, half a synodic-draconitic cycle of 173 days.";
  }

  /* ---- what it costs -------------------------------------------------------------------- */
  function span(days) { var d = Math.abs(days);
    if (d * 1440 < 1) return "under a minute"; if (d < 1 / 24) return Math.round(d * 1440) + " min";
    if (d < 1.5) return (d * 24).toFixed(1) + " h"; return d.toFixed(1) + " days"; }
  function cost() {
    var R = D.residuals;
    $("ks-cost").innerHTML = '<div class="eltblwrap"><table class="aytab"><thead><tr><th>graha</th><th>typical error</th><th>share of a pāda</th>' +
      "<th>share of a D60 aṃśa</th><th>moves a sign or nakṣatra change by</th></tr></thead><tbody>" + ROWS.map(function (b) {
        var x = R[b]; if (!x) return ""; var e = (x.de || x.holdout).rms;
        return "<tr><td><b>" + esc(b) + "</b></td><td>" + am(e) + "</td><td>1 ⁄ " + Math.round(200 / e) + "</td><td>1 ⁄ " + (30 / e).toFixed(30 / e < 10 ? 1 : 0) +
          "</td><td>" + span(e / 60 / MEANMOT[b]) + "</td></tr>";
      }).join("") + "</tbody></table></div>";
    var m = (R["Candra"].de || R["Candra"].holdout).rms;
    $("ks-costnote").innerHTML = "These are the Core fit's figures inside DE422 (3000 BCE – 3000 CE); for any other era read the table above. Through the Moon, every Viṃśottarī date moves by about <b>" + (m * 60 * 0.101).toFixed(1) +
      " days</b> on the cycle average (0.101 days of daśā per arcsecond of Moon), and a tithi's end by about " + span(m / 60 / 12.19) +
      ". For comparison, one minute of uncertainty in a birth time moves the Moon about 33″ — so Kālasetu's own error is worth about " +
      (m * 60 / 33).toFixed(0) + " minutes of birth time. Inside 1000–3000 CE the modern engine's Moon is also good to about an arcminute; Kālasetu is " +
      "for the span where nothing else on the site holds.";
  }

  /* ---- how it was built --------------------------------------------------------------------- */
  function built() {
    var n = 0, sets = SETN.map(docOf).filter(Boolean);
    sets.forEach(function (d) { Object.keys(d.params).forEach(function (b) { n += Object.keys(d.params[b]).length; }); });
    var T = D.terms || {};
    $("ks-built").innerHTML = '<ul class="ks-limits">' +
      "<li><b>" + n.toLocaleString("en") + " fitted numbers</b> in three files (<code>kalasetu.json</code>, <code>kalasetu-early.json</code>, <code>kalasetu-deep.json</code>), " +
      "each: corrections on the text's mean motions, each orbit's apogee, eccentricity, node and inclination and their drift, " + T.lunar + " lunar longitude terms and " + T.lunarLat + " latitude terms, " + T.trueNode + " true-node terms, " +
      T.gs + " Jupiter–Saturn terms and " + T.mars + " for Mars; and the IAU 1980 nutation on every graha.</li>" +
      "<li><b>The reference:</b> JPL DE422 from about 3000 BCE to 3000 CE, read from its own Chebyshev coefficients; outside that, a numerical integration of the Sun, Moon and nine planets " +
      "started from DE422's states, with DE422's masses, the Sun's relativistic term, the Earth's oblateness and the Moon's tidal slowing. " +
      sets.map(function (d) { return d.samples.total.toLocaleString("en") + " moments across " + esc(d.span.label); }).join("; ") +
      ", each split by a hash of the instant into halves to fit and to hold back; every accuracy on this page is a held-back half. " +
      "The Moon and true node are fitted on DE422's moments only and carried into the older fits, re-centred.</li>" +
      "<li><b>The optimiser:</b> Levenberg–Marquardt, staged per graha — epoch and bīja first, then the orbit, then everything. The linear amplitudes take " +
      "their derivatives in closed form from the engine itself, which is what makes fitting 172 Jupiter–Saturn terms a matter of seconds.</li>" +
      "<li><b>The check:</b> <code>kalasetu-verify</code> holds every graha under a ceiling on a fresh 1,800 moments across all sixteen millennia, drawn with a " +
      "different seed from every fit's, refuses any 600-year band that runs away from the rest, confirms the frame is engine.js's own to the digit, and that switching the Sūrya " +
      "Siddhānta between its tiers leaves Kālasetu bit-identical.</li>" +
      "<li><b>Generated</b> " + esc(D.generated) + ". The engine is <code>kalasetu-engine.js</code>, standalone, loaded on every page.</li></ul>";
  }

  /* ---- wiring ------------------------------------------------------------------------------------- */
  /* The table, the wheel and the steps follow the moment at once; the three
     span-wide charts (which only move their marker, or sample a year of nodes)
     wait until the moment settles, so scrolling and playing stay smooth. */
  function redrawMoment() {
    sky(); steps();
    clearTimeout(ST.heavy);
    ST.heavy = setTimeout(function () { deltaT(); nodes(); gi(); }, 250);
    if (!ST.scrubbing) resetScrub();
  }

  /* ---- scrolling through time ----------------------------------------------------
     A step moves the CLOCK reading by a calendar unit (a month is a month, not
     30 days), at the place, so the date fields stay on whole days and months;
     the instant follows from the clock as everywhere else on the page. The
     slider reaches N units either side of where it was picked up. */
  var SPAN0 = Date.UTC(-12999, 0, 1), SPAN1 = Date.UTC(3600, 11, 31, 23, 59);
  var REACH = { hour: 72, day: 366, month: 120, year: 200, decade: 120, century: 166 };
  var UNIT_NAME = { hour: ["hour", "hours"], day: ["day", "days"], month: ["month", "months"], year: ["year", "years"],
                    decade: ["decade", "decades"], century: ["century", "centuries"] };
  function shifted(ms, unit, k) {
    var off = offsetAt(ms) * 3600000, t = new Date(ms + off);
    if (unit === "hour") t = new Date(t.getTime() + k * 3600000);
    else if (unit === "day") t.setUTCDate(t.getUTCDate() + k);
    else {
      /* by calendar months, keeping the day where the month has it: 31 January
         plus a month is the last day of February, not 2 March */
      var months = unit === "month" ? k : 12 * k * (unit === "year" ? 1 : unit === "decade" ? 10 : 100);
      var y = t.getUTCFullYear(), m = t.getUTCMonth() + months, day = t.getUTCDate();
      y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
      var last = new Date(Date.UTC(2000, m + 1, 0)); last.setUTCFullYear(y, m + 1, 0);
      var u = new Date(t.getTime()); u.setUTCFullYear(y, m, Math.min(day, last.getUTCDate()));
      t = u;
    }
    var local = t.getTime(), ut = local - offsetAt(local) * 3600000;
    ut = local - offsetAt(ut) * 3600000;
    return Math.max(SPAN0, Math.min(SPAN1, ut));
  }
  function unitNow() { return $("ks-unit").value; }
  function resetScrub() {
    var r = $("ks-scrub"); if (!r) return;
    var n = REACH[unitNow()];
    r.min = -n; r.max = n; r.value = 0; ST.anchor = ST.ms;
    scrubLabel(0);
  }
  function scrubLabel(k) {
    var u = UNIT_NAME[unitNow()], el = $("ks-scrubread"); if (!el) return;
    el.textContent = k === 0 ? "drag to move up to " + REACH[unitNow()] + " " + u[1] + " either way"
      : (k > 0 ? "+" : "−") + Math.abs(k) + " " + (Math.abs(k) === 1 ? u[0] : u[1]) + " from where you started";
  }
  function stepBy(k) {
    var ms = shifted(ST.ms, unitNow(), k);
    if (ms === ST.ms) { stopPlay(); return false; }
    writeWhen(ms); redrawMoment(); return true;
  }
  function stopPlay() {
    if (ST.play) { clearInterval(ST.play); ST.play = null; }
    document.querySelectorAll("[data-ks-play]").forEach(function (b) { b.textContent = "Play"; b.setAttribute("aria-pressed", "false"); });
  }
  function togglePlay() {
    if (ST.play) { stopPlay(); return; }
    document.querySelectorAll("[data-ks-play]").forEach(function (b) { b.textContent = "Pause"; b.setAttribute("aria-pressed", "true"); });
    ST.play = setInterval(function () { if (!stepBy(1)) stopPlay(); }, 400);
  }
  function bind() {
    K = window.KalasetuEngine; D = window.__KALASETU_DATA;
    if (!K || !D || !K.isFitted() || !window.__kEclipModern || !window.__ayanFor || !window.__kNodesModern) {
      $("ks-skytab").innerHTML = '<p class="swfail">The Kālasetu engine or its fitted numbers did not load, so this page has nothing to show.</p>';
      return;
    }
    S = window.SSEngine || null;
    try { if (S && window.__SS_FIT_DATA) { S.setMeasured(window.__SS_FIT_DATA); S.measured(); } } catch (e) { S = null; }
    $("ks-presets").innerHTML = PRESETS.map(function (p, i) { return '<button type="button" class="swbtn" data-ks-preset="' + i + '">' + esc(p[0]) + "</button>"; }).join("");
    $("ks-graha").innerHTML = G.map(function (g) { return '<option value="' + g[0] + '">' + esc(g[0] + " · " + g[1]) + "</option>"; }).join("");
    $("ks-accbody").innerHTML = ROWS.map(function (b) { return '<option value="' + esc(b) + '"' + (b === "Candra" ? " selected" : "") + ">" + esc(b) + "</option>"; }).join("");
    $("ks-erabody").innerHTML = ROWS.map(function (b) { return '<option value="' + esc(b) + '"' + (b === "Śani" ? " selected" : "") + ">" + esc(b) + "</option>"; }).join("");
    /* the fit: Auto everywhere on the site; forcing one here is this page's alone */
    $("ks-fit").addEventListener("change", function () { if (K.use) K.use($("ks-fit").value); redrawMoment(); });
    $("ks-erabody").addEventListener("change", eras);
    $("ks-era").addEventListener("change", function () { $("ks-year").max = $("ks-era").value === "BCE" ? 13000 : 3600; });
    $("ks-groups").innerHTML = GROUPS.map(function (g) { return '<label><input type="checkbox" checked data-ks-group="' + g[0] + '"> ' + esc(g[1]) + "</label>"; }).join("");
    writeWhen(Date.now());
    ["ks-era", "ks-year", "ks-month", "ks-day", "ks-time"].forEach(function (id) {
      $(id).addEventListener("change", function () { readWhen(); redrawMoment(); }); });
    /* changing what the clock means keeps the instant and rewrites the clock */
    $("ks-tmode").addEventListener("change", function () { writeWhen(ST.ms); redrawMoment(); });
    /* changing the place keeps the clock time and moves the instant — a birth
       time is given on the place's own clock */
    function placeChanged() { readWhen(); redrawMoment(); }
    ["ks-lat", "ks-lon"].forEach(function (id) { $(id).addEventListener("change", function () {
      ST.place = { n: "Custom coordinates", lat: latNow(), lon: lonNow(), zone: null };
      if (ST.picker) ST.picker.set(ST.place); placeChanged(); }); });
    if (window.NPlaces && window.NPlaces.picker) {
      ST.picker = window.NPlaces.picker({ host: $("ks-place"), value: ST.place, quick: QUICK, label: "Place",
        refMs: function () { return Date.now(); },
        onPick: function (p) {
          ST.place = { n: p.n, lat: p.lat, lon: p.lon, zone: p.zone || null };
          $("ks-lat").value = (+p.lat).toFixed(4); $("ks-lon").value = (+p.lon).toFixed(4);
          placeChanged();
        } });
    }
    document.addEventListener("click", function (e) {
      var sb = e.target.closest && e.target.closest("[data-ks-step],[data-ks-play]");
      if (sb) { if (sb.hasAttribute("data-ks-play")) togglePlay(); else { stopPlay(); stepBy(+sb.getAttribute("data-ks-step")); } return; }
      var t = e.target.closest && e.target.closest("[data-ks-preset],[data-ks]"); if (!t) return;
      if (t.hasAttribute("data-ks-preset")) { stopPlay(); writeWhen(PRESETS[+t.getAttribute("data-ks-preset")][1]()); redrawMoment(); }
      else if (t.getAttribute("data-ks") === "now") { writeWhen(Date.now()); redrawMoment(); }
      else if (t.getAttribute("data-ks") === "measure") measure();
    });
    $("ks-graha").addEventListener("change", steps);
    $("ks-unit").addEventListener("change", function () { stopPlay(); resetScrub(); });
    var scrub = $("ks-scrub");
    scrub.addEventListener("input", function () {
      stopPlay();
      if (!ST.scrubbing) { ST.scrubbing = true; if (ST.anchor == null) ST.anchor = ST.ms; }
      var k = +scrub.value;
      writeWhen(shifted(ST.anchor, unitNow(), k)); redrawMoment(); scrubLabel(k);
    });
    scrub.addEventListener("change", function () { ST.scrubbing = false; resetScrub(); });
    $("ks-accbody").addEventListener("change", bands);
    $("ks-groups").addEventListener("change", moonTerms);
    tiles(); accTable(); bands(); eras(); cost(); built();
    redrawMoment(); clearTimeout(ST.heavy); deltaT(); nodes(); gi(); moonTerms(); measure();
    window.__ksPage = { setMoment: function (ms) { writeWhen(ms); redrawMoment(); }, measure: measure, moonTerms: moonTerms,
      step: stepBy, eras: eras, useFit: function (m) { $("ks-fit").value = m; if (K.use) K.use(m); redrawMoment(); },
      state: function () { return { ms: ST.ms, place: ST.place, mode: $("ks-tmode").value }; } };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind); else bind();
})();
