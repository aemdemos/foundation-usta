---
name: css-pitfalls-eds
description: Common EDS CSS gotchas with fixes. Load when fixing a stylelint no-descending-specificity error, a background image suddenly renders at native size after shorthand consolidation, position:sticky breaks due to an ancestor overflow:hidden, or a backdrop-filter glass effect is invisible or its corners bleed.
---

A handful of EDS/CSS traps that look like broken code but are cascade or shorthand behavior. Recognize the symptom, apply the fix.

## Descending specificity (stylelint `no-descending-specificity`)
The linter errors when a lower-specificity selector appears *after* a higher-specificity one that could target the same element.
```css
/* WRONG — base after compound */
.card-expanded .desc { opacity: 1; }
.desc { opacity: 0; transition: …; }   /* ERROR */

/* RIGHT — base first, override after */
.desc { opacity: 0; transition: …; }
.card-expanded .desc { opacity: 1; }
```
- Merge all base properties into the FIRST rule for a selector — don't create a second `.cta {}` after `.cta:hover {}`.
- When two mutually-exclusive scopes share a trailing class (`.default-content-wrapper`), **lower** your new rule's specificity (rely on inheritance) instead of reordering. `!important` does NOT fix it (the rule checks specificity, not cascade).

## Background shorthand resets `background-size`
The `background:` shorthand silently resets `background-size` to `auto` — a tile scaled with `21px 100%` reverts to native pixels and renders huge.
- Keep size in the shorthand with the `position / size` syntax: `background: <color> url(…) 0 100% / 5px 100% repeat-x;`
- Verify the computed value: `getComputedStyle(el).backgroundSize` must not be `auto` if you intended scaling.

## `overflow-x: clip` vs `overflow: hidden` (sticky)
`overflow: hidden` on any ancestor creates a scroll container and **breaks `position: sticky`** on descendants.
- Fix: use `overflow-x: clip` — it hides horizontal overflow without creating a scroll container, so sticky still works.
- Verify: `getComputedStyle(document.documentElement).overflowX === 'clip'`.

## `backdrop-filter` glass effect
Three requirements for `backdrop-filter: blur()` to render:
1. **Non-opaque background** — a fully opaque `background-color` hides the blur. Use e.g. `rgb(255 255 255 / 10%)`.
2. **Border on light backgrounds** — without a subtle semi-transparent border the frame is invisible.
3. **Inner radius = `calc(R - P)`** — inner element radius must subtract the frame's padding, or corners bleed.

See also: `css-specificity-eds` (when the computed value still isn't what you set), `vertical-spacing-system` (the sticky/overflow rule).
