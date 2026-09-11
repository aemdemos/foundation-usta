import {
  buildBlock, createOptimizedPicture, decorateBlock, loadBlock,
} from '../../scripts/aem.js';

/* news template: builds the "Related Articles" feed in code — reads the news
   query-index, builds a `cards (news)` block from the latest articles, attaches it. */
const RELATED_LIMIT = 3;
const NEWS_INDEX_PATH = '/news-index.json';

/* Publication date (e.g. "May 06, 2026") → sortable number; 0 if unparseable. */
function dateValue(dateStr) {
  if (!dateStr) return 0;
  const t = Date.parse(dateStr);
  return Number.isNaN(t) ? 0 : t;
}

/* Latest news from the query-index (newest first), excluding the current page; [] if unreadable. */
async function getLatestNews(limit, excludePath) {
  let entries = [];
  try {
    const resp = await fetch(NEWS_INDEX_PATH);
    if (!resp.ok) throw new Error(`news index ${resp.status}`);
    const json = await resp.json();
    entries = Array.isArray(json.data) ? json.data : [];
  } catch (e) {
    return [];
  }

  const current = excludePath.replace(/\.html$/, '');
  return entries
    .filter((e) => e.path && e.path.replace(/\.html$/, '') !== current)
    .sort((a, b) => dateValue(b.publicationdate) - dateValue(a.publicationdate))
    .slice(0, limit);
}

/* One cards-news row: [ image | h3 title, date, desc, Read More ]. Cells passed
   as `{ elems }` so cards.js `decorateNews` sees the <p>s as direct children. */
function newsRow(entry) {
  // Image links to the article but is DECORATIVE for AT (the title link already
  // names it): empty alt + aria-hidden + tabindex=-1 avoids a redundant stop.
  let imageLink = null;
  if (entry.image) {
    // Cards render ~230px but the index image is 1200px; serve a right-sized
    // responsive <picture> (500 ≈ the slot at 2×).
    const picture = createOptimizedPicture(entry.image, '', false, [{ width: '500' }]);
    imageLink = document.createElement('a');
    imageLink.href = entry.path;
    imageLink.setAttribute('tabindex', '-1');
    imageLink.setAttribute('aria-hidden', 'true');
    imageLink.append(picture);
  }

  // Body cell contents. Title text links to the article (like the source).
  const bodyElems = [];
  const title = document.createElement('h3');
  const titleLink = document.createElement('a');
  titleLink.href = entry.path;
  titleLink.textContent = entry.title || '';
  title.append(titleLink);
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

  return [{ elems: imageLink ? [imageLink] : [] }, { elems: bodyElems }];
}

/**
 * loads and decorates the news template
 * @param {Element} main the page's <main> element
 */
export default async function decorate(main) {
  // Reverse the newest-first list so the LATEST card lands on the right (matches the source).
  const articles = (await getLatestNews(RELATED_LIMIT, window.location.pathname)).reverse();
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
  // Standard cards container class so the section matches an authored one.
  section.classList.add('cards-container');
  const headingWrapper = document.createElement('div');
  headingWrapper.className = 'default-content-wrapper';
  headingWrapper.append(heading);
  const blockWrapper = document.createElement('div');
  blockWrapper.className = 'cards-wrapper';
  blockWrapper.append(block);
  section.append(headingWrapper, blockWrapper);

  decorateBlock(block);
  await loadBlock(block);
}
