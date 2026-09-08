# Known-good backup — college-scholarships importer

Dedicated per-page importer for `what-we-do/college-scholarship-opportunities.html`.

- **Script:** `import-college-scholarships-v1.js` (+ `.bundle.js`)
- **URL:** `https://www.ustafoundation.com/en/home/what-we-do/college-scholarship-opportunities.html`
- **Source SHA1:** `603d3d910ed0e6742ef24d1a3cdc0831f7ea5c78`
- **Backed up:** 2026-09-08
- **Completeness:** 83.2% (dedupe of desktop/mobile copies — expected)

## Post-import finalize (re-run after any re-import)
1. `node tools/assets/localize-assets.mjs en/home/what-we-do/college-scholarship-opportunities.plain.html` (4 images, 0 hotlinks)

## Section sequence (source → target)
| # | Source | Target |
|---|---|---|
| 1 | Hero photo + H1 "We give young people the keys to their future." + subhead + LEARN MORE (pdf) | **Hero (text-up)** (bg scholarships-header.gif) |
| 2 | "Opening doors of opportunity." intro + 3 scholarship cards | intro (`center, medium`) + **Cards (content)** ×3 (with images) |
| 3 | YELLOW "College Launch Scholarship" + 4 Q&A | strip + heading + lead + **Cards (content)** ×4 image-less; `section-yellow, center-intro` |
| 4 | "College Success Scholarship" + 4 Q&A | heading + lead + **Cards (content)** ×4 image-less; `center-intro` |
| 5 | YELLOW "Novo Nordisk Donnelly Scholarship" + 4 Q&A | strip + heading + lead + **Cards (content)** ×4 image-less; `section-yellow, center-intro` |
| 6 | trailing black strip | **Spacer** (`stats-band-bg`, 17px) |

`Theme = general`.

## Key implementation notes
- **cardsContentBlock generalized:** a card with an image → [imageCell, bodyCell]; a card with NO image → body-only
  [bodyCell]. The scholarship DETAIL grids (sections 3–5) are image-less 4-up Q&A cards (h4 question + answer).
- All content hard-wired (deterministic) — the 3 scholarship cards' images are DAM assets (verified 200); the Q&A
  detail text is fixed.
- Hero LEARN MORE → the scholarship-program FAQ pdf (source `/content/dam/…`); no doc-localizer yet.

## Restore
```
cp tools/importer/backups/college-scholarships/import-college-scholarships-v1.js        tools/importer/import-college-scholarships-v1.js
cp tools/importer/backups/college-scholarships/import-college-scholarships-v1.bundle.js tools/importer/import-college-scholarships-v1.bundle.js
```
