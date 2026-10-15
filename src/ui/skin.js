// @ts-check
/** The visual themes. Detection, labels and copying behave the same in every theme. */
export const SKINS = /** @type {const} */ (["lens", "sticker"]);
/** @typedef {typeof SKINS[number]} Skin */

const STORAGE_KEY = "paste-safe:skin";

/** @returns {Skin} */
export function currentSkin() {
  const s = document.documentElement.dataset.skin;
  return /** @type {Skin} */ (SKINS.includes(/** @type {Skin} */ (s)) ? s : "lens");
}

/**
 * Switches theme, remembers it in this browser, and keeps the link shareable.
 * @param {Skin} skin
 */
export function setSkin(skin) {
  document.documentElement.dataset.skin = skin;
  try {
    localStorage.setItem(STORAGE_KEY, skin);
  } catch {
    // Storage can be blocked (private windows); the theme still applies for this visit.
  }
  history.replaceState(null, "", `#${skin}`);
}

/**
 * Wires a group of buttons that carry `data-skin-option`.
 * @param {HTMLElement} group
 * @param {(skin: Skin) => void} [onChange]
 */
export function wireSkinSwitch(group, onChange) {
  const buttons = /** @type {HTMLButtonElement[]} */ ([...group.querySelectorAll("[data-skin-option]")]);
  const sync = () => {
    const skin = currentSkin();
    for (const b of buttons) b.setAttribute("aria-pressed", String(b.dataset.skinOption === skin));
  };
  for (const b of buttons) {
    b.addEventListener("click", () => {
      setSkin(/** @type {Skin} */ (b.dataset.skinOption));
      sync();
      onChange?.(currentSkin());
    });
  }
  addEventListener("hashchange", () => {
    const s = location.hash.slice(1);
    if (SKINS.includes(/** @type {Skin} */ (s))) {
      setSkin(/** @type {Skin} */ (s));
      sync();
      onChange?.(currentSkin());
    }
  });
  sync();
}
