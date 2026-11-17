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
  var DAY = 86400000;

  var RS = ["Meṣa", "Vṛṣabha", "Mithuna", "Karka", "Siṃha", "Kanyā", "Tulā", "Vṛścika", "Dhanus", "Makara", "Kumbha", "Mīna"];
  var NAK = ["Aśvinī", "Bharaṇī", "Kṛttikā", "Rohiṇī", "Mṛgaśira", "Ārdrā", "Punarvasu", "Puṣya", "Āśleṣā", "Maghā",
    "Pūrva Phalgunī", "Uttara Phalgunī", "Hasta", "Citrā", "Svātī", "Viśākhā", "Anurādhā", "Jyeṣṭhā", "Mūla",
    "Pūrva Āṣāḍhā", "Uttara Āṣāḍhā", "Śravaṇa", "Dhaniṣṭhā", "Śatabhiṣā", "Pūrva Bhādrapadā", "Uttara Bhādrapadā", "Revatī"];
  /* the site's nakṣatra system (nak-system.js, in engine.js): equal unless the
     reader chose unequal in Settings. The page's own "nearest star" and
     "Abhijit-28" conventions sit on top of it. */
  function NKS(L) { if (window.NNak) return window.NNak.at(L);
    var w = 40 / 3, x = norm(L), i = Math.floor(x / w), f = (x - i * w) / w;
    return { i: i, d: i, start: i * w, end: (i + 1) * w, frac: f, pada: Math.floor(f * 4) + 1 }; }
  function NKE() { if (window.NNak) return window.NNak.edges();
    var o = []; for (var k = 0; k < 27; k++) o.push({ i: k, start: k * 40 / 3, end: (k + 1) * 40 / 3 }); return o; }
  function nakNm(i) { return i === 27 ? "Abhijit" : NAK[i]; }
  function nakOf(L) { var k = NKS(L); return nakNm(k.i) + " " + k.pada; }
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

  /* ---- the conventions --------------------------------------------------------
     Every reading a text is matched against depends on choices no ephemeris
     makes for you. They are explicit here, kept per viewer, and every readout
     follows them. */
  var CONV = { cal: "greg", frame: "samanvaya_ecliptic", node: "mean", nak: "equal", msys: "amanta", mname: "fullmoon", rtu: "lunar" };
  var CONV_KEY = "learnhoro.kalasetu.conventions";
  try { var sv = JSON.parse(localStorage.getItem(CONV_KEY) || "null"); if (sv) for (var ck in CONV) if (sv[ck]) CONV[ck] = sv[ck]; } catch (e) {}
  function saveConv() { try { localStorage.setItem(CONV_KEY, JSON.stringify(CONV)); } catch (e) {} }
  var MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  /* a civil date in the chosen calendar to an instant (the local clock's), and back */
  function toMs(Y, M, D, h, mi) {
    if (CONV.cal !== "jul") return msFor(Y, M, D, h, mi);
    var a = Math.floor((14 - M) / 12), y = Y + 4800 - a, m = M + 12 * a - 3;
    var jdn = D + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
    return (jdn - 0.5 - 2440587.5) * 86400000 + (h * 60 + mi) * 60000;
  }
  function civil(ms, cal) {
    cal = cal || CONV.cal;
    if (cal !== "jul") { var d = new Date(ms); return { Y: d.getUTCFullYear(), M: d.getUTCMonth() + 1, D: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes() }; }
    var jd = ms / 86400000 + 2440587.5, Z = Math.floor(jd + 0.5), F = jd + 0.5 - Z, B = Z + 1524, C = Math.floor((B - 122.1) / 365.25),
        Dd = Math.floor(365.25 * C), E = Math.floor((B - Dd) / 30.6001), mins = Math.round(F * 1440);
    var M = E < 14 ? E - 1 : E - 13;
    return { Y: M > 2 ? C - 4716 : C - 4715, M: M, D: B - Dd - Math.floor(30.6001 * E), h: Math.floor(mins / 60) % 24, mi: mins % 60 };
  }
  function civilText(ms, cal) { var c = civil(ms, cal); return c.D + " " + MON[c.M - 1] + " " + yearLabel(c.Y); }
  /* degrees to ADD to a Samanvaya–Ecliptic longitude to read it in the chosen
     frame. "Citrā by the star" holds Spica at 180° on the date itself, with its
     real motion, rather than by a formula fitted to the present. */
  function shiftOf(ms) {
    var jd = jdOf(ms), sam = window.__ayanFor("samanvaya_ecliptic", jd);
    if (CONV.frame === "lahiri") return sam - window.__ayanFor("lahiri", jd);
    if (CONV.frame === "citra_star") { var y = yogataras(ms), c = y && y.filter(function (q) { return q.nak === "Citrā"; })[0];
      return c ? 180 - c.lon : 0; }
    return 0;
  }
  function ayanNow(ms) { return window.__ayanFor("samanvaya_ecliptic", jdOf(ms)) - shiftOf(ms); }
  var FRAME_NAME = { samanvaya_ecliptic: "Samanvaya–Ecliptic", lahiri: "Lahiri", citra_star: "Citrā-by-the-star" };
  /* the nakṣatra a longitude is "in", under the chosen meaning */
  function nakName(L, ms) {
    L = norm(L);
    if (CONV.nak === "abhijit" && L >= 276 + 40 / 60 && L < 280 + 53 / 60 + 20 / 3600) return "Abhijit";
    if (CONV.nak === "star") {
      var ys = yogataras(ms), S = shiftOf(ms), best = null;
      (ys || []).forEach(function (y) { if (y.nak === "Abhijit") return; var d = Math.abs(sdiff(y.lon + S, L)); if (!best || d < best.d) best = { d: d, y: y }; });
      if (best) return best.y.nak + ' <span class="elw">by ' + esc(best.y.star) + ", " + best.d.toFixed(1) + "° away</span>";
    }
    return nakOf(L);
  }

  /* ---- the moment ----------------------------------------------------------- */
  function readWhen() {
    var era = $("ks-era").value, y = Math.max(1, Math.min(era === "BCE" ? 13000 : 3600, +$("ks-year").value || 1));
    var t = ($("ks-time").value || "06:00").split(":");
    var Y = era === "BCE" ? 1 - y : y;
    var local = toMs(Y, +$("ks-month").value || 1, +$("ks-day").value || 1, +t[0] || 0, +t[1] || 0);
    var ut = local - offsetAt(local) * 3600000;
    ST.ms = local - offsetAt(ut) * 3600000;      /* once more, for a zone whose offset changes that day */
  }
  function writeWhen(ms) {
    var d = civil(ms + offsetAt(ms) * 3600000), Y = d.Y;
    $("ks-era").value = Y <= 0 ? "BCE" : "CE"; $("ks-year").value = Y <= 0 ? 1 - Y : Y;
    $("ks-month").value = d.M; $("ks-day").value = d.D;
    $("ks-time").value = String(d.h).padStart(2, "0") + ":" + String(d.mi).padStart(2, "0");
    ST.ms = ms;
  }
  var PRESETS = [
    ["The span opens · 1 Jan 13000 BCE", function () { return msFor(-12999, 1, 1, 6, 0); }],
    /* EVERY MEṢA GATHERING in 13000 BCE – 3600 CE: the six grahas other than the
       Moon (Sun, Mercury, Venus, Mars, Jupiter, Saturn) all in Meṣa at once —
       seven times in sixteen millennia (searched with this engine, every 3 hours,
       15 Nov 2026). Each preset is the middle of the hours when the Moon joins
       them, if it does, else the middle of the gathering; "+ Rāhu" when Rāhu is
       in Meṣa too (Ketu then in Tulā). On 3 Jan 7016 BCE all seven grahas and
       Rāhu are in Meṣa together for about 42 hours. */
    ["Meṣa gathering · 28 Sep 12556 BCE", function () { return msFor(-12555, 9, 28, 12, 0); }],
    ["Meṣa gathering + Moon · 9 Oct 11465 BCE", function () { return msFor(-11464, 10, 9, 15, 0); }],
    ["Meṣa gathering + Moon + Rāhu · 6 Dec 8785 BCE", function () { return msFor(-8784, 12, 6, 20, 0); }],
    ["Meṣa gathering + Moon + Rāhu · 3 Jan 7016 BCE", function () { return msFor(-7015, 1, 3, 10, 0); }],
    ["Meṣa gathering + Rāhu · 11 Jan 6162 BCE", function () { return msFor(-6161, 1, 11, 0, 0); }],
    ["Meṣa gathering · 29 Mar 232 CE", function () { return msFor(232, 3, 29, 19, 0); }],
    ["Meṣa gathering · 31 May 3589 CE", function () { return msFor(3589, 5, 31, 18, 0); }],
    /* the nearest the sky came, in all sixteen millennia, to every graha but
       Rāhu in Meṣa: Mercury and Mars 1.6° over into Vṛṣabha, the seven non-lunar
       grahas inside 29.9° (searched with this engine, 15 Nov 2026) */
    ["Nearest with Ketu in Meṣa · 15 Oct 12142 BCE", function () { return msFor(-12141, 10, 15, 20, 0); }],
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
  /* since 17 Nov 2026 the Moon and true node are measured against JPL DE431
     over the whole span; nothing is extrapolated unless a set says so */
  function extrapolated(key, ms) {
    if (key !== "Candra" && key !== "Rāhu (true)") return false;
    var f = K.setAt ? K.setAt(ms) : null, d = f && docOf ? docOf(f.set) : null;
    return !!(d && d.moon && d.moon.fitted === false);
  }
  function grade(x) { return x == null ? "" : x < 1 ? "ks-g1" : x < 5 ? "ks-g2" : x < 30 ? "ks-g3" : "ks-g4"; }
  function sky() {
    var ms = ST.ms, rows = [], pos = {}, S = shiftOf(ms);
    ST.shift = S;
    var N = window.__kNodesModern(ms), ay0 = window.__ayanFor("samanvaya_ecliptic", jdOf(ms));
    var nodeK = { mean: norm(K.longitude("Rāhu", ms)), true: norm(K.trueNode(ms)) }, nodeM = { mean: norm(N.mean - ay0), true: norm(N.true - ay0) };
    var other = CONV.node === "true" ? "mean" : "true";
    G.forEach(function (g) {
      var isNode = g[0] === "Rāhu" || g[0] === "Ketu", flip = g[0] === "Ketu" ? 180 : 0;
      var k = norm((isNode ? nodeK[CONV.node] + flip : K.longitude(g[0], ms)) + S), m = norm((isNode ? nodeM[CONV.node] + flip : modSid(g[0], ms)) + S);
      pos[g[0]] = { k: k, m: m };
      rows.push("<tr><td><b>" + esc(g[0]) + "</b> <span class=\"elw\">" + esc(g[1]) + (isNode ? ", " + CONV.node + " node" : "") + "</span></td><td>" + inSign(k) +
        "</td><td>" + nakName(k, ms) + "</td>" + errCell(isNode ? (CONV.node === "true" ? "Rāhu (true)" : "Rāhu") : g[0], ms) + "<td>" + inSign(m) + "</td><td class=\"num\">" + am(sdiff(k, m) * 60) + "</td></tr>");
    });
    var tn = norm(nodeK[other] + S), tm = norm(nodeM[other] + S);
    rows.push("<tr><td><b>Rāhu</b> <span class=\"elw\">" + other + " node, for comparison</span></td><td>" + inSign(tn) + "</td><td>" + nakName(tn, ms) +
      "</td>" + errCell(other === "true" ? "Rāhu (true)" : "Rāhu", ms) + "<td>" + inSign(tm) + "</td><td class=\"num\">" + am(sdiff(tn, tm) * 60) + "</td></tr>");
    var lat = latNow(), lon = lonNow(), asc = null;
    try { asc = norm(window.__kAscTrop(ms, lat, lon) - ay0 + S); } catch (e) {}
    if (asc != null) {
      pos.Lagna = asc;
      rows.push('<tr class="ks-lagrow"><td><b>Lagna</b> <span class="elw">ascendant at the place</span></td><td>' + inSign(asc) +
        "</td><td>" + nakName(asc, ms) + '</td><td class="num">see the note below</td><td>' + inSign(asc) + '</td><td class="num">same method</td></tr>');
    }
    $("ks-skytab").innerHTML = '<div class="eltblwrap"><table class="aytab"><thead><tr><th>graha</th><th>Kālasetu</th>' +
      "<th>nakṣatra · pāda</th><th>error here, measured</th><th>modern engine</th><th>difference</th></tr></thead><tbody>" + rows.join("") + "</tbody></table></div>";
    fitRead();
    wheel(pos);
    /* the date and time as the reader gave them, on the clock "Time is" names;
       UT beside it when that is not UT */
    var mode = $("ks-tmode").value, dl = ms + offsetAt(ms) * 3600000, d = new Date(dl), Y = civil(dl).Y, dt = null;
    try { var t = window.Astronomy.MakeTime(new Date(ms)); dt = (t.tt - t.ut) * 86400; } catch (e) {}
    $("ks-skynote").innerHTML = "<b>" + civilText(dl) + ", " +
      hm(d.getTime()) + (mode === "ut" ? " UT" : mode === "lmt" ? " local mean time" : (ST.zoneFell ? " local mean time" : " clock time")) +
      "</b> <span class=\"elw\">(" + (CONV.cal === "jul" ? "Julian; proleptic Gregorian " + civilText(dl, "greg") : "proleptic Gregorian; Julian " + civilText(dl, "jul")) + ")</span>" +
      "</b> at " + esc(ST.place && ST.place.n ? ST.place.n : "the place") + " (" + lat.toFixed(2) + "°, " + lon.toFixed(2) + "°)" +
      (mode === "ut" ? "" : " = " + hm(ms) + " UT" + (new Date(ms).getUTCDate() !== d.getUTCDate() ? " (" + new Date(ms).getUTCDate() + " " +
        ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][new Date(ms).getUTCMonth()] + ")" : "")) +
      " · " + FRAME_NAME[CONV.frame] + " ayanāṃśa " + dms(ayanNow(ms)) +
      (ST.zoneFell ? " · <b>no time zone existed here then, so local mean time is used</b>" : "") +
      (dt != null ? " · ΔT " + (Math.abs(dt) < 600 ? dt.toFixed(0) + " s" : (dt / 3600).toFixed(1) + " hours") : "") +
      " · Kali day " + Math.floor(K.ahargana(ms)).toLocaleString("en") +
      (K.inSpan(ms) ? "" : " · <b>outside the fitted span — no accuracy is claimed here</b>") +
      (function () { var y = new Date(ms).getUTCFullYear(); return y < -2999 ? " · the Moon here is fitted on JPL DE431's integrated lunar orbit; ΔT, not the Moon, sets the error in the time of day" : ""; })() +
      (function () {
        /* the lagna turns a full circle a day, so ΔT's own uncertainty (see the
           Earth's clock, below) moves it 15° an hour for a clock-time moment */
        var s1 = sigmaMS(Y), s2 = sigmaHuber(Y);
        if (Y >= 1000 || asc == null) return "";
        var hi = Math.max(s1, s2 || 0) / 240, lo = Math.min(s1, s2 == null ? s1 : s2) / 240;
        return ". <b>The lagna for a clock time this far back is uncertain by about ±" + Math.round(lo) + "°" +
          (hi - lo > 2 ? " to ±" + Math.round(hi) + "°" : "") + "</b>, from the Earth's clock alone (ΔT; see below)";
      })();
    panc(ms);
  }
  /* ---- the pañcāṅga under the chosen conventions -------------------------------
     tithi, the lunar month and its name, the ṛtu, and the season the Sun is
     actually in — so a text's "Kārttika full moon" or "in Vasanta" can be read
     both ways and the gap between them seen */
  var LMON = ["Caitra", "Vaiśākha", "Jyaiṣṭha", "Āṣāḍha", "Śrāvaṇa", "Bhādrapada", "Āśvina", "Kārttika", "Mārgaśīrṣa", "Pauṣa", "Māgha", "Phālguna"];
  /* the full moon's nakṣatra names the month: Citrā, Svātī → Caitra; … the usual grouping */
  var NAK2MON = [6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 11, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 6];
  var RTU = ["Vasanta", "Grīṣma", "Varṣā", "Śarad", "Hemanta", "Śiśira"];
  var TNAME = ["Pratipadā", "Dvitīyā", "Tṛtīyā", "Caturthī", "Pañcamī", "Ṣaṣṭhī", "Saptamī", "Aṣṭamī", "Navamī", "Daśamī", "Ekādaśī", "Dvādaśī", "Trayodaśī", "Caturdaśī"];
  function elong(ms) { return norm(K.longitude("Candra", ms) - K.longitude("Sūrya", ms)); }
  /* the instant the elongation reaches tgt (0 new, 180 full), searched back or forward from ms */
  function syzygy(ms, tgt, dir) {
    var step = dir * DAY, t = ms, f = function (x) { return sdiff(elong(x), tgt); }, a = f(t);
    for (var n = 0; n < 40; n++) { var t2 = t + step, b = f(t2);
      if ((dir > 0 ? a < 0 && b >= 0 : a >= 0 && b < 0) && Math.abs(a - b) < 90) {
        var lo = dir > 0 ? t : t2, hi = dir > 0 ? t2 : t;
        for (var k = 0; k < 30; k++) { var mid = (lo + hi) / 2; if (f(mid) < 0) lo = mid; else hi = mid; }
        return (lo + hi) / 2; }
      t = t2; a = b; }
    return null;
  }
  function panc(ms) {
    var el = $("ks-panc"); if (!el) return;
    var S = shiftOf(ms), e = elong(ms), ti = Math.floor(e / 12), sukla = ti < 15;
    var tName = (sukla ? "Śukla " : "Kṛṣṇa ") + (ti % 15 === 14 ? (sukla ? "Pūrṇimā" : "Amāvāsyā") : TNAME[ti % 15]);
    var nm0 = syzygy(ms, 0, -1), nm1 = syzygy(ms + DAY, 0, +1);
    var sunSign = function (t) { return Math.floor(norm(K.longitude("Sūrya", t) + shiftOf(t)) / 30); };
    var monthOf = function (a, b) {          /* the amānta month from new moon a to new moon b */
      if (CONV.mname === "solar") {
        var s0 = sunSign(a), s1 = sunSign(b);
        if (s0 === s1) return { i: (s0 + 1) % 12, adhika: true };     /* no saṅkrānti: adhika of the month to come */
        return { i: s1, adhika: false, ksaya: (s1 - s0 + 12) % 12 > 1 };
      }
      var fm = syzygy(a + DAY, 180, +1);
      var nq = fm ? NKS(norm(K.longitude("Candra", fm) + shiftOf(fm))).d : 0;
      return { i: NAK2MON[nq], adhika: false, fm: fm, nak: NAK[nq] };
    };
    var amM = nm0 && nm1 ? monthOf(nm0, nm1) : null, mon = amM;
    /* pūrṇimānta: the dark fortnight already carries the coming month's name */
    if (amM && CONV.msys === "purnimanta" && !sukla) { var nm2 = syzygy(nm1 + DAY, 0, +1); mon = nm2 ? monthOf(nm1, nm2) : amM; }
    var mText = mon ? (mon.adhika ? "Adhika " : "") + LMON[mon.i] + (mon.ksaya ? " (a kṣaya month falls here)" : "") : "—";
    var trop = norm(K.longitude("Sūrya", ms) + window.__ayanFor("samanvaya_ecliptic", jdOf(ms))), sid = norm(K.longitude("Sūrya", ms) + S);
    var rtuBy = {
      lunar: amM ? RTU[Math.floor(((mon || amM).i) / 2)] : "—",
      sayana330: RTU[Math.floor(norm(trop - 330) / 60)],
      sayana0: RTU[Math.floor(trop / 60)],
      nirayana: RTU[Math.floor(sid / 60)] };
    var season = ["spring (northern)", "summer", "autumn", "winter"][Math.floor(trop / 90)];
    var y = new Date(ms).getUTCFullYear(), soft = y < 1000;
    el.innerHTML = "<b>Pañcāṅga</b> under these conventions: <b>" + tName + "</b> (tithi " + (ti + 1) + ", elongation " + e.toFixed(1) + "°)" +
      " · month <b>" + esc(mText) + "</b> (" + (CONV.msys === "amanta" ? "amānta" : "pūrṇimānta") + ", named by " +
      (CONV.mname === "solar" ? "saṅkrānti" : "the full moon's nakṣatra" + (amM && amM.nak ? ", " + esc(amM.nak) : "")) + ")" +
      " · ṛtu <b>" + rtuBy[CONV.rtu] + "</b>" +
      " <span class=\"elw\">(by lunar month " + rtuBy.lunar + "; sāyana " + rtuBy.sayana330 + "; nirayana " + rtuBy.nirayana + ")</span>" +
      " · the Sun is " + trop.toFixed(1) + "° past the vernal equinox: astronomical " + season +
      (nm0 && nm1 ? " · this lunar month runs " + civilText(nm0) + " – " + civilText(nm1) + " (new moons, UT)" : "") +
      (soft ? ". <b>Before 1000 CE the tithi and the day of a new or full moon carry ΔT's uncertainty"  +
        "; read them as ±1 tithi or more far back.</b>" : "");
  }

  /* ---- the wheel: grahas, rāśis, nakṣatras and their junction stars ---------- */
  /* The 27 yogatāras (junction stars) and Vega for Abhijit, as HYG v3.8 gives
     them: [nakṣatra, star, designation, magnitude, x, y, z (parsecs, J2000
     equatorial), vx, vy, vz (parsecs a year)]. Carried by their full space
     motion — proper motion AND radial velocity — so Arcturus, which moves
     about 8° in thirteen thousand years, is where it was on the date, not
     where it is now. The same stars as the site's star-catalogue.js. */
  var YOGA = [
    ["Aśvinī", "Sheratan", "β Ari", 2.64, 14.752622, 8.063457, 6.389157, -4.43e-06, 7.15e-06, -1.032e-05],
    ["Bharaṇī", "Bharani", "41 Ari", 3.61, 33.287607, 30.498162, 23.26243, 1.49e-06, 2.322e-05, -2.364e-05],
    ["Kṛttikā", "Alcyone", "η Tau", 2.85, 61.664507, 94.489136, 50.483636, 1.16e-06, 2.299e-05, -1.94e-05],
    ["Rohiṇī", "Aldebaran", "α Tau", 0.87, 7.02722, 18.287604, 5.806661, 1.528e-05, 5.709e-05, -2.14e-06],
    ["Mṛgaśīrṣā", "Meissa", "λ Ori", 3.39, 35.907504, 329.702779, 58.086365, 5.44e-06, 3.439e-05, 3.01e-06],
    ["Ārdrā", "Betelgeuse", "α Ori", 0.45, 3.189296, 151.364387, 19.682142, -1.98e-05, 2.068e-05, 1.074e-05],
    ["Punarvasu", "Pollux", "β Gem", 1.16, -4.055465, 8.19518, 4.867171, 2.624e-05, 1.782e-05, -3.1e-07],
    ["Puṣya", "Asellus Australis", "δ Cnc", 3.94, -25.041776, 28.63397, 12.473108, -1.747e-05, 2.502e-05, -3.671e-05],
    ["Āśleṣā", "Ashlesha", "ε Hya", 3.38, -26.198413, 29.410867, 4.431082, 8.24e-06, 5.749e-05, -3.55e-06],
    ["Maghā", "Regulus", "α Leo", 1.36, -21.018857, 11.132218, 5.041397, 8.56e-06, 2.873e-05, 1.84e-06],
    ["Pūrva Phalgunī", "Zosma", "δ Leo", 2.56, -16.442201, 3.337108, 6.280742, 1.259e-05, -1.526e-05, -1.785e-05],
    ["Uttara Phalgunī", "Denebola", "β Leo", 2.14, -10.633926, 0.508011, 2.767546, -6e-08, 2.664e-05, -5.92e-06],
    ["Hasta", "Algorab", "δ Crv", 2.94, -25.316094, -3.317674, -7.57057, -7.2e-06, 2.639e-05, -1.986e-05],
    ["Citrā", "Spica", "α Vir", 0.98, -69.990853, -27.285826, -14.82176, -4.54e-06, 1.516e-05, -1.175e-05],
    ["Svātī", "Arcturus", "α Boo", -0.05, -8.823448, -5.932531, 3.698938, -5.905e-05, 3.22e-05, -0.00010473],
    ["Viśākhā", "Zubenelgenubi", "α² Lib", 2.75, -16.408581, -15.151818, -6.421874, 2.722e-05, 4.135e-05, 5.73e-06],
    ["Anurādhā", "Dschubba", "δ Sco", 2.29, -69.332609, -120.492107, -57.928452, 2.98e-06, 1.787e-05, -2.211e-05],
    ["Jyeṣṭhā", "Antares", "α Sco", 1.06, -58.542602, -140.307591, -75.574766, -3.38e-06, 1.36e-05, -1.574e-05],
    ["Mūla", "Shaula", "λ Sco", 1.62, -16.048583, -138.749793, -105.649898, -5.46e-06, 1.854e-05, -1.843e-05],
    ["Pūrvāṣāḍhā", "Kaus Australis", "ε Sgr", 1.79, 3.817188, -36.057831, -24.812975, -1.129e-05, 2.654e-05, -1.314e-05],
    ["Uttarāṣāḍhā", "Nunki", "σ Sgr", 2.05, 14.950858, -60.794062, -30.937099, 2.7e-07, 1.858e-05, -1.1e-05],
    ["Śravaṇa", "Altair", "α Aql", 0.76, 2.355468, -4.4873, 0.790749, -1.12e-06, 3.087e-05, 5.36e-06],
    ["Dhaniṣṭhā", "Rotanev", "β δ", 3.64, 18.994041, -23.134214, 7.794139, 4.1e-07, 2.746e-05, -1.284e-05],
    ["Śatabhiṣā", "Sadachbia", "γ Aqr", 3.86, 45.635919, -20.880207, -1.215412, -1.067e-05, 3.947e-05, 2.8e-06],
    ["Pūrva Bhādrapadā", "Markab", "α Peg", 2.49, 38.311434, -9.417123, 10.722722, 1.21e-06, 1.217e-05, -9.21e-06],
    ["Uttara Bhādrapadā", "Algenib", "γ Peg", 2.83, 115.664183, 6.687324, 31.442127, 5.04e-06, 3.03e-06, -3.56e-06],
    ["Revatī", "Revati", "ζ Psc", 5.21, 50.128801, 16.707567, 7.027196, -1.12e-06, 3.821e-05, -1.303e-05],
    ["Abhijit", "Vega", "α Lyr", 0.03, 0.960565, -5.908009, 4.809731, 4.76e-06, 1.734e-05, 5.9e-07]
  ];
  var NAKS = ["Aśv", "Bha", "Kṛt", "Roh", "Mṛg", "Ārd", "Pun", "Puṣ", "Āśl", "Mag", "PPh", "UPh", "Has", "Cit", "Svā",
              "Viś", "Anu", "Jye", "Mūl", "PĀṣ", "UĀṣ", "Śra", "Dha", "Śat", "PBh", "UBh", "Rev"];
  var YTCACHE = { key: null, v: null };
  /* each junction star's sidereal longitude on the date, in the page's frame:
     moved along its space motion from J2000, then precessed, nutated and
     aberrated by the modern engine exactly as a graha is, less the ayanāṃśa */
  function yogataras(ms) {
    var key = Math.round(ms / (10 * DAY));
    if (YTCACHE.key === key) return YTCACHE.v;
    var A = window.Astronomy, out = [];
    if (!A || !A.DefineStar) return null;
    var yrs = (ms - Date.UTC(2000, 0, 1, 12)) / DAY / 365.25, ay = window.__ayanFor("samanvaya_ecliptic", jdOf(ms));
    YOGA.forEach(function (s, i) {
      var x = s[4] + s[7] * yrs, y = s[5] + s[8] * yrs, z = s[6] + s[9] * yrs, r = Math.sqrt(x * x + y * y + z * z);
      var ra = ((Math.atan2(y, x) * 12 / Math.PI) + 24) % 24, de = Math.asin(z / r) * 180 / Math.PI;
      try {
        var body = A.Body["Star" + (1 + i % 8)];
        A.DefineStar(body, ra, de, r * 3.26156);
        var e = A.Ecliptic(A.GeoVector(body, new Date(ms), true));
        out.push({ nak: s[0], star: s[1], bayer: s[2], mag: s[3], lon: norm(e.elon - ay), lat: e.elat, i: i });
      } catch (err) { /* a star the engine cannot place is left off, not guessed */ }
    });
    YTCACHE = { key: key, v: out };
    return out;
  }
  var STARNAMES = true;   /* the junction stars' names around the wheel */
  var ABHIJIT = false, MODALL = false, MODLIM = 1;   /* the modern engine's ring: drawn only past 1° unless asked for */
  /* the grahas' relative sizes, the convention the site's other wheels use
     (37-ecliptic-wheel.js): legible, not to scale */
  var ART_R = { Sun: 1.45, Moon: 1.15, Jupiter: 1.25, Saturn: 1.2, Venus: 1.0, Mars: 0.88, Mercury: 0.8, Rahu: 0.8, Ketu: 0.8 };
  function wheel(pos) {
    var W = 360, c = W / 2, R0 = 100, R1 = 122, R2 = 146, h = [];
    var P = function (L, r) { var a = (180 + L) * Math.PI / 180; return [c + r * Math.cos(a), c - r * Math.sin(a)]; };
    var f1 = function (v) { return v.toFixed(1); };
    /* a margin round the wheel for the stars' names */
    var M = STARNAMES ? 74 : 0;
    h.push('<svg viewBox="' + (-M) + " " + (-M) + " " + (W + 2 * M) + " " + (W + 2 * M) + '" role="img" aria-label="The grahas, the rāśis, the 27 nakṣatras and their junction stars on one wheel">');
    [R0, R1, R2].forEach(function (r) { h.push('<circle class="ks-ring" cx="' + c + '" cy="' + c + '" r="' + r + '"/>'); });
    /* Abhijit, between Uttara Āṣāḍhā's last quarter and Śravaṇa's first fifteenth */
    if (ABHIJIT) {
      var a0 = 276 + 40 / 60, a1 = 280 + 53 / 60 + 20 / 3600, A0 = P(a0, R1), A1 = P(a1, R1), B0 = P(a0, R2), B1 = P(a1, R2);
      h.push('<path class="ks-abhijit" d="M' + f1(A0[0]) + "," + f1(A0[1]) + " A" + R1 + "," + R1 + " 0 0 0 " + f1(A1[0]) + "," + f1(A1[1]) +
        " L" + f1(B1[0]) + "," + f1(B1[1]) + " A" + R2 + "," + R2 + " 0 0 1 " + f1(B0[0]) + "," + f1(B0[1]) + ' Z"><title>Abhijit: 276°40′ – 280°53′20″</title></path>');
    }
    for (var s = 0; s < 12; s++) {
      var a = P(s * 30, R0), b = P(s * 30, R1), t = P(s * 30 + 15, (R0 + R1) / 2);
      h.push('<line class="ks-ring" x1="' + f1(a[0]) + '" y1="' + f1(a[1]) + '" x2="' + f1(b[0]) + '" y2="' + f1(b[1]) + '"/>');
      h.push('<text class="ks-sign" x="' + f1(t[0]) + '" y="' + f1(t[1]) + '">' + esc(RS[s].slice(0, 3)) + "</text>");
    }
    /* the divisions as the site's nakṣatra system draws them (equal or unequal) */
    NKE().forEach(function (e) {
      var n = e.i, L0 = e.start, u = P(L0, R1), v = P(L0, R2), tn = P((e.start + e.end) / 2, (R1 + R2) / 2);
      h.push('<line class="ks-nakline" x1="' + f1(u[0]) + '" y1="' + f1(u[1]) + '" x2="' + f1(v[0]) + '" y2="' + f1(v[1]) + '"/>');
      h.push('<text class="ks-nak" x="' + f1(tn[0]) + '" y="' + f1(tn[1]) + '"><title>' + esc(nakNm(n)) + ": " + e.start.toFixed(2) + "° – " +
        e.end.toFixed(2) + "°</title>" + esc(n === 27 ? "Abh" : NAKS[n]) + "</text>");
    });
    /* the junction stars, where they stood on this date; one outside its own
       13°20′ division is marked, since that is where "nakṣatra" as a star and
       "nakṣatra" as a division part company */
    var ys = (yogataras(ST.ms) || []).map(function (y) { var o = {}; for (var q in y) o[q] = y[q]; o.lon = norm(y.lon + (ST.shift || 0)); return o; });
    /* the name runs outward along the star's radius, turned on the left half so it never reads upside down */
    /* "Sanskrit / English": the nakṣatra the star marks, then its Western name;
       where that name is only the Sanskrit one again (Bharani, Ashlesha, Revati),
       the catalogue designation instead */
    var starLabel = function (y) {
      var sanskritAgain = { Bharani: 1, Ashlesha: 1, Revati: 1 };
      return y.nak + " / " + (sanskritAgain[y.star] ? y.bayer : y.star);
    };
    /* names closer than GAP degrees are pushed apart (the star stays where it is) */
    var GAP = 3.6, shown = ys.filter(function (y) { return y.nak !== "Abhijit" || ABHIJIT; }).sort(function (a, b) { return a.lon - b.lon; });
    shown.forEach(function (y) { y.tl = y.lon; });
    for (var it = 0; it < 30; it++) {
      var moved = false;
      for (var j = 0; j < shown.length; j++) {
        var a = shown[j], b = shown[(j + 1) % shown.length], d = sdiff(b.tl, a.tl);
        if (d >= 0 && d < GAP) { var push = (GAP - d) / 2; a.tl -= push; b.tl += push; moved = true; }
      }
      if (!moved) break;
    }
    var nameAt = function (y) {
      if (!STARNAMES) return "";
      var L = y.tl != null ? y.tl : y.lon, q = P(L, R2 + 17), ang = ((-(180 + L)) % 360 + 360) % 360, end = ang > 90 && ang < 270;
      if (end) ang -= 180;
      return '<text class="ks-ytn" x="' + f1(q[0]) + '" y="' + f1(q[1]) + '" text-anchor="' + (end ? "end" : "start") +
        '" transform="rotate(' + f1(ang) + " " + f1(q[0]) + " " + f1(q[1]) + ')">' + esc(starLabel(y)) + "</text>";
    };
    ys.forEach(function (y) {
      if (y.nak === "Abhijit" && !ABHIJIT) return;
      var own = y.nak === "Abhijit" ? true : NKS(y.lon).i === y.i, k0 = P(y.lon, R2), k1 = P(y.lon, R2 + 6), sp = P(y.lon, R2 + 11);
      var where = nakNm(NKS(y.lon).i);
      h.push('<g class="ks-yt' + (own ? "" : " out") + '"><title>' + esc(y.nak + " · " + y.star + " (" + y.bayer + ", mag " + y.mag.toFixed(1) + ") · " +
        y.lon.toFixed(2) + "°, latitude " + y.lat.toFixed(1) + "° · " + (y.nak === "Abhijit" ? "Abhijit's star" : own ? "inside its own division" :
        "outside its own division: it stands in " + where)) + "</title>" +
        '<line x1="' + f1(k0[0]) + '" y1="' + f1(k0[1]) + '" x2="' + f1(k1[0]) + '" y2="' + f1(k1[1]) + '"/>' + star(sp[0], sp[1], y.mag < 1.5 ? 4.4 : 3.4) + nameAt(y) + "</g>");
    });
    if (pos.Lagna != null) {
      var la = P(pos.Lagna, 26), lb = P(pos.Lagna, R0), lt = P(pos.Lagna, R0 - 9);
      h.push('<line class="ks-asc" x1="' + f1(la[0]) + '" y1="' + f1(la[1]) + '" x2="' + f1(lb[0]) + '" y2="' + f1(lb[1]) + '"/>');
      h.push('<text class="ks-glyph ks-asct" x="' + f1(lt[0]) + '" y="' + f1(lt[1]) + '">As</text>');
    }
    /* the grahas: the site's lit surfaces (bodies.js, the same sprites Kundli
       and the workstation draw), the Moon in its real phase, Rāhu and Ketu as
       shadow discs; a lettered disc if the sprites cannot load. Crowding is
       resolved by stacking inward, never by sliding a graha along the ring,
       so each one's bearing from the centre stays its longitude. */
    var art = !!(window.NSprite && window.NSprite.ready()), LANES = [88, 72, 57, 43, 30, 18];
    var phase = norm(pos["Candra"].k - pos["Sūrya"].k);
    var order = G.slice().sort(function (p, q) { return pos[p[0]].k - pos[q[0]].k; });
    /* pack at full size; if a crowd (a gathering of seven in one rāśi) cannot
       be placed without overlap, shrink every surface a step and pack again */
    function pack(sc) {
      var out = [], clash = false;
      order.forEach(function (g) {
        var L = pos[g[0]].k, rr = 9 * sc * (ART_R[g[1]] || 1), lane = 0, ok = false;
        for (; lane < LANES.length; lane++) {
          /* clear of every graha already placed, in any lane: surface to
             surface, with room for the label that sits above each */
          var k = P(L, LANES[lane]);
          if (out.every(function (o) { var q = P(o.L, o.r), dx = q[0] - k[0], dy = q[1] - k[1];
                return Math.sqrt(dx * dx + dy * dy) > rr + o.rr + 10; })) { ok = true; break; }
        }
        if (!ok) { clash = true; lane = LANES.length - 1; }
        out.push({ g: g, L: L, rr: rr, r: LANES[lane] });
      });
      return { out: out, clash: clash };
    }
    var packed = null, modN = 0;
    [1, 0.82, 0.68, 0.56].some(function (sc) { packed = pack(sc); return !packed.clash; });
    packed.out.forEach(function (q) {
      var g = q.g, L = q.L, rr = q.rr, r = q.r, k = P(L, r), m = P(pos[g[0]].m, r);
      var src = art ? window.NSprite.href(g[1], Math.max(6, rr), g[1] === "Moon" ? phase : null) : null;
      var tip = esc(g[0] + " (" + g[1] + ") · " + inSign(L).replace(/<[^>]+>/g, "") + " · " + nakOf(L));
      h.push('<g class="ks-graha"><title>' + tip + "</title>");
      /* the modern engine's place for the same graha, drawn only where it says
         something: past MODLIM, or always if the reader asks to compare */
      var d = isFinite(pos[g[0]].m) ? ((pos[g[0]].m - L + 540) % 360) - 180 : NaN;
      if (isFinite(d) && (MODALL || Math.abs(d) > MODLIM)) {
        modN += Math.abs(d) > MODLIM ? 1 : 0;
        var dx = m[0] - k[0], dy = m[1] - k[1], dd = Math.sqrt(dx * dx + dy * dy);
        if (dd > 2 * rr + 2.5) {
          var ux = dx / dd, uy = dy / dd;
          h.push('<line class="ks-modln" x1="' + f1(k[0] + ux * rr) + '" y1="' + f1(k[1] + uy * rr) + '" x2="' + f1(m[0] - ux * (rr + 2.5)) +
            '" y2="' + f1(m[1] - uy * (rr + 2.5)) + '"/>');
        }
        h.push('<circle class="ks-mod" cx="' + f1(m[0]) + '" cy="' + f1(m[1]) + '" r="' + f1(rr + 2.5) + '"/>');
        /* the label sits beyond the ring, on the side away from Kālasetu's image */
        var lx = dd > 0.01 ? dx / dd : 1, ly = dd > 0.01 ? dy / dd : 0;
        if (Math.abs(d) > MODLIM) h.push('<text class="ks-modk" text-anchor="' + (lx >= 0 ? "start" : "end") + '" x="' + f1(m[0] + lx * (rr + 4.5)) +
          '" y="' + f1(m[1] + ly * (rr + 4.5) + 2) + '">' +
          (d > 0 ? "+" : "−") + Math.abs(d).toFixed(1) + "°</text>");
      }
      if (src) h.push('<image class="ks-dot ks-art" href="' + src + '" x="' + f1(k[0] - rr) + '" y="' + f1(k[1] - rr) + '" width="' + f1(2 * rr) +
        '" height="' + f1(2 * rr) + '"/>');
      else h.push('<circle class="ks-dot" cx="' + f1(k[0]) + '" cy="' + f1(k[1]) + '" r="' + f1(Math.min(7.5, rr)) + '" style="fill:' + COL[g[0]] + '"/>');
      h.push('<text class="ks-glyph" x="' + f1(k[0]) + '" y="' + f1(k[1] - rr - 5) + '">' + g[2] + "</text></g>");
    });
    h.push("</svg>");
    var outN = ys.filter(function (y) { return y.nak !== "Abhijit" && NKS(y.lon).i !== y.i; }).length;
    $("ks-wheel").innerHTML = h.join("") + '<p class="ks-legend"><span>image: Kālasetu</span><span>' + (modN ? "dotted ring: the modern engine, drawn where it differs by more than 1°, with the difference (" + modN + ")" :
      "the modern engine agrees within 1° for every graha") + "</span>" +
      "<span>As: the lagna</span><span>Meṣa at the left, counter-clockwise</span>" +
      '<span><b class="ks-ytk">✦</b> the 27 junction stars on this date' + (outN ? " — <b class=\"ks-ytk out\">✦</b> " + outN + " stand outside their own division" : "") + "</span>" +
      '<label class="ks-abhi"><input type="checkbox" id="ks-abhijit"' + (ABHIJIT ? " checked" : "") + "> show Abhijit</label>" +
      '<label class="ks-abhi"><input type="checkbox" id="ks-starnames"' + (STARNAMES ? " checked" : "") + "> star names</label>" +
      '<label class="ks-abhi"><input type="checkbox" id="ks-modall"' + (MODALL ? " checked" : "") + "> compare every graha with the modern engine</label></p>";
    var cb = $("ks-abhijit"); if (cb) cb.onchange = function () { ABHIJIT = cb.checked; wheel(pos); };
    var cm = $("ks-modall"); if (cm) cm.onchange = function () { MODALL = cm.checked; wheel(pos); };
    var cn = $("ks-starnames"); if (cn) cn.onchange = function () { STARNAMES = cn.checked; wheel(pos); };
  }
  /* a four-pointed star, so a junction star reads as a star and not a graha */
  function star(x, y, r) {
    var q = r * 0.36, pts = [[x, y - r], [x + q, y - q], [x + r, y], [x + q, y + q], [x, y + r], [x - q, y + q], [x - r, y], [x - q, y - q]];
    return '<polygon points="' + pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '"/>';
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
        b === "Rāhu (true)" ? "Rāhu · Ketu (true)" : b) + (b === "Rāhu" ? ", against the published polynomial" : b === "Candra" || b === "Rāhu (true)" ? ", against JPL DE431" : ", against DE422") + "</span></div>" : "";
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
          /* the Moon is measured against DE431 in every set */
          var q = lunar && x.de ? x.de : x.holdout;
          return '<td class="' + grade(q.rms) + '">' + am(q.rms) + ' <span class="elw">worst ' + am(q.worst) +
            (spread ? " · spread, not measured" : lunar && x.de ? " · vs DE431" : "") + "</span></td>"; }).join("") +
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
        var basis = ex ? "nothing independent: the spread between two extrapolations" : (b === "Candra" || b === "Rāhu (true)" ? "JPL DE431" : y >= -2999 && y <= 2999 ? "JPL DE422" :
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
  /* ---- checked against recorded history ----------------------------------------
     Records whose dates historians fix without any ephemeris. An eclipse is
     reproduced when a syzygy falls on the recorded day with the Moon near the
     ecliptic (|β| under about 1° for a central solar eclipse at the right place,
     under 0.5° for a total lunar one) and the body is above the horizon there. */
  var HIST = [
    { name: "Bur-Sagale solar eclipse", src: "Assyrian eponym list, year of Bur-Sagale", kind: "solar", d: [-762, 6, 15], lat: 35.46, lon: 43.26, at: "Assur", rec: "total" },
    { name: "Earliest eclipse in Ptolemy's Almagest", src: "Almagest IV.6, Mardokempad year 1, from Babylonian records", kind: "lunar", d: [-720, 3, 19], lat: 32.55, lon: 44.42, at: "Babylon", rec: "total" },
    { name: "Thales' eclipse", src: "Herodotus I.74, the battle of the Halys", kind: "solar", d: [-584, 5, 28], lat: 39.8, lon: 34.6, at: "central Anatolia", rec: "total, day turned to night" },
    { name: "The eclipse before Gaugamela", src: "Arrian III.7, Plutarch, Alexander 31", kind: "lunar", d: [-330, 9, 20], lat: 36.36, lon: 43.25, at: "near Arbela", rec: "total" },
    { name: "Babylonian total solar eclipse", src: "Babylonian astronomical diary, BM 34034", kind: "solar", d: [-135, 4, 15], lat: 32.55, lon: 44.42, at: "Babylon", rec: "total" }
  ];
  function julMs(Y, M, D) { var a = Math.floor((14 - M) / 12), y = Y + 4800 - a, m = M + 12 * a - 3;
    return (D + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083 - 0.5 - 2440587.5) * 86400000; }
  function history() {
    var host = $("ks-history"); if (!host) return;
    var A = window.Astronomy, rows = [];
    HIST.forEach(function (h) {
      var t = syzygy(julMs(h.d[0], h.d[1], h.d[2]) - 2 * DAY, h.kind === "solar" ? 0 : 180, +1);
      if (t == null) return;
      var beta = K.latitude("Candra", t), alt = null, dT = null;
      try { var ob = new A.Observer(h.lat, h.lon, 0), at = A.MakeTime(new Date(t)), eq = A.Equator(h.kind === "solar" ? A.Body.Sun : A.Body.Moon, at, ob, true, true);
        alt = A.Horizon(at, ob, eq.ra, eq.dec).altitude; dT = (at.tt - at.ut) * 24; } catch (e) {}
      var y = new Date(t).getUTCFullYear(), sg = Math.min(sigmaMS(y), sigmaHuber(y) == null ? 1e9 : sigmaHuber(y)) / 3600;
      var sameDay = civil(t, "jul").D === h.d[2] || Math.abs(t - julMs(h.d[0], h.d[1], h.d[2]) - DAY / 2) < 1.5 * DAY;
      var ok = sameDay && Math.abs(beta) < (h.kind === "solar" ? 1.0 : 0.5) && (alt == null || alt > -1);
      var lmt = ((new Date(t).getUTCHours() + new Date(t).getUTCMinutes() / 60 + h.lon / 15) % 24 + 24) % 24;
      rows.push("<tr><td><b>" + esc(h.name) + "</b><br><span class=\"elw\">" + esc(h.src) + "</span></td><td>" + esc(civilText(julMs(h.d[0], h.d[1], h.d[2]), "jul")) +
        "<br><span class=\"elw\">" + esc(h.rec) + ", " + esc(h.at) + "</span></td><td>" + (h.kind === "solar" ? "new moon " : "full moon ") + esc(civilText(t, "jul")) +
        ", about " + Math.floor(lmt) + ":" + String(Math.round((lmt % 1) * 60)).padStart(2, "0") + " local time" + "</td><td class=\"num\">" + beta.toFixed(2) + "°</td><td class=\"num\">" +
        (alt == null ? "—" : alt.toFixed(0) + "°") + '</td><td class="num">' + (dT == null ? "—" : dT.toFixed(1) + " h ± " + sg.toFixed(1) + " h") +
        '</td><td class="' + (ok ? "ks-g1" : "ks-g4") + '">' + (ok ? "reproduced" : "not reproduced") + "</td></tr>");
    });
    /* Jupiter and Saturn in 7 BCE: three conjunctions in one year, in Mīna */
    var conj = [], prev = null;
    for (var t = julMs(-6, 1, 1); t < julMs(-5, 3, 1); t += DAY) {
      var dd = sdiff(K.longitude("Guru", t), K.longitude("Śani", t));
      if (prev != null && (prev < 0) !== (dd < 0) && Math.abs(dd) < 5) conj.push(t);
      prev = dd; }
    var S = shiftOf(julMs(-6, 6, 1));
    rows.push("<tr><td><b>The triple conjunction of 7 BCE</b><br><span class=\"elw\">Jupiter and Saturn three times in one year; the modern reconstruction (Kepler onward) " +
      "dates them about 29 May, 1 October and 5 December</span></td><td>7 BCE<br><span class=\"elw\">three conjunctions in Pisces</span></td><td>" +
      conj.map(function (c) { return esc(civilText(c, "jul")); }).join(", ") + '</td><td class="num" colspan="3">in ' +
      (conj.length ? inSign(norm(K.longitude("Guru", conj[0]) + S)).replace(/<[^>]+>/g, "") : "—") + "</td><td class=\"" + (conj.length === 3 ? "ks-g1" : "ks-g4") + "\">" +
      (conj.length === 3 ? "reproduced" : "not reproduced") + "</td></tr>");
    /* the tradition's own premise at the Kali epoch: every mean graha at Meṣa 0° */
    var tk = (588465.5 - 2440587.5) * 86400000, Sk = shiftOf(tk), Lk = ["Sūrya", "Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani"].map(function (b) { return norm(K.longitude(b, tk) + Sk); });
    var srt = Lk.slice().sort(function (a, b) { return a - b; }), span = 360, from = 0, to = 0;
    for (var i = 0; i < srt.length; i++) { var nx = i === srt.length - 1 ? srt[0] + 360 : srt[i + 1], gap = nx - srt[i];
      if (360 - gap < span) { span = 360 - gap; from = norm(nx); to = srt[i]; } }
    rows.push("<tr><td><b>The Kali epoch</b><br><span class=\"elw\">The Sūrya Siddhānta's premise: every mean graha together at Meṣa 0° at midnight, Laṅkā, " +
      "18 Feb 3102 BCE</span></td><td>18 February 3102 BCE<br><span class=\"elw\">a computed epoch, not an observation</span></td><td>the seven true grahas lie within " +
      span.toFixed(0) + "°, from " + inSign(from).replace(/<[^>]+>/g, "") + " to " + inSign(to).replace(/<[^>]+>/g, "") +
      '</td><td class="num" colspan="3">—</td><td class="ks-g2">a loose gathering about Meṣa 0°, not a conjunction at it</td></tr>');
    host.innerHTML = '<div class="eltblwrap"><table class="aytab"><thead><tr><th>event</th><th>the record</th><th>Kālasetu</th><th>Moon from the ecliptic</th>' +
      "<th>altitude there</th><th>ΔT then</th><th>verdict</th></tr></thead><tbody>" + rows.join("") + "</tbody></table></div>";
    $("ks-historynote").innerHTML = "These records lie in 763 – 7 BCE, inside DE422's span; the Moon everywhere is measured against JPL DE431. " +
      "A caveat: ΔT for these centuries was itself worked out from eclipse records like these, so the time of day is not an independent test; " +
      "the day, and the Moon's distance from the ecliptic that makes it an eclipse at all, are. " +
      "Before 3000 BCE no written record survives that dates itself independently, so the deep fits are checked against the integration " +
      "and DE422 (the tables above), not against observations. The Kali-epoch row tests the tradition, not the engine: the Siddhānta's " +
      "grand conjunction at Meṣa 0° is a construction of its mean motions; the sky Kālasetu reconstructs for that night has the seven grahas " +
      "gathered loosely about Meṣa 0°, within " + span.toFixed(0) + "°, with Saturn furthest back.";
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
      "The Moon and true node in every set are fitted on JPL DE431 (Folkner et al. 2014, an integrated lunar orbit with the tidal dissipation, 13201 BCE – 17191 CE), read from the Swiss Ephemeris files; it differs from DE422's Moon by about 4′ at 3000 BCE. The Moon and node take the Sun's frame tilt, the correction for an ecliptic of date that is itself extrapolated before 3000 BCE.</li>" +
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
  /* ---- the claim search ----------------------------------------------------------
     A claim from the catalogue (the "Kālasetu Claim Catalogue" sheet), or one the
     reader builds, is a list of exact conditions. Each reading of a catalogue
     claim is searched on its own and never merged with another. The search walks
     the range one condition at a time, slowest graha first, and keeps only the
     stretches where that condition holds; every later, faster condition is
     looked for only inside them. A condition that is false says how far its
     graha is from making it true, so the walk skips ahead by that distance over
     the graha's fastest motion and never steps over a match. Everything runs in
     this browser; a reader's own claim is kept only if they tick the box, and
     then only in their own browser. */
  var CL_RS = RS, CL_NAKX = NAK.concat(["Abhijit"]);
  var VMAX = { "Sūrya": 1.03, "Candra": 15.6, "Maṅgala": 0.8, "Budha": 2.25, "Guru": 0.25, "Śukra": 1.3, "Śani": 0.14, "Rāhu": 0.25, "Ketu": 0.25 };
  var STEP = { "Sūrya": 1, "Candra": 0.1, "Maṅgala": 1, "Budha": 0.5, "Guru": 4, "Śukra": 1, "Śani": 4, "Rāhu": 4, "Ketu": 4 };
  /* the usual exaltation and own signs of the seven; the nodes have none here, as sources disagree on them */
  var EXALT = { "Sūrya": 0, "Candra": 1, "Maṅgala": 9, "Budha": 5, "Guru": 3, "Śukra": 11, "Śani": 6 };
  var OWN = { "Sūrya": [4], "Candra": [3], "Maṅgala": [0, 7], "Budha": [2, 5], "Guru": [8, 11], "Śukra": [1, 6], "Śani": [9, 10] };
  var GN = G.map(function (g) { return g[0]; });
  /* the catalogue's searchable readings; the ids, references and wording follow
     the sheet. Claims no search can test stay in the sheet and are not offered here. */
  var CLAIMS = [
    { id: "C01", event: "Before the war: Karṇa tells Kṛṣṇa the omens, after the peace embassy fails", ref: "MBh 5.141.7", sky: "Saturn afflicts Rohiṇī", readings: [
      { id: "A", label: "Śani inside Rohiṇī's division", conds: [{ g: "Śani", rel: "nak", v: 3 }] },
      { id: "B", label: "Śani within 5° of Aldebaran, Rohiṇī's junction star", conds: [{ g: "Śani", rel: "nearstar", v: 3, tol: 5 }] }] },
    { id: "C02", event: "Before the war: Karṇa tells Kṛṣṇa the omens, after the peace embassy fails", ref: "MBh 5.141.8", sky: "Mars retrograde at Jyeṣṭhā, moving toward Anurādhā", readings: [
      { id: "A", label: "Maṅgala turns retrograde in Jyeṣṭhā", conds: [{ g: "Maṅgala", rel: "station", v: 17 }] },
      { id: "B", label: "Maṅgala retrograde in Jyeṣṭhā, then retrograde in Anurādhā within 120 days", mode: "within", days: 120,
        conds: [{ g: "Maṅgala", rel: "retro", v: 17 }, { g: "Maṅgala", rel: "retro", v: 16 }] }] },
    { id: "C03", event: "Before the war: Karṇa tells Kṛṣṇa the omens, after the peace embassy fails", ref: "MBh 5.141.9", sky: "A graha afflicts Citrā", readings: [
      { id: "A", label: "any graha in Citrā (the results say which)", conds: [{ g: "any", rel: "nak", v: 13 }] }] },
    { id: "C04", event: "Before the war: Karṇa tells Kṛṣṇa the omens, after the peace embassy fails", ref: "MBh 5.141.10", sky: "Rāhu will approach the Sun", readings: [
      { id: "A", label: "a solar eclipse (somewhere on Earth)", conds: [{ g: "", rel: "eclipse", v: "solar" }] },
      { id: "B", label: "eclipse season: Sūrya within 18° of Rāhu or Ketu", conds: [{ g: "Sūrya", rel: "nearnode", tol: 18 }] }] },
    { id: "C05", event: "Eve of the Kurukṣetra war: Vyāsa tells Dhṛtarāṣṭra the omens", ref: "MBh 6.2.23", sky: "Moon fire-coloured on the Kārttika full moon", readings: [
      { id: "A", label: "a lunar eclipse in Kārttika", conds: [{ g: "", rel: "month", v: 7 }, { g: "", rel: "eclipse", v: "lunar" }] }] },
    { id: "C06", event: "Eve of the Kurukṣetra war: Vyāsa tells Dhṛtarāṣṭra the omens", ref: "MBh 6.2.32", sky: "Saturn stands afflicting Rohiṇī (as C01)", readings: [
      { id: "A", label: "Śani inside Rohiṇī's division", conds: [{ g: "Śani", rel: "nak", v: 3 }] },
      { id: "B", label: "Śani within 5° of Aldebaran", conds: [{ g: "Śani", rel: "nearstar", v: 3, tol: 5 }] }] },
    { id: "C07", event: "Eve of the Kurukṣetra war: Vyāsa tells Dhṛtarāṣṭra the omens", ref: "MBh 6.3.11", sky: "Rāhu seized the Sun; a white graha has passed beyond Citrā", readings: [
      { id: "A", label: "a solar eclipse, and Śukra in Svātī, within 30 days", mode: "within", days: 30,
        conds: [{ g: "", rel: "eclipse", v: "solar" }, { g: "Śukra", rel: "nak", v: 14 }] },
      { id: "B", label: "a solar eclipse, and Ketu in Svātī, within 30 days", mode: "within", days: 30,
        conds: [{ g: "", rel: "eclipse", v: "solar" }, { g: "Ketu", rel: "nak", v: 14 }] }] },
    { id: "C09", event: "Eve of the Kurukṣetra war: Vyāsa tells Dhṛtarāṣṭra the omens", ref: "MBh 6.3.13", sky: "Mars retrograde in Maghā; Jupiter in Śravaṇa", readings: [
      { id: "A", label: "Maṅgala retrograde in Maghā while Guru is in Śravaṇa", conds: [{ g: "Maṅgala", rel: "retro", v: 9 }, { g: "Guru", rel: "nak", v: 21 }] }] },
    { id: "C10", event: "Eve of the Kurukṣetra war: Vyāsa tells Dhṛtarāṣṭra the omens", ref: "MBh 6.3.14", sky: "Saturn afflicts Pūrva Phalgunī; Venus on Pūrva Bhādrapadā", readings: [
      { id: "A", label: "Śani in Pūrva Phalgunī while Śukra is in Pūrva Bhādrapadā", conds: [{ g: "Śani", rel: "nak", v: 10 }, { g: "Śukra", rel: "nak", v: 24 }] },
      { id: "B", label: "Śani in Pūrva Phalgunī while Śukra is in Uttara Bhādrapadā", conds: [{ g: "Śani", rel: "nak", v: 10 }, { g: "Śukra", rel: "nak", v: 25 }] }] },
    { id: "C11", event: "Eve of the Kurukṣetra war: Vyāsa tells Dhṛtarāṣṭra the omens", ref: "MBh 6.3.17", sky: "Mars makes vakra-anuvakra in Śravaṇa", readings: [
      { id: "A", label: "Maṅgala retrograde in Śravaṇa", conds: [{ g: "Maṅgala", rel: "retro", v: 21 }] }] },
    { id: "C12", event: "Eve of the Kurukṣetra war: Vyāsa tells Dhṛtarāṣṭra the omens", ref: "MBh 6.3.25", sky: "Jupiter and Saturn near Viśākhā", readings: [
      { id: "A", label: "Guru and Śani both within 6° of Zubenelgenubi, Viśākhā's junction star",
        conds: [{ g: "Śani", rel: "nearstar", v: 15, tol: 6 }, { g: "Guru", rel: "nearstar", v: 15, tol: 6 }] },
      { id: "B", label: "Guru within 6° of Śani, both in Viśākhā's division",
        conds: [{ g: "Śani", rel: "nak", v: 15 }, { g: "Guru", rel: "nak", v: 15 }, { g: "Guru", rel: "neargraha", v: "Śani", tol: 6 }] }] },
    { id: "C14", event: "Eve of the Kurukṣetra war: Vyāsa tells Dhṛtarāṣṭra the omens", ref: "MBh 6.3.28–29", sky: "Sun and Moon both eclipsed in one month", readings: [
      { id: "A", label: "a lunar and a solar eclipse within 15 days", mode: "within", days: 15,
        conds: [{ g: "", rel: "eclipse", v: "lunar" }, { g: "", rel: "eclipse", v: "solar" }] }] },
    { id: "C15", event: "After the war: Vyāsa fixes Yudhiṣṭhira's consecration for the Aśvamedha", ref: "MBh 14.71.4", sky: "Caitra full moon", readings: [
      { id: "A", label: "Pūrṇimā in Caitra (recurs every year: useful once a year is fixed)", conds: [{ g: "", rel: "month", v: 0 }, { g: "", rel: "tithi", v: 15 }] }] },
    { id: "C16", event: "After the war: the Aśvamedha horse turns home; Yudhiṣṭhira fixes the day and readies the sacrifice", ref: "MBh 14.86.4, 14.86.8", sky: "Māgha dvādaśī; Māgha full moon", readings: [
      { id: "A", label: "Śukla Dvādaśī in Māgha (yearly)", conds: [{ g: "", rel: "month", v: 10 }, { g: "", rel: "tithi", v: 12 }] },
      { id: "B", label: "Pūrṇimā in Māgha (yearly)", conds: [{ g: "", rel: "month", v: 10 }, { g: "", rel: "tithi", v: 15 }] }] },
    { id: "C18", event: "Śuka's prophecy to Parīkṣit: the sign that the Kṛta age returns", ref: "Bhāgavata 12.2.24", sky: "Moon, Sun, Tiṣya and Jupiter in one rāśi", readings: [
      { id: "A", label: "new moon with Sūrya, Candra and Guru in Karka (the rāśi holding Puṣya)",
        conds: [{ g: "Guru", rel: "rasi", v: 3 }, { g: "Sūrya", rel: "rasi", v: 3 }, { g: "", rel: "tithi", v: 30 }, { g: "Candra", rel: "rasi", v: 3 }] },
      { id: "B", label: "Sūrya, Candra and Guru all in Puṣya",
        conds: [{ g: "Guru", rel: "nak", v: 7 }, { g: "Sūrya", rel: "nak", v: 7 }, { g: "Candra", rel: "nak", v: 7 }] }] },
    /* the Vālmīki Rāmāyaṇa: the Baroda Critical Edition (GRETIL, Tokunaga/Smith),
       except R01, which that edition leaves out and the vulgate gives */
    { id: "R01", event: "Rāma's birth", ref: "Rāmāyaṇa 1.18.8–10 (vulgate; not in the critical edition)", sky: "Caitra navamī, Punarvasu, five grahas exalted, Guru with the Moon", readings: [
      { id: "A", label: "the five exalted (Sūrya, Maṅgala, Guru, Śukra, Śani), Candra in Punarvasu in Karka, Śukla Navamī of Caitra (the Karka lagna needs a clock time, so it is not searched)",
        conds: [{ g: "Śani", rel: "exalt" }, { g: "Guru", rel: "exalt" }, { g: "Maṅgala", rel: "exalt" }, { g: "Śukra", rel: "exalt" }, { g: "Sūrya", rel: "exalt" },
                { g: "", rel: "month", v: 0 }, { g: "", rel: "tithi", v: 9 }, { g: "Candra", rel: "nak", v: 6 }, { g: "Candra", rel: "rasi", v: 3 }] },
      { id: "B", label: "the five exalted, Candra in Punarvasu in Karka (no tithi or month)",
        conds: [{ g: "Śani", rel: "exalt" }, { g: "Guru", rel: "exalt" }, { g: "Maṅgala", rel: "exalt" }, { g: "Śukra", rel: "exalt" }, { g: "Sūrya", rel: "exalt" },
                { g: "Candra", rel: "nak", v: 6 }, { g: "Candra", rel: "rasi", v: 3 }] },
      { id: "C", label: "the five exalted only",
        conds: [{ g: "Śani", rel: "exalt" }, { g: "Guru", rel: "exalt" }, { g: "Maṅgala", rel: "exalt" }, { g: "Śukra", rel: "exalt" }, { g: "Sūrya", rel: "exalt" }] }] },
    { id: "R02", event: "Daśaratha fixes Rāma's coronation as heir for the next day, Puṣya", ref: "Rāmāyaṇa 2.3.4; 2.4.2, 2.4.21", sky: "Caitra; the Moon in Punarvasu, Puṣya tomorrow", readings: [
      { id: "A", label: "Candra in Punarvasu in Caitra (yearly: useful once a year is fixed)", conds: [{ g: "", rel: "month", v: 0 }, { g: "Candra", rel: "nak", v: 6 }] }] },
    { id: "R03", event: "Daśaratha tells Rāma the omens that make him hurry the coronation", ref: "Rāmāyaṇa 2.4.18", sky: "Daśaratha's nakṣatra oppressed by the Sun, Mars and Rāhu", readings: [
      { id: "A", label: "Sūrya, Maṅgala and Rāhu together (within 13°20′, one nakṣatra's width); the text does not name Daśaratha's nakṣatra",
        conds: [{ g: "Rāhu", rel: "neargraha", v: "Sūrya", tol: 13.3 }, { g: "Maṅgala", rel: "neargraha", v: "Sūrya", tol: 13.3 }] },
      { id: "B", label: "reading A, at the same moment as R02 (Caitra, Candra in Punarvasu)",
        conds: [{ g: "Rāhu", rel: "neargraha", v: "Sūrya", tol: 13.3 }, { g: "Maṅgala", rel: "neargraha", v: "Sūrya", tol: 13.3 }, { g: "", rel: "month", v: 0 }, { g: "Candra", rel: "nak", v: 6 }] }] },
    { id: "R06", event: "Rāma's army sets out from Kiṣkindhā for Laṅkā", ref: "Rāmāyaṇa 6.4.3–4", sky: "Uttara Phalgunī today, Hasta tomorrow", readings: [
      { id: "A", label: "Candra in Uttara Phalgunī (monthly: useful once a year and month are fixed)", conds: [{ g: "Candra", rel: "nak", v: 11 }] }] },
    { id: "R07", event: "Rāma's army sets out for Laṅkā: omens on the march", ref: "Rāmāyaṇa 6.4.46", sky: "Mūla, the rākṣasas' nakṣatra, touched by a dhūmaketu", readings: [
      { id: "A", label: "Ketu in Mūla (reading dhūmaketu as the node; a comet cannot be computed)", conds: [{ g: "Ketu", rel: "nak", v: 18 }] }] },
    { id: "R08", event: "Rāma's last battle with Rāvaṇa: omens during the duel", ref: "Rāmāyaṇa 6.90.27", sky: "Budha stands assailing Rohiṇī", readings: [
      { id: "A", label: "Budha in Rohiṇī", conds: [{ g: "Budha", rel: "nak", v: 3 }] }] }
  ];
  CLAIMS.forEach(function (c) { c.src = /^Rāmāyaṇa/.test(c.ref) ? "Rāmāyaṇa" : /^Bhāgavata/.test(c.ref) ? "Bhāgavata" : "Mahābhārata"; });
  /* what each relation means, how the builder offers it, and how it reads aloud */
  var REL = {
    nak: { label: "is in nakṣatra", target: "nak", graha: true },
    rasi: { label: "is in rāśi", target: "rasi", graha: true },
    nearstar: { label: "is within … of a junction star", target: "star", tol: 5, graha: true },
    neargraha: { label: "is within … of another graha", target: "graha", tol: 6, graha: true },
    nearnode: { label: "is within … of Rāhu or Ketu", target: "", tol: 18, graha: true },
    nearlon: { label: "is within … of a longitude", target: "lon", tol: 5, graha: true },
    opp: { label: "is opposite another graha", target: "graha", tol: 6, graha: true },
    exalt: { label: "is exalted", target: "", graha: true },
    debil: { label: "is debilitated", target: "", graha: true },
    own: { label: "is in its own sign", target: "", graha: true },
    retro: { label: "is retrograde, in nakṣatra", target: "nakany", graha: true },
    station: { label: "turns retrograde, in nakṣatra", target: "nakany", graha: true },
    tithi: { label: "the tithi is", target: "tithi", graha: false },
    month: { label: "the lunar month is", target: "month", graha: false },
    eclipse: { label: "an eclipse", target: "eclipse", graha: false },
    ayana: { label: "the Sun's ayana is", target: "ayana", graha: false }
  };
  var TITHI30 = []; for (var ti0 = 0; ti0 < 30; ti0++) TITHI30.push((ti0 < 15 ? "Śukla " : "Kṛṣṇa ") + (ti0 % 15 === 14 ? (ti0 < 15 ? "Pūrṇimā" : "Amāvāsyā") : TNAME[ti0 % 15]));
  function condText(c) {
    var g = c.g === "any" ? "any graha" : c.g, tv = c.tol != null ? c.tol + "°" : "";
    switch (c.rel) {
      case "nak": return g + " in " + CL_NAKX[c.v];
      case "rasi": return g + " in " + CL_RS[c.v];
      case "nearstar": return g + " within " + tv + " of " + YOGA[c.v][1] + " (" + YOGA[c.v][0] + ")";
      case "neargraha": return g + " within " + tv + " of " + c.v;
      case "nearnode": return g + " within " + tv + " of Rāhu or Ketu";
      case "nearlon": return g + " within " + tv + " of " + (+c.v).toFixed(1) + "°";
      case "opp": return g + " opposite " + c.v + " (±" + tv + ")";
      case "exalt": return g + " exalted";
      case "debil": return g + " debilitated";
      case "own": return g + " in its own sign";
      case "retro": return g + " retrograde" + (c.v >= 0 ? " in " + CL_NAKX[c.v] : "");
      case "station": return g + " turns retrograde" + (c.v >= 0 ? " in " + CL_NAKX[c.v] : "");
      case "tithi": return "tithi " + TITHI30[c.v - 1];
      case "month": return "lunar month " + LMON[c.v];
      case "eclipse": return (c.v === "solar" ? "a solar" : "a lunar") + " eclipse";
      case "ayana": return c.v === "uttara" ? "uttarāyaṇa" : "dakṣiṇāyana";
    }
    return "?";
  }

  /* ---- evaluating one condition at one instant --------------------------------
     returns { ok, m, skip, who }: m is the margin in degrees (how far inside),
     skip how many days the walk may jump when it is false, who the graha that
     met it for "any graha" */
  function lonOf(g, ms, S) {
    var L;
    if (g === "Rāhu" || g === "Ketu") L = (CONV.node === "true" ? K.trueNode(ms) : K.longitude("Rāhu", ms)) + (g === "Ketu" ? 180 : 0);
    else L = K.longitude(g, ms);
    return norm(L + S);
  }
  /* the nakṣatra index (27 = Abhijit) and the margin to its edge, under the chosen meaning */
  function nakAt(L, ms) {
    if (CONV.nak === "abhijit" && L >= 276 + 40 / 60 && L < 280 + 53 / 60 + 20 / 3600)
      return { i: 27, m: Math.min(L - 276 - 40 / 60, 280 + 53 / 60 + 20 / 3600 - L) };
    if (CONV.nak === "star") {
      var ys = yogataras(ms), S2 = shiftOf(ms), d = [];
      (ys || []).forEach(function (y) { if (y.nak !== "Abhijit") d.push({ i: y.i, d: Math.abs(sdiff(y.lon + S2, L)) }); });
      d.sort(function (a, b) { return a.d - b.d; });
      if (d.length > 1) return { i: d[0].i, m: (d[1].d - d[0].d) / 2 };
    }
    var k = NKS(L);
    return { i: k.i, m: Math.min(L - k.start, k.end - L) };
  }
  /* the shortest arc from L into the arc [a, a + w) */
  function arcTo(L, a, w) { var x = norm(L - a); return x < w ? 0 : Math.min(x - w, 360 - x); }
  function nakDist(L, i, ms) {
    /* by the nearest star the divisions are uneven, so the skip is kept small */
    if (CONV.nak === "star") { var n = nakAt(L, ms); return n.i === i ? 0 : Math.max(0.01, Math.abs(sdiff(L, (i + 0.5) * 40 / 3)) - 30); }
    if (i === 27 && CONV.nak === "abhijit") return arcTo(L, 276 + 40 / 60, 4 + 13 / 60 + 20 / 3600);
    var e = NKE().filter(function (q) { return q.i === i; })[0];
    return e ? arcTo(L, e.start, e.end - e.start) : 360;
  }
  var MONTH_CACHE = { a: 0, b: -1, i: -1 }, ECL_CACHE = {};
  /* the next (dir +1) or previous (dir −1) instant the elongation reaches tgt:
     a start from the mean rate, then Newton steps on the true elongation */
  function syz(ms, tgt, dir) {
    var e = elong(ms), gap = dir > 0 ? norm(tgt - e) : -norm(e - tgt), t = ms + gap / 12.19 * DAY;
    for (var k = 0; k < 8; k++) { var d = sdiff(elong(t), tgt), dt = -d / 12.19 * DAY; t += dt; if (Math.abs(dt) < 20000) break; }
    return t;
  }
  function lunarMonthAt(ms) {
    if (ms >= MONTH_CACHE.a && ms < MONTH_CACHE.b) return MONTH_CACHE;
    var nm0 = syz(ms + 1, 0, -1), nm1 = nm0 != null ? syz(nm0 + DAY, 0, +1) : null;
    if (nm0 == null || nm1 == null) return { a: ms, b: ms + DAY, i: -1 };
    var e = elong(ms), sukla = e < 180, a = nm0, b = nm1;
    var nameOf = function (x, y) {
      if (CONV.mname === "solar") {
        var s0 = Math.floor(norm(K.longitude("Sūrya", x) + shiftOf(x)) / 30), s1 = Math.floor(norm(K.longitude("Sūrya", y) + shiftOf(y)) / 30);
        return s0 === s1 ? -1 : s1;                     /* an adhika month matches no name */
      }
      var fm = syz(x + DAY, 180, +1);
      return fm ? NAK2MON[NKS(norm(K.longitude("Candra", fm) + shiftOf(fm))).d] : -1;
    };
    var i = nameOf(nm0, nm1);
    if (CONV.msys === "purnimanta") {
      /* the dark fortnight carries the next month's name: split at the full moon */
      var fmx = syz(nm0 + DAY, 180, +1);
      if (fmx != null && ms >= fmx) { var nm2 = syz(nm1 + DAY, 0, +1); i = nm2 ? nameOf(nm1, nm2) : i; a = fmx; b = nm1; }
      else if (fmx != null) b = fmx;
    }
    MONTH_CACHE = { a: a, b: b, i: i, sukla: sukla };
    return MONTH_CACHE;
  }
  /* an eclipse at the syzygy nearest ms: the Moon's distance from the ecliptic
     there against the usual limits (solar: seen somewhere on Earth; lunar: the
     umbra) */
  var SYN = 29.530588853 * DAY, NM2000 = Date.UTC(2000, 0, 6, 18, 14);
  function eclipseNear(ms, kind) {
    var tgt = kind === "solar" ? 0 : 180, e = sdiff(elong(ms), tgt);
    if (Math.abs(e) > 14) return { ok: false, skip: (Math.abs(e) - 13) / 13.2 };
    /* one check per lunation: the exact syzygy and the Moon's latitude there */
    var key = kind + Math.round((ms - NM2000) / SYN - tgt / 360);
    if (!(key in ECL_CACHE)) {
      var t = syz(ms - 1.5 * DAY, tgt, +1);
      ECL_CACHE[key] = t == null ? null : { t: t, b: Math.abs(K.latitude("Candra", t)) };
    }
    var q = ECL_CACHE[key];
    if (!q || Math.abs(q.t - ms) > 1.6 * DAY) return { ok: false, skip: q && q.t > ms ? Math.max(0.25, (q.t - ms) / DAY - 1.5) : 0.5 };
    /* 0.95°: checked on 2016–2023 eclipses, every penumbral-only one lies beyond 0.98°, the smallest partial at 0.93° */
    var lim = kind === "solar" ? 1.55 : 0.95;
    return q.b < lim ? { ok: true, m: lim - q.b, at: q.t, lat: q.b } : { ok: false, skip: 20 };
  }
  /* one junction star's longitude on the date (Samanvaya), kept for 50 days at a
     time: it moves under a minute of arc in that while */
  var STARC = {};
  function starLon(i, ms) {
    var key = i + ":" + Math.round(ms / (50 * DAY));
    if (key in STARC) return STARC[key];
    var A = window.Astronomy, s = YOGA[i]; if (!A || !A.DefineStar || !s) return null;
    var yrs = (ms - Date.UTC(2000, 0, 1, 12)) / DAY / 365.25, x = s[4] + s[7] * yrs, y = s[5] + s[8] * yrs, z = s[6] + s[9] * yrs, r = Math.sqrt(x * x + y * y + z * z);
    try {
      A.DefineStar(A.Body.Star8, ((Math.atan2(y, x) * 12 / Math.PI) + 24) % 24, Math.asin(z / r) * 180 / Math.PI, r * 3.26156);
      var e = A.Ecliptic(A.GeoVector(A.Body.Star8, new Date(ms), true));
      STARC[key] = norm(e.elon - window.__ayanFor("samanvaya_ecliptic", jdOf(ms)));
    } catch (err) { STARC[key] = null; }
    return STARC[key];
  }
  function speed(g, ms) { return sdiff(lonOf(g, ms + DAY / 2, 0), lonOf(g, ms - DAY / 2, 0)); }
  function evalOne(c, ms, S) {
    if (c.g === "any") {
      var best = null, minSkip = Infinity;
      GN.forEach(function (g) { var r = evalOne(Object.assign({}, c, { g: g }), ms, S);
        if (r.ok && (!best || r.m > best.m)) best = Object.assign(r, { who: g });
        if (!r.ok) minSkip = Math.min(minSkip, r.skip || 0); });
      return best || { ok: false, skip: minSkip };
    }
    var v = VMAX[c.g] || 1, L, d, s;
    switch (c.rel) {
      case "nak": L = lonOf(c.g, ms, S); d = nakDist(L, c.v, ms);
        return d === 0 ? { ok: true, m: nakAt(L, ms).m } : { ok: false, skip: d / v };
      case "rasi": L = lonOf(c.g, ms, S); d = arcTo(L, c.v * 30, 30);
        return d === 0 ? { ok: true, m: Math.min(L - c.v * 30, (c.v + 1) * 30 - L) } : { ok: false, skip: d / v };
      case "nearstar": L = lonOf(c.g, ms, S);
        var yl = starLon(c.v, ms); if (yl == null) return { ok: false, skip: 10 };
        d = Math.abs(sdiff(L, yl + S));
        return d <= c.tol ? { ok: true, m: c.tol - d, sep: d } : { ok: false, skip: (d - c.tol) / v };
      case "neargraha": case "opp": L = lonOf(c.g, ms, S);
        var L2 = lonOf(c.v, ms, S); d = Math.abs(sdiff(L, L2)); if (c.rel === "opp") d = 180 - d;
        return d <= c.tol ? { ok: true, m: c.tol - d, sep: d } : { ok: false, skip: (d - c.tol) / (v + (VMAX[c.v] || 1)) };
      case "nearnode": L = lonOf(c.g, ms, S);
        var R = lonOf("Rāhu", ms, S); d = Math.min(Math.abs(sdiff(L, R)), Math.abs(sdiff(L, R + 180)));
        return d <= c.tol ? { ok: true, m: c.tol - d, sep: d } : { ok: false, skip: (d - c.tol) / (v + 0.25) };
      case "nearlon": L = lonOf(c.g, ms, S); d = Math.abs(sdiff(L, +c.v));
        return d <= c.tol ? { ok: true, m: c.tol - d, sep: d } : { ok: false, skip: (d - c.tol) / v };
      case "exalt": case "debil": case "own":
        if (!(c.g in EXALT)) return { ok: false, skip: 1e9 };
        var signs = c.rel === "exalt" ? [EXALT[c.g]] : c.rel === "debil" ? [(EXALT[c.g] + 6) % 12] : OWN[c.g];
        L = lonOf(c.g, ms, S); d = Math.min.apply(null, signs.map(function (q) { return arcTo(L, q * 30, 30); }));
        return d === 0 ? { ok: true, m: Math.min(L % 30, 30 - L % 30) } : { ok: false, skip: d / v };
      case "retro": case "station":
        L = lonOf(c.g, ms, S);
        if (c.v >= 0) { d = nakDist(L, c.v, ms); if (d > 0) return { ok: false, skip: d / v }; }
        if (c.rel === "retro") { s = speed(c.g, ms); return s < 0 ? { ok: true, m: c.v >= 0 ? nakAt(L, ms).m : -s } : { ok: false, skip: 0 }; }
        var a = speed(c.g, ms - 2 * DAY), b = speed(c.g, ms + 2 * DAY);
        return a > 0 && b <= 0 ? { ok: true, m: c.v >= 0 ? nakAt(L, ms).m : 1 } : { ok: false, skip: 0 };
      case "tithi":
        var e = elong(ms), lo = (c.v - 1) * 12; d = arcTo(e, lo, 12);
        return d === 0 ? { ok: true, m: Math.min(e - lo, lo + 12 - e) } : { ok: false, skip: d / 15.4 };
      case "month":
        var mo = lunarMonthAt(ms);
        return mo.i === c.v ? { ok: true, m: 1 } : { ok: false, skip: Math.max(0, (mo.b - ms) / DAY - 0.05) };
      case "eclipse":
        return eclipseNear(ms, c.v);
      case "ayana":
        var tr = norm(K.longitude("Sūrya", ms) + window.__ayanFor("samanvaya_ecliptic", jdOf(ms))), uttara = tr >= 270 || tr < 90;
        d = c.v === "uttara" ? arcTo(tr, 270, 180) : arcTo(tr, 90, 180);
        return d === 0 ? { ok: true, m: 1 } : { ok: false, skip: d / 1.03 };
    }
    return { ok: false, skip: 1 };
  }
  function stepOf(c) {
    if (c.rel === "tithi" || c.rel === "eclipse") return 0.25;
    if (c.rel === "month") return 1;
    if (c.rel === "ayana") return 2;
    if (c.g === "any") return 0.1;
    return STEP[c.g] || 1;
  }
  /* is a claim self-contradictory before any search? */
  function contradictions(cl) {
    if (cl.mode === "within") return [];
    var out = [], seen = {};
    cl.conds.forEach(function (c) {
      if ((c.rel === "nak" || c.rel === "rasi") && c.g && c.g !== "any") {
        var k = c.g + c.rel; if (k in seen && seen[k] !== c.v) out.push(c.g + " cannot be in " + (c.rel === "nak" ? CL_NAKX[seen[k]] + " and " + CL_NAKX[c.v] : CL_RS[seen[k]] + " and " + CL_RS[c.v]) + " at once");
        seen[k] = c.v;
      }
      if (c.rel === "tithi") { if ("tithi" in seen && seen.tithi !== c.v) out.push("two different tithis cannot hold at once"); seen.tithi = c.v; }
      if (c.rel === "month") { if ("month" in seen && seen.month !== c.v) out.push("two different months cannot hold at once"); seen.month = c.v; }
      if (["exalt", "debil", "own"].indexOf(c.rel) >= 0 && !(c.g in EXALT)) out.push("this page gives the nodes no exaltation or own sign");
    });
    return out;
  }

  /* ---- the walk ------------------------------------------------------------------ */
  var CS = { run: 0, stop: false };
  /* walk windows for one condition, in slices that give the page back to the
     reader; resolves to the runs where it holds, as [start, end, bestMs, bestR] */
  function walk(c, wins, onProgress, limit) {
    var st = stepOf(c) * DAY, runs = [], wi = 0, t = wins.length ? wins[0][0] : 0, cur = null, total = 0, done = 0, my = CS.run;
    wins.forEach(function (w) { total += w[1] - w[0]; });
    return new Promise(function (res, rej) {
      (function slice() {
        if (CS.stop || my !== CS.run) return rej("stopped");
        var t0 = Date.now();
        while (wi < wins.length) {
          var w = wins[wi];
          if (t > w[1]) { if (cur) { runs.push(cur); cur = null; } wi++; if (wi < wins.length) t = wins[wi][0]; continue; }
          var S = shiftOf(t), r = evalOne(c, t, S);
          if (r.ok) {
            if (!cur) cur = [t, t, t, r]; cur[1] = t; if (r.m > cur[3].m) { cur[2] = t; cur[3] = r; }
            t += r.who ? Math.max(st, STEP[r.who] * DAY) : st;      /* "any graha": at the pace of the one that holds it */
          } else {
            if (cur) { runs.push(cur); cur = null; if (limit && runs.length > limit) return res(runs); }
            t += Math.max(st, 0.92 * (r.skip || 0) * DAY);
          }
          if (Date.now() - t0 > 30) {
            var dn = 0; for (var k = 0; k < wi; k++) dn += wins[k][1] - wins[k][0];
            dn += Math.max(0, Math.min(t, w[1]) - w[0]);
            onProgress(total ? dn / total : 1);
            return setTimeout(slice, 0);
          }
        }
        if (cur) runs.push(cur);
        res(runs);
      })();
    });
  }
  /* merge, pad and clip a list of runs into windows */
  function toWins(runs, pad, outer) {
    var w = runs.map(function (r) { return [Math.max(outer[0], r[0] - pad), Math.min(outer[1], r[1] + pad)]; }).sort(function (a, b) { return a[0] - b[0]; }), out = [];
    w.forEach(function (x) { if (out.length && x[0] <= out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], x[1]); else out.push(x); });
    return out;
  }
  var CAP = 200;
  /* search one claim reading over [a, b]: resolves to { episodes, capped } */
  function searchClaim(cl, a, b, onProgress) {
    var conds = cl.conds.map(function (c, i) { return Object.assign({ i: i }, c); }).sort(function (p, q) { return stepOf(q) - stepOf(p); });
    var within = cl.mode === "within", N = (within ? (+cl.days || 0) : 0) * DAY, wins = [[a, b]], runsBy = {}, k = 0;
    MONTH_CACHE = { a: 0, b: -1, i: -1 }; ECL_CACHE = {};
    function next() {
      if (k >= conds.length) return Promise.resolve();
      var c = conds[k], frac0 = k / conds.length;
      /* the last condition of a same-moment search may stop once the reading is plainly too common */
      var lim = !within && k === conds.length - 1 ? 3 * CAP : 0;
      return walk(c, wins, function (f) { onProgress(frac0 + f / conds.length); }, lim).then(function (runs) {
        runsBy[c.i] = runs;
        wins = toWins(runs, stepOf(c) * DAY + N, [a, b]);
        k++;
        if (!wins.length) return;
        return next();
      });
    }
    return next().then(function () {
      if (conds.some(function (c) { return !runsBy[c.i] || !runsBy[c.i].length; })) return { episodes: [], capped: false };
      var eps = [];
      if (!within) {
        /* the final pass: every condition at the finest step, inside what is left */
        var all = { rel: "_all" }, fine = Math.min.apply(null, conds.map(stepOf)) * DAY;
        return new Promise(function (res, rej) {
          var wi = 0, t = wins[0][0], cur = null, my = CS.run;
          (function slice() {
            if (CS.stop || my !== CS.run) return rej("stopped");
            var t0 = Date.now();
            while (wi < wins.length) {
              var w = wins[wi];
              if (t > w[1]) { if (cur) { eps.push(cur); cur = null; } wi++; if (wi < wins.length) t = wins[wi][0]; continue; }
              var S = shiftOf(t), rs = cl.conds.map(function (c) { return evalOne(c, t, S); }), ok = rs.every(function (r) { return r.ok; });
              if (ok) {
                var mm = Math.min.apply(null, rs.map(function (r) { return r.m; }));
                if (!cur) cur = { from: t, to: t, best: t, mm: mm, rs: rs }; cur.to = t;
                if (mm > cur.mm) { cur.best = t; cur.mm = mm; cur.rs = rs; }
                t += Math.min.apply(null, rs.map(function (r, j) { return r.who ? Math.max(fine, STEP[r.who] * DAY) : stepOf(cl.conds[j]) * DAY; }));
              } else {
                if (cur) { eps.push(cur); cur = null; if (eps.length > CAP) break; }
                t += Math.max(fine, 0.92 * Math.max.apply(null, rs.filter(function (r) { return !r.ok; }).map(function (r) { return r.skip || 0; })) * DAY);
              }
              if (Date.now() - t0 > 30) { onProgress(0.99); return setTimeout(slice, 0); }
            }
            if (cur) eps.push(cur);
            /* an eclipse's best moment is the eclipse itself */
            eps.forEach(function (e) { var q = e.rs.filter(function (r) { return r.at; })[0]; if (q) e.best = q.at; });
            res({ episodes: eps.slice(0, CAP), capped: eps.length > CAP });
          })();
        });
      }
      /* within N days: each run of the slowest condition, with a run of every
         other condition no more than N days from it */
      var anchor = conds[0];
      runsBy[anchor.i].forEach(function (R) {
        var rs = [], from = R[0], to = R[1], ok = true;
        cl.conds.forEach(function (c, i) {
          if (i === anchor.i) { rs[i] = Object.assign({ at: R[2] }, R[3]); return; }
          var hit = null;
          (runsBy[i] || []).forEach(function (q) { if (q[1] >= R[0] - N && q[0] <= R[1] + N && (!hit || q[3].m > hit[3].m)) hit = q; });
          if (!hit) { ok = false; return; }
          rs[i] = Object.assign({ at: hit[2] }, hit[3]); from = Math.min(from, hit[0]); to = Math.max(to, hit[1]);
        });
        if (ok) eps.push({ from: from, to: to, best: rs[anchor.i].at || R[2], rs: rs, mm: Math.min.apply(null, rs.map(function (r) { return r.m; })) });
      });
      return { episodes: eps.slice(0, CAP), capped: eps.length > CAP };
    });
  }

  /* ---- the panel ------------------------------------------------------------------ */
  var MY_KEY = "learnhoro.kalasetu.myclaim";
  var MY = { n: "", ref: "", note: "", mode: "same", days: 30, conds: [{ g: "Śani", rel: "nak", v: 3 }] };
  var MYKEEP = false;
  try { var mk = JSON.parse(localStorage.getItem(MY_KEY) || "null"); if (mk && mk.conds) { MY = mk; MYKEEP = true; } } catch (e) {}
  function opt(v, t, sel) { return '<option value="' + esc(v) + '"' + (sel ? " selected" : "") + ">" + esc(t) + "</option>"; }
  function targetCtl(c, i) {
    var r = REL[c.rel], t = r.target, h = "";
    if (t === "nak" || t === "nakany") h = '<select class="swin" data-cb="v" data-i="' + i + '">' + (t === "nakany" ? opt(-1, "anywhere", c.v < 0) : "") +
      CL_NAKX.map(function (n, k) { return opt(k, n, +c.v === k); }).join("") + "</select>";
    else if (t === "rasi") h = '<select class="swin" data-cb="v" data-i="' + i + '">' + CL_RS.map(function (n, k) { return opt(k, n, +c.v === k); }).join("") + "</select>";
    else if (t === "star") h = '<select class="swin" data-cb="v" data-i="' + i + '">' + YOGA.map(function (y, k) { return opt(k, y[1] + " (" + y[0] + ")", +c.v === k); }).join("") + "</select>";
    else if (t === "graha") h = '<select class="swin" data-cb="v" data-i="' + i + '">' + GN.map(function (g) { return opt(g, g, c.v === g); }).join("") + "</select>";
    else if (t === "lon") h = '<input class="swin" type="number" min="0" max="359.9" step="0.1" data-cb="v" data-i="' + i + '" value="' + esc(c.v == null ? 0 : c.v) + '"> °';
    else if (t === "tithi") h = '<select class="swin" data-cb="v" data-i="' + i + '">' + TITHI30.map(function (n, k) { return opt(k + 1, n, +c.v === k + 1); }).join("") + "</select>";
    else if (t === "month") h = '<select class="swin" data-cb="v" data-i="' + i + '">' + LMON.map(function (n, k) { return opt(k, n, +c.v === k); }).join("") + "</select>";
    else if (t === "eclipse") h = '<select class="swin" data-cb="v" data-i="' + i + '">' + opt("solar", "solar (somewhere on Earth)", c.v === "solar") + opt("lunar", "lunar (umbral)", c.v === "lunar") + "</select>";
    else if (t === "ayana") h = '<select class="swin" data-cb="v" data-i="' + i + '">' + opt("uttara", "uttarāyaṇa", c.v === "uttara") + opt("dakshina", "dakṣiṇāyana", c.v === "dakshina") + "</select>";
    if (r.tol != null) h += ' <label class="ks-cbtol">within <input class="swin" type="number" min="0.1" max="90" step="0.1" data-cb="tol" data-i="' + i + '" value="' + esc(c.tol == null ? r.tol : c.tol) + '">°</label>';
    return h;
  }
  function defaultV(rel) {
    var t = REL[rel].target;
    return { nak: 3, nakany: -1, rasi: 0, star: 3, graha: "Śani", lon: 0, tithi: 15, month: 0, eclipse: "solar", ayana: "uttara" }[t];
  }
  function drawBuilder() {
    var host = $("ks-cbrows"); if (!host) return;
    host.innerHTML = MY.conds.map(function (c, i) {
      var r = REL[c.rel];
      return '<div class="ks-cbrow"><select class="swin" data-cb="g" data-i="' + i + '"' + (r.graha ? "" : " disabled") + ">" +
        (r.graha ? GN.map(function (g) { return opt(g, g, c.g === g); }).join("") + opt("any", "any graha", c.g === "any") : opt("", "—", true)) + "</select>" +
        '<select class="swin" data-cb="rel" data-i="' + i + '">' + Object.keys(REL).map(function (k) { return opt(k, REL[k].label, c.rel === k); }).join("") + "</select>" +
        targetCtl(c, i) +
        ' <button type="button" class="swbtn" data-cbdel="' + i + '" aria-label="Remove this condition"' + (MY.conds.length < 2 ? " disabled" : "") + ">Remove</button></div>";
    }).join("");
    $("ks-cbmode").value = MY.mode; $("ks-cbdays").value = MY.days; $("ks-cbdays").disabled = MY.mode !== "within";
    $("ks-cbname").value = MY.n || ""; $("ks-cbref").value = MY.ref || ""; $("ks-cbnote").value = MY.note || "";
    $("ks-cbkeep").checked = MYKEEP;
    var bad = contradictions(MY);
    $("ks-cbwarn").innerHTML = bad.length ? "<b>This claim can never hold:</b> " + esc(bad.join("; ")) + "." : "";
    keepMy();
  }
  function keepMy() { try { if (MYKEEP) localStorage.setItem(MY_KEY, JSON.stringify(MY)); } catch (e) {} }
  function claimOf(sel) {
    if (sel === "mine") return null;
    return CLAIMS.filter(function (c) { return c.id === sel; })[0];
  }
  function drawPicker() {
    /* grouped by text; only claims a search can test are offered (the sheet
       keeps the rest: comets, similes, seasons, rites, counting conventions) */
    var grp = function (label, list) { return list.length ? '<optgroup label="' + esc(label) + '">' + list.map(function (c) {
      /* the event in the epic first, then what the verse says of the sky */
      return '<option value="' + c.id + '"' + (c.none ? " disabled" : "") + ">" + esc(c.id + " · " + (c.event ? c.event + " — " : "") + c.sky + (c.none ? " — " + c.none : "")) + "</option>"; }).join("") + "</optgroup>" : ""; };
    var can = CLAIMS.filter(function (c) { return !c.none; });
    $("ks-claim").innerHTML = opt("mine", "Your own claim (build it below)", false) +
      ["Mahābhārata", "Bhāgavata", "Rāmāyaṇa"].map(function (t) { return grp(t, can.filter(function (c) { return c.src === t; })); }).join("");
    $("ks-claim").value = "C12";
    pickerChanged();
  }
  function pickerChanged() {
    var cl = claimOf($("ks-claim").value);
    $("ks-cbox").open = !cl;
    $("ks-reading").innerHTML = cl ? opt("all", "all readings, each on its own", true) + cl.readings.map(function (r) { return opt(r.id, r.id + ": " + r.label, false); }).join("") : opt("mine", "your conditions", true);
    $("ks-reading").disabled = !cl; $("ks-cledit").disabled = !cl;
    var inf = $("ks-clinfo");
    if (inf) inf.innerHTML = cl ? "<b>" + esc(cl.event || "") + "</b> · " + esc(cl.ref) + " · " + esc(cl.sky) : "";
    adviseRange();
  }
  function readingsNow() {
    var cl = claimOf($("ks-claim").value);
    if (!cl) return [{ id: "", label: MY.n || "your claim", conds: MY.conds, mode: MY.mode, days: MY.days, mine: true }];
    var r = $("ks-reading").value;
    return cl.readings.filter(function (x) { return r === "all" || x.id === r; }).map(function (x) { return Object.assign({ claim: cl }, x); });
  }
  /* advice on the range, from the fastest thing the claim leans on */
  function adviseRange() {
    var rs = readingsNow(), moon = rs.some(function (r) { return r.conds.some(function (c) { return c.g === "Candra" || c.g === "any" || ["tithi", "month", "eclipse"].indexOf(c.rel) >= 0; }); });
    $("ks-cladvice").innerHTML = moon ? "This claim leans on the Moon (or a tithi, month or eclipse): search <b>1000–2000 years</b> at a time, best inside 3000 BCE – 3000 CE, where the Moon is measured rather than extrapolated."
      : "This claim uses only the slower grahas: the <b>whole span</b>, 13000 BCE – 3600 CE, is quick to search and trusted to under a minute of arc.";
  }
  function yearMs(eraId, yId, end) {
    var era = $(eraId).value, y = Math.max(1, Math.min(era === "BCE" ? 13000 : 3600, Math.round(+$(yId).value || 1))), Y = era === "BCE" ? 1 - y : y;
    var t = new Date(end ? Date.UTC(2000, 11, 31, 23, 59) : Date.UTC(2000, 0, 1)); t.setUTCFullYear(Y); return t.getTime();
  }
  function fmtSep(r) {
    if (r.sep != null) return r.sep.toFixed(1) + "° apart";
    if (r.lat != null) return "Moon " + r.lat.toFixed(2) + "° from the ecliptic";
    if (r.m != null && isFinite(r.m)) return r.m.toFixed(1) + "° inside";
    return "";
  }
  function flagsFor(rd, ms) {
    var y = new Date(ms).getUTCFullYear(), f = [], moon = rd.conds.some(function (c) { return c.g === "Candra" || ["tithi", "month", "eclipse"].indexOf(c.rel) >= 0; });
    if (moon && y < 1000) f.push("day ±ΔT");
    if (!K.inSpan(ms)) f.push("outside the span");
    return f.join(" · ");
  }
  function runSearch() {
    var a = yearMs("ks-clera0", "ks-cly0"), b = yearMs("ks-clera1", "ks-cly1", true);
    if (b <= a) { $("ks-clsum").innerHTML = "<b>The end of the range must come after its start.</b>"; return; }
    var rds = readingsNow(), bad = [];
    rds.forEach(function (r) { var x = contradictions(r); if (x.length) bad.push((r.id ? r.id + ": " : "") + x.join("; ")); });
    if (bad.length) { $("ks-clsum").innerHTML = "<b>Not searched: this can never hold.</b> " + esc(bad.join(" · ")); $("ks-clres").innerHTML = ""; return; }
    CS.run++; CS.stop = false;
    var my = CS.run, out = [], yrs = (b - a) / DAY / 365.2425, t0 = Date.now();
    $("ks-clgo").disabled = true; $("ks-clstop").disabled = false; $("ks-clres").innerHTML = "";
    var bar = $("ks-clbar"); bar.hidden = false; bar.value = 0;
    var i = 0;
    (function nextReading() {
      if (i >= rds.length) return finish();
      var rd = rds[i];
      $("ks-clsum").textContent = "Searching" + (rds.length > 1 ? " reading " + rd.id + " (" + (i + 1) + " of " + rds.length + ")" : "") + "…";
      searchClaim(rd, a, b, function (f) { if (my === CS.run) bar.value = (i + Math.min(1, f)) / rds.length; }).then(function (res) {
        out.push({ rd: rd, res: res }); i++; nextReading();
      }, function () { finish(true); });
    })();
    function finish(stopped) {
      if (my !== CS.run) return;
      $("ks-clgo").disabled = false; $("ks-clstop").disabled = true; bar.hidden = true;
      var secs = ((Date.now() - t0) / 1000).toFixed(1);
      if (stopped) { $("ks-clsum").innerHTML = "<b>Stopped.</b> Nothing below is complete."; }
      else $("ks-clsum").innerHTML = "Searched " + esc(yearLabel(new Date(a).getUTCFullYear())) + " – " + esc(yearLabel(new Date(b).getUTCFullYear())) +
        " (" + Math.round(yrs).toLocaleString("en") + " years) in " + secs + " s, under " + FRAME_NAME[CONV.frame] + ", " +
        { equal: (window.NNak ? window.NNak.label() : "equal nakṣatras"), star: "nakṣatra by the nearest junction star", abhijit: "28 nakṣatras with Abhijit" }[CONV.nak] + ", the " + CONV.node + " node, " +
        (CONV.msys === "amanta" ? "amānta" : "pūrṇimānta") + " months named by " + (CONV.mname === "solar" ? "saṅkrānti" : "the full moon's nakṣatra") + ".";
      $("ks-clres").innerHTML = out.map(function (o) {
        var rd = o.rd, eps = o.res.episodes, per = eps.length / yrs * 1000;
        var head = "<h3 class=\"ks-clh\">" + esc(rd.mine ? "Your claim" + (MY.n ? ": " + MY.n : "") : rd.claim.id + " reading " + rd.id + (rd.claim.event ? " · " + rd.claim.event : "")) + " <span class=\"elw\">" + esc(rd.conds.map(condText).join(rd.mode === "within" ? "; within " + rd.days + " days, " : " · ")) + "</span></h3>";
        var verdict = o.res.capped ? "<p class=\"k-note\"><b>More than " + CAP + " matches: this reading is too common to date anything by itself.</b> The first " + CAP + " are listed.</p>"
          : "<p class=\"k-note\"><b>" + eps.length + (eps.length === 1 ? " match" : " matches") + "</b>, about " + (per < 10 ? per.toFixed(1) : Math.round(per)) + " per 1000 years" +
            (eps.length && per > 20 ? ": common, so it narrows a date only together with other claims." : eps.length ? "." : ": nothing in this range meets it.") + (rd.mine ? " <i>Your claim, not from the catalogue.</i>" : "") + "</p>";
        if (!eps.length) return head + verdict;
        return head + verdict + '<div class="eltblwrap"><table class="aytab ks-cltab"><thead><tr><th>#</th><th>from</th><th>to</th><th>best moment (UT)</th><th>how each condition is met</th><th>caution</th><th></th></tr></thead><tbody>' +
          eps.map(function (e, k) {
            return "<tr><td class=\"num\">" + (k + 1) + "</td><td>" + civilText(e.from) + "</td><td>" + civilText(e.to) + "</td><td>" + civilText(e.best) + " " + hm(e.best) + "</td><td>" +
              rd.conds.map(function (c, j) { var r = e.rs[j] || {}; return esc(condText(c).replace(/^any graha/, r.who || "any graha")) + ' <span class="elw">' + esc(fmtSep(r)) + "</span>"; }).join("<br>") +
              "</td><td class=\"elw\">" + esc(flagsFor(rd, e.best)) + '</td><td><button type="button" class="swbtn" data-clshow="' + e.best + '">Show</button></td></tr>';
          }).join("") + "</tbody></table></div>";
      }).join("");
    }
  }
  function claimText() { return "kalasetu-claim:1 " + JSON.stringify({ n: MY.n, ref: MY.ref, note: MY.note, mode: MY.mode, days: MY.days, conds: MY.conds }); }
  function loadText(s) {
    var m = String(s || "").trim().match(/^kalasetu-claim:1\s+(\{[\s\S]*\})$/);
    if (!m) return "That text is not a Kālasetu claim. It should start with kalasetu-claim:1.";
    try {
      var o = JSON.parse(m[1]);
      if (!o.conds || !o.conds.length || o.conds.some(function (c) { return !REL[c.rel]; })) return "That claim has a condition this page does not know.";
      MY = { n: String(o.n || ""), ref: String(o.ref || ""), note: String(o.note || ""), mode: o.mode === "within" ? "within" : "same", days: Math.max(1, Math.min(3650, +o.days || 30)),
             conds: o.conds.map(function (c) { return { g: GN.indexOf(c.g) >= 0 || c.g === "any" ? c.g : "", rel: c.rel, v: c.v, tol: c.tol == null ? undefined : +c.tol }; }) };
      return null;
    } catch (e) { return "That claim text is damaged and could not be read."; }
  }
  function claimsInit() {
    if (!$("ks-claim")) return;
    drawPicker(); drawBuilder();
    $("ks-claim").addEventListener("change", pickerChanged);
    $("ks-reading").addEventListener("change", adviseRange);
    $("ks-clgo").addEventListener("click", runSearch);
    $("ks-clstop").addEventListener("click", function () { CS.stop = true; });
    $("ks-cledit").addEventListener("click", function () {
      var cl = claimOf($("ks-claim").value); if (!cl) return;
      var r = $("ks-reading").value, rd = cl.readings.filter(function (x) { return r === "all" ? true : x.id === r; })[0];
      MY = { n: cl.id + " " + rd.id + " (edited)", ref: cl.ref, note: rd.label, mode: rd.mode || "same", days: rd.days || 30, conds: JSON.parse(JSON.stringify(rd.conds)) };
      $("ks-claim").value = "mine"; pickerChanged(); drawBuilder();
    });
    $("ks-cbrows").addEventListener("change", function (ev) {
      var el = ev.target, i = +el.getAttribute("data-i"), k = el.getAttribute("data-cb"); if (!k || !MY.conds[i]) return;
      var c = MY.conds[i];
      if (k === "rel") { c.rel = el.value; c.v = defaultV(c.rel); c.tol = REL[c.rel].tol; if (!REL[c.rel].graha) c.g = ""; else if (!c.g) c.g = "Śani"; }
      else if (k === "g") c.g = el.value;
      else if (k === "tol") c.tol = Math.max(0.1, Math.min(90, +el.value || 1));
      else c.v = /^(nak|nakany|rasi|star|tithi|month)$/.test(REL[c.rel].target) ? +el.value : REL[c.rel].target === "lon" ? norm(+el.value || 0) : el.value;
      drawBuilder(); adviseRange();
    });
    $("ks-cbrows").addEventListener("click", function (ev) {
      var d = ev.target.getAttribute && ev.target.getAttribute("data-cbdel"); if (d == null) return;
      MY.conds.splice(+d, 1); drawBuilder(); adviseRange();
    });
    $("ks-cbadd").addEventListener("click", function () { if (MY.conds.length >= 8) return; MY.conds.push({ g: "Guru", rel: "nak", v: 15 }); drawBuilder(); });
    $("ks-cbmode").addEventListener("change", function () { MY.mode = $("ks-cbmode").value; drawBuilder(); });
    $("ks-cbdays").addEventListener("change", function () { MY.days = Math.max(1, Math.min(3650, Math.round(+$("ks-cbdays").value || 30))); drawBuilder(); });
    ["n", "ref", "note"].forEach(function (k) { var el = $({ n: "ks-cbname", ref: "ks-cbref", note: "ks-cbnote" }[k]); el.addEventListener("input", function () { MY[k] = el.value; keepMy(); }); });
    $("ks-cbkeep").addEventListener("change", function () { MYKEEP = $("ks-cbkeep").checked; if (MYKEEP) keepMy(); else { try { localStorage.removeItem(MY_KEY); } catch (e) {} } });
    $("ks-cbforget").addEventListener("click", function () {
      try { localStorage.removeItem(MY_KEY); } catch (e) {}
      MYKEEP = false; MY = { n: "", ref: "", note: "", mode: "same", days: 30, conds: [{ g: "Śani", rel: "nak", v: 3 }] }; drawBuilder();
      $("ks-cbmsg").textContent = "Forgotten: nothing of your claim is kept in this browser.";
    });
    $("ks-cbcopy").addEventListener("click", function () {
      var tx = claimText(), ta = $("ks-cbtext"); ta.value = tx;
      var done = function () { $("ks-cbmsg").textContent = "Copied. Paste it here later, on another device, or into a chat to have it added to the catalogue."; };
      var fallback = function () { ta.focus(); ta.select(); $("ks-cbmsg").textContent = "Selected in the box below: copy it from there."; };
      try { navigator.clipboard.writeText(tx).then(done, fallback); } catch (e) { fallback(); }
    });
    $("ks-cbload").addEventListener("click", function () {
      var err = loadText($("ks-cbtext").value);
      $("ks-cbmsg").textContent = err || "Loaded.";
      if (!err) { $("ks-claim").value = "mine"; pickerChanged(); drawBuilder(); }
    });
    $("ks-clres").addEventListener("click", function (ev) {
      var v = ev.target.getAttribute && ev.target.getAttribute("data-clshow"); if (v == null) return;
      writeWhen(+v); redrawMoment();
      var w = $("ks-wheel"); if (w && w.scrollIntoView) w.scrollIntoView({ behavior: "smooth", block: "center" });
    });
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
    /* the conventions: set from the saved choice, and every change redraws */
    [["ks-cal", "cal"], ["ks-frame", "frame"], ["ks-nodeconv", "node"], ["ks-nakconv", "nak"], ["ks-msys", "msys"], ["ks-mname", "mname"], ["ks-rtu", "rtu"]].forEach(function (c) {
      var el = $(c[0]); if (!el) return; el.value = CONV[c[1]];
      el.addEventListener("change", function () { CONV[c[1]] = el.value; saveConv();
        if (c[1] === "cal") writeWhen(ST.ms);          /* the same instant, written in the other calendar */
        redrawMoment(); });
    });
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
    tiles(); accTable(); bands(); eras(); history(); claimsInit(); cost(); built();
    redrawMoment(); clearTimeout(ST.heavy); deltaT(); nodes(); gi(); moonTerms(); measure();
    window.__ksPage = { setMoment: function (ms) { writeWhen(ms); redrawMoment(); }, measure: measure, moonTerms: moonTerms,
      step: stepBy, eras: eras, conv: function (k, v) { if (v === undefined) return CONV[k]; CONV[k] = v;
        var id = { cal: "ks-cal", frame: "ks-frame", node: "ks-nodeconv", nak: "ks-nakconv", msys: "ks-msys", mname: "ks-mname", rtu: "ks-rtu" }[k];
        if ($(id)) $(id).value = v; if (k === "cal") writeWhen(ST.ms); redrawMoment(); }, useFit: function (m) { $("ks-fit").value = m; if (K.use) K.use(m); redrawMoment(); },
      state: function () { return { ms: ST.ms, place: ST.place, mode: $("ks-tmode").value }; },
      claims: function () { return CLAIMS; }, search: function (rd, a, b) { CS.run++; CS.stop = false; return searchClaim(rd, a, b, function () {}); } };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind); else bind();
})();
