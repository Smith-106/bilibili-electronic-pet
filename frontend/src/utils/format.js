export function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatIsoDateTime(isoString) {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return d.toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
  } catch {
    return String(isoString);
  }
}

export function timeAgo(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const diff = Date.now() - d.getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return '刚刚';
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}分钟前`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}小时前`;
    const day = Math.floor(hr / 24);
    if (day < 30) return `${day}天前`;
    const month = Math.floor(day / 30);
    if (month < 12) return `${month}个月前`;
    return `${Math.floor(month / 12)}年前`;
  } catch {
    return '';
  }
}

export function renderTimestamp(isoString) {
  const ago = timeAgo(isoString);
  const full = formatIsoDateTime(isoString);
  if (!ago) return `<span title="${escapeHtml(full)}">${escapeHtml(full)}</span>`;
  return `<span title="${escapeHtml(full)}">${escapeHtml(ago)}</span>`;
}

export function safeCount(value) {
  if (value == null) return '0';
  const n = Number(value);
  return isNaN(n) ? '0' : String(n);
}

export function safeCountNumber(value) {
  if (value == null) return 0;
  const n = Number(value);
  return isNaN(n) ? 0 : n;
}

export function getClampedInt(value, min, max, fallback) {
  const n = parseInt(value, 10);
  if (isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export function getErrorText(error, fallback = '操作失败') {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (error.message) return error.message || fallback;
  return fallback;
}

export function formatRouteContextLabel(routeContext) {
  if (!routeContext || typeof routeContext !== 'object') return '-';

  const platform = typeof routeContext.platform === 'string' ? routeContext.platform.trim().toLowerCase() : '';
  const containerId = typeof routeContext.container_id === 'string' ? routeContext.container_id.trim() : '';
  const userId = typeof routeContext.user_id === 'string' ? routeContext.user_id.trim() : '';
  const parentExternalId =
    typeof routeContext.parent_external_id === 'string' ? routeContext.parent_external_id.trim() : '';
  const chatType = typeof routeContext.chat_type === 'string' ? routeContext.chat_type.trim().toLowerCase() : '';

  const parts = [];
  if (platform === 'qq') {
    if (chatType === 'group' && containerId) {
      parts.push(`QQ群 ${containerId}`);
    } else if (chatType === 'private' && userId) {
      parts.push(`QQ私聊 ${userId}`);
    } else if (containerId) {
      parts.push(`QQ容器 ${containerId}`);
    }
  } else if (containerId) {
    parts.push(`容器 ${containerId}`);
  }

  if (!parts.length && userId) {
    parts.push(`用户 ${userId}`);
  } else if (parts.length && userId && !(platform === 'qq' && chatType === 'private')) {
    parts.push(`用户 ${userId}`);
  }

  if (parentExternalId) {
    parts.push(`回复 ${parentExternalId}`);
  }

  return parts.length ? parts.join(' / ') : '-';
}
