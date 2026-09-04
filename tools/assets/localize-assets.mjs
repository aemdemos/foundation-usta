#!/usr/bin/env node
/**
 * Asset Localization (cross-repo / external images → local content/media-da).
 *
 * Follows docs/asset-localization-playbook.md EXACTLY:
 *  - Downloads every external <img src> / <source srcset> image referenced by a
 *    migrated .plain.html to  content/media-da/{page}/media-{sha1}-{first8}.{ext}
 *    ({page} = the doc slug under content/, e.g. "drafts/block-samples/cards-expand").
 *  - Rewrites BOTH src and srcset to the SAME relative path
 *    /media-da/{page}/media-{sha1}-{first8}.{ext}. Never content.da.live/… (that
 *    makes the DA editor re-localize and break the image → about:error).
 *  - Rewrites ONLY <img>/<source> image URLs; never touches <a href> links.
 *  - content/media-da/ is LOCAL-ONLY staging; only the .plain.html is uploaded to DA.
 *  - Idempotent: an already-local /media-da/… ref is skipped; re-running does not
 *    duplicate or corrupt anything.
 *
 * Usage:
 *   node tools/assets/localize-assets.mjs <content-relative-doc> [...more docs]
 *   node tools/assets/localize-assets.mjs --all-samples
 *   node tools/assets/localize-assets.mjs --dev-base http://localhost:3000 --verify <docs...>
 *
 * A doc arg is a path relative to content/, with or without .plain.html, e.g.
 *   drafts/block-samples/cards-expand
 *   content/drafts/block-samples/cards-expand.plain.html
 */

import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CONTENT = path.join(ROOT, 'content');
const MEDIA_DA = path.join(CONTENT, 'media-da');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// Map content-types → file extensions.
const EXT_BY_TYPE = {
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpeg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
};

/** Normalise a CLI doc arg → { slug, absPath }. */
function resolveDoc(arg) {
  let rel = arg.replace(/^content\//, '').replace(/\.plain\.html$/, '').replace(/^\/+/, '');
  const absPath = path.join(CONTENT, `${rel}.plain.html`);
  return { slug: rel, absPath };
}

/** SHA-1 of bytes; return {sha1, first8}. */
function hashBytes(buf) {
  const sha1 = createHash('sha1').update(buf).digest('hex');
  return { sha1, first8: sha1.slice(0, 8) };
}

/** Download a URL as a Buffer with a browser-like UA/Referer. Returns {buf, type}. */
async function download(url) {
  let referer;
  try { referer = new URL(url).origin + '/'; } catch { referer = undefined; }
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, ...(referer ? { Referer: referer } : {}), Accept: 'image/*,*/*' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const buf = Buffer.from(await res.arrayBuffer());
  return { buf, type };
}

/** Pick an extension from content-type, falling back to the URL path. */
function pickExt(type, url) {
  if (EXT_BY_TYPE[type]) return EXT_BY_TYPE[type];
  const m = url.split('?')[0].match(/\.([a-z0-9]{2,5})$/i);
  if (m) {
    const e = m[1].toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'].includes(e)) return e === 'jpg' ? 'jpeg' : e;
  }
  return 'jpeg';
}

/** Collect unique external image URLs from a doc's src/srcset attributes. */
function collectExternal(html) {
  const urls = new Set();
  // src="..." and srcset="..." (srcset may hold a comma list with descriptors)
  const attrRe = /\b(?:src|srcset)\s*=\s*"([^"]*)"/gi;
  let m;
  while ((m = attrRe.exec(html)) !== null) {
    const val = m[1];
    // srcset can be "url 1x, url 2x" — split on commas, strip descriptors.
    val.split(',').forEach((part) => {
      const u = part.trim().split(/\s+/)[0];
      if (/^https?:\/\//i.test(u)) urls.add(u);
    });
  }
  return [...urls];
}

async function localizeDoc(slug, absPath, { verifyBase } = {}) {
  if (!existsSync(absPath)) {
    console.log(`  ! skip (missing): ${absPath}`);
    return { slug, images: 0, downloaded: 0, allServe: null, leftover: 0 };
  }
  let html = await readFile(absPath, 'utf8');
  const external = collectExternal(html);
  if (!external.length) {
    return { slug, images: 0, downloaded: 0, allServe: true, leftover: 0 };
  }

  const outDir = path.join(MEDIA_DA, slug);
  await mkdir(outDir, { recursive: true });

  const mapping = new Map(); // originalUrl → /media-da/{slug}/media-...ext
  let downloaded = 0;
  for (const url of external) {
    try {
      const { buf, type } = await download(url);
      if (buf.length < 100) throw new Error(`too small (${buf.length}B) — likely an error page`);
      const { sha1, first8 } = hashBytes(buf);
      const ext = pickExt(type, url);
      const fname = `media-${sha1}-${first8}.${ext}`;
      const dest = path.join(outDir, fname);
      if (!existsSync(dest)) {
        await writeFile(dest, buf);
        downloaded += 1;
      }
      mapping.set(url, `/media-da/${slug}/${fname}`);
      console.log(`  ✓ ${url.slice(0, 70)}… → ${fname} (${type}, ${buf.length}B)`);
    } catch (e) {
      console.log(`  ✗ FAILED ${url.slice(0, 90)} — ${e.message}`);
    }
  }

  // Rewrite src + srcset occurrences. Replace the exact original URL string
  // everywhere it appears inside a src/srcset attribute value.
  let out = html;
  for (const [url, local] of mapping) {
    out = out.split(url).join(local);
  }
  if (out !== html) await writeFile(absPath, out, 'utf8');

  // Report leftover external image hotlinks (src/srcset only).
  const leftover = collectExternal(out).length;

  // Optional: verify each local ref serves 200 from the dev server.
  let allServe = null;
  if (verifyBase) {
    allServe = true;
    for (const local of new Set(mapping.values())) {
      try {
        const r = await fetch(verifyBase + local, { method: 'GET' });
        if (r.status !== 200) { allServe = false; console.log(`   verify ${r.status} ${local}`); }
      } catch { allServe = false; }
    }
  }

  return { slug, images: external.length, downloaded, allServe, leftover };
}

async function listSampleDocs() {
  const dir = path.join(CONTENT, 'drafts', 'block-samples');
  const entries = await readdir(dir);
  return entries
    .filter((f) => f.endsWith('.plain.html'))
    .map((f) => `drafts/block-samples/${f.replace(/\.plain\.html$/, '')}`);
}

async function main() {
  const args = process.argv.slice(2);
  let verifyBase = null;
  const docs = [];
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === '--all-samples') { docs.push(...(await listSampleDocs())); }
    else if (a === '--verify') { verifyBase = 'http://localhost:3000'; }
    else if (a === '--dev-base') { verifyBase = args[i + 1]; i += 1; }
    else docs.push(a);
  }
  if (!docs.length) {
    console.error('Usage: node tools/assets/localize-assets.mjs <doc...> | --all-samples [--verify]');
    process.exit(1);
  }

  const results = [];
  for (const d of docs) {
    const { slug, absPath } = resolveDoc(d);
    console.log(`\n▶ ${slug}`);
    results.push(await localizeDoc(slug, absPath, { verifyBase }));
  }

  console.log('\n=== SUMMARY ===');
  console.log('page | #images | downloaded | all-serve-200? | leftover-hotlinks');
  for (const r of results) {
    console.log(`${r.slug} | ${r.images} | ${r.downloaded} | ${r.allServe === null ? 'n/a' : r.allServe} | ${r.leftover}`);
  }
  const anyLeftover = results.some((r) => r.leftover > 0);
  const anyServeFail = results.some((r) => r.allServe === false);
  if (anyLeftover) console.log('\n! WARNING: some external image hotlinks remain.');
  if (anyServeFail) console.log('\n! WARNING: some local refs did not serve 200.');
}

main().catch((e) => { console.error(e); process.exit(1); });
