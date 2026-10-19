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

  window.SPNodes = {
    all: function () { return N.slice(); },
    byId: function (id) {
      for (var i = 0; i < N.length; i++) if (N[i].id === id) return N[i];
      return null;
    },
    resolve: function (node, C) {
      try { return node.get(C); } catch (e) { return null; }
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
    pal: "midnight", ratio: "9:16", safe: true, speed: 1, p: 0,
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
  /* the size at which a line finally fits a width — a centred line that does
     not fit loses the same number of words at each end, which is the one
     failure that reads as deliberate */
  function fit(s, size, maxW, weight) {
    var c = S.ctx, f = size;
    for (var i = 0; i < 20; i++) {
      c.font = (weight || 600) + " " + Math.round(f) + "px " + SANS;
      if (c.measureText(String(s)).width <= maxW) break;
      f *= 0.94;
    }
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
    if (!S.safe) return;
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
  function render(sel, C, p, forceKey) {
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
      return { composer: null, missing: B.missing, options: [] };
    }
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
    captionBand(S.headline || chosen.label, S.sub || chosen.blurb);
    safeGuides();
    return { composer: chosen.key, label: chosen.label, missing: B.missing,
             options: options(B.bag) };
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
    var out = render(cur.shot.sel || [], C, cur.local, cur.shot.force || null);
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
  /* `sel` is either a selection (one shot) or an array of shots, in which
     case `seconds` is ignored and the storyboard's own total is used. */
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
      rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = function () {
        resolve({ blob: new Blob(chunks, { type: mime }), mime: mime,
                  seconds: seconds, frames: total });
      };
      var total = Math.max(2, Math.round(seconds * fps)), i = 0;
      rec.start();
      function step() {
        if (i > total) { try { rec.stop(); } catch (e) {} return; }
        S.p = i / total;
        if (shots) renderStory(shots, C, S.p);
        else render(sel, C, S.p, forceKey);
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

  window.SPStage = {
    S: S, PALS: PALS, RATIOS: RATIOS, SAFE: SAFE,
    attach: function (canvas) {
      S.cv = canvas; S.ctx = canvas.getContext("2d");
      this.resize();
    },
    resize: function () {
      var r = RATIOS[S.ratio] || RATIOS["9:16"];
      S.W = r.w; S.H = r.h; S.U = r.w;
      if (S.cv) { S.cv.width = r.w; S.cv.height = r.h; }
      STARS = null;
    },
    render: render, renderStory: renderStory, record: record,
    storyTotal: storyTotal, shotAt: shotAt, options: options, bagOf: bagOf,
    composers: function () { return COMPOSERS.map(function (K) {
      return { key: K.key, label: K.label, blurb: K.blurb }; }); }
  };
})();

/* ===== Studio Pro — the page ==============================================

   Three panes. The command wall on the left lists every node the registry
   offers, grouped by domain and filtered by a search box; the stage in the
   middle draws whatever is selected; the tray on the right says what was
   selected, which composer took it, which other views could take it instead,
   and what is being left out.

   THE PART THAT IS NOT ORNAMENT. Selecting a node highlights the other nodes
   that have a real relation to it, and says what the relation is. The rules
   below are the only ones used, and each produces a sentence — there is no
   "related because they are both about Jupiter-ish things". If no rule fires,
   nothing lights up, which is the honest answer. */

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function esc(s) { return String(s == null ? "" : s); }

  var C = null;            /* the live context */
  var SEL = [];            /* selected node ids, in click order */
  var FORCE = null;        /* a composer the user pinned */
  var PLAY = false, RAF = null, T0 = 0, DUR = 15;
  var LAST = null;         /* the last render result */
  var SHOTS = [];          /* the storyboard: [{sel, force, seconds, label}] */
  var STORY = false;       /* true while the storyboard is what plays */

  var DOM_LABEL = {
    sky: "Sky & grahas", rashi: "Rāśis", bhava: "Bhāvas", nakshatra: "Nakṣatras",
    varga: "Vargas", bala: "Strength & dignity", ashtakavarga: "Aṣṭakavarga",
    dasha: "Daśās", jaimini: "Jaimini & special points", yoga: "Yogas",
    panchanga: "Pañcāṅga & muhūrta", transit: "Transits", cosmic: "Cosmic time"
  };

  /* ---- context ---------------------------------------------------------- */
  function readBirth() {
    try {
      var raw = localStorage.getItem("nirayana.birth");
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function buildContext(whenMs) {
    var b = readBirth(), J = null;
    if (b && window.buildLocalChart) {
      try { J = window.buildLocalChart(b); } catch (e) { J = null; }
    }
    var place = (b && b.lat != null)
      ? { name: b.name || "your birth place", lat: b.lat, lon: b.lon, tz: b.tzHours }
      : { name: "New Delhi", lat: 28.6139, lon: 77.2090, tz: 5.5 };
    var sp = $("sp-place");
    if (sp && sp.dataset && sp.dataset.lat)
      place = { name: sp.value || place.name, lat: +sp.dataset.lat,
                lon: +sp.dataset.lon, tz: +sp.dataset.tz };
    var when = whenMs || Date.now();
    var day = null;
    try { if (window.NP && window.NP.day) day = window.NP.day(when, place); }
    catch (e) {}
    var spanEl = $("sp-span");
    return { J: J, when: when, place: place, day: day,
             spanDays: spanEl ? +spanEl.value : 365, birth: b };
  }

  /* ---- relationship discovery -------------------------------------------
     Each rule returns a sentence or null. A node pair with no sentence is not
     related, and is not highlighted. */
  function grahaIn(id) {
    var SA = window.SPNodes.SA;
    for (var i = 0; i < SA.length; i++)
      if (id.indexOf("." + SA[i]) >= 0 || id.indexOf(SA[i]) >= 0) return SA[i];
    return null;
  }
  function tailOf(id) { var p = id.split("."); return p[p.length - 1]; }
  function related(id) {
    var node = window.SPNodes.byId(id);
    if (!node) return [];
    var v = window.SPNodes.resolve(node, C);
    var g = grahaIn(id), out = [];
    var mdLord = null;
    try { var cm = window.SPNodes.currentMd(C); mdLord = cm && cm.lord; } catch (e) {}
    /* which graha rules the sign a longitude falls in */
    var dispOf = null;
    if (v && v.kind === "lon")
      dispOf = window.SPNodes.LORD[Math.floor(window.SPNodes.norm(v.deg) / 30)];

    window.SPNodes.all().forEach(function (o) {
      if (o.id === id) return;
      var why = null;
      var og = grahaIn(o.id);

      if (g && og === g && o.dom !== node.dom)
        why = "the same graha, read in another domain";
      else if (g && og === g)
        why = "another facet of " + g;
      else if (dispOf && og === dispOf && o.id.indexOf("sky.lon.") === 0)
        why = dispOf + " rules the sign this falls in";
      else if (mdLord && og === mdLord && o.id.indexOf("sky.lon.") === 0 &&
               node.dom === "dasha")
        why = "where the running daśā lord stands";
      else if (v && v.kind === "lon" && o.roles.indexOf("lanes") >= 0)
        why = "a division this longitude can be taken down through";
      else if (v && v.kind === "lanes" && o.roles.indexOf("lon") >= 0 &&
               o.dom === "sky")
        why = "a point that can be zoomed inside this division";
      else if (v && v.kind === "lon" && o.roles.indexOf("lon") >= 0 &&
               o.dom === node.dom && o.dom !== "nakshatra" && o.dom !== "rashi")
        why = "another longitude — the angle between them can be drawn";
      else if (v && (v.kind === "sset" || v.kind === "scalar") &&
               o.roles.indexOf("sset") >= 0 && o.dom === node.dom)
        why = "a magnitude on the same kind of axis";
      else if (v && v.kind === "spanset" && o.roles.indexOf("series") >= 0)
        why = "something that can be traced across this period";
      else if (node.dom === "varga" && o.dom === "varga" &&
               tailOf(o.id) === tailOf(id) && o.id !== id)
        why = "the same division, seen the other way";

      if (why) out.push({ id: o.id, why: why });
    });
    return out;
  }
  function relatedSet() {
    var map = {};
    SEL.forEach(function (id) {
      related(id).forEach(function (r) {
        if (SEL.indexOf(r.id) >= 0) return;
        if (!map[r.id]) map[r.id] = r.why;
      });
    });
    return map;
  }

  /* ---- the command wall -------------------------------------------------- */
  var WALL = null;
  function buildWall() {
    var host = $("sp-wall"); if (!host) return;
    host.innerHTML = "";
    var byDom = {};
    window.SPNodes.all().forEach(function (n) {
      (byDom[n.dom] = byDom[n.dom] || []).push(n); });
    WALL = {};
    Object.keys(byDom).forEach(function (d) {
      var sec = el("section", "spgrp");
      sec.setAttribute("data-dom", d);
      var h = el("h3", null, (DOM_LABEL[d] || d) + " ");
      var cnt = el("span", "spcount", String(byDom[d].length));
      h.appendChild(cnt);
      sec.appendChild(h);
      var box = el("div", "spchips");
      byDom[d].forEach(function (n) {
        var b = el("button", "spchip", n.label);
        b.type = "button";
        b.title = n.hint || n.label;
        b.setAttribute("data-id", n.id);
        b.addEventListener("click", function () { toggle(n.id); });
        box.appendChild(b);
        WALL[n.id] = b;
      });
      sec.appendChild(box);
      host.appendChild(sec);
    });
    refreshWall();
  }
  function refreshWall() {
    if (!WALL) return;
    var rel = relatedSet();
    var q = (($("sp-search") && $("sp-search").value) || "").toLowerCase().trim();
    var onlyLive = $("sp-onlylive") && $("sp-onlylive").checked;
    var shown = 0, live = 0;
    window.SPNodes.all().forEach(function (n) {
      var b = WALL[n.id]; if (!b) return;
      var v = window.SPNodes.resolve(n, C);
      var has = !!v;
      if (has) live++;
      var match = !q || n.label.toLowerCase().indexOf(q) >= 0 ||
                  n.id.toLowerCase().indexOf(q) >= 0 ||
                  (n.hint || "").toLowerCase().indexOf(q) >= 0 ||
                  (DOM_LABEL[n.dom] || n.dom).toLowerCase().indexOf(q) >= 0;
      if (onlyLive && !has) match = false;
      b.hidden = !match;
      if (match) shown++;
      b.className = "spchip" +
        (SEL.indexOf(n.id) >= 0 ? " on" : "") +
        (!has ? " off" : "") +
        (rel[n.id] ? " rel" : "");
      b.title = has ? (rel[n.id] ? rel[n.id] : (n.hint || n.label))
                    : (n.label + " — not available for this chart or moment");
      if (v) b.setAttribute("data-kind", v.kind); else b.removeAttribute("data-kind");
    });
    /* hide a group whose chips are all filtered away */
    [].forEach.call(document.querySelectorAll(".spgrp"), function (sec) {
      var any = false;
      [].forEach.call(sec.querySelectorAll(".spchip"), function (b) {
        if (!b.hidden) any = true; });
      sec.hidden = !any;
    });
    var st = $("sp-wallstat");
    if (st) st.textContent = shown + " shown · " + live + " of " +
      window.SPNodes.all().length + " available here";
  }

  /* ---- the tray ---------------------------------------------------------- */
  function refreshTray() {
    var host = $("sp-tray"); if (!host) return;
    host.innerHTML = "";
    if (!SEL.length) {
      host.appendChild(el("p", "spmuted",
        "Nothing selected. Click anything on the wall — one chip, or six. " +
        "Whatever you pick, the stage will find a way to draw it."));
      return;
    }
    SEL.forEach(function (id, i) {
      var n = window.SPNodes.byId(id); if (!n) return;
      var v = window.SPNodes.resolve(n, C);
      var row = el("div", "sprow" + (v ? "" : " dead"));
      var a = el("button", "sprowx", "×");
      a.type = "button";
      a.setAttribute("aria-label", "remove " + n.label);
      a.addEventListener("click", function () { toggle(id); });
      var t = el("div", "sprowt");
      t.appendChild(el("b", null, n.label));
      t.appendChild(el("span", "spkind", v ? v.kind : "unavailable"));
      t.appendChild(el("small", null, DOM_LABEL[n.dom] || n.dom));
      row.appendChild(t); row.appendChild(a);
      host.appendChild(row);
    });
    /* why these go together */
    if (SEL.length > 1) {
      var links = [];
      SEL.forEach(function (a2) {
        related(a2).forEach(function (r) {
          if (SEL.indexOf(r.id) > SEL.indexOf(a2)) {
            var nb = window.SPNodes.byId(r.id);
            var na = window.SPNodes.byId(a2);
            if (na && nb) links.push(na.label + " → " + nb.label + ": " + r.why);
          }
        });
      });
      var box = el("div", "splinks");
      box.appendChild(el("b", null, links.length
        ? "How these connect" : "No stated relation between these"));
      if (links.length)
        links.slice(0, 6).forEach(function (L) { box.appendChild(el("p", null, L)); });
      else
        box.appendChild(el("p", null,
          "They can still be drawn together — the stage will put them in " +
          "separate panels — but nothing in the engine links them."));
      host.appendChild(box);
    }
  }
  function refreshViews() {
    var host = $("sp-views"); if (!host) return;
    host.innerHTML = "";
    var opts = (LAST && LAST.options) || [];
    if (!opts.length) { host.appendChild(el("span", "spmuted", "—")); return; }
    opts.forEach(function (o) {
      var b = el("button", "spview" +
        ((FORCE ? FORCE === o.key : (LAST && LAST.composer === o.key)) ? " on" : ""),
        o.label);
      b.type = "button"; b.title = o.blurb;
      b.addEventListener("click", function () {
        FORCE = (FORCE === o.key) ? null : o.key; draw(); });
      host.appendChild(b);
    });
  }
  function refreshNotes() {
    var host = $("sp-notes"); if (!host) return;
    host.innerHTML = "";
    if (!LAST) return;
    if (LAST.composer) {
      var p = el("p", null, "Drawn as ");
      p.appendChild(el("b", null, LAST.label));
      p.appendChild(document.createTextNode(
        FORCE ? " — you pinned this view." : " — the best fit for what is selected."));
      host.appendChild(p);
    }
    (LAST.missing || []).forEach(function (m) {
      host.appendChild(el("p", "spwarn",
        (m.label || m.id) + " — " + m.why + ", so it is not on the frame."));
    });
  }

  /* ---- the stage --------------------------------------------------------- */
  function draw() {
    if (!window.SPStage || !C) return;
    LAST = (STORY && SHOTS.length)
      ? window.SPStage.renderStory(SHOTS, C, window.SPStage.S.p)
      : window.SPStage.render(SEL, C, window.SPStage.S.p, FORCE);
    fitPreview();
    refreshViews(); refreshNotes();
  }

  /* ---- the storyboard ---------------------------------------------------- */
  function shotLabel(sh) {
    if (sh.label) return sh.label;
    var names = sh.sel.map(function (id) {
      var n = window.SPNodes.byId(id); return n ? n.label : id; });
    return names.slice(0, 3).join(" + ") + (names.length > 3 ? " +" + (names.length - 3) : "");
  }
  function addShot() {
    if (!SEL.length) { flash("Select something first, then add it as a shot."); return; }
    SHOTS.push({ sel: SEL.slice(), force: FORCE, seconds: 5 });
    STORY = true;
    refreshShots(); saveState(); draw();
  }
  function refreshShots() {
    var host = $("sp-shots"); if (!host) return;
    host.innerHTML = "";
    var tot = $("sp-shottotal");
    if (!SHOTS.length) {
      host.appendChild(el("p", "spmuted",
        "No shots yet. Build a selection, then press “Add as a shot”. " +
        "Two or three shots make a reel that holds attention; one makes a card."));
      if (tot) tot.textContent = "";
      var tb = $("sp-storytoggle"); if (tb) tb.hidden = true;
      return;
    }
    SHOTS.forEach(function (sh, i) {
      var row = el("div", "sprow" + (LAST && STORY && LAST.shot === i ? " live" : ""));
      var t = el("div", "sprowt");
      t.appendChild(el("b", null, (i + 1) + ". " + shotLabel(sh)));
      t.appendChild(el("small", null,
        (sh.force ? "pinned: " + sh.force + " · " : "") + sh.sel.length + " node(s)"));
      row.appendChild(t);
      var sec = document.createElement("input");
      sec.type = "number"; sec.min = "1"; sec.max = "30"; sec.value = String(sh.seconds);
      sec.className = "spsec";
      sec.setAttribute("aria-label", "seconds for shot " + (i + 1));
      sec.addEventListener("change", function () {
        sh.seconds = Math.max(1, Math.min(30, +sec.value || 5));
        refreshShots(); saveState(); });
      row.appendChild(sec);
      [["↑", -1], ["↓", 1]].forEach(function (mv) {
        var b = el("button", "sprowx", mv[0]);
        b.type = "button";
        b.setAttribute("aria-label", (mv[1] < 0 ? "move up" : "move down"));
        b.addEventListener("click", function () {
          var j = i + mv[1];
          if (j < 0 || j >= SHOTS.length) return;
          var tmp = SHOTS[i]; SHOTS[i] = SHOTS[j]; SHOTS[j] = tmp;
          refreshShots(); saveState(); draw(); });
        row.appendChild(b);
      });
      var x = el("button", "sprowx", "×");
      x.type = "button"; x.setAttribute("aria-label", "remove shot " + (i + 1));
      x.addEventListener("click", function () {
        SHOTS.splice(i, 1);
        if (!SHOTS.length) STORY = false;
        refreshShots(); saveState(); draw(); });
      row.appendChild(x);
      /* clicking the row loads that shot back into the wall for editing */
      t.style.cursor = "pointer";
      t.addEventListener("click", function () {
        SEL = sh.sel.slice(); FORCE = sh.force || null; STORY = false;
        var tb2 = $("sp-storytoggle"); if (tb2) tb2.checked = false;
        refreshWall(); refreshTray(); refreshShots(); draw(); });
      host.appendChild(row);
    });
    if (tot) tot.textContent = "Reel length " +
      window.SPStage.storyTotal(SHOTS) + " s across " + SHOTS.length + " shot(s).";
    var tb3 = $("sp-storytoggle");
    if (tb3) { tb3.hidden = false; tb3.checked = STORY; }
  }
  function fitPreview() {
    var cv = $("sp-canvas"), box = $("sp-stagebox");
    if (!cv || !box) return;
    var r = window.SPStage.RATIOS[window.SPStage.S.ratio];
    var maxH = Math.max(320, Math.min(window.innerHeight * 0.62, 760));
    var h = maxH, w = h * r.w / r.h;
    if (w > box.clientWidth - 8) { w = box.clientWidth - 8; h = w * r.h / r.w; }
    cv.style.width = Math.round(w) + "px";
    cv.style.height = Math.round(h) + "px";
  }
  function toggle(id) {
    var i = SEL.indexOf(id);
    if (i >= 0) SEL.splice(i, 1);
    else {
      if (SEL.length >= 8) { flash("Eight is the most the stage will take at once."); return; }
      SEL.push(id);
    }
    FORCE = null;
    refreshWall(); refreshTray(); draw();
    saveState();
  }
  function flash(msg) {
    var f = $("sp-flash"); if (!f) return;
    f.textContent = msg; f.hidden = false;
    clearTimeout(flash._t);
    flash._t = setTimeout(function () { f.hidden = true; }, 3200);
  }

  /* ---- playback ---------------------------------------------------------- */
  function tick() {
    if (!PLAY) return;
    var el2 = (Date.now() - T0) / 1000;
    window.SPStage.S.p = (el2 % DUR) / DUR;
    var sc = $("sp-scrub"); if (sc) sc.value = String(Math.round(window.SPStage.S.p * 1000));
    draw();
    RAF = requestAnimationFrame(tick);
  }
  function play(on) {
    PLAY = on;
    /* a storyboard plays for its own total, not the single-shot length */
    if (STORY && SHOTS.length) DUR = window.SPStage.storyTotal(SHOTS);
    else { var d = $("sp-dur"); if (d) DUR = +d.value; }
    var b = $("sp-play");
    if (b) b.textContent = on ? "Pause" : "Play";
    if (on) { T0 = Date.now() - window.SPStage.S.p * DUR * 1000; tick(); }
    else if (RAF) { cancelAnimationFrame(RAF); RAF = null; }
  }

  /* ---- persistence: the selection survives a reload ---------------------- */
  function saveState() {
    try {
      localStorage.setItem("nirayana.studiopro", JSON.stringify({
        sel: SEL, ratio: window.SPStage.S.ratio, pal: window.SPStage.S.pal,
        safe: window.SPStage.S.safe, head: window.SPStage.S.headline,
        sub: window.SPStage.S.sub, shots: SHOTS, story: STORY }));
    } catch (e) {}
  }
  function loadState() {
    try {
      var o = JSON.parse(localStorage.getItem("nirayana.studiopro") || "null");
      if (!o) return;
      if (o.sel && o.sel.length) SEL = o.sel.filter(function (id) {
        return !!window.SPNodes.byId(id); });
      if (o.ratio) window.SPStage.S.ratio = o.ratio;
      if (o.pal) window.SPStage.S.pal = o.pal;
      if (o.safe != null) window.SPStage.S.safe = o.safe;
      if (o.head) window.SPStage.S.headline = o.head;
      if (o.sub) window.SPStage.S.sub = o.sub;
      if (o.shots && o.shots.length) {
        SHOTS = o.shots.filter(function (sh) {
          return sh && sh.sel && sh.sel.length; });
        STORY = !!o.story && SHOTS.length > 0;
      }
    } catch (e) {}
  }

  /* ---- export ------------------------------------------------------------ */
  function savePng() {
    var cv = $("sp-canvas");
    cv.toBlob(function (b) {
      var u = URL.createObjectURL(b), a = document.createElement("a");
      a.href = u; a.download = "nirayana-studio-pro.png";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
    }, "image/png");
  }
  function saveVideo() {
    var btn = $("sp-rec"); if (!btn) return;
    var was = btn.textContent;
    btn.disabled = true;
    play(false);
    var what = (STORY && SHOTS.length) ? SHOTS : SEL;
    window.SPStage.record(what, C, DUR, 30, FORCE, function (f) {
      btn.textContent = "Recording " + Math.round(f * 100) + "%";
    }).then(function (res) {
      btn.disabled = false; btn.textContent = was;
      var ext = res.mime.indexOf("mp4") >= 0 ? "mp4" : "webm";
      var u = URL.createObjectURL(res.blob), a = document.createElement("a");
      a.href = u; a.download = "nirayana-studio-pro." + ext;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(u); }, 8000);
      flash("Recorded " + res.seconds + " s, " +
            Math.round(res.blob.size / 1024) + " KB.");
    }).catch(function (e) {
      btn.disabled = false; btn.textContent = was;
      flash("Could not record: " + (e && e.message || e) +
            " — the still export always works.");
    });
  }

  /* ---- wiring ------------------------------------------------------------ */
  function bind() {
    var cv = $("sp-canvas");
    if (!cv) return;
    window.SPStage.attach(cv);
    loadState();
    window.SPStage.resize();

    C = buildContext();
    buildWall();
    refreshTray();
    refreshShots();

    /* mode banner: a chart, or live only */
    var mode = $("sp-mode");
    if (mode) {
      if (C.J) mode.textContent = "Reading the chart stored in this browser" +
        (C.birth && C.birth.name ? " — " + C.birth.name : "") +
        ". Everything on the wall is available.";
      else {
        mode.textContent = "No birth chart stored in this browser, so the " +
          "chart-only nodes are greyed. Everything about the sky, the day and " +
          "the divisions still works. Build a chart on the Kundli page to " +
          "unlock the rest.";
        mode.className = "spnote warn";
      }
    }

    $("sp-search") && $("sp-search").addEventListener("input", refreshWall);
    $("sp-onlylive") && $("sp-onlylive").addEventListener("change", refreshWall);
    $("sp-clear") && $("sp-clear").addEventListener("click", function () {
      SEL = []; FORCE = null; refreshWall(); refreshTray(); draw(); saveState(); });

    [].forEach.call(document.querySelectorAll("[data-spratio]"), function (b) {
      b.addEventListener("click", function () {
        window.SPStage.S.ratio = b.getAttribute("data-spratio");
        [].forEach.call(document.querySelectorAll("[data-spratio]"), function (o) {
          o.className = "spv" + (o === b ? " on" : ""); });
        window.SPStage.resize(); draw(); saveState();
      });
      if (b.getAttribute("data-spratio") === window.SPStage.S.ratio)
        b.className = "spv on";
    });
    [].forEach.call(document.querySelectorAll("[data-sppal]"), function (b) {
      b.addEventListener("click", function () {
        window.SPStage.S.pal = b.getAttribute("data-sppal");
        [].forEach.call(document.querySelectorAll("[data-sppal]"), function (o) {
          o.className = "spv" + (o === b ? " on" : ""); });
        draw(); saveState();
      });
      if (b.getAttribute("data-sppal") === window.SPStage.S.pal)
        b.className = "spv on";
    });
    var safe = $("sp-safe");
    if (safe) {
      safe.checked = window.SPStage.S.safe;
      safe.addEventListener("change", function () {
        window.SPStage.S.safe = safe.checked; draw(); saveState(); });
    }
    var scrub = $("sp-scrub");
    if (scrub) scrub.addEventListener("input", function () {
      play(false);
      window.SPStage.S.p = (+scrub.value) / 1000; draw(); });
    $("sp-play") && $("sp-play").addEventListener("click", function () { play(!PLAY); });
    var dur = $("sp-dur");
    if (dur) dur.addEventListener("change", function () { DUR = +dur.value; });
    var head = $("sp-head");
    if (head) {
      head.value = window.SPStage.S.headline;
      head.addEventListener("input", function () {
        window.SPStage.S.headline = head.value; draw(); saveState(); });
    }
    var sub = $("sp-sub");
    if (sub) {
      sub.value = window.SPStage.S.sub;
      sub.addEventListener("input", function () {
        window.SPStage.S.sub = sub.value; draw(); saveState(); });
    }
    var when = $("sp-when");
    if (when) {
      var d = new Date(C.when - new Date().getTimezoneOffset() * 60000);
      when.value = d.toISOString().slice(0, 16);
      when.addEventListener("change", function () {
        var t = Date.parse(when.value);
        C = buildContext(isFinite(t) ? t : Date.now());
        refreshWall(); refreshTray(); draw();
      });
    }
    var span = $("sp-span");
    if (span) span.addEventListener("change", function () {
      C = buildContext(C.when); draw(); });
    $("sp-addshot") && $("sp-addshot").addEventListener("click", addShot);
    var tog = $("sp-storytoggle");
    if (tog) tog.addEventListener("change", function () {
      STORY = tog.checked; window.SPStage.S.p = 0; refreshShots(); draw(); saveState(); });
    $("sp-clearshots") && $("sp-clearshots").addEventListener("click", function () {
      SHOTS = []; STORY = false; refreshShots(); draw(); saveState(); });
    $("sp-png") && $("sp-png").addEventListener("click", savePng);
    $("sp-rec") && $("sp-rec").addEventListener("click", saveVideo);

    /* the list of what is deliberately missing */
    var ab = $("sp-absent");
    if (ab) window.SPNodes.absent.forEach(function (a) {
      var li = el("li");
      li.appendChild(el("b", null, a.what));
      li.appendChild(document.createTextNode(" — " + a.why));
      ab.appendChild(li);
    });

    window.addEventListener("resize", function () { fitPreview(); });
    draw();
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", bind);
  else bind();

  /* a hook for the page test: drive the whole UI without a mouse */
  try {
    window.__spUI = {
      select: function (ids) { SEL = ids.slice(); FORCE = null;
        refreshWall(); refreshTray(); draw(); return LAST; },
      last: function () { return LAST; },
      ctx: function () { return C; },
      related: related,
      shots: function () { return SHOTS.slice(); },
      addShot: function () { addShot(); return SHOTS.length; },
      setStory: function (on) { STORY = on; refreshShots(); draw(); return STORY; },
      nodeCount: function () { return window.SPNodes.all().length; }
    };
  } catch (e) {}
})();
