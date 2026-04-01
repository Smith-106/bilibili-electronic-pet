import { createAdminApi } from '../api/admin.js';
import { escapeHtml, formatIsoDateTime, renderTimestamp } from '../utils/format.js';
import { renderBadge } from '../components/badge.js';
import { showToast } from '../components/toast.js';

import { renderTable } from '../components/table.js';

import { safeCount } from '../utils/format.js';

const api = createAdminApi();

export async function render(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>网关</h2>
      <button class="btn" id="gw-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
    </div>

    <div class="section-grid">
      <div class="section-card" style="grid-column: 1 / -1;">
        <div class="section-card-header"><h3>手动发布</h3></div>
        <div style="padding: 16px;">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Comment ID</label>
              <input type="text" id="gw-comment-id" class="form-input" placeholder="评论 ID" />
            </div>
            <div class="form-group">
              <label class="form-label">来源</label>
              <input type="text" id="gw-source" class="form-input" value="manual" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">回复内容 <span id="gw-char-count" class="form-hint">0/0</span></label>
            <textarea id="gw-reply" class="form-input form-textarea" rows="3" placeholder="回复文本"></textarea>
          </div>
          <div class="form-row">
            <div class="form-group" style="flex-direction:row; align-items:center; gap:8px;">
              <label class="form-label" style="margin:0;">强制发布</label>
              <input type="checkbox" id="gw-force" />
            </div>
          </div>
          <button class="btn btn-primary" id="gw-publish-btn">发布</button>
        </div>
      </div>
    </div>

    <div class="filter-bar">
      <div class="form-group">
        <label class="form-label">数量</label>
        <input type="number" id="gw-limit" class="form-input" value="20" min="1" max="100" />
      </div>
      <div class="form-group">
        <button class="btn btn-primary" id="gw-filter-btn">查询</button>
      </div>
    </div>

    <div class="table-wrapper" id="gw-table-wrapper">
      <div class="page-loading">加载中...</div>
    </div>
  `;

  // Char counter for reply textarea
  const replyEl = container.querySelector('#gw-reply');
  const charCountEl = container.querySelector('#gw-char-count');
  replyEl.addEventListener('input', () => {
    charCountEl.textContent = `${replyEl.value.length} 字`;
  });

  // Publish button
  container.querySelector('#gw-publish-btn').addEventListener('click', async () => {
    const btn = container.querySelector('#gw-publish-btn');
    const commentId = container.querySelector('#gw-comment-id').value.trim();
    const replyText = container.querySelector('#gw-reply').value.trim();
    const source = container.querySelector('#gw-source').value.trim();
    const force = container.querySelector('#gw-force').checked;

    if (!commentId || !replyText) {
      showToast('Comment ID 和回复内容不能为空', 'warning');
      return;
    }

    btn.disabled = true;
    btn.textContent = '发布中...';
    try {
      await api.publishGatewayReply({ comment_id: commentId, reply_text: replyText, source, force_publish: force });
      showToast('发布成功', 'success');
      container.querySelector('#gw-comment-id').value = '';
      container.querySelector('#gw-reply').value = '';
      charCountEl.textContent = '0/0';
      loadLogs();
    } catch (err) {
      showToast(`发布失败: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = '发布';
    }
  });

  async function loadLogs() {
    const wrapper = container.querySelector('#gw-table-wrapper');
    const limit = container.querySelector('#gw-limit').value;
    wrapper.innerHTML = '<div class="page-loading">加载中...</div>';

    try {
      const data = await api.getGatewayLogs({ limit });
      const items = Array.isArray(data?.items) ? data.items : [];

      if (items.length === 0) {
        wrapper.innerHTML = '<div class="table-empty">暂无网关日志</div>';
        return;
      }

      wrapper.innerHTML = renderTable({
        columns: [
          { key: 'id', label: 'ID', class: 'cell-id', render: r => escapeHtml(r.id?.toString().substring(0, 8)) },
          { key: 'comment_id', label: 'Comment ID', class: 'cell-id', render: r => escapeHtml(r.comment_id?.substring(0, 12)) },
          { key: 'status', label: '状态', render: r => renderBadge(r.status) },
          { key: 'platform', label: '平台', render: r => escapeHtml(r.platform || '-') },
          { key: 'reply_text', label: '回复摘要', class: 'cell-truncate', render: r => escapeHtml(r.reply_text?.substring(0, 60)) },
          { key: 'created_at', label: '时间', class: 'cell-time', render: r => renderTimestamp(r.created_at) },
        ],
        rows: items,
      });
    } catch (err) {
      wrapper.innerHTML = `<div class="page-error">加载失败: ${escapeHtml(err.message)}</div>`;
    }
  }

  container.querySelector('#gw-refresh').addEventListener('click', loadLogs);
  container.querySelector('#gw-filter-btn').addEventListener('click', loadLogs);
  await loadLogs();
}
