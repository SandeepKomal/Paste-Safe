// @ts-check
// Scroll effects in the style of product pages. Pinned scenes stay on screen
// while their section scrolls past: the masking scene grows to full width and
// finds the secrets one by one, the statement lights up word by word, and the
// film grows from a card until it fills the screen.
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
  const film = filmParts(document.querySelector("[data-pin=film]"));

  let frame = 0;
  const update = () => {
    frame = 0;
    const vh = innerHeight;
    if (heroTop) heroTop.style.setProperty("--recede", clamp01(scrollY / (vh * 0.7)).toFixed(3));
    if (scene) {
      const p = pinProgress(scene.section, vh);
      // First the panel grows to full width, then the secrets are found one by one.
      scene.section.style.setProperty("--grow", clamp01(p / 0.3).toFixed(3));
      const found = clamp01((p - 0.32) / 0.5) * scene.labels.length;
      scene.labels.forEach((l, i) => l.style.setProperty("--on", clamp01(found - i).toFixed(2)));
      scene.marks.forEach((m, i) => m.style.setProperty("--on", clamp01(found - i).toFixed(2)));
      const n = Math.min(scene.labels.length, Math.floor(found + 0.5));
      if (scene.count && scene.shown !== n) scene.count.textContent = `${(scene.shown = n)} hidden`;
    }
    if (statement) {
      const lit = clamp01((pinProgress(statement, vh) - 0.08) / 0.75) * statementWords.length;
      statementWords.forEach((w, i) => w.style.setProperty("--lit", clamp01(lit - i).toFixed(2)));
    }
    if (film) {
      // The film grows over the first half of its pinned stretch, then plays full screen.
      const g = clamp01((pinProgress(film.section, vh) - 0.05) / 0.45);
      film.section.style.setProperty("--grow", (g * g * (3 - 2 * g)).toFixed(3));
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
    if (film) fitFilm(film);
    schedule();
  });
  if (scene) fitScene(scene);
  if (film) fitFilm(film);
  update();
}

/** How far a pinned section has scrolled: 0 as its stage pins, 1 as it lets go. */
function pinProgress(/** @type {HTMLElement} */ section, /** @type {number} */ vh) {
  const r = section.getBoundingClientRect();
  return clamp01(-r.top / Math.max(1, r.height - vh));
}

function sceneParts(/** @type {Element | null} */ section) {
  if (!(section instanceof HTMLElement)) return null;
  const product = /** @type {HTMLElement} */ (section.querySelector(".product"));
  return {
    section, product,
    title: /** @type {HTMLElement} */ (section.querySelector(".pin__title")),
    labels: /** @type {HTMLElement[]} */ ([...section.querySelectorAll("#heroSafe em")]),
    marks: /** @type {HTMLElement[]} */ ([...section.querySelectorAll("#heroRaw mark")]),
    count: section.querySelector("#heroCount"),
    shown: -1,
  };
}

/** Shrinks the window when the screen is too short to show it whole under the title. */
function fitScene(/** @type {NonNullable<ReturnType<typeof sceneParts>>} */ scene) {
  scene.section.style.setProperty("--fit", "1");
  const room = innerHeight - scene.title.offsetHeight - 120;
  const fit = Math.min(1, room / Math.max(1, scene.product.offsetHeight));
  scene.section.style.setProperty("--fit", Math.max(0.55, fit).toFixed(3));
}

function filmParts(/** @type {Element | null} */ section) {
  const frame = section?.querySelector(".film__frame");
  return section instanceof HTMLElement && frame instanceof HTMLElement ? { section, frame } : null;
}

/** How much the film must grow, and move, to fill the screen from where it sits in its stage. */
function fitFilm(/** @type {NonNullable<ReturnType<typeof filmParts>>} */ film) {
  const { frame } = film;
  const scale = Math.min(innerWidth / frame.offsetWidth, innerHeight / frame.offsetHeight);
  const shift = innerHeight / 2 - (frame.offsetTop + frame.offsetHeight / 2);
  film.section.style.setProperty("--film-scale", Math.max(1, scale).toFixed(3));
  film.section.style.setProperty("--film-shift", `${shift.toFixed(1)}px`);
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
