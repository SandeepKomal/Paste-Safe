// @ts-check
// Scroll effects in the style of product pages. Pinned scenes stay on screen
// while their section scrolls past: the masking scene grows to full width and
// finds the secrets one by one, then the statement rises over it and lights up
// word by word.
// Elsewhere sections fade up and the hero recedes. Native scrolling stays in
// charge; nothing here runs when the visitor prefers reduced motion.

const clamp01 = (/** @type {number} */ n) => Math.min(1, Math.max(0, n));

export function wireMotion() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  document.documentElement.classList.add("has-motion");

  const reveal = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add("is-in");
      reveal.unobserve(e.target);
      if (e.target.querySelector("[data-count]")) countUp(/** @type {HTMLElement} */ (e.target.querySelector("[data-count]")));
    }
  }, { rootMargin: "0px 0px -8% 0px" });
  for (const el of document.querySelectorAll("[data-reveal]")) reveal.observe(el);

  const heroTop = /** @type {HTMLElement | null} */ (document.querySelector("[data-hero-top]"));
  const headlines = [...document.querySelectorAll("[data-words]:not([data-words=pin])")].map(h => ({ el: h, words: splitWords(h) }));
  const scene = sceneParts(document.querySelector("[data-pin=product]"));
  const statement = /** @type {HTMLElement | null} */ (document.querySelector("[data-pin=statement]"));
  const statementWords = statement ? splitWords(/** @type {Element} */ (statement.querySelector("[data-words]"))) : [];

  let frame = 0;
  const update = () => {
    frame = 0;
    const vh = innerHeight;
    if (heroTop) heroTop.style.setProperty("--recede", clamp01(scrollY / (vh * 0.7)).toFixed(3));
    if (scene) {
      const p = pinProgress(scene.section, vh);
      // Three steps over the first two thirds: Find outlines the secrets one by one, Mask turns
      // them into labels, Ask points at the side you copy. The last third is left for the
      // statement, which rises over the scene while it stays pinned.
      scene.section.style.setProperty("--grow", clamp01(p / 0.06).toFixed(3));
      const step = p < 0.22 ? 0 : p < 0.44 ? 1 : 2;
      if (scene.step !== step) {
        scene.step = step;
        scene.section.dataset.step = scene.steps[step]?.dataset.step ?? "";
        scene.steps.forEach((s, i) => s.classList.toggle("is-on", i === step));
      }
      const hit = clamp01((p - 0.03) / 0.16) * scene.marks.length;
      scene.marks.forEach((m, i) => m.style.setProperty("--hit", clamp01(hit - i).toFixed(2)));
      const found = clamp01((p - 0.24) / 0.17) * scene.labels.length;
      scene.labels.forEach((l, i) => l.style.setProperty("--on", clamp01(found - i).toFixed(2)));
      const n = Math.min(scene.labels.length, Math.floor(found + 0.5));
      if (scene.count && scene.shown !== n) scene.count.textContent = `${(scene.shown = n)} hidden`;
    }
    if (statement) {
      // The words start lighting once the statement has pinned, after the sheet's lip.
      const lit = clamp01((pinProgress(statement, vh) - 0.2) / 0.65) * statementWords.length;
      statementWords.forEach((w, i) => w.style.setProperty("--lit", clamp01(lit - i).toFixed(2)));
    }
    for (const { el, words } of headlines) {
      const r = el.getBoundingClientRect();
      // 0 when the headline enters at the bottom, 1 once it reaches the upper third.
      const lit = clamp01((vh - r.top) / (vh * 0.62)) * words.length;
      words.forEach((w, i) => w.style.setProperty("--lit", clamp01(lit - i).toFixed(2)));
    }
  };
  const schedule = () => (frame ||= requestAnimationFrame(update));
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", () => {
    if (scene) fitScene(scene);
    schedule();
  });
  if (scene) fitScene(scene);
  update();
}

/** How far a pinned section has scrolled: 0 as its stage pins, 1 as it lets go. */
function pinProgress(/** @type {HTMLElement} */ section, /** @type {number} */ vh) {
  const r = section.getBoundingClientRect();
  return clamp01(-r.top / Math.max(1, r.height - vh));
}

function sceneParts(/** @type {Element | null} */ section) {
  if (!(section instanceof HTMLElement)) return null;
  return {
    section,
    split: /** @type {HTMLElement} */ (section.querySelector(".split")),
    steps: /** @type {HTMLElement[]} */ ([...section.querySelectorAll(".split__steps li")]),
    step: -1,
    labels: /** @type {HTMLElement[]} */ ([...section.querySelectorAll("#heroSafe em")]),
    marks: /** @type {HTMLElement[]} */ ([...section.querySelectorAll("#heroRaw mark")]),
    count: section.querySelector("#heroCount"),
    shown: -1,
  };
}

/** Shrinks the scene when the screen is too short to show the steps and the window whole. */
function fitScene(/** @type {NonNullable<ReturnType<typeof sceneParts>>} */ scene) {
  scene.section.style.setProperty("--fit", "1");
  const fit = Math.min(1, (innerHeight - 96) / Math.max(1, scene.split.offsetHeight));
  scene.section.style.setProperty("--fit", Math.max(0.55, fit).toFixed(3));
}

/** Wraps each word of the element's text in a span, keeping inner markup. */
function splitWords(/** @type {Element} */ root) {
  /** @type {HTMLElement[]} */
  const words = [];
  const walk = (/** @type {Node} */ node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.ELEMENT_NODE) walk(child);
      else if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
        const frag = document.createDocumentFragment();
        for (const part of child.textContent.split(/(\s+)/)) {
          if (!part || /^\s+$/.test(part)) {
            frag.append(part);
            continue;
          }
          const span = document.createElement("span");
          span.className = "word";
          span.textContent = part;
          words.push(span);
          frag.append(span);
        }
        child.replaceWith(frag);
      }
    }
  };
  walk(root);
  return words;
}

function countUp(/** @type {HTMLElement} */ el) {
  const target = Number(el.textContent);
  if (!Number.isFinite(target) || target <= 0) return;
  const start = performance.now();
  const step = (/** @type {number} */ now) => {
    const t = clamp01((now - start) / 1100);
    el.textContent = String(Math.round(target * (1 - (1 - t) ** 3)));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
