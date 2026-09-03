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
