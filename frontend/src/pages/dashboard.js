import { createAdminApi } from '../api/admin.js';
import { escapeHtml, safeCount, formatIsoDateTime } from '../utils/format.js';
import { renderBadge } from '../components/badge.js';
import { showToast } from '../components/toast.js';

const api = createAdminApi();

const RUNTIME_SIGNAL_SPECS = [
  { label: 'LLM 提供方', keys: ['llm_provider', 'llmProvider'] },
  { label: '搜索提供方', keys: ['search_provider', 'searchProvider'] },
  { label: '发布模式', keys: ['publisher_mode', 'publisherMode'] },
  { label: 'LLM Key', keys: ['llm_api_key_configured', 'llmApiKeyConfigured'], format: 'configured' },
  { label: '搜索 Key', keys: ['search_api_key_configured', 'searchApiKeyConfigured'], format: 'configured' },
  { label: 'Webhook', keys: ['publisher_webhook_url_configured', 'publisherWebhookUrlConfigured'], format: 'configured' },
  { label: 'B站采集', keys: ['bilibili_enabled', 'bilibiliEnabled'], format: 'enabled' },
  { label: 'B站发布', keys: ['bilibili_publish_enabled', 'bilibiliPublishEnabled'], format: 'enabled' },
  { label: 'Kill Switch', keys: ['kill_switch', 'killSwitch'], format: 'enabled' },
];

function getFirstValue(record, keys) {
  for (const key of keys) {
    if (record?.[key] !== undefined && record?.[key] !== null && record?.[key] !== '') {
      return record[key];
    }
  }
  return undefined;
}

function formatSignalValue(value, format) {
  if (format === 'configured') {
    return value ? '已配置' : '未配置';
  }
  if (format === 'enabled') {
    return value ? '开启' : '关闭';
  }
  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }
  return String(value);
}

function buildRuntimeSignals(metricsOverview) {
  return RUNTIME_SIGNAL_SPECS
    .map((spec) => {
      const value = getFirstValue(metricsOverview, spec.keys);
      if (value === undefined) {
        return null;
      }
      return {
        label: spec.label,
        value: formatSignalValue(value, spec.format),
      };
    })
    .filter(Boolean);
}

function humanizeKey(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[._]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function flattenObservabilityEntries(value, prefix = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }
  const entries = [];
  for (const [key, raw] of Object.entries(value)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (raw == null || raw === '') {
      continue;
    }
    if (typeof raw === 'object' && !Array.isArray(raw)) {
      entries.push(...flattenObservabilityEntries(raw, nextKey));
      continue;
    }
    if (Array.isArray(raw)) {
      if (raw.length > 0) {
        entries.push({ label: humanizeKey(nextKey), value: `${raw.length} 项` });
      }
      continue;
    }
    entries.push({ label: humanizeKey(nextKey), value: String(raw) });
  }
  return entries;
}

function renderSummaryGrid(entries, emptyText) {
  if (!entries.length) {
    return `<div class="table-empty" style="padding:16px;">${escapeHtml(emptyText)}</div>`;
  }

  return `
    <div class="audit-summary-grid">
      ${entries.map((entry) => `
        <div class="stat-card mini">
          <div class="stat-label">${escapeHtml(entry.label)}</div>
          <div class="stat-value">${escapeHtml(entry.value)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

export async function render(container) {
  container.innerHTML = '<div class="page-loading">加载中...</div>';

  try {
    const [overview, jobs, gatewayLogs, auditSummary, metricsOverview, observabilitySummary] = await Promise.all([
      api.getOverview().catch(() => null),
      api.getJobs({ limit: 5 }).catch(() => null),
      api.getGatewayLogs({ limit: 5 }).catch(() => null),
      api.getAuditSummary({ days: 7 }).catch(() => null),
      api.getMetricsOverview().catch(() => null),
      api.getObservabilitySummary({ windowMinutes: 120 }).catch(() => null),
    ]);

    const ov = overview || {};
    const jobItems = Array.isArray(jobs?.items) ? jobs.items : [];
    const gwItems = Array.isArray(gatewayLogs?.items) ? gatewayLogs.items : [];
    const runtimeSignals = buildRuntimeSignals(metricsOverview || {});
    const observabilitySignals = flattenObservabilityEntries(observabilitySummary?.summary || observabilitySummary || {}).slice(0, 6);

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

        <div class="section-card">
          <div class="section-card-header">
            <h3>运行时能力</h3>
          </div>
          ${renderSummaryGrid(runtimeSignals, '未返回运行时配置摘要')}
        </div>

        <div class="section-card">
          <div class="section-card-header">
            <h3>可观测性摘要 (120分钟)</h3>
          </div>
          ${renderSummaryGrid(observabilitySignals, '未返回可观测性摘要')}
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
