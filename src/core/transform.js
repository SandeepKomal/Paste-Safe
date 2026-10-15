// @ts-check
/**
 * @typedef {import("./detect.js").Span} Span
 * @typedef {import("./detect.js").Finding} Finding
 *
 * @typedef {object} Segment  A run of output text. Plain text has neither field set.
 * @property {string} text
 * @property {string} [placeholder]  Set when this run is a label standing in for a secret.
 * @property {string} [restored]     Set when this run is a real value put back for a label.
 */

/**
 * Splits `text` into plain runs and labels, leaving values in `shown` visible.
 * @param {string} text
 * @param {readonly Span[]} spans
 * @param {ReadonlySet<string>} [shown]
 * @returns {Segment[]}
 */
export function mask(text, spans, shown = new Set()) {
  /** @type {Segment[]} */
  const out = [];
  let pos = 0;
  for (const s of spans) {
    if (s.start > pos) out.push({ text: text.slice(pos, s.start) });
    out.push(shown.has(s.value) ? { text: s.value } : { text: s.placeholder, placeholder: s.placeholder });
    pos = s.end;
  }
  if (pos < text.length) out.push({ text: text.slice(pos) });
  return out;
}

/**
 * Puts the real value back for every known label in `answer`. Unknown labels are left as they are.
 * @param {string} answer
 * @param {readonly Finding[]} findings
 * @returns {Segment[]}
 */
export function restore(answer, findings) {
  if (!findings.length || !answer) return answer ? [{ text: answer }] : [];
  const byLabel = new Map(findings.map(f => [f.placeholder, f.value]));
  const re = new RegExp([...byLabel.keys()].map(escapeRegExp).join("|"), "g");
  /** @type {Segment[]} */
  const out = [];
  let pos = 0;
  for (const m of answer.matchAll(re)) {
    if (m.index > pos) out.push({ text: answer.slice(pos, m.index) });
    out.push({ text: /** @type {string} */ (byLabel.get(m[0])), restored: m[0] });
    pos = m.index + m[0].length;
  }
  if (pos < answer.length) out.push({ text: answer.slice(pos) });
  return out;
}

/** Joins segments back into plain text. */
export const toText = (/** @type {readonly Segment[]} */ segments) => segments.map(s => s.text).join("");

const escapeRegExp = (/** @type {string} */ s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
