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
    /* Another file may publish nodes into this registry. sp-cycles.js does,
       because the long-run event cycles it computes are a different kind of
       work from everything here — a root-find over centuries rather than a
       reading of one instant — and keeping them apart means the file that
       holds two hundred one-line nodes stays readable. A duplicate id is
       refused rather than silently shadowing, since two nodes answering to
       one name is a bug nobody would ever find from the symptom. */
    register: function (node) {
      if (!node || !node.id || typeof node.get !== "function") return false;
      for (var i = 0; i < N.length; i++) if (N[i].id === node.id) return false;
      N.push(node);
      RC.key = null;
      return true;
    },
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
