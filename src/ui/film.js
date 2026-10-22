// @ts-check
// The short film under the hero. The page holds a wide cut and a tall cut and
// CSS shows one of them. With motion on, the film is pinned full screen and
// scrolling moves it along, like a product page: scroll down and it plays,
// scroll back and it rewinds. With reduced motion it is an ordinary video that
// waits for the play button.

import { pinProgress } from "./motion.js";

/** Share of the pinned stretch before the film starts, while the headline shows. */
const LEAD = 0.07;
/** Seconds cut from the end, where the film fades out for its loop; scrolling stops on the end card. */
const TAIL = 1.1;

export function wireFilm() {
  const cuts = /** @type {HTMLVideoElement[]} */ ([...document.querySelectorAll("[data-film]")]);
  const section = /** @type {HTMLElement | null} */ (document.querySelector("[data-pin=film]"));
  const stage = section?.querySelector(".film__stage");
  const toggle = /** @type {HTMLButtonElement | null} */ (document.querySelector("[data-film-toggle]"));
  if (!section || !(stage instanceof HTMLElement) || !toggle || !cuts.length) return;
  const shown = () => cuts.find(v => v.offsetParent !== null);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) wireButton(cuts, toggle, shown);
  else wireScrub(section, stage, cuts, shown);
}

/** Pinned and scrubbed: the scroll position sets the film's time. */
function wireScrub(
  /** @type {HTMLElement} */ section,
  /** @type {HTMLElement} */ stage,
  /** @type {HTMLVideoElement[]} */ cuts,
  /** @type {() => HTMLVideoElement | undefined} */ shown,
) {
  let near = false;
  let frame = 0;
  let time = 0;
  const primed = new WeakSet();

  // Some mobile browsers only draw a seeked frame once the video has played, so
  // each cut is started and stopped once before it is scrubbed.
  const prime = (/** @type {HTMLVideoElement} */ v) => {
    if (primed.has(v)) return;
    primed.add(v);
    v.preload = "auto";
    v.play().then(() => v.pause(), () => {});
  };

  const tick = () => {
    frame = 0;
    const v = shown();
    if (!v || !near) return;
    prime(v);
    const p = pinProgress(section, innerHeight);
    stage.classList.toggle("is-rolling", p > LEAD * 0.6);
    const duration = Number.isFinite(v.duration) ? Math.max(0, v.duration - TAIL) : 0;
    const target = Math.min(1, Math.max(0, (p - LEAD) / (0.97 - LEAD))) * duration;
    // Ease toward the target so a fast flick of the wheel still looks smooth.
    time += (target - time) * 0.3;
    if (Math.abs(target - time) < 0.01) time = target;
    if (duration && !v.seeking && Math.abs(v.currentTime - time) > 0.02) v.currentTime = time;
    if (Math.abs(target - time) > 0.001 || v.seeking) frame = requestAnimationFrame(tick);
  };
  const schedule = () => (frame ||= requestAnimationFrame(tick));

  for (const v of cuts) {
    // The poster is a frame from the middle; the scrubbed film starts on its own first frame.
    v.removeAttribute("poster");
    v.loop = false;
    v.addEventListener("loadedmetadata", schedule);
    v.addEventListener("seeked", schedule);
  }
  new IntersectionObserver(([e]) => { near = e.isIntersecting; schedule(); }, { rootMargin: "100% 0px" }).observe(section);
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule);
}

/** Reduced motion: the film waits for the button, then plays on a loop while on screen. */
function wireButton(
  /** @type {HTMLVideoElement[]} */ cuts,
  /** @type {HTMLButtonElement} */ toggle,
  /** @type {() => HTMLVideoElement | undefined} */ shown,
) {
  const frame = /** @type {HTMLElement} */ (cuts[0].parentElement);
  let seen = false;
  let wanted = false;
  const show = (/** @type {boolean} */ playing) => {
    toggle.dataset.state = playing ? "playing" : "paused";
    toggle.setAttribute("aria-label", playing ? "Pause the film" : "Play the film");
  };
  const sync = () => {
    const active = shown();
    for (const v of cuts) if (v !== active && !v.paused) v.pause();
    if (!active) return;
    if (wanted && seen && !document.hidden) active.play().catch(() => show(false));
    else active.pause();
  };
  for (const v of cuts) {
    v.addEventListener("play", () => show(true));
    v.addEventListener("pause", () => { if (v === shown()) show(false); });
  }
  toggle.addEventListener("click", () => {
    wanted = shown()?.paused ?? false;
    sync();
  });
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; sync(); }, { threshold: 0.4 }).observe(frame);
  document.addEventListener("visibilitychange", sync);
  matchMedia("(max-width: 640px)").addEventListener("change", sync);
  show(false);
}
