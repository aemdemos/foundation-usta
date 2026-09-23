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
- `tools/quality/audit/related-articles-audit.mjs` — a read-only auditor that
  imports the `news-sort.js` helpers and replays the exact `news.js` selection
  against the live `/news-index.json` for every news page. Run with
  `node tools/quality/audit/related-articles-audit.mjs` (add `--md` to regenerate
  the per-page section below). (There is no `tests/news/` suite or `npm run
  test:news` script — the helpers are exercised through this auditor.)
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
- `node tools/quality/audit/related-articles-audit.mjs` → replays the sort/select
  logic (`sortNews` direction, `lastModified` normalization + numeric forms,
  same-day tie-break, `cardTitle`/`displayDate` fallback) against the live index for
  all 73 pages and prints each page's resulting cards (see the per-page section
  below). Use it to confirm any change to the feed logic still produces the
  expected cards. (NOTE: there is no `tests/news/` unit suite or `npm run test:news`
  script — an earlier draft of this doc referenced one that was never added.)
- Live-verified on the dev server (feed renders with correct fallback titles/dates,
  no console errors) and on aem.page/aem.live (related-title meta present, 12/12).

---

## Per-page calculation — how each of the 73 news pages picks its cards

This section shows, **for every news page**, the config metadata in its Metadata
table and the exact cards the feed produces from `/news-index.json`. It's the
concrete application of the algorithm above.

### How to read it (the algorithm, step by step)
For a given page, `news.js` does exactly this (see `selectCandidates` + `sortNews`):
1. **Read config** from the page's Metadata block: `List From` (default `children`),
   `Sort Order` (default `desc`), `Max Items` (default `3`), `News Tags`, `Pages`.
2. **Build the candidate pool** from `/news-index.json` (74 rows, real articles only):
   - `children` → the WHOLE index (72 others).
   - `tags` → only rows whose `newstags` share ≥1 leaf with this page's `News Tags`
     (all tagged pages use `usta-foundation`, giving a **17-article** pool). Empty
     `News Tags` → empty pool.
   - `static` → exactly the rows named in `Pages`, in author order.
3. **Exclude the current page**, **sort** by `publicationdate` (fallback
   `lastModified`), same-day ties broken by the finer `lastModified` — both in the
   `Sort Order` direction — and **cap at `Max Items`**.
4. Each surviving row becomes a card: image (`image`), title (`relatedtitle` → else
   `title`), date (`publicationdate` → else `lastModified`), description, Read More.

### Config distribution across the 73 pages
| Config (List From / Sort / Max [/ Tags]) | # pages |
|---|---:|
| children / asc / 3 | 48 |
| tags / asc / 4 / usta-foundation | 10 |
| tags / desc / 3 / usta-foundation | 4 |
| tags / asc / 3 / usta-foundation | 4 |
| children / desc / 3 | 4 |
| children / asc / 4 | 1 |
| static / desc / 3 (Pages ×3) | 1 |
| static / asc / 3 (Pages ×3) | 1 |

### ⚠️ Important — why so many pages currently show the SAME three cards
The card SET and ORDER are computed **live from `/news-index.json` as it is today**,
not baked per page. In the current index almost every article's `publicationdate`
is empty and `lastModified` is the SAME 2026 republish day, so the date sort mostly
ties and collapses to one order. Net effect right now:
- **`asc` pages** surface the earliest-dated articles → the same top-3
  (WHM 2026 → USTAF partners with RFLF → Yonex…), or top-4 when `Max Items=4`.
- **`desc` pages** surface the latest-modified → Frances-Tiafoe-awards →
  Six-student-athletes → Black-History-Month…
- **`static` pages** show exactly their 3 named `Pages`.
This is expected and matches the source's own behaviour (the source feed reads the
same republish `lastmod`). As real publication dates / tags are filled in the index,
each page's cards will differentiate automatically — **no code or per-page change
needed**. Regenerate this section anytime with
`node tools/quality/audit/related-articles-audit.mjs --md`.

### Per-page results (config → cards), live index snapshot 2026-09-23

#### 2023-njtl-essay-contest-winners
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### 2026-usta-foundation-opening-night-gala-provides-young-people-wi
- **Metadata:** `List From`=**tags**, `Sort Order`=**asc**, `Max Items`=**4**, `News Tags`=**usta-foundation**
- **Candidate pool:** 17 article(s) (articles sharing a tag)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026
  4. USTA Foundation partners with Chase to award over $250,000 to help support young people on and off the court — July 08, 2026

#### black-history-month-2026-community-impact-hub-leader-john-borde
- **Metadata:** `List From`=**tags**, `Sort Order`=**asc**, `Max Items`=**3**, `News Tags`=**usta-foundation**
- **Candidate pool:** 17 article(s) (articles sharing a tag)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### carol-ngounoue-runner-up-wimbledon-event
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### chris-evert-honored-espn-sports-humanitarian-awards
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### chris-evert-honored-espys-usta-foundation-work
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### chris-evert-usta-foundation-much-more
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### clervie-ngounoue-first-junior-grand-slam-australia
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### clervie-ngounoue-wins-first-junior-grand-slam-australian-open
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### daymond-john-and-matt-ebert-share-wisdom-with-usta-foundation-s
- **Metadata:** `List From`=**static**, `Sort Order`=**desc**, `Max Items`=**3**, `Pages`=**usta-foundation-launches-community-impact-hub-initiative, usta-foundation-scholarship-recipients-meet-billie-jean-king-at, usta-foundation-launches-williams-family-excellence-program-at-2**
- **Candidate pool:** 3 article(s) (named pages)
- **Cards shown (in order):**
  1. USTA Foundation scholarship recipients meet Billie Jean King at the 2025 US Open — September 23, 2026
  2. USTA Foundation launches Community Impact Hub initiative — September 23, 2026
  3. USTA Foundation launches Williams Family Excellence Program at 2025 US Open — September 23, 2026

#### delray-beach-youth-tennis-foundation-athletes-hit-the-court-with
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### desert-smash-brings-together-hollywood-and-pro-tennis-to-benefit
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### espn-chris-mckendry-supports-usta-foundation
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### evert-speaks-on-rally-to-rebuild
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### excellence-program-alumna-robin-montgomery-reaches-first-wta-sem
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### fashion-icon-anna-wintour-honored-with-usta-foundation-paver-on
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### frances-tiafoe-awards-njtl-alumnus-with-college-scholarship
- **Metadata:** `List From`=**tags**, `Sort Order`=**desc**, `Max Items`=**3**, `News Tags`=**usta-foundation**
- **Candidate pool:** 17 article(s) (articles sharing a tag)
- **Cards shown (in order):**
  1. Black History Month 2026: Community Impact Hub leader John Borden reflects on tennis as an ‘unexpected anchor’ — September 23, 2026
  2. USTA Foundation scholarship recipients meet Billie Jean King at the 2025 US Open — September 23, 2026
  3. USTA Foundation launches Williams Family Excellence Program at 2025 US Open — September 23, 2026

#### frances-tiafoe-fund-surpasses-1-million-raised
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**4**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026
  4. USTA Foundation partners with Chase to award over $250,000 to help support young people on and off the court — July 08, 2026

#### frances-tiafoe-holds-clinic-for-youth-from-houston-tennis-associ
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### frances-tiafoe-presents-check-to-jtcc
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### how-the-usta-foundation-and-realize-the-dream-are-set-to-inspire
- **Metadata:** `List From`=**children**, `Sort Order`=**desc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. Frances Tiafoe awards NJTL alumnus with $30,000 college scholarship — September 23, 2026
  2. Six student-athletes awarded first-ever grants from the Frances Tiafoe Fund — September 23, 2026
  3. Black History Month 2026: Community Impact Hub leader John Borden reflects on tennis as an ‘unexpected anchor’ — September 23, 2026

#### inaugural-usta-foundation-impact-conference
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### james-blake-30th-anniversary-usta-foundation
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### jinjie-ling-dwight-f-davis-memorial-scholarship
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### kathleen-wu-usta-foundation-president
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### kimmelman-sport-education-complex-los-angeles
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### kings-county-tennis-league-nominated-for-laureus-sport-for-good
- **Metadata:** `List From`=**tags**, `Sort Order`=**desc**, `Max Items`=**3**, `News Tags`=**usta-foundation**
- **Candidate pool:** 17 article(s) (articles sharing a tag)
- **Cards shown (in order):**
  1. Frances Tiafoe awards NJTL alumnus with $30,000 college scholarship — September 23, 2026
  2. Black History Month 2026: Community Impact Hub leader John Borden reflects on tennis as an ‘unexpected anchor’ — September 23, 2026
  3. USTA Foundation scholarship recipients meet Billie Jean King at the 2025 US Open — September 23, 2026

#### kyrgios-sock-njtl-clinic-laver-cup-boston
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### laver-cup-community-legacy-project-celebrates-court-unveiling-at
- **Metadata:** `List From`=**tags**, `Sort Order`=**asc**, `Max Items`=**3**, `News Tags`=**usta-foundation**
- **Candidate pool:** 17 article(s) (articles sharing a tag)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### laver-cup-launches-2025-san-francisco-community-legacy-project-w
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### leylah-fernandez-partners-with-usta-socal-and-bgcmla-for-youth-c
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### mackenzie-mcdonald-celebrates-the-launch-of-the-usta-foundation
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### mackenzie-mcdonald-i-m-making-it-my-mission-to-help-open-the-s
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### mississippi-njtl-family-biz-builder
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### newport-njtl-honor-chris-evert
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### ngounoue-excellence-team-junior-french-open
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### njtl-ace-jabeiro-brown
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### njtl-essay-contest-winners-2024-open
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### njtl-essay-grant-recipients-2020
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### njtl-student-athlete-ata-national-championships
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### njtl-student-athletes-white-house-visit
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### novo-nordisk-donnelly-scholarship-winners-meet-billie-jean-king
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### robin-montgomery-investing-in-game
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### robin-montgomery-wimbledon-debut
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### six-student-athletes-awarded-first-grants-frances-tiafoe-fund
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### sloane-stephens-honored-by-sports-business-journal
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### tennis-has-been-my-vehicle-to-serve-sloane-stephens-shares-he
- **Metadata:** `List From`=**tags**, `Sort Order`=**asc**, `Max Items`=**4**, `News Tags`=**usta-foundation**
- **Candidate pool:** 17 article(s) (articles sharing a tag)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026
  4. USTA Foundation partners with Chase to award over $250,000 to help support young people on and off the court — July 08, 2026

#### tiafoe-houston-youth-clinic
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### usta-foundation-and-reginald-f-lewis-foundation-partner-to-empo
- **Metadata:** `List From`=**tags**, `Sort Order`=**asc**, `Max Items`=**4**, `News Tags`=**usta-foundation**
- **Candidate pool:** 17 article(s) (articles sharing a tag)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026
  3. USTA Foundation partners with Chase to award over $250,000 to help support young people on and off the court — July 08, 2026
  4. USTA Foundation announces Sloane Stephens as recipient of Serving Up Dreams Award — July 09, 2026

#### usta-foundation-and-yonex-team-up-to-transform-communities-and-e
- **Metadata:** `List From`=**tags**, `Sort Order`=**asc**, `Max Items`=**4**, `News Tags`=**usta-foundation**
- **Candidate pool:** 17 article(s) (articles sharing a tag)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation partners with Chase to award over $250,000 to help support young people on and off the court — July 08, 2026
  4. USTA Foundation announces Sloane Stephens as recipient of Serving Up Dreams Award — July 09, 2026

#### usta-foundation-announces-chris-evert-chair
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### usta-foundation-announces-new-advisory-board-members
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### usta-foundation-announces-sloane-stephens-as-recipient-of-servin
- **Metadata:** `List From`=**tags**, `Sort Order`=**asc**, `Max Items`=**4**, `News Tags`=**usta-foundation**
- **Candidate pool:** 17 article(s) (articles sharing a tag)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026
  4. USTA Foundation partners with Chase to award over $250,000 to help support young people on and off the court — July 08, 2026

#### usta-foundation-celebrates-2026-njtl-essay-contest-winners-at-us
- **Metadata:** `List From`=**tags**, `Sort Order`=**asc**, `Max Items`=**4**, `News Tags`=**usta-foundation**
- **Candidate pool:** 17 article(s) (articles sharing a tag)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026
  4. USTA Foundation partners with Chase to award over $250,000 to help support young people on and off the court — July 08, 2026

#### usta-foundation-celebrates-24-outstanding-students-through-caree
- **Metadata:** `List From`=**children**, `Sort Order`=**desc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. Frances Tiafoe awards NJTL alumnus with $30,000 college scholarship — September 23, 2026
  2. Six student-athletes awarded first-ever grants from the Frances Tiafoe Fund — September 23, 2026
  3. Black History Month 2026: Community Impact Hub leader John Borden reflects on tennis as an ‘unexpected anchor’ — September 23, 2026

#### usta-foundation-chairperson-chris-evert-announces-cancer-free
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### usta-foundation-chris-evert-honored-itf-commitment-award
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### usta-foundation-exceeds-goal-rally-to-rebuild-campaign
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### usta-foundation-launches-community-impact-hub-initiative
- **Metadata:** `List From`=**tags**, `Sort Order`=**desc**, `Max Items`=**3**, `News Tags`=**usta-foundation**
- **Candidate pool:** 17 article(s) (articles sharing a tag)
- **Cards shown (in order):**
  1. Frances Tiafoe awards NJTL alumnus with $30,000 college scholarship — September 23, 2026
  2. Black History Month 2026: Community Impact Hub leader John Borden reflects on tennis as an ‘unexpected anchor’ — September 23, 2026
  3. USTA Foundation scholarship recipients meet Billie Jean King at the 2025 US Open — September 23, 2026

#### usta-foundation-launches-williams-family-excellence-program-at-2
- **Metadata:** `List From`=**tags**, `Sort Order`=**asc**, `Max Items`=**3**, `News Tags`=**usta-foundation**
- **Candidate pool:** 17 article(s) (articles sharing a tag)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### usta-foundation-offline-by-aerie-and-the-aerie-real-foundatio
- **Metadata:** `List From`=**tags**, `Sort Order`=**asc**, `Max Items`=**4**, `News Tags`=**usta-foundation**
- **Candidate pool:** 17 article(s) (articles sharing a tag)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026
  4. USTA Foundation partners with Chase to award over $250,000 to help support young people on and off the court — July 08, 2026

#### usta-foundation-partners-with-chase-to-award-over-250-000-to-he
- **Metadata:** `List From`=**tags**, `Sort Order`=**asc**, `Max Items`=**4**, `News Tags`=**usta-foundation**
- **Candidate pool:** 17 article(s) (articles sharing a tag)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026
  4. USTA Foundation announces Sloane Stephens as recipient of Serving Up Dreams Award — July 09, 2026

#### usta-foundation-pledges-800-000-service-hours-in-support-of-mart
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### usta-foundation-rally-to-rebuild-campaign
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### usta-foundation-receives-transformative-2-7-million-gift-from-t
- **Metadata:** `List From`=**static**, `Sort Order`=**asc**, `Max Items`=**3**, `Pages`=**usta-foundation-launches-community-impact-hub-initiative, usta-foundation-scholarship-recipients-meet-billie-jean-king-at, usta-foundation-launches-williams-family-excellence-program-at-2**
- **Candidate pool:** 3 article(s) (named pages)
- **Cards shown (in order):**
  1. USTA Foundation launches Community Impact Hub initiative — September 23, 2026
  2. USTA Foundation launches Williams Family Excellence Program at 2025 US Open — September 23, 2026
  3. USTA Foundation scholarship recipients meet Billie Jean King at the 2025 US Open — September 23, 2026

#### usta-foundation-reginald-f-lewis-foundation-announce-inaugural
- **Metadata:** `List From`=**tags**, `Sort Order`=**asc**, `Max Items`=**4**, `News Tags`=**usta-foundation**
- **Candidate pool:** 17 article(s) (articles sharing a tag)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026
  4. USTA Foundation partners with Chase to award over $250,000 to help support young people on and off the court — July 08, 2026

#### usta-foundation-scholarship-recipients-meet-billie-jean-king-at-0
- **Metadata:** `List From`=**tags**, `Sort Order`=**asc**, `Max Items`=**4**, `News Tags`=**usta-foundation**
- **Candidate pool:** 17 article(s) (articles sharing a tag)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026
  4. USTA Foundation partners with Chase to award over $250,000 to help support young people on and off the court — July 08, 2026

#### usta-foundation-scholarship-recipients-meet-billie-jean-king-at
- **Metadata:** `List From`=**tags**, `Sort Order`=**desc**, `Max Items`=**3**, `News Tags`=**usta-foundation**
- **Candidate pool:** 17 article(s) (articles sharing a tag)
- **Cards shown (in order):**
  1. Frances Tiafoe awards NJTL alumnus with $30,000 college scholarship — September 23, 2026
  2. Black History Month 2026: Community Impact Hub leader John Borden reflects on tennis as an ‘unexpected anchor’ — September 23, 2026
  3. USTA Foundation launches Williams Family Excellence Program at 2025 US Open — September 23, 2026

#### usta-foundation-teams-up-with-la-roche-posay-for-events-at-selec
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### usta-foundation-to-celebrate-winners-of-2025-national-junior-ten
- **Metadata:** `List From`=**children**, `Sort Order`=**desc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. Frances Tiafoe awards NJTL alumnus with $30,000 college scholarship — September 23, 2026
  2. Six student-athletes awarded first-ever grants from the Frances Tiafoe Fund — September 23, 2026
  3. Black History Month 2026: Community Impact Hub leader John Borden reflects on tennis as an ‘unexpected anchor’ — September 23, 2026

#### usta-foundation-to-honor-andre-agassi-with-serving-up-dreams-awa
- **Metadata:** `List From`=**children**, `Sort Order`=**desc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. Frances Tiafoe awards NJTL alumnus with $30,000 college scholarship — September 23, 2026
  2. Six student-athletes awarded first-ever grants from the Frances Tiafoe Fund — September 23, 2026
  3. Black History Month 2026: Community Impact Hub leader John Borden reflects on tennis as an ‘unexpected anchor’ — September 23, 2026

#### what-s-the-why-former-atp-wta-pros-open-up-on-their-support-of
- **Metadata:** `List From`=**children**, `Sort Order`=**asc**, `Max Items`=**3**
- **Candidate pool:** 72 article(s) (whole index minus self)
- **Cards shown (in order):**
  1. WHM 2026: Stewart & Robles — March 25, 2026
  2. USTAF partners with RFLF — April 15, 2026
  3. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026

#### women-s-history-month-2026-how-two-community-impact-hub-leaders
- **Metadata:** `List From`=**tags**, `Sort Order`=**asc**, `Max Items`=**3**, `News Tags`=**usta-foundation**
- **Candidate pool:** 17 article(s) (articles sharing a tag)
- **Cards shown (in order):**
  1. USTAF partners with RFLF — April 15, 2026
  2. USTA Foundation and Yonex team up to transform communities and empower the next generation of leaders — May 19, 2026
  3. USTA Foundation partners with Chase to award over $250,000 to help support young people on and off the court — July 08, 2026
