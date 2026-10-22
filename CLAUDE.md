# Paste-Safe

A static site that masks secrets in logs before they are pasted into an AI, and puts
the real values back into the answer. Everything runs in the visitor's tab: no
server code, no build step, no network requests.

## Commands

- `npm start` serves the site at http://localhost:8080.
- `npm run check` runs eslint, tsc (JSDoc types, `jsconfig.json`) and the unit tests.
- `npm run test:e2e` runs Playwright in Chromium, Firefox and WebKit, each at desktop
  and phone sizes (`playwright.config.js`). They serve the site with `tests/serve.mjs`; CI runs
  them in Playwright's own Docker image, whose tag follows the version in `package-lock.json`.
- `node tools/changelog.mjs` rebuilds `changelog.html` after `CHANGELOG.md` changes.
  A unit test fails if they disagree.

## Rules that tests enforce

- Every page has a strict CSP: `connect-src 'none'`, `script-src 'self'`,
  `style-src 'self'`, `font-src 'none'`. That means no inline scripts or `<style>`
  tags, no fetch, and nothing loaded from another site.
- A new shipped file must be added in three places: the `FILES` list in `sw.js`,
  `SHIPPED` in `tests/unit/assets.test.mjs`, and the `cp` line in
  `.github/workflows/pages.yml`.
- The version appears in `src/version.js`, `index.html` and the cache name in `sw.js`.
- Tests that use `watchProblems` fail on any console error or request to another site.

## Design

- White and light grey, in the style of Apple's product pages. Use no red, orange or
  green tints, including warm beiges. Ink is `#1d1d1f`; greys are neutral or slightly cool.
- Every change must work on desktop and phones, with no sideways scrolling.
- Scroll effects run only under `html.has-motion`; reduced motion gets a static page.
- Pages about the site (`privacy`, `terms`, `security`, `changelog`, `source`) share a
  header with "Back to the tool" and the `.nav--doc` tabs.

## Working here

- Before a PR that changes how the site looks, show the owner screenshots or a short
  video first.
- WebKit on GitHub runners is slow at decoding video. The film (`src/ui/film.js`)
  attaches its sources only after it has been on screen for a moment; keep it that way
  or WebKit tests time out.
- Let CI finish on all six browser projects before merging.
- Code comments are plain sentences about what the code does and why. Match the
  surrounding style.
