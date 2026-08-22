/**
 * SVG → PNG converter (review / optimization utility).
 *
 * Rasterizes every unique SVG referenced by a migrated .plain.html file into a
 * PNG, rendered by Chromium at 2x for crisp output identical to the live site.
 * PNGs are written to an "images" folder next to the page for review — this
 * script does NOT modify the content file or rewrite any <img src>.
 *
 * When to use: an SVG committed under icons/ (or referenced by a page) is too
 * large or complex to ship as a vector (see the svg-assets skill / AGENTS.md
 * "Asset-Size Rule"). Rasterizing to a 2x PNG is often smaller and renders
 * identically for large decorative/illustrative art. Small UI glyphs should
 * stay as SVG — do NOT convert those.
 *
 * Usage:
 *   node skills/svg-assets/convert-svg-to-png.mjs <path-to.plain.html>
 *   # defaults to content/index.plain.html
 */
import { readFileSync, mkdirSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { chromium } from 'playwright';

function svgPngName(url) {
  const base = url.split('/').pop().replace(/\.svg$/i, '');
  const clean = base.replace(/\.[a-f0-9]{6,}$/i, '');
  return `${clean}.png`;
}

const inputFile = resolve(
  process.argv[2] || 'content/index.plain.html',
);
// PNGs land in an "images" folder next to the migrated page, matching the
// relative ./images/<name>.png path used in DA.
const outDir = join(dirname(inputFile), 'images');
const SCALE = 2;
// Vector images narrower than this are scaled up to it before rasterizing, so
// data-table text stays sharp when displayed near full content width. Icons
// keep their intrinsic size (they're never shown large).
const MIN_RENDER_WIDTH = 1000;

function uniqueSvgUrls(html) {
  const urls = new Set();
  const re = /src="([^"]+\.svg)"/g;
  let m;
  // eslint-disable-next-line no-cond-assign
  while ((m = re.exec(html)) !== null) urls.add(m[1]);
  return [...urls];
}

(async () => {
  const html = readFileSync(inputFile, 'utf-8');
  const urls = uniqueSvgUrls(html);
  if (urls.length === 0) {
    console.log(`No SVG references found in ${inputFile}`);
    return;
  }
  mkdirSync(outDir, { recursive: true });
  console.log(`Converting ${urls.length} unique SVG(s) from ${inputFile}`);

  const browser = await chromium.launch();
  const context = await browser.newContext({ deviceScaleFactor: SCALE });
  const page = await context.newPage();

  const results = [];
  for (const url of urls) {
    const outName = svgPngName(url);
    const outPath = join(outDir, outName);
    try {
      // Load the SVG as an <img> on a transparent page so we can read its
      // intrinsic size and screenshot exactly that box (no clipping/padding).
      // eslint-disable-next-line no-await-in-loop
      await page.setContent(
        `<!doctype html><html><head><style>*{margin:0;padding:0}html,body{background:transparent}</style></head><body><img id="t" src="${url}"></body></html>`,
        { waitUntil: 'networkidle' },
      );
      // eslint-disable-next-line no-await-in-loop
      const dims = await page.evaluate(() => {
        const i = document.getElementById('t');
        return { w: i.naturalWidth, h: i.naturalHeight, ok: i.complete && i.naturalWidth > 0 };
      });
      if (!dims.ok) {
        console.warn(`  ⚠ ${outName}: image failed to load (${url})`);
        results.push({ url, outName, status: 'load-failed' });
        // eslint-disable-next-line no-continue
        continue;
      }
      // Scale wide (landscape) vector images up to MIN_RENDER_WIDTH, preserving
      // aspect, so data-table text stays sharp at full content width. Portrait
      // or square images (icons) keep their intrinsic size.
      const aspect = dims.h / dims.w;
      const isWide = dims.w > dims.h;
      const renderW = isWide && dims.w < MIN_RENDER_WIDTH ? MIN_RENDER_WIDTH : dims.w;
      const renderH = Math.round(renderW * aspect);
      // eslint-disable-next-line no-await-in-loop
      await page.evaluate((w) => {
        const i = document.getElementById('t');
        i.style.width = `${w}px`;
        i.style.height = 'auto';
      }, renderW);
      // eslint-disable-next-line no-await-in-loop
      await page.setViewportSize({
        width: Math.max(1, Math.ceil(renderW)),
        height: Math.max(1, Math.ceil(renderH)),
      });
      const locator = page.locator('#t');
      // eslint-disable-next-line no-await-in-loop
      await locator.screenshot({ path: outPath, omitBackground: true });
      console.log(`  ✓ ${outName}  (intrinsic ${dims.w}×${dims.h} → render ${renderW}×${renderH} @ ${SCALE}x)`);
      results.push({
        url, outName, status: 'ok', width: dims.w, height: dims.h,
      });
    } catch (err) {
      console.warn(`  ⚠ ${outName}: ${err.message}`);
      results.push({ url, outName, status: 'error', error: err.message });
    }
  }

  await browser.close();

  const ok = results.filter((r) => r.status === 'ok').length;
  console.log(`\nDone. ${ok}/${urls.length} converted → ${outDir}`);
  results.forEach((r) => console.log(`  ${r.status.padEnd(12)} ${r.outName}  ←  ${r.url}`));
})();
