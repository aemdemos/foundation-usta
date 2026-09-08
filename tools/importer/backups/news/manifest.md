# Known-good backup — News article importer

Frozen, verified copy of the news-template importer. Restore from here if the
working `tools/importer/import-news-v1.js` is broken or needs to roll back to a
known-good state.

- **Script:** `import-news-v1.js` (+ `import-news-v1.bundle.js`)
- **URLs manifest:** `urls-news.txt`
- **Template:** `news` (drives `templates/news/news.{css,js}` via the `Template` metadata row)
- **Source SHA1 (import-news-v1.js):** `0190543f8da05b1ae2168a568d4cf8117511f772`
- **Backed up:** 2026-09-08
- **Fleet:** 72 news articles (all imported), completeness ≥85% every page
  (35 pages ≥95%, ~30 at 90–95%, 1 at 85–90%). Verify by eye; <~90% is expected.

## How to restore
```
cp tools/importer/backups/news/import-news-v1.js       tools/importer/import-news-v1.js
cp tools/importer/backups/news/import-news-v1.bundle.js tools/importer/import-news-v1.bundle.js
```
Or rebuild the bundle from the restored source:
```
npx esbuild tools/importer/import-news-v1.js --bundle --format=iife \
  --global-name=CustomImportScript --platform=browser \
  --outfile=tools/importer/import-news-v1.bundle.js
# esbuild strips the leading comment — re-prepend it:
printf '/* eslint-disable */\n%s' "$(cat tools/importer/import-news-v1.bundle.js)" \
  > tmp && mv tmp tools/importer/import-news-v1.bundle.js
```
Run: `node <run-bulk-import.js> --import-script tools/importer/import-news-v1.bundle.js --urls tools/importer/urls-news.txt --output-dir content --force`

## Blocks / components covered (source → target)

| Source component | Target block/section | Detection | Pages |
|---|---|---|---|
| `<title>` / article lede / hero img | **metadata** (Title, Description, Image, Template=news, Publication Date) | Description = first substantial `<p>`; Image = hero body img; Publication Date = sitemap `<lastmod>` (formatted "Month DD, YYYY") | 72 / 72 |
| Related Articles `<ul>` (dynamic Vue feed) | **cards (news)** | the `<ul>` whose `<li>` link to `/news/…`; title from `<h3>`/`<h2>`/`<h4>` OR `[role="heading"]` / `.list-core-component__title`; date/desc/read-more/img per card | 72 |
| body image(s) in col-6 beside text | **columns (media-left / media-right)** | each body `<img>` (excl. related/reactions/share icons); side from rendered position; text cell = beside blocks (`<p>` **and** `<ul>/<ol>`, in order); caption = `<em>` | 70 |
| `div.socialmediasharing` share bar | **social (left / right)** | alignment data-driven: `.socialmediasharing.position-right` → right (newer layout), plain → left (older) | 66 |
| `div.reactions` Vue widget | **custom-widget-reactions** | presence of `div.reactions` (older articles) | 62 |
| `blockquote.twitter-tweet` | **quote (tweet)** inline, OR **quote (tweet)** in a `split-left` section | split-left when in a partial-width col (5/6/7) beside a text col; inline when full-width (col-12); hidden zero-size duplicate dropped | 8 |
| `blockquote.instagram-media` / `iframe[src*=instagram.com/{p\|reel\|tv}]` | **embed-instagram** inline, OR in a `split-left` section | same split-left-vs-inline rule as tweets; `/p/`, `/reel/`, `/tv/` permalinks; hidden duplicate dropped; embed.js upgrades blockquote→iframe before import (both matched) | 4 |
| YouTube `iframe` (`data-src`) | **video-embed** full-width, OR **video-embed** in a `split-right` section | split-right when in a partial-width col beside text; plain full-width when col-12 | 3 |
| two adjacent col-6 `.text` columns, each a bold header ("Winners" / "NJTL Chapter") | **table** (2-col, column-major stack on mobile; one body row per sub-group) | header pair detected; sub-groups split on blank/bracket-label boundaries | 2 |
| single-col grade/category winners list ("…following categories:" + Freshmen/Sophomores/… "Name - Chapter" lines) | **table** (single-column list; one row per group) | "following categories:" lead-in + group-header lines; each group = one single-cell row | 2 (incl. one that is 2-col) |
| nested single-column layout `<table>`s wrapping prose (email/CMS artifact) | flattened to paragraphs | after media-columns pairing; our own block tables are guarded and never flattened | as needed |
| `section-metadata` (split-left / split-right) | section style | emitted by the split-section builders above | 7 |

## Notes / decisions
- Importer is built **ONCE per template** (not per page); same-shape pages need no per-page profile.
- **Publication Date** uses sitemap `<lastmod>` — the source lost original publish dates on republish and exposes only that date everywhere (the live source shows the same), so this is the truest lift-and-shift.
- Assets are localized to `content/media-da/…` after import (0 hotlinks); `content/` is git-ignored/DA-published, not committed.
- Full change history + rationale: `MIGRATION.md` (search "news importer").
