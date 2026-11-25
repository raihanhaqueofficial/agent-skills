---
name: html-to-video-local
description: "Use when rendering HTML to video offline."
version: 1.0.0
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
  because the upstream tool that does this well (HyperFrames) phones home — see
  Provenance. This one makes no network calls at all.
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

## Motion doctrine

Adapted from the HyperFrames project's published motion doctrine, with every
vendor, account, CLI and telemetry instruction removed. The craft is theirs; the
local renderer is ours.

### The seam law

- **Cut at peak velocity, matching direction AND speed on both sides.** A cut
  taken while things move reads as one continuous camera move; a cut taken at
  rest reads as a new slide.
- **Partial travel, ~12% of frame** — not a full slide. See the pitfall below
  for why a full slide is wrong.
- The eye's momentum must not die at the boundary. One move across it, not two
  animations that happen to abut.
- **Motion must PERFORM, not breathe.** No idle wobble — no drifting particles,
  no slow pulsing, no ambient float. If an element is not doing something
  meaningful it should be still. Hold **stillness before a climax** so the
  landing has contrast.
- **How you exit determines how you enter.** Choose the exit before authoring
  the next entry.

### The velocity-matched cut (the recipe that works)

Mirrored power-4 pair — the outgoing side accelerates to the cut, the incoming
side decelerates away from it, and their speeds match exactly at the boundary:

```js
const easeInQuart  = p => p * p * p * p;          // accelerating
// incoming:  x = -TRAVEL * p^4        -> |dx/dp| = 4 at p = 1
// outgoing:  x = +TRAVEL * (1-p)^4    -> |dx/dp| = 4 at p = 0
const TRAVEL = 0.12;   // 12% of frame width

if (t < T_CUT) {
  const p = clamp01((t - (T_CUT - 0.5)) / 0.5);
  show(a); hide(b);
  a.style.transform = `translateX(${-TRAVEL * W * easeInQuart(p)}px)`;
} else {
  const p = clamp01((t - T_CUT) / 0.5);
  hide(a); show(b);
  b.style.transform = `translateX(${TRAVEL * W * Math.pow(1 - p, 4)}px)`;
}
```

Note it is a **hard cut** (`display` swap) inside the motion — not an overlap.

### Other seams worth having

- **Zoom-through** (Z toward viewer): progressing deeper into the same thought
  within a scene.
- **Inverse zoom-through** (Z away): something bigger lands — an arrival beat.
- **Rack-focus blur-cut**: the one cut you want SEEN. Scale blur to element
  size — roughly 10px for text, 18–20px for a full-frame change.
- **Waterfall entry**: staggered arrival cascade for a title or segment opener,
  staggered by element weight, no seam involved.

### The white-flash guard (verified production bug)

During any seam where the two scenes' summed opacity dips below 1, whatever is
behind them shows through. With no opaque root, the renderer composites that dip
over its default **white** page — a white flash at every cut, glaring on a dark
film.

**Always paint the stage opaque:**

```css
#root { background: var(--canvas-deep, #17181C); }
```

### Captions are an overlay, never a reserved band

Do **not** leave a dead band at the bottom or shift content up to "make room" for
captions. Composite them on top, and let the composition keep its full frame and
stay centred on the true vertical centre. Every spoken phrase is one of three
things: **drop** (filler, not shown), **rail** (the default verbatim subtitle,
with an optional inline emphasis on a punch word), or **embed** (a promoted
peak — one big word behind the subject). Embed is scarce; rail is the default.

### Cursor as eye-carrier

If a scene reads dead, an oversized pointer is the cheapest high-yield motion:
it enters from off-screen, travels to the next point of interest, clicks to
*cause* the next thing, and leaves. Full-frame size is about `7cqw` (~134px at
1920); smaller than ~`4.6cqw` and it disappears at video scale. Give it
`pointer-events: none` and a soft drop-shadow.

## Pitfalls (all verified here)

- **A full slide-through blanks the midpoint.** With two centred full-screen
  scenes translating a full frame width, at the exact middle *both* are
  half-off — the frame shows neither one's content, a dead beat. Use partial
  travel (~12%) plus a hard cut at peak velocity instead. Cost: one wasted
  render.
- **Lint must strip comments before scanning.** A lint that greps the raw file
  fires on its own explanatory comment ("no `Date.now()` here") and reports a
  false non-determinism warning. Strip `<!-- -->`, `/* */` and `//` first.
- **`--keep` takes a value.** `--keep` alone parses falsy and the frames are
  deleted before you can inspect them, which silently defeats the point of
  passing it.
- **Load fonts by relative path.** The page is opened over `file://`, so a
  local `@font-face` with a relative `src: url("X.ttf")` works and keeps the
  render offline. Copy the TTF next to the HTML.
- **Wait two animation frames after seeking** (`requestAnimationFrame` nested)
  before screenshotting, or you may capture the previous frame's paint.

## Verify before delivering

1. Read the lint output — zero warnings means it is reproducible.
2. Render the same HTML twice and compare the frame SHA-256. Identical = good.
3. `ffprobe` the output (resolution, fps, duration).
4. Extract frames **by `-ss` timestamp** and actually look at them: one before a
   seam, one just after, one settled. Confirm no blank frame and no white flash.

## Provenance

The motion doctrine here is adapted from the HyperFrames project
(github.com/heygen-com/hyperframes, **Apache-2.0**), which permits adaptation
with attribution. **Removed:** the CLI invocation, the account-linked usage
beacon, plan-usage reporting, the HeyGen API/OAuth client, and registry/CDN
references. **Added:** a local Puppeteer+ffmpeg renderer, the determinism lint,
and the verified pitfalls. The upstream skills are quarantined at
`<quarantine-dir>/`.
