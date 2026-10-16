# Changelog

## Unreleased
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
