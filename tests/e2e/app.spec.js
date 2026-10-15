import { test, expect } from "@playwright/test";

/** Fails the test on any console error, uncaught exception or request to another site. */
test.beforeEach(async ({ page }) => {
  const problems = [];
  page.on("console", m => { if (m.type() === "error") problems.push(`console: ${m.text()}`); });
  page.on("pageerror", e => problems.push(`exception: ${e.message}`));
  page.on("request", r => {
    const url = new URL(r.url());
    if (url.protocol !== "data:" && url.host !== "127.0.0.1:4173") problems.push(`external request: ${r.url()}`);
  });
  page.problems = problems;
  await page.goto("/");
  await expect(page.locator("#safe .redact").first()).toBeVisible();
});

test.afterEach(async ({ page }) => {
  expect(page.problems).toEqual([]);
});

test("the example is masked with no secret left in the safe text", async ({ page }) => {
  await expect(page.locator("#statHidden")).toHaveText("11");
  const safe = await page.locator("#safe").textContent();
  for (const secret of ["AKIAIOSFODNN7EXAMPLE", "Tr0ub4dor&3xyz", "10.20.4.17", "ops-alerts@acme-payments.io"]) {
    expect(safe).not.toContain(secret);
  }
  expect(safe).toContain("[AWS_KEY_1]");
  expect(safe).toContain("LOG_LEVEL=debug");
  await expect(page.locator("#ledger tbody tr")).toHaveCount(11);
});

test("highlights in the input line up with the text", async ({ page }) => {
  // The mirror must hold exactly the same characters as the textarea, or highlights drift.
  const [input, mirror] = await page.evaluate(() => [
    /** @type {HTMLTextAreaElement} */ (document.querySelector("#input")).value,
    document.querySelector("#mirror")?.textContent ?? "",
  ]);
  expect(mirror).toBe(input + "​");
  const box = await page.locator("#input").boundingBox();
  const back = await page.locator("#backdrop").boundingBox();
  expect(back).toEqual(box);
});

test("typing updates the safe text immediately", async ({ page }) => {
  await page.locator("#clear").click();
  await page.locator("#input").fill("db at 10.1.2.3 with key AKIAIOSFODNN7EXAMPLE");
  await expect(page.locator("#safe")).toHaveText("db at [IP_1] with key [AWS_KEY_1]");
  await expect(page.locator("#statHidden")).toHaveText("2");
});

test("switching a finding off shows it in the safe text", async ({ page }) => {
  const row = page.locator("#ledger tbody tr", { hasText: "[IP_1]" });
  await row.locator(".switch").click();
  await expect(page.locator("#safe")).toContainText("10.20.4.17");
  await expect(page.locator("#statHidden")).toHaveText("10");
  await row.locator(".switch").click();
  await expect(page.locator("#safe")).not.toContainText("10.20.4.17");
});

test("copy puts the safe text on the clipboard", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "clipboard permissions are Chromium-only in Playwright");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.locator("#copySafe").click();
  await expect(page.locator("#copySafe")).toHaveAttribute("data-state", "done");
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toContain("[GITHUB_TOKEN_1]");
  expect(clip).not.toContain("ghp_");
});

test("the AI's answer gets the real values back", async ({ page }) => {
  await page.locator("#answer").fill("Rotate [AWS_KEY_1] and block [IP_2]. [IP_99] is unknown.");
  await expect(page.locator("#restored")).toHaveText("Rotate AKIAIOSFODNN7EXAMPLE and block 10.20.9.250. [IP_99] is unknown.");
  await expect(page.locator("#restoreNote")).toHaveText("2 labels turned back into your real values.");
});

test("hovering a finding highlights it everywhere", async ({ page }) => {
  await page.locator("#ledger tbody tr", { hasText: "[HOST_1]" }).hover();
  await expect(page.locator('#safe .redact[data-ph="[HOST_1]"].is-linked')).toHaveCount(1);
  await expect(page.locator('#mirror .hit[data-ph="[HOST_1]"].is-linked')).toHaveCount(1);
});

test("pasted HTML is shown as text and never runs", async ({ page }) => {
  await page.locator("#input").fill('<img src=x onerror="window.__xss=1"> password=<script>window.__xss=2</script>');
  await page.locator("#answer").fill("<b>[SECRET_1]</b><img src=y onerror=window.__xss=3>");
  await expect(page.locator("#safe img, #safe script, #restored img, #restored b, #mirror img")).toHaveCount(0);
  expect(await page.evaluate(() => /** @type {any} */ (window).__xss)).toBeUndefined();
});

test("clear empties every pane", async ({ page }) => {
  await page.locator("#clear").click();
  await expect(page.locator("#safe")).toBeEmpty();
  await expect(page.locator("#restored")).toBeEmpty();
  await expect(page.locator("#ledgerEmpty")).toBeVisible();
  await expect(page.locator("#input")).toBeFocused();
});

test("the page never scrolls sideways", async ({ page }) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("the request counter shows zero", async ({ page }) => {
  await expect(page.locator("#netcount")).toHaveText("0");
});
