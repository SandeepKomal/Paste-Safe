// @ts-check
// Sizes the turning ring of cards in the hero. Each card is as wide as one side
// of the polygon the ring forms, so neighbouring cards meet without gaps.

export function wirePrivacyReel() {
  const stage = document.querySelector("[data-privacy-reel-stage]");
  if (!(stage instanceof HTMLElement)) return;
  const cards = /** @type {HTMLElement[]} */ ([...stage.querySelectorAll("[data-privacy-card]")]);
  const phone = matchMedia("(max-width: 600px)");
  const tablet = matchMedia("(max-width: 900px)");

  const layout = () => {
    const width = stage.clientWidth || 320;
    const radius = phone.matches
      ? Math.min(Math.max(width * 0.5, 150), 200)
      : Math.min(Math.max(width * 0.34, 190), tablet.matches ? 230 : 270);
    stage.style.setProperty("--privacy-reel-radius", `${radius.toFixed(2)}px`);
    stage.style.setProperty("--privacy-card-width", `${(2 * radius * Math.tan(Math.PI / cards.length) + 1.5).toFixed(2)}px`);
    stage.style.setProperty("--privacy-card-height", `${phone.matches ? 150 : tablet.matches ? 172 : 188}px`);
  };
  cards.forEach((card, i) => card.style.setProperty("--privacy-card-angle", `${(i * 360) / cards.length}deg`));
  layout();
  new ResizeObserver(layout).observe(stage);
}
