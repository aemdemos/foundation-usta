/* eslint-disable */
/* global WebImporter */

/*
 * import-calendar-v1 — builds the TEST page drafts/meet/calendar from the USTA
 * National Campus calendar (https://www.ustanationalcampus.com/en/home/calendar.html).
 *
 * The source calendar is a Vue component (`.v-calendar`) fed by a JSON endpoint
 * without CORS, so the page is imported as ONE `calendar` block whose rows carry
 * every label (read from the rendered source DOM where it exists) plus the path
 * of the local events snapshot written by tools/importer/convert-calendar-events.mjs.
 * Labels the source only renders after a search (results heading, sort menu,
 * REGISTER CTAs) are the source's own strings, captured once.
 */

const PAGE_TEMPLATE = {
  name: 'calendar',
  description: 'USTA National Campus events calendar: one calendar block (filters, month grid, day panel, search results).',
  blocks: [{ name: 'calendar', instances: ['.v-calendar'] }],
  sections: [],
};

const EVENTS_SOURCE = '/drafts/meet/calendar-events.json';
const TARGET_PATH = '/drafts/meet/calendar';

const norm = (s) => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

export default {
  transform: (payload) => {
    const { document } = payload;
    const cal = document.querySelector('.v-calendar');
    const read = (sel, fallback) => norm(cal?.querySelector(sel)?.textContent) || fallback;
    const alt = (sel, fallback) => norm(cal?.querySelector(sel)?.getAttribute('alt')) || fallback;

    const rows = [
      ['source', EVENTS_SOURCE],
      ['title', read('.v-calendar__search-title', 'Search Events')],
      ['type label', read('label[for="eventType"]', 'Select type of event')],
      ['all label', read('#eventType option[value=""]', 'All')],
      ['month label', read('label[for="eventMonth"]', 'Select month')],
      ['year label', read('label[for="eventYear"]', 'Select year')],
      ['search label', read('.v-calendar__button', 'Search')],
      ['no events', read('.v-calendar__no-events-message', 'There are no events scheduled on this day.')],
      ['legend', read('.v-calendar__tooltip', 'USTA National Campus Calendar')],
      ['results title', "Results for '{type} in {month} {year}'"],
      ['register label', 'Register'],
      ['event link label', 'Register for event'],
      ['calendar view label', alt('.v-calendar__calendar-view-btn', 'Calendar view')],
      ['sort label', alt('.v-calendar__sort-events-btn', 'Sort events')],
      ['sort date label', read('[data-analytics="calendar-sort-by-date"] + span', 'Date')],
      ['sort name label', read('[data-analytics="calendar-sort-by-name"] + span', 'Name')],
      ['years', `${cal?.querySelectorAll('#eventYear option').length || 3}`],
    ];

    const main = document.createElement('div');
    main.append(WebImporter.DOMUtils.createTable([['Calendar'], ...rows], document));

    const meta = WebImporter.DOMUtils.createTable([
      ['Metadata'],
      ['Title', norm(document.title) || 'Calendar'],
    ], document);
    main.append(meta);

    return [{
      element: main,
      path: TARGET_PATH,
      report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: ['calendar'] },
    }];
  },
};
