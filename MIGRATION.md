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
