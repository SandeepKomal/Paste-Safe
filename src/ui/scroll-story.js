// @ts-check
// The "how it works" chapters scroll normally; the stage beside them shows the
// scene for whichever chapter crosses the middle of the screen.

const CAPTIONS = {
  detect: "Find sensitive values in the text.",
  mask: "Replace the values with stable labels.",
  restore: "Restore known labels on your device.",
};

export function wireScrollStory() {
  const story = document.querySelector("[data-scroll-story]");
  const stage = story?.querySelector("[data-story-stage]");
  if (!(story instanceof HTMLElement) || !(stage instanceof HTMLElement)) return;
  const chapters = /** @type {HTMLElement[]} */ ([...story.querySelectorAll("[data-story-step]")]);
  const steps = chapters.map(c => c.dataset.storyStep ?? "");
  const count = story.querySelector("[data-stage-count]");
  const caption = story.querySelector("[data-stage-caption]");
  const bar = /** @type {HTMLElement | null} */ (story.querySelector("[data-story-progress]"));

  const activate = (/** @type {number} */ i) => {
    const step = steps[i];
    if (stage.dataset.activeStep === step) return;
    stage.dataset.activeStep = step;
    if (count) count.textContent = `0${i + 1} / 0${steps.length}`;
    if (caption) caption.textContent = CAPTIONS[/** @type {keyof typeof CAPTIONS} */ (step)];
    chapters.forEach((c, j) => {
      c.classList.toggle("is-active", i === j);
      if (i === j) c.setAttribute("aria-current", "step");
      else c.removeAttribute("aria-current");
    });
  };

  // On narrow screens the stage is pinned above the chapters, so the chapter
  // being read is the one in the space left below it.
  const shell = /** @type {HTMLElement} */ (stage.parentElement);
  const narrow = matchMedia("(max-width: 960px)");
  const readingLine = () => {
    if (!narrow.matches || getComputedStyle(shell).position !== "sticky") return innerHeight * 0.48;
    return Math.min((shell.getBoundingClientRect().bottom + innerHeight) / 2, innerHeight * 0.85);
  };

  let frame = 0;
  const update = () => {
    frame = 0;
    const line = readingLine();
    let best = 0;
    let bestDistance = Infinity;
    chapters.forEach((c, i) => {
      const r = c.getBoundingClientRect();
      const distance = r.top <= line && r.bottom >= line ? 0 : Math.abs((r.top + r.bottom) / 2 - line);
      if (distance < bestDistance) [best, bestDistance] = [i, distance];
    });
    activate(best);
    const r = story.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (innerHeight - r.top) / (r.height + innerHeight)));
    if (bar) bar.style.transform = `scaleX(${progress.toFixed(4)})`;
  };
  const schedule = () => (frame ||= requestAnimationFrame(update));
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule);
  update();
}
