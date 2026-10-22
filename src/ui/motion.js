// @ts-check
// Scroll effects in the style of product pages: sections fade up as they
// arrive, the hero recedes, the product window tilts into place, and some
// headlines light up word by word. Native scrolling stays in charge; nothing
// here runs when the visitor prefers reduced motion.

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
  const product = /** @type {HTMLElement | null} */ (document.querySelector("[data-product]"));
  const headlines = [...document.querySelectorAll("[data-words]")].map(h => ({ el: h, words: splitWords(h) }));

  let frame = 0;
  const update = () => {
    frame = 0;
    const vh = innerHeight;
    if (heroTop) heroTop.style.setProperty("--recede", clamp01(scrollY / (vh * 0.7)).toFixed(3));
    if (product) {
      const r = product.getBoundingClientRect();
      product.style.setProperty("--rise", clamp01((vh - r.top) / (vh * 0.75)).toFixed(3));
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
  addEventListener("resize", schedule);
  update();
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
