import { defineConfig } from '@playwright/test';

// Minimal Playwright config for the a11y suite — headless Chromium only.
// Chromium is sufficient for WCAG checks: axe-core outcomes are DOM-driven,
// not rendering-engine-specific.
export default defineConfig({
  testDir: '.',
  testMatch: 'a11y.test.js',
  timeout: 60_000,
  reporter: './a11y.reporter.mjs',
  use: {
    headless: true,
  },
});
