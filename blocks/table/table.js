/**
 * Table block — converts an authored div-grid into a semantic <table>.
 * First authored row becomes <thead> (scoped <th>); remaining rows become
 * <tbody> rows of <td>. Cell inner markup is preserved as-authored.
 * @param {Element} block
 */
function buildCell(rowIndex) {
  const cell = rowIndex ? document.createElement('td') : document.createElement('th');
  if (!rowIndex) cell.setAttribute('scope', 'col');
  return cell;
}

export default function decorate(block) {
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  table.append(thead, tbody);

  [...block.children].forEach((child, i) => {
    const row = document.createElement('tr');
    if (i === 0) thead.append(row);
    else tbody.append(row);
    [...child.children].forEach((col) => {
      const cell = buildCell(i);
      cell.innerHTML = col.innerHTML;
      row.append(cell);
    });
  });

  block.innerHTML = '';
  block.append(table);
}
