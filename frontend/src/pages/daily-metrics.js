import { createAdminApi } from '../api/admin.js';
import { escapeHtml, formatIsoDateTime } from '../utils/format.js';
import { showToast } from '../components/toast.js';

const api = createAdminApi();

export async function render(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>每日指标</h2>
      <div class="page-actions">
        <div class="form-group" style="margin:0;">
          <label class="form-label">天数</label>
          <input type="number" id="metrics-days" class="form-input" value="30" min="1" max="365" />
        </div>
        <button class="btn btn-primary" id="metrics-load">查询</button>
      </div>
    </div>
    <div class="table-wrapper" id="metrics-table-wrapper">
      <div class="page-loading">加载中...</div>
    </div>
  `;

  async function loadMetrics() {
    const days = container.querySelector('#metrics-days').value;
    const wrapper = container.querySelector('#metrics-table-wrapper');
    wrapper.innerHTML = '<div class="page-loading">加载中...</div>';

    try {
      const data = await api.getDailyMetrics({ days });
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];

      if (items.length === 0) {
        wrapper.innerHTML = '<div class="table-empty">暂无指标数据</div>';
        return;
      }

      wrapper.innerHTML = `
        <table class="data-table">
          <thead><tr>
            <th>日期</th><th>评论数</th><th>任务数</th><th>已发布</th><th>失败</th><th>跳过</th>
          </tr></thead>
          <tbody>
            ${items.map(r => `<tr>
              <td class="cell-time">${escapeHtml(r.date || r.day)}</td>
              <td>${escapeHtml(r.comments ?? r.comment_count ?? 0)}</td>
              <td>${escapeHtml(r.jobs ?? r.job_count ?? 0)}</td>
              <td style="color:var(--success-color)">${escapeHtml(r.published ?? r.published_count ?? 0)}</td>
              <td style="color:var(--danger-color)">${escapeHtml(r.failed ?? r.failed_count ?? 0)}</td>
              <td>${escapeHtml(r.skipped ?? r.skipped_count ?? 0)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      `;
    } catch (err) {
      wrapper.innerHTML = `<div class="page-error">加载失败: ${escapeHtml(err.message)}</div>`;
    }
  }

  container.querySelector('#metrics-load').addEventListener('click', loadMetrics);
  await loadMetrics();
}
