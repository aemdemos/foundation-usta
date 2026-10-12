/*
 * Experience Workspace block-library preview cleanup (port of
 * aemdemos/patients-stryker#312). Runs only on /.da/library/* pages, before
 * decorateMain(), and turns each library document into a clean gallery:
 *   - the DA authoring artifacts (library-metadata tables, the
 *     library-container-start/end marker tables and the group-name heading in
 *     front of a start marker) are removed, so the preview shows only what is
 *     inserted into a page;
 *   - each variant (a section, or every section between a start and an end
 *     marker) is framed and labelled with its metadata `name`;
 *   - header and footer are hidden (da-library-preview.css).
 */
import { loadCSS, toClassName } from '../../scripts/aem.js';

const START = 'library-container-start';
const END = 'library-container-end';

/**
 * Reads the `name` row of a library-metadata table.
 * @param {Element} metadata the library-metadata table
 * @returns {string} the name, or ''
 */
function readName(metadata) {
  const row = [...metadata.children]
    .find((r) => r.children[0]?.textContent.trim().toLowerCase() === 'name');
  return row?.children[1]?.textContent.trim() || '';
}

/**
 * Groups the sections into variants: a start marker opens a group that runs to
 * the next end marker (possibly across sections); any other section is a
 * variant of its own. Collects each variant's name and strips the artifacts.
 * @param {Element[]} sections the top-level section divs of main
 * @returns {{sections: Element[], name: string}[]} the variants
 */
function groupVariants(sections) {
  const variants = [];
  let open = null;
  sections.forEach((section) => {
    const variant = open || { sections: [], name: '' };
    variant.sections.push(section);
    if (!open) variants.push(variant);

    [...section.children].forEach((el) => {
      if (el.classList.contains('library-metadata')) {
        variant.name ||= readName(el);
        el.remove();
      } else if (el.classList.contains(START)) {
        const heading = el.previousElementSibling;
        if (heading && /^H[1-6]$/.test(heading.tagName)) {
          variant.name ||= heading.textContent.trim();
          heading.remove();
        }
        el.remove();
        open = variant;
      } else if (el.classList.contains(END)) {
        el.remove();
        open = null;
      }
    });
  });
  return variants;
}

/**
 * @param {Element} main the page's main element (not yet decorated)
 */
export default function decorateLibraryPreview(main) {
  document.body.classList.add('library-preview');
  loadCSS(`${window.hlx.codeBasePath}/tools/da-library-preview/da-library-preview.css`);

  const ids = new Set();
  groupVariants([...main.querySelectorAll(':scope > div')]).forEach(({ sections, name }) => {
    // a section left empty by the cleanup is dropped, unless it carries a
    // section style (e.g. a background) worth showing
    const kept = sections.filter((s) => {
      if (s.children.length || s.textContent.trim() || s.attributes.length) return true;
      s.remove();
      return false;
    });
    if (!kept.length) return;
    kept.forEach((s) => {
      // several blocks set their section's margins with high-specificity rules
      // (hero, spacer); inline wins, and the CSS still owns the value
      s.style.margin = 'var(--library-variant-margin, 0)';
      s.classList.add('library-variant');
      if (!s.children.length) s.classList.add('library-variant-empty');
    });
    kept[0].classList.add('library-variant-start');
    kept.at(-1).classList.add('library-variant-end');
    if (!name) return;
    kept[0].dataset.libraryLabel = name;
    const base = toClassName(name) || 'variant';
    let id = `library-${base}`;
    for (let i = 2; ids.has(id) || document.getElementById(id); i += 1) id = `library-${base}-${i}`;
    ids.add(id);
    kept[0].id = id;
  });
}
