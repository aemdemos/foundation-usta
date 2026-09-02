---
name: grid-system
description: The shared section/content-width grid for this lift-and-shift migration project — reproduce the SOURCE SITE's one 12-column grid (column spans, a single --grid-gap, shared .grid-12/.grid-col-* utilities), never bespoke per-block percentages. Use when setting section or content width, aligning two sections, discovering the source grid at the start of a migration, or tempted to write width:52%;margin-left:25%. Enforced by tools/quality/overflow-sweep.mjs (npm run check:overflow).
---

This is a **lift-and-shift migration** to AEM Edge Delivery. Section and content width must come from **ONE shared grid adopted from the source site**, not ad-hoc widths invented per block. Almost every source site lays every page on a single grid (typically 12 columns, a fixed container max-width, a fixed side gutter, and one column gap) and positions content by **column span**. Reproduce that grid once, then every section snaps to the same lines across all viewports. → The Grid Rule (AGENTS.md)

## Decide once, per migration (discover the source grid up front)

Do this **once**, alongside breakpoint discovery (`responsive-breakpoints`), from the **live rendered DOM** (computed styles) of a couple of representative pages — homepage first. Measure and record:

1. **Container** → max content width and the side gutter *at each breakpoint*.
2. **Grid** → column count (usually 12) and the column **gap**.
3. **Common spans** → which columns content actually sits on (e.g. an intro at `col-4-9`, a body row at `col-2-11`), and how those spans change per breakpoint.
4. **Confirm the lines** → check that breadcrumb, hero, and a couple of body sections all align to the same grid lines. If they do, that's your grid.

Record it centrally: store the gap as **`--grid-gap`** on the centered container in `styles.css`, and build the shared **`.grid-12` + `.grid-col-*`** utilities (or equivalent `grid-column` spans). This is now the single source of truth for width — never re-derived per block.

## Applying the grid (any block/section)

1. Put the section on the grid and set width by **column span**, not pixels/percentages:
   ```css
   /* shared utilities in styles.css — reused everywhere */
   .grid-12 { display: grid; grid-template-columns: repeat(12, 1fr); gap: var(--grid-gap); }
   .grid-col-4-9 { grid-column: 4 / 10; }   /* intro sits columns 4–9 */
   .grid-col-2-11 { grid-column: 2 / 12; }  /* body row sits columns 2–11 */
   ```
2. **Two sections that should align MUST use the same span.** If two indented bands look misaligned, give them the same `.grid-col-*`, don't nudge one with a bespoke margin.
3. **Full-bleed is the only sanctioned exception.** To stretch a block to the viewport edge(s), use the generic, block-agnostic section styles **`full-width` / `full-width-left` / `full-width-right`** (see `full-width-escape-hatch`) — never `!important` on a wrapper. A block's *own* internal layout (e.g. `columns.media-left/right`) stays inside the block.
4. Run the checker after any layout/width change: `npm run check:overflow` (dev server up). It loads every page in `a11y.config.js` at the mobile baseline + each breakpoint + wide desktop and **fails** on any horizontal page overflow — the tell-tale of a child that escaped its column. <!-- rule:grid-standard -->

## Pitfalls
- **Bespoke widths** (`width: 52%; margin-left: 25%`) → the exact anti-pattern. Two blocks that "look about right" won't share grid lines and drift apart across breakpoints. Use a `.grid-col-*` span.
- **Per-block grid gaps** → the gap is one global `--grid-gap`; redefining it per block breaks alignment between sections.
- **Reaching for `!important` / a full-bleed hack** → use the `full-width*` section styles instead (`full-width-escape-hatch`).
- **A fixed-width child causing sideways scroll** → `img`, tables, `pre`, or a `min-width` child wider than its column overflows the page; `check:overflow` catches it. Constrain the child (`max-width: 100%`), don't widen the column.
- **Deciding the grid per page** → measure the source grid once, record `--grid-gap` + the utilities, and reuse. If it's wrong, re-measure and update centrally.

See also: `responsive-breakpoints` (the breakpoints the spans switch at), `full-width-escape-hatch` (the sanctioned full-bleed exception), `vertical-spacing-system` (section rhythm), `quality-tooling` (the checker that enforces this).
