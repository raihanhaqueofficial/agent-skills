# Contributing

Contributions are welcome. Two rules matter more than the rest.

## Rule 1 — no personal or sensitive data. Ever.

This repository is public. Before you open a pull request, confirm it contains
**none** of the following:

- real names, personal email addresses, phone numbers, postal addresses;
- employer, client, or business-relationship details;
- API keys, tokens, passwords, `.env` contents, or private keys;
- absolute paths from your own machine (`/home/you/...`, `/Users/you/...`);
- internal URLs, private repository names, or unpublished plans;
- third-party personal data of any kind.

An automated check runs on every push and pull request. It blocks the obvious
cases; **it does not catch everything, so the responsibility is yours.**

## Rule 2 — no telemetry

A skill here must not instruct a usage beacon, "anonymous statistics", account
linking, or phoning home to a vendor. If you adapt work that does, **remove that
part and document the removal** in [`NOTICE`](NOTICE), as
`skills/html-to-video-local` does.

## Adding a skill

1. One directory per skill under `skills/<name>/`, containing `SKILL.md`.
2. `SKILL.md` starts with YAML frontmatter:
   ```yaml
   ---
   name: your-skill-name
   description: "Use when <trigger>. <what it does>."
   ---
   ```
   The `name` must match the directory name. Keep `description` under 60
   characters if your agent indexes descriptions — long ones get truncated.
3. Write it for an agent, not a human: state the trigger, the steps, the
   verification, and the pitfalls. Say what is unknown rather than implying
   certainty.
4. Put supporting files in `scripts/`, `templates/`, `references/` or
   `assets/` **inside the skill directory**.
5. If relative links reach outside the skill directory, mirror the layout
   rather than flattening it, or the links break on install.

## Licensing of contributions

By contributing you agree your contribution is licensed under the repository's
[MIT licence](LICENSE), and you confirm you have the right to submit it.

If your contribution adapts third-party work, say so in the pull request and
add the attribution to [`NOTICE`](NOTICE). Do not paste code you do not have
the right to relicense.

## Pull requests

- One skill or one fix per pull request.
- Explain what you verified and how. "It should work" is not verification.
- Note anything you could not verify.
