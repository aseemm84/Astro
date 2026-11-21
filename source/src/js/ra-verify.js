/* ===== Reel Agent — the script checker ===================================

   Runs in every mode, offline included: an engine template can be wrong too,
   and a check that only ever runs on a model's output is a check that has
   never been tested against a known-good input.

   A script is [{ beats:[a,b], narration, caption }]. It is rejected for:

     number   a number, degree or date not among the facts — read in digits,
              Devanagari digits and spoken Hindi or English number words
     cover    beat ranges that do not cover every beat exactly once, in order
     caption  a caption longer than four words
     fit      a line that cannot fit its beats even stretched 4×

   Each violation names the line, so the editor can mark it. */
(function () {
  "use strict";
  var RA = window.RA = window.RA || {};
  var MAX_STRETCH = 4, GAP = 0.35;

  function words(s) { return String(s || "").trim().split(/\s+/).filter(Boolean); }

  function readSecs(text, lang) {
    if (window.SPScript && window.SPScript.readSecs) return window.SPScript.readSecs(text, lang);
    return Math.max(1, words(text).length / 2.4);
  }

  /* opts.clips: measured clip seconds per line, when the voice exists */
  function verify(lines, beats, facts, opts) {
    opts = opts || {};
    var V = [], lang = opts.lang || "hi";
    var fv = RA.facts.values(facts);
    var n = beats.length, next = 0;

    (lines || []).forEach(function (L, i) {
      var b = L.beats || [];
      var a = b[0], z = b.length > 1 ? b[1] : b[0];
      /* cover */
      if (!(a === next && z >= a && z < n)) {
        V.push({ line: i, kind: "cover",
                 en: "Line " + (i + 1) + " covers beats " + a + "–" + z + "; expected to start at " + next + ".",
                 hi: "पंक्ति " + (i + 1) + " बीट " + a + "–" + z + " लेती है; " + next + " से शुरू होनी चाहिए।" });
      }
      next = Math.max(next, (isFinite(z) ? z : next) + 1);
      /* numbers */
      RA.facts.numbersIn(L.narration).forEach(function (num) {
        var ok = fv.some(function (f) { return RA.facts.matches(num, f); });
        if (!ok) V.push({ line: i, kind: "number", value: num.v, raw: num.raw,
                          en: "Line " + (i + 1) + ": “" + num.raw + "” is not in the facts.",
                          hi: "पंक्ति " + (i + 1) + ": “" + num.raw + "” तथ्यों में नहीं है।" });
      });
      /* caption */
      if (words(L.caption).length > 4)
        V.push({ line: i, kind: "caption",
                 en: "Line " + (i + 1) + ": caption has " + words(L.caption).length + " words; at most 4.",
                 hi: "पंक्ति " + (i + 1) + ": कैप्शन में " + words(L.caption).length + " शब्द हैं; अधिकतम 4।" });
      /* fit */
      if (a != null && z != null && beats[a] && beats[z]) {
        var span = Math.max(0.05, beats[z].to - beats[a].from);
        var need = (opts.clips && opts.clips[i] != null ? opts.clips[i] : readSecs(L.narration, lang)) + GAP;
        if (need / span > MAX_STRETCH)
          V.push({ line: i, kind: "fit", stretch: need / span,
                   en: "Line " + (i + 1) + " needs " + need.toFixed(1) + " s over " + span.toFixed(1) +
                       " s of picture (" + (need / span).toFixed(1) + "×, limit " + MAX_STRETCH + "×). Shorten it or give it more beats.",
                   hi: "पंक्ति " + (i + 1) + " को " + need.toFixed(1) + " सेकंड चाहिए, दृश्य " + span.toFixed(1) +
                       " सेकंड का है (" + (need / span).toFixed(1) + "×, सीमा " + MAX_STRETCH + "×)। छोटा करें या अधिक बीट दें।" });
      }
    });
    if (next !== n)
      V.push({ line: (lines || []).length - 1, kind: "cover",
               en: "The script covers " + next + " of " + n + " beats.",
               hi: "स्क्रिप्ट " + n + " में से " + next + " बीट ही लेती है।" });
    return { ok: V.length === 0, violations: V };
  }

  /* ---- offline: the engine's own beats as lines -------------------------
     One line per beat; a beat with no text, or too short to carry its line,
     is merged into its neighbour so the 4× limit holds. Captions are the
     first words of the line, at most four, ending on a number if one is
     near the start. */
  /* function words a caption must not end on: "दो सुनहरी रेखाओं के" reads as
     a phrase cut off, which is what the first version produced */
  var TRAIL = /^(के|की|का|में|से|पर|को|ने|है|हैं|था|थे|और|या|एक|यह|वह|जो|भी|तक|of|the|a|an|in|on|to|and|is|are|its|ka|ki|ke|me|se|hai)$/i;
  function captionOf(text) {
    var clean = String(text || "").replace(/[“”"()]/g, "");
    /* clauses, split where a voice would pause */
    /* "4. रोहिणी" is one heading, not a clause "4" and another "रोहिणी":
       a full stop after a bare number is a list mark, not a pause */
    clean = clean.replace(/(^|\s)(\d+)\.\s+/g, "$1$2 ");
    var clauses = clean.split(/\s*[—–;:।?!]\s*|,\s+|\.\s+/).map(function (c) { return words(c); })
                       .filter(function (c) { return c.length > 1 || /[^\d.]/.test(c[0] || ""); });
    if (!clauses.length) return "";
    /* prefer the first clause that carries a number, else the first clause */
    var pick = clauses[0];
    for (var k = 0; k < clauses.length; k++)
      if (clauses[k].some(function (x) { return /[0-9०-९]/.test(x); })) { pick = clauses[k]; break; }
    var take = pick;
    if (take.length > 4) {
      var at = -1;
      for (var i = 0; i < take.length; i++) if (/[0-9०-९]/.test(take[i])) { at = i; break; }
      take = at >= 0 ? take.slice(Math.max(0, Math.min(at - 1, take.length - 4)), Math.max(0, Math.min(at - 1, take.length - 4)) + 4)
                     : take.slice(0, 4);
    }
    while (take.length > 1 && TRAIL.test(take[take.length - 1].replace(/[,.।]+$/, ""))) take = take.slice(0, -1);
    while (take.length > 1 && TRAIL.test(take[0])) take = take.slice(1);
    return take.join(" ").replace(/[,।.;:]+$/, "");
  }
  function linesFromBeats(beats, lang) {
    var L = [];
    beats.forEach(function (b, i) {
      var say = (b.say || "").trim();
      var last = L[L.length - 1];
      if (!say && last) { last.beats[1] = i; return; }
      L.push({ beats: [i, i], narration: say, caption: captionOf(say) });
    });
    /* merge forward until every line fits */
    var guard = 0, changed = true;
    while (changed && guard++ < 50) {
      changed = false;
      for (var k = 0; k < L.length; k++) {
        var x = L[k], span = beats[x.beats[1]].to - beats[x.beats[0]].from;
        var need = readSecs(x.narration, lang) + GAP;
        if (need / Math.max(0.05, span) > MAX_STRETCH && x.beats[1] < beats.length - 1) {
          var nx = L[k + 1];
          if (nx && !nx.narration) { x.beats[1] = nx.beats[1]; L.splice(k + 1, 1); changed = true; break; }
          if (nx) { x.beats[1] = nx.beats[0]; nx.beats[0]++; if (nx.beats[0] > nx.beats[1]) { x.narration += " " + nx.narration; x.beats[1] = nx.beats[1]; L.splice(k + 1, 1); } changed = true; break; }
        }
      }
    }
    if (L.length && L[0].beats[0] !== 0) L[0].beats[0] = 0;
    return L;
  }

  RA.verify = { verify: verify, linesFromBeats: linesFromBeats, captionOf: captionOf,
                MAX_STRETCH: MAX_STRETCH, GAP: GAP, readSecs: readSecs };
})();
