---
name: html-to-video-local
description: "Use when rendering HTML to video offline."
version: 1.1.0
author: Hermes Agent
license: Apache-2.0 (adapted work - see Provenance)
platforms: [linux]
metadata:
  hermes:
    tags: [video, html, motion, css, render, deterministic, offline, no-telemetry]
    related_skills: [short-form-performance-standards, short-form-performance-standards, headless-video-pipeline]
---

# HTML to video, locally

## When to Use

**Check the already-installed video skills before reaching for this.**
`kinetic-typography` documents the same freeze-harness idea (`?t=N` seek) and
ships `scripts/seek-shot.sh` + `scripts/contact-sheet.sh` for deterministic
stills; `caption-animation`, `short-form-video` and `ffmpeg-skill` cover
captions, pacing and edit passes. Reach for this renderer only when the job is a
full **video** rendered from HTML — the stills / screenshot case is already
covered, and standing up a second renderer for it leaves two systems to
maintain.

- Motion graphics, kinetic typography, title cards, captions and overlays where
  the layout is easier to express in HTML/CSS than in PIL or React.
- Any render that must be **offline and telemetry-free**. This skill exists
  because the well-known hosted tools in this space report usage home. This one makes no network calls at all.
- Video for the motivation/short-form pipelines: 9:16, brand-locked type.

## The guarantee

No network access is used or required. Nothing is reported anywhere. If you add
any of that, you have broken the point of this skill.

## Toolchain (already installed)

- Renderer: `scripts/renderer.mjs`
- Chromium: `~/.cache/remotion/chrome-headless-shell/linux64/chrome-headless-shell-linux64/chrome-headless-shell`
  (path also cached in `CHROME_PATH`)
- `puppeteer-core` in `./` (CDP client only — it does
  not download a browser)
- ffmpeg on PATH for assembly.

```bash
cd .
node renderer.mjs --html demo/index.html --out out/v.mp4 \
     --w 1080 --h 1920 --fps 30 --duration 6 [--audio voice.mp3] [--keep 1]
```

`--keep 1` retains the PNG frames for inspection (it takes a value; a bare
`--keep` is falsy and the frames get cleaned up).

## The contract — what makes a render reproducible

The page defines **`window.__timeline(t)`**, which sets ALL visible state as a
pure function of time in seconds. The renderer *seeks* that paused timeline
frame by frame rather than recording, so every render is byte-identical.

**Never use** `Date.now()`, unseeded `Math.random()`, timers, `repeat: -1`, or a
network fetch. The renderer lints for these and warns, so you find out before
paying for a render. Proven: two independent renders produced the **same frame
SHA-256 and the same MP4 hash**.

Animate with plain CSS transforms written from JS, or GSAP with a paused
timeline seeked to `t`. Either way, `t` fully determines the frame.

## Cutting between beats

The difference between a piece that feels edited and one that feels assembled is
almost entirely in how the joins are timed.

- **Switch while things are still moving.** Make the change at the moment of
  highest speed, not after everything has settled. A change made mid-motion reads
  as one continuous move; a change made at rest reads as a new slide arriving.
- **Carry the motion through the join.** Both sides should be travelling the same
  direction, at the same speed, at the instant of the change. That shared velocity
  is what the eye follows across the boundary.
- **Travel a fraction of the frame, not all of it.** Roughly 12% of the frame
  width is enough. A full-width slide spends its middle with neither shot properly
  on screen — a dead beat.
- **One movement across the join, not two animations that happen to meet.**
- **Movement should be doing something.** No ambient float, no slow pulsing, no
  idle wobble to fill space. If an element is not conveying something, leave it
  still — and hold a beat of stillness before a payoff, so the landing reads as a
  change rather than more of the same.

### The velocity-matched cut

A matched pair of easing curves. The outgoing side accelerates into the change;
the incoming side begins fast and decelerates away from it. Their speeds are equal
at the boundary, which is the whole trick:

```js
const accelerate = p => p * p * p * p;            // slow start, fast finish
// outgoing:  x = -TRAVEL * p^4        -> speed 4 at p = 1
// incoming:  x = +TRAVEL * (1-p)^4    -> speed 4 at p = 0
const TRAVEL = 0.12;   // 12% of frame width

if (t < T_CUT) {
  const p = clamp01((t - (T_CUT - 0.5)) / 0.5);
  show(a); hide(b);
  a.style.transform = `translateX(${-TRAVEL * W * accelerate(p)}px)`;
} else {
  const p = clamp01((t - T_CUT) / 0.5);
  hide(a); show(b);
  b.style.transform = `translateX(${TRAVEL * W * Math.pow(1 - p, 4)}px)`;
}
```

Note that this is a **hard swap** inside the motion — not an overlap, not a fade.

### Other joins worth knowing

- **Depth push.** Scale toward the viewer to continue a thought within a scene;
  scale away to signal that something larger has landed. Good for a payoff beat.
- **Focus-pull.** Blur the outgoing frame and sharpen the incoming one across the
  same window. The most deliberate join available — use it once, where you want it
  noticed. Scale blur to what is on screen: about 10px for text, 18-20px for a
  full-frame change.
- **Staggered arrival.** For a title or an opener, bring elements in one after
  another by weight — heaviest first, lightest last. No join involved at all.

### The white-flash guard (a real bug, verified)

During any join where the two layers' combined opacity dips below 1, whatever sits
behind them shows through. With no opaque root element, the renderer composites
that gap over its default **white** page — producing a white flash on every cut,
which is glaring on a dark film.

**Always paint the stage opaque:**

```css
#root { background: var(--canvas-deep, #17181C); }
```

### Captions sit on top, they do not reserve space

Do **not** leave a dead band at the bottom or push content upward to make room.
Composite captions over the frame and let the composition keep its full height,
centred on the true vertical centre.

Every spoken phrase is one of three things: **cut** (filler — never shown),
**shown** (the default: a clean subtitle, optionally with one emphasised word), or
**lifted** (a promoted peak — a single large word placed behind the subject).
Lifted is scarce by design; shown is the default.

### A pointer as a guide

If a scene reads as static, an oversized pointer is the cheapest way to give it
movement and meaning: it enters from off-screen, travels to the next point of
interest, clicks to *cause* what happens next, and leaves. Size it around `7cqw` of
the frame (~134px at 1920) — below ~`4.6cqw` it vanishes at video scale. Add
`pointer-events: none` and a soft drop-shadow.

## Pitfalls

- **A full-width slide blanks the midpoint.** With two centred full-screen layers
  travelling a whole frame width, both are half off-screen at the middle — the
  frame shows neither. Use partial travel plus a hard swap instead. Cost: one
  wasted render.
- **A lint must strip comments before scanning.** A checker that reads the raw
  file fires on its own explanatory comment (a line reading "no `Date.now()`
  here") and reports a false non-determinism warning. Strip `<!-- -->`, `/* */`
  and `//` first.
- **`--keep` takes a value.** A bare `--keep` parses falsy and the frames are
  deleted before you can inspect them, silently defeating the point of passing it.
- **Load fonts by relative path.** The page opens over `file://`, so a local
  `@font-face` with a relative `src: url("X.ttf")` works and keeps the render
  offline. Copy the font next to the HTML.
- **Wait two animation frames after seeking** before screenshotting, or you may
  capture the previous paint.

## Verify before delivering

1. Read the lint output — zero warnings means it is reproducible.
2. Render the same HTML twice and compare a frame's SHA-256. Identical is correct.
3. `ffprobe` the output: resolution, fps, duration.
4. Extract frames **by `-ss` timestamp** and look at them: one before a join, one
   just after, one settled. Confirm no blank frame and no white flash.

## Provenance

Written from first principles and verified locally. Seeking a paused timeline and
screenshotting each position is a standard rendering technique; the implementation
here is original, and the toolchain is local-only by design.
