# USTA Foundation — Source CSS System (pixel-perfect reference)

> **Purpose (read before styling ANY block).** This records the layout system, grid, and units the
> **source site** `https://www.ustafoundation.com/en/home.html` actually uses, measured from its
> live clientlib CSS. Reproduce THESE on the EDS site so every block is pixel-perfect at every
> viewport — exactly the approach that made the petrobras migration pixel-perfect: **adopt the
> source's grid + units, then build block CSS on top of them.** Values here are the source truth;
> when in doubt, re-measure the live DOM (see "How to use", below). Cross-links:
> `skills/grid-system`, `skills/responsive-breakpoints`, `skills/typography-system`,
> `tools/quality/breakpoints.json`.

---

## 1. What the source is built on

**Bootstrap 3**, served via AEM clientlibs (`/etc.clientlibs/…`). The framework CSS is
`clientlib-usta-proxy` (~2.5 MB). Layout is **container → row → 12 float/flex columns**, everything
**pixel-based**. No CSS-grid page layout (a few components use `display:grid`; the page skeleton does
not).

| Signal | Finding |
|---|---|
| Layout engine | Bootstrap 3 float grid (`float` ×1000) + flexbox (`display:flex` ×469); `display:grid` only ×19 (component-local) |
| Grid classes | `.container`, `.row`, `.col-{sm,md,lg}-N` (12-col) |
| box-sizing | `border-box` (global) |
| Root font-size | `html { font-size: 10px }` → **1rem = 10px** (but the site rarely uses rem — see §4) |

---

## 2. Breakpoints (Bootstrap 3 tiers)

Recorded in [`tools/quality/breakpoints.json`](../tools/quality/breakpoints.json): **`768 / 992 / 1200`**
(mobile-first `min-width`). Base (<768) is the phone layout. These are the BS3 `sm / md / lg` tiers.

---

## 3. The grid — reproduce this exactly

A **12-column grid**, **30px gutter**, centered container with a per-tier max-width:

| Tier (min-width) | `.container` max-width | Notes |
|---|---|---|
| base (<768) | 100% (fluid, 15px side padding) | phone |
| ≥ 768 | **720px** | BS3 `sm` |
| ≥ 992 | **970px** | BS3 `md` |
| ≥ 1200 | **1170px** | BS3 `lg` (a few areas cap at **1200px**) |

- **Gutter = 30px:** `.row { margin: 0 -15px }`, each column `padding: 0 15px`. Net inter-column gap
  30px; content aligns to the 15px inner edge.
- **Column widths (12-col, %):** `8.333% · 16.667% · 25% · 33.333% · 41.667% · 50% · 58.333% ·
  66.667% · 75% · 83.333% · 91.667% · 100%`. Common spans on the homepage: `col-md-4 / col-md-8`
  (1/3 · 2/3) and `col-lg-3 / col-lg-9` (1/4 · 3/4).
- **Side gutter (page edge → content):** 15px container padding on phone; on ≥768 the fixed container
  width creates the outer margin.

### EDS mapping (do this once, in `styles.css`)
Set the shared grid to these numbers so blocks inherit them (see `skills/grid-system`):
```css
:root { --grid-gap: 30px; }
/* centered container max-widths per tier */
.container-max { width: 100%; padding-inline: 15px; margin-inline: auto; box-sizing: border-box; }
@media (min-width: 768px)  { .container-max { max-width: 720px;  padding-inline: 0; } }
@media (min-width: 992px)  { .container-max { max-width: 970px;  } }
@media (min-width: 1200px) { .container-max { max-width: 1170px; } }   /* 1200 where the source does */

.grid-12 { display: grid; grid-template-columns: repeat(12, 1fr); column-gap: var(--grid-gap); }
.grid-col-4  { grid-column: span 4;  }   /* = col-md-4  (1/3) */
.grid-col-8  { grid-column: span 8;  }   /* = col-md-8  (2/3) */
.grid-col-3  { grid-column: span 3;  }   /* = col-lg-3  (1/4) */
.grid-col-9  { grid-column: span 9;  }   /* = col-lg-9  (3/4) */
```
> A `grid` `column-gap:30px` reproduces the BS3 30px gutter without the `-15px` row-margin hack.
> Match the source's **span** (e.g. a 1/3 sidebar = `span 4`), not a bespoke `width: 33%`.

---

## 4. Units — the rule for pixel parity

The source is **overwhelmingly pixel-based**: ~**13,400 `px`** values vs ~**73 `rem`**, 92 `em`,
54 `vw`, negligible `%` outside grid widths. Root is `10px`, so any `rem` = value × 10px.

**Therefore, for parity, author block CSS in `px`** to match the source's fixed sizing — do **not**
"modernise" the source's fixed pixel values into rem/em/clamp (that changes the rendered size and
breaks parity). The exceptions the site itself uses: `%` for grid column widths, occasional `vw`
for full-bleed media. Keep `box-sizing: border-box` (global, already in the boilerplate).

### Spacing scale (most-used px increments — snap to these, don't invent)
`4 · 6 · 8 · 10 · 12 · 15 · 16 · 20 · 24 · 30 · 40 px` (15/30 are the grid gutters; 4/8 is the
fine-grain step). When a source box measures e.g. 22px padding, round to the nearest scale step only
if the measurement is clearly one of these; otherwise keep the exact measured px.

---

## 5. How to use this to make a block pixel-perfect (per block)

1. **Measure the SOURCE box live** (headless browser, at each breakpoint 390/768/992/1200): climb to
   the real element and read `getBoundingClientRect()` + `getComputedStyle()` — width, the column
   span it sits on, padding/margin (px), font-size/line-height/weight/family, gap.
2. **Place the block on the shared grid** by the SAME span the source uses (§3) — never a bespoke
   `width %`/`margin`. Set the container tier width from §3.
3. **Author sizes in px** to the measured values (§4); use the spacing scale increments.
4. **Type** comes from the global scale (`typography-system` / `tools/quality/typography.json`) — do
   not set font-size per block unless the source genuinely differs there.
5. **Verify:** `npm run check:overflow <url>` (no horizontal overflow at any tier) +
   `npm run check:typography <url>`, then re-measure OURS the same way and diff every value (aim ≤5px).
   Loop until the numbers match. Log the block in `MIGRATION.md`.

---

## 6. Quick-reference (paste into block work)

- Grid: **12-col, 30px gutter**, container **720 / 970 / 1170 (–1200) px** at **768 / 992 / 1200**.
- Units: **px-first** (root 10px; 1rem=10px). Grid widths `%`, full-bleed `vw`. `border-box`.
- Spacing steps: **4 6 8 10 12 15 16 20 24 30 40**.
- Match by **column span**, size by **measured px**, type from **global tokens**. Verify with
  `check:overflow` + `check:typography` + a re-measured diff.
