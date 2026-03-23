function canApprove(status) {
  return ['manual_queue', 'blocked', 'dedupe_skipped'].includes(status);
}

function getApiKey() {
  const params = new URLSearchParams(window.location.search);
  return params.get('api_key') || '';
}

function withApiKey(path) {
  const key = getApiKey();
  if (!key) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}api_key=${encodeURIComponent(key)}`;
}

let autoRefreshTimer = null;
let fullRefreshRunning = false;
let pendingFullRefresh = false;
let selectedJobIdSet = new Set();
let singleApproveRunning = false;
let singleRetryRunning = false;
let batchApproveRunning = false;
let batchRetryRunning = false;
let lastRefreshErrorDetail = '';
let lastBusyToastAt = 0;
let toastHideDeadline = 0;
const TOAST_HIDE_MS = 4500;
const PREF_KEY = 'bili_pet_admin_ui_prefs_v1';
const PREF_VERSION = 1;
const PUBLISHER_MODE = window.__PUBLISHER_MODE__ || 'manual_queue';
let roleCardItems = [];
let roleCardCurrentKey = '';

function normalizePrefs(raw) {
  const parsed = raw && typeof raw === 'object' ? raw : {};

  return {
    version: PREF_VERSION,
    autoRefreshEnabled: !!parsed.autoRefreshEnabled,
    autoRefreshSeconds: getAutoRefreshSeconds(parsed.autoRefreshSeconds),
    dailySimple: !!parsed.dailySimple,
    singleRetryAutoResetForce: parsed.singleRetryAutoResetForce !== false,
  };
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return normalizePrefs({});
    return normalizePrefs(JSON.parse(raw) || {});
  } catch (error) {
    return normalizePrefs({});
  }
}

function savePrefs(partial) {
  const current = loadPrefs();
  const next = normalizePrefs({ ...current, ...partial, version: PREF_VERSION });
  localStorage.setItem(PREF_KEY, JSON.stringify(next));
  renderPrefsSnapshot(next);
}

function renderPrefsSnapshot(prefs) {
  if (!prefsSnapshotEl) return;
  prefsSnapshotEl.textContent = JSON.stringify(prefs || loadPrefs(), null, 2);
}

function resetUiPrefs() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  if (!confirm('确定要重置所有页面偏好设置吗？(包括自动刷新频率、简版视图等)')) return;

  stopAutoRefresh();
  localStorage.removeItem(PREF_KEY);

  const defaults = loadPrefs();
  if (autoRefreshInput) autoRefreshInput.checked = !!defaults.autoRefreshEnabled;
  if (autoRefreshSecondsInput) {
    autoRefreshSecondsInput.value = String(getAutoRefreshSeconds(defaults.autoRefreshSeconds));
    autoRefreshSecondsInput.disabled = !!defaults.autoRefreshEnabled;
  }
  if (dailySimpleInput) dailySimpleInput.checked = !!defaults.dailySimple;
  if (singleRetryAutoResetForceInput) singleRetryAutoResetForceInput.checked = defaults.singleRetryAutoResetForce !== false;
  renderPrefsSnapshot(defaults);

  queueFullRefresh();
}

function exportUiPrefs() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  const blob = new Blob([JSON.stringify(loadPrefs(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bili-pet-admin-prefs-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function triggerImportUiPrefs() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  if (uiPrefsFileInput) uiPrefsFileInput.value = '';
  uiPrefsFileInput?.click();
}

function importUiPrefsFromFile(event) {
  const input = event?.target ?? uiPrefsFileInput;
  const resetInput = () => {
    if (input) input.value = '';
  };
  if (isGlobalRefreshLocked()) {
    resetInput();
    showBusyToast();
    return;
  }
  const file = input?.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    if (isGlobalRefreshLocked()) {
      resetInput();
      showBusyToast();
      return;
    }
    try {
      const raw = String(reader.result || '{}');
      const parsed = JSON.parse(raw);
      const merged = normalizePrefs(parsed);
      localStorage.setItem(PREF_KEY, JSON.stringify(merged));
      resetInput();
      window.location.reload();
    } catch (error) {
      showToast('导入偏好失败', 'JSON 无效或格式不正确');
      resetInput();
    }
  };
  reader.onerror = () => {
    showToast('导入偏好失败', '读取文件失败');
    resetInput();
  };
  reader.readAsText(file);
}

function setRefreshStatus(text, tone = 'idle') {
  if (!refreshStatusEl) return;
  refreshStatusEl.textContent = text;
  refreshStatusEl.classList.remove('status-idle', 'status-loading', 'status-success', 'status-error', 'status-partial');
  if (tone === 'loading') {
    refreshStatusEl.classList.add('status-loading');
  } else if (tone === 'success') {
    refreshStatusEl.classList.add('status-success');
  } else if (tone === 'error') {
    refreshStatusEl.classList.add('status-error');
  } else if (tone === 'partial') {
    refreshStatusEl.classList.add('status-partial');
  } else {
    refreshStatusEl.classList.add('status-idle');
  }
}

function nowLabel() {
  return new Date().toLocaleTimeString();
}

function markDetailQueryTime(metaEl, prefix = '上次查询') {
  if (!metaEl) return;
  metaEl.textContent = `${prefix}: ${nowLabel()}`;
}

function markDetailQueryError(metaEl, reason) {
  if (!metaEl) return;
  const text = String(reason || '请求失败').trim();
  metaEl.textContent = `上次失败: ${nowLabel()} (${text.slice(0, 120)})`;
}

function getErrorText(error, fallback = '请求失败') {
  if (!error) return fallback;
  if (typeof error === 'string') return error || fallback;
  if (typeof error === 'object') {
    const detail = error.detail;
    if (typeof detail === 'string') return detail;
    if (detail && typeof detail === 'object') return JSON.stringify(detail, null, 2);
    if (typeof error.message === 'string') return error.message;
  }
  return String(error) || fallback;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatIsoDateTime(isoString) {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return isoString;
  }
}

function timeAgo(isoString) {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    if (isNaN(seconds)) return isoString;
    if (seconds < 5) return '刚刚';
    if (seconds < 60) return `${seconds}秒前`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  } catch {
    return isoString;
  }
}

function renderTimestamp(isoString) {
  if (!isoString) return '-';
  return `<span title="${formatIsoDateTime(isoString)}" style="cursor: help; border-bottom: 1px dotted var(--muted);">${timeAgo(isoString)}</span>`;
}

function renderStatusBadge(status) {
  const value = String(status || 'unknown');
  let cls = 'status-badge status-badge-neutral';
  if (value === 'published') {
    cls = 'status-badge status-badge-published';
  } else if (value === 'manual_queue' || value === 'dedupe_skipped') {
    cls = 'status-badge status-badge-manual';
  } else if (value === 'blocked') {
    cls = 'status-badge status-badge-blocked';
  }
  return `<span class="${cls} clickable" onclick="filterJobsByStatus('${escapeHtml(value)}')" title="点击筛选 ${escapeHtml(value)} 状态">${escapeHtml(value)}</span>`;
}

function filterJobsByStatus(status) {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  if (!jobsStatusInput) return;
  
  // Find valid option
  const options = Array.from(jobsStatusInput.options).map(o => o.value);
  if (options.includes(status)) {
    jobsStatusInput.value = status;
  } else if (['manual_queue', 'blocked', 'dedupe_skipped'].includes(status)) {
    // These often go together in the mind but the filter is specific
    jobsStatusInput.value = status;
  } else {
    return;
  }
  
  refreshJobs();
  // Scroll up to Jobs section to see results if needed
  const section = document.getElementById('section-jobs');
  if (section) section.scrollIntoView({ behavior: 'smooth' });
}

function safeCount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : '0';
}

function safeCountNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getClampedInt(value, min, max, fallback) {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function getAutoRefreshSeconds(value) {
  return getClampedInt(value, 3, 300, 15);
}

function applyPublisherModeStatus(mode) {
  const normalized = String(mode || '').trim();
  if (publisherModeCurrentEl) {
    publisherModeCurrentEl.textContent = `当前发布模式: ${normalized || '-'}`;
  }

  const chips = [
    modeChipManual,
    modeChipSimulated,
    modeChipWebhook,
    modeChipRealPublish,
  ];
  for (const chip of chips) {
    chip?.classList.remove('mode-chip-active');
  }

  if (normalized === 'manual_queue') {
    modeChipManual?.classList.add('mode-chip-active');
  } else if (normalized === 'simulated') {
    modeChipSimulated?.classList.add('mode-chip-active');
  } else if (normalized === 'webhook') {
    modeChipWebhook?.classList.add('mode-chip-active');
  } else if (normalized === 'real_publish') {
    modeChipRealPublish?.classList.add('mode-chip-active');
  }
}

async function readApiPayload(res) {
  const raw = await res.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    return { ok: false, detail: raw };
  }
}

function getToastToneByTitle(title) {
  const text = String(title || '');
  if (text.includes('失败') || text.includes('错误')) return 'error';
  if (text.includes('成功') || text.includes('完成')) return 'success';
  return 'info';
}

function showToast(title, content, options = {}) {
  if (!toastEl || !toastTitleEl || !toastContentEl || !toastCopyBtn) return;

  const text = content || '';
  toastTitleEl.textContent = title || '提示';
  toastContentEl.textContent = text;
  window.__toastCopyContent = text;
  toastCopyBtn.style.display = options.copyable ? '' : 'none';

  const tone = options.tone || getToastToneByTitle(title);
  toastEl.classList.remove('toast-info', 'toast-success', 'toast-error');
  if (tone === 'success') {
    toastEl.classList.add('toast-success');
  } else if (tone === 'error') {
    toastEl.classList.add('toast-error');
  } else {
    toastEl.classList.add('toast-info');
  }

  toastEl.classList.add('show');

  pauseToastAutoHide();
  const hideAfter = Number(options.durationMs || TOAST_HIDE_MS);
  if (hideAfter > 0) {
    toastHideDeadline = Date.now() + hideAfter;
    window.__toastTimer = setTimeout(hideToast, hideAfter);
  } else {
    toastHideDeadline = 0;
  }
}

function hideToast(event) {
  if (event) event.stopPropagation();
  pauseToastAutoHide();
  toastHideDeadline = 0;
  if (!toastEl) return;
  toastEl.classList.remove('show');
  window.__toastCopyContent = '';
}

function pauseToastAutoHide() {
  if (!window.__toastTimer) return;
  clearTimeout(window.__toastTimer);
  window.__toastTimer = null;
}

function resumeToastAutoHide() {
  if (!toastEl || !toastEl.classList.contains('show')) return;
  if (!toastHideDeadline) return;
  const remaining = toastHideDeadline - Date.now();
  if (remaining <= 0) {
    hideToast();
    return;
  }
  window.__toastTimer = setTimeout(hideToast, remaining);
}

async function copyText(text, label = '内容', btn = null) {
  if (!text) return;
  
  const originalText = btn ? btn.textContent : null;
  const showFeedback = () => {
    if (btn) {
      btn.textContent = 'Copied!';
      btn.classList.add('btn-accent');
      setTimeout(() => {
        btn.textContent = originalText;
        btn.classList.remove('btn-accent');
      }, 1200);
    }
  };

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(String(text));
      showToast('复制成功', `${label}已复制到剪贴板`, { tone: 'success' });
      showFeedback();
      return;
    }
  } catch (error) {}
  
  const area = document.createElement('textarea');
  area.value = String(text);
  area.style.position = 'fixed';
  area.style.left = '-9999px';
  document.body.appendChild(area);
  area.focus();
  area.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(area);
  if (ok) {
    showToast('复制成功', `${label}已复制到剪贴板`, { tone: 'success' });
    showFeedback();
  } else {
    showToast('复制失败', '浏览器不支持复制');
  }
}

function renderIdCell(id, label = 'ID') {
  const safeId = escapeHtml(String(id));
  return `
    <div style="display: flex; align-items: center; gap: 4px;">
      <span class="mono">${safeId}</span>
      <button class="btn-ghost btn-sm" style="min-height: 24px; padding: 2px 6px; font-size: 10px; flex-shrink: 0;" onclick="copyText('${safeId}', '${label}', this)" title="复制 ${label}">Copy</button>
    </div>
  `;
}

async function copyToastContent(event) {
  event.stopPropagation();
  const text = String(window.__toastCopyContent || '');
  if (!text) {
    showToast('复制失败', '没有可复制的内容');
    return;
  }

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      showToast('复制成功', '错误详情已复制到剪贴板');
      return;
    }
  } catch (error) {
    // fallback below
  }

  const area = document.createElement('textarea');
  area.value = text;
  area.style.position = 'fixed';
  area.style.left = '-9999px';
  document.body.appendChild(area);
  area.focus();
  area.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(area);
  showToast(ok ? '复制成功' : '复制失败', ok ? '错误详情已复制到剪贴板' : '浏览器不支持复制，请手动复制');
}

function showRefreshErrorDetail() {
  if (!lastRefreshErrorDetail) {
    showToast('刷新详情', '暂无错误详情');
    return;
  }
  showToast('刷新失败详情', lastRefreshErrorDetail, { copyable: true, tone: 'error', durationMs: 0 });
}

function isEditableTarget(target) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target?.isContentEditable
  );
}

function closeHelpPanel() {
  if (!helpPanelEl) return;
  helpPanelEl.style.display = 'none';
}

function toggleHelpPanel() {
  if (!helpPanelEl) return;
  helpPanelEl.style.display = helpPanelEl.style.display === 'none' || !helpPanelEl.style.display ? 'block' : 'none';
}

async function runFullRefresh() {
  if (singleApproveRunning || batchApproveRunning || batchRetryRunning) {
    pendingFullRefresh = true;
    return;
  }
  if (fullRefreshRunning) {
    pendingFullRefresh = true;
    return;
  }

  fullRefreshRunning = true;
  setInlineButtonLoading(fullRefreshBtn, true, '刷新中...');
  updateBatchActionState();
  lastRefreshErrorDetail = '';
  setRefreshStatus('状态: 刷新中...', 'loading');

  const steps = [
    { label: 'overview', run: loadOverview },
    { label: 'role_cards', run: loadRoleCards },
    { label: 'knowledge', run: loadKnowledgeEntries },
    { label: 'b站状态', run: refreshBilibiliStatus },
    { label: 'b站视频', run: refreshBilibiliVideos },
    { label: 'b站凭证', run: refreshBilibiliCredentials },
    { label: 'gateway_logs', run: loadGatewayLogs },
    { label: 'daily_metrics', run: loadDailyMetrics },
    { label: 'jobs', run: loadJobs },
    { label: 'audit_summary', run: loadAuditSummary },
    { label: 'audit_logs', run: loadAuditLogs },
  ];

  const failures = [];
  try {
    for (const step of steps) {
      try {
        await step.run();
      } catch (error) {
        failures.push({ label: step.label, error: getErrorText(error, 'unknown_error') });
      }
    }

    if (!failures.length) {
      setRefreshStatus(`状态: 成功 @ ${nowLabel()}`, 'success');
      return;
    }

    const summary = failures.map(item => `${item.label}: ${item.error}`).join('\n');
    lastRefreshErrorDetail = summary;
    const tone = failures.length === steps.length ? 'error' : 'partial';
    const prefix = failures.length === steps.length ? '状态: 失败' : '状态: 部分失败';
    setRefreshStatus(`${prefix} @ ${nowLabel()} (${failures.length}/${steps.length})`, tone);
    showToast(prefix, summary, { copyable: true, tone: 'error', durationMs: 0 });
  } finally {
    setInlineButtonLoading(fullRefreshBtn, false);
    fullRefreshRunning = false;
    updateBatchActionState();
    if (pendingFullRefresh) { pendingFullRefresh = false; queueFullRefresh(); }
  }
}

function queueFullRefresh(options = {}) {
  const silent = !!options.silent;
  if (!silent && isGlobalRefreshLocked()) updateBatchActionState();
  if (singleApproveRunning) {
    if (!pendingFullRefresh && !silent) {
      setRefreshStatus('状态: 单条审批处理中，刷新已排队', 'loading');
      showToast('刷新已排队', '当前有单条审批正在执行，结束后会自动刷新');
    }
    pendingFullRefresh = true;
    return;
  }
  if (batchApproveRunning || batchRetryRunning) {
    if (!pendingFullRefresh && !silent) {
      setRefreshStatus('状态: 批量处理中，刷新已排队', 'loading');
      showToast('刷新已排队', '当前批量任务执行中，结束后会自动刷新');
    }
    pendingFullRefresh = true;
    return;
  }
  if (fullRefreshRunning) {
    if (!pendingFullRefresh && !silent) {
      setRefreshStatus('状态: 刷新进行中，下一次已排队', 'loading');
      showToast('刷新已排队', '当前正在刷新，完成后会自动再刷新一次');
    }
    pendingFullRefresh = true;
    return;
  }
  runFullRefresh();
}

function stopAutoRefresh() {
  if (!autoRefreshTimer) return;
  clearInterval(autoRefreshTimer);
  autoRefreshTimer = null;
}

function onAutoRefreshSecondsChange() {
  if (isGlobalRefreshLocked()) {
    if (autoRefreshSecondsInput) autoRefreshSecondsInput.value = String(getAutoRefreshSeconds(loadPrefs().autoRefreshSeconds));
    showBusyToast();
    return;
  }
  const seconds = getClampedInt(autoRefreshSecondsInput?.value, 3, 300, 15);
  if (autoRefreshSecondsInput) autoRefreshSecondsInput.value = String(seconds);
  savePrefs({ autoRefreshSeconds: seconds });

  if (autoRefreshInput?.checked) toggleAutoRefresh();
}

function onDailySimpleChange() {
  if (isGlobalRefreshLocked()) {
    if (dailySimpleInput) dailySimpleInput.checked = !!loadPrefs().dailySimple;
    showBusyToast();
    return;
  }
  savePrefs({ dailySimple: !!dailySimpleInput?.checked });
  refreshDailyMetrics();
}

function onSingleRetryAutoResetForceChange() {
  if (isGlobalRefreshLocked()) {
    if (singleRetryAutoResetForceInput) {
      singleRetryAutoResetForceInput.checked = loadPrefs().singleRetryAutoResetForce !== false;
    }
    showBusyToast();
    return;
  }
  savePrefs({ singleRetryAutoResetForce: !!singleRetryAutoResetForceInput?.checked });
}

function toggleAutoRefresh() {
  if (isGlobalRefreshLocked()) {
    const prefs = loadPrefs();
    if (autoRefreshInput) autoRefreshInput.checked = !!prefs.autoRefreshEnabled;
    if (autoRefreshSecondsInput) {
      autoRefreshSecondsInput.value = String(getAutoRefreshSeconds(prefs.autoRefreshSeconds));
      autoRefreshSecondsInput.disabled = !!prefs.autoRefreshEnabled;
    }
    showBusyToast();
    return;
  }

  const enabled = !!autoRefreshInput?.checked;
  if (autoRefreshSecondsInput) autoRefreshSecondsInput.disabled = enabled;
  savePrefs({ autoRefreshEnabled: enabled });

  stopAutoRefresh();
  if (!enabled) return;

  queueFullRefresh({ silent: true });
  const seconds = getClampedInt(autoRefreshSecondsInput?.value, 3, 300, 15);
  if (autoRefreshSecondsInput) autoRefreshSecondsInput.value = String(seconds);
  autoRefreshTimer = setInterval(() => {
    queueFullRefresh({ silent: true });
  }, seconds * 1000);
}

async function loadOverview() {
  const res = await fetch(withApiKey('/api/admin/overview'));
  const data = await readApiPayload(res);
  if (!res.ok || !data.ok) throw new Error(getErrorText(data, '加载概览失败'));

  const totals = data.totals || {};
  const byStatus = data.by_status || {};
  const manualCount =
    safeCountNumber(byStatus.manual_queue) +
    safeCountNumber(byStatus.blocked) +
    safeCountNumber(byStatus.dedupe_skipped);

  if (cardComments) cardComments.textContent = safeCount(totals.comments);
  if (cardJobs) cardJobs.textContent = safeCount(totals.jobs);
  if (cardPublished) cardPublished.textContent = safeCount(byStatus.published);
  if (cardManual) cardManual.textContent = String(manualCount);
}

function isGlobalRefreshLocked() {
  return fullRefreshRunning || singleApproveRunning || singleRetryRunning || batchApproveRunning || batchRetryRunning;
}

function showBusyToast() {
  updateBatchActionState();
  const now = Date.now();
  if (now - lastBusyToastAt < 1200) return;
  lastBusyToastAt = now;
  showToast('操作进行中', '当前正在执行全量刷新或批量任务，请稍后再试');
}

async function refreshDailyMetrics() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  setInlineButtonLoading(dailyRefreshBtn, true, '刷新中...');
  try {
    await loadDailyMetrics();
    showToast('趋势刷新完成', '已更新趋势数据', { tone: 'success' });
  } catch (error) {
    showToast('趋势刷新失败', getErrorText(error, '加载趋势失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(dailyRefreshBtn, false);
    updateBatchActionState();
  }
}

async function loadDailyMetrics() {
  const days = getClampedInt(dailyDaysInput?.value, 1, 60, 7);
  if (dailyDaysInput) dailyDaysInput.value = String(days);
  const simple = !!dailySimpleInput?.checked;
  const res = await fetch(withApiKey(`/api/metrics/daily?days=${encodeURIComponent(days)}`));
  const data = await readApiPayload(res);
  if (!dailyMetricsBody) throw new Error('daily_metrics_table_not_found');
  if (dailyHeadFull && dailyHeadSimple) {
    dailyHeadFull.style.display = simple ? 'none' : '';
    dailyHeadSimple.style.display = simple ? '' : 'none';
  }
  dailyMetricsBody.innerHTML = '';

  if (!res.ok || !data.ok) throw new Error(getErrorText(data, '加载趋势失败'));

  for (const item of (data.items || [])) {
    const tr = document.createElement('tr');
    if (simple) {
      tr.innerHTML = `
        <td class=\"mono\">${escapeHtml(item.date)}</td>
        <td>${safeCount(item.published)}</td>
        <td>${safeCount(item.manual_queue)}</td>
      `;
    } else {
      tr.innerHTML = `
        <td class=\"mono\">${escapeHtml(item.date)}</td>
        <td>${safeCount(item.total)}</td>
        <td>${safeCount(item.published)}</td>
        <td>${safeCount(item.manual_queue)}</td>
        <td>${safeCount(item.blocked)}</td>
        <td>${safeCount(item.dedupe_skipped)}</td>
        <td>${safeCount(item.skipped)}</td>
      `;
    }
    dailyMetricsBody.appendChild(tr);
  }
}

async function refreshJobs() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  setInlineButtonLoading(jobsRefreshBtn, true, '刷新中...');
  try {
    await loadJobs();
    showToast('任务刷新完成', '已更新任务列表', { tone: 'success' });
  } catch (error) {
    showToast('任务刷新失败', getErrorText(error, '加载任务失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(jobsRefreshBtn, false);
    updateBatchActionState();
  }
}

async function loadJobs() {
  const status = jobsStatusInput?.value || '';
  const limit = getClampedInt(jobsLimitInput?.value, 1, 200, 30);
  if (jobsLimitInput) jobsLimitInput.value = String(limit);
  const qs = new URLSearchParams({ limit: String(limit) });
  if (status) qs.set('status', status);
  const res = await fetch(withApiKey('/api/admin/jobs?' + qs.toString()));
  const data = await readApiPayload(res);
  if (!jobsTableBody) throw new Error('jobs_table_not_found');
  jobsTableBody.innerHTML = '';
  if (jobsCheckAll) {
    jobsCheckAll.checked = false;
    jobsCheckAll.indeterminate = false;
  }

  if (!res.ok || !data.ok) {
    selectedJobIdSet = new Set();
    updateBatchActionState();
    throw new Error(getErrorText(data, '加载任务失败'));
  }

  const visibleJobIds = new Set();
  const locked = isGlobalRefreshLocked();
  const items = data.items || [];

  if (items.length === 0) {
    jobsTableBody.innerHTML = '<tr><td colspan="8" class="text-center">暂无任务数据</td></tr>';
  }

  for (const item of items) {
    const jobId = Number(item.id);
    if (!Number.isFinite(jobId)) continue;
    visibleJobIds.add(jobId);
    const tr = document.createElement('tr');
    const allow = canApprove(item.status);
    tr.innerHTML = `
      <td><input type=\"checkbox\" class=\"job-check\" value=\"${jobId}\" ${selectedJobIdSet.has(jobId) ? 'checked' : ''}></td>
      <td>${renderIdCell(jobId, '任务ID')}</td>
      <td>${renderStatusBadge(item.status)}</td>
      <td>${renderIdCell(item.comment_id, '评论ID')}</td>
      <td class=\"comment-box\">${escapeHtml(item.comment_content)}</td>
      <td><textarea id=\"reply-${jobId}\" ${locked ? 'disabled' : ''}>${escapeHtml(item.reply_text)}</textarea></td>
      <td>${renderRiskFlags(item.risk_flags)}</td>
      <td>${allow ? `<button class=\"approve-btn\" onclick=\"approveJob(${jobId}, this)\" ${locked ? 'disabled' : ''}>Approve</button>` : '-'}</td>
    `;
    jobsTableBody.appendChild(tr);
  }

  selectedJobIdSet = new Set(Array.from(selectedJobIdSet).filter(id => visibleJobIds.has(id)));

  jobsTableBody.querySelectorAll('.job-check').forEach((el) => {
    el.addEventListener('change', onJobCheckChanged);
  });
  updateBatchActionState();
}

function quickQueryCommentFromResult(commentId) {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  const value = String(commentId || '').trim();
  if (!value) return;
  if (commentDetailIdInput) commentDetailIdInput.value = value;
  queryCommentDetail();
}

function quickQueryJobFromResult(jobId) {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  const value = Number(jobId);
  if (!Number.isFinite(value) || value <= 0) return;
  if (jobDetailIdInput) jobDetailIdInput.value = String(value);
  if (singleRetryJobIdInput) singleRetryJobIdInput.value = String(value);
  queryJobDetail();
}

function retryJobFromDetail(jobId) {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  const value = Number(jobId);
  if (!Number.isFinite(value) || value <= 0) return;
  if (singleRetryJobIdInput) singleRetryJobIdInput.value = String(value);
  if (jobDetailIdInput) jobDetailIdInput.value = String(value);
  retrySingleJob();
}

function clearCommentDetailResult() {
  if (commentDetailResultEl) commentDetailResultEl.textContent = '未查询评论详情';
  if (commentDetailMetaEl) commentDetailMetaEl.textContent = '上次查询: -';
  if (commentDetailIdInput) commentDetailIdInput.value = '';
}

function clearJobDetailResult() {
  if (jobDetailResultEl) jobDetailResultEl.textContent = '未查询任务详情';
  if (jobDetailMetaEl) jobDetailMetaEl.textContent = '上次查询: -';
  if (jobDetailIdInput) jobDetailIdInput.value = '';
}

function renderCommentDetailResult(data) {
  if (!commentDetailResultEl) return;
  const comment = data?.comment;
  if (!comment) {
    commentDetailResultEl.textContent = '未查询评论详情';
    return;
  }

  const jobs = Array.isArray(data.jobs) ? data.jobs : [];
  const firstJobId = Number(jobs[0]?.id);
  if (Number.isFinite(firstJobId) && firstJobId > 0) {
    if (jobDetailIdInput) jobDetailIdInput.value = String(firstJobId);
    if (singleRetryJobIdInput) singleRetryJobIdInput.value = String(firstJobId);
  } else {
    if (jobDetailIdInput) jobDetailIdInput.value = '';
    if (singleRetryJobIdInput) singleRetryJobIdInput.value = '';
  }

  const jobsHtml = jobs.length
    ? jobs.map((item) => `
      <tr>
        <td class="mono">${escapeHtml(item.id)}</td>
        <td>${renderStatusBadge(item.status)}</td>
        <td class="comment-box">${escapeHtml(item.reply_text || '')}</td>
        <td>
          <button class="detail-action-btn" onclick="quickQueryJobFromResult(${Number(item.id)})">查询</button>
          <button class="detail-action-btn" onclick="retryJobFromDetail(${Number(item.id)})">重试</button>
        </td>
      </tr>
    `).join('')
    : '<tr><td colspan="4" class="mono">该评论暂无关联任务</td></tr>';

  commentDetailResultEl.innerHTML = `
    <div class="mono">comment_id: ${escapeHtml(comment.comment_id || '')}</div>
    <div class="mono">video_id: ${escapeHtml(comment.video_id || '')}</div>
    <div class="mono">user_id: ${escapeHtml(comment.user_id || '')}</div>
    <div class="comment-box">${escapeHtml(comment.content || '')}</div>
    <div class="table-wrap mt-8">
      <table aria-label="评论关联任务表">
        <thead>
          <tr><th scope="col">ID</th><th scope="col">状态</th><th scope="col">回复</th><th scope="col">操作</th></tr>
        </thead>
        <tbody>${jobsHtml}</tbody>
      </table>
    </div>
  `;
}

function renderJobDetailResult(data) {
  if (!jobDetailResultEl) return;
  const item = data?.item;
  if (!item) {
    jobDetailResultEl.textContent = '未查询任务详情';
    return;
  }

  const jobId = Number(item.id);
  if (Number.isFinite(jobId) && jobId > 0 && singleRetryJobIdInput) {
    singleRetryJobIdInput.value = String(jobId);
  }
  const commentId = String(item.comment_id || '').trim();
  if (commentId && commentDetailIdInput) {
    commentDetailIdInput.value = commentId;
  }

  jobDetailResultEl.innerHTML = `
    <div class="mono">
      job_id: ${escapeHtml(item.id)}
      <button class="detail-action-btn" onclick="quickQueryJobFromResult(${Number(item.id)})">刷新该任务</button>
      <button class="detail-action-btn" onclick="retryJobFromDetail(${Number(item.id)})">重试该任务</button>
    </div>
    <div>状态: ${renderStatusBadge(item.status)}</div>
    <div class="mono">
      comment_id: ${escapeHtml(item.comment_id || '')}
      <button class="detail-action-btn" onclick="quickQueryCommentFromResult(${JSON.stringify(String(item.comment_id || ''))})">查询该评论</button>
    </div>
    <div class="comment-box">原评论: ${escapeHtml(item.comment_content || '')}</div>
    <div class="comment-box">回复内容: ${escapeHtml(item.reply_text || '')}</div>
    <div class="mono">risk_flags: ${escapeHtml(JSON.stringify(item.risk_flags || {}))}</div>
  `;
}

async function queryCommentDetail(options = {}) {
  const silent = !!options.silent;
  const bypassLock = !!options.bypassLock;
  if (!bypassLock && isGlobalRefreshLocked()) {
    if (!silent) showBusyToast();
    return;
  }
  const commentId = String(commentDetailIdInput?.value || '').trim();
  if (!commentId) {
    const errorText = '请先输入 comment_id';
    if (!silent) showToast('查询评论失败', errorText, { tone: 'error' });
    if (commentDetailResultEl) commentDetailResultEl.textContent = '未查询评论详情';
    if (jobDetailIdInput) jobDetailIdInput.value = '';
    if (singleRetryJobIdInput) singleRetryJobIdInput.value = '';
    markDetailQueryError(commentDetailMetaEl, errorText);
    return;
  }

  setInlineButtonLoading(commentDetailQueryBtn, true, '查询中...');
  try {
    const res = await fetch(withApiKey(`/api/comments/${encodeURIComponent(commentId)}`));
    const data = await readApiPayload(res);
    if (!res.ok || !data.ok) {
      const errorText = getErrorText(data, '请求失败');
      if (!silent) showToast('查询评论失败', errorText, { copyable: true, tone: 'error' });
      if (commentDetailResultEl) commentDetailResultEl.textContent = '未查询评论详情';
      if (jobDetailIdInput) jobDetailIdInput.value = '';
      if (singleRetryJobIdInput) singleRetryJobIdInput.value = '';
      markDetailQueryError(commentDetailMetaEl, errorText);
      return;
    }
    renderCommentDetailResult(data);
    markDetailQueryTime(commentDetailMetaEl);
    if (!silent) showToast('查询评论成功', `comment_id=${commentId}`, { tone: 'success' });
  } catch (error) {
    const errorText = getErrorText(error, '请求失败');
    if (!silent) showToast('查询评论失败', errorText, { copyable: true, tone: 'error' });
    if (commentDetailResultEl) commentDetailResultEl.textContent = '未查询评论详情';
    if (jobDetailIdInput) jobDetailIdInput.value = '';
    if (singleRetryJobIdInput) singleRetryJobIdInput.value = '';
    markDetailQueryError(commentDetailMetaEl, errorText);
  } finally {
    setInlineButtonLoading(commentDetailQueryBtn, false);
    updateBatchActionState();
  }
}

async function queryJobDetail(options = {}) {
  const silent = !!options.silent;
  const bypassLock = !!options.bypassLock;
  if (!bypassLock && isGlobalRefreshLocked()) {
    if (!silent) showBusyToast();
    return;
  }
  let jobId = Number(jobDetailIdInput?.value);
  if ((!Number.isFinite(jobId) || jobId <= 0) && Number.isFinite(Number(singleRetryJobIdInput?.value)) && Number(singleRetryJobIdInput?.value) > 0) {
    jobId = Number(singleRetryJobIdInput?.value);
    if (jobDetailIdInput) jobDetailIdInput.value = String(jobId);
  }
  if (!Number.isFinite(jobId) || jobId <= 0) {
    const errorText = '请先输入有效的 job_id';
    if (!silent) showToast('查询任务失败', errorText, { tone: 'error' });
    if (jobDetailResultEl) jobDetailResultEl.textContent = '未查询任务详情';
    if (jobDetailIdInput) jobDetailIdInput.value = '';
    if (singleRetryJobIdInput) singleRetryJobIdInput.value = '';
    markDetailQueryError(jobDetailMetaEl, errorText);
    return;
  }

  setInlineButtonLoading(jobDetailQueryBtn, true, '查询中...');
  try {
    const res = await fetch(withApiKey(`/api/jobs/${jobId}`));
    const data = await readApiPayload(res);
    if (!res.ok || !data.ok) {
      const errorText = getErrorText(data, '请求失败');
      if (!silent) showToast('查询任务失败', errorText, { copyable: true, tone: 'error' });
      if (jobDetailResultEl) jobDetailResultEl.textContent = '未查询任务详情';
      if (jobDetailIdInput) jobDetailIdInput.value = '';
      if (singleRetryJobIdInput) singleRetryJobIdInput.value = '';
      markDetailQueryError(jobDetailMetaEl, errorText);
      return;
    }
    renderJobDetailResult(data);
    markDetailQueryTime(jobDetailMetaEl);
    if (!silent) showToast('查询任务成功', `job_id=${jobId}`, { tone: 'success' });
  } catch (error) {
    const errorText = getErrorText(error, '请求失败');
    if (!silent) showToast('查询任务失败', errorText, { copyable: true, tone: 'error' });
    if (jobDetailResultEl) jobDetailResultEl.textContent = '未查询任务详情';
    if (jobDetailIdInput) jobDetailIdInput.value = '';
    if (singleRetryJobIdInput) singleRetryJobIdInput.value = '';
    markDetailQueryError(jobDetailMetaEl, errorText);
  } finally {
    setInlineButtonLoading(jobDetailQueryBtn, false);
    updateBatchActionState();
  }
}

async function retrySingleJob() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  let jobId = Number(singleRetryJobIdInput?.value);
  if ((!Number.isFinite(jobId) || jobId <= 0) && Number.isFinite(Number(jobDetailIdInput?.value)) && Number(jobDetailIdInput?.value) > 0) {
    jobId = Number(jobDetailIdInput?.value);
    if (singleRetryJobIdInput) singleRetryJobIdInput.value = String(jobId);
  }
  if (!Number.isFinite(jobId) || jobId <= 0) {
    showToast('单任务重试失败', '请先输入有效的 job_id', { tone: 'error' });
    if (jobDetailResultEl) jobDetailResultEl.textContent = '未查询任务详情';
    if (jobDetailMetaEl) markDetailQueryError(jobDetailMetaEl, '请先输入有效的 job_id');
    if (jobDetailIdInput) jobDetailIdInput.value = '';
    if (singleRetryJobIdInput) singleRetryJobIdInput.value = '';
    return;
  }

  singleRetryRunning = true;
  updateBatchActionState();
  setInlineButtonLoading(singleRetryBtn, true, '重试中...');
  try {
    const res = await fetch(withApiKey(`/api/jobs/${jobId}/retry`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force_long: !!singleRetryForceLongInput?.checked }),
    });
    const data = await readApiPayload(res);
    if (!res.ok || !data.ok) {
      const errorText = getErrorText(data, '请求失败');
      showToast('单任务重试失败', errorText, { copyable: true, tone: 'error' });
      if (jobDetailResultEl) jobDetailResultEl.textContent = '未查询任务详情';
      if (jobDetailMetaEl) markDetailQueryError(jobDetailMetaEl, errorText);
      if (jobDetailIdInput) jobDetailIdInput.value = '';
      if (singleRetryJobIdInput) singleRetryJobIdInput.value = '';
      return;
    }

    const refreshResult = await refreshAfterAction();
    if (!refreshResult.ok) {
      const failureSummary = formatFailureSummary(refreshResult.failures);
      showToast(
        '单任务重试完成（部分刷新失败）',
        failureSummary,
        { copyable: true, tone: 'error', durationMs: 0 }
      );
      if (jobDetailMetaEl) markDetailQueryError(jobDetailMetaEl, failureSummary);
      return;
    }

    if (jobDetailIdInput) {
      jobDetailIdInput.value = String(jobId);
    }
    if (singleRetryJobIdInput) {
      singleRetryJobIdInput.value = String(jobId);
    }
    await queryJobDetail({ silent: true, bypassLock: true });
    const commentId = String(commentDetailIdInput?.value || '').trim();
    if (commentId) {
      await queryCommentDetail({ silent: true, bypassLock: true });
    }
    if (singleRetryAutoResetForceInput?.checked && singleRetryForceLongInput) {
      singleRetryForceLongInput.checked = false;
    }

    showToast('单任务重试完成', `任务 ${jobId} 已重新入队`, { tone: 'success' });
  } catch (error) {
    const errorText = getErrorText(error, '请求失败');
    showToast('单任务重试失败', errorText, { copyable: true, tone: 'error' });
    if (jobDetailResultEl) jobDetailResultEl.textContent = '未查询任务详情';
    if (jobDetailMetaEl) markDetailQueryError(jobDetailMetaEl, errorText);
    if (jobDetailIdInput) jobDetailIdInput.value = '';
    if (singleRetryJobIdInput) singleRetryJobIdInput.value = '';
  } finally {
    singleRetryRunning = false;
    setInlineButtonLoading(singleRetryBtn, false);
    updateBatchActionState();
    if (pendingFullRefresh) { pendingFullRefresh = false; queueFullRefresh(); }
  }
}

function getCheckedJobIds() {
  return Array.from(selectedJobIdSet)
    .filter(id => Number.isFinite(id))
    .sort((a, b) => a - b);
}

function toggleAllJobChecks(checked) {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  (jobsTableBody?.querySelectorAll('.job-check') || []).forEach((el) => {
    el.checked = !!checked;
  });
  updateBatchActionState();
}

function renderRiskFlags(flags) {
  if (!flags || typeof flags !== 'object') return '-';
  const entries = Object.entries(flags);
  if (!entries.length) return '-';
  
  return `<div style="display: flex; flex-wrap: wrap; gap: 4px;">
    ${entries.map(([key, val]) => {
      const isRed = val === true || (typeof val === 'number' && val > 0.5);
      const style = isRed 
        ? 'background: rgba(255, 116, 132, 0.15); color: #ff9da9; border: 1px solid rgba(255, 116, 132, 0.3);'
        : 'background: rgba(167, 183, 218, 0.1); color: #a7b7da; border: 1px solid rgba(167, 183, 218, 0.2);';
      return `<span class="mono" style="font-size: 10px; padding: 1px 4px; border-radius: 4px; ${style}">${escapeHtml(key)}</span>`;
    }).join('')}
  </div>`;
}

let lastCheckedJobIndex = -1;

function onJobCheckChanged(event) {
  const target = event?.target;
  if (!target) return;

  if (isGlobalRefreshLocked()) {
    const id = Number(target.value);
    if (Number.isFinite(id)) target.checked = selectedJobIdSet.has(id);
    showBusyToast();
    return;
  }

  const allChecks = Array.from(jobsTableBody?.querySelectorAll('.job-check') || []);
  const currentIndex = allChecks.indexOf(target);

  if (event.shiftKey && lastCheckedJobIndex !== -1 && currentIndex !== -1) {
    const start = Math.min(lastCheckedJobIndex, currentIndex);
    const end = Math.max(lastCheckedJobIndex, currentIndex);
    const checked = target.checked;
    for (let i = start; i <= end; i++) {
      allChecks[i].checked = checked;
    }
  }

  lastCheckedJobIndex = currentIndex;
  updateBatchActionState();
}

function updateBatchActionState() {
  const allChecks = Array.from(jobsTableBody?.querySelectorAll('.job-check') || []);
  selectedJobIdSet = new Set(
    allChecks
      .filter(el => el.checked)
      .map(el => Number(el.value))
      .filter(id => Number.isFinite(id))
  );
  const count = selectedJobIdSet.size;
  const locked = isGlobalRefreshLocked();

  allChecks.forEach((el) => {
    el.disabled = locked;
  });
  (jobsTableBody?.querySelectorAll('.approve-btn') || []).forEach((btn) => {
    btn.disabled = locked;
  });
  (jobsTableBody?.querySelectorAll('textarea[id^="reply-"]') || []).forEach((el) => {
    el.disabled = locked;
  });
  (knowledgeEntriesBody?.querySelectorAll('.knowledge-disable-btn') || []).forEach((btn) => {
    btn.disabled = locked;
  });
  (commentDetailResultEl?.querySelectorAll('.detail-action-btn') || []).forEach((btn) => {
    btn.disabled = locked;
  });
  (jobDetailResultEl?.querySelectorAll('.detail-action-btn') || []).forEach((btn) => {
    btn.disabled = locked;
  });

  if (batchApproveBtn) batchApproveBtn.disabled = locked || count === 0;
  if (batchRetryBtn) batchRetryBtn.disabled = locked || count === 0;
  if (jobsRefreshBtn) jobsRefreshBtn.disabled = locked;
  if (jobsStatusInput) jobsStatusInput.disabled = locked;
  if (jobsLimitInput) jobsLimitInput.disabled = locked;
  if (dailyDaysInput) dailyDaysInput.disabled = locked;
  if (dailySimpleInput) dailySimpleInput.disabled = locked;
  if (dailyRefreshBtn) dailyRefreshBtn.disabled = locked;
  if (auditActionInput) auditActionInput.disabled = locked;
  if (auditOkInput) auditOkInput.disabled = locked;
  if (auditSummaryDaysInput) auditSummaryDaysInput.disabled = locked;
  if (auditSummaryRefreshBtn) auditSummaryRefreshBtn.disabled = locked;
  if (jobsExportBtn) jobsExportBtn.disabled = locked;
  if (auditExportBtn) auditExportBtn.disabled = locked;
  if (fullRefreshBtn) fullRefreshBtn.disabled = locked;
  if (styleProfileSelect) styleProfileSelect.disabled = locked;
  if (styleProfileApplyBtn) styleProfileApplyBtn.disabled = locked;
  if (styleProfileRefreshBtn) styleProfileRefreshBtn.disabled = locked;
  if (roleCardSelect) roleCardSelect.disabled = locked;
  if (roleCardKeyInput) roleCardKeyInput.disabled = locked;
  if (roleCardNameInput) roleCardNameInput.disabled = locked;
  if (roleCardEnabledInput) roleCardEnabledInput.disabled = locked;
  if (roleCardDescriptionInput) roleCardDescriptionInput.disabled = locked;
  if (roleCardSystemPromptInput) roleCardSystemPromptInput.disabled = locked;
  if (roleCardToneInput) roleCardToneInput.disabled = locked;
  if (roleCardConstraintsInput) roleCardConstraintsInput.disabled = locked;
  if (roleCardsRefreshBtn) roleCardsRefreshBtn.disabled = locked;
  if (knowledgeRefreshBtn) knowledgeRefreshBtn.disabled = locked;
  if (knowledgeCategoryInput) knowledgeCategoryInput.disabled = locked;
  if (knowledgeTitleInput) knowledgeTitleInput.disabled = locked;
  if (knowledgeContentInput) knowledgeContentInput.disabled = locked;
  if (knowledgeCreateBtn) knowledgeCreateBtn.disabled = locked;
  if (gatewayCommentIdInput) gatewayCommentIdInput.disabled = locked;
  if (gatewayLimitInput) gatewayLimitInput.disabled = locked;
  if (gatewayRefreshBtn) gatewayRefreshBtn.disabled = locked;
  if (gatewayPublishCommentIdInput) gatewayPublishCommentIdInput.disabled = locked;
  if (gatewayPublishSourceInput) gatewayPublishSourceInput.disabled = locked;
  if (gatewayPublishForceInput) gatewayPublishForceInput.disabled = locked;
  if (gatewayPublishReplyInput) gatewayPublishReplyInput.disabled = locked;
  if (gatewayPublishBtn) gatewayPublishBtn.disabled = locked;
  if (commentDetailIdInput) commentDetailIdInput.disabled = locked;
  if (commentDetailQueryBtn) commentDetailQueryBtn.disabled = locked;
  if (commentDetailClearBtn) commentDetailClearBtn.disabled = locked;
  if (jobDetailIdInput) jobDetailIdInput.disabled = locked;
  if (jobDetailQueryBtn) jobDetailQueryBtn.disabled = locked;
  if (jobDetailClearBtn) jobDetailClearBtn.disabled = locked;
  if (singleRetryJobIdInput) singleRetryJobIdInput.disabled = locked;
  if (singleRetryForceLongInput) singleRetryForceLongInput.disabled = locked;
  if (singleRetryAutoResetForceInput) singleRetryAutoResetForceInput.disabled = locked;
  if (singleRetryBtn) singleRetryBtn.disabled = locked;
  if (roleCardNewBtn) roleCardNewBtn.disabled = locked;
  if (roleCardCloneBtn) roleCardCloneBtn.disabled = locked;
  if (roleCardSaveBtn) roleCardSaveBtn.disabled = locked;
  if (roleCardDisableBtn) roleCardDisableBtn.disabled = locked;
  if (roleCardActivateBtn) roleCardActivateBtn.disabled = locked;
  if (roleProfileSelect) roleProfileSelect.disabled = locked;
  if (roleProfileApplyBtn) roleProfileApplyBtn.disabled = locked;
  if (roleProfileRefreshBtn) roleProfileRefreshBtn.disabled = locked;
  if (autoRefreshInput) autoRefreshInput.disabled = locked;
  if (autoRefreshSecondsInput) autoRefreshSecondsInput.disabled = locked || !!autoRefreshInput?.checked;
  if (uiPrefsFileInput) uiPrefsFileInput.disabled = locked;
  if (prefsResetBtn) prefsResetBtn.disabled = locked;
  if (prefsExportBtn) prefsExportBtn.disabled = locked;
  if (prefsImportBtn) prefsImportBtn.disabled = locked;
  if (batchSelectedCountEl) batchSelectedCountEl.textContent = `已选 ${count}`;

  if (jobsCheckAll) {
    jobsCheckAll.disabled = locked;
    if (!allChecks.length) {
      jobsCheckAll.checked = false;
      jobsCheckAll.indeterminate = false;
    } else if (count === 0) {
      jobsCheckAll.checked = false;
      jobsCheckAll.indeterminate = false;
    } else if (count === allChecks.length) {
      jobsCheckAll.checked = true;
      jobsCheckAll.indeterminate = false;
    } else {
      jobsCheckAll.checked = false;
      jobsCheckAll.indeterminate = true;
    }
  }
}

async function refreshAfterAction() {
  const steps = [
    { label: 'jobs', run: loadJobs },
    { label: 'overview', run: loadOverview },
    { label: 'knowledge', run: loadKnowledgeEntries },
    { label: 'gateway_logs', run: loadGatewayLogs },
    { label: 'daily_metrics', run: loadDailyMetrics },
    { label: 'audit_summary', run: loadAuditSummary },
    { label: 'audit_logs', run: loadAuditLogs },
  ];

  const failures = [];
  for (const step of steps) {
    try {
      await step.run();
    } catch (error) {
      failures.push({ label: step.label, error: getErrorText(error, 'unknown_error') });
    }
  }

  return {
    ok: failures.length === 0,
    failures,
  };
}

function formatFailureSummary(failures) {
  return failures.map(item => `${item.label}: ${item.error}`).join('\n');
}

function setInlineButtonLoading(btn, loading, loadingText) {
  if (!btn) return;
  if (!btn.dataset.originalText) btn.dataset.originalText = btn.textContent || '';
  if (loading) {
    btn.disabled = true;
    if (loadingText) btn.textContent = loadingText;
    return;
  }
  btn.disabled = false;
  btn.textContent = btn.dataset.originalText || btn.textContent;
}

async function approveJob(jobId, triggerBtn = null) {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  singleApproveRunning = true;
  updateBatchActionState();
  setInlineButtonLoading(triggerBtn, true, '处理中...');
  try {
    const replyInput = jobsTableBody?.querySelector(`#reply-${jobId}`);
    if (!(replyInput instanceof HTMLTextAreaElement)) {
      showToast('审批失败', '未找到回复输入框，请先刷新任务列表', { tone: 'error' });
      return;
    }
    const txt = replyInput.value;
    const res = await fetch(withApiKey(`/api/jobs/${jobId}/approve`), {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ override_reply_text: txt })
    });
    const data = await readApiPayload(res);
    if (!res.ok || !data.ok) return showToast('审批失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });

    const refreshResult = await refreshAfterAction();
    if (!refreshResult.ok) {
      showToast(
        '审批完成（部分刷新失败）',
        formatFailureSummary(refreshResult.failures),
        { copyable: true, tone: 'error', durationMs: 0 }
      );
      return;
    }

    showToast('审批完成', `任务 ${jobId} 已处理`, { tone: 'success' });
  } catch (error) {
    showToast('审批失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    singleApproveRunning = false;
    setInlineButtonLoading(triggerBtn, false);
    updateBatchActionState();
    if (pendingFullRefresh) { pendingFullRefresh = false; queueFullRefresh(); }
  }
}

async function batchApprove() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  batchApproveRunning = true;
  updateBatchActionState();
  setInlineButtonLoading(batchApproveBtn, true, '审批中...');
  if (batchRetryBtn) batchRetryBtn.disabled = true;
  try {
    const jobIds = getCheckedJobIds();
    if (!jobIds.length) return showToast('批量审批', '请先勾选要审批的任务');
    const res = await fetch(withApiKey('/api/jobs/approve-batch'), {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ job_ids: jobIds })
    });
    const data = await readApiPayload(res);
    if (!res.ok || !data.ok) return showToast('批量审批失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });

    const refreshResult = await refreshAfterAction();
    if (!refreshResult.ok) {
      showToast(
        `批量审批完成（成功 ${data.summary.success} / 失败 ${data.summary.failed}）\n但界面刷新部分失败`,
        formatFailureSummary(refreshResult.failures),
        { copyable: true, tone: 'error', durationMs: 0 }
      );
      return;
    }

    showToast('批量审批完成', `成功 ${data.summary.success} / 失败 ${data.summary.failed}`, { tone: 'success' });
  } catch (error) {
    showToast('批量审批失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    batchApproveRunning = false;
    setInlineButtonLoading(batchApproveBtn, false);
    updateBatchActionState();
    if (pendingFullRefresh) { pendingFullRefresh = false; queueFullRefresh(); }
  }
}

async function batchRetry() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  batchRetryRunning = true;
  updateBatchActionState();
  setInlineButtonLoading(batchRetryBtn, true, '重试中...');
  if (batchApproveBtn) batchApproveBtn.disabled = true;
  try {
    const jobIds = getCheckedJobIds();
    if (!jobIds.length) return showToast('批量重试', '请先勾选要重试的任务');
    const res = await fetch(withApiKey('/api/jobs/retry-batch'), {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ job_ids: jobIds, force_long: false })
    });
    const data = await readApiPayload(res);
    if (!res.ok || !data.ok) return showToast('批量重试失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });

    const refreshResult = await refreshAfterAction();
    if (!refreshResult.ok) {
      showToast(
        `批量重试完成（成功 ${data.summary.success} / 失败 ${data.summary.failed}）\n但界面刷新部分失败`,
        formatFailureSummary(refreshResult.failures),
        { copyable: true, tone: 'error', durationMs: 0 }
      );
      return;
    }

    showToast('批量重试完成', `成功 ${data.summary.success} / 失败 ${data.summary.failed}`, { tone: 'success' });
  } catch (error) {
    showToast('批量重试失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    batchRetryRunning = false;
    setInlineButtonLoading(batchRetryBtn, false);
    updateBatchActionState();
    if (pendingFullRefresh) { pendingFullRefresh = false; queueFullRefresh(); }
  }
}

function exportCsv() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  const status = jobsStatusInput?.value || '';
  const limit = getClampedInt(jobsLimitInput?.value, 1, 200, 30);
  if (jobsLimitInput) jobsLimitInput.value = String(limit);
  const qs = new URLSearchParams({ limit: String(limit) });
  if (status) qs.set('status', status);
  const win = window.open(withApiKey('/api/export/jobs.csv?' + qs.toString()), '_blank');
  if (!win) showToast('导出提示', '浏览器拦截了新窗口，请允许弹窗后重试');
}

async function refreshAuditLogs() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  setInlineButtonLoading(auditRefreshBtn, true, '刷新中...');
  try {
    await loadAuditLogs();
    showToast('日志刷新完成', '已更新审计日志', { tone: 'success' });
  } catch (error) {
    showToast('日志刷新失败', getErrorText(error, '加载审计日志失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(auditRefreshBtn, false);
    updateBatchActionState();
  }
}

function getTopActionLabel(actionCountMap) {
  const entries = Object.entries(actionCountMap || {});
  if (!entries.length) return '-';
  entries.sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0));
  const [action, count] = entries[0];
  return `${action} (${safeCount(count)})`;
}

function renderAuditSummaryCards(summary) {
  const totals = summary?.totals || {};
  const byResult = summary?.by_result || {};
  if (cardAuditTotal) cardAuditTotal.textContent = safeCount(totals.audit_logs);
  if (cardAuditOk) cardAuditOk.textContent = safeCount(byResult.ok);
  if (cardAuditFailed) cardAuditFailed.textContent = safeCount(byResult.failed);
  if (cardAuditTopAction) cardAuditTopAction.textContent = getTopActionLabel(summary?.by_action || {});
}

async function loadAuditSummary() {
  const days = getClampedInt(auditSummaryDaysInput?.value, 1, 90, 7);
  if (auditSummaryDaysInput) auditSummaryDaysInput.value = String(days);

  const action = auditActionInput?.value || '';
  const ok = auditOkInput?.value || '';
  const qs = new URLSearchParams({ days: String(days) });
  if (action) qs.set('action', action);
  if (ok) qs.set('ok', ok);

  const res = await fetch(withApiKey('/api/admin/audit/summary?' + qs.toString()));
  const data = await readApiPayload(res);
  if (!res.ok || !data.ok) throw new Error(getErrorText(data, '加载审计摘要失败'));

  renderAuditSummaryCards(data);
}

async function refreshAuditSummary() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  setInlineButtonLoading(auditSummaryRefreshBtn, true, '刷新中...');
  try {
    await loadAuditSummary();
    showToast('审计摘要刷新完成', '已更新审计统计卡片', { tone: 'success' });
  } catch (error) {
    showToast('审计摘要刷新失败', getErrorText(error, '加载审计摘要失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(auditSummaryRefreshBtn, false);
    updateBatchActionState();
  }
}

async function loadAuditLogs() {
  if (!auditLogsBody) throw new Error('audit_logs_table_not_found');
  auditLogsBody.innerHTML = '<tr><td colspan="6" class="text-center">⌛ 正在加载审计日志...</td></tr>';

  const action = auditActionInput?.value || '';

  if (!res.ok || !data.ok) throw new Error(getErrorText(data, '加载审计日志失败'));

  const items = data.items || [];
  if (items.length === 0) {
    auditLogsBody.innerHTML = '<tr><td colspan="6" class="text-center">暂无审计日志</td></tr>';
    return;
  }

  for (const item of items) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${renderIdCell(item.id, '日志ID')}</td>
      <td class=\"mono\">${escapeHtml(item.action)}</td>
      <td>${escapeHtml(item.ok)}</td>
      <td>${renderIdCell(item.target_id, '目标ID')}</td>
      <td class=\"mono\">${escapeHtml(JSON.stringify(item.payload || {}))}</td>
      <td class=\"mono\">${renderTimestamp(item.created_at)}</td>
    `;
    auditLogsBody.appendChild(tr);
  }
}

function exportAuditCsv() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  const action = auditActionInput?.value || '';
  const ok = auditOkInput?.value || '';
  const limit = getClampedInt(auditLimitInput?.value, 1, 1000, 100);
  if (auditLimitInput) auditLimitInput.value = String(limit);

  const qs = new URLSearchParams({ limit: String(limit) });
  if (action) qs.set('action', action);
  if (ok) qs.set('ok', ok);

  const win = window.open(withApiKey('/api/export/audit-logs.csv?' + qs.toString()), '_blank');
  if (!win) showToast('导出提示', '浏览器拦截了新窗口，请允许弹窗后重试');
}

async function loadKnowledgeEntries() {
  const res = await fetch(withApiKey('/api/admin/knowledge'));
  const data = await readApiPayload(res);
  if (!knowledgeEntriesBody) throw new Error('knowledge_table_not_found');
  knowledgeEntriesBody.innerHTML = '';
  if (!res.ok || !data.ok) throw new Error(getErrorText(data, '加载知识库失败'));

  const items = data.items || [];
  if (items.length === 0) {
    knowledgeEntriesBody.innerHTML = '<tr><td colspan="7" class="text-center">暂无知识条目</td></tr>';
    return;
  }

  for (const item of items) {
    const tr = document.createElement('tr');
    const enabled = !!item.enabled;
    tr.innerHTML = `
      <td>${renderIdCell(item.id, '知识条目ID')}</td>
      <td class="mono">${escapeHtml(String(item.category || ''))}</td>
      <td>${escapeHtml(String(item.title || ''))}</td>
      <td class="comment-box">${escapeHtml(String(item.content || ''))}</td>
      <td>${enabled ? '<span class="status-badge status-badge-published">enabled</span>' : '<span class="status-badge status-badge-blocked">disabled</span>'}</td>
      <td class="mono">${escapeHtml(String(item.updated_at || ''))}</td>
      <td>${enabled ? `<button class="knowledge-disable-btn" onclick="disableKnowledgeEntry(${Number(item.id)})">禁用</button>` : '-'}</td>
    `;
    knowledgeEntriesBody.appendChild(tr);
  }
}

async function refreshKnowledgeEntries() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }

  setInlineButtonLoading(knowledgeRefreshBtn, true, '刷新中...');
  try {
    await loadKnowledgeEntries();
    showToast('知识库刷新完成', '已更新知识条目列表', { tone: 'success' });
  } catch (error) {
    showToast('知识库刷新失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(knowledgeRefreshBtn, false);
    updateBatchActionState();
  }
}

async function createKnowledgeEntry() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }

  const category = String(knowledgeCategoryInput?.value || '').trim();
  const title = String(knowledgeTitleInput?.value || '').trim();
  const content = String(knowledgeContentInput?.value || '').trim();
  if (!category || !title || !content) {
    showToast('新增知识条目失败', 'category / title / content 均为必填', { tone: 'error' });
    return;
  }

  setInlineButtonLoading(knowledgeCreateBtn, true, '新增中...');
  try {
    const res = await fetch(withApiKey('/api/admin/knowledge'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, title, content }),
    });
    const data = await readApiPayload(res);
    if (!res.ok || !data.ok) {
      showToast('新增知识条目失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });
      return;
    }

    await loadKnowledgeEntries();
    showToast('新增知识条目成功', `ID: ${data.item?.id ?? '-'}`, { tone: 'success' });
    
    // Clear inputs
    if (knowledgeCategoryInput) knowledgeCategoryInput.value = '';
    if (knowledgeTitleInput) knowledgeTitleInput.value = '';
    if (knowledgeContentInput) knowledgeContentInput.value = '';
  } catch (error) {
    showToast('新增知识条目失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(knowledgeCreateBtn, false);
    updateBatchActionState();
  }
}

async function disableKnowledgeEntry(entryId) {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }

  const id = Number(entryId);
  if (!Number.isFinite(id) || id <= 0) {
    showToast('禁用知识条目失败', '无效 entry_id', { tone: 'error' });
    return;
  }

  if (!confirm(`确定要禁用知识条目 ID: ${id} 吗？`)) return;

  try {
    const res = await fetch(withApiKey(`/api/admin/knowledge/${id}/disable`), { method: 'POST' });
    const data = await readApiPayload(res);
    if (!res.ok || !data.ok) {
      showToast('禁用知识条目失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });
      return;
    }

    await loadKnowledgeEntries();
    showToast('知识条目已禁用', `ID: ${id}`, { tone: 'success' });
  } catch (error) {
    showToast('禁用知识条目失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  }
}

async function loadGatewayLogs() {
  const commentId = String(gatewayCommentIdInput?.value || '').trim();
  const limit = getClampedInt(gatewayLimitInput?.value, 1, 200, 50);
  if (gatewayLimitInput) gatewayLimitInput.value = String(limit);

  const qs = new URLSearchParams({ limit: String(limit) });
  if (commentId) qs.set('comment_id', commentId);

  const res = await fetch(withApiKey('/api/admin/gateway/logs?' + qs.toString()));
  const data = await readApiPayload(res);
  if (!gatewayLogsBody) throw new Error('gateway_logs_table_not_found');
  gatewayLogsBody.innerHTML = '';
  if (!res.ok || !data.ok) throw new Error(getErrorText(data, '加载网关日志失败'));

  for (const item of (data.items || [])) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${renderIdCell(item.id, '网关日志ID')}</td>
      <td>${renderIdCell(item.comment_id, '评论ID')}</td>
      <td class="mono">${escapeHtml(String(item.source || ''))}</td>
      <td class="mono">${escapeHtml(String(item.reply_hash || ''))}</td>
      <td class="mono">${renderTimestamp(item.created_at)}</td>
    `;
    gatewayLogsBody.appendChild(tr);
  }
}

async function refreshGatewayLogs() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }

  setInlineButtonLoading(gatewayRefreshBtn, true, '刷新中...');
  try {
    await loadGatewayLogs();
    showToast('网关日志刷新完成', '已更新发布网关日志', { tone: 'success' });
  } catch (error) {
    showToast('网关日志刷新失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(gatewayRefreshBtn, false);
    updateBatchActionState();
  }
}

async function refreshAfterGatewayPublish() {
  await loadGatewayLogs();
  await loadOverview();
  await loadJobs();
}

async function publishGatewayReply() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }

  const commentId = String(gatewayPublishCommentIdInput?.value || '').trim();
  const replyText = String(gatewayPublishReplyInput?.value || '').trim();
  const source = String(gatewayPublishSourceInput?.value || '').trim() || 'bili-pet-bot';
  const forcePublish = !!gatewayPublishForceInput?.checked;

  if (!commentId || !replyText) {
    showToast('手动发布失败', 'comment_id 与 reply_text 必填', { tone: 'error' });
    return;
  }

  if (!confirm(`确定要手动发布此回复吗？\n评论 ID: ${commentId}\n回复内容: ${replyText.slice(0, 50)}${replyText.length > 50 ? '...' : ''}`)) return;

  setInlineButtonLoading(gatewayPublishBtn, true, '发布中...');
  try {
    const res = await fetch(withApiKey('/gateway/publish'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comment_id: commentId,
        reply_text: replyText,
        source,
        force_publish: forcePublish,
      }),
    });
    const data = await readApiPayload(res);
    if (!res.ok || !data.ok) {
      showToast('手动发布失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });
      return;
    }

    await refreshAfterGatewayPublish();
    showToast('手动发布成功', `comment_id=${commentId}`, { tone: 'success' });
  } catch (error) {
    showToast('手动发布失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(gatewayPublishBtn, false);
    updateBatchActionState();
  }
}

function tryParseJsonObject(rawText, fallback = {}) {
  const text = String(rawText || '').trim();
  if (!text) return fallback;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    return fallback;
  }
}

function roleCardByKey(key) {
  const normalized = String(key || '').trim().toLowerCase();
  return roleCardItems.find(item => String(item.key || '').toLowerCase() === normalized) || null;
}

let lastSavedRoleCardState = null;

function getRoleCardEditorState() {
  return JSON.stringify({
    key: String(roleCardKeyInput?.value || '').trim(),
    name: String(roleCardNameInput?.value || '').trim(),
    description: String(roleCardDescriptionInput?.value || '').trim(),
    system_prompt: String(roleCardSystemPromptInput?.value || '').trim(),
    tone: String(roleCardToneInput?.value || '').trim(),
    constraints: String(roleCardConstraintsInput?.value || '').trim(),
    enabled: !!roleCardEnabledInput?.checked,
  });
}

function isRoleCardDirty() {
  if (lastSavedRoleCardState === null) return false;
  return getRoleCardEditorState() !== lastSavedRoleCardState;
}

function checkRoleCardUnsavedChanges() {
  if (isRoleCardDirty()) {
    return confirm('当前角色卡有未保存的更改，确定要放弃这些更改吗？');
  }
  return true;
}

function renderRoleCardEditor(item) {
  roleCardCurrentKey = String(item?.key || '').trim().toLowerCase();
  if (roleCardSelect) roleCardSelect.value = roleCardCurrentKey;
  if (roleCardKeyInput) roleCardKeyInput.value = String(item?.key || '');
  if (roleCardNameInput) roleCardNameInput.value = String(item?.name || '');
  if (roleCardDescriptionInput) roleCardDescriptionInput.value = String(item?.description || '');
  if (roleCardSystemPromptInput) roleCardSystemPromptInput.value = String(item?.system_prompt || '');
  if (roleCardToneInput) roleCardToneInput.value = JSON.stringify(item?.tone || {}, null, 2);
  if (roleCardConstraintsInput) roleCardConstraintsInput.value = JSON.stringify(item?.constraints || {}, null, 2);
  if (roleCardEnabledInput) roleCardEnabledInput.checked = !!item?.enabled;

  // Clear validation errors
  ['role-card-tone-error', 'role-card-constraints-error'].forEach(id => {
    const err = document.getElementById(id);
    if (err) err.classList.add('hidden');
  });
  if (roleCardToneInput) roleCardToneInput.style.borderColor = '';
  if (roleCardConstraintsInput) roleCardConstraintsInput.style.borderColor = '';

  lastSavedRoleCardState = getRoleCardEditorState();
}

function renderRoleCardOptions(activeKey = '') {
  if (!roleCardSelect) return;
  const normalizedActive = String(activeKey || '').trim().toLowerCase();
  roleCardSelect.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = roleCardItems.length ? '选择角色卡' : '暂无角色卡';
  roleCardSelect.appendChild(placeholder);

  for (const item of roleCardItems) {
    const option = document.createElement('option');
    option.value = String(item.key || '');
    const isActive = String(item.key || '').toLowerCase() === normalizedActive;
    option.textContent = `${item.key}${isActive ? ' (active)' : ''}${item.enabled ? '' : ' (disabled)'}`;
    roleCardSelect.appendChild(option);
  }
}

async function loadRoleCards() {
  const res = await fetch(withApiKey('/api/admin/role-cards'));
  const data = await readApiPayload(res);
  if (!res.ok || !data.ok) throw new Error(getErrorText(data, '加载角色卡失败'));

  roleCardItems = Array.isArray(data.items) ? data.items : [];
  const activeKey = String(data.active_role_card_key || '').trim().toLowerCase();
  if (activeRoleCardCurrentEl) {
    activeRoleCardCurrentEl.textContent = `激活角色卡: ${activeKey || '-'}`;
  }

  renderRoleCardOptions(activeKey);

  if (roleCardCurrentKey) {
    const found = roleCardByKey(roleCardCurrentKey);
    if (found) {
      renderRoleCardEditor(found);
      return;
    }
  }

  const activeItem = roleCardByKey(activeKey);
  if (activeItem) {
    renderRoleCardEditor(activeItem);
    return;
  }

  if (roleCardItems.length) {
    renderRoleCardEditor(roleCardItems[0]);
    return;
  }

  newRoleCardDraft();
}

async function refreshRoleCards() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }

  setInlineButtonLoading(roleCardsRefreshBtn, true, '读取中...');
  try {
    await loadRoleCards();
    showToast('角色卡刷新完成', '已更新角色卡列表', { tone: 'success' });
  } catch (error) {
    showToast('角色卡刷新失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(roleCardsRefreshBtn, false);
  }
}

function newRoleCardDraft() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  if (!checkRoleCardUnsavedChanges()) return;

  roleCardCurrentKey = '';
  if (roleCardSelect) roleCardSelect.value = '';
  if (roleCardKeyInput) roleCardKeyInput.value = '';
  if (roleCardNameInput) roleCardNameInput.value = '';
  if (roleCardDescriptionInput) roleCardDescriptionInput.value = '';
  if (roleCardSystemPromptInput) roleCardSystemPromptInput.value = '';
  if (roleCardToneInput) roleCardToneInput.value = '{}';
  if (roleCardConstraintsInput) roleCardConstraintsInput.value = '{}';
  if (roleCardEnabledInput) roleCardEnabledInput.checked = true;
}

function cloneRoleCard() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  const current = roleCardByKey(roleCardCurrentKey);
  if (!current) {
    showToast('复制失败', '请先选择一个角色卡', { tone: 'error' });
    return;
  }

  if (roleCardKeyInput) roleCardKeyInput.value = `${current.key}_copy`;
  if (roleCardNameInput) roleCardNameInput.value = `${current.name} Copy`;
  if (roleCardDescriptionInput) roleCardDescriptionInput.value = current.description || '';
  if (roleCardSystemPromptInput) roleCardSystemPromptInput.value = current.system_prompt || '';
  if (roleCardToneInput) roleCardToneInput.value = JSON.stringify(current.tone || {}, null, 2);
  if (roleCardConstraintsInput) roleCardConstraintsInput.value = JSON.stringify(current.constraints || {}, null, 2);
  if (roleCardEnabledInput) roleCardEnabledInput.checked = !!current.enabled;
  roleCardCurrentKey = '';
  if (roleCardSelect) roleCardSelect.value = '';
}
function validateRoleCardJson(textareaId, errorElId) {
  const ta = document.getElementById(textareaId);
  const err = document.getElementById(errorElId);
  if (!ta || !err) return true;

  const val = (ta.value || '').trim();
  if (!val) {
    err.classList.add('hidden');
    ta.style.borderColor = '';
    return true;
  }

  try {
    const parsed = JSON.parse(val);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      err.classList.add('hidden');
      ta.style.borderColor = '';
      return true;
    }
    throw new Error('Must be a JSON object {}');
  } catch (e) {
    err.textContent = `无效 JSON: ${e.message}`;
    err.classList.remove('hidden');
    ta.style.borderColor = 'var(--danger)';
    return false;
  }
}

async function saveRoleCard() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }

  const isToneOk = validateRoleCardJson('role-card-tone', 'role-card-tone-error');
  const isConstraintsOk = validateRoleCardJson('role-card-constraints', 'role-card-constraints-error');

  if (!isToneOk || !isConstraintsOk) {
    showToast('保存失败', 'JSON 格式不正确，请检查红框提示', { tone: 'error' });
    return;
  }
...

  const name = String(roleCardNameInput?.value || '').trim();
  if (!key || !name) {
    showToast('保存失败', 'key 和 name 必填', { tone: 'error' });
    return;
  }

  const payload = {
    key,
    name,
    description: String(roleCardDescriptionInput?.value || '').trim(),
    system_prompt: String(roleCardSystemPromptInput?.value || '').trim(),
    tone: tryParseJsonObject(roleCardToneInput?.value || '{}', {}),
    constraints: tryParseJsonObject(roleCardConstraintsInput?.value || '{}', {}),
    enabled: !!roleCardEnabledInput?.checked,
  };

  const existing = roleCardByKey(key);
  const isUpdate = !!existing;
  const endpoint = isUpdate ? `/api/admin/role-cards/${encodeURIComponent(key)}` : '/api/admin/role-cards';

  setInlineButtonLoading(roleCardSaveBtn, true, '保存中...');
  try {
    const res = await fetch(withApiKey(endpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await readApiPayload(res);
    if (!res.ok || !data.ok) {
      showToast('角色卡保存失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });
      return;
    }
    roleCardCurrentKey = String(data.item?.key || key).toLowerCase();
    await loadRoleCards();
    showToast('角色卡保存成功', `当前: ${roleCardCurrentKey}`, { tone: 'success' });
  } catch (error) {
    showToast('角色卡保存失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(roleCardSaveBtn, false);
  }
}

async function disableRoleCard() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  const key = String(roleCardCurrentKey || roleCardSelect?.value || '').trim().toLowerCase();
  if (!key) {
    showToast('禁用失败', '请先选择角色卡', { tone: 'error' });
    return;
  }

  if (!confirm(`确定要禁用角色卡 "${key}" 吗？此操作将使其不再参与回复生成。`)) return;

  setInlineButtonLoading(roleCardDisableBtn, true, '禁用中...');
  try {
    const res = await fetch(withApiKey(`/api/admin/role-cards/${encodeURIComponent(key)}/disable`), { method: 'POST' });
    const data = await readApiPayload(res);
    if (!res.ok || !data.ok) {
      showToast('角色卡禁用失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });
      return;
    }
    await loadRoleCards();
    showToast('角色卡已禁用', key, { tone: 'success' });
  } catch (error) {
    showToast('角色卡禁用失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(roleCardDisableBtn, false);
  }
}

async function activateRoleCard() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  const key = String(roleCardCurrentKey || roleCardSelect?.value || '').trim().toLowerCase();
  if (!key) {
    showToast('激活失败', '请先选择角色卡', { tone: 'error' });
    return;
  }

  setInlineButtonLoading(roleCardActivateBtn, true, '激活中...');
  try {
    const res = await fetch(withApiKey(`/api/admin/role-cards/${encodeURIComponent(key)}/activate`), { method: 'POST' });
    const data = await readApiPayload(res);
    if (!res.ok || !data.ok) {
      showToast('角色卡激活失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });
      return;
    }
    await loadRoleCards();
    showToast('角色卡已激活', `当前激活: ${data.active_role_card_key || key}`, { tone: 'success' });
  } catch (error) {
    showToast('角色卡激活失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(roleCardActivateBtn, false);
  }
}

async function applyStyleProfile() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  const profile = String(styleProfileSelect?.value || 'auto');
  if (!['auto', 'empathy', 'meme', 'normal'].includes(profile)) {
    showToast('风格设置失败', '无效风格值', { tone: 'error' });
    return;
  }

  setInlineButtonLoading(styleProfileApplyBtn, true, '应用中...');
  try {
    const res = await fetch(withApiKey('/api/admin/style-profile'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ style_profile: profile }),
    });
    const data = await readApiPayload(res);
    if (!res.ok || !data.ok) {
      showToast('风格设置失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });
      return;
    }
    if (styleProfileCurrentEl) styleProfileCurrentEl.textContent = `风格: ${data.style_profile}`;
    showToast('风格设置成功', `当前风格: ${data.style_profile}`, { tone: 'success' });
  } catch (error) {
    showToast('风格设置失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(styleProfileApplyBtn, false);
  }
}

async function refreshStyleProfile() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }

  setInlineButtonLoading(styleProfileRefreshBtn, true, '读取中...');
  try {
    const res = await fetch(withApiKey('/api/admin/style-profile'));
    const data = await readApiPayload(res);
    if (!res.ok || !data.ok) {
      showToast('风格读取失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });
      return;
    }
    const current = String(data.style_profile || 'auto');
    if (styleProfileSelect) styleProfileSelect.value = current;
    if (styleProfileCurrentEl) styleProfileCurrentEl.textContent = `风格: ${current}`;
  } catch (error) {
    showToast('风格读取失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(styleProfileRefreshBtn, false);
  }
}

async function applyRoleProfile() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }
  const profile = String(roleProfileSelect?.value || 'auto');
  if (!['auto', 'default', 'comfort', 'playful'].includes(profile)) {
    showToast('角色卡设置失败', '无效角色卡值', { tone: 'error' });
    return;
  }

  setInlineButtonLoading(roleProfileApplyBtn, true, '应用中...');
  try {
    const res = await fetch(withApiKey('/api/admin/role-profile'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_profile: profile }),
    });
    const data = await readApiPayload(res);
    if (!res.ok || !data.ok) {
      showToast('角色卡设置失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });
      return;
    }
    if (roleProfileCurrentEl) roleProfileCurrentEl.textContent = `角色卡: ${data.role_profile}`;
    showToast('角色卡设置成功', `当前角色卡: ${data.role_profile}`, { tone: 'success' });
  } catch (error) {
    showToast('角色卡设置失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(roleProfileApplyBtn, false);
  }
}

async function refreshRoleProfile() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }

  setInlineButtonLoading(roleProfileRefreshBtn, true, '读取中...');
  try {
    const res = await fetch(withApiKey('/api/admin/role-profile'));
    const data = await readApiPayload(res);
    if (!res.ok || !data.ok) {
      showToast('角色卡读取失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });
      return;
    }
    const current = String(data.role_profile || 'auto');
    if (roleProfileSelect) roleProfileSelect.value = current;
    if (roleProfileCurrentEl) roleProfileCurrentEl.textContent = `角色卡: ${current}`;
  } catch (error) {
    showToast('角色卡读取失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(roleProfileRefreshBtn, false);
  }
}

window.addEventListener('beforeunload', stopAutoRefresh);

const sideNavLinks = Array.from(document.querySelectorAll('.side-nav a[href^="#section-"]'));
const sideNavSectionMap = new Map();
let sideNavObserver = null;

function setActiveSideNavLink(activeId) {
  const normalized = String(activeId || '').trim();
  for (const link of sideNavLinks) {
    const targetId = String(link.getAttribute('href') || '').replace('#', '');
    const isActive = targetId === normalized;
    link.classList.toggle('side-nav-link-active', isActive);
    link.setAttribute('aria-current', isActive ? 'location' : 'false');
  }
}

function initSideNavHighlight() {
  if (!sideNavLinks.length) return;

  for (const link of sideNavLinks) {
    const hash = String(link.getAttribute('href') || '').trim();
    if (!hash.startsWith('#')) continue;
    const section = document.querySelector(hash);
    if (section) {
      sideNavSectionMap.set(hash.slice(1), section);
    }

    link.addEventListener('click', () => {
      const targetId = hash.slice(1);
      if (targetId) setActiveSideNavLink(targetId);
    });
  }

  const initialHashId = window.location.hash && window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : '';
  if (initialHashId && sideNavSectionMap.has(initialHashId)) {
    setActiveSideNavLink(initialHashId);
  } else {
    setActiveSideNavLink(sideNavSectionMap.keys().next().value || '');
  }

  if ('IntersectionObserver' in window) {
    sideNavObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible || !visible.target?.id) return;
      setActiveSideNavLink(visible.target.id);
    }, {
      root: null,
      rootMargin: '-35% 0px -50% 0px',
      threshold: [0.2, 0.4, 0.6],
    });

    for (const section of sideNavSectionMap.values()) {
      sideNavObserver.observe(section);
    }
  }

  window.addEventListener('hashchange', () => {
    const id = window.location.hash && window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : '';
    if (id && sideNavSectionMap.has(id)) {
      setActiveSideNavLink(id);
    }
  });
}

const prefs = loadPrefs();
const autoRefreshInput = document.getElementById('auto-refresh');
const autoRefreshSecondsInput = document.getElementById('auto-refresh-seconds');
const dailySimpleInput = document.getElementById('daily-simple');
const uiPrefsFileInput = document.getElementById('ui-prefs-file');
const batchApproveBtn = document.getElementById('batch-approve-btn');
const batchRetryBtn = document.getElementById('batch-retry-btn');
const cardComments = document.getElementById('card-comments');
const cardJobs = document.getElementById('card-jobs');
const cardPublished = document.getElementById('card-published');
const cardManual = document.getElementById('card-manual');
const cardAuditTotal = document.getElementById('card-audit-total');
const cardAuditOk = document.getElementById('card-audit-ok');
const cardAuditFailed = document.getElementById('card-audit-failed');
const cardAuditTopAction = document.getElementById('card-audit-top-action');
const dailyMetricsBody = document.getElementById('daily-metrics');
const dailyHeadFull = document.getElementById('daily-head-full');
const dailyHeadSimple = document.getElementById('daily-head-simple');
const jobsTableBody = document.getElementById('jobs');
const jobsCheckAll = document.getElementById('job-check-all');
const auditLogsBody = document.getElementById('audit-logs');
const jobsStatusInput = document.getElementById('status');
const jobsLimitInput = document.getElementById('limit');
const dailyDaysInput = document.getElementById('daily-days');
const auditActionInput = document.getElementById('audit-action');
const auditOkInput = document.getElementById('audit-ok');
const auditLimitInput = document.getElementById('audit-limit');
const auditSummaryDaysInput = document.getElementById('audit-summary-days');
const jobsRefreshBtn = document.getElementById('jobs-refresh-btn');
const dailyRefreshBtn = document.getElementById('daily-refresh-btn');
const auditRefreshBtn = document.getElementById('audit-refresh-btn');
const auditSummaryRefreshBtn = document.getElementById('audit-summary-refresh-btn');
const jobsExportBtn = document.getElementById('jobs-export-btn');
const auditExportBtn = document.getElementById('audit-export-btn');
const fullRefreshBtn = document.getElementById('full-refresh-btn');
const styleProfileSelect = document.getElementById('style-profile-select');
const styleProfileApplyBtn = document.getElementById('style-profile-apply-btn');
const styleProfileRefreshBtn = document.getElementById('style-profile-refresh-btn');
const styleProfileCurrentEl = document.getElementById('style-profile-current');
const roleProfileSelect = document.getElementById('role-profile-select');
const roleProfileApplyBtn = document.getElementById('role-profile-apply-btn');
const roleProfileRefreshBtn = document.getElementById('role-profile-refresh-btn');
const roleProfileCurrentEl = document.getElementById('role-profile-current');
const batchSelectedCountEl = document.getElementById('batch-selected-count');
const prefsResetBtn = document.getElementById('prefs-reset-btn');
const prefsExportBtn = document.getElementById('prefs-export-btn');
const prefsImportBtn = document.getElementById('prefs-import-btn');
const prefsSnapshotEl = document.getElementById('prefs-snapshot');
const refreshStatusEl = document.getElementById('refresh-status');
const modeChipManual = document.getElementById('mode-chip-manual');
const modeChipSimulated = document.getElementById('mode-chip-simulated');
const modeChipWebhook = document.getElementById('mode-chip-webhook');
const modeChipRealPublish = document.getElementById('mode-chip-real-publish');
const publisherModeCurrentEl = document.getElementById('publisher-mode-current');
const toastEl = document.getElementById('toast');
const toastTitleEl = document.getElementById('toast-title');
const toastContentEl = document.getElementById('toast-content');
const toastCopyBtn = document.getElementById('toast-copy');
const helpPanelEl = document.getElementById('help-panel');
const roleCardsRefreshBtn = document.getElementById('role-cards-refresh-btn');
const roleCardNewBtn = document.getElementById('role-card-new-btn');
const roleCardCloneBtn = document.getElementById('role-card-clone-btn');
const roleCardSaveBtn = document.getElementById('role-card-save-btn');
const roleCardDisableBtn = document.getElementById('role-card-disable-btn');
const roleCardActivateBtn = document.getElementById('role-card-activate-btn');
const activeRoleCardCurrentEl = document.getElementById('active-role-card-current');
const roleCardSelect = document.getElementById('role-card-select');
const roleCardKeyInput = document.getElementById('role-card-key');
const roleCardNameInput = document.getElementById('role-card-name');
const roleCardEnabledInput = document.getElementById('role-card-enabled');
const roleCardDescriptionInput = document.getElementById('role-card-description');
const roleCardSystemPromptInput = document.getElementById('role-card-system-prompt');
const roleCardToneInput = document.getElementById('role-card-tone');
const roleCardConstraintsInput = document.getElementById('role-card-constraints');
const knowledgeEntriesBody = document.getElementById('knowledge-entries');
const knowledgeRefreshBtn = document.getElementById('knowledge-refresh-btn');
const knowledgeCategoryInput = document.getElementById('knowledge-category');
const knowledgeTitleInput = document.getElementById('knowledge-title');
const knowledgeContentInput = document.getElementById('knowledge-content');
const knowledgeCreateBtn = document.getElementById('knowledge-create-btn');
const gatewayLogsBody = document.getElementById('gateway-logs');
const gatewayCommentIdInput = document.getElementById('gateway-comment-id');
const gatewayLimitInput = document.getElementById('gateway-limit');
const gatewayRefreshBtn = document.getElementById('gateway-refresh-btn');
const gatewayPublishCommentIdInput = document.getElementById('gateway-publish-comment-id');
const gatewayPublishSourceInput = document.getElementById('gateway-publish-source');
const gatewayPublishForceInput = document.getElementById('gateway-publish-force');
const gatewayPublishReplyInput = document.getElementById('gateway-publish-reply');
const gatewayPublishBtn = document.getElementById('gateway-publish-btn');
const gatewayReplyCharCountEl = document.getElementById('gateway-reply-char-count');

function updateGatewayReplyCharCount() {
  if (!gatewayPublishReplyInput || !gatewayReplyCharCountEl) return;
  const len = (gatewayPublishReplyInput.value || '').length;
  gatewayReplyCharCountEl.textContent = `${len} / 1000`;
  gatewayReplyCharCountEl.style.color = len > 900 ? 'var(--danger)' : '';
}

if (gatewayPublishReplyInput) {
  gatewayPublishReplyInput.addEventListener('input', updateGatewayReplyCharCount);
}
const commentDetailIdInput = document.getElementById('comment-detail-id');
const commentDetailQueryBtn = document.getElementById('comment-detail-query-btn');
const commentDetailClearBtn = document.getElementById('comment-detail-clear-btn');
const commentDetailResultEl = document.getElementById('comment-detail-result');
const commentDetailMetaEl = document.getElementById('comment-detail-meta');
const jobDetailIdInput = document.getElementById('job-detail-id');
const jobDetailQueryBtn = document.getElementById('job-detail-query-btn');
const jobDetailClearBtn = document.getElementById('job-detail-clear-btn');
const jobDetailResultEl = document.getElementById('job-detail-result');
const jobDetailMetaEl = document.getElementById('job-detail-meta');
const singleRetryJobIdInput = document.getElementById('single-retry-job-id');
const singleRetryForceLongInput = document.getElementById('single-retry-force-long');
const singleRetryAutoResetForceInput = document.getElementById('single-retry-auto-reset-force');
const singleRetryBtn = document.getElementById('single-retry-btn');
if (autoRefreshSecondsInput) autoRefreshSecondsInput.value = String(getAutoRefreshSeconds(prefs.autoRefreshSeconds));
if (dailySimpleInput && typeof prefs.dailySimple === 'boolean') dailySimpleInput.checked = prefs.dailySimple;
if (singleRetryAutoResetForceInput) singleRetryAutoResetForceInput.checked = prefs.singleRetryAutoResetForce !== false;
applyPublisherModeStatus(PUBLISHER_MODE);
const backToTopBtn = document.getElementById('back-to-top');

function initBackToTop() {
  if (!backToTopBtn) return;
  
  window.addEventListener('scroll', () => {
    if (window.pageYOffset > 400) {
      backToTopBtn.classList.add('show');
    } else {
      backToTopBtn.classList.remove('show');
    }
  });

  backToTopBtn.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

initBackToTop();
initSideNavHighlight();
if (autoRefreshInput && typeof prefs.autoRefreshEnabled === 'boolean') autoRefreshInput.checked = prefs.autoRefreshEnabled;
if (autoRefreshInput?.checked) toggleAutoRefresh();
refreshStyleProfile();
refreshRoleProfile();
refreshRoleCards();
initBilibiliSection();
renderPrefsSnapshot(prefs);
updateBatchActionState();

if (roleCardSelect) {
  roleCardSelect.addEventListener('change', () => {
    const nextKey = roleCardSelect.value;
    if (!nextKey) return;
    
    if (!checkRoleCardUnsavedChanges()) {
      roleCardSelect.value = roleCardCurrentKey;
      return;
    }

    const item = roleCardByKey(nextKey);
    if (item) renderRoleCardEditor(item);
  });
}

if (autoRefreshSecondsInput) {
  autoRefreshSecondsInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    if (autoRefreshInput?.checked) return;
    queueFullRefresh();
  });
}

if (commentDetailIdInput) {
  commentDetailIdInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    queryCommentDetail();
  });
}

if (jobDetailIdInput) {
  jobDetailIdInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    queryJobDetail();
  });
}

if (bilibiliVideoBvidInput) {
  bilibiliVideoBvidInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addBilibiliVideo();
    }
  });
}

if (credentialBuvid3Input) {
  const inputs = [credentialNameInput, credentialSessdataInput, credentialBiliJctInput, credentialBuvid3Input, credentialBuvid4Input, credentialExpiresInput];
  inputs.forEach(input => {
    input?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        addBilibiliCredential();
      }
    });
  });
}

if (knowledgeContentInput) {
  const inputs = [knowledgeCategoryInput, knowledgeTitleInput];
  inputs.forEach(input => {
    input?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        createKnowledgeEntry();
      }
    });
  });
}

if (gatewayCommentIdInput) {
  gatewayCommentIdInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      refreshGatewayLogs();
    }
  });
}

if (gatewayPublishReplyInput) {
  [gatewayPublishCommentIdInput, gatewayPublishSourceInput, gatewayPublishReplyInput].forEach(input => {
    input?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey || input !== gatewayPublishReplyInput)) {
        event.preventDefault();
        publishGatewayReply();
      }
    });
  });
}

if (singleRetryAutoResetForceInput) {
  singleRetryAutoResetForceInput.addEventListener('change', onSingleRetryAutoResetForceChange);
}

if (singleRetryJobIdInput) {
  singleRetryJobIdInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    retrySingleJob();
  });
}

// ==================== Bilibili Integration ====================

let bilibiliStatusData = null;
let bilibiliVideosData = [];
let bilibiliCredentialsData = [];

// DOM Elements for Bilibili
const bilibiliStatusRefreshBtn = document.getElementById('bilibili-status-refresh-btn');
const bilibiliPollBtn = document.getElementById('bilibili-poll-btn');
const bilibiliStatusIndicator = document.getElementById('bilibili-status-indicator');
const cardBilibiliEnabled = document.getElementById('card-bilibili-enabled');
const cardBilibiliPoll = document.getElementById('card-bilibili-poll');
const cardBilibiliPublish = document.getElementById('card-bilibili-publish');
const cardBilibiliVideos = document.getElementById('card-bilibili-videos');
const bilibiliVideosBody = document.getElementById('bilibili-videos');
const bilibiliCredentialsBody = document.getElementById('bilibili-credentials');
const bilibiliVideoBvidInput = document.getElementById('bilibili-video-bvid');
const bilibiliVideoPollEnabledInput = document.getElementById('bilibili-video-poll-enabled');
const bilibiliVideoAddBtn = document.getElementById('bilibili-video-add-btn');
const bilibiliVideosRefreshBtn = document.getElementById('bilibili-videos-refresh-btn');
const credentialNameInput = document.getElementById('credential-name');
const credentialSessdataInput = document.getElementById('credential-sessdata');
const credentialBiliJctInput = document.getElementById('credential-bili-jct');
const credentialBuvid3Input = document.getElementById('credential-buvid3');
const credentialBuvid4Input = document.getElementById('credential-buvid4');
const credentialExpiresInput = document.getElementById('credential-expires');
const credentialAddBtn = document.getElementById('credential-add-btn');
const credentialsRefreshBtn = document.getElementById('credentials-refresh-btn');

async function refreshBilibiliStatus() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }

  setInlineButtonLoading(bilibiliStatusRefreshBtn, true, '刷新中...');
  updateBilibiliStatusIndicator('loading', '加载中...');

  try {
    const res = await fetch(withApiKey('/api/admin/bilibili/status'));
    const data = await readApiPayload(res);

    if (!res.ok || !data.ok) {
      showToast('B站状态获取失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });
      updateBilibiliStatusIndicator('error', '获取失败');
      return;
    }

    bilibiliStatusData = data;
    renderBilibiliStatus(data);
    updateBilibiliStatusIndicator('ok', '已加载');
  } catch (error) {
    showToast('B站状态获取失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
    updateBilibiliStatusIndicator('error', '请求失败');
  } finally {
    setInlineButtonLoading(bilibiliStatusRefreshBtn, false);
  }
}

function renderBilibiliStatus(data) {
  const config = data.config || {};
  const videos = data.videos || {};

  if (cardBilibiliEnabled) {
    const enabled = config.enabled ? '已启用' : '未启用';
    cardBilibiliEnabled.textContent = enabled;
    cardBilibiliEnabled.className = 'card-value ' + (config.enabled ? 'status-ok' : 'status-warning');
  }

  if (cardBilibiliPoll) {
    const pollEnabled = config.poll_enabled ? '已启用' : '未启用';
    cardBilibiliPoll.textContent = pollEnabled + (config.poll_enabled ? ` (${config.poll_interval_seconds}s)` : '');
    cardBilibiliPoll.className = 'card-value ' + (config.poll_enabled ? 'status-ok' : 'status-warning');
  }

  if (cardBilibiliPublish) {
    const publishEnabled = config.publish_enabled ? '已启用' : '未启用';
    cardBilibiliPublish.textContent = publishEnabled;
    cardBilibiliPublish.className = 'card-value ' + (config.publish_enabled ? 'status-ok' : 'status-warning');
  }

  if (cardBilibiliVideos) {
    cardBilibiliVideos.textContent = String(videos.poll_enabled_count || 0);
  }
}

function updateBilibiliStatusIndicator(status, text) {
  if (!bilibiliStatusIndicator) return;
  bilibiliStatusIndicator.textContent = `状态: ${text}`;
  bilibiliStatusIndicator.className = 'mono status-pill';
  if (status === 'ok') {
    bilibiliStatusIndicator.classList.add('status-ok');
  } else if (status === 'error') {
    bilibiliStatusIndicator.classList.add('status-error');
  } else if (status === 'loading') {
    bilibiliStatusIndicator.classList.add('status-loading');
  } else {
    bilibiliStatusIndicator.classList.add('status-idle');
  }
}

async function refreshBilibiliVideos() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }

  setInlineButtonLoading(bilibiliVideosRefreshBtn, true, '刷新中...');

  try {
    const res = await fetch(withApiKey('/api/admin/bilibili/videos'));
    const data = await readApiPayload(res);

    if (!res.ok || !data.ok) {
      showToast('视频列表获取失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });
      return;
    }

    bilibiliVideosData = data.items || [];
    renderBilibiliVideos(bilibiliVideosData);
  } catch (error) {
    showToast('视频列表获取失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(bilibiliVideosRefreshBtn, false);
  }
}

function renderBilibiliVideos(items) {
  if (!bilibiliVideosBody) return;

  if (!items || items.length === 0) {
    bilibiliVideosBody.innerHTML = '<tr><td colspan="8" class="text-center">暂无监控视频</td></tr>';
    return;
  }

  bilibiliVideosBody.innerHTML = items.map(item => `
    <tr>
      <td>${renderIdCell(item.id, '监控视频ID')}</td>
      <td>${renderIdCell(item.bvid, 'BV号')}</td>
      <td>${escapeHtml(item.title || '-')}</td>
      <td>
        <span class="status-pill ${item.poll_enabled ? 'status-ok' : 'status-warning'}">
          ${item.poll_enabled ? '启用' : '禁用'}
        </span>
      </td>
      <td>${renderTimestamp(item.last_polled_at)}</td>
      <td>
        <span class="status-pill ${item.last_poll_status === 'ok' ? 'status-ok' : item.last_poll_status === 'error' ? 'status-error' : 'status-idle'}" title="${escapeHtml(item.last_poll_error || '')}">
          ${escapeHtml(item.last_poll_status || 'unknown')}
        </span>
      </td>
      <td>${item.last_rpid || 0}</td>
      <td>
        <button class="btn-ghost btn-sm" onclick="toggleBilibiliVideoPoll(${item.id}, ${!item.poll_enabled}, this)">
          ${item.poll_enabled ? '禁用' : '启用'}
        </button>
        <button class="btn-ghost btn-sm" onclick="syncBilibiliVideo(${item.id}, this)">同步</button>
        <button class="btn-ghost btn-sm btn-danger" onclick="deleteBilibiliVideo(${item.id}, this)">删除</button>
      </td>
    </tr>
  `).join('');
}

async function addBilibiliVideo() {
  const bvid = (bilibiliVideoBvidInput?.value || '').trim();
  const pollEnabled = bilibiliVideoPollEnabledInput?.checked !== false;

  if (!bvid) {
    showToast('添加失败', '请输入 BV 号', { tone: 'warning' });
    return;
  }

  // BVID 格式验证
  if (!/^BV[a-zA-Z0-9]{10}$/.test(bvid)) {
    showToast('添加失败', 'BV 号格式无效 (应为 BV + 10位字母数字)', { tone: 'warning' });
    return;
  }

  setInlineButtonLoading(bilibiliVideoAddBtn, true, '添加中...');

  try {
    const res = await fetch(withApiKey('/api/admin/bilibili/videos'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bvid, poll_enabled: pollEnabled }),
    });
    const data = await readApiPayload(res);

    if (!res.ok || !data.ok) {
      showToast('添加失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });
      return;
    }

    showToast('添加成功', `视频 ${bvid} 已添加`, { tone: 'success' });
    if (bilibiliVideoBvidInput) bilibiliVideoBvidInput.value = '';
    refreshBilibiliVideos();
    refreshBilibiliStatus();
  } catch (error) {
    showToast('添加失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(bilibiliVideoAddBtn, false);
  }
}

async function toggleBilibiliVideoPoll(videoId, enable, btn) {
  if (btn) setInlineButtonLoading(btn, true, enable ? '启用中...' : '禁用中...');
  try {
    const res = await fetch(withApiKey(`/api/admin/bilibili/videos/${videoId}/toggle-poll`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poll_enabled: enable }),
    });
    const data = await readApiPayload(res);

    if (!res.ok || !data.ok) {
      showToast('操作失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });
      return;
    }

    showToast('操作成功', enable ? '已启用轮询' : '已禁用轮询', { tone: 'success' });
    refreshBilibiliVideos();
    refreshBilibiliStatus();
  } catch (error) {
    showToast('操作失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    if (btn) setInlineButtonLoading(btn, false);
  }
}

async function syncBilibiliVideo(videoId, btn) {
  if (btn) setInlineButtonLoading(btn, true, '同步中...');
  try {
    const res = await fetch(withApiKey(`/api/admin/bilibili/videos/${videoId}/sync`), {
      method: 'POST',
    });
    const data = await readApiPayload(res);

    if (!res.ok || !data.ok) {
      showToast('同步失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });
      return;
    }

    showToast('同步成功', '视频信息已更新', { tone: 'success' });
    refreshBilibiliVideos();
  } catch (error) {
    showToast('同步失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    if (btn) setInlineButtonLoading(btn, false);
  }
}

async function deleteBilibiliVideo(videoId, btn) {
  if (!confirm('确定要删除此视频监控吗？')) return;
  if (btn) setInlineButtonLoading(btn, true, '删除中...');

  try {
    const res = await fetch(withApiKey(`/api/admin/bilibili/videos/${videoId}`), {
      method: 'DELETE',
    });
    const data = await readApiPayload(res);

    if (!res.ok || !data.ok) {
      showToast('删除失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });
      return;
    }

    showToast('删除成功', '视频监控已删除', { tone: 'success' });
    refreshBilibiliVideos();
    refreshBilibiliStatus();
  } catch (error) {
    showToast('删除失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    if (btn) setInlineButtonLoading(btn, false);
  }
}

async function triggerBilibiliPoll() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }

  setInlineButtonLoading(bilibiliPollBtn, true, '轮询中...');

  try {
    const res = await fetch(withApiKey('/api/admin/bilibili/poll'), {
      method: 'POST',
    });
    const data = await readApiPayload(res);

    if (!res.ok || !data.ok) {
      showToast('轮询失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });
      return;
    }

    const result = data.result || {};
    const videos = result.videos || 0;
    const comments = result.comments || 0;
    const injected = result.events_injected || 0;

    showToast(
      '轮询完成',
      `扫描 ${videos} 个视频，发现 ${comments} 条评论，注入 ${injected} 条`,
      { tone: 'success', copyable: true }
    );

    refreshBilibiliVideos();
  } catch (error) {
    showToast('轮询失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(bilibiliPollBtn, false);
  }
}

async function refreshBilibiliCredentials() {
  if (isGlobalRefreshLocked()) {
    showBusyToast();
    return;
  }

  setInlineButtonLoading(credentialsRefreshBtn, true, '刷新中...');

  try {
    const res = await fetch(withApiKey('/api/admin/bilibili/credentials'));
    const data = await readApiPayload(res);

    if (!res.ok || !data.ok) {
      showToast('凭证列表获取失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });
      return;
    }

    bilibiliCredentialsData = data.items || [];
    renderBilibiliCredentials(bilibiliCredentialsData);
  } catch (error) {
    showToast('凭证列表获取失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(credentialsRefreshBtn, false);
  }
}

function renderBilibiliCredentials(items) {
  if (!bilibiliCredentialsBody) return;

  if (!items || items.length === 0) {
    bilibiliCredentialsBody.innerHTML = '<tr><td colspan="8" class="text-center">暂无凭证</td></tr>';
    return;
  }

  bilibiliCredentialsBody.innerHTML = items.map(item => `
    <tr class="${item.is_active ? 'row-active' : ''}">
      <td>${renderIdCell(item.id, '凭证ID')}</td>
      <td>${escapeHtml(item.name)}</td>
      <td>
        <span class="status-pill ${item.is_active ? 'status-ok' : 'status-warning'}">
          ${item.is_active ? '激活' : '未激活'}
        </span>
      </td>
      <td class="mono">${item.has_sessdata ? '***已设置***' : '-'}</td>
      <td class="mono">${escapeHtml(item.buvid3 || '-')}</td>
      <td>${item.expires_at ? formatIsoDateTime(item.expires_at) : '-'}</td>
      <td>${item.last_used_at ? formatIsoDateTime(item.last_used_at) : '-'}</td>
      <td>
        <button class="btn-ghost btn-sm" onclick="activateBilibiliCredential(${item.id}, this)" ${item.is_active ? 'disabled' : ''}>
          激活
        </button>
        <button class="btn-ghost btn-sm btn-danger" onclick="deleteBilibiliCredential(${item.id}, this)">删除</button>
      </td>
    </tr>
  `).join('');
}

async function addBilibiliCredential() {
  const name = (credentialNameInput?.value || '').trim();
  const sessdata = (credentialSessdataInput?.value || '').trim();
  const biliJct = (credentialBiliJctInput?.value || '').trim();
  const buvid3 = (credentialBuvid3Input?.value || '').trim();
  const buvid4 = (credentialBuvid4Input?.value || '').trim();
  const expiresAt = credentialExpiresInput?.value || null;

  if (!name) {
    showToast('添加失败', '请输入凭证名称', { tone: 'warning' });
    return;
  }
  if (!sessdata) {
    showToast('添加失败', '请输入 SESSDATA', { tone: 'warning' });
    return;
  }
  if (!biliJct) {
    showToast('添加失败', '请输入 bili_jct', { tone: 'warning' });
    return;
  }
  if (!buvid3) {
    showToast('添加失败', '请输入 buvid3', { tone: 'warning' });
    return;
  }

  setInlineButtonLoading(credentialAddBtn, true, '添加中...');

  try {
    const payload = {
      name,
      sessdata,
      bili_jct: biliJct,
      buvid3,
    };
    if (buvid4) payload.buvid4 = buvid4;
    if (expiresAt) payload.expires_at = expiresAt;

    const res = await fetch(withApiKey('/api/admin/bilibili/credentials'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await readApiPayload(res);

    if (!res.ok || !data.ok) {
      showToast('添加失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });
      return;
    }

    showToast('添加成功', '凭证已创建', { tone: 'success' });

    // 清空表单
    if (credentialNameInput) credentialNameInput.value = '';
    if (credentialSessdataInput) credentialSessdataInput.value = '';
    if (credentialBiliJctInput) credentialBiliJctInput.value = '';
    if (credentialBuvid3Input) credentialBuvid3Input.value = '';
    if (credentialBuvid4Input) credentialBuvid4Input.value = '';
    if (credentialExpiresInput) credentialExpiresInput.value = '';

    refreshBilibiliCredentials();
  } catch (error) {
    showToast('添加失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    setInlineButtonLoading(credentialAddBtn, false);
  }
}

async function activateBilibiliCredential(credentialId, btn) {
  if (btn) setInlineButtonLoading(btn, true, '激活中...');
  try {
    const res = await fetch(withApiKey(`/api/admin/bilibili/credentials/${credentialId}/activate`), {
      method: 'POST',
    });
    const data = await readApiPayload(res);

    if (!res.ok || !data.ok) {
      showToast('激活失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });
      return;
    }

    showToast('激活成功', '凭证已激活', { tone: 'success' });
    refreshBilibiliCredentials();
    refreshBilibiliStatus();
  } catch (error) {
    showToast('激活失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    if (btn) setInlineButtonLoading(btn, false);
  }
}

async function deleteBilibiliCredential(credentialId, btn) {
  if (!confirm('确定要删除此凭证吗？')) return;
  if (btn) setInlineButtonLoading(btn, true, '删除中...');

  try {
    const res = await fetch(withApiKey(`/api/admin/bilibili/credentials/${credentialId}`), {
      method: 'DELETE',
    });
    const data = await readApiPayload(res);

    if (!res.ok || !data.ok) {
      showToast('删除失败', getErrorText(data, '请求失败'), { copyable: true, tone: 'error' });
      return;
    }

    showToast('删除成功', '凭证已删除', { tone: 'success' });
    refreshBilibiliCredentials();
    refreshBilibiliStatus();
  } catch (error) {
    showToast('删除失败', getErrorText(error, '请求失败'), { copyable: true, tone: 'error' });
  } finally {
    if (btn) setInlineButtonLoading(btn, false);
  }
}

// Initialize Bilibili section
function initBilibiliSection() {
  refreshBilibiliStatus();
  refreshBilibiliVideos();
  refreshBilibiliCredentials();
}

// Register Bilibili refresh for full refresh
function refreshBilibiliAll() {
  refreshBilibiliStatus();
  refreshBilibiliVideos();
  refreshBilibiliCredentials();
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    hideToast();
    closeHelpPanel();
    return;
  }

  if ((event.key === '?' || (event.key === '/' && event.shiftKey))) {
    if (isEditableTarget(event.target)) return;
    event.preventDefault();
    toggleHelpPanel();
    return;
  }

  if (event.key !== 'r' && event.key !== 'R') return;
  if (isEditableTarget(event.target)) return;
  event.preventDefault();
  queueFullRefresh();
});

if (!autoRefreshInput?.checked) queueFullRefresh();
