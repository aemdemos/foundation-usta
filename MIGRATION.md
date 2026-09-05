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

## 3. Templates / 4. Sections / 5. Blocks
_TODO — fill per template/section/block as they land (see IMPORTING-GUIDE if importing)._

## 6. Open items / TODO
- [ ] Capture + enforce the type scale (see ▶ steps below).
- [ ] Wire the shared grid (`--grid-gap:30px`, `.container-max`, `.grid-*`) into `styles.css` per `docs/source-css-system.md`.
- [ ] Confirm Graphik licensing before publishing.
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
