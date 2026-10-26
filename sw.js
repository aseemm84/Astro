/* The service worker.
 *
 * WHAT IT IS FOR. Two things the site already claims and could not quite
 * deliver over the network: that it works offline, and that nothing is sent
 * anywhere. Offline was true of a copy opened from Finder and not of the
 * hosted site; and every repeat visit re-fetched 200 KB of engine and, on the
 * chart page, three megabytes of city data.
 *
 * WHAT IT MUST NOT DO. Serve a stale page. A build of this site was once stuck
 * in iOS Safari for days, and a naive cache-first worker is how that becomes
 * permanent rather than merely annoying — the reader has no "reload harder"
 * available and no way to know the page is old. So the strategy is chosen
 * against that failure, not for the best benchmark:
 *
 *   NAVIGATIONS are network-first. A reader who is online always gets the page
 *   the server has, every time. The cache answers only when the network does
 *   not — which is what offline means. There is no window in which a current
 *   build exists and this worker shows an old one.
 *
 *   ASSETS are stale-while-revalidate. The cached copy is served at once and a
 *   fresh copy is fetched in the background for next time. These are the big,
 *   slow, rarely-changing files, and one load of slightly-old engine.js against
 *   a current page is harmless: a build that changes engine.js changes the pages
 *   too, and the next navigation brings both.
 *
 *   THE CACHE NAME CARRIES THE BUILD STAMP. A new build writes a new cache and
 *   deletes every older one on activate. Nothing from a previous build can be
 *   served by this one even in principle, which is a stronger guarantee than
 *   hoping the revalidation ran.
 *
 * 2026-10-26.c4c870e is replaced by build.py, which is what makes all of the above true.
 */
var CACHE = "nirayana-2026-10-26.c4c870e";

/* Precached on install: the shell a reader needs to have ANY page work offline.
   Deliberately not cities.json — three megabytes is not something to download on
   somebody's behalf before they have asked for a chart. It gets cached when they
   actually cast one, by the asset path below. */
var SHELL = [
  "./", "./index.html", "./now.html", "./now.js", "./site.js", "./engine.js",
  "./kundli.html", "./404.html",
  "./assets/brand/icon-192.png", "./favicon.ico"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      /* addAll rejects the whole install if any one file 404s, which would leave
         the site with no worker at all over a single renamed asset. Added one by
         one so a miss costs that file and nothing else. */
      return Promise.all(SHELL.map(function (u) {
        return c.add(new Request(u, { cache: "reload" })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k !== CACHE && k.indexOf("nirayana-") === 0;
      }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  /* Same origin only. There is nothing else to fetch — the site makes no
     third-party request — so anything cross-origin is something this worker
     should not be touching, let alone storing. */
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  /* --- navigations: network first ---------------------------------------- */
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(req, { ignoreSearch: true }).then(function (hit) {
          return hit || caches.match("./404.html") ||
                 new Response("Offline, and this page is not in the cache.",
                              { status: 503, headers: { "content-type": "text/plain" } });
        });
      })
    );
    return;
  }

  /* --- assets: stale while revalidate ------------------------------------ */
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      });
      /* A cache hit answers now; the network result replaces it for next time.
         On a miss the network is the only answer, and if that fails there is
         nothing honest to return but the failure. */
      if (hit) { net.catch(function () {}); return hit; }
      return net;
    })
  );
});
;
