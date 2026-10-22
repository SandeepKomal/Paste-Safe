import { test, expect } from "@playwright/test";

/** Fails the test on any console error, uncaught exception or request to another site. */
function watchProblems(page) {
  const problems = [];
  page.on("console", m => { if (m.type() === "error") problems.push(`console: ${m.text()}`); });
  page.on("pageerror", e => problems.push(`exception: ${e.message}`));
  page.on("request", r => {
    const url = new URL(r.url());
    if (!["data:", "blob:"].includes(url.protocol) && url.host !== "127.0.0.1:4173") problems.push(`external request: ${r.url()}`);
  });
  return problems;
}

test.describe("the tool", () => {
test.beforeEach(async ({ page }) => {
  page.problems = watchProblems(page);
  await page.goto("/");
  await expect(page.locator("#safe .redact").first()).toBeAttached();
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
  expect(mirror).toBe(input + "\u200b");
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

test("copy puts the safe text on the clipboard and says what was copied", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium", "clipboard permissions are Chromium-only in Playwright");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.locator("#copySafe").click();
  await expect(page.locator("#copySafe")).toHaveAttribute("data-state", "done");
  await expect(page.locator("#copyNote")).toHaveText("Copied. 11 secrets replaced, raw text not copied.");
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toContain("[GITHUB_TOKEN_1]");
  expect(clip).not.toContain("ghp_");
});

test("the AI's answer gets the real values back and leftovers are called out", async ({ page }) => {
  await page.locator("#answer").fill("Rotate [AWS_KEY_1] and block [IP_2]. [IP_99] is unknown.");
  await expect(page.locator("#restored")).toHaveText("Rotate AKIAIOSFODNN7EXAMPLE and block 10.20.9.250. [IP_99] is unknown.");
  await expect(page.locator("#restoreNote")).toHaveText("2 labels put back. 1 still looks like a label.");
  await expect(page.locator("#restored .leftover")).toHaveText("[IP_99]");
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

test("the request counter shows zero and the version is shown", async ({ page }) => {
  await expect(page.locator("#netcount")).toHaveText("0");
  const version = (await page.request.get("/package.json").then(r => r.json())).version;
  await expect(page.locator("#build")).toHaveText(`v${version}`);
  await expect(page.locator("#verifyVersion")).toHaveText(`v${version}`);
});

test("hovering a label peeks at its real value", async ({ page }) => {
  await page.locator('#safe .redact[data-ph="[IP_1]"]').hover();
  await expect(page.locator("#peek")).toBeVisible();
  await expect(page.locator("#peekValue")).toHaveText("10.20.4.17");
  await page.locator("#loadExample").hover();
  await expect(page.locator("#peek")).toBeHidden();
});

test("plain mode hides real values and asks before copying them", async ({ page }) => {
  await page.locator("#plainMode").check({ force: true });
  await expect(page.locator("html")).toHaveClass(/is-plain/);
  await expect(page.locator("#plainModeAnswer")).toBeChecked();
  await page.locator('#safe .redact[data-ph="[IP_1]"]').hover();
  await expect(page.locator("#peek")).toBeHidden();
  expect(await page.locator("#restored .restored").first().evaluate(e => getComputedStyle(e).filter)).toContain("blur");
  let asked = "";
  page.once("dialog", d => { asked = d.message(); void d.dismiss(); });
  await page.locator("#copyRestored").click();
  expect(asked).toContain("real values");
  await expect(page.locator("#copyRestored")).not.toHaveAttribute("data-state", "done");
  await page.reload();
  await expect(page.locator("#plainMode")).toBeChecked();
});

test("the coverage card runs the detector and lists known gaps", async ({ page }) => {
  const rows = page.locator("#coverageList li");
  await expect(rows.first()).toBeAttached();
  await expect(page.locator("#coverageList li.is-caught", { hasText: "AWS access key" })).toContainText("[AWS_KEY_1]");
  const name = page.locator("#coverageList li", { hasText: "Person's name" });
  await expect(name).toHaveClass(/is-missed/);
  await expect(name).toContainText("Known gap");
  await page.locator("#wordsPanel summary").click();
  await page.locator("#words").fill("Priya Sharma");
  await expect(name).toContainText("Caught by your words");
});

test("the main layout is two columns on desktop and one on phones", async ({ page, viewport }) => {
  const cols = await page.locator(".tool .bench__grid").first().evaluate(e => getComputedStyle(e).gridTemplateColumns.split(" ").length);
  expect(cols).toBe((viewport?.width ?? 1280) > 960 ? 2 : 1);
  await expect(page.locator("#heroTitle")).toBeVisible();
});
});

test.describe("hero", () => {
test("the reel shows ten use cases and stops for reduced motion", async ({ page }) => {
  await page.goto("/");
  const stage = page.locator("[data-privacy-reel-stage]");
  await expect(page.locator("[data-privacy-card]")).toHaveCount(10);
  const geometry = await stage.evaluate(e => {
    const st = getComputedStyle(e);
    const radius = Number.parseFloat(st.getPropertyValue("--privacy-reel-radius"));
    return { radius, width: Number.parseFloat(st.getPropertyValue("--privacy-card-width")), expected: 2 * radius * Math.tan(Math.PI / 10) + 1.5 };
  });
  expect(geometry.radius).toBeGreaterThan(0);
  expect(Math.abs(geometry.width - geometry.expected)).toBeLessThan(1);
  const reel = page.locator("[data-privacy-reel]");
  await expect.poll(() => reel.evaluate(e => getComputedStyle(e).animationName)).toBe("reel-spin");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => reel.evaluate(e => getComputedStyle(e).animationName)).toBe("none");
});

test("every reel card keeps its text inside its edges", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const problems = await page.evaluate(() => [...document.querySelectorAll("[data-privacy-card]")].flatMap(card => {
    const out = [];
    for (const el of card.children) {
      if (el.offsetLeft + el.offsetWidth > card.clientWidth - 4) out.push(`${el.className} is wider than its card`);
      if (!el.classList.contains("reel__raw") && el.scrollWidth > el.clientWidth + 1) out.push(`${el.className} overflows`);
    }
    if (card.scrollHeight > card.clientHeight + 1) out.push("content is taller than the card");
    return out.map(o => `${card.querySelector("b")?.textContent}: ${o}`);
  }));
  expect(problems).toEqual([]);
});

test("the logo is in the header and the footer", async ({ page }) => {
  await page.goto("/");
  for (const img of [page.locator(".wordmark img"), page.locator(".footer__brand img")]) {
    await expect(img).toHaveAttribute("src", "assets/logo.svg");
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate(e => /** @type {HTMLImageElement} */ (e).naturalWidth)).toBeGreaterThan(0);
  }
  await expect(page.locator(".footer")).toContainText("© 2026 Paste-Safe · Sandeep Komal Pothu");
});

test("the figures show live counts", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#figRequests")).toHaveText("0");
  await expect(page.locator("#figRules")).toHaveText(/^\d{2,}$/);
  await expect(page.locator(".product")).toContainText("[AWS_KEY_1]");
});

test("the phone action bar appears over the tool and copies the safe text", async ({ page, context, browserName, viewport }) => {
  test.skip((viewport?.width ?? 1280) > 640, "The action bar is for phones.");
  const bar = page.locator("#actionbar");
  await page.goto("/");
  await expect(bar).not.toHaveClass(/is-shown/);
  await page.locator(".ledger").evaluate(e => e.scrollIntoView({ block: "start" }));
  await expect(bar).toHaveClass(/is-shown/);
  await expect(page.locator("#actionHidden")).toHaveText("11");
  if (browserName === "chromium") {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.locator("#actionCopy").click();
    await expect(page.locator("#actionCopy")).toHaveAttribute("data-state", "done");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("[AWS_KEY_1]");
  }
  await page.locator("#copySafe").evaluate(e => e.scrollIntoView({ block: "center" }));
  await expect(bar).not.toHaveClass(/is-shown/);
});
});

test.describe("scroll effects", () => {
test("sections fade in, headlines light up and the figure counts up", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/has-motion/);
  const card = page.locator(".coverage__card");
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveClass(/is-in/);
  await expect.poll(() => card.evaluate(e => Number(getComputedStyle(e).opacity))).toBe(1);
  const lastWord = page.locator("#coverageTitle .word").last();
  await page.locator("#coverageTitle").evaluate(e => scrollTo(0, e.getBoundingClientRect().top + scrollY - innerHeight * 0.25));
  await expect.poll(() => lastWord.evaluate(e => Number(getComputedStyle(e).opacity))).toBeGreaterThan(0.95);
  await expect(page.locator("#coverageTitle")).toHaveText("What this copy catches.");
  await page.locator(".figures").scrollIntoViewIfNeeded();
  await expect(page.locator("#figRules")).toHaveText(/^\d{2,}$/);
  await expect.poll(async () => Number(await page.locator("#figRules").textContent())).toBeGreaterThan(40);
});

test("the pinned masking scene finds the secrets as you scroll", async ({ page }) => {
  await page.goto("/");
  const scene = page.locator("[data-pin=product]");
  const pinTop = await scene.evaluate(e => e.getBoundingClientRect().top + scrollY);
  await page.evaluate(y => scrollTo(0, y), pinTop);
  await expect(page.locator("#heroCount")).toHaveText("0 hidden");
  const end = await scene.evaluate(e => e.getBoundingClientRect().top + scrollY + e.offsetHeight - innerHeight);
  await page.evaluate(y => scrollTo(0, y), end);
  await expect(page.locator("#heroCount")).toHaveText("5 hidden");
  const stage = await scene.locator(".pin__stage").boundingBox();
  expect(Math.abs(stage?.y ?? 99)).toBeLessThan(2);
});

test("the gallery arrows step through the cards", async ({ page }) => {
  await page.goto("/");
  const track = page.locator("#closerTrack");
  await track.scrollIntoViewIfNeeded();
  await expect(page.locator('[data-closer="-1"]')).toBeDisabled();
  await page.locator('[data-closer="1"]').click();
  await expect.poll(() => track.evaluate(e => e.scrollLeft)).toBeGreaterThan(100);
  await expect(page.locator('[data-closer="-1"]')).toBeEnabled();
});

test("the gallery moves on by itself until paused", async ({ page }) => {
  await page.goto("/");
  const track = page.locator("#closerTrack");
  await track.scrollIntoViewIfNeeded();
  await page.mouse.move(1, 1);
  await expect.poll(() => track.evaluate(e => e.scrollLeft), { timeout: 9000 }).toBeGreaterThan(100);
  const play = page.locator("[data-closer-play]");
  await expect(play).toHaveAttribute("aria-label", "Pause the gallery");
  await play.click();
  await expect(play).toHaveAttribute("aria-label", "Play the gallery");
  const left = await track.evaluate(e => e.scrollLeft);
  await page.mouse.move(1, 1);
  await page.waitForTimeout(5500);
  expect(Math.abs((await track.evaluate(e => e.scrollLeft)) - left)).toBeLessThan(2);
});

test("the film shows the cut that fits the screen and the button pauses it", async ({ page, viewport }) => {
  await page.goto("/");
  const frame = page.locator(".film__frame");
  await frame.scrollIntoViewIfNeeded();
  const tall = (viewport?.width ?? 1280) <= 640;
  await expect(page.locator(tall ? ".film__video--tall" : ".film__video--wide")).toBeVisible();
  await expect(page.locator(tall ? ".film__video--wide" : ".film__video--tall")).toBeHidden();
  const ratio = await frame.evaluate(e => e.clientWidth / e.clientHeight);
  expect(Math.abs(ratio - (tall ? 4 / 5 : 16 / 9))).toBeLessThan(0.02);
  const playable = await page.evaluate(() => {
    const v = document.createElement("video");
    return Boolean(v.canPlayType('video/webm; codecs="vp9"') || v.canPlayType('video/mp4; codecs="avc1.640028"'));
  });
  test.skip(!playable, "This browser build has no video codecs.");
  const toggle = page.locator("[data-film-toggle]");
  await expect(toggle).toHaveAttribute("data-state", "playing", { timeout: 10000 });
  await toggle.click();
  await expect(toggle).toHaveAttribute("data-state", "paused");
  await expect(toggle).toHaveAttribute("aria-label", "Play the film");
});

test("the film pins and grows until it fills the screen", async ({ page }) => {
  await page.goto("/");
  const section = page.locator("[data-pin=film]");
  const middle = await section.evaluate(e => e.getBoundingClientRect().top + scrollY + (e.offsetHeight - innerHeight) * 0.75);
  await page.evaluate(y => scrollTo(0, y), middle);
  await expect.poll(() => section.evaluate(e => Number(e.style.getPropertyValue("--grow")))).toBe(1);
  const box = await page.locator(".film__frame").boundingBox();
  const vp = page.viewportSize();
  // It reaches the screen's edges on one axis and stays within them on the other.
  const fill = Math.max((box?.width ?? 0) / (vp?.width ?? 1), (box?.height ?? 0) / (vp?.height ?? 1));
  expect(fill).toBeGreaterThan(0.98);
  expect(fill).toBeLessThan(1.02);
  expect(await page.locator(".film__stage").boundingBox().then(b => Math.abs(b?.y ?? 99))).toBeLessThan(2);
});

test("reduced motion leaves everything in place", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveClass(/has-motion/);
  await expect(page.locator("#heroCount")).toHaveText("5 hidden");
  expect(await page.locator(".coverage__card").evaluate(e => getComputedStyle(e).opacity)).toBe("1");
  expect(await page.locator(".pin--product .product").evaluate(e => getComputedStyle(e).transform)).toBe("none");
  // Without motion the scenes are ordinary sections, not tall pinned ones.
  expect(await page.locator("[data-pin=product]").evaluate(e => e.offsetHeight < innerHeight * 1.5)).toBe(true);
  expect(await page.locator(".pin--product .pin__stage").evaluate(e => getComputedStyle(e).position)).toBe("static");
  // The gallery and the film stay still until asked.
  await expect(page.locator("[data-closer-play]")).toBeHidden();
  await page.locator(".film__frame").scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await expect(page.locator("[data-film-toggle]")).toHaveAttribute("data-state", "paused");
  expect(await page.locator("[data-film]").evaluateAll(vs => vs.every(v => /** @type {HTMLVideoElement} */ (v).paused))).toBe(true);
});
});

test.describe("scroll story", () => {
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
      await page.locator(`[data-story-step="${step}"]`).evaluate(element => element.scrollIntoView({ block: "center", behavior: "instant" }));
      await expect(stage).toHaveAttribute("data-active-step", step, { timeout: 5000 });
      // Measure where the scene settles, not mid-way through its entrance.
      await page.waitForFunction(() => !document.getAnimations().some(a => a instanceof CSSTransition));
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

test("on narrow screens the stage stays pinned above the chapter being read", async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 1280) > 960, "Desktop shows the stage beside the chapters.");
  await page.goto("/#how");
  const stage = page.locator("[data-story-stage]");
  for (const step of ["detect", "mask", "restore"]) {
    const chapter = page.locator(`[data-story-step="${step}"]`);
    await chapter.evaluate(e => scrollTo(0, e.getBoundingClientRect().top + scrollY - innerHeight * 0.55));
    await expect(stage).toHaveAttribute("data-active-step", step);
    const [stageBox, chapterBox] = [await stage.boundingBox(), await chapter.locator("h3").boundingBox()];
    if (!stageBox || !chapterBox) throw new Error("missing layout box");
    expect(stageBox.y).toBeGreaterThanOrEqual(0);
    expect(stageBox.y + stageBox.height).toBeLessThanOrEqual(chapterBox.y + 1);
  }
});

test("the progress bar follows the scroll position", async ({ page }) => {
  await page.goto("/#how");
  const bar = page.locator("[data-story-progress]");
  const scale = () => bar.evaluate(e => new DOMMatrix(getComputedStyle(e).transform).a);
  const initial = await scale();
  await page.locator('[data-story-step="restore"]').scrollIntoViewIfNeeded();
  await expect.poll(scale).toBeGreaterThan(initial + 0.01);
});

});

test.describe("files, own words and the AI round trip", () => {
  test.beforeEach(async ({ page }) => {
    page.problems = watchProblems(page);
    await page.goto("/");
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
  test("a word list can be imported, exported and started from a sample", async ({ page }) => {
    await page.locator("#wordsPanel summary").click();
    await page.locator("#wordsFile").setInputFiles({ name: "team.txt", mimeType: "text/plain", buffer: Buffer.from("# our clients\nGlobex\nInitech\n") });
    await expect(page.locator("#status")).toHaveText("Imported 2 words from team.txt.");
    await page.locator("#input").fill("ticket from Globex");
    await expect(page.locator("#safe")).toHaveText("ticket from [PRIVATE_1]");
    await page.locator('[data-starter="clients"]').click();
    await expect(page.locator("#words")).toHaveValue(/Northwind Traders/);
    const [download] = await Promise.all([page.waitForEvent("download"), page.locator("#exportWords").click()]);
    const body = await (await download.createReadStream()).toArray().then(c => Buffer.concat(c).toString());
    expect(body).toContain("Globex");
    expect(body).not.toContain("ticket from");
  });
});

test.describe("privacy and terms", () => {
  test("the privacy page erases everything the site saved", async ({ page }) => {
    const problems = watchProblems(page);
    await page.goto("/");
    await page.locator("#wordsPanel summary").click();
    await page.locator("#words").fill("Globex");
    await page.locator("#plainMode").check({ force: true });
    await expect.poll(() => page.evaluate(() => localStorage.getItem("paste-safe:words"))).toBe("Globex");
    await page.locator('.footer a[href="privacy.html"]').click();
    await expect(page.locator("h1")).toHaveText("Privacy");
    await page.locator("#eraseAll").click();
    await expect(page.locator("#eraseStatus")).toContainText("Erased");
    expect(await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith("paste-safe:")))).toEqual([]);
    await page.goto("/");
    await expect(page.locator("#plainMode")).not.toBeChecked();
    expect(problems).toEqual([]);
  });

  test("the terms page opens and links back", async ({ page }) => {
    const problems = watchProblems(page);
    await page.goto("/terms.html");
    await expect(page.locator("h1")).toHaveText("Terms");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.locator(".nav--doc a", { hasText: "Privacy" }).click();
    await expect(page.locator("#grievance")).toBeVisible();
    expect(problems).toEqual([]);
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
