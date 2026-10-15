// @ts-check
/**
 * The value is looked up on hover so it never sits in the DOM. The bubble is
 * anchored to the label, not the pointer: on touch devices hovering scrolls the
 * page, and a pointer-anchored bubble closed immediately.
 * @param {object} opts
 * @param {HTMLElement} opts.container
 * @param {HTMLElement} opts.bubble
 * @param {HTMLElement} opts.valueEl
 * @param {(placeholder: string) => string | undefined} opts.lookup
 */
export function wirePeek({ container, bubble, valueEl, lookup }) {
  /** @type {Element | null} */
  let anchor = null;

  const place = () => {
    if (!anchor?.isConnected) return hide();
    const r = anchor.getBoundingClientRect();
    bubble.style.setProperty("--x", `${Math.round(r.left + r.width / 2)}px`);
    bubble.style.setProperty("--y", `${Math.round(r.top)}px`);
  };
  const hide = () => {
    anchor = null;
    bubble.hidden = true;
  };

  container.addEventListener("pointerover", e => {
    const label = e.target instanceof Element ? e.target.closest(".redact") : null;
    if (label === anchor) return;
    const value = label ? lookup(label.getAttribute("data-ph") ?? "") : undefined;
    if (!label || !value) return hide();
    anchor = label;
    valueEl.textContent = value;
    bubble.hidden = false;
    place();
  });
  container.addEventListener("pointerleave", hide);
  addEventListener("scroll", () => anchor && place(), { passive: true, capture: true });
  addEventListener("resize", () => anchor && place());
  addEventListener("keydown", e => {
    if (e.key === "Escape") hide();
  });
}
