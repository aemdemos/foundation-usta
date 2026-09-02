---
name: typography-system
description: The type scale + fonts for this lift-and-shift migration project — reproduce the SOURCE SITE's h1..h6 and body font-size / line-height / weight / family at EVERY breakpoint, and self-host the source's fonts so faces match. Use when setting any font-size or font-family, adding a heading style, wiring fonts.css/brand.css, or discovering the source typography at the start of a migration. Discover with npm run discover:typography; enforced by npm run check:typography.
---

This is a **lift-and-shift migration**. Typography must **match the source site**: the same
h1..h6 and body **font-size, line-height, weight, and family — at every breakpoint** — and the
**same font faces**, self-hosted. Type scale is a **global system**, expressed as tokens in
`styles/styles.css` / `styles/brand.css` (`:root`, overridden per breakpoint) and applied to
`h1..h6`/body once — never re-declared with ad-hoc px inside a block. → The Typography Rule (AGENTS.md)

## Decide once, per migration (discover the source scale + fonts up front)

Do this **once**, alongside breakpoint & grid discovery, from the **live rendered DOM**
(computed styles) of a couple of representative pages — homepage first:

1. **Capture the scale + fonts:**
   ```bash
   npm run discover:typography -- https://source-site.com https://source-site.com/inner
   ```
   It loads the source at the mobile baseline + every breakpoint in `breakpoints.json`, reads the
   dominant computed `font-size / line-height / weight / family` of `h1..h6` and body text, and
   lists the source `@font-face` rules. Review, then persist with `--write` → `tools/quality/typography.json`.
2. **Self-host the fonts.** For each discovered `@font-face`, download the actual font file
   (prefer `.woff2`) into `fonts/`, and add a matching `@font-face` to `styles/fonts.css` with
   `font-display: swap` and a fallback-metrics face. **Verify licensing before committing font
   binaries.** Point `--body-font-family` / `--heading-font-family` at the source families.
3. **Set the scale as tokens.** Put the per-breakpoint sizes/line-heights into `:root` in
   `styles.css` (the boilerplate already uses `--heading-font-size-*` / `--body-font-size-*`,
   overridden inside each breakpoint's `:root`), and map `h1→…h6`, body to them **once**.

## Applying + enforcing (any block/page)

1. Use the global tokens for every heading/body size; a block only overrides type when its design
   is genuinely unique — and even then, from a token, not a magic number.
2. Never hardcode a `font-family` in a block; inherit the global families.
3. Run the checker after any typography/global-CSS change (dev server up):
   ```bash
   npm run check:typography            # every page in a11y.config.js, at every breakpoint
   npm run check:typography /some-path # one page
   ```
   It compares the migrated pages' computed `h1..h6`/body values to `typography.json` and
   **fails** on drift beyond tolerance (default ±1.5px or ±6%, family must match). <!-- rule:typography-standard -->

## Pitfalls
- **Ad-hoc px font-sizes in a block** → drift from the source scale and inconsistency across blocks. Use the global tokens; the checker catches rendered drift per viewport.
- **Only checking one viewport** → the scale changes per breakpoint; `check:typography` sweeps them all. A size that's right at desktop can be wrong at mobile.
- **System-font fallback instead of the real face** → letterforms/metrics differ, breaking parity. Self-host the source `@font-face` (step 2).
- **Forgetting a fallback-metrics `@font-face`** → layout shift (CLS) on load. Keep the `-fallback` faces the boilerplate ships.
- **Re-deciding the scale per page** → it's discovered once into `typography.json` + tokens; if it's wrong, re-run discovery and update centrally.

See also: `responsive-breakpoints` (the viewports the scale switches at), `grid-system` (the other half of layout parity), `eds-code-conventions` (no hardcoded values), `quality-tooling` (the checker that enforces this).
