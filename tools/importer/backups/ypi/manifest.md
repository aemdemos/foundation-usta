# Known-good backup — young-professional-initiative importer

Dedicated per-page importer for `get-involved/young-professional-initiative.html`.

- **Script:** `import-ypi-v1.js` (+ `.bundle.js`)
- **URL:** `https://www.ustafoundation.com/en/home/get-involved/young-professional-initiative.html`
- **Source SHA1:** `fe63d13adde468235933c1cb664136ac20b722a6`
- **Backed up:** 2026-09-08

## Post-import finalize (re-run after any re-import)
1. `node tools/assets/localize-assets.mjs en/home/get-involved/young-professional-initiative.plain.html` (5 images, 0 hotlinks)

## Section sequence (source → target)
| # | Source | Target |
|---|---|---|
| 1 | Hero photo + H1 "Young Professional Initiative" + subhead + JOIN US | **Hero (text-up)** (bg ypi-header-eubanks.jpg; CTA → tfaforms/67) |
| 2a | "The future of giving starts here." + intro para + MAKE A GIFT (all centered) | centered default content + `center` section style; CTA → donorsupport YPI |
| 2b | "What is YPI?" copy + bullet list + photo | **Columns** image-RIGHT (ypi-alternate.jpg) |
| 3 | YELLOW "How YPI Makes an Impact" + bullet list | strip + **Columns** image-LEFT (ypi-insert.jpg) + `section-yellow` |
| 4 | Greg Labanowski pull-quote + portrait | **Quote (image)** (ypi-3.png, image right) |
| 5 | YELLOW "Ways to Get Involved" | strip + **Columns** image-LEFT (ypi-4.png) + `section-yellow` |
| 6 | trailing black strip | **Spacer** (`stats-band-bg`, 17px) |

`Theme = general`.

## Key implementation notes
- Content hard-wired (deterministic). All 5 images are verified DAM assets.
- Section 2 splits into TWO: (2a) a **centered intro** band ("The future of giving starts here." + one intro para +
  MAKE A GIFT, `center` section style) and (2b) a **Columns** block (image right) whose text cell holds "What is YPI?"
  (`<h2>`), body paras, a **bold** lead-in ("As a part of…" → `<p><strong>`), and a real `<ul>` bullet list (4 items).
- Section 3 "How YPI Makes an Impact" likewise uses a real `<ul>` bullet list (5 items) after its "focused on:" para.
- Column bodies use a small mini-format in the importer: `{p}` paragraph, `{b}` bold sub-heading, `{ul:[…]}` bullet list.
- Hero JOIN US → tfaforms/67; MAKE A GIFT → FundraiseUp YPI donate page (on-origin via scripts/donate.js).
- The quote-image block is authored per its contract: one row, two cells — [h2 quote + `<p>- <em>Name</em></p>` | img].

## Restore
```
cp tools/importer/backups/ypi/import-ypi-v1.js        tools/importer/import-ypi-v1.js
cp tools/importer/backups/ypi/import-ypi-v1.bundle.js tools/importer/import-ypi-v1.bundle.js
```
