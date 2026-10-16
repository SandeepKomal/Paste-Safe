// @ts-check
export const SKINS = /** @type {const} */ (["board", "lens", "sticker"]);
/** @typedef {typeof SKINS[number]} Skin */

const STORAGE_KEY = "paste-safe:skin";

/** @returns {Skin} */
export function currentSkin() {
  const s = document.documentElement.dataset.skin;
  return /** @type {Skin} */ (SKINS.includes(/** @type {Skin} */ (s)) ? s : "board");
}

export function setSkin(/** @type {Skin} */ skin) {
  document.documentElement.dataset.skin = skin;
  try {
    localStorage.setItem(STORAGE_KEY, skin);
  } catch {
    // Blocked in some private windows; the theme still applies for this visit.
  }
  history.replaceState(null, "", `#${skin}`);
}

/**
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
