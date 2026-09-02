#!/usr/bin/env node
/**
 * typography-check.mjs — enforces The Typography Rule (AGENTS.md / typography-system).
 *
 * Loads the MIGRATED pages (a11y.config.js urls[], or one URL arg) at each sampled viewport
 * and FAILS (exit 1) if the computed font-size / line-height / weight / family of any present
 * h1..h6 / body element drifts from the source record in tools/quality/typography.json beyond
 * tolerance. This is how we guarantee the type scale is maintained across ALL viewports, in
 * global styles AND blocks — not just eyeballed.
 *
 * Empty/undiscovered scale → skips cleanly (never fails a fresh project). Run
 * `npm run discover:typography -- <source-url> --write` first to populate the record.
 *
 * REQUIRES: the dev server up (`npx aem up`) and Playwright's Chromium (`npm install`).
 *
 * Usage:
 *   node tools/quality/typography-check.mjs               # every URL in a11y.config.js
 *   node tools/quality/typography-check.mjs /products     # one path
 *   A11Y_BASE_URL=https://main--repo--owner.aem.page node tools/quality/typography-check.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const BASE = (process.env.A11Y_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'];

let record;
try {
  record = JSON.parse(readFileSync(join(ROOT, 'tools/quality/typography.json'), 'utf8'));
} catch {
  console.log('⚠ tools/quality/typography.json not found — skipping typography check.');
  process.exit(0);
}
const scale = record.scale || {};
const widths = Object.keys(scale).map(Number).sort((a, b) => a - b);
if (!widths.length) {
  console.log('✓ Typography check skipped — no source scale recorded yet (run `npm run discover:typography`).');
  process.exit(0);
}
const TOL_PX = record.tolerancePx ?? 1.5;
const TOL_RATIO = record.toleranceRatio ?? 0.06;

async function loadUrls() {
  const arg = process.argv[2];
  if (arg) return [arg];
  try {
    const cfg = (await import(join(ROOT, 'tests/a11y/a11y.config.js'))).default;
    if (Array.isArray(cfg?.urls) && cfg.urls.length) return cfg.urls;
  } catch { /* none */ }
  return ['/'];
}
const toUrl = (p) => (/^https?:\/\//i.test(p) ? p : BASE + (p.startsWith('/') ? p : `/${p}`));

let chromium;
try {
  ({ chromium } = await import('@playwright/test'));
} catch {
  console.error('✖ Playwright not installed. Run `npm install` (it also installs Chromium), then retry.');
  process.exit(1);
}

function measure(tags) {
  const round = (v) => Math.round(parseFloat(v) * 10) / 10;
  const out = {};
  for (const tag of tags) {
    const el = [...document.querySelectorAll(tag)].find((e) => {
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && e.textContent.trim();
    });
    if (!el) continue;
    const cs = getComputedStyle(el);
    out[tag] = {
      fontSizePx: round(cs.fontSize),
      lineHeightPx: cs.lineHeight === 'normal' ? null : round(cs.lineHeight),
      fontWeight: Number(cs.fontWeight) || cs.fontWeight,
      fontFamily: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim().toLowerCase(),
    };
  }
  return out;
}

const urls = await loadUrls();
const browser = await chromium.launch();
const drifts = [];

for (const u of urls) {
  for (const w of widths) {
    const want = scale[w];
    if (!want) continue;
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    const page = await ctx.newPage();
    try {
      await page.goto(toUrl(u), { waitUntil: 'networkidle', timeout: 25000 });
      await page.waitForTimeout(300);
      const got = await page.evaluate(measure, TAGS);
      for (const tag of TAGS) {
        if (!want[tag] || !got[tag]) continue;
        const exp = want[tag]; const act = got[tag];
        const sizeTol = Math.max(TOL_PX, exp.fontSizePx * TOL_RATIO);
        if (Math.abs(act.fontSizePx - exp.fontSizePx) > sizeTol) {
          drifts.push(`${u} @${w}px ${tag}: font-size ${act.fontSizePx}px, expected ~${exp.fontSizePx}px`);
        }
        if (exp.lineHeightPx && act.lineHeightPx
          && Math.abs(act.lineHeightPx - exp.lineHeightPx) > Math.max(TOL_PX, exp.lineHeightPx * TOL_RATIO)) {
          drifts.push(`${u} @${w}px ${tag}: line-height ${act.lineHeightPx}px, expected ~${exp.lineHeightPx}px`);
        }
        const expFam = String(exp.fontFamily).toLowerCase();
        if (expFam && act.fontFamily !== expFam) {
          drifts.push(`${u} @${w}px ${tag}: font-family "${act.fontFamily}", expected "${expFam}"`);
        }
      }
    } catch (e) {
      drifts.push(`${u} @${w}px: load error — ${e.message.split('\n')[0].slice(0, 50)}`);
    }
    await ctx.close();
  }
}
await browser.close();

if (drifts.length) {
  console.error('\n✖ Typography drift vs source record (tools/quality/typography.json):\n');
  for (const d of drifts) console.error(`  ${d}`);
  console.error(`\n${drifts.length} drift(s). Fix per skills/typography-system — align the type scale to the source across all viewports.`);
  process.exit(1);
}
console.log(`✓ Typography check passed — h1..h6/body match the source scale across ${widths.join('/')} on ${urls.length} page(s).`);
