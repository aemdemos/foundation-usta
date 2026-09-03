/**
 * banner-stats-grid — impact stats on white:
 *   heading (h2) + featured stat (h1) + a 2x2 grid of number/label pairs.
 * Authored rows: [heading] [featured] then N × [number | label].
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  rows.forEach((row, i) => {
    if (i === 0) row.classList.add('banner-stats-grid-heading');
    else if (i === 1) row.classList.add('banner-stats-grid-featured');
    else row.classList.add('banner-stats-grid-item');
  });

  const items = rows.slice(2);
  if (items.length) {
    const wrap = document.createElement('div');
    wrap.className = 'banner-stats-grid-items';
    block.insertBefore(wrap, items[0]);
    items.forEach((it) => {
      const cells = [...it.children];
      if (cells[0]) cells[0].classList.add('banner-stats-grid-number');
      if (cells[1]) cells[1].classList.add('banner-stats-grid-label');
      wrap.appendChild(it);
    });
  }
}
