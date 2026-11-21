/* ===== Reel Agent — the other animating surfaces ===========================

   Reel Studio was first because it already had a pure frameAt(p). Every
   other surface had a frame function too — it was just private, or bound to
   the page's own canvas, or (for the SVG pages) one image load away from a
   pixel. Each page now publishes a small READ-ONLY handle (window.__spUI.
   reelSpec, window.__dp, window.__moRA, SPWorkstation.reel, window.__ayFilm,
   SPCosmos.frame) and this file turns each into the one adapter contract
   ra-adapter.js describes. Nothing here draws a second copy of anything: a
   frame is always the page's own renderer, pointed at the agent's canvas.

   What a reel SAYS comes from what the page computed — node values, scene
   dates, the ayanāṃśa at a year, which grahas change house — formatted
   here, never invented here. The facts are harvested from the same strings,
   so the verifier sees exactly what the narration says.

   PERSONAL. Three surfaces can draw the reader's own chart: the Kinetic
   Workstation's kuṇḍalī, the ceremony when it is wound to their stored birth
   moment, and a Motion scene that needs the chart. A Studio or Director
   selection that reads the chart counts too. Those adapters say personal:
   true, and the panel holds the network gate shut while they are open
   (RA.net.hold) — the narration of a kuṇḍalī is the kuṇḍalī. */
(function () {
  "use strict";
  var RA = window.RA = window.RA || {};
  var W = 1080, H = 1920;

  /* ---- words ------------------------------------------------------------ */
  var RASI_EN = ["Meṣa", "Vṛṣabha", "Mithuna", "Karka", "Siṃha", "Kanyā",
                 "Tulā", "Vṛścika", "Dhanus", "Makara", "Kumbha", "Mīna"];
  var RASI_HI = ["मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या", "तुला", "वृश्चिक",
                 "धनु", "मकर", "कुम्भ", "मीन"];
  var GRAHA_HI = { Sun: "सूर्य", Moon: "चन्द्र", Mars: "मंगल", Mercury: "बुध", Jupiter: "गुरु",
                   Venus: "शुक्र", Saturn: "शनि", Rahu: "राहु", Ketu: "केतु" };
  var GRAHA_SA = { Sun: "Sūrya", Moon: "Candra", Mars: "Maṅgala", Mercury: "Budha", Jupiter: "Guru",
                   Venus: "Śukra", Saturn: "Śani", Rahu: "Rāhu", Ketu: "Ketu" };
  /* the Sanskrit names as the pages print them, to Devanāgarī */
  var SA_HI = { "Sūrya": "सूर्य", "Candra": "चन्द्र", "Maṅgala": "मंगल", "Budha": "बुध", "Guru": "गुरु",
                "Śukra": "शुक्र", "Śani": "शनि", "Rāhu": "राहु", "Ketu": "केतु", "Lagna": "लग्न",
                "Graha": "ग्रह", "grahas": "ग्रह", "Yuddha": "युद्ध", "nakṣatra": "नक्षत्र",
                "Nakṣatra": "नक्षत्र", "rāśi": "राशि", "Rāśi": "राशि", "bhāva": "भाव", "Bhāva": "भाव",
                "daśā": "दशा", "Daśā": "दशा", "tithi": "तिथि", "Tithi": "तिथि", "yoga": "योग",
                "Yoga": "योग", "karaṇa": "करण", "vāra": "वार", "ayanāṃśa": "अयनांश",
                "All": "सभी", "nine": "नौ", "to": "से", "and": "और", "years": "साल", "year": "साल",
                "months": "महीने", "month": "महीना", "days": "दिन", "day": "दिन", "hours": "घंटे", "hour": "घंटा" };
  RASI_EN.forEach(function (n, i) { SA_HI[n] = RASI_HI[i]; });
  Object.keys(GRAHA_HI).forEach(function (k) { SA_HI[k] = GRAHA_HI[k]; });
  function hiWords(s) {
    return String(s || "").replace(/[A-Za-zĀ-ſḀ-ỿ]+/g, function (w) { return SA_HI[w] || w; });
  }
  function grahaName(en, lang) { return lang === "hi" ? (GRAHA_HI[en] || hiWords(en)) : (GRAHA_SA[en] || en); }
  function num(x) {
    var a = Math.abs(x);
    return a >= 100 ? String(Math.round(x)) : String(Math.round(x * 10) / 10);
  }
  function lonText(deg, lang) {
    var d = ((deg % 360) + 360) % 360, r = Math.floor(d / 30), k = Math.floor(d - r * 30);
    return lang === "hi" ? RASI_HI[r] + " " + k + " अंश" : RASI_EN[r] + " " + k + "°";
  }
  var MON_EN = ["January", "February", "March", "April", "May", "June", "July", "August",
                "September", "October", "November", "December"];
  function dateText(ms, lang) {
    var d = new Date(ms);
    return lang === "hi" ? d.getDate() + " " + RA.hi.MON[d.getMonth()] + " " + d.getFullYear()
                         : d.getDate() + " " + MON_EN[d.getMonth()] + " " + d.getFullYear();
  }
  function yearText(y, lang) {
    if (y <= 0) return (1 - y) + (lang === "hi" ? " ईसा पूर्व" : " BCE");
    return y + (lang === "hi" ? " ईस्वी" : " CE");
  }
  function L(lang) { return lang === "hi" ? "hi" : "en"; }

  /* ---- drawing helpers -------------------------------------------------- */
  function canvas(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function ground(c) {
    var g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#131a33"); g.addColorStop(0.55, "#0a0e1d"); g.addColorStop(1, "#05070e");
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  /* a source of another shape, fitted to the frame's width and centred —
     returns the rectangle it landed in so the caption can use the bars */
  function letterbox(c, src, sw, sh) {
    var k = Math.min(W / sw, H / sh), w = sw * k, h = sh * k;
    var x = (W - w) / 2, y = (H - h) / 2;
    c.drawImage(src, x, y, w, h);
    return { x: x, y: y, w: w, h: h };
  }
  function fitBox(sw, sh) {
    var k = Math.min(W / sw, H / sh), h = sh * k;
    return { y: (H - h) / 2, h: h };
  }
  function zonesFor(srcW, srcH, capY) {
    var b = fitBox(srcW, srcH), bot = H - (b.y + b.h);
    var cap = bot >= H * 0.15 ? { x: W * 0.06, y: b.y + b.h + bot * 0.12, w: W * 0.88, h: Math.min(bot * 0.7, H * 0.16) }
                              : { x: W * 0.06, y: capY || H * 0.70, w: W * 0.88, h: H * 0.13 };
    return { title: null, caption: cap, footer: { x: W * 0.05, y: H * 0.90, w: W * 0.90, h: H * 0.10 } };
  }
  function readSecs(s, lang) {
    if (window.SPScript && window.SPScript.readSecs) return window.SPScript.readSecs(s, lang);
    return 0.6 + String(s || "").length * (lang === "hi" ? 0.075 : 0.065);
  }

  /* ---- node values (Studio Pro and Director Pro) ------------------------ */
  function valText(v, lang) {
    if (!v) return "";
    switch (v.kind) {
      case "lon": return lonText(v.deg, lang);
      case "scalar":
        if (v.unit === "°") return num(v.v) + (lang === "hi" ? " अंश" : "°");
        return num(v.v) + (v.unit ? " " + (lang === "hi" ? hiWords(v.unit) : v.unit) : "");
      case "lonset":
        return (v.items || []).slice(0, 3).map(function (it) {
          var nm = it.en || it.label || "";
          return (nm ? grahaName(nm, lang) + " " : "") + lonText(it.deg, lang);
        }).join(", ");
      default: return "";
    }
  }
  function nodeLine(node, v, lang) {
    var lab = lang === "hi" ? hiWords(node.label) : node.label, val = valText(v, lang);
    return val ? lab + " — " + val : lab;
  }
  /* A node is personal when it answers with a chart and is silent without
     one. Any failure counts as personal: when unsure, stay on the device. */
  function nodePersonal(node, C) {
    if (!C || !C.J) return false;
    try {
      var C0 = {}; for (var k in C) C0[k] = C[k]; C0.J = null;
      return node.get(C) != null && node.get(C0) == null;
    } catch (e) { return true; }
  }

  /* ---- the common shell ------------------------------------------------- */
  function make(cfg) {
    var ST = null, BUSY = false;
    var A = {
      describe: function () {
        return {
          surface: cfg.id, label: cfg.label,
          personal: !!(ST ? ST.personal : (cfg.personalNow && cfg.personalNow())),
          layouts: [{ id: "current", label: cfg.layoutLabel || "What is on screen / जो स्क्रीन पर है",
                      group: cfg.label, defaultSeconds: ST ? Math.round(ST.seconds) : 15 }],
          size: { W: W, H: H },
          safeZones: ST && cfg.zones ? cfg.zones(ST) : zonesFor(W, H)
        };
      },
      configure: function (spec) {
        spec = spec || {};
        if (!cfg.have()) return Promise.reject(new Error(cfg.label + " is not on this page"));
        BUSY = true;
        if (ST && cfg.release) try { cfg.release(ST); } catch (e) {}
        return Promise.resolve().then(function () { return cfg.configure(spec); })
          .then(function (st) { st.lang = spec.lang || "hi"; ST = st; BUSY = false; return A.describe(); },
                function (e) { BUSY = false; throw e; });
      },
      ready: function () { return !!ST && !BUSY; },
      duration: function () { return ST ? ST.seconds : 0; },
      beats: function (lang) {
        if (!ST) return [];
        lang = lang || "hi";
        return cfg.beats(ST, L(lang)).map(function (b, i) {
          return { i: i, from: b.from, to: b.to, secs: b.to - b.from, say: b.say, need: readSecs(b.say, lang),
                   english: lang === "hi" && RA.hi.devanagariShare(b.say) < 0.5 };
        });
      },
      facts: function () {
        if (!ST) return [];
        var F = RA.facts, out = F.FRAMEWORK.slice();
        out.push({ id: "surface", label: "surface", value: cfg.label, unit: "", kind: "name", source: "page" });
        (cfg.facts ? cfg.facts(ST) : []).forEach(function (f) { out.push(f); });
        ["hi", "en"].forEach(function (lg) {
          cfg.beats(ST, lg).forEach(function (b, i) { out = out.concat(F.harvest(cfg.id + "." + lg + "." + i, cfg.label, b.say, "page")); });
        });
        return out;
      },
      frame: function (p, c) { return ST ? cfg.frame(ST, Math.max(0, Math.min(1, p)), c) : null; },
      title: function () { return ST && cfg.title ? cfg.title(ST) : null; },
      postCaption: function (lang) {
        if (!ST) return "";
        var b = cfg.beats(ST, L(lang || "hi"));
        return b.map(function (x) { return x.say; }).join("\n");
      },
      release: function () { if (ST && cfg.release) try { cfg.release(ST); } catch (e) {} }
    };
    return A;
  }

  /* even beats over [0, T] from a list of sentences */
  function spread(lines, T) {
    var n = lines.length || 1;
    return lines.map(function (s, i) { return { from: T * i / n, to: T * (i + 1) / n, say: s }; });
  }

  /* ======================================================================
     Studio Pro — the selection (or the storyboard) the recorder would record
     ====================================================================== */
  function studioPro() {
    return make({
      id: "studio-pro", label: "Studio Pro",
      have: function () { return !!(window.SPStage && window.__spUI && window.__spUI.reelSpec && window.SPNodes); },
      personalNow: function () {
        var R = window.__spUI && window.__spUI.reelSpec && window.__spUI.reelSpec();
        if (!R) return false;
        var ids = R.shots ? [].concat.apply([], R.shots.map(function (s) { return s.sel || []; })) : R.sel;
        return ids.some(function (id) { var n = window.SPNodes.byId(id); return n && nodePersonal(n, R.ctx); });
      },
      configure: function () {
        var R = window.__spUI.reelSpec(), S = window.SPStage.S;
        if (!R.sel.length && !R.shots) throw new Error("Pick something from the wall first. / पहले दीवार से कुछ चुनें।");
        var seconds = R.shots ? window.SPStage.storyTotal(R.shots) : R.dur;
        var groups = R.shots ? R.shots.map(function (s) { return { sel: s.sel || [], len: Math.max(1, s.seconds || 5) }; })
                             : [{ sel: R.sel, len: seconds }];
        var personal = false, items = [], acc = 0;
        groups.forEach(function (g) {
          var nodes = g.sel.map(function (id) { return window.SPNodes.byId(id); }).filter(Boolean).slice(0, 4);
          nodes.forEach(function (n, k) {
            if (nodePersonal(n, R.ctx)) personal = true;
            var v = window.SPNodes.resolve(n, R.ctx);
            items.push({ node: n, v: v, from: acc + g.len * k / nodes.length, to: acc + g.len * (k + 1) / nodes.length });
          });
          acc += g.len;
        });
        var r = window.SPStage.RATIOS[S.ratio] || window.SPStage.RATIOS["9:16"];
        var last = window.__spUI.last && window.__spUI.last();
        return { R: R, seconds: seconds, items: items, personal: personal,
                 off: canvas(r.w, r.h), sw: r.w, sh: r.h, label: last && last.label };
      },
      zones: function (st) { return zonesFor(st.sw, st.sh, H * 0.70); },
      beats: function (st, lang) {
        return st.items.map(function (it) { return { from: it.from, to: it.to, say: nodeLine(it.node, it.v, lang) }; });
      },
      frame: function (st, p, c) {
        var S = window.SPStage.S, R = st.R, off = st.off;
        var keep = { cv: S.cv, ctx: S.ctx, W: S.W, H: S.H, U: S.U, safe: S.safe };
        S.cv = off; S.ctx = off.getContext("2d"); S.W = off.width; S.H = off.height; S.U = off.width; S.safe = false;
        try { window.SPStage.frameAt(R.shots || R.sel, R.ctx, p, R.force, R.shots, true); }
        catch (e) { /* the frame says what failed; the reel carries on */ }
        finally { S.cv = keep.cv; S.ctx = keep.ctx; S.W = keep.W; S.H = keep.H; S.U = keep.U; S.safe = keep.safe; }
        ground(c); letterbox(c, off, st.sw, st.sh);
      }
    });
  }

  /* ======================================================================
     Director Pro — the document on the timeline, through DPRender.renderTo
     ====================================================================== */
  function directorPro() {
    function texts(sc, C) {
      var out = [];
      (sc.layers || []).forEach(function (Ly) {
        if (Ly.hidden) return;
        [Ly.text, Ly.sub].forEach(function (s) {
          if (!s) return;
          var t = window.SPDirector && window.SPDirector.expand ? window.SPDirector.expand(s, C) : s;
          t = String(t || "").replace(/\s+/g, " ").trim();
          if (t) out.push(t);
        });
      });
      return out;
    }
    return make({
      id: "director-pro", label: "Director Pro",
      have: function () { return !!(window.__dp && window.DPRender && window.DPModel); },
      configure: function () {
        var d = window.__dp.doc(), C = window.__dp.ctx(), M = window.DPModel;
        if (!d || !d.scenes || !d.scenes.length) throw new Error("The document has no scenes. / दस्तावेज़ में कोई दृश्य नहीं।");
        var F = M.FORMATS[d.format] || M.FORMATS.reel, k = Math.min(1, W / F.w, H / F.h);
        var sw = Math.round(F.w * k), sh = Math.round(F.h * k);
        var personal = false, scenes = [];
        d.scenes.forEach(function (sc, i) {
          var from = M.sceneStart(d, i), to = from + sc.seconds;
          var tx = texts(sc, C), views = [];
          (sc.layers || []).forEach(function (Ly) {
            if (Ly.kind !== "view" || !Ly.sel) return;
            Ly.sel.forEach(function (id) {
              var n = window.SPNodes && window.SPNodes.byId(id);
              if (!n) return;
              if (nodePersonal(n, C)) personal = true;
              views.push({ node: n, v: window.SPNodes.resolve(n, C) });
            });
          });
          (sc.layers || []).forEach(function (Ly) {
            if (C && C.J && /\{[^}]+\}/.test((Ly.text || "") + (Ly.sub || ""))) personal = true;
          });
          scenes.push({ from: from, to: to, name: sc.name || ("Scene " + (i + 1)), texts: tx, views: views.slice(0, 3) });
        });
        return { d: d, C: C, seconds: M.total(d), scenes: scenes, personal: personal,
                 off: canvas(sw, sh), sw: sw, sh: sh };
      },
      zones: function (st) { return zonesFor(st.sw, st.sh, H * 0.70); },
      beats: function (st, lang) {
        return st.scenes.map(function (s) {
          var say = s.texts.length ? s.texts.join(" — ")
                  : s.views.length ? s.views.map(function (x) { return nodeLine(x.node, x.v, lang); }).join("; ")
                  : (lang === "hi" ? hiWords(s.name) : s.name);
          return { from: s.from, to: s.to, say: say };
        });
      },
      frame: function (st, p, c) {
        window.DPRender.renderTo(st.off, st.sw, st.sh, st.d, st.C, p * st.seconds);
        ground(c); letterbox(c, st.off, st.sw, st.sh);
      }
    });
  }

  /* ======================================================================
     Motion — a scene, stepped on the recorder's own pacing schedule
     ====================================================================== */
  function motion() {
    var FPS = 30, CAP = 90;
    return make({
      id: "motion", label: "Motion",
      have: function () { return !!window.__moRA; },
      personalNow: function () { return window.__moRA.personal(); },
      configure: function (spec) {
        var M = window.__moRA, lang = L(spec.lang || "hi");
        if (!M.available()) throw new Error("This scene needs a chart. Cast one first. / इस दृश्य के लिए कुण्डली चाहिए।");
        var sch = M.schedule(FPS, CAP), off = canvas(W, H), n = sch.table.length;
        var K = Math.max(3, Math.min(6, Math.round(sch.seconds / 6)));
        var marks = [];
        for (var k = 1; k < K; k++) {
          var at = (k + 0.5) / K, p = sch.table[Math.min(n - 1, Math.round(at * (n - 1)))];
          marks.push({ at: at, p: p, hi: M.info(off, p, "hi"), en: M.info(off, p, "en") });
        }
        return { seconds: sch.seconds, table: sch.table, capped: sch.capped, full: sch.full, off: off,
                 K: K, marks: marks, personal: M.personal(), stage: M.stage(), scene: M.scene(),
                 words: { hi: M.words("hi"), en: M.words("en") }, spanW: { hi: M.span("hi"), en: M.span("en") }, lang0: lang };
      },
      zones: function (st) {
        var s = st.stage;
        return { title: null, caption: { x: W * 0.06, y: s.capY - H * 0.12, w: W * 0.88, h: H * 0.105 },
                 footer: { x: W * 0.05, y: s.capY + s.capH, w: W * 0.90, h: H - s.capY - s.capH } };
      },
      beats: function (st, lang) {
        var T = st.seconds, w = st.words[lang], out = [];
        var sp = lang === "hi" ? hiWords(st.spanW.en) : st.spanW.en;
        var head = w.title + (sp ? " — " + sp : "");
        out.push({ from: 0, to: T / st.K, say: head });
        st.marks.forEach(function (m, i) {
          var inf = m[lang], bits = [];
          if (inf && inf.ms != null && isFinite(inf.ms)) bits.push(dateText(inf.ms, lang));
          /* the frame's "·" is a separator for the eye; a voice wants a comma */
          if (inf && inf.sub) bits.push(String(inf.sub).replace(/\s*·\s*/g, ", "));
          if (!bits.length && i === 0 && w.sub) bits.push(w.sub);
          if (!bits.length) return;
          out.push({ from: T * (i + 1) / st.K, to: T * (i + 2) / st.K, say: bits.join(" — ") });
        });
        return out;
      },
      facts: function (st) {
        var F = RA.facts, o = [];
        st.marks.forEach(function (m, i) {
          if (m.en && m.en.ms != null && isFinite(m.en.ms)) o = o.concat(F.dateFacts("mo" + i, m.en.ms, "scene date"));
        });
        return o;
      },
      frame: function (st, p, c) {
        var n = st.table.length, q = st.table[Math.min(n - 1, Math.round(p * (n - 1)))];
        window.__moRA.draw(st.off, q, st.lang);
        c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
        c.drawImage(st.off, 0, 0, W, H);
      },
      title: function () { return null; }
    });
  }

  /* ======================================================================
     Kinetic Workstation — the two kuṇḍalīs, whole-sign then chalita
     ====================================================================== */
  function kinetic() {
    function snap(svg) { return window.SvgFilm.snapshot(svg, { margin: 0.02 }); }
    return make({
      id: "kinetic", label: "Kinetic Workstation",
      have: function () { return !!(window.SPWorkstation && window.SPWorkstation.reel && window.SvgFilm); },
      personalNow: function () { return true; },
      configure: function (spec) {
        var R = window.SPWorkstation.reel();
        if (!R) throw new Error("Cast a chart first. / पहले कुण्डली बनाएँ।");
        /* the view's own markup, built off-screen with the draw-in
           animations stripped, so the snapshot is the finished chart */
        var box = document.createElement("div");
        box.setAttribute("aria-hidden", "true");
        box.style.cssText = "position:fixed;left:-12000px;top:0;width:820px;pointer-events:none";
        box.innerHTML = R.html.replace(/\bws(draw|pop|flow)\b/g, "").replace(/id="ws-/g, 'id="ra-ws-');
        document.body.appendChild(box);
        var svgs = box.querySelectorAll("svg.wssvg");
        var jobs = Array.prototype.map.call(svgs, snap);
        return Promise.all(jobs).then(function (shots) {
          box.remove();
          var T = Math.max(spec.seconds || 20, R.chalita ? 16 : 9);
          return { R: R, shots: shots, seconds: T, personal: true };
        }, function (e) { box.remove(); throw e; });
      },
      zones: function () {
        return { title: { x: W * 0.05, y: H * 0.06, w: W * 0.90, h: H * 0.07 },
                 caption: { x: W * 0.06, y: H * 0.72, w: W * 0.88, h: H * 0.13 },
                 footer: { x: W * 0.05, y: H * 0.90, w: W * 0.90, h: H * 0.10 } };
      },
      beats: function (st, lang) {
        var R = st.R, T = st.seconds, hi = lang === "hi";
        var lines = [hi ? "आपकी कुण्डली — लग्न " + RASI_HI[R.lagna] : "Your chart — lagna in " + RASI_EN[R.lagna],
                     hi ? "राशि चार्ट में हर राशि एक भाव है" : "In the rāśi chart, each sign is one house"];
        if (R.chalita) {
          lines.push(hi ? "श्रीपति भाव-चलित — भाव कोणों के बीच बँटते हैं" : "Śrīpati bhāva-chalita: houses trisected between the angles");
          var n = R.moved.length, names = R.moved.map(function (m) { return grahaName(m.en, lang); }).join(", ");
          lines.push(n ? (hi ? n + (n === 1 ? " ग्रह भाव बदलता है: " : " ग्रह भाव बदलते हैं: ") + names : n + (n === 1 ? " graha changes house: " : " grahas change house: ") + names)
                       : (hi ? "कोई ग्रह भाव नहीं बदलता" : "No graha changes house"));
        }
        return spread(lines, T);
      },
      frame: function (st, p, c) {
        ground(c);
        var two = st.shots.length > 1, half = two ? 0.5 : 1.01;
        var box = { x: W * 0.06, y: H * 0.22, s: W * 0.88 };
        function put(shot, a, z) {
          if (!shot || a <= 0) return;
          var k = Math.min(box.s / shot.w, box.s / shot.h) * z, w = shot.w * k, h = shot.h * k;
          c.save(); c.globalAlpha = a;
          c.drawImage(shot.img, W / 2 - w / 2, box.y + box.s / 2 - h / 2, w, h);
          c.restore();
        }
        var e1 = Math.min(1, p / 0.08), z1 = 0.92 + 0.08 * (1 - Math.pow(1 - e1, 3));
        var x = two ? Math.max(0, Math.min(1, (p - half) / 0.08)) : 0;
        /* a dip through the ground rather than a cross-fade: two diamonds
           superimposed read as one smudged chart */
        put(st.shots[0], e1 * Math.max(0, 1 - 2 * x), z1);
        if (two) put(st.shots[1], Math.max(0, 2 * x - 1), 0.96 + 0.04 * x);
      },
      title: function (st) { return st.lang === "hi" ? "कुण्डली · भाव-चलित" : "Kuṇḍalī · bhāva-chalita"; }
    });
  }

  /* ======================================================================
     The casting ceremony — wound to the moment in the page's own fields
     ====================================================================== */
  function ceremony() {
    function moment() {
      var d = document.getElementById("cer-date"), t = document.getElementById("cer-time");
      if (!d || !d.value) return null;
      var ms = Date.parse(d.value + "T" + ((t && t.value) || "12:00") + ":00");
      return isNaN(ms) ? null : new Date(ms);
    }
    /* the same record the page reads for "My chart's moment" */
    function isBirth(m) {
      var i = null;
      try { i = JSON.parse(localStorage.getItem("nirayana.birth") || "null"); } catch (e) { return false; }
      if (!i || i.year == null || !m) return false;
      var ms = Date.UTC(i.year, (i.month || 1) - 1, i.day || 1, i.hour || 0, i.minute || 0) - (i.tzHours || 0) * 3600000;
      return Math.abs(ms - m.getTime()) < 120000;
    }
    return make({
      id: "ceremony", label: "The casting ceremony",
      have: function () { return !!(window.SPCosmos && window.SPCosmos.ceremony && window.SvgFilm); },
      personalNow: function () { return isBirth(moment()); },
      configure: function (spec) {
        var m = moment();
        if (!m) throw new Error("Pick a date first. / पहले तारीख़ चुनें।");
        window.SPCosmos.ceremony(m, { hold: true, line: "चुने हुए क्षण की ओर लौट रहा है आकाश…",
                                     sub: "Winding the sky back to the chosen moment", cta: "End the ceremony" });
        /* the overlay can take a moment — longer if a previous one is still
           closing — so wait for it rather than for a fixed time */
        function live() { var f = window.SPCosmos.frame && window.SPCosmos.frame(); return f && f.svg() ? f : null; }
        function until(ms) {
          return live() || ms <= 0 ? Promise.resolve(live()) : RA.core.wait(100).then(function () { return until(ms - 100); });
        }
        return RA.core.wait(450).then(function () {
          try { window.SPCosmos.end(); } catch (e) {}
          return until(4000);
        }).then(function (f) {
          if (!f) {
            /* raised while the last one was still closing: raise it again */
            window.SPCosmos.ceremony(m, { hold: true, line: "चुने हुए क्षण की ओर लौट रहा है आकाश…",
                                         sub: "Winding the sky back to the chosen moment", cta: "End the ceremony" });
            return RA.core.wait(450).then(function () { try { window.SPCosmos.end(); } catch (e) {} return until(4000); });
          }
          return f;
        }).then(function (f) {
          if (!f) throw new Error("The ceremony did not open. / समारोह नहीं खुला।");
          f.pause();
          var r = f.read();
          return { m: m, f: f, spin0: r.spin || 0, seconds: Math.max(spec.seconds || 14, 12), personal: isBirth(m) };
        });
      },
      zones: function () {
        return { title: { x: W * 0.05, y: H * 0.06, w: W * 0.90, h: H * 0.07 },
                 caption: { x: W * 0.06, y: H * 0.74, w: W * 0.88, h: H * 0.13 },
                 footer: { x: W * 0.05, y: H * 0.90, w: W * 0.90, h: H * 0.10 } };
      },
      beats: function (st, lang) {
        var hi = lang === "hi", m = st.m, hh = ("0" + m.getHours()).slice(-2), mm = ("0" + m.getMinutes()).slice(-2);
        return [
          { from: 0, to: st.seconds * 0.4, say: hi ? "आकाश " + dateText(m, "hi") + " की ओर लौट रहा है" : "The sky winds back to " + dateText(m, "en") },
          { from: st.seconds * 0.4, to: st.seconds * 0.72, say: hi ? "सत्ताईस नक्षत्र, बारह राशियाँ" : "Twenty-seven nakṣatras, twelve rāśis" },
          { from: st.seconds * 0.72, to: st.seconds, say: hi ? hh + " बजकर " + mm + " मिनट का आकाश" : "The sky at " + hh + " " + mm + " hours" }
        ];
      },
      facts: function (st) { return RA.facts.dateFacts("cer", st.m.getTime(), "ceremony moment"); },
      frame: function (st, p, c) {
        var f = st.f;
        f.set({ p: Math.min(1, p / 0.7), spin: st.spin0 + p * st.seconds * 4 });
        var svg = f.svg();
        if (!svg) { ground(c); return null; }
        return window.SvgFilm.snapshot(svg).then(function (shot) {
          ground(c);
          var top = H * 0.17, avail = H * 0.52, k = Math.min((W * 1.12) / shot.w, avail / shot.h);
          c.drawImage(shot.img, (W - shot.w * k) / 2, top + (avail - shot.h * k) / 2, shot.w * k, shot.h * k);
        });
      },
      title: function (st) { return st.lang === "hi" ? "नक्षत्र चक्र" : "The nakṣatra ring"; },
      release: function () { try { window.SPCosmos.abort(); } catch (e) {} }
    });
  }

  /* ======================================================================
     The ayanāṃśa film — the rings across four thousand years, with holds
     where the narration names a year
     ====================================================================== */
  function ayanamsa() {
    /* playhead → year: hold, sweep, hold, sweep, hold */
    var P = [0, 0.2, 0.45, 0.6, 0.8, 1], Y = [-500, -500, 2000, 2000, 3500, 3500];
    function yearAt(p) {
      for (var i = 1; i < P.length; i++) if (p <= P[i]) {
        var u = (p - P[i - 1]) / (P[i] - P[i - 1]); u = u * u * (3 - 2 * u);
        return Y[i - 1] + (Y[i] - Y[i - 1]) * u;
      }
      return Y[Y.length - 1];
    }
    function deg(v) { return (v < 0 ? "−" : "") + (Math.round(Math.abs(v) * 10) / 10); }
    function dm(v) {
      var a = Math.abs(v), d = Math.floor(a), m = Math.round((a - d) * 60);
      if (m === 60) { d++; m = 0; }
      return (v < 0 ? "−" : "") + d + "°" + ("0" + m).slice(-2) + "′";
    }
    return make({
      id: "ayanamsa-film", label: "Ayanāṃśa film",
      have: function () { return !!(window.__ayFilm && window.SvgFilm && window.__ayFilm.svg()); },
      configure: function (spec) {
        var F = window.__ayFilm;
        var a0 = F.value(-500), a1 = F.value(2000), a2 = F.value(3500);
        if (a0 == null || a1 == null || a2 == null) throw new Error("This ayanāṃśa has no value across that span. / इस अयनांश का मान इस अवधि में नहीं है।");
        var per = Math.round(2500 / Math.abs(a1 - a0));
        return { F: F, keep: F.year(), name: F.name(), a: [a0, a1, a2], per: per,
                 seconds: Math.max(spec.seconds || 16, 14), personal: false };
      },
      zones: function () {
        return { title: { x: W * 0.05, y: H * 0.015, w: W * 0.90, h: H * 0.055 },
                 caption: { x: W * 0.06, y: H * 0.805, w: W * 0.88, h: H * 0.10 },
                 footer: { x: W * 0.05, y: H * 0.92, w: W * 0.90, h: H * 0.08 } };
      },
      beats: function (st, lang) {
        var T = st.seconds, hi = lang === "hi", a = st.a;
        function at(y, v) { return hi ? yearText(y, "hi") + " में: " + deg(v) + " अंश" : "In " + yearText(y, "en") + ": " + deg(v) + "°"; }
        return [
          { from: 0, to: P[1] * T, say: (hi ? st.name + " अयनांश — " : st.name + " ayanāṃśa — ") + at(-500, a[0]) },
          { from: P[1] * T, to: P[2] * T, say: hi ? "हर " + st.per + " साल में लगभग एक अंश" : "About one degree every " + st.per + " years" },
          { from: P[2] * T, to: P[3] * T, say: at(2000, a[1]) },
          { from: P[3] * T, to: P[4] * T, say: hi ? "तारे वहीं रहते हैं, ऋतुएँ खिसकती हैं" : "The stars stay. The seasons slip." },
          { from: P[4] * T, to: T, say: at(3500, a[2]) }
        ];
      },
      facts: function (st) {
        return [{ id: "ay.-500", label: "ayanāṃśa at 501 BCE (°)", value: st.a[0], unit: "°", kind: "degree", source: "engine" },
                { id: "ay.2000", label: "ayanāṃśa at 2000 CE (°)", value: st.a[1], unit: "°", kind: "degree", source: "engine" },
                { id: "ay.3500", label: "ayanāṃśa at 3500 CE (°)", value: st.a[2], unit: "°", kind: "degree", source: "engine" },
                { id: "ay.per", label: "years per degree, 501 BCE–2000 CE", value: st.per, unit: "", kind: "number", source: "engine" }];
      },
      frame: function (st, p, c) {
        var F = st.F, y = Math.round(yearAt(p));
        F.at(y);
        var svg = F.svg();
        return window.SvgFilm.snapshot(svg).then(function (shot) {
          var v = F.value(y);
          F.paint(c, W, H, { head: "", big: v == null ? "" : dm(v), foot: "",
                             sub: yearText(y, st.lang === "hi" ? "hi" : "en") + " · " + st.name }, shot);
        });
      },
      title: function (st) { return st.lang === "hi" ? "अयनांश — दो राशिचक्रों का अंतर" : "The ayanāṃśa — the gap between two zodiacs"; },
      release: function (st) { st.F.done(st.keep); }
    });
  }

  var MAKERS = { "studio-pro": studioPro, "director-pro": directorPro, motion: motion,
                 kinetic: kinetic, ceremony: ceremony, "ayanamsa-film": ayanamsa };
  Object.keys(MAKERS).forEach(function (k) { if (RA.adapter) RA.adapter.register(k, MAKERS[k]); });

  /* ---- the buttons ------------------------------------------------------
     Each sits beside the page's own record button. Motion and Director
     build their controls after load (and Motion rebuilds its pane), so the
     check repeats; it is one querySelector a second and stops looking for a
     surface that is not on the page. */
  var PLACES = [
    { id: "studio-pro", sel: "#sp-rec", cls: "spbtn" },
    { id: "director-pro", find: function () {
        var b = document.querySelectorAll("button.dpbtn.primary");
        for (var i = 0; i < b.length; i++) if (/Record the reel/.test(b[i].textContent)) return b[i];
        return null; }, cls: "dpbtn", need: function () { return !!window.__dp; } },
    /* the Workstation carries the report bundle, Motion pane and all, so it
       is asked first and Motion is the Motion page only */
    { id: "kinetic", sel: "#wsb-print", cls: "wsact", need: function () { return !!window.SPWorkstation; } },
    { id: "motion", sel: "#movid", cls: "k-btn sec", need: function () { return !!window.__moRA && !window.SPWorkstation; } },
    { id: "ceremony", sel: "#cer-save", cls: "k-btn sec" },
    { id: "ayanamsa-film", sel: "[data-ay=\"film\"]", cls: "swbtn" }
  ];
  function place() {
    if (!RA.panel || document.getElementById("ra-make")) return;
    for (var i = 0; i < PLACES.length; i++) {
      var P0 = PLACES[i], at = P0.find ? P0.find() : document.querySelector(P0.sel);
      if (!at) continue;
      if (P0.need && !P0.need()) continue;
      at.setAttribute("data-ra-anchor", P0.id);
      RA.panel.mount("[data-ra-anchor=\"" + P0.id + "\"]", function () { return "current"; }, P0.cls,
                     MAKERS[P0.id]);
      return;
    }
  }
  var TICKS = 0;
  function loop() {
    place();
    if (++TICKS < 600) setTimeout(loop, 1000);
  }
  /* Reel Studio has its own button (ra-panel.js); these pages never load
     reel.js, so the two cannot meet */
  function boot() { if (!document.getElementById("reel-still")) loop(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 300); });
  else setTimeout(boot, 300);

  RA.surfaces = { make: function (id) { return MAKERS[id] ? MAKERS[id]() : null; }, list: function () { return Object.keys(MAKERS); },
                  hiWords: hiWords, yearText: yearText, dateText: dateText, lonText: lonText };
})();
