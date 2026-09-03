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

  // DA-authored <picture> elements carry <source srcset> renditions whose
  // filenames differ from the working <img src> (an extra hash suffix) and are
  // not present locally — the browser would prefer the 404ing <source> and the
  // logo/icons break. These fragment images need no responsive art-direction,
  // so drop the <source>s and always use the <img>.
  footer.querySelectorAll('picture source').forEach((s) => s.remove());

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

  // Social: group the icon links into a single row wrapper so they lay out as
  // a horizontal row (the text paragraphs below are left untouched). The icon
  // links arrive in one of two shapes depending on the content source:
  //   • bare <a><img></a> siblings (local/DA authoring), or
  //   • each <a><img></a> wrapped in its own <p> (production/xwalk), which would
  //     otherwise stack vertically because each <p> is a block.
  // Handle both: collect the icon-bearing top-level nodes (the <a> itself, or a
  // <p> that contains only an image link), unwrap any <p> to the inner <a>, and
  // move them all into the row.
  const social = footer.querySelector('.footer-social');
  if (social) {
    const iconNodes = [...social.children].filter((el) => {
      if (el.tagName === 'A') return !!el.querySelector('img');
      // A <p> counts as an icon holder only if its sole content is an image link
      // (so text paragraphs like "Like us…" are never swept in).
      if (el.tagName === 'P') {
        const link = el.querySelector(':scope > a');
        return !!(link && link.querySelector('img') && !el.textContent.trim());
      }
      return false;
    });
    if (iconNodes.length) {
      const row = document.createElement('div');
      row.className = 'footer-social-icons';
      iconNodes[0].before(row);
      iconNodes.forEach((node) => {
        const link = node.tagName === 'A' ? node : node.querySelector(':scope > a');
        row.append(link);
        if (node.tagName === 'P') node.remove();
      });
    }
  }

  // Append the section divs directly to the block so they are the direct
  // children of the `.footer` grid container (not nested inside a wrapper).
  while (footer.firstElementChild) block.append(footer.firstElementChild);
}
