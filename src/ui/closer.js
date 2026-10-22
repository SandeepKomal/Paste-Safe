// @ts-check
// Arrow buttons for the "Take a closer look" gallery. The track also scrolls by
// touch, trackpad and keyboard on its own; the arrows step one card at a time.

export function wireCloser() {
  const track = document.querySelector("#closerTrack");
  if (!(track instanceof HTMLElement)) return;
  const arrows = /** @type {HTMLButtonElement[]} */ ([...document.querySelectorAll("[data-closer]")]);
  const step = () => (track.querySelector(".closer__card")?.getBoundingClientRect().width ?? 300) + 20;
  const sync = () => {
    const end = track.scrollWidth - track.clientWidth - 2;
    for (const a of arrows) a.disabled = Number(a.dataset.closer) < 0 ? track.scrollLeft <= 2 : track.scrollLeft >= end;
  };
  for (const a of arrows) {
    a.addEventListener("click", () => track.scrollBy({ left: Number(a.dataset.closer) * step(), behavior: "smooth" }));
  }
  track.addEventListener("scroll", sync, { passive: true });
  addEventListener("resize", sync);
  sync();
}
