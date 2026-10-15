// @ts-check
import { RULES, RANDOM_RULE } from "./rules.js";

/**
 * @typedef {import("./rules.js").Rule} Rule
 * @typedef {import("./rules.js").Category} Category
 *
 * @typedef {object} Span  One place in the text where a secret appears.
 * @property {number} start
 * @property {number} end
 * @property {string} value
 * @property {string} placeholder
 *
 * @typedef {object} Finding  One distinct secret value, however many times it appears.
 * @property {string} value
 * @property {string} type
 * @property {string} label
 * @property {Category} category
 * @property {string} placeholder  e.g. `[AWS_KEY_1]`
 * @property {number} count
 *
 * @typedef {object} Detection
 * @property {Span[]} spans        Sorted by position, never overlapping.
 * @property {Finding[]} findings  In order of first appearance.
 */

/** Values this short are too likely to appear by chance to hide everywhere they occur. */
const MIN_REPEAT_LENGTH = 4;

/**
 * Finds every secret in `text`.
 * The same value always gets the same placeholder, numbered per type in order of first appearance.
 * @param {string} text
 * @param {readonly Rule[]} [rules]
 * @returns {Detection}
 */
export function detect(text, rules = RULES) {
  /** @type {{ start: number, end: number, value: string, rule: Rule }[]} */
  const raw = [];
  // One flag per character, so checking a match against earlier ones costs only the
  // match's own length. Comparing against every earlier match is quadratic and stalls
  // on large logs.
  const claimed = new Uint8Array(text.length);
  const isFree = (/** @type {number} */ s, /** @type {number} */ e) => claimed.subarray(s, e).every(c => c === 0);
  const claim = (/** @type {number} */ start, /** @type {number} */ end, /** @type {string} */ value, /** @type {Rule} */ rule) => {
    claimed.fill(1, start, end);
    raw.push({ start, end, value, rule });
  };

  for (const rule of [...rules, RANDOM_RULE]) {
    for (const m of text.matchAll(rule.re)) {
      const [start, end] = rule.group ? (m.indices?.[rule.group] ?? [-1, -1]) : [m.index, m.index + m[0].length];
      if (start < 0 || end <= start) continue;
      const value = text.slice(start, end);
      if (rule.skip?.(value) || !isFree(start, end)) continue;
      claim(start, end, value, rule);
    }
  }

  // A value found once is hidden everywhere it appears, even where no rule would catch it.
  /** @type {Map<string, Rule>} */
  const firstRule = new Map();
  for (const r of raw) if (!firstRule.has(r.value)) firstRule.set(r.value, r.rule);
  for (const [value, rule] of firstRule) {
    if (value.length < MIN_REPEAT_LENGTH) continue;
    for (let i = text.indexOf(value); i !== -1; i = text.indexOf(value, i + value.length)) {
      if (isFree(i, i + value.length)) claim(i, i + value.length, value, rule);
    }
  }
  raw.sort((a, b) => a.start - b.start);

  /** @type {Map<string, Finding>} */
  const byValue = new Map();
  /** @type {Record<string, number>} */
  const perType = {};
  const spans = raw.map(r => {
    let f = byValue.get(r.value);
    if (!f) {
      perType[r.rule.type] = (perType[r.rule.type] ?? 0) + 1;
      f = {
        value: r.value, type: r.rule.type, label: r.rule.label, category: r.rule.category,
        placeholder: `[${r.rule.type}_${perType[r.rule.type]}]`, count: 0,
      };
      byValue.set(r.value, f);
    }
    f.count++;
    return { start: r.start, end: r.end, value: r.value, placeholder: f.placeholder };
  });
  return { spans, findings: [...byValue.values()] };
}
