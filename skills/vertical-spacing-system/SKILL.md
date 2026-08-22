---
name: vertical-spacing-system
description: EDS vertical spacing — section padding plus the `* + *` block-margin rule and section/block spacing variants. Use when blocks touch with no gap, sections are too far apart, page rhythm is off, or position:sticky fails because an ancestor has overflow:hidden.
---

The foundation of a harmonious page (rung 1 in `eds-content-modeling`): a default vertical-margin system that needs zero authoring. Sections use **padding** for vertical rhythm; blocks/elements are spaced by **`margin-top` on the universal `* + *` sibling selector**. First/last child margins are zeroed so section padding owns the edges.

## The pattern (styles.css)
```css
main > .section { margin: 0; padding: var(--section-padding) 0; }
main > .section > * + * { margin-top: var(--block-padding); }
main > .section > *:first-child { margin-top: 0; }
main > .section > *:last-child { margin-bottom: 0; }
```
Two tokens drive it: `--section-padding` (section rhythm) and `--block-padding` (between siblings), each with a smaller value below the mobile breakpoint. Define the values once in `:root`.

## Universal block spacing variants (via block class name)
Apply to ANY block by adding the class in authoring (e.g. `Carousel (spacing-top-small)`):
`spacing-top-none/small/large`, `spacing-bottom-none/small/large` — use a `:has()` selector to reach from wrapper to block. Define once globally; never duplicate per-block.

## Pitfalls
- `main > .section > div { margin: auto }` overrides `* + *` because `div` outranks `*` — use `margin-left: auto; margin-right: auto` instead.
- Block CSS must NOT set `padding-top/bottom` on the section container — the global rule handles it.
- `overflow: hidden` on `html/body` breaks `position: sticky` — use `overflow-x: clip` instead.

See also: `eds-content-modeling` (the ladder), `eds-dom-structure`, `full-width-escape-hatch`, `css-specificity-eds`.
