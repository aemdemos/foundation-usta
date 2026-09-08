# Known-good backup — chris-evert-50th-anniversary importer

Dedicated per-page importer for `get-involved/special-funds/chris-evert-50th-anniversary.html`.

- **Script:** `import-chris-evert-v1.js` (+ `.bundle.js`)
- **URL:** `https://www.ustafoundation.com/en/home/get-involved/special-funds/chris-evert-50th-anniversary.html`
- **Source SHA1:** `4a733f42561c7b63d2e4270433298b38812e57bf`
- **Backed up:** 2026-09-08

## Post-import finalize (re-run after any re-import)
1. `node tools/assets/localize-assets.mjs en/home/get-involved/special-funds/chris-evert-50th-anniversary.plain.html` (1 image, 0 hotlinks)

## Section sequence (source → target)
| # | Source | Target |
|---|---|---|
| 1 | Centered heading "Celebrating a champion, on and off the court." | `<h1>` + `center` |
| 2 | Campaign copy (3 paras) + Chris Evert photo | **Columns** image-RIGHT (20250820-chrissie50.jpg) |
| 3 | Selah Stibbins quote + CHRIS50 donation form | **Quote** + **Custom Form Donate** in `split-even` |
| 4 | trailing black strip | **Spacer** (`stats-band-bg`, 17px) |

`Theme = general`.

## Key implementation notes
- Content is FIXED (hard-wired) — the donation embed is a cross-origin FundraiseUp iframe, so the split-even quote +
  custom-form-donate content comes from the approved `sections-samples/section-split-even-donate` sample.
- The donate form CTA opens the site donate widget (FundraiseUp CHRIS50 page) via scripts/donate.js.

## Restore
```
cp tools/importer/backups/chris-evert/import-chris-evert-v1.js        tools/importer/import-chris-evert-v1.js
cp tools/importer/backups/chris-evert/import-chris-evert-v1.bundle.js tools/importer/import-chris-evert-v1.bundle.js
```
