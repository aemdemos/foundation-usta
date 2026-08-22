---
name: accessibility
description: WCAG 2.1 AA rules for every block and UI in this project, with alt text as the headline rule, plus the axe-core test that mechanically enforces them. Use when building or reviewing any block/UI, adding an image, building a CTA/form/nav/interactive element, or checking heading structure and focus rings. Enforced by npm run test:a11y.
---

Every UI change must meet **WCAG 2.1 AA**, and the rules that a machine can catch ARE caught: `npm run test:a11y <url>` runs axe-core against the rendered page and **fails on missing alt text, contrast failures, bad ARIA, and heading-order errors**. Write it right, then let the test confirm it.

## The Alt-Text Rule (headline — enforced)
- **Content image** → descriptive `alt` that conveys the image's purpose. Not "image", not the filename.
- **Decorative image** → `alt=""` (empty string present, NOT a missing attribute). Missing `alt` is a failure; `alt=""` is the correct way to mark decorative.
- Icon-only links/buttons → give an accessible name via `aria-label` (a `<span class="icon">` has no text).
- axe-core's `image-alt` rule flags any content `<img>` with no `alt` as a **critical/serious** violation → the test fails.

## Recipe (apply on every block, then verify)
1. **Semantic HTML + headings:** one `<h1>` per page, no skipped levels. Use real landmarks (`<nav>`, `<main>`, `<footer>`).
2. **Keyboard:** everything operable with Tab / Enter / Space / Escape (arrows for menus/tabs). No mouse-only or hover-only interactions.
3. **Focus:** visible `:focus-visible` style on every interactive element. **Never `outline: none`** without an equal-or-better replacement (ring ≥ 2px, offset, contrast ≥ 3:1). <!-- rule:a11y-focus-visible -->
   ```css
   .btn:focus { outline: none; }          /* drop default for mouse/touch */
   .btn:focus-visible { outline: 2px solid var(--accent-color); outline-offset: 2px; }
   ```
4. **Contrast:** text ≥ 4.5:1 (≥ 3:1 for large text ≥ 24px/19px-bold); UI borders + focus indicators ≥ 3:1. <!-- rule:a11y-contrast -->
5. **No color-only meaning:** pair color with text/icon/shape (error state isn't red alone).
6. **Labels:** form fields need a real `<label>` — a placeholder is not a label. Use `aria-label` only when there's no room for visible text. Validate on **blur**; put the error **below** the field.
7. **Responsive a11y:** usable at 320px width and 200% zoom with no horizontal scroll or lost function; touch targets ≥ 44×44px.
8. **Verify:** `npm run test:a11y http://localhost:3000/<path>` (or a branch-preview URL). Fix every critical/serious violation before claiming done.

## Design all the interactive states — not just hover
An element with only default + hover is incomplete: keyboard users never see hover. *Decide* each state that applies:

| State | Treatment |
|-------|-----------|
| **Default** | base styling |
| **Hover** | subtle shift, behind `@media (hover: hover)` — never the only affordance |
| **Focus** | visible `:focus-visible` ring (above) |
| **Active** | pressed/darker |
| **Disabled** | reduced opacity, `cursor: not-allowed`, no pointer events |
| **Loading / Error / Success** | for forms and async CTAs — spinner, message-below-field, confirmation |

## The dropdown/overlay clipping bug
The most common generated-code UI bug: a `position: absolute` dropdown/mega-menu inside an ancestor with `overflow: hidden`/`auto`/`scroll` gets **clipped** — the menu is there but cut off/invisible.
- **Fix order:** (1) remove the unnecessary `overflow` on the ancestor if it isn't doing real work; (2) if it must stay, lift the overlay out — `position: fixed` from the trigger's `getBoundingClientRect()`, or the native **Popover API** (top layer, above all overflow). Don't just bump `z-index`.

## Pitfalls
- **Missing `alt` vs `alt=""`** → a missing attribute fails the test; decorative images need the empty string, not deletion.
- **`outline: none` to "clean up" focus** → invisible keyboard focus, an instant AA failure. Replace, don't remove.
- **Hover-only affordance** → invisible to keyboard, sticky on touch. Gate hover to `@media (hover: hover)`.
- **Placeholder-as-label** → disappears on input, unreadable by AT. Use a `<label>`.
- **Dropdown clipped by an ancestor `overflow`** → "the menu doesn't show" — fix the overflow chain or lift to fixed/popover.
- **Testing the pre-decoration DOM** → axe must see the final decorated page; the test waits for `networkidle` so block JS has run.

See also: `responsive-breakpoints` (320px/zoom reflow), `nav-header-eds` (mega-menu clipping + hover/touch in practice), `security` (sanitize injected HTML), `eds-code-conventions` (semantic markup).
