import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('http://localhost:3000/en/home/who-we-are', { waitUntil: 'load', timeout: 60000 });
try { await page.evaluate(() => document.fonts.ready); } catch (e) {}
await page.waitForTimeout(2000);
const d = await page.evaluate(() => {
  const YEL = (bg) => { const m = bg.match(/rgb\((\d+), (\d+), (\d+)/); return m && +m[1]>240 && +m[2]>220 && +m[2]<250 && +m[3]>160 && +m[3]<210; };
  const out = { sections: [] };
  [...document.querySelectorAll('main > .section')].forEach((s,i) => {
    const r = s.getBoundingClientRect(); const cs = getComputedStyle(s);
    out.sections.push({ i, cls: s.className.slice(0,50), top: Math.round(r.top+scrollY), h: Math.round(r.height), bg: cs.backgroundColor, isYellow: YEL(cs.backgroundColor), mt: cs.marginTop, mb: cs.marginBottom, pt: cs.paddingTop });
  });
  const h = [...document.querySelectorAll('h2')].find(e=>/Our Leadership and Staff/i.test(e.textContent));
  out.headingTop = h ? Math.round(h.getBoundingClientRect().top+scrollY) : null;
  return out;
});
console.log('OURS', JSON.stringify(d, null, 2));
await browser.close();
