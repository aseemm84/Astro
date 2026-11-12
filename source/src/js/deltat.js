/* ΔT = TT − UT1, observed where it has been observed.
 *
 * WHY. astronomy-engine's default is Espenak & Meeus (2006): polynomials fitted
 * to the record up to about 2005 and EXTRAPOLATED after it. The extrapolation
 * assumed ΔT would keep rising; it did not — it has sat near 69 s since 2017 as
 * the Earth's rotation sped up. So the default gave 74.0 s for 2024 against an
 * observed 69.2 s, and the gap widens every year after. ΔT does not touch the
 * lagna (that runs on UT), but it does touch every ephemeris position: about
 * 2.6″ on the Moon for a chart cast today, and a few seconds on tithi and
 * nakṣatra end times. timescale-verify.mjs found it by holding the published
 * ΔT to the observed values.
 *
 * WHAT IS USED:
 *   - from 1955.0 to the last observed year: the observed values below,
 *     linearly interpolated (IERS / USNO, ΔT at 1 January of each year, s);
 *   - before 1955: Espenak & Meeus, which was fitted to observation there and
 *     agrees with the 1955 value to a tenth of a second;
 *   - after the last observed year: Espenak & Meeus's SLOPE carried on from the
 *     last observed value — its trend rather than its now-wrong level, so the
 *     curve is continuous and a future date is not five seconds off on day one.
 *
 * This file is loaded immediately after astronomy-engine on every page that
 * loads it, so no two pages can disagree about ΔT. */
(function () {
  "use strict";
  var A = (typeof window !== "undefined" && window.Astronomy) ||
          (typeof Astronomy !== "undefined" ? Astronomy : null);
  if (!A || !A.SetDeltaTFunction || !A.DeltaT_EspenakMeeus) return;
  var OBS = [
    [1955, 31.11], [1960, 33.15], [1965, 35.73], [1970, 40.18], [1975, 45.48],
    [1980, 50.54], [1985, 54.34], [1990, 56.86], [1995, 60.78], [2000, 63.83],
    [2005, 64.69], [2010, 66.07], [2015, 67.64], [2016, 68.10], [2017, 68.59],
    [2018, 68.97], [2019, 69.22], [2020, 69.36], [2021, 69.36], [2022, 69.29],
    [2023, 69.20], [2024, 69.18], [2025, 69.10]
  ];
  var EM = A.DeltaT_EspenakMeeus;
  var Y0 = OBS[0][0], YN = OBS[OBS.length - 1][0], DN = OBS[OBS.length - 1][1];
  /* ut: days since J2000.0 (12h UT, 1 Jan 2000), as astronomy-engine passes it */
  function year(ut) { return 2000 + (ut - 0.5) / 365.2425; }
  function utOf(y) { return (y - 2000) * 365.2425 + 0.5; }
  var emAtYN = EM(utOf(YN));
  function deltaT(ut) {
    var y = year(ut);
    if (y < Y0) return EM(ut);
    if (y >= YN) return DN + (EM(ut) - emAtYN);
    for (var i = 1; i < OBS.length; i++) {
      if (y < OBS[i][0]) {
        var a = OBS[i - 1], b = OBS[i], f = (y - a[0]) / (b[0] - a[0]);
        return a[1] + f * (b[1] - a[1]);
      }
    }
    return DN;
  }
  A.SetDeltaTFunction(deltaT);
  try { window.__deltaT = { fn: deltaT, observed: OBS, model: "observed 1955–" + YN +
        " (IERS/USNO), Espenak–Meeus before 1955 and its slope after " + YN }; } catch (e) {}
})();
