---
name: content-import
description: How to import a source site's pages into EDS — a profile-driven, hash-free, selector-based importer built ONCE per page-template, plus the finalize-assets pipeline, locales/twins, backups, and DA publishing. Use when importing/migrating pages, writing an import script/parser/profile, wiring downloadable assets, or setting up import infrastructure for a new project. Full playbook: IMPORTING-GUIDE.md (same folder).
---

Content import is its own discipline with a repeatable shape. The full, step-by-step playbook lives
next to this file — **read [`IMPORTING-GUIDE.md`](IMPORTING-GUIDE.md) in full before building import
infrastructure.** This SKILL is the load-bearing summary + the rules that must not be violated.

The actual import runner comes from the **excat content-import skill** (external); the per-project
`import-<template>-v1.(js|bundle.js)`, transformers, parsers, and `tools/assets/*` finalize scripts
are **authored per project** (the guide is the recipe). This guardrail owns the *methodology*.

## Mental model (the load-bearing ideas)
- **One importer per page-TEMPLATE, not per page.** A template = pages sharing a layout + block
  vocabulary. Build the infra ONCE, run the SAME script across every page in the template. **There is
  no such thing as a per-page import script.** If a set of pages share the *same layout with the exact
  same blocks*, they all import through that one script — often a **single shared profile** (or just
  the **DEFAULT profile**); you add a per-page profile **only** when a page actually differs (different
  block subset/order, extra sections, or a new variant). Same-shape pages need **no** per-page code.
- **Profile-driven + hash-free + selector-based.** A per-template script holds: a **parser registry**
  (keyed `block.name|section`), reusable **`B.*` block definitions** (hash-free selectors), per-page
  **profiles** (which blocks + the section map), and a **DEFAULT profile** so a new page auto-imports.
- **Blocks emit in source-DOM order** — a profile's block order doesn't dictate output; reordered or
  subset pages "just work". Only a genuinely new/restructured **variant** needs a new parser.
- **Reuse first, build only what's new.** Two structurally-identical locale twins share one profile.
- **Completeness % below ~90 is EXPECTED** — plain rich-text intros/closings score as "dropped" but
  are captured as default content. **Verify by eye, not by the number.**

## Selector portability — THE key lesson
Prefer **stable, structural/semantic selectors** that recur across pages; avoid any selector the
source regenerates per page. Many source CMSs add a **volatile per-instance token** to class names
(e.g. a random hash/suffix unique to that block on that page) — a selector built on it matches
nothing on the next page. List each block's selectors **most-portable-first** (stable semantic →
locale-variant → any volatile per-instance token last, only as a disambiguator; if the source has
none, that tier is moot). **Blocks = stable selectors; Sections = the per-page/volatile selectors**
(sections are inherently page-specific — they only drive `<hr>` breaks + Section Metadata). **Never
match a block by a volatile per-page selector.**

## The loop — run per page, but ALWAYS the same template script (see guide §2)
"Per-page" means you *process* each page through the SAME script — not that you write a script per
page. For each page: measure the LIVE DOM → **only if it differs**, add/adjust a profile (reuse
`B.*`/registry; new parser only for a genuinely new variant) — **same-shape pages skip this entirely**
→ re-bundle (esbuild) → import (single URL is fine) → **finalize assets**
(`tools/assets/finalize-page.mjs`) → verify at every breakpoint → visual-parity pass → asset audit →
**back up** the known-good script + manifest → log the page in `MIGRATION.md`.

## Downloadable assets (every page with download links — guide §5)
- Our-host docs → `content/assets/docs/<page-path>/…`; inline `<img>` → `content/media-da/…` (NEVER
  `/assets/media` — DA renders those broken); external hosts recorded `external:true`, left as-is.
- Record every download in `tools/importer/asset-manifest.json` (source-URL → served-path); a doc
  shared across twins is downloaded ONCE.
- **Rewrite doc links to ABSOLUTE** `https://<branch>--<repo>--<owner>.aem.live/assets/docs/…` — not
  root-relative (DA strips `.pdf` off relative internal links → 404).

## Non-negotiables specific to import (the rest are the standard project rules)
- **Never hand-edit `content/` to CREATE blocks/HTML** — use the import script + `tools/assets/*`.
  Small surgical post-import polish (a spacer, splitting a section, a stray icon) is OK.
- **Lift-and-shift fidelity** — reproduce the source; keep genuine source quirks faithful (flag them
  to the user) rather than silently "fixing" them.
- **DA publishing is outward-facing — on request only**, after local review. A 401/403 means the
  Settings opt-in is off; ask the user to enable it, never accept a pasted token. Page doc + each
  `/assets/docs/…` binary each need source→preview→live.

## Verify (reuses the standard gate — guide §6)
`npm run lint`, `breakpoint-check`, `check:overflow`, `check:typography`, `check:svg`, `test:a11y` —
paste real output; if a checker genuinely can't run, say so and verify the concern directly.

See also: `eds-content-modeling` (block vs variant vs section style vs template), `eds-dom-structure`
(section/block DOM), `grid-system` · `responsive-breakpoints` · `typography-system` (the design
system the import must reproduce), `verify-before-claiming`, `quality-tooling`. Discovery of the
source design system happens FIRST (AGENTS.md → "Discover the source's design system FIRST").
