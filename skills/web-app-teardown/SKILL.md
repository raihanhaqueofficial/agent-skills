---
name: web-app-teardown
description: "Use when reverse-engineering a live web app's stack."
version: 1.0.0
author: Hermes Agent
license: MIT
platforms: [linux]
metadata:
  hermes:
    tags: [reverse-engineering, rea, cdp, javascript, competitor-research, selenium]
    related_skills: [reverse-engineer-anything, browser-harness]
---

# Web app teardown (shipped bundle + live capture)

## When to Use

- A competitor/third-party web app must be understood at the level of **what
  it actually runs**, not what its marketing pages claim: real stack, real API
  surface, real vendors, real pricing model.
- Any question of the form "is X real, or is it a landing-page claim?"

Do **not** use this for ordinary source-repository analysis.

## Ethics and scope (non-negotiable)

Analyse only bytes **served to any anonymous visitor**. Never bypass a login,
never touch other users' data, never scrape behind auth. State this boundary to
the user before starting an untrusted target.

## Step 1 — find the browser's CDP endpoint

The browser launches with `remote-debugging-port=0`, so the port is random. The
real port is written to `DevToolsActivePort`:

```bash
D=$(ls -d ~/.cache/<browser>/chromium/*/ | head -1)
head -1 "$D/DevToolsActivePort"     # <- the port, e.g. 32769
curl -s "http://127.0.0.1:$PORT/json/version"
```

Bash variable assignment and the next line's `$PORT` do **not** share scope in
a one-liner; read the file twice or export it. Do not guess `9222` — probing
common ports finds nothing here.

## Step 2 — capture

1. `list_browser_targets` with `cdp_endpoint` + `allowed_origins`.
2. `inspect_web_page` with `include_script_sources: true` and a short
   `observation_ms`. **Set `allowed_origins` to every origin the app talks to,
   not just its own** — the default scope is the page origin and data APIs
   usually live elsewhere. Read `completeness.excluded` for
   `disallowed_origin` counts; those are the APIs you are missing.
3. `export_web_scripts` into an **absent** output directory.

### Pitfall: the capture file is not valid JSON on its own

REA evidence written to a spillover file carries a trailing
`<mcp-result-metadata>` block, so `export_web_scripts` rejects it with
`invalid_format: Unexpected non-whitespace character after JSON`. Write a clean
copy first using `json.JSONDecoder().raw_decode` (not `json.loads`), then point
`capture_path` at that file.

## Step 3 — analyse the exported bytes

**`analyze_javascript_application` has a retention ceiling.** On a ~1 MB Next.js
bundle it asked to retain ~522 MB against a ~7.7 MB allowance and returned
`resource_constraint`. Do not repeat the same call; do not widen the heap as a
first move. Read the exported files directly instead — assessment over a
concatenation of the exported scripts answers nearly every question cheaply:

- **Hostnames**: `https?://([a-z0-9.-]+\.[a-z]{2,})` — reveals auth, storage and
  API vendors.
- **Route strings**: `["'`](/(?:api|studio|app|auth)[\w/\-{}$]*)` — maps the
  real product surface.
- **Storage names** (from the capture's `storage` section):
  `firebaseLocalStorageDb` ⇒ Firebase Auth; `_gcl_ls`/`lastExternalReferrer` ⇒
  Google Click-ID attribution; `*_heartbeat_database` ⇒ Firebase.
- **Config catalogues**: client-side model/vendor tables with price fields are
  routinely shipped to the browser. Extract nested objects with a **brace
  matcher**, not `\{[^{}]*\}` — the regex silently misses every entry with a
  nested object and returns a single misleading row.

## Step 4 — verify every count before reporting it

Client bundles are full of false positives. Two real examples:

- A vendor name matching dozens of times was a **style-pack directory name**,
  not a vendor integration. Split the count by surrounding path before claiming
  usage.
- `mock` / `demo mode` hits were style copy ("phone mockups") and an explicitly
  labelled dev-only fixture banner — not evidence of a faked product.

Always print surrounding context for any keyword you intend to state as a fact.

## Reporting discipline

Separate **OBSERVED** (bytes served), **INFERRED** (e.g. OpenRouter-format IDs
⇒ a model gateway), and **UNKNOWN** (anything server-side: which models actually
run, whether a claimed language list is real ASR capacity). Never present a
marketing claim as verified because the bundle merely mentions the keyword.
