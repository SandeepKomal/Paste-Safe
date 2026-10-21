import { test, expect } from "@playwright/test";

const SKINS = ["board", "lens", "sticker"];

/** Fails the test on any console error, uncaught exception or request to another site. */
function watchProblems(page) {
  const problems = [];
  page.on("console", m => { if (m.type() === "error") problems.push(`console: ${m.text()}`); });
  page.on("pageerror", e => problems.push(`exception: ${e.message}`));
  page.on("request", r => {
    const url = new URL(r.url());
    if (url.protocol !== "data:" && url.host !== "127.0.0.1:4173") problems.push(`external request: ${r.url()}`);
  });
  return problems;
}

/** In the Board theme only one side of the workbench is usable at a time. */
async function showSide(page, side) {
  if (!(await page.locator("#flip").isVisible())) return;
  const card = page.locator("#workbench");
  if ((await card.getAttribute("data-side")) !== side) await page.locator("#flip").click();
  await expect(card).toHaveAttribute("data-side", side);
  // Wait for the turn to finish so elements are where they will stay.
  await page.waitForFunction(() => !document.getAnimations().some(a => a instanceof CSSTransition));
}

for (const skin of SKINS) {
test.describe(`${skin} theme`, () => {
test.beforeEach(async ({ page }) => {
  page.problems = watchProblems(page);
  await page.goto(`/#${skin}`);
  await expect(page.locator("html")).toHaveAttribute("data-skin", skin);
  await expect(page.locator("#safe .redact").first()).toBeAttached();
  // Board turns the card to the safe side by itself after the example loads.
  if (skin === "board") await expect(page.locator("#workbench")).toHaveAttribute("data-side", "safe");
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
  await showSide(page, "text");
  const box = await page.locator("#input").boundingBox();
  const back = await page.locator("#backdrop").boundingBox();
  expect(back).toEqual(box);
});

test("typing updates the safe text immediately", async ({ page }) => {
  await page.locator("#clear").click();
  await showSide(page, "text");
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
  await showSide(page, "safe");
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
  await showSide(page, "text");
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

test("capture Board screenshots for the visual audit", async ({ page, browserName, viewport }, testInfo) => {
  test.skip(skin !== "board" || browserName !== "chromium", "Capture Board screenshots once using Chromium.");
  const mobile = (viewport?.width ?? 1280) <= 960;
  await page.goto("/#board");
  await expect(page.locator("#statHidden")).toHaveText("11");
  await expect(page.locator("#workbench")).toHaveAttribute("data-side", "safe");
  await page.screenshot({
    path: testInfo.outputPath(mobile ? "board-mobile.png" : "board-desktop.png"),
    fullPage: true,
    animations: "disabled",
  });
});

test("Board styling stays monochrome and responsive", async ({ page, viewport }) => {
  await page.goto("/#board");
  const metrics = await page.evaluate(() => {
    const main = document.querySelector("main");
    const intro = document.querySelector(".intro");
    const workspace = document.querySelector(".bench--main");
    const gate = document.querySelector(".gate");
    if (!main || !intro || !workspace || !gate) throw new Error("Expected layout elements are missing");
    return {
      background: getComputedStyle(document.documentElement).backgroundColor,
      colorScheme: getComputedStyle(document.documentElement).colorScheme,
      gateDisplay: getComputedStyle(gate).display,
      gridTracks: getComputedStyle(main).gridTemplateColumns.split(" ").length,
      introWidth: intro.getBoundingClientRect().width,
      workspaceWidth: workspace.getBoundingClientRect().width,
      viewportWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(metrics.background).toBe("rgb(255, 255, 255)");
  expect(metrics.colorScheme).toBe("light");
  expect(metrics.gateDisplay).toBe("none");
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
  if ((viewport?.width ?? 1280) > 960) {
    expect(metrics.gridTracks).toBe(12);
    expect(metrics.introWidth).toBeGreaterThan(0);
    expect(metrics.workspaceWidth).toBeGreaterThan(metrics.viewportWidth * 0.8);
  } else {
    expect(metrics.gridTracks).toBe(1);
  }
});

test("Board intro pairs the copy with the local privacy ring", async ({ page }) => {
  await page.goto("/#board");
  await expect(page.locator(".privacy-visual")).toHaveCount(1);
  await expect(page.locator(".intro__head h1")).toBeVisible();
  await expect(page.locator(".intro .lede")).toBeVisible();
  await expect(page.locator(".intro .badges")).toBeVisible();

  const animation = page.locator(".privacy-visual");
  await expect(animation).toBeVisible();
  await expect(animation.locator(".privacy-visual__card")).toHaveCount(10);
  await expect(animation).toContainText("[SECRET_1]");
  await expect(animation).toContainText("[IP_1]");
  await expect(animation).toContainText("[EMAIL_1]");
  await expect(animation.locator(".privacy-visual__core")).toContainText("LOCAL ONLY");
  await expect(animation.locator(".privacy-visual__core")).toContainText("NOTHING LEAVES THIS TAB");

  const dimensions = await animation.boundingBox();
  if (!dimensions) throw new Error("Privacy ring has no layout box");
  expect(dimensions.width).toBeGreaterThan(260);
  expect(dimensions.height).toBeGreaterThan(160);

  const heroLayout = await page.locator("main > .intro").evaluate(element => ({
    columns: getComputedStyle(element).gridTemplateColumns.split(" ").length,
    viewportWidth: window.innerWidth,
  }));
  expect(heroLayout.columns).toBe(heroLayout.viewportWidth > 960 ? 2 : 1);
});

test("privacy ring animation respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#board");
  const art = page.locator(".privacy-visual");
  await expect(art).toBeVisible();
  await expect(art.locator(".privacy-visual__card")).toHaveCount(10);
  await expect(art.locator(".privacy-visual__core")).toContainText("LOCAL ONLY");
  await expect.poll(async () => art.locator(".privacy-visual__track").evaluate(element => getComputedStyle(element).animationName)).toBe("none");
  await expect.poll(async () => art.locator(".privacy-visual__orbit").first().evaluate(element => getComputedStyle(element).animationName)).toBe("none");
});

test("scrollytelling stage follows the Find, Mask and Restore chapters", async ({ page }) => {
  await page.goto("/#how");
  const stage = page.locator("[data-story-stage]");
  await expect(page.locator('[data-story-step="detect"]')).toBeAttached();
  await expect(page.locator('[data-story-scene="detect"]')).toBeAttached();
  for (const step of ["detect", "mask", "restore"]) {
    const chapter = page.locator(`[data-story-step="${step}"]`);
    await chapter.evaluate(element => element.scrollIntoView({ block: "center", behavior: "instant" }));
    await expect(stage).toHaveAttribute("data-active-step", step, { timeout: 4000 });
    await expect(chapter).toHaveAttribute("aria-current", "step");
    await expect(page.locator(`[data-story-scene="${step}"]`)).toHaveCSS("visibility", "visible");
    await expect(stage.locator("[data-story-scene]:visible")).toHaveCount(1);
  }
});

test("scroll story scenes fit their stage without colliding with its footer", async ({ page }) => {
  for (const viewport of [{ width: 767, height: 290 }, { width: 390, height: 844 }, { width: 820, height: 727 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/#how");
    const stage = page.locator("[data-story-stage]");
    for (const step of ["detect", "mask", "restore"]) {
      await page.locator(`[data-story-step="${step}"]`).scrollIntoViewIfNeeded();
      await expect(stage).toHaveAttribute("data-active-step", step, { timeout: 5000 });
      const layout = await stage.evaluate(element => {
        const step = element.getAttribute("data-active-step") ?? "detect";
        const active = element.querySelector(`[data-story-scene="${step}"]`);
        const footer = element.querySelector(".scroll-story__stage-foot");
        if (!(active instanceof HTMLElement) || !(footer instanceof HTMLElement)) {
          throw new Error("Active scene or stage footer is missing");
        }
        const sceneRect = active.getBoundingClientRect();
        const footerRect = footer.getBoundingClientRect();
        return {
          activeCount: Array.from(element.querySelectorAll("[data-story-scene]"))
            .filter(scene => getComputedStyle(scene).visibility === "visible").length,
          sceneClientHeight: active.clientHeight,
          sceneScrollHeight: active.scrollHeight,
          sceneBottom: sceneRect.bottom,
          footerTop: footerRect.top,
        };
      });
      expect(layout.activeCount).toBe(1);
      expect(layout.sceneScrollHeight).toBeLessThanOrEqual(layout.sceneClientHeight + 2);
      expect(layout.sceneBottom).toBeLessThanOrEqual(layout.footerTop + 1);
    }
  }
});

test("scroll position continuously moves the privacy aurora", async ({ page }) => {
  await page.goto("/#how");
  const stage = page.locator("[data-story-stage]");
  const initial = Number(await stage.evaluate(element => getComputedStyle(element).getPropertyValue("--story-progress")));
  await page.locator('[data-story-step="restore"]').scrollIntoViewIfNeeded();
  await expect.poll(async () => Number(await stage.evaluate(element => getComputedStyle(element).getPropertyValue("--story-progress")))).toBeGreaterThan(initial + 0.01);
  const drift = await stage.evaluate(element => getComputedStyle(element).getPropertyValue("--story-aurora-x"));
  expect(drift.endsWith("px")).toBe(true);
});

test("scrollytelling motion respects reduced-motion preferences", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#how");
  const stage = page.locator("[data-story-stage]");
  await expect(stage).toBeVisible();
  const animation = await stage.evaluate(element => getComputedStyle(element, "::before").animationName);
  expect(animation).toBe("none");
  await expect.poll(async () => stage.evaluate(element => getComputedStyle(element).getPropertyValue("--story-aurora-x"))).toBe("0.00px");
});

test("the request counter shows zero", async ({ page }) => {
  await expect(page.locator("#netcount")).toHaveText("0");
});

test("hovering a label peeks at its real value", async ({ page }) => {
  await showSide(page, "safe");
  await page.locator('#safe .redact[data-ph="[IP_1]"]').hover();
  await expect(page.locator("#peek")).toBeVisible();
  await expect(page.locator("#peekValue")).toHaveText("10.20.4.17");
  await page.locator("#loadExample").hover();
  await expect(page.locator("#peek")).toBeHidden();
});
});
}

test.describe("theme switching", () => {
  test("Board is the default", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-skin", "board");
    await expect(page.locator('[data-skin-option="board"]')).toHaveAttribute("aria-pressed", "true");
  });

  test("Board turns the workbench over and only the facing side is usable", async ({ page }) => {
    await page.goto("/#board");
    const card = page.locator("#workbench");
    await expect(card).toHaveAttribute("data-side", "safe");
    expect(await page.locator("#paneText").evaluate(e => /** @type {HTMLElement} */ (e).inert)).toBe(true);
    await page.locator("#flip").click();
    await expect(card).toHaveAttribute("data-side", "text");
    await expect(page.locator("#flip")).toHaveText("Show safe side");
    expect(await page.locator("#paneSafe").evaluate(e => /** @type {HTMLElement} */ (e).inert)).toBe(true);
    await page.locator("#clear").click();
    await expect(page.locator("#input")).toBeFocused();
  });

  test("other themes show both panes side by side", async ({ page }) => {
    await page.goto("/#lens");
    await expect(page.locator("#flip")).toBeHidden();
    expect(await page.locator("#paneText").evaluate(e => /** @type {HTMLElement} */ (e).inert)).toBe(false);
    expect(await page.locator("#paneSafe").evaluate(e => /** @type {HTMLElement} */ (e).inert)).toBe(false);
  });

  test("Board stays dark even when the system is light", async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: "light" });
    const page = await context.newPage();
    await page.goto("/#board");
    const bg = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
    expect(bg).toBe("rgb(255, 255, 255)");
    await context.close();
  });

  test("the switch changes theme, updates the link and is remembered", async ({ page }) => {
    await page.goto("/");
    await page.locator('[data-skin-option="sticker"]').click();
    await expect(page.locator("html")).toHaveAttribute("data-skin", "sticker");
    expect(new URL(page.url()).hash).toBe("#sticker");
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-skin", "sticker");
    await expect(page.locator('[data-skin-option="sticker"]')).toHaveAttribute("aria-pressed", "true");
  });

  test("switching theme keeps the text and the hidden values", async ({ page }) => {
    await page.goto("/#lens");
    await page.locator("#ledger tbody tr", { hasText: "[IP_1]" }).locator(".switch").click();
    const before = await page.locator("#safe").textContent();
    await page.locator('[data-skin-option="sticker"]').click();
    await expect(page.locator("#safe")).toHaveText(before ?? "");
  });

  test("Sticker stays light even when the system is dark", async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: "dark" });
    const page = await context.newPage();
    await page.goto("/#sticker");
    const bg = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
    expect(bg).toBe("rgb(246, 240, 228)");
    await context.close();
  });

  test("Lens follows a dark system setting", async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: "dark" });
    const page = await context.newPage();
    await page.goto("/#lens");
    const bg = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
    expect(bg).toBe("rgb(12, 17, 21)");
    await context.close();
  });
});

test.describe("files, own words and the AI round trip", () => {
  test.beforeEach(async ({ page }) => {
    page.problems = watchProblems(page);
    await page.goto("/#lens");
    await expect(page.locator("#statHidden")).toHaveText("11");
  });
  test.afterEach(async ({ page }) => {
    expect(page.problems).toEqual([]);
  });

  test("copy adds a note for the AI unless switched off", async ({ page, context, browserName }) => {
    test.skip(browserName !== "chromium", "clipboard permissions are Chromium-only in Playwright");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.locator("#copySafe").click();
    let clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip.startsWith("Note: values in square brackets")).toBe(true);
    expect(clip).toContain("[AWS_KEY_1]");
    await page.locator("#withNote").uncheck();
    await page.locator("#copySafe").click();
    clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip.startsWith("# Deploy failed")).toBe(true);
  });

  test("labels the AI changed slightly still come back", async ({ page }) => {
    await page.locator("#answer").fill("Rotate aws_key_1 and block [ip-2].");
    await expect(page.locator("#restored")).toHaveText("Rotate AKIAIOSFODNN7EXAMPLE and block 10.20.9.250.");
  });

  test("a chosen file is opened and checked", async ({ page }) => {
    await page.locator("#fileInput").setInputFiles({ name: "app.log", mimeType: "text/plain", buffer: Buffer.from("db at 10.1.2.3 mail a@b.io") });
    await expect(page.locator("#input")).toHaveValue("db at 10.1.2.3 mail a@b.io");
    await expect(page.locator("#safe")).toHaveText("db at [IP_1] mail [EMAIL_1]");
    await expect(page.locator("#status")).toHaveText("Opened app.log.");
  });

  test("a dropped file is opened", async ({ page }) => {
    await page.evaluate(() => {
      const dt = new DataTransfer();
      dt.items.add(new File(["host 10.9.8.7"], "drop.txt", { type: "text/plain" }));
      document.querySelector("#dropZone")?.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true, cancelable: true }));
    });
    await expect(page.locator("#safe")).toHaveText("host [IP_1]");
  });

  test("binary files are refused", async ({ page }) => {
    await page.locator("#fileInput").setInputFiles({ name: "a.bin", mimeType: "application/octet-stream", buffer: Buffer.from([0, 1, 2, 0]) });
    await expect(page.locator("#status")).toHaveText("a.bin doesn't look like a text file.");
    await expect(page.locator("#statHidden")).toHaveText("11");
  });

  test("a large file is checked without freezing the page", async ({ page }) => {
    const line = "2026-10-15 conn from 10.20.4.17 user ops@acme-payments.io ok\n";
    await page.locator("#fileInput").setInputFiles({ name: "big.log", mimeType: "text/plain", buffer: Buffer.from(line.repeat(20_000)) });
    await expect(page.locator("#statHidden")).toHaveText("2", { timeout: 15_000 });
    await expect(page.locator("#safe")).toContainText("conn from [IP_1] user [EMAIL_1] ok");
    await expect(page.locator("#statPlain")).toBeVisible();
  });

  test("your own words are hidden and remembered", async ({ page }) => {
    await page.locator("#input").fill("invoice for Acme Payments");
    await page.locator(".words summary").click();
    await page.locator("#words").fill("Acme Payments");
    await expect(page.locator("#safe")).toHaveText("invoice for [PRIVATE_1]");
    await page.reload();
    await page.locator(".words summary").click();
    await expect(page.locator("#words")).toHaveValue("Acme Payments");
    await page.locator("#input").fill("invoice for acme payments");
    await expect(page.locator("#safe")).toHaveText("invoice for [PRIVATE_1]");
  });
});

test.describe("install and offline", () => {
  test("the page opens offline after the first visit", async ({ page, context }) => {
    await page.goto("/");
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect(page.locator("#statHidden")).toHaveText("11");
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator("#statHidden")).toHaveText("11");
    await expect(page.locator("#safe .redact").first()).toBeAttached();
  });

  test("the app manifest is linked", async ({ page }) => {
    await page.goto("/");
    const res = await page.request.get("/manifest.webmanifest");
    expect(res.ok()).toBe(true);
    expect((await res.json()).name).toBe("Paste-Safe");
  });
});
