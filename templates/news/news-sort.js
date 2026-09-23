// Pure date/sort/title helpers for the news "Related Articles" feed, split from
// news.js so they can be unit-tested in Node (news.js imports aem.js → window).

// query-index `lastModified` is UNIX SECONDS (number), so Date.parse() → NaN.
// Normalize to ms: numeric seconds, numeric string, or a date string; 0 if none.
function lastModifiedMs(entry) {
  const raw = entry.lastModified;
  if (raw === undefined || raw === null || raw === '') return 0;
  const num = Number(raw);
  if (!Number.isNaN(num)) return num * 1000;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}

// Sort key: publication date, falling back to last-modified. 0 when neither.
export function dateValue(entry) {
  const primary = Date.parse(entry.publicationdate || '');
  return Number.isNaN(primary) ? lastModifiedMs(entry) : primary;
}

// Card date: the author's Publication Date, else the last-modified date formatted
// "August 20, 2026". '' when neither is set.
export function displayDate(entry) {
  if (entry.publicationdate) return entry.publicationdate;
  const ms = lastModifiedMs(entry);
  return ms ? new Date(ms).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: '2-digit' }) : '';
}

// Card heading: the short "Related Title" (source nav title) when set, else the
// full article title. Trims so a blank value falls back.
export function cardTitle(entry) {
  return (entry.relatedtitle || '').trim() || entry.title || '';
}

// Sort by publication date (day-granularity), then break same-day ties by the
// finer last-modified timestamp — both following `order`. Returns a new array.
export function sortNews(entries, order) {
  const dir = order === 'asc' ? 1 : -1;
  return entries.slice().sort((a, b) => dir * (dateValue(a) - dateValue(b))
    || dir * (lastModifiedMs(a) - lastModifiedMs(b)));
}
