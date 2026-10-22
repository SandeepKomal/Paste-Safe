// @ts-check
import { detect } from "./core/detect.js";
import { RULES, wordRules } from "./core/rules.js";
import { markLeftovers, mask, restore, toText, withNote } from "./core/transform.js";
import { SAMPLES } from "./coverage.js";
import { EXAMPLE, exampleAnswer } from "./example.js";
import { COMMIT, REPO, VERSION } from "./version.js";
import { copyText } from "./ui/clipboard.js";
import { debounce, formatBytes, h, req } from "./ui/dom.js";
import { watchExternalRequests } from "./ui/netwatch.js";
import { wirePeek } from "./ui/peek.js";
import { wireCloser } from "./ui/closer.js";
import { wireFilm } from "./ui/film.js";
import { refuseFrames } from "./ui/frame.js";
import { wireMenu } from "./ui/menu.js";
import { wireMotion } from "./ui/motion.js";
import { wirePrivacyReel } from "./ui/privacy-reel.js";
import { wireScrollStory } from "./ui/scroll-story.js";
import { KEYS, load, save } from "./ui/store.js";
import { CATEGORY_NAMES, renderLedger, renderMirror, renderSegments } from "./ui/render.js";

refuseFrames();

// Above this size, detection is debounced instead of running on every keystroke.
const SYNC_LIMIT = 50_000;
// Above this size, detection runs in a worker so the page stays responsive.
const WORKER_LIMIT = 200_000;
// Above this many labels, the text is drawn without per-label highlights:
// laying out tens of thousands of inline elements takes the browser seconds.
const RICH_LIMIT = 2_000;
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const TYPES = [...RULES.map(r => r.type), "PRIVATE", "SECRET_LIKE"];

/** Templates to start a word list from. Lines starting with # are notes. */
const STARTERS = {
  clients: "# Clients and projects: replace these examples with your own\nAcme Payments\nNorthwind Traders\nProject Bluebird",
  support: "# Support mail: customer and staff names that show up in tickets\nPriya Sharma\nJordan Lee\nContoso Ltd",
};

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
  copyNote: req("#copyNote", HTMLElement),
  copyRestored: req("#copyRestored", HTMLButtonElement),
  loadExample: req("#loadExample", HTMLButtonElement),
  clear: req("#clear", HTMLButtonElement),
  netcount: req("#netcount", HTMLElement),
  netcheck: req("#netcheck", HTMLElement),
  status: req("#status", HTMLElement),
  peek: req("#peek", HTMLElement),
  peekValue: req("#peekValue", HTMLElement),
  plainMode: req("#plainMode", HTMLInputElement),
  plainModeAnswer: req("#plainModeAnswer", HTMLInputElement),
  build: req("#build", HTMLAnchorElement),
  verifyVersion: req("#verifyVersion", HTMLElement),
  verifyCommit: req("#verifyCommit", HTMLElement),
  coverageList: req("#coverageList", HTMLElement),
  coverageFoot: req("#coverageFoot", HTMLElement),
  figRequests: req("#figRequests", HTMLElement),
  figRules: req("#figRules", HTMLElement),
  actionbar: req("#actionbar", HTMLElement),
  actionHidden: req("#actionHidden", HTMLElement),
  actionCopy: req("#actionCopy", HTMLButtonElement),
  withNote: req("#withNote", HTMLInputElement),
  words: req("#words", HTMLTextAreaElement),
  openFile: req("#openFile", HTMLButtonElement),
  fileInput: req("#fileInput", HTMLInputElement),
  dropZone: req("#dropZone", HTMLElement),
  wordsPanel: req("#wordsPanel", HTMLDetailsElement),
  importWords: req("#importWords", HTMLButtonElement),
  exportWords: req("#exportWords", HTMLButtonElement),
  wordsFile: req("#wordsFile", HTMLInputElement),
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
  el.actionHidden.textContent = String(hidden.length);
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
  const segments = markLeftovers(restore(el.answer.value, active), TYPES);
  state.restoredText = toText(segments);
  renderSegments(el.restored, segments, seenLabels);
  const n = segments.filter(s => s.restored).length;
  const left = segments.filter(s => s.leftover).length;
  el.restoreNote.textContent = el.answer.value
    ? `${n} label${n === 1 ? "" : "s"} put back.${left ? ` ${left} still look${left === 1 ? "s" : ""} like a label.` : ""}`
    : "Real values come back highlighted.";
  el.restoreNote.classList.toggle("is-warn", left > 0);
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
 * @param {() => string} doneMessage
 * @param {() => boolean} [allow]  asked before copying; return false to stop
 */
function wireCopy(button, getText, fallback, doneMessage, allow = () => true) {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let reset;
  button.addEventListener("click", async () => {
    const text = getText();
    if (!text) {
      el.status.textContent = "There's nothing to copy yet.";
      return;
    }
    if (!allow()) return;
    const result = await copyText(text, fallback);
    button.dataset.state = result === "copied" ? "done" : "";
    el.status.textContent = result === "copied" ? doneMessage() : "Your browser blocked copying. The text is selected: press Ctrl+C, or Cmd+C on a Mac.";
    clearTimeout(reset);
    reset = setTimeout(() => (button.dataset.state = ""), 2000);
  });
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
  el.input.value = text;
  edited = true;
  state.shown.clear();
  analyse();
  el.status.textContent = `Opened ${file.name}.`;
}

function loadExample() {
  edited = false;
  el.input.value = EXAMPLE;
  state.shown.clear();
  analyse();
  el.answer.value = exampleAnswer(state.detection.findings);
  paintAnswer();
}

el.input.addEventListener("input", () => (el.input.value.length <= SYNC_LIMIT ? analyse() : analyseLater()));
el.input.addEventListener("scroll", syncScroll, { passive: true });
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

el.words.value = load(KEYS.words) ?? "";
const readWords = () => (words = el.words.value.split("\n"));
readWords();
function wordsChanged() {
  readWords();
  save(KEYS.words, el.words.value);
  analyse();
  paintCoverage();
}
el.words.addEventListener("input", debounce(wordsChanged, 250));

/** Adds lines to the list, skipping ones it already has. */
function addWords(/** @type {string} */ text) {
  const have = new Set(el.words.value.split("\n").map(w => w.trim().toLowerCase()));
  const add = text.split(/\r?\n/).map(w => w.trim()).filter(w => w && !have.has(w.toLowerCase()));
  el.words.value = [el.words.value.trimEnd(), ...add].filter(Boolean).join("\n");
  wordsChanged();
  return add.filter(w => !w.startsWith("#")).length;
}
el.importWords.addEventListener("click", () => el.wordsFile.click());
el.wordsFile.addEventListener("change", async () => {
  const file = el.wordsFile.files?.[0];
  el.wordsFile.value = "";
  if (!file) return;
  if (file.size > 1024 * 1024) {
    el.status.textContent = `${file.name} is too large for a word list.`;
    return;
  }
  const n = addWords(await file.text());
  el.status.textContent = `Imported ${n} word${n === 1 ? "" : "s"} from ${file.name}.`;
});
el.exportWords.addEventListener("click", () => {
  // Only the list goes into the file, never the text being checked.
  const url = URL.createObjectURL(new Blob([el.words.value.trim() + "\n"], { type: "text/plain" }));
  const link = h("a", { attrs: { href: url, download: "paste-safe-words.txt", hidden: "" } });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  el.status.textContent = "Exported your word list.";
});
for (const b of document.querySelectorAll("[data-starter]")) {
  b.addEventListener("click", () => {
    const n = addWords(STARTERS[/** @type {keyof typeof STARTERS} */ (b.getAttribute("data-starter"))] ?? "");
    el.status.textContent = `Added ${n} example word${n === 1 ? "" : "s"}. Replace them with your own.`;
    el.words.focus();
  });
}
el.withNote.checked = load(KEYS.note) !== "0";
el.withNote.addEventListener("change", () => save(KEYS.note, el.withNote.checked ? "1" : "0"));
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
  lookup: p => (el.plainMode.checked ? undefined : state.detection.findings.find(f => f.placeholder === p)?.value),
});

// Plain mode hides real values on the page, for a shared screen.
// The toolbar and the answer pane each have a switch; they stay in step.
const plainSwitches = [el.plainMode, el.plainModeAnswer];
const setPlain = (/** @type {boolean} */ on) => {
  for (const s of plainSwitches) s.checked = on;
  document.documentElement.classList.toggle("is-plain", on);
};
setPlain(load(KEYS.plain) === "1");
for (const sw of plainSwitches) sw.addEventListener("change", () => {
  const on = sw.checked;
  setPlain(on);
  el.status.textContent = on ? "Plain mode on: real values are hidden on this page." : "Plain mode off.";
  save(KEYS.plain, on ? "1" : "0");
});

/** @type {ReturnType<typeof setTimeout> | undefined} */
let noteReset;
const safeToCopy = () => (el.withNote.checked ? withNote(state.safeText) : state.safeText);
const copiedSafe = () => {
  const n = state.detection.findings.filter(f => !state.shown.has(f.value)).length;
  const msg = `Copied. ${n} secret${n === 1 ? "" : "s"} replaced, raw text not copied.`;
  el.copyNote.textContent = msg;
  clearTimeout(noteReset);
  noteReset = setTimeout(() => (el.copyNote.textContent = ""), 6000);
  return msg;
};
wireCopy(el.copySafe, safeToCopy, el.safe, copiedSafe);
wireCopy(el.actionCopy, safeToCopy, el.safe, copiedSafe);
wireCopy(
  el.copyRestored, () => state.restoredText, el.restored,
  () => "Copied the answer with your real values.",
  () => !el.plainMode.checked || confirm("This copy contains your real values. Copy it anyway?"),
);
el.loadExample.addEventListener("click", loadExample);
el.clear.addEventListener("click", () => {
  edited = false;
  el.input.value = "";
  el.answer.value = "";
  state.shown.clear();
  analyse();
  el.input.focus();
});
new ResizeObserver(syncScroll).observe(el.input);

watchExternalRequests(n => {
  el.netcount.textContent = String(n);
  el.figRequests.textContent = String(n);
  el.netcheck.classList.toggle("is-warn", n > 0);
});

/** Runs the real detector on fake samples, so the card shows what this copy catches. */
function paintCoverage() {
  let caught = 0;
  el.coverageList.replaceChildren(...SAMPLES.map(s => {
    const d = detect(s.text, rules());
    const safe = toText(mask(s.text, d.spans));
    const ok = !safe.includes(s.secret);
    if (ok) caught++;
    const status = ok ? (s.gap ? "Caught by your words" : "Caught") : s.gap ? "Known gap" : "Missed";
    return h("li", { className: ok ? "is-caught" : "is-missed" }, [
      h("span", { className: "coverage__mark", text: ok ? "✓" : "–", attrs: { "aria-hidden": "true" } }),
      h("span", { className: "coverage__name", text: s.name }),
      h("code", { className: "coverage__sample", text: safe }),
      h("span", { className: "coverage__status", text: status }),
    ]);
  }));
  el.coverageFoot.textContent = `${caught} of ${SAMPLES.length} samples caught in this tab. Missed a real secret? Report its format on GitHub, with a fake value.`;
}

const build = COMMIT === "dev" ? `v${VERSION}` : `v${VERSION} · ${COMMIT}`;
el.build.textContent = build;
el.verifyVersion.textContent = `v${VERSION}`;
if (COMMIT !== "dev") {
  el.verifyCommit.replaceChildren(" from commit ", h("a", { text: COMMIT, attrs: { href: `${REPO}/commit/${COMMIT}` } }));
}

el.figRules.textContent = String(RULES.length);

// The phone action bar shows while the tool is on screen but its own Copy button is not.
const onScreen = new Map();
const syncActionbar = () => {
  const show = !!(onScreen.get(el.dropZone) || onScreen.get(el.ledgerWrap) || onScreen.get(el.safe)) && !onScreen.get(el.copySafe);
  el.actionbar.classList.toggle("is-shown", show);
  el.actionbar.inert = !show;
};
const watcher = new IntersectionObserver(entries => {
  for (const e of entries) onScreen.set(e.target, e.isIntersecting);
  syncActionbar();
});
for (const target of [el.dropZone, el.safe, el.ledgerWrap, el.copySafe]) watcher.observe(target);

paintCoverage();
wirePrivacyReel();
wireScrollStory();
wireCloser();
wireFilm();
wireMenu();
wireMotion();
loadExample();

// Offline support and "install as an app". Only works over https or localhost.
navigator.serviceWorker?.register("sw.js").catch(() => {});
