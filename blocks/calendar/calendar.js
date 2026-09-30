import { readBlockConfig, decorateIcons } from '../../scripts/aem.js';

/*
 * Calendar — events calendar with search, a recreation of the USTA National
 * Campus calendar (ustanationalcampus.com/en/home/calendar.html, Vue `.v-calendar`).
 *
 * Views (as on the source):
 *   - Calendar view: filters | month grid | selected-day panel. Days with events
 *     are highlighted; clicking a day lists its events in the panel.
 *   - Results view (after Search): every event of the chosen type that overlaps
 *     the chosen month, as a list with a month/day badge; sortable by date or name.
 *
 * Authoring (key/value rows; every visible string comes from here):
 *   source         link/path to the events JSON (EDS sheet `{ data: [...] }` with
 *                  title / description / start / end / type / link columns; the
 *                  source feed shape `{ events: [{ eventTitle, ... }] }` also works)
 *   title, type-label, all-label, month-label, year-label, search-label,
 *   no-events, legend, results-title (tokens {type} {month} {year}), no-results,
 *   register-label (results list CTA), event-link-label (day panel CTA),
 *   calendar-view-label, sort-label, sort-date-label, sort-name-label
 *   years          how many years the year filter offers, from this year (default 3)
 *
 * Dates are DATE-ONLY (YYYY-MM-DD). All date maths runs in UTC so a visitor's
 * timezone never shifts an event onto the neighbouring day.
 */

const DAY = 86400000;
const locale = document.documentElement.lang || navigator.language || 'en-US';
const fmt = (opts) => new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...opts });
const monthYearFmt = fmt({ month: 'long', year: 'numeric' });
const monthFmt = fmt({ month: 'long' });
const shortMonthFmt = fmt({ month: 'short' });
const weekdayFmt = fmt({ weekday: 'short' });
const weekdayLongFmt = fmt({ weekday: 'long' });
const fullDateFmt = fmt({
  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
});
const panelDateFmt = fmt({
  weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
});

const toKey = (date) => date.toISOString().slice(0, 10);
const fromKey = (key) => new Date(`${key}T00:00:00Z`);
const utc = (y, m, d = 1) => new Date(Date.UTC(y, m, d));
const pad = (n) => String(n).padStart(2, '0');

/**
 * Normalises an authored/feed date to YYYY-MM-DD (ISO, ISO datetime, M/D/YYYY
 * or a spreadsheet serial day number). Returns '' when it can't be read.
 * @param {string} value raw date value
 * @returns {string}
 */
function toDateKey(value) {
  const v = `${value ?? ''}`.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v);
  if (m) return `${m[3]}-${pad(m[1])}-${pad(m[2])}`;
  if (/^\d{5}$/.test(v)) return toKey(new Date(Date.UTC(1899, 11, 30) + Number(v) * DAY));
  return '';
}

/**
 * Reads a field from a row by any of the given names (case-insensitive).
 * @param {Object} row data row
 * @param {...string} names candidate column names
 * @returns {string}
 */
function pick(row, ...names) {
  const keys = Object.keys(row);
  const found = names
    .map((name) => keys.find((k) => k.toLowerCase() === name.toLowerCase()))
    .find((k) => k && `${row[k] ?? ''}`.trim());
  return found ? `${row[found]}`.trim() : '';
}

/**
 * Safe http(s) URL or null.
 * @param {string} href candidate URL
 * @returns {string|null}
 */
function safeUrl(href) {
  try {
    const url = new URL(href, window.location.href);
    return /^https?:$/.test(url.protocol) ? url.href : null;
  } catch (e) {
    return null;
  }
}

/**
 * Loads and normalises the events list. Accepts an EDS sheet (`data`), a
 * multi-sheet (`events.data`) or the source feed (`events` array).
 * @param {string} source events JSON URL
 * @returns {Promise<Array<Object>>}
 */
async function loadEvents(source) {
  const url = source && safeUrl(source);
  if (!url) return [];
  try {
    const resp = await fetch(url);
    if (!resp.ok) return [];
    const json = await resp.json();
    const rows = json.data || json.events?.data || (Array.isArray(json.events) ? json.events : []);
    return rows.map((row) => {
      const start = toDateKey(pick(row, 'start', 'start date', 'eventStartDate'));
      return {
        title: pick(row, 'title', 'eventTitle'),
        description: pick(row, 'description', 'eventDescription'),
        start,
        end: toDateKey(pick(row, 'end', 'end date', 'eventEndDate')) || start,
        type: pick(row, 'type', 'eventType'),
        link: pick(row, 'link', 'eventLink'),
      };
    }).filter((e) => e.title && e.start && e.end >= e.start);
  } catch (e) {
    return [];
  }
}

const SAFE_TAGS = ['P', 'B', 'STRONG', 'I', 'EM', 'BR', 'UL', 'OL', 'LI'];
const DROP_TAGS = ['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE', 'NOSCRIPT', 'SVG', 'MATH'];

/**
 * Rebuilds feed/author HTML into `target` from an allow-list of tags. The markup
 * is parsed into an inert document (nothing executes) and only text plus the
 * allowed elements are re-created with createElement — no innerHTML sink.
 * @param {Node} source parsed node whose children are copied
 * @param {Element} target destination element
 */
function appendSafe(source, target) {
  source.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      target.append(node.textContent);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE || DROP_TAGS.includes(node.tagName)) return;
    let copy = null;
    if (SAFE_TAGS.includes(node.tagName)) {
      copy = document.createElement(node.tagName.toLowerCase());
    } else if (node.tagName === 'A' && safeUrl(node.getAttribute('href'))) {
      copy = document.createElement('a');
      copy.href = safeUrl(node.getAttribute('href'));
    }
    if (copy) {
      appendSafe(node, copy);
      target.append(copy);
    } else {
      appendSafe(node, target); // unknown wrapper: keep its (safe) content
    }
  });
}

/**
 * Builds an element with a class and optional text.
 * @param {string} tag tag name
 * @param {string} className class
 * @param {string} [text] text content
 * @returns {Element}
 */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/**
 * "Wed Sep 30, 2026" — the panel heading (locale parts, no comma after weekday).
 * @param {Date} date day
 * @returns {string}
 */
function panelDate(date) {
  const parts = panelDateFmt.formatToParts(date);
  return parts
    .map((p, i) => (p.type === 'literal' && parts[i - 1]?.type === 'weekday' ? ' ' : p.value))
    .join('');
}

/**
 * "Sep 07", "Sep 16 - 19" or "Sep 30 - Oct 02".
 * @param {Object} event normalised event
 * @returns {string}
 */
function eventDates(event) {
  const s = fromKey(event.start);
  const e = fromKey(event.end);
  const start = `${shortMonthFmt.format(s)} ${pad(s.getUTCDate())}`;
  if (event.end === event.start) return start;
  const sameMonth = s.getUTCMonth() === e.getUTCMonth()
    && s.getUTCFullYear() === e.getUTCFullYear();
  return `${start} - ${sameMonth ? '' : `${shortMonthFmt.format(e)} `}${pad(e.getUTCDate())}`;
}

export default async function decorate(block) {
  const cfg = readBlockConfig(block);
  const text = (key) => (Array.isArray(cfg[key]) ? cfg[key].join(' ') : cfg[key] || '');
  block.textContent = '';

  const uid = `calendar-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date();
  const today = utc(now.getFullYear(), now.getMonth(), now.getDate());
  const state = {
    view: utc(today.getUTCFullYear(), today.getUTCMonth()),
    selected: today,
    sort: 'date',
    events: [],
  };

  /* ---------- filters ---------- */
  const filters = el('form', 'calendar-filters');
  filters.setAttribute('role', 'search');
  if (text('title')) filters.append(el('h2', 'calendar-title', text('title')));

  const field = (name, label) => {
    const wrap = el('div', 'calendar-field');
    const lab = el('label', '', label);
    lab.htmlFor = `${uid}-${name}`;
    const select = el('select');
    select.id = lab.htmlFor;
    select.name = name;
    wrap.append(lab, select);
    filters.append(wrap);
    return select;
  };
  const typeSelect = field('type', text('type-label'));
  const monthSelect = field('month', text('month-label'));
  const yearSelect = field('year', text('year-label'));
  typeSelect.append(new Option(text('all-label'), ''));
  for (let m = 0; m < 12; m += 1) monthSelect.append(new Option(monthFmt.format(utc(2000, m)), m));
  const yearCount = Math.min(Math.max(parseInt(text('years'), 10) || 3, 1), 10);
  for (let i = 0; i < yearCount; i += 1) {
    const y = today.getUTCFullYear() + i;
    yearSelect.append(new Option(y, y));
  }
  const searchBtn = el('button', 'calendar-search', text('search-label'));
  searchBtn.type = 'submit';
  filters.append(searchBtn);

  /* ---------- month grid ---------- */
  const monthView = el('div', 'calendar-month');
  const header = el('div', 'calendar-header');
  const prevBtn = el('button', 'calendar-nav calendar-prev');
  const nextBtn = el('button', 'calendar-nav calendar-next');
  [prevBtn, nextBtn].forEach((b) => { b.type = 'button'; });
  const monthTitle = el('h3', 'calendar-month-title');
  monthTitle.setAttribute('aria-live', 'polite');
  header.append(prevBtn, monthTitle, nextBtn);

  const table = el('table', 'calendar-grid');
  const headRow = el('tr');
  for (let d = 0; d < 7; d += 1) {
    const sample = utc(2023, 0, 1 + d); // 1 Jan 2023 was a Sunday
    const th = el('th', '', weekdayFmt.format(sample));
    th.scope = 'col';
    th.abbr = weekdayLongFmt.format(sample);
    headRow.append(th);
  }
  const thead = el('thead');
  thead.append(headRow);
  const tbody = el('tbody');
  table.append(thead, tbody);
  monthView.append(header, table);
  if (text('legend')) monthView.append(el('p', 'calendar-legend', text('legend')));

  /* ---------- selected-day panel ---------- */
  const panel = el('div', 'calendar-day-panel');
  panel.setAttribute('aria-live', 'polite');

  /* ---------- search results ---------- */
  const results = el('div', 'calendar-results');
  results.hidden = true;
  const resultsHeader = el('div', 'calendar-results-header');
  const resultsTitle = el('h3', 'calendar-results-title');
  const actions = el('div', 'calendar-results-actions');
  const viewBtn = el('button', 'calendar-view-button');
  viewBtn.type = 'button';
  viewBtn.setAttribute('aria-label', text('calendar-view-label'));
  viewBtn.append(el('span', 'icon icon-calendar-view'));
  const sortWrap = el('div', 'calendar-sort');
  const sortBtn = el('button', 'calendar-sort-button');
  sortBtn.type = 'button';
  sortBtn.setAttribute('aria-label', text('sort-label'));
  sortBtn.setAttribute('aria-expanded', 'false');
  sortBtn.setAttribute('aria-controls', `${uid}-sort`);
  sortBtn.append(el('span', 'icon icon-sort-events'));
  const sortMenu = el('fieldset', 'calendar-sort-menu');
  sortMenu.id = `${uid}-sort`;
  sortMenu.hidden = true;
  sortMenu.append(el('legend', '', text('sort-label')));
  [['date', text('sort-date-label')], ['name', text('sort-name-label')]].forEach(([value, label]) => {
    const lab = el('label');
    const radio = el('input');
    radio.type = 'radio';
    radio.name = `${uid}-sort`;
    radio.value = value;
    radio.checked = value === state.sort;
    lab.append(radio, el('span', '', label));
    sortMenu.append(lab);
  });
  sortWrap.append(sortBtn, sortMenu);
  actions.append(viewBtn, sortWrap);
  resultsHeader.append(resultsTitle, actions);
  const resultsList = el('ul', 'calendar-results-list');
  results.append(resultsHeader, resultsList);

  block.append(filters, monthView, panel, results);
  decorateIcons(block);

  /* ---------- rendering ---------- */
  const eventsOn = (key) => state.events.filter((e) => e.start <= key && e.end >= key);

  /**
   * Event body shared by the day panel and the results list.
   * @param {Object} event normalised event
   * @param {string} linkLabel CTA text
   * @returns {DocumentFragment}
   */
  const eventBody = (event, linkLabel) => {
    const frag = document.createDocumentFragment();
    frag.append(el('h4', 'calendar-event-title', event.title), el('p', 'calendar-event-dates', eventDates(event)));
    if (event.description) {
      const desc = el('div', 'calendar-event-description');
      appendSafe(new DOMParser().parseFromString(event.description, 'text/html').body, desc);
      if (desc.textContent.trim()) frag.append(desc);
    }
    const href = event.link && safeUrl(event.link);
    if (href && linkLabel) {
      const p = el('p', 'calendar-event-link');
      const a = el('a', '', linkLabel);
      a.href = href;
      p.append(a);
      frag.append(p);
    }
    return frag;
  };

  const renderPanel = () => {
    panel.textContent = '';
    const key = toKey(state.selected);
    panel.append(el('h3', 'calendar-selected-date', panelDate(state.selected)));
    const list = eventsOn(key);
    if (!list.length) {
      panel.append(el('p', 'calendar-no-events', text('no-events')));
      return;
    }
    const ul = el('ul', 'calendar-events');
    list.forEach((event) => {
      const li = el('li', 'calendar-event');
      li.append(eventBody(event, text('event-link-label')));
      ul.append(li);
    });
    panel.append(ul);
  };

  const syncFilters = () => {
    monthSelect.value = state.view.getUTCMonth();
    const y = `${state.view.getUTCFullYear()}`;
    if ([...yearSelect.options].some((o) => o.value === y)) yearSelect.value = y;
  };

  const renderGrid = (focusKey) => {
    const y = state.view.getUTCFullYear();
    const m = state.view.getUTCMonth();
    monthTitle.textContent = monthYearFmt.format(state.view);
    prevBtn.setAttribute('aria-label', monthYearFmt.format(utc(y, m - 1)));
    nextBtn.setAttribute('aria-label', monthYearFmt.format(utc(y, m + 1)));

    const selectedKey = toKey(state.selected);
    const todayKey = toKey(today);
    const inMonth = selectedKey.startsWith(`${y}-${pad(m + 1)}`);
    const tabKey = focusKey || (inMonth ? selectedKey : toKey(utc(y, m)));
    const lead = utc(y, m).getUTCDay();
    const days = utc(y, m + 1, 0).getUTCDate();

    tbody.textContent = '';
    let row = el('tr');
    for (let i = 0; i < lead; i += 1) row.append(el('td'));
    for (let d = 1; d <= days; d += 1) {
      const date = utc(y, m, d);
      const key = toKey(date);
      const td = el('td');
      const btn = el('button', 'calendar-day', `${d}`);
      btn.type = 'button';
      btn.dataset.date = key;
      btn.setAttribute('aria-label', fullDateFmt.format(date));
      btn.setAttribute('aria-pressed', key === selectedKey);
      btn.tabIndex = key === tabKey ? 0 : -1;
      if (key === todayKey) btn.setAttribute('aria-current', 'date');
      if (eventsOn(key).length) btn.classList.add('has-events');
      td.append(btn);
      row.append(td);
      if (date.getUTCDay() === 6) {
        tbody.append(row);
        row = el('tr');
      }
    }
    if (row.children.length) {
      while (row.children.length < 7) row.append(el('td'));
      tbody.append(row);
    }
    if (focusKey) tbody.querySelector(`[data-date="${focusKey}"]`)?.focus();
  };

  const showMonth = (y, m, focusKey) => {
    state.view = utc(y, m);
    syncFilters();
    renderGrid(focusKey);
  };

  const renderResults = () => {
    const y = parseInt(yearSelect.value, 10);
    const m = parseInt(monthSelect.value, 10);
    const first = toKey(utc(y, m));
    const last = toKey(utc(y, m + 1, 0));
    const type = typeSelect.value;
    const list = state.events
      .filter((e) => e.start <= last && e.end >= first && (!type || e.type === type))
      .sort((a, b) => (state.sort === 'name'
        ? a.title.localeCompare(b.title, locale)
        : a.start.localeCompare(b.start) || a.title.localeCompare(b.title, locale)));

    resultsTitle.textContent = text('results-title')
      .replace('{type}', typeSelect.selectedOptions[0]?.text || '')
      .replace('{month}', monthSelect.selectedOptions[0]?.text || '')
      .replace('{year}', y);
    resultsList.textContent = '';
    if (!list.length) {
      resultsList.append(el('li', 'calendar-no-results', text('no-results') || text('no-events')));
      return;
    }
    list.forEach((event) => {
      const li = el('li', 'calendar-result');
      // a multi-day event that began last month is badged with the 1st of this month
      const badgeDate = fromKey(event.start < first ? first : event.start);
      const badge = el('div', 'calendar-badge');
      badge.setAttribute('aria-hidden', 'true');
      badge.append(
        el('span', 'calendar-badge-month', monthFmt.format(badgeDate)),
        el('span', 'calendar-badge-day', `${badgeDate.getUTCDate()}`),
      );
      const body = el('div', 'calendar-result-body');
      body.append(eventBody(event, text('register-label')));
      li.append(badge, body);
      resultsList.append(li);
    });
  };

  const setView = (showResults) => {
    results.hidden = !showResults;
    monthView.hidden = showResults;
    panel.hidden = showResults;
    block.classList.toggle('is-results', showResults);
  };

  /* ---------- events ---------- */
  prevBtn.addEventListener('click', () => showMonth(state.view.getUTCFullYear(), state.view.getUTCMonth() - 1));
  nextBtn.addEventListener('click', () => showMonth(state.view.getUTCFullYear(), state.view.getUTCMonth() + 1));

  tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('.calendar-day');
    if (!btn) return;
    state.selected = fromKey(btn.dataset.date);
    renderGrid(btn.dataset.date);
    renderPanel();
  });

  tbody.addEventListener('keydown', (e) => {
    const btn = e.target.closest('.calendar-day');
    if (!btn) return;
    const date = fromKey(btn.dataset.date);
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth();
    const d = date.getUTCDate();
    const dow = date.getUTCDay();
    const moves = {
      ArrowLeft: () => utc(y, m, d - 1),
      ArrowRight: () => utc(y, m, d + 1),
      ArrowUp: () => utc(y, m, d - 7),
      ArrowDown: () => utc(y, m, d + 7),
      Home: () => utc(y, m, d - dow),
      End: () => utc(y, m, d + 6 - dow),
      PageUp: () => utc(y, m - 1, Math.min(d, utc(y, m, 0).getUTCDate())),
      PageDown: () => utc(y, m + 1, Math.min(d, utc(y, m + 2, 0).getUTCDate())),
    };
    if (!moves[e.key]) return;
    e.preventDefault();
    const target = moves[e.key]();
    showMonth(target.getUTCFullYear(), target.getUTCMonth(), toKey(target));
  });

  filters.addEventListener('submit', (e) => {
    e.preventDefault();
    renderResults();
    setView(true);
    resultsTitle.tabIndex = -1;
    resultsTitle.focus();
  });

  viewBtn.addEventListener('click', () => {
    setView(false);
    showMonth(parseInt(yearSelect.value, 10), parseInt(monthSelect.value, 10));
    tbody.querySelector('[tabindex="0"]')?.focus();
  });

  const closeSort = () => {
    sortMenu.hidden = true;
    sortBtn.setAttribute('aria-expanded', 'false');
  };
  sortBtn.addEventListener('click', () => {
    const open = sortMenu.hidden;
    sortMenu.hidden = !open;
    sortBtn.setAttribute('aria-expanded', `${open}`);
  });
  sortMenu.addEventListener('change', (e) => {
    state.sort = e.target.value;
    renderResults();
    closeSort();
    sortBtn.focus();
  });
  sortWrap.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !sortMenu.hidden) {
      closeSort();
      sortBtn.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (!sortWrap.contains(e.target)) closeSort();
  });

  /* ---------- initial render ---------- */
  syncFilters();
  renderGrid();
  renderPanel();
  state.events = await loadEvents(cfg.source);
  [...new Set(state.events.map((e) => e.type).filter(Boolean))]
    .forEach((type) => typeSelect.append(new Option(type, type)));
  renderGrid();
  renderPanel();
}
