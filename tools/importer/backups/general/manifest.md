# Known-good backup — General interior-page importer

Frozen copy of the general-template importer (marketing/landing interior pages).

- **Script:** `import-general-v1.js` (+ `.bundle.js`)
- **First page:** who-we-are.html (`Theme = general`)
- **Source SHA1:** `81f042f7d4c9d9a6f5b49522364b04a506304614`
- **Backed up:** 2026-09-08 (round-5: leading yellow-strip spacer above the yellow band)
- **Completeness:** 85.8% (desktop/mobile duplicate text deduped — expected)

## Post-import finalize (re-run after any re-import)
1. `node tools/assets/localize-assets.mjs en/home/who-we-are.plain.html` (7 images, 0 hotlinks)

## Blocks / components (source → target) — CURRENT
| Source section | Target | Notes |
|---|---|---|
| Hero: bg photo + top-left H1 + subhead + 2 CTAs | **Hero (text-up)** | authored image as bg (hero.js pulls row-1 img → block bg), no overlay, text at TOP; mobile panel 56vw + padding 48/32/250 |
| "We transform lives" centered intro | default content | section `center, medium` (708/772/970) |
| "Our History" text + Judy Levering photo | **Columns** | text cell first = image-right |
| leading YELLOW STRIP above the yellow band | **Spacer** (`section-yellow-bg`, 17px) | own section; source stacks a ~17px yellow strip + ~17px white gap before the band (homepage colored-spacer pattern). styles.css `:has(.spacer[style*='section-yellow-bg'])` gives 56px float above + 17px white gap below, band `margin-top:0` |
| YELLOW BAND (ONE section) — "Our Leadership and Staff" intro + LEARN MORE, then Chris Evert photo-left + quote + BOLD-ITALIC attribution | default content + **Columns** | section `section-yellow, yellow-center-intro`; intro centered, columns full-width; CTAs wrapped in `<strong>` so decorateButtons fires; attribution `<strong><em>` (source is `<i>` fw700 italic) |
| "Our Supporters" intro + LEARN MORE | default content | section `center, wide` (708/902/1170) |
| 4 supporter tiles (image + h4 label) | **Cards (tiles)** | `align-self:start` so tiles don't stretch |
| trailing black strip above footer | **Spacer** (`stats-band-bg`, 17px) | own section; matches source/homepage |

## Restore
```
cp tools/importer/backups/general/import-general-v1.js        tools/importer/import-general-v1.js
cp tools/importer/backups/general/import-general-v1.bundle.js tools/importer/import-general-v1.bundle.js
```
Full history: `MIGRATION.md` (search "general importer" / "who-we-are").
