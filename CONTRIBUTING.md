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

Themes are CSS tokens: Lens on `:root`, Sticker on `:root[data-skin="sticker"]`, plus a short block of theme-only rules at the end of `css/style.css`. Browser tests run in both.
