/* ===== Reel Agent — the reader's own API keys ============================

   Nirayana has no key of its own. Connected mode works only with a key the
   reader brings, for the provider they choose.

   DESKTOP. The key goes to the operating system's keychain through Rust
   (keychain_set) the moment it is typed, and the page can never read it back:
   keychain_get answers only whether one is stored and its last four
   characters. Every request is made by Rust (ai_request), which reads the key
   itself, so after the first keystroke the key never re-enters the webview.

   WEBSITE. There is no keychain a page can use, so the key is kept in this
   browser's localStorage — after a warning the reader has to accept, and with
   a Forget button beside it. That is said plainly in the panel and in the
   README, because it is the weaker of the two. */
(function () {
  "use strict";
  var RA = window.RA = window.RA || {};
  var PFX = "nirayana.reelAgent.key.";
  var PROVIDERS = {
    anthropic:  { label: "Claude (Anthropic)", host: "api.anthropic.com", console: "platform.claude.com" },
    gemini:     { label: "Gemini (Google)", host: "generativelanguage.googleapis.com", console: "aistudio.google.com" },
    elevenlabs: { label: "ElevenLabs (voice only)", host: "api.elevenlabs.io", console: "elevenlabs.io" }
  };

  function app() { return RA.core.inApp(); }

  /* → Promise<{ stored, hint }> — never the key itself */
  function status(p) {
    if (app()) return RA.core.invoke("keychain_get", { provider: p }).then(function (r) {
      return { stored: !!(r && r.stored), hint: r && r.hint || "" };
    }).catch(function () { return { stored: false, hint: "" }; });
    var k = null;
    try { k = localStorage.getItem(PFX + p); } catch (e) {}
    return Promise.resolve({ stored: !!k, hint: k ? "…" + k.slice(-4) : "" });
  }
  function set(p, key) {
    key = String(key || "").trim();
    if (!PROVIDERS[p]) return Promise.reject(new Error("unknown provider " + p));
    if (!key) return Promise.reject(new Error("empty key"));
    if (app()) return RA.core.invoke("keychain_set", { provider: p, key: key });
    try { localStorage.setItem(PFX + p, key); } catch (e) { return Promise.reject(e); }
    return Promise.resolve(true);
  }
  function forget(p) {
    if (app()) return RA.core.invoke("keychain_delete", { provider: p });
    try { localStorage.removeItem(PFX + p); } catch (e) {}
    return Promise.resolve(true);
  }
  /* website only: the fetch needs the key in the page */
  function webKey(p) {
    if (app()) return null;
    try { return localStorage.getItem(PFX + p); } catch (e) { return null; }
  }

  RA.keys = { PROVIDERS: PROVIDERS, status: status, set: set, forget: forget, webKey: webKey };
})();
