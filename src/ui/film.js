// @ts-check
// The short film under the hero. The page holds a wide cut and a tall cut and
// CSS shows one of them. The shown cut plays, muted, while it is on screen, and
// the button pauses or plays it. When the visitor prefers reduced motion it
// waits on its first frame until they press play. The sources have no URL until
// the film is on screen, or the visitor scrolls while it is about a screen away,
// because some browsers fetch video whatever its preload says; then only the
// shown cut gets them, so visitors who never get here download none.

export function wireFilm() {
  const cuts = /** @type {HTMLVideoElement[]} */ ([...document.querySelectorAll("[data-film]")]);
  const toggle = /** @type {HTMLButtonElement | null} */ (document.querySelector("[data-film-toggle]"));
  const frame = cuts[0]?.parentElement;
  const section = frame?.closest("section");
  if (!frame || !section || !toggle) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  let seen = false;
  let near = false;
  let moved = false;
  let wanted = !reduce.matches;

  const shown = () => cuts.find(v => v.offsetParent !== null);
  const show = (/** @type {boolean} */ playing) => {
    toggle.dataset.state = playing ? "playing" : "paused";
    toggle.setAttribute("aria-label", playing ? "Pause the film" : "Play the film");
  };
  const attach = (/** @type {HTMLVideoElement} */ v) => {
    const sources = /** @type {HTMLSourceElement[]} */ ([...v.querySelectorAll("source[data-src]")]);
    if (!sources.length) return;
    for (const s of sources) {
      s.src = s.dataset.src ?? "";
      s.removeAttribute("data-src");
    }
    v.load();
  };
  const sync = () => {
    const active = shown();
    for (const v of cuts) if (v !== active && !v.paused) v.pause();
    if (!active) return;
    if (seen || (near && moved)) attach(active);
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
  new IntersectionObserver(([e]) => { near = e.isIntersecting; sync(); }, { rootMargin: "100% 0px" }).observe(section);
  addEventListener("scroll", () => {
    const r = section.getBoundingClientRect();
    moved = true;
    near = r.top < innerHeight * 2 && r.bottom > -innerHeight;
    sync();
  }, { once: true, passive: true });
  document.addEventListener("visibilitychange", sync);
  matchMedia("(max-width: 640px)").addEventListener("change", sync);
  show(false);
}
