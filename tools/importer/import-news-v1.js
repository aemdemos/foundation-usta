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
 *   Title / Description / Image — auto-extracted by WebImporter.rules.createMetadata
 *   Template = news            — drives templates/news/news.(css|js)
 *   Publication Date           — injected from the URL→date map when available
 *   Breadcrumb Title           — optional short label (left blank; title is used)
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
 * Build a `social (right)` block table so the imported page carries our own
 * share bar (the source's is a dynamic widget). The block is authored empty —
 * blocks/social decorate() builds the five share buttons and shares the current
 * page; the `right` variant right-aligns it on desktop as on the source.
 */
function buildSocialBlock(document) {
  return WebImporter.DOMUtils.createTable([
    ['Social (right)'],
    [''],
  ], document);
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
    const titleH = card.querySelector('h3, h2, h4');
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
 * Wrap the article's inline body image into a `columns` media block so it renders
 * text-left / image-right on desktop (and stacks on mobile) — matching the source,
 * where the merch image occupies the right half beside the preceding body copy.
 *
 * The source marks the image as a picture-only paragraph, optionally followed by a
 * caption paragraph. We take the run of body paragraphs immediately BEFORE the
 * image as the left (text) cell, and the image + caption as the right cell, then
 * replace that run with one `.columns` block (row of two cells). Returns true if a
 * media block was created.
 */
function wrapMediaColumns(document, root) {
  // Find the body image. At transform time it may sit in a <p> OR as a bare
  // <img>/<picture> in a div (WebImporter wraps loose nodes in <p> only later).
  // Pick the first content image that is NOT part of the related-cards feed.
  const bodyImg = [...root.querySelectorAll('img, picture')].find((el) => {
    if (el.closest('ul')) return false; // skip related-articles thumbnails
    const alt = (el.getAttribute('alt') || el.querySelector?.('img')?.getAttribute('alt') || '');
    return !/facebook|twitter|linkedin|copy|print|checkmark/i.test(alt);
  });
  if (!bodyImg) return false;
  // the element that directly wraps the image (a <p> or a container <div>)
  const imgP = bodyImg.closest('p') || bodyImg.parentElement;
  if (!imgP) return false;

  // caption text = the text inside the image's wrapper (minus the image), else
  // the next text-only paragraph after it.
  let captionText = '';
  const wrapClone = imgP.cloneNode(true);
  wrapClone.querySelectorAll('picture, img').forEach((n) => n.remove());
  captionText = (wrapClone.textContent || '').trim();
  if (!captionText) {
    const nx = imgP.nextElementSibling;
    if (nx && nx.tagName === 'P' && !nx.querySelector('picture, img')) {
      captionText = (nx.textContent || '').trim();
      if (captionText) nx.remove();
    }
  }

  // Gather the body paragraphs that sit BESIDE the image (source: the merch image
  // is level with the two paragraphs directly above it — "This grant…" and "To
  // celebrate…", NOT the earlier "Central…" which is full-width above). The image
  // is grouped in the source with its immediately-preceding paragraph block, so
  // take the paragraphs from the image's PREVIOUS sibling group; fall back to the
  // 2 nearest preceding paragraphs by document order.
  const beforeImg = (el) => !!(bodyImg.compareDocumentPosition(el)
    & Node.DOCUMENT_POSITION_PRECEDING);
  let textEls = [];
  // preferred: the paragraphs inside the image wrapper's previous sibling element
  const prevGroup = imgP.previousElementSibling;
  if (prevGroup) {
    const groupParas = [...prevGroup.querySelectorAll('p')]
      .filter((p) => (p.textContent || '').trim() && !p.querySelector('picture, img'));
    if (prevGroup.tagName === 'P' && (prevGroup.textContent || '').trim()) textEls = [prevGroup];
    else if (groupParas.length) textEls = groupParas;
  }
  if (!textEls.length) {
    const allTextP = [...root.querySelectorAll('p')].filter((p) => (p.textContent || '').trim()
      && !p.querySelector('picture, img')
      && !p.closest('ul')
      && beforeImg(p));
    textEls = allTextP.slice(-2); // the 2 paragraphs nearest above the image
  }
  if (!textEls.length) return false;

  const textCell = document.createElement('div');
  textEls.forEach((el) => textCell.append(el.cloneNode(true)));
  const mediaCell = document.createElement('div');
  const pic = bodyImg.tagName === 'PICTURE' ? bodyImg : (bodyImg.closest('picture') || bodyImg);
  mediaCell.append(pic.cloneNode(true));
  if (captionText) {
    const cap = document.createElement('p');
    const em = document.createElement('em');
    em.textContent = captionText;
    cap.append(em);
    mediaCell.append(cap);
  }

  const table = WebImporter.DOMUtils.createTable([
    ['Columns (media-right)'],
    [textCell, mediaCell],
  ], document);

  // insert the block where the image was; remove the original text paragraphs
  // (caption was already removed above if it was a separate paragraph).
  imgP.replaceWith(table);
  textEls.forEach((el) => el.remove());
  return true;
}

export default {
  transform: ({ document, url, params }) => {
    const main = document.querySelector('#mainContent') || document.querySelector('main') || document.body;

    // 1. cleanup (isolate content root, strip chrome/tracking).
    executeTransformers('beforeTransform', main, { url, params });
    executeTransformers('afterTransform', main, { url, params });

    // 1b. Wrap the inline body image into a columns media-right block (text left /
    //     image right on desktop), matching the source article layout.
    wrapMediaColumns(document, main);

    // 2. Replace the dynamic SOCIAL widget with our social block.
    //    The source share bar is a container whose descendant <a>/<img> carry the
    //    labels "Share via Facebook/Twitter/LinkedIn", "Copy link", "Show print
    //    version" (a Vue widget). Match on those labels (aria-label OR img alt) and
    //    pick the TIGHTEST container holding all of them, so we swap just the bar.
    const labelText = (el) => (
      `${el.getAttribute && el.getAttribute('aria-label') || ''} ${el.getAttribute && el.getAttribute('alt') || ''}`
    ).toLowerCase();
    const hasShareLabels = (el) => {
      const all = [el, ...el.querySelectorAll('a, img')].map(labelText).join(' ');
      return all.includes('facebook') && all.includes('linkedin')
        && (all.includes('copy link') || all.includes('print'));
    };
    // candidates = smallest elements that still contain all share labels
    const shareCandidates = [...main.querySelectorAll('div, p, span, ul')].filter(hasShareLabels);
    const shareEl = shareCandidates.sort((a, b) => (
      a.querySelectorAll('*').length - b.querySelectorAll('*').length
    ))[0];
    if (shareEl) {
      // drop the copy-confirmation bits (Checkmark img alt="" + "Link Copied!")
      const scope = shareEl.parentElement || main;
      [...scope.querySelectorAll('p, span, div')].forEach((n) => {
        const t = (n.textContent || '').trim().toLowerCase();
        if (t === 'link copied!' && n !== shareEl) n.remove();
      });
      scope.querySelectorAll('img[alt=""]').forEach((img) => {
        const src = (img.getAttribute('src') || '').toLowerCase();
        if (src.includes('checkmark')) {
          const wrap = img.closest('p, span, div');
          if (wrap && wrap !== shareEl) wrap.remove();
        }
      });
      shareEl.replaceWith(buildSocialBlock(document));
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
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 5. Ensure the page carries the `news` template + a publication date.
    //    createMetadata builds a Metadata block at the end of `main`; append our
    //    extra rows to it (or create one) rather than overwrite.
    const metaTable = [...main.querySelectorAll('table')].find((t) => {
      const first = t.querySelector('th, td');
      return first && /metadata/i.test(first.textContent);
    });
    const addMetaRow = (key, value) => {
      if (!metaTable || !value) return;
      const tr = document.createElement('tr');
      const k = document.createElement('td');
      k.textContent = key;
      const v = document.createElement('td');
      v.textContent = value;
      tr.append(k, v);
      metaTable.querySelector('tbody')?.append(tr) || metaTable.append(tr);
    };
    addMetaRow('Template', 'news');
    // Publication date: injected by the runner via params if a URL→date map is
    // provided; otherwise left for the author / query-index lastModified fallback.
    if (params?.publicationDate) addMetaRow('Publication Date', params.publicationDate);


    // 6. Sanitized path.
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
        blocks: ['social', 'cards-news'],
      },
    }];
  },
};
