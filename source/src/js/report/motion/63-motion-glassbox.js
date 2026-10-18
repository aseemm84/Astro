/* ===== Three scenes that show the arithmetic ===============================

   THE GAP THESE CLOSE. This project computes every number a pañcāṅga prints
   and then prints the number. It has never once shown the subtraction. A
   reader is told the tithi is Śukla Aṣṭamī and has to take it on trust, which
   is exactly the posture the rest of the site exists to refuse — the chart
   report calls its own method the glassbox and opens it, and the day tools
   never did.

   So: Moon 269.92° − Sun 180.97° = 88.95°, ÷ 12° = 7.41, therefore the eighth
   tithi, 41% through it. Every figure on these frames carries the step that
   produced it. It is the cheapest possible feature — the numbers were all
   already in memory — and it is the one thing that makes a pañcāṅga card worth
   saving rather than glancing at.

     fiverings — the five limbs as five rings, each turning at its own rate
                 under one pointer, with the division that produces each one
                 written beside it. Four of the five come from the SAME two
                 numbers, which is the thing nobody is ever told.
     necklace  — the 27 as beads, the Moon moving along them, the elongation
                 arc drawn from the Sun, and the instant the next bead starts.
     orbitrose — the真 heliocentric construction: a line drawn between Earth
                 and a planet every few days, which closes into a rose because
                 their periods are nearly commensurate.

   ON THE ROSE. The venusrose scene elsewhere plots elongation against the
   season, which is a true picture of a different thing. This one is the
   literal construction — Sun at the centre, both planets on their real orbits,
   a chord between them every few days — and it works for all five tārā grahas
   because the near-commensurability is not unique to Śukra. The petal count is
   COUNTED from the conjunctions the scene itself finds, not asserted, so a
   planet whose ratio is poor shows a figure that does not close and says so. */

var MO_GLASS = [];

var MG_NAK = ["Aśvinī", "Bharaṇī", "Kṛttikā", "Rohiṇī", "Mṛgaśira", "Ārdrā",
  "Punarvasu", "Puṣya", "Āśleṣā", "Maghā", "P.Phalgunī", "U.Phalgunī", "Hasta",
  "Citrā", "Svātī", "Viśākhā", "Anurādhā", "Jyeṣṭhā", "Mūla", "P.Āṣāḍhā",
  "U.Āṣāḍhā", "Śravaṇa", "Dhaniṣṭhā", "Śatabhiṣā", "P.Bhādra", "U.Bhādra", "Revatī"];
var MG_TITHI = ["Pratipadā", "Dvitīyā", "Tṛtīyā", "Caturthī", "Pañcamī", "Ṣaṣṭhī",
  "Saptamī", "Aṣṭamī", "Navamī", "Daśamī", "Ekādaśī", "Dvādaśī", "Trayodaśī",
  "Caturdaśī", "Pūrṇimā"];
var MG_YOGA = ["Viṣkambha", "Prīti", "Āyuṣmān", "Saubhāgya", "Śobhana", "Atigaṇḍa",
  "Sukarman", "Dhṛti", "Śūla", "Gaṇḍa", "Vṛddhi", "Dhruva", "Vyāghāta", "Harṣaṇa",
  "Vajra", "Siddhi", "Vyatīpāta", "Varīyān", "Parigha", "Śiva", "Siddha", "Sādhya",
  "Śubha", "Śukla", "Brahma", "Indra", "Vaidhṛti"];
var MG_KMOV = ["Bava", "Bālava", "Kaulava", "Taitila", "Gara", "Vaṇija", "Viṣṭi"];
var MG_KFIX = ["Śakuni", "Catuṣpada", "Nāga", "Kiṃstughna"];
var MG_VARA = ["Ravivāra", "Somavāra", "Maṅgalavāra", "Budhavāra",
               "Guruvāra", "Śukravāra", "Śanivāra"];

function mgNorm(x) { return ((x % 360) + 360) % 360; }
/* The five limbs AND the working for each, from one pair of longitudes. */
function mgLimbs(ms) {
  var su = moSidAt("Sun", ms), mo = moSidAt("Moon", ms);
  if (su == null || mo == null) return null;
  var jd = ms / 86400000 + 2440587.5;
  var elong = mgNorm(mo - su);
  var sum = mgNorm(mo + su);
  var ti = elong / 12, ki = elong / 6, ni = mgNorm(mo) / (40 / 3), yi = sum / (40 / 3);
  var kn = Math.floor(ki);
  return {
    sun: mgNorm(su), moon: mgNorm(mo), elong: elong, sum: sum,
    tithi: { v: ti, i: Math.floor(ti), f: ti - Math.floor(ti),
             name: (Math.floor(ti) === 29 ? "Amāvāsyā" :
                    Math.floor(ti) === 14 ? "Pūrṇimā" : MG_TITHI[Math.floor(ti) % 15]),
             paksha: Math.floor(ti) < 15 ? "Śukla" : "Kṛṣṇa",
             work: "(Moon " + mgNorm(mo).toFixed(2) + "° − Sun " +
                   mgNorm(su).toFixed(2) + "°) ÷ 12°" },
    karana: { v: ki, i: kn, f: ki - kn,
              name: (kn === 0 ? "Kiṃstughna" :
                     kn <= 56 ? MG_KMOV[(kn - 1) % 7] : MG_KFIX[kn - 57]),
              work: elong.toFixed(2) + "° ÷ 6°" },
    nak: { v: ni, i: Math.floor(ni), f: ni - Math.floor(ni),
           name: MG_NAK[Math.floor(ni)],
           pada: Math.floor((ni - Math.floor(ni)) * 4) + 1,
           work: "Moon " + mgNorm(mo).toFixed(2) + "° ÷ 13°20′" },
    yoga: { v: yi, i: Math.floor(yi), f: yi - Math.floor(yi),
            name: MG_YOGA[Math.floor(yi)],
            work: "(Sun + Moon" + (mo + su >= 360 ? " − 360°" : "") +
                  ") ÷ 13°20′" },
    vara: { i: (Math.floor(jd + 1.5) % 7 + 7) % 7,
            name: MG_VARA[(Math.floor(jd + 1.5) % 7 + 7) % 7],
            work: "sunrises counted" }
  };
}
/* When the limb that is running now gives way, by bisection on its own index.
   Done per limb rather than per day, so each ring can print its own end. */
function mgEndOf(ms, pick) {
  var i0 = pick(ms);
  if (i0 == null) return null;
  var lo = ms, hi = ms + 30 * 3600000, k;
  for (k = 0; k < 6 && pick(hi) === i0; k++) hi += 12 * 3600000;
  if (pick(hi) === i0) return null;
  for (k = 0; k < 22; k++) {
    var mid = (lo + hi) / 2;
    if (pick(mid) === i0) lo = mid; else hi = mid;
  }
  return hi;
}
try { window.__mgLimbs = mgLimbs; window.__mgEndOf = mgEndOf; } catch (e) {}

/* ------------------------------------------------------------ fiverings ---- */
MO_GLASS.push({
  key: "fiverings", label: "The five, with the working",
  title: "Four of the five come from two numbers",
  sub: "tithi, karaṇa, nakṣatra and yoga are all divisions of where the Sun and Moon are",
  draw: function (p) {
    var P = moPal(), S = moSize(), st = moStage(), c = MO.ctx;
    var U = Math.min(S.w, S.h) / moTypeK();
    var W = moPlace() || { lat: 28.6139, lon: 77.209, tz: 5.5, name: null };
    /* three days, so every ring turns at least once and the different speeds
       are the thing the eye picks up */
    var t0 = Date.now(), ms = t0 + 3 * 86400000 * p;
    var L = mgLimbs(ms);
    if (!L) { moText(moT("noPlace"), st.cx, st.cy, U * 0.03, P.dim, "center"); return {}; }

    moStars();
    /* Sized to clear the line above and the five working rows below: at the
       first sizing the outer ring ran under the header. */
    var cx = st.cx, cy = st.y + st.h * 0.435;
    var Rout = Math.min(S.w * 0.375, st.h * 0.295), Rin = Rout * 0.30;
    var rings = [
      { k: "tithi",  n: 30, f: L.tithi.v / 30,  col: P.gold },
      { k: "karana", n: 60, f: L.karana.v / 60, col: P.benefic },
      { k: "nak",    n: 27, f: L.nak.v / 27,    col: P.glow },
      { k: "yoga",   n: 27, f: L.yoga.v / 27,   col: P.malefic },
      { k: "vara",   n: 7,  f: (L.vara.i + ((ms / 86400000) % 1)) / 7, col: P.dim }
    ];
    var band = (Rout - Rin) / rings.length;

    rings.forEach(function (r, i) {
      var ro = Rout - i * band, ri = ro - band * 0.9;
      var mid = (ro + ri) / 2;
      /* the divisions of this ring, so the reader can see what is being counted */
      c.lineWidth = ro - ri;
      c.strokeStyle = (i % 2) ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.025)";
      c.beginPath(); c.arc(cx, cy, mid, 0, 6.2832); c.stroke();
      c.strokeStyle = P.line; c.lineWidth = 1;
      for (var d = 0; d < r.n; d++) {
        var a = -Math.PI / 2 + (d / r.n) * 6.2832;
        c.beginPath();
        c.moveTo(cx + Math.cos(a) * ri, cy + Math.sin(a) * ri);
        c.lineTo(cx + Math.cos(a) * ro, cy + Math.sin(a) * ro);
        c.stroke();
      }
      /* how far this ring has turned */
      c.beginPath();
      c.arc(cx, cy, mid, -Math.PI / 2, -Math.PI / 2 + r.f * 6.2832);
      c.lineWidth = (ro - ri) * 0.78; c.strokeStyle = r.col;
      c.globalAlpha = 0.42; c.stroke(); c.globalAlpha = 1;
      /* the division it is standing in, under the pointer */
      var ah = -Math.PI / 2 + r.f * 6.2832;
      moGlowDot(cx + Math.cos(ah) * mid, cy + Math.sin(ah) * mid,
                Math.max(2.5, band * 0.17), r.col, r.col);
    });
    /* one pointer, straight up — the rings turn under it */
    c.strokeStyle = P.ink; c.lineWidth = Math.max(2, U * 0.004);
    c.beginPath(); c.moveTo(cx, cy - Rout - U * 0.013); c.lineTo(cx, cy - Rin * 0.82); c.stroke();

    var dd = new Date(ms + (W.tz || 0) * 3600000);
    moText((dd.getUTCHours() < 10 ? "0" : "") + dd.getUTCHours() + ":" +
           (dd.getUTCMinutes() < 10 ? "0" : "") + dd.getUTCMinutes(),
           cx, cy - U * 0.008, U * 0.030, P.ink, "center", 700);
    moText(moDateShort(ms, W.tz).replace(/ \d{4}$/, ""), cx, cy + U * 0.022,
           U * 0.017, P.dim, "center", 500);

    /* THE WORKING. One row per limb: the name, the division that produced it,
       and the number that came out. This is the whole point of the scene. */
    var rows = [
      { lab: "TITHI",     col: P.gold,    name: L.tithi.paksha + " " + L.tithi.name,
        work: L.tithi.work + " = " + L.tithi.v.toFixed(2) },
      { lab: "KARAṆA",    col: P.benefic, name: L.karana.name,
        work: L.karana.work + " = " + L.karana.v.toFixed(2) },
      { lab: "NAKṢATRA",  col: P.glow,    name: L.nak.name + " pāda " + L.nak.pada,
        work: L.nak.work + " = " + L.nak.v.toFixed(2) },
      { lab: "YOGA",      col: P.malefic, name: L.yoga.name,
        work: L.yoga.work + " = " + L.yoga.v.toFixed(2) },
      { lab: "VĀRA",      col: P.dim,     name: L.vara.name,
        work: L.vara.work }
    ];
    var y = st.y + st.h * 0.795, step = st.h * 0.042;
    rows.forEach(function (r) {
      moGlowDot(S.w * 0.085, y - U * 0.006, U * 0.0065, r.col, r.col);
      moText(r.lab, S.w * 0.115, y - U * 0.006, U * 0.0155, r.col, "left", 700);
      moText(r.name, S.w * 0.285, y - U * 0.006, U * 0.0205, P.ink, "left", 600);
      moText(r.work, S.w * 0.115, y + U * 0.016, U * 0.0155, P.dim, "left", 500);
      y += step;
    });
    moText(moP("fourOfFive"), st.cx, st.y + st.h * 0.075, U * 0.0215,
           P.dim, "center", 500);
    return { ms: ms };
  }
});

/* ------------------------------------------------------------- necklace ---- */
MO_GLASS.push({
  key: "necklace", label: "The Moon's necklace",
  title: "Twenty-seven beads, one a day",
  sub: "the Moon returns to the same stars every 27.32 days, so the circle is cut in 27",
  draw: function (p) {
    var P = moPal(), S = moSize(), st = moStage(), c = MO.ctx;
    var U = Math.min(S.w, S.h) / moTypeK();
    var W = moPlace() || { lat: 28.6139, lon: 77.209, tz: 5.5 };
    /* one sidereal month, so the Moon walks the whole necklace once */
    var t0 = Date.now(), ms = t0 + 27.321582 * 86400000 * p;
    var L = mgLimbs(ms);
    if (!L) { moText(moT("noPlace"), st.cx, st.cy, U * 0.03, P.dim, "center"); return {}; }

    moStars();
    var cx = st.cx, cy = st.y + st.h * 0.44;
    var R = Math.min(S.w * 0.355, st.h * 0.315);
    function at(lon, r) {
      var a = (lon - 90) * Math.PI / 180;
      return [cx + Math.cos(a) * (r == null ? R : r), cy + Math.sin(a) * (r == null ? R : r)];
    }

    /* the 27 beads, each at the middle of its own segment */
    var seg = 40 / 3;
    for (var n = 0; n < 27; n++) {
      var q = at(n * seg + seg / 2);
      var here = n === L.nak.i;
      c.beginPath(); c.arc(q[0], q[1], here ? U * 0.019 : U * 0.0115, 0, 6.2832);
      c.fillStyle = here ? P.gold : "rgba(255,255,255,0.22)"; c.fill();
      if (here) {
        c.save(); c.shadowColor = P.gold; c.shadowBlur = U * 0.04;
        c.fill(); c.restore();
      }
      /* the name, set radially outward */
      var a2 = (n * seg + seg / 2 - 90) * Math.PI / 180;
      var lq = at(n * seg + seg / 2, R + U * 0.040);
      c.save();
      c.translate(lq[0], lq[1]);
      c.rotate(a2 + (Math.cos(a2) < 0 ? Math.PI : 0));
      moText(MG_NAK[n], 0, 0, U * 0.0155,
             here ? P.gold : P.dim, Math.cos(a2) < 0 ? "right" : "left", here ? 700 : 500);
      c.restore();
    }
    /* the thread */
    c.strokeStyle = P.line; c.lineWidth = 1;
    c.beginPath(); c.arc(cx, cy, R, 0, 6.2832); c.stroke();

    /* the elongation arc: Sun to Moon, which is the tithi */
    var sq = at(L.sun, R * 0.72), mq = at(L.moon, R * 0.72);
    c.strokeStyle = P.gold; c.globalAlpha = 0.55;
    c.lineWidth = Math.max(3, U * 0.010);
    c.beginPath();
    c.arc(cx, cy, R * 0.72, (L.sun - 90) * Math.PI / 180,
          (L.sun - 90) * Math.PI / 180 + L.elong * Math.PI / 180);
    c.stroke(); c.globalAlpha = 1;
    moGlowDot(sq[0], sq[1], U * 0.013, P.gold, P.gold);
    moGlowDot(mq[0], mq[1], U * 0.011, P.ink, P.ink);

    /* the centre reading */
    moText(moLangHi() ? "चन्द्र" : "Moon in", cx, cy - U * 0.042, U * 0.017, P.dim, "center", 500);
    moText(L.nak.name, cx, cy - U * 0.010, U * 0.032, P.gold, "center", 700);
    moText((L.nak.f * (40 / 3)).toFixed(2) + "° " +
           (moLangHi() ? "में से " : "of ") + "13°20′ · pāda " + L.nak.pada,
           cx, cy + U * 0.022, U * 0.0165, P.ink, "center", 500);
    moText(L.tithi.paksha + " " + L.tithi.name, cx, cy + U * 0.046,
           U * 0.0165, P.dim, "center", 500);

    /* when the next bead starts — the fact worth posting */
    var end = mgEndOf(ms, function (t) {
      var mm = moSidAt("Moon", t);
      return mm == null ? null : Math.floor(mgNorm(mm) / seg);
    });
    if (end != null)
      moText(moP("entersAt", MG_NAK[(L.nak.i + 1) % 27],
                 moDateShort(end, W.tz).replace(/ \d{4}$/, "") + " " + moHM(end, W.tz)),
             st.cx, st.y + st.h * 0.875, U * 0.0215, P.glow, "center", 600);
    moText(moP("nakWorking", L.moon.toFixed(2), L.nak.v.toFixed(2)),
           st.cx, st.y + st.h * 0.925, U * 0.0175, P.dim, "center", 500);
    moText(moP("goldBand"), st.cx, st.y + st.h * 0.968, U * 0.0165, P.gold, "center", 500);
    return { ms: ms };
  }
});

/* ------------------------------------------------------------ orbitrose ---- */
MO_GLASS.push({
  key: "orbitrose", label: "The orbit rose",
  title: "A line drawn between two planets",
  sub: "every few days until their periods come back into step, and a figure closes",
  draw: function (p) {
    var P = moPal(), S = moSize(), st = moStage(), c = MO.ctx;
    var U = Math.min(S.w, S.h) / moTypeK();
    /* Its own option. Borrowing MO.opt.subject meant inheriting that control's
       default of Mars, so the scene billed as the Venus rose opened on Mars. */
    var who = MO.opt.rose || "Venus";
    if (["Mercury", "Venus", "Mars", "Jupiter", "Saturn"].indexOf(who) < 0) who = "Venus";
    /* the span over which each pair very nearly repeats: not asserted, chosen
       so the figure has time to close, and the closing is COUNTED below */
    var YEARS = { Mercury: 7, Venus: 8, Mars: 15, Jupiter: 12, Saturn: 30 }[who];

    var M = moCached("orbitrose|" + who + "|" + Math.floor(Date.now() / 86400000), function () {
      if (!window.__kHelio) return null;
      var t0 = Math.floor(Date.now() / 86400000) * 86400000;
      var days = YEARS * 365.25, N = 900;
      var rows = [], i;
      for (i = 0; i <= N; i++) {
        var ms = t0 + days * 86400000 * (i / N);
        var e = window.__kHelio("Earth", ms), q = window.__kHelio(who, ms);
        if (!e || !q) continue;
        rows.push({ ms: ms, eL: e.lon, eR: e.r, pL: q.lon, pR: q.r,
                    sep: mgNorm(q.lon - e.lon) });
      }
      /* the conjunctions this scene itself finds, so the petal count is a
         measurement rather than a number copied from an article */
      /* Count the passes BOTH WAYS. The separation runs forward for an
         inferior planet, which overtakes the Earth, and backward for a
         superior one, which the Earth overtakes. Looking only for a forward
         wrap found none at all for Mars, Jupiter and Saturn — and the frame
         then announced "0 meetings, so 0 petals" over a figure with seven
         obvious petals, which is a worse failure than drawing nothing. */
      var meets = 0;
      for (i = 1; i < rows.length; i++) {
        var a = rows[i - 1].sep, b = rows[i].sep;
        if ((a > 300 && b < 60) || (a < 60 && b > 300)) meets++;
      }
      var rmax = 0;
      rows.forEach(function (r) { rmax = Math.max(rmax, r.eR, r.pR); });
      return { rows: rows, meets: meets, rmax: rmax, years: YEARS, N: rows.length - 1,
               who: who };
    });
    if (!M || !M.rows.length) {
      moText(moT("noPlace"), st.cx, st.cy, U * 0.03, P.dim, "center"); return {};
    }

    moStars();
    var cx = st.cx, cy = st.y + st.h * 0.46;
    var R = Math.min(S.w * 0.40, st.h * 0.375) / M.rmax;
    function pt(lon, r) {
      var a = (lon - 90) * Math.PI / 180;
      return [cx + Math.cos(a) * r * R, cy + Math.sin(a) * r * R];
    }
    var idx = Math.min(M.N, Math.round(M.N * p));

    /* the two orbits */
    [["eL", "eR", "rgba(140,160,230,0.5)"], ["pL", "pR", "rgba(231,209,154,0.55)"]]
      .forEach(function (o) {
        c.beginPath();
        M.rows.forEach(function (r, i) {
          var q = pt(r[o[0]], r[o[1]]);
          if (i === 0) c.moveTo(q[0], q[1]); else c.lineTo(q[0], q[1]);
        });
        c.strokeStyle = o[2]; c.lineWidth = Math.max(1, U * 0.002); c.stroke();
      });

    /* the chords — the figure itself */
    for (var k = 0; k <= idx; k++) {
      var r2 = M.rows[k];
      var A = pt(r2.eL, r2.eR), B = pt(r2.pL, r2.pR);
      c.strokeStyle = P.gold;
      c.globalAlpha = 0.045 + 0.10 * (k / Math.max(1, idx));
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.stroke();
    }
    c.globalAlpha = 1;

    /* the Sun, and the two bodies now */
    var cur = M.rows[idx];
    var E = pt(cur.eL, cur.eR), Q = pt(cur.pL, cur.pR);
    c.strokeStyle = P.ink; c.globalAlpha = 0.8; c.lineWidth = Math.max(1.5, U * 0.003);
    c.beginPath(); c.moveTo(E[0], E[1]); c.lineTo(Q[0], Q[1]); c.stroke();
    c.globalAlpha = 1;
    moGlowDot(cx, cy, U * 0.016, P.gold, P.gold);
    moGlowDot(E[0], E[1], U * 0.012, "#8ca0e6", "#8ca0e6");
    moGlowDot(Q[0], Q[1], U * 0.012, P.pale || P.glow, P.glow);
    /* The full name, not the two-letter glyph: moTgl gives the abbreviation a
       chart uses, and "Earth and Ma" is not a title. */
    var whoName = (typeof MO_FULL !== "undefined" && MO_FULL[who]) ? MO_FULL[who] : who;
    moText("Earth", E[0], E[1] - U * 0.026, U * 0.0155, "#8ca0e6", "center", 600);
    moText(whoName, Q[0], Q[1] - U * 0.026, U * 0.0155, P.glow, "center", 600);

    moText(moP("rosePair", whoName, M.years),
           st.cx, st.y + st.h * 0.072, U * 0.023, P.ink, "center", 600);
    moText(moP("roseMeets", M.meets), st.cx, st.y + st.h * 0.122,
           U * 0.019, P.dim, "center", 500);
    moText(moP("roseYearOf", (M.years * (idx / M.N)).toFixed(1), M.years),
           st.cx, st.y + st.h * 0.885, U * 0.019, P.dim, "center", 500);
    moText(moP("roseWhy", M.meets), st.cx, st.y + st.h * 0.935,
           U * 0.0185, P.gold, "center", 600);
    moText(moP("heliocentric"), st.cx, st.y + st.h * 0.975, U * 0.0155,
           P.dim, "center", 500);
    return { ms: cur.ms };
  }
});

/* What the rose measured, for the cross-check: the petal count on the frame is
   a count of passes this scene found, and the test holds it against each
   pair's synodic period. */
try {
window.__moRoseFacts = function () {
  var k = "orbitrose|" + (MO.opt.rose || "Venus") + "|" + Math.floor(Date.now() / 86400000);
  var M = MO_CACHE[k];
  return M ? { meets: M.meets, years: M.years, who: M.who } : null;
};
window.__moOpt = function (k, v) { MO.opt[k] = v; MO_CACHE = {}; };
} catch (e) {}

MO_SCENES = MO_SCENES.concat(MO_GLASS);
try { window.__moGlassKeys = MO_GLASS.map(function (s) { return s.key; }); } catch (e) {}
