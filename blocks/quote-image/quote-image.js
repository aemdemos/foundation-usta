/**
 * quote-image — a bold pull-quote + attribution alongside a portrait image.
 * Authored as one row with two cells: [ quote + attribution | image ].
 * Adds semantic classes so the CSS never relies on nth-child for layout logic.
 * @param {Element} block the block element
 */
export default function decorate(block) {
  const row = block.firstElementChild;
  if (!row) return;
  row.classList.add('quote-image-row');
  const cells = [...row.children];
  cells[0]?.classList.add('quote-image-text');
  cells[1]?.classList.add('quote-image-media');
}
