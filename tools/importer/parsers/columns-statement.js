/* eslint-disable */
/* global WebImporter */
/**
 * Parser for the "Mission Statement" section ("Ready on the court…").
 * Source: https://www.ustafoundation.com/en/home.html
 *
 * This is NOT a block — it is plain DEFAULT CONTENT (a centered heading +
 * paragraph). The section-level `statement` style (added via Section Metadata)
 * carries the centered, narrow-column treatment in styles.css, so we simply
 * unwrap the heading and paragraph into the section as default content instead
 * of emitting a Columns block.
 */
export default function parse(element, { document }) {
  const heading = element.querySelector('h1, h2, h3, .cmp-text h2, [class*="title"]');
  const paragraph = element.querySelector('.cmp-text p, p');

  // Empty-block guard
  if (!heading && !paragraph) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const nodes = [];
  if (heading) nodes.push(heading);
  if (paragraph) nodes.push(paragraph);

  // Replace the source container with just the heading + paragraph (default
  // content). The section transformer tags this section with the `statement`
  // style so the layout/typography is applied at the section level.
  element.replaceWith(...nodes);
}
