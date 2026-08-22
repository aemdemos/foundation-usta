#!/usr/bin/env node
/**
 * svg-size-check.mjs — enforces the Asset-Size Rule for committed SVGs
 * (AGENTS.md / skills/svg-assets).
 *
 * Warns/fails when an SVG committed under icons/ (or a passed path) is larger
 * than the size budget. Small UI glyphs are tiny; a large SVG is usually
 * illustrative/complex art that ships smaller (and renders identically) as a
 * rasterized 2x PNG.
 *
 *   WARN_KB (8KB)  — over budget: review; consider converting to PNG.
 *   FAIL_KB (40KB) — clearly too big to ship as a vector: exit 1.
 *
 * Convert oversized SVGs with:
 *   npm run convert:svg <path-to.plain.html>   (skills/svg-assets/convert-svg-to-png.mjs)
 *
 * Usage:
 *   node tools/quality/svg-size-check.mjs             # scan icons/**\/*.svg
 *   node tools/quality/svg-size-check.mjs a.svg b.svg # scan specific files
 */
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const WARN_KB = 8;
const FAIL_KB = 40;

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    const full = join(dir, name);
    let s;
    try { s = statSync(full); } catch { continue; } // eslint-disable-line no-continue
    if (s.isDirectory()) {
      if (name === 'node_modules' || name.startsWith('.')) continue; // eslint-disable-line no-continue
      walk(full, out);
    } else if (name.toLowerCase().endsWith('.svg')) {
      out.push(full);
    }
  }
  return out;
}

function collectFiles() {
  const args = process.argv.slice(2);
  if (args.length) return args.map((a) => join(ROOT, a));
  return walk(join(ROOT, 'icons'));
}

const warnings = [];
const failures = [];

for (const file of collectFiles()) {
  let bytes;
  try { bytes = statSync(file).size; } catch { continue; } // eslint-disable-line no-continue
  const kb = bytes / 1024;
  const rel = relative(ROOT, file);
  if (kb > FAIL_KB) failures.push({ rel, kb });
  else if (kb > WARN_KB) warnings.push({ rel, kb });
}

if (warnings.length) {
  console.warn('\n⚠ Large SVGs (over budget — consider converting to 2x PNG):');
  warnings.forEach((w) => console.warn(`  ${w.rel}  ${w.kb.toFixed(1)}KB (warn > ${WARN_KB}KB)`));
}

if (failures.length) {
  console.error('\n✖ SVGs too large to ship as vectors:');
  failures.forEach((f) => console.error(`  ${f.rel}  ${f.kb.toFixed(1)}KB (fail > ${FAIL_KB}KB)`));
  console.error('\nConvert to a rasterized 2x PNG with '
    + '`npm run convert:svg` (skills/svg-assets/convert-svg-to-png.mjs).\n');
  process.exit(1);
}

console.log(`✓ SVG size check passed (${warnings.length} warning(s), all under ${FAIL_KB}KB).`);
