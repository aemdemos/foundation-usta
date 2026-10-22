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
  const {
    rootSelector, excludeSelector, includeHidden, withCss,
  } = opts;
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
  // EDS-side code hints: a scoped selector + computed spacing for an element, used to suggest CSS fixes
  const WORD = /^[a-z][\w-]*$/;
  const STATE = /^(active|selected|open|appear|is-|has-)/;
  const sectionSel = (el) => {
    const sec = el.closest('.section');
    if (!sec) return 'main';
    const cls = [...sec.classList].filter((c) => c !== 'section' && !c.endsWith('-container') && WORD.test(c) && !STATE.test(c));
    return `main .section${cls.map((c) => `.${c}`).join('')}`;
  };
  const selectorFor = (el) => {
    const tag = el.tagName.toLowerCase();
    const own = [...el.classList].find((c) => WORD.test(c) && !STATE.test(c));
    const self = `${tag}${own ? `.${own}` : ''}`;
    const block = el.closest('[data-block-name]');
    if (block && block !== el) {
      const name = block.dataset.blockName;
      const parent = el.parentElement;
      const pcls = parent && parent !== block ? [...parent.classList].find((c) => WORD.test(c) && !STATE.test(c)) : null;
      return { sel: `.${name}${pcls ? ` .${pcls}` : ''} ${self}`, block: name };
    }
    if (block === el) return { sel: `.${block.dataset.blockName}`, block: block.dataset.blockName };
    if (el.classList.contains('section')) return { sel: sectionSel(el), block: null };
    const wrap = el.closest('.default-content-wrapper');
    let sel = sectionSel(el);
    if (wrap) sel += el.parentElement === wrap ? ` .default-content-wrapper > ${self}` : ` .default-content-wrapper ${self}`;
    else sel += ` ${self}`;
    return { sel, block: null };
  };
  // the outermost wrapper that occupies the same box (images usually get their margin from a <p>/<picture>)
  const tight = (el) => {
    let cur = el;
    while (cur.parentElement && cur.parentElement !== root) {
      const pe = cur.parentElement;
      if (pe.matches('main, .section, .block, [data-block-name], .default-content-wrapper')) break;
      const pr = pe.getBoundingClientRect();
      const cr = cur.getBoundingClientRect();
      if (Math.abs(pr.height - cr.height) > 4 || Math.abs(pr.top - cr.top) > 4) break;
      cur = pe;
    }
    return cur;
  };
  const px = (v) => Math.round(parseFloat(v) * 10) / 10 || 0;
  const cssOf = (el) => {
    if (!withCss || !el) return undefined;
    const cs = getComputedStyle(el);
    const { sel, block } = selectorFor(el);
    let n = 0;
    try { n = document.querySelectorAll(sel).length; } catch { n = 0; }
    return {
      sel,
      block,
      n,
      mt: px(cs.marginTop),
      mb: px(cs.marginBottom),
      pt: px(cs.paddingTop),
      pb: px(cs.paddingBottom),
      ml: px(cs.marginLeft),
      w: Math.round(el.getBoundingClientRect().width),
      display: cs.display,
    };
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
        blocks.push({
          tag: b.tagName.toLowerCase(), parts: [], nodes: [], el: b,
        });
      }
      blocks[index.get(b)].parts.push(n.nodeValue);
      blocks[index.get(b)].nodes.push(n);
    }
  }
  const textBlocks = blocks
    .map((b) => ({
      tag: b.tag,
      text: clean(b.parts.join('')),
      css: cssOf(b.el),
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
    .map((h) => ({
      level: Number(h.tagName[1]), text: clean(h.textContent), box: toBox(h.getBoundingClientRect()), css: cssOf(h),
    }))
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
        css: cssOf(tight(i)),
      };
    });

  // "bands": wide areas painted with a background colour/image that differs from the page —
  // section backgrounds whose edges matter for spacing (padding / gap after a section)
  const parseColor = (c) => (String(c).match(/[\d.]+/g) || []).map(Number);
  const pageBg = (() => {
    const [r, g, b, a = 1] = parseColor(getComputedStyle(document.body).backgroundColor);
    if (a > 0.1) return `${r},${g},${b}`;
    const [hr, hg, hb, ha = 1] = parseColor(getComputedStyle(document.documentElement).backgroundColor);
    return ha > 0.1 ? `${hr},${hg},${hb}` : '255,255,255';
  })();
  const minBandWidth = Math.min(window.innerWidth, document.documentElement.clientWidth) * 0.4;
  const bands = [];
  const bgImages = [];
  [...root.querySelectorAll('*')].slice(0, 6000).forEach((el) => {
    if (el.closest('[data-cmp-x]')) return;
    const cs = getComputedStyle(el);
    const bg = cs.backgroundImage;
    const m = bg && bg !== 'none' && bg.match(/url\(["']?([^"')]+)["']?\)/);
    if (m && !m[1].startsWith('data:')) bgImages.push(m[1]);
    const [r, g, b, a = 1] = parseColor(cs.backgroundColor);
    const colour = a > 0.1 ? `${r},${g},${b}` : '';
    const painted = (colour && colour !== pageBg) || !!m;
    if (!painted || cs.visibility === 'hidden') return;
    const rect = el.getBoundingClientRect();
    // sections only: big enough, and not a control (a full-width mobile button is not a section)
    if (rect.width < minBandWidth || rect.height < 80 || el.matches('a, button, input, select, textarea, label, .button')) return;
    const box = toBox(rect);
    if (box) bands.push({ box, colour: colour || 'image', el });
  });
  // keep the outermost band of each colour (nested containers often repeat the same background)
  const inside = (p, q) => p.box[0] >= q.box[0] - 2 && p.box[1] >= q.box[1] - 2
    && p.box[0] + p.box[2] <= q.box[0] + q.box[2] + 2 && p.box[1] + p.box[3] <= q.box[1] + q.box[3] + 2;
  const sectionBands = bands.filter((p, i) => !bands.some((q, j) => j !== i && q.colour === p.colour
    && inside(p, q) && (j < i || !inside(q, p))))
    .map(({ box, colour, el }) => ({ box, colour, css: cssOf(el) })); // DOM nodes can't leave the page

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
      bands: sectionBands,
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
    blocks: keep(content.blocks, ['text', 'tag', 'css']),
    headings: keep(content.headings, ['text', 'css']),
    links: keep(content.links, ['text', 'href']),
    images: keep(content.images, ['src', 'alt', 'css']),
    bands: (content.bands || []).slice(0, 200),
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
    viewports, rootSelector, excludeSelector, hideSelector, includeHidden, withCss,
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
      const shown = await page.evaluate(extractContent, {
        rootSelector, excludeSelector, includeHidden, withCss,
      });
      vp.boxes = boxesOf(shown.content);
      // eslint-disable-next-line no-await-in-loop
      vp.typography = await page.evaluate(extractTypography, { rootSelector, excludeSelector });
      if (!result.content) {
        // open accordions so their text is compared too
        // eslint-disable-next-line no-await-in-loop
        await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
        // eslint-disable-next-line no-await-in-loop
        const ex = await page.evaluate(extractContent, { rootSelector, excludeSelector, includeHidden });
        ['blocks', 'headings', 'links', 'images'].forEach((k) => ex.content[k].forEach((x) => { delete x.box; delete x.css; }));
        delete ex.content.bands;
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
 * Runs in a blank page: shift-aware pixel diff of two screenshots.
 * 1. The rows of both shots are aligned top-to-bottom (edit distance over row "signatures" =
 *    luminance per column bin), so content that merely moved up/down doesn't count as different.
 * 2. Pixels are compared at the aligned position; differing 16px cells are grouped into boxes.
 * 3. Rows left unmatched by the alignment are sections missing on EDS / extra on EDS.
 */
async function diffInPage({ thr, fold }) {
  const load = (src) => new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
  const [ia, ib] = await Promise.all([load('/a.png'), load('/b.png')]);
  const w = Math.max(ia.width, ib.width);
  const h = Math.max(ia.height, ib.height);
  const ha = ia.height;
  const hb = ib.height;
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

  // 1. row signatures
  const C = 48;
  const binOf = new Uint8Array(w);
  for (let x = 0; x < w; x += 1) binOf[x] = Math.min(C - 1, Math.floor((x * C) / w));
  const binCount = new Float32Array(C);
  for (let x = 0; x < w; x += 1) binCount[binOf[x]] += 1;
  const signature = (d, H) => {
    const s = new Float32Array(H * C);
    for (let y = 0; y < H; y += 1) {
      const o = y * C;
      for (let x = 0; x < w; x += 1) {
        const k = (y * w + x) * 4;
        s[o + binOf[x]] += 0.3 * d[k] + 0.59 * d[k + 1] + 0.11 * d[k + 2];
      }
      for (let c = 0; c < C; c += 1) s[o + c] /= binCount[c];
    }
    return s;
  };
  const sa = signature(da, ha);
  const sb = signature(db, hb);
  // 2. global row alignment (edit distance on 4px "super-rows", banded): every EDS row is
  //    matched to an original row, or marked as extra; skipped original rows are missing
  const F = 4;
  const na = Math.ceil(ha / F);
  const nb = Math.ceil(hb / F);
  const superSig = (sig, H, n) => {
    const out = new Float32Array(n * C);
    for (let r = 0; r < n; r += 1) {
      const y0 = r * F;
      const y1 = Math.min(H, y0 + F);
      for (let y = y0; y < y1; y += 1) {
        for (let k = 0; k < C; k += 1) out[r * C + k] += sig[y * C + k] / (y1 - y0);
      }
    }
    return out;
  };
  const qa = superSig(sa, ha, na);
  const qb = superSig(sb, hb, nb);
  const match = (j, i) => {
    let c = 0;
    for (let k = 0; k < C; k += 1) c += Math.abs(qb[j * C + k] - qa[i * C + k]);
    return c / C;
  };
  const GAPC = 14; // cost of one unmatched super-row (mean luminance delta that counts as "different")
  const BAND = 300; // max vertical drift, in super-rows (1200px)
  const dmin = Math.min(0, na - nb) - BAND;
  const dmax = Math.max(0, na - nb) + BAND;
  const K = dmax - dmin + 1;
  const cost = new Float32Array((nb + 1) * K).fill(Infinity);
  const back = new Uint8Array((nb + 1) * K); // 1 = match, 2 = EDS row extra, 3 = original row missing
  const at = (j, i) => {
    const d = i - j - dmin;
    return d >= 0 && d < K && i >= 0 && i <= na ? j * K + d : -1;
  };
  for (let j = 0; j <= nb; j += 1) {
    for (let i = Math.max(0, j + dmin); i <= Math.min(na, j + dmax); i += 1) {
      const here = at(j, i);
      if (j === 0 && i === 0) cost[here] = 0;
      else {
        let best = Infinity;
        let how = 0;
        const diag = j > 0 && i > 0 ? at(j - 1, i - 1) : -1;
        if (diag >= 0) { best = cost[diag] + match(j - 1, i - 1); how = 1; }
        const up = j > 0 ? at(j - 1, i) : -1;
        if (up >= 0 && cost[up] + GAPC < best) { best = cost[up] + GAPC; how = 2; }
        const left = i > 0 ? at(j, i - 1) : -1;
        if (left >= 0 && cost[left] + GAPC < best) { best = cost[left] + GAPC; how = 3; }
        cost[here] = best;
        back[here] = how;
      }
    }
  }
  const mapB = new Int32Array(nb).fill(-1); // EDS super-row → original super-row (-1 = extra)
  const missingA = new Uint8Array(na);
  for (let j = nb, i = na; j > 0 || i > 0;) {
    const how = back[at(j, i)];
    if (how === 1) { mapB[j - 1] = i - 1; j -= 1; i -= 1; } else if (how === 2) j -= 1; else { missingA[i - 1] = 1; i -= 1; }
  }
  const srcRowOf = (y) => {
    const j = Math.floor(y / F);
    return j < nb && mapB[j] >= 0 ? mapB[j] * F + (y - j * F) : -1;
  };
  // nearest matched original row at/after (dir=1) or at/before (dir=-1) an EDS row
  const nearestSrc = (y, dir) => {
    for (let j = Math.floor(y / F); j >= 0 && j < nb; j += dir) if (mapB[j] >= 0) return mapB[j] * F;
    return dir > 0 ? ha : 0;
  };

  // 3. aligned pixel diff + heatmap; unaligned diff only for the first screen
  const D = mk(null);
  const heat = D.g.createImageData(w, h);
  const od = heat.data;
  const CELL = 16;
  const gw = Math.ceil(w / CELL);
  const gh = Math.ceil(hb / CELL);
  const cells = new Uint16Array(gw * gh);
  const foldH = Math.min(fold, h);
  let diff = 0;
  let foldDiff = 0;
  for (let y = 0; y < h; y += 1) {
    const ya = y < hb ? srcRowOf(y) : -1;
    const extraRow = y < hb && ya < 0;
    const outside = y >= hb || ya < 0 || ya >= ha;
    for (let x = 0; x < w; x += 1) {
      const kb = (y * w + x) * 4;
      let hot = outside;
      if (!outside) {
        // tolerate 1–3px drift (line-height / sub-pixel differences): a pixel only differs
        // if no original pixel within ±3px vertically and ±1px horizontally matches it
        hot = true;
        for (let dy = 0; dy <= 6 && hot; dy += 1) {
          const yy = ya + (dy % 2 ? -(dy + 1) / 2 : dy / 2);
          if (yy >= 0 && yy < ha) {
            for (let dx = -1; dx <= 1 && hot; dx += 1) {
              const xx = x + dx;
              if (xx >= 0 && xx < w) {
                const ka = (yy * w + xx) * 4;
                if (Math.max(Math.abs(da[ka] - db[kb]), Math.abs(da[ka + 1] - db[kb + 1]), Math.abs(da[ka + 2] - db[kb + 2])) <= thr) hot = false;
              }
            }
          }
        }
      }
      if (y < foldH) {
        const raw = y >= ha || y >= hb || Math.max(Math.abs(da[kb] - db[kb]), Math.abs(da[kb + 1] - db[kb + 1]), Math.abs(da[kb + 2] - db[kb + 2])) > thr;
        if (raw) foldDiff += 1;
      }
      if (extraRow) {
        od[kb] = 60; od[kb + 1] = 110; od[kb + 2] = 230; od[kb + 3] = 255;
      } else if (hot) {
        od[kb] = 255; od[kb + 1] = 0; od[kb + 2] = 60; od[kb + 3] = 255;
        if (y < hb && !extraRow) {
          diff += 1;
          cells[Math.floor(y / CELL) * gw + Math.floor(x / CELL)] += 1;
        }
      } else {
        const grey = 0.3 * db[kb] + 0.59 * db[kb + 1] + 0.11 * db[kb + 2];
        const v = 255 - (255 - grey) * 0.25;
        od[kb] = v; od[kb + 1] = v; od[kb + 2] = v; od[kb + 3] = 255;
      }
    }
  }
  D.g.putImageData(heat, 0, 0);

  // 4. group differing cells into boxes (dilate 1 cell, connected components, merge neighbours)
  const HOT = CELL * CELL * 0.06;
  const isHot = (i) => cells[i] > HOT;
  const near = new Uint8Array(gw * gh);
  for (let gy = 0; gy < gh; gy += 1) {
    for (let gx = 0; gx < gw; gx += 1) {
      if (isHot(gy * gw + gx)) {
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            const ny = gy + dy;
            const nx = gx + dx;
            if (ny >= 0 && ny < gh && nx >= 0 && nx < gw) near[ny * gw + nx] = 1;
          }
        }
      }
    }
  }
  const seen = new Uint8Array(gw * gh);
  let boxes = [];
  for (let i = 0; i < gw * gh; i += 1) {
    if (near[i] && !seen[i]) {
      const stack = [i];
      seen[i] = 1;
      let x0 = Infinity; let y0 = Infinity; let x1 = -1; let y1 = -1; let px = 0;
      while (stack.length) {
        const j = stack.pop();
        const gx = j % gw;
        const gy = (j - gx) / gw;
        if (isHot(j)) {
          px += cells[j];
          x0 = Math.min(x0, gx); y0 = Math.min(y0, gy); x1 = Math.max(x1, gx); y1 = Math.max(y1, gy);
        }
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
          const nx = gx + dx;
          const ny = gy + dy;
          const n = ny * gw + nx;
          if (nx >= 0 && nx < gw && ny >= 0 && ny < gh && near[n] && !seen[n]) { seen[n] = 1; stack.push(n); }
        });
      }
      if (x1 >= 0) boxes.push({
        x0, y0, x1, y1, px,
      });
    }
  }
  // merge boxes that overlap or sit within 2 cells of each other
  let merged = true;
  while (merged) {
    merged = false;
    for (let i = 0; i < boxes.length && !merged; i += 1) {
      for (let j = i + 1; j < boxes.length && !merged; j += 1) {
        const p = boxes[i];
        const q = boxes[j];
        if (p.x0 - 2 <= q.x1 && q.x0 - 2 <= p.x1 && p.y0 - 2 <= q.y1 && q.y0 - 2 <= p.y1) {
          boxes[i] = {
            x0: Math.min(p.x0, q.x0), y0: Math.min(p.y0, q.y0), x1: Math.max(p.x1, q.x1), y1: Math.max(p.y1, q.y1), px: p.px + q.px,
          };
          boxes.splice(j, 1);
          merged = true;
        }
      }
    }
  }
  const toSrc = (y, bh) => {
    const top = nearestSrc(y, 1);
    const bottom = Math.max(top + 4, nearestSrc(y + bh - 1, -1) + F);
    return [Math.min(top, ha - 4), Math.min(ha, bottom) - Math.min(top, ha - 4)];
  };
  boxes = boxes
    .map((b) => {
      const x = b.x0 * CELL;
      const y = b.y0 * CELL;
      const bw = Math.min(w, (b.x1 + 1) * CELL) - x;
      const bh = Math.min(hb, (b.y1 + 1) * CELL) - y;
      const [sy, sh] = toSrc(y, bh);
      return {
        kind: 'visual', eds: [x, y, bw, bh], src: [x, sy, bw, sh], ratio: b.px / (bw * bh), px: b.px,
      };
    })
    .filter((b) => b.px >= 150 && b.eds[2] * b.eds[3] >= 576);

  // 5. runs of unmatched rows = sections missing on / added to EDS
  const GAP = 40;
  const flatRows = (sig, y0, y1) => {
    let lo = Infinity;
    let hi = -Infinity;
    for (let y = y0; y < y1; y += 2) {
      for (let k = 0; k < C; k += 1) {
        const v = sig[y * C + k];
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    return hi - lo < 12;
  };
  const gaps = [];
  for (let i = 0; i < na;) {
    if (!missingA[i]) { i += 1; } else {
      let e = i;
      while (e < na && missingA[e]) e += 1;
      const y0 = i * F;
      const y1 = Math.min(ha, e * F);
      if (y1 - y0 >= GAP) {
        // where that content would sit on EDS: the EDS row matched just before it
        let jb = 0;
        for (let j = 0; j < nb; j += 1) if (mapB[j] >= 0 && mapB[j] < i) jb = j + 1;
        gaps.push({
          kind: flatRows(sa, y0, y1) ? 'spacing-missing' : 'missing', src: [0, y0, w, y1 - y0], eds: [0, Math.max(0, jb * F - 2), w, 4],
        });
      }
      i = e;
    }
  }
  for (let j = 0; j < nb;) {
    if (mapB[j] >= 0) { j += 1; } else {
      let e = j;
      while (e < nb && mapB[e] < 0) e += 1;
      const y0 = j * F;
      const y1 = Math.min(hb, e * F);
      if (y1 - y0 >= GAP) {
        const ia2 = j > 0 ? nearestSrc(y0 - 1, -1) + F : 0;
        gaps.push({
          kind: flatRows(sb, y0, y1) ? 'spacing-extra' : 'extra', eds: [0, y0, w, y1 - y0], src: [0, Math.max(0, Math.min(ha, ia2) - 2), w, 4],
        });
      }
      j = e;
    }
  }

  const areas = [...gaps, ...boxes.sort((p, q) => q.px - p.px).slice(0, 40)];
  const jpg = (c) => c.toDataURL('image/jpeg', 0.78).split(',')[1];
  return {
    width: w,
    height: h,
    mismatch: diff / (w * hb),
    foldMismatch: foldDiff / (w * foldH),
    areas,
    a: jpg(A.c),
    b: jpg(B.c),
    d: jpg(D.c),
  };
}

/**
 * Diff two PNG buffers in a headless canvas. Returns mismatch ratios, the boxed areas that
 * differ (with positions on both shots), and JPEG renders of both shots + a heatmap.
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
  const out = await page.evaluate(diffInPage, { thr: threshold, fold: foldHeight });
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
