// media query match that indicates desktop width (matches the CSS breakpoint)
const isDesktop = window.matchMedia('(min-width: 992px)');

/**
 * Build the page breadcrumb row from the URL path (matches the source's
 * third header row, e.g. "HOME"). Locale segment (en) is dropped; hyphenated
 * slugs become spaced labels; CSS uppercases them. Parent crumbs link, the
 * current page is plain text.
 * @returns {Element|null} a <nav class="nav-breadcrumb"> or null when at root
 */
function buildBreadcrumb() {
  const path = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '');
  // Drop infrastructure/locale segments so the crumb matches the source: the
  // DA/EDS 'content' mount prefix and the 'en' locale never appear as crumbs.
  const segments = path.split('/').filter(Boolean)
    .filter((s) => s !== 'content' && s !== 'en');
  if (!segments.length) return null;

  const bcNav = document.createElement('nav');
  bcNav.className = 'nav-breadcrumb';
  bcNav.setAttribute('aria-label', 'Breadcrumb');
  const ol = document.createElement('ol');

  let href = '/en';
  segments.forEach((seg, i) => {
    href += `/${seg}`;
    const li = document.createElement('li');
    const label = seg.replace(/-/g, ' ');
    if (i === segments.length - 1) {
      li.textContent = label;
      li.setAttribute('aria-current', 'page');
    } else {
      const a = document.createElement('a');
      a.href = href;
      a.textContent = label;
      li.append(a);
    }
    ol.append(li);
  });

  bcNav.append(ol);
  return bcNav;
}

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
  // Anchor the slide-in panel just below the full header (nav bar + breadcrumb),
  // measured live so it stays correct regardless of header height.
  if (!expanded && !isDesktop.matches) {
    const wrapper = nav.closest('.nav-wrapper');
    const bottom = wrapper ? Math.round(wrapper.getBoundingClientRect().bottom) : 105;
    navSections.style.setProperty('--nav-mobile-top', `${bottom}px`);
  }
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
      // EDS wraps a standalone top-level link in a <p>; the parent items that
      // carry a sub-list get this treatment while plain items are a bare <a>.
      // Unwrap so every top-level item is a DIRECT child <a> of the <li>, which
      // is what the CSS `> li > a` selectors (padding, colour, expanded
      // underline) and the caret insertion below all rely on.
      const topP = li.querySelector(':scope > p');
      if (topP && topP.querySelector(':scope > a')) {
        topP.replaceWith(...topP.childNodes);
      }
      if (li.querySelector(':scope > ul')) {
        // Add a caret toggle button next to the top-level link (mobile use).
        const caret = document.createElement('button');
        caret.type = 'button';
        caret.className = 'nav-drop-toggle';
        caret.setAttribute('aria-label', 'Toggle submenu');
        const topLink = li.querySelector(':scope > a');
        if (topLink) topLink.after(caret);
        else li.prepend(caret);
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

  // Third row: page breadcrumb (matches the source's "HOME" row).
  const breadcrumb = buildBreadcrumb();
  if (breadcrumb) navWrapper.append(breadcrumb);

  block.append(navWrapper);
}
