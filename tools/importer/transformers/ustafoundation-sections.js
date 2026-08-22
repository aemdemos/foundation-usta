/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: USTA Foundation section breaks and section metadata.
 *
 * Driven by payload.template.sections from tools/importer/page-templates.json.
 * The home-page template defines 6 sections:
 *   rc4  Hero                     style: null
 *   rc6  Impact Stats             style: null
 *   rc7  Mission Statement        style: null
 *   rc8  Beyond Wins Feature      style: null
 *   rc11 Impact Nationwide        style: null
 *   rc14 Support Cards            style: "highlight"
 *
 * Expected output:
 *   - Section breaks (<hr>): sections.length - 1 = 5 (one before each non-first section)
 *   - Section Metadata blocks: 1 (only rc14 has a style)
 *
 * Section selectors come from the template (verified against migration-work/cleaned.html).
 *
 * Runs in beforeTransform: the block parsers run between the hooks and call
 * element.replaceWith(block) on the section containers, so by afterTransform the
 * original section selectors no longer match. Inserting the <hr> breaks and
 * Section Metadata blocks BEFORE parsing (as siblings of the section containers)
 * means they survive the parser's replaceWith and land in correct document order.
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

function findSectionEl(element, selector) {
  if (!selector) return null;
  let el = null;
  try {
    el = element.querySelector(selector);
  } catch (e) {
    el = null;
  }
  if (!el && element.ownerDocument) {
    try {
      el = element.ownerDocument.querySelector(selector);
    } catch (e) {
      el = null;
    }
  }
  return el;
}

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    const sections = (payload && payload.template && payload.template.sections) || [];
    if (sections.length < 2) return;

    const document = element.ownerDocument;

    // Process in reverse order so inserting nodes does not shift earlier sections.
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      const sectionEl = findSectionEl(element, section.selector);
      if (!sectionEl) continue;

      // Section Metadata block (only for sections that declare a style).
      if (section.style) {
        const metaBlock = WebImporter.Blocks.createBlock(document, {
          name: 'Section Metadata',
          cells: { style: section.style },
        });
        sectionEl.parentNode.insertBefore(metaBlock, sectionEl.nextSibling);
      }

      // Section break: insert <hr> before every section except the first.
      if (i > 0) {
        const hr = document.createElement('hr');
        sectionEl.parentNode.insertBefore(hr, sectionEl);
      }
    }
  }
}
