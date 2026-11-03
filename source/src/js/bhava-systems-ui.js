/* bhava-systems.html — three ways to divide a life, drawn on one circle.
 *
 * CHART-INDEPENDENT. The only inputs are a moment and a place; the lagna and
 * the MC come from window.quickSky, which needs nothing natal. Śrīpati needs
 * exactly those two and nothing else, which is why this page can exist at all
 * without a birth chart.
 *
 * ONE ŚRĪPATI. The construction is report/sections/72-sripati.js, concatenated
 * into this bundle rather than reimplemented — the same module the chart
 * report reads through, so a cusp here and a cusp there cannot disagree. It
 * has no free globals, which is what makes that possible.
 *
 * NOTHING IS TYPED INTO THE PROSE. Every boundary, width and disagreement on
 * the page is computed here at the moment you are looking at it.
 */
(function () {
  "use strict";

  var host = document.getElementById("bh-wheel");
  if (!host) return;
  var $ = function (id) { return document.getElementById(id); };

  var S = { when: null, place: null, lat: 24,
            show: { whole: true, equal: true, sripati: true, grahas: true } };

  var SA = ["Meṣa", "Vṛṣabha", "Mithuna", "Karka", "Siṃha", "Kanyā",
            "Tulā", "Vṛścika", "Dhanus", "Makara", "Kumbha", "Mīna"];
  var GL = { Sun: "Su", Moon: "Mo", Mars: "Ma", Mercury: "Me", Jupiter: "Ju",
             Venus: "Ve", Saturn: "Sa", Rahu: "Rā", Ketu: "Ke" };
  /* BPHS, Vol. 1 — the baseline significations, kept short on purpose: the
     written page carries the full account and this one is a diagram. */
  var BHAVA = [
    ["Tanu", "body, appearance, temperament, the self"],
    ["Dhana", "wealth, family, speech, what is accumulated"],
    ["Sahaja", "courage, siblings, effort, short journeys"],
    ["Bandhu", "mother, home, land, vehicles, inner ease"],
    ["Putra", "children, learning, mantra, discernment"],
    ["Ari", "illness, debts, enemies, service, obstacles"],
    ["Yuvati", "spouse, partnership, trade, the other"],
    ["Randhra", "longevity, hidden things, inheritance, upheaval"],
    ["Dharma", "fortune, belief, teachers, pilgrimage, the father"],
    ["Karma", "work, standing, action in the world"],
    ["Labha", "gain, income, networks, what is received"],
    ["Vyaya", "expense, loss, seclusion, release"]
  ];

  function esc2(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function dm(x) {
    x = ((x % 360) + 360) % 360;
    var d = Math.floor(x), m = Math.round((x - d) * 60);
    if (m === 60) { m = 0; d++; }
    return d + "°" + (m < 10 ? "0" : "") + m + "′";
  }
  function signDm(L) {
    L = ((L % 360) + 360) % 360;
    return SA[Math.floor(L / 30)] + " " + dm(L % 30);
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
  function arcLen(a, b) { return ((b - a) % 360 + 360) % 360; }

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

  /* ---- the sky, for a moment and a place and nothing else --------------- */
  function sky(lat) {
    if (!window.quickSky || !S.place || S.when == null) return null;
    var tz = S.place.tz || 0;
    var d = new Date(S.when + tz * 3600000);
    return window.quickSky({
      year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
      hour: d.getUTCHours(), minute: d.getUTCMinutes(), second: d.getUTCSeconds(),
      tzHours: tz, lat: lat == null ? S.place.lat : lat, lon: S.place.lon
    });
  }

  /* The three sets of boundaries, as twelve starting longitudes each.
     Whole-sign and equal are arithmetic; Śrīpati comes from the module the
     report uses, so this page cannot drift away from the chart. */
  function systems(sk) {
    if (!sk) return null;
    var lag = sk.lagna, out = {};
    out.whole = [];
    var s0 = Math.floor(lag / 30) * 30;
    for (var i = 0; i < 12; i++) out.whole.push((s0 + i * 30) % 360);
    out.equal = [];
    for (var j = 0; j < 12; j++) out.equal.push((lag + j * 30) % 360);
    out.sripati = null;
    try {
      var sp = window.SPSripati && window.SPSripati.build
        ? window.SPSripati.build(lag, sk.mc) : null;
      if (sp && sp.sandhi) {
        /* ONE-INDEXED, with a null at [0] and length 13 — and sandhi[h] is
           the CLOSING junction of house h, so house 1 runs from sandhi[12].
           Checking for length 12 silently discarded the whole construction
           and the page drew two rings where it should have drawn three,
           with no error anywhere to say so. */
        out.sripati = [];
        for (var k = 0; k < 12; k++) out.sripati.push(sp.sandhi[k === 0 ? 12 : k]);
        out.madhya = [];
        for (var k2 = 1; k2 <= 12; k2++) out.madhya.push(sp.madhya[k2]);
        out._sp = sp;
      }
    } catch (e) { out.sripati = null; }
    return out;
  }
  function houseOfBounds(bounds, L) {
    for (var i = 0; i < 12; i++) {
      var a = bounds[i], b = bounds[(i + 1) % 12];
      if (arcLen(a, L) < arcLen(a, b)) return i + 1;
    }
    return 1;
  }

  /* ---- the wheel --------------------------------------------------------- */
  var RINGS = [
    { key: "whole", r0: 196, r1: 232, cls: "bh-whole", label: "whole sign" },
    { key: "equal", r0: 156, r1: 192, cls: "bh-equal", label: "equal" },
    { key: "sripati", r0: 116, r1: 152, cls: "bh-sri", label: "Śrīpati" }
  ];

  function draw() {
    var sk = sky();
    if (!sk) { host.innerHTML = '<p class="swfail">Could not compute that moment.</p>'; return; }
    var sys = systems(sk);
    var W = 760, H = 700, cx = 380, cy = 340;
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="bhsvg" role="img" ' +
      'aria-label="The twelve rāśis with three sets of bhāva boundaries drawn ' +
      'inside them, and the grahas at their longitudes">' +
      '<title>Three house systems on one circle</title>';

    /* the rāśis, which nobody disputes */
    for (var s = 0; s < 12; s++) {
      o += '<path d="' + wedge(cx, cy, 236, 282, s * 30, s * 30 + 30) +
           '" class="bh-rasi' + (s % 2 ? " alt" : "") + '"/>';
      var m = xy(cx, cy, 259, s * 30 + 15);
      o += '<text x="' + m[0].toFixed(1) + '" y="' + (m[1] + 4).toFixed(1) +
           '" class="bh-rasilab">' + esc2(SA[s]) + '</text>';
    }

    RINGS.forEach(function (R) {
      var b = sys[R.key];
      if (!b || !S.show[R.key]) return;
      for (var i = 0; i < 12; i++) {
        var a0 = b[i], a1 = b[(i + 1) % 12];
        o += '<path d="' + wedge(cx, cy, R.r0, R.r1, a0, a1) +
             '" class="' + R.cls + (i % 2 ? " alt" : "") + '"/>';
        var w = arcLen(a0, a1);
        var mid = xy(cx, cy, (R.r0 + R.r1) / 2, a0 + w / 2);
        o += '<text x="' + mid[0].toFixed(1) + '" y="' + (mid[1] + 3.5).toFixed(1) +
             '" class="bh-hn">' + (i + 1) + '</text>';
      }
    });

    /* the lagna and the MC, which are what the whole construction rests on */
    [[sk.lagna, "bh-lagna", "lagna"], [sk.mc, "bh-mc", "MC"]].forEach(function (z) {
      var p = xy(cx, cy, 296, z[0]);
      o += '<line x1="' + cx + '" y1="' + cy + '" x2="' + p[0].toFixed(1) + '" y2="' +
           p[1].toFixed(1) + '" class="' + z[1] + '"/>';
      var l = xy(cx, cy, 310, z[0]);
      o += '<text x="' + l[0].toFixed(1) + '" y="' + (l[1] + 4).toFixed(1) +
           '" class="bh-axlab ' + z[1] + '">' + z[2] + '</text>';
    });

    /* the grahas, each on its own small ring so a conjunction stays legible */
    if (S.show.grahas) {
      var used = [];
      sk.planets.forEach(function (p) {
        var r = 100;
        while (used.some(function (u) {
          return Math.abs(u.r - r) < 1 && arcLen(Math.min(u.l, p.sid), Math.max(u.l, p.sid)) < 9;
        })) r -= 17;
        used.push({ r: r, l: p.sid });
        var q = xy(cx, cy, r, p.sid);
        o += '<circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) +
             '" r="11" class="bh-g"/>';
        o += '<text x="' + q[0].toFixed(1) + '" y="' + (q[1] + 4).toFixed(1) +
             '" class="bh-glab">' + esc2(GL[p.en] || p.en) + '</text>';
      });
    }
    o += "</svg>";
    host.innerHTML = o;

    stamp(sk);
    table(sk, sys);
    cusp(sys);
  }

  function stamp(sk) {
    var e = $("bh-stamp");
    if (!e) return;
    e.innerHTML = "Lagna <b>" + esc2(signDm(sk.lagna)) + "</b> &nbsp;·&nbsp; MC <b>" +
      esc2(signDm(sk.mc)) + "</b> &nbsp;·&nbsp; " + esc2(S.place.n) +
      " &nbsp;·&nbsp; the two are <b>" + dm(arcLen(sk.mc, sk.lagna)) +
      "</b> apart, where equal houses would need exactly 90°";
  }

  function toggles() {
    var h = $("bh-toggles");
    if (!h || h.firstChild) return;
    h.innerHTML = RINGS.map(function (R) {
      return '<label class="swchk"><input type="checkbox" data-bhtog="' + R.key +
        '" checked> ' + esc2(R.label) + "</label>";
    }).join("") +
      '<label class="swchk"><input type="checkbox" data-bhtog="grahas" checked> Grahas</label>';
  }

  /* ---- who disagrees ----------------------------------------------------- */
  function table(sk, sys) {
    var t = $("bh-table");
    if (!t) return;
    if (!sys.sripati) {
      t.innerHTML = '<p class="swfail">The Śrīpati construction does not resolve ' +
        'at this moment and place — see the latitude section below.</p>';
      return;
    }
    var rows = sk.planets.map(function (p) {
      var w = houseOfBounds(sys.whole, p.sid);
      var e = houseOfBounds(sys.equal, p.sid);
      var s = { house: sys._sp.houseOf(p.sid) };
      var cs = sys._sp.cuspStrength(p.sid);
      return { en: p.en, lon: p.sid, w: w, e: e, s: s ? s.house : null,
               frac: cs ? cs.frac : null, sandhi: cs ? cs.atSandhi : false };
    });
    var dis = rows.filter(function (r) { return !(r.w === r.e && r.e === r.s); });
    t.innerHTML =
      '<p class="bhsum">' + (dis.length
        ? "<b>" + dis.length + " of the nine</b> fall in a different bhāva depending on " +
          "which system is used."
        : "<b>All nine</b> fall in the same bhāva under all three systems at this moment — " +
          "which happens, and is worth seeing as often as the disagreements.") + '</p>' +
      '<div class="aytabwrap"><table class="aytab"><thead><tr><th>Graha</th>' +
      '<th>longitude</th><th>whole sign</th><th>equal</th><th>Śrīpati</th>' +
      '<th>from the madhya</th></tr></thead><tbody>' +
      rows.map(function (r) {
        var odd = !(r.w === r.e && r.e === r.s);
        return '<tr' + (odd ? ' class="mine"' : '') + '><td>' + esc2(r.en) + '</td>' +
          '<td class="num">' + esc2(signDm(r.lon)) + '</td>' +
          '<td class="num">' + r.w + '</td><td class="num">' + r.e + '</td>' +
          '<td class="num">' + (r.s == null ? "—" : r.s) + '</td>' +
          '<td>' + (r.frac == null ? "—" :
            '<span class="bhbar"><i style="width:' + (r.frac * 100).toFixed(0) +
            '%"></i></span> ' + (r.sandhi ? "at the sandhi" :
              (r.frac * 100).toFixed(0) + "% of full")) + '</td></tr>';
      }).join("") + '</tbody></table></div>';
  }

  /* ---- the fifteen-degree rule, drawn ------------------------------------ */
  function cusp(sys) {
    var h = $("bh-cusp");
    if (!h || !sys || !sys.sripati) { if (h) h.innerHTML = ""; return; }
    var W = 700, H = 230, L = 56, R = 24, T = 20, B = 44;
    var widths = [];
    for (var i = 0; i < 12; i++) widths.push(arcLen(sys.sripati[i], sys.sripati[(i + 1) % 12]));
    /* drawn for the widest and the narrowest house, because the rule behaves
       differently in the two and that difference is the point */
    var wi = widths.indexOf(Math.max.apply(null, widths));
    var ni = widths.indexOf(Math.min.apply(null, widths));
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="bhsvg" role="img" ' +
      'aria-label="How a graha\'s effect for a bhāva falls from full at the ' +
      'madhya to nothing at the sandhi">' +
      '<title>The fifteen-degree rule</title>';
    o += '<line x1="' + L + '" y1="' + (H - B) + '" x2="' + (W - R) + '" y2="' + (H - B) +
         '" class="ay-axis0"/>';
    var scale = Math.max(widths[wi], 30) / 2;
    [[wi, "wide"], [ni, "narrow"]].forEach(function (pair, k) {
      var hw = widths[pair[0]] / 2, half = Math.min(15, hw);
      var pts = [];
      for (var d = -scale; d <= scale; d += 0.5) {
        var v = Math.abs(d) >= hw ? 0 : Math.max(0, 1 - Math.abs(d) / half);
        var x = L + (d + scale) / (2 * scale) * (W - L - R);
        var y = (H - B) - v * (H - B - T);
        pts.push((pts.length ? "L" : "M") + x.toFixed(1) + "," + y.toFixed(1));
      }
      o += '<path d="' + pts.join(" ") + '" class="bh-cv c' + k + '"/>';
      o += '<text x="' + (W - R - 4) + '" y="' + (T + 16 + k * 18) +
           '" class="bh-cvlab c' + k + '">bhāva ' + (pair[0] + 1) + ', ' +
           widths[pair[0]].toFixed(1) + '° wide</text>';
    });
    o += '<text x="' + (L + (W - L - R) / 2) + '" y="' + (H - B + 18) +
         '" class="ay-dx">the madhya</text>';
    o += '<text x="' + L + '" y="' + (H - B + 18) + '" class="ay-dx">sandhi</text>';
    o += '<text x="' + (W - R) + '" y="' + (H - B + 18) + '" class="ay-dx">sandhi</text>';
    o += '<text x="' + (L - 8) + '" y="' + (T + 6) + '" class="ay-dtick">full</text>';
    o += '<text x="' + (L - 8) + '" y="' + (H - B + 4) + '" class="ay-dtick">none</text>';
    o += "</svg>";
    h.innerHTML = o;
  }

  /* ---- latitude ---------------------------------------------------------- */
  function latPlot() {
    var h = $("bh-latplot");
    if (!h) return;
    var pts = [], fails = [];
    for (var lat = -72; lat <= 72; lat += 2) {
      var sk = sky(lat);
      var sy = sk ? systems(sk) : null;
      if (!sy || !sy.sripati) { fails.push(lat); continue; }
      var w = [];
      for (var i = 0; i < 12; i++) w.push(arcLen(sy.sripati[i], sy.sripati[(i + 1) % 12]));
      pts.push({ lat: lat, max: Math.max.apply(null, w), min: Math.min.apply(null, w) });
    }
    if (!pts.length) { h.innerHTML = ""; return; }
    var W = 700, H = 280, L = 54, R = 86, T = 22, B = 44;
    var hi = Math.max.apply(null, pts.map(function (p) { return p.max; }));
    var lo = Math.min.apply(null, pts.map(function (p) { return p.min; }));
    hi = Math.ceil(hi / 10) * 10; lo = Math.floor(lo / 10) * 10;
    var sx = function (la) { return L + (la + 72) / 144 * (W - L - R); };
    var sy2 = function (v) { return T + (1 - (v - lo) / (hi - lo)) * (H - T - B); };
    var o = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="bhsvg" role="img" ' +
      'aria-label="The widest and narrowest Śrīpati house against latitude">' +
      '<title>House width against latitude</title>';
    o += '<line x1="' + L + '" y1="' + sy2(30).toFixed(1) + '" x2="' + (W - R) +
         '" y2="' + sy2(30).toFixed(1) + '" class="ay-axis0"/>';
    o += '<text x="' + (W - R + 6) + '" y="' + (sy2(30) + 4).toFixed(1) +
         '" class="ay-dkey">30° — equal</text>';
    [["max", "bh-cv c0", "widest"], ["min", "bh-cv c1", "narrowest"]].forEach(function (k) {
      var d = pts.map(function (p, i) {
        return (i ? "L" : "M") + sx(p.lat).toFixed(1) + "," + sy2(p[k[0]]).toFixed(1);
      }).join(" ");
      o += '<path d="' + d + '" class="' + k[1] + '"/>';
      var last = pts[pts.length - 1];
      o += '<text x="' + (W - R + 6) + '" y="' + (sy2(last[k[0]]) + 4).toFixed(1) +
           '" class="ay-dkey">' + k[2] + '</text>';
    });
    var here = sx(S.lat);
    o += '<line x1="' + here.toFixed(1) + '" y1="' + T + '" x2="' + here.toFixed(1) +
         '" y2="' + (H - B) + '" class="bh-now"/>';
    [-60, -30, 0, 30, 60].forEach(function (la) {
      o += '<text x="' + sx(la).toFixed(1) + '" y="' + (H - B + 18) +
           '" class="ay-dx">' + (la === 0 ? "equator" : Math.abs(la) + "°" +
             (la > 0 ? "N" : "S")) + '</text>';
    });
    o += "</svg>";
    h.innerHTML = o;

    var sk2 = sky(S.lat), sy3 = sk2 ? systems(sk2) : null;
    var n = $("bh-latnote");
    if (!n) return;
    if (!sy3 || !sy3.sripati) {
      n.innerHTML = "At " + S.lat + "° the construction does not resolve for this " +
        "moment — which is the honest answer rather than a drawn guess.";
      return;
    }
    var w2 = [];
    for (var j = 0; j < 12; j++) w2.push(arcLen(sy3.sripati[j], sy3.sripati[(j + 1) % 12]));
    n.innerHTML = "At <b>" + S.lat + "°</b>, with this moment, the widest bhāva is <b>" +
      Math.max.apply(null, w2).toFixed(1) + "°</b> and the narrowest <b>" +
      Math.min.apply(null, w2).toFixed(1) + "°</b>" +
      (fails.length ? ". The construction failed to resolve at " + fails.length +
        " of the latitudes sampled, and those are simply absent from the curves." : ".");
    $("bh-latread").textContent = S.lat + "°";
  }

  function meanings() {
    var h = $("bh-meanings");
    if (!h || h.firstChild) return;
    h.innerHTML = BHAVA.map(function (b, i) {
      return '<div class="axcell"><b>' + (i + 1) + ". " + esc2(b[0]) +
        '</b><span>' + esc2(b[1]) + "</span></div>";
    }).join("");
  }

  function syncWhen() {
    var e = $("bh-when");
    if (!e || S.when == null) return;
    var d = new Date(S.when + (S.place ? S.place.tz : 0) * 3600000);
    e.value = d.getUTCFullYear() + "-" +
      String(d.getUTCMonth() + 1).padStart(2, "0") + "-" +
      String(d.getUTCDate()).padStart(2, "0") + "T" +
      String(d.getUTCHours()).padStart(2, "0") + ":" +
      String(d.getUTCMinutes()).padStart(2, "0");
  }

  function bind() {
    document.addEventListener("change", function (e) {
      var t = e.target;
      if (t.id === "bh-when") {
        var v = Date.parse(t.value);
        if (!isNaN(v)) { S.when = v - (S.place ? S.place.tz : 0) * 3600000; draw(); latPlot(); }
      } else if (t.getAttribute && t.getAttribute("data-bhtog")) {
        S.show[t.getAttribute("data-bhtog")] = t.checked;
        draw();
      }
    });
    document.addEventListener("input", function (e) {
      if (e.target.id === "bh-lat") { S.lat = +e.target.value; latPlot(); }
    });
    document.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-bh]") : null;
      if (b && b.getAttribute("data-bh") === "now") {
        S.when = Date.now(); syncWhen(); draw(); latPlot();
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
    S.lat = Math.round(S.place.lat);
    var ph = $("bh-place");
    if (ph && window.NPlaces.picker) {
      window.NPlaces.picker({
        host: ph, value: S.place,
        quick: [S.place].concat((window.NP && window.NP.PLACES) || []),
        label: "Place",
        refMs: function () { return S.when || Date.now(); },
        onPick: function (p) {
          S.place = p; S.lat = Math.round(p.lat);
          var r = $("bh-lat"); if (r) r.value = String(S.lat);
          syncWhen(); draw(); latPlot();
        }
      });
    }
    var r = $("bh-lat"); if (r) r.value = String(S.lat);
    syncWhen();
    toggles();
    meanings();
    bind();
    draw();
    latPlot();
  });
})();
