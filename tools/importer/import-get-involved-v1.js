/* eslint-disable */
/* global WebImporter */

/*
 * import-get-involved-v1 — dedicated importer for the USTA Foundation
 * get-involved.html interior page. Like who-we-are it is a general-template
 * (marketing/landing) page built from the shared block vocabulary, but its
 * section SEQUENCE is unique, so it gets its own tailored script (the general
 * importer is only worth generalizing across pages that share a layout — these
 * one-off landing pages are each authored explicitly, block by block).
 *
 * Section sequence (measured on the live rendered DOM at 1280 — media side by
 * image centre-X vs the viewport midline; yellow bands by inline #FFEFBE):
 *   1. HERO (text-up) — bg photo get-involved-tiafoe.jpg + H1
 *      "Help us get young people ready for life." + subhead + one CTA "WHAT WE DO".
 *   2. "Your gift powers our mission." — centered intro (default content,
 *      `center, medium`).
 *   3. "Individual Supporters" — Columns, text left / image RIGHT.
 *   4. YELLOW BAND — "Impact Societies" Columns, image LEFT + LEARN MORE (pdf).
 *   5. "Young Professional Initiative" — Columns, image RIGHT + LEARN MORE.
 *   6. YELLOW BAND — "Planned Giving" Columns, image LEFT + LEARN MORE (pdf).
 *   7. "Signature Events" — intro + Cards (content): 3 cards (Gala / Pro-Am /
 *      Tennis Fantasy Camps), each image + h4 + description.
 *   8. YELLOW BAND — "Corporate Partnership Opportunities" Columns, image LEFT.
 *   9. Trailing full-bleed black strip above the footer (Spacer, stats-band-bg).
 *
 * Each yellow band is preceded by a leading yellow strip (Spacer section-yellow-bg)
 * — the source's ~17px yellow strip + white gap + band pattern (see who-we-are).
 *
 * `Theme = general` — CSS-only page; adds body.general (no template fetch).
 */

import cleanupTransformer from './transformers/ustafoundation-cleanup.js';

const PAGE_TEMPLATE = {
  name: 'general',
  description: 'USTA Foundation get-involved page: hero (text-up), centered intro, alternating image+text columns, three full-bleed yellow bands, and a cards-content grid.',
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
    const heroCtas = heroContainer
      ? [...heroContainer.querySelectorAll('.button a[href], a.cmp-button[href]')].map((a) => ({
        href: a.getAttribute('href'), text: norm(a.textContent),
      })).filter((c) => c.text)
      : [];

    // 2. "Your gift powers our mission." — centered intro + a MAKE A GIFT CTA.
    // This container holds ONLY the intro (heading + one lead paragraph + the
    // donate button); Individual Supporters is a SEPARATE container.
    const giftSec = sectionOfHeading(main, /^Your gift powers/);
    const giftText = collectText(document, giftSec.container, {
      maxParas: 1, skip: [/Individual Supporters/i, /Our individual donors/i, /Donors can get involved/i, /By giving to the USTA/i],
    });
    const giftCta = ctaOf(giftSec.container);

    // helper to capture a Columns section by heading
    const captureColumns = (re) => {
      const sec = sectionOfHeading(main, re);
      const text = collectText(document, sec.container);
      const img = (sec.container && sec.container.querySelector('img'))
        || (sec.heading ? nearbyImage(sec.heading) : null);
      const cta = ctaOf(sec.container);
      return { text, img, cta, sec };
    };

    // 3. Individual Supporters — image RIGHT. Its own section container.
    const individual = captureColumns(/^Individual Supporters/);
    const impact = captureColumns(/^Impact Societies/);
    const ypi = captureColumns(/^Young Professional Initiative/);
    const planned = captureColumns(/^Planned Giving/);
    const corporate = captureColumns(/^Corporate Partnership/);

    // 7. Signature Events — intro + 3 content cards.
    const sigSec = sectionOfHeading(main, /^Signature Events/);
    const sigIntro = collectText(document, sigSec.container, {
      headings: 'h2', maxParas: 1,
    }).filter((n) => /Signature Events|The USTA Foundation hosts a variety/i.test(n.textContent));
    // 3 cards, matched by their h4 titles (clean copies — the source ships mobile
    // fragments of the Fantasy Camp copy that we ignore in favour of the canonical
    // description).
    const CARD_DEFS = [
      { title: 'US Open Opening Night Gala', desc: 'Mix and mingle under the stars while you enjoy celebrity sightings, cocktails, fine dining, and US Open tennis from the best seats in the house.' },
      { title: 'Pro-Am at the US Open', desc: 'Compete with tennis legends on the USTA Billie Jean King National Tennis Center courts, then watch live US Open men’s semifinal action.' },
      { title: 'Tennis Fantasy Camps', desc: 'Train like the world’s best players at some of the sport’s most iconic locations, where you’ll eat, sleep and practice like the pros.' },
    ];
    const sigImgs = [...sigSec.container ? sigSec.container.querySelectorAll('img') : []]
      .filter((im) => /coreimg/.test(im.getAttribute('src') || ''));

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

    // SECTION 2 — centered intro (default content, center/medium) + MAKE A GIFT CTA
    main.append(document.createElement('hr'));
    giftText.forEach((n) => main.append(n));
    if (giftCta) main.append(ctaParagraph(document, giftCta.href, giftCta.text));
    main.append(WebImporter.Blocks.createBlock(document, {
      name: 'Section Metadata', cells: { style: 'center, medium' },
    }));
    emittedBlocks.push('default-content(gift-intro)');

    // SECTION 3 — Individual Supporters columns (image RIGHT)
    main.append(document.createElement('hr'));
    main.append(columnsBlock(document, { textNodes: individual.text, img: individual.img, imageSide: 'right' }));
    emittedBlocks.push('columns(individual,image-right)');

    // SECTION 4 — YELLOW BAND: Impact Societies columns (image LEFT) + LEARN MORE
    main.append(document.createElement('hr'));
    main.append(yellowStrip(document));
    emittedBlocks.push('spacer(yellow-strip)');
    main.append(document.createElement('hr'));
    {
      const text = [...impact.text];
      if (impact.cta) text.push(ctaParagraph(document, impact.cta.href, impact.cta.text));
      main.append(columnsBlock(document, { textNodes: text, img: impact.img, imageSide: 'left' }));
      main.append(WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata', cells: { style: 'section-yellow' },
      }));
      emittedBlocks.push('columns(impact,image-left,yellow)');
    }

    // SECTION 5 — Young Professional Initiative columns (image RIGHT) + LEARN MORE
    main.append(document.createElement('hr'));
    {
      const text = [...ypi.text];
      if (ypi.cta) text.push(ctaParagraph(document, ypi.cta.href, ypi.cta.text));
      main.append(columnsBlock(document, { textNodes: text, img: ypi.img, imageSide: 'right' }));
      emittedBlocks.push('columns(ypi,image-right)');
    }

    // SECTION 6 — YELLOW BAND: Planned Giving columns (image LEFT) + LEARN MORE
    main.append(document.createElement('hr'));
    main.append(yellowStrip(document));
    emittedBlocks.push('spacer(yellow-strip)');
    main.append(document.createElement('hr'));
    {
      const text = [...planned.text];
      if (planned.cta) text.push(ctaParagraph(document, planned.cta.href, planned.cta.text));
      main.append(columnsBlock(document, { textNodes: text, img: planned.img, imageSide: 'left' }));
      main.append(WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata', cells: { style: 'section-yellow' },
      }));
      emittedBlocks.push('columns(planned,image-left,yellow)');
    }

    // SECTION 7 — Signature Events intro + Cards (content)
    main.append(document.createElement('hr'));
    sigIntro.forEach((n) => main.append(n));
    {
      const rows = [['Cards (content)']];
      CARD_DEFS.forEach((c, idx) => {
        const imgCell = sigImgs[idx] ? [cloneImg(document, sigImgs[idx])] : [''];
        const body = [];
        const h4 = document.createElement('h4');
        h4.textContent = c.title;
        body.push(h4);
        const p = document.createElement('p');
        p.textContent = c.desc;
        body.push(p);
        rows.push([imgCell, body]);
      });
      main.append(WebImporter.DOMUtils.createTable(rows, document));
      emittedBlocks.push('cards-content(signature-events)');
    }

    // SECTION 8 — YELLOW BAND: Corporate Partnership. The source lays a CENTERED
    // intro (heading + the "Join a growing list…" lead paragraph, full width) ABOVE
    // an image-LEFT / text-RIGHT columns row (the four Advance/Amplify/Create/
    // Campaign paragraphs beside the Emirates photo). One `section-yellow` section
    // with `center-intro` (centers only the leading default content).
    main.append(document.createElement('hr'));
    main.append(yellowStrip(document));
    emittedBlocks.push('spacer(yellow-strip)');
    main.append(document.createElement('hr'));
    {
      // intro = heading + first paragraph; columns body = remaining paragraphs.
      const heading = corporate.text.find((n) => /^H\d$/i.test(n.tagName));
      const paras = corporate.text.filter((n) => /^P$/i.test(n.tagName));
      const introPara = paras[0];
      const bodyParas = paras.slice(1);
      if (heading) main.append(heading);
      if (introPara) main.append(introPara);
      const colText = bodyParas.length ? bodyParas : [''];
      main.append(columnsBlock(document, { textNodes: colText, img: corporate.img, imageSide: 'left' }));
      main.append(WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata', cells: { style: 'section-yellow, center-intro' },
      }));
      emittedBlocks.push('columns(corporate,image-left,yellow,center-intro)');
    }

    // SECTION 9 — trailing black band
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
