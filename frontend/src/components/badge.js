import { escapeHtml } from '../utils/format.js';

const STATUS_MAP = {
  published: { label: '已发布', cls: 'badge-success' },
  failed: { label: '失败', cls: 'badge-danger' },
  queued: { label: '排队中', cls: 'badge-warning' },
  pending_review: { label: '待审核', cls: 'badge-warning' },
  approved: { label: '已审批', cls: 'badge-success' },
  retrying: { label: '重试中', cls: 'badge-info' },
  skipped: { label: '已跳过', cls: 'badge-muted' },
  processing: { label: '处理中', cls: 'badge-info' },
};

export function renderBadge(status) {
  if (!status) return '';
  const info = STATUS_MAP[status] || { label: status, cls: 'badge-muted' };
  return `<span class="status-badge ${info.cls}">${escapeHtml(info.label)}</span>`;
}

export function renderBoolBadge(value, trueLabel = '是', falseLabel = '否') {
  const cls = value ? 'badge-success' : 'badge-muted';
  const label = value ? trueLabel : falseLabel;
  return `<span class="status-badge ${cls}">${escapeHtml(label)}</span>`;
}
