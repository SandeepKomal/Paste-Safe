// @ts-check
/**
 * Small DOM helpers. User text only ever reaches the page through text nodes,
 * never through innerHTML, so pasted content can't become markup.
 */

/**
 * Finds a required element, failing loudly if the page markup changed.
 * @template {Element} T
 * @param {string} selector
 * @param {new (...args: any[]) => T} type
 * @returns {T}
 */
export function req(selector, type) {
  const el = document.querySelector(selector);
  if (!(el instanceof type)) throw new Error(`Missing element ${selector}`);
  return el;
}

/**
 * Creates an element.
 * @param {string} tag
 * @param {{ className?: string, text?: string, attrs?: Record<string, string>, vars?: Record<string, string | number> }} [opts]
 * @param {(Node | string)[]} [children]
 */
export function h(tag, opts = {}, children = []) {
  const el = document.createElement(tag);
  if (opts.className) el.className = opts.className;
  if (opts.text != null) el.textContent = opts.text;
  for (const [k, v] of Object.entries(opts.attrs ?? {})) el.setAttribute(k, v);
  // CSS custom properties via the CSSOM, which the page's style-src policy allows.
  for (const [k, v] of Object.entries(opts.vars ?? {})) el.style.setProperty(`--${k}`, String(v));
  el.append(...children);
  return el;
}

/** Human-readable size of a string in UTF-8. */
export function formatBytes(/** @type {string} */ s) {
  const n = new TextEncoder().encode(s).length;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Delays `fn` until calls stop for `ms` milliseconds.
 * @template {unknown[]} A
 * @param {(...args: A) => void} fn
 * @param {number} ms
 */
export function debounce(fn, ms) {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let t;
  return (/** @type {A} */ ...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
