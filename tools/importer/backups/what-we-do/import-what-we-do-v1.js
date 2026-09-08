/* eslint-disable */
/* global WebImporter */

/*
 * import-what-we-do-v1 — dedicated importer for the USTA Foundation
 * what-we-do.html interior page (general template, unique section sequence).
 *
 * Section sequence (measured on the live rendered DOM at 1280):
 *   1. HERO (text-up) — bg photo what-we-do.jpg + H1
 *      "We get young people ready to succeed in life." + subhead + one CTA "JOIN US".
 *   2. "Our Strategic Priorities" — intro + Cards (content) ×4 (Local Program
 *      Support / Court Refurbishments / College & Career Pathways /
 *      High-Performance Pathways), each square image + h4 + description.
 *   3. YELLOW BAND — centered intro ("Transforming lives since 1969." + lead para)
 *      then Columns image-LEFT (photo + H3 "Carrying on the legacy…" + 3 paras).
 *   4. "The NJTL network serves more than 270 communities nationwide." heading +
 *      a WIDE full-width NJTL map image (≈100vw − gutter, wider than content).
 *   5. "Sustained support. Sustainable impact." — intro + Cards (content) ×4
 *      (Accreditation / Financial Support / Leadership & Vision / Extended Resources).
 *   6. Trailing full-bleed black strip above the footer (Spacer, stats-band-bg).
 *
 * The yellow band is preceded by a leading yellow strip (Spacer section-yellow-bg).
 * `Theme = general` — CSS-only page; adds body.general (no template fetch).
 */

import cleanupTransformer from './transformers/ustafoundation-cleanup.js';

const PAGE_TEMPLATE = {
  name: 'general',
  description: 'USTA Foundation what-we-do page: hero (text-up), two cards-content grids, a yellow band (center-intro + image-left columns), and a wide full-width map image.',
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

// Emit a Cards (content) block from [{title, desc, img}] defs. Each card = square
// image cell + a body cell (h4 title + description paragraph).
function cardsContentBlock(document, cards) {
  const rows = [['Cards (content)']];
  cards.forEach((c) => {
    const imgCell = c.img ? [cloneImg(document, c.img)] : [''];
    const body = [];
    const h4 = document.createElement('h4');
    h4.textContent = c.title;
    body.push(h4);
    if (c.desc) {
      const p = document.createElement('p');
      p.textContent = c.desc;
      body.push(p);
    }
    rows.push([imgCell, body]);
  });
  return WebImporter.DOMUtils.createTable(rows, document);
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
    const heroCtas = heroContainer
      ? [...heroContainer.querySelectorAll('.button a[href], a.cmp-button[href]')].map((a) => ({
        href: a.getAttribute('href'), text: norm(a.textContent),
      })).filter((c) => c.text)
      : [];

    // Synthesize an <img> from an absolute/relative source URL (the card images
    // live inside <noscript> lazy-load wrappers that the cleanup step strips, and
    // the parser doesn't reliably expose them — so each card def carries its real
    // DAM asset path, verified 200 on the source, and localize-assets downloads it).
    const imgFromUrl = (src, alt) => {
      if (!src) return null;
      const img = document.createElement('img');
      img.setAttribute('src', absUrl(src));
      img.setAttribute('alt', alt || '');
      return img;
    };

    // Build a Cards (content) grid from N {title, desc, img, alt} definitions.
    const collectCards = (defs) => defs.map((def) => ({
      title: def.title, desc: def.desc, img: imgFromUrl(def.img, def.alt),
    }));

    // A cards section's INTRO (heading + lead para). The cards themselves live in a
    // separate container, so images are resolved per-card via cardImageByTitle.
    const captureCardsIntro = (re, introHeadings = 'h2') => {
      const sec = sectionOfHeading(main, re);
      const intro = collectText(document, sec.container, { headings: introHeadings, maxParas: 1 });
      return { sec, intro };
    };

    // 2. Our Strategic Priorities — intro + 4 cards.
    const priorities = captureCardsIntro(/^Our Strategic Priorities/);
    const PRIORITY_CARDS = [
      { title: 'Local Program Support', desc: 'We support community organizations through strategic guidance, grants, and professional development opportunities.', img: '/content/dam/usta-foundation/what-we-do/capacity-building.jpg', alt: 'Two NJTL leaders talking' },
      { title: 'Court Refurbishments', desc: 'We grow access to tennis by refurbishing courts in under-resourced communities so that young people and their families have places to play.', img: '/content/dam/usta-foundation/what-we-do/court-refurb.jpg', alt: 'New refurbished tennis court' },
      { title: 'College & Career Pathways', desc: 'We offer scholarships to young people who dream of attending college or post-secondary education, and we offer career pathway programs.', img: '/content/dam/usta-foundation/what-we-do/college-scholarships.jpg', alt: 'Student writing in a notebook' },
      { title: 'High-Performance Pathways', desc: 'We offer no- or low-cost high-performance training opportunities for youth who have potential to play collegiate or professional tennis.', img: '/content/dam/usta-foundation/what-we-do/high-performance.jpg', alt: 'Teenage tennis player hitting backhand' },
    ];

    // 3. YELLOW BAND — centered intro "Transforming lives since 1969." + columns
    // (image LEFT: photo + H3 "Carrying on the legacy…" + 3 paras).
    const transformSec = sectionOfHeading(main, /^Transforming lives since 1969/);
    const transformAll = collectText(document, transformSec.container);
    // intro = the H2 + the first paragraph (the "National Junior Tennis…" lead);
    // columns body = the H3 + remaining paragraphs.
    const transformImg = transformSec.container
      ? transformSec.container.querySelector('img')
      : (transformSec.heading ? nearbyImage(transformSec.heading) : null);
    // LEARN MORE CTA in the columns text cell (→ our-impact). Fall back to the
    // known href if the parser doesn't expose the button inside this container.
    const transformCta = ctaOf(transformSec.container)
      || { href: '/en/home/our-impact.html', text: 'LEARN MORE' };

    // 4. NJTL map — heading + the wide full-width map image.
    const njtlSec = sectionOfHeading(main, /^The NJTL network serves/);
    const njtlHeading = njtlSec.heading ? collectText(document, njtlSec.container, { headings: 'h2', maxParas: 0 })
      .filter((n) => /NJTL network serves/i.test(n.textContent))[0] : null;
    const mapImg = [...main.querySelectorAll('img')].find((im) => /NJTL Chapter Map/i.test(im.getAttribute('alt') || ''))
      || (njtlSec.container ? njtlSec.container.querySelector('img') : null);

    // 5. Sustained support — intro + 4 cards.
    const sustained = captureCardsIntro(/^Sustained support/);
    const SUSTAINED_CARDS = [
      { title: 'Accreditation', desc: 'We accredit organizations to become NJTLs. We provide NJTLs unique resources for high-quality education and tennis programming.', img: '/content/dam/usta-foundation/who-we-are/affiliation-thumbnail.jpg', alt: 'Coach on the court with students' },
      { title: 'Financial Support', desc: "We provide program grants to support NJTLs' direct programming efforts to help these organizations grow and make an impact.", img: '/content/dam/usta-foundation/who-we-are/capacity-building.jpg', alt: 'NJTL leadership at the Campus' },
      { title: 'Leadership & Vision', desc: 'We advise NJTLs on effective organizational development by offering support, training, and best practices for leaders and coaches.', img: '/content/dam/usta-foundation/who-we-are/leadership-vision.jpg', alt: 'NJTL leader smiling' },
      { title: 'Extended Resources', desc: 'We host a number of national resources and data tools available to all NJTLs to strengthen their organizational capacity.', img: '/content/dam/usta-foundation/who-we-are/court-refurb.jpg', alt: 'Refurbished tennis courts' },
    ];

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
    heroCtas.forEach((c) => heroContentCell.push(ctaParagraph(document, c.href, c.text)));
    heroCells.push([heroContentCell]);
    main.append(WebImporter.Blocks.createBlock(document, { name: 'Hero (text-up)', cells: heroCells }));
    emittedBlocks.push('hero-text-up');

    // SECTION 2 — Our Strategic Priorities: intro (center, medium) + 4 cards.
    main.append(document.createElement('hr'));
    priorities.intro.forEach((n) => main.append(n));
    main.append(WebImporter.Blocks.createBlock(document, {
      name: 'Section Metadata', cells: { style: 'center, medium' },
    }));
    emittedBlocks.push('default-content(priorities-intro)');
    main.append(document.createElement('hr'));
    main.append(cardsContentBlock(document, collectCards(PRIORITY_CARDS)));
    emittedBlocks.push('cards-content(priorities)');

    // SECTION 3 — YELLOW BAND: centered intro ("Transforming lives since 1969." +
    // lead para) + columns image-LEFT (photo + H3 "Carrying on the legacy…" + paras).
    main.append(document.createElement('hr'));
    main.append(yellowStrip(document));
    emittedBlocks.push('spacer(yellow-strip)');
    main.append(document.createElement('hr'));
    {
      // intro = the H2 + the first paragraph; columns text = the H3 + the rest.
      const h2 = transformAll.find((n) => /^H2$/i.test(n.tagName));
      const paras = transformAll.filter((n) => /^P$/i.test(n.tagName));
      const h3 = transformAll.find((n) => /^H3$/i.test(n.tagName));
      const introPara = paras[0];
      const bodyParas = paras.slice(1);
      if (h2) main.append(h2);
      if (introPara) main.append(introPara);
      const colText = [];
      if (h3) colText.push(h3);
      bodyParas.forEach((p) => colText.push(p));
      if (transformCta) colText.push(ctaParagraph(document, transformCta.href, transformCta.text));
      main.append(columnsBlock(document, { textNodes: colText.length ? colText : [''], img: transformImg, imageSide: 'left' }));
      main.append(WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata', cells: { style: 'section-yellow, yellow-center-intro' },
      }));
      emittedBlocks.push('columns(transform,image-left,yellow,center-intro)');
    }

    // SECTION 4 — NJTL map: heading + a WIDE full-width map image (`full-width`).
    main.append(document.createElement('hr'));
    if (njtlHeading) main.append(njtlHeading);
    if (mapImg) main.append(cloneImg(document, mapImg));
    main.append(WebImporter.Blocks.createBlock(document, {
      name: 'Section Metadata', cells: { style: 'center, map-wide' },
    }));
    emittedBlocks.push('default-content(njtl-map)');

    // SECTION 5 — Sustained support: intro (center, medium) + 4 cards.
    main.append(document.createElement('hr'));
    sustained.intro.forEach((n) => main.append(n));
    main.append(WebImporter.Blocks.createBlock(document, {
      name: 'Section Metadata', cells: { style: 'center, medium' },
    }));
    emittedBlocks.push('default-content(sustained-intro)');
    main.append(document.createElement('hr'));
    main.append(cardsContentBlock(document, collectCards(SUSTAINED_CARDS)));
    emittedBlocks.push('cards-content(sustained)');

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
