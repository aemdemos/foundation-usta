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

  // Social: the fragment delivers the icon links as bare <a> siblings (each
  // wrapping an <img>), followed by the "Like us…" text paragraphs. Group the
  // consecutive icon links into a single row wrapper so they lay out as a
  // horizontal row and the text below is unaffected.
  const social = footer.querySelector('.footer-social');
  if (social) {
    const iconLinks = [...social.children].filter(
      (el) => el.tagName === 'A' && el.querySelector('img'),
    );
    if (iconLinks.length) {
      const row = document.createElement('div');
      row.className = 'footer-social-icons';
      iconLinks[0].before(row);
      iconLinks.forEach((a) => row.append(a));
    }
  }

  // Append the section divs directly to the block so they are the direct
  // children of the `.footer` grid container (not nested inside a wrapper).
  while (footer.firstElementChild) block.append(footer.firstElementChild);
}
