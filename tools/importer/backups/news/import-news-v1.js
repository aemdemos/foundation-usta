/* eslint-disable */
/* global WebImporter */

/*
 * import-news-v1 — importer for the USTA Foundation NEWS ARTICLE template.
 *
 * Template shape (measured on the live source, e.g. the offline-by-aerie
 * article): a content root (`#mainContent > .aem-Grid`) with:
 *   [0] the ARTICLE body — H1 headline + rich-text paragraphs (inline links) and
 *       an inline image + caption. Imported as DEFAULT CONTENT (no block).
 *   [1..2] decorative separators / spacers — dropped by cleanup/sections.
 *   [n] the SOCIAL share bar — a dynamic widget on the source; re-authored as our
 *       `social (right)` block (news articles right-align it).
 *   [n] the RELATED ARTICLES feed — a dynamic widget; re-authored as our
 *       `cards (news)` block (later wired to /news-index.json).
 *
 * Per the import playbook this is ONE importer for the whole news TEMPLATE — the
 * same script imports every news article. Same-shape pages need no per-page
 * profile; only a genuinely different article layout would.
 *
 * Metadata contract (feeds the query-index → breadcrumb + Related-Articles feed):
 *   Title            — from WebImporter.rules.createMetadata (source <title>)
 *   Description      — derived from the article lede (first substantial <p>); the
 *                      source head has no meta description (JS-injected, absent)
 *   Image            — the article's hero/body image (source head has no og:image)
 *   Template = news  — drives templates/news/news.(css|js)
 *   Publication Date — resolved from the site /sitemap.xml <lastmod> in onLoad
 *                      (the article page never exposes its own date), formatted
 *                      "Month DD, YYYY"; params.publicationDate overrides
 *   Breadcrumb Title — optional short label (left blank; title is used)
 */

import cleanupTransformer from './transformers/ustafoundation-cleanup.js';
import sectionsTransformer from './transformers/ustafoundation-sections.js';

const PAGE_TEMPLATE = {
  name: 'news',
  description: 'USTA Foundation news article: H1 headline + rich-text body (with inline image + caption), a right-aligned social share bar, and a Related Articles cards feed.',
  // The article body is default content; social + related are re-authored blocks.
  blocks: [],
  // Single section — the article. Section metadata sets the template.
  sections: [],
};

const parsers = {};

/*
 * Publication date resolution.
 *
 * The source article page does NOT expose its publish date — not in the <head>
 * (og / article:published_time are absent), not in the rendered body (the only
 * "Month DD, YYYY" strings there belong to the Related-Articles cards, which are
 * OTHER articles). The authoritative per-URL date lives in the site's
 * `/sitemap.xml` as each entry's <lastmod>. We fetch it once in `onLoad` (same
 * origin as the page being imported, so the fetch is allowed) and stash the
 * matching, formatted date in this module-scoped var for `transform` to read.
 * If anything fails we leave it blank — the query-index lastModified is the
 * documented fallback.
 */
let resolvedPublicationDate = '';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// "2026-08-20T18:16:45.868Z" → "August 20, 2026" (zero-padded day, as the
// source's own date lines render, e.g. "May 06, 2026").
function formatIsoDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  if (!m) return '';
  const name = MONTH_NAMES[parseInt(m[2], 10) - 1];
  return name ? `${name} ${m[3]}, ${m[1]}` : '';
}

// Normalize a URL/path to a comparable key (strip trailing slash + .html).
function normPath(p) {
  return (p || '').replace(/\.html?$/, '').replace(/\/$/, '');
}

// cleanup runs first; sections only when 2+ sections (this template = 1).
const transformers = [
  cleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sectionsTransformer] : []),
];

function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/*
 * Build a `social` block table so the imported page carries our own share bar
 * (the source's is a dynamic Vue widget). The block is authored empty —
 * blocks/social decorate() builds the five share buttons and shares the current
 * page. Alignment is data-driven from the source: the source share container is
 * `div.socialmediasharing`, and it carries a `position-right` modifier ONLY on
 * the newer article layout (e.g. the Aerie page) — those get `social (right)`.
 * Older articles have a plain `.socialmediasharing` (left-aligned, beside the
 * reactions widget) → `social (left)`.
 */
function buildSocialBlock(document, align) {
  const variant = align === 'right' ? 'Social (right)' : 'Social (left)';
  return WebImporter.DOMUtils.createTable([
    [variant],
    [''],
  ], document);
}

/*
 * Build a `custom-widget-reactions` block. The source reactions bar is a dynamic
 * Vue component (`div.reactions`, with the "Be the first to add a reaction"
 * empty-state prompt); our block recreates it from just two authored rows —
 * the title and the prompt (the fixed emoji set lives in the block itself).
 */
function buildReactionsBlock(document) {
  return WebImporter.DOMUtils.createTable([
    ['Custom Widget Reactions'],
    ['Reactions'],
    ['Be the first to add a reaction'],
  ], document);
}

/*
 * Convert a source `blockquote.twitter-tweet` into our `quote (tweet)` block.
 * The source blockquote is: one/more <p> (tweet body, inline links) followed by
 * a trailing "— Name (@handle) Date" text+links run (NOT wrapped in <p>). Our
 * quote-tweet contract is two single-cell rows: row 1 = body, row 2 = footer.
 */
function buildTweetBlock(document, blockquote) {
  // The body is the <p> element(s); the footer is everything after the last <p>.
  const paras = [...blockquote.querySelectorAll(':scope > p')];
  const bodyCell = document.createElement('div');
  paras.forEach((p) => bodyCell.append(p.cloneNode(true)));

  // Footer = the blockquote's trailing nodes after the final <p> (the
  // "— Name (@handle) Date" run). Collect them into a single <p>.
  const footerP = document.createElement('p');
  const lastP = paras[paras.length - 1] || null;
  let started = !lastP;
  blockquote.childNodes.forEach((node) => {
    if (node === lastP) { started = true; return; }
    if (!started) return;
    footerP.append(node.cloneNode(true));
  });
  const footerCell = document.createElement('div');
  if ((footerP.textContent || '').trim()) footerCell.append(footerP);

  const rows = [['Quote (tweet)'], [bodyCell]];
  if (footerCell.childNodes.length) rows.push([footerCell]);
  return WebImporter.DOMUtils.createTable(rows, document);
}

/*
 * Build our `embed-instagram` block from an Instagram permalink (single-cell:
 * just the permalink <a>; the text column is optional and omitted here since
 * these posts render full-width between paragraphs).
 */
function buildInstagramBlock(document, rawPermalink) {
  let permalink = rawPermalink || '';
  // strip the ?utm_source=ig_embed… query the source appends
  try { const u = new URL(permalink); permalink = `${u.origin}${u.pathname}`; } catch { /* keep as-is */ }
  if (!permalink) return null;
  const cell = document.createElement('div');
  const a = document.createElement('a');
  a.setAttribute('href', permalink);
  a.textContent = 'View this post on Instagram';
  cell.append(a);
  return WebImporter.DOMUtils.createTable([
    ['Embed Instagram'],
    [cell],
  ], document);
}

// Normalize an Instagram permalink to https://www.instagram.com/{p|reel|tv}/{id}/
// (posts use /p/, video reels use /reel/ — match both, keeping the type).
function instaPermalinkFrom(url) {
  const m = /instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/.exec(url || '');
  return m ? `https://www.instagram.com/${m[1]}/${m[2]}/` : '';
}

/*
 * Replace every social embed in the article body, IN PLACE (preserving reading
 * order), with our block equivalents:
 *   blockquote.twitter-tweet                    → quote (tweet)
 *   blockquote.instagram-media  OR              → embed-instagram
 *   iframe[src*="instagram.com/p/…/embed"]        (Instagram's embed.js upgrades
 *                                                  the blockquote into an iframe
 *                                                  before import time, so match
 *                                                  BOTH forms)
 * Runs before the share/reactions/related swaps so those regions are untouched.
 */
// A tweet blockquote is a HIDDEN DUPLICATE if it has zero rendered size (the
// source ships the pre-hydration blockquote twice — one visible, one collapsed).
// Skip those so we don't emit a duplicate quote block.
function isHiddenDup(el) {
  if (!el.getBoundingClientRect) return false;
  const r = el.getBoundingClientRect();
  return r.width === 0 && r.height === 0;
}

/*
 * A social embed (tweet OR Instagram) that sits in a partial-width grid column
 * BESIDE a text column is laid out embed-left / article-text-right by the source.
 * Reproduce that with a `split-left` SECTION (block-agnostic section style — see
 * the section-split-left-tweet sample): the embed block in the left column, the
 * article text as default content in the right, fenced by <hr> + Section Metadata
 * (style: split-left). `embedEl` is the source node in the col; `embedBlock` is
 * our replacement block. Returns true if a section was built.
 */
function buildSplitLeftSection(document, embedEl, embedBlock) {
  // The embed sits in a PARTIAL-width grid column (anything < 12) beside a text
  // column. Source widths vary: tweets use col-5/6/7, but Instagram can be a
  // narrow col-4 beside a col-8 text column (e.g. robin-montgomery-wimbledon-debut).
  // Match any col-4..8 so all of these are detected as split-left, not full-width.
  const embedCol = embedEl.closest(
    '[class*="GridColumn--default--4"], [class*="GridColumn--default--5"], '
    + '[class*="GridColumn--default--6"], [class*="GridColumn--default--7"], '
    + '[class*="GridColumn--default--8"]',
  );
  if (!embedCol || !embedCol.parentElement) return false;
  const sibs = [...embedCol.parentElement.children]
    .filter((c) => c.className && /GridColumn--default--\d+/.test(c.className));
  const idx = sibs.indexOf(embedCol);
  const textCol = [sibs[idx + 1], sibs[idx - 1]]
    .find((c) => c && !c.querySelector('blockquote, iframe, picture, img')
      && (c.textContent || '').trim().length > 20
      && !/GridColumn--default--12/.test(c.className));
  if (!textCol) return false; // no beside-text → leave for the inline handler

  const frag = document.createElement('div');
  frag.append(document.createElement('hr'));
  frag.append(embedBlock);
  const t = textCol.cloneNode(true);
  while (t.firstChild) frag.append(t.firstChild); // article text as default content
  frag.append(WebImporter.Blocks.createBlock(document, {
    name: 'Section Metadata',
    cells: { style: 'split-left' },
  }));
  frag.append(document.createElement('hr'));

  embedCol.replaceWith(...frag.childNodes);
  textCol.remove();
  return true;
}

/*
 * Tweets that sit in a partial-width col beside text → split-left section.
 * A full-width (col-12) tweet with no beside-text is left for the inline handler.
 */
function wrapTweetSections(document, root) {
  let built = 0;
  [...root.querySelectorAll('blockquote.twitter-tweet')].forEach((bq) => {
    if (isHiddenDup(bq)) { bq.remove(); return; }
    if (buildSplitLeftSection(document, bq, buildTweetBlock(document, bq))) built += 1;
  });
  return built;
}

/*
 * Instagram embeds (an iframe upgraded by embed.js, or a raw blockquote) that sit
 * in a partial-width col beside text → split-left section (embed-instagram block
 * left, article text right). A full-width IG embed falls through to the inline
 * handler in wrapEmbeds. Returns the count built.
 */
function wrapInstagramSections(document, root) {
  let built = 0;
  const seen = new Set(); // permalinks already placed — the source ships each post twice
  const nodes = [
    ...root.querySelectorAll('iframe[src*="instagram.com/"]'),
    ...root.querySelectorAll('blockquote.instagram-media'),
  ];
  nodes.forEach((el) => {
    if (isHiddenDup(el)) { el.remove(); return; } // drop hidden duplicate embeds
    const raw = el.getAttribute('src')
      || el.getAttribute('data-instgrm-permalink')
      || (el.querySelector && el.querySelector('a[href*="instagram.com/"]') || {}).getAttribute?.('href')
      || '';
    const permalink = instaPermalinkFrom(raw);
    if (!permalink) return;
    // De-dup by permalink: the source ships each Instagram post twice (visible +
    // a collapsed copy that isn't always 0×0). Keep the first; drop later repeats.
    if (seen.has(permalink)) { el.remove(); return; }
    seen.add(permalink);
    const block = buildInstagramBlock(document, permalink);
    if (block && buildSplitLeftSection(document, el, block)) built += 1;
  });
  return built;
}

function wrapEmbeds(document, root) {
  root.querySelectorAll('blockquote.twitter-tweet').forEach((bq) => {
    if (isHiddenDup(bq)) { bq.remove(); return; } // skip hidden duplicate tweets
    bq.replaceWith(buildTweetBlock(document, bq));
  });
  // Instagram as a not-yet-upgraded blockquote.
  root.querySelectorAll('blockquote.instagram-media').forEach((bq) => {
    if (isHiddenDup(bq)) { bq.remove(); return; } // drop hidden duplicate
    const permalink = bq.getAttribute('data-instgrm-permalink')
      || (bq.querySelector('a[href*="instagram.com/"]') || {}).getAttribute?.('href') || '';
    const block = buildInstagramBlock(document, instaPermalinkFrom(permalink) || permalink);
    if (block) bq.replaceWith(block); else bq.remove();
  });
  // Instagram already upgraded to an iframe by embed.js — recover the permalink
  // from the /{p|reel|tv}/{id}/embed src. Replace the iframe's outermost wrapper.
  root.querySelectorAll('iframe[src*="instagram.com/"]').forEach((iframe) => {
    if (isHiddenDup(iframe)) { iframe.remove(); return; } // drop hidden duplicate
    const permalink = instaPermalinkFrom(iframe.getAttribute('src'));
    const block = buildInstagramBlock(document, permalink);
    if (!block) { return; }
    // The iframe sits inside embed.js wrappers; replace the highest ancestor
    // that contains ONLY this embed (an .instagram-media-rendered span/div) so
    // we don't leave empty wrapper shells behind.
    let target = iframe;
    let parent = iframe.parentElement;
    while (parent && parent !== root
      && parent.querySelectorAll('iframe, img, p').length <= 1
      && (parent.textContent || '').trim().length < 5) {
      target = parent;
      parent = parent.parentElement;
    }
    target.replaceWith(block);
  });
}

/*
 * Convert the source's Related Articles <ul> into a `cards (news)` block table.
 *
 * Each source card is `<li><div class="list-core-component" role="group">` with:
 *   - an image link (<img data-src=…> — lazyloaded, so the real URL is data-src),
 *   - a title <h3> (inside an <a>),
 *   - a date line, and
 *   - a description + a "Read More" link.
 * We map each to a cards-news row: [ <picture> | <h3>title</h3><p>date</p>
 *   <p>desc</p><p><a>Read More</a></p> ].
 *
 * NOTE: on the live source this feed is DYNAMIC (a Vue widget) — the specific
 * cards change over time and are unrelated to the article. We snapshot what's
 * present at import time so the page renders standalone; the feed will later be
 * driven from /news-index.json (see helix-query.yaml). If a card can't be parsed
 * (partial hydration), it's skipped rather than emitted empty.
 */
function buildRelatedBlock(document, ul) {
  const rows = [['Cards (news)']];
  ul.querySelectorAll(':scope > li').forEach((li) => {
    const card = li.querySelector('[role="group"]') || li;
    // Title: an <h3>/<h2>/<h4>, OR the source's `<span role="heading">` (the
    // core-component renders the title as a heading-role span, not an <hN>), OR
    // the `.list-core-component__title` link text. Some cards have no image.
    const titleH = card.querySelector('h3, h2, h4, [role="heading"], .list-core-component__title');
    let title = titleH ? titleH.textContent.trim() : '';
    // Hydration fallback: the image link's aria-label / the img alt read
    // "Visit the <title> page". Strip that wrapper to recover the title.
    if (!title) {
      const labels = [
        ...[...card.querySelectorAll('[aria-label]')].map((a) => a.getAttribute('aria-label')),
        ...[...card.querySelectorAll('img[alt]')].map((i) => i.getAttribute('alt')),
      ];
      const labelled = labels.find((l) => /^visit the .+ page$/i.test((l || '').trim()));
      if (labelled) title = labelled.trim().replace(/^visit the\s+/i, '').replace(/\s+page$/i, '').trim();
    }
    const links = [...card.querySelectorAll('a')];
    const readMore = links.find((a) => /read more/i.test(a.textContent));
    // the article link = the title's anchor, else the image anchor, else readMore
    const titleLink = titleH ? titleH.closest('a') : null;
    const imgLink = card.querySelector('a:has(img), a > img') ? card.querySelector('a') : null;
    const href = (titleLink || imgLink || readMore || {}).getAttribute
      ? (titleLink || imgLink || readMore).getAttribute('href')
      : '#';
    // date = a text node/element matching "Month DD, YYYY", no anchor inside
    const dateEl = [...card.querySelectorAll('*')].find((e) => e.children.length === 0
      && /^[A-Z][a-z]+ \d{1,2}, \d{4}$/.test((e.textContent || '').trim()));
    const date = dateEl ? dateEl.textContent.trim() : '';
    // description = the paragraph/element holding the Read More link, minus links
    let desc = '';
    if (readMore) {
      const descHost = readMore.parentElement;
      const clone = descHost.cloneNode(true);
      clone.querySelectorAll('a').forEach((a) => a.remove());
      desc = (clone.textContent || '').trim();
    }
    // image: source lazyloads via data-src; promote it to a real <img src>.
    const srcImg = card.querySelector('img');
    let picture = null;
    if (srcImg) {
      const realSrc = srcImg.getAttribute('src') || srcImg.getAttribute('data-src');
      if (realSrc) {
        picture = document.createElement('img');
        picture.setAttribute('src', new URL(realSrc, 'https://www.ustafoundation.com').href);
        picture.setAttribute('alt', srcImg.getAttribute('title') || srcImg.getAttribute('alt') || title);
      }
    }

    // Skip a card that produced nothing usable (partial hydration).
    if (!title && !href) return;

    const imageCell = document.createElement('div');
    if (picture) imageCell.append(picture);
    const bodyCell = document.createElement('div');
    const h3 = document.createElement('h3');
    h3.textContent = title;
    bodyCell.append(h3);
    if (date) { const d = document.createElement('p'); d.textContent = date; bodyCell.append(d); }
    if (desc) { const de = document.createElement('p'); de.textContent = desc; bodyCell.append(de); }
    const rm = document.createElement('p');
    const rmA = document.createElement('a');
    rmA.setAttribute('href', href || '#');
    rmA.textContent = 'Read More';
    rm.append(rmA);
    bodyCell.append(rm);
    rows.push([imageCell, bodyCell]);
  });
  return WebImporter.DOMUtils.createTable(rows, document);
}

/*
 * Build a `video-embed` block from a YouTube embed URL. Matches the block sample
 * contract: row 1 = a single YouTube link; row 2 = the consent-gate placeholder
 * text (the source shows "This video requires Social Media cookies…").
 */
function buildVideoEmbedBlock(document, ytUrl) {
  const linkCell = document.createElement('div');
  const a = document.createElement('a');
  a.setAttribute('href', ytUrl);
  a.textContent = 'YouTube video';
  linkCell.append(a);

  const consentCell = document.createElement('div');
  const p = document.createElement('p');
  p.textContent = 'This video requires Social Media cookies to be accepted. Please update your cookie preferences to watch.';
  consentCell.append(p);

  return WebImporter.DOMUtils.createTable([
    ['Video Embed'],
    [linkCell],
    [consentCell],
  ], document);
}

/*
 * Convert the source's text+video col-6 pair into a `split-right` SECTION: the
 * article text stays as default content and a `video-embed` block sits beside it
 * on the right (block-agnostic section style — see the section-split-right-video
 * sample). We isolate it in its own section with <hr> boundaries and a Section
 * Metadata table (style: split-right).
 *
 * Detection (static DOM): a `.cmp-embed`/`.embed` grid column holding a YouTube
 * iframe (data-src), with a sibling col-6 text column immediately before it.
 * Returns the count built.
 */
function wrapVideoSections(document, root) {
  let built = 0;
  const ytIframes = [...root.querySelectorAll('iframe')].filter((f) => (
    /youtube\.com|youtu\.be/.test(f.getAttribute('data-src') || f.getAttribute('src') || '')
  ));
  ytIframes.forEach((iframe) => {
    const ytUrl = iframe.getAttribute('data-src') || iframe.getAttribute('src');
    const videoBlock = buildVideoEmbedBlock(document, ytUrl);

    // Is the video in a PARTIAL-width column (5/6/7) directly BESIDE a text
    // column? Only then is it the source's split-right (video-right) layout.
    const partialCol = iframe.closest('[class*="GridColumn--default--5"], [class*="GridColumn--default--6"], [class*="GridColumn--default--7"]');
    let textCol = null;
    if (partialCol && partialCol.parentElement) {
      const sibs = [...partialCol.parentElement.children]
        .filter((c) => c.className && /GridColumn--default--\d+/.test(c.className));
      const idx = sibs.indexOf(partialCol);
      textCol = [sibs[idx - 1], sibs[idx + 1]]
        .find((c) => c && !c.querySelector('iframe, blockquote, picture, img')
          && (c.textContent || '').trim().length > 20
          && !/GridColumn--default--12/.test(c.className));
    }

    if (partialCol && textCol) {
      // split-right section: article text left (default content) + video right.
      const frag = document.createElement('div');
      frag.append(document.createElement('hr'));
      const t = textCol.cloneNode(true);
      while (t.firstChild) frag.append(t.firstChild);
      frag.append(videoBlock);
      frag.append(WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata',
        cells: { style: 'split-right' },
      }));
      frag.append(document.createElement('hr'));
      partialCol.replaceWith(...frag.childNodes);
      textCol.remove();
    } else {
      // Full-width (col-12) video → a plain, centered video-embed block in place
      // (NOT a split section). Replace the iframe's grid column, or the iframe.
      const host = iframe.closest('[class*="GridColumn"]') || iframe.closest('p') || iframe;
      host.replaceWith(videoBlock);
    }
    built += 1;
  });
  return built;
}

/*
 * Convert a source two-column DATA layout into our `table` block.
 *
 * On the source, a tabular list (e.g. NJTL essay winners) is authored NOT as an
 * HTML <table> but as two side-by-side `.text` grid columns (each `col-6`), the
 * first line of each being a bold header ("Winners" / "NJTL Chapter"). We detect
 * an `.aem-Grid` whose children are exactly two `.text` columns that each start
 * with a short bold header, and emit a Table block: row 1 = the two headers,
 * row 2 = the two column bodies (header line removed). Returns the count built.
 */
function wrapDataTables(document, root) {
  let built = 0;
  // each candidate column must lead with a short bold header
  const headerOf = (col) => {
    const b = col.querySelector('b, strong');
    const t = b ? (b.textContent || '').trim() : '';
    // header is the FIRST text line of the column (not a mid-body bold word)
    const firstLine = (col.textContent || '').trim().split('\n')[0].trim();
    return t && t.length <= 40 && firstLine.startsWith(t) ? t : '';
  };
  const grids = [...root.querySelectorAll('.aem-Grid')];
  grids.forEach((grid) => {
    // find the pair of ADJACENT half-width (.text) columns that each begin with a
    // bold header — the data table. A full-width intro column may precede them.
    const textCols = [...grid.children].filter((c) => c.classList && c.classList.contains('text'));
    let cols = null;
    for (let i = 0; i < textCols.length - 1; i += 1) {
      if (headerOf(textCols[i]) && headerOf(textCols[i + 1])) {
        cols = [textCols[i], textCols[i + 1]];
        break;
      }
    }
    if (!cols) return;
    const h1 = headerOf(cols[0]);
    const h2 = headerOf(cols[1]);
    if (!h1 || !h2) return;

    // The source's blank `&nbsp;` group separators are stripped from the DOM
    // before import, so we reconstruct the sub-groups from content. Collect each
    // column's non-empty body paragraphs (the bold header is dropped — it becomes
    // the header row).
    const bodyParas = (col, header) => {
      const textHost = col.querySelector('.cmp-text') || col;
      return [...textHost.querySelectorAll('p')].filter((p) => {
        if (p.querySelector('picture, img')) return true;
        const t = (p.textContent || '').replace(/[\s\u00a0]/g, '');
        return t && (p.textContent || '').trim() !== header;
      });
    };
    // A group-header paragraph = a short category/bracket label that STARTS a new
    // sub-group (e.g. "Girls/Boys 10 and Under"). This is the grouping cue now
    // that the blank separators are gone.
    const isGroupHeader = (p) => {
      const t = (p.textContent || '').trim();
      return t.length <= 40 && /(\band under\b|\band over\b|\bdivision\b|\bcategory\b|\bboys\b|\bgirls\b|\b\d+s\b)/i.test(t);
    };

    const leftParas = bodyParas(cols[0], h1);
    const rightParas = bodyParas(cols[1], h2);

    // Split LEFT into groups at each group-header paragraph.
    const leftGroups = [];
    leftParas.forEach((p) => {
      if (isGroupHeader(p) || !leftGroups.length) leftGroups.push([]);
      leftGroups[leftGroups.length - 1].push(p);
    });
    // Chunk RIGHT into the SAME number of groups (it has no headers; the source
    // aligns its items 1:1 within each left bracket), distributing evenly with
    // any remainder on the last group.
    const nGroups = leftGroups.length;
    const rightGroups = [];
    if (nGroups > 1 && rightParas.length >= nGroups) {
      const per = Math.floor(rightParas.length / nGroups);
      let k = 0;
      for (let gi = 0; gi < nGroups; gi += 1) {
        const take = gi === nGroups - 1 ? rightParas.length - k : per;
        rightGroups.push(rightParas.slice(k, k + take));
        k += take;
      }
    } else {
      rightGroups.push(rightParas);
    }

    const toCell = (paras) => {
      const cell = document.createElement('div');
      paras.forEach((p) => cell.append(p.cloneNode(true)));
      return cell;
    };
    const hc1 = document.createElement('div'); hc1.textContent = h1;
    const hc2 = document.createElement('div'); hc2.textContent = h2;
    const rowCount = Math.max(leftGroups.length, rightGroups.length, 1);
    const bodyRows = [];
    for (let r = 0; r < rowCount; r += 1) {
      bodyRows.push([
        leftGroups[r] ? toCell(leftGroups[r]) : document.createElement('div'),
        rightGroups[r] ? toCell(rightGroups[r]) : document.createElement('div'),
      ]);
    }
    const table = WebImporter.DOMUtils.createTable([
      ['Table'],
      [hc1, hc2],
      ...bodyRows,
    ], document);
    // Replace ONLY the two data columns (a preceding full-width intro column, if
    // any, stays as default content); insert the table where the first col was.
    cols[0].replaceWith(table);
    cols[1].remove();
    built += 1;
  });
  return built;
}

/*
 * Convert a SINGLE-column grade/category winners list into a ONE-COLUMN `table`
 * block — one ROW per group. The source (e.g. 2026 NJTL essay winners) authors
 * it as: a "…following categories:" lead-in, then per-group blocks — a short
 * header line (Freshmen / Sophomores / …) followed by its "Name - Chapter" lines,
 * separated by blank paragraphs. Each group (header + its lines) becomes ONE
 * single-cell table row, preserving the lines as-is. Returns the count built.
 */
function wrapGradeListTable(document, root) {
  let built = 0;
  const isGroupHead = (t) => /^(freshmen|sophomores?|juniors?|seniors?|boys|girls|men|women|\d+\s*(and)?\s*(under|over))\b/i
    .test(t) && t.length <= 30 && !/\s[-–—]\s/.test(t) && !/[.]$/.test(t);

  [...root.querySelectorAll('.cmp-text, .text')].forEach((host) => {
    const ps = [...host.querySelectorAll(':scope > p')];
    if (!ps.length) return;
    const leadIdx = ps.findIndex((p) => /following categories:?\s*$/i.test((p.textContent || '').trim()));
    if (leadIdx === -1) return;

    // Group the paragraphs after the lead-in: a new group starts at each header;
    // blank separators end the current group.
    const groups = [];
    let cur = null;
    for (let i = leadIdx + 1; i < ps.length; i += 1) {
      const t = (ps[i].textContent || '').replace(/ /g, ' ').trim();
      if (!t) { cur = null; continue; }
      if (isGroupHead(t)) { cur = [ps[i]]; groups.push(cur); continue; }
      if (cur) cur.push(ps[i]);
    }
    if (groups.length < 2) return;

    // One single-cell row per group (header + its name lines, kept as paragraphs).
    const rows = [['Table']];
    groups.forEach((g) => {
      const cell = document.createElement('div');
      g.forEach((p) => cell.append(p.cloneNode(true)));
      rows.push([cell]);
    });
    const table = WebImporter.DOMUtils.createTable(rows, document);

    // Insert the table where the first group header is, then remove every
    // paragraph from that header onward (the lead-in + earlier paras stay).
    const firstEl = groups[0][0];
    firstEl.parentNode.insertBefore(table, firstEl);
    let removing = false;
    ps.forEach((p) => {
      if (p === firstEl) removing = true;
      if (removing) p.remove();
    });
    built += 1;
  });
  return built;
}

/*
 * Flatten LEFTOVER layout `<table>`s (some source articles wrap body prose in
 * nested single-column layout tables — an email/CMS artifact). These aren't data
 * and would render as stray bordered tables in EDS. Unwrap each into its cell
 * contents (deepest-nested first, so nesting collapses cleanly). Runs AFTER
 * wrapMediaColumns so the beside-text a layout table holds is still measurable
 * when images are paired; our own block tables are created LATER by createTable.
 */
// Names of the block tables THIS importer creates via createTable — these must
// never be flattened as if they were source layout tables.
const OUR_BLOCK_NAMES = /^(columns|social|cards|table|video embed|embed instagram|quote|custom widget reactions|section metadata|metadata)\b/i;

function flattenLayoutTables(document, root) {
  const layout = [...root.querySelectorAll('table')].filter((t) => {
    // Skip our own block tables (first header cell names a known block).
    const firstCell = t.querySelector('th, td');
    const label = (firstCell && firstCell.textContent || '').trim();
    return !OUR_BLOCK_NAMES.test(label);
  });
  layout.sort((a, b) => b.querySelectorAll('table').length - a.querySelectorAll('table').length);
  layout.forEach((t) => {
    // don't unwrap a layout table that CONTAINS one of our block tables
    if (t.querySelector('table') && [...t.querySelectorAll('table')]
      .some((inner) => OUR_BLOCK_NAMES.test((inner.querySelector('th, td')?.textContent || '').trim()))) return;
    const frag = document.createDocumentFragment();
    t.querySelectorAll(':scope > tbody > tr > td, :scope > tr > td, :scope > tbody > tr > th, :scope > tr > th')
      .forEach((cell) => { while (cell.firstChild) frag.append(cell.firstChild); });
    if (frag.childNodes.length) t.replaceWith(frag); else t.remove();
  });
}

/*
 * Wrap EACH article body image into a `columns` media block (text beside image),
 * matching the source, where every body image sits in a half-width (col-6) grid
 * column paired with a sibling col-6 text column. The image's SIDE (media-left /
 * media-right) is read from its rendered position (the importer runs in a real
 * browser, so layout is available): image left-of-centre → media-left, else
 * media-right. Older articles alternate right/left/right; the Aerie page has a
 * single right image — both are handled uniformly here.
 *
 * A caption is the text inside the image's own column after the picture, else the
 * following text-only paragraph. Returns the number of media blocks built.
 */
function wrapMediaColumns(document, root) {
  const isDecorative = (alt) => /facebook|twitter|linkedin|copy|print|checkmark|smile|thumbs|love|clap|lightbulb/i.test(alt || '');
  // Body images: real photos with alt text, NOT in the related-cards <ul>, NOT
  // inside the share/reactions widgets (their icons, incl. an empty-alt
  // checkmark, must never become a media block), NOT chrome icons.
  const bodyImgs = [...root.querySelectorAll('img')].filter((img) => {
    if (img.closest('ul')) return false;
    if (img.closest('.socialmediasharing, .reactions')) return false;
    const alt = (img.getAttribute('alt') || '').trim();
    if (!alt) return false; // photos on these articles always carry alt text
    return !isDecorative(alt);
  });
  if (!bodyImgs.length) return 0;

  const viewportCentre = 640; // 1280 test viewport → column midline
  let built = 0;

  bodyImgs.forEach((img) => {
    const pic = img.closest('picture') || img;
    // The image's grid column (half-width) and its paired text column (the
    // adjacent col-6 sibling in the same grid that carries text, no picture).
    const imgCol = pic.closest('[class*="GridColumn--default--6"]')
      || pic.closest('[class*="GridColumn"]');
    let textCol = null;
    if (imgCol && imgCol.parentElement) {
      const sibs = [...imgCol.parentElement.children]
        .filter((c) => c.className && /GridColumn--default--6/.test(c.className));
      const idx = sibs.indexOf(imgCol);
      // prefer the immediately-preceding col-6, else the following one
      textCol = sibs[idx - 1] && !sibs[idx - 1].querySelector('picture, img') ? sibs[idx - 1]
        : (sibs[idx + 1] && !sibs[idx + 1].querySelector('picture, img') ? sibs[idx + 1] : null);
    }

    // caption: text in the image's column after the picture, else next text para.
    let captionText = '';
    const capHost = imgCol || pic.closest('p') || pic.parentElement;
    if (capHost) {
      const clone = capHost.cloneNode(true);
      clone.querySelectorAll('picture, img').forEach((n) => n.remove());
      captionText = (clone.textContent || '').trim();
    }

    // Pair the image with the body text that renders BESIDE it, using rendered
    // layout (available at transform time) as the PRIMARY signal: every body
    // paragraph that sits on the OPPOSITE side of the column midline (text-left
    // when the image is right) AND whose vertical range overlaps the image's
    // band. This captures the FULL left-column run beside the image — including a
    // lead-in paragraph whose top aligns with the image top (a col-12 intro that
    // sits directly above the col-6 beside-text) — and is robust to the source
    // wrapping beside-text in a layout table (e.g. Laver Cup) where a DOM-sibling
    // lookup fails. Generous vertical tolerance so a paragraph starting level with
    // the image top is included; strict enough that a NEXT image's row isn't.
    const textCell = document.createElement('div');
    const paired = [];
    const ir = pic.getBoundingClientRect ? pic.getBoundingClientRect() : null;
    if (ir && ir.width) {
      const imgIsLeft = ir.left < viewportCentre;
      // Capture BLOCK-LEVEL body content beside the image — paragraphs AND lists
      // (source article bodies mix <p> and <ul>/<ol>; a bullet list beside the
      // image must not be dropped). Select top-level blocks (a <p>/<ul>/<ol> not
      // nested inside another captured block) that render on the opposite side of
      // the column midline and overlap the image's vertical band.
      const blocks = [...root.querySelectorAll('p, ul, ol')].filter((el) => {
        if (el.closest('.socialmediasharing, .reactions')) return false;
        if (el.querySelector('picture, img')) return false;
        // skip a <p> that lives inside a <ul>/<ol> we'll capture as a whole
        if (el.tagName === 'P' && el.closest('ul, ol')) return false;
        // skip a nested list (its ancestor list is captured as a whole)
        if ((el.tagName === 'UL' || el.tagName === 'OL') && el.parentElement.closest('ul, ol')) return false;
        // skip the related-cards feed lists
        if ((el.tagName === 'UL' || el.tagName === 'OL') && el.querySelector('a[href*="/news/"]')) return false;
        return (el.textContent || '').trim().length > 0;
      });
      blocks.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (!r.width) return;
        const vOverlap = r.bottom > ir.top - 20 && r.top < ir.bottom + 20 && r.top > ir.top - 110;
        const opposite = imgIsLeft ? (r.left >= viewportCentre - 40) : (r.right <= viewportCentre + 40);
        if (vOverlap && opposite) paired.push(el);
      });
    }
    if (paired.length) {
      // preserve document order
      paired.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
      paired.forEach((el) => textCell.append(el.cloneNode(true)));
      paired.forEach((el) => el.remove());
    }
    // Fallback 1: the DOM-sibling text column (clean col-6 pairs) if geometry
    // found nothing (e.g. a headless run without layout) — take its full ordered
    // block content (paragraphs AND lists), not paragraphs only.
    if (!textCell.childNodes.length && textCol) {
      const host = textCol.querySelector('.cmp-text') || textCol;
      [...host.querySelectorAll('p, ul, ol')]
        .filter((el) => (el.tagName !== 'P' || !el.closest('ul, ol')) // skip <p> inside a list
          && !((el.tagName === 'UL' || el.tagName === 'OL') && el.parentElement.closest('ul, ol')) // skip nested list
          && !el.querySelector('picture, img')
          && !((el.tagName === 'UL' || el.tagName === 'OL') && el.querySelector('a[href*="/news/"]'))
          && (el.textContent || '').trim())
        .forEach((el) => textCell.append(el.cloneNode(true)));
    }
    // Fallback 2: nearest preceding body paragraphs.
    if (!textCell.childNodes.length) {
      const beforeImg = (el) => !!(pic.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING);
      const near = [...root.querySelectorAll('p')].filter((p) => (p.textContent || '').trim()
        && !p.querySelector('picture, img') && !p.closest('ul') && beforeImg(p)).slice(-2);
      near.forEach((p) => { textCell.append(p.cloneNode(true)); });
      near.forEach((p) => p.remove());
    }
    if (!textCell.childNodes.length) return; // nothing to pair — skip

    const mediaCell = document.createElement('div');
    mediaCell.append(pic.cloneNode(true));
    if (captionText) {
      const cap = document.createElement('p');
      const em = document.createElement('em');
      em.textContent = captionText;
      cap.append(em);
      mediaCell.append(cap);
    }

    // Side from rendered position (browser layout available at transform time).
    const rect = (imgCol || pic).getBoundingClientRect ? (imgCol || pic).getBoundingClientRect() : { left: viewportCentre + 1 };
    const isLeft = rect.left < viewportCentre;
    const variant = isLeft ? 'Columns (media-left)' : 'Columns (media-right)';
    const cells = isLeft ? [mediaCell, textCell] : [textCell, mediaCell];
    const table = WebImporter.DOMUtils.createTable([[variant], cells], document);

    // Replace the image column with the block, and drop the paired text column.
    const anchor = imgCol || pic.closest('p') || pic;
    anchor.replaceWith(table);
    if (textCol && textCol.parentElement) textCol.remove();
    built += 1;
  });

  return built;
}

export default {
  // Runs in-page BEFORE transform. Resolve this article's publication date from
  // the site sitemap (<lastmod>), matched by pathname. Same-origin fetch, awaited
  // by the runner. Best-effort: on any failure the date is simply omitted.
  onLoad: async ({ document }) => {
    resolvedPublicationDate = '';
    try {
      const here = normPath(document.location.pathname);
      const res = await fetch('/sitemap.xml', { credentials: 'omit' });
      if (!res.ok) return;
      const xml = await res.text();
      // pair each <loc> with its following <lastmod>
      const entries = [...xml.matchAll(/<loc>([^<]+)<\/loc>\s*(?:<lastmod>([^<]+)<\/lastmod>)?/gi)];
      const match = entries.find((e) => {
        try { return normPath(new URL(e[1]).pathname) === here; } catch { return false; }
      });
      if (match && match[2]) resolvedPublicationDate = formatIsoDate(match[2].trim());
    } catch (e) {
      // leave blank — query-index lastModified is the documented fallback
    }
  },

  transform: ({ document, url, params }) => {
    const main = document.querySelector('#mainContent') || document.querySelector('main') || document.body;
    // Track which blocks we emit, for the import report (per page).
    const emittedBlocks = ['cards-news'];
    const tweetCount = main.querySelectorAll('blockquote.twitter-tweet').length;
    const igCount = main.querySelectorAll('blockquote.instagram-media').length;
    if (tweetCount) emittedBlocks.push(`quote-tweet×${tweetCount}`);
    if (igCount) emittedBlocks.push(`embed-instagram×${igCount}`);
    if (main.querySelector('.socialmediasharing')) emittedBlocks.push('social');
    if (main.querySelector('.reactions')) emittedBlocks.push('reactions');

    // 0. Capture Description + Image from the ORIGINAL article DOM, before any
    //    mutation. The source head has no og:description / og:image (JS-injected,
    //    absent in the imported DOM), so createMetadata can only recover Title.
    //    We derive them from the article itself so the query-index gets real
    //    values:
    //      • Description = the first substantial body paragraph (the article lede).
    //      • Image       = the article's hero/body image (its <picture>/<img>).
    const descP = [...main.querySelectorAll('p')].find((p) => {
      if (p.querySelector('picture, img, a[href]') && (p.textContent || '').trim().length < 60) return false;
      if (p.closest('ul')) return false; // skip related-cards text
      return (p.textContent || '').trim().length >= 40;
    });
    const metaDescription = descP ? (descP.textContent || '').trim().replace(/\s+/g, ' ') : '';

    const heroImg = [...main.querySelectorAll('img, picture')].find((el) => {
      if (el.closest('ul')) return false; // skip related-cards thumbnails
      const alt = (el.getAttribute('alt') || el.querySelector?.('img')?.getAttribute('alt') || '');
      return !/facebook|twitter|linkedin|copy|print|checkmark/i.test(alt);
    });
    let metaImage = null;
    if (heroImg) {
      const imgEl = heroImg.tagName === 'IMG' ? heroImg : heroImg.querySelector('img');
      const rawSrc = imgEl && (imgEl.getAttribute('src') || imgEl.getAttribute('data-src'));
      if (rawSrc) {
        metaImage = document.createElement('img');
        metaImage.setAttribute('src', new URL(rawSrc, 'https://www.ustafoundation.com').href);
        metaImage.setAttribute('alt', (imgEl.getAttribute('alt') || '').trim());
      }
    }

    // 1. cleanup (isolate content root, strip chrome/tracking).
    executeTransformers('beforeTransform', main, { url, params });
    executeTransformers('afterTransform', main, { url, params });

    // 1a. Convert a text+video col-6 pair into a split-right video section
    //     (video-embed block beside the text). Runs before wrapEmbeds so the
    //     YouTube iframe is consumed here, not mistaken for another embed.
    const videoSections = wrapVideoSections(document, main);
    if (videoSections) emittedBlocks.push(`video-embed×${videoSections}`);

    // 1a-2. A tweet in a col-6 BESIDE a text column → split-left tweet section
    //       (tweet left, article text right). Runs before wrapEmbeds so such
    //       tweets become sections; standalone tweets fall through to inline.
    const tweetSections = wrapTweetSections(document, main);
    if (tweetSections) emittedBlocks.push(`tweet-split×${tweetSections}`);

    // 1a-3. An Instagram embed in a col beside text → split-left section
    //        (embed-instagram left, article text right), like the tweet case.
    //        Standalone (full-width) IG embeds fall through to the inline handler.
    const igSections = wrapInstagramSections(document, main);
    if (igSections) emittedBlocks.push(`instagram-split×${igSections}`);

    // 1b. Convert social embeds in the body IN PLACE (reading order preserved),
    //     before any other swap: tweets → quote(tweet), IG posts → embed-instagram.
    wrapEmbeds(document, main);

    // 1c. Convert two-column data layouts (e.g. Winners | NJTL Chapter) into
    //     `table` blocks. Runs before columns-media so a data grid isn't mistaken
    //     for a media column.
    const tablesBuilt = wrapDataTables(document, main);
    if (tablesBuilt) emittedBlocks.push(`table×${tablesBuilt}`);

    // 1c-2. Single-column grade/category winners list ("…following categories:"
    //       + Freshmen/Sophomores/… groups) → a ONE-COLUMN table, one row per
    //       group (header + its "Name - Chapter" lines kept together).
    const gradeTables = wrapGradeListTable(document, main);
    if (gradeTables) emittedBlocks.push(`table-grade×${gradeTables}`);

    // 1d. Wrap the inline body image(s) into columns media block(s) (text beside
    //     image on desktop), matching the source article layout. Each image's
    //     side (media-left/right) is read from its rendered position. Runs BEFORE
    //     the layout-table flatten so beside-text held in a layout table is still
    //     measurable for pairing.
    const mediaBlocks = wrapMediaColumns(document, main);
    if (mediaBlocks) emittedBlocks.push(`columns-media×${mediaBlocks}`);

    // 1e. Flatten leftover layout tables (nested single-column prose wrappers)
    //     into plain paragraphs so no stray bordered tables ship.
    flattenLayoutTables(document, main);

    // 2. Replace the SOCIAL share widget with our social block. In the STATIC DOM
    //    the source bar is `div.socialmediasharing` (the "Share via …" labels are
    //    JS-injected and absent). Alignment is data-driven from the source class:
    //    a `position-right` modifier → social (right) (newer layout, e.g. Aerie);
    //    plain `.socialmediasharing` → social (left) (older layout, beside the
    //    reactions widget).
    const shareEl = main.querySelector('.socialmediasharing');
    if (shareEl) {
      const align = shareEl.classList.contains('position-right') ? 'right' : 'left';
      shareEl.replaceWith(buildSocialBlock(document, align));
    }

    // 2b. Replace the source REACTIONS widget (`div.reactions`, older articles
    //     only) with our custom-widget-reactions block.
    const reactionsEl = main.querySelector('.reactions');
    if (reactionsEl) {
      reactionsEl.replaceWith(buildReactionsBlock(document));
    }

    // 3. Replace the RELATED ARTICLES widget with our cards (news) block.
    //    The real feed is a <ul> of <li> cards; convert it in place and keep the
    //    <h2>Related Articles</h2> heading above it.
    const relatedHeading = [...main.querySelectorAll('h2')].find((h) => /related articles/i.test(h.textContent));
    const relatedUl = relatedHeading
      ? [...main.querySelectorAll('ul')].find((ul) => ul.querySelector('li a[href*="/news/"], li a[href]'))
      : null;
    if (relatedUl) {
      relatedUl.replaceWith(buildRelatedBlock(document, relatedUl));
    }

    // 4. Built-in rules — metadata (title/description/image), images, links.
    //    Append an <hr> first so the Metadata block lands in its OWN section (a
    //    section break) — otherwise a top-level `.metadata` div renders visibly.
    //    (Matches the home-page importer.)
    main.appendChild(document.createElement('hr'));
    WebImporter.rules.createMetadata(main, document);

    // 5. Enrich the Metadata block. createMetadata builds a `.metadata` table at
    //    the end of `main` (only Title survives from this source's head); append
    //    our derived rows to it (or create one) rather than overwrite.
    // Target the PAGE metadata table specifically — its first cell is exactly
    // "Metadata". Must NOT match a "Section Metadata" table (e.g. the split-right
    // video section), or our page rows would land in the wrong block.
    const metaTable = [...main.querySelectorAll('table')].find((t) => {
      const first = t.querySelector('th, td');
      return first && /^\s*metadata\s*$/i.test(first.textContent || '');
    });
    // value may be a string OR a DOM node (e.g. the Image <img>). Skip empties,
    // and don't duplicate a key createMetadata already emitted (e.g. Description
    // if the head ever provides it).
    const hasRow = (key) => !!metaTable && [...metaTable.querySelectorAll('tr')]
      .some((tr) => /^(td|th)$/i.test(tr.firstElementChild?.tagName || '')
        && (tr.firstElementChild.textContent || '').trim().toLowerCase() === key.toLowerCase());
    const addMetaRow = (key, value) => {
      if (!metaTable || !value || hasRow(key)) return;
      const tr = document.createElement('tr');
      const k = document.createElement('td');
      k.textContent = key;
      const v = document.createElement('td');
      if (typeof value === 'string') v.textContent = value;
      else v.append(value);
      tr.append(k, v);
      metaTable.querySelector('tbody')?.append(tr) || metaTable.append(tr);
    };
    // Description + Image derived from the article (see step 0). Add the Image row
    // BEFORE adjustImageUrls so its <img src> is normalized/localized identically
    // to the body images.
    addMetaRow('Description', metaDescription);
    addMetaRow('Image', metaImage);
    addMetaRow('Template', 'news');
    // Publication Date resolved from the sitemap <lastmod> in onLoad; params may
    // override it explicitly. If neither is available it's omitted (query-index
    // lastModified is the documented fallback).
    addMetaRow('Publication Date', params?.publicationDate || resolvedPublicationDate);

    // 6. Image + link URL rules — run AFTER the Image metadata row is in place so
    //    the metadata image URL is adjusted alongside the body images.
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);


    // 7. Sanitized path.
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: emittedBlocks,
      },
    }];
  },
};
