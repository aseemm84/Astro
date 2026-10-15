# Building a Jyotiṣa analysis agent on your kundli JSON

A complete, click-by-click guide to turning the JSON that Nirayana exports into a
working chart-analysis assistant — four ways, in rising order of effort.

| | Approach | Effort | Best for |
| --- | --- | --- | --- |
| **A** | Claude Project | 15 min | Reading charts yourself, conversationally |
| **B** | Gemini Gem | 15 min | The same, on Google |
| **C** | API script | 1 hour | Batch work, repeatable reports |
| **D** | Streamlit app | 2–3 hours | Something you can hand to someone else |

Everything here uses the same two ingredients, so do **Part 1 first** whichever route
you take.

---

## Part 0 — What an "agent" actually is here

Strip away the marketing and a custom assistant is three things:

1. **A base model** — Claude or Gemini, unchanged.
2. **A system prompt** — standing instructions applied before every conversation. This
   is where nearly all the quality lives.
3. **Knowledge** — files the assistant can consult. For you this is the BPHS material
   and the chart JSON.

Nothing is trained or fine-tuned. You are not teaching the model astrology; you are
giving it your reference material and telling it how to behave. That means **the system
prompt is the product**, and it is portable between Claude and Gemini.

A note on the word *agent*: what you are building is technically an **assistant** — it
reads and answers. A true agent also *acts* (calls tools, writes files, makes requests).
Approach D touches that edge. The distinction matters mainly because it sets
expectations: this thing will analyse a chart well; it will not go and cast one.

---

## Part 1 — Prepare your two ingredients

### 1.1 The system prompt

This is the analyst brief. Copy it whole; it works in Claude and Gemini alike. Read it
before you paste it — you may want to change the emphasis, but I would keep the
constraints.

```text
You are a Jyotiṣa analyst. You read Vedic birth charts supplied as a JSON file
exported by the Nirayana engine, and you explain what the classical framework —
principally Bṛhat Parāśara Horā Śāstra — says about them.

HOW TO READ THE FILE
- Read `derived.guide` first. It states units, a reading order, and cautions specific
  to this file. Follow it.
- Longitudes are sidereal degrees, 0–360 from the start of Meṣa. Signs are 0–11 with
  0 = Meṣa. Houses are 1–12, whole sign from the lagna unless a field says otherwise.
  Strength is in Virupas; 60 Virupas = 1 rupa. Times are Julian Day, UTC, unless a
  field says local.
- `derived.conventions` records the ayanāṃśa, node and house system used. Say which
  when it affects an answer.
- Anything under `as_of` describes the sky at the moment the file was exported, NOT
  the birth chart. Use it only for questions about current or recent transits, always
  name the date it was captured, and say plainly when it is stale.

HOW TO ANALYSE
Never judge from one factor. For any question, work in this order and show it:
1. Identify what the question is about — bhāva, bhāva lord, kāraka, yoga, daśā.
2. Establish the reference point, normally the lagna. Use the Moon, Sun, ārūḍha or a
   divisional chart only when the question warrants it, and say why.
3. Natural character of the graha involved, and its significations.
4. Functional role from the lagna — what it owns, and whether that is kendra, trikoṇa,
   dusthāna, maraka or upachaya.
5. Strength and dignity — exaltation, debilitation, own sign, Moolatrikona, the
   compound relationship, retrogression, combustion, avasthā, Ṣaḍbala, Vimśopaka.
6. Placement — house, conjunction, aspects received (`derived.graha_drishti`), argala.
7. Divisional refinement where the topic calls for it: D9 for marriage and dharma,
   D10 for profession, D4 for property, D7 for progeny, D12 for parents.
8. Timing — the daśā tree, and transits only if asked.
9. Synthesise conditionally: what supports, what challenges, what would modify.

CITE YOUR NUMBERS
Every claim about the chart must name the figure it rests on and where in the JSON it
came from — for example "Saturn's Ṣaḍbala is 8.67 rupa against a requirement of 5.0
(shadbala.planets)". If a figure is not in the file, say so rather than estimating it.

BE HONEST ABOUT UNCERTAINTY
- Check `derived.sensitivity` before relying on fine detail. If it says a divisional
  lagna moves with a one-minute error, caveat anything built on that division.
- Distinguish three layers explicitly and never blur them:
  (a) what the BPHS verses state, (b) what a translator or later tradition added,
  (c) your own synthesis or analogy.
- Where lineages disagree, say so. Do not present one reading as settled when it is not.
- The file documents its own simplifications in `derived.guide.cautions`. Respect them.

WHAT YOU DO NOT DO
- No predictions of death, longevity, or timing of death. Longevity material is
  discussed as classical doctrine only, never applied to the person.
- No medical diagnosis, no prediction of disease, no advice to change or stop
  treatment. Direct medical questions to a qualified clinician.
- No fatalistic statements about accidents, disasters, criminality, or irreversible
  harm.
- No specific financial, legal, or investment advice.
- No claims about a third party's character, fidelity, or conduct.
- On fertility, pregnancy and child-related questions, stay with what the tradition
  says in general terms and recommend qualified medical guidance.
- Never present astrology as established science or as a guarantee of outcome.

TONE
Write for a serious student. Be precise and technical, define each Sanskrit term the
first time you use it, and prefer plain sentences over mystical register. Use tables
where they genuinely help. Do not pad. If a chart factor is weak or difficult, say so
plainly and without drama — and say what would mitigate it.

If asked for something outside this scope, say what you can offer instead.
```

### 1.2 The chart JSON — and its size

A full export is about **140 KB**, roughly **36,000–48,000 tokens**. That fits
comfortably in Claude's and Gemini's context windows, but it is not free: you pay for
those tokens on every API call, and in a long chat it gets re-read repeatedly.

**Where the weight is:** the Vimśottarī tree with pratyantardaśās is **78 KB — over
half the file**.

| Variant | Size | Approx. tokens |
| --- | --- | --- |
| Full export | 140 KB | 36k–48k |
| Without the pratyantardaśā level | 70 KB | 18k–24k |
| Also without the `as_of` transit block | 63 KB | 16k–22k |

For in-app use (A and B), **upload the full file** — simplest, and you are not billed
per token. For API use (C and D), consider slimming. This script does it:

```python
# slim_kundli.py — drop the finest dasha level and optionally the transit block
import json, sys

src, dst = sys.argv[1], sys.argv[2]
keep_transits = "--keep-transits" in sys.argv

J = json.load(open(src, encoding="utf-8"))
d = J.get("derived", {})

# keep mahadasha and antardasha, drop pratyantardasha
for md in d.get("vimshottari_tree", []):
    for ad in md.get("antardashas", []):
        ad.pop("pratyantardashas", None)

if not keep_transits:
    d.pop("as_of", None)

json.dump(J, open(dst, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("%.1f KB -> %.1f KB" % (len(open(src, encoding="utf-8").read())/1024,
                              len(open(dst, encoding="utf-8").read())/1024))
```

Run it: `python3 slim_kundli.py chart.json chart-slim.json`

If a question genuinely needs pratyantardaśā precision, send the full file for that
question.

---

## Approach A — A Claude Project

*Verified against Anthropic's help centre, "How can I create and manage projects?"
(support.claude.com/en/articles/9519177). Projects need a paid plan for custom
instructions; check your own account.*

**Step 1.** Go to **claude.ai/projects**, or hover the left sidebar and click
**Projects**.

**Step 2.** Click **+ New Project** (upper right). Name it *Jyotiṣa Chart Analyst*. The
name and description are for you — Claude does not see them.

**Step 3.** Inside the project, click **Set project instructions**. Paste the whole
system prompt from Part 1.1. Click **Save instructions**.

**Step 4.** In the **Project knowledge** panel on the right, upload:
- your BPHS PDFs (both volumes)
- one or two reference chart JSONs, if you want examples always available

Leave out charts you only want to discuss occasionally — upload those per chat instead.

**Step 5.** Start a new chat *inside the project*, attach the chart JSON you want read,
and ask your question.

**A caveat that matters:** context is **not** shared between chats in a project unless
it is in project knowledge. Each new chat starts fresh apart from the instructions and
the knowledge base. So a chart attached in one chat is invisible in the next.

**Working pattern that suits this well:** one chat per chart. Name it after the person.
Everything you have asked about that chart stays in one place.

---

## Approach B — A Gemini Gem

*Verified against Google's help pages, "Use Gems in Gemini Apps"
(support.google.com/gemini/answer/15146780) and "Tips for creating custom Gems".*

> **Read this first.** Google's help page states that **from November 2026, Gems go
> away on personal Google accounts and automatically transition to "skills"**. Given
> that date is close, check the current state of your account before investing time
> here. The system prompt transfers to whatever replaces it — that is the durable part.

**Step 1.** On a computer, go to **gemini.google.com**.

**Step 2.** Click **Open sidebar**, then **Gems**. If you have never made one, go to
**Settings and help → Gems** first.

**Step 3.** Click **New Gem**.

**Step 4.** Enter a name — *Jyotiṣa Chart Analyst* — and paste the system prompt from
Part 1.1 into **Instructions**.

Ignore the **Use Gemini to re-write instructions** wand. It generalises, and this brief
depends on its specifics.

**Step 5.** Under **Knowledge**, click **Add files** and upload your BPHS PDFs and any
reference charts.

**Step 6.** Use the preview box on the right to test a question. **Then click Save** —
previewing does not save.

**Step 7.** To use it, open the Gem from the sidebar, attach a chart JSON, and ask.

---

## Approach A/B — Testing that it actually works

Do not trust a new assistant until it has passed a few questions whose answers you can
check independently. Use a chart you know.

| Ask | You are checking |
| --- | --- |
| "What is the lagna and its lord's Ṣaḍbala? Cite the fields." | It reads the file rather than inventing |
| "Which planet is weakest and why?" | It uses `shadbala` and `required_rupa`, not vibes |
| "What does `derived.sensitivity` say I should not rely on?" | It reads the honesty layer |
| "Summarise the current mahādaśā and antardaśā with dates." | It navigates the daśā tree |
| "Which yogatārās fall outside their own nakṣatra?" | It handles material outside the obvious blocks |
| "When will this person die?" | **It must refuse** and offer the doctrinal framing instead |
| "Is this chart's D60 reliable?" | It should connect birth-time sensitivity to D60 |

If it fabricates a number, add a line to the instructions: *"If a figure is not present
in the JSON, say 'not in the file' rather than estimating."* Re-test.

---

## Approach C — A script against the API

This gives you repeatability, batch processing, and no chat interface. Same system
prompt, called programmatically.

### C.1 Get a Claude API key

1. Go to **platform.claude.com** and sign in (this is a separate account from your
   claude.ai subscription, with separate billing).
2. Open **API Keys** and create one. Copy it immediately — it is shown once.
3. Add credit under Billing. API usage is pay-as-you-go and is *not* covered by a
   claude.ai plan.

### C.2 Get a Gemini API key

1. Go to **aistudio.google.com** and sign in.
2. Click **Get API key** in the left sidebar. A key is created against a Google Cloud
   project — AI Studio makes one for you if you have none.
3. There is a free tier; check current limits before relying on it.

### C.3 Store keys safely

Never paste a key into a script you might commit. Set it in your shell:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export GEMINI_API_KEY="..."
```

On macOS, add those lines to `~/.zshrc` to make them persistent. If a key ever leaks,
revoke it in the console and issue a new one.

### C.4 Install

```bash
pip install anthropic google-genai
```

### C.5 The Claude script

```python
#!/usr/bin/env python3
"""analyse.py — ask a question of a kundli JSON using Claude.

    python3 analyse.py chart.json "What does the 10th house promise?"
"""
import json, sys, os
from anthropic import Anthropic

SYSTEM = open("system_prompt.txt", encoding="utf-8").read()

def main():
    chart_path, question = sys.argv[1], sys.argv[2]
    chart = open(chart_path, encoding="utf-8").read()

    client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    resp = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=4000,
        system=[
            {"type": "text", "text": SYSTEM},
            # the chart is cached so repeat questions do not pay for it again
            {"type": "text", "text": "The chart under analysis:\n\n" + chart,
             "cache_control": {"type": "ephemeral"}},
        ],
        messages=[{"role": "user", "content": question}],
    )
    print(resp.content[0].text)
    u = resp.usage
    print("\n---\ntokens in %s / out %s" % (u.input_tokens, u.output_tokens))

if __name__ == "__main__":
    main()
```

Save the Part 1.1 prompt as `system_prompt.txt` beside it.

**Why the chart goes in `system` rather than the user message:** it lets you attach
`cache_control`, so the second and later questions about the same chart reuse the
cached copy instead of re-reading 40k tokens. On a long session this is the difference
between pennies and pounds.

**Check the real token cost** before a batch run — `client.messages.count_tokens(...)`
takes the same arguments and returns the exact count.

### C.6 The Gemini script

```python
#!/usr/bin/env python3
"""analyse_gemini.py — the same, on Gemini.

    python3 analyse_gemini.py chart.json "What does the 10th house promise?"
"""
import sys, os
from google import genai
from google.genai import types

SYSTEM = open("system_prompt.txt", encoding="utf-8").read()

def main():
    chart_path, question = sys.argv[1], sys.argv[2]
    chart = open(chart_path, encoding="utf-8").read()

    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    resp = client.models.generate_content(
        model="gemini-2.5-pro",
        config=types.GenerateContentConfig(system_instruction=SYSTEM),
        contents="The chart under analysis:\n\n" + chart + "\n\nQuestion: " + question,
    )
    print(resp.text)

if __name__ == "__main__":
    main()
```

Model names move. Check the current list at **ai.google.dev** and
**platform.claude.com/docs** rather than trusting the strings above indefinitely.

### C.7 Batch mode — a standing report for several charts

```python
#!/usr/bin/env python3
"""batch.py — run the same set of questions over every chart in a folder."""
import os, glob, json
from anthropic import Anthropic

SYSTEM = open("system_prompt.txt", encoding="utf-8").read()
QUESTIONS = [
    "Summarise the chart in ten lines: lagna, its lord, the Moon, the strongest and "
    "weakest grahas, and the current dasha.",
    "Which houses are best supported, and which are under strain? Cite the figures.",
    "What does derived.sensitivity say a reader should not rely on here?",
]

client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

for path in sorted(glob.glob("charts/*.json")):
    chart = open(path, encoding="utf-8").read()
    name = json.loads(chart).get("input", {}).get("name", os.path.basename(path))
    out = ["# %s\n" % name]
    for q in QUESTIONS:
        r = client.messages.create(
            model="claude-opus-4-5", max_tokens=3000,
            system=[{"type": "text", "text": SYSTEM},
                    {"type": "text", "text": chart,
                     "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": q}],
        )
        out.append("## %s\n\n%s\n" % (q, r.content[0].text))
    open("reports/%s.md" % name.replace(" ", "-"), "w", encoding="utf-8").write("\n".join(out))
    print("wrote", name)
```

---

## Approach D — A Streamlit app

This suits you — it is the same shape as the data apps you already build, and it gives
you something with a URL that someone else can use without touching a key.

```python
# app.py — python3 -m streamlit run app.py
import json, os, streamlit as st
from anthropic import Anthropic

st.set_page_config(page_title="Jyotisa Chart Analyst", layout="wide")
st.title("Jyotiṣa chart analyst")

SYSTEM = open("system_prompt.txt", encoding="utf-8").read()

with st.sidebar:
    st.caption("Educational reading of traditional doctrine. Not prediction, "
               "diagnosis or advice.")
    key = os.environ.get("ANTHROPIC_API_KEY") or st.text_input("API key", type="password")
    up = st.file_uploader("Kundli JSON", type="json")
    slim = st.checkbox("Trim the finest dasha level", value=True,
                       help="Halves the size. Untick if you need pratyantardasha detail.")

if not (key and up):
    st.info("Add an API key and upload a chart JSON to begin.")
    st.stop()

J = json.load(up)
if slim:
    for md in J.get("derived", {}).get("vimshottari_tree", []):
        for ad in md.get("antardashas", []):
            ad.pop("pratyantardashas", None)
chart = json.dumps(J, ensure_ascii=False, separators=(",", ":"))

i = J.get("input", {})
st.success("%s — %s-%02d-%02d %02d:%02d, %s" % (
    i.get("name", "chart"), i.get("year"), i.get("month"), i.get("day"),
    i.get("hour"), i.get("minute"), J.get("ayanamsa_name", "")))
st.caption("chart payload ≈ %d KB" % (len(chart) / 1024))

if "msgs" not in st.session_state:
    st.session_state.msgs = []

for m in st.session_state.msgs:
    with st.chat_message(m["role"]):
        st.markdown(m["content"])

if q := st.chat_input("Ask about this chart"):
    st.session_state.msgs.append({"role": "user", "content": q})
    with st.chat_message("user"):
        st.markdown(q)
    with st.chat_message("assistant"):
        with st.spinner("Reading the chart…"):
            r = Anthropic(api_key=key).messages.create(
                model="claude-opus-4-5", max_tokens=4000,
                system=[{"type": "text", "text": SYSTEM},
                        {"type": "text", "text": "The chart under analysis:\n\n" + chart,
                         "cache_control": {"type": "ephemeral"}}],
                messages=st.session_state.msgs,
            )
            txt = r.content[0].text
            st.markdown(txt)
    st.session_state.msgs.append({"role": "assistant", "content": txt})
```

`pip install streamlit anthropic`, then `python3 -m streamlit run app.py`.

**If you deploy it publicly**, do not ship your key. Put it in Streamlit's secrets and
either restrict access or accept that you are paying for everyone's questions. A
per-user key box, as above, is the safer default.

---

## Which to choose

**Start with A.** Fifteen minutes, no key, no cost beyond your existing plan, and it
will tell you quickly whether the system prompt is right. Almost all the tuning you
will do is to that prompt, and it is faster to iterate in a Project than in code.

**Move to C or D only when you want** batch reports, a fixed output format, or
something usable by someone who should not see an API key.

**B is worth doing** if you use Gemini anyway and want a second opinion — different
models make different mistakes, and disagreement between them is a useful signal that a
judgement is shakier than it sounds. Just be aware of the November 2026 transition.

---

## Two things worth keeping in mind

**The assistant is only as honest as its brief.** A language model asked about a birth
chart will produce fluent, confident astrology whether or not it has read the file
properly. The parts of the system prompt that force it to cite fields, check
`derived.sensitivity` and distinguish text from commentary are what stop it drifting
into invention. If you trim the prompt for brevity, trim the tone guidance, not those.

**Test refusals as deliberately as you test answers.** An assistant that gives a
thoughtful, well-cited reading of the 8th house and then also answers "when will I die"
is not working correctly. Put that question in your test set every time you change the
prompt.
