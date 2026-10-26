#!/usr/bin/env python3
"""Generate the theme override layer from the stylesheets themselves.

WHY THIS IS GENERATED AND NOT WRITTEN BY HAND. The two stylesheets paint
hundreds of surfaces with literal colours: a white card, a near-black strip,
a pale yellow callout. Under a dark palette every white card is a lamp with
white text on it, and under the light palette every near-black strip has dark
text on it. Hand-listing those selectors means reading six hundred and sixty
colour declarations and getting none of them wrong, and then doing it again
whenever a rule is added. The contrast harness found eighty-five of them in
one run; it would find the eighty-sixth the day someone adds a panel.

So the list is derived. Every rule that paints an opaque background with a
literal colour is classified by that colour's luminance and emitted as an
override that points at the matching token instead. The output is checked in
and read by the build, so a build is still a pure function of the repo and
the diff is reviewable.

WHAT IS DELIBERATELY LEFT ALONE.
  * Anything already written in var(--token) form: it follows the theme by
    construction and overriding it would be a no-op at best.
  * Semi-transparent fills (alpha below 0.85): a wash over whatever is
    beneath it already adapts, and replacing it with an opaque surface would
    flatten a deliberate effect.
  * Gradients and images: the hand-written layer in theme.css deals with the
    few that matter, because which layer of a stack is the surface is a
    judgement a script should not make.
  * Rules whose selector mentions a theme or a print context: those are the
    override machinery itself.
"""

import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(os.path.dirname(HERE), "src")
CSS = os.path.join(SRC, "css")

# A colour is "light" above this relative luminance and "dark" below the
# other: the gap in the middle is left alone, because a mid-tone surface is
# usually a deliberate accent rather than a page surface, and guessing at it
# is how a generator makes a site worse.
LIGHT = 0.62
DARK = 0.24


def lum(r, g, b):
    def ch(v):
        v /= 255.0
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)


def parse_colour(txt):
    """The first opaque literal colour in a declaration value, or None."""
    m = re.search(r"#([0-9a-fA-F]{3,8})\b", txt)
    if m:
        h = m.group(1)
        if len(h) == 3:
            h = h[0] * 2 + h[1] * 2 + h[2] * 2
        if len(h) == 8 and int(h[6:8], 16) < 217:
            return None                      # #rrggbbaa, mostly transparent
        if len(h) >= 6:
            return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))
        return None
    m = re.search(r"rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)"
                  r"(?:\s*,\s*([\d.]+))?\s*\)", txt)
    if m:
        if m.group(4) is not None and float(m.group(4)) < 0.85:
            return None
        return (int(float(m.group(1))), int(float(m.group(2))),
                int(float(m.group(3))))
    if re.search(r"\bwhite\b", txt):
        return (255, 255, 255)
    if re.search(r"\bblack\b", txt):
        return (0, 0, 0)
    return None


def strip_comments(css):
    """Remove /* ... */ comments.

    Not optional: these stylesheets are heavily commented, and a comment
    sitting between two rules becomes part of the next rule's selector if
    it is left in. The first run of this generator emitted selectors like
    `html[data-theme] /* ===== Say what you want ===== */ .sipanel`, which
    match nothing, so a hundred and forty surfaces silently went unfixed
    while the file looked full. The contrast harness is what noticed.
    """
    return re.sub(r"/\*.*?\*/", " ", css, flags=re.S)


def rules(css):
    """(selector, body) for every rule, skipping at-rule wrappers.

    The two stylesheets nest @media blocks one level deep and nothing
    deeper, so tracking brace depth is enough; a @keyframes body is skipped
    by name because its "selectors" are percentages.
    """
    out = []
    i, n = 0, len(css)
    skip_depth = None
    depth = 0
    while i < n:
        j = css.find("{", i)
        if j < 0:
            break
        sel = css[i:j].strip()
        k = css.find("}", j)
        if k < 0:
            break
        if sel.startswith("@"):
            # an at-rule: step inside it unless it is one whose contents are
            # not selectors at all
            if re.match(r"@(keyframes|font-face|property|import|charset)", sel):
                # skip the whole block, braces and all
                d, p = 1, j + 1
                while p < n and d:
                    if css[p] == "{":
                        d += 1
                    elif css[p] == "}":
                        d -= 1
                    p += 1
                i = p
                continue
            depth += 1
            i = j + 1
            continue
        if sel == "":
            # a stray close brace ending an @media block
            i = j + 1
            continue
        out.append((sel, css[j + 1:k]))
        i = k + 1
        # closing braces of @media blocks appear as empty selectors; consume
        while depth and i < n and css[i:].lstrip()[:1] == "}":
            i = css.index("}", i) + 1
            depth -= 1
    return out


SKIP_SEL = re.compile(r"data-theme|@|::?(before|after|placeholder|selection|"
                      r"-webkit-scrollbar)|^(html|:root)\b")
# The masthead and the nav stay dark in every palette, so their text must
# stay light in every palette. Remapping a dark-ish literal there — the
# brand's gold Devanagari at luminance 0.37, say — makes it dark ink on a
# dark gradient under the light palette, which the contrast harness caught
# at 1.09:1. The hand-written layer owns the chrome; this does not touch it.
CHROME_SEL = re.compile(r"\.masthead|nav\.site|\.lh(brand|word|name|deva|markwrap)"
                        r"|\.navbar|\.navtoggle|\.navsheet|\.eyebrow")


def gradient_colour(value):
    """The mean of the bottom gradient layer's opaque stops, or None.

    CSS paints background layers front to back, so the last
    comma-separated layer is the one underneath. The site's masthead is a
    stack of 1px white dots — stars — over a dark gradient, and treating
    any layer but the last as the surface finds those stars.
    """
    depth, start, parts = 0, 0, []
    for i, c in enumerate(value):
        if c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
        elif c == "," and depth == 0:
            parts.append(value[start:i])
            start = i + 1
    parts.append(value[start:])
    cols = []
    for m in re.finditer(r"#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)", parts[-1]):
        c = parse_colour(m.group(0))
        if c:
            cols.append(c)
    if not cols:
        return None
    n = len(cols)
    return (sum(c[0] for c in cols) // n, sum(c[1] for c in cols) // n,
            sum(c[2] for c in cols) // n)


def split_sel(sel):
    """A grouped selector into its parts, honouring parentheses.

    This had to be fixed once already and the bug is worth remembering: a
    rule written `.a,.b{...}` was being emitted as
    `html[data-theme] .a,.b{...}`, which prefixes only the first part and
    leaves the second as a GLOBAL rule restyling .b on the untouched site.
    It did not show up in the contrast figures because the tokens it set
    happened to resolve to nearly the colours .b already had — which is the
    worst kind of bug, the one that is invisible until it is not.
    """
    out, depth, start = [], 0, 0
    for i, c in enumerate(sel):
        if c in "([":
            depth += 1
        elif c in ")]":
            depth -= 1
        elif c == "," and depth == 0:
            out.append(sel[start:i].strip())
            start = i + 1
    out.append(sel[start:].strip())
    return [s for s in out if s]


def classify(css, seen):
    light, dark, dim = [], [], []
    for group, body in rules(css):
        if SKIP_SEL.search(group):
            continue
        # the background declaration, if it is a literal colour
        bg = None
        opaque_unknown = False
        for m in re.finditer(r"(?:^|;)\s*background(?:-color)?\s*:([^;]*)", body):
            v = m.group(1)
            if "var(" in v or "url(" in v:
                # The rule paints something this script cannot resolve to a
                # colour — var(--gold) on a selected chip, say. Its ink is
                # then NOT safe to remap: the selected tab's own
                # `color:var(--ink)` was being turned into var(--text),
                # which is light in a dark palette, on a background that is
                # the light accent. Light on light, measured at 1.96:1.
                # An unknown surface means leave the pairing alone.
                bg = None
                # Not every var() is equally unknown. A surface token —
                # --soft, --paper, --card, --surface-N — is redefined by
                # every palette, so the ink on it should follow the palette
                # too. An ACCENT token — --gold, --accent — is a colour
                # chosen to stand out, and the ink on it is paired with it
                # by hand; remapping that ink gives light text on the light
                # accent, measured at 1.96:1 on a selected tab. So only an
                # accent surface makes the ink untouchable.
                opaque_unknown = bool(re.search(
                    r"var\(--(gold|accent|night)", v))
                break
            if "gradient" in v:
                # A gradient still paints a surface, and skipping it was a
                # real bug: `.card.tool` is a dark gradient card, and with
                # it unlisted the generic `html[data-theme] .card` rule —
                # more specific than the card's own rule — turned it into a
                # light card while its `color:#fff` children stayed white.
                # CSS paints layers front to back, so the LAST layer is the
                # surface; its stops are averaged, because a two-stop
                # gradient has no single colour and the mean is what the
                # eye reads.
                bg = gradient_colour(v)
                break
            c = parse_colour(v)
            if c:
                bg = c
        # a literal text colour, for the rules that set one and no surface
        fg = None
        for m in re.finditer(r"(?:^|;)\s*color\s*:([^;]*)", body):
            v = m.group(1)
            if "var(" in v:
                fg = None
                break
            c = parse_colour(v)
            if c:
                fg = c

        for sel in split_sel(group):
            if SKIP_SEL.search(sel):
                continue
            # one entry per selector: the stylesheets restate a few of them
            if sel in seen:
                continue
            if bg:
                L = lum(*bg)
                if L >= LIGHT:
                    seen.add(sel)
                    light.append(sel)
                elif L <= DARK:
                    seen.add(sel)
                    dark.append(sel)
                continue
            # No surface of its own, but a dark literal ink: on a dark
            # palette that is near-black on near-black, and it is invisible
            # to the surface pass above because there is no background to
            # notice. Only dark inks are remapped — a light literal ink with
            # no surface is text on a dark parent (a masthead child, a
            # chrome strip), and every palette keeps those parents dark.
            if (fg and not opaque_unknown and lum(*fg) <= 0.45
                    and not CHROME_SEL.search(sel)):
                seen.add(sel)
                dim.append(sel)
    return light, dark, dim


def main():
    seen = set()
    light, dark, dim = [], [], []
    for f in ("app.css", "pages.css"):
        path = os.path.join(CSS, f)
        if not os.path.exists(path):
            continue
        with open(path, encoding="utf-8") as fh:
            a, b, c = classify(strip_comments(fh.read()), seen)
        light += a
        dark += b
        dim += c

    def block(sels, decls, what):
        if not sels:
            return ""
        # one selector per line: a 300-selector rule on one line is a diff
        # nobody can read
        # :where() contributes NOTHING to specificity, which is exactly the
        # weight these rules want. A plain `html[data-theme] .card h3`
        # scores (0,2,2) and so beats the stylesheet's own
        # `.card.tool h3{color:#fff}` at (0,2,1) — which is how a white
        # heading on a dark gradient card became dark-on-dark under the
        # light palette. With :where() the override scores the same as the
        # rule it is replacing and merely comes later, so it wins against
        # that rule and loses to every more specific one, which is the
        # behaviour a generated layer should have.
        pre = ",\n".join(":where(html[data-theme]) " + s for s in sorted(sels))
        return ("/* %s (%d) */\n%s{\n  %s\n}\n\n"
                % (what, len(sels), pre, "\n  ".join(decls)))

    out = [
        "/* ===== Generated theme overrides =====================================\n"
        "   Written by source/tools/gen-theme-overrides.py from the literal\n"
        "   colours in app.css and pages.css. Do not edit by hand: regenerate.\n"
        "\n"
        "   Every selector below paints an opaque background with a literal\n"
        "   colour, so under a palette it would keep that colour while the text\n"
        "   on it changed — a white card with white text, or a near-black strip\n"
        "   with near-black text. Each is repointed at the token it should have\n"
        "   used. The colour is set as well as the surface, because a surface\n"
        "   that flips from light to dark takes its text with it.\n"
        "   ================================================================= */\n\n",
        block(light, ["background:var(--surface-3);",
                      "color:var(--text);",
                      "border-color:var(--border);"],
              "surfaces the stylesheets paint light"),
        block(dark, ["background:var(--chrome-2);",
                     "color:var(--chrome-text);",
                     "border-color:var(--border-2);"],
              "surfaces the stylesheets paint dark"),
        block(dim, ["color:var(--text);"],
              "text given a dark literal ink and no surface of its own"),
    ]
    dest = os.path.join(CSS, "theme-auto.css")
    with open(dest, "w", encoding="utf-8") as fh:
        fh.write("".join(out))
    print("theme-auto.css: %d light surfaces, %d dark surfaces, "
          "%d dark inks" % (len(light), len(dark), len(dim)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
