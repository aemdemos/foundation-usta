/**
 * cards-news — "Related Articles" news teasers.
 * Authored as one row per card: an image cell (picture) + a body cell holding
 * a heading (title), the publish date (first <p>), an optional description (<p>),
 * and a "Read More" link (<p><a>). The image and description are optional (the
 * current-article card in the source has neither). Converts rows to <ul>/<li>
 * and tags each part so the CSS can target the decorated (source) structure.
 */
export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);

    [...li.children].forEach((cell) => {
      if (cell.children.length === 1 && cell.querySelector('picture')) {
        cell.className = 'cards-news-card-image';
      } else if (!cell.textContent.trim() && !cell.querySelector('picture')) {
        // empty image cell (e.g. the current-article card) — drop it
        cell.remove();
      } else {
        cell.className = 'cards-news-card-body';
      }
    });

    const body = li.querySelector('.cards-news-card-body');
    if (body) {
      const title = body.querySelector('h1, h2, h3, h4, h5, h6');
      if (title) title.className = 'cards-news-card-title';

      let dateAssigned = false;
      [...body.querySelectorAll(':scope > p')].forEach((p) => {
        const a = p.querySelector('a');
        if (a && p.textContent.trim() === a.textContent.trim()) {
          p.className = 'cards-news-card-link';
        } else if (!dateAssigned) {
          p.className = 'cards-news-card-date';
          dateAssigned = true;
        } else {
          p.className = 'cards-news-card-desc';
        }
      });
    }

    ul.append(li);
  });

  block.textContent = '';
  block.append(ul);
}
