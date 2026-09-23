# Related Articles Feed — news template

How the "Related Articles" feed on news article pages works, end to end.

## Overview
Every news article ends with a **Related Articles** feed (3–4 teaser cards:
landscape image, short title, date, description, "Read More"). The source site
renders it with a dynamic AEM "list-core-component" widget; we reproduce it in
code at page-decoration time, driven entirely by author-facing page metadata — no
per-page code. It is built by the **news page template**, not a block, so it
appears automatically on every page whose Metadata `Template = news`.

## Files
- `templates/news/news.js` — the template `decorate(main)`: reads config metadata,
  fetches the index, selects + sorts + limits candidates, builds a `cards (news)`
  block in its own section, and loads it.
- `templates/news/news-sort.js` — pure, browser-free helpers (`dateValue`,
  `displayDate`, `cardTitle`, `sortNews`) so the date/sort/title logic is
  unit-testable in Node (news.js can't be imported in Node — it pulls in aem.js,
  which touches `window`). Single source of truth; news.js imports from here.
- `tests/news/news-sort.test.mjs` — 22 assertions over the helpers. Run with
  `npm run test:news`.
- `templates/news/news.css` — only the link deltas for the feed (image + title are
  wrapped in `<a>`); the card look comes from `.cards.news` in `blocks/cards/`.
- `helix-query.yaml` — indexes the fields the feed reads (`/news-index.json`).
- `blocks/cards/cards.js` (`decorateNews`) + `blocks/cards/cards.css` (`.cards.news`)
  — render each card row emitted by the template.

## Authoring model (page Metadata drives the feed)
| Metadata field   | Values / meaning                                   | Default    |
|------------------|----------------------------------------------------|------------|
| `List From`      | `children` \| `tags` \| `static`                   | `children` |
| `Sort Order`     | `asc` \| `desc`                                    | `desc`     |
| `Max Items`      | integer                                            | `3`        |
| `News Tags`      | comma-separated tag(s) — used when `List From=tags`| —          |
| `Pages`          | comma-separated page paths — used when `=static`   | —          |
| `Related Title`  | short card/nav title for THIS article when featured| (empty)    |

Resolution ladder (mode = `List From`):
- **static** — exactly the articles named in `Pages`, in the author's order (then
  date-sorted). Missing/typo paths are dropped.
- **tags** — articles sharing ≥1 `News Tags` leaf with this page. If `List From=tags`
  but `News Tags` is empty → returns NOTHING (never silently falls back to all —
  that would break the tag-scoping contract).
- **children** (default) — the whole news index.

Every mode then: excludes the current page, sorts, and caps at `Max Items`.

## Data source — the query index
`helix-query.yaml` defines two indices; the feed reads **`/news-index.json`**
(scoped to `/**/news/**`, excluding the `…/news` landing page). Per-article fields:
`title`, `relatedtitle`, `description`, `image`, `publicationdate`, `lastModified`
(UNIX seconds from the HTTP `Last-Modified` header — NOT authored), `newstags`.
New/changed articles enter the index automatically on publish; no separate sheet.

## Sorting (news-sort.js `sortNews`)
1. Primary key = **Publication Date** (`publicationdate`, day-granularity). When an
   article has no publication date, fall back to **`lastModified`**.
   - IMPORTANT: `lastModified` is a UNIX-SECONDS **number**, so `Date.parse()` on it
     returns NaN. `lastModifiedMs()` normalizes it (×1000), also accepting a numeric
     string or a date string. Without this the fallback silently collapsed to 0 and
     every date-less article tied — the original bug.
2. Same-day tie-break = the finer **`lastModified` timestamp**, following the SAME
   direction as the primary sort (desc → newest-modified first; asc → oldest first).
3. `Sort Order` (`asc`/`desc`) applies to both keys via a single `dir` multiplier.

## Card title — the "Related Title" field (short/nav title)
The source cards show a SHORT editorial nav title (e.g. "WHM 2026: Stewart &
Robles"), distinct from the full article title. Investigation proved this short
title is authored per-page in the source AEM and is emitted ONLY where the article
is featured in another page's feed — an article's own page never contains it. The
source only ever features ~12 articles, so exactly **12 short titles are
retrievable** anywhere on the public site; the rest would require the source AEM
author data / migration spreadsheet.

Mechanism:
- New Metadata field **`Related Title`** → meta `related-title` → index
  `relatedtitle` (added to BOTH indices in helix-query.yaml).
- `cardTitle(entry)` = `relatedtitle` when set (trimmed), else the full `title`.
  So an empty Related Title transparently falls back to the full title.
- Content: a **`Related Title` metadata row was added to ALL 73 news DA sources** —
  12 filled with the known source short titles, 61 left empty (fall back). Handled
  BOTH DA cell formats (plain `<div>` and `<p>`-wrapped) and empty-value cells.
  Uploaded to DA and previewed + published; the `related-title` meta is live on
  both aem.page and aem.live (12/12 filled verified).

The 12 filled slugs (short title): women-s-history-month-2026… (WHM 2026: Stewart &
Robles), usta-foundation-and-reginald-f-lewis…partner (USTAF partners with RFLF),
scholarship…billie-jean-king-at-0 (2026 Donnelly Scholarship), reginald-f-lewis…
announce-inaugural (2026 Game Changer Award), celebrates-24-outstanding-students
(Career excellence week) — plus 7 where the source short == full title
(2023-njtl-essay-contest-winners, black-history-month-2026…, pledges-800-000…,
launches-community-impact-hub…, launches-williams-family…, scholarship…-at,
six-student-athletes…).

## Card date (news-sort.js `displayDate`)
Shows the author's Publication Date verbatim when set; otherwise the `lastModified`
date formatted "Month DD, YYYY"; '' when neither.

## DOM the template builds
```
<div class="section related-articles cards-container">
  <div class="default-content-wrapper"><h2 id="related-articles">Related Articles</h2></div>
  <div class="cards-wrapper"><div class="cards news">…rows…</div></div>
</div>
```
Each row = `[ <a><picture></a> | <h3><a>title</a></h3> <p>date</p> <p>desc</p> <p><a>Read More</a></p> ]`.
The feed image link is decorative for AT (empty alt + aria-hidden + tabindex=-1)
since the title link already names the article. The section reuses the marked
`.section.related-articles` (from Section Metadata `Style: related-articles`) when
present, else appends one; it carries `cards-container` so it matches an authored
cards section. The block is created with `buildBlock` then `decorateBlock` +
`loadBlock` (standard EDS lazy path).

## Edge cases handled
- Index unreadable / empty → return early (no feed).
- No candidates after filtering → return early (no empty heading).
- `tags` mode with empty `News Tags` → nothing (no fallback-to-all).
- Article with no image → row omits the image cell.
- Article with no description → row omits the description line.
- `relatedtitle` empty/whitespace/missing → fall back to full title.
- `lastModified` number / numeric-string / absent → normalized; ties resolved.

## Known constraint / follow-up
- `relatedtitle` will not surface in the LIVE `/news-index.json` (and thus on the
  rendered cards) until `helix-query.yaml` + `news.js` are committed/pushed and
  code-synced, which triggers a re-index. Until then cards fall back to the full
  title (verified correct on the dev server).
- Only 12 short titles exist on the public source; the remaining 60 `Related Title`
  fields are intentionally empty until the source author data / spreadsheet supplies
  them. The field + fallback are in place so they can be filled anytime with no code
  change.

## Verification / gates
- `npm run lint` → 0 errors.
- `npm run test:news` → 22/22 (sort direction, lastModified normalization + numeric
  forms, same-day timestamp tie-break, cardTitle fallback, displayDate fallback).
- Live-verified on the dev server (feed renders with correct fallback titles/dates,
  no console errors) and on aem.page/aem.live (related-title meta present, 12/12).
