/*
 * toc-profile — a page-level table-of-contents / anchor menu that reproduces the
 * source's Leadership & Staff TAB ROW (Staff / Board of Directors).
 *
 * The source renders a horizontal tab strip with a full-width sage track and a
 * single black indicator bar that SLIDES between tabs. It behaves as a TAB SET:
 * clicking a tab shows ONLY its target SECTION and hides the others. Because the
 * targets are whole page SECTIONS (not panels nested in one block), each tab can
 * host ANY blocks (a cards-profile grid, a table, default content, …) with no
 * block nested inside another. There is NO sticky bar and NO scroll-progress bar
 * (those belonged to the master-toc example only).
 *
 * The indicator SLIDES: a single absolutely-positioned bar is translated/resized
 * to the active tab with a CSS transition, matching the source's seamless move.
 *
 * Authoring content model — one row per entry:
 *   label | profile-anchor slug
 * where the slug is the target section's Section Metadata `profile-anchor`
 * (falls back to a slug of the label).
 */

function textOf(cell) {
  return cell ? cell.textContent.trim() : '';
}

// slugify a label (lowercase, hyphenated, accents stripped)
function slugify(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function findAnchorSection(slug) {
  if (!slug) return null;
  return [...document.querySelectorAll('[data-profile-anchor]')]
    .find((s) => slugify(s.dataset.profileAnchor) === slug) || null;
}

/**
 * The scroll target for an anchor slug: a section bound via `data-profile-anchor`
 * first, else any element carrying `id="<slug>"` (a heading-level anchor).
 */
function findAnchorTarget(slug) {
  return findAnchorSection(slug) || (slug ? document.getElementById(slug) : null);
}

export default function decorate(block) {
  // --- parse authored rows into { label, anchor } entries ------------------
  const entries = [];
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const label = textOf(cells[0]);
    if (!label) return;
    const anchor = slugify(textOf(cells[1])) || slugify(label);
    entries.push({ label, anchor });
  });

  if (!entries.length) return;

  // Bind entries to sections by HEADING-TOKEN match when a target section carries
  // no explicit `profile-anchor` (e.g. "board-of-directors" → a "Board of
  // Directors" heading). Requiring the full token set avoids spurious hits.
  const main = block.closest('main') || document;
  const sectionEls = [...main.querySelectorAll('.section')];
  const claimed = new Set(sectionEls.filter((s) => s.dataset.profileAnchor));
  entries.forEach((entry) => {
    if (findAnchorSection(entry.anchor)) return; // already bound via dataset
    const tokens = entry.anchor.split('-').filter(Boolean);
    const best = sectionEls.find((s) => {
      if (claimed.has(s)) return false;
      const heading = s.querySelector('h1, h2, h3');
      if (!heading) return false;
      const hslug = slugify(heading.textContent);
      return tokens.every((t) => hslug.includes(t));
    });
    if (best) {
      best.dataset.profileAnchor = entry.anchor;
      claimed.add(best);
    }
  });

  // --- build the tab strip -------------------------------------------------
  const nav = document.createElement('nav');
  nav.className = 'toc-profile-nav';
  nav.setAttribute('aria-label', 'Page sections');

  // Full-width sage track + the black sliding indicator, as TWO absolutely-
  // positioned siblings sharing the exact same 6px band at the nav's bottom
  // (source model). Keeping both as elements — rather than a border for the track
  // — guarantees they sit pixel-flush (a border + negative-offset overlay can
  // drift a subpixel and read as a doubled/offset line).
  const track = document.createElement('span');
  track.className = 'toc-profile-track';
  track.setAttribute('aria-hidden', 'true');
  const indicator = document.createElement('span');
  indicator.className = 'toc-profile-indicator';
  indicator.setAttribute('aria-hidden', 'true');

  const links = new Map(); // anchor slug -> <a>
  const panels = new Map(); // anchor slug -> target section
  let activeAnchor = null;

  // Slide the indicator to sit under the given link (left + width), matching the
  // source's seamless move. Uses transform+width so the CSS transition animates.
  const moveIndicator = (link) => {
    if (!link) return;
    indicator.style.width = `${link.offsetWidth}px`;
    indicator.style.transform = `translateX(${link.offsetLeft}px)`;
  };

  // Show ONLY the active section (source behaviour: this is a TAB set, not a
  // scroll menu — the other section is hidden until its tab is chosen).
  const setActive = (anchor) => {
    if (anchor === activeAnchor) return;
    activeAnchor = anchor;
    let activeLink = null;
    links.forEach((link, slug) => {
      const isActive = slug === anchor;
      link.classList.toggle('is-active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'true');
        activeLink = link;
      } else {
        link.removeAttribute('aria-current');
      }
    });
    panels.forEach((el, slug) => {
      const section = el.closest('.section') || el;
      section.hidden = slug !== anchor;
    });
    moveIndicator(activeLink);
  };

  entries.forEach((entry) => {
    const link = document.createElement('a');
    link.className = 'toc-profile-item';
    link.href = `#${entry.anchor}`;
    link.setAttribute('role', 'tab');
    link.textContent = entry.label;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      setActive(entry.anchor);
    });
    nav.append(link);
    links.set(entry.anchor, link);
    const section = findAnchorTarget(entry.anchor);
    if (section) panels.set(entry.anchor, section);
  });

  // Mark each panel SECTION so CSS can collapse spacers adjacent to a hidden
  // panel (`.toc-profile-panel`; the CSS uses `:has()`/sibling selectors to hide
  // a spacer bordering a hidden panel — see styles.css). Must run AFTER the
  // entries loop above has populated `panels`.
  panels.forEach((el) => {
    const section = el.closest('.section') || el;
    section.classList.add('toc-profile-panel');
  });

  nav.setAttribute('role', 'tablist');
  block.textContent = '';
  nav.append(track, indicator);
  block.append(nav);

  // Ensure each target section has an id matching its slug so the hash links work
  // even without JS (never create a duplicate id).
  entries.forEach((entry) => {
    const section = findAnchorSection(entry.anchor);
    if (section && !section.id && !document.getElementById(entry.anchor)) {
      section.id = entry.anchor;
    }
  });

  // Keep the indicator aligned on resize/load (tab widths are font-dependent).
  const syncIndicator = () => {
    const active = links.get(activeAnchor) || links.values().next().value;
    moveIndicator(active);
  };

  // Activate the first entry (shows its panel, hides the rest). If the URL hash
  // names one of the panels, honour it (source deep-links via #tab=…).
  const hashSlug = slugify((window.location.hash || '').replace(/^#(tab=)?/, ''));
  const initial = panels.has(hashSlug) ? hashSlug : entries[0].anchor;
  setActive(initial);
  requestAnimationFrame(syncIndicator);
  window.addEventListener('resize', syncIndicator, { passive: true });
  window.addEventListener('load', syncIndicator, { once: true });
}
