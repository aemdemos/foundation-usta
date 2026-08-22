#!/usr/bin/env node
/**
 * run.mjs — entry for the a11y test runner.
 *
 * Mode 2 (single page):  npm run test:a11y <url>   → scans just that URL (per-task gate).
 * Mode 1 (full sweep):   npm run test:a11y:all      → scans every URL in a11y.config.js
 *                        (site audit — before release / after a global change).
 *
 * A URL argument is forwarded as A11Y_URL (Mode 2); with no argument the test
 * iterates the config's urls[] (Mode 1). Delegates to the Playwright runner.
 */
import { spawnSync } from 'node:child_process';

const urlArg = process.argv[2];
const env = { ...process.env };
if (urlArg) env.A11Y_URL = urlArg;

const result = spawnSync(
  'npx',
  ['playwright', 'test', '--config', 'tests/a11y/playwright.config.js'],
  { stdio: 'inherit', env },
);

process.exit(result.status ?? 1);
