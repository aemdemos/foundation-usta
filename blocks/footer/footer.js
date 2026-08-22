/**
 * Fetch the footer fragment. Metadata-independent dual-fetch:
 * /content first (localhost / aem up), then root (DA/EDS production).
 */
async function fetchFooterHtml() {
  let resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) resp = await fetch('/footer.plain.html');
  if (!resp.ok) return null;
  return resp.text();
}

/**
 * Loads and decorates the footer from content/footer.plain.html.
 * Content-first: all links/labels/images come from the fragment.
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const html = await fetchFooterHtml();
  block.textContent = '';
  if (!html) return;

  const footer = document.createElement('div');
  footer.innerHTML = html;

  // The fragment lives at /content/footer.plain.html, so relative image paths
  // (images/…) must resolve against /content/, not the current page URL.
  footer.querySelectorAll('img[src]').forEach((img) => {
    const src = img.getAttribute('src');
    if (src && !/^(https?:)?\/\//.test(src) && !src.startsWith('/')) {
      img.setAttribute('src', `/content/${src}`);
    }
  });

  // Assign section roles by order: brand, nav, social, legal.
  const sections = [...footer.children];
  ['brand', 'nav', 'social', 'legal'].forEach((name, i) => {
    if (sections[i]) sections[i].classList.add(`footer-${name}`);
  });

  // Brand: mark logo link and CTA button.
  const brand = footer.querySelector('.footer-brand');
  if (brand) {
    const links = brand.querySelectorAll('a');
    if (links[0]) links[0].classList.add('footer-logo-link');
    if (links[1]) links[1].classList.add('footer-keepup');
  }

  block.append(footer);
}
