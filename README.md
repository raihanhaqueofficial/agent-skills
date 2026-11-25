# agent-skills

Reusable skills for AI coding agents. Each skill is a self-contained `SKILL.md`
an agent loads on demand when a prompt matches its trigger — plus any scripts and
templates it needs to actually run.

These are the working set behind real video, research and tooling work. They are
written to be **portable**: no absolute paths, no vendor accounts, no telemetry.

## What's here

| Skill | What it does |
|---|---|
| [`token-lean-answers`](skills/token-lean-answers) | Output discipline: maximum meaning per token, without dropping the caveat that mattered. |
| [`short-form-performance-standards`](skills/short-form-performance-standards) | Researched 2026 benchmarks for Reels/Shorts/TikTok — hook windows, length bands, cadence, which metrics actually decide. |
| [`html-to-video-local`](skills/html-to-video-local) | Render HTML/CSS to video **offline and deterministically** — local Chromium + ffmpeg, frame-accurate, byte-identical re-renders. |
| [`web-app-teardown`](skills/web-app-teardown) | Understand what a live web app actually runs — shipped bundle + CDP capture — instead of trusting its marketing pages. |
| [`installing-third-party-repos`](skills/installing-third-party-repos) | Install a repo properly: triage its shape, mirror linked layouts, audit it for telemetry, verify with a real check. |

## Install

Copy a skill directory into your agent's skills root:

```bash
git clone https://github.com/raihanhaqueofficial/agent-skills
cp -r agent-skills/skills/<name> ~/.your-agent/skills/
```

## Design rules these follow

- **Verify with a real check.** An exit code proves nothing. Probe the artifact.
- **Measure before claiming.** Every performance figure here is dated and sourced; anything thin is marked as reported, not measured.
- **Report what's unknown.** A skill that hides its gaps is worse than no skill.
- **No telemetry.** Nothing here phones home. Where a source did, the vendor parts were removed — see the provenance note in `html-to-video-local`.
- **Sanitised for publication.** No personal data, no absolute machine paths.

## Attribution

`html-to-video-local` adapts the published motion doctrine of the
[HyperFrames](https://github.com/heygen-com/hyperframes) project
(**Apache-2.0**, adapted with attribution). Its CLI, account beacon, plan-usage
reporting and hosted API are deliberately **not** used; the renderer here is an
independent local implementation. Changes are noted in the skill's Provenance
section.

Everything else is original work, MIT.

## Ethics

`web-app-teardown` analyses only bytes served to any anonymous visitor. It never
bypasses a login, never touches other users' data, and never scrapes behind
authentication. That boundary is written into the skill and is not optional.

## Licence

MIT — see [LICENSE](LICENSE).
