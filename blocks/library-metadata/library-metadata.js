/**
 * Library-metadata block — the `name` / `description` table that follows each
 * variant on a DA block-library page (/.da/library/blocks/*). The DA Library
 * panel reads these rows from the SOURCE document; this decoration only turns
 * the rendered key/value text into a readable label for the preview.
 *
 * Rows are matched by key (case-insensitive); either row may be missing. The
 * label is moved to the top of its section so it sits ABOVE the variant example.
 * Plain <p> elements (not headings) keep page heading order and the TOC intact.
 *
 * @param {Element} block the library-metadata block element
 */
export default function decorate(block) {
  const values = {};
  [...block.children].forEach((row) => {
    const [keyCell, valueCell] = row.children;
    const key = keyCell?.textContent.trim().toLowerCase();
    const value = valueCell?.textContent.trim();
    if (key && value) values[key] = value;
  });

  block.textContent = '';
  [['name', 'library-metadata-name'], ['description', 'library-metadata-description']]
    .forEach(([key, className]) => {
      if (!values[key]) return;
      const p = document.createElement('p');
      p.className = className;
      p.textContent = values[key];
      block.append(p);
    });

  if (!block.children.length) {
    block.hidden = true;
    return;
  }

  const wrapper = block.parentElement;
  const section = block.closest('.section');
  if (!section || !wrapper) return;
  if (wrapper !== section.firstElementChild) section.prepend(wrapper);
  // Some blocks own their section's margins with high-specificity rules (hero,
  // columns-stats, spacer zero them or set 17px). Reset them here so the
  // library-page rhythm (section padding in library-metadata.css) is the same
  // for every variant.
  section.style.marginBlock = '0';
}
