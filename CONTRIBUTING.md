# Contributing

Most useful: new detectors, and fixes for things that get hidden when they shouldn't.

Run `npm run check` and `npm run test:e2e` before opening a PR. Serve the folder (`npm start`); opening `index.html` from disk won't load the modules.

## Adding a detector

Add a rule to `RULES` in `src/core/rules.js`:

```js
{ type: "NEW_THING", label: "New thing", category: "credential", re: /pattern/g }
```

- If only part of the match is the secret, capture it, add the `d` flag and set `group`.
- `skip(value, match)` returning true ignores a match.
- The first rule to claim some text wins, so put specific formats before generic ones.
- Don't start a pattern with an unbounded prefix after `\b`; use a lookbehind instead. The ReDoS test in `tests/unit/detect.test.mjs` will catch slow patterns.

Then add a case to `detected` in the same test file, plus any false positives to `ignored`.

Use fake values in tests. GitHub flags key-shaped strings even when they're fake, so build them from two halves (`fake("sk_", "live_…")`). `tests/unit/assets.test.mjs` fails if a complete one slips in.

## Rules of the road

- No network requests from the page; don't loosen the CSP.
- No third-party assets (fonts, images, scripts). The assets test enforces this.
- User text goes into the DOM as text only (`h()` in `src/ui/dom.js`). ESLint blocks `innerHTML`.
- Keep `src/core/` free of DOM code.

Colours, fonts and radii are tokens on `:root` at the top of `css/style.css`. There is one light theme; keep to the white and grey palette.

When a detector change catches or misses one of the fake samples in `src/coverage.js`, update that sample's `gap` flag. A unit test checks the card matches the detector.

If you add a file the site needs, add it to `FILES` in `sw.js` too, so it works offline. A unit test checks this. When you release, bump the version in `package.json`, `src/version.js`, `index.html`, `sw.js` (`CACHE`) and `CHANGELOG.md`; a unit test checks they agree.
