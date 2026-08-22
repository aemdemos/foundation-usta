---
name: page-template-metadata
description: Apply page-wide styles in EDS via a template metadata class on <body>. Use when one page type needs different styling from another and you need a body-level class (e.g. body.template-blog) to scope CSS — instead of :has() or per-block overrides.
---

EDS reads `<meta name="template">` and applies its value as a class on `document.body` (via `decorateTemplateAndTheme()`). A page template is the top rung of the ladder in `eds-content-modeling` — the *when-to-create* decision matters more than the mechanism.

## When to create a page template (be conservative)
- Only when **many things change together** page-wide, so one template replaces a pile of per-block variants + section styles the author would otherwise apply by hand (e.g. a blog template that auto-blocks the header AND restyles carousel/tabs for blog pages).
- It should be **obvious** — a clearly distinct page type. A **single** page-wide difference (just a background) is a section style, not a template.
- **Keep the count low.** Climb back down the ladder (section style, variant, auto-style) before adding a template.

## Recipe
1. **Author the Metadata block in content — the PRIMARY mechanism**, as its own top-level section:
   ```html
   <div><div class="metadata">
     <div><div>template</div><div>template-blog</div></div>
   </div></div>
   ```
2. EDS adds the value verbatim as a body class → `body.template-blog`.
3. Use `body.template-blog main` in CSS for page-specific styles.
4. **If the page is re-imported, the importer must EMIT this metadata** — else a re-import silently drops the template and the page loses its look.

## Stacked templates (comma-split)
The metadata value is comma-split into multiple body classes: `template: template-dark, template-blog` → `body.template-dark.template-blog`. Layer a **generic single-concern template** (`template-dark` that only inverts colors, reusable by any page) under a thin page-specific one.

## Pitfalls
- **Fallback-only template = fragile.** A body class added only by a `scripts.js` selector fallback breaks the day that selector changes and a re-import won't restore it. Prefer authored metadata as the source of truth.
- The authored Metadata block is consumed by EDS (removed from DOM) — if you see "template template-blog" as visible text, the cell structure is malformed.
- `:has()` has limited support — prefer body classes via metadata.
- Reaching for a template when a section style would do.

See also: `eds-content-modeling` (the full ladder + template-vs-section-style decision), `eds-dom-structure`.
