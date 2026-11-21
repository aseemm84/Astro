/* ===== Reel Agent — the adapter contract =================================

   One contract on every animating surface, so the agent, the verifier and
   the renderer never need to know which page they are on:

     describe()      → { surface, layouts:[{id,label,group,defaultSeconds}],
                         size:{W,H}, safeZones:{title,caption,footer} }
     configure(spec) → Promise; applies { layout, seconds, date, place,
                         palette, span, lang, … }
     ready()         → boolean
     duration()      → seconds (the surface's own clock)
     beats(lang)     → [{ i, from, to, say }] in the surface's seconds
     facts()         → [{ id, label, value, unit, kind, source }]
     frame(p, ctx)   → draws progress p (0..1) at W×H. Deterministic.

   The Reel Studio surface is first because it already had nearly all of it:
   SPStories.build makes a finished reel object, SPReel.frameAt draws any
   frame of it, SPScript narrates it. The adapter builds its OWN reel rather
   than reading the page's, so it works headless — on reel-agent.html and in
   the daily reel — and never disturbs what the reader has on screen.

   Every surface registers here; window.__bridge is the one for this page. */
(function () {
  "use strict";
  var RA = window.RA = window.RA || {};
  var REG = {};

  function register(id, factory) { REG[id] = factory; }
  function make(id) { return REG[id] ? REG[id]() : null; }
  function list() { return Object.keys(REG); }

  var W = 1080, H = 1920;

  /* ---- Reel Studio ------------------------------------------------------ */
  function reelStudio() {
    var REEL = null, SPEC = {}, BUSY = false;

    function have() { return !!(window.SPStories && window.SPReel && window.SPScript); }

    function describe() {
      var B = window.SPReel ? window.SPReel.bands(W, H, REEL || {}) : null;
      return {
        surface: "reel-studio",
        label: "Reel Studio",
        layouts: have() ? window.SPStories.TEMPLATES.map(function (t) {
          return { id: t.key, label: t.label, group: t.group, defaultSeconds: t.seconds };
        }) : [],
        size: { W: W, H: H },
        safeZones: B ? {
          title:   { x: W * 0.05, y: B.title.y, w: W * 0.90, h: B.title.h },
          caption: { x: W * 0.06, y: B.cap.y, w: W * 0.88, h: B.cap.h },
          footer:  { x: W * 0.05, y: B.foot.y - H * 0.02, w: W * 0.90, h: H - B.foot.y }
        } : null
      };
    }

    /* spec.seconds is the length the reader asked for; the reel is built at
       least as long as its own narration needs, so no line has to be
       stretched past the 4× the renderer allows */
    function configure(spec) {
      spec = spec || {};
      if (!have()) return Promise.reject(new Error("Reel Studio engines are not on this page"));
      var T = window.SPStories.byKey(spec.layout);
      if (!T) return Promise.reject(new Error("unknown layout " + spec.layout));
      BUSY = true;
      return new Promise(function (res, rej) {
        setTimeout(function () {
          try {
            var opt = { t0: spec.date ? +new Date(spec.date) : Date.now(),
                        years: spec.span || T.years, palette: spec.palette || "gold",
                        place: spec.place || null };
            opt.seconds = spec.seconds || T.seconds;
            var R = window.SPStories.build(spec.layout, opt);
            if (R && spec.lang) {
              var want = window.SPScript.suggestSeconds(R, spec.lang);
              if (want && want > opt.seconds * 1.05) {
                opt.seconds = Math.min(180, Math.ceil(want));
                R = window.SPStories.build(spec.layout, opt) || R;
              }
            }
            if (!R) throw new Error("that span produced too few events to make a reel");
            REEL = R; SPEC = spec; BUSY = false;
            res(describe());
          } catch (e) { BUSY = false; rej(e); }
        }, 0);
      });
    }

    function ready() { return !!REEL && !BUSY; }
    function duration() { return REEL ? REEL.seconds : 0; }

    /* beats in the surface's seconds. Hindi falls back to the festival
       writer where the engine has no Hindi of its own; `english` marks a
       beat whose text is still not in the language asked for. */
    function beats(lang) {
      if (!REEL) return [];
      lang = lang || "hi";
      var r = window.SPScript.render(REEL, lang);
      var B = r.beats.map(function (b, i) {
        return { i: i, from: b.from, to: b.to, secs: b.secs, say: b.say, need: b.need };
      });
      if (lang === "hi") {
        var hiL = RA.hi && RA.hi.festLines(REEL, B);
        if (hiL) B.forEach(function (b, i) { b.say = hiL[i]; b.need = window.SPScript.readSecs(b.say, "hi"); });
        B.forEach(function (b) { b.english = !!b.say && RA.hi.devanagariShare(b.say) < 0.5; });
      }
      return B;
    }

    function facts() {
      if (!REEL) return [];
      var F = RA.facts, out = F.FRAMEWORK.slice();
      var R = REEL, k;
      out.push({ id: "layout", label: "layout", value: R.key, unit: "", kind: "name", source: "engine" });
      out.push({ id: "title", label: "title", value: R.title, unit: "", kind: "name", source: "engine" });
      if (R.method) {
        out.push({ id: "method", label: "method", value: R.method, unit: "", kind: "name", source: "engine" });
        out = out.concat(F.harvest("method", "method", R.method));
      }
      var ay = window.__ayanName ? window.__ayanName() : null;
      if (ay) out.push({ id: "ayanamsa", label: "ayanāṃśa", value: ay, unit: "", kind: "name", source: "settings" });
      if (R.placeName) out.push({ id: "place", label: "place (sky computed for)", value: R.placeName, unit: "", kind: "name", source: "engine" });
      /* the reel's own measured bag: every field, numbers kept as numbers */
      if (R.facts) for (k in R.facts) {
        var v = R.facts[k];
        if (v == null || typeof v === "object" && !Array.isArray(v)) continue;
        if (Array.isArray(v)) v = v.join(" · ");
        var kind = typeof v === "number" ? "number" : /Txt$/.test(k) ? "degree" : "name";
        out.push({ id: "f." + k, label: k, value: v, unit: /lo$|hi$|Lon$|Lat$|Lim$/.test(k) ? "°" : "",
                   kind: kind, source: "engine (reel facts)" });
        if (typeof v === "string") out = out.concat(F.harvest("f." + k, k, v));
      }
      /* events: dates and the numbers each one prints */
      (R.events || []).forEach(function (e, i) {
        if (e.t && e.t > 0) out = out.concat(F.dateFacts("ev" + i, e.t, e.name || "event " + (i + 1)));
        ["big", "small", "note", "rule"].forEach(function (f) {
          if (e[f]) out = out.concat(F.harvest("ev" + i + "." + f, "event " + (i + 1) + " " + f, e[f]));
        });
      });
      /* the engine's own text: title, subtitle, closing, and its narration in
         every language — all computed from the same bag */
      out = out.concat(F.harvest("subtitle", "subtitle", R.subtitle || ""));
      if (R.closing) {
        out = out.concat(F.harvest("closing.big", "closing", R.closing.big || ""));
        (R.closing.lines || []).forEach(function (l, i) { out = out.concat(F.harvest("closing." + i, "closing", l || "")); });
      }
      ["hi", "hinglish", "en"].forEach(function (lang) {
        var r = window.SPScript.render(R, lang);
        r.beats.forEach(function (b, i) { out = out.concat(F.harvest("script." + lang + "." + i, "engine script", b.say)); });
      });
      out.push({ id: "reel.seconds", label: "reel length (s)", value: R.seconds, unit: "s", kind: "number", source: "engine" });
      out.push({ id: "reel.years", label: "span (years)", value: R.years, unit: "years", kind: "number", source: "engine" });
      return out;
    }

    function frame(p, ctx, opts) {
      if (!REEL) return null;
      return window.SPReel.frameAt(ctx, W, H, REEL, p, { text: !!(opts && opts.text) });
    }

    function postCaption(lang) {
      if (!REEL) return "";
      var r = window.SPScript.render(REEL, lang === "hi" ? "hi" : lang);
      return r.caption + "\n\n" + r.tags;
    }

    return { describe: describe, configure: configure, ready: ready, duration: duration,
             beats: beats, facts: facts, frame: frame, postCaption: postCaption,
             title: function () { return REEL ? (RA.hi.title(REEL) || REEL.title) : ""; },
             reel: function () { return REEL; }, spec: function () { return SPEC; } };
  }
  register("reel-studio", reelStudio);

  RA.adapter = { register: register, make: make, list: list, W: W, H: H };
  /* the page's own surface: on any page carrying the Reel Studio engines */
  if (window.SPStories && !window.__bridge) window.__bridge = reelStudio();
})();
