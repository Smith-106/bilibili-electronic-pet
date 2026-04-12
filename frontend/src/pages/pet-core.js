import { createAdminApi } from '../api/admin.js';
import { showToast } from '../components/toast.js';
import { escapeHtml } from '../utils/format.js';

const api = createAdminApi();
const PET_ACTIONS = [
  { key: 'pat', label: 'Pat' },
  { key: 'feed', label: 'Feed' },
  { key: 'wake', label: 'Wake' },
];

function renderSignalList(items) {
  if (!Array.isArray(items) || !items.length) {
    return '<div class="table-empty">暂无主动信号</div>';
  }

  return `
    <ul class="signal-list" style="padding: 0 16px 16px;">
      ${items
        .map(
          (item) =>
            `<li class="signal-item"><strong>${escapeHtml(item.label || item.key || '信号')}</strong>: ${escapeHtml(item.detail || '-')}</li>`,
        )
        .join('')}
    </ul>
  `;
}

function renderNeedCards(items) {
  if (!Array.isArray(items) || !items.length) {
    return '<div class="table-empty">暂无 needs 数据</div>';
  }

  return `
    <div class="audit-summary-grid">
      ${items
        .map(
          (item) => `
            <div class="stat-card mini">
              <div class="stat-label">${escapeHtml(item.label || item.key || 'Need')}</div>
              <div class="stat-value">${escapeHtml(item.value || '-')}</div>
            </div>
          `,
        )
        .join('')}
    </div>
  `;
}

function renderInteractionList(items) {
  if (!Array.isArray(items) || !items.length) {
    return '<div class="table-empty">暂无最近交互</div>';
  }

  return `
    <div style="padding: 0 16px 16px; display: grid; gap: 12px;">
      ${items
        .map(
          (item) => `
            <article class="stat-card mini">
              <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start;">
                <div>
                  <div class="stat-value" style="font-size: 14px;">${escapeHtml(item.title || item.kind || '互动')}</div>
                  <div class="form-hint" style="margin-top: 6px;">${escapeHtml(item.detail || '-')}</div>
                </div>
                <div style="text-align:right;">
                  <div class="stat-label">${escapeHtml(item.source || 'pet-core')}</div>
                  <div class="form-hint" style="margin-top: 6px;">${escapeHtml(item.timestamp || '-')}</div>
                </div>
              </div>
            </article>
          `,
        )
        .join('')}
    </div>
  `;
}

function renderLoadFailure(message) {
  return `<div class="page-error">加载失败: ${escapeHtml(message)}</div>`;
}

export async function render(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2>宠物核心</h2>
      <button class="btn" id="pet-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
    </div>
    <div class="section-grid">
      <div class="section-card">
        <div class="section-card-header"><h3>关系与阶段</h3></div>
        <div id="pet-arc" style="padding:16px;"><div class="page-loading">加载中...</div></div>
      </div>
      <div class="section-card">
        <div class="section-card-header"><h3>Needs</h3></div>
        <div id="pet-needs" style="padding:16px;"><div class="page-loading">加载中...</div></div>
      </div>
      <div class="section-card">
        <div class="section-card-header"><h3>主动信号</h3></div>
        <div id="pet-signals"><div class="page-loading">加载中...</div></div>
      </div>
      <div class="section-card">
        <div class="section-card-header"><h3>Companion 摘要</h3></div>
        <div id="pet-companion-summary" style="padding:16px;"><div class="page-loading">加载中...</div></div>
      </div>
      <div class="section-card">
        <div class="section-card-header"><h3>Loop 动作</h3></div>
        <div style="padding:16px; display:grid; gap:12px;">
          <p class="form-hint">直接记录 Pat / Feed / Wake，验证 pet loop 是否仍能持续推进。</p>
          <label class="form-label" for="pet-action-note">动作备注</label>
          <textarea id="pet-action-note" rows="3" maxlength="160" placeholder="可选备注，会写入 pet-core 交互历史。"></textarea>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            ${PET_ACTIONS.map(
              (item) =>
                `<button class="btn btn-primary" type="button" data-role="pet-action" data-action="${escapeHtml(item.key)}" data-action-label="${escapeHtml(item.label)}">${escapeHtml(item.label)}</button>`,
            ).join('')}
          </div>
          <div id="pet-action-status" class="form-hint">准备记录下一次宠物动作。</div>
        </div>
      </div>
      <div class="section-card">
        <div class="section-card-header"><h3>最近交互</h3></div>
        <div id="pet-timeline"><div class="page-loading">加载中...</div></div>
      </div>
    </div>
  `;

  const actionNote = container.querySelector('#pet-action-note');
  const actionStatus = container.querySelector('#pet-action-status');
  const actionButtons = [...container.querySelectorAll('[data-role="pet-action"]')];

  function setActionPending(pendingAction = '') {
    actionButtons.forEach((button) => {
      const label = button.getAttribute('data-action-label') || button.textContent || '';
      const isPending = pendingAction && button.getAttribute('data-action') === pendingAction;
      button.disabled = Boolean(pendingAction);
      button.textContent = isPending ? `${label}...` : label;
    });
  }

  async function load() {
    try {
      const response = await api.getPetOverview();
      const item = response?.item || {};
      const snapshot = item.snapshot || {};
      const companion = item.companion || {};
      const relationship = snapshot.relationship || {};
      const progress = snapshot.progress || {};

      container.querySelector('#pet-arc').innerHTML = `
        <div class="audit-summary-grid">
          <div class="stat-card mini">
            <div class="stat-label">关系等级</div>
            <div class="stat-value">${escapeHtml(relationship.level || '-')}</div>
          </div>
          <div class="stat-card mini">
            <div class="stat-label">当前阶段</div>
            <div class="stat-value">${escapeHtml(progress.progressLabel || '-')}</div>
          </div>
        </div>
        <p class="form-hint" style="margin-top: 12px;">${escapeHtml(relationship.note || '')}</p>
        <p class="form-hint">${escapeHtml(progress.nextMilestone || '暂无下一阶段里程碑')}</p>
      `;
      container.querySelector('#pet-needs').innerHTML = renderNeedCards(snapshot.needs);
      container.querySelector('#pet-signals').innerHTML = renderSignalList(snapshot.proactiveSignals);
      container.querySelector('#pet-companion-summary').innerHTML = `
        <div class="audit-summary-grid">
          <div class="stat-card mini">
            <div class="stat-label">宠物名</div>
            <div class="stat-value">${escapeHtml(companion.petName || '-')}</div>
          </div>
          <div class="stat-card mini">
            <div class="stat-label">Loop mode</div>
            <div class="stat-value">${escapeHtml(companion.loopMode || '-')}</div>
          </div>
          <div class="stat-card mini">
            <div class="stat-label">状态来源</div>
            <div class="stat-value">${escapeHtml(companion.adapterLabel || '-')}</div>
          </div>
        </div>
        <p class="form-hint" style="margin-top: 12px;">${escapeHtml(companion.statusLine || '')}</p>
      `;
      container.querySelector('#pet-timeline').innerHTML = renderInteractionList(companion.recentInteractions);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown_error';
      container.querySelector('#pet-arc').innerHTML = renderLoadFailure(message);
      container.querySelector('#pet-needs').innerHTML = renderLoadFailure(message);
      container.querySelector('#pet-signals').innerHTML = renderLoadFailure(message);
      container.querySelector('#pet-companion-summary').innerHTML = renderLoadFailure(message);
      container.querySelector('#pet-timeline').innerHTML = renderLoadFailure(message);
      throw error;
    }
  }

  async function triggerAction(action) {
    const activeButton = actionButtons.find((button) => button.getAttribute('data-action') === action);
    const label = activeButton?.getAttribute('data-action-label') || action;
    const note = typeof actionNote?.value === 'string' ? actionNote.value.trim().slice(0, 160) : '';

    setActionPending(action);
    actionStatus.textContent = `正在记录 ${label}...`;

    try {
      await api.recordPetAction(action, note || undefined);
      showToast(`${label} 已记录`, 'success');
      actionStatus.textContent = `${label} 已记录，正在刷新宠物循环。`;
      if (actionNote) {
        actionNote.value = '';
      }
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown_error';
      actionStatus.textContent = `记录失败: ${message}`;
      showToast(`宠物动作失败: ${message}`, 'error');
    } finally {
      setActionPending();
    }
  }

  actionButtons.forEach((button) => {
    button.addEventListener('click', () => {
      void triggerAction(button.getAttribute('data-action') || '');
    });
  });

  container.querySelector('#pet-refresh').addEventListener('click', () => {
    void load();
  });

  await load();
}
