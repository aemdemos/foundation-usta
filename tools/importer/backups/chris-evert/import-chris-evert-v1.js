/* eslint-disable */
/* global WebImporter */

/*
 * import-chris-evert-v1 — dedicated importer for the USTA Foundation
 * get-involved/special-funds/chris-evert-50th-anniversary.html campaign page.
 *
 * Section sequence (measured on the live rendered DOM at 1280):
 *   1. Centered heading "Celebrating a champion, on and off the court." (`center`).
 *   2. Columns — campaign copy (3 paras) LEFT + Chris Evert photo (20250820-
 *      chrissie50.jpg) RIGHT.
 *   3. SPLIT-EVEN — a Quote block (Selah Stibbins testimonial) LEFT + the inline
 *      donation form (custom-form-donate → FundraiseUp CHRIS50) RIGHT, two equal
 *      columns (`split-even`). Content reproduced from the approved
 *      section-split-even-donate sample.
 *   4. Trailing full-bleed black strip above the footer (Spacer, stats-band-bg).
 *
 * `Theme = general` — CSS-only page; adds body.general (no template fetch).
 */

import cleanupTransformer from './transformers/ustafoundation-cleanup.js';

const PAGE_TEMPLATE = {
  name: 'general',
  description: 'USTA Foundation Chris Evert 50th anniversary campaign: centered heading, image+text columns, and a split-even quote + donation form.',
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

const norm = (s) => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

function absUrl(u) {
  if (!u) return u;
  try { return new URL(u, ORIGIN).href; } catch { return u; }
}

// CTA paragraph: decorateButtons() only buttonizes a <p><a> wrapped in <strong>
// (→ solid blue CTA). A bare <p><a> stays an unstyled link.
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

function cloneImg(document, srcImg) {
  if (!srcImg) return null;
  const img = document.createElement('img');
  img.setAttribute('src', absUrl(srcImg.getAttribute('src')));
  img.setAttribute('alt', srcImg.getAttribute('alt') || '');
  return img;
}

// Collect de-duplicated heading/paragraph clones from a container. The source
// duplicates text per breakpoint, so read the FIRST .cmp-text and de-dupe by
// normalized text.
function collectText(document, container, {
  headings = 'h1,h2,h3,h4,h5,h6', maxParas = Infinity, skip = [],
} = {}) {
  if (!container) return [];
  const out = [];
  const seen = new Set();
  let paraCount = 0;
  // A section may hold SEVERAL .cmp-text blocks (e.g. an intro cmp-text + a
  // columns-body cmp-text, each duplicated per breakpoint). Read them ALL in
  // document order; the `seen` de-dupe drops the desktop/mobile copies so each
  // distinct heading/paragraph is emitted once.
  const sources = container.querySelectorAll('.cmp-text');
  const roots = sources.length ? [...sources] : [container];
  roots.forEach((src) => {
    src.querySelectorAll(`${headings},p`).forEach((el) => {
      const text = norm(el.textContent);
      if (!text) return;
      if (skip.some((re) => re.test(text))) return;
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
  });
  return out;
}

// Top-level .container.responsivegrid section that holds a given heading.
function sectionOfHeading(main, re, tag = 'h1,h2,h3,h4') {
  const h = [...main.querySelectorAll(tag)].find((x) => re.test(norm(x.textContent)));
  if (!h) return { heading: null, container: null };
  let c = h;
  for (let i = 0; i < 8 && c.parentElement; i += 1) {
    c = c.parentElement;
    if (c.matches && c.matches('.container.responsivegrid')) break;
  }
  return { heading: h, container: c };
}

// The section image is a SIBLING of the heading's text container. Walk up from a
// reference node until an ancestor also contains a cmp-image, return the first.
function nearbyImage(refNode, limit = 8) {
  let n = refNode;
  for (let i = 0; i < limit && n && n.parentElement; i += 1) {
    n = n.parentElement;
    const img = n.querySelector && n.querySelector('img.cmp-image__image, img[src*=".coreimg"], img');
    if (img) return img;
  }
  return null;
}

// First CTA (href+text) inside a section container.
function ctaOf(container) {
  if (!container) return null;
  return [...container.querySelectorAll('.button a[href], a.cmp-button[href], a.button[href]')]
    .map((a) => ({ href: a.getAttribute('href'), text: norm(a.textContent) }))
    .filter((c) => c.text)[0] || null;
}

// Emit a Columns block. imageSide 'left' → image cell first; 'right' → text first.
function columnsBlock(document, { textNodes, img, imageSide }) {
  const textCell = textNodes.length ? textNodes : [''];
  const imgCell = img ? [cloneImg(document, img)] : [''];
  const rows = imageSide === 'left'
    ? [['Columns'], [imgCell, textCell]]
    : [['Columns'], [textCell, imgCell]];
  return WebImporter.DOMUtils.createTable(rows, document);
}

// Leading yellow strip Spacer, its own section before a yellow band. Source
// measured ~30px (a taller strip than who-we-are's 17px), then a ~16px white gap.
function yellowStrip(document) {
  return WebImporter.Blocks.createBlock(document, {
    name: 'Spacer', cells: { color: 'section-yellow-bg', desktop: '30px' },
  });
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.querySelector('#mainContent') || document.querySelector('main') || document.body;
    const emittedBlocks = [];

    executeCleanup('beforeTransform', main, { url, params });
    executeCleanup('afterTransform', main, { url, params });

    const title = document.title;

    // ---- Capture source content BEFORE rebuilding main ----

    // HERO
    const h1 = main.querySelector('h1');
    const heroH1Text = h1 ? norm(h1.textContent) : 'Help us get young people ready for life.';
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
    // Chris Evert campaign content (fixed — captured from the live DOM).
    const HEADING = 'Celebrating a champion, on and off the court.';
    const COLUMNS_PARAS = [
      'Join in celebrating the 50th anniversary of Chris Evert’s first US Open title by championing the next generation!',
      'Make a $50 gift to support our Jimmy Evert Merit Scholarship Fund to help young people from under-resourced communities receive the training and academic support they need to prepare for life on and off the court.',
      "The Jimmy Evert Merit Scholarship Fund, named after Chris' father, supports academic and college readiness programs, and advanced tennis training through clinics, private lessons and camps for young people from our chapters, primarily high-performance Excellence Program participants, who have the potential to play collegiate tennis, across the country. This training prepares young people to be champions in all aspects of their lives.",
    ];
    const COLUMN_IMG = '/content/dam/usta-foundation/get-involved/20250820-chrissie50.jpg';
    const COLUMN_IMG_ALT = 'Chris Evert';
    // split-even: Quote (Selah Stibbins) + custom-form-donate (from the sample).
    const QUOTE_PARAS = [
      '“The coaches and players at the Evert Academy pushed me to become the best tennis player and person I could be.',
      '"The Jimmy Evert Scholarship really helped make it possible for me to excel in my first year competing in college.”',
    ];
    const QUOTE_ATTR = "- Selah Stibbins, Howard University '26";
    const DONATE_FORM = {
      title: 'Celebrating a Champion!',
      amounts: '50 | 50 | 50 | 50 | 50 | 50',
      designate: 'Designate to the Jimmy Evert Merit Scholarship Fund',
      cta: 'Donate and Support',
      href: 'https://ustaf.donorsupport.co/page/CHRIS50?elementTitle=Donation%20Form&elementName=Chris%2050%20Donation%20Embed',
    };

    const p = (text) => { const el = document.createElement('p'); el.textContent = text; return el; };
    const cell = (text) => { const d = document.createElement('div'); d.textContent = text; return d; };

    // ---- Rebuild main into the target section structure ----
    main.textContent = '';

    // SECTION 1 — centered campaign heading.
    const h = document.createElement('h1');
    h.textContent = HEADING;
    main.append(h);
    main.append(WebImporter.Blocks.createBlock(document, {
      name: 'Section Metadata', cells: { style: 'center' },
    }));
    emittedBlocks.push('default-content(heading,center)');

    // SECTION 2 — Columns: campaign copy LEFT + Chris Evert photo RIGHT.
    main.append(document.createElement('hr'));
    {
      const img = document.createElement('img');
      img.setAttribute('src', absUrl(COLUMN_IMG));
      img.setAttribute('alt', COLUMN_IMG_ALT);
      main.append(columnsBlock(document, { textNodes: COLUMNS_PARAS.map(p), img, imageSide: 'right' }));
      emittedBlocks.push('columns(campaign,image-right)');
    }

    // SECTION 3 — split-even: Quote LEFT + donation form RIGHT.
    main.append(document.createElement('hr'));
    {
      const quoteBody = QUOTE_PARAS.map(p);
      const quoteAttr = [p(QUOTE_ATTR)];
      main.append(WebImporter.DOMUtils.createTable([
        ['Quote'], [quoteBody], [quoteAttr],
      ], document));
      const a = document.createElement('a');
      a.href = DONATE_FORM.href; a.textContent = DONATE_FORM.href;
      const linkCell = document.createElement('div'); linkCell.append(a);
      main.append(WebImporter.DOMUtils.createTable([
        ['Custom Form Donate'],
        [cell(DONATE_FORM.title)],
        [cell(DONATE_FORM.amounts)],
        [cell(DONATE_FORM.designate)],
        [cell(DONATE_FORM.cta)],
        [linkCell],
      ], document));
      main.append(WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata', cells: { style: 'split-even' },
      }));
      emittedBlocks.push('split-even(quote+donate)');
    }

    // SECTION 4 — trailing black band
    main.append(document.createElement('hr'));
    main.append(WebImporter.Blocks.createBlock(document, {
      name: 'Spacer', cells: { color: 'stats-band-bg', desktop: '17px' },
    }));
    emittedBlocks.push('spacer(trailing-black-band)');

    // METADATA
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

    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // adjustImageUrls absolutizes ALL img srcs against the source origin. The
    // cards-expand images are ALREADY-LOCALIZED /media-da/ assets (committed with
    // the block sample), so restore their relative path — otherwise they become
    // https://www.ustafoundation.com/media-da/… (404). localize-assets then leaves
    // these relative /media-da/ paths untouched.
    main.querySelectorAll('img[src*="/media-da/"]').forEach((img) => {
      const src = img.getAttribute('src') || '';
      const idx = src.indexOf('/media-da/');
      if (idx > 0) img.setAttribute('src', src.slice(idx));
    });

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
