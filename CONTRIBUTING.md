# Contributing

## Run it locally

```bash
npm start     # http://localhost:8080
npm test      # Node 20+
```

## Project layout

| Path | What it does |
| --- | --- |
| `src/detect.js` | Finds secrets, swaps them for labels, and swaps labels back. No DOM, so it runs in tests. |
| `src/app.js` | The page: rendering, the hidden-values list, copy buttons. |
| `src/example.js` | The made-up log shown on first load. |
| `test/detect.test.mjs` | Tests for every detector, and for things that must **not** be hidden. |

## Adding a detector

1. Add a rule to `RULES` in `src/detect.js`:

   ```js
   { type: "NEW_THING", label: "What people call it", re: /pattern/g }
   ```

   - `type` becomes the label, for example `[NEW_THING_1]`. Use capitals and underscores.
   - If only part of the match is secret, wrap that part in a group, add the `d` flag to the regex and set `group: 1`.
   - Use `skip: value => …` to ignore known harmless values.
   - Rules run in order, and the first rule to claim a piece of text wins. Put specific formats (known prefixes such as `AKIA`) before general ones (`password=…`).
2. Add a test to `detected` in `test/detect.test.mjs` with a **fake** example.
3. If the pattern could catch harmless text, add those cases to `ignored`.
4. Run `npm test`.

## Ground rules

- **Never commit real secrets**, not even expired ones. Use fake values, or the documented examples from the provider (such as AWS's `AKIAIOSFODNN7EXAMPLE`).
- The page must not make network requests. Don't loosen the Content-Security-Policy in `index.html`.
- Show user text only through `esc()` in `src/app.js`, never as raw HTML.
- Keep rules specific. If the safe text is mostly labels, the AI can't help with it.
