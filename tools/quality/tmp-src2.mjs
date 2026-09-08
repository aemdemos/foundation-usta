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
  // History heading and Leadership heading
  const hist = [...document.querySelectorAll('h1,h2,h3')].find(e=>/Our History/i.test(e.textContent));
  const lead = [...document.querySelectorAll('h1,h2,h3')].find(e=>/Our Leadership and Staff/i.test(e.textContent));
  // Sample vertical column at x=640 from just below history section down to leadership heading, detect yellow start
  const leadTop = lead.getBoundingClientRect().top + scrollY;
  // find topmost yellow ancestor of lead
  let node = lead, topYellow = null;
  for (let i=0;i<15 && node; i++){ node = node.parentElement; if(!node) break; if(YEL(getComputedStyle(node).backgroundColor)) topYellow = node; }
  const ty = topYellow.getBoundingClientRect();
  // what's the element right above topYellow? previous sibling
  const prev = topYellow.previousElementSibling;
  const prevInfo = prev ? { cls: prev.className.slice(0,50), bg: getComputedStyle(prev).backgroundColor, bottom: Math.round(prev.getBoundingClientRect().bottom+scrollY) } : null;
  return {
    yellowBandTop: Math.round(ty.top+scrollY), yellowBandHeight: Math.round(ty.height),
    yellowBandPadTop: getComputedStyle(topYellow).paddingTop, yellowBandCls: topYellow.className.slice(0,60),
    leadHeadingTop: Math.round(leadTop),
    yellowAboveHeading: Math.round(leadTop - (ty.top+scrollY)),
    prevSibling: prevInfo,
  };
});
console.log('SOURCE-DETAIL', JSON.stringify(d, null, 2));
await browser.close();
