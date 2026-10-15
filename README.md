# Paste-Safe

Hide passwords, keys, tokens and IPs before you paste logs or config into ChatGPT, Claude or any other AI, then put your real values back into the AI's answer.

**Try it:** https://sandeepkomal.github.io/paste-safe/

![Paste-Safe hiding secrets in a deploy log and restoring them in the AI's answer](docs/screenshot.png)

## How it works

1. **Paste your text:** a log, a config file, an error, some code.
2. **Copy the safe version.** Every secret is swapped for a label like `[AWS_KEY_1]` or `[IP_2]`. The same value always gets the same label, so the AI can still follow your text. Paste this into any AI.
3. **Paste the AI's answer back.** The labels are turned back into your real values, so you can use the answer straight away.

Untick anything in the "What was hidden" list that's fine to share.

## What it hides

| Kind | Examples |
| --- | --- |
| Cloud and service keys | AWS access keys and secret keys, GitHub tokens, Slack tokens, Stripe keys, Google API keys, OpenAI and Anthropic API keys |
| Login tokens | JWTs, `Authorization: Bearer …` tokens |
| Private keys | `-----BEGIN … PRIVATE KEY-----` blocks |
| Passwords and secrets | passwords inside connection URLs (`postgres://user:password@host`), settings such as `DB_PASSWORD=…`, `client_secret: …`, `api_key=…` |
| Personal and network details | email addresses, IP addresses, internal and cloud hostnames (`.internal`, `.local`, `.corp`, `.amazonaws.com`) |
| Anything else that looks random | long mixed-case strings with high randomness that no rule above named |

Once a value is found anywhere, every other copy of it is hidden too, even where no rule would have caught it.

It leaves common harmless things alone: `localhost`, `0.0.0.0`, commit IDs, UUIDs, file paths, public URLs, and references like `${DB_PASS}`.

**It can miss things.** Detection is pattern-based. Always glance at the safe text before you paste it.

## Privacy

- Everything runs in your browser. There is no server, account or tracking.
- The page's [Content-Security-Policy](index.html) sets `connect-src 'none'`, so the browser itself blocks the page from sending data anywhere. You can check this in your browser's developer tools (Network tab).
- Nothing is saved. Close the tab and it's gone.

## Run it yourself

No build step and no dependencies.

```bash
git clone https://github.com/SandeepKomal/paste-safe
cd paste-safe
npm start     # http://localhost:8080  (or: python3 -m http.server)
npm test      # detection tests, Node 20+
```

Opening `index.html` straight from disk won't work, because browsers block JavaScript modules on `file://` pages.

### Hosting your own copy

1. Fork the repo.
2. Turn on **Settings → Pages → Source: GitHub Actions**.
3. Push to `main`. The workflow runs the tests and publishes the site.

If Pages is still off, the workflow passes but skips publishing and shows a warning saying where to turn it on.

## Contributing

New detectors are the most useful contribution. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
