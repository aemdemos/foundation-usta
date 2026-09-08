/* eslint-disable */
/* global WebImporter */

/*
 * import-ypi-v1 — dedicated importer for the USTA Foundation
 * get-involved/young-professional-initiative.html page (general template).
 *
 * Section sequence (measured on the live rendered DOM at 1280):
 *   1. HERO (text-up) — bg ypi-header-eubanks.jpg + H1 "Young Professional
 *      Initiative" + subhead + one CTA "JOIN US".
 *   2. "The future of giving starts here." — Columns, text LEFT / image RIGHT
 *      (ypi-alternate.jpg) + MAKE A GIFT.
 *   3. YELLOW BAND — "How YPI Makes an Impact" Columns, image LEFT (ypi-insert.jpg).
 *   4. QUOTE (image) — Greg Labanowski pull-quote + attribution beside a portrait
 *      (ypi-3.png), image RIGHT.
 *   5. YELLOW BAND — "Ways to Get Involved" Columns, image LEFT (ypi-4.png).
 *   6. Trailing full-bleed black strip above the footer (Spacer, stats-band-bg).
 *
 * Yellow bands are preceded by a leading yellow strip (Spacer section-yellow-bg).
 * `Theme = general` — CSS-only page; adds body.general (no template fetch).
 */

import cleanupTransformer from './transformers/ustafoundation-cleanup.js';

const PAGE_TEMPLATE = {
  name: 'general',
  description: 'USTA Foundation YPI page: hero (text-up), alternating image+text columns (two yellow bands), and a quote-image block.',
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
    const heroCta = ctaOf(heroContainer) || { href: 'https://ustaf.tfaforms.net/67', text: 'JOIN US' };

    // YPI content (fixed — captured from the live DOM). Column bodies use a small
    // "blocks" mini-format: {p:'…'} paragraph, {b:'…'} bold sub-heading, {ul:[…]}
    // bullet list — reproducing the source's mixed paragraph/heading/bullet copy.
    // "The future of giving starts here." is a CENTERED intro (heading + 1 para +
    // MAKE A GIFT), separate from the "What is YPI?" columns below it.
    const FUTURE_INTRO = 'The Young Professional Initiative (YPI) is a community of emerging leaders who are passionate about creating opportunities for young people through the power of tennis, education and mentorship.';
    const WHATIS_BODY = [
      { p: 'As an affiliate group of the USTA Foundation, YPI brings together young professionals who are passionate about making a difference.' },
      { p: "This initiative connects you with peers who share a commitment to giving back while helping create opportunities for the next generation. Through networking events, mentorship, fundraising, and mission-driven experiences, YPI supports the USTA Foundation's work to help young people thrive both on and off the tennis court." },
      { b: 'As a part of The Young Professional Initiative, you can:' },
      { ul: [
        'Build meaningful professional and personal relationships',
        'Give back to local communities',
        'Develop leadership skills through service and engagement',
        'Make a lasting impact on young people nationwide',
      ] },
    ];
    const IMPACT_BODY = [
      { p: "YPI plays an active role in advancing the USTA Foundation's mission by investing their time, talents, and resources into creating opportunities for young people across the country." },
      { p: 'Through personal philanthropy, advocacy, and community engagement, YPI helps expand access to programs that empower young people to succeed in school, bring change in their communities, and achieve excellence.' },
      { p: 'By supporting the USTA Foundation, YPI helps make a lasting impact through initiatives specifically focused on:' },
      { ul: [
        'Academic achievement and educational support',
        'Leadership development',
        'Career exploration and workforce readiness',
        'Mentorship and personal growth',
        'Access to welcoming tennis opportunities',
      ] },
    ];
    const WAYS_PARAS = [
      'Connect with fellow supporters through networking events, volunteer opportunities, mission-focused experiences, and special gatherings throughout the year, including during the US Open.',
      'Support the USTA Foundation through annual giving, fundraising campaigns, and other initiatives that help create opportunities for young people.',
      'Join a growing network of young professionals committed to leadership, service, and making a lasting impact.',
    ];
    const QUOTE_TEXT = '"Young leaders can play a key role in championing the next generation. The Young Professional Initiative is vital in the USTA Foundation\'s future & growing its impact."';
    const QUOTE_ATTR = 'Greg Labanowski, Young Professional Initiative';

    const p = (text) => { const el = document.createElement('p'); el.textContent = text; return el; };
    const boldP = (text) => {
      const el = document.createElement('p');
      const s = document.createElement('strong');
      s.textContent = text;
      el.append(s);
      return el;
    };
    const bulletList = (items) => {
      const ul = document.createElement('ul');
      items.forEach((t) => {
        const li = document.createElement('li');
        li.textContent = t;
        ul.append(li);
      });
      return ul;
    };
    // Expand the mini-format ({p}/{b}/{ul}) copy model into real DOM nodes.
    const bodyNodes = (body) => body.map((item) => {
      if (item.b) return boldP(item.b);
      if (item.ul) return bulletList(item.ul);
      return p(item.p);
    });

    // ---- Rebuild main into the target section structure ----
    main.textContent = '';

    // SECTION 1 — Hero (text-up).
    const heroCells = [];
    if (heroBgUrl) {
      const bg = document.createElement('img');
      bg.setAttribute('src', absUrl(heroBgUrl));
      bg.setAttribute('alt', '');
      heroCells.push([bg]);
    }
    const heroContentCell = [];
    const heroHeading = document.createElement('h1');
    heroHeading.textContent = 'Young Professional Initiative';
    heroContentCell.push(heroHeading);
    if (heroSubhead) heroContentCell.push(p(heroSubhead));
    if (heroCta) heroContentCell.push(ctaParagraph(document, heroCta.href, heroCta.text));
    heroCells.push([heroContentCell]);
    // "tall" variant: the source YPI hero is a fixed-height box (~790px desktop /
    // ~601px mobile), taller than the default single-CTA text-up hero — reproduced
    // by the `tall` min-height floor in hero.css.
    main.append(WebImporter.Blocks.createBlock(document, { name: 'Hero (text-up, tall)', cells: heroCells }));
    emittedBlocks.push('hero-text-up-tall');

    // Emit a Columns section: heading + body paras + optional CTA in the text cell,
    // image on the given side. Optional yellow band (leading strip + section-yellow).
    const columnsSection = ({
      heading, paras, body, img, alt, imageSide, cta, yellow = false,
    }) => {
      main.append(document.createElement('hr'));
      if (yellow) {
        main.append(yellowStrip(document));
        emittedBlocks.push('spacer(yellow-strip)');
        main.append(document.createElement('hr'));
      }
      const text = [];
      const h2 = document.createElement('h2');
      h2.textContent = heading;
      text.push(h2);
      if (body) bodyNodes(body).forEach((n) => text.push(n));
      else (paras || []).forEach((t) => text.push(p(t)));
      if (cta) text.push(ctaParagraph(document, cta.href, cta.text));
      const image = document.createElement('img');
      image.setAttribute('src', absUrl(img));
      image.setAttribute('alt', alt || '');
      main.append(columnsBlock(document, { textNodes: text, img: image, imageSide }));
      if (yellow) {
        main.append(WebImporter.Blocks.createBlock(document, {
          name: 'Section Metadata', cells: { style: 'section-yellow' },
        }));
      }
    };

    // SECTION 2a — centered intro band: "The future of giving starts here." + copy + MAKE A GIFT.
    main.append(document.createElement('hr'));
    {
      const h2 = document.createElement('h2');
      h2.textContent = 'The future of giving starts here.';
      main.append(h2);
      main.append(p(FUTURE_INTRO));
      main.append(ctaParagraph(document, 'https://ustaf.donorsupport.co/page/YPI', 'MAKE A GIFT'));
      main.append(WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata', cells: { style: 'center' },
      }));
      emittedBlocks.push('center-intro(future-of-giving)');
    }

    // SECTION 2b — "What is YPI?" columns, image RIGHT (sub-heading + bullet list in text cell).
    columnsSection({
      heading: 'What is YPI?', body: WHATIS_BODY,
      img: '/content/dam/usta-foundation/get-involved/ypi-alternate.jpg', alt: 'YPI donors at the US Open',
      imageSide: 'right',
    });
    emittedBlocks.push('columns(what-is-ypi,image-right)');

    // SECTION 3 — YELLOW: "How YPI Makes an Impact" columns, image LEFT (bullet list in text cell).
    columnsSection({
      heading: 'How YPI Makes an Impact', body: IMPACT_BODY,
      img: '/content/dam/usta-foundation/get-involved/ypi-insert.jpg', alt: 'YPI members with Tommy Haas and James Blake',
      imageSide: 'left', yellow: true,
    });
    emittedBlocks.push('columns(impact,image-left,yellow)');

    // SECTION 4 — Quote (image): Greg Labanowski pull-quote + portrait (image RIGHT).
    main.append(document.createElement('hr'));
    {
      const qh2 = document.createElement('h2');
      qh2.textContent = QUOTE_TEXT;
      const attr = document.createElement('p');
      const em = document.createElement('em');
      em.textContent = QUOTE_ATTR;
      attr.append(document.createTextNode('- '), em);
      const image = document.createElement('img');
      image.setAttribute('src', absUrl('/content/dam/usta-foundation/get-involved/ypi-3.png'));
      image.setAttribute('alt', 'Two YPI members');
      main.append(WebImporter.DOMUtils.createTable([
        ['Quote (image)'],
        [[qh2, attr], [image]],
      ], document));
      emittedBlocks.push('quote-image(labanowski)');
    }

    // SECTION 5 — YELLOW: "Ways to Get Involved" columns, image LEFT.
    columnsSection({
      heading: 'Ways to Get Involved', paras: WAYS_PARAS,
      img: '/content/dam/usta-foundation/get-involved/ypi-4.png', alt: 'USTA Foundation YPI members',
      imageSide: 'left', yellow: true,
    });
    emittedBlocks.push('columns(ways,image-left,yellow)');

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
