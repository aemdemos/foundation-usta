---
name: security
description: Client-side security rules for this EDS project — no secrets, no dynamic code, validate external input, sanitize injected HTML with DOMPurify. Use when injecting author/external HTML via innerHTML, handling user/API/URL input, adding configuration, or anytime a change could commit a secret or execute dynamic code. Reflects Adobe generic security guidance.
---

All code here ships to the public web unminified — treat everything client-side as visible to anyone. Apply defense-in-depth, least privilege, and fail-securely by default.

## The Security Rule (non-negotiable)
- **Never commit secrets** — API keys, passwords, tokens. There is no server; a "hidden" key in client code is public. Use `.hlxignore` to exclude files from being served.
- **Never execute dynamic code** — no `eval`, no `new Function(...)`, no `setTimeout("string")`. There is no legitimate need in a block.
- **Validate all external input** — user input, URL/query params, API responses, `postMessage` data. Never feed untrusted input straight into DOM sinks, URLs, or `fetch` targets.
- **Sanitize injected HTML** — any author-provided or external HTML written via `innerHTML` MUST pass through DOMPurify first. Prefer `textContent` / `createElement` when you don't need markup. <!-- rule:sec-sanitize-html -->
- **Never log** credentials, tokens, or personal data.

## Recipe
1. **Building DOM from data?** Default to `textContent` and `document.createElement`. Reach for `innerHTML` only when you must render authored markup.
2. **Must use `innerHTML` with author/external content?** Sanitize:
   ```js
   // load DOMPurify once (lazy) and sanitize before inserting
   el.innerHTML = DOMPurify.sanitize(rawHtml);
   ```
3. **Consuming a URL/param/API value?** Validate shape and allow-list before use (e.g. check the origin of an embed URL against a known list; parse+range-check numbers).
4. **Adding a dependency?** Don't — this project is zero-runtime-deps. If a dev tool is truly needed, keep it in `devDependencies` and keep dependencies current.

## Pitfalls
- **`element.innerHTML = authoredString`** → DOM XSS if the string contains a `<script>`/`onerror` payload. Sanitize or use `textContent`.
- **Trusting an embed/redirect URL param** → open-redirect / SSRF-style abuse. Allow-list known hosts.
- **A config "secret" in block JS** → it's shipped to every visitor. There are no client-side secrets.

See also: `accessibility` (both are pre-completion gates), `eds-code-conventions` (no-build / dependency rules).
