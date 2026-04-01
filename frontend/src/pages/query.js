import { createAdminApi } from '../api/admin.js';
import { escapeHtml, formatIsoDateTime, renderTimestamp } from '../utils/format.js';
import { showToast } from '../components/toast.js';

const api = createAdminApi();

export async function render(container) {
  container.innerHTML = `
    <div class="page-header"><h2>查询</h2></div>

    <div class="section-grid">
      <div class="section-card">
        <div class="section-card-header"><h3>评论详情查询</h3></div>
        <div style="padding: 16px;">
          <div class="form-row">
            <div class="form-group" style="flex:1;">
              <input type="text" id="query-comment-id" class="form-input" placeholder="输入 Comment ID" />
            </div>
            <div class="form-group">
              <button class="btn btn-primary" id="query-comment-btn">查询评论</button>
            </div>
          </div>
          <div id="query-comment-result"></div>
        </div>
      </div>

      <div class="section-card">
        <div class="section-card-header"><h3>任务详情查询</h3></div>
        <div style="padding: 16px;">
          <div class="form-row">
            <div class="form-group" style="flex:1;">
              <input type="text" id="query-job-id" class="form-input" placeholder="输入 Job ID" />
            </div>
            <div class="form-group">
              <button class="btn btn-primary" id="query-job-btn">查询任务</button>
            </div>
          </div>
          <div id="query-job-result"></div>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#query-comment-btn').addEventListener('click', async () => {
    const id = container.querySelector('#query-comment-id').value.trim();
    const result = container.querySelector('#query-comment-result');
    if (!id) { showToast('请输入 Comment ID', 'warning'); return; }

    result.innerHTML = '<div class="page-loading">查询中...</div>';
    try {
      const data = await api.getComment(id);
      result.innerHTML = `
        <div class="detail-card">
          ${Object.entries(data || {}).map(([k, v]) => `
            <div class="detail-row">
              <span class="detail-key">${escapeHtml(k)}</span>
              <span class="detail-value">${escapeHtml(typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v ?? '-'))}</span>
            </div>
          `).join('')}
        </div>
      `;
    } catch (err) {
      result.innerHTML = `<div class="page-error">查询失败: ${escapeHtml(err.message)}</div>`;
    }
  });

  container.querySelector('#query-job-btn').addEventListener('click', async () => {
    const id = container.querySelector('#query-job-id').value.trim();
    const result = container.querySelector('#query-job-result');
    if (!id) { showToast('请输入 Job ID', 'warning'); return; }

    result.innerHTML = '<div class="page-loading">查询中...</div>';
    try {
      const data = await api.getJob(id);
      result.innerHTML = `
        <div class="detail-card">
          ${Object.entries(data || {}).map(([k, v]) => `
            <div class="detail-row">
              <span class="detail-key">${escapeHtml(k)}</span>
              <span class="detail-value">${escapeHtml(typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v ?? '-'))}</span>
            </div>
          `).join('')}
        </div>
        ${data?.comment_id ? `<div style="margin-top:8px;"><a class="link-button" id="query-goto-comment" data-id="${escapeHtml(data.comment_id)}">查看关联评论 →</a></div>` : ''}
      `;

      const linkBtn = result.querySelector('#query-goto-comment');
      if (linkBtn) {
        linkBtn.addEventListener('click', () => {
          container.querySelector('#query-comment-id').value = linkBtn.dataset.id;
          container.querySelector('#query-comment-btn').click();
        });
      }
    } catch (err) {
      result.innerHTML = `<div class="page-error">查询失败: ${escapeHtml(err.message)}</div>`;
    }
  });
}
