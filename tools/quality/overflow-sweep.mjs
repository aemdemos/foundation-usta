#!/usr/bin/env node
/**
 * overflow-sweep.mjs — enforces The Grid Rule's hard failure mode: no horizontal
 * page overflow at any viewport (AGENTS.md / grid-system).
 *
 * When section/content width is done with bespoke per-block percentages instead of
 * the shared grid, a child ends up wider than its column and the page scrolls
 * sideways. This loads each page in a real browser at a set of widths and asserts
 * document.documentElement.scrollWidth <= window.innerWidth (+1px tolerance).
 *
 * Widths swept = a narrow mobile baseline + EVERY breakpoint in
 * tools/quality/breakpoints.json (the source site's set) + a wide-desktop width,
 * so it exercises each layout tier boundary and the max-width container.
 *
 * REQUIRES: the dev server up (`npx aem up`, http://localhost:3000) and Playwright's
 * Chromium installed (`npm install` runs `playwright install chromium`).
 *
 * Usage:
 *   node tools/quality/overflow-sweep.mjs                 # sweep every URL in a11y.config.js
 *   node tools/quality/overflow-sweep.mjs /products       # sweep one path
 *   node tools/quality/overflow-sweep.mjs http://localhost:3000/products
 *   A11Y_BASE_URL=https://main--repo--owner.aem.page node tools/quality/overflow-sweep.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const BASE = (process.env.A11Y_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const MOBILE_BASELINE = 360;
const WIDE_DESKTOP = 1920;
const DEFAULT_BREAKPOINTS = [600, 900, 1200];

function loadBreakpoints() {
  try {
    const parsed = JSON.parse(readFileSync(join(ROOT, 'tools/quality/breakpoints.json'), 'utf8'));
    const bps = parsed.breakpoints;
    if (Array.isArray(bps) && bps.length && bps.every((n) => Number.isFinite(n))) return bps.map(Number);
  } catch { /* fall through to defaults */ }
  return DEFAULT_BREAKPOINTS;
}

async function loadUrls() {
  const arg = process.argv[2];
  if (arg) return [arg];
  try {
    const cfg = (await import(join(ROOT, 'tests/a11y/a11y.config.js'))).default;
    if (Array.isArray(cfg?.urls) && cfg.urls.length) return cfg.urls;
  } catch { /* no config */ }
  return ['/'];
}

function toUrl(pathOrUrl) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return BASE + (pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`);
}

const WIDTHS = [...new Set([MOBILE_BASELINE, ...loadBreakpoints(), WIDE_DESKTOP])].sort((a, b) => a - b);
const urls = await loadUrls();

let chromium;
try {
  ({ chromium } = await import('@playwright/test'));
} catch {
  console.error('✖ Playwright not installed. Run `npm install` (it also installs Chromium), then retry.');
  process.exit(1);
}

const browser = await chromium.launch();
const rows = [];
let hadError = false;

for (const u of urls) {
  const target = toUrl(u);
  const row = { url: u, cells: {} };
  for (const w of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    const page = await ctx.newPage();
    try {
      await page.goto(target, { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(300);
      const { docW, winW, offenders } = await page.evaluate(() => {
        const dw = document.documentElement.scrollWidth;
        const ww = window.innerWidth;
        let bad = [];
        if (dw > ww + 1) {
          bad = [...document.querySelectorAll('body *')]
            .filter((el) => el.getBoundingClientRect().right > ww + 1)
            .map((el) => {
              const id = el.id ? `#${el.id}` : '';
              const cls = typeof el.className === 'string' && el.className.trim()
                ? `.${el.className.trim().split(/\s+/).join('.')}` : '';
              return `${el.tagName.toLowerCase()}${id}${cls}`.slice(0, 60);
            });
          bad = [...new Set(bad)].slice(0, 3);
        }
        return { docW: dw, winW: ww, offenders: bad };
      });
      row.cells[w] = docW <= winW + 1 ? { ok: true } : { ok: false, docW, winW, offenders };
    } catch (e) {
      row.cells[w] = { ok: false, err: e.message.split('\n')[0].slice(0, 50) };
      hadError = true;
    }
    await ctx.close();
  }
  rows.push(row);
}
await browser.close();

// Report
const failing = [];
for (const row of rows) {
  const parts = WIDTHS.map((w) => {
    const c = row.cells[w];
    if (c.ok) return `${w}:OK`;
    if (c.err) return `${w}:ERR(${c.err})`;
    return `${w}:OVERFLOW(${c.docW}>${c.winW})`;
  });
  console.log(`  ${row.url.padEnd(28)} ${parts.join('  ')}`);
  for (const w of WIDTHS) {
    const c = row.cells[w];
    if (!c.ok && !c.err && c.offenders?.length) {
      console.log(`      @${w}px widest: ${c.offenders.join(' , ')}`);
    }
  }
  if (WIDTHS.some((w) => !row.cells[w].ok)) failing.push(row.url);
}

if (failing.length || hadError) {
  console.error(`\n✖ Overflow sweep: ${failing.length} page(s) with horizontal overflow or load errors.`);
  console.error('  Fix per skills/grid-system — use the shared grid/column spans, not bespoke widths.');
  if (hadError) console.error('  (ERR = page failed to load — is the dev server up at the base URL?)');
  process.exit(1);
}

console.log(`\n✓ Overflow sweep passed — no horizontal overflow at ${WIDTHS.join('/')} across ${urls.length} page(s).`);
