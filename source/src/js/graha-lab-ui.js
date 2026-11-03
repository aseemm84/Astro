/* graha-lab.html — the nine grahas, and dignity as a map rather than a table.
 *
 * CHART-INDEPENDENT. The ribbon is a drawing of the dignity scheme and needs
 * no sky at all; the live sections ask window.quickSky for a moment and a
 * place, which is nothing natal.
 *
 * ONE AUTHORITY FOR DIGNITY. Every colour on this page comes from
 * window.__kDign.of — the engine's own digOf, the same function the chart
 * report decides dignity with. The tables behind it (EXALT, DEBIL, OWNS,
 * MTR, FRD, ENM) are published alongside it so the cards can state the
 * ranges, but nothing here re-implements the decision. A page that restated
 * the dignity rules would eventually disagree with the chart about whether a
 * graha is in its own sign, and the reader would have no way to tell which
 * was wrong.
 */
(function () {
  "use strict";

  var host = document.getElementById("gl-ribbon");
  if (!host) return;
  var $ = function (id) { return document.getElementById(id); };

  var SA = ["Meṣa", "Vṛṣabha", "Mithuna", "Karka", "Siṃha", "Kanyā",
            "Tulā", "Vṛścika", "Dhanus", "Makara", "Kumbha", "Mīna"];
  var SEVEN = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
  var NINE = SEVEN.concat(["Rahu", "Ketu"]);
  var SKT = { Sun: "Sūrya", Moon: "Candra", Mars: "Maṅgala", Mercury: "Budha",
              Jupiter: "Guru", Venus: "Śukra", Saturn: "Śani",
              Rahu: "Rāhu", Ketu: "Ketu" };
  /* natural benefic / malefic as BPHS gives it, with the Moon's and
     Mercury's well-known conditionality stated rather than flattened */
  var NATURE = {
    Sun: ["malefic", "a mild malefic; cruel by nature but not an enemy"],
    Moon: ["conditional", "benefic when waxing and full, malefic when thin"],
    Mars: ["malefic", "a malefic"],
    Mercury: ["conditional", "benefic alone, and takes on the character of whatever it joins"],
    Jupiter: ["benefic", "the great benefic"],
    Venus: ["benefic", "a benefic"],
    Saturn: ["malefic", "a malefic"],
    Rahu: ["malefic", "treated as malefic; a chāyā graha, not a body"],
    Ketu: ["malefic", "treated as malefic; a chāyā graha, not a body"]
  };
  var DIGS = ["exalted", "moolatrikona", "own", "friend", "neutral", "enemy",
              "debilitated", "node"];
  var DIGLAB = { exalted: "exalted", moolatrikona: "mūlatrikoṇa", own: "own sign",
                 friend: "friend's sign", neutral: "neutral", enemy: "enemy's sign",
                 debilitated: "debilitated", node: "no rulership scheme" };

  var S = { lon: 0, when: null, place: null, marks: null };

  function esc2(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function dm(x) {
    var d = Math.floor(x), m = Math.round((x - d) * 60);
    if (m === 60) { m = 0; d++; }
    return d + "°" + (m < 10 ? "0" : "") + m + "′";
  }
  function signDm(L) {
    L = ((L % 360) + 360) % 360;
    return SA[Math.floor(L / 30)] + " " + dm(L % 30);
  }
  function D() { return window.__kDign; }
  function digAt(p, L) {
    var g = D();
    if (!g || !g.of) return null;
    L = ((L % 360) + 360) % 360;
    return g.of(p, Math.floor(L / 30), L % 30);
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

  /* ---- the ribbon --------------------------------------------------------
     Sampled at a quarter of a degree and merged into runs, so a mūlatrikoṇa
     band a few degrees wide is drawn at its true width rather than rounded
     to a sign. */
  function runs(p) {
    var step = 0.25, out = [], cur = null;
    for (var L = 0; L < 360; L += step) {
      var d = digAt(p, L + step / 2);
      if (cur && cur.d === d) cur.to = L + step;
      else { cur = { d: d, from: L, to: L + step }; out.push(cur); }
    }
    return out;
  }

  function ribbon() {
    var g = D();
    if (!g) { host.innerHTML = '<p class="swfail">The dignity tables are not loaded.</p>'; return; }
    var W = 760, L = 74, R = 12, rowH = 30, gap = 7, T = 38;
    var H = T + SEVEN.length * (rowH + gap) + 46;
    var sx = function (deg) { return L + deg / 360 * (W - L - R); };
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="glsvg" role="img" ' +
      'aria-label="Each graha\'s dignity across the whole zodiac, as a coloured ' +
      'band per graha"><title>The dignity scheme</title>';
    /* the sign grid, behind everything */
    for (var s = 0; s <= 12; s++) {
      o += '<line x1="' + sx(s * 30).toFixed(1) + '" y1="' + (T - 10) + '" x2="' +
           sx(s * 30).toFixed(1) + '" y2="' + (T + SEVEN.length * (rowH + gap)) +
           '" class="gl-grid"/>';
      if (s < 12) {
        o += '<text x="' + sx(s * 30 + 15).toFixed(1) + '" y="' + (T - 16) +
             '" class="gl-sign">' + esc2(SA[s].slice(0, 4)) + '</text>';
      }
    }
    SEVEN.forEach(function (p, i) {
      var y = T + i * (rowH + gap);
      runs(p).forEach(function (r) {
        o += '<rect x="' + sx(r.from).toFixed(2) + '" y="' + y + '" width="' +
             Math.max(0.5, sx(r.to) - sx(r.from)).toFixed(2) + '" height="' + rowH +
             '" class="gl-d ' + r.d + '"/>';
      });
      o += '<text x="' + (L - 10) + '" y="' + (y + rowH / 2 + 4) +
           '" class="gl-row">' + esc2(SKT[p]) + '</text>';
    });
    /* the pointer, and the grahas' real positions if asked for */
    o += '<line x1="' + sx(S.lon).toFixed(1) + '" y1="' + (T - 10) + '" x2="' +
         sx(S.lon).toFixed(1) + '" y2="' + (T + SEVEN.length * (rowH + gap) + 6) +
         '" class="gl-ptr"/>';
    if (S.marks) {
      SEVEN.forEach(function (p, i) {
        var m = S.marks[p];
        if (m == null) return;
        var y = T + i * (rowH + gap) + rowH / 2;
        o += '<circle cx="' + sx(m).toFixed(1) + '" cy="' + y + '" r="6" class="gl-mark"/>';
      });
    }
    /* the key */
    var kx = L, ky = T + SEVEN.length * (rowH + gap) + 26;
    DIGS.filter(function (d) { return d !== "node"; }).forEach(function (d, i) {
      var x = kx + i * 98;
      o += '<rect x="' + x + '" y="' + (ky - 9) + '" width="14" height="11" class="gl-d ' +
           d + '"/>';
      o += '<text x="' + (x + 19) + '" y="' + ky + '" class="gl-key">' +
           esc2(DIGLAB[d]) + '</text>';
    });
    o += "</svg>";
    host.innerHTML = o;
    atReadout();
  }

  function atReadout() {
    var h = $("gl-at");
    if (!h) return;
    $("gl-lonread").textContent = signDm(S.lon);
    h.innerHTML = '<div class="axgrid">' + NINE.map(function (p) {
      var d = digAt(p, S.lon);
      return '<div class="axcell"><b>' + esc2(SKT[p]) + '</b><span class="gldig ' +
        esc2(d) + '">' + esc2(DIGLAB[d] || d) + "</span></div>";
    }).join("") + "</div>";
  }

  /* ---- the mūlatrikoṇa ranges, from the engine's own table --------------- */
  function mtTable() {
    var g = D();
    var t = $("gl-mt");
    if (!t || !g) return;
    t.innerHTML = '<div class="aytabwrap"><table class="aytab"><thead><tr>' +
      '<th>Graha</th><th>mūlatrikoṇa</th><th>width</th><th>exalted in</th>' +
      '<th>debilitated in</th><th>owns</th><th>on the ribbon</th>' +
      '</tr></thead><tbody>' +
      SEVEN.map(function (p) {
        var m = g.MTR[p];
        /* COMPUTED, not listed: a mūlatrikoṇa band is invisible on the ribbon
           exactly when it falls in the graha's own exaltation sign, because
           digOf tests exaltation first. Asking the tables rather than naming
           Candra and Budha keeps this true if a table ever changes. */
        var eaten = m[0] === g.EXALT[p];
        return '<tr><td>' + esc2(SKT[p]) + '</td>' +
          '<td>' + esc2(SA[m[0]]) + " " + m[1] + "°–" + m[2] + '°</td>' +
          '<td class="num">' + (m[2] - m[1]) + '°</td>' +
          '<td>' + esc2(SA[g.EXALT[p]]) + '</td>' +
          '<td>' + esc2(SA[g.DEBIL[p]]) + '</td>' +
          '<td>' + esc2(g.OWNS[p].map(function (s) { return SA[s]; }).join(", ")) +
          '</td><td class="glate">' + (eaten
            ? '<span class="gldig exalted">exaltation wins</span>'
            : "drawn") + "</td></tr>";
      }).join("") + '</tbody></table></div>';
  }

  /* ---- the sky now, and the cards ---------------------------------------- */
  function sky() {
    if (!window.quickSky || !S.place || S.when == null) return null;
    var tz = S.place.tz || 0;
    var d = new Date(S.when + tz * 3600000);
    return window.quickSky({
      year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
      hour: d.getUTCHours(), minute: d.getUTCMinutes(), second: d.getUTCSeconds(),
      tzHours: tz, lat: S.place.lat, lon: S.place.lon });
  }

  function cards() {
    var g = D();
    var h = $("gl-cards");
    if (!h || !g) return;
    var sk = sky();
    var pos = {};
    if (sk) sk.planets.forEach(function (p) { pos[p.en] = p; });
    h.innerHTML = NINE.map(function (p) {
      var pl = pos[p];
      var d = pl ? digAt(p, pl.sid) : null;
      var node = (p === "Rahu" || p === "Ketu");
      return '<div class="glcard"><div class="glhead"><b>' + esc2(SKT[p]) +
        '</b><span class="glnat ' + esc2(NATURE[p][0]) + '">' +
        esc2(NATURE[p][0]) + '</span></div>' +
        '<p class="glnote">' + esc2(NATURE[p][1]) + '</p>' +
        (node
          ? '<p class="glnote">No sign rulership, so no own sign, no mūlatrikoṇa ' +
            'and no friendship scheme.</p>'
          : '<dl class="gldl">' +
            dt("owns", g.OWNS[p].map(function (s) { return SA[s]; }).join(", ")) +
            dt("exalted", SA[g.EXALT[p]]) +
            dt("debilitated", SA[g.DEBIL[p]]) +
            dt("mūlatrikoṇa", SA[g.MTR[p][0]] + " " + g.MTR[p][1] + "°–" + g.MTR[p][2] + "°") +
            dt("friends", g.FRD[p].join(", ") || "—") +
            dt("enemies", g.ENM[p].join(", ") || "—") +
            "</dl>") +
        (pl
          ? '<div class="glnow"><b>' + esc2(signDm(pl.sid)) + '</b>' +
            '<span class="gldig ' + esc2(d) + '">' + esc2(DIGLAB[d] || d) + '</span>' +
            '<span class="glspd">' + (pl.speed == null ? "" :
              (pl.speed < 0 ? "retrograde, " : "") +
              Math.abs(pl.speed).toFixed(3) + "°/day") + '</span></div>'
          : "") +
        "</div>";
    }).join("");
    function dt(k, v) { return "<dt>" + esc2(k) + "</dt><dd>" + esc2(v) + "</dd>"; }
    speed(sk);
  }

  /* ---- speed, on a log scale --------------------------------------------- */
  function speed(sk) {
    var h = $("gl-speed");
    if (!h) return;
    if (!sk) { h.innerHTML = ""; return; }
    var rows = sk.planets.filter(function (p) { return p.speed != null; })
      .map(function (p) { return { en: p.en, v: Math.abs(p.speed), retro: p.speed < 0 }; })
      .filter(function (r) { return r.v > 1e-6; })
      .sort(function (a, b) { return b.v - a.v; });
    if (!rows.length) { h.innerHTML = ""; return; }
    var W = 760, L = 96, R = 150, T = 24, rowH = 26;
    var H = T + rows.length * rowH + 34;
    var lo = Math.min.apply(null, rows.map(function (r) { return r.v; }));
    var hi = Math.max.apply(null, rows.map(function (r) { return r.v; }));
    var l0 = Math.log10(lo) - 0.15, l1 = Math.log10(hi) + 0.05;
    var sx = function (v) { return L + (Math.log10(v) - l0) / (l1 - l0) * (W - L - R); };
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="glsvg" role="img" ' +
      'aria-label="How fast each graha is moving right now, on a logarithmic ' +
      'scale"><title>Daily motion</title>';
    rows.forEach(function (r, i) {
      var y = T + i * rowH;
      o += '<line x1="' + L + '" y1="' + (y + 11) + '" x2="' + sx(r.v).toFixed(1) +
           '" y2="' + (y + 11) + '" class="gl-sbar' + (r.retro ? " retro" : "") + '"/>';
      o += '<circle cx="' + sx(r.v).toFixed(1) + '" cy="' + (y + 11) + '" r="5" class="gl-sdot' +
           (r.retro ? " retro" : "") + '"/>';
      o += '<text x="' + (L - 10) + '" y="' + (y + 15) + '" class="gl-row">' +
           esc2(SKT[r.en]) + '</text>';
      o += '<text x="' + (sx(r.v) + 12).toFixed(1) + '" y="' + (y + 15) +
           '" class="gl-sval">' + r.v.toFixed(3) + '°/day' +
           (r.retro ? " · retrograde" : "") + '</text>';
    });
    o += "</svg>";
    h.innerHTML = o;

    var fast = rows[0], slow = rows[rows.length - 1];
    var n = $("gl-speednote");
    if (n) {
      n.innerHTML = "At this moment <b>" + esc2(SKT[fast.en]) + "</b> is moving <b>" +
        (fast.v / slow.v).toFixed(0) + " times</b> faster than <b>" +
        esc2(SKT[slow.en]) + "</b>. At that rate " + esc2(SKT[fast.en]) +
        " crosses a rāśi in <b>" + (30 / fast.v).toFixed(1) + " days</b> and " +
        esc2(SKT[slow.en]) + " takes <b>" + (30 / slow.v / 365.2425).toFixed(1) +
        " years</b>" + (slow.retro ? ", though it is retrograde just now" : "") + ".";
    }
  }

  function syncWhen() {
    var e = $("gl-when");
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
      if (e.target.id === "gl-lon") { S.lon = +e.target.value; ribbon(); }
    });
    document.addEventListener("change", function (e) {
      if (e.target.id === "gl-when") {
        var v = Date.parse(e.target.value);
        if (!isNaN(v)) { S.when = v - (S.place ? S.place.tz : 0) * 3600000; cards(); }
      }
    });
    document.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-gl]") : null;
      if (!b) return;
      var k = b.getAttribute("data-gl");
      if (k === "nowm") { S.when = Date.now(); syncWhen(); cards(); }
      else if (k === "now") {
        var sk = sky();
        if (!sk) return;
        S.marks = {};
        sk.planets.forEach(function (p) { S.marks[p.en] = p.sid; });
        ribbon();
      }
    });
  }

  need([
    { src: "engine.js", have: function () { return !!(window.quickSky && window.__kDign); } },
    { src: "panchanga.js", have: function () { return !!(window.NP && window.NP.day); } },
    { src: "places.js", have: function () { return !!window.NPlaces; } }
  ], function () {
    S.place = (window.NP && window.NP.savedPlace && window.NP.savedPlace()) ||
              { n: "Ujjain", lat: 23.1765, lon: 75.7885, tz: 5.5 };
    S.when = Date.now();
    var ph = $("gl-place");
    if (ph && window.NPlaces.picker) {
      window.NPlaces.picker({
        host: ph, value: S.place,
        quick: [S.place].concat((window.NP && window.NP.PLACES) || []),
        label: "Place",
        refMs: function () { return S.when || Date.now(); },
        onPick: function (p) { S.place = p; syncWhen(); cards(); }
      });
    }
    syncWhen();
    ribbon();
    mtTable();
    cards();
    bind();
  });
})();
