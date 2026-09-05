# USTA Foundation → EDS — Site Scope & Migration Plan

> Source: **https://www.ustafoundation.com/** · Discovered **2026-09-05** via **sitemap + crawl**
> (both, merged). Artifacts: `catalog/urls-all.json`, `catalog/urls-grouped.json`,
> `catalog/urls-sample.json`. This plan recommends **which template to build next** and why.

---

## 1. Discovery summary

- **URL discovery method:** BOTH, merged & deduped —
  - **Sitemap:** `/sitemap.xml` + `/sitemap-index.xml` + `/sitemap-images.xml` → 85 URLs.
  - **Crawl:** same-host Node crawl, queue exhausted (complete) → 65 URLs.
  - **Merged:** host normalized to `www`, `?form=`/hash/trailing-slash stripped, deduped.
- **Total unique content pages: 86** · **Downloadable documents: 21** (mostly annual-report PDFs).
- **Page-type distribution (by URL group):**

| Group | Count | Notes |
|---|---:|---|
| `/en/home/news/*` | **72** | News **detail** articles — one dominant template |
| `/en/home/*` (section landings) | 6 | who-we-are, what-we-do, our-impact, get-involved, news (listing), home |
| `/en/home/get-involved/*` | 2 | special-funds, young-professional-initiative |
| `/en/home/who-we-are/*` | 2 | financials, leadership-and-staff |
| `/` + others | 6 | homepage, 404, deep sub-pages |

**Headline finding:** 72 of 86 pages (**84%**) are **news detail articles** sharing one template. Nail that one template and the site is essentially migrated.

---

## 2. Template catalog (distinct page types)

| # | Template | Representative URL(s) | Est. pages | Status |
|---|---|---|---:|---|
| T0 | **Home** | `/en/home.html` | 1 | ✅ **Done** |
| T1 | **News detail** | `/en/home/news/2023-njtl-essay-contest-winners.html` | **72** | Blocks built, template not instrumented |
| T2 | **News listing** | `/en/home/news.html` | 1 | Blocks likely = cards-news feed |
| T3 | **Section landing** | `/en/home/{who-we-are,what-we-do,our-impact,get-involved}.html` | 4 | Reuses hero/columns/cards |
| T4 | **Leadership & staff** | `/en/home/who-we-are/leadership-and-staff.html` | 1 | cards-profile + tabs (built) |
| T5 | **Financials** | `/en/home/who-we-are/financials.html` | 1 | downloads block (built) |
| T6 | **Special funds / campaign** | `/en/home/get-involved/special-funds.html`, `.../young-professional-initiative.html`, `.../chris-evert-50th-anniversary.html`, `.../college-scholarship-opportunities.html` | 4 | cards-expand, quote-image, table (built) |
| T7 | **404** | `/en/home/404.html` | 1 | hero-error (built) |

Most component blocks already exist (built during the homepage + block-library phase). The gap is **per-template import instrumentation** (parsers + page-templates.json entries + section styles), not net-new block CSS.

---

## 3. Recommended build order

### ▶ FIRST: T1 — News detail (`/en/home/news/*`)
**Why first:** highest leverage by a wide margin — **one template instruments 72 pages (84% of the site)**. It also exercises blocks we've already built and partly validated on the essay-contest page:
- article body (default content) · **social** share bar · **custom-widget-reactions** (just finished: hover pill, alt, click) · **custom-content-related-articles** ("Related Articles" cards-news feed) · **table** (essay winners two-column) · breadcrumb.

**Work:** build ONE profile-driven importer for the news-detail template (measure the live DOM once), then bulk-import all 72 URLs. Expect ~90% completeness, verify by eye. This is the single most valuable next step.

### 2nd: T2 — News listing (`/en/home/news.html`)
Feeds T1. A paginated grid of news cards → reuse the `cards` (news) variant. Small, unblocks navigation into the 72 articles.

### 3rd: T3 — Section landings (4 pages)
who-we-are / what-we-do / our-impact / get-involved. These reuse hero + columns (feature/stats) + cards + the new `center`/`narrow` section styles. Build one flexible profile; 4 pages share it.

### 4th: T4–T6 — Specialized pages (6 pages)
Leadership-and-staff (cards-profile + tabs), financials (downloads + annual-report PDFs → finalize assets to `content/assets/docs/`), special-funds/campaign pages (cards-expand donate, quote-image, table). One profile per genuinely-distinct variant; reuse first.

### Last: T7 — 404
Single page, hero-error block already built. Trivial.

---

## 4. Effort estimate (rough)

| Phase | Templates | Pages | Relative effort |
|---|---|---:|---|
| 1 | T1 news detail | 72 | ●●●○ (one template, big payoff) |
| 2 | T2 news listing | 1 | ●○○○ |
| 3 | T3 section landings | 4 | ●●○○ |
| 4 | T4–T6 specialized | 6 | ●●●○ (3 profiles) |
| 5 | T7 404 | 1 | ●○○○ |

Building **T1 alone migrates 84% of the page count.** Prioritize it.

---

## 5. Assets & gotchas

- **21 documents** (annual-report PDFs under `/content/dam/.../financials/annual-reports/`) surface on **T5 Financials** — wire via the finalize-assets pipeline (docs → `content/assets/docs/…`, links rewritten absolute).
- **www vs non-www:** sitemap lists some `ustafoundation.com` (no-www) URLs — same content; normalized to `www` in discovery.
- **`?form=` query URLs** (EVERT/MACKIE/TIAFOE on special-funds) are the Fundraise Up donate deep-links, not separate pages — collapsed in discovery; handled at runtime by `scripts/donate.js`.
- **News detail completeness** will read <100% (duplicate hidden mobile/desktop copies, like the homepage collage) — expected, verify visually.

---

## 6. Discovery artifacts

- `catalog/urls-all.json` — 86 pages + 21 docs (schema-valid, method `sitemap`, merge documented in `limitations`).
- `catalog/urls-grouped.json` — 6 groups (schema-valid).
- `catalog/urls-sample.json` — all-URLs sample for downstream per-page analysis.
- `catalog/crawl-checkpoint.json` — raw crawl state (queue exhausted).
