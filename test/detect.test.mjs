import { test } from "node:test";
import assert from "node:assert/strict";
import { findSecrets, maskSegments, restoreSegments, entropy } from "../src/detect.js";
import { EXAMPLE } from "../src/example.js";

const mask = (text, shown = new Set()) => {
  const { spans } = findSecrets(text);
  return maskSegments(text, spans, shown).map(s => s.text).join("");
};
const found = text => findSecrets(text).items.map(i => [i.type, i.value]);

test("example: every secret is hidden and nothing leaks into the safe text", () => {
  const { items } = findSecrets(EXAMPLE);
  const safe = mask(EXAMPLE);
  assert.equal(items.length, 11);
  for (const i of items) assert.ok(!safe.includes(i.value), `${i.placeholder} leaked`);
  assert.ok(safe.includes("LOG_LEVEL=debug"), "harmless settings stay");
  assert.ok(safe.includes("9f2c7e1a4b8d3c6e5f0a1b2c3d4e5f6a7b8c9d0e"), "commit IDs stay");
});

test("a value found once is hidden everywhere, under one label", () => {
  const text = "postgres://u:Hunter2pass@db:5432/x\nDB_PASSWORD=Hunter2pass\nsee Hunter2pass";
  const { items } = findSecrets(text);
  assert.equal(items.length, 1);
  assert.equal(items[0].count, 3);
  assert.equal(mask(text), "postgres://u:[DB_PASSWORD_1]@db:5432/x\nDB_PASSWORD=[DB_PASSWORD_1]\nsee [DB_PASSWORD_1]");
});

const detected = {
  "AWS access key": ["AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE", "AWS_KEY"],
  "AWS secret key": ['"aws_secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"', "AWS_SECRET"],
  "GitHub token": ["token ghp_8fJ2kLmQ0rS7tUvW1xYz3aBcD4eFgH5iJk6L", "GITHUB_TOKEN"],
  "GitHub fine-grained token": ["github_pat_11ABCDEFG0123456789_abcdefghijklmnopqrstuvwxyzABCDEFGHIJ", "GITHUB_TOKEN"],
  "Slack token": ["SLACK=xoxb-1234567890-abcdefghij", "SLACK_TOKEN"],
  // Joined from two halves so GitHub's secret scanner doesn't block pushes of this fake key.
  "Stripe key": ["sk_" + "live_51HxAmPLeK3yN0tR3aL4bCdEf", "STRIPE_KEY"],
  "Anthropic key": ["key: sk-ant-api03-abcDEF123456ghiJKL789mno", "AI_KEY"],
  "Google API key": ["AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY", "GOOGLE_KEY"],
  "JWT": ["eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJkZXBsb3ktYm90In0.c2lnbmF0dXJlLWV4YW1wbGU", "JWT"],
  "private key block": ["-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA\n-----END RSA PRIVATE KEY-----", "PRIVATE_KEY"],
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
    const types = found(text).map(([t]) => t);
    assert.ok(types.includes(type), `expected ${type}, got ${JSON.stringify(found(text))}`);
    assert.ok(!mask(text).includes(findSecrets(text).items.find(i => i.type === type).value));
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
};
for (const [name, text] of Object.entries(ignored)) {
  test(`leaves alone: ${name}`, () => {
    assert.deepEqual(found(text), []);
    assert.equal(mask(text), text);
  });
}

test("unticked values stay visible in the safe text", () => {
  const text = "ip 10.1.2.3 key AKIAIOSFODNN7EXAMPLE";
  assert.equal(mask(text, new Set(["10.1.2.3"])), "ip 10.1.2.3 key [AWS_KEY_1]");
});

test("restore puts real values back, only for known labels", () => {
  const { items } = findSecrets("from 10.20.4.17 with AKIAIOSFODNN7EXAMPLE");
  const answer = "Block [IP_1], rotate [AWS_KEY_1] and [AWS_KEY_1] again. [IP_9] is unknown.";
  const segs = restoreSegments(answer, items);
  assert.equal(segs.map(s => s.text).join(""), "Block 10.20.4.17, rotate AKIAIOSFODNN7EXAMPLE and AKIAIOSFODNN7EXAMPLE again. [IP_9] is unknown.");
  assert.equal(segs.filter(s => s.restored).length, 3);
});

test("restore with nothing hidden returns the answer unchanged", () => {
  assert.equal(restoreSegments("no labels [X_1]", []).map(s => s.text).join(""), "no labels [X_1]");
});

test("entropy separates random tokens from words and hex", () => {
  assert.ok(entropy("Qm9vT2xLp7sW2xZ8nV4bR1tY6uE3iO0a") > 4.2);
  assert.ok(entropy("3f786850e387550fdab836ed7e6dc881de23001b") <= 4);
  assert.ok(entropy("aaaaaaaaaaaaaaaaaaaaaaaa") === 0);
});
