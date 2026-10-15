# Changelog

## 1.1.0

- Two themes with a switch in the header: **Lens** (frosted glass, light and dark, the default) and **Sticker** (bold neo-brutalist, light). The choice is remembered, and `#lens` / `#sticker` links open a theme directly.
- Peek: hover a label in the safe text to see the real value behind it. Lens shows it through a magnifying lens, Sticker on a paper note.
- Labels, highlights and chips are coloured by category: credential, network, personal, possible secret.
- Shorter intro, so the tool is visible on the first screen.
- Fonts: Instrument Serif and Archivo added, Bricolage Grotesque removed.
- Browser tests run in both themes, with new tests for theme switching, peeking and dark mode.

## 1.0.0

- New interface: live highlights in the input, animated redaction, findings grouped by category with on/off switches, and hover-linking between the input, safe text, findings and answer.
- New detectors: Azure storage keys, GitLab tokens, npm tokens and SendGrid keys.
- Detection is now linear in the size of the text. A 1 MB log is processed in well under a second; before, large logs could stall the page.
- Output is built from DOM nodes only; pasted text can never be read as HTML.
- Live counter of requests to other sites in the header.
- Fonts are served from the repo, so the page makes no third-party requests.
- Tooling: strict type checking through JSDoc, ESLint, browser tests on desktop and phone, Dependabot.

## 0.1.0

- First release: masking, restoring, findings list.
