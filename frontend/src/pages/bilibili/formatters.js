import { formatIsoDateTime, timeAgo } from '../../utils/format.js';

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
  'auth:no active credential': '缺少可用的激活凭证，请先添加并激活。',
  'auth:credential_validation_failed': '凭证字段存在，但运行时认证失败，请检查登录状态或凭证是否失效。',
  'config:bilibili_enabled is false': 'B 站集成总开关已关闭，请先启用配置。',
  'dependency:diagnostics_unavailable': '诊断信息暂时不可用，请稍后刷新重试。',
};
const bilibiliPublishModeMessages = {
  manual_queue: '人工队列发布',
  simulated: '模拟发布流程',
  webhook: 'Webhook 推送',
  real_publish: '真实发布流程',
  native_bilibili: '原生 B 站发布',
};
const bilibiliVideoPageSize = 50;

export function getBilibiliErrorMessage(error) {
  const raw = error instanceof Error ? error.message : String(error ?? 'request_failed');
  return bilibiliErrorMessages[raw] || raw;
}

export function validateBilibiliVideoInput(bvid) {
  if (!bvid) return 'bvid_required';
  if (!bilibiliBvidPattern.test(bvid)) return 'invalid_bvid_format';
  return null;
}

export function validateBilibiliCredentialInput(payload) {
  if (!payload.name) return 'name_required';
  if (!payload.sessdata) return 'sessdata_required';
  if (!payload.bili_jct) return 'bili_jct_required';
  if (!payload.buvid3) return 'buvid3_required';
  if (payload.expires_at === null) {
    return 'invalid_expires_at';
  }
  return null;
}

export function normalizeOptionalDateTimeValue(value) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function formatBilibiliBlockingReasons(reasons) {
  const items = Array.isArray(reasons) ? reasons.filter(Boolean) : [];
  return items
    .map((reason) => bilibiliBlockingReasonMessages[reason] || `未识别阻塞原因: ${reason}`)
    .join('；');
}

export function formatBilibiliPublishMode(mode) {
  const normalized = String(mode ?? '').trim().toLowerCase();
  if (!normalized) return '未设置发布模式';
  return bilibiliPublishModeMessages[normalized] || `未识别发布模式: ${normalized}`;
}

export function formatBilibiliToggleState(enabled, enabledLabel, disabledLabel) {
  return enabled ? enabledLabel : disabledLabel;
}

export function formatBilibiliPollInterval(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return '未设置轮询间隔';
  if (value % 60 === 0) return `${value / 60} 分钟`;
  return `${value} 秒`;
}

export function formatBilibiliPollIntervalHint(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return '未设置轮询间隔，请检查轮询配置';
  if (value < 60) {
    const perMinute = 60 / value;
    const formatted = perMinute.toFixed(perMinute >= 10 ? 0 : 1).replace(/\.0$/, '');
    return `约每分钟 ${formatted} 轮`;
  }
  if (value < 3600) {
    const perHour = 3600 / value;
    const formatted = perHour.toFixed(perHour >= 10 ? 0 : 1).replace(/\.0$/, '');
    return `约每小时 ${formatted} 轮`;
  }
  const hoursPerPoll = value / 3600;
  const formatted = hoursPerPoll.toFixed(hoursPerPoll >= 10 ? 0 : 1).replace(/\.0$/, '');
  return `约每 ${formatted} 小时 1 轮`;
}

export function formatBilibiliRateLimit(limitPerMinute) {
  const value = Number(limitPerMinute);
  if (!Number.isFinite(value) || value <= 0) return '未设置速率限制';
  return `${value} 次/分钟`;
}

export function formatBilibiliRateLimitHint(limitPerMinute) {
  const value = Number(limitPerMinute);
  if (!Number.isFinite(value) || value <= 0) return '未设置速率限制，请检查抓取配置';
  const perSecond = value / 60;
  if (perSecond >= 1) {
    const formatted = perSecond.toFixed(perSecond >= 10 ? 0 : 1).replace(/\.0$/, '');
    return `约每秒 ${formatted} 次`;
  }
  const secondsPerRequest = 60 / value;
  const formatted = secondsPerRequest.toFixed(secondsPerRequest >= 10 ? 0 : 1).replace(/\.0$/, '');
  return `约每 ${formatted} 秒 1 次`;
}

export function formatBilibiliCoverage(enabledCount, totalCount, label = '覆盖率') {
  const total = Number(totalCount ?? 0);
  if (!Number.isFinite(total) || total <= 0) {
    return `暂无视频，无法计算${label}，请先添加监控对象`;
  }
  const enabled = Number(enabledCount ?? 0);
  const safeEnabled = Number.isFinite(enabled)
    ? Math.min(total, Math.max(0, enabled))
    : 0;
  const percentage = ((safeEnabled / total) * 100).toFixed(1).replace(/\.0$/, '');
  return `${label} ${percentage}%（${safeEnabled}/${total}）`;
}

export function formatBilibiliVideoSplit(totalCount, pollEnabledCount) {
  const total = Number(totalCount ?? 0);
  if (!Number.isFinite(total) || total <= 0) {
    return '暂无视频，请先添加 BVID 监控对象';
  }
  const enabled = Number(pollEnabledCount ?? 0);
  const safeEnabled = Number.isFinite(enabled)
    ? Math.min(total, Math.max(0, enabled))
    : 0;
  const disabled = Math.max(0, total - safeEnabled);
  return `共 ${total} 个视频，轮询中 ${safeEnabled}，停用 ${disabled}`;
}

export function formatBilibiliPollResultMessage(result, options = {}) {
  const videos = Number(result?.videos ?? 0);
  const comments = Number(result?.comments ?? 0);
  const events = Number(result?.events_injected ?? comments);
  const subject = options.subject || (videos === 1 ? '视频' : '轮询');

  if (comments > 0 || events > 0) {
    return `${subject}完成，处理 ${videos} 个视频，新增 ${comments} 条评论，已注入 ${events} 个事件。`;
  }
  if (videos > 0) {
    return `${subject}完成，处理 ${videos} 个视频，暂无新增评论，已保留当前评论状态。`;
  }
  return `${subject}完成，暂无可处理视频，请先确认监控对象已同步。`;
}

export function formatBilibiliHintTime(label, value) {
  if (!value) return '';
  const relative = timeAgo(value);
  const exact = formatIsoDateTime(value);
  if (relative) {
    return `${label}: ${relative}（${exact}）`;
  }
  return `${label}: ${exact}`;
}

export function formatBilibiliCredentialHealth(credentialPresent, credentialComplete) {
  if (!credentialPresent) return '当前无活跃凭证，请先添加并激活';
  if (credentialComplete) return '活跃凭证字段完整，可用于鉴权';
  return '活跃凭证已激活，但缺少关键字段，请检查凭证配置';
}

export function formatBilibiliDiagnosticHealth(diagnostics) {
  const authReady = Boolean(diagnostics?.checks?.auth?.ready);
  const workerOrPublishReady = Boolean(diagnostics?.checks?.worker_or_publish?.ready);
  const pollingWorkerEnabled = Boolean(diagnostics?.signals?.polling_worker_enabled);
  const nativePublishEnabled = Boolean(diagnostics?.signals?.native_publish_enabled);
  const blockingReasons = Array.isArray(diagnostics?.blocking_reasons)
    ? diagnostics.blocking_reasons.filter(Boolean)
    : [];
  const blockingText = blockingReasons.length > 0 ? `，阻塞 ${blockingReasons.length} 项，详见下方阻塞原因` : '';
  const authRequired = pollingWorkerEnabled || nativePublishEnabled;
  if (!authRequired) {
    return blockingReasons.length > 0
      ? `当前无需鉴权，但诊断校验仍受阻${blockingText}`
      : '轮询与发布链路均未启用，可按需开启';
  }
  if (authReady && workerOrPublishReady) {
    return `鉴权已就绪，执行链路可用${blockingText}`;
  }
  if (authReady) {
    return `鉴权已就绪，但执行链路阻塞${blockingText}`;
  }
  if (workerOrPublishReady) {
    return `执行链路可用，但鉴权未就绪${blockingText}`;
  }
  return `鉴权未就绪，执行链路阻塞${blockingText}`;
}

export function formatBilibiliPublishModeHealth(diagnostics) {
  const publishModeConfigReady = Boolean(diagnostics?.signals?.publish_mode_config_ready);
  const nativePublishEnabled = Boolean(diagnostics?.signals?.native_publish_enabled);
  const pollingWorkerEnabled = Boolean(diagnostics?.signals?.polling_worker_enabled);
  return [
    publishModeConfigReady ? '模式配置就绪' : '模式配置缺失，请检查发布配置',
    nativePublishEnabled ? '原生发布启用，可直接进入 B 站发布链路' : '原生发布停用，当前不会直接走 B 站发布',
    pollingWorkerEnabled ? '轮询链路启用，可配合自动处理评论侧流程' : '轮询链路停用，评论侧仅支持手动同步',
  ].join('，');
}

export { bilibiliVideoPageSize };
