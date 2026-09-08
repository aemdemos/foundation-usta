/* eslint-disable */
/* global WebImporter */

/*
 * import-financials-v1 — dedicated importer for the USTA Foundation
 * who-we-are/financials.html page. This is the simplest template: ALL DEFAULT
 * CONTENT — no hero, no blocks. An H1 + three H2 sections, each a bulleted list
 * of PDF download links:
 *   H1  "Annual Reports and Financial Information"
 *   H2  "Annual Reports"                — 13 PDFs (2024 … 2010)
 *   H2  "Audited Financial Statements"  — intro para + 4 PDFs (2025 … 2022)
 *   H2  "IRS Form 990"                  — intro para + 3 PDFs (2024 … 2022)
 *
 * The PDF lists are authored as <ul><li><a>…</a></li></ul> so EDS decorateButtons()
 * leaves them as plain underlined text links (a standalone <p><a> would become a
 * button). Doc hrefs point at the source /content/dam/… paths for now (no doc
 * localizer yet — same as the other pages' PDF CTAs). The footer's social/copyright/
 * donor-privacy lines are page chrome, not content, so they're excluded.
 *
 * `Theme = general` — CSS-only page; adds body.general (no template fetch).
 */

import cleanupTransformer from './transformers/ustafoundation-cleanup.js';

const PAGE_TEMPLATE = {
  name: 'general',
  description: 'USTA Foundation financials page: all default content — H1 + three H2 sections of bulleted PDF download links.',
  blocks: [],
  sections: [],
};

const ORIGIN = 'https://www.ustafoundation.com';

function executeCleanup(hookName, element, payload) {
  try {
    cleanupTransformer.call(null, hookName, element, { ...payload, template: PAGE_TEMPLATE });
  } catch (e) {
    console.error(`Cleanup transformer failed at ${hookName}:`, e);
  }
}

const norm = (s) => (s || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

function absUrl(u) {
  if (!u) return u;
  try { return new URL(u, ORIGIN).href; } catch { return u; }
}

// The page's content, captured once from the live DOM (fixed list — deterministic).
const H1_TEXT = 'Annual Reports and Financial Information';
const GROUPS = [
  {
    heading: 'Annual Reports',
    links: [
      ['2024 Annual Report', '/content/dam/usta-foundation/pdfs/2024-ustaf-annual-report.pdf'],
      ['2023 Annual Report', '/content/dam/usta-foundation/who-we-are/financials/annual-reports/2023.pdf'],
      ['2022 Annual Report', '/content/dam/usta-foundation/who-we-are/financials/annual-reports/2022.pdf'],
      ['2021 Annual Report', '/content/dam/usta-foundation/who-we-are/financials/annual-reports/2021.pdf'],
      ['2020 Annual Report', '/content/dam/usta-foundation/who-we-are/financials/annual-reports/2020.pdf'],
      ['2019 Annual Report', '/content/dam/usta-foundation/who-we-are/financials/annual-reports/2019.pdf'],
      ['2017-2018 Annual Report', '/content/dam/usta-foundation/who-we-are/financials/annual-reports/2017-2018.pdf'],
      ['2016 Annual Report', '/content/dam/usta-foundation/who-we-are/financials/annual-reports/2016.pdf'],
      ['2015 Annual Report', '/content/dam/usta-foundation/who-we-are/financials/annual-reports/2015.pdf'],
      ['2014 Annual Report', '/content/dam/usta-foundation/who-we-are/financials/annual-reports/2014.pdf'],
      ['2013 Annual Report', '/content/dam/usta-foundation/who-we-are/financials/annual-reports/2013.pdf'],
      ['2011 - 2012 Annual Report', '/content/dam/usta-foundation/who-we-are/financials/annual-reports/2011-2012.pdf'],
      ['2010 Annual Report', '/content/dam/usta-foundation/who-we-are/financials/annual-reports/2010.pdf'],
    ],
  },
  {
    heading: 'Audited Financial Statements',
    intro: 'Click below to view or download financial statements of USTA Foundation Incorporated.',
    links: [
      ['2025 Audited Financials', '/content/dam/usta-foundation/who-we-are/financials/audited-financial-statements/2025.pdf'],
      ['2024 Audited Financials', '/content/dam/usta-foundation/who-we-are/financials/audited-financial-statements/2024.pdf'],
      ['2023 Audited Financials', '/content/dam/usta-foundation/who-we-are/financials/audited-financial-statements/2023.pdf'],
      ['2022 Audited Financials', '/content/dam/usta-foundation/who-we-are/financials/audited-financial-statements/2022.pdf'],
    ],
  },
  {
    heading: 'IRS Form 990',
    intro: "Click below to view or download USTA Foundation Incorporated's 990 forms.",
    links: [
      ['2024 - 990', '/content/dam/usta-foundation/who-we-are/financials/irs-990/2024.pdf'],
      ['2023 - 990', '/content/dam/usta-foundation/who-we-are/financials/irs-990/2023.pdf'],
      ['2022 - 990', '/content/dam/usta-foundation/who-we-are/financials/irs-990/2022.pdf'],
    ],
  },
];

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.querySelector('#mainContent') || document.querySelector('main') || document.body;
    const emittedBlocks = [];

    executeCleanup('beforeTransform', main, { url, params });
    executeCleanup('afterTransform', main, { url, params });

    const title = document.title;

    // Rebuild as pure default content: H1, then per group a H2 (+ optional intro
    // paragraph) + a <ul> of PDF links.
    main.textContent = '';

    const h1 = document.createElement('h1');
    h1.textContent = H1_TEXT;
    main.append(h1);

    GROUPS.forEach((g) => {
      const h2 = document.createElement('h2');
      h2.textContent = g.heading;
      main.append(h2);
      if (g.intro) {
        const p = document.createElement('p');
        p.textContent = g.intro;
        main.append(p);
      }
      const ul = document.createElement('ul');
      g.links.forEach(([text, href]) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = absUrl(href);
        a.textContent = text;
        li.append(a);
        ul.append(li);
      });
      main.append(ul);
    });
    emittedBlocks.push('default-content(financials)');

    // METADATA
    main.appendChild(document.createElement('hr'));
    WebImporter.rules.createMetadata(main, document);
    const metaTable = [...main.querySelectorAll('table')].find((t) => {
      const first = t.querySelector('th, td');
      return first && /^\s*metadata\s*$/i.test(first.textContent || '');
    });
    const hasRow = (key) => !!metaTable && [...metaTable.querySelectorAll('tr')]
      .some((tr) => (tr.firstElementChild?.textContent || '').trim().toLowerCase() === key.toLowerCase());
    const addMetaRow = (key, value) => {
      if (!metaTable || !value || hasRow(key)) return;
      const tr = document.createElement('tr');
      const k = document.createElement('td');
      k.textContent = key;
      const v = document.createElement('td');
      v.textContent = value;
      tr.append(k, v);
      metaTable.querySelector('tbody')?.append(tr) || metaTable.append(tr);
    };
    addMetaRow('Theme', 'general');

    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: { title, template: PAGE_TEMPLATE.name, blocks: emittedBlocks },
    }];
  },
};
