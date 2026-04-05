import { createAdminApi } from '../api/admin.js';
import { escapeHtml, formatIsoDateTime, renderTimestamp } from '../utils/format.js';
import { renderBoolBadge } from '../components/badge.js';
import { showToast } from '../components/toast.js';

const api = createAdminApi();
const bilibiliBvidPattern = /^BV[a-zA-Z0-9]{10}$/;
const bilibiliErrorMessages = {
  unauthorized: '未授权，请检查管理 API Key。',
  bilibili_not_configured: '请先添加并激活可用的 B 站凭证。',
  bilibili_sync_failed: '同步失败，请稍后重试。',
  invalid_poll_enabled: '轮询开关参数无效。',
  invalid_video_id: '视频标识无效。',
  invalid_credential_id: '凭证标识无效。',
  video_not_found: '视频不存在或已删除。',
  credential_not_found: '凭证不存在或已删除。',
  invalid_bvid_format: 'BVID 格式不正确。',
  bvid_required: 'BVID 不能为空。',
  name_required: '名称不能为空。',
  sessdata_required: 'SESSDATA 不能为空。',
  bili_jct_required: 'bili_jct 不能为空。',
  buvid3_required: 'buvid3 不能为空。',
  invalid_expires_at: '过期时间格式无效。',
  request_failed: '请求失败，请稍后重试。',
};
const bilibiliBlockingReasonMessages = {
  'auth:no active credential': '缺少可用的激活凭证。',
  'dependency:diagnostics_unavailable': '诊断信息暂时不可用。',
};
const bilibiliPublishModeMessages = {
  manual_queue: '人工队列',
  simulated: '模拟发布',
  webhook: 'Webhook',
  real_publish: '真实发布',
  native_bilibili: '原生 B 站发布',
};
const bilibiliPollStatusMessages = {
  ok: { label: '成功', cls: 'badge-success' },
  no_new: { label: '无新增', cls: 'badge-muted' },
  error: { label: '失败', cls: 'badge-danger' },
};
const bilibiliPollErrorMessages = {
  no_aid: '缺少视频 aid，暂时无法轮询。',
  retry_exhausted: '评论抓取重试耗尽。',
};
const bilibiliVideoPageSize = 50;
const bilibiliCredentialExpiringSoonMs = 7 * 24 * 60 * 60 * 1000;

function getBilibiliErrorMessage(error) {
  const raw = error instanceof Error ? error.message : String(error ?? 'request_failed');
  return bilibiliErrorMessages[raw] || raw;
}

function validateBilibiliVideoInput(bvid) {
  if (!bvid) return 'bvid_required';
  if (!bilibiliBvidPattern.test(bvid)) return 'invalid_bvid_format';
  return null;
}

function validateBilibiliCredentialInput(payload) {
  if (!payload.name) return 'name_required';
  if (!payload.sessdata) return 'sessdata_required';
  if (!payload.bili_jct) return 'bili_jct_required';
  if (!payload.buvid3) return 'buvid3_required';
  if (payload.expires_at === null) {
    return 'invalid_expires_at';
  }
  return null;
}

function normalizeOptionalDateTimeValue(value) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function formatBilibiliBlockingReasons(reasons) {
  const items = Array.isArray(reasons) ? reasons.filter(Boolean) : [];
  return items
    .map((reason) => bilibiliBlockingReasonMessages[reason] || reason)
    .join('；');
}

function formatBilibiliPublishMode(mode) {
  const normalized = String(mode ?? '').trim().toLowerCase();
  return bilibiliPublishModeMessages[normalized] || normalized || '-';
}

function formatBilibiliPollInterval(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return '-';
  if (value % 60 === 0) return `${value / 60} 分钟`;
  return `${value} 秒`;
}

function formatBilibiliRateLimit(limitPerMinute) {
  const value = Number(limitPerMinute);
  if (!Number.isFinite(value) || value <= 0) return '-';
  return `${value} 次/分钟`;
}

function formatBilibiliCoverage(enabledCount, totalCount) {
  const total = Number(totalCount ?? 0);
  if (!Number.isFinite(total) || total <= 0) {
    return '暂无视频';
  }
  const enabled = Number(enabledCount ?? 0);
  const safeEnabled = Number.isFinite(enabled)
    ? Math.min(total, Math.max(0, enabled))
    : 0;
  const percentage = ((safeEnabled / total) * 100).toFixed(1).replace(/\.0$/, '');
  return `覆盖率 ${percentage}%`;
}

function renderBilibiliPollStatus(status, error, lastRpid) {
  const normalized = String(status ?? '').trim().toLowerCase();
  if (!normalized) return '-';
  const info = bilibiliPollStatusMessages[normalized] || { label: normalized, cls: 'badge-muted' };
  const errorText = normalized === 'error' && error
    ? bilibiliPollErrorMessages[String(error).trim().toLowerCase()] || String(error)
    : '';
  const titleAttr = errorText ? ` title="${escapeHtml(errorText)}"` : '';
  const cursorText = typeof lastRpid === 'number' && Number.isFinite(lastRpid)
    ? `评论游标: ${lastRpid}`
    : '';
  const hints = [errorText, cursorText]
    .filter(Boolean)
    .map((text) => `<div class="form-hint" style="margin-top:4px;">${escapeHtml(text)}</div>`)
    .join('');
  return `<span class="status-badge ${info.cls}"${titleAttr}>${escapeHtml(info.label)}</span>${hints}`;
}

function formatBilibiliStatusTime(value) {
  return value ? formatIsoDateTime(value) : '-';
}

function parseBilibiliPollFilter(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

function getBilibiliVideoEmptyMessage(filterValue) {
  if (filterValue === 'true') return '暂无轮询中视频';
  if (filterValue === 'false') return '暂无已停用视频';
  return '暂无视频';
}

function hasBilibiliVideoAid(video) {
  return typeof video?.aid === 'number' && Number.isFinite(video.aid);
}

function countBilibiliVideosMissingAid(items) {
  return items.filter((item) => !hasBilibiliVideoAid(item)).length;
}

function countBilibiliVideosWithPollEnabled(items) {
  return items.filter((item) => Boolean(item?.poll_enabled)).length;
}

function countBilibiliVideosWithPollEnabledButMissingAid(items) {
  return items.filter((item) => Boolean(item?.poll_enabled) && !hasBilibiliVideoAid(item)).length;
}

function countBilibiliVideosWithPollDisabledButSyncReady(items) {
  return items.filter((item) => !item?.poll_enabled && hasBilibiliVideoAid(item)).length;
}

function countBilibiliVideosWithPollEnabledButNeverPolled(items) {
  return items.filter((item) => item?.poll_enabled && !item?.last_polled_at).length;
}

function countBilibiliVideosWithPollError(items) {
  return items.filter((item) => String(item?.last_poll_status ?? '').trim().toLowerCase() === 'error').length;
}

function countBilibiliVideosWithHealthyPoll(items) {
  return items.filter((item) => {
    const status = String(item?.last_poll_status ?? '').trim().toLowerCase();
    return status === 'ok' || status === 'no_new';
  }).length;
}

function countBilibiliVideosWithSuccessfulPoll(items) {
  return items.filter((item) => String(item?.last_poll_status ?? '').trim().toLowerCase() === 'ok').length;
}

function countBilibiliVideosWithNoNewPoll(items) {
  return items.filter((item) => String(item?.last_poll_status ?? '').trim().toLowerCase() === 'no_new').length;
}

function countBilibiliVideosNeverPolled(items) {
  return items.filter((item) => !item?.last_polled_at).length;
}

function countBilibiliVideosSyncReadyButNeverPolled(items) {
  return items.filter((item) => hasBilibiliVideoAid(item) && !item?.last_polled_at).length;
}

function countBilibiliVideosPolledButNoCursor(items) {
  return items.filter((item) => (
    item?.last_polled_at
    && !(typeof item?.last_rpid === 'number' && Number.isFinite(item.last_rpid))
  )).length;
}

function countBilibiliVideosWithOwner(items) {
  return items.filter((item) => typeof item?.owner_mid === 'number' && Number.isFinite(item.owner_mid)).length;
}

function countBilibiliVideosWithTitle(items) {
  return items.filter((item) => String(item?.title ?? '').trim().length > 0).length;
}

function countBilibiliVideosWithComments(items) {
  return items.filter((item) => Number(item?.comment_count ?? 0) > 0).length;
}

function countBilibiliVideosPolledWithoutComments(items) {
  return items.filter((item) => item?.last_polled_at && Number(item?.comment_count ?? 0) <= 0).length;
}

function countBilibiliVideosWithCursor(items) {
  return items.filter((item) => typeof item?.last_rpid === 'number' && Number.isFinite(item.last_rpid)).length;
}

function countBilibiliVideosWithCommentsButNoCursor(items) {
  return items.filter((item) => (
    Number(item?.comment_count ?? 0) > 0
    && !(typeof item?.last_rpid === 'number' && Number.isFinite(item.last_rpid))
  )).length;
}

function countBilibiliVideosWithoutCommentsButWithCursor(items) {
  return items.filter((item) => (
    Number(item?.comment_count ?? 0) <= 0
    && typeof item?.last_rpid === 'number'
    && Number.isFinite(item.last_rpid)
  )).length;
}

function countBilibiliVideosWithCompleteMetadata(items) {
  return items.filter((item) => (
    hasBilibiliVideoAid(item)
    && String(item?.title ?? '').trim().length > 0
    && typeof item?.owner_mid === 'number'
    && Number.isFinite(item.owner_mid)
  )).length;
}

function countBilibiliVideosPolledWithIncompleteMetadata(items) {
  return items.filter((item) => (
    item?.last_polled_at
    && !(
      hasBilibiliVideoAid(item)
      && String(item?.title ?? '').trim().length > 0
      && typeof item?.owner_mid === 'number'
      && Number.isFinite(item.owner_mid)
    )
  )).length;
}

function sumBilibiliVideoCommentCount(items) {
  return items.reduce((total, item) => {
    const count = Number(item?.comment_count ?? 0);
    return total + (Number.isFinite(count) && count > 0 ? count : 0);
  }, 0);
}

function renderBilibiliVideoIdentity(video) {
  const hasAid = hasBilibiliVideoAid(video);
  const hint = hasAid
    ? `aid: ${video.aid}`
    : bilibiliPollErrorMessages.no_aid;
  return `${escapeHtml(video?.bvid || '-')}${hint ? `<div class="form-hint" style="margin-top:4px;">${escapeHtml(hint)}</div>` : ''}`;
}

function renderBilibiliVideoTitle(video) {
  const hints = [];
  if (typeof video?.owner_mid === 'number' && Number.isFinite(video.owner_mid)) {
    hints.push(`UP主 MID: ${video.owner_mid}`);
  }
  if (video?.updated_at) {
    hints.push(`更新: ${formatIsoDateTime(video.updated_at)}`);
  }
  if (video?.created_at) {
    hints.push(`创建: ${formatIsoDateTime(video.created_at)}`);
  }
  return `${escapeHtml(video?.title || '-')}${hints
    .map((text) => `<div class="form-hint" style="margin-top:4px;">${escapeHtml(text)}</div>`)
    .join('')}`;
}

function renderBilibiliSyncButton(video) {
  const hasAid = hasBilibiliVideoAid(video);
  const disabledAttr = hasAid ? '' : ' disabled';
  const titleAttr = hasAid ? '' : ` title="${escapeHtml(bilibiliPollErrorMessages.no_aid)}"`;
  const id = escapeHtml(video.id || video.video_id);
  return `<button class="btn btn-sm bili-sync" data-id="${id}" data-has-aid="${hasAid ? 'true' : 'false'}"${disabledAttr}${titleAttr}>同步</button>`;
}

function formatBilibiliVideoSummary(total, renderedCount, filterValue, offset = 0, limit = bilibiliVideoPageSize, items = []) {
  const filterLabel = filterValue === 'true'
    ? '轮询中'
    : filterValue === 'false'
      ? '已停用'
      : '全部';
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pollEnabledCount = countBilibiliVideosWithPollEnabled(items);
  const pollDisabledCount = Math.max(0, items.length - pollEnabledCount);
  const pollEnabledMissingAidCount = countBilibiliVideosWithPollEnabledButMissingAid(items);
  const pollDisabledSyncReadyCount = countBilibiliVideosWithPollDisabledButSyncReady(items);
  const pollEnabledNeverPolledCount = countBilibiliVideosWithPollEnabledButNeverPolled(items);
  const missingAidCount = countBilibiliVideosMissingAid(items);
  const syncReadyCount = Math.max(0, items.length - missingAidCount);
  const pollErrorCount = countBilibiliVideosWithPollError(items);
  const healthyPollCount = countBilibiliVideosWithHealthyPoll(items);
  const successfulPollCount = countBilibiliVideosWithSuccessfulPoll(items);
  const noNewPollCount = countBilibiliVideosWithNoNewPoll(items);
  const neverPolledCount = countBilibiliVideosNeverPolled(items);
  const syncReadyNeverPolledCount = countBilibiliVideosSyncReadyButNeverPolled(items);
  const polledCount = Math.max(0, items.length - neverPolledCount);
  const ownerCount = countBilibiliVideosWithOwner(items);
  const missingOwnerCount = Math.max(0, items.length - ownerCount);
  const titledCount = countBilibiliVideosWithTitle(items);
  const missingTitleCount = Math.max(0, items.length - titledCount);
  const videosWithComments = countBilibiliVideosWithComments(items);
  const videosWithoutComments = Math.max(0, items.length - videosWithComments);
  const polledWithoutCommentsCount = countBilibiliVideosPolledWithoutComments(items);
  const videosWithCursor = countBilibiliVideosWithCursor(items);
  const commentedWithoutCursorCount = countBilibiliVideosWithCommentsButNoCursor(items);
  const cursorWithoutCommentsCount = countBilibiliVideosWithoutCommentsButWithCursor(items);
  const videosWithoutCursor = Math.max(0, items.length - videosWithCursor);
  const polledWithoutCursorCount = countBilibiliVideosPolledButNoCursor(items);
  const completeMetadataCount = countBilibiliVideosWithCompleteMetadata(items);
  const incompleteMetadataCount = Math.max(0, items.length - completeMetadataCount);
  const polledIncompleteMetadataCount = countBilibiliVideosPolledWithIncompleteMetadata(items);
  const commentCount = sumBilibiliVideoCommentCount(items);
  const missingAidText = missingAidCount > 0 ? `，当前页缺少 aid ${missingAidCount} 条` : '';
  const pollEnabledText = filterValue === '' && pollEnabledCount > 0 ? `，当前页轮询开启 ${pollEnabledCount} 条` : '';
  const pollDisabledText = filterValue === '' && pollDisabledCount > 0 ? `，当前页轮询停用 ${pollDisabledCount} 条` : '';
  const pollEnabledMissingAidText = filterValue === '' && pollEnabledMissingAidCount > 0 ? `，轮询开启但缺少 aid ${pollEnabledMissingAidCount} 条` : '';
  const pollDisabledSyncReadyText = filterValue === '' && pollDisabledSyncReadyCount > 0 ? `，轮询停用但可同步 ${pollDisabledSyncReadyCount} 条` : '';
  const pollEnabledNeverPolledText = filterValue === '' && pollEnabledNeverPolledCount > 0 ? `，轮询开启但尚未轮询 ${pollEnabledNeverPolledCount} 条` : '';
  const syncReadyText = syncReadyCount > 0 ? `，可同步 ${syncReadyCount} 条` : '';
  const healthyPollText = healthyPollCount > 0 ? `，正常轮询 ${healthyPollCount} 条` : '';
  const successfulPollText = successfulPollCount > 0 ? `，成功轮询 ${successfulPollCount} 条` : '';
  const noNewPollText = noNewPollCount > 0 ? `，无新增 ${noNewPollCount} 条` : '';
  const pollErrorText = pollErrorCount > 0 ? `，轮询失败 ${pollErrorCount} 条` : '';
  const polledCountText = polledCount > 0 ? `，已有轮询记录 ${polledCount} 条` : '';
  const neverPolledText = neverPolledCount > 0 ? `，尚未轮询 ${neverPolledCount} 条` : '';
  const syncReadyNeverPolledText = syncReadyNeverPolledCount > 0 ? `，可同步但尚未轮询 ${syncReadyNeverPolledCount} 条` : '';
  const ownerCountText = ownerCount > 0 ? `，已识别 UP 主 ${ownerCount} 条` : '';
  const missingOwnerText = missingOwnerCount > 0 ? `，缺少 UP 主 ${missingOwnerCount} 条` : '';
  const titledCountText = titledCount > 0 ? `，已抓取标题 ${titledCount} 条` : '';
  const missingTitleText = missingTitleCount > 0 ? `，缺少标题 ${missingTitleCount} 条` : '';
  const completeMetadataText = completeMetadataCount > 0 ? `，信息完整 ${completeMetadataCount} 条` : '';
  const incompleteMetadataText = incompleteMetadataCount > 0 ? `，信息不完整 ${incompleteMetadataCount} 条` : '';
  const polledIncompleteMetadataText = polledIncompleteMetadataCount > 0 ? `，已轮询但信息不完整 ${polledIncompleteMetadataCount} 条` : '';
  const commentedVideoText = videosWithComments > 0 ? `，已有评论视频 ${videosWithComments} 条` : '';
  const uncommentedVideoText = videosWithoutComments > 0 ? `，无评论视频 ${videosWithoutComments} 条` : '';
  const polledWithoutCommentsText = polledWithoutCommentsCount > 0 ? `，已轮询但无评论 ${polledWithoutCommentsCount} 条` : '';
  const cursorVideoText = videosWithCursor > 0 ? `，已有评论游标 ${videosWithCursor} 条` : '';
  const commentedWithoutCursorText = commentedWithoutCursorCount > 0 ? `，有评论但无游标 ${commentedWithoutCursorCount} 条` : '';
  const cursorWithoutCommentsText = cursorWithoutCommentsCount > 0 ? `，无评论但有游标 ${cursorWithoutCommentsCount} 条` : '';
  const missingCursorVideoText = videosWithoutCursor > 0 ? `，无评论游标 ${videosWithoutCursor} 条` : '';
  const polledWithoutCursorText = polledWithoutCursorCount > 0 ? `，已轮询但无游标 ${polledWithoutCursorCount} 条` : '';
  const commentCountText = commentCount > 0 ? `，关联评论 ${commentCount} 条` : '';
  return `筛选: ${filterLabel}，共 ${total} 条，当前展示 ${renderedCount} 条，第 ${currentPage}/${totalPages} 页${pollEnabledText}${pollDisabledText}${missingAidText}${pollEnabledMissingAidText}${pollDisabledSyncReadyText}${pollEnabledNeverPolledText}${syncReadyText}${healthyPollText}${successfulPollText}${noNewPollText}${pollErrorText}${polledCountText}${neverPolledText}${syncReadyNeverPolledText}${ownerCountText}${missingOwnerText}${titledCountText}${missingTitleText}${completeMetadataText}${incompleteMetadataText}${polledIncompleteMetadataText}${commentedVideoText}${uncommentedVideoText}${polledWithoutCommentsText}${cursorVideoText}${commentedWithoutCursorText}${cursorWithoutCommentsText}${missingCursorVideoText}${polledWithoutCursorText}${commentCountText}`;
}

function formatBilibiliPollResultMessage(result, options = {}) {
  const videos = Number(result?.videos ?? 0);
  const comments = Number(result?.comments ?? 0);
  const events = Number(result?.events_injected ?? comments);
  const subject = options.subject || (videos === 1 ? '视频' : '轮询');

  if (comments > 0 || events > 0) {
    return `${subject}完成，处理 ${videos} 个视频，新增 ${comments} 条评论，注入 ${events} 个事件。`;
  }
  if (videos > 0) {
    return `${subject}完成，处理 ${videos} 个视频，暂无新增评论。`;
  }
  return `${subject}完成，暂无可处理视频。`;
}

function getBilibiliCredentialExpiryState(value, now = Date.now()) {
  if (!value) {
    return {
      hasExpiry: false,
      expired: false,
      expiringSoon: false,
      label: '未设置',
      cls: 'badge-muted',
      detail: '',
    };
  }

  const expiresAt = new Date(value);
  if (Number.isNaN(expiresAt.getTime())) {
    return {
      hasExpiry: true,
      expired: false,
      expiringSoon: false,
      label: '时间异常',
      cls: 'badge-danger',
      detail: String(value),
    };
  }

  const diffMs = expiresAt.getTime() - now;
  if (diffMs <= 0) {
    return {
      hasExpiry: true,
      expired: true,
      expiringSoon: false,
      label: '已过期',
      cls: 'badge-danger',
      detail: formatIsoDateTime(value),
    };
  }

  if (diffMs <= bilibiliCredentialExpiringSoonMs) {
    return {
      hasExpiry: true,
      expired: false,
      expiringSoon: true,
      label: '即将过期',
      cls: 'badge-warning',
      detail: formatIsoDateTime(value),
    };
  }

  return {
    hasExpiry: true,
    expired: false,
    expiringSoon: false,
    label: '有效',
    cls: 'badge-success',
    detail: formatIsoDateTime(value),
  };
}

function renderBilibiliCredentialExpiry(value) {
  const info = getBilibiliCredentialExpiryState(value);
  const detail = info.detail
    ? `<div class="form-hint" style="margin-top:4px;">${escapeHtml(info.detail)}</div>`
    : '';
  return `<span class="status-badge ${info.cls}">${escapeHtml(info.label)}</span>${detail}`;
}

function renderBilibiliCredentialName(item, fallbackLabel = '-') {
  const hints = [];
  if (item?.updated_at) {
    hints.push(`更新: ${formatIsoDateTime(item.updated_at)}`);
  }
  if (item?.created_at) {
    hints.push(`创建: ${formatIsoDateTime(item.created_at)}`);
  }
  return `${escapeHtml(item?.name || fallbackLabel)}${hints
    .map((text) => `<div class="form-hint" style="margin-top:4px;">${escapeHtml(text)}</div>`)
    .join('')}`;
}

function getBilibiliCredentialExpiryColor(expiryState) {
  if (expiryState?.cls === 'badge-danger') return 'var(--danger-color)';
  if (expiryState?.cls === 'badge-warning') return 'var(--warning-color)';
  if (expiryState?.cls === 'badge-success') return 'var(--success-color)';
  return 'var(--grey-2)';
}

function isBilibiliCredentialConfigured(item) {
  return Boolean(item?.has_sessdata && item?.has_bili_jct && item?.buvid3);
}

function getBilibiliCredentialMissingFields(item) {
  const missing = [];
  if (!item?.has_sessdata) missing.push('SESSDATA');
  if (!item?.has_bili_jct) missing.push('bili_jct');
  if (!item?.buvid3) missing.push('buvid3');
  return missing;
}

function formatBilibiliCredentialHealth(credentialPresent, credentialComplete) {
  if (!credentialPresent) return '未配置凭证';
  if (credentialComplete) return '凭证字段完整';
  return '凭证字段缺失';
}

function formatBilibiliDiagnosticHealth(diagnostics) {
  const authReady = Boolean(diagnostics?.checks?.auth?.ready);
  const workerOrPublishReady = Boolean(diagnostics?.checks?.worker_or_publish?.ready);
  const pollingWorkerEnabled = Boolean(diagnostics?.signals?.polling_worker_enabled);
  const nativePublishEnabled = Boolean(diagnostics?.signals?.native_publish_enabled);
  const authRequired = pollingWorkerEnabled || nativePublishEnabled;
  if (!authRequired) {
    return '当前无需鉴权';
  }
  return `${authReady ? '鉴权已就绪' : '鉴权未就绪'}，${workerOrPublishReady ? '执行链路可用' : '执行链路阻塞'}`;
}

function formatBilibiliPublishModeHealth(diagnostics) {
  const publishModeConfigReady = Boolean(diagnostics?.signals?.publish_mode_config_ready);
  const nativePublishEnabled = Boolean(diagnostics?.signals?.native_publish_enabled);
  const pollingWorkerEnabled = Boolean(diagnostics?.signals?.polling_worker_enabled);
  return [
    publishModeConfigReady ? '模式配置就绪' : '模式配置缺失',
    nativePublishEnabled ? '原生发布启用' : '原生发布停用',
    pollingWorkerEnabled ? '轮询链路启用' : '轮询链路停用',
  ].join('，');
}

function renderBilibiliCredentialFingerprint(item) {
  const summary = [
    item?.has_sessdata ? 'SESSDATA' : '',
    item?.has_bili_jct ? 'bili_jct' : '',
    item?.buvid3 ? `buvid3:${item.buvid3}` : '',
  ].filter(Boolean).join(' / ') || '-';
  const hint = isBilibiliCredentialConfigured(item)
    ? '字段完整'
    : `缺少 ${getBilibiliCredentialMissingFields(item).join(' / ')}`;
  return `${escapeHtml(summary)}${hint ? `<div class="form-hint" style="margin-top:4px;">${escapeHtml(hint)}</div>` : ''}`;
}

function formatBilibiliCredentialFilterLabel(activeFilterValue = '', expiryFilterValue = '') {
  const activeLabel = activeFilterValue === 'active'
    ? '仅激活'
    : activeFilterValue === 'inactive'
      ? '仅未激活'
      : '全部';
  const expiryLabel = expiryFilterValue === 'expired'
    ? '已过期'
    : expiryFilterValue === 'expiring'
      ? '即将过期'
      : expiryFilterValue === 'valid'
        ? '有效'
        : expiryFilterValue === 'unset'
          ? '未设置过期时间'
          : '全部';
  return `激活: ${activeLabel}，过期: ${expiryLabel}`;
}

function formatBilibiliCredentialSummary(items, activeFilterValue = '', expiryFilterValue = '', renderedCount = items.length) {
  const total = items.length;
  const filteredItems = filterBilibiliCredentials(items, activeFilterValue, expiryFilterValue);
  const activeItems = items.filter((item) => item.is_active || item.active);
  const inactiveItems = items.filter((item) => !(item.is_active || item.active));
  const active = activeItems.length;
  const inactive = inactiveItems.length;
  const configured = items.filter((item) => isBilibiliCredentialConfigured(item)).length;
  const activeConfigured = items.filter((item) => (item.is_active || item.active) && isBilibiliCredentialConfigured(item)).length;
  const inactiveConfigured = Math.max(0, configured - activeConfigured);
  const activeIncomplete = Math.max(0, active - activeConfigured);
  const inactiveIncomplete = Math.max(0, inactive - inactiveConfigured);
  const activeUsed = activeItems.filter((item) => item.last_used_at).length;
  const activeNeverUsed = Math.max(0, active - activeUsed);
  const inactiveUsed = inactiveItems.filter((item) => item.last_used_at).length;
  const inactiveNeverUsed = Math.max(0, inactive - inactiveUsed);
  const configuredUsed = items.filter((item) => isBilibiliCredentialConfigured(item) && item.last_used_at).length;
  const configuredUnused = Math.max(0, configured - configuredUsed);
  const incomplete = Math.max(0, total - configured);
  const incompleteUsed = items.filter((item) => !isBilibiliCredentialConfigured(item) && item.last_used_at).length;
  const incompleteNeverUsed = Math.max(0, incomplete - incompleteUsed);
  const neverUsed = items.filter((item) => !item.last_used_at).length;
  const used = Math.max(0, total - neverUsed);
  const now = Date.now();
  const configuredValid = items.filter((item) => isBilibiliCredentialConfigured(item) && getBilibiliCredentialExpiryState(item.expires_at, now).hasExpiry && !getBilibiliCredentialExpiryState(item.expires_at, now).expired).length;
  const configuredExpired = items.filter((item) => isBilibiliCredentialConfigured(item) && getBilibiliCredentialExpiryState(item.expires_at, now).expired).length;
  const configuredExpiringSoon = items.filter((item) => isBilibiliCredentialConfigured(item) && getBilibiliCredentialExpiryState(item.expires_at, now).expiringSoon).length;
  const configuredUnsetExpiry = items.filter((item) => isBilibiliCredentialConfigured(item) && !getBilibiliCredentialExpiryState(item.expires_at, now).hasExpiry).length;
  const expiryStates = items.map((item) => getBilibiliCredentialExpiryState(item.expires_at, now));
  const activeExpiryStates = activeItems.map((item) => getBilibiliCredentialExpiryState(item.expires_at, now));
  const inactiveExpiryStates = inactiveItems.map((item) => getBilibiliCredentialExpiryState(item.expires_at, now));
  const expiring = expiryStates.filter((item) => item.hasExpiry).length;
  const valid = expiryStates.filter((item) => item.hasExpiry && !item.expired).length;
  const expired = expiryStates.filter((item) => item.expired).length;
  const expiringSoon = expiryStates.filter((item) => item.expiringSoon).length;
  const activeValid = activeExpiryStates.filter((item) => item.hasExpiry && !item.expired).length;
  const activeExpired = activeExpiryStates.filter((item) => item.expired).length;
  const activeExpiringSoon = activeExpiryStates.filter((item) => item.expiringSoon).length;
  const activeUnsetExpiry = activeExpiryStates.filter((item) => !item.hasExpiry).length;
  const inactiveValid = inactiveExpiryStates.filter((item) => item.hasExpiry && !item.expired).length;
  const inactiveExpired = inactiveExpiryStates.filter((item) => item.expired).length;
  const inactiveExpiringSoon = inactiveExpiryStates.filter((item) => item.expiringSoon).length;
  const inactiveUnsetExpiry = inactiveExpiryStates.filter((item) => !item.hasExpiry).length;
  const incompleteValid = items.filter((item) => !isBilibiliCredentialConfigured(item) && getBilibiliCredentialExpiryState(item.expires_at, now).hasExpiry && !getBilibiliCredentialExpiryState(item.expires_at, now).expired).length;
  const incompleteExpired = items.filter((item) => !isBilibiliCredentialConfigured(item) && getBilibiliCredentialExpiryState(item.expires_at, now).expired).length;
  const incompleteExpiringSoon = items.filter((item) => !isBilibiliCredentialConfigured(item) && getBilibiliCredentialExpiryState(item.expires_at, now).expiringSoon).length;
  const incompleteUnsetExpiry = items.filter((item) => !isBilibiliCredentialConfigured(item) && !getBilibiliCredentialExpiryState(item.expires_at, now).hasExpiry).length;
  const unsetExpiry = expiryStates.filter((item) => !item.hasExpiry).length;
  const filterLabel = formatBilibiliCredentialFilterLabel(activeFilterValue, expiryFilterValue);
  const filteredConfigured = filteredItems.filter((item) => isBilibiliCredentialConfigured(item)).length;
  const filteredIncomplete = Math.max(0, filteredItems.length - filteredConfigured);
  const filteredConfiguredValid = filteredItems.filter((item) => {
    if (!isBilibiliCredentialConfigured(item)) return false;
    const expiry = getBilibiliCredentialExpiryState(item.expires_at, now);
    return expiry.hasExpiry && !expiry.expired;
  }).length;
  const filteredConfiguredExpired = filteredItems.filter((item) => {
    if (!isBilibiliCredentialConfigured(item)) return false;
    return getBilibiliCredentialExpiryState(item.expires_at, now).expired;
  }).length;
  const filteredConfiguredUsed = filteredItems.filter((item) => isBilibiliCredentialConfigured(item) && item.last_used_at).length;
  const filteredConfiguredUnused = Math.max(0, filteredConfigured - filteredConfiguredUsed);
  const filteredIncompleteUsed = filteredItems.filter((item) => !isBilibiliCredentialConfigured(item) && item.last_used_at).length;
  const filteredIncompleteExpired = filteredItems.filter((item) => {
    if (isBilibiliCredentialConfigured(item)) return false;
    return getBilibiliCredentialExpiryState(item.expires_at, now).expired;
  }).length;
  const filteredActive = filteredItems.filter((item) => item.is_active || item.active).length;
  const filteredInactive = Math.max(0, filteredItems.length - filteredActive);
  const filteredUsed = filteredItems.filter((item) => item.last_used_at).length;
  const filteredNeverUsed = Math.max(0, filteredItems.length - filteredUsed);
  const filteredValid = filteredItems.filter((item) => {
    const expiry = getBilibiliCredentialExpiryState(item.expires_at, now);
    return expiry.hasExpiry && !expiry.expired;
  }).length;
  const filteredExpired = filteredItems.filter((item) => getBilibiliCredentialExpiryState(item.expires_at, now).expired).length;
  const filteredExpiringSoon = filteredItems.filter((item) => getBilibiliCredentialExpiryState(item.expires_at, now).expiringSoon).length;
  const filteredUnsetExpiry = filteredItems.filter((item) => !getBilibiliCredentialExpiryState(item.expires_at, now).hasExpiry).length;
  const filteredActiveStateText = activeFilterValue
    ? ''
    : `，激活 ${filteredActive} 个，未激活 ${filteredInactive} 个`;
  const filteredSummaryText = activeFilterValue || expiryFilterValue
    ? `，筛选结果完整 ${filteredConfigured} 个，完整且有效 ${filteredConfiguredValid} 个，完整且已过期 ${filteredConfiguredExpired} 个，完整且已使用 ${filteredConfiguredUsed} 个，完整但未使用 ${filteredConfiguredUnused} 个，缺字段 ${filteredIncomplete} 个，缺字段但已使用 ${filteredIncompleteUsed} 个，缺字段且已过期 ${filteredIncompleteExpired} 个${filteredActiveStateText}，已使用 ${filteredUsed} 个，从未使用 ${filteredNeverUsed} 个，有效 ${filteredValid} 个，已过期 ${filteredExpired} 个，即将过期 ${filteredExpiringSoon} 个，未设置过期 ${filteredUnsetExpiry} 个`
    : '';
  return `共 ${total} 个凭证，激活中 ${active} 个，未激活 ${inactive} 个，激活且完整 ${activeConfigured} 个，未激活但完整 ${inactiveConfigured} 个，激活但缺字段 ${activeIncomplete} 个，未激活且缺字段 ${inactiveIncomplete} 个，激活且已使用 ${activeUsed} 个，激活但从未使用 ${activeNeverUsed} 个，未激活且已使用 ${inactiveUsed} 个，未激活但从未使用 ${inactiveNeverUsed} 个，激活且有效 ${activeValid} 个，未激活且有效 ${inactiveValid} 个，激活已过期 ${activeExpired} 个，未激活已过期 ${inactiveExpired} 个，激活即将过期 ${activeExpiringSoon} 个，未激活即将过期 ${inactiveExpiringSoon} 个，激活未设置过期 ${activeUnsetExpiry} 个，未激活未设置过期 ${inactiveUnsetExpiry} 个，字段完整 ${configured} 个，完整且有效 ${configuredValid} 个，完整且已过期 ${configuredExpired} 个，完整即将过期 ${configuredExpiringSoon} 个，完整未设置过期 ${configuredUnsetExpiry} 个，完整且已使用 ${configuredUsed} 个，完整但未使用 ${configuredUnused} 个，字段缺失 ${incomplete} 个，缺字段但已使用 ${incompleteUsed} 个，缺字段且未使用 ${incompleteNeverUsed} 个，缺字段但有效 ${incompleteValid} 个，缺字段且已过期 ${incompleteExpired} 个，缺字段即将过期 ${incompleteExpiringSoon} 个，缺字段未设置过期 ${incompleteUnsetExpiry} 个，已使用 ${used} 个，从未使用 ${neverUsed} 个，设置过期时间 ${expiring} 个，有效 ${valid} 个，已过期 ${expired} 个，即将过期 ${expiringSoon} 个，未设置 ${unsetExpiry} 个；筛选: ${filterLabel}，当前展示 ${renderedCount} 个${filteredSummaryText}`;
}

function filterBilibiliCredentials(items, activeFilterValue = '', expiryFilterValue = '') {
  const now = Date.now();
  return items.filter((item) => {
    const isActive = item.is_active || item.active;
    if (activeFilterValue === 'active' && !isActive) return false;
    if (activeFilterValue === 'inactive' && isActive) return false;

    const expiry = getBilibiliCredentialExpiryState(item.expires_at, now);
    if (expiryFilterValue === 'expired' && !expiry.expired) return false;
    if (expiryFilterValue === 'expiring' && !expiry.expiringSoon) return false;
    if (expiryFilterValue === 'valid' && (!expiry.hasExpiry || expiry.expired)) return false;
    if (expiryFilterValue === 'unset' && expiry.hasExpiry) return false;
    return true;
  });
}

function getBilibiliCredentialEmptyMessage(activeFilterValue = '', expiryFilterValue = '') {
  if (activeFilterValue || expiryFilterValue) {
    return `暂无匹配筛选条件的凭证（${formatBilibiliCredentialFilterLabel(activeFilterValue, expiryFilterValue)}）`;
  }
  return '暂无凭证';
}

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
            <option value="">全部</option>
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
            <option value="valid">有效</option>
            <option value="unset">未设置</option>
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
      const data = await api.getBilibiliStatus();
      const totalVideoCount = Number(data?.video_count ?? 0);
      const pollEnabledCount = Number(data?.videos?.poll_enabled_count ?? 0);
      const disabledVideoCount = Math.max(0, totalVideoCount - pollEnabledCount);
      const pollCoverage = formatBilibiliCoverage(pollEnabledCount, totalVideoCount);
      const diagnosticsReady = Boolean(data?.diagnostics?.ready);
      const blockingReasons = formatBilibiliBlockingReasons(data?.diagnostics?.blocking_reasons);
      const activeCredentialName = renderBilibiliCredentialName(data?.credential, '未配置');
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
      const pollInterval = formatBilibiliPollInterval(data?.config?.poll_interval_seconds);
      const rateLimit = formatBilibiliRateLimit(data?.config?.rate_limit_per_minute);
      const credentialExpiry = getBilibiliCredentialExpiryState(data?.credential?.expires_at);
      const credentialLastUsedAt = formatBilibiliStatusTime(data?.credential?.last_used_at);
      el.innerHTML = `
        <div class="stat-card mini">
          <div class="stat-label">启用</div>
          <div class="stat-value">${data?.enabled ? '✅' : '❌'}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询</div>
          <div class="stat-value">${data?.polling_enabled ? '✅' : '❌'}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">发布</div>
          <div class="stat-value">${data?.publish_enabled ? '✅' : '❌'}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">视频数</div>
          <div class="stat-value">${totalVideoCount}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询视频</div>
          <div class="stat-value">${pollEnabledCount}</div>
          <div class="form-hint" style="margin-top:6px;">${escapeHtml(pollCoverage)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">停用视频</div>
          <div class="stat-value">${disabledVideoCount}</div>
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
          <div class="stat-label">发布模式</div>
          <div class="stat-value">${escapeHtml(publishMode)}</div>
          <div class="form-hint" style="margin-top:6px;">${escapeHtml(publishModeHealth)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">轮询间隔</div>
          <div class="stat-value">${escapeHtml(pollInterval)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">速率限制</div>
          <div class="stat-value">${escapeHtml(rateLimit)}</div>
        </div>
        <div class="stat-card mini">
          <div class="stat-label">凭证过期</div>
          <div class="stat-value" style="font-size:14px; color:${getBilibiliCredentialExpiryColor(credentialExpiry)}">${escapeHtml(credentialExpiry.label)}</div>
          ${credentialExpiry.detail ? `<div class="form-hint" style="margin-top:6px;">${escapeHtml(credentialExpiry.detail)}</div>` : ''}
        </div>
        <div class="stat-card mini">
          <div class="stat-label">最近使用</div>
          <div class="stat-value" style="font-size:14px;">${escapeHtml(credentialLastUsedAt)}</div>
        </div>
        ${blockingReasons ? `<div class="page-error" style="grid-column: 1 / -1; margin: 0;">阻塞原因: ${escapeHtml(blockingReasons)}</div>` : ''}
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
              <td>${renderBoolBadge(v.poll_enabled)}</td>
              <td>${v.comment_count ?? '-'}</td>
              <td class="cell-time">${v.last_polled_at ? renderTimestamp(v.last_polled_at) : '-'}</td>
              <td>${renderBilibiliPollStatus(v.last_poll_status, v.last_poll_error, v.last_rpid)}</td>
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
              <td>${renderBoolBadge(c.is_active || c.active)}</td>
              <td>${renderBilibiliCredentialExpiry(c.expires_at)}</td>
              <td class="cell-time">${c.last_used_at ? renderTimestamp(c.last_used_at) : '-'}</td>
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
