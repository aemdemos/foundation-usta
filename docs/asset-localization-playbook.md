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
