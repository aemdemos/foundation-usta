/* eslint-disable */
/* global WebImporter */

/*
 * import-general-v1 — importer for the USTA Foundation "general interior" page
 * template. First target: who-we-are.html. These are marketing/landing pages
 * built from the shared block vocabulary (hero, columns, cards, default content
 * on colour bands) rather than the news / leadership templates.
 *
 * Source shape of who-we-are (measured on the live rendered DOM at 1280):
 *   1. HERO — full-bleed background photo (who-we-are-header.jpg, applied as an
 *      inline background-image on a .cmp-container) + overlaid white H1
 *      "About the USTA Foundation", a subhead <p>, and two CTA buttons
 *      (WHAT WE DO / OUR IMPACT).  → Hero (text-up) — authored image + top-left
 *      text panel, no overlay (interior-page hero).
 *   2. "We transform lives on and off the tennis court." — centered intro
 *      heading + two paragraphs, on white.  → default content, section
 *      style `center, narrow`.
 *   3. "Our History" — heading + 3 paragraphs on the LEFT, Judy Levering photo
 *      on the RIGHT.  → Columns (text cell, image cell) = image-right.
 *   4. FULL-BLEED YELLOW BAND (#FFEFBE):
 *        a) centered "Our Leadership and Staff" heading + intro + LEARN MORE
 *           button (default content),
 *        b) Chris Evert photo on the LEFT + 3 quote paragraphs & a
 *           "Chris Evert, Chairperson" attribution on the RIGHT.
 *           → Columns (image cell, text cell) = image-left.
 *      The whole band is one section tagged `section-yellow` (paints the section
 *      background full-bleed; the inner content stays on the shared grid — same
 *      mechanism as the homepage `highlight` band).
 *   5. "Our Supporters" — heading + 2 paragraphs + LEARN MORE (default content).
 *   6. Four supporter tiles (INDIVIDUAL DONORS / SIGNATURE EVENTS /
 *      CORPORATE & FOUNDATIONS / PLANNED GIVING): square photo + <h4> label.
 *      → Cards (tiles).  (This is literally the source of the cards-tiles sample.)
 *
 * The source ships DESKTOP + MOBILE duplicate copies of most text blocks (one
 * hidden per breakpoint). We read text from the FIRST `.cmp-text` in each
 * container and de-dupe by normalized text so nothing is imported twice.
 *
 * `Theme = general` — these interior pages are CSS-only; `Theme` adds a
 * `body.general` class with no template CSS/JS fetch (see the leadership page's
 * Template→Theme note). Section colour/`center`/`narrow` styles do the rest.
 */

import cleanupTransformer from './transformers/ustafoundation-cleanup.js';

const PAGE_TEMPLATE = {
  name: 'general',
  description: 'USTA Foundation general interior page: hero banner, centered intro, image+text columns, a full-bleed yellow band (intro + image+text columns), and a 4-up cards-tiles grid.',
  blocks: [],
  sections: [],
};

const ORIGIN = 'https://www.ustafoundation.com';

function executeCleanup(hookName, element, payload) {
  try {
    cleanupTransformer.call(null, hookName, element, { ...payload, template: PAGE_TEMPLATE });
  } catch (e) {
    console.error(`Cleanup transformer failed at ${hookName}:`, e);
  }
}

const norm = (s) => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

// Make a source-relative URL absolute against the origin (adjustImageUrls needs
// absolute src to download the asset).
function absUrl(u) {
  if (!u) return u;
  try { return new URL(u, ORIGIN).href; } catch { return u; }
}

// Build a CTA paragraph. The project's decorateButtons() (scripts.js) only turns
// a standalone <p><a> into a button when the link is wrapped in <strong> (→ a
// solid `.primary`-less blue button, matching the source's blue CTA) or <em>.
// A bare <p><a> stays an unstyled text link, so wrap the link in <strong>.
function ctaParagraph(document, href, text) {
  const p = document.createElement('p');
  const strong = document.createElement('strong');
  const a = document.createElement('a');
  a.href = href;
  a.textContent = text;
  strong.append(a);
  p.append(strong);
  return p;
}

// Clone an <img>, forcing an absolute src and preserving alt (a picture wrapper
// is not needed — adjustImageUrls + the platform handle bare <img>).
function cloneImg(document, srcImg) {
  if (!srcImg) return null;
  const img = document.createElement('img');
  img.setAttribute('src', absUrl(srcImg.getAttribute('src')));
  img.setAttribute('alt', srcImg.getAttribute('alt') || '');
  return img;
}

// Collect the de-duplicated, non-empty heading/paragraph nodes from a container,
// reading only the FIRST `.cmp-text` block (the source duplicates text per
// breakpoint). Returns fresh <hN>/<p> clones.
function collectText(document, container, { headings = 'h1,h2,h3,h4,h5,h6', maxParas = Infinity } = {}) {
  if (!container) return [];
  const out = [];
  const seen = new Set();
  const src = container.querySelector('.cmp-text') || container;
  let paraCount = 0;
  src.querySelectorAll(`${headings},p`).forEach((el) => {
    const text = norm(el.textContent);
    if (!text) return;
    const key = `${el.tagName}:${text}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (/^P$/i.test(el.tagName)) {
      if (paraCount >= maxParas) return;
      paraCount += 1;
    }
    const clone = document.createElement(el.tagName.toLowerCase());
    clone.innerHTML = el.innerHTML;
    out.push(clone);
  });
  return out;
}

// Find the top-level section container that holds a given heading.
function sectionOfHeading(main, re, tag = 'h1,h2') {
  const h = [...main.querySelectorAll(tag)].find((x) => re.test(norm(x.textContent)));
  if (!h) return { heading: null, container: null };
  let c = h;
  for (let i = 0; i < 6 && c.parentElement; i += 1) {
    c = c.parentElement;
    if (c.matches && c.matches('.container.responsivegrid')) break;
  }
  return { heading: h, container: c };
}

// The source authors the section IMAGE as a SIBLING of the heading's text
// container (both sit inside a shared parent grid), so it is NOT found inside
// `sectionOfHeading().container`. Walk UP from a reference node until an ancestor
// also contains an <img>, then return the FIRST such image. `limit` caps the
// climb so we never grab a page-wide image from a distant section.
function nearbyImage(refNode, limit = 7) {
  let n = refNode;
  for (let i = 0; i < limit && n && n.parentElement; i += 1) {
    n = n.parentElement;
    const img = n.querySelector && n.querySelector('img');
    if (img) return img;
  }
  return null;
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.querySelector('#mainContent') || document.querySelector('main') || document.body;
    const emittedBlocks = [];

    // 1. cleanup (strip site chrome/tracking).
    executeCleanup('beforeTransform', main, { url, params });
    executeCleanup('afterTransform', main, { url, params });

    const title = document.title;

    // ---- Capture source content BEFORE rebuilding main ----

    // HERO
    const h1 = main.querySelector('h1');
    const heroH1Text = h1 ? norm(h1.textContent) : 'About the USTA Foundation';
    // hero background element (inline background-image on a .cmp-container)
    let heroBgEl = h1;
    let heroBgUrl = null;
    while (heroBgEl && heroBgEl !== main) {
      const style = heroBgEl.getAttribute && heroBgEl.getAttribute('style');
      if (style && /background-image\s*:\s*url/i.test(style)) {
        const m = style.match(/background-image\s*:\s*url\((['"]?)([^'")]+)\1\)/i);
        if (m) { heroBgUrl = m[2]; break; }
      }
      heroBgEl = heroBgEl.parentElement;
    }
    const heroContainer = (h1 && h1.closest('.container.responsivegrid')) || null;
    const heroSubhead = heroContainer ? norm(heroContainer.querySelector('.cmp-text p')?.textContent || '') : '';
    const heroCtas = heroContainer
      ? [...heroContainer.querySelectorAll('.button a[href], a.cmp-button[href]')].map((a) => ({
        href: a.getAttribute('href'), text: norm(a.textContent),
      })).filter((c) => c.text)
      : [];

    // TRANSFORM-LIVES centered intro
    const transformSec = sectionOfHeading(main, /^We transform lives/);
    const transformNodes = collectText(document, transformSec.container);

    // HISTORY (image right). The image is a sibling of the heading's text
    // container, so search up from the heading for the nearby <img>.
    const historySec = sectionOfHeading(main, /^Our History/);
    const historyText = collectText(document, historySec.container);
    const historyImg = (historySec.container && historySec.container.querySelector('img'))
      || (historySec.heading ? nearbyImage(historySec.heading) : null);

    // YELLOW BAND — leadership intro (default content) + Evert columns (image left)
    const leadSec = sectionOfHeading(main, /^Our Leadership and Staff/);
    const leadText = collectText(document, leadSec.container, { maxParas: 1 });
    const leadCta = leadSec.container
      ? [...leadSec.container.querySelectorAll('.button a[href], a.cmp-button[href]')].map((a) => ({
        href: a.getAttribute('href'), text: norm(a.textContent),
      })).filter((c) => c.text)[0]
      : null;

    // Evert quote+photo — the teaser inside the yellow band
    const evertAttr = [...main.querySelectorAll('h6, [class*="title"]')]
      .find((x) => /Chris Evert/i.test(norm(x.textContent)));
    let evertWrap = evertAttr;
    for (let i = 0; i < 5 && evertWrap && evertWrap.parentElement; i += 1) {
      evertWrap = evertWrap.parentElement;
      if (evertWrap.querySelector && evertWrap.querySelector('img')) break;
    }
    // The Evert photo is a sibling of the quote text container — search up from
    // the attribution for the nearby <img> (same pattern as the History image).
    const evertImg = (evertWrap && evertWrap.querySelector('img'))
      || (evertAttr ? nearbyImage(evertAttr) : null);
    // quote paragraphs (dedupe desktop/mobile) + attribution as the last line
    const evertParas = [];
    const evertSeen = new Set();
    if (evertWrap) {
      evertWrap.querySelectorAll('p').forEach((p) => {
        const t = norm(p.textContent);
        if (t.length < 4 || evertSeen.has(t)) return;
        evertSeen.add(t);
        const clone = document.createElement('p');
        clone.innerHTML = p.innerHTML;
        evertParas.push(clone);
      });
    }
    const evertAttrText = evertAttr ? norm(evertAttr.textContent) : '';

    // SUPPORTERS intro (default content)
    const supSec = sectionOfHeading(main, /^Our Supporters/);
    const supText = collectText(document, supSec.container);
    const supCta = supSec.container
      ? [...supSec.container.querySelectorAll('.button a[href], a.cmp-button[href]')].map((a) => ({
        href: a.getAttribute('href'), text: norm(a.textContent),
      })).filter((c) => c.text)[0]
      : null;

    // CARDS TILES — 4 supporter tiles (square image + <h4> label)
    const tileHeads = [...main.querySelectorAll('h4')]
      .filter((h) => /INDIVIDUAL DONORS|SIGNATURE EVENTS|CORPORATE|PLANNED GIVING/i.test(norm(h.textContent)));
    const tiles = tileHeads.map((h) => {
      let w = h;
      for (let i = 0; i < 4 && w.parentElement; i += 1) {
        w = w.parentElement;
        if (w.querySelector && w.querySelector('img')) break;
      }
      return { label: norm(h.textContent), img: w ? w.querySelector('img') : null };
    });

    // ---- Rebuild main into the target section structure ----
    main.textContent = '';

    // SECTION 1 — Hero (banner)
    const heroCells = [];
    if (heroBgUrl) {
      const bg = document.createElement('img');
      bg.setAttribute('src', absUrl(heroBgUrl));
      bg.setAttribute('alt', '');
      heroCells.push([bg]);
    }
    const heroContentCell = [];
    const heroHeading = document.createElement('h1');
    heroHeading.textContent = heroH1Text;
    heroContentCell.push(heroHeading);
    if (heroSubhead) {
      const p = document.createElement('p');
      p.textContent = heroSubhead;
      heroContentCell.push(p);
    }
    heroCtas.forEach((c) => heroContentCell.push(ctaParagraph(document, c.href, c.text)));
    heroCells.push([heroContentCell]);
    // Text-up variant: authored background image + TOP-left text panel, no
    // overlay (the interior-page hero). Distinct from `banner` (homepage/our-
    // impact), whose photo is a fixed CSS asset and whose text is centered.
    main.append(WebImporter.Blocks.createBlock(document, { name: 'Hero (text-up)', cells: heroCells }));
    emittedBlocks.push('hero-text-up');

    // SECTION 2 — centered intro (default content). Source band is centered and
    // caps at 970 on desktop → the generic `medium` width (708/772/970), NOT
    // `narrow` (810, too tight for this copy).
    main.append(document.createElement('hr'));
    transformNodes.forEach((n) => main.append(n));
    main.append(WebImporter.Blocks.createBlock(document, {
      name: 'Section Metadata', cells: { style: 'center, medium' },
    }));
    emittedBlocks.push('default-content(intro)');

    // SECTION 3 — History columns (text left, image right)
    main.append(document.createElement('hr'));
    {
      const textCell = historyText.length ? historyText : [''];
      const imgCell = historyImg ? [cloneImg(document, historyImg)] : [''];
      main.append(WebImporter.DOMUtils.createTable([
        ['Columns'],
        [textCell, imgCell],
      ], document));
      emittedBlocks.push('columns(history,image-right)');
    }

    // SECTION 4 — YELLOW BAND (ONE section). A CENTERED intro (heading + para +
    // LEARN MORE button) followed by an image-left/text-right COLUMNS block
    // (Evert photo + quote + BOLD attribution). Kept in a SINGLE `section-yellow`
    // section so the intro's default-content wrapper and the columns block wrapper
    // are SIBLINGS — the global news spacing rule then puts the source's ~40px gap
    // between them (two separate sections butted with margin:0 and lost that gap).
    // The `yellow-center-intro` style centers ONLY the leading default content
    // (the intro), leaving the columns block full-width (see styles.css).
    main.append(document.createElement('hr'));
    leadText.forEach((n) => main.append(n));
    if (leadCta) main.append(ctaParagraph(document, leadCta.href, leadCta.text));
    {
      const evertTextCell = [...evertParas];
      if (evertAttrText) {
        // Attribution is BOLD ITALIC on the source (an <i> at font-weight 700):
        // wrap in <strong><em> so EDS renders bold + italic.
        const attr = document.createElement('p');
        const strong = document.createElement('strong');
        const em = document.createElement('em');
        em.textContent = evertAttrText;
        strong.append(em);
        attr.append(strong);
        evertTextCell.push(attr);
      }
      const evertImgCell = evertImg ? [cloneImg(document, evertImg)] : [''];
      main.append(WebImporter.DOMUtils.createTable([
        ['Columns'],
        [evertImgCell, evertTextCell.length ? evertTextCell : ['']],
      ], document));
      emittedBlocks.push('columns(evert,image-left)');
    }
    main.append(WebImporter.Blocks.createBlock(document, {
      name: 'Section Metadata', cells: { style: 'section-yellow, yellow-center-intro' },
    }));
    emittedBlocks.push('section-metadata(yellow-band)');

    // SECTION 5 — Supporters intro (default content). Source band is CENTERED and
    // caps at the FULL content width (1170) → `center, wide` (708/902/1170).
    main.append(document.createElement('hr'));
    supText.forEach((n) => main.append(n));
    if (supCta) main.append(ctaParagraph(document, supCta.href, supCta.text));
    main.append(WebImporter.Blocks.createBlock(document, {
      name: 'Section Metadata', cells: { style: 'center, wide' },
    }));
    emittedBlocks.push('default-content(supporters)');

    // SECTION 6 — Cards (tiles)
    main.append(document.createElement('hr'));
    {
      const rows = [['Cards (tiles)']];
      tiles.forEach((t) => {
        const imgCell = t.img ? [cloneImg(document, t.img)] : [''];
        const h4 = document.createElement('h4');
        h4.textContent = t.label;
        rows.push([imgCell, [h4]]);
      });
      main.append(WebImporter.DOMUtils.createTable(rows, document));
      emittedBlocks.push('cards-tiles');
    }

    // SECTION 7 — trailing BLACK band above the footer. The source stacks a
    // full-bleed 17px black strip between the last content section and the footer
    // (same as the homepage). Reproduced as a Spacer block (stats-band-bg = #000)
    // in its own section — the spacer section styles butt it flush to the footer.
    main.append(document.createElement('hr'));
    main.append(WebImporter.Blocks.createBlock(document, {
      name: 'Spacer',
      cells: { color: 'stats-band-bg', desktop: '17px' },
    }));
    emittedBlocks.push('spacer(trailing-black-band)');

    // METADATA block in its own section.
    main.appendChild(document.createElement('hr'));
    WebImporter.rules.createMetadata(main, document);

    const metaTable = [...main.querySelectorAll('table')].find((t) => {
      const first = t.querySelector('th, td');
      return first && /^\s*metadata\s*$/i.test(first.textContent || '');
    });
    const hasRow = (key) => !!metaTable && [...metaTable.querySelectorAll('tr')]
      .some((tr) => (tr.firstElementChild?.textContent || '').trim().toLowerCase() === key.toLowerCase());
    const addMetaRow = (key, value) => {
      if (!metaTable || !value || hasRow(key)) return;
      const tr = document.createElement('tr');
      const k = document.createElement('td');
      k.textContent = key;
      const v = document.createElement('td');
      v.textContent = value;
      tr.append(k, v);
      metaTable.querySelector('tbody')?.append(tr) || metaTable.append(tr);
    };
    addMetaRow('Theme', 'general');

    // Image + link URL rules.
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // Sanitized path.
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: { title, template: PAGE_TEMPLATE.name, blocks: emittedBlocks },
    }];
  },
};
