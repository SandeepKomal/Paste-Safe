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
  const chapters = Array.from(story.querySelectorAll("[data-story-step]")).map(node => /** @type {HTMLElement} */ (node));
  const count = story.querySelector("[data-stage-count]");
  const caption = story.querySelector("[data-stage-caption]");
  const progressBar = story.querySelector("[data-story-progress]");
  if (!(stage instanceof HTMLElement) || chapters.length === 0) return;

  const activate = (/** @type {string} */ step) => {
    const detail = STEP_DETAILS[/** @type {keyof typeof STEP_DETAILS} */ (step)];
    if (!detail) return;
    stage.dataset.activeStep = step;
    if (count) count.textContent = detail.count;
    if (caption) caption.textContent = detail.caption;

    // Keep the hero's tiny progress cue synced to the chapter being read.
    const hero = document.querySelector(".privacy-visual");
    const heroCount = hero?.querySelector("[data-ribbon-step]");
    const chapterIndex = Object.keys(STEP_DETAILS).indexOf(step) + 1;
    if (hero instanceof HTMLElement && chapterIndex > 0) {
      hero.style.setProperty("--story-step-progress", (chapterIndex / Object.keys(STEP_DETAILS).length).toFixed(4));
    }
    if (heroCount) heroCount.textContent = detail.count;

    for (const chapter of chapters) {
      const active = chapter.dataset.storyStep === step;
      chapter.classList.toggle("is-active", active);
      if (active) chapter.setAttribute("aria-current", "step");
      else chapter.removeAttribute("aria-current");
    }
  };

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let progressFrame = 0;

  // Choose the chapter nearest the viewport's reading line, rather than relying
  // on whichever IntersectionObserver entries happened to cross a threshold.
  const syncActiveChapter = () => {
    const readingLine = window.innerHeight * 0.48;
    let nearest = chapters[0];
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const chapter of chapters) {
      const rect = chapter.getBoundingClientRect();
      if (rect.top <= readingLine && rect.bottom >= readingLine) {
        nearest = chapter;
        break;
      }
      const distance = Math.abs((rect.top + rect.bottom) / 2 - readingLine);
      if (distance < nearestDistance) {
        nearest = chapter;
        nearestDistance = distance;
      }
    }

    activate(nearest.dataset.storyStep ?? "detect");
  };

  const updateScrollProgress = () => {
    progressFrame = 0;
    const rect = story.getBoundingClientRect();
    const travel = rect.height + window.innerHeight;
    const progress = travel > 0
      ? Math.max(0, Math.min(1, (window.innerHeight - rect.top) / travel))
      : 0;
    stage.style.setProperty("--story-progress", progress.toFixed(4));
    if (progressBar instanceof HTMLElement) {
      progressBar.style.transform = `scaleX(${progress.toFixed(4)})`;
    }

    // Parallax tracks the scroll position; reduced-motion users get a stable stage.
    const driftX = prefersReducedMotion.matches ? 0 : (progress - 0.5) * 64;
    const driftY = prefersReducedMotion.matches ? 0 : Math.sin(progress * Math.PI * 2) * 14;
    const scale = prefersReducedMotion.matches ? 1 : 1 + Math.sin(progress * Math.PI) * 0.06;
    stage.style.setProperty("--story-aurora-x", `${driftX.toFixed(2)}px`);
    stage.style.setProperty("--story-aurora-y", `${driftY.toFixed(2)}px`);
    stage.style.setProperty("--story-aurora-scale", scale.toFixed(3));
    syncActiveChapter();
  };
  const scheduleProgressUpdate = () => {
    if (progressFrame) return;
    progressFrame = window.requestAnimationFrame(updateScrollProgress);
  };
  window.addEventListener("scroll", scheduleProgressUpdate, { passive: true });
  window.addEventListener("resize", scheduleProgressUpdate);
  prefersReducedMotion.addEventListener("change", scheduleProgressUpdate);
  updateScrollProgress();

  const firstStep = chapters[0].dataset.storyStep ?? "detect";
  activate(firstStep);
  if (!("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(() => {
    syncActiveChapter();
  }, {
    root: null,
    rootMargin: "-10% 0px -10% 0px",
    threshold: [0, 0.1, 0.35, 0.7],
  });

  for (const chapter of chapters) observer.observe(chapter);
}
