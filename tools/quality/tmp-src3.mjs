import { chromium } from '@playwright/test';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36';
const browser = await chromium.launch();
const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('https://www.ustafoundation.com/en/home/who-we-are.html', { waitUntil: 'load', timeout: 60000 });
try { await page.evaluate(() => document.fonts.ready); } catch (e) {}
await page.waitForTimeout(2500);
const d = await page.evaluate(() => {
  // sample the background color of the page at x=30 (near left edge, full-bleed) every 10px vertically
  // from the History section down past the leadership heading, to see where yellow starts
  const hist = [...document.querySelectorAll('h1,h2,h3')].find(e=>/Our History/i.test(e.textContent));
  const lead = [...document.querySelectorAll('h1,h2,h3')].find(e=>/Our Leadership and Staff/i.test(e.textContent));
  const histBottom = hist.getBoundingClientRect().bottom + scrollY;
  const leadTop = lead.getBoundingClientRect().top + scrollY;
  // full-bleed sampling: use elementFromPoint at left edge x=5
  const samples = [];
  const startY = Math.round(histBottom);
  const endY = Math.round(leadTop) + 20;
  for (let y = startY; y <= endY; y += 8) {
    // scroll so y is in view
    window.scrollTo(0, y - 300);
    const localY = y - window.scrollY;
    const el = document.elementFromPoint(5, localY);
    let bg = 'none', node = el;
    while (node) { const c = getComputedStyle(node).backgroundColor; if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') { bg = c; break; } node = node.parentElement; }
    samples.push({ y, bg });
  }
  // find first yellow y
  const YEL = (bg) => { const m = bg.match(/rgb\((\d+), (\d+), (\d+)/); return m && +m[1]>240 && +m[2]>220 && +m[2]<250 && +m[3]>160 && +m[3]<210; };
  const firstYellow = samples.find(s => YEL(s.bg));
  return { histBottom: Math.round(histBottom), leadTop: Math.round(leadTop), firstYellowY: firstYellow ? firstYellow.y : null, whiteGapAboveYellow: firstYellow ? firstYellow.y - Math.round(histBottom) : null, sampleCount: samples.length, uniqueBgs: [...new Set(samples.map(s=>s.bg))] };
});
console.log('SOURCE-FLOW', JSON.stringify(d, null, 2));
await browser.close();
