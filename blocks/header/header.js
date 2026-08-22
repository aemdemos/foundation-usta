// media query match that indicates desktop width
const isDesktop = window.matchMedia('(min-width: 900px)');

/**
 * Fetch the nav fragment. Metadata-independent dual-fetch:
 * /content first (localhost / aem up), then root (DA/EDS production).
 */
async function fetchNavHtml() {
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) resp = await fetch('/nav.plain.html');
  if (!resp.ok) return null;
  return resp.text();
}

/** Close all open desktop dropdowns. */
function closeAllDropdowns(navSections, except) {
  navSections.querySelectorAll('.nav-drop[aria-expanded="true"]').forEach((li) => {
    if (li !== except) li.setAttribute('aria-expanded', 'false');
  });
}

/** Toggle the mobile menu open/closed. */
function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded = forceExpanded !== null
    ? !forceExpanded
    : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  if (button) {
    button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  }
  if (expanded || isDesktop.matches) {
    closeAllDropdowns(navSections);
  }
}

/**
 * Wire dropdown behavior for a nav item that has a sub-list.
 * Desktop: hover opens, pointer-leave closes. Mobile: caret toggles.
 * @param {Element} li The nav list item with a sub-list
 * @param {Element} navSections The nav sections container
 */
function setExpanded(li, expanded) {
  li.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  const toggle = li.querySelector(':scope > .nav-drop-toggle');
  if (toggle) toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
}

function wireDropdown(li, navSections) {
  li.classList.add('nav-drop');
  setExpanded(li, false);

  // Desktop hover
  li.addEventListener('mouseenter', () => {
    if (isDesktop.matches) {
      closeAllDropdowns(navSections, li);
      setExpanded(li, true);
    }
  });
  li.addEventListener('mouseleave', () => {
    if (isDesktop.matches) setExpanded(li, false);
  });

  // The caret button toggles the sub-list without navigating — at ALL widths,
  // so the dropdown is reachable by click/keyboard, not hover alone.
  const toggle = li.querySelector(':scope > .nav-drop-toggle');
  if (toggle) {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-haspopup', 'true');
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const open = li.getAttribute('aria-expanded') === 'true';
      closeAllDropdowns(navSections, li);
      setExpanded(li, !open);
    });
  }
}

/**
 * Loads and decorates the header/nav from content/nav.plain.html.
 * Content-first: all links/labels/images come from the fragment.
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const html = await fetchNavHtml();
  block.textContent = '';
  if (!html) return;

  const fragment = document.createElement('div');
  fragment.innerHTML = html;

  // The fragment lives at /content/nav.plain.html, so relative image paths
  // (images/…) must resolve against /content/, not the current page URL.
  fragment.querySelectorAll('img[src]').forEach((img) => {
    const src = img.getAttribute('src');
    if (src && !/^(https?:)?\/\//.test(src) && !src.startsWith('/')) {
      img.setAttribute('src', `/content/${src}`);
    }
  });

  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-expanded', 'false');
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  // Assign section roles: brand, sections, tools (order from fragment).
  ['brand', 'sections', 'tools'].forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  // Brand: mark the logo link.
  const navBrand = nav.querySelector('.nav-brand');
  if (navBrand) {
    const brandLink = navBrand.querySelector('a');
    if (brandLink) brandLink.classList.add('nav-brand-link');
  }

  // Nav sections: wire dropdowns for any top-level item with a sub-list.
  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    navSections.querySelectorAll(':scope > ul > li').forEach((li) => {
      if (li.querySelector(':scope > ul')) {
        // Add a caret toggle button next to the top-level link (mobile use).
        const caret = document.createElement('button');
        caret.type = 'button';
        caret.className = 'nav-drop-toggle';
        caret.setAttribute('aria-label', 'Toggle submenu');
        const topLink = li.querySelector(':scope > a');
        if (topLink) topLink.after(caret);
        wireDropdown(li, navSections);
      }
    });
  }

  // Tools: mark the CTA link as a donate button.
  const navTools = nav.querySelector('.nav-tools');
  if (navTools) {
    const ctaLink = navTools.querySelector('a');
    if (ctaLink) ctaLink.classList.add('nav-donate');
  }

  // Hamburger (mobile).
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav, navSections));
  nav.prepend(hamburger);

  // Close menu on Escape.
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      if (!isDesktop.matches) toggleMenu(nav, navSections, true);
      else if (navSections) closeAllDropdowns(navSections);
    }
  });

  // Reset state cleanly when crossing the desktop/mobile breakpoint.
  isDesktop.addEventListener('change', () => {
    document.body.style.overflowY = '';
    nav.setAttribute('aria-expanded', 'false');
    if (navSections) closeAllDropdowns(navSections);
  });

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
