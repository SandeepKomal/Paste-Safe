# Paste-Safe

[![CI](https://github.com/SandeepKomal/paste-safe/actions/workflows/ci.yml/badge.svg)](https://github.com/SandeepKomal/paste-safe/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Hide passwords, keys, tokens and IPs before you paste logs or config into ChatGPT, Claude or any other AI, then put your real values back into the AI's answer.

**Use it:** https://sandeepkomal.github.io/paste-safe/

![Paste-Safe hiding secrets in a deploy log](docs/screenshot.png)

## How it works

1. **Paste your text:** a log, a config file, a stack trace, some code. Secrets are underlined as you type.
2. **Copy the safe version.** Every secret becomes a label like `[AWS_KEY_1]` or `[IP_2]`. The same value always gets the same label, so the AI can still follow your text.
3. **Paste the AI's answer back.** Labels turn back into your real values, ready to use.

Switch off anything in the findings list that's fine to share. Hover a finding to see everywhere it appears.

## What it hides

| Kind | Examples |
| --- | --- |
| Cloud and service keys | AWS access and secret keys, Azure storage keys, GitHub and GitLab tokens, npm tokens, Slack tokens, Stripe and SendGrid keys, Google API keys, OpenAI and Anthropic API keys |
| Login tokens | JWTs, `Authorization: Bearer …` tokens |
| Private keys | `-----BEGIN … PRIVATE KEY-----` blocks |
| Passwords and secrets | passwords in connection URLs (`postgres://user:password@host`), settings such as `DB_PASSWORD=…`, `client_secret: …`, `api_key=…` |
| Personal and network details | email addresses, IP addresses, internal and cloud hostnames (`.internal`, `.local`, `.corp`, `.amazonaws.com`) |
| Anything else that looks random | long mixed-case strings with high randomness that no rule above named |

Once a value is found anywhere, every other copy of it is hidden too.

Common harmless text is left alone: `localhost`, `0.0.0.0`, commit IDs, UUIDs, file paths, public URLs, and references like `${DB_PASS}`.

**It can miss things.** Detection is pattern-based. Always read the safe text before you share it.

## Privacy

- Everything runs in your browser. There is no server, account, analytics or tracking.
- The page's [Content-Security-Policy](index.html) sets `connect-src 'none'`, so the browser itself stops the page from sending data. Fonts and scripts are served from this repo, never from other sites.
- The header shows a live count of requests to other sites, read from your browser's own network records. It should always say 0.
- Nothing is saved. Close or reload the tab and your text and labels are gone.

## Development

Requires Node 22 and Python 3 (for the local server). There is no build step: the files in this repo are the site.

```bash
npm ci
npm start            # http://localhost:8080
npm run check        # lint, type check and unit tests
npx playwright install chromium
npm run test:e2e     # browser tests, desktop and phone
```

| Path | What it does |
| --- | --- |
| `src/core/rules.js` | One rule per kind of secret |
| `src/core/detect.js` | Finds secrets and assigns labels |
| `src/core/transform.js` | Swaps secrets for labels and back |
| `src/ui/` | Rendering, clipboard, request counter, DOM helpers |
| `src/main.js` | App state and event wiring |
| `tests/unit/` | Tests for every rule, including text that must not be hidden |
| `tests/e2e/` | Browser tests: masking, restoring, copying, highlighting, HTML injection, layout |

Code is plain JavaScript modules, type-checked with TypeScript through JSDoc (`strict` mode), and linted with ESLint. Every push runs all checks in [CI](.github/workflows/ci.yml).

### Hosting your own copy

1. Fork the repo.
2. Turn on **Settings → Pages → Source: GitHub Actions**.
3. Push to `main`. The workflow runs the tests and publishes the site.

If Pages is still off, the workflow passes but skips publishing and shows a warning saying where to turn it on.

## Contributing

New detectors are the most useful contribution. See [CONTRIBUTING.md](CONTRIBUTING.md). To report a missed secret type or a security issue, see [SECURITY.md](SECURITY.md).

## License

Code: [MIT](LICENSE).

Fonts, served from `assets/fonts/` under the [SIL Open Font License 1.1](assets/fonts/):
- Bricolage Grotesque: © 2022 The Bricolage Grotesque Project Authors
- Instrument Sans: © 2022 The Instrument Sans Project Authors
- IBM Plex Mono: © 2017 IBM Corp.

All other design, icons and code are original to this project.
