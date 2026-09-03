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
export default function decorate(block) {
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
