/* ===== The explainer format ==============================================

   Every other reel on this site is a measurement: a question, the
   computation that answers it, and the figure the answer makes. That format
   cannot carry the parts of the subject that are not measurements — what a
   bhāva signifies, what a nakṣatra is named for, what a varga is FOR. Those
   are taught, not computed, and a reel that pretends to compute them would
   be lying about where the content came from.

   So this is a second format with its own honesty. A beat is one sentence
   and one addition to a diagram that persists: the viewer watches a figure
   be built out of its parts rather than watching a finished figure be
   described. Nothing moves that is not an idea arriving.

   It rides the reel machinery rather than duplicating it. An explainer IS a
   story — same timeline, same caption band, same recorder, same export — so
   the clock runs over beats instead of days (and is not drawn, because
   there is no span to report), the caption carries the sentence, and the
   stage is a trail canvas that gains one element per beat. The whole of the
   new code here is the diagrams and the words.

   WHERE THE WORDS COME FROM. Every line of doctrine in this file is carried
   over verbatim from the site pages, which cite their sources; no chapter or
   verse number is invented here, and anything that is a teaching aid rather
   than a text claim says so in its own words. */

(function () {
  "use strict";

  var R2 = Math.PI / 180, TAU = Math.PI * 2;
  function RE() { return window.SPReel; }

  /* ---- the North Indian diamond ------------------------------------------
     Centroids as fractions of the box, house 1 at top centre, counting
     anticlockwise — the convention every printed North Indian chart uses.

     This table is a deliberate copy of the one in sp-compose.js rather than
     a shared import: the two files are loaded by different pages and
     coupling them would drag the whole composer into the reel bundle for
     twelve pairs of numbers. The harness checks the two copies agree. */
  var DIAMOND = [
    [0.50, 0.25], [0.26, 0.11], [0.11, 0.26], [0.25, 0.50], [0.11, 0.74],
    [0.26, 0.89], [0.50, 0.75], [0.74, 0.89], [0.89, 0.74], [0.75, 0.50],
    [0.89, 0.26], [0.74, 0.11]
  ];

  function boxOf(Rc) {
    /* the keyword line is drawn below the box, so the box cannot have the
       whole panel — it was printing over its own bottom edge */
    var s = Math.min(Rc.w * 0.86, Rc.h * 0.80);
    return { x: Rc.x + (Rc.w - s) / 2, y: Rc.y + (Rc.h - s) / 2 - Rc.h * 0.04,
             s: s };
  }
  function cellAt(F, i) {
    return { x: F.x + DIAMOND[i][0] * F.s, y: F.y + DIAMOND[i][1] * F.s };
  }

  function frame(c, G, F, P) {
    var x = F.x, y = F.y, u = F.s;
    c.save();
    c.globalAlpha = P.dark ? 0.5 : 0.75;
    c.strokeStyle = G.rgba(P.line || P.dim, 1);
    c.lineWidth = Math.max(1.4, u * 0.0035);
    c.strokeRect(x, y, u, u);
    c.beginPath();
    c.moveTo(x, y); c.lineTo(x + u, y + u);
    c.moveTo(x + u, y); c.lineTo(x, y + u);
    c.moveTo(x + u / 2, y); c.lineTo(x + u, y + u / 2);
    c.lineTo(x + u / 2, y + u); c.lineTo(x, y + u / 2); c.closePath();
    c.stroke();
    c.restore();
  }

  /* the quadrilateral a house occupies, so a highlight fills the cell the
     eye sees rather than a disc floating inside it */
  var CORNERS = [
    [[0.25, 0.25], [0.50, 0.00], [0.75, 0.25], [0.50, 0.50]],  /* 1  */
    [[0.00, 0.00], [0.50, 0.00], [0.25, 0.25]],                /* 2  */
    [[0.00, 0.00], [0.25, 0.25], [0.00, 0.50]],                /* 3  */
    [[0.00, 0.50], [0.25, 0.25], [0.50, 0.50], [0.25, 0.75]],  /* 4  */
    [[0.00, 0.50], [0.25, 0.75], [0.00, 1.00]],                /* 5  */
    [[0.00, 1.00], [0.25, 0.75], [0.50, 1.00]],                /* 6  */
    [[0.50, 1.00], [0.25, 0.75], [0.50, 0.50], [0.75, 0.75]],  /* 7  */
    [[0.50, 1.00], [0.75, 0.75], [1.00, 1.00]],                /* 8  */
    [[1.00, 1.00], [0.75, 0.75], [1.00, 0.50]],                /* 9  */
    [[1.00, 0.50], [0.75, 0.75], [0.50, 0.50], [0.75, 0.25]],  /* 10 */
    [[1.00, 0.50], [0.75, 0.25], [1.00, 0.00]],                /* 11 */
    [[1.00, 0.00], [0.75, 0.25], [0.50, 0.00]]                 /* 12 */
  ];
  function cellPath(c, F, i) {
    var pts = CORNERS[i];
    c.beginPath();
    for (var k = 0; k < pts.length; k++) {
      var X = F.x + pts[k][0] * F.s, Y = F.y + pts[k][1] * F.s;
      if (k) c.lineTo(X, Y); else c.moveTo(X, Y);
    }
    c.closePath();
  }
  function fillCell(c, G, F, i, col, a) {
    c.save();
    c.globalAlpha = a;
    c.fillStyle = G.rgba(col, 1);
    cellPath(c, F, i);
    c.fill();
    c.restore();
  }
  function outlineCell(c, G, F, i, col, a, w) {
    c.save();
    c.globalAlpha = a;
    c.strokeStyle = G.rgba(col, 1);
    c.lineWidth = w;
    c.lineJoin = "round";
    cellPath(c, F, i);
    c.stroke();
    c.restore();
  }

  function num(c, G, F, i, P, hot, u) {
    var at = cellAt(F, i);
    c.save();
    RE().plain(c);
    c.globalAlpha = hot ? 0.95 : (P.dark ? 0.34 : 0.45);
    c.fillStyle = G.rgba(hot ? P.gold : P.dim, 1);
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.font = (P.banded ? "italic 600 " : "600 ") +
             (u * (hot ? 0.062 : 0.040)).toFixed(1) + "px " + RE().SERIF;
    c.fillText(String(i + 1), at.x, at.y);
    c.restore();
  }

  /* ---- the bhāva stage ----------------------------------------------------
     Seven beats, each adding one thing and never taking anything away. */
  var S_bhava = {
    base: function (c, G, Rc, reel, P) {
      var F = boxOf(Rc);
      frame(c, G, F, P);
    },
    append: function (c, G, Rc, reel, P, from, to) {
      var F = boxOf(Rc), D = reel.explain, h = D.house - 1, i, j;
      for (var b = from; b < to; b++) {
        if (b === 0) {
          for (i = 0; i < 12; i++) num(c, G, F, i, P, false, F.s);
        } else if (b === 1) {
          fillCell(c, G, F, h, P.gold, P.dark ? 0.16 : 0.13);
          outlineCell(c, G, F, h, P.gold, 0.85, Math.max(2, F.s * 0.006));
          num(c, G, F, h, P, true, F.s);
        } else if (b === 3) {
          /* OUTLINED, NOT FILLED. Four of the twelve cells are the big
             central diamonds, so tinting a class that contains them tints
             most of the chart and the focal house stops being the subject.
             A dashed edge says "these go together" without taking the
             picture over. */
          c.save();
          c.setLineDash([F.s * 0.022, F.s * 0.016]);
          for (j = 0; j < D.classHouses.length; j++) {
            var hh = D.classHouses[j] - 1;
            if (hh === h) continue;
            outlineCell(c, G, F, hh, P.accent || P.hot, 0.8,
                        Math.max(1.8, F.s * 0.0042));
          }
          c.restore();
        } else if (b === 6) {
          for (i = 0; i < 12; i++)
            if (i !== h) fillCell(c, G, F, i, P.dim, P.dark ? 0.05 : 0.045);
        }
      }
    },
    live: function (c, G, Rc, reel, P, now, idx, k, p) {
      var F = boxOf(Rc), D = reel.explain, h = D.house - 1;
      var at = cellAt(F, h);
      /* beat 3: the keywords, set beside the chart rather than crammed into
         a cell a fifth of its width */
      if (k >= 3) {
        c.save();
        RE().plain(c);
        c.globalAlpha = P.dark ? 0.8 : 0.9;
        c.fillStyle = G.rgba(P.ink, 1);
        c.textAlign = "center";
        c.font = (P.banded ? "italic " : "") + (F.s * 0.040).toFixed(1) +
                 "px " + RE().SERIF;
        var ls = RE().wrapTo(c, D.keywords, Rc.w * 0.94);
        var y = Math.min(F.y + F.s + F.s * 0.075,
                         Rc.y + Rc.h - F.s * 0.055);
        for (var i = 0; i < Math.min(2, ls.length); i++) {
          c.fillText(ls[i], Rc.x + Rc.w / 2, y); y += F.s * 0.052;
        }
        c.restore();
      }
      /* beat 5: the kāraka, as the body itself — set clear of the house
         number rather than on top of it, since a cell is a sixth of the
         box wide and the two were landing in the same place */
      if (k >= 5 && window.SPBody && window.SPBody.ready()) {
        var pull = { 0: [0, -0.075], 3: [-0.075, 0], 6: [0, 0.075],
                     9: [0.075, 0] };
        var off = pull[h] || [0, -0.070];
        window.SPBody.draw(c, D.karakaBody,
                           at.x + off[0] * F.s, at.y + off[1] * F.s,
                           F.s * 0.038, { phase: 180, halo: P.dark ? 0.25 : 0 });
      }
      /* beat 6: the lord leaves the house carrying its matters */
      if (k >= 6) {
        var ang = -50 * R2, L = F.s * 0.17;
        var ex = at.x + Math.cos(ang) * L, ey = at.y + Math.sin(ang) * L;
        c.save();
        c.globalAlpha = 0.6;
        c.strokeStyle = G.rgba(P.gold, 1);
        c.lineWidth = Math.max(1.4, F.s * 0.004);
        c.lineCap = "round";
        c.beginPath();
        c.moveTo(at.x, at.y); c.lineTo(ex, ey);
        c.moveTo(ex, ey);
        c.lineTo(ex - Math.cos(ang - 0.4) * L * 0.26,
                 ey - Math.sin(ang - 0.4) * L * 0.26);
        c.moveTo(ex, ey);
        c.lineTo(ex - Math.cos(ang + 0.4) * L * 0.26,
                 ey - Math.sin(ang + 0.4) * L * 0.26);
        c.stroke();
        c.restore();
      }
    }
  };

  /* ---- the words ---------------------------------------------------------
     Carried over from the site's own bhāva page, which cites its sources.
     Significations and kārakas: BPHS, Vol. 1 — bhāva significations
     (Ch. 11 onward). Functional classes: BPHS, Vol. 1, Ch. 7, vv. 33–36.
     The lord-travels rule and its strength-scaling: BPHS, Vol. 1, Ch. 24. */
  var BHAVAS = [
    { n: 1, name: "Tanu", lit: "body",
      key: "body, appearance, vitality, temperament, intellect, fame — the whole life",
      karaka: "the Lagna lord, and Sūrya", body: "Sun",
      cls: "Kendra and Trikoṇa at once — the only house that is both" },
    { n: 2, name: "Dhana", lit: "wealth",
      key: "accumulated wealth, family, food, speech, the face — and a māraka house",
      karaka: "Guru", body: "Jupiter",
      cls: "Māraka and Panaphara" },
    { n: 3, name: "Sahaja", lit: "born together",
      key: "courage, younger siblings, the hands, communication, short journeys, effort",
      karaka: "Maṅgala", body: "Mars",
      cls: "Upacaya and Āpoklima" },
    { n: 4, name: "Sukha", lit: "happiness",
      key: "mother, home, land, vehicles, schooling, inner peace, the end of matters",
      karaka: "Candra, and Budha for schooling", body: "Moon",
      cls: "Kendra" },
    { n: 5, name: "Putra", lit: "child",
      key: "children, intelligence, mantra and mind-power, romance, speculation, past merit",
      karaka: "Guru", body: "Jupiter",
      cls: "Trikoṇa" },
    { n: 6, name: "Ripu", lit: "enemy",
      key: "enemies, disease, debts, litigation, service, competition",
      karaka: "Maṅgala and Śani", body: "Mars",
      cls: "Dusthāna and Upacaya — difficult, and yet one that improves with effort" },
    { n: 7, name: "Kalatra", lit: "spouse",
      key: "spouse, marriage, partnership, trade, foreign residence",
      karaka: "Śukra", body: "Venus",
      cls: "Kendra and Māraka" },
    { n: 8, name: "Āyus", lit: "lifespan",
      key: "longevity, upheaval, chronic illness, inheritance and others' money, the hidden",
      karaka: "Śani", body: "Saturn",
      cls: "Dusthāna" },
    { n: 9, name: "Bhāgya", lit: "fortune",
      key: "fortune, dharma, father, guru, higher learning, pilgrimage, long journeys",
      karaka: "Guru, and Sūrya for the father", body: "Jupiter",
      cls: "Trikoṇa" },
    { n: 10, name: "Karma", lit: "action",
      key: "profession, status, authority, action, reputation, government",
      karaka: "Sūrya, Budha, Guru and Śani together", body: "Sun",
      cls: "Kendra and Upacaya" },
    { n: 11, name: "Lābha", lit: "gain",
      key: "gains, income, elder siblings, networks, hopes fulfilled",
      karaka: "Guru", body: "Jupiter",
      cls: "Upacaya and Panaphara" },
    { n: 12, name: "Vyaya", lit: "expense",
      key: "expenditure, loss, foreign lands, seclusion, the feet, liberation",
      karaka: "Śani, and Śukra for the bed", body: "Saturn",
      cls: "Dusthāna and Āpoklima" }
  ];
  var CLASSES = {
    Kendra: [1, 4, 7, 10], "Trikoṇa": [1, 5, 9], "Dusthāna": [6, 8, 12],
    Upacaya: [3, 6, 10, 11], "Māraka": [2, 7],
    Panaphara: [2, 5, 8, 11], "Āpoklima": [3, 6, 9, 12]
  };
  var CLASSWHY = {
    Kendra: "the angles — the load-bearing pillars of a chart, where a graha " +
            "is strong and visible",
    "Trikoṇa": "the trines — dharma and fortune, the most auspicious houses",
    "Dusthāna": "the houses of difficulty — debt and disease, upheaval, loss",
    Upacaya: "the growth houses — their matters improve with time and effort, " +
             "which is why malefics do well in them",
    "Māraka": "the life-supporting houses, used in longevity timing",
    Panaphara: "succedent — a secondary strength gradation",
    "Āpoklima": "cadent — a secondary strength gradation"
  };

  function classesOf(n) {
    var out = [];
    Object.keys(CLASSES).forEach(function (k) {
      if (CLASSES[k].indexOf(n) >= 0) out.push(k);
    });
    return out;
  }
  function housesOfClasses(ks) {
    var seen = {}, out = [];
    ks.forEach(function (k) {
      CLASSES[k].forEach(function (h) { if (!seen[h]) { seen[h] = 1; out.push(h); } });
    });
    return out;
  }

  var ORD = ["first", "second", "third", "fourth", "fifth", "sixth",
             "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth"];

  /* HOW FAR ROUND A BHĀVA BEGINS. A house is not a stretch of sky in its
     own right: it is thirty degrees counted from the Lagna, and under whole
     signs it begins exactly where its sign does. So the arc is drawn
     relative to the Lagna rather than against a fixed longitude, which is
     the one way to show a bhāva's geometry without pretending to a chart
     the viewer has not given. */
  function bhavaStory(B) {
    var ks = classesOf(B.n);
    var why = CLASSWHY[ks[0]];
    var from = (B.n - 1) * 30, to = from + 30;
    var sibs = housesOfClasses(ks);
    /* EACH CLASS HAS ITS OWN GEOMETRY, and lumping them together said
       things that are not true: the tenth is both a kendra and an upacaya,
       and "those houses are ninety degrees apart" is right about the
       kendras and wrong about the upacayas. Each class is described on its
       own terms. */
    var STEP = { "Kendra": ", ninety degrees apart",
                 "Trikoṇa": ", a hundred and twenty degrees apart",
                 "Māraka": "" };
    var classGeom = ks.map(function (kk) {
      return "the " + CLASSES[kk].map(function (h) { return ORD[h - 1]; })
               .join(", the ") + " are " + kk + (STEP[kk] || "");
    }).join("; ");
    var beats = [
      { lab: "THE TWELVE",
        say: "A bhāva is an arena of life, counted from the Lagna. Twelve of " +
             "them cover the whole of experience — and under whole signs each " +
             "is exactly thirty degrees." },
      { lab: B.n + " · " + B.name.toUpperCase(),
        say: "The " + ORD[B.n - 1] + " is " + B.name + " — “" + B.lit +
             "”. It begins " + from + "° from the Lagna and runs to " + to +
             "°." },
      { lab: "WHAT IT CARRIES",
        say: B.key.charAt(0).toUpperCase() + B.key.slice(1) + "." },
      { lab: ks.join(" · ").toUpperCase(),
        say: "By class it is " + B.cls + ": " + why + ". " +
             classGeom.charAt(0).toUpperCase() + classGeom.slice(1) + "." },
      { lab: "KĀRAKA",
        say: "Its chief kāraka — the natural significator of these " +
             "matters — is " + B.karaka + "." },
      { lab: "THE LORD TRAVELS",
        say: "Its lord carries these matters wherever it goes, linking the two " +
             "houses. Except Sūrya and Candra, every graha owns two, so " +
             "the result blends both." },
      { lab: "JUDGED TOGETHER",
        say: "No bhāva is read alone. The lord's condition, the occupants, " +
             "the aspects and the daśā decide what actually arrives." }
    ];
    var ring = [{ beat: 0, type: "split", n: 12 }];
    for (var rh = 1; rh <= 12; rh++)
      ring.push({ beat: 0, type: "wlabel", at: (rh - 1) * 30 + 15, rad: 1.12,
                  label: String(rh), size: 0.052, cool: true });
    ring.push({ beat: 0, type: "wlabel", at: 0, rad: 1.30, label: "Lagna",
                size: 0.058 });
    ring.push({ beat: 1, type: "wedge", from: from, to: to, hot: true });
    ring.push({ beat: 1, type: "wlabel", at: from + 15, rad: 1.12,
                label: String(B.n), size: 0.082 });
    ring.push({ beat: 1, type: "wlabel", at: from + 3.5, rad: 0.50,
                label: from + "°", size: 0.048, cool: true });
    ring.push({ beat: 1, type: "wlabel", at: to - 3.5, rad: 0.50,
                label: to + "°", size: 0.048, cool: true });
    sibs.forEach(function (h) {
      if (h === B.n) return;
      ring.push({ beat: 3, type: "wedge", from: (h - 1) * 30, to: h * 30,
                  cool: true });
      ring.push({ beat: 3, type: "wlabel", at: (h - 1) * 30 + 15, rad: 1.12,
                  label: String(h), size: 0.060, cool: true });
    });
    return {
      kicker: "Nirayana",
      title: B.name,
      subtitle: "The " + ORD[B.n - 1] + " bhāva — “" + B.lit + "” — " + from +
                "° to " + to + "° from the Lagna, built from its parts.",
      stage: "bhavaring",
      palette: "paper",
      explain: { house: B.n, keywords: B.key, karakaBody: B.body,
                 classHouses: sibs, classes: ks, items: ring,
                 divisions: 12, from: from, to: to, noBands: true },
      beats: beats,
      facts: {
        kind: "bhava", num: B.n, name: B.name, lit: B.lit,
        from: from, to: to, keywords: B.key, karaka: B.karaka,
        classes: ks, classHouses: sibs
      },
      method: "BPHS, Vol. 1 — bhāva significations and Ch. 7, vv. 33–36",
      closing: {
        big: B.n + " · " + B.name,
        lines: [
          B.key + ".",
          from + "° to " + to + "° from the Lagna. Kāraka: " + B.karaka +
          ". Class: " + ks.join(", ") + ".",
          "Significations and kārakas: BPHS, Vol. 1 — bhāva " +
          "significations (Ch. 11 onward). Classes: Vol. 1, Ch. 7, " +
          "vv. 33–36. The lord in each bhāva: Vol. 1, Ch. 24.",
          "A classical framework for study, not a prediction."
        ]
      }
    };
  }

  /* ---- three generic diagrams ---------------------------------------------

     The bhāva set needed a chart, and a chart is particular. Everything else
     the site teaches wants one of three pictures: a ring (the zodiac, by
     twelves or by twenty-sevens), a row of things (the nine grahas, the
     avasthās), or a set of bars to scale (the daśā lengths, the six balas).

     So the three share one data shape. An explainer hands over a flat list
     of items, each tagged with the beat that introduces it, and the stage
     draws every item whose beat has arrived. The accumulation is then a
     property of the data rather than of each drawing routine, which is what
     makes adding a set a matter of writing words rather than writing code —
     and what lets the trail cache work without any of them knowing it
     exists. */

  function wheelGeom(Rc) {
    /* the labels sit at 1.12 radii, so the radius is capped at a figure that
       keeps them inside the frame rather than at whatever fills the band */
    var r = Math.min(Rc.w * 0.435, Rc.h * 0.425);
    return { cx: Rc.x + Rc.w / 2, cy: Rc.y + Rc.h * 0.46, r: r };
  }
  /* zero at the top, increasing clockwise — the direction a rāśi wheel on
     this site already turns */
  function wAng(deg) { return (deg - 90) * R2; }
  function wXY(g, deg, rad) {
    var a = wAng(deg);
    return { x: g.cx + Math.cos(a) * rad, y: g.cy + Math.sin(a) * rad };
  }

  function wheelBase(c, G, Rc, reel, P) {
    var g = wheelGeom(Rc), D = reel.explain, i;
    var n = D.divisions || 12;
    c.save();
    /* the banded ground: on paper each rāśi gets its own wash, which is what
       makes the ring read as twelve things rather than one circle */
    /* A BHĀVA RING IS NOT A ZODIAC. Houses are counted from the Lagna, so
       painting the twelve sectors in the rāśi washes would be colouring them
       by a sign that is not there — and it drowned the pale wedges the class
       beat draws. The bands are opt-out. */
    if (P.signs && n === 12 && !D.noBands) {
      for (i = 0; i < 12; i++) {
        c.beginPath();
        c.moveTo(g.cx, g.cy);
        c.arc(g.cx, g.cy, g.r, wAng(i * 30), wAng((i + 1) * 30));
        c.closePath();
        c.fillStyle = P.signs[i];
        c.globalAlpha = 0.9;
        c.fill();
      }
    }
    c.globalAlpha = P.dark ? 0.55 : 0.8;
    c.strokeStyle = G.rgba(P.line || P.dim, 1);
    c.lineWidth = Math.max(1.4, g.r * 0.006);
    c.beginPath(); c.arc(g.cx, g.cy, g.r, 0, TAU); c.stroke();
    c.beginPath(); c.arc(g.cx, g.cy, g.r * 0.74, 0, TAU); c.stroke();
    c.restore();
  }

  function wheelItem(c, G, Rc, reel, P, it) {
    var g = wheelGeom(Rc), u = g.r;
    c.save();
    RE().plain(c);
    c.lineCap = "round";
    c.textAlign = "center";
    c.textBaseline = "middle";
    var col = G.rgba(it.hot ? (P.hot || P.gold) : (it.cool ? P.dim : P.gold), 1);
    if (it.type === "split") {
      c.globalAlpha = it.faint ? 0.35 : 0.7;
      c.strokeStyle = G.rgba(P.line || P.dim, 1);
      c.lineWidth = Math.max(1, u * (it.faint ? 0.0035 : 0.006));
      for (var k = 0; k < it.n; k++) {
        var a = wAng(k * 360 / it.n);
        c.beginPath();
        c.moveTo(g.cx + Math.cos(a) * u * (it.inner || 0.74),
                 g.cy + Math.sin(a) * u * (it.inner || 0.74));
        c.lineTo(g.cx + Math.cos(a) * u, g.cy + Math.sin(a) * u);
        c.stroke();
      }
    } else if (it.type === "arc") {
      c.globalAlpha = 0.9;
      c.strokeStyle = col;
      c.lineWidth = Math.max(3, u * 0.030);
      c.beginPath();
      c.arc(g.cx, g.cy, u * (it.rad || 0.87), wAng(it.from), wAng(it.to));
      c.stroke();
    } else if (it.type === "ray") {
      var A = wXY(g, it.from, u * 0.70), Bp = wXY(g, it.to, u * 0.70);
      c.globalAlpha = 0.78;
      c.strokeStyle = col;
      c.lineWidth = Math.max(1.6, u * 0.009);
      c.beginPath();
      c.moveTo(A.x, A.y);
      c.quadraticCurveTo(g.cx, g.cy, Bp.x, Bp.y);
      c.stroke();
      /* a head, so a glance has a direction */
      var ang = Math.atan2(Bp.y - g.cy, Bp.x - g.cx);
      c.beginPath();
      c.arc(Bp.x, Bp.y, u * 0.018, 0, TAU);
      c.fillStyle = col; c.fill();
      void ang;
    } else if (it.type === "mark") {
      var M = wXY(g, it.at, u * (it.rad || 0.87));
      c.globalAlpha = 0.95;
      if (it.body && window.SPBody && window.SPBody.ready()) {
        window.SPBody.draw(c, it.body, M.x, M.y, u * 0.050,
                           { phase: 180, halo: P.dark ? 0.22 : 0 });
      } else {
        c.fillStyle = col;
        c.beginPath(); c.arc(M.x, M.y, u * 0.022, 0, TAU); c.fill();
      }
      if (it.label) {
        var L = wXY(g, it.at, u * 1.12);
        c.fillStyle = G.rgba(it.cool ? P.dim : P.ink, 1);
        c.globalAlpha = 0.9;
        c.font = (P.banded ? "italic 600 " : "600 ") +
                 (u * 0.058).toFixed(1) + "px " + RE().SERIF;
        c.fillText(it.label, L.x, L.y);
      }
    } else if (it.type === "dot") {
      var Dp = wXY(g, it.at, u * (it.rad || 0.62));
      c.globalAlpha = it.alpha == null ? 0.8 : it.alpha;
      c.fillStyle = col;
      c.beginPath(); c.arc(Dp.x, Dp.y, u * (it.size || 0.012), 0, TAU); c.fill();
    } else if (it.type === "wedge") {
      /* A FILLED CONE, NOT A STROKED ARC. An arc on the rim says "this much
         of the edge"; a bhāva or a rāśi is the whole sector, centre
         outwards, and the cone is the only shape that says so. */
      c.globalAlpha = it.cool ? (P.dark ? 0.10 : 0.09) : (P.dark ? 0.26 : 0.17);
      c.fillStyle = G.rgba(it.cool ? P.dim : P.gold, 1);
      c.beginPath();
      c.moveTo(g.cx, g.cy);
      c.arc(g.cx, g.cy, u, wAng(it.from), wAng(it.to));
      c.closePath();
      c.fill();
      c.globalAlpha = it.cool ? 0.45 : 0.9;
      c.strokeStyle = G.rgba(it.cool ? P.dim : P.gold, 1);
      c.lineWidth = Math.max(1.4, u * (it.cool ? 0.004 : 0.008));
      c.stroke();
    } else if (it.type === "ring") {
      c.globalAlpha = it.alpha == null ? 0.7 : it.alpha;
      c.strokeStyle = G.rgba(it.cool ? P.dim : (P.line || P.dim), 1);
      c.lineWidth = Math.max(1.2, u * 0.005);
      if (it.dash) c.setLineDash([u * 0.03, u * 0.022]);
      c.beginPath(); c.arc(g.cx, g.cy, u * it.rad, 0, TAU); c.stroke();
      c.setLineDash([]);
    } else if (it.type === "ticks") {
      /* short radial strokes over a stretch of the ring: a degree scale, or
         a division finer than the eye would otherwise read as divided */
      c.globalAlpha = it.alpha == null ? 0.75 : it.alpha;
      c.strokeStyle = G.rgba(it.hot ? (P.hot || P.gold) : P.gold, 1);
      c.lineWidth = Math.max(1, u * 0.004);
      var span = it.to - it.from, stepT = it.step || 1;
      for (var t2 = 0; t2 <= span + 1e-9; t2 += stepT) {
        var ta = wAng(it.from + t2);
        var r0 = u * (it.rad || 0.74), r1 = u * ((it.rad || 0.74) + 0.07);
        c.beginPath();
        c.moveTo(g.cx + Math.cos(ta) * r0, g.cy + Math.sin(ta) * r0);
        c.lineTo(g.cx + Math.cos(ta) * r1, g.cy + Math.sin(ta) * r1);
        c.stroke();
      }
    } else if (it.type === "wlabel") {
      var W1 = wXY(g, it.at, u * (it.rad || 0.86));
      c.globalAlpha = 0.9;
      c.fillStyle = G.rgba(it.cool ? P.dim : P.ink, 1);
      c.font = (P.banded ? "italic " : "") +
               (Math.max(u * (it.size || 0.056), Rc.w * 0.019)).toFixed(1) +
               "px " + RE().SERIF;
      c.fillText(it.label, W1.x, W1.y);
    }
    c.restore();
  }

  function centreNote(c, G, Rc, reel, P, text, sub) {
    var g = wheelGeom(Rc), u = g.r;
    c.save();
    RE().plain(c);
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.globalAlpha = 0.95;
    c.fillStyle = G.rgba(P.ink, 1);
    c.font = (P.banded ? "italic 600 " : "600 ") + (u * 0.090).toFixed(1) +
             "px " + RE().SERIF;
    var ls = RE().wrapTo(c, text, u * 1.18);
    var y = g.cy - (ls.length - 1) * u * 0.055;
    for (var i = 0; i < Math.min(3, ls.length); i++) {
      c.fillText(ls[i], g.cx, y); y += u * 0.110;
    }
    if (sub) {
      c.globalAlpha = 0.7;
      c.fillStyle = G.rgba(P.dim, 1);
      c.font = (P.banded ? "italic " : "") + (u * 0.058).toFixed(1) + "px " +
               RE().SERIF;
      c.fillText(sub, g.cx, y + u * 0.02);
    }
    c.restore();
  }

  var S_wheel = {
    base: wheelBase,
    append: function (c, G, Rc, reel, P, from, to) {
      (reel.explain.items || []).forEach(function (it) {
        if (it.beat >= from && it.beat < to) wheelItem(c, G, Rc, reel, P, it);
      });
    },
    live: function (c, G, Rc, reel, P, now, idx, k) {
      var D = reel.explain, note = null;
      (D.items || []).forEach(function (it) {
        if (it.type === "centre" && it.beat < k) note = it;
      });
      if (note) centreNote(c, G, Rc, reel, P, note.text, note.sub);
    }
  };

  /* ---- a row of things ---------------------------------------------------- */
  function rowSlot(Rc, n, i) {
    var cols = n <= 4 ? n : (n <= 6 ? 3 : 3);
    var rows = Math.ceil(n / cols);
    var cw = Rc.w / cols, ch = Rc.h * 0.86 / rows;
    var r = Math.floor(i / cols), q = i % cols;
    var inRow = Math.min(cols, n - r * cols);
    var pad = (cols - inRow) * cw / 2;
    return { x: Rc.x + pad + q * cw + cw / 2,
             y: Rc.y + Rc.h * 0.08 + r * ch + ch * 0.44,
             w: cw, h: ch };
  }
  var S_row = {
    base: function () {},
    append: function (c, G, Rc, reel, P, from, to) {
      var all = reel.explain.items || [];
      var items = all.filter(function (x) { return x.type !== "slotNote"; });
      var n = items.length;
      /* notes attached to a slot, each arriving at its own beat — so the
         later beats of a row explainer add something to the picture rather
         than only to the caption */
      all.forEach(function (x) {
        if (x.type !== "slotNote") return;
        if (!(x.beat >= from && x.beat < to)) return;
        var s = rowSlot(Rc, n, x.slot), u = Math.min(s.w, s.h);
        c.save();
        RE().plain(c);
        c.textAlign = "center";
        c.globalAlpha = 0.78;
        c.fillStyle = G.rgba(x.hot ? (P.hot || P.gold) : P.dim, 1);
        c.font = (P.banded ? "italic " : "") + (u * 0.082).toFixed(1) +
                 "px " + RE().SERIF;
        c.fillText(x.text, s.x, s.y + u * (0.30 + 0.115 * (x.row || 0)));
        c.restore();
      });
      items.forEach(function (it, i) {
        if (!(it.beat >= from && it.beat < to)) return;
        var s = rowSlot(Rc, n, i), u = Math.min(s.w, s.h);
        c.save();
        RE().plain(c);
        c.textAlign = "center";
        if (it.body && window.SPBody && window.SPBody.ready()) {
          window.SPBody.draw(c, it.body, s.x, s.y - u * 0.12, u * 0.17,
                             { phase: 180, halo: P.dark ? 0.22 : 0 });
        } else {
          /* THE NODES ARE NOT BODIES. Rāhu and Ketu are the two points where
             the Moon's path crosses the Sun's; drawing them as discs would
             be drawing something that is not there. They get a ring. */
          c.globalAlpha = 0.85;
          c.strokeStyle = G.rgba(P.gold, 1);
          c.lineWidth = Math.max(1.6, u * 0.016);
          c.setLineDash([u * 0.05, u * 0.04]);
          c.beginPath();
          c.arc(s.x, s.y - u * 0.12, u * 0.15, 0, TAU);
          c.stroke();
          c.setLineDash([]);
        }
        c.globalAlpha = 0.95;
        c.fillStyle = G.rgba(P.ink, 1);
        c.font = (P.banded ? "italic 600 " : "600 ") + (u * 0.115).toFixed(1) +
                 "px " + RE().SERIF;
        c.fillText(it.label, s.x, s.y + u * 0.17);
        if (it.sub) {
          c.globalAlpha = 0.72;
          c.fillStyle = G.rgba(P.dim, 1);
          c.font = (P.banded ? "italic " : "") + (u * 0.090).toFixed(1) +
                   "px " + RE().SERIF;
          var ls = RE().wrapTo(c, it.sub, s.w * 0.92);
          var y = s.y + u * 0.30;
          for (var q = 0; q < Math.min(2, ls.length); q++) {
            c.fillText(ls[q], s.x, y); y += u * 0.105;
          }
        }
        c.restore();
      });
    },
    live: function () {}
  };

  /* ---- bars to scale ------------------------------------------------------
     The point of a bar here is always that the lengths are real: nineteen
     years of Śani against six of Sūrya is the fact, and a bar that is not to
     scale would be an illustration of a fact rather than the fact. */
  function barDraw(c, G, Rc, reel, P, from, to, list) {
    {
      var items = list || reel.explain.items || [], n = items.length;
      var max = 0;
      items.forEach(function (it) { if (it.value > max) max = it.value; });
      if (!(max > 0)) max = 1;
      /* the sub sits past the end of the bar, so the bar can only have what
         is left after the label on one side and the longest sub on the
         other — otherwise the figure runs off the frame, which is what the
         rising time did */
      var h = Rc.h * 0.92 / n, lw = Rc.w * 0.26, subW = Rc.w * 0.26;
      items.forEach(function (it, i) {
        if (!(it.beat >= from && it.beat < to)) return;
        var y = Rc.y + Rc.h * 0.04 + i * h + h * 0.5;
        var bw = (Rc.w - lw - subW - Rc.w * 0.06) * (it.value / max);
        c.save();
        RE().plain(c);
        c.textBaseline = "middle";
        c.globalAlpha = 0.95;
        c.fillStyle = G.rgba(P.ink, 1);
        c.textAlign = "right";
        c.font = (P.banded ? "italic 600 " : "600 ") + (h * 0.40).toFixed(1) +
                 "px " + RE().SERIF;
        c.fillText(it.label, Rc.x + lw, y);
        c.globalAlpha = it.hot ? 0.92 : 0.7;
        c.fillStyle = G.rgba(it.hot ? (P.hot || P.gold) : P.gold, 1);
        c.fillRect(Rc.x + lw + Rc.w * 0.03, y - h * 0.22, bw, h * 0.44);
        if (it.sub) {
          c.globalAlpha = 0.85;
          c.fillStyle = G.rgba(P.dim, 1);
          c.textAlign = "left";
          c.font = (P.banded ? "italic " : "") + (h * 0.33).toFixed(1) + "px " +
                   RE().SERIF;
          c.fillText(it.sub, Rc.x + lw + Rc.w * 0.045 + bw, y);
        }
        c.restore();
      });
    }
  }
  var S_bar = {
    base: function () {},
    append: function (c, G, Rc, reel, P, from, to) {
      barDraw(c, G, Rc, reel, P, from, to, null);
    },
    live: function () {}
  };

  /* ---- a rāśi: the ring above, the measurements below ---------------------
     A sign wants both pictures. Where it sits on the ring is the half of the
     answer that is geometry; how long each graha takes to cross it, and how
     long it takes to rise where you are, is the half that is measured — and
     the second half is the one nobody is shown. So the stage is split, and
     an item says which panel it belongs to. */
  function splitRect(Rc, topShare) {
    var t = topShare == null ? 0.56 : topShare;
    return {
      top: { x: Rc.x, y: Rc.y, w: Rc.w, h: Rc.h * t },
      bot: { x: Rc.x, y: Rc.y + Rc.h * (t + 0.02), w: Rc.w,
             h: Rc.h * (0.98 - t) }
    };
  }
  /* THE SKY GETS THE ROOM. A star chart needs height — latitude is the axis
     that carries the structure — and the bars underneath are eight short
     rows that read fine in a third of the frame. Splitting it evenly left
     the chart squat and the lower half empty for the first four beats. */
  function skySplit(Rc) { return splitRect(Rc, 0.70); }
  /* ---- a stretch of the zodiac, drawn out flat ----------------------------

     A RING CANNOT SHOW A NAKṢATRA. Thirteen degrees and twenty minutes is a
     twenty-seventh of a circle; at reel size that is a sliver, and the one
     thing worth looking at inside it — where the stars actually are — has
     nowhere to be drawn, because a ring has no room across its width. So
     the arc is cut out and laid flat: longitude across the frame, ecliptic
     latitude up and down it, the boundaries as two labelled verticals and
     the ecliptic itself as a horizontal through the middle.

     That is a star chart, and what goes on it is the sky. `eclip-stars.js`
     carries every star brighter than magnitude 5.4 within 34° of the
     ecliptic — 1347 of them, thirty to ninety in any nakṣatra's window — so
     the question "is the star this division is named for actually inside
     it?" is asked against a real field rather than against one dot.

     LATITUDE IS COMPRESSED and the drawing says so. A window twenty degrees
     wide and twenty degrees tall would be square; the frame is not, and the
     interesting structure is all within a few degrees of the ecliptic. */

  function starsIn(lo, hi, latLim) {
    var A = window.ECLIP_STARS, L = window.ECLIP_LABELS || [];
    if (!A) return [];
    var out = [], i;
    for (i = 0; i + 3 < A.length; i += 4) {
      var s = A[i] / 1000, b = A[i + 1] / 1000;
      if (Math.abs(b) > latLim) continue;
      var d = norm360(s - lo);
      if (d > norm360(hi - lo)) continue;
      out.push({ sid: s, lat: b, mag: A[i + 2] / 10,
                 label: A[i + 3] >= 0 ? L[A[i + 3]] : "" });
    }
    return out;
  }

  function stripGeom(Rc, D) {
    var m = Rc.w * 0.085;                     /* room for the edge labels */
    return { x: Rc.x + m, y: Rc.y, w: Rc.w - 2 * m, h: Rc.h,
             mid: Rc.y + Rc.h * 0.46,
             latScale: (Rc.h * 0.40) / (D.latLim || 9) };
  }
  /* longitude to x, with the window running left to right */
  function sx(g, D, lon) {
    return g.x + g.w * (norm360(lon - D.from) / D.span);
  }
  function sy(g, lat) { return g.mid - lat * g.latScale; }

  var S_strip = {
    base: function (c, G, Rc, reel, P) {
      var D = reel.explain, g = stripGeom(Rc, D);
      c.save();
      /* the band itself, so the chart reads as a cut-out of something */
      c.globalAlpha = P.dark ? 0.35 : 0.5;
      c.fillStyle = G.rgba(P.band || P.bg, 1);
      c.fillRect(g.x, g.y, g.w, g.h);
      /* the ecliptic — the line the whole scheme is measured along */
      c.globalAlpha = P.dark ? 0.5 : 0.7;
      c.strokeStyle = G.rgba(P.line || P.dim, 1);
      c.lineWidth = Math.max(1, Rc.w * 0.0022);
      c.setLineDash([Rc.w * 0.016, Rc.w * 0.012]);
      c.beginPath();
      c.moveTo(g.x, g.mid); c.lineTo(g.x + g.w, g.mid); c.stroke();
      c.setLineDash([]);
      RE().plain(c);
      c.globalAlpha = 0.7;
      c.fillStyle = G.rgba(P.dim, 1);
      c.textAlign = "left";
      c.textBaseline = "alphabetic";
      c.font = (P.banded ? "italic " : "") + (Rc.w * 0.021).toFixed(1) +
               "px " + RE().SERIF;
      c.fillText("the ecliptic", g.x + Rc.w * 0.008, g.mid - Rc.w * 0.009);
      /* THE LATITUDE SCALE, PRINTED. Longitude and latitude cannot share a
         scale in a frame this shape — the window is twenty-odd degrees wide
         and the band would have to be as tall again — so latitude is
         compressed, and a chart that compresses an axis without saying so
         is a chart that is lying about a shape. */
      c.globalAlpha = 0.55;
      c.textAlign = "right";
      var lim = D.latLim || 9;
      c.fillText("+" + lim.toFixed(0) + "\u00b0 latitude",
                 g.x + g.w - Rc.w * 0.008, g.y + Rc.w * 0.022);
      c.fillText("\u2212" + lim.toFixed(0) + "\u00b0",
                 g.x + g.w - Rc.w * 0.008, g.y + g.h - Rc.w * 0.012);
      c.restore();
    },
    append: function (c, G, Rc, reel, P, from, to) {
      var D = reel.explain, g = stripGeom(Rc, D), b;
      for (b = from; b < to; b++) (D.stripBeats || []).forEach(function (it) {
        if (it.beat !== b) return;
        stripItem(c, G, Rc, reel, P, g, it);
      });
    },
    live: function () {}
  };

  function stripItem(c, G, Rc, reel, P, g, it) {
    var D = reel.explain, u = Rc.w;
    c.save();
    RE().plain(c);
    c.textBaseline = "middle";
    if (it.type === "edge") {
      /* a boundary, with the longitude it actually is */
      var X = sx(g, D, it.at);
      c.globalAlpha = 0.95;
      c.strokeStyle = G.rgba(P.gold, 1);
      c.lineWidth = Math.max(2, u * 0.005);
      c.beginPath(); c.moveTo(X, g.y); c.lineTo(X, g.y + g.h); c.stroke();
      c.globalAlpha = 0.95;
      c.fillStyle = G.rgba(P.gold, 1);
      c.textAlign = it.side === "right" ? "left" : "right";
      c.font = (P.banded ? "italic 600 " : "600 ") + (u * 0.028).toFixed(1) +
               "px " + RE().SERIF;
      c.fillText(dms(it.at), X + (it.side === "right" ? u * 0.012 : -u * 0.012),
                 g.y + g.h * 0.085);
    } else if (it.type === "span") {
      /* the arc itself, as a wash between its two boundaries */
      var x0 = sx(g, D, it.from), x1 = sx(g, D, it.to);
      /* A WASH, NOT A SLAB. At the alpha this started on, the arc's tint
         was brighter than the stars inside it, and the picture became a
         coloured rectangle with some dots on it rather than a piece of sky
         with a boundary drawn across it. */
      c.globalAlpha = P.dark ? 0.045 : 0.075;
      c.fillStyle = G.rgba(it.cool ? P.dim : P.gold, 1);
      c.fillRect(Math.min(x0, x1), g.y, Math.abs(x1 - x0), g.h);
    } else if (it.type === "divide") {
      var Xd = sx(g, D, it.at);
      c.globalAlpha = 0.6;
      c.strokeStyle = G.rgba(P.accent || P.gold, 1);
      c.lineWidth = Math.max(1, u * 0.0028);
      c.setLineDash([u * 0.012, u * 0.010]);
      c.beginPath(); c.moveTo(Xd, g.y); c.lineTo(Xd, g.y + g.h); c.stroke();
      c.setLineDash([]);
    } else if (it.type === "name") {
      c.globalAlpha = it.cool ? 0.55 : 0.95;
      c.fillStyle = G.rgba(it.cool ? P.dim : P.ink, 1);
      c.textAlign = "center";
      c.font = (P.banded ? "italic 600 " : "600 ") +
               (u * (it.size || 0.030)).toFixed(1) + "px " + RE().SERIF;
      /* a neighbour's name can land past the edge of the window; clamped,
         so a label never hangs off the frame */
      var nx = Math.max(Rc.x + u * 0.09,
                        Math.min(Rc.x + Rc.w - u * 0.09, sx(g, D, it.at)));
      c.fillText(it.text, nx, g.y + g.h * (it.yf == null ? 0.07 : it.yf));
    } else if (it.type === "stars") {
      /* the circled star carries its own name from the ring item; naming it
         again from the field printed it twice, overlapping itself */
      var skip = it.skip == null ? null : it.skip;
      /* the field: size by magnitude, because that is the only honest way
         to draw a star — the eye reads a big dot as a bright star and
         there is nothing else a dot can mean */
      /* LABELS ARE DROPPED WHEN THEY WOULD COLLIDE. A real field puts
         several bright stars within a degree of each other — κ and ο Sco
         sit almost on top of one another — and two names drawn over each
         other are worse than one name and a dot. Brightest first, and a
         name is skipped if it lands on one already placed. */
      var placed = [];
      var field = starsIn(D.from, norm360(D.from + D.span), D.latLim || 9)
        .slice().sort(function (a, b) { return a.mag - b.mag; });
      field.forEach(function (s) {
          var X = sx(g, D, s.sid), Y = sy(g, s.lat);
          var r = u * (0.0040 + 0.0062 * Math.max(0, (5.4 - s.mag) / 5.4));
          if (P.dark) {
            G.dot(c, X, Y, r, P.ink, 0.95);
            if (s.mag < 3) G.glow(c, X, Y, r * 2.2, P.ink,
                                  { reach: 2.2, core: 0, alpha: 0.30 });
          } else {
            c.globalAlpha = 0.85;
            c.fillStyle = G.rgba(P.ink, 1);
            c.beginPath(); c.arc(X, Y, r, 0, TAU); c.fill();
          }
          var clash = false;
          for (var pi = 0; pi < placed.length; pi++)
            if (Math.abs(placed[pi][0] - X) < u * 0.105 &&
                Math.abs(placed[pi][1] - Y) < u * 0.026) { clash = true; break; }
          if (s.label && s.label !== skip && !clash &&
              s.mag <= (it.nameTo == null ? 3.2 : it.nameTo)) {
            placed.push([X, Y]);
            c.globalAlpha = 0.72;
            c.fillStyle = G.rgba(P.dim, 1);
            c.textAlign = "left";
            c.font = (P.banded ? "italic " : "") + (u * 0.020).toFixed(1) +
                     "px " + RE().SERIF;
            c.fillText(s.label, X + r + u * 0.007, Y);
          }
        });
    } else if (it.type === "ring") {
      /* one star circled — the junction star the division is named for */
      var Xr = sx(g, D, it.at), Yr = sy(g, it.lat);
      Yr = Math.max(g.y + u * 0.03, Math.min(g.y + g.h - u * 0.03, Yr));
      c.globalAlpha = 0.95;
      c.strokeStyle = G.rgba(it.cool ? P.dim : P.hot, 1);
      c.lineWidth = Math.max(1.6, u * 0.004);
      c.beginPath(); c.arc(Xr, Yr, u * 0.026, 0, TAU); c.stroke();
      if (it.text) {
        c.globalAlpha = 0.95;
        c.fillStyle = G.rgba(P.ink, 1);
        c.textAlign = "center";
        c.font = (P.banded ? "italic 600 " : "600 ") + (u * 0.026).toFixed(1) +
                 "px " + RE().SERIF;
        c.fillText(it.text, Xr, Yr - u * 0.046);
      }
    } else if (it.type === "verdict") {
      c.textAlign = "center";
      c.font = (P.banded ? "italic 600 " : "600 ") + (u * 0.040).toFixed(1) +
               "px " + RE().SERIF;
      var vw = c.measureText(it.text).width, vy = g.y + g.h * 0.862;
      var gr = c.createLinearGradient(g.x + g.w / 2 - vw / 2 - u * 0.06, 0,
                                      g.x + g.w / 2 + vw / 2 + u * 0.06, 0);
      gr.addColorStop(0, G.rgba(P.bg, 0));
      gr.addColorStop(0.18, G.rgba(P.bg, P.dark ? 0.88 : 0.9));
      gr.addColorStop(0.82, G.rgba(P.bg, P.dark ? 0.88 : 0.9));
      gr.addColorStop(1, G.rgba(P.bg, 0));
      c.globalAlpha = 1;
      c.fillStyle = gr;
      c.fillRect(g.x + g.w / 2 - vw / 2 - u * 0.06, vy - u * 0.030,
                 vw + u * 0.12, u * 0.058);
      c.globalAlpha = 0.95;
      c.fillStyle = G.rgba(P.hot || P.gold, 1);
      c.fillText(it.text, g.x + g.w / 2, vy);
    }
    c.restore();
  }

  /* ---- a sign: the sky above, the measurements below ----------------------
     The rāśi reels want both halves of the answer. Where the sign is and
     what is in it is a piece of sky, which is the strip; how long each
     graha takes to cross it and how long it takes to rise is a set of bars.
     The stage runs the one above the other, and an item says which panel it
     belongs to. */
  var S_skystrip = {
    base: function (c, G, Rc, reel, P) {
      S_strip.base(c, G, skySplit(Rc).top, reel, P);
    },
    append: function (c, G, Rc, reel, P, from, to) {
      var S = skySplit(Rc), D = reel.explain;
      var g = stripGeom(S.top, D);
      (D.stripBeats || []).forEach(function (it) {
        if (it.panel === "bar") return;
        if (it.beat >= from && it.beat < to)
          stripItem(c, G, S.top, reel, P, g, it);
      });
      barDraw(c, G, S.bot, reel, P, from, to,
              (D.stripBeats || []).filter(function (it) {
                return it.panel === "bar"; }));
    },
    live: function (c, G, Rc, reel, P, now, idx, k) {
      /* the sign's lord, drawn as the body it is, once the beat naming it
         has arrived — the only thing on this stage that is not a star */
      var D = reel.explain;
      if (k < 4 || !D.lordBody || !window.SPBody || !window.SPBody.ready()) return;
      var S = skySplit(Rc), g = stripGeom(S.top, D);
      window.SPBody.draw(c, D.lordBody,
                         sx(g, D, D.signIdx * 30 + 15), g.y + g.h * 0.30,
                         Rc.w * 0.040, { phase: 180, halo: P.dark ? 0.25 : 0 });
    }
  };

  /* ---- a bhāva: the chart above, the geometry below -----------------------
     The diamond says which cell; the ring says what a house actually is —
     thirty degrees counted from the Lagna, with the ones that share its
     class standing at the angle that defines the class. */
  function bhavaSplit(Rc) { return splitRect(Rc, 0.50); }
  var S_bhavaring = {
    base: function (c, G, Rc, reel, P) {
      var S = bhavaSplit(Rc);
      S_bhava.base(c, G, S.top, reel, P);
      wheelBase(c, G, S.bot, reel, P);
    },
    append: function (c, G, Rc, reel, P, from, to) {
      var S = bhavaSplit(Rc), D = reel.explain;
      S_bhava.append(c, G, S.top, reel, P, from, to);
      (D.items || []).forEach(function (it) {
        if (it.beat >= from && it.beat < to) wheelItem(c, G, S.bot, reel, P, it);
      });
    },
    live: function (c, G, Rc, reel, P, now, idx, k, p) {
      S_bhava.live(c, G, bhavaSplit(Rc).top, reel, P, now, idx, k, p);
    }
  };

  var S_rashi = {
    base: function (c, G, Rc, reel, P) {
      wheelBase(c, G, splitRect(Rc).top, reel, P);
    },
    append: function (c, G, Rc, reel, P, from, to) {
      var S = splitRect(Rc), items = reel.explain.items || [];
      items.forEach(function (it) {
        if (it.panel === "bar") return;
        if (it.beat >= from && it.beat < to) wheelItem(c, G, S.top, reel, P, it);
      });
      barDraw(c, G, S.bot, reel, P, from, to,
              items.filter(function (it) { return it.panel === "bar"; }));
    },
    live: function (c, G, Rc, reel, P, now, idx, k) {
      var note = null;
      (reel.explain.items || []).forEach(function (it) {
        if (it.type === "centre" && it.beat < k) note = it;
      });
      if (note) centreNote(c, G, splitRect(Rc).top, reel, P, note.text, note.sub);
    }
  };

  /* ---- turning beats into a story ----------------------------------------
     A beat has no date. The clock is given one beat per day and then not
     drawn, because the reel has no span to report and printing one would be
     inventing a measurement the format does not make. */
  var DAY = 86400000;
  function asStory(E, key) {
    /* a beat may be written as {lab, say} or as the pair [lab, say] — the
       sets that are mostly prose use the object, the sets that are mostly
       data use the pair, and neither should have to care */
    var ev = E.beats.map(function (b, i) {
      var lab = b.lab != null ? b.lab : b[0];
      var say = b.say != null ? b.say : b[1];
      return { t: i * DAY, lon: 0, marked: false, hold: false,
               tally: null, big: lab, small: say, note: null };
    });
    return {
      key: key, kicker: E.kicker, title: E.title, subtitle: E.subtitle,
      stage: E.stage, palette: E.palette || "paper",
      /* the numbers the reel computed, carried through for the script and
         caption generator — see sp-script.js. Dropping them here was why
         every language fell through to the generic frame. */
      facts: E.facts || null,
      explain: E.explain, events: ev,
      tallyKeys: [], clockMode: "none", capLines: 4,
      method: E.method || null,
      cover: { t0: -DAY * 0.5, t1: (E.beats.length - 1 + 0.5) * DAY },
      closing: E.closing
    };
  }

  /* ---- the concepts -------------------------------------------------------

     One explainer per subject the site teaches. Every lead sentence and
     every citation here is carried over from that subject's own page, which
     carries the source line; nothing is cited that is not already printed
     there. Where a beat is a teaching aid rather than a claim about the
     text, it says so in its own words. */

  var SIGN = ["Meṣa", "Vṛṣabha", "Mithuna", "Karka", "Siṃha", "Kanyā",
              "Tulā", "Vṛścika", "Dhanus", "Makara", "Kumbha", "Mīna"];
  var LORD = ["Maṅgala", "Śukra", "Budha", "Candra", "Sūrya", "Budha",
              "Śukra", "Maṅgala", "Guru", "Śani", "Śani", "Guru"];
  var ELEM = ["fire", "earth", "air", "water", "fire", "earth",
              "air", "water", "fire", "earth", "air", "water"];
  var MODE = ["movable", "fixed", "dual", "movable", "fixed", "dual",
              "movable", "fixed", "dual", "movable", "fixed", "dual"];

  /* exaltation: sign index and the deep degree within it. BPHS, Vol. 1,
     Ch. 3, vv. 49–54 — the degrees 10, 3, 28, 15, 5, 27, 20, with
     debilitation in the seventh from it at the same degree. */
  var UCCA = [
    { b: "Sun", n: "Sūrya", sign: 0, deg: 10 },
    { b: "Moon", n: "Candra", sign: 1, deg: 3 },
    { b: "Mars", n: "Maṅgala", sign: 9, deg: 28 },
    { b: "Mercury", n: "Budha", sign: 5, deg: 15 },
    { b: "Jupiter", n: "Guru", sign: 3, deg: 5 },
    { b: "Venus", n: "Śukra", sign: 11, deg: 27 },
    { b: "Saturn", n: "Śani", sign: 6, deg: 20 }
  ];
  /* Vimśottarī, in the order BPHS gives, with the years of each. They add to
     120, which is the whole point of the scheme. */
  var VIMS = [["Ketu", 7], ["Śukra", 20], ["Sūrya", 6], ["Candra", 10],
              ["Maṅgala", 7], ["Rāhu", 18], ["Guru", 16], ["Śani", 19],
              ["Budha", 17]];

  function sgn(i) { return i * 30 + 15; }

  var CONCEPTS = [
    { key: "grahas", title: "The nine grahas",
      sub: "Seven bodies and two points, and why the two are counted.",
      stage: "row",
      items: (function () {
        /* natural status and naisargika strength exactly as the grahas and
           strength pages print them — the virūpa figures are Ch. 27's */
        var G9 = [
          ["Sūrya", "Sun", "malefic", 60.0, "the soul, the father", 6],
          ["Candra", "Moon", "benefic when bright", 51.4, "the mind, the mother", 10],
          ["Maṅgala", "Mars", "malefic", 17.1, "courage, siblings", 7],
          ["Budha", "Mercury", "takes its company", 25.7, "speech, intellect", 17],
          ["Guru", "Jupiter", "benefic", 34.3, "wisdom, children", 16],
          ["Śukra", "Venus", "benefic", 42.9, "spouse, pleasure", 20],
          ["Śani", "Saturn", "malefic", 8.6, "grief, longevity", 19],
          ["Rāhu", null, "malefic", null, "the ascending node", 18],
          ["Ketu", null, "malefic", null, "the descending node", 7]
        ];
        var it = [];
        G9.forEach(function (g, i) {
          it.push({ beat: g[1] ? 0 : 1, label: g[0], body: g[1] });
          it.push({ type: "slotNote", beat: 2, slot: i, row: 0, text: g[2],
                    hot: g[2].indexOf("benefic") === 0 });
          it.push({ type: "slotNote", beat: 3, slot: i, row: 1, text: g[4] });
          it.push({ type: "slotNote", beat: 4, slot: i, row: 2,
                    text: g[3] == null ? "not scored" : g[3].toFixed(1) + " virūpas" });
          it.push({ type: "slotNote", beat: 5, slot: i, row: 3,
                    text: g[5] + " years in Vimśottarī" });
        });
        return it;
      })(),
      beats: [
        ["SEVEN BODIES",
         "BPHS treats nine grahas. Seven are the classical planets, from " +
         "Sūrya to Śani."],
        ["AND TWO POINTS",
         "Rāhu and Ketu are the lunar nodes — shadow grahas, the two points " +
         "where the Moon's path crosses the Sun's. They are not luminous " +
         "bodies, which is why they are drawn here as rings rather than discs."],
        ["BENEFIC AND MALEFIC",
         "Each has a natural status, which never changes. Guru and Śukra are " +
         "benefic; Sūrya, Maṅgala, Śani and the nodes are malefic; Candra is " +
         "benefic while bright, and Budha takes the character of its company."],
        ["KĀRAKA",
         "Each is also the natural significator of certain matters, and " +
         "carries them wherever it is placed."],
        ["NATURAL STRENGTH",
         "They are not equal to begin with. Naisargika bala is a fixed " +
         "ranking in virūpas, the same in every chart — and only the seven " +
         "bodies are scored."],
        ["AND ITS TURN",
         "A graha delivers in its own daśā, and Vimśottarī gives each a " +
         "fixed share of a hundred and twenty years. Until its turn comes it " +
         "is a promise, not an event."]
      ],
      cite: "BPHS, Vol. 1, Ch. 3 (planetary characters, castes, guṇas, " +
            "elements, sexes, seasons); Ch. 27 (naisargika bala)" },

    { key: "rashis", title: "The twelve rāśis",
      sub: "Thirty degrees each, sidereal, from 0° Meṣa.",
      stage: "wheel", divisions: 12,
      items: (function () {
        var it = [{ beat: 0, type: "split", n: 12 }];
        for (var i = 0; i < 12; i++)
          it.push({ beat: 0, type: "wlabel", at: sgn(i), rad: 0.87,
                    label: SIGN[i], size: 0.052 });
        for (i = 0; i < 12; i++)
          it.push({ beat: 1, type: "wlabel", at: sgn(i), rad: 0.62,
                    label: LORD[i], size: 0.042, cool: true });
        it.push({ beat: 2, type: "centre", text: "fire · earth · air · water",
                  sub: "the four elements, repeating round the ring" });
        it.push({ beat: 3, type: "centre",
                  text: "movable · fixed · dual",
                  sub: "the three modalities, repeating round the ring" });
        return it;
      })(),
      beats: [
        ["TWELVE OF THIRTY",
         "The zodiac is twelve rāśis of thirty degrees each, measured " +
         "sidereally from 0° Meṣa."],
        ["EACH HAS A LORD",
         "Every sign is owned by a graha. Sūrya and Candra own one each; the " +
         "other five own two."],
        ["AND AN ELEMENT",
         "Fire, earth, air and water repeat round the ring, so every fourth " +
         "sign shares an element — which is why trines are trines."],
        ["AND A MODALITY",
         "Movable, fixed and dual repeat likewise, so every fourth sign " +
         "shares a modality — which is what rāśi dṛṣṭi is built on."],
        ["SEX AND DIRECTION",
         "A sign also carries a gender and a direction, and lends all of it " +
         "to whatever falls in it."],
        ["QUIETLY EVERYWHERE",
         "Sign qualities drive dignity, aspects, vargas and daśās alike. " +
         "Almost nothing in the system is judged without them."]
      ],
      cite: "BPHS, Vol. 1, Ch. 4 (descriptions and classifications of the " +
            "signs; the Kālapuruṣa limb-scheme)" },

    { key: "aspects", title: "Dṛṣṭi",
      sub: "Two aspect systems, and why they must never be mixed silently.",
      stage: "wheel", divisions: 12,
      items: (function () {
        var it = [{ beat: 0, type: "split", n: 12 }];
        it.push({ beat: 0, type: "mark", at: sgn(0), label: "from here",
                  hot: true });
        it.push({ beat: 0, type: "ray", from: sgn(0), to: sgn(6) });
        it.push({ beat: 1, type: "ray", from: sgn(0), to: sgn(3) });
        it.push({ beat: 1, type: "ray", from: sgn(0), to: sgn(7) });
        it.push({ beat: 2, type: "ray", from: sgn(0), to: sgn(4) });
        it.push({ beat: 2, type: "ray", from: sgn(0), to: sgn(8) });
        it.push({ beat: 3, type: "ray", from: sgn(0), to: sgn(2) });
        it.push({ beat: 3, type: "ray", from: sgn(0), to: sgn(9) });
        it.push({ beat: 5, type: "centre", text: "graha dṛṣṭi",
                  sub: "a different system from rāśi dṛṣṭi" });
        return it;
      })(),
      beats: [
        ["EVERY GRAHA, THE SEVENTH",
         "A dṛṣṭi is a glance: how a graha reaches across the chart. Every " +
         "graha aspects the seventh from itself, in full."],
        ["MAṄGALA ALSO 4 AND 8",
         "Maṅgala has two further full glances — the fourth and the eighth " +
         "from itself."],
        ["GURU ALSO 5 AND 9",
         "Guru adds the fifth and the ninth, which is why its glance so " +
         "often lands on trines."],
        ["ŚANI ALSO 3 AND 10",
         "Śani adds the third and the tenth."],
        ["GRADED, NOT ALL-OR-NOTHING",
         "BPHS also gives a graded scheme — a quarter, a half, three " +
         "quarters, full — by how far apart the two points are."],
        ["AND A SECOND SYSTEM",
         "Rāśi dṛṣṭi is separate: movable signs aspect fixed signs except " +
         "the adjacent one, fixed aspect movable likewise, and dual signs " +
         "aspect the other duals. Always say which system you are using."]
      ],
      cite: "BPHS, Vol. 1, Ch. 26 (planetary aspects and the graded scheme); " +
            "Ch. 7, vv. 1–5 (sign aspects)" },

    { key: "dignity", title: "Dignity",
      sub: "The quality of the ground a graha stands on.",
      stage: "wheel", divisions: 12,
      items: (function () {
        var it = [{ beat: 0, type: "split", n: 12 }];
        UCCA.forEach(function (u) {
          it.push({ beat: 1, type: "mark", at: u.sign * 30 + u.deg,
                    body: u.b, rad: 0.87 });
          it.push({ beat: 2, type: "dot",
                    at: (u.sign * 30 + u.deg + 180) % 360, rad: 0.87,
                    size: 0.018, cool: true });
        });
        it.push({ beat: 3, type: "centre", text: "mūlatrikoṇa",
                  sub: "a privileged stretch inside a graha's own sign" });
        return it;
      })(),
      beats: [
        ["THE GROUND, NOT THE VOICE",
         "Dignity measures the quality of the ground a graha stands on. " +
         "Strength says how loudly it can speak; dignity says whether what " +
         "it says is sweet or sour."],
        ["EXALTATION, TO THE DEGREE",
         "Each of the seven has an exaltation sign and a deep degree in it: " +
         "10, 3, 28, 15, 5, 27 and 20."],
        ["DEBILITATION OPPOSITE",
         "Debilitation is the seventh sign from the exaltation, at the same " +
         "degree — so the two are always exactly opposite on the ring."],
        ["MŪLATRIKOṆA",
         "Between exaltation and plain ownership sits mūlatrikoṇa, a " +
         "privileged stretch of a graha's own sign."],
        ["FRIEND, NEUTRAL, ENEMY",
         "Natural friendship is then computed from where each graha's " +
         "mūlatrikoṇa and exaltation fall relative to the others."],
        ["READ WITH STRENGTH",
         "A dignified graha that is weak under-delivers; a strong graha in " +
         "a bad sign speaks loudly and says something sour. Neither is read " +
         "alone."]
      ],
      cite: "BPHS, Vol. 1, Ch. 3, vv. 49–54 (exaltations and deep degrees; " +
            "debilitation in the seventh) and v. 55 (natural friendship)" },

    { key: "vargas", title: "The ṣoḍaśa vargas",
      sub: "Sixteen divisional charts — refinements, never replacements.",
      stage: "wheel", divisions: 12,
      items: (function () {
        var it = [{ beat: 0, type: "split", n: 12 }];
        it.push({ beat: 1, type: "split", n: 24, faint: true, inner: 0.84 });
        it.push({ beat: 2, type: "split", n: 108, faint: true, inner: 0.90 });
        it.push({ beat: 2, type: "centre", text: "D9 — navāṃśa",
                  sub: "nine parts of 3°20′ in every sign" });
        /* the four read most often, each named on the arc it would divide */
        [["D4", 0], ["D7", 3], ["D10", 6], ["D12", 9]].forEach(function (q) {
          it.push({ beat: 3, type: "wlabel", at: sgn(q[1]), rad: 1.03,
                    label: q[0], size: 0.055 });
        });
        it.push({ beat: 4, type: "ring", rad: 0.52, dash: true });
        it.push({ beat: 4, type: "centre", text: "vimśopaka",
                  sub: "a weighted score across a group of vargas" });
        it.push({ beat: 5, type: "ticks", from: 0, to: 30, step: 0.5,
                  rad: 0.62, hot: true, alpha: 0.55 });
        it.push({ beat: 5, type: "wlabel", at: 15, rad: 0.44,
                  label: "D60 — 0°30′ each", size: 0.048, cool: true });
        return it;
      })(),
      beats: [
        ["SIXTEEN CHARTS",
         "The ṣoḍaśa vargas are sixteen divisional charts. Each splits every " +
         "sign into equal parts and re-maps them onto signs."],
        ["D2, THE SIMPLEST",
         "Horā halves each sign — two parts of fifteen degrees — and is read " +
         "for wealth and sustenance."],
        ["D9, THE MOST USED",
         "Navāṃśa cuts every sign into nine, each 3°20′ wide. That is a " +
         "hundred and eight divisions round the whole ring — and the same " +
         "3°20′ that makes a nakṣatra quarter."],
        ["A FINER QUESTION",
         "Each varga is read for one subject: D4 for property, D7 for " +
         "children, D10 for profession, D12 for parents."],
        ["WEIGHTED, NOT COUNTED",
         "Vimśopaka strength scores a graha across a group of vargas rather " +
         "than treating all sixteen alike."],
        ["NEVER A REPLACEMENT",
         "Establish the promise in the rāśi chart first. A varga refines " +
         "that promise; it does not overrule it — and D60 is so sensitive to " +
         "birth time that it should be handled with care."]
      ],
      cite: "BPHS, Vol. 1, Ch. 6 (the divisions) and Ch. 7 (the groupings " +
            "and Vimśopaka strength)" },

    { key: "strength", title: "Bala",
      sub: "How much of a placement can actually manifest.",
      stage: "bar",
      items: [
        { beat: 0, label: "Sthāna", value: 1, sub: "positional" },
        { beat: 1, label: "Dig", value: 1, sub: "directional" },
        { beat: 2, label: "Kāla", value: 1, sub: "temporal" },
        { beat: 3, label: "Cheṣṭā", value: 1, sub: "motional" },
        { beat: 4, label: "Naisargika", value: 1, sub: "natural" },
        { beat: 4, label: "Dṛk", value: 1, sub: "aspectual" }
      ],
      beats: [
        ["SCORED IN VIRŪPAS",
         "Dignity tells you a placement's quality; bala tells you how much " +
         "of it can manifest. BPHS scores it in virūpas — sixty make one " +
         "rūpa."],
        ["STHĀNA, DIG",
         "Positional strength comes from sign and varga dignity; directional " +
         "strength from which quarter of the sky a graha favours."],
        ["KĀLA",
         "Temporal strength from the time of birth — day or night, the " +
         "paksa, the weekday, the year."],
        ["CHEṢṬĀ",
         "Motional strength from how the graha is moving: retrograde motion " +
         "scores highly here, which surprises people."],
        ["NAISARGIKA, DṚK",
         "Natural strength is a fixed ranking of the seven; aspectual " +
         "strength is the net of benefic and malefic glances falling on it."],
        ["THE SEVEN ONLY",
         "Only the seven from Sūrya to Śani are scored. The nodes are not — " +
         "another consequence of their not being bodies."]
      ],
      cite: "BPHS, Vol. 1, Ch. 27 (Ṣaḍbala and its six components)" },

    { key: "dashas", title: "Vimśottarī",
      sub: "A hundred and twenty years, divided nine ways.",
      stage: "bar",
      items: VIMS.map(function (v, i) {
        return { beat: i < 2 ? 1 : (i < 5 ? 2 : 3), label: v[0],
                 value: v[1], sub: v[1] + " years" };
      }),
      beats: [
        ["WHEN, NOT WHETHER",
         "A daśā is a planetary period that times when a chart's promises " +
         "unfold. It does not create them."],
        ["ONE HUNDRED AND TWENTY",
         "Vimśottarī divides a hundred and twenty years among the nine " +
         "grahas. The bars here are to scale: Śani's nineteen years against " +
         "Sūrya's six."],
        ["IN A FIXED ORDER",
         "Ketu, Śukra, Sūrya, Candra, Maṅgala, Rāhu, Guru, Śani, Budha — " +
         "and round again."],
        ["STARTING FROM THE MOON",
         "Which period you are born into is decided by the Moon's janma " +
         "nakṣatra, and how much of it is left by how far the Moon has gone " +
         "through that nakṣatra."],
        ["DIVIDED THE SAME WAY",
         "Each mahādaśā is divided among the same nine in the same order: " +
         "antardaśā = mahādaśā × the sub-lord's years ÷ 120. The same " +
         "arithmetic goes on down."],
        ["CONDITIONAL, ALWAYS",
         "A period's result depends on the lord's dignity, strength, " +
         "placement, ownership and associations. There is no such thing as " +
         "a daśā that is simply good or simply bad."]
      ],
      cite: "BPHS, Vol. 2, Ch. 46, vv. 12–16 (the nakṣatra lords, the " +
            "120-year scheme and the balance at birth)" },

    { key: "ashtakavarga", title: "Aṣṭakavarga",
      sub: "Eight contributors grading every sign for support.",
      stage: "wheel", divisions: 12,
      items: (function () {
        var it = [{ beat: 0, type: "split", n: 12 }], i, k;
        /* an illustrative spread of bindus, drawn to show the shape of the
           diagram rather than any particular chart's totals */
        var show = [4, 5, 3, 6, 4, 2, 5, 3, 6, 4, 5, 3];
        for (i = 0; i < 12; i++)
          for (k = 0; k < show[i]; k++)
            it.push({ beat: 2, type: "dot", at: sgn(i) - 9 + k * 3.6,
                      rad: 0.60, size: 0.013 });
        it.push({ beat: 2, type: "centre", text: "a total per sign",
                  sub: "illustrative — not any particular chart" });
        /* the reductions take rows out, so they are drawn as a second,
           shorter ring inside the first rather than by erasing anything */
        var cut = [3, 4, 2, 5, 3, 2, 4, 2, 5, 3, 4, 2];
        for (i = 0; i < 12; i++)
          for (k = 0; k < cut[i]; k++)
            it.push({ beat: 3, type: "dot", at: sgn(i) - 7 + k * 3.4,
                      rad: 0.46, size: 0.011, cool: true });
        it.push({ beat: 4, type: "ring", rad: 0.34 });
        it.push({ beat: 4, type: "centre", text: "piṇḍa",
                  sub: "what the reduced figures are worth" });
        it.push({ beat: 5, type: "mark", at: sgn(9), label: "Śani transits",
                  body: "Saturn", rad: 0.87 });
        return it;
      })(),
      beats: [
        ["EIGHT CONTRIBUTORS",
         "Aṣṭakavarga means eight-fold division. Eight contributors — the " +
         "seven grahas and the Lagna — each grade the signs."],
        ["A POINT, OR NONE",
         "Each contributor awards a benefic point, a rekhā, to certain " +
         "places counted from itself and from each of the others, by fixed " +
         "tables."],
        ["ADDED UP",
         "Summing them gives each sign a score. The dots here are drawn to " +
         "show the shape of the diagram, not to report any chart."],
        ["THEN REDUCED",
         "Trikoṇa śodhana and ekādhipatya śodhana strip out double-counting " +
         "before the figures are used."],
        ["AND WEIGHTED",
         "Piṇḍa sādhana weights what is left, and the result is used to time " +
         "a house's results under Śani's transit."],
        ["WHAT IT IS FOR",
         "The totals guide transit judgement — which signs can support what " +
         "passes through them. They are a filter, not a forecast."]
      ],
      cite: "BPHS, Vol. 2, Ch. 66 (the contributors and the tables), " +
            "Ch. 67–71 (the reductions, the piṇḍa and its use)" },

    { key: "avasthas", page: "avasthas-longevity", title: "Avasthās",
      sub: "The states that modify how fully a graha speaks.",
      stage: "row",
      items: [
        { beat: 0, label: "Bālādi", sub: "infant to old — by degree in the sign" },
        { beat: 1, label: "Jāgradādi", sub: "awake, dreaming, asleep" },
        { beat: 2, label: "Dīptādi", sub: "blazing down to distressed" },
        { beat: 3, label: "Lajjitādi", sub: "ashamed, delighted, and the rest" },
        { beat: 4, label: "Śayanādi", sub: "twelve states, each with sub-states" }
      ],
      beats: [
        ["BĀLĀDI — BY AGE",
         "An avasthā is a state a graha is in. The first set reads its age " +
         "from where it sits in its sign: infant, youth, adult, old, dead."],
        ["JĀGRADĀDI — BY WAKEFULNESS",
         "The second asks whether it is awake, dreaming or asleep, which " +
         "scales how much of its result arrives."],
        ["DĪPTĀDI — BY CONDITION",
         "The third runs from blazing down to distressed, taking in " +
         "exaltation, combustion and defeat in planetary war."],
        ["LAJJITĀDI — BY COMPANY",
         "The fourth reads the company a graha keeps: ashamed, delighted, " +
         "starved, agitated."],
        ["ŚAYANĀDI — TWELVE MORE",
         "The last set gives twelve states, each with its own sub-state " +
         "modifiers and per-graha effects."],
        ["WHY THEY MATTER",
         "A dignified graha asleep delivers less than an ordinary one awake. " +
         "Avasthā is the volume knob that dignity and strength do not cover."]
      ],
      cite: "BPHS, Vol. 1, Ch. 45 (Bālādi, Jāgradādi, Dīptādi, Lajjitādi " +
            "and the twelve Śayanādi states)" },

    { key: "longevity", page: "avasthas-longevity", title: "Āyurdāya",
      sub: "The longevity chapters — classical doctrine, handled with care.",
      stage: "bar",
      items: [
        { beat: 0, label: "the question", value: 0.55,
          sub: "how long, asked as a method" },
        { beat: 1, label: "Piṇḍāyu", value: 1,
          sub: "from the grahas' own contributions" },
        { beat: 1, label: "Naisargāyu", value: 1,
          sub: "from fixed natural figures" },
        { beat: 1, label: "Aṃśāyu", value: 1, sub: "from the navāṃśa" },
        { beat: 2, label: "reductions", value: 0.62,
          sub: "for debilitation, combustion, hostile placement" },
        { beat: 3, label: "alpa", value: 0.27, sub: "short" },
        { beat: 3, label: "madhya", value: 0.55, sub: "middle" },
        { beat: 3, label: "pūrṇa", value: 0.85, sub: "long" },
        { beat: 4, label: "māraka", value: 0.40,
          sub: "the second and seventh lords" },
        { beat: 5, label: "and stop", value: 0.20, hot: true,
          sub: "the method, not a person" }
      ],
      beats: [
        ["WHAT THE TEXT DOES",
         "BPHS gives methods for estimating lifespan. They are set out here " +
         "as classical doctrine and nothing else."],
        ["THREE METHODS",
         "Piṇḍāyu, Naisargāyu and Aṃśāyu each reach a figure a different " +
         "way, and BPHS gives rules for which to use."],
        ["CONTRIBUTIONS, THEN CUTS",
         "Each graha contributes a quantity, and a series of reductions is " +
         "then applied for debilitation, combustion, hostile placement and " +
         "the rest."],
        ["THREE BANDS",
         "The result is read as a band — short, middle or long — rather than " +
         "as a date."],
        ["MĀRAKA",
         "Separately, the second and seventh lords are treated as māraka, " +
         "and their periods are where the tradition looks."],
        ["AND WHY IT STOPS THERE",
         "This site teaches the method and will not apply it to a person. " +
         "Nothing here predicts anyone's death, and no decision about health " +
         "or safety should rest on it."]
      ],
      cite: "BPHS, Vol. 1, Ch. 43 (Piṇḍāyu, Naisargāyu, Aṃśāyu and the " +
            "reductions) and Ch. 44 (māraka)" },

    { key: "yogas", title: "Yogas",
      sub: "Named combinations — and why a yoga is not a promise.",
      stage: "bhava",
      beats: [
        ["A NAMED COMBINATION",
         "A yoga is a named planetary combination with a characteristic " +
         "result. BPHS and the wider tradition catalogue hundreds."],
        ["KNOW THE FORMATION",
         "First, exactly what must be true for it to exist — which grahas, " +
         "in which relation, from which lagna."],
        ["KNOW THE CLASSICAL EFFECT",
         "Second, what the text says it does, in the text's own terms rather " +
         "than a modern paraphrase."],
        ["KNOW WHAT BREAKS IT",
         "Third, what weakens, cancels or delays it — debilitation, " +
         "combustion, a malefic glance, a lord in a dusthāna."],
        ["IT NEEDS ITS TURN",
         "A yoga that never gets the daśā of a graha forming it may pass " +
         "unnoticed for a whole life."],
        ["AND IT IS NOT A PROMISE",
         "The presence of a yoga guarantees nothing. It is one factor among " +
         "strength, dignity, ownership, varga and timing — never a verdict " +
         "on its own."]
      ],
      explainExtra: { house: 9, keywords: "a kendra lord and a trikoṇa lord " +
                      "in relation — the shape most rājayogas take",
                      karakaBody: "Jupiter" },
      cite: "BPHS, Vol. 1, Ch. 37 (Adhi, Sunapha, Anapha, Durudharā, " +
            "Kemadruma) and Ch. 38 (Veśi, Vāsi, Ubhayacarī)" },

    { key: "special-points", title: "Ārūḍha and Argalā",
      sub: "The Jaimini-style tools Parāśara sows.",
      stage: "wheel", divisions: 12,
      items: (function () {
        var it = [{ beat: 0, type: "split", n: 12 }];
        it.push({ beat: 1, type: "mark", at: sgn(0), label: "lagna", hot: true });
        it.push({ beat: 1, type: "ray", from: sgn(0), to: sgn(4) });
        it.push({ beat: 1, type: "mark", at: sgn(8), label: "ārūḍha" });
        it.push({ beat: 2, type: "ray", from: sgn(1), to: sgn(0) });
        it.push({ beat: 2, type: "ray", from: sgn(3), to: sgn(0) });
        it.push({ beat: 2, type: "ray", from: sgn(10), to: sgn(0) });
        it.push({ beat: 4, type: "centre", text: "kārakāṃśa",
                  sub: "the ātmakāraka's navāṃśa, read as a lagna" });
        return it;
      })(),
      beats: [
        ["A SECOND SET OF TOOLS",
         "Alongside the Parāśarī framework, BPHS carries Jaimini-style " +
         "tools. Parāśara sows them; Jaimini later develops them."],
        ["ĀRŪḌHA — THE IMAGE",
         "Count from a house to its lord, then the same distance again. The " +
         "result is that house's ārūḍha — not what it is, but how it appears."],
        ["ARGALĀ — THE INTERVENTION",
         "Certain houses intervene in another's affairs, and certain others " +
         "obstruct that intervention."],
        ["CHARA KĀRAKAS",
         "Significators assigned not by nature but by longitude: the highest " +
         "degree is the ātmakāraka, and so down the list."],
        ["KĀRAKĀṂŚA",
         "The sign the ātmakāraka occupies in the navāṃśa, read as a lagna " +
         "in its own right."],
        ["KEEP THEM SEPARATE",
         "These are a different framework with different rules. Mixing them " +
         "into Parāśarī judgement without saying so is how readings go " +
         "quietly wrong."]
      ],
      cite: "BPHS, Vol. 1, Ch. 29 (bhāva padas), Ch. 31 (argalā) and " +
            "Ch. 32, vv. 13–17 (the chara-kāraka order)" },

    { key: "lagna", title: "The Lagna",
      sub: "The degree rising on the eastern horizon.",
      stage: "wheel", divisions: 12,
      items: (function () {
        var it = [{ beat: 0, type: "split", n: 12 }];
        it.push({ beat: 0, type: "mark", at: 0, label: "rising", hot: true });
        for (var i = 0; i < 12; i++)
          it.push({ beat: 1, type: "wlabel", at: sgn(i), rad: 0.62,
                    label: String(i + 1), size: 0.050, cool: true });
        it.push({ beat: 2, type: "centre", text: "about two hours a sign",
                  sub: "and about one degree every four minutes" });
        /* one tick a degree across the rising sign: thirty of them, which is
           the two hours, and each one four minutes of clock */
        it.push({ beat: 3, type: "ticks", from: 0, to: 30, step: 1,
                  rad: 0.74, hot: true });
        it.push({ beat: 4, type: "mark", at: 0, rad: 0.62, label: "the self",
                  hot: true });
        [["bhāva", 2], ["horā", 5], ["ghaṭikā", 8], ["ārūḍha", 11]]
          .forEach(function (q) {
            it.push({ beat: 5, type: "dot", at: sgn(q[1]), rad: 0.87,
                      size: 0.016, cool: true });
            it.push({ beat: 5, type: "wlabel", at: sgn(q[1]), rad: 1.04,
                      label: q[0], size: 0.046, cool: true });
          });
        return it;
      })(),
      beats: [
        ["THE DEGREE RISING",
         "The Lagna is the degree of the zodiac rising on the eastern " +
         "horizon at the moment of birth."],
        ["EVERYTHING COUNTS FROM IT",
         "Every house is counted from the Lagna, so it decides which graha " +
         "owns what — and therefore almost every judgement that follows."],
        ["TWO HOURS A SIGN",
         "A sign takes roughly two hours to rise, varying with latitude — " +
         "about one degree every four minutes of clock time."],
        ["WHICH IS WHY TIME MATTERS",
         "Four minutes of error moves the Lagna a degree; a quarter of an " +
         "hour can move the navāṃśa lagna outright."],
        ["IT SIGNIFIES THE SELF",
         "Beyond anchoring the chart, the Lagna signifies the body, the " +
         "self, and the overall shape of a life."],
        ["AND IT IS NOT ALONE",
         "BPHS also carries special lagnas — bhāva, horā, ghaṭikā and " +
         "ārūḍha — each read for its own purpose."]
      ],
      cite: "BPHS, Vol. 1, Ch. 3–4 (the rising sign as Lagna; roughly two " +
            "hours per sign, varying by latitude)" },

    { key: "bhavas", title: "The twelve bhāvas",
      sub: "Arenas of life, counted from the Lagna.",
      stage: "bhava",
      explainExtra: { house: 1, keywords: "body, appearance, vitality, " +
                      "temperament, intellect — and the ground everything " +
                      "else is counted from", karakaBody: "Sun" },
      beats: [
        ["TWELVE ARENAS",
         "A bhāva is an arena of life. Twelve of them cover the whole of " +
         "experience, and every one is counted from the Lagna."],
        ["THE FIRST IS THE SELF",
         "The first bhāva is the body and the self — and the point from " +
         "which all the others are numbered."],
        ["FOUR THINGS AT ONCE",
         "Each house is judged by four things together: its own " +
         "significations, its lord's condition and placement, its occupants, " +
         "and the aspects it receives."],
        ["CLASSES ACROSS THEM",
         "Kendra, trikoṇa, dusthāna, upacaya, māraka — overlapping " +
         "groupings that say how a house behaves rather than what it means."],
        ["THE LORD CARRIES IT",
         "A house-lord takes that house's matters wherever it travels, " +
         "linking the two houses — and every graha but Sūrya and Candra " +
         "owns two."],
        ["AND THE DAŚĀ DECIDES WHEN",
         "The promise sits in the chart; the period decides when any of it " +
         "arrives."]
      ],
      cite: "BPHS, Vol. 1 — bhāva significations (Ch. 11 onward), " +
            "Ch. 7, vv. 33–36 (the classes) and Ch. 24 (the lord in each " +
            "bhāva)" }
  ];

  function conceptStory(C) {
    var ex = { items: C.items || [], divisions: C.divisions || 12 };
    if (C.explainExtra)
      Object.keys(C.explainExtra).forEach(function (k) {
        ex[k] = C.explainExtra[k];
      });
    if (ex.house != null && ex.classHouses == null) {
      var ks = classesOf(ex.house);
      ex.classes = ks; ex.classHouses = housesOfClasses(ks);
    }
    return {
      kicker: "Nirayana",
      title: C.title,
      subtitle: C.sub,
      stage: C.stage,
      palette: "paper",
      explain: ex,
      beats: C.beats.map(function (b) { return { lab: b[0], say: b[1] }; }),
      method: C.cite,
      closing: {
        big: C.title,
        lines: [
          C.sub,
          "Source: " + C.cite + ".",
          "A classical framework for study, not a prediction."
        ]
      }
    };
  }

  /* ---- the twenty-seven nakṣatras ----------------------------------------

     This set exists because of one fact the catalogue records and almost
     nothing else says out loud: SEVEN OF THE TWENTY-SEVEN JUNCTION STARS DO
     NOT LIE INSIDE THE EQUAL DIVISION NAMED AFTER THEM.

     The divisions are twenty-seven equal arcs of 13°20′. The yogatārās are
     real stars, at the longitudes they are actually at. Those two things
     were never going to line up, and for seven of them they visibly do not
     — Ārdrā's star is Betelgeuse, which sits in Mṛgaśīrṣā's arc. That is not
     an error in the scheme or in the catalogue; it is what happens when a
     naming convention older than the equal division survives the division
     being made regular. Saying so is more useful than hiding it, and the
     figure is computed here rather than asserted. */

  /* ---- the aṣṭakūṭa metadata of a nakṣatra -------------------------------

     Yoni, gaṇa and nāḍī are LATER TRADITION, not BPHS: Parāśara does not
     legislate the thirty-six-point matching scheme, and nothing here is
     presented as though he did. They are carried because one honest and
     checkable fact rests on them — of the thirty-six points, twenty-one are
     fixed by the birth star alone (tārā 3, yoni 4, gaṇa 6, nāḍī 8), which
     is why so much of the scheme is decided before anything else is looked
     at. That arithmetic is verified in the harness against the site's own
     scoring tables.

     COPIED FROM THE SITE'S OWN TABLES in 08-graha-drishti.js rather than
     retyped, so the reels and the compatibility tab can never disagree. */
  var KUTA = {
    gana: ["Deva","Manushya","Rakshasa","Manushya","Deva","Manushya","Deva","Deva","Rakshasa","Rakshasa","Manushya","Manushya","Deva","Rakshasa","Deva","Rakshasa","Deva","Rakshasa","Rakshasa","Manushya","Manushya","Deva","Rakshasa","Rakshasa","Manushya","Manushya","Deva"],
    yoni: ["Horse","Elephant","Sheep","Serpent","Serpent","Dog","Cat","Sheep","Cat","Rat","Rat","Cow","Buffalo","Tiger","Buffalo","Tiger","Deer","Deer","Dog","Monkey","Mongoose","Monkey","Lion","Horse","Lion","Cow","Elephant"],
    nadi: ["Adi","Madhya","Antya","Antya","Madhya","Adi","Adi","Madhya","Antya","Antya","Madhya","Adi","Adi","Madhya","Antya","Antya","Madhya","Adi","Adi","Madhya","Antya","Antya","Madhya","Adi","Adi","Madhya","Antya"],
    /* the maxima of the four kūṭas a nakṣatra alone decides, and the total */
    taraMax: 3, yoniMax: 4, ganaMax: 6, nadiMax: 8, total: 36
  };
  KUTA.nakMax = KUTA.taraMax + KUTA.yoniMax + KUTA.ganaMax + KUTA.nadiMax;

  var SEG = 40 / 3;                     /* 13°20′ */
  function nakList() {
    var Y = window.YOGATARAS;
    return (Y && Y.length === 27) ? Y : null;
  }
  function insideOwn(y) { return Math.floor(norm360(y.sid) / SEG) === y.id; }
  function norm360(x) { return ((x % 360) + 360) % 360; }
  /* the gap from the division named after it to the star, signed, in degrees */
  function strayBy(y) {
    var lo = y.id * SEG, hi = lo + SEG, x = norm360(y.sid);
    if (x >= lo && x < hi) return 0;
    var a = x - lo, b = x - hi;
    if (a < -180) a += 360; if (a > 180) a -= 360;
    if (b < -180) b += 360; if (b > 180) b -= 360;
    return Math.abs(a) < Math.abs(b) ? a : b;
  }
  function dms(x) {
    var d = Math.floor(Math.abs(x)), m = Math.round((Math.abs(x) - d) * 60);
    if (m === 60) { d++; m = 0; }
    return (x < 0 ? "−" : "") + d + "°" + (m < 10 ? "0" : "") + m + "′";
  }

  /* NAVĀṂŚA SIGNS OF THE FOUR PĀDAS. A pāda is 3°20′, which is exactly a
     navāṃśa, so the two schemes line up: the navāṃśa sign of a pāda is the
     sign its own ninth falls in. Computed from the longitude rather than
     quoted from a table, so it cannot drift from the varga engine. */
  function padaSign(lon) { return Math.floor(norm360(lon) / (30 / 9)) % 12; }

  function nakshatraStory(i) {
    var Y = nakList();
    if (!Y) return null;
    var y = Y[i], lo = i * SEG, hi = lo + SEG;
    var inside = insideOwn(y), off = strayBy(y);
    var lord = VIMS[i % 9];
    var prev = Y[(i + 26) % 27], next = Y[(i + 1) % 27];

    /* the window the strip shows: the arc, plus a third of it either side,
       so the neighbours are visible and the boundaries are not at the edge */
    var pad = SEG * 0.38, from = norm360(lo - pad), span = SEG + 2 * pad;
    /* THE BAND HAS TO HOLD THE STAR THE DIVISION IS NAMED FOR. Nine degrees
       either side of the ecliptic covers most of the zodiac's traffic, and
       leaves Śravaṇa's Altair at +29° and Mūla's Shaula at −14° off the
       bottom of the chart — the one star the reel circles, drawn outside
       the picture. The band is sized per nakṣatra to contain it. */
    var latLim = Math.max(9, Math.min(34, Math.abs(y.lat) + 4));

    var inWin = starsIn(from, norm360(from + span), latLim);
    var inArc = inWin.filter(function (s) {
      return norm360(s.sid - lo) < SEG;
    });

    /* which rāśi, and whether the arc straddles two of them */
    var s0 = Math.floor(lo / 30) % 12, s1 = Math.floor((hi - 1e-9) / 30) % 12;
    var signText = s0 === s1 ? SIGN[s0]
      : SIGN[s0] + " and " + SIGN[s1] + " — it straddles the boundary at " +
        dms((s0 + 1) * 30);

    var st = [];
    st.push({ beat: 0, type: "span", from: lo, to: hi });
    st.push({ beat: 0, type: "edge", at: lo, side: "left" });
    st.push({ beat: 0, type: "edge", at: hi, side: "right" });
    st.push({ beat: 0, type: "name", at: (lo + hi) / 2, text: y.nak,
              size: 0.040 });
    st.push({ beat: 1, type: "name", at: norm360(lo - pad * 0.55),
              text: prev.nak, cool: true, size: 0.024, yf: 0.155 });
    st.push({ beat: 1, type: "name", at: norm360(hi + pad * 0.55),
              text: next.nak, cool: true, size: 0.024, yf: 0.155 });
    st.push({ beat: 2, type: "stars", skip: y.star });
    st.push({ beat: 3, type: "ring", at: norm360(y.sid), lat: y.lat,
              text: y.star, cool: inside ? false : true });
    st.push({ beat: 3, type: "verdict",
              text: inArc.length + " of " + inWin.length +
                    " in this stretch fall inside" });
    for (var q = 1; q < 4; q++)
      st.push({ beat: 4, type: "divide", at: lo + q * SEG / 4 });
    for (q = 0; q < 4; q++)
      st.push({ beat: 4, type: "name", at: lo + (q + 0.5) * SEG / 4,
                text: SIGN[padaSign(lo + (q + 0.5) * SEG / 4)],
                size: 0.024, yf: 0.955 });
    st.push({ beat: 5, type: "span", from: s0 * 30, to: (s0 + 1) * 30,
              cool: true });
    st.push({ beat: 5, type: "name", at: lo + SEG * 0.5, text: signText.split(" ")[0],
              size: 0.026, yf: 0.17, cool: true });

    return {
      kicker: "Nirayana",
      title: y.nak,
      subtitle: "Division " + (i + 1) + " of twenty-seven — " + dms(lo) +
                " to " + dms(hi) + " — against the sky that is actually there.",
      stage: "strip",
      palette: "gold",
      explain: { from: from, span: span, latLim: latLim, stripBeats: st },
      beats: [
        ["" + (i + 1) + " · " + y.nak.toUpperCase(),
         "The ring is cut into twenty-seven equal arcs of 13°20′. " +
         "This is the " + (i + 1) + (i === 0 ? "st" : i === 1 ? "nd" :
           i === 2 ? "rd" : "th") + ", drawn out flat: longitude across, " +
         "the ecliptic through the middle."],
        ["BETWEEN TWO NEIGHBOURS",
         "It runs from " + dms(lo) + " to " + dms(hi) + " of sidereal " +
         "longitude, with " + prev.nak + " before it and " + next.nak +
         " after."],
        ["AND HERE IS THE SKY",
         "Every star in this stretch brighter than magnitude 5.4 and within " +
         Math.round(latLim) + "° of the ecliptic: " + inWin.length +
         " of them. The " +
         "divisions are exactly equal. Nothing up there is."],
        [inside ? "ITS OWN STAR IS INSIDE" : "ITS OWN STAR IS NOT INSIDE",
         "The yogatārā — the junction star the division is " +
         "named for — is " + y.star + ", " + y.bayer + ", at " +
         y.sid.toFixed(2) + "°. " +
         (inside
           ? "It falls inside " + y.nak + "'s own arc, with " + inArc.length +
             " of the " + inWin.length + " stars here."
           : "It falls OUTSIDE, by " + dms(off) + ". Seven of the " +
             "twenty-seven junction stars sit in a division that is not " +
             "the one named after them.")],
        ["FOUR PĀDAS",
         "Each nakṣatra divides into four pādas of 3°20′ " +
         "— which is exactly a navāṃśa, so the two " +
         "schemes line up. These four fall in " +
         [0, 1, 2, 3].map(function (q2) {
           return SIGN[padaSign(lo + (q2 + 0.5) * SEG / 4)];
         }).join(", ") + "."],
        ["AND IT SITS IN " + SIGN[s0].toUpperCase(),
         "By rāśi the arc lies in " + signText + "."],
        ["ITS DAŚĀ LORD IS " + lord[0].toUpperCase(),
         "A Moon born here opens a " + lord[1] + "-year " + lord[0] +
         " mahādaśā — with however much of it is left, " +
         "set by how far through the arc the Moon has gone."]
      ],
      /* THE FACTS, SEPARATELY FROM THE WORDS. A script in three languages
         cannot be three hand-written copies of the same sentences: they
         drift, and the one that drifts is the one nobody reads in testing.
         So the reel publishes the numbers it computed and every language
         renders those. See sp-script.js. */
      facts: {
        kind: "nakshatra", idx: i, name: y.nak, num: i + 1,
        lo: lo, hi: hi, loTxt: dms(lo), hiTxt: dms(hi),
        star: y.star, bayer: y.bayer, starLon: y.sid, starLat: y.lat,
        prev: prev.nak, next: next.nak,
        inside: inside, offTxt: inside ? null : dms(off),
        inArc: inArc.length, inWin: inWin.length, latLim: latLim,
        rashi: SIGN[s0], rashi2: s0 === s1 ? null : SIGN[s1],
        padas: [0, 1, 2, 3].map(function (q3) {
          return SIGN[padaSign(lo + (q3 + 0.5) * SEG / 4)]; }),
        lord: lord[0], lordYears: lord[1],
        yoni: KUTA.yoni[i], gana: KUTA.gana[i], nadi: KUTA.nadi[i]
      },
      method: "HYG catalogue under Lahiri · BPHS, Vol. 2, Ch. 46, " +
              "vv. 12–16",
      closing: {
        big: y.nak,
        lines: [
          dms(lo) + " to " + dms(hi) + ", in " + SIGN[s0] + ". Yogatārā " +
          y.star + " (" + y.bayer + ") at " + y.sid.toFixed(2) + "°, " +
          "ecliptic latitude " + y.lat.toFixed(1) + "° — " +
          (inside ? "inside its own arc." : "outside it by " + dms(off) + "."),
          inArc.length + " of the " + inWin.length + " catalogued stars in " +
          "this stretch of sky fall inside the division. " +
          "Vimśottarī lord " + lord[0] + ", " + lord[1] + " years.",
          "Star positions: HYG (Hipparcos/Yale/Gliese), J2000, sidereal " +
          "under Lahiri. Daśā lords: BPHS, Vol. 2, Ch. 46, " +
          "vv. 12–16.",
          "A classical framework for study, not a prediction."
        ]
      }
    };
  }

  /* ---- the twelve rāśis, measured ----------------------------------------

     Half of what there is to say about a sign is geometry and is on every
     chart. The other half is a measurement nobody is shown: how long each
     graha actually takes to cross it, and how long the sign takes to RISE
     where you are, which is not two hours and is not the same for all
     twelve. Both are computed here from the ephemeris rather than quoted. */

  /* how long a graha takes to get across one sign, measured by walking it.

     Not the mean motion over thirty degrees: a graha that turns retrograde
     inside a sign leaves and comes back, and the honest answer is the time
     from first entry to final exit. So the walk continues past an exit until
     the graha has stayed out for long enough that it is not coming back. */
  function crossingDays(name, signIdx, t0, step, settle) {
    var sid = window.__kSidAt;
    if (!sid) return null;
    var lo = signIdx * 30;
    function into(ms) {                    /* degrees into the sign, or -1 */
      var x = sid(name, new Date(ms));
      if (x == null) return -1;
      var d = norm360(x - lo);
      return d < 30 ? d : -1;
    }
    function inSign(ms) { return into(ms) >= 0; }

    /* FIND THE MIDDLE FIRST, THEN WALK OUT BOTH WAYS.

       Taking the first entry and the first settled exit measures whatever
       the graha happens to be doing at the start date, and near a boundary
       that is often a retrograde dip: Śani reported NINE DAYS over Tulā,
       because it poked in, turned, and backed out again before the real
       passage years later. Anchoring on a time the graha is unambiguously
       in the middle of the sign, and then walking back to the first entry
       and on to the final exit, measures the passage instead of the dip. */
    var t = t0, guard = 0, cap = 80000, mid = null;
    while (guard++ < cap) {
      var d0 = into(t);
      if (d0 >= 10 && d0 <= 20) { mid = t; break; }
      t += step;
    }
    if (mid == null) return null;

    function edge(dir) {
      var u = mid, out = null, g2 = 0;
      while (g2++ < cap) {
        u += dir * step;
        if (!inSign(u)) {
          if (out == null) out = u;
          if (Math.abs(u - out) >= settle) break;
        } else out = null;
      }
      if (out == null) return null;
      /* bisect between the last inside sample and the first outside one */
      var a = out - dir * step, b = out;
      for (var i = 0; i < 44; i++) {
        var m = (a + b) / 2;
        if (inSign(m)) a = m; else b = m;
      }
      return b;
    }
    var entry = edge(-1), exit = edge(1);
    if (entry == null || exit == null || !(exit > entry)) return null;
    return (exit - entry) / 86400000;
  }

  /* how long the sign takes to rise, measured by watching the ascendant.

     The whole ring rises once a sidereal day, so a single sweep gives all
     twelve — and at any latitude off the equator they are emphatically not
     equal, which is the thing worth showing. */
  var RISE_CACHE = {};
  function risingMinutes(place) {
    var asc = window.__kAsc;
    if (!asc || !place) return null;
    var key = place.lat.toFixed(3) + "|" + place.lon.toFixed(3);
    if (RISE_CACHE[key]) return RISE_CACHE[key];
    var mins = new Array(12), i;
    for (i = 0; i < 12; i++) mins[i] = 0;
    var base = { year: 2026, month: 3, day: 21, hour: 0, minute: 0,
                 tzHours: 0, lat: place.lat, lon: place.lon };
    var prev = null, step = 2;
    for (var m = 0; m <= 1440; m += step) {
      var a = asc(base, m);
      if (a == null) { prev = null; continue; }
      var s = Math.floor(norm360(a) / 30) % 12;
      if (prev != null) mins[prev] += step;
      prev = s;
    }
    RISE_CACHE[key] = mins;
    return mins;
  }

  /* mean daily motion, only to choose a sensible walking step */
  var STEP = { "Sun": 0.25, "Moon": 0.02, "Mars": 1, "Mercury": 0.25,
               "Jupiter": 2, "Venus": 0.5, "Saturn": 4 };
  /* how long a graha must stay outside a sign before the walk accepts that
     the passage is over — comfortably longer than that graha's retrograde
     excursion back across the boundary */
  var SETTLE = { "Sun": 20, "Moon": 2, "Mars": 130, "Mercury": 45,
                 "Jupiter": 210, "Venus": 70, "Saturn": 280 };
  var CROSS_BODIES = [["Candra", "Moon"], ["Budha", "Mercury"],
                      ["Śukra", "Venus"], ["Sūrya", "Sun"],
                      ["Maṅgala", "Mars"], ["Guru", "Jupiter"],
                      ["Śani", "Saturn"]];

  function spanWords(d) {
    if (d == null) return "—";
    if (d < 3) {
      var h = Math.round(d * 24);
      return Math.floor(h / 24) ? Math.floor(h / 24) + " d " + (h % 24) + " h"
                                : h + " h";
    }
    if (d < 70) return Math.round(d) + " days";
    var mo = d / 30.44;
    if (mo < 22) return mo.toFixed(1) + " months";
    return (d / 365.2564).toFixed(1) + " years";
  }
  function minWords(m) {
    var h = Math.floor(m / 60), r = Math.round(m % 60);
    return h ? h + " h " + (r < 10 ? "0" : "") + r + " m" : r + " m";
  }

  /* rāśi dṛṣṭi, as the aspects page states it: movable signs aspect the
     fixed except the adjacent one, fixed aspect the movable likewise, and
     dual signs aspect the other duals */
  function rashiDrishti(i) {
    var out = [], j;
    var mode = MODE[i];
    for (j = 0; j < 12; j++) {
      if (j === i) continue;
      if (mode === "dual") { if (MODE[j] === "dual") out.push(j); }
      else if (mode === "movable") {
        if (MODE[j] === "fixed" && (j - i + 12) % 12 !== 1) out.push(j);
      } else if (mode === "fixed") {
        if (MODE[j] === "movable" && (i - j + 12) % 12 !== 1) out.push(j);
      }
    }
    return out;
  }

  function rashiStory(i, place) {
    var lo = i * 30, hi = lo + 30;
    /* the window: the sign plus a sixth of it either side, so the two
       boundaries sit inside the frame with their neighbours visible */
    var pad = 5, from = norm360(lo - pad), span = 30 + 2 * pad;
    var latLim = 12;
    var inWin = starsIn(from, norm360(from + span), latLim);
    var inArc = inWin.filter(function (s) { return norm360(s.sid - lo) < 30; });

    /* which nakṣatras fall in the sign: a rāśi is 2¼ of them, which is the
       fact that makes the two schemes awkward to hold in the head at once */
    var Y = nakList();
    var naks = [], whole = 0, k;
    for (k = 0; k < 27; k++) {
      var nlo = k * SEG, nhi = nlo + SEG;
      if (nhi > lo + 1e-9 && nlo < hi - 1e-9) {
        var full = nlo >= lo - 1e-9 && nhi <= hi + 1e-9;
        if (full) whole++;
        naks.push({ i: k, lo: nlo, hi: nhi, full: full,
                    name: Y ? Y[k].nak : String(k + 1) });
      }
    }

    var st = [];
    st.push({ beat: 0, type: "span", from: lo, to: hi });
    st.push({ beat: 0, type: "edge", at: lo, side: "left" });
    st.push({ beat: 0, type: "edge", at: hi, side: "right" });
    st.push({ beat: 0, type: "name", at: lo + 15, text: SIGN[i], size: 0.040 });
    st.push({ beat: 0, type: "name", at: norm360(lo - pad * 0.6),
              text: SIGN[(i + 11) % 12], cool: true, size: 0.022, yf: 0.155 });
    st.push({ beat: 0, type: "name", at: norm360(hi + pad * 0.6),
              text: SIGN[(i + 1) % 12], cool: true, size: 0.022, yf: 0.155 });
    st.push({ beat: 1, type: "stars" });
    naks.forEach(function (n) {
      st.push({ beat: 2, type: "divide", at: n.lo });
      st.push({ beat: 2, type: "name", at: Math.max(lo, n.lo) / 2 +
                Math.min(hi, n.hi) / 2, text: n.name, size: 0.021,
                cool: !n.full, yf: 0.955 });
    });
    st.push({ beat: 2, type: "verdict",
              text: whole + " nakṣatras whole, " + (naks.length - whole) +
                    " cut by its edges" });

    /* the measurements, as before — the half of a sign nobody is shown */
    var t0 = Date.UTC(2026, 0, 1), cross = [];
    CROSS_BODIES.forEach(function (q) {
      var d = null;
      try {
        d = crossingDays(q[1], i, t0, STEP[q[1]] * 86400000,
                         SETTLE[q[1]] * 86400000);
      } catch (e) { d = null; }
      cross.push({ name: q[0], days: d });
    });
    var maxD = 0;
    cross.forEach(function (q) { if (q.days > maxD) maxD = q.days; });
    cross.forEach(function (q) {
      st.push({ panel: "bar", beat: 4, label: q.name,
                value: q.days == null ? 0 : Math.pow(q.days / (maxD || 1), 0.42),
                sub: spanWords(q.days) });
    });
    var rise = null;
    try { rise = risingMinutes(place); } catch (e2) { rise = null; }
    var riseM = rise ? rise[i] : null;
    var slowest = null, fastest = null;
    if (rise) {
      var o = rise.map(function (v, q2) { return [v, q2]; })
                  .sort(function (x, y2) { return x[0] - y2[0]; });
      fastest = o[0]; slowest = o[11];
    }
    if (riseM != null)
      st.push({ panel: "bar", beat: 5, label: "rises in", value: 1, hot: true,
                sub: minWords(riseM) });

    var crossWords = cross.map(function (q) {
      return q.name + " " + spanWords(q.days);
    }).join(", ");
    var lordBody = { "Sūrya": "Sun", "Candra": "Moon", "Maṅgala": "Mars",
                     "Budha": "Mercury", "Guru": "Jupiter", "Śukra": "Venus",
                     "Śani": "Saturn" }[LORD[i]];

    return {
      kicker: "Nirayana",
      title: SIGN[i],
      subtitle: "Rāśi " + (i + 1) + " of twelve — " + lo + "° to " + hi +
                "° — the sky in it, and how long it takes to cross.",
      stage: "skystrip",
      palette: "gold",
      explain: { from: from, span: span, latLim: latLim, stripBeats: st,
                 items: st, lordBody: lordBody, signIdx: i },
      beats: [
        [(i + 1) + " · " + SIGN[i].toUpperCase(),
         "The zodiac is twelve rāśis of thirty degrees. This is the " +
         ORD[i] + ", " + SIGN[i] + ", running from " + lo + "° to " + hi +
         "° of sidereal longitude — drawn out flat, with " +
         SIGN[(i + 11) % 12] + " before it and " + SIGN[(i + 1) % 12] +
         " after."],
        ["THE SKY IN IT",
         "Every star in the window brighter than magnitude 5.4 and within " +
         Math.round(latLim) + "° of the ecliptic: " + inWin.length +
         ", of which " +
         inArc.length + " fall inside " + SIGN[i] + " itself."],
        ["AND THE NAKṢATRAS ACROSS IT",
         "Thirty degrees is two and a quarter nakṣatras, so the two schemes " +
         "never line up: " + whole + " sit whole inside " + SIGN[i] + " and " +
         (naks.length - whole) + " are cut by its edges."],
        ["OWNED BY " + LORD[i].toUpperCase() + ", " + ELEM[i].toUpperCase() +
         ", " + MODE[i].toUpperCase(),
         SIGN[i] + " is owned by " + LORD[i] + ". It is a " + ELEM[i] +
         " sign and a " + MODE[i] + " one, " +
         (i % 2 === 0 ? "odd, counted male" : "even, counted female") +
         " — and under rāśi dṛṣṭi it aspects " +
         rashiDrishti(i).map(function (j) { return SIGN[j]; }).join(", ") + "."],
        ["HOW LONG TO CROSS IT",
         "Measured on the next passage, first entry to final exit: " +
         crossWords + ". Not the sign divided by a mean motion — a graha " +
         "that turns retrograde near a boundary leaves and comes back."],
        ["AND HOW LONG TO RISE",
         riseM == null
           ? "How long a sign takes to rise depends on where you are. Pick a " +
             "place and the Studio measures it."
           : SIGN[i] + " takes " + minWords(riseM) + " to rise at " +
             (place ? place.n : "this latitude") + " — not two hours. Away " +
             "from the equator the twelve are not equal: here " +
             SIGN[slowest[1]] + " takes " + minWords(slowest[0]) + " and " +
             SIGN[fastest[1]] + " only " + minWords(fastest[0]) + "."]
      ],
      facts: {
        kind: "rashi", idx: i, name: SIGN[i], num: i + 1,
        lo: lo, hi: hi, lord: LORD[i], elem: ELEM[i], mode: MODE[i],
        inArc: inArc.length, inWin: inWin.length, latLim: latLim,
        naksWhole: whole, naksCut: naks.length - whole,
        naks: naks.map(function (n) { return n.name; }),
        cross: cross.map(function (q) {
          return { name: q.name, days: q.days, txt: spanWords(q.days) }; }),
        riseMin: riseM, riseTxt: riseM == null ? null : minWords(riseM),
        place: place ? place.n : null,
        drishti: rashiDrishti(i).map(function (j) { return SIGN[j]; })
      },
      method: "HYG catalogue under Lahiri · passages and ascendant measured",
      placeName: place ? place.n : null,
      closing: {
        big: SIGN[i],
        lines: [
          lo + "° to " + hi + "°. " + ELEM[i] + ", " + MODE[i] + ", owned by " +
          LORD[i] + ". " + whole + " nakṣatras whole inside it, " +
          (naks.length - whole) + " cut by its edges.",
          "Crossed, first entry to final exit on the next passage: Candra in " +
          spanWords(cross[0].days) + ", Śani in " + spanWords(cross[6].days) +
          (riseM == null ? "." : "; it rises in " + minWords(riseM) + " at " +
            (place ? place.n : "this latitude") + "."),
          "Classifications: BPHS, Vol. 1, Ch. 4. Stars: HYG, J2000, sidereal " +
          "under Lahiri. Passages and ascendant measured against a modern " +
          "ephemeris.",
          "A classical framework for study, not a prediction."
        ]
      }
    };
  }

  /* ---- registration -------------------------------------------------------
     Explainers register as stories, so the Studio lists them, the recorder
     records them and the export path is the one every other reel uses. */
  var MADE = [];
  function publish() {
    if (!window.SPStories || !window.SPReel) return 0;
    window.SPReel.STAGES.bhava = S_bhava;
    window.SPReel.STAGES.wheel = S_wheel;
    window.SPReel.STAGES.row = S_row;
    window.SPReel.STAGES.bar = S_bar;
    window.SPReel.STAGES.rashi = S_rashi;
    window.SPReel.STAGES.strip = S_strip;
    window.SPReel.STAGES.skystrip = S_skystrip;
    window.SPReel.STAGES.bhavaring = S_bhavaring;
    var n = 0;
    /* the twenty-seven, only if the star catalogue is on the page — a reel
       page without it should lose this set and nothing else */
    if (nakList()) {
      for (var ni = 0; ni < 27; ni++) (function (idx) {
        var nk = "learn.nakshatra." + (idx + 1);
        var Y = nakList()[idx];
        MADE.push(nk);
        if (window.SPStories.add({
          key: nk, group: "Learn · the twenty-seven nakṣatras",
          label: (idx + 1) + " · " + Y.nak,
          blurb: "13°20′ of the ring, and the star it is named for — " +
                 Y.star + ", " + (insideOwn(Y) ? "inside" : "outside") +
                 " its own arc.",
          years: 1, seconds: 20,
          build: function (s) {
            var E = nakshatraStory(idx);
            if (!E) return null;
            var S = asStory(E, nk);
            Object.keys(S).forEach(function (k) { s[k] = S[k]; });
            return s;
          }
        })) n++;
      })(ni);
    }
    /* the twelve, which need a place before they can be measured */
    for (var ri = 0; ri < 12; ri++) (function (idx) {
      var rk = "learn.rashi." + (idx + 1);
      MADE.push(rk);
      if (window.SPStories.add({
        key: rk, group: "Learn · the twelve rāśis",
        label: (idx + 1) + " · " + SIGN[idx],
        blurb: ELEM[idx] + ", " + MODE[idx] + ", owned by " + LORD[idx] +
               " — with how long each graha takes to cross it, measured.",
        years: 1, seconds: 22,
        build: function (s) {
          var P = s.place ||
                  (window.NP && window.NP.savedPlace && window.NP.savedPlace()) ||
                  (window.NP && window.NP.PLACES && window.NP.PLACES[0]) || null;
          var E = rashiStory(idx, P);
          if (!E) return null;
          var S = asStory(E, rk);
          Object.keys(S).forEach(function (k) { s[k] = S[k]; });
          s.placeName = E.placeName;
          return s;
        }
      })) n++;
    })(ri);
    CONCEPTS.forEach(function (C) {
      var ck = "learn.concept." + C.key;
      var CE = conceptStory(C);
      MADE.push(ck);
      if (window.SPStories.add({
        key: ck, group: "Learn · the framework",
        label: C.title, blurb: C.sub, years: 1, seconds: 20,
        build: function (s) {
          var S = asStory(CE, ck);
          Object.keys(S).forEach(function (k) { s[k] = S[k]; });
          return s;
        }
      })) n++;
    });
    BHAVAS.forEach(function (B) {
      var key = "learn.bhava." + B.n;
      var E = bhavaStory(B);
      MADE.push(key);
      var okAdd = window.SPStories.add({
        key: key, group: "Learn · the twelve bhāvas",
        label: B.n + " · " + B.name,
        blurb: B.lit + " — " + B.key,
        years: 1, seconds: 20,
        build: function (s) {
          var S = asStory(E, key);
          Object.keys(S).forEach(function (k) { s[k] = S[k]; });
          return s;
        }
      });
      if (okAdd) n++;
    });
    return n;
  }

  window.SPExplain = {
    publish: publish, DIAMOND: DIAMOND, BHAVAS: BHAVAS, CLASSES: CLASSES,
    /* exposed so the harness can check the 21-of-36 claim against the
       site's own scoring maxima rather than against a remembered figure */
    KUTA: KUTA, starsIn: starsIn,
    classesOf: classesOf, bhavaStory: bhavaStory, asStory: asStory,
    keys: function () { return MADE.slice(); }
  };
  if (window.SPStories && window.SPReel) publish();
  else if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", function () { publish(); });
  else setTimeout(publish, 0);
})();
