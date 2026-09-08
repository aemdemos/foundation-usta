/* eslint-disable */
/* global WebImporter */

/*
 * import-news-listing-v1 — importer for the USTA Foundation news.html listing.
 *
 * The SOURCE page is genuinely BLANK: an empty content grid, no H1, no article
 * feed — just the page title "News" (the 72 news articles are individual pages
 * under /news/*, with no authored index/listing content). For 100% parity we
 * import a faithful minimal page: only the metadata (Title "News", Theme general),
 * no body content.
 */

import cleanupTransformer from './transformers/ustafoundation-cleanup.js';

const PAGE_TEMPLATE = {
  name: 'general',
  description: 'USTA Foundation news listing — blank page (matches the empty source), title only.',
  blocks: [],
  sections: [],
};

function executeCleanup(hookName, element, payload) {
  try {
    cleanupTransformer.call(null, hookName, element, { ...payload, template: PAGE_TEMPLATE });
  } catch (e) {
    console.error(`Cleanup transformer failed at ${hookName}:`, e);
  }
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.querySelector('#mainContent') || document.querySelector('main') || document.body;

    executeCleanup('beforeTransform', main, { url, params });
    executeCleanup('afterTransform', main, { url, params });

    const title = document.title || 'News';

    // Blank body — the source has no authored content. Emit only the metadata.
    main.textContent = '';
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
    addMetaRow('Title', 'News');
    addMetaRow('Theme', 'general');

    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: { title, template: PAGE_TEMPLATE.name, blocks: ['(blank — matches empty source)'] },
    }];
  },
};
