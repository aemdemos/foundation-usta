/* Pure date/sort helpers for the news "Related Articles" feed, extracted from
   news.js so they can be unit-tested in Node (news.js itself imports aem.js,
   which touches `window`). No DOM/browser dependencies here. */

/* The query-index emits `lastModified` as a UNIX-SECONDS number (e.g. 1790086644),
   NOT a date string — so `Date.parse(entry.lastModified)` returns NaN and the
   last-modified fallback silently collapses to 0. Normalize it to milliseconds:
   accept the numeric-seconds form (the index), a numeric string, or a parseable
   date string (belt-and-braces). 0 when absent/unparseable. */
export function lastModifiedMs(entry) {
  const raw = entry.lastModified;
  if (raw === undefined || raw === null || raw === '') return 0;
  const num = Number(raw);
  if (!Number.isNaN(num)) return num * 1000; // unix seconds → ms
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/* Publication date (e.g. "May 06, 2026") → sortable number; last-modified is the
   fallback when an article has no publication date (a republish date). 0 if neither. */
export function dateValue(entry) {
  const primary = Date.parse(entry.publicationdate || '');
  if (!Number.isNaN(primary)) return primary;
  return lastModifiedMs(entry);
}

/* Last-modified (republish) timestamp → sortable number; 0 if absent/unparseable.
   Used as the tie-break so articles sharing a publication date resolve in the same
   order the source list component does (its orderBy is "modified"). */
export function modifiedValue(entry) {
  return lastModifiedMs(entry);
}

/* The date shown on a card. Authors set Publication Date only when known; when it
   is empty we fall back to the query-index last-modified/republish date (same key
   the sort uses), formatted to match the "August 20, 2026" style. '' if neither. */
export function displayDate(entry) {
  if (entry.publicationdate) return entry.publicationdate;
  const ms = lastModifiedMs(entry);
  if (!ms) return '';
  return new Date(ms).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: '2-digit' });
}

/* Sort news entries by publication date (last-modified fallback), applying
   sort-order; on a tie, fall back to last-modified ASCENDING — the source list
   (orderBy="modified") breaks same-date ties earliest-modified first, regardless
   of the primary sort direction. Returns a NEW array (does not mutate input). */
export function sortNews(entries, order) {
  return entries.slice().sort((a, b) => {
    const byDate = order === 'asc'
      ? dateValue(a) - dateValue(b)
      : dateValue(b) - dateValue(a);
    if (byDate) return byDate;
    return modifiedValue(a) - modifiedValue(b);
  });
}
