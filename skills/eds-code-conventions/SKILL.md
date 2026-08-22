---
name: eds-code-conventions
description: CSS and JavaScript coding conventions for EDS blocks in this project — no build, scoped selectors, no !important, self-contained blocks, localization, and the few performance rules that still bite. Use when writing block CSS or JS, naming classes, deciding where code lives, or reviewing code for EDS standards.
---

Write code that matches the boilerplate: vanilla ES modules, native CSS, no build step, zero runtime dependencies. Simple beats clever.

## JavaScript
- **ES6+ native modules**, Airbnb ESLint rules (configured). **Always `.js` in imports** — native modules require it: `import { foo } from './bar.js';`. <!-- rule:js-import-ext -->
- **Never modify** `scripts/aem.js` or `head.html`. New shared utilities → `scripts/scripts.js`, never `aem.js`. Check existing helpers before writing new ones.
- **Self-contained blocks** — no layout coupling between blocks. `decorate(block)` must handle missing/optional authored content gracefully.
- **No dynamic code** (`eval`/`new Function`) — see `security`.
- **No hard-coded user-facing strings** (labels, errors) — source from content or make data-driven (The Localization Rule).

## CSS
- **Scope every selector to the block** — `.{blockname} .part`, never a bare `.part`. Avoid `{blockname}-container` / `{blockname}-wrapper` (those name sections). <!-- rule:css-scope -->
- **No positional selectors** (`nth-child`) for logic — add semantic classes in `decorate()`.
- **No `!important`** — fix specificity properly; use a `.full-width` wrapper class for full-bleed instead of forcing widths.
- **Mobile-first, `min-width` only** — breakpoint values come from the source site's set in `tools/quality/breakpoints.json` (defaults 600/900/1200); see `responsive-breakpoints` (enforced by a checker).
- **Tokens over literals** — reuse `var(--token)` from `styles.css` for colors, spacing, radii, type; add a new `:root` token when a value recurs for a role.

## Performance (EDS handles most — these still bite)
- **Never lazy-load the LCP/above-the-fold image** — it delays LCP. EDS eager-loads the first section; don't fight it.
- **Reserve space** (explicit dimensions or `aspect-ratio`) to avoid CLS.
- **Animate only `transform`/`opacity`** — never `width`/`height`/`top`/`left`/margins.
- Third-party scripts → `delayed.js`, never `scripts.js`. Optimize any developer-committed images.

## Clean and lean
- If a simpler implementation works, use it — no complexity without a documented why.
- No workarounds for bad content in code — fix the content. Clean up failed attempts before claiming done.
- Comments explain **why**, not what.

## Quality gates (run before "done")
- `npm run lint` (ESLint + Stylelint) — no errors, don't loosen rules for preference.
- `node tools/quality/breakpoint-check.mjs` — breakpoint compliance.
- `npm run test:a11y <url>` for UI changes — accessibility.
- Verify visually at `localhost:3000`.

See also: `responsive-breakpoints` (the breakpoint system), `accessibility` (a11y gate), `security` (client-side safety), `eds-dom-structure` (where blocks land in the DOM), `css-specificity-eds` (why a rule isn't applying), `vertical-spacing-system` (block/section spacing), `full-width-escape-hatch` (the sanctioned max-width override), `eds-content-modeling` (block/variant/section-style decisions), `verify-before-claiming` (the completion protocol).
