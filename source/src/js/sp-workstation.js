/* ===== The Kinetic Workstation ============================================

   WHAT THIS PAGE IS. One surface over engines that already exist and are
   already tested. It computes nothing of its own: the Śrīpati cusps come
   from SPSripati, the year from SPGochara, the readings from SPRashiphal,
   the divisions from the report's own varga matrix, and the chart from the
   same cast the builder performs. That is deliberate. A second
   implementation of any of this would be a second thing to keep right, and
   the first time the two disagreed the reader would have no way to tell
   which was lying.

   WHY A SEPARATE PAGE RATHER THAN MORE TABS ON THE BUILDER. The builder is
   a reference page that happens to compute: prose, then a form, then a
   report, read top to bottom. This is a workstation: pick a view, work in
   it, switch. Those are different shapes and forcing one to be the other
   makes both worse. The builder is untouched.

   THE KINETIC PART, and why it is not decoration. The chart draws itself
   on recalculation — lines stroke in, grahas pop — and a house lights when
   you click it. The reason that earns its place is that a chalita chart
   and a whole-sign chart differ in ONE or TWO placements, and a reader
   comparing two static diamonds will not find them. Drawing the difference
   as motion, and letting a click light one house across both, turns
   "somewhere in these two grids something moved" into something the eye
   catches. Every animation here is doing that job; none of it is a
   flourish.

   REDUCED MOTION is honoured throughout — the drawing and the beams are
   switched off, not merely shortened, because someone who asks for no
   motion means it. */

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c];
    });
  }
  function calm() {
    try {
      return window.matchMedia &&
             window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (e) { return false; }
  }

  var SA = ["Meṣa", "Vṛṣabha", "Mithuna", "Karka", "Siṃha", "Kanyā",
            "Tulā", "Vṛścika", "Dhanus", "Makara", "Kumbha", "Mīna"];
  var LORD = ["Maṅgala", "Śukra", "Budha", "Candra", "Sūrya", "Budha",
              "Śukra", "Maṅgala", "Guru", "Śani", "Śani", "Guru"];
  var GL = { Sun: "Sū", Moon: "Ca", Mars: "Ma", Mercury: "Bu",
             Jupiter: "Gu", Venus: "Śu", Saturn: "Śa", Rahu: "Rā",
             Ketu: "Ke" };
  /* graha aspects by house offset, the same table the report uses */
  var ASP = { Sun: [7], Moon: [7], Mercury: [7], Venus: [7],
              Mars: [4, 7, 8], Jupiter: [5, 7, 9], Saturn: [3, 7, 10],
              Rahu: [7], Ketu: [7] };

  var VIEW = "kundli", HOUSE = null, BUILT = {};

  function chart() {
    try {
      return (window.__kApi && window.__kApi.chart &&
              window.__kApi.chart()) || null;
    } catch (e) { return null; }
  }

  /* ---- the North Indian diamond, drawn so it can be animated and clicked
     The report's own northChart() returns a finished string; this one has
     to expose its polygons, so it is drawn here. The geometry is the
     standard one: a square, both diagonals, and the inner diamond, giving
     twelve regions. */
  var NP = [[200, 100], [100, 50], [50, 100], [100, 200], [50, 300],
            [100, 350], [200, 300], [300, 350], [350, 300], [300, 200],
            [350, 100], [300, 50]];
  var POLY = [
    "150,50 250,50 200,100", "100,0 200,0 100,100".replace(/\d+/g, function () { return arguments[0]; }),
    "", "", "", "", "", "", "", "", "", ""
  ];
  /* the twelve house polygons of the North Indian chart, in order */
  var HOUSE_POLY = [
    "200,0 300,100 200,200 100,100",      /* 1  centre top diamond */
    "0,0 200,0 100,100",                  /* 2  top left triangle */
    "0,0 100,100 0,200",                  /* 3  left upper triangle */
    "0,200 100,100 200,200 100,300",      /* 4  left centre diamond */
    "0,200 100,300 0,400",                /* 5  left lower triangle */
    "0,400 100,300 200,400",              /* 6  bottom left triangle */
    "100,300 200,200 300,300 200,400",    /* 7  bottom centre diamond */
    "200,400 300,300 400,400",            /* 8  bottom right triangle */
    "400,400 300,300 400,200",            /* 9  right lower triangle */
    "400,200 300,300 200,200 300,100",    /* 10 right centre diamond */
    "400,200 300,100 400,0",              /* 11 right upper triangle */
    "400,0 300,100 200,0"                 /* 12 top right triangle */
  ];
  /* where the label sits inside each region */
  var HOUSE_AT = [[200, 85], [110, 40], [40, 110], [110, 200], [40, 290],
                  [110, 360], [200, 320], [290, 360], [360, 290],
                  [290, 200], [360, 110], [290, 40]];

  function diamond(id, signOf, occOf, title, opts) {
    opts = opts || {};
    var anim = !calm() && opts.animate !== false;
    var o = '<figure class="wschart"><figcaption>' + esc(title) +
      (opts.sub ? '<span>' + esc(opts.sub) + '</span>' : '') + '</figcaption>' +
      '<svg viewBox="-4 -4 408 408" class="wssvg" id="' + id + '" ' +
      'role="img" aria-label="' + esc(title) + '">';
    o += '<rect x="0" y="0" width="400" height="400" class="wsbg"/>';
    var lines = ["M0,0 L400,400", "M400,0 L0,400",
                 "M200,0 L400,200 L200,400 L0,200 Z"];
    lines.forEach(function (d, i) {
      o += '<path d="' + d + '" class="wsline' + (anim ? " wsdraw" : "") +
        '" style="animation-delay:' + (i * 90) + 'ms"/>';
    });
    o += '<rect x="0" y="0" width="400" height="400" class="wsframe"/>';
    for (var h = 1; h <= 12; h++) {
      var sg = signOf(h), occ = occOf(h) || [];
      var at = HOUSE_AT[h - 1];
      o += '<polygon points="' + HOUSE_POLY[h - 1] + '" class="wshouse" ' +
        'data-house="' + h + '" tabindex="0" role="button" ' +
        'aria-label="Bhāva ' + h + ', ' + esc(SA[sg]) + '"/>';
      o += '<text x="' + at[0] + '" y="' + (at[1] - 10) + '" class="wshn">' +
        h + '</text>';
      o += '<text x="' + at[0] + '" y="' + at[1] + '" class="wshs">' +
        esc(SA[sg]) + '</text>';
      occ.forEach(function (p, k) {
        o += '<text x="' + at[0] + '" y="' + (at[1] + 15 + k * 13) +
          '" class="wshp' + (anim ? " wspop" : "") + '" ' +
          'style="animation-delay:' + (300 + k * 60) + 'ms">' + esc(p) +
          '</text>';
      });
    }
    o += '<g class="wsbeams" id="' + id + '-beams"></g>';
    return o + '</svg></figure>';
  }

  /* ---- dṛṣṭi beams -------------------------------------------------------
     Drawn between house centres, from each graha to the houses it aspects.
     They are off by default: nine grahas aspecting three houses each is
     twenty-odd lines and an unreadable cat's cradle. One house at a time,
     lit on click, is the version that tells you something. */
  function beamsFor(D, house) {
    if (!D || !house) return "";
    var out = [], LS = D.LS;
    (D.planets || []).forEach(function (p) {
      var from = p.house;
      var offs = ASP[p.en] || [7];
      offs.forEach(function (o) {
        var to = ((from - 1 + o - 1) % 12) + 1;
        if (to !== house) return;
        var a = HOUSE_AT[from - 1], b = HOUSE_AT[to - 1];
        out.push('<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] +
          '" y2="' + b[1] + '" class="wsbeam' + (calm() ? "" : " wsflow") +
          '"><title>' + esc(p.en) + ' aspects bhāva ' + to +
          ' (' + o + 'th)</title></line>');
      });
    });
    return out.join("");
  }

  function aspectsOn(D, house) {
    var out = [];
    (D.planets || []).forEach(function (p) {
      (ASP[p.en] || [7]).forEach(function (o) {
        var to = ((p.house - 1 + o - 1) % 12) + 1;
        if (to === house) out.push(p.en + " (" + o + "th)");
      });
    });
    return out;
  }

  /* ---- view 1: the chart and the chalita beside it ----------------------- */
  function viewKundli(D) {
    if (!D) return need("A chart is needed for this view.");
    var A = window.SPSripati && window.SPSripati.analyse(D);
    var LS = D.LS, occW = {}, occS = {};
    (D.planets || []).forEach(function (p) {
      (occW[p.house] = occW[p.house] || []).push(GL[p.en] + (p.retro ? "℞" : ""));
    });
    if (A) A.rows.forEach(function (r) {
      (occS[r.sripati] = occS[r.sripati] || []).push(GL[r.body] + (r.retro ? "℞" : ""));
    });
    var html = '<div class="wsrow2">' +
      diamond("ws-d1", function (h) { return (LS + h - 1) % 12; },
        function (h) { var a = (occW[h] || []).slice(); if (h === 1) a.unshift("Lg"); return a; },
        "Rāśi · whole-sign", { sub: "the frame the report reads from" }) +
      (A ? diamond("ws-ch", function (h) { return A.houses[h - 1].sign; },
        function (h) { var a = (occS[h] || []).slice(); if (h === 1) a.unshift("Lg"); return a; },
        "Śrīpati bhāva-chalita", { sub: "quadrants trisected between the angles" })
        : '<p class="knote">No meridian, so no chalita chart.</p>') +
      '</div>';
    html += '<div class="wsinspect" id="ws-inspect"><p class="wshint">' +
      'Click any bhāva in either chart to inspect its cusp, its sandhi ' +
      'span, its lord, its occupants and the dṛṣṭi falling on it. The ' +
      'same bhāva lights in both charts at once, which is how the ' +
      'disagreement between the two systems becomes visible.</p></div>';
    return html;
  }

  function inspect(D, h) {
    var A = window.SPSripati && window.SPSripati.analyse(D);
    if (!A) return "";
    var H = A.houses[h - 1];
    var asp = aspectsOn(D, h);
    var moved = A.shifts.filter(function (r) {
      return r.sripati === h || r.whole === h;
    });
    return '<div class="wsinsp">' +
      '<h4>Bhāva ' + h + ' <span>' + esc(SA[H.sign]) + ' · lord ' +
      esc(LORD[H.sign]) + '</span></h4>' +
      '<dl class="wsdl">' +
      '<dt>Bhāva madhya (cusp)</dt><dd>' + esc(SA[H.sign]) + ' ' +
      fmtDeg(H.madhya % 30) + '</dd>' +
      '<dt>Sandhi span</dt><dd>' +
      esc(SA[Math.floor(H.sandhiStart / 30) % 12]) + ' ' +
      fmtDeg(H.sandhiStart % 30) + ' → ' +
      esc(SA[Math.floor(H.sandhiEnd / 30) % 12]) + ' ' +
      fmtDeg(H.sandhiEnd % 30) + '</dd>' +
      '<dt>Width</dt><dd>' + H.width.toFixed(2) + '°' +
      (Math.abs(H.width - 30) > 0.01 ?
        ' <span class="wsdim">(' + (H.width > 30 ? "wider" : "narrower") +
        ' than 30° — the quadrants are unequal)</span>' : '') + '</dd>' +
      '<dt>Occupants · Śrīpati</dt><dd>' + (H.occupants.join(", ") || "—") + '</dd>' +
      '<dt>Occupants · whole-sign</dt><dd>' + (H.wholeOccupants.join(", ") || "—") + '</dd>' +
      '<dt>Dṛṣṭi received</dt><dd>' + (asp.join(", ") || "—") + '</dd>' +
      (moved.length ? '<dt>Disagreement</dt><dd class="wswarn">' +
        moved.map(function (r) {
          return esc(r.body) + ": whole-sign " + r.whole + ", Śrīpati " +
            r.sripati;
        }).join("; ") + '</dd>' : "") +
      '</dl></div>';
  }
  function fmtDeg(x) {
    var d = Math.floor(x), m = Math.floor((x - d) * 60);
    return d + "°" + (m < 10 ? "0" : "") + m + "′";
  }

  /* ---- view 2 and 3: the year, and the readings -------------------------- */
  /* Each of the two views gets a host of its OWN id. They shared one at
     first, and getElementById returns the first match, so opening the
     Rāśiphal tab found the Gochara tab's host, moved nothing, and showed
     an empty panel. */
  function viewGochara(key) {
    return '<div class="wsgo" id="ws-host-' + key + '"></div>';
  }

  /* ---- view 4: every graha's exact position ------------------------------ */
  function viewGanita(D) {
    if (!D) return need("A chart is needed for this view.");
    var rows = (D.planets || []).map(function (p) {
      var n = p.nak || {};
      return '<tr><td><b>' + esc(p.en) + '</b></td>' +
        '<td>' + esc(SA[p.sign]) + '</td>' +
        '<td class="knum">' + fmtDeg(p.sid - p.sign * 30) + '</td>' +
        '<td class="knum">' + p.sid.toFixed(4) + '°</td>' +
        '<td>' + esc(n.name || "—") + (n.pada ? " · " + n.pada : "") + '</td>' +
        '<td>' + esc(p.dignity || "—") + '</td>' +
        '<td class="knum">' + (p.speed == null ? "—" :
          p.speed.toFixed(4) + "°/d") + '</td>' +
        '<td>' + (p.retro ? '<span class="wsretro">vakrī</span>' : "mārgī") +
        '</td></tr>';
    }).join("");
    return '<p class="knote">Sidereal longitudes at the birth instant, with ' +
      'the nakṣatra and pāda each falls in, the Parāśarī dignity, and the ' +
      'daily motion that decides whether a graha is direct or retrograde. ' +
      'These are the numbers every other panel is derived from.</p>' +
      '<table class="ktbl gotbl"><thead><tr><th>Graha</th><th>Rāśi</th>' +
      '<th>Degree in rāśi</th><th>Sidereal longitude</th>' +
      '<th>Nakṣatra · pāda</th><th>Dignity</th><th>Gati</th>' +
      '<th>Motion</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  /* ---- view 5: the shifts ------------------------------------------------ */
  function viewShifts(D) {
    if (!D) return need("A chart is needed for this view.");
    try {
      if (window.__kApi && window.__kApi.sripatiPane)
        return window.__kApi.sripatiPane();
    } catch (e) {}
    return need("The Śrīpati panel is unavailable.");
  }

  /* ---- view 6: the sixteen divisions ------------------------------------- */
  function viewVarga(D) {
    if (!D) return need("A chart is needed for this view.");
    try {
      if (window.__kApi && window.__kApi.shodashavarga)
        return window.__kApi.shodashavarga();
    } catch (e) {}
    return need("The divisional matrix is unavailable.");
  }

  /* ---- views 7–9: borrowed whole from the report ------------------------- */
  /* Views 7 to 9 are the report's own sections, taken by id. Copying the
     markup rather than re-rendering it means these panels cannot drift
     from the report; the ids come from the report's own anchors, so a
     section that is renamed shows as an empty view rather than as a wrong
     one. */
  function borrow(ids, label) {
    var host = $("k-out");
    if (!host) return need("Cast a chart to fill the " + label + " view.");
    var out = [];
    ids.forEach(function (id) {
      var n = host.querySelector("#" + id);
      if (n) out.push(n.outerHTML);
    });
    return out.length ? out.join("") :
      need("Cast a chart to fill the " + label + " view.");
  }
  function need(msg) {
    return '<p class="wsneed">' + esc(msg) + '</p>';
  }

  /* ---- the super-JSON ----------------------------------------------------
     Everything the page is showing, in one object, with a manifest saying
     where each part came from and what it is. The manifest matters more
     than the data: a JSON blob handed to a language model with no
     provenance is exactly how a confident wrong answer gets made, so every
     block carries its source tier and the engine that produced it. */
  function superJson() {
    var D = chart();
    var R = (window.SPGocharaUI && window.SPGocharaUI.current &&
             window.SPGocharaUI.current()) || null;
    var out = {
      manifest: {
        produced_by: "Nirayana Kinetic Workstation",
        engine: "LearnHoro built-in engine",
        generated: new Date().toISOString(),
        zodiac: "sidereal (nirayana)",
        ayanamsa: (window.__ayan && D && D.jd) ? window.__ayan(D.jd) : null,
        house_systems: ["whole-sign (primary)", "Śrīpati bhāva-chalita"],
        source_tiers: {
          bphs: "a verse in the uploaded Santhanam translation",
          commentary: "a note by the translator of that edition",
          later: "later tradition, not in the Parāśara verses",
          computed: "produced by this engine from the positions"
        },
        caution: "Educational reference on traditional doctrine. Nothing " +
          "here predicts an event, and none of it should carry weight in " +
          "a decision about health, money, law or safety."
      },
      chart: null, sripati: null, gochara: null, rashiphal: null,
      shodashavarga: null
    };

    if (D) {
      out.chart = {
        input: D.input || null,
        lagna: D.lagna || null,
        mc_sidereal: D.mcSid == null ? null : D.mcSid,
        planets: (D.planets || []).map(function (p) {
          return { graha: p.en, sidereal: p.sid, sign: p.sign,
                   sign_name: SA[p.sign], degree_in_sign: p.sid - p.sign * 30,
                   house_wholesign: p.house, retrograde: !!p.retro,
                   speed: p.speed == null ? null : p.speed,
                   nakshatra: p.nak ? p.nak.name : null,
                   pada: p.nak ? p.nak.pada : null,
                   dignity: p.dignity || null };
        })
      };
      var A = window.SPSripati && window.SPSripati.analyse(D);
      if (A) {
        out.sripati = {
          tier: "later",
          note: "The quadrant trisection is Śrīpati's paddhati, not a " +
                "Parāśara verse. The 15° cusp-strength rule is from the " +
                "Benares (Chaukhambha) edition's special hints, Vol. 1 Ch. 5.",
          quadrants: A.quadrants,
          houses: A.houses.map(function (h) {
            return { bhava: h.house, madhya: h.madhya,
                     sandhi_start: h.sandhiStart, sandhi_end: h.sandhiEnd,
                     width: h.width, sign: h.sign, sign_name: SA[h.sign],
                     lord: LORD[h.sign], occupants: h.occupants,
                     occupants_wholesign: h.wholeOccupants };
          }),
          chalit_shifts: A.shifts.map(function (r) {
            return { graha: r.body, wholesign_house: r.whole,
                     sripati_house: r.sripati,
                     degrees_from_madhya: r.fromMadhya,
                     cusp_strength: r.strength };
          })
        };
      }
      if (window.__kApi && window.__kApi.shodashavargaMatrix) {
        var M = window.__kApi.shodashavargaMatrix();
        if (M) out.shodashavarga = {
          tier: "bphs", source: "BPHS Ch. 6 constructions; the kārya " +
            "column is the tradition's standard association, not a verse.",
          rows: M.map(function (r) {
            var cells = {};
            Object.keys(r.cells).forEach(function (k) {
              cells[k] = r.cells[k] == null ? null :
                { sign: r.cells[k], sign_name: SA[r.cells[k]] };
            });
            return { varga: r.varga, name: r.name, karya: r.karya,
                     cells: cells };
          })
        };
      }
    }

    if (R) {
      out.gochara = {
        tier: "computed",
        year: R.year,
        note: "Ingress and station instants found by bisecting this " +
              "engine's own ephemeris to the minute, under the ayanāṃśa " +
              "selected at the time of computation.",
        events: R.events.map(function (e) {
          return { when: window.SPGochara.jdToDate(e.jd).toISOString(),
                   jd: e.jd, graha: e.body, kind: e.kind,
                   from_sign: e.from == null ? null : e.from,
                   to_sign: e.to == null ? null : e.to,
                   sign: e.sign == null ? null : e.sign,
                   retrograde: !!e.retro };
        }),
        mid_year: window.SPGochara.snapshot(R.year)
      };
      if (window.SPRashiphal) {
        out.rashiphal = {
          tier: "mixed — every rule carries its own tier",
          readings: window.SPRashiphal.SIGNS.map(function (s, i) {
            var r = window.SPRashiphal.read(R, i, D);
            return {
              rashi: s, rashi_index: i, lord: r.lord,
              grahas: r.grahas.map(function (g) {
                return { graha: g.body, house_from_rashi: g.mainHouse,
                         sign: g.mainSign, days: g.mainDays,
                         favourable_by_later_tradition: g.favourable };
              }),
              sani_conditions: r.sani.map(function (x) {
                return { name: x.title, house: x.house, tier: "later",
                         from: window.SPGochara.jdToDate(x.from).toISOString(),
                         to: window.SPGochara.jdToDate(x.to).toISOString() };
              }),
              guru_gochara: r.guru.map(function (g) {
                return { house: g.house, favourable: g.favourable,
                         vedha_house: g.vedhaHouse, obstructed_by: g.blockers,
                         unobstructed: g.clear, tier: "later" };
              }),
              nodal_axis: r.nodes.map(function (n) {
                return { axis: n.axis, rahu_house: n.rahuHouse,
                         ketu_house: n.ketuHouse, tier: "later" };
              }),
              sav_reception: r.sav, ashtakavarga: r.ashtaka,
              pillars: r.pillars
            };
          })
        };
      }
    }
    return out;
  }

  /* ---- rendering a view -------------------------------------------------- */
  function render(key) {
    var host = $("wp-" + key);
    if (!host) return;
    var D = chart();
    var html;
    switch (key) {
      case "kundli":    html = viewKundli(D); break;
      case "gochara":   html = viewGochara("gochara"); break;
      case "rashiphal": html = viewGochara("rashiphal"); break;
      case "ganita":    html = viewGanita(D); break;
      case "shifts":    html = viewShifts(D); break;
      case "varga":     html = viewVarga(D); break;
      case "dasha":     html = borrow(["ks-vimsottari-dasa",
                          "ks-antardasa-and-pratyantardasa",
                          "ks-yogini-dasa", "ks-astottari-dasa"], "daśā"); break;
      case "bala":      html = borrow(["ks-sadbala", "ks-bhava-bala",
                          "ks-ista-and-kasta-phala",
                          "ks-sodasavarga-strength", "ks-yogas"],
                          "strength and yoga"); break;
      case "sav":       html = borrow(["ks-ashtakavarga",
                          "ks-divisional-ashtakavarga", "ks-kaksa-transit"],
                          "ashtakavarga"); break;
      default:          html = "";
    }
    host.innerHTML = html;
    BUILT[key] = true;
    if (key === "kundli") wireChart();
    if (key === "gochara" || key === "rashiphal") moveGochara(key);
  }

  /* The Gochara and Rāśiphal panels are the builder's own markup and its
     own script. Rather than reimplement them, the page moves the live
     nodes into whichever view is open — one instance, one set of
     listeners, no second copy to drift. */
  function moveGochara(key) {
    var host = $("ws-host-" + key);
    if (!host) return;
    var ids = key === "gochara"
      ? ["ws-gobar", "go-out"]
      : ["ws-rpbar", "rp-out"];
    ids.forEach(function (id) {
      var n = $(id);
      if (n) host.appendChild(n);
    });
    /* the year must be computed before a reading can exist, so the
       Rāśiphal view says so rather than showing an empty box */
    if (key === "rashiphal") {
      var out = $("rp-out");
      if (out && !out.innerHTML.trim())
        out.innerHTML = '<p class="wsneed">Compute a year in the ' +
          '<b>Vārṣika Gochara</b> view first — the twelve readings are ' +
          'that year\u2019s transits counted from each rāśi, so there is ' +
          'nothing to read until the year is scanned.</p>';
    }
  }

  function wireChart() {
    var host = $("wp-kundli");
    if (!host) return;
    host.addEventListener("click", onHouse);
    host.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") onHouse(e);
    });
  }
  function onHouse(e) {
    var t = e.target;
    if (!t || !t.getAttribute) return;
    var h = t.getAttribute("data-house");
    if (!h) return;
    e.preventDefault();
    HOUSE = parseInt(h, 10);
    var D = chart();
    /* light the same bhāva in both charts: that pairing is the point */
    var all = document.querySelectorAll("#wp-kundli .wshouse");
    for (var i = 0; i < all.length; i++)
      all[i].classList.toggle("on",
        all[i].getAttribute("data-house") === h);
    var box = $("ws-inspect");
    if (box && D) box.innerHTML = inspect(D, HOUSE);
    ["ws-d1-beams", "ws-ch-beams"].forEach(function (id) {
      var g = $(id);
      if (g && D) g.innerHTML = beamsFor(D, HOUSE);
    });
  }

  /* ---- the deck ----------------------------------------------------------- */
  function show(key) {
    VIEW = key;
    var tabs = document.querySelectorAll(".wstab");
    for (var i = 0; i < tabs.length; i++) {
      var on = tabs[i].getAttribute("data-wstab") === key;
      tabs[i].setAttribute("aria-current", on ? "true" : "false");
    }
    var ps = document.querySelectorAll(".wspanel");
    for (var j = 0; j < ps.length; j++)
      ps[j].classList.toggle("on", ps[j].getAttribute("data-wspanel") === key);
    render(key);
    try { history.replaceState(null, "", "#" + key); } catch (e) {}
  }

  function status() {
    var s = $("ws-status");
    if (!s) return;
    var D = chart();
    s.innerHTML = D
      ? 'Chart loaded — every view is live. <button type="button" ' +
        'class="k-btn sec wsjson" id="ws-json">Copy the Super-JSON</button>' +
        '<span class="wsjsonmsg" id="ws-jsonmsg"></span>'
      : 'Cast a chart above, or open <b>Vārṣika Gochara</b> — that one ' +
        'needs no chart.';
    var btn = $("ws-json");
    if (btn) btn.addEventListener("click", copyJson);
  }

  function copyJson() {
    var txt;
    try { txt = JSON.stringify(superJson(), null, 2); }
    catch (e) {
      var m0 = $("ws-jsonmsg");
      if (m0) m0.textContent = "could not serialise: " + (e && e.message);
      return;
    }
    var msg = $("ws-jsonmsg");
    function done() {
      if (msg) {
        msg.textContent = "Copied — " +
          (txt.length / 1024).toFixed(0) + " KB";
        setTimeout(function () { msg.textContent = ""; }, 2600);
      }
    }
    /* the textarea path is the one that works from file://, where the
       clipboard API is refused without a secure context */
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = txt;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:-1000px;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(); } catch (e) {}
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && window.isSecureContext)
      navigator.clipboard.writeText(txt).then(done, fallback);
    else fallback();
  }

  function boot() {
    if (!document.querySelector(".wsdeck")) return;
    if (!window.SPSripati || !window.SPGochara) { setTimeout(boot, 200); return; }
    /* wrap the Gochara controls so they can be moved as a unit */
    ["go", "rp"].forEach(function (p) {
      var bar = document.querySelector("#" + p + "-out");
      if (!bar) return;
      var prev = bar.previousElementSibling;
      if (prev && prev.classList.contains("gobar")) {
        prev.id = "ws-" + p + "bar";
      }
    });
    var tabs = document.querySelectorAll(".wstab");
    for (var i = 0; i < tabs.length; i++)
      tabs[i].addEventListener("click", function () {
        show(this.getAttribute("data-wstab"));
      });
    var want = (location.hash || "").replace("#", "");
    show(document.getElementById("wp-" + want) ? want : "kundli");
    status();
    /* a cast finishes asynchronously; the report lands in #k-out and the
       views that borrow from it need rebuilding when it does */
    var seen = null;
    setInterval(function () {
      var D = chart();
      var id = D && D.jd;
      if (id === seen) return;
      seen = id;
      BUILT = {};
      status();
      render(VIEW);
    }, 700);
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.SPWorkstation = { show: show, json: superJson, render: render,
                           inspect: function () { return HOUSE; } };
})();
