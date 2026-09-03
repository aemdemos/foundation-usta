import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
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
