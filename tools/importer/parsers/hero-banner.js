/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-banner. Base: hero.
 * Source: https://www.ustafoundation.com/en/home.html
 * Generated: 2026-08-21
 *
 * Structure (from library-description.txt): 1 column, 3 rows.
 *  Row 1: block name (handled by createBlock)
 *  Row 2: background image (optional)
 *  Row 3: title (heading) + subheading (paragraph) + CTA link(s)
 */
export default function parse(element, { document }) {
  // Row 2: background image — first <img> in the hero container
  const bgImage = element.querySelector('img');

  // Row 3 content: heading, paragraph, CTA(s)
  const heading = element.querySelector('h1, h2, h3, [class*="cmp-text"] h1, [class*="title"]');
  const paragraph = element.querySelector('.cmp-text p, p');
  const ctaLinks = Array.from(element.querySelectorAll('.button a[href], a.cmp-button[href]'));

  // Empty-block guard
  if (!heading && !paragraph && ctaLinks.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  // Row 2 — background image (optional)
  if (bgImage) {
    cells.push([bgImage]);
  }

  // Row 3 — text content in a single cell
  const contentCell = [];
  if (heading) contentCell.push(heading);
  if (paragraph) contentCell.push(paragraph);
  contentCell.push(...ctaLinks);
  cells.push([contentCell]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'Hero (banner)', cells });
  element.replaceWith(block);
}
