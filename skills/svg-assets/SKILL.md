---
name: svg-assets
description: How SVGs are delivered in this project (icons/*.svg via decorateIcons, plus small inline glyphs in block JS) and the Asset-Size Rule — keep committed SVGs tiny, and rasterize oversized/illustrative SVGs to a 2x PNG. Use when adding an icon or inline SVG, committing an SVG under icons/, or an SVG asset looks heavy. Enforced by npm run check:svg.
---

SVGs ship two ways here. Keep them small; a11y-correct; and when an SVG is too heavy to be a vector, convert it to a rasterized 2x PNG that renders identically.

## The two delivery methods
1. **Icon files — `icons/*.svg`.** The EDS convention: content references a token like `:search:` and `decorateIcons()` (called in `scripts.js`) swaps it for the file. One source, reused anywhere. Use this for shared UI icons.
2. **Inline SVG in block JS.** Brand/social glyphs and chevrons hardcoded as small SVG strings in the decorator (e.g. `blocks/social/share.js`). Use this for block-specific glyphs so a block needs no extra request or icon font.

## The Asset-Size Rule (enforced) <!-- rule:svg-size -->
A UI glyph is well under 1KB. A large SVG is almost always illustrative/complex art that ships **smaller — and renders identically — as a rasterized 2x PNG**. `npm run check:svg` (`tools/quality/svg-size-check.mjs`) scans `icons/**/*.svg`:
- **> 8KB → warning** (review; probably should be a PNG).
- **> 40KB → failure** (exit 1; do not ship as a vector).

The script owns the thresholds; this skill explains the why and the fix.

## Converting an oversized SVG → PNG
Rasterize with the review utility bundled in this skill (`convert-svg-to-png.mjs` — Chromium @ 2x, transparent background, identical to the live render):
```
npm run convert:svg <path-to.plain.html>
# or: node skills/svg-assets/convert-svg-to-png.mjs <path-to.plain.html>
```
It reads every unique `src="*.svg"` in the page, writes `<name>.png` into an `images/` folder next to the page, and does **not** rewrite the content — you review the PNGs, then point the `<img src>` at the PNG (re-run the import so content stays import-generated). Wide/landscape art is scaled up to ~1000px before rasterizing so text stays crisp; icons keep their intrinsic size.

**Do NOT convert small UI glyphs** (social icons, chevrons, search) — they're already tiny and vectors scale better for crisp line art. Convert only heavy illustrative/photographic-ish SVGs.

## A11y (also enforced — see the accessibility skill)
- **Decorative inline SVG** → `aria-hidden="true" focusable="false"` on the `<svg>`.
- **Icon-only link/button** → accessible name via `aria-label` on the control (the SVG itself stays hidden).
- `npm run test:a11y` fails on an interactive icon with no accessible name.

## Verify
Part of the quality gate — run before claiming done (see verify-before-claiming):
```
npm run lint
npm run check:breakpoints
npm run check:svg
npm run test:a11y <url>
```
