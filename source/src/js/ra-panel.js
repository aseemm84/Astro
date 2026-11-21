/* ===== Reel Agent — the panel ============================================

   "Make reel / रील बनाएँ" on any page that hosts a surface opens this. It is
   the same panel everywhere: options, live progress through the seven steps,
   then a preview with the script, the files and the caption.

   It never posts anything. The last line of the panel says so, because a
   button that makes a finished video invites the question. */
(function () {
  "use strict";
  var RA = window.RA = window.RA || {};
  var C = function () { return RA.core; };
  var STEPS = ["s_layout", "s_facts", "s_script", "s_check", "s_voice", "s_render", "s_done"];

  var CSS =
    ".ra-ov{position:fixed;inset:0;z-index:9000;background:rgba(10,12,24,.55);display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:4vh 16px}" +
    ".ra-pn{background:var(--surface,#fbfbfd);color:var(--text,#20233a);border:1px solid var(--border-2,#d8d8e6);border-radius:14px;max-width:980px;width:100%;box-shadow:0 18px 60px rgba(0,0,0,.35);font:15px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif}" +
    ".ra-hd{display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--border,#e7e7f0)}" +
    ".ra-hd h2{margin:0;font-size:1.15rem;flex:1}.ra-hd .kdeva{color:var(--accent,#c9a24b);margin-left:.4em;font-weight:600}" +
    ".ra-x{background:none;border:1px solid var(--border-2,#d8d8e6);border-radius:8px;padding:4px 10px;cursor:pointer;color:inherit}" +
    ".ra-bd{display:grid;grid-template-columns:minmax(260px,340px) 1fr;gap:18px;padding:16px 18px}" +
    "@media (max-width:760px){.ra-bd{grid-template-columns:1fr}}" +
    ".ra-f label{display:block;margin:0 0 10px;font-size:.92rem;color:var(--text-soft,#4a4e68)}" +
    ".ra-f select,.ra-f textarea,.ra-f input[type=file]{display:block;width:100%;margin-top:4px;font:inherit;color:var(--text,#20233a);background:var(--surface-3,#fff);border:1px solid var(--border-2,#d8d8e6);border-radius:8px;padding:6px 8px;box-sizing:border-box}" +
    ".ra-f textarea{min-height:64px}.ra-row{display:flex;gap:8px;flex-wrap:wrap}" +
    ".ra-b{font:inherit;border-radius:9px;padding:8px 14px;cursor:pointer;border:1px solid var(--accent,#c9a24b);background:var(--accent,#c9a24b);color:var(--accent-ink,#231c07);font-weight:600}" +
    ".ra-b.ghost{background:transparent;color:var(--text,#20233a);border-color:var(--border-2,#d8d8e6)}.ra-b:disabled{opacity:.5;cursor:default}" +
    ".ra-steps{list-style:none;margin:0 0 12px;padding:0;display:flex;flex-wrap:wrap;gap:6px}" +
    ".ra-steps li{font-size:.82rem;padding:3px 9px;border-radius:99px;border:1px solid var(--border-2,#d8d8e6);color:var(--muted-2,#5a5e78)}" +
    ".ra-steps li.on{border-color:var(--accent,#c9a24b);color:var(--text-strong,#1b1e33);background:var(--ex-bg,#fbf6e8)}" +
    ".ra-steps li.ok{border-color:var(--sem-good,#1c6b46);color:var(--sem-good,#1c6b46)}" +
    ".ra-note{font-size:.88rem;color:var(--text-soft,#4a4e68);margin:6px 0}.ra-warn{color:var(--sem-bad,#a1493a)}" +
    ".ra-prev{display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start}" +
    ".ra-prev video{width:270px;max-width:100%;aspect-ratio:9/16;background:#05060b;border-radius:10px}" +
    ".ra-prev img{width:120px;border-radius:8px;border:1px solid var(--border,#e7e7f0)}" +
    ".ra-ed{margin-top:12px}.ra-ln{display:grid;grid-template-columns:42px 1fr;gap:6px 10px;padding:8px 0;border-top:1px solid var(--border,#e7e7f0)}" +
    ".ra-ln b{font-size:.8rem;color:var(--muted-2,#5a5e78)}.ra-ln textarea{width:100%;min-height:52px;font:inherit;box-sizing:border-box;border:1px solid var(--border-2,#d8d8e6);border-radius:7px;padding:5px 7px;background:var(--surface-3,#fff);color:inherit}" +
    ".ra-ln input{width:100%;font:inherit;box-sizing:border-box;border:1px solid var(--border-2,#d8d8e6);border-radius:7px;padding:4px 7px;background:var(--surface-3,#fff);color:inherit}" +
    ".ra-ln.bad textarea,.ra-ln.bad input{border-color:var(--sem-bad,#a1493a)}.ra-vio{font-size:.82rem;color:var(--sem-bad,#a1493a);grid-column:2}" +
    ".ra-ft{padding:10px 18px 14px;border-top:1px solid var(--border,#e7e7f0);font-size:.85rem;color:var(--text-soft,#4a4e68)}" +
    "progress.ra-pr{width:100%;height:8px}" +
    ".ra-pn [hidden]{display:none!important}" +
    ".ra-lib{display:flex;gap:12px;padding:10px 0;border-top:1px solid var(--border,#e7e7f0)}.ra-lib img{width:72px;border-radius:6px}" +
    ".ra-set h3{margin:14px 0 6px;font-size:1rem}.ra-set input[type=text],.ra-set input[type=password]{width:100%;box-sizing:border-box;font:inherit;padding:6px 8px;border:1px solid var(--border-2,#d8d8e6);border-radius:8px;background:var(--surface-3,#fff);color:inherit}" +
    ".ra-set textarea{width:100%;min-height:180px;box-sizing:border-box;font:13px/1.45 ui-monospace,Menlo,monospace;border:1px solid var(--border-2,#d8d8e6);border-radius:8px;padding:8px;background:var(--surface-3,#fff);color:inherit}" +
    ".ra-sheet{border:1px solid var(--caution-line,#ecc1c1);background:var(--caution-bg,#fbeeee);border-radius:10px;padding:10px 12px;margin:8px 0}" +
    ".ra-sheet pre{white-space:pre-wrap;max-height:220px;overflow:auto;font:12px/1.4 ui-monospace,Menlo,monospace;background:var(--surface-3,#fff);border:1px solid var(--border,#e7e7f0);border-radius:6px;padding:8px}" +
    ".ra-meter{font-size:.82rem;color:var(--muted-2,#5a5e78)}" +
    ".ra-ask{border:1px solid var(--border-2,#d8d8e6);border-radius:12px;padding:12px 14px;background:var(--surface-2,#f4f4fb);margin:0 0 1.2rem}" +
    ".ra-ask label{display:block;font-weight:600;margin-bottom:6px}.ra-ask textarea{width:100%;box-sizing:border-box;font:inherit;font-size:1.05rem;padding:8px 10px;border:1px solid var(--border-2,#d8d8e6);border-radius:8px;background:var(--surface-3,#fff);color:var(--text,#20233a)}" +
    ".ra-askrow{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:8px}" +
    "#ra-lib .ra-lib{max-width:720px}";

  function css() {
    if (document.getElementById("ra-css")) return;
    var s = document.createElement("style"); s.id = "ra-css"; s.textContent = CSS;
    document.head.appendChild(s);
  }
  function opt(sel, v, label, selected) {
    var o = document.createElement("option"); o.value = v; o.textContent = label;
    if (selected) o.selected = true; sel.appendChild(o); return o;
  }
  function labelled(text, child) {
    var l = C().el("label", null, text); l.appendChild(child); return l;
  }

  var OPEN = null;

  /* opts: { adapter, layout, onClose } */
  function open(opts) {
    css();
    if (OPEN) close();
    var el = C().el, S = C().settings(), t = C().t;
    var A = opts.adapter;
    var ov = el("div", "ra-ov"), pn = el("div", "ra-pn", null, { role: "dialog", "aria-modal": "true", "aria-label": "Make reel" });
    ov.appendChild(pn);
    var hd = el("div", "ra-hd"), h2 = el("h2", null, "Make reel"); h2.appendChild(el("span", "kdeva", "रील बनाएँ"));
    var x = el("button", "ra-x", "✕", { type: "button", "aria-label": "Close" });
    var bSet = el("button", "ra-x", "⚙ Settings / सेटिंग्स", { type: "button" });
    var bLib = el("button", "ra-x", "▤ " + t("library"), { type: "button" });
    hd.appendChild(h2); hd.appendChild(bLib); hd.appendChild(bSet); hd.appendChild(x); pn.appendChild(hd);
    var bd = el("div", "ra-bd"); pn.appendChild(bd);
    var f = el("div", "ra-f"), out = el("div", "ra-out");
    bd.appendChild(f); bd.appendChild(out);

    /* layout (the page's current one; the agent page offers all) */
    var D = A.describe(), lay = el("select");
    var cur = opts.layout || (D.layouts[0] && D.layouts[0].id), groups = {};
    D.layouts.forEach(function (L) {
      var g = groups[L.group];
      if (!g) { g = groups[L.group] = document.createElement("optgroup"); g.label = L.group; lay.appendChild(g); }
      var o = document.createElement("option"); o.value = L.id; o.textContent = L.label;
      if (L.id === cur) o.selected = true; g.appendChild(o);
    });
    f.appendChild(labelled("Layout / लेआउट", lay));

    var brief = el("textarea", null, null, { placeholder: "e.g. रोहिणी नक्षत्र पर 45 सेकंड की रील" });
    var briefL = labelled(t("brief"), brief); f.appendChild(briefL);
    var briefN = el("p", "ra-note", RA.net.allowed()
      ? "The brief goes to the agent in Connected mode. / विवरण Connected mode में एजेंट को जाता है।"
      : "Offline mode uses the engine's own script; the brief is used only in Connected mode. / ऑफ़लाइन मोड इंजन की अपनी स्क्रिप्ट लेता है; विवरण केवल Connected mode में काम आता है।");
    f.appendChild(briefN);
    brief.disabled = !RA.net.allowed();
    var mode = el("p", "ra-note", RA.net.allowed()
      ? "Mode: Connected — " + (RA.keys.PROVIDERS[S.provider] || {}).label + " / मोड: Connected"
      : "Mode: Offline — nothing leaves this device / मोड: ऑफ़लाइन — कुछ भी बाहर नहीं जाता");
    f.appendChild(mode);
    var skill = el("select");
    Object.keys(RA.skills || {}).filter(function (k) { return k !== "hindi-voice-style"; }).forEach(function (k) {
      opt(skill, k, RA.skills[k].title, k === "astro-reel"); });
    try { Object.keys(JSON.parse(localStorage.getItem("nirayana.reelAgent.skills") || "{}")).forEach(function (k) { opt(skill, k, k + " (custom / अपनी)"); }); } catch (e) {}
    var skillL = labelled("Skill / स्किल", skill); skillL.hidden = !RA.net.allowed(); f.appendChild(skillL);

    var lang = el("select");
    opt(lang, "hi", "शुद्ध हिंदी / Pure Hindi", S.lang === "hi");
    opt(lang, "hinglish", "Hinglish", S.lang === "hinglish");
    opt(lang, "en", "English", S.lang === "en");
    f.appendChild(labelled(t("language"), lang));

    var vrow = el("div", "ra-row"), gender = el("select");
    opt(gender, "female", t("female"), S.voice !== "male"); opt(gender, "male", t("male"), S.voice === "male");
    var prov = el("select");
    RA.voice.providers().forEach(function (p, i) { opt(prov, p.id, p.label, i === 0); });
    vrow.appendChild(labelled(t("voice"), gender)); vrow.appendChild(labelled("Source / स्रोत", prov));
    f.appendChild(vrow);
    var vfile = el("input", null, null, { type: "file", accept: "audio/*,.m4a,.wav,.mp3,.aac" });
    var vfileL = labelled(t("upload") + " — one take of the whole script / पूरी स्क्रिप्ट की एक रिकॉर्डिंग", vfile);
    f.appendChild(vfileL);
    var sysVoice = el("select"); var sysL = labelled("System voice / सिस्टम आवाज़", sysVoice);
    f.appendChild(sysL);
    function syncVoice() {
      vfileL.hidden = prov.value !== "upload";
      sysL.hidden = prov.value !== "system";
    }
    prov.addEventListener("change", syncVoice);
    if (RA.voice.P.system.available()) {
      RA.voice.P.system.voices().then(function (vs) {
        (vs || []).forEach(function (v) { opt(sysVoice, v.id, v.name + (v.lang ? " (" + v.lang + ")" : ""), v.preferred); });
        if (!vs || !vs.length) opt(sysVoice, "", "No Hindi voice installed — see note / कोई हिंदी आवाज़ नहीं", true);
      }).catch(function () { opt(sysVoice, "", "(unavailable)", true); });
    }
    syncVoice();

    var len = el("select");
    [30, 45, 60, 90].forEach(function (s) { opt(len, String(s), s + " s", +S.seconds === s); });
    f.appendChild(labelled(t("length"), len));

    var mus = el("select");
    opt(mus, "none", t("none"), true);
    opt(mus, "bundled", t("bundled") + " — none bundled yet / अभी कोई नहीं").disabled = true;
    opt(mus, "file", t("myfile"));
    var mfile = el("input", null, null, { type: "file", accept: "audio/*" });
    var mfileL = labelled(t("myfile"), mfile); mfileL.hidden = true;
    mus.addEventListener("change", function () { mfileL.hidden = mus.value !== "file"; });
    f.appendChild(labelled(t("music"), mus)); f.appendChild(mfileL);

    var capL = el("label"), cap = el("input", null, null, { type: "checkbox" });
    cap.checked = S.captions !== false; capL.appendChild(cap); capL.appendChild(document.createTextNode(" " + t("captions")));
    f.appendChild(capL);

    var go = el("button", "ra-b", t("generate"), { type: "button" });
    var stop = el("button", "ra-b ghost", t("cancel"), { type: "button" }); stop.hidden = true;
    var brow = el("div", "ra-row"); brow.appendChild(go); brow.appendChild(stop); f.appendChild(brow);

    /* honest notes about this device */
    if (!(window.SPEncode && window.SPEncode.has())) {
      f.appendChild(el("p", "ra-note ra-warn",
        "This browser cannot encode video (no WebCodecs). Use Chrome or Edge, or the Nirayana desktop app. / यह ब्राउज़र वीडियो नहीं बना सकता (WebCodecs नहीं)। Chrome या Edge, या Nirayana डेस्कटॉप ऐप का उपयोग करें।"));
      go.disabled = true;
    } else if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
      f.appendChild(el("p", "ra-note",
        "On a phone this works but renders more slowly — a 45 s reel can take a few minutes. / फ़ोन पर यह चलता है पर धीरे — 45 सेकंड की रील में कुछ मिनट लग सकते हैं।"));
    }

    /* right side: progress, then the result */
    var steps = el("ul", "ra-steps");
    STEPS.forEach(function (k) { var li = el("li", null, C().t(k)); li.dataset.k = k; steps.appendChild(li); });
    var pr = el("progress", "ra-pr", null, { max: "1", value: "0" });
    var msg = el("div", "ra-note");
    var res = el("div");
    var meter = el("div", "ra-meter");
    out.appendChild(steps); out.appendChild(pr); out.appendChild(meter); out.appendChild(msg); out.appendChild(res);

    var ft = el("div", "ra-ft", C().t("notposted"));
    pn.appendChild(ft);

    function setStep(k) {
      var seen = true;
      Array.prototype.forEach.call(steps.children, function (li) {
        if (li.dataset.k === k) { li.className = k === "s_done" ? "ok" : "on"; seen = false; }
        else li.className = seen ? "ok" : "";
      });
    }

    var EDIT = null;   /* the script as last generated or edited */

    function generate(lines) {
      go.disabled = true; stop.hidden = false; res.textContent = ""; msg.textContent = ""; pr.value = 0;
      var spec = { adapter: A, layout: lay.value, lang: lang.value, seconds: +len.value,
                   voice: { provider: prov.value, voice: gender.value, systemVoice: sysVoice.value },
                   captions: cap.checked, lines: lines || null };
      C().save({ lang: lang.value, voice: gender.value, seconds: +len.value, captions: cap.checked });
      var pre = Promise.resolve();
      if (prov.value === "upload") {
        if (!vfile.files[0] && !RA.voice.P.upload.has()) {
          msg.className = "ra-note ra-warn";
          msg.textContent = "Choose a voice file first. / पहले आवाज़ की फ़ाइल चुनें।";
          go.disabled = false; stop.hidden = true; return;
        }
        if (vfile.files[0]) pre = RA.voice.P.upload.load(vfile.files[0]);
      }
      if (mus.value === "file" && mfile.files[0])
        pre = pre.then(function () { return mfile.files[0].arrayBuffer().then(RA.voice.decode).then(function (b) { spec.music = b; }); });
      if (RA.net.allowed()) {
        spec.voice.provider = prov.value;
        spec.voice.model = S.ttsModel || "";
        spec.voice.elevenVoice = S.elevenVoice || "";
      }
      var agentRun = RA.net.allowed() && !lines && RA.agent;
      pre.then(function () {
        if (!agentRun) return null;
        var ao = { brief: brief.value.trim(), layout: lay.value, lang: lang.value, seconds: +len.value,
                   skill: skill.value, provider: S.provider, model: S.model, adapter: A };
        return confirmSend(ao).then(function () {
          setStep("s_layout");
          return RA.agent.run(ao, function (ev) {
            if (ev.type === "tool") {
              setStep({ list_layouts: "s_layout", get_today: "s_layout", get_facts: "s_facts", write_script: "s_script",
                        verify_script: "s_check", kahani_scenes: "s_script", finish: "s_check" }[ev.name] || "s_script");
              msg.className = "ra-note"; msg.textContent = "→ " + ev.name;
            }
            if (ev.type === "usage") meter.textContent = "tokens " + ev.usage.in + " in / " + ev.usage.out + " out" +
              (ev.cost != null ? " · ≈ $" + ev.cost.toFixed(4) + " (estimate)" : " · see your provider for pricing");
          });
        }).then(function (st) {
          spec.layout = st.layout; spec.lines = st.lines;
          if (st.kahani) {
            spec.adapter = RA.kahani.surface();
            return spec.adapter.configure({ facts: st.facts }).then(function () {
              spec.agentCaption = st.finish; spec.mode = "connected"; return null;
            });
          }
          lay.value = st.layout;
          spec.agentCaption = st.finish;
          spec.mode = "connected";
          return null;
        });
      }).then(function () {
        return RA.render.run(spec, { step: setStep, progress: function (p) { pr.value = p; },
                                     line: function (i, n) { msg.className = "ra-note"; msg.textContent = C().t("s_voice") + " " + (i + 1) + "/" + n; } });
      }).then(function (r) {
        r.mode = spec.mode || "offline"; r.provider = spec.mode ? S.provider : null;
        if (spec.agentCaption) r.caption = spec.agentCaption.caption + "\n\n" + (spec.agentCaption.hashtags || []).join(" ") +
          "\n\n" + C().hi("study") + "\n" + C().en("study");
        go.disabled = false; stop.hidden = true; pr.value = 1; msg.textContent = "";
        EDIT = r.lines; show(r);
      }).catch(function (e) {
        go.disabled = false; stop.hidden = true;
        msg.className = "ra-note ra-warn";
        msg.textContent = e.cancelled ? "Cancelled. / रोका गया।" : (e.message || String(e));
        if (e.violations && e.result) { EDIT = e.result.lines; editor(e.result, e.violations); }
      });
    }

    function download(blob, name) {
      var a = document.createElement("a"), u = URL.createObjectURL(blob);
      a.href = u; a.download = name; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 4000);
    }
    function saveOrDownload(blob, name) {
      if (RA.native && RA.native.saveFile && C().inApp()) return RA.native.saveFile(blob, name).catch(function () { download(blob, name); });
      download(blob, name);
    }

    function editor(r, violations) {
      var ed = el("div", "ra-ed");
      ed.appendChild(el("h3", null, "Script / स्क्रिप्ट"));
      var bad = {};
      (violations || []).forEach(function (v) { (bad[v.line] = bad[v.line] || []).push(v); });
      r.lines.forEach(function (L, i) {
        var row = el("div", "ra-ln" + (bad[i] ? " bad" : ""));
        row.appendChild(el("b", null, (i + 1) + " · " + L.beats[0] + (L.beats[1] !== L.beats[0] ? "–" + L.beats[1] : "")));
        var box = el("div");
        var ta = el("textarea"); ta.value = L.narration;
        var ci = el("input", null, null, { type: "text", placeholder: "caption ≤ 4 words / कैप्शन ≤ 4 शब्द" }); ci.value = L.caption || "";
        ta.addEventListener("input", function () { EDIT[i].narration = ta.value; });
        ci.addEventListener("input", function () { EDIT[i].caption = ci.value; });
        var rv = el("button", "ra-b ghost", "↻ " + t("revoice"), { type: "button" });
        rv.addEventListener("click", function () { RA.voice.bust(EDIT[i].narration, lang.value); generate(EDIT); });
        box.appendChild(ta); box.appendChild(ci); box.appendChild(rv); row.appendChild(box);
        (bad[i] || []).forEach(function (v) { row.appendChild(el("div", "ra-vio", v.en + " / " + v.hi)); });
        ed.appendChild(row);
      });
      var rg = el("button", "ra-b", t("regen"), { type: "button" });
      rg.addEventListener("click", function () { generate(EDIT); });
      ed.appendChild(rg);
      res.appendChild(ed);
    }

    function show(r) {
      res.textContent = "";
      var url = URL.createObjectURL(r.blob);
      var pv = el("div", "ra-prev"), v = el("video", null, null, { controls: "", playsinline: "" });
      v.src = url; pv.appendChild(v);
      var side = el("div");
      if (r.thumb) { var im = el("img", null, null, { alt: C().t("thumb") }); im.src = URL.createObjectURL(r.thumb); side.appendChild(im); }
      var info = el("p", "ra-note",
        (r.title || "") + " — " + (r.duration ? r.duration.toFixed(2) : "?") + " s (planned " + r.expected.toFixed(2) + " s) · " +
        r.file.codec + (r.file.audioCodec ? " + " + r.file.audioCodec : " (no audio track)") + " · " + r.ext.toUpperCase() +
        (r.loudness && isFinite(r.loudness.after) ? " · " + r.loudness.after.toFixed(1) + " LUFS" : ""));
      side.appendChild(info);
      if (r.file.reason) side.appendChild(el("p", "ra-note", r.file.reason));
      if (r.english) side.appendChild(el("p", "ra-note ra-warn",
        "This layout has no Hindi text of its own yet; some lines are in English. / इस लेआउट का अपना हिंदी पाठ अभी नहीं है; कुछ पंक्तियाँ अंग्रेज़ी में हैं।"));
      var row = el("div", "ra-row");
      var base = (r.layout || "reel").replace(/[^\w.-]+/g, "-");
      var b1 = el("button", "ra-b", t("download") + " " + r.ext.toUpperCase(), { type: "button" });
      b1.addEventListener("click", function () { saveOrDownload(r.blob, base + "." + r.ext); });
      var b2 = el("button", "ra-b ghost", ".srt", { type: "button" });
      b2.addEventListener("click", function () { saveOrDownload(new Blob([r.srt], { type: "text/plain" }), base + ".srt"); });
      var b3 = el("button", "ra-b ghost", "thumb.jpg", { type: "button" });
      b3.addEventListener("click", function () { if (r.thumb) saveOrDownload(r.thumb, base + "-thumb.jpg"); });
      var b4 = el("button", "ra-b ghost", t("copycap"), { type: "button" });
      b4.addEventListener("click", function () {
        var done = function () { b4.textContent = "✓ " + t("copycap"); };
        if (navigator.clipboard) navigator.clipboard.writeText(r.caption).then(done, function () { download(new Blob([r.caption], { type: "text/plain" }), base + "-caption.txt"); });
        else download(new Blob([r.caption], { type: "text/plain" }), base + "-caption.txt");
      });
      [b1, b2, b3, b4].forEach(function (b) { row.appendChild(b); });
      if (window.SPVoice && window.SPVoice.canShare && !C().inApp()) {
        var file = new File([r.blob], base + "." + r.ext, { type: r.mime });
        if (window.SPVoice.canShare(file)) {
          var b5 = el("button", "ra-b ghost", t("share"), { type: "button" });
          b5.addEventListener("click", function () { window.SPVoice.share(r.blob, base + "." + r.ext); });
          row.appendChild(b5);
        }
      }
      if (RA.native && RA.native.share && C().inApp()) {
        var b6 = el("button", "ra-b ghost", t("reveal"), { type: "button" });
        b6.addEventListener("click", function () { RA.native.share(r.blob, base + "." + r.ext); });
        row.appendChild(b6);
      }
      side.appendChild(row);
      pv.appendChild(side);
      res.appendChild(pv);
      if (RA.library && RA.library.save) RA.library.save(r).catch(function () {});
      editor(r, r.violations);
      OPEN.last = r;
    }

    /* WHAT WILL BE SENT — shown once per provider per session, before the
       first request; nothing is sent until the reader says so */
    function confirmSend(ao) {
      var k = "nirayana.reelAgent.previewed." + ao.provider;
      try { if (sessionStorage.getItem(k)) return Promise.resolve(); } catch (e) {}
      return new Promise(function (resolve, reject) {
        var pv = RA.agent.preview(ao), sh = el("div", "ra-sheet");
        sh.appendChild(el("b", null, "What will be sent / क्या भेजा जाएगा"));
        sh.appendChild(el("p", "ra-note", "To " + pv.host + " · model " + pv.model + ". Your birth data and kundli are never sent. / आपका जन्म विवरण और कुंडली कभी नहीं भेजी जाती।"));
        var pre1 = el("pre", null, "SYSTEM (skill):\n" + pv.system + "\n\nFIRST MESSAGE:\n" + pv.message + "\n\nTOOLS: " + pv.tools.join(", ") + "\n\nLATER: " + pv.later);
        sh.appendChild(pre1);
        var yes = el("button", "ra-b", "Send / भेजें", { type: "button" }), no = el("button", "ra-b ghost", t("cancel"), { type: "button" });
        var r = el("div", "ra-row"); r.appendChild(yes); r.appendChild(no); sh.appendChild(r);
        res.textContent = ""; res.appendChild(sh);
        yes.addEventListener("click", function () { try { sessionStorage.setItem(k, "1"); } catch (e) {} sh.remove(); resolve(); });
        no.addEventListener("click", function () { sh.remove(); var e = new Error("Not sent. / नहीं भेजा गया।"); reject(e); });
      });
    }

    bSet.addEventListener("click", function () { settingsView(res, function () { close(); open(opts); }); });
    bLib.addEventListener("click", function () {
      RA.library.show(res, function (rec) { EDIT = rec.lines; lay.value = rec.layout; lang.value = rec.lang || "hi"; editor({ lines: rec.lines }, []); });
    });

    go.addEventListener("click", function () { generate(null); });
    stop.addEventListener("click", function () { RA.render.cancel(); });
    x.addEventListener("click", close);
    ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
    document.addEventListener("keydown", esc);
    document.body.appendChild(ov);
    OPEN = { ov: ov, opts: opts, generate: generate, last: null,
             set: function (k, v) { ({ lang: lang, layout: lay, provider: prov, length: len, gender: gender })[k].value = v; syncVoice(); } };
    return OPEN;
  }
  /* ---- settings: mode, keys, model, voice, skills ---------------------- */
  function settingsView(host, reopen) {
    var el = C().el, S = C().settings();
    host.textContent = "";
    var w = el("div", "ra-set");
    w.appendChild(el("h3", null, "Mode / मोड"));
    var off = el("label"), on = el("label");
    var rOff = el("input", null, null, { type: "radio", name: "ra-mode" }), rOn = el("input", null, null, { type: "radio", name: "ra-mode" });
    rOff.checked = S.mode !== "connected"; rOn.checked = S.mode === "connected";
    off.appendChild(rOff); off.appendChild(document.createTextNode(" Offline (default) — nothing leaves this device / ऑफ़लाइन — कुछ भी बाहर नहीं जाता"));
    on.appendChild(rOn); on.appendChild(document.createTextNode(" Connected — your own Claude or Gemini key / अपनी Claude या Gemini key"));
    w.appendChild(off); w.appendChild(on);
    var warn = el("div", "ra-sheet");
    warn.appendChild(el("p", null, "Connected mode sends the brief, the animation's facts and the narration text to the AI service you choose, using your own key and billed to you. Your birth data and kundli are never sent." +
      (C().inApp() ? " In the desktop app your key is kept in the system keychain and the request is made by the app, not the page."
                   : " On the website your key is stored in this browser's local storage, where anyone with access to this browser profile could read it. Use a key with a spending limit.")));
    warn.appendChild(el("p", null, "Connected mode में विवरण, एनिमेशन के तथ्य और वाचन का पाठ आपकी चुनी AI सेवा को, आपकी अपनी key से, भेजे जाते हैं। आपका जन्म विवरण और कुंडली कभी नहीं भेजी जाती।"));
    var ack = el("label"), ackI = el("input", null, null, { type: "checkbox" });
    ack.appendChild(ackI); ack.appendChild(document.createTextNode(" I understand / मैं समझता/समझती हूँ"));
    warn.appendChild(ack); w.appendChild(warn);
    warn.hidden = !rOn.checked; ackI.checked = S.mode === "connected";
    rOn.addEventListener("change", function () { warn.hidden = false; });
    rOff.addEventListener("change", function () { warn.hidden = true; C().save({ mode: "offline" }); });
    ackI.addEventListener("change", function () { C().save({ mode: ackI.checked && rOn.checked ? "connected" : "offline" }); });

    w.appendChild(el("h3", null, "Provider and key / प्रदाता और key"));
    var pv = el("select");
    ["anthropic", "gemini"].forEach(function (k) { opt(pv, k, RA.keys.PROVIDERS[k].label, S.provider === k); });
    w.appendChild(pv);
    var kin = el("input", null, null, { type: "password", placeholder: "paste key / key चिपकाएँ", autocomplete: "off" });
    var ks = el("span", "ra-note");
    var kSave = el("button", "ra-b", "Save key / सहेजें", { type: "button" }), kDel = el("button", "ra-b ghost", "Forget / भूलें", { type: "button" });
    function stat() { RA.keys.status(pv.value).then(function (st) { ks.textContent = st.stored ? " stored " + st.hint : " no key stored / कोई key नहीं"; }); }
    pv.addEventListener("change", function () { C().save({ provider: pv.value, model: "" }); stat(); models.textContent = ""; });
    kSave.addEventListener("click", function () { RA.keys.set(pv.value, kin.value).then(function () { kin.value = ""; stat(); }, function (e) { ks.textContent = " " + e.message; }); });
    kDel.addEventListener("click", function () { RA.keys.forget(pv.value).then(stat); });
    w.appendChild(kin); var kr = el("div", "ra-row"); kr.appendChild(kSave); kr.appendChild(kDel); kr.appendChild(ks); w.appendChild(kr); stat();

    w.appendChild(el("h3", null, "Model / मॉडल"));
    var mIn = el("input", null, null, { type: "text", placeholder: RA.providers.get(S.provider).defaultModel });
    mIn.value = S.model || "";
    mIn.addEventListener("change", function () { C().save({ model: mIn.value.trim() }); });
    var models = el("select");
    var mLoad = el("button", "ra-b ghost", "List my models / मेरे मॉडल", { type: "button" });
    mLoad.addEventListener("click", function () {
      RA.providers.get(pv.value).models().then(function (ms) {
        models.textContent = ""; ms.forEach(function (m) { opt(models, m.id, m.label + " — " + m.id, m.id === S.model); });
      }, function (e) { mIn.placeholder = e.message; });
    });
    models.addEventListener("change", function () { mIn.value = models.value; C().save({ model: models.value }); });
    w.appendChild(mIn); var mr = el("div", "ra-row"); mr.appendChild(mLoad); mr.appendChild(models); w.appendChild(mr);
    w.appendChild(el("p", "ra-note", "Default: the provider's fastest, least expensive model. / डिफ़ॉल्ट: सबसे तेज़, सबसे सस्ता मॉडल।"));

    w.appendChild(el("h3", null, "Neural voice (Connected) / न्यूरल आवाज़"));
    var tm = el("input", null, null, { type: "text", placeholder: "Gemini TTS model, e.g. " + RA.voice.P["gemini-tts"].model });
    tm.value = S.ttsModel || ""; tm.addEventListener("change", function () { C().save({ ttsModel: tm.value.trim() }); });
    w.appendChild(tm);
    var ev = el("input", null, null, { type: "text", placeholder: "ElevenLabs voice ID (optional)" });
    ev.value = S.elevenVoice || ""; ev.addEventListener("change", function () { C().save({ elevenVoice: ev.value.trim() }); });
    w.appendChild(ev);
    var ekin = el("input", null, null, { type: "password", placeholder: "ElevenLabs key (optional)", autocomplete: "off" });
    var ekb = el("button", "ra-b ghost", "Save ElevenLabs key", { type: "button" });
    ekb.addEventListener("click", function () { RA.keys.set("elevenlabs", ekin.value).then(function () { ekin.value = ""; ekb.textContent = "✓ saved"; }); });
    w.appendChild(ekin); w.appendChild(ekb);

    if (C().inApp()) {
      w.appendChild(el("h3", null, "Daily reel / रोज़ की रील"));
      var dl0 = el("label"), dI = el("input", null, null, { type: "checkbox" });
      dI.checked = !!S.daily; dl0.appendChild(dI);
      dl0.appendChild(document.createTextNode(" Prepare today's reel at 06:30 while the app is open / ऐप खुला हो तो 06:30 पर आज की रील तैयार करें"));
      dI.addEventListener("change", function () { C().save({ daily: dI.checked }); });
      w.appendChild(dl0);
      var al = el("label"), aI = el("input", null, null, { type: "checkbox" });
      al.appendChild(aI); al.appendChild(document.createTextNode(" Open Nirayana at login, so the 06:30 reel is ready / लॉगिन पर Nirayana खोलें"));
      C().invoke("plugin:autostart|is_enabled", {}).then(function (v) { aI.checked = !!v; }).catch(function () { al.hidden = true; });
      aI.addEventListener("change", function () { C().invoke(aI.checked ? "plugin:autostart|enable" : "plugin:autostart|disable", {}).catch(function () {}); });
      w.appendChild(al);
      w.appendChild(el("p", "ra-note", "It uses the offline engine script and this computer's voice unless Connected mode is on, saves the reel to your library and shows a notification. Nothing is posted. / कुछ भी पोस्ट नहीं होता।"));
    }

    w.appendChild(el("h3", null, "Handle / हैंडल"));
    var hIn = el("input", null, null, { type: "text" }); hIn.value = S.handle;
    hIn.addEventListener("change", function () { C().save({ handle: hIn.value.trim() || "@Nirayana.Soft" }); });
    w.appendChild(hIn);

    w.appendChild(el("h3", null, "Skills / स्किल"));
    w.appendChild(el("p", "ra-note", "The bundled skills are read-only; duplicate one to make your own. The fact check, the no-prediction rule and the no-birth-data rule are enforced in code and apply to every skill. / बंडल स्किल केवल पढ़ने के लिए हैं; अपनी बनाने के लिए कॉपी करें।"));
    var sk = el("select"), ta = el("textarea");
    var CUS = {}; try { CUS = JSON.parse(localStorage.getItem("nirayana.reelAgent.skills") || "{}"); } catch (e) {}
    function fill() {
      sk.textContent = "";
      Object.keys(RA.skills || {}).forEach(function (k) { opt(sk, "b:" + k, RA.skills[k].title + " (bundled)"); });
      Object.keys(CUS).forEach(function (k) { opt(sk, "c:" + k, k + " (custom)"); });
    }
    function showSkill() {
      var v = sk.value, b = v.slice(0, 2) === "b:";
      ta.value = b ? RA.skills[v.slice(2)].body : CUS[v.slice(2)] || ""; ta.readOnly = b;
    }
    fill(); showSkill(); sk.addEventListener("change", showSkill);
    var dup = el("button", "ra-b ghost", "Duplicate / कॉपी करें", { type: "button" }), sv = el("button", "ra-b ghost", "Save / सहेजें", { type: "button" }),
        dl = el("button", "ra-b ghost", "Delete / हटाएँ", { type: "button" });
    function persist() { try { localStorage.setItem("nirayana.reelAgent.skills", JSON.stringify(CUS)); } catch (e) {} }
    dup.addEventListener("click", function () {
      var base = sk.value.slice(2), name = "my-" + base, n = 2; while (CUS[name]) name = "my-" + base + "-" + n++;
      CUS[name] = ta.value; persist(); fill(); sk.value = "c:" + name; showSkill();
    });
    sv.addEventListener("click", function () { if (sk.value.slice(0, 2) === "c:") { CUS[sk.value.slice(2)] = ta.value; persist(); sv.textContent = "✓"; } });
    dl.addEventListener("click", function () { if (sk.value.slice(0, 2) === "c:") { delete CUS[sk.value.slice(2)]; persist(); fill(); showSkill(); } });
    w.appendChild(sk); w.appendChild(ta); var sr = el("div", "ra-row"); [dup, sv, dl].forEach(function (b) { sr.appendChild(b); }); w.appendChild(sr);

    var done = el("button", "ra-b", "Done / हो गया", { type: "button" });
    done.addEventListener("click", function () { if (reopen) reopen(); });
    w.appendChild(el("p")); w.appendChild(done);
    host.appendChild(w);
  }

  function esc(e) { if (e.key === "Escape") close(); }
  function close() {
    if (!OPEN) return;
    try { RA.render.cancel(); } catch (e) {}
    OPEN.ov.remove(); document.removeEventListener("keydown", esc);
    if (OPEN.opts.onClose) OPEN.opts.onClose();
    OPEN = null;
  }

  /* the "Make reel" button, placed after an existing control */
  function mount(afterSel, getLayout, cls) {
    var at = document.querySelector(afterSel);
    if (!at || document.getElementById("ra-make")) return null;
    var b = C().el("button", cls || "reelbtn", C().t("make"), { type: "button", id: "ra-make" });
    b.addEventListener("click", function () {
      open({ adapter: window.__bridge || RA.adapter.make("reel-studio"), layout: getLayout ? getLayout() : null });
    });
    at.parentNode.insertBefore(b, at.nextSibling);
    return b;
  }

  RA.panel = { open: open, close: close, mount: mount, settings: settingsView, current: function () { return OPEN; } };

  /* Reel Studio: the button sits beside "This frame as PNG" */
  function boot() {
    if (document.getElementById("ra-go") || document.getElementById("ra-lib")) css();
    if (document.getElementById("reel-still") && window.__bridge)
      mount("#reel-still", function () { var r = window.__reel && window.__reel.reel && window.__reel.reel(); return r ? r.key : null; }, "reelbtn");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 120); });
  else setTimeout(boot, 120);
})();
