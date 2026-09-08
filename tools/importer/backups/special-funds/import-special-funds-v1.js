/* eslint-disable */
/* global WebImporter */

/*
 * import-special-funds-v1 — dedicated importer for the USTA Foundation
 * get-involved/special-funds.html interior page (general template, unique
 * section sequence).
 *
 * Section sequence (measured on the live rendered DOM at 1280):
 *   1. HERO (text-up) — bg photo special-funds.jpg + H1 "Give to what matters
 *      most to you." + subhead (no CTA).
 *   2. "Frances Tiafoe Fund" — Columns, image RIGHT + GIVE A GIFT (?form=TIAFOE).
 *   3. YELLOW BAND — "Mackie McDonald College Fund" Columns, image LEFT + GIVE A GIFT.
 *   4. "Jimmy Evert Merit Scholarship Fund" — Columns, image RIGHT + GIVE A GIFT.
 *   5. Cards (expand) — the five special-funds cards (JLLI / Dinkins / Tisdel /
 *      RSPA / Middle States): image + title + description + Donate (?form=…). The
 *      source renders these as FundraiseUp iframes; content is reproduced from the
 *      approved cards-expand block sample (drafts/block-samples/cards-expand).
 *   6. Trailing full-bleed black strip above the footer (Spacer, stats-band-bg).
 *
 * The yellow band is preceded by a leading yellow strip (Spacer section-yellow-bg).
 * `Theme = general` — CSS-only page; adds body.general (no template fetch).
 */

import cleanupTransformer from './transformers/ustafoundation-cleanup.js';

const PAGE_TEMPLATE = {
  name: 'general',
  description: 'USTA Foundation special-funds page: hero (text-up), three fund columns (alternating image side, one yellow band), and a cards-expand grid.',
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
    const heroContainer = (h1 && h1.closest('.container.responsivegrid')) || null;
    const heroSubhead = heroContainer ? norm(heroContainer.querySelector('.cmp-text p')?.textContent || '') : '';

    // Synthesize an <img> from a URL (cards-expand images are DAM assets; the
    // source card widgets are cross-origin iframes with no accessible imagery).
    const imgFromUrl = (src, alt) => {
      if (!src) return null;
      const img = document.createElement('img');
      img.setAttribute('src', absUrl(src));
      img.setAttribute('alt', alt || '');
      return img;
    };

    // helper to capture a fund Columns section by heading (text + image + CTA).
    const captureColumns = (re) => {
      const sec = sectionOfHeading(main, re);
      const text = collectText(document, sec.container);
      const img = (sec.container && sec.container.querySelector('img'))
        || (sec.heading ? nearbyImage(sec.heading) : null);
      const cta = ctaOf(sec.container);
      return { text, img, cta, sec };
    };

    // Three fund sections (image side alternates R / L(yellow) / R).
    const tiafoe = captureColumns(/^Frances Tiafoe Fund/);
    const mackie = captureColumns(/^Mackie McDonald College Fund/);
    const evert = captureColumns(/^Jimmy Evert Merit Scholarship Fund/);

    // 5. Cards (expand) — the five special-funds cards. The source renders these as
    // FundraiseUp iframes (cross-origin, no readable content), so reproduce them
    // from the approved cards-expand block sample. Each: image + title + desc +
    // Donate (?form=…, kept on-origin by scripts/donate.js).
    // Card images reuse the ALREADY-LOCALIZED media-da assets committed with the
    // cards-expand block sample (the source widgets are cross-origin iframes; these
    // were captured for the sample). localize-assets leaves /media-da/ paths as-is.
    const EX = '/media-da/drafts/block-samples/cards-expand';
    const EXPAND_CARDS = [
      { title: 'Judy Levering Leadership Initiative', desc: 'The Judy Levering Leadership Initiative (JLLI) funds the local grassroots leadership needed to help developing chapters become established youth development institutions in their community.', form: 'JLLI', img: `${EX}/media-9a03a0ad89fd58bd72bfeaf13d53fad596068a5b-9a03a0ad.jpeg`, alt: 'Speaker at a podium in front of a Serving Up Dreams backdrop' },
      { title: 'Mayor David N. Dinkins Fund', desc: 'The David N. Dinkins Fund proudly carries forward his vision, fostering readiness on and off the court through tennis, education, life skills and mentoring. Mayor Dinkins believed in the power of opportunity for all, and this Fund embodies that.', form: 'DINKINS', img: `${EX}/media-be96fde0bb8dd0a81987a7ac1152cdff370cc84d-be96fde0.jpeg`, alt: 'Group of young people at a USTA program' },
      { title: 'Donald Lawson Tisdel Scholarship Fund', desc: 'The USTA Foundation named its largest college scholarship fund the Donald Lawson Tisdel College Scholarship Fund. These scholarships will be awarded annually to 20-25 high school seniors.', form: 'TISDEL', img: `${EX}/media-a9480b8a3fdd39fe26b4d5bdbc833e7ebf0cb1f7-a9480b8a.jpeg`, alt: 'College students in USTA Foundation shirts' },
      { title: 'Racquet Sports Professionals Fund', desc: 'The RSPA has selected the USTA Foundation as its charity of choice and is teaming up to raise money for grassroots tennis and education programs benefiting under-resourced young people.', form: 'RSPA', img: `${EX}/media-d31d1fbb7e09da665d8aec5fe20acca1d456c7f7-d31d1fbb.jpeg`, alt: 'Coach with young tennis players on a court' },
      { title: 'USTA Middle States Fund', desc: 'The USTA Middle States fund benefits tennis and education programs for under-resourced young people throughout the USTA Middle States Section.', form: 'MIDDLESTATES', img: `${EX}/media-779d66f2b7e4fbc2590c8f87a77215fbebe7f0f3-779d66f2.jpeg`, alt: 'USTA Middle States volunteer with children' },
    ];
    const SF_FORM_BASE = 'https://www.ustafoundation.com/en/home/get-involved/special-funds.html';

    // ---- Rebuild main into the target section structure ----
    main.textContent = '';

    // SECTION 1 — Hero (text-up)
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
    heroCells.push([heroContentCell]);
    main.append(WebImporter.Blocks.createBlock(document, { name: 'Hero (text-up)', cells: heroCells }));
    emittedBlocks.push('hero-text-up');

    // Emit a fund section: the fund NAME (H2) as a CENTERED heading spanning the
    // full width (source), then a Columns block (body paragraphs + image + GIVE A
    // GIFT). `center-intro` (or `center-intro` in the band) centers only the
    // leading heading; the columns keep their two-column layout. imageSide alternates.
    const fundSection = (fund, imageSide, { yellow = false } = {}) => {
      const heading = fund.text.find((n) => /^H2$/i.test(n.tagName));
      const bodyParas = fund.text.filter((n) => /^P$/i.test(n.tagName));
      if (heading) main.append(heading);
      const colText = [...bodyParas];
      if (fund.cta) colText.push(ctaParagraph(document, fund.cta.href, fund.cta.text));
      main.append(columnsBlock(document, { textNodes: colText.length ? colText : [''], img: fund.img, imageSide }));
      main.append(WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata',
        cells: { style: yellow ? 'section-yellow, center-intro' : 'center-intro' },
      }));
    };

    // SECTION 2 — Frances Tiafoe Fund (image RIGHT)
    main.append(document.createElement('hr'));
    fundSection(tiafoe, 'right');
    emittedBlocks.push('fund(tiafoe,image-right,center-intro)');

    // SECTION 3 — YELLOW BAND: Mackie McDonald College Fund (image LEFT)
    main.append(document.createElement('hr'));
    main.append(yellowStrip(document));
    emittedBlocks.push('spacer(yellow-strip)');
    main.append(document.createElement('hr'));
    fundSection(mackie, 'left', { yellow: true });
    emittedBlocks.push('fund(mackie,image-left,yellow)');

    // SECTION 4 — Jimmy Evert Merit Scholarship Fund (image RIGHT)
    main.append(document.createElement('hr'));
    fundSection(evert, 'right');
    emittedBlocks.push('fund(evert,image-right,center-intro)');

    // SECTION 5 — Cards (expand): a centered intro line + the five special-funds
    // cards. Preceded by a spacer for the source's whitespace above the grid.
    main.append(document.createElement('hr'));
    main.append(WebImporter.Blocks.createBlock(document, {
      name: 'Spacer', cells: { desktop: '80px', mobile: '48px' },
    }));
    emittedBlocks.push('spacer(above-cards-expand)');
    main.append(document.createElement('hr'));
    {
      const intro = document.createElement('p');
      intro.textContent = "Explore more of the USTA Foundation's special philanthropic funds:";
      main.append(intro);
      const rows = [['Cards (expand)']];
      EXPAND_CARDS.forEach((c) => {
        const img = imgFromUrl(c.img, c.alt);
        // media-da paths are already localized — don't re-absolutize them.
        if (c.img.startsWith('/media-da/')) img.setAttribute('src', c.img);
        const title = document.createElement('div'); title.textContent = c.title;
        const desc = document.createElement('div'); desc.textContent = c.desc;
        const donate = document.createElement('div');
        const a = document.createElement('a'); a.href = `${SF_FORM_BASE}?form=${c.form}`; a.textContent = 'Donate';
        donate.append(a);
        rows.push([[img], [title], [desc], [donate]]);
      });
      main.append(WebImporter.DOMUtils.createTable(rows, document));
      // center the intro line ("Explore more…"); the cards-expand block keeps its
      // own grid layout.
      main.append(WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata', cells: { style: 'center' },
      }));
      emittedBlocks.push('cards-expand');
    }

    // SECTION 6 — trailing black band
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
