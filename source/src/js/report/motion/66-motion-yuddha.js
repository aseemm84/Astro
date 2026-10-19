/* ===== Graha Yuddha, through a telescope ==================================

   WHAT THIS SCENE IS FOR. "Defeated in planetary war" appears in the list of
   conditions that void a bhāva's potence, and it appears again in the list of
   planetary states that colour a daśā. It is one of the few BPHS conditions
   that is purely geometric — two planets at the same degree — and so one of
   the few that can be shown rather than asserted. Almost nobody has seen it
   drawn.

   THE SOURCE, AND WHY THERE ARE THREE VERDICTS AND NOT ONE.

   The uploaded Santhanam translation does not speak with one voice here, and
   the honest thing is to show all three positions with their provenance rather
   than pick one and present it as the rule:

     BPHS TEXT. Vol. 2, ch. 79, v. 9 gives the condition and the victor test
     directly: a war when the five tārā grahas are "within one degree of each
     other"; Śukra conquers whether north or south; among the other four, the
     one standing to the NORTH conquers and the one to the south is defeated.
     The luminaries are not in the list. This is a verse, and the scene labels
     it as one.

     TRANSLATOR'S NOTE, Vol. 1, ch. 11. Santhanam reports a different test as
     the one commonly taught — that of two planets on the same degree, the one
     with the LESSER LONGITUDE wins. He gives it as what "we are taught", not
     as Parāśara's words.

     TRANSLATOR'S NOTE, Vol. 1, ch. 11, citing C. G. Rajan. A third test:
     identical longitudes to the minute of arc; both planets must be on the
     SAME side of the ecliptic for a war to exist at all; and then the one of
     HIGHER latitude wins. Santhanam adds that this need not be taken as
     contrary to Parāśara.

   So the frame prints three verdicts side by side, each with its source, and
   where they disagree it says so. They disagree often: about a third of real
   conjunctions have the two planets on opposite sides of the ecliptic, which
   under the Rajan test is not a war at all while under ch. 79 it has a clear
   victor. That disagreement is the most interesting thing on the card, and a
   scene that picked one rule would have hidden it.

   WHAT THE GEOMETRY SHOWS. A narrow field — three degrees of longitude by
   eight of latitude — with the ecliptic drawn across it, so north is up. Both
   planets carry a trail. They converge in longitude, cross, and separate, and
   their latitudes barely change in the day and a half on either side: the
   victory is decided by where each one sits relative to the ecliptic plane,
   which is a fact about the tilt of its orbit and not about the meeting.

   WHAT IT DOES NOT CLAIM. The discs are symbols at a fixed size. Drawing them
   at true angular diameter would need a table of planetary radii, and the rule
   this scene is about does not use the disc at all — it uses latitude. So the
   scene does not imply that the bigger or brighter planet matters, because
   none of the three tests in the uploaded translation says it does. */

var MO_YUD = [];

var MY_GRAHA = ["Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

function myNorm(x) { return ((x % 360) + 360) % 360; }
function mySepAt(a, b, ms) {
  var A = null, B = null;
  try { A = window.__kEclip(a, ms); B = window.__kEclip(b, ms); } catch (e) {}
  if (!A || !B) return null;
  var d = myNorm(A.lon - B.lon);
  return d > 180 ? 360 - d : d;
}

/* The next war from a given instant, searched day by day across the pairs and
   then refined to the closest approach. Returns the pair and the instant, or
   null if none inside the horizon — which the scene then says, rather than
   drawing an event it invented. */
function myNextWar(fromMs, horizonDays) {
  var best = null;
  for (var i = 0; i < MY_GRAHA.length; i++)
    for (var j = i + 1; j < MY_GRAHA.length; j++) {
      var a = MY_GRAHA[i], b = MY_GRAHA[j];
      var step = 86400000, found = null;
      for (var d = 0; d <= horizonDays; d++) {
        var t = fromMs + d * step;
        var s = mySepAt(a, b, t);
        if (s == null) continue;
        if (s < 1.0) { if (!found || s < found.s) found = { t: t, s: s }; }
        else if (found) break;
        if (best && t > best.ms) break;
      }
      if (!found) continue;
      /* refine to the closest approach by ternary search on the bracket */
      var lo = found.t - step, hi = found.t + step;
      for (var k = 0; k < 44; k++) {
        var m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
        var v1 = mySepAt(a, b, m1), v2 = mySepAt(a, b, m2);
        if (v1 == null || v2 == null) break;
        if (v1 < v2) hi = m2; else lo = m1;
      }
      var at = (lo + hi) / 2;
      if (!best || at < best.ms) best = { a: a, b: b, ms: at, sep: mySepAt(a, b, at) };
    }
  return best;
}

/* The three verdicts, each from its own stated authority. Returns the working
   as well as the answer, because a verdict with no visible reason is the thing
   this whole site exists to avoid. */
function myVerdicts(a, b, A, B) {
  var out = [];

  /* 1. BPHS Vol. 2 ch. 79 v. 9 — Śukra always; otherwise the northern one. */
  var v1;
  if (a === "Venus" || b === "Venus")
    v1 = { who: "Venus", why: "Śukra conquers whether north or south" };
  else {
    var n = A.lat > B.lat ? a : b;
    v1 = { who: n, why: (n === a ? a : b) + " stands further north (" +
           (A.lat > B.lat ? A.lat : B.lat).toFixed(2) + "° vs " +
           (A.lat > B.lat ? B.lat : A.lat).toFixed(2) + "°)" };
  }
  out.push({ src: "bphs", cite: "BPHS Vol. 2, ch. 79, v. 9", v: v1 });

  /* 2. the test Santhanam reports as commonly taught: lesser longitude.

        It has a degeneracy the other two do not, and it shows up exactly at
        the moment it is meant to settle: a war IS the two longitudes being
        equal, so at the closest approach there is often nothing left to
        compare. Below a thousandth of a degree the difference is smaller than
        any classical instrument could resolve and smaller than the spread
        between ayanāṃśas, so the scene says the test does not separate them
        rather than reporting the rounding. */
  var dlon = Math.abs(A.lon - B.lon);
  if (dlon < 0.001)
    out.push({ src: "note", cite: "Translator's note, Vol. 1, ch. 11",
               v: { who: null, why: "the longitudes are equal to within " +
                    (dlon * 3600).toFixed(1) + "″ — this test cannot separate them" } });
  else
    out.push({ src: "note", cite: "Translator's note, Vol. 1, ch. 11",
               v: { who: A.lon < B.lon ? a : b, why: "lesser longitude (" +
                    Math.min(A.lon, B.lon).toFixed(4) + "° vs " +
                    Math.max(A.lon, B.lon).toFixed(4) + "°)" } });

  /* 3. C. G. Rajan, as reported in that note: same side required, then the
        higher latitude wins. Opposite sides means no war at all — which is a
        real verdict and is printed as one. */
  var same = (A.lat >= 0) === (B.lat >= 0);
  if (!same)
    out.push({ src: "rajan", cite: "C. G. Rajan, in that note",
               v: { who: null, why: "opposite sides of the ecliptic — " +
                    "on this test there is no war" } });
  else {
    var hi2 = Math.abs(A.lat) > Math.abs(B.lat) ? a : b;
    out.push({ src: "rajan", cite: "C. G. Rajan, in that note",
               v: { who: hi2, why: "same side, higher latitude (" +
                    Math.max(Math.abs(A.lat), Math.abs(B.lat)).toFixed(2) +
                    "° vs " + Math.min(Math.abs(A.lat), Math.abs(B.lat)).toFixed(2) + "°)" } });
  }
  return out;
}

MO_YUD.push({
  key: "yuddha", label: "Graha Yuddha",
  title: "Two grahas at the same degree",
  sub: "a war, by the text — and the three tests in the uploaded translation do not always agree on who wins",
  draw: function (p) {
    var P = moPal(), S = moSize(), st = moStage(), c = MO.ctx;
    var U = Math.min(S.w, S.h) / moTypeK();
    var W = moPlace(), tz = (W && W.tz) || 0;

    var M = moCached("yuddha|" + moToday(tz), function () {
      var E = myNextWar(Date.now(), 420);
      if (!E) return { none: true };
      /* The window is the WAR, not a fixed day and a half.

         A fixed span was wrong at both ends. Mars and Jupiter stay inside one
         degree for about five days, so ±1.6 days opened the reel already at
         war and never showed it begin or end; Mercury and Venus can pass
         through in well under a day, so the same span would have been mostly
         empty sky. Here the edges are found — the instants the separation
         crosses one degree — and the reel runs from a quarter-width before to
         a quarter-width after, so every pair gives the same four beats:
         approach, the degree crossed, the meeting, release. */
      var edge = 0, lim = 12 * 86400000;
      for (var e = 3600000; e < lim; e += 3600000) {
        var sa = mySepAt(E.a, E.b, E.ms - e), sb2 = mySepAt(E.a, E.b, E.ms + e);
        if ((sa != null && sa >= 1.0) || (sb2 != null && sb2 >= 1.0)) { edge = e; break; }
      }
      if (!edge) edge = 2 * 86400000;
      var half = edge * 1.28, N = 120, rows = [];
      for (var i = 0; i <= N; i++) {
        var t = E.ms - half + 2 * half * i / N;
        var A = null, B = null;
        try { A = window.__kEclip(E.a, t); B = window.__kEclip(E.b, t); } catch (e) {}
        if (!A || !B) return { none: true };
        var d = myNorm(B.lon - A.lon); if (d > 180) d -= 360;
        rows.push({ ms: t, aLon: A.lon, aLat: A.lat, bLon: B.lon, bLat: B.lat,
                    mid: A.lon + d / 2 });
      }
      return { none: false, a: E.a, b: E.b, ms: E.ms, sep: E.sep, rows: rows };
    });
    if (!M) { moText(moT("noPlace"), st.cx, st.cy, U * 0.03, P.dim, "center"); return {}; }
    if (M.none) {
      moText(moP("noWarAhead"), st.cx, st.cy, U * 0.028, P.dim, "center", 500);
      return {};
    }

    moStars();
    var k = Math.min(M.rows.length - 1, Math.floor(M.rows.length * p));
    var r = M.rows[k];

    moText(moP("yuddhaHead"), st.cx, st.y + st.h * 0.052, U * 0.034, P.ink, "center", 700);
    moText(moTgraha(M.a) + "  ·  " + moTgraha(M.b) + "   " +
           moFmtDate(M.ms, tz) + "  " + moHM(M.ms, tz),
           st.cx, st.y + st.h * 0.095, U * 0.021, P.gold, "center", 600);

    /* --- the field ------------------------------------------------------- */
    var fx = S.w * 0.10, fw = S.w * 0.80;
    var fy = st.y + st.h * 0.150, fh = st.h * 0.275;
    var LON = 1.8;
    /* the latitude half-width, fitted to this pair. A fixed scale flattened
       the only distance that decides the verdict; a floor keeps a pair that
       really is nearly coplanar from being magnified into a false drama. */
    var LAT = 0;
    for (var li = 0; li < M.rows.length; li++)
      LAT = Math.max(LAT, Math.abs(M.rows[li].aLat), Math.abs(M.rows[li].bLat));
    LAT = Math.max(1.2, LAT * 1.45);
    function X(dlon) { return fx + fw * (0.5 + dlon / (2 * LON)); }
    function Y(lat) { return fy + fh * (0.5 - lat / (2 * LAT)); }

    c.save();
    c.strokeStyle = P.dim; c.globalAlpha = 0.35;
    c.lineWidth = Math.max(1, U * 0.0014);
    c.strokeRect(fx, fy, fw, fh);
    c.globalAlpha = 1;
    /* the ecliptic: latitude zero, which is what north and south are measured
       from and the only reference the victor test uses */
    c.strokeStyle = P.gold; c.globalAlpha = 0.5;
    c.lineWidth = Math.max(1.5, U * 0.0022);
    c.setLineDash([U * 0.012, U * 0.008]);
    c.beginPath(); c.moveTo(fx, Y(0)); c.lineTo(fx + fw, Y(0)); c.stroke();
    c.setLineDash([]); c.globalAlpha = 1;
    c.restore();
    /* at the foot of the box: beside the dashed line it sat under whichever
       planet happened to be near the ecliptic, which is most of them */
    moText(moP("eclipticLine"), fx + U * 0.010, fy + fh - U * 0.016,
           U * 0.0145, P.gold, "left", 500);
    moText("N", fx + U * 0.012, fy + U * 0.026, U * 0.021, P.dim, "left", 700);
    moText("S", fx + U * 0.012, fy + fh - U * 0.010, U * 0.021, P.dim, "left", 700);
    /* the one-degree box, which is the condition itself */
    c.save();
    c.strokeStyle = P.glow; c.globalAlpha = 0.20;
    c.lineWidth = Math.max(1, U * 0.0016);
    c.strokeRect(X(-0.5), fy, X(0.5) - X(-0.5), fh);
    c.restore();
    moText(moP("oneDegreeBox"), X(0), fy + fh + U * 0.028, U * 0.0155,
           P.glow, "center", 500);

    /* --- the trails ------------------------------------------------------ */
    function trail(key, latKey, col) {
      c.save();
      c.strokeStyle = col; c.globalAlpha = 0.70;
      c.lineWidth = Math.max(2, U * 0.0034);
      c.beginPath();
      for (var i = 0; i <= k; i++) {
        var q = M.rows[i];
        var dl = myNorm(q[key] - q.mid); if (dl > 180) dl -= 360;
        var px = X(dl), py = Y(q[latKey]);
        if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.stroke();
      c.restore();
    }
    trail("aLon", "aLat", P.glow);
    trail("bLon", "bLat", P.gold);

    function disc(lon, lat, col, name, up) {
      var dl = myNorm(lon - r.mid); if (dl > 180) dl -= 360;
      var px = X(dl), py = Y(lat), rr = Math.max(5, U * 0.013);
      c.save();
      c.fillStyle = col; c.globalAlpha = 0.95;
      c.beginPath(); c.arc(px, py, rr, 0, Math.PI * 2); c.fill();
      c.restore();
      /* the northern planet is labelled above and the southern below, so two
         planets a tenth of a degree apart in latitude still read as two */
      var s1 = up ? py - rr - U * 0.015 : py + rr + U * 0.020;
      var s2 = up ? py - rr - U * 0.038 : py + rr + U * 0.043;
      moText(moTgraha(name), px, s1, U * 0.019, col, "center", 700);
      moText((lat >= 0 ? "N" : "S") + Math.abs(lat).toFixed(2) + "°",
             px, s2, U * 0.0150, P.dim, "center", 500);
    }
    var aUp = r.aLat >= r.bLat;
    disc(r.aLon, r.aLat, P.glow, M.a, aUp);
    disc(r.bLon, r.bLat, P.gold, M.b, !aUp);

    /* the separation at the playhead, which is the condition being tested */
    var sepNow = myNorm(r.bLon - r.aLon); if (sepNow > 180) sepNow = 360 - sepNow;
    moText(moP("sepNow", sepNow.toFixed(3)) +
           (sepNow < 1.0 ? "   " + moP("warOn") : ""),
           st.cx, fy + fh + U * 0.064,
           U * 0.0195, sepNow < 1.0 ? P.gold : P.dim, "center", 600);

    /* --- the three verdicts, at the playhead ------------------------------

       NOT frozen at the exact conjunction. Freezing them there was unfair to
       one of the three rules and made the reel static: a war is the two
       planets being WITHIN a degree, which lasts hours or days, and a chart is
       cast at some moment inside that window rather than at its midpoint. So
       the tests are applied to the instant under the playhead, exactly as they
       would be applied to a birth moment.

       What that shows, which the frozen version hid: the lesser-longitude test
       gives one answer before the crossing and the opposite answer after it,
       and at the crossing itself it gives none, because the longitudes are
       equal — that is what a war IS. The other two tests hold steady through
       the whole window, because latitude barely changes in a day and a half.
       A rule that reverses halfway through the event it is meant to decide is
       worth seeing reverse. */
    var inWar = sepNow < 1.0;
    var VR = myVerdicts(M.a, M.b,
                        { lon: r.aLon, lat: r.aLat },
                        { lon: r.bLon, lat: r.bLat });
    var vy = fy + fh + st.h * 0.078;
    var TAG = { bphs: moP("tagVerse"), note: moP("tagNote"), rajan: moP("tagNote") };
    var COL = { bphs: P.gold, note: P.dim, rajan: P.dim };
    if (!inWar) {
      moText(moP("notYetWar"), st.cx, vy + st.h * 0.055, U * 0.026,
             P.dim, "center", 500);
    }
    for (var vi = 0; inWar && vi < VR.length; vi++) {
      var V = VR[vi], y = vy + vi * st.h * 0.098;
      moText(TAG[V.src], fx, y, U * 0.0150, COL[V.src], "left", 700);
      moText(V.v.who ? moP("conquers", moTgraha(V.v.who)) : moP("noWarAtAll"),
             fx, y + st.h * 0.030, U * 0.0255,
             V.v.who ? P.ink : P.dim, "left", 700);
      moText(V.v.why, fx, y + st.h * 0.057, U * 0.0160, P.dim, "left", 500);
      moText(V.cite, fx + fw, y + st.h * 0.057, U * 0.0145, P.dim, "right", 500);
    }

    /* --- whether they agree, stated -------------------------------------- */
    var who = VR.map(function (v) { return v.v.who; });
    var agree = who[0] === who[1] && who[1] === who[2];
    if (inWar)
      moText(agree ? moP("testsAgree") : moP("testsDiffer"),
             st.cx, st.y + st.h * 0.862, U * 0.0190,
             agree ? P.glow : P.gold, "center", 600);
    moText(moP("latNotDec"), st.cx, st.y + st.h * 0.903, U * 0.0160, P.dim, "center", 500);
    return { ms: r.ms };
  }
});

/* The war as found, so the verdicts on the frame can be re-derived from the
   longitudes and latitudes rather than trusted. */
try {
window.__moYuddhaFacts = function () {
  var W = moPlace();
  return MO_CACHE["yuddha|" + moToday((W && W.tz) || 0)] || null;
};
window.__moYuddhaNext = myNextWar;
window.__moYuddhaVerdicts = myVerdicts;
} catch (e) {}

MO_SCENES = MO_SCENES.concat(MO_YUD);
try { window.__moYuddhaKeys = MO_YUD.map(function (s) { return s.key; }); } catch (e) {}
