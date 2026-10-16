// @ts-check
import { detect } from "./core/detect.js";
import { mask, restore, toText } from "./core/transform.js";
import { EXAMPLE, exampleAnswer } from "./example.js";
import { copyText } from "./ui/clipboard.js";
import { sweep, wireDepth } from "./ui/depth.js";
import { debounce, formatBytes, req } from "./ui/dom.js";
import { watchExternalRequests } from "./ui/netwatch.js";
import { wirePeek } from "./ui/peek.js";
import { currentSkin, wireSkinSwitch } from "./ui/skin.js";
import { CATEGORY_NAMES, renderLedger, renderMirror, renderSegments } from "./ui/render.js";

// Above this size, detection is debounced instead of running on every keystroke.
const SYNC_LIMIT = 50_000;

const el = {
  input: req("#input", HTMLTextAreaElement),
  backdrop: req("#backdrop", HTMLElement),
  mirror: req("#mirror", HTMLElement),
  safe: req("#safe", HTMLElement),
  answer: req("#answer", HTMLTextAreaElement),
  restored: req("#restored", HTMLElement),
  ledger: req("#ledger tbody", HTMLTableSectionElement),
  ledgerWrap: req("#ledgerWrap", HTMLElement),
  ledgerEmpty: req("#ledgerEmpty", HTMLElement),
  categories: req("#categories", HTMLElement),
  statHidden: req("#statHidden", HTMLElement),
  statSize: req("#statSize", HTMLElement),
  restoreNote: req("#restoreNote", HTMLElement),
  copySafe: req("#copySafe", HTMLButtonElement),
  copyRestored: req("#copyRestored", HTMLButtonElement),
  loadExample: req("#loadExample", HTMLButtonElement),
  clear: req("#clear", HTMLButtonElement),
  netcount: req("#netcount", HTMLElement),
  netcheck: req("#netcheck", HTMLElement),
  status: req("#status", HTMLElement),
  skinSwitch: req("#skinswitch", HTMLElement),
  peek: req("#peek", HTMLElement),
  peekValue: req("#peekValue", HTMLElement),
};

/** @import { Detection, Category } from "../types/index.js" */

const state = {
  /** @type {Detection} */
  detection: { spans: [], findings: [] },
  /** Values the user switched off, i.e. left visible. */
  shown: /** @type {Set<string>} */ (new Set()),
  safeText: "",
  restoredText: "",
  categoryOf: /** @type {Map<string, Category>} */ (new Map()),
};
const seenLabels = /** @type {Set<string>} */ (new Set());

function analyse() {
  state.detection = detect(el.input.value);
  state.categoryOf = new Map(state.detection.findings.map(f => [f.placeholder, f.category]));
  const values = new Set(state.detection.findings.map(f => f.value));
  for (const v of state.shown) if (!values.has(v)) state.shown.delete(v);
  paint();
  sweep(el.safe);
}
const analyseLater = debounce(analyse, 120);

function paint() {
  const text = el.input.value;
  const { spans, findings } = state.detection;
  const segments = mask(text, spans, state.shown);
  state.safeText = toText(segments);

  const current = new Set(spans.map(s => s.placeholder));
  for (const p of seenLabels) if (!current.has(p)) seenLabels.delete(p);
  renderSegments(el.safe, segments, seenLabels, state.categoryOf);
  renderMirror(el.mirror, text, spans, state.shown, state.categoryOf);
  renderLedger(el.ledger, findings, state.shown);

  const hidden = findings.filter(f => !state.shown.has(f.value));
  el.statHidden.textContent = String(hidden.length);
  el.statSize.textContent = formatBytes(text);
  el.ledgerWrap.hidden = !findings.length;
  el.ledgerEmpty.hidden = findings.length > 0;
  el.ledgerEmpty.textContent = text ? "Nothing that looks secret was found. Still, read the safe text before you share it." : "Findings appear here as soon as you paste something.";

  /** @type {Partial<Record<keyof typeof CATEGORY_NAMES, number>>} */
  const byCategory = {};
  for (const f of hidden) byCategory[f.category] = (byCategory[f.category] ?? 0) + 1;
  el.categories.replaceChildren(...Object.entries(byCategory).map(([cat, n]) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.dataset.cat = cat;
    chip.textContent = `${n} ${CATEGORY_NAMES[/** @type {keyof typeof CATEGORY_NAMES} */ (cat)]}`;
    return chip;
  }));
  paintAnswer();
}

function paintAnswer() {
  const active = state.detection.findings.filter(f => !state.shown.has(f.value));
  const segments = restore(el.answer.value, active);
  state.restoredText = toText(segments);
  renderSegments(el.restored, segments, seenLabels);
  const n = segments.filter(s => s.restored).length;
  el.restoreNote.textContent = el.answer.value
    ? `${n} label${n === 1 ? "" : "s"} turned back into your real values.`
    : "Real values come back highlighted.";
}

function syncScroll() {
  el.backdrop.scrollTop = el.input.scrollTop;
  el.backdrop.scrollLeft = el.input.scrollLeft;
}

let linked = "";
function link(/** @type {string} */ placeholder) {
  if (placeholder === linked) return;
  for (const n of document.querySelectorAll(".is-linked")) n.classList.remove("is-linked");
  linked = placeholder;
  if (!placeholder) return;
  for (const n of document.querySelectorAll(`[data-ph="${CSS.escape(placeholder)}"]`)) n.classList.add("is-linked");
}
const labelOf = (/** @type {EventTarget | null} */ t) =>
  t instanceof Element ? (t.closest("[data-ph]")?.getAttribute("data-ph") ?? "") : "";

/**
 * @param {HTMLButtonElement} button
 * @param {() => string} getText
 * @param {HTMLElement} fallback
 * @param {string} doneMessage
 */
function wireCopy(button, getText, fallback, doneMessage) {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let reset;
  button.addEventListener("click", async () => {
    const text = getText();
    if (!text) {
      el.status.textContent = "There's nothing to copy yet.";
      return;
    }
    const result = await copyText(text, fallback);
    button.dataset.state = result === "copied" ? "done" : "";
    el.status.textContent = result === "copied" ? doneMessage : "Your browser blocked copying. The text is selected: press Ctrl+C, or Cmd+C on a Mac.";
    clearTimeout(reset);
    reset = setTimeout(() => (button.dataset.state = ""), 2000);
  });
}

function loadExample() {
  el.input.value = EXAMPLE;
  state.shown.clear();
  analyse();
  el.answer.value = exampleAnswer(state.detection.findings);
  paintAnswer();
}

el.input.addEventListener("input", () => (el.input.value.length <= SYNC_LIMIT ? analyse() : analyseLater()));
el.input.addEventListener("scroll", syncScroll, { passive: true });
el.answer.addEventListener("input", paintAnswer);
el.ledger.addEventListener("change", e => {
  const t = e.target;
  if (!(t instanceof HTMLInputElement)) return;
  const f = state.detection.findings[Number(t.dataset.index)];
  if (!f) return;
  if (t.checked) state.shown.delete(f.value);
  else state.shown.add(f.value);
  paint();
  link(f.placeholder);
});
for (const type of ["mouseover", "focusin"]) document.addEventListener(type, e => link(labelOf(e.target)));
document.addEventListener("mouseleave", () => link(""));
wirePeek({
  container: el.safe,
  bubble: el.peek,
  valueEl: el.peekValue,
  lookup: p => state.detection.findings.find(f => f.placeholder === p)?.value,
});
wireSkinSwitch(el.skinSwitch, skin => {
  el.status.textContent = `${skin[0].toUpperCase()}${skin.slice(1)} theme on.`;
  seenLabels.clear();
  paint();
});
wireCopy(el.copySafe, () => state.safeText, el.safe, "Copied the safe text. Paste it into your AI.");
wireCopy(el.copyRestored, () => state.restoredText, el.restored, "Copied the answer with your real values.");
el.loadExample.addEventListener("click", loadExample);
el.clear.addEventListener("click", () => {
  el.input.value = "";
  el.answer.value = "";
  state.shown.clear();
  analyse();
  el.input.focus();
});
new ResizeObserver(syncScroll).observe(el.input);
wireDepth(() => currentSkin() === "holo");

watchExternalRequests(n => {
  el.netcount.textContent = String(n);
  el.netcheck.classList.toggle("is-warn", n > 0);
});

loadExample();
