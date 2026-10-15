// @ts-check
/**
 * Falls back to selecting `fallback` when clipboard access is refused.
 * @param {string} text
 * @param {Element} fallback
 * @returns {Promise<"copied" | "selected">}
 */
export async function copyText(text, fallback) {
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    const range = document.createRange();
    range.selectNodeContents(fallback);
    const sel = getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    return "selected";
  }
}
