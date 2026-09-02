# EDS Content Import Guide (reusable, project-agnostic)

> A crisp, portable playbook for migrating a source website's pages into AEM Edge Delivery
> Services (EDS) using a **profile-driven, hash-free, selector-based importer**. Distilled from
> real migrations. Copy this into any new project and fill in the `<placeholders>`.
> Nothing here is site-specific — the *values* (selectors, profiles, breakpoints) live in the
> project's own data files, not in this guide.

---

## 0. Mental model (read first)

- **One importer per page-template, not per page.** A "template" = a group of pages that share a
  layout + block vocabulary (e.g. content pages, landing pages, detail pages). Build the import
  infrastructure ONCE per template, then run that SAME script across every page in the template.
  **There is no per-page import script.** Pages that share the *same layout with the exact same blocks*
  all import through the one script — typically a **single shared profile**, or just the **DEFAULT
  profile**. A per-page profile is added ONLY when a page genuinely differs (different block
  subset/order, extra sections, or a new variant); identical-shape pages need no per-page code at all.
- **Blocks emit in SOURCE-DOM order.** Parsers `replaceWith` each block in place, so the *order* of
  a profile's block list doesn't dictate output order — it only controls which selectors compete for
  a match and with what priority. A reordered or subset page "just works" without code changes.
- **Reuse first, build only what's new.** A brand-new page auto-imports via a DEFAULT profile; you
  then add a tuned profile for it. A new *block variant* is the only thing that needs new code.
- **Two locales share one profile** when structurally identical (see §7). Build once, run per URL.
- **Completeness % below ~90 is EXPECTED and fine** — plain rich-text intro/closing sections are
  captured as *default content* but scored as "dropped". Verify by eye, not by the number.

---

## 0a. Required scripts / setup manifest (what to carry into a new project)

The workflow depends on a small, fixed set of scripts. Some ship with the **excat content-import
skill** (external — no need to copy), the rest live in the **repo** (`tools/`). Carry over exactly
these; leave the one-off helpers behind.

### Comes with the excat skill (external — do NOT copy into the repo)
- `run-bulk-import.js` — the import runner. Invoked as
  `node <excat>/skills/excat-content-import/scripts/run-bulk-import.js --import-script <bundle> --urls <urls.txt> --force`.
  Takes a single URL or a small list; you never need a "bulk" run to use it.

### Import infrastructure — repo (`tools/importer/`)
- `import-<template>-v1.js` **+** `import-<template>-v1.bundle.js` — you author per project
  (registry + `B.*` + profiles); re-bundle with esbuild after every edit.
- `transformers/<project>-cleanup.js` **and** `transformers/<project>-sections.js` — generic in
  logic but **project-named**: copy the pair, rename, keep the "cleanup runs before sections"
  ordering. cleanup isolates the content root + relocates out-of-root nav/TOC; sections inserts
  `<hr>` breaks + Section Metadata.
- `parsers/*.js` — one per block variant. Carry over the generic ones you reuse; write a new parser
  only for a genuinely new variant.

### Asset finalize pipeline — repo (`tools/assets/`) — **all 5 travel together**
`finalize-page.mjs` is an **orchestrator**: it shells out to the next four in order, so it is
useless without them.
- `finalize-page.mjs` — the entry point (`node tools/assets/finalize-page.mjs <path> [<twin>]`).
- `fetch-docs.mjs` — download our-host docs → `content/assets/docs/…` + write the manifest.
- `rewrite-doc-links.mjs` — repoint `documents/…` hrefs → **absolute** `…aem.live/assets/docs/…`.
- `rewrite-internal-links.mjs` — same-page `#frag` → absolute aem.live; cross-page same-site → root-relative.
- `fetch-page-images.mjs` — inline `<img>`/`<source>` → `/media-da/…` + rewrite src/srcset.
- `_fetch-docs-curl.mjs` — **fallback** for when the browser-based `fetch-docs` can't run (Chromium
  build mismatch): reads the source's document hrefs from the imported `.plain.html`, `curl`s each, writes
  manifest entries in the exact schema `rewrite-doc-links.mjs` consumes. Keep it — the mismatch is
  common.

### DA publishing — repo (`tools/assets/`) — only when publishing
- `da-upload-docs.mjs` — uploads a page's `/assets/docs/…` binaries (source → preview → live).
- `da-publish.mjs` — wraps the fragment in a full document and publishes the PAGE (source → preview → live).

### Quality gate — repo (`tools/quality/` + `tests/a11y/`)
- `breakpoint-check.mjs`, `overflow-sweep.mjs`, `typography-check.mjs`, `svg-size-check.mjs`
  (+ their `npm run check:*` scripts), the `breakpoint-discover.mjs` / `typography-discover.mjs`
  discovery tools, the `breakpoints.json` / `typography.json` data files (project-specific values),
  and the `tests/a11y/` axe-core runner.

### Data files the importer/finalize read (repo, project-specific values)
- `tools/importer/asset-manifest.json` — source-URL → served-path map (grows as you finalize).
- `tools/quality/breakpoints.json`, `tools/quality/typography.json` — the recorded design system.

### Do NOT carry over (one-off / superseded helpers seen in a mature repo)
`fix-*.mjs`, `relink-refs.mjs`, `rewrite-refs.mjs`, `fetch-assets.mjs`, `probe-dl.mjs` and any
`_probe-*.mjs` — these are page-specific patches or throwaway probes, not part of the core loop.

> **Minimal to import + finalize ONE page:** the excat `run-bulk-import.js` + your
> `import-<template>-v1.(js|bundle.js)` + the two transformers + the parsers you use + all 5 finalize
> scripts (+ `_fetch-docs-curl.mjs`). Add the DA scripts only to publish; add the quality scripts to
> verify.

---

## 1. The importer's shape (`import-<template>-v1.js` + `.bundle.js`)

A single versioned script per template with four parts:

1. **PARSER REGISTRY** — keyed by variant `block.name + '|' + section` (base-name fallback), e.g.
   `hero|diagonal-split`, `cards|contact`, `accordion|table-docs`, `table|specifications`. Adding a
   parser = one import line + one registry line → it's available to **every** profile. This is the
   single source of truth for what the template can decorate.

2. **Reusable block definitions (`B.*`)** — the portable, **HASH-FREE** selectors. Each is
   `{ name, instances: [selectors…], section? }`. A profile picks from these so its block list reads
   as a clean recipe. Match the block **container**, not its children. A selector may match many
   elements → each becomes its own block.

3. **PER-PAGE `PROFILES`** — keyed by URL pathname. Each declares:
   - `blocks: [B.…]` — exactly which blocks that page targets.
   - `sections: [{ id, name, selector, style, anchor, blocks, defaultContent }]` — the per-page
     section map (see §4).
   - `metadataTemplate: '<template>'` — sets the `<body>` template class for page-wide CSS.

4. **DEFAULT profile** — the portable block union + empty sections, so a page with no tuned profile
   still auto-imports as a starting point. Then add a `PROFILES` entry to refine it.

**Transformers** run around the parsers:
- **cleanup** (runs FIRST) — isolates the real content root, drops non-authorable widgets, and
  relocates any out-of-root nav/TOC into the content root.
- **sections** (runs when the profile has ≥2 sections) — inserts `<hr>` section breaks + emits
  **Section Metadata** blocks (`style` + `anchor`/`master-anchor`).

### Selector portability — THE key lesson
Classify each source block's selectors by how stable they are across pages:
- a **stable semantic/structural** class or shape (recurs across pages, sometimes localized) — e.g. a
  hero/card/table class — this is what you want to match on;
- a **volatile per-instance token**, if the source emits one — a hash/suffix/id that is UNIQUE to that
  block on that page and regenerated elsewhere, so a selector built on it matches nothing on another
  page. (Some CMSs add these, some don't; the shape varies — a random hash, a numeric id, etc.)

**Rule:** list each block's selectors **most-portable-first**; the finder takes the first match.
- Tier 1 — stable, locale-stable semantic/structural selector (portable).
- Tier 2 — locale-variant class (e.g. a single-locale class).
- Tier 3 — any volatile per-instance selector (last resort / disambiguator only; omit if none exists).

**Blocks = stable selectors. Sections = the per-page/volatile selectors** (sections are inherently
page-specific and only drive breaks + metadata). Never match a block by a volatile per-page selector.

### Order-independence & subsets
- **Reordered page → works automatically** (output order = source-DOM order).
- **Subset page (missing blocks) → works** (unmatched blocks are skipped with a warning).
- **New/restructured variant → needs a new parser.** Reorder & subset are free; rename/restructure
  are not.

---

## 2. Per-page recipe (the loop)

You run this loop **per page, always through the ONE template script** — you never write a new script
for a page. For each page (and its locale twin):

1. **Measure the LIVE DOM** with a headless browser (see §9): list the content root's top-level
   sections + their hashes, the block set + order, anchor slugs, and **downloadable assets**.
2. **Add/adjust the profile ONLY if the page differs** from what the script already handles. If the
   page has the **same layout + same blocks** as pages already covered, it needs **no new profile or
   code** — the shared/DEFAULT profile imports it as-is; skip to step 3. Add/tune a profile (reuse
   `B.*` and registry entries) only for a different block subset/order or extra sections; add a new
   parser only if a variant is genuinely new.
3. **Re-bundle:**
   `npx esbuild tools/importer/import-<template>-v1.js --bundle --format=iife --global-name=CustomImportScript --outfile=tools/importer/import-<template>-v1.bundle.js`
4. **Import** (single URL or a small list — no need to bulk-run):
   `node <excat>/skills/excat-content-import/scripts/run-bulk-import.js --import-script tools/importer/import-<template>-v1.bundle.js --urls <urls.txt> --force`
   Output → `content/<path>.plain.html`.
5. **Finalize assets:** `node tools/assets/finalize-page.mjs <path> [<twin-path>]` (see §5).
6. **Verify** the rendered page at `localhost:3000/content/<path>` across all breakpoints
   (blocks present, anchors resolve, no horizontal overflow). See §6.
7. **Visual-parity pass** (see §8) — the reviewer compares to the source screenshot; drive fixes with
   MEASUREMENT, not eyeballing.
8. **Downloadable-asset audit + (optional) publish** (see §5, §10).
9. **Back up** the known-good script + manifest (see §11). Log the page in the migration log.

> **Flaky live loads:** the scraper may fall back to `domcontentloaded` before JS-hydrated widgets
> (anchor ribbons, tabs) populate → an empty block that the parser safely unwraps. Just re-run the
> single-URL import until the block appears in the output; a clean (networkidle) load captures it.

---

## 3. Discover the source design system FIRST (once, up front)

Before building any block, capture the **global** design system — the same values recur on every
page. Sample a couple of representative pages (start with the homepage) from the **live rendered
DOM** (computed styles), not static HTML. Record each so it's never re-litigated:

- **Breakpoints** → `tools/quality/breakpoints.json` (mobile-first, `min-width` only; fall back to
  `600/900/1200` if source CSS is unavailable). `npm run discover:breakpoints`.
- **Layout grid** → max content width, side gutter per breakpoint, the master grid's column count +
  gap, and the common column spans content sits on. Build shared `.grid-*` utilities; store the gap
  as `--grid-gap`.
- **Design tokens** → colors, spacing rhythm, radius, shadows, and the **type scale** (h1–h6 + body
  size/weight/line-height *per breakpoint*). Put in `:root`/brand CSS — never per-block.
  `npm run discover:typography` → `tools/quality/typography.json`; self-host the source `@font-face`.
- **Recurring section patterns** → full-bleed bands, colored bands, indented intros, alternating
  media+text. Model as **section styles** (generic, block-agnostic), not baked into blocks.
- **Site-wide affordances** → link/CTA/button styles + hover, download-link treatment, icons,
  accent bars. Decorate globally (in `scripts.js` + `styles.css`), not per block.

**Rule of thumb:** if a value appears on more than one page or block, it's a global token/system —
capture it centrally. Per-block CSS holds only what's genuinely unique to that block.

---

## 4. Sections & Section Metadata

Each profile section entry drives one EDS section:

```js
{ id, name, selector,           // selector = the per-page hash selector for the section div
  style: 'gray' | null,         // → Section Metadata `style` (band bg, width tier, etc.)
  anchor: 'slug' | undefined,   // → Section Metadata `anchor` + `master-anchor` (scroll target)
  blocks: ['hero', …],          // which block(s) live here (documentation/ordering aid)
  defaultContent: [selectors] } // extra divs pulled in as default content
```

- **Section breaks** are inserted before every section except the first, anchored to the section's
  earliest element (a leading heading in `defaultContent` breaks before the heading, not the block).
- **`noBreakBefore: true`** merges a section into the previous one (keep a multi-part band as ONE
  EDS section).
- **Anchors are declared per-section**, not auto-detected — the source often clusters anchor markers
  *between* sections and cleanup strips them. ⚠️ The source anchor marker frequently sits on a
  decorative wrapper that cleanup removes → attach the slug to the adjacent **content** section's
  hash instead.
- **Section styles** are generic and block-agnostic (bands, width tiers, full-bleed escape hatches).
  Section/content width comes from ONE shared grid via column spans — never bespoke per-block
  percentages.

---

## 5. Downloadable assets (do this on EVERY page with download links)

Scan the live content root for download `href`s — by file extension
(`\.pdf|\.docx?|\.xlsx?|\.pptx?|\.zip|download=true`) **plus whatever path prefix the source uses for
downloadable docs** (varies by CMS — e.g. `/documents/`, `/dam/`, `/fileadmin/`, `/media/`; inspect
the source and adjust the pattern).

### Path scheme (assets are CONTENT, not code)
```
content/assets/docs/<page-path>/<normalized-name>.<ext>    ← PDFs / docx / xlsx / pptx / zip
content/assets/media/<page-path>/<normalized-name>.<ext>   ← downloadable images / audio / video
content/media-da/<page-path>/…                             ← INLINE images (travel with page publish)
```
- `<page-path>` = the page the doc is linked on (locale prefix preserved).
- **Only OUR-host docs are downloaded.** Genuinely external hosts are recorded `external:true` and
  left as absolute links.
- **Inline images** (`<img>`/`<source>`) go to `/media-da/…` (the media bus) — NEVER `/assets/media`
  (DA renders inline `/assets/media` images as broken). They ride along with the page publish.

### Naming convention (EDS-safe, normalized)
Lowercase · accents transliterated to ASCII · spaces/`_`/`+` → single hyphen · other specials
stripped · no leading/trailing/double hyphens · real extension kept. Derive the base name from the
embedded `…/<name>.pdf/<uuid>` form when present, else the last path segment.

### Manifest — the source-of-truth for link rewriting
Every download is recorded in `tools/importer/asset-manifest.json`:
`{ page, sourceUrl, servedPath, localPath, normalizedName, bytes, contentType }` (external ones:
`{ page, sourceUrl, external: true }`). This gives source-URL → new-path traceability so links are
rewritten deterministically. **A doc shared across pages/twins is downloaded ONCE** — add a manifest
twin entry for the other page pointing at the SAME `servedPath`.

### Link rewriting (critical DA detail)
Rewrite each doc `<a href>` to an **ABSOLUTE** `https://<branch>--<repo>--<owner>.aem.live/assets/docs/…`
URL — **not** root-relative. DA's path sanitizer strips the `.pdf` off relative internal links (treats
them as page paths → 404); an absolute URL is left intact so the real extension survives.

### `finalize-page.mjs` — the ordered post-import pipeline (idempotent)
1. fetch-docs — download our-host docs → `content/assets/docs/…` + manifest.
2. rewrite-doc-links — repoint `documents/…` hrefs → absolute `…/assets/docs/…`.
3. rewrite-internal-links — same-page `#frag` → absolute aem.live; cross-page same-site → root-relative.
4. fetch-page-images — hotlinked inline images → `/media-da/…` + rewrite src/srcset.

> **Env fallback:** if the browser-based doc fetcher can't run (e.g. a Chromium build mismatch),
> read the the source's document hrefs straight from the imported `.plain.html` and `curl` each with a
> browser UA + Referer, writing manifest entries in the exact schema `rewrite-doc-links.mjs` consumes.

---

## 6. Verify before claiming done (quality gate)

Run and paste real output — never assert a pass from memory:
1. `npm run lint` (JS + CSS). Note: bundled/vendored files and the eslint-ignored `tools/importer`
   dir may show pre-existing noise; judge only YOUR touched files.
2. `node tools/quality/breakpoint-check.mjs` — after any CSS change (mobile-first, `min-width` only).
3. `npm run check:overflow <url>` — any layout/width change (loads each breakpoint; fails on
   horizontal overflow — the tell-tale of content that escaped its column).
4. `npm run check:typography <url>` — any typography/global-CSS change (h1–h6/body must not drift
   from the recorded scale at any breakpoint).
5. `npm run check:svg` — when any committed SVG changed.
6. `npm run test:a11y <url>` — any UI/CSS change (axe-core; alt text, headings, contrast, focus).

> **If a checker genuinely can't run** in the environment (e.g. headless-browser mismatch), say so
> explicitly and verify the underlying concern directly (e.g. via the working preview browser: every
> content image has descriptive `alt`, exactly one `<h1>`, no skipped heading levels, no overflow at
> each breakpoint).

---

## 7. Locales / twins

- A twin (e.g. `/xx/<same-path>`) that is **structurally identical** (same section hashes, same block
  set) **reuses the primary profile** via a locale-strip fallback — give it NO own profile.
- Give a twin its **own profile** ONLY when it differs structurally (different/omitted blocks, extra
  sections). Measure the hashes to decide.
- Import each twin as its own URL run (same script). Docs are often localized (fewer/different files);
  a doc shared between twins is uploaded once (manifest twin entry).

---

## 8. Visual-parity pass (a distinct phase, expected every page)

Import gets the CONTENT in; parity is a separate, measurement-driven loop:
- **Measure the SOURCE live** (don't guess): set viewport, `goto(source)`, wait for hydration, read
  `getBoundingClientRect()` + `getComputedStyle()` of the real box (climb to the actual card/band —
  the first text node's parent is often an inner wrapper).
- **Measure OURS the same way** at `localhost:3000` and diff every value (width, margins, card W/H,
  gap, text position, font size/weight/line-height/family). Aim within ~5px.
- **Check EVERY breakpoint** — fonts especially often have a smaller mobile size. Source width is
  frequently a centered column (e.g. a 10/12 span), not full-band, and often differs from a sibling
  block — measure it, don't assume the tier.
- **Fixes are global/block CSS, scoped to the block/variant — never per-page hacks.** `:has()` is the
  tool for auto-detecting a content shape (e.g. a caption = `p:has(> picture) + p`; a text-only card
  = `li:not(:has(h1..h6))`).
- After each change: re-measure to prove the numbers match, stylelint the file, confirm no overflow
  at every width, and log it. This is a LOOP until parity.

---

## 9. Measuring the live source (probe pattern)

Use the pinned headless browser (the repo's `npm` quality scripts may be on a different Chromium
build). Launch, `setViewportSize`, `goto(url, { waitUntil: 'networkidle' })` with a
`domcontentloaded` fallback, wait a few seconds for JS hydration, then `page.evaluate(...)` to read:
top-level section list + hashes, block signatures (count each candidate selector), anchor slugs +
their targets, downloadable links, and computed styles/rects for parity. Keep probe scripts as
throwaway `tools/importer/_probe-*.mjs` and remove them after.

---

## 10. Publishing to Document Authoring (DA) — outward-facing, on request only

Publishing changes the live site — do it only after local review and when the user asks. No
`Authorization` header is ever sent; credentials are injected via the Settings opt-in. A **401/403
means the opt-in is OFF** — ask the user to enable it in Settings → LLM Permissions (never accept a
pasted token).

- **Page document:** wrap the `.plain.html` fragment in a full `<body><header></header><main>…</main>
  <footer></footer></body>` document, then POST to DA source → preview → live. (Uploading the raw
  fragment renders an EMPTY page.)
- **Download assets** (`/assets/docs/…`): each needs **all three** steps like a page —
  1. POST `admin.da.live/source/{org}/{repo}/assets/…`
  2. POST `admin.hlx.page/preview/{org}/{repo}/{branch}/assets/…`
  3. POST `admin.hlx.page/live/{org}/{repo}/{branch}/assets/…`
  A source upload ALONE 404s on aem.page/aem.live. De-dupe shared assets across the twin pair.
- **Verify live:** `curl -I <aem.live URL>` → `200` + correct content-type for each asset.
- **`/media-da` inline images** ride along with the page publish (page publish does NOT carry
  `/assets` binaries — those are the separate asset step above).
- **Size cap:** the content bus rejects very large files (~25 MB). Compress oversized PDFs before
  upload; track any that can't go as a pending follow-up.

---

## 11. Backup strategy (per known-good page/pair)

After a page (and its twin) passes the gate, back it up so the work is reproducible and never
re-derived:

```
tools/importer/backups/<template>/<page>/
  import-<template>-v1.js           # the exact script that produced it
  import-<template>-v1.bundle.js    # the bundle
  manifest.json                     # see below
```

`manifest.json` records: primary + twin URLs; the profile key used; the ordered block list; the
section map (styles + anchors); download info (counts, filenames, shared-doc notes); inline-image
counts; verification status (viewports checked, a11y); any **source-data quirks kept faithful** (e.g.
a broken link that exists in the source); and any **pending follow-ups** (oversized asset, images to
upload separately). Take a pre-change snapshot before a risky refactor (`backups/pre-<change>-<ts>/`).

---

## 12. Non-negotiables

- **Never hand-edit `content/` to CREATE blocks/HTML** — use the import script + `tools/assets/*`.
  (Small surgical post-import polish — a spacer, splitting a section, removing a stray decorative
  icon, restoring a `<br>` — is OK.)
- **No build step, no runtime deps, native ES modules, `.js` in imports.** Never modify
  `scripts/aem.js`, `head.html`, `package-lock.json`, `node_modules/`.
- **Block-scoped CSS** (`.{block} .part`); no `nth-child` for logic; avoid `!important` (use the
  documented full-width escape hatch). Mobile-first `min-width` only.
- **Alt text:** every content image has descriptive `alt`; decorative images use `alt=""`.
- **Security:** client-side code is public — no secrets; no `eval`/`new Function`; sanitize any
  author/external HTML before `innerHTML`. Never handle pasted credentials.
- **Localization:** no hard-coded user-facing strings — source them from content.
- **Lift-and-shift fidelity:** reproduce the source (breakpoints, grid, type scale, fonts, section
  patterns). Keep genuine source quirks faithful rather than silently "fixing" them; flag them to the
  user instead.

---

## 13. New-project checklist

1. Confirm project type + block-library endpoint; scaffold from the EDS boilerplate.
2. **Discover the design system** (§3) → breakpoints / grid / tokens / typography / fonts recorded.
3. Discover URLs (sitemap/crawl); check live status; group into **templates**; pick representative
   pages per template (richest → prove every parser; lowest → prove plain pages; medium → common case).
4. For the largest template: build `import-<template>-v1.js` (registry + `B.*` + DEFAULT profile),
   prove it on the richest rep page end-to-end (§2), then run the rest of the template.
5. Per page: profile → bundle → import → finalize → verify → visual-parity → asset audit → backup.
6. Move to the next-largest template; reuse the parser/transformer library.
7. Keep a living migration log (design system, per-template/section details, block variants,
   non-obvious fixes, rule deviations + justification) — this guide's companion, project-specific.
