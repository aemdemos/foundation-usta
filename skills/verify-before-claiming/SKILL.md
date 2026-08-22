---
name: verify-before-claiming
description: The completion protocol — never claim done without verifying. Load ALWAYS before writing "done", "fixed", "implemented", or any similar completion claim.
---

**Never claim work is complete without checking it first.** "It should work" is not "it works." Bracket every task: open by restating the request as concrete, checkable success criteria; close by verifying each one actually passes.

## Recipe (run before any completion claim)
1. **Restate success criteria** — what, concretely, does "done" mean for this task?
2. **Lint:** `npm run lint` — zero errors.
3. **Breakpoints (any CSS change):** `node tools/quality/breakpoint-check.mjs` — passes.
4. **Accessibility (any UI change):** `npm run test:a11y http://localhost:3000/<path>` — no critical/serious violations (this is where missing alt text is caught).
5. **Visual:** confirm the change at `localhost:3000` (screenshot to `/tmp/` if needed).
6. **Review the diff** — remove dead code, leftover attempts, stray `console.log`.
7. **Report honestly** — if a check failed or a step was skipped, say so with the output. Don't hedge a real pass; don't claim an unverified one.

## Pitfalls
- **"Done" before running the a11y test** → missing alt text / contrast failures ship. Run it.
- **Claiming a fix from reading code alone** → verify at runtime; decoration behaves differently than the source HTML suggests.
- **Silent skips** → if you couldn't run a check (no dev server, no preview URL), state that explicitly rather than implying it passed.

See also: `quality-tooling` (what each checker does + how to extend), `accessibility`, `responsive-breakpoints`, `eds-code-conventions` (the checks this protocol runs).
