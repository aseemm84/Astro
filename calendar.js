/* ===== calendar.js — the pañcāṅga calendar ================================

   Four views over one day object (panchanga.js): a month grid, the traditional
   almanac row, a day detail, and a year view. Nothing here computes a pañcāṅga;
   it all asks NP.

   THE DESIGN PROBLEM, stated once. The grid is SOLAR and the content is
   LUNISOLAR, and the three mismatches each need a deliberate answer rather than
   a convenient one:

     A tithi spanning two sunrises names two days. Both cells show it, the second
     marked UPARI — the notation printed almanacs already use. Inventing one here
     would have been worse.

     A tithi covering no sunrise names none. The gap is drawn, not hidden: a
     trained reader looks for it, and silently skipping it is how a calendar
     tells a confident lie.

     A lunar month boundary falls mid-week. It is a boundary BETWEEN cells, not a
     property of one, so it is drawn as a rule across the grid.

   And the fourth, which is why the year view exists at all: a month grid cannot
   represent an adhika māsa, because the Gregorian year has no cell for a month
   it does not contain. Only the year view can show it.

   THE MOON SPINE. Each cell draws its phase. Pakṣa plus tithi IS a lunar phase,
   so this costs one small routine and makes pūrṇimā and amāvāsyā findable
   without reading anything — and it makes the amānta/pūrṇimānta choice
   self-evident, because the month boundary visibly lands on a dark moon or a
   full one.

   LAYERS, NOT A SETTINGS PAGE. The field divides into almanacs that are accurate
   and overwhelming and apps that are clean and shallow. A density preset with
   per-layer overrides underneath is how one page serves both: Minimal, Standard,
   Almanac, Everything. */

(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var NP = null;

  var S = {
    view: "month",
    y: null, m: null, d: null,
    place: null,
    reckoning: "purnimanta",   /* what the MONTH NAMES show */
    era: "vikrama",
    endFmt: "clock",           /* clock | ghatika */
    preset: "standard",
    layers: {}
  };

  /* --- the layers ---------------------------------------------------------
     `base` layers cannot be turned off: without them a cell is not a pañcāṅga.
     The rest are a reader's choice, and the preset sets them in one move. */
  var LAYERS = [
    { k: "tithi",     n: "Tithi",            base: true },
    { k: "nak",       n: "Nakṣatra",         base: true },
    { k: "phase",     n: "Moon phase",       base: true },
    { k: "fest",      n: "Festivals" },
    { k: "yoga",      n: "Yoga" },
    { k: "karana",    n: "Karaṇa" },
    { k: "ends",      n: "End times" },
    { k: "sun",       n: "Sunrise & sunset" },
    { k: "moon",      n: "Moonrise & moonset" },
    { k: "sankranti", n: "Saṅkrānti" },
    { k: "muhurta",   n: "Rāhu kāla & choghaḍiyā", later: true },
    { k: "second",    n: "Both reckonings" },
    { k: "minor",     n: "Ekādaśī, pūrṇimā, amāvāsyā" }
  ];
  var PRESETS = {
    minimal:    ["tithi", "nak", "phase", "fest"],
    standard:   ["tithi", "nak", "phase", "fest", "ends", "minor", "sankranti"],
    almanac:    ["tithi", "nak", "phase", "fest", "yoga", "karana", "ends", "sun",
                 "minor", "sankranti", "second"],
    everything: LAYERS.map(function (l) { return l.k; })
  };
  function applyPreset(p) {
    S.preset = p;
    var on = PRESETS[p] || PRESETS.standard;
    S.layers = {};
    LAYERS.forEach(function (l) { S.layers[l.k] = l.base || on.indexOf(l.k) >= 0; });
  }
  function L(k) { return !!S.layers[k]; }

  /* The instant a time-zone offset should be resolved for: the middle of the
     month being viewed, not the present moment. A place picked while looking at
     January and then carried to July would otherwise carry January's offset
     through the summer, and every sunrise with it. */
  function refMs() {
    return Date.UTC(S.y || 2026, (S.m || 1) - 1, 15, 12, 0, 0);
  }

  /* --- formatting --------------------------------------------------------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c];
    });
  }
  function clock(ms, tz) {
    if (ms == null) return "—";
    var d = new Date(ms + tz * 3600000);
    return (d.getUTCHours() < 10 ? "0" : "") + d.getUTCHours() + ":" +
           (d.getUTCMinutes() < 10 ? "0" : "") + d.getUTCMinutes();
  }
  /* An end-time either as the clock or as ghaṭī.pala from sunrise. Both are
     offered because the second is what a printed pañcāṅga prints, and a reader
     comparing the two wants to read the same notation on both. A time past the
     next sunrise is marked with a + rather than silently wrapped. */
  function endTime(D, at) {
    if (at == null) return "—";
    var tz = S.place.tz;
    if (S.endFmt === "ghatika") {
      var g = NP.ghatika(D, at);
      if (g) return g + " gh";
      return clock(at, tz) + (at > D.nextSunrise ? "+" : "");
    }
    var over = (D.nextSunrise != null && at >= D.nextSunrise);
    return clock(at, tz) + (over ? "+" : "");
  }
  function monthName(D) {
    if (!D.masa) return "";
    return S.reckoning === "amanta" ? D.masa.amantaIAST : D.masa.purnimantaIAST;
  }
  function eraLabel(D) {
    if (!D.samvat) return "";
    return S.era === "saka" ? (D.samvat.saka + " Śaka")
                            : (D.samvat.vikrama + " Vikrama");
  }
  var GREG = ["January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"];

  /* --- the moon glyph -----------------------------------------------------
     Drawn as a clipped circle in SVG rather than painted on canvas, so it scales
     with the cell, prints at the printer's resolution, and costs no raster. */
  function moonGlyph(phase, px) {
    var r = px / 2, lit = 1 - Math.abs(1 - 2 * phase);   /* 0 new, 1 full */
    var waxing = phase < 0.5;
    /* the terminator is an ellipse whose x-radius tracks the illuminated width */
    var k = (1 - 2 * Math.min(1, Math.max(0, lit))) * r;
    var dark = "#cfcabb", light = "#f6efd8";
    var sweepOuter = waxing ? 1 : 0, sweepInner = (k < 0) === waxing ? 0 : 1;
    return '<svg class="cmoon" width="' + px + '" height="' + px +
      '" viewBox="0 0 ' + px + ' ' + px + '" aria-hidden="true">' +
      '<circle cx="' + r + '" cy="' + r + '" r="' + (r - 0.5) + '" fill="' + dark +
      '" stroke="#b9b3a3" stroke-width="0.6"/>' +
      '<path d="M' + r + ' 0.5 A ' + (r - 0.5) + ' ' + (r - 0.5) + ' 0 0 ' +
      sweepOuter + ' ' + r + ' ' + (px - 0.5) + ' A ' + Math.abs(k) + ' ' +
      (r - 0.5) + ' 0 0 ' + sweepInner + ' ' + r + ' 0.5 z" fill="' + light + '"/>' +
      '</svg>';
  }

  /* --- range refusal ------------------------------------------------------
     Out of range is REFUSED with the reason, never clamped to the nearest year
     and never answered approximately. A silent clamp is the pattern that once
     hid a whole option in this project's own speed menu. */
  function rangeNote() {
    return '<p class="cnote crange">Dates outside <b>' + NP.RANGE.min + '–' +
      NP.RANGE.max + '</b> are not shown. ' + esc(NP.rangeWhy) + '</p>';
  }

  /* --- the month grid ----------------------------------------------------- */
  function renderMonth(host) {
    var y = S.y, m = S.m, tz = S.place.tz;
    var first = new Date(Date.UTC(y, m - 1, 1)), lead = first.getUTCDay();
    var dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
    var want = { ends: L("ends") || L("fest"), month: true,
                 moon: L("moon") };
    var days = [], i;
    for (i = 1; i <= dim; i++) days.push(NP.dayOfDate(y, m, i, S.place, want));

    var h = '<div class="cgrid" role="grid">';
    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(function (w) {
      h += '<div class="chead">' + w + "</div>";
    });
    for (i = 0; i < lead; i++) h += '<div class="ccell cempty"></div>';

    var prevMonthName = null;
    days.forEach(function (D, idx) {
      if (!D || D.outOfRange) { h += '<div class="ccell cempty"></div>'; return; }
      var dnum = idx + 1;
      var cls = "ccell";
      var fests = L("fest") ? NP.festivalsOn(D, { minor: L("minor") }) : [];
      var major = fests.filter(function (f) { return !f.minor && !f.informational; });
      if (major.length) cls += " cfest";
      if (D.at && D.at.tithi.i === 14) cls += " cfull";
      if (D.at && D.at.tithi.i === 29) cls += " cnew";
      /* The lunar month boundary is a rule across the grid, because it is a
         boundary between cells rather than a property of one. */
      var mn = monthName(D);
      if (prevMonthName !== null && mn !== prevMonthName) cls += " cmonthstart";
      prevMonthName = mn;
      if (S.d === dnum) cls += " csel";

      h += '<div class="' + cls + '" data-cday="' + dnum + '" role="gridcell" tabindex="0">';
      h += '<span class="cdate">' + dnum + "</span>";
      if (L("phase") && D.phase != null) h += moonGlyph(D.phase, 16);
      if (!D.dateMatch)
        h += '<span class="cwarn" title="No sunrise on this date at this place, ' +
             'so the day could not be named from it">!</span>';
      if (D.at) {
        h += '<span class="ctithi"><i>' + (D.at.tithi.paksha === "śukla" ? "ś" : "k") +
             "</i>" + esc(D.at.tithi.name) + "</span>";
        if (D.at.tithi.upari)
          h += '<span class="cupari" title="A second tithi completes within this ' +
               'day; printed almanacs mark it upari">+ ' +
               esc(D.at.tithi.upari.name) + " <i>upari</i></span>";
        if (L("nak")) h += '<span class="cnak">' + esc(D.at.nak.name) + "</span>";
        if (L("yoga")) h += '<span class="cmin">' + esc(D.at.yoga.name) + "</span>";
        if (L("karana")) h += '<span class="cmin">' + esc(D.at.karana.name) + "</span>";
        if (L("ends") && D.at.tithi.ends != null)
          h += '<span class="cends">ends ' + endTime(D, D.at.tithi.ends) + "</span>";
        if (L("sun"))
          h += '<span class="cmin">' + clock(D.sunrise, tz) + "–" +
               clock(D.sunset, tz) + "</span>";
        if (L("moon") && D.moonrise != null)
          h += '<span class="cmin">☾ ' + clock(D.moonrise, tz) + "</span>";
        if (L("sankranti") && D.sankranti)
          h += '<span class="csank">' + esc(RASHI[D.sankranti.sign]) +
               " saṅkrānti</span>";
        if (D.monthKind === "adhika")
          h += '<span class="cadhika">adhika</span>';
        if (D.monthKind === "kshaya")
          h += '<span class="cadhika">kṣaya</span>';
      }
      fests.forEach(function (f) {
        if (f.informational) return;
        h += '<span class="cfestname' + (f.minor ? " cminor" : "") +
             (f.contested ? " ccontested" : "") + '">' + esc(f.name) +
             (f.close && !f.minor
                ? ' <i title="' + esc(f.closeWhy) + '">close</i>' : "") +
             "</span>";
      });
      h += "</div>";
    });
    h += "</div>";
    host.innerHTML = h;
    host.querySelectorAll("[data-cday]").forEach(function (el) {
      el.addEventListener("click", function () {
        S.d = +el.getAttribute("data-cday"); S.view = "day"; render();
      });
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault(); S.d = +el.getAttribute("data-cday");
          S.view = "day"; render();
        }
      });
    });
  }
  var RASHI = ["Meṣa", "Vṛṣabha", "Mithuna", "Karka", "Siṃha", "Kanyā", "Tulā",
    "Vṛścika", "Dhanus", "Makara", "Kumbha", "Mīna"];

  /* --- the almanac row ---------------------------------------------------
     The traditional printed form: one dense line per day in the classical order.
     This is the view a serious reader prints, and the order is the almanacs'
     order rather than one of my choosing — date, vāra, tithi, nakṣatra, yoga,
     karaṇa, then the day's events. */
  function renderAlmanac(host) {
    var y = S.y, m = S.m, tz = S.place.tz;
    var dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
    var h = '<table class="calm"><thead><tr>' +
      "<th>Date</th><th>Vāra</th><th>Tithi</th><th>Nakṣatra</th>" +
      "<th>Yoga</th><th>Karaṇa</th><th>Sunrise</th><th>Notes</th>" +
      "</tr></thead><tbody>";
    for (var i = 1; i <= dim; i++) {
      var D = NP.dayOfDate(y, m, i, S.place, { ends: true, month: true });
      if (!D || !D.at) { continue; }
      var f = NP.festivalsOn(D, { minor: L("minor") });
      h += "<tr><td>" + i + "</td><td>" + esc(D.vara.slice(0, 3)) + "</td>" +
        "<td><i>" + (D.at.tithi.paksha === "śukla" ? "ś" : "k") + "</i> " +
        esc(D.at.tithi.name) + " <small>" + endTime(D, D.at.tithi.ends) + "</small>" +
        (D.at.tithi.upari ? ' <b title="a second tithi completes in this day">' +
          esc(D.at.tithi.upari.name) + " upari</b>" : "") + "</td>" +
        "<td>" + esc(D.at.nak.name) + " <small>" + endTime(D, D.at.nak.ends) +
        "</small></td>" +
        "<td>" + esc(D.at.yoga.name) + " <small>" + endTime(D, D.at.yoga.ends) +
        "</small></td>" +
        "<td>" + esc(D.at.karana.name) + " <small>" + endTime(D, D.at.karana.ends) +
        "</small></td>" +
        "<td>" + clock(D.sunrise, tz) + "</td>" +
        "<td>" + f.map(function (x) {
          return esc(x.name) + (x.contested ? " *" : "");
        }).join(" · ") +
        (D.sankranti ? " · " + esc(RASHI[D.sankranti.sign]) + " saṅkrānti" : "") +
        (D.monthKind === "adhika" ? " · adhika māsa" : "") +
        "</td></tr>";
    }
    h += "</tbody></table>" +
      '<p class="cnote">End times are shown ' +
      (S.endFmt === "ghatika" ? "as ghaṭī.pala counted from sunrise, the notation " +
        "a printed pañcāṅga uses" : "on the 24-hour clock for " +
        esc(S.place.n)) + '. A <b>+</b> marks a time past the next sunrise. ' +
      'An asterisk marks a rule that published almanacs apply differently.</p>';
    host.innerHTML = h;
  }

  /* --- the day detail ----------------------------------------------------- */
  function renderDay(host) {
    var D = NP.dayOfDate(S.y, S.m, S.d || 1, S.place,
                         { ends: true, month: true, moon: true });
    if (!D || D.outOfRange) { host.innerHTML = rangeNote(); return; }
    if (!D.at) { host.innerHTML = '<p class="cnote">This day could not be ' +
      'computed for this place.</p>'; return; }
    var tz = S.place.tz;
    var hc = NP.hinduClock({ ms: D.sunrise, sunrise: D.sunrise,
                             nextSunrise: D.nextSunrise });
    function row(k, v, sub) {
      return '<div class="cdrow"><b>' + k + "</b><span>" + v +
             (sub ? '<i>' + sub + "</i>" : "") + "</span></div>";
    }
    var h = '<div class="cdetail">';
    h += '<div class="cdhead">' + moonGlyph(D.phase, 44) +
      "<div><h3>" + S.d + " " + GREG[S.m - 1] + " " + S.y + "</h3>" +
      "<p>" + esc(D.vara) + " · " + esc(monthName(D)) + " " +
      esc(D.at.tithi.paksha) + " · " + esc(eraLabel(D)) + "</p></div></div>";

    h += row("Tithi", esc(D.at.tithi.paksha) + " " + esc(D.at.tithi.name),
             "ends " + endTime(D, D.at.tithi.ends) + " · " + D.at.tithi.n + " of 15");
    if (D.at.tithi.upari)
      h += row("Second tithi", esc(D.at.tithi.upari.name) + " <i>upari</i>",
               "ends " + endTime(D, D.at.tithi.upari.ends) +
               " — two tithis complete within this day");
    h += row("Nakṣatra", esc(D.at.nak.name),
             "pāda " + D.at.nak.pada + " · ends " + endTime(D, D.at.nak.ends));
    h += row("Yoga", esc(D.at.yoga.name), "ends " + endTime(D, D.at.yoga.ends));
    h += row("Karaṇa", esc(D.at.karana.name), "ends " + endTime(D, D.at.karana.ends));
    h += row("Māsa", esc(monthName(D)),
             S.reckoning === "amanta"
               ? "amānta · pūrṇimānta " + esc(D.masa.purnimantaIAST)
               : "pūrṇimānta · amānta " + esc(D.masa.amantaIAST));
    h += row("Ṛtu & ayana", esc(D.masa.ritu), esc(D.masa.ayana));
    h += row("Saṃvat", esc(eraLabel(D)), esc(D.samvat.note));
    h += row("Sunrise", clock(D.sunrise, tz),
             "sunset " + clock(D.sunset, tz) + " · " + esc(D.riseConvLabel));
    if (D.moonrise != null || D.moonset != null)
      h += row("Moon", "rise " + clock(D.moonrise, tz),
               "set " + clock(D.moonset, tz));
    if (D.sankranti)
      h += row("Saṅkrānti", esc(RASHI[D.sankranti.sign]),
               "the Sun enters at " + clock(D.sankranti.ms, tz));
    if (D.monthKind && D.monthKind !== "normal")
      h += row("Lunar month", D.monthKind === "adhika" ? "adhika (intercalary)"
                                                       : "kṣaya",
               D.monthKind === "adhika"
                 ? "no solar ingress falls in this lunar month, so it is " +
                   "intercalary and the festivals fall in the śuddha month that " +
                   "follows"
                 : "two solar ingresses fall in this lunar month — about once in " +
                   "141 years. Its handling differs by region: eastern calendars " +
                   "name it for the first ingress, north-western ones shift the " +
                   "adhika assignment, southern ones call it yugma and count it " +
                   "for both. This page flags it rather than resolving it.");
    h += "</div>";

    /* the festivals, each with its rule and its source beside it */
    var F = NP.festivalsOn(D, { minor: true });
    if (F.length) {
      h += '<h3 class="csub">What falls on this day</h3>';
      F.forEach(function (f) {
        h += '<div class="cfestbox' + (f.contested ? " ccon" : "") + '">' +
          "<b>" + esc(f.name) + "</b>" +
          (f.contested ? '<span class="ctag">rule applied differently by ' +
            "different almanacs</span>" : "") +
          (f.close ? '<span class="ctag ctagwarn">close: ' + esc(f.closeWhy) +
            "</span>" : "") +
          "<p><b>Rule.</b> " + esc(f.rule) + "</p>" +
          (f.note ? "<p><b>Note.</b> " + esc(f.note) + "</p>" : "") +
          '<p class="csrc">' + esc(f.source) +
          (f.when && f.when !== "sunrise" && f.when !== "relative"
            ? " · qualifying window: " + esc(f.when) : "") + "</p></div>";
      });
    }

    /* later tradition, kept separate and labelled */
    if (L("muhurta")) {
      var mid = { ms: (D.sunrise + D.sunset) / 2, sunrise: D.sunrise,
                  sunset: D.sunset, nextSunrise: D.nextSunrise, place: D.place };
      var rk = NP.rahuKala(mid), ch = NP.choghadiya(mid), ho = NP.hora(mid);
      h += '<h3 class="csub">Divisions of the day</h3>' +
        '<p class="cnote">Later tradition, not BPHS — kept separate for that ' +
        "reason, as elsewhere on this site.</p><div class=\"cdetail\">" +
        row("Rāhu kāla", rk ? (clock(rk.from, tz) + " – " + clock(rk.to, tz)) : "—",
            "the eighth part of the daylight assigned to Rāhu, by weekday") +
        (ch && !ch.night ? row("Choghaḍiyā at midday", esc(ch.name),
            clock(ch.from, tz) + " – " + clock(ch.to, tz)) : "") +
        (ho ? row("Horā at midday", esc(ho.lord), "hour " + ho.i + " of 24 from " +
            "sunrise") : "") +
        "</div>";
    }
    if (hc) h += '<p class="cnote">This Hindu day runs ' + clock(D.sunrise, tz) +
      " to " + clock(D.nextSunrise, tz) + ", which is " +
      ((D.nextSunrise - D.sunrise) / 3600000).toFixed(3) +
      " hours — sixty ghaṭī are measured against that, not against a mean " +
      "twenty-four.</p>";
    host.innerHTML = h;
  }

  /* --- the year view -----------------------------------------------------
     Twelve month strips, one row each, with the lunar months drawn as bands
     beneath. This is the only view that can show an adhika māsa, because the
     month grid has no cell for a month the Gregorian year does not contain —
     and it is where the lunisolar structure becomes visible as structure: the
     lunar bands drifting against the solar columns across the year. */
  function renderYear(host) {
    var y = S.y;
    if (!NP.inRange(y)) { host.innerHTML = rangeNote(); return; }
    var h = '<div class="cyear">';
    var adhika = [], kshaya = [];
    for (var m = 1; m <= 12; m++) {
      var dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
      h += '<div class="cyrow"><b class="cymon" data-cmon="' + m + '">' +
        GREG[m - 1].slice(0, 3) + "</b><div class=\"cystrip\">";
      var prevName = null;
      for (var d = 1; d <= dim; d++) {
        var D = NP.dayOfDate(y, m, d, S.place, { month: true });
        if (!D || !D.at) { h += '<span class="cyd"></span>'; continue; }
        var mn = monthName(D);
        var cls = "cyd";
        if (prevName !== null && mn !== prevName) cls += " cybound";
        prevName = mn;
        if (D.at.tithi.i === 14) cls += " cyfull";
        if (D.at.tithi.i === 29) cls += " cynew";
        if (D.sankranti) cls += " cysank";
        if (D.monthKind === "adhika") {
          cls += " cyadhika";
          /* Named by its AMĀNTA month, always — intercalation is defined on the
             new-moon-to-new-moon lunation, so a pūrṇimānta label would straddle
             two month names and report one adhika month as two. It did: 2026
             came out as "Jyeṣṭha, Āṣāḍha" where there is one adhika Jyeṣṭha. */
          var an = D.masa.amantaIAST;
          if (adhika.indexOf(an) < 0) adhika.push(an);
        }
        if (D.monthKind === "kshaya" && kshaya.indexOf(D.masa.amantaIAST) < 0)
          kshaya.push(D.masa.amantaIAST);
        h += '<span class="' + cls + '" title="' + d + " " + GREG[m - 1] + " — " +
          esc(mn) + " " + esc(D.at.tithi.paksha) + " " + esc(D.at.tithi.name) +
          '" data-cmon="' + m + '" data-cday="' + d + '"></span>';
      }
      h += "</div></div>";
    }
    h += "</div>";
    h += '<p class="ckey"><span class="cyd cyfull"></span> pūrṇimā ' +
      '<span class="cyd cynew"></span> amāvāsyā ' +
      '<span class="cyd cysank"></span> saṅkrānti ' +
      '<span class="cyd cybound"></span> lunar month begins</p>';
    if (adhika.length)
      h += '<p class="cnote cadhikanote"><b>Adhika māsa in ' + y + ": " +
        esc(adhika.join(", ")) + ".</b> A lunar month with no solar ingress is " +
        "intercalary: it takes the name of the following month, the first of the " +
        "pair is adhika and the second śuddha, and the month-specific festivals " +
        "fall in the śuddha month. This is the only view that can show it — a " +
        "month grid has no cell for a month the Gregorian year does not contain. " +
        "Named by its amānta month, because intercalation is defined on the " +
        "new-moon lunation whichever reckoning the month names are shown in.</p>";
    if (kshaya.length)
      h += '<p class="cnote cadhikanote"><b>Kṣaya māsa in ' + y + ": " +
        esc(kshaya.join(", ")) + ".</b> Two solar ingresses in one lunar month — " +
        "about once in 141 years. Regional traditions handle it differently and " +
        "this page flags it rather than choosing between them.</p>";
    host.innerHTML = h;
    host.querySelectorAll("[data-cmon]").forEach(function (el) {
      el.addEventListener("click", function () {
        S.m = +el.getAttribute("data-cmon");
        var dd = el.getAttribute("data-cday");
        if (dd) { S.d = +dd; S.view = "day"; } else { S.view = "month"; }
        render();
      });
    });
  }

  /* --- chrome ------------------------------------------------------------- */
  function renderHead() {
    var el = $("chead"); if (!el) return;
    var D = NP.dayOfDate(S.y, S.m, Math.min(S.d || 1, 28), S.place, {});
    var label = GREG[S.m - 1] + " " + S.y;
    var sub = "";
    if (D && D.masa) {
      var a = NP.dayOfDate(S.y, S.m, 1, S.place, {});
      var b = NP.dayOfDate(S.y, S.m, new Date(Date.UTC(S.y, S.m, 0)).getUTCDate(),
                           S.place, {});
      var names = [];
      [a, b].forEach(function (x) {
        if (x && x.masa) { var n = monthName(x); if (names.indexOf(n) < 0) names.push(n); }
      });
      sub = names.join(" – ") + " · " + eraLabel(D) + " · " +
            (S.reckoning === "amanta" ? "amānta" : "pūrṇimānta");
    }
    /* The label names the unit the arrows move, which depends on the view. It
       belongs in this markup rather than being set on the elements afterwards:
       this function rebuilds the buttons on every render, so an attribute
       written anywhere else is overwritten the next time anything changes. */
    var unit = stepUnit();
    el.innerHTML = '<div class="cnav">' +
      '<button id="cprev" type="button" aria-label="Previous ' + unit +
        '" title="Previous ' + unit + '">‹</button>' +
      '<span class="clabel"><b>' + esc(label) + "</b><i>" + esc(sub) + "</i></span>" +
      '<button id="cnext" type="button" aria-label="Next ' + unit +
        '" title="Next ' + unit + '">›</button>' +
      '<button id="ctoday" type="button" class="csec">Today</button>' +
      "</div>";
    /* A printed sheet has no controls and no place note, so it has to name
       itself: the month, the place, and the sunrise convention everything on it
       descends from. Without this a print-out is a grid of numbers that cannot
       be checked against anything. */
    el.innerHTML += '<p class="cprintonly">' + esc(label) + " · " + esc(sub) +
      " · computed for " + esc(S.place.n) + " · sunrise taken as " +
      esc(NP.convLabel()) + "</p>";
    $("cprev").addEventListener("click", function () { step(-1); });
    $("cnext").addEventListener("click", function () { step(+1); });
    $("ctoday").addEventListener("click", function () { today(); render(); });
  }
  /* Navigation stops at the range boundary rather than running past it. */
  /* The arrows step by whatever the view is showing.

     They used to step a MONTH in every view, so in the day view pressing ›
     from the 18th of October landed on the 1st of November — it moved the
     month and then reset the day to the first. A reader stepping through days
     one at a time is the whole reason the day view exists, and it was the one
     thing the arrows could not do.

     Year steps a year, month and almanac step a month, day steps a day. The
     day case goes through a real Date so it crosses month and year ends by
     itself rather than by a table of month lengths that would have to know
     about leap years. */
  function step(k) {
    if (S.view === "year") {
      if (NP.inRange(S.y + k)) S.y += k;
    } else if (S.view === "day") {
      var t = new Date(Date.UTC(S.y, S.m - 1, S.d || 1));
      t.setUTCDate(t.getUTCDate() + k);
      if (!NP.inRange(t.getUTCFullYear())) return;
      S.y = t.getUTCFullYear(); S.m = t.getUTCMonth() + 1; S.d = t.getUTCDate();
    } else {
      var m = S.m + k, y = S.y;
      if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; }
      if (!NP.inRange(y)) return;
      S.y = y; S.m = m; S.d = null;
    }
    render();
  }
  /* What the arrows will do, in words — so the control says which unit it
     moves instead of leaving the reader to press it and find out. */
  function stepUnit() {
    return S.view === "year" ? "year" : S.view === "day" ? "day" : "month";
  }
  function today() {
    var now = new Date(Date.now() + S.place.tz * 3600000);
    S.y = now.getUTCFullYear(); S.m = now.getUTCMonth() + 1;
    S.d = now.getUTCDate();
    if (!NP.inRange(S.y)) { S.y = NP.RANGE.min; S.m = 1; S.d = 1; }
  }

  function buildControls() {
    /* One shared picker, not a dropdown plus a bespoke search. The short list
       is what it offers before you type; two letters reach the whole database.
       Built once in places.js and used identically on the now page and in the
       chart page's sky panel, so the three cannot drift apart. */
    var sel = $("cplace");
    if (sel) {
      var sv = NP.savedPlace();
      var quick = (sv ? [sv] : []).concat(NP.PLACES);
      if (!S.place) S.place = sv || NP.PLACES[2];
      window.NPlaces.picker({
        host: sel, value: S.place, quick: quick, label: "Place",
        refMs: refMs,
        onPick: function (p) {
          S.place = p; NP.cacheClear(); clockDay = null; render(); tickClock();
        }
      });
    }

    var cv = $("cconv");
    if (cv) {
      cv.innerHTML = NP.convList().map(function (c) {
        return '<option value="' + c.key + '">' + esc(c.label) + "</option>";
      }).join("");
      cv.value = NP.conv();
      cv.addEventListener("change", function () {
        NP.setConv(cv.value); clockDay = null; render(); tickClock();
      });
    }
    var rk = $("creck");
    if (rk) { rk.value = S.reckoning;
      rk.addEventListener("change", function () { S.reckoning = rk.value; render(); }); }
    var er = $("cera");
    if (er) { er.value = S.era;
      er.addEventListener("change", function () { S.era = er.value; render(); }); }
    var ef = $("cendfmt");
    if (ef) { ef.value = S.endFmt;
      ef.addEventListener("change", function () { S.endFmt = ef.value; render(); }); }
    var pr = $("cpreset");
    if (pr) { pr.value = S.preset;
      pr.addEventListener("change", function () {
        applyPreset(pr.value); drawLayers(); render();
      }); }
    var yr = $("cyearin");
    if (yr) {
      yr.min = NP.RANGE.min; yr.max = NP.RANGE.max;
      yr.addEventListener("change", function () {
        var v = parseInt(yr.value, 10);
        if (!NP.inRange(v)) {
          yr.setCustomValidity("This calendar covers " + NP.RANGE.min + " to " +
                               NP.RANGE.max + " only.");
          yr.reportValidity(); yr.value = S.y; return;
        }
        yr.setCustomValidity(""); S.y = v; render();
      });
    }
    var mo = $("cmonthin");
    if (mo) {
      mo.innerHTML = GREG.map(function (g, i) {
        return '<option value="' + (i + 1) + '">' + g + "</option>";
      }).join("");
      mo.addEventListener("change", function () { S.m = +mo.value; render(); });
    }
    var pb = $("cprint");
    if (pb) pb.addEventListener("click", function () { window.print(); });
    var ib = $("cics");
    if (ib) ib.addEventListener("click", downloadIcs);
    document.querySelectorAll("[data-cview]").forEach(function (b) {
      b.addEventListener("click", function () {
        S.view = b.getAttribute("data-cview");
        /* Entering the day view with no day chosen lands on today when the
           month on screen is the current one, and on the first otherwise —
           the first of a month you are already looking at is rarely the day
           you meant. */
        if (S.view === "day" && !S.d) {
          var now = new Date(Date.now() + S.place.tz * 3600000);
          S.d = (now.getUTCFullYear() === S.y && now.getUTCMonth() + 1 === S.m)
              ? now.getUTCDate() : 1;
        }
        render();
      });
    });
    drawLayers();
  }
  function drawLayers() {
    var host = $("clayers"); if (!host) return;
    host.innerHTML = LAYERS.map(function (l) {
      return '<label class="clayer' + (l.base ? " cbase" : "") + '">' +
        '<input type="checkbox" data-clayer="' + l.k + '"' +
        (S.layers[l.k] ? " checked" : "") + (l.base ? " disabled" : "") + ">" +
        esc(l.n) + (l.later ? ' <i title="later tradition, not BPHS">later</i>' : "") +
        "</label>";
    }).join("");
    host.querySelectorAll("[data-clayer]").forEach(function (c) {
      c.addEventListener("change", function () {
        S.layers[c.getAttribute("data-clayer")] = c.checked;
        /* A hand-edited layer set is no longer any named preset, and saying so is
           better than leaving a preset selected that no longer describes what is
           on screen. */
        S.preset = "custom";
        var pr = $("cpreset");
        if (pr && !pr.querySelector('[value="custom"]'))
          pr.insertAdjacentHTML("beforeend", '<option value="custom">Custom</option>');
        if (pr) pr.value = "custom";
        render();
      });
    });
  }

  /* --- the .ics export ---------------------------------------------------
     The festivals of the year on screen, as an iCalendar file built in this
     browser like everything else here — no service, nothing sent anywhere.

     All-day events (VALUE=DATE), because a festival names a DAY and giving it a
     clock time would be a precision the rule does not have. Each event carries
     its rule in the description, and the contested ones say so there too: a
     calendar entry that has travelled into somebody's phone has left this page
     behind, so it has to carry its own caveat rather than rely on one.

     The UID is derived from the festival key, the date and the place, so
     re-importing a later export updates the same entries instead of duplicating
     them — and the place is in there because the same festival genuinely falls
     on different days in different cities. */
  function icsEscape(s) {
    return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;")
                    .replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  }
  /* iCalendar folds content lines at 75 OCTETS, not 75 characters — and this
     text is full of ā, ṣ, ṅ and ′, each of which is two or three octets in
     UTF-8. A fold that counts characters therefore emits lines that are still
     over the limit: counting them found 141 such lines in a year's export,
     every one of them from the transliteration. A split must also never land
     inside a multi-byte character, or the file is not valid UTF-8 at all.

     So the measurement is in octets and the cut is taken at a character
     boundary below the limit. Continuation lines begin with one space, which is
     itself an octet of the 75. */
  function octets(s) {
    var n = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.codePointAt(i);
      if (c > 0xffff) { n += 4; i++; }
      else if (c > 0x7ff) n += 3;
      else if (c > 0x7f) n += 2;
      else n += 1;
    }
    return n;
  }
  function icsFold(line) {
    if (octets(line) <= 75) return line;
    var out = [], s = line, first = true;
    while (s.length) {
      var limit = first ? 75 : 74;          /* the leading space costs one */
      if (octets(s) <= limit) { out.push((first ? "" : " ") + s); break; }
      var take = 0, n = 0;
      while (take < s.length) {
        var c = s.codePointAt(take), w = c > 0xffff ? 4 : c > 0x7ff ? 3 : c > 0x7f ? 2 : 1;
        var step = c > 0xffff ? 2 : 1;
        if (n + w > limit) break;
        n += w; take += step;
      }
      if (take === 0) take = 1;             /* never loop forever */
      out.push((first ? "" : " ") + s.slice(0, take));
      s = s.slice(take);
      first = false;
    }
    return out.join("\r\n");
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function buildIcs() {
    var y = S.y, lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0",
      "PRODID:-//Nirayana//Pancanga calendar//EN", "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      icsFold("X-WR-CALNAME:" + icsEscape("Pañcāṅga " + y + " — " + S.place.n)),
      icsFold("X-WR-CALDESC:" + icsEscape(
        "Festival days computed for " + S.place.n + ". Sunrise is " +
        NP.convLabel() + ", and every date here follows from it — a Hindu " +
        "calendar is valid only for the place it was computed for. Each entry " +
        "carries the rule it was derived from."))
    ];
    var stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    var n = 0;
    for (var m = 1; m <= 12; m++) {
      var dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
      for (var d = 1; d <= dim; d++) {
        var D = NP.dayOfDate(y, m, d, S.place, { ends: true, month: true });
        if (!D || !D.at) continue;
        var F = NP.festivalsOn(D, { minor: L("minor") });
        F.forEach(function (f) {
          if (f.informational) return;
          var date = y + pad(m) + pad(d);
          var next = new Date(Date.UTC(y, m - 1, d + 1));
          var desc = f.rule +
            (f.note ? "\n\n" + f.note : "") +
            "\n\nSource: " + f.source +
            (f.when && f.when !== "sunrise" && f.when !== "relative"
              ? "\nQualifying window: " + f.when : "") +
            (f.contested
              ? "\n\nPublished almanacs apply this rule differently, so other " +
                "calendars may place this on a neighbouring day."
              : "") +
            (f.close ? "\n\nClose: " + f.closeWhy : "") +
            "\n\nComputed for " + S.place.n + "; sunrise taken as " +
            NP.convLabel() + ".";
          lines.push("BEGIN:VEVENT");
          lines.push(icsFold("UID:" + f.key + "-" + date + "-" +
                     S.place.n.replace(/[^A-Za-z0-9]/g, "") + "@nirayana"));
          lines.push("DTSTAMP:" + stamp);
          lines.push("DTSTART;VALUE=DATE:" + date);
          lines.push("DTEND;VALUE=DATE:" + next.getUTCFullYear() +
                     pad(next.getUTCMonth() + 1) + pad(next.getUTCDate()));
          lines.push(icsFold("SUMMARY:" + icsEscape(
            f.name + (f.contested ? " (rule varies)" : ""))));
          lines.push(icsFold("DESCRIPTION:" + icsEscape(desc)));
          lines.push("TRANSP:TRANSPARENT");
          lines.push("END:VEVENT");
          n++;
        });
      }
    }
    lines.push("END:VCALENDAR");
    return { text: lines.join("\r\n") + "\r\n", n: n };
  }
  function downloadIcs() {
    var btn = $("cics"), was = btn ? btn.textContent : "";
    if (btn) { btn.disabled = true; btn.textContent = "Computing the year…"; }
    /* Yielded to the paint first, so the button's own label actually changes
       before a second of synchronous astronomy begins. */
    setTimeout(function () {
      var r;
      try { r = buildIcs(); }
      catch (e) {
        if (btn) { btn.disabled = false; btn.textContent = was; }
        return;
      }
      var blob = new Blob([r.text], { type: "text/calendar;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "pancanga-" + S.y + "-" +
        S.place.n.replace(/[^A-Za-z0-9]+/g, "-").toLowerCase() + ".ics";
      document.body.appendChild(a); a.click();
      setTimeout(function () {
        URL.revokeObjectURL(a.href); a.remove();
      }, 1000);
      if (btn) {
        btn.disabled = false;
        btn.textContent = r.n + " events for " + S.y;
        setTimeout(function () { btn.textContent = was; }, 4000);
      }
    }, 30);
  }
  window.__calIcs = buildIcs;

  /* --- the permalink -----------------------------------------------------
     A configured month in the fragment, so a reader can send someone the view
     they are looking at rather than a description of it. */
  function writeHash() {
    var on = LAYERS.filter(function (l) { return !l.base && S.layers[l.k]; })
                   .map(function (l) { return l.k; });
    /* A place chosen from the town search is not in the short list, so the name
       alone cannot restore it — the first version wrote the name and a reload
       silently fell back to the default city, which is the same quiet
       substitution the range rule exists to prevent, applied to a place. So a
       found place carries its own coordinates and offset, and a link to it then
       works for a reader who never loads the town file at all. */
    var h = ["v=" + S.view, "y=" + S.y, "m=" + S.m, (S.d ? "d=" + S.d : ""),
             "r=" + S.reckoning, "e=" + S.era, "f=" + S.endFmt,
             "p=" + encodeURIComponent(S.place.n),
             (S.place.found
               ? "pl=" + S.place.lat.toFixed(4) + "," + S.place.lon.toFixed(4) +
                 "," + S.place.tz + (S.place.zone ? "," + S.place.zone : "")
               : ""),
             "l=" + on.join(",")].filter(Boolean).join("&");
    try { history.replaceState(null, "", "#" + h); } catch (e) {}
  }
  function readHash() {
    var h = (location.hash || "").replace(/^#/, "");
    if (!h) return false;
    var q = {};
    h.split("&").forEach(function (p) {
      var i = p.indexOf("=");
      if (i > 0) q[p.slice(0, i)] = decodeURIComponent(p.slice(i + 1));
    });
    /* An out-of-range year in the address bar is taken and then REFUSED by
       render(), not quietly dropped back to today. The first version tested
       inRange() here and ignored the year on failure, so a link to 1799 showed
       the current month with no indication that anything had been disregarded —
       which is the silent-clamp pattern this project keeps finding, and the one
       the range rule exists to prevent. */
    if (q.y && /^-?\d+$/.test(q.y)) S.y = +q.y;
    if (q.m) S.m = Math.min(12, Math.max(1, +q.m));
    if (q.d) S.d = +q.d;
    if (q.v) S.view = q.v;
    if (q.r) S.reckoning = q.r;
    if (q.e) S.era = q.e;
    if (q.f) S.endFmt = q.f;
    if (q.l != null) {
      var on = q.l ? q.l.split(",") : [];
      S.preset = "custom";
      LAYERS.forEach(function (l) { S.layers[l.k] = l.base || on.indexOf(l.k) >= 0; });
    }
    if (q.pl) {
      /* a searched place, carried whole */
      var bits = q.pl.split(",");
      var la = parseFloat(bits[0]), lo = parseFloat(bits[1]), tz = parseFloat(bits[2]);
      if (isFinite(la) && isFinite(lo) && isFinite(tz))
        S.place = { n: q.p || (la.toFixed(3) + "°, " + lo.toFixed(3) + "°"),
                    lat: la, lon: lo, tz: tz,
                    zone: bits[3] || null, found: true };
    } else if (q.p) {
      var all = NP.PLACES.concat(NP.savedPlace() ? [NP.savedPlace()] : []);
      for (var i = 0; i < all.length; i++) if (all[i].n === q.p) S.place = all[i];
    }
    return true;
  }

  /* --- render ------------------------------------------------------------- */
  function render() {
    var host = $("cbody"); if (!host || !NP) return;
    var yr0 = $("cyearin"); if (yr0) yr0.value = S.y;
    if (!NP.inRange(S.y)) {
      /* Refused, with the reason and a way out — a dead end would be its own
         kind of silent failure. */
      host.innerHTML = rangeNote() +
        '<p class="cnote">Pick a year between ' + NP.RANGE.min + " and " +
        NP.RANGE.max + ' above, or <button type="button" id="cback" ' +
        'class="cvbtn">go to this month</button>.</p>';
      var bk = $("cback");
      if (bk) bk.addEventListener("click", function () { today(); render(); });
      renderHead();
      return;
    }
    document.querySelectorAll("[data-cview]").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-cview") === S.view);
    });
    var yr = $("cyearin"); if (yr) yr.value = S.y;
    var mo = $("cmonthin"); if (mo) mo.value = S.m;
    renderHead();
    host.className = "cbody cview-" + S.view;
    if (S.view === "month") renderMonth(host);
    else if (S.view === "almanac") renderAlmanac(host);
    else if (S.view === "day") renderDay(host);
    else if (S.view === "year") renderYear(host);
    var pl = $("cplacenote");
    if (pl) pl.innerHTML = "Computed for <b>" + esc(S.place.n) + "</b>. " +
      "Sunrise is " + esc(NP.convLabel()) + ", and every figure on this page " +
      "follows from it — a Hindu calendar is only valid for the place it was " +
      "computed for.";
    writeHash();
  }

  /* ===== the running clock ==================================================
     Civil 24-hour time and Hindu time side by side, both ticking.

     Ghaṭī : pala : vipala is sixty all the way down, exactly as hours : minutes
     : seconds are, so it can be read the same way — the units are simply
     bigger. A ghaṭī is 24 minutes, a pala 24 seconds, a vipala 0.4 of a second.
     Putting the two clocks next to each other and letting both run is the only
     way to make that relationship obvious: the vipala column moves two and a
     half times for every civil second.

     The interval is 160 ms rather than a vipala's 400, because a clock that
     ticks on exactly the period it displays will visibly skip a count whenever
     the timer drifts. Sampling faster than the thing you are showing is the
     cheap fix, and at this cost it does not matter. */
  var clockTimer = null, clockDay = null, clockDayKey = "";
  function tickClock() {
    var host = $("cclock");
    if (!host || !NP) return;
    var now = Date.now();
    /* The day object is rebuilt only when the Hindu day actually turns, not
       every tick: it costs a sunrise search and this runs six times a second. */
    var key = S.place.n + "|" + NP.conv() + "|" + Math.floor(now / 60000);
    if (!clockDay || clockDayKey.split("|")[0] !== S.place.n ||
        (clockDay.nextSunrise != null && now >= clockDay.nextSunrise) ||
        now < clockDay.sunrise) {
      clockDay = NP.day(now, S.place, {});
      clockDayKey = key;
    }
    if (!clockDay) { host.hidden = true; return; }
    var hc = NP.hinduClock({ ms: now, sunrise: clockDay.sunrise,
                             nextSunrise: clockDay.nextSunrise });
    var tz = S.place.tz, d = new Date(now + tz * 3600000);
    function p2(n) { return (n < 10 ? "0" : "") + n; }
    var civil = p2(d.getUTCHours()) + ":" + p2(d.getUTCMinutes()) + ":" +
                p2(d.getUTCSeconds());
    host.hidden = false;
    host.innerHTML =
      '<div class="cck"><b>24-hour clock</b>' +
        '<span class="cckv">' + civil + "</span></div>" +
      '<div class="cck"><b>Hindu clock · ghaṭī : pala : vipala</b>' +
        '<span class="cckv cckh">' + (hc ? NP.hinduClockText(hc) : "—") +
        '<i class="cckunit">gh : pl : vp</i></span></div>' +
      '<span class="cckn">Counted from sunrise at ' +
        clock(clockDay.sunrise, tz) + ", " + esc(S.place.n) +
        ". Sixty ghaṭī to the day, sixty pala to the ghaṭī, sixty vipala to the " +
        "pala — so a vipala is " +
        (hc ? (hc.vipalaMs / 1000).toFixed(3) : "0.400") +
        " s and runs faster than the second beside it.</span>";
  }
  function startClock() {
    if (clockTimer) clearInterval(clockTimer);
    tickClock();
    clockTimer = setInterval(tickClock, 160);
  }

  /* --- boot --------------------------------------------------------------- */
  function haveEngine() {
    return !!(window.NP && window.__kSidAt && window.__kPanchang);
  }
  function start() {
    if (!$("cbody")) return;
    var need = [];
    if (!window.__kSidAt) need.push("engine.js");
    if (!window.NP) need.push("panchanga.js");
    if (!window.NPlaces) need.push("places.js");
    var left = need.length;
    if (!left) return go();
    need.forEach(function (src) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = function () { if (--left === 0) go(); };
      s.onerror = function () {
        $("cbody").innerHTML = '<p class="cnote">The engine could not be loaded, ' +
          "so nothing here can be computed. Everything on this page is worked " +
          "out in this browser, so there is no server to fall back to.</p>";
      };
      document.head.appendChild(s);
    });
  }
  function go() {
    if (!haveEngine()) return;
    NP = window.NP;
    applyPreset("standard");
    S.place = NP.PLACES[2];
    today();
    buildControls();
    readHash();
    startClock();
    render();
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start);
  else start();

  /* test hooks, the same way the motion pane exposes its state */
  window.__calState = function () { return S; };
  window.__calSet = function (k, v) { S[k] = v; render(); };
  window.__calRender = render;
})();
;
