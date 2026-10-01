/* global WebImporter */
/*
 * Block-sample importer: `cards (profile, bio)`.
 *
 * Source: leadership-and-staff.html, "Board of Directors" tab — the two leader
 * cards (Chris Evert, Kathleen Wu). Each source card is an AEM container pair:
 *   • a photo panel whose image is a CSS background
 *     (`data-desktop-background-image="/content/dam/…"`), and
 *   • a grey text panel: <h4>Name</h4> <p>&nbsp;</p> <p><b>Role</b></p> <p>Bio</p>
 * The panel is read by `data-title` (it's a hidden tab at load, so nothing here
 * depends on rendered geometry).
 *
 * Output: /drafts/block-samples/cards-profile-bio, the standard sample scaffold —
 *   spacer → intro (h1 + notes + Source) → spacer →
 *   <h3>Board of Directors</h3> + Cards (profile, bio) → spacer → metadata.
 */

const ORIGIN = 'https://www.ustafoundation.com';
const SOURCE_URL = `${ORIGIN}/en/home/who-we-are/leadership-and-staff.html`;
const SAMPLE_PATH = '/drafts/block-samples/cards-profile-bio';

const clean = (text) => (text || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

function findPanel(root, title) {
  return [...root.querySelectorAll('[role="tabpanel"]')]
    .find((p) => clean(p.getAttribute('data-title')).toLowerCase() === title.toLowerCase()) || null;
}

function spacer(document, desktop, mobile) {
  return WebImporter.Blocks.createBlock(document, {
    name: 'Spacer',
    cells: { desktop, mobile },
  });
}

/*
 * One row per leader: [ image | <h4>Name</h4><p><strong>Role</strong></p><p>Bio</p> ].
 * A leader card = a `.full-width` column holding both a background-image panel
 * and an <h4> (the Advisory/Honorary list headings have no photo panel).
 */
function buildBioCards(document, panel) {
  const rows = [['Cards (profile, bio)']];
  [...panel.querySelectorAll('h4')].forEach((h4) => {
    const col = h4.closest('.full-width');
    const photo = col && col.querySelector('[data-desktop-background-image]');
    if (!photo) return;
    const name = clean(h4.textContent);

    const imageCell = document.createElement('div');
    const img = document.createElement('img');
    img.setAttribute('src', new URL(photo.getAttribute('data-desktop-background-image'), ORIGIN).href);
    img.setAttribute('alt', name);
    imageCell.append(img);

    const bodyCell = document.createElement('div');
    const nameEl = document.createElement('h4');
    nameEl.textContent = name;
    bodyCell.append(nameEl);

    // paragraphs after the name; the source's empty spacer <p>s are dropped
    [...h4.parentElement.querySelectorAll(':scope > p')].forEach((p) => {
      const text = clean(p.textContent);
      if (!text) return;
      const out = document.createElement('p');
      if (p.querySelector('b, strong') && clean(p.querySelector('b, strong').textContent) === text) {
        const strong = document.createElement('strong');
        strong.textContent = text;
        out.append(strong);
      } else {
        out.textContent = text;
      }
      bodyCell.append(out);
    });

    rows.push([imageCell, bodyCell]);
  });
  return rows.length > 1 ? WebImporter.DOMUtils.createTable(rows, document) : null;
}

export default {
  transform: ({ document, url, params }) => {
    const main = document.querySelector('#mainContent') || document.querySelector('main') || document.body;
    const panel = findPanel(main, 'Board of Directors');
    const cards = panel ? buildBioCards(document, panel) : null;
    if (!cards) throw new Error('cards-profile-bio sample: no Board of Directors leader cards found');

    main.textContent = '';

    main.append(spacer(document, '160px', '120px'));
    main.append(document.createElement('hr'));

    const h1 = document.createElement('h1');
    h1.textContent = 'Cards (profile, bio)';
    const notes = document.createElement('p');
    notes.textContent = 'Leader bio cards: a rounded photo panel above a separate rounded grey text panel '
      + 'with the name, a bold role and a bio paragraph. One card per row on mobile, two from 768. '
      + 'The heading directly above the block renders as the light-blue label bar.';
    const source = document.createElement('p');
    const em = document.createElement('em');
    const a = document.createElement('a');
    a.href = `${SOURCE_URL}#tab=boardofdirectors`;
    a.textContent = a.href;
    em.append('Source: ', a);
    source.append(em);
    main.append(h1, notes, source);
    main.append(document.createElement('hr'));

    main.append(spacer(document, '40px', '24px'));
    main.append(document.createElement('hr'));

    const label = document.createElement('h3');
    label.textContent = clean(panel.querySelector('.cmp-text p')?.textContent) || 'Board of Directors';
    main.append(label, cards);
    main.append(document.createElement('hr'));

    main.append(spacer(document, '80px', '60px'));
    main.append(document.createElement('hr'));

    main.append(WebImporter.Blocks.createBlock(document, {
      name: 'Metadata',
      cells: { Title: 'Cards Profile Bio — Block Sample', Robots: 'noindex, nofollow' },
    }));

    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    return [{
      element: main,
      path: SAMPLE_PATH,
      report: { title: 'Cards Profile Bio — Block Sample', blocks: ['spacer', 'cards-profile-bio', 'metadata'] },
    }];
  },
};
