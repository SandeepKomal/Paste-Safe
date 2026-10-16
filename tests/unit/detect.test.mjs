import { test } from "node:test";
import assert from "node:assert/strict";
import { detect } from "../../src/core/detect.js";
import { AI_NOTE, mask, restore, toText, withNote } from "../../src/core/transform.js";
import { entropy, isIPv6, luhn, RULES, RANDOM_RULE, wordRules } from "../../src/core/rules.js";
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
    assert.match(r.type, /^[A-Z][A-Z0-9_]*$/, r.type);
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
  "Hugging Face token": [fake("HF=hf", "_AbCdEfGhIjKlMnOpQrStUvWxYz012345"), "HF_TOKEN"],
  "Shopify token": [fake("shp", "at_0123456789abcdef0123456789abcdef"), "SHOPIFY_TOKEN"],
  "Twilio API key": [fake("SK", "0123456789abcdef0123456789abcdef"), "TWILIO_KEY"],
  "Discord webhook": [fake("https://discord.com/api/webhooks/123456789012345678/", "abcDEF_ghiJKL-mnoPQR_stuVWX-yzabcDEF_ghiJKL-mnoPQR_stuVWXyzab"), "DISCORD_TOKEN"],
  "Google Cloud key ID": ['"private_key_id": "0123456789abcdef0123456789abcdef01234567",', "GCP_KEY"],
  "basic auth header": ["Authorization: Basic YWRtaW46c3VwZXJzZWNyZXQ=", "BASIC_AUTH"],
  "Docker registry login": ['{"auths":{"ghcr.io":{"auth":"dXNlcjpwYXNzd29yZDEyMw=="}}}', "DOCKER_AUTH"],
  "token in a URL": ["GET https://example.com/cb?state=ok&access_token=ya29.a0AfH6SMBx&x=1", "URL_TOKEN"],
  "signed URL": ["https://bucket.s3.amazonaws.com/f.zip?X-Amz-Signature=4f1c9e0d2b7a", "URL_TOKEN"],
  "session cookie": ["Cookie: theme=dark; sessionid=8f14e45fceea167a5a36dedd4bea2543", "SESSION"],
  "card number": ["card 4111 1111 1111 1111 exp 12/29", "CARD"],
  "phone number": ["call +44 20 7946 0958 or", "PHONE"],
  "US phone number": ["support (415) 555-0132 today", "PHONE"],
  "username in a path": ["at /home/sandeep/projects/api/main.py:12", "USERNAME"],
  "Windows username": ["C:\\Users\\jdoe\\AppData\\Local\\app.log", "USERNAME"],
  "IPv6 address": ["peer 2001:db8:85a3::8a2e:370:7334 refused", "IPV6"],
  "MAC address": ["eth0 link 3c:22:fb:7a:10:9e up", "MAC"],
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
  "time of day": "started 12:30:45, done 13:02:11",
  "IPv6 loopback": "listening on [::1]:8080",
  "C++ scope": "std::vector<int> and Foo::bar()",
  "13-digit epoch milliseconds": "ts=1729000000000 took 1234567890123",
  "number that fails the card check": "order 4111 1111 1111 1112",
  "Docker image digest": "image@sha256:4f1c9e0d2b7a6e5f3c8d9a0b1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f",
  "semantic version": "upgraded from 1.24.3 to 1.25.0",
  "Kubernetes pod name": "pod api-7d9f8b6c5-x2x9z restarted",
  "CI runner path": "/home/runner/work/app/app/src/index.ts",
  "short port list": "ports 8080-8090, 9000",
  "URL with a harmless query": "https://example.com/search?q=timeout&page=2",
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

test("restore accepts labels the AI changed slightly", () => {
  const { findings } = detect("from 10.20.4.17 and 10.2.2.2 key AKIAIOSFODNN7EXAMPLE");
  const out = toText(restore("Block IP_1, [ip-2] and [aws_key_1]. Not IP_10, MYIP_1 or [IP_9].", findings));
  assert.equal(out, "Block 10.20.4.17, 10.2.2.2 and AKIAIOSFODNN7EXAMPLE. Not IP_10, MYIP_1 or [IP_9].");
});

test("the AI note goes on top, and only when there is text", () => {
  assert.equal(withNote("x [IP_1]"), `${AI_NOTE}\n\nx [IP_1]`);
  assert.equal(withNote(""), "");
});

test("your own words are hidden, whole words only, in any case", () => {
  const rules = [...wordRules(["Acme Payments", "orion", " ", "x"]), ...RULES];
  const text = "ACME PAYMENTS runs orion";
  assert.equal(toText(mask(text, detect(text, rules).spans)), "[PRIVATE_1] runs [PRIVATE_2]");
  assert.deepEqual(detect("orionx", rules).findings, []);
  assert.deepEqual(wordRules(["", " "]), []);
});

test("card and IPv6 checks", () => {
  assert.ok(luhn("4111111111111111"));
  assert.ok(!luhn("4111111111111112"));
  assert.ok(isIPv6("fe80::1"));
  assert.ok(isIPv6("2001:0db8:0000:0000:0000:ff00:0042:8329"));
  assert.ok(!isIPv6("12:30:45"));
  assert.ok(!isIPv6("1::2::3"));
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

test("no rule slows down on hostile input (ReDoS guard)", () => {
  // Inputs shaped to make backtracking regexes do quadratic work. Each used to
  // take seconds on one rule or another; every rule must now stay fast.
  const N = 50_000;
  const hostile = [
    "a".repeat(N), "a.".repeat(N / 2), "a@" + "a.".repeat(N / 2) + "-", "password_".repeat(N / 9),
    ("x".repeat(30) + ".").repeat(N / 31), "https://" + "u:".repeat(N / 2), "Bearer " + " ".repeat(N),
    "1.".repeat(N / 2), "key=".repeat(N / 4), "1 ".repeat(N / 2), "+1 ".repeat(N / 3), "a:".repeat(N / 2),
    ":".repeat(N), "?key=".repeat(N / 5), "/home/".repeat(N / 6), "0".repeat(N),
  ];
  for (const rule of [...wordRules(["a", "aa", "password"]), ...RULES, RANDOM_RULE]) {
    for (const text of hostile) {
      const t = performance.now();
      void [...text.matchAll(rule.re)].length;
      const ms = performance.now() - t;
      assert.ok(ms < 150, `${rule.type} took ${Math.round(ms)} ms on a hostile input`);
    }
  }
});
