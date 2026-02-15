import { defineConfig, devices } from "@playwright/test";

// Run mobile tests only in CI by default (override with MOBILE=true)
const runMobile = process.env.CI || process.env.MOBILE === "true";

export default defineConfig({
  testDir: "./e2e",
  // Each test creates its own session, so parallel execution is safe
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Use multiple workers - tests are isolated via unique session codes
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI
    ? [["html", { outputFolder: "playwright-report" }], ["github"]]
    : [["html", { outputFolder: "playwright-report" }], ["list"]],
  timeout: 60000, // 60s per test (for AI/API calls)
  expect: {
    timeout: 10000, // 10s for assertions (real-time updates)
  },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    video: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Mobile viewport for responsive testing (CI only by default)
    ...(runMobile
      ? [
          {
            name: "mobile-chrome",
            use: { ...devices["Pixel 5"] },
          },
        ]
      : []),
  ],
});
