/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-statement. Base: columns.
 * Source: https://www.ustafoundation.com/en/home.html
 * Generated: 2026-08-21
 *
 * Structure (from library-description.txt): columns block — first row is the
 * block name, subsequent rows have as many cells as visual columns.
 * This variant: a single content row with a single cell holding a centered
 * statement (heading + paragraph).
 */
export default function parse(element, { document }) {
  const heading = element.querySelector('h1, h2, h3, .cmp-text h2, [class*="title"]');
  const paragraph = element.querySelector('.cmp-text p, p');

  // Empty-block guard
  if (!heading && !paragraph) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Single column: one row, one cell holding all statement content.
  const contentCell = [];
  if (heading) contentCell.push(heading);
  if (paragraph) contentCell.push(paragraph);

  const cells = [[contentCell]];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-statement', cells });
  element.replaceWith(block);
}
