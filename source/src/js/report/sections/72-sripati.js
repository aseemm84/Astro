/* ===== Śrīpati bhāva-chalita, as a house system rather than a table ======

   WHAT CHANGED AND WHY. The builder already printed a Śrīpati cusp table:
   twelve midpoints, twelve junctions, who sits where. That is enough to
   look at and not enough to USE. A house system is only a house system if
   you can read the whole chart through it — ask which bhāva a graha really
   occupies, which lord really owns the house a graha sits in, and what the
   answer would have been under whole-sign. This file supplies that: one
   object that answers those questions, and the shift report that falls out
   of comparing it with whole-sign.

   WHAT ŚRĪPATI ACTUALLY IS, and what the uploaded edition does and does not
   say about it. The method takes the four angles — lagna, the meridian
   (MC), and their opposites — and trisects each quadrant in longitude, so
   the twelve divisions are unequal whenever the quadrants are. Those
   trisection points are the bhāva MADHYA, the middle of each house, and the
   bhāva SANDHI, the junction where one house ends and the next begins, is
   the midpoint between consecutive madhyas. A graha belongs to the house
   whose madhya it is nearest — equivalently, the house whose sandhis it
   falls between.

   The uploaded Santhanam translation does not give this construction as a
   Parāśara verse, and this file does not claim it does. What it does give,
   and what makes the construction worth having, is the doctrine the cusps
   are FOR:

     * "The planet on the cusp of a house will give full effects due to the
       bhava concerned. The one in Bhava Sandhi (end of house) gives no
       results due to that bhava." The translator flags this as a passage
       the Benares (Chaukhambha) edition carries among its special hints,
       and adds that a planet within 15° past the cusp has its effects for
       that bhāva diminishing, and one before the cusp but within 15° has
       them proportionately increasing. That is a rule about DISTANCE FROM
       THE MADHYA, and it is unusable without a madhya — which is the whole
       argument for computing one. It is implemented below as a strength
       figure, labelled with its edition.

     * Bhāva Bala in Ch. 27 is reckoned by deducting the meridian, the
       nadir, the ascendant or the descendant from the bhāva according to
       which rāśi it falls in — so the text's own strength arithmetic
       presumes an angular, not a whole-sign, frame.

   Whole-sign remains the frame the rest of the builder judges from, which
   is the right default for a Parāśarī reading. This gives the second
   opinion, says exactly where the two differ, and labels every claim. */

(function () {
  "use strict";

  function arc(a, b) { return ((b - a) % 360 + 360) % 360; }

  /* ---- the construction -------------------------------------------------
     Returns null when there is no meridian to work from. That happens at
     extreme latitudes and with incomplete input, and a house system that
     quietly invents a meridian is worse than one that declines. */
  function build(ascSid, mcSid) {
    if (ascSid == null || mcSid == null) return null;
    var mad = new Array(13);
    mad[1] = ascSid;
    mad[10] = mcSid;
    mad[7] = (ascSid + 180) % 360;
    mad[4] = (mcSid + 180) % 360;
    /* MC → Asc gives 11 and 12; Asc → IC gives 2 and 3; the other six are
       the opposites, which is what keeps opposite houses exactly 180°
       apart — a property the trisection would lose if all four quadrants
       were divided independently */
    var q1 = arc(mcSid, ascSid) / 3;
    mad[11] = (mcSid + q1) % 360;
    mad[12] = (mcSid + 2 * q1) % 360;
    var q2 = arc(ascSid, mad[4]) / 3;
    mad[2] = (ascSid + q2) % 360;
    mad[3] = (ascSid + 2 * q2) % 360;
    mad[5] = (mad[11] + 180) % 360;
    mad[6] = (mad[12] + 180) % 360;
    mad[8] = (mad[2] + 180) % 360;
    mad[9] = (mad[3] + 180) % 360;

    var sandhi = new Array(13);
    for (var h = 1; h <= 12; h++) {
      var nxt = mad[h === 12 ? 1 : h + 1];
      sandhi[h] = (mad[h] + arc(mad[h], nxt) / 2) % 360;
    }

    function houseOf(lon) {
      if (lon == null) return null;
      for (var h = 1; h <= 12; h++) {
        var lo = sandhi[h === 1 ? 12 : h - 1], hi = sandhi[h];
        if (arc(lo, lon) < arc(lo, hi)) return h;
      }
      return 1;
    }

    /* the span of a house, and where in it a longitude falls: 0 at the
       opening sandhi, 1 at the closing one, 0.5 on the madhya */
    function place(lon) {
      var h = houseOf(lon);
      if (h == null) return null;
      var lo = sandhi[h === 1 ? 12 : h - 1], hi = sandhi[h];
      var width = arc(lo, hi);
      var into = arc(lo, lon);
      /* signed distance from the madhya, negative before it */
      var d = arc(mad[h], lon);
      if (d > 180) d -= 360;
      return { house: h, width: width, into: into,
               frac: width ? into / width : 0,
               fromMadhya: d, madhya: mad[h],
               sandhiStart: lo, sandhiEnd: hi };
    }

    /* ---- the 15° rule, as the Benares edition states it -----------------
       Full effect on the madhya; nothing at the sandhi; and between them a
       proportion. The text gives 15° as the span over which the effect
       falls away, so a house narrower than 30° reaches its sandhi before
       the 15° is used up — in that case the sandhi wins, because the text
       is explicit that a graha AT the sandhi gives no result for that
       bhāva. The figure is a weight for reading, not a score. */
    function cuspStrength(lon) {
      var p = place(lon);
      if (!p) return null;
      var d = Math.abs(p.fromMadhya);
      var half = Math.min(15, p.width / 2);
      var w = half <= 0 ? 0 : Math.max(0, 1 - d / half);
      return { frac: w, degFromMadhya: p.fromMadhya,
               atSandhi: w <= 0.001, house: p.house };
    }

    return { madhya: mad, sandhi: sandhi, houseOf: houseOf, place: place,
             cuspStrength: cuspStrength, asc: ascSid, mc: mcSid };
  }

  /* ---- reading a whole chart through it ---------------------------------
     The shift report is the point: a list of exactly which grahas the two
     systems disagree about, with how far from the junction each sits, so a
     reader can see whether the disagreement is marginal or wholesale. */
  function analyse(D) {
    var S = build(D && D.lagna && D.lagna.sidereal_deg, D && D.mcSid);
    if (!S) return null;
    var LS = D.LS;
    var rows = [], shifts = [];
    (D.planets || []).forEach(function (p) {
      var pl = S.place(p.sid);
      var cs = S.cuspStrength(p.sid);
      var whole = p.house;
      var row = { body: p.en, lon: p.sid, sign: p.sign, retro: !!p.retro,
                  sripati: pl.house, whole: whole,
                  moved: pl.house !== whole,
                  fromMadhya: pl.fromMadhya,
                  strength: cs ? cs.frac : null,
                  atSandhi: cs ? cs.atSandhi : false,
                  /* which lord owns the house it lands in, under each
                     system — the thing that actually changes a reading */
                  sripatiSign: Math.floor(pl.madhya / 30) % 12,
                  wholeSign: (LS + whole - 1) % 12 };
      rows.push(row);
      if (row.moved) shifts.push(row);
    });

    var houses = [];
    for (var h = 1; h <= 12; h++) {
      var lo = S.sandhi[h === 1 ? 12 : h - 1], hi = S.sandhi[h];
      houses.push({
        house: h, madhya: S.madhya[h], sandhiStart: lo, sandhiEnd: hi,
        width: arc(lo, hi), sign: Math.floor(S.madhya[h] / 30) % 12,
        wholeSign: (LS + h - 1) % 12,
        occupants: rows.filter(function (r) { return r.sripati === h; })
                       .map(function (r) { return r.body; }),
        wholeOccupants: rows.filter(function (r) { return r.whole === h; })
                            .map(function (r) { return r.body; })
      });
    }
    /* a quadrant that is far from 90° is the reason the houses are
       uneven, and saying so turns an odd-looking table into an
       explanation */
    var quads = [arc(S.madhya[10], S.madhya[1]), arc(S.madhya[1], S.madhya[4]),
                 arc(S.madhya[4], S.madhya[7]), arc(S.madhya[7], S.madhya[10])];
    return { S: S, rows: rows, shifts: shifts, houses: houses,
             quadrants: quads,
             widest: Math.max.apply(null, houses.map(function (h) { return h.width; })),
             narrowest: Math.min.apply(null, houses.map(function (h) { return h.width; })) };
  }

  window.SPSripati = { build: build, analyse: analyse };
})();
