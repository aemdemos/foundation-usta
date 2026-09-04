import { createOptimizedPicture } from '../../scripts/aem.js';

/* Chevron icon matching the source widget (24x24 viewBox, 16px rendered).
   Points UP by default (collapsed); rotates 180° (down) on hover/open. */
const CHEVRON = '<svg class="cards-expand-arrow" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke-width="1.4" aria-hidden="true"><path d="m6 15 6-6 6 6" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/**
 * Expandable cards: image + title + chevron toggle + Donate button.
 * The chevron reveals/hides the description (expand/collapse); when expanded
 * the image is hidden so the card keeps the same footprint (as on the source).
 *
 * Authored table — one row per card, four cells:
 *   [image] [title] [description] [donate link]
 *
 * @param {Element} block
 */
function decorateExpand(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const li = document.createElement('li');
    li.className = 'cards-expand-card';

    const [imageCell, titleCell, descCell, donateCell] = cells;

    // Image
    const image = document.createElement('div');
    image.className = 'cards-expand-image';
    if (imageCell) {
      while (imageCell.firstChild) image.append(imageCell.firstChild);
    }

    // Title bar: heading + chevron toggle
    const titleBar = document.createElement('div');
    titleBar.className = 'cards-expand-title';
    const heading = document.createElement('h3');
    heading.textContent = titleCell ? titleCell.textContent.trim() : '';
    titleBar.append(heading);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'cards-expand-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', `Show more about ${heading.textContent}`);
    toggle.innerHTML = CHEVRON;
    titleBar.append(toggle);

    // Description (hidden until expanded)
    const desc = document.createElement('div');
    desc.className = 'cards-expand-desc';
    const descId = `cards-expand-desc-${Math.random().toString(36).slice(2, 8)}`;
    desc.id = descId;
    if (descCell) {
      while (descCell.firstChild) desc.append(descCell.firstChild);
    }
    toggle.setAttribute('aria-controls', descId);

    // Donate
    const donate = document.createElement('div');
    donate.className = 'cards-expand-donate';
    if (donateCell) {
      while (donateCell.firstChild) donate.append(donateCell.firstChild);
    }

    // Panel = title + description as ONE unit that slides up together over the
    // image on hover (matches the source's single .card-title block), so there
    // is no gap/mismatch between them.
    const panel = document.createElement('div');
    panel.className = 'cards-expand-panel';
    panel.append(titleBar, desc);

    // Toggle behaviour (click/keyboard fallback for touch; hover handles pointer)
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      toggle.setAttribute('aria-label', `${expanded ? 'Show more' : 'Show less'} about ${heading.textContent}`);
      li.classList.toggle('cards-expand-open', !expanded);
    });

    li.append(image, panel, donate);
    ul.append(li);
  });

  // Optimise images.
  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '500' }]);
    img.closest('picture').replaceWith(optimized);
  });

  block.textContent = '';
  block.append(ul);
}

/**
 * cards-news — "Related Articles" news teasers.
 * Authored as one row per card: an image cell (picture) + a body cell holding
 * a heading (title), the publish date (first <p>), an optional description (<p>),
 * and a "Read More" link (<p><a>). The image and description are optional (the
 * current-article card in the source has neither). Converts rows to <ul>/<li>
 * and tags each part so the CSS can target the decorated (source) structure.
 */
function decorateNews(block) {
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

function decorateProfile(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.querySelector('picture, img')) div.className = 'cards-profile-card-image';
      else div.className = 'cards-profile-card-body';
    });
    ul.append(li);
  });
  ul.querySelectorAll('.cards-profile-card-image img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    // replace the image (and its wrapping <p>, if any) with the optimized picture
    const wrapper = img.closest('picture') || img;
    const p = wrapper.closest('p');
    (p || wrapper).replaceWith(optimizedPic);
  });
  block.textContent = '';
  block.append(ul);
}

function decorateStats(block) {
  /* Each authored row = one stat card: [image cell, number cell, caption cell].
     Convert to <ul>/<li> and tag the cells so CSS can target them. */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    let textIdx = 0;
    [...li.children].forEach((div) => {
      if (div.querySelector('picture') || div.querySelector('img')) {
        div.className = 'cards-stats-card-image';
      } else {
        div.className = textIdx === 0 ? 'cards-stats-card-number' : 'cards-stats-card-caption';
        textIdx += 1;
      }
    });
    ul.append(li);
  });
  block.textContent = '';
  block.append(ul);
}

function decorateSupport(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-support-card-image';
      else div.className = 'cards-support-card-body';
    });
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    img.closest('picture').replaceWith(optimizedPic);
  });
  block.textContent = '';
  block.append(ul);
}

function decorateTiles(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-tiles-card-image';
      else div.className = 'cards-tiles-card-body';
    });
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    img.closest('picture').replaceWith(optimizedPic);
  });
  block.textContent = '';
  block.append(ul);
}

function decorateContent(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      // Image cell: holds only an image (picture or bare img, which EDS may
      // wrap in a <p>). Everything else is the text body.
      if (div.querySelector('picture, img') && !div.querySelector('h1, h2, h3, h4, h5, h6')) div.className = 'cards-content-card-image';
      else div.className = 'cards-content-card-body';
    });
    ul.append(li);
  });
  ul.querySelectorAll('img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    (img.closest('picture') || img).replaceWith(optimizedPic);
  });
  block.textContent = '';
  block.append(ul);
}

/**
 * Base "cards" block — dispatches to the variant decorator based on the
 * variant CSS class authored alongside the block name (e.g. "Cards (news)"
 * → <div class="cards news">). The default (no matching variant, includes
 * "content") is the content-cards layout.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  if (block.classList.contains('expand')) decorateExpand(block);
  else if (block.classList.contains('news')) decorateNews(block);
  else if (block.classList.contains('profile')) decorateProfile(block);
  else if (block.classList.contains('stats')) decorateStats(block);
  else if (block.classList.contains('support')) decorateSupport(block);
  else if (block.classList.contains('tiles')) decorateTiles(block);
  else decorateContent(block);
}
