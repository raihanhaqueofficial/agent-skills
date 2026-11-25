#!/usr/bin/env node
/**
 * renderer.mjs — local HTML -> video, offline.
 *
 * Contract (same principle as HyperFrames, none of the vendor parts):
 *   - the page defines `window.__timeline(t)` which sets ALL visible state
 *     as a pure function of time t (seconds). No Date.now(), no unseeded
 *     Math.random(), no network, no timers.
 *   - the renderer seeks the paused timeline frame by frame and screenshots.
 *   Because it seeks rather than records, every render is identical.
 *
 * Usage:
 *   node renderer.mjs --html demo/index.html --out out/demo.mp4 \
 *        --w 1080 --h 1920 --fps 30 --duration 6 [--audio voice.mp3]
 *
 * No network access is used or required.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((a, v, i, arr) => {
    if (v.startsWith("--")) a.push([v.slice(2), arr[i + 1]]);
    return a;
  }, [])
);
const num = (k, d) => (args[k] !== undefined ? Number(args[k]) : d);

const HTML = args.html;
const OUT = args.out ?? "out/video.mp4";
const W = num("w", 1080), H = num("h", 1920), FPS = num("fps", 30);
const DURATION = num("duration", 6);
const AUDIO = args.audio ?? null;
const QUALITY = num("quality", 19);
const KEEP = !!args.keep;
if (!HTML) { console.error("--html is required"); process.exit(2); }

const chromePath = fs.readFileSync(new URL("../CHROME_PATH", import.meta.url), "utf8").trim();
const framesDir = path.join(path.dirname(OUT), "_frames_" + path.basename(OUT, ".mp4"));
fs.rmSync(framesDir, { recursive: true, force: true });
fs.mkdirSync(framesDir, { recursive: true });
fs.mkdirSync(path.dirname(OUT), { recursive: true });

// ---- determinism lint (the guard that makes the render reproducible) ----
// strip comments first, or the lint fires on its own documentation
const html = fs.readFileSync(HTML, "utf8")
  .replace(/<!--[\s\S]*?-->/g, "")        // html comments
  .replace(/\/\*[\s\S]*?\*\//g, "")       // block comments
  .replace(/^\s*\/\/.*$/gm, "");          // line comments
const lint = [];
if (/Date\.now\s*\(/.test(html)) lint.push("Date.now() found - output will not be reproducible");
if (/Math\.random\s*\(\s*\)/.test(html)) lint.push("unseeded Math.random() found - output will not be reproducible");
if (/https?:\/\//.test(html.replace(/https?:\/\/www\.w3\.org/g, ""))) lint.push("remote URL found - the render should be offline");
if (!/__timeline/.test(html)) lint.push("no window.__timeline(t) defined - the renderer cannot seek the timeline");
for (const l of lint) console.warn("  LINT:", l);

const puppeteer = (await import("puppeteer-core")).default;
const browser = await puppeteer.launch({
  executablePath: chromePath,
  args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars",
         "--disable-dev-shm-usage", "--force-color-profile=srgb",
         "--font-render-hinting=none"],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
await page.goto("file://" + path.resolve(HTML), { waitUntil: "load" });
await page.evaluate(() => document.fonts?.ready);

const total = Math.round(DURATION * FPS);
console.log(`rendering ${total} frames at ${W}x${H} @${FPS}fps -> ${framesDir}`);
const t0 = Date.now();
for (let i = 0; i < total; i++) {
  const t = i / FPS;
  await page.evaluate(
    (t) => new Promise((r) => { window.__timeline(t); requestAnimationFrame(() => requestAnimationFrame(r)); }),
    t
  );
  await page.screenshot({ path: path.join(framesDir, `f${String(i).padStart(5, "0")}.png`) });
  if (i % 60 === 0) console.log(`  ${i}/${total}`);
}
await browser.close();
const secs = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`captured in ${secs}s (${(total / secs).toFixed(1)} fps effective)`);

// ---- assemble ----
const cmd = ["-y", "-framerate", String(FPS), "-i", path.join(framesDir, "f%05d.png")];
if (AUDIO) cmd.push("-i", AUDIO);
cmd.push("-c:v", "libx264", "-preset", "medium", "-crf", String(QUALITY),
         "-pix_fmt", "yuv420p");
if (AUDIO) cmd.push("-c:a", "aac", "-b:a", "192k", "-ar", "48000",
                    "-filter_complex", "[1:a]loudnorm=I=-14:TP=-1.5:LRA=11[a]",
                    "-map", "0:v", "-map", "[a]", "-shortest");
cmd.push("-movflags", "+faststart", OUT);
const ff = spawnSync("ffmpeg", ["-loglevel", "error", ...cmd], { encoding: "utf8" });
if (ff.status !== 0) { console.error(ff.stderr); process.exit(1); }

if (!KEEP) fs.rmSync(framesDir, { recursive: true, force: true });
const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries",
  "stream=codec_name,width,height,r_frame_rate,sample_rate",
  "-show_entries", "format=duration,size", "-of", "default=nw=1", OUT],
  { encoding: "utf8" });
console.log(probe.stdout.trim());
console.log("OUT:", OUT);
