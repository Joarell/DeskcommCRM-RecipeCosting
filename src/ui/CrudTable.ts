export interface TableColumn<T> {
  header: string;
  render: (item: T) => string;
  alignRight?: boolean;
}

export interface CrudTableOptions<T> {
  columns: TableColumn<T>[];
  rows: T[];
  actions: (item: T) => string;
  emptyTitle: string;
  emptyHint: string;
}

export function renderCrudTable<T>(options: CrudTableOptions<T>): string {
  if (options.rows.length === 0) {
    return renderEmptyState(options.emptyTitle, options.emptyHint);
  }
  return `<div class="table-wrap"><table>
    <thead><tr>${renderHeaderCells(options.columns)}<th></th></tr></thead>
    <tbody>${options.rows
      .map((row) => renderBodyRow(options, row))
      .join('')}</tbody>
  </table></div>`;
}

export function renderEmptyState(title: string, hint: string): string {
  return (
    '<div class="empty-state"><div class="big">' +
    `${title}</div><p>${hint}</p></div>`
  );
}

function renderHeaderCells<T>(columns: TableColumn<T>[]): string {
  return columns
    .map((col) => `<th${alignAttr(col.alignRight)}>${col.header}</th>`)
    .join('');
}

function renderBodyRow<T>(options: CrudTableOptions<T>, row: T): string {
  const cells = options.columns
    .map((col) => `<td${alignAttr(col.alignRight)}>${col.render(row)}</td>`)
    .join('');
  return `<tr>${cells}<td class="text-right">${options.actions(row)}</td></tr>`;
}

function alignAttr(alignRight?: boolean): string {
  return alignRight ? ' class="text-right num"' : '';
}