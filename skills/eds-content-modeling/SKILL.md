---
name: eds-content-modeling
description: The decision framework for modeling authored content in EDS — a small set of baseline blocks expanded by variants, section styles, and page templates. Use when planning a block's authoring structure, deciding block vs variant vs section style vs template, or naming any of them.
---

Keep a **small set of baseline blocks**; expand with variants, section styles, and templates. Escalate only when a lower rung can't express it — lower rungs are cheaper to author and test. Goal: minimize the variant × section-style × template test matrix.

## The ladder (escalate only when the lower rung can't express it)
1. **Foundation — default content + brand styles.** Type scale, body text, images, links, and the vertical-margin system (zero authoring). Build this solid first — see `vertical-spacing-system`.
2. **Content-driven defaults (auto-styles).** Combinations of default content that decorate predictably (link emphasis → CTA button, small-text-before-heading → eyebrow). Must never surprise the author.
3. **Blocks.** Semantic units the author reaches for deliberately.
4. **Block variants.** A CSS/JS toggle over the *same* content structure.
5. **Section styles.** Styling that spans multiple blocks AND default content.
6. **Page templates.** Page-wide changes; create conservatively.

## Naming convention (lowercase kebab-case; the prefix tells you the kind)
| Kind | Pattern | Class lands on | Examples |
|------|---------|----------------|----------|
| **Block** | `noun` — semantic, context-free | block element | `teaser`, `carousel`, `cards`, `tabs` |
| **Block variant** | `<block>-<adjective>` | block element | `carousel-compact`, `teaser-reverse` |
| **Universal variant** | `<property>-<value>` (bare) | block element | `spacing-top-small` |
| **Section style** | `section-<name>` | section wrapper (Section Metadata) | `section-dark`, `section-centered` |
| **Page template** | `template-<page-type>` (metadata value) | `<body>` | value `template-blog` → `body.template-blog` |

- **Block names are semantic meaning**, never appearance/context — `teaser`, not `video-promo-teaser`. Content decides it's a video; a variant decides the look.
- **Keep variant/style names short for the author** — `dark`, `reverse`, `compact`, not `dark-card-with-inverted-buttons`.
- **Section styles always carry `section-`**; background-color styles are mutually exclusive.

## Blocks vs variants
- Prefer reuse + variants over new blocks. New block only when the structure is fundamentally different or a variant needs >50% new JS/CSS.
- A variant is a class toggle over the **same content structure**. Different row/cell layout = different block, not a variant.
- **Reuse before inventing** — reproduce the target look with existing blocks/variants/section-styles first; add new only for what they genuinely can't express.

## Variant vs new content shape
A **variant** = a different *look* of the same content. Feeding a block a content combination it hasn't handled (e.g. an image-only teaser) is NOT a variant — handle it by **adding additive rules to the base block's CSS/JS**. Litmus: "Is the difference *how it looks* (→ variant) or *what content it contains* (→ extend base)?"

## Section styles — which surface does the color touch?
- Color on the **inside of the block** (its card background, its text) → **block style/variant** (`teaser-dark`).
- Color on the **surface the block sits on** (the section background behind everything) → **section style** (`section-dark`).
- Section styles suit anything that spans multiple blocks AND that default content should also get (background color, a shared multi-column layout).

## Content ownership — content vs code
- **Anything translatable or author-managed lives in the content** (`.plain.html`), never injected by JS/CSS. Litmus: "Would an author or translator ever edit this?" → yes = content.
- Block JS may build DOM *structure*; the words/links come from authored content (exception: functional labels like "Previous slide").
- CSS may add *decorative* imagery; any image carrying author-managed meaning (logo, product shot) is content.

## Pitfalls
- A variant that needs a different content model is a different block.
- Section Metadata must be the LAST element inside its section div.
- Missing source content at import time → leave empty, don't invent.
- Reaching for a template/variant when default content + an auto-style would do.
- Columns are expensive for authors — prefer 1–2; 3–4 only with a strong reason.

See also: `eds-dom-structure` (where classes land), `vertical-spacing-system` (the foundation rung), `eds-code-conventions` (naming + scoping).
