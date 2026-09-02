---
name: quality-tooling
description: The project's deterministic quality checkers under tools/quality/ and tests/a11y/ — what each one checks, how to run it, and how to extend it. Use when verifying a CSS/JS/UI change before claiming done, auditing code against best practices, or adding a new mechanical rule. These enforce the Executable-Rule Rule — run the checker, don't rely on memory.
---

Checkable rules live in **scripts, not memory**. A rule with a threshold or an exact pattern (a breakpoint value, missing alt text) is enforced by a deterministic checker that returns pass/fail — the skill explains the *why* and the *fix*, the script owns the *check*. Run the relevant checker before any completion claim (`verify-before-claiming`).

## The checkers

| Checker | Command | What it enforces | Rule / skill |
|---------|---------|------------------|--------------|
| **breakpoint-check** | `node tools/quality/breakpoint-check.mjs [files]` | Media queries use only the breakpoints recorded in `tools/quality/breakpoints.json` (the source site's set; defaults 600/900/1200), `min-width` only; no `max-width`; no stray widths | The Breakpoint Rule · `responsive-breakpoints` |
| **overflow-sweep** | `npm run check:overflow [url]` | Loads every page in `a11y.config.js` (or one URL) at the mobile baseline + each breakpoint + wide desktop; **fails on horizontal page overflow** — the tell-tale of content that escaped its grid column. Needs the dev server up | The Grid Rule · `grid-system` |
| **typography-check** | `npm run check:typography [url]` | Loads every page in `a11y.config.js` (or one URL) at each breakpoint; **fails if computed h1..h6/body font-size, line-height, weight, or family drift** from the source record in `tools/quality/typography.json`. Skips cleanly until the scale is discovered. Needs the dev server up | The Typography Rule · `typography-system` |
| **a11y test (single page)** | `npm run test:a11y <url>` | WCAG 2.0–2.2 A+AA via axe-core against ONE rendered page; **fails on missing alt text**, contrast, ARIA, heading order | The Alt-Text Rule · `accessibility` |
| **a11y sweep (all pages)** | `npm run test:a11y:all` | Same checks across EVERY URL in `tests/a11y/a11y.config.js`; clean per-page ✓/✘ report | The Alt-Text Rule · `accessibility` |
| **a11y nav states** | `npm run test:a11y:nav [url]` | Opens the mobile hamburger + expands desktop nav, then runs axe — interactive states the page-load scan misses | `nav-header-eds` |
| **lint** | `npm run lint` (`lint:fix` to auto-fix) | ESLint (Airbnb) + Stylelint standard — style, `.js` import extensions, scoped selectors | `eds-code-conventions` |

## Recipe (run before "done")
1. **Any CSS change** → `node tools/quality/breakpoint-check.mjs` (scans `blocks/**/*.css` + `styles/*.css`; pass specific files to scope it).
2. **Any section/content-width or layout change** → start the dev server (`npx aem up`), then `npm run check:overflow http://localhost:3000/<the-page-you-changed>` — confirms the change didn't push content past its grid column (no horizontal overflow).
3. **Any typography or global-CSS change** → with the dev server up, `npm run check:typography http://localhost:3000/<the-page-you-changed>` — confirms h1..h6/body still match the source scale at every viewport.
4. **Any UI change** → start the dev server (`npx aem up`), then `npm run test:a11y http://localhost:3000/<the-page-you-changed>` — **just the page you touched**, not the whole site.
5. **Any header/nav change** → also `npm run test:a11y:nav <url>` (the page-load scan misses open-menu states).
6. **Any code change** → `npm run lint`.
7. A non-zero exit = a real violation. Read the output, fix per the named skill, re-run until green. Never loosen a checker to make it pass.

## Per-page check vs. full-site sweep — don't confuse them
Two different jobs with two different triggers:
- **Per-page (the gate, auto-run before "done"):** `npm run test:a11y <url>` against the single page you're working on. This is what fires while instrumenting a block or styling a page. **Never run the full sweep just because you edited one block** — it's slow and surfaces unrelated failures.
- **Full-site sweep (a deliberate audit, human-triggered):** `npm run test:a11y:all` scans every URL in `a11y.config.js` and prints a clean per-page report. There is **no automatic trigger** for this — run it at a milestone: **before a release, after a change to `styles.css` or global JS that affects every page, or after a bulk import.** Keep `a11y.config.js`'s `urls[]` current — a page not listed is never swept.

## Two enforcement points
- **Local (agent + you):** the commands above, run before claiming done or to audit.
- **CI (PR):** `.github/workflows/a11y.yml` re-runs the a11y test on every PR; branch protection blocks the merge on failure. CI is the one gate nothing can forget — but it's human-owned setup (the agent doesn't run git).

## Adding a new checker
1. Write a `.mjs` under `tools/quality/` that exits non-zero on violation and prints `file:line  message`.
2. Give the rule a stable ID (`<!-- rule:xxx -->`) in the skill that owns it; point that skill at the command.
3. Add a row to the table above and (if it should gate PRs) a step to a CI workflow.

## Pitfalls
- **Claiming done without running the checker** → the rule was documented but not verified; violations ship. Run it.
- **Editing the checker to silence a failure** → defeats the purpose. Fix the code, not the check.
- **a11y test on a stopped dev server / wrong URL** → the run errors on load. Confirm the page is reachable first.

See also: `verify-before-claiming` (the protocol that invokes these), `responsive-breakpoints` and `accessibility` (the rules these enforce), `writing-skills` (push checkable rules down to scripts).
