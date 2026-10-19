/* ===== Two clocks on one ring =============================================

   THE QUESTION THIS ANSWERS. Every pañcāṅga prints a tithi and a nakṣatra
   side by side, in the same typeface, in the same row, as though they were
   two readings of the same instrument. They are not. They are readings of two
   different instruments that happen to both involve the Moon, and almost
   nobody is ever told the difference:

     a NAKṢATRA is the Moon's own place. One body, measured against the fixed
     stars. Its twenty-seven boundaries are nailed to the zodiac and never
     move — Aśvinī begins at 0° and will begin at 0° forever.

     a TITHI is the ANGLE BETWEEN the Moon and the Sun. Two bodies. Its
     boundaries are not nailed to anything: they sit twelve degrees apart
     measured FROM THE SUN, so the whole set of thirty slides forward through
     the zodiac as the year goes on, about a degree a day.

   So the two counters advance at different rates and out of step, and the
   reason is not an adjustment or a correction — it is that one of them is
   measured from a thing that moves.

   WHAT THE FRAME SHOWS. One ring carrying both scales at once. The outer
   track is the twenty-seven, fixed, with the current nakṣatra lit. The inner
   track is the thirty tithi boundaries, drawn FROM THE SUN'S CURRENT PLACE,
   with the current tithi lit — and as the playhead runs, that inner track
   visibly rotates while the outer one does not. Two hands, Sun and Moon. The
   gold arc between them is the elongation, which is the tithi's whole input.

   The counters below advance as they advance, and the frame states the count:
   in two days the Moon crosses about two nakṣatra boundaries and the pair
   crosses about two tithi boundaries, but never the same two, and never at
   the same moments.

   The span is deliberately short — about two and a half days — because the
   point is a boundary crossing you can watch, not a month you have to take on
   trust. Everything on the frame comes from mgLimbs(), the same function the
   glassbox scenes use, so the two cannot disagree. */

var MO_TWOCLOCK = [];

/* moFitWidth returns the size that fits; it does not draw. This scene has two
   narrow columns and a full-width footer, all carrying sentences rather than
   labels, so it wraps the pair together once rather than at seven call sites. */
function tcFit(s, x, y, size, col, align, weight, maxW) {
  moText(s, x, y, moFitWidth(s, size, maxW, false, weight), col, align, weight);
}

MO_TWOCLOCK.push({
  key: "twoclocks", label: "Two clocks, one ring",
  title: "A tithi and a nakṣatra are not the same kind of thing",
  sub: "one is the Moon's place; the other is the angle between the Moon and the Sun — so one set of boundaries moves",
  draw: function (p) {
    var P = moPal(), S = moSize(), st = moStage(), c = MO.ctx;
    var U = Math.min(S.w, S.h) / moTypeK();
    var R = Math.PI / 180;

    /* Two and a half days from the start of today, local. Long enough for the
       Moon to cross a nakṣatra boundary and the pair to cross a tithi one;
       short enough that both crossings are watchable rather than asserted. */
    var W = moPlace();
    var tz = (W && W.tz) || 0;
    var M = moCached("twoclocks|" + (W ? W.name : "-") + "|" + moToday(tz), function () {
      var loc = new Date(Date.now() + tz * 3600000);
      var t0 = Date.UTC(loc.getUTCFullYear(), loc.getUTCMonth(), loc.getUTCDate())
             - tz * 3600000;
      var span = 2.5 * 86400000;
      /* Sampled once so the counters below can be counted rather than guessed:
         how many boundaries of each kind the span actually contains. */
      var N = 150, rows = [];
      for (var i = 0; i <= N; i++) {
        var L = mgLimbs(t0 + span * i / N);
        if (!L) return null;
        rows.push({ ms: t0 + span * i / N, sun: L.sun, moon: L.moon,
                    elong: L.elong, ti: L.tithi.i, ni: L.nak.i,
                    tn: L.tithi.name, tp: L.tithi.paksha,
                    nn: L.nak.name, tf: L.tithi.f, nf: L.nak.f });
      }
      var tC = 0, nC = 0;
      for (var j = 1; j < rows.length; j++) {
        if (rows[j].ti !== rows[j - 1].ti) tC++;
        if (rows[j].ni !== rows[j - 1].ni) nC++;
      }
      /* How far the tithi grid itself slides over the span. It is pinned to
         the Sun, so this is simply the Sun's own motion — which is the whole
         explanation, stated as a number. */
      var slide = ((rows[rows.length - 1].sun - rows[0].sun) % 360 + 360) % 360;
      return { t0: t0, span: span, rows: rows, tC: tC, nC: nC, slide: slide };
    });
    if (!M) { moText(moT("noPlace"), st.cx, st.cy, U * 0.03, P.dim, "center"); return {}; }

    moStars();
    var k = Math.min(M.rows.length - 1, Math.floor(M.rows.length * p));
    var r = M.rows[k], r0 = M.rows[0];

    var cx = st.cx, cy = st.y + st.h * 0.345;
    var rad = Math.min(S.w * 0.355, st.h * 0.260);

    moText(moP("twoClocksHead"), cx, st.y + st.h * 0.055, U * 0.034, P.ink, "center", 700);

    /* --- the outer track: the 27, nailed to the stars -------------------- */
    c.save();
    c.strokeStyle = P.dim; c.lineWidth = Math.max(1, U * 0.0016);
    c.globalAlpha = 0.55;
    for (var n = 0; n < 27; n++) {
      var a = (n * (40 / 3) - 90) * R;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * rad * 1.00, cy + Math.sin(a) * rad * 1.00);
      c.lineTo(cx + Math.cos(a) * rad * 1.13, cy + Math.sin(a) * rad * 1.13);
      c.stroke();
    }
    c.globalAlpha = 1;
    /* the nakṣatra the Moon is in now */
    var na0 = (r.ni * (40 / 3) - 90) * R, na1 = ((r.ni + 1) * (40 / 3) - 90) * R;
    c.beginPath();
    c.arc(cx, cy, rad * 1.065, na0, na1);
    c.strokeStyle = P.glow; c.lineWidth = Math.max(4, U * 0.017);
    c.stroke();
    c.restore();

    /* --- the inner track: the 30 tithi boundaries, FROM THE SUN ----------
       Drawn at Sun + 12k, so the whole set turns with the Sun. That rotation
       is the thing the scene exists to show, and it is visible across the
       span because the Sun moves about two and a half degrees in it. */
    c.save();
    c.strokeStyle = P.gold; c.lineWidth = Math.max(1.5, U * 0.0026);
    c.globalAlpha = 0.85;
    for (var t = 0; t < 30; t++) {
      var b = (r.sun + t * 12 - 90) * R;
      c.beginPath();
      c.moveTo(cx + Math.cos(b) * rad * 0.70, cy + Math.sin(b) * rad * 0.70);
      c.lineTo(cx + Math.cos(b) * rad * 0.84, cy + Math.sin(b) * rad * 0.84);
      c.stroke();
    }
    c.globalAlpha = 1;
    /* the tithi now: the wedge from Sun+12i to Sun+12(i+1) */
    var ta0 = (r.sun + r.ti * 12 - 90) * R, ta1 = (r.sun + (r.ti + 1) * 12 - 90) * R;
    c.beginPath();
    c.arc(cx, cy, rad * 0.77, ta0, ta1);
    c.strokeStyle = P.gold; c.lineWidth = Math.max(4, U * 0.017);
    c.stroke();
    /* a ghost of where the tithi grid stood at the start, so the slide is a
       comparison rather than a memory */
    c.strokeStyle = P.ink; c.globalAlpha = 0.40;
    c.lineWidth = Math.max(1, U * 0.0020);
    c.setLineDash([U * 0.008, U * 0.008]);
    for (var t2 = 0; t2 < 30; t2++) {
      var b2 = (r0.sun + t2 * 12 - 90) * R;
      c.beginPath();
      c.moveTo(cx + Math.cos(b2) * rad * 0.70, cy + Math.sin(b2) * rad * 0.70);
      c.lineTo(cx + Math.cos(b2) * rad * 0.84, cy + Math.sin(b2) * rad * 0.84);
      c.stroke();
    }
    c.setLineDash([]); c.globalAlpha = 1;
    c.restore();

    /* --- the elongation arc, which is the tithi's only input ------------- */
    c.save();
    c.beginPath();
    c.arc(cx, cy, rad * 0.93, (r.sun - 90) * R, (r.moon - 90) * R);
    c.strokeStyle = P.gold; c.globalAlpha = 0.30;
    c.lineWidth = Math.max(4, U * 0.013);
    c.stroke();
    c.restore();

    /* --- the two hands -------------------------------------------------- */
    function hand(deg, len, col, lab, w) {
      var a = (deg - 90) * R;
      c.save();
      c.strokeStyle = col; c.lineWidth = Math.max(2, U * (w || 0.004));
      c.beginPath(); c.moveTo(cx, cy);
      c.lineTo(cx + Math.cos(a) * rad * len, cy + Math.sin(a) * rad * len);
      c.stroke();
      c.restore();
      /* inside the ring: the middle is empty apart from the phase disc, and
         a label out at the rim lands on the ticks or on the row below */
      moText(lab, cx + Math.cos(a) * rad * 0.44,
             cy + Math.sin(a) * rad * 0.44 + U * 0.008,
             U * 0.019, col, "center", 700);
    }
    hand(r.sun, 0.62, P.gold, moTgraha("Sun"), 0.0055);
    hand(r.moon, 0.93, P.glow, moTgraha("Moon"), 0.0040);
    moPhaseDisc(cx, cy, rad * 0.17, r.elong, P);

    /* --- the two counters ------------------------------------------------ */
    var by = cy + rad * 1.34;
    var colL = cx - S.w * 0.215, colR = cx + S.w * 0.215;

    moText(moP("nakColHead") + "  ·  27", colL, by, U * 0.0200, P.glow, "center", 700);
    moText(r.nn, colL, by + st.h * 0.042, U * 0.030, P.ink, "center", 700);
    tcFit(moP("oneBody"), colL, by + st.h * 0.072, U * 0.0150, P.dim,
               "center", 500, S.w * 0.44);
    moText(moP("pctThrough", Math.round(r.nf * 100)), colL, by + st.h * 0.098,
           U * 0.0165, P.dim, "center", 500);

    moText(moP("tithiColHead") + "  ·  30", colR, by, U * 0.0200, P.gold, "center", 700);
    moText(r.tp + " " + r.tn, colR, by + st.h * 0.042, U * 0.030, P.ink, "center", 700);
    tcFit(moP("twoBodies"), colR, by + st.h * 0.072, U * 0.0150, P.dim,
               "center", 500, S.w * 0.44);
    moText(moP("pctThrough", Math.round(r.tf * 100)), colR, by + st.h * 0.098,
           U * 0.0165, P.dim, "center", 500);

    /* the subtraction, because this scene belongs to the glassbox family */
    moText("Moon " + r.moon.toFixed(2) + "° − Sun " + r.sun.toFixed(2) + "° = " +
           r.elong.toFixed(2) + "°  ÷ 12° = " + (r.elong / 12).toFixed(2),
           cx, by + st.h * 0.137, U * 0.0170, P.gold, "center", 500);
    moText("Moon " + r.moon.toFixed(2) + "° ÷ 13°20′ = " +
           (r.moon / (40 / 3)).toFixed(2),
           cx, by + st.h * 0.168, U * 0.0170, P.glow, "center", 500);

    /* --- what the span contained, counted ------------------------------- */
    tcFit(moP("crossedBoth", M.nC, M.tC), cx, st.y + st.h * 0.925,
           U * 0.0185, P.ink, "center", 600, S.w * 0.90);
    tcFit(moP("gridSlid", M.slide.toFixed(1)), cx, st.y + st.h * 0.968,
           U * 0.0160, P.dim, "center", 500, S.w * 0.90);
    return { ms: r.ms };
  }
});

/* The sampled span, so the counts on the frame can be re-derived from the
   longitudes rather than trusted. */
try {
window.__moTwoClockFacts = function () {
  var W = moPlace();
  return MO_CACHE["twoclocks|" + (W ? W.name : "-") + "|" +
                  moToday((W && W.tz) || 0)] || null;
};
} catch (e) {}

MO_SCENES = MO_SCENES.concat(MO_TWOCLOCK);
try { window.__moTwoClockKeys = MO_TWOCLOCK.map(function (s) { return s.key; }); }
catch (e) {}
