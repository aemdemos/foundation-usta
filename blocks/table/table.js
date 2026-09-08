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

/**
 * Grouped 2-column data table (source: the NJTL winners list — two `col-6` text
 * columns, each with sub-groups separated by blank lines). Authored as a header
 * row [colA, colB] followed by one body row PER GROUP [groupA, groupB]. We
 * rebuild it COLUMN-MAJOR so it matches the source at every viewport:
 *   • MOBILE: the whole first column stacks (header + its groups, gaps between),
 *     THEN the whole second column — NOT row-by-row interleaved (which a real
 *     <table> would do when its cells stack).
 *   • DESKTOP: the two columns sit side by side.
 * Each group is its own `.table-group` div so the CSS can space the brackets.
 */
function decorateGroupedColumns(block, rows) {
  const colCount = rows[0].children.length;
  const cols = [];
  for (let c = 0; c < colCount; c += 1) {
    const colEl = document.createElement('div');
    colEl.className = 'table-col';
    rows.forEach((row, ri) => {
      const src = row.children[c];
      if (!src) return;
      const group = document.createElement('div');
      group.className = ri === 0 ? 'table-col-head' : 'table-group';
      group.innerHTML = src.innerHTML;
      colEl.append(group);
    });
    cols.push(colEl);
  }
  block.innerHTML = '';
  block.classList.add('table-grouped', `table-grouped-${colCount}-cols`);
  cols.forEach((c) => block.append(c));
}

function decorateDefault(block) {
  const rows = [...block.children];

  // Single-column LIST table (e.g. the 2026 NJTL essay winners): every row has
  // exactly ONE cell, each holding a group (header + its lines). Render each row
  // as a spaced group block — no <table>, no header row — so it reads like the
  // source's plain grouped list with clear gaps between groups.
  const isList = rows.length > 1 && rows.every((r) => r.children.length === 1);
  if (isList) {
    const list = document.createElement('div');
    list.className = 'table-list';
    rows.forEach((r) => {
      const group = document.createElement('div');
      group.className = 'table-list-group';
      group.innerHTML = r.firstElementChild.innerHTML;
      list.append(group);
    });
    block.innerHTML = '';
    block.append(list);
    return;
  }

  // A grouped data table = 2 columns with MORE THAN ONE body row (each body row
  // is a sub-group). Render it column-major (see decorateGroupedColumns) so it
  // stacks like the source on mobile. A plain single-body-row table stays a
  // semantic <table>.
  const isGrouped = rows.length > 2
    && rows.every((r) => r.children.length === 2);
  if (isGrouped) {
    decorateGroupedColumns(block, rows);
    return;
  }

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  table.append(thead, tbody);

  rows.forEach((child, i) => {
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
