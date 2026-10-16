# Paste-Safe

[![CI](https://github.com/SandeepKomal/paste-safe/actions/workflows/ci.yml/badge.svg)](https://github.com/SandeepKomal/paste-safe/actions/workflows/ci.yml)

Strip secrets out of logs and configs before pasting them into ChatGPT, Claude or whatever AI you use, then put the real values back into its answer.

https://sandeepkomal.github.io/paste-safe/

| Board | Lens | Sticker |
| --- | --- | --- |
| ![Board theme](docs/screenshot-board.png) | ![Lens theme](docs/screenshot-lens.png) | ![Sticker theme](docs/screenshot-sticker.png) |

## Usage

1. Paste a log, config or stack trace. Anything that looks secret gets underlined.
2. Copy the safe version. Secrets become labels like `[AWS_KEY_1]`; the same value always gets the same label.
3. Paste the AI's reply into the bottom box and the labels turn back into your values.

You can switch individual findings off if they're fine to share. Hovering a label shows the value behind it.

You can also open or drop a file (`.log`, `.env`, `.yaml`, `.json` and other text files up to 50 MB). Large files are checked in a background worker so the page doesn't freeze.

By default, copying adds one line on top asking the AI to keep labels like `[IP_1]` as they are. If the AI still changes them a little (`IP_1`, `[ip-1]`), they're put back anyway.

There are three themes (switch in the header, or open `#board`, `#lens` or `#sticker`). Board is the default: labels are drawn as split-flap tiles and the workbench turns over, with your text on the front and the safe text on the back.

## What gets hidden

- Keys and tokens: AWS, Azure, Google Cloud, GitHub, GitLab, npm, Slack, Stripe, SendGrid, Twilio, Shopify, Hugging Face, Discord, Google, OpenAI/Anthropic, JWTs, private key blocks
- Auth headers and logins: bearer tokens, `Authorization: Basic`, Docker registry logins, session cookies, tokens in URLs (`?access_token=`, signed S3/GCS links)
- Passwords in connection URLs and in settings like `DB_PASSWORD=`, `client_secret:`, `api_key=`
- Personal details: emails, phone numbers, payment card numbers (Luhn-checked), usernames in paths like `/home/jane` or `C:\Users\jane`
- Network details: IPv4 and IPv6 addresses, MAC addresses, internal/cloud hostnames
- Your own words, such as a company or server name (set under Findings, saved in your browser only)
- Long random-looking strings that none of the above matched

Things like `localhost`, commit hashes, UUIDs, file paths and `${VAR}` references are left alone.

Detection is pattern-based, so it can miss things. Check the output before you paste it anywhere.

## Privacy

Everything runs in the browser. There's no backend and nothing is stored. The page's CSP has `connect-src 'none'`, and the header shows a live count of requests to other sites (it should stay at 0).

## Development

Node 22 and Python 3. No build step.

```bash
npm ci
npm start              # localhost:8080
npm run check          # eslint + tsc + unit tests
npx playwright install chromium
npm run test:e2e
```

Detection lives in `src/core/` (no DOM, tested in Node). UI code is in `src/ui/`, wired together in `src/main.js`. Types are in `types/index.d.ts`.

To host a fork, enable **Settings → Pages → Source: GitHub Actions** and push to `main`.

## License

MIT. No third-party code, fonts or images are shipped; the site uses system fonts.
