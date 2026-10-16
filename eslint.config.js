import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules/", "playwright-report/", "test-results/", "_site/"] },
  js.configs.recommended,
  {
    files: ["src/**/*.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: globals.browser },
  },
  {
    files: ["sw.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "script", globals: globals.serviceworker },
  },
  {
    files: ["tests/**/*.{js,mjs}", "*.config.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: globals.node },
  },
  {
    // Code passed to page.evaluate() runs in the browser.
    files: ["tests/e2e/**/*.js"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "prefer-const": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-implicit-globals": "error",
      // innerHTML with user text would let pasted content become markup.
      "no-restricted-properties": ["error",
        { property: "innerHTML", message: "Build nodes with h() so user text stays text." },
        { property: "outerHTML", message: "Build nodes with h() so user text stays text." }],
      "no-restricted-syntax": ["error",
        { selector: "CallExpression[callee.property.name='insertAdjacentHTML']", message: "Build nodes with h() so user text stays text." }],
    },
  },
];
