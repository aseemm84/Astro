/* ===== Studio Pro — the node registry ====================================

   WHAT THIS FILE IS. Every quantity this site can compute, exposed as a node
   with a stable id, a domain, and — the part that matters — a declared SHAPE.
   Nothing here draws. The shape is what lets a drawing engine that has never
   heard of "Bhṛgu Bindu" put it on a ring correctly, because what it is told
   is "this is a longitude", not "this is Bhṛgu Bindu".

   WHY SHAPES RATHER THAN SCENES. A studio built as a list of scenes can only
   show what somebody wrote a scene for: six hundred data points and thirteen
   scenes is six hundred and thirteen things. Six hundred points that each
   declare which of ten shapes they can take, matched against composers that
   accept shapes, is every combination of them that makes geometric sense —
   which is the difference between a gallery and a studio.

   The shapes:

     lon      one longitude on the 360° ecliptic (optionally with an arc)
     lonset   several of them, named
     scalar   one magnitude, with units and a comparable maximum
     sset     several magnitudes that belong on one axis
     lanes    a division of the circle, or of one sign, into equal arcs
     edges    pairs with a stated relation between them
     span     an interval of time
     spanset  several, sequential or nested
     series   a quantity as a function of the instant
     grid     a table of numbers with named rows and columns

   WHERE THE DATA COMES FROM. The engine's own chart object, exactly as
   buildLocalChart returns it — not the report page's derived object. derive()
   lives inside the report bundle's scope and is not reachable from another
   page, and loading a megabyte of report code to read a few fields would be a
   poor trade for a page that has to work on a phone over local wifi. So every
   reader here goes to the raw chart, and the few derived quantities this page
   needs (house numbers, dispositors, the Viṃśottarī sequence) are computed
   below from it.

   THE ONE DUPLICATION, AND HOW IT IS HELD. The Viṃśottarī daśā is computed
   here as well as in the report bundle. Two implementations of the same thing
   will drift, so there is a test — sp-verify.mjs — that builds the same chart
   both ways and asserts the two sequences agree to the day. That is the deal:
   a second copy is allowed only with a test pinning it to the first.

   HONESTY RULE. A node whose value cannot be computed returns null, and the
   command wall shows it greyed. It is never filled with a plausible number.
   Several things asked for are absent for exactly that reason, and SP_ABSENT
   at the foot lists them with why, so the page can show the list rather than
   quietly omitting them.

   CONTEXT. Every get() takes one object:
     C.J      the engine chart, or null when no birth data is stored
     C.when   the instant the page is pointed at, in ms
     C.place  {name, lat, lon, tz}
     C.day    the pañcāṅga day object for C.when, or null
   so a node is a pure function of that: the same node answers for a birth
   chart, for now, and for any instant the scrubber is dragged to. */

(function () {
  "use strict";

  /* The engine keys every graha by its IAST name and so does this file. The
     ephemeris wants English, so one map, in one direction, used only at the
     boundary. */
  var SA = ["Sūrya", "Candra", "Maṅgala", "Budha", "Guru", "Śukra", "Śani",
            "Rāhu", "Ketu"];
  var EN = { "Sūrya": "Sun", "Candra": "Moon", "Maṅgala": "Mars",
             "Budha": "Mercury", "Guru": "Jupiter", "Śukra": "Venus",
             "Śani": "Saturn", "Rāhu": "Rahu", "Ketu": "Ketu" };
  var RASHI = ["Meṣa", "Vṛṣabha", "Mithuna", "Karka", "Siṃha", "Kanyā", "Tulā",
               "Vṛścika", "Dhanus", "Makara", "Kumbha", "Mīna"];
  var NAK = ["Aśvinī", "Bharaṇī", "Kṛttikā", "Rohiṇī", "Mṛgaśira", "Ārdrā",
             "Punarvasu", "Puṣya", "Āśleṣā", "Maghā", "P.Phalgunī", "U.Phalgunī",
             "Hasta", "Citrā", "Svātī", "Viśākhā", "Anurādhā", "Jyeṣṭhā", "Mūla",
             "P.Āṣāḍhā", "U.Āṣāḍhā", "Śravaṇa", "Dhaniṣṭhā", "Śatabhiṣā",
             "P.Bhādrapada", "U.Bhādrapada", "Revatī"];
  var LORD = ["Maṅgala", "Śukra", "Budha", "Candra", "Sūrya", "Budha", "Śukra",
              "Maṅgala", "Guru", "Śani", "Śani", "Guru"];
  var BHAVA_OF = ["body and self", "wealth, family, speech", "courage, siblings",
    "home, mother, land", "learning, children", "illness, debt, enemies",
    "spouse and partnership", "longevity, the hidden", "fortune and dharma",
    "work and standing", "gains", "loss, expense, release"];
  /* The Viṃśottarī table. Nine lords in a fixed order with fixed year counts,
     and the nakṣatra sequence that repeats every nine. BPHS gives the 120-year
     scheme; these are its numbers. */
  var VSEQ = ["Ketu", "Śukra", "Sūrya", "Candra", "Maṅgala", "Rāhu", "Guru",
              "Śani", "Budha"];
  var VY = { "Ketu": 7, "Śukra": 20, "Sūrya": 6, "Candra": 10, "Maṅgala": 7,
             "Rāhu": 18, "Guru": 16, "Śani": 19, "Budha": 17 };
  /* The year the 120 are counted in.
     sp-verify caught this: the report bundle uses 365.2564, the sidereal year,
     and an earlier draft of this file used 365.2425 — a difference of 1.66
     days by the end of the sequence, which is two pages of this site giving
     two different daśā dates for one chart. Which year length Viṃśottarī
     intends is a real question and not one this file should answer on its own;
     what is NOT negotiable is that the site answers it once. So this matches
     the engine's existing choice, and the test holds them together. */
  var DPY = 365.2564;

  function norm(x) { return ((x % 360) + 360) % 360; }
  function num(x) { return (typeof x === "number" && isFinite(x)) ? x : null; }
  function jdToMs(jd) { return (jd - 2440587.5) * 86400000; }

  /* ---- shape constructors, so a typo in a kind string cannot ship -------- */
  function lon(deg, label, tone, arc) {
    var d = num(deg); if (d == null) return null;
    var v = { kind: "lon", deg: norm(d), label: label, tone: tone || "gold" };
    if (arc) v.arc = arc;
    return v;
  }
  function lonset(items, label) {
    var it = (items || []).filter(function (x) { return x && num(x.deg) != null; });
    return it.length ? { kind: "lonset", items: it, label: label } : null;
  }
  function scalar(v, unit, label, max, work) {
    var n = num(v); return n == null ? null
      : { kind: "scalar", v: n, unit: unit, label: label, max: num(max), work: work };
  }
  function sset(items, unit, label, max) {
    var it = (items || []).filter(function (x) { return x && num(x.v) != null; });
    return it.length ? { kind: "sset", items: it, unit: unit, label: label,
                         max: num(max) } : null;
  }
  function lanes(n, names, label, of, signIdx) {
    if (!n || n < 2) return null;
    return { kind: "lanes", n: n, size: (of === "sign" ? 30 : 360) / n,
             names: names || null, label: label, of: of || "circle",
             signIdx: signIdx == null ? null : signIdx };
  }
  function edges(items, label) {
    var it = (items || []).filter(function (e) {
      return e && num(e.a) != null && num(e.b) != null; });
    return it.length ? { kind: "edges", items: it, label: label } : null;
  }
  function span(from, to, label) {
    return (num(from) == null || num(to) == null || to <= from) ? null
      : { kind: "span", from: from, to: to, label: label };
  }
  function spanset(items, label, nested) {
    var it = (items || []).filter(function (s) {
      return s && num(s.from) != null && num(s.to) != null && s.to > s.from; });
    return it.length ? { kind: "spanset", items: it, label: label,
                         nested: !!nested } : null;
  }
  function series(at, unit, label, range) {
    return typeof at !== "function" ? null
      : { kind: "series", at: at, unit: unit, label: label, range: range || null };
  }
  /* A chart: twelve cells, each a sign, a house number and what stands in it.

     This is the one shape that is not geometry on a circle. A kundli is the
     form every Jyotiṣa reader recognises before they read a word of it, and a
     studio for this subject that could not draw one would be a strange studio.
     The cells carry the SIGN and the HOUSE separately, because the North
     Indian diagram fixes the houses and rotates the signs through them while
     the South Indian fixes the signs and moves the house numbers — the same
     data, two conventions, and a shape that kept only one of them could not
     draw both. */
  function houses(lagnaSign, cells, label, from) {
    var ok = (cells || []).filter(function (c) { return c && c.sign != null; });
    return ok.length === 12
      ? { kind: "houses", lagna: lagnaSign, cells: ok, label: label,
          from: from || "Lagna" }
      : null;
  }
  function grid(rows, cols, label, max) {
    var r = (rows || []).filter(function (x) { return x && x.vals; });
    return r.length ? { kind: "grid", rows: r, cols: cols, label: label,
                        max: num(max) } : null;
  }

  /* ---- readers over the raw chart, each tolerant of its absence --------- */
  function G(C, sa) {
    if (!C.J || !C.J.grahas) return null;
    for (var i = 0; i < C.J.grahas.length; i++)
      if (C.J.grahas[i].key === sa) return C.J.grahas[i];
    return null;
  }
  function natalLon(C, sa) { var g = G(C, sa); return g ? g.sidereal_deg : null; }
  function liveLon(C, sa) {
    try { return window.__kSidAt(EN[sa], new Date(C.when)); } catch (e) { return null; }
  }
  /* natal when there is a chart, live when there is not — so a node answers in
     both modes and the page never shows an empty wall for a visitor with no
     birth data stored */
  function anyLon(C, sa) {
    var n = natalLon(C, sa); return n == null ? liveLon(C, sa) : n;
  }
  function lagnaSign(C) {
    return (C.J && C.J.lagna && C.J.lagna.rashi) ? C.J.lagna.rashi.idx : null;
  }
  function houseOf(C, signIdx) {
    var L = lagnaSign(C);
    return (L == null || signIdx == null) ? null : ((signIdx - L) % 12 + 12) % 12 + 1;
  }
  /* The ṣaḍbala table names grahas in English while every other part of the
     engine uses IAST, so a comparison chart built from it came out reading
     "Saturn, Moon, Jupiter" beside a ring labelled "Śani, Candra, Guru". One
     map, applied where the table is read. */
  var SA_OF_EN = {};
  SA.forEach(function (s2) { SA_OF_EN[EN[s2]] = s2; });
  function saName(x) { return SA_OF_EN[x] || x; }
  function sbOf(C, sa) {
    var sb = C.J && C.J.shadbala && C.J.shadbala.planets;
    if (!sb) return null;
    for (var i = 0; i < sb.length; i++) {
      /* shadbala rows name the graha in English on some builds and IAST on
         others; match either rather than returning nothing on a rename */
      if (sb[i].graha === sa || sb[i].graha === EN[sa]) return sb[i];
    }
    return null;
  }

  /* The Viṃśottarī sequence from the Moon. See the note at the head of the
     file: this duplicates the report bundle's version and sp-verify.mjs
     asserts the two agree to the day. */
  function vimshottari(C) {
    var mn = natalLon(C, "Candra");
    if (mn == null || !C.J || C.J.jd_utc == null) return null;
    var seg = 40 / 3, m = norm(mn), ni = Math.floor(m / seg);
    var lord = VSEQ[ni % 9], frac = (m - ni * seg) / seg;
    var out = [], jd = C.J.jd_utc, i0 = VSEQ.indexOf(lord);
    for (var i = 0; i < 9; i++) {
      var lo = VSEQ[(i0 + i) % 9];
      var yr = (i === 0) ? VY[lord] * (1 - frac) : VY[lo];
      out.push({ lord: lo, start: jd, end: jd + yr * DPY, years: yr });
      jd += yr * DPY;
    }
    return { nak: NAK[ni], lord: lord, frac: frac, list: out };
  }
  function antars(md) {
    var out = [], s = md.start, j0 = VSEQ.indexOf(md.lord);
    for (var i = 0; i < 9; i++) {
      var l = VSEQ[(j0 + i) % 9], ay = VY[md.lord] * VY[l] / 120;
      out.push({ lord: l, start: s, end: s + ay * DPY, years: ay });
      s += ay * DPY;
    }
    return out;
  }
  function currentMd(C) {
    var V = vimshottari(C); if (!V) return null;
    var nowJd = C.when / 86400000 + 2440587.5, cur = null;
    V.list.forEach(function (m) { if (nowJd >= m.start && nowJd < m.end) cur = m; });
    return cur;
  }

  var N = [];
  function add(id, dom, label, hint, roles, get) {
    N.push({ id: id, dom: dom, label: label, hint: hint, roles: roles, get: get });
  }

  /* =======================================================================
     SKY — the nine grahas, each in several facets
     ======================================================================= */
  SA.forEach(function (sa) {
    add("sky.lon." + sa, "sky", sa, "sidereal longitude", ["lon"], function (C) {
      return lon(anyLon(C, sa), sa, sa === "Sūrya" ? "gold" : "glow");
    });
    add("sky.now." + sa, "sky", sa + " now",
        "where it stands at this instant, chart or no chart", ["lon"],
        function (C) { return lon(liveLon(C, sa), sa + " now", "glow"); });
    if (sa !== "Rāhu" && sa !== "Ketu") {
      add("sky.lat." + sa, "sky", sa + " śara",
          "ecliptic latitude — what settles a planetary war", ["scalar", "series"],
          function (C) {
        var g = G(C, sa);
        if (g && g.ecliptic_latitude_deg != null)
          return scalar(g.ecliptic_latitude_deg, "°", sa + " śara", 8,
                        "geocentric ecliptic latitude");
        var e = null;
        try { e = window.__kEclip(EN[sa], C.when); } catch (x) {}
        return e ? scalar(e.lat, "°", sa + " śara", 8, "geocentric") : null;
      });
      add("sky.decl." + sa, "sky", sa + " krānti",
          "declination — north or south of the celestial equator",
          ["scalar", "series"], function (C) {
        var q = null;
        try { q = window.__kEquator(EN[sa], C.when, C.place.lat, C.place.lon); }
        catch (x) {}
        return q ? scalar(q.dec, "°", sa + " krānti", 25, "declination") : null;
      });
      add("sky.speed." + sa, "sky", sa + " speed",
          "degrees a day — negative is retrograde", ["scalar", "series"],
          function (C) {
        var g = G(C, sa);
        if (g && g.speed_deg_per_day != null)
          return scalar(g.speed_deg_per_day, "°/day", sa + " speed", 16,
                        g.retrograde ? "retrograde" : "direct");
        var a = liveLon(C, sa), b = null;
        try { b = window.__kSidAt(EN[sa], new Date(C.when + 86400000)); } catch (x) {}
        if (a == null || b == null) return null;
        var d = norm(b - a); if (d > 180) d -= 360;
        return scalar(d, "°/day", sa + " speed", 16, "a day of longitude");
      });
      add("sky.dist." + sa, "sky", sa + " distance", "geocentric distance",
          ["scalar", "series"], function (C) {
        var k = null;
        try { k = window.__kDist(EN[sa], C.when); } catch (x) {}
        return k == null ? null : scalar(k, "km", sa + " distance", null,
                                         "geocentric");
      });
    }
    if (sa !== "Sūrya" && sa !== "Rāhu" && sa !== "Ketu") {
      add("sky.asta." + sa, "sky", sa + " from Sūrya",
          "the elongation combustion is judged by", ["scalar", "series"],
          function (C) {
        var g = G(C, sa);
        if (g && g.sun_separation_deg != null)
          return scalar(g.sun_separation_deg, "°", sa + " from Sūrya", 180,
                        g.combust ? "combust" : "not combust");
        var a = anyLon(C, sa), s = anyLon(C, "Sūrya");
        if (a == null || s == null) return null;
        var d = norm(a - s); if (d > 180) d = 360 - d;
        return scalar(d, "°", sa + " from Sūrya", 180, "separation");
      });
    }
  });

  add("sky.all", "sky", "All nine grahas", "every graha at once", ["lonset"],
      function (C) {
    return lonset(SA.map(function (sa) {
      var d = anyLon(C, sa);
      return d == null ? null
        : { deg: d, label: sa, tone: sa === "Sūrya" ? "gold" : "glow" };
    }).filter(Boolean), "the nine");
  });
  add("sky.elong", "sky", "Sūrya to Candra",
      "the angle every tithi and karaṇa is cut from", ["scalar", "series"],
      function (C) {
    var m = anyLon(C, "Candra"), s = anyLon(C, "Sūrya");
    if (m == null || s == null) return null;
    return scalar(norm(m - s), "°", "elongation", 360,
                  "Candra " + norm(m).toFixed(2) + "° − Sūrya " +
                  norm(s).toFixed(2) + "°");
  });
  add("sky.yuddha", "sky", "Graha Yuddha",
      "tārā grahas within a degree of each other", ["edges"], function (C) {
    var out = [];
    for (var i = 2; i < 7; i++) for (var j = i + 1; j < 7; j++) {
      var a = anyLon(C, SA[i]), b = anyLon(C, SA[j]);
      if (a == null || b == null) continue;
      var d = norm(a - b); if (d > 180) d = 360 - d;
      if (d < 1) out.push({ a: a, b: b, aLabel: SA[i], bLabel: SA[j],
                            why: d.toFixed(3) + "° apart — a war" });
    }
    return edges(out, "graha yuddha");
  });
  add("sky.retro", "sky", "Retrograde now",
      "whichever grahas are moving backwards", ["lonset"], function (C) {
    var out = [];
    SA.slice(2, 7).forEach(function (sa) {
      var g = G(C, sa), retro = g ? g.retrograde : null;
      if (retro == null) {
        var a = liveLon(C, sa), b = null;
        try { b = window.__kSidAt(EN[sa], new Date(C.when + 86400000)); } catch (x) {}
        if (a != null && b != null) {
          var d = norm(b - a); if (d > 180) d -= 360;
          retro = d < 0;
        }
      }
      if (retro) {
        var deg = anyLon(C, sa);
        if (deg != null) out.push({ deg: deg, label: sa + " ℞", tone: "gold" });
      }
    });
    return lonset(out, "retrograde");
  });

  /* =======================================================================
     RĀŚI, BHĀVA, and the geometry of the circle
     ======================================================================= */
  add("geo.rashis", "rashi", "The twelve rāśis", "30° each", ["lanes"],
      function () { return lanes(12, RASHI, "rāśi", "circle"); });
  add("geo.naks", "nakshatra", "The twenty-seven nakṣatras", "13°20′ each",
      ["lanes"], function () { return lanes(27, NAK, "nakṣatra", "circle"); });
  add("geo.padas", "nakshatra", "The hundred and eight pādas", "3°20′ each",
      ["lanes"], function () { return lanes(108, null, "pāda", "circle"); });
  add("geo.kakshya", "ashtakavarga", "Kakṣyā lanes",
      "eight 3°45′ lanes inside one sign", ["lanes"], function () {
    return lanes(8, ["Śani", "Guru", "Maṅgala", "Sūrya", "Śukra", "Budha",
                     "Candra", "Lagna"], "kakṣyā", "sign");
  });
  add("geo.navamsa", "varga", "Navāṃśa division", "nine to a sign, 3°20′",
      ["lanes"], function () { return lanes(9, null, "navāṃśa", "sign"); });
  add("geo.d60", "varga", "Ṣaṣṭyāṃśa division", "sixty to a sign, 30′",
      ["lanes"], function () { return lanes(60, null, "ṣaṣṭyāṃśa", "sign"); });
  add("geo.drekkana", "varga", "Drekkāṇa division", "three to a sign, 10°",
      ["lanes"], function () { return lanes(3, null, "drekkāṇa", "sign"); });

  RASHI.forEach(function (r, i) {
    add("rashi." + i, "rashi", r, "the 30° arc and what stands in it",
        ["lon"], function (C) {
      var occ = SA.filter(function (sa) {
        var d = anyLon(C, sa);
        return d != null && Math.floor(norm(d) / 30) === i;
      });
      var h = houseOf(C, i);
      return lon(i * 30 + 15,
                 r + (h ? " · bhāva " + h : "") +
                 (occ.length ? " · " + occ.join(", ") : ""),
                 "dim", { from: i * 30, to: i * 30 + 30 });
    });
  });
  NAK.forEach(function (nm, i) {
    add("nak." + i, "nakshatra", nm, "the 13°20′ arc", ["lon"], function () {
      return lon(i * (40 / 3) + (20 / 3), nm, "dim",
                 { from: i * (40 / 3), to: (i + 1) * (40 / 3) });
    });
  });

  for (var hh = 1; hh <= 12; hh++) (function (hn) {
    add("bhava." + hn, "bhava", "Bhāva " + hn, BHAVA_OF[hn - 1], ["lon"],
        function (C) {
      if (!C.J || !C.J.bhavas) return null;
      var b = C.J.bhavas[hn - 1]; if (!b || !b.rashi) return null;
      var s = b.rashi.idx;
      return lon(s * 30 + 15,
                 "Bhāva " + hn + " · " + RASHI[s] +
                 (b.occupants && b.occupants.length ? " · " + b.occupants.join(", ") : ""),
                 "dim", { from: s * 30, to: s * 30 + 30 });
    });
    add("bhava.lord." + hn, "bhava", "Lord of bhāva " + hn,
        "where that house's ruler actually stands", ["lon"], function (C) {
      if (!C.J || !C.J.bhavas) return null;
      var b = C.J.bhavas[hn - 1]; if (!b || !b.ruler) return null;
      var d = natalLon(C, b.ruler);
      return lon(d, b.ruler + " — lord of " + hn, "gold");
    });
  })(hh);

  add("bhava.rising", "rashi", "Oblique ascension",
      "how long each rāśi takes to rise at this latitude", ["sset"],
      function (C) {
    var rt = C.J && C.J.rashi_rising_times && C.J.rashi_rising_times.rashis;
    if (!rt || !rt.length) return null;
    return sset(rt.map(function (r) {
      return { k: r.rashi, v: r.rising_minutes,
               work: r.share_of_day_percent != null
                 ? r.share_of_day_percent.toFixed(2) + "% of the day" : null };
    }), "min", "rising times");
  });
  add("bhava.bhayat", "bhava", "Bhayāt and Bhabhoga",
      "how far through its nakṣatra the Moon stood at birth", ["sset"],
      function (C) {
    var b = C.J && C.J.bhayat; if (!b) return null;
    return sset([{ k: "Bhayāt", v: b.bhayat_ghatis },
                 { k: "Bhabhoga", v: b.bhabhoga_ghatis }], "ghaṭī",
                "bhayāt / bhabhoga");
  });

  /* =======================================================================
     VARGAS — every division, and every graha inside each
     ======================================================================= */
  function vargaOf(C, code) {
    if (!C.J || !C.J.vargas) return null;
    for (var i = 0; i < C.J.vargas.length; i++)
      if (C.J.vargas[i].varga === code) return C.J.vargas[i];
    return null;
  }
  var VCODES = ["D1", "D2", "D3", "D4", "D7", "D9", "D10", "D12", "D16", "D20",
                "D24", "D27", "D30", "D40", "D45", "D60"];
  VCODES.forEach(function (code) {
    add("varga.chart." + code, "varga", code,
        "the whole division as a wheel", ["lonset"], function (C) {
      var v = vargaOf(C, code); if (!v || !v.positions) return null;
      return lonset(SA.map(function (sa) {
        var s = v.positions[sa];
        return s == null ? null
          : { deg: s * 30 + 15, label: sa, tone: "glow" }; }).filter(Boolean),
        code + (v.en ? " · " + v.en : ""));
    });
    add("varga.kundli." + code, "chart", code + " as a kundli",
        "that division drawn as a chart", ["houses"], function (C) {
      var v = vargaOf(C, code);
      if (!v || !v.positions || v.lagna == null) return null;
      return chartFrom(C, v.lagna % 12, code + " chart", code + " lagna",
                       v.positions);
    });
    add("varga.lagna." + code, "varga", code + " lagna",
        "the rising sign of that division", ["lon"], function (C) {
      var v = vargaOf(C, code);
      return (!v || v.lagna == null) ? null
        : lon(v.lagna * 30 + 15, code + " lagna · " + RASHI[v.lagna % 12], "gold");
    });
  });
  add("varga.grid", "varga", "Every varga at once",
      "which sign each graha takes, division by division", ["grid"],
      function (C) {
    if (!C.J || !C.J.vargas || !C.J.vargas.length) return null;
    return grid(C.J.vargas.map(function (v) {
      return { k: v.varga, label: v.varga,
               vals: SA.map(function (sa) {
                 return v.positions ? v.positions[sa] : null; }) };
    }), SA, "vargas", 11);
  });
  add("varga.vargottama", "varga", "Vargottama",
      "the grahas holding the same sign in D1 and D9", ["lonset"], function (C) {
    var d1 = vargaOf(C, "D1"), d9 = vargaOf(C, "D9");
    if (!d1 || !d9) return null;
    return lonset(SA.map(function (sa) {
      if (d1.positions[sa] == null || d1.positions[sa] !== d9.positions[sa])
        return null;
      var d = natalLon(C, sa);
      return d == null ? null : { deg: d, label: sa + " vargottama", tone: "gold" };
    }).filter(Boolean), "vargottama");
  });

  /* =======================================================================
     THE CHART ITSELF — read from Lagna, from Candra, from Sūrya, and in
     every varga. The three reference points are the Sudarśana Cakra: the
     same twelve grahas judged from three different first houses, which is a
     definition rather than a table and so is safe to derive here.
     ======================================================================= */
  function chartFrom(C, firstSign, label, from, positions) {
    if (firstSign == null) return null;
    var cells = [];
    for (var i = 0; i < 12; i++) {
      var sign = (firstSign + i) % 12;
      cells.push({ sign: sign, house: i + 1, items: [] });
    }
    SA.forEach(function (sa) {
      var sg = null;
      if (positions) sg = positions[sa];
      else { var d = natalLon(C, sa); sg = d == null ? null : Math.floor(norm(d) / 30); }
      if (sg == null) return;
      var h = ((sg - firstSign) % 12 + 12) % 12;
      var g = positions ? null : G(C, sa);
      cells[h].items.push({ label: sa, retro: !!(g && g.retrograde),
                            tone: sa === "Sūrya" ? "gold" : "glow" });
    });
    return houses(firstSign, cells, label, from);
  }
  add("chart.d1", "chart", "The chart from Lagna",
      "twelve houses counted from the rising sign", ["houses"], function (C) {
    var L = lagnaSign(C);
    return chartFrom(C, L, "Rāśi chart", "Lagna");
  });
  add("chart.moon", "chart", "The chart from Candra",
      "the same grahas judged from the Moon's sign", ["houses"], function (C) {
    var m = natalLon(C, "Candra");
    return m == null ? null
      : chartFrom(C, Math.floor(norm(m) / 30), "Candra lagna", "Candra");
  });
  add("chart.sun", "chart", "The chart from Sūrya",
      "the same grahas judged from the Sun's sign", ["houses"], function (C) {
    var d = natalLon(C, "Sūrya");
    return d == null ? null
      : chartFrom(C, Math.floor(norm(d) / 30), "Sūrya lagna", "Sūrya");
  });
  add("chart.sudarshana", "chart", "Sudarśana — all three",
      "Lagna, Candra and Sūrya as three rings of the same chart",
      ["houseset"], function (C) {
    var L = lagnaSign(C), m = natalLon(C, "Candra"), s = natalLon(C, "Sūrya");
    if (L == null || m == null || s == null) return null;
    var three = [chartFrom(C, L, "from Lagna", "Lagna"),
                 chartFrom(C, Math.floor(norm(m) / 30), "from Candra", "Candra"),
                 chartFrom(C, Math.floor(norm(s) / 30), "from Sūrya", "Sūrya")];
    if (three.some(function (x) { return !x; })) return null;
    return { kind: "houseset", items: three, label: "Sudarśana Cakra" };
  });
  add("chart.transit", "chart", "The sky now, as a chart",
      "transiting grahas in houses from the natal Lagna", ["houses"],
      function (C) {
    var L = lagnaSign(C); if (L == null) return null;
    var pos = {};
    SA.forEach(function (sa) {
      var d = liveLon(C, sa);
      if (d != null) pos[sa] = Math.floor(norm(d) / 30); });
    return chartFrom(C, L, "Gocara — transits now", "Lagna", pos);
  });

  /* =======================================================================
     STRENGTH — the ṣaḍbala components, each a real column of the engine
     ======================================================================= */
  var SBCOL = [
    ["sthana", "Sthāna Bala", "positional strength"],
    ["dig", "Dig Bala", "directional strength"],
    ["kala", "Kāla Bala", "temporal strength"],
    ["cheshta", "Ceṣṭā Bala", "motional strength"],
    ["naisargika", "Naisargika Bala", "natural strength"],
    ["drik", "Dṛk Bala", "aspectual strength"],
    ["uchcha", "Uccha Bala", "distance from debilitation"],
    ["saptavargaja", "Saptavargaja Bala", "dignity across seven vargas"],
    ["ojha", "Ojhayugma Bala", "odd and even signs"],
    ["kendradi", "Kendrādi Bala", "kendra, paṇaphara, āpoklima"],
    ["drekkana", "Drekkāṇa Bala", "by third of a sign"],
    ["nathonnatha", "Nathonnatha Bala", "day and night"],
    ["paksha", "Pakṣa Bala", "waxing and waning"],
    ["tribhaga", "Tribhāga Bala", "by third of day or night"],
    ["ayana", "Ayana Bala", "by declination"],
    ["total_rupa", "Ṣaḍbala total", "the six added, in rūpas"],
    ["required_rupa", "Required", "the classical minimum for that graha"],
    ["ratio", "Strength ratio", "total against the minimum"]
  ];
  SBCOL.forEach(function (col) {
    add("bala." + col[0], "bala", col[1], col[2], ["sset"], function (C) {
      var sb = C.J && C.J.shadbala && C.J.shadbala.planets;
      if (!sb || !sb.length) return null;
      var unit = (col[0] === "ratio") ? "×"
               : (col[0].indexOf("rupa") >= 0 ? "rūpa" : "virūpa");
      return sset(sb.map(function (r) {
        return { k: saName(r.graha), v: r[col[0]] }; }), unit, col[1]);
    });
  });
  add("bala.vsRequired", "bala", "Ṣaḍbala against its minimum",
      "each graha's total beside what it is required to reach", ["grid"],
      function (C) {
    var sb = C.J && C.J.shadbala && C.J.shadbala.planets;
    if (!sb || !sb.length) return null;
    return grid(sb.map(function (r) {
      return { k: saName(r.graha), label: saName(r.graha),
               vals: [r.total_rupa, r.required_rupa] }; }),
      ["total", "required"], "ṣaḍbala vs minimum", 12);
  });
  add("bala.dignity", "bala", "Dignity",
      "exalted, own, friendly, debilitated — as the engine ranks it", ["sset"],
      function (C) {
    if (!C.J || !C.J.grahas) return null;
    var RANK = { "exalted": 5, "moolatrikona": 4, "mūlatrikoṇa": 4, "own": 4,
                 "own sign": 4, "great friend": 3, "friend": 3, "neutral": 2,
                 "enemy": 1, "great enemy": 1, "debilitated": 0 };
    return sset(C.J.grahas.map(function (g) {
      var d = (g.dignity || "").toLowerCase(), v = null;
      Object.keys(RANK).forEach(function (k) { if (d.indexOf(k) >= 0) v = RANK[k]; });
      return { k: g.key, v: v, work: g.dignity }; }), "rank", "dignity", 5);
  });
  add("bala.avastha", "bala", "Avasthās",
      "the engine's avasthā and its strength percentage", ["sset"],
      function (C) {
    var av = C.J && C.J.avasthas; if (!av || !av.length) return null;
    return sset(av.map(function (a) {
      return { k: saName(a.graha), v: a.strength_percent, work: a.avastha_iast }; }),
      "%", "avasthā", 100);
  });

  /* ---- relations between grahas, each from a stated rule ---------------- */
  add("rel.dispositor", "bala", "Dispositor chain",
      "each graha to the lord of the sign it stands in", ["edges"],
      function (C) {
    if (!C.J || !C.J.grahas) return null;
    return edges(C.J.grahas.map(function (g) {
      if (!g.rashi) return null;
      var dl = LORD[g.rashi.idx];
      if (dl === g.key) return null;
      var d = natalLon(C, dl); if (d == null) return null;
      return { a: g.sidereal_deg, b: d, aLabel: g.key, bLabel: dl,
               why: "in " + RASHI[g.rashi.idx] + ", which " + dl + " rules" };
    }).filter(Boolean), "dispositors");
  });
  /* Parivartana is a definition, not a table — two grahas each in the other's
     sign — so deriving it recalls nothing. */
  add("rel.parivartana", "bala", "Parivartana",
      "two grahas standing in each other's sign", ["edges"], function (C) {
    if (!C.J || !C.J.grahas) return null;
    var out = [];
    C.J.grahas.forEach(function (a) {
      C.J.grahas.forEach(function (b) {
        if (!a.rashi || !b.rashi || a.key >= b.key) return;
        if (LORD[a.rashi.idx] === b.key && LORD[b.rashi.idx] === a.key)
          out.push({ a: a.sidereal_deg, b: b.sidereal_deg,
                     aLabel: a.key, bLabel: b.key,
                     why: "an exchange of signs" });
      });
    });
    return edges(out, "parivartana");
  });
  add("rel.drishti", "bala", "Graha Dṛṣṭi",
      "who aspects whom — the seventh for all, plus the BPHS specials",
      ["edges"], function (C) {
    if (!C.J || !C.J.grahas) return null;
    var SPECIAL = { "Maṅgala": [4, 8], "Guru": [5, 9], "Śani": [3, 10] };
    var out = [];
    C.J.grahas.forEach(function (a) {
      C.J.grahas.forEach(function (b) {
        if (!a.rashi || !b.rashi || a.key === b.key) return;
        var h = ((b.rashi.idx - a.rashi.idx) % 12 + 12) % 12 + 1;
        if ([7].concat(SPECIAL[a.key] || []).indexOf(h) >= 0)
          out.push({ a: a.sidereal_deg, b: b.sidereal_deg,
                     aLabel: a.key, bLabel: b.key,
                     why: a.key + " aspects the " + h + "th" });
      });
    });
    return edges(out, "graha dṛṣṭi");
  });
  add("rel.rashiDrishti", "rashi", "Rāśi Dṛṣṭi",
      "movable to fixed, fixed to movable, dual to dual", ["edges"],
      function (C) {
    if (!C.J || !C.J.grahas) return null;
    var out = [];
    C.J.grahas.forEach(function (a) {
      C.J.grahas.forEach(function (b) {
        if (!a.rashi || !b.rashi || a.key >= b.key) return;
        var x = a.rashi.idx, y = b.rashi.idx, mx = x % 3, my = y % 3;
        var ok = (mx === 0 && my === 1 && ((y - x + 12) % 12) !== 1) ||
                 (mx === 1 && my === 0 && ((x - y + 12) % 12) !== 1) ||
                 (mx === 2 && my === 2 && x !== y);
        if (ok) out.push({ a: a.sidereal_deg, b: b.sidereal_deg,
                           aLabel: a.key, bLabel: b.key,
                           why: RASHI[x] + " sees " + RASHI[y] });
      });
    });
    return edges(out, "rāśi dṛṣṭi");
  });

  /* =======================================================================
     AṢṬAKAVARGA
     ======================================================================= */
  add("av.sav", "ashtakavarga", "Sarvāṣṭakavarga",
      "the twelve totals", ["sset"], function (C) {
    var av = C.J && C.J.ashtakavarga;
    if (!av || !av.sarva) return null;
    return sset(av.sarva.map(function (v, i) {
      var h = houseOf(C, i);
      return { k: RASHI[i], v: v, work: h ? "bhāva " + h : null }; }),
      "bindus", "sarvāṣṭakavarga", 56);
  });
  add("av.grid", "ashtakavarga", "Bhinnāṣṭakavarga, all seven",
      "each graha's own bindu row", ["grid"], function (C) {
    var av = C.J && C.J.ashtakavarga;
    if (!av || !av.bhinna) return null;
    return grid(av.bhinna.map(function (b) {
      return { k: saName(b.graha), label: b.graha_sa || saName(b.graha),
               vals: b.bindus }; }),
      RASHI, "bhinnāṣṭakavarga", 8);
  });
  add("av.sarvaTotal", "ashtakavarga", "Sarvāṣṭakavarga grand total",
      "the 337 the twelve should add to", ["scalar"], function (C) {
    var av = C.J && C.J.ashtakavarga;
    return (!av || av.sarva_total == null) ? null
      : scalar(av.sarva_total, "bindus", "sarva total", 400,
               "the twelve house totals added");
  });
  SA.slice(0, 7).forEach(function (sa) {
    add("av.bav." + sa, "ashtakavarga", sa + "'s bindus",
        "that graha's own aṣṭakavarga row", ["sset"], function (C) {
      var av = C.J && C.J.ashtakavarga;
      if (!av || !av.bhinna) return null;
      var row = null;
      av.bhinna.forEach(function (b) {
        if (b.graha === sa || b.graha_sa === sa) row = b; });
      if (!row || !row.bindus) return null;
      return sset(row.bindus.map(function (v, i) {
        return { k: RASHI[i], v: v }; }), "bindus", sa + " BAV", 8);
    });
  });

  /* =======================================================================
     TIME — daśās, and the cosmic cycles
     ======================================================================= */
  add("dasha.maha", "dasha", "Viṃśottarī mahādaśās",
      "the nine, opened by the Moon's birth nakṣatra", ["spanset"],
      function (C) {
    var V = vimshottari(C); if (!V) return null;
    return spanset(V.list.map(function (m) {
      return { from: jdToMs(m.start), to: jdToMs(m.end), label: m.lord }; }),
      "mahādaśā");
  });
  add("dasha.antar", "dasha", "Antardaśās of the running mahādaśā",
      "the nine inside the one in force", ["spanset"], function (C) {
    var cur = currentMd(C); if (!cur) return null;
    return spanset(antars(cur).map(function (a) {
      return { from: jdToMs(a.start), to: jdToMs(a.end), label: a.lord }; }),
      "antardaśā of " + cur.lord);
  });
  add("dasha.gears", "dasha", "Daśā gears",
      "mahādaśā and antardaśā as nested wheels", ["spanset"], function (C) {
    var V = vimshottari(C), cur = currentMd(C);
    if (!V || !cur) return null;
    var outer = V.list.map(function (m) {
      return { from: jdToMs(m.start), to: jdToMs(m.end), label: m.lord, ring: 0 }; });
    var inner = antars(cur).map(function (a) {
      return { from: jdToMs(a.start), to: jdToMs(a.end), label: a.lord, ring: 1 }; });
    return spanset(outer.concat(inner), "daśā gears", true);
  });
  add("dasha.lord", "dasha", "Mahādaśā lord",
      "where the lord of the running period stands", ["lon"], function (C) {
    var cur = currentMd(C); if (!cur) return null;
    var d = natalLon(C, cur.lord);
    return lon(d, cur.lord + " — mahādaśā lord", "gold");
  });
  add("dasha.birthNak", "dasha", "Janma nakṣatra",
      "the Moon's nakṣatra, which opens the sequence", ["lon"], function (C) {
    var V = vimshottari(C); if (!V) return null;
    var m = natalLon(C, "Candra");
    return lon(m, V.nak + " · opens " + V.lord, "gold");
  });
  add("time.cosmic", "cosmic", "Vedic time",
      "where this moment sits in the Kali Yuga", ["sset"], function () {
    var V = null;
    try { V = (window.NP && window.NP.vedicTime) ? window.NP.vedicTime() : null; }
    catch (e) {}
    if (!V) return null;
    var rows = [];
    ["kaliElapsed", "kaliCurrent", "kaliRemaining"].forEach(function (k) {
      if (V[k] != null) rows.push({ k: k, v: V[k] }); });
    return sset(rows, "years", "vedic time");
  });

  /* =======================================================================
     JAIMINI and the special points
     ======================================================================= */
  add("jai.lagna", "jaimini", "Lagna", "the rising degree", ["lon"],
      function (C) {
    return (C.J && C.J.lagna)
      ? lon(C.J.lagna.sidereal_deg, "Lagna", "gold") : null;
  });
  add("jai.karakas", "jaimini", "Cara Kārakas",
      "the seven, ranked by degree within sign", ["lonset"], function (C) {
    var ck = C.J && C.J.chara_karakas;
    if (!ck || !ck.length) return null;
    return lonset(ck.map(function (k) {
      var d = natalLon(C, k.graha);
      return d == null ? null
        : { deg: d, label: k.label_short + " · " + k.graha, tone: "gold" };
    }).filter(Boolean), "cara kārakas");
  });
  add("jai.ak", "jaimini", "Ātmakāraka",
      "the graha at the highest degree in its sign", ["lon"], function (C) {
    var ck = C.J && C.J.chara_karakas;
    if (!ck || !ck.length) return null;
    var ak = null;
    ck.forEach(function (k) { if (k.rank === 1) ak = k; });
    if (!ak) return null;
    var d = natalLon(C, ak.graha);
    return lon(d, "AK · " + ak.graha, "gold");
  });
  add("jai.arudhas", "jaimini", "Arūḍha padas",
      "all twelve, AL through A12", ["lonset"], function (C) {
    var ar = C.J && C.J.arudhas;
    if (!ar || !ar.length) return null;
    return lonset(ar.map(function (a) {
      return a.arudha_rashi_idx == null ? null
        : { deg: a.arudha_rashi_idx * 30 + 15,
            label: a.arudha_label + " · " + a.arudha_rashi_sa, tone: "dim" };
    }).filter(Boolean), "arūḍha padas");
  });
  add("jai.al", "jaimini", "Arūḍha Lagna",
      "the image the first house throws", ["lon"], function (C) {
    var ar = C.J && C.J.arudhas;
    if (!ar || !ar.length) return null;
    var al = null;
    ar.forEach(function (a) { if (a.arudha_label === "AL") al = a; });
    return (al && al.arudha_rashi_idx != null)
      ? lon(al.arudha_rashi_idx * 30 + 15, "AL · " + al.arudha_rashi_sa, "gold")
      : null;
  });

  /* =======================================================================
     YOGAS — the engine tests eighty-two and reports which hold
     ======================================================================= */
  add("yoga.present", "yoga", "Yogas present",
      "the ones this chart actually satisfies", ["sset"], function (C) {
    var yg = C.J && C.J.yogas; if (!yg) return null;
    var on = yg.filter(function (y) { return y.present; });
    if (!on.length) return null;
    return sset(on.map(function (y) {
      return { k: y.iast || y.en || y.key, v: 1, work: y.detail || y.category };
    }), "", "yogas present", 1);
  });
  add("yoga.byCategory", "yoga", "Yogas by category",
      "how many of each kind hold", ["sset"], function (C) {
    var yg = C.J && C.J.yogas; if (!yg) return null;
    var cnt = {};
    yg.forEach(function (y) {
      if (!y.present) return;
      cnt[y.category || "other"] = (cnt[y.category || "other"] || 0) + 1; });
    var ks = Object.keys(cnt);
    if (!ks.length) return null;
    return sset(ks.map(function (k) { return { k: k, v: cnt[k] }; }),
                "yogas", "by category");
  });

  /* =======================================================================
     PAÑCĀṄGA — the day, at sunrise and at the instant
     ======================================================================= */
  add("pan.tithi", "panchanga", "Tithi", "elongation ÷ 12°", ["scalar"],
      function (C) {
    var m = anyLon(C, "Candra"), s = anyLon(C, "Sūrya");
    if (m == null || s == null) return null;
    var el = norm(m - s);
    return scalar(el / 12, "tithis", "tithi", 30, el.toFixed(2) + "° ÷ 12°");
  });
  add("pan.nak", "panchanga", "Nakṣatra", "Moon ÷ 13°20′", ["scalar"],
      function (C) {
    var m = anyLon(C, "Candra"); if (m == null) return null;
    return scalar(norm(m) / (40 / 3), "nakṣatras", "nakṣatra", 27,
                  norm(m).toFixed(2) + "° ÷ 13°20′");
  });
  add("pan.yoga", "panchanga", "Nitya Yoga", "(Sun + Moon) ÷ 13°20′",
      ["scalar"], function (C) {
    var m = anyLon(C, "Candra"), s = anyLon(C, "Sūrya");
    if (m == null || s == null) return null;
    return scalar(norm(m + s) / (40 / 3), "yogas", "nitya yoga", 27,
                  "(" + norm(s).toFixed(2) + "° + " + norm(m).toFixed(2) + "°) ÷ 13°20′");
  });
  add("pan.karana", "panchanga", "Karaṇa", "elongation ÷ 6°", ["scalar"],
      function (C) {
    var m = anyLon(C, "Candra"), s = anyLon(C, "Sūrya");
    if (m == null || s == null) return null;
    return scalar(norm(m - s) / 6, "karaṇas", "karaṇa", 60,
                  norm(m - s).toFixed(2) + "° ÷ 6°");
  });
  add("pan.fiveLimbs", "panchanga", "The five limbs, with the working",
      "four of the five from the same two numbers", ["sset"], function (C) {
    var m = anyLon(C, "Candra"), s = anyLon(C, "Sūrya");
    if (m == null || s == null) return null;
    var el = norm(m - s), sum = norm(m + s);
    return sset([
      { k: "Tithi", v: el / 12, work: el.toFixed(2) + "° ÷ 12°" },
      { k: "Karaṇa", v: el / 6, work: el.toFixed(2) + "° ÷ 6°" },
      { k: "Nakṣatra", v: norm(m) / (40 / 3), work: norm(m).toFixed(2) + "° ÷ 13°20′" },
      { k: "Nitya yoga", v: sum / (40 / 3), work: sum.toFixed(2) + "° ÷ 13°20′" }
    ], "index", "the five limbs", 60);
  });

  function dayWindow(id, label, hint, pick) {
    add(id, "panchanga", label, hint, ["span"], function (C) {
      if (!C.day) return null;
      var w = null;
      try { w = pick(C.day); } catch (e) {}
      return (w && w.from != null) ? span(w.from, w.to, label) : null;
    });
  }
  dayWindow("pan.rahu", "Rāhu Kāla", "the eighth part the tradition avoids",
            function (D) { return window.NP.rahuKala(D); });
  dayWindow("pan.brahma", "Brahma Muhūrta", "two muhūrtas before sunrise",
            function (D) { return window.NP.brahmaMuhurta(D); });
  add("pan.daylight", "panchanga", "Sunrise to sunset", "the daylight span",
      ["span"], function (C) {
    return (C.day && C.day.sunrise != null && C.day.sunset != null)
      ? span(C.day.sunrise, C.day.sunset, "daylight") : null;
  });
  /* Horā and choghaḍiyā answer "which one is running" by reading D.ms, which
     is right for a clock and wrong for a list. Asking the real functions once
     per slot with a copied day gets every slot from the implementation the
     rest of the site uses, rather than a second copy of the order tables. */
  function dayCopy(D, ms) {
    var o = {}; for (var k in D) if (D.hasOwnProperty(k)) o[k] = D[k];
    o.ms = ms; return o;
  }
  add("pan.horas", "panchanga", "The day's horās", "twenty-four from sunrise",
      ["spanset"], function (C) {
    var D = C.day;
    if (!D || D.sunrise == null || D.nextSunrise == null) return null;
    var sp = (D.nextSunrise - D.sunrise) / 24, out = [];
    for (var i = 0; i < 24; i++) {
      var h = null;
      try { h = window.NP.hora(dayCopy(D, D.sunrise + sp * (i + 0.5))); } catch (e) {}
      if (h) out.push({ from: h.from, to: h.to, label: h.lord });
    }
    return spanset(out, "horās");
  });
  add("pan.choghadiya", "panchanga", "Choghaḍiyā",
      "eight parts of the daylight", ["spanset"], function (C) {
    var D = C.day;
    if (!D || D.sunrise == null || D.sunset == null) return null;
    var part = (D.sunset - D.sunrise) / 8, out = [];
    for (var i = 0; i < 8; i++) {
      var c = null;
      try { c = window.NP.choghadiya(dayCopy(D, D.sunrise + part * (i + 0.5))); }
      catch (e) {}
      if (c && !c.night) out.push({ from: c.from, to: c.to, label: c.name });
    }
    return spanset(out, "choghaḍiyā");
  });
  add("pan.tara", "panchanga", "Tāra Bala",
      "the nine tāras across all twenty-seven birth stars", ["sset"],
      function (C) {
    if (!C.day) return null;
    var G2 = null;
    try { G2 = window.NP.taraGrid(C.day); } catch (e) {}
    if (!G2 || !G2.rows) return null;
    var RANK = { "Janma": 1, "Sampat": 3, "Vipat": 0, "Kshema": 3,
                 "Pratyari": 0, "Sadhaka": 3, "Vadha": 0, "Mitra": 3,
                 "Ati-Mitra": 3 };
    return sset(G2.rows.map(function (r) {
      return { k: r.name,
               v: r.tara ? (RANK[r.tara.name] != null ? RANK[r.tara.name] : 2) : null,
               work: r.tara ? r.tara.name : null }; }), "rank", "tāra bala", 3);
  });

  /* =======================================================================
     THE ALMANAC LEAF — the whole day packaged for the ornate card.

     One node rather than nine, because the card is a composition: it wants
     the five limbs AND the month AND the saṃvat AND the sunrise together or
     not at all, and a reader who had to select nine chips to get one card
     would reasonably give up.
     ======================================================================= */
  var MONTH_EN = ["January", "February", "March", "April", "May", "June",
                  "July", "August", "September", "October", "November", "December"];
  function hm(ms, tz) {
    if (ms == null) return null;
    var d = new Date(ms + (tz || 0) * 3600000);
    return ("0" + d.getUTCHours()).slice(-2) + ":" + ("0" + d.getUTCMinutes()).slice(-2);
  }
  add("day.almanac", "panchanga", "The almanac leaf",
      "the whole day as one ornate card — the five limbs, the month, the " +
      "saṃvat, the sunrise and the Moon", ["almanac"], function (C) {
    var D = C.day;
    if (!D || !D.at) return null;
    var tz = C.place.tz || 0;
    /* the four end times need the bisected day; ask for it once */
    var E = D;
    if (D.at.tithi.ends == null) {
      try { E = window.NP.day(C.when, C.place, { ends: true }) || D; } catch (e) {}
    }
    var g = D.gregorian || {};
    var mr = null, msd = null;
    try {
      mr = window.__kRiseSet("Moon", C.place.lat, C.place.lon, D.sunrise - 6 * 3600000, 2, +1);
      msd = window.__kRiseSet("Moon", C.place.lat, C.place.lon, D.sunrise - 6 * 3600000, 2, -1);
    } catch (e) {}
    var pk = E.at.tithi.paksha || "";
    var sv = D.samvat || {};
    function ends(t) { return t == null ? null : "ends " + hm(t, tz); }
    return {
      kind: "almanac",
      label: "almanac leaf",
      elongation: D.elongation,
      dateLine: (g.d || "") + " " + (MONTH_EN[(g.m || 1) - 1] || "") + " " + (g.y || ""),
      subLine: [D.vara, (D.masa && D.masa.amantaIAST) + " " + pk,
                (sv.vikrama ? sv.vikrama + " Vikrama" : null),
                C.place.name].filter(Boolean).join("  \u00b7  ")
               .replace(/ {2}\u00b7 {2}([^\u00b7]*)$/, "  |  $1"),
      rows: [
        { cols: [
          { icon: "lotus", label: "TITHI",
            value: pk + " " + E.at.tithi.name,
            detail: [ends(E.at.tithi.ends), E.at.tithi.n + " of 15"]
                      .filter(Boolean).join("  \u00b7  ") },
          { icon: "star", label: "NAK\u1e62ATRA", value: E.at.nak.name,
            detail: ["p\u0101da " + E.at.nak.pada, ends(E.at.nak.ends)]
                      .filter(Boolean).join("  \u00b7  ") } ] },
        { cols: [
          { icon: "om", label: "YOGA", value: E.at.yoga.name,
            detail: ends(E.at.yoga.ends) },
          { icon: "orbit", label: "KARA\u1e46A", value: E.at.karana.name,
            detail: ends(E.at.karana.ends) } ] },
        { cols: [
          { icon: "saturn", label: "M\u0100SA",
            value: (D.masa && D.masa.amantaIAST) || "",
            detail: "p\u016br\u1e47im\u0101nta " +
                    ((D.masa && D.masa.purnimantaIAST) || "") +
                    "  \u00b7  am\u0101nta " + ((D.masa && D.masa.amantaIAST) || "") },
          { icon: "planet", label: "\u1e5aTU & AYANA",
            value: (D.masa && D.masa.ritu) || "",
            detail: (D.masa && D.masa.ayana) || "" } ] },
        { cols: [
          { icon: "seal", label: "SA\u1e42VAT",
            value: (sv.vikrama ? sv.vikrama + " Vikrama" : ""),
            detail: sv.note ? sv.note.slice(0, 62) : null,
            detail2: sv.note && sv.note.length > 62 ? sv.note.slice(62) : null } ] },
        { cols: [
          { icon: "sunrise", label: "SUNRISE", value: hm(D.sunrise, tz) || "",
            detail: "sunset " + (hm(D.sunset, tz) || "") + "  \u00b7  " +
                    (D.riseConvLabel || "upper limb") },
          { icon: "moon", label: "MOON",
            value: mr != null ? "rise " + hm(mr, tz) : "no rise today",
            detail: msd != null ? "set " + hm(msd, tz) : null } ] }
      ]
    };
  });

  /* =======================================================================
     TRANSIT — the live sky, and the live sky against the natal one
     ======================================================================= */
  add("tr.all", "transit", "Transiting grahas", "the sky at this instant",
      ["lonset"], function (C) {
    return lonset(SA.map(function (sa) {
      var d = liveLon(C, sa);
      return d == null ? null : { deg: d, label: sa, tone: "glow" };
    }).filter(Boolean), "transits");
  });
  add("tr.vsNatal", "transit", "Transit against natal",
      "every graha paired with its own natal place", ["edges"], function (C) {
    if (!C.J) return null;
    return edges(SA.map(function (sa) {
      var t = liveLon(C, sa), n = natalLon(C, sa);
      if (t == null || n == null) return null;
      return { a: n, b: t, aLabel: sa + " natal", bLabel: sa + " now",
               why: norm(t - n).toFixed(1) + "° travelled since birth" };
    }).filter(Boolean), "transit against natal");
  });
  add("tr.relations", "transit", "Transit aspects to natal",
      "the engine's own list, with orbs", ["edges"], function (C) {
    var rel = C.J && C.J.current_phase && C.J.current_phase.transitRelations;
    if (!rel || !rel.length) return null;
    return edges(rel.map(function (r) {
      var t = liveLon(C, r.transit_graha), n = natalLon(C, r.natal_graha);
      if (t == null || n == null) return null;
      return { a: n, b: t, aLabel: r.natal_graha + " natal",
               bLabel: r.transit_graha + " now",
               why: r.aspect + ", orb " + (r.orb_deg != null
                    ? r.orb_deg.toFixed(2) + "°" : "—") +
                    (r.significance ? " · " + r.significance : "") };
    }).filter(Boolean), "transit aspects");
  });
  SA.forEach(function (sa) {
    add("tr.track." + sa, "transit", sa + " over time",
        "its longitude as a function of the instant", ["series"], function () {
      return series(function (ms) {
        try { return window.__kSidAt(EN[sa], new Date(ms)); }
        catch (e) { return null; }
      }, "°", sa + " longitude", [0, 360]);
    });
  });
  add("tr.elongSeries", "transit", "Elongation over time",
      "Sun to Moon, as the days run", ["series"], function () {
    return series(function (ms) {
      try {
        var m = window.__kSidAt("Moon", new Date(ms));
        var s = window.__kSidAt("Sun", new Date(ms));
        return (m == null || s == null) ? null : norm(m - s);
      } catch (e) { return null; }
    }, "°", "elongation", [0, 360]);
  });

  /* =======================================================================
     What is deliberately NOT here, and why. The page prints this.
     ======================================================================= */
  var ABSENT = [
    { what: "Puṣkara navāṃśa and Puṣkara bhāga",
      why: "needs a classical degree table no source in this build can supply" },
    { what: "Sarvatobhadra Cakra vedha points",
      why: "needs the traditional 9×9 layout; nothing here to read it from" },
    { what: "Jaimini Cara Daśā",
      why: "not implemented in the engine — a real gap, not a missing table" },
    { what: "Varṇada and Śrī Lagna",
      why: "not implemented in the engine" },
    { what: "Ṣaṣṭyāṃśa deity names",
      why: "the D60 division is computed; the sixty deity names are a table this build does not have" },
    { what: "The eight classical gatis by name",
      why: "speed is computed, and retrograde and direct are read straight off it — but the thresholds separating the eight are a table, so the names are not used" },
    { what: "Abhijit as a 28th nakṣatra",
      why: "its boundaries are a particular convention, not an equal division of the circle" },
    { what: "Real constellation figures",
      why: "needs IAU boundary and figure data the repository does not carry" },
    { what: "Śrīpati cusps, upagrahas and the derived points",
      why: "computed on the chart page, not carried in the portable chart object this page reads; re-deriving them here would be a second implementation free to disagree with the first" }
  ];

  var RC = { key: null, map: {} };

  window.SPNodes = {
    all: function () { return N.slice(); },
    byId: function (id) {
      for (var i = 0; i < N.length; i++) if (N[i].id === id) return N[i];
      return null;
    },
    /* RESOLVED VALUES ARE CACHED PER CONTEXT, not per frame.

       A node's value depends only on the context — the chart, the moment, the
       place, the span — and never on the playhead, so re-deriving it sixty
       times a second computes the same number sixty times. Auto mode already
       paid that; Director multiplies it by the number of layers, and some
       nodes are not cheap (a transit track over a century is thousands of
       ephemeris evaluations). The key is every field of the context a node is
       allowed to read, so changing the place or the moment invalidates
       everything, and nothing else does. */
    resolve: function (node, C) {
      if (!node) return null;
      var k = C ? (C.when + "|" + (C.place && C.place.n) + "|" +
                   (C.place && C.place.lat) + "," + (C.place && C.place.lon) + "|" +
                   C.spanDays + "|" + (C.J ? 1 : 0)) : "none";
      if (RC.key !== k) { RC.key = k; RC.map = {}; }
      if (RC.map.hasOwnProperty(node.id)) return RC.map[node.id];
      var v;
      try { v = node.get(C); } catch (e) { v = null; }
      RC.map[node.id] = v;
      return v;
    },
    cacheClear: function () { RC.key = null; RC.map = {}; },
    domains: function () {
      var seen = [];
      N.forEach(function (n) { if (seen.indexOf(n.dom) < 0) seen.push(n.dom); });
      return seen;
    },
    absent: ABSENT,
    vimshottari: vimshottari, antars: antars, currentMd: currentMd,
    SA: SA, EN: EN, RASHI: RASHI, NAK: NAK, LORD: LORD, norm: norm,
    houseOf: houseOf
  };
})();

/* ===== The almanac card — an ornate pañcāṅga leaf =========================

   Everything else this studio draws is a diagram: a ring, a bar, a spiral.
   This one is a PAGE — the printed almanac leaf, with a foliated arch over
   it, scroll-work in the corners, a sun medallion on the crown and the day's
   five limbs set in two columns. It is the only thing here whose job is to be
   beautiful first and legible second, because it is the card somebody keeps.

   DRAWN, NOT PLACED. There is no image file behind any of this. The arch is a
   half-ellipse with cusped foils computed along it; the corner flourishes are
   logarithmic spirals with leaves hung off them; the rosettes, the dividers
   and the nine row icons are all paths. That matters for a reason beyond
   tidiness: the card has to compose itself for any date, any place and any
   shape of frame, and a decorated PNG cannot stretch from 4:5 to 9:16 without
   tearing.

   THE ANIMATION, and what each part of it is for:

     the sun on the crown breathes and its corona turns, which gives the card
       a heartbeat without moving anything a reader is trying to read;

     a band of light sweeps down the leaf once per cycle and lifts each row
       into gold as it crosses it. This is the only part that is really doing
       work: it walks the eye down the five limbs in order, which is the order
       a pañcāṅga is read in, and it means a ten-second reel teaches the
       sequence rather than showing a static poster for ten seconds;

     sparks catch and fade on the gold work, seeded so they do not shimmer at
       random between frames;

     and the whole leaf drifts a fraction of a percent, because a perfectly
       still frame reads as a photograph of a card rather than a card. */

(function () {
  "use strict";

  var SERIF = '"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif';
  var SANS = 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
  var DEVA = '"Noto Sans Devanagari","Nirmala UI","Mangal",system-ui,sans-serif';
  var R2 = Math.PI / 180;

  /* The leaf has its own palette. The studio's four are for diagrams on a
     dark field; this is a printed page, and the two things it needs — aged
     paper and leaf gold — are not in those. A light studio palette flips the
     leaf to a true paper version rather than forcing navy onto parchment. */
  function inks(P) {
    var light = (P.bg.charCodeAt(1) > 55);   /* a pale background */
    return light ? {
      paper: "#ece0c4", edge: "#c9b98e", panel: "#f7f1e2", panel2: "#efe6d2",
      rule: "#a8842f", gold: "#8a6a1e", goldHi: "#a86f0c", ink: "#4a4232",
      dim: "#857a5e", star: "#8a7d5c", glow: "#b08a2c", dark: false
    } : {
      paper: "#e9ddbf", edge: "#cbb98e", panel: "#0d1430", panel2: "#161f45",
      /* ink and goldHi were #f6f0dd and #fff0c2 — a warm white and a slightly
         warmer white. The sweep lifted each row from one to the other and
         nothing visibly happened. A row at rest is now quiet parchment and a
         row in the light is unmistakably gold. */
      rule: "#c9a24b", gold: "#dcb871", goldHi: "#ffd27a", ink: "#ded5bd",
      dim: "#9d9276", star: "#ffe9b0", glow: "#ffcf72", dark: true
    };
  }
  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  /* A foliated arch: a half-ellipse with n cusps riding on it. Sampled rather
     than built from arcs, because the cusps have to sit ON the ellipse and
     the join between an arc and its neighbour is where a hand-built arch goes
     visibly wrong. */
  function archPath(c, cx, baseY, halfW, hgt, foils, bite) {
    var N = 420;
    c.beginPath();
    for (var i = 0; i <= N; i++) {
      var t = i / N;                       /* 0 = left spring, 1 = right */
      var a = Math.PI * (1 - t);           /* π → 0 across the top */
      var scallop = Math.abs(Math.sin(foils * Math.PI * t));
      var rad = 1 - bite * scallop;
      var x = cx + Math.cos(a) * halfW * rad;
      var y = baseY - Math.sin(a) * hgt * rad;
      if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
  }

  /* A corner scroll: a spiral with leaves. Four of these, mirrored, is what
     reads as "illuminated" without a single imported glyph. */
  function flourish(c, x, y, s, flipX, flipY, I, alpha) {
    c.save();
    c.translate(x, y);
    c.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    c.globalAlpha = alpha;
    c.strokeStyle = I.rule;
    c.lineWidth = Math.max(1, s * 0.022);
    c.lineCap = "round";
    /* The corner itself: two strokes running along the panel edges that turn
       inward and meet. Without them the scroll floated in the corner like a
       sticker; with them it is a corner piece. */
    c.beginPath();
    c.moveTo(s * 1.55, 0);
    c.lineTo(s * 0.34, 0);
    c.bezierCurveTo(s * 0.12, 0, 0, s * 0.12, 0, s * 0.34);
    c.lineTo(0, s * 1.55);
    c.stroke();
    /* the vine inside it */
    c.beginPath();
    c.moveTo(s * 1.20, s * 0.14);
    c.bezierCurveTo(s * 0.62, s * 0.16, s * 0.30, s * 0.34, s * 0.26, s * 0.76);
    c.stroke();
    c.beginPath();
    c.moveTo(s * 0.14, s * 1.20);
    c.bezierCurveTo(s * 0.16, s * 0.62, s * 0.34, s * 0.30, s * 0.76, s * 0.26);
    c.stroke();
    /* the scroll at the elbow */
    c.beginPath();
    for (var i = 0; i <= 90; i++) {
      var t = i / 90, th = t * Math.PI * 2.6;
      var r = s * 0.26 * Math.exp(-0.40 * th);
      var sx = s * 0.52 + Math.cos(th + 2.3) * r;
      var sy = s * 0.52 + Math.sin(th + 2.3) * r;
      if (i === 0) c.moveTo(sx, sy); else c.lineTo(sx, sy);
    }
    c.stroke();
    /* two small leaves on the vine, not three floating ones */
    [[0.74, 0.22, 0.5], [0.22, 0.74, 1.07]].forEach(function (L) {
      c.beginPath();
      c.ellipse(s * L[0], s * L[1], s * 0.105, s * 0.042, L[2], 0, Math.PI * 2);
      c.stroke();
    });
    c.restore();
  }

  function rosette(c, cx, cy, r, n, I, alpha) {
    c.save();
    c.globalAlpha = alpha;
    c.strokeStyle = I.rule;
    c.lineWidth = Math.max(1, r * 0.09);
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2;
      c.beginPath();
      c.ellipse(cx + Math.cos(a) * r * 0.46, cy + Math.sin(a) * r * 0.46,
                r * 0.46, r * 0.20, a, 0, Math.PI * 2);
      c.stroke();
    }
    c.beginPath(); c.arc(cx, cy, r * 0.17, 0, Math.PI * 2); c.stroke();
    c.restore();
  }

  /* the sun on the crown: a disc, a corona that turns, and a pulse */
  function sunMedallion(c, cx, cy, r, t, I) {
    c.save();
    /* the rim */
    c.fillStyle = I.dark ? "#121a3c" : "#e8dcbd";
    c.beginPath(); c.arc(cx, cy, r * 1.30, 0, Math.PI * 2); c.fill();
    c.strokeStyle = I.rule; c.lineWidth = Math.max(1.5, r * 0.055);
    c.beginPath(); c.arc(cx, cy, r * 1.30, 0, Math.PI * 2); c.stroke();
    /* the corona, turning */
    var puls = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
    c.save();
    c.translate(cx, cy);
    c.rotate(t * Math.PI * 0.6);
    c.globalCompositeOperation = "lighter";
    for (var i = 0; i < 24; i++) {
      var a = i / 24 * Math.PI * 2;
      var len = r * (1.02 + 0.22 * (i % 2 ? 1 : 0.55) * (0.6 + 0.4 * puls));
      c.strokeStyle = I.glow;
      c.globalAlpha = 0.30 + 0.28 * puls;
      c.lineWidth = Math.max(1, r * 0.055);
      c.beginPath();
      c.moveTo(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86);
      c.lineTo(Math.cos(a) * len, Math.sin(a) * len);
      c.stroke();
    }
    c.restore();
    /* the disc */
    var g = c.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.1, cx, cy, r);
    g.addColorStop(0, "#fff3cf");
    g.addColorStop(0.45, "#f2a73a");
    g.addColorStop(1, "#b5451a");
    c.fillStyle = g;
    c.beginPath(); c.arc(cx, cy, r * (0.82 + 0.03 * puls), 0, Math.PI * 2); c.fill();
    c.restore();
  }

  /* the Moon at the day's real elongation */
  function moonDisc(c, cx, cy, r, elong, I) {
    c.save();
    c.fillStyle = I.dark ? "#1a2347" : "#ddd2b4";
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
    var ph = (((elong % 360) + 360) % 360) / 360;
    var k = Math.cos(ph * Math.PI * 2);        /* +1 new, −1 full */
    c.save();
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.clip();
    c.fillStyle = "#f3e7c4";
    c.beginPath();
    /* lit limb: a half disc plus an ellipse whose width is the terminator */
    var waxing = ph < 0.5;
    c.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, !waxing);
    c.ellipse(cx, cy, r * Math.abs(k), r, 0, Math.PI / 2, -Math.PI / 2,
              waxing === (k > 0));
    c.fill();
    c.restore();
    c.strokeStyle = I.rule; c.lineWidth = Math.max(1.2, r * 0.07);
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
    c.restore();
  }

  /* --- the nine row icons, all paths ------------------------------------- */
  function icon(c, kind, x, y, s, col) {
    c.save();
    c.translate(x, y);
    c.strokeStyle = col; c.fillStyle = col;
    c.lineWidth = Math.max(1, s * 0.07);
    c.lineJoin = "round"; c.lineCap = "round";
    var i, a;
    if (kind === "lotus") {
      for (i = -2; i <= 2; i++) {
        c.save(); c.rotate(i * 0.42);
        c.beginPath();
        c.ellipse(0, -s * 0.34, s * 0.16, s * 0.40, 0, 0, Math.PI * 2);
        c.stroke(); c.restore();
      }
      c.beginPath(); c.moveTo(-s * 0.55, s * 0.12);
      c.quadraticCurveTo(0, s * 0.42, s * 0.55, s * 0.12); c.stroke();
    } else if (kind === "star") {
      c.beginPath();
      for (i = 0; i < 16; i++) {
        a = i / 16 * Math.PI * 2;
        var r = (i % 2 ? s * 0.22 : s * 0.62);
        var px = Math.cos(a - Math.PI / 2) * r, py = Math.sin(a - Math.PI / 2) * r;
        if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.closePath(); c.stroke();
    } else if (kind === "om") {
      c.font = "600 " + Math.round(s * 1.18) + "px " + DEVA;
      c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText("ॐ", 0, 0);
    } else if (kind === "orbit") {
      c.beginPath(); c.arc(0, 0, s * 0.30, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.ellipse(0, 0, s * 0.62, s * 0.30, -0.4, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(s * 0.50, -s * 0.20, s * 0.09, 0, Math.PI * 2); c.fill();
    } else if (kind === "saturn") {
      c.beginPath(); c.arc(0, 0, s * 0.34, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.ellipse(0, 0, s * 0.64, s * 0.20, -0.42, 0, Math.PI * 2); c.stroke();
    } else if (kind === "planet") {
      c.beginPath(); c.arc(0, 0, s * 0.45, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.ellipse(0, 0, s * 0.45, s * 0.17, 0, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.ellipse(0, 0, s * 0.17, s * 0.45, 0, 0, Math.PI * 2); c.stroke();
    } else if (kind === "seal") {
      c.save(); c.rotate(Math.PI / 4);
      c.strokeRect(-s * 0.42, -s * 0.42, s * 0.84, s * 0.84); c.restore();
      c.strokeRect(-s * 0.42, -s * 0.42, s * 0.84, s * 0.84);
      for (i = 0; i < 8; i++) {
        a = i / 8 * Math.PI * 2;
        c.beginPath();
        c.ellipse(Math.cos(a) * s * 0.17, Math.sin(a) * s * 0.17,
                  s * 0.17, s * 0.08, a, 0, Math.PI * 2);
        c.stroke();
      }
    } else if (kind === "sunrise") {
      c.beginPath(); c.arc(0, s * 0.10, s * 0.32, Math.PI, 0); c.stroke();
      c.beginPath(); c.moveTo(-s * 0.62, s * 0.12); c.lineTo(s * 0.62, s * 0.12); c.stroke();
      for (i = -2; i <= 2; i++) {
        a = -Math.PI / 2 + i * 0.55;
        c.beginPath();
        c.moveTo(Math.cos(a) * s * 0.44, s * 0.10 + Math.sin(a) * s * 0.44);
        c.lineTo(Math.cos(a) * s * 0.62, s * 0.10 + Math.sin(a) * s * 0.62);
        c.stroke();
      }
    } else if (kind === "moon") {
      c.beginPath(); c.arc(0, 0, s * 0.46, 0, Math.PI * 2); c.stroke();
      c.beginPath();
      c.arc(0, 0, s * 0.46, Math.PI / 2, -Math.PI / 2);
      c.ellipse(0, 0, s * 0.18, s * 0.46, 0, -Math.PI / 2, Math.PI / 2, true);
      c.fill();
    }
    c.restore();
  }

  /* deterministic sparks, so they do not jitter between frames */
  function sparks(c, W, H, t, I, n) {
    var seed = 991;
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    c.save();
    c.globalCompositeOperation = "lighter";
    for (var i = 0; i < n; i++) {
      var x = rnd() * W, y = rnd() * H, ph = rnd(), sz = 0.4 + rnd() * 0.8;
      var k = Math.sin((t + ph) * Math.PI * 2);
      if (k <= 0) continue;
      var a = k * k * 0.85, s = sz * W * 0.006 * (0.6 + 0.6 * k);
      c.globalAlpha = a; c.strokeStyle = I.star;
      c.lineWidth = Math.max(0.8, W * 0.0013);
      c.beginPath();
      c.moveTo(x - s, y); c.lineTo(x + s, y);
      c.moveTo(x, y - s); c.lineTo(x, y + s);
      c.stroke();
    }
    c.restore();
  }

  var FITCACHE = {}, FITN = 0;

  /* The leaf's still layers, drawn once and kept.

     The paper, the panel, the star field, the constellation arcs, the gold
     rules, the arch and the four corner pieces do not change from frame to
     frame — between them they are several hundred paths and about a thousand
     sampled points, and redrawing them sixty times a second to put a moving
     band of light on top was most of what made this card cost six times what
     any other composer costs. They are rendered once into an offscreen canvas
     keyed by size and palette, and blitted.

     The drift is applied when blitting rather than when drawing, so the whole
     leaf still moves. */
  var BACK = null;

  /* Everything that never changes between frames, drawn once into `BACK`. */
  function buildBack(W, H, P, I) {
    var cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    var c = cv.getContext("2d");
    var m = W * 0.052, pr = W * 0.030;
    var px = m, py = m * (H / W) * 0.62, pw = W - m * 2, ph = H - py * 2;
    /* 1 — the paper */
    c.fillStyle = I.paper; c.fillRect(-W, -H, W * 3, H * 3);
    var vg = c.createRadialGradient(W / 2, H / 2, W * 0.1, W / 2, H / 2, W * 0.95);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, I.dark ? "rgba(40,28,8,0.30)" : "rgba(90,70,30,0.18)");
    c.fillStyle = vg; c.fillRect(0, 0, W, H);

    /* 2 — the panel */
    c.save();
    rr(c, px, py, pw, ph, pr);
    var pg = c.createLinearGradient(0, py, 0, py + ph);
    pg.addColorStop(0, I.panel); pg.addColorStop(1, I.panel2);
    c.fillStyle = pg; c.fill();
    c.restore();

    /* 3 — the faint sky inside it */
    c.save();
    rr(c, px, py, pw, ph, pr); c.clip();
    var seed = 7717;
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    c.globalAlpha = I.dark ? 0.55 : 0.25;
    for (var i = 0; i < 170; i++) {
      c.fillStyle = I.star;
      c.globalAlpha = (I.dark ? 0.18 : 0.10) + rnd() * 0.35;
      var sx = px + rnd() * pw, sy = py + rnd() * ph, sr = rnd() * W * 0.0022 + W * 0.0006;
      c.beginPath(); c.arc(sx, sy, sr, 0, Math.PI * 2); c.fill();
    }
    /* constellation arcs — the printed star-chart under the text */
    c.globalAlpha = I.dark ? 0.085 : 0.06;
    c.strokeStyle = I.rule; c.lineWidth = Math.max(1, W * 0.0012);
    for (var k = 0; k < 7; k++) {
      var ccx = px + rnd() * pw, ccy = py + rnd() * ph, crr = pw * (0.12 + rnd() * 0.38);
      c.beginPath(); c.arc(ccx, ccy, crr, rnd() * 6, rnd() * 6 + 2); c.stroke();
    }
    c.restore();

    /* 4 — the gold double rule */
    c.save();
    c.strokeStyle = I.rule;
    c.globalAlpha = 0.95; c.lineWidth = Math.max(2, W * 0.0040);
    rr(c, px, py, pw, ph, pr); c.stroke();
    c.globalAlpha = 0.55; c.lineWidth = Math.max(1, W * 0.0018);
    rr(c, px + W * 0.012, py + W * 0.012, pw - W * 0.024, ph - W * 0.024, pr * 0.8);
    c.stroke();
    c.restore();

    /* 5 — the arch and the corner scrolls.

       The first cut drew the arch at a tenth of the panel height in a thin
       half-transparent line and it simply could not be seen: the card read as
       a plain box with text in it. An arch is the whole reason the head looks
       like a leaf from an almanac rather than a slide, so it is drawn heavy,
       it springs from the panel's own sides, and the head sits INSIDE it. */
    /* Taller and narrower than the first cut, which spanned the whole panel
       at a sixth of its height and read as a shallow dish. And the crown is
       placed from the PANEL TOP rather than from the apex, because an apex
       computed from a height is free to walk off the top of the frame — which
       is exactly what it did, clipping the sun's corona at every ratio. */
    /* The arch has to ENCLOSE the head, not cross it. Deriving the base from
       the apex put the springing line below the date, so the curve ran
       straight through "19 October 2026". Both ends are fixed instead: the
       apex sits where the crown sits, the springing line sits just above the
       divider, and the height is whatever that leaves. The crown straddles
       the panel's top edge, which is where it belongs on a printed leaf. */
    var archBase = py + ph * 0.212;
    var sunCy = py + ph * 0.045, sunR = W * 0.048;
    var archTop = archBase - sunCy;
    c.save();
    /* a wash under the arch, so the head reads as a recessed niche */
    archPath(c, W / 2, archBase, pw * 0.430, archTop, 9, 0.105);
    c.lineTo(px + pw * 0.030, py + W * 0.012);
    c.lineTo(px + pw * 0.970, py + W * 0.012);
    c.closePath();
    c.fillStyle = I.dark ? "rgba(255,221,150,0.045)" : "rgba(120,92,28,0.055)";
    c.fill();
    c.strokeStyle = I.rule; c.globalAlpha = 1;
    c.lineWidth = Math.max(2.4, W * 0.0046);
    archPath(c, W / 2, archBase, pw * 0.430, archTop, 9, 0.105);
    c.stroke();
    c.globalAlpha = 0.62; c.lineWidth = Math.max(1.2, W * 0.0022);
    archPath(c, W / 2, archBase - W * 0.017, pw * 0.396, archTop * 0.900, 9, 0.105);
    c.stroke();
    c.restore();
    var fs = pw * 0.105, fo = W * 0.030;
    flourish(c, px + fo, py + fo, fs, false, false, I, 0.60);
    flourish(c, px + pw - fo, py + fo, fs, true, false, I, 0.60);
    flourish(c, px + fo, py + ph - fo, fs, false, true, I, 0.60);
    flourish(c, px + pw - fo, py + ph - fo, fs, true, true, I, 0.60);

    return { cv: cv, px: px, py: py, pw: pw, ph: ph,
             archBase: archBase, sunCy: sunCy, sunR: sunR, archTop: archTop };
  }

  /* ---- the card ---------------------------------------------------------- */
  /* A is the packaged day; see the almanac node in sp-nodes.js. */
  function draw(c, W, H, A, p, P, opts) {
    opts = opts || {};
    var I = inks(P);
    var U = W;

    /* the drift: a fraction of a percent, which is the difference between a
       card and a photograph of a card */
    var dz = 1 + 0.010 * (0.5 - 0.5 * Math.cos(p * Math.PI * 2));
    var dy = H * 0.004 * Math.sin(p * Math.PI * 2);
    c.save();
    c.translate(W / 2, H / 2); c.scale(dz, dz); c.translate(-W / 2, -H / 2 + dy);

    /* the still layers, built once and kept */
    var key = W + "x" + H + "|" + P.key;
    if (!BACK || BACK.key !== key) {
      BACK = buildBack(W, H, P, I);
      BACK.key = key;
    }
    c.drawImage(BACK.cv, 0, 0);
    var px = BACK.px, py = BACK.py, pw = BACK.pw, ph = BACK.ph;
    var archBase = BACK.archBase, sunCy = BACK.sunCy, sunR = BACK.sunR;

    /* 6 — the crown, sitting on the apex rather than off the top edge */
    sunMedallion(c, W / 2, sunCy, sunR, p, I);

    /* ---- type ----------------------------------------------------------- */
    function txt(s, x, y, size, col, align, weight, font) {
      if (s == null || s === "") return;
      c.fillStyle = col; c.textAlign = align || "center"; c.textBaseline = "middle";
      c.font = (weight || 600) + " " + Math.round(size) + "px " + (font || SANS);
      c.fillText(String(s), x, y);
    }
    /* memoised for the reason given in sp-compose.js: the leaf makes about
       twenty of these calls a frame and each one can cost twenty-two text
       measurements, which no card's content changes between frames to
       justify */
    function fit(s, size, maxW, weight, font) {
      var key = (font === SERIF ? "s" : "n") + (weight || 600) + "|" +
                Math.round(size) + "|" + Math.round(maxW) + "|" + s;
      var hit = FITCACHE[key];
      if (hit !== undefined) return hit;
      var f = size;
      for (var z = 0; z < 22; z++) {
        c.font = (weight || 600) + " " + Math.round(f) + "px " + (font || SANS);
        if (c.measureText(String(s)).width <= maxW) break;
        f *= 0.95;
      }
      if (++FITN > 900) { FITCACHE = {}; FITN = 0; }
      FITCACHE[key] = f;
      return f;
    }
    function txtFit(s, x, y, size, col, align, weight, maxW, font) {
      txt(s, x, y, fit(s, size, maxW, weight, font), col, align, weight, font);
    }

    txt("Nirayana — निरयन", W / 2, py + ph * 0.072,
        U * 0.027, I.gold, "center", 500, SERIF);

    /* the moon disc and the date share a line */
    var dateY = py + ph * 0.118;
    moonDisc(c, px + pw * 0.175, dateY, W * 0.052, A.elongation, I);
    txtFit(A.dateLine, W / 2 + pw * 0.055, dateY, U * 0.078, I.goldHi, "center",
           600, pw * 0.66, SERIF);
    txtFit(A.subLine, W / 2 + pw * 0.055, dateY + ph * 0.040, U * 0.0245,
           I.gold, "center", 500, pw * 0.70, SERIF);

    /* the divider under the head */
    function divider(y, big) {
      c.save();
      c.strokeStyle = I.rule; c.globalAlpha = big ? 0.85 : 0.55;
      c.lineWidth = Math.max(1, W * (big ? 0.0022 : 0.0014));
      var x0 = px + pw * 0.055, x1 = px + pw * 0.945, gap = pw * (big ? 0.085 : 0.030);
      c.beginPath();
      c.moveTo(x0, y); c.lineTo(W / 2 - gap, y);
      c.moveTo(W / 2 + gap, y); c.lineTo(x1, y);
      c.stroke();
      if (big) {
        c.beginPath();
        c.moveTo(W / 2 - gap * 0.55, y); c.lineTo(W / 2 - gap * 0.18, y);
        c.moveTo(W / 2 + gap * 0.18, y); c.lineTo(W / 2 + gap * 0.55, y);
        c.stroke();
      }
      /* the star at the centre */
      c.globalAlpha = 0.95; c.fillStyle = I.rule;
      var s4 = W * (big ? 0.013 : 0.009);
      c.beginPath();
      c.moveTo(W / 2, y - s4); c.lineTo(W / 2 + s4 * 0.34, y);
      c.lineTo(W / 2, y + s4); c.lineTo(W / 2 - s4 * 0.34, y);
      c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(W / 2 - s4, y); c.lineTo(W / 2, y - s4 * 0.34);
      c.lineTo(W / 2 + s4, y); c.lineTo(W / 2, y + s4 * 0.34);
      c.closePath(); c.fill();
      c.restore();
    }
    divider(py + ph * 0.234, true);

    /* ---- the rows -------------------------------------------------------
       The sweep lifts a row into gold as it crosses. Its position is the
       playhead, held at each row a moment longer than the gaps between them
       so the eye has time — a linear sweep across five rows reads as a wipe
       rather than as reading. */
    var top = py + ph * 0.256, bottom = py + ph * 0.952;
    var rows = A.rows;
    var band = (bottom - top) / rows.length;
    var sweepY = top + (bottom - top) * ((p * 1.18) % 1);

    rows.forEach(function (row, ri) {
      var y = top + band * ri;
      if (ri > 0) divider(y, false);
      var cy = y + band * 0.50;
      /* The window was six tenths of a row and squared, which left the
         brightest row at a third of full and nothing ever looked lit. It is a
         whole row wide now and eased rather than squared, so exactly one row
         is unmistakably in the light at any moment and the next is coming up. */
      var hot = Math.max(0, 1 - Math.abs(cy - sweepY) / (band * 1.00));
      hot = hot * hot * (3 - 2 * hot);
      var cols = row.cols;
      cols.forEach(function (col, ci) {
        var full = cols.length === 1;
        var cx = full ? px + pw * 0.14 : px + pw * (ci === 0 ? 0.135 : 0.555);
        var wid = full ? pw * 0.80 : pw * 0.335;
        var ix = cx - pw * 0.065;
        icon(c, col.icon, ix, cy - band * 0.02, U * 0.030,
             hot > 0.3 ? I.goldHi : I.rule);
        txt(col.label, cx, cy - band * 0.235, U * 0.0235,
            hot > 0.3 ? I.goldHi : I.dim, "left", 600, SERIF);
        c.save();
        if (hot > 0.3 && I.dark) {
          c.shadowColor = "rgba(255,200,110," + (0.75 * hot).toFixed(2) + ")";
          c.shadowBlur = U * 0.022 * hot;
        }
        txtFit(col.value, cx, cy - band * 0.055, U * 0.049,
               hot > 0.3 ? I.goldHi : I.ink, "left", 600, wid, SERIF);
        c.restore();
        if (col.detail)
          txtFit(col.detail, cx, cy + band * (col.detail2 ? 0.130 : 0.175),
                 U * 0.0230, hot > 0.4 ? I.gold : I.dim, "left", 500,
                 full ? pw * 0.80 : wid * 1.08, SERIF);
        if (col.detail2)
          txtFit(col.detail2, cx, cy + band * 0.265, U * 0.0230,
                 hot > 0.4 ? I.gold : I.dim, "left", 500, pw * 0.80, SERIF);
      });
      /* the light itself, over the row it is on */
      if (hot > 0.02) {
        c.save();
        c.globalCompositeOperation = "lighter";
        var lg = c.createLinearGradient(px, 0, px + pw, 0);
        lg.addColorStop(0, "rgba(255,210,120,0)");
        lg.addColorStop(0.5, "rgba(255,221,150," + (0.60 * hot).toFixed(3) + ")");
        lg.addColorStop(1, "rgba(255,210,120,0)");
        c.fillStyle = lg;
        c.fillRect(px, cy - band * 0.46, pw, band * 0.085);
        c.restore();
      }
    });

    /* 7 — the sparks, last so they sit on top of the gold */
    sparks(c, W, H, p, I, 46);

    if (opts.foot)
      txt(opts.foot, W / 2, py + ph * 0.985, U * 0.020, I.dim, "center", 500, SERIF);
    c.restore();
  }

  window.SPAlmanac = { draw: draw, inks: inks };
})();

/* ===== Studio Pro — the stage, and the composers =========================

   HOW A SELECTION BECOMES A PICTURE. The registry hands this file values with
   declared shapes and no idea what they mean. Each composer here declares
   which shapes it can consume and scores itself against a selection; the best
   score draws. That is the whole mechanism, and it is what makes the page
   combinatorial rather than a gallery: a composer that draws "two longitudes
   and the angle between them" draws the Sun and the Moon, Lagna and the
   Arūḍha, a daśā lord and its dispositor, or a transiting graha and its own
   natal place, without knowing that any of those things exist.

   SCORING, AND WHY IT IS HONEST ABOUT WHAT IT DROPS. A composer scores by how
   much of the selection it consumes. The winner is the one that consumes most,
   and the stage PRINTS WHATEVER IT COULD NOT USE. A studio that quietly
   ignored half a selection would teach its user nothing about why the picture
   looks wrong; one that says "these three are drawn, this one has no place in
   this view, try Layers" is a studio.

   THE LAYERS COMPOSER is what guarantees every combination renders. When the
   selection is too heterogeneous for any single view, Layers splits the stage
   into panels and runs the best sub-composer in each. It always scores above
   zero, so there is no such thing as a selection that draws nothing.

   THE RECORDER. A second implementation of frame-accurate capture, the first
   being the motion pane's on the chart page. The two cannot share code — one
   is inside the report bundle and this page does not load it — so they are
   held together the same way the Viṃśottarī is: a test asserts a recording
   made here lasts the length it advertises, exactly as reel-duration.mjs
   asserts it there. */

(function () {
  "use strict";

  var PALS = {
    midnight: { key: "midnight", label: "Midnight", bg: "#0b1020", bg2: "#161d3a",
      ink: "#f2efe4", dim: "#8f96bb", line: "#2b3358", gold: "#d9b668",
      ben: "#5fbf8f", mal: "#e07a60", star: "#dfe6ff", glow: "#6f7cc0" },
    eclipse: { key: "eclipse", label: "Eclipse", bg: "#000000", bg2: "#0a0a0f",
      ink: "#ffffff", dim: "#9a9a9a", line: "#2a2a33", gold: "#ffc83d",
      ben: "#4dffa6", mal: "#ff6b4a", star: "#ffffff", glow: "#ffb02e" },
    parchment: { key: "parchment", label: "Parchment", bg: "#f7f3e8", bg2: "#eee7d6",
      ink: "#1d2340", dim: "#6c7089", line: "#d8d0ba", gold: "#a17c2a",
      ben: "#2f7d55", mal: "#b5533c", star: "#4a5078", glow: "#c9a24b" },
    ink: { key: "ink", label: "Ink", bg: "#101014", bg2: "#1a1a20", ink: "#ece9e2",
      dim: "#8b8b96", line: "#2e2e38", gold: "#c9a227", ben: "#6fb08a",
      mal: "#c96f55", star: "#d8d8e4", glow: "#7f8aa8" }
  };
  var RATIOS = {
    "9:16": { w: 1080, h: 1920, label: "Story / Reel" },
    "4:5":  { w: 1080, h: 1350, label: "Feed post" },
    "1:1":  { w: 1080, h: 1080, label: "Square" }
  };
  /* Instagram covers these strips with its own chrome. Measured as fractions
     of the frame so they hold at every ratio. */
  var SAFE = { top: 0.14, bottom: 0.20, right: 0.14 };
  var SANS = 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
  var R2 = Math.PI / 180;

  var S = {
    pal: "midnight", ratio: "9:16", safe: true, speed: 1, p: 0, tile: false,
    /* The render size as a fraction of the export size. The stage preview is
       about three hundred CSS pixels wide; rendering it at 1080 was six times
       the pixels anyone could see, and at twenty milliseconds a frame it was
       most of the reason playback ran at four frames a second on a phone.
       Export always goes back to 1 — see withFullSize. */
    quality: 1,
    ctx: null, cv: null, W: 1080, H: 1920, U: 1080,
    headline: "", sub: "", handle: "@Nirayana.Soft"
  };

  function pal() { return PALS[S.pal] || PALS.midnight; }
  function norm(x) { return ((x % 360) + 360) % 360; }

  /* ---- text -------------------------------------------------------------- */
  function txt(s, x, y, size, col, align, weight) {
    if (s == null || s === "") return;
    var c = S.ctx;
    c.fillStyle = col; c.textAlign = align || "center"; c.textBaseline = "middle";
    c.font = (weight || 600) + " " + Math.round(size) + "px " + SANS;
    c.fillText(String(s), x, y);
  }
  /* The size at which a line finally fits a width — a centred line that does
     not fit loses the same number of words at each end, which is the one
     failure that reads as deliberate.

     MEMOISED, because it is the single most expensive thing on the page. Each
     call can run twenty measureText probes, a frame can carry twenty such
     calls, and the answer depends only on the string, the starting size, the
     width and the weight — none of which change between frames of the same
     card. Four hundred text measurements per frame was most of the reason the
     almanac cost six times what any other composer costs. */
  var FITS = {}, FITN = 0;
  function fit(s, size, maxW, weight) {
    var key = (weight || 600) + "|" + Math.round(size) + "|" + Math.round(maxW) + "|" + s;
    var hit = FITS[key];
    if (hit !== undefined) return hit;
    var c = S.ctx, f = size;
    for (var i = 0; i < 20; i++) {
      c.font = (weight || 600) + " " + Math.round(f) + "px " + SANS;
      if (c.measureText(String(s)).width <= maxW) break;
      f *= 0.94;
    }
    /* an unbounded cache on a page that can scrub through a year of dates
       would grow without end; this is a cache, not a ledger */
    if (++FITN > 1200) { FITS = {}; FITN = 0; }
    FITS[key] = f;
    return f;
  }
  function txtFit(s, x, y, size, col, align, weight, maxW) {
    txt(s, x, y, fit(s, size, maxW, weight), col, align, weight);
  }
  /* wrap into at most `lines` rows, returning how many it used */
  function wrap(s, x, y, size, col, maxW, lines, lh) {
    var c = S.ctx, words = String(s).split(/\s+/), row = "", out = [];
    c.font = "500 " + Math.round(size) + "px " + SANS;
    for (var i = 0; i < words.length; i++) {
      var t = row ? row + " " + words[i] : words[i];
      if (c.measureText(t).width > maxW && row) { out.push(row); row = words[i]; }
      else row = t;
      if (out.length >= lines) break;
    }
    if (row && out.length < lines) out.push(row);
    out.forEach(function (r, i) { txt(r, x, y + i * (lh || size * 1.35), size, col, "center", 500); });
    return out.length;
  }

  /* Breaking a string into rows WITHOUT drawing it, so a caller that needs to
     know how tall a block will be before it places it does not have to draw
     the block off-screen to find out. wrap() above draws as it goes and is
     centred at weight 500 by choice — that is the diagram caption, and the
     two are kept separate rather than one being bent into the other. */
  function wrapLines(s, size, maxW, lines, weight) {
    var c = S.ctx, words = String(s == null ? "" : s).split(/\s+/);
    var row = "", out = [];
    c.font = (weight || 500) + " " + Math.round(size) + "px " + SANS;
    for (var i = 0; i < words.length; i++) {
      var t = row ? row + " " + words[i] : words[i];
      if (c.measureText(t).width > maxW && row) { out.push(row); row = words[i]; }
      else row = t;
      if (out.length >= lines) break;
    }
    if (row && out.length < lines) out.push(row);
    return out;
  }

  /* ---- the frame --------------------------------------------------------- */
  function stage() {
    var topPad = S.safe ? S.H * SAFE.top : S.H * 0.045;
    var botPad = S.safe ? S.H * SAFE.bottom : S.H * 0.045;
    var side = S.safe ? S.W * SAFE.right * 0.55 : S.W * 0.055;
    /* the caption band sits inside the bottom pad when the strips are off */
    var band = S.H * 0.115;
    return { x: side, y: topPad, w: S.W - side * 2, h: S.H - topPad - botPad - band,
             cx: S.W / 2, cy: topPad + (S.H - topPad - botPad - band) / 2,
             bandY: S.H - botPad - band, bandH: band, side: side };
  }
  function background() {
    var c = S.ctx, P = pal();
    var g = c.createLinearGradient(0, 0, 0, S.H);
    g.addColorStop(0, P.bg); g.addColorStop(1, P.bg2);
    c.fillStyle = g; c.fillRect(0, 0, S.W, S.H);
  }
  /* a fixed star field, seeded so it does not shimmer between frames */
  var STARS = null;
  function stars() {
    var c = S.ctx, P = pal();
    if (!STARS || STARS.w !== S.W || STARS.h !== S.H) {
      var seed = 20260101, pts = [];
      function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
      for (var i = 0; i < 150; i++)
        pts.push({ x: rnd() * S.W, y: rnd() * S.H, r: rnd() * 1.6 + 0.4, a: rnd() * 0.5 + 0.12 });
      STARS = { w: S.W, h: S.H, pts: pts };
    }
    c.save();
    STARS.pts.forEach(function (s) {
      c.globalAlpha = s.a; c.fillStyle = P.star;
      c.beginPath(); c.arc(s.x, s.y, s.r, 0, Math.PI * 2); c.fill();
    });
    c.restore();
  }
  function captionBand(title, sub) {
    var c = S.ctx, P = pal(), st = stage();
    if (S.tile) {
      /* one line, no rule, no handle: a thumbnail wants to say what it is
         and nothing else */
      txtFit(title || "", S.W / 2, st.bandY + st.bandH * 0.42,
             S.W * 0.054, P.ink, "center", 700, S.W * 0.90);
      return;
    }
    c.save();
    c.strokeStyle = P.gold; c.globalAlpha = 0.6;
    c.lineWidth = Math.max(1.5, S.W * 0.0018);
    c.beginPath(); c.moveTo(0, st.bandY); c.lineTo(S.W, st.bandY); c.stroke();
    c.restore();
    var y = st.bandY + st.bandH * 0.30;
    txtFit(title || "", S.W / 2, y, S.W * 0.042, P.ink, "center", 700, S.W * 0.86);
    if (sub) wrap(sub, S.W / 2, y + st.bandH * 0.30, S.W * 0.021, P.dim, S.W * 0.84, 2);
    txt(S.handle, S.W - st.side, st.bandY + st.bandH * 0.86, S.W * 0.021, P.dim, "right", 500);
  }
  function safeGuides() {
    if (!S.safe || S.tile) return;
    var c = S.ctx, P = pal();
    c.save();
    c.strokeStyle = P.gold; c.globalAlpha = 0.14;
    c.setLineDash([10, 10]); c.lineWidth = 2;
    c.strokeRect(S.W * SAFE.right * 0.25, S.H * SAFE.top,
                 S.W - S.W * SAFE.right * 1.1, S.H * (1 - SAFE.top - SAFE.bottom));
    c.restore();
  }

  /* ---- drawing primitives the composers share ---------------------------- */
  function ringTicks(cx, cy, r, n, alpha, len) {
    var c = S.ctx, P = pal();
    c.save();
    c.strokeStyle = P.dim; c.globalAlpha = alpha == null ? 0.4 : alpha;
    c.lineWidth = Math.max(1, S.U * 0.0013);
    for (var i = 0; i < n; i++) {
      var a = (i * 360 / n - 90) * R2;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      c.lineTo(cx + Math.cos(a) * r * (1 + (len || 0.07)), cy + Math.sin(a) * r * (1 + (len || 0.07)));
      c.stroke();
    }
    c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
    c.restore();
  }
  function marker(cx, cy, r, deg, label, tone, size) {
    var c = S.ctx, P = pal();
    var col = tone === "gold" ? P.gold : (tone === "dim" ? P.dim : P.glow);
    var a = (deg - 90) * R2, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    c.save();
    c.strokeStyle = col; c.globalAlpha = 0.5;
    c.lineWidth = Math.max(1, S.U * 0.0016);
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(x, y); c.stroke();
    c.globalAlpha = 1; c.fillStyle = col;
    c.beginPath(); c.arc(x, y, Math.max(3, S.U * (size || 0.0055)), 0, Math.PI * 2);
    c.fill();
    c.restore();
    if (label) {
      var lx = cx + Math.cos(a) * r * 1.17, ly = cy + Math.sin(a) * r * 1.17;
      txt(label, lx, ly, S.U * 0.020, col, "center", 700);
    }
    return { x: x, y: y, a: a };
  }
  function arcBand(cx, cy, r, from, to, col, alpha, width) {
    var c = S.ctx;
    c.save();
    c.strokeStyle = col; c.globalAlpha = alpha == null ? 0.35 : alpha;
    c.lineWidth = width || Math.max(6, S.U * 0.016);
    c.beginPath();
    c.arc(cx, cy, r, (from - 90) * R2, (to - 90) * R2);
    c.stroke();
    c.restore();
  }
  /* a readout line: what a longitude is, in every division that names it */
  function placeWords(deg) {
    var NK = window.SPNodes.NAK, RS = window.SPNodes.RASHI;
    var d = norm(deg);
    var ni = Math.floor(d / (40 / 3));
    var pada = Math.floor((d % (40 / 3)) / (10 / 3)) + 1;
    return RS[Math.floor(d / 30)] + " " + (d % 30).toFixed(2) + "°   ·   " +
           NK[ni] + " pāda " + pada;
  }

  /* =======================================================================
     THE COMPOSERS
     Each declares `score(bag)` — how many selected items it can consume, or
     -1 for "cannot draw this at all" — and `draw(bag, p, st)`.
     ======================================================================= */
  /* How much of item i, of n, is drawn at playhead p.

     Every composer used to animate by revealing one more item per step, which
     does exactly nothing when the selection holds one item: a single bar, a
     single chord, one ring. Five of the sampled selections rendered four
     identical frames for that reason — a still presented as an animation.

     This gives each item its own 0→1 growth, staggered across the set, so a
     set of twenty reveals in sequence AND a set of one still grows. The last
     item finishes before the playhead does, so the final frame is the whole
     picture rather than something caught mid-build. */
  function grow(p, i, n) {
    var stagger = n > 1 ? 0.55 : 0;
    var start = n > 1 ? (i / n) * stagger : 0;
    var len = 1 - stagger;
    var f = (Math.min(1, p / 0.92) - start) / len;
    return f <= 0 ? 0 : (f >= 1 ? 1 : f * f * (3 - 2 * f));
  }

  var COMPOSERS = [];
  function composer(key, label, blurb, score, draw) {
    COMPOSERS.push({ key: key, label: label, blurb: blurb, score: score, draw: draw });
  }
  function count(bag, kind) { return (bag[kind] || []).length; }
  function all(bag) {
    var n = 0;
    for (var k in bag) if (bag.hasOwnProperty(k)) n += bag[k].length;
    return n;
  }

  /* --- 1. one longitude, placed ----------------------------------------- */
  composer("mark", "Pointer on the ring",
    "one longitude, with every division that names it",
    function (bag) {
      return (count(bag, "lon") === 1 && all(bag) === 1) ? 1 : -1;
    },
    function (bag, p, st) {
      var P = pal(), v = bag.lon[0].v;
      var r = Math.min(st.w * 0.40, st.h * 0.34);
      var cy = st.y + st.h * 0.40;
      ringTicks(st.cx, cy, r, 27, 0.35);
      ringTicks(st.cx, cy, r * 0.90, 12, 0.5, 0.045);
      /* the pointer sweeps up to its place, so the frame has motion even for
         a single static value */
      var ease = p < 0.6 ? (p / 0.6) : 1;
      marker(st.cx, cy, r, v.deg * ease, v.label, v.tone, 0.007);
      txt(v.label, st.cx, cy, S.U * 0.030, P.ink, "center", 700);
      txt(norm(v.deg).toFixed(3) + "°", st.cx, cy + S.U * 0.038,
          S.U * 0.024, P.gold, "center", 600);
      txtFit(placeWords(v.deg), st.cx, cy + r * 1.42, S.U * 0.021, P.dim,
             "center", 500, st.w * 0.92);
      if (v.arc)
        arcBand(st.cx, cy, r * 0.96, v.arc.from, v.arc.to, P.gold, 0.25);
    });

  /* --- 2. two longitudes and the angle between them ---------------------- */
  composer("angle", "The angle between",
    "two longitudes, the arc, and the subtraction that gives it",
    function (bag) {
      return (count(bag, "lon") === 2 && all(bag) === 2) ? 2 : -1;
    },
    function (bag, p, st) {
      var P = pal(), a = bag.lon[0].v, b = bag.lon[1].v;
      var r = Math.min(st.w * 0.38, st.h * 0.32);
      var cy = st.y + st.h * 0.37;
      ringTicks(st.cx, cy, r, 12, 0.4);
      var d = norm(b.deg - a.deg);
      var shown = d * (p < 0.7 ? p / 0.7 : 1);
      arcBand(st.cx, cy, r * 0.82, a.deg, a.deg + shown, P.gold, 0.40);
      marker(st.cx, cy, r, a.deg, a.label, a.tone);
      marker(st.cx, cy, r, b.deg, b.label, b.tone);
      txt(d.toFixed(3) + "°", st.cx, cy, S.U * 0.040, P.gold, "center", 700);
      var short = d > 180 ? 360 - d : d;
      txt(short.toFixed(2) + "° the short way", st.cx, cy + S.U * 0.038,
          S.U * 0.019, P.dim, "center", 500);
      var y = cy + r * 1.36;
      txtFit(b.label + " " + norm(b.deg).toFixed(2) + "°  −  " +
             a.label + " " + norm(a.deg).toFixed(2) + "°  =  " + d.toFixed(2) + "°",
             st.cx, y, S.U * 0.021, P.ink, "center", 600, st.w * 0.95);
      /* any classical relation the separation satisfies, named */
      var rel = [];
      if (short < 1) rel.push("within a degree — a graha yuddha");
      if (Math.abs(d - 180) < 6) rel.push("opposition — the seventh");
      if (Math.abs(short - 120) < 6) rel.push("trine — the fifth and ninth");
      if (Math.abs(short - 90) < 6) rel.push("square — the fourth and tenth");
      if (Math.abs(short - 60) < 6) rel.push("sextile — the third and eleventh");
      if (short < 12) rel.push("same tithi-width of each other");
      txtFit(rel.length ? rel.join("   ·   ") : "no classical aspect at this separation",
             st.cx, y + S.U * 0.038, S.U * 0.019,
             rel.length ? P.gold : P.dim, "center", 500, st.w * 0.95);
    });

  /* --- 3. several longitudes, and what relates them ---------------------- */
  composer("web", "The ring, with everything on it",
    "every selected point placed, and the relations between them drawn",
    function (bag) {
      var n = count(bag, "lon") + count(bag, "lonset");
      if (n === 0) return -1;
      if (all(bag) !== n) return -1;
      /* A set is always welcome here however few points it holds. Demanding
         three left a one-member set — "the vargottama grahas", of which a
         chart may have exactly one — with no composer anywhere, so it fell to
         Layers and Layers drew nothing. Loose longitudes still need three,
         because one is `mark` and two are `angle`, both of which say more. */
      if (count(bag, "lonset") === 0) {
        var pts = count(bag, "lon");
        if (pts < 3) return -1;
      }
      return n;
    },
    function (bag, p, st) {
      var P = pal();
      var pts = [];
      (bag.lon || []).forEach(function (x) {
        pts.push({ deg: x.v.deg, label: x.v.label, tone: x.v.tone }); });
      (bag.lonset || []).forEach(function (x) {
        x.v.items.forEach(function (it) {
          pts.push({ deg: it.deg, label: it.label, tone: it.tone }); }); });
      var r = Math.min(st.w * 0.36, st.h * 0.30);
      var cy = st.y + st.h * 0.36;
      ringTicks(st.cx, cy, r, 12, 0.45, 0.05);
      ringTicks(st.cx, cy, r * 1.08, 27, 0.22, 0.03);
      /* chords between any pair within six degrees of a classical angle */
      var ANG = [[180, "opposition"], [120, "trine"], [90, "square"], [60, "sextile"]];
      var shown = Math.max(1, Math.round(pts.length * Math.min(1, p * 1.4)));
      var c = S.ctx;
      c.save();
      c.globalCompositeOperation = "lighter";
      for (var i = 0; i < shown; i++) for (var j = i + 1; j < shown; j++) {
        var d = norm(pts[j].deg - pts[i].deg); if (d > 180) d = 360 - d;
        var hit = null;
        ANG.forEach(function (A) { if (Math.abs(d - A[0]) < 6) hit = A; });
        if (!hit) continue;
        var a1 = (pts[i].deg - 90) * R2, a2 = (pts[j].deg - 90) * R2;
        c.strokeStyle = P.gold; c.globalAlpha = 0.30;
        c.lineWidth = Math.max(1, S.U * 0.0018);
        c.beginPath();
        c.moveTo(st.cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
        c.lineTo(st.cx + Math.cos(a2) * r, cy + Math.sin(a2) * r);
        c.stroke();
      }
      c.restore();
      for (var k = 0; k < shown; k++)
        marker(st.cx, cy, r, pts[k].deg, pts[k].label, pts[k].tone, 0.0048);
      txt(shown + " of " + pts.length, st.cx, cy, S.U * 0.026, P.dim, "center", 600);
      /* count the relations rather than asserting them */
      var rels = 0;
      for (var a = 0; a < pts.length; a++) for (var b2 = a + 1; b2 < pts.length; b2++) {
        var dd = norm(pts[b2].deg - pts[a].deg); if (dd > 180) dd = 360 - dd;
        ANG.forEach(function (A) { if (Math.abs(dd - A[0]) < 6) rels++; });
      }
      txtFit(rels ? rels + " pairs sit within 6° of a classical angle"
                  : "no pair here sits within 6° of a classical angle",
             st.cx, cy + r * 1.40, S.U * 0.021, rels ? P.gold : P.dim,
             "center", 600, st.w * 0.95);
    });

  /* --- 4. a point inside a division -------------------------------------
     A REAL magnification, not a highlight.

     The first version drew the full circle and shaded the arc the point fell
     in. It was correct and it was not a zoom: the picture stayed at one scale
     throughout, so "13°20′ wide" was a caption rather than something seen.

     Here the ring is drawn through a magnifying map — screen angle is the true
     angle measured from the centre of the target arc and multiplied by a
     magnification that climbs from 1 to 360/span. At the end the chosen arc
     fills the whole circle, its own subdivisions are legible across it, and
     the rest of the zodiac has been pushed off the edge. Three stages run in
     sequence: the whole ecliptic, the rāśi, then the division asked for. */
  composer("zoom", "Deep zoom",
    "a longitude magnified down through a division until it fills the ring",
    function (bag) {
      return (count(bag, "lon") >= 1 && count(bag, "lanes") === 1 &&
              all(bag) === count(bag, "lon") + 1)
        ? count(bag, "lon") + 1 : -1;
    },
    function (bag, p, st) {
      var P = pal(), L = bag.lanes[0].v, v = bag.lon[0].v;
      var d = norm(v.deg);
      var cy = st.y + st.h * 0.36;
      var r = Math.min(st.w * 0.38, st.h * 0.30);
      var signIdx = Math.floor(d / 30);

      /* the three windows, outermost first */
      var levels = [{ from: 0, to: 360, cap: "the whole ecliptic",
                      sub: "360°", n: 12, names: window.SPNodes.RASHI }];
      levels.push({ from: signIdx * 30, to: signIdx * 30 + 30,
                    cap: window.SPNodes.RASHI[signIdx], sub: "30°",
                    n: L.of === "sign" ? L.n : 9, names: null });
      var aFrom, aTo, cap3, n3, nm3;
      if (L.of === "sign") {
        var within = d - signIdx * 30, li = Math.floor(within / L.size);
        aFrom = signIdx * 30 + li * L.size; aTo = aFrom + L.size;
        cap3 = L.label + " " + (li + 1) + " of " + L.n;
        n3 = 4; nm3 = null;
      } else {
        var gi = Math.floor(d / L.size);
        aFrom = gi * L.size; aTo = aFrom + L.size;
        cap3 = (L.names && L.names[gi]) ? L.names[gi] : (L.label + " " + (gi + 1));
        n3 = 4; nm3 = null;   /* quarters: a pāda is a quarter of a nakṣatra */
      }
      levels.push({ from: aFrom, to: aTo, cap: cap3,
                    sub: (aTo - aFrom).toFixed(3) + "°", n: n3, names: nm3 });

      /* where the playhead sits between the three windows */
      var t = Math.min(2.999, p * 3), li2 = Math.floor(t), f = t - li2;
      var A = levels[li2], B = levels[Math.min(2, li2 + 1)];
      /* interpolate the WINDOW, in log of its width, so the magnification
         climbs smoothly rather than lurching at each step */
      var wA = A.to - A.from, wB = B.to - B.from;
      var w = Math.exp(Math.log(wA) + (Math.log(wB) - Math.log(wA)) * f);
      var cA = A.from + wA / 2, cB = B.from + wB / 2;
      var cen = cA + (cB - cA) * f;
      var mag = 360 / w;

      /* map a true longitude to its place on the magnified ring; null when it
         has been pushed outside the window */
      function M(deg) {
        var off = norm(deg - cen); if (off > 180) off -= 360;
        var a = off * mag;
        return (a < -180 || a > 180) ? null : a;
      }
      var c = S.ctx;
      /* the division ticks that are visible at this magnification: draw the
         finest division whose ticks are still further apart than a degree
         on screen */
      var DIVS = [[12, "rāśi"], [27, "nakṣatra"], [108, "pāda"],
                  [L.of === "sign" ? L.n * 12 : L.n, L.label]];
      c.save();
      DIVS.forEach(function (D, di) {
        var step = 360 / D[0];
        if (step * mag < 2.2) return;            /* too fine to resolve */
        if (step * mag > 400) return;            /* only one tick in view */
        c.strokeStyle = di === 3 ? P.gold : P.dim;
        c.globalAlpha = di === 3 ? 0.75 : 0.30;
        c.lineWidth = Math.max(1, S.U * (di === 3 ? 0.0020 : 0.0012));
        var k0 = Math.floor((cen - w) / step) - 1, k1 = Math.ceil((cen + w) / step) + 1;
        for (var k = k0; k <= k1; k++) {
          var a = M(k * step); if (a == null) continue;
          var rad = (a - 90) * R2;
          var inner = di === 3 ? 0.88 : 0.94;
          c.beginPath();
          c.moveTo(st.cx + Math.cos(rad) * r * inner, cy + Math.sin(rad) * r * inner);
          c.lineTo(st.cx + Math.cos(rad) * r * 1.07, cy + Math.sin(rad) * r * 1.07);
          c.stroke();
        }
      });
      c.globalAlpha = 0.35; c.strokeStyle = P.dim;
      c.lineWidth = Math.max(1, S.U * 0.0014);
      c.beginPath(); c.arc(st.cx, cy, r, 0, Math.PI * 2); c.stroke();
      c.restore();

      /* the target arc, which fills the ring by the end */
      var t0 = M(levels[2].from), t1 = M(levels[2].to);
      if (t0 != null && t1 != null && t1 > t0)
        arcBand(st.cx, cy, r * 0.93, t0, t1, P.gold, 0.30,
                Math.max(8, S.U * 0.020));

      /* the point itself */
      var pa = M(d);
      if (pa != null) marker(st.cx, cy, r, pa, v.label, "gold", 0.0065);

      txt(li2 === 0 ? levels[0].cap : (li2 === 1 ? levels[1].cap : levels[2].cap),
          st.cx, cy - S.U * 0.020, S.U * 0.030, P.ink, "center", 700);
      txt("window " + w.toFixed(w < 1 ? 3 : 2) + "°   ·   ×" + mag.toFixed(1),
          st.cx, cy + S.U * 0.020, S.U * 0.021, P.gold, "center", 600);
      txtFit(placeWords(d), st.cx, cy + r * 1.30, S.U * 0.021, P.dim,
             "center", 500, st.w * 0.92);
      txtFit(L.label + " — " + (L.of === "sign" ? L.n * 12 : L.n) +
             " on the circle, " +
             (360 / (L.of === "sign" ? L.n * 12 : L.n)).toFixed(4) + "° each",
             st.cx, cy + r * 1.30 + S.U * 0.034, S.U * 0.019, P.dim,
             "center", 500, st.w * 0.92);
      var through = (d - levels[2].from) / (levels[2].to - levels[2].from);
      txt((through * 100).toFixed(1) + "% through " + levels[2].cap,
          st.cx, cy + r * 1.30 + S.U * 0.068, S.U * 0.020, P.gold, "center", 600);
    });

  /* --- 5. concentric divisions ------------------------------------------ */
  composer("rings", "Divisions of the circle",
    "one division, or several nested inside each other, with a hand reading them",
    function (bag) {
      /* ONE is enough. Requiring two left a single division — "the navāṃśa
         division", say — with no composer at all: it fell to Layers, whose
         sub-pick also refused it, and the panel drew nothing. A lone division
         is a perfectly good picture; it just needs the sweeping hand to be
         an animation rather than a diagram. */
      return (count(bag, "lanes") >= 1 &&
              all(bag) === count(bag, "lanes") + count(bag, "lon"))
        ? count(bag, "lanes") + count(bag, "lon") : -1;
    },
    function (bag, p, st) {
      var P = pal();
      var Ls = bag.lanes.map(function (x) { return x.v; });
      var cy = st.y + st.h * 0.40;
      var rOut = Math.min(st.w * 0.40, st.h * 0.34);
      var step = rOut * 0.62 / Math.max(1, Ls.length - 1 || 1);
      var shown = Math.max(1, Math.round(Ls.length * Math.min(1, p * 1.3)));
      Ls.forEach(function (L, i) {
        if (i >= shown) return;
        var r = rOut - i * step;
        var n = L.of === "sign" ? L.n * 12 : L.n;
        ringTicks(st.cx, cy, r, Math.min(n, 120), 0.45 - i * 0.06, 0.035);
        txt(L.label + " · " + n, st.cx, cy - r - S.U * 0.020,
            S.U * 0.019, i === 0 ? P.gold : P.dim, "center", 700);
      });
      (bag.lon || []).forEach(function (x) {
        marker(st.cx, cy, rOut, x.v.deg, x.v.label, x.v.tone, 0.006); });
      /* A set of divisions has nothing of its own that moves, so a hand sweeps
         the circle and names the arc it is crossing in each ring. Without it
         this view is a still photograph presented as an animation. */
      var sweep = p * 360;
      var ca = S.ctx;
      ca.save();
      ca.strokeStyle = P.gold; ca.globalAlpha = 0.85;
      ca.lineWidth = Math.max(2, S.U * 0.0030);
      ca.beginPath(); ca.moveTo(st.cx, cy);
      ca.lineTo(st.cx + Math.cos((sweep - 90) * R2) * rOut * 1.06,
                cy + Math.sin((sweep - 90) * R2) * rOut * 1.06);
      ca.stroke(); ca.restore();
      var readout = Ls.map(function (L) {
        var n2 = L.of === "sign" ? L.n * 12 : L.n;
        var idx = Math.floor(norm(sweep) / (360 / n2));
        var nm = (L.names && L.names[idx % L.names.length]) || (idx + 1);
        return L.label + " " + nm;
      }).join("   ·   ");
      txtFit(norm(sweep).toFixed(1) + "°", st.cx, cy - S.U * 0.016,
             S.U * 0.028, P.gold, "center", 700, st.w * 0.5);
      txtFit(readout, st.cx, cy + S.U * 0.022, S.U * 0.018, P.ink,
             "center", 500, rOut * 1.5);
      var totals = Ls.map(function (L) {
        return (L.of === "sign" ? L.n * 12 : L.n); });
      txtFit(totals.join(" · ") + "  arcs on one circle",
             st.cx, cy + rOut * 1.30, S.U * 0.021, P.ink, "center", 600, st.w * 0.9);
      txtFit("the finest here is " +
             (360 / Math.max.apply(null, totals)).toFixed(4) + "° wide",
             st.cx, cy + rOut * 1.30 + S.U * 0.034, S.U * 0.019, P.dim,
             "center", 500, st.w * 0.9);
    });

  /* --- 6. magnitudes side by side --------------------------------------- */
  composer("bars", "Comparison",
    "magnitudes on one axis, with the working under each",
    function (bag) {
      var n = count(bag, "sset") + count(bag, "scalar");
      if (!n) return -1;
      return (all(bag) === n) ? n : -1;
    },
    function (bag, p, st) {
      var P = pal();
      var rows = [];
      (bag.sset || []).forEach(function (x) {
        x.v.items.forEach(function (it) {
          rows.push({ k: it.k, v: it.v, work: it.work, unit: x.v.unit,
                      max: x.v.max, grp: x.v.label }); }); });
      (bag.scalar || []).forEach(function (x) {
        rows.push({ k: x.v.label, v: x.v.v, work: x.v.work, unit: x.v.unit,
                    max: x.v.max, grp: null }); });
      if (!rows.length) return;
      /* a shared axis only when the units agree; otherwise each bar is scaled
         to its own maximum and the frame says so, because bars on different
         axes that look comparable are a lie */
      var units = [];
      rows.forEach(function (r) { if (units.indexOf(r.unit) < 0) units.push(r.unit); });
      var shared = units.length === 1;
      var gmax = 0;
      rows.forEach(function (r) {
        gmax = Math.max(gmax, Math.abs(r.v), r.max || 0); });
      var n = Math.min(rows.length, 14);
      var top = st.y + st.h * 0.08;
      var hgt = Math.min(st.h * 0.072, (st.h * 0.74) / n);
      var x0 = st.x + st.w * 0.26, bw = st.w * 0.62;
      for (var i = 0; i < n; i++) {
        var r = rows[i], y = top + i * hgt;
        var mx = shared ? gmax : Math.max(Math.abs(r.v), r.max || Math.abs(r.v) || 1);
        var frac = (mx ? Math.abs(r.v) / mx : 0) * grow(p, i, n);
        txt(r.k, st.x + st.w * 0.24, y + hgt * 0.45, S.U * 0.019, P.ink, "right", 600);
        var c = S.ctx;
        c.save();
        c.fillStyle = P.line; c.globalAlpha = 0.5;
        c.fillRect(x0, y + hgt * 0.22, bw, hgt * 0.46);
        c.fillStyle = r.v < 0 ? P.mal : P.gold; c.globalAlpha = 0.9;
        c.fillRect(x0, y + hgt * 0.22, bw * frac, hgt * 0.46);
        c.restore();
        /* the number counts up with its bar, so a single-row comparison is
           still something happening rather than a photograph of a bar */
        var showv = r.v * grow(p, i, n);
        var lab = (Math.abs(r.v) >= 1000 ? Math.round(showv).toLocaleString()
                                         : showv.toFixed(2)) + (r.unit ? " " + r.unit : "");
        txt(lab, x0 + bw * frac + S.U * 0.010, y + hgt * 0.45,
            S.U * 0.017, P.dim, "left", 600);
        if (r.work)
          txt(r.work, st.x + st.w * 0.24, y + hgt * 0.78, S.U * 0.014,
              P.dim, "right", 500);
      }
      var foot = top + n * hgt + S.U * 0.030;
      txtFit(rows[0].grp || "comparison", st.cx, foot, S.U * 0.023, P.ink,
             "center", 700, st.w * 0.9);
      txtFit(shared ? "one axis — every bar is to the same scale, max " +
                      gmax.toFixed(2) + " " + (units[0] || "")
                    : "different units: each bar is scaled to its own maximum, " +
                      "so their lengths are NOT comparable",
             st.cx, foot + S.U * 0.032, S.U * 0.018,
             shared ? P.dim : P.mal, "center", 500, st.w * 0.92);
      if (rows.length > n)
        txt("+" + (rows.length - n) + " more not shown", st.cx, foot + S.U * 0.062,
            S.U * 0.017, P.dim, "center", 500);
    });

  /* --- 7. a network ----------------------------------------------------- */
  composer("graph", "Relation network",
    "pairs drawn as chords on the ring, each labelled with its reason",
    function (bag) {
      return (count(bag, "edges") >= 1 &&
              all(bag) === count(bag, "edges") + count(bag, "lon"))
        ? count(bag, "edges") + count(bag, "lon") : -1;
    },
    function (bag, p, st) {
      var P = pal();
      var items = [];
      bag.edges.forEach(function (x) {
        x.v.items.forEach(function (e) { items.push(e); }); });
      var r = Math.min(st.w * 0.36, st.h * 0.30);
      var cy = st.y + st.h * 0.35;
      ringTicks(st.cx, cy, r, 12, 0.45, 0.05);
      var shown = Math.max(1, Math.round(items.length * Math.min(1, p * 1.3)));
      var c = S.ctx;
      c.save();
      c.globalCompositeOperation = "lighter";
      for (var i = 0; i < items.length; i++) {
        var g = grow(p, i, items.length);
        if (g <= 0) continue;
        var e = items[i];
        var a1 = (e.a - 90) * R2, a2 = (e.b - 90) * R2;
        c.strokeStyle = P.gold; c.globalAlpha = 0.34 * g;
        c.lineWidth = Math.max(1, S.U * 0.0020) * (0.5 + 0.5 * g);
        c.beginPath();
        /* drawn from a toward b as it grows, bowed through the centre so
           parallel chords stay distinguishable */
        var x1 = st.cx + Math.cos(a1) * r, y1 = cy + Math.sin(a1) * r;
        var x2 = st.cx + Math.cos(a2) * r, y2 = cy + Math.sin(a2) * r;
        var ex = x1 + (x2 - x1) * g, ey = y1 + (y2 - y1) * g;
        c.moveTo(x1, y1);
        c.quadraticCurveTo(st.cx + (x1 - st.cx) * (1 - g) * 0.4,
                           cy + (y1 - cy) * (1 - g) * 0.4, ex, ey);
        c.stroke();
      }
      c.restore();
      var seen = {};
      items.slice(0, shown).forEach(function (e) {
        if (!seen[e.aLabel]) { marker(st.cx, cy, r, e.a, e.aLabel, "glow", 0.0045);
                               seen[e.aLabel] = 1; }
        if (!seen[e.bLabel]) { marker(st.cx, cy, r, e.b, e.bLabel, "gold", 0.0045);
                               seen[e.bLabel] = 1; }
      });
      (bag.lon || []).forEach(function (x) {
        marker(st.cx, cy, r, x.v.deg, x.v.label, "gold", 0.006); });
      txt(shown + " of " + items.length, st.cx, cy, S.U * 0.026, P.dim, "center", 600);
      var y = cy + r * 1.34;
      txtFit(bag.edges[0].v.label, st.cx, y, S.U * 0.024, P.ink, "center", 700, st.w * 0.9);
      /* the reason of whichever edge the playhead is on, so the frame teaches
         rather than decorating */
      var cur = items[Math.min(items.length - 1, shown - 1)];
      if (cur)
        txtFit(cur.aLabel + " → " + cur.bLabel + "   ·   " + cur.why,
               st.cx, y + S.U * 0.036, S.U * 0.020, P.gold, "center", 500, st.w * 0.95);
    });

  /* --- 8. nested time --------------------------------------------------- */
  composer("gears", "Daśā gears",
    "periods as wheels, the inner one turning inside the outer",
    function (bag) {
      var ss = (bag.spanset || []).filter(function (x) { return x.v.nested; });
      return (ss.length === 1 && all(bag) === count(bag, "spanset")) ? all(bag) : -1;
    },
    function (bag, p, st) {
      var P = pal();
      var items = bag.spanset[0].v.items;
      var rings = [[], []];
      items.forEach(function (s) { rings[s.ring === 1 ? 1 : 0].push(s); });
      var cy = st.y + st.h * 0.40;
      var rOut = Math.min(st.w * 0.40, st.h * 0.34);
      var t0 = Math.min.apply(null, rings[0].map(function (s) { return s.from; }));
      var t1 = Math.max.apply(null, rings[0].map(function (s) { return s.to; }));
      var now = t0 + (t1 - t0) * p;
      [0, 1].forEach(function (ri) {
        var list = rings[ri]; if (!list.length) return;
        var r = rOut * (ri === 0 ? 1 : 0.58);
        var a0 = Math.min.apply(null, list.map(function (s) { return s.from; }));
        var a1 = Math.max.apply(null, list.map(function (s) { return s.to; }));
        list.forEach(function (s) {
          var f = (s.from - a0) / (a1 - a0) * 360, t = (s.to - a0) / (a1 - a0) * 360;
          var live = now >= s.from && now < s.to;
          arcBand(st.cx, cy, r, f, t, live ? P.gold : P.dim,
                  live ? 0.85 : 0.28, Math.max(10, S.U * (ri === 0 ? 0.030 : 0.026)));
          var mid = (f + t) / 2 * R2 - Math.PI / 2;
          if (t - f > 11)
            txt(s.label, st.cx + Math.cos(mid) * r, cy + Math.sin(mid) * r,
                S.U * 0.016, live ? P.bg : P.ink, "center", 700);
        });
      });
      /* which pair is running, named */
      var md = null, ad = null;
      rings[0].forEach(function (s) { if (now >= s.from && now < s.to) md = s; });
      rings[1].forEach(function (s) { if (now >= s.from && now < s.to) ad = s; });
      txt(md ? md.label : "—", st.cx, cy - S.U * 0.016, S.U * 0.030, P.ink, "center", 700);
      txt(ad ? "antara " + ad.label : "", st.cx, cy + S.U * 0.020,
          S.U * 0.021, P.gold, "center", 600);
      var d = new Date(now);
      txt(d.toISOString().slice(0, 10), st.cx, cy + rOut * 1.28,
          S.U * 0.022, P.dim, "center", 500);
      txtFit(bag.spanset[0].v.label, st.cx, cy + rOut * 1.28 + S.U * 0.036,
             S.U * 0.020, P.dim, "center", 500, st.w * 0.9);
    });

  /* --- 9. a flat timeline ----------------------------------------------- */
  composer("timeline", "Timeline",
    "intervals laid along the day or the span, with the playhead on them",
    function (bag) {
      var n = count(bag, "span") + count(bag, "spanset");
      if (!n) return -1;
      var nested = (bag.spanset || []).some(function (x) { return x.v.nested; });
      if (nested) return -1;
      return (all(bag) === n) ? n : -1;
    },
    function (bag, p, st) {
      var P = pal();
      var lanes2 = [];
      (bag.spanset || []).forEach(function (x) {
        lanes2.push({ label: x.v.label, items: x.v.items }); });
      (bag.span || []).forEach(function (x) {
        lanes2.push({ label: x.v.label, items: [{ from: x.v.from, to: x.v.to,
                                                  label: x.v.label }] }); });
      var t0 = Infinity, t1 = -Infinity;
      lanes2.forEach(function (L) { L.items.forEach(function (s) {
        t0 = Math.min(t0, s.from); t1 = Math.max(t1, s.to); }); });
      if (!isFinite(t0) || t1 <= t0) return;
      var top = st.y + st.h * 0.16;
      var lh = Math.min(st.h * 0.16, (st.h * 0.62) / lanes2.length);
      var x0 = st.x + st.w * 0.05, bw = st.w * 0.90;
      var now = t0 + (t1 - t0) * p;
      lanes2.forEach(function (L, li) {
        var y = top + li * lh;
        txt(L.label, x0, y - S.U * 0.012, S.U * 0.019, P.dim, "left", 600);
        L.items.forEach(function (s, si) {
          var a = x0 + bw * (s.from - t0) / (t1 - t0);
          var w = bw * (s.to - s.from) / (t1 - t0);
          var live = now >= s.from && now < s.to;
          var c = S.ctx;
          c.save();
          c.fillStyle = live ? P.gold : (si % 2 ? P.line : P.glow);
          c.globalAlpha = live ? 0.92 : 0.40;
          c.fillRect(a, y, Math.max(1, w - 1), lh * 0.46);
          c.restore();
          if (w > st.w * 0.07)
            txt(s.label, a + w / 2, y + lh * 0.23, S.U * 0.015,
                live ? P.bg : P.ink, "center", 700);
        });
      });
      /* the playhead */
      var px = x0 + bw * p;
      var c2 = S.ctx;
      c2.save();
      c2.strokeStyle = P.gold; c2.lineWidth = Math.max(2, S.U * 0.0028);
      c2.beginPath(); c2.moveTo(px, top - S.U * 0.016);
      c2.lineTo(px, top + lanes2.length * lh); c2.stroke();
      c2.restore();
      var d = new Date(now);
      var hh = ("0" + d.getUTCHours()).slice(-2);
      var mm = ("0" + d.getUTCMinutes()).slice(-2);
      var days = (t1 - t0) / 86400000;
      txt(days > 3 ? d.toISOString().slice(0, 10) : hh + ":" + mm + " UTC",
          st.cx, top + lanes2.length * lh + S.U * 0.040,
          S.U * 0.024, P.gold, "center", 700);
      txtFit("span " + (days > 3 ? days.toFixed(1) + " days"
                                 : (days * 24).toFixed(2) + " hours"),
             st.cx, top + lanes2.length * lh + S.U * 0.075,
             S.U * 0.019, P.dim, "center", 500, st.w * 0.9);
    });

  /* --- 10. a quantity over time ----------------------------------------- */
  composer("trace", "Over time",
    "a quantity plotted as the days run, with the playhead reading it off",
    function (bag) {
      return (count(bag, "series") >= 1 && all(bag) === count(bag, "series"))
        ? count(bag, "series") : -1;
    },
    function (bag, p, st, ctxData) {
      var P = pal();
      var sers = bag.series.map(function (x) { return x.v; });
      var when = (ctxData && ctxData.when) || Date.now();
      var days = (ctxData && ctxData.spanDays) || 365;
      var t0 = when, t1 = when + days * 86400000;
      var top = st.y + st.h * 0.14, hgt = st.h * 0.58;
      var x0 = st.x + st.w * 0.08, bw = st.w * 0.86;
      var N = 180;
      /* sample once, find the range, then draw — a plot auto-scaled per frame
         would jitter as the playhead moved */
      var cols = sers.map(function (s) {
        var vals = [];
        for (var i = 0; i <= N; i++) {
          var v = s.at(t0 + (t1 - t0) * i / N);
          vals.push(typeof v === "number" && isFinite(v) ? v : null);
        }
        return vals;
      });
      var lo = Infinity, hi = -Infinity;
      cols.forEach(function (v) { v.forEach(function (x) {
        if (x != null) { lo = Math.min(lo, x); hi = Math.max(hi, x); } }); });
      if (!isFinite(lo) || hi <= lo) { lo = 0; hi = 1; }
      var pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
      function Y(v) { return top + hgt * (1 - (v - lo) / (hi - lo)); }
      var c = S.ctx;
      /* axis */
      c.save();
      c.strokeStyle = P.line; c.globalAlpha = 0.6; c.lineWidth = 1.5;
      [0, 0.25, 0.5, 0.75, 1].forEach(function (f) {
        var y = top + hgt * f;
        c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + bw, y); c.stroke();
        txt((hi - (hi - lo) * f).toFixed(1), x0 - S.U * 0.010, y,
            S.U * 0.015, P.dim, "right", 500);
      });
      c.restore();
      var upto = Math.round(N * p);
      cols.forEach(function (vals, si) {
        c.save();
        c.strokeStyle = si === 0 ? P.gold : P.glow;
        c.lineWidth = Math.max(2, S.U * 0.0026);
        c.globalAlpha = 0.95;
        c.beginPath();
        var started = false;
        for (var i = 0; i <= upto; i++) {
          if (vals[i] == null) { started = false; continue; }
          var x = x0 + bw * i / N, y = Y(vals[i]);
          /* a longitude wraps at 360 and a line drawn across the wrap is a
             stripe through the middle of the plot that means nothing */
          if (i > 0 && vals[i - 1] != null &&
              sers[si].range && Math.abs(vals[i] - vals[i - 1]) > (hi - lo) * 0.6)
            started = false;
          if (!started) { c.moveTo(x, y); started = true; } else c.lineTo(x, y);
        }
        c.stroke();
        c.restore();
        var cv = vals[Math.min(N, upto)];
        if (cv != null) {
          c.save(); c.fillStyle = si === 0 ? P.gold : P.glow;
          c.beginPath();
          c.arc(x0 + bw * upto / N, Y(cv), Math.max(3, S.U * 0.005), 0, Math.PI * 2);
          c.fill(); c.restore();
          txt(sers[si].label + "  " + cv.toFixed(2) + (sers[si].unit || ""),
              st.cx, top + hgt + S.U * (0.040 + si * 0.030),
              S.U * 0.021, si === 0 ? P.gold : P.glow, "center", 600);
        }
      });
      var d = new Date(t0 + (t1 - t0) * p);
      txt(d.toISOString().slice(0, 10), st.cx,
          top + hgt + S.U * (0.040 + sers.length * 0.030),
          S.U * 0.022, P.ink, "center", 700);
      txtFit(days.toFixed(0) + " days from today", st.cx,
             top + hgt + S.U * (0.072 + sers.length * 0.030),
             S.U * 0.018, P.dim, "center", 500, st.w * 0.9);
    });

  /* --- 11. a matrix ----------------------------------------------------- */
  composer("heat", "Table",
    "a grid of numbers, shaded by value",
    function (bag) {
      return (count(bag, "grid") === 1 && all(bag) === 1) ? 1 : -1;
    },
    function (bag, p, st) {
      var P = pal(), G = bag.grid[0].v;
      var rows = G.rows, cols = G.cols || [];
      var nR = Math.min(rows.length, 18), nC = Math.min(cols.length || 1, 14);
      var top = st.y + st.h * 0.14;
      var left = st.x + st.w * 0.22;
      var cw = (st.w * 0.74) / nC;
      var ch = Math.min(st.h * 0.062, (st.h * 0.66) / nR);
      var mx = G.max || 0;
      if (!mx) rows.forEach(function (r) { (r.vals || []).forEach(function (v) {
        if (typeof v === "number") mx = Math.max(mx, v); }); });
      if (!mx) mx = 1;
      for (var ci = 0; ci < nC; ci++)
        txt(String(cols[ci] || ci + 1).slice(0, 7), left + cw * (ci + 0.5),
            top - S.U * 0.016, S.U * 0.014, P.dim, "center", 600);
      for (var ri = 0; ri < nR; ri++) {
        var r = rows[ri], y = top + ri * ch;
        var g = grow(p, ri, nR);
        txt(r.label || r.k, left - S.U * 0.012, y + ch * 0.5,
            S.U * 0.017, P.ink, "right", 600);
        if (g <= 0) continue;
        for (var ci2 = 0; ci2 < nC; ci2++) {
          var v = (r.vals || [])[ci2];
          var c = S.ctx;
          c.save();
          if (typeof v === "number") {
            c.fillStyle = P.gold;
            c.globalAlpha = (0.14 + 0.72 * Math.min(1, v / mx)) * g;
          } else { c.fillStyle = P.line; c.globalAlpha = 0.25 * g; }
          c.fillRect(left + cw * ci2 + 1, y + 1, cw - 2, ch - 2);
          c.restore();
          if (typeof v === "number" && g > 0.6)
            txt(String(v), left + cw * (ci2 + 0.5), y + ch * 0.5,
                S.U * 0.015, v / mx > 0.55 ? P.bg : P.ink, "center", 700);
        }
      }
      var foot = top + nR * ch + S.U * 0.030;
      txtFit(G.label, st.cx, foot, S.U * 0.023, P.ink, "center", 700, st.w * 0.9);
      txtFit("shaded against " + mx + (G.max ? " — the classical maximum" : " — the largest here"),
             st.cx, foot + S.U * 0.032, S.U * 0.018, P.dim, "center", 500, st.w * 0.9);
    });

  /* --- the kundli, in both conventions ----------------------------------

     The two diagrams carry the same twelve cells and disagree about what is
     nailed down. The NORTH fixes the houses — the first is always the top
     diamond — and rotates the signs through them, so a reader sees the shape
     of the life. The SOUTH fixes the signs in the frame and moves the house
     numbers, so a reader sees the shape of the zodiac. Offering one and
     calling it "the chart" would be taking a side; both are here and the
     perspective switcher moves between them. */

  /* centroids of the North Indian diamond, as fractions of its box. House 1
     is the top centre, and the count runs anticlockwise, which is the
     convention every printed North Indian chart uses. */
  var NORTH = [
    [0.50, 0.25], [0.26, 0.11], [0.11, 0.26], [0.25, 0.50], [0.11, 0.74],
    [0.26, 0.89], [0.50, 0.75], [0.74, 0.89], [0.89, 0.74], [0.75, 0.50],
    [0.89, 0.26], [0.74, 0.11]
  ];
  /* the South Indian frame: sign index at each cell of the 4×4 ring, Meṣa at
     the second cell of the top row and running clockwise */
  var SOUTH = [
    [11, 0], [0, 1], [1, 2], [2, 3],
    [10, 0], null, null, [3, 3],
    [9, 0], null, null, [4, 3],
    [8, 0], [7, 1], [6, 2], [5, 3]
  ];

  function kundliFrame(st) {
    var side = Math.min(st.w * 0.92, st.h * 0.74);
    return { x: st.cx - side / 2, y: st.y + st.h * 0.10, s: side };
  }
  function drawCell(F, cx, cy, cell, P, hot, showHouse, showSign) {
    var u = F.s;
    var lines = cell.items.map(function (it) {
      return it.label + (it.retro ? " ℞" : ""); });
    var head = [];
    if (showSign) head.push(window.SPNodes.RASHI[cell.sign].slice(0, 4));
    if (showHouse) head.push(String(cell.house));
    txt(head.join(" · "), cx, cy - u * 0.045, u * 0.026,
        hot ? P.gold : P.dim, "center", 700);
    lines.slice(0, 5).forEach(function (L, i) {
      txt(L, cx, cy - u * 0.012 + i * u * 0.030, u * 0.028,
          L.indexOf("Sūrya") === 0 ? P.gold : P.ink, "center", 600);
    });
  }
  composer("kundliN", "North Indian kundli",
    "the diamond — houses fixed, signs rotating through them",
    function (bag) {
      return (count(bag, "houses") === 1 && all(bag) === 1) ? 1.4 : -1;
    },
    function (bag, p, st) {
      var P = pal(), H = bag.houses[0].v, F = kundliFrame(st), c = S.ctx;
      var x = F.x, y = F.y, u = F.s;
      c.save();
      c.strokeStyle = P.dim; c.globalAlpha = 0.7;
      c.lineWidth = Math.max(1.5, S.U * 0.0020);
      c.strokeRect(x, y, u, u);
      /* the two diagonals and the inner diamond make all twelve cells */
      c.beginPath();
      c.moveTo(x, y); c.lineTo(x + u, y + u);
      c.moveTo(x + u, y); c.lineTo(x, y + u);
      c.moveTo(x + u / 2, y); c.lineTo(x + u, y + u / 2);
      c.lineTo(x + u / 2, y + u); c.lineTo(x, y + u / 2); c.closePath();
      c.stroke();
      c.restore();
      var lit = Math.round(12 * Math.min(1, p * 1.2));
      H.cells.forEach(function (cell, i) {
        if (i >= lit) return;
        var pos = NORTH[i];
        drawCell(F, x + pos[0] * u, y + pos[1] * u, cell, P,
                 cell.house === 1, true, true);
      });
      txtFit(H.label + " — " + H.from + " in " +
             window.SPNodes.RASHI[H.lagna], st.cx, y + u + S.U * 0.034,
             S.U * 0.022, P.ink, "center", 600, st.w * 0.92);
      txtFit("North Indian: the first house is always the top diamond; the " +
             "signs turn through it", st.cx, y + u + S.U * 0.068,
             S.U * 0.018, P.dim, "center", 500, st.w * 0.92);
    });

  composer("kundliS", "South Indian kundli",
    "the square — signs fixed in the frame, the house numbers moving",
    function (bag) {
      return (count(bag, "houses") === 1 && all(bag) === 1) ? 1.3 : -1;
    },
    function (bag, p, st) {
      var P = pal(), H = bag.houses[0].v, F = kundliFrame(st), c = S.ctx;
      var x = F.x, y = F.y, u = F.s, q = u / 4;
      var bySign = {};
      H.cells.forEach(function (cl) { bySign[cl.sign] = cl; });
      c.save();
      c.strokeStyle = P.dim; c.globalAlpha = 0.7;
      c.lineWidth = Math.max(1.5, S.U * 0.0020);
      c.strokeRect(x, y, u, u);
      for (var k = 1; k < 4; k++) {
        /* only the outer ring is divided: the middle four cells are one box */
        c.beginPath(); c.moveTo(x + q * k, y); c.lineTo(x + q * k, y + q); c.stroke();
        c.beginPath(); c.moveTo(x + q * k, y + u - q); c.lineTo(x + q * k, y + u); c.stroke();
        c.beginPath(); c.moveTo(x, y + q * k); c.lineTo(x + q, y + q * k); c.stroke();
        c.beginPath(); c.moveTo(x + u - q, y + q * k); c.lineTo(x + u, y + q * k); c.stroke();
      }
      c.strokeRect(x + q, y + q, u - 2 * q, u - 2 * q);
      c.restore();
      var lit = Math.round(12 * Math.min(1, p * 1.2));
      var shown = 0;
      SOUTH.forEach(function (cellSpec, idx) {
        if (!cellSpec) return;
        var sign = cellSpec[0], cl = bySign[sign];
        if (!cl) return;
        if (shown++ >= lit) return;
        var col = idx % 4, row = Math.floor(idx / 4);
        var ccx = x + q * (col + 0.5), ccy = y + q * (row + 0.5);
        if (cl.house === 1) {
          c.save();
          c.fillStyle = P.gold; c.globalAlpha = 0.13;
          c.fillRect(x + q * col, y + q * row, q, q);
          c.restore();
        }
        drawCell({ s: q * 2.6 }, ccx, ccy, cl, P, cl.house === 1, true, true);
      });
      txtFit(H.label + " — " + H.from + " in " +
             window.SPNodes.RASHI[H.lagna], st.cx, y + u + S.U * 0.034,
             S.U * 0.022, P.ink, "center", 600, st.w * 0.92);
      txtFit("South Indian: the signs are nailed to the frame; the lit cell " +
             "is the first house", st.cx, y + u + S.U * 0.068,
             S.U * 0.018, P.dim, "center", 500, st.w * 0.92);
    });

  /* --- Sudarśana: the same chart from three first houses ----------------- */
  composer("sudarshana", "Sudarśana Cakra",
    "one chart read from Lagna, from Candra and from Sūrya, as three rings",
    function (bag) {
      return (count(bag, "houseset") === 1 && all(bag) === 1) ? 1.5 : -1;
    },
    function (bag, p, st) {
      var P = pal(), H = bag.houseset[0].v, c = S.ctx;
      var cy = st.y + st.h * 0.40;
      var rOut = Math.min(st.w * 0.46, st.h * 0.37);
      /* Three rings have to share one radius, and the first version gave the
         innermost a quarter of it — too little to hold a house number and two
         graha names, so the middle of the frame became a knot. Equal-WIDTH
         annuli rather than equal ratios: each ring gets the same room, and the
         hub is just large enough to be a hub. */
      var RING = [rOut, rOut * 0.785, rOut * 0.570];
      var HUB = rOut * 0.355;
      var sweep = p * 360;
      H.items.forEach(function (ch, ri) {
        var r = RING[ri], rin = ri < 2 ? RING[ri + 1] : HUB;
        c.save();
        c.strokeStyle = P.dim; c.globalAlpha = 0.45;
        c.lineWidth = Math.max(1, S.U * 0.0014);
        c.beginPath(); c.arc(st.cx, cy, r, 0, Math.PI * 2); c.stroke();
        for (var i = 0; i < 12; i++) {
          var a = (i * 30 - 90) * R2;
          c.beginPath();
          c.moveTo(st.cx + Math.cos(a) * rin, cy + Math.sin(a) * rin);
          c.lineTo(st.cx + Math.cos(a) * r, cy + Math.sin(a) * r);
          c.stroke();
        }
        c.restore();
        ch.cells.forEach(function (cell, hi) {
          var mid = ((hi * 30) + 15 - 90) * R2;
          var rr = (r + rin) / 2;
          var live = Math.floor(norm(sweep) / 30) === hi;
          if (live) {
            c.save(); c.fillStyle = P.gold; c.globalAlpha = 0.14;
            c.beginPath();
            c.arc(st.cx, cy, r, (hi * 30 - 90) * R2, ((hi + 1) * 30 - 90) * R2);
            c.arc(st.cx, cy, rin, ((hi + 1) * 30 - 90) * R2, (hi * 30 - 90) * R2, true);
            c.closePath(); c.fill(); c.restore();
          }
          var names = cell.items.map(function (it) {
            return it.label.slice(0, 2); }).join("·");
          var tx = st.cx + Math.cos(mid) * rr, ty = cy + Math.sin(mid) * rr;
          var band = (r - rin);
          txt(String(cell.house), tx, ty - band * 0.17,
              S.U * 0.0155, live ? P.gold : P.dim, "center", 700);
          if (names)
            txtFit(names, tx, ty + band * 0.20, S.U * 0.0135, P.ink,
                   "center", 600, band * 1.5);
        });
        /* the ring's name on the left margin, where no cell text goes */
        txt(ch.from, st.cx - (r + rin) / 2, cy - (r - rin) * 0.42,
            S.U * 0.0155, ri === 0 ? P.gold : P.dim, "center", 700);
      });
      /* the hub, so the three rings read as rings rather than a pie */
      c.save();
      c.fillStyle = P.bg; c.globalAlpha = 1;
      c.beginPath(); c.arc(st.cx, cy, HUB, 0, Math.PI * 2); c.fill();
      c.strokeStyle = P.dim; c.globalAlpha = 0.45;
      c.lineWidth = Math.max(1, S.U * 0.0014);
      c.beginPath(); c.arc(st.cx, cy, HUB, 0, Math.PI * 2); c.stroke();
      c.restore();
      var hi2 = Math.floor(norm(sweep) / 30);
      txt(String(hi2 + 1), st.cx, cy - S.U * 0.012, S.U * 0.040, P.gold,
          "center", 700);
      txt("bhāva", st.cx, cy + S.U * 0.018, S.U * 0.016, P.dim, "center", 500);
      var who = H.items.map(function (ch) {
        var names = ch.cells[hi2].items.map(function (it) { return it.label; });
        return ch.from + " " + (hi2 + 1) + ": " + (names.length ? names.join(", ") : "—");
      }).join("    ·    ");
      txtFit("house " + (hi2 + 1) + " from each", st.cx, cy + rOut * 1.22,
             S.U * 0.023, P.ink, "center", 700, st.w * 0.9);
      txtFit(who, st.cx, cy + rOut * 1.22 + S.U * 0.034, S.U * 0.018,
             P.gold, "center", 500, st.w * 0.95);
      txtFit("a house is strong when it is strong from all three",
             st.cx, cy + rOut * 1.22 + S.U * 0.066, S.U * 0.018,
             P.dim, "center", 500, st.w * 0.9);
    });

  /* --- the almanac leaf ------------------------------------------------- *
     Its own composer because it is its own thing: a printed page rather than
     a diagram, drawn edge to edge rather than inside the stage box, and so
     it ignores the stage's margins and takes the whole frame. */
  composer("almanac", "The almanac leaf",
    "the day as an ornate pañcāṅga card, with the light walking down the limbs",
    function (bag) {
      return (count(bag, "almanac") === 1 && all(bag) === 1) ? 2 : -1;
    },
    function (bag, p) {
      window.SPAlmanac.draw(S.ctx, S.W, S.H, bag.almanac[0].v, p, pal(),
                            { foot: S.handle });
    });

  /* --- 12. the catch-all: panels ---------------------------------------- *
     Always scores, so there is no selection that draws nothing. It splits the
     stage and runs the best single-group composer in each panel. */
  composer("layers", "Layers",
    "the stage split into panels, each drawn by whatever fits it",
    function (bag) { return all(bag) ? 0.5 : -1; },
    function (bag, p, st, ctxData) {
      var P = pal();
      /* one group per kind present, in a stable order */
      var ORDER = ["lon", "lonset", "lanes", "edges", "sset", "scalar",
                   "spanset", "span", "series", "grid"];
      var groups = [];
      ORDER.forEach(function (k) {
        if ((bag[k] || []).length) {
          var g = {}; g[k] = bag[k];
          /* a lone longitude riding with a lanes group belongs with it */
          groups.push(g);
        }
      });
      /* merge lon into lanes, and lon into edges, so the panels are the
         meaningful pairs rather than one panel per kind */
      var merged = [];
      groups.forEach(function (g) {
        var k = Object.keys(g)[0];
        if (k === "lon" && groups.some(function (o) { return o.lanes; })) return;
        if (k === "lon" && groups.some(function (o) { return o.edges; })) return;
        if (k === "lanes" && bag.lon) g.lon = bag.lon;
        if (k === "edges" && bag.lon) g.lon = bag.lon;
        merged.push(g);
      });
      if (!merged.length) merged = groups;
      var n = Math.min(merged.length, 3);
      var ph = st.h / n;
      for (var i = 0; i < n; i++) {
        var sub = { x: st.x, y: st.y + ph * i, w: st.w, h: ph * 0.94,
                    cx: st.cx, cy: st.y + ph * i + ph * 0.47,
                    bandY: st.bandY, bandH: st.bandH, side: st.side };
        var best = pick(merged[i], true);
        if (best) {
          S.ctx.save();
          S.ctx.beginPath();
          S.ctx.rect(0, sub.y - ph * 0.02, S.W, ph * 0.98);
          S.ctx.clip();
          best.draw(merged[i], p, sub, ctxData);
          S.ctx.restore();
        }
        if (i < n - 1) {
          var c = S.ctx;
          c.save();
          c.strokeStyle = P.line; c.globalAlpha = 0.5; c.lineWidth = 1;
          c.beginPath();
          c.moveTo(st.x, sub.y + ph * 0.96); c.lineTo(st.x + st.w, sub.y + ph * 0.96);
          c.stroke(); c.restore();
        }
      }
      if (merged.length > 3)
        txt((merged.length - 3) + " more group(s) not shown — remove a node",
            st.cx, st.y + st.h - S.U * 0.012, S.U * 0.017, P.mal, "center", 500);
    });

  /* ---- the matcher ------------------------------------------------------ */
  /* the rest of this codebase is ES5 by habit, and a studio page that failed
     to parse on an older browser would fail silently and completely */
  function withScore(K, s) {
    return { key: K.key, label: K.label, blurb: K.blurb, draw: K.draw, s: s };
  }
  function pick(bag, noLayers) {
    var best = null;
    COMPOSERS.forEach(function (K) {
      if (noLayers && K.key === "layers") return;
      var s = -1;
      try { s = K.score(bag); } catch (e) { s = -1; }
      if (s > 0 && (!best || s > best.s)) best = withScore(K, s);
    });
    return best;
  }
  /* every composer that can draw this selection at all, best first — this is
     the perspective switcher */
  function options(bag) {
    var out = [];
    COMPOSERS.forEach(function (K) {
      var s = -1;
      try { s = K.score(bag); } catch (e) { s = -1; }
      if (s > 0) out.push({ key: K.key, label: K.label, blurb: K.blurb, s: s });
    });
    return out.sort(function (a, b) { return b.s - a.s; });
  }

  /* ---- bagging a selection ---------------------------------------------- */
  function bagOf(sel, C) {
    var bag = {}, missing = [];
    sel.forEach(function (id) {
      var node = window.SPNodes.byId(id);
      if (!node) { missing.push({ id: id, why: "no such node" }); return; }
      var v = window.SPNodes.resolve(node, C);
      if (!v) { missing.push({ id: id, label: node.label,
                               why: "not available for this chart or moment" }); return; }
      (bag[v.kind] = bag[v.kind] || []).push({ node: node, v: v });
    });
    return { bag: bag, missing: missing };
  }

  /* ---- the public draw -------------------------------------------------- */
  /* `quiet` skips the work only the side panels need. render() is called
     sixty times a second during playback and scoring every composer to build
     a list of alternatives that nothing reads is pure waste. */
  function render(sel, C, p, forceKey, quiet) {
    var B = bagOf(sel, C);
    background();
    if (pal().key !== "parchment") stars();
    var st = stage();
    var P = pal();
    var chosen = null;
    if (forceKey) {
      COMPOSERS.forEach(function (K) {
        if (K.key !== forceKey) return;
        var s = -1;
        try { s = K.score(B.bag); } catch (e) {}
        if (s > 0) chosen = withScore(K, s);
      });
    }
    if (!chosen) chosen = pick(B.bag);
    if (!chosen) {
      /* Two different nothings, and they deserve different words. An empty
         selection is an invitation; a selection whose every node came back
         empty is a finding, and the reason belongs on the frame rather than
         in a console nobody opens. */
      if (!sel.length) {
        txt("Pick something from the wall", st.cx, st.cy, S.U * 0.030,
            P.dim, "center", 500);
      } else {
        txtFit("nothing to draw for this selection", st.cx,
               st.cy - S.U * 0.030, S.U * 0.028, P.ink, "center", 600, st.w * 0.9);
        B.missing.slice(0, 4).forEach(function (m, i) {
          txtFit((m.label || m.id) + " — " + m.why, st.cx,
                 st.cy + S.U * (0.010 + i * 0.034), S.U * 0.019, P.dim,
                 "center", 500, st.w * 0.92);
        });
      }
      captionBand(S.headline || "Studio Pro", S.sub);
      safeGuides();
      return { composer: null, missing: B.missing, options: quiet ? null : [] };
    }
    /* The leaf is a whole page: it paints its own paper to the frame's edge
       and carries its own foot, so the stage's background, stars and caption
       band would all be drawing over or under a finished card. */
    var ownsFrame = chosen.key === "almanac";
    if (ownsFrame) { background(); }
    try { chosen.draw(B.bag, p, st, C); }
    catch (e) {
      txt("this combination could not be drawn", st.cx, st.cy, S.U * 0.026,
          P.mal, "center", 500);
      txtFit(String(e && e.message || e), st.cx, st.cy + S.U * 0.040,
             S.U * 0.017, P.dim, "center", 500, st.w * 0.9);
    }
    /* What the chosen view could not take is returned to the page, not
       swallowed: a studio that silently drops half a selection teaches its
       user nothing about why the picture looks wrong. */
    if (!ownsFrame) captionBand(S.headline || chosen.label, S.sub || chosen.blurb);
    else if (S.headline) {
      /* a headline the user typed still belongs on the leaf, set in its own
         gold rather than in the diagram band's */
      txt(S.headline, S.W / 2, S.H * 0.045, S.U * 0.034,
          pal().gold, "center", 700);
    }
    safeGuides();
    return { composer: chosen.key, label: chosen.label, missing: B.missing,
             options: quiet ? null : options(B.bag) };
  }

  /* ---- the storyboard ----------------------------------------------------

     A reel that makes one point is a card with motion. A reel that makes three
     in sequence — here is the claim, here is the geometry, here is the number
     — is the thing people watch twice. A shot is a selection, a pinned view
     and a length; the storyboard plays them end to end and the recorder
     captures the whole run rather than one shot.

     The dip between shots is not decoration. A hard cut between two dark
     canvases of similar composition reads as a glitch rather than an edit,
     and the eye needs the beat to accept that the subject changed. */
  function storyTotal(shots) {
    var t = 0;
    (shots || []).forEach(function (sh) { t += Math.max(1, sh.seconds || 5); });
    return t || 1;
  }
  function shotAt(shots, p) {
    var total = storyTotal(shots), acc = 0, want = p * total;
    for (var i = 0; i < shots.length; i++) {
      var len = Math.max(1, shots[i].seconds || 5);
      if (want < acc + len || i === shots.length - 1)
        return { i: i, shot: shots[i], local: Math.min(1, (want - acc) / len),
                 len: len, total: total, at: want };
      acc += len;
    }
    return null;
  }
  function renderStory(shots, C, p) {
    if (!shots || !shots.length) return render([], C, p, null);
    var cur = shotAt(shots, p);
    if (!cur) return render([], C, p, null);
    /* a shot is either an Auto selection or a whole Director document; the
       storyboard does not care which, which is what makes a reel able to cut
       from a hand-built scene to a one-click one */
    var out;
    if (cur.shot.doc && window.SPDirector)
      out = window.SPDirector.withDoc(cur.shot.doc, function () {
        return window.SPDirector.render(C, cur.local, true);
      });
    else
      out = render(cur.shot.sel || [], C, cur.local, cur.shot.force || null, true);
    /* the dip: a quarter-second at each join, strongest at the boundary */
    var dipFor = 0.22;
    var into = cur.local * cur.len, left = cur.len - into;
    var a = 0;
    if (cur.i > 0 && into < dipFor) a = 1 - into / dipFor;
    if (cur.i < shots.length - 1 && left < dipFor) a = Math.max(a, 1 - left / dipFor);
    if (a > 0) {
      var c = S.ctx;
      c.save(); c.fillStyle = pal().bg; c.globalAlpha = a * 0.92;
      c.fillRect(0, 0, S.W, S.H); c.restore();
    }
    /* which shot, and how many — a viewer scrubbing needs to know where they
       are, and a three-part reel benefits from the viewer knowing it is three */
    if (shots.length > 1) {
      var st = stage(), P = pal(), c2 = S.ctx;
      var bw = st.w * 0.30, bx = st.cx - bw / 2, by = st.y - S.H * 0.016;
      for (var k = 0; k < shots.length; k++) {
        var seg = bw / shots.length, x = bx + seg * k;
        c2.save();
        c2.fillStyle = k === cur.i ? P.gold : P.line;
        c2.globalAlpha = k === cur.i ? 0.9 : 0.45;
        c2.fillRect(x + 1, by, seg - 2, Math.max(2, S.H * 0.0022));
        c2.restore();
      }
    }
    out.shot = cur.i;
    out.shots = shots.length;
    return out;
  }

  /* ---- the recorder ------------------------------------------------------
     Frame-accurate: the canvas is driven at a fixed step and the stream is
     fed one frame per step, so the file lasts exactly as long as it says
     rather than as long as the machine happened to take. */
  /* The recording in flight, so it can be stopped.

     It used to be unstoppable: once started, its own loop drove the playhead
     for the whole length and nothing could interrupt it. The Pause button sat
     there enabled, writing PLAY = false, which the recorder never read — so
     pressing Pause during a recording did exactly nothing, and pressing Play
     put a SECOND writer on the playhead and would have corrupted the capture.
     A transport control that is enabled and inert is worse than one that is
     greyed out, because the only thing the reader learns is that the page
     does not work. */
  var JOB = null;
  function isRecording() { return !!JOB; }
  function cancelRecording() { if (JOB) JOB.cancel = true; return !!JOB; }

  /* `sel` is either a selection (one shot) or an array of shots, in which
     case `seconds` is ignored and the storyboard's own total is used. */
  /* ---- one definition of "the frame at p" --------------------------------

     There are now three things a frame can be — an Auto composition, a
     storyboard of them, or a Director document — and four callers that need
     one: the preview, the playback loop, the recorder and the still export.
     If each caller chose for itself, the first divergence would be a reel
     that records the picture the preview was not showing, which is the worst
     class of bug this page could have: invisible until someone posts it.

     So the choice is made once, here, and every caller asks this.

     The precedence: a storyboard being played wins, because it sequences
     shots and a shot may itself be a Director document; otherwise Director
     mode wins if it is on; otherwise Auto. */
  function frameAt(sel, C, p, forceKey, shots, quiet) {
    if (shots && shots.length) return renderStory(shots, C, p);
    if (window.SPDirector && window.SPDirector.on())
      return window.SPDirector.render(C, p, quiet);
    return render(sel, C, p, forceKey, quiet);
  }

  function record(sel, C, seconds, fps, forceKey, onFrame) {
    var shots = (sel && sel.length && typeof sel[0] === "object" && sel[0].sel)
      ? sel : null;
    if (shots) seconds = storyTotal(shots);
    return new Promise(function (resolve, reject) {
      var stream = null;
      try { stream = S.cv.captureStream(0); }
      catch (e) { reject(new Error("this browser cannot capture a canvas")); return; }
      var track = stream.getVideoTracks()[0];
      if (!track || !track.requestFrame) {
        reject(new Error("this browser cannot drive frames one at a time"));
        return;
      }
      var types = ["video/mp4;codecs=avc1", "video/webm;codecs=vp9",
                   "video/webm;codecs=vp8", "video/webm"];
      var mime = "";
      types.forEach(function (t) {
        if (!mime && window.MediaRecorder && MediaRecorder.isTypeSupported(t)) mime = t;
      });
      if (!mime) { reject(new Error("no supported recording format")); return; }
      var chunks = [], rec;
      try { rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12000000 }); }
      catch (e) { reject(e); return; }
      var job = { cancel: false };
      JOB = job;
      rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = function () {
        JOB = null;
        resolve({ blob: new Blob(chunks, { type: mime }), mime: mime,
                  seconds: seconds, frames: total, cancelled: job.cancel,
                  madeSeconds: Math.min(i, total) / fps });
      };
      var total = Math.max(2, Math.round(seconds * fps)), i = 0;
      rec.start();
      function step() {
        if (job.cancel || i > total) { try { rec.stop(); } catch (e) {} return; }
        S.p = i / total;
        frameAt(shots ? [] : sel, C, S.p, forceKey, shots, true);
        try { track.requestFrame(); } catch (e) {}
        if (onFrame) onFrame(i / total);
        i++;
        /* a timeout rather than rAF: rAF is throttled in a background tab and
           a reel recorded while the user looked at another tab would be short */
        setTimeout(step, Math.max(4, 1000 / fps / 4));
      }
      step();
    });
  }

  /* Render a composition into SOMEBODY ELSE'S canvas at an arbitrary size.

     The stage is a singleton — one canvas, one size — because the director
     stage is one thing. The sample strip needs a dozen small pictures a
     second from the same composers, and standing up a second stage would be
     a second set of composers to keep in step. So the singleton is lent out:
     its canvas, size and chrome flags are swapped, the composition is drawn,
     and everything is put back. Every composer sizes from S.U, so a tile is
     the same picture at a smaller scale rather than a cropped one.

     The flags matter: a thumbnail has no business reserving Instagram's
     strips or drawing guide rectangles, and its caption band would be two
     unreadable lines, so all three stand down for the duration. */
  function renderTo(cv, w, h, sel, C, p, force) {
    var keep = { cv: S.cv, ctx: S.ctx, W: S.W, H: S.H, U: S.U,
                 safe: S.safe, head: S.headline, sub: S.sub, tile: S.tile };
    if (cv.width !== w) cv.width = w;
    if (cv.height !== h) cv.height = h;
    S.cv = cv; S.ctx = cv.getContext("2d");
    S.W = w; S.H = h; S.U = w; S.safe = false; S.tile = true;
    S.headline = ""; S.sub = "";
    var out = null;
    try { out = render(sel, C, p, force, true); } catch (e) { out = null; }
    S.cv = keep.cv; S.ctx = keep.ctx; S.W = keep.W; S.H = keep.H; S.U = keep.U;
    S.safe = keep.safe; S.headline = keep.head; S.sub = keep.sub; S.tile = keep.tile;
    return out;
  }

  /* ---- what Director mode borrows ---------------------------------------

     Director draws the same fifteen composers into rectangles the user places
     rather than into the one stage rect, and that is possible only because a
     composer has never been told where it sits: it is handed a rect and a
     playhead and sizes everything from them. So Director needs no composers
     of its own, and a composer written for Auto mode arrives in Director able
     to be placed, timed and animated without being touched.

     The alternative — a second drawing layer for free composition — would
     have been a second set of pictures free to disagree with the first, which
     is the same trap the recorder and the Viṃśottarī are held out of. */
  function drawInto(bag, p, st, C, forceKey) {
    var K = null;
    if (forceKey) {
      COMPOSERS.forEach(function (Q) {
        if (Q.key !== forceKey) return;
        var s = -1;
        try { s = Q.score(bag); } catch (e) {}
        if (s > 0) K = withScore(Q, s);
      });
    }
    if (!K) K = pick(bag);
    if (!K) return null;
    try { K.draw(bag, p, st, C); }
    catch (e) { return { key: K.key, label: K.label, error: String(e && e.message || e) }; }
    return { key: K.key, label: K.label, blurb: K.blurb };
  }

  window.SPStage = {
    S: S, PALS: PALS, RATIOS: RATIOS, SAFE: SAFE, renderTo: renderTo,
    /* the private helpers Director composes with — one implementation of
       text fitting, one star field, one caption band, one set of guides */
    kit: {
      pal: pal, txt: txt, txtFit: txtFit, wrap: wrap, wrapLines: wrapLines,
      fit: fit, norm: norm,
      background: background, stars: stars, captionBand: captionBand,
      safeGuides: safeGuides, stage: stage, drawInto: drawInto,
      ringTicks: ringTicks, marker: marker, arcBand: arcBand,
      placeWords: placeWords, SANS: SANS, grow: grow
    },
    attach: function (canvas) {
      S.cv = canvas; S.ctx = canvas.getContext("2d");
      this.resize();
    },
    resize: function () {
      var r = RATIOS[S.ratio] || RATIOS["9:16"];
      var q = Math.max(0.25, Math.min(1, S.quality || 1));
      S.W = Math.round(r.w * q); S.H = Math.round(r.h * q); S.U = S.W;
      if (S.cv) { S.cv.width = S.W; S.cv.height = S.H; }
      STARS = null;
    },
    /* Run something at true export size, then put the preview size back.
       Every composer sizes from S.U, so the picture is identical either way —
       only the number of pixels differs. */
    withFullSize: function (fn) {
      var q = S.quality;
      S.quality = 1; this.resize();
      try { return fn(); } finally { S.quality = q; this.resize(); }
    },
    render: render, renderStory: renderStory, record: record, frameAt: frameAt,
    isRecording: isRecording, cancelRecording: cancelRecording,
    storyTotal: storyTotal, shotAt: shotAt, options: options, bagOf: bagOf,
    composers: function () { return COMPOSERS.map(function (K) {
      return { key: K.key, label: K.label, blurb: K.blurb }; }); }
  };
})();

/* ===== Studio Pro — Director mode =========================================

   WHAT THIS IS, AND WHY IT IS A SECOND MODE RATHER THAN A REPLACEMENT.

   Auto mode answers "what is the best picture of this selection?" and it
   answers it well, which is exactly why it cannot also be the pro tool. Its
   whole method is to decide: it scores the composers, picks the winner, lays
   it in the one stage rect, and times it against the one playhead. Every one
   of those decisions is the right default and none of them is negotiable, so
   a user who wants the Moon's track small in the corner, the ṣaḍbala bars
   full-bleed behind it, a line of their own text entering at four seconds and
   the whole thing drifting — cannot get there by arguing with the scorer.

   Director mode takes the same composition apart into LAYERS and hands every
   one of those decisions over. A layer is:

     what   — a group of selected nodes and which composer draws them, or a
              piece of text, a rule, a wash, the caption band, the stamp
     where  — a rectangle in fractions of the frame, with an optional second
              rectangle it travels to, so a move, a zoom or a pan is just
              two rects and an easing
     when   — a window [t0,t1] of the reel, so layers sequence against each
              other rather than all starting at zero
     how    — an entry, an exit, a continuous idle motion, an easing, an
              opacity, a rotation, and which clock the composer inside sees

   Nothing here draws astronomy. Every picture is still one of the fifteen
   composers, because a composer has never known where it sits: it is handed a
   rect and a playhead and sizes everything from them. That is the whole
   reason this mode is a few hundred lines and not a rewrite, and it is why a
   composer added for Auto mode arrives in Director already placeable,
   already timeable, already animatable.

   THE DOCUMENT IS DATA. A composition is a plain object that serialises to
   JSON, which is what makes it saveable, re-openable, shareable as text and
   testable. The test suite builds documents, renders them and asserts the
   frames differ — a thing that was impossible to assert about Auto mode,
   where the arrangement was implicit in the code.

   WHAT IT COSTS PER FRAME. Director renders N layers where Auto rendered one,
   so the cost is the honest sum of the layers rather than a fixed price. Two
   things keep that from undoing the performance work: node values are cached
   per context in the registry, so a node read by three layers is derived
   once; and nothing in this file touches the DOM. The handles are drawn by a
   separate overlay pass that the UI calls after rendering and the recorder
   never calls, which is also why they cannot end up in an export. */

(function () {
  "use strict";

  function K() { return window.SPStage.kit; }
  function S() { return window.SPStage.S; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, f) { return a + (b - a) * f; }

  /* ---- easing ------------------------------------------------------------
     Five, not fifty. Each one is a different intention — arrive evenly,
     arrive softly, leave softly, settle, overshoot — and a list of twenty
     named curves is a list in which nobody can tell two of them apart. */
  var EASE = {
    linear: { label: "Linear", f: function (f) { return f; } },
    smooth: { label: "Smooth", f: function (f) { return f * f * (3 - 2 * f); } },
    "in":   { label: "Ease in", f: function (f) { return f * f; } },
    out:    { label: "Ease out", f: function (f) { return 1 - (1 - f) * (1 - f); } },
    back:   { label: "Overshoot", f: function (f) {
      var c = 1.70158; var g = f - 1;
      return 1 + (c + 1) * g * g * g + c * g * g; } }
  };
  function ease(f, key) { return (EASE[key] || EASE.smooth).f(clamp(f, 0, 1)); }

  /* ---- motion ------------------------------------------------------------
     An entry, an exit and an idle each return a contribution to one
     transform, and the three are composed. Keeping them as contributions
     rather than as three separate draws is what lets a layer rise in, drift
     through and fade out without the three fighting over the canvas state. */
  function T0() {
    return { dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, a: 1, clip: null, cp: null };
  }
  var ENTER = {
    none:   { label: "Appear", f: function () {} },
    fade:   { label: "Fade in", f: function (T, f) { T.a *= f; } },
    rise:   { label: "Rise", f: function (T, f) { T.a *= f; T.dy += (1 - f) * 0.10; } },
    drop:   { label: "Drop", f: function (T, f) { T.a *= f; T.dy -= (1 - f) * 0.10; } },
    slideL: { label: "In from left", f: function (T, f) { T.a *= Math.min(1, f * 2); T.dx -= (1 - f) * 0.35; } },
    slideR: { label: "In from right", f: function (T, f) { T.a *= Math.min(1, f * 2); T.dx += (1 - f) * 0.35; } },
    pop:    { label: "Pop", f: function (T, f) { T.a *= f; T.sx *= 0.80 + 0.20 * f; T.sy *= 0.80 + 0.20 * f; } },
    zoom:   { label: "Zoom in", f: function (T, f) { T.a *= Math.min(1, f * 1.6); T.sx *= 1.35 - 0.35 * f; T.sy *= 1.35 - 0.35 * f; } },
    wipeUp: { label: "Wipe up", f: function (T, f) { T.clip = { x: 0, y: 1 - f, w: 1, h: f }; } },
    wipeL:  { label: "Wipe across", f: function (T, f) { T.clip = { x: 0, y: 0, w: f, h: 1 }; } },
    iris:   { label: "Iris", f: function (T, f) { T.cp = f; } },
    turn:   { label: "Turn in", f: function (T, f) { T.a *= f; T.rot += (1 - f) * -14; } },
    /* the composer's own build-up IS the entry — nothing is transformed, and
       the clock handling below feeds it a rising p */
    draw:   { label: "Draw itself", f: function () {} }
  };
  var EXIT = {
    none:    { label: "Stay", f: function () {} },
    fade:    { label: "Fade out", f: function (T, f) { T.a *= 1 - f; } },
    sink:    { label: "Sink", f: function (T, f) { T.a *= 1 - f; T.dy += f * 0.10; } },
    lift:    { label: "Lift", f: function (T, f) { T.a *= 1 - f; T.dy -= f * 0.10; } },
    slideL:  { label: "Out to left", f: function (T, f) { T.a *= 1 - f * f; T.dx -= f * 0.35; } },
    slideR:  { label: "Out to right", f: function (T, f) { T.a *= 1 - f * f; T.dx += f * 0.35; } },
    shrink:  { label: "Shrink", f: function (T, f) { T.a *= 1 - f; T.sx *= 1 - 0.22 * f; T.sy *= 1 - 0.22 * f; } },
    pullBack:{ label: "Pull back", f: function (T, f) { T.a *= 1 - f; T.sx *= 1 + 0.30 * f; T.sy *= 1 + 0.30 * f; } },
    wipeDown:{ label: "Wipe away", f: function (T, f) { T.clip = { x: 0, y: 0, w: 1, h: 1 - f }; } }
  };
  /* Idle motions run on the reel clock, not the layer's, so two layers with
     different windows still drift in step — the thing that makes a frame feel
     like one scene rather than several animations sharing a canvas. */
  var IDLE = {
    none:  { label: "Still", f: function () {} },
    drift: { label: "Drift", f: function (T, a, p) {
      T.dx += Math.sin(p * Math.PI * 2) * 0.012 * a;
      T.dy += Math.cos(p * Math.PI * 2 * 0.7) * 0.010 * a; } },
    bob:   { label: "Bob", f: function (T, a, p) {
      T.dy += Math.sin(p * Math.PI * 4) * 0.011 * a; } },
    sway:  { label: "Sway", f: function (T, a, p) {
      T.rot += Math.sin(p * Math.PI * 2) * 2.2 * a; } },
    spin:  { label: "Spin", f: function (T, a, p) { T.rot += p * 360 * a; } },
    pulse: { label: "Breathe", f: function (T, a, p) {
      var s = 1 + Math.sin(p * Math.PI * 4) * 0.035 * a;
      T.sx *= s; T.sy *= s; } },
    creep: { label: "Slow zoom", f: function (T, a, p) {
      var s = 1 + p * 0.10 * a; T.sx *= s; T.sy *= s; } },
    flicker: { label: "Shimmer", f: function (T, a, p) {
      T.a *= 1 - Math.abs(Math.sin(p * Math.PI * 9)) * 0.14 * a; } }
  };

  /* ---- what a layer can be ---------------------------------------------- */
  var KINDS = {
    view:  "A composition — selected nodes drawn by a composer",
    text:  "A line or paragraph of your own words",
    rule:  "A hairline or a bar",
    wash:  "A tint, a vignette or a panel behind other layers",
    band:  "The caption band — headline over sub-line",
    stamp: "The handle, the date and the place"
  };
  var COLS = ["ink", "gold", "dim", "ben", "mal", "line", "bg", "custom"];

  function uid() {
    uid.n = (uid.n || 0) + 1;
    return "L" + uid.n + "_" + Math.floor(Math.random() * 1e6).toString(36);
  }

  function layer(o) {
    o = o || {};
    var L = {
      id: o.id || uid(),
      kind: o.kind || "view",
      name: o.name || "",
      hidden: !!o.hidden,
      locked: !!o.locked,
      /* view */
      sel: (o.sel || []).slice(),
      force: o.force || null,
      /* text / rule / wash / band / stamp */
      text: o.text || "",
      size: o.size == null ? 0.030 : o.size,
      align: o.align || "center",
      valign: o.valign || "middle",
      weight: o.weight == null ? 700 : o.weight,
      col: o.col || "ink",
      hex: o.hex || "#ffffff",
      lines: o.lines == null ? 3 : o.lines,
      sub: o.sub || "",
      shape: o.shape || "flat",
      /* where */
      rect: o.rect ? { x: o.rect.x, y: o.rect.y, w: o.rect.w, h: o.rect.h }
                   : { x: 0.10, y: 0.20, w: 0.80, h: 0.40 },
      to: o.to ? { x: o.to.x, y: o.to.y, w: o.to.w, h: o.to.h } : null,
      rot: o.rot || 0,
      opacity: o.opacity == null ? 1 : o.opacity,
      /* A composer sizes its diagram from the rect but writes its labels
         wherever its own layout puts them, which in a small rect can be
         outside it. That is right in Auto mode, where the rect is the whole
         stage, and wrong the moment a user places two layers side by side and
         one writes over the other. Off by default, because clipping a layer
         that was not overflowing only costs a clip; on, it makes the
         rectangle mean exactly what it looks like it means. */
      clip: !!o.clip,
      /* when — fractions of the reel */
      t0: o.t0 == null ? 0 : o.t0,
      t1: o.t1 == null ? 1 : o.t1,
      /* how */
      enter: { k: (o.enter && o.enter.k) || "fade",
               len: (o.enter && o.enter.len) == null ? 0.25 : o.enter.len },
      exit:  { k: (o.exit && o.exit.k) || "none",
               len: (o.exit && o.exit.len) == null ? 0.20 : o.exit.len },
      idle:  { k: (o.idle && o.idle.k) || "none",
               amt: (o.idle && o.idle.amt) == null ? 1 : o.idle.amt },
      ease: o.ease || "smooth",
      /* which playhead the composer inside sees */
      clock: o.clock || "layer",
      at: o.at == null ? 1 : o.at,
      cycles: o.cycles == null ? 1 : o.cycles
    };
    return L;
  }

  function doc(o) {
    o = o || {};
    return {
      on: !!o.on,
      name: o.name || "Untitled composition",
      bg: { style: (o.bg && o.bg.style) || "gradient",
            stars: o.bg ? !!o.bg.stars : true },
      layers: (o.layers || []).map(layer)
    };
  }

  var DOC = doc({ on: false });
  var PICK = null;          /* the id of the layer being edited */

  /* ---- grouping a selection into layers ----------------------------------

     Taking control has to start from something that already looks like what
     Auto drew, or the mode is a blank canvas pretending to be a studio. So
     "split" groups the selection the way the Layers composer does — by the
     shape each node declares, with a longitude riding along with the lanes or
     edges it annotates — and gives each group its own layer. The user then
     moves, retimes and restyles groups that were already drawn sensibly,
     which is editing; starting from nothing is authoring from scratch, and
     anyone who wants that can clear the stack in one click. */
  var ORDER = ["almanac", "houses", "houseset", "grid", "lanes", "edges",
               "spanset", "span", "series", "sset", "scalar", "lonset", "lon"];

  function groupsOf(sel, C) {
    var B = window.SPStage.bagOf(sel, C);
    var bag = B.bag, groups = [];
    var hasLanes = !!(bag.lanes && bag.lanes.length);
    var hasEdges = !!(bag.edges && bag.edges.length);
    ORDER.forEach(function (k) {
      var items = bag[k];
      if (!items || !items.length) return;
      if (k === "lon" && (hasLanes || hasEdges)) return;
      var ids = items.map(function (it) { return it.node.id; });
      if ((k === "lanes" || k === "edges") && bag.lon)
        ids = ids.concat(bag.lon.map(function (it) { return it.node.id; }));
      groups.push({ kind: k, ids: ids,
                    label: items.length === 1 ? items[0].node.label
                                              : items.length + " × " + k });
    });
    return { groups: groups, missing: B.missing };
  }

  /* ---- the frame rectangles ---------------------------------------------- */
  /* The stage rect as fractions, so a layer built here lands exactly where
     Auto would have drawn it and the switch into Director does not move the
     picture. */
  function stageRect() {
    var SA = window.SPStage.SAFE, safe = S().safe;
    var top = safe ? SA.top : 0.045;
    var bot = safe ? SA.bottom : 0.045;
    var side = safe ? SA.right * 0.55 : 0.055;
    var band = 0.115;
    return { x: side, y: top, w: 1 - side * 2, h: 1 - top - bot - band };
  }
  function bandRect() {
    var SA = window.SPStage.SAFE, safe = S().safe;
    var bot = safe ? SA.bottom : 0.045;
    var side = safe ? SA.right * 0.55 : 0.055;
    return { x: side, y: 1 - bot - 0.115, w: 1 - side * 2, h: 0.105 };
  }

  /* ---- building a document ----------------------------------------------- */
  /* `how`:
       "single" — the whole selection as one layer, drawn as Auto drew it
       "split"  — one layer per shape group
       "solo"   — one layer per selected node, each drawn on its own
     All three add the caption band and the stamp as layers, because the point
     of the mode is that the chrome is editable too: a user who wants the
     headline centred over the diagram rather than under it must be able to
     pick it up and move it. */
  function build(sel, C, force, how, headline, sub) {
    var R = stageRect(), out = [], g;
    sel = (sel || []).slice();

    if (how === "solo") {
      sel.forEach(function (id) {
        var n = window.SPNodes.byId(id);
        if (!n || !window.SPNodes.resolve(n, C)) return;
        out.push({ sel: [id], label: n.label });
      });
    } else if (how === "split") {
      g = groupsOf(sel, C);
      g.groups.forEach(function (q) { out.push({ sel: q.ids, label: q.label }); });
    } else {
      if (sel.length) out.push({ sel: sel, force: force || null, label: "The composition" });
    }
    if (!out.length && sel.length)
      out.push({ sel: sel, force: force || null, label: "The composition" });

    var n = out.length, layers = [];
    /* a wash behind everything, off by default in style but present so it is
       one click from being a panel rather than a thing to go and find */
    layers.push(layer({ kind: "wash", name: "Backdrop panel", hidden: true,
                        shape: "panel", col: "line", opacity: 0.30,
                        rect: { x: 0.05, y: 0.11, w: 0.90, h: 0.70 },
                        enter: { k: "fade", len: 0.18 } }));

    out.forEach(function (q, i) {
      var r;
      if (n === 1) r = R;
      else if (n === 2)
        r = { x: R.x, y: R.y + (R.h / 2) * i, w: R.w, h: R.h / 2 * 0.94 };
      else {
        var rows = Math.ceil(n / 2), col = i % 2, row = Math.floor(i / 2);
        r = { x: R.x + (R.w / 2) * col, y: R.y + (R.h / rows) * row,
              w: R.w / 2 * 0.95, h: R.h / rows * 0.94 };
      }
      layers.push(layer({
        kind: "view", name: q.label, sel: q.sel, force: q.force || null, rect: r,
        /* staggered, so a split composition reads as one thing assembling
           rather than four things starting at once */
        t0: n > 1 ? clamp(i * 0.12, 0, 0.5) : 0, t1: 1,
        enter: { k: i % 2 ? "slideR" : "rise", len: n > 1 ? 0.22 : 0.30 },
        exit: { k: "none", len: 0.2 },
        idle: { k: "none", amt: 1 }, clock: "layer"
      }));
    });

    var BR = bandRect();
    layers.push(layer({
      kind: "band", name: "Caption band",
      text: headline || "", sub: sub || "",
      rect: BR, t0: n > 1 ? 0.10 : 0.04, t1: 1,
      enter: { k: "rise", len: 0.22 }, col: "gold"
    }));
    layers.push(layer({
      kind: "stamp", name: "Stamp — handle and date",
      rect: { x: 0.08, y: 1 - (S().safe ? window.SPStage.SAFE.bottom : 0.045) - 0.012,
              w: 0.84, h: 0.040 },
      size: 0.019, col: "dim", t0: 0.02, t1: 1,
      enter: { k: "fade", len: 0.25 }
    }));

    DOC = doc({ on: true, name: "From " + (sel.length || 0) + " node(s)",
                bg: { style: "gradient", stars: true }, layers: layers });
    PICK = layers.length > 1 ? layers[1].id : layers[0].id;
    return DOC;
  }

  /* ---- arrangement presets -----------------------------------------------
     Not templates for the picture — templates for the GEOMETRY. They re-lay
     the view layers that already exist and leave the text, the band and the
     stamp where they are, so trying an arrangement costs one click and
     nothing is lost by trying it. */
  var ARRANGE = {
    stack: { label: "Stack", f: function (views, R) {
      var n = views.length;
      views.forEach(function (L, i) {
        L.rect = { x: R.x, y: R.y + (R.h / n) * i, w: R.w, h: R.h / n * 0.94 };
      });
    } },
    grid: { label: "Grid", f: function (views, R) {
      var n = views.length, cols = n <= 1 ? 1 : 2, rows = Math.ceil(n / cols);
      views.forEach(function (L, i) {
        var c = i % cols, r = Math.floor(i / cols);
        L.rect = { x: R.x + (R.w / cols) * c, y: R.y + (R.h / rows) * r,
                   w: R.w / cols * 0.95, h: R.h / rows * 0.94 };
      });
    } },
    hero: { label: "Hero and strip", f: function (views, R) {
      if (!views.length) return;
      var rest = views.length - 1;
      views[0].rect = { x: R.x, y: R.y, w: R.w, h: R.h * (rest ? 0.64 : 1) };
      for (var i = 1; i < views.length; i++)
        views[i].rect = { x: R.x + (R.w / rest) * (i - 1), y: R.y + R.h * 0.68,
                          w: R.w / rest * 0.94, h: R.h * 0.32 };
    } },
    bleed: { label: "Full bleed", f: function (views) {
      views.forEach(function (L) { L.rect = { x: 0, y: 0, w: 1, h: 1 }; });
    } },
    thirds: { label: "Upper third", f: function (views, R) {
      var n = views.length;
      views.forEach(function (L, i) {
        L.rect = { x: R.x, y: R.y + (R.h * 0.62 / n) * i,
                   w: R.w, h: R.h * 0.62 / n * 0.94 };
      });
    } },
    corners: { label: "Scatter", f: function (views, R) {
      var SP = [[0.00, 0.00], [0.50, 0.00], [0.00, 0.50], [0.50, 0.50]];
      views.forEach(function (L, i) {
        var s = SP[i % 4];
        L.rect = { x: R.x + R.w * s[0], y: R.y + R.h * s[1],
                   w: R.w * 0.48, h: R.h * 0.47 };
      });
    } },
    centre: { label: "Centre all", f: function (views, R) {
      views.forEach(function (L) {
        L.rect = { x: R.x + R.w * 0.08, y: R.y + R.h * 0.10,
                   w: R.w * 0.84, h: R.h * 0.78 };
      });
    } }
  };
  function arrange(key) {
    var f = ARRANGE[key]; if (!f) return;
    var views = DOC.layers.filter(function (L) { return L.kind === "view"; });
    f.f(views, stageRect());
  }

  /* Sequencing presets — the time axis gets the same treatment as the space
     one, because "they all start at zero" is the single most common reason a
     multi-layer reel reads as a mess. */
  var SEQUENCE = {
    together: { label: "All at once", f: function (Ls) {
      Ls.forEach(function (L) { L.t0 = 0; L.t1 = 1; }); } },
    cascade: { label: "Cascade", f: function (Ls) {
      Ls.forEach(function (L, i) {
        L.t0 = clamp(i * (0.6 / Math.max(1, Ls.length)), 0, 0.7); L.t1 = 1; }); } },
    relay: { label: "One at a time", f: function (Ls) {
      var n = Ls.length || 1;
      Ls.forEach(function (L, i) {
        L.t0 = i / n; L.t1 = (i + 1) / n;
        L.enter = { k: L.enter.k === "none" ? "fade" : L.enter.k, len: 0.30 };
        L.exit = { k: "fade", len: 0.25 }; }); } },
    overlap: { label: "Overlapping", f: function (Ls) {
      var n = Ls.length || 1, w = Math.min(1, 1.8 / n);
      Ls.forEach(function (L, i) {
        L.t0 = clamp((i / n) * (1 - w * 0.4), 0, 0.9);
        L.t1 = clamp(L.t0 + w, 0.1, 1);
        L.exit = { k: "fade", len: 0.3 }; }); } }
  };
  function sequence(key) {
    var f = SEQUENCE[key]; if (!f) return;
    f.f(DOC.layers.filter(function (L) { return !L.hidden; }));
  }

  /* ---- text with the day in it -------------------------------------------
     A studio whose text layers are only literal strings makes a card that is
     out of date tomorrow. These resolve at render time from the same context
     every node reads, so a saved composition reopened next week says next
     week's tithi — and a token that cannot be resolved prints as itself
     rather than as "undefined", so a typo in a token is visible on the frame
     rather than silently blank. */
  var TOKENS = {
    "{date}": function (C) {
      var g = C.day && C.day.gregorian;
      if (!g) return new Date(C.when).toDateString();
      var M = ["January", "February", "March", "April", "May", "June", "July",
               "August", "September", "October", "November", "December"];
      return g.d + " " + (M[(g.m || 1) - 1] || "") + " " + g.y;
    },
    "{place}": function (C) { return (C.place && C.place.n) || ""; },
    "{vara}": function (C) { return (C.day && C.day.vara) || ""; },
    "{tithi}": function (C) {
      var a = C.day && C.day.at && C.day.at.tithi;
      return a ? ((a.paksha ? a.paksha + " " : "") + a.name) : ""; },
    "{naks}": function (C) {
      var a = C.day && C.day.at && C.day.at.nak;
      return a ? a.name + " pāda " + a.pada : ""; },
    "{yoga}": function (C) {
      var a = C.day && C.day.at && C.day.at.yoga; return a ? a.name : ""; },
    "{karana}": function (C) {
      var a = C.day && C.day.at && C.day.at.karana; return a ? a.name : ""; },
    "{masa}": function (C) {
      var m = C.day && C.day.masa; return m ? (m.amantaIAST || "") : ""; },
    "{samvat}": function (C) {
      var s = C.day && C.day.samvat;
      return s && s.vikrama ? s.vikrama + " Vikrama" : ""; },
    "{dasha}": function (C) {
      try { var cm = window.SPNodes.currentMd(C); return cm ? cm.lord : ""; }
      catch (e) { return ""; } },
    "{handle}": function () { return S().handle || "@Nirayana.Soft"; }
  };
  function expand(s, C) {
    if (!s) return "";
    return String(s).replace(/\{[a-z]+\}/g, function (m) {
      var f = TOKENS[m];
      if (!f) return m;
      var v = "";
      try { v = f(C) || ""; } catch (e) { v = ""; }
      return v || m;
    });
  }
  function tokenList() {
    var out = [];
    for (var k in TOKENS) if (TOKENS.hasOwnProperty(k)) out.push(k);
    return out;
  }

  /* ---- colour ------------------------------------------------------------ */
  function colOf(L) {
    var P = K().pal();
    if (L.col === "custom") return L.hex || P.ink;
    return P[L.col] || P.ink;
  }

  /* ---- the frame-owning composers ---------------------------------------
     The almanac leaf paints a whole page to the frame's edge: it is a card,
     not a diagram, and it has no notion of sitting inside a rectangle. In
     Director it may be placed anywhere, so it is drawn once into a scratch
     canvas at the layer rect's own aspect and blitted. The scratch canvas is
     kept and reused, because allocating a 1080-wide canvas per frame is a
     garbage-collection pause every second or so. */
  var SCRATCH = null;
  function leafInto(v, p, px, C) {
    var w = Math.max(32, Math.round(px.w)), h = Math.max(32, Math.round(px.h));
    if (!SCRATCH) SCRATCH = document.createElement("canvas");
    if (SCRATCH.width !== w || SCRATCH.height !== h) {
      SCRATCH.width = w; SCRATCH.height = h;
    }
    var c2 = SCRATCH.getContext("2d");
    c2.clearRect(0, 0, w, h);
    try { window.SPAlmanac.draw(c2, w, h, v, p, K().pal(), { foot: S().handle }); }
    catch (e) { return; }
    S().ctx.drawImage(SCRATCH, px.x, px.y, px.w, px.h);
  }

  /* ---- a layer's time and transform -------------------------------------- */
  function windowU(L, p) {
    var a = Math.min(L.t0, L.t1), b = Math.max(L.t0, L.t1);
    if (b - a < 1e-4) return p >= a ? 1 : -1;
    if (p < a - 1e-6 || p > b + 1e-6) return -1;
    return clamp((p - a) / (b - a), 0, 1);
  }
  function transformOf(L, u, p) {
    var T = T0();
    var el = clamp(L.enter.len, 0, 1), xl = clamp(L.exit.len, 0, 1);
    var ep = el > 0.001 ? clamp(u / el, 0, 1) : 1;
    var xp = xl > 0.001 ? clamp((u - (1 - xl)) / xl, 0, 1) : 0;
    var E = ENTER[L.enter.k] || ENTER.fade;
    var X = EXIT[L.exit.k] || EXIT.none;
    var I = IDLE[L.idle.k] || IDLE.none;
    E.f(T, ease(ep, L.ease));
    if (xp > 0) X.f(T, ease(xp, L.ease));
    I.f(T, L.idle.amt == null ? 1 : L.idle.amt, p);
    T.a *= clamp(L.opacity, 0, 1);
    T.rot += L.rot || 0;
    return T;
  }
  function rectAt(L, u) {
    if (!L.to) return L.rect;
    var f = ease(u, L.ease);
    return { x: lerp(L.rect.x, L.to.x, f), y: lerp(L.rect.y, L.to.y, f),
             w: lerp(L.rect.w, L.to.w, f), h: lerp(L.rect.h, L.to.h, f) };
  }
  /* which playhead the composer inside the layer is handed */
  function innerP(L, u, p) {
    if (L.clock === "reel") return p;
    if (L.clock === "frozen") return clamp(L.at, 0, 1);
    if (L.clock === "loop") {
      var n = Math.max(1, L.cycles || 1);
      return (u * n) % 1;
    }
    if (L.enter.k === "draw") {
      /* the composer's own build-up is the entry, so it is stretched over the
         entry length and then held */
      var el = clamp(L.enter.len, 0.02, 1);
      return clamp(u / el, 0, 1);
    }
    return u;
  }

  function pxOf(R) {
    var s = S();
    return { x: R.x * s.W, y: R.y * s.H, w: R.w * s.W, h: R.h * s.H };
  }

  /* ---- drawing one layer -------------------------------------------------- */
  function drawLayer(L, C, p, report) {
    if (L.hidden) return;
    var u = windowU(L, p);
    if (u < 0) return;
    var s = S(), c = s.ctx;
    var R = rectAt(L, u), T = transformOf(L, u, p);
    if (T.a <= 0.002) return;
    var px = pxOf(R);
    var cx = px.x + px.w / 2, cy = px.y + px.h / 2;

    c.save();
    c.globalAlpha = T.a;
    if (L.clip) {
      /* the layer's own box, before any motion clip — applied first so a wipe
         still wipes within it rather than against it */
      c.beginPath();
      c.rect(px.x, px.y, px.w, px.h);
      c.clip();
    }
    if (T.clip) {
      c.beginPath();
      c.rect(px.x + T.clip.x * px.w, px.y + T.clip.y * px.h,
             px.w * T.clip.w, px.h * T.clip.h);
      c.clip();
    }
    if (T.cp != null) {
      c.beginPath();
      c.arc(cx, cy, Math.max(px.w, px.h) * 0.75 * T.cp, 0, Math.PI * 2);
      c.clip();
    }
    c.translate(cx + T.dx * s.W, cy + T.dy * s.H);
    if (T.rot) c.rotate(T.rot * Math.PI / 180);
    if (T.sx !== 1 || T.sy !== 1) c.scale(T.sx, T.sy);
    c.translate(-cx, -cy);

    try { paint(L, C, innerP(L, u, p), px, report); }
    catch (e) {
      if (report) report.errors.push({ id: L.id, name: nameOf(L), why: String(e && e.message || e) });
    }
    c.restore();
  }

  function paint(L, C, ip, px, report) {
    var s = S(), c = s.ctx, kit = K(), P = kit.pal();

    if (L.kind === "view") {
      var B = window.SPStage.bagOf(L.sel, C);
      if (report && B.missing.length)
        B.missing.forEach(function (m) {
          report.missing.push({ layer: nameOf(L), label: m.label || m.id, why: m.why });
        });
      /* the leaf is its own page and is blitted; everything else is handed
         the rect and draws into it */
      if (B.bag.almanac && B.bag.almanac.length) {
        leafInto(B.bag.almanac[0].v, ip, px, C);
        if (report) report.used.push({ id: L.id, composer: "almanac" });
        return;
      }
      var st = {
        x: px.x, y: px.y, w: px.w, h: px.h,
        cx: px.x + px.w / 2, cy: px.y + px.h / 2,
        bandY: px.y + px.h * 0.88, bandH: px.h * 0.12, side: px.w * 0.05
      };
      var got = window.SPStage.kit.drawInto(B.bag, ip, st, C, L.force);
      if (!got) {
        if (report) report.empty.push({ id: L.id, name: nameOf(L),
          why: L.sel.length ? "nothing in this layer resolves right now"
                            : "this layer has no nodes in it" });
        return;
      }
      if (got.error && report)
        report.errors.push({ id: L.id, name: nameOf(L), why: got.error });
      if (report) report.used.push({ id: L.id, composer: got.key, label: got.label });
      return;
    }

    if (L.kind === "text") {
      var str = expand(L.text, C);
      if (!str) return;
      var size = L.size * s.U;
      var x = L.align === "left" ? px.x : (L.align === "right" ? px.x + px.w : px.x + px.w / 2);
      var n = Math.max(1, L.lines || 1);
      if (n === 1) {
        kit.txtFit(str, x, px.y + px.h / 2, size, colOf(L), L.align, L.weight, px.w);
      } else {
        /* A block the user placed in a box must sit in that box, so the rows
           are measured before any of them is drawn and the first one is
           lifted by half of what the block will occupy. Measuring by drawing
           it off-screen first would be two text passes a frame for a thing
           arithmetic answers. */
        var lh = size * 1.26;
        var rows = kit.wrapLines(str, size, px.w, n, L.weight);
        var used = Math.max(1, rows.length);
        var top = L.valign === "top" ? px.y + size * 0.7
                : (L.valign === "bottom" ? px.y + px.h - lh * (used - 0.7)
                : px.y + px.h / 2 - lh * (used - 1) / 2);
        for (var ri = 0; ri < rows.length; ri++)
          kit.txt(rows[ri], x, top + ri * lh, size, colOf(L), L.align, L.weight);
      }
      return;
    }

    if (L.kind === "rule") {
      c.save();
      c.globalAlpha = c.globalAlpha * 0.95;
      var col = colOf(L);
      if (L.shape === "bar") {
        c.fillStyle = col;
        c.fillRect(px.x, px.y, px.w, Math.max(1, px.h));
      } else if (L.shape === "double") {
        c.strokeStyle = col; c.lineWidth = Math.max(1, s.U * 0.0016);
        c.beginPath();
        c.moveTo(px.x, px.y); c.lineTo(px.x + px.w, px.y);
        c.moveTo(px.x, px.y + px.h); c.lineTo(px.x + px.w, px.y + px.h);
        c.stroke();
      } else if (L.shape === "frame") {
        c.strokeStyle = col; c.lineWidth = Math.max(1, s.U * 0.0020);
        c.strokeRect(px.x, px.y, px.w, px.h);
      } else {
        c.strokeStyle = col; c.lineWidth = Math.max(1, s.U * 0.0018);
        c.beginPath();
        c.moveTo(px.x, px.y + px.h / 2); c.lineTo(px.x + px.w, px.y + px.h / 2);
        c.stroke();
      }
      c.restore();
      return;
    }

    if (L.kind === "wash") {
      var cl = colOf(L);
      c.save();
      if (L.shape === "vignette") {
        var g = c.createRadialGradient(px.x + px.w / 2, px.y + px.h / 2,
                 Math.min(px.w, px.h) * 0.20, px.x + px.w / 2, px.y + px.h / 2,
                 Math.max(px.w, px.h) * 0.75);
        g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, cl);
        c.fillStyle = g; c.fillRect(px.x, px.y, px.w, px.h);
      } else if (L.shape === "panel") {
        c.fillStyle = cl;
        roundRect(c, px.x, px.y, px.w, px.h, Math.min(px.w, px.h) * 0.045);
        c.fill();
        c.globalAlpha = c.globalAlpha * 0.8;
        c.strokeStyle = P.gold; c.lineWidth = Math.max(1, s.U * 0.0014);
        roundRect(c, px.x, px.y, px.w, px.h, Math.min(px.w, px.h) * 0.045);
        c.stroke();
      } else if (L.shape === "sweep") {
        var g2 = c.createLinearGradient(px.x, px.y, px.x + px.w, px.y + px.h);
        g2.addColorStop(0, cl); g2.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = g2; c.fillRect(px.x, px.y, px.w, px.h);
      } else if (L.shape === "disc") {
        c.fillStyle = cl;
        c.beginPath();
        c.arc(px.x + px.w / 2, px.y + px.h / 2, Math.min(px.w, px.h) / 2, 0, Math.PI * 2);
        c.fill();
      } else {
        c.fillStyle = cl; c.fillRect(px.x, px.y, px.w, px.h);
      }
      c.restore();
      return;
    }

    if (L.kind === "band") {
      var head = expand(L.text, C) || s.headline || "";
      var sb = expand(L.sub, C) || s.sub || "";
      if (!head && !sb) return;
      c.save();
      c.strokeStyle = P.gold; c.globalAlpha = c.globalAlpha * 0.55;
      c.lineWidth = Math.max(1, s.U * 0.0016);
      c.beginPath();
      c.moveTo(px.x + px.w * 0.26, px.y); c.lineTo(px.x + px.w * 0.74, px.y);
      c.stroke(); c.restore();
      if (head)
        kit.txtFit(head, px.x + px.w / 2, px.y + px.h * 0.36, s.U * 0.040,
                   colOf(L), "center", 700, px.w * 0.96);
      if (sb)
        kit.txtFit(sb, px.x + px.w / 2, px.y + px.h * 0.76, s.U * 0.022,
                   P.dim, "center", 500, px.w * 0.96);
      return;
    }

    if (L.kind === "stamp") {
      var left = expand(L.text || "{date}  ·  {place}", C);
      kit.txtFit(left, px.x, px.y + px.h / 2, L.size * s.U, colOf(L),
                 "left", 500, px.w * 0.62);
      kit.txt(s.handle || "@Nirayana.Soft", px.x + px.w, px.y + px.h / 2,
              L.size * s.U, P.gold, "right", 600);
      return;
    }
  }

  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function nameOf(L) {
    if (L.name) return L.name;
    if (L.kind === "view") {
      if (!L.sel.length) return "Empty view";
      var n = window.SPNodes.byId(L.sel[0]);
      return (n ? n.label : L.sel[0]) + (L.sel.length > 1 ? " +" + (L.sel.length - 1) : "");
    }
    return KINDS[L.kind] ? L.kind.charAt(0).toUpperCase() + L.kind.slice(1) : L.kind;
  }

  /* ---- the public render -------------------------------------------------- */
  /* `quiet` has the same meaning as in Auto mode: skip the bookkeeping only
     the side panels read. During playback the report is pure waste. */
  function render(C, p, quiet) {
    var s = S(), c = s.ctx, kit = K();
    if (!c) return null;
    var report = quiet ? null
      : { used: [], missing: [], empty: [], errors: [], layers: DOC.layers.length };

    /* the backdrop is the document's, not the stage's */
    if (DOC.bg.style === "none") {
      c.clearRect(0, 0, s.W, s.H);
    } else if (DOC.bg.style === "flat") {
      c.fillStyle = kit.pal().bg; c.fillRect(0, 0, s.W, s.H);
    } else if (DOC.bg.style === "vignette") {
      c.fillStyle = kit.pal().bg; c.fillRect(0, 0, s.W, s.H);
      var g = c.createRadialGradient(s.W / 2, s.H * 0.42, s.W * 0.10,
                                     s.W / 2, s.H * 0.42, s.W * 0.95);
      g.addColorStop(0, kit.pal().bg2); g.addColorStop(1, kit.pal().bg);
      c.fillStyle = g; c.fillRect(0, 0, s.W, s.H);
    } else {
      kit.background();
    }
    if (DOC.bg.stars && kit.pal().key !== "parchment") kit.stars();

    for (var i = 0; i < DOC.layers.length; i++)
      drawLayer(DOC.layers[i], C, p, report);

    kit.safeGuides();
    return report;
  }

  /* ---- the editing overlay ------------------------------------------------
     Drawn by the page after rendering and never by the recorder, which is why
     handles cannot appear in an export: the export path does not call this.
     On canvas rather than as DOM boxes over the preview, because a DOM
     overlay would have to be repositioned on every frame — exactly the forced
     layout per frame that made the panel stop responding when the animation
     ran. */
  function overlay(p) {
    var L = current(); if (!L) return;
    var s = S(), c = s.ctx;
    var u = windowU(L, p);
    var R = rectAt(L, u < 0 ? 0 : u), px = pxOf(R);
    var P = K().pal();
    c.save();
    c.setLineDash([Math.max(2, s.U * 0.008), Math.max(2, s.U * 0.006)]);
    c.strokeStyle = u < 0 ? P.mal : P.gold;
    c.lineWidth = Math.max(1, s.U * 0.0022);
    c.globalAlpha = 0.95;
    c.strokeRect(px.x, px.y, px.w, px.h);
    c.setLineDash([]);
    var hs = Math.max(6, s.U * 0.018);
    HANDLES.forEach(function (h) {
      var hx = px.x + px.w * h.fx, hy = px.y + px.h * h.fy;
      c.fillStyle = P.gold;
      c.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
    });
    if (L.to) {
      var tp = pxOf(L.to);
      c.setLineDash([Math.max(2, s.U * 0.004), Math.max(2, s.U * 0.008)]);
      c.strokeStyle = P.ben; c.globalAlpha = 0.8;
      c.strokeRect(tp.x, tp.y, tp.w, tp.h);
      c.setLineDash([]);
      c.beginPath();
      c.moveTo(px.x + px.w / 2, px.y + px.h / 2);
      c.lineTo(tp.x + tp.w / 2, tp.y + tp.h / 2);
      c.stroke();
    }
    if (u < 0) {
      c.globalAlpha = 1;
      K().txt("not on screen at this moment", px.x + px.w / 2,
              px.y + px.h / 2, s.U * 0.020, P.mal, "center", 600);
    }
    c.restore();
  }

  /* fx/fy are the handle's position in the rect; dx/dy which edges it moves */
  var HANDLES = [
    { k: "nw", fx: 0, fy: 0, l: 1, t: 1 }, { k: "n", fx: 0.5, fy: 0, t: 1 },
    { k: "ne", fx: 1, fy: 0, r: 1, t: 1 }, { k: "e", fx: 1, fy: 0.5, r: 1 },
    { k: "se", fx: 1, fy: 1, r: 1, b: 1 }, { k: "s", fx: 0.5, fy: 1, b: 1 },
    { k: "sw", fx: 0, fy: 1, l: 1, b: 1 }, { k: "w", fx: 0, fy: 0.5, l: 1 }
  ];

  /* ---- hit testing, in frame fractions ----------------------------------- */
  function hit(fx, fy, p, which) {
    var L = current();
    var tol = 0.032;
    if (L && !L.locked) {
      var u = windowU(L, p);
      var R = which === "to" && L.to ? L.to : rectAt(L, u < 0 ? 0 : u);
      for (var i = 0; i < HANDLES.length; i++) {
        var h = HANDLES[i];
        var hx = R.x + R.w * h.fx, hy = R.y + R.h * h.fy;
        if (Math.abs(fx - hx) < tol && Math.abs(fy - hy) < tol)
          return { id: L.id, mode: h.k, which: which || "rect" };
      }
      if (fx > R.x && fx < R.x + R.w && fy > R.y && fy < R.y + R.h)
        return { id: L.id, mode: "move", which: which || "rect" };
    }
    /* topmost visible layer under the point, so clicking a picture selects it */
    for (var j = DOC.layers.length - 1; j >= 0; j--) {
      var Q = DOC.layers[j];
      if (Q.hidden || Q.locked) continue;
      if (windowU(Q, p) < 0) continue;
      var r2 = rectAt(Q, windowU(Q, p));
      if (fx > r2.x && fx < r2.x + r2.w && fy > r2.y && fy < r2.y + r2.h)
        return { id: Q.id, mode: "pick", which: "rect" };
    }
    return null;
  }
  /* applies a drag; dx/dy are in frame fractions */
  function dragTo(grab, startRect, dx, dy, snap) {
    var L = byId(grab.id); if (!L || L.locked) return;
    var h = null;
    HANDLES.forEach(function (q) { if (q.k === grab.mode) h = q; });
    var R = { x: startRect.x, y: startRect.y, w: startRect.w, h: startRect.h };
    if (grab.mode === "move" || grab.mode === "pick") { R.x += dx; R.y += dy; }
    else if (h) {
      if (h.l) { R.x += dx; R.w -= dx; }
      if (h.r) { R.w += dx; }
      if (h.t) { R.y += dy; R.h -= dy; }
      if (h.b) { R.h += dy; }
    }
    if (R.w < 0.04) R.w = 0.04;
    if (R.h < 0.02) R.h = 0.02;
    if (snap) {
      var g = 1 / 24;
      R.x = Math.round(R.x / g) * g; R.y = Math.round(R.y / g) * g;
      R.w = Math.round(R.w / g) * g; R.h = Math.round(R.h / g) * g;
    }
    if (grab.which === "to") { L.to = R; } else { L.rect = R; }
  }

  /* ---- stack operations --------------------------------------------------- */
  function byId(id) {
    for (var i = 0; i < DOC.layers.length; i++)
      if (DOC.layers[i].id === id) return DOC.layers[i];
    return null;
  }
  function indexOf(id) {
    for (var i = 0; i < DOC.layers.length; i++)
      if (DOC.layers[i].id === id) return i;
    return -1;
  }
  function current() { return byId(PICK); }
  function add(o, where) {
    var L = layer(o);
    if (where === "bottom") DOC.layers.unshift(L);
    else DOC.layers.push(L);
    PICK = L.id;
    return L;
  }
  function remove(id) {
    var i = indexOf(id); if (i < 0) return;
    DOC.layers.splice(i, 1);
    if (PICK === id) PICK = DOC.layers.length ? DOC.layers[Math.min(i, DOC.layers.length - 1)].id : null;
  }
  function duplicate(id) {
    var L = byId(id); if (!L) return null;
    var copy = layer(JSON.parse(JSON.stringify(L)));
    copy.id = uid();
    copy.name = (L.name || nameOf(L)) + " copy";
    /* offset, so the copy is visibly a second object rather than appearing to
       have done nothing */
    copy.rect = { x: clamp(L.rect.x + 0.03, 0, 0.96), y: clamp(L.rect.y + 0.03, 0, 0.96),
                  w: L.rect.w, h: L.rect.h };
    DOC.layers.splice(indexOf(id) + 1, 0, copy);
    PICK = copy.id;
    return copy;
  }
  function move(id, delta) {
    var i = indexOf(id); if (i < 0) return;
    var j = clamp(i + delta, 0, DOC.layers.length - 1);
    if (j === i) return;
    var L = DOC.layers.splice(i, 1)[0];
    DOC.layers.splice(j, 0, L);
  }

  /* ---- saving ------------------------------------------------------------
     A composition is JSON, so it saves as text. Compositions live under their
     own key; nothing here touches the chart handoff key or the saved-chart
     format marker, which are load-bearing elsewhere. */
  var STORE = "nirayana.studio.compositions";
  function readAll() {
    try { return JSON.parse(localStorage.getItem(STORE) || "[]") || []; }
    catch (e) { return []; }
  }
  function writeAll(list) {
    try { localStorage.setItem(STORE, JSON.stringify(list)); return true; }
    catch (e) { return false; }
  }
  function save(name) {
    var list = readAll();
    var d = JSON.parse(JSON.stringify(DOC));
    d.name = name || DOC.name || "Untitled";
    d.savedAt = Date.now();
    var at = -1;
    list.forEach(function (q, i) { if (q.name === d.name) at = i; });
    if (at >= 0) list[at] = d; else list.push(d);
    DOC.name = d.name;
    return writeAll(list) ? d.name : null;
  }
  function load(name) {
    var list = readAll(), found = null;
    list.forEach(function (q) { if (q.name === name) found = q; });
    if (!found) return false;
    DOC = doc(found);
    DOC.on = true;
    DOC.name = found.name;
    PICK = DOC.layers.length ? DOC.layers[DOC.layers.length - 1].id : null;
    return true;
  }
  function drop(name) {
    writeAll(readAll().filter(function (q) { return q.name !== name; }));
  }

  /* ---- the reel's own length, for sequencing ----------------------------- */
  /* The last moment anything is on screen. A user who times a layer to end at
     0.6 and nothing after it has left a third of the reel empty, and the page
     should be able to say so. */
  function lastUsed() {
    var t = 0;
    DOC.layers.forEach(function (L) {
      if (L.hidden) return;
      t = Math.max(t, Math.max(L.t0, L.t1));
    });
    return t;
  }

  window.SPDirector = {
    EASE: EASE, ENTER: ENTER, EXIT: EXIT, IDLE: IDLE, KINDS: KINDS, COLS: COLS,
    ARRANGE: ARRANGE, SEQUENCE: SEQUENCE,
    doc: function () { return DOC; },
    on: function () { return !!DOC.on; },
    setOn: function (v) { DOC.on = !!v; },
    layer: layer, newDoc: function (o) { DOC = doc(o || { on: true }); PICK = null; return DOC; },
    build: build, groupsOf: groupsOf, arrange: arrange, sequence: sequence,
    stageRect: stageRect, bandRect: bandRect,
    render: render, overlay: overlay,
    /* Render somebody else's document without disturbing the one being
       edited — how a storyboard shot can be a Director scene. The swap is
       synchronous and restored in a finally, so a composer that throws
       mid-shot cannot leave the editor pointing at a saved document. */
    withDoc: function (d, fn) {
      var keep = DOC, keepPick = PICK;
      DOC = doc(d); DOC.on = true;
      try { return fn(); } finally { DOC = keep; PICK = keepPick; }
    },
    snapshot: function () { return JSON.parse(JSON.stringify(DOC)); },
    hit: hit, dragTo: dragTo, HANDLES: HANDLES,
    byId: byId, current: current, pick: function (id) { PICK = id; },
    picked: function () { return PICK; },
    add: add, remove: remove, duplicate: duplicate, move: move,
    nameOf: nameOf, windowU: windowU, rectAt: rectAt, expand: expand,
    tokens: tokenList, lastUsed: lastUsed,
    save: save, load: load, drop: drop, saved: readAll
  };
})();

/* ===== Director Pro — the document ========================================

   WHAT CHANGED FROM DIRECTOR, AND WHY IT HAD TO.

   Director gave a layer an entry, an exit, a continuous motion and an
   optional second rectangle to travel to. That is four named behaviours, and
   between them they can express a great many reels — but they cannot express
   "rise, hold for two seconds, drift left, then fall away", because that is
   five changes of direction on one property and the model holds two. Every
   tool that has ever had this problem has reached the same answer, and it is
   not a fifth named behaviour: it is KEYFRAMES.

   So here every animatable property is a track — a list of {t, v, e} sorted
   in time — and its value at an instant is an eased interpolation between the
   two keys either side. A property with one key is a constant. A property
   with none falls back to the layer's base value. Nothing else in the model
   animates anything, which is the point: there is exactly one answer to "why
   is this moving", and it is always "because of these keys".

   THE PRESETS STILL EXIST, AND THEY BAKE. "Rise in over half a second" is
   still one click, and that click WRITES KEYFRAMES rather than setting a mode
   the renderer interprets. A user who then wants the rise to overshoot drags
   a key, instead of discovering that the preset owns the property and the
   keys are ignored. A second hidden animation system that silently wins over
   the visible one is the single most confusing thing a tool like this can do,
   and refusing to have one is worth the extra code in bake().

   SCENES. A reel is a sequence of scenes, each with its own layers, its own
   backdrop, its own camera and a transition into the next. Director had one
   scene and a storyboard bolted alongside it; here the storyboard IS the
   document, times are in seconds rather than fractions of a mystery total,
   and a transition is a property of the join rather than a dip someone
   hard-coded.

   TIME IS IN SECONDS, EVERYWHERE. Director used fractions of the reel, which
   meant changing the reel length silently retimed every layer in it, and two
   layers could not be said to be "half a second apart" at all. Seconds are
   what a person editing a video thinks in and what a keyframe readout has to
   show, so seconds are what the model stores.

   NOTHING HERE DRAWS. This file is the document, the sampling, the presets
   and the migration from Director. The renderer is dp-render.js and the page
   is dp-ui.js; keeping the document free of canvas means it serialises, and
   that it can be built and asserted about in a test without a stage. */

(function () {
  "use strict";

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, f) { return a + (b - a) * f; }
  function uid(p) {
    uid.n = (uid.n || 0) + 1;
    return (p || "x") + uid.n + Math.floor(Math.random() * 46656).toString(36);
  }

  /* ---- easing -------------------------------------------------------------
     A keyframe carries the easing of the segment that LEAVES it, which is the
     convention every timeline tool uses: you set how a key departs, and the
     next key's own easing governs its own departure. The alternative — easing
     on arrival — reads backwards the moment you drag a key past another. */
  var EASE = {
    hold:    { label: "Hold", f: function () { return 0; } },
    linear:  { label: "Linear", f: function (f) { return f; } },
    smooth:  { label: "Smooth", f: function (f) { return f * f * (3 - 2 * f); } },
    "in":    { label: "Ease in", f: function (f) { return f * f * f; } },
    out:     { label: "Ease out", f: function (f) { var g = 1 - f; return 1 - g * g * g; } },
    inOut:   { label: "Ease in and out", f: function (f) {
      return f < 0.5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2; } },
    back:    { label: "Overshoot", f: function (f) {
      var c = 1.70158, g = f - 1;
      return 1 + (c + 1) * g * g * g + c * g * g; } },
    anticipate: { label: "Anticipate", f: function (f) {
      var c = 1.70158; return f * f * ((c + 1) * f - c); } },
    elastic: { label: "Elastic", f: function (f) {
      if (f <= 0) return 0; if (f >= 1) return 1;
      var p = 0.34;
      return Math.pow(2, -10 * f) * Math.sin((f - p / 4) * (2 * Math.PI) / p) + 1; } },
    bounce:  { label: "Bounce", f: function (f) {
      var n = 7.5625, d = 2.75;
      if (f < 1 / d) return n * f * f;
      if (f < 2 / d) { f -= 1.5 / d; return n * f * f + 0.75; }
      if (f < 2.5 / d) { f -= 2.25 / d; return n * f * f + 0.9375; }
      f -= 2.625 / d; return n * f * f + 0.984375; } },
    step:    { label: "Step", f: function (f) { return f < 1 ? 0 : 1; } }
  };
  function ease(f, k) { return (EASE[k] || EASE.smooth).f(clamp(f, 0, 1)); }

  /* ---- tracks -------------------------------------------------------------
     A track is an array of keys sorted by time. Sampling is a binary search
     in principle and a linear scan in practice, because a track with more
     than a few dozen keys on one property is a track somebody should have
     drawn with a different property. */
  function key(t, v, e) { return { t: +t || 0, v: +v || 0, e: e || "smooth" }; }
  function sortTrack(tr) {
    tr.sort(function (a, b) { return a.t - b.t; });
    return tr;
  }
  /* The value of a property at a time.
     - no track, or an empty one → the layer's own base value
     - before the first key → that key's value (a property does not spring
       into existence; it was always what it first becomes)
     - after the last → the last key's value */
  function sample(track, t, base) {
    if (!track || !track.length) return base;
    if (track.length === 1) return track[0].v;
    if (t <= track[0].t) return track[0].v;
    var last = track[track.length - 1];
    if (t >= last.t) return last.v;
    for (var i = 0; i < track.length - 1; i++) {
      var a = track[i], b = track[i + 1];
      if (t >= a.t && t <= b.t) {
        var span = b.t - a.t;
        if (span <= 1e-9) return b.v;
        return lerp(a.v, b.v, ease((t - a.t) / span, a.e));
      }
    }
    return last.v;
  }
  /* add or replace a key at a time, which is what clicking "key this" does */
  function setKey(track, t, v, e) {
    for (var i = 0; i < track.length; i++) {
      if (Math.abs(track[i].t - t) < 1e-4) {
        track[i].v = v;
        if (e) track[i].e = e;
        return track[i];
      }
    }
    var k = key(t, v, e);
    track.push(k);
    sortTrack(track);
    return k;
  }

  /* ---- what a layer can animate ------------------------------------------
     The unit column matters more than it looks: a panel that shows rotation
     and opacity on the same slider range is a panel that cannot be used, and
     a keyframe readout has to print "32.0%" and "-14°" rather than two bare
     numbers. */
  var PROPS = {
    x:       { label: "X", unit: "%", min: -100, max: 200, step: 0.1, base: 10, scale: 100 },
    y:       { label: "Y", unit: "%", min: -100, max: 200, step: 0.1, base: 20, scale: 100 },
    w:       { label: "Width", unit: "%", min: 1, max: 300, step: 0.1, base: 80, scale: 100 },
    h:       { label: "Height", unit: "%", min: 1, max: 300, step: 0.1, base: 40, scale: 100 },
    scale:   { label: "Scale", unit: "×", min: 0, max: 6, step: 0.01, base: 1, scale: 1 },
    rot:     { label: "Rotation", unit: "°", min: -1440, max: 1440, step: 1, base: 0, scale: 1 },
    opacity: { label: "Opacity", unit: "", min: 0, max: 1, step: 0.01, base: 1, scale: 1 },
    skewX:   { label: "Skew X", unit: "°", min: -60, max: 60, step: 0.5, base: 0, scale: 1 },
    skewY:   { label: "Skew Y", unit: "°", min: -60, max: 60, step: 0.5, base: 0, scale: 1 },
    blur:    { label: "Blur", unit: "px", min: 0, max: 60, step: 0.5, base: 0, scale: 1 },
    glow:    { label: "Glow", unit: "px", min: 0, max: 90, step: 1, base: 0, scale: 1 },
    bright:  { label: "Brightness", unit: "×", min: 0, max: 3, step: 0.01, base: 1, scale: 1 },
    contrast:{ label: "Contrast", unit: "×", min: 0, max: 3, step: 0.01, base: 1, scale: 1 },
    sat:     { label: "Saturation", unit: "×", min: 0, max: 4, step: 0.01, base: 1, scale: 1 },
    hue:     { label: "Hue shift", unit: "°", min: -180, max: 180, step: 1, base: 0, scale: 1 },
    grain:   { label: "Grain", unit: "", min: 0, max: 1, step: 0.01, base: 0, scale: 1 },
    chroma:  { label: "Chromatic", unit: "px", min: 0, max: 24, step: 0.5, base: 0, scale: 1 },
    reveal:  { label: "Reveal", unit: "", min: 0, max: 1, step: 0.01, base: 1, scale: 1 },
    inner:   { label: "The drawing's own playhead", unit: "", min: 0, max: 1,
               step: 0.01, base: 1, scale: 1 }
  };
  var PROP_ORDER = ["x", "y", "w", "h", "scale", "rot", "skewX", "skewY",
                    "opacity", "reveal", "blur", "glow", "bright", "contrast",
                    "sat", "hue", "grain", "chroma", "inner"];

  var BLENDS = ["source-over", "multiply", "screen", "overlay", "darken",
                "lighten", "color-dodge", "color-burn", "hard-light",
                "soft-light", "difference", "exclusion", "hue", "saturation",
                "color", "luminosity"];
  var BLEND_LABEL = {
    "source-over": "Normal", multiply: "Multiply", screen: "Screen",
    overlay: "Overlay", darken: "Darken", lighten: "Lighten",
    "color-dodge": "Dodge", "color-burn": "Burn", "hard-light": "Hard light",
    "soft-light": "Soft light", difference: "Difference", exclusion: "Exclusion",
    hue: "Hue", saturation: "Saturation", color: "Colour", luminosity: "Luminosity"
  };

  var KINDS = {
    view:  "A composition — selected nodes drawn by a composer",
    text:  "Your own words, with a per-character animator",
    rule:  "A hairline, a bar, a box",
    wash:  "A tint, a vignette, a panel, a gradient",
    band:  "The caption band — headline over sub-line",
    stamp: "The date, the place and the handle",
    shape: "A circle, a ring, a polygon, a star",
    image: "A frame grabbed from another layer, or a file you chose"
  };

  var TRANSITIONS = {
    cut:      { label: "Cut", seconds: 0 },
    dissolve: { label: "Cross dissolve", seconds: 0.5 },
    dip:      { label: "Dip to colour", seconds: 0.6 },
    flash:    { label: "Flash", seconds: 0.3 },
    pushL:    { label: "Push left", seconds: 0.6 },
    pushR:    { label: "Push right", seconds: 0.6 },
    pushU:    { label: "Push up", seconds: 0.6 },
    wipeL:    { label: "Wipe left", seconds: 0.5 },
    wipeU:    { label: "Wipe up", seconds: 0.5 },
    iris:     { label: "Iris", seconds: 0.6 },
    zoomBlur: { label: "Zoom blur", seconds: 0.5 },
    glitch:   { label: "Glitch", seconds: 0.35 }
  };

  /* ---- the objects -------------------------------------------------------- */
  function track(o) { return sortTrack((o || []).map(function (k) {
    return key(k.t, k.v, k.e); })); }

  function layer(o) {
    o = o || {};
    var L = {
      id: o.id || uid("L"),
      kind: o.kind || "view",
      name: o.name || "",
      hidden: !!o.hidden, locked: !!o.locked, solo: !!o.solo,
      clip: !!o.clip,
      blend: o.blend || "source-over",
      /* content */
      sel: (o.sel || []).slice(),
      force: o.force || null,
      text: o.text || "",
      sub: o.sub || "",
      size: o.size == null ? 0.034 : o.size,
      align: o.align || "center",
      valign: o.valign || "middle",
      weight: o.weight == null ? 700 : o.weight,
      tracking: o.tracking == null ? 0 : o.tracking,
      lineHeight: o.lineHeight == null ? 1.26 : o.lineHeight,
      lines: o.lines == null ? 3 : o.lines,
      col: o.col || "ink",
      hex: o.hex || "#ffffff",
      hex2: o.hex2 || "#000000",
      shape: o.shape || "flat",
      sides: o.sides == null ? 6 : o.sides,
      src: o.src || null,
      /* how text arrives — the animator, which is a text-only affair and so
         does not belong in the general property list */
      animator: o.animator || "none",
      animSeconds: o.animSeconds == null ? 0.8 : o.animSeconds,
      /* time, in seconds within the scene */
      t0: o.t0 == null ? 0 : +o.t0,
      t1: o.t1 == null ? 0 : +o.t1,       /* 0 means "to the end of the scene" */
      /* base values, used wherever a property has no track */
      base: {},
      tracks: {},
      effects: (o.effects || []).map(function (e) {
        return { k: e.k, on: e.on !== false, p: JSON.parse(JSON.stringify(e.p || {})) }; }),
      mask: o.mask ? { shape: o.mask.shape || "rect", x: o.mask.x, y: o.mask.y,
                       w: o.mask.w, h: o.mask.h, feather: o.mask.feather || 0,
                       invert: !!o.mask.invert, rot: o.mask.rot || 0 } : null,
      clock: o.clock || "layer",
      cycles: o.cycles == null ? 1 : o.cycles,
      motionBlur: !!o.motionBlur
    };
    PROP_ORDER.forEach(function (k) {
      var P = PROPS[k];
      L.base[k] = (o.base && o.base[k] != null) ? +o.base[k]
                : (o[k] != null ? +o[k] : P.base);
      L.tracks[k] = track(o.tracks && o.tracks[k]);
    });
    return L;
  }

  function scene(o) {
    o = o || {};
    return {
      id: o.id || uid("S"),
      name: o.name || "Scene",
      seconds: o.seconds == null ? 6 : Math.max(0.2, +o.seconds),
      bg: { style: (o.bg && o.bg.style) || "gradient",
            stars: o.bg ? o.bg.stars !== false : true,
            hex: (o.bg && o.bg.hex) || null },
      trans: { k: (o.trans && o.trans.k) || "dissolve",
               seconds: (o.trans && o.trans.seconds) == null ? 0.5 : +o.trans.seconds,
               hex: (o.trans && o.trans.hex) || null },
      camera: {
        base: { zoom: (o.camera && o.camera.base && o.camera.base.zoom) || 1,
                panX: (o.camera && o.camera.base && o.camera.base.panX) || 0,
                panY: (o.camera && o.camera.base && o.camera.base.panY) || 0,
                rot:  (o.camera && o.camera.base && o.camera.base.rot) || 0 },
        tracks: { zoom: track(o.camera && o.camera.tracks && o.camera.tracks.zoom),
                  panX: track(o.camera && o.camera.tracks && o.camera.tracks.panX),
                  panY: track(o.camera && o.camera.tracks && o.camera.tracks.panY),
                  rot:  track(o.camera && o.camera.tracks && o.camera.tracks.rot) }
      },
      layers: (o.layers || []).map(layer)
    };
  }

  var FORMATS = {
    reel:      { label: "Reel / Story  9:16", w: 1080, h: 1920 },
    reel4k:    { label: "Reel 4K  9:16", w: 2160, h: 3840 },
    feed:      { label: "Feed post  4:5", w: 1080, h: 1350 },
    square:    { label: "Square  1:1", w: 1080, h: 1080 },
    squareHi:  { label: "Square HQ  1:1", w: 2048, h: 2048 },
    wide:      { label: "Landscape  16:9", w: 1920, h: 1080 },
    wide4k:    { label: "Landscape 4K  16:9", w: 3840, h: 2160 },
    cinema:    { label: "Cinemascope  2.39:1", w: 2048, h: 858 }
  };
  /* Where each platform puts its own chrome, as fractions of the frame. A
     guide is only useful if it is the real number, so these are kept apart
     rather than averaged into one "safe area" that is wrong everywhere. */
  var SAFE = {
    instagram: { label: "Instagram reel", top: 0.14, bottom: 0.20, right: 0.14, left: 0.03 },
    tiktok:    { label: "TikTok", top: 0.09, bottom: 0.22, right: 0.16, left: 0.03 },
    shorts:    { label: "YouTube Shorts", top: 0.10, bottom: 0.19, right: 0.14, left: 0.03 },
    feedpost:  { label: "Feed post", top: 0.05, bottom: 0.05, right: 0.05, left: 0.05 },
    none:      { label: "No guides", top: 0, bottom: 0, right: 0, left: 0 }
  };

  function doc(o) {
    o = o || {};
    var d = {
      v: 2,
      name: o.name || "Untitled reel",
      format: o.format || "reel",
      fps: o.fps || 30,
      quality: o.quality == null ? 12 : o.quality,     /* Mbit/s */
      safe: o.safe || "instagram",
      pal: o.pal || "midnight",
      handle: o.handle || "@Nirayana.Soft",
      grade: { bright: (o.grade && o.grade.bright) || 1,
               contrast: (o.grade && o.grade.contrast) || 1,
               sat: (o.grade && o.grade.sat) || 1,
               hue: (o.grade && o.grade.hue) || 0,
               vignette: (o.grade && o.grade.vignette) || 0,
               grain: (o.grade && o.grade.grain) || 0 },
      audio: o.audio ? { name: o.audio.name, start: o.audio.start || 0,
                         gain: o.audio.gain == null ? 1 : o.audio.gain,
                         fadeIn: o.audio.fadeIn || 0, fadeOut: o.audio.fadeOut || 0 }
                     : null,
      scenes: (o.scenes || []).map(scene)
    };
    if (!d.scenes.length) d.scenes = [scene({ name: "Scene 1" })];
    return d;
  }

  /* ---- time ---------------------------------------------------------------
     Scenes butt against each other and a transition is drawn over the join
     rather than adding to the length, which is what makes the reel exactly as
     long as the sum of its scenes. A transition that extended the timeline
     would mean adding a dissolve changed when every later scene started. */
  function total(d) {
    var t = 0;
    d.scenes.forEach(function (s) { t += s.seconds; });
    return Math.max(0.2, t);
  }
  function sceneAt(d, t) {
    var acc = 0;
    for (var i = 0; i < d.scenes.length; i++) {
      var s = d.scenes[i];
      if (t < acc + s.seconds || i === d.scenes.length - 1)
        return { i: i, scene: s, local: clamp(t - acc, 0, s.seconds), start: acc };
      acc += s.seconds;
    }
    return null;
  }
  function sceneStart(d, i) {
    var acc = 0;
    for (var j = 0; j < i && j < d.scenes.length; j++) acc += d.scenes[j].seconds;
    return acc;
  }
  /* a layer's window in the scene, resolving t1 = 0 to "the end" */
  function windowOf(L, s) {
    var a = clamp(L.t0, 0, s.seconds);
    var b = L.t1 > 0 ? clamp(L.t1, 0, s.seconds) : s.seconds;
    if (b < a) { var t = a; a = b; b = t; }
    return { a: a, b: b, len: Math.max(0.0001, b - a) };
  }
  /* the value of one property of one layer at a scene-local time */
  function valueOf(L, k, t) {
    return sample(L.tracks[k], t, L.base[k] == null ? PROPS[k].base : L.base[k]);
  }
  function cameraAt(s, t) {
    var c = s.camera;
    return { zoom: sample(c.tracks.zoom, t, c.base.zoom),
             panX: sample(c.tracks.panX, t, c.base.panX),
             panY: sample(c.tracks.panY, t, c.base.panY),
             rot:  sample(c.tracks.rot,  t, c.base.rot) };
  }

  /* ---- presets, which BAKE ------------------------------------------------
     Each writes keys into the layer's tracks over a stated stretch of its
     window and then has nothing more to do with it. That is the whole
     contract, and it is why a preset can be applied twice, applied to a
     property that already has keys, or half undone by dragging one key,
     without anything having to know a preset was ever involved. */
  function clearIn(tr, a, b) {
    for (var i = tr.length - 1; i >= 0; i--)
      if (tr[i].t >= a - 1e-6 && tr[i].t <= b + 1e-6) tr.splice(i, 1);
  }
  function put(L, k, t, v, e) { setKey(L.tracks[k], t, v, e); }

  var ENTRIES = {
    none:   { label: "Appear", f: function () {} },
    fade:   { label: "Fade in", f: function (L, a, b) {
      put(L, "opacity", a, 0, "out"); put(L, "opacity", b, L.base.opacity, "smooth"); } },
    rise:   { label: "Rise", f: function (L, a, b) {
      put(L, "opacity", a, 0, "out"); put(L, "opacity", b, L.base.opacity);
      put(L, "y", a, L.base.y + 10, "out"); put(L, "y", b, L.base.y); } },
    drop:   { label: "Drop in", f: function (L, a, b) {
      put(L, "opacity", a, 0, "out"); put(L, "opacity", b, L.base.opacity);
      put(L, "y", a, L.base.y - 10, "bounce"); put(L, "y", b, L.base.y); } },
    slideL: { label: "In from the left", f: function (L, a, b) {
      put(L, "opacity", a, 0, "out"); put(L, "opacity", a + (b - a) * 0.4, L.base.opacity);
      put(L, "x", a, L.base.x - 40, "out"); put(L, "x", b, L.base.x); } },
    slideR: { label: "In from the right", f: function (L, a, b) {
      put(L, "opacity", a, 0, "out"); put(L, "opacity", a + (b - a) * 0.4, L.base.opacity);
      put(L, "x", a, L.base.x + 40, "out"); put(L, "x", b, L.base.x); } },
    pop:    { label: "Pop", f: function (L, a, b) {
      put(L, "opacity", a, 0, "out"); put(L, "opacity", a + (b - a) * 0.5, L.base.opacity);
      put(L, "scale", a, L.base.scale * 0.6, "back"); put(L, "scale", b, L.base.scale); } },
    zoomIn: { label: "Zoom in", f: function (L, a, b) {
      put(L, "opacity", a, 0, "out"); put(L, "opacity", a + (b - a) * 0.5, L.base.opacity);
      put(L, "scale", a, L.base.scale * 1.6, "out"); put(L, "scale", b, L.base.scale); } },
    blurIn: { label: "Focus in", f: function (L, a, b) {
      put(L, "opacity", a, 0, "out"); put(L, "opacity", b, L.base.opacity);
      put(L, "blur", a, 26, "out"); put(L, "blur", b, L.base.blur); } },
    turn:   { label: "Turn in", f: function (L, a, b) {
      put(L, "opacity", a, 0, "out"); put(L, "opacity", b, L.base.opacity);
      put(L, "rot", a, L.base.rot - 16, "back"); put(L, "rot", b, L.base.rot); } },
    unroll: { label: "Unroll", f: function (L, a, b) {
      put(L, "reveal", a, 0, "inOut"); put(L, "reveal", b, 1); } },
    /* "Draw itself" means the thing builds up rather than arrives. For a view
       layer that is the composer's own playhead — every composer animates
       itself, so handing it a rising p IS the entry. For every other kind
       there is no inner animation to drive, so the same intent is a wipe.
       The harness caught this: on a shape layer the preset wrote three keys
       and produced one distinct frame, which is a control that looks like it
       works and does nothing. */
    draw:   { label: "Draw itself", f: function (L, a, b) {
      put(L, "inner", a, 0, "inOut"); put(L, "inner", b, 1);
      if (L.kind !== "view") { put(L, "reveal", a, 0, "inOut"); put(L, "reveal", b, 1); }
      put(L, "opacity", a, L.base.opacity); } },
    grow:   { label: "Grow from nothing", f: function (L, a, b) {
      put(L, "scale", a, 0.02, "back"); put(L, "scale", b, L.base.scale);
      put(L, "opacity", a, 0, "out"); put(L, "opacity", a + (b - a) * 0.3, L.base.opacity); } }
  };
  var EXITS = {
    none:    { label: "Stay", f: function () {} },
    fade:    { label: "Fade out", f: function (L, a, b) {
      put(L, "opacity", a, L.base.opacity, "in"); put(L, "opacity", b, 0); } },
    sink:    { label: "Sink", f: function (L, a, b) {
      put(L, "opacity", a, L.base.opacity, "in"); put(L, "opacity", b, 0);
      put(L, "y", a, L.base.y, "in"); put(L, "y", b, L.base.y + 10); } },
    lift:    { label: "Lift away", f: function (L, a, b) {
      put(L, "opacity", a, L.base.opacity, "in"); put(L, "opacity", b, 0);
      put(L, "y", a, L.base.y, "in"); put(L, "y", b, L.base.y - 10); } },
    slideL:  { label: "Out to the left", f: function (L, a, b) {
      put(L, "opacity", a, L.base.opacity, "in"); put(L, "opacity", b, 0);
      put(L, "x", a, L.base.x, "in"); put(L, "x", b, L.base.x - 40); } },
    slideR:  { label: "Out to the right", f: function (L, a, b) {
      put(L, "opacity", a, L.base.opacity, "in"); put(L, "opacity", b, 0);
      put(L, "x", a, L.base.x, "in"); put(L, "x", b, L.base.x + 40); } },
    shrink:  { label: "Shrink away", f: function (L, a, b) {
      put(L, "opacity", a, L.base.opacity, "in"); put(L, "opacity", b, 0);
      put(L, "scale", a, L.base.scale, "in"); put(L, "scale", b, L.base.scale * 0.55); } },
    pullBack:{ label: "Pull back", f: function (L, a, b) {
      put(L, "opacity", a, L.base.opacity, "in"); put(L, "opacity", b, 0);
      put(L, "scale", a, L.base.scale, "in"); put(L, "scale", b, L.base.scale * 1.5); } },
    blurOut: { label: "Blur away", f: function (L, a, b) {
      put(L, "opacity", a, L.base.opacity, "in"); put(L, "opacity", b, 0);
      put(L, "blur", a, L.base.blur, "in"); put(L, "blur", b, 30); } },
    roll:    { label: "Roll away", f: function (L, a, b) {
      put(L, "reveal", a, 1, "inOut"); put(L, "reveal", b, 0); } }
  };
  /* A continuous motion is a repeating pair of keys across the whole window,
     which is why there is no separate "loop" concept: the keys ARE the loop,
     and a user who wants the third cycle to be bigger drags the third pair. */
  var IDLES = {
    none:  { label: "Still", f: function () {} },
    drift: { label: "Drift", f: function (L, a, b, amt, n) {
      for (var i = 0; i <= n; i++) {
        var t = a + (b - a) * (i / n);
        put(L, "x", t, L.base.x + Math.sin(i / n * Math.PI * 2) * 1.6 * amt, "smooth");
        put(L, "y", t, L.base.y + Math.cos(i / n * Math.PI * 1.4) * 1.3 * amt, "smooth");
      } } },
    bob:   { label: "Bob", f: function (L, a, b, amt, n) {
      for (var i = 0; i <= n; i++) {
        var t = a + (b - a) * (i / n);
        put(L, "y", t, L.base.y + Math.sin(i / n * Math.PI * 4) * 1.4 * amt, "smooth");
      } } },
    sway:  { label: "Sway", f: function (L, a, b, amt, n) {
      for (var i = 0; i <= n; i++) {
        var t = a + (b - a) * (i / n);
        put(L, "rot", t, L.base.rot + Math.sin(i / n * Math.PI * 2) * 2.4 * amt, "smooth");
      } } },
    spin:  { label: "Spin", f: function (L, a, b, amt) {
      put(L, "rot", a, L.base.rot, "linear");
      put(L, "rot", b, L.base.rot + 360 * amt, "linear"); } },
    pulse: { label: "Breathe", f: function (L, a, b, amt, n) {
      for (var i = 0; i <= n; i++) {
        var t = a + (b - a) * (i / n);
        put(L, "scale", t, L.base.scale * (1 + Math.sin(i / n * Math.PI * 4) * 0.035 * amt), "smooth");
      } } },
    creep: { label: "Slow zoom", f: function (L, a, b, amt) {
      put(L, "scale", a, L.base.scale, "linear");
      put(L, "scale", b, L.base.scale * (1 + 0.12 * amt), "linear"); } },
    kenBurns: { label: "Ken Burns", f: function (L, a, b, amt) {
      put(L, "scale", a, L.base.scale, "inOut");
      put(L, "scale", b, L.base.scale * (1 + 0.18 * amt), "inOut");
      put(L, "x", a, L.base.x, "inOut");
      put(L, "x", b, L.base.x - 4 * amt, "inOut");
      put(L, "y", a, L.base.y, "inOut");
      put(L, "y", b, L.base.y - 3 * amt, "inOut"); } },
    shimmer: { label: "Shimmer", f: function (L, a, b, amt, n) {
      for (var i = 0; i <= n * 2; i++) {
        var t = a + (b - a) * (i / (n * 2));
        put(L, "opacity", t, L.base.opacity *
          (1 - Math.abs(Math.sin(i / (n * 2) * Math.PI * 9)) * 0.14 * amt), "smooth");
      } } }
  };

  /* Applying a preset clears the stretch it owns first, so applying "rise"
     after "slide in" replaces it instead of averaging two fights over x. */
  function applyEntry(L, s, k, seconds) {
    var w = windowOf(L, s), a = w.a, b = Math.min(w.b, a + Math.max(0.05, seconds));
    ["opacity", "x", "y", "scale", "rot", "blur", "reveal", "inner"].forEach(
      function (p) { clearIn(L.tracks[p], a, b); });
    (ENTRIES[k] || ENTRIES.none).f(L, a, b);
    L.entryName = k; L.entrySeconds = seconds;
  }
  function applyExit(L, s, k, seconds) {
    var w = windowOf(L, s), b = w.b, a = Math.max(w.a, b - Math.max(0.05, seconds));
    ["opacity", "x", "y", "scale", "rot", "blur", "reveal"].forEach(
      function (p) { clearIn(L.tracks[p], a, b); });
    (EXITS[k] || EXITS.none).f(L, a, b);
    L.exitName = k; L.exitSeconds = seconds;
  }
  function applyIdle(L, s, k, amt, cycles) {
    var w = windowOf(L, s);
    var n = Math.max(2, Math.round((cycles || 1) * 12));
    /* the idle owns the middle, leaving whatever the entry and exit wrote */
    var a = w.a + (L.entrySeconds || 0), b = w.b - (L.exitSeconds || 0);
    if (b - a < 0.2) { a = w.a; b = w.b; }
    ["x", "y", "scale", "rot", "opacity"].forEach(function (p) { clearIn(L.tracks[p], a, b); });
    (IDLES[k] || IDLES.none).f(L, a, b, amt == null ? 1 : amt, n);
    L.idleName = k;
  }

  /* ---- migrating a Director document --------------------------------------
     Director's four named behaviours are exactly expressible as keys, so a
     document made there opens here with its animation intact rather than
     flattened — and once open, every one of those behaviours is a handful of
     keys the user can drag, which is the upgrade. */
  function fromDirector(old, seconds) {
    seconds = seconds || 15;
    var s = scene({ name: old.name || "Scene 1", seconds: seconds,
                    bg: { style: (old.bg && old.bg.style) || "gradient",
                          stars: old.bg ? old.bg.stars !== false : true } });
    (old.layers || []).forEach(function (o) {
      var L = layer({
        kind: o.kind, name: o.name, hidden: o.hidden, locked: o.locked,
        clip: o.clip, sel: o.sel, force: o.force, text: o.text, sub: o.sub,
        size: o.size, align: o.align, valign: o.valign, weight: o.weight,
        lines: o.lines, col: o.col, hex: o.hex, shape: o.shape,
        clock: o.clock, cycles: o.cycles,
        t0: (o.t0 || 0) * seconds,
        t1: (o.t1 == null ? 1 : o.t1) * seconds,
        base: { x: (o.rect ? o.rect.x : 0.1) * 100, y: (o.rect ? o.rect.y : 0.2) * 100,
                w: (o.rect ? o.rect.w : 0.8) * 100, h: (o.rect ? o.rect.h : 0.4) * 100,
                rot: o.rot || 0, opacity: o.opacity == null ? 1 : o.opacity }
      });
      var w = windowOf(L, s);
      if (o.to) {
        put(L, "x", w.a, o.rect.x * 100, o.ease || "smooth");
        put(L, "x", w.b, o.to.x * 100);
        put(L, "y", w.a, o.rect.y * 100, o.ease || "smooth");
        put(L, "y", w.b, o.to.y * 100);
        put(L, "w", w.a, o.rect.w * 100, o.ease || "smooth");
        put(L, "w", w.b, o.to.w * 100);
        put(L, "h", w.a, o.rect.h * 100, o.ease || "smooth");
        put(L, "h", w.b, o.to.h * 100);
      }
      if (o.idle && o.idle.k && o.idle.k !== "none")
        applyIdle(L, s, o.idle.k === "flicker" ? "shimmer" : o.idle.k, o.idle.amt, 1);
      if (o.enter && o.enter.k && o.enter.k !== "none")
        applyEntry(L, s, ENTRIES[o.enter.k] ? o.enter.k : "fade",
                   (o.enter.len || 0.25) * seconds);
      if (o.exit && o.exit.k && o.exit.k !== "none")
        applyExit(L, s, EXITS[o.exit.k] ? o.exit.k : "fade",
                  (o.exit.len || 0.2) * seconds);
      s.layers.push(L);
    });
    return doc({ name: old.name || "From Director", scenes: [s] });
  }

  /* ---- stack and scene operations ----------------------------------------- */
  function findLayer(d, id) {
    for (var i = 0; i < d.scenes.length; i++)
      for (var j = 0; j < d.scenes[i].layers.length; j++)
        if (d.scenes[i].layers[j].id === id)
          return { scene: d.scenes[i], si: i, layer: d.scenes[i].layers[j], li: j };
    return null;
  }
  function soloed(s) {
    return s.layers.some(function (L) { return L.solo; });
  }
  function visible(s, L) {
    if (L.hidden) return false;
    if (soloed(s) && !L.solo) return false;
    return true;
  }

  window.DPModel = {
    EASE: EASE, PROPS: PROPS, PROP_ORDER: PROP_ORDER, KINDS: KINDS,
    BLENDS: BLENDS, BLEND_LABEL: BLEND_LABEL, TRANSITIONS: TRANSITIONS,
    FORMATS: FORMATS, SAFE: SAFE,
    ENTRIES: ENTRIES, EXITS: EXITS, IDLES: IDLES,
    doc: doc, scene: scene, layer: layer, key: key, track: track,
    uid: uid, ease: ease, sample: sample, setKey: setKey, sortTrack: sortTrack,
    clearIn: clearIn,
    total: total, sceneAt: sceneAt, sceneStart: sceneStart,
    windowOf: windowOf, valueOf: valueOf, cameraAt: cameraAt,
    applyEntry: applyEntry, applyExit: applyExit, applyIdle: applyIdle,
    fromDirector: fromDirector, findLayer: findLayer,
    visible: visible, soloed: soloed,
    clamp: clamp, lerp: lerp
  };
})();

/* ===== Director Pro — the renderer ========================================

   THE COMPOSITING MODEL, AND THE ONE DECISION THE WHOLE FILE TURNS ON.

   A layer that needs a blur, a mask, a blend mode or a chromatic split cannot
   be drawn straight onto the frame: a filter applies to what is drawn AFTER
   it is set, a blend mode mixes with what is already there, and a mask has to
   cut the layer rather than the frame. All three want the layer as a finished
   picture before it touches the frame. So a layer that needs any of them is
   rendered into a scratch canvas and composited; a layer that needs none is
   drawn straight onto the frame.

   That "straight onto the frame" branch is not an optimisation detail, it is
   most of the page's performance. A full-size scratch canvas per layer per
   frame, cleared and allocated, is the difference between a reel that plays
   and a reel that stutters — and the great majority of layers in a real
   document need nothing but a transform and an alpha. So the test for the
   expensive path is made once, from the values actually sampled at this
   instant, and a layer whose blur happens to be zero right now takes the
   cheap path even though it has a blur track.

   SCRATCH CANVASES ARE POOLED. Allocating a 1080×1920 canvas is a few
   megabytes and a garbage-collection pause; doing it four times a frame is a
   pause a second. The pool hands out canvases by size and takes them back.

   THE COMPOSERS ARE BORROWED, NOT REIMPLEMENTED. Every diagram here is one of
   Studio Pro's composers, reached through SPStage.kit, because a second set
   of pictures free to disagree with the first is the trap this codebase has
   stayed out of three times now — the recorder, the Viṃśottarī and Director
   mode. The stage singleton is lent its canvas and size for the duration of a
   layer and handed back.

   WHAT IS DRAWN AT EXPORT AND WHAT IS NOT. Guides, the grid, handles and the
   out-of-window hatching are drawn by overlay(), which the page calls after
   the frame and the recorder never calls. There is no flag to get wrong. */

(function () {
  "use strict";

  var M = null;                       /* DPModel, resolved on first use */
  function mdl() { return M || (M = window.DPModel); }
  function kit() { return window.SPStage.kit; }
  function SS() { return window.SPStage.S; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  var R2 = Math.PI / 180;
  var SANS = 'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';

  /* ---- the state of a render ---------------------------------------------- */
  var S = {
    cv: null, ctx: null, W: 1080, H: 1920, U: 1080,
    quality: 1,                       /* preview scale; export always 1 */
    doc: null, C: null, t: 0,
    showGuides: true, showGrid: false, grid: 12
  };

  /* ---- the scratch pool ---------------------------------------------------- */
  var POOL = [];
  function borrowCv(w, h) {
    for (var i = 0; i < POOL.length; i++) {
      if (POOL[i].free && POOL[i].cv.width === w && POOL[i].cv.height === h) {
        POOL[i].free = false;
        var c = POOL[i].cv.getContext("2d");
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.clearRect(0, 0, w, h);
        return POOL[i];
      }
    }
    var cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    var e = { cv: cv, free: false };
    /* a document with twenty effected layers should not keep twenty canvases
       alive for ever; the pool is a working set, not a cache */
    if (POOL.length > 8) POOL.splice(0, POOL.length - 8);
    POOL.push(e);
    return e;
  }
  function giveBack(e) { if (e) e.free = true; }

  /* Lend the Studio Pro stage singleton a canvas and a size. Every composer
     sizes from S.U, so a layer drawn into a scratch canvas is the same
     picture at the same scale as one drawn onto the frame. */
  function borrowStage(ctx, w, h, u, fn) {
    var s = SS();
    var keep = { cv: s.cv, ctx: s.ctx, W: s.W, H: s.H, U: s.U, safe: s.safe,
                 tile: s.tile, head: s.headline, sub: s.sub, pal: s.pal,
                 handle: s.handle };
    s.ctx = ctx; s.W = w; s.H = h; s.U = u; s.safe = false; s.tile = true;
    s.headline = ""; s.sub = "";
    if (S.doc) { s.pal = S.doc.pal; s.handle = S.doc.handle; }
    try { return fn(); }
    finally {
      s.cv = keep.cv; s.ctx = keep.ctx; s.W = keep.W; s.H = keep.H; s.U = keep.U;
      s.safe = keep.safe; s.tile = keep.tile; s.headline = keep.head;
      s.sub = keep.sub; s.pal = keep.pal; s.handle = keep.handle;
    }
  }

  /* ---- colour -------------------------------------------------------------- */
  function pal() {
    var P = window.SPStage.PALS[S.doc ? S.doc.pal : "midnight"];
    return P || window.SPStage.PALS.midnight;
  }
  function colOf(L) {
    var P = pal();
    if (L.col === "custom") return L.hex || P.ink;
    return P[L.col] || P.ink;
  }
  /* "#rrggbb" with an alpha, without a colour library */
  function rgba(hex, a) {
    var h = String(hex || "#000000").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," +
           (n & 255) + "," + clamp(a, 0, 1) + ")";
  }

  /* ---- the backdrop --------------------------------------------------------- */
  var STARS = null;
  function stars(ctx, w, h) {
    var P = pal();
    if (!STARS || STARS.w !== w || STARS.h !== h) {
      var seed = 20260101, pts = [];
      function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff;
                       return seed / 0x7fffffff; }
      for (var i = 0; i < 190; i++)
        pts.push({ x: rnd() * w, y: rnd() * h, r: rnd() * (w / 650) + 0.4,
                   a: rnd() * 0.5 + 0.12 });
      STARS = { w: w, h: h, pts: pts };
    }
    ctx.save();
    STARS.pts.forEach(function (s) {
      ctx.globalAlpha = s.a; ctx.fillStyle = P.star;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }
  function backdrop(ctx, sc, w, h) {
    var P = pal(), st = sc.bg.style;
    if (st === "none") { ctx.clearRect(0, 0, w, h); }
    else if (st === "flat") {
      ctx.fillStyle = sc.bg.hex || P.bg; ctx.fillRect(0, 0, w, h);
    } else if (st === "vignette") {
      ctx.fillStyle = sc.bg.hex || P.bg; ctx.fillRect(0, 0, w, h);
      var g = ctx.createRadialGradient(w / 2, h * 0.42, w * 0.08,
                                       w / 2, h * 0.42, w * 1.0);
      g.addColorStop(0, P.bg2); g.addColorStop(1, sc.bg.hex || P.bg);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    } else if (st === "radial") {
      var g2 = ctx.createRadialGradient(w / 2, h * 0.34, 0, w / 2, h * 0.34, h * 0.8);
      g2.addColorStop(0, P.bg2); g2.addColorStop(1, P.bg);
      ctx.fillStyle = g2; ctx.fillRect(0, 0, w, h);
    } else {
      var g3 = ctx.createLinearGradient(0, 0, 0, h);
      g3.addColorStop(0, P.bg); g3.addColorStop(1, P.bg2);
      ctx.fillStyle = g3; ctx.fillRect(0, 0, w, h);
    }
    if (sc.bg.stars && P.key !== "parchment") stars(ctx, w, h);
  }

  /* ---- effects --------------------------------------------------------------
     Most are one CSS filter string, which the browser runs on the GPU and
     which is therefore enormously cheaper than anything this file could do by
     hand with getImageData. The two that are not — grain and chromatic
     aberration — are done by drawing, and each is written to cost nothing
     when its amount is zero. */
  function filterFor(v) {
    var f = [];
    if (v.blur > 0.01) f.push("blur(" + v.blur.toFixed(2) + "px)");
    if (Math.abs(v.bright - 1) > 0.005) f.push("brightness(" + v.bright.toFixed(3) + ")");
    if (Math.abs(v.contrast - 1) > 0.005) f.push("contrast(" + v.contrast.toFixed(3) + ")");
    if (Math.abs(v.sat - 1) > 0.005) f.push("saturate(" + v.sat.toFixed(3) + ")");
    if (Math.abs(v.hue) > 0.5) f.push("hue-rotate(" + v.hue.toFixed(1) + "deg)");
    if (v.glow > 0.5) f.push("drop-shadow(0 0 " + v.glow.toFixed(1) + "px " +
                             rgba(pal().glow, 0.9) + ")");
    return f.length ? f.join(" ") : "none";
  }
  /* A seeded grain, so it does not crawl between frames at the same time but
     does differ between times — a still grain is a texture, a random one is
     noise, and the one people actually want is a slow one. */
  var GRAIN = {};
  function grainTile(size, seed) {
    var k = size + ":" + seed;
    if (GRAIN[k]) return GRAIN[k];
    var cv = document.createElement("canvas");
    cv.width = cv.height = size;
    var c = cv.getContext("2d");
    var img = c.createImageData(size, size), d = img.data;
    var s = seed * 2654435761 % 2147483647;
    function rnd() { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }
    for (var i = 0; i < d.length; i += 4) {
      var v = 110 + rnd() * 90;
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    if (Object.keys(GRAIN).length > 12) GRAIN = {};
    GRAIN[k] = cv;
    return cv;
  }
  function applyGrain(ctx, w, h, amt, t) {
    if (amt <= 0.004) return;
    var tile = grainTile(128, 1 + (Math.floor(t * 8) % 6));
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = clamp(amt * 0.55, 0, 1);
    var p = ctx.createPattern(tile, "repeat");
    ctx.fillStyle = p; ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  function applyVignette(ctx, w, h, amt) {
    if (amt <= 0.004) return;
    var g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.30,
                                     w / 2, h / 2, Math.max(w, h) * 0.78);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0," + clamp(amt, 0, 1).toFixed(3) + ")");
    ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); ctx.restore();
  }
  /* Chromatic aberration: the red and blue channels drawn a little apart. Done
     with channel-isolating composites rather than per-pixel, so it costs three
     blits instead of a scan of four million bytes. */
  function chromatic(dst, src, w, h, px) {
    var r = borrowCv(w, h), c = r.cv.getContext("2d");
    c.clearRect(0, 0, w, h);
    c.globalCompositeOperation = "source-over";
    c.drawImage(src, 0, 0);
    dst.save();
    dst.globalCompositeOperation = "lighter";
    dst.globalAlpha = 0.5;
    dst.drawImage(r.cv, -px, 0);
    dst.drawImage(r.cv, px, 0);
    dst.globalAlpha = 1;
    dst.globalCompositeOperation = "source-over";
    dst.restore();
    giveBack(r);
  }

  /* ---- masks ----------------------------------------------------------------
     A feathered mask is a gradient drawn in destination-in, which keeps the
     layer's own alpha where the gradient is opaque. The hard case is a rect
     with feather, where four edge gradients would show their corners; a
     single blur on the mask shape is simpler and is what the eye expects. */
  function applyMask(ctx, mk, w, h) {
    if (!mk) return;
    var x = mk.x * w, y = mk.y * h, mw = mk.w * w, mh = mk.h * h;
    var r = borrowCv(w, h), c = r.cv.getContext("2d");
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, w, h);
    c.save();
    if (mk.feather > 0.001) c.filter = "blur(" + (mk.feather * Math.min(w, h) * 0.12).toFixed(1) + "px)";
    c.fillStyle = "#fff";
    if (mk.rot) {
      c.translate(x + mw / 2, y + mh / 2);
      c.rotate(mk.rot * R2);
      c.translate(-(x + mw / 2), -(y + mh / 2));
    }
    if (mk.shape === "ellipse") {
      c.beginPath();
      c.ellipse(x + mw / 2, y + mh / 2, mw / 2, mh / 2, 0, 0, Math.PI * 2);
      c.fill();
    } else if (mk.shape === "round") {
      roundRect(c, x, y, mw, mh, Math.min(mw, mh) * 0.12); c.fill();
    } else {
      c.fillRect(x, y, mw, mh);
    }
    c.restore();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = mk.invert ? "destination-out" : "destination-in";
    ctx.drawImage(r.cv, 0, 0);
    ctx.restore();
    giveBack(r);
  }
  function roundRect(c, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  /* ---- text, and its animators ---------------------------------------------
     A text animator reveals a line by character, word or line rather than
     fading the whole block, and that is the single effect that most separates
     a reel someone made from a slide someone exported. It needs per-character
     placement, so the line is measured once and each character drawn at its
     own offset with its own alpha — which is also how letter-spacing is
     implemented, since canvas has no tracking. */
  function fitSize(ctx, s, size, maxW, weight) {
    var f = size;
    for (var i = 0; i < 22; i++) {
      ctx.font = (weight || 600) + " " + Math.round(f) + "px " + SANS;
      if (ctx.measureText(s).width <= maxW) break;
      f *= 0.94;
    }
    return f;
  }
  function wrapRows(ctx, s, size, maxW, lines, weight) {
    var words = String(s == null ? "" : s).split(/\s+/), row = "", out = [];
    ctx.font = (weight || 600) + " " + Math.round(size) + "px " + SANS;
    for (var i = 0; i < words.length; i++) {
      var t = row ? row + " " + words[i] : words[i];
      if (ctx.measureText(t).width > maxW && row) { out.push(row); row = words[i]; }
      else row = t;
      if (out.length >= lines) break;
    }
    if (row && out.length < lines) out.push(row);
    return out;
  }
  /* progress of unit i of n, given an overall 0..1 and how much of the run is
     spent staggering rather than animating */
  function unitP(p, i, n, spread) {
    if (n <= 1) return clamp(p, 0, 1);
    var start = (i / n) * spread;
    var len = Math.max(0.0001, 1 - spread);
    return clamp((p - start) / len, 0, 1);
  }
  var ANIMATORS = {
    none:       { label: "All at once", unit: "line" },
    charFade:   { label: "Character by character", unit: "char" },
    charRise:   { label: "Characters rise", unit: "char" },
    charDrop:   { label: "Characters fall in", unit: "char" },
    charScale:  { label: "Characters pop", unit: "char" },
    charBlur:   { label: "Characters focus in", unit: "char" },
    typewriter: { label: "Typewriter", unit: "char" },
    wordFade:   { label: "Word by word", unit: "word" },
    wordRise:   { label: "Words rise", unit: "word" },
    lineRise:   { label: "Line by line", unit: "line" },
    wave:       { label: "Wave", unit: "char" }
  };
  function drawAnimatedLine(ctx, s, x, y, size, col, align, weight, p, kind, tracking) {
    ctx.font = (weight || 600) + " " + Math.round(size) + "px " + SANS;
    ctx.textBaseline = "middle";
    var A = ANIMATORS[kind] || ANIMATORS.none;
    var tr = (tracking || 0) * size;
    if (kind === "none" || kind === "lineRise") {
      ctx.textAlign = align || "center";
      if (tr === 0) { ctx.fillStyle = col; ctx.fillText(s, x, y); return; }
    }
    /* units: whole characters, or whole words that are drawn character-wise
       so tracking still applies */
    var units = A.unit === "word" ? String(s).split(/(\s+)/) : String(s).split("");
    var widths = units.map(function (u) { return ctx.measureText(u).width; });
    var total = 0;
    widths.forEach(function (w) { total += w; });
    total += tr * Math.max(0, units.length - 1);
    var startX = align === "left" ? x : (align === "right" ? x - total : x - total / 2);
    var n = units.length;
    var cx = startX;
    for (var i = 0; i < n; i++) {
      var u = units[i];
      if (u !== " " && u.trim() !== "") {
        var up = kind === "none" || kind === "lineRise"
          ? 1 : unitP(p, i, n, kind === "typewriter" ? 0.98 : 0.55);
        var a = 1, dy = 0, sc = 1, bl = 0;
        if (kind === "charFade" || kind === "wordFade") a = up;
        else if (kind === "charRise" || kind === "wordRise") { a = up; dy = (1 - up) * size * 0.55; }
        else if (kind === "charDrop") { a = up; dy = -(1 - up) * size * 0.55; }
        else if (kind === "charScale") { a = up; sc = 0.4 + 0.6 * up; }
        else if (kind === "charBlur") { a = up; bl = (1 - up) * size * 0.22; }
        else if (kind === "typewriter") { a = up >= 1 ? 1 : 0; }
        else if (kind === "wave") {
          a = up;
          dy = Math.sin((p * 3 - i / n * 1.6) * Math.PI * 2) * size * 0.12 * Math.min(1, up * 2);
        }
        if (a > 0.004) {
          ctx.save();
          ctx.globalAlpha = ctx.globalAlpha * a;
          if (bl > 0.1) ctx.filter = "blur(" + bl.toFixed(2) + "px)";
          ctx.fillStyle = col;
          ctx.textAlign = "left";
          if (sc !== 1) {
            ctx.translate(cx + widths[i] / 2, y + dy);
            ctx.scale(sc, sc);
            ctx.translate(-(cx + widths[i] / 2), -(y + dy));
          }
          ctx.fillText(u, cx, y + dy);
          ctx.restore();
        }
      }
      cx += widths[i] + tr;
    }
  }

  /* ---- drawing one layer's content into a rect ------------------------------ */
  function paint(ctx, L, px, t, v, w, h, report) {
    var P = pal(), m = mdl();
    if (L.kind === "view") {
      var B = window.SPStage.bagOf(L.sel, S.C);
      if (report && B.missing.length)
        B.missing.forEach(function (q) {
          report.missing.push({ layer: nameOf(L), label: q.label || q.id, why: q.why }); });
      var ip = clamp(v.inner, 0, 1);
      if (B.bag.almanac && B.bag.almanac.length) {
        var e = borrowCv(Math.max(32, Math.round(px.w)), Math.max(32, Math.round(px.h)));
        var c2 = e.cv.getContext("2d");
        c2.setTransform(1, 0, 0, 1, 0, 0);
        c2.clearRect(0, 0, e.cv.width, e.cv.height);
        try {
          window.SPAlmanac.draw(c2, e.cv.width, e.cv.height,
                                B.bag.almanac[0].v, ip, P, { foot: S.doc.handle });
        } catch (err) {}
        ctx.drawImage(e.cv, px.x, px.y, px.w, px.h);
        giveBack(e);
        if (report) report.used.push({ id: L.id, composer: "almanac" });
        return;
      }
      var st = { x: px.x, y: px.y, w: px.w, h: px.h,
                 cx: px.x + px.w / 2, cy: px.y + px.h / 2,
                 bandY: px.y + px.h * 0.88, bandH: px.h * 0.12, side: px.w * 0.05 };
      var got = borrowStage(ctx, w, h, w, function () {
        return kit().drawInto(B.bag, ip, st, S.C, L.force);
      });
      if (!got && report)
        report.empty.push({ id: L.id, name: nameOf(L),
          why: L.sel.length ? "nothing in this layer resolves at this moment"
                            : "this layer has no nodes in it" });
      else if (got && got.error && report)
        report.errors.push({ id: L.id, name: nameOf(L), why: got.error });
      else if (got && report) report.used.push({ id: L.id, composer: got.key });
      return;
    }

    if (L.kind === "text") {
      var str = expand(L.text);
      if (!str) return;
      var size = L.size * S.U;
      var rows = wrapRows(ctx, str, size, px.w, Math.max(1, L.lines), L.weight);
      /* a single line is allowed to shrink to fit; a block wraps instead,
         because shrinking a paragraph to fit a box makes it unreadable long
         before it makes it fit */
      if (rows.length === 1) size = fitSize(ctx, rows[0], size, px.w, L.weight);
      var lh = size * L.lineHeight;
      var used = rows.length;
      var top = L.valign === "top" ? px.y + size * 0.7
              : (L.valign === "bottom" ? px.y + px.h - lh * (used - 0.7)
              : px.y + px.h / 2 - lh * (used - 1) / 2);
      var x = L.align === "left" ? px.x
            : (L.align === "right" ? px.x + px.w : px.x + px.w / 2);
      var ap = L.animSeconds > 0.01
        ? clamp((t - windowA(L)) / L.animSeconds, 0, 1) : 1;
      for (var i = 0; i < rows.length; i++) {
        var rp = L.animator === "lineRise" ? unitP(ap, i, rows.length, 0.6) : ap;
        var dy = L.animator === "lineRise" ? (1 - rp) * size * 0.6 : 0;
        ctx.save();
        if (L.animator === "lineRise") ctx.globalAlpha = ctx.globalAlpha * rp;
        drawAnimatedLine(ctx, rows[i], x, top + i * lh + dy, size, colOf(L),
                         L.align, L.weight, rp, L.animator, L.tracking);
        ctx.restore();
      }
      return;
    }

    if (L.kind === "rule") {
      ctx.save();
      ctx.strokeStyle = ctx.fillStyle = colOf(L);
      var lw = Math.max(1, S.U * 0.0018);
      if (L.shape === "bar") ctx.fillRect(px.x, px.y, px.w, Math.max(1, px.h));
      else if (L.shape === "frame") { ctx.lineWidth = lw; ctx.strokeRect(px.x, px.y, px.w, px.h); }
      else if (L.shape === "round") { ctx.lineWidth = lw;
        roundRect(ctx, px.x, px.y, px.w, px.h, Math.min(px.w, px.h) * 0.08); ctx.stroke(); }
      else if (L.shape === "double") {
        ctx.lineWidth = lw; ctx.beginPath();
        ctx.moveTo(px.x, px.y); ctx.lineTo(px.x + px.w, px.y);
        ctx.moveTo(px.x, px.y + px.h); ctx.lineTo(px.x + px.w, px.y + px.h);
        ctx.stroke();
      } else {
        ctx.lineWidth = lw; ctx.beginPath();
        ctx.moveTo(px.x, px.y + px.h / 2); ctx.lineTo(px.x + px.w, px.y + px.h / 2);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    if (L.kind === "shape") {
      ctx.save();
      var cx = px.x + px.w / 2, cy = px.y + px.h / 2;
      var rx = px.w / 2, ry = px.h / 2;
      ctx.lineWidth = Math.max(1, S.U * 0.003);
      ctx.strokeStyle = ctx.fillStyle = colOf(L);
      ctx.beginPath();
      if (L.shape === "ring" || L.shape === "disc") {
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      } else if (L.shape === "star") {
        var n = Math.max(3, L.sides);
        for (var i2 = 0; i2 < n * 2; i2++) {
          var a2 = (i2 / (n * 2)) * Math.PI * 2 - Math.PI / 2;
          var f = i2 % 2 ? 0.45 : 1;
          var X = cx + Math.cos(a2) * rx * f, Y = cy + Math.sin(a2) * ry * f;
          if (i2) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
        }
        ctx.closePath();
      } else {
        var n2 = Math.max(3, L.sides);
        for (var i3 = 0; i3 < n2; i3++) {
          var a3 = (i3 / n2) * Math.PI * 2 - Math.PI / 2;
          var X2 = cx + Math.cos(a3) * rx, Y2 = cy + Math.sin(a3) * ry;
          if (i3) ctx.lineTo(X2, Y2); else ctx.moveTo(X2, Y2);
        }
        ctx.closePath();
      }
      if (L.shape === "disc" || L.shape === "solid") ctx.fill(); else ctx.stroke();
      ctx.restore();
      return;
    }

    if (L.kind === "wash") {
      ctx.save();
      var cl = colOf(L);
      if (L.shape === "vignette") {
        var g = ctx.createRadialGradient(px.x + px.w / 2, px.y + px.h / 2,
          Math.min(px.w, px.h) * 0.2, px.x + px.w / 2, px.y + px.h / 2,
          Math.max(px.w, px.h) * 0.75);
        g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, cl);
        ctx.fillStyle = g; ctx.fillRect(px.x, px.y, px.w, px.h);
      } else if (L.shape === "panel") {
        ctx.fillStyle = cl;
        roundRect(ctx, px.x, px.y, px.w, px.h, Math.min(px.w, px.h) * 0.045);
        ctx.fill();
        ctx.strokeStyle = P.gold; ctx.lineWidth = Math.max(1, S.U * 0.0014);
        ctx.globalAlpha = ctx.globalAlpha * 0.8;
        roundRect(ctx, px.x, px.y, px.w, px.h, Math.min(px.w, px.h) * 0.045);
        ctx.stroke();
      } else if (L.shape === "sweepV" || L.shape === "sweep") {
        var g2 = L.shape === "sweepV"
          ? ctx.createLinearGradient(px.x, px.y, px.x, px.y + px.h)
          : ctx.createLinearGradient(px.x, px.y, px.x + px.w, px.y);
        g2.addColorStop(0, cl); g2.addColorStop(1, rgba(L.hex2 || "#000000", 0));
        ctx.fillStyle = g2; ctx.fillRect(px.x, px.y, px.w, px.h);
      } else if (L.shape === "disc") {
        ctx.fillStyle = cl; ctx.beginPath();
        ctx.ellipse(px.x + px.w / 2, px.y + px.h / 2, px.w / 2, px.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = cl; ctx.fillRect(px.x, px.y, px.w, px.h);
      }
      ctx.restore();
      return;
    }

    if (L.kind === "band") {
      var head = expand(L.text), sb = expand(L.sub);
      if (!head && !sb) return;
      ctx.save();
      ctx.strokeStyle = P.gold; ctx.globalAlpha = ctx.globalAlpha * 0.55;
      ctx.lineWidth = Math.max(1, S.U * 0.0016);
      ctx.beginPath();
      ctx.moveTo(px.x + px.w * 0.26, px.y); ctx.lineTo(px.x + px.w * 0.74, px.y);
      ctx.stroke(); ctx.restore();
      var hp = L.animSeconds > 0.01
        ? clamp((t - windowA(L)) / L.animSeconds, 0, 1) : 1;
      if (head) {
        var hs = fitSize(ctx, head, S.U * 0.040, px.w * 0.96, 700);
        drawAnimatedLine(ctx, head, px.x + px.w / 2, px.y + px.h * 0.36, hs,
                         colOf(L), "center", 700, hp, L.animator, L.tracking);
      }
      if (sb) {
        var ss = fitSize(ctx, sb, S.U * 0.022, px.w * 0.96, 500);
        ctx.save(); ctx.globalAlpha = ctx.globalAlpha * clamp(hp * 1.4 - 0.3, 0, 1);
        ctx.fillStyle = P.dim; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.font = "500 " + Math.round(ss) + "px " + SANS;
        ctx.fillText(sb, px.x + px.w / 2, px.y + px.h * 0.76);
        ctx.restore();
      }
      return;
    }

    if (L.kind === "stamp") {
      var left = expand(L.text || "{date}  ·  {place}");
      var sz = L.size * S.U;
      ctx.save();
      ctx.textBaseline = "middle";
      ctx.fillStyle = colOf(L); ctx.textAlign = "left";
      ctx.font = "500 " + Math.round(fitSize(ctx, left, sz, px.w * 0.62, 500)) + "px " + SANS;
      ctx.fillText(left, px.x, px.y + px.h / 2);
      ctx.fillStyle = P.gold; ctx.textAlign = "right";
      ctx.font = "600 " + Math.round(sz) + "px " + SANS;
      ctx.fillText(S.doc.handle || "@Nirayana.Soft", px.x + px.w, px.y + px.h / 2);
      ctx.restore();
      return;
    }

    if (L.kind === "image" && L.src && L.src.__img) {
      var im = L.src.__img;
      if (im.complete && im.naturalWidth) {
        /* contain, so an image never arrives stretched */
        var ar = im.naturalWidth / im.naturalHeight, br = px.w / px.h;
        var dw = ar > br ? px.w : px.h * ar, dh = ar > br ? px.w / ar : px.h;
        ctx.drawImage(im, px.x + (px.w - dw) / 2, px.y + (px.h - dh) / 2, dw, dh);
      }
      return;
    }
  }

  function windowA(L) { return L.__wa || 0; }

  function nameOf(L) {
    if (L.name) return L.name;
    if (L.kind === "view") {
      if (!L.sel.length) return "Empty view";
      var n = window.SPNodes.byId(L.sel[0]);
      return (n ? n.label : L.sel[0]) + (L.sel.length > 1 ? " +" + (L.sel.length - 1) : "");
    }
    return L.kind.charAt(0).toUpperCase() + L.kind.slice(1);
  }

  /* text tokens, resolved at draw time against the live context */
  function expand(s) {
    if (!s) return "";
    if (!window.SPDirector) return s;
    return window.SPDirector.expand(s, S.C);
  }

  /* ---- one layer ------------------------------------------------------------ */
  function valuesOf(L, t) {
    var m = mdl(), v = {};
    m.PROP_ORDER.forEach(function (k) { v[k] = m.valueOf(L, k, t); });
    return v;
  }
  function needsScratch(L, v) {
    return L.blend !== "source-over" || !!L.mask ||
           v.blur > 0.01 || v.glow > 0.5 || v.chroma > 0.25 ||
           Math.abs(v.bright - 1) > 0.005 || Math.abs(v.contrast - 1) > 0.005 ||
           Math.abs(v.sat - 1) > 0.005 || Math.abs(v.hue) > 0.5 ||
           v.grain > 0.004 || v.reveal < 0.999;
  }

  function drawLayer(ctx, sc, L, t, w, h, report) {
    var m = mdl();
    if (!m.visible(sc, L)) return;
    var win = m.windowOf(L, sc);
    if (t < win.a - 1e-6 || t > win.b + 1e-6) return;
    L.__wa = win.a;
    var v = valuesOf(L, t);
    if (v.opacity <= 0.002) return;

    var px = { x: v.x / 100 * w, y: v.y / 100 * h,
               w: v.w / 100 * w, h: v.h / 100 * h };
    var cx = px.x + px.w / 2, cy = px.y + px.h / 2;
    var heavy = needsScratch(L, v);
    var ent = heavy ? borrowCv(w, h) : null;
    var target = heavy ? ent.cv.getContext("2d") : ctx;

    if (heavy) { target.setTransform(1, 0, 0, 1, 0, 0); }
    target.save();
    if (L.clip) { target.beginPath(); target.rect(px.x, px.y, px.w, px.h); target.clip(); }
    /* the transform, around the layer's own centre */
    target.translate(cx, cy);
    if (v.rot) target.rotate(v.rot * R2);
    if (v.skewX || v.skewY)
      target.transform(1, Math.tan(v.skewY * R2), Math.tan(v.skewX * R2), 1, 0, 0);
    if (v.scale !== 1) target.scale(v.scale, v.scale);
    target.translate(-cx, -cy);
    if (!heavy) target.globalAlpha = ctx.globalAlpha * clamp(v.opacity, 0, 1);
    paint(target, L, px, t, v, w, h, report);
    target.restore();

    if (!heavy) return;

    /* reveal is a wipe of the finished layer, so it cuts the effects too */
    if (v.reveal < 0.999) {
      target.save();
      target.setTransform(1, 0, 0, 1, 0, 0);
      target.globalCompositeOperation = "destination-in";
      var g = target.createLinearGradient(px.x, 0, px.x + px.w, 0);
      var r = clamp(v.reveal, 0, 1);
      g.addColorStop(0, "#fff");
      g.addColorStop(Math.max(0, r - 0.04), "#fff");
      g.addColorStop(Math.min(1, r), "rgba(255,255,255,0)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      target.fillStyle = g; target.fillRect(0, 0, w, h);
      target.restore();
    }
    if (v.grain > 0.004) applyGrain(target, w, h, v.grain, t);
    applyMask(target, L.mask, w, h);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = clamp(v.opacity, 0, 1);
    ctx.globalCompositeOperation = L.blend || "source-over";
    ctx.filter = filterFor(v);
    ctx.drawImage(ent.cv, 0, 0);
    ctx.filter = "none";
    if (v.chroma > 0.25) chromatic(ctx, ent.cv, w, h, v.chroma);
    ctx.restore();
    giveBack(ent);
  }

  /* ---- one scene ------------------------------------------------------------- */
  function drawScene(ctx, sc, t, w, h, report) {
    var m = mdl();
    backdrop(ctx, sc, w, h);
    var cam = m.cameraAt(sc, t);
    var camOn = Math.abs(cam.zoom - 1) > 0.001 || cam.panX || cam.panY || cam.rot;
    ctx.save();
    if (camOn) {
      ctx.translate(w / 2, h / 2);
      ctx.rotate(cam.rot * R2);
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-w / 2 + cam.panX / 100 * w, -h / 2 + cam.panY / 100 * h);
    }
    for (var i = 0; i < sc.layers.length; i++)
      drawLayer(ctx, sc, sc.layers[i], t, w, h, report);
    ctx.restore();
  }

  /* ---- transitions -----------------------------------------------------------
     Drawn OVER the join rather than lengthening it, so adding a dissolve does
     not retime every later scene. Both sides are rendered into scratch
     canvases and mixed; the cost is two scene renders for the half second a
     transition lasts, which is the honest price of a cross dissolve. */
  function drawTransition(ctx, d, idx, f, w, h, report) {
    var m = mdl();
    var a = d.scenes[idx], b = d.scenes[idx + 1];
    var tr = a.trans || { k: "dissolve", seconds: 0.5 };
    var k = tr.k;
    var ea = borrowCv(w, h), eb = borrowCv(w, h);
    var ca = ea.cv.getContext("2d"), cb = eb.cv.getContext("2d");
    ca.setTransform(1, 0, 0, 1, 0, 0); ca.clearRect(0, 0, w, h);
    cb.setTransform(1, 0, 0, 1, 0, 0); cb.clearRect(0, 0, w, h);
    drawScene(ca, a, a.seconds, w, h, null);
    drawScene(cb, b, 0, w, h, report);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    var e = m.ease(f, "inOut");
    if (k === "dissolve") {
      ctx.drawImage(ea.cv, 0, 0);
      ctx.globalAlpha = e; ctx.drawImage(eb.cv, 0, 0);
    } else if (k === "dip") {
      var col = tr.hex || pal().bg;
      if (f < 0.5) { ctx.drawImage(ea.cv, 0, 0); ctx.globalAlpha = f * 2; }
      else { ctx.drawImage(eb.cv, 0, 0); ctx.globalAlpha = (1 - f) * 2; }
      ctx.fillStyle = col; ctx.fillRect(0, 0, w, h);
    } else if (k === "flash") {
      ctx.drawImage(f < 0.5 ? ea.cv : eb.cv, 0, 0);
      ctx.globalAlpha = 1 - Math.abs(f - 0.5) * 2;
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h);
    } else if (k === "pushL" || k === "pushR" || k === "pushU") {
      var dx = k === "pushL" ? -w * e : (k === "pushR" ? w * e : 0);
      var dy = k === "pushU" ? -h * e : 0;
      ctx.drawImage(ea.cv, dx, dy);
      ctx.drawImage(eb.cv, dx + (k === "pushL" ? w : (k === "pushR" ? -w : 0)),
                           dy + (k === "pushU" ? h : 0));
    } else if (k === "wipeL" || k === "wipeU") {
      ctx.drawImage(ea.cv, 0, 0);
      ctx.save();
      ctx.beginPath();
      if (k === "wipeL") ctx.rect(w * (1 - e), 0, w * e, h);
      else ctx.rect(0, h * (1 - e), w, h * e);
      ctx.clip();
      ctx.drawImage(eb.cv, 0, 0);
      ctx.restore();
    } else if (k === "iris") {
      ctx.drawImage(ea.cv, 0, 0);
      ctx.save();
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, Math.max(w, h) * 0.78 * e, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(eb.cv, 0, 0);
      ctx.restore();
    } else if (k === "zoomBlur") {
      ctx.filter = "blur(" + (14 * Math.sin(f * Math.PI)).toFixed(1) + "px)";
      var z1 = 1 + 0.25 * e;
      ctx.save();
      ctx.translate(w / 2, h / 2); ctx.scale(z1, z1); ctx.translate(-w / 2, -h / 2);
      ctx.drawImage(ea.cv, 0, 0);
      ctx.restore();
      ctx.globalAlpha = e;
      var z2 = 1.25 - 0.25 * e;
      ctx.save();
      ctx.translate(w / 2, h / 2); ctx.scale(z2, z2); ctx.translate(-w / 2, -h / 2);
      ctx.drawImage(eb.cv, 0, 0);
      ctx.restore();
      ctx.filter = "none";
    } else if (k === "glitch") {
      ctx.drawImage(f < 0.5 ? ea.cv : eb.cv, 0, 0);
      var src = f < 0.5 ? eb.cv : ea.cv;
      var bands = 9, amp = (1 - Math.abs(f - 0.5) * 2) * w * 0.10;
      for (var i = 0; i < bands; i++) {
        var by = (i / bands) * h, bh = h / bands;
        var off = (((i * 97 + Math.floor(f * 60) * 31) % 13) / 13 - 0.5) * amp;
        ctx.globalAlpha = 0.85;
        ctx.drawImage(src, 0, by, w, bh, off, by, w, bh);
      }
    } else {
      ctx.drawImage(f < 0.5 ? ea.cv : eb.cv, 0, 0);
    }
    ctx.restore();
    giveBack(ea); giveBack(eb);
  }

  /* ---- the frame -------------------------------------------------------------- */
  function render(d, C, t, quiet) {
    var m = mdl();
    S.doc = d; S.C = C; S.t = t;
    var ctx = S.ctx, w = S.W, h = S.H;
    if (!ctx) return null;
    S.U = w;
    var report = quiet ? null : { used: [], missing: [], empty: [], errors: [] };
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.filter = "none";
    ctx.clearRect(0, 0, w, h);

    var cur = m.sceneAt(d, t);
    if (!cur) return report;
    /* is the playhead inside a transition into the NEXT scene? */
    var tr = cur.scene.trans || { k: "cut", seconds: 0 };
    var left = cur.scene.seconds - cur.local;
    var inTrans = cur.i < d.scenes.length - 1 && tr.k !== "cut" &&
                  tr.seconds > 0.01 && left < tr.seconds;
    if (inTrans) {
      drawTransition(ctx, d, cur.i, 1 - left / tr.seconds, w, h, report);
    } else {
      drawScene(ctx, cur.scene, cur.local, w, h, report);
    }

    /* the grade, over everything, which is what a grade is */
    var G = d.grade;
    if (G) {
      if (Math.abs(G.bright - 1) > 0.005 || Math.abs(G.contrast - 1) > 0.005 ||
          Math.abs(G.sat - 1) > 0.005 || Math.abs(G.hue) > 0.5) {
        var e = borrowCv(w, h), c2 = e.cv.getContext("2d");
        c2.setTransform(1, 0, 0, 1, 0, 0); c2.clearRect(0, 0, w, h);
        c2.drawImage(S.cv, 0, 0);
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.filter = "brightness(" + G.bright + ") contrast(" + G.contrast +
                     ") saturate(" + G.sat + ") hue-rotate(" + G.hue + "deg)";
        ctx.drawImage(e.cv, 0, 0);
        ctx.filter = "none";
        ctx.restore();
        giveBack(e);
      }
      applyVignette(ctx, w, h, G.vignette);
      applyGrain(ctx, w, h, G.grain, t);
    }
    if (report) report.scene = cur.i;
    return report;
  }

  /* ---- the overlay: guides, grid, handles --------------------------------------
     Called by the page after the frame and by nothing else, which is why none
     of it can reach an export. */
  var HANDLES = [
    { k: "nw", fx: 0, fy: 0, l: 1, t: 1 }, { k: "n", fx: 0.5, fy: 0, t: 1 },
    { k: "ne", fx: 1, fy: 0, r: 1, t: 1 }, { k: "e", fx: 1, fy: 0.5, r: 1 },
    { k: "se", fx: 1, fy: 1, r: 1, b: 1 }, { k: "s", fx: 0.5, fy: 1, b: 1 },
    { k: "sw", fx: 0, fy: 1, l: 1, b: 1 }, { k: "w", fx: 0, fy: 0.5, l: 1 }
  ];
  function overlay(d, t, pickedId) {
    var m = mdl(), ctx = S.ctx, w = S.W, h = S.H;
    if (!ctx) return;
    var P = pal();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";

    if (S.showGrid) {
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1;
      for (var i = 1; i < S.grid; i++) {
        var x = w * i / S.grid;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      var rows = Math.round(S.grid * h / w);
      for (var j = 1; j < rows; j++) {
        var y = h * j / rows;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
    }
    if (S.showGuides) {
      var G = m.SAFE[d.safe] || m.SAFE.instagram;
      if (G.top || G.bottom || G.left || G.right) {
        ctx.strokeStyle = "rgba(255,255,255,0.34)";
        ctx.setLineDash([Math.max(3, w * 0.012), Math.max(3, w * 0.009)]);
        ctx.lineWidth = Math.max(1, w * 0.0018);
        ctx.strokeRect(G.left * w, G.top * h,
                       w * (1 - G.left - G.right), h * (1 - G.top - G.bottom));
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.font = "600 " + Math.round(w * 0.017) + "px " + SANS;
        ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(G.label, G.left * w + w * 0.008, G.top * h + w * 0.008);
      }
    }
    if (pickedId) {
      var f = m.findLayer(d, pickedId);
      var cur = m.sceneAt(d, t);
      if (f && cur && f.scene === cur.scene) {
        var L = f.layer, lt = cur.local;
        var win = m.windowOf(L, cur.scene);
        var on = lt >= win.a - 1e-6 && lt <= win.b + 1e-6;
        var at = clamp(lt, win.a, win.b);
        var v = valuesOf(L, at);
        var px = { x: v.x / 100 * w, y: v.y / 100 * h,
                   w: v.w / 100 * w, h: v.h / 100 * h };
        ctx.save();
        ctx.translate(px.x + px.w / 2, px.y + px.h / 2);
        if (v.rot) ctx.rotate(v.rot * R2);
        ctx.translate(-(px.x + px.w / 2), -(px.y + px.h / 2));
        ctx.setLineDash([Math.max(2, w * 0.008), Math.max(2, w * 0.006)]);
        ctx.strokeStyle = on ? P.gold : P.mal;
        ctx.lineWidth = Math.max(1, w * 0.0022);
        ctx.strokeRect(px.x, px.y, px.w, px.h);
        ctx.setLineDash([]);
        var hs = Math.max(6, w * 0.018);
        HANDLES.forEach(function (q) {
          ctx.fillStyle = P.gold;
          ctx.fillRect(px.x + px.w * q.fx - hs / 2, px.y + px.h * q.fy - hs / 2, hs, hs);
        });
        ctx.restore();
        /* the path a keyframed position traces, which is the one thing about
           a motion you cannot see by scrubbing one frame at a time */
        var tx = L.tracks.x, ty = L.tracks.y;
        if ((tx && tx.length > 1) || (ty && ty.length > 1)) {
          ctx.save();
          ctx.strokeStyle = P.ben; ctx.globalAlpha = 0.85;
          ctx.lineWidth = Math.max(1, w * 0.0018);
          ctx.beginPath();
          for (var s2 = 0; s2 <= 48; s2++) {
            var tt = win.a + (win.b - win.a) * (s2 / 48);
            var vv = valuesOf(L, tt);
            var X = (vv.x + vv.w / 2) / 100 * w, Y = (vv.y + vv.h / 2) / 100 * h;
            if (s2) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
          }
          ctx.stroke();
          /* and a dot at each key, so a path can be read as timing */
          var keys = {};
          (tx || []).forEach(function (q) { keys[q.t.toFixed(3)] = 1; });
          (ty || []).forEach(function (q) { keys[q.t.toFixed(3)] = 1; });
          Object.keys(keys).forEach(function (kt) {
            var vv2 = valuesOf(L, +kt);
            ctx.fillStyle = P.ben;
            ctx.beginPath();
            ctx.arc((vv2.x + vv2.w / 2) / 100 * w, (vv2.y + vv2.h / 2) / 100 * h,
                    Math.max(2, w * 0.006), 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.restore();
        }
        if (!on) {
          ctx.fillStyle = P.mal;
          ctx.font = "600 " + Math.round(w * 0.020) + "px " + SANS;
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText("not on screen at this moment",
                       px.x + px.w / 2, px.y + px.h / 2);
        }
      }
    }
    ctx.restore();
  }

  /* ---- hit testing, in frame fractions ------------------------------------- */
  function hitTest(d, t, fx, fy, pickedId) {
    var m = mdl(), cur = m.sceneAt(d, t);
    if (!cur) return null;
    var sc = cur.scene, lt = cur.local, tol = 0.030;
    function rectOf(L) {
      var win = m.windowOf(L, sc);
      var v = valuesOf(L, clamp(lt, win.a, win.b));
      return { x: v.x / 100, y: v.y / 100, w: v.w / 100, h: v.h / 100 };
    }
    var P = pickedId ? m.findLayer(d, pickedId) : null;
    if (P && P.scene === sc && !P.layer.locked) {
      var R = rectOf(P.layer);
      for (var i = 0; i < HANDLES.length; i++) {
        var q = HANDLES[i];
        if (Math.abs(fx - (R.x + R.w * q.fx)) < tol &&
            Math.abs(fy - (R.y + R.h * q.fy)) < tol)
          return { id: P.layer.id, mode: q.k };
      }
      if (fx > R.x && fx < R.x + R.w && fy > R.y && fy < R.y + R.h)
        return { id: P.layer.id, mode: "move" };
    }
    for (var j = sc.layers.length - 1; j >= 0; j--) {
      var L = sc.layers[j];
      if (!m.visible(sc, L) || L.locked) continue;
      var win2 = m.windowOf(L, sc);
      if (lt < win2.a - 1e-6 || lt > win2.b + 1e-6) continue;
      var R2r = rectOf(L);
      if (fx > R2r.x && fx < R2r.x + R2r.w && fy > R2r.y && fy < R2r.y + R2r.h)
        return { id: L.id, mode: "pick" };
    }
    return null;
  }

  window.DPRender = {
    S: S, HANDLES: HANDLES, ANIMATORS: ANIMATORS,
    attach: function (cv) { S.cv = cv; S.ctx = cv.getContext("2d"); },
    resize: function (d) {
      var F = mdl().FORMATS[d.format] || mdl().FORMATS.reel;
      var q = clamp(S.quality, 0.2, 1);
      S.W = Math.round(F.w * q); S.H = Math.round(F.h * q); S.U = S.W;
      if (S.cv) { S.cv.width = S.W; S.cv.height = S.H; }
      STARS = null; POOL.length = 0;
    },
    /* run something at true export size, then put the preview size back */
    atFullSize: function (d, fn) {
      var q = S.quality;
      S.quality = 1; this.resize(d);
      try { return fn(); } finally { S.quality = q; this.resize(d); }
    },
    render: render, overlay: overlay, hitTest: hitTest,
    valuesOf: valuesOf, nameOf: nameOf, pal: pal, colOf: colOf,
    /* render into somebody else's canvas — the scene strip's thumbnails */
    renderTo: function (cv, w, h, d, C, t) {
      var keep = { cv: S.cv, ctx: S.ctx, W: S.W, H: S.H, U: S.U,
                   guides: S.showGuides, grid: S.showGrid };
      if (cv.width !== w) cv.width = w;
      if (cv.height !== h) cv.height = h;
      S.cv = cv; S.ctx = cv.getContext("2d"); S.W = w; S.H = h; S.U = w;
      S.showGuides = false; S.showGrid = false;
      var out = null;
      try { out = render(d, C, t, true); } catch (e) {}
      S.cv = keep.cv; S.ctx = keep.ctx; S.W = keep.W; S.H = keep.H; S.U = keep.U;
      S.showGuides = keep.guides; S.showGrid = keep.grid;
      return out;
    }
  };
})();

/* ===== Director Pro — getting it out ======================================

   FRAME-ACCURATE, NOT REAL-TIME. The obvious way to record a canvas is to
   play it and capture; the result is a reel whose length depends on how busy
   the machine was, which is a reel you cannot cut to music and cannot trust.
   So the stream's frame rate is zero and every frame is requested by hand:
   the playhead is set to i/fps, the frame is drawn, requestFrame() is called,
   and only then does i advance. A slow machine makes the export take longer.
   It does not make it shorter, and it does not drop a frame.

   This is the second implementation of that idea in the repository — Studio
   Pro's recorder is the first — and they cannot share code, because one is in
   the report bundle's world and this one is not. They are held together the
   same way everything else duplicated here is: a test asserts that a reel
   recorded at a stated length actually lasts it.

   AUDIO IS THE USER'S OWN FILE AND NEVER LEAVES THE MACHINE. It is read with
   a file input, decoded by the browser, routed through a gain node into a
   MediaStreamDestination, and that stream's audio track is added to the
   canvas stream. No upload, no fetch, no library. The one thing it cannot be
   is frame-accurate in the same sense as the video — an audio graph runs in
   real time — so the audio is played in real time while the video is driven
   by hand, and the recording lasts whichever is longer. In practice that
   means the audio path records at playback speed; the test asserts the
   duration either way.

   WHY MP4 IS TRIED FIRST. Safari and recent Chromium can write H.264 in an
   MP4 container, which posts straight to Instagram. WebM does not, and a
   person who records a reel and then discovers they must convert it has been
   let down by the tool. So the preference order is mp4, then vp9, then vp8,
   and what was actually used is reported rather than assumed. */

(function () {
  "use strict";

  var JOB = null;

  function pickMime(prefer) {
    var types = prefer === "webm"
      ? ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm",
         "video/mp4;codecs=avc1"]
      : ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9",
         "video/webm;codecs=vp8", "video/webm"];
    for (var i = 0; i < types.length; i++)
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(types[i]))
        return types[i];
    return "";
  }

  /* ---- the audio graph ------------------------------------------------------
     Built once per recording and torn down after, because an AudioContext
     left open holds the device awake and a second recording would otherwise
     stack a second source on the same element. */
  function audioTrack(doc, seconds) {
    if (!doc.audio || !doc.audio.__el) return null;
    var el = doc.audio.__el;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      var ac = new AC();
      var src = ac.createMediaElementSource(el);
      var gain = ac.createGain();
      var dest = ac.createMediaStreamDestination();
      var g = doc.audio.gain == null ? 1 : doc.audio.gain;
      gain.gain.value = g;
      src.connect(gain);
      gain.connect(dest);
      /* fades, scheduled rather than stepped, so they are sample-accurate */
      var now = ac.currentTime;
      if (doc.audio.fadeIn > 0.01) {
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(g, now + doc.audio.fadeIn);
      }
      if (doc.audio.fadeOut > 0.01) {
        gain.gain.setValueAtTime(g, now + Math.max(0, seconds - doc.audio.fadeOut));
        gain.gain.linearRampToValueAtTime(0.0001, now + seconds);
      }
      el.currentTime = doc.audio.start || 0;
      var p = el.play();
      if (p && p.catch) p.catch(function () {});
      return { track: dest.stream.getAudioTracks()[0], ac: ac, el: el };
    } catch (e) { return null; }
  }

  /* ---- the recording --------------------------------------------------------- */
  function record(doc, C, opts, onFrame) {
    opts = opts || {};
    var fps = Math.max(1, opts.fps || doc.fps || 30);
    var seconds = window.DPModel.total(doc);
    var R = window.DPRender;
    return new Promise(function (resolve, reject) {
      var stream;
      try { stream = R.S.cv.captureStream(0); }
      catch (e) { reject(new Error("this browser cannot capture a canvas")); return; }
      var vt = stream.getVideoTracks()[0];
      if (!vt || !vt.requestFrame) {
        reject(new Error("this browser cannot drive frames one at a time"));
        return;
      }
      var mime = pickMime(opts.container);
      if (!mime) { reject(new Error("no supported recording format")); return; }

      var A = opts.withAudio === false ? null : audioTrack(doc, seconds);
      if (A && A.track) { try { stream.addTrack(A.track); } catch (e) {} }

      var rec, chunks = [];
      try {
        rec = new MediaRecorder(stream, { mimeType: mime,
          videoBitsPerSecond: Math.round((opts.mbps || doc.quality || 12) * 1000000),
          audioBitsPerSecond: 192000 });
      } catch (e) { reject(e); return; }

      var job = { cancel: false };
      JOB = job;
      var total = Math.max(2, Math.round(seconds * fps)), i = 0;
      function teardown() {
        if (A) {
          try { A.el.pause(); } catch (e) {}
          try { A.ac.close(); } catch (e) {}
        }
      }
      rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = function () {
        JOB = null; teardown();
        resolve({ blob: new Blob(chunks, { type: mime }), mime: mime,
                  seconds: seconds, frames: total, fps: fps,
                  cancelled: job.cancel, hadAudio: !!(A && A.track),
                  madeSeconds: Math.min(i, total) / fps,
                  width: R.S.W, height: R.S.H });
      };
      rec.start();
      function step() {
        if (job.cancel || i > total) { try { rec.stop(); } catch (e) {} return; }
        var t = (i / total) * seconds;
        try { R.render(doc, C, t, true); } catch (e) {}
        try { vt.requestFrame(); } catch (e) {}
        if (onFrame) onFrame(i / total, i, total);
        i++;
        /* a timeout rather than rAF: rAF is throttled in a background tab, and
           a reel recorded while its author looked at another tab would be a
           reel that stops in the middle */
        setTimeout(step, Math.max(2, 1000 / fps / 6));
      }
      step();
    });
  }

  /* ---- a sequence of stills --------------------------------------------------
     For anyone who wants to take the frames into a real editor. Zipping needs
     a library, and a library needs a network, so the frames are handed over
     one at a time with a stated name — slower to save, but it works with
     nothing installed and nothing fetched. */
  function frames(doc, C, opts, onFrame) {
    opts = opts || {};
    var fps = Math.max(1, opts.fps || 6);
    var seconds = window.DPModel.total(doc);
    var total = Math.max(1, Math.round(seconds * fps));
    var R = window.DPRender;
    var out = [];
    var job = { cancel: false };
    JOB = job;
    return new Promise(function (resolve) {
      var i = 0;
      function step() {
        if (job.cancel || i >= total) { JOB = null; resolve(out); return; }
        R.render(doc, C, (i / total) * seconds, true);
        R.S.cv.toBlob(function (b) {
          out.push({ name: "frame-" + String(i).padStart(4, "0") + ".png", blob: b });
          if (onFrame) onFrame((i + 1) / total, i + 1, total);
          i++;
          setTimeout(step, 0);
        }, "image/png");
      }
      step();
    });
  }

  function still(doc, C, t) {
    var R = window.DPRender;
    return new Promise(function (resolve) {
      R.atFullSize(doc, function () { R.render(doc, C, t, true); });
      R.S.cv.toBlob(function (b) { resolve(b); }, "image/png");
    });
  }

  function save(blob, name) {
    var u = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = u; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 8000);
  }

  window.DPExport = {
    record: record, frames: frames, still: still, save: save,
    isBusy: function () { return !!JOB; },
    cancel: function () { if (JOB) JOB.cancel = true; },
    pickMime: pickMime,
    /* what this browser can actually do, so the page can say so rather than
       offering a button that fails */
    can: function () {
      var cv = document.createElement("canvas");
      return { capture: typeof cv.captureStream === "function",
               recorder: !!window.MediaRecorder,
               mp4: !!(window.MediaRecorder &&
                       MediaRecorder.isTypeSupported("video/mp4;codecs=avc1")),
               audio: !!(window.AudioContext || window.webkitAudioContext) };
    }
  };
})();

/* ===== Director Pro — the workstation =====================================

   THE RULE THIS FILE IS WRITTEN UNDER, restated because it is the one that
   was learned the hard way: NOTHING ON THE FRAME PATH TOUCHES THE DOM. A
   panel rebuild is an innerHTML churn and a forced layout; doing it sixty
   times a second on a page this size blocks the main thread in quarter-second
   chunks, and the symptom is not "it feels slow", it is that buttons stop
   responding entirely because the taps never become clicks. So:

     tick()      → sets the playhead, draws the canvas, and writes at most two
                   single attributes a few times a second
     change()    → the document changed: redraw once, rebuild the parts of the
                   panel that are now wrong
     refreshAll()→ everything, on load and on a document swap

   UNDO IS SNAPSHOTS, NOT COMMANDS. A command stack is better in every way
   except the one that matters here: every one of forty operations would have
   to implement its own inverse correctly, and the first one that did not
   would corrupt a document silently. A document is a few tens of kilobytes of
   JSON; fifty snapshots is a megabyte and nobody notices. Correctness beats
   elegance when the failure mode is losing somebody's work.

   THE TIMELINE IS THE DOCUMENT. Scenes along the top, one row per layer, and
   under an opened layer one row per animated property with a diamond at each
   key. That is the whole model made visible — if a thing moves, there is a
   diamond that says why, and dragging it is how you change it. */

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  var M = null, R = null;

  /* ---- state ------------------------------------------------------------- */
  var DOC = null;
  var C = null;                 /* the astronomical context */
  var PLACE = null;
  var PICK = null;              /* picked layer id */
  var SCENE = 0;                /* the scene being edited */
  var T = 0;                    /* playhead, seconds into the reel */
  var PLAY = false, RAF = null, T0 = 0;
  var OPEN = {};                /* which layers show their property rows */
  var UNDO = [], REDO = [];
  var DRAG = null;
  var LAST = null;
  var SNAP = true;

  /* ================= context ============================================== */
  function readBirth() {
    try {
      var b = JSON.parse(localStorage.getItem("nirayana.birth") || "null");
      return (b && b.lat != null) ? b : null;
    } catch (e) { return null; }
  }
  function defaultPlace(b) {
    if (PLACE) return PLACE;
    try {
      if (window.NP && window.NP.savedPlace) {
        var s = window.NP.savedPlace();
        if (s && s.lat != null) return { n: s.n || s.name || "saved place",
          lat: s.lat, lon: s.lon, tz: s.tz };
      }
    } catch (e) {}
    if (b && b.lat != null)
      return { n: b.place || b.name || "your chart's place", lat: b.lat,
               lon: b.lon, tz: b.tzHours };
    return { n: "Delhi", lat: 28.6139, lon: 77.209, tz: 5.5 };
  }
  function buildContext(whenMs) {
    var b = readBirth(), J = null;
    if (b && window.buildLocalChart) {
      try { J = window.buildLocalChart(b); } catch (e) { J = null; }
    }
    var place = defaultPlace(b);
    var when = whenMs || (C ? C.when : Date.now());
    var day = null;
    try { if (window.NP && window.NP.day) day = window.NP.day(when, place); }
    catch (e) {}
    var sp = $("dp-span");
    return { J: J, when: when, place: place, day: day,
             spanDays: sp ? +sp.value : 365, birth: b };
  }

  /* ================= undo ================================================== */
  function snapshot() { return JSON.stringify(DOC); }
  function mark() {
    UNDO.push(snapshot());
    if (UNDO.length > 60) UNDO.shift();
    REDO.length = 0;
    syncUndo();
  }
  function undo() {
    if (!UNDO.length) return;
    REDO.push(snapshot());
    DOC = M.doc(JSON.parse(UNDO.pop()));
    rebindMedia();
    refreshAll();
  }
  function redo() {
    if (!REDO.length) return;
    UNDO.push(snapshot());
    DOC = M.doc(JSON.parse(REDO.pop()));
    rebindMedia();
    refreshAll();
  }
  function syncUndo() {
    var u = $("dp-undo"), r = $("dp-redo");
    if (u) u.disabled = !UNDO.length;
    if (r) r.disabled = !REDO.length;
  }
  /* An audio element and an Image are live objects; JSON.stringify drops
     them, which is right — they are not the document. After a snapshot round
     trip the references have to be put back from the object URLs the page
     still holds, or an undo would silently detach the soundtrack. */
  var MEDIA = { audioEl: null, audioName: null, images: {} };
  function rebindMedia() {
    if (DOC.audio && MEDIA.audioEl) DOC.audio.__el = MEDIA.audioEl;
    DOC.scenes.forEach(function (s) {
      s.layers.forEach(function (L) {
        if (L.kind === "image" && L.src && L.src.id && MEDIA.images[L.src.id])
          L.src.__img = MEDIA.images[L.src.id];
      });
    });
  }

  /* ================= drawing =============================================== */
  /* the frame path — canvas only */
  function drawFrame() {
    if (!R || !DOC || !C) return;
    LAST = R.render(DOC, C, T, true);
    R.overlay(DOC, T, PICK);
  }
  function draw() {
    if (!R || !DOC || !C) return;
    LAST = R.render(DOC, C, T, false);
    R.overlay(DOC, T, PICK);
  }
  function change(deep) {
    draw();
    if (deep) { stack(); scenes(); }
    timeline(); inspector(); status();
    persist();
  }
  function refreshAll() {
    fitStage();
    draw();
    topbar(); scenes(); stack(); timeline(); inspector(); status(); syncUndo();
  }

  /* ================= the stage ============================================= */
  function fitStage() {
    var box = $("dp-stagebox"), cv = $("dp-canvas");
    if (!box || !cv || !R) return;
    var F = M.FORMATS[DOC.format] || M.FORMATS.reel;
    var bw = box.clientWidth || 360;
    var bh = box.clientHeight || 640;
    var scale = Math.min(bw / F.w, bh / F.h);
    var w = Math.max(80, Math.floor(F.w * scale));
    var h = Math.max(80, Math.floor(F.h * scale));
    cv.style.width = w + "px";
    cv.style.height = h + "px";
    /* render at about the size it is shown at, never at export size — the
       preview of a 4K reel at 4K is sixteen times the pixels anyone can see */
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var want = clamp((w * dpr) / F.w, 0.2, 1);
    if (Math.abs(want - R.S.quality) > 0.04) {
      R.S.quality = want;
      R.resize(DOC);
    }
  }

  /* ================= the top bar =========================================== */
  function topbar() {
    var host = $("dp-top");
    if (!host) return;
    host.innerHTML = "";
    var nm = el("input", "dptitle");
    nm.type = "text"; nm.value = DOC.name;
    nm.setAttribute("aria-label", "The name of this reel");
    nm.addEventListener("change", function () { DOC.name = nm.value; persist(); });
    host.appendChild(nm);

    function pick(label, opts, value, onSet, cls) {
      var w = el("label", "dpfield" + (cls ? " " + cls : ""));
      w.appendChild(el("span", null, label));
      var s = el("select");
      opts.forEach(function (o) {
        var op = el("option", null, o.label);
        op.value = o.v;
        if (String(o.v) === String(value)) op.selected = true;
        s.appendChild(op);
      });
      s.addEventListener("change", function () { onSet(s.value); });
      w.appendChild(s);
      host.appendChild(w);
      return s;
    }
    pick("Format", Object.keys(M.FORMATS).map(function (k) {
      return { v: k, label: M.FORMATS[k].label }; }), DOC.format, function (v) {
      mark(); DOC.format = v; R.resize(DOC); refreshAll(); });
    pick("Frames", [{ v: 24, label: "24 fps" }, { v: 25, label: "25 fps" },
                    { v: 30, label: "30 fps" }, { v: 50, label: "50 fps" },
                    { v: 60, label: "60 fps" }], DOC.fps, function (v) {
      DOC.fps = +v; persist(); status(); });
    pick("Guides", Object.keys(M.SAFE).map(function (k) {
      return { v: k, label: M.SAFE[k].label }; }), DOC.safe, function (v) {
      DOC.safe = v; change(); });
    pick("Palette", Object.keys(window.SPStage.PALS).map(function (k) {
      return { v: k, label: window.SPStage.PALS[k].label }; }), DOC.pal,
      function (v) { mark(); DOC.pal = v; change(true); });

    var g = el("label", "dpcheck"), gi = el("input");
    gi.type = "checkbox"; gi.checked = R.S.showGrid;
    gi.addEventListener("change", function () { R.S.showGrid = gi.checked; draw(); });
    g.appendChild(gi); g.appendChild(document.createTextNode(" grid"));
    host.appendChild(g);

    var sn = el("label", "dpcheck"), si = el("input");
    si.type = "checkbox"; si.checked = SNAP;
    si.addEventListener("change", function () { SNAP = si.checked; });
    sn.appendChild(si); sn.appendChild(document.createTextNode(" snap"));
    host.appendChild(sn);

    var sp = el("span", "dpspacer");
    host.appendChild(sp);

    var u = el("button", "dpbtn", "↶"); u.type = "button"; u.id = "dp-undo";
    u.title = "Undo"; u.addEventListener("click", undo);
    var r = el("button", "dpbtn", "↷"); r.type = "button"; r.id = "dp-redo";
    r.title = "Redo"; r.addEventListener("click", redo);
    host.appendChild(u); host.appendChild(r);
    syncUndo();
  }

  /* ================= the scene strip ======================================= */
  function scenes() {
    var host = $("dp-scenes");
    if (!host) return;
    host.innerHTML = "";
    DOC.scenes.forEach(function (s, i) {
      var b = el("div", "dpscene" + (i === SCENE ? " on" : ""));
      var cv = el("canvas", "dpthumb");
      cv.width = 72; cv.height = Math.round(72 * (M.FORMATS[DOC.format].h /
                                                  M.FORMATS[DOC.format].w));
      b.appendChild(cv);
      try { R.renderTo(cv, cv.width, cv.height, DOC, C, M.sceneStart(DOC, i) + s.seconds * 0.6); }
      catch (e) {}
      var meta = el("div", "dpscenemeta");
      meta.appendChild(el("b", null, s.name));
      meta.appendChild(el("span", null, s.seconds.toFixed(1) + " s · " +
                          s.layers.length + " layers"));
      meta.appendChild(el("span", "dptrans",
        (M.TRANSITIONS[s.trans.k] || { label: "Cut" }).label +
        (i === DOC.scenes.length - 1 ? " (last)" : "")));
      b.appendChild(meta);
      b.addEventListener("click", function () {
        SCENE = i;
        T = M.sceneStart(DOC, i) + 0.001;
        PICK = null;
        refreshAll();
      });
      host.appendChild(b);
    });
    var add = el("button", "dpaddscene", "+ scene");
    add.type = "button";
    add.addEventListener("click", function () {
      mark();
      DOC.scenes.push(M.scene({ name: "Scene " + (DOC.scenes.length + 1) }));
      SCENE = DOC.scenes.length - 1;
      T = M.sceneStart(DOC, SCENE) + 0.001;
      refreshAll();
    });
    host.appendChild(add);
  }

  /* ================= the layer stack ======================================= */
  function cur() { return DOC.scenes[SCENE]; }
  function curLayer() {
    if (!PICK) return null;
    var f = M.findLayer(DOC, PICK);
    return f ? f.layer : null;
  }

  function stack() {
    var host = $("dp-stack");
    if (!host) return;
    host.innerHTML = "";
    var s = cur();
    if (!s) return;
    if (!s.layers.length) {
      host.appendChild(el("p", "dpempty", "No layers in this scene yet."));
      return;
    }
    for (var i = s.layers.length - 1; i >= 0; i--) {
      (function (L) {
        var row = el("div", "dplayer" + (L.id === PICK ? " on" : "") +
                              (L.hidden ? " off" : ""));
        function mini(txt, title, on, fn) {
          var b = el("button", "dpmini" + (on ? " on" : ""), txt);
          b.type = "button"; b.title = title;
          b.addEventListener("click", function (e) { e.stopPropagation(); fn(); });
          row.appendChild(b);
          return b;
        }
        mini(L.hidden ? "◻" : "◼", L.hidden ? "Hidden" : "Visible", false,
             function () { mark(); L.hidden = !L.hidden; change(true); });
        mini("S", "Solo — show only the soloed layers", L.solo,
             function () { mark(); L.solo = !L.solo; change(true); });
        mini(L.locked ? "🔒" : "🔓", L.locked ? "Locked" : "Unlocked", L.locked,
             function () { mark(); L.locked = !L.locked; change(true); });
        var nm = el("button", "dpname");
        nm.type = "button";
        nm.appendChild(el("span", "dpkind", L.kind));
        nm.appendChild(el("span", "dpnametxt", R.nameOf(L)));
        nm.addEventListener("click", function () { PICK = L.id; change(true); });
        row.appendChild(nm);
        mini("↑", "Bring forward", false, function () { moveLayer(L.id, 1); });
        mini("↓", "Send back", false, function () { moveLayer(L.id, -1); });
        mini("⧉", "Duplicate", false, function () { dupLayer(L.id); });
        mini("×", "Delete", false, function () { delLayer(L.id); });
        host.appendChild(row);
      })(s.layers[i]);
    }
  }
  function moveLayer(id, d) {
    var f = M.findLayer(DOC, id); if (!f) return;
    mark();
    var j = clamp(f.li + d, 0, f.scene.layers.length - 1);
    if (j === f.li) { UNDO.pop(); return; }
    var L = f.scene.layers.splice(f.li, 1)[0];
    f.scene.layers.splice(j, 0, L);
    change(true);
  }
  function dupLayer(id) {
    var f = M.findLayer(DOC, id); if (!f) return;
    mark();
    var copy = M.layer(JSON.parse(JSON.stringify(f.layer)));
    copy.id = M.uid("L");
    copy.name = (f.layer.name || R.nameOf(f.layer)) + " copy";
    copy.base.x += 3; copy.base.y += 3;
    f.scene.layers.splice(f.li + 1, 0, copy);
    PICK = copy.id;
    change(true);
  }
  function delLayer(id) {
    var f = M.findLayer(DOC, id); if (!f) return;
    mark();
    f.scene.layers.splice(f.li, 1);
    if (PICK === id) PICK = null;
    change(true);
  }
  function addLayer(o, quiet) {
    mark();
    var s = cur();
    var L = M.layer(o);
    if (L.t1 === 0) L.t1 = s.seconds;
    s.layers.push(L);
    PICK = L.id;
    if (!quiet) change(true);
    return L;
  }

  /* ================= adding things ========================================= */
  function addBar() {
    var host = $("dp-add");
    if (!host) return;
    host.innerHTML = "";
    function b(label, fn, title) {
      var x = el("button", "dpbtn", label);
      x.type = "button";
      if (title) x.title = title;
      x.addEventListener("click", fn);
      host.appendChild(x);
    }
    b("+ View", function () {
      var sel = pickedNodes();
      if (!sel.length) { flash("Choose something in the library first."); return; }
      addLayer({ kind: "view", sel: sel, base: { x: 8, y: 16, w: 84, h: 46 } });
      var L = curLayer();
      M.applyEntry(L, cur(), "rise", 0.6);
      change(true);
    }, "The chosen nodes, drawn by the best composer for them");
    b("+ Text", function () {
      addLayer({ kind: "text", text: "Your line here", size: 0.044, lines: 2,
                 col: "ink", animator: "charRise", animSeconds: 1.0,
                 base: { x: 8, y: 68, w: 84, h: 12 } });
      change(true);
    });
    b("+ Band", function () {
      addLayer({ kind: "band", text: "{tithi}", sub: "{naks}  ·  {place}",
                 col: "gold", animator: "wordFade", animSeconds: 0.9,
                 base: { x: 8, y: 76, w: 84, h: 11 } });
      change(true);
    });
    b("+ Stamp", function () {
      addLayer({ kind: "stamp", text: "{date}  ·  {place}", size: 0.019,
                 col: "dim", base: { x: 8, y: 92, w: 84, h: 4 } });
      change(true);
    });
    b("+ Shape", function () {
      addLayer({ kind: "shape", shape: "ring", col: "gold",
                 base: { x: 20, y: 28, w: 60, h: 34 } });
      change(true);
    });
    b("+ Rule", function () {
      addLayer({ kind: "rule", shape: "line", col: "gold",
                 base: { x: 30, y: 30, w: 40, h: 0.4 } });
      change(true);
    });
    b("+ Wash", function () {
      addLayer({ kind: "wash", shape: "panel", col: "line",
                 base: { x: 6, y: 12, w: 88, h: 60, opacity: 0.35 } });
      change(true);
    });
  }

  /* ================= the node library ====================================== */
  var LIBSEL = [];
  function pickedNodes() { return LIBSEL.slice(); }
  function library() {
    var host = $("dp-lib");
    if (!host) return;
    var q = ($("dp-libsearch") || {}).value || "";
    var only = ($("dp-liblive") || {}).checked;
    q = q.toLowerCase().trim();
    host.innerHTML = "";
    var doms = {}, shown = 0;
    window.SPNodes.all().forEach(function (n) {
      var hay = (n.label + " " + n.dom + " " + n.id + " " + (n.blurb || "")).toLowerCase();
      if (q && hay.indexOf(q) < 0) return;
      var v = window.SPNodes.resolve(n, C);
      if (only && !v) return;
      (doms[n.dom] = doms[n.dom] || []).push({ n: n, live: !!v });
      shown++;
    });
    Object.keys(doms).forEach(function (d) {
      var g = el("div", "dplibgroup");
      g.appendChild(el("h5", null, d));
      var wrap = el("div", "dplibchips");
      doms[d].forEach(function (q2) {
        var c = el("button", "dpchip" + (LIBSEL.indexOf(q2.n.id) >= 0 ? " on" : "") +
                               (q2.live ? "" : " off"), q2.n.label);
        c.type = "button";
        c.title = q2.n.blurb || q2.n.label;
        c.addEventListener("click", function () {
          var i = LIBSEL.indexOf(q2.n.id);
          if (i >= 0) LIBSEL.splice(i, 1); else LIBSEL.push(q2.n.id);
          library();
          var L = curLayer();
          if (L && L.kind === "view" && $("dp-liblink").checked) {
            mark(); L.sel = LIBSEL.slice(); change(true);
          }
          libStat();
        });
        wrap.appendChild(c);
      });
      g.appendChild(wrap);
      host.appendChild(g);
    });
    libStat(shown);
  }
  function libStat(shown) {
    var s = $("dp-libstat");
    if (!s) return;
    s.textContent = LIBSEL.length + " chosen" +
      (shown != null ? "  ·  " + shown + " shown" : "");
  }

  /* ================= the inspector ========================================= */
  function field(host, label, node) {
    var r = el("div", "dprow");
    r.appendChild(el("span", "dplab", label));
    r.appendChild(node);
    host.appendChild(r);
    return r;
  }
  function selectEl(opts, value, onSet) {
    var s = el("select");
    opts.forEach(function (o) {
      var op = el("option", null, o.label);
      op.value = o.v;
      if (String(o.v) === String(value)) op.selected = true;
      s.appendChild(op);
    });
    s.addEventListener("change", function () { onSet(s.value); });
    return s;
  }
  function numEl(value, min, max, step, onSet) {
    var i = el("input");
    i.type = "number"; i.value = value; i.min = min; i.max = max; i.step = step;
    i.addEventListener("change", function () {
      var v = parseFloat(i.value);
      if (!isNaN(v)) onSet(clamp(v, min, max));
    });
    return i;
  }
  function textEl(value, onSet, place) {
    var i = el("input");
    i.type = "text"; i.value = value || "";
    if (place) i.placeholder = place;
    i.addEventListener("input", function () { onSet(i.value); });
    return i;
  }

  /* A property row: the stopwatch, the slider, the number, and the key
     navigation. The stopwatch is the whole idea of a keyframe tool in one
     control — off, the value is constant; on, the value at this instant
     becomes a key and every later change writes another. */
  function propRow(host, L, k) {
    var P = M.PROPS[k];
    var s = cur(), lt = localT();
    var tr = L.tracks[k];
    var animated = tr.length > 0;
    var v = M.valueOf(L, k, lt);
    var row = el("div", "dpprop" + (animated ? " anim" : ""));

    var sw = el("button", "dpstop" + (animated ? " on" : ""), animated ? "◆" : "◇");
    sw.type = "button";
    sw.title = animated ? "Animated — click to remove every key on this property"
                        : "Click to animate this property from here";
    sw.addEventListener("click", function () {
      mark();
      if (animated) { L.tracks[k] = []; L.base[k] = v; }
      else { M.setKey(L.tracks[k], lt, v, "smooth"); }
      change(true);
    });
    row.appendChild(sw);
    row.appendChild(el("span", "dpproplab", P.label));

    var sl = el("input", "dpslider");
    sl.type = "range"; sl.min = P.min; sl.max = P.max; sl.step = P.step;
    sl.value = v;
    var nm = numEl(round(v, 2), P.min, P.max, P.step, function (x) { set(x); });
    nm.className = "dppropnum";
    function set(x) {
      if (!L.tracks[k].length) L.base[k] = x;
      else M.setKey(L.tracks[k], lt, x, "smooth");
      sl.value = x; nm.value = round(x, 2);
      draw();
      scheduleTimeline();
    }
    sl.addEventListener("input", function () { set(parseFloat(sl.value)); });
    sl.addEventListener("pointerdown", function () { mark(); });
    row.appendChild(sl);
    row.appendChild(nm);
    if (P.unit) row.appendChild(el("span", "dpunit", P.unit));

    if (animated) {
      var kb = el("button", "dpmini", "+");
      kb.type = "button"; kb.title = "Key this value at the playhead";
      kb.addEventListener("click", function () {
        mark(); M.setKey(L.tracks[k], lt, v, "smooth"); change(true); });
      row.appendChild(kb);
    }
    host.appendChild(row);
  }
  function round(v, n) {
    var p = Math.pow(10, n);
    return Math.round(v * p) / p;
  }
  /* the playhead within the current scene */
  function localT() {
    var at = M.sceneAt(DOC, T);
    if (!at) return 0;
    if (at.i !== SCENE) return clamp(T - M.sceneStart(DOC, SCENE), 0, cur().seconds);
    return at.local;
  }

  function inspector() {
    var host = $("dp-insp");
    if (!host) return;
    host.innerHTML = "";
    var s = cur();
    var L = curLayer();

    /* --- the scene, always --- */
    var sh = el("div", "dpsec");
    sh.appendChild(el("h4", null, "Scene " + (SCENE + 1)));
    host.appendChild(sh);
    field(host, "Name", textEl(s.name, function (v) { s.name = v; scenes(); persist(); }));
    field(host, "Length", numEl(s.seconds, 0.3, 300, 0.1, function (v) {
      mark(); s.seconds = v; change(true); }));
    field(host, "Backdrop", selectEl(
      [["gradient", "Gradient"], ["radial", "Radial"], ["flat", "Flat"],
       ["vignette", "Vignette"], ["none", "Transparent"]].map(function (q) {
         return { v: q[0], label: q[1] }; }), s.bg.style,
      function (v) { mark(); s.bg.style = v; change(true); }));
    var stc = el("label", "dpcheck"), sti = el("input");
    sti.type = "checkbox"; sti.checked = s.bg.stars;
    sti.addEventListener("change", function () { s.bg.stars = sti.checked; change(); });
    stc.appendChild(sti); stc.appendChild(document.createTextNode(" star field"));
    host.appendChild(stc);
    if (SCENE < DOC.scenes.length - 1) {
      field(host, "Into the next", selectEl(Object.keys(M.TRANSITIONS).map(function (k) {
        return { v: k, label: M.TRANSITIONS[k].label }; }), s.trans.k,
        function (v) { mark(); s.trans.k = v;
          s.trans.seconds = M.TRANSITIONS[v].seconds; change(true); }));
      if (s.trans.k !== "cut")
        field(host, "Over", numEl(s.trans.seconds, 0.05, 4, 0.05, function (v) {
          mark(); s.trans.seconds = v; change(true); }));
    }
    /* the camera, which is a scene property and not a layer one */
    var ch = el("div", "dpsec");
    ch.appendChild(el("h4", null, "Camera"));
    host.appendChild(ch);
    ["zoom", "panX", "panY", "rot"].forEach(function (k) {
      var lim = k === "zoom" ? [0.2, 4, 0.01] : (k === "rot" ? [-180, 180, 0.5] : [-60, 60, 0.5]);
      var lt = localT();
      var val = M.sample(s.camera.tracks[k], lt, s.camera.base[k]);
      var row = el("div", "dpprop" + (s.camera.tracks[k].length ? " anim" : ""));
      var sw = el("button", "dpstop" + (s.camera.tracks[k].length ? " on" : ""),
                  s.camera.tracks[k].length ? "◆" : "◇");
      sw.type = "button";
      sw.title = "Animate the camera";
      sw.addEventListener("click", function () {
        mark();
        if (s.camera.tracks[k].length) { s.camera.tracks[k] = []; s.camera.base[k] = val; }
        else M.setKey(s.camera.tracks[k], lt, val, "inOut");
        change(true);
      });
      row.appendChild(sw);
      row.appendChild(el("span", "dpproplab",
        k === "zoom" ? "Zoom" : k === "rot" ? "Roll" :
        (k === "panX" ? "Pan X" : "Pan Y")));
      var sl = el("input", "dpslider");
      sl.type = "range"; sl.min = lim[0]; sl.max = lim[1]; sl.step = lim[2];
      sl.value = val;
      sl.addEventListener("pointerdown", function () { mark(); });
      sl.addEventListener("input", function () {
        var x = parseFloat(sl.value);
        if (!s.camera.tracks[k].length) s.camera.base[k] = x;
        else M.setKey(s.camera.tracks[k], lt, x, "inOut");
        draw(); scheduleTimeline();
      });
      row.appendChild(sl);
      host.appendChild(row);
    });

    if (!L) {
      host.appendChild(el("p", "dpempty",
        "Pick a layer on the stage or in the stack to edit it."));
      return;
    }

    /* --- the layer --- */
    var lh = el("div", "dpsec");
    lh.appendChild(el("h4", null, R.nameOf(L)));
    lh.appendChild(el("span", "dpkind", L.kind));
    host.appendChild(lh);
    field(host, "Name", textEl(L.name, function (v) { L.name = v; stack(); persist(); },
                               R.nameOf(L)));

    /* content, by kind */
    if (L.kind === "view") {
      var tray = el("div", "dpchips");
      L.sel.forEach(function (id) {
        var n = window.SPNodes.byId(id);
        var c = el("button", "dpchip on", n ? n.label : id);
        c.type = "button"; c.title = "Remove from this layer";
        c.addEventListener("click", function () {
          mark();
          L.sel = L.sel.filter(function (q) { return q !== id; });
          change(true);
        });
        tray.appendChild(c);
      });
      if (!L.sel.length) tray.appendChild(el("span", "dpempty", "no nodes"));
      host.appendChild(tray);
      var ar = el("div", "dprow");
      var b1 = el("button", "dpbtn", "Use the library choice");
      b1.type = "button";
      b1.addEventListener("click", function () {
        if (!LIBSEL.length) { flash("Nothing chosen in the library."); return; }
        mark(); L.sel = LIBSEL.slice(); change(true);
      });
      ar.appendChild(b1);
      host.appendChild(ar);
      var B = window.SPStage.bagOf(L.sel, C);
      var fits = window.SPStage.options(B.bag);
      var list = [{ v: "", label: "Best fit" + (fits.length ? " — " + fits[0].label : "") }];
      window.SPStage.composers().forEach(function (K) {
        var ok = fits.some(function (f) { return f.key === K.key; });
        list.push({ v: K.key, label: K.label + (ok ? "" : "  (cannot draw this)") });
      });
      field(host, "Drawn as", selectEl(list, L.force || "", function (v) {
        mark(); L.force = v || null; change(true); }));
      field(host, "Its own playhead", selectEl(
        [{ v: "layer", label: "Runs over the layer" },
         { v: "reel", label: "Runs over the scene" },
         { v: "loop", label: "Loops" },
         { v: "frozen", label: "Held" }], L.clock,
        function (v) { mark(); L.clock = v; change(true); }));
    }
    if (L.kind === "text" || L.kind === "band" || L.kind === "stamp") {
      field(host, L.kind === "band" ? "Headline" : "Text",
            textEl(L.text, function (v) { L.text = v; change(); }));
      if (L.kind === "band")
        field(host, "Sub-line", textEl(L.sub, function (v) { L.sub = v; change(); }));
      var tk = el("p", "dptok");
      (window.SPDirector ? window.SPDirector.tokens() : []).forEach(function (t) {
        var a = el("button", "dptokb", t);
        a.type = "button"; a.title = "Insert " + t + " — resolved when the frame is drawn";
        a.addEventListener("click", function () { L.text = (L.text || "") + t; change(true); });
        tk.appendChild(a);
      });
      host.appendChild(tk);
      field(host, "Arrives", selectEl(Object.keys(R.ANIMATORS).map(function (k) {
        return { v: k, label: R.ANIMATORS[k].label }; }), L.animator,
        function (v) { mark(); L.animator = v; change(true); }));
      field(host, "Over", numEl(L.animSeconds, 0, 8, 0.05, function (v) {
        L.animSeconds = v; change(); }));
      if (L.kind !== "band") {
        field(host, "Size", numEl(round(L.size * 1000, 0), 4, 220, 1, function (v) {
          L.size = v / 1000; change(); }));
        field(host, "Tracking", numEl(round(L.tracking * 100, 0), -20, 120, 1,
          function (v) { L.tracking = v / 100; change(); }));
      }
      if (L.kind === "text") {
        field(host, "Lines", numEl(L.lines, 1, 10, 1, function (v) { L.lines = v; change(); }));
        field(host, "Line height", numEl(round(L.lineHeight, 2), 0.8, 2.4, 0.02,
          function (v) { L.lineHeight = v; change(); }));
        field(host, "Align", selectEl([{ v: "left", label: "Left" },
          { v: "center", label: "Centre" }, { v: "right", label: "Right" }],
          L.align, function (v) { L.align = v; change(); }));
        field(host, "Vertical", selectEl([{ v: "top", label: "Top" },
          { v: "middle", label: "Middle" }, { v: "bottom", label: "Bottom" }],
          L.valign, function (v) { L.valign = v; change(); }));
        field(host, "Weight", selectEl([400, 500, 600, 700, 800, 900].map(function (w) {
          return { v: w, label: String(w) }; }), L.weight,
          function (v) { L.weight = +v; change(); }));
      }
    }
    if (L.kind === "shape" || L.kind === "rule" || L.kind === "wash") {
      var shapes = L.kind === "shape"
        ? [["ring", "Ring"], ["disc", "Disc"], ["poly", "Polygon"], ["star", "Star"]]
        : L.kind === "rule"
        ? [["line", "Hairline"], ["bar", "Bar"], ["double", "Two rules"],
           ["frame", "Box"], ["round", "Rounded box"]]
        : [["flat", "Flat"], ["panel", "Panel"], ["vignette", "Vignette"],
           ["sweep", "Gradient across"], ["sweepV", "Gradient down"], ["disc", "Disc"]];
      field(host, "Shape", selectEl(shapes.map(function (q) {
        return { v: q[0], label: q[1] }; }), L.shape,
        function (v) { mark(); L.shape = v; change(true); }));
      if (L.kind === "shape" && (L.shape === "poly" || L.shape === "star"))
        field(host, "Points", numEl(L.sides, 3, 24, 1, function (v) {
          L.sides = v; change(); }));
    }
    if (L.kind !== "view") {
      field(host, "Colour", selectEl(
        ["ink", "gold", "dim", "ben", "mal", "line", "bg", "star", "custom"]
          .map(function (k) { return { v: k, label: k === "custom" ? "Custom…" : k }; }),
        L.col, function (v) { mark(); L.col = v; change(true); }));
      if (L.col === "custom") {
        var ci = el("input");
        ci.type = "color"; ci.value = L.hex;
        ci.addEventListener("input", function () { L.hex = ci.value; change(); });
        field(host, "Hex", ci);
      }
    }

    /* timing */
    var th = el("div", "dpsec");
    th.appendChild(el("h4", null, "Timing"));
    host.appendChild(th);
    var w = M.windowOf(L, s);
    field(host, "In", numEl(round(w.a, 2), 0, s.seconds, 0.05, function (v) {
      mark(); L.t0 = v; if (L.t1 && L.t1 < v) L.t1 = Math.min(s.seconds, v + 0.3);
      change(true); }));
    field(host, "Out", numEl(round(w.b, 2), 0, s.seconds, 0.05, function (v) {
      mark(); L.t1 = v; if (v < L.t0) L.t0 = Math.max(0, v - 0.3); change(true); }));

    /* presets, which bake */
    var ph = el("div", "dpsec");
    ph.appendChild(el("h4", null, "Motion presets"));
    ph.appendChild(el("span", "dphint", "each one writes keyframes you can then edit"));
    host.appendChild(ph);
    var entSel = selectEl(Object.keys(M.ENTRIES).map(function (k) {
      return { v: k, label: M.ENTRIES[k].label }; }), L.entryName || "none",
      function () {});
    var entLen = numEl(L.entrySeconds || 0.6, 0.05, 8, 0.05, function () {});
    var er = el("div", "dprow");
    er.appendChild(el("span", "dplab", "Entry"));
    er.appendChild(entSel); er.appendChild(entLen);
    var eb = el("button", "dpbtn", "Apply");
    eb.type = "button";
    eb.addEventListener("click", function () {
      mark();
      M.applyEntry(L, s, entSel.value, parseFloat(entLen.value) || 0.6);
      change(true);
    });
    er.appendChild(eb);
    host.appendChild(er);

    var exSel = selectEl(Object.keys(M.EXITS).map(function (k) {
      return { v: k, label: M.EXITS[k].label }; }), L.exitName || "none", function () {});
    var exLen = numEl(L.exitSeconds || 0.5, 0.05, 8, 0.05, function () {});
    var xr = el("div", "dprow");
    xr.appendChild(el("span", "dplab", "Exit"));
    xr.appendChild(exSel); xr.appendChild(exLen);
    var xb = el("button", "dpbtn", "Apply");
    xb.type = "button";
    xb.addEventListener("click", function () {
      mark();
      M.applyExit(L, s, exSel.value, parseFloat(exLen.value) || 0.5);
      change(true);
    });
    xr.appendChild(xb);
    host.appendChild(xr);

    var idSel = selectEl(Object.keys(M.IDLES).map(function (k) {
      return { v: k, label: M.IDLES[k].label }; }), L.idleName || "none", function () {});
    var idAmt = numEl(1, 0, 4, 0.1, function () {});
    var ir = el("div", "dprow");
    ir.appendChild(el("span", "dplab", "Throughout"));
    ir.appendChild(idSel); ir.appendChild(idAmt);
    var ib = el("button", "dpbtn", "Apply");
    ib.type = "button";
    ib.addEventListener("click", function () {
      mark();
      M.applyIdle(L, s, idSel.value, parseFloat(idAmt.value) || 1, 1);
      change(true);
    });
    ir.appendChild(ib);
    host.appendChild(ir);

    /* every animatable property */
    var pr = el("div", "dpsec");
    pr.appendChild(el("h4", null, "Properties"));
    pr.appendChild(el("span", "dphint", "◇ turns a property into an animated one"));
    host.appendChild(pr);
    var groups = [["Transform", ["x", "y", "w", "h", "scale", "rot", "skewX", "skewY"]],
                  ["Appearance", ["opacity", "reveal", "blur", "glow", "chroma"]],
                  ["Colour", ["bright", "contrast", "sat", "hue", "grain"]]];
    if (L.kind === "view") groups.push(["The drawing", ["inner"]]);
    groups.forEach(function (g) {
      host.appendChild(el("h5", "dpsub", g[0]));
      g[1].forEach(function (k) { propRow(host, L, k); });
    });

    /* blend, clip, mask */
    var bh = el("div", "dpsec");
    bh.appendChild(el("h4", null, "Compositing"));
    host.appendChild(bh);
    field(host, "Blend", selectEl(M.BLENDS.map(function (b) {
      return { v: b, label: M.BLEND_LABEL[b] }; }), L.blend,
      function (v) { mark(); L.blend = v; change(true); }));
    var cc = el("label", "dpcheck"), cci = el("input");
    cci.type = "checkbox"; cci.checked = L.clip;
    cci.addEventListener("change", function () { mark(); L.clip = cci.checked; change(); });
    cc.appendChild(cci);
    cc.appendChild(document.createTextNode(" clip to the box"));
    host.appendChild(cc);

    var mr = el("div", "dprow");
    mr.appendChild(el("span", "dplab", "Mask"));
    if (!L.mask) {
      var mb = el("button", "dpbtn", "Add a mask");
      mb.type = "button";
      mb.addEventListener("click", function () {
        mark();
        L.mask = { shape: "ellipse", x: 0.15, y: 0.2, w: 0.7, h: 0.5,
                   feather: 0.2, invert: false, rot: 0 };
        change(true);
      });
      mr.appendChild(mb);
      host.appendChild(mr);
    } else {
      var rb = el("button", "dpbtn", "Remove");
      rb.type = "button";
      rb.addEventListener("click", function () { mark(); L.mask = null; change(true); });
      mr.appendChild(rb);
      host.appendChild(mr);
      field(host, "Shape", selectEl([{ v: "rect", label: "Rectangle" },
        { v: "round", label: "Rounded" }, { v: "ellipse", label: "Ellipse" }],
        L.mask.shape, function (v) { L.mask.shape = v; change(); }));
      ["x", "y", "w", "h"].forEach(function (k) {
        field(host, k, numEl(round(L.mask[k] * 100, 1), -50, 200, 0.5, function (v) {
          L.mask[k] = v / 100; change(); }));
      });
      field(host, "Feather", numEl(round(L.mask.feather, 2), 0, 1, 0.01, function (v) {
        L.mask.feather = v; change(); }));
      var iv = el("label", "dpcheck"), ivi = el("input");
      ivi.type = "checkbox"; ivi.checked = L.mask.invert;
      ivi.addEventListener("change", function () { L.mask.invert = ivi.checked; change(); });
      iv.appendChild(ivi); iv.appendChild(document.createTextNode(" invert"));
      host.appendChild(iv);
    }
  }

  /* ================= the timeline ========================================== */
  var TLTIMER = null;
  function scheduleTimeline() {
    if (TLTIMER) return;
    TLTIMER = setTimeout(function () { TLTIMER = null; timeline(); }, 140);
  }

  function timeline() {
    var host = $("dp-timeline");
    if (!host) return;
    host.innerHTML = "";
    var total = M.total(DOC);
    var s = cur();
    var start = M.sceneStart(DOC, SCENE);

    /* the ruler, across the whole reel, with the scene joins marked */
    var rr = el("div", "dptrow dpruler");
    rr.appendChild(el("span", "dptname", total.toFixed(1) + " s"));
    var rl = el("div", "dptlane");
    DOC.scenes.forEach(function (sc, i) {
      var a = M.sceneStart(DOC, i);
      var seg = el("i", "dptscene" + (i === SCENE ? " on" : ""));
      seg.style.left = (a / total * 100) + "%";
      seg.style.width = (sc.seconds / total * 100) + "%";
      seg.title = sc.name + " — " + sc.seconds.toFixed(1) + " s";
      seg.addEventListener("click", function () {
        SCENE = i; PICK = null; refreshAll(); });
      rl.appendChild(seg);
    });
    for (var m2 = 1; m2 < 10; m2++) {
      var tk = el("i", "dptick");
      tk.style.left = (m2 * 10) + "%";
      rl.appendChild(tk);
    }
    var head = el("i", "dpplayhead");
    head.id = "dp-playhead";
    head.style.left = (T / total * 100) + "%";
    rl.appendChild(head);
    rl.addEventListener("pointerdown", function (ev) { scrubFrom(rl, ev, total, 0, total); });
    rr.appendChild(rl);
    host.appendChild(rr);

    /* one row per layer of the CURRENT scene, in stack order, topmost first */
    for (var i = s.layers.length - 1; i >= 0; i--) {
      (function (L) {
        var row = el("div", "dptrow" + (L.id === PICK ? " on" : ""));
        var nm = el("button", "dptname");
        nm.type = "button";
        var tw = el("span", "dptwist", OPEN[L.id] ? "▾" : "▸");
        nm.appendChild(tw);
        nm.appendChild(el("span", null, R.nameOf(L)));
        nm.addEventListener("click", function () {
          if (PICK === L.id) OPEN[L.id] = !OPEN[L.id];
          PICK = L.id;
          change(true);
        });
        row.appendChild(nm);
        var lane = el("div", "dptlane");
        var w = M.windowOf(L, s);
        var bar = el("div", "dptbar" + (L.hidden ? " off" : ""));
        bar.style.left = ((start + w.a) / total * 100) + "%";
        bar.style.width = Math.max(0.6, (w.len / total) * 100) + "%";
        bar.title = R.nameOf(L) + " — " + w.a.toFixed(2) + "s to " + w.b.toFixed(2) + "s";
        bar.addEventListener("pointerdown", function (ev) {
          dragBar(ev, lane, L, s, total, w);
        });
        lane.appendChild(bar);
        row.appendChild(lane);
        host.appendChild(row);

        if (OPEN[L.id]) {
          M.PROP_ORDER.forEach(function (k) {
            var tr = L.tracks[k];
            if (!tr.length) return;
            var prow = el("div", "dptrow dptprop");
            prow.appendChild(el("span", "dptname dptpname", M.PROPS[k].label));
            var plane = el("div", "dptlane");
            tr.forEach(function (key, ki) {
              var d = el("i", "dptkey");
              d.style.left = ((start + key.t) / total * 100) + "%";
              d.title = M.PROPS[k].label + " = " + round(key.v, 2) +
                        M.PROPS[k].unit + " at " + key.t.toFixed(2) + "s  (" +
                        (M.EASE[key.e] || { label: key.e }).label + ")";
              d.addEventListener("pointerdown", function (ev) {
                dragKey(ev, plane, L, k, key, s, total, start);
              });
              d.addEventListener("dblclick", function (ev) {
                ev.preventDefault();
                mark();
                tr.splice(tr.indexOf(key), 1);
                change(true);
              });
              plane.appendChild(d);
            });
            prow.appendChild(plane);
            host.appendChild(prow);
          });
          /* the camera's keys belong to the scene, but they are shown under
             the first opened layer's block so there is one place to look */
        }
      })(s.layers[i]);
    }
  }

  function scrubFrom(lane, ev, total, lo, hi) {
    ev.preventDefault();
    play(false);
    var r = lane.getBoundingClientRect();
    function at(e2) {
      var f = clamp((e2.clientX - r.left) / Math.max(1, r.width), 0, 1);
      T = clamp(f * total, lo, hi);
      var sc = M.sceneAt(DOC, T);
      if (sc && sc.i !== SCENE) { SCENE = sc.i; scenes(); stack(); }
      var ph = $("dp-playhead");
      if (ph) ph.style.left = (T / total * 100) + "%";
      showTime();
      drawFrame();
    }
    at(ev);
    function up() {
      window.removeEventListener("pointermove", at);
      window.removeEventListener("pointerup", up);
      change(false);
    }
    window.addEventListener("pointermove", at);
    window.addEventListener("pointerup", up);
  }

  function dragBar(ev, lane, L, s, total, w) {
    ev.preventDefault();
    ev.stopPropagation();
    PICK = L.id;
    var r = lane.getBoundingClientRect();
    var x0 = (ev.clientX - r.left) / Math.max(1, r.width) * total;
    var rel = (x0 - M.sceneStart(DOC, SCENE) - w.a) / Math.max(0.001, w.len);
    var mode = rel < 0.2 ? "a" : (rel > 0.8 ? "b" : "move");
    var a0 = w.a, b0 = w.b;
    mark();
    function mv(e2) {
      var x = (e2.clientX - r.left) / Math.max(1, r.width) * total;
      var d = x - x0;
      if (SNAP) d = Math.round(d * 10) / 10;
      if (mode === "move") {
        var len = b0 - a0;
        L.t0 = clamp(a0 + d, 0, s.seconds - len);
        L.t1 = L.t0 + len;
      } else if (mode === "a") {
        L.t0 = clamp(a0 + d, 0, b0 - 0.1);
        L.t1 = b0;
      } else {
        L.t1 = clamp(b0 + d, a0 + 0.1, s.seconds);
      }
      draw();
      var bar = lane.querySelector(".dptbar");
      if (bar) {
        var ww = M.windowOf(L, s);
        bar.style.left = ((M.sceneStart(DOC, SCENE) + ww.a) / total * 100) + "%";
        bar.style.width = Math.max(0.6, ww.len / total * 100) + "%";
      }
    }
    function up() {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
      change(true);
    }
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  }

  function dragKey(ev, lane, L, k, key, s, total, start) {
    ev.preventDefault();
    ev.stopPropagation();
    PICK = L.id;
    var r = lane.getBoundingClientRect();
    var t0k = key.t;
    var x0 = (ev.clientX - r.left) / Math.max(1, r.width) * total;
    mark();
    var dot = ev.target;
    function mv(e2) {
      var x = (e2.clientX - r.left) / Math.max(1, r.width) * total;
      var d = x - x0;
      if (SNAP) d = Math.round(d * 20) / 20;
      key.t = clamp(t0k + d, 0, s.seconds);
      M.sortTrack(L.tracks[k]);
      if (dot) dot.style.left = ((start + key.t) / total * 100) + "%";
      draw();
    }
    function up() {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
      change(true);
    }
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  }

  /* ================= the stage's own pointer =============================== */
  function bindStage() {
    var cv = $("dp-canvas");
    if (!cv) return;
    function frac(ev) {
      var r = cv.getBoundingClientRect();
      return { x: (ev.clientX - r.left) / Math.max(1, r.width),
               y: (ev.clientY - r.top) / Math.max(1, r.height) };
    }
    cv.addEventListener("pointerdown", function (ev) {
      var f = frac(ev);
      var g = R.hitTest(DOC, T, f.x, f.y, PICK);
      if (!g) { return; }
      ev.preventDefault();
      if (g.id !== PICK) { PICK = g.id; change(true); }
      var L = curLayer();
      if (!L || L.locked) return;
      var lt = localT();
      var v = R.valuesOf(L, lt);
      mark();
      DRAG = { mode: g.mode, from: f,
               start: { x: v.x, y: v.y, w: v.w, h: v.h } };
      try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
    });
    cv.addEventListener("pointermove", function (ev) {
      if (!DRAG) {
        var f2 = frac(ev);
        var g2 = R.hitTest(DOC, T, f2.x, f2.y, PICK);
        cv.style.cursor = !g2 ? "default"
          : (g2.mode === "move" ? "move" : (g2.mode === "pick" ? "pointer"
          : (g2.mode === "n" || g2.mode === "s" ? "ns-resize"
          : (g2.mode === "e" || g2.mode === "w" ? "ew-resize"
          : (g2.mode === "ne" || g2.mode === "sw" ? "nesw-resize" : "nwse-resize")))));
        return;
      }
      ev.preventDefault();
      var L = curLayer();
      if (!L) return;
      var f = frac(ev);
      var dx = (f.x - DRAG.from.x) * 100, dy = (f.y - DRAG.from.y) * 100;
      var st = DRAG.start;
      var nx = st.x, ny = st.y, nw = st.w, nh = st.h;
      var H = null;
      R.HANDLES.forEach(function (q) { if (q.k === DRAG.mode) H = q; });
      if (DRAG.mode === "move" || DRAG.mode === "pick") { nx += dx; ny += dy; }
      else if (H) {
        if (H.l) { nx += dx; nw -= dx; }
        if (H.r) nw += dx;
        if (H.t) { ny += dy; nh -= dy; }
        if (H.b) nh += dy;
      }
      if (nw < 2) nw = 2;
      if (nh < 1) nh = 1;
      if (ev.shiftKey || SNAP) {
        var g3 = 100 / 24;
        nx = Math.round(nx / g3) * g3; ny = Math.round(ny / g3) * g3;
        nw = Math.round(nw / g3) * g3; nh = Math.round(nh / g3) * g3;
      }
      var lt = localT();
      setProp(L, "x", nx, lt); setProp(L, "y", ny, lt);
      setProp(L, "w", nw, lt); setProp(L, "h", nh, lt);
      drawFrame();
    });
    function end() {
      if (!DRAG) return;
      DRAG = null;
      change(true);
    }
    cv.addEventListener("pointerup", end);
    cv.addEventListener("pointercancel", end);
    cv.setAttribute("tabindex", "0");
    cv.addEventListener("keydown", function (ev) {
      var L = curLayer();
      if (!L || L.locked) return;
      var step = ev.shiftKey ? 5 : 0.5, lt = localT();
      var v = R.valuesOf(L, lt);
      if (ev.key === "ArrowLeft") setProp(L, "x", v.x - step, lt);
      else if (ev.key === "ArrowRight") setProp(L, "x", v.x + step, lt);
      else if (ev.key === "ArrowUp") setProp(L, "y", v.y - step, lt);
      else if (ev.key === "ArrowDown") setProp(L, "y", v.y + step, lt);
      else if (ev.key === "Delete" || ev.key === "Backspace") { delLayer(L.id); }
      else return;
      ev.preventDefault();
      change();
    });
  }
  /* writing a value: to the base if the property is not animated, to a key if
     it is — which is the rule that makes a keyframed property impossible to
     edit by accident and an un-keyframed one impossible to over-complicate */
  function setProp(L, k, v, t) {
    if (!L.tracks[k].length) L.base[k] = v;
    else M.setKey(L.tracks[k], t, v, "smooth");
  }

  /* ================= transport ============================================= */
  var FPSCAP = 30, lastFrame = 0, slow = 0;
  function tick() {
    if (!PLAY) return;
    RAF = requestAnimationFrame(tick);
    var now = performance.now();
    if (now - lastFrame < 1000 / FPSCAP - 1) return;
    lastFrame = now;
    var total = M.total(DOC);
    T = ((Date.now() - T0) / 1000) % total;
    var t0 = performance.now();
    drawFrame();
    var cost = performance.now() - t0;
    if (cost > 1000 / FPSCAP) { if (++slow > 3 && FPSCAP > 10) { FPSCAP -= 4; slow = 0; } }
    else if (--slow < -40 && FPSCAP < 30) { FPSCAP += 2; slow = 0; }
    if (!tick.ui || now - tick.ui > 110) {
      tick.ui = now;
      var ph = $("dp-playhead");
      if (ph) ph.style.left = (T / total * 100) + "%";
      showTime();
    }
  }
  function showTime() {
    var e = $("dp-time");
    if (!e) return;
    var total = M.total(DOC);
    var fr = Math.floor(T * DOC.fps) % DOC.fps;
    e.textContent = T.toFixed(2) + " / " + total.toFixed(2) + " s   ·   frame " +
      Math.floor(T * DOC.fps) + "  (" + String(fr).padStart(2, "0") + ")";
  }
  function play(on) {
    if (on && window.DPExport.isBusy()) return;
    PLAY = on;
    var b = $("dp-play");
    if (b) b.textContent = on ? "Pause" : "Play";
    if (on) {
      FPSCAP = 30; slow = 0; lastFrame = 0;
      T0 = Date.now() - T * 1000;
      if (DOC.audio && DOC.audio.__el) {
        try { DOC.audio.__el.currentTime = (DOC.audio.start || 0) + T;
              DOC.audio.__el.play(); } catch (e) {}
      }
      tick();
    } else {
      if (RAF) { cancelAnimationFrame(RAF); RAF = null; }
      if (DOC.audio && DOC.audio.__el) { try { DOC.audio.__el.pause(); } catch (e) {} }
      change(false);
    }
  }

  /* ================= status, flash, persistence ============================ */
  function status() {
    var e = $("dp-stat");
    if (!e) return;
    var bits = [];
    var nl = 0, nk = 0;
    DOC.scenes.forEach(function (s) {
      nl += s.layers.length;
      s.layers.forEach(function (L) {
        M.PROP_ORDER.forEach(function (k) { nk += L.tracks[k].length; });
      });
    });
    var F = M.FORMATS[DOC.format];
    bits.push(DOC.scenes.length + " scene(s), " + nl + " layers, " + nk + " keys");
    bits.push(F.w + "×" + F.h + " at " + DOC.fps + " fps");
    bits.push(M.total(DOC).toFixed(1) + " s");
    if (DOC.audio) bits.push("audio: " + DOC.audio.name);
    e.textContent = bits.join("  ·  ");

    var w = $("dp-warn");
    if (!w) return;
    w.innerHTML = "";
    if (!LAST) return;
    (LAST.empty || []).forEach(function (q) {
      w.appendChild(el("li", null, q.name + " — " + q.why)); });
    (LAST.missing || []).forEach(function (q) {
      w.appendChild(el("li", null, q.layer + ": " + q.label + " — " + q.why)); });
    (LAST.errors || []).forEach(function (q) {
      w.appendChild(el("li", "bad", q.name + " — " + q.why)); });
  }
  function flash(msg) {
    var f = $("dp-flash");
    if (!f) return;
    f.textContent = msg; f.hidden = false;
    clearTimeout(flash._t);
    flash._t = setTimeout(function () { f.hidden = true; }, 3600);
  }
  var PTIMER = null;
  function persist() {
    if (PTIMER) return;
    PTIMER = setTimeout(function () {
      PTIMER = null;
      try {
        localStorage.setItem("nirayana.directorpro",
          JSON.stringify({ doc: DOC, scene: SCENE, place: PLACE }));
      } catch (e) {}
    }, 500);
  }
  function restore() {
    try {
      var o = JSON.parse(localStorage.getItem("nirayana.directorpro") || "null");
      if (o && o.doc && o.doc.scenes) {
        DOC = M.doc(o.doc);
        SCENE = clamp(o.scene || 0, 0, DOC.scenes.length - 1);
        if (o.place && o.place.lat != null) PLACE = o.place;
        return true;
      }
    } catch (e) {}
    return false;
  }

  /* ================= the library of saved reels ============================ */
  var STORE = "nirayana.directorpro.reels";
  function reels() {
    try { return JSON.parse(localStorage.getItem(STORE) || "[]") || []; }
    catch (e) { return []; }
  }
  function writeReels(l) {
    try { localStorage.setItem(STORE, JSON.stringify(l)); return true; }
    catch (e) { return false; }
  }
  function libraryPanel() {
    var host = $("dp-reels");
    if (!host) return;
    host.innerHTML = "";
    var r = el("div", "dprow");
    var sv = el("button", "dpbtn primary", "Save this reel");
    sv.type = "button";
    sv.addEventListener("click", function () {
      var list = reels();
      var d = JSON.parse(JSON.stringify(DOC));
      d.savedAt = Date.now();
      var at = -1;
      list.forEach(function (q, i) { if (q.name === d.name) at = i; });
      if (at >= 0) list[at] = d; else list.push(d);
      flash(writeReels(list) ? "Saved “" + d.name + "” in this browser."
                             : "This browser refused to store it.");
      libraryPanel();
    });
    r.appendChild(sv);
    var nw = el("button", "dpbtn", "New reel");
    nw.type = "button";
    nw.addEventListener("click", function () {
      mark();
      DOC = M.doc({ name: "Untitled reel" });
      SCENE = 0; T = 0; PICK = null;
      refreshAll();
    });
    r.appendChild(nw);
    /* a composition is JSON, so it is a file — which is how a reel moves
       between two of this person's machines with no server in the middle */
    var ex = el("button", "dpbtn", "Export the file");
    ex.type = "button";
    ex.addEventListener("click", function () {
      window.DPExport.save(new Blob([JSON.stringify(DOC, null, 1)],
        { type: "application/json" }),
        (DOC.name || "reel").replace(/[^\w-]+/g, "-") + ".nirayana.json");
    });
    r.appendChild(ex);
    var im = el("label", "dpbtn");
    im.textContent = "Open a file";
    var imi = el("input");
    imi.type = "file"; imi.accept = ".json,application/json"; imi.hidden = true;
    imi.addEventListener("change", function () {
      var f = imi.files && imi.files[0];
      if (!f) return;
      var fr2 = new FileReader();
      fr2.onload = function () {
        try {
          var o = JSON.parse(fr2.result);
          mark();
          DOC = o.v === 2 ? M.doc(o) : M.fromDirector(o, 15);
          SCENE = 0; T = 0; PICK = null;
          refreshAll();
          flash("Opened “" + DOC.name + "”.");
        } catch (e) { flash("That file is not a reel this page can read."); }
      };
      fr2.readAsText(f);
    });
    im.appendChild(imi);
    r.appendChild(im);
    host.appendChild(r);

    var list = reels();
    if (!list.length) {
      host.appendChild(el("p", "dphint",
        "Saved reels stay in this browser. Nothing is uploaded."));
      return;
    }
    list.sort(function (a, b) { return (b.savedAt || 0) - (a.savedAt || 0); });
    var ul = el("div", "dpsaved");
    list.forEach(function (q) {
      var row = el("div", "dpsrow");
      var o = el("button", "dpchip", q.name + "  ·  " + (q.scenes || []).length +
                 " scenes");
      o.type = "button";
      o.addEventListener("click", function () {
        mark();
        DOC = M.doc(q); SCENE = 0; T = 0; PICK = null;
        refreshAll();
      });
      var x = el("button", "dpmini", "×");
      x.type = "button"; x.title = "Forget this reel";
      x.addEventListener("click", function () {
        writeReels(reels().filter(function (z) { return z.name !== q.name; }));
        libraryPanel();
      });
      row.appendChild(o); row.appendChild(x);
      ul.appendChild(row);
    });
    host.appendChild(ul);
  }

  /* ================= export panel ========================================== */
  function exportPanel() {
    var host = $("dp-export");
    if (!host) return;
    host.innerHTML = "";
    var can = window.DPExport.can();
    var r1 = el("div", "dprow");
    var rec = el("button", "dpbtn primary", "Record the reel");
    rec.type = "button"; rec.id = "dp-rec";
    rec.disabled = !(can.capture && can.recorder);
    rec.addEventListener("click", doRecord);
    r1.appendChild(rec);
    var png = el("button", "dpbtn", "Save this frame");
    png.type = "button";
    png.addEventListener("click", function () {
      window.DPExport.still(DOC, C, T).then(function (b) {
        window.DPExport.save(b, (DOC.name || "frame").replace(/[^\w-]+/g, "-") + ".png");
        draw();
      });
    });
    r1.appendChild(png);
    var seq = el("button", "dpbtn", "Frames as PNGs");
    seq.type = "button";
    seq.title = "One file per frame, for taking into another editor";
    seq.addEventListener("click", function () {
      seq.disabled = true;
      window.DPExport.atFull = true;
      window.DPRender.atFullSize(DOC, function () {
        return window.DPExport.frames(DOC, C, { fps: 6 }, function (f) {
          seq.textContent = "Frames… " + Math.round(f * 100) + "%";
        }).then(function (list) {
          list.forEach(function (q, i) {
            setTimeout(function () { window.DPExport.save(q.blob, q.name); }, i * 120);
          });
          seq.textContent = "Frames as PNGs"; seq.disabled = false;
          flash(list.length + " frames — your browser will ask about multiple downloads.");
          draw();
        });
      });
    });
    r1.appendChild(seq);
    host.appendChild(r1);

    var r2 = el("div", "dprow");
    r2.appendChild(el("span", "dplab", "Quality"));
    r2.appendChild(numEl(DOC.quality, 2, 80, 1, function (v) { DOC.quality = v; persist(); }));
    r2.appendChild(el("span", "dpunit", "Mbit/s"));
    host.appendChild(r2);

    var r3 = el("div", "dprow");
    r3.appendChild(el("span", "dplab", "Audio"));
    var al = el("label", "dpbtn");
    al.textContent = DOC.audio ? "Change the track" : "Choose a track";
    var ai = el("input");
    ai.type = "file"; ai.accept = "audio/*"; ai.hidden = true;
    ai.addEventListener("change", function () {
      var f = ai.files && ai.files[0];
      if (!f) return;
      var url = URL.createObjectURL(f);
      var a = new Audio();
      a.src = url; a.loop = false; a.preload = "auto";
      MEDIA.audioEl = a; MEDIA.audioName = f.name;
      DOC.audio = { name: f.name, start: 0, gain: 1, fadeIn: 0.4, fadeOut: 0.8,
                    __el: a };
      exportPanel(); status(); persist();
      flash("“" + f.name + "” is on the timeline. It never leaves this machine.");
    });
    al.appendChild(ai);
    r3.appendChild(al);
    if (DOC.audio) {
      var ax = el("button", "dpmini", "×");
      ax.type = "button"; ax.title = "Remove the track";
      ax.addEventListener("click", function () {
        DOC.audio = null; MEDIA.audioEl = null; exportPanel(); status(); persist(); });
      r3.appendChild(ax);
    }
    host.appendChild(r3);
    if (DOC.audio) {
      [["start", "Starts at", 0, 600, 0.1, "s"],
       ["gain", "Volume", 0, 2, 0.05, "×"],
       ["fadeIn", "Fade in", 0, 10, 0.1, "s"],
       ["fadeOut", "Fade out", 0, 10, 0.1, "s"]].forEach(function (q) {
        var rr = el("div", "dprow");
        rr.appendChild(el("span", "dplab", q[1]));
        rr.appendChild(numEl(DOC.audio[q[0]], q[2], q[3], q[4], function (v) {
          DOC.audio[q[0]] = v; persist(); }));
        rr.appendChild(el("span", "dpunit", q[5]));
        host.appendChild(rr);
      });
    }
    var note = el("p", "dphint");
    note.textContent = "This browser writes " +
      (can.mp4 ? "MP4 (H.264), which posts straight to Instagram."
               : "WebM — your browser does not offer MP4, so the file may need converting before it is posted.") +
      (can.audio ? "" : " It cannot record audio.");
    host.appendChild(note);
  }

  function doRecord() {
    var b = $("dp-rec");
    if (window.DPExport.isBusy()) {
      window.DPExport.cancel();
      b.textContent = "Stopping…";
      return;
    }
    play(false);
    var keepT = T;
    b.textContent = "Stop (0%)";
    b.className = "dpbtn primary rec";
    [["dp-play", 1], ["dp-undo", 1], ["dp-redo", 1]].forEach(function (q) {
      var e = $(q[0]); if (e) e.disabled = true; });
    var q0 = R.S.quality;
    R.S.quality = 1; R.resize(DOC);
    window.DPExport.record(DOC, C, { fps: DOC.fps, mbps: DOC.quality },
      function (f) { b.textContent = "Stop (" + Math.round(f * 100) + "%)"; })
      .then(function (res) {
        R.S.quality = q0; R.resize(DOC);
        b.textContent = "Record the reel"; b.className = "dpbtn primary";
        [["dp-play", 1], ["dp-undo", 1], ["dp-redo", 1]].forEach(function (q) {
          var e = $(q[0]); if (e) e.disabled = false; });
        syncUndo();
        T = keepT; refreshAll();
        if (res.cancelled && res.madeSeconds < 0.6) {
          flash("Stopped — nothing long enough to keep."); return;
        }
        var ext = res.mime.indexOf("mp4") >= 0 ? "mp4" : "webm";
        window.DPExport.save(res.blob,
          (DOC.name || "reel").replace(/[^\w-]+/g, "-") + "." + ext);
        flash((res.cancelled ? "Stopped at " + res.madeSeconds.toFixed(1) + " s — "
                             : "Recorded " + res.seconds.toFixed(1) + " s — ") +
              res.width + "×" + res.height + ", " +
              Math.round(res.blob.size / 1024) + " KB" +
              (res.hadAudio ? ", with audio." : "."));
      })
      .catch(function (e) {
        R.S.quality = q0; R.resize(DOC);
        b.textContent = "Record the reel"; b.className = "dpbtn primary";
        [["dp-play", 1], ["dp-undo", 1], ["dp-redo", 1]].forEach(function (q) {
          var el2 = $(q[0]); if (el2) el2.disabled = false; });
        syncUndo();
        flash("Could not record: " + (e && e.message || e) +
              " — saving the frame always works.");
      });
  }

  /* ================= boot ================================================== */
  function bind() {
    M = window.DPModel; R = window.DPRender;
    if (!M || !R || !window.SPNodes || !window.SPStage) return;
    var cv = $("dp-canvas");
    if (!cv) return;
    R.attach(cv);

    if (!restore()) {
      DOC = M.doc({ name: "Untitled reel" });
      /* A document that opens empty is a document nobody starts. One scene
         with a caption band and a stamp is the shape of every reel this page
         makes, and both are one click from being deleted. */
      var s = DOC.scenes[0];
      /* A view layer that needs no stored chart, so the page opens on
         something drawn rather than on an empty frame that looks broken. */
      var v0 = M.layer({ kind: "view", sel: ["sky.all"], t0: 0, t1: 0,
        base: { x: 6, y: 14, w: 88, h: 52 } });
      M.applyEntry(v0, s, "rise", 0.8);
      s.layers.push(v0);
      s.layers.push(M.layer({ kind: "band", text: "{tithi}",
        sub: "{naks}  ·  {place}", col: "gold", animator: "wordFade",
        animSeconds: 0.9, t0: 0.3, t1: 0,
        base: { x: 8, y: 76, w: 84, h: 11 } }));
      s.layers.push(M.layer({ kind: "stamp", text: "{date}  ·  {place}",
        size: 0.019, col: "dim", t0: 0.1, t1: 0,
        base: { x: 8, y: 92, w: 84, h: 4 } }));
    }
    rebindMedia();
    C = buildContext();
    R.resize(DOC);
    /* Open part-way in rather than on frame zero. Every entry animation is at
       its beginning at t=0, so a document that opens there opens on a frame
       where nothing has arrived yet — which reads as a page that failed to
       load rather than as the first frame of a reel. */
    if (T <= 0) T = M.total(DOC) * 0.55;

    var mode = $("dp-mode");
    if (mode) {
      mode.textContent = C.J
        ? "Reading the chart stored in this browser" +
          (C.birth && C.birth.name ? " — " + C.birth.name : "") +
          ". Everything in the library is available."
        : "No chart stored here — the sky, the day and the divisions all work; " +
          "chart-only items are greyed. Build one on the Kundli page to unlock them.";
      if (!C.J) mode.className = "dpnote warn";
    }

    $("dp-play") && $("dp-play").addEventListener("click", function () { play(!PLAY); });
    $("dp-libsearch") && $("dp-libsearch").addEventListener("input", library);
    $("dp-liblive") && $("dp-liblive").addEventListener("change", library);
    var span = $("dp-span");
    if (span) span.addEventListener("change", function () {
      C = buildContext(C.when); window.SPNodes.cacheClear(); library(); change(true); });
    var when = $("dp-when");
    if (when) {
      var d = new Date(C.when - new Date().getTimezoneOffset() * 60000);
      when.value = d.toISOString().slice(0, 16);
      when.addEventListener("change", function () {
        var t = Date.parse(when.value);
        C = buildContext(isFinite(t) ? t : Date.now());
        window.SPNodes.cacheClear();
        library(); change(true);
      });
    }
    var ph = $("dp-place");
    if (ph && window.NPlaces) {
      var quick = [];
      try {
        var sv = window.NP && window.NP.savedPlace ? window.NP.savedPlace() : null;
        if (sv) quick.push(sv);
      } catch (e) {}
      if (C.birth && C.birth.lat != null)
        quick.push({ n: C.birth.place || C.birth.name || "your chart's place",
                     lat: C.birth.lat, lon: C.birth.lon, tz: C.birth.tzHours });
      quick = quick.concat((window.NP && window.NP.PLACES) || []);
      window.NPlaces.picker({
        host: ph, value: C.place, quick: quick, label: "Place",
        refMs: function () { return C ? C.when : Date.now(); },
        onPick: function (p) {
          PLACE = { n: p.n || p.name, lat: p.lat, lon: p.lon, tz: p.tz };
          C = buildContext(C.when);
          window.SPNodes.cacheClear();
          library(); change(true); persist();
        }
      });
    }

    bindStage();
    addBar();
    library();
    libraryPanel();
    exportPanel();
    refreshAll();

    window.addEventListener("resize", function () { fitStage(); draw(); });
    /* the shortcuts a video tool is expected to have */
    document.addEventListener("keydown", function (ev) {
      var t = ev.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" ||
                t.tagName === "TEXTAREA")) return;
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "z") {
        ev.preventDefault();
        if (ev.shiftKey) redo(); else undo();
        return;
      }
      if (ev.key === " ") { ev.preventDefault(); play(!PLAY); return; }
      if (ev.key === "ArrowLeft" && ev.altKey) {
        ev.preventDefault(); T = Math.max(0, T - 1 / DOC.fps); change(false); return; }
      if (ev.key === "ArrowRight" && ev.altKey) {
        ev.preventDefault(); T = Math.min(M.total(DOC), T + 1 / DOC.fps);
        change(false); return; }
    });

    try {
      window.__dp = {
        doc: function () { return DOC; },
        setDoc: function (d) { DOC = M.doc(d); SCENE = 0; T = 0; refreshAll(); },
        ctx: function () { return C; },
        at: function (t) { T = t; drawFrame(); return LAST; },
        exportFrame: function (t) { T = t == null ? T : t;
          return R.render(DOC, C, T, true); },
        screenFrame: function (t) { T = t == null ? T : t; drawFrame(); return LAST; },
        pick: function (id) { PICK = id; change(true); },
        picked: function () { return PICK; },
        scene: function (i) { if (i != null) { SCENE = i; refreshAll(); } return SCENE; },
        add: function (o) { return addLayer(o); },
        undo: undo, redo: redo, mark: mark,
        playing: function () { return PLAY; },
        last: function () { return LAST; },
        total: function () { return M.total(DOC); },
        libSelect: function (ids) { LIBSEL = ids.slice(); library(); return LIBSEL; },
        refresh: refreshAll
      };
    } catch (e) {}
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
