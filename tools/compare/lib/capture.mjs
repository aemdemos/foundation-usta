/**
 * Browser-side capture for the parity checker: loads a URL at each viewport,
 * screenshots it, and extracts content / typography / layout / network signals.
 * Also hosts the canvas-based pixel diff (no image libraries needed).
 */
import { chromium } from '@playwright/test';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/138.0 Safari/537.36';
const MAX_SHOT_HEIGHT = 16000;

/** Launch Chromium; fall back to any locally installed Playwright/Chrome build. */
export async function launchBrowser() {
  try {
    return await chromium.launch();
  } catch (err) {
    const candidates = [];
    if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
    const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, '/ms-playwright',
      path.join(os.homedir(), '.cache/ms-playwright'),
      path.join(os.homedir(), 'Library/Caches/ms-playwright')].filter(Boolean);
    roots.filter(existsSync).forEach((root) => {
      readdirSync(root).filter((d) => /^chromium/.test(d)).sort().reverse().forEach((d) => {
        ['chrome-linux64/chrome', 'chrome-linux/chrome',
          'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
          'chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium',
          'chrome-headless-shell-linux64/chrome-headless-shell',
          'chrome-win/chrome.exe', 'chrome-win64/chrome.exe']
          .map((p) => path.join(root, d, p)).filter(existsSync).forEach((p) => candidates.push(p));
      });
    });
    for (const executablePath of candidates) {
      try {
        // eslint-disable-next-line no-await-in-loop
        return await chromium.launch({ executablePath });
      } catch { /* try next */ }
    }
    try {
      return await chromium.launch({ channel: 'chrome' });
    } catch {
      throw new Error(`Could not launch Chromium (${err.message.split('\n')[0]}). Run "npx playwright install chromium" or set CHROME_PATH.`);
    }
  }
}

/* ------------------------------------------------------------ in-page code */

/** Runs in the page: extract comparable content from the content root. */
function extractContent(opts) {
  const { rootSelector, excludeSelector, includeHidden } = opts;
  const root = (rootSelector && document.querySelector(rootSelector))
    || document.querySelector('main') || document.body;
  if (excludeSelector) {
    try {
      document.querySelectorAll(excludeSelector).forEach((el) => {
        if (!el.contains(root)) el.setAttribute('data-cmp-x', '');
      });
    } catch { /* invalid selector — ignore */ }
  }
  const SKIP = 'script,style,noscript,template,svg,iframe,canvas,select,option,[data-cmp-x]';
  const visible = (el) => includeHidden || el.checkVisibility({ checkVisibilityCSS: true });
  const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const displayCache = new Map();
  const isInline = (el) => {
    if (!displayCache.has(el)) {
      const d = getComputedStyle(el).display;
      displayCache.set(el, d === 'inline' || d === 'contents');
    }
    return displayCache.get(el);
  };
  // document-space box [x, y, w, h] (matches the full-page screenshot), null when not rendered
  const toBox = (r) => (r && r.width >= 1 && r.height >= 1
    ? [Math.round(r.left + window.scrollX), Math.round(r.top + window.scrollY), Math.round(r.width), Math.round(r.height)]
    : null);
  const unionBox = (rects) => {
    const rs = rects.filter((r) => r.width >= 1 && r.height >= 1);
    if (!rs.length) return null;
    const l = Math.min(...rs.map((r) => r.left));
    const t = Math.min(...rs.map((r) => r.top));
    return toBox({
      left: l, top: t, width: Math.max(...rs.map((r) => r.right)) - l, height: Math.max(...rs.map((r) => r.bottom)) - t,
    });
  };
  const blockOf = (el) => {
    let cur = el;
    while (cur && cur !== root && isInline(cur)) cur = cur.parentElement;
    return cur || root;
  };

  // text blocks, in document order
  const blocks = [];
  const index = new Map();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let wordCount = 0;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const p = n.parentElement;
    if (n.nodeValue.trim() && p && !p.closest(SKIP) && visible(p)) {
      const b = blockOf(p);
      if (!index.has(b)) {
        index.set(b, blocks.length);
        blocks.push({ tag: b.tagName.toLowerCase(), parts: [], nodes: [] });
      }
      blocks[index.get(b)].parts.push(n.nodeValue);
      blocks[index.get(b)].nodes.push(n);
    }
  }
  const textBlocks = blocks
    .map((b) => ({
      tag: b.tag,
      text: clean(b.parts.join('')),
      box: unionBox(b.nodes.map((n) => {
        const range = document.createRange();
        range.selectNodeContents(n);
        return range.getBoundingClientRect();
      })),
    }))
    .filter((b) => b.text);
  textBlocks.forEach((b) => { wordCount += b.text.split(' ').length; });

  const inScope = (el) => !el.closest('[data-cmp-x]') && visible(el);
  const headings = [...root.querySelectorAll('h1,h2,h3,h4,h5,h6')]
    .filter(inScope)
    .map((h) => ({ level: Number(h.tagName[1]), text: clean(h.textContent), box: toBox(h.getBoundingClientRect()) }))
    .filter((h) => h.text);

  const links = [...root.querySelectorAll('a[href]')]
    .filter((a) => !a.closest('[data-cmp-x]') && (includeHidden || a.checkVisibility({ checkVisibilityCSS: true })))
    .map((a) => ({
      text: clean(a.textContent) || clean(a.getAttribute('aria-label')) || clean(a.getAttribute('title'))
        || clean([...a.querySelectorAll('img[alt]')].map((i) => i.alt).join(' ')),
      href: a.href,
      target: a.target || '',
      box: unionBox([...a.getClientRects()]) || toBox(a.getBoundingClientRect()),
    }));

  const images = [...root.querySelectorAll('img')]
    .filter((i) => !i.closest('[data-cmp-x]'))
    .map((i) => {
      const r = i.getBoundingClientRect();
      return {
        src: i.currentSrc || i.src,
        alt: i.hasAttribute('alt') ? i.getAttribute('alt') : null,
        w: Math.round(r.width),
        h: Math.round(r.height),
        nw: i.naturalWidth,
        nh: i.naturalHeight,
        loaded: i.complete && i.naturalWidth > 0,
        visible: i.checkVisibility({ checkVisibilityCSS: true }),
        box: toBox(r),
      };
    });

  const bgImages = [];
  [...root.querySelectorAll('*')].slice(0, 6000).forEach((el) => {
    if (el.closest('[data-cmp-x]')) return;
    const bg = getComputedStyle(el).backgroundImage;
    const m = bg && bg !== 'none' && bg.match(/url\(["']?([^"')]+)["']?\)/);
    if (m && !m[1].startsWith('data:')) bgImages.push(m[1]);
  });

  const embeds = [...root.querySelectorAll('iframe[src], video, embed[src], object[data]')]
    .filter((e) => !e.closest('[data-cmp-x]'))
    .map((e) => ({
      tag: e.tagName.toLowerCase(),
      src: e.src || e.currentSrc || e.querySelector('source')?.src || e.getAttribute('data') || '',
    }))
    .filter((e) => e.src && !/about:blank|doubleclick|googletagmanager|demdex|facebook\.com\/tr/.test(e.src));

  const meta = {};
  const m = (sel) => document.querySelector(sel)?.getAttribute('content') || '';
  meta.title = document.title;
  meta.description = m('meta[name="description"]');
  ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'].forEach((p) => { meta[p] = m(`meta[property="${p}"]`); });
  ['twitter:card', 'twitter:title', 'twitter:description'].forEach((p) => { meta[p] = m(`meta[name="${p}"]`); });
  meta.robots = m('meta[name="robots"]');
  meta.keywords = m('meta[name="keywords"]');
  meta.canonical = document.querySelector('link[rel="canonical"]')?.href || '';
  meta.lang = document.documentElement.lang || '';
  meta.jsonLd = String(document.querySelectorAll('script[type="application/ld+json"]').length || '');
  meta.favicon = document.querySelector('link[rel~="icon"]')?.href || '';

  return {
    rootSelector: root === document.body ? 'body' : (rootSelector || root.tagName.toLowerCase()),
    content: {
      blocks: textBlocks,
      headings,
      links,
      images,
      bgImages: [...new Set(bgImages)],
      embeds,
      forms: root.querySelectorAll('form').length,
      wordCount,
    },
    meta,
  };
}

/** Runs in the page: computed type styles of the first visible sample per selector. */
function extractTypography(opts) {
  const root = (opts.rootSelector && document.querySelector(opts.rootSelector))
    || document.querySelector('main') || document.body;
  if (opts.excludeSelector) {
    try {
      document.querySelectorAll(opts.excludeSelector).forEach((el) => {
        if (!el.contains(root)) el.setAttribute('data-cmp-x', '');
      });
    } catch { /* invalid selector — ignore */ }
  }
  const out = {};
  const pick = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'color', 'letterSpacing', 'textTransform'];
  ['body', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a', 'li'].forEach((sel) => {
    const el = sel === 'body' ? document.body : [...root.querySelectorAll(sel)].find((e) => !e.closest('[data-cmp-x]')
      && e.textContent.trim() && e.checkVisibility({ checkVisibilityCSS: true }));
    if (!el) return;
    const cs = getComputedStyle(el);
    out[sel] = Object.fromEntries(pick.map((p) => [p, cs[p]]));
    out[sel].sample = sel === 'body' ? '' : el.textContent.replace(/\s+/g, ' ').trim().slice(0, 80);
  });
  return out;
}

/* ------------------------------------------------------------ node side */

/** Keep only what's needed to locate items on a screenshot. */
function boxesOf(content) {
  const keep = (list, fields) => list.filter((x) => x.box)
    .map((x) => Object.fromEntries([...fields, 'box'].map((f) => [f, x[f]])));
  return {
    blocks: keep(content.blocks, ['text', 'tag']),
    headings: keep(content.headings, ['text']),
    links: keep(content.links, ['text', 'href']),
    images: keep(content.images, ['src', 'alt']),
  };
}

async function settle(page, { hideSelector }) {
  await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.addStyleTag({
    content: `*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;
      transition-duration:0s!important;transition-delay:0s!important;caret-color:transparent!important}
      ${hideSelector ? `${hideSelector}{display:none!important}` : ''}`,
  }).catch(() => {});
  // scroll through the page to trigger lazy-loaded images / blocks / footer
  await page.evaluate(async () => {
    const step = Math.max(300, Math.floor(window.innerHeight * 0.8));
    for (let i = 0, y = 0; i < 80 && y < document.documentElement.scrollHeight; i += 1, y += step) {
      window.scrollTo(0, y);
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => { setTimeout(r, 120); });
    }
    window.scrollTo(0, 0);
  }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
  await page.evaluate(() => Promise.all([...document.images]
    .filter((i) => !i.complete)
    .map((i) => new Promise((r) => { i.addEventListener('load', r); i.addEventListener('error', r); setTimeout(r, 4000); })))).catch(() => {});
  await page.waitForTimeout(600);
}

/**
 * Capture one URL at the given viewports.
 * @returns {Promise<object>} capture object consumed by compare.mjs
 */
export async function capturePage(browser, url, opts, onStep = () => {}) {
  const {
    viewports, rootSelector, excludeSelector, hideSelector, includeHidden,
  } = opts;
  const result = {
    url, finalUrl: url, status: null, viewports: {}, content: null, meta: {}, network: { failed: [], console: [] },
  };
  const origin = (() => { try { return new URL(url).hostname; } catch { return ''; } })();
  const failed = new Map();
  const consoleErrors = new Set();
  const sorted = [...viewports].sort((a, b) => b - a); // content extracted at the widest
  for (const vw of sorted) {
    onStep(`${vw}px`);
    const vh = vw < 768 ? 812 : 900;
    // eslint-disable-next-line no-await-in-loop
    const ctx = await browser.newContext({
      viewport: { width: vw, height: vh },
      userAgent: UA,
      deviceScaleFactor: 1,
      ignoreHTTPSErrors: true,
    });
    // eslint-disable-next-line no-await-in-loop
    const page = await ctx.newPage();
    page.on('response', (res) => {
      if (res.status() >= 400) {
        const u = res.url();
        failed.set(u, { url: u, status: res.status(), sameSite: (() => { try { return new URL(u).hostname === origin; } catch { return false; } })() });
      }
    });
    page.on('requestfailed', (req) => {
      const err = req.failure()?.errorText || 'failed';
      if (/ERR_ABORTED|NS_BINDING_ABORTED/.test(err)) return;
      const u = req.url();
      failed.set(u, { url: u, error: err, sameSite: (() => { try { return new URL(u).hostname === origin; } catch { return false; } })() });
    });
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.add(msg.text().slice(0, 400)); });
    page.on('pageerror', (e) => consoleErrors.add(String(e.message || e).slice(0, 400)));
    const vp = { width: vw };
    try {
      // eslint-disable-next-line no-await-in-loop
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      result.status = result.status ?? resp?.status() ?? null;
      result.finalUrl = page.url();
      // eslint-disable-next-line no-await-in-loop
      await settle(page, { hideSelector });
      // eslint-disable-next-line no-await-in-loop
      vp.layout = await page.evaluate(() => ({
        scrollHeight: document.documentElement.scrollHeight,
        overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      }));
      const height = Math.min(vp.layout.scrollHeight, MAX_SHOT_HEIGHT);
      // eslint-disable-next-line no-await-in-loop
      const png = await page.screenshot({
        fullPage: true, clip: { x: 0, y: 0, width: vw, height }, animations: 'disabled', timeout: 60000,
      });
      vp.png = png;
      vp.viewportHeight = vh;
      vp.truncated = vp.layout.scrollHeight > MAX_SHOT_HEIGHT;
      vp.shotHeight = height;
      // element positions as they appear in this screenshot, used to mark changes on it
      // eslint-disable-next-line no-await-in-loop
      const shown = await page.evaluate(extractContent, { rootSelector, excludeSelector, includeHidden });
      vp.boxes = boxesOf(shown.content);
      // eslint-disable-next-line no-await-in-loop
      vp.typography = await page.evaluate(extractTypography, { rootSelector, excludeSelector });
      if (!result.content) {
        // open accordions so their text is compared too
        // eslint-disable-next-line no-await-in-loop
        await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
        // eslint-disable-next-line no-await-in-loop
        const ex = await page.evaluate(extractContent, { rootSelector, excludeSelector, includeHidden });
        ['blocks', 'headings', 'links', 'images'].forEach((k) => ex.content[k].forEach((x) => { delete x.box; }));
        result.content = ex.content;
        result.meta = ex.meta;
        result.contentRoot = ex.rootSelector;
      }
    } catch (err) {
      vp.error = err.message.split('\n')[0];
    }
    result.viewports[vw] = vp;
    // eslint-disable-next-line no-await-in-loop
    await ctx.close();
  }
  if (!result.content) {
    result.content = {
      blocks: [], headings: [], links: [], images: [], bgImages: [], embeds: [], forms: 0, wordCount: 0,
    };
  }
  result.network.failed = [...failed.values()].slice(0, 200);
  result.network.console = [...consoleErrors].slice(0, 100);
  return result;
}

/* ------------------------------------------------------------ pixel diff */

/**
 * Diff two PNG buffers in a headless canvas. Returns mismatch ratios, the
 * vertical regions that differ, and JPEG renders of both shots + the diff.
 */
export async function diffImages(browser, pngA, pngB, { threshold = 40, foldHeight = 900 } = {}) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.route('http://diff.local/**', (route) => {
    const p = new URL(route.request().url()).pathname;
    if (p === '/a.png') return route.fulfill({ body: pngA, contentType: 'image/png' });
    if (p === '/b.png') return route.fulfill({ body: pngB, contentType: 'image/png' });
    return route.fulfill({ body: '<!doctype html><title>diff</title>', contentType: 'text/html' });
  });
  await page.goto('http://diff.local/');
  const out = await page.evaluate(async ({ thr, fold }) => {
    const load = (src) => new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = src;
    });
    const [ia, ib] = await Promise.all([load('/a.png'), load('/b.png')]);
    const w = Math.max(ia.width, ib.width);
    const h = Math.max(ia.height, ib.height);
    const mk = (img) => {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
      if (img) g.drawImage(img, 0, 0);
      return { c, g };
    };
    const A = mk(ia);
    const B = mk(ib);
    const da = A.g.getImageData(0, 0, w, h).data;
    const db = B.g.getImageData(0, 0, w, h).data;
    const D = mk(null);
    const out2 = D.g.createImageData(w, h);
    const od = out2.data;
    const rows = new Uint32Array(h);
    let diff = 0;
    let foldDiff = 0;
    const foldH = Math.min(fold, h);
    for (let y = 0; y < h; y += 1) {
      const outside = y >= ia.height || y >= ib.height;
      for (let x = 0; x < w; x += 1) {
        const k = (y * w + x) * 4;
        const delta = outside ? 255 : Math.max(
          Math.abs(da[k] - db[k]),
          Math.abs(da[k + 1] - db[k + 1]),
          Math.abs(da[k + 2] - db[k + 2]),
        );
        if (delta > thr) {
          od[k] = 255; od[k + 1] = 0; od[k + 2] = 60; od[k + 3] = 255;
          diff += 1;
          rows[y] += 1;
          if (y < foldH) foldDiff += 1;
        } else {
          const grey = 0.3 * db[k] + 0.59 * db[k + 1] + 0.11 * db[k + 2];
          const v = 255 - (255 - grey) * 0.25;
          od[k] = v; od[k + 1] = v; od[k + 2] = v; od[k + 3] = 255;
        }
      }
    }
    D.g.putImageData(out2, 0, 0);
    // vertical regions where >3% of a row differs
    const regions = [];
    let start = -1;
    let gap = 0;
    for (let y = 0; y < h; y += 1) {
      const hot = rows[y] / w > 0.03;
      if (hot) {
        if (start < 0) start = y;
        gap = 0;
      } else if (start >= 0) {
        gap += 1;
        if (gap > 30) {
          if (y - gap - start > 8) regions.push({ y: start, h: y - gap - start });
          start = -1; gap = 0;
        }
      }
    }
    if (start >= 0) regions.push({ y: start, h: h - start });
    const jpg = (c) => c.toDataURL('image/jpeg', 0.78).split(',')[1];
    return {
      width: w,
      height: h,
      mismatch: diff / (w * h),
      foldMismatch: foldDiff / (w * foldH),
      regions: regions.slice(0, 50),
      a: jpg(A.c),
      b: jpg(B.c),
      d: jpg(D.c),
    };
  }, { thr: threshold, fold: foldHeight });
  await ctx.close();
  return {
    ...out,
    a: Buffer.from(out.a, 'base64'),
    b: Buffer.from(out.b, 'base64'),
    d: Buffer.from(out.d, 'base64'),
  };
}

/* ------------------------------------------------------------ link status */

export async function checkLinks(urls, { concurrency = 8, timeout = 12000, isInternal = () => false } = {}) {
  const queue = [...new Set(urls)].filter((u) => /^https?:/.test(u)).map((u) => u.split('#')[0]);
  const unique = [...new Set(queue)];
  const results = [];
  const check = async (url) => {
    const go = async (method) => {
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), timeout);
      try {
        const res = await fetch(url, {
          method, redirect: 'follow', signal: ac.signal, headers: { 'User-Agent': UA, ...(method === 'GET' ? { Range: 'bytes=0-1024' } : {}) },
        });
        return res.status;
      } finally { clearTimeout(t); }
    };
    let status = 0;
    let error = '';
    try {
      status = await go('HEAD');
      if (status >= 400) status = await go('GET');
    } catch (e) {
      try { status = await go('GET'); } catch (e2) { error = e2.name === 'AbortError' ? 'timeout' : (e2.cause?.code || e2.message); }
      if (!error && !status) error = e.message;
    }
    results.push({
      url, status, error, ok: status > 0 && status < 400, internal: isInternal(url),
    });
  };
  let i = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (i < unique.length) {
      const u = unique[i];
      i += 1;
      // eslint-disable-next-line no-await-in-loop
      await check(u);
    }
  });
  await Promise.all(workers);
  return results;
}
