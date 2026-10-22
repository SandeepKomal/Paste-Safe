// @ts-check
/** @import { Rule } from "../../types/index.js" */

// Order matters: the first rule to claim a piece of text wins, so specific
// formats come before generic ones.
//
// Patterns with a variable-length prefix use a negative lookbehind instead of \b
// so they only start at the beginning of a word. Starting inside words makes
// input like "a.a.a.…" quadratic and freezes the page.

const SECRET_NAME = /password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key/i;

// Card numbers must pass the Luhn check and start like a real card brand, so
// timestamps and IDs that happen to be 13-19 digits long are left alone.
const CARD_PREFIX = /^(?:4|5[1-5]|2(?:2[2-9]|[3-6]\d|7[01]|720)|3[47]|6(?:011|5))/;
export function luhn(/** @type {string} */ digits) {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2) d = d * 2 > 9 ? d * 2 - 9 : d * 2;
    sum += d;
  }
  return sum % 10 === 0;
}

export function isIPv6(/** @type {string} */ v) {
  const halves = v.split("::");
  if (halves.length > 2) return false;
  const groups = halves.map(h => (h ? h.split(":") : []));
  if (!groups.flat().every(g => /^[0-9a-f]{1,4}$/i.test(g))) return false;
  const n = groups.flat().length;
  return halves.length === 2 ? n <= 7 : n === 8;
}

// Accounts that belong to the machine or CI system rather than a person.
const SYSTEM_USERS = new Set(["runner", "root", "ubuntu", "ec2-user", "admin", "administrator", "default", "public", "shared", "node", "app", "user", "vagrant", "jenkins", "circleci", "gitlab-runner", "travis", "docker", "www-data", "nobody", "all users", "default user"]);

/** @type {readonly Rule[]} */
export const RULES = Object.freeze([
  {
    type: "PRIVATE_KEY", label: "Private key", category: "credential",
    re: /-----BEGIN [A-Z ]*PRIVATE KEY(?: BLOCK)?-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY(?: BLOCK)?-----/g,
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
  { type: "HF_TOKEN", label: "Hugging Face token", category: "credential", re: /\bhf_[A-Za-z0-9]{30,}\b/g },
  { type: "SHOPIFY_TOKEN", label: "Shopify token", category: "credential", re: /\bshp(?:at|ca|pa|ss)_[a-fA-F0-9]{32}\b/g },
  { type: "TWILIO_KEY", label: "Twilio API key", category: "credential", re: /\bSK[0-9a-fA-F]{32}\b/g },
  {
    type: "DISCORD_TOKEN", label: "Discord token or webhook", category: "credential",
    re: /\b[MNO][A-Za-z0-9_-]{23,25}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,38}\b|(?<=discord(?:app)?\.com\/api\/webhooks\/\d+\/)[A-Za-z0-9_-]{60,}/g,
  },
  {
    type: "GCP_KEY", label: "Google Cloud service account key ID", category: "credential",
    re: /"private_key_id"\s*:\s*"([a-f0-9]{40})"/gd, group: 1,
  },
  { type: "GITLAB_TOKEN", label: "GitLab token", category: "credential", re: /\bglpat-[A-Za-z0-9_-]{20,}/g },
  { type: "NPM_TOKEN", label: "npm token", category: "credential", re: /\bnpm_[A-Za-z0-9]{36}\b/g },
  { type: "VAULT_TOKEN", label: "HashiCorp Vault token", category: "credential", re: /\bhv[sbr]\.[A-Za-z0-9_-]{24,}/g },
  { type: "DO_TOKEN", label: "DigitalOcean token", category: "credential", re: /\bdo[opr]_v1_[a-f0-9]{64}\b/g },
  { type: "PYPI_TOKEN", label: "PyPI token", category: "credential", re: /\bpypi-AgEIcHlwaS5vcmc[A-Za-z0-9_-]{50,}/g },
  { type: "POSTMAN_KEY", label: "Postman API key", category: "credential", re: /\bPMAK-[a-f0-9]{24}-[a-f0-9]{34}\b/g },
  { type: "GRAFANA_TOKEN", label: "Grafana token", category: "credential", re: /\bgl(?:sa_[A-Za-z0-9]{32}_[a-f0-9]{8}\b|c_[A-Za-z0-9+/]{32,}={0,2})/g },
  { type: "NEWRELIC_KEY", label: "New Relic key", category: "credential", re: /\bNR(?:AK|II|JS)-[A-Za-z0-9]{19,32}\b/g },
  {
    type: "SENTRY_DSN", label: "Sentry DSN key", category: "credential",
    re: /https:\/\/([a-f0-9]{32})@[a-z0-9.-]*sentry\.io/gd, group: 1,
  },
  { type: "ATLASSIAN_TOKEN", label: "Atlassian API token", category: "credential", re: /\bATATT3[A-Za-z0-9_=-]{50,}/g },
  { type: "LINEAR_KEY", label: "Linear API key", category: "credential", re: /\blin_api_[A-Za-z0-9]{40}\b/g },
  { type: "SUPABASE_TOKEN", label: "Supabase token", category: "credential", re: /\bsbp_[a-f0-9]{40}\b/g },
  { type: "DOPPLER_TOKEN", label: "Doppler token", category: "credential", re: /\bdp\.(?:pt|st|sa|ct)\.[A-Za-z0-9]{40,44}\b/g },
  { type: "MAILGUN_KEY", label: "Mailgun key", category: "credential", re: /\bkey-[a-f0-9]{32}\b/g },
  { type: "SONAR_TOKEN", label: "SonarQube token", category: "credential", re: /\bsq[apu]_[a-f0-9]{40}\b/g },
  { type: "DATABRICKS_TOKEN", label: "Databricks token", category: "credential", re: /\bdapi[a-f0-9]{32}(?:-\d)?\b/g },
  {
    type: "KUBE_KEY", label: "Kubernetes client key", category: "credential",
    re: /\bclient-key-data:\s*([A-Za-z0-9+/=]{20,})/gd, group: 1,
  },
  {
    type: "AZURE_SAS", label: "Azure shared access key", category: "credential",
    re: /SharedAccessKey=([A-Za-z0-9+/=]{20,})/gd, group: 1,
  },
  {
    type: "PASSWORD_HASH", label: "Password hash", category: "credential",
    re: /\$(?:2[abxy]\$\d{2}\$[./A-Za-z0-9]{53}|argon2(?:id|i|d)\$[^\s"']{20,}|[156]\$[./A-Za-z0-9]{1,16}\$[./A-Za-z0-9]{22,86})/g,
  },
  {
    type: "NTLM_HASH", label: "NTLM hash", category: "credential",
    re: /(?<![a-fA-F0-9])[a-fA-F0-9]{32}:[a-fA-F0-9]{32}(?![a-fA-F0-9])/g,
  },
  {
    type: "CLI_SECRET", label: "Secret passed on the command line", category: "credential",
    re: /(?<![\w-])--(?:password|passwd|token|secret|api-key|client-secret|access-key|secret-key|auth-token)[= ]+["']?([^\s"']{4,})/gid,
    group: 1,
    skip: v => /^[$<{%]/.test(v) || /^\*+$/.test(v),
  },
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
    type: "BASIC_AUTH", label: "Basic auth credentials", category: "credential",
    re: /\bBasic\s+([A-Za-z0-9+/]{12,}={0,2})/gd, group: 1,
  },
  {
    type: "DOCKER_AUTH", label: "Docker registry login", category: "credential",
    re: /"auth"\s*:\s*"([A-Za-z0-9+/]{12,}={0,2})"/gd, group: 1,
  },
  {
    type: "URL_TOKEN", label: "Token in a URL", category: "credential",
    re: /[?&](?:access_token|token|api_?key|apikey|key|sig|signature|secret|password|auth|code|X-Amz-Signature|X-Amz-Credential|X-Goog-Signature)=([^&\s#"'<>]{6,})/gid,
    group: 1,
    skip: v => /^[$<{%]/.test(v),
  },
  {
    type: "SESSION", label: "Session cookie", category: "credential",
    re: /\b(?:session|sessionid|session_id|sid|connect\.sid|JSESSIONID|PHPSESSID|_session|auth_token|remember_token|csrftoken)=([^;\s"'&,]{8,})/gid,
    group: 1,
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
  {
    type: "CARD", label: "Payment card number", category: "personal",
    re: /(?<![\d.-])(?:\d[ -]?){12,18}\d(?![\d.-])/g,
    skip: v => {
      const d = v.replace(/\D/g, "");
      return d.length < 13 || !CARD_PREFIX.test(d) || /^(\d)\1+$/.test(d) || !luhn(d);
    },
  },
  {
    type: "PHONE", label: "Phone number", category: "personal",
    re: /(?<![\w+])\+\d{1,3}[ .-]?(?:\(\d{1,4}\)[ .-]?)?\d{2,4}(?:[ .-]?\d{2,4}){1,4}(?!\w)|(?<!\w)\(\d{3}\) ?\d{3}-\d{4}(?!\w)/g,
    skip: v => {
      const n = v.replace(/\D/g, "").length;
      return n < 8 || n > 15;
    },
  },
  {
    type: "USERNAME", label: "Username in a file path", category: "personal",
    re: /(?:\/home\/|\/Users\/|[A-Za-z]:\\{1,2}Users\\{1,2})([A-Za-z0-9._-]{2,32})/gd, group: 1,
    skip: v => SYSTEM_USERS.has(v.toLowerCase()),
  },
  { type: "EMAIL", label: "Email address", category: "personal", re: /(?<![\w.%+-])[\w.%+-]+@(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}(?![A-Za-z0-9-])/g },
  {
    type: "IP", label: "IP address", category: "network",
    re: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g,
    skip: v => v === "127.0.0.1" || v === "0.0.0.0" || v === "255.255.255.255",
  },
  {
    type: "IPV6", label: "IPv6 address", category: "network",
    // Find runs of hex and colons, then check they really are an address.
    re: /(?<![\w:.])(?=[0-9a-fA-F:]*:[0-9a-fA-F]*:)[0-9a-fA-F:]{3,39}(?![\w:])/g,
    skip: v => !isIPv6(v) || v === "::" || v === "::1",
  },
  {
    type: "MAC", label: "MAC address", category: "network",
    re: /(?<![\w:-])[0-9A-Fa-f]{2}([:-])[0-9A-Fa-f]{2}(?:\1[0-9A-Fa-f]{2}){4}(?![\w:-])/g,
    skip: v => /^(?:00[:-]){5}00$|^(?:ff[:-]){5}ff$/i.test(v),
  },
  {
    type: "AWS_ACCOUNT", label: "AWS account ID in an ARN", category: "network",
    re: /\barn:aws[a-z-]*:[a-z0-9-]+:[a-z0-9-]*:(\d{12}):/gd, group: 1,
  },
  {
    type: "HOST", label: "Internal or cloud hostname", category: "network",
    re: /(?<![a-z0-9.-])(?:[a-z0-9-]+\.)+(?:internal|local|corp|lan|intra|amazonaws\.com)(?![a-z0-9-])/gi,
  },
]);

/**
 * Rules for words the user always wants hidden, such as a company or server name.
 * They run before the built-in rules so they win any overlap.
 * @param {readonly string[]} words
 * @returns {Rule[]}
 */
export function wordRules(words) {
  // Lines starting with # are comments, so a shared list can explain itself.
  const clean = [...new Set(words.map(w => w.trim()).filter(w => w.length >= 2 && !w.startsWith("#")))]
    .sort((a, b) => b.length - a.length)
    .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!clean.length) return [];
  return [{
    type: "PRIVATE", label: "Your own word", category: "personal",
    re: new RegExp(`(?<![A-Za-z0-9_])(?:${clean.join("|")})(?![A-Za-z0-9_])`, "gi"),
  }];
}

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
