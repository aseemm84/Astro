/* ===== Reel Agent — loudness =============================================

   Integrated loudness by ITU-R BS.1770-4, written here rather than imported:
   K-weighting (a high shelf and a high-pass, the standard's own 48 kHz
   coefficients), mean square over 400 ms blocks every 100 ms, an absolute
   gate at −70 LUFS and a relative gate 10 LU below the ungated mean.

   Reels are normalised to about −14 LUFS, where the platforms that would
   play them normalise anyway — a quieter file is turned up with its noise,
   a louder one is turned down after its peaks have already been clipped.
   The ceiling is a sample peak of −1 dBFS: a true-peak meter would
   oversample, and the difference here is a fraction of a decibel. */
(function () {
  "use strict";
  var RA = window.RA = window.RA || {};

  function biquad(x, b, a) {
    var y = new Float32Array(x.length), x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (var i = 0; i < x.length; i++) {
      var v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
      x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
    }
    return y;
  }
  var S1 = { b: [1.53512485958697, -2.69169618940638, 1.19839281085285], a: [1, -1.69065929318241, 0.73248077421585] };
  var S2 = { b: [1, -2, 1], a: [1, -1.99004745483398, 0.99007225036621] };

  /* data: Float32Array mono at 48 kHz → LUFS (−Infinity for silence) */
  function lufs(data, rate) {
    rate = rate || 48000;
    var k = biquad(biquad(data, S1.b, S1.a), S2.b, S2.a);
    var blk = Math.round(0.4 * rate), hop = Math.round(0.1 * rate), z = [];
    for (var s = 0; s + blk <= k.length; s += hop) {
      var m = 0;
      for (var i = s; i < s + blk; i++) m += k[i] * k[i];
      z.push(m / blk);
    }
    if (!z.length) return -Infinity;
    function L(v) { return -0.691 + 10 * Math.log10(v); }
    var abs = z.filter(function (v) { return v > 0 && L(v) > -70; });
    if (!abs.length) return -Infinity;
    var mean = abs.reduce(function (a, b) { return a + b; }, 0) / abs.length;
    var rel = L(mean) - 10;
    var g = abs.filter(function (v) { return L(v) > rel; });
    var m2 = g.reduce(function (a, b) { return a + b; }, 0) / Math.max(1, g.length);
    return L(m2);
  }

  /* normalise in place; returns { before, after, gainDb, peakDb } */
  function normalise(data, rate, target, ceilingDb) {
    target = target == null ? -14 : target;
    ceilingDb = ceilingDb == null ? -1 : ceilingDb;
    var before = lufs(data, rate);
    if (!isFinite(before)) return { before: before, after: before, gainDb: 0, peakDb: -Infinity };
    var gainDb = target - before, peak = 0, i;
    for (i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
    var peakAfter = 20 * Math.log10(peak || 1e-9) + gainDb;
    if (peakAfter > ceilingDb) gainDb -= (peakAfter - ceilingDb);
    var g = Math.pow(10, gainDb / 20);
    for (i = 0; i < data.length; i++) data[i] *= g;
    return { before: before, after: lufs(data, rate), gainDb: gainDb,
             peakDb: 20 * Math.log10(peak * g || 1e-9) };
  }

  RA.loudness = { lufs: lufs, normalise: normalise };
})();
