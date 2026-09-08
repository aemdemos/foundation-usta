# Known-good backup — General interior-page importer

Frozen copy of the general-template importer (marketing/landing interior pages).

- **Script:** `import-general-v1.js` (+ `.bundle.js`)
- **First page:** who-we-are.html (`Theme = general`)
- **Source SHA1:** `2d90c83d1e8bb9d498df086e7e2d483fa16ef263`
- **Backed up:** 2026-09-08 (round-3: single yellow band, <strong> CTAs, trailing black band)
- **Completeness:** 85.8% (desktop/mobile duplicate text deduped — expected)

## Post-import finalize (re-run after any re-import)
1. `node tools/assets/localize-assets.mjs en/home/who-we-are.plain.html` (7 images, 0 hotlinks)

## Blocks / components (source → target) — CURRENT
| Source section | Target | Notes |
|---|---|---|
| Hero: bg photo + top-left H1 + subhead + 2 CTAs | **Hero (text-up)** | authored image as bg (hero.js pulls row-1 img → block bg), no overlay, text at TOP; mobile panel 56vw + padding 48/32/250 |
| "We transform lives" centered intro | default content | section `center, medium` (708/772/970) |
| "Our History" text + Judy Levering photo | **Columns** | text cell first = image-right |
| YELLOW BAND (ONE section) — "Our Leadership and Staff" intro + LEARN MORE, then Chris Evert photo-left + quote + BOLD attribution | default content + **Columns** | section `section-yellow, yellow-center-intro`; intro centered, columns full-width; CTAs wrapped in `<strong>` so decorateButtons fires |
| "Our Supporters" intro + LEARN MORE | default content | section `center, wide` (708/902/1170) |
| 4 supporter tiles (image + h4 label) | **Cards (tiles)** | `align-self:start` so tiles don't stretch |
| trailing black strip above footer | **Spacer** (`stats-band-bg`, 17px) | own section; matches source/homepage |

## Restore
```
cp tools/importer/backups/general/import-general-v1.js        tools/importer/import-general-v1.js
cp tools/importer/backups/general/import-general-v1.bundle.js tools/importer/import-general-v1.bundle.js
```
Full history: `MIGRATION.md` (search "general importer" / "who-we-are").
