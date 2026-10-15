// @ts-check
// All secrets here are fake (the AWS pair is AWS's documented example). Some are
// split in two so GitHub secret scanning doesn't flag this file.
const STRIPE = "sk_" + "live_51HxAmPLeK3yN0tR3aL4bCdEf";
const GITHUB_TOKEN = "gh" + "p_8fJ2kLmQ0rS7tUvW1xYz3aBcD4eFgH5iJk6L";

export const EXAMPLE = `# Deploy failed on prod, help me debug (example, all secrets are fake)

2026-10-15T09:12:44Z deploy-api[4121]: connecting to postgres://app_user:Tr0ub4dor&3xyz@prod-db.cluster-c9xk2.eu-west-1.rds.amazonaws.com:5432/orders
2026-10-15T09:12:49Z deploy-api[4121]: ERROR timeout after 5000ms from 10.20.4.17 to 10.20.9.250:5432
2026-10-15T09:12:49Z deploy-api[4121]: retry 1/3 (requested by ops-alerts@acme-payments.io)

# .env used by the job
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
GITHUB_TOKEN=${GITHUB_TOKEN}
STRIPE_SECRET=${STRIPE}
DB_PASSWORD=Tr0ub4dor&3xyz
LOG_LEVEL=debug

curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJkZXBsb3ktYm90In0.c2lnbmF0dXJlLWV4YW1wbGU" https://api.internal.acme.corp/v1/deploys
commit 9f2c7e1a4b8d3c6e5f0a1b2c3d4e5f6a7b8c9d0e`;

/** @import { Finding } from "../types/index.js" */

/** @param {readonly Finding[]} findings  the currently hidden ones */
export function exampleAnswer(findings) {
  const label = (/** @type {string} */ type) => findings.find(f => f.type === type)?.placeholder;
  const host = label("HOST");
  const ip = label("IP");
  const key = label("AWS_KEY");
  const password = label("DB_PASSWORD") ?? label("SECRET");
  const lines = ["(Example answer, written the way an AI would reply to the safe text.)", ""];
  if (host && ip) {
    lines.push(`The connection from ${ip} to ${host} is timing out on port 5432. Check that the database's security group allows inbound 5432 from ${ip}, and that both are in the same VPC.`, "");
  }
  if (password) lines.push(`Your database password ${password} appears in plain text in the log and in .env. Move it to a secrets manager and rotate it.`, "");
  if (key) lines.push(`The AWS key ${key} was committed to .env. Deactivate it in IAM now, create a new one, and store it as a CI secret.`);
  if (lines.length === 2) lines.push("Paste a log with a hostname, IP or key above to see labels turned back into real values here.");
  return lines.join("\n");
}
