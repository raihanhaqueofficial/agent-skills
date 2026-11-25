# Security policy

## Reporting

Report a vulnerability through GitHub's **private vulnerability reporting** on
this repository (Security → Report a vulnerability). Please do not open a
public issue for a security problem.

Include: what you found, the affected file, how to reproduce it, and the impact
you believe it has.

## Scope

This repository contains **documentation and scripts**, not a hosted service.
The realistic risks are:

- a script that executes something unsafe;
- a skill that suggests an insecure practice;
- a dependency or install instruction that pulls something untrustworthy;
- **a leak of personal or sensitive data into this repository.**

That last one is treated as a security issue. See
[CONTRIBUTING.md](CONTRIBUTING.md) for the rule that exists to prevent it.

## What is out of scope

Vulnerabilities in third-party tools these skills describe (`ffmpeg`, `yt-dlp`,
Chromium, Whisper, and so on). Report those upstream.

## Response

This is a small project maintained alongside other work. Reports are read, and
security corrections are prioritised over feature work — but there is no
guaranteed response time.
