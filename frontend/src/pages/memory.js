import { createAdminApi } from '../api/admin.js';
import { escapeHtml, renderTimestamp } from '../utils/format.js';
import { showToast } from '../components/toast.js';

const api = createAdminApi();

function renderSpaceOptions(spaces) {
  return ['<option value="">选择空间</option>']
    .concat(
      spaces.map(
        (space) =>
          `<option value="${escapeHtml(space.id)}">${escapeHtml(space.title)} (${escapeHtml(space.space_key)})</option>`,
      ),
    )
    .join('');
}

function renderSpacesTable(items) {
  if (!items.length) {
    return '<div class="table-empty">暂无 memory spaces</div>';
  }

  return `
    <table class="data-table">
      <thead><tr>
        <th>ID</th><th>Space Key</th><th>类型</th><th>标题</th><th>摘要</th><th>更新时间</th>
      </tr></thead>
      <tbody>
        ${items
          .map(
            (item) => `<tr>
              <td class="cell-id">${escapeHtml(String(item.id))}</td>
              <td>${escapeHtml(item.space_key)}</td>
              <td>${escapeHtml(item.space_type)}</td>
              <td>${escapeHtml(item.title)}</td>
              <td class="cell-truncate">${escapeHtml((item.summary || '').substring(0, 80))}</td>
              <td class="cell-time">${renderTimestamp(item.updated_at)}</td>
            </tr>`,
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function renderGrantsTable(items) {
  if (!items.length) {
    return '<div class="table-empty">暂无 grants</div>';
  }

  return `
    <table class="data-table">
      <thead><tr>
        <th>ID</th><th>Space ID</th><th>主体类型</th><th>主体 ID</th><th>权限</th><th>更新时间</th>
      </tr></thead>
      <tbody>
        ${items
          .map(
            (item) => `<tr>
              <td class="cell-id">${escapeHtml(String(item.id))}</td>
              <td>${escapeHtml(String(item.space_id))}</td>
              <td>${escapeHtml(item.subject_type)}</td>
              <td>${escapeHtml(item.subject_id)}</td>
              <td>${escapeHtml(item.access_level)}</td>
              <td class="cell-time">${renderTimestamp(item.updated_at)}</td>
            </tr>`,
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function renderItemsTable(items) {
  if (!items.length) {
    return '<div class="table-empty">暂无 memory items</div>';
  }

  return `
    <table class="data-table">
      <thead><tr>
        <th>ID</th><th>Space ID</th><th>Item Key</th><th>类型</th><th>来源</th><th>内容</th><th>更新时间</th>
      </tr></thead>
      <tbody>
        ${items
          .map(
            (item) => `<tr>
              <td class="cell-id">${escapeHtml(String(item.id))}</td>
              <td>${escapeHtml(String(item.space_id))}</td>
              <td>${escapeHtml(item.item_key)}</td>
              <td>${escapeHtml(item.content_type)}</td>
              <td>${escapeHtml(item.source)}</td>
              <td class="cell-truncate">${escapeHtml((item.content || '').substring(0, 100))}</td>
              <td class="cell-time">${renderTimestamp(item.updated_at)}</td>
            </tr>`,
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function renderIdentityLinksTable(items) {
  if (!items.length) {
    return '<div class="table-empty">暂无 identity links</div>';
  }

  return `
    <table class="data-table">
      <thead><tr>
        <th>ID</th><th>主体类型</th><th>主体 ID</th><th>平台</th><th>外部 ID</th><th>显示名</th><th>更新时间</th>
      </tr></thead>
      <tbody>
        ${items
          .map(
            (item) => `<tr>
              <td class="cell-id">${escapeHtml(String(item.id))}</td>
              <td>${escapeHtml(item.subject_type)}</td>
              <td>${escapeHtml(item.subject_id)}</td>
              <td>${escapeHtml(item.platform)}</td>
              <td>${escapeHtml(item.external_id)}</td>
              <td>${escapeHtml(item.display_name || '')}</td>
              <td class="cell-time">${renderTimestamp(item.updated_at)}</td>
            </tr>`,
          )
          .join('')}
      </tbody>
    </table>
  `;
}

export async function render(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>Memory 管理</h2>
      <button class="btn" id="memory-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
    </div>

    <div class="form-card">
      <h3>新增 Space</h3>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="memory-space-key">Space Key</label>
          <input type="text" id="memory-space-key" class="form-input" placeholder="operator:alpha" />
        </div>
        <div class="form-group">
          <label class="form-label" for="memory-space-type">类型</label>
          <input type="text" id="memory-space-type" class="form-input" value="operator" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="memory-space-title">标题</label>
          <input type="text" id="memory-space-title" class="form-input" placeholder="Alpha Operator" />
        </div>
        <div class="form-group">
          <label class="form-label" for="memory-space-summary">摘要</label>
          <input type="text" id="memory-space-summary" class="form-input" placeholder="简短描述" />
        </div>
      </div>
      <button class="btn btn-primary" id="memory-space-create">创建 Space</button>
    </div>

    <div class="form-card">
      <h3>新增 / 更新 Item</h3>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="memory-item-space">Space</label>
          <select id="memory-item-space" class="form-input"><option value="">选择空间</option></select>
        </div>
        <div class="form-group">
          <label class="form-label" for="memory-item-key">Item Key</label>
          <input type="text" id="memory-item-key" class="form-input" placeholder="status:latest" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="memory-item-type">类型</label>
          <input type="text" id="memory-item-type" class="form-input" value="note" />
        </div>
        <div class="form-group">
          <label class="form-label" for="memory-item-source">来源</label>
          <input type="text" id="memory-item-source" class="form-input" value="operator" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="memory-item-content">内容</label>
        <textarea id="memory-item-content" class="form-input form-textarea" rows="3" placeholder="记忆内容"></textarea>
      </div>
      <button class="btn btn-primary" id="memory-item-create">保存 Item</button>
    </div>

    <div class="form-card">
      <h3>新增 Grant</h3>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="memory-grant-space">Space</label>
          <select id="memory-grant-space" class="form-input"><option value="">选择空间</option></select>
        </div>
        <div class="form-group">
          <label class="form-label" for="memory-grant-access">权限</label>
          <input type="text" id="memory-grant-access" class="form-input" value="read" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="memory-grant-subject-type">主体类型</label>
          <input type="text" id="memory-grant-subject-type" class="form-input" value="operator" />
        </div>
        <div class="form-group">
          <label class="form-label" for="memory-grant-subject-id">主体 ID</label>
          <input type="text" id="memory-grant-subject-id" class="form-input" placeholder="alice" />
        </div>
      </div>
      <button class="btn btn-primary" id="memory-grant-create">创建 Grant</button>
    </div>

    <div class="form-card">
      <h3>新增 Identity Link</h3>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="memory-link-subject-type">主体类型</label>
          <input type="text" id="memory-link-subject-type" class="form-input" value="operator" />
        </div>
        <div class="form-group">
          <label class="form-label" for="memory-link-subject-id">主体 ID</label>
          <input type="text" id="memory-link-subject-id" class="form-input" placeholder="alice" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="memory-link-platform">平台</label>
          <input type="text" id="memory-link-platform" class="form-input" value="bilibili" />
        </div>
        <div class="form-group">
          <label class="form-label" for="memory-link-external-id">外部 ID</label>
          <input type="text" id="memory-link-external-id" class="form-input" placeholder="uid-42" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="memory-link-display-name">显示名</label>
        <input type="text" id="memory-link-display-name" class="form-input" placeholder="Alice" />
      </div>
      <button class="btn btn-primary" id="memory-link-create">创建 Link</button>
    </div>

    <div class="section-grid">
      <div class="section-card">
        <div class="section-card-header"><h3>Spaces</h3></div>
        <div class="table-wrapper" id="memory-spaces-wrapper"><div class="page-loading">加载中...</div></div>
      </div>
      <div class="section-card">
        <div class="section-card-header"><h3>Items</h3></div>
        <div class="table-wrapper" id="memory-items-wrapper"><div class="page-loading">加载中...</div></div>
      </div>
      <div class="section-card">
        <div class="section-card-header"><h3>Grants</h3></div>
        <div class="table-wrapper" id="memory-grants-wrapper"><div class="page-loading">加载中...</div></div>
      </div>
      <div class="section-card">
        <div class="section-card-header"><h3>Identity Links</h3></div>
        <div class="table-wrapper" id="memory-links-wrapper"><div class="page-loading">加载中...</div></div>
      </div>
    </div>
  `;

  async function loadAll() {
    const [spacesData, itemsData, grantsData, linksData] = await Promise.all([
      api.getMemorySpaces({ limit: 50 }),
      api.getMemoryItems({ limit: 50 }),
      api.getMemoryGrants({ limit: 50 }),
      api.getMemoryIdentityLinks({ limit: 50 }),
    ]);

    const spaces = Array.isArray(spacesData?.items) ? spacesData.items : [];
    const items = Array.isArray(itemsData?.items) ? itemsData.items : [];
    const grants = Array.isArray(grantsData?.items) ? grantsData.items : [];
    const links = Array.isArray(linksData?.items) ? linksData.items : [];

    container.querySelector('#memory-spaces-wrapper').innerHTML = renderSpacesTable(spaces);
    container.querySelector('#memory-items-wrapper').innerHTML = renderItemsTable(items);
    container.querySelector('#memory-grants-wrapper').innerHTML = renderGrantsTable(grants);
    container.querySelector('#memory-links-wrapper').innerHTML = renderIdentityLinksTable(links);
    container.querySelector('#memory-grant-space').innerHTML = renderSpaceOptions(spaces);
    container.querySelector('#memory-item-space').innerHTML = renderSpaceOptions(spaces);
  }

  async function guardedReload() {
    try {
      await loadAll();
    } catch (err) {
      const message = escapeHtml(err.message || '未知错误');
      container.querySelector('#memory-spaces-wrapper').innerHTML = `<div class="page-error">加载失败: ${message}</div>`;
      container.querySelector('#memory-items-wrapper').innerHTML = `<div class="page-error">加载失败: ${message}</div>`;
      container.querySelector('#memory-grants-wrapper').innerHTML = `<div class="page-error">加载失败: ${message}</div>`;
      container.querySelector('#memory-links-wrapper').innerHTML = `<div class="page-error">加载失败: ${message}</div>`;
    }
  }

  container.querySelector('#memory-space-create').addEventListener('click', async () => {
    const space_key = container.querySelector('#memory-space-key').value.trim();
    const space_type = container.querySelector('#memory-space-type').value.trim();
    const title = container.querySelector('#memory-space-title').value.trim();
    const summary = container.querySelector('#memory-space-summary').value.trim();

    if (!space_key || !title) {
      showToast('Space Key 和标题不能为空', 'warning');
      return;
    }

    try {
      await api.createMemorySpace({ space_key, space_type, title, summary });
      showToast('Space 创建成功', 'success');
      container.querySelector('#memory-space-key').value = '';
      container.querySelector('#memory-space-title').value = '';
      container.querySelector('#memory-space-summary').value = '';
      await guardedReload();
    } catch (err) {
      showToast(`创建失败: ${err.message}`, 'error');
    }
  });

  container.querySelector('#memory-item-create').addEventListener('click', async () => {
    const space_id = container.querySelector('#memory-item-space').value;
    const item_key = container.querySelector('#memory-item-key').value.trim();
    const content_type = container.querySelector('#memory-item-type').value.trim();
    const source = container.querySelector('#memory-item-source').value.trim();
    const content = container.querySelector('#memory-item-content').value.trim();

    if (!space_id || !item_key || !content) {
      showToast('Space、Item Key 和内容不能为空', 'warning');
      return;
    }

    try {
      await api.upsertMemoryItem({
        space_id: Number(space_id),
        item_key,
        content,
        content_type,
        source,
      });
      showToast('Item 保存成功', 'success');
      container.querySelector('#memory-item-key').value = '';
      container.querySelector('#memory-item-content').value = '';
      await guardedReload();
    } catch (err) {
      showToast(`保存失败: ${err.message}`, 'error');
    }
  });

  container.querySelector('#memory-grant-create').addEventListener('click', async () => {
    const space_id = container.querySelector('#memory-grant-space').value;
    const subject_type = container.querySelector('#memory-grant-subject-type').value.trim();
    const subject_id = container.querySelector('#memory-grant-subject-id').value.trim();
    const access_level = container.querySelector('#memory-grant-access').value.trim();

    if (!space_id || !subject_type || !subject_id) {
      showToast('Space、主体类型和主体 ID 不能为空', 'warning');
      return;
    }

    try {
      await api.grantMemorySpaceAccess({
        space_id: Number(space_id),
        subject_type,
        subject_id,
        access_level,
      });
      showToast('Grant 创建成功', 'success');
      container.querySelector('#memory-grant-subject-id').value = '';
      await guardedReload();
    } catch (err) {
      showToast(`创建失败: ${err.message}`, 'error');
    }
  });

  container.querySelector('#memory-link-create').addEventListener('click', async () => {
    const subject_type = container.querySelector('#memory-link-subject-type').value.trim();
    const subject_id = container.querySelector('#memory-link-subject-id').value.trim();
    const platform = container.querySelector('#memory-link-platform').value.trim();
    const external_id = container.querySelector('#memory-link-external-id').value.trim();
    const display_name = container.querySelector('#memory-link-display-name').value.trim();

    if (!subject_type || !subject_id || !external_id) {
      showToast('主体类型、主体 ID 和外部 ID 不能为空', 'warning');
      return;
    }

    try {
      await api.linkMemoryIdentity({
        subject_type,
        subject_id,
        platform,
        external_id,
        display_name,
      });
      showToast('Identity Link 创建成功', 'success');
      container.querySelector('#memory-link-external-id').value = '';
      container.querySelector('#memory-link-display-name').value = '';
      await guardedReload();
    } catch (err) {
      showToast(`创建失败: ${err.message}`, 'error');
    }
  });

  container.querySelector('#memory-refresh').addEventListener('click', guardedReload);
  await guardedReload();
}
