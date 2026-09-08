import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/en/home/who-we-are', { waitUntil: 'load', timeout: 60000 });
try { await page.evaluate(() => document.fonts.ready); } catch (e) {}
await page.waitForTimeout(2000);
// scroll so the History/yellow boundary is visible
await page.evaluate(() => { const h=[...document.querySelectorAll('h2')].find(e=>/Our Leadership and Staff/i.test(e.textContent)); window.scrollTo(0, h.getBoundingClientRect().top+scrollY-260); });
await page.waitForTimeout(500);
await page.screenshot({ path: 'tools/quality/ours-top.png' });
console.log('done');
await browser.close();
