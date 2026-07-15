import { createAdminApi } from '../api/admin.js';
import { escapeHtml, formatIsoDateTime } from '../utils/format.js';
import { renderBoolBadge } from '../components/badge.js';
import { showToast } from '../components/toast.js';

const api = createAdminApi();
let dirty = false;
let originalData = null;

export async function render(container) {
  dirty = false;
  originalData = null;

  container.innerHTML = `
    <div class="page-header">
      <h2>角色卡管理</h2>
      <div class="page-actions">
        <button class="btn" id="rc-refresh"><svg width="14" height="14" aria-hidden="true" focusable="false"><use href="#icon-refresh"></use></svg> 刷新</button>
      </div>
    </div>

    <div class="filter-bar">
      <div class="form-group">
        <label class="form-label" for="rc-select">选择角色卡</label>
        <select id="rc-select" class="form-input"><option value="">-- 新建 --</option></select>
      </div>
      <div class="form-group">
        <button class="btn" id="rc-new"><svg width="14" height="14" aria-hidden="true" focusable="false"><use href="#icon-plus"></use></svg> 新建</button>
      </div>
    </div>

    <div class="form-card" id="rc-editor" style="display:none;">
      <h3 id="rc-editor-title">新建角色卡</h3>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="rc-key">Key</label>
          <input type="text" id="rc-key" class="form-input" placeholder="唯一标识 (英文)" />
        </div>
        <div class="form-group">
          <label class="form-label" for="rc-name">名称</label>
          <input type="text" id="rc-name" class="form-input" placeholder="角色名称" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="rc-desc">描述</label>
        <input type="text" id="rc-desc" class="form-input" placeholder="简短描述" />
      </div>
      <div class="form-group">
        <label class="form-label" for="rc-system-prompt">System Prompt</label>
        <textarea id="rc-system-prompt" class="form-input form-textarea" rows="4" placeholder="系统提示词"></textarea>
      </div>
      <div class="form-group">
        <label class="form-label" for="rc-tone">语气 (Tone)</label>
        <input type="text" id="rc-tone" class="form-input" placeholder="例: friendly, witty" />
      </div>
      <div class="form-group">
        <label class="form-label" for="rc-constraints">约束 (Constraints)</label>
        <textarea id="rc-constraints" class="form-input form-textarea" rows="2" placeholder="行为约束，JSON 或文本"></textarea>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" id="rc-save">保存</button>
        <button class="btn" id="rc-activate" style="display:none;">激活</button>
        <button class="btn btn-danger" id="rc-disable" style="display:none;">禁用</button>
      </div>
    </div>
  `;

  const selectEl = container.querySelector('#rc-select');
  const editorEl = container.querySelector('#rc-editor');
  let cards = [];

  function markDirty() {
    dirty = true;
  }

  function checkDirty() {
    if (!dirty) return true;
    return confirm('当前角色卡有未保存的修改，确定要切换吗？');
  }

  function fillEditor(card) {
    originalData = card;
    container.querySelector('#rc-key').value = card?.key || '';
    container.querySelector('#rc-key').disabled = !!card;
    container.querySelector('#rc-name').value = card?.name || '';
    container.querySelector('#rc-desc').value = card?.description || '';
    container.querySelector('#rc-system-prompt').value = card?.system_prompt || '';
    container.querySelector('#rc-tone').value = card?.tone || '';
    container.querySelector('#rc-constraints').value = typeof card?.constraints === 'string' ? card.constraints : JSON.stringify(card?.constraints || '', null, 2);
    container.querySelector('#rc-editor-title').textContent = card ? `编辑: ${card.name || card.key}` : '新建角色卡';
    container.querySelector('#rc-activate').style.display = card && card.enabled === false ? 'inline-flex' : 'none';
    container.querySelector('#rc-disable').style.display = card && card.enabled !== false ? 'inline-flex' : 'none';
    editorEl.style.display = 'block';
    dirty = false;
  }

  // Watch for changes
  editorEl.querySelectorAll('.form-input').forEach(el => el.addEventListener('input', markDirty));

  async function loadCards() {
    try {
      const data = await api.getRoleCards({ limit: 100 });
      cards = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      selectEl.innerHTML = '<option value="">-- 新建 --</option>' +
        cards.map(c => `<option value="${escapeHtml(c.key)}">${escapeHtml(c.name || c.key)}${c.enabled === false ? ' (禁用)' : ''}</option>`).join('');
    } catch (err) {
      showToast(`加载失败: ${err.message}`, 'error');
    }
  }

  selectEl.addEventListener('change', () => {
    if (!checkDirty()) {
      selectEl.value = originalData?.key || '';
      return;
    }
    const key = selectEl.value;
    const card = cards.find(c => c.key === key);
    fillEditor(card || null);
  });

  container.querySelector('#rc-new').addEventListener('click', () => {
    if (!checkDirty()) return;
    selectEl.value = '';
    fillEditor(null);
  });

  container.querySelector('#rc-save').addEventListener('click', async () => {
    const payload = {
      key: container.querySelector('#rc-key').value.trim(),
      name: container.querySelector('#rc-name').value.trim(),
      description: container.querySelector('#rc-desc').value.trim(),
      system_prompt: container.querySelector('#rc-system-prompt').value.trim(),
      tone: container.querySelector('#rc-tone').value.trim(),
    };
    const constraintsRaw = container.querySelector('#rc-constraints').value.trim();
    try {
      payload.constraints = constraintsRaw ? JSON.parse(constraintsRaw) : '';
    } catch {
      payload.constraints = constraintsRaw;
    }

    if (!payload.key) {
      showToast('Key 不能为空', 'warning');
      return;
    }

    try {
      if (originalData?.key) {
        await api.updateRoleCard(originalData.key, payload);
        showToast('保存成功', 'success');
      } else {
        await api.createRoleCard(payload);
        showToast('创建成功', 'success');
      }
      dirty = false;
      await loadCards();
      selectEl.value = payload.key;
    } catch (err) {
      showToast(`操作失败: ${err.message}`, 'error');
    }
  });

  container.querySelector('#rc-activate').addEventListener('click', async () => {
    if (!originalData?.key) return;
    try {
      await api.activateRoleCard(originalData.key);
      showToast('已激活', 'success');
      await loadCards();
    } catch (err) {
      showToast(`激活失败: ${err.message}`, 'error');
    }
  });

  container.querySelector('#rc-disable').addEventListener('click', async () => {
    if (!originalData?.key) return;
    try {
      await api.disableRoleCard(originalData.key);
      showToast('已禁用', 'success');
      await loadCards();
    } catch (err) {
      showToast(`禁用失败: ${err.message}`, 'error');
    }
  });

  container.querySelector('#rc-refresh').addEventListener('click', () => {
    loadCards();
  });

  await loadCards();
}
