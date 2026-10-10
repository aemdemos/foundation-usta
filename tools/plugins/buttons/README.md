# Buttons panel for DA / Experience Workspace — setup from scratch

A step-by-step guide to adding the **Buttons** panel to any Edge Delivery (EDS) project authored in DA
(da.live). It is written to be copied to other projects. Reference implementation: `aemdemos/foundation-usta`
(branch `buttons-plugin`).

**What authors get**
- A **Buttons** panel in the DA editor (listed under **Extensions** in the library).
- A gallery of button designs. The author picks one, then sets the text, link, button colour, text colour and
  "Open in a new tab", with a live preview, and clicks **Insert button**.
- Select an existing button first and the panel opens on it, pre-filled. **Update button** replaces it.
- The panel stays open after inserting, until the author closes it.
- In the canvas **Layout** view, a button keeps its look (style, colours, options text hidden) while it is being
  edited — in default content and inside any block.

**How it works (one sentence):** the panel inserts plain formatted markup (bold / italic / sub / sup / underline +
an optional `[color="…"]` suffix), and the site's `decorateButtons()` turns that into a styled `a.cta-button`.
No new block, no DA customisation beyond registering the plugin.

---

## 0. Prerequisites

- An EDS project based on `aem-boilerplate`, with content in DA (`da.live/#/{org}/{repo}`).
- Access to the DA config of the site: `https://da.live/config#/{org}/{repo}/` (to register the plugin).
- A way to push a branch (DA loads the plugin and the Layout view from a branch, never from your laptop's files).

## 1. Files

| File | Copy as-is? | What it does |
|---|---|---|
| `tools/plugins/buttons/buttons.html` | Adapt texts / link example | The panel page DA opens in an iframe |
| `tools/plugins/buttons/buttons.js` | Adapt defaults (§4) | Gallery, form, preview, insert/update via the DA SDK |
| `tools/plugins/buttons/buttons.css` | Yes | Panel UI only, Adobe Spectrum 2 look (own `--bp-*` tokens; site tokens only in the previews) |
| `styles/buttons.css` | Adapt tokens (§3) | The `cta-button` styles + the Layout-editor rules |
| `scripts/scripts.js` | Merge the functions (§2) | `decorateButtons()`, options, link targets, `previewEditingCtas()` |
| `tools/da-library-preview/*` | Optional | Cleans up `/.da/library/…` block-library previews |

Never edit `scripts/aem.js` or `head.html` for any of this.

## 2. Site code — `scripts/scripts.js`

### 2.1 The authoring contract (what the panel writes, what the site reads)

A link becomes a button only when it is the **only thing in its paragraph**.

| Markup (marks as DA stores them) | Result |
|---|---|
| `<strong><em><a><sub>Label</sub></a></em></strong>` (bold + italic + subscript) | `a.cta-button.cta-blue` |
| bold + italic + superscript | `a.cta-button.cta-black` |
| bold + italic + underline | `a.cta-button.cta-outline` |
| bold only + superscript | `a.cta-button.cta-dark` |
| plain link | stays a link |

Options go in square brackets at the end of the paragraph and are removed from the label:
`Donate [style="outline", color="#e87722", text-color="#fff", new-tab="true"]`
- `style` = `blue | black | dark | outline` (wins over the mark).
- `color` / `text-color` = any CSS colour or a site token name (`brand-orange`). If only `color` is set, the text
  colour is black or white, whichever has more contrast.
- `new-tab` = `true | false`. The panel writes a new tab as `#_blank` at the end of the URL instead.

**Never use strikethrough** for a style: DA stores a `<del>` as the literal text "<del>" and the button breaks on
the next save. Subscript, superscript and underline survive DA and the aem.page pipeline.

### 2.2 Code to add

Copy these from the reference `scripts/scripts.js` (they sit together, above `decorateSectionMetadata`):

- Constants: `CTA_BUTTON_STYLES`, `CTA_BOLD_ONLY_STYLES`, `CTA_OPTION_STYLES`, `CTA_OPTIONS_SUFFIX`,
  `CTA_OPTION_PAIR`, `EDITING_CTA`.
- Functions: `parseCtaOptions()`, `takeCtaOptions()`, `ctaColor()`, `contrastText()`, `ctaOptionVars()`,
  `applyCtaOptions()`, `makeCtaButton()`, `decorateButtons()` (replaces the boilerplate one), `previewEditingCtas()`.
- Link targets (for `#_blank`): `LINK_NEW_TAB_MARKER`, `INTERNAL_HOSTS`, `FILE_EXTENSIONS`, `openInNewTab()`,
  `decorateLinkTarget()`, `decorateLinkTargets()`. **Change `INTERNAL_HOSTS`** to the new site's domain and
  `--{repo}--{org}.aem.(page|live)`.

Wire them up:

```js
export function decorateMain(main) {
  // …boilerplate steps…
  decorateBlocks(main);
  decorateButtons(main); // after decorateBlocks, before blocks load → works inside every block
}

async function loadEager(doc) {
  // …
  const buttonsCssPromise = loadCSS(`${window.hlx.codeBasePath}/styles/buttons.css`);
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    // block LCP on buttons.css only when the first section has a button
    if (main.querySelector('.section:first-of-type .cta-button')) await buttonsCssPromise;
    // …
  }
}

async function loadPage() {
  decorateLinkTargets(); // before loadEager, so #_blank is stripped before decoration
  await loadEager(document);
  // …
}

loadPage();
previewEditingCtas(); // no-op unless the URL has ?quick-edit (the DA Layout view)
```

### 2.3 Block CSS that styles its own links

If a block styles every link in a cell (e.g. `.hero p > a`), exclude authored buttons so they keep their look:
`a:not(.cta-button)` or `a:where(:not(.cta-button))` (the `:where` form keeps the old specificity).

## 3. Site CSS — `styles/buttons.css`

Copy the file. Every style is driven by custom properties, so each variant only overrides what changes:
`--cta-bg / --cta-color / --cta-border` and their `-hover` versions.

**Adapt to the new site:** the tokens it uses (`--brand-blue`, `--background-color`, `--link-hover-color`,
`--dark-color`, `--text-color`, `--light-color`, `--heading-semibold-font-family`) and the sizes / radii / padding
of each style, measured from the source site.

Keep the `.prosemirror-editor …` selectors next to each `a.cta-button.*` selector (see §6 for why).

## 4. The panel — `tools/plugins/buttons/`

Copy the three files, then adapt:

- `buttons.js`
  - `DEFAULT_PRESETS` — the designs shown when there is no config sheet (name, style, label, description).
  - `DEFAULT_OPTIONS` — the colour swatches (`color`, `text-color`).
  - `STYLES` — must match `CTA_BUTTON_STYLES` / `CTA_BOLD_ONLY_STYLES` in scripts.js. If you add a style,
    add it in both places and in buttons.css.
  - `contrastText()` / `applyColors()` duplicate the scripts.js logic for the preview (scripts.js can't be
    imported: it runs `loadPage()` on import). **Keep them in sync.**
- `buttons.html` — the example path in the Link help text (`/en/home/get-involved`) and any texts (all are in
  the HTML, in `data-*` attributes, so they can be localised). Following Spectrum, the fields have no
  placeholder: hints go in the help text under the field.
- `buttons.css` — the panel follows Adobe Spectrum 2 (Adobe Clean stack, Spectrum grays and accent blue,
  light-grey panel with white field cards, side labels when the drawer is ≥ 360px wide, pill accent button).
  It needs no change per site.
- `buttons.html` links `/styles/styles.css`, `/styles/fonts.css`, `/styles/buttons.css`, so previews are the real
  buttons. If the site's global CSS styles bare elements (e.g. `header { min-height }`), reset them under
  `.btn-plugin` in `buttons.css`.

What the panel does with the DA SDK (`import('https://da.live/nx/utils/sdk.js')`):
- `actions.sendHTML(html)` — inserts the `<p>…</p>` at the cursor, or replaces the selection.
- `actions.getSelection()` — the selected HTML, parsed with `DOMParser` (inert) to pre-fill an Update.
- `actions.daFetch(…)` — reads the config sheet (§5.2) with the author's DA login.
- **Do not call `actions.closeLibrary()` after inserting** — authors want the panel to stay open.
- Outside DA the SDK never resolves. After 3 s the panel shows the defaults with Insert disabled, so it can be
  reviewed at `http://localhost:3000/tools/plugins/buttons/buttons.html`.

Security (keep it): URLs must be a relative path / `#` / `?` or `http(s)` / `mailto` / `tel` (`javascript:`,
`data:`, `//host` are rejected); colours must pass `CSS.supports('color')` or be an existing token; all text is
HTML-escaped.

## 5. DA setup (outward-facing — the site owner does this)

### 5.1 Register the plugin

At `https://da.live/config#/{org}/{repo}/`, tab **library**, add a row:

| title | path |
|---|---|
| Buttons | `/tools/plugins/buttons/buttons.html` |

Use the **relative** path: DA then loads the panel from the branch in the editor's `?ref=` (or `main`).
The panel appears in the library under **Extensions**.

### 5.2 Optional config sheet — `/.da/library/buttons`

A DA sheet (save it; it doesn't need publishing). Without it the panel uses `DEFAULT_PRESETS` / `DEFAULT_OPTIONS`
and shows a note.

Tab `presets`:

| name | style | color | text-color | label | description |
|---|---|---|---|---|---|
| Blue Button | blue | | | LEARN MORE | Standard solid blue call-to-action. |
| Orange Outline | outline | #e87722 | | DONATE | Outline in brand orange. |

`style` = `blue | black | dark | outline | link`.

Tab `options`:

| key | values |
|---|---|
| color | `Brand blue=#0373f3 \| Orange=#e87722` |
| text-color | `White=#ffffff \| Black=#000000` |

A sheet with a single tab is read as `presets`.

### 5.3 Optional extras

- A block-library entry `/.da/library/blocks/buttons` with one example per style (for authors who prefer
  copy/paste) and an author-facing sample page (e.g. `/drafts/block-samples/buttons`).

## 6. Experience Workspace Layout view (ProseMirror) — why the extra CSS/JS is needed

**How Layout works:**
- The canvas Layout view loads the page in an iframe:
  `https://{ref}--{repo}--{org}.preview.da.live/{path}?quick-edit=on&controller=parent`.
- After every change DA replaces `document.body` and runs our `loadPage()` again, so buttons are decorated.
- When the author **clicks a paragraph** (or after an insert, when DA refocuses), DA replaces that element with
  its inline editor: `div.prosemirror-editor > div.ProseMirror > p`. That paragraph shows the **raw** marks
  (`<em><strong><a><sub|sup|u>`, in ProseMirror's order: `em > strong > a > sub|sup|u`) and the `[options]` text,
  until the next full re-render or a refresh.

**Without the fix:** the button turns into a small italic link with `[color="…"]` after it, in the default colour.

**The fix (central — no per-block changes):**
1. `styles/buttons.css`: each style rule also targets the raw editor link, e.g.
   `.prosemirror-editor em > strong > a:has(> sub)`; the inner mark is reset to normal text
   (`.prosemirror-editor strong > a > :is(sub, sup, u)`); the base rule has `font-style: normal`.
2. `previewEditingCtas()` (only with `?quick-edit`):
   - A `MutationObserver` on `body`, batched per animation frame, with a `WeakMap` cache per editor (by
     `innerHTML`) so it only re-parses when the editor content changes.
   - For each `.prosemirror-editor` it finds the raw button links (`EDITING_CTA`), checks they are standalone
     (no text before; text after is only an options suffix), and parses the options with the same
     `parseCtaOptions()` / `ctaOptionVars()` as the page.
   - It writes the colours as `--cta-edit-*` properties and the classes `.cta-edit-custom` /
     `.cta-edit-options` **on the `.prosemirror-editor` wrapper only**.
3. `buttons.css` then colours the link from `--cta-edit-*` and hides the options text with `font-size: 0` on the
   paragraph (the link keeps its own 18px), and restores the 12px paragraph margin.

**Rules — learned the hard way:**
- **Never modify anything inside `.ProseMirror`** (no classes, no attributes, no text). ProseMirror treats DOM
  changes there as edits and writes them back to the document. The wrapper `.prosemirror-editor` is outside the
  editable area, so it is safe.
- **Specificity inside blocks:** block rules such as `.cards.content .cards-content-card-body p` (0,3,1) beat a
  plain `.prosemirror-editor.cta-edit-options p:has(…)` (0,2,5), so the options text stayed visible inside
  blocks. Fix: add `:not(#cta-edit)` (ID-level specificity, no `!important`) to the **colour** and **hide** rules.
  Leave the **margin** rule un-boosted, so a block that resets its button-paragraph margin still wins, as it
  does on the page. Find such conflicts with DevTools (or CDP `CSS.getMatchedStylesForNode`).
- These rules only match inside DA's editor — they never affect the published page.
- **Limits while editing:** `style=` in the options doesn't change the look (the mark decides it), and an editor
  holding several buttons gets no authored colours. Both are right after a re-render or refresh.
- **Dependency:** `.prosemirror-editor` and the mark order are DA internals, not an API. If DA changes them, only
  the editing preview regresses (raw link until refresh); update the selectors in `buttons.css` and `EDITING_CTA`.

## 7. Test

1. **Local:** `npx -y @adobe/aem-cli up`, open `http://localhost:3000/tools/plugins/buttons/buttons.html`
   (gallery, drawer, preview, validation; Insert is disabled outside DA). Check a page with each style and with
   options renders `a.cta-button.cta-*`.
2. **Push a branch**, then open the page in DA **with the branch**:
   `https://da.live/canvas?ref={branch}#/{org}/{repo}/{path}`
   (without `?ref=` DA loads the panel from `main`, where it doesn't exist yet → "Page Not Found" in the panel).
3. In DA, check:
   - Insert each design in default content and in a block cell; the panel stays open.
   - Select a button → open the panel → it opens pre-filled → Update replaces it. Select the **whole** button
     line (a partial selection can split the paragraph).
   - In **Layout**, click a button with `[color=…]` options, in default content **and** inside a block: it keeps
     its style and colour and the `[…]` text is hidden.
   - Preview the page: the buttons render with the right style, colours and target.
4. Quality gate: `npm run lint`, `node tools/quality/breakpoint-check.mjs`, `npm run check:overflow <url>`,
   `npm run test:a11y <url>` (the plugin page included).

## 8. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Panel shows "Page Not Found" / 404 | DA loads it from `main` (no `?ref=`), or the branch isn't pushed | Add `?ref={branch}` to the DA URL; push the branch |
| Layout view unstyled (Times font) | `?ref=local` — Layout treats `local` as a branch name | Test Layout on a pushed branch |
| Button becomes a plain italic link while editing in Layout | Missing `.prosemirror-editor` selectors | §6 step 1 |
| `[color="…"]` text visible / default colour while editing | `previewEditingCtas()` not called, or missing CSS | §6 steps 2–3 |
| Same, but only inside one block | Block paragraph/link rule outranks the editor rule | Keep `:not(#cta-edit)` on the colour + hide rules; don't add per-block overrides |
| Panel closes after Insert | `actions.closeLibrary()` is called | Remove the call |
| Other text in the block (e.g. a name/title) briefly disappears in Layout after an insert | DA reopened its inline editor on the wrong element after the insert shifted positions; the document is fine (check the Content view) | Refresh the page; click outside the block after inserting |
| Strikethrough button shows "<del>" | DA stores `<del>` as text | Don't use strikethrough for a style |
| Need "new tab" from DA's own Edit-link dialog | That dialog can't be extended | Type `#_blank` at the end of the URL, or use the panel |
| Panel header has a big empty gap | Site CSS sets `header { min-height }` | Reset it under `.btn-plugin` |
| Swatch clicks do nothing | Drawn chips cover the radio | `pointer-events: none` on the chips |
