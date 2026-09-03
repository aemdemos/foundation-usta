/**
 * Quote block — italic testimonial quote(s) + bold attribution.
 * Authoring: first row(s) hold the quotation paragraphs, the LAST row holds
 * the attribution (name + affiliation).
 * @param {Element} block
 */
export default function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  const attribution = rows[rows.length - 1];
  attribution.classList.add('quote-attribution');

  rows.slice(0, -1).forEach((row) => row.classList.add('quote-quotation'));

  // Single-row authoring fallback: treat the only row as the quotation.
  if (rows.length === 1) {
    attribution.classList.remove('quote-attribution');
    attribution.classList.add('quote-quotation');
  }
}
