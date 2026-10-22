// Renders scene.html to video frames, then encodes them with ffmpeg.
//   node tools/promo/render.mjs <out-dir> [--fps 30] [--only landscape|portrait] [--at 1,4.5,9]
// --at saves single stills instead of a film. Needs Playwright's Chromium and an
// ffmpeg with libx264 and libvpx-vp9 on PATH.
import { chromium } from "playwright";
import { mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const args = process.argv.slice(2);
const out = args[0] ?? "promo-out";
const opt = name => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const fps = Number(opt("--fps") ?? 30);
const stills = opt("--at")?.split(",").map(Number);
const CUTS = { landscape: { width: 1920, height: 1080 }, portrait: { width: 1080, height: 1350 } };
const cuts = opt("--only") ? [opt("--only")] : Object.keys(CUTS);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
for (const cut of cuts) {
  const page = await browser.newPage({ viewport: CUTS[cut], deviceScaleFactor: 2 });
  await page.goto(new URL("scene.html", import.meta.url).href);
  await page.evaluate(() => window.ready);
  const dir = join(out, `${cut}-frames`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const duration = await page.evaluate(() => window.DURATION);
  const times = stills ?? Array.from({ length: Math.round(duration * fps) }, (_, i) => i / fps);
  for (const [i, t] of times.entries()) {
    await page.evaluate(t => window.render(t), t);
    await page.screenshot({ path: join(dir, `${String(i).padStart(4, "0")}.png`) });
  }
  await page.close();
  if (stills) continue;
  const input = ["-y", "-framerate", String(fps), "-i", join(dir, "%04d.png")];
  const sizes = cut === "landscape" ? [["4k", "3840:2160"], ["1440", "2560:1440"]] : [["4k", "2160:2700"], ["web", "1080:1350"]];
  for (const [name, size] of sizes) {
    const base = join(out, `paste-safe-${cut}-${name}`);
    const vf = ["-vf", `scale=${size}:flags=lanczos,format=yuv420p`];
    execFileSync("ffmpeg", [...input, ...vf, "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-tune", "animation", "-profile:v", "high", "-movflags", "+faststart", "-an", `${base}.mp4`], { stdio: "inherit" });
    execFileSync("ffmpeg", [...input, ...vf, "-c:v", "libvpx-vp9", "-crf", "32", "-b:v", "0", "-row-mt", "1", "-an", `${base}.webm`], { stdio: "inherit" });
  }
}
await browser.close();
