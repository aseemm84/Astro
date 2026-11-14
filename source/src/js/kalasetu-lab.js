/* Engine Lab — the long-span engine's section. Reads only window.__KALASETU_DATA
   (the fitted numbers and their held-back residuals, written by
   fit-kalasetu.mjs) and window.KalasetuEngine; the modern side comes from
   the site engine's __kEclipModern and __kNodesModern, so the comparison is
   always against the modern ephemeris whatever engine Settings has chosen. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function norm(x) { return ((x % 360) + 360) % 360; }
  function sdiff(a, b) { var d = norm(a - b); return d > 180 ? d - 360 : d; }
  function am(x) { return x == null ? "—" : (Math.abs(x) < 1 ? x.toFixed(2) : x.toFixed(1)) + "′"; }
  function dm(L) { var d = Math.floor(L), m = (L - d) * 60; return d + "°" + m.toFixed(1).padStart(4, "0") + "′"; }
  function yearLabel(y) { return y <= 0 ? (1 - y) + " BCE" : y + " CE"; }

  var ROWS = [["Sūrya", "Sun"], ["Candra", "Moon"], ["Budha", "Mercury"], ["Śukra", "Venus"],
              ["Maṅgala", "Mars"], ["Guru", "Jupiter"], ["Śani", "Saturn"], ["Rāhu", "mean node"],
              ["Rāhu (true)", "true node"]];

  /* 600-year eras across the whole span; each read from the fit Auto picks
     for it (the engine's accuracyAt), so the row is the error bar a chart in
     that era carries */
  var ERAS = []; for (var ey = -13000; ey + 600 <= 3800; ey += 600) ERAS.push(ey);
  function midOf(y0) { var d = new Date(Date.UTC(2000, 6, 1)); d.setUTCFullYear(y0 + 1 + (y0 + 600 > 3400 ? 400 : 300)); return d.getTime(); }
  function table(D, SL) {
    var host = $("el-sltab"); if (!host) return;
    var h = '<div class="eltblwrap"><table class="aytab elerr"><thead><tr><th>graha</th><th>within DE422, rms</th><th>worst</th>' +
      ERAS.map(function (y) { return "<th>" + esc(yearLabel(y + 1)) + "</th>"; }).join("") +
      "</tr></thead><tbody>";
    ROWS.forEach(function (r) {
      var R = D.residuals[r[0]]; if (!R) return; var q = R.de || R.holdout;
      h += "<tr><td><b>" + esc(r[0]) + "</b> <span class=\"elw\">" + esc(r[1]) + "</span></td><td>" +
        am(q.rms) + "</td><td>" + am(q.worst) + "</td>" +
        ERAS.map(function (y0) { var ms = midOf(y0), a = SL && SL.accuracyAt ? SL.accuracyAt(r[0], ms) : null, yy = new Date(ms).getUTCFullYear();
          var ex = (r[0] === "Candra" || r[0] === "Rāhu (true)") && (yy < -2999 || yy > 2999);
          return "<td" + (ex ? ' title="no independent reference: the spread between two extrapolations" style="opacity:.6"' : "") + ">" +
            (a ? am(a.rms) + (ex ? "*" : "") : "—") + "</td>"; }).join("") + "</tr>";
    });
    h += "</tbody></table></div>";
    host.innerHTML = h;
    var n = $("el-slnote");
    if (n) n.textContent = "Arcminutes of sidereal longitude, on instants the fits never saw, against JPL DE422 (3000 BCE – 3000 CE) and, " +
      "outside it, a numerical integration started from DE422. Three fits cover " + (SL ? SL.SPAN.label : D.span.label) +
      "; each era column is read from the fit Kālasetu uses there. * the Moon and true node before 3000 BCE (and after 3000 CE) " +
      "have no independent reference: the figure is the spread between two extrapolations. The band columns are 600 years each, labelled by their first year. " +
      "Written by fit-kalasetu; checked by kalasetu-verify. For scale, a nakṣatra pāda is 200′ and a D60 aṃśa 30′.";
  }

  function live(SL) {
    var host = $("el-sllive"), sl = $("el-slyear"); if (!host || !sl) return;
    var y = +sl.value, ms = Date.UTC(2000, 5, 21, 6, 0, 0);
    var d = new Date(ms); d.setUTCFullYear(y); ms = d.getTime();
    var jd = ms / 86400000 + 2440587.5, ay = window.__ayanFor("samanvaya_ecliptic", jd);
    var r = $("el-slyearread"); if (r) r.textContent = "21 June " + yearLabel(y) + ", 06:00 UT";
    var EN = { "Sūrya": "Sun", "Candra": "Moon", "Budha": "Mercury", "Śukra": "Venus",
               "Maṅgala": "Mars", "Guru": "Jupiter", "Śani": "Saturn" };
    var N = window.__kNodesModern ? window.__kNodesModern(ms) : null;
    var rows = Object.keys(EN).map(function (sa) {
      var e = window.__kEclipModern(EN[sa], ms), m = norm(e.trop - ay), s = SL.longitude(sa, ms);
      return [sa, s, m];
    });
    if (N) {
      rows.push(["Rāhu (mean)", SL.longitude("Rāhu", ms), norm(N.mean - ay)]);
      rows.push(["Rāhu (true)", SL.trueNode(ms), norm(N.true - ay)]);
    }
    host.innerHTML = '<div class="eltblwrap"><table class="aytab"><thead><tr><th>graha</th><th>Kālasetu engine</th>' +
      "<th>modern engine</th><th>difference</th></tr></thead><tbody>" + rows.map(function (q) {
        return "<tr><td><b>" + esc(q[0]) + "</b></td><td>" + dm(q[1]) + "</td><td>" + dm(q[2]) +
          "</td><td>" + am(sdiff(q[1], q[2]) * 60) + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }

  function bind() {
    var D = window.__KALASETU_DATA, SL = window.KalasetuEngine;
    if (!$("el-sltab")) return;
    if (!D || !SL || !SL.isFitted() || !window.__kEclipModern || !window.__ayanFor) {
      $("el-sltab").innerHTML = '<p class="swfail">The long-span engine or its fitted numbers did not load.</p>';
      return;
    }
    table(D, SL); live(SL);
    $("el-slyear").addEventListener("input", function () { live(SL); });
    window.__slLab = { live: function () { live(SL); } };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind); else bind();
})();
