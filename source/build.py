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

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC  = os.path.join(ROOT, "src")
VEND = os.path.join(ROOT, "vendor")

def read(*p):
    with open(os.path.join(*p), encoding="utf-8") as f:
        return f.read()

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
    nav = json.load(open(os.path.join(SRC, "pages", "_nav.json"), encoding="utf-8"))
    navhtml = "".join('<a href="%s"%s>%s</a>' %
                      (h, ' class="active"' if h == "kundli.html" else "", label)
                      for h, label in nav)
    if "{{NAV}}" not in shell:
        raise SystemExit("token {{NAV}} missing from the kundli shell")
    shell = shell.replace("{{NAV}}", navhtml)
    shell = brandify(shell).replace("<!--LOGO-->", logo_mark())
    parts = [("<!--CSS-->", read(SRC, "css", "app.css"), "style"),
             ("<!--JS0-->", read(VEND, "astronomy.browser.min.js"), "script"),
             ("<!--JS1-->", read(SRC, "js", "engine.js"), "script"),
             ("<!--JS2-->", report_bundle(), "script"),
             ("<!--JS3-->", read(SRC, "js", "ui.js"), "script")]
    stamp = build_stamp([shell] + [b for _, b, _ in parts])
    if "<!--BUILD-->" in shell:
        shell = shell.replace("<!--BUILD-->", stamp)
    for tok, body, tag in parts:
        if tok not in shell:
            raise SystemExit("token %s missing from the shell" % tok)
        # the bundles carry brand tokens too — a few strings the report prints
        shell = shell.replace(tok, "<%s>%s</%s>" % (tag, brandify(body), tag))
    print("  build id %s" % stamp)
    return shell

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
                      brandify(read(SRC, "js", "engine.js"))),
        "site.js":   brandify(read(SRC, "js", "site.js")),
        # now.html's own script. Referenced rather than inlined for the same reason
        # site.js is: it is wanted on one page and the rest should not carry it.
        "now.js":    brandify(read(SRC, "js", "now.js")),
    }

def build_pages():
    shell  = read(SRC, "pages", "_shell.html")
    css    = read(SRC, "css", "pages.css")
    footer = read(SRC, "pages", "_footer.html")
    meta   = json.load(open(os.path.join(SRC, "pages", "_meta.json"), encoding="utf-8"))
    nav    = json.load(open(os.path.join(SRC, "pages", "_nav.json"), encoding="utf-8"))
    out = {}
    for name, m in meta.items():
        href = "index.html" if name == "index" else name + ".html"
        navhtml = "".join('<a href="%s"%s>%s</a>' %
                          (h, ' class="active"' if h == href else "", label) for h, label in nav)
        body = read(SRC, "pages", name + ".html")
        aside = ""
        if m["has_aside"]:
            secs = re.findall(r'<h2 id="([^"]+)">(.*?)</h2>', body, re.S)
            if len(secs) > 1:
                aside = ('<aside class="onpage"><b>On this page</b>' +
                         "".join('<a href="#%s">%s</a>' % (i, re.sub(r"<[^>]+>", "", t))
                                 for i, t in secs) + "</aside>")
        out[href] = brandify(
                     shell.replace("{{CSS}}", css).replace("{{TITLE}}", brandify(m["title"]))
                          .replace("{{HEAD}}", head_meta(m["desc"], href, brandify(m["title"])))
                          .replace("{{H1}}", m["h1"]).replace("{{SUB}}", m["sub"])
                          .replace("{{NAV}}", navhtml)
                          .replace("{{LAYOUT}}", (" " + m["layout"]).rstrip())
                          .replace("{{ASIDE}}", aside).replace("{{MAIN}}", brandify(body))
                          .replace("{{FOOTER}}", footer)
                          .replace("<!--LOGO-->", logo_mark()))
    return out

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


def main():
    args = sys.argv[1:]
    # Default to the repository root — the folder holding this script — so a clone
    # builds straight into the files GitHub Pages serves. Override with --out.
    default_out = os.path.dirname(ROOT) if os.path.basename(ROOT) == "source" else ROOT
    outdir = args[args.index("--out") + 1] if "--out" in args else default_out
    built = {"kundli.html": build_kundli()}
    built.update(build_pages())
    built.update(build_shared())
    syntax_check(built)

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
    for name, text in sorted(built.items()):
        with open(os.path.join(outdir, name), "w", encoding="utf-8") as f:
            f.write(text)
        print("  wrote %-26s %7.1f KB" % (name, len(text)/1024))
    print("\n%d files built" % len(built))
    return 0

if __name__ == "__main__":
    sys.exit(main())
