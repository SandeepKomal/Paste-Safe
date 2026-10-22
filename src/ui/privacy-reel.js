// @ts-check

/**
 * Keep the 10 upright faces joined edge-to-edge around the rotating reel.
 * The tangent width matches the chord width for the current radius, preventing seams.
 */
export function wirePrivacyReel() {
  const stage = document.querySelector("[data-privacy-reel-stage]");
  if (!(stage instanceof HTMLElement)) return;

  const reel = stage.querySelector("[data-privacy-reel]");
  if (!(reel instanceof HTMLElement)) return;

  const cards = Array.from(reel.querySelectorAll("[data-privacy-card]"))
    .filter(card => card instanceof HTMLElement);
  if (cards.length < 3) return;

  const mobileQuery = window.matchMedia("(max-width: 600px)");
  const tabletQuery = window.matchMedia("(max-width: 900px)");

  const layoutReel = () => {
    const width = stage.getBoundingClientRect().width || 320;
    const mobile = mobileQuery.matches;
    const tablet = tabletQuery.matches;
    const radius = Math.max(
      mobile ? 134 : 150,
      Math.min(mobile ? 156 : tablet ? 205 : 250, width * (mobile ? 0.41 : 0.34)),
    );
    const height = mobile ? 126 : tablet ? 148 : 172;
    const cardWidth = 2 * radius * Math.tan(Math.PI / cards.length) + 1.5;

    stage.style.setProperty("--privacy-reel-radius", `${radius.toFixed(2)}px`);
    stage.style.setProperty("--privacy-card-width", `${cardWidth.toFixed(2)}px`);
    stage.style.setProperty("--privacy-card-height", `${height}px`);
    cards.forEach((card, index) => {
      card.style.setProperty("--privacy-card-angle", `${(index * 360) / cards.length}deg`);
    });
  };

  layoutReel();
  new ResizeObserver(layoutReel).observe(stage);
}
