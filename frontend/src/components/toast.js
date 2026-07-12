import { escapeHtml } from '../utils/format.js';

let toastTimer = null;

export function showToast(message, type = 'info') {
  const existing = document.getElementById('app-toast');
  if (existing) existing.remove();
  if (toastTimer) clearTimeout(toastTimer);

  const colors = {
    info: 'var(--primary-cta)',
    success: 'var(--success-color)',
    error: 'var(--danger-color)',
    warning: 'var(--warning-color)',
  };

  // A11Y-007 (UI-odyssey 001): toast 加 role/aria-live, error 用 alert 即时播报, 其它 polite
  const role = type === 'error' ? 'alert' : 'status';

  const toast = document.createElement('div');
  toast.id = 'app-toast';
  toast.className = 'toast-notification';
  toast.setAttribute('role', role);
  toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
  toast.style.setProperty('--toast-color', colors[type] || colors.info);
  // EDGE-003 (UI-odyssey 001): 转义 message 防 XSS (调用方契约虽安全, 但 toast 本身须防御性)
  toast.innerHTML = `
    <span class="toast-message">${escapeHtml(message)}</span>
    <button class="btn btn-icon-only toast-close" title="关闭" aria-label="关闭">&times;</button>
  `;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));

  const close = () => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  };

  toast.querySelector('.toast-close').onclick = close;
  toastTimer = setTimeout(close, 4000);
}
