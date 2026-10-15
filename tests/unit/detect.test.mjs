import { test } from "node:test";
import assert from "node:assert/strict";
import { detect } from "../../src/core/detect.js";
import { mask, restore, toText } from "../../src/core/transform.js";
import { entropy, RULES } from "../../src/core/rules.js";
import { EXAMPLE } from "../../src/example.js";

// Fake keys in well-known formats are joined from two halves so GitHub's
// secret scanner doesn't block pushes of this file. None of them are real.
const fake = (/** @type {string[]} */ ...parts) => parts.join("");

const safe = (text, shown) => toText(mask(text, detect(text).spans, shown));
const found = text => detect(text).findings.map(f => [f.type, f.value]);

test("example: every secret is hidden and nothing leaks into the safe text", () => {
  const { findings } = detect(EXAMPLE);
  const out = safe(EXAMPLE);
  assert.equal(findings.length, 11);
  for (const f of findings) assert.ok(!out.includes(f.value), `${f.placeholder} leaked`);
  assert.ok(out.includes("LOG_LEVEL=debug"), "harmless settings stay");
  assert.ok(out.includes("9f2c7e1a4b8d3c6e5f0a1b2c3d4e5f6a7b8c9d0e"), "commit IDs stay");
});

test("a value found once is hidden everywhere, under one label", () => {
  const text = "postgres://u:Hunter2pass@db:5432/x\nDB_PASSWORD=Hunter2pass\nsee Hunter2pass";
  const { findings } = detect(text);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].count, 3);
  assert.equal(safe(text), "postgres://u:[DB_PASSWORD_1]@db:5432/x\nDB_PASSWORD=[DB_PASSWORD_1]\nsee [DB_PASSWORD_1]");
});

test("labels are numbered per type in order of first appearance", () => {
  const out = safe("a 10.0.0.1 b 10.0.0.2 c 10.0.0.1 d ops@example.com");
  assert.equal(out, "a [IP_1] b [IP_2] c [IP_1] d [EMAIL_1]");
});

test("spans are sorted and never overlap", () => {
  const { spans } = detect(EXAMPLE);
  for (let i = 1; i < spans.length; i++) assert.ok(spans[i].start >= spans[i - 1].end);
});

test("every rule is well formed", () => {
  const types = new Set();
  for (const r of RULES) {
    assert.match(r.type, /^[A-Z][A-Z_]*$/, r.type);
    assert.ok(!types.has(r.type), `duplicate type ${r.type}`);
    types.add(r.type);
    assert.ok(r.re.global, `${r.type} needs the g flag`);
    if (r.group) assert.ok(r.re.hasIndices, `${r.type} needs the d flag`);
    assert.ok(["credential", "network", "personal", "unknown"].includes(r.category));
  }
});

const detected = {
  "AWS access key": ["AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE", "AWS_KEY"],
  "AWS secret key": ['"aws_secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"', "AWS_SECRET"],
  "Azure account key": [fake("DefaultEndpointsProtocol=https;AccountName=x;AccountKey=", "Zm9vYmFyYmF6cXV4", "Zm9vYmFyYmF6cXV4Zm9vYmFyYmF6cXV4==;"), "AZURE_KEY"],
  "GitHub token": [fake("token gh", "p_8fJ2kLmQ0rS7tUvW1xYz3aBcD4eFgH5iJk6L"), "GITHUB_TOKEN"],
  "GitHub fine-grained token": [fake("github_", "pat_11ABCDEFG0123456789_abcdefghijklmnopqrstuvwxyzABCDEFGHIJ"), "GITHUB_TOKEN"],
  "GitLab token": [fake("glp", "at-abcdefghij0123456789"), "GITLAB_TOKEN"],
  "npm token": [fake("np", "m_abcdefghijklmnopqrstuvwxyz0123456789"), "NPM_TOKEN"],
  "Slack token": [fake("SLACK=xo", "xb-1234567890-abcdefghij"), "SLACK_TOKEN"],
  "Stripe key": [fake("sk_", "live_51HxAmPLeK3yN0tR3aL4bCdEf"), "STRIPE_KEY"],
  "SendGrid key": [fake("SG", ".abcdefghijklmnopqr.stuvwxyz0123456789"), "SENDGRID_KEY"],
  "Anthropic key": [fake("key: sk-", "ant-api03-abcDEF123456ghiJKL789mno"), "AI_KEY"],
  "Google API key": [fake("AI", "zaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY"), "GOOGLE_KEY"],
  "JWT": ["eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJkZXBsb3ktYm90In0.c2lnbmF0dXJlLWV4YW1wbGU", "JWT"],
  "private key block": [fake("-----BEGIN RSA PRIVATE ", "KEY-----\nMIIEowIBAAKCAQEA\n-----END RSA PRIVATE KEY-----"), "PRIVATE_KEY"],
  "password in a URL": ["redis://default:s3cr3tPass@cache.internal:6379", "DB_PASSWORD"],
  "bearer token": ["Authorization: Bearer abcdef0123456789ABCDEF", "BEARER"],
  "YAML secret": ['  client_secret: "9aZ!kq2Lw"', "SECRET"],
  "prefixed env var": ["MY_APP_API_KEY=live-9f8e7d6c", "SECRET"],
  "email": ["contact ops@example.com", "EMAIL"],
  "IP address": ["from 10.20.4.17", "IP"],
  "cloud hostname": ["mydb.abc123.us-east-1.rds.amazonaws.com", "HOST"],
  "unnamed random token": ["X-Session: Qm9vT2xLp7sW2xZ8nV4bR1tY6uE3iO0a", "SECRET_LIKE"],
};
for (const [name, [text, type]] of Object.entries(detected)) {
  test(`detects: ${name}`, () => {
    const f = detect(text).findings.find(x => x.type === type);
    assert.ok(f, `expected ${type}, got ${JSON.stringify(found(text))}`);
    assert.ok(!safe(text).includes(f.value));
  });
}

const ignored = {
  "env var reference": "password: ${DB_PASS}",
  "placeholder values": "password=changeme\ntoken: ****",
  "localhost and any-address": "listen 127.0.0.1:8080 and 0.0.0.0",
  "not an IP": "version 999.1.1.1",
  "git commit ID": "commit 3f786850e387550fdab836ed7e6dc881de23001b",
  "UUID": "id 550e8400-e29b-41d4-a716-446655440000",
  "file path": "/usr/local/lib/python3.11/site-packages/requests/adapters.py",
  "plain prose": "The deployment failed because the pod ran out of memory.",
  "public hostname": "see https://docs.github.com/en/actions",
  "empty text": "",
};
for (const [name, text] of Object.entries(ignored)) {
  test(`leaves alone: ${name}`, () => {
    assert.deepEqual(found(text), []);
    assert.equal(safe(text), text);
  });
}

test("values the user unticks stay visible", () => {
  assert.equal(safe("ip 10.1.2.3 key AKIAIOSFODNN7EXAMPLE", new Set(["10.1.2.3"])), "ip 10.1.2.3 key [AWS_KEY_1]");
});

test("restore puts real values back, only for known labels", () => {
  const { findings } = detect("from 10.20.4.17 with AKIAIOSFODNN7EXAMPLE");
  const segs = restore("Block [IP_1], rotate [AWS_KEY_1] and [AWS_KEY_1] again. [IP_9] is unknown.", findings);
  assert.equal(toText(segs), "Block 10.20.4.17, rotate AKIAIOSFODNN7EXAMPLE and AKIAIOSFODNN7EXAMPLE again. [IP_9] is unknown.");
  assert.equal(segs.filter(s => s.restored).length, 3);
});

test("restore handles empty input and no findings", () => {
  assert.deepEqual(restore("", []), []);
  assert.equal(toText(restore("no labels [X_1]", [])), "no labels [X_1]");
});

test("mask then restore gives back the original text", () => {
  const { spans, findings } = detect(EXAMPLE);
  assert.equal(toText(restore(toText(mask(EXAMPLE, spans)), findings)), EXAMPLE);
});

test("entropy separates random tokens from words and hex", () => {
  assert.ok(entropy("Qm9vT2xLp7sW2xZ8nV4bR1tY6uE3iO0a") > 4.2);
  assert.ok(entropy("3f786850e387550fdab836ed7e6dc881de23001b") <= 4);
  assert.equal(entropy("aaaaaaaaaaaaaaaaaaaaaaaa"), 0);
});

test("a 1 MB log is processed in well under a second", () => {
  const big = EXAMPLE.repeat(Math.ceil(1_000_000 / EXAMPLE.length));
  const t = performance.now();
  const { findings } = detect(big);
  const ms = performance.now() - t;
  assert.equal(findings.length, 11);
  assert.ok(ms < 1000, `took ${Math.round(ms)} ms`);
});
