// Finds secrets in text, swaps them for labels, and swaps labels back.
// No DOM and no network, so it runs unchanged in the browser and in Node tests.
//
// To add a detector, add a rule to RULES: { type, label, re, group?, skip? }.
// Rules run in order and the first rule to claim a span wins, so put specific
// formats (known key prefixes) before general ones (key=value settings).

export const RULES = [
  { type: "PRIVATE_KEY", label: "Private key", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g },
  { type: "AWS_KEY", label: "AWS access key ID", re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { type: "AWS_SECRET", label: "AWS secret access key", re: /aws_secret_access_key["']?\s*[=:]\s*["']?([A-Za-z0-9\/+=]{40})/gid, group: 1 },
  { type: "GITHUB_TOKEN", label: "GitHub token", re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})\b/g },
  { type: "SLACK_TOKEN", label: "Slack token", re: /\bxox[abprs]-[A-Za-z0-9-]{10,}/g },
  { type: "STRIPE_KEY", label: "Stripe key", re: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g },
  { type: "AI_KEY", label: "AI API key", re: /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}/g },
  { type: "GOOGLE_KEY", label: "Google API key", re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { type: "JWT", label: "JWT token", re: /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g },
  { type: "DB_PASSWORD", label: "Password in a connection URL", re: /\b[a-z][a-z0-9+.-]*:\/\/[^:\/\s@]+:([^@\/\s]+)@/gid, group: 1 },
  { type: "BEARER", label: "Bearer token", re: /\bBearer\s+([A-Za-z0-9._~+\/=-]{16,})/gd, group: 1 },
  { type: "SECRET", label: "Password or secret setting",
    re: /\b[\w.-]*?(?:password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|client[_-]?secret|private[_-]?key)\w*["']?\s*[:=]\s*["']?([^\s"',;]{4,})/gid, group: 1,
    skip: v => /^[$<{%]/.test(v) || /^(true|false|null|none|changeme|\*+)$/i.test(v) },
  { type: "EMAIL", label: "Email address", re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { type: "IP", label: "IP address", re: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g,
    skip: v => v === "127.0.0.1" || v === "0.0.0.0" || v === "255.255.255.255" },
  { type: "HOST", label: "Internal or cloud hostname", re: /\b(?:[a-z0-9-]+\.)+(?:internal|local|corp|lan|intra|amazonaws\.com)\b/gi },
];

export function entropy(s) {
  const f = {};
  for (const c of s) f[c] = (f[c] || 0) + 1;
  let e = 0;
  for (const k in f) { const p = f[k] / s.length; e -= p * Math.log2(p); }
  return e;
}
// Long random-looking strings that no named rule caught. Hex-only strings (hashes, commit IDs) never pass 4.2.
export const RANDOM_RULE = { type: "SECRET_LIKE", label: "Random-looking string (possible secret)", re: /[A-Za-z0-9+\/_=-]{24,}/g,
  skip: v => !(/[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v)) || entropy(v) < 4.2 || v.includes("/") && !/[+=]/.test(v) };

export function findSecrets(text) {
  const found = [];
  const overlaps = (s, e) => found.some(f => s < f.end && e > f.start);
  for (const rule of [...RULES, RANDOM_RULE]) {
    rule.re.lastIndex = 0;
    for (const m of text.matchAll(rule.re)) {
      const [start, end] = rule.group ? m.indices[rule.group] : [m.index, m.index + m[0].length];
      const value = text.slice(start, end);
      if (rule.skip && rule.skip(value)) continue;
      if (overlaps(start, end)) continue;
      found.push({ start, end, value, type: rule.type, label: rule.label });
    }
  }
  // A value found once is hidden everywhere it appears, even where no rule would catch it.
  for (const f of [...found]) {
    if (f.value.length < 4) continue;
    for (let i = text.indexOf(f.value); i !== -1; i = text.indexOf(f.value, i + f.value.length)) {
      if (!overlaps(i, i + f.value.length)) found.push({ start: i, end: i + f.value.length, value: f.value, type: f.type, label: f.label });
    }
  }
  found.sort((a, b) => a.start - b.start);
  // Same value, same placeholder. Numbered per type in order of first appearance.
  const byValue = new Map(), counts = {};
  for (const f of found) {
    if (!byValue.has(f.value)) {
      counts[f.type] = (counts[f.type] || 0) + 1;
      byValue.set(f.value, { value: f.value, type: f.type, label: f.label, placeholder: `[${f.type}_${counts[f.type]}]`, count: 0 });
    }
    const item = byValue.get(f.value);
    item.count++;
    f.placeholder = item.placeholder;
  }
  return { spans: found, items: [...byValue.values()] };
}

// Returns segments: { text } or { text, placeholder, value } for each hidden value.
export function maskSegments(text, spans, shown) {
  const out = [];
  let pos = 0;
  for (const s of spans) {
    if (s.start > pos) out.push({ text: text.slice(pos, s.start) });
    out.push(shown.has(s.value) ? { text: s.value } : { text: s.placeholder, placeholder: s.placeholder, value: s.value });
    pos = s.end;
  }
  if (pos < text.length) out.push({ text: text.slice(pos) });
  return out;
}

// Replaces every known placeholder in the answer with its real value.
export function restoreSegments(answer, items) {
  const map = new Map(items.map(i => [i.placeholder, i.value]));
  if (!map.size) return [{ text: answer }];
  const re = new RegExp([...map.keys()].map(k => k.replace(/[[\]]/g, "\\$&")).join("|"), "g");
  const out = [];
  let pos = 0;
  for (const m of answer.matchAll(re)) {
    if (m.index > pos) out.push({ text: answer.slice(pos, m.index) });
    out.push({ text: map.get(m[0]), restored: m[0] });
    pos = m.index + m[0].length;
  }
  if (pos < answer.length) out.push({ text: answer.slice(pos) });
  return out;
}
