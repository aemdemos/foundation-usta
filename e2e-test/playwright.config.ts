import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./source",
  testMatch: /.*\.(extract|compare)\.ts$/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 2,
  workers: 3,
  reporter: "html",
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});