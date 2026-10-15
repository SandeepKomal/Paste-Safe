// @ts-check
import { RULES, RANDOM_RULE } from "./rules.js";

/** @import { Rule, Finding, Detection } from "../../types/index.js" */

// Shorter values match by chance too often to hide every occurrence.
const MIN_REPEAT_LENGTH = 4;

/**
 * @param {string} text
 * @param {readonly Rule[]} [rules]
 * @returns {Detection}
 */
export function detect(text, rules = RULES) {
  /** @type {{ start: number, end: number, value: string, rule: Rule }[]} */
  const raw = [];
  // Per-character flags keep overlap checks linear; comparing against every
  // earlier match was quadratic and stalled on large logs.
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
      if (rule.skip?.(value, m) || !isFree(start, end)) continue;
      claim(start, end, value, rule);
    }
  }

  // Hide every copy of a found value, even where no rule would match it.
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
