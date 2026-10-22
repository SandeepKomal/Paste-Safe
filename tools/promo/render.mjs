// Renders the film and the brush stencil the home page shows it through.
//   node tools/promo/render.mjs <out-dir> [--fps 30] [--only wide|tall] [--at 1,4.5,9]
//   node tools/promo/render.mjs <out-dir> --stencil
// --at saves single stills instead of a film. Needs Playwright's Chromium and an
// ffmpeg with libx264 and libvpx-vp9 on PATH. Copy the 4K files, and the
// stencil PNGs, into assets/film/.
import { chromium } from "playwright";
import { mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const args = process.argv.slice(2);
const out = args[0] ?? "promo-out";
const opt = name => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const fps = Number(opt("--fps") ?? 30);
const stills = opt("--at")?.split(",").map(Number);
// Rendered at half size with deviceScaleFactor 2, so frames come out at 4K.
const CUTS = { wide: { width: 1920, height: 1080 }, tall: { width: 1080, height: 1920 } };
const cuts = opt("--only") ? [opt("--only")] : Object.keys(CUTS);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
if (args.includes("--stencil")) {
  for (const cut of Object.keys(CUTS)) {
    const size = cut === "wide" ? { width: 1600, height: 900 } : { width: 900, height: 1600 };
    const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1.5 });
    await page.goto(new URL("stroke.html", import.meta.url).href);
    await page.screenshot({ path: join(out, `paste-safe-stroke-${cut}.png`), omitBackground: true });
    await page.close();
  }
  await browser.close();
  process.exit(0);
}
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
  const size = cut === "wide" ? "3840:2160" : "2160:3840";
  const base = join(out, `paste-safe-${cut}`);
  const vf = ["-vf", `scale=${size}:flags=lanczos,format=yuv420p`];
  execFileSync("ffmpeg", [...input, ...vf, "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-tune", "animation", "-profile:v", "high", "-movflags", "+faststart", "-an", `${base}.mp4`], { stdio: "inherit" });
  execFileSync("ffmpeg", [...input, ...vf, "-c:v", "libvpx-vp9", "-crf", "32", "-b:v", "0", "-row-mt", "1", "-an", `${base}.webm`], { stdio: "inherit" });
}
await browser.close();
