# Full-site validation — USTA Foundation EDS migration

**Date:** 2026-09-08
**Scope:** all published EDS pages (the live sitemap lists 86 entries → 84 real
pages after dropping the `nav`/`footer` fragments): 12 section/landing/specialized
pages + 72 news articles.
**Method:** `tools/quality/audit-site.mjs` (JS-rendered crawl of every page →
extract all `<a href>` → HTTP-check with HEAD→ranged-GET fallback, dedup, 12-way
concurrency; capture EDS + source breadcrumb trails and compare) plus
`tools/quality/audit-breadcrumbs-news.mjs` (news breadcrumbs re-checked against the
CORRECT source URL via source-sitemap prefix matching). Raw results:
`tools/quality/audit/audit-report.json`, `…/breadcrumbs-news.json`.

## Headline result

| Check | Result |
|---|---|
| Pages audited | **84** |
| Unique links checked | **367** |
| Migration-introduced broken links | **0** |
| Actionable internal problems | **2 PDFs** (localized — pending DA upload) |
| Breadcrumb mismatches vs source | **0** (all 84 match exactly) |

Everything that renders "broken" is either an external host that blocks bots
(works in a real browser) or a dead link that is **identical on the source site**
— a faithful lift-and-shift preserves those. No breadcrumb differs from source.

---

## 1. Link audit (404s)

367 unique links checked. 91 returned ≥400 / 0 / connection errors. Broken down:

### 1a. Internal (EDS-host) broken — 11, of which 2 are real & fixed

**2 PDF links (FIXED locally, pending DA upload):** these were authored as
root-relative `/content/dam/usta-foundation/pdfs/…​.pdf` — which 404 on the EDS
host (no `/content/dam/`), and which the first `localize-docs.mjs` pass missed
because it only matched *absolute* source-domain URLs. Fixed by teaching
`localize-docs.mjs` to also resolve root-relative `/content/dam/*.pdf` links
against the source host (`--src-host`, default www.ustafoundation.com):

| Page | PDF | Size | Now |
|---|---|---|---|
| `/en/home/get-involved` | `impact-societies-one-pager.pdf` | 85 KB | → `/assets/docs/pdfs/…` |
| `/en/home/what-we-do/college-scholarship-opportunities` | `2026-scholarship-program-faq.pdf` | 127 KB | → `/assets/docs/pdfs/…` |

Both downloaded to `content/assets/docs/pdfs/`, hrefs rewritten to absolute
`…aem.live/assets/docs/…`, and confirmed serving 200 `application/pdf` from the
local dev server. **DA upload + publish is blocked** — see "Blocked" below.

**9 `…/en/home/stay-current/national/<slug>` links (PRE-EXISTING — not fixed):**
"related article" links inside 3 news articles pointing at an old URL scheme the
source abandoned. Verified they return **404 on the source site itself** (and the
source truncates the same slugs, e.g. `…campai`, `…us`). A lift-and-shift carries
the source's own broken links verbatim; inventing new targets would be guessing.
Left as-is to match source. (Articles: `usta-foundation-launches-williams-family-…`,
`laver-cup-community-legacy-project-…`, `usta-foundation-launches-community-impact-hub-…`,
`frances-tiafoe-awards-njtl-alumnus-…`, `chris-evert-usta-foundation-much-more`,
`usta-foundation-scholarship-recipients-meet-billie-jean-king-at`.)

### 1b. External broken — 80 (report-only, NOT migration defects)

- **68 × facebook.com** — 63 are per-article `sharer.php?u=…` share buttons + the
  footer `facebook.com/USTAFoundation/`. Facebook returns 400 to non-browser
  requests; these work when clicked. Present on source too.
- **12 × other hosts** — census.gov, atptour.com, ustaflorida.com, ticketmaster,
  hbo.com, twitter.com, usta.com, kimmelmancampus.org, `t.email.usta.com`,
  `ustafoundation.com/mcdonaldfund/`, `ustafoundation.com/excellence_program/`.
  Every one is a link inside a **news article body** that is present on the
  matching source article (`on-src: true`), and each is either bot-blocked (403),
  a source-side redirect loop (`mcdonaldfund/`), or long-dead on the source
  (404/500). None introduced by the migration.

No source-domain PDF/doc link remains anywhere in `content/` (verified by grep:
zero `/content/dam/*.pdf` and zero `ustafoundation.com/*.pdf` hrefs left).

---

## 2. Breadcrumb hierarchy vs source

**All 84 pages match the source breadcrumb exactly** — same labels, same depth,
same crumb targets (EDS uses extensionless routes, e.g. `/en/home/get-involved`,
where the source uses `.html`; both resolve to the same page — correct for EDS).

### Section / landing / specialized (12 pages) — all ✓
```
/en/home                                            Home
/en/home/who-we-are                                 Home > Who We Are
/en/home/who-we-are/leadership-and-staff            Home > Who We Are > Leadership & Staff
/en/home/who-we-are/financials                      Home > Who We Are > Annual Reports and Financial Information
/en/home/what-we-do                                 Home > What We Do
/en/home/what-we-do/college-scholarship-opportunities  Home > What We Do > College Scholarship Opportunities
/en/home/our-impact                                 Home > Our Impact
/en/home/get-involved                               Home > Get Involved
/en/home/get-involved/special-funds                 Home > Get Involved > Special Funds
/en/home/get-involved/special-funds/chris-evert-50th-anniversary  Home > Get Involved > Special Funds > Chris Evert 50th anniversary
/en/home/get-involved/young-professional-initiative Home > Get Involved > Young Professional Initiative
/en/home/news                                       Home
```
The "recent pages" specifically re-verified crumb-by-crumb incl. hrefs
(YPI, chris-evert, college-scholarships, financials): identical to source.

### News (72 pages) — all ✓
Every news article breadcrumb is `Home > {article title}` — the `news` URL segment
is intentionally hidden (matches the source, whose news breadcrumb also omits the
`news`/`stay-current` level). Re-checked against each article's REAL source URL:
59 auto-matched ✓, the 1 "mismatch" and 12 "no-source-match" flags were all
source-URL prefix-matcher artifacts (near-duplicate slugs like the 2025 vs 2026
"…billie-jean-king…" articles); each was verified by hand to have the correct
`Home > {its own title}` trail.

**Net: 0 breadcrumb corrections needed.** (Note: the audit's first pass reported
16 "mismatches" — all were the generic host-swap mapping resolving truncated EDS
news slugs to a source 404 page whose crumb reads "Home > 404". The dedicated
news re-check with correct URL mapping cleared all 16.)

---

## 3. Blocked (needs the DA credential opt-in re-enabled)

During this run, `admin.da.live` began returning **401** for both reads and writes
— the "Allow LLM to use my Adobe credentials" opt-in (Settings → LLM Permissions)
has turned off since the previous session. No token is needed or accepted in chat.
Once re-enabled, run these to finish the 2-PDF fix (both < 20 MB, no compression):

```bash
ORG=aemdemos/foundation-usta
# upload the 2 new PDFs to DA source
for f in content/assets/docs/pdfs/impact-societies-one-pager.pdf \
         content/assets/docs/pdfs/2026-scholarship-program-faq.pdf; do
  curl -s -X POST -F "data=@$f;type=application/pdf" \
    "https://admin.da.live/source/$ORG/${f#content/}" -o /dev/null -w "%{http_code} ${f#content/}\n"
  p="${f#content/}"
  curl -s -X POST "https://admin.hlx.page/preview/aemdemos/foundation-usta/main/$p" -o /dev/null -w "prev %{http_code}\n"
  curl -s -X POST "https://admin.hlx.page/live/aemdemos/foundation-usta/main/$p"    -o /dev/null -w "live %{http_code}\n"
done
# re-upload the 2 pages WRAPPED in <body><main> (see playbook), then preview+publish:
for pg in en/home/get-involved en/home/what-we-do/college-scholarship-opportunities; do
  printf '<body><main>' > /tmp/w.html; cat "content/$pg.plain.html" >> /tmp/w.html; printf '</main></body>' >> /tmp/w.html
  curl -s -X POST -F "data=@/tmp/w.html;type=text/html" "https://admin.da.live/source/$ORG/$pg.html" -o /dev/null -w "page %{http_code} $pg\n"
  curl -s -X POST "https://admin.hlx.page/preview/aemdemos/foundation-usta/main/$pg" -o /dev/null -w "prev %{http_code}\n"
  curl -s -X POST "https://admin.hlx.page/live/aemdemos/foundation-usta/main/$pg"    -o /dev/null -w "live %{http_code}\n"
done
```
Then re-run `node tools/quality/audit-site.mjs --only /en/home/get-involved` and
`--only college-scholarship` to confirm the 2 links resolve.

---

## Re-run the audit anytime
```bash
node tools/quality/audit-site.mjs                    # full: links + breadcrumbs
node tools/quality/audit-site.mjs --only who-we-are  # a subtree
node tools/quality/audit-breadcrumbs-news.mjs        # news breadcrumbs, correct source mapping
```
