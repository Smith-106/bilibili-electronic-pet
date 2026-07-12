import { createAdminApi } from '../api/admin.js';
import { escapeHtml, formatIsoDateTime, renderTimestamp } from '../utils/format.js';
import { renderBadge } from '../components/badge.js';
import { showToast } from '../components/toast.js';

const api = createAdminApi();

export async function render(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>审计日志</h2>
      <div class="page-actions">
        <button class="btn" id="audit-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
        <button class="btn" id="audit-export"><svg width="14" height="14"><use href="#icon-download"></use></svg> 导出 CSV</button>
      </div>
    </div>

    <div class="section-grid">
      <div class="stat-grid" id="audit-summary-cards"></div>
    </div>

    <div class="filter-bar">
      <div class="form-group">
        <label class="form-label" for="audit-action">操作类型</label>
        <input type="text" id="audit-action" class="form-input" placeholder="例: approve, retry" />
      </div>
      <div class="form-group">
        <label class="form-label" for="audit-ok">成功</label>
        <select id="audit-ok" class="form-input">
          <option value="">全部</option>
          <option value="true">成功</option>
          <option value="false">失败</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="audit-limit">数量</label>
        <input type="number" id="audit-limit" class="form-input" value="30" min="1" max="200" />
      </div>
      <div class="form-group">
        <button class="btn btn-primary" id="audit-filter-btn">查询</button>
      </div>
    </div>

    <div class="table-wrapper" id="audit-table-wrapper">
      <div class="page-loading">加载中...</div>
    </div>
  `;

  async function loadSummary() {
    try {
      const data = await api.getAuditSummary({ days: 7 });
      const el = container.querySelector('#audit-summary-cards');
      el.innerHTML = `
        <div class="stat-card mini">
          <div class="stat-label">总操作</div>
          <div class="stat-value">${data?.total ?? 0}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">成功</div>
          <div class="stat-value" style="color:var(--success-color)">${data?.ok_count ?? 0}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">失败</div>
          <div class="stat-value" style="color:var(--danger-color)">${data?.failed_count ?? 0}</div>
        </div>
      `;
    } catch (err) {
      container.querySelector('#audit-summary-cards').innerHTML = `<div class="page-error">摘要加载失败</div>`;
    }
  }

  async function loadLogs() {
    const wrapper = container.querySelector('#audit-table-wrapper');
    wrapper.innerHTML = '<div class="page-loading">加载中...</div>';

    const action = container.querySelector('#audit-action').value.trim();
    const ok = container.querySelector('#audit-ok').value;
    const limit = container.querySelector('#audit-limit').value;

    try {
      const data = await api.getAuditLogs({ action, ok, limit });
      const items = Array.isArray(data?.items) ? data.items : [];

      if (items.length === 0) {
        wrapper.innerHTML = '<div class="table-empty">暂无审计日志</div>';
        return;
      }

      wrapper.innerHTML = `
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>操作</th><th>目标</th><th>成功</th><th>详情</th><th>时间</th>
          </tr></thead>
          <tbody>
            ${items.map(l => `<tr>
              <td class="cell-id" title="${escapeHtml(l.id?.toString() || '')}">${escapeHtml(l.id?.toString().substring(0, 8))}</td>
              <td>${escapeHtml(l.action)}</td>
              <td class="cell-truncate" title="${escapeHtml(l.target_id || '-')}">${escapeHtml(l.target_id || '-')}</td>
              <td>${l.ok ? '<span class="status-badge badge-success">成功</span>' : '<span class="status-badge badge-danger">失败</span>'}</td>
              <td class="cell-truncate" title="${escapeHtml(l.detail || '-')}">${escapeHtml(l.detail || '-')}</td>
              <td class="cell-time">${renderTimestamp(l.created_at)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      `;
    } catch (err) {
      wrapper.innerHTML = `<div class="page-error">加载失败: ${escapeHtml(err.message)}</div>`;
    }
  }

  container.querySelector('#audit-refresh').addEventListener('click', () => { loadSummary(); loadLogs(); });
  container.querySelector('#audit-filter-btn').addEventListener('click', loadLogs);

  container.querySelector('#audit-export').addEventListener('click', async () => {
    try {
      await api.exportAuditCsv({
        action: container.querySelector('#audit-action').value.trim(),
        ok: container.querySelector('#audit-ok').value,
        limit: container.querySelector('#audit-limit').value,
      });
      showToast('导出成功', 'success');
    } catch (err) {
      showToast(`导出失败: ${err.message}`, 'error');
    }
  });

  await Promise.all([loadSummary(), loadLogs()]);
}
