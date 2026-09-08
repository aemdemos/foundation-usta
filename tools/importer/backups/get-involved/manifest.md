# Known-good backup — get-involved importer

Dedicated per-page importer for `get-involved.html` (a unique general-template
landing page — built block-by-block, NOT via the generic who-we-are importer).

- **Script:** `import-get-involved-v1.js` (+ `.bundle.js`)
- **URL:** `https://www.ustafoundation.com/en/home/get-involved.html`
- **Source SHA1:** `5b5f4d348b4a16ad874f9b7029bc0a1480b638ec`
- **Backed up:** 2026-09-08 (round-2: gift CTA, 30px yellow strips, corporate center-intro+columns, collectText reads ALL cmp-text)
- **Completeness:** 83.2% (source ships heavy desktop/mobile duplicate text — deduped — expected)

## Post-import finalize (re-run after any re-import)
1. `node tools/assets/localize-assets.mjs en/home/get-involved.plain.html` (9 images, 0 hotlinks)

## Section sequence (source → target)
| # | Source section | Target | Notes |
|---|---|---|---|
| 1 | Hero photo + H1 "Help us get young people ready for life." + subhead + WHAT WE DO | **Hero (text-up)** | bg get-involved-tiafoe.jpg; one CTA |
| 2 | "Your gift powers our mission." intro | default content | `center, medium` |
| 3 | "Individual Supporters" + 3 paras + photo | **Columns** image-RIGHT | text cell first |
| 4 | YELLOW BAND "Impact Societies" + LEARN MORE (pdf) | Spacer(yellow strip) + **Columns** image-LEFT + `section-yellow` | |
| 5 | "Young Professional Initiative" + LEARN MORE | **Columns** image-RIGHT | |
| 6 | YELLOW BAND "Planned Giving" + LEARN MORE (pdf) | Spacer(yellow strip) + **Columns** image-LEFT + `section-yellow` | |
| 7 | "Signature Events" intro + 3 cards (Gala/Pro-Am/Fantasy Camps) | intro + **Cards (content)** | card copy canonicalized (source ships mobile fragments) |
| 8 | YELLOW BAND "Corporate Partnership Opportunities" | Spacer(yellow strip) + **Columns** image-LEFT + `section-yellow` | no CTA |
| 9 | trailing black strip | **Spacer** (`stats-band-bg`, 17px) | |

`Theme = general`.

## Known follow-ups
- PDF LEARN MORE links (`/content/dam/.../impact-societies-one-pager.pdf`) still
  point at the SOURCE domain — no doc-localizer exists yet (images only). Localize
  to `content/assets/docs/…` when a doc-finalize step is added (also needed for
  financials).
- Media side (left/right) verified by rendered image centre-X vs viewport midline:
  Individual RIGHT, Impact LEFT, YPI RIGHT, Planned LEFT, Corporate LEFT.

## Restore
```
cp tools/importer/backups/get-involved/import-get-involved-v1.js        tools/importer/import-get-involved-v1.js
cp tools/importer/backups/get-involved/import-get-involved-v1.bundle.js tools/importer/import-get-involved-v1.bundle.js
```
