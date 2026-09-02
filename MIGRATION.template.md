<!--
  SEED TEMPLATE for a project migration log. On the first task of a migration, copy this
  file to MIGRATION.md at the project root and start filling it in. The LIVE MIGRATION.md
  is project-specific and is NEVER copied between projects (only this template is shipped
  by the guardrail). See AGENTS.md → The Migration-Log Rule.
-->

# <Site Name> → Edge Delivery Services — Migration Log

> **Purpose of this file:** a running, date-ordered record of what we're migrating, where
> we are, what's done, and what's still open. **Read this first** before picking up work —
> it saves you from re-deriving decisions and re-hitting solved bugs. **Keep it updated as
> you go** (newest dated entry at the bottom of the log). Append an entry whenever you build
> or change a block, template, or section, or solve something non-obvious.

---

## 1. What we're doing

Migrating **<source-site-url>** to **Adobe Edge Delivery Services (EDS)** with the goal of
**visual + functional parity across mobile, tablet, and desktop**.

- **Source of truth for design:** the current live site, sampled page-by-page. Reference pages:
  - `/` — <note the homepage's notable layout>
  - `<path>` — <notable template/section/block>
- **Repo / environments:** `<branch>--<repo>--<owner>`
  - Preview: `https://main--<repo>--<owner>.aem.page/`
  - Live: `https://main--<repo>--<owner>.aem.live/`
  - Local dev: `http://localhost:3000` (reflects local uncommitted code)

## 2. Design system (discovered once, up front)

_Fill this from the source site's live rendered DOM — see AGENTS.md → "Discover the source's design system FIRST"._

- **Breakpoints:** see `tools/quality/breakpoints.json` (`<list>` — source `<url>`).
- **Grid / sections:** column count, container max-width + side gutter per breakpoint, column gap, common column spans (`col-4-9`, `col-2-11`, …). → `grid-system`
- **Tokens:** colours, type scale (per breakpoint), spacing rhythm, radius, shadows → `styles/brand.css` / `:root`.
- **Fonts:** families + `@font-face`/fallback metrics (self-host the source faces in `fonts/`).

### Typography validation — steps (LLM: run these to match + enforce the source type scale)

Matching the **font family/files** is only half of it — also verify the per-breakpoint **font sizes**
(`h1..h6`/body). `tools/quality/typography.json` starts with `"scale": {}`, so `check:typography`
skips until you discover the source scale. Once the project is loaded:

1. `npm install` (installs Playwright + Chromium) and `npx aem up` (dev server at localhost:3000).
2. **Match fonts:** for every `@font-face` the source uses, self-host the file in `fonts/` and wire it
   in `styles/fonts.css`. Confirm the repo has **every** face the source references (upright *and*
   italic, all weights) — not just the ones you noticed.
3. **Capture the source scale:** `npm run discover:typography -- <source-url> --write`
   (Playwright reads computed `h1..h6`/body size/line-height/weight/family at every breakpoint) →
   fills `tools/quality/typography.json`. Review before relying on it.
4. **Validate the migrated site:** `npm run check:typography` — fails on any drift; fix the `:root`
   size tokens / heading CSS and re-run until green. Make sure the scale steps at **every** breakpoint
   in `breakpoints.json`, not just one.
5. If `discover:typography` is bot-blocked (Clay/Liferay behind bot protection), add a browser
   User-Agent to `typography-discover.mjs` or run headed. → `typography-system`

## 3. Templates

| Template | Pages it covers | Body class / notes |
|----------|-----------------|--------------------|
| _e.g. blog_ | _/news/*_ | _`template-blog`; …_ |

## 4. Sections & section styles

_Recurring section patterns modelled as generic, block-agnostic section styles (bands, indented-intro, full-width, alternating media+text). Record the style name, what it does, and where it's used._

## 5. Blocks & variants

| Block / variant | Authoring contract (expected content) | Notes / gotchas |
|-----------------|----------------------------------------|-----------------|
| _e.g. cards (feature)_ | _rows of image + heading + text_ | _…_ |

## 6. Open items / TODO

- [ ] _…_

---

## Log (newest at the bottom)

### <YYYY-MM-DD>
- _What was built/changed, decisions made, non-obvious fixes, any rule deviation + justification._
