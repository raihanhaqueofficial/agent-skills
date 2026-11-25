# agent-skills

**Reusable skills for AI coding agents** — video, research, and tooling.
Built and maintained by **[Raihan Haque](https://www.raihanhaqueofficial.com)**.

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)
[![Compliance](https://github.com/raihanhaqueofficial/agent-skills/actions/workflows/compliance.yml/badge.svg)](../../actions/workflows/compliance.yml)
[![No telemetry](https://img.shields.io/badge/telemetry-none-black.svg)](PRIVACY.md)

Each skill is a self-contained `SKILL.md` that an agent loads on demand when a
prompt matches its trigger — plus the scripts and templates it needs to actually
run. Written to be **portable**: no absolute paths, no vendor accounts, no
telemetry, no reliance on a paid service.

---

## Skills

| Skill | What it does |
|---|---|
| **[`token-lean-answers`](skills/token-lean-answers)** | Output discipline: maximum meaning per token, without dropping the caveat that mattered. |
| **[`short-form-performance-standards`](skills/short-form-performance-standards)** | Researched 2026 benchmarks for Reels / Shorts / TikTok — hook windows, length bands, cadence, and which metrics actually decide. |
| **[`html-to-video-local`](skills/html-to-video-local)** | Render HTML/CSS to video **offline and deterministically** — local Chromium + ffmpeg, byte-identical re-renders. |
| **[`web-app-teardown`](skills/web-app-teardown)** | Understand what a live web app actually runs — shipped bundle + DevTools capture — instead of trusting its marketing pages. |
| **[`installing-third-party-repos`](skills/installing-third-party-repos)** | Install a repo properly: triage its shape, mirror linked layouts, audit it for telemetry, verify with a real check. |

## Install

```bash
git clone https://github.com/raihanhaqueofficial/agent-skills

# copy one skill into your agent's skills root
cp -r agent-skills/skills/token-lean-answers ~/.your-agent/skills/
```

Skills are plain Markdown. Any agent that reads a skills directory can use them.

## Design rules these follow

- **Verify with a real check.** An exit code proves nothing — probe the artifact.
- **Measure before claiming.** Performance figures carry a date and a source; anything thin is labelled *reported*, not measured.
- **Report what is unknown.** A skill that hides its gaps is worse than no skill.
- **No telemetry.** Nothing here phones home. Where an upstream source did, the vendor parts were removed and the removal is recorded.
- **No personal data.** See [`CONTRIBUTING.md`](CONTRIBUTING.md) — enforced by CI.

---

## Compliance

| Document | Covers |
|---|---|
| [`LICENSE`](LICENSE) | MIT — the terms governing the code. |
| [`NOTICE`](NOTICE) | Attribution and the modification record for Apache-2.0-derived material. |
| [`LICENSES/Apache-2.0.txt`](LICENSES/) | Full licence text for the adapted work, travelling with it as required. |
| [`TRADEMARK.md`](TRADEMARK.md) | What may be done with the name and marks — and what needs permission. |
| [`DISCLAIMER.md`](DISCLAIMER.md) | No warranty; benchmarks are reported, not measured; not professional advice. |
| [`PRIVACY.md`](PRIVACY.md) | What the software does with your data: nothing, by design. |
| [`SECURITY.md`](SECURITY.md) | How to report a vulnerability, including a data leak. |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | How to contribute, and the two rules that matter. |
| [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) | Expected behaviour. |
| [`CHANGELOG.md`](CHANGELOG.md) | Version history. |

### Why there is no separate Terms & Conditions file

Deliberate, and legal rather than an omission.

**The MIT licence *is* the terms for this code.** MIT grants broad rights —
use, modify, redistribute, sell. Adding a separate T&C that restricts those
rights would **contradict the licence** and leave anyone using this work unable
to tell which document governs. That is a worse position than having no extra
file at all.

What a licence cannot do is grant rights to a **name**. MIT says nothing about
names or logos. So the thing that genuinely needed its own document —
[`TRADEMARK.md`](TRADEMARK.md) — has one.

If you fork this and want commercial terms, add them in **your** fork. The
original stays cleanly MIT.

---

## Author

**Raihan Haque** — Performance Marketer who owns outcomes (CPA, ROAS, LTV).

- Website — https://www.raihanhaqueofficial.com
- GitHub — https://github.com/raihanhaqueofficial

<!-- The author's other profiles are intentionally not listed here until
     confirmed. Do not add handles that have not been verified by the owner. -->

## Attribution

`html-to-video-local` adapts the published motion doctrine of the
[HyperFrames](https://github.com/heygen-com/hyperframes) project
(**Apache-2.0**, adapted with attribution). Its CLI, account-linked usage
beacon, plan-usage reporting and hosted API are deliberately **not** used; the
renderer here is an independent local implementation. Changes are recorded in
[`NOTICE`](NOTICE) and in the skill's Provenance section.

Everything else is original work, MIT.

## Ethics

`web-app-teardown` analyses only bytes served to any anonymous visitor. It never
bypasses a login, never touches other users' data, and never scrapes behind
authentication. That boundary is written into the skill and is not negotiable.

## A note on this documentation

These files follow widely-used open-source conventions and were written to be
accurate about what the software does. **This is not legal advice, and no
lawyer has reviewed it.** For anything binding — commercial use, trademark
registration, or a dispute — have a qualified professional review it in your
own jurisdiction.
