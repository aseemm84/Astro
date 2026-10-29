#!/usr/bin/env python3
"""
Nirayana build.

Source lives in src/ and vendor/. This assembles the shipped files:

    kundli.html      shell + css + vendor js + engine + report modules + ui
    <page>.html      shared shell + per-page content, for the 14 reference pages

Everything is inlined, so each output file is self-contained and works offline.

    python3 build.py              write the site to the repository root
    python3 build.py --out DIR    write it somewhere else
    python3 build.py --check      rebuild and compare, changing nothing
    python3 build.py --out DIR    write elsewhere
    python3 build.py --check      rebuild and diff against the current output

--check is the guard rail. After a refactor that is *supposed* to change nothing
it must report "identical to the current output".
"""
import os, re, json, sys, difflib, shutil, tempfile, subprocess

# --app builds the same twenty-eight pages with application chrome instead of
# website chrome. It is a target, not a fork: every page, every bundle and every
# figure is produced by the code below either way, and the only differences are
# the four listed in src/css/app-shell.css. The first thing the harness checks is
# that the website build is byte-identical whether or not this flag exists.
APP_MODE = False
APP_BUILD = ""

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC  = os.path.join(ROOT, "src")
VEND = os.path.join(ROOT, "vendor")
# The repository root, which is also where the built site is served from. Only
# cities.json is read from here: it is data the site serves directly rather than
# source the build transforms, so it lives beside the output in one copy.
SITE = os.path.dirname(ROOT) if os.path.basename(ROOT) == "source" else ROOT

def read(*p):
    with open(os.path.join(*p), encoding="utf-8") as f:
        return f.read()

def jsread(*p):
    """A JavaScript file, safe to concatenate with the next one.

    EVERY BUNDLE HERE IS FILES GLUED END TO END, and that is a sharper edge
    than it looks. A file whose last statement has no semicolon does not
    simply end: if the next file begins with "(" or "[", the parser reads it
    as a call or an index on whatever the previous file finished with.

    Both vendored muxers end with

        if (typeof module === "object" && ...) Object.assign(module.exports, X)

    and no semicolon. In a browser `module` is undefined, so that branch is
    never taken -- and the file after it, an IIFE beginning with "(", was
    parsed as its ARGUMENT and silently never ran. No error, no warning, and
    the global it defines simply absent. It cost an hour to find, and it
    would have cost that again the next time anything was vendored.

    So a semicolon goes between every pair, where it is an empty statement
    and harmless, rather than being left to the last line of whatever was
    pasted in."""
    return read(*p).rstrip() + "\n;\n"

def report_bundle():
    """Concatenate the report modules in manifest order. They are slices of one
    closure, not independent files, so order matters and stray files are an error."""
    d = os.path.join(SRC, "js", "report")
    order = json.load(open(os.path.join(d, "_order.json"), encoding="utf-8"))["report_order"]
    missing = [n for n in order if not os.path.exists(os.path.join(d, n))]
    if missing:
        raise SystemExit("missing report modules: %s" % missing)
    # modules live in subfolders by concern, so the stray check has to walk the tree:
    # a module added but not listed would otherwise be silently left out of the build
    found = set()
    for root, _dirs, files in os.walk(d):
        for f in files:
            if f.endswith(".js"):
                found.add(os.path.relpath(os.path.join(root, f), d).replace(os.sep, "/"))
    stray = sorted(found - set(order))
    if stray:
        raise SystemExit("report modules not listed in _order.json: %s" % stray)
    bundle = "".join(read(d, n) for n in order)
    # Two modules declaring the same function is legal in one concatenated scope and
    # silently resolves to the last one, which is how a context bar came to read a
    # sky scene's moWhere(). Nothing throws, so the build has to be what notices.
    names = re.findall(r"^function\s+([A-Za-z_$][\w$]*)\s*\(", bundle, re.M)
    dupes = sorted({n for n in names if names.count(n) > 1})
    if dupes:
        raise SystemExit("function declared more than once in the report bundle: %s" % dupes)
    return bundle

# ---------------------------------------------------------------------------
# The brand, in one place.
#
# Everything the site shows about what it is called lives here, and the sources
# reach it through {{BRAND}} and friends rather than spelling it out. Renaming is
# then this block plus a new mark in assets/brand/ — not a search across 17 files,
# which is what it used to be.
#
# What is deliberately NOT here: four strings that look like branding and are
# actually identifiers. Renaming them breaks things silently.
#   * `learnhoro:1` in a saved chart file (ui.js) — the format marker. Change it
#     and every chart anyone has already saved stops opening.
#   * localStorage "learnhoro.chart" (print path → dashboard.html) — a key agreed
#     between two files; rename one and the handoff fails with no error.
#   * "LearnHoro built-in engine" in engine.js, matched by substring in
#     99-main.js — a contract between producer and consumer.
#   * The social handle is the user's to change, not ours. Changed to
#     "@Nirayana.Soft" on request, 16 Oct 2026; it lives in MO.cap.handle and in
#     the panel input that shows it, and nothing matches on it.
# Those stay as they are on purpose, and each carries a comment saying so.
# ---------------------------------------------------------------------------
BRAND = {
    "name":    "Nirayana",
    "deva":    "निरयन",      # निरयन
    "slug":    "nirayana",
    "tagline": "Vedic astrology from Bṛhat Parāśara Horā Śāstra",
    # "without ayana" — the sidereal zodiac. The mark draws the offset it names.
    "gloss":   "“without ayana” — the sidereal zodiac",
    # Where the site lives. Only social-card scrapers and search engines follow
    # these; a browser never fetches a canonical or an og:image, so a local copy
    # opened from Finder makes no request for any of it. One line to change if the
    # repository is renamed or the site moves to a domain of its own.
    "base":    "https://aseemm84.github.io/Astro/",
    "navy":    "#1d2340",
    "gold":    "#c9a24b",
}
SITE_BASE = BRAND["base"]

def brandify(s):
    """Resolve the brand tokens in a source file."""
    return (s.replace("{{BRAND}}",   BRAND["name"])
             .replace("{{BRAND_DEVA}}", BRAND["deva"])
             .replace("{{BRAND_SLUG}}", BRAND["slug"])
             .replace("{{TAGLINE}}",  BRAND["tagline"])
             .replace("{{GLOSS}}",    BRAND["gloss"])
             .replace("{{NAVY}}",     BRAND["navy"]))

def logo_mark():
    """The emblem, referenced rather than inlined.

    The mark carries the photographic sun, so it is ~108 KB. Inlining that into
    all nineteen pages would be nine times the weight of the base64 JPEG it
    replaced. As a file it is fetched once and cached across the whole site, and
    <img src> is not subject to the restriction that blocks fetch() on file://,
    so a local copy still shows it with no server.

    Nothing draws this into a canvas — the motion watermark and the print cover
    each carry their own reduced mark as a data URI — so the tainting that would
    otherwise argue for inlining does not apply."""
    return ('<img class="lhmark" src="assets/brand/mark.svg" '
            'width="512" height="512" alt="" decoding="async">')

def head_meta(desc, path, og_title):
    """The shared head block: description, canonical, Open Graph, Twitter card,
    theme colour and an inline SVG favicon. The favicon is a data URI on purpose
    — a referenced icon file would be one network request on every page load, and
    the whole point of this build is that an offline copy makes none."""
    frag = read(SRC, "pages", "_head.frag")
    if APP_MODE:
        cut = re.sub(r'<link rel="canonical"[^>]*>\s*', "", frag, count=1)
        if cut == frag:
            raise SystemExit("app build: the canonical link was not found in _head.frag")
        frag = cut
    return brandify(frag.replace("{{DESC}}", esc_attr(desc))
                        .replace("{{BASE}}", SITE_BASE)
                        .replace("{{PATH}}", path)
                        .replace("{{OGTITLE}}", esc_attr(og_title))).strip()

def esc_attr(s):
    return (s.replace("&", "&amp;").replace('"', "&quot;")
             .replace("<", "&lt;").replace(">", "&gt;"))

def build_stamp(parts):
    """A short fingerprint of what actually went into this build, so the shipped page
    can say which version it is. Content-derived, so an unchanged rebuild keeps its id."""
    import hashlib, datetime
    h = hashlib.sha256("".join(parts).encode("utf-8")).hexdigest()[:7]
    return "%s.%s" % (datetime.date.today().isoformat(), h)

def build_kundli():
    shell = read(SRC, "kundli.shell.html")
    kdesc = json.load(open(os.path.join(SRC, "pages", "_kundli_desc.json"),
                           encoding="utf-8"))["kundli"]
    if "<!--HEAD-->" not in shell:
        raise SystemExit("token <!--HEAD--> missing from the kundli shell")
    shell = shell.replace("<!--HEAD-->",
                          head_meta(kdesc, "kundli.html",
                                    "Build a Vedic birth chart — " + BRAND["name"]))
    # The kundli page's nav came from a hand-written list in its own shell, so
    # adding a page to _nav.json left it behind — which is how now.html ended up
    # reachable from every page except the busiest one. One source now.
    if "{{NAV}}" not in shell:
        raise SystemExit("token {{NAV}} missing from the kundli shell")
    shell = shell.replace("{{NAV}}", nav_html("kundli.html"))
    shell = brandify(shell).replace("<!--LOGO-->", logo_mark())
    parts = [("<!--CSS-->", read(SRC, "css", "app.css") + "\n" +
                            read(SRC, "css", "theme-auto.css") + "\n" +
                            read(SRC, "css", "theme.css") + "\n" +
                            read(SRC, "css", "cosmos.css"), "style"),
             ("<!--THEMEJS-->", read(SRC, "js", "theme.js"), "script"),
             ("<!--JS0-->", read(VEND, "astronomy.browser.min.js"), "script"),
             ("<!--JS1-->", jsread(SRC, "js", "engine.js"), "script"),
             ("<!--JS2-->", report_bundle(), "script"),
             # places.js before ui.js: the form's city search and the motion
             # pane's place picker are the same code now, and the bundle must
             # define it before either uses it.
             ("<!--JS3-->", jsread(SRC, "js", "places.js") + "\n" +
                            jsread(SRC, "js", "ui.js") + "\n" +
                            jsread(SRC, "js", "sp-gocharaui.js") + "\n" +
                            jsread(SRC, "js", "sp-cosmos.js"), "script")]
    stamp = build_stamp([shell] + [b for _, b, _ in parts])
    if "<!--BUILD-->" in shell:
        shell = shell.replace("<!--BUILD-->", stamp)
    # The page already prints the build id for a reader. Put it where the exporters
    # can reach it too, so a downloaded file says which build wrote it and nobody has
    # to grep the repo to find out whether a file is current.
    shell = shell.replace("</head>",
        '<script>window.__kBuild=%s;</script></head>' % json.dumps(stamp))
    for tok, body, tag in parts:
        if tok not in shell:
            raise SystemExit("token %s missing from the shell" % tok)
        # the bundles carry brand tokens too — a few strings the report prints
        shell = shell.replace(tok, "<%s>%s</%s>" % (tag, brandify(body), tag))
    print("  build id %s" % stamp)
    return shell

def build_workstation():
    """The Kinetic Workstation — a second page over the same engines.

    It shares the kundli page's form markup and its ui.js, so a chart cast
    here is cast by exactly the same code, and shares every report module,
    so no panel on it is a second implementation of a panel on the builder.
    The builder itself is untouched: this function reads the same parts and
    writes a different file.
    """
    shell = read(SRC, "kinetic-workstation.shell.html")
    desc = ("One surface for the whole chart: Sripati bhava-chalita beside "
            "whole-sign, a year of real planetary transits for any year, "
            "twelve Chandra-rashi readings, all sixteen divisional charts, "
            "and the strength and dasha panels. Computed in your browser.")
    for tok in ("<!--HEAD-->", "{{NAV}}", "<!--CSS-->", "<!--THEMEJS-->",
                "<!--JS0-->", "<!--JS1-->", "<!--JS2-->", "<!--JS3-->"):
        if tok not in shell:
            raise SystemExit("token %s missing from the workstation shell" % tok)
    shell = shell.replace("<!--HEAD-->",
                          head_meta(desc, "kinetic-workstation.html",
                                    "Kinetic Workstation — " + BRAND["name"]))
    shell = shell.replace("{{NAV}}", nav_html("kinetic-workstation.html"))
    shell = shell.replace("{{FOOTER}}", read(SRC, "pages", "_footer.html"))
    shell = brandify(shell).replace("<!--LOGO-->", logo_mark())
    parts = [("<!--CSS-->", read(SRC, "css", "app.css") + "\n" +
                            read(SRC, "css", "theme-auto.css") + "\n" +
                            read(SRC, "css", "theme.css") + "\n" +
                            read(SRC, "css", "cosmos.css"), "style"),
             ("<!--THEMEJS-->", read(SRC, "js", "theme.js"), "script"),
             ("<!--JS0-->", read(VEND, "astronomy.browser.min.js"), "script"),
             ("<!--JS1-->", jsread(SRC, "js", "engine.js"), "script"),
             ("<!--JS2-->", report_bundle(), "script"),
             ("<!--JS3-->", jsread(SRC, "js", "places.js") + "\n" +
                            jsread(SRC, "js", "ui.js") + "\n" +
                            jsread(SRC, "js", "sp-voice.js") + "\n" +
                            jsread(SRC, "js", "sp-gocharaui.js") + "\n" +
                            jsread(SRC, "js", "sp-cosmos.js") + "\n" +
                            jsread(SRC, "js", "sp-workstation.js"), "script")]
    # Same build id as the other pages: content-derived, and reachable from JS so a
    # downloaded payload records which build produced it.
    stamp = build_stamp([shell] + [b for _, b, _ in parts])
    if "<!--BUILD-->" in shell:
        shell = shell.replace("<!--BUILD-->", stamp)
    shell = shell.replace("</head>",
        '<script>window.__kBuild=%s;</script></head>' % json.dumps(stamp))
    for tok, body, tag in parts:
        shell = shell.replace(tok, "<%s>%s</%s>" % (tag, brandify(body), tag))
    return shell


def build_pwa(built):
    """The manifest and the service worker.

    Both are generated rather than kept as files, for one reason: the service
    worker's cache name has to carry a fingerprint of everything else in the
    build. A new build then writes a new cache and deletes the old one on
    activate, so bytes from a previous build cannot be served by this one even in
    principle. Hand-maintaining that version string is how a site ends up stuck
    on an old build — which has happened to this one, in iOS Safari, for days.

    The stamp covers every other built file, so it is computed here, after they
    exist, rather than from the kundli shell alone."""
    stamp = build_stamp([t for n, t in sorted(built.items())])
    sw = jsread(SRC, "js", "sw.js").replace("{{STAMP}}", stamp)
    if "{{STAMP}}" in sw or stamp not in sw:
        raise SystemExit("the service worker did not take the build stamp")
    manifest = {
        "name": BRAND["name"] + " — " + BRAND["tagline"],
        "short_name": BRAND["name"],
        "description": BRAND["tagline"] +
                       ", computed in your own browser. Nothing is sent anywhere.",
        "start_url": "./index.html",
        "scope": "./",
        "display": "standalone",
        # window-controls-overlay lets an installed desktop window put its
        # own chrome in the title bar strip instead of leaving a dead band
        # above the app — it is what makes an installed PWA stop looking
        # like a browser with the address bar hidden. Browsers that do not
        # support it fall through to standalone.
        "display_override": ["window-controls-overlay", "standalone"],
        "background_color": "#fbfaf7",
        "theme_color": BRAND["navy"],
        "icons": [
            {"src": "assets/brand/favicon.svg", "sizes": "any", "type": "image/svg+xml"},
            {"src": "assets/brand/icon-192.png", "sizes": "192x192", "type": "image/png"},
            {"src": "assets/brand/icon-512.png", "sizes": "512x512", "type": "image/png"},
            {"src": "assets/brand/icon-512.png", "sizes": "512x512", "type": "image/png",
             "purpose": "maskable"}
        ],
        "shortcuts": [
            {"name": "Kinetic Workstation", "url": "./kinetic-workstation.html"},
            {"name": "Build a chart", "url": "./kundli.html"},
            {"name": "Hindu time now", "url": "./now.html"}
        ],
        # the categories an app store or launcher files it under
        "categories": ["education", "reference", "utilities"],
        "lang": "en",
        "dir": "ltr"
    }
    return {"sw.js": sw,
            "manifest.webmanifest": json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"}


def nav_html(href):
    """The site nav, with `href` marked current. One source for every page.

    Built in three places before this existed, which is how now.html came to be
    reachable from every page except the chart page — the busiest one. A page
    gains a nav entry on one edit to _nav.json and no other."""
    src = "_nav-app.json" if APP_MODE else "_nav.json"
    nav = json.load(open(os.path.join(SRC, "pages", src), encoding="utf-8"))
    return "".join('<a href="%s"%s>%s</a>' %
                   (h, ' class="active"' if h == href else "", label)
                   for h, label in nav)


def build_adopted():
    """The four pages that were written as standalone documents.

    dashboard.html, the two 108-pāda references and the technical report each
    carry their own styles and their own masthead, and were never part of this
    build. Two consequences, both found by measurement rather than by reading:

      * None of them had any site navigation at all. 108-nakshatra-padas.html is
        the last entry in _nav.json, so it is reachable from every page on the
        site — and once a reader arrived there, there was no link out of it. Four
        pages, no way back.

      * Their scripts — a megabyte of inline JavaScript on the dashboard alone —
        were never parse-checked, because the build had never seen these files.

    They are adopted rather than rewritten. Converting them onto the _shell.html
    pipeline would mean reflowing four large hand-built documents to gain a
    header they already have; injecting a self-contained strip after <body> gains
    the navigation and costs nothing else. They keep their own styling, keep
    working as single files, and now come under the parse gate and --check."""
    chrome = read(SRC, "adopted", "_chrome.html")
    out = {}
    for name in sorted(os.listdir(os.path.join(SRC, "adopted"))):
        if name.startswith("_") or not name.endswith(".html"):
            continue
        text = read(SRC, "adopted", name)
        strip = chrome.replace("{{NAV}}", nav_html(name))
        # Find the opening <body> tag by searching AFTER </head>, not from the
        # start of the file. The dashboard inlines Apache ECharts, whose minified
        # source contains the literal string "<body" — so searching from the top
        # found that one and spliced a nav strip into the middle of a megabyte of
        # JavaScript. It produced a page that still looked plausible in the build
        # log, and only the parse gate noticed. Hence also the assertion: the real
        # <body> follows </head> closely, and anything else means this heuristic
        # has met a document it does not understand and should stop rather than
        # guess.
        h = text.find("</head>")
        if h < 0:
            raise SystemExit("adopted page %s has no </head>" % name)
        # These pages carried no icon and no manifest, so they showed a blank tab
        # and sat outside the installed app. Three lines, shared from here so they
        # cannot drift from what the built pages declare.
        if "rel=\"manifest\"" not in text:
            text = (text[:h] +
                    '<link rel="icon" href="favicon.ico" sizes="any">\n'
                    '<link rel="apple-touch-icon" href="assets/brand/icon-180.png">\n'
                    '<link rel="manifest" href="manifest.webmanifest">\n' +
                    text[h:])
            h = text.find("</head>")
        m = re.compile(r"<body\b[^>]*>").search(text, h)
        if not m:
            raise SystemExit("adopted page %s has no <body> after </head>" % name)
        if m.start() - (h + 7) > 200:
            raise SystemExit("adopted page %s: <body> is %d chars after </head>, "
                             "which is too far to trust" % (name, m.start() - h - 7))
        i = m.end()
        out[name] = brandify(text[:i] + "\n" + strip + text[i:])
    return out


def app_sitejs(js):
    """Take the service-worker registration out of the app build.

    A service worker inside a packaged application caches files that are already
    on disk, and then serves a previous build's copy of them. That is the exact
    staleness this project has already lost days to, so the app does not get one
    rather than getting one that is merely configured carefully."""
    if not APP_MODE:
        return js
    mark = 'navigator.serviceWorker.register("sw.js")'
    if mark not in js:
        raise SystemExit("app build: the service-worker registration was not found in site.js")
    return js.replace(mark, "(window.__noSW||function(){return{catch:function(){}}})()")


def appify(text):
    """The two references every app page gains, and nothing else.

    A separate stylesheet and script rather than more inlining: the site already
    ships site.js and engine.js this way, <link> and <script src> both work from
    file://, and keeping them separate means one copy across twenty-eight pages
    instead of twenty-eight. The stylesheet goes last in the head so it wins on
    equal specificity without !important; the script goes last in the body so it
    runs after site.js, which `defer` orders by document position.

    Both insertions are anchored rather than taken on first match. dashboard.html
    carries the literal "</body>" inside a minified vendor blob, so a naive
    replace put a script tag in the middle of somebody's JavaScript — caught by
    the build's own syntax check. The real </head> is the one followed by <body>,
    and the real </body> is always the last."""
    # `app` on <html> is what gives every rule in app-shell.css a class more
    # specificity than the site's own. It matters: cosmos.css already carries a
    # `body.wsapp` block — the installed-PWA windowing from earlier work, which
    # is a partial version of this same idea — and without the prefix those
    # rules win on the Workstation and the grid never takes.
    if not re.search(r"<html\b", text):
        raise SystemExit("app build: a page has no <html> tag")
    text = re.sub(r"<html\b([^>]*)>",
                  lambda mm: '<html class="app"' + mm.group(1) + '>'
                  if 'class=' not in mm.group(1)
                  else re.sub(r'class="', 'class="app ', mm.group(0), count=1),
                  text, count=1)

    # The adopted pages do not go through head_meta, so their canonical link is
    # still in place at this point. An app window has no address.
    text = re.sub(r'<link rel="canonical"[^>]*>\s*', "", text)

    # "Copy link" builds a shareable URL from location.href, which inside a
    # window is a tauri:// address that means nothing to anybody else. Point it
    # at the website instead: the site stays up, so the link keeps working and
    # the recipient needs no app. This is the one capability the app genuinely
    # loses, and this is the whole of the fix.
    old_href = 'location.href.split("#")[0]'
    if old_href in text:
        n = text.count(old_href)
        if n != 1:
            raise SystemExit("app build: expected one share-link base, found %d" % n)
        text = text.replace(old_href, json.dumps(SITE_BASE.rstrip("/") + "/") +
                            '+location.pathname.split("/").pop()')

    # One build id for the whole app, replacing the per-page ones the website
    # uses. "Is my app current?" is a question about the app, not about a page.
    # Done BEFORE the insertion point is located: removing text first and then
    # splicing at an index found earlier puts the insert in the wrong place, and
    # it only shows on the two pages that carry a per-page id.
    text = re.sub(r'<script>window\.__kBuild=[^<]*</script>', "", text)
    m = re.search(r"</head>\s*<body", text)
    if not m:
        raise SystemExit("app build: no </head> followed by <body> in a page")
    stamp = '<script>window.__kBuild=%s;</script>' % json.dumps(APP_BUILD)
    text = text[:m.start()] + stamp + '<link rel="stylesheet" href="app-shell.css">' + text[m.start():]
    if "</body>" not in text:
        raise SystemExit("app build: a page has no </body>")
    head, tail = text.rsplit("</body>", 1)
    return head + '<script src="app-shell.js" defer></script></body>' + tail


def build_shared():
    """Files the reference pages reference rather than inline.

    engine.js is the ephemeris and the chart engine — about 200 KB, and far too
    much to paste into thirteen pages. It is fetched only when a reader actually
    has a chart stored, so a first visit never pays for it. site.js is small and
    always loaded: navigation, section links, and the hook that decides whether
    the engine is needed at all.

    Both are referenced, not inlined, which works offline: <script src> is not
    subject to the restriction that blocks fetch() on file://."""
    return {
        "engine.js": (read(VEND, "astronomy.browser.min.js") + "\n" +
                      brandify(jsread(SRC, "js", "engine.js"))),
        "site.js":   brandify(app_sitejs(jsread(SRC, "js", "site.js"))),
        # now.html's own script. Referenced rather than inlined for the same reason
        # site.js is: it is wanted on one page and the rest should not carry it.
        "now.js":    brandify(jsread(SRC, "js", "now.js")),
        # The shared day object: now.html and calendar.html are two views of it.
        # Written once because two implementations of "which day is this" would
        # eventually disagree, and for a calendar that is the only thing that
        # matters. festivals.js extends the same window.NP, so they ship as one
        # file and a page cannot load half of the pair.
        "calendar.js": brandify(jsread(SRC, "js", "calendar.js")),
        # The city list, loading and search, shared so the calendar does not grow
        # a second copy of "which city is this and what is its offset". Lazy: the
        # 3 MB of rows are fetched only when somebody actually searches.
        "places.js": brandify(jsread(SRC, "js", "places.js")),
        # studio.html's own script: what is worth posting today, the caption and
        # the image. Loaded only on that page, like now.js and calendar.js.
        "studio.js": brandify(jsread(SRC, "js", "brand-mark.js") + "\n" +
                              jsread(SRC, "js", "studio.js")),
        # The reel strip and the card composer. A separate file from studio.js
        # because it is a separate concern and because the Studio's own card
        # keeps working if this one fails to load; it rides on that page because
        # the date, the place, the language and the ratio are already there, and
        # three copies of those controls would be three things to keep in step.
        # sp-glow rides along for the watercolour wash the paper themes
        # share with the reels, so a card and a reel posted together look
        # like one hand made them.
        "cards.js": brandify(jsread(SRC, "js", "brand-mark.js") + "\n" +
                             jsread(SRC, "js", "sp-glow.js") + "\n" +
                             jsread(SRC, "js", "cards.js")),
        # Studio Pro ships as one file built from six: the node registry, the
        # almanac leaf, the composers that draw from shapes, the Director layer
        # model, its panel, and the page wiring. Six files because they are six
        # concerns; one asset because a page that loaded half of them would be
        # a page with a command wall and nothing behind it.
        #
        # ORDER MATTERS, in one direction only. Each file is its own IIFE and
        # they find each other through window, so load order does not affect
        # definition — but sp-ui's bind() mounts the Director panel, so the
        # panel must have published window.SPDirUI by then, and it is simpler
        # to read the file in the order the dependencies run than to rely on
        # that being true.
        "studio-pro.js": brandify(jsread(SRC, "js", "ss-engine.js") + "\n" +
                                  jsread(SRC, "js", "sp-nodes.js") + "\n" +
                                  jsread(SRC, "js", "sp-almanac.js") + "\n" +
                                  jsread(SRC, "js", "sp-compose.js") + "\n" +
                                  jsread(SRC, "js", "sp-cycles.js") + "\n" +
                                  jsread(SRC, "js", "ss-nodes.js") + "\n" +
                                  jsread(SRC, "js", "sp-intent.js") + "\n" +
                                  jsread(SRC, "js", "sp-intentui.js") + "\n" +
                                  jsread(SRC, "js", "sp-director.js") + "\n" +
                                  jsread(SRC, "js", "sp-dirui.js") + "\n" +
                                  jsread(SRC, "js", "sp-ui.js")),
        # Director Pro is a keyframe workstation built on Studio Pro's parts:
        # it borrows the node registry, the almanac leaf and all fifteen
        # composers rather than carrying a second set of pictures free to
        # disagree with the first. dp-* is its own — the document, the
        # renderer, the export and the page — and sp-director rides along
        # because the text tokens live there and a second copy of {tithi} that
        # resolved differently would be exactly the bug this avoids.
        "director-pro.js": brandify(jsread(SRC, "js", "ss-engine.js") + "\n" +
                                    jsread(SRC, "js", "sp-nodes.js") + "\n" +
                                    jsread(SRC, "js", "sp-almanac.js") + "\n" +
                                    jsread(SRC, "js", "sp-compose.js") + "\n" +
                                    jsread(SRC, "js", "sp-cycles.js") + "\n" +
                                    jsread(SRC, "js", "ss-nodes.js") + "\n" +
                                    jsread(SRC, "js", "sp-intent.js") + "\n" +
                                    jsread(SRC, "js", "sp-intentui.js") + "\n" +
                                    jsread(SRC, "js", "sp-director.js") + "\n" +
                                    jsread(SRC, "js", "dp-model.js") + "\n" +
                                    jsread(SRC, "js", "dp-render.js") + "\n" +
                                    jsread(SRC, "js", "dp-export.js") + "\n" +
                                    jsread(SRC, "js", "dp-ui.js")),
        # The Sūrya Siddhānta page carries the engine and its own view. The
        # engine is also inside the two studio bundles, because the nodes it
        # publishes live there — one implementation, three places it is read.
        "siddhanta.js": brandify(jsread(SRC, "js", "ss-engine.js") + "\n" +
                                 jsread(SRC, "js", "ss-page.js")),
        # The simulator: a gravitational integrator, the scenario library,
        # the renderer and the page. It needs engine.js beside it for the
        # state vectors the runs start from — the initial conditions are the
        # real sky, not a tidy circular orbit.
        # The Reel Studio: the light pipeline, the reel grammar, the
        # stories that drive it, and the page. It rides on sp-nodes and
        # sp-cycles for the generic cycle template, and on engine.js for
        # every position it plots.
        # The Reel Studio carries FOUR engines, because the point of the
        # second three is that only a site which has them can make those
        # reels: the Surya Siddhanta's own method, the n-body integrator, and
        # the cycle registry, alongside the modern ephemeris in engine.js.
        "reel.js": brandify(jsread(SRC, "js", "brand-mark.js") + "\n" +
                            jsread(SRC, "js", "sp-glow.js") + "\n" +
                            # the procedural grahas: every surface generated
                            # and lit from where the Sun actually is. The
                            # reels drew glowing dots before this, which was
                            # both worse and a waste of the best thing here.
                            jsread(SRC, "js", "report", "motion",
                                 "54-motion-bodies.js") + "\n" +
                            jsread(SRC, "js", "sp-bodies.js") + "\n" +
                            jsread(SRC, "js", "sp-reel.js") + "\n" +
                            jsread(SRC, "js", "ss-engine.js") + "\n" +
                            jsread(SRC, "js", "sp-nodes.js") + "\n" +
                            jsread(SRC, "js", "sp-cycles.js") + "\n" +
                            jsread(SRC, "js", "sim-engine.js") + "\n" +
                            jsread(SRC, "js", "sim-scenarios.js") + "\n" +
                            jsread(SRC, "js", "sp-stories.js") + "\n" +
                            jsread(SRC, "js", "sp-stories-engines.js") + "\n" +
                            # the pancanga and the festival RULES, so the
                            # festival reels search for the day that satisfies
                            # the rule rather than carrying a table of dates
                            jsread(SRC, "js", "panchanga.js") + "\n" +
                            jsread(SRC, "js", "festivals.js") + "\n" +
                            jsread(SRC, "js", "sp-festivals.js") + "\n" +
                            # 1347 real stars along the ecliptic, so a
                            # nakshatra drawn out flat is a piece of sky
                            # rather than a diagram with one dot on it
                            jsread(SRC, "js", "eclip-stars.js") + "\n" +
                            # the voiceover script and the caption, in three
                            # languages, rendered from the numbers the reel
                            # actually computed
                            jsread(SRC, "js", "sp-script.js") + "\n" +
                            # the exporter: WebCodecs with explicit frame
                            # timestamps, so a file's duration is a property
                            # of the reel rather than of the machine
                            jsread(SRC, "js", "vendor", "mp4-muxer.js") + "\n" +
                            jsread(SRC, "js", "vendor", "webm-muxer.js") + "\n" +
                            jsread(SRC, "js", "sp-encode.js") + "\n" +
                            jsread(SRC, "js", "sp-voice.js") + "\n" +
                            # the chart-independent teaching sets: bhavas,
                            # concepts, nakshatras, rashis. They register as
                            # stories, so the Studio, the recorder and the
                            # export path are the ones every reel uses.
                            jsread(SRC, "js", "sp-explain.js") + "\n" +
                            jsread(SRC, "js", "sp-reelui.js") + "\n" +
                            jsread(SRC, "js", "sp-scriptui.js")),
        "simulation.js": brandify(jsread(SRC, "js", "sim-engine.js") + "\n" +
                                  jsread(SRC, "js", "sim-scenarios.js") + "\n" +
                                  jsread(SRC, "js", "sim-draw.js") + "\n" +
                                  jsread(SRC, "js", "sim-ui.js")),
        "panchanga.js": brandify(jsread(SRC, "js", "panchanga.js") + "\n" +
                                 jsread(SRC, "js", "festivals.js")),
        # cities.js is cities.json with sixteen characters in front of it. The chart
        # page fetches the .json; on file:// fetch is blocked, so it falls back to
        # loading the .js, which is the same data as a script assignment. That made
        # it a derived file maintained by hand: update the .json, forget the .js, and
        # the offline path silently serves stale cities with nothing to notice. So
        # the build derives it. cities.json stays at the repo root as the one copy of
        # the data — it is served directly, and duplicating three megabytes into
        # source/ to satisfy a convention would be a worse trade than reading it
        # from where it is served.
        "cities.js": "window.__CITIES=" + read(SITE, "cities.json").strip() + ";\n",
    }

def build_pages():
    shell  = read(SRC, "pages", "_shell.html")
    # the theme layer comes after the page stylesheet so its overrides win
    # without !important, and the picker's script is inlined into the head
    # rather than deferred: a theme applied after first paint is a white
    # flash on every navigation, which on a dark palette is the brightest
    # thing on the page.
    # order matters: the generated overrides come first so the hand-written
    # ones in theme.css, which have the same specificity, win where the two
    # name the same selector.
    css    = (read(SRC, "css", "pages.css") + "\n" +
              read(SRC, "css", "theme-auto.css") + "\n" +
              read(SRC, "css", "theme.css"))
    themejs = read(SRC, "js", "theme.js")
    footer = read(SRC, "pages", "_footer.html")
    meta   = json.load(open(os.path.join(SRC, "pages", "_meta.json"), encoding="utf-8"))
    out = {}
    for name, m in meta.items():
        href = "index.html" if name == "index" else name + ".html"
        body = read(SRC, "pages", name + ".html")
        aside = ""
        if m["has_aside"]:
            secs = re.findall(r'<h2 id="([^"]+)">(.*?)</h2>', body, re.S)
            if len(secs) > 1:
                aside = ('<aside class="onpage"><b>On this page</b>' +
                         "".join('<a href="#%s">%s</a>' % (i, re.sub(r"<[^>]+>", "", t))
                                 for i, t in secs) + "</aside>")
        out[href] = brandify(
                     shell.replace("{{CSS}}", css).replace("{{THEMEJS}}", themejs)
                          .replace("{{TITLE}}", brandify(m["title"]))
                          .replace("{{HEAD}}", head_meta(m["desc"], href, brandify(m["title"])))
                          .replace("{{H1}}", m["h1"]).replace("{{SUB}}", m["sub"])
                          .replace("{{NAV}}", nav_html(href))
                          .replace("{{LAYOUT}}", (" " + m["layout"]).rstrip())
                          .replace("{{ASIDE}}", aside).replace("{{MAIN}}", brandify(body))
                          .replace("{{FOOTER}}", footer)
                          .replace("<!--LOGO-->", logo_mark()))
    return out

def window_export_check(built):
    """No two files may export the same window.__name.

    The bundles are concatenated into one scope, so a second
    `window.__x = ...` silently replaces the first. Nothing throws: callers of
    the shape that survived keep working and callers of the other get undefined
    back from fields that look like they should be there. That is how a panel
    reported `span=undefined` while the span it was actually using was correct.

    Checked on the BUILT files rather than the sources, because the fault only
    exists once they are concatenated, and because a name may legitimately
    appear in two bundles that never load together.
    """
    bad = []
    for name, text in built.items():
        if not (name.endswith(".html") or name.endswith(".js")):
            continue
        seen = {}
        # Only TOP-LEVEL assignments of a FUNCTION. `window.__kplace = p.n`
        # inside a click handler is data being written, not an export being
        # defined, and a page may legitimately write it from several places;
        # flagging those would bury the real fault in noise. An export is
        # written unindented, at the top level of a concatenated file, and its
        # right-hand side is a function.
        for m in re.finditer(
                r"(?m)^window\.(__[A-Za-z_$][\w$]*)\s*=\s*(?:function\b|\(|[A-Za-z_$][\w$]*\s*;)",
                text):
            seen[m.group(1)] = seen.get(m.group(1), 0) + 1
        for k, n in sorted(seen.items()):
            if n > 1:
                bad.append("%s: window.%s exported %d times" % (name, k, n))
    if bad:
        raise SystemExit("the same window export defined twice in one scope "
                         "(the later one silently wins):\n  " +
                         "\n  ".join(bad))
    print("  checked  no window.__export is assigned twice in one bundle")


def lang_key_check(src_dir):
    """Every moT()/moP() key must exist in the table its accessor reads.

    moT reads MO_STR.ui and moP reads MO_PHR; both fall back to RETURNING THE KEY
    when they miss. So a key filed in the wrong table does not throw, does not
    warn, and simply prints its own name on screen — which is how the sky panel
    came to label its place control "pickPlace" for every reader, in both
    languages, for as long as that control existed.

    A miss is indistinguishable from a working string at runtime, so the build
    has to be what notices."""
    lang = read(src_dir, "js", "report", "motion", "49-motion-lang.js")

    def block(pat):
        m = re.search(pat, lang)
        if not m:
            return ""
        buf = lang[m.end():]
        d, j = 1, 0
        while j < len(buf) and d > 0:
            if buf[j] == "{":
                d += 1
            elif buf[j] == "}":
                d -= 1
            j += 1
        return buf[:j]

    def keys(body):
        return set(re.findall(r"(?m)^\s*([A-Za-z_$][\w$]*)\s*:", body))

    ui = keys(block(r"\nui:\{"))
    # The phrase tables are DISCOVERED, not listed. A hardcoded list of
    # MO_PHR..MO_PHR6 meant that adding MO_PHR7 made every one of its keys look
    # missing — the guard reporting a fault in the thing that had just been
    # done correctly, which is worse than no guard because it trains you to
    # ignore it.
    phr = set()
    for name in sorted(set(re.findall(r"var\s+(MO_PHR\w*)\s*=\s*\{", lang))):
        phr |= keys(block(r"var %s\s*=\s*\{" % re.escape(name)))
    if not ui or not phr:
        raise SystemExit("the language tables could not be read for checking")

    bad = []
    d = os.path.join(src_dir, "js", "report", "motion")
    for name in sorted(os.listdir(d)):
        if not name.endswith(".js"):
            continue
        body = read(d, name)
        for m in re.finditer(r'\bmoT\(\s*"([^"]+)"', body):
            if m.group(1) not in ui:
                bad.append("moT(\"%s\") in %s — %s" % (
                    m.group(1), name,
                    "that key is in MO_PHR; use moP" if m.group(1) in phr
                    else "that key is in neither table"))
        for m in re.finditer(r'\bmoP\(\s*"([^"]+)"', body):
            if m.group(1) not in phr:
                bad.append("moP(\"%s\") in %s — %s" % (
                    m.group(1), name,
                    "that key is in MO_STR.ui; use moT" if m.group(1) in ui
                    else "that key is in neither table"))
    if bad:
        for b in bad:
            print("  LANGKEY  " + b)
        raise SystemExit("%d language key(s) resolve to nothing" % len(bad))
    print("  checked  %d ui + %d phrase keys, every moT/moP call resolves" %
          (len(ui), len(phr)))


def syntax_check(built):
    """Parse every emitted script, and every script inlined into a page.

    The build concatenates text; it has never read it. A stray `*/` inside a
    comment block closes it early and turns the remaining prose into code, which
    is a syntax error in a 200 KB file that the build reported as a clean write.
    That happened, and `--check` could not see it either: the output was
    byte-identical to the previous broken output.

    So: hand each script to node for a parse-only pass. node is a build-machine
    dependency, not a site dependency — if it is absent the build says so and
    carries on rather than refusing, because the site itself needs no toolchain.
    """
    node = shutil.which("node")
    if not node:
        print("  (node not found — scripts not parse-checked)")
        return True
    jobs = []
    for name, text in sorted(built.items()):
        if name.endswith(".js"):
            jobs.append((name, text))
        else:
            # the pages inline their script; pull each block out and check it as
            # its own unit, which is also how the browser will parse it
            for i, m in enumerate(re.finditer(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>",
                                              text, re.S)):
                body = m.group(1)
                if body.strip():
                    jobs.append(("%s <script #%d>" % (name, i + 1), body))
    bad = []
    for label, body in jobs:
        with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False,
                                         encoding="utf-8") as f:
            f.write(body); path = f.name
        try:
            p = subprocess.run([node, "--check", path], capture_output=True, text=True)
            if p.returncode:
                err = [l for l in p.stderr.splitlines() if l.strip()]
                bad.append((label, err[:4]))
        finally:
            os.unlink(path)
    if bad:
        for label, err in bad:
            print("  SYNTAX   %s" % label)
            for line in err:
                print("      " + line[:160])
        raise SystemExit("%d script(s) do not parse" % len(bad))
    print("  parsed   %d script(s), no syntax errors" % len(jobs))
    return True


# What the deployed site serves but this script does not generate. On the web
# these sit in the repository beside the built pages and GitHub Pages serves
# them; an app folder has no repository behind it, so they have to be carried in.
# Named explicitly rather than inferred: a file that stops being needed should
# have to be removed deliberately, and a file that starts being needed shows up
# as a harness failure rather than as a city search that silently returns nothing.
APP_STATIC = ["cities.json", "favicon.ico", "assets"]


def copy_static(outdir):
    repo = os.path.dirname(ROOT) if os.path.basename(ROOT) == "source" else ROOT
    for name in APP_STATIC:
        src = os.path.join(repo, name)
        dst = os.path.join(outdir, name)
        if not os.path.exists(src):
            raise SystemExit("app build: %s is missing from the repository" % name)
        if os.path.isdir(src):
            if os.path.isdir(dst):
                shutil.rmtree(dst)
            shutil.copytree(src, dst)
        else:
            shutil.copy2(src, dst)
    print("  carried %d static paths" % len(APP_STATIC))


def main():
    global APP_MODE
    args = sys.argv[1:]
    APP_MODE = "--app" in args
    # Default to the repository root — the folder holding this script — so a clone
    # builds straight into the files GitHub Pages serves. Override with --out.
    default_out = os.path.dirname(ROOT) if os.path.basename(ROOT) == "source" else ROOT
    if APP_MODE:
        default_out = os.path.join(default_out, "app")
    outdir = args[args.index("--out") + 1] if "--out" in args else default_out
    built = {"kundli.html": build_kundli(),
             "kinetic-workstation.html": build_workstation()}
    built.update(build_pages())
    built.update(build_shared())
    built.update(build_adopted())
    # last, because its cache key is a fingerprint of everything above it
    built.update(build_pwa(built))
    if APP_MODE:
        global APP_BUILD
        # No service worker ships: see app_sitejs. The manifest stays, because
        # _head.frag links it and a packaged app should not 404 on its own head.
        built.pop("sw.js", None)
        built["app-shell.css"] = read(SRC, "css", "app-shell.css")
        built["app-shell.js"] = brandify(jsread(SRC, "js", "app-shell.js"))
        # Computed over everything before the stamp is written in, so it is a
        # fingerprint of the build rather than of itself.
        APP_BUILD = build_stamp([t for _, t in sorted(built.items())])
        for k in list(built):
            if k.endswith(".html"):
                built[k] = appify(built[k])
        print("  app build id %s" % APP_BUILD)
    lang_key_check(SRC)
    syntax_check(built)
    window_export_check(built)

    if "--check" in args:
        ok = True
        for name, text in sorted(built.items()):
            cur = os.path.join(outdir, name)
            if not os.path.exists(cur):
                print("  NEW      %s" % name); ok = False; continue
            old = read(cur)
            if old == text:
                print("  same     %-26s %7.1f KB" % (name, len(text)/1024))
            else:
                ok = False
                d = list(difflib.unified_diff(old.splitlines(), text.splitlines(), lineterm="", n=0))
                print("  DIFFERS  %-26s  %d diff lines" % (name, len(d)))
                for line in d[:6]:
                    print("      " + line[:150])
        print("\n%s" % ("identical to the current output" if ok else "OUTPUT CHANGED"))
        return 0 if ok else 1

    os.makedirs(outdir, exist_ok=True)
    if APP_MODE:
        copy_static(outdir)
    for name, text in sorted(built.items()):
        with open(os.path.join(outdir, name), "w", encoding="utf-8") as f:
            f.write(text)
        print("  wrote %-26s %7.1f KB" % (name, len(text)/1024))
    print("\n%d files built" % len(built))
    return 0

if __name__ == "__main__":
    sys.exit(main())
