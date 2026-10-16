// @ts-check
// Board theme: the workbench is one card with your text on the front and the
// safe text on the back. The hidden side is made inert so it can't take focus.

/**
 * @param {object} opts
 * @param {HTMLElement} opts.card
 * @param {HTMLButtonElement} opts.button
 * @param {HTMLElement} opts.front
 * @param {HTMLElement} opts.back
 * @param {() => boolean} opts.isOn
 * @param {(safe: boolean) => void} [opts.onTurn]
 */
export function wireFlip({ card, button, front, back, isOn, onTurn }) {
  let safe = false;

  const sync = () => {
    const on = isOn();
    card.dataset.side = safe ? "safe" : "text";
    button.setAttribute("aria-pressed", String(safe));
    button.textContent = safe ? "Show your text" : "Show safe side";
    front.inert = on && safe;
    back.inert = on && !safe;
  };

  /** @param {boolean} next */
  const set = next => {
    if (next === safe) return;
    safe = next;
    sync();
    if (isOn()) onTurn?.(safe);
  };

  button.addEventListener("click", () => set(!safe));
  sync();
  return { set, sync };
}
