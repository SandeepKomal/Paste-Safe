// @ts-check
// The "Take a closer look" gallery. It moves on by one card every few seconds
// while it is on screen, holds still under the pointer or keyboard focus, and
// stops for good once the visitor scrolls it themselves or presses pause. The
// track also scrolls by touch, trackpad and keyboard; the arrows step one card.

const DELAY = 4500;

export function wireCloser() {
  const track = document.querySelector("#closerTrack");
  if (!(track instanceof HTMLElement)) return;
  const arrows = /** @type {HTMLButtonElement[]} */ ([...document.querySelectorAll("[data-closer]")]);
  const play = /** @type {HTMLButtonElement | null} */ (document.querySelector("[data-closer-play]"));
  const gallery = track.closest(".closer") ?? track;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const step = () => (track.querySelector(".closer__card")?.getBoundingClientRect().width ?? 300) + 20;
  const end = () => track.scrollWidth - track.clientWidth - 2;
  const sync = () => {
    for (const a of arrows) a.disabled = Number(a.dataset.closer) < 0 ? track.scrollLeft <= 2 : track.scrollLeft >= end();
  };

  let timer = 0, seen = false, held = false, stopped = false;
  const run = () => {
    clearInterval(timer);
    timer = 0;
    if (play) play.hidden = reduce.matches;
    if (!stopped && seen && !held && !reduce.matches && !document.hidden) {
      timer = setInterval(() => track.scrollTo({ left: track.scrollLeft >= end() ? 0 : track.scrollLeft + step(), behavior: "smooth" }), DELAY);
    }
  };
  const stop = () => {
    stopped = true;
    if (play) {
      play.dataset.state = "paused";
      play.setAttribute("aria-label", "Play the gallery");
    }
    run();
  };

  for (const a of arrows) {
    a.addEventListener("click", () => {
      stop();
      track.scrollBy({ left: Number(a.dataset.closer) * step(), behavior: "smooth" });
    });
  }
  play?.addEventListener("click", () => {
    if (stopped) {
      stopped = false;
      delete play.dataset.state;
      play.setAttribute("aria-label", "Pause the gallery");
      run();
    } else stop();
  });
  for (const type of ["pointerdown", "wheel", "keydown"]) track.addEventListener(type, stop, { passive: true });
  gallery.addEventListener("pointerenter", () => { held = true; run(); });
  gallery.addEventListener("pointerleave", () => { held = false; run(); });
  gallery.addEventListener("focusin", () => { held = true; run(); });
  gallery.addEventListener("focusout", () => { held = false; run(); });
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; run(); }, { threshold: 0.5 }).observe(track);
  document.addEventListener("visibilitychange", run);
  reduce.addEventListener("change", run);

  track.addEventListener("scroll", sync, { passive: true });
  addEventListener("resize", sync);
  sync();
  run();
}
