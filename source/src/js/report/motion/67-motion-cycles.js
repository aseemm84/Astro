/* ===== Where a recurring event lands, over and over =======================

   THE CONSTRUCTION. Take one event that keeps happening — every pūrṇimā, say.
   For each occurrence, find the point of the nakṣatra ring it happened at.
   Mark the ring there, draw the line from that mark in towards the Earth at
   the centre, and put a point where that line crosses a smaller circle inside.
   Join each inner point to the one before it. Then let it run for twenty years.

   What appears is not decoration. Every one of these events advances around
   the ring by a nearly fixed angle, because the interval between occurrences
   is nearly fixed; so the chords step round the circle at a constant pitch and
   close into a star polygon whenever that pitch is a near-rational part of
   360°. The number of points IS the resonance, drawn.

   WHAT THE SPAN ACTUALLY SHOWS — all measured here, none of it quoted:

     pūrṇimā    advances 29.105° each time, so twelve of them fall 10.8° short
                of a full turn: a twelve-pointed figure that slips backwards a
                little every year. Thirty-seven come within 2.5°, which is
                three years. Two hundred and thirty-five come within 0.14°,
                which is nineteen years — the scene counts that out rather
                than naming it, and nineteen years is where the figure finally
                lies back down on itself.

     amāvāsyā   the same geometry half a month out of step; 235 closes to 0.52°.

     śukra      conjunctions with the Sun advance 287.591°, which is 72.409°
                backwards. Five of them close to 0.156° — in four years. This
                is the pentagram, and it is the tightest closure of any event
                here by a factor of three.

     budha      57.034° per conjunction; nineteen close to 5.2°, just under
                three years.

     guru       33.15°; eleven close to 4.4°, twelve years.

     śani       12.663°; twenty-eight close to 5.4°, twenty-nine years.

     maṅgala    48.333°, and it does NOT close. Nothing within fifteen degrees
                inside forty events. The frame says so, because a scene that
                found a pattern in everything would be worth nothing when it
                found one in something.

     saṅkrānti  exactly twelve a year, exactly. The control: this is what a
                figure looks like when the closure is not approximate, and it
                is the dullest picture here, which is the point.

   HOW THE EVENTS ARE FOUND. No table of periods anywhere. The first two
   occurrences are found by scanning and bisecting; after that the next is
   predicted from the running mean interval and bracketed around the
   prediction, and if the bracket does not contain a crossing it widens until
   it does. So the periods used are the ones this ephemeris produces, and a
   bad prediction costs a few extra evaluations rather than a wrong answer.

   The closure is COUNTED, exactly as the orbit rose counts its petals: the
   scene walks n from 3 upward and reports the first n whose nth event returns
   nearest the first. It is not told what to expect, and when nothing returns
   it says nothing returned. */

var MO_CYC = [];

/* The events on offer. `root` is a function whose sign change marks the event;
   `mark` is the longitude the event is plotted at. For a syzygy that is the
   Moon's place; for a conjunction with the Sun, the Sun's — which is the same
   as the planet's at that instant, and the Sun's is the steadier of the two to
   evaluate. */
function mcNorm(x) { return ((x % 360) + 360) % 360; }
function mcSigned(a, b) { var d = mcNorm(a - b); return d > 180 ? d - 360 : d; }
function mcSid(name, ms) {
  try { return window.__kSidAt(name, new Date(ms)); } catch (e) { return null; }
}

var MC_EVENTS = {
  purnima: {
    key: "purnima", graha: null, step: 0.5 * 86400000,
    root: function (t) {
      var m = mcSid("Moon", t), s = mcSid("Sun", t);
      if (m == null || s == null) return null;
      return mcSigned(mcNorm(m - s), 180);
    },
    mark: function (t) { return mcNorm(mcSid("Moon", t)); }
  },
  amavasya: {
    key: "amavasya", graha: null, step: 0.5 * 86400000,
    root: function (t) {
      var m = mcSid("Moon", t), s = mcSid("Sun", t);
      if (m == null || s == null) return null;
      return mcSigned(mcNorm(m - s), 0);
    },
    mark: function (t) { return mcNorm(mcSid("Sun", t)); }
  },
  sankranti: {
    key: "sankranti", graha: null, step: 86400000, index: true,
    idx: function (t) {
      var s = mcSid("Sun", t);
      return s == null ? null : Math.floor(mcNorm(s) / 30);
    },
    mark: function (t) { return mcNorm(mcSid("Sun", t)); }
  }
};
/* the five tārā grahas, each meeting the Sun */
["Mercury", "Venus", "Mars", "Jupiter", "Saturn"].forEach(function (g) {
  MC_EVENTS[g.toLowerCase()] = {
    key: g.toLowerCase(), graha: g,
    step: (g === "Mars" || g === "Jupiter" || g === "Saturn") ? 2 * 86400000 : 86400000,
    root: function (t) {
      var p = mcSid(g, t), s = mcSid("Sun", t);
      if (p == null || s == null) return null;
      return mcSigned(mcNorm(p - s), 0);
    },
    mark: function (t) { return mcNorm(mcSid("Sun", t)); }
  };
});

/* One root of `f` inside [lo,hi], assuming the sign changes there. */
function mcBisect(f, lo, hi) {
  var a = f(lo);
  if (a == null) return null;
  var up = a < 0;
  for (var k = 0; k < 40; k++) {
    var m = (lo + hi) / 2, v = f(m);
    if (v == null) return null;
    if ((v < 0) === up) lo = m; else hi = m;
  }
  return (lo + hi) / 2;
}

/* Every occurrence between t0 and t1.

   Scanning the whole span at the step a syzygy needs would cost fourteen
   thousand ephemeris evaluations for nineteen years, so only the first two are
   scanned for. After that the interval is known to about a percent and the
   next event is bracketed around the prediction — which is both faster and
   self-checking, since a bracket with no sign change in it widens rather than
   silently returning the wrong root. */
function mcFind(E, t0, t1, cap) {
  var out = [], t, prev, cur;
  if (E.index) {
    /* an event marked by an index changing rather than a quantity crossing */
    prev = E.idx(t0);
    for (t = t0 + E.step; t <= t1 && out.length < cap; t += E.step) {
      cur = E.idx(t);
      if (cur == null) continue;
      if (prev != null && cur !== prev) {
        var want = cur;
        var lo = t - E.step, hi = t;
        for (var k = 0; k < 40; k++) {
          var m = (lo + hi) / 2;
          if (E.idx(m) === want) hi = m; else lo = m;
        }
        out.push((lo + hi) / 2);
      }
      prev = cur;
    }
    return out;
  }

  /* the first two, by scanning */
  prev = E.root(t0);
  for (t = t0 + E.step; t <= t1 && out.length < 2; t += E.step) {
    cur = E.root(t);
    if (cur == null || prev == null) { prev = cur; continue; }
    if ((prev < 0) !== (cur < 0) && Math.abs(prev) < 90 && Math.abs(cur) < 90) {
      var r = mcBisect(E.root, t - E.step, t);
      if (r != null) out.push(r);
    }
    prev = cur;
  }
  if (out.length < 2) return out;

  /* Thereafter: a LOCAL SCAN that starts near the prediction, not a bracket
     around it.

     The bracket version was wrong for exactly the case it mattered. Śukra's
     conjunctions alternate inferior and superior, and those two gaps are NOT
     equal — the planet sweeps past the Sun quickly at one and crawls at the
     other — so a bracket centred on the running mean straddled the wrong
     place and the search quietly returned every second conjunction. The
     figure still drew, and still closed, and reported ten events where five
     were the answer. Nothing threw.

     Walking forward from a quarter of a gap past the last event, in steps of
     a thirtieth of it, and taking the FIRST sign change cannot skip one. It
     starts close enough that it is only a few evaluations more than the
     bracket, and `gap` is now only a hint for where to start and how big to
     step — if it is wrong the scan simply takes longer. */
  var gap = out[1] - out[0];
  while (out.length < cap) {
    var last = out[out.length - 1];
    var step = Math.max(E.step * 0.5, gap / 30);
    var t2 = last + gap * 0.25;
    var f0 = E.root(t2), found = null;
    for (var guard = 0; guard < 400 && t2 < t1 + gap; guard++) {
      var t3 = t2 + step, f1 = E.root(t3);
      if (f0 != null && f1 != null && (f0 < 0) !== (f1 < 0) &&
          Math.abs(f0) < 90 && Math.abs(f1) < 90) {
        found = mcBisect(E.root, t2, t3);
        break;
      }
      t2 = t3; f0 = f1;
    }
    if (found == null || found > t1) break;
    out.push(found);
    gap = (out[out.length - 1] - out[0]) / (out.length - 1);
  }
  return out;
}

/* Two different questions, and the first version answered only the second.

   THE ARM COUNT is what a viewer can actually count on the picture: how many
   occurrences before the spiral comes back to roughly the same spoke. It is
   the smallest n whose nth event lands within half a step of the first —
   half a step, because closer than that and it is the same arm, further and
   it is the next one along.

   THE TIGHTEST RETURN is the n that comes back nearest anywhere in the span,
   which is the real resonance and is usually a much larger number.

   Reporting only the tightest was misleading in exactly the case that matters
   most: for Śukra it reported ten, because ten conjunctions close to 2.49°
   while five close to 3.70°. Ten is correct — it is five synodic periods and
   eight years, the pentagram — but nobody looking at the frame counts ten.
   They count five points. Both numbers are true and they answer different
   questions, so the frame now gives both and says which is which. */
function mcArms(lons, advance) {
  /* the step as the eye sees it: a 288° advance is a 72° step backwards */
  var eff = Math.min(advance, 360 - advance);
  var tol = eff / 2;
  for (var n = 3; n <= 60 && n < lons.length; n++)
    if (Math.abs(mcSigned(lons[n], lons[0])) < tol)
      return { n: n, err: Math.abs(mcSigned(lons[n], lons[0])), eff: eff };
  return null;
}
function mcClosure(lons, ts, maxN, tol) {
  var best = null;
  for (var n = 3; n <= maxN && n < lons.length; n++) {
    var e = Math.abs(mcSigned(lons[n], lons[0]));
    if (e < tol && (!best || e < best.err))
      best = { n: n, err: e, years: (ts[n] - ts[0]) / 31556952000 };
  }
  return best;
}

/* The title, written out case by case rather than assembled from the key.

   Looking the phrase up by concatenating the event key onto a prefix works,
   reads better, and the build guard rejected it — correctly, and it rejected
   this comment too when the comment spelled the expression out, which is the
   guard being blunt rather than wrong. A key assembled at runtime cannot be
   checked against the language tables, so a typo in one of eight event names
   would ship as a raw key on a frame nobody re-renders. Eight literal calls
   are eight things the guard can verify. */
function mcTitle(which) {
  switch (which) {
    case "amavasya":  return moP("cyc_amavasya");
    case "sankranti": return moP("cyc_sankranti");
    case "mercury":   return moP("cyc_mercury");
    case "venus":     return moP("cyc_venus");
    case "mars":      return moP("cyc_mars");
    case "jupiter":   return moP("cyc_jupiter");
    case "saturn":    return moP("cyc_saturn");
    default:          return moP("cyc_purnima");
  }
}

MO_CYC.push({
  key: "cycles", label: "Where it keeps landing",
  title: "One event, two hundred times",
  sub: "every occurrence marked on the nakṣatra ring and drawn in to the Earth — the figure that appears is the resonance",
  draw: function (p) {
    var P = moPal(), S = moSize(), st = moStage(), c = MO.ctx;
    var U = Math.min(S.w, S.h) / moTypeK();
    var R = Math.PI / 180;
    var which = MO.opt.cycle || "purnima";
    var E = MC_EVENTS[which] || MC_EVENTS.purnima;

    var spanMs = Math.max(2 * 31556952000, Math.min(60 * 31556952000, moSpanMs()));
    var M = moCached("cycles|" + which + "|" + Math.round(spanMs / 86400000) + "|" +
                     moToday(0), function () {
      var t0 = Date.now(), t1 = t0 + spanMs;
      /* a cap on the work, not on the span: a sixty-year span of syzygies is
         seven hundred events, which is more chords than a 1080-pixel frame can
         separate anyway */
      var ts = mcFind(E, t0, t1, 420);
      if (ts.length < 3) return { thin: true, n: ts.length };
      var lons = ts.map(E.mark);
      var adv = [];
      for (var i = 1; i < lons.length; i++) adv.push(mcNorm(lons[i] - lons[i - 1]));
      var meanAdv = adv.reduce(function (a, b) { return a + b; }, 0) / adv.length;
      var meanGap = (ts[ts.length - 1] - ts[0]) / (ts.length - 1) / 86400000;
      return {
        thin: false, ts: ts, lons: lons,
        meanAdv: meanAdv, meanGap: meanGap,
        arms: mcArms(lons, meanAdv),                     /* what the eye counts */
        /* How many times the whole span goes round the ring. Below about two
           there are no arms to count — there is one spiral turn — and calling
           Śani's twenty-eight conjunctions "28 arms" would be describing a
           picture nobody is looking at. The same number is still the right
           number; it just means something else, so it is said differently. */
        turns: (lons.length - 1) * meanAdv / 360,
        tight: mcClosure(lons, ts, lons.length - 1, 15)  /* the real resonance */
      };
    });
    if (!M) { moText(moT("noPlace"), st.cx, st.cy, U * 0.03, P.dim, "center"); return {}; }
    if (M.thin) {
      moText(moP("cycThin", M.n), st.cx, st.cy, U * 0.026, P.dim, "center", 500);
      return {};
    }

    moStars();
    var k = Math.max(1, Math.min(M.ts.length - 1, Math.floor(M.ts.length * p)));

    var cx = st.cx, cy = st.y + st.h * 0.355;
    var rad = Math.min(S.w * 0.385, st.h * 0.285);
    /* the spiral runs from the ring in to 0.26 of it; see mcR below */

    moText(mcTitle(which), cx, st.y + st.h * 0.052, U * 0.034, P.ink, "center", 700);

    /* --- the nakṣatra ring ---------------------------------------------- */
    c.save();
    c.strokeStyle = P.dim; c.globalAlpha = 0.45;
    c.lineWidth = Math.max(1, U * 0.0014);
    for (var n2 = 0; n2 < 27; n2++) {
      var a2 = (n2 * (40 / 3) - 90) * R;
      c.beginPath();
      c.moveTo(cx + Math.cos(a2) * rad, cy + Math.sin(a2) * rad);
      c.lineTo(cx + Math.cos(a2) * rad * 1.085, cy + Math.sin(a2) * rad * 1.085);
      c.stroke();
    }
    c.globalAlpha = 0.28;
    c.beginPath(); c.arc(cx, cy, rad, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(cx, cy, rad * 0.26, 0, Math.PI * 2); c.stroke();
    c.restore();

    /* --- the chords, which are the figure --------------------------------

       EACH EVENT SITS ON A SHORTER ORBIT THAN THE ONE BEFORE.

       The first version put every point on one fixed inner circle. The numbers
       were right and the picture was worthless: consecutive pūrṇimās are only
       29.1° apart, so the chords made short hops round a circle and drew the
       circle. Nothing could be seen because nothing distinguished the twelfth
       occurrence from the first.

       Letting the radius shrink with each occurrence is what separates them.
       The angle still carries WHERE it happened and the radius now carries
       WHEN, so the whole span is one spiral, and the near-resonance appears as
       radial arms where successive turns nearly line up: twelve of them for a
       syzygy, because twelve lunations fall only 10.8° short of a full turn.
       The arms lean backwards by exactly that shortfall, which is the picture
       of the thing the numbers below state.

       It also makes the other events honest rather than uniform. Śani meets
       the Sun only 12.663° further round each time, so thirty years is a
       single near-complete turn and the spiral says so instead of pretending
       to a figure. */
    function mcR(i) {
      var f = M.ts.length > 1 ? i / (M.ts.length - 1) : 0;
      return rad * (1 - 0.74 * f);
    }

    c.save();
    c.globalCompositeOperation = "lighter";
    c.strokeStyle = P.gold;
    c.lineWidth = Math.max(1, U * 0.0021);
    c.globalAlpha = 0.40;
    c.beginPath();
    for (var i2 = 0; i2 <= k; i2++) {
      var ai = (M.lons[i2] - 90) * R, ri = mcR(i2);
      var x = cx + Math.cos(ai) * ri, y = cy + Math.sin(ai) * ri;
      if (i2 === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.stroke();
    c.restore();

    /* The closing unit, drawn over the rest. The frame states that n of these
       bring the ring back round; this is that n, so a viewer can see how much
       of the figure one return actually is instead of counting kinks. */
    if (M.arms && k >= M.arms.n) {
      c.save();
      c.globalCompositeOperation = "lighter";
      c.strokeStyle = P.glow; c.globalAlpha = 0.75;
      c.lineWidth = Math.max(2, U * 0.0034);
      c.beginPath();
      for (var i4 = 0; i4 <= M.arms.n; i4++) {
        var a4 = (M.lons[i4] - 90) * R, r4 = mcR(i4);
        var x4 = cx + Math.cos(a4) * r4, y4 = cy + Math.sin(a4) * r4;
        if (i4 === 0) c.moveTo(x4, y4); else c.lineTo(x4, y4);
      }
      c.stroke();
      c.restore();
    }

    /* --- the ring marks and their spokes ---------------------------------
       Every occurrence keeps its mark out on the nakṣatra ring, with a faint
       line running in to its own point on the spiral — so the ring reads as
       the place and the spiral as the sequence. */
    c.save();
    c.globalCompositeOperation = "lighter";
    for (var i3 = 0; i3 <= k; i3++) {
      var a3 = (M.lons[i3] - 90) * R, r3 = mcR(i3);
      var co = Math.cos(a3), si = Math.sin(a3);
      c.strokeStyle = P.glow; c.globalAlpha = 0.085;
      c.lineWidth = Math.max(1, U * 0.0011);
      c.beginPath();
      c.moveTo(cx + co * rad, cy + si * rad);
      c.lineTo(cx + co * r3, cy + si * r3);
      c.stroke();
      c.fillStyle = P.dim; c.globalAlpha = 0.45;
      c.beginPath();
      c.arc(cx + co * rad, cy + si * rad, Math.max(1, U * 0.0016), 0, Math.PI * 2);
      c.fill();
      c.fillStyle = P.gold; c.globalAlpha = 0.55;
      c.beginPath();
      c.arc(cx + co * r3, cy + si * r3, Math.max(1.2, U * 0.0022), 0, Math.PI * 2);
      c.fill();
    }
    c.restore();

    /* --- the latest one, drawn the whole way in to the Earth ------------- */
    var aL = (M.lons[k] - 90) * R, cL = Math.cos(aL), sL = Math.sin(aL);
    var rL = mcR(k);
    c.save();
    c.strokeStyle = P.gold; c.lineWidth = Math.max(2, U * 0.0030);
    c.globalAlpha = 0.95;
    c.beginPath();
    c.moveTo(cx + cL * rad * 1.085, cy + sL * rad * 1.085);
    c.lineTo(cx, cy);
    c.stroke();
    c.fillStyle = P.gold;
    c.beginPath();
    c.arc(cx + cL * rad, cy + sL * rad, Math.max(3.5, U * 0.0062), 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.arc(cx + cL * rL, cy + sL * rL, Math.max(3, U * 0.0052), 0, Math.PI * 2);
    c.fill();
    c.restore();
    /* the Earth, which every spoke points at */
    c.save();
    c.fillStyle = P.glow; c.globalAlpha = 0.85;
    c.beginPath(); c.arc(cx, cy, Math.max(3, U * 0.0055), 0, Math.PI * 2); c.fill();
    c.restore();
    moText(moP("earthHere"), cx, cy + U * 0.026, U * 0.0145, P.dim, "center", 500);

    /* the nakṣatra the latest one fell in, named out at the rim */
    /* kept clear of the title: at the top of the ring the rim label and the
       headline occupy the same line, and the headline wins */
    var lx = cx + cL * rad * 1.21, ly = cy + sL * rad * 1.21 + U * 0.007;
    var lyMin = st.y + st.h * 0.100;
    if (ly < lyMin) { ly = lyMin; lx = cx + cL * rad * 1.30; }
    moText(moNakName(M.lons[k]), lx, ly, U * 0.0175, P.gold, "center", 700);

    /* --- what the figure is ---------------------------------------------- */
    var by = cy + rad * 1.34;
    moText(moFmtDate(M.ts[k]) + "   ·   " + moP("nthOf", k + 1, M.ts.length),
           cx, by, U * 0.0215, P.ink, "center", 600);
    moText(moP("advEach", M.meanAdv.toFixed(3), M.meanGap.toFixed(2)),
           cx, by + st.h * 0.040, U * 0.0180, P.dim, "center", 500);

    var line, sub;
    if (M.arms) {
      if (M.turns < 2.2) {
        line = moP("lapIs", M.arms.n, M.arms.err.toFixed(1));
        sub = moP("lapWhy");
      } else {
        line = moP("armsAre", M.arms.n, M.arms.err.toFixed(1));
        sub = moP("armsWhy");
      }
    } else {
      line = moP("neverCloses");
      sub = moP("neverClosesWhy");
    }
    moText(line, cx, by + st.h * 0.088, U * 0.0235,
           M.arms ? P.gold : P.dim, "center", 700);
    moText(sub, cx, by + st.h * 0.123, U * 0.0170, P.dim, "center", 500);
    if (M.arms && k >= M.arms.n)
      moText(moP("litIsOne"), cx, by + st.h * 0.063, U * 0.0150, P.glow, "center", 500);

    /* the real resonance, which is nearly always a bigger number than the arm
       count and is the thing worth knowing: nineteen years for a syzygy,
       eight for Śukra */
    /* ...unless it is the same n, which it is for Guru and Śani: for a slow
       graha the first return and the tightest return are one event, and
       printing it twice reads as two findings. */
    if (M.tight && M.tight.err < 6 && !(M.arms && M.tight.n === M.arms.n))
      moText(moP("andReturns", M.tight.n, M.tight.years.toFixed(2),
                 M.tight.err.toFixed(2)),
             cx, by + st.h * 0.159, U * 0.0175, P.glow, "center", 600);
    else if (M.arms && !(M.tight && M.tight.n === M.arms.n))
      /* only worth saying when the figure DID close loosely; after "this one
         does not close" it is the same sentence twice */
      moText(moP("noTightReturn"), cx, by + st.h * 0.159,
             U * 0.0170, P.dim, "center", 500);

    moText(moP("countedNotQuoted"), cx, st.y + st.h * 0.972,
           U * 0.0155, P.dim, "center", 500);
    return { ms: M.ts[k] };
  }
});

/* The events as computed, so the figure's claims can be re-derived from the
   longitudes rather than read off the frame. */
try {
window.__moCycleFacts = function (which, spanYears) {
  var E = MC_EVENTS[which || "purnima"];
  if (!E) return null;
  var t0 = Date.now(), t1 = t0 + (spanYears || 19) * 31556952000;
  var ts = mcFind(E, t0, t1, 420);
  if (ts.length < 3) return null;
  var lons = ts.map(E.mark);
  return { ts: ts, lons: lons,
           arms: mcArms(lons, lons.reduce(function (a, _, i, A) {
             return i ? a + mcNorm(A[i] - A[i - 1]) : 0; }, 0) / (lons.length - 1)),
           tight: mcClosure(lons, ts, lons.length - 1, 15) };
};
window.__moCycleKinds = Object.keys(MC_EVENTS);
} catch (e) {}

MO_SCENES = MO_SCENES.concat(MO_CYC);
try { window.__moCycleKeys = MO_CYC.map(function (s) { return s.key; }); } catch (e) {}
