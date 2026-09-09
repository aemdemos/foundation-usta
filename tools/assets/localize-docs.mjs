#!/usr/bin/env node
/**
 * Document Localization (external doc links → local content/assets/docs + absolute aem.live href).
 *
 * The doc counterpart to localize-assets.mjs. Where images are LOCAL-ONLY staging
 * referenced by a RELATIVE /media-da/… path (never uploaded to DA), DOCUMENTS
 * (PDFs, Office files) are real downloadable assets that must be SERVED from the
 * site — so they are:
 *  - Downloaded to  content/assets/docs/{preserved-path}  (mirrors the source
 *    DAM path after stripping the /content/dam/{tenant}/ prefix, so colliding
 *    basenames like annual-reports/2023.pdf vs irs-990/2023.pdf stay distinct).
 *  - Rewritten in the .plain.html so every <a href> pointing at that doc uses the
 *    ABSOLUTE production URL  https://main--{repo}--{owner}.aem.live/assets/docs/…
 *    (docs resolve from the live site once uploaded to DA — see below).
 *  - Uploaded to DA alongside the .plain.html (outward-facing, on request). This
 *    is the OPPOSITE of images: docs GO to DA; media-da does NOT.
 *  - Idempotent: an href already pointing at …aem.live/assets/docs/… is skipped;
 *    re-running never re-downloads or corrupts anything.
 *
 * Usage:
 *   node tools/assets/localize-docs.mjs <content-relative-doc> [...more docs]
 *   node tools/assets/localize-docs.mjs --base https://main--repo--owner.aem.live <doc>
 *   node tools/assets/localize-docs.mjs --verify <docs...>   (curl each local ref @ localhost:3000)
 *
 * A doc arg is a path relative to content/, with or without .plain.html, e.g.
 *   en/home/who-we-are/financials
 *   content/en/home/who-we-are/financials.plain.html
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const ROOT = process.cwd();
const CONTENT = path.join(ROOT, 'content');
const DOCS_DIR = path.join(CONTENT, 'assets', 'docs');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// Document extensions we localize (everything else — pages, anchors, mailto — is left alone).
const DOC_EXT = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'txt', 'rtf'];

/** Derive the production base URL (https://main--{repo}--{owner}.aem.live) from the git remote. */
function deriveBase() {
  try {
    const url = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
    const m = url.match(/[/:]([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (m) return `https://main--${m[2]}--${m[1]}.aem.live`;
  } catch { /* fall through */ }
  return null;
}

/** Normalise a CLI doc arg → { slug, absPath }. */
function resolveDoc(arg) {
  const rel = arg.replace(/^content\//, '').replace(/\.plain\.html$/, '').replace(/^\/+/, '');
  return { slug: rel, absPath: path.join(CONTENT, `${rel}.plain.html`) };
}

/**
 * Map a source doc URL → the preserved path under assets/docs.
 * Strips a leading /content/dam/{tenant}/ (AEM DAM) prefix so the readable folder
 * structure is kept; falls back to the full pathname if no DAM prefix is present.
 */
function docPathFor(url) {
  let p;
  try { p = new URL(url).pathname; } catch { return null; }
  p = p.replace(/^\/+/, '');
  const dam = p.match(/^content\/dam\/[^/]+\/(.+)$/);
  if (dam) return dam[1];
  // Non-DAM: drop a leading "content/" if present, else keep the whole path.
  return p.replace(/^content\//, '');
}

/** Download a URL as a Buffer with a browser-like UA/Referer. Returns {buf, type}. */
async function download(url) {
  let referer;
  try { referer = `${new URL(url).origin}/`; } catch { referer = undefined; }
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, ...(referer ? { Referer: referer } : {}), Accept: '*/*' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const buf = Buffer.from(await res.arrayBuffer());
  return { buf, type };
}

/**
 * Collect unique document links from a doc's <a href="..."> attributes.
 * Returns objects { href, download } where `href` is the ORIGINAL string in the
 * HTML (to rewrite) and `download` is the absolute URL to fetch from. Absolute
 * source URLs pass through; ROOT-RELATIVE doc paths (e.g. /content/dam/…/x.pdf,
 * common in AEM-imported content) are resolved against `srcHost` so they too get
 * localized — otherwise they'd 404 against the EDS host.
 */
function collectDocLinks(html, { srcHost } = {}) {
  const seen = new Map();
  const re = /\bhref\s*=\s*"([^"]*)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const u = m[1];
    const ext = u.split('?')[0].split('#')[0].match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase();
    if (!ext || !DOC_EXT.includes(ext)) continue;
    if (/^https?:\/\//i.test(u)) {
      seen.set(u, { href: u, download: u });
    } else if (u.startsWith('/') && srcHost) {
      // root-relative doc path (e.g. /content/dam/…/x.pdf) — fetch from srcHost.
      seen.set(u, { href: u, download: srcHost.replace(/\/$/, '') + u });
    }
  }
  return [...seen.values()];
}

async function localizeDoc(slug, absPath, { base, verifyBase, srcHost } = {}) {
  if (!existsSync(absPath)) {
    console.log(`  ! skip (missing): ${absPath}`);
    return { slug, docs: 0, downloaded: 0, allServe: null, leftover: 0 };
  }
  const html = await readFile(absPath, 'utf8');
  const external = collectDocLinks(html, { srcHost });
  if (!external.length) {
    return { slug, docs: 0, downloaded: 0, allServe: true, leftover: 0 };
  }

  const mapping = new Map(); // originalHref → absRef (https://…aem.live/assets/docs/…)
  let downloaded = 0;
  for (const { href, download: dlUrl } of external) {
    const rel = docPathFor(dlUrl);
    if (!rel) { console.log(`  ✗ SKIP (unparseable): ${href}`); continue; }
    const dest = path.join(DOCS_DIR, rel);
    const localRef = `/assets/docs/${rel}`;
    const absRef = base ? `${base}${localRef}` : localRef;
    try {
      if (!existsSync(dest)) {
        const { buf, type } = await download(dlUrl);
        if (buf.length < 100) throw new Error(`too small (${buf.length}B) — likely an error page`);
        await mkdir(path.dirname(dest), { recursive: true });
        await writeFile(dest, buf);
        downloaded += 1;
        console.log(`  ✓ ${href.slice(0, 70)}… → ${rel} (${type}, ${buf.length}B)`);
      } else {
        console.log(`  = ${rel} (already downloaded)`);
      }
      mapping.set(href, absRef);
    } catch (e) {
      console.log(`  ✗ FAILED ${href.slice(0, 90)} — ${e.message}`);
    }
  }

  // Rewrite every occurrence of each source URL to the absolute aem.live ref.
  let out = html;
  for (const [url, absRef] of mapping) {
    out = out.split(url).join(absRef);
  }
  if (out !== html) await writeFile(absPath, out, 'utf8');

  // Leftover = doc links NOT already pointing at our base.
  const leftover = collectDocLinks(out, { srcHost })
    .filter(({ href }) => !base || !href.startsWith(base)).length;

  // Optional: verify each local ref serves 200 from the dev server.
  let allServe = null;
  if (verifyBase) {
    allServe = true;
    for (const absRef of new Set(mapping.values())) {
      const local = absRef.replace(base || '', '');
      try {
        const r = await fetch(verifyBase + local, { method: 'GET' });
        if (r.status !== 200) { allServe = false; console.log(`   verify ${r.status} ${local}`); }
      } catch { allServe = false; }
    }
  }

  return { slug, docs: external.length, downloaded, allServe, leftover };
}

async function main() {
  const args = process.argv.slice(2);
  let base = null;
  let verifyBase = null;
  let srcHost = 'https://www.ustafoundation.com';
  const docs = [];
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === '--base') { base = args[i + 1]; i += 1; } else if (a === '--src-host') { srcHost = args[i + 1]; i += 1; } else if (a === '--verify') { verifyBase = 'http://localhost:3000'; } else if (a === '--dev-base') { verifyBase = args[i + 1]; i += 1; } else docs.push(a);
  }
  if (!docs.length) {
    console.error('Usage: node tools/assets/localize-docs.mjs <doc...> [--base URL] [--verify]');
    process.exit(1);
  }
  if (!base) {
    base = deriveBase();
    if (base) console.log(`(derived base: ${base})`);
    else console.log('(no base derived — links will be site-relative /assets/docs/…)');
  }

  const results = [];
  for (const d of docs) {
    const { slug, absPath } = resolveDoc(d);
    console.log(`\n▶ ${slug}`);
    results.push(await localizeDoc(slug, absPath, { base, verifyBase, srcHost }));
  }

  console.log('\n=== SUMMARY ===');
  console.log('page | #docs | downloaded | all-serve-200? | leftover-hotlinks');
  for (const r of results) {
    console.log(`${r.slug} | ${r.docs} | ${r.downloaded} | ${r.allServe === null ? 'n/a' : r.allServe} | ${r.leftover}`);
  }
  if (results.some((r) => r.leftover > 0)) console.log('\n! WARNING: some external doc hotlinks remain.');
  if (results.some((r) => r.allServe === false)) console.log('\n! WARNING: some local refs did not serve 200.');
}

main().catch((e) => { console.error(e); process.exit(1); });
