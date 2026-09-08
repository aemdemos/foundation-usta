# Known-good backup — Leadership & Staff importer

Frozen, verified copy of the leadership-template importer.

- **Script:** `import-leadership-v1.js` (+ `.bundle.js`)
- **URL:** who-we-are/leadership-and-staff (single page; template = `leadership`)
- **Source SHA1:** `8efc897cd422ac326ec97fd35dcc0c676ed00d13`
- **Backed up:** 2026-09-08
- **Completeness:** 84.9% (source has heavy teaser/responsive-duplicate markup that
  is intentionally stripped; all meaningful content captured — verify by eye).

## Restore
```
cp tools/importer/backups/leadership/import-leadership-v1.js        tools/importer/import-leadership-v1.js
cp tools/importer/backups/leadership/import-leadership-v1.bundle.js tools/importer/import-leadership-v1.bundle.js
```

## Blocks / components covered (source → target)
| Source | Target | Detection |
|---|---|---|
| core-tabs (Staff / Board of Directors) | **toc-profile** | tab labels → section anchors (staff / board-of-directors) |
| `.cmp-teaser` cards in the Staff tab-panel | **cards (profile)** ×8 | `role=tabpanel[data-title=Staff]`; name = `.cmp-teaser__title_scalable` (visible, not the hidden link copy); role = `.cmp-teaser__description p`; img = `.cmp-teaser__image img` |
| plain "Name, Role" `<p>` list after staff cards | default-content `<p>` list ×18 | the `.cmp-text` with ≥3 bold-name paragraphs; `<br>`-split, flattened |
| `.cmp-teaser` cards in the Board tab-panel | **cards (profile)** ×2 | Chris Evert, Kathleen Wu |
| 3 board columns (Officers and Directors / Advisory Board / Honorary Board) | **table (directory)** | `<h4>` heads; `--default--hide` responsive twin column skipped; each cell = head + `<br>` name list (`<b>`Name`</b>, `<i>`Role`</i>`) |
| — | **Section Metadata** `profile-anchor: staff` / `board-of-directors` | binds each section to its tab |
| `<title>` + first intro `<p>` | **metadata** (Title, Template=leadership, Description) | |

Target shape matches `content/drafts/block-samples/toc-profile.plain.html`.
Full history: `MIGRATION.md`.
