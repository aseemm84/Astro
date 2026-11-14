/* KĀLASETU SIDDHĀNTA (कालसेतु, "the bridge across time") — the long-span engine.
 *
 * WHAT IT IS FOR. The site's two Sūrya Siddhānta tiers are both pinned to the
 * present: the text as written is degrees out, and the fitted tier was fitted
 * on 1800–2200 and falls apart away from it (its Moon is about 8° out by
 * 3600 BCE and its Saturn about 24°). This engine is fitted across the whole of
 * 3600 BCE – 3600 CE, in the Samanvaya–Ecliptic frame (which is Āryabhaṭa's to
 * 0.28″), so that a chart for any date in those seven thousand two hundred
 * years is cast to within arcminutes of the modern engine.
 *
 * WHAT IT KEEPS FROM THE SIDDHĀNTA, AND WHAT IT DOES NOT. Read this before
 * calling it a Siddhānta.
 *
 *   Kept: the time-count. Every mean longitude is the Later Sūrya Siddhānta's
 *   own — Mahāyuga revolutions × 360 × ahargaṇa ÷ civil days, counted from the
 *   Kali epoch at Laṅkā sunrise — and every fitted number is a correction ON
 *   that count (a bīja, an epoch saṃskāra, a mandocca). The order of
 *   operations is the siddhāntic one: mean place, manda (the body's own
 *   orbit), śīghra (the Sun's), each body's karṇa.
 *
 *   Not kept: the text's geometry. Over seven millennia the text's epicycles
 *   cannot hold — a fixed epicycle has no second harmonic, the śīghra on the
 *   mean Sun ignores the Earth's own eccentricity, and nothing in the text
 *   lets an apogee or an eccentricity drift. So:
 *     – the manda equation is solved exactly on the eccentric orbit (Kepler's
 *       equation), with the mandocca and the eccentricity allowed to drift;
 *     – the śīghra is taken with true distances: the planet's own karṇa and
 *       the Sun's, added as vectors (the combination the Kerala school reached
 *       for inner planets with Nīlakaṇṭha's Tantrasaṅgraha, c. 1500, applied
 *       here to all five);
 *     – the Moon carries, after its manda equation, the evection, variation
 *       and annual equation Candraśekhara Sāmanta measured in the Siddhānta
 *       Darpaṇa (1869), and then the next terms of the modern lunar series,
 *       each a measured amplitude;
 *     – Guru and Śani carry their mutual "great inequality" and its companion
 *       terms, and Śani the terms with Uranus, which no Indian text has.
 *   Every one of these is named in the data file and none is presented as the
 *   text's. This is the siddhāntic METHOD OF COUNTING carrying a modern
 *   geometry — the honest description, and the one the pages print.
 *
 * WHAT "FITS" MEANS. It is fitted to this site's modern engine
 * (astronomy-engine, VSOP87 and a Brown-based lunar theory) on 3,000 instants
 * spread over the span, half used for the fit and half held back, and every
 * figure quoted is the held-back half. The modern engine is checked against an
 * independent sky only over 1000–3000 CE; outside that this engine agrees with
 * the modern engine, which is not the same as agreeing with the sky, and ΔT
 * (the Earth's clock) is itself uncertain by hours at the span's ends. The
 * engine counts civil time as a siddhānta does; the fit absorbs ΔT the way the
 * modern engine models it.
 *
 * Outside the span it still answers, but the polynomials it carries were never
 * tested there, and inSpan() says so.
 *
 * Standalone: it reads none of ss-engine.js's state, so a page flipping the
 * Sūrya Siddhānta between its tiers cannot move this engine. */
(function () {
  "use strict";
  var D2R = Math.PI / 180;
  function norm(x) { return ((x % 360) + 360) % 360; }

  /* ---- the Later Sūrya Siddhānta's time-count, copied, not referenced ---- */
  var CIVIL_DAYS = 1577917828;
  var REV = { "Sūrya": 4320000, "Candra": 57753336, "Maṅgala": 2296832,
              "Budha": 17937060, "Guru": 364220, "Śukra": 7022376,
              "Śani": 146568, "candraUcca": 488203, "Rāhu": -232238 };
  var EPOCH0 = { "Rāhu": 180, "candraUcca": 90 };
  var UJJAIN_LON = 75 + 47 / 60, KALI_MIDNIGHT_JD = 588465.5;
  var EPOCH_JD = KALI_MIDNIGHT_JD + 0.25 - UJJAIN_LON / 360;   /* Laṅkā sunrise */
  function ahargana(ms) { return ms / 86400000 + 2440587.5 - EPOCH_JD; }

  /* the span the engine was fitted and measured on */
  var SPAN = { from: Date.UTC(-3599, 0, 1), to: Date.UTC(3600, 11, 31, 23, 59, 59),
               label: "3600 BCE – 3600 CE" };
  function inSpan(ms) { return ms >= SPAN.from && ms <= SPAN.to; }

  /* ---- starting values, before the fit: the modern mean elements of J2000,
     read in a sidereal frame near the Samanvaya zero. The fit moves every one
     of them; they are here only so it starts near the answer. ------------ */
  var A0 = { "Budha": 0.3871, "Śukra": 0.7233, "Maṅgala": 1.5237, "Guru": 5.2026, "Śani": 9.5549 };
  var E0 = { "Budha": 0.2056, "Śukra": 0.0068, "Maṅgala": 0.0934, "Guru": 0.0484, "Śani": 0.0539,
             "Sūrya": 0.0167 };
  /* the mandocca: aphelion for a planet's own orbit is not what the texts
     count — they count the apogee of the body's geocentric (for the Sun) or
     heliocentric (for a planet) path; perihelion is stored here and the
     Kepler solution reads it as such */
  var W0 = { "Budha": 54.96, "Śukra": 109.1, "Maṅgala": 313.56, "Guru": -8.17, "Śani": 70.56,
             "Sūrya": 260.44 };
  var N0 = { "Budha": 25.83, "Śukra": 54.18, "Maṅgala": 27.06, "Guru": 77.96, "Śani": 91.17 };
  var I0 = { "Budha": 7.005, "Śukra": 3.395, "Maṅgala": 1.85, "Guru": 1.303, "Śani": 2.485 };
  /* Uranus's mean longitude, sidereal, per Tm (millennia from J2000) — used only
     for Śani's terms with it */
  function uranusL(Tm) { return 290.738 + 4270.851 * Tm; }

  /* ---- the term lists (structure; amplitudes are fitted) ---------------- */
  /* Moon: [D, M, M☉, F]; D = mean Moon − mean Sun, M = mean Moon − mean apogee
     (counted from the APOGEE, as the texts do), M☉ the Sun's mean anomaly,
     F = mean Moon − node. The first is the manda equation itself; the next
     three are Candraśekhara's. */
  var LUNAR = [[0,1,0,0],
    [2,-1,0,0],[2,0,0,0],[0,0,1,0],
    [0,2,0,0],[0,0,0,2],[2,-2,0,0],[2,-1,-1,0],[2,1,0,0],[2,0,-1,0],[0,1,-1,0],[1,0,0,0],
    [0,1,1,0],[2,0,0,-2],[0,1,0,-2],[0,1,0,2],[4,-1,0,0],[0,3,0,0],[4,-2,0,0],[2,1,-1,0],
    [2,0,1,0],[1,0,1,0],[1,-1,0,0],[2,-1,1,0],[0,2,-1,0],[2,-3,0,0],[2,2,0,0],[0,0,2,0],
    [2,-2,-1,0],[2,1,1,0],[4,0,0,0],[4,-1,-1,0],[2,-2,1,0],[0,2,1,0],[1,1,0,0],[3,-1,0,0]];
  var LUNAR_LAT = [[0,0,0,1],[0,1,0,1],[0,1,0,-1],[2,0,0,-1],[2,-1,0,1],[2,-1,0,-1],[2,0,0,1],
    [0,2,0,1],[2,1,0,-1],[0,2,0,-1],[2,0,-1,-1],[2,-1,-1,1],[2,-2,0,-1],[2,0,1,-1],[2,-1,1,-1],
    [4,-1,0,-1],[2,1,0,1],[0,1,1,1],[0,1,-1,-1]];
  /* the true node: the mean node plus its periodic wobble, [D, M, M☉, F] on
     the same mean places (the largest, 2D − 2F, is about 1.5°) */
  /* found by regressing the modern osculating node on every combination of
     the four arguments up to |D| 4, |M| 2, |M☉| 1, |F| 2 and keeping those
     above 0.1′; sine and cosine both, so no phase is assumed (and the Moon's
     anomaly here is counted from the apogee, as the texts count it) */
  var NODE_TRUE = (function () {
    var base = [[2,0,0,-2],[0,0,1,0],[2,0,0,0],[0,0,0,2],[0,2,0,-2],[2,0,-1,-2],[2,-1,0,0],
                [0,1,0,-2],[0,1,0,0],[2,0,1,-2],[1,0,1,-1],[2,-1,0,-2],[2,1,0,-2],[2,-2,0,0],
                [2,0,-1,0],[2,1,0,0],[0,1,0,2],[1,-1,0,0],[2,-1,-1,0],[0,0,1,-2],[4,-1,1,2],
                [2,-2,1,-1],[0,0,1,2],[4,-1,0,-2],[3,2,0,2],[1,0,0,0],[4,0,0,-4],[0,0,2,0]];
    var out = [];
    base.forEach(function (t) { out.push(t.concat([0, 0]), t.concat([1, 0])); });
    /* and the eight largest again with their amplitudes allowed to drift
       (×T and ×T²): over seven millennia the wobble's size is not constant */
    base.slice(0, 8).forEach(function (t) { [1, 2].forEach(function (tp) {
      out.push(t.concat([0, tp]), t.concat([1, tp])); }); });
    return out;
  })();
  /* Guru and Śani: [cJ, cS, cM, tpow, cU] on the two mean longitudes, the
     body's own mean anomaly, T^tpow, and Uranus. The first eighteen are the
     great inequality (2J − 5S, period ~880 years) and its double, with its
     amplitude allowed to drift. */
  var GS = [];
  [[-2, 5], [-4, 10]].forEach(function (p) {
    [-1, 0, 1].forEach(function (m) { [0, 1, 2].forEach(function (tp) { GS.push([p[0], p[1], m, tp, 0]); }); });
  });
  [[-1,2],[-3,5],[-1,3],[-2,4],[-3,6],[0,1],[-1,1],[0,2],[-2,6],[-3,7],[-1,4],[-4,8],[-6,15],
   [1,0],[2,0],[-2,3],[-1,0],[-3,4],[-4,6],[-5,7]].forEach(function (p) {
    [-1, 0, 1].forEach(function (m) { GS.push([p[0], p[1], m, 0, 0]); });
  });
  [[1,-1],[1,-2],[1,-3],[2,-3],[2,-5],[2,-6],[0,1],[1,-4]].forEach(function (p) { GS.push([0, p[0], 0, 0, p[1]]); });
  /* Maṅgala: [cM, cJ, 0, 0, cE] on its own, Jupiter's and the Earth's mean longitudes */
  var MARS = [[1,-1,0,0,0],[2,-2,0,0,0],[1,-2,0,0,0],[2,-1,0,0,0],[3,-2,0,0,0],[2,-3,0,0,0],[3,-4,0,0,0],
    [1,0,0,0,-1],[2,0,0,0,-1],[1,0,0,0,-2],[2,0,0,0,-2],[3,0,0,0,-2],[3,0,0,0,-1],[4,0,0,0,-2],
    [2,0,0,0,-3],[3,0,0,0,-4],[4,0,0,0,-3],[0,1,0,0,-1]];
  var PERT = { "Guru": GS, "Śani": GS, "Maṅgala": MARS, "Budha": [], "Śukra": [] };
  /* Some of these arguments are close to the body's own mean longitude and
     anomaly, so they and the orbit can trade against one another: the sum is
     what the fit measures, and it is held to arcminutes, but an individual
     term is not a physical amplitude and is not presented as one. Dropping
     those terms halved Śani's accuracy, and penalising their size (a ridge)
     cost up to 2′ without making them physical; see fit-kalasetu.mjs. */
  function active(b, i) { return !!PERT[b][i]; }

  /* the parameter names each body carries — the fitter and the data file use these */
  function keysOf(b) {
    var k;
    if (b === "Sūrya") return ["l0","l1","l2","l3","w0","w1","w2","e0","e1","e2"];
    if (b === "Rāhu") { k = ["l0","l1","l2","l3","t_0","t_1","t_2","t_3"];
      NODE_TRUE.forEach(function (_, i) { k.push("t" + i); }); return k; }
    if (b === "Candra") {
      k = ["l0","l1","l2","l3","c0","c1","c2","c3"];
      LUNAR.forEach(function (_, i) { k.push("L" + i); });
      LUNAR_LAT.forEach(function (_, i) { k.push("B" + i); });
      return k;
    }
    k = ["l0","l1","l2","l3","w0","w1","w2","w3","e0","e1","e2","e3","a0","n0","n1","i0"];
    (PERT[b] || []).forEach(function (_, i) { if (active(b, i)) k.push("ps" + i, "pc" + i); });
    return k;
  }
  var BODIES = ["Sūrya", "Rāhu", "Candra", "Budha", "Śukra", "Maṅgala", "Guru", "Śani"];

  var P = null, DOC = null;
  function zeroParams() {
    var o = {};
    BODIES.forEach(function (b) { o[b] = {}; keysOf(b).forEach(function (k) { o[b][k] = 0; }); });
    /* the Moon's manda equation starts near its real size so the fit starts near the answer */
    o["Candra"].L0 = -6.29; o["Candra"].B0 = 5.13;
    return o;
  }
  function setData(doc) {
    var z = zeroParams();
    if (doc && doc.params) for (var b in doc.params) if (z[b]) for (var k in doc.params[b])
      if (k in z[b]) z[b][k] = doc.params[b][k];
    P = z; DOC = doc || null;
    return !!(doc && doc.params);
  }
  setData(null);

  function poly(p, pre, Tm) {
    return (p[pre + "0"] || 0) + Tm * ((p[pre + "1"] || 0) + Tm * ((p[pre + "2"] || 0) + Tm * (p[pre + "3"] || 0)));
  }
  /* the siddhāntic mean place, with its corrections */
  function meanOf(key, ahar, Tm) {
    var p = P[key] || {};
    return (EPOCH0[key] || 0) + REV[key] * 360 * ahar / CIVIL_DAYS + poly(p, "l", Tm);
  }
  function apogeeOf(ahar, Tm) {
    return EPOCH0.candraUcca + REV.candraUcca * 360 * ahar / CIVIL_DAYS + poly(P["Candra"], "c", Tm);
  }

  function kepler(M, e) {
    var E = M;
    for (var i = 0; i < 12; i++) E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    return { v: 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2)),
             r: 1 - e * Math.cos(E) };
  }
  /* a body's own orbit: the manda step. For the Sun this is the Sun's path
     about the Earth; for a planet, its path about the Sun. */
  function orbit(b, ahar, Tm, X) {
    var p = P[b], L = meanOf(b, ahar, Tm);
    var w = W0[b] + p.w0 + Tm * (p.w1 + Tm * (p.w2 + Tm * (p.w3 || 0)));
    var e = E0[b] * (1 + p.e0) + Tm * (p.e1 + Tm * (p.e2 + Tm * (p.e3 || 0))) * 0.001;
    var k = kepler((L - w) * D2R, e), lam = w * D2R + k.v;
    var T = PERT[b], rec = TR ? { L: L, w: w, e: e, M: norm(L - w), eqc: k.v / D2R - norm(L - w), terms: [] } : null;
    if (rec && rec.eqc > 180) rec.eqc -= 360; if (rec && rec.eqc < -180) rec.eqc += 360;
    if (T) for (var i = 0; i < T.length; i++) {
      if (!active(b, i)) continue;
      var t = T[i], arg;
      if (b === "Maṅgala") arg = (t[0] * L + t[1] * X.Lj + t[4] * X.Le) * D2R;
      else arg = (t[0] * X.Lj + t[1] * X.Ls + t[4] * X.Lu) * D2R + t[2] * (L - w) * D2R;
      var f = t[3] ? Math.pow(Tm, t[3]) : 1;
      lam += f * (p["ps" + i] * Math.sin(arg) + p["pc" + i] * Math.cos(arg)) * D2R;
      if (rec) rec.terms.push({ i: i, arg: t, deg: f * (p["ps" + i] * Math.sin(arg) + p["pc" + i] * Math.cos(arg)) });
      if (BASIS && BASIS.b === b) { BASIS.s[i] = f * Math.sin(arg); BASIS.c[i] = f * Math.cos(arg); }
    }
    if (BASIS && BASIS.b === b) lam += BASIS.dl * D2R;
    var r = (b === "Sūrya" ? 1 : A0[b] * (1 + p.a0)) * k.r;
    if (rec) { rec.lam = norm(lam / D2R); rec.r = r; rec.pert = rec.terms.reduce(function (a, x) { return a + x.deg; }, 0); TR[b] = rec; }
    if (b === "Sūrya") return { x: r * Math.cos(lam), y: r * Math.sin(lam), z: 0, L: L, w: w };
    var node = (N0[b] + p.n0 + p.n1 * Tm) * D2R, inc = (I0[b] + p.i0) * D2R, u = lam - node;
    var xo = r * Math.cos(u), yo = r * Math.sin(u);
    return { x: xo * Math.cos(node) - yo * Math.cos(inc) * Math.sin(node),
             y: xo * Math.sin(node) + yo * Math.cos(inc) * Math.cos(node),
             z: yo * Math.sin(inc), L: L, w: w };
  }
  /* THE EARTH'S CLOCK. A siddhānta counts civil days and has no ΔT, so
     a fit across seven millennia would have to bend every mean motion into a
     parabola to absorb the Earth's slowing rotation — 28 hours of it by
     3600 BCE, fifteen degrees of Moon — and the piecewise shape of the ΔT
     record would still be left over. Instead the engine is handed the same
     ΔT the modern engine uses (engine.js passes astronomy-engine's, with
     deltat.js's observed values) and counts in uniform time. This is the one
     input it takes from outside itself, and it is named here because it is
     the one thing no Indian text supplies. Without it the engine still runs,
     in civil time, and is less accurate. */
  var DT = null;
  function setDeltaT(fn) { DT = typeof fn === "function" ? fn : null; return !!DT; }
  function ctx(ms, lagDays) {
    var dt = 0;
    if (DT) { try { dt = (+DT(ms) || 0) / 86400; } catch (e) { dt = 0; } }
    var ahar = ahargana(ms) + dt - (lagDays || 0);
    var Tm = (ms / 86400000 + 2440587.5 + dt - (lagDays || 0) - 2451545) / 365250;
    var Tc = Tm * 10;
    /* the arguments of the perturbations are FIXED functions of time — the
       modern mean longitudes (Standish's J2000 elements, carried to a
       sidereal frame by general precession) — rather than this engine's own
       fitted means, so that fitting Śani cannot move Guru's terms and the
       other way round */
    return { ahar: ahar, Tm: Tm,
             Lj: 34.39644 + 3034.74612775 * Tc - 1.3969713 * Tc - 22.5,
             Ls: 49.95424 + 1222.49362201 * Tc - 1.3969713 * Tc - 22.5,
             Le: 100.46457166 + 35999.37244981 * Tc - 1.3969713 * Tc - 22.5,
             Lu: uranusL(Tm) };
  }
  /* the Moon, and its latitude: the manda equation and the further terms, on
     the siddhāntic mean places of Moon, apogee, Sun and node */
  function moon(ms) {
    var c = ctx(ms), ahar = c.ahar, Tm = c.Tm, p = P["Candra"];
    var Lm = meanOf("Candra", ahar, Tm), Ls = meanOf("Sūrya", ahar, Tm);
    var sp = P["Sūrya"], ws = W0["Sūrya"] + sp.w0 + sp.w1 * Tm + sp.w2 * Tm * Tm;
    var D = (Lm - Ls) * D2R, M = (Lm - apogeeOf(ahar, Tm)) * D2R, Ms = (Ls - ws) * D2R,
        F = (Lm - meanOf("Rāhu", ahar, Tm)) * D2R;
    var lon = Lm, lat = 0, i, t;
    for (i = 0; i < LUNAR.length; i++) { t = LUNAR[i];
      lon += p["L" + i] * Math.sin(t[0] * D + t[1] * M + t[2] * Ms + t[3] * F); }
    for (i = 0; i < LUNAR_LAT.length; i++) { t = LUNAR_LAT[i];
      lat += p["B" + i] * Math.sin(t[0] * D + t[1] * M + t[2] * Ms + t[3] * F); }
    return { lon: norm(lon), lat: lat };
  }
  /* the mean places the lunar terms are read on */
  function lunarArgs(ms) {
    var c = ctx(ms), ahar = c.ahar, Tm = c.Tm;
    var Lm = meanOf("Candra", ahar, Tm), Ls = meanOf("Sūrya", ahar, Tm), sp = P["Sūrya"];
    var ws = W0["Sūrya"] + sp.w0 + sp.w1 * Tm + sp.w2 * Tm * Tm, Ln = meanOf("Rāhu", ahar, Tm);
    return { D: (Lm - Ls) * D2R, M: (Lm - apogeeOf(ahar, Tm)) * D2R, Ms: (Ls - ws) * D2R,
             F: (Lm - Ln) * D2R, node: Ln, Tm: Tm };
  }
  /* the true (osculating) node, as the modern engine defines it: the mean
     node plus measured periodic terms */
  function trueNode(ms) {
    /* its own secular offset from the mean node: the mean node is fitted to
       a published polynomial, the true node is a plane measured against the
       ecliptic of date, and far from the present the two drift apart */
    var a = lunarArgs(ms), p = P["Rāhu"], L = a.node + poly(p, "t_", a.Tm);
    for (var i = 0; i < NODE_TRUE.length; i++) { var t = NODE_TRUE[i];
      var g = t[0] * a.D + t[1] * a.M + t[2] * a.Ms + t[3] * a.F;
      L += (p["t" + i] || 0) * (t[5] ? Math.pow(a.Tm, t[5]) : 1) * (t[4] ? Math.cos(g) : Math.sin(g)); }
    return norm(L);
  }
  /* a planet or the Sun: the śīghra step, as vectors with true distances,
     and with the light-time the modern engine also applies */
  function body(b, ms) {
    var c = ctx(ms), sun = orbit("Sūrya", c.ahar, c.Tm, c);
    if (b === "Sūrya") return { lon: norm(Math.atan2(sun.y, sun.x) / D2R), lat: 0, dist: Math.hypot(sun.x, sun.y) };
    var pl = orbit(b, c.ahar, c.Tm, c);
    var g = { x: pl.x + sun.x, y: pl.y + sun.y, z: pl.z };
    var tau = Math.hypot(g.x, g.y, g.z) * 0.0057755;     /* days of light-time per AU */
    var c2 = ctx(ms, tau); pl = orbit(b, c2.ahar, c2.Tm, c2);
    g = { x: pl.x + sun.x, y: pl.y + sun.y, z: pl.z };
    var rho = Math.hypot(g.x, g.y);
    return { lon: norm(Math.atan2(g.y, g.x) / D2R), lat: Math.atan2(g.z, rho) / D2R,
             dist: Math.hypot(g.x, g.y, g.z) };
  }
  function longitude(sa, ms) {
    if (sa === "Candra") return moon(ms).lon;
    if (sa === "Rāhu") { var c = ctx(ms); return norm(meanOf("Rāhu", c.ahar, c.Tm)); }
    if (sa === "Ketu") { var c2 = ctx(ms); return norm(meanOf("Rāhu", c2.ahar, c2.Tm) + 180); }
    if (P[sa]) return body(sa, ms).lon;
    return null;
  }
  function latitude(sa, ms) {
    if (sa === "Candra") return moon(ms).lat;
    if (sa === "Sūrya" || sa === "Rāhu" || sa === "Ketu") return 0;
    if (P[sa]) return body(sa, ms).lat;
    return null;
  }

  /* FOR THE FITTER ONLY. The perturbation amplitudes, the Moon's term
     amplitudes and the true node's enter linearly, so their partial
     derivatives are known in closed form once the geometry's own derivative
     (geocentric longitude per degree of heliocentric longitude) is measured
     at the instant. Returns, per key, d(longitude)/d(parameter) and, where
     there is one, d(latitude)/d(parameter), both in degrees per unit. The
     light-time is held fixed for the derivative, which is what an
     approximate Jacobian may do: the residual itself is always exact. */
  var BASIS = null;
  function basis(b, ms) {
    var out = {}, i, t;
    if (b === "Candra" || b === "Rāhu-true") {
      var a = lunarArgs(ms);
      if (b === "Candra") {
        for (i = 0; i < LUNAR.length; i++) { t = LUNAR[i];
          out["L" + i] = [Math.sin(t[0] * a.D + t[1] * a.M + t[2] * a.Ms + t[3] * a.F), 0]; }
        for (i = 0; i < LUNAR_LAT.length; i++) { t = LUNAR_LAT[i];
          out["B" + i] = [0, Math.sin(t[0] * a.D + t[1] * a.M + t[2] * a.Ms + t[3] * a.F)]; }
      } else {
        for (i = 0; i < 4; i++) out["t_" + i] = [Math.pow(a.Tm, i), 0];
        for (i = 0; i < NODE_TRUE.length; i++) { t = NODE_TRUE[i];
          var g = t[0] * a.D + t[1] * a.M + t[2] * a.Ms + t[3] * a.F;
          out["t" + i] = [(t[5] ? Math.pow(a.Tm, t[5]) : 1) * (t[4] ? Math.cos(g) : Math.sin(g)), 0]; }
      }
      return out;
    }
    var T = PERT[b]; if (!T || !T.length) return out;
    var h = 1e-3;
    BASIS = { b: b, dl: 0, s: [], c: [] }; var q0 = body(b, ms), S0 = BASIS.s.slice(), C0 = BASIS.c.slice();
    BASIS = { b: b, dl: h, s: [], c: [] }; var q1 = body(b, ms);
    BASIS = null;
    var dl = (((q1.lon - q0.lon) % 360 + 540) % 360 - 180) / h, db = (q1.lat - q0.lat) / h;
    for (i = 0; i < T.length; i++) {
      if (!active(b, i)) continue;
      out["ps" + i] = [dl * S0[i], db * S0[i]];
      out["pc" + i] = [dl * C0[i], db * C0[i]];
    }
    return out;
  }

  /* WHAT THE PAGE SHOWS STEP BY STEP. The same arithmetic as longitude(),
     recorded as it goes, so the explanation on kalasetu.html cannot drift
     from the number it explains: the final value is the engine's own. */
  var TR = null;
  function textMean(key, ahar) { return norm((EPOCH0[key] || 0) + REV[key] * 360 * ahar / CIVIL_DAYS); }
  function trace(sa, ms) {
    var c = ctx(ms), out = { sa: sa, ms: ms, dt: (c.Tm * 365250 + 2451545) - (ms / 86400000 + 2440587.5),
                             ahar: c.ahar, Tm: c.Tm, inSpan: inSpan(ms) };
    out.dt *= 86400;
    var key = sa === "Ketu" ? "Rāhu" : sa;
    if (REV[key] != null) {
      out.textMean = textMean(key, c.ahar);
      out.correction = poly(P[key], "l", c.Tm);
      out.mean = norm(out.textMean + out.correction);
      out.rev = REV[key];
    }
    if (sa === "Rāhu" || sa === "Ketu") {
      var a = lunarArgs(ms), pr = P["Rāhu"], per = 0;
      for (var i = 0; i < NODE_TRUE.length; i++) { var t = NODE_TRUE[i], g = t[0] * a.D + t[1] * a.M + t[2] * a.Ms + t[3] * a.F;
        per += (pr["t" + i] || 0) * (t[5] ? Math.pow(a.Tm, t[5]) : 1) * (t[4] ? Math.cos(g) : Math.sin(g)); }
      out.trueSecular = poly(pr, "t_", a.Tm); out.truePeriodic = per;
      out.lon = longitude(sa, ms); out.trueLon = norm(trueNode(ms) + (sa === "Ketu" ? 180 : 0));
      return out;
    }
    if (sa === "Candra") {
      var A2 = lunarArgs(ms), pm = P["Candra"], terms = [];
      out.apogee = norm(apogeeOf(c.ahar, c.Tm)); out.apogeeText = textMean("candraUcca", c.ahar);
      for (var j = 0; j < LUNAR.length; j++) { var u = LUNAR[j];
        terms.push({ i: j, arg: u, amp: pm["L" + j], deg: pm["L" + j] * Math.sin(u[0] * A2.D + u[1] * A2.M + u[2] * A2.Ms + u[3] * A2.F) }); }
      out.terms = terms; out.args = { D: norm(A2.D / D2R), M: norm(A2.M / D2R), Ms: norm(A2.Ms / D2R), F: norm(A2.F / D2R) };
      var mo = moon(ms); out.lon = mo.lon; out.lat = mo.lat;
      return out;
    }
    if (!P[sa]) return null;
    TR = {};
    try { var q = body(sa, ms); out.lon = q.lon; out.lat = q.lat; out.dist = q.dist; out.orbit = TR[sa]; out.sun = TR["Sūrya"]; }
    finally { TR = null; }
    if (sa !== "Sūrya") out.lightDays = out.dist * 0.0057755;
    return out;
  }

  var API = {
    trace: trace, keysAll: function () { return { LUNAR: LUNAR, NODE_TRUE: NODE_TRUE, PERT: PERT }; },
    basis: basis,
    longitude: longitude, latitude: latitude, trueNode: trueNode, setDeltaT: setDeltaT,
    hasDeltaT: function () { return !!DT; }, setData: setData, inSpan: inSpan,
    ahargana: ahargana, SPAN: SPAN, BODIES: BODIES, keysOf: keysOf,
    frame: "samanvaya_ecliptic",
    /* the fitter reaches the live parameter table through this */
    params: function () { return P; },
    terms: function () { return { lunar: LUNAR.length, lunarLat: LUNAR_LAT.length, trueNode: NODE_TRUE.length,
                                  gs: GS.length, mars: MARS.length }; },
    data: function () { return DOC; },
    isFitted: function () { return !!(DOC && DOC.params); }
  };
  if (typeof window !== "undefined") window.KalasetuEngine = API;
  else if (typeof globalThis !== "undefined") globalThis.KalasetuEngine = API;
})();
