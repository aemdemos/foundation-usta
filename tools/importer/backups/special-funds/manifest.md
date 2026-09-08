# Known-good backup — special-funds importer

Dedicated per-page importer for `get-involved/special-funds.html`.

- **Script:** `import-special-funds-v1.js` (+ `.bundle.js`)
- **URL:** `https://www.ustafoundation.com/en/home/get-involved/special-funds.html`
- **Source SHA1:** `e6958464586c5e7cc6a348ea69c5d0f6e8897adb`
- **Backed up:** 2026-09-08
- **Completeness:** 83.7% (dedupe of desktop/mobile copies — expected)

## Post-import finalize (re-run after any re-import)
1. `node tools/assets/localize-assets.mjs en/home/get-involved/special-funds.plain.html` (4 fund images, 0 hotlinks)

## Section sequence (source → target)
| # | Source section | Target |
|---|---|---|
| 1 | Hero photo + H1 "Give to what matters most to you." + subhead | **Hero (text-up)** (bg special-funds.jpg, no CTA) |
| 2 | "Frances Tiafoe Fund" + GIVE A GIFT (?form=TIAFOE) | **Columns** image-RIGHT |
| 3 | YELLOW "Mackie McDonald College Fund" + GIVE A GIFT (?form=MACKIE) | strip + **Columns** image-LEFT + `section-yellow` |
| 4 | "Jimmy Evert Merit Scholarship Fund" + GIVE A GIFT (?form=EVERT) | **Columns** image-RIGHT |
| 5 | 5 FundraiseUp fund widgets | **Cards (expand)** ×5 (JLLI/Dinkins/Tisdel/RSPA/Middle States) |
| 6 | trailing black strip | **Spacer** (`stats-band-bg`, 17px) |

`Theme = general`.

## Key implementation notes
- **Cards-expand content + images reused from the block sample** (`drafts/block-samples/cards-expand`): the source
  cards are cross-origin FundraiseUp iframes with no readable content/imagery, so the 5 cards (title + desc + Donate
  ?form=…) come from the approved sample. Their images reference the ALREADY-LOCALIZED
  `/media-da/drafts/block-samples/cards-expand/…` assets committed with the sample.
- **adjustImageUrls post-fix:** that rule absolutizes ALL img srcs against the source origin, which broke the
  media-da card paths (→ 404). A post-pass restores any `/media-da/` src to its relative path so localize-assets
  leaves them alone. 4 fund photos download normally; 5 card images stay relative → **0 hotlinks**.
- Fund CTAs (GIVE A GIFT) + card Donate links are `?form=…` FundraiseUp deep-links, kept on-origin by scripts/donate.js.

## Restore
```
cp tools/importer/backups/special-funds/import-special-funds-v1.js        tools/importer/import-special-funds-v1.js
cp tools/importer/backups/special-funds/import-special-funds-v1.bundle.js tools/importer/import-special-funds-v1.bundle.js
```
