/**
 * Downloads block — a heading plus a bulleted list of download links (e.g. yearly
 * PDF reports). Authored as a table: an optional heading row (contains an
 * h1–h6), followed by one row per download link.
 *
 * EDS decorateButtons() turns standalone <p><a> into .button elements; we rebuild
 * clean anchors here so the links keep the plain, underlined text-link styling.
 * @param {Element} block
 */
export default function decorate(block) {
  const rows = [...block.children];
  let heading = null;
  const links = [];

  rows.forEach((row) => {
    const cell = row.firstElementChild || row;
    const headingEl = cell.querySelector('h1, h2, h3, h4, h5, h6');
    if (headingEl && !cell.querySelector('a')) {
      heading = headingEl;
      return;
    }
    const anchor = cell.querySelector('a');
    if (!anchor) return;
    const clean = document.createElement('a');
    clean.href = anchor.href;
    clean.textContent = anchor.textContent.trim();
    if (anchor.title) clean.title = anchor.title;
    links.push(clean);
  });

  block.textContent = '';
  if (heading) block.append(heading);

  if (links.length) {
    const ul = document.createElement('ul');
    links.forEach((a) => {
      const li = document.createElement('li');
      li.append(a);
      ul.append(li);
    });
    block.append(ul);
  }
}
