# Known-good backup — General interior-page importer

Frozen copy of the general-template importer (marketing/landing interior pages).

- **Script:** `import-general-v1.js` (+ `.bundle.js`)
- **First page:** who-we-are.html (`Theme = general`)
- **Source SHA1:** `79abdbf9b36315841a1a2f9d3752fcfb4de74ad7`
- **Backed up:** 2026-09-08
- **Completeness:** 85.8% (desktop/mobile duplicate text deduped — expected)

## Post-import finalize (re-run after any re-import)
1. `node tools/assets/localize-assets.mjs en/home/who-we-are.plain.html` (7 images, 0 hotlinks)

## Blocks / components (source → target)
| Source section | Target | Notes |
|---|---|---|
| Hero: bg photo + top-left H1 + subhead + 2 CTAs | **Hero (text-up)** | authored image as bg, no overlay, text at TOP; NEW variant |
| "We transform lives" centered intro | default content | section `center, medium` (708/772/970) |
| "Our History" text + Judy Levering photo | **Columns** | text cell first = image-right |
| YELLOW BAND — "Our Leadership and Staff" intro + LEARN MORE | default content | section `section-yellow, center` |
| YELLOW BAND — Chris Evert photo + quote | **Columns** | image cell first = image-left; section `section-yellow` (adjacent → one band) |
| "Our Supporters" intro + LEARN MORE | default content | section `center, wide` (708/902/1170) |
| 4 supporter tiles (image + h4 label) | **Cards (tiles)** | |

## Restore
```
cp tools/importer/backups/general/import-general-v1.js        tools/importer/import-general-v1.js
cp tools/importer/backups/general/import-general-v1.bundle.js tools/importer/import-general-v1.bundle.js
```
Full history: `MIGRATION.md` (search "general importer" / "who-we-are").
