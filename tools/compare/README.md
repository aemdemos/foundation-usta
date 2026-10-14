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
| **Visual** | Full-page screenshot of both pages at each selected viewport (defaults: 375 / first project breakpoint / 1440). Pixel diff with above-the-fold and full-page mismatch %, differing regions, page height and horizontal overflow. Viewer modes: side-by-side, swipe, overlay, diff map. |
| **Text** | Visible text split into blocks, aligned with an LCS diff → missing / changed (word-level highlight) / extra / regrouped (same text split into different paragraphs). Overall word similarity. |
| **Headings** | Outline side by side, missing/changed headings, level changes, heading-hierarchy problems. |
| **Links** | Matched on normalised destination (host, `.html`, trailing slash ignored; documents by file name). Missing, extra, different target, different #anchor, EDS links still pointing at the original domain. Optional HTTP status check of every EDS link. |
| **Images & media** | Image count, thumbnails, broken images, missing `alt`, alt texts not carried over, background images, video/iframe embeds, forms. |
| **Metadata** | Title, description, og/twitter tags, canonical, robots, `lang`, JSON-LD. |
| **Typography** | Computed font family/size/weight/line-height/colour/letter-spacing for body, h1–h6, p, a, li at every viewport. |
| **Console & network** | JS errors and failed requests on both pages. |

### Change markers

Every located difference is drawn on the screenshots as a **numbered, colour-coded box**:
red = missing on EDS, orange = changed, blue = extra on EDS, purple = broken image / no `alt`.
Side by side shows each box on the page where it lives (both pages for a change). Swipe, overlay
and diff map show the EDS position, plus a dashed box for items that exist only on the original.
The panel next to the screenshots lists the changes for the current viewport (filter by type).
Click a box or a list item to jump to it. Rows in the Issues, Text, Headings and Links tabs have a
**📍 Show** link that opens the screenshot at that change. Positions are measured at every viewport,
so a change is marked wherever the element is rendered.

Each pair gets a **parity score** (text 30%, visual 20%, links 15%, headings / images / typography
10% each, metadata 5%), an auto status (Pass ≥ 90 with no errors, Needs review ≥ 75, Fail),
and a prioritised **issue list**. Add your own **verdict + notes** per page in the *Review notes* tab.

## Reports

From a finished run:
- **Download report (HTML)** – single self-contained file (screenshots embedded), opens offline, shareable.
- **Report without screenshots** – same, much smaller.
- **Issues (CSV)** – one row per issue incl. your verdict/notes, for spreadsheets/Jira.
- **Raw data (JSON)**.

Runs are saved in `tools/compare/reports/<run-id>/` (git-ignored) and listed under **History**.

## Options (Advanced)

- **Main content only** (default) – compares `<main>` on EDS and the original's `<main>`/`<body>`
  minus header/footer selectors (pre-filled for this site's AEM experience fragments). Turn off to compare
  the whole page.
- **Content root selectors** – override when the original's content lives in a specific container.
- **Hide before screenshots** – cookie banners, chat/feedback widgets.
- **Include hidden text** – also compare text in closed tabs/menus (`<details>` accordions are always opened).
- **Pixel-diff tolerance** – colour delta treated as noise.

## Notes

- Uses the project's Playwright dev-dependency; no extra installs. If Chromium is missing, run
  `npx playwright install chromium` or set `CHROME_PATH`.
- The server binds to `127.0.0.1` only.
- Full-page pixel diffs cascade once content shifts vertically — judge with the above-the-fold %
  and the swipe/overlay views.
