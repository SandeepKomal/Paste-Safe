// @ts-check
/**
 * Shows the real value behind a label while the pointer rests on it.
 * The bubble is anchored above the label and follows it on scroll.
 * The value is looked up when needed and never stored in the page markup.
 * @param {object} opts
 * @param {HTMLElement} opts.container  Where labels live.
 * @param {HTMLElement} opts.bubble     The floating element to show.
 * @param {HTMLElement} opts.valueEl    Inside the bubble, receives the value as text.
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
