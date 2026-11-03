/* divisions.html — the rāśis, the nakṣatras and the 108 pādas on one circle.
 *
 * CHART-INDEPENDENT. The wheel needs no sky at all — it is a drawing of how
 * the circle is divided — and the "where the grahas stand now" section asks
 * window.quickSky for a moment and a place, which is nothing natal.
 *
 * NOTHING IS QUOTED. The arithmetic that makes this page worth having — that
 * 27 × 4 = 108 and 108 ÷ 12 = 9, so a pāda IS a navāṃśa; that a nakṣatra is
 * 120 years of Viṃśottarī and a pāda 30 — is computed here, from the widths
 * themselves, rather than written into the prose. If the tables ever change
 * the page changes with them.
 */
(function () {
  "use strict";

  var host = document.getElementById("dv-wheel");
  if (!host) return;
  var $ = function (id) { return document.getElementById(id); };

  var SA = ["Meṣa", "Vṛṣabha", "Mithuna", "Karka", "Siṃha", "Kanyā",
            "Tulā", "Vṛścika", "Dhanus", "Makara", "Kumbha", "Mīna"];
  var NAK = ["Aśvinī", "Bharaṇī", "Kṛttikā", "Rohiṇī", "Mṛgaśira", "Ārdrā",
             "Punarvasu", "Puṣya", "Āśleṣā", "Maghā", "P.Phalgunī", "U.Phalgunī",
             "Hasta", "Citrā", "Svātī", "Viśākhā", "Anurādhā", "Jyeṣṭhā", "Mūla",
             "P.Āṣāḍhā", "U.Āṣāḍhā", "Śravaṇa", "Dhaniṣṭhā", "Śatabhiṣā",
             "P.Bhādra", "U.Bhādra", "Revatī"];
  /* the Viṃśottarī order, and the years each lord holds — the two together
     are what turn a Moon's longitude into a daśā sequence */
  var VL = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
  var VY = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18,
             Jupiter: 16, Saturn: 19, Mercury: 17 };
  var RLORD = ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury",
               "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"];
  var ELEM = ["fire", "earth", "air", "water"];
  var QUAL = ["movable", "fixed", "dual"];
  var GL = { Sun: "Su", Moon: "Mo", Mars: "Ma", Mercury: "Me", Jupiter: "Ju",
             Venus: "Ve", Saturn: "Sa", Rahu: "Rā", Ketu: "Ke" };

  var NAKW = 360 / 27, PADW = NAKW / 4;

  var S = { lon: 0, paint: "elem", when: null, place: null };

  function esc2(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function dm(x) {
    var d = Math.floor(x), m = Math.floor((x - d) * 60),
        s = Math.round(((x - d) * 60 - m) * 60);
    if (s === 60) { s = 0; m++; }
    if (m === 60) { m = 0; d++; }
    return d + "°" + (m < 10 ? "0" : "") + m + "′" + (s < 10 ? "0" : "") + s + "″";
  }
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

  /* everything a longitude is, in one object — the page's single source */
  function at(L) {
    L = ((L % 360) + 360) % 360;
    var si = Math.floor(L / 30);
    var ni = Math.floor(L / NAKW);
    var pi = Math.floor(L / PADW);
    return {
      lon: L,
      sign: si, signName: SA[si], inSign: L - si * 30,
      lord: RLORD[si], elem: ELEM[si % 4], qual: QUAL[si % 3],
      parity: si % 2 === 0 ? "odd" : "even",
      nak: ni, nakName: NAK[ni], inNak: L - ni * NAKW,
      nakLord: VL[ni % 9],
      pada: pi, padaInNak: (pi % 4) + 1, inPada: L - pi * PADW,
      /* a pāda IS a navāṃśa: 108 pādas over 12 signs is 9 each, so the
         navāṃśa sign is the pāda index modulo twelve */
      navamsa: pi % 12
    };
  }

  function paintClass(si) {
    if (S.paint === "elem") return "e" + (si % 4);
    if (S.paint === "qual") return "q" + (si % 3);
    if (S.paint === "parity") return "p" + (si % 2);
    if (S.paint === "lord") return "l" + ["Sun", "Moon", "Mars", "Mercury",
      "Jupiter", "Venus", "Saturn"].indexOf(RLORD[si]);
    return "plain";
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
        host.innerHTML = '<p class="swfail">Could not load <code>' + sp.src + '</code>.</p>';
      };
      document.head.appendChild(s);
    })();
  }

  /* ---- the wheel --------------------------------------------------------- */
  function draw() {
    var W = 760, H = 720, cx = 380, cy = 352;
    var A = at(S.lon);
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="dvsvg" role="img" ' +
      'aria-label="One circle divided three ways: twelve rāśis, twenty-seven ' +
      'nakṣatras and a hundred and eight pādas, with a pointer at the chosen ' +
      'longitude"><title>The three divisions</title>';

    /* 108 pādas, innermost */
    for (var q = 0; q < 108; q++) {
      o += '<path d="' + wedge(cx, cy, 168, 196, q * PADW, (q + 1) * PADW) +
           '" class="dv-pada' + (q === A.pada ? " on" : (q % 2 ? " alt" : "")) + '"/>';
    }
    /* 27 nakṣatras */
    for (var n = 0; n < 27; n++) {
      o += '<path d="' + wedge(cx, cy, 200, 252, n * NAKW, (n + 1) * NAKW) +
           '" class="dv-nak' + (n === A.nak ? " on" : (n % 2 ? " alt" : "")) + '"/>';
      var nm = xy(cx, cy, 226, n * NAKW + NAKW / 2);
      var ang = n * NAKW + NAKW / 2;
      var rot = (ang > 90 && ang < 270) ? (180 - ang - 90) : (-ang + 90);
      o += '<text x="' + nm[0].toFixed(1) + '" y="' + (nm[1] + 3).toFixed(1) +
           '" class="dv-naklab' + (n === A.nak ? " on" : "") + '" transform="rotate(' +
           rot.toFixed(1) + ' ' + nm[0].toFixed(1) + ' ' + nm[1].toFixed(1) + ')">' +
           esc2(NAK[n]) + '</text>';
    }
    /* 12 rāśis, outermost */
    for (var s = 0; s < 12; s++) {
      o += '<path d="' + wedge(cx, cy, 256, 312, s * 30, s * 30 + 30) +
           '" class="dv-rasi ' + paintClass(s) + (s === A.sign ? " on" : "") + '"/>';
      var m = xy(cx, cy, 284, s * 30 + 15);
      o += '<text x="' + m[0].toFixed(1) + '" y="' + (m[1] + 4).toFixed(1) +
           '" class="dv-rasilab' + (s === A.sign ? " on" : "") + '">' +
           esc2(SA[s]) + '</text>';
    }
    /* the pointer */
    var tip = xy(cx, cy, 326, S.lon);
    o += '<line x1="' + cx + '" y1="' + cy + '" x2="' + tip[0].toFixed(1) + '" y2="' +
         tip[1].toFixed(1) + '" class="dv-ptr"/>';
    o += '<circle cx="' + cx + '" cy="' + cy + '" r="5" class="dv-hub"/>';
    /* the reading, in the middle */
    o += '<text x="' + cx + '" y="' + (cy - 34) + '" class="dv-c1">' +
         esc2(A.signName) + ' ' + esc2(dm(A.inSign)) + '</text>';
    o += '<text x="' + cx + '" y="' + (cy - 8) + '" class="dv-c2">' +
         esc2(A.nakName) + ' &#183; p&#257;da ' + A.padaInNak + '</text>';
    o += '<text x="' + cx + '" y="' + (cy + 16) + '" class="dv-c3">nav&#257;&#7745;&#347;a ' +
         esc2(SA[A.navamsa]) + '</text>';
    o += '<text x="' + cx + '" y="' + (cy + 38) + '" class="dv-c3">nak&#7779;atra lord ' +
         esc2(A.nakLord) + '</text>';
    o += "</svg>";
    host.innerHTML = o;
    readout(A);
  }

  function readout(A) {
    var h = $("dv-read");
    if (!h) return;
    $("dv-lonread").textContent = dm(A.lon) + " of the circle";
    h.innerHTML = '<div class="axgrid">' +
      cell("Rāśi", A.signName + " " + dm(A.inSign),
           A.elem + " · " + A.qual + " · " + A.parity + " · lord " + A.lord) +
      cell("Nakṣatra", A.nakName + " " + dm(A.inNak),
           "lord " + A.nakLord + " · number " + (A.nak + 1) + " of 27") +
      cell("Pāda", "pāda " + A.padaInNak + " of " + A.nakName,
           "number " + (A.pada + 1) + " of 108 · " + dm(A.inPada) + " into it") +
      cell("Navāṃśa", SA[A.navamsa],
           "the pāda and the navāṃśa are the same division") +
      '</div>';
    function cell(k, v, sub) {
      return '<div class="axcell"><b>' + esc2(v) + '</b><span>' + esc2(k) +
        " — " + esc2(sub) + "</span></div>";
    }
  }

  /* ---- 108 pādas against 12 navāṃśas ------------------------------------- */
  function padaStrip() {
    var h = $("dv-pada");
    if (!h) return;
    var W = 760, H = 150, L = 10, R = 10, T = 26;
    var bw = (W - L - R) / 108;
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="dvsvg" role="img" ' +
      'aria-label="The hundred and eight pādas laid flat, coloured by the ' +
      'navāṃśa sign each one is"><title>Pādas and navāṃśas are one grid</title>';
    for (var q = 0; q < 108; q++) {
      var x = L + q * bw;
      o += '<rect x="' + x.toFixed(2) + '" y="' + T + '" width="' + (bw - 0.4).toFixed(2) +
           '" height="46" class="dv-pstrip n' + (q % 12) + '"/>';
    }
    /* the rāśi boundaries fall every nine pādas, exactly */
    for (var s = 0; s <= 12; s++) {
      var bx = L + s * 9 * bw;
      o += '<line x1="' + bx.toFixed(2) + '" y1="' + (T - 6) + '" x2="' + bx.toFixed(2) +
           '" y2="' + (T + 52) + '" class="dv-pdiv"/>';
      if (s < 12) {
        o += '<text x="' + (bx + 4.5 * bw).toFixed(2) + '" y="' + (T + 68) +
             '" class="dv-plab">' + esc2(SA[s]) + '</text>';
      }
    }
    o += '<text x="' + L + '" y="' + (T - 12) + '" class="dv-phead">' +
         'each block of nine pādas is one rāśi; each colour is one navāṃśa sign, ' +
         'and the twelve colours repeat exactly nine times</text>';
    o += "</svg>";
    h.innerHTML = o;
    var n = $("dv-padanote");
    if (n) {
      n.innerHTML = "27 × 4 = <b>" + (27 * 4) + "</b> pādas; " + (27 * 4) + " ÷ 12 = <b>" +
        (27 * 4 / 12) + "</b> per rāśi. A pāda is <b>" + dm(PADW) +
        "</b> and a navāṃśa is 30° ÷ 9 = <b>" + dm(30 / 9) +
        "</b> — the same width, which is why they are the same division.";
    }
  }

  /* ---- the nine lords, three times round --------------------------------- */
  function lordStrip() {
    var h = $("dv-lords");
    if (!h) return;
    var W = 760, H = 190, L = 10, R = 10, T = 30;
    var bw = (W - L - R) / 27;
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="dvsvg" role="img" ' +
      'aria-label="The twenty-seven nakṣatras coloured by their lord, showing ' +
      'the nine Viṃśottarī lords repeating three times">' +
      '<title>Nine lords, three times round</title>';
    for (var n = 0; n < 27; n++) {
      var x = L + n * bw, li = n % 9;
      o += '<rect x="' + x.toFixed(2) + '" y="' + T + '" width="' + (bw - 1).toFixed(2) +
           '" height="44" class="dv-lstrip v' + li + '"/>';
      o += '<text x="' + (x + bw / 2).toFixed(2) + '" y="' + (T + 28) +
           '" class="dv-lglyph">' + esc2((GL[VL[li]] || "").slice(0, 2)) + '</text>';
      o += '<text x="' + (x + bw / 2).toFixed(2) + '" y="' + (T + 60) +
           '" class="dv-lnak" transform="rotate(-60 ' + (x + bw / 2).toFixed(2) +
           ' ' + (T + 60) + ')">' + esc2(NAK[n]) + '</text>';
    }
    for (var c = 1; c < 3; c++) {
      var cx2 = L + c * 9 * bw;
      o += '<line x1="' + cx2.toFixed(2) + '" y1="' + (T - 8) + '" x2="' + cx2.toFixed(2) +
           '" y2="' + (T + 50) + '" class="dv-cyc"/>';
    }
    o += '<text x="' + L + '" y="' + (T - 14) + '" class="dv-phead">' +
         'Ketu, Venus, Sun, Moon, Mars, Rāhu, Jupiter, Saturn, Mercury — then again, ' +
         'and again</text>';
    o += "</svg>";
    h.innerHTML = o;

    /* what a minute of Moon is worth in daśā, computed from the widths */
    var total = VL.reduce(function (a, k) { return a + VY[k]; }, 0);   /* 120 */
    var perDeg = total / NAKW;                /* years of daśā per degree of Moon */
    var perArcmin = perDeg / 60;
    var e = $("dv-perarc");
    if (e) {
      e.innerHTML = "<b>" + (perArcmin * 365.2425).toFixed(1) + " days</b> of daśā" +
        " (" + total + " years across " + dm(NAKW) + ")";
    }
  }

  /* ---- the classification table ------------------------------------------ */
  function table() {
    var t = $("dv-table");
    if (!t || t.firstChild) return;
    t.innerHTML = '<div class="aytabwrap"><table class="aytab"><thead><tr>' +
      '<th>#</th><th>Rāśi</th><th>Lord</th><th>Element</th><th>Mode</th>' +
      '<th>Parity</th><th>Nakṣatras it spans</th></tr></thead><tbody>' +
      SA.map(function (nm, i) {
        var from = i * 30, to = from + 30;
        var n0 = Math.floor(from / NAKW), n1 = Math.ceil(to / NAKW) - 1;
        var span = [];
        for (var k = n0; k <= n1; k++) span.push(NAK[k]);
        return '<tr><td class="num">' + (i + 1) + '</td><td>' + esc2(nm) + '</td><td>' +
          esc2(RLORD[i]) + '</td><td><span class="dvchip e' + (i % 4) + '">' +
          ELEM[i % 4] + '</span></td><td><span class="dvchip q' + (i % 3) + '">' +
          QUAL[i % 3] + '</span></td><td>' + (i % 2 === 0 ? "odd" : "even") +
          '</td><td class="note">' + esc2(span.join(", ")) + '</td></tr>';
      }).join("") + '</tbody></table></div>';
  }

  /* ---- the sky now -------------------------------------------------------- */
  function nowTable() {
    var t = $("dv-nowtab");
    if (!t || !window.quickSky || !S.place || S.when == null) return;
    var tz = S.place.tz || 0;
    var d = new Date(S.when + tz * 3600000);
    var sk = window.quickSky({
      year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
      hour: d.getUTCHours(), minute: d.getUTCMinutes(), second: d.getUTCSeconds(),
      tzHours: tz, lat: S.place.lat, lon: S.place.lon });
    if (!sk) { t.innerHTML = ""; return; }
    t.innerHTML = '<div class="aytabwrap"><table class="aytab"><thead><tr>' +
      '<th>Graha</th><th>longitude</th><th>rāśi</th><th>nakṣatra</th>' +
      '<th>pāda</th><th>navāṃśa</th><th>nakṣatra lord</th></tr></thead><tbody>' +
      sk.planets.map(function (p) {
        var A = at(p.sid);
        return '<tr><td>' + esc2(p.en) + '</td><td class="num">' + esc2(dm(p.sid)) +
          '</td><td>' + esc2(A.signName) + '</td><td>' + esc2(A.nakName) +
          '</td><td class="num">' + A.padaInNak + '</td><td>' + esc2(SA[A.navamsa]) +
          '</td><td>' + esc2(A.nakLord) + '</td></tr>';
      }).join("") +
      '<tr class="mine"><td>Lagna</td><td class="num">' + esc2(dm(sk.lagna)) +
      '</td><td>' + esc2(at(sk.lagna).signName) + '</td><td>' +
      esc2(at(sk.lagna).nakName) + '</td><td class="num">' + at(sk.lagna).padaInNak +
      '</td><td>' + esc2(SA[at(sk.lagna).navamsa]) + '</td><td>' +
      esc2(at(sk.lagna).nakLord) + '</td></tr>' +
      '</tbody></table></div>';
    return sk;
  }

  function syncWhen() {
    var e = $("dv-when");
    if (!e || S.when == null) return;
    var d = new Date(S.when + (S.place ? S.place.tz : 0) * 3600000);
    e.value = d.getUTCFullYear() + "-" +
      String(d.getUTCMonth() + 1).padStart(2, "0") + "-" +
      String(d.getUTCDate()).padStart(2, "0") + "T" +
      String(d.getUTCHours()).padStart(2, "0") + ":" +
      String(d.getUTCMinutes()).padStart(2, "0");
  }

  function bind() {
    document.addEventListener("input", function (e) {
      if (e.target.id === "dv-lon") { S.lon = +e.target.value; draw(); }
    });
    document.addEventListener("change", function (e) {
      var t = e.target;
      if (t.id === "dv-paint") { S.paint = t.value; draw(); }
      else if (t.id === "dv-when") {
        var v = Date.parse(t.value);
        if (!isNaN(v)) { S.when = v - (S.place ? S.place.tz : 0) * 3600000; nowTable(); }
      }
    });
    document.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-dv]") : null;
      if (!b) return;
      var k = b.getAttribute("data-dv");
      if (k === "now") { S.when = Date.now(); syncWhen(); nowTable(); }
      else if (k === "moon") {
        var sk = nowTable();
        if (!sk) return;
        var mo = sk.planets.filter(function (x) { return x.en === "Moon"; })[0];
        if (!mo) return;
        S.lon = mo.sid;
        var r = $("dv-lon"); if (r) r.value = String(S.lon);
        draw();
        host.scrollIntoView({ block: "center" });
      }
    });
  }

  need([
    { src: "engine.js", have: function () { return !!window.quickSky; } },
    { src: "panchanga.js", have: function () { return !!(window.NP && window.NP.day); } },
    { src: "places.js", have: function () { return !!window.NPlaces; } }
  ], function () {
    S.place = (window.NP && window.NP.savedPlace && window.NP.savedPlace()) ||
              { n: "Ujjain", lat: 23.1765, lon: 75.7885, tz: 5.5 };
    S.when = Date.now();
    var ph = $("dv-place");
    if (ph && window.NPlaces.picker) {
      window.NPlaces.picker({
        host: ph, value: S.place,
        quick: [S.place].concat((window.NP && window.NP.PLACES) || []),
        label: "Place",
        refMs: function () { return S.when || Date.now(); },
        onPick: function (p) { S.place = p; syncWhen(); nowTable(); }
      });
    }
    syncWhen();
    draw();
    padaStrip();
    lordStrip();
    table();
    nowTable();
    bind();
  });
})();
;
