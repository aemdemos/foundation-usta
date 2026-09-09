#!/usr/bin/env node
/**
 * News breadcrumb re-check with CORRECT source-URL mapping.
 * The EDS news slug is truncated (~59 chars) vs the source URL, so the generic
 * host-swap mapping in audit-site.mjs mis-resolves news pages to a source 404
 * ("Home > 404"). Here we resolve each EDS slug to its real source URL by
 * prefix-matching against the source sitemap, then compare breadcrumb trails.
 */
import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const EDS = 'https://main--foundation-usta--aemdemos.aem.live';
const SRC = 'https://www.ustafoundation.com';
const SRC_SITEMAP = `${SRC}/en.sitemap.foundation-sitemap.xml`;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36';

async function text(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  return r.text();
}

function bcFromDoc() {
  const edsBc = document.querySelector('nav.nav-breadcrumb ol');
  if (edsBc) return [...edsBc.querySelectorAll('li')].map((li) => li.textContent.replace(/\s+/g, ' ').trim());
  const srcBc = document.querySelector('.cmp-breadcrumb__navigation, [class*="breadcrumb" i] ol');
  if (srcBc) {
    return [...srcBc.querySelectorAll('li')]
      .map((li) => li.textContent.replace(/\s+/g, ' ').replace(/[>›»]/g, '').trim()).filter(Boolean);
  }
  return null;
}

async function grab(ctx, url, wait) {
  const page = await ctx.newPage();
  let bc = null; let status = null; let title = null;
  try {
    const r = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    status = r ? r.status() : null;
    await page.waitForTimeout(wait);
    ({ bc, title } = await page.evaluate(() => ({ bc: (function () {
      const edsBc = document.querySelector('nav.nav-breadcrumb ol');
      if (edsBc) return [...edsBc.querySelectorAll('li')].map((li) => li.textContent.replace(/\s+/g, ' ').trim());
      const srcBc = document.querySelector('.cmp-breadcrumb__navigation, [class*="breadcrumb" i] ol');
      if (srcBc) return [...srcBc.querySelectorAll('li')].map((li) => li.textContent.replace(/\s+/g, ' ').replace(/[>›»]/g, '').trim()).filter(Boolean);
      return null;
    }()), title: document.title })));
  } catch (e) { status = -1; } finally { await page.close(); }
  return { bc, status, title };
}

async function main() {
  // source news URLs
  const xml = await text(SRC_SITEMAP);
  const srcNews = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim())
    .filter((u) => u.includes('/news/'));
  const srcSlugs = srcNews.map((u) => ({ url: u, slug: u.replace(`${SRC}/en/home/news/`, '').replace(/\.html$/, '') }));

  // EDS news URLs
  const edsXml = await text(`${EDS}/sitemap.xml`);
  const edsNews = [...edsXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim())
    .filter((u) => u.includes('/news/'));

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1280, height: 1000 } });

  const rows = [];
  for (const edsUrl of edsNews) {
    const edsSlug = edsUrl.replace(`${EDS}/en/home/news/`, '');
    // match source slug that STARTS WITH the (truncated) eds slug, or vice-versa
    const cand = srcSlugs.filter((s) => s.slug.startsWith(edsSlug) || edsSlug.startsWith(s.slug.slice(0, edsSlug.length)));
    // prefer the shortest source slug that starts with edsSlug (exact-ish)
    cand.sort((a, b) => a.slug.length - b.slug.length);
    const src = cand[0];
    const eds = await grab(ctx, edsUrl, 2200);
    const srcRes = src ? await grab(ctx, src.url, 1500) : { bc: null, status: null, title: null };
    const norm = (a) => (a || []).map((s) => s.toLowerCase().trim());
    const match = src ? JSON.stringify(norm(eds.bc)) === JSON.stringify(norm(srcRes.bc)) : null;
    rows.push({
      edsUrl: edsUrl.replace(EDS, ''),
      srcUrl: src ? src.url.replace(SRC, '') : null,
      edsBc: eds.bc, srcBc: srcRes.bc, srcStatus: srcRes.status, match,
    });
    const label = match === null ? 'NO-SRC-MATCH' : (match ? 'ok' : 'MISMATCH');
    console.log(`[${label}] ${edsUrl.replace(EDS, '')}`);
    if (match === false) {
      console.log(`    EDS: ${(eds.bc || []).join(' > ')}`);
      console.log(`    SRC: ${(srcRes.bc || []).join(' > ')}  (${src ? src.url.replace(SRC, '') : '—'})`);
    }
  }
  await browser.close();

  const mism = rows.filter((r) => r.match === false);
  const nomatch = rows.filter((r) => r.match === null);
  await writeFile('tools/quality/audit/breadcrumbs-news.json', JSON.stringify({ rows, mismatches: mism, unmatched: nomatch }, null, 2));
  console.log('\n=== NEWS BC SUMMARY ===');
  console.log(`checked      : ${rows.length}`);
  console.log(`ok           : ${rows.filter((r) => r.match === true).length}`);
  console.log(`MISMATCH     : ${mism.length}`);
  console.log(`no src match : ${nomatch.length}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
