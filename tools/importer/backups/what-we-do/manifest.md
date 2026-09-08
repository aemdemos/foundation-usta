# Known-good backup — what-we-do importer

Dedicated per-page importer for `what-we-do.html` (unique general-template landing page).

- **Script:** `import-what-we-do-v1.js` (+ `.bundle.js`)
- **URL:** `https://www.ustafoundation.com/en/home/what-we-do.html`
- **Source SHA1:** `3681e914902ded06a2d94dbcdf1ffe2bf9c03e5a`
- **Backed up:** 2026-09-08
- **Completeness:** 82.4% (source ships desktop/mobile duplicate text — deduped — expected)

## Post-import finalize (re-run after any re-import)
1. `node tools/assets/localize-assets.mjs en/home/what-we-do.plain.html` (11 images, 0 hotlinks)

## Section sequence (source → target)
| # | Source section | Target | Notes |
|---|---|---|---|
| 1 | Hero photo + H1 "We get young people ready to succeed in life." + JOIN US | **Hero (text-up)** | bg what-we-do.jpg; CTA → get-involved |
| 2 | "Our Strategic Priorities" intro + 4 cards | intro (`center, medium`) + **Cards (content)** ×4 | |
| 3 | YELLOW BAND "Transforming lives since 1969." | Spacer(yellow strip) + centered intro + **Columns** image-LEFT (H3 + paras + LEARN MORE→our-impact) + `section-yellow, yellow-center-intro` | |
| 4 | "The NJTL network serves…" + wide map | heading + wide map image (`center, map-wide`) | map ≈100vw−gutter |
| 5 | "Sustained support…" intro + 4 cards | intro (`center, medium`) + **Cards (content)** ×4 | |
| 6 | trailing black strip | **Spacer** (`stats-band-bg`, 17px) | |

`Theme = general`.

## Key implementation notes
- **Card images come from DAM `data-asset` paths, hard-wired into the card defs**
  (verified 200 on source). The source card `<img>` lives inside a `<noscript>`
  lazy-load wrapper the cleanup step strips, and the parser doesn't reliably expose
  it via h4→walk-up — so each card def carries its real `/content/dam/…` path and
  localize-assets downloads it. (Large eager images — transform photo, map — are
  found normally via `container.querySelector('img')`.)
- **map-wide** section style (styles.css): near-full-viewport width (100vw − 16/24/60px
  gutter across mobile/768/992+) for the NJTL map, wider than the 1170 content grid.
- Two CTAs: JOIN US (hero) + LEARN MORE (yellow band → our-impact), both `<strong>`-wrapped → blue.

## Restore
```
cp tools/importer/backups/what-we-do/import-what-we-do-v1.js        tools/importer/import-what-we-do-v1.js
cp tools/importer/backups/what-we-do/import-what-we-do-v1.bundle.js tools/importer/import-what-we-do-v1.bundle.js
```
