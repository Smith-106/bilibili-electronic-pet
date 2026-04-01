import { createAdminApi } from '../api/admin.js';
import { escapeHtml, safeCount, formatIsoDateTime } from '../utils/format.js';
import { renderBadge } from '../components/badge.js';
import { showToast } from '../components/toast.js';

const api = createAdminApi();

export async function render(container) {
  container.innerHTML = '<div class="page-loading">加载中...</div>';

  try {
    const [overview, jobs, gatewayLogs, auditSummary] = await Promise.all([
      api.getOverview().catch(() => null),
      api.getJobs({ limit: 5 }).catch(() => null),
      api.getGatewayLogs({ limit: 5 }).catch(() => null),
      api.getAuditSummary({ days: 7 }).catch(() => null),
    ]);

    const ov = overview || {};
    const jobItems = Array.isArray(jobs?.items) ? jobs.items : [];
    const gwItems = Array.isArray(gatewayLogs?.items) ? gatewayLogs.items : [];

    container.innerHTML = `
      <div class="page-header">
        <h2>系统概览</h2>
        <button class="btn" id="dashboard-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">评论总数</div>
          <div class="stat-value">${safeCount(ov.total_comments)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">任务总数</div>
          <div class="stat-value">${safeCount(ov.total_jobs)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">已发布</div>
          <div class="stat-value">${safeCount(ov.total_published)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">人工队列</div>
          <div class="stat-value">${safeCount(ov.pending_review)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">失败数</div>
          <div class="stat-value">${safeCount(ov.total_failed)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">网关事件</div>
          <div class="stat-value">${safeCount(gwItems.length)}</div>
        </div>
      </div>

      <div class="section-grid">
        <div class="section-card">
          <div class="section-card-header">
            <h3>最近任务</h3>
          </div>
          <div class="table-wrapper">
            <table class="data-table">
              <thead><tr>
                <th>ID</th><th>状态</th><th>评论摘要</th><th>时间</th>
              </tr></thead>
              <tbody>
                ${jobItems.length === 0 ? '<tr><td colspan="4" class="table-empty-cell">暂无任务</td></tr>' :
                  jobItems.map(j => `<tr>
                    <td class="cell-id">${escapeHtml(j.id?.substring(0, 8))}</td>
                    <td>${renderBadge(j.status)}</td>
                    <td class="cell-truncate">${escapeHtml(j.comment_text?.substring(0, 60))}</td>
                    <td class="cell-time">${escapeHtml(formatIsoDateTime(j.created_at))}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="section-card">
          <div class="section-card-header">
            <h3>审计摘要 (7天)</h3>
          </div>
          <div class="audit-summary-grid">
            <div class="stat-card mini">
              <div class="stat-label">总操作</div>
              <div class="stat-value">${safeCount(auditSummary?.total)}</div>
            </div>
            <div class="stat-card mini">
              <div class="stat-label">成功</div>
              <div class="stat-value" style="color:var(--success-color)">${safeCount(auditSummary?.ok_count)}</div>
            </div>
            <div class="stat-card mini">
              <div class="stat-label">失败</div>
              <div class="stat-value" style="color:var(--danger-color)">${safeCount(auditSummary?.failed_count)}</div>
            </div>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#dashboard-refresh').addEventListener('click', () => {
      showToast('正在刷新...', 'info');
      render(container);
    });
  } catch (err) {
    container.innerHTML = `<div class="page-error">加载失败: ${escapeHtml(err.message)}</div>`;
  }
}
