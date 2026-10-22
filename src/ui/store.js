// @ts-check
// Settings kept in this browser. Text and labels are never stored.
// Storage can be blocked (some private windows); settings then last for the visit.

export const KEYS = /** @type {const} */ ({ words: "paste-safe:words", note: "paste-safe:note", plain: "paste-safe:plain" });

/** @param {string} key */
export function load(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** @param {string} key @param {string} value */
export function save(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Blocked; see above.
  }
}

/** Removes everything this site saved, including legacy keys from older versions. */
export function eraseAll() {
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith("paste-safe:")) localStorage.removeItem(key);
  } catch {
    // Blocked, so nothing was saved.
  }
}
