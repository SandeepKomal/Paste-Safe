// @ts-check

const STEP_DETAILS = {
  detect: { count: "01 / 03", caption: "Find sensitive values in the text." },
  mask: { count: "02 / 03", caption: "Replace the values with stable labels." },
  restore: { count: "03 / 03", caption: "Restore known labels on your device." },
};

/**
 * Connect the chapter scroll position to the pinned visual.
 * Native page scrolling remains in control; the observer only changes presentation.
 */
export function wireScrollStory() {
  const story = document.querySelector("[data-scroll-story]");
  if (!(story instanceof HTMLElement)) return;

  const stage = story.querySelector("[data-story-stage]");
  const chapters = Array.from(story.querySelectorAll("[data-story-step]"));
  const count = story.querySelector("[data-stage-count]");
  const caption = story.querySelector("[data-stage-caption]");
  if (!(stage instanceof HTMLElement) || chapters.length === 0) return;

  const activate = (/** @type {string} */ step) => {
    const detail = STEP_DETAILS[/** @type {keyof typeof STEP_DETAILS} */ (step)];
    if (!detail) return;
    stage.dataset.activeStep = step;
    if (count) count.textContent = detail.count;
    if (caption) caption.textContent = detail.caption;
    for (const chapter of chapters) {
      const active = chapter.dataset.storyStep === step;
      chapter.classList.toggle("is-active", active);
      if (active) chapter.setAttribute("aria-current", "step");
      else chapter.removeAttribute("aria-current");
    }
  };

  const firstStep = chapters[0].dataset.storyStep ?? "detect";
  activate(firstStep);
  if (!("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(entries => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
    const chapter = visible[0]?.target;
    if (chapter instanceof HTMLElement) activate(chapter.dataset.storyStep ?? "");
  }, {
    root: null,
    rootMargin: "-42% 0px -42% 0px",
    threshold: [0, 0.1, 0.35, 0.7],
  });

  for (const chapter of chapters) observer.observe(chapter);
}
