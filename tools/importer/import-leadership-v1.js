/* eslint-disable */
/* global WebImporter */

/*
 * import-leadership-v1 — importer for the USTA Foundation "Leadership & Staff"
 * page template (who-we-are/leadership-and-staff).
 *
 * Source shape (measured on the live page):
 *   #mainContent > … > H1 "Leadership & Staff" + a core-tabs widget with two
 *   tab panels:
 *     • "Staff"              — <h3>Our Staff</h3>, a grid of `.cmp-teaser`
 *                              profile cards (photo + name <h4> + role), then a
 *                              plain-<p> list of the remaining staff
 *                              ("Name, Role" lines).
 *     • "Board of Directors" — <h3>Board of Directors</h3>, two `.cmp-teaser`
 *                              cards (Chris Evert, Kathleen Wu), then three text
 *                              columns headed <h4> "Officers and Directors" /
 *                              "Advisory Board" / "Honorary Board", each a list
 *                              of names (bold name + italic role).
 *
 * We re-author this into the approved target shape (see
 * content/drafts/block-samples/toc-profile.plain.html):
 *   section 1: H1 + `toc-profile` block (Staff / Board tabs → section anchors)
 *   section 2: <h3>Our Staff</h3> + `cards (profile)` + staff <p> list +
 *              Section Metadata (profile-anchor: staff)
 *   section 3: <h3>Board of Directors</h3> + `cards (profile)` +
 *              `table (directory)` + Section Metadata (profile-anchor:
 *              board-of-directors)
 *   Metadata block: Title (source) + Template = leadership
 *
 * Each `.cmp-teaser` ships the name in TWO <h4>s (a visible `_scalable` one and a
 * hidden `_hidden` link copy) — we read the visible one only, so no duplicate.
 * The board's "Advisory Board" column is also duplicated for responsive layout
 * (a `--default--hide` tablet copy WITH an extra name, and the desktop copy) — we
 * skip the hidden copy and keep the desktop one, matching the sample.
 */

import cleanupTransformer from './transformers/ustafoundation-cleanup.js';
// sectionsTransformer is imported to keep the transformer set consistent with the
// other importers, but this template builds its own section breaks (we rebuild
// `main` from scratch), so it is not run here.
import sectionsTransformer from './transformers/ustafoundation-sections.js';

const PAGE_TEMPLATE = {
  name: 'leadership',
  description: 'USTA Foundation Leadership & Staff: H1 + toc-profile tabs, a Staff section (profile cards + staff list) and a Board of Directors section (profile cards + directory table).',
  blocks: [],
  sections: [],
};

void sectionsTransformer;

function executeCleanup(hookName, element, payload) {
  try {
    cleanupTransformer.call(null, hookName, element, { ...payload, template: PAGE_TEMPLATE });
  } catch (e) {
    console.error(`Cleanup transformer failed at ${hookName}:`, e);
  }
}

const ORIGIN = 'https://www.ustafoundation.com';

// Collapse whitespace and normalise comma spacing in a "Name, Role" line.
function normalizeLine(text) {
  return (text || '')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/,(?=\S)/g, ', ')
    .replace(/^[,\s]+|[,\s]+$/g, '')
    .trim();
}

// Find the tab panel (role=tabpanel) whose data-title matches the given label.
function findPanel(root, title) {
  return [...root.querySelectorAll('[role="tabpanel"]')]
    .find((p) => (p.getAttribute('data-title') || '').trim().toLowerCase() === title.toLowerCase()) || null;
}

/*
 * Build a `cards (profile)` block table from the `.cmp-teaser` cards in a panel.
 * One row per person: [ image | <h4>Name</h4><p><em>Role</em></p> ].
 * The name comes from the VISIBLE `_scalable` title (never the hidden link copy),
 * the role from the first paragraph of the teaser description, the photo from the
 * teaser image's real <img src> (a /content/dam/… path adjustImageUrls localises).
 */
function buildProfileCards(document, panel) {
  if (!panel) return null;
  const rows = [['Cards (profile)']];
  panel.querySelectorAll('.cmp-teaser').forEach((teaser) => {
    const titleEl = teaser.querySelector('.cmp-teaser__title_scalable')
      || teaser.querySelector('.cmp-teaser__title');
    const name = titleEl ? titleEl.textContent.trim() : '';
    if (!name) return;

    const descP = teaser.querySelector('.cmp-teaser__description p');
    const role = descP ? descP.textContent.trim() : '';

    const imageCell = document.createElement('div');
    const srcImg = teaser.querySelector('.cmp-teaser__image img');
    const rawSrc = srcImg && (srcImg.getAttribute('src') || srcImg.getAttribute('data-src'));
    if (rawSrc) {
      const img = document.createElement('img');
      img.setAttribute('src', new URL(rawSrc, ORIGIN).href);
      img.setAttribute('alt', name);
      imageCell.append(img);
    }

    const bodyCell = document.createElement('div');
    const h4 = document.createElement('h4');
    h4.textContent = name;
    bodyCell.append(h4);
    if (role) {
      const p = document.createElement('p');
      const em = document.createElement('em');
      em.textContent = role;
      p.append(em);
      bodyCell.append(p);
    }

    rows.push([imageCell, bodyCell]);
  });
  if (rows.length < 2) return null;
  return WebImporter.DOMUtils.createTable(rows, document);
}

/*
 * Build the extra staff list: the plain "Name, Role" paragraphs that follow the
 * Staff profile cards. In the source each is a <p> with a bold name + italic
 * role (a couple of lines are joined with <br>); we flatten each line to plain
 * text (matching the sample) and emit one <p> per person. Returns an array of
 * <p> nodes (default content — NOT a block).
 */
function buildStaffList(document, panel) {
  if (!panel) return [];
  // Find the text container holding the plain staff list (the one whose
  // paragraphs carry bold names, not the <h3> heading container).
  const container = [...panel.querySelectorAll('.cmp-text')]
    .find((c) => !c.querySelector('h3, h4')
      && c.querySelector('p b, p strong')
      && [...c.querySelectorAll(':scope > p')].length >= 3);
  if (!container) return [];

  const out = [];
  container.querySelectorAll(':scope > p').forEach((p) => {
    // Split a paragraph on <br> so two-people-in-one-<p> lines separate.
    const temp = document.createElement('div');
    temp.innerHTML = p.innerHTML;
    const fragments = temp.innerHTML.split(/<br\s*\/?>/i);
    fragments.forEach((frag) => {
      const holder = document.createElement('div');
      holder.innerHTML = frag;
      const text = normalizeLine(holder.textContent);
      if (!text) return;
      const line = document.createElement('p');
      line.textContent = text;
      out.push(line);
    });
  });
  return out;
}

/*
 * Build a `table (directory)` block from the board's three text columns.
 * Each column = one cell: <h4>Head</h4> + a <p> of name lines. A line with an
 * italic role becomes "<b>Name</b>, <i>Role</i>"; a plain name (some are wrapped
 * in a stray <b> in the source) becomes plain text — matching the sample.
 * The tablet-only duplicate "Advisory Board" column (`--default--hide`) is
 * skipped so exactly three desktop columns remain.
 */
function buildDirectory(document, panel) {
  if (!panel) return null;
  const wanted = ['officers and directors', 'advisory board', 'honorary board'];
  const seen = new Set();
  const cells = [];

  wanted.forEach((headKey) => {
    const h4 = [...panel.querySelectorAll('h4')].find((h) => {
      const key = h.textContent.trim().toLowerCase();
      if (key !== headKey) return false;
      if (seen.has(key)) return false;
      // skip the responsive-hidden duplicate column
      if (h.closest('[class*="--default--hide"]')) return false;
      return true;
    });
    if (!h4) return;
    seen.add(headKey);

    const sourceP = h4.nextElementSibling && h4.nextElementSibling.tagName === 'P'
      ? h4.nextElementSibling
      : h4.parentElement.querySelector('p');

    const cell = document.createElement('div');
    const head = document.createElement('h4');
    head.textContent = h4.textContent.trim();
    cell.append(head);

    if (sourceP) {
      const outP = document.createElement('p');
      const temp = document.createElement('div');
      temp.innerHTML = sourceP.innerHTML;
      const fragments = temp.innerHTML.split(/<br\s*\/?>/i);
      let first = true;
      fragments.forEach((frag) => {
        const holder = document.createElement('div');
        holder.innerHTML = frag;
        const iEl = holder.querySelector('i, em');
        const bEl = holder.querySelector('b, strong');
        const role = iEl ? normalizeLine(iEl.textContent).replace(/^[,\s]+|[,\s]+$/g, '') : '';
        let name = '';
        if (bEl) {
          name = bEl.textContent;
        } else {
          // name = text before the role (or the whole line if no role)
          name = iEl ? holder.textContent.replace(iEl.textContent, '') : holder.textContent;
        }
        name = normalizeLine(name).replace(/[,\s]+$/g, '').trim();
        if (!name && !role) return;

        if (!first) outP.append(document.createElement('br'));
        first = false;

        if (role) {
          const b = document.createElement('b');
          b.textContent = name;
          outP.append(b);
          outP.append(document.createTextNode(', '));
          const i = document.createElement('i');
          i.textContent = role;
          outP.append(i);
        } else {
          outP.append(document.createTextNode(name));
        }
      });
      if (outP.childNodes.length) cell.append(outP);
    }

    cells.push(cell);
  });

  if (!cells.length) return null;
  return WebImporter.DOMUtils.createTable([
    ['Table (directory)'],
    cells,
  ], document);
}

export default {
  transform: ({ document, url, params }) => {
    const main = document.querySelector('#mainContent') || document.querySelector('main') || document.body;
    const emittedBlocks = ['toc-profile'];

    // 1. cleanup (strip site chrome/tracking).
    executeCleanup('beforeTransform', main, { url, params });
    executeCleanup('afterTransform', main, { url, params });

    // 2. Capture source content (before we rebuild main).
    const h1Src = main.querySelector('h1');
    const h1Text = h1Src ? h1Src.textContent.trim() : 'Leadership & Staff';

    const staffPanel = findPanel(main, 'Staff');
    const boardPanel = findPanel(main, 'Board of Directors');

    const staffCards = buildProfileCards(document, staffPanel);
    const staffList = buildStaffList(document, staffPanel);
    const boardCards = buildProfileCards(document, boardPanel);
    const directory = buildDirectory(document, boardPanel);

    if (staffCards) emittedBlocks.push('cards-profile(staff)');
    if (boardCards) emittedBlocks.push('cards-profile(board)');
    if (directory) emittedBlocks.push('table-directory');

    // 3. Rebuild main into the target section structure.
    main.textContent = '';

    // --- section 1: H1 + toc-profile ---
    const h1 = document.createElement('h1');
    h1.textContent = h1Text;
    main.append(h1);
    main.append(WebImporter.DOMUtils.createTable([
      ['toc-profile'],
      ['Staff', 'staff'],
      ['Board of Directors', 'board-of-directors'],
    ], document));

    // --- section 2: Staff ---
    main.append(document.createElement('hr'));
    const staffH3 = document.createElement('h3');
    staffH3.textContent = 'Our Staff';
    main.append(staffH3);
    if (staffCards) main.append(staffCards);
    staffList.forEach((p) => main.append(p));
    main.append(WebImporter.Blocks.createBlock(document, {
      name: 'Section Metadata',
      cells: { 'profile-anchor': 'staff' },
    }));
    emittedBlocks.push('section-metadata(staff)');

    // --- section 3: Board of Directors ---
    main.append(document.createElement('hr'));
    const boardH3 = document.createElement('h3');
    boardH3.textContent = 'Board of Directors';
    main.append(boardH3);
    if (boardCards) main.append(boardCards);
    if (directory) main.append(directory);
    main.append(WebImporter.Blocks.createBlock(document, {
      name: 'Section Metadata',
      cells: { 'profile-anchor': 'board-of-directors' },
    }));
    emittedBlocks.push('section-metadata(board)');

    // 4. Metadata block in its own section (append <hr> first).
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
      if (typeof value === 'string') v.textContent = value;
      else v.append(value);
      tr.append(k, v);
      metaTable.querySelector('tbody')?.append(tr) || metaTable.append(tr);
    };
    addMetaRow('Template', 'leadership');

    // 5. Image + link URL rules.
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

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
        blocks: emittedBlocks,
      },
    }];
  },
};
