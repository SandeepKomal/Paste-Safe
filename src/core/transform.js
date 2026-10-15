// @ts-check
/** @import { Span, Finding, Segment } from "../../types/index.js" */

/**
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
 * Unknown labels are left as they are.
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

export const toText = (/** @type {readonly Segment[]} */ segments) => segments.map(s => s.text).join("");

const escapeRegExp = (/** @type {string} */ s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
