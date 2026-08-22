---
name: nav-header-eds
description: EDS nav/header patterns. Use when the header is broken, nav is invisible on desktop, a mega menu won't animate, sticky isn't working, a transparent header background bleeds, or mobile/desktop states conflict.
---

Nav uses `aria-expanded='true'` on desktop (set by `toggleMenu` on init). Mobile CSS like `nav[aria-expanded='true'] .nav-sections { display: block }` also applies on desktop unless you match that specificity in your desktop media queries. Most nav bugs are this specificity collision or an `overflow`-broken sticky.

## Quick fixes
| Symptom | Cause | Fix |
|---------|-------|-----|
| Nav items invisible on desktop | Mobile `display: block` beats desktop `display: flex` | Add `nav[aria-expanded='true']` to the desktop selector |
| Chevrons stack below text | `li` is block-level | `display: inline-flex; align-items: center` on `.nav-item` |
| Arrow on a nav link missing | `li > a::after` but `a` is wrapped in `<p>` | Use `li:last-child a::after` (no `>` before `a`) |
| Mega menu snaps, won't animate | `display: none/flex` toggle can't transition | Use `visibility + opacity + transform` with `transition` |
| Header not sticky | `position: sticky` broken by an `overflow: hidden` ancestor | Use `position: fixed` with `top: var(--nav-top-offset, 0)` |
| Gradient bleeds through open dropdown | Only one element gets the solid bg | Toggle `.nav-open` on BOTH `.nav-wrapper` AND `header` |

## Mega menu animation (transition, don't toggle display)
```css
.nav-mega-panel {
  opacity: 0; visibility: hidden; transform: translateY(-8px);
  transition: opacity .2s ease-in-out, transform .2s ease-in-out, visibility .2s;
  display: flex; overflow: hidden;
}
.nav-item[aria-expanded='true'] > .nav-mega-panel {
  opacity: 1; visibility: visible; transform: translateY(0);
}
```

## Pitfalls
- The nav fragment loads as an ordered list of sections; decorate code maps classes by index — if authored content reorders sections, classes map to the wrong region.
- `position: sticky` silently fails if ANY ancestor has `overflow: hidden` — use `fixed`, or `overflow-x: clip` on the ancestor (see `css-pitfalls-eds`).
- Mobile: a nav-item click handler must guard against mega-panel clicks — `if (e.target.closest('.nav-mega-panel')) return;` — or clicks inside the panel bubble up and close the menu.
- Nav often switches hamburger→full-nav at a *different* breakpoint than the content — use the sanctioned set (`responsive-breakpoints`) but pick the one where the nav actually breaks.

## Verify (after any header/nav change)
The standard a11y gate (`npm run test:a11y`) only scans the page **as first loaded** — it never opens the hamburger or expands the nav, so interactive-state issues (unlabeled controls, focus, contrast in the open menu) slip through. Also run:
```
npm run test:a11y:nav [url]   # opens mobile nav + expands desktop nav, then runs axe
```
Fix any critical/serious violations before claiming the nav change done (`verify-before-claiming`).

See also: `css-specificity-eds` (the `aria-expanded` specificity issue), `css-pitfalls-eds` (sticky/overflow), `accessibility` (focus, hover-vs-touch, dropdown clipping, the 8 interactive states).
