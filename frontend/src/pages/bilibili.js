import { createAdminApi } from '../api/admin.js';
import { escapeHtml } from '../utils/format.js';
import { showToast } from '../components/toast.js';
import {
  bilibiliVideoPageSize,
  getBilibiliErrorMessage,
  validateBilibiliVideoInput,
  validateBilibiliCredentialInput,
  normalizeOptionalDateTimeValue,
  formatBilibiliBlockingReasons,
  formatBilibiliPublishMode,
  formatBilibiliToggleState,
  formatBilibiliPollInterval,
  formatBilibiliPollIntervalHint,
  formatBilibiliRateLimit,
  formatBilibiliRateLimitHint,
  formatBilibiliCoverage,
  formatBilibiliVideoSplit,
  formatBilibiliPollResultMessage,
  formatBilibiliCredentialHealth,
  formatBilibiliDiagnosticHealth,
  formatBilibiliPublishModeHealth,
} from './bilibili/formatters.js';
import {
  parseBilibiliPollFilter,
  getBilibiliVideoEmptyMessage,
  renderBilibiliVideoIdentity,
  renderBilibiliVideoTitle,
  renderBilibiliVideoPollState,
  renderBilibiliVideoCommentCount,
  renderBilibiliLastPolledCell,
  renderBilibiliVideoPollResult,
  renderBilibiliSyncButton,
  formatBilibiliVideoSummary,
  bilibiliPollErrorMessages,
} from './bilibili/video.js';
import {
  renderBilibiliCredentialName,
  renderBilibiliCredentialFingerprint,
  renderBilibiliCredentialActiveState,
  renderBilibiliCredentialExpiry,
  renderBilibiliCredentialUsageCell,
  formatBilibiliCredentialSummary,
  filterBilibiliCredentials,
  getBilibiliCredentialEmptyMessage,
  getBilibiliCredentialExpiryState,
  formatBilibiliCredentialExpiryHint,
  getBilibiliCredentialUsageState,
  getBilibiliCredentialExpiryColor,
} from './bilibili/credential.js';
const api = createAdminApi();

const capabilityLabelMap = {
  llm_generation: 'LLM 生成',
  search_enrichment: '搜索增强',
  webhook_publish: 'Webhook 发布',
  native_bilibili_publish: '原生 B 站发布',
};

const capabilityStatusLabelMap = {
  configured: '已就绪',
  inactive: '未启用',
  fallback_only: '仅回退',
  missing_inputs: '缺少配置',
  runtime_credentials_required: '凭证缺失',
  unsupported: '不支持',
};

function bindEnterKeyToClick(container, selectors, buttonSelector) {
  const button = container.querySelector(buttonSelector);
  selectors.forEach((selector) => {
    const input = container.querySelector(selector);
    input?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      if (!button.disabled) {
        button.click();
      }
    });
  });
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry ?? '').trim())
    .filter(Boolean);
}

function resolveGateState(value) {
  if (value === true) {
    return { label: '就绪', color: 'var(--success-color)' };
  }
  if (value === false) {
    return { label: '阻塞', color: 'var(--danger-color)' };
  }
  return { label: '未知', color: 'var(--warning-color)' };
}

function resolveCapabilitySummary(readinessData) {
  if (!readinessData || typeof readinessData !== 'object' || Array.isArray(readinessData)) return [];
  const matrix = readinessData.delivery_capabilities;
  if (!matrix || typeof matrix !== 'object' || Array.isArray(matrix)) return [];

  const rawEntries = Array.isArray(matrix.summary)
    ? matrix.summary
    : Array.isArray(matrix.capabilities)
      ? matrix.capabilities
      : [];

  return rawEntries
    .filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry))
    .map((entry) => {
      const record = entry;
      return {
        capability: String(record.capability ?? '').trim(),
        status: String(record.status ?? '').trim(),
        mode: String(record.mode ?? '').trim(),
        missing_inputs: normalizeStringList(record.missing_inputs),
      };
    })
    .filter((entry) => entry.capability);
}

function formatCapabilityIssueLine(entry) {
  const capabilityLabel = capabilityLabelMap[entry.capability] ?? entry.capability;
  const statusLabel = capabilityStatusLabelMap[entry.status] ?? (entry.status || '未知');
  const modeLabel = entry.mode ? `mode=${entry.mode}` : 'mode=unknown';
  const missing = entry.missing_inputs.length > 0 ? entry.missing_inputs.join(', ') : '未提供缺失项';
  return `${capabilityLabel} [${entry.capability}] (${statusLabel}, ${modeLabel}): ${missing}`;
}

export async function render(container) {
  let videoOffset = 0;

  container.innerHTML = `
    <div class="page-header">
      <h2>B站集成</h2>
      <button class="btn" id="bili-refresh"><svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新</button>
    </div>

    <!-- Status cards -->
    <div class="stat-grid" id="bili-status-cards">
      <div class="page-loading">加载中...</div>
    </div>

    <!-- Manual poll -->
    <div class="form-card" style="margin-top: 16px;">
      <h3>手动操作</h3>
      <button class="btn btn-primary" id="bili-poll-btn">触发轮询</button>
    </div>

    <!-- Videos -->
    <div class="section-card" style="margin-top: 16px;">
      <div class="section-card-header">
        <h3>视频监控</h3>
        <div class="form-group" style="margin:0;">
          <input type="text" id="bili-video-bvid" class="form-input" placeholder="输入 BVID" />
          <button class="btn btn-primary" id="bili-video-add">添加</button>
        </div>
      </div>
      <div class="filter-bar" style="padding: 0 16px 16px;">
        <div class="form-group">
          <label class="form-label">轮询状态</label>
          <select id="bili-video-poll-filter" class="form-input">
            <option value="">全部状态</option>
            <option value="true">仅轮询中</option>
            <option value="false">仅已停用</option>
          </select>
        </div>
        <div class="form-group">
          <button class="btn btn-primary" id="bili-video-filter-btn">查询</button>
        </div>
        <div class="form-group">
          <button class="btn" id="bili-video-prev">上一页</button>
        </div>
        <div class="form-group">
          <button class="btn" id="bili-video-next">下一页</button>
        </div>
      </div>
      <div class="form-hint" id="bili-video-summary" style="padding: 0 16px 16px;">加载中...</div>
      <div class="table-wrapper" id="bili-videos-wrapper">
        <div class="page-loading">加载中...</div>
      </div>
    </div>

    <!-- Credentials -->
    <div class="section-card" style="margin-top: 16px;">
      <div class="section-card-header"><h3>凭证管理</h3></div>
      <div class="form-card" style="border:none; box-shadow:none;">
        <div class="form-row">
          <div class="form-group"><label class="form-label">名称</label><input type="text" id="cred-name" class="form-input" /></div>
          <div class="form-group"><label class="form-label">SESSDATA</label><input type="text" id="cred-sessdata" class="form-input" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">bili_jct</label><input type="text" id="cred-bili-jct" class="form-input" /></div>
          <div class="form-group"><label class="form-label">buvid3</label><input type="text" id="cred-buvid3" class="form-input" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">buvid4</label><input type="text" id="cred-buvid4" class="form-input" /></div>
          <div class="form-group"><label class="form-label">过期时间</label><input type="datetime-local" id="cred-expires" class="form-input" /></div>
        </div>
        <button class="btn btn-primary" id="cred-add">添加凭证</button>
      </div>
      <div class="filter-bar" style="padding: 0 16px 16px;">
        <div class="form-group">
          <label class="form-label">激活状态</label>
          <select id="bili-cred-active-filter" class="form-input">
            <option value="">全部</option>
            <option value="active">仅激活</option>
            <option value="inactive">仅未激活</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">过期状态</label>
          <select id="bili-cred-expiry-filter" class="form-input">
            <option value="">全部</option>
            <option value="expired">已过期</option>
            <option value="expiring">即将过期</option>
            <option value="valid">有效期内</option>
            <option value="unset">未设置过期时间</option>
          </select>
        </div>
      </div>
      <div class="form-hint" id="bili-cred-summary" style="padding: 0 16px 16px;">加载中...</div>
      <div class="table-wrapper" id="bili-creds-wrapper">
        <div class="page-loading">加载中...</div>
      </div>
    </div>
  `;

  async function loadStatus() {
    const el = container.querySelector('#bili-status-cards');
    el.innerHTML = '<div class="page-loading">加载中...</div>';
    try {
      const [statusResult, readinessResult] = await Promise.allSettled([
        api.getBilibiliStatus(),
        api.getReadinessStatus(),
      ]);

      if (statusResult.status !== 'fulfilled') {
        throw statusResult.reason;
      }

      const data = statusResult.value;
      const readinessData =
        readinessResult.status === 'fulfilled'
        && readinessResult.value
        && typeof readinessResult.value === 'object'
        && !Array.isArray(readinessResult.value)
          ? readinessResult.value
          : null;
      const readinessError =
        readinessResult.status === 'rejected'
          ? getBilibiliErrorMessage(readinessResult.reason)
          : '';

      const totalVideoCount = Number(data?.video_count ?? 0);
      const pollEnabledCount = Number(data?.videos?.poll_enabled_count ?? 0);
      const disabledVideoCount = Math.max(0, totalVideoCount - pollEnabledCount);
      const videoSplit = formatBilibiliVideoSplit(totalVideoCount, pollEnabledCount);
      const pollCoverage = formatBilibiliCoverage(pollEnabledCount, totalVideoCount);
      const disabledVideoShare = formatBilibiliCoverage(disabledVideoCount, totalVideoCount, '停用占比');
      const diagnosticsReady = Boolean(data?.diagnostics?.ready);
      const blockingReasons = formatBilibiliBlockingReasons(data?.diagnostics?.blocking_reasons);
      const activeCredentialName = renderBilibiliCredentialName(data?.credential, '未配置活跃凭证');
      const credentialPresent = Boolean(
        data?.diagnostics?.signals?.credential_present
        ?? data?.diagnostics?.release_gates?.credential_present,
      );
      const credentialComplete = Boolean(
        data?.diagnostics?.signals?.credential_complete
        ?? data?.diagnostics?.release_gates?.credential_complete,
      );
      const credentialHealth = formatBilibiliCredentialHealth(credentialPresent, credentialComplete);
      const diagnosticHealth = formatBilibiliDiagnosticHealth(data?.diagnostics);
      const publishMode = formatBilibiliPublishMode(data?.diagnostics?.effective_publish_mode);
      const publishModeHealth = formatBilibiliPublishModeHealth(data?.diagnostics);
      const enabledHint = formatBilibiliToggleState(
        data?.enabled,
        'B 站集成已启用，可管理凭证与视频',
        'B 站集成已停用，当前不会触发轮询或发布',
      );
      const pollingHint = formatBilibiliToggleState(
        data?.polling_enabled,
        '评论轮询已启用，会按配置自动抓取评论',
        '评论轮询已停用，仅支持手动同步',
      );
      const publishHint = formatBilibiliToggleState(
        data?.publish_enabled,
        '发布链路已启用，满足条件后可进入发布流程',
        '发布链路已停用，不会进入自动发布流程',
      );
      const pollInterval = formatBilibiliPollInterval(data?.config?.poll_interval_seconds);
      const pollIntervalHint = formatBilibiliPollIntervalHint(data?.config?.poll_interval_seconds);
      const rateLimit = formatBilibiliRateLimit(data?.config?.rate_limit_per_minute);
      const rateLimitHint = formatBilibiliRateLimitHint(data?.config?.rate_limit_per_minute);
      const credentialExpiry = getBilibiliCredentialExpiryState(data?.credential?.expires_at);
      const credentialExpiryDetail = formatBilibiliCredentialExpiryHint(credentialExpiry, Boolean(data?.credential));
      const credentialUsage = getBilibiliCredentialUsageState(data?.credential);
      const foundationGate = resolveGateState(readinessData?.foundation_ready);
      const deliveryGate = resolveGateState(readinessData?.delivery_ready);
      const foundationBlockers = normalizeStringList(readinessData?.foundation_blockers);
      const deliveryBlockers = normalizeStringList(readinessData?.delivery_blockers);
      const capabilityBlockers = normalizeStringList(readinessData?.delivery_capability_blockers);
      const capabilitySummary = resolveCapabilitySummary(readinessData);
      const capabilityIssues = capabilitySummary.filter(
        (entry) => entry.status !== 'configured' && entry.status !== 'inactive',
      );
      const foundationBlockerText = foundationBlockers.length > 0 ? foundationBlockers.join(', ') : '无';
      const deliveryBlockerText = deliveryBlockers.length > 0 ? deliveryBlockers.join(', ') : '无';
      const capabilityBlockerText = capabilityBlockers.length > 0 ? capabilityBlockers.join(', ') : '无';
      const capabilityIssueText =
        capabilityIssues.length > 0
          ? capabilityIssues.map((entry) => formatCapabilityIssueLine(entry)).join('； ')
          : '无';

      el.innerHTML = `
        <div class="stat-card mini">
          <div class="stat-label">启用</div>
          <div class="stat-value">${data?.enabled ? '✅' : '❌'}</div>
          <div class="form-hint" style="margin-top:6px;">${escapeHtml(enabledHint)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询</div>
          <div class="stat-value">${data?.polling_enabled ? '✅' : '❌'}</div>
          <div class="form-hint" style="margin-top:6px;">${escapeHtml(pollingHint)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">发布</div>
          <div class="stat-value">${data?.publish_enabled ? '✅' : '❌'}</div>
          <div class="form-hint" style="margin-top:6px;">${escapeHtml(publishHint)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">视频数</div>
          <div class="stat-value">${totalVideoCount}</div>
          <div class="form-hint" style="margin-top:6px;">${escapeHtml(videoSplit)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询视频</div>
          <div class="stat-value">${pollEnabledCount}</div>
          <div class="form-hint" style="margin-top:6px;">${escapeHtml(pollCoverage)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">停用视频</div>
          <div class="stat-value">${disabledVideoCount}</div>
          <div class="form-hint" style="margin-top:6px;">${escapeHtml(disabledVideoShare)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">活跃凭证</div>
          <div class="stat-value">${activeCredentialName}</div>
          <div class="form-hint" style="margin-top:6px;">${escapeHtml(credentialHealth)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">诊断</div>
          <div class="stat-value" style="color:${diagnosticsReady ? 'var(--success-color)' : 'var(--danger-color)'}">${diagnosticsReady ? '就绪' : '阻塞'}</div>
          <div class="form-hint" style="margin-top:6px;">${escapeHtml(diagnosticHealth)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">基础就绪</div>
          <div class="stat-value" style="color:${foundationGate.color}">${foundationGate.label}</div>
          <div class="form-hint" style="margin-top:6px;">${escapeHtml(`blockers: ${foundationBlockerText}`)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">交付就绪</div>
          <div class="stat-value" style="color:${deliveryGate.color}">${deliveryGate.label}</div>
          <div class="form-hint" style="margin-top:6px;">${escapeHtml(`blockers: ${deliveryBlockerText}`)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">能力阻塞</div>
          <div class="stat-value" style="color:${capabilityBlockers.length > 0 ? 'var(--danger-color)' : 'var(--success-color)'}">${readinessData ? capabilityBlockers.length : 'N/A'}</div>
          <div class="form-hint" style="margin-top:6px;">${escapeHtml(`canonical: ${readinessData ? capabilityBlockerText : 'readiness_unavailable'}`)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">发布模式</div>
          <div class="stat-value">${escapeHtml(publishMode)}</div>
          <div class="form-hint" style="margin-top:6px;">${escapeHtml(publishModeHealth)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询间隔</div>
          <div class="stat-value">${escapeHtml(pollInterval)}</div>
          ${pollIntervalHint ? `<div class="form-hint" style="margin-top:6px;">${escapeHtml(pollIntervalHint)}</div>` : ''}
        </div>
        <div class="stat-card mini">
          <div class="stat-label">速率限制</div>
          <div class="stat-value">${escapeHtml(rateLimit)}</div>
          ${rateLimitHint ? `<div class="form-hint" style="margin-top:6px;">${escapeHtml(rateLimitHint)}</div>` : ''}
        </div>
        <div class="stat-card mini">
          <div class="stat-label">凭证过期</div>
          <div class="stat-value" style="font-size:14px; color:${getBilibiliCredentialExpiryColor(credentialExpiry)}">${escapeHtml(credentialExpiry.label)}</div>
          ${credentialExpiryDetail ? `<div class="form-hint" style="margin-top:6px;">${escapeHtml(credentialExpiryDetail)}</div>` : ''}
        </div>
        <div class="stat-card mini">
          <div class="stat-label">最近使用</div>
          <div class="stat-value" style="font-size:14px;">${escapeHtml(credentialUsage.label)}</div>
          ${credentialUsage.detail ? `<div class="form-hint" style="margin-top:6px;">${escapeHtml(credentialUsage.detail)}</div>` : ''}
        </div>
        ${blockingReasons ? `<div class="page-error" style="grid-column: 1 / -1; margin: 0;">当前阻塞原因: ${escapeHtml(blockingReasons)}</div>` : ''}
        ${readinessError ? `<div class="page-error" style="grid-column: 1 / -1; margin: 0;">Readiness 状态加载失败: ${escapeHtml(readinessError)}</div>` : ''}
        <div class="${capabilityIssues.length > 0 ? 'page-error' : 'form-hint'}" style="grid-column: 1 / -1; margin: 0;">
          关键缺失项: ${escapeHtml(capabilityIssueText)}
        </div>
      `;
    } catch (err) {
      el.innerHTML = `<div class="page-error">状态加载失败: ${escapeHtml(getBilibiliErrorMessage(err))}</div>`;
    }
  }

  async function loadVideos() {
    const wrapper = container.querySelector('#bili-videos-wrapper');
    const summaryEl = container.querySelector('#bili-video-summary');
    const filterBtn = container.querySelector('#bili-video-filter-btn');
    const filterEl = container.querySelector('#bili-video-poll-filter');
    const prevBtn = container.querySelector('#bili-video-prev');
    const nextBtn = container.querySelector('#bili-video-next');
    const filterValue = filterEl.value;
    summaryEl.textContent = '加载中...';
    wrapper.innerHTML = '<div class="page-loading">加载中...</div>';
    filterEl.disabled = true;
    filterBtn.disabled = true;
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    try {
      const data = await api.getBilibiliVideos({
        limit: bilibiliVideoPageSize,
        offset: videoOffset,
        poll_enabled: parseBilibiliPollFilter(filterValue),
      });
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      const total = Number(data?.total ?? items.length);
      if (items.length === 0 && total > 0 && videoOffset > 0) {
        videoOffset = Math.max(0, videoOffset - bilibiliVideoPageSize);
        await loadVideos();
        return;
      }
      summaryEl.textContent = formatBilibiliVideoSummary(
        total,
        items.length,
        filterValue,
        videoOffset,
        bilibiliVideoPageSize,
        items,
      );
      prevBtn.disabled = videoOffset <= 0;
      nextBtn.disabled = videoOffset + items.length >= total;

      if (items.length === 0) {
        wrapper.innerHTML = `<div class="table-empty">${escapeHtml(getBilibiliVideoEmptyMessage(filterValue))}</div>`;
        return;
      }

      wrapper.innerHTML = `
        <table class="data-table">
          <thead><tr><th>BVID</th><th>标题</th><th>轮询</th><th>评论数</th><th>最后轮询</th><th>轮询结果</th><th>操作</th></tr></thead>
          <tbody>
            ${items.map(v => `<tr data-id="${escapeHtml(v.id || v.video_id)}">
              <td class="cell-id">${renderBilibiliVideoIdentity(v)}</td>
              <td class="cell-truncate">${renderBilibiliVideoTitle(v)}</td>
              <td>${renderBilibiliVideoPollState(v)}</td>
              <td>${renderBilibiliVideoCommentCount(v)}</td>
              <td class="cell-time">${renderBilibiliLastPolledCell(v)}</td>
              <td>${renderBilibiliVideoPollResult(v)}</td>
              <td class="cell-actions">
                <button class="btn btn-sm bili-toggle-poll" data-id="${escapeHtml(v.id || v.video_id)}">${v.poll_enabled ? '禁用轮询' : '启用轮询'}</button>
                ${renderBilibiliSyncButton(v)}
                <button class="btn btn-sm btn-danger bili-delete" data-id="${escapeHtml(v.id || v.video_id)}">删除</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      `;

      wrapper.querySelectorAll('.bili-toggle-poll').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          try {
            await api.toggleBilibiliVideoPoll(btn.dataset.id);
            showToast('操作成功', 'success');
            await Promise.all([loadStatus(), loadVideos()]);
          } catch (err) { showToast(`失败: ${getBilibiliErrorMessage(err)}`, 'error'); }
          finally { btn.disabled = false; }
        });
      });

      wrapper.querySelectorAll('.bili-sync').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (btn.dataset.hasAid === 'false') {
            showToast(bilibiliPollErrorMessages.no_aid, 'warning');
            return;
          }
          const originalText = btn.textContent;
          btn.disabled = true;
          btn.textContent = '同步中...';
          try {
            const response = await api.syncBilibiliVideo(btn.dataset.id);
            showToast(formatBilibiliPollResultMessage(response?.result, { subject: '同步' }), 'success');
            await Promise.all([loadStatus(), loadVideos()]);
          } catch (err) { showToast(`同步失败: ${getBilibiliErrorMessage(err)}`, 'error'); }
          finally {
            btn.disabled = false;
            btn.textContent = originalText;
          }
        });
      });

      wrapper.querySelectorAll('.bili-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('确定删除此视频？')) return;
          btn.disabled = true;
          try {
            await api.deleteBilibiliVideo(btn.dataset.id);
            showToast('已删除', 'success');
            await Promise.all([loadStatus(), loadVideos()]);
          } catch (err) { showToast(`删除失败: ${getBilibiliErrorMessage(err)}`, 'error'); }
          finally { btn.disabled = false; }
        });
      });
    } catch (err) {
      summaryEl.textContent = '视频加载失败';
      wrapper.innerHTML = `<div class="page-error">加载失败: ${escapeHtml(getBilibiliErrorMessage(err))}</div>`;
    } finally {
      filterEl.disabled = false;
      filterBtn.disabled = false;
    }
  }

  async function loadCredentials() {
    const wrapper = container.querySelector('#bili-creds-wrapper');
    const summaryEl = container.querySelector('#bili-cred-summary');
    const activeFilterEl = container.querySelector('#bili-cred-active-filter');
    const expiryFilterEl = container.querySelector('#bili-cred-expiry-filter');
    const activeFilterValue = activeFilterEl.value;
    const expiryFilterValue = expiryFilterEl.value;
    summaryEl.textContent = '加载中...';
    wrapper.innerHTML = '<div class="page-loading">加载中...</div>';
    activeFilterEl.disabled = true;
    expiryFilterEl.disabled = true;
    try {
      const data = await api.getBilibiliCredentials();
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      const filteredItems = filterBilibiliCredentials(items, activeFilterValue, expiryFilterValue);
      summaryEl.textContent = formatBilibiliCredentialSummary(
        items,
        activeFilterValue,
        expiryFilterValue,
        filteredItems.length,
      );

      if (filteredItems.length === 0) {
        wrapper.innerHTML = `<div class="table-empty">${escapeHtml(getBilibiliCredentialEmptyMessage(activeFilterValue, expiryFilterValue))}</div>`;
        return;
      }

      wrapper.innerHTML = `
        <table class="data-table">
          <thead><tr><th>名称</th><th>凭证摘要</th><th>激活</th><th>过期状态</th><th>最近使用</th><th>操作</th></tr></thead>
          <tbody>
            ${filteredItems.map(c => `<tr data-id="${escapeHtml(c.id || c.credential_id)}">
              <td>${renderBilibiliCredentialName(c)}</td>
              <td class="cell-id">${renderBilibiliCredentialFingerprint(c)}</td>
              <td>${renderBilibiliCredentialActiveState(c)}</td>
              <td>${renderBilibiliCredentialExpiry(c.expires_at)}</td>
              <td class="cell-time">${renderBilibiliCredentialUsageCell(c)}</td>
              <td class="cell-actions">
                ${!(c.is_active || c.active) ? `<button class="btn btn-sm cred-activate" data-id="${escapeHtml(c.id || c.credential_id)}">激活</button>` : ''}
                <button class="btn btn-sm btn-danger cred-delete" data-id="${escapeHtml(c.id || c.credential_id)}">删除</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      `;

      wrapper.querySelectorAll('.cred-activate').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          try {
            await api.activateBilibiliCredential(btn.dataset.id);
            showToast('已激活', 'success');
            await Promise.all([loadStatus(), loadCredentials()]);
          } catch (err) { showToast(`激活失败: ${getBilibiliErrorMessage(err)}`, 'error'); }
          finally { btn.disabled = false; }
        });
      });

      wrapper.querySelectorAll('.cred-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('确定删除此凭证？')) return;
          btn.disabled = true;
          try {
            await api.deleteBilibiliCredential(btn.dataset.id);
            showToast('已删除', 'success');
            await Promise.all([loadStatus(), loadCredentials()]);
          } catch (err) { showToast(`删除失败: ${getBilibiliErrorMessage(err)}`, 'error'); }
          finally { btn.disabled = false; }
        });
      });
    } catch (err) {
      summaryEl.textContent = '凭证加载失败';
      wrapper.innerHTML = `<div class="page-error">加载失败: ${escapeHtml(getBilibiliErrorMessage(err))}</div>`;
    } finally {
      activeFilterEl.disabled = false;
      expiryFilterEl.disabled = false;
    }
  }

  // Add video
  container.querySelector('#bili-video-add').addEventListener('click', async () => {
    const btn = container.querySelector('#bili-video-add');
    const bvid = container.querySelector('#bili-video-bvid').value.trim();
    const validationError = validateBilibiliVideoInput(bvid);
    if (validationError) {
      showToast(getBilibiliErrorMessage(validationError), 'warning');
      return;
    }
    btn.disabled = true;
    btn.textContent = '添加中...';
    try {
      await api.addBilibiliVideo(bvid);
      showToast('添加成功', 'success');
      container.querySelector('#bili-video-bvid').value = '';
      await Promise.all([loadStatus(), loadVideos()]);
    } catch (err) { showToast(`添加失败: ${getBilibiliErrorMessage(err)}`, 'error'); }
    finally {
      btn.disabled = false;
      btn.textContent = '添加';
    }
  });

  // Add credential
  container.querySelector('#cred-add').addEventListener('click', async () => {
    const btn = container.querySelector('#cred-add');
    const expiresAt = normalizeOptionalDateTimeValue(container.querySelector('#cred-expires').value);
    const payload = {
      name: container.querySelector('#cred-name').value.trim(),
      sessdata: container.querySelector('#cred-sessdata').value.trim(),
      bili_jct: container.querySelector('#cred-bili-jct').value.trim(),
      buvid3: container.querySelector('#cred-buvid3').value.trim(),
      buvid4: container.querySelector('#cred-buvid4').value.trim(),
      expires_at: expiresAt,
    };
    const validationError = validateBilibiliCredentialInput(payload);
    if (validationError) {
      showToast(getBilibiliErrorMessage(validationError), 'warning');
      return;
    }
    btn.disabled = true;
    btn.textContent = '添加中...';
    try {
      const response = await api.addBilibiliCredential(payload);
      showToast(response?.item?.is_active ? '凭证添加成功，已自动激活' : '凭证添加成功', 'success');
      container.querySelector('#cred-name').value = '';
      container.querySelector('#cred-sessdata').value = '';
      container.querySelector('#cred-bili-jct').value = '';
      container.querySelector('#cred-buvid3').value = '';
      container.querySelector('#cred-buvid4').value = '';
      container.querySelector('#cred-expires').value = '';
      await Promise.all([loadStatus(), loadCredentials()]);
    } catch (err) { showToast(`添加失败: ${getBilibiliErrorMessage(err)}`, 'error'); }
    finally {
      btn.disabled = false;
      btn.textContent = '添加凭证';
    }
  });

  // Manual poll
  container.querySelector('#bili-poll-btn').addEventListener('click', async () => {
    const btn = container.querySelector('#bili-poll-btn');
    btn.disabled = true;
    btn.textContent = '轮询中...';
    try {
      const response = await api.triggerBilibiliPoll();
      showToast(formatBilibiliPollResultMessage(response?.result), 'success');
      await Promise.all([loadStatus(), loadVideos()]);
    } catch (err) { showToast(`轮询失败: ${getBilibiliErrorMessage(err)}`, 'error'); }
    finally { btn.disabled = false; btn.textContent = '触发轮询'; }
  });

  // Refresh all
  container.querySelector('#bili-refresh').addEventListener('click', async () => {
    const btn = container.querySelector('#bili-refresh');
    btn.disabled = true;
    btn.textContent = '刷新中...';
    try {
      await Promise.all([loadStatus(), loadVideos(), loadCredentials()]);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<svg width="14" height="14"><use href="#icon-refresh"></use></svg> 刷新';
    }
  });
  container.querySelector('#bili-video-filter-btn').addEventListener('click', () => {
    videoOffset = 0;
    loadVideos();
  });
  container.querySelector('#bili-video-poll-filter').addEventListener('change', () => {
    videoOffset = 0;
    loadVideos();
  });
  container.querySelector('#bili-video-prev').addEventListener('click', () => {
    if (videoOffset <= 0) return;
    videoOffset = Math.max(0, videoOffset - bilibiliVideoPageSize);
    loadVideos();
  });
  container.querySelector('#bili-video-next').addEventListener('click', () => {
    videoOffset += bilibiliVideoPageSize;
    loadVideos();
  });
  container.querySelector('#bili-cred-active-filter').addEventListener('change', loadCredentials);
  container.querySelector('#bili-cred-expiry-filter').addEventListener('change', loadCredentials);
  bindEnterKeyToClick(container, ['#bili-video-bvid'], '#bili-video-add');
  bindEnterKeyToClick(
    container,
    ['#cred-name', '#cred-sessdata', '#cred-bili-jct', '#cred-buvid3', '#cred-buvid4', '#cred-expires'],
    '#cred-add',
  );

  await Promise.all([loadStatus(), loadVideos(), loadCredentials()]);
}
