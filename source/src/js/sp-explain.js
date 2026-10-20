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
    var s = Math.min(Rc.w * 0.86, Rc.h * 0.90);
    return { x: Rc.x + (Rc.w - s) / 2, y: Rc.y + (Rc.h - s) / 2 + Rc.h * 0.01,
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
        var y = F.y + F.s + F.s * 0.075;
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

  function bhavaStory(B) {
    var ks = classesOf(B.n);
    var why = CLASSWHY[ks[0]];
    var beats = [
      { lab: "THE TWELVE",
        say: "A bhāva is an arena of life, counted from the Lagna. Twelve of " +
             "them cover the whole of experience." },
      { lab: B.n + " · " + B.name.toUpperCase(),
        say: "The " + ORD[B.n - 1] + " is " + B.name + " — “" +
             B.lit + "”." },
      { lab: "WHAT IT CARRIES",
        say: B.key.charAt(0).toUpperCase() + B.key.slice(1) + "." },
      { lab: ks.join(" · ").toUpperCase(),
        say: "By class it is " + B.cls + ": " + why + "." },
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
    return {
      kicker: "Nirayana",
      title: B.name,
      subtitle: "The " + ORD[B.n - 1] + " bhāva — “" + B.lit +
                "” — built from its parts.",
      stage: "bhava",
      palette: "paper",
      explain: { house: B.n, keywords: B.key, karakaBody: B.body,
                 classHouses: housesOfClasses(ks), classes: ks },
      beats: beats,
      method: "BPHS, Vol. 1 — bhāva significations and Ch. 7, " +
              "vv. 33–36",
      closing: {
        big: B.n + " · " + B.name,
        lines: [
          B.key + ".",
          "Kāraka: " + B.karaka + ". Class: " + ks.join(", ") + ".",
          "Significations and kārakas: BPHS, Vol. 1 — bhāva " +
          "significations (Ch. 11 onward). Classes: Vol. 1, Ch. 7, " +
          "vv. 33–36. The lord in each bhāva: Vol. 1, Ch. 24.",
          "A classical framework for study, not a prediction."
        ]
      }
    };
  }

  /* ---- turning beats into a story ----------------------------------------
     A beat has no date. The clock is given one beat per day and then not
     drawn, because the reel has no span to report and printing one would be
     inventing a measurement the format does not make. */
  var DAY = 86400000;
  function asStory(E, key) {
    var ev = E.beats.map(function (b, i) {
      return { t: i * DAY, lon: 0, marked: false, hold: false,
               tally: null, big: b.lab, small: b.say, note: null };
    });
    return {
      key: key, kicker: E.kicker, title: E.title, subtitle: E.subtitle,
      stage: E.stage, palette: E.palette || "paper",
      explain: E.explain, events: ev,
      tallyKeys: [], clockMode: "none", capLines: 4,
      method: E.method || null,
      cover: { t0: -DAY * 0.5, t1: (E.beats.length - 1 + 0.5) * DAY },
      closing: E.closing
    };
  }

  /* ---- registration -------------------------------------------------------
     Explainers register as stories, so the Studio lists them, the recorder
     records them and the export path is the one every other reel uses. */
  var MADE = [];
  function publish() {
    if (!window.SPStories || !window.SPReel) return 0;
    window.SPReel.STAGES.bhava = S_bhava;
    var n = 0;
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
    classesOf: classesOf, bhavaStory: bhavaStory, asStory: asStory,
    keys: function () { return MADE.slice(); }
  };
  if (window.SPStories && window.SPReel) publish();
  else if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", function () { publish(); });
  else setTimeout(publish, 0);
})();
