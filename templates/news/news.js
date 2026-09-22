import {
  buildBlock, createOptimizedPicture, decorateBlock, loadBlock, getMetadata,
} from '../../scripts/aem.js';

/* Read a metadata value by its normalized key (e.g. "list-from"). The published
   pipeline normalizes metadata names to lowercase-hyphenated, but the local dev
   server serving raw `.plain.html` drafts keeps the author's label casing/spaces
   (e.g. "List From"). Fall back to a normalized scan of all <meta name> so the
   same page previews identically in both environments. */
function readMeta(key) {
  const direct = getMetadata(key);
  if (direct) return direct;
  const match = [...document.head.querySelectorAll('meta[name]')]
    .find((m) => m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') === key);
  return match ? match.content : '';
}

/* news template: builds the "Related Articles" feed in code. The feed is driven
   by author-facing page metadata so editors can steer it per page without code:

     • list-from   children | tags | static   (default: children)
     • sort-order  asc | desc                  (default: desc)
     • max-items   integer                     (default: 3)
     • news-tags   comma-separated tag(s)      (used by list-from=tags)
     • pages       comma-separated page paths  (used by list-from=static)

   Resolution ladder (most-specific wins): static → tags → children.
     - static   : exactly the articles named in `pages`.
     - tags     : articles that share at least one `news-tags` value with this page.
     - children : every article in the news query-index (the default).
   Every mode excludes the current page, sorts by publication date (falling back
   to last-modified/republish date), applies sort-order, then caps at max-items. */
const DEFAULT_LIMIT = 3;
const NEWS_INDEX_PATH = '/news-index.json';

/* Publication date (e.g. "May 06, 2026") → sortable number; last-modified is the
   fallback when an article has no publication date (a republish date). 0 if neither. */
function dateValue(entry) {
  const primary = Date.parse(entry.publicationdate || '');
  if (!Number.isNaN(primary)) return primary;
  const fallback = Date.parse(entry.lastModified || '');
  return Number.isNaN(fallback) ? 0 : fallback;
}

/* The date shown on a card. Authors set Publication Date only when known; when it
   is empty we fall back to the query-index last-modified/republish date (same key
   the sort uses), formatted to match the "August 20, 2026" style. '' if neither. */
function displayDate(entry) {
  if (entry.publicationdate) return entry.publicationdate;
  const t = Date.parse(entry.lastModified || '');
  if (Number.isNaN(t)) return '';
  return new Date(t).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: '2-digit' });
}

/* Normalize a path for comparison: drop a trailing `.html`, and strip the source
   AEM `/content/<repo>` prefix so authored `/content/usta-foundation/en/…` paths
   resolve to the EDS-relative `/en/…` used in the index. */
function normalizePath(path) {
  if (!path) return '';
  return path.trim()
    .replace(/\.html$/, '')
    .replace(/^\/content\/[^/]+/, '');
}

/* A tag's comparable key: its leaf segment, lower-cased. Lets full taxonomy paths
   (`usta:categories/about-usta/usta-foundation`) match the leaf slug stored in the
   index (`usta-foundation`). */
function tagKey(tag) {
  const trimmed = (tag || '').trim().toLowerCase();
  const leaf = trimmed.split('/').pop();
  return leaf || '';
}

/* Split a comma-separated metadata value into a clean array. */
function splitList(value) {
  return (value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/* True for a real article: a page BELOW a `/news/` folder (has a slug segment
   after it). Filters out the news landing page itself (…/news), which the query
   index includes (title "News", placeholder image, no date) and which would
   otherwise render as an empty related card. */
function isArticle(entry) {
  return !!entry.path && /\/news\/[^/]+/.test(normalizePath(entry.path));
}

/* Fetch the news query-index (real articles only); [] if unreadable. */
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

/* Resolve the candidate articles for a mode, before sort/limit and current-page
   exclusion (which the caller applies uniformly). */
function selectCandidates(mode, entries, { tags, pages }) {
  if (mode === 'static') {
    // Preserve the author's given order as a stable base; date-sort still applies.
    const wanted = pages.map(normalizePath);
    const byPath = new Map(entries.map((e) => [normalizePath(e.path), e]));
    return wanted.map((p) => byPath.get(p)).filter(Boolean);
  }

  if (mode === 'tags') {
    const wanted = new Set(tags.map(tagKey).filter(Boolean));
    if (!wanted.size) return entries; // no tags authored → behave like children
    return entries.filter((e) => splitList(e.newstags)
      .some((t) => wanted.has(tagKey(t))));
  }

  // children (default): the whole news index.
  return entries;
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
  // Read the author-facing configuration from page metadata.
  const mode = (readMeta('list-from') || 'children').trim().toLowerCase();
  const order = (readMeta('sort-order') || 'desc').trim().toLowerCase();
  const limit = parseInt(readMeta('max-items'), 10) || DEFAULT_LIMIT;
  const tags = splitList(readMeta('news-tags'));
  const pages = splitList(readMeta('pages'));

  const entries = await fetchIndex();
  if (!entries.length) return; // no index / nothing to show

  const current = normalizePath(window.location.pathname);
  const candidates = selectCandidates(mode, entries, { tags, pages })
    .filter((e) => e.path && normalizePath(e.path) !== current);

  const sorted = candidates.sort((a, b) => (order === 'asc'
    ? dateValue(a) - dateValue(b)
    : dateValue(b) - dateValue(a)));

  const articles = sorted.slice(0, limit);
  if (!articles.length) return;

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
