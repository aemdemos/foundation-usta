#!/usr/bin/env node
/**
 * typography-discover.mjs — capture the SOURCE site's type scale + fonts (lift-and-shift).
 *
 * Loads the source page(s) in a real browser at the mobile baseline + every breakpoint in
 * breakpoints.json, reads the COMPUTED font-size / line-height / weight / family of h1..h6
 * and body text (the dominant value per tag), and collects the source @font-face rules.
 * Review the output, then re-run with --write to persist tools/quality/typography.json — the
 * single source of truth the checker (typography-check.mjs) enforces on the migrated site.
 *
 * REQUIRES: Playwright's Chromium (`npm install` runs `playwright install chromium`) and
 * network access to the source site.
 *
 * Usage:
 *   node tools/quality/typography-discover.mjs https://source-site.com
 *   node tools/quality/typography-discover.mjs https://a.com https://a.com/inner --write
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const MOBILE_BASELINE = 390;
const DEFAULT_BREAKPOINTS = [600, 900, 1200];
const TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'];

const rawArgs = process.argv.slice(2);
const write = rawArgs.includes('--write');
const urls = rawArgs.filter((a) => a !== '--write');
if (!urls.length) {
  console.error('Usage: node tools/quality/typography-discover.mjs <source-url> [more…] [--write]');
  process.exit(2);
}

function loadBreakpoints() {
  try {
    const parsed = JSON.parse(readFileSync(join(ROOT, 'tools/quality/breakpoints.json'), 'utf8'));
    if (Array.isArray(parsed.breakpoints) && parsed.breakpoints.length) return parsed.breakpoints.map(Number);
  } catch { /* defaults */ }
  return DEFAULT_BREAKPOINTS;
}
const WIDTHS = [...new Set([MOBILE_BASELINE, ...loadBreakpoints()])].sort((a, b) => a - b);

let chromium;
try {
  ({ chromium } = await import('@playwright/test'));
} catch {
  console.error('✖ Playwright not installed. Run `npm install` (it also installs Chromium), then retry.');
  process.exit(1);
}

// Runs in the page: dominant computed style per tag + @font-face rules.
function collect(tags) {
  const round = (v) => Math.round(parseFloat(v) * 10) / 10;
  const out = {};
  for (const tag of tags) {
    const els = [...document.querySelectorAll(tag)].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && el.textContent.trim();
    });
    if (!els.length) continue;
    const counts = {};
    for (const el of els) {
      const cs = getComputedStyle(el);
      const key = `${round(cs.fontSize)}|${round(cs.lineHeight) || 'normal'}|${cs.fontWeight}|${cs.fontFamily}`;
      counts[key] = (counts[key] || 0) + 1;
    }
    const [best] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    const [fontSize, lineHeight, fontWeight, fontFamily] = best.split('|');
    out[tag] = {
      fontSizePx: Number(fontSize),
      lineHeightPx: lineHeight === 'normal' ? null : Number(lineHeight),
      fontWeight: Number(fontWeight) || fontWeight,
      fontFamily: fontFamily.split(',')[0].replace(/["']/g, '').trim(),
    };
  }
  const fonts = [];
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; } // cross-origin
    if (!rules) continue;
    for (const rule of rules) {
      if (rule.constructor.name === 'CSSFontFaceRule' || rule.type === 5) {
        fonts.push({
          family: (rule.style.getPropertyValue('font-family') || '').replace(/["']/g, '').trim(),
          weight: rule.style.getPropertyValue('font-weight') || '400',
          style: rule.style.getPropertyValue('font-style') || 'normal',
          src: rule.style.getPropertyValue('src') || '',
        });
      }
    }
  }
  return { out, fonts };
}

const browser = await chromium.launch();
const scale = {};
const fontMap = new Map();
for (const url of urls) {
  for (const w of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
    const page = await ctx.newPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
      await page.waitForTimeout(400);
      const { out, fonts } = await page.evaluate(collect, TAGS);
      scale[w] = { ...(scale[w] || {}), ...out }; // first URL wins per tag, later fills gaps
      for (const [tag, v] of Object.entries(out)) if (!scale[w][tag]) scale[w][tag] = v;
      for (const f of fonts) if (f.family) fontMap.set(`${f.family}|${f.weight}|${f.style}`, f);
    } catch (e) {
      console.warn(`⚠ ${url} @${w}px: ${e.message.split('\n')[0].slice(0, 60)}`);
    }
    await ctx.close();
  }
}
await browser.close();

const fonts = [...fontMap.values()];
console.log('\nDiscovered type scale (dominant computed value per tag):');
for (const w of WIDTHS) {
  console.log(`  @${w}px`);
  for (const tag of TAGS) {
    const v = scale[w]?.[tag];
    if (v) console.log(`     ${tag}: ${v.fontSizePx}px / lh ${v.lineHeightPx ?? 'normal'} / ${v.fontWeight} / ${v.fontFamily}`);
  }
}
console.log(`\n@font-face found: ${fonts.length}`);
for (const f of fonts) console.log(`  ${f.family} ${f.weight} ${f.style}`);

if (write) {
  const existing = (() => { try { return JSON.parse(readFileSync(join(ROOT, 'tools/quality/typography.json'), 'utf8')); } catch { return {}; } })();
  const record = {
    $comment: existing.$comment || 'Source site type scale (lift-and-shift). See AGENTS.md → The Typography Rule.',
    source: urls.join(', '),
    tolerancePx: existing.tolerancePx ?? 1.5,
    toleranceRatio: existing.toleranceRatio ?? 0.06,
    fonts,
    scale,
  };
  writeFileSync(join(ROOT, 'tools/quality/typography.json'), `${JSON.stringify(record, null, 2)}\n`);
  console.log('\n✓ Wrote tools/quality/typography.json — enforced by `npm run check:typography`.');
} else {
  console.log('\nReview the values above, then re-run with --write to persist to typography.json.');
}
