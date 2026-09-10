import {
  buildBlock, decorateBlock, loadBlock,
} from '../../scripts/aem.js';
import getLatestNews from '../../scripts/related-news.js';

/*
 * news template: builds the "Related Articles" feed in code (never authored).
 * Reads the news query-index, builds a `cards (news)` block from the latest
 * articles, and attaches it — reusing the site's existing card style.
 */
const RELATED_LIMIT = 3;

/* One cards-news row: [ image | h3 title, date, desc, Read More ].
   Cells passed as `{ elems }` (no wrapper div) so cards.js `decorateNews`
   sees the <p>s as direct children — its `:scope > p` lookup needs that. */
function newsRow(entry) {
  // Image cell.
  let picture = null;
  if (entry.image) {
    picture = document.createElement('picture');
    const img = document.createElement('img');
    img.src = entry.image;
    img.alt = entry.title || '';
    img.loading = 'lazy';
    picture.append(img);
  }

  // Body cell contents.
  const bodyElems = [];
  const title = document.createElement('h3');
  title.textContent = entry.title || '';
  bodyElems.push(title);
  if (entry.publicationdate) {
    const date = document.createElement('p');
    date.textContent = entry.publicationdate;
    bodyElems.push(date);
  }
  if (entry.description) {
    const desc = document.createElement('p');
    desc.textContent = entry.description;
    bodyElems.push(desc);
  }
  const linkP = document.createElement('p');
  const link = document.createElement('a');
  link.href = entry.path;
  link.textContent = 'Read More';
  linkP.append(link);
  bodyElems.push(linkP);

  return [{ elems: picture ? [picture] : [] }, { elems: bodyElems }];
}

/**
 * loads and decorates the news template
 * @param {Element} main the page's <main> element
 */
export default async function decorate(main) {
  // Strip any authored feed (legacy imports) so the code-built one isn't a dupe.
  main.querySelectorAll('.cards.news, .custom-content-related-articles').forEach((el) => {
    el.closest('[class$="-wrapper"]')?.remove();
    el.remove();
  });
  // ...and its now-orphaned "Related Articles" heading.
  main.querySelectorAll('h2').forEach((h) => {
    if (/^related articles$/i.test(h.textContent.trim()) && !h.closest('.section.related-articles')) {
      h.closest('.default-content-wrapper')?.remove();
      h.remove();
    }
  });

  const articles = await getLatestNews({
    limit: RELATED_LIMIT,
    excludePath: window.location.pathname,
  });
  if (!articles.length) return; // no index / nothing to show

  const heading = document.createElement('h2');
  heading.id = 'related-articles';
  heading.textContent = 'Related Articles';

  const block = buildBlock('cards', articles.map(newsRow));
  block.classList.add('news'); // cards `news` variant

  // Attach into the marked section (Section Metadata), else append one.
  let section = main.querySelector('.section.related-articles');
  if (!section) {
    section = document.createElement('div');
    section.classList.add('section', 'related-articles');
    main.append(section);
  }
  const headingWrapper = document.createElement('div');
  headingWrapper.className = 'default-content-wrapper';
  headingWrapper.append(heading);
  const blockWrapper = document.createElement('div');
  blockWrapper.append(block);
  section.append(headingWrapper, blockWrapper);

  decorateBlock(block);
  await loadBlock(block);
}
