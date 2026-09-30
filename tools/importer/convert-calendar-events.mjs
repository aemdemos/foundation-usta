#!/usr/bin/env node
/*
 * Converts the USTA National Campus events feed into an EDS-sheet-shaped JSON
 * file for the `calendar` block. The source feed has no CORS header, so the
 * block cannot read it from our origin; this snapshot stands in for it (and has
 * the exact shape a DA spreadsheet published as JSON would have).
 *
 * Usage:
 *   node tools/importer/convert-calendar-events.mjs [--out drafts/meet/calendar-events.json]
 *
 * Output columns (one row per event): title, description (HTML), start, end
 * (YYYY-MM-DD, date only — the feed's T00:00:00Z carries no time), type, link.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';

const FEED = 'https://www.ustanationalcampus.com/usta/events?dataPagePath=/content/dam/nationalcampus/content-fragments/events/national-campus-events&source=contentFragments';

const outArg = process.argv.indexOf('--out');
const out = resolve(outArg > -1 ? process.argv[outArg + 1] : 'drafts/meet/calendar-events.json');

const dateOnly = (value) => {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value || '');
  return match ? match[1] : '';
};

const resp = await fetch(FEED, { headers: { 'user-agent': 'Mozilla/5.0 (EDS calendar converter)' } });
if (!resp.ok) throw new Error(`Feed request failed: ${resp.status}`);
const { events = [] } = await resp.json();

const data = events
  .map((e) => {
    const start = dateOnly(e.eventStartDate);
    return {
      title: (e.eventTitle || '').trim(),
      description: (e.eventDescription || '').trim(),
      start,
      end: dateOnly(e.eventEndDate) || start,
      type: (e.eventType || '').trim(),
      link: (e.eventLink || '').trim(),
    };
  })
  // an event without a title or start date can't be placed on the calendar
  .filter((e) => e.title && e.start);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({
  total: data.length, offset: 0, limit: data.length, data, ':type': 'sheet',
}, null, 2)}\n`);
// eslint-disable-next-line no-console
console.log(`Wrote ${data.length} of ${events.length} events → ${out}`);
