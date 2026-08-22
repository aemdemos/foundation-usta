---
name: debug-block-decoration
description: Debug a block whose decorate() JS emits wrong DOM — missing, partial, or duplicated items — even though the authored content is correct. Use when content is right in the editor but the rendered block drops items, or a block renders differently across environments. Trigger phrases "only shows one", "missing items", "only the first image", "block not rendering items", "works on prod but not local". NOT for styling/visual mismatch (use css-specificity-eds).
---

Block shows partial/no content despite correct authored content → the bug is in the `decorate()` JS selector logic. **Read the code first — don't theorize about CDN/auth/pipeline.**

## Recipe
1. **Inspect the served, decorated DOM** for that block (not the source HTML). Use a real preview route that injects the EDS runtime — confirm with `curl -s <url> | grep aem.js`. The bare `http://localhost:3000/` does NOT decorate blocks; use the content path.
2. **Read the block's `decorate()`** — usually under 50 lines. Read it before anything else.
3. **Compare what the JS selects against what the DOM contains:**
   - `querySelector()` → returns the **FIRST** match only. `querySelectorAll()` → all.
   - `el.querySelector('img')` on a `<p>` with 12 images → returns only image #1. **#1 cause of "only one item shows".**
   - `:scope > *` → only direct children; misses items EDS nested inside `<p>`.
4. **Fix the selector.** Safe pattern for collecting all images:
   ```js
   const items = [];
   cell.querySelectorAll('img, picture').forEach((el) => {
     if (el.tagName === 'PICTURE') items.push(el);
     else if (!el.closest('picture')) items.push(el);
   });
   ```
5. **Verify** on the live preview that all items now render (`verify-before-claiming`).

## Pitfalls
- Never modify content files to work around a JS bug — if the content is correct in the editor, the block code is wrong.
- Never hardcode fallback URLs in block JS — masks bugs, creates debt.
- Don't propose a second theory before reading `decorate()`. Read the code first.
- Same block renders differently across environments but the JS/CSS/`.plain.html` are byte-identical (`md5sum`) → it's a **stale CDN/proxy cache**, not a code bug. Hard-reload the resource before changing anything.

See also: `eds-dom-structure` (block DOM nesting), `verify-before-claiming` (confirm the fix on the live URL).
