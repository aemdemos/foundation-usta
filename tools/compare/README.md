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

### Difference review (default view of a page)

Summary cards (total / high / medium findings, page height) and three views:

- **Side by side** – original and EDS screenshots with numbered `01`, `02`… boxes around every area
  that differs, coloured by priority (red high, orange medium, blue low; low is hidden until you tick
  *Show low priority*). Each box is drawn on both pages at its own position. Click a box, or use
  **‹ Prev / Next ›**, to read what differs. The view zooms (50–200%) and switches width (375/768/1440…).
- **Overlay** – blend (opacity), swipe, or heatmap (red = differing pixels, blue = rows only on EDS).
- **Findings list** – every finding with priority, type, where it was found and a **View** button.

Findings combine the visual areas with located content differences (missing/changed/extra text,
headings, links, broken images / missing alt). Rows in the Issues, Text, Headings and Links tabs
have a **📍 Show** link that opens the screenshot at that finding.

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
