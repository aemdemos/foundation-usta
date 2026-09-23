#!/usr/bin/env node
/* eslint-disable no-console, no-restricted-syntax, no-nested-ternary */
/* eslint-disable prefer-template, object-curly-newline, no-await-in-loop */
/* eslint-disable import/extensions, no-cond-assign, dot-notation */
/**
 * Related-Articles audit — replays the news template's feed logic (news.js +
 * news-sort.js) against the LIVE /news-index.json for EVERY news page, using
 * each page's real config metadata, and prints which cards each page yields.
 *
 * Read-only. Usage: node tools/quality/audit/related-articles-audit.mjs
 *   (add --md to emit the Markdown table block for RELATED-ARTICLES.md)
 */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { sortNews, cardTitle, displayDate } from '../../../templates/news/news-sort.js';

const ROOT = process.cwd();
const NEWS_DIR = path.join(ROOT, 'content/en/home/news');
const INDEX_URL = 'https://main--foundation-usta--aemdemos.aem.live/news-index.json';

const DEFAULT_LIMIT = 3;

// ---- helpers mirroring news.js exactly -------------------------------------
function normalizePath(p) {
  if (!p) return '';
  return p.trim().replace(/\.html$/, '').replace(/^\/content\/[^/]+/, '');
}
function tagKey(tag) { return (tag || '').trim().toLowerCase().split('/').pop() || ''; }
function splitList(v) { return (v || '').split(',').map((s) => s.trim()).filter(Boolean); }
function isArticle(entry) { return !!entry.path && /\/news\/[^/]+/.test(normalizePath(entry.path)); }

function selectCandidates(mode, entries, { tags, pages }) {
  if (mode === 'static') {
    const byPath = new Map(entries.map((e) => [normalizePath(e.path), e]));
    return pages.map((p) => byPath.get(normalizePath(p))).filter(Boolean);
  }
  if (mode === 'tags') {
    const wanted = new Set(tags.map(tagKey).filter(Boolean));
    if (!wanted.size) return [];
    return entries.filter((e) => splitList(e.newstags).some((t) => wanted.has(tagKey(t))));
  }
  return entries; // children
}

// ---- parse the Metadata block from a .plain.html ---------------------------
// Rows look like <div><div>Key</div><div>Value</div></div> inside
// <div class="metadata">…</div>. Values may be plain or <p>-wrapped.
function parseMetadata(html) {
  const meta = {};
  const block = html.match(/<div class="metadata">([\s\S]*?)<\/div>\s*<\/div>\s*$/m)
    || html.match(/<div class="metadata">([\s\S]*)/);
  const scope = block ? block[1] : html;
  const rowRe = /<div><div>([^<]+)<\/div><div>([\s\S]*?)<\/div><\/div>/g;
  let m;
  while ((m = rowRe.exec(scope)) !== null) {
    const key = m[1].trim();
    const val = m[2].replace(/<[^>]+>/g, '').trim();
    meta[key] = val;
  }
  return meta;
}

function cfgFor(meta) {
  return {
    listFrom: (meta['List From'] || 'children').trim().toLowerCase(),
    sortOrder: (meta['Sort Order'] || 'desc').trim().toLowerCase(),
    maxItems: parseInt(meta['Max Items'], 10) || DEFAULT_LIMIT,
    newsTags: splitList(meta['News Tags']),
    pages: splitList(meta['Pages']),
  };
}

// ---- main ------------------------------------------------------------------
const resp = await fetch(INDEX_URL);
const index = (await resp.json()).data.filter(isArticle);

const files = (await readdir(NEWS_DIR)).filter((f) => f.endsWith('.plain.html')).sort();
const results = [];

for (const file of files) {
  const slug = file.replace('.plain.html', '');
  const currentPath = `/en/home/news/${slug}`;
  const html = await readFile(path.join(NEWS_DIR, file), 'utf8');
  const meta = parseMetadata(html);
  const cfg = cfgFor(meta);

  const candidates = selectCandidates(cfg.listFrom, index, { tags: cfg.newsTags, pages: cfg.pages })
    .filter((e) => e.path && normalizePath(e.path) !== normalizePath(currentPath));
  const cards = sortNews(candidates, cfg.sortOrder).slice(0, cfg.maxItems);

  results.push({ slug, cfg, cards, poolSize: candidates.length });
}

// ---- output ----------------------------------------------------------------
const asMd = process.argv.includes('--md');
if (!asMd) {
  for (const r of results) {
    console.log(`\n### ${r.slug}`);
    console.log(`   List From=${r.cfg.listFrom} · Sort=${r.cfg.sortOrder} · Max=${r.cfg.maxItems}`
      + `${r.cfg.newsTags.length ? ` · News Tags=[${r.cfg.newsTags.join(', ')}]` : ''}`
      + `${r.cfg.pages.length ? ` · Pages=[${r.cfg.pages.join(', ')}]` : ''}`
      + ` · pool=${r.poolSize}`);
    r.cards.forEach((c, i) => console.log(`   ${i + 1}. ${cardTitle(c)}  (${displayDate(c) || 'no date'})  -> ${normalizePath(c.path).replace('/en/home/news/', '')}`));
    if (!r.cards.length) console.log('   (no cards)');
  }
  console.log(`\nTOTAL PAGES: ${results.length}`);
} else {
  // Markdown block for the MD file
  results.forEach((r) => {
    const cfgStr = `\`List From\`=**${r.cfg.listFrom}**, \`Sort Order\`=**${r.cfg.sortOrder}**, \`Max Items\`=**${r.cfg.maxItems}**`
      + (r.cfg.newsTags.length ? `, \`News Tags\`=**${r.cfg.newsTags.join(', ')}**` : '')
      + (r.cfg.pages.length ? `, \`Pages\`=**${r.cfg.pages.map((p) => p.replace('/en/home/news/', '')).join(', ')}**` : '');
    console.log(`\n#### ${r.slug}`);
    console.log(`- **Metadata:** ${cfgStr}`);
    console.log(`- **Candidate pool:** ${r.poolSize} article(s) (${r.cfg.listFrom === 'children' ? 'whole index minus self' : r.cfg.listFrom === 'tags' ? 'articles sharing a tag' : 'named pages'})`);
    console.log('- **Cards shown (in order):**');
    if (!r.cards.length) console.log('  - _(none)_');
    r.cards.forEach((c, i) => console.log(`  ${i + 1}. ${cardTitle(c)} — ${displayDate(c) || 'no date'}`));
  });
}
