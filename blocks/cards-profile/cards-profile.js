import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
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
