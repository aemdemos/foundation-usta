# Known-good backup — our-impact importer

Dedicated per-page importer for `our-impact.html` (unique general-template landing page).

- **Script:** `import-our-impact-v1.js` (+ `.bundle.js`)
- **URL:** `https://www.ustafoundation.com/en/home/our-impact.html`
- **Source SHA1:** `d5a7c7eeefb85676626561d57ae6a370dbe43d2d`
- **Backed up:** 2026-09-08 (round-3: hero → text-up variant per direction; reach items bold-label)
- **Completeness:** 84.4% (dedupe of desktop/mobile copies — expected)

## Post-import finalize (re-run after any re-import)
1. `node tools/assets/localize-assets.mjs en/home/our-impact.plain.html` (7 images, 0 hotlinks)

## Section sequence (source → target)
| # | Source section | Target |
|---|---|---|
| 1 | Hero photo + centered white H1 "We make a transformative, nationwide impact." + subhead | **Hero (banner)** — authored bg image (our-impact-header.jpg) |
| 2 | "Young people aren't ready." intro + 4 stat blocks + photo | intro (`center, wide`) + **Columns** (stat list LEFT, image RIGHT) |
| 3 | YELLOW "We reach communities…" intro + photo + 3 items | strip + intro + **Columns** image-LEFT + 3-item list, `section-yellow, yellow-center-intro` |
| 4 | "Our impact is felt…" + featured stat + 4 pairs | **Banner Stats Grid** |
| 5 | YELLOW "We make a difference…" intro + "The numbers speak to it." + 4 stat cards | strip + intro + **Cards (stats)** ×4 (97/98/85/95), `section-yellow` |
| 6 | trailing black strip | **Spacer** (`stats-band-bg`, 17px) |

`Theme = general`.

## Key implementation notes
- **Hero banner now accepts an AUTHORED bg image** (hero.js `decorateBanner`): pulls a
  lone row-1 img, sets it as the block's inline background + 40% overlay gradient at
  width=2000 (the homepage banner still uses its fixed CSS asset when no img is authored).
- **Stat content + all card/stat images are hard-wired** (verified DAM paths): the source
  packs the stat H3+captions into single cmp-text blocks and the card images sit in
  `<noscript>` lazy wrappers the cleanup strips — so the stat lists (NOT_READY_STATS,
  REACH_ITEMS), banner-stats-grid pairs, and STAT_CARDS are authored explicitly; only the
  section headings/intros are pulled dynamically.
- Reused get-involved helpers + `statList()`, `imgFromUrl()`. banner-stats-grid + cards-stats
  match the existing block samples (drafts/block-samples).

## Restore
```
cp tools/importer/backups/our-impact/import-our-impact-v1.js        tools/importer/import-our-impact-v1.js
cp tools/importer/backups/our-impact/import-our-impact-v1.bundle.js tools/importer/import-our-impact-v1.bundle.js
```
