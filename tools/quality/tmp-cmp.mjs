import { chromium } from '@playwright/test';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36';
async function shot(url, out, ua) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(ua ? { userAgent: UA, viewport: { width: 1280, height: 700 }, deviceScaleFactor: 1 } : { viewport: { width: 1280, height: 700 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  try { await page.evaluate(() => document.fonts.ready); } catch (e) {}
  await page.waitForTimeout(2500);
  await page.evaluate(() => { const h=[...document.querySelectorAll('h1,h2,h3')].find(e=>/Our Leadership and Staff/i.test(e.textContent)); window.scrollTo(0, h.getBoundingClientRect().top+scrollY-330); });
  await page.waitForTimeout(600);
  await page.screenshot({ path: out });
  await browser.close();
}
await shot('https://www.ustafoundation.com/en/home/who-we-are.html', 'tools/quality/cmp-source.png', true);
await shot('http://localhost:3000/en/home/who-we-are', 'tools/quality/cmp-ours.png', false);
console.log('done');
