import { chromium } from '@playwright/test';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36';
const browser = await chromium.launch();
const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 700 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto('https://www.ustafoundation.com/en/home/who-we-are.html', { waitUntil: 'load', timeout: 60000 });
try { await page.evaluate(() => document.fonts.ready); } catch (e) {}
await page.waitForTimeout(2500);
// scroll the leadership heading near top, then sample the full-bleed bg color at x=5 across the seam
const info = await page.evaluate(() => {
  const lead = [...document.querySelectorAll('h1,h2,h3')].find(e=>/Our Leadership and Staff/i.test(e.textContent));
  const target = lead.getBoundingClientRect().top + scrollY;
  window.scrollTo(0, target - 400);
  return { scrollY: window.scrollY, leadAbs: target };
});
await page.waitForTimeout(400);
const scan = await page.evaluate(() => {
  const YEL = (bg) => { const m = bg.match(/rgb\((\d+), (\d+), (\d+)/); return m && +m[1]>240 && +m[2]>220 && +m[2]<250 && +m[3]>160 && +m[3]<210; };
  const WHITE = (bg) => /rgb\(255, 255, 255\)/.test(bg);
  const bgAt = (ly) => { let node = document.elementFromPoint(5, ly); while(node){ const c=getComputedStyle(node).backgroundColor; if(c && c!=='rgba(0, 0, 0, 0)' && c!=='transparent') return c; node=node.parentElement; } return 'none'; };
  const rows = [];
  for (let ly=0; ly<700; ly+=3) { rows.push({ absY: ly + window.scrollY, kind: (b=>YEL(b)?'Y':WHITE(b)?'W':'?')(bgAt(ly)) }); }
  // compress into runs
  const runs = [];
  rows.forEach(r => { const last=runs[runs.length-1]; if(last && last.kind===r.kind){ last.end=r.absY; } else runs.push({ kind:r.kind, start:r.absY, end:r.absY }); });
  return runs.map(r=>({ kind:r.kind, from:r.start, to:r.end, h:r.end-r.start }));
});
console.log(JSON.stringify(scan, null, 2));
await browser.close();
