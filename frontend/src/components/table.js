import { escapeHtml } from '../utils/format.js';

export function renderTable({ columns, rows, empty = '暂无数据' }) {
  if (!rows || rows.length === 0) {
    return `<div class="table-empty">${escapeHtml(empty)}</div>`;
  }

  const headerCells = columns.map(c =>
    `<th class="${c.class || ''}">${escapeHtml(c.label)}</th>`
  ).join('');

  const bodyRows = rows.map(row =>
    `<tr>${columns.map(c => {
      // F4/F6 (review-odyssey 006, ISS-20260712-003): cell-id/cell-truncate 截断列自动注入
      // title=完整原始值 (escapeHtml 转义, escapeHtml 内部 value==null→'' + String(value) 安全处理
      // number/null/undefined)。render fn 只返回截断显示串, title 用 row 原始值, 调用方无需手写。
      // NF1 (review-odyssey 006 confirm): object 值跳过 title 注入 — query.js route_context 列
      // row[c.key] 是 object (buildCommentRouteContext), escapeHtml(object)→'[object Object]' 误显示,
      // 该列由 render fn (formatRouteContextLabel) 负责可读标签, 不应强行加 title。
      const raw = row[c.key];
      const isTruncate = c.class === 'cell-id' || c.class === 'cell-truncate';
      const titleAttr = isTruncate && typeof raw !== 'object' ? ` title="${escapeHtml(raw)}"` : '';
      return `<td class="${c.class || ''}"${titleAttr}>${c.render ? c.render(row) : escapeHtml(raw)}</td>`;
    }).join('')}</tr>`
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
