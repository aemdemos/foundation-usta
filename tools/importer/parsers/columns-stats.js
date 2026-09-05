/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-stats. Base: columns.
 * Source: https://www.ustafoundation.com/en/home.html
 * Generated: 2026-08-21
 *
 * Structure (from library-description.txt): columns block — first row is the
 * block name, subsequent rows have as many cells as visual columns.
 * This variant: a single content row with 3 cells, one per stat.
 * Each stat cell = big number + label (two <p><b>...</b></p> in a .cmp-text).
 */
export default function parse(element, { document }) {
  // Each stat lives in a .text grid column that wraps a .cmp-text content div.
  // Separators (.separator) are excluded because they have no .cmp-text.
  const statColumns = Array.from(element.querySelectorAll(':scope .text'))
    .filter((col) => col.querySelector('.cmp-text p, p'));

  // Empty-block guard
  if (statColumns.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Build one cell per stat: the number + label paragraphs.
  const row = statColumns.map((col) => {
    const content = col.querySelector('.cmp-text.phe--display-none, [id^="text-"], .cmp-text') || col;
    const paragraphs = Array.from(content.querySelectorAll(':scope > p'));
    return paragraphs.length ? paragraphs : [content];
  });

  const cells = [row];

  const block = WebImporter.Blocks.createBlock(document, { name: 'Columns (stats)', cells });
  element.replaceWith(block);
}
