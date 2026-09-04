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
 * quote-tweet — a static, self-contained reproduction of an embedded tweet,
 * styled as a card (tweet text + @mentions/#hashtags/pic.twitter link, then a
 * handle + date footer, with a Twitter/X bird glyph top-right).
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

  // Twitter/X bird glyph — inline SVG so it needs no network request and
  // inherits an explicit fill (currentColor is unreliable for EDS icons).
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('class', 'quote-tweet-bird');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('focusable', 'false');
  icon.innerHTML = '<path fill="#1d9bf0" d="M23.643 4.937c-.835.37-1.732.62-2.675.733a4.67 4.67 0 0 0 2.048-2.578 9.3 9.3 0 0 1-2.958 1.13 4.66 4.66 0 0 0-7.938 4.25 13.229 13.229 0 0 1-9.602-4.868c-.4.69-.63 1.49-.63 2.342A4.66 4.66 0 0 0 3.96 9.824a4.647 4.647 0 0 1-2.11-.583v.06a4.66 4.66 0 0 0 3.737 4.568 4.692 4.692 0 0 1-2.104.08 4.661 4.661 0 0 0 4.352 3.234 9.348 9.348 0 0 1-5.786 1.995 9.5 9.5 0 0 1-1.112-.065 13.175 13.175 0 0 0 7.14 2.093c8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602a9.47 9.47 0 0 0 2.323-2.41z"/>';
  block.prepend(icon);
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
