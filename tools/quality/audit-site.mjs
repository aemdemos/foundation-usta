#!/usr/bin/env node
/**
 * Full-site audit for the EDS migration.
 *  1. LINKS: fetch each EDS page (JS-rendered), extract every <a href>, HTTP-check
 *     (HEAD→GET fallback) with dedup + concurrency. Flags 4xx/5xx and un-localized
 *     source-domain PDF/doc links.
 *  2. BREADCRUMBS: capture the EDS breadcrumb trail AND the matching source page's
 *     trail, compare, and flag mismatches.
 *
 * Reads the EDS live sitemap for the authoritative page list; maps each EDS URL to
 * its source URL (host swap + `.html`). Writes JSON results to tools/quality/audit/.
 *
 * Usage:
 *   node tools/quality/audit-site.mjs                 # all pages
 *   node tools/quality/audit-site.mjs --limit 5       # first N pages (smoke test)
 *   node tools/quality/audit-site.mjs --only who-we-are/financials  # substring filter
 *   node tools/quality/audit-site.mjs --links-only | --bc-only
 */
import { chromium } from '@playwright/test';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const EDS = 'https://main--foundation-usta--aemdemos.aem.live';
const SRC = 'https://www.ustafoundation.com';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const OUT = path.join(process.cwd(), 'tools/quality/audit');
const DOC_EXT = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'rtf'];

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const val = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const LIMIT = val('--limit') ? parseInt(val('--limit'), 10) : Infinity;
const ONLY = val('--only');
const LINKS_ONLY = flag('--links-only');
const BC_ONLY = flag('--bc-only');

/** Map an EDS URL → its source URL (host swap, add .html unless it's a doc/asset). */
function toSource(edsUrl) {
  const u = new URL(edsUrl);
  let p = u.pathname;
  if (!/\.[a-z0-9]{2,5}$/i.test(p)) p += '.html';
  return SRC + p;
}

/** Read the EDS sitemap for the page list. */
async function getPages() {
  const res = await fetch(`${EDS}/sitemap.xml`, { headers: { 'User-Agent': UA } });
  const xml = await res.text();
  let locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  // drop nav/footer fragments — not real pages
  locs = locs.filter((u) => !/\/(nav|footer)$/.test(u));
  if (ONLY) locs = locs.filter((u) => u.includes(ONLY));
  return locs.slice(0, LIMIT);
}

/** Extract links + breadcrumb from a rendered page. */
async function scrapePage(ctx, url, { source = false } = {}) {
  const page = await ctx.newPage();
  const result = { url, ok: true, links: [], bc: null, error: null };
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    result.status = resp ? resp.status() : null;
    // give client-side breadcrumb + lazy content time
    await page.waitForTimeout(source ? 1500 : 2200);
    const data = await page.evaluate(() => {
      const out = { links: [], bc: null };
      // links
      document.querySelectorAll('a[href]').forEach((a) => {
        const href = a.getAttribute('href');
        if (href) out.links.push(href);
      });
      // EDS breadcrumb
      const edsBc = document.querySelector('nav.nav-breadcrumb ol');
      if (edsBc) {
        out.bc = [...edsBc.querySelectorAll('li')].map((li) => li.textContent.replace(/\s+/g, ' ').trim());
      } else {
        // source breadcrumb (AEM cmp-breadcrumb): one entry per navigation-item li
        const srcBc = document.querySelector('.cmp-breadcrumb__navigation, .breadcrumb nav ol, [class*="breadcrumb" i] ol');
        if (srcBc) {
          out.bc = [...srcBc.querySelectorAll('li')]
            .map((li) => li.textContent.replace(/\s+/g, ' ').replace(/[>›»]/g, '').trim())
            .filter(Boolean);
        }
      }
      return out;
    });
    result.links = data.links;
    result.bc = data.bc;
  } catch (e) {
    result.ok = false;
    result.error = e.message;
  } finally {
    await page.close();
  }
  return result;
}

/** Resolve a possibly-relative href to absolute against its page. */
function absolutize(href, pageUrl) {
  try { return new URL(href, pageUrl).href; } catch { return null; }
}

/** Classify a link for checking. */
function classify(abs) {
  if (!abs) return { skip: true };
  let u;
  try { u = new URL(abs); } catch { return { skip: true }; }
  if (!/^https?:$/.test(u.protocol)) return { skip: true }; // mailto, tel, javascript
  const ext = u.pathname.split('.').pop().toLowerCase();
  const isDoc = DOC_EXT.includes(ext);
  const isSourceDomain = /(^|\.)ustafoundation\.com$/.test(u.hostname);
  return { skip: false, isDoc, isSourceDomain, ext };
}

/** HTTP-check a URL: HEAD, fall back to ranged GET (many CDNs 405 HEAD). */
async function checkUrl(url) {
  const opt = { headers: { 'User-Agent': UA }, redirect: 'follow' };
  try {
    let r = await fetch(url, { ...opt, method: 'HEAD' });
    if (r.status === 405 || r.status === 501 || r.status === 403) {
      r = await fetch(url, { ...opt, method: 'GET', headers: { ...opt.headers, Range: 'bytes=0-0' } });
    }
    return { url, status: r.status, ct: (r.headers.get('content-type') || '').split(';')[0] };
  } catch (e) {
    return { url, status: 0, error: e.message };
  }
}

/** Simple concurrency pool. */
async function pool(items, n, fn) {
  const out = [];
  let i = 0;
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) {
      const idx = i; i += 1;
      out[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const pages = await getPages();
  console.log(`Auditing ${pages.length} EDS pages…`);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 1000 } });

  const pageResults = [];
  // scrape EDS pages (and, for breadcrumbs, the matching source) — sequential-ish
  // via a small pool to avoid hammering.
  await pool(pages, 4, async (edsUrl, idx) => {
    const eds = LINKS_ONLY || !BC_ONLY ? await scrapePage(ctx, edsUrl) : { url: edsUrl, links: [], bc: null };
    let src = null;
    if (!LINKS_ONLY) {
      src = await scrapePage(ctx, toSource(edsUrl), { source: true });
    }
    pageResults.push({ edsUrl, eds, srcUrl: src?.url, src });
    console.log(`  [${idx + 1}/${pages.length}] ${edsUrl.replace(EDS, '')}  links=${eds.links?.length ?? 0} bc=${(eds.bc || []).join(' > ') || '—'}`);
  });

  await browser.close();

  // ---- LINK CHECK ----
  // Build a global set of unique absolute links, remembering which pages use each.
  const linkPages = new Map(); // abs → Set(pagePath)
  for (const pr of pageResults) {
    for (const href of pr.eds.links || []) {
      const abs = absolutize(href, pr.edsUrl);
      const c = classify(abs);
      if (c.skip) continue;
      if (!linkPages.has(abs)) linkPages.set(abs, new Set());
      linkPages.get(abs).add(pr.edsUrl.replace(EDS, '') || '/');
    }
  }
  const uniqueLinks = [...linkPages.keys()];
  console.log(`\nChecking ${uniqueLinks.length} unique links…`);
  const checks = await pool(uniqueLinks, 12, checkUrl);
  const byUrl = new Map(checks.map((c) => [c.url, c]));

  // Collect the set of links present on the SOURCE pages (absolute), to mark
  // broken links that pre-exist on source (not introduced by the migration).
  const srcLinkSet = new Set();
  for (const pr of pageResults) {
    if (!pr.src?.links) continue;
    for (const href of pr.src.links) {
      const abs = absolutize(href, pr.srcUrl);
      if (abs) srcLinkSet.add(abs);
    }
  }

  const broken = [];
  const sourceDocs = [];
  for (const url of uniqueLinks) {
    const c = classify(url);
    const chk = byUrl.get(url);
    const pagesUsing = [...linkPages.get(url)];
    const isInternal = url.startsWith(EDS);
    if (chk.status === 0 || chk.status >= 400) {
      broken.push({
        url, status: chk.status, error: chk.error, ext: c.ext, pages: pagesUsing,
        internal: isInternal, onSource: srcLinkSet.has(url),
      });
    }
    if (c.isSourceDomain && c.isDoc) {
      sourceDocs.push({ url, status: chk.status, pages: pagesUsing });
    }
  }
  // Sort broken: internal first (real problems), then external.
  broken.sort((a, b) => (b.internal - a.internal) || (a.status - b.status));

  // ---- BREADCRUMB COMPARE ----
  const bcRows = [];
  if (!LINKS_ONLY) {
    for (const pr of pageResults) {
      const eds = pr.eds.bc || [];
      const src = pr.src?.bc || [];
      // normalize for comparison: lowercase, trim
      const norm = (a) => a.map((s) => s.toLowerCase().trim());
      const match = JSON.stringify(norm(eds)) === JSON.stringify(norm(src));
      bcRows.push({
        page: pr.edsUrl.replace(EDS, ''),
        eds,
        src,
        srcHadBc: (pr.src?.bc || null) !== null,
        match,
      });
    }
  }

  const report = {
    generated: 'run-time',
    edsHost: EDS,
    pagesAudited: pages.length,
    linkSummary: {
      uniqueLinks: uniqueLinks.length,
      broken: broken.length,
      sourceDomainDocs: sourceDocs.length,
    },
    broken,
    sourceDocs,
    breadcrumbs: bcRows,
    breadcrumbMismatches: bcRows.filter((r) => !r.match),
  };
  await writeFile(path.join(OUT, 'audit-report.json'), JSON.stringify(report, null, 2));

  console.log('\n=== SUMMARY ===');
  console.log(`pages audited        : ${pages.length}`);
  console.log(`unique links checked : ${uniqueLinks.length}`);
  console.log(`BROKEN links (>=400) : ${broken.length}`);
  console.log(`source-domain docs   : ${sourceDocs.length}`);
  if (!LINKS_ONLY) console.log(`breadcrumb mismatches: ${report.breadcrumbMismatches.length}`);
  const internalBroken = broken.filter((b) => b.internal);
  console.log(`  → internal broken   : ${internalBroken.length} (real problems)`);
  console.log(`  → external broken   : ${broken.length - internalBroken.length} (bot-blocked / pre-existing)`);
  if (broken.length) {
    console.log('\n--- BROKEN ---');
    broken.slice(0, 60).forEach((b) => console.log(`  ${b.status}  ${b.internal ? '[INTERNAL]' : `[ext${b.onSource ? ',on-src' : ''}]`}  ${b.url}\n        on: ${b.pages.slice(0, 3).join(', ')}${b.pages.length > 3 ? ` (+${b.pages.length - 3})` : ''}`));
  }
  if (sourceDocs.length) {
    console.log('\n--- SOURCE-DOMAIN DOCS (need localization) ---');
    sourceDocs.forEach((d) => console.log(`  ${d.status}  ${d.url}\n        on: ${d.pages.join(', ')}`));
  }
  if (!LINKS_ONLY && report.breadcrumbMismatches.length) {
    console.log('\n--- BREADCRUMB MISMATCHES ---');
    report.breadcrumbMismatches.forEach((r) => {
      console.log(`  ${r.page}`);
      console.log(`      EDS: ${r.eds.join(' > ') || '(none)'}`);
      console.log(`      SRC: ${r.src.join(' > ') || (r.srcHadBc ? '(empty)' : '(no breadcrumb on source)')}`);
    });
  }
  console.log(`\nFull JSON: ${path.join('tools/quality/audit', 'audit-report.json')}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
