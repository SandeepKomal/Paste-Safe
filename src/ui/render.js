// @ts-check
import { h } from "./dom.js";

/**
 * @typedef {import("../core/detect.js").Span} Span
 * @typedef {import("../core/detect.js").Finding} Finding
 * @typedef {import("../core/transform.js").Segment} Segment
 * @typedef {import("../core/rules.js").Category} Category
 */

/** @type {Record<Category, string>} */
export const CATEGORY_NAMES = {
  credential: "Credential",
  network: "Network",
  personal: "Personal",
  unknown: "Possible secret",
};

/** Longest stagger before the remaining redaction bars appear together. */
const MAX_STAGGER = 24;

/**
 * A small, stable tilt for a label, so the Sticker theme looks hand-placed
 * but each label keeps the same angle between renders.
 * @param {string} placeholder
 */
export function tiltOf(placeholder) {
  let h = 0;
  for (const c of placeholder) h = (h * 31 + c.charCodeAt(0)) | 0;
  return `${((Math.abs(h) % 9) - 4) * 0.9}deg`;
}

/**
 * Renders masked or restored text. Labels the user hasn't seen yet get the
 * `is-new` class so only they animate, not every label on every keystroke.
 * @param {HTMLElement} el
 * @param {readonly Segment[]} segments
 * @param {Set<string>} seen  Labels already shown; updated in place.
 * @param {ReadonlyMap<string, Category>} [categoryOf]  Placeholder to category, for colour.
 */
export function renderSegments(el, segments, seen, categoryOf = new Map()) {
  const frag = document.createDocumentFragment();
  let fresh = 0;
  for (const s of segments) {
    if (s.placeholder) {
      const isNew = !seen.has(s.placeholder);
      frag.append(h("span", {
        className: isNew ? "redact is-new" : "redact",
        text: s.text,
        attrs: { "data-ph": s.placeholder, "data-cat": categoryOf.get(s.placeholder) ?? "unknown" },
        vars: { r: tiltOf(s.placeholder), ...(isNew ? { i: Math.min(fresh++, MAX_STAGGER) } : {}) },
      }));
      seen.add(s.placeholder);
    } else if (s.restored) {
      frag.append(h("span", { className: "restored", text: s.text, attrs: { "data-ph": s.restored, title: `Was ${s.restored}` } }));
    } else {
      frag.append(s.text);
    }
  }
  el.replaceChildren(frag);
}

/**
 * Draws the highlight layer behind the input box: the same text, with each
 * detected secret wrapped in a mark. The text itself is transparent.
 * @param {HTMLElement} el
 * @param {string} text
 * @param {readonly Span[]} spans
 * @param {ReadonlySet<string>} shown
 * @param {ReadonlyMap<string, Category>} [categoryOf]
 */
export function renderMirror(el, text, spans, shown, categoryOf = new Map()) {
  const frag = document.createDocumentFragment();
  let pos = 0;
  for (const s of spans) {
    if (s.start > pos) frag.append(text.slice(pos, s.start));
    frag.append(h("mark", {
      className: shown.has(s.value) ? "hit is-shown" : "hit",
      text: text.slice(s.start, s.end),
      attrs: { "data-ph": s.placeholder, "data-cat": categoryOf.get(s.placeholder) ?? "unknown" },
    }));
    pos = s.end;
  }
  // A trailing newline in a textarea adds a line; the mirror needs a character to match it.
  frag.append(text.slice(pos) + "\u200b");
  el.replaceChildren(frag);
}

/** The first and last few characters of a secret, enough to recognise it. */
export function preview(/** @type {string} */ value) {
  const v = value.replace(/\s+/g, " ");
  if (v.length <= 10) return v[0] + "•".repeat(Math.max(3, v.length - 1));
  return `${v.slice(0, 4)}••••${v.slice(-3)}`;
}

/**
 * @param {HTMLTableSectionElement} tbody
 * @param {readonly Finding[]} findings
 * @param {ReadonlySet<string>} shown
 */
export function renderLedger(tbody, findings, shown) {
  tbody.replaceChildren(...findings.map((f, i) => {
    const hidden = !shown.has(f.value);
    const toggle = h("input", {
      className: "switch__input",
      attrs: { type: "checkbox", role: "switch", id: `hide-${i}`, "data-index": String(i), "aria-label": `Hide ${f.label} ${f.placeholder}` },
    });
    /** @type {HTMLInputElement} */ (toggle).checked = hidden;
    return h("tr", { className: hidden ? "" : "is-shown", attrs: { "data-ph": f.placeholder } }, [
      h("td", {}, [h("label", { className: "switch", attrs: { for: `hide-${i}` } }, [toggle, h("span", { className: "switch__track", attrs: { "aria-hidden": "true" } })])]),
      h("td", {}, [h("code", { className: "ph", text: f.placeholder })]),
      h("td", {}, [
        h("span", { className: "chip", text: CATEGORY_NAMES[f.category], attrs: { "data-cat": f.category } }),
        h("span", { className: "kind", text: f.label }),
      ]),
      h("td", { className: "num", text: f.count > 1 ? `×${f.count}` : "" }),
      h("td", {}, [h("code", { className: "preview", text: preview(f.value), attrs: { title: "Start and end of the value" } })]),
    ]);
  }));
}
