# Asset Localization Playbook (cross-repo / external images → local media-da)

Use this when migrated `.plain.html` pages reference images that live on a
different repo or an external site (e.g. `https://main--OTHER--OWNER.aem.live/media_<hash>.jpg`,
`https://source-site.com/.../hero.jpg`, or a CDN like `ucarecdn.com`), and you
need those images downloaded locally so they render in the preview window —
while keeping DA uploads clean (only the `.plain.html` goes to DA; media stays
local).

## The model (why this works)

- The dev server serves the `content/` folder at the site root. So a file at
  `content/media-da/{page}/foo.jpg` is served at `/media-da/{page}/foo.jpg`.
- The `.plain.html` references images by that same relative path → they render
  in preview because the file physically exists under `content/media-da/`.
- `content/media-da/` is a **LOCAL-ONLY** staging folder. On DA upload you push
  only the `.plain.html` docs; the media-da folder "goes away" on the DA side
  (DA does its own publish-side media handling).

### Two serving paths — remember the split

| What | Served from | Note |
|------|-------------|------|
| Image files under `content/media-da/…` | Local files (dev server) | This is what makes previews show images |
| `.plain.html` docs | The preview/DA backend, not your local file | Local doc edits don't appear in preview until synced to DA |

## Non-negotiable rules

1. **Storage location.** Download every image to
   `content/media-da/{page}/media-{sha1}-{first8}.{ext}`
   - `{page}` = the doc slug (`index`, `nav`, `footer`, `drafts/block-samples/cards-expand`, …)
   - `{sha1}` = SHA-1 of the downloaded bytes; `{first8}` = first 8 chars of that sha1
   - Wrong folder (e.g. `tools/…`, `drafts/…`) ⇒ 404. Only `content/media-da/…` is served.
2. **Reference form.** In the `.plain.html`, set both `<source srcset>` and
   `<img src>` to the **same** relative path
   `/media-da/{page}/media-{sha1}-{first8}.{ext}`.
   Do NOT use `https://content.da.live/{org}/{repo}/.{page}/…` — that absolute
   form makes the DA editor treat the image as external and re-localize it
   (appends a 3rd hash like `-f368a54f`), which breaks it (`about:error`).
3. **Never upload `content/media-da/` to DA.** Push only the `.plain.html`. DA
   handles publish-side media itself.
4. **Only rewrite `<img>`/`<source>` image URLs.** Leave `<a href>` page links
   alone — internal-link rewriting is a separate concern, and genuinely-external
   links stay absolute.
5. **Never hand-upload media to DA or precompute DA's own hash names.** DA's
   hashing can't be reproduced offline and fighting the editor is what caused
   every earlier break. Keep media purely local; let DA localize on its side.

## The tool

`tools/assets/localize-assets.mjs` implements this playbook. It is idempotent —
an already-local `/media-da/…` ref is skipped; re-running never duplicates or
corrupts anything.

```bash
# one or more docs (path relative to content/, with or without .plain.html):
node tools/assets/localize-assets.mjs drafts/block-samples/cards-expand

# every block-sample page, then verify each local ref serves 200:
node tools/assets/localize-assets.mjs --all-samples --verify
```

Steps the tool performs, matching the playbook:
1. Scan the target `.plain.html`; extract unique external image URLs (src+srcset).
2. Download each with a browser-like UA/Referer; verify each is a real image
   (content-type + byte size), not an error page.
3. Compute `media-{sha1}-{first8}.{ext}`; write to `content/media-da/{page}/`.
4. Rewrite the `.plain.html` so `src` AND `srcset` use the relative
   `/media-da/{page}/<name>`. Zero original hotlinks should remain.
5. With `--verify`, curl each local ref against the dev server (expect 200) and
   report a per-page table: page | #images | downloaded | all-serve-200? | leftover-hotlinks.

## Gotchas

- The dev server serves `.plain.html` from the PREVIEW/DA backend, NOT the local
  file; local doc edits show only after DA sync. But local `content/media-da/`
  IMAGES serve directly — that's what makes them appear in preview.
- If the source 403s a plain `curl`, use a browser-like UA + Referer (the tool
  already does). Some sites need a headless browser; escalate only if needed.
- Large source SVGs/PNGs stay in `media-da` as-is (local-only staging, not
  committed `icons/`), so `check:svg` does not apply — but note anything heavy in
  `MIGRATION.md` so it can be optimized before any production use.

---

# Document Localization (PDFs / Office docs → content/assets/docs + absolute aem.live href)

DOCUMENTS are handled by the sibling tool `tools/assets/localize-docs.mjs`, and
their model is the **opposite** of images. Images are local-only staging
referenced by a *relative* `/media-da/…` path and are **never** uploaded to DA.
Documents (PDF, doc(x), xls(x), ppt(x), csv, txt, rtf) are real downloadable
assets that must be **served from the site**, so they:

1. Download to `content/assets/docs/{preserved-path}` — the source DAM path with
   the leading `/content/dam/{tenant}/` stripped, so readable folders are kept
   and colliding basenames stay distinct (`annual-reports/2023.pdf` vs
   `irs-990/2023.pdf` vs `audited-financial-statements/2023.pdf`). No hash names —
   unlike images, docs keep their human-readable path.
2. Have every `<a href>` pointing at that doc rewritten to the **ABSOLUTE**
   production URL `https://main--{repo}--{owner}.aem.live/assets/docs/…` (the base
   is derived from the git remote; override with `--base`). Only `<a href>` links
   to document extensions are touched — page links, anchors, and `mailto:` are
   left alone.
3. Are **uploaded to DA** alongside the `.plain.html` (outward-facing → on
   request). `content/assets/docs/` is git-ignored like the rest of `content/`.

```bash
# localize the doc links on a page (base auto-derived from git remote):
node tools/assets/localize-docs.mjs en/home/who-we-are/financials

# verify each local ref serves 200 from the dev server:
node tools/assets/localize-docs.mjs en/home/who-we-are/financials --verify
```

Idempotent: an href already pointing at `…aem.live/assets/docs/…` (or an
already-downloaded file) is skipped; re-running never re-downloads or corrupts.

## Uploading docs + the page to DA (outward-facing → on request)

Two-step publish, both via the DA source API + the aem.hlx.page admin API
(credentials auto-injected — never pass a token):

```bash
ORG=aemdemos/foundation-usta

# 1. Upload each doc to the DA SOURCE, preserving its assets/docs/… path:
find content/assets/docs -name '*.pdf' | while read f; do
  curl -s -X POST -F "data=@$f;type=application/pdf" \
    "https://admin.da.live/source/$ORG/${f#content/}" -o /dev/null -w "%{http_code} ${f#content/}\n"
done   # expect 200/201

# 2. Preview + publish each doc so it resolves on the live host:
find content/assets/docs -name '*.pdf' | while read f; do p="${f#content/}"
  curl -s -X POST "https://admin.hlx.page/preview/aemdemos/foundation-usta/main/$p" -o /dev/null -w "prev %{http_code} $p\n"
  curl -s -X POST "https://admin.hlx.page/live/aemdemos/foundation-usta/main/$p"    -o /dev/null -w "live %{http_code} $p\n"
done

# 3. Upload the PAGE — but WRAP it in <body><main> first (see gotcha), then preview+publish it too.
```

## Docs gotchas

- **DA needs `<body><main>` wrapping.** The local `.plain.html` files are bare
  `<div>…` fragments. DA's HTML→markdown conversion produces an EMPTY page (`.md`
  is 0 bytes, `.plain.html` ~13 bytes, links vanish) if you POST the raw fragment.
  ALWAYS wrap before uploading a page to the DA source:
  `printf '<body><main>' > t.html; cat page.plain.html >> t.html; printf '</main></body>' >> t.html`
  then POST `t.html`. (aem-import-helper's `wrapHtmlContent` does exactly this.)
  Do NOT rewrite the local `content/…plain.html` to add the wrapper — keep it a
  fragment; wrap only the copy you upload.
- **20 MB PDF cap on DA.** The content bus rejects PDFs >20 MB with
  `AEM_BACKEND_PDF_TOO_BIG` (409 on preview / 404 on live). Compress oversized
  PDFs first. With no ghostscript/qpdf installed, use the WASM ghostscript
  (`npm i @jspawn/ghostscript-wasm`, load via `instantiateWasm` — Node 24's global
  `fetch` breaks its default file-path loader) with `-dPDFSETTINGS=/printer`
  (300 dpi) — the USTAF 2024 annual report went **61 MB → 3.0 MB** with page
  count and image quality intact. `/ebook` (150 dpi) is smaller (2.1 MB) but
  softer; prefer `/printer` since 20 MB is generous.
- **EDS relativizes same-origin hrefs.** The absolute `…aem.live/assets/docs/…`
  href renders on the live page as a same-origin `/assets/docs/…` link — expected.
- **www host.** Source doc URLs may be `www.ustafoundation.com`; the tool
  downloads with a browser-like UA/Referer just like the image tool.
- **Serving path.** Local `content/assets/docs/…` files serve directly from the
  dev server (200, `application/pdf`) — that's how you preview them. In
  production they resolve from `/assets/docs/…` once uploaded + published to DA.
