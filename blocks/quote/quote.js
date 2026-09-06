/**
 * quote-image — a bold pull-quote + attribution alongside a portrait image.
 * Authored as one row with two cells: [ quote + attribution | image ].
 * Adds semantic classes so the CSS never relies on nth-child for layout logic.
 * @param {Element} block the block element
 */
function decorateImage(block) {
  const row = block.firstElementChild;
  if (!row) return;
  row.classList.add('quote-image-row');
  const cells = [...row.children];
  cells[0]?.classList.add('quote-image-text');
  cells[1]?.classList.add('quote-image-media');
}

/**
 * quote-tweet — a static reproduction of an embedded tweet. The SOURCE renders
 * it as a BARE blockquote (the platform.twitter.com widget doesn't upgrade it):
 * plain tweet text + inline blue links, then a plain "— Name (@handle) Date"
 * line. NO card border, NO background, NO Twitter bird icon.
 *
 * We deliberately do NOT load the live platform.twitter.com widget script
 * (third-party consent + performance). All content is authored inline.
 *
 * Authored as two rows, each a single cell:
 *   row 1 -> tweet body (one or more <p>, links inline)
 *   row 2 -> footer: "— Name (@handle) Date" with the handle + date as links
 *
 * @param {Element} block the block element
 */
function decorateTweet(block) {
  const rows = [...block.children];
  rows[0]?.classList.add('quote-tweet-body');
  rows[1]?.classList.add('quote-tweet-footer');
}

/**
 * Quote block (default) — italic testimonial quote(s) + bold attribution.
 * Authoring: first row(s) hold the quotation paragraphs, the LAST row holds
 * the attribution (name + affiliation).
 * @param {Element} block
 */
function decorateDefault(block) {
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

/**
 * loads and decorates the quote block, dispatching by variant class.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  if (block.classList.contains('image')) {
    decorateImage(block);
  } else if (block.classList.contains('tweet')) {
    decorateTweet(block);
  } else {
    decorateDefault(block);
  }
}
