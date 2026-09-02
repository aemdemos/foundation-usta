# USTA Foundation → Edge Delivery Services — Migration Log

> **Purpose:** a running, date-ordered record of what we're migrating, where we are, what's done,
> and what's still open. **Read this first.** **Keep it updated as you go** (newest dated entry at
> the bottom). Append an entry whenever you build/change a block, template, or section, or solve
> something non-obvious.

---

## 1. What we're doing

Migrating **https://www.ustafoundation.com/en/home.html** to **Adobe Edge Delivery Services** with
**visual + functional parity across mobile, tablet, and desktop**. Source is an **AEM-classic** site
on **Bootstrap 3** (served via `/etc.clientlibs/…`).

- **Repo / environments:** `main--foundation-usta--aemdemos`
  - Preview: `https://main--foundation-usta--aemdemos.aem.page/`
  - Live: `https://main--foundation-usta--aemdemos.aem.live/`
  - Local dev: `http://localhost:3000`

## 2. Design system (discovered up front)

- **Breakpoints:** `768 / 992 / 1200` — `tools/quality/breakpoints.json`. → `responsive-breakpoints`
- **Grid / units — full deep-dive: [`docs/source-css-system.md`](docs/source-css-system.md).**
  Bootstrap 3: 12-col, **30px gutter**, container **720 / 970 / 1170 (–1200) px** at 768/992/1200.
  **Pixel-first** (~13.4k px vs ~73 rem; root 10px). Spacing scale 4/6/8/10/12/15/16/20/24/30/40px.
  Author block CSS in **px** to match; match by **column span**. → `grid-system`
- **Fonts:** COMPLETE — every face the source uses is self-hosted, in the source's own formats.
  **Graphik** (brand: Regular 400 / Semibold 600 / XXCond Bold 700) wired to `--body/--heading-font-family`;
  secondary source faces **Inter / Barlow Condensed / Anton** self-hosted (`fonts/`, `styles/fonts.css`) —
  wire per component where the source uses them. ⚠️ Graphik proprietary — confirm licensing.
- **Type scale:** recorded in `tools/quality/typography.json` (fonts done; per-breakpoint `scale`
  pending the Playwright `discover:typography` pass). → `typography-system`

## 3. Templates / 4. Sections / 5. Blocks
_TODO — fill per template/section/block as they land (see IMPORTING-GUIDE if importing)._

## 6. Open items / TODO
- [ ] Capture + enforce the type scale (see ▶ steps below).
- [ ] Wire the shared grid (`--grid-gap:30px`, `.container-max`, `.grid-*`) into `styles.css` per `docs/source-css-system.md`.
- [ ] Confirm Graphik licensing before publishing.
- [ ] Run `npm run check:overflow` + `npm run check:typography` once deps + dev server are up.

---

## ▶ Typography validation — steps (LLM: run these to close the font-size gap)

Font family/files are matched; per-breakpoint **font sizes** (`h1..h6`/body) are **not yet verified**
(`typography.json` `scale` is empty → `check:typography` skips). Once the project is loaded:

1. `npm install` (Playwright + Chromium) and `npx aem up` (localhost:3000).
2. `npm run discover:typography -- https://www.ustafoundation.com/en/home.html --write` — captures the
   source's computed `h1..h6`/body size/line-height/weight/family at every breakpoint. Review, then rely on it.
3. `npm run check:typography` — fix the `:root` size tokens in `styles/styles.css` to match, re-run
   until green. Step type at every breakpoint (768/992/1200), and remember the source is **px-first**.
4. Record the final scale here; re-run `npm run lint` + `npm run check:overflow`.

If `discover:typography` is bot-blocked, add a browser User-Agent to `tools/quality/typography-discover.mjs`.

---

## Log (newest at the bottom)

### 2026-08-28 — guardrail sync + CSS/grid deep-dive + typography
- **Synced usta to the latest EDS guardrail:** added the Grid Rule + `grid-system` skill +
  `overflow-sweep` (`check:overflow`); the Typography Rule + `typography-system` skill +
  `typography-discover`/`typography-check` (`discover:typography`/`check:typography`); the
  Migration-Log Rule + this log; the Content-Import Rule + `content-import` skill (earlier). Refreshed
  `AGENTS.md`, `package.json`, `skills/README.md`, `quality-tooling`. Preserved `breakpoints.json`.
- **CSS/grid deep-dive** of ustafoundation.com → **[`docs/source-css-system.md`](docs/source-css-system.md)**:
  Bootstrap 3, 12-col/30px-gutter, container 720/970/1170(–1200), **pixel-first** (root 10px),
  spacing scale. Recorded a `grid` block in `breakpoints.json`.
- **Fonts:** confirmed the source's brand font is **Graphik** (already self-hosted + wired — correct).
  Self-hosted the remaining secondary source faces **Inter / Barlow Condensed (R+B) / Anton** so the
  full source set is present; **removed the 4 unused Roboto** files + faces. Recorded all in
  `typography.json`. Type-scale `scale` still pending the Playwright discover pass.
