// @ts-check
// The page menu on narrow screens. The links sit behind a button that opens them
// as a panel under the header; choosing a link, pressing Escape or tapping
// outside closes it again, and widening the window past the breakpoint resets it.

export function wireMenu() {
  const head = document.querySelector(".masthead");
  const button = /** @type {HTMLButtonElement | null} */ (document.querySelector("[data-menu-toggle]"));
  const nav = document.getElementById("pageNav");
  if (!head || !button || !nav) return;

  const set = (/** @type {boolean} */ open) => {
    head.classList.toggle("is-open", open);
    button.setAttribute("aria-expanded", String(open));
    button.setAttribute("aria-label", open ? "Close the menu" : "Open the menu");
  };
  button.addEventListener("click", () => set(button.getAttribute("aria-expanded") !== "true"));
  nav.addEventListener("click", e => { if (/** @type {Element} */ (e.target).closest("a")) set(false); });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && head.classList.contains("is-open")) { set(false); button.focus(); }
  });
  document.addEventListener("click", e => { if (!head.contains(/** @type {Node} */ (e.target))) set(false); });
  matchMedia("(max-width: 1000px)").addEventListener("change", () => set(false));
}
