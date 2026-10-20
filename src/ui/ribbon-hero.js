// @ts-check

/**
 * Add lightweight pointer/scroll parallax to the local SVG privacy ribbon.
 * Uses only this page's SVG/CSS; there is no remote graphic or rendering runtime.
 */
export function wireRibbonHero() {
  const hero = document.querySelector(".privacy-visual");
  if (!(hero instanceof HTMLElement)) return;

  const motionField = hero.querySelector(".privacy-visual__motion-field");
  if (!(motionField instanceof SVGGraphicsElement)) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let pointerX = 0;
  let pointerY = 0;
  let frame = 0;

  const clamp = (/** @type {number} */ value, min, max) => Math.max(min, Math.min(max, value));
  const render = () => {
    frame = 0;
    const rect = hero.getBoundingClientRect();
    const travel = rect.height + window.innerHeight;
    const progress = travel > 0 ? clamp((window.innerHeight - rect.top) / travel, 0, 1) : 0;
    const moveX = reducedMotion.matches ? 0 : pointerX * 10 + (progress - 0.5) * 20;
    const moveY = reducedMotion.matches ? 0 : pointerY * 7 + Math.sin(progress * Math.PI * 2) * 5;
    const scale = reducedMotion.matches ? 1 : 1 + Math.sin(progress * Math.PI) * 0.018;

    hero.style.setProperty("--ribbon-shift-x", `${moveX.toFixed(2)}px`);
    hero.style.setProperty("--ribbon-shift-y", `${moveY.toFixed(2)}px`);
    hero.style.setProperty("--ribbon-scale", scale.toFixed(3));
    hero.style.setProperty("--ribbon-scroll-progress", progress.toFixed(4));
  };

  const schedule = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(render);
  };

  hero.addEventListener("pointermove", event => {
    const rect = hero.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointerX = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
    pointerY = clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
    schedule();
  }, { passive: true });

  hero.addEventListener("pointerleave", () => {
    pointerX = 0;
    pointerY = 0;
    schedule();
  }, { passive: true });

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  reducedMotion.addEventListener("change", schedule);
  render();
}
