/* ===== Five reels, and what makes them different from the other scenes ======

   Everything in 51/55/57/59 answers a question about the sky in general: what
   retrogression is, what a nakṣatra is, why Śani is slow. They are the same
   animation whenever you open them, which is right for teaching and wrong for
   a feed. A feed needs a reason for TODAY.

   So the rule for these five is narrow: the frame must be different tomorrow,
   and different because the sky is different — not because a clock is printed
   on it. Each one is anchored to the viewer's own sunrise at the viewer's own
   place, and each one has a number on it that changes by a visible amount from
   one day to the next:

     twotithi  — the tithi bands against the sunrise lines. The lengths move by
                 tens of minutes a day and the bands shuffle past the lines, so
                 the picture is never the same twice. This is also the single
                 most misunderstood mechanism in a pañcāṅga.
     tonight   — the actual sky from this evening's sunset to tomorrow's
                 sunrise, which is the most literally day-dependent thing the
                 engine can draw.
     shadow    — the śaṅku's shadow through today, which the siddhānta
                 tradition measures time and direction by. Depends on the day
                 through the Sun's declination and on the place through its
                 latitude, and nothing else in the project shows either.
     moondrift — thirty moonrises from today, drifting later each day by an
                 amount that is itself different each day.
     venusrose — eight years of Śukra's elongation plotted against the season,
                 drawn FORWARD from today, so the rose starts where Śukra
                 actually is this morning.

   WHAT THEY DO NOT READ. None of them touch MO.J, so none are chart-gated.
   None of them read moSpanMs() either: a reel's window is intrinsic — a day, a
   night, a lunation, eight years — and a reel reached by a one-click link must
   not be at the mercy of a span slider left somewhere else. The span control
   stays for the scenes it belongs to.

   ON THE GNOMON. The twelve-aṅgula śaṅku is siddhānta, not BPHS: Parāśara does
   not measure shadows. The scene says so on the frame, because the project's
   whole claim to be worth reading is that it tells you which book a thing is
   from. */

var MO_REELS = [];

/* ---------------------------------------------------------------------------
   Shared ground
   --------------------------------------------------------------------------- */

/* Moon minus Sun, which is the only quantity a tithi is. Monotonic: the Moon
   gains on the Sun at between 11 and 15 degrees a day and never loses, so a
   bisection on it is safe without a guard for a reversal. */
function moElong(ms) {
  var s = moSidAt("Sun", ms), m = moSidAt("Moon", ms);
  if (s == null || m == null) return null;
  return ((m - s) % 360 + 360) % 360;
}
function moTithiIdx(ms) {
  var e = moElong(ms);
  return e == null ? null : Math.floor(e / 12);
}
/* The instant the tithi containing `ms` gives way to the next. Bisected to
   about six seconds, which is finer than any pañcāṅga prints. */
function moTithiEnd(ms) {
  var i = moTithiIdx(ms);
  if (i == null) return null;
  var lo = ms, hi = ms + 20 * 3600000, k;
  for (k = 0; k < 8 && moTithiIdx(hi) === i; k++) hi += 6 * 3600000;
  if (moTithiIdx(hi) === i) return null;
  for (k = 0; k < 22; k++) {
    var mid = (lo + hi) / 2;
    if (moTithiIdx(mid) === i) lo = mid; else hi = mid;
  }
  return hi;
}
/* Sunrise on the day that contains `ms` at this place, found by searching from
   six hours before local midnight. Searching forward from UTC midnight is the
   trap this project has already fallen into once: east of Greenwich in summer
   it lands on the wrong day. */
function moSunriseNear(W, ms) {
  try {
    var local = ms + (W.tz || 0) * 3600000;
    var mid = Math.floor(local / 86400000) * 86400000 - (W.tz || 0) * 3600000;
    return window.__kRiseSet("Sun", W.lat, W.lon, mid - 6 * 3600000, 2, +1);
  } catch (e) { return null; }
}
function moSetAfter(W, ms) {
  try { return window.__kRiseSet("Sun", W.lat, W.lon, ms, 2, -1); } catch (e) { return null; }
}
function moRiseAfter(body, W, ms) {
  try { return window.__kRiseSet(body, W.lat, W.lon, ms, 2, +1); } catch (e) { return null; }
}
/* Local clock, from the place's own offset. hhmm only — a reel is read in
   motion and seconds on it are noise. */
function moHM(ms, tz) {
  if (ms == null) return "—";
  var d = new Date(ms + (tz || 0) * 3600000);
  var h = d.getUTCHours(), m = d.getUTCMinutes();
  return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
}
function moLocalH(ms, tz) {
  if (ms == null) return null;
  var d = new Date(ms + (tz || 0) * 3600000);
  return d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
}
/* The day the reel is about: the viewer's today, rounded down to local midnight
   so that the whole reel is stable for the whole of one day and the cache key
   below changes exactly once per day. */
function moToday(W) {
  var now = Date.now(), local = now + (W.tz || 0) * 3600000;
  return Math.floor(local / 86400000) * 86400000 - (W.tz || 0) * 3600000;
}
function moReelKey(name, W) {
  return name + "|" + W.lat.toFixed(3) + "," + W.lon.toFixed(3) + "|" +
         (W.tz || 0) + "|" + Math.floor(moToday(W) / 86400000);
}
/* A disc lit the way the Moon is lit at this elongation, drawn as the terminator
   ellipse rather than as a clipped circle, because a clipped circle gets the
   crescent's inner edge wrong and everyone can see it. */
function moPhaseDisc(x, y, r, elongDeg, P) {
  var c = MO.ctx;
  var e = ((elongDeg % 360) + 360) % 360;
  c.save();
  c.beginPath(); c.arc(x, y, r, 0, 6.2832);
  c.fillStyle = P.bg2; c.fill();
  c.strokeStyle = P.line; c.lineWidth = 1; c.stroke();
  /* fraction lit, and which limb carries it */
  var k = (1 - Math.cos(e * Math.PI / 180)) / 2;      /* 0 new, 1 full */
  var waxing = e < 180;
  c.beginPath();
  /* the lit region: half a circle plus half an ellipse whose semi-axis is
     r*(2k-1) — negative for a crescent, which flips the ellipse inward */
  var sgn = waxing ? 1 : -1;
  c.arc(x, y, r, -Math.PI / 2, Math.PI / 2, !waxing);
  c.ellipse(x, y, Math.abs(r * (2 * k - 1)), r, 0,
            Math.PI / 2, -Math.PI / 2, (2 * k - 1) * sgn > 0 ? !waxing : waxing);
  c.closePath();
  c.fillStyle = P.ink; c.globalAlpha = 0.92; c.fill(); c.globalAlpha = 1;
  c.restore();
}

/* ---------------------------------------------------------- 1. twotithi ----
   The mechanism, drawn rather than asserted. A tithi is twelve degrees of
   elongation, and twelve degrees takes between about nineteen and about
   twenty-six hours depending on where the Moon is in its own orbit. Sunrise,
   meanwhile, comes once every twenty-four hours almost exactly. Put the two on
   the same axis and everything that confuses people about a pañcāṅga becomes
   obvious: the bands and the lines cannot stay in step, so sometimes a band
   holds two lines and sometimes it holds none.

   The scan ahead is what makes it content rather than a diagram. Naming the
   date of the next adhika and the next kṣaya is a thing no feed posts, is
   checkable against any printed pañcāṅga, and costs one pass of arithmetic. */
MO_REELS.push({
  key: "twotithi", label: "One tithi, two sunrises",
  title: "One tithi, two sunrises",
  sub: "a tithi is 12° of elongation, not a day — so it cannot keep step with sunrise",
  draw: function (p) {
    var P = moPal(), S = moSize(), st = moStage(), c = MO.ctx;
    var U = Math.min(S.w, S.h) / moTypeK();
    var W = moPlace();
    if (!W) { moText(moT("noPlace"), st.cx, st.cy, U * 0.03, P.dim, "center"); return {}; }

    var M = moCached(moReelKey("twotithi", W), function () {
      var t0 = moToday(W);
      var sr0 = moSunriseNear(W, t0);
      if (sr0 == null) return null;
      /* The stage: four days from this morning's sunrise, less half a day of
         lead-in so the band running at sunrise is visible as a band and not as
         an edge. */
      var a = sr0 - 10 * 3600000, b = sr0 + 4 * 86400000 + 2 * 3600000;

      /* every tithi band that touches the stage */
      var bands = [], t = a, guard = 0;
      var i0 = moTithiIdx(a);
      /* walk back to the start of the band containing `a` */
      var s0 = a;
      for (var q = 0; q < 40; q++) {
        var probe = s0 - 3600000;
        if (moTithiIdx(probe) !== i0) { s0 = probe; break; }
        s0 = probe;
      }
      var e0 = moTithiEnd(s0);
      t = (e0 == null) ? a : s0;
      while (t < b && guard++ < 12) {
        var end = moTithiEnd(t);
        if (end == null) break;
        bands.push({ i: moTithiIdx(t), s: t, e: end });
        t = end + 1000;
      }
      /* the sunrises across the stage */
      var rises = [];
      for (var d = -1; d <= 5; d++) {
        var r = moSunriseNear(W, t0 + d * 86400000);
        if (r != null && r >= a - 3600000 && r <= b + 3600000) rises.push(r);
      }
      rises.sort(function (x, y) { return x - y; });
      /* how many sunrises each band holds, which is the whole lesson */
      bands.forEach(function (bd) {
        bd.n = rises.filter(function (r) { return r >= bd.s && r < bd.e; }).length;
      });

      /* The scan ahead. Walked tithi by tithi rather than day by day, because
         the question is about tithis, and 60 days of them is 61 bisections —
         cheap enough to do once and far too expensive to do per frame. */
      var nextAdhika = null, nextKshaya = null;
      var ft = sr0, fr = sr0, fn = 0;
      /* the sunrises over the scan, built once */
      var srAll = [];
      for (var dd = 0; dd <= 62; dd++) {
        var rr = moSunriseNear(W, t0 + dd * 86400000);
        if (rr != null) srAll.push(rr);
      }
      var cur = ft;
      for (var step = 0; step < 66; step++) {
        var ce = moTithiEnd(cur);
        if (ce == null) break;
        var n = srAll.filter(function (r) { return r >= cur && r < ce; }).length;
        if (n >= 2 && nextAdhika == null && ce > sr0)
          nextAdhika = { i: moTithiIdx(cur), s: cur, e: ce };
        if (n === 0 && nextKshaya == null && ce > sr0)
          nextKshaya = { i: moTithiIdx(cur), s: cur, e: ce };
        if (nextAdhika && nextKshaya) break;
        cur = ce + 1000;
      }
      return { a: a, b: b, bands: bands, rises: rises, sr0: sr0,
               adhika: nextAdhika, kshaya: nextKshaya };
    });
    if (!M) { moText(moT("noPlace"), st.cx, st.cy, U * 0.03, P.dim, "center"); return {}; }

    moStars();
    var ms = M.a + (M.b - M.a) * p;

    var x0 = S.w * 0.30, x1 = S.w * 0.95;
    var y0 = st.y + st.h * 0.19, y1 = st.y + st.h * 0.905;
    function Y(t) { return y0 + (y1 - y0) * ((t - M.a) / (M.b - M.a)); }

    /* the bands */
    M.bands.forEach(function (bd) {
      var ya = Math.max(y0, Y(bd.s)), yb = Math.min(y1, Y(bd.e));
      if (yb <= ya) return;
      var odd = bd.i % 2;
      var lit = ms >= bd.s;
      var hot = bd.n !== 1;
      c.fillStyle = hot ? P.gold : (odd ? P.line : P.bg2);
      c.globalAlpha = hot ? (lit ? 0.42 : 0.18) : (lit ? 0.85 : 0.45);
      c.fillRect(x0, ya, x1 - x0, yb - ya);
      c.globalAlpha = 1;
      c.strokeStyle = hot ? P.gold : P.line;
      c.lineWidth = hot ? Math.max(2, U * 0.004) : 1;
      c.strokeRect(x0, ya, x1 - x0, yb - ya);

      var hrs = (bd.e - bd.s) / 3600000;
      if (yb - ya > U * 0.038) {
        var mid = (ya + yb) / 2;
        moText(String((bd.i % 15) + 1), x0 + U * 0.022, mid, U * 0.030,
               hot ? P.gold : P.ink, "center", 700);
        moText(hrs.toFixed(1) + " h", x0 + U * 0.052, mid, U * 0.019, P.dim, "left", 500);
        if (bd.n !== 1)
          moText(bd.n === 0 ? moP("noSunrise") : moP("twoSunrises"),
                 x1 - U * 0.016, mid, U * 0.018, P.gold, "right", 600);
      }
    });

    /* the sunrise lines, which are the fixed thing in the picture */
    M.rises.forEach(function (r) {
      var y = Y(r);
      if (y < y0 - 2 || y > y1 + 2) return;
      c.strokeStyle = P.glow; c.lineWidth = Math.max(2, U * 0.0045);
      c.setLineDash([U * 0.014, U * 0.010]);
      c.beginPath(); c.moveTo(S.w * 0.055, y); c.lineTo(x1, y); c.stroke();
      c.setLineDash([]);
      moGlowDot(S.w * 0.055, y, U * 0.009, P.bg, P.glow);
      var dt = new Date(r + (W.tz || 0) * 3600000);
      moText(moHM(r, W.tz), S.w * 0.075, y - U * 0.013, U * 0.019, P.glow, "left", 600);
      moText(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dt.getUTCDay()] +
             " " + dt.getUTCDate(), S.w * 0.075, y + U * 0.017, U * 0.016, P.dim, "left", 500);
    });

    /* the playhead */
    var yp = Y(ms);
    c.strokeStyle = P.ink; c.globalAlpha = 0.65; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(S.w * 0.04, yp); c.lineTo(x1, yp); c.stroke();
    c.globalAlpha = 1;

    /* the rule, stated once, at the top where it is read first */
    moText(moP("sunriseRule"), st.cx, st.y + st.h * 0.075, U * 0.027, P.ink, "center", 600);
    var cb = null;
    for (var i = 0; i < M.bands.length; i++)
      if (ms >= M.bands[i].s && ms < M.bands[i].e) { cb = M.bands[i]; break; }
    if (cb)
      moText(moP("tithiRuns", (cb.i % 15) + 1, moTithiName(cb.i)) +
             "   ·   " + moP("tithiHours", ((cb.e - cb.s) / 3600000).toFixed(1)),
             st.cx, st.y + st.h * 0.125, U * 0.021, P.dim, "center", 500);

    /* what is coming, which is the part worth posting */
    var fy = st.y + st.h * 0.955;
    var lines = [];
    if (M.adhika) lines.push(moP("adhikaIs") + "  →  " +
      moDateShort(M.adhika.s, W.tz) + ", tithi " + (M.adhika.i + 1));
    if (M.kshaya) lines.push(moP("kshayaIs") + "  →  " +
      moDateShort(M.kshaya.s, W.tz) + ", tithi " + (M.kshaya.i + 1));
    lines.slice(0, 2).forEach(function (ln, j) {
      moText(ln, st.cx, fy - (lines.length - 1 - j) * U * 0.026, U * 0.0185,
             P.gold, "center", 500);
    });
    return { ms: ms };
  }
});

/* a short date in the place's own offset, for annotations that name a day */
function moDateShort(ms, tz) {
  var d = new Date(ms + (tz || 0) * 3600000);
  var MN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return d.getUTCDate() + " " + MN[d.getUTCMonth()] + " " + d.getUTCFullYear();
}
function hiT() { try { return moLangHi(); } catch (e) { return false; } }
/* A tithi named as a pañcāṅga names it. The 1–30 index is how the arithmetic
   runs, but nobody reads "tithi 17" — they read Kṛṣṇa Dvitīyā, and a reel that
   prints the index teaches the reader a numbering no almanac uses. */
function moTithiName(i) {
  var nm = (hiT() ? NP_TITHI_HI : NP_TITHI_EN)[i] || "";
  if (i === 14 || i === 29) return nm;              /* Pūrṇimā and Amāvāsyā stand alone */
  return (hiT() ? (i < 15 ? "शुक्ल " : "कृष्ण ") : (i < 15 ? "Śukla " : "Kṛṣṇa ")) + nm;
}
var NP_TITHI_EN = ["Pratipadā", "Dvitīyā", "Tṛtīyā", "Caturthī", "Pañcamī", "Ṣaṣṭhī",
  "Saptamī", "Aṣṭamī", "Navamī", "Daśamī", "Ekādaśī", "Dvādaśī", "Trayodaśī",
  "Caturdaśī", "Pūrṇimā", "Pratipadā", "Dvitīyā", "Tṛtīyā", "Caturthī", "Pañcamī",
  "Ṣaṣṭhī", "Saptamī", "Aṣṭamī", "Navamī", "Daśamī", "Ekādaśī", "Dvādaśī",
  "Trayodaśī", "Caturdaśī", "Amāvāsyā"];
var NP_TITHI_HI = ["प्रतिपदा", "द्वितीया", "तृतीया", "चतुर्थी", "पञ्चमी", "षष्ठी",
  "सप्तमी", "अष्टमी", "नवमी", "दशमी", "एकादशी", "द्वादशी", "त्रयोदशी",
  "चतुर्दशी", "पूर्णिमा", "प्रतिपदा", "द्वितीया", "तृतीया", "चतुर्थी", "पञ्चमी",
  "षष्ठी", "सप्तमी", "अष्टमी", "नवमी", "दशमी", "एकादशी", "द्वादशी",
  "त्रयोदशी", "चतुर्दशी", "अमावस्या"];

/* ----------------------------------------------------------- 2. tonight ----
   An all-sky plot, zenith at the centre and the horizon at the rim, looking up.
   East is on the LEFT, which is correct for a map of the sky held overhead and
   is the first thing anyone objects to; the compass letters are drawn so the
   objection answers itself.

   The whole night's track for every graha is computed once and the playhead
   only reveals more of it. Nine bodies at ninety steps is eight hundred engine
   calls, which is nothing once and impossible sixty times a second. */
MO_REELS.push({
  key: "tonight", label: "The sky tonight",
  title: "The sky tonight",
  sub: "from this evening's sunset to tomorrow's sunrise, at your own place",
  draw: function (p) {
    var P = moPal(), S = moSize(), st = moStage(), c = MO.ctx;
    var U = Math.min(S.w, S.h) / moTypeK();
    var W = moPlace();
    if (!W) { moText(moT("noPlace"), st.cx, st.cy, U * 0.03, P.dim, "center"); return {}; }

    var M = moCached(moReelKey("tonight", W), function () {
      var t0 = moToday(W);
      var noon = t0 + 12 * 3600000;
      var ss = moSetAfter(W, noon);
      var sr = (ss == null) ? null : moRiseAfter("Sun", W, ss);
      var polar = false;
      if (ss == null || sr == null || sr - ss < 3600000) {
        /* no sunset, or no sunrise after it: a polar day or night. The reel
           still has something true to show, but it must say what it did. */
        polar = true;
        ss = t0 + 18 * 3600000 - (W.tz || 0) * 3600000;
        sr = ss + 12 * 3600000;
      }
      var N = 96, rows = [];
      var names = MO_NAMES.slice();
      for (var k = 0; k <= N; k++) {
        var ms = ss + (sr - ss) * (k / N);
        var jd = ms / 86400000 + 2440587.5;
        var ayan = 23.9;
        try { if (window.__ayanFor) ayan = window.__ayanFor("lahiri", jd); } catch (e) {}
        var lst = moLST(jd, W.lon);
        var at = { ms: ms, q: {} };
        for (var n = 0; n < names.length; n++) {
          var lon = moSidAt(names[n], ms);
          if (lon == null) continue;
          at.q[names[n]] = moAltAz(lon, ayan, lst, W.lat);
        }
        var sl = moSidAt("Sun", ms), ml = moSidAt("Moon", ms);
        at.elong = (sl == null || ml == null) ? null : ((ml - sl) % 360 + 360) % 360;
        rows.push(at);
      }
      return { ss: ss, sr: sr, rows: rows, polar: polar, N: N };
    });
    if (!M) { moText(moT("noPlace"), st.cx, st.cy, U * 0.03, P.dim, "center"); return {}; }

    moStars();
    /* The rim carries the compass letters just outside it, so the dome sits
       low enough that N clears the sunset/sunrise line above it — at the first
       sizing the two overlapped and the arrow between the times read as part
       of the letter. */
    var R = Math.min(S.w * 0.405, st.h * 0.330);
    var cx = st.cx, cy = st.y + st.h * 0.505;
    /* looking up: N at the top, E to the left, altitude inward */
    /* Looking UP, so north is at the top and east is on the LEFT — the
       orientation of a planisphere held overhead, and the one everybody
       objects to until they hold it overhead. Azimuth runs N→E→S→W, so east
       must go to negative x; getting that sign wrong put north at the foot of
       the frame and the objection became correct. */
    function sky(az, alt) {
      var rr = R * (90 - Math.max(-6, Math.min(90, alt))) / 90;
      var a = az * Math.PI / 180;
      return [cx - rr * Math.sin(a), cy - rr * Math.cos(a)];
    }

    /* the almucantars and the rim */
    c.strokeStyle = P.line; c.lineWidth = 1;
    [30, 60].forEach(function (a) {
      c.beginPath(); c.arc(cx, cy, R * (90 - a) / 90, 0, 6.2832); c.stroke();
    });
    c.lineWidth = Math.max(2, U * 0.004); c.strokeStyle = P.dim;
    c.beginPath(); c.arc(cx, cy, R, 0, 6.2832); c.stroke();
    [["N", 0], ["E", 90], ["S", 180], ["W", 270]].forEach(function (d) {
      var q = sky(d[1], -6);
      moText(d[0], q[0], q[1], U * 0.022, P.dim, "center", 700);
    });

    var idx = Math.min(M.N, Math.round(M.N * p));
    var at = M.rows[idx];
    var ms = at.ms;

    /* each graha's track so far, then the graha at the head of it */
    var shown = [];
    MO_NAMES.forEach(function (en) {
      if (MO.show && MO.show[en] === false) return;
      c.beginPath(); var first = true, any = false;
      for (var k = 0; k <= idx; k++) {
        var A = M.rows[k].q[en]; if (!A) continue;
        if (A.alt < -6) { first = true; continue; }
        var q = sky(A.az, A.alt);
        if (first) { c.moveTo(q[0], q[1]); first = false; } else c.lineTo(q[0], q[1]);
        any = true;
      }
      if (any) {
        c.strokeStyle = (en === "Rahu" || en === "Ketu") ? P.dim
                      : (MO_BEN[en] ? P.benefic : P.malefic);
        c.globalAlpha = 0.5; c.lineWidth = Math.max(1.5, U * 0.0032);
        c.stroke(); c.globalAlpha = 1;
      }
      var A2 = at.q[en];
      if (!A2 || A2.alt < 0) return;
      var qq = sky(A2.az, A2.alt);
      if (en === "Moon" && at.elong != null) {
        moPhaseDisc(qq[0], qq[1], U * 0.028, at.elong, P);
        moText("چ", 0, -9999, 1, P.ink);          /* no-op, keeps fonts warm */
      } else {
        moGlyph(qq[0], qq[1], U * 0.021, en, P);
      }
      shown.push(en);
    });

    /* the readings */
    moText(moP("nightFrom", moHM(M.ss, W.tz), moHM(M.sr, W.tz)),
           st.cx, st.y + st.h * 0.072, U * 0.024, P.dim, "center", 500);
    moText(moHM(ms, W.tz), st.cx, st.y + st.h * 0.128, U * 0.050, P.ink, "center", 700);
    moText(shown.length ? moP("aboveNow", shown.length) : moP("noneAbove"),
           st.cx, st.y + st.h * 0.885, U * 0.022, P.gold, "center", 600);
    if (shown.length)
      moText(shown.map(function (e) { return moG(e); }).join("   "),
             st.cx, st.y + st.h * 0.935, U * 0.028, P.ink, "center", 600);
    if (M.polar)
      moText(moT("noPlace") === "" ? "" : "—", st.cx, st.y + st.h * 0.975,
             U * 0.016, P.dim, "center", 500);
    return { ms: ms };
  }
});

/* ------------------------------------------------------------ 3. shadow ----
   The śaṅku and its chāyā: a stick of twelve aṅgulas, and the shadow it throws
   from sunrise to sunset. Seen from above, the tip traces a curve — a hyperbola
   on every day but the equinoxes, when it is a straight line — and the shortest
   shadow of the day points true north (in the northern hemisphere) and gives
   local noon exactly.

   Two numbers on this frame are worth a post on their own. The shortest shadow
   today depends on the Sun's declination, so it is different every day. And the
   akṣabhā — the shortest shadow on an equinox, 12·tan(latitude) — is a number
   you can measure with a stick and a string and from which the latitude falls
   out. That is how it was done, and it is checkable this afternoon.

   NOT BPHS. Parāśara measures no shadows; this is the siddhānta and
   jyotiṣa-vedāṅga side of the tradition, and the frame says so. */
MO_REELS.push({
  key: "shadow", label: "The shadow stick",
  title: "A stick, and the time of day",
  sub: "the twelve-aṅgula śaṅku and its chāyā, from sunrise to sunset",
  draw: function (p) {
    var P = moPal(), S = moSize(), st = moStage(), c = MO.ctx;
    var U = Math.min(S.w, S.h) / moTypeK();
    var W = moPlace();
    if (!W) { moText(moT("noPlace"), st.cx, st.cy, U * 0.03, P.dim, "center"); return {}; }

    var MAXL = 48;                       /* aṅgulas; beyond this the shadow runs
                                            off any courtyard and off this frame */
    var M = moCached(moReelKey("shadow", W), function () {
      var t0 = moToday(W);
      var sr = moSunriseNear(W, t0);
      var ss = (sr == null) ? null : moSetAfter(W, sr);
      if (sr == null || ss == null || ss <= sr) return null;
      var N = 160, rows = [], best = null;
      for (var k = 0; k <= N; k++) {
        var ms = sr + (ss - sr) * (k / N);
        var jd = ms / 86400000 + 2440587.5;
        var ayan = 23.9;
        try { if (window.__ayanFor) ayan = window.__ayanFor("lahiri", jd); } catch (e) {}
        var lon = moSidAt("Sun", ms);
        if (lon == null) continue;
        var A = moAltAz(lon, ayan, moLST(jd, W.lon), W.lat);
        var L = A.alt > 0.35 ? 12 / Math.tan(A.alt * Math.PI / 180) : null;
        var row = { ms: ms, alt: A.alt, az: A.az, L: L };
        rows.push(row);
        if (L != null && (best == null || L < best.L)) best = row;
      }
      return { sr: sr, ss: ss, rows: rows, best: best, N: rows.length - 1,
               aksha: 12 * Math.tan(W.lat * Math.PI / 180) };
    });
    if (!M) { moText(moT("noPlace"), st.cx, st.cy, U * 0.03, P.dim, "center"); return {}; }

    moStars();
    var R = Math.min(S.w * 0.40, st.h * 0.325);
    var cx = st.cx, cy = st.y + st.h * 0.515;
    /* looking down on the ground: north up, east right, as a plan is drawn */
    function gnd(lenAng, azDeg) {
      var r = R * Math.min(1, lenAng / MAXL);
      var th = (azDeg + 180) * Math.PI / 180;        /* shadow opposes the Sun */
      return [cx + r * Math.sin(th), cy - r * Math.cos(th)];
    }

    /* the ground rings, in aṅgulas, because the unit is the point */
    c.strokeStyle = P.line; c.lineWidth = 1;
    [12, 24, 36, 48].forEach(function (a) {
      c.beginPath(); c.arc(cx, cy, R * a / MAXL, 0, 6.2832); c.stroke();
      /* on the north-east diagonal, not on the east axis, where they sat on
         top of the compass letter and under the afternoon shadow */
      var rr = R * a / MAXL * 0.7071;
      moText(String(a), cx + rr + U * 0.009, cy - rr - U * 0.006,
             U * 0.015, P.dim, "left", 500);
    });
    c.strokeStyle = P.line;
    c.beginPath(); c.moveTo(cx - R, cy); c.lineTo(cx + R, cy);
    c.moveTo(cx, cy - R); c.lineTo(cx, cy + R); c.stroke();
    [["N", 0, -1], ["E", 1, 0], ["S", 0, 1], ["W", -1, 0]].forEach(function (d) {
      moText(d[0], cx + d[1] * (R + U * 0.030), cy + d[2] * (R + U * 0.030),
             U * 0.021, P.dim, "center", 700);
    });

    var idx = Math.min(M.N, Math.round(M.N * p));
    var at = M.rows[idx];

    /* the day's curve, traced to here */
    c.beginPath(); var first = true;
    for (var k = 0; k <= idx; k++) {
      var r = M.rows[k]; if (r.L == null) { first = true; continue; }
      var q = gnd(r.L, r.az);
      if (first) { c.moveTo(q[0], q[1]); first = false; } else c.lineTo(q[0], q[1]);
    }
    c.strokeStyle = P.gold; c.lineWidth = Math.max(2, U * 0.005);
    c.globalAlpha = 0.75; c.stroke(); c.globalAlpha = 1;

    /* the shortest shadow, and the north line it defines */
    if (M.best) {
      var qb = gnd(M.best.L, M.best.az);
      c.setLineDash([U * 0.012, U * 0.010]);
      c.strokeStyle = P.glow; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(cx, cy); c.lineTo(qb[0], qb[1]); c.stroke();
      c.setLineDash([]);
      moGlowDot(qb[0], qb[1], U * 0.008, P.glow, P.glow);
    }

    /* the shadow now */
    if (at.L != null) {
      var qa = gnd(at.L, at.az);
      c.strokeStyle = P.ink; c.lineWidth = Math.max(3, U * 0.009);
      c.lineCap = "round";
      c.beginPath(); c.moveTo(cx, cy); c.lineTo(qa[0], qa[1]); c.stroke();
      c.lineCap = "butt";
      moGlowDot(qa[0], qa[1], U * 0.011, P.ink, P.ink);
    }
    /* The stick itself, seen end-on. Filled with its own colour: moGlowDot's
       first colour is the DISC and the second only the halo, so passing the
       background as the fill — which is right for a glyph that then draws a
       ring and a letter over it — leaves a plain marker as a hole. */
    moGlowDot(cx, cy, U * 0.013, P.gold, P.gold);

    moText(moP("gnomonIs"), st.cx, st.y + st.h * 0.070, U * 0.024, P.dim, "center", 500);
    moText(moHM(at.ms, W.tz) + "   ·   " +
           (at.L == null ? moP("sunDown")
                         : moP("shadowNow", at.L > MAXL ? ">" + MAXL : at.L.toFixed(1))),
           st.cx, st.y + st.h * 0.124, U * 0.030, P.ink, "center", 700);
    if (M.best)
      moText(moP("shadowNoon", M.best.L.toFixed(1)) + "   at   " + moHM(M.best.ms, W.tz),
             st.cx, st.y + st.h * 0.885, U * 0.021, P.gold, "center", 600);
    moText(moP("akshabha", M.aksha.toFixed(1)), st.cx, st.y + st.h * 0.928,
           U * 0.020, P.ink, "center", 500);
    moText(moP("siddhantaNot"), st.cx, st.y + st.h * 0.968, U * 0.0165,
           P.dim, "center", 500);
    return { ms: at.ms };
  }
});

/* --------------------------------------------------------- 4. moondrift ----
   Thirty moonrises from today, each drawn at its own clock time with the Moon's
   own phase on it. The drift is the content: the Moon rises later every day
   because it has moved east against the stars, and the amount is not a constant
   — it swings between about twenty minutes and about eighty depending on how
   the Moon's path meets the horizon at this latitude. The near-horizontal run
   of a few rows is the thing farmers called a harvest moon, and it is visible
   here as a shape rather than claimed as a fact. */
MO_REELS.push({
  key: "moondrift", label: "Moonrise drift",
  title: "Why the Moon is late every day",
  sub: "thirty moonrises from today — and the drift is not the same each day",
  draw: function (p) {
    var P = moPal(), S = moSize(), st = moStage(), c = MO.ctx;
    var U = Math.min(S.w, S.h) / moTypeK();
    var W = moPlace();
    if (!W) { moText(moT("noPlace"), st.cx, st.cy, U * 0.03, P.dim, "center"); return {}; }
    var DAYS = 30;

    var M = moCached(moReelKey("moondrift", W), function () {
      var t0 = moToday(W);
      var rows = [], prev = null, prevD = null;
      for (var d = 0; d < DAYS; d++) {
        /* moToday already returns local midnight AS a UTC instant, so it has
           had the offset taken off once. Taking it off again here moved every
           search back five and a half hours at Delhi and pulled the previous
           day's moonrise into this row — the drift still looked right, and the
           dates beside it were all one out. */
        var from = t0 + d * 86400000;
        var r = moRiseAfter("Moon", W, from);
        /* no moonrise inside this local day: the Moon skips one every month */
        if (r != null && r - from > 24 * 3600000) r = null;
        var el = (r == null) ? null : moElong(r);
        /* The drift is the LAG, not the gap. Two consecutive moonrises are a
           day and roughly fifty minutes apart, so the gap itself is about
           1490 minutes; what anyone means by "later than yesterday" is what is
           left after the day is taken out. Subtracting a whole day per row
           skipped keeps the figure honest across the one day a month on which
           the Moon does not rise at all. */
        var dr = null;
        if (r != null && prev != null)
          dr = (r - prev) / 60000 - 1440 * (d - prevD);
        rows.push({ d: d, ms: r, elong: el, drift: dr,
                    h: moLocalH(r, W.tz), day: t0 + d * 86400000 });
        if (r != null) { prev = r; prevD = d; }
      }
      var ds = rows.map(function (r) { return r.drift; })
                   .filter(function (v) { return v != null && v > 0 && v < 150; });
      var avg = ds.length ? ds.reduce(function (a, b) { return a + b; }, 0) / ds.length : null;
      return { rows: rows, avg: avg };
    });

    moStars();
    var x0 = S.w * 0.20, x1 = S.w * 0.94;
    var y0 = st.y + st.h * 0.205, y1 = st.y + st.h * 0.895;
    function X(h) { return x0 + (x1 - x0) * (h / 24); }
    function Y(d) { return y0 + (y1 - y0) * (d / (DAYS - 1)); }

    /* the hour grid, which is the fixed frame the drift is measured against */
    c.strokeStyle = P.line; c.lineWidth = 1;
    for (var h = 0; h <= 24; h += 6) {
      c.beginPath(); c.moveTo(X(h), y0 - U * 0.012); c.lineTo(X(h), y1 + U * 0.012); c.stroke();
      moText((h < 10 ? "0" : "") + h + ":00", X(h), y0 - U * 0.030,
             U * 0.0165, P.dim, "center", 500);
    }

    var idx = Math.min(DAYS - 1, Math.floor(DAYS * p));

    /* the thread between consecutive rises, broken where it wraps past midnight
       so the line does not shoot back across the frame and read as a fall */
    c.beginPath(); var first = true;
    for (var k = 0; k <= idx; k++) {
      var r = M.rows[k];
      if (r.h == null) { first = true; continue; }
      if (!first && M.rows[k - 1] && M.rows[k - 1].h != null &&
          r.h < M.rows[k - 1].h) first = true;      /* wrapped */
      var q = [X(r.h), Y(r.d)];
      if (first) { c.moveTo(q[0], q[1]); first = false; } else c.lineTo(q[0], q[1]);
    }
    c.strokeStyle = P.gold; c.globalAlpha = 0.55;
    c.lineWidth = Math.max(2, U * 0.0045); c.stroke(); c.globalAlpha = 1;

    /* the moons */
    for (var j = 0; j <= idx; j++) {
      var rr = M.rows[j];
      var yy = Y(rr.d);
      moText(moDateShort(rr.day, W.tz).replace(/ \d{4}$/, ""),
             x0 - U * 0.020, yy, U * 0.0155, P.dim, "right", 500);
      if (rr.h == null) {
        moText(moP("noMoonrise"), X(12), yy, U * 0.015, P.dim, "center", 500);
        continue;
      }
      moPhaseDisc(X(rr.h), yy, U * 0.0135, rr.elong == null ? 180 : rr.elong, P);
    }

    /* today's reading, and the one number that makes the point */
    var cur = M.rows[idx];
    moText(moP("dayNOf", idx + 1, DAYS), st.cx, st.y + st.h * 0.072,
           U * 0.020, P.dim, "center", 500);
    moText(cur.ms == null ? moP("noMoonrise") : moP("moonRiseOn", moHM(cur.ms, W.tz)),
           st.cx, st.y + st.h * 0.124, U * 0.032, P.ink, "center", 700);
    if (cur.drift != null && cur.drift > 0 && cur.drift < 150)
      moText(moP("driftIs", Math.round(cur.drift)), st.cx, st.y + st.h * 0.930,
             U * 0.024, P.gold, "center", 600);
    if (M.avg != null)
      moText(moP("driftAvg", Math.round(M.avg)), st.cx, st.y + st.h * 0.972,
             U * 0.0185, P.dim, "center", 500);
    return { ms: cur.ms == null ? cur.day : cur.ms };
  }
});

/* --------------------------------------------------------- 5. venusrose ----
   Śukra's elongation from the Sun, plotted against the Sun's own longitude, for
   eight years forward from today. Five synodic returns of Venus come to within
   a couple of days of eight years, so the curve closes on itself after five
   petals and the near-miss is visible as the small gap where it fails to close.

   The two colours are the two Venuses everyone has met without knowing they are
   the same object: west of the Sun it rises first and is the morning star, east
   of it it sets last and is the evening star. The dashed ring at ten degrees is
   the orb the project uses for Śukra's astaṅgata elsewhere, and inside it Venus
   is simply not visible, whatever the chart says about it. */
MO_REELS.push({
  key: "venusrose", label: "The Venus rose",
  title: "Śukra draws a five-petalled rose",
  sub: "eight years of elongation against the season — five returns, and it nearly closes",
  draw: function (p) {
    var P = moPal(), S = moSize(), st = moStage(), c = MO.ctx;
    var U = Math.min(S.w, S.h) / moTypeK();
    var W = moPlace() || { lat: 0, lon: 0, tz: 0 };
    var ORB = 10;                        /* Śukra's combustion orb, as used by the
                                            Combustion scene in this same bundle */

    var M = moCached("venusrose|" + Math.floor(Date.now() / 86400000), function () {
      var t0 = Math.floor(Date.now() / 86400000) * 86400000;
      var N = 420, rows = [];            /* 8 years at about a week a step */
      for (var k = 0; k <= N; k++) {
        var ms = t0 + 8 * 365.25 * 86400000 * (k / N);
        var sv = moSidAt("Sun", ms), vv = moSidAt("Venus", ms);
        if (sv == null || vv == null) continue;
        var d = ((vv - sv) % 360 + 360) % 360;
        var east = d < 180;                       /* ahead of the Sun: evening */
        var el = east ? d : 360 - d;
        rows.push({ ms: ms, sun: sv, el: el, east: east });
      }
      return { rows: rows, N: rows.length - 1, t0: t0 };
    });
    if (!M || !M.rows.length) { moText(moT("noPlace"), st.cx, st.cy, U * 0.03, P.dim, "center"); return {}; }

    moStars();
    var MAXE = 48;
    var R = Math.min(S.w * 0.425, st.h * 0.355);
    var cx = st.cx, cy = st.y + st.h * 0.475;
    function pol(el, sunLon) {
      var r = R * Math.min(1, el / MAXE), th = (sunLon - 90) * Math.PI / 180;
      return [cx + r * Math.cos(th), cy + r * Math.sin(th)];
    }

    /* the elongation rings */
    c.strokeStyle = P.line; c.lineWidth = 1;
    [12, 24, 36, 48].forEach(function (a) {
      c.beginPath(); c.arc(cx, cy, R * a / MAXE, 0, 6.2832); c.stroke();
      moText(a + "°", cx + R * a / MAXE + U * 0.011, cy - U * 0.004,
             U * 0.0145, P.dim, "left", 500);
    });
    /* the astaṅgata orb */
    c.setLineDash([U * 0.010, U * 0.009]);
    c.strokeStyle = P.gold; c.lineWidth = 1.5;
    c.beginPath(); c.arc(cx, cy, R * ORB / MAXE, 0, 6.2832); c.stroke();
    c.setLineDash([]);
    /* the Sun at the middle, since every radius is measured from it */
    moGlowDot(cx, cy, U * 0.014, P.bg, P.gold);

    var idx = Math.min(M.N, Math.round(M.N * p));

    /* the rose, drawn in two colours, segment by segment so the morning and
       evening halves of each petal are distinguishable */
    for (var k = 1; k <= idx; k++) {
      var a = M.rows[k - 1], b = M.rows[k];
      if (a.east !== b.east) continue;    /* the crossing at conjunction */
      var qa = pol(a.el, a.sun), qb = pol(b.el, b.sun);
      c.strokeStyle = a.east ? P.malefic : P.benefic;
      c.globalAlpha = 0.30 + 0.55 * (k / Math.max(1, idx));
      c.lineWidth = Math.max(1.6, U * 0.0035);
      c.beginPath(); c.moveTo(qa[0], qa[1]); c.lineTo(qb[0], qb[1]); c.stroke();
    }
    c.globalAlpha = 1;

    var at = M.rows[idx];
    var q = pol(at.el, at.sun);
    var vc = at.east ? P.malefic : P.benefic;
    moGlowDot(q[0], q[1], U * 0.016, vc, vc);
    moText(moG("Venus"), q[0], q[1] + U * 0.005, U * 0.015, P.bg, "center", 700);

    moText(moP("venusPetals"), st.cx, st.y + st.h * 0.070, U * 0.023, P.dim, "center", 500);
    moText(moP("venusElong", at.el.toFixed(1)), st.cx, st.y + st.h * 0.124,
           U * 0.032, P.ink, "center", 700);
    /* no date line here: the caption band prints the date of the instant this
       scene returns, and two dates on one frame invite the reader to find the
       one case where they disagree across a timezone midnight */
    moText(at.el < ORB ? moP("venusAstanga")
                       : (at.east ? moP("venusEvening") : moP("venusMorning")),
           st.cx, st.y + st.h * 0.932, U * 0.022,
           at.el < ORB ? P.gold : (at.east ? P.malefic : P.benefic), "center", 600);
    return { ms: at.ms };
  }
});

MO_SCENES = MO_SCENES.concat(MO_REELS);
/* The five keys, in the order the Reels strip offers them. Exported so the
   Studio can build its links without hardcoding a list that would then drift
   out of step with this file. */
var MO_REEL_KEYS = MO_REELS.map(function (s) { return s.key; });
try { window.__moReelKeys = MO_REEL_KEYS; } catch (e) {}

/* ---------------------------------------------------------------------------
   Doors for the cross-check.

   source/test/reel-verify.mjs checks the numbers these scenes print against
   sources that are not these scenes: the tithi boundaries against panchanga.js,
   the shadow against closed-form trigonometry, the drift against the Moon's own
   synodic lag, and the phase drawing against the pixels it lays down. Each hook
   hands over what was computed rather than re-deriving it, so what is checked is
   what the viewer saw.
   --------------------------------------------------------------------------- */
try {
window.__moTithiIdx = function (ms) { return moTithiIdx(ms); };
window.__moTithiEnd = function (ms) { return moTithiEnd(ms); };
window.__moPhaseProbe = function (ctx, x, y, r, elong) {
  var keep = MO.ctx; MO.ctx = ctx;
  try { moPhaseDisc(x, y, r, elong, moPal()); } finally { MO.ctx = keep; }
};
window.__moShadowFacts = function () {
  var W = moPlace(); if (!W) return null;
  var M = MO_CACHE[moReelKey("shadow", W)]; if (!M) return null;
  /* the Sun's declination at the moment of the shortest shadow, which is what
     the closed form needs and what the scene never prints */
  var jd = M.best.ms / 86400000 + 2440587.5, ayan = 23.9;
  try { if (window.__ayanFor) ayan = window.__ayanFor("lahiri", jd); } catch (e) {}
  var A = moAltAz(moSidAt("Sun", M.best.ms), ayan, moLST(jd, W.lon), W.lat);
  return { shortest: M.best.L, aksha: M.aksha, decAtNoon: A.dec,
           altAtNoon: A.alt, shortestH: moLocalH(M.best.ms, W.tz) };
};
window.__moDriftFacts = function () {
  var W = moPlace(); if (!W) return null;
  var M = MO_CACHE[moReelKey("moondrift", W)]; if (!M) return null;
  var ds = M.rows.map(function (r) { return r.drift; })
                 .filter(function (v) { return v != null && v > 0 && v < 150; });
  var dateOk = M.rows.every(function (r) {
    if (r.ms == null) return true;
    var a = new Date(r.ms + (W.tz || 0) * 3600000);
    var b = new Date(r.day + (W.tz || 0) * 3600000);
    return a.getUTCFullYear() === b.getUTCFullYear() &&
           a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
  });
  return { rows: M.rows.length, avg: M.avg, dateOk: dateOk,
           missing: M.rows.filter(function (r) { return r.ms == null; }).length,
           spread: ds.length ? Math.max.apply(null, ds) - Math.min.apply(null, ds) : 0 };
};
} catch (e) {}

/* ---------------------------------------------------------------------------
   A door for the probe.

   source/test/reel-probe.mjs renders every scene at true export size and counts
   lit pixels — in the whole frame, and separately inside each strip Instagram
   covers with its own furniture. That check cannot be done by looking, because a
   scene that draws nothing and a scene that draws into the covered strip both
   look like a dark canvas, and a scene whose numbers are frozen looks exactly
   like one whose numbers are right.

   It renders through moDraw() rather than calling sc.draw() itself, so what is
   measured is the frame a viewer gets: caption band, safe lift and all. MO is
   saved and restored around it, so probing cannot disturb a pane the reader has
   open in the same page.
   --------------------------------------------------------------------------- */
try {
window.__moProbe = function (cv, key, p, place) {
  var keep = { cv: MO.cv, ctx: MO.ctx, scene: MO.scene, ratio: MO.ratio,
               p: MO.p, safeLayout: MO.safeLayout, guides: MO.guides,
               raw: MO._rawType, studio: MO.studio };
  var W = cv.width, H = cv.height;
  /* A place, because four of the five reels are ABOUT a place and would
     otherwise draw the "no place" notice — which has a constant hash and so
     looks, to a pixel count, exactly like a scene whose numbers never move. */
  if (place) {
    window.__kplace = place.n || "probe";
    window.__kwhereLat = place.lat; window.__kwhereLon = place.lon;
    window.__kwhereTz = place.tz || 0;
    MO_CACHE = {};
  }
  try {
    MO.cv = cv; MO.ctx = cv.getContext("2d");
    MO.scene = key; MO.ratio = (W > H ? "16:9" : (W === H ? "1:1" : "9:16"));
    MO.p = p; MO.safeLayout = true; MO.guides = false;
    moDraw();

    var d = MO.ctx.getImageData(0, 0, W, H).data;
    /* "lit" means visibly above the backdrop. The backdrop is a gradient, so a
       fixed threshold on luminance would count the brighter end of the gradient
       as content; the corner is sampled instead and everything compared to it. */
    var bg = (d[0] + d[1] + d[2]) / 3;
    var bg2 = (d[(H - 1) * W * 4] + d[(H - 1) * W * 4 + 1] + d[(H - 1) * W * 4 + 2]) / 3;
    var base = Math.max(bg, bg2) + 26;
    var bTop = Math.floor(H * (1 - 0.18)), rLeft = Math.floor(W * (1 - 0.13)),
        tBot = Math.floor(H * 0.07);
    var n = 0, nb = 0, nr = 0, nt = 0, tb = 0, tr = 0, tt = 0, hash = 0;
    for (var y = 0; y < H; y += 2) {
      for (var x = 0; x < W; x += 2) {
        var i = (y * W + x) * 4;
        var L = (d[i] + d[i + 1] + d[i + 2]) / 3;
        var on = L > base;
        if (on) { n++; hash = (hash * 31 + x * 7 + y * 13) % 2147483647; }
        if (y >= bTop) { tb++; if (on) nb++; }
        if (x >= rLeft) { tr++; if (on) nr++; }
        if (y < tBot) { tt++; if (on) nt++; }
      }
    }
    var tot = Math.ceil(H / 2) * Math.ceil(W / 2);
    return { lit: n / tot, hash: hash,
             bottom: tb ? nb / tb : 0, right: tr ? nr / tr : 0, top: tt ? nt / tt : 0 };
  } finally {
    MO.cv = keep.cv; MO.ctx = keep.ctx; MO.scene = keep.scene; MO.ratio = keep.ratio;
    MO.p = keep.p; MO.safeLayout = keep.safeLayout; MO.guides = keep.guides;
    MO._rawType = keep.raw; MO.studio = keep.studio;
  }
};
} catch (e) {}
