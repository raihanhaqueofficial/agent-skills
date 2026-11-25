---
name: installing-third-party-repos
description: "Use when asked to install a repo: skills, MCP, or app."
version: 1.0.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [install, setup, skills, mcp, cli, npm, uv, docker, third-party]
    category: software-development
    related_skills: [hermes-agent, github]
---

# Installing a third-party repo

The user names a repo ("install: gh repo clone owner/name") and wants its capability available and
working here. The work is the same shape every time: triage what the repo provides, install that
thing the way its own docs say, prove it runs, and say plainly what is still unconfigured.

## When to Use

Trigger on any request to install, set up, or "get working" a third-party repo — `gh repo clone
<owner>/<name>` handed over with "install this", a named open-source project the user wants available
locally, or a repo whose capability is half-installed and needs finishing. Not for writing code inside a
repo the user already works in, and not for updating an install that is already working and unchanged
upstream (that is a verification job — see the standing rules).

## 1. Triage first — the repo's shape decides everything

Read the README, plus `INSTALL.md` / `docs/getting-started/*` when present, BEFORE installing anything.
Then classify:

| The repo ships | Install path |
|---|---|
| User-facing agent skills (`skills/`, `packages/skills/skills/`) | Hermes skill install — follow the `hermes-agent` skill's skill-library reference |
| An MCP server (`mcp.json`, `server.json`, or an npm package whose subcommand serves MCP) | `hermes mcp add` (see step 3) |
| An app / CLI / harness / web UI | The repo's documented packaged install — see `references/app-installs.md` |
| A library to build against | Clone + the language's package manager; nothing global |

Many repos are two of these at once. REA is a skill *and* an MCP server, and its own skill text says
installing the skill alone "does not register the MCP server or add tools" — so install both, or the
result is decorative.

**A bundle of hundreds of skills has a context cost — measure it before installing, not after.** The
system-prompt skill index lists every enabled skill as `- name: description`, so a large library is a
permanent tax on every session. Measure with Hermes's own renderer:

```bash
python3 -c "import sys; sys.path.insert(0,'$HERMES_HOME'); \
 from agent.prompt_builder import build_skills_system_prompt as B; \
 print(len(B(available_tools=None, available_toolsets=None)))"
```

Compare with `compact_categories=frozenset({'<category>'})` to price the names-only variant. Then decide
and SAY which trade-off applies: install enabled and accept the cost, keep the set out of the index, or
install a trimmed subset. Do not silently inject tens of thousands of tokens into every future prompt.
Useful facts: descriptions ARE truncated in the index; `skills.disabled` in config.yaml hides a skill but
makes it unloadable by `skill_view` (so it is not a free way to keep a library available); and the
names-only demotion is the coding "focus" posture (`compact_skill_categories`), not a per-category config.

**Separate user-facing skills from contributor skills.** A `.agents/skills/` directory is almost always
the maintainers' own development workflows (they link repo-internal docs like `../../../AGENTS.md` or
`../../../docs/development/*`, or describe release/triage/CI chores). Those are meaningless outside the
checkout — do NOT install them. Install only the set the README documents for users.

**Check `metadata.hermes.requires_toolsets` before calling a skill install done.** It is a HARD gate in
`_skill_offered()` (`agent/prompt_builder.py`): a skill requiring a toolset that does not exist is hidden
from the available-skills index even though it is on disk and `hermes skills list` shows it `enabled`. A
bundle whose skills require a toolset its own plugin provides is therefore decorative without that plugin
— the same trap as a skill that needs an unregistered MCP server. Say so plainly, and treat the plugin
install (plus any runtime dependency it needs) as a separate, user-approved step rather than assuming the
skill copy was the whole job.

**Find the authoritative shipped list before copying.** Bundles that ship a plugin manifest
(`.claude-plugin/plugin.json`, a marketplace file, or an equivalent) list the exact skill paths the
package installs; that list beats guessing from directory names. `skills/in-progress/`, `skills/misc/`
and `skills/deprecated/` are commonly present-but-not-shipped. Compare the manifest against the README's
documented install paths and treat the intersection as the set.

A repo whose installer is a wizard listing supported clients (Claude Code, Cursor, Codex, ...) will not
list Hermes. That is not a blocker: do the wizard's job manually with the mechanism in step 3.

## 2. Clone to a persistent path, and keep it

- Clone somewhere durable, never a scratch/tmp dir that gets pruned — the checkout is the update source.
- **Do not clone into the Hermes home when the repo is itself named `skills`** — `git clone ... skills`
  collides with `$HERMES_HOME/skills` and fails with "destination path 'skills' already exists". Clone to a
  distinct path (e.g. `owner-skills`) and copy the individual skill dirs out of it.
- Do not build a large monorepo unless asked. Prefer the repo's packaged install (npm/uv/binary); offer
the source build as a separate, explicitly-requested option. A 20k-file pnpm monorepo build is a
different job from an install.

## 3. Install the runtime

**Skills:** follow the `hermes-agent` skill's skill-library reference (category dir + DESCRIPTION.md,
count discovery, keep every fix inside `$HERMES_HOME`).

**MCP server:**

```bash
hermes mcp add <name> --command npx --connect-timeout 120 --args -y <pkg>@<ver> mcp
```

- `--args` MUST be the last option. Anything after it is appended to the server's argv; the server exits
  on the unknown flag and you get `Failed to connect: Connection closed`.
- The flow ends with `Enable all N tools? [Y/n/select]` and cancels silently when stdin is not a TTY —
  pipe the answer (`printf 'y\n' | hermes mcp add ...`).
- A server advertising hundreds of tools is a real context cost; say so and offer `hermes mcp configure
  <name>` to prune.

**Apps:** see `references/app-installs.md` for the npm / Python / Docker recipes and their pitfalls.

**A `curl | sh` installer can die on a missing base utility** (composio's aborts with "unzip is required",
no root to install it). Do not give up or fake success: extract the utility from its distro package into a
PATH directory (`curl` the `.deb`, `ar x`, `tar xf data.tar.*`, copy the binary to `~/.local/bin`) and
re-run the official installer so its own checksum verification still applies. Note the workaround in
`INSTALL-NOTES.md` — the utility stays available for later installs.

## 4. Verify with a real check — an install exit code proves nothing

- Skills: `hermes skills list | grep -c <category>` must equal the number of top-level skill dirs copied.
  More rows means nested `SKILL.md` files were picked up as skills.
- Servers/UI: start it, then `curl` its health or docs endpoint and require HTTP 200 plus the version it
  claims. Do not report "installed and running" from a log line alone.
- Import smoke test for a Python app: import the heavy modules and the app entrypoint in the venv.
- A server that prints a tokenized URL (`http://127.0.0.1:PORT/?token=...`) returns 401 on the bare port.
  Use the printed URL with the token, or say plainly that the port alone will not load.
- A background shell may not source the same PATH as the interactive one — invoke a freshly installed CLI
  by absolute path there, or the job dies with `command not found` after you already "verified" it.
- **Read the skills you installed before building anything parallel.** Discovery and enablement prove a
  skill is *loadable*, not that you know what it does. Load the ones whose territory the task touches: an
  installed skill often already documents the technique you are about to reinvent, and frequently ships
  the helper script that does it. Check this deliberately BEFORE writing new tooling — duplicating an
  installed capability is wasted work and leaves two systems to maintain.

## 5. Report, and leave notes where the install lives

Write `INSTALL-NOTES.md` next to the install (repo root, or the category dir for a skill bundle): what
was installed and where, the exact start/verify commands, every local modification made to upstream
files and why, and what is still unconfigured. This is what makes a later session able to update it
without re-deriving the work.

Then report: what changed, what is verified, what is NOT configured, what needs the user.

## Audit for outbound telemetry before calling an install done

A repo that works is not the same as a repo that is safe to run. After
installing, grep the installed tree for **vendor API hosts and telemetry
keywords** before reporting success:

```bash
grep -rniE 'beacon|telemetry|analytics|posthog|sentry|mixpanel|amplitude|usage --json|events --skill' <install-dir>
grep -rnoE 'https?://[a-z0-9.-]+\.[a-z]{2,}' <install-dir> | sort -u
```

- **A skill that instructs a usage beacon or reports "plan usage" is
  account-linked.** Surface it in plain language (what is sent, when, and
  whether identity attaches) and let the user decide. **Never run the beacon as
  part of an install**, and never install a CLI whose only purpose is to make
  such a skill work.
- **Check transitive dependencies too.** A skill can be clean yet pin a
  beaconing CLI at runtime (`build.mjs` doing `hyperframes@<version>`), which
  reintroduces the problem the moment it is used.
- **Quarantine, do not delete.** `mv` the skill dirs to
  `<vendor>/_quarantine-<reason>/` and say how to restore them. Deleting
  destroys the user's option; moving does not.
- **Verify hits in context before reporting them.** `amplitude` is a GLSL
  uniform and an SVG jitter value; `track(` is `THREE.NumberKeyframeTrack`; a
  vendor hostname in a doc comment or a README UTM link is not a call. Reporting
  these as telemetry is a false alarm that costs credibility — grep for the
  keyword, then read the line.
- A download is not a beacon: fetch-on-first-use (whisper model weights) is
  local behaviour, not usage reporting.

## Standing rules

- **Bind anything that serves HTTP to loopback.** If the shipped default is `0.0.0.0`, change it to
  `127.0.0.1` before first start, and repeat any auth-disabled warning the app logs — that warning is the
  reason the default matters.
- **Never configure the user's API keys or provider credentials as part of an install.** Report which
  keys the app needs and where they go, and let the user decide. An app that executes model-generated
  code or loads third-party plugins can reach this container's Hermes credentials — say that plainly
  rather than silently pointing it at their key.
- **Surface the repo's own safety notice** when it ships one (SAFETY.md, a developer-preview banner).
  Summarize the actual risk in a sentence; do not paste the notice.
- **A repeat request is a verification job, not a re-install.** If the user asks again for something
  already installed, confirm the current state (discovery count, process, health) and check upstream for
  new commits (`git fetch` + `rev-list --count HEAD..origin/HEAD`) before touching anything.
- **A new version lands in a new directory.** Any local fix applied to an installed payload must be
  re-applied after an update; put it in a re-runnable script and reference it from `INSTALL-NOTES.md`.

## Pitfalls

- **Skills that link OUTSIDE their own directory.** A pack whose skills reference shared files by relative
  path (`../../references/*.md`, `../../agents/*.md`, `../sibling-skill/SKILL.md`) breaks if you copy only
  the skill dirs. Mirror the pack's layout inside the category dir instead (`<category>/skills/<name>/`,
  `<category>/references/`, `<category>/agents/`) — discovery is recursive so the skills are still found,
  and the relative paths keep resolving. Then check every link actually resolves before reporting. Note
  that `skill_view(name, file_path=...)` only reaches files INSIDE a skill's own dir; shared files must be
  read with `read_file` at the resolved path.
- **A pack can keep `scripts/` at the PACK root while the skill calls it `scripts/x.sh`.** That path has
  no `../`, so it looks local, but it points at the pack's directory rather than the skill's — copying
  only `skills/<name>/` silently drops a helper the skill depends on, and the install looks complete.
  Before reporting done, extract every support path the SKILL.md mentions and assert each resolves:
  `grep -oE '(scripts|references|templates|assets)/[A-Za-z0-9_./-]+' <skill>/SKILL.md | sort -u`, then test
  each with `[ -f ]`. Mirror the pack's `scripts/` into the skill dir when it is missing.
- **A name collision may be a different upstream, not a port.** Check the existing skill's provenance before
  assuming it is an older copy. Two same-named skills in one tier with different content resolve to
  *ambiguous*, which breaks the EXISTING skill too — not just the new one. Install the incoming one under a
  source-suffixed name (frontmatter `name:` changed to match the dir) and verify the original still loads.
- **Nested `SKILL.md` floods the index.** Only `references`, `templates`, `assets`, `scripts` directly
  inside a skill root are pruned from discovery; a `capability/`-style module tree at the skill root is
  scanned as dozens of standalone skills. Move the tree under `references/` and rewrite the parent's path
  refs. Symlinking it does not help — the walk follows links.
- **Symlinked sibling skills double-count.** A bundle that symlinks one skill into another for Markdown
  navigation is discovered through the link too. Omit the symlinks from the installed copy and rewrite
  the link targets to the real sibling paths.
- **`hermes skills inspect <name>` may render the remote registry copy**, not the installed file. Verify
  what is actually on disk with `skill_view(name, file_path=...)` or by reading the file.
- **Check for an existing bundled skill before installing one.** Hermes already ports some popular
  repos (e.g. `creative/humanizer` is a port of blader/humanizer). Bundled skills are seeded into the
  same local skills root as installs, so a same-named copy is NOT an override: two same-named skills in
  one tier that differ in content resolve to *ambiguous* (skill_view refuses to pick one), and a copy in
  a lower tier is *shadowed* and hidden. Neither gives you a usable second copy. Install under a distinct
  name (rename the frontmatter `name:` too, since it must match the directory) and note in
  `INSTALL-NOTES.md` that a bundled skill already covers the repo and how the two differ. Do not silently
  overwrite the bundled port — it usually carries harness-specific adaptations.
