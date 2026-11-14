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

  var K = null, D = null, S = null, ST = { ms: Date.now() };

  /* ---- the moment ----------------------------------------------------------- */
  function readWhen() {
    var era = $("ks-era").value, y = Math.max(1, Math.min(3600, +$("ks-year").value || 1));
    var t = ($("ks-time").value || "06:00").split(":");
    var Y = era === "BCE" ? 1 - y : y;
    ST.ms = msFor(Y, +$("ks-month").value || 1, +$("ks-day").value || 1, +t[0] || 0, +t[1] || 0);
  }
  function writeWhen(ms) {
    var d = new Date(ms), Y = d.getUTCFullYear();
    $("ks-era").value = Y <= 0 ? "BCE" : "CE"; $("ks-year").value = Y <= 0 ? 1 - Y : Y;
    $("ks-month").value = d.getUTCMonth() + 1; $("ks-day").value = d.getUTCDate();
    $("ks-time").value = String(d.getUTCHours()).padStart(2, "0") + ":" + String(d.getUTCMinutes()).padStart(2, "0");
    ST.ms = ms;
  }
  var PRESETS = [
    ["The span opens · 1 Jan 3600 BCE", function () { return msFor(-3599, 1, 1, 6, 0); }],
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
  function sky() {
    var ms = ST.ms, rows = [], pos = {};
    G.forEach(function (g) {
      var k = K.longitude(g[0], ms), m = modSid(g[0], ms);
      pos[g[0]] = { k: k, m: m };
      rows.push("<tr><td><b>" + esc(g[0]) + "</b> <span class=\"elw\">" + esc(g[1]) + "</span></td><td>" + inSign(k) +
        "</td><td>" + nakOf(k) + "</td><td>" + inSign(m) + "</td><td class=\"num\">" + am(sdiff(k, m) * 60) + "</td></tr>");
    });
    var tn = K.trueNode(ms), tm = norm(window.__kNodesModern(ms).true - window.__ayanFor("samanvaya_ecliptic", jdOf(ms)));
    rows.push("<tr><td><b>Rāhu</b> <span class=\"elw\">true node</span></td><td>" + inSign(tn) + "</td><td>" + nakOf(tn) +
      "</td><td>" + inSign(tm) + "</td><td class=\"num\">" + am(sdiff(tn, tm) * 60) + "</td></tr>");
    $("ks-skytab").innerHTML = '<div class="eltblwrap"><table class="aytab"><thead><tr><th>graha</th><th>Kālasetu</th>' +
      "<th>nakṣatra · pāda</th><th>modern engine</th><th>difference</th></tr></thead><tbody>" + rows.join("") + "</tbody></table></div>";
    wheel(pos);
    var d = new Date(ms), Y = d.getUTCFullYear(), dt = null;
    try { var t = window.Astronomy.MakeTime(d); dt = (t.tt - t.ut) * 86400; } catch (e) {}
    $("ks-skynote").innerHTML = "<b>" + d.getUTCDate() + " " + ["January", "February", "March", "April", "May", "June", "July",
      "August", "September", "October", "November", "December"][d.getUTCMonth()] + " " + yearLabel(Y) + ", " +
      String(d.getUTCHours()).padStart(2, "0") + ":" + String(d.getUTCMinutes()).padStart(2, "0") + " UT</b> · Samanvaya–Ecliptic ayanāṃśa " +
      dms(window.__ayanFor("samanvaya_ecliptic", jdOf(ms))) +
      (dt != null ? " · ΔT " + (Math.abs(dt) < 600 ? dt.toFixed(0) + " s" : (dt / 3600).toFixed(1) + " hours") : "") +
      " · Kali day " + Math.floor(K.ahargana(ms)).toLocaleString("en") +
      (K.inSpan(ms) ? "" : " · <b>outside the fitted span — no accuracy is claimed here</b>");
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
    var ring = 0;
    G.forEach(function (g, i) {
      var r = 86 - (i % 3) * 18, k = P(pos[g[0]].k, r), m = P(pos[g[0]].m, r);
      h.push('<circle class="ks-mod" cx="' + m[0].toFixed(1) + '" cy="' + m[1].toFixed(1) + '" r="9.5"/>');
      h.push('<circle class="ks-dot" cx="' + k[0].toFixed(1) + '" cy="' + k[1].toFixed(1) + '" r="7.5" style="fill:' + COL[g[0]] + '"/>');
      h.push('<text class="ks-glyph" x="' + k[0].toFixed(1) + '" y="' + (k[1] - 14).toFixed(1) + '">' + g[2] + "</text>");
    });
    h.push("</svg>");
    $("ks-wheel").innerHTML = h.join("") + '<p class="ks-legend"><span>filled: Kālasetu</span><span>ring: modern engine</span>' +
      "<span>Meṣa at the left, counter-clockwise</span></p>";
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
  function tiles() {
    var R = D.residuals;
    $("ks-tiles").innerHTML = ROWS.map(function (b) {
      return R[b] ? '<div class="ks-tile"><b>' + am(R[b].holdout.rms) + "</b><span>" + esc(b === "Rāhu" ? "Rāhu · Ketu (mean)" :
        b === "Rāhu (true)" ? "Rāhu · Ketu (true)" : b) + "</span></div>" : "";
    }).join("") + '<div class="ks-tile"><b>7,200</b><span>years fitted, 3600 BCE – 3600 CE</span></div>';
  }
  function bands() {
    var b = $("ks-accbody").value, R = D.residuals[b]; if (!R || !R.bands) return;
    var W = 640, H = 200, L = 46, B = 34, n = R.bands.length, bw = (W - L - 10) / n;
    var top = Math.max.apply(null, R.bands.map(function (x) { return x.rms; })) * 1.15 || 1;
    var h = ['<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Held-back error by 600-year band">'];
    for (var g = 0; g <= 4; g++) { var v = top * g / 4, y = H - B - (H - B - 10) * g / 4;
      h.push('<line class="ks-ax" x1="' + L + '" y1="' + y + '" x2="' + (W - 6) + '" y2="' + y + '"/><text class="ks-axt" x="' + (L - 4) +
        '" y="' + (y + 3) + '" text-anchor="end">' + v.toFixed(v < 1 ? 2 : 1) + "′</text>"); }
    R.bands.forEach(function (x, i) {
      var hh = (H - B - 10) * x.rms / top, X = L + i * bw + 3;
      h.push('<rect class="ks-bar" x="' + X.toFixed(1) + '" y="' + (H - B - hh).toFixed(1) + '" width="' + (bw - 6).toFixed(1) + '" height="' + hh.toFixed(1) + '"><title>' +
        esc(yearLabel(x.from + 1)) + ": " + x.rms.toFixed(2) + "′ rms, worst " + x.worst.toFixed(1) + "′</title></rect>");
      h.push('<text class="ks-axt" x="' + (X + bw / 2 - 3).toFixed(1) + '" y="' + (H - B + 13) + '" text-anchor="middle">' + esc(yearLabel(x.from + 1).replace(" BCE", "").replace(" CE", "")) + "</text>");
    });
    h.push('<text class="ks-axt" x="' + (L + 6) + '" y="' + (H - 4) + '">BCE ←</text><text class="ks-axt" x="' + (W - 8) + '" y="' + (H - 4) + '" text-anchor="end">→ CE</text>');
    h.push("</svg>");
    $("ks-bands").innerHTML = h.join("");
  }
  function accTable() {
    var R = D.residuals;
    $("ks-acctab").innerHTML = '<div class="eltblwrap"><table class="aytab"><thead><tr><th>graha</th><th>held back, typical</th><th>worst moment</th>' +
      "<th>worst 600-year band</th><th>latitude, typical</th></tr></thead><tbody>" + ROWS.map(function (b) {
        var x = R[b]; if (!x) return "";
        var wb = x.bands ? Math.max.apply(null, x.bands.map(function (q) { return q.rms; })) : null;
        return "<tr><td><b>" + esc(b) + "</b></td><td>" + am(x.holdout.rms) + "</td><td>" + am(x.holdout.worst) + "</td><td>" + am(wb) +
          "</td><td>" + (x.latitude ? am(x.latitude.rms) : "—") + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }
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
      "try a span far from it to see why a fourth engine was needed. Years are astronomical: 0 is 1 BCE, −3599 is 3600 BCE.";
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
    for (var i = 0; i < 160; i++) {
      var y = -3599 + 7199 * (i + 0.5) / 160, Y = Math.floor(y), ms = msFor(Y, 1, 1, 0, 0) + (y - Y) * 365.2425 * 86400000 + ((i * 6007) % 1440) * 60000;
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
      ", the Moon is typically <b>" + (r > 120 ? (r / 60).toFixed(2) + "°" : am(r)) + "</b> from the modern engine across the span" +
      " (160 moments). That is " + (r * 60 * 0.101 < 60 ? (r * 60 * 0.101).toFixed(0) + " days" : (r * 60 * 0.101 / 365.25).toFixed(1) + " years") +
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
  var YT = [-3599, -2399, -1199, 1, 1200, 2400, 3600];
  var GI_CACHE = null;
  function gi() {
    if (!GI_CACHE) {
      GI_CACHE = { sa: [], ju: [] };
      for (var i = 0; i <= 288; i++) {
        var y = -3599 + 7199 * i / 288, Y = Math.floor(y), ms = msFor(Y, 7, 1, 0, 0);
        GI_CACHE.sa.push([y, sdiff(K.longitude("Śani", ms), modSid("Śani", ms)) * 60]);
        GI_CACHE.ju.push([y, sdiff(K.longitude("Guru", ms), modSid("Guru", ms)) * 60]);
      }
    }
    var Y0 = new Date(ST.ms).getUTCFullYear(), all = GI_CACHE.sa.concat(GI_CACHE.ju).map(function (p) { return Math.abs(p[1]); });
    var top = Math.max(5, Math.ceil(Math.max.apply(null, all)));
    lineChart($("ks-gi"), [{ cls: "ks-l1", pts: GI_CACHE.sa }, { cls: "ks-l2", pts: GI_CACHE.ju }],
      { label: "Jupiter and Saturn: Kālasetu minus the modern engine across the span", fy: function (v) { return (Math.abs(v) < 0.05 ? 0 : v).toFixed(1) + "′"; },
        fx: yearLabel, xt: YT, y0: -top, y1: top, mark: Y0 >= -3599 && Y0 <= 3600 ? Y0 : null,
        legend: '<span><i style="background:var(--sem-info,#3f6fa6)"></i>Śani</span><span><i style="background:var(--sem-bad,#a1493a)"></i>Guru (dashed)</span><span>arcminutes; gold line: the moment chosen above</span>' });
    var w = function (a) { return Math.max.apply(null, a.map(function (p) { return Math.abs(p[1]); })); };
    $("ks-ginote").innerHTML = "Over these 289 moments Saturn never strays more than " + am(w(GI_CACHE.sa)) + " from the modern engine and Jupiter " +
      am(w(GI_CACHE.ju)) + ". The great inequality and its companions are carried as about 170 measured terms for each planet. Their sum is what the fit " +
      "measures; individually some of them trade against the orbit itself, so no single term is offered here as a physical size.";
  }
  var DT_CACHE = null;
  function deltaT() {
    if (!DT_CACHE) { DT_CACHE = [];
      for (var i = 0; i <= 240; i++) { var y = -3599 + 7199 * i / 240, ms = msFor(Math.floor(y), 7, 1, 0, 0), h = 0;
        try { var t = window.Astronomy.MakeTime(new Date(ms)); h = (t.tt - t.ut) * 24; } catch (e) {}
        DT_CACHE.push([y, h]); } }
    var Y0 = new Date(ST.ms).getUTCFullYear(), here = null;
    try { var t0 = window.Astronomy.MakeTime(new Date(ST.ms)); here = (t0.tt - t0.ut) * 24; } catch (e) {}
    lineChart($("ks-dt"), [{ cls: "ks-l1", pts: DT_CACHE }],
      { label: "ΔT across the span, in hours", fy: function (v) { return v.toFixed(0) + " h"; }, fx: yearLabel, xt: YT, y0: 0,
        mark: Y0 >= -3599 && Y0 <= 3600 ? Y0 : null });
    $("ks-dtnote").innerHTML = here == null ? "" : "At the moment chosen above, ΔT is <b>" + (Math.abs(here) < 0.2 ? (here * 3600).toFixed(0) + " seconds" :
      here.toFixed(2) + " hours") + "</b>. In that time the Moon moves <b>" + (here / 24 * 13.176).toFixed(here < 0.2 ? 3 : 2) + "°</b> — the size of the error a " +
      "clock without ΔT would carry into every lunar position, tithi and nakṣatra. The curve is the model the modern engine uses (Espenak and Meeus, with " +
      "observed values since 1955); its own uncertainty grows to hours at the ends of the span.";
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
    $("ks-nodenote").innerHTML = "The two curves lie on top of each other: over this year they differ by at most " + am(Math.max.apply(null, dif)) +
      ". The largest swing is the 2D − 2F term, about 1.5°, half a synodic-draconitic cycle of 173 days.";
  }

  /* ---- what it costs -------------------------------------------------------------------- */
  function span(days) { var d = Math.abs(days);
    if (d * 1440 < 1) return "under a minute"; if (d < 1 / 24) return Math.round(d * 1440) + " min";
    if (d < 1.5) return (d * 24).toFixed(1) + " h"; return d.toFixed(1) + " days"; }
  function cost() {
    var R = D.residuals;
    $("ks-cost").innerHTML = '<div class="eltblwrap"><table class="aytab"><thead><tr><th>graha</th><th>typical error</th><th>share of a pāda</th>' +
      "<th>share of a D60 aṃśa</th><th>moves a sign or nakṣatra change by</th></tr></thead><tbody>" + ROWS.map(function (b) {
        var x = R[b]; if (!x) return ""; var e = x.holdout.rms;
        return "<tr><td><b>" + esc(b) + "</b></td><td>" + am(e) + "</td><td>1 ⁄ " + Math.round(200 / e) + "</td><td>1 ⁄ " + (30 / e).toFixed(30 / e < 10 ? 1 : 0) +
          "</td><td>" + span(e / 60 / MEANMOT[b]) + "</td></tr>";
      }).join("") + "</tbody></table></div>";
    var m = R["Candra"].holdout.rms;
    $("ks-costnote").innerHTML = "Through the Moon, every Viṃśottarī date moves by about <b>" + (m * 60 * 0.101).toFixed(1) +
      " days</b> on the cycle average (0.101 days of daśā per arcsecond of Moon), and a tithi's end by about " + span(m / 60 / 12.19) +
      ". For comparison, one minute of uncertainty in a birth time moves the Moon about 33″ — so Kālasetu's own error is worth about " +
      (m * 60 / 33).toFixed(0) + " minutes of birth time. Inside 1000–3000 CE the modern engine's Moon is good to 15″; Kālasetu is " +
      "for the span where nothing else on the site holds.";
  }

  /* ---- how it was built --------------------------------------------------------------------- */
  function built() {
    var n = 0; Object.keys(D.params).forEach(function (b) { n += Object.keys(D.params[b]).length; });
    var T = D.terms || {};
    $("ks-built").innerHTML = '<ul class="ks-limits">' +
      "<li><b>" + n.toLocaleString("en") + " fitted numbers</b> in <code>kalasetu.json</code>: corrections on the text's mean motions, each orbit's apogee, " +
      "eccentricity and drift, " + T.lunar + " lunar longitude terms and " + T.lunarLat + " latitude terms, " + T.trueNode + " true-node terms, " +
      T.gs + " Jupiter–Saturn terms and " + T.mars + " for Mars.</li>" +
      "<li><b>The reference:</b> " + D.samples.total.toLocaleString("en") + " moments spread across " + esc(D.span.label) + ", from the site's modern engine " +
      "with its own ΔT, in the Samanvaya–Ecliptic frame. Split by a hash of the instant into " + D.samples.fit + " to fit and " + D.samples.holdout +
      " held back; every accuracy on this page is the held-back half.</li>" +
      "<li><b>The optimiser:</b> Levenberg–Marquardt, staged per graha — epoch and bīja first, then the orbit, then everything. The linear amplitudes take " +
      "their derivatives in closed form from the engine itself, which is what makes fitting 172 Jupiter–Saturn terms a matter of seconds.</li>" +
      "<li><b>The check:</b> <code>kalasetu-verify</code> draws a fresh 900 moments with a different seed from the fit's, holds every graha under a " +
      "ceiling, refuses any 600-year band that runs away from the rest, confirms the frame is engine.js's own to the digit, and that switching the Sūrya " +
      "Siddhānta between its tiers leaves Kālasetu bit-identical.</li>" +
      "<li><b>Generated</b> " + esc(D.generated) + ". The engine is <code>kalasetu-engine.js</code>, standalone, loaded on every page.</li></ul>";
  }

  /* ---- wiring ------------------------------------------------------------------------------------- */
  function redrawMoment() { sky(); steps(); deltaT(); nodes(); gi(); }
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
    $("ks-groups").innerHTML = GROUPS.map(function (g) { return '<label><input type="checkbox" checked data-ks-group="' + g[0] + '"> ' + esc(g[1]) + "</label>"; }).join("");
    writeWhen(Date.now());
    ["ks-era", "ks-year", "ks-month", "ks-day", "ks-time"].forEach(function (id) {
      $(id).addEventListener("change", function () { readWhen(); redrawMoment(); }); });
    document.addEventListener("click", function (e) {
      var t = e.target.closest && e.target.closest("[data-ks-preset],[data-ks]"); if (!t) return;
      if (t.hasAttribute("data-ks-preset")) { writeWhen(PRESETS[+t.getAttribute("data-ks-preset")][1]()); redrawMoment(); }
      else if (t.getAttribute("data-ks") === "now") { writeWhen(Date.now()); redrawMoment(); }
      else if (t.getAttribute("data-ks") === "measure") measure();
    });
    $("ks-graha").addEventListener("change", steps);
    $("ks-accbody").addEventListener("change", bands);
    $("ks-groups").addEventListener("change", moonTerms);
    tiles(); accTable(); bands(); cost(); built();
    redrawMoment(); moonTerms(); measure();
    window.__ksPage = { setMoment: function (ms) { writeWhen(ms); redrawMoment(); }, measure: measure, moonTerms: moonTerms };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind); else bind();
})();
