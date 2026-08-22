---
name: full-width-escape-hatch
description: The global max-width container constraint and the full-width escape hatch. Use when setting up the container/centering pattern, a block needs to escape max-width, you're about to write !important on a wrapper, or you need a full-bleed background.
---

Never use `max-width: none !important` or `padding: 0 !important` on block wrappers. A `.full-width` utility class handles full-bleed globally and cleanly — it's the one sanctioned exception to the no-`!important` rule.

## The container constraint (where max-width lives)
Sections (`main > .section`) have NO max-width — they span the viewport so backgrounds bleed edge-to-edge. The constraint goes on the block wrapper div:
```css
main > .section > div {
  max-width: var(--container-max-width);
  margin: auto;
  padding: 0 var(--container-padding);
}
```

## Recipe — opt a block out
```js
// In the block's decorate() function:
const wrapper = block.closest('[class$="-wrapper"]');
if (wrapper) wrapper.classList.add('full-width');
```
In `styles.css` (defined globally once — do NOT repeat in block CSS):
```css
main > .section > .full-width { max-width: none; padding: 0; }
```

## When to use
- A block needs viewport-width bleed (marquee, announcement bar, video hero).
- A section background color must reach the viewport edge.
- Any time you're tempted to write `max-width: 100% !important`.

## Pitfalls
- Setting `.full-width` on the block itself, not the `-wrapper` — it must be on the `-wrapper`.
- Repeating the `.full-width` CSS rule in a block's own CSS — it's global, don't duplicate.
- Blocks without a `decorate()` JS file need a minimal one added to set the class.

See also: `eds-code-conventions` (no-!important rule), `eds-dom-structure` (wrapper chain), `css-specificity-eds`.
