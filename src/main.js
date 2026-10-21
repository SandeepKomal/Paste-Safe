// @ts-check
import { detect } from "./core/detect.js";
import { RULES, wordRules } from "./core/rules.js";
import { mask, restore, toText, withNote } from "./core/transform.js";
import { EXAMPLE, exampleAnswer } from "./example.js";
import { copyText } from "./ui/clipboard.js";
import { debounce, formatBytes, req } from "./ui/dom.js";
import { wireFlip } from "./ui/flip.js";
import { wireGate } from "./ui/gate.js";
import { watchExternalRequests } from "./ui/netwatch.js";
import { wirePeek } from "./ui/peek.js";
import { currentSkin, wireSkinSwitch } from "./ui/skin.js";
import { wirePrivacyReel } from "./ui/privacy-reel.js";
import { wireScrollStory } from "./ui/scroll-story.js";
import { CATEGORY_NAMES, renderLedger, renderMirror, renderSegments } from "./ui/render.js";

// Above this size, detection is debounced instead of running on every keystroke.
const SYNC_LIMIT = 50_000;
// Above this size, detection runs in a worker so the page stays responsive.
const WORKER_LIMIT = 200_000;
// Above this many labels, the text is drawn without per-label highlights:
// laying out tens of thousands of inline elements takes the browser seconds.
const RICH_LIMIT = 2_000;
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const WORDS_KEY = "paste-safe:words";

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
  statPlain: req("#statPlain", HTMLElement),
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
  workbench: req("#workbench", HTMLElement),
  paneText: req("#paneText", HTMLElement),
  paneSafe: req("#paneSafe", HTMLElement),
  flip: req("#flip", HTMLButtonElement),
  gate: req("#gate", HTMLElement),
  withNote: req("#withNote", HTMLInputElement),
  words: req("#words", HTMLTextAreaElement),
  openFile: req("#openFile", HTMLButtonElement),
  fileInput: req("#fileInput", HTMLInputElement),
  dropZone: req("#dropZone", HTMLElement),
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

/** @type {string[]} */
let words = [];
const rules = () => [...wordRules(words), ...RULES];

/** @type {Worker | null | undefined} */
let worker;
let job = 0;
function startWorker() {
  try {
    const w = new Worker(new URL("./core/worker.js", import.meta.url), { type: "module" });
    w.addEventListener("message", e => {
      if (e.data.id === job) apply(e.data.detection);
    });
    w.addEventListener("error", () => {
      worker = null;
      apply(detect(el.input.value, rules()));
    });
    return w;
  } catch {
    return null;
  }
}

function analyse() {
  const text = el.input.value;
  const id = ++job;
  if (text.length > WORKER_LIMIT) {
    if (worker === undefined) worker = startWorker();
    if (worker) {
      el.statHidden.textContent = "…";
      worker.postMessage({ id, text, words });
      return;
    }
  }
  apply(detect(text, rules()));
}

function apply(/** @type {Detection} */ detection) {
  state.detection = detection;
  state.categoryOf = new Map(state.detection.findings.map(f => [f.placeholder, f.category]));
  const values = new Set(state.detection.findings.map(f => f.value));
  for (const v of state.shown) if (!values.has(v)) state.shown.delete(v);
  paint();
}
const analyseLater = debounce(analyse, 120);

function paint() {
  const text = el.input.value;
  const { spans, findings } = state.detection;
  const segments = mask(text, spans, state.shown);
  state.safeText = toText(segments);

  const current = new Set(spans.map(s => s.placeholder));
  for (const p of seenLabels) if (!current.has(p)) seenLabels.delete(p);
  const rich = spans.length <= RICH_LIMIT;
  if (rich) {
    renderSegments(el.safe, segments, seenLabels, state.categoryOf);
    renderMirror(el.mirror, text, spans, state.shown, state.categoryOf);
  } else {
    el.safe.textContent = state.safeText;
    el.mirror.textContent = text + "\u200b";
  }
  el.statPlain.hidden = rich;
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

const isBoard = () => currentSkin() === "board";
const card = wireFlip({
  card: el.workbench,
  button: el.flip,
  front: el.paneText,
  back: el.paneSafe,
  isOn: isBoard,
  // Replay the label flaps each time the safe side comes round.
  onTurn: safe => {
    if (!safe) return;
    seenLabels.clear();
    paint();
  },
});
/** @type {ReturnType<typeof setTimeout> | undefined} */
let turnLater;
function turnToSafe(/** @type {number} */ ms) {
  clearTimeout(turnLater);
  if (isBoard()) turnLater = setTimeout(() => card.set(true), ms);
}

// Labels only live in this tab, so warn before losing them.
let edited = false;
addEventListener("beforeunload", e => {
  if (edited && state.detection.findings.length) e.preventDefault();
});

/** @param {File} file */
async function openFile(file) {
  if (file.size > MAX_FILE_BYTES) {
    el.status.textContent = `${file.name} is too large. Files up to 50 MB can be opened.`;
    return;
  }
  const text = await file.text();
  if (text.includes("\u0000")) {
    el.status.textContent = `${file.name} doesn't look like a text file.`;
    return;
  }
  card.set(false);
  el.input.value = text;
  edited = true;
  state.shown.clear();
  analyse();
  el.status.textContent = `Opened ${file.name}.`;
  turnToSafe(450);
}

function loadExample() {
  edited = false;
  card.set(false);
  turnToSafe(1200);
  el.input.value = EXAMPLE;
  state.shown.clear();
  analyse();
  el.answer.value = exampleAnswer(state.detection.findings);
  paintAnswer();
}

el.input.addEventListener("input", () => (el.input.value.length <= SYNC_LIMIT ? analyse() : analyseLater()));
el.input.addEventListener("scroll", syncScroll, { passive: true });
el.input.addEventListener("paste", () => turnToSafe(450));
el.input.addEventListener("input", () => (edited = true));
el.openFile.addEventListener("click", () => el.fileInput.click());
el.fileInput.addEventListener("change", () => {
  const file = el.fileInput.files?.[0];
  if (file) openFile(file);
  el.fileInput.value = "";
});
el.dropZone.addEventListener("dragover", e => {
  if (!e.dataTransfer?.types.includes("Files")) return;
  e.preventDefault();
  el.dropZone.classList.add("is-dropping");
});
el.dropZone.addEventListener("dragleave", () => el.dropZone.classList.remove("is-dropping"));
el.dropZone.addEventListener("drop", e => {
  const file = e.dataTransfer?.files[0];
  el.dropZone.classList.remove("is-dropping");
  if (!file) return;
  e.preventDefault();
  openFile(file);
});

try {
  el.words.value = localStorage.getItem(WORDS_KEY) ?? "";
} catch {
  // Storage can be blocked; the list then lasts for this visit only.
}
const readWords = () => (words = el.words.value.split("\n"));
readWords();
el.words.addEventListener("input", debounce(() => {
  readWords();
  try {
    localStorage.setItem(WORDS_KEY, el.words.value);
  } catch {
    // See above.
  }
  analyse();
}, 250));
el.withNote.addEventListener("change", () => {
  try {
    localStorage.setItem("paste-safe:note", el.withNote.checked ? "1" : "0");
  } catch {
    // See above.
  }
});
try {
  el.withNote.checked = localStorage.getItem("paste-safe:note") !== "0";
} catch {
  // See above.
}
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
const gate = wireGate(el.gate, isBoard);
wireSkinSwitch(el.skinSwitch, skin => {
  el.status.textContent = `${skin[0].toUpperCase()}${skin.slice(1)} theme on.`;
  card.sync();
  gate.refresh();
  seenLabels.clear();
  paint();
});
wireCopy(el.copySafe, () => (el.withNote.checked ? withNote(state.safeText) : state.safeText), el.safe, "Copied the safe text. Paste it into your AI.");
wireCopy(el.copyRestored, () => state.restoredText, el.restored, "Copied the answer with your real values.");
el.loadExample.addEventListener("click", loadExample);
el.clear.addEventListener("click", () => {
  edited = false;
  clearTimeout(turnLater);
  card.set(false);
  el.input.value = "";
  el.answer.value = "";
  state.shown.clear();
  analyse();
  el.input.focus();
});
new ResizeObserver(syncScroll).observe(el.input);

watchExternalRequests(n => {
  el.netcount.textContent = String(n);
  el.netcheck.classList.toggle("is-warn", n > 0);
});

wirePrivacyReel();
wireScrollStory();
loadExample();

// Offline support and "install as an app". Only works over https or localhost.
navigator.serviceWorker?.register("sw.js").catch(() => {});
