// @ts-check
// The short film under the hero. The page holds a wide cut and a tall cut and
// CSS shows one of them, behind a brush-stroke stencil. The shown cut plays,
// muted, while it is on screen, and the button pauses or plays it. With motion
// on, the stage is pinned while the section scrolls by: the stroke stretches
// open until the film fills the screen, then the headlines rise over it. When
// the visitor prefers reduced motion, the stroke stays put and the film waits
// for the button.

const clamp01 = (/** @type {number} */ n) => Math.min(1, Math.max(0, n));
const smooth = (/** @type {number} */ n) => n * n * (3 - 2 * n);
/** How much the stroke grows once fully open: enough for its solid middle to cover the screen. */
const OPEN = { wide: 1.05, tall: 2.1 };

export function wireFilm() {
  const cuts = /** @type {HTMLVideoElement[]} */ ([...document.querySelectorAll("[data-film]")]);
  const toggle = /** @type {HTMLButtonElement | null} */ (document.querySelector("[data-film-toggle]"));
  const pin = /** @type {HTMLElement | null} */ (document.querySelector("[data-film-pin]"));
  const stage = pin?.querySelector(".film__stage");
  if (!pin || !(stage instanceof HTMLElement) || !toggle || !cuts.length) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let seen = false;
  let wanted = !reduce;

  const shown = () => cuts.find(v => v.offsetParent !== null);
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
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; sync(); }, { threshold: 0.25 }).observe(stage);
  document.addEventListener("visibilitychange", sync);
  matchMedia("(max-width: 640px)").addEventListener("change", sync);
  show(false);
  if (!reduce) wireStretch(pin, stage);
}

/** Pinned scroll: the stroke opens over the first part, then each headline rises through the screen. */
function wireStretch(/** @type {HTMLElement} */ pin, /** @type {HTMLElement} */ stage) {
  const lines = /** @type {HTMLElement[]} */ ([...stage.querySelectorAll("[data-film-line]")]);
  const phone = matchMedia("(max-width: 640px)");
  let frame = 0;
  const update = () => {
    frame = 0;
    const r = pin.getBoundingClientRect();
    const p = clamp01(-r.top / Math.max(1, r.height - innerHeight));
    // The stroke opens over the first half of the pinned stretch, about one screen of scrolling.
    const open = smooth(clamp01(p / 0.48));
    stage.style.setProperty("--stroke", (1 + open * OPEN[phone.matches ? "tall" : "wide"]).toFixed(3));
    lines.forEach((line, i) => {
      // Then the headlines rise one at a time, each through its own share of the rest.
      const k = clamp01((p - 0.48 - i * 0.17) / 0.17);
      line.style.opacity = Math.min(clamp01(k / 0.3), clamp01((1 - k) / 0.3)).toFixed(3);
      line.style.transform = `translateY(calc(-50% + ${((0.5 - k) * 9).toFixed(2)}vh))`;
    });
  };
  const schedule = () => (frame ||= requestAnimationFrame(update));
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule);
  update();
}
