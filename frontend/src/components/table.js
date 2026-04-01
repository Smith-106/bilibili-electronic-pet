import { escapeHtml } from '../utils/format.js';

export function renderTable({ columns, rows, empty = '暂无数据' }) {
  if (!rows || rows.length === 0) {
    return `<div class="table-empty">${escapeHtml(empty)}</div>`;
  }

  const headerCells = columns.map(c =>
    `<th class="${c.class || ''}">${escapeHtml(c.label)}</th>`
  ).join('');

  const bodyRows = rows.map(row =>
    `<tr>${columns.map(c => `<td class="${c.class || ''}">${c.render ? c.render(row) : escapeHtml(row[c.key])}</td>`).join('')}</tr>`
  ).join('');

  return `
    <div class="table-wrapper">
      <table class="data-table">
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>
  `;
}
