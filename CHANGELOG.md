# Changelog

## Unreleased
- Scroll effects in the style of product pages, also on phones: sections fade up, the hero recedes, the product window tilts into place, three headlines light up word by word, and the detector count counts up. All of it is off for reduced motion
- The reel no longer clips its front card, and the grey shadow under it is gone
- "Why not just paste it?" uses a light grey card instead of black
- Copyright line in every footer
- 20 more detectors for IT teams: HashiCorp Vault, DigitalOcean, Doppler, PyPI, Postman, Grafana, New Relic, Sentry DSNs, Atlassian, Linear, Supabase, Mailgun, SonarQube, Databricks, kubeconfig client keys, Azure shared access keys, AWS account IDs in ARNs, `--password`/`--token` flags, password hashes (bcrypt, argon2, SHA-crypt) and NTLM hashes; PGP private key blocks
- The hero reel is back above the product window, with a card for each kind of IT work showing a value and the label it becomes
- One monochrome palette: raw values and alerts use a dashed outline instead of orange, restored values and status marks are grey and ink instead of green, links are ink
- Hero shows a made-up log next to what the AI sees, masked by the real detector, instead of the turning ring of cards
- Hero figures explain themselves: the live request count, how many secret formats are detected, no accounts or trackers, MIT
- "Why not just paste it?" compares pasting a raw log with pasting through Paste-Safe
- On phones, a bar with the hidden count and Copy appears while the tool is on screen and its own Copy button is not
- On phones and tablets, the "How it works" picture stays pinned under the header and changes with the step being read

## 2.1.0
- New white and grey design: one theme, system fonts, a centred hero and a cleaner workbench on desktop and phones
- The header shows the version (and, on the live site, the commit) next to the request counter
- "What this copy catches": the page runs the detector on fake samples and lists what it misses, such as people's names
- Restoring now reports labels the AI changed beyond recognition: "5 labels put back. 1 still looks like a label." Those stay highlighted
- Plain mode hides real values on the page for a shared screen; copying the restored answer asks first while it is on
- Copy safe text says what was copied: "11 secrets replaced, raw text not copied."
- Word lists: import and export as a file, start from a sample list, and add notes with `#`
- Links to open an empty ChatGPT, Claude or Gemini chat (your text is not sent with them)
- Removed the Board, Lens and Sticker themes and their code
- Privacy notice and terms of use, written for India's DPDP Act, 2023 and DPDP Rules, 2025, with a button that erases everything the site saved; compliance checklist in `docs/DPDP-COMPLIANCE.md`
- Simpler scroll story and reel code; settings storage in one module

## 2.0.0
- Installable as an app and works offline (service worker caches only this site's files)
- Share image, app icons, issue and PR templates, code of conduct
- Copy adds a note asking the AI to keep labels as they are; restore also accepts labels the AI changed slightly (`IP_1`, `[ip-1]`)
- New detectors: Google Cloud key IDs, Hugging Face, Shopify, Twilio and Discord tokens, Basic auth, Docker logins, session cookies, tokens in URLs, card numbers, phone numbers, usernames in paths, IPv6 and MAC addresses
- Your own words to always hide, saved in the browser
- Open or drop a text file; large inputs are checked in a worker
- Fix: very large logs no longer freeze the page (highlights switch off above 2,000 labels)
- Warn before closing the tab while labels are in use
- Board theme, now the default: split-flap labels and a departure board in the intro; the workbench turns over between your text and the safe text
- Fix slow matching on crafted input in the SECRET, HOST, EMAIL and DB_PASSWORD rules
- Move JSDoc types into `types/index.d.ts`; trim comments

## 1.2.0
- Use system fonts; no third-party assets shipped (`font-src 'none'`)
- Test that blocks font files, external URLs and key-shaped strings

## 1.1.0
- Lens and Sticker themes with a switcher
- Hover a label to peek at its value
- Category colours for labels and findings

## 1.0.0
- New UI with live highlighting and a findings table
- Azure, GitLab, npm and SendGrid detectors
- Linear-time detection (1 MB in well under a second)
- Request counter in the header

## 0.1.0
- First release
