---
name: eds-dom-structure
description: EDS section and block DOM structure — the wrapper/container/block chain and how authored table rows become nested cell divs. Use when a CSS selector doesn't match, you need to know where EDS places blocks in the DOM tree, or you need to look up an EDS platform feature in the official aem.live docs.
---

Blocks are NOT children of the section's inner `<div>`. They're **siblings** at the section level, each in their own `-wrapper > -container > .block` chain.

## DOM tree
```
main > .section.{block}-container
  ├── .default-content-wrapper        ← h1, p, links
  ├── .{block}-wrapper                ← full-width shell
  │     └── .{block}-container        ← max-width constraint
  │           └── .{block}.block      ← element passed to decorate()
  └── .section-metadata               ← consumed at build → classes on .section
```

## Selector cheat sheet
| Target | Selector |
|--------|----------|
| Default content | `main > .section > .default-content-wrapper` |
| Block wrapper | `main > .section > .{block}-wrapper` |
| Adjacent wrappers | `[class$="-wrapper"] + [class$="-wrapper"]` |
| Block root in decorate() | `block` argument (already the `.block` element) |

## Block table inner DOM (multi-cell rows)
Inside the `.block` element, EDS transforms authored table rows into nested divs:
```
.block > div (row 1)
  ├── div (cell 1)
  └── div (cell 2)
.block > div (row 2)
  └── div (single cell)
```
For a single-row block with N cells the columns are `.block > div > div:nth-child(1..N)`.

## Pitfalls
- `.section.{block}-container` is on the **section**, not the block — confusing naming.
- Section metadata disappears from the DOM after decoration — only its classes remain on `.section`.
- Never add `{block}-wrapper` / `{block}-container` classes in JS — reserved by EDS.
- EDS wraps `<img>` in `<picture>` only when the img is a direct child of a `<div>` — detect both: `el.querySelector('picture') || el.querySelector('img')`.
- AEM CLI serves the main page from the remote origin — local `.plain.html` edits only show at `localhost:3000/path.plain.html`, not `localhost:3000/path`.

## EDS docs lookup
```bash
curl -s https://www.aem.live/docpages-index.json | jq -r '.data[] | select(.content | test("KEYWORD"; "i")) | "\(.path): \(.title)"'
```
Or Google `site:www.aem.live <query>`.

See also: `css-specificity-eds` (why selectors don't apply), `vertical-spacing-system` (block spacing), `full-width-escape-hatch` (the container chain).
