/**
 * custom-content-related-articles — the "Related Articles" feed section.
 *
 * On the source this list is populated dynamically from a backend feed/query
 * (an AEM list-core-component with a Vue widget). That query/index dependency
 * doesn't exist in EDS, so this is a STATIC lift: the related items are authored
 * directly. The block pairs a section heading with a set of news cards that
 * reuse the site's news-card visual style (landscape image + title + date +
 * description + "Read More"), kept self-contained here (no cross-block imports).
 *
 * Authored structure (nested-div rows):
 *   row 1 — a single cell holding the section heading (<h2>Related Articles</h2>)
 *   row 2..n — one card each: an image cell (picture) + a body cell holding a
 *              heading (title), the date (first <p>), an optional description
 *              (<p>), and a "Read More" link (<p><a>). Image + description are
 *              optional (the current-article card in the source has neither).
 */
export default function decorate(block) {
  const rows = [...block.children];
  const ul = document.createElement('ul');
  let heading = null;

  rows.forEach((row) => {
    const cells = [...row.children];

    // Heading row: a single cell whose content is the section heading.
    if (cells.length === 1 && cells[0].querySelector('h1, h2, h3, h4, h5, h6')
      && !cells[0].querySelector('picture')) {
      heading = cells[0].querySelector('h1, h2, h3, h4, h5, h6');
      heading.classList.add('custom-content-related-articles-heading');
      return;
    }

    // Card row.
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);

    [...li.children].forEach((cell) => {
      if (cell.children.length === 1 && cell.querySelector('picture')) {
        cell.className = 'custom-content-related-articles-card-image';
      } else if (!cell.textContent.trim() && !cell.querySelector('picture')) {
        // empty image cell (the current-article card) — drop it
        cell.remove();
      } else {
        cell.className = 'custom-content-related-articles-card-body';
      }
    });

    const body = li.querySelector('.custom-content-related-articles-card-body');
    if (body) {
      const title = body.querySelector('h1, h2, h3, h4, h5, h6');
      if (title) title.className = 'custom-content-related-articles-card-title';

      let dateAssigned = false;
      [...body.querySelectorAll(':scope > p')].forEach((p) => {
        const a = p.querySelector('a');
        if (a && p.textContent.trim() === a.textContent.trim()) {
          p.className = 'custom-content-related-articles-card-link';
        } else if (!dateAssigned) {
          p.className = 'custom-content-related-articles-card-date';
          dateAssigned = true;
        } else {
          p.className = 'custom-content-related-articles-card-desc';
        }
      });
    }

    ul.append(li);
  });

  block.textContent = '';
  if (heading) block.append(heading);
  block.append(ul);
}
