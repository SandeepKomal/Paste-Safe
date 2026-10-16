// @ts-check
// Runs detection off the main thread so large logs don't freeze the page.
import { detect } from "./detect.js";
import { RULES, wordRules } from "./rules.js";

addEventListener("message", e => {
  const { id, text, words } = /** @type {MessageEvent<{ id: number, text: string, words: string[] }>} */ (e).data;
  postMessage({ id, detection: detect(text, [...wordRules(words), ...RULES]) });
});
