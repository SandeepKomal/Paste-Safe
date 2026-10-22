// @ts-check
// The short film under the hero. The page holds a wide cut and a tall cut and
// CSS shows one of them. The shown cut plays, muted, while it is on screen, and
// the button pauses or plays it. When the visitor prefers reduced motion it
// waits on its first frame until they press play.

export function wireFilm() {
  const cuts = /** @type {HTMLVideoElement[]} */ ([...document.querySelectorAll("[data-film]")]);
  const toggle = /** @type {HTMLButtonElement | null} */ (document.querySelector("[data-film-toggle]"));
  const frame = cuts[0]?.parentElement;
  if (!frame || !toggle) return;
  let seen = false;
  let wanted = !matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; sync(); }, { threshold: 0.4 }).observe(frame);
  document.addEventListener("visibilitychange", sync);
  matchMedia("(max-width: 640px)").addEventListener("change", sync);
  show(false);
}
