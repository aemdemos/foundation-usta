import {
  buildBlock, createOptimizedPicture, decorateBlock, loadBlock, getMetadata,
} from '../../scripts/aem.js';
import { displayDate, sortNews, cardTitle } from './news-sort.js';

// Read a metadata value by normalized key (e.g. "list-from"). The published
// pipeline lowercase-hyphenates names; the dev server serving raw `.plain.html`
// keeps the author's label ("List From"), so fall back to a normalized scan.
function readMeta(key) {
  const direct = getMetadata(key);
  if (direct) return direct;
  const match = [...document.head.querySelectorAll('meta[name]')]
    .find((m) => m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') === key);
  return match ? match.content : '';
}

// The feed is author-driven via page metadata (resolution ladder: static → tags
// → children):
//   list-from   children | tags | static   (default: children)
//   sort-order  asc | desc                  (default: desc)
//   max-items   integer                     (default: 3)
//   news-tags   comma-separated tag(s)      (list-from=tags)
//   pages       comma-separated page paths  (list-from=static)
const DEFAULT_LIMIT = 3;
const NEWS_INDEX_PATH = '/news-index.json';

// Normalize a path for comparison: drop trailing `.html` and the source AEM
// `/content/<repo>` prefix so authored paths resolve to the EDS-relative `/en/…`.
function normalizePath(path) {
  if (!path) return '';
  return path.trim().replace(/\.html$/, '').replace(/^\/content\/[^/]+/, '');
}

// A tag's comparable key: its leaf segment, lower-cased, so a full taxonomy path
// (`usta:categories/about-usta/usta-foundation`) matches the index leaf slug.
function tagKey(tag) {
  return (tag || '').trim().toLowerCase().split('/').pop() || '';
}

// Split a comma-separated metadata value into a clean array.
function splitList(value) {
  return (value || '').split(',').map((s) => s.trim()).filter(Boolean);
}

// True for a real article: a page BELOW a `/news/` folder. Excludes the news
// landing page (…/news), which the index includes but which has no article card.
function isArticle(entry) {
  return !!entry.path && /\/news\/[^/]+/.test(normalizePath(entry.path));
}

// Fetch the news query-index (real articles only); [] if unreadable.
async function fetchIndex() {
  try {
    const resp = await fetch(NEWS_INDEX_PATH);
    if (!resp.ok) throw new Error(`news index ${resp.status}`);
    const json = await resp.json();
    return Array.isArray(json.data) ? json.data.filter(isArticle) : [];
  } catch (e) {
    return [];
  }
}

// Candidate articles for a mode, before sort/limit and current-page exclusion.
function selectCandidates(mode, entries, { tags, pages }) {
  if (mode === 'static') {
    // Named pages, in the author's order (date-sort still applies afterwards).
    const byPath = new Map(entries.map((e) => [normalizePath(e.path), e]));
    return pages.map((p) => byPath.get(normalizePath(p))).filter(Boolean);
  }
  if (mode === 'tags') {
    // Tag-scoped pool only. Empty news-tags → nothing (never fall back to all).
    const wanted = new Set(tags.map(tagKey).filter(Boolean));
    if (!wanted.size) return [];
    return entries.filter((e) => splitList(e.newstags).some((t) => wanted.has(tagKey(t))));
  }
  return entries; // children (default): the whole news index
}

// One cards-news row: [ image | h3 title, date, desc, Read More ]. Cells passed
// as `{ elems }` so cards.js `decorateNews` sees the <p>s as direct children.
function newsRow(entry) {
  // Image links to the article but is decorative for AT (the title link names
  // it): empty alt + aria-hidden + tabindex=-1 avoids a redundant stop.
  let imageLink = null;
  if (entry.image) {
    // Cards render ~230px; serve a right-sized <picture> (500 ≈ the slot at 2×).
    const picture = createOptimizedPicture(entry.image, '', false, [{ width: '500' }]);
    imageLink = document.createElement('a');
    imageLink.href = entry.path;
    imageLink.setAttribute('tabindex', '-1');
    imageLink.setAttribute('aria-hidden', 'true');
    imageLink.append(picture);
  }

  // Body cell: short "Related Title" (or full title) linking to the article.
  const bodyElems = [];
  const title = document.createElement('h3');
  const titleLink = document.createElement('a');
  titleLink.href = entry.path;
  titleLink.textContent = cardTitle(entry);
  title.append(titleLink);
  bodyElems.push(title);
  const dateText = displayDate(entry);
  if (dateText) {
    const date = document.createElement('p');
    date.textContent = dateText;
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
  // Author-facing configuration from page metadata (see the constants above).
  const mode = (readMeta('list-from') || 'children').trim().toLowerCase();
  const order = (readMeta('sort-order') || 'desc').trim().toLowerCase();
  const limit = parseInt(readMeta('max-items'), 10) || DEFAULT_LIMIT;
  const tags = splitList(readMeta('news-tags'));
  const pages = splitList(readMeta('pages'));

  const entries = await fetchIndex();
  if (!entries.length) return;

  const current = normalizePath(window.location.pathname);
  const candidates = selectCandidates(mode, entries, { tags, pages })
    .filter((e) => e.path && normalizePath(e.path) !== current);

  const articles = sortNews(candidates, order).slice(0, limit);
  if (!articles.length) return;

  const heading = document.createElement('h2');
  heading.id = 'related-articles';
  heading.textContent = 'Related Articles';

  const block = buildBlock('cards', articles.map(newsRow));
  block.classList.add('news');

  // Attach into the marked section (Section Metadata), else append one.
  let section = main.querySelector('.section.related-articles');
  if (!section) {
    section = document.createElement('div');
    section.classList.add('section', 'related-articles');
    main.append(section);
  }
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
