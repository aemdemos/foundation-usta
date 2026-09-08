/* eslint-disable */
/* global WebImporter */

/*
 * import-our-impact-v1 — dedicated importer for the USTA Foundation
 * our-impact.html interior page (general template, unique section sequence).
 *
 * Section sequence (measured on the live rendered DOM at 1280):
 *   1. HERO (banner) — bg photo our-impact-header.jpg + centered white H1
 *      "We make a transformative, nationwide impact." + subhead (no CTA).
 *   2. "Young people aren't ready." centered intro + Columns: a 4-item stat list
 *      (H3 + caption each) LEFT + image RIGHT.
 *   3. YELLOW BAND — "We reach communities that others can't." centered intro +
 *      Columns: image LEFT + a 3-item list (Nationwide / Community-led /
 *      Trusted access, each label + caption) RIGHT.
 *   4. "Our impact is felt by those who need it the most." → banner-stats-grid
 *      (H2 + featured "233,000+ young people served" + 4 stat/label pairs).
 *   5. YELLOW BAND — "We make a difference that matters." intro + "The numbers
 *      speak to it." + Cards (stats) ×4 (97/98/85/95 — circular image + stat + caption).
 *   6. Trailing full-bleed black strip above the footer (Spacer, stats-band-bg).
 *
 * Yellow bands are preceded by a leading yellow strip (Spacer section-yellow-bg).
 * `Theme = general` — CSS-only page; adds body.general (no template fetch).
 */

import cleanupTransformer from './transformers/ustafoundation-cleanup.js';

const PAGE_TEMPLATE = {
  name: 'general',
  description: 'USTA Foundation our-impact page: hero (banner), stat-list columns, a banner-stats-grid, and a cards-stats grid, with two full-bleed yellow bands.',
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
    const heroCta = ctaOf(heroContainer);

    // Synthesize an <img> from a source URL (card/stat images live in <noscript>
    // lazy-load wrappers the cleanup strips, so hard-wire the verified DAM paths).
    const imgFromUrl = (src, alt) => {
      if (!src) return null;
      const img = document.createElement('img');
      img.setAttribute('src', absUrl(src));
      img.setAttribute('alt', alt || '');
      return img;
    };

    // Build a stat-list (big H3 display stat + caption per item) for a columns
    // text cell — used where the source renders the stat as a Graphik XXCond Bold
    // display heading (section 2 "Young people aren't ready").
    const statList = (items) => {
      const out = [];
      items.forEach((it) => {
        const h3 = document.createElement('h3');
        h3.textContent = it.stat;
        out.push(h3);
        const p = document.createElement('p');
        p.textContent = it.caption;
        out.push(p);
      });
      return out;
    };

    // Build a bold-label list (label = 18px BOLD body text <p><strong>, then a
    // caption paragraph) — used where the source renders the label as a small
    // <b> (section 3 "We reach communities": Nationwide / Community-led / Trusted).
    const labelList = (items) => {
      const out = [];
      items.forEach((it) => {
        const lp = document.createElement('p');
        const strong = document.createElement('strong');
        strong.textContent = it.stat;
        lp.append(strong);
        out.push(lp);
        const p = document.createElement('p');
        p.textContent = it.caption;
        out.push(p);
      });
      return out;
    };

    // 2. "Young people aren't ready." — centered intro + Columns (stat list LEFT,
    // image RIGHT). Intro heading + lead para captured dynamically; the 4 stats are
    // hard-wired (the source packs them into one cmp-text, messy to split cleanly).
    const notReadySec = sectionOfHeading(main, /^Young people aren/);
    const notReadyIntro = collectText(document, notReadySec.container, { headings: 'h2', maxParas: 1 })
      .filter((n) => /Young people aren|Young people—particularly/i.test(n.textContent));
    const NOT_READY_STATS = [
      { stat: 'Less than 3 years', caption: 'How long the average U.S. child plays a sport' },
      { stat: 'Only 15% of 12-17 year olds', caption: 'Meet the physical activity recommendation of 60 minutes daily' },
      { stat: 'Two-thirds of students nationally', caption: 'Demonstrate a deficiency in math and reading' },
      { stat: 'Nearly 20% of children', caption: 'in the U.S. are overweight or obese' },
    ];
    const notReadyImg = imgFromUrl('/content/dam/usta-foundation/our-impact/our-impact-insert.png', 'USTAF students in the classroom');

    // 3. YELLOW BAND "We reach communities that others can't." — centered intro +
    // Columns (image LEFT + 3-item list RIGHT).
    const reachSec = sectionOfHeading(main, /^We reach communities/);
    const reachIntro = collectText(document, reachSec.container, { headings: 'h2', maxParas: 2 })
      .filter((n) => /We reach communities|The USTA Foundation invests|While each local organization is unique, they share the same goals/i.test(n.textContent));
    const REACH_ITEMS = [
      { stat: 'Nationwide', caption: '270+ community-based organizations in under-resourced communities across the U.S.' },
      { stat: 'Community-led', caption: 'Every organization is a grassroots entity empowered to cater to the diverse needs of their community.' },
      { stat: 'Trusted access', caption: 'Well-known organizations that are immersed in their communities enable us to provide support where it is most needed.' },
    ];
    const reachImg = imgFromUrl('/content/dam/usta-foundation/our-impact/norwalk-njtl.jpg', 'Coach teaching at the Norwalk chapter.');

    // 5. YELLOW BAND "We make a difference that matters." — intro (H2 + 2 paras +
    // "The numbers speak to it." H2) + Cards (stats) ×4.
    const diffSec = sectionOfHeading(main, /^We make a difference/);
    const diffIntro = collectText(document, diffSec.container, { headings: 'h2', maxParas: 2 })
      .filter((n) => /We make a difference|The USTA Foundation keeps score|Our organizations don|The numbers speak to it/i.test(n.textContent));
    const STAT_CARDS = [
      { stat: '97%', caption: 'advance on-time for their grade level (K-12)', img: '/content/dam/usta-foundation/our-impact/our-impact-1.png', alt: 'Students sitting and laughing' },
      { stat: '98%', caption: 'graduate from high school on time', img: '/content/dam/usta-foundation/our-impact/graduation.png', alt: 'USTAF students talking' },
      { stat: '85%', caption: 'of high-school seniors enter post-secondary education', img: '/content/dam/usta-foundation/our-impact/high-school.png', alt: 'USTAF students sitting in a classroom' },
      { stat: '95%', caption: 'report strengthened social-emotional learning skills', img: '/content/dam/usta-foundation/our-impact/sel-skills.png', alt: 'USTAF tennis players high-fiving' },
    ];

    // ---- Rebuild main into the target section structure ----
    main.textContent = '';

    // SECTION 1 — Hero (banner): authored bg image + centered white H1 + subhead.
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
    if (heroCta) heroContentCell.push(ctaParagraph(document, heroCta.href, heroCta.text));
    heroCells.push([heroContentCell]);
    main.append(WebImporter.Blocks.createBlock(document, { name: 'Hero (banner)', cells: heroCells }));
    emittedBlocks.push('hero-banner');

    // SECTION 2 — "Young people aren't ready." centered intro + Columns (stat list
    // LEFT, image RIGHT).
    main.append(document.createElement('hr'));
    notReadyIntro.forEach((n) => main.append(n));
    main.append(WebImporter.Blocks.createBlock(document, {
      name: 'Section Metadata', cells: { style: 'center, wide' },
    }));
    emittedBlocks.push('default-content(not-ready-intro)');
    main.append(document.createElement('hr'));
    main.append(columnsBlock(document, { textNodes: statList(NOT_READY_STATS), img: notReadyImg, imageSide: 'right' }));
    emittedBlocks.push('columns(not-ready-stats,image-right)');

    // SECTION 3 — YELLOW BAND: "We reach communities…" centered intro + Columns
    // (image LEFT + 3-item list RIGHT).
    main.append(document.createElement('hr'));
    main.append(yellowStrip(document));
    emittedBlocks.push('spacer(yellow-strip)');
    main.append(document.createElement('hr'));
    {
      const heading = reachIntro.find((n) => /^H2$/i.test(n.tagName));
      const paras = reachIntro.filter((n) => /^P$/i.test(n.tagName));
      if (heading) main.append(heading);
      paras.forEach((p) => main.append(p));
      main.append(columnsBlock(document, { textNodes: labelList(REACH_ITEMS), img: reachImg, imageSide: 'left' }));
      main.append(WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata', cells: { style: 'section-yellow, center-intro' },
      }));
      emittedBlocks.push('columns(reach,image-left,yellow,center-intro)');
    }

    // SECTION 4 — banner-stats-grid: H2 + featured stat + 4 stat/label pairs.
    main.append(document.createElement('hr'));
    {
      const rows = [['Banner Stats Grid']];
      const h2 = document.createElement('h2');
      h2.textContent = 'Our impact is felt by those who need it the most.';
      rows.push([[h2]]);
      const featured = document.createElement('h1');
      featured.textContent = '233,000+ young people served';
      rows.push([[featured]]);
      [['74%', 'come from families of need'], ['79%', 'identify as young people of color'],
        ['270+', 'organizations nationwide'], ['67,000+', 'coaches, mentors & volunteers']]
        .forEach(([stat, label]) => rows.push([stat, label]));
      main.append(WebImporter.DOMUtils.createTable(rows, document));
      emittedBlocks.push('banner-stats-grid');
    }

    // SECTION 5 — YELLOW BAND: "We make a difference…" intro + Cards (stats) ×4.
    main.append(document.createElement('hr'));
    main.append(yellowStrip(document));
    emittedBlocks.push('spacer(yellow-strip)');
    main.append(document.createElement('hr'));
    diffIntro.forEach((n) => main.append(n));
    {
      const rows = [['Cards (stats)']];
      STAT_CARDS.forEach((c) => {
        const imgCell = [imgFromUrl(c.img, c.alt)];
        const h3 = document.createElement('h3');
        h3.textContent = c.stat;
        const h4 = document.createElement('h4');
        h4.textContent = c.caption;
        rows.push([imgCell, [h3], [h4]]);
      });
      main.append(WebImporter.DOMUtils.createTable(rows, document));
      main.append(WebImporter.Blocks.createBlock(document, {
        // `center` centers the leading default content (the "We make a difference"
        // intro + "The numbers speak to it." heading), matching the source; the
        // cards-stats block carries its own centered grid so it's unaffected.
        name: 'Section Metadata', cells: { style: 'section-yellow, center' },
      }));
      emittedBlocks.push('cards-stats(yellow,center)');
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
