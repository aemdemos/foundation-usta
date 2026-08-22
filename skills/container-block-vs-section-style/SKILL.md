---
name: container-block-vs-section-style
description: Decide whether a UI container pattern (tabs, accordion, carousel, slider) should be an EDS block or a section style. Use when a pattern must wrap a VARIETY of content or REUSE existing blocks (teasers, cards), or when a block's inner content renders unstyled. Trigger phrases "tabs content isn't styled", "should this be a block or section style", "needs to contain teasers/cards", "nested block not decorating".
---

**EDS NEVER runs `decorate()` on a block nested inside another block.** So a container that must hold *real, decorated blocks* (teasers, cards) CANNOT be a block — its inner content would render unstyled. Make it a **section style**: the panels stay top-level blocks (which EDS decorates) and a small JS hook layers the container UI over them.

## The decision
Ask: **does this container need to hold a variety of content, or reuse existing blocks?**

| Answer | Materialize as | Why |
|--------|----------------|-----|
| YES — panels are teasers/cards/mixed content the author composes | **Section style** (`section-<name>`) | Top-level blocks get decorated; author drops any block in; the container is behavior + layout over them |
| NO — the container IS the content, a fixed simple shape (image-only slides) | **Block** | Self-contained, no nested blocks; cheaper to author + test |

- **Tabs / accordion** → usually **section style** (their point is switching between arbitrary rich panels).
- **Carousel / slider of uniform simple items** (image-only cards, logos) → usually a **block**.
- Litmus: "Would an author ever want a *teaser* (or any block) as one panel?" YES → section style. NO → block.

## Recipe — container as a section style
1. **JS hook** (`scripts/section-tabs.js`): `export default (main) => main.querySelectorAll('.section.section-<name>').forEach(decorate)`. In `decorate`, the panels are the section's top-level block wrappers (`[class$="-wrapper"]`, not `.default-content-wrapper`). Build the nav, lift each panel's leading heading into the control label, toggle `[hidden]`/`aria-selected`, add keyboard support.
2. **Wire it** in `scripts.js` `decorateMain()` AFTER `decorateBlocks(main)` — block wrappers exist synchronously from `decorateSections`.
3. **CSS**: generic structure (`[role=tabpanel][hidden]{display:none}`) scoped `.section.section-<name>`.

## Pitfalls
- Building the container as a block "just for now" → its inner teasers/cards never decorate; the fix is structural, not CSS.
- Running the hook before `decorateSections` → no `.section` wrappers yet, nothing matches.
- A media-less panel may render an empty media half → add a text-only fallback class in the block JS.

See also: `eds-content-modeling` (the ladder + section-style-vs-block rule), `debug-block-decoration` (when a nested block isn't decorating), `eds-dom-structure`.
