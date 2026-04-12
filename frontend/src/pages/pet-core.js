import { createAdminApi } from '../api/admin.js';
import { escapeHtml } from '../utils/format.js';

const api = createAdminApi();

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
    </div>
  `;

  async function load() {
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
      </div>
      <p class="form-hint" style="margin-top: 12px;">${escapeHtml(companion.statusLine || '')}</p>
    `;
  }

  container.querySelector('#pet-refresh').addEventListener('click', () => {
    void load();
  });

  await load();
}
