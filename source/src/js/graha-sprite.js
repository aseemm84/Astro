/* graha-sprite.js — the lit graha surfaces, as data URIs a wheel can draw.
 *
 * WHAT THIS IS NOT. It is not a new renderer. 54-motion-bodies.js already
 * builds each graha's surface pixel by pixel and lights it, and sp-bodies.js
 * already caches discs of it; both are concatenated ahead of this file in
 * bodies.js. This is the thin layer between them and an <image> element: it
 * asks for a disc, turns it into a data URI, and remembers the answer.
 *
 * WHY THE COPY MATTERS. moBody hands back a canvas it still OWNS — the pixel
 * buffer is pooled by size, so the next disc of the same radius overwrites
 * this one in place. __moDisc copies before returning, which is why this file
 * calls that and not moBody. The URI is taken immediately regardless, because
 * a cached <image href> must not depend on a buffer somebody else may reuse.
 *
 * RĀHU AND KETU GET NO SURFACE. __moDisc returns null for them on purpose:
 * they are chāyā grahas — the two points where the Moon's path crosses the
 * ecliptic — not bodies, and inventing a photosphere for a node would be a
 * picture of something that does not exist. They are drawn as shadow discs
 * instead. The shadow is the same one sp-cosmos.js draws for the casting
 * ceremony; starwheel-verify asserts the two are character-identical, so the
 * site cannot end up with two different ideas of what a node looks like.
 *
 * SIZE AND CACHING. Discs are generated at device resolution and quantised by
 * radius, because a wheel redrawing on every frame of a play-through would
 * otherwise rebuild nine surfaces sixty times a second. sp-bodies.js already
 * quantises internally; this caches the URI on top of that, keyed by name,
 * quantised radius and phase bucket.
 */
(function () {
  "use strict";

  var URI = {};

  /* Rāhu and Ketu: the same shadow disc sp-cosmos.js draws, deliberately
     identical rather than merely similar. */
  function shadowDisc(R) {
    var S = R * 2, cv = document.createElement("canvas");
    cv.width = S; cv.height = S;
    var c = cv.getContext("2d");
    var g = c.createRadialGradient(R, R, R * 0.1, R, R, R);
    g.addColorStop(0, "rgba(58,44,78,.92)");
    g.addColorStop(0.72, "rgba(42,32,58,.80)");
    g.addColorStop(1, "rgba(150,126,196,.26)");
    c.fillStyle = g; c.beginPath(); c.arc(R, R, R * 0.97, 0, 6.2832); c.fill();
    c.strokeStyle = "rgba(176,152,220,.55)"; c.lineWidth = Math.max(1, R * 0.07);
    c.beginPath(); c.arc(R, R, R * 0.93, 0, 6.2832); c.stroke();
    return cv;
  }

  /* A graha's lit disc as a data URI, or null if the surface renderer is not
     loaded — every caller falls back to the lettered disc rather than failing,
     because a wheel with no grahas on it is worse than a plain one.

       name   Sun … Ketu, or the Sanskrit name; __moDisc accepts both
       r      drawn RADIUS in CSS pixels; the sprite is made at 2× for retina
       phase  elongation from the Sun in degrees, 180 being full. Omitted
              means full, which is what a chart token wants: a graha on a ring
              stands for the body, not for how much of it happens to be lit.
              The Moon is the exception the wheels pass a real phase for,
              because the same page prints the phase elsewhere and two
              different Moons on one page is a contradiction, not a style. */
  function href(name, r, phase) {
    r = Math.max(4, Math.round(r));
    var R = Math.min(72, r * 2);                       /* device pixels */
    var ph = phase == null ? 180 : phase;
    var key = name + "|" + (R < 28 ? R : Math.round(R / 6) * 6) + "|" +
              (name === "Moon" ? Math.round(ph / 6) * 6 : 180);
    if (URI[key] !== undefined) return URI[key];
    var cv = null;
    try {
      if (name === "Rahu" || name === "Ketu" || name === "Rāhu" || name === "Ketu")
        cv = shadowDisc(R);
      else if (window.__moDisc) cv = window.__moDisc(name, R, { phase: ph });
      else if (window.SPBody && window.SPBody.ready())
        cv = window.SPBody.disc(name, R, { phase: ph });
    } catch (e) { cv = null; }
    var u = null;
    try { u = cv ? cv.toDataURL("image/png") : null; } catch (e) { u = null; }
    URI[key] = u;
    return u;
  }

  function ready() {
    return !!(window.__moDisc || (window.SPBody && window.SPBody.ready()));
  }

  /* The Moon's elongation from the Sun, which IS its phase: 180° is full.
     Taken from the same snapshot the wheel is drawing, so the disc cannot
     disagree with the tithi printed beside it. */
  function moonPhase(sky) {
    if (!sky || !sky.planets) return 180;
    var su = null, mo = null;
    sky.planets.forEach(function (p) {
      if (p.en === "Sun") su = p.sid;
      if (p.en === "Moon") mo = p.sid;
    });
    if (su == null || mo == null) return 180;
    return ((mo - su) % 360 + 360) % 360;
  }

  window.NSprite = { href: href, ready: ready, moonPhase: moonPhase,
                     _cached: function () { return Object.keys(URI).length; } };
})();
