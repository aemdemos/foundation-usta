# Page Parity Checker — Original vs EDS

A local web UI for validating migrated pages: enter one or more **original URL → EDS URL**
pairs and get a side-by-side comparison plus an exportable report.

```bash
npm run compare            # opens on http://localhost:4100
npm run compare -- --port 4200
```

## What it compares (per pair)

| Area | How |
|---|---|
| **Visual** | Full-page screenshot of both pages at each selected viewport (defaults: 375 / first project breakpoint / 1440). **Shift-aware** pixel diff: the two pages are lined up row by row first, so content that only moved up/down is ignored; areas that still differ are boxed, and unmatched rows become "section missing / extra / differs" or "spacing differs". Page height and horizontal overflow. |
| **Text** | Visible text split into blocks, aligned with an LCS diff → missing / changed (word-level highlight) / extra / regrouped (same text split into different paragraphs). Overall word similarity. |
| **Headings** | Outline side by side, missing/changed headings, level changes, heading-hierarchy problems. |
| **Links** | Matched on normalised destination (host, `.html`, trailing slash ignored; documents by file name). Missing, extra, different target, different #anchor, EDS links still pointing at the original domain. Optional HTTP status check of every EDS link. |
| **Images & media** | Image count, thumbnails, broken images, missing `alt`, alt texts not carried over, background images, video/iframe embeds, forms. |
| **Metadata** | Title, description, og/twitter tags, canonical, robots, `lang`, JSON-LD. |
| **Typography** | Computed font family/size/weight/line-height/colour/letter-spacing for body, h1–h6, p, a, li at every viewport. |
| **Console & network** | JS errors and failed requests on both pages. |

### Run summary

After a run you get one card per page: page title, status (**Matches**, **Mostly matches**, **Needs
review** or **Fail**), "N to fix first · N worth checking", review progress, and a **Review →** button.
**Start / Continue reviewing →** opens the first page that still has unreviewed findings. A one-page
run opens its review automatically when it finishes. Inside a page, **‹ Previous page / Next page ›**
moves through the run; the breadcrumb (History › run) goes back.

Page tabs: **Difference review**, **Issues**, **Notes**, plus a smaller **Details** row (Text,
Headings, Links, Images, Metadata, Typography, Console) for deeper checks.

### Difference review (default view of a page)

Built to be read top-down, one finding at a time:

- **One-line verdict + cards**: *Fix first* / *Worth checking* / *Minor* / page height for the chosen width.
- **Screenshots** (original | EDS, side by side, synced scroll, zoom, 375/768/1440…) with small numbered
  **pins** only — no boxes until you pick something.
- **"What's different" list** next to the screenshots, grouped **Fix first → Worth checking → Minor**
  (Minor collapsed), filterable by *Content / Spacing / Visual*. Every item has a plain title
  ("39px more space on EDS") and what to check ("Between “By giving…” and image “Donors…”: 203px → 242px.
  Check margin / padding.").
- **Pick an item** (or a pin) → it's outlined on **both** pages, the rest of the screenshot is dimmed, and
  both pages scroll to it. Click again to clear. *Outline all* shows every box at once if you want the full picture.

**Review workflow:** pick a finding → compare the highlighted area → mark **✓ Looks fine** or
**✗ Needs fix** (the next unreviewed finding opens automatically). A progress bar shows
"Reviewed N of M"; marks are saved with the run and included in the exported report.
Keyboard: **↑ / ↓** (or K / J) move, **O** looks fine, **X** needs fix, **Esc** clears.

To keep the list short: findings of the same kind on the **same row** (e.g. the gap under the left
and the right column of a two-column section) are combined into one item ("66–86px less space on EDS —
2 columns in this row"), and spacing differences that repeat (same kind of gap, same size, 3+ places)
are merged into **one** item ("24px more space between headings and text on EDS — 5 places",
selecting it highlights all of them); pixel-diff areas that a spacing/content finding already
explains are hidden. Rows in the Issues, Text, Headings and Links tabs have a **📍 Show** link.

What is measured:
- **Visual** – shift-aware pixel diff (pages are lined up first, so content that only moved is ignored).
- **Spacing & layout** – from the real element boxes of everything on both pages, plus the edges of
  **coloured / image-background sections** (bands at least 40% of the page wide):
  - space above each element to the nearest edge — the content above, the **top of its section**
    (padding-top) or the **end of the section above** (e.g. "Above heading “Signature Events”, after the
    section above: 105px → 60px");
  - space between the last element of a section and the **bottom of that section** (padding-bottom);
  - left-edge shifts (padding), multi-line text width (wrapping), image size.

  Only like-for-like edges are compared (section end vs section end, the same block above, …).
  Priority: ≥96px fix first, ≥24px worth checking, smaller = minor.
- **Content** – missing / changed / extra text, headings, links, broken images, missing alt.

Each pair gets a **parity score** (text 30%, visual 20%, links 15%, headings / images / typography
10% each, metadata 5%), an auto status (Pass ≥ 90 with no errors, Needs review ≥ 75, Fail),
and a prioritised **issue list**. Add your own **verdict + notes** per page in the *Review notes* tab.

## Screen widths

- **Before a run:** tick any of the project breakpoints (from `tools/quality/breakpoints.json`, plus 375 and
  1440) and/or type other widths (280–2560px, e.g. `320, 1024, 1920`) in the main form.
- **After a run:** in the Difference review, type a width (or pick a suggestion) next to the width buttons and
  click **+ Add width**. Only that page is captured again at that width (~30s), and the new width is added
  to its results and the exported report.

## Reports

**⬇ Export report** (in the run summary and in each page's Difference review) downloads one
self-contained HTML file (screenshots embedded) that opens offline and can be shared.
The same run data is also available at `/api/jobs/<id>/issues.csv` (one row per issue, incl. your
verdict/notes) and `/api/jobs/<id>/result.json`.

Runs are saved in `tools/compare/reports/<run-id>/` (git-ignored) and listed under **History**.

## Options (Advanced)

- **Main content only** (default) – compares `<main>` on EDS and the original's `<main>`/`<body>`
  minus header/footer selectors (pre-filled for this site's AEM experience fragments). Turn off to compare
  the whole page.
- **Hide before screenshots** – cookie banners, chat/feedback widgets.
- **Include hidden text** – also compare text in closed tabs/menus (`<details>` accordions are always opened).
- **Pixel-diff tolerance** – colour delta treated as noise.

## Notes

- Uses the project's Playwright dev-dependency; no extra installs. If Chromium is missing, run
  `npx playwright install chromium` or set `CHROME_PATH`.
- The server binds to `127.0.0.1` only.
- The two pages are lined up row by row before pixels are compared, so content that only moved
  up or down is not reported as a difference.
