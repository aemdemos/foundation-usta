const FOOTER_PATH = '/footer.plain.html';

/**
 * Fetch the footer fragment from the site root (EDS serves fragments at the root;
 * the local dev server proxies the same published fragment).
 */
async function fetchFooterHtml() {
  const resp = await fetch(FOOTER_PATH);
  if (!resp.ok) return null;
  return resp.text();
}

/**
 * Loads and decorates the footer from the /footer fragment.
 * Content-first: all links/labels/images come from the fragment.
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const html = await fetchFooterHtml();
  block.textContent = '';
  if (!html) return;

  // parse into an inert document: nothing is requested until the media paths
  // below are fixed and the nodes are moved into the page
  const footer = new DOMParser().parseFromString(html, 'text/html').body;

  // The fragment's media paths are relative to the FRAGMENT (`./media_…`), not
  // to the current page — resolve img src + <source> srcset against it.
  const base = new URL(FOOTER_PATH, window.location.href);
  footer.querySelectorAll('img[src]').forEach((img) => {
    img.src = new URL(img.getAttribute('src'), base).href;
  });
  footer.querySelectorAll('source[srcset]').forEach((source) => {
    source.srcset = source.getAttribute('srcset').split(',')
      .map((entry) => {
        const [url, ...descriptor] = entry.trim().split(/\s+/);
        return [new URL(url, base).href, ...descriptor].join(' ');
      })
      .join(', ');
  });

  // Assign section roles by order: brand, nav, social, legal.
  const sections = [...footer.children];
  ['brand', 'nav', 'social', 'legal'].forEach((name, i) => {
    if (sections[i]) sections[i].classList.add(`footer-${name}`);
  });

  // Brand: mark the logo link.
  const brand = footer.querySelector('.footer-brand');
  const logo = brand?.querySelector('a');
  if (logo) {
    logo.classList.add('footer-logo-link');
    // tag the TOP-LEVEL wrapper (the bare <a>, or the <p> production wraps it in)
    [...brand.children].find((c) => c === logo || c.contains(logo))?.classList.add('footer-logo');
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
      // one centred paragraph of inline icons, separated like the source
      // ("&nbsp; " then "&nbsp;&nbsp;") so the icon spacing matches exactly
      const row = document.createElement('p');
      row.className = 'footer-social-icons';
      iconNodes[0].before(row);
      const separators = ['\u00a0 ', '\u00a0\u00a0'];
      iconNodes.forEach((node, i) => {
        const link = node.tagName === 'A' ? node : node.querySelector(':scope > a');
        // drop the whitespace text inside the link (between the <picture>'s
        // <source>s): it rendered as a ~4px space per icon and pushed the icons
        // apart (source markup is a tight <a><img></a>)
        const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
        const blanks = [];
        while (walker.nextNode()) {
          if (!walker.currentNode.textContent.trim()) blanks.push(walker.currentNode);
        }
        blanks.forEach((n) => n.remove());
        if (i) row.append(separators[Math.min(i - 1, separators.length - 1)]);
        row.append(link);
        if (node.tagName === 'P') node.remove();
      });
    }
  }

  // Legal links: separate them with an inline " | " text (source markup), so the
  // pipes wrap and space exactly like the source instead of being drawn by CSS.
  const legalLinks = footer.querySelector('.footer-legal p:last-child');
  if (legalLinks) {
    const anchors = [...legalLinks.querySelectorAll(':scope > a')];
    anchors.slice(0, -1).forEach((a) => {
      const next = a.nextSibling;
      if (next && next.nodeType === Node.TEXT_NODE && !next.textContent.trim()) {
        next.textContent = ' | ';
      } else if (!(next && next.nodeType === Node.TEXT_NODE && next.textContent.includes('|'))) {
        a.after(' | ');
      }
    });
  }

  // Append the section divs directly to the block so they are the direct
  // children of the `.footer` grid container (not nested inside a wrapper).
  while (footer.firstElementChild) block.append(footer.firstElementChild);
}
