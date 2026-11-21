/* ===== Reel Agent — AI providers (Connected mode only) ===================

   Two tool-use dialects behind one shape, so ra-agent.js never knows which it
   is talking to:

     neutral message  { role: "user"|"assistant", text?, calls?, results?, raw? }
     neutral reply    { text, calls:[{ id, name, input }], usage:{ in, out }, stop }

   Anthropic Messages API (tool use) and the Gemini API (function calling).
   An assistant turn keeps its provider's own content as `raw` and is sent
   back verbatim, because Gemini requires its thought signatures returned
   unchanged and Anthropic its tool_use blocks.

   EVERY REQUEST PASSES THREE GATES before it exists:
     1. RA.net.assert — Connected mode must be on;
     2. privacy() — the body may not carry a chart or birth field, nor any
        value from the chart stored in this browser (its name, date, place);
     3. the host is one of three, fixed here and, in the desktop app, fixed
        again in Rust.

   In the desktop app the request is made by Rust (ai_request), which reads
   the key from the keychain itself; on the website it is a direct fetch. */
(function () {
  "use strict";
  var RA = window.RA = window.RA || {};
  var HOSTS = { anthropic: "https://api.anthropic.com", gemini: "https://generativelanguage.googleapis.com",
                elevenlabs: "https://api.elevenlabs.io" };

  /* ---- privacy ---------------------------------------------------------- */
  var FIELD = /"(dob|tob|birth\w*|janma\w*|latitude|longitude|lat|lon|lng|tz|timezone|natal\w*|kundli\w*|kundali\w*|chart_?(name|id|input)|person\w*)"\s*:/i;
  function chartValues() {
    var v = [];
    try {
      var c = JSON.parse(localStorage.getItem("learnhoro.chart") || "null");
      var walk = function (o, d) {
        if (!o || d > 3) return;
        Object.keys(o).forEach(function (k) {
          var x = o[k];
          if (typeof x === "string" && x.length >= 4 && /name|place|city|date|time|dob|tob|birth/i.test(k)) v.push(x);
          else if (typeof x === "object") walk(x, d + 1);
        });
      };
      walk(c, 0);
    } catch (e) {}
    return v;
  }
  function privacy(body) {
    var s = typeof body === "string" ? body : JSON.stringify(body);
    var m = FIELD.exec(s);
    if (m) throw new Error("Refused: the request would carry a chart or birth field (“" + m[1] + "”). Nothing was sent.");
    chartValues().forEach(function (x) {
      if (s.indexOf(x) >= 0) throw new Error("Refused: the request would carry a detail of the chart stored in this browser. Nothing was sent.");
    });
    return s;
  }

  /* ---- transport -------------------------------------------------------- */
  function send(provider, path, body, opts) {
    RA.net.assert(provider + " request");
    var json = privacy(body);
    opts = opts || {};
    if (RA.core.inApp()) {
      return RA.core.invoke("ai_request", { provider: provider, path: path, body: json, method: opts.method || "POST" })
        .then(function (r) { return typeof r === "string" ? JSON.parse(r) : r; });
    }
    var key = RA.keys.webKey(provider);
    if (!key) return Promise.reject(new Error("No " + provider + " key stored in this browser."));
    var h = { "content-type": "application/json" };
    if (provider === "anthropic") {
      h["x-api-key"] = key; h["anthropic-version"] = "2023-06-01";
      h["anthropic-dangerous-direct-browser-access"] = "true";
    } else if (provider === "gemini") h["x-goog-api-key"] = key;
    else if (provider === "elevenlabs") h["xi-api-key"] = key;
    var init = { method: opts.method || "POST", headers: h };
    if ((opts.method || "POST") !== "GET") init.body = json;
    return fetch(HOSTS[provider] + path, init).then(function (r) {
      if (opts.binary && r.ok) return r.arrayBuffer();
      return r.text().then(function (t) {
        var j = null; try { j = JSON.parse(t); } catch (e) {}
        if (!r.ok) throw new Error(provider + " " + r.status + ": " + (j && (j.error && (j.error.message || j.error.type)) || t.slice(0, 200)));
        return j;
      });
    });
  }

  /* ---- Anthropic -------------------------------------------------------- */
  var anthropic = {
    id: "anthropic", defaultModel: "claude-haiku-5-5",
    request: function (o) {
      var msgs = o.messages.map(function (m) {
        if (m.raw) return { role: m.role, content: m.raw };
        if (m.results) return { role: "user", content: m.results.map(function (r) {
          return { type: "tool_result", tool_use_id: r.id, content: JSON.stringify(r.content), is_error: !!r.error }; }) };
        return { role: m.role, content: m.text };
      });
      return { model: o.model || anthropic.defaultModel, max_tokens: o.maxTokens || 4000, system: o.system,
               tools: o.tools.map(function (t) { return { name: t.name, description: t.description, input_schema: t.parameters }; }),
               messages: msgs };
    },
    parse: function (j) {
      var calls = [], text = "";
      (j.content || []).forEach(function (b) {
        if (b.type === "text") text += b.text;
        if (b.type === "tool_use") calls.push({ id: b.id, name: b.name, input: b.input || {} });
      });
      return { text: text, calls: calls, raw: j.content, stop: j.stop_reason,
               usage: { in: j.usage ? j.usage.input_tokens : 0, out: j.usage ? j.usage.output_tokens : 0 } };
    },
    call: function (o) { return send("anthropic", "/v1/messages", anthropic.request(o)).then(anthropic.parse); },
    models: function () {
      return send("anthropic", "/v1/models?limit=100", null, { method: "GET" }).then(function (j) {
        return (j.data || []).map(function (m) { return { id: m.id, label: m.display_name || m.id }; });
      });
    }
  };

  /* ---- Gemini ----------------------------------------------------------- */
  var gemini = {
    id: "gemini", defaultModel: "gemini-3.5-flash-lite",
    request: function (o) {
      var contents = o.messages.map(function (m) {
        if (m.raw) return m.raw;
        if (m.results) return { role: "user", parts: m.results.map(function (r) {
          return { functionResponse: { name: r.name, id: r.id, response: { result: r.content } } }; }) };
        return { role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.text }] };
      });
      return { systemInstruction: { parts: [{ text: o.system }] }, contents: contents,
               tools: [{ functionDeclarations: o.tools.map(function (t) {
                 return { name: t.name, description: t.description, parameters: t.parameters }; }) }] };
    },
    parse: function (j) {
      var c = j.candidates && j.candidates[0], calls = [], text = "";
      ((c && c.content && c.content.parts) || []).forEach(function (p, i) {
        if (p.text) text += p.text;
        if (p.functionCall) calls.push({ id: p.functionCall.id || ("call" + i), name: p.functionCall.name, input: p.functionCall.args || {} });
      });
      var u = j.usageMetadata || {};
      return { text: text, calls: calls, raw: c && c.content, stop: c && c.finishReason,
               usage: { in: u.promptTokenCount || 0, out: (u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0) } };
    },
    call: function (o) {
      var m = o.model || gemini.defaultModel;
      return send("gemini", "/v1beta/models/" + encodeURIComponent(m) + ":generateContent", gemini.request(o)).then(gemini.parse);
    },
    models: function () {
      return send("gemini", "/v1beta/models?pageSize=200", null, { method: "GET" }).then(function (j) {
        return (j.models || []).filter(function (m) {
          return (m.supportedGenerationMethods || []).indexOf("generateContent") >= 0;
        }).map(function (m) { return { id: m.name.replace(/^models\//, ""), label: m.displayName || m.name }; });
      });
    }
  };

  /* ---- a scripted provider for the test harness ------------------------- */
  function mock(script) {
    var i = 0;
    return { id: "mock", defaultModel: "mock", calls: [],
             call: function (o) { this.calls.push(o); var step = script[Math.min(i++, script.length - 1)];
                                  return Promise.resolve(typeof step === "function" ? step(o) : step); },
             models: function () { return Promise.resolve([{ id: "mock", label: "mock" }]); } };
  }

  /* ---- price, for the running estimate ----------------------------------
     USD per million tokens. Claude from Anthropic's model pages at the time of
     writing; an unknown model shows tokens only. An estimate, labelled so. */
  var PRICE = [[/haiku-5/, 0.10, 0.50], [/sonnet-5/, 2, 10], [/opus-5/, 4, 20], [/fable-5/, 10, 50]];
  function cost(model, usage) {
    for (var k = 0; k < PRICE.length; k++) if (PRICE[k][0].test(model || ""))
      return (usage.in * PRICE[k][1] + usage.out * PRICE[k][2]) / 1e6;
    return null;
  }

  /* ---- neural voices ---------------------------------------------------- */
  function b64ToBytes(b64) {
    var s = atob(b64), u = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
    return u;
  }
  function pcm16ToBuffer(u8, rate) {
    var n = Math.floor(u8.length / 2), f = new Float32Array(n), dv = new DataView(u8.buffer, u8.byteOffset, u8.length);
    for (var i = 0; i < n; i++) f[i] = dv.getInt16(i * 2, true) / 32768;
    return RA.voice.fromPCM(f, rate || 24000);
  }
  var GEMINI_VOICE = { female: "Kore", male: "Charon" };
  RA.voice.P["gemini-tts"] = {
    id: "gemini-tts", network: true, label: "Gemini neural voice / Gemini न्यूरल आवाज़",
    model: "gemini-3.8-flash-tts",
    synth: function (text, o) {
      var model = o.model && /tts/.test(o.model) ? o.model : RA.voice.P["gemini-tts"].model;
      var voice = GEMINI_VOICE[o.voice] || "Kore";
      var styled = (o.lang === "en" ? "" : "Read this in clear, warm, natural Hindi, at a calm storytelling pace: ") + text;
      var path = "/v1beta/models/" + encodeURIComponent(model) + ":generateContent";
      /* the voice field has two shapes across model generations; try the
         newer one, fall back to the older */
      var body = function (shape) {
        return { contents: [{ role: "user", parts: [{ text: styled }] }],
                 generationConfig: { responseModalities: ["AUDIO"],
                   speechConfig: shape === "new" ? { voiceConfig: { voice: voice } }
                                                 : { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } };
      };
      return send("gemini", path, body("new")).catch(function (e) {
        if (!/400/.test(e.message)) throw e;
        return send("gemini", path, body("old"));
      }).then(function (j) {
        var part = j.candidates && j.candidates[0] && j.candidates[0].content.parts.filter(function (p) { return p.inlineData; })[0];
        if (!part) throw new Error("Gemini returned no audio");
        var mime = part.inlineData.mimeType || "", bytes = b64ToBytes(part.inlineData.data);
        if (/wav|mpeg|mp3|ogg/.test(mime) || (bytes[0] === 0x52 && bytes[1] === 0x49)) return RA.voice.decode(bytes);
        var rate = +((/rate=(\d+)/.exec(mime) || [])[1] || 24000);
        return pcm16ToBuffer(bytes, rate);
      });
    }
  };
  var EL_VOICE = { female: "", male: "" };
  RA.voice.P.elevenlabs = {
    id: "elevenlabs", network: true, label: "ElevenLabs",
    synth: function (text, o) {
      var vid = o.elevenVoice || EL_VOICE[o.voice];
      if (!vid) return Promise.reject(new Error("Choose an ElevenLabs voice ID in settings first."));
      return send("elevenlabs", "/v1/text-to-speech/" + encodeURIComponent(vid) + "?output_format=pcm_24000",
                  { text: text, model_id: "eleven_multilingual_v2" }, { binary: true })
        .then(function (buf) {
          if (buf instanceof ArrayBuffer) return pcm16ToBuffer(new Uint8Array(buf), 24000);
          if (buf && buf.b64) return pcm16ToBuffer(b64ToBytes(buf.b64), 24000);
          throw new Error("ElevenLabs returned no audio");
        });
    }
  };

  RA.providers = { anthropic: anthropic, gemini: gemini, mock: mock, send: send, privacy: privacy,
                   cost: cost, HOSTS: HOSTS, get: function (id) { return id === "gemini" ? gemini : anthropic; } };
})();
