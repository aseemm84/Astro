/* ===== Reel Agent — the agent loop (Connected mode) ======================

   A provider-neutral tool-use loop. The model chooses a layout, reads its
   facts, writes a script and must pass the fact check before it may finish.
   It never synthesises a voice and never draws a frame: when it calls
   finish, the same pipeline as offline mode takes over.

   The tools are JavaScript calling the page's own adapters. None of them
   touches the network; the only request in a run is the one to the model.

     list_layouts(filter)      every layout on every surface on this page
     get_facts(layout,seconds) configure + facts() + beats("hi")
     get_today(date)           the Studio's ideas, each with a layout
     write_script(lines)       [{ beats:[a,b], narration, caption }]
     verify_script()           violations — must be empty before finish
     get_sky(date,time)        the grahas, the Moon's phase and the next month
                               of events for a date (story reels), as facts
     kahani_scenes(scenes)     kahani mode only
     finish(caption_text, hashtags)

   A step limit stops a model that loops; a running token count and cost
   estimate are reported after every step. */
(function () {
  "use strict";
  var RA = window.RA = window.RA || {};
  var MAX_STEPS = 12;

  var TOOLS = [
    { name: "list_layouts", description: "List the reel layouts available on this page. Optional filter: words matched against the layout's id, label and group (e.g. 'rohini', 'nakshatra', 'diwali', 'vakri').",
      parameters: { type: "object", properties: { filter: { type: "string" } } } },
    { name: "get_facts", description: "Build a layout and return its computed facts (every number the narration may use) and its beats (the picture's segments, with the engine's own Hindi line for each). Call before writing any script.",
      parameters: { type: "object", properties: { layout: { type: "string" }, seconds: { type: "number" } }, required: ["layout"] } },
    { name: "get_today", description: "Today's reel ideas from the Studio, each with a suggested layout and the reason it fits today.",
      parameters: { type: "object", properties: { date: { type: "string", description: "YYYY-MM-DD" } } } },
    { name: "write_script", description: "Submit the script: one entry per beat range, covering every beat exactly once in order. beats is [first, last] inclusive. narration is the spoken line; caption is at most 4 words.",
      parameters: { type: "object", properties: { lines: { type: "array", items: { type: "object", properties: {
        beats: { type: "array", items: { type: "integer" }, minItems: 2, maxItems: 2 },
        narration: { type: "string" }, caption: { type: "string" } }, required: ["beats", "narration", "caption"] } } }, required: ["lines"] } },
    { name: "verify_script", description: "Check the submitted script against the facts and the beats. Returns violations; fix them and resubmit until it returns ok.",
      parameters: { type: "object", properties: {} } },
    { name: "get_sky", description: "Story reels: the nine grahas' sidereal places (lon, rāśi, nakṣatra, pāda, retrograde), the Moon's phase and the next 30 days of ingresses, stations and new/full moons, for a date (YYYY-MM-DD) and optional time (HH:MM) at the saved place. Every number returned may then be used in a scene or a line.",
      parameters: { type: "object", properties: { date: { type: "string" }, time: { type: "string" } } } },
    { name: "kahani_scenes", description: "Story reels: submit the scenes. title (with one *highlighted* word) and kicker are the top band. Each scene: say (the line), caption (2–4 words, one *highlighted*), seconds, and any of: layout {type: wheel|nakshatra|moon|cards|timeline|stat|orb|retro, …data from get_facts/get_sky}, props [moon|mountains|cloud|tree or {p,x,y,s}], svg (a fragment for the character art), motion {entrance: rise|fade|zoom|none, bob, parallax, sway}. A layout showing a number not in the facts is refused.",
      parameters: { type: "object", properties: { title: { type: "string" }, kicker: { type: "string" },
        scenes: { type: "array", items: { type: "object" } } }, required: ["scenes"] } },
    { name: "finish", description: "End the run once verify_script returns ok. caption_text is the post caption; hashtags a list.",
      parameters: { type: "object", properties: { caption_text: { type: "string" }, hashtags: { type: "array", items: { type: "string" } } }, required: ["caption_text"] } }
  ];

  function skillText(name) {
    var S = RA.skills || {}, s = S[name];
    if (!s) return "";
    var inc = (s.meta && s.meta.includes || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean);
    return inc.map(function (n) { return S[n] ? S[n].body : ""; }).concat([s.body]).join("\n\n---\n\n");
  }
  function custom(name) {
    try { var c = JSON.parse(localStorage.getItem("nirayana.reelAgent.skills") || "{}"); return c[name] || null; } catch (e) { return null; }
  }

  var RULES =
    "\n\n---\n\nNON-NEGOTIABLE (enforced in code as well):\n" +
    "- Every number, date, degree and name in a narration — and every number a story layout shows — must come from get_facts or get_sky. Both are checked and refused otherwise.\n" +
    "- Mythology is story, said as story. No predictions about any person, no remedies. Where needed: \"शास्त्रीय अध्ययन का ढाँचा, भविष्यवाणी नहीं\".\n" +
    "- You have no access to anyone's birth data or chart, and must not ask for it.\n" +
    "- Finish only after verify_script returns ok.";

  function system(o) {
    var body = custom(o.skill) || skillText(o.skill || "astro-reel");
    return body + RULES + "\n\nOutput language for narration: " +
      ({ hi: "pure Hindi in Devanagari", hinglish: "Hinglish in Roman script", en: "English" }[o.lang] || "pure Hindi") +
      ". Target length: about " + (o.seconds || 45) + " seconds of speech.";
  }
  function firstMessage(o) {
    var m = "Request: " + (o.brief || "(none — make the best reel for the layout given)");
    if (o.layout) m += "\nLayout chosen on the page: " + o.layout;
    return m;
  }

  /* everything that will leave the device on the first call */
  function preview(o) {
    var P = RA.providers.get(o.provider);
    return { host: RA.providers.HOSTS[P.id] || RA.providers.HOSTS.anthropic, model: o.model || P.defaultModel,
             system: system(o), message: firstMessage(o), tools: TOOLS.map(function (t) { return t.name; }),
             later: "Each later step sends the tool results: the layout's computed facts (numbers, names, dates of the sky event) and the engine's beats. Never your birth data or chart." };
  }

  /* facts as the model sees them: no place, compact */
  function factsForModel(F) {
    return F.filter(function (f) { return f.id !== "place" && !/^script\./.test(f.id); }).slice(0, 260)
      .map(function (f) { return { id: f.id, label: f.label, value: f.value, unit: f.unit || undefined }; });
  }

  function run(o, on) {
    on = on || function () {};
    var P = o.providerImpl || RA.providers.get(o.provider);
    var model = o.model || P.defaultModel;
    var A = o.adapter, lang = o.lang || "hi";
    var state = { layout: o.layout || null, beats: null, facts: null, lines: null, verified: false,
                  scenes: null, finish: null, usage: { in: 0, out: 0 }, steps: 0 };
    var msgs = [{ role: "user", text: firstMessage(o) }];
    var sys = system(o);

    var impl = {
      list_layouts: function (a) {
        var q = String(a.filter || "").toLowerCase().split(/\s+/).filter(Boolean);
        var all = A.describe().layouts.filter(function (L) {
          var hay = (L.id + " " + L.label + " " + L.group).toLowerCase();
          return !q.length || q.some(function (w) { return hay.indexOf(w) >= 0; });
        });
        return { count: all.length, layouts: all.slice(0, 40) };
      },
      get_facts: function (a) {
        return A.configure({ layout: a.layout, seconds: a.seconds || o.seconds, lang: lang }).then(function () {
          state.layout = a.layout; state.facts = A.facts(); state.beats = A.beats(lang);
          state.lines = null; state.verified = false;
          return { layout: a.layout, title: A.title ? A.title() : "", seconds: A.duration(),
                   beats: state.beats.map(function (b) { return { i: b.i, from: +b.from.toFixed(2), to: +b.to.toFixed(2), say: b.say }; }),
                   facts: factsForModel(state.facts) };
        });
      },
      get_today: function (a) {
        if (RA.today) return RA.today(a.date);
        return { error: "today's ideas are not available on this page" };
      },
      write_script: function (a) {
        if (!state.beats) return { error: "call get_facts first" };
        state.lines = (a.lines || []).map(function (l) {
          return { beats: [l.beats[0] | 0, (l.beats[1] == null ? l.beats[0] : l.beats[1]) | 0],
                   narration: String(l.narration || ""), caption: String(l.caption || "") };
        });
        state.verified = false;
        return { ok: true, lines: state.lines.length, beats: state.beats.length };
      },
      verify_script: function () {
        if (!state.lines) return { error: "write_script first" };
        var v = RA.verify.verify(state.lines, state.beats, state.facts, { lang: lang });
        state.verified = v.ok;
        state.violations = v.violations;
        return { ok: v.ok, violations: v.violations.map(function (x) { return { line: x.line + 1, kind: x.kind, message: x.en }; }) };
      },
      get_sky: function (a) {
        if (!RA.kahani || !RA.kahani.sky) return { error: "the sky is not available on this page" };
        var r = RA.kahani.sky(a.date, a.time);
        if (r.error) return r;
        state.facts = (state.facts || []).concat(r.facts);
        return r.data;
      },
      kahani_scenes: function (a) {
        if (!RA.kahani) return { error: "kahani mode is not available on this page" };
        var facts = (state.facts || []).concat(RA.facts.FRAMEWORK);
        var r = RA.kahani.accept(a.scenes || [], { title: a.title, kicker: a.kicker }, facts);
        state.scenes = r.scenes; state.kahani = true; state.layout = "kahani";
        state.beats = RA.kahani.surface().beats();
        state.facts = facts;
        state.lines = null; state.verified = false;
        if (r.refused.length) return { ok: false, refused: r.refused,
          message: "These layouts show numbers that are not in the facts. Use the exact values from get_facts or get_sky, or drop the number, and resubmit all scenes." };
        return { ok: true, scenes: r.scenes.length, removed_by_sanitiser: r.removed,
                 beats: state.beats.map(function (b) { return { i: b.i, from: b.from, to: b.to }; }),
                 next: "write_script with one line per scene (beats [i, i]), then verify_script" };
      },
      finish: function (a) {
        if (!state.verified) return { error: "verify_script must return ok before finish" };
        state.finish = { caption: String(a.caption_text || ""), hashtags: a.hashtags || [] };
        return { ok: true };
      }
    };

    function step() {
      if (state.finish) return Promise.resolve(state);
      if (state.steps >= MAX_STEPS) {
        var e = new Error("The agent did not finish within " + MAX_STEPS + " steps."); e.state = state; return Promise.reject(e);
      }
      state.steps++;
      on({ type: "step", n: state.steps });
      return P.call({ system: sys, messages: msgs, tools: TOOLS, model: model, maxTokens: 4000 }).then(function (r) {
        state.usage.in += r.usage.in || 0; state.usage.out += r.usage.out || 0;
        on({ type: "usage", usage: state.usage, cost: RA.providers.cost(model, state.usage), text: r.text });
        msgs.push({ role: "assistant", text: r.text, raw: r.raw || null, calls: r.calls });
        if (!r.calls.length) {
          msgs.push({ role: "user", text: "Continue with the tools. Finish only after verify_script returns ok." });
          return step();
        }
        var results = [];
        return r.calls.reduce(function (p, c) {
          return p.then(function () {
            on({ type: "tool", name: c.name });
            var f = impl[c.name];
            return Promise.resolve(f ? f(c.input || {}) : { error: "unknown tool " + c.name })
              .catch(function (e) { return { error: e.message }; })
              .then(function (res) { results.push({ id: c.id, name: c.name, content: res, error: !!(res && res.error) }); });
          });
        }, Promise.resolve()).then(function () {
          msgs.push({ role: "user", results: results });
          return step();
        });
      });
    }
    return step();
  }

  RA.agent = { run: run, TOOLS: TOOLS, preview: preview, system: system, skillText: skillText, MAX_STEPS: MAX_STEPS };
})();
