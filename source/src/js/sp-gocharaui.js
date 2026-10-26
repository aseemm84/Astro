/* ===== The Gochara and Rāśiphal panels ====================================

   These two sections are the only part of this builder that works with no
   chart at all, which is the point of them: a year of transits is a fact
   about the sky, and a reading counted from a janma-rāśi needs the rāśi and
   nothing else. Someone who has never entered a birth time can open the
   page, pick a year, pick their Moon sign and get the whole of it.

   WHEN A CHART IS LOADED the panels get strictly more: the natal Moon's
   rāśi is selected for them, and the one tier-1 rule here — the
   ashtakavarga transit doctrine of BPHS Vol. 2 Ch. 70 — can finally be
   applied, because it needs that chart's bindus. Nothing that was visible
   without a chart disappears when one arrives.

   WHY THE TIER LABELS ARE IN THE MARKUP AND NOT IN A FOOTNOTE. A reader
   scrolling a page of transit readings will not scroll back to a key. Each
   claim carries its own badge, in the same line of sight as the claim. */

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c];
    });
  }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  var TIER = {
    bphs: ["bphs", "BPHS text"],
    commentary: ["comm", "Translator’s note"],
    later: ["later", "Later tradition"],
    computed: ["calc", "Computed here"]
  };
  function badge(t) {
    var x = TIER[t] || TIER.computed;
    return '<span class="gotier gotier-' + x[0] + '">' + esc(x[1]) + '</span>';
  }

  function dstr(jd) {
    var d = window.SPGochara.jdToDate(jd);
    return d.toLocaleDateString(undefined,
      { year: "numeric", month: "short", day: "numeric" });
  }
  function tstr(jd) {
    var d = window.SPGochara.jdToDate(jd);
    return d.toISOString().slice(11, 16) + " UTC";
  }

  var SIGNS = null, R = null, YEAR = null;

  /* ---- the year's timeline ---------------------------------------------- */
  function renderYear(R) {
    var P = window.SPRashiphal;
    SIGNS = P.SIGNS;
    var out = [];

    out.push('<p class="klegend">' + R.events.length + ' events in ' + R.year +
      ', computed to the minute by bisecting the ephemeris. Times are UTC. ' +
      'A graha that crosses a boundary, turns retrograde and crosses back ' +
      'appears once for each crossing — which is the honest account, and ' +
      'the one a printed table usually flattens.</p>');

    /* where everything starts the year */
    var rows = R.bodyList.map(function (b) {
      var sp = R.spans[b];
      var where = sp.map(function (s) {
        return esc(SIGNS[s.sign]) + ' <span class="godim">' +
          Math.round(s.to - s.from) + 'd</span>';
      }).join(' → ');
      return '<tr><td><b>' + esc(P.DEV[b]) + '</b></td><td>' + where +
        '</td><td class="knum">' + R.bodies[b].ingresses.length + '</td>' +
        '<td class="knum">' + R.bodies[b].stations.length + '</td></tr>';
    });
    out.push('<h3 class="ksub">Where each graha spends the year</h3>');
    out.push('<table class="ktbl gotbl"><thead><tr><th>Graha</th>' +
      '<th>Rāśi through the year</th><th>Ingresses</th><th>Stations</th>' +
      '</tr></thead><tbody>' + rows.join("") + '</tbody></table>');

    /* the chronological list */
    var ev = R.events.map(function (e) {
      var what;
      if (e.kind === "ingress")
        what = 'enters <b>' + esc(SIGNS[e.to]) + '</b>' +
               (e.retro ? ' <span class="goretro">while retrograde</span>' : '');
      else if (e.kind === "retro")
        what = '<span class="goretro">turns retrograde</span> in ' +
               esc(SIGNS[e.sign]);
      else
        what = 'turns direct in ' + esc(SIGNS[e.sign]);
      return '<tr><td class="godate">' + esc(dstr(e.jd)) +
        '<span class="gotime">' + esc(tstr(e.jd)) + '</span></td>' +
        '<td><b>' + esc(P.DEV[e.body]) + '</b></td><td>' + what + '</td></tr>';
    });
    out.push('<h3 class="ksub">Every ingress and station, in order</h3>');
    out.push('<div class="goscroll"><table class="ktbl gotbl"><thead><tr>' +
      '<th>When</th><th>Graha</th><th>What</th></tr></thead><tbody>' +
      ev.join("") + '</tbody></table></div>');
    return out.join("");
  }

  /* ---- one rāśi's reading ----------------------------------------------- */
  function renderReading(r) {
    var P = window.SPRashiphal;
    var out = [];

    out.push('<div class="gohead"><h3 class="ksub">' + esc(r.signName) +
      ' <span class="godim">· lord ' + esc(r.lord) + ' · ' + r.year +
      '</span></h3></div>');

    /* the chart of the year, drawn from the Moon sign as the first house */
    out.push(chandraChart(r));

    /* Śani first: it is what anyone reading a year of transits came for */
    if (r.sani.length) {
      out.push('<h4 class="gosub">Śani through the year ' + badge("later") +
        '</h4>');
      out.push('<ul class="golist">' + r.sani.map(function (s) {
        return '<li><b>' + esc(s.title) + '</b> — ' + esc(SIGNS[s.sign]) +
          ', <span class="godates">' + esc(dstr(s.from)) + ' to ' +
          esc(dstr(s.to)) + '</span> (' + esc(P.days(s.days)) + ')<br>' +
          '<span class="gotext">' + esc(s.text) + '</span></li>';
      }).join("") + '</ul>');
      out.push('<p class="knote gonote">These names — Sade Sati, Kaṇṭaka ' +
        'Śani, Aṣṭama Śani — belong to later tradition, not to the ' +
        'Parāśara verses. The <i>dates</i> are computed from Śani’s real ' +
        'motion, retrogrades included, which is why a phase can be entered, ' +
        'left and entered again within one year where an almanac table ' +
        'shows a single block.</p>');
    } else {
      out.push('<h4 class="gosub">Śani through the year ' + badge("later") +
        '</h4><p class="gotext">Śani occupies none of the houses later ' +
        'tradition names for this rāśi in ' + r.year +
        ' — neither the 12th, 1st or 2nd of Sade Sati, nor the 4th or 8th.</p>');
    }

    /* every graha, with the classical favourable houses */
    out.push('<h4 class="gosub">Each graha, counted from ' +
      esc(r.signName) + ' ' + badge("later") + '</h4>');
    out.push('<table class="ktbl gotbl"><thead><tr><th>Graha</th>' +
      '<th>Bhāva from the rāśi</th><th>Rāśi</th><th>For</th>' +
      '<th>Favourable houses</th></tr></thead><tbody>' +
      r.grahas.map(function (g) {
        return '<tr' + (g.favourable ? ' class="gogood"' : '') + '><td><b>' +
          esc(g.name) + '</b></td><td class="knum">' + g.mainHouse +
          (g.favourable ? ' <span class="gotick">✓</span>' : '') + '</td>' +
          '<td>' + esc(SIGNS[g.mainSign]) + '</td>' +
          '<td class="knum">' + esc(P.days(g.mainDays)) + '</td>' +
          '<td class="godim">' + g.goodHouses.join(", ") + '</td></tr>';
      }).join("") + '</tbody></table>');
    out.push('<p class="knote gonote">The favourable-house lists are the ' +
      'standard gochara table of later practice. The uploaded Santhanam ' +
      'edition carries it in Vol. 1, Ch. 31 among the translator’s notes ' +
      'on Argala, but prints it as a figure whose numerals did not survive ' +
      'the scan — so confirm the edition’s own table in the PDF rather ' +
      'than taking this page’s word for it.</p>');

    /* the one vedha pair the edition states in words */
    out.push('<h4 class="gosub">Vedha on Sūrya’s third-house transit ' +
      badge("commentary") + '</h4>');
    if (!r.sunVedha.length) {
      out.push('<p class="gotext">Sūrya does not transit the 3rd from ' +
        esc(r.signName) + ' inside ' + r.year + '.</p>');
    } else {
      out.push('<ul class="golist">' + r.sunVedha.map(function (v) {
        var s;
        if (v.state === "clear")
          s = 'no graha in the 9th, so the transit stands unobstructed';
        else if (v.state === "lifted")
          s = 'obstructed from the 9th by ' + esc(v.blockers.join(", ")) +
              ', but ' + esc(v.companions.join(", ")) + ' joins Sūrya in ' +
              'the 3rd, and the uploaded text says the vedha lifts while ' +
              'he has a companion';
        else
          s = 'obstructed from the 9th by ' + esc(v.blockers.join(", "));
        return '<li><span class="godates">' + esc(dstr(v.from)) + ' to ' +
          esc(dstr(v.to)) + '</span> — ' + s + '</li>';
      }).join("") + '</ul>');
    }
    out.push('<p class="knote gonote">This is the one vedha pair the ' +
      'uploaded translation states in words rather than in a figure: Sūrya ' +
      'in the 3rd from the Moon transits favourably, that favour is curbed ' +
      'if another graha simultaneously transits the 9th — Śani excepted — ' +
      'and it is restored while a companion sits with him in the 3rd. The ' +
      'remaining pairs are in the same illegible figure, so they are not ' +
      'guessed at here.</p>');

    /* the only tier-1 rule on the page */
    out.push('<h4 class="gosub">Ashtakavarga on the transit ' +
      badge("bphs") + '</h4>');
    if (!r.ashtaka) {
      out.push('<p class="gotext">This is the one rule here that comes ' +
        'from the Parāśara verses rather than from later practice, and it ' +
        'is the one that needs a chart: BPHS Vol. 2, Ch. 70 reads a graha ' +
        'passing through a rāśi carrying more rekhās in its own ' +
        'ashtakavarga as favourable for that graha’s significations. ' +
        'The bindus belong to a particular horoscope, so there is nothing ' +
        'to read until one is cast above. Everything else on this page ' +
        'works without one.</p>');
    } else {
      out.push('<table class="ktbl gotbl"><thead><tr><th>Graha</th>' +
        '<th>Transits</th><th>Bhāva</th><th>Bindus</th>' +
        '<th>After śodhana</th><th>For</th></tr></thead><tbody>' +
        r.ashtaka.map(function (a) {
          var good = a.reduced >= 4;
          return '<tr' + (good ? ' class="gogood"' : '') + '><td><b>' +
            esc(a.name) + '</b></td><td>' + esc(SIGNS[a.sign]) + '</td>' +
            '<td class="knum">' + a.house + '</td>' +
            '<td class="knum">' + a.bindus + '</td>' +
            '<td class="knum">' + a.reduced + '</td>' +
            '<td class="knum">' + esc(P.days(a.days)) + '</td></tr>';
        }).join("") + '</tbody></table>');
      out.push('<p class="knote gonote">Rekhās in each graha’s own ' +
        'bhinnāṣṭakavarga, shown both raw and after Trikoṇa and ' +
        'Ekādhipatya śodhana — the text’s rule is stated after śodhana, ' +
        'while most software shows the raw count, and a reader comparing ' +
        'the two should be able to see why they differ. Source: BPHS, ' +
        'Vol. 2, Ch. 70. Verse numbers in the uploaded scan are ' +
        'OCR-affected; confirm them in the PDF.</p>');
    }

    out.push('<div class="caution gocaution"><b>Read this as doctrine, not ' +
      'as forecast.</b> A transit is a condition the classical texts attach ' +
      'a tendency to. Nothing here is a statement that an event will ' +
      'happen, and none of it should carry weight in a decision about ' +
      'health, money, law or safety — for those, ask someone qualified in ' +
      'that field.</div>');
    return out.join("");
  }

  /* ---- the Candra chart: the Moon's rāśi as the first house ------------- */
  function chandraChart(r) {
    var P = window.SPRashiphal;
    var mid = (R.jd0 + R.jd1) / 2;
    var occ = {};
    R.bodyList.forEach(function (b) {
      var h = P.houseFrom(window.SPGochara.signAtJd(R, b, mid), r.moonSign);
      (occ[h] = occ[h] || []).push(P.DEV[b]);
    });
    var cells = [];
    for (var h = 1; h <= 12; h++) {
      var sg = (r.moonSign + h - 1) % 12;
      cells.push('<div class="gocell"><span class="gocellh">' + h + '</span>' +
        '<span class="gocells">' + esc(SIGNS[sg]) + '</span>' +
        '<span class="gocellp">' + esc((occ[h] || []).join(" ")) + '</span>' +
        '</div>');
    }
    return '<div class="gochart"><div class="gogrid">' + cells.join("") +
      '</div><p class="klegend">The year’s grahas placed in the twelve ' +
      'bhāvas counted from ' + esc(r.signName) + ', taken at the middle of ' +
      r.year + '. A graha that changes rāśi during the year sits in the ' +
      'bhāva it holds at mid-year; the table above gives its full path.</p>' +
      '</div>';
  }

  /* ---- wiring ------------------------------------------------------------ */
  function natalMoonSign() {
    try {
      var D = window.__kApi && window.__kApi.chart && window.__kApi.chart();
      if (D && D.P && D.P.Moon && D.P.Moon.sign != null) return D.P.Moon.sign;
    } catch (e) {}
    return null;
  }
  function natalChart() {
    try { return window.__kApi && window.__kApi.chart && window.__kApi.chart(); }
    catch (e) { return null; }
  }

  function fillSigns() {
    var sel = $("rp-sign");
    if (!sel || sel.options.length) return;
    window.SPRashiphal.SIGNS.forEach(function (s, i) {
      var o = document.createElement("option");
      o.value = String(i); o.textContent = s;
      sel.appendChild(o);
    });
  }

  function showReading() {
    if (!R) return;
    var sel = $("rp-sign"), out = $("rp-out");
    if (!sel || !out) return;
    var i = parseInt(sel.value, 10) || 0;
    var r = window.SPRashiphal.read(R, i, natalChart());
    out.innerHTML = renderReading(r);
    var st = $("rp-status");
    if (st) {
      var m = natalMoonSign();
      st.textContent = (m === i && m != null)
        ? "this is the natal Moon’s rāśi of the chart above"
        : "";
    }
  }

  function run() {
    var y = parseInt(($("go-year") || {}).value, 10);
    if (!y || y < 1800 || y > 2200) {
      var s0 = $("go-status");
      if (s0) s0.textContent = "Enter a year between 1800 and 2200.";
      return;
    }
    var st = $("go-status");
    if (st) st.textContent = "Computing…";
    var moon = !!($("go-moon") || {}).checked;
    /* let the status paint before a third of a second of arithmetic */
    setTimeout(function () {
      try {
        R = window.SPGochara.year(y, { moon: moon });
        YEAR = y;
        $("go-out").innerHTML = renderYear(R);
        fillSigns();
        var m = natalMoonSign();
        if (m != null && $("rp-sign")) $("rp-sign").value = String(m);
        showReading();
        if (st) st.textContent = R.events.length + " events";
      } catch (e) {
        if (st) st.textContent = "could not compute: " + (e && e.message);
      }
    }, 10);
  }

  function boot() {
    if (!$("go-run")) return;
    if (!window.SPGochara || !window.SPRashiphal) { setTimeout(boot, 200); return; }
    fillSigns();
    $("go-run").addEventListener("click", run);
    var sel = $("rp-sign");
    if (sel) sel.addEventListener("change", showReading);
    var yr = $("go-year");
    if (yr && !yr.value) yr.value = String(new Date().getFullYear());
    /* a chart cast after the year was computed should re-colour the
       reading, because a chart unlocks the ashtakavarga rule */
    window.addEventListener("nirayana:chart", function () {
      var m = natalMoonSign();
      if (m != null && $("rp-sign")) $("rp-sign").value = String(m);
      showReading();
    });
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.SPGocharaUI = { run: run, reading: showReading,
                         current: function () { return R; },
                         /* the Workstation's Gochara view shows the natal
                            reading inline rather than making the reader
                            change tabs for it, so the renderer is shared
                            rather than written twice */
                         readingHtml: renderReading,
                         yearHtml: renderYear,
                         badge: badge, dstr: dstr };
})();
