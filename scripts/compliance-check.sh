#!/usr/bin/env bash
# compliance-check.sh — the single source of truth for this repo's compliance gate.
# The GitHub Action calls this file, so local runs and CI cannot drift apart.
#
# Usage:  ./scripts/compliance-check.sh
# Exit:   0 = clean, 1 = violation

set -uo pipefail
cd "$(dirname "$0")/.." || exit 2
FAIL=0

# --- AUTHOR ALLOWLIST -------------------------------------------------------
# The author's own identity is deliberate and must appear: authorship,
# copyright, and the trademark claim. Mask it before scanning so it is never
# mistaken for a leaked third-party detail. Anything else personal is a leak.
mask_author() {
  sed -e 's/raihanhaqueofficial/__HANDLE__/g' \
      -e 's/raihanhaque7/__HANDLE__/g' \
      -e 's/Raihan Haque Official/__AUTHOR__/g' \
      -e 's/Raihan Haque/__AUTHOR__/g'
}
AUTHOR_RE='raihan|haque|diginess|dreamphonya|phoron|anant|credo|kolkata|thedrinkofmotivation|226390473'

say() { printf '%s\n' "$*"; }

# --- 1. personal / business / environment data ------------------------------
# NB: exclude this script itself - its own pattern list contains these words.
say "1. personal data"
HITS=$(grep -rniE "$AUTHOR_RE" . \
        --exclude-dir=.git --exclude-dir=.github \
        --exclude=compliance-check.sh 2>/dev/null \
      | mask_author \
      | grep -iE "$AUTHOR_RE" || true)
if [ -n "$HITS" ]; then
  say "   FAIL"; say "$HITS"; FAIL=1
else
  say "   ok"
fi

# absolute machine paths - placeholders like /home/you/ are documentation, not a leak
say "2. absolute machine paths"
AP=$(grep -rnE '/(home|Users)/[a-zA-Z0-9._-]+/' . \
      --exclude-dir=.git --exclude-dir=.github 2>/dev/null \
     | grep -vE '/(home|Users)/(you|user|username|yourname|your-user)/' || true)
if [ -n "$AP" ]; then
  say "   FAIL"; say "$AP"; FAIL=1
else
  say "   ok"
fi

# --- 3. secrets -------------------------------------------------------------
say "3. secrets"
SEC=$(grep -rniE 'sk-[a-zA-Z0-9]{16,}|ghp_[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16}|BEGIN [A-Z ]*PRIVATE KEY|xox[baprs]-[a-zA-Z0-9-]{10,}' . \
       --exclude-dir=.git 2>/dev/null || true)
if [ -n "$SEC" ]; then
  say "   FAIL"; say "$SEC"; FAIL=1
else
  say "   ok"
fi

# --- 4. stray email addresses ----------------------------------------------
say "4. email addresses"
EM=$(grep -rnoE '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' . \
      --exclude-dir=.git --exclude-dir=.github 2>/dev/null \
     | grep -viE 'example\.com|you@|user@|@users\.noreply\.github\.com' || true)
if [ -n "$EM" ]; then
  say "   FAIL"; say "$EM"; FAIL=1
else
  say "   ok"
fi

# --- 5. required compliance files ------------------------------------------
say "5. required files"
for f in LICENSE TRADEMARK.md DISCLAIMER.md \
         PRIVACY.md SECURITY.md CONTRIBUTING.md CODE_OF_CONDUCT.md CHANGELOG.md; do
  if [ ! -f "$f" ]; then say "   FAIL missing $f"; FAIL=1; fi
done
[ "$FAIL" -eq 0 ] && say "   ok"

# --- 6. no telemetry in any skill ------------------------------------------
# Look for the actual ENDPOINTS and SDK hosts, not the word "telemetry" - a
# skill that teaches you to detect and remove a beacon legitimately names it.
say "6. telemetry endpoints"
TL=$(grep -rniE 'https?://[a-z0-9.-]*(posthog|mixpanel|amplitude|segment\.io|sentry\.io|google-analytics|googletagmanager|hotjar|fullstory)\.|api[0-9]?\.vendor\.example\.com' \
       skills/ 2>/dev/null || true)
if [ -n "$TL" ]; then
  say "   FAIL"; say "$TL"; FAIL=1
else
  say "   ok"
fi

# --- 7. every skill well formed --------------------------------------------
say "7. skills"
for d in skills/*/; do
  n=$(basename "$d")
  f="$d/SKILL.md"
  if [ ! -f "$f" ]; then say "   FAIL $n: no SKILL.md"; FAIL=1; continue; fi
  head -1 "$f" | grep -q '^---' || { say "   FAIL $n: no frontmatter"; FAIL=1; continue; }
  fm=$(sed -n '2,14p' "$f" | grep -m1 '^name:' | sed 's/^name: *//; s/["'"'"']//g' | tr -d '\r')
  if [ "$fm" != "$n" ]; then say "   FAIL $n: name '$fm' != directory"; FAIL=1; else say "   ok $n"; fi
done

say ""
if [ "$FAIL" -eq 0 ]; then say "COMPLIANCE: PASS"; else say "COMPLIANCE: FAIL"; fi
exit "$FAIL"
