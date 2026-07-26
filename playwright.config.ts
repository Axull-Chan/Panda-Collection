import { defineConfig, devices } from "@playwright/test";
import "./tests/fixtures/env";

/**
 * Runs against the local Vite dev server. CI (when added) should set
 * CI=true, which disables retries-as-a-crutch and reuses no existing
 * server, matching a clean-checkout run.
 */
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false, // shared Supabase project + shared test accounts — avoid cross-test races
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  globalSetup: "./tests/fixtures/global-setup.ts",

  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !isCI,
    timeout: 60_000,
    stdout: "pipe",
  },
});
