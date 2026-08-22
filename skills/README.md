# Skills Index

Each skill is a directory with a `SKILL.md` file. Scan the "Load when…" column — if a trigger matches your situation, read that skill in full before proceeding.

**Context budget:** only the "Always load" skills are read every session. All others load on demand via trigger matching. Do not load skills speculatively.

To create a new skill: read `writing-skills/SKILL.md` first, then copy the format. Update this index with every skill change — a skill not listed here may as well not exist.

---

## Always load

| Skill | Load when… |
|-------|-----------|
| [verify-before-claiming](verify-before-claiming/SKILL.md) | **ALWAYS** — before writing "done", "fixed", "implemented", or any completion claim |

---

## Best-practice rules (the enforced ones)

| Skill | Load when… |
|-------|-----------|
| [responsive-breakpoints](responsive-breakpoints/SKILL.md) | Writing or reviewing any CSS media query; a layout needs to adapt across mobile/tablet/desktop; starting a migration (discover & record the source site's breakpoints once); tempted to use `max-width`. Adopt the source site's breakpoints from `tools/quality/breakpoints.json`. Enforced by `tools/quality/breakpoint-check.mjs` |
| [accessibility](accessibility/SKILL.md) | Building or reviewing any block/UI; adding an image (alt text); a CTA/form/nav/interactive element; heading structure; a focus ring. Enforced by `npm run test:a11y` |
| [svg-assets](svg-assets/SKILL.md) | Adding an icon or inline SVG; committing an SVG under `icons/`; an SVG asset looks heavy. How SVGs are delivered + the Asset-Size Rule (rasterize oversized SVGs to 2x PNG). Enforced by `npm run check:svg` |
| [security](security/SKILL.md) | Injecting author/external HTML (`innerHTML`); handling user/API/URL input; adding config; anything that could commit a secret or run dynamic code |
| [eds-code-conventions](eds-code-conventions/SKILL.md) | Writing block CSS or JS; reviewing code for EDS standards; naming classes; deciding where code lives |

---

## Layout & CSS mechanics

| Skill | Load when… |
|-------|-----------|
| [eds-dom-structure](eds-dom-structure/SKILL.md) | A CSS selector doesn't match; need to know where EDS puts blocks in the DOM tree; how authored rows become cell divs; looking up an aem.live platform feature |
| [css-specificity-eds](css-specificity-eds/SKILL.md) | A CSS rule isn't applying; computed style shows an unexpected value; a low-specificity selector (`* + *`) is being overridden |
| [vertical-spacing-system](vertical-spacing-system/SKILL.md) | Blocks touch with no gap; sections too far apart; page rhythm is off; `position: sticky` fails due to an ancestor `overflow: hidden` |
| [full-width-escape-hatch](full-width-escape-hatch/SKILL.md) | Setting up the max-width container; a block needs to escape it; tempted to write `!important` on a wrapper; need a full-bleed background |
| [css-pitfalls-eds](css-pitfalls-eds/SKILL.md) | stylelint `no-descending-specificity` error; a background image renders at native size after shorthand consolidation; `position: sticky` breaks under `overflow: hidden`; a `backdrop-filter` glass effect is invisible or its corners bleed |

---

## Nav & header

| Skill | Load when… |
|-------|-----------|
| [nav-header-eds](nav-header-eds/SKILL.md) | Header broken; nav invisible on desktop; mega menu won't animate; sticky not working; transparent header bg bleeds; mobile/desktop state conflicts |

---

## Content modeling

| Skill | Load when… |
|-------|-----------|
| [eds-content-modeling](eds-content-modeling/SKILL.md) | Planning a block's authoring structure; deciding block vs variant vs section style vs page template; naming any of them |
| [eds-content-patterns](eds-content-patterns/SKILL.md) | A CTA link isn't becoming a button; button variant is wrong; an eyebrow isn't styling; `decorateButtons()` not firing (auto-styles) |
| [container-block-vs-section-style](container-block-vs-section-style/SKILL.md) | A container (tabs/accordion/carousel) must hold a variety of content or reuse existing blocks; inner block content renders unstyled; "block or section style?" |
| [page-template-metadata](page-template-metadata/SKILL.md) | One page type needs page-wide styling; need a body-level template class to scope CSS instead of `:has()` or per-block overrides |

---

## Debugging

| Skill | Load when… |
|-------|-----------|
| [debug-block-decoration](debug-block-decoration/SKILL.md) | A block renders wrong DOM (missing/partial/duplicated items) despite correct authored content; or renders differently across environments ("works on prod but not local") |

---

## Quality tooling

| Skill | Load when… |
|-------|-----------|
| [quality-tooling](quality-tooling/SKILL.md) | Verifying a CSS/JS/UI change before claiming done; auditing code against best practices; adding a new mechanical rule — run the deterministic checkers (`tools/quality/breakpoint-check.mjs`, `npm run test:a11y`, `npm run lint`) instead of eyeballing rules |

---

## Meta

| Skill | Load when… |
|-------|-----------|
| [writing-skills](writing-skills/SKILL.md) | Creating a new skill, improving an existing one, or auditing the library |

---

## Native EMA & EDS skills (built-in — for discovery)

These ship with the agent (the `excat:` and `edge-delivery-services:` plugins). They are **not** in `skills/` — invoke them by name. Use them for capabilities this project library doesn't cover (site scope/discovery, page analysis, import infrastructure, nav/footer orchestration, design extraction, Figma, docs lookup). Where a project skill above covers the same ground, **the project skill wins** — load it first.
