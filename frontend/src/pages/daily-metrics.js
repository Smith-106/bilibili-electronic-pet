import { createAdminApi } from '../api/admin.js';
import { escapeHtml } from '../utils/format.js';
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
        <button class="btn btn-secondary" id="metrics-days-7">近7天</button>
        <button class="btn btn-secondary" id="metrics-days-30">近30天</button>
        <button class="btn btn-secondary" id="metrics-days-90">近90天</button>
        <button class="btn btn-primary" id="metrics-load">查询</button>
      </div>
    </div>
    <div id="metrics-summary" class="form-hint" style="margin-bottom:10px;"></div>
    <div class="table-wrapper" id="metrics-table-wrapper">
      <div class="page-loading">加载中...</div>
    </div>
  `;

  const daysInput = container.querySelector('#metrics-days');
  const summary = container.querySelector('#metrics-summary');
  const wrapper = container.querySelector('#metrics-table-wrapper');

  function normalizeDays(rawDays) {
    const parsed = Number.parseInt(String(rawDays).trim(), 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      return { value: 1, warning: '天数必须在 1-365 之间，已自动调整为 1' };
    }
    if (parsed > 365) {
      return { value: 365, warning: '最大支持 365 天，已自动调整为 365' };
    }
    return { value: parsed, warning: '' };
  }

  async function loadMetrics() {
    const normalized = normalizeDays(daysInput.value);
    daysInput.value = String(normalized.value);
    if (normalized.warning) {
      showToast(normalized.warning, 'warning');
    }

    wrapper.innerHTML = '<div class="page-loading">加载中...</div>';
    summary.textContent = '';

    try {
      const data = await api.getDailyMetrics({ days: String(normalized.value) });
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];

      if (items.length === 0) {
        summary.textContent = `最近 ${normalized.value} 天暂无可展示指标`;
        wrapper.innerHTML = '<div class="table-empty">暂无指标数据</div>';
        return;
      }

      const totals = items.reduce(
        (acc, row) => {
          acc.comments += Number(row.comments ?? row.comment_count ?? 0) || 0;
          acc.jobs += Number(row.jobs ?? row.job_count ?? 0) || 0;
          acc.published += Number(row.published ?? row.published_count ?? 0) || 0;
          acc.failed += Number(row.failed ?? row.failed_count ?? 0) || 0;
          acc.skipped += Number(row.skipped ?? row.skipped_count ?? 0) || 0;
          return acc;
        },
        { comments: 0, jobs: 0, published: 0, failed: 0, skipped: 0 },
      );
      summary.textContent = `最近 ${normalized.value} 天合计：评论 ${totals.comments}，任务 ${totals.jobs}，已发布 ${totals.published}，失败 ${totals.failed}，跳过 ${totals.skipped}`;

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
      summary.textContent = '';
      wrapper.innerHTML = `<div class="page-error">加载失败: ${escapeHtml(err.message)}</div>`;
      showToast(`加载每日指标失败: ${err.message}`, 'error');
    }
  }

  container.querySelector('#metrics-days-7').addEventListener('click', async () => {
    daysInput.value = '7';
    await loadMetrics();
  });
  container.querySelector('#metrics-days-30').addEventListener('click', async () => {
    daysInput.value = '30';
    await loadMetrics();
  });
  container.querySelector('#metrics-days-90').addEventListener('click', async () => {
    daysInput.value = '90';
    await loadMetrics();
  });
  daysInput.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') {
      await loadMetrics();
    }
  });
  container.querySelector('#metrics-load').addEventListener('click', loadMetrics);
  await loadMetrics();
}
