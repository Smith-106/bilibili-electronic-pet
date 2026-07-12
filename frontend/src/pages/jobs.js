import { createAdminApi } from '../api/admin.js';
import { escapeHtml, formatRouteContextLabel, renderTimestamp } from '../utils/format.js';
import { renderBadge } from '../components/badge.js';
import { showToast } from '../components/toast.js';

const api = createAdminApi();

export async function render(container) {
  let selectedIds = new Set();

  container.innerHTML = `
    <div class="page-header">
      <h2>任务管理</h2>
      <div class="page-actions">
        <button class="btn" id="jobs-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
        <button class="btn" id="jobs-export"><svg width="14" height="14"><use href="#icon-download"></use></svg> 导出 CSV</button>
      </div>
    </div>

    <div class="filter-bar">
      <div class="form-group">
        <label class="form-label" for="jobs-status">状态</label>
        <select id="jobs-status" class="form-input">
          <option value="">全部</option>
          <option value="queued">排队中</option>
          <option value="pending_review">待审核</option>
          <option value="approved">已审批</option>
          <option value="published">已发布</option>
          <option value="failed">失败</option>
          <option value="skipped">已跳过</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="jobs-limit">数量</label>
        <input type="number" id="jobs-limit" class="form-input" value="20" min="1" max="200" />
      </div>
      <div class="form-group">
        <button class="btn btn-primary" id="jobs-filter-btn">查询</button>
      </div>
    </div>

    <div class="batch-bar" id="jobs-batch-bar" style="display:none;">
      <span id="jobs-selected-count">已选 0 项</span>
      <button class="btn" id="jobs-batch-approve">批量审批</button>
      <button class="btn" id="jobs-batch-retry">批量重试</button>
    </div>

    <div class="table-wrapper" id="jobs-table-wrapper">
      <div class="page-loading">加载中...</div>
    </div>
  `;

  const statusEl = container.querySelector('#jobs-status');
  const limitEl = container.querySelector('#jobs-limit');

  async function loadJobs() {
    selectedIds.clear();
    updateBatchBar();
    const wrapper = container.querySelector('#jobs-table-wrapper');
    wrapper.innerHTML = '<div class="page-loading">加载中...</div>';

    try {
      const data = await api.getJobs({ status: statusEl.value, limit: limitEl.value });
      const items = Array.isArray(data?.items) ? data.items : [];

      if (items.length === 0) {
        wrapper.innerHTML = '<div class="table-empty">暂无任务</div>';
        return;
      }

      wrapper.innerHTML = `
        <table class="data-table">
          <thead><tr>
            <th class="cell-check"><input type="checkbox" id="jobs-select-all" /></th>
            <th>ID</th><th>状态</th><th>评论内容</th><th>路由</th><th>回复</th><th>风险</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${items.map(j => `
              <tr data-id="${escapeHtml(j.id)}">
                <td class="cell-check"><input type="checkbox" class="job-checkbox" data-id="${escapeHtml(j.id)}" /></td>
                <td class="cell-id" title="${escapeHtml(j.id)}">${escapeHtml(j.id?.substring(0, 8))}</td>
                <td>${renderBadge(j.status)}</td>
                <td class="cell-truncate" title="${escapeHtml(j.comment_text)}">${escapeHtml(j.comment_text?.substring(0, 80))}</td>
                <td class="cell-truncate" title="${escapeHtml(formatRouteContextLabel(j.route_context))}">${escapeHtml(formatRouteContextLabel(j.route_context))}</td>
                <td class="cell-truncate" title="${escapeHtml(j.reply_text)}">${escapeHtml(j.reply_text?.substring(0, 60))}</td>
                <td>${j.risk_flags?.length ? j.risk_flags.map(f => `<span class="risk-flag">${escapeHtml(f)}</span>`).join(' ') : '-'}</td>
                <td class="cell-time">${renderTimestamp(j.created_at)}</td>
                <td class="cell-actions">
                  ${j.status === 'pending_review' ? `<button class="btn btn-sm btn-primary job-approve" data-id="${escapeHtml(j.id)}">审批</button>` : ''}
                  <button class="btn btn-sm job-retry" data-id="${escapeHtml(j.id)}">重试</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      // Checkbox logic
      wrapper.querySelector('#jobs-select-all')?.addEventListener('change', (e) => {
        const checked = e.target.checked;
        wrapper.querySelectorAll('.job-checkbox').forEach(cb => {
          cb.checked = checked;
          if (checked) selectedIds.add(cb.dataset.id);
          else selectedIds.delete(cb.dataset.id);
        });
        updateBatchBar();
      });

      wrapper.querySelectorAll('.job-checkbox').forEach(cb => {
        cb.addEventListener('change', () => {
          if (cb.checked) selectedIds.add(cb.dataset.id);
          else selectedIds.delete(cb.dataset.id);
          updateBatchBar();
        });
      });

      // Approve buttons (INT-004 UI-odyssey 001: finally 统一复位, 防 loadJobs 失败时按钮卡死)
      wrapper.querySelectorAll('.job-approve').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          btn.textContent = '审批中...';
          try {
            await api.approveJob(btn.dataset.id);
            showToast('审批成功', 'success');
            await loadJobs();
          } catch (err) {
            showToast(`审批失败: ${err.message}`, 'error');
          } finally {
            btn.disabled = false;
            btn.textContent = '审批';
          }
        });
      });

      // Retry buttons
      wrapper.querySelectorAll('.job-retry').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          btn.textContent = '重试中...';
          try {
            await api.retryJob(btn.dataset.id);
            showToast('重试已提交', 'success');
            await loadJobs();
          } catch (err) {
            showToast(`重试失败: ${err.message}`, 'error');
          } finally {
            btn.disabled = false;
            btn.textContent = '重试';
          }
        });
      });
    } catch (err) {
      wrapper.innerHTML = `<div class="page-error">加载失败: ${escapeHtml(err.message)}</div>`;
    }
  }

  function updateBatchBar() {
    const bar = container.querySelector('#jobs-batch-bar');
    const count = container.querySelector('#jobs-selected-count');
    if (selectedIds.size > 0) {
      bar.style.display = 'flex';
      count.textContent = `已选 ${selectedIds.size} 项`;
    } else {
      bar.style.display = 'none';
    }
  }

  container.querySelector('#jobs-filter-btn').addEventListener('click', loadJobs);
  container.querySelector('#jobs-refresh').addEventListener('click', loadJobs);

  container.querySelector('#jobs-export').addEventListener('click', async () => {
    try {
      await api.exportJobsCsv({ status: statusEl.value, limit: limitEl.value });
      showToast('导出成功', 'success');
    } catch (err) {
      showToast(`导出失败: ${err.message}`, 'error');
    }
  });

  container.querySelector('#jobs-batch-approve').addEventListener('click', async () => {
    if (selectedIds.size === 0) return;
    try {
      await api.batchApprove([...selectedIds]);
      showToast(`批量审批 ${selectedIds.size} 项成功`, 'success');
      loadJobs();
    } catch (err) {
      showToast(`批量审批失败: ${err.message}`, 'error');
    }
  });

  container.querySelector('#jobs-batch-retry').addEventListener('click', async () => {
    if (selectedIds.size === 0) return;
    try {
      await api.batchRetry([...selectedIds]);
      showToast(`批量重试 ${selectedIds.size} 项成功`, 'success');
      loadJobs();
    } catch (err) {
      showToast(`批量重试失败: ${err.message}`, 'error');
    }
  });

  await loadJobs();
}
