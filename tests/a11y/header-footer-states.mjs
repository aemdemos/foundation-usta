/**
 * a11y scan of header/nav INTERACTIVE states that the standard page-load scan
 * doesn't reach: mobile hamburger nav open, and desktop expanded/hovered nav.
 * (Footers rarely have interactive states, so only the nav is exercised here;
 * extend with a footer interaction if one is added.)
 * Uses the same axe tags + fail impacts as the gate (tests/a11y/a11y.config.js).
 *
 * Run after any header/nav change:  npm run test:a11y:nav [url]
 */
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import config from './a11y.config.js';

const { wcagTags, failOnImpact } = config;
const URL = process.argv[2] || 'http://localhost:3000/content/index';

async function scan(page, label) {
  const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
  const violations = results.violations.filter((v) => failOnImpact.includes(v.impact));
  const warnings = results.violations.filter((v) => !failOnImpact.includes(v.impact));
  if (warnings.length) {
    console.warn(`\n⚠ [${label}] warnings (not failing):`);
    warnings.forEach((v) => console.warn(`  [${v.impact}] ${v.id}: ${v.description}`));
  }
  if (violations.length) {
    console.error(`\n✖ [${label}] VIOLATIONS:`);
    violations.forEach((v) => {
      console.error(`  [${v.impact}] ${v.id}: ${v.description} (${v.helpUrl})`);
      v.nodes.forEach((n) => console.error(`    → ${n.html}`));
    });
  } else {
    console.log(`✓ [${label}] no critical/serious violations`);
  }
  return violations.length;
}

const browser = await chromium.launch();
let total = 0;

// 1) Mobile — open the hamburger nav, then scan
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mPage = await mobile.newPage();
await mPage.goto(URL, { waitUntil: 'networkidle' });
const openBtn = mPage.getByRole('button', { name: /open navigation/i });
if (await openBtn.count()) {
  await openBtn.first().click();
  await mPage.waitForTimeout(400);
}
total += await scan(mPage, 'mobile nav OPEN');
await mobile.close();

// 2) Desktop — expand the first top-level nav item (flyout), then scan
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const dPage = await desktop.newPage();
await dPage.goto(URL, { waitUntil: 'networkidle' });
const firstNav = dPage.locator('nav[aria-expanded], nav a, nav button').first();
try {
  await firstNav.hover({ timeout: 1000 });
  await dPage.waitForTimeout(400);
} catch { /* no hover flyout — scan the default desktop state */ }
total += await scan(dPage, 'desktop nav');
await desktop.close();

await browser.close();

if (total > 0) {
  console.error(`\nTotal critical/serious violations: ${total}`);
  process.exit(1);
}
console.log('\n✓ Header/nav interactive states passed (mobile open + desktop).');
