# Detection accuracy

How often Paste-Safe hides a secret, and how often it hides something that isn't one.
Measured on 23 October 2026 against `main` at commit `02e1b02` (v2.1.0 plus unreleased
changes).

**Summary:** 584 of 618 secrets hidden (**94.5%**) across 48 kinds of secret.
42 kinds were hidden every time. 2 of 30 harmless lines had something masked by mistake.
People's names and company names are not detected automatically.

## Method

- **Made-up samples.** For each kind of secret, a generator makes 6 random values in the
  provider's published format (for example `AKIA` + 16 characters for AWS key IDs) and
  places each one in 1–6 realistic log lines: environment variables, config files, JSON,
  HTTP headers, connection strings, command lines and log messages. That gives 618 lines.
- **Formats come from the providers, not from Paste-Safe's rules**, so the test can find
  misses. None of the values are real.
- **A secret counts as hidden** if it no longer appears anywhere in the safe text after
  masking, with every finding left switched on (the default).
- **Harmless lines.** 30 lines that look technical but contain nothing secret: commit
  hashes, UUIDs, image digests, checksums, timestamps, versions, stack traces, SQL,
  `localhost`, cron lines and log messages that mention "password" or "token". Any finding
  in them is a false positive.
- Each line is checked on its own, the same way the site checks pasted text.

## Results by kind of secret

| Kind | Hidden |
| --- | --- |
| AWS access key ID, AWS secret key | 36 / 36 |
| GitHub tokens (classic and fine-grained), GitLab tokens | 42 / 42 |
| Slack tokens | 12 / 12 |
| **Slack webhook URLs** | **0 / 12** |
| Stripe, SendGrid, Google API, OpenAI / Anthropic keys | 48 / 48 |
| Hugging Face, npm, PyPI, Vault, DigitalOcean tokens | 60 / 60 |
| Shopify, Twilio, Postman, Grafana, New Relic, Mailgun | 72 / 72 |
| Sentry DSN, SonarQube, Databricks | 36 / 36 |
| JWTs, private key blocks | 30 / 30 |
| Passwords in connection URLs (Postgres, MySQL, MongoDB, Redis, AMQP) | 30 / 30 |
| **Password settings** (`.env`, YAML, JSON, `.properties`, XML, shell) | **30 / 36** |
| **Secrets in command-line flags** | **6 / 18** |
| Basic auth and bearer headers, session cookies, tokens in URLs | 36 / 36 |
| Azure storage and shared access keys, kubeconfig client keys | 18 / 18 |
| **Password hashes** (bcrypt, argon2, SHA-crypt) | **8 / 12** |
| NTLM hashes, AWS account IDs in ARNs | 18 / 18 |
| Email addresses, phone numbers, payment card numbers | 42 / 42 |
| IPv4, IPv6 and MAC addresses, internal hostnames | 48 / 48 |
| Usernames in file paths | 12 / 12 |
| **Total** | **584 / 618 (94.5%)** |

## What it missed

| Missed | Example (made up) | Why |
| --- | --- | --- |
| Slack webhook URLs | `https://hooks.slack.com/services/T…/B…/…` | No rule for webhook URLs yet; the secret is the URL's last part. |
| Passwords in XML | `<password>…</password>` | The password-setting rule reads `name = value` and `name: value`, not XML tags. |
| Short or custom flags | `docker login -p …`, `--api-token …` | The flag rule knows long names like `--password` and `--token`, not `-p` or custom names. |
| SHA-crypt hashes with a rounds setting | `$6$rounds=5000$salt$…` | The hash rule expects the salt right after `$6$`. |

## What it masked by mistake

| Line | Masked | Why |
| --- | --- | --- |
| `Access denied for user 'app'@'%' (using password: YES)` | `YES)` | MySQL's standard error reads like a `password: value` setting. |
| `public key fingerprint SHA256:47DEQ…` | the fingerprint | It looks random, so the catch-all for random strings hides it. A fingerprint is public, so this is harmless but noisy. |

The other 28 harmless lines were left untouched, including commit hashes, UUIDs, image
digests, MD5 checksums, versions, timestamps and log lines that only mention the words
"password" or "token".

## What it doesn't try to detect

These are known limits, also listed on the site under "What this copy catches":

- **People's names and company names.** Add them under Findings → Words; they are then
  hidden every time.
- **Secrets written in plain prose**, for example "the password is hunter2".
- **Formats it has no rule for**, unless they look random enough for the catch-all.

## Recommended fixes

Each is a small rule change with its own test cases:

1. Add a rule for Slack (and similar) webhook URLs.
2. Read `<password>`, `<secret>` and similar XML elements as settings.
3. Treat `-p` after `login` / `mysql` / `psql`, and any `--…-token` / `--…-key` flag, as a secret flag.
4. Allow an optional `rounds=N$` in SHA-crypt hashes.
5. Ignore MySQL's `(using password: YES/NO)` and `SHA256:` key fingerprints.

## Limits of this report

- The samples are made up by the maintainers, so they reflect formats we know about.
  Real logs contain formats nobody thought of; the real-world rate may be lower.
- The test checks whether a secret disappears, not whether it gets the most specific
  label (for example `[SECRET_1]` instead of `[AWS_KEY_1]`).
- It doesn't measure speed; the unit tests cover that separately (a guard fails if any rule
  takes more than 150 ms on hostile input).

Always read the safe text before you share it.
