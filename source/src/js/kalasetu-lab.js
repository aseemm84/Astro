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

  function table(D) {
    var host = $("el-sltab"); if (!host) return;
    var bands = (D.residuals["Sūrya"].bands || []).map(function (b) { return b.from; });
    var h = '<div class="eltblwrap"><table class="aytab elerr"><thead><tr><th>graha</th><th>held back, rms</th><th>worst</th>' +
      bands.map(function (y) { return "<th>" + esc(yearLabel(y + 1)) + "</th>"; }).join("") +
      "</tr></thead><tbody>";
    ROWS.forEach(function (r) {
      var R = D.residuals[r[0]]; if (!R) return;
      h += "<tr><td><b>" + esc(r[0]) + "</b> <span class=\"elw\">" + esc(r[1]) + "</span></td><td>" +
        am(R.holdout.rms) + "</td><td>" + am(R.holdout.worst) + "</td>" +
        bands.map(function (_, i) { var B = R.bands && R.bands[i]; return "<td>" + (B ? am(B.rms) : "—") + "</td>"; }).join("") + "</tr>";
    });
    h += "</tbody></table></div>";
    host.innerHTML = h;
    var n = $("el-slnote");
    if (n) n.textContent = "Arcminutes of sidereal longitude, against the modern engine, on " + D.samples.holdout +
      " instants the fit never saw (" + D.samples.total + " in all, spread over " + D.span.label +
      "). The band columns are 600-year bands, each labelled by its first year. Written by fit-kalasetu; " +
      "checked by kalasetu-verify. For scale, a nakṣatra pāda is 200′ and a D60 aṃśa 30′.";
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
    table(D); live(SL);
    $("el-slyear").addEventListener("input", function () { live(SL); });
    window.__slLab = { live: function () { live(SL); } };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind); else bind();
})();
