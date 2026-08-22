---
name: css-specificity-eds
description: Diagnose why a CSS rule isn't winning in EDS — block wrappers carry !important on padding/max-width, and attribute selectors like [aria-expanded] outrank plain classes. Use when a rule isn't applying, the computed style shows an unexpected value, or a low-specificity selector (e.g. `* + *`) is being overridden.
---

EDS block wrappers carry `!important` on `padding` and `max-width`. Attribute selectors (`[aria-expanded='true']`) add specificity that beats plain class selectors. When a rule "doesn't work," it's usually losing a specificity contest, not failing to load.

## Debugging recipe
1. Inspect the element's computed style in the browser.
2. Find which rule IS winning — look for `!important`, attribute selectors, or longer class chains.
3. Match or exceed that specificity in your fix (don't reach for `!important`).

## Common fixes
| Problem | Why it fails | Fix |
|---------|-------------|-----|
| Block-spacing `* + *` margin overridden | A class rule on the same element beats `main > .section > * + *` | Keep the `main > .section >` descendant chain, or override with an equally-specific selector |
| Desktop `display: flex` overridden | `[aria-expanded='true']` has higher specificity | Include the attribute selector in your desktop rule too |
| Block wrapper ignores your padding | Wrapper has `padding: 0 !important` | Use margin on the wrapper, or padding on an inner element |

## Pitfalls
- Reaching for `!important` to win — raise specificity properly instead (project rule: no `!important`; use `.full-width` for the one legitimate case — see `full-width-escape-hatch`).
- Switching a selector to `[class$="-wrapper"]` to "win" — changes what you're targeting; keep the descendant chain.

See also: `eds-dom-structure` (the wrapper chain), `full-width-escape-hatch` (the sanctioned max-width override), `eds-code-conventions` (no-!important rule).
