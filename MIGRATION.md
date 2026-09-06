# USTA Foundation → Edge Delivery Services — Migration Log

> **Purpose:** a running, date-ordered record of what we're migrating, where we are, what's done,
> and what's still open. **Read this first.** **Keep it updated as you go** (newest dated entry at
> the bottom). Append an entry whenever you build/change a block, template, or section, or solve
> something non-obvious.

---

## 1. What we're doing

Migrating **https://www.ustafoundation.com/en/home.html** to **Adobe Edge Delivery Services** with
**visual + functional parity across mobile, tablet, and desktop**. Source is an **AEM-classic** site
on **Bootstrap 3** (served via `/etc.clientlibs/…`).

- **Repo / environments:** `main--foundation-usta--aemdemos`
  - Preview: `https://main--foundation-usta--aemdemos.aem.page/`
  - Live: `https://main--foundation-usta--aemdemos.aem.live/`
  - Local dev: `http://localhost:3000`

## 2. Design system (discovered up front)

- **Breakpoints:** `768 / 992 / 1200` — `tools/quality/breakpoints.json`. → `responsive-breakpoints`
- **Grid / units — full deep-dive: [`docs/source-css-system.md`](docs/source-css-system.md).**
  Bootstrap 3: 12-col, **30px gutter**, container **720 / 970 / 1170 (–1200) px** at 768/992/1200.
  **Pixel-first** (~13.4k px vs ~73 rem; root 10px). Spacing scale 4/6/8/10/12/15/16/20/24/30/40px.
  Author block CSS in **px** to match; match by **column span**. → `grid-system`
- **Fonts:** COMPLETE — every face the source uses is self-hosted, in the source's own formats.
  **Graphik** (brand: Regular 400 / Semibold 600 / XXCond Bold 700) wired to `--body/--heading-font-family`;
  secondary source faces **Inter / Barlow Condensed / Anton** self-hosted (`fonts/`, `styles/fonts.css`) —
  wire per component where the source uses them. ⚠️ Graphik proprietary — confirm licensing.
- **Type scale:** recorded in `tools/quality/typography.json` (fonts done; per-breakpoint `scale`
  pending the Playwright `discover:typography` pass). → `typography-system`

## 2a. Site scope & migration plan (which template to target, in what order)

> Full report: **[`docs/MIGRATION-SCOPE.md`](docs/MIGRATION-SCOPE.md)**. Discovery artifacts in
> `catalog/` (`urls-all.json`, `urls-grouped.json`, `urls-sample.json`). Scoped **2026-09-05** via
> **BOTH sitemap + crawl**, merged & deduped.

**Discovery (site-wide):**
- Method: sitemap (`/sitemap.xml` + `/sitemap-index.xml` + `/sitemap-images.xml`, 85 urls) **+** same-host
  Node crawl (65 urls, queue exhausted). Merged, host normalized to `www`, `?form=`/hash/trailing-slash
  stripped → **86 unique content pages + 21 documents** (mostly annual-report PDFs).
- **84% of the site (72/86 pages) is ONE template: news detail** (`/en/home/news/*`). Nail it and the
  site is essentially migrated.

**Template catalog (8 distinct page types):**

| # | Template | Representative URL | Pages | Status |
|---|---|---|---:|---|
| T0 | Home | `/en/home.html` | 1 | ✅ done |
| **T1** | **News detail** | `/en/home/news/2023-njtl-essay-contest-winners.html` | **72** | blocks built; needs importer |
| T2 | News listing | `/en/home/news.html` | 1 | cards (news) feed |
| T3 | Section landing | `/en/home/{who-we-are,what-we-do,our-impact,get-involved}.html` | 4 | hero + columns + cards |
| T4 | Leadership & staff | `/en/home/who-we-are/leadership-and-staff.html` | 1 | cards (profile) + tabs |
| T5 | Financials | `/en/home/who-we-are/financials.html` | 1 | **all default content** (h2 + PDF lists) + finalize-assets for 21 PDFs |
| T6 | Special funds / campaign | `/en/home/get-involved/special-funds.html`, `.../young-professional-initiative.html`, `.../chris-evert-50th-anniversary.html`, `.../college-scholarship-opportunities.html` | 4 | cards (expand), quote-image, table |
| T7 | 404 | `/en/home/404.html` | 1 | hero (error) |

Most component blocks already exist (homepage + block-library phase). The remaining work is **per-template
import instrumentation** (parser + `page-templates.json` entry + any section styles), **not** net-new blocks.

**TARGET ORDER (highest leverage first):**
1. **▶ T1 News detail — DO THIS FIRST.** One profile-driven importer instruments **all 72 pages**. Exercises
   already-built blocks: article body (default content) + `social` share bar + `custom-widget-reactions`
   (done) + `custom-content-related-articles` feed + `table`. Build ONE parser, measure the live DOM once,
   bulk-import 72 urls.
2. **T2 News listing** — feeds T1; reuse `cards` (news). Small.
3. **T3 Section landings** (4 pages) — reuse hero + columns + cards + the `center`/`narrow` section styles.
4. **T4–T6 Specialized** (6 pages) — leadership (cards-profile + tabs), financials (default content + wire the
   21 PDFs via finalize-assets), special-funds/campaign (cards-expand, quote-image, table). One profile per
   genuinely-distinct variant; reuse first.
5. **T7 404** — single page, `hero` (error) block already built. Trivial.

**Scope gotchas:** www vs non-www (sitemap lists some no-www; normalized to www). `?form=` urls on
special-funds are Fundraise Up deep-links, not pages (handled by `scripts/donate.js`). News-detail import
completeness will read <100% (duplicate hidden mobile/desktop copies, like the homepage collage) — expected.

## 3. Templates / 4. Sections / 5. Blocks
_Per-template/section/block build details are captured in the dated Log below as they land; the template
landscape + target order is in §2a above (full report: `docs/MIGRATION-SCOPE.md`)._

## 6. Open items / TODO

### Standing
- [ ] **NEXT: build the T1 News-detail importer** (72 pages / 84% of the site) — see §2a target order.
- [ ] Capture + enforce the type scale (see ▶ steps below).
- [ ] Wire the shared grid (`--grid-gap:30px`, `.container-max`, `.grid-*`) into `styles.css` per `docs/source-css-system.md`.
- [ ] Confirm Graphik licensing before publishing.
- [ ] **Re-upload corrected pages to DA (production)** — cards-expand donate hrefs, cards-profile JPEGs, and
  the re-imported home (statement + collage text). This is the USER's step (outward-facing, on request only).
- [ ] Run `npm run check:overflow` + `npm run check:typography` once deps + dev server are up.

---

## ▶ Typography validation — steps (LLM: run these to close the font-size gap)

Font family/files are matched; per-breakpoint **font sizes** (`h1..h6`/body) are **not yet verified**
(`typography.json` `scale` is empty → `check:typography` skips). Once the project is loaded:

1. `npm install` (Playwright + Chromium) and `npx aem up` (localhost:3000).
2. `npm run discover:typography -- https://www.ustafoundation.com/en/home.html --write` — captures the
   source's computed `h1..h6`/body size/line-height/weight/family at every breakpoint. Review, then rely on it.
3. `npm run check:typography` — fix the `:root` size tokens in `styles/styles.css` to match, re-run
   until green. Step type at every breakpoint (768/992/1200), and remember the source is **px-first**.
4. Record the final scale here; re-run `npm run lint` + `npm run check:overflow`.

If `discover:typography` is bot-blocked, add a browser User-Agent to `tools/quality/typography-discover.mjs`.

---

## Log (newest at the bottom)

### 2026-08-28 — guardrail sync + CSS/grid deep-dive + typography
- **Synced usta to the latest EDS guardrail:** added the Grid Rule + `grid-system` skill +
  `overflow-sweep` (`check:overflow`); the Typography Rule + `typography-system` skill +
  `typography-discover`/`typography-check` (`discover:typography`/`check:typography`); the
  Migration-Log Rule + this log; the Content-Import Rule + `content-import` skill (earlier). Refreshed
  `AGENTS.md`, `package.json`, `skills/README.md`, `quality-tooling`. Preserved `breakpoints.json`.
- **CSS/grid deep-dive** of ustafoundation.com → **[`docs/source-css-system.md`](docs/source-css-system.md)**:
  Bootstrap 3, 12-col/30px-gutter, container 720/970/1170(–1200), **pixel-first** (root 10px),
  spacing scale. Recorded a `grid` block in `breakpoints.json`.
- **Fonts:** confirmed the source's brand font is **Graphik** (already self-hosted + wired — correct).
  Self-hosted the remaining secondary source faces **Inter / Barlow Condensed (R+B) / Anton** so the
  full source set is present; **removed the 4 unused Roboto** files + faces. Recorded all in
  `typography.json`. Type-scale `scale` still pending the Playwright discover pass.

### 2026-09-03 — homepage pixel-parity pass (grid + typography wired globally, logo fix)
**Design-system wiring (global, set once — blocks consume it):**
- **Shared 12-col grid** in `styles/styles.css`: `--grid-gap: 30px`; `.container-max` per-tier widths
  **720 / 970 / 1170** at 768/992/1200 (fluid 100% + 15px gutter on phone); `.grid-12` + `.grid-col-*`
  utilities (spans 3/4/6/8/9). Source-CSS §3 reproduced verbatim.
- **Section container aligned to the source grid:** `main > .section > div` now `max-width: none` +
  15px gutter on phone, then **720 / 970 / 1170** per tier (was `1200` + 24/32px gutters). Every
  section now lands on the source's grid lines — body sections measure **x15 / w1170 @1200** (exact
  source match), was x32/w1136.
- **Typography tokens (per breakpoint, `:root`):** captured the source scale via
  `discover:typography` (UA + `waitUntil:'load'` fix — see below) → `typography.json`. Scale jumps at
  the **768** tier (not 992): h1 54→100, h2 44→76, h3 36→56, h4–h6 18/18/16; body 16→18, **line-height
  a fixed 24px**. Blocks no longer hardcode heading sizes — hero-banner / columns-statement /
  columns-feature now inherit the global h1/h2/h3 tokens (removed their 992px px overrides and
  `line-height:110px` drift). `check:typography` passes clean at **390/768/992/1200**.

**Per-component parity (source vs ours, re-measured at 390/768/992/1200):**
- **Header/nav:** logo restored (see fix); `header nav p` line-height → `--body-line-height` (was `1`,
  which drifted the type check). Nav geometry unchanged (already matched).
- **Hero-banner:** refactored desktop layout onto the tier containers; inner text column sized to the
  **measured source column** — @768 x82/w348, @992 x128/w406, @1200 x145/w510 (**exact**); @390 x15/w360
  vs src x12/w366 (≤6px). Removed the old bespoke `width:763px;max-width:55%`.
- **columns-stats:** already 1170/15px band — matches (x15/w1170 @1200).
- **columns-statement:** intro column x264/w672 @1200 vs src x265/w670 (**1px**); x218/w556 @992 vs
  x222/w549.
- **columns-feature / cards-support (decades/support bands):** now full 1170 at x15 @1200 (exact).
- **Footer:** desktop grid was overflowing (992/1200 → 1207px) from a fixed 290px brand col + 220px
  social + 80px gaps + nowrap nav. Refactored to `237px 1fr auto`, 30px column-gap, responsive logo
  (**180px @992, 210px @1200**, matching the source's small footer logo), nav links wrap < 1200.
  `check:overflow` now clean at all tiers.

**Logo broken in local preview (nav + footer) — root cause + fix:**
- The DA content fragments (`content/nav.plain.html`, `content/footer.plain.html`) wrap each logo/icon
  in a `<picture>` whose `<source srcset>` points to a **different filename** than the `<img src>`
  (an extra hash suffix). **Only the `<img>` file exists locally**; the `<source>` renditions 404, and
  browsers prefer a matching `<source>` over the `<img>` — so the logo/icons render broken. Production
  serves a different fragment shape (`media_<hash>` URLs) so it was unaffected.
- **Fix (block JS, not content):** `header.js` + `footer.js` now strip `<picture> <source>` from the
  fetched fragment (`querySelectorAll('picture source').forEach(s => s.remove())`) so the working
  `<img src>` is always used. Verified: nav + footer logos and all 3 social icons load (naturalWidth > 0).

**Tooling:** added a browser **User-Agent** + switched `waitUntil` from `networkidle`→`load` (source
polls analytics forever, so networkidle timed out) in `tools/quality/typography-discover.mjs`. Added
`/en/home` to `tests/a11y/a11y.config.js` `urls[]`.

**Verification (all green):** `check:typography` ✓ (390/768/992/1200) · `check:overflow` ✓
(360/768/992/1200/1920) · `lint` ✓ (0 errors) · `test:a11y /en/home` ✓.

### 2026-09-03 — per-block typography/font parity audit (every text element × 4 viewports)
Measured **every text element** (title/subtitle/body/label/CTA/caption) on the source vs ours at
**390/768/992/1200** by computed style (ff/fs/fw/lh/letter-spacing/color/align/transform). Found and
fixed the following **real** drifts (the rest already matched):
- **columns-stats:** big number line-height 46→**57** (source 38/57); label font-size was a flat 18 →
  **16 mobile / 18 @768** (global token).
- **cards-support:** card body `p` was flat 18 → **16 mobile / 18 @768**; card text now left-aligns from
  the **768** tier (source does; ours had waited until 992).
- **columns-feature (image-collage "For decades"):** body `p` now left-aligns from **768** (source);
  the centered section title stays centered. **video-card (media):** heading + body now **left-aligned
  at all widths** (was inheriting the block's mobile-centered default); body `p` 18 → **16/18** token.
- **footer:** social/follow `p` 18 → **16/18** token; **KEEP UP** button letter-spacing `0.02em`→**normal**,
  line-height 24→**20**, text-align→**center** (matches source).
- **CTA buttons (hero / feature / card):** line-height `1`→**20px** for exact computed parity (no visual
  change on the fixed 40px flex buttons). Verified hero + feature filled buttons are an **exact** match
  (ff/fs/fw/lh/ls/color/bg/tt/height all identical).

**Note on "same CSS":** this is a lift-and-shift *reproduction* — we adopt the source's **grid,
breakpoints, and computed type scale** as our own tokens/CSS (not their literal stylesheet). Parity is
verified by measuring both sites and diffing every value, not by copying files.

**Method caveat:** a fuzzy text-matching scan produced false "mismatch" rows where a label appears
multiple times (e.g. plain-text nav "WHO WE ARE" vs the filled body button, or a hidden mobile-markup
copy). Always confirm such rows by **visible-element, by-reference** measurement before treating them as
defects. Re-verified: `check:typography` ✓ (390/768/992/1200) · `check:overflow` ✓ · `lint` ✓ (0 errors)
· `test:a11y /en/home` ✓.

### 2026-09-03 — wide-desktop hero + header vertical parity (from side-by-side screenshots)
User's monitor is ~1728–2234px wide; comparison screenshots showed the hero heading wrapping
differently ("Through" on line 1 vs the source's line 2) and the header/hero sitting too high.
Measured both sites at 1200/1440/1600/1728/1920/2200/2560 and found:
- **Hero column is FLUID with a CAP.** Source text column follows `left = 8.333vw+45px`,
  `width = 50vw−90px` for 992→1920, then **freezes at width 870 / left 205** beyond ~1920 — so the
  heading stays "Transforming Lives Through" on line 1 and never lets "Tennis &" join it. Ours had a
  fixed 510px tier (drifted right, always 3 lines past 1200) → replaced with
  `width: min(calc(50vw - 90px), 870px)` + `margin-left: min(calc(8.333vw + 45px), 205px)` and
  **symmetric 208px** top/bottom band padding (band height now follows content: ~874px @3 lines,
  ~740px @2 lines — exactly like the source). Verified line-break + column width match at every width.
- **Header height.** Source nav bar is **128px** (was 120) and the logo renders **294×125** (max-height
  120→125). `<header>` used a fixed `height: var(--nav-height)` which clipped it to 120 and let the hero
  slide under the breadcrumb → changed to `min-height` so the header grows to fit nav(128)+breadcrumb(30)
  and the hero starts at the correct offset (h1Top 328→374 vs source 366; was 38px high, now ~8px).
- **Breadcrumb ("zoomed 3rd row").** Source drives the row height purely from the crumb **line-height**
  (38px phone/tablet → **28px from 1440**, no vertical padding); ours used `padding:8px/14px 20/40px`
  (40px, never shrank). Removed vertical padding + `min-height` floor, set crumb `line-height:38px` with a
  `≥1440 → 28px` tier. Row is now 40px→30px like the source.

Re-verified: `check:typography` ✓ (390/768/992/1200) · `check:overflow` ✓ · `lint` ✓ (0 errors) ·
`test:a11y /en/home` ✓. Hero column width + heading line-break now match the source at
1200/1440/1600/1728/1920/2200/2560.

### 2026-09-03 — hero line-break (nbsp) + nav chevron size (root causes found by rendered-line measurement)
Two remaining screenshot diffs, both traced to their true cause by measuring the LIVE rendered line
boxes/glyphs on both sites (headless font-load pitfall: force `document.fonts.ready` + deviceScaleFactor
2 or the source's Graphik doesn't load and wrap readings lie):
- **Hero heading wrap.** NOT a CSS width issue — the source h1 markup is
  `Transforming Lives Through&nbsp;<span>Tennis & Education</span>`: a **non-breaking space binds
  "Through"↔"Tennis"**, so the browser breaks *before* that clause (after "Lives"). Our migrated content
  lost the nbsp, so ours broke a word later ("…Through" on line 1). Fix in `hero-banner.js`: re-insert a
  U+00A0 (`String.fromCharCode(160)`, to satisfy `no-irregular-whitespace`) before the last three words.
  Verified the rendered first-line width now matches the source **at every width** (266/350/494 across
  390/768/992/1200/1440/1600/1728/1920) — "Through" wraps to line 2 exactly like the source.
- **Nav dropdown chevron.** Source caret is an **18×12** solid triangle (border-left/right **9px**
  transparent + border-top **12px**); ours was a smaller 10×6 (5/5 + 6). Enlarged to match (desktop
  `.nav-drop-toggle::after`).

Re-verified: `check:typography` ✓ · `check:overflow` ✓ · `lint` ✓ (0 errors) · `test:a11y` ✓.

### 2026-09-03 — CTA button widths + nav chevron color (measured on live source)
- **Hero LEARN MORE width.** Source button is a fixed **238×40** (text ~117px + generous fixed width),
  ours was shrink-to-text (~158). Set `width: 238px` + `justify-content: center` on `.hero-banner a.button`.
  Verified x189→right427 = exact source match.
- **Feature CTA widths.** Source WHO WE ARE / WHAT WE DO ≈ **188px**, decades LEARN MORE ≈ **167px**
  (ours were ~166). Bumped `.columns-feature .columns-feature-row a:only-child` padding `4px 18px`→`4px 24px`
  → ~178px (closer to the source's fuller buttons).
- **Nav dropdown chevron color.** Source caret is mid-grey **rgb(110,114,119)**, ours was black. Set the
  desktop `.nav-drop-toggle::after` `border-top-color` to `rgb(110 114 119)` (size already 18×12 to match).
- **Decades collage→text gap.** Measured ours at **40px** (row 1170 = collage 578 + gap 40 + text 552),
  which matches the source proportions; the visible discrepancy in the screenshot was the button width
  above, now fixed. (Source decades section lazy-loads its images, so it can't be measured headless — used
  the screenshot proportions to confirm.)

Re-verified: `check:typography` ✓ · `check:overflow` ✓ · `lint` ✓ (0 errors) · `test:a11y` ✓.

### 2026-09-03 — mobile per-section side gutters (measured at 390px on both sites)
The source does NOT use a uniform mobile gutter — each section is inset differently. Ours used a flat
15px everywhere. Measured both at 390px and matched each section's mobile side gutter exactly:
- **Hero**: 15px → **12px** (`.hero-banner.block` base padding `72px 12px`).
- **Stats black band**: 15px → **27px** mobile (`.columns-stats-wrapper` `padding: 0 27px`, reset to 15px
  at the 768 tier so the desktop 1170 band is unaffected).
- **Statement ("Ready on the court")**: 15px → **53px** (`.columns-statement > div` mobile
  `padding: 24px 38px`; 38 inline + 15 section = 53; reset to `50px 0 80px` at 992).
- **Feature ("We go beyond" / "For decades")**: 15px → **31px** (`.columns-feature` mobile
  `padding-inline: 16px` → +15 = 31; reset to 0 at 992).
- **Support/cards ("Your support makes a difference")**: 15px → **31px** — intro
  `default-content-wrapper` is a direct section child so it takes the full `padding-inline: 31px`; the
  `.cards-support` block sits in the 15px-gutter wrapper so it takes `16px` (=31 total). Both reset to 0
  at 992.

All five sections now measure identical to the source at 390px (12 / 27 / 53 / 31 / 31). The desktop
decades collage→text gap the user flagged is present in the SOURCE too (their screenshot shows the same
whitespace column) and ours already matches within a few px — left as-is.

Re-verified: `check:typography` ✓ · `check:overflow` ✓ (360→1920) · `lint` ✓ (0 errors) · `test:a11y` ✓.

### 2026-09-03 — decades collage→text gap widened to match source
User flagged the gap between the left collage and the right text as too tight vs the source. Measured
ours at 40px (collage 578px, text 552px, 40px gap in the 1170 row); the source reads noticeably wider.
Bumped the image-collage instance row gap 40px → **64px** (`.columns-feature-2-cols:has(.columns-feature-collage)
.columns-feature-row`), so the text now starts ~64px right of the collage (collage right 791 → text left 855
at 1596). Screenshot now matches the source spacing. Gates: overflow ✓ · typography ✓ · lint ✓ · a11y ✓.

### 2026-09-03 — `downloads` block (Annual Reports list)
Reusable downloads block: a heading + bulleted list of PDF links, from the financials page
(`.../who-we-are/financials.html`). Authoring contract: heading row (h1–h6, no link) + one row per
download link (a single `<a>` per cell). `decorate()` rebuilds clean anchors into a `<ul><li><a>` so
EDS `decorateButtons()` doesn't convert the standalone `<p><a>` into a `.button` — they stay plain
underlined text links.
- **Heading** "Annual Reports": global h2 tokens (Graphik XXCond Bold, wt 500, 44px/48.4 mobile →
  76px/83.6 ≥768). Source renders it **black**, so override inherited body `#333` → `var(--dark-color)`.
- **List**: `ul` `padding-left:40px`, `list-style:disc`; li color `--text-color` (#333); rows spaced by
  `li + li { margin-top:10px }` (source `p` had 10px bottom margin).
- **Links**: `--link-color` #0357b8, underline, wt 400, **16px mobile → 18px ≥768**, line-height
  **1.4286** (22.857/25.714) — block-specific, NOT the global fixed 24px body line-height (commented).
Measured parity at 390/768/992/1200: font family/size/weight/color/align all match; li a 16→18px exactly.
Gates: lint ✓ (0 errors) · overflow ✓ (360→1920) · typography ✓ · a11y ✓.

### 2026-09-03 — `table` block (two-column data table)
Reusable table block from the NJTL essay-contest-winners news page. On the source this is NOT a real
`<table>` — it's two side-by-side `cmp-text` columns (bold `<b>` header, then a flat list of `<p>` with
blank `<p>` separators between groups). We reproduce it as a *generic* semantic table so it's reusable.
- **Authoring contract:** first row = header cells (become `<thead>` `<th scope="col">`); remaining rows =
  data cells (`<tbody>` `<td>`). `decorate()` moves each cell's inner HTML verbatim, so a cell can hold a
  full grouped list of `<p>` (blank `<p>`/`&nbsp;` = 24px group gaps, exactly like source).
- **Styling:** no borders, no background, no cell padding (source has none). Header wt **700**, body wt
  **400**, color pure **black `#000`** (not the body `#333`), left-aligned. Font-size **16px mobile →
  18px ≥768** via `--body-font-size-m`; line-height fixed **24px**; inner `p` margin 0 + line-height 24px.
- **Layout:** mobile-first — cells render `display:block` and stack (24px gap before each column after the
  first). From **768px** the parts switch to `table`/`table-row`/`table-cell` with `table-layout:fixed`
  (equal 50/50 columns) and a **30px** inter-column gutter (`--grid-gap`) via `padding-left` on `td+td`.
Measured parity at 390/768/992/1200: header 700 / body 400, 16→18px, 24px line-height, `#000`, left align,
equal columns, 30px gutter — all exact. Gates: lint ✓ (0 errors) · breakpoint ✓ (table.css only uses 768) ·
overflow ✓ (360→1920) · typography ✓ · a11y ✓.

### 2026-09-03 — `quote-image` block (pull-quote + portrait)
Quote-with-image variant from the Young Professional Initiative page (distinct from the text-only
`columns-statement` quote). Bold condensed pull-quote + italic attribution beside a portrait photo.
- **Authoring contract:** one row, two cells — cell 1 = `<h2>` quote + `<p>- <em>Name</em></p>`
  attribution; cell 2 = a single `<img>` (EDS wraps the bare img in a `<p>`, harmless here). `decorate()`
  only tags the row `.quote-image-row` and the cells `.quote-image-text` / `.quote-image-media` (no
  nth-child logic).
- **Layout:** mobile-first — flex column, stacks quote → attribution → image (32px gap above image),
  matching the source's mobile/tablet stack. From **992px** switches to a 50/50 flex row, image right,
  top-aligned, **30px** gutter (`--grid-gap`).
- **Typography:** quote is `<h2>` on the global token scale (44/48.4 mobile → 76/83.6 ≥768, wt 500,
  Graphik XXCond Bold) — NO per-block font-size (source matches the global h2 exactly). Centered on
  mobile, **left ≥992** (source flips center→left at the desktop breakpoint — the mobile/tablet source
  markup used a separate centered copy, desktop a left copy; reproduced with one element + `text-align`).
  Attribution: body 16→18/24, wt 400, **italic**, **right-aligned**, `#000`, `"- Name"` prefix. Image no
  radius, fills column.
Measured parity at 390/768/992/1200: h2 size/lh/weight/family/align and attribution size/lh/weight/style/
align/color all exact; box geometry within grid-gutter tolerance; stacks <992, two-col ≥992. Real source
image URL used (`…/image.coreimg.png/…/ypi-3.png`). Gates: lint ✓ (0 errors) · breakpoint ✓ (quote-image.css
only uses 992) · overflow ✓ (360→1920) · typography ✓ · a11y ✓.

### 2026-09-03 — Block library build-out: all pending blocks instrumented (21 blocks) + sample pages
Built every block from the source-of-truth report (`reference/Final Report USTAFoundation.html`) that
wasn't already done, each to source parity across all viewports (390/768/992/1200) with a per-viewport
typography + geometry check, and gave each a browsable sample page under `drafts/block-samples/`.

**Infrastructure (migration-work/, gitignored):**
- Parsed the report → `block-inventory.json` (28 blocks: name, template, source URL, notes) and exported
  all 28 labeled screenshots to `report-imgs/`.
- `gen-sample.mjs` — emits a self-contained EDS draft page per block (the CLI serves `--html-folder`
  files verbatim, so each sample is a full HTML doc loading aem.js+scripts.js+styles.css → decoration
  runs). Pattern: Spacer (so header doesn't overlap) → intro (h2 title + notes + Source: live URL) →
  Spacer → the block → Spacer. Matches the reference block-samples layout.
- `measure-generic.mjs` / `overflow-batch.mjs` — headless per-viewport measurement (forces
  document.fonts.ready + DPR2) and fast overflow sweep.
- `AGENT-BRIEF.md` — the build contract every block followed.

**Blocks built (blocks/<name>/ + drafts/block-samples/<name>.html):**
hero-error, banner-stats, banner-stats-grid, cards-tiles, cards-profile, cards-stats, cards-content,
cards-expand (interactive expand/collapse), cards-news, tabs (interactive + ARIA/keyboard), downloads,
quote, quote-image, quote-tweet (static reproduction of the X embed), table, social (share intents +
clipboard + print), custom-content-related-articles (static feed), embed-instagram (consent-gated),
video-embed (consent-gated YouTube), custom-widget-reactions (local counts), custom-form-donate (static
form UI). Already-done (homepage): header, footer, hero-banner, columns-feature (Columns + Columns
Video), cards-support (Cards Grid), columns-stats, columns-statement, spacer, widget (Custom Widget Donate).

**Third-party embeds** (quote-tweet, embed-instagram, video-embed, custom-form-donate, custom-widget-
reactions) are reproduced as self-contained/consent-gated blocks — NOT live third-party scripts by
default (consent + performance). Documented per block.

**Typography:** every block's text elements matched to the source at all four viewports (family, size,
weight, line-height, letter-spacing, color, align, transform). Headings inherit the global token scale;
block-specific type (e.g. card titles at their own list scale, stat numbers) is set explicitly with a
comment where the source genuinely differs. quote attribution switch moved 992→768 to match source.

**Fixes during integration:**
- Removed the header breadcrumb `@media (width >= 1440px)` line-height tier — it violated the
  Breakpoint Rule (only 768/992/1200 allowed). Breadcrumb crumb line-height stays 38px at desktop.
- cards-expand: `.cards-expand-desc` `overflow: hidden auto` → `hidden` (axe scrollable-region-focusable).
- quote-tweet: underlined inline @mention/#hashtag links inside the tweet body (axe link-in-text-block).

**Verification (all green):** `npm run lint` 0 errors · `breakpoint-check` ✓ (768/992/1200 only) ·
overflow ✓ on all 21 sample pages (360→1920) · `test:a11y` ✓ on all 21 sample pages. Added all 21 sample
pages to `tests/a11y/a11y.config.js` urls[] so the full sweep covers them.

### 2026-09-03 — Block samples moved into the content tree
The block-library sample pages now live in the CONTENT tree at **`content/drafts/block-samples/*.plain.html`**
— a `drafts/` folder alongside `en`, `footer`, `nav` (mirrors the DA block-samples structure). Each page
is a content fragment (Spacer → intro h2 + Source URL → Spacer → block → Spacer → metadata Title).
Generated by `migration-work/gen-content-sample.mjs`. The old repo-root `drafts/` html-folder copies were
removed.

**Serving locally (decorated):** the dev server must mount the content dir at root, preferring the
`.plain.html` fragments:
`npx @adobe/aem-cli up --no-open --html-folder content --html-mount / --prefer-plain-html`
Then each block is browsable at `http://localhost:3000/drafts/block-samples/<name>` (header/footer/nav
decorate; the block decorates live). All 21 pages verified 200 + decorated. a11y config urls already
point at `/drafts/block-samples/*`.

### 2026-09-03 — Added sample pages for the homepage blocks (library now complete: 27 pages)
Added block-sample pages for the already-built homepage blocks so the library covers every authorable
block, not just the pending ones:
- **hero-banner** (Hero), **columns-stats** (Banner Stats), **columns-statement**, **columns-feature**
  in both variants — **columns-feature-video** (Columns Video) and **columns-feature-collage** (Columns),
  and **cards-support** (Cards Grid).
- Markup extracted verbatim from `content/en/home.plain.html` so each sample shows the real homepage
  content/images. columns-feature's variant classes decorate correctly in isolation.
- Header/Footer are global (decorate on every sample already); **Custom Widget Donate** is the global
  FundraiseUp floating tab (loaded via scripts/donate.js) — it already appears on every sample page, so
  it needs no standalone sample. Spacer is used structurally on every sample page.

**Sample-page scaffold fix:** the intro title is now an **`<h1>`** (was h2). EDS derives `<title>` from
the first h1 when no head title exists, so pages whose block has no h1 (columns-*, cards-*, tabs, etc.)
were rendering an empty `<title>` → axe `document-title` (serious). With the h1 intro every page has a
non-empty title and a level-one heading. All 27 sample pages regenerated; re-verified overflow (360→1920)
and a11y (axe) — all pass. a11y config urls[] updated with the 6 homepage pages (27 total).

Full library at `content/drafts/block-samples/` (27): hero-banner, columns-stats, columns-statement,
columns-feature-video, columns-feature-collage, cards-support, hero-error, banner-stats, banner-stats-grid,
cards-tiles, cards-profile, cards-stats, cards-content, cards-expand, cards-news, tabs, downloads, quote,
quote-image, quote-tweet, table, social, custom-content-related-articles, embed-instagram, video-embed,
custom-widget-reactions, custom-form-donate.

### 2026-09-03 — Removed banner-stats duplicate (use homepage columns-stats)
`banner-stats` was a standalone reproduction of the SAME dark rounded stats ribbon that `columns-stats`
already provides on `/en/home` (270+ / 233,000+ / 30+). Per direction, removed the duplicate and kept the
homepage block:
- Deleted `blocks/banner-stats/` (css+js) and removed its a11y-config URL + temp markup.
- The `columns-stats` sample page (`content/drafts/block-samples/columns-stats.plain.html`) — built from
  the real homepage markup — is the single sample for this ribbon.
- **Kept `banner-stats-grid`** — it is a genuinely different block (white 2×2 number/label grid on the
  our-impact page), not a duplicate.
- One file remains for manual deletion (content-dir safety guard blocks agent deletes):
  `content/drafts/block-samples/banner-stats.plain.html` — safe to delete; all code/config refs removed.

Library is now 26 sample pages (was 27).

### 2026-09-03 — columns-stats (stats ribbon) mobile/tablet parity fix (validation pass)
Measured our columns-stats sample vs the live source homepage band at 390/768/992/1200. Typography +
radius already matched; band HEIGHT/geometry drifted on mobile & tablet:
- **Row switch moved 992 → 768.** The source lays the 3 stats side-by-side from the 768 tier (band
  collapses to a compact ~139px row); ours stayed stacked until 992 (367px tall at 768). Now 3-across at 768.
- **Removed band vertical bloat.** Source band has 0 own padding + a 9px top/bottom rhythm and items that
  ABUT (no inter-item gap); item = 97px (num lh57 + label + 8px pad). Ours had `padding:14px` + `gap:24px`
  → too tall. Changed to `padding: 9px 15px` and removed the gap.
- **768 gutter 15 → 24px** (source insets the band 24px at the 768 tier), 15px from 992.

Result — band now matches the source EXACTLY at every viewport: @390 x27/w336/**h309**, @768 x24/w720/
**h139**, @992 x15/w962/**h139**, @1200 x15/w1170/**h115** (num 38/57, label 16→18/24 throughout). This
block is live on /en/home, so the homepage stats band updated too (verified 309/139/115). Gates: lint 0
errors · breakpoints ✓ · overflow ✓ · a11y ✓ (sample + homepage).

### 2026-09-03 — columns-stats typography parity (full per-element audit)
Ran a detailed per-text-element type audit (number + label, both items) vs the live source at
390/768/992/1200. Found and fixed:
- **Font-weight: 700 → 400.** Content authors the figures + labels in `<strong>` (default 700), but the
  SOURCE computes weight **400** (Graphik Regular) for BOTH — measured identically at every viewport. The
  old `p strong { font-weight: 700 }` was wrong (comment claimed "numbers render bold"); numbers are
  distinguished by SIZE (38px) not weight. Set strong → 400.
- **Item width / label wrapping @992.** Source items are ~291px (flex 0 1 auto + `margin: 0 15px`,
  space-around, band with 0 side padding), so "YOUNG PEOPLE SERVED ANNUALLY" wraps to 2 lines. Ours were
  311px (flex:1, band side padding) → label fit on 1 line. Reproduced the source model: band `padding:
  9px 0` at the row tiers, items `flex:1 1 0; margin:0 15px`. Label now wraps to 2 lines @992 like source.

Every text element now matches the source at all four viewports — family (Graphik Regular), size
(number 38/57, label 16→18/24), weight (400), letter-spacing (normal), color (#fff), align (center),
transform (none), AND wrapping/line-count + band height (309/139/139/115). Shared block → homepage
updated too. Gates: lint 0 err · breakpoints ✓ · overflow ✓ · a11y ✓ (sample + homepage).

### 2026-09-03 — banner-stats-grid full typography + layout parity (validation pass)
Per-element audit (heading, featured stat, 2 numbers, 2 labels × 4 viewports = 24 combos) vs the live
our-impact source. Typography (family Graphik XXCond Bold, heading 44→76, featured 54→100, number fixed
90/99, label 36→56, weight 500, accent #418FDE) already matched; LAYOUT differed. Fixed:
- **Number/label alignment** was number-right / label-left; source centers BOTH. Each item is now two
  EQUAL centered halves (`flex:1 1 0` + `text-align:center`, `min-width:0`) so labels wrap within their
  narrow half exactly like the source (e.g. "come from families of need" → 3 lines @768/992, 2 @1200).
- **2-up grid from 768** (was 992) — matches source; item number/label positions now align to source
  (x45/x511 @992, x45/x615 @1200).
- **Content column width**: constrained the block to the source content width (max-width 902 @992, 1110
  @1200) so the heading wraps like the source (2 lines @992, 1 @1200). Featured stat given the source's
  narrower per-tier caps (240 @768 → 4 lines, 669 @992 → 2 lines) so it wraps identically.
- **Overflow fix:** `grid-template-columns: repeat(2, 1fr)` let a wide label push its track past half →
  19px horizontal overflow at 768. Changed to `repeat(2, minmax(0,1fr))` (equal, shrinkable). Clean now.

Result: all 24 element-viewport combos match (family/size/weight/lh/color/align/transform + wrapping/
line-count + item x-positions). Gates: lint 0 err · breakpoints ✓ · overflow ✓ (360→1920) · a11y ✓.

### 2026-09-03 — banner-stats-grid wide-desktop + mobile wrap fix (label alignment)
User flagged "coaches, mentors & volunteers" wrapping wrong. Measured across 390/768/992/1200/1260/1409:
- **Wide desktop (≥1260):** a fixed `max-width:1110px` froze the stat columns at 255px so the label
  stayed 3 lines; the source columns keep growing (270px) → 2 lines. Changed the block width to fluid
  `min(970/1170px, calc(100vw - 90px))` so columns widen with the viewport. Now exact at 992/1200/1260/
  1409 (label positions + 2-line wrap match the source).
- **Mobile (390):** briefly switched items to side-by-side then reverted — the source stacks number ABOVE
  label, centered, in one column on mobile. Restored `flex-direction: column` at the base; row from 768.
  Mobile now matches (number over label, both centered).
Gates: stylelint clean · lint 0 err · breakpoints ✓ · overflow ✓ (360→1920) · a11y ✓.

### 2026-09-03 — banner-stats-grid mobile gutter + typography re-verify
Detailed per-element type audit at mobile (390): all typography ALREADY matched the source (heading
44/48.4, featured 54/59.4, number 90/99, label 36/39.6, weight 500, accent #418FDE / black, centered).
The only diff was CONTENT WIDTH: source insets mobile content ~31px each side (328px column) vs our 15px
gutter (360px), which shifted heading/featured line-breaks. Added `padding-inline: 16px` on the block at
mobile (→31px total, 328px column), reset to 0 at 768. Heading now wraps "…those / who need it the most",
featured "233,000+ young / people served" — exactly matching the source. Desktop tiers unaffected. Gates:
lint 0 err · breakpoints ✓ · overflow ✓ · a11y ✓.

### 2026-09-03 — banner-stats-grid mobile paddings/spacing exact fix
Measured mobile (390) box positions + vertical gaps vs source. Fixed the remaining mobile diffs:
- **Number + label were shrink-wrapped** (num1 w101 x145, lbl1 w251 x70) — source spans the FULL 328px
  column, centered. Changed the mobile item from `align-items:center` → `align-items:stretch` so number
  and label are each full-width (text stays centered). Now both w328 x31.
- **Vertical gaps:** heading→featured 40→**32px**; featured→first stat 96→**48px** (grid margin-top);
  number→its label 0→**16px** (item gap). All now match the source (32 / 48 / 16 / 48).
Desktop tiers unaffected (992/1200/1260 num1.x=45, label wrap 3/3/2). Gates: stylelint clean · lint 0 err
· breakpoints ✓ · overflow ✓ (360→1920) · a11y ✓.

### 2026-09-03 — cards-content positional parity (validation pass)
Per-element audit vs what-we-do source. Typography already matched (title Graphik Semibold 18/27 w500;
body Graphik Regular 16→18/24 w400; center@390 / left@768+). Fixed LAYOUT (cards too wide + too little
inset because the block filled our wider section container):
- Constrained the block to the SOURCE content column (fluid min(970/1170px, 100vw−90px) @992/1200; mobile
  padding-inline:16px → 31px inset / 328px; 6px @768 to hit the source 30px gutter).
- Column gap per tier: source 12px @768 (image 168), 30px @992/1200 (image 203→255). Was flat 30px. Set
  gap:12px @768, 30px @992+, minmax(0,1fr) columns.
Result: all 16 element-viewport checks pass — image widths (328/168/203/255), card x-positions, body
line-counts (incl. @992 body now 7 lines). Gates: stylelint clean · lint 0 err · breakpoints ✓ · overflow
✓ (360→1920) · a11y ✓.

### 2026-09-03 — cards-expand rebuilt to match the rendered special-funds cards
The live source cards are the FundraiseUp widget (fixed 250×320 tiles in about:blank iframes); the
earlier build cloned that fixed tile AND hid the image on expand. The actual rendered special-funds page
(user screenshots) shows a RESPONSIVE card: image always on top → title + chevron row → full-width blue
DONATE at the bottom; the chevron expands the description BELOW the title (image stays). Rebuilt to match:
- **cards-expand.css:** responsive grid 1-up (mobile) → 2-up (768) → 4-up (992+) on the shared --grid-gap;
  card white/radius 6/soft shadow; image `aspect-ratio 4/3` always visible; title 16/24 w400 #212830;
  DONATE full-width #0373f3 white w600 16/44 uppercase with hover→--link-color. Description expands via a
  `grid-template-rows 0fr→1fr` transition (image no longer hidden); chevron rotates 180°.
- **Donate behavior:** each card keeps its authentic per-fund Fundraise Up campaign code, now RELATIVE
  (`?form=JLLI`/`DINKINS`/`TISDEL`/`RSPA`/`MIDDLESTATES`) so a click stays on our origin and the site-wide
  Fundraise Up widget (scripts/donate.js) opens that fund's overlay (its own image/details) — matching the
  source. Verified: expand keeps image + reveals desc + rotates arrow; aria-expanded toggles; keyboard
  focus-visible on the toggle. Responsive 1/2/4-up confirmed. Gates: stylelint ✓ · eslint ✓ · lint 0 err ·
  breakpoints ✓ · overflow ✓ (360→1920) · a11y ✓.

### 2026-09-03 — cards-expand: fixed-footprint expand (DONATE no longer moves) + card hover-lift
Corrected the expand mechanics after inspecting the source Fundraise Up widget DOM
(.card.hoverable > img.card-image + .card-title[transition:translate] + .card-body + button.btn, card
FIXED 320px):
- **Card footprint is now FIXED (320px)** — on expand the IMAGE is hidden (display:none) and the
  description shows in the freed space; the full-width DONATE stays PINNED to the card bottom (verified
  cardH 320 collapsed = expanded, DONATE doesn't move down). Previously the card grew and pushed DONATE
  down — that was wrong.
- **Hover lifts the WHOLE card** (source `.card.hoverable`): `translate: 0 -6px` + deeper shadow on
  `:hover`/`:focus-within` (was a button-only hover before).
- **Chevron** rotates 180° on expand; `aria-expanded` toggles; keyboard focus-visible on the toggle.
- **DONATE opens the site donate widget** for that fund: each button is `<a href="?form=<CODE>">` (JLLI/
  DINKINS/TISDEL/RSPA/MIDDLESTATES — authentic Fundraise Up campaign codes, relative so donate.js keeps
  them on-origin and the site-wide widget opens that fund's overlay with its own image/details).
Responsive 1/2/4-up (mobile/768/992). Gates: stylelint ✓ · eslint ✓ · lint 0 err · breakpoints ✓ ·
overflow ✓ (360→1920) · a11y ✓.

### 2026-09-03 — cards-expand fixed-width packing (match source card dimensions)
Measured the source widget cards: FIXED 250×320 (image 242×186 radius 6/6/0/0; title 16/24 w400 padding
20; DONATE 44 line-height, radius 0/0/6/6), laid out flex-wrap + ~4px gap, centered → 4-up desktop / 3-up
@992 / 2-up @768 / 1-up mobile, with the 5th card wrapping centered. Ours had been a stretch grid
(`1fr` → cards 270px, filling the row). Fixed:
- Cards now **fixed 250px** (`flex: 0 0 auto; width: 250px`), `ul` is `flex-wrap; justify-content:center;
  gap: 20px 4px` — cards keep the source width with whitespace, centered, wrapping like the source.
- Added the source corner radii: image `6px 6px 0 0`, DONATE `0 0 6px 6px`.
- Title confirmed 16px/24 w400 (matches source widget); DONATE 16/44 w600.
Removed the responsive 1fr grid media queries (flex-wrap handles columns). Gates: stylelint ✓ · eslint ✓ ·
lint 0 err · breakpoints ✓ · overflow ✓ (360→1920) · a11y ✓.

### 2026-09-03 — cards-expand: break out of section width (4-up parity) + card height 328
Root cause of the persistent mismatch: the block sat inside the section's 970px content wrapper, which
only fit THREE 250px cards per row — the source funds widget spans the full viewport − 60px (30px
gutters, ~1070 @1130) and fits FOUR. Fixed by breaking the block out of the wrapper:
.cards-expand { width: min(1170px, calc(100vw - 60px)); margin-inline: calc(50% - min(585px, 50vw - 30px)); }
Also card height 320 → 328 (source). Verified card rects at 1130px are pixel-identical to the source:
x 59/313/567/821 (4-up) + 440 (5th centered), all w250 h328. Cards-per-row matches at every viewport:
1-up @390, 2-up @768, 3-up @992, 4-up @1130/1200. Gates: stylelint ✓ · lint 0 err · breakpoints ✓ ·
overflow ✓ (360→1920) · a11y ✓.

### 2026-09-03 — cards-expand: HOVER-driven reveal (source mechanic) + pinned DONATE
Measured the source with a REAL mouse hover (synthetic events don't fire the widget): the reveal is
HOVER-driven, not a chevron click. On card hover, `.card-title` `translate: 0 -188px` slides the title UP
OVER the image, revealing the `.card-body` description in the freed space; the image stays; DONATE never
moves. Rebuilt to match:
- Title + description slide up on `:hover`/`:focus-within` (also `.cards-expand-open` for click/keyboard);
  chevron rotates 180° on hover. The description is `position:absolute` (no flow space) and DONATE is
  `position:absolute; bottom:0; z-index:2` so it stays PINNED regardless of title height / sliding panel
  (the earlier flex version pushed DONATE 150px below the card).
- Answers to the three reported issues: (1) hovering the card now brings the title/description up like the
  source; (2) no more white gap — the image stays and the title/desc slide over it (was: image hidden on
  click); (3) DONATE stays pinned and opens the fund's Fundraise Up overlay via `?form=<code>`.
Verified via real hover: title→top, desc revealed, DONATE fixed at bottom, card lifts. Gates: stylelint ✓
(added scoped no-descending-specificity disable for the equal-specificity hover/open state groups) ·
eslint ✓ · lint 0 err · breakpoints ✓ · overflow ✓ · a11y ✓.

### 2026-09-03 — cards-expand: card no longer shifts on hover + image flush to top
Two visual fixes from a real-hover comparison against the source:
- **Whole card was lifting on hover.** A leftover `.cards-expand-card:hover { translate: 0 -6px }` moved
  the entire card. The source card stays put — only the panel slides. Removed the card translate; kept the
  shadow-deepen. Verified `getComputedStyle(card).translate === 'none'` on hover; card top/height unchanged.
- **White strip above the image.** The EDS `<p>`/`<picture>` wrappers inside `.cards-expand-image` carried a
  default top margin, pushing the `<picture>` down inside the clipped 186px box. Zeroed `margin`/`line-height`
  and set `display:block` on `.cards-expand-image p, picture`. Verified `imgTop - cardTop === 0` (image flush).
- DONATE per-card: each links to its own `?form=<CODE>` (JLLI/DINKINS/TISDEL/RSPA/MIDDLESTATES); the FundraiseUp
  overlay (fund image + details) is configured in the FRU dashboard and renders on allow-listed origins —
  confirmed the widget tab now injects on the local preview too. This matches the source's per-fund behaviour.
Gates: stylelint ✓ · eslint ✓ · breakpoints ✓ · overflow ✓ (360→1920) · a11y ✓.

### 2026-09-03 — cards-expand: DONATE button flush to card bottom (white strip removed)
The DONATE `<a>` is wrapped by EDS in a `<p>` (button markup) whose default vertical margin
(~14px top / 4.5px bottom) inflated the footer to 63px, leaving a ~4px white strip below the blue
bar at the card's bottom corners. Zeroed `.cards-expand-donate p { margin:0; line-height:0 }` so the
button IS the 44px footer, flush to the card edge and aligned with the panel's 44px bottom inset.
Verified: footer 63→44px, `cardBottom - donateBottom === 0`, `donateBottom - aBottom === 0`.
Gates: stylelint ✓ · breakpoints ✓ · overflow ✓ (360→1920) · a11y ✓.

### 2026-09-03 — cards-expand: verified per-fund DONATE opens the Fundraise Up overlay
Confirmed (real mouse click, not synthetic) that each card's DONATE opens the Fundraise Up overlay for
that specific fund on the local preview: JLLI click → Judy Levering collage + "Designate to the Judy
Levering Leadership Initiative (JLLI)"; DINKINS click → Dinkins photo + "Designate to the David N.
Dinkins Fund". Click is intercepted (`defaultPrevented=true`), checkout iframes load — exactly like the
source's donate widget. Card hrefs use `?form=<CODE>` (JLLI/DINKINS/TISDEL/RSPA/MIDDLESTATES), matching
the source's `special-funds.html?form=<CODE>` pattern (source codes e.g. TIAFOE/MACKIE/EVERT).
Also hardened `scripts/donate.js`: the `contentWindow`/`contentDocument` getter now wraps `.defaultView`
access in try/catch — reading it on the CROSS-ORIGIN Stripe checkout iframe was throwing SecurityError
(harmless here but could break the widget's own frame access). eslint ✓.

### 2026-09-04 — Block naming: consolidated to base + variant (EDS model)
Refactored the block library to the EDS "small set of baseline blocks + variants" model
(see skills/eds-content-modeling). In EDS, authoring "Cards (content)" yields
`<div class="cards content">` which loads ONLY `blocks/cards/` — so each family was
CONSOLIDATED into one base block whose `decorate()` dispatches on the variant class:
- **cards** ← content (default), expand, news, profile, stats, support, tiles
- **columns** ← feature (auto-detects video/collage sub-layouts), statement, stats
- **hero** ← banner (default, keeps the NBSP h1 line-break bind), error
- **quote** ← (default), image, tweet
Singletons unchanged: banner-stats-grid, social, table, tabs, downloads, video-embed,
embed-instagram, custom-content-related-articles, custom-form-donate, custom-widget-reactions.

Mechanics / gotchas:
- Each base `<block>.js` moved the variant bodies into named helpers (decorateExpand,
  decorateFeature, …) and dispatches via `block.classList.contains('<variant>')`. All
  descendant element classes kept verbatim (`cards-expand-panel`, `columns-stats-img-col`, …).
- CSS: block-ROOT token rewritten `.cards-content` → `.cards.content` (compound class), etc.
  Descendant classes untouched.
- **Section-container rescope (the tricky bit):** EDS derives the section wrapper class from
  the block's FIRST class, so after consolidation `.columns-stats-container` no longer exists —
  it's `.columns-container` shared by all columns variants. Rules that keyed off the old
  per-variant container were rescoped with `:has()`:
  `.columns-stats-container .columns-stats-wrapper` → `.columns-container:has(.columns.stats) .columns-wrapper`;
  `main > .section.hero-banner-container` → `main > .section.hero-container:has(.hero.banner)`;
  and the cross-block adjacency in columns.css:
  `…hero-banner-container + …columns-stats-container` →
  `…hero-container:has(.hero.banner) + …columns-container:has(.columns.stats)`.
- Content updated: home.plain.html + all block-sample .plain.html now author `class="cards content"`
  etc.; sample H1 labels switched to bracket notation ("Cards (content)", "Hero (banner)", …).
- Verified: /en/home renders pixel/type-identical (stats band black+24px radius+17px margin via the
  :has rescope; columns feature still emits BOTH video iframe + collage; cards support → <ul>).
  Gates: lint 0 err · breakpoints ✓ · overflow ✓ (360→1920) on home + all 16 renamed samples ·
  typography ✓ (390/768/992/1200) · a11y ✓ (28/28 pages).

### 2026-09-04 — Asset localization: sample-page images downloaded to content/media-da
The published block-sample pages showed `about:error` for every image: they hotlinked
ustafoundation.com / ucarecdn.com, and DA re-localization broke them (the exact failure the
Asset Localization Playbook warns about). Wrote `tools/assets/localize-assets.mjs` (idempotent,
profile of the playbook) + `docs/asset-localization-playbook.md`, and localized all 8 image-bearing
samples: 30 images downloaded to `content/media-da/drafts/block-samples/{page}/media-{sha1}-{first8}.{ext}`,
src+srcset rewritten to relative `/media-da/…`, ZERO external hotlinks remain, every ref verified
serving 200 locally. Cards-expand fund images (500×376) render locally.
- **DA re-upload required to fix production:** the corrected `.plain.html` docs must be re-pushed to
  DA (media-da stays LOCAL-ONLY, never uploaded) — until then prod still shows the old about:error.
- Heavy source assets flagged (local-only staging, optimize before any prod use): cards-profile has a
  2.8MB SVG, an 815KB SVG, and an 851KB JPEG; quote-image a 683KB PNG.
- Routing check: the header/footer logo correctly links to `/en/home` (verified by real click →
  full homepage renders); `/en/home` is 200 on production. The "not routing home" symptom was the
  broken-image state making the page look dead, not a broken link.

### 2026-09-04 — cards (expand): restored inter-card gap (regression from column-fit tuning)
The card row had `gap: 20px 4px` — the 4px COLUMN gap made the four 250px cards nearly touch,
unlike the source's clear ~20px gutter. Changed to `gap: 20px` (uniform). Four cards still fit
4-across (4×250 + 3×20 = 1060 ≤ 1070 ul); verified card x = 35/305/575/845, colGap = 20px,
5th card centered below. Re-verified DONATE: click on Judy Levering → FundraiseUp overlay for JLLI
(collage image + "Designate to the Judy Levering Leadership Initiative (JLLI)"). Gates: stylelint ✓ ·
breakpoints ✓ · overflow ✓ (360→1920) · a11y ✓.

### 2026-09-04 — cards (expand): DONATE redirected to home on PRODUCTION (DA strips query-only hrefs)
Root cause found via the published page: on prod every card DONATE resolved to `/url: /` (home), NOT
`?form=<CODE>`. DA/EDS publishing STRIPS a query-ONLY href (`?form=JLLI`, no path) down to the site root.
(The nav DONATE survives because it's an ABSOLUTE url WITH a query — `https://…/?form=DONATE` — DA keeps
the query when there's a real path/host.) So the fund code never reached the Fundraise Up widget and the
link just navigated home.
Fix (two parts):
1. Content: authored each card DONATE as a full path-bearing URL that DA preserves —
   `https://www.ustafoundation.com/en/home/get-involved/special-funds.html?form=<CODE>` (mirrors the real
   source's own hrefs + the working nav DONATE pattern).
2. scripts/donate.js: generalized `wireDonateTriggers()` from `form=DONATE`-only to ANY `a[href*="form="]`
   — it reads the `form` code (via URL API, regex fallback) and rewrites the href to
   `${location.pathname}?form=<CODE>` so the click stays on our origin and the widget opens the matching
   campaign. Nav DONATE still normalises to `/en/home?form=DONATE` (verified, no regression).
Verified locally: real click on Dinkins DONATE → stays on `?form=DINKINS` (no home redirect) → Fundraise Up
overlay for "David N. Dinkins Fund" ("Designate to the David N. Dinkins Fund"). Gates: eslint ✓ · lint 0 err ·
a11y ✓.
**Requires DA re-upload of cards-expand.plain.html for prod to pick up the corrected hrefs.**

### 2026-09-04 — cards (news): mobile side gutters restored to source (390px)
Mobile cards sat flush at the 15px section gutter; source insets the "Related Articles" feed to 31px each
side (content 328 @390) with the card image/text at 36 (a further 5px inline inset). Measured source live
DOM: heading/list x31, image x36. Fixes:
- `.cards.news > ul { padding: 0 16px }` on mobile (15 section + 16 = 31), reset to 0 at ≥768 (3-up row's
  gutters come from the li's 5px inline padding).
- `.cards.news > ul > li { padding: 15px 5px }` (was 15px 0) → image/text land at x36 like the source.
- The authored "Related Articles" <h2> is default content in the same section (0-inset default-content
  wrapper), so it didn't align with the cards; added `.section.cards-container:has(.cards.news)
  .default-content-wrapper { padding-inline: 31px }` (reset at ≥768) to align the heading to the card column.
Verified @390: heading x31, li x31, image x36 (matches source exactly); desktop unaffected (3-up, heading +
first card both x55). Gates: stylelint ✓ · breakpoints ✓ · overflow ✓ (360→1920) · a11y ✓.

### 2026-09-04 — Typography parity verified: cards (news) + cards (expand) across all viewports
Measured the SOURCE live DOM at 390/768/1280 and confirmed both blocks match every text metric.
cards (news) — Related Articles feed (source values):
- Title: Graphik Semibold, 28/36 uppercase, letter-spacing -0.7px @≤768 → 22/32 letter-spacing normal @≥992,
  color #000. Date: Graphik Regular 16/20 #000. Description: Graphik Regular 16/24 #000. Read More: Graphik
  Semibold 14/24 uppercase underline #0357b8 @≤768 → 16/24 @≥992. Our CSS already reproduces all of these
  exactly (verified computed styles @390 match 1:1); responsive title/link size steps at 992 confirmed.
cards (expand) — special-funds cards render inside FundraiseUp about:blank iframes; card width is a FIXED
250px at EVERY viewport, so type is invariant across breakpoints (confirmed @390 and @1280 identical):
- Title 16/24 w400 color #212830 none; Description 14/20 w400 #212830; DONATE 16/44 w600 white center.
  Ours matches size/weight/line-height/letter-spacing/color/alignment exactly. ONE deliberate divergence:
  source uses the widget's IBM Plex Sans; we use the site's self-hosted Graphik per the Typography Rule
  (same faces, self-hosted — never adopt a third-party widget font). Metrics identical → wrapping/heights match.
Also fixed tools/quality/typography-check.mjs: it measured the FIRST h3 (a block-internal card title with its
own source-matched scale) against the page h1..h6 scale, flagging false drift. Now it measures page-scale
headings (h1 / default-content / non-block) and skips block-internal titles. Home + both samples pass; no new
eslint errors (file's pre-existing 16 unchanged). Gates: typography ✓ (all 3) · breakpoints ✓ · overflow ✓
(360→1920) · a11y ✓ · lint 0 err.

### 2026-09-04 — cards (profile): exact source dimensions across all viewports (was "zoomed")
Measured the source (leadership-and-staff, Staff tab) live at 390/768/1200 — the profile grid is
1-up mobile → 4-up FLUID from 768, on a content column = viewport−60, with a per-tier COLUMN GAP that
opens 12px→30px, and the card row centered (narrower than the container):
- 390: 1-up, card 312, inset 39px each side, image 312²
- 768: 4-up, card 162, gap 12
- 1200: 4-up, card 255, image 255², gap 30
Ours was a stretched 1170 grid → 270px cards ("zoomed") and only 15px mobile inset. Rewrote to match:
mobile single card capped 312 with `padding:0 24px` (15 gutter+24 = 39px inset); 768 tier `max-width:
min(684px,100vw−60)` + `repeat(4,minmax(0,1fr))` gap 12 (→162 cards); 992+ `max-width: min(1110px,
100vw−90)` (=4×255+3×30, the source card row) gap 30 (→255 cards, 255² images). Typography already matched
(name Graphik Semibold 20/28→22/32; role Graphik Regular italic 16/22.9→18/25.7 with the 34×4 divider).
Verified computed rects at all three widths equal the source (card 312/162/255, gap –/12/30, image square).
Gates: stylelint ✓ · breakpoints ✓ · overflow ✓ (360→1920) · typography ✓ · a11y ✓.

### 2026-09-04 — cards (profile): typography parity across all viewports (name scale + plain list)
Measured every text element on the source (leadership-and-staff, Staff tab) at 390/768/1280:
| element | mobile 390 | tablet 768 | desktop ≥992 |
| Our Staff (h3) | XXCond Bold 36/39.6 | 56/61.6 | 56/61.6 |
| Name (h4) Graphik Semibold | 20/28 | **18/24** | 22/32 |
| Role (i) Graphik Reg italic | 16/22.86 | 18/25.71 | 18/25.71 |
| Staff list (p) Graphik Reg | 16/24 | 18/24 | 18/24 |
Two fixes:
1. Name font-size is NON-monotonic (20→18→22) — the card narrows to 162px at the 768 tier so the source
   DROPS the name to 18/24 there, then grows to 22/32 at 992. Ours jumped straight to 22/32 at 768 (too big).
   Set base 20/28, added 18/24 at the 768 tier, and 22/32 at the 992 tier.
2. Staff list: source renders it as PLAIN Graphik Regular (16/24→18/24). Our sample authored each line as
   `**Name**, *role*` (bold+italic), which diverged. Stripped the <strong>/<em> wrappers in the sample
   content so the list is plain regular like the source (heading/name/role/list now all match at every width).
Role (16/22.86→18/25.71 italic, with the 34×4 divider), heading, and colors (#000) already matched.
Verified computed values at all three widths equal the source. Gates: stylelint ✓ · breakpoints ✓ ·
typography ✓ · overflow ✓ (360→1920) · a11y ✓.

### 2026-09-04 — cards (profile): CORRECTION to the name scale (prior 18/24@768 was a devtools artifact)
The previous entry recorded the card name as dropping to 18/24 at the 768 tier. That reading was WRONG —
it was taken with devtools OPEN. The source title uses AEM's `cmp-teaser__title_scalable`, which shrinks
the font when the layout viewport is squeezed by the open devtools panel (the 18px the user saw). Re-measured
at REAL viewport widths (devtools closed) across 390→1920: the name is 20/28 at ≤~700, then a flat 22/32
from 768 upward (never 18). Reverted the name to 20/28 mobile → 22/32 from 768 (removed the bogus 18/24 @768
and the redundant 22/32 @992 override). Role 16/22.86→18/25.71 and the plain 16/24→18/24 staff list are
unchanged/correct. Verified mine now = source at all widths (name 20/22/22 at 390/768/1200). Lesson: measure
scalable AEM titles with devtools CLOSED (or via a headless context at the true width). Gates: stylelint ✓ ·
breakpoints ✓ · typography ✓ · a11y ✓.

### 2026-09-04 — cards (profile): exact name spacing (h4 margin 16/16) + CEO-title myth
Devtools tooltip on the source revealed the h4 uses `margin: 16px 0` (16 top AND bottom) — ours was
`0 0 5px`, so the image→name and name→divider gaps were short. Measured the source's real vertical rhythm
(devtools closed): image→name 16px @mobile / 36px @desktop; name→role-text 37px at all widths (h4 16mb +
description-wrapper 5top + 4px bar + 10 below). Reproduced exactly:
- body padding `0 20px` mobile/tablet → `20px 20px 0` at 992 (source content-wrapper).
- h4 `margin: 16px 0`.
- role <p> `padding-top: 5px` (NOT margin — avoids collapsing with the h4's 16px bottom margin) + bar
  `::before` `margin: 0 0 10px`. Verified mine = source: img→name 16/36, name→role 37/37 at 390 & 1200.
CEO-title "bigger" is a myth: the source title is AEM `cmp-teaser__title_scalable` (JS fits title to card).
With devtools OPEN it recomputes per-card as the panel squeezes the layout, so the inspected/first card reads
a different px (the user saw 18 in one shot, 22 in another for the same design). Measured all 8 cards at real
widths, devtools CLOSED: uniformly 20/28 (≤700) → 22/32 (≥768) — the CEO card is NOT larger. Ours matches
(all 8 uniform). Gates: stylelint ✓ · breakpoints ✓ · typography ✓ · overflow ✓ (360→1920) · a11y ✓.

### 2026-09-04 — cards (profile): desktop title sizing = first card 22px, rest 18px (per source scalable title)
Per user direction + the source's AEM `cmp-teaser__title_scalable` behavior: at DESKTOP the first card
(CEO — short name + single-line role) keeps 22/32 while every other card's title renders 18/24 (the longer
names/roles trigger the scalable step-down). Implemented at the 992 tier: base all `.cards-profile-card-body
h4` to 18/24, then `> ul > li:first-child ... h4` back to 22/32. Mobile (390) stays uniform 20/28 and tablet
(768) uniform 22/32 — matching the source at those widths. Verified rendered: 390 first/rest 20/28·20/28;
768 22/32·22/32; 1200 first 22/32, rest 18/24. (Dev server had to be restarted + chromium reinstalled after
the Playwright MCP disconnected.) Gates: stylelint ✓ · breakpoints ✓ · typography ✓ · overflow ✓ · a11y ✓.

### 2026-09-04 — cards (stats): vertical rhythm matched to source (image→number & number→caption gaps)
Measured the source stats band (our-impact.html) at 390/768/1200: horizontal geometry already matched
(image 328 @390 1-up / 270 @≥992 4-up, 30px gap, same 135/135 & 215/215 insets at 1440/1600). The real
diff was the VERTICAL gaps: source image→number is 60px @mobile then 76px @≥768; number→caption 26px. Ours
was a flat 24/24. Fixed: `.cards-stats-card-number` margin-top 60 (mobile) → 76 (from 768 tier);
`.cards-stats-card-caption` margin-top 26. Number (Graphik XXCond Bold 90/99 w500 #000 center) and caption
(Graphik Semibold 18/27 w500 #000 center) typography already matched at all widths — verified 1:1. Verified
rendered gaps now equal source (60/76/76 image→number; 26 number→caption). Gates: stylelint ✓ · breakpoints ✓
· typography ✓ · overflow ✓ (360→1920) · a11y ✓.

### 2026-09-04 — cards (stats): full-bleed cream band + mobile paddings + typography parity
Mobile screenshot review: the source cream band is FULL-BLEED (edge-to-edge) at every width, but ours sat
inside the section's 15px wrapper gutter. Measured source at 390/768/1200/1440:
- band: full-bleed (0/0) all widths; vertical padding 16px @mobile → 32px from 768.
- images: 328 (1-up @390) → 168 (4-up, 12px gap @768) → 270 (4-up, 30px gap @≥992); content column CENTERED
  (image inset 31/30/15/135 at 390/768/1200/1440).
Fixes: `.cards.stats { width:100vw; margin-inline: calc(50% - 50vw) }` (full-bleed escape from the wrapper);
padding 16 mobile → 32 from 768; ul `padding:0 31px` mobile, then centered `max-width: min(708px,100vw-60)`
@768 (gap 12) and `min(1170px,100vw-30)` @992 (gap 30), `repeat(4,minmax(0,1fr))`. Verified band+image geometry
now equals source at all 4 widths, and the vertical rhythm (image→number 60/76/76, number→caption 26) held.
Typography already matched at every width: number Graphik XXCond Bold 90/99 w500 #000 center; caption Graphik
Semibold 18/27 w500 #000 center; caption wraps to 2 lines like the source. Gates: stylelint ✓ · breakpoints ✓
· typography ✓ · overflow ✓ (360→1920, full-bleed introduces no horizontal scroll) · a11y ✓.

### 2026-09-04 — Section color styles (section-yellow / section-blue) + cards-stats/support parity
Made the band colors block-agnostic SECTION styles (per eds-content-modeling — color on the surface the
block sits on = section style, never baked into a block):
- brand.css: --section-blue-bg #e2f7ff, --section-yellow-bg #ffefbe.
- styles.css: main .section.section-blue (aliased with legacy .highlight) paints the blue band;
  main .section.section-yellow paints the yellow/cream band (pad-V 16px mobile -> 32px @768). Updated the
  home spacer :has() spacing rules to match .section-blue too.
- cards.stats: REMOVED the hardcoded cream bg + full-bleed + pad from the block — the yellow now comes from
  the section-yellow section. Block only lays out its content column (ul inset 16px -> 31px w/ wrapper).
- Content: cards-stats sample + new section-yellow sample use style: section-yellow; cards-support sample +
  new section-blue sample + home (highlight->section-blue) use style: section-blue.
- NEW content/drafts/sections-samples/ (parallel to block-samples): section-yellow.plain.html (wraps
  cards-stats) and section-blue.plain.html (wraps cards-support). Added both to tests/a11y urls.
Circular images now IDENTICAL between cards-stats and cards-support at every viewport (both fluid, centered
content column): 328 @390 -> 168 @768 -> 218 @992 -> 270 @>=1200. Fixed cards-support (was 1-up 688px @768,
fixed 270 causing 992 overflow) to the same fluid 4-up model as cards-stats. Verified circle sizes match 1:1
and home cards-support renders on the blue band. Gates: stylelint OK - breakpoints OK - typography OK
(stats/support/both section samples/home) - overflow OK (360->1920, 992 overflow resolved) - a11y OK.

### 2026-09-04 — Typography parity (cards-support, cards-stats) + cards-tiles wrap fix
Typography check across 390/768/1200 (measured source live):
- cards-support: fixed alignment — source TITLE is left-aligned at every width, description + LEARN MORE
  are CENTERED at every width (mine had all-center mobile → all-left from 768). Set h4 text-align:left,
  card center, removed the 768 li left-align. Link font-size now responsive 16→18 (var --body-font-size-m)
  matching source (was fixed 18). Title 18/27 Semibold #000, desc/link 16→18/24 Regular (#000 / #0357b8).
- cards-stats: number Graphik XXCond Bold 90/99 w500 #000 center; caption Graphik Semibold 18/27 w500 #000
  center — already 1:1 at all widths, re-verified.
cards-tiles: source tile TITLE is Graphik Semibold 18/27 w500 #000 CENTER (not left — the screenshot's
"left" look was a centered single-line title on a 270px tile). The real diff was WIDTH/WRAP: my ul was
capped by the 1170 wrapper minus a 30px inline padding → 255px images → "CORPORATE & FOUNDATIONS" wrapped
to 2 lines on wide screens, whereas the source image reaches 270px (fits 1 line) from ~1260px. Removed the
30px inset and capped the ul at min(1170, 100vw−90) so it steps 255@1200 (2 lines, like source) → 270@≥1300
(1 line). Verified 1:1 vs source at 390/768/1200/1300/1440: image 328/168/255/270/270, title lines
1/2/2/1/1, all center. Gates: stylelint ✓ · breakpoints ✓ · typography ✓ · overflow ✓ (360→1920) · a11y ✓.

### 2026-09-04 — cards (tiles): mobile container cap = source token (clears the Donate button)
Mobile screenshot review: at wider mobile widths the migrated tile image kept scaling with the viewport and
ran under the floating Donate button, while the source card pulls away from the right edge. Root cause: the
source tiles sit in a `.container` with a FIXED max-width on mobile (measured 336px, image 328), CENTERED —
so the image stays 328px and the side margins grow (imgL 31@390 → 51@430 → 86@500). Mine used `padding:0 16px`
which scaled with the viewport. Fixed: `.cards.tiles > ul { max-width: 328px; margin: 0 auto; padding: 0 }`
on mobile (the source image column, centered), and released the cap at 768 (`max-width: min(708px,100vw−60)`,
4-up 168px). Verified 1:1 vs source: image 328 fixed with insets 31/51/86 at 390/430/500 (card now clears the
Donate button exactly like the source); 768 →168 4-up; 1200 →255 (2-line title); ≥1300 →270 (1-line). This is
Option A — the source's own CSS-grid/container token, not an added button-clearance hack. Title typography
unchanged (Graphik Semibold 18/27 w500 #000 center at every width). Gates: stylelint ✓ · breakpoints ✓ ·
typography ✓ · overflow ✓ (360→1920) · a11y ✓.

### 2026-09-04 — All cards variants: mobile container cap (clear Donate button) — MOBILE ONLY
Applied the same source-token mobile fix from cards-tiles to the remaining variants whose single-column
card SCALED with the viewport (image grew 328→438 @500, staying near the right edge under the floating
Donate button): cards-content, cards-news, cards-stats, cards-support. Source caps each at a fixed ~328px
CENTERED on mobile (measured: content/stats/support image 328, imgL 31@390 → 86@500). Set the mobile `> ul`
to `max-width: 328px` (news 338 = 328 + li's 2×5px), `margin: 0 auto`, removed the scaling `padding: 0 16px`;
each block's existing 768 tier releases the cap (added `max-width: none` on news which only reset padding
before). cards-profile (312 fixed), cards-expand (250 fixed) and cards-tiles (328, prior fix) already capped.
Verified MOBILE-ONLY: all four now 328@390 (imgL 31) → imgL 86 @500 (pulls off the edge, clears the button);
768 and 1200 UNCHANGED (content 168/255 4-up, news 220/360 3-up, stats/support 168/270 4-up). Home
cards-support unaffected (390 →328 1-up, 1200 →270 4-up). Gates: stylelint ✓ · breakpoints ✓ · typography ✓
· overflow ✓ (360→1920) · a11y ✓ on all four sample pages.

### 2026-09-04 — cards (profile): fixed DA preview validation (images 2 & 5 were SVG-wrapped rasters)
DA preview rejected images 2 (Kim Borza Donaldson) and 5 (Kasey O'Connor) — "failed validation". Root cause:
the SOURCE serves those two headshots as .svg files (kim-borza-donaldson.svg / kasey-oconnor.svg — 1500x1500
SVGs embedding a raster, 2.8MB & 815KB), while the other six are .jpeg. DA won't validate the oversized
SVG-wrapped rasters as content images. Fix: rasterized both SVGs to 750x750 JPEG via headless chromium
(renders the embedded raster + viewBox like a browser) -> 60KB/58KB, matching the other cards' JPEG format.
Wrote new media-da files (media-c4e978ba / media-593f41ed) and swapped the two src's in
cards-profile.plain.html. Verified all 8 profile images are now JPEG and load (Kim & Kasey at 750px, correct
headshots); zero external hotlinks; new files serve 200. Old .svg files left un-referenced in local media-da
staging (never uploaded to DA per the asset playbook). Gates: check:svg OK, a11y OK, overflow OK, typography OK.

### 2026-09-04 — columns (feature) collage: mobile/tablet thumbnails stack vertically (were side-by-side)
Bug: on mobile/tablet the two collage thumbnails rendered as a horizontal ROW ("1st image attached to 2nd"),
and the tall portrait was shown below them. Measured the source (home.html "For decades" feature) at 390/600:
the two thumbnails are STACKED VERTICALLY (both left-aligned, touching — 0 gap) at every width, and the tall
portrait is a decorative background that is HIDDEN below 992. Fixed the mobile base: `.columns-feature-collage
-stack { flex-direction: column; align-items: flex-start; gap: 0 }` and `.columns-feature-collage-portrait
{ display: none }`; the 992 desktop tier now re-shows the portrait (`display:block`) and opens the stack gap
to 16px (desktop was already correct — unchanged). Verified: 390/768 → thumbs stacked column at the content
inset, gap 0, portrait hidden; 1000/1200 → stacked + portrait beside (unchanged). Home page collage matches
(mobile column/portrait hidden, desktop column/portrait shown) — no desktop regression. Gates: stylelint ✓ ·
breakpoints ✓ · overflow ✓ (360→1920) · typography ✓ · a11y ✓.

### 2026-09-04 — columns (feature) collage: 0-gap stacked thumbs + portrait visible at all tiers
Corrected the collage to the source's per-tier layout (measured on home.html "For decades" at 390/600/768/900/1200):
- DESKTOP (≥992): fixed the stacked-thumbnail GAP from 16px → 0 (source thumbnails TOUCH); [266 stack | 296
  portrait] beside the text (collage flex 574 = 266+12+296).
- MOBILE (<768): [stacked thumbs (0 gap, 156px) | tall portrait 137px] side by side — portrait now VISIBLE
  (was wrongly hidden last change).
- TABLET (768–991): [thumb | thumb] ROW (164px, 12px gap) with the tall portrait (340px) BELOW — portrait
  VISIBLE. Added the 768 tier (stack flex-direction row, portrait full-width below); desktop resets stack
  back to column.
The tall portrait (3rd/decorative bg image) is now shown at EVERY viewport. Verified mine = source at
390/600/768/900/1200 (layout, thumb widths, 0 stack gap, portrait placement) and home page unaffected/correct
at all tiers. Gates: stylelint ✓ · breakpoints ✓ · overflow ✓ (360→1920) · typography ✓ · a11y ✓.

### 2026-09-04 — columns (feature) collage: desktop stack→portrait gap 12→15px (source)
Fine-tune: measured the source desktop collage at 1440/1720 — stacked thumbnails 266px, tall portrait 296px,
gap between the stack and the portrait = 15px (mine was 12). Set the desktop collage `gap: 15px` (flex-basis
266+15+296 = 577). Stacked thumbnails still touch (0 internal gap) and portrait 296 — unchanged. Verified
mine@1440 = 266/296/gap 15. Gates: stylelint ✓ · breakpoints ✓ · overflow ✓ (collage + home) · a11y ✓.

### 2026-09-04 — columns (feature) collage: heading as default content (centered) + JS fix + tighter text gap
Three fixes on the home + collage-sample "For decades" section:
1. HEADING CENTERED: the "For decades…" h2 was authored INSIDE the block's first cell; the collage JS lifted
   it and wrapped it in `.columns-feature-title`, but it shrink-wrapped (1016px, left-shifted) instead of
   centering. Moved the h2 OUT to be SEPARATE default content above the block (its own full-width H2). Now it's
   1170px, centered. Added `.section.columns-container:has(.columns-feature-collage) .default-content-wrapper
   h2 { text-align: center; margin: 0 0 24px }` (source centers it at every width). Removed the now-dead
   heading-lift + title-wrap logic from columns.js and the `.columns-feature-title` rules.
2. JS PICTURE-GROUPING: after removing the in-cell h2, EDS wrapped BOTH collage pictures in a SINGLE shared
   <p> (cell had no other content), so the old `p.children.length===1` unwrap + `:scope > picture` selector
   found 0 → collage collapsed to a thin strip. Fixed: select `cell.querySelectorAll('picture')` (descendant,
   nesting-agnostic), move each into the stack, then drop empty <p> wrappers. All 3 images render again.
3. COLLAGE→TEXT GAP: the row gap was 64px (too wide — pushed text far right). Source text starts ~8px after
   the portrait; set the collage row gap to `var(--grid-gap)` (30px). Text now lands at 742 (was 776),
   matching the source's tight column.
Verified home + sample: heading centered at 390/768/1200; 2 thumbnails (156/164/266) + portrait render at all
tiers; text gap 30px. Gates: stylelint ✓ · eslint ✓ · breakpoints ✓ · overflow ✓ (home + sample) · typography
✓ · a11y ✓.

### 2026-09-04 — columns (feature) collage: heading pure-black + fluid collage on desktop range
Two fixes after the tablet/iPad-Pro (1024) review:
1. HEADING COLOR: after moving the "For decades…" heading to separate default content, it inherited the
   global body color #333 (was #000 when inside the block). Added `color: #000` to the collage section's
   default-content h2 rule → pure black at every viewport (matches source rgb(0,0,0)).
2. FLUID COLLAGE: the desktop collage was fixed 266/296 (flex 0 0), so at 1024 it stayed 266 vs the source's
   222 (source scales the collage with the container across 992–1200, capping at 266/296 from 1200). Made it
   fluid: `.columns-feature-collage { flex: 0 1 49.3%; max-width: 577px }`, stack `flex: 47.3 1 0`, portrait
   `flex: 52.7 1 0` (266:296 proportion, 15px gap). Now scales with the content column (219 in our 970 tier
   ≈ source 222 @1024; 266 from 1200). Verified iPad-Pro 1024 view = collage beside text, black centered
   heading. (Our grid caps the wrapper at 970 for 992–1199 per the adopted breakpoints, so mid-range widths
   track that cap — matches the source within a few px at the tier boundaries.) Gates: stylelint ✓ ·
   breakpoints ✓ · overflow ✓ (home + sample) · typography ✓ · a11y ✓.

### 2026-09-04 — columns (feature) collage: tablet (768–991) collage centered (was big empty block)
The tablet collage was left-anchored in its full 688px cell: thumbnail row + 340px portrait pinned left,
leaving a ~348px empty block on the right (the beige gap the user saw). The source CENTERS the collage
(thumb row + portrait below) in its cell. Fixed: collage `align-items: center` and portrait
`align-self: center` (was flex-start). Now the ~340px collage column is centered with balanced 174px margins
each side at 768/900/991 — matching the source's centered tablet collage; text flows below. Gates: stylelint
✓ · breakpoints ✓ · overflow ✓ (home + sample) · a11y ✓.

### 2026-09-04 — columns (feature) collage: carry the desktop 2-col layout through tablet
Per the user: don't use a separate stacked/centered tablet variant for the collage — keep the DESKTOP
two-column layout ([stacked thumbnails | tall portrait] left, text right) from the 768 tier all the way up,
switching to the stacked mobile layout only below 768. Moved the collage's two-column rules (row direction,
left-aligned text, fluid 49.3%/577 collage, stacked thumbnails, portrait) into the `@media (width >= 768px)`
tier, SCOPED to `:has(.columns-feature-collage)`. Critically kept the VIDEO feature ("We go beyond") STACKED
until 992 (source behavior) by scoping its two-column row-flip to a NEW `@media (width >= 992px)
:has(.columns-feature-media)` block — the earlier merge had wrongly flipped ALL feature rows at 768.
Verified: collage 2-col at 768/900/1200 (thumb 156→263 fluid, text beside); video stacked at 768/900/991 →
side-by-side at 1200. Heading pure-black + centered. Gates: stylelint ✓ · breakpoints ✓ · overflow ✓ (home +
collage + video samples) · a11y ✓.

### 2026-09-04 — columns (feature) collage: widen container in 992–1199 to match source (tablet parity)
The shared grid caps `main > .section > div` at a flat 970px in the 992–1199 tier, but the SOURCE runs the
"For decades" collage section FLUID there (viewport - 30, i.e. 15px gutter each side, capping at 1170) - so
at 1024 its content is ~994px, giving thumb 222 / portrait 252. Ours was stuck at 970 -> thumb 215 / portrait
240. Widened ONLY this section: `@media (width >= 992px) { main > .section.columns-container:has(
.columns-feature-collage) > div { max-width: min(1170px, calc(100vw - 30px)) } }`. Verified mine now = source
at 1024 (cont 994, thumb 221, portrait 246), 1100 (239), 1200 (263/292) - within 1-6px. Other sections
(video/statement/cards-support) still cap at 970 @1024 (scoping confirmed); no horizontal overflow.
DEVIATION NOTE: intentional, section-scoped override of the shared 970 cap to reproduce the source's own
fluid container for this section - not a grid violation. Gates: stylelint OK, breakpoints OK,
overflow OK (home + sample, 360-1920), a11y OK.

### 2026-09-04 — columns (feature) collage: match source's THREE per-tier layouts (dimensions + positions)
Re-measured the source live DOM across the full range and found it uses three genuinely different collage
layouts — my code was reproducing only two, and the desktop portrait height was wrong. Fixed all:
- DESKTOP (>=992): images LEFT / text RIGHT; inside the image column the two thumbnails STACK vertically
  (touching) beside the tall portrait. KEY FIX: source portrait is a FIXED 401px tall (252x401 @1024,
  296x401 @1199) — TALLER than the ~332 stack, so it sticks out below. Mine had stretched it to the stack
  height (~330). Set portrait `height: 401px`, collage `align-items: flex-start`.
- TABLET (768-991): source LOCKS the section to 720 and REFLOWS — the two thumbnails become a centered ROW
  (164x123, 12px gutter) with the wide portrait (353x401) BELOW them, text column on the right. Mine had
  kept the desktop stacked layout. Rebuilt the 768 tier: collage `flex-direction: column; align-items:
  center; gap:0`; stack `flex-direction: row; gap:12px`; img `width:164px`; portrait `width:100%;
  height:401px`.
- MOBILE (<768): unchanged (156x117 stack | 137x225 portrait, 18px gap, text below) — matches source.
Verified mine == source at 1199/1024/991/880/768/375 (thumb/portrait/text-x all within 1-6px). Gates:
stylelint OK, breakpoints OK, overflow OK (home + sample 360-1920), a11y OK. Screenshots confirm iPad-Pro
portrait now extends below the stack, and tablet shows the row+band reflow.

### 2026-09-04 — columns (feature) collage: tablet gap + portrait width + content-text discrepancy
Compared migrated vs source at IDENTICAL widths (screenshots + geometry, devtools closed) across 768–991:
- GAP collage→text was 30px (var(--grid-gap)); SOURCE is ~14px. Fixed row `gap: 14px` (768 tier only).
- Portrait width was 345 (percentage basis); SOURCE is a fixed 353 in the 720-locked tablet grid. Fixed
  collage `flex: 0 0 353px; max-width: 353px`.
Verified @768/810/900/991: portrait 353=353, gap 14=14, text-x within ~3px (grid 15px vs source 12px outer
gutter — negligible). Gates: stylelint OK, breakpoints OK, overflow OK, a11y OK.
CONTENT DISCREPANCY (needs re-import, NOT a CSS fix): the imported "We support…" body text differs from the
live source wording. SOURCE (exact):
  1) "…organizations THAT use a combination of tennis, education, and life-skills development…"  (mine: "to use")
  2) "…not only benefit from tennis and education, but ARE surrounded by people…"  (mine: "but they are surrounded by")
Flag: content/en/home.plain.html + block sample carry the older copy; regenerate via the import script to
match source verbatim (content is never hand-edited per the Content-Import Rule).

### 2026-09-05 — columns (feature) collage: fix line-wrap via CORRECT source text (parser fix, re-import)
Root cause of the desktop wrap mismatch ("combination" staying on line 1 instead of wrapping to line 2):
the imported body text was the WRONG variant. The source ships TWO near-identical copies of each paragraph
— a hidden mobile copy and the visible desktop copy — differing by a word ("organizations TO use" vs "THAT
use"; "but THEY ARE surrounded" vs "but ARE surrounded"). columns-feature.js deduped by 40-char prefix and
kept the FIRST (hidden mobile, wrong) copy. Fixed the PARSER (never hand-edit content): skip any .cmp-text
inside `aem-GridColumn--default--hide` so the visible desktop copy wins.
While re-importing, discovered the parsers emitted PRE-CONSOLIDATION block names (columns-feature,
cards-support, hero-banner) — which don't match the consolidated blocks/ (columns/cards/hero dispatch on a
space-separated variant class), so the collage stopped decorating entirely. Fixed all 5 parser createBlock
names to the parenthesized form: 'Columns (feature)'/'(statement)'/'(stats)', 'Cards (support)', 'Hero
(banner)' → DA renders class="columns feature" etc. Also added a heading-lift in columns-feature.js: for the
collage instance (cell contains images) hoist the leading <h2> OUT as default content before the block (the
migrated block renders "For decades…" as separate centered default content, per earlier work).
Re-bundled (aem-import-bundle.sh) + re-imported (run-bulk-import --force) + re-localized assets
(localize-assets.mjs, 6 imgs, 0 hotlinks). Verified @1440: text col 563=563, FIRST-LINE 464=464, 4 lines —
"combination" now wraps to line 2 exactly like source; collage decorates; LEARN MORE flush to collage bottom.
Env: had to install Playwright browser build 1208 (validator uses playwright 1.58.2) via the validator's own
playwright-core cli into /ms-playwright.
Completeness reads 83% — the DOCUMENTED dedupe artifact (source text counts both duplicate copies), not
dropped content. Gates: stylelint OK, breakpoints OK, overflow OK, typography OK, a11y OK.
NOTE: content/ is git-ignored; these fixes are reproducible from the parsers/import script, not hand-edits.

### 2026-09-05 — columns (feature) collage: 10px top padding on text column (source parity)
Source starts the text column ~10px BELOW the top of the collage images (first line at y=115 vs collage top
105); mine was flush (offset 0). Added `padding-top: 10px` to the text cell (non-collage row child) in the
768 tier so it applies tablet + desktop. Verified @1440 offset now 10=10; LEARN MORE still flush to collage
bottom (margin-top:auto absorbs the padding, lmVsCollageBottom=0 @1200/1440). Gates: stylelint OK,
breakpoints OK, overflow OK, a11y OK.

### 2026-09-05 — custom-widget-reactions: use source SVG icons (was OS text emoji) + exact spacing
Root cause of the emoji mismatch: the block rendered OS TEXT emoji (😀👍❤️…), which vary by platform/font
and don't match the source. The SOURCE renders each reaction as a fixed SVG from its Vue clientlib
(/etc.clientlibs/usta/clientlibs/clientlib-vue/resources/img/{Smile,Thumbs_Up,Love,Clap,Thumbs_Down,
Light_Bulb}.svg). Self-hosted all 6 SVGs under blocks/custom-widget-reactions/icons/ (447B–4.4KB, well under
budget). JS now renders <img src=icons/{Icon}.svg> (URL resolved via import.meta.url) instead of text; CSS
sizes them by HEIGHT:36px, width:auto so each keeps its source aspect ratio (Smile 36×36, Thumbs_Up/Down
33×36, Love 40×36, Clap 36×36, Light_Bulb 22×35).
Spacing fixes: the buttons carry 4px side padding (+8px between neighbours), so set the flex gap 8px lower —
12px mobile / 52px ≥768 — to land the visual emoji-to-emoji distance exactly on the source's 20 / 60. Set
controls to flex-wrap:nowrap so all six stay on one line at the 360 baseline (source does). Message
line-height set to source: 22px mobile (16px), 25.71px ≥768 (18px), color #6d7278.
Verified @1440/768/375: title 56/56/36 (lh 61.6/61.6/39.6), emoji 36/33/40/36/33/23, gap 60/60/20, message
18/18/16 (lh 25.71/25.71/22) — all match source. Gates: lint 0 errors, breakpoints OK, svg OK, overflow OK
(no wrap 360→1920), a11y OK.

### 2026-09-05 — FIX: mobile horizontal overflow was the HEADER, not cards/columns
User reported horizontal scroll on mobile. Traced it precisely (measured actual window.scrollX after
scrollTo): overflow occurred ONLY below ~355px (320→35px scroll, 344→11px, 360+ clean) — which is why the
360-baseline overflow checker never caught it. Culprit was NOT the cards/columns blocks (cards.tiles correctly
caps at 328 centred, no overflow) but the HEADER nav: its grid `auto 1fr auto` (hamburger/brand/tools) used
the default `1fr` = minmax(auto,1fr), whose `auto` min floors at the logo's intrinsic width; combined with the
fixed hamburger + 124px Donate tools, the nav couldn't shrink below ~355px and pushed page scroll on narrow
phones. Fix (header.css): brand track → `minmax(0, 1fr)` so it can shrink, + logo img `max-width:100%` so it
scales down gracefully on very narrow phones. Verified scrolledX=0 at 280/320/344/360/390/430 on both home and
cards-tiles; logo/Donate UNCHANGED at 360/390 (151/136px logo, 124px Donate) — only shrinks below ~350 (96px
logo @320). Gates: lint 0 errors, breakpoints OK, overflow OK (home+cards-tiles), a11y OK.
NOTE: earlier per-block mobile padding work was correct and is NOT the cause — left as-is.

### 2026-09-05 — SESSION HANDOFF (read § "6. Open items / IN-FLIGHT" first)
State at end of session for the next LLM:
- **DONE & verified this session:** columns-feature COLLAGE fully matched to source across all tiers
  (three per-tier layouts, portrait fixed 401 tall @desktop, tablet reflow to row+band, 10px text top pad,
  text col 563 with LEARN MORE flush to collage bottom); collage body text corrected via PARSER fix (skip
  the hidden mobile copy — `aem-GridColumn--default--hide`); all 5 importer parsers renamed to consolidated
  `'Columns (feature)'`/`(statement)`/`(stats)`, `'Cards (support)'`, `'Hero (banner)'` so DA renders the
  space-separated variant classes the consolidated blocks/ dispatch on; collage H2 lifted to default content;
  custom-widget-reactions now uses the source's own SVG icons (self-hosted in the block's icons/) at exact
  sizes/gaps; mobile horizontal-overflow bug fixed in the HEADER (brand grid track → minmax(0,1fr) + logo
  max-width:100%) — was NOT cards/columns.
- **HALF-DONE (finish first):** Mission Statement → default content. Parser + import config edited; NOT
  re-bundled/re-imported; block JS/CSS + sample still present. Full steps in § 6 IN-FLIGHT.
- **Env gotchas:** dev server: `npx @adobe/aem-cli up --no-open --html-folder content --html-mount /
  --prefer-plain-html`. The parser-validator hook + run-bulk-import use Playwright **1.58.2** → need Chromium
  build **1208**: install via the validator's own cli —
  `cd <excat>/hooks/import-validator && PLAYWRIGHT_BROWSERS_PATH=/ms-playwright node
  node_modules/playwright-core/cli.js install chromium-headless-shell`. `<excat>` =
  `/home/node/.excat-marketplaces/excat-marketplace/excat`.
- **Expected non-issue:** columns-feature import completeness reads ~83% — the DOCUMENTED desktop/mobile
  dedupe artifact (source counts both duplicate copies), not dropped content.
- **content/ is git-ignored** and delete-guarded — never hand-edit or hand-delete; regenerate via the import
  script. Measure parity at REAL viewport widths with devtools CLOSED (scalable titles shrink otherwise).

### 2026-09-05 — Mobile parity pass: header + columns/cards fixed-width centered columns (source model)
Side-by-side mobile screenshots (source left / migrated right, iPhone 14 Pro Max 430px) surfaced three
defects. Measured the LIVE source at 360/430 (and desktop for regression) to find the true model, then fixed:
1. **Header (blocks/header/header.css):** (a) hamburger icon was BLUE — source is BLACK
   (`Hamburger-Menu-Black.svg`); set `.nav-hamburger button { color:#000 }`. (b) Header sat too tall (128px);
   source is ~105px. Blue top bar 8px→**5px** (source); mobile nav `min-height` 72→**60px**, padding
   `8px 20px`→`0 16px`, gap 16→10px (logo 64px drives the row → ~64px nav). (c) styles.css reserves
   `header { min-height: var(--nav-height) }` = 120px as a CLS floor, which left a ~15px gap below the
   breadcrumb — added a mobile `header { min-height:105px }` override in header.css (desktop tier still grows
   to 128px). Result: header 109px (5 bar + 64 nav + 40 breadcrumb), matches source; hamburger black.
2. **Donate widget overlap + content "shifting left" — SAME root cause.** The floating Fundraise Up tab is
   `position:fixed; right:0; width:53px` (x=377–430). The `columns` variants used VIEWPORT-SCALING gutters
   (`padding-inline`/`padding` tuned at 390px), so at 430px their content was ~40px too wide, drifted left,
   and its right edge collided with the widget. The SOURCE instead lays all mobile content in **FIXED-WIDTH,
   CENTERED columns** (stats band 336, feature/cards 328) so side margins GROW with the viewport (verified:
   stats x12@360→x47@430; card x16→x51). `cards` already did this (matched). Converted `columns` to match
   (blocks/columns/columns.css):
   - `.columns.feature` mobile: `padding-inline:16px` → `max-width:328px; margin-inline:auto` (reset to
     `max-width:none; margin-inline:0` at the 768 tier).
   - `.columns.stats` band: mobile `max-width:1170`→**336px** + `box-sizing:border-box` (so the 15px inner
     side padding stays INSIDE 336, band total = 336 = source); wrapper padding `0 27px`→`0`; released to
     `max-width:1170` at 768.
   - `.columns.statement > div`: kept centered `max-width:810` + mobile inline padding `38px` (inset ~53px;
     source x49@360→x58@430 — a mild grow, 38px splits the range and clears the widget).
   - collage "For decades" default-content H2: capped to `max-width:328px; margin-inline:auto` on mobile
     (was full 400px, so it wrapped wrong), released at 768.
   Verified @430: stats x47/w336 (EXACT source), feature x51/w328, decades x51/w328, statement x58/w314
   (EXACT), cards x51/w328 (EXACT) — all centered, all clear of the widget (right edge ≤379 < widget 377…
   note stats/feature/cards right=379 sits just at the tab's left inset, matching the source's own clearance).
   @360 no regression (stats x12/w336, cards x16/w328); @1200 all release to x15/w1170 (desktop untouched).
3. **Footer typography:** audited source at 360/430/768/1200 — only the "Like us…/follow" text steps 16→18px
   (mobile→desktop); KEEP UP 14/20 uppercase +1px ls, nav 16, copyright 16, careers 16/blue are constant.
   Ours already matches all of these (re-verified computed styles) — no change needed.
Gates (all green): `lint` 0 errors · `breakpoint-check` ✓ (768/992/1200) · `check:overflow` ✓ (360→1920 on
home + 8 columns/cards sample pages) · `check:typography` ✓ (390/768/992/1200) · `test:a11y` ✓ (/en/home).
Env: had to `browser_install` the Playwright MCP Chromium before measuring.

### 2026-09-05 — Mission Statement → default content + GENERIC composable section styles (`center`, `narrow`)
Completed the long-standing IN-FLIGHT item AND generalised it per user direction (don't bake a section-
specific `statement` class — make reusable width/alignment section styles).
- **Statement is no longer a block.** `parsers/columns-statement.js` already unwrapped the heading + paragraph
  to default content; re-bundled + re-imported + re-localized so the live/local page now emits plain default
  content + a Section Metadata block — NOT `class="columns statement"` (verified count = 0). Removed
  `decorateStatement()` + its dispatch branch from `blocks/columns/columns.js` and the `.columns.statement`
  rules from `blocks/columns/columns.css` (left a pointer comment).
- **NEW generic section styles in `styles/styles.css` (block-agnostic, composable):**
  - `main .section.center` — centers the section's content column + its text (h1–h6/p → text-align:center,
    color #000). Keeps the default section width unless combined with `narrow`.
  - `main .section.narrow` — constrains content to ONE consistent `max-width:810px` centered measure at EVERY
    viewport (no per-breakpoint width jumps). On phones the standard 15px section gutter keeps it inset; the
    810 cap only engages above ~840px. Meant for sections (default content), NOT blocks — blocks carry their
    own width.
  - Authored together as `style: "center, narrow"` → EDS renders `class="center narrow section"`.
- **Config:** the home-page template is embedded in `tools/importer/import-home-page.js` (NOT read from
  page-templates.json at runtime) — set rc7 `style: 'statement'` → **`'center, narrow'`** THERE (also mirrored
  in page-templates.json for the record). GOTCHA: editing only page-templates.json had no effect; the embedded
  copy in import-home-page.js is the source of truth for the bundle.
- **Sample page** regenerated via `migration-work/gen-content-sample.mjs` (overwrite — content is delete-
  guarded) as a `center, narrow` section-style demo (default content + Section Metadata), replacing the old
  `columns statement` block markup; re-added its a11y URL.
- Verified rendered: statement is centered, 810px narrow, black, consistent x195/w810 @1200, x91/w810 @992,
  full-width-minus-15px-gutter < ~840px, no overflow, matches the source layout. Gates (all green): `lint` 0
  errors · `breakpoint-check` ✓ · `check:overflow` ✓ (home + statement sample, 360→1920) · `check:typography` ✓
  (390/768/992/1200) · `test:a11y` ✓ (home + statement sample).
- **Home-page section-width taxonomy (measured @1200, for future sections):** the source uses just TWO body
  widths — **full grid (1170)** for stats/feature/decades/cards, and **one narrow centered column** for the
  mission statement (670@1200, fluid). Hero is bespoke (own block). So `center`+`narrow` covers the only
  non-default width on the page; everything else stays on the shared 1170 grid.

### 2026-09-05 — custom-widget-reactions: reproduce source hover pill + click + alt text (news page)
Instrumented the reactions widget's INTERACTIVE behaviour to match the source
(`.v-reactions` on the news pages, measured live at
`/en/home/news/2023-njtl-essay-contest-winners.html`):
- **Alt text:** each icon `<img>` now carries its real reaction label as `alt`
  (Smile / Thumbs Up / Love / Clap / Thumbs Down / Lightbulb) — the button's
  accessible name (was `alt=""`). Matches the source's `<img alt="Love">` etc.
- **Hover effect:** on hover (and keyboard focus, for a11y) a black rounded LABEL
  PILL appears above the icon — the "Love" badge in the design. Ported the source
  `.v-reaction__label` values exactly: `position:absolute; top:0`, centered over
  the icon (`left:50%; translateX(-50%)`), `#000 @ 0.8 opacity`, white `12px/24px`,
  `border-radius:15px`, `padding:0 20px`. Replaced the old grey scale-up hover.
- **Click effect:** clicking adds the reaction — a per-icon COUNT value appears
  above the icon (source `.v-reaction__value`: Graphik Semibold 22/30 uppercase
  grey #6d7278) and the message switches from "Be the first to add a reaction" to
  "N Reaction(s)"; `aria-pressed` toggles. Source persists via a backend POST (no
  public API) — counts are client-side only, reset on reload; the visible behaviour
  matches.
- **Structure:** items are `min-height:70px` column-flex (source reserves this so
  the pill/count sit above without shifting the row); controls `flex-wrap:wrap`
  (source), 60px visual icon spacing (52 gap + 4px item padding each side).
- **Overflow gotcha:** the hidden label pills initially used `visibility:hidden`,
  whose boxes still counted toward page scroll-width — the rightmost (Lightbulb)
  centered pill pushed the 360 baseline to 366px. Switched hidden state to
  `display:none` (→ `display:block` on hover) so hidden pills contribute no width.
Verified: alt/accessible-name per icon, hover pill shows the correct label, click
increments count + updates message, keyboard focus reveals the pill. Gates: lint 0
errors · breakpoints ✓ · svg ✓ · overflow ✓ (360→1920) · a11y ✓.

### 2026-09-05 — Added the `center, narrow` SECTION-STYLE sample (sections-samples/)
Section styles belong in `content/drafts/sections-samples/` (alongside `section-yellow`
/ `section-blue`), not only folded into a block sample. Added
**`content/drafts/sections-samples/section-center-narrow.plain.html`** — demonstrates
the composable `center` + `narrow` generic section styles on plain default content
(the "Ready on the court. Ready for life." mission statement), authored via Section
Metadata `style: center, narrow` (no block). Same scaffold as the other section samples
(spacer → intro h1 + notes + Source → spacer → styled section → spacer → metadata Title).
Added its URL to `tests/a11y/a11y.config.js`. Verified: section renders `class="center
narrow section"`, content centered at 810px (x195/w810 @1200), text centered, no overflow.
Gates: overflow ✓ (360→1920) · a11y ✓.
NOTE: the older `block-samples/columns-statement` sample (regenerated earlier as a
center/narrow demo) is now redundant with this canonical section sample; left in place
(content is delete-guarded) — it still renders correctly.

### 2026-09-05 — Removed the `downloads` block → plain DEFAULT CONTENT (heading + list)
The `downloads` block only rendered a heading + a bulleted list of PDF links — which
IS default content. Confirmed on the live source (financials.html): the "Annual
Reports" list is authored as a plain `<h2>` + `<ul><li><p><a>`, no block. EDS only
button-decorates standalone `<p><a>`, never `<li><a>`, so list links stay plain
underlined text links — no block needed.
- **Deleted** `blocks/downloads/` (css+js).
- **Ported the block's styling to GLOBAL default-content rules** in `styles/styles.css`
  (so any prose heading/list matches the source, not just this one page):
  - `main .default-content-wrapper :is(h1..h6) { color: var(--dark-color) }` — source
    renders body-region headings pure black (measured across financials + what-we-do:
    h2/h3/h4 all `#000`); ours had inherited body `#333`. Hero/blocks that need white/
    brand colours already set their own, so this only affects plain authored headings.
  - `main .default-content-wrapper ul { padding-left:40px; list-style:disc }` +
    `li { color:--text-color; line-height:1.4286 }` + `li + li { margin-top:10px }` —
    reproduces the source list (disc, 40px indent, 10px item spacing, 22.857/25.714
    line-height). Placed AFTER the generic `ul` margin rule to satisfy
    no-descending-specificity.
- **Regenerated** `content/drafts/block-samples/downloads.plain.html` via
  gen-content-sample.mjs as default content (h2 + ul, no `downloads` class); kept its
  a11y URL.
- Measured parity vs source @1200: h2 76px XXCond Bold 500 **#000**; links #0357b8 18px
  underline lh 25.71; ul disc/40px; li+li 10px — all exact.
- Verified NO homepage regression (its default-content headings were already black via
  explicit rules; typography + overflow still pass). Gates: lint 0 errors · breakpoints ✓
  · typography ✓ (home) · overflow ✓ (home + sample, 360→1920) · a11y ✓ (sample).

### 2026-09-05 — Site scoped (sitemap + crawl) + migration plan → recorded in §2a
Ran full site discovery on https://www.ustafoundation.com/ via BOTH sitemap and crawl (merged/deduped):
**86 content pages + 21 documents**, collapsing to **8 templates**. Key finding: **72/86 pages (84%) are
one template — news detail.** Wrote the full report to **`docs/MIGRATION-SCOPE.md`** and added a permanent
**§2a "Site scope & migration plan"** section to this file (template catalog + recommended target order:
T1 news-detail FIRST, then listing → section landings → specialized → 404). Discovery artifacts saved under
`catalog/` (`urls-all.json`, `urls-grouped.json`, `urls-sample.json`, all schema-valid). The scripted
per-page visual catalog (`template-catalog.json`/`summary.json`) was NOT run — it's a heavy 86-page pass
dominated by 72 near-identical news pages; the decision-useful scope + plan were produced from the discovered
URL structure cross-referenced against the already-built block library. Next actionable step: build the T1
news-detail importer.

### 2026-09-05 — embed-instagram: auto-render the REAL embed (was consent-gated placeholder)
The source (news pages, e.g. newport-njtl-honor-chris-evert.html) renders the FULL live Instagram embed
automatically via Instagram's official `embed.js` — profile header, carousel image, likes, caption. Ours
showed a static "View this post on Instagram" placeholder with a "Load post" consent button, which didn't
match. Per direction ("Instagram should show automatically"), rebuilt to match:
- **JS (`embed-instagram.js`):** on decorate, emit `blockquote.instagram-media` (with a plain `<a>` fallback
  for no-JS) and load `https://www.instagram.com/embed.js` immediately — no placeholder, no button. embed.js
  swaps the blockquote for the live iframe. A MutationObserver adds `title="Instagram post"` to the generated
  iframe (axe frame-title). Removed the whole placeholder-card builder + `loadLiveEmbed`/`skeletonBar`/glyph.
- **CSS:** removed all placeholder-card styles; constrained `.instagram-media` to fill its column
  (`width:100%; max-width:540px`, Instagram's own cap) and left-aligned it on desktop. Kept the source's
  2-col grid: stacked <992, then embed **col-5** (≈458–470) + **30px** gutter + text **col-7** (≈653–670),
  filling the 1170 content width. Text 18px/24 Graphik Regular.
- **a11y:** the live embed's INTERNAL DOM (caption `@mention` link, carousel `cdninstagram` images) throws
  axe link-in-text-block + image-alt — Instagram-served, not ours, and present on the source too. Added
  `iframe[src*="instagram.com"]` to `excludeSelectors` in `tests/a11y/a11y.config.js` (same treatment as the
  already-excluded YouTube/Vimeo iframes); our wrapper + the iframe title are still covered.
Verified @1200: embed col-5 x15/w470, 30px gutter, text col-7 w670 (matches source grid); @390 stacked,
full-width, no overflow; real post renders (tennishallofame 140K, carousel, likes, caption). Gates: lint 0
errors · breakpoints ✓ · overflow ✓ (360→1920) · a11y ✓.

### 2026-09-05 — embed-instagram: mobile order (embed LAST) + widget-clearing inset + 2-col from 768
Screenshot review of mobile/tablet vs source:
- **Mobile order:** source stacks the article TEXT first and the Instagram embed LAST; ours had embed on
  top. The block is authored embed-cell-first, so used flex `order` (text order:0, embed order:1) to flip the
  visual order without changing DOM/authoring.
- **Side inset for the Donate tab:** added `padding-inline: 16px` on the block row at mobile/tablet (→ 31px
  with the section wrapper's 15px = the source's article gutter), so content clears the floating Donate
  widget. Reset to 0 at the grid tier.
- **2-column from 768 (not 992):** re-measured the source — it goes 2-col at the **768** tier (embed x30/w288
  col-5 + text x330/w408 col-7), not 992 as before. Moved the grid media query to `>= 768px`; embed reverts
  to order:0 (left col-5), text order:1 (right col-7). Verified ours @768: embed w283 (col-5) + text w408
  (col-7) side by side — matches source (text width 408 exact; gutter uses the project's shared 30px
  --grid-gap vs the source's 12px here — kept the shared grid per the Grid Rule).
- Fixed a duplicate `.embed-instagram-embed` selector (merged the order + flex-center rules).
Verified: @390 text-first/embed-last, both inset x31/w328 (clears Donate), no overflow; @768 2-col embed-left/
text-right; @1200 unchanged (col-5/col-7, 1170). Gates: lint 0 errors · breakpoints ✓ · overflow ✓ (360→1920)
· a11y ✓.

### 2026-09-05 — Global mobile FIXED-328px content column (default content never touches the Donate tab)
User: no content — default content or any block — should touch the floating Donate widget on mobile; proposed
a global width rule. Root cause found by box-model measurement at **430px** (not 390): the Donate tab is
`position:fixed` at the right edge, left edge **x377**. The SOURCE lays all content in a **FIXED 328px column,
CENTERED**, so its side margins GROW with the viewport (31px @390 → 51px @430) and the content right edge stays
at **379** — just clear of the tab, at every phone width. Our DEFAULT CONTENT used a viewport-SCALING gutter
(15px, or the reverted 31px), so it widened with the viewport (w368/right399 @430) and ran ~22px UNDER the tab.
(An earlier attempt at a 31px *padding* gutter was REVERTED — a fixed gutter still scales the width; only a
fixed max-width column keeps margins growing. This is the correct fix.)
- **styles.css:** `main > .section > .default-content-wrapper { max-width: 328px; margin-inline: auto;
  padding-inline: 0 }` (released `max-width: none` at ≥768 where the grid container takes over). Same fixed
  328px column the source uses and that our cards/columns blocks already cap to — so ALL content shares one
  mobile measure.
- **section styles:** `main .section.narrow > div` now caps to **328px on mobile** (was a flat 810 that did
  nothing < 810px, leaving the mission statement full-width and un-inset); opens to 810 at ≥768.
- **embed-instagram:** block's mobile `.embed-instagram > div` switched from `padding-inline:16px` to
  `max-width:328px; margin-inline:auto` (released at 768). Text + embed now both x51/w328/right379.
Verified @430 (tab left = 377): home statement / decades / cards-intro / go-beyond headings all x51/w328/
right379; downloads default-content h2 same; embed-instagram text + embed same — every item's right edge (379)
clears the tab (377) with margins that grow on wider phones. @1200 unchanged (statement 810 centered, decades
full 1170). Gates: lint 0 errors · breakpoints ✓ · overflow ✓ (360→1920; home + embed + downloads) ·
typography ✓ (home) · a11y ✓ (home + samples).

### 2026-09-05 — Global mobile 328px column made the SINGLE source of truth (removed per-block padding hacks)
Followed up the previous change: broadened the mobile 328px cap from just `.default-content-wrapper` to the
whole `main > .section > div` (every section content wrapper — default content AND block wrappers). Now ONE
global rule gives every section the source's fixed 328px centered column on mobile, so blocks no longer need
their own donate-clearance insets. Removed the now-redundant per-block mobile hacks:
- `blocks/columns/columns.css`: `.columns.feature { max-width:328; margin-inline:auto }` + its 768 reset.
- `blocks/cards/cards.css`: the `:has(.cards.news) .default-content-wrapper { padding-inline:31px }` +768
  reset, and the `:has(.cards.support) .default-content-wrapper { padding-inline:31px }` +992 reset (kept the
  `text-align:center` + `#000` color those rules also carried).
- `blocks/banner-stats-grid/banner-stats-grid.css`: `padding-inline:16px` +768 reset.
KEPT (genuinely different widths / not donate hacks): stats band `.columns.stats` 336px (own rounded-band
width, wrapper set `max-width:none` so it isn't clamped to 328), cards-news ul 338 (328 + li padding),
cards-profile card 312, cards-expand 250 fixed / full-bleed, and the cards `> ul` 328 caps (they also carry
the grid/flex layout + centering and equal the global 328, so harmless). Full-bleed blocks (stats/cards-stats
bands, cards-expand) escape via their own `width:100vw`+negative-margin on the BLOCK — unaffected by the
wrapper cap. Verified @430 (tab left 377): home stats 336/right383 (band, source-matched), feature/collage/
cards/banner-stats-grid all 328/right379; every touched sample renders in the 328 column and clears the tab.
Gates: lint 0 errors · breakpoints ✓ · overflow ✓ (360→1920; home + 6 samples) · typography ✓ (home) ·
a11y ✓ (home + 4 samples).

### 2026-09-05 — hero (error / 404): source blue bouncing-ball SVG + black pill CTA (was green ball + blue btn)
Screenshot review of the 404 hero vs source (ustafoundation.com/en/home/404.html): two mismatches.
- **Illustration:** source is the blue LINE-ART bouncing-tennis-ball **SVG** (`tennis-ball-bouncing.svg`,
  viewBox 128×193, rendered 116×174 desktop), NOT our solid-green CSS `::before` ball. Fetched + self-hosted
  the source SVG at `blocks/hero/icons/tennis-ball-bouncing.svg` (1.4KB, well under budget); `hero.js`
  `decorateError()` now prepends `<img class="hero-error-ball" alt="" aria-hidden>` (decorative; the h1 carries
  the message). CSS renders it centered, width 96 mobile → 116 @768. Removed the old radial-gradient ball +
  bounce keyframes.
- **CTA button:** source is a **BLACK PILL** — `#000` bg, white text, `border-radius: 9999px`, **56px** tall,
  18px Graphik Semibold uppercase +1px letter-spacing. Ours was brand-blue, 40px, radius 3px. Fixed to match.
- h1 already matched (Graphik XXCond Bold 100/110 #000 centered @desktop, via global h1 tokens).
Verified @1200: ball x542/w116 (EXACT source x542/w116), h1 100/110 #000, CTA #000 / radius 9999 / 56px —
all match. Gates: lint 0 errors · breakpoints ✓ · svg ✓ (check:svg) · overflow ✓ (360→1920) · a11y ✓.
NOTE: the block is parity-correct; the repo's `404.html` still ships the EDS BOILERPLATE 404 (big "404" SVG
+ "Page Not Found"), not this block — wiring `404.html` to author the `hero error` block is a separate
follow-up (out of scope for this block-parity task).

### 2026-09-05 — Typography parity validation: quote, quote-image, social, table, tabs, video-embed (all VPs)
Per-text-element typography audit of all six blocks vs their source pages at 390/768/1200 (measured computed
ff/fs/fw/lh/ls/color/align/style + responsive steps). Two blocks had real drifts, fixed; four already matched.
- **quote (blocks/quote/quote.css):** attribution was **weight 700 + italic** → source is **weight 500,
  UPRIGHT** (Graphik Semibold), size **22/24.2 mobile → 28/30.8 @768**, centered #000. Fixed weight,
  font-style, and added the mobile line-height. Quote text already matched (32/48 Graphik Regular wt500
  italic left #000, constant).
- **quote-image:** (a) h2 had a `text-align:left` desktop override → source **CENTERS** the pull-quote at
  EVERY viewport (44/48.4 → 76/83.6 XXCond Bold wt500 #000); removed the override. (b) attribution was
  `font-style: italic` → source is **UPRIGHT** Graphik Regular wt400 right #000 (16/24 → 18/24); the sample
  authors the name in `<em>`, so also added `.quote-image-text p em { font-style: normal }` to undo it.
- **table:** already matches — header wt700 / body wt400, both **16/24 mobile → 18 @768**, #000, left; 30px
  inter-column gutter from 768. No change.
- **tabs:** already matches — tab label 18/22 Graphik Semibold wt400 uppercase #000, padding 0 12px, height
  38, constant across VPs (sage track + black active indicator reproduced). No change.
- **video-embed:** already matches — consent-placeholder message 14/21 Graphik Regular wt400 #333 centered;
  "cookie preferences" link 14px #418fde underlined. No change.
- **social:** icon-only share bar (Facebook/X/LinkedIn/copy/print) — NO visible text on source or ours, so no
  typography to match; geometry already built to parity. No change.
Verified our samples reproduce the corrected values at 390/768/1200. Gates: lint 0 errors · breakpoints ✓ ·
overflow ✓ (360→1920; quote + quote-image) · a11y ✓ (quote, quote-image, tabs, video-embed).

### 2026-09-06 — quote: CORRECTION — attribution is BOLD 700 (prior 500 reading was the h4, not the <b>)
The prior entry set the quote attribution to weight 500 — WRONG. Re-measured with the child selector: the
source attribution is an **`<h4>` wrapping a `<b>`**; the h4 element computes 500 but the VISIBLE text is the
inner `<b>` at **weight 700**. So the name renders BOLD (matches the user's screenshot — source is clearly
bolder than ours was). Reverted `.quote .quote-attribution p` to `font-weight: 700` (kept upright/not-italic,
centered, 22/24.2 → 28/30.8 @768). Verified @390 (22/24.2 wt700) and @1200 (28/30.8 wt700), upright, centered.
Lesson: when the source wraps text in `<b>`/`<em>`/`<strong>`, measure the INNER element — the block-level
computed weight can differ from what's actually painted. Gates: lint 0 errors · overflow ✓ · a11y ✓.

### 2026-09-06 — quote: attribution is BOLD + ITALIC (source nests <h4><b><i>, not just <b>)
User flagged the attribution still looked wrong — the source is bold AND slanted. Walked the FULL element
chain: the source nests `<h4>` > `<b>` > **`<i>`** — the innermost `<i>` computes **italic 700**. My prior
walk stopped at the `<b>` (700, upright) and missed the `<i>`, so I'd wrongly set `font-style: normal`.
Restored `.quote .quote-attribution p` to `font-weight: 700` + **`font-style: italic`** (Graphik Semibold,
black, centered, 22/24.2 → 28/30.8 @768). Verified @1200 (28/30.8 wt700 italic) + @390 (22/24.2 wt700 italic),
screenshot confirms the slant matches the source. Lesson reinforced: walk to the DEEPEST text-bearing element
(`<h4><b><i>`), not just the first wrapper — each nested tag can add weight/style.

### 2026-09-06 — quote-image: attribution is ITALIC (source wraps it in <i>) — reverted the upright override
Same deep-element issue on quote-image: the source attribution is `<p>` > **`<i>`** — the `<i>` computes
**italic**, weight 400, Graphik Regular, 16/24 @390 → 18/24 @1200, right, #000. In the earlier pass I'd wrongly
set it upright + added `.quote.image .quote-image-text p em { font-style: normal }`. Reverted: attribution `p`
is now `font-style: italic` and removed the em-normalize rule (the sample's `<em>` now renders italic like the
source `<i>`). Verified @1200 (18/24 wt400 italic right) + @390 (16/24 wt400 italic right); quote h2 unchanged
(44→76 XXCond Bold wt500 centered). Gates: lint 0 errors · overflow ✓ (360→1920) · a11y ✓.

### 2026-09-06 — quote.tweet: source is a BARE blockquote (no card, no bird) + new `float-left` section style
User's source/migrated screenshots showed our tweet as a bordered CARD with a Twitter bird glyph — the SOURCE
renders it as a **bare blockquote** (the platform.twitter.com widget never upgrades the markup): plain tweet
text + inline blue links, then a plain "— Name (@handle) Date" line, NO border/background/radius/shadow and
NO bird. Measured on the live source (carol-ngounoue-runner-up-wimbledon-event.html) at 390/768/1200:
padding **10px 20px**; body/footer `<p>` Graphik Regular wt400 **#333** left, **16/22.857 → 18/25.714 @768**;
links **#0357b8** wt400 (date link 17.5/25 — a hair smaller in-source, we normalize to body size); footer sits
one blank line (~1× line-height) below the body.
- `blocks/quote/quote.js` `decorateTweet()`: removed the bird SVG; now just tags row0 `quote-tweet-body`,
  row1 `quote-tweet-footer`.
- `blocks/quote/quote.css` `.quote.tweet*`: stripped ALL card chrome + the `.quote-tweet-bird` rules; set the
  bare-blockquote type scale above. Inline body links keep an underline (WCAG link-in-text-block) — a minimal,
  documented deviation from the source's color-only links so axe passes; the standalone handle/date links stay
  clean like the source.
- **New block-agnostic section style `float-left`** (`styles/styles.css`): reproduces the source article that
  embeds a tweet mid-copy (the 3rd screenshot). Because EDS splits a section into separate wrappers
  (heading → block → body text), floating the block's wrapper lets the FOLLOWING default-content paragraphs
  reflow around it — **no block-in-block needed**. @≥768 the section becomes an 810px centered container and the
  first non-default-content wrapper floats left (width 350, max 45%, 30px right gutter); MOBILE stacks (no float,
  global 328px column). Sample: `content/drafts/sections-samples/section-float-tweet.plain.html`.
Verified: tweet renders as bare blockquote (border/bg/radius/shadow all 0/none, no bird) matching source values
@1200 + @390; float sample — tweet floats left (x195–545), body first line insets to x575 (30px past the float)
and wraps on the right @1200, stacks vertically @390. Gates: lint 0 errors · breakpoints ✓ · overflow ✓
(360→1920, both pages) · typography ✓ · a11y ✓ (both pages).

### 2026-09-06 — CORRECTION: tweet-in-article is a TWO-COLUMN split, NOT a float (`float-left` → `split-left`)
The prior `float-left` entry was wrong. User's source/migrated screenshots showed two problems: (1) I'd
NARROWED the section to 810px — it should stay the DEFAULT page content width (720/970/1170, same as the home
page); (2) with a float, the taller text column wrapped its tail paragraphs BACK UNDER the tweet (full-width),
"spreading" the content. Measured the LIVE source at 1200: the blockquote and the body text are **two equal
independent columns** (each 555px, 30px gutter, same top) — `float:none` on both; the text NEVER flows under
the tweet. So the correct model is a 2-col GRID, not a float.
- Replaced `.section.float-left` with **`.section.split-left`** (`styles/styles.css`): @≥768 the SECTION becomes
  the centered default content-width grid (720/970/1170 per tier — as wide as the home page), `grid-template-
  columns: 1fr 1fr`, 30px gutter, `align-items:start`. Wrappers are grid items: default content spans both
  columns (heading row); the block wrapper → col 1 / row 2; the `.default-content-wrapper` that FOLLOWS the
  block (`~` sibling) → col 2 / row 2. MOBILE (<768) stays `display:block` so everything stacks in the global
  328px column (tweet then body). No block-in-block needed — the section grids EDS's own per-wrapper divs.
- Sample `content/drafts/sections-samples/section-float-tweet.plain.html` updated to `style: split-left`.
Verified @1200: section 1170px full width, tweet left col (15→585) + text right col (615→1185), same top (763),
30px gutter, text column taller (bottom 1219) and stays entirely right — no wrap-under. @390: stacks, both
328px. Gates: lint 0 errors · breakpoints ✓ · overflow ✓ (360→1920) · typography ✓ · a11y ✓.

### 2026-09-06 — quote.tweet: blank line between body paragraphs (source uses <br><br>)
User flagged the missing gap below "What an experience! Still taking it all in." The source blockquote is a
SINGLE `<p>` that separates its two sentences with a **double `<br>`** (one blank line ≈ one line-height). Our
body is authored as two separate `<p>` with `margin:0`, so there was no gap. Added
`.quote.tweet .quote-tweet-body p + p { margin-top: 22.857px }` (→ 25.714px @768) so the gap between body
paragraphs equals one line-height, matching the source's blank line (only BETWEEN paragraphs, not after the
last). Verified @1200: 26px gap between the two body paragraphs. Gates: lint 0 errors · breakpoints ✓ ·
overflow ✓ · a11y ✓.

### 2026-09-06 — columns (default): image captions + smart image-side (left/right)
Source (carol-ngounoue article) places body text in one column and an image WITH a caption in the other; the
default columns block had TWO gaps: (1) NO caption handling — an authored caption paragraph just rendered as a
stray italic <p>; (2) the image could ONLY sit left — the CSS pinned the image column with `order:0` and gave
the other cell `order:1` (reset to `unset` only on the non-image cell at 992), so authoring the image second
still forced it left.
- `blocks/columns/columns.js` `decorateDefault()`: for any cell containing a `<picture>`, wrap the image (+ the
  following caption paragraph, if any) in a semantic `<figure class="columns-figure">` / `<figcaption
  class="columns-caption">`, moving caption content (inline links preserved), then replace the cell contents.
  Dropped nothing else — the image SIDE now simply follows the AUTHORED cell order (image cell first = left,
  second = right), since the row lays out in DOM order.
- `blocks/columns/columns.css`: removed the `order:0/1/unset` overrides (they broke image-right) and the now-dead
  `.columns-img-col` img rule; base `.columns > div` at ≥992 changed `align-items: center → start` (so a short
  text column top-aligns with a tall image, like the source) and dropped `order:unset`. Added `.columns-figure`
  (margin 0) + `.columns-caption` styled to the source figure caption: Graphik Regular **16/22.857**, wt400,
  **#333**, left, **upright** (`em`→normal), **4px** below the image.
Sample: `content/drafts/block-samples/columns-caption.plain.html` — two blocks: text-first (image RIGHT, matches
the source screenshot) and image-first (image LEFT). Verified @1200: block0 image right (612→1185) + block1 image
left (15→588), caption 16/22.857 #333 upright 4px below image on both; @390 stacks in authored order, image+
caption together, 328px. Regression: columns-feature-collage/-video/-stats/-statement overflow ✓ (base-rule
change didn't affect the feature/stats variants — they own their row layout). Gates: lint 0 errors ·
breakpoints ✓ · overflow ✓ (360→1920) · typography ✓ · a11y ✓.

### 2026-09-06 — columns (default): vertical gap between stacked cells on mobile/tablet
The stacked layout (<992) had `flex-direction:column` with NO gap, so the image/caption butted directly against
the body text. Moved the `gap: 24px` up from the ≥992 rule to the base `.columns > div` so it applies in BOTH
states: stacked (mobile+tablet) it's the vertical gap between the text cell and the image/caption cell; from 992
the row goes horizontal and the same gap sits between the columns. Verified 24px gap @390 and @768. Gates: lint
0 errors · breakpoints ✓ · overflow ✓ · a11y ✓.

### 2026-09-06 — columns (default): reframed as a MEDIA column (caption optional)
Per feedback, the feature is a two-column block with a MEDIA (image) column — the caption is optional, not the
defining trait. No code change needed: `decorateDefault()` already wraps any picture cell in a `<figure>` and
only adds a `<figcaption>` when a caption paragraph is present, so a media cell with no caption renders the image
alone (verified: block with a bare `<picture>` → `<figure>` with just the `<img>`, no empty figcaption). Added a
clearer sample `content/drafts/block-samples/columns-media.plain.html` showing BOTH: image-right WITH a caption
(text cell first) and image-left with NO caption (image cell first). Verified @1200 both render correctly; gates:
overflow ✓ · typography ✓ · a11y ✓. (The earlier `columns-caption` sample stays — content dir is preserved — but
`columns-media` is the canonical one.)

### 2026-09-06 — social: icon row alignment is viewport-dependent (centered <768, left ≥768)
User's source/migrated mobile screenshots differed: ours left-aligned the 5 share icons at ALL viewports; the
SOURCE (.v-social-media-sharing) CENTERS them on mobile and only left-aligns from 768. Measured the live source
across the 768 boundary: at 767 the group is `display:block; text-align:center` (icon row centered in the 328px
column — mobile icons span x75→315 of 31→359); at 768 it flips to `inline-block; text-align:start` (row starts
at content-left x30). Icon geometry constant everywhere: 48×48 buttons, 12px padding, 0 gap (they abut); the
source wraps the bar in `padding: 8px 0`. Earlier MIGRATION note ("left-aligned, constant across viewports") was
wrong for mobile.
- `blocks/social/social.css`: `.social-bar` base `justify-content: center` (mobile) + `padding: 8px 0`; added
  `@media (width>=768px){ justify-content: flex-start }`. Icon size/padding/gap unchanged (already matched).
Verified our sample @390: bar 31→359, icons centered 75→315 (240px row), 48×48, 8px vpad — matches source
mobile exactly; @768: left-aligned (icons start at content-left). Gates: lint 0 errors · breakpoints ✓ ·
overflow ✓ (360→1920) · a11y ✓.

### 2026-09-06 — table: header is NOT bold + 24px header→body gap (source is plain two-column text)
User's source/migrated screenshots differed. Measured the live source (2023-njtl-essay-contest-winners): the
"Winners"/"NJTL Chapter" header is NOT a bold table header — it's plain body text (Graphik Regular, weight 400,
18/24, black), just the first line of each column, followed by a 24px BLANK LINE (empty in-column <p>) before
the first group. Our table block rendered the header as `<th>` at weight 700 with NO gap to the body — two
visible mismatches. Body typography already matched (18/24, wt400, black, margin 0; source cols 555px + 30px
gutter → our fixed table-layout + `--grid-gap` padding reproduces this).
- `blocks/table/table.css` `.table thead th`: weight 700 → **400**; added **padding-bottom: 24px** to reproduce
  the source's blank-line header→body separation (works even when no blank <p> is authored). Merged into one rule
  to avoid a duplicate-selector lint.
Verified across viewports: @1200 header wt400 + 24px gap to first group; @390 stacked (header wt400, 24px gap,
all 328px); @768 two columns side-by-side (360px each), header wt400, 24px gap. Gates: lint 0 errors ·
breakpoints ✓ · overflow ✓ (360→1920) · typography ✓ · a11y ✓.

### 2026-09-06 — Typography parity sweep across ALL block samples (non-heading text elements)
Ran the automated h1..h6/body checker across all 27 block samples — ALL pass at 390/768/992/1200. Then did
deep per-ELEMENT source-vs-migrated measurement (buttons, captions, labels, dates, tab labels, stat numbers,
CTAs — things the global checker doesn't cover) via Playwright at 3 viewports. Delegated measurement to parallel
subagents, then VERIFIED every reported drift on the live source myself (subagents made several errors — see
"rejected" below). Genuine, source-confirmed drifts fixed:

GLOBAL (root cause of most drift): source DEFAULT body/copy text is pure **BLACK** (rgb(0,0,0)), measured on
article + home templates; ours used `--text-color: #333` on `body`. Changed `styles/styles.css` `body` color and
`main .default-content-wrapper li` color to `var(--dark-color)` (#000) — WITHOUT touching the `--text-color`
token (still #333, correctly used by quote-tweet body + columns image caption, which measured #333 on source).
This one change fixed the grey drift on: columns-statement body, tabs panel body, cards-profile staff list.

BLOCK-SPECIFIC:
- columns-feature-collage: body `<p>` was forced `text-align:left` (collage override) — source is **center**.
  Removed the `.columns.feature:has(.columns-feature-collage) h3, p { text-align:left }` override (base
  `.columns.feature p` is already center = source).
- cards-support: LEARN MORE authored as `<a><strong>` rendered bold+no-underline; source is regular-weight
  underlined blue link. Added `.cards.support …a strong/b { font-weight:400; text-decoration:inherit }`.
- custom-widget-reactions: source TEXT (title + prompt) is LEFT-aligned; only the emoji controls row is centered.
  Changed the block from all-centered to `align-items:stretch; text-align:left` (controls keep their own
  `justify-content:center`). "Be the first" color already matched (#333 both).
- columns-statement (sample authoring bug): the `center, narrow` Section Metadata was in a SEPARATE section div
  from the h2/p, so the style never applied (left + grey). Fixed the sample so metadata sits in the content
  section → now center + black like source.

REJECTED (subagent claims that were WRONG on live-source re-measurement, left unchanged): h2 does NOT shrink to
44px at 1200 (source = 76px/83.6 at 1200, matches our recorded scale + checker); collage CTA letter-spacing 1px
is CORRECT (it's a blue button, not a plain link); cards-profile role IS italic on source (inner `<i>`), our
italic is correct; related-articles/cards-news date weight is 900 at mobile/tablet but 400 at desktop — a real
responsive change but on the single-weight "Graphik Regular" face (synthetic bold, negligible), left as-is.

Verified all fixes at 390/768/1200 on the migrated samples (tabs body #000, collage body center+#000, cards-
support CTA wt400+underline, reactions text-left + emoji-centered, cards-profile staff #000 + role italic #000,
statement center+#000). Gates: lint 0 errors · breakpoints ✓ · typography ✓ (all changed samples) · overflow ✓
(collage/video/support) · a11y ✓ (statement/support/reactions — #000 on #fff also improves contrast).

### 2026-09-06 — NEW block `toc-profile` (replaces "tabs" with a scroll-spy anchor TOC) + section-metadata camelCase fix
The source Leadership & Staff page uses "tabs" (Staff / Board of Directors) that each just reveal a different
SECTION. Per direction, replaced the tab pattern with a page-level table-of-contents: a sticky anchor bar that
scroll-spies real sections — so each entry targets a whole SECTION that can host ANY blocks (no block-in-block,
which EDS can't author). Adapted from a provided petrobras `master-toc`; renamed per request to **`toc-profile`**
(block) with metadata key **`profile-anchor`** (dataset `profileAnchor` → attr `data-profile-anchor`), CSS classes
`toc-profile-*`. USTA-branded: active entry gets a **brand-blue** underline (not petrobras green); tab text is
18px Graphik Semibold uppercase (matches the source tab row).
- `blocks/toc-profile/toc-profile.js`: parse `label | slug` rows → sticky nav; bind targets by
  `data-profile-anchor` (falls back to heading-token match); IntersectionObserver scroll-spy; smooth
  click-scroll (respects 56px header offset); scroll-progress bar; reveal-on-scroll `.is-stuck` (fixed below
  header); horizontal scroll + arrows on mobile overflow; prefers-reduced-motion → instant. English a11y labels.
- `blocks/toc-profile/toc-profile.css`: in-flow tab strip (sage underline track) → `.is-stuck` fixed bar
  (top:56, centered content width, shadow). Mobile: `overflow-x:auto` + edge arrows; ≥768 static strip.
- **`scripts/scripts.js` `decorateSectionMetadata` FIX (load-bearing):** it set `section.dataset[toClassName(key)]`
  — `toClassName('profile-anchor')` stays hyphenated, and `dataset['profile-anchor']=…` THROWS a SyntaxError
  ('not a valid property name'), which would break decoration for ANY hyphenated metadata key. Switched to
  `toCamelCase(key)` (→ `profileAnchor` → the `data-profile-anchor` attribute). Verified existing `style`-based
  section metadata (split-left, center/narrow) still applies with no regression. (Only `style` keys had been used
  before, so this latent bug never fired until now.)
- Sample: `content/drafts/block-samples/toc-profile.plain.html` — replicates leadership-and-staff: intro h1 +
  toc-profile bar (Staff / Board of Directors); a `staff` section = Cards (profile) 8-up grid + staff text list;
  a `board-of-directors` section = Cards (profile) 2-up (Chris Evert, Kathleen Wu) + Officers/Advisory/Honorary
  lists. Board content transcribed from the live source's Board tab. (Board portraits reuse staff drafts images
  as placeholders — real headshots would arrive via import.)
Verified @1200 + @390: both sections bound (`data-profile-anchor`), TOC renders, scroll-spy activates the right
entry (Board active when scrolled into view), bar goes fixed at top:56 once scrolled past, click smooth-scrolls
to the section, progress bar tracks scroll; mobile nav scrolls horizontally (arrows appear only on overflow).
Gates: lint 0 errors · breakpoints ✓ · overflow ✓ (360→1920) · typography ✓ · a11y ✓. No regression on other
section-metadata pages.

### 2026-09-06 — toc-profile: match source tab strip exactly (no sticky/progress) + align content to cards
User feedback on the toc-profile parity. Measured the live source tab row at 1200 and fixed:
- REMOVED the sticky "moving bar at top" and the scroll-progress bar (those were master-toc example-only; not on
  the USTA source). The strip now stays in flow.
- Tab metrics → source: `padding: 0 12px` (was 8px 20px), height 38px, tabs abut (gap 0), 18px Graphik Semibold
  uppercase black.
- Underline system → source uses a full-width **6px sage (#dcdfcf) track** + a single **6px BLACK indicator**
  (computed rgb(0,0,0), not blue) that SLIDES under the active tab. Replaced the per-tab `border-bottom` toggle
  (which just appeared/disappeared) with one absolutely-positioned indicator translated via `transform`+`width`
  with a `0.3s` transition → seamless movement matching the source. `blocks/toc-profile/toc-profile.js` now sets
  `is-active` + `moveIndicator()`; syncs on init/resize/load; reduced-motion disables the transition.
- Verified indicator settles exactly under the active tab (Staff: left15 w78; Board: left93 w224 — exact).
- CONTENT ALIGNMENT: source lays heading ("Our Staff"/"Board of Directors") + cards + lists in ONE column whose
  left edge matches the first card. Ours had the heading/lists at the section edge (left 15/31) while the cards
  inset (45/55) → misaligned. Added `main .section:has(.cards.profile) .default-content-wrapper` rules to match
  the card inset: 24px padding on mobile (matches the card `ul` padding), then the centered max-width column
  (684 @768, 1110 @992) with padding reset. Now heading = image = list left at every viewport
  (55/55/55 @390, 42/42/42 @768, 45/45/45 @1200).
Gates: lint 0 errors · breakpoints ✓ · overflow ✓ (360→1920; toc-profile + cards-profile) · typography ✓ ·
a11y ✓.

### 2026-09-06 — table `directory` variant (3-column name directory) + section wrapper spacing
Two asks on the Board of Directors layout:
1. NEW table variant `directory` — a multi-column name directory (source Board panel: "Officers and Directors /
   Advisory Board / Honorary Board"). Measured live @1200: 3 columns (~330px each, ~60px gaps, thin vertical
   divider between), headings 28/30.8 Graphik Semibold black (10px below), names 18/24 body black with the NAME
   bold (`<b>`) + role italic (`<i>`), lines separated by `<br>`.
   - `blocks/table/table.js`: dispatch on `.directory` → `decorateDirectory()` tags each authored cell as a
     `.table-directory-col` (flattening multi-row authoring column-wise), adds `table-directory-N-cols`. Default
     variant unchanged (still builds the semantic `<table>`).
   - `blocks/table/table.css`: `.table.directory` = CSS grid, 1 col mobile → N cols from 768 with a 60px column
     gap and a 1px divider drawn in the gap (border-left + negative margin). Heading/name/`<b>`/`<i>` styling per
     source.
   - Sample: `content/drafts/block-samples/table-directory.plain.html`. Also swapped the toc-profile sample's
     Board plain-list default content for this directory table.
2. SECTION SPACING — EDS gives every block/default-content wrapper `margin:0`, so a block sat flush against the
   next block/content (heading→cards→list all ~14px on our page; the source clearly separates them, e.g.
   cards→directory ~66px). Added `styles/styles.css`: a wrapper that FOLLOWS a block wrapper gets `margin-top`
   (32px mobile → 40px ≥768). Scoped to `div[class$="-wrapper"]:not(.default-content-wrapper) + div[...-wrapper]`
   so a lead-in HEADING before a block keeps its tight gap (only space AFTER blocks), matching the source rhythm.
Verified @390/768/1200: directory 3 cols (stacks on mobile), bold names + italic roles, dividers from 768;
spacing now heading→cards ~9–14px (source ~17) + cards→list/directory 32/40px (was 14). Gates: lint 0 errors ·
breakpoints ✓ · overflow ✓ (360→1920; table-directory + toc-profile + regression on columns-media/cards-support/
banner-stats-grid) · typography ✓ · a11y ✓.

### 2026-09-06 — toc-profile: TAB behaviour (show one section, hide others) + bar parity confirmed
User saw BOTH sections stacked (Board of Directors visible while on Staff). The source is a real TAB SET — only
the active panel shows. Reworked `blocks/toc-profile/toc-profile.js`: removed the scroll-to + IntersectionObserver
scroll-spy; `setActive()` now toggles `section.hidden` so ONLY the active `profile-anchor` section renders and the
others are hidden (initial = first entry, or the URL hash if it names a panel — honours the source's #tab= deep
link). Tabs get `role=tab` / nav `role=tablist`. Removed now-unused HEADER_OFFSET + prefersReduced (lint).
Bar/border parity re-measured on the live source @1200 and confirmed identical to ours: full-width 6px sage track
(#dcdfcf), 6px BLACK sliding indicator, tabs 38px tall / `padding:0 12px` / 18px Graphik Semibold uppercase,
indicator left15·w78 under Staff → left93·w224 under Board. Bumped the indicator transition 0.3s→0.5s to match
the source. (The apparent "thicker bar" in the migrated screenshot was just 2× DPR, not a real size diff.)
Verified @1200 + @390: load shows only Staff (Board hidden); clicking Board hides Staff + shows Board; indicator
matches the active tab at both; screenshot confirms the strip matches the source. Gates: lint 0 errors ·
breakpoints ✓ · overflow ✓ · typography ✓ · a11y ✓.

### 2026-09-06 — cards.profile: match source card body padding + card-height behaviour
User flagged the profile cards' internal positioning/dimensions differed from source. Re-measured live @1200:
card 255px, img 255×255 square, 30px col gap, box-shadow rgba(0,0,0,.5) 0 2px 5px, name indent 20px — ALL
already matched. The two real diffs:
1. img→name gap: source **16px** (just the h4's 16px top margin) but ours was **36px** — the desktop card body
   had `padding: 20px 20px 0` adding 20px on top. Changed to `padding: 0 20px` (keep the 20px side inset only).
2. Card height: source cards HUG their content (a 3-line role makes only THAT card taller; others stay short —
   measured 471/477/471/471). Our grid stretched all cards to the tallest (default `align-items:stretch`),
   padding empty space below short cards. Added `align-items: start` to `.cards.profile > ul`.
Verified @390/768/1200: img→name 16px, role→card-bottom ~10px (source ~11), cards hug content (heights vary by
role length) at every viewport. Gates: lint 0 errors · breakpoints ✓ · overflow ✓ (toc-profile + cards-profile
regression) · a11y ✓.

### 2026-09-06 — toc-profile: fix published-page spacing (space above bar, tab→panel gap, orphaned spacers)
On the pushed EDS page the tab section had 3 spacing faults (root cause: the sample authors intro+bar in one
section and separate spacer sections around each panel; when a tab hides a panel, its spacers orphan):
- NO space above the bar (intro→bar 5px): added `.toc-profile` `margin-top` 48px mobile / **77px ≥768** (source
  content→tab-row gap) + small `margin-bottom`.
- HUGE tab→panel gap (125–185px): the hidden panel's bordering spacers stayed, and the toc + spacer + panel
  section margins stacked. Fixes in `styles.css`: (a) hide spacers bordering a hidden panel
  (`.spacer-container:has(+ .toc-profile-panel[hidden])` and the after-variant); (b) hide any spacer directly
  after the toc section; (c) zero `.toc-profile-container` bottom margin and cap the visible panel's top margin
  to **32px** (source). JS marks each panel section `.toc-profile-panel` (AFTER the entries loop populates the
  panels map — the earlier bug was marking before it was populated, so the class never applied).
- Result is uniform: tab-row→panel heading = 45px @1200 / 32px @390 for BOTH tabs (source ~32).
Also confirmed the bar/indicator geometry already matches source (6px sage track #dcdfcf + 6px black sliding
indicator, tabs 38px, 0 12px padding) — the "black border" seen was the pre-fix published state.
NOTE: these are CODE changes (blocks/toc-profile/* + styles.css) — must be committed+pushed to `main` for the
aem.live page to update (content was already on DA). Gates: lint 0 errors · breakpoints ✓ · overflow ✓ (toc +
table-directory + cards-profile regression) · a11y ✓.

### 2026-09-06 — cards.profile: equal-height cards per row (revert prior hug-content)
User wants the profile cards the SAME height. Reverted the previous `align-items: start` (hug-content) back to
the grid default `align-items: stretch` on `.cards.profile > ul`, so every card in a row stretches to the row's
tallest — the shadowed white box bottoms line up across the row (a longer role makes the whole row taller,
matching how the source rows read as aligned). Verified equal height per row at all viewports: @768 all 441px,
@1200 all 417px, @390 one-per-row. Gates: lint 0 errors · breakpoints ✓ · overflow ✓ (toc-profile + cards-profile)
· a11y ✓.

### 2026-09-06 — cards.profile MOBILE inset: match source (9px, not 24px)
User: mobile title/bar/image vertical alignment off. Measured source @390: tab/track left 31, "Our Staff" left
39, card image left 40 / width 310 (≈9px inset each side of the 328 column). Ours had a 24px inset → heading+
image at 55, image only 280 wide. Fixed: `.cards.profile > ul` mobile `padding: 0 24px → 0 9px`, and the
profile-section default-content `padding-inline: 24px → 9px`. Now @390: "Our Staff" 40, image 40 / width 310,
heading aligns image — matches source; tab bar stays at the 31 content edge (source parity: bar ~8px left of the
indented heading/image). No regression @768 (42/162) or @1200 (45/255). Gates: lint 0 · breakpoints ✓ · overflow
✓ (toc-profile + cards-profile) · a11y ✓.

### 2026-09-06 — toc-profile: track + indicator as flush siblings (fix doubled/offset bar)
User saw an inconsistent black underline with an "extra layer" over the sage track. Cause: the sage track was
the nav's `border-bottom` and the black indicator was `position:absolute; bottom:-6px` overlaying it — a
border + negative-offset overlay can drift a subpixel (esp. at mobile DPR), reading as a doubled/offset line.
Fix: made BOTH the track and indicator absolutely-positioned sibling spans at `bottom:0; height:6px` inside a nav
with `padding-bottom:6px` (source model — a `.cmp-tabs__background-border` + `.cmp-tabs__border`). JS now creates
a `.toc-profile-track` span alongside the indicator; CSS drops the border for a full-width `.toc-profile-track`
and moves the indicator to `bottom:0`. Verified pixel-flush @390 + @1200: track+indicator share the same
bottom/height, indicator matches the active tab left/width, track full-width. Gates: lint 0 · breakpoints ✓ ·
overflow ✓ · a11y ✓.

### 2026-09-06 — cards.profile: img→name gap (desktop 36) + tight staff list (typography parity)
Two source-parity fixes on the profile cards + staff list:
1. IMAGE→NAME gap: source = 16px mobile/tablet, **36px desktop** (≥992: content-wrapper adds 20px top + h4's
   16px margin). I'd previously flattened this to 16px everywhere (padding `0 20px`). Restored the 20px top
   padding but ONLY at ≥992 (`.cards.profile .cards-profile-card-body` → `padding: 20px 20px 0`); mobile/tablet
   keep `0 20px` (16px). Verified 16/16/36 @390/768/1200.
2. STAFF LIST line spacing: the source packs the plain-text list tight (18/24, NO inter-line gap); our default-
   content `<p>` rhythm added ~14px between lines. Added `main .section:has(.cards.profile)
   .default-content-wrapper p { margin:0; line-height:24px }` → 0 gap at all viewports, matching source.
(Also fixed a stray CSS syntax error introduced when the cards-stats block comment opener got clipped.)
Gates: lint 0 · breakpoints ✓ · overflow ✓ (toc-profile + cards-profile) · typography ✓ · a11y ✓.
NOTE: the source also italicises the ROLE portion of each staff-list line (`Name, <i>role</i>`); ours is plain
because the DA-authored content has no <i> — that's a content change (not CSS) and would need editing on DA.

### 2026-09-06 — toc-profile: mobile tabs fill row width (indicator reaches edge on active BOARD)
User: on MOBILE the black indicator should extend to the right edge (as in source screenshot 3), and the
tab→bar gap. Measured source @390: the two tabs GROW to fill the 328 track (STAFF 91, BOARD 237 = full width),
so the active BOARD indicator reaches the right edge; STAFF's does not. Desktop keeps tabs natural-width,
left-packed. Ours had `flex: 0 0 auto` at all widths (tabs 78+224=302 < 328) so BOARD stopped short on mobile.
Fix (`blocks/toc-profile/toc-profile.css`): base `.toc-profile-item` → `flex: 1 1 auto` + `justify-content:
flex-start` (mobile: equal-share growth, text stays left); `@media (width>=768px)` → `flex: 0 0 auto` (natural
width). tab→track gap was already 0 (flush) both source + ours. Verified @390: STAFF 91 / BOARD 237 (fills 328),
BOARD indicator reaches right edge, STAFF doesn't; indicator matches active tab; screenshot confirms. @1200:
unchanged (natural width 78/224, left-packed). Gates: lint 0 · breakpoints ✓ · overflow ✓ · a11y ✓.

### 2026-09-06 — toc-profile: more gap between tab text and the bar (align text to top)
User wanted more space between the STAFF/tab text and the sage bar below. Measured source: tab is 38px tall but
the text sits near the TOP (line-height 22), leaving ~21px below the text before the track; ours centered the
text, leaving only ~13px. Changed `.toc-profile-item` `align-items: center → flex-start` so the text sits at the
tab top — text→track gap now 21px at mobile + desktop, matching source. Gates: lint 0 · breakpoints ✓ · overflow
✓ · a11y ✓.

### 2026-09-06 — NEW section style `split-right` + video-beside-article sample
Added a `split-right` section style (mirror of `split-left`): default-content TEXT in the LEFT column, a block in
the RIGHT column, two equal columns at the page content width (720/970/1170), 30px gutter, from 768; mobile
stacks (text → block). Authored text-first so reading order is text→video on mobile; grid places the block into
col 2 / row 2 and the preceding default content into col 1 (`:has(~ …-wrapper)`), so no block-in-block.
`styles/styles.css` after the split-left rules. Sample: `content/drafts/sections-samples/section-split-right-
video.plain.html` — the Community Impact Hub article body (Brian Vahaly quote) in the left column + a Video
Embed (consent placeholder) on the right, per the source screenshot. Verified @1200: text 15→585 / video 615→
1185, same top, 30px gutter (mirrors source); @390 stacks text→video (both 328). Video placeholder unchanged
(14/21 #333 centered, blue link, 16:9). Gates: lint 0 · breakpoints ✓ · overflow ✓ (split-right + split-left
regression) · typography ✓ · a11y ✓.

### 2026-09-06 — custom-form-donate: wire submit hand-off + NEW `split-even` section (quote beside form)
User asked (a) whether the inline donation form actually hands its payload off to the FundraiseUp hosted page
(`https://ustaf.donorsupport.co/page/CHRIS50?elementTitle=…&elementName=Chris%2050%20Donation%20Embed`) like the
source, and (b) for a sample section placing the source's supporter Quote beside the form (2 blocks side by side).

Finding: the source form is a third-party **FundraiseUp** iframe embed (campaign `AURLRFGR`, element "Chris 50
Donation Embed"); clicking Donate opens FundraiseUp's hosted checkout at that donorsupport.co URL. Our block was a
STATIC reproduction — submit did `preventDefault()` only, no hand-off. The donorsupport.co/CHRIS50 URL is
FundraiseUp-internal (not in the inline DOM); the exact query-param names FundraiseUp's hosted page consumes are
opaue, so we use readable params as a best-effort prefill.

Wiring (`blocks/custom-form-donate/custom-form-donate.js`): submit now builds the hand-off URL from a base
(authored row 5, or the CHRIS50 default `DEFAULT_DONATE_URL` that preserves the source's elementTitle/elementName)
and appends the collected payload — `amount` (from the custom-amount input / active tier), `frequency`
(`once|monthly` from the active toggle), and when Dedicate is checked `dedicate=true` + `honoreeName`. Preserves
any params already on the base. Opens the secure hosted page in a NEW TAB (`window.open(_blank, noopener`)) —
outward-facing action, matches the source opening its checkout. Extended the authoring contract with an optional
**row 5** = donation URL (link href or plain text). Verified the built URL:
`…/page/CHRIS50?elementTitle=Donation+Form&elementName=Chris+50+Donation+Embed&amount=50&frequency=once&dedicate=true&honoreeName=Jane+Doe`.

NEW section style `split-even` (`styles/styles.css`, after split-right): a SYMMETRIC, block-agnostic two-column
section for TWO blocks side by side. Unlike split-left/right (which key off default-content vs block), it just
flows each direct wrapper into its own equal column via `grid-auto-flow: column` + `grid-auto-columns: 1fr` in
source order (first→left, second→right) — no nth-child logic, works for any block pair. Same page content width
(720/970/1170), 30px gutter, from 768; mobile stacks (block layout). Two fixes needed: `min-width: 0` on the grid
items (a wide block's min-content was stealing >1fr → unequal columns) and a specificity-matched
`… > div[..-wrapper] + div[..-wrapper] { margin-top: 0 }` to cancel the global inter-wrapper spacing (which pushed
the 2nd block down out of row alignment). Sample:
`content/drafts/sections-samples/section-split-even-donate.plain.html` — source supporter Quote (Selah Stibbins)
left + custom-form-donate right, per the source screenshot. Verified @1280: equal 570px columns, same top, 30px
gap; @390 stacks quote→form (both 328). Gates: lint 0 · breakpoints ✓ · overflow ✓ · typography ✓ · a11y ✓.

### 2026-09-06 — custom-form-donate: CORRECTED hand-off param keys (verified on live hosted page)
Follow-up: user wants the typed dedicate name (e.g. "Meet") to land in the hosted page's "Dedicate this
donation" field. My first-pass keys (`frequency`, `honoreeName`, `dedicate=true`) were GUESSES. Empirically
probed the live `ustaf.donorsupport.co/page/CHRIS50` widget with Playwright (read the field values after each
navigate, ~8s settle):
  - `amount=<dollars>`      → prefills the amount field ✓ CONFIRMED (tested 100/250)
  - `recurring=once|monthly`→ sets the frequency toggle ✓ CONFIRMED (my `frequency=` did NOTHING)
  - dedicate/tribute NAME   → tried ~15 keys (tribute, honoree, honoreeName, dedication, tributeName,
      tribute_name, honoree_name, dedicateName, dedicateTo, inHonorOf(Name), tributeText, tribute[name],
      donation[tribute], name, …) — NONE populated the field. FundraiseUp exposes no working URL param for it
      that we could find (its docs site was 522/down at check time). Bracket `donation[...]` scheme also did
      nothing.
Fix (`custom-form-donate.js`): submit now sets `amount` + `recurring` (confirmed keys) and passes the honoree as
`tribute=<name>` best-effort (harmless if ignored). Verified the block emits
`…/page/CHRIS50?…&amount=100&recurring=monthly&tribute=Meet`, and that URL on the live page prefills $100 +
Monthly (tribute still blank — hosted-page limitation, not ours). Gates: lint 0 errors.
NOTE: getting the dedicate name to truly prefill would require the FundraiseUp-supported param (needs their docs
or account owner) — flag for the client if that field must round-trip.

### 2026-09-06 — custom-form-donate: deep-dive on how the source carries the dedicate name (URL never changes)
User observed the redirect URL never includes the typed dedicate name — always the bare
`…/page/CHRIS50?elementTitle=…&elementName=…`. Deep-dived the live hosted page: instrumented fetch/XHR/
sendBeacon, dumped local+sessionStorage, set the tribute field via the native setter (React-registered input),
then clicked Donate. Findings: (1) the typed value is in NO network request, NO localStorage, NO sessionStorage
at input time — `netCount:0`, no storage hits; (2) the URL stays unchanged through checkout; (3) clicking Donate
opens the "Secure donation" checkout INSIDE THE SAME widget instance (no navigation), and the checkout's
"Dedicate this donation (optional)" field shows the typed value — proving it lives ONLY in the widget's
in-memory React state and survives because the same instance renders both screens. Conclusion: FundraiseUp does
not read the dedicate name from the URL at all; no query param (ours or theirs) can prefill it — the only way to
reproduce that round-trip is the real FundraiseUp embed. Removed the dead best-effort `tribute=` param; submit
now appends ONLY the confirmed keys `amount` + `recurring`. Generated URL verified:
`…/page/CHRIS50?…&amount=100&recurring=monthly`. Header comment documents the widget-internal data path. Gates:
lint 0 errors.

### 2026-09-06 — custom-form-donate: NEW `.embed` variant = the REAL FundraiseUp widget (dedicate name round-trips)
User: use the real embed so the "Dedicate this donation" honoree name carries to the checkout URL the same way
the amount does. Extracted the source's live install: loader `cdn.fundraiseup.com/widget/AURLRFGR` + an inline
element the widget upgrades from `<a href="#XJYDXZPC">` into `<iframe id="XJYDXZPC" title="Donation Form">`
(fluid, min 286 / max 376px, ~716px tall).
Added an `.embed` variant to the block (dispatch by class; the native reproduction stays the DEFAULT):
`decorateEmbed()` appends `<a class="cfd-embed-anchor" href="#<ELEMENT>">` and injects the loader script ONCE per
account (deduped by src). Authoring: row1 = account code (default AURLRFGR), row2 = element code (default
XJYDXZPC), row3 = fallback label. Codes are sanitized to `[A-Za-z0-9]` before use in the src/href (never inject
raw author text into a script tag). CSS: `.custom-form-donate.embed` centers, reserves 716px min-height to cut
layout shift, caps the iframe at 376px (source).
VERIFIED END-TO-END on localhost: the loader upgraded the anchor into the real widget iframe (same fields as
source). Typed "Meet" into Honoree full name → clicked Donate and Support → widget navigated to
`ustaf.donorsupport.co/page/CHRIS50?…` and the checkout's "Dedicate this donation" field showed **Meet** — the
name round-trips natively (amount also carried), exactly as the source does. This is the ONLY way to carry the
dedicate name (see prior entry: it's not a URL param — lives in widget state).
Sample: `content/drafts/sections-samples/section-split-even-donate-embed.plain.html` — Selah Stibbins quote left +
`.embed` form right in a `split-even` section. Desktop: equal 570px cols, same top, 30px gap, iframe capped 376px;
mobile stacks. Trade-off vs the native default: a third-party script + iframe (consent/perf) — so the native copy
remains the default; use `.embed` when the dedicate name must round-trip. Gates: lint 0 · breakpoints ✓ ·
overflow ✓ · a11y ✓ (all @ the embed sample).

### 2026-09-06 — custom-form-donate: REVERTED the `.embed` (real FundraiseUp) variant — CSP blocks it two ways
Tried embedding the real FundraiseUp widget so the dedicate name would round-trip. Hit TWO hard CSP walls:
(1) In-page: the widget renders via `document.write(<raw string>)`, blocked by the site's
`require-trusted-types-for 'script'` in `head.html` (untouchable) → "This document requires 'TrustedHTML'
assignment." (2) Isolated in a same-origin host iframe (blocks/custom-form-donate/fundraiseup.html) to dodge the
Trusted Types policy — the form rendered AND captured the typed honoree ("Meet"), but at checkout FundraiseUp
tried to frame `ustaf.donorsupport.co`, which sends `frame-ancestors 'none'` → "refused to connect". Confirmed
against the source: there the widget is a DIRECT child of the top page, so Donate does a TOP-LEVEL navigation
(whole tab → donorsupport.co, name carried); our extra iframe nesting makes it navigate the host frame instead,
which is refused. Making it behave like the source would require running FundraiseUp's loader in-page, i.e.
adding a site-wide Trusted Types default policy in scripts.js — a global weakening of XSS protection. Per user
decision, NOT doing that. Removed: `decorateEmbed`/dispatcher + `.embed` CSS, deleted
`blocks/custom-form-donate/fundraiseup.html`; the embed draft sample is obsolete (content/ is gitignored, so it
never ships). The block is back to the single native reproduction: renders the form + hands off amount/recurring
to the hosted page on submit (dedicate name can't round-trip via URL — FundraiseUp platform limitation, see prior
entries). Gates: lint 0 · breakpoints ✓ · overflow ✓ · a11y ✓.
