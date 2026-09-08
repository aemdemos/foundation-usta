# Known-good backup — financials importer

Dedicated per-page importer for `who-we-are/financials.html` — the simplest page
(ALL default content, no hero, no blocks).

- **Script:** `import-financials-v1.js` (+ `.bundle.js`)
- **URL:** `https://www.ustafoundation.com/en/home/who-we-are/financials.html`
- **Source SHA1:** `08bc66ed7bfea6c3f658152eecdb911fba6dbc81`
- **Backed up:** 2026-09-08
- **Completeness:** 73.1% (the source footer social/copyright/donor-privacy chrome is intentionally excluded)

## Post-import finalize (re-run after any re-import)
1. `node tools/assets/localize-assets.mjs en/home/who-we-are/financials.plain.html` (0 images — no-op; 0 hotlinks)

## Content (source → target) — all DEFAULT CONTENT
| Source | Target |
|---|---|
| H1 "Annual Reports and Financial Information" | `<h1>` |
| H2 "Annual Reports" + 13 PDF links (2024…2010) | `<h2>` + `<ul><li><a>` |
| H2 "Audited Financial Statements" + intro + 4 PDFs (2025…2022) | `<h2>` + `<p>` + `<ul>` |
| H2 "IRS Form 990" + intro + 3 PDFs (2024…2022) | `<h2>` + `<p>` + `<ul>` |

`Theme = general`.

## Key implementation notes
- The content is a FIXED list, hard-wired in the script (deterministic — no DOM scraping of the messy source).
- PDF links authored as `<ul><li><a>` so EDS `decorateButtons()` leaves them as plain underlined text links
  (a standalone `<p><a>` would become a button).
- Doc hrefs point at the SOURCE `/content/dam/…` paths (absolutized) — no doc-localizer exists yet (images only).
  Localize to `content/assets/docs/…` when a doc-finalize step is added.
- Source footer chrome (social/copyright/donor-privacy) excluded — page chrome, not content.

## Restore
```
cp tools/importer/backups/financials/import-financials-v1.js        tools/importer/import-financials-v1.js
cp tools/importer/backups/financials/import-financials-v1.bundle.js tools/importer/import-financials-v1.bundle.js
```
