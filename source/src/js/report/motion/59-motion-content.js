/* ===== Three more scenes, chosen for what they teach ======================

   Added because the Studio needs variety: posting the same retrograde loop
   every week is how a feed dies. But variety for its own sake is just noise, so
   each of these had to clear the same bar as the rest — it must show something
   that is TRUE, that is hard to see any other way, and that a reader will not
   already know.

   All three are chart-free. That is deliberate rather than incidental: the
   Studio is used without a birth chart, and a scene it cannot open is a scene
   it cannot recommend.

     speeds   — why Śani takes thirty years and the Moon twenty-seven days,
                shown as one race rather than asserted as a table
     nakwalk  — the Moon through all twenty-seven nakṣatras, which is the
                clearest demonstration of what a nakṣatra actually is
     sunarc   — sunrise and sunset across a year at one place, which is where
                the whole calendar's dependence on place becomes visible */

var MO_CONTENT = [];

/* ---------------------------------------------------------------- speeds --
   Nine grahas on one circular track, each at its own real rate, leaving a trail
   behind it. Everyone has read that Śani takes about thirty years; almost
   nobody has watched the Moon lap it a hundred times while it crawls through a
   third of a sign. The table is a fact and the race is an argument. */
MO_CONTENT.push({
  key: "speeds", label: "Graha speeds",
  title: "Why Śani takes thirty years",
  sub: "nine grahas, one track, each at its own true rate",
  draw: function (p) {
    var P = moPal(), S = moSize(), st = moStage(), c = MO.ctx;
    var U = Math.min(S.w, S.h);
    var t0 = Date.now(), t1 = t0 + moSpanMs(), ms = t0 + (t1 - t0) * p;
    moStars();

    var names = ["Moon", "Mercury", "Venus", "Sun", "Mars", "Jupiter",
                 "Saturn", "Rahu", "Ketu"];
    var cx = st.cx, cy = st.y + st.h * 0.47;
    var Rout = Math.min(S.w * 0.40, st.h * 0.40);
    var Rin = Rout * 0.30;
    var lanes = names.length;

    /* the twelve rāśi spokes, so the track is a zodiac and not a dial */
    c.strokeStyle = P.line; c.lineWidth = 1;
    for (var k = 0; k < 12; k++) {
      var a = (k * 30 - 90) * Math.PI / 180;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * Rin * 0.86, cy + Math.sin(a) * Rin * 0.86);
      c.lineTo(cx + Math.cos(a) * Rout * 1.04, cy + Math.sin(a) * Rout * 1.04);
      c.stroke();
      var am = ((k + 0.5) * 30 - 90) * Math.PI / 180;
      moText(moTrasi(k), cx + Math.cos(am) * Rout * 1.13,
             cy + Math.sin(am) * Rout * 1.13, U * 0.017, P.dim, "center", 600);
    }

    names.forEach(function (en, i) {
      var R = Rin + (Rout - Rin) * (i + 0.5) / lanes;
      c.strokeStyle = P.line; c.lineWidth = 1;
      c.beginPath(); c.arc(cx, cy, R, 0, 6.2832); c.stroke();

      /* The trail, capped at about two laps.

         Drawing the whole window turns the Moon into a filled disc: a hundred
         and fifteen laps sampled at any practical rate is a smear, and a smear
         says nothing except "fast". Two laps is an arc you can follow, and the
         lap COUNT beside the name carries the total — picture for the shape,
         number for the magnitude, which is the division of labour that makes
         both legible. Saturn, which has not finished a third of one lap, simply
         shows all of it. */
      var lon0 = moSidAt(en, t0), lonN = moSidAt(en, ms);
      if (lon0 == null || lonN == null) return;
      var periodMs = moSynodicDays(en) * 86400000;
      var trailFrom = Math.max(t0, ms - periodMs * 2);
      var N = 160;
      c.strokeStyle = (en === "Rahu" || en === "Ketu") ? P.dim
                    : (MO_BEN[en] ? P.benefic : P.malefic);
      c.globalAlpha = 0.34; c.lineWidth = Math.max(1.5, U * 0.0045);
      c.beginPath();
      for (var j = 0; j <= N; j++) {
        var mj = trailFrom + (ms - trailFrom) * j / N, L = moSidAt(en, mj);
        if (L == null) continue;
        var aa = (L - 90) * Math.PI / 180;
        var x = cx + Math.cos(aa) * R, y = cy + Math.sin(aa) * R;
        if (j === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.stroke(); c.globalAlpha = 1;

      var an = (lonN - 90) * Math.PI / 180;
      moGlyph(cx + Math.cos(an) * R, cy + Math.sin(an) * R, U * 0.026, en, P);

      /* how far it has come, in degrees and in laps — the number that makes
         the point once the picture has made it */
      var moved = (lonN - lon0 + 360 * 400) % 360 +
                  360 * Math.floor(((ms - t0) / 86400000) / moSynodicDays(en));
      var laps = moved / 360;
      if (i === 0) {
        c.fillStyle = P.bg; c.globalAlpha = 0.72;
        c.fillRect(S.w * 0.028, st.y + st.h * 0.028,
                   U * 0.30, lanes * U * 0.034 + U * 0.022);
        c.globalAlpha = 1;
      }
      moText(moTgraha(en) + "  " + (laps >= 1 ? laps.toFixed(1) + " " + moP("lapsWord")
                                              : Math.round(moved) + "°"),
             S.w * 0.048, st.y + st.h * 0.045 + i * U * 0.034,
             U * 0.0205, (en === "Rahu" || en === "Ketu") ? P.dim
                       : (MO_BEN[en] ? P.benefic : P.malefic), "left", 600);
    });

    moText(moP("spanSoFar", moDaysLabel(ms - t0)), cx, cy,
           U * 0.028, P.gold, "center", 700);
    return { ms: ms };
  }
});
/* A graha's own period in days, used only to count whole laps the sampled trail
   cannot see. Sidereal periods, which is what a lap of the zodiac is. */
function moSynodicDays(en) {
  return ({ Moon: 27.3217, Mercury: 87.969, Venus: 224.701, Sun: 365.256,
            Mars: 686.98, Jupiter: 4332.59, Saturn: 10759.2,
            Rahu: 6798.4, Ketu: 6798.4 })[en] || 365.256;
}
function moDaysLabel(dms) {
  var d = dms / 86400000;
  if (d < 90) return Math.round(d) + " " + moP("daysWord");
  if (d < 730) return (d / 30.44).toFixed(1) + " " + moP("monthsWord");
  return (d / 365.25).toFixed(1) + " " + moP("yearsWord");
}

/* --------------------------------------------------------------- nakwalk --
   The Moon through the twenty-seven nakṣatras. A nakṣatra is 13°20′ of the
   ecliptic and the Moon covers one in roughly a day, which is the fact the
   whole Viṃśottarī system rests on — and which a list of twenty-seven names
   does not convey at all. Watching the Moon step through them, with the pāda
   boundaries visible inside each, makes the structure obvious in a way no
   table does. */
MO_CONTENT.push({
  key: "nakwalk", label: "Nakṣatra walk",
  title: "The Moon\u2019s twenty-seven rooms",
  sub: "13°20′ each, four pādas each — about one nakṣatra a day",
  draw: function (p) {
    var P = moPal(), S = moSize(), st = moStage(), c = MO.ctx;
    var U = Math.min(S.w, S.h);
    var t0 = Date.now(), t1 = t0 + moSpanMs(), ms = t0 + (t1 - t0) * p;
    var mo = moSidAt("Moon", ms);
    if (mo == null) throw new Error("no position");
    moStars();

    var cx = st.cx, cy = st.y + st.h * 0.46;
    var R = Math.min(S.w * 0.37, st.h * 0.37), band = R * 0.20;
    var cur = Math.floor((((mo % 360) + 360) % 360) / (40 / 3));
    var pada = Math.floor(((((mo % 360) + 360) % 360) % (40 / 3)) / (10 / 3)) + 1;

    for (var i = 0; i < 27; i++) {
      var a0 = (i * (40 / 3) - 90) * Math.PI / 180;
      var a1 = ((i + 1) * (40 / 3) - 90) * Math.PI / 180;
      var on = i === cur;
      c.beginPath();
      c.arc(cx, cy, R + band / 2, a0, a1);
      /* The unlit segments were drawn in the line colour at a third opacity,
         which on a dark ground is almost nothing — the ring read as one faint
         circle and the twenty-seven divisions, which are the entire point,
         could not be counted. Alternating weights make them separable without
         competing with the lit one. */
      c.strokeStyle = on ? P.gold : (i % 2 ? P.glow : P.dim);
      c.lineWidth = on ? band : band * 0.74;
      c.globalAlpha = on ? 0.95 : 0.46;
      c.stroke();
      c.globalAlpha = 1;
      /* the four pādas inside each — the division that actually drives the
         navāṃśa, drawn only on the lit one so the ring stays readable */
      if (on) {
        for (var q = 1; q < 4; q++) {
          var aq = ((i * (40 / 3)) + q * (10 / 3) - 90) * Math.PI / 180;
          c.beginPath();
          c.moveTo(cx + Math.cos(aq) * R, cy + Math.sin(aq) * R);
          c.lineTo(cx + Math.cos(aq) * (R + band), cy + Math.sin(aq) * (R + band));
          c.strokeStyle = P.bg; c.lineWidth = Math.max(1.5, U * 0.004); c.stroke();
        }
      }
      var am = ((i + 0.5) * (40 / 3) - 90) * Math.PI / 180;
      moText(String(i + 1), cx + Math.cos(am) * (R + band * 1.62),
             cy + Math.sin(am) * (R + band * 1.62),
             U * 0.0152, on ? P.gold : P.ink, "center", on ? 700 : 500);
    }

    var am2 = (mo - 90) * Math.PI / 180;
    moGlyph(cx + Math.cos(am2) * (R + band / 2),
            cy + Math.sin(am2) * (R + band / 2), U * 0.030, "Moon", P);

    moText(moTnak(cur), cx, cy - U * 0.030, U * 0.046, P.ink, "center", 700);
    moText(moP("padaOf", pada), cx, cy + U * 0.012, U * 0.024, P.gold, "center", 600);
    moText(moP("nakSpan"), cx, cy + U * 0.048, U * 0.019, P.dim, "center", 500);
    return { ms: ms };
  }
});

/* ---------------------------------------------------------------- sunarc --
   Sunrise and sunset across a year, for the place the frame is cast for. Two
   curves that swell and close, and between them the length of the day.

   This is the scene that makes the rest of the site's insistence on place
   concrete. Everything in a pañcāṅga descends from sunrise; this is what
   sunrise actually does over a year, and it does something visibly different
   in Delhi, in Reykjavík and on the equator. */
MO_CONTENT.push({
  key: "sunarc", label: "Sunrise through the year",
  title: "What sunrise does over a year",
  sub: "and why a pañcāṅga is only valid for the place it was made for",
  draw: function (p) {
    var P = moPal(), S = moSize(), st = moStage(), c = MO.ctx;
    var U = Math.min(S.w, S.h);
    var W = moPlace();
    if (!W) { moText(moT("noPlace"), st.cx, st.cy, U * 0.03, P.dim); return {}; }
    var t0 = Date.now(), ms = t0 + 365 * 86400000 * p;

    /* A year of sunrises is 365 iterative searches, so it is computed once per
       place and kept — the playhead then only moves a marker across it. */
    var key = "sunarc|" + W.lat.toFixed(3) + "," + W.lon.toFixed(3) + "|" +
              Math.floor(t0 / 86400000);
    var rows = moCached(key, function () {
      var out = [];
      for (var d = 0; d < 365; d += 2) {
        var anchor = t0 + d * 86400000;
        var sr = null, ss = null;
        try {
          sr = window.__kRiseSet("Sun", W.lat, W.lon, anchor - 6 * 3600000, 2, +1);
          ss = (sr == null) ? null
             : window.__kRiseSet("Sun", W.lat, W.lon, sr, 2, -1);
        } catch (e) {}
        out.push({ d: d, sr: sr, ss: ss, anchor: anchor });
      }
      return out;
    });

    moStars();
    var x0 = S.w * 0.17, x1 = S.w * 0.93;
    var y0 = st.y + st.h * 0.16, y1 = st.y + st.h * 0.86;
    function X(d) { return x0 + (x1 - x0) * (d / 364); }
    function Y(h) { return y0 + (y1 - y0) * (h / 24); }

    /* the hour grid */
    c.strokeStyle = P.line; c.lineWidth = 1;
    for (var h = 0; h <= 24; h += 6) {
      c.beginPath(); c.moveTo(x0, Y(h)); c.lineTo(x1, Y(h)); c.stroke();
      moText((h < 10 ? "0" : "") + h + ":00", x0 - U * 0.012, Y(h),
             U * 0.016, P.dim, "right", 500);
    }

    function localH(t) {
      if (t == null) return null;
      var dd = new Date(t + (W.tz || 0) * 3600000);
      return dd.getUTCHours() + dd.getUTCMinutes() / 60 + dd.getUTCSeconds() / 3600;
    }
    /* the daylight between the two curves, which is the thing the eye reads */
    c.beginPath();
    var started = false;
    rows.forEach(function (r) {
      var y = localH(r.sr); if (y == null) return;
      if (!started) { c.moveTo(X(r.d), Y(y)); started = true; }
      else c.lineTo(X(r.d), Y(y));
    });
    for (var i = rows.length - 1; i >= 0; i--) {
      var y2 = localH(rows[i].ss); if (y2 == null) continue;
      c.lineTo(X(rows[i].d), Y(y2));
    }
    c.closePath();
    var dg = c.createLinearGradient(0, y0, 0, y1);
    dg.addColorStop(0, P.gold); dg.addColorStop(1, P.glow);
    c.fillStyle = dg; c.globalAlpha = 0.17; c.fill(); c.globalAlpha = 1;

    [["sr", P.gold], ["ss", P.glow]].forEach(function (pair) {
      c.beginPath(); var first = true;
      rows.forEach(function (r) {
        var y = localH(r[pair[0]]); if (y == null) return;
        if (first) { c.moveTo(X(r.d), Y(y)); first = false; }
        else c.lineTo(X(r.d), Y(y));
      });
      c.strokeStyle = pair[1]; c.lineWidth = Math.max(2, U * 0.005); c.stroke();
    });

    /* where the playhead is */
    var di = Math.min(364, Math.round(365 * p));
    var row = rows[Math.min(rows.length - 1, Math.round(di / 2))];
    c.strokeStyle = P.ink; c.globalAlpha = 0.5; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(X(di), y0); c.lineTo(X(di), y1); c.stroke();
    c.globalAlpha = 1;
    var hr = localH(row.sr), hs = localH(row.ss);
    function hhmm(v) {
      if (v == null) return "—";
      var H = Math.floor(v), M = Math.round((v - H) * 60);
      if (M === 60) { H++; M = 0; }
      return (H < 10 ? "0" : "") + H + ":" + (M < 10 ? "0" : "") + M;
    }
    if (hr != null) moGlowDot(X(di), Y(hr), U * 0.011, P.bg, P.gold);
    if (hs != null) moGlowDot(X(di), Y(hs), U * 0.011, P.bg, P.glow);

    moText(moP("riseSetAt", hhmm(hr), hhmm(hs)), st.cx, st.y + st.h * 0.065,
           U * 0.026, P.ink, "center", 600);
    if (hr != null && hs != null)
      moText(moP("dayLengthIs", (hs - hr).toFixed(2)), st.cx, st.y + st.h * 0.105,
             U * 0.019, P.dim, "center", 500);
    return { ms: row.anchor };
  }
});

MO_SCENES = MO_SCENES.concat(MO_CONTENT);
