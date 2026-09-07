import { getMetadata } from '../../scripts/aem.js';

// media query match that indicates desktop width (matches the CSS breakpoint)
const isDesktop = window.matchMedia('(min-width: 992px)');

// Segments that never appear as their own crumb. The DA/EDS mount prefix and the
// locale are infrastructure; `home` collapses into the single "Home" crumb; and
// `news` is HIDDEN from the trail so news articles read "Home > {title}" — exactly
// as the source does (breadcrumb ≠ URL path). Extend this set for any other
// section the source hides from breadcrumbs.
const BREADCRUMB_HIDDEN_SEGMENTS = new Set(['content', 'en', 'news']);

// Turn a URL slug into a human label as a LAST resort (when the index has no
// managed title for that ancestor): de-hyphenate; CSS handles casing.
const slugToLabel = (slug) => slug.replace(/-/g, ' ');

/**
 * Fetch the published query-index once and build a path→title map so ancestor
 * crumbs use each page's MANAGED title (e.g. `financials` →
 * "Annual Reports and Financial Information"), not the URL slug. The index is
 * regenerated on every publish, so a NEW page automatically gets the right
 * label with no separate breadcrumb sheet to maintain. Resolves to an empty map
 * if the index isn't available (we then fall back to slug labels).
 */
async function fetchPathTitleMap() {
  const norm = (p) => (p || '').replace(/\.html$/, '').replace(/\/$/, '');
  const tryFetch = async (url) => {
    try {
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const json = await resp.json();
      return json.data || [];
    } catch {
      return null;
    }
  };
  // /query-index.json at root (DA/EDS) then /content (local `aem up`).
  const data = (await tryFetch('/query-index.json'))
    || (await tryFetch('/content/query-index.json'))
    || [];
  const map = new Map();
  data.forEach((row) => {
    if (!row.path) return;
    // Prefer an explicit breadcrumb-title override (helix-query.yaml
    // `breadcrumbtitle`), then the managed page title.
    const label = row.breadcrumbtitle || row.title;
    if (label) map.set(norm(row.path), label.trim());
  });
  return map;
}

/**
 * Build the page breadcrumb row. The trail comes from the URL's ancestor paths,
 * but LABELS are managed titles (from the query-index) and the source's hidden
 * segments (locale, `home`, `news`) are dropped — so the breadcrumb matches the
 * source's content hierarchy, NOT the raw URL path. Each ancestor crumb links to
 * its real page; the current page is plain text.
 * @returns {Promise<Element|null>} a <nav class="nav-breadcrumb"> or null at root
 */
async function buildBreadcrumb() {
  const path = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '');
  const allSegments = path.split('/').filter(Boolean);
  if (!allSegments.length) return null;

  const titleMap = await fetchPathTitleMap();

  const bcNav = document.createElement('nav');
  bcNav.className = 'nav-breadcrumb';
  bcNav.setAttribute('aria-label', 'Breadcrumb');
  const ol = document.createElement('ol');

  // Walk every URL segment to keep hrefs correct (hidden segments still exist in
  // the path), but only EMIT a crumb for non-hidden segments. `home` maps to the
  // single "Home" crumb pointing at /en/home.
  let href = '';
  const isLastVisibleIndex = (() => {
    // index of the final segment that will actually render a crumb
    for (let i = allSegments.length - 1; i >= 0; i -= 1) {
      const s = allSegments[i];
      if (s === 'home' || !BREADCRUMB_HIDDEN_SEGMENTS.has(s)) return i;
    }
    return -1;
  })();

  allSegments.forEach((seg, i) => {
    href += `/${seg}`;
    if (seg === 'home') {
      // collapse locale+home into a single "Home" crumb
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '/en/home.html';
      a.textContent = 'Home';
      li.append(a);
      ol.append(li);
      return;
    }
    if (BREADCRUMB_HIDDEN_SEGMENTS.has(seg)) return; // e.g. content, en, news

    const li = document.createElement('li');
    if (i === isLastVisibleIndex) {
      // Current page: prefer this page's OWN managed label (a `breadcrumb-title`
      // metadata override, else the document <title>), then the index, then slug.
      const label = getMetadata('breadcrumb-title')
        || document.title
        || titleMap.get(href)
        || slugToLabel(seg);
      li.textContent = label;
      li.setAttribute('aria-current', 'page');
    } else {
      // Ancestor crumb: managed title from the index, else de-hyphenated slug.
      const a = document.createElement('a');
      a.href = `${href}.html`;
      a.textContent = titleMap.get(href) || slugToLabel(seg);
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

  // DA-authored <picture> elements carry <source srcset> renditions whose
  // filenames differ from the working <img src> (an extra hash suffix) and are
  // not present locally — the browser would prefer the 404ing <source> and the
  // logo breaks. These fragment images are logos/icons with no need for
  // responsive art-direction, so drop the <source>s and always use the <img>.
  fragment.querySelectorAll('picture source').forEach((s) => s.remove());

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
  const breadcrumb = await buildBreadcrumb();
  if (breadcrumb) navWrapper.append(breadcrumb);

  block.append(navWrapper);
}
