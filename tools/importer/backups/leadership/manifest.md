# Known-good backup — Leadership & Staff importer

Frozen, verified copy of the leadership-template importer.

- **Script:** `import-leadership-v1.js` (+ `.bundle.js`)
- **URL:** who-we-are/leadership-and-staff (single page; `Theme = leadership`)
- **Source SHA1:** `c2148877cb6872f0821fbbafdaf6f443d308a633`
- **Backed up:** 2026-09-08 (updated: Template→Theme, see note below)
- **Completeness:** 84.9% (source has heavy teaser/responsive-duplicate markup that
  is intentionally stripped; all meaningful content captured — verify by eye).

**Post-import finalize (must re-run after any re-import):**
1. `node tools/assets/localize-assets.mjs en/home/who-we-are/leadership-and-staff.plain.html`
2. Kim Borza Donaldson (`media-d7383db6…`) and Kasey O'Connor (`media-6b6eec9c…`) are
   Inkscape SVGs wrapping a portrait raster — DA rejects SVG content images (409).
   Extract the embedded base64 JPEG, downscale to ≤750px, and rewrite the two
   `.svg` refs → `.jpeg` in the plain.html (see MIGRATION.md "leadership SVG").

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
| `<title>` + first intro `<p>` | **metadata** (Title, Theme=leadership, Description) | |

Target shape matches `content/drafts/block-samples/toc-profile.plain.html`.
Full history: `MIGRATION.md`.
