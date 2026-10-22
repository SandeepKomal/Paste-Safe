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
 * Unknown labels are left as they are. AIs often change a label slightly, so
 * `IP_1`, `[ip_1]` and `[IP-1]` are all read as `[IP_1]`.
 * @param {string} answer
 * @param {readonly Finding[]} findings
 * @returns {Segment[]}
 */
export function restore(answer, findings) {
  if (!findings.length || !answer) return answer ? [{ text: answer }] : [];
  const byKey = new Map(findings.map(f => [keyOf(f.placeholder), f]));
  const names = findings
    .map(f => f.placeholder.slice(1, -1).split("_").map(escapeRegExp).join("[_ -]"))
    .sort((a, b) => b.length - a.length);
  const re = new RegExp(`\\[?(?<![A-Za-z0-9_])(?:${names.join("|")})(?![A-Za-z0-9_])\\]?`, "gi");
  /** @type {Segment[]} */
  const out = [];
  let pos = 0;
  for (const m of answer.matchAll(re)) {
    const f = byKey.get(keyOf(m[0]));
    if (!f) continue;
    if (m.index > pos) out.push({ text: answer.slice(pos, m.index) });
    out.push({ text: f.value, restored: f.placeholder });
    pos = m.index + m[0].length;
  }
  if (pos < answer.length) out.push({ text: answer.slice(pos) });
  return out;
}

/**
 * Splits out text that still looks like a label after restoring: a label the
 * AI invented or changed beyond recognition. Its secret was not put back, so the
 * reply must not be used as if it were complete.
 * @param {readonly Segment[]} segments  output of `restore`
 * @param {readonly string[]} types  rule types, such as AWS_KEY, to also match without brackets
 * @returns {Segment[]}
 */
export function markLeftovers(segments, types) {
  const bare = [...new Set(types)].map(escapeRegExp).sort((a, b) => b.length - a.length).join("|");
  // Bounded repeats keep this linear on long runs of brackets and underscores.
  const re = new RegExp(
    "\\[[A-Za-z][A-Za-z0-9]{0,30}(?:[_ -][A-Za-z0-9]{1,30}){0,4}[_ -]\\d{1,6}\\]" +
    (bare ? `|(?<![A-Za-z0-9_])(?:${bare})[_-]\\d{1,6}(?![A-Za-z0-9_])` : ""),
    "g",
  );
  return segments.flatMap(s => {
    if (s.restored || s.placeholder) return [s];
    /** @type {Segment[]} */
    const out = [];
    let pos = 0;
    for (const m of s.text.matchAll(re)) {
      if (m.index > pos) out.push({ text: s.text.slice(pos, m.index) });
      out.push({ text: m[0], leftover: true });
      pos = m.index + m[0].length;
    }
    if (pos < s.text.length) out.push({ text: s.text.slice(pos) });
    return out;
  });
}

const keyOf = (/** @type {string} */ label) => label.replace(/[[\]]/g, "").replace(/[ -]/g, "_").toUpperCase();

/** Put in front of the safe text so the AI keeps labels intact in its reply. */
export const AI_NOTE =
  "Note: values in square brackets, like [IP_1], are placeholders for private data. Keep them exactly as written in your answer.";

export const withNote = (/** @type {string} */ text) => (text ? `${AI_NOTE}\n\n${text}` : text);

export const toText = (/** @type {readonly Segment[]} */ segments) => segments.map(s => s.text).join("");

const escapeRegExp = (/** @type {string} */ s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
