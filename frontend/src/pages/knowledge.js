import { createAdminApi } from '../api/admin.js';
import { escapeHtml, formatIsoDateTime, renderTimestamp } from '../utils/format.js';
import { renderBadge, renderBoolBadge } from '../components/badge.js';
import { showToast } from '../components/toast.js';

const api = createAdminApi();

export async function render(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>知识库</h2>
      <button class="btn" id="knowledge-refresh"><svg width="14" height="14" aria-hidden="true" focusable="false"><use href="#icon-refresh"></use></svg> 刷新</button>
    </div>

    <div class="form-card">
      <h3>新增条目</h3>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="knowledge-category">分类</label>
          <input type="text" id="knowledge-category" class="form-input" placeholder="例: personality" />
        </div>
        <div class="form-group">
          <label class="form-label" for="knowledge-title">标题</label>
          <input type="text" id="knowledge-title" class="form-input" placeholder="条目标题" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="knowledge-content">内容</label>
        <textarea id="knowledge-content" class="form-input form-textarea" rows="3" placeholder="知识内容"></textarea>
      </div>
      <button class="btn btn-primary" id="knowledge-create">创建</button>
    </div>

    <div class="table-wrapper" id="knowledge-table-wrapper">
      <div class="page-loading">加载中...</div>
    </div>
  `;

  async function loadEntries() {
    const wrapper = container.querySelector('#knowledge-table-wrapper');
    wrapper.innerHTML = '<div class="page-loading">加载中...</div>';

    try {
      const data = await api.getKnowledgeEntries({ limit: 50 });
      const items = Array.isArray(data?.items) ? data.items : [];

      if (items.length === 0) {
        wrapper.innerHTML = '<div class="table-empty">暂无知识条目</div>';
        return;
      }

      wrapper.innerHTML = `
        <table class="data-table">
          <thead><tr>
            <th>ID</th><th>分类</th><th>标题</th><th>内容</th><th>启用</th><th>时间</th><th>操作</th>
          </tr></thead>
          <tbody>
            ${items.map(e => `<tr>
              <td class="cell-id" title="${escapeHtml(e.id?.toString() || '')}">${escapeHtml(String(e.id ?? '').substring(0, 8))}</td>
              <td>${escapeHtml(e.category)}</td>
              <td>${escapeHtml(e.title)}</td>
              <td class="cell-truncate" title="${escapeHtml(e.content || '')}">${escapeHtml(e.content?.substring(0, 80))}</td>
              <td>${renderBoolBadge(e.enabled !== false)}</td>
              <td class="cell-time">${renderTimestamp(e.created_at)}</td>
              <td class="cell-actions">
                ${e.enabled !== false ? `<button class="btn btn-sm btn-danger knowledge-disable" data-id="${escapeHtml(e.id)}">禁用</button>` : '<span class="text-muted">已禁用</span>'}
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      `;

      wrapper.querySelectorAll('.knowledge-disable').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            await api.disableKnowledgeEntry(btn.dataset.id);
            showToast('已禁用', 'success');
            loadEntries();
          } catch (err) {
            showToast(`操作失败: ${err.message}`, 'error');
          }
        });
      });
    } catch (err) {
      wrapper.innerHTML = `<div class="page-error">加载失败: ${escapeHtml(err.message)}</div>`;
    }
  }

  container.querySelector('#knowledge-create').addEventListener('click', async () => {
    const category = container.querySelector('#knowledge-category').value.trim();
    const title = container.querySelector('#knowledge-title').value.trim();
    const content = container.querySelector('#knowledge-content').value.trim();
    if (!category || !title || !content) {
      showToast('分类、标题和内容不能为空', 'warning');
      return;
    }
    try {
      await api.createKnowledgeEntry({ category, title, content });
      showToast('创建成功', 'success');
      container.querySelector('#knowledge-category').value = '';
      container.querySelector('#knowledge-title').value = '';
      container.querySelector('#knowledge-content').value = '';
      loadEntries();
    } catch (err) {
      showToast(`创建失败: ${err.message}`, 'error');
    }
  });

  container.querySelector('#knowledge-refresh').addEventListener('click', loadEntries);
  await loadEntries();
}
