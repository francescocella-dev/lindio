import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:4174";

export default defineConfig({
  testDir: "./tests/pwa",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: process.env.CI
    ? [["list"], ["html", { outputFolder: "playwright-pwa-report", open: "never" }]]
    : "list",
  timeout: 45_000,
  expect: {
    timeout: 8_000
  },
  outputDir: "test-results-pwa",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 10_000,
    navigationTimeout: 20_000
  },
  projects: [
    {
      name: "chromium-pwa",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: {
    command: "npm run build && npm run preview -- --host 127.0.0.1 --port 4174",
    url: `${baseURL}/login`,
    reuseExistingServer: false,
    timeout: 120_000
  }
});
