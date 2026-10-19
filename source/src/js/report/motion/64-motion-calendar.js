/* ===== The month, walked =================================================

   A calendar is the one thing on this site that everybody already thinks they
   understand, which makes it the best thing to animate: the grid is familiar
   and almost everything inside it is not.

   What the walk shows that a printed month cannot:

     the Moon on every cell is the REAL Moon of that morning, drawn from that
     day's own elongation, so the crescent thins and fattens at the rate the
     Moon actually moves rather than stepping through four stock icons;

     the tithi number under each day does not advance by one per cell. It
     repeats on the days a tithi spans two sunrises and skips on the days one
     fits between them, and watching the counter stumble is the clearest proof
     that a tithi is not a day that anyone has ever produced;

     the pakṣa turns at the full and new moons rather than at the month's own
     boundary, because a lunar month and a Gregorian one have nothing to do
     with each other.

   WHAT IT DOES NOT SHOW. Named festivals. festivals.js lives with panchanga.js
   and neither loads on this page, so the scene marks pūrṇimā, amāvāsyā and the
   ekādaśīs — which it can derive from the tithi index alone — and says nothing
   about Dīvālī. Drawing a festival here would mean a second festival rule
   table free to drift from the real one, and a calendar that disagrees with
   the calendar is worse than one that stays quiet. */

var MO_CAL = [];

var MC_WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
var MC_MON = ["January", "February", "March", "April", "May", "June", "July",
              "August", "September", "October", "November", "December"];

MO_CAL.push({
  key: "monthwalk", label: "The month, walked",
  title: "A month of real moons",
  sub: "every cell drawn from that morning's own elongation — and the tithi number stumbles",
  draw: function (p) {
    var P = moPal(), S = moSize(), st = moStage(), c = MO.ctx;
    var U = Math.min(S.w, S.h) / moTypeK();
    var W = moPlace();
    if (!W) { moText(moT("noPlace"), st.cx, st.cy, U * 0.03, P.dim, "center"); return {}; }

    var M = moCached(moReelKey("monthwalk", W), function () {
      /* the month the viewer is in, at their own place */
      var now = Date.now();
      var loc = new Date(now + (W.tz || 0) * 3600000);
      var y = loc.getUTCFullYear(), mo = loc.getUTCMonth();
      var last = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
      var days = [];
      for (var d = 1; d <= last; d++) {
        /* local midnight of that day, as a UTC instant */
        var mid = Date.UTC(y, mo, d) - (W.tz || 0) * 3600000;
        var sr = null;
        try { sr = window.__kRiseSet("Sun", W.lat, W.lon, mid - 6 * 3600000, 2, +1); }
        catch (e) {}
        if (sr == null) { days.push(null); continue; }
        var L = mgLimbs(sr);
        if (!L) { days.push(null); continue; }
        days.push({
          d: d, sr: sr, elong: L.elong,
          ti: L.tithi.i, tn: (L.tithi.i % 15) + 1,
          tname: L.tithi.name, paksha: L.tithi.paksha,
          nak: L.nak.name, pada: L.nak.pada,
          yoga: L.yoga.name, karana: L.karana.name,
          wd: new Date(Date.UTC(y, mo, d)).getUTCDay(),
          full: L.tithi.i === 14, newmoon: L.tithi.i === 29,
          ekadashi: L.tithi.i === 10 || L.tithi.i === 25
        });
      }
      /* THE STUMBLE, counted between CONSECUTIVE DAYS rather than over the
         whole month.

         A Gregorian month holds about thirty-one and a half tithis, so the
         index runs past twenty-nine and starts again — which means a tithi
         number can appear twice in one month for no reason but the wrap. The
         first version counted every such recurrence as an adhika tithi and
         reported three where the grid plainly showed one, and its search for
         gaps was masked by the same recurrences, so it found no kṣaya at all
         on a month that has one.

         Read locally the question is unambiguous and needs no bookkeeping:
         the same index on two mornings running is a tithi that spanned two
         sunrises (adhika); a jump of two is a tithi that fitted between them
         and named no day (kṣaya). */
      var repeats = [], missing = [];
      for (var i2 = 1; i2 < days.length; i2++) {
        var a = days[i2 - 1], b2 = days[i2];
        if (!a || !b2) continue;
        var gap = ((b2.ti - a.ti) % 30 + 30) % 30;
        if (gap === 0) repeats.push(b2.ti);
        else if (gap > 1) for (var g = 1; g < gap; g++) missing.push((a.ti + g) % 30);
      }
      var fromT = days.find(function (x) { return x; });
      return { y: y, mo: mo, last: last, days: days,
               lead: fromT ? fromT.wd : 0, repeats: repeats, missing: missing };
    });
    if (!M) { moText(moT("noPlace"), st.cx, st.cy, U * 0.03, P.dim, "center"); return {}; }

    moStars();
    var idx = Math.min(M.last - 1, Math.floor(M.last * p));
    var cur = M.days[idx];

    /* --- the grid ------------------------------------------------------- */
    var gx = S.w * 0.055, gw = S.w * 0.89;
    var cw = gw / 7;
    var rows = Math.ceil((M.lead + M.last) / 7);
    var gy = st.y + st.h * 0.165;
    var chh = Math.min(cw * 0.86, (st.h * 0.52) / rows);

    moText(MC_MON[M.mo] + " " + M.y, st.cx, st.y + st.h * 0.072,
           U * 0.036, P.ink, "center", 700);
    moText(W.name || "", st.cx, st.y + st.h * 0.118, U * 0.020, P.dim, "center", 500);

    for (var w = 0; w < 7; w++)
      moText(MC_WD[w], gx + cw * (w + 0.5), gy - U * 0.012, U * 0.0155, P.dim, "center", 600);

    M.days.forEach(function (day, i) {
      if (!day) return;
      var cell = M.lead + i;
      var cx = gx + cw * (cell % 7 + 0.5);
      var cy = gy + chh * Math.floor(cell / 7);
      var here = i === idx, past = i <= idx;
      if (here) {
        c.fillStyle = P.gold; c.globalAlpha = 0.16;
        c.fillRect(cx - cw * 0.46, cy, cw * 0.92, chh * 0.94);
        c.globalAlpha = 1;
        c.strokeStyle = P.gold; c.lineWidth = Math.max(1.5, U * 0.0028);
        c.strokeRect(cx - cw * 0.46, cy, cw * 0.92, chh * 0.94);
      }
      c.globalAlpha = past ? 1 : 0.28;
      moPhaseDisc(cx, cy + chh * 0.50, cw * 0.21, day.elong, P);
      moText(String(day.d), cx - cw * 0.30, cy + chh * 0.17, U * 0.0165,
             (day.full || day.newmoon) ? P.gold : P.ink, "left", 600);
      /* the tithi number, which is the thing that stumbles */
      moText(String(day.tn), cx + cw * 0.30, cy + chh * 0.17, U * 0.0155,
             day.paksha === "Śukla" ? P.glow : P.dim, "right", 600);
      if (day.full || day.newmoon || day.ekadashi)
        moText(day.full ? "P" : day.newmoon ? "A" : "11",
               cx + cw * 0.30, cy + chh * 0.86, U * 0.0135, P.gold, "right", 700);
      c.globalAlpha = 1;
    });

    /* --- the day under the playhead ------------------------------------- */
    if (cur) {
      var py = gy + chh * rows + st.h * 0.045;
      moText(MC_WD[cur.wd] + " " + cur.d + " " + MC_MON[M.mo],
             st.cx, py, U * 0.0215, P.dim, "center", 500);
      moText(cur.paksha + " " + cur.tname, st.cx, py + st.h * 0.052,
             U * 0.038, P.ink, "center", 700);
      moText(cur.nak + " pāda " + cur.pada + "   ·   " + cur.yoga +
             "   ·   " + cur.karana,
             st.cx, py + st.h * 0.095, U * 0.0195, P.dim, "center", 500);
      moText(moP("sunriseAt", moHM(cur.sr, W.tz)), st.cx, py + st.h * 0.132,
             U * 0.0185, P.glow, "center", 500);
    }

    /* --- the stumble, stated -------------------------------------------- */
    var line;
    if (M.repeats.length && M.missing.length)
      line = moP("tithiBoth", M.repeats.length, M.missing.length);
    else if (M.repeats.length) line = moP("tithiRepeat", M.repeats.length);
    else if (M.missing.length) line = moP("tithiSkip", M.missing.length);
    else line = moP("tithiEven");
    moText(line, st.cx, st.y + st.h * 0.945, U * 0.0195, P.gold, "center", 600);
    moText(moP("realMoons"), st.cx, st.y + st.h * 0.982, U * 0.0165, P.dim, "center", 500);
    return { ms: cur ? cur.sr : Date.now() };
  }
});

/* The month as computed, so the stumble can be read off the days rather than
   trusted from the line the frame prints. */
try {
window.__moCalFacts = function () {
  var W = moPlace(); if (!W) return null;
  return MO_CACHE[moReelKey("monthwalk", W)] || null;
};
} catch (e) {}

MO_SCENES = MO_SCENES.concat(MO_CAL);
try { window.__moCalKeys = MO_CAL.map(function (s) { return s.key; }); } catch (e) {}
