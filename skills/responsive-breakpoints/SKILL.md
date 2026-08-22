---
name: responsive-breakpoints
description: The mobile-first breakpoint system for this lift-and-shift migration project — adopt the SOURCE SITE's breakpoints (recorded once in tools/quality/breakpoints.json), min-width only, never mix min-width and max-width. Use when writing or reviewing any CSS media query, adapting a layout across devices, or setting up a new migration. Enforced by tools/quality/breakpoint-check.mjs.
---

This project is a **lift-and-shift migration** to AEM Edge Delivery — we move fast by **adopting the customer site's existing breakpoints** rather than imposing our own. The sanctioned set is **not** a fixed 600/900/1200; it is whatever is recorded in **`tools/quality/breakpoints.json`**, the single source of truth for the whole repo. Still **mobile-first, `min-width` only** — never a `max-width` query, never mix min/max.

## Decide once, per migration (not per task)

Do this **once, at the very start** of a migration — every developer then reuses the recorded decision:

1. **Discover** the source site's breakpoints from its CSS. Sample a couple of representative pages, **starting with the homepage**:
   ```bash
   npm run discover:breakpoints -- https://customer-site.com https://customer-site.com/products
   ```
   It fetches each page's inline + linked CSS and reports the distinct `min-width` values actually used.
2. **Review** the reported values, then **persist** them (adds `--write`):
   ```bash
   npm run discover:breakpoints -- https://customer-site.com https://customer-site.com/products --write
   ```
   This writes `tools/quality/breakpoints.json`. From now on the checker and every developer enforce that set.
3. **If no breakpoints are accessible** (source CSS unreadable), the project keeps the shipped fallback defaults **600px, 900px, 1200px** — no action needed.

You can also point the discovery tool at local CSS files: `npm run discover:breakpoints -- theme.css --write`.

## Writing CSS (any migration)

1. Author the mobile layout with **no media query** — it is the default.
2. Layer up with `min-width` only, using the breakpoints in `breakpoints.json`. Either syntax is accepted:
   ```css
   @media (min-width: 768px) { … }   /* whatever the source site uses */
   @media (width >= 1024px) { … }    /* range syntax is equivalent    */
   ```
3. For values that flex continuously (font-size, padding) prefer `clamp()` — no breakpoint needed at all.
4. Run the checker after any CSS change: `node tools/quality/breakpoint-check.mjs`. It reads the sanctioned set from `breakpoints.json` and **fails** on any `max-width` media query or any `min-width`/range value outside that set. <!-- rule:breakpoint-standard -->

## Pitfalls
- **Inventing your own breakpoints** → the whole point is to match the source site. Discover first, don't guess. The checker fails on any value not in `breakpoints.json`.
- **Mixing `max-width`** → the classic desktop-first mistake; the checker fails the build regardless of which breakpoint set is in use. Invert to mobile-first `min-width`.
- **Re-deciding per page** → the set is decided once and stored in `breakpoints.json`. If you think it's wrong, re-run discovery and update that file — don't sprinkle one-off values.
- **`@media` can't read a CSS `var()`** (no build step) — you can't tokenize breakpoints. Consistency is enforced by the checker reading `breakpoints.json`, not by a CSS token.
- **Snapping a fixed pixel value to a responsive one that shrinks** — keep icon/stat sizes that must hold their px as fixed literals.

See also: `eds-code-conventions` (broader CSS rules), `accessibility` (200%-zoom / 320px reflow requirement).
