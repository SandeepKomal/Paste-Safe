// @ts-check
/** @import { Rule } from "../../types/index.js" */

// Order matters: the first rule to claim a piece of text wins, so specific
// formats come before generic ones.
//
// Patterns with a variable-length prefix use a negative lookbehind instead of \b
// so they only start at the beginning of a word. Starting inside words makes
// input like "a.a.a.…" quadratic and freezes the page.

const SECRET_NAME = /password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key/i;

/** @type {readonly Rule[]} */
export const RULES = Object.freeze([
  {
    type: "PRIVATE_KEY", label: "Private key", category: "credential",
    re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  },
  { type: "AWS_KEY", label: "AWS access key ID", category: "credential", re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  {
    type: "AWS_SECRET", label: "AWS secret access key", category: "credential",
    re: /aws_secret_access_key["']?\s*[=:]\s*["']?([A-Za-z0-9/+=]{40})/gid, group: 1,
  },
  {
    type: "AZURE_KEY", label: "Azure storage account key", category: "credential",
    re: /AccountKey=([A-Za-z0-9+/=]{40,})/gd, group: 1,
  },
  {
    type: "GITHUB_TOKEN", label: "GitHub token", category: "credential",
    re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})\b/g,
  },
  { type: "GITLAB_TOKEN", label: "GitLab token", category: "credential", re: /\bglpat-[A-Za-z0-9_-]{20,}/g },
  { type: "NPM_TOKEN", label: "npm token", category: "credential", re: /\bnpm_[A-Za-z0-9]{36}\b/g },
  { type: "SLACK_TOKEN", label: "Slack token", category: "credential", re: /\bxox[abprs]-[A-Za-z0-9-]{10,}/g },
  { type: "STRIPE_KEY", label: "Stripe key", category: "credential", re: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g },
  {
    type: "SENDGRID_KEY", label: "SendGrid key", category: "credential",
    re: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/g,
  },
  { type: "AI_KEY", label: "AI API key", category: "credential", re: /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}/g },
  { type: "GOOGLE_KEY", label: "Google API key", category: "credential", re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  {
    type: "JWT", label: "JWT token", category: "credential",
    re: /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
  },
  {
    type: "DB_PASSWORD", label: "Password in a connection URL", category: "credential",
    re: /(?<![a-z0-9+.-])[a-z][a-z0-9+.-]*:\/\/[^:/\s@]+:([^@/\s]+)@/gid, group: 1,
  },
  {
    type: "BEARER", label: "Bearer token", category: "credential",
    re: /\bBearer\s+([A-Za-z0-9._~+/=-]{16,})/gd, group: 1,
  },
  {
    type: "SECRET", label: "Password or secret setting", category: "credential",
    // Match every name=value pair, then keep it only if the name looks secret.
    // (?=(…))\1 consumes the name atomically so long names can't backtrack.
    re: /(?<![\w.-])(?=([\w.-]+))\1["']?\s*[:=]\s*["']?([^\s"',;]{4,})/gd,
    group: 2,
    skip: (v, m) =>
      !SECRET_NAME.test(m[1] ?? "") || /^[$<{%]/.test(v) || /^(?:true|false|null|none|changeme|\*+)$/i.test(v),
  },
  { type: "EMAIL", label: "Email address", category: "personal", re: /(?<![\w.%+-])[\w.%+-]+@(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}(?![A-Za-z0-9-])/g },
  {
    type: "IP", label: "IP address", category: "network",
    re: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g,
    skip: v => v === "127.0.0.1" || v === "0.0.0.0" || v === "255.255.255.255",
  },
  {
    type: "HOST", label: "Internal or cloud hostname", category: "network",
    re: /(?<![a-z0-9.-])(?:[a-z0-9-]+\.)+(?:internal|local|corp|lan|intra|amazonaws\.com)(?![a-z0-9-])/gi,
  },
]);

// Shannon entropy in bits per char. Random tokens score above 4.2; words and hex don't.
export function entropy(/** @type {string} */ s) {
  /** @type {Record<string, number>} */
  const freq = {};
  for (const c of s) freq[c] = (freq[c] ?? 0) + 1;
  let e = 0;
  for (const n of Object.values(freq)) {
    const p = n / s.length;
    e -= p * Math.log2(p);
  }
  return e;
}

// Catch-all for long random strings. Requiring mixed case and digits rules out
// hex hashes; paths are skipped unless they contain base64 padding.
export const RANDOM_RULE = Object.freeze(/** @type {Rule} */ ({
  type: "SECRET_LIKE", label: "Random-looking string", category: "unknown",
  re: /[A-Za-z0-9+/_=-]{24,}/g,
  skip: v =>
    !(/[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v)) ||
    entropy(v) < 4.2 ||
    (v.includes("/") && !/[+=]/.test(v)),
}));
