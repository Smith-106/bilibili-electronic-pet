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

  const toast = document.createElement('div');
  toast.id = 'app-toast';
  toast.className = 'toast-notification';
  toast.style.setProperty('--toast-color', colors[type] || colors.info);
  toast.innerHTML = `
    <span class="toast-message">${message}</span>
    <button class="btn btn-icon-only toast-close" title="关闭">&times;</button>
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
