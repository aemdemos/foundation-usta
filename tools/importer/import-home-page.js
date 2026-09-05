/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroBannerParser from './parsers/hero-banner.js';
import columnsStatsParser from './parsers/columns-stats.js';
import columnsStatementParser from './parsers/columns-statement.js';
import columnsFeatureParser from './parsers/columns-feature.js';
import cardsSupportParser from './parsers/cards-support.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/ustafoundation-cleanup.js';
import sectionsTransformer from './transformers/ustafoundation-sections.js';

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'home-page',
  description: 'USTA Foundation home page: hero with headline and CTA, impact stats band, mission statement, two-column content-with-video section, impact section with image collage, and a 4-card support/donation grid.',
  urls: [
    'https://www.ustafoundation.com/en/home.html',
  ],
  blocks: [
    {
      name: 'hero-banner',
      instances: ['#mainContent > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.container.responsivegrid.padding-top-none.padding-bottom-none.full-width.aem-GridColumn.aem-GridColumn--default--12:nth-of-type(1)'],
    },
    {
      name: 'columns-stats',
      instances: ['#mainContent > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.container.responsivegrid.padding-top-none.padding-bottom-none.justify-content_space-around.background-round.aem-GridColumn.aem-GridColumn--default--12'],
    },
    {
      // NOTE: "Mission Statement" is no longer a block — it is DEFAULT CONTENT.
      // The parser unwraps its heading + paragraph into the section; the section
      // is tagged with the `statement` style (see sections below) which carries
      // the centered narrow-column treatment in styles.css. Kept in the parser
      // registry so the section container is still processed/unwrapped.
      name: 'columns-statement',
      instances: ['#mainContent > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.container.responsivegrid.full-width.justify-content_space-around.aem-GridColumn--default--none.aem-GridColumn.aem-GridColumn--default--10.aem-GridColumn--offset--default--1'],
    },
    {
      name: 'columns-feature',
      instances: [
        '#mainContent > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.container.responsivegrid.padding-top-small.padding-bottom-small.aem-GridColumn--default--none.aem-GridColumn.aem-GridColumn--default--11.aem-GridColumn--offset--default--0',
        '#mainContent > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.container.responsivegrid.padding-top-none.padding-top-small.padding-bottom-none.padding-bottom-small.full-width.aem-GridColumn.aem-GridColumn--default--12:nth-of-type(8)',
      ],
    },
    {
      name: 'cards-support',
      instances: ['#mainContent > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.container.responsivegrid.padding-top-none.padding-top-small.padding-bottom-none.padding-bottom-small.full-width.aem-GridColumn.aem-GridColumn--default--12:nth-of-type(11)'],
    },
  ],
  sections: [
    {
      id: 'rc4', name: 'Hero',
      selector: '#mainContent > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.container.responsivegrid.padding-top-none.padding-bottom-none.full-width.aem-GridColumn.aem-GridColumn--default--12:nth-of-type(1)',
      style: null, blocks: ['hero-banner'], defaultContent: [],
    },
    {
      id: 'rc6', name: 'Impact Stats',
      selector: '#mainContent > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.container.responsivegrid.padding-top-none.padding-bottom-none.justify-content_space-around.background-round.aem-GridColumn.aem-GridColumn--default--12',
      style: null, blocks: ['columns-stats'], defaultContent: [],
    },
    {
      id: 'rc7', name: 'Mission Statement',
      selector: '#mainContent > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.container.responsivegrid.full-width.justify-content_space-around.aem-GridColumn--default--none.aem-GridColumn.aem-GridColumn--default--10.aem-GridColumn--offset--default--1',
      style: 'statement', blocks: ['columns-statement'], defaultContent: [],
    },
    {
      id: 'rc8', name: 'Beyond Wins Feature',
      selector: '#mainContent > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.container.responsivegrid.padding-top-small.padding-bottom-small.aem-GridColumn--default--none.aem-GridColumn.aem-GridColumn--default--11.aem-GridColumn--offset--default--0',
      style: null, blocks: ['columns-feature'], defaultContent: [],
    },
    {
      id: 'rc11', name: 'Impact Nationwide Feature',
      selector: '#mainContent > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.container.responsivegrid.padding-top-none.padding-top-small.padding-bottom-none.padding-bottom-small.full-width.aem-GridColumn.aem-GridColumn--default--12:nth-of-type(8)',
      style: null, blocks: ['columns-feature'], defaultContent: [],
    },
    {
      id: 'rc14', name: 'Support Cards',
      selector: '#mainContent > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.container.responsivegrid.padding-top-none.padding-top-small.padding-bottom-none.padding-bottom-small.full-width.aem-GridColumn.aem-GridColumn--default--12:nth-of-type(11)',
      style: 'highlight', blocks: ['cards-support'], defaultContent: [],
    },
  ],
};

// PARSER REGISTRY
const parsers = {
  'hero-banner': heroBannerParser,
  'columns-stats': columnsStatsParser,
  'columns-statement': columnsStatementParser,
  'columns-feature': columnsFeatureParser,
  'cards-support': cardsSupportParser,
};

// TRANSFORMER REGISTRY - cleanup runs first, sections after (only if 2+ sections)
const transformers = [
  cleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sectionsTransformer] : []),
];

/**
 * Execute all page transformers for a specific hook
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      let elements = [];
      try {
        elements = document.querySelectorAll(selector);
      } catch (e) {
        console.warn(`Invalid selector for "${blockDef.name}": ${selector}`);
      }
      if (!elements || elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null,
        });
      });
    });
  });
  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;

    const main = document.body;

    // 1. beforeTransform (initial cleanup)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks on page
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block using registered parsers
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return; // Already replaced by earlier parser
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. afterTransform (final cleanup + section breaks/metadata)
    executeTransformers('afterTransform', main, payload);

    // 5. WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Generate sanitized path (map root URL to /index)
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
