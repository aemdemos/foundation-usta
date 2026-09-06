/**
 * Table block — two variants:
 *
 *  • default  — converts an authored div-grid into a semantic <table>. First
 *    authored row becomes <thead> (scoped <th>); remaining rows become <tbody>
 *    rows of <td>. Cell inner markup is preserved as-authored.
 *
 *  • directory — a multi-column name directory (source: Leadership & Staff Board
 *    of Directors — "Officers and Directors / Advisory Board / Honorary Board").
 *    Each authored CELL is one column: a bold heading + a list of "Name, role"
 *    lines (name bold, role italic). Rendered as equal columns separated by thin
 *    vertical dividers. NOT a data table, so it stays a div-grid (no <table>).
 *
 * @param {Element} block
 */

function buildCell(rowIndex) {
  const cell = rowIndex ? document.createElement('td') : document.createElement('th');
  if (!rowIndex) cell.setAttribute('scope', 'col');
  return cell;
}

function decorateDefault(block) {
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

/**
 * directory — tag each authored cell as a column so the CSS can lay them out
 * with dividers. Authored as ONE row of N cells (one cell per column); each cell
 * holds a heading + the name/role lines. Flatten any extra authored rows into the
 * same column set by index so multi-row authoring still maps column-wise.
 */
function decorateDirectory(block) {
  const columns = [];
  [...block.children].forEach((row) => {
    [...row.children].forEach((cell, colIdx) => {
      if (!columns[colIdx]) {
        columns[colIdx] = document.createElement('div');
        columns[colIdx].className = 'table-directory-col';
      }
      while (cell.firstChild) columns[colIdx].append(cell.firstChild);
    });
  });
  block.innerHTML = '';
  block.classList.add(`table-directory-${columns.length}-cols`);
  columns.forEach((col) => block.append(col));
}

export default function decorate(block) {
  if (block.classList.contains('directory')) {
    decorateDirectory(block);
  } else {
    decorateDefault(block);
  }
}
