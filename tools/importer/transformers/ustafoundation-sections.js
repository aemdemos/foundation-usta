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

/**
 * Full-bleed separator bands the source stacks between sections, authored as
 * Spacer blocks so they are content-controlled (color + height) and survive
 * re-import. Keyed by the section the band should appear BEFORE; `after` marks
 * the trailing band appended after the last section (before the footer).
 *   - blue  #e2f7ff strip before the Impact and Support sections
 *   - black #000 strip after the Support section (butts the footer)
 * Each band is a Spacer block in its own section (wrapped in <hr> breaks).
 */
const SECTION_BANDS = {
  'Impact Nationwide Feature': [{ color: 'cards-band-bg', height: '17px' }],
  'Support Cards': [{ color: 'cards-band-bg', height: '17px' }],
};
const TRAILING_BANDS = [{ color: 'stats-band-bg', height: '17px' }];

function createSpacerBlock(document, band) {
  return WebImporter.Blocks.createBlock(document, {
    name: 'Spacer',
    cells: { color: band.color, desktop: band.height },
  });
}

/** Insert a spacer block as its own section (with a leading <hr>) before ref. */
function insertSpacerSection(document, parent, ref, band) {
  const hr = document.createElement('hr');
  const spacer = createSpacerBlock(document, band);
  parent.insertBefore(hr, ref);
  parent.insertBefore(spacer, ref);
}

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

    // Trailing separator band(s) after the last section (before the footer),
    // each as its own Spacer section. Appended first (reverse order) so the
    // last section's own break logic is unaffected.
    const lastSection = sections[sections.length - 1];
    const lastEl = findSectionEl(element, lastSection.selector);
    if (lastEl) {
      // insert after the last section, in reverse so document order is preserved
      for (let b = TRAILING_BANDS.length - 1; b >= 0; b -= 1) {
        const ref = lastEl.nextSibling;
        const hr = document.createElement('hr');
        const spacer = createSpacerBlock(document, TRAILING_BANDS[b]);
        lastEl.parentNode.insertBefore(spacer, ref);
        lastEl.parentNode.insertBefore(hr, spacer);
      }
    }

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

      // Separator band(s) BEFORE this section, each as its own Spacer section
      // (inserted before this section's leading <hr> so they land above it).
      const bands = SECTION_BANDS[section.name];
      if (bands && i > 0) {
        for (let b = bands.length - 1; b >= 0; b -= 1) {
          insertSpacerSection(document, sectionEl.parentNode, sectionEl.previousSibling || sectionEl, bands[b]);
        }
      }
    }
  }
}
