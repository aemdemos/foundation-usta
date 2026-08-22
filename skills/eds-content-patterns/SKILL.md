---
name: eds-content-patterns
description: How EDS runtime decoration turns authored HTML into auto-styles — content combinations that decorate predictably without a block (strong/em link → CTA button, small-text-before-heading → eyebrow). Use when a CTA link isn't becoming a button, the button variant is wrong, an eyebrow isn't styling, or decorateButtons() isn't firing. For which style to author, see eds-content-modeling.
---

EDS transforms authored HTML patterns into decorated elements at runtime — **auto-styles** (rung 2 of the ladder in `eds-content-modeling`): combinations of *default content* that style predictably with no block. Keep the trigger conditions tight so they never fire unintentionally.

## CTA button decoration
The element wrapping the link picks the button variant:
```html
<p><strong><a href="…">Get started</a></strong></p>   → .button.primary
<p><em><a href="…">Learn more</a></em></p>            → .button.secondary
<p><strong><em><a>Try now</a></em></strong></p>        → .button.accent
<p><a href="…">Plain link</a></p>                      → stays a link (no button)
```

## Eyebrow auto-style
A short paragraph immediately *before* a heading is the eyebrow. Fire it with an adjacency selector so a normal paragraph never becomes one:
```css
.default-content-wrapper > p:has(+ h2),
.default-content-wrapper > p:has(+ h3) { /* eyebrow styling */ }
```

## Why a link isn't becoming a button
1. **Missing wrapper** — the `<a>` must be inside `<strong>` or `<em>` inside a `<p>`.
2. **Extra text in the paragraph** — `decorateButtons()` skips if the `<p>` contains text besides the link (`p.textContent.trim() !== linkText`).
3. **`:only-child` false match** — CSS `:only-child` ignores text nodes; use JS `p.textContent.trim() === a.textContent.trim()` instead.

## Pitfalls
- Block JS must not strip button formatting — style `.button` within the block's CSS scope.
- EDS runs `decorateButtons()` globally during load; a block that injects new content later must call it explicitly on that content.
- Font family names must NOT be quoted (`font-family: Inter, sans-serif`); vendor prefixes fail `property-no-vendor-prefix`.

See also: `eds-content-modeling` (choosing the CTA type / when to auto-style), `css-specificity-eds` (specificity issues).
