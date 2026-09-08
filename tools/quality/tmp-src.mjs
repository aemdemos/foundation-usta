import { chromium } from '@playwright/test';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36';
const browser = await chromium.launch();
const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('https://www.ustafoundation.com/en/home/who-we-are.html', { waitUntil: 'load', timeout: 60000 });
try { await page.evaluate(() => document.fonts.ready); } catch (e) {}
await page.waitForTimeout(2500);
const d = await page.evaluate(() => {
  const YEL = (bg) => { const m = bg.match(/rgb\((\d+), (\d+), (\d+)/); return m && +m[1]>240 && +m[2]>220 && +m[2]<250 && +m[3]>160 && +m[3]<210; };
  // find the "Our Leadership and Staff" heading
  const h = [...document.querySelectorAll('h1,h2,h3')].find(e=>/Our Leadership and Staff/i.test(e.textContent));
  const hr = h.getBoundingClientRect();
  // walk up from heading to find the yellow band container and its top
  let node = h, band = null;
  for (let i=0;i<12 && node;i++){ node = node.parentElement; if(!node) break; const cs=getComputedStyle(node); if(YEL(cs.backgroundColor)){ band = node; } }
  const bandInfo = band ? (()=>{ const r=band.getBoundingClientRect(); const cs=getComputedStyle(band); return { cls: band.className.slice(0,60), top: Math.round(r.top+scrollY), height: Math.round(r.height), bg: cs.backgroundColor, padTop: cs.paddingTop, marginTop: cs.marginTop }; })() : null;
  // what element is directly above the band top? measure the yellow region extent
  // Also: gap between band top and heading top
  return { headingTop: Math.round(hr.top+scrollY), band: bandInfo, gapHeadingToBandTop: bandInfo ? Math.round(hr.top+scrollY - bandInfo.top) : null };
});
console.log('SOURCE', JSON.stringify(d, null, 2));
await browser.close();
