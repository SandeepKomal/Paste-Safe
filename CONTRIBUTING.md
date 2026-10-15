# Contributing

Thanks for helping. New detectors and fixes for false alarms are the most useful contributions.

## Setup

```bash
npm ci
npm start                      # http://localhost:8080
npm run check                  # lint, type check, unit tests
npx playwright install chromium
npm run test:e2e               # browser tests
```

Opening `index.html` straight from disk won't work, because browsers block JavaScript modules on `file://` pages.

## Adding a detector

1. Add a rule to `RULES` in `src/core/rules.js`:

   ```js
   { type: "NEW_THING", label: "What people call it", category: "credential", re: /pattern/g }
   ```

   - `type` becomes the label, for example `[NEW_THING_1]`. Use capitals and underscores.
   - `category` is one of `credential`, `network`, `personal` or `unknown`.
   - If only part of the match is secret, wrap that part in a group, add the `d` flag and set `group: 1`.
   - Use `skip: value => …` to ignore known-harmless values.
   - Rules run in order and the first one to claim a piece of text wins. Put specific formats (known prefixes such as `AKIA`) before general ones (`password=…`).
2. Add a case to `detected` in `tests/unit/detect.test.mjs`, using a **fake** value.
3. If the pattern could catch harmless text, add those cases to `ignored`.
4. Run `npm run check`.

### Fake values and GitHub push protection

GitHub blocks pushes that contain values shaped like real keys, even fake ones. Join such values from two halves in tests, for example `fake("sk_", "live_…")`, so no file holds a complete key-shaped string.

## Themes

Lens and Sticker share all markup, logic and layout. A theme is a set of design tokens on `:root` (Lens) or `:root[data-skin="sticker"]`, plus a short block of theme-only rules at the end of `css/style.css`. To change how both themes look, change the shared rules. To change one theme, change its tokens or its block. Run the browser tests: every test runs in both themes.

## Code rules

- **Never commit real secrets**, not even expired ones.
- The page must make no network requests. Don't loosen the Content-Security-Policy in `index.html`.
- Ship only original work. Don't add font files, images, icons, scripts or styles made by others, even under open licences. Use system font stacks. `tests/unit/assets.test.mjs` enforces this.
- User text reaches the page only through text nodes, via `h()` in `src/ui/dom.js`. ESLint rejects `innerHTML`.
- Keep `src/core/` free of DOM code so it stays testable in Node.
- Keep rules specific. If the safe text is mostly labels, the AI can't help with it.
- Add or update tests with every change. CI must be green before merging.

## Releases

Record user-facing changes in [CHANGELOG.md](CHANGELOG.md) under "Unreleased".
