import { createAdminApi } from '../api/admin.js';
import { escapeHtml } from '../utils/format.js';
import { showToast } from '../components/toast.js';

const api = createAdminApi();

function renderConnectionCards(items) {
  if (!Array.isArray(items) || !items.length) {
    return '<div class="table-empty" role="status">暂无平台连接信息</div>';
  }

  return items
    .map(
      (item) => `
        <div class="section-card" style="margin-bottom:16px;">
          <div class="section-card-header">
            <h3>${escapeHtml(item.platform || '-')}</h3>
          </div>
          <div style="padding:16px;">
            <div class="audit-summary-grid">
              <div class="stat-card mini">
                <div class="stat-label">Adapter</div>
                <div class="stat-value">${escapeHtml(item.adapterKey || '-')}</div>
              </div>
              <div class="stat-card mini">
                <div class="stat-label">状态</div>
                <div class="stat-value">${escapeHtml(item.status || '-')}</div>
              </div>
              <div class="stat-card mini">
                <div class="stat-label">启用</div>
                <div class="stat-value">${item.enabled ? '是' : '否'}</div>
              </div>
            </div>
            <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
              <button class="btn btn-secondary" data-role="platform-toggle" data-platform="${escapeHtml(item.platform || '')}" data-enabled="${item.enabled ? 'false' : 'true'}">
                ${item.enabled ? '暂停试点' : '恢复试点'}
              </button>
            </div>
            <ul class="signal-list" style="margin-top:12px;">
              ${(item.capabilities || [])
                .map(
                  (capability) =>
                    `<li class="signal-item"><strong>${escapeHtml(capability.key || '-')}</strong>: ${escapeHtml(capability.status || '-')} ${capability.note ? `· ${escapeHtml(capability.note)}` : ''}</li>`,
                )
                .join('')}
            </ul>
          </div>
        </div>
      `,
    )
    .join('');
}

export async function render(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>平台连接</h2>
      <button class="btn" id="connections-refresh"><svg width="14" height="14" aria-hidden="true" focusable="false"><use href="#icon-refresh"></use></svg> 刷新</button>
    </div>
    <div id="connections-wrapper"><div class="page-loading" role="status" aria-live="polite">加载中...</div></div>
  `;

  async function load() {
    const response = await api.getPlatformConnections();
    container.querySelector('#connections-wrapper').innerHTML = renderConnectionCards(response?.items);
    container.querySelectorAll('[data-role="platform-toggle"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        // INT-003 (UI-odyssey 001): 异步期间 disabled 防竞态 + try/catch 错误反馈
        const target = event.currentTarget;
        target.disabled = true;
        const platform = target.getAttribute('data-platform') || '';
        const enabled = target.getAttribute('data-enabled') === 'true';
        try {
          await api.setPlatformConnectionControl(platform, enabled);
          await load();
        } catch (err) {
          showToast(`操作失败: ${err.message}`, 'error');
        } finally {
          // F8 (review-odyssey 006): finally 对称复位 + isConnected 防操作 detached node
          // (success 路径 load() 重渲染后 target 已 detached, catch 路径 load 抛错时新按钮需 enabled)
          if (target.isConnected) target.disabled = false;
        }
      });
    });
  }

  container.querySelector('#connections-refresh').addEventListener('click', (event) => {
    // INT-002 (UI-odyssey 001): refresh 期间 disabled 防重复点击并发
    const btn = event.currentTarget;
    btn.disabled = true;
    showToast('正在刷新...', 'info');
    load().finally(() => { btn.disabled = false; });
  });

  await load();
}
