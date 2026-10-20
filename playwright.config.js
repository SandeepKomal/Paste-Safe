import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: "http://127.0.0.1:4173", trace: "retain-on-failure" },
  projects: [
    // Desktop browser engines
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"], browserName: "chromium" } },
    { name: "firefox-desktop", use: { ...devices["Desktop Firefox"], browserName: "firefox" } },
    { name: "webkit-desktop", use: { ...devices["Desktop Safari"], browserName: "webkit" } },
    // Mobile viewport/device emulation across the three browser engines.
    { name: "chromium-phone", use: { ...devices["Pixel 7"], browserName: "chromium" } },
    { name: "firefox-phone", use: { browserName: "firefox", viewport: { width: 412, height: 915 }, deviceScaleFactor: 1, isMobile: false, hasTouch: true } },
    { name: "webkit-phone", use: { ...devices["iPhone 13"], browserName: "webkit" } },
  ],
  webServer: {
    command: "python3 -m http.server 4173 --bind 127.0.0.1",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "ignore",
  },
});
