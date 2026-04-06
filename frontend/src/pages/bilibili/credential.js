import { escapeHtml, formatIsoDateTime, timeAgo } from '../../utils/format.js';
import { renderBoolBadge } from '../../components/badge.js';
import { formatBilibiliHintTime } from './formatters.js';

const bilibiliCredentialExpiringSoonMs = 7 * 24 * 60 * 60 * 1000;

function formatBilibiliExpiryDistance(value, now = Date.now()) {
  const expiresAt = new Date(value);
  if (Number.isNaN(expiresAt.getTime())) return '';
  const diffMs = expiresAt.getTime() - now;
  const absMs = Math.abs(diffMs);
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  let amount;
  let unit;
  if (absMs < hourMs) {
    amount = Math.max(1, Math.round(absMs / minuteMs));
    unit = '分钟';
  } else if (absMs < dayMs) {
    amount = Math.max(1, Math.round(absMs / hourMs));
    unit = '小时';
  } else {
    amount = Math.max(1, Math.round(absMs / dayMs));
    unit = '天';
  }
  return diffMs <= 0 ? `${amount}${unit}前` : `${amount}${unit}后`;
}

export function getBilibiliCredentialExpiryState(value, now = Date.now()) {
  if (!value) {
    return {
      hasExpiry: false,
      expired: false,
      expiringSoon: false,
      label: '未设置过期时间',
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
      label: '过期时间异常',
      cls: 'badge-danger',
      detail: String(value),
    };
  }

  const diffMs = expiresAt.getTime() - now;
  if (diffMs <= 0) {
    const distance = formatBilibiliExpiryDistance(value, now);
    return {
      hasExpiry: true,
      expired: true,
      expiringSoon: false,
      label: '已过期',
      cls: 'badge-danger',
      detail: distance ? `${distance}过期，${formatIsoDateTime(value)}` : formatIsoDateTime(value),
    };
  }

  if (diffMs <= bilibiliCredentialExpiringSoonMs) {
    const distance = formatBilibiliExpiryDistance(value, now);
    return {
      hasExpiry: true,
      expired: false,
      expiringSoon: true,
      label: '即将过期',
      cls: 'badge-warning',
      detail: distance ? `${distance}到期，${formatIsoDateTime(value)}` : formatIsoDateTime(value),
    };
  }

  const distance = formatBilibiliExpiryDistance(value, now);
  return {
    hasExpiry: true,
    expired: false,
    expiringSoon: false,
    label: '有效期内',
    cls: 'badge-success',
    detail: distance ? `${distance}到期，${formatIsoDateTime(value)}` : formatIsoDateTime(value),
  };
}

export function formatBilibiliCredentialExpiryHint(info, hasCredential = true) {
  if (!hasCredential) {
    return '当前无活跃凭证，无法评估过期状态';
  }
  const stateHint = !info.hasExpiry
    ? '需手动确认有效性并定期轮换'
    : info.label === '过期时间异常'
      ? '请检查过期时间格式后重试'
      : info.expired
        ? '建议尽快更新'
        : info.expiringSoon
          ? '建议提前轮换'
          : '当前仍可使用';
  return [info.detail || (!info.hasExpiry ? '未设置过期时间' : ''), stateHint]
    .filter(Boolean)
    .join('，');
}

export function renderBilibiliCredentialExpiry(value) {
  const info = getBilibiliCredentialExpiryState(value);
  const detailText = formatBilibiliCredentialExpiryHint(info);
  const detail = detailText
    ? `<div class="form-hint" style="margin-top:4px;">${escapeHtml(detailText)}</div>`
    : '';
  return `<span class="status-badge ${info.cls}">${escapeHtml(info.label)}</span>${detail}`;
}

export function renderBilibiliCredentialName(item, fallbackLabel = '未命名凭证') {
  const hints = [];
  const name = String(item?.name ?? '').trim();
  if (!name && item) {
    hints.push('未填写凭证名称，当前展示默认标签');
  }
  if (item?.updated_at) {
    hints.push(formatBilibiliHintTime('更新', item.updated_at));
  }
  if (item?.created_at) {
    hints.push(formatBilibiliHintTime('创建', item.created_at));
  }
  return `${escapeHtml(name || fallbackLabel)}${hints
    .map((text) => `<div class="form-hint" style="margin-top:4px;">${escapeHtml(text)}</div>`)
    .join('')}`;
}

export function getBilibiliCredentialExpiryColor(expiryState) {
  if (expiryState?.cls === 'badge-danger') return 'var(--danger-color)';
  if (expiryState?.cls === 'badge-warning') return 'var(--warning-color)';
  if (expiryState?.cls === 'badge-success') return 'var(--success-color)';
  return 'var(--grey-2)';
}

export function getBilibiliCredentialUsageState(item) {
  if (!item) {
    return {
      label: '未配置凭证',
      detail: '请先添加并激活凭证用于鉴权',
    };
  }
  const active = Boolean(item?.is_active || item?.active);
  const configured = isBilibiliCredentialConfigured(item);
  const missingFields = configured ? '' : getBilibiliCredentialMissingFields(item).join(' / ');
  const missingFieldsText = configured ? '' : `缺少 ${missingFields}`;
  if (item?.last_used_at) {
    const relative = timeAgo(item.last_used_at);
    return {
      label: relative || '已使用',
      detail: `${formatIsoDateTime(item.last_used_at)}，${active ? '当前生效' : '当前未激活，历史使用记录保留'}${configured ? '，字段完整' : `，${missingFieldsText}`}`,
    };
  }
  const hints = [];
  if (active) {
    hints.push(configured ? '当前生效，等待首次使用' : `当前生效，但${missingFieldsText}`);
  } else {
    hints.push(configured ? '待手动激活，激活后可用于鉴权' : `待补齐 ${missingFields} 后激活`);
  }
  if (item?.updated_at) {
    hints.push(formatBilibiliHintTime('更新', item.updated_at));
  }
  if (item?.created_at) {
    hints.push(formatBilibiliHintTime('创建', item.created_at));
  }
  return {
    label: '从未使用',
    detail: hints.join('，'),
  };
}

export function renderBilibiliCredentialUsageCell(item) {
  const usage = getBilibiliCredentialUsageState(item);
  const detail = usage.detail
    ? `<div class="form-hint" style="margin-top:4px;">${escapeHtml(usage.detail)}</div>`
    : '';
  return `${escapeHtml(usage.label)}${detail}`;
}

export function renderBilibiliCredentialActiveState(item) {
  const active = Boolean(item?.is_active || item?.active);
  const configured = isBilibiliCredentialConfigured(item);
  const missingFields = configured ? '' : getBilibiliCredentialMissingFields(item).join(' / ');
  const missingFieldsText = configured ? '' : `缺少 ${missingFields}`;
  const hint = active
    ? (configured ? '当前生效，字段完整，可用于鉴权' : `当前生效，但${missingFieldsText}`)
    : (configured ? '待手动激活，字段完整，激活后即可切换使用' : `待补齐 ${missingFields} 后激活`);
  return `${renderBoolBadge(active)}<div class="form-hint" style="margin-top:4px;">${escapeHtml(hint)}</div>`;
}

export function isBilibiliCredentialConfigured(item) {
  return Boolean(item?.has_sessdata && item?.has_bili_jct && item?.buvid3);
}

export function getBilibiliCredentialMissingFields(item) {
  const missing = [];
  if (!item?.has_sessdata) missing.push('SESSDATA');
  if (!item?.has_bili_jct) missing.push('bili_jct');
  if (!item?.buvid3) missing.push('buvid3');
  return missing;
}

function maskBilibiliIdentifier(value, visibleSuffix = 4) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (text.endsWith('...')) return text;
  if (text.length <= visibleSuffix) return text;
  return `...${text.slice(-visibleSuffix)}`;
}

export function renderBilibiliCredentialFingerprint(item) {
  const summary = [
    item?.has_sessdata ? 'SESSDATA' : '',
    item?.has_bili_jct ? 'bili_jct' : '',
    item?.buvid3 ? `buvid3:${maskBilibiliIdentifier(item.buvid3)}` : '',
  ].filter(Boolean).join(' / ') || '未配置指纹';
  const hints = [
    isBilibiliCredentialConfigured(item)
      ? '字段完整，可用于鉴权'
      : `缺少 ${getBilibiliCredentialMissingFields(item).join(' / ')}`,
    item?.buvid3 ? '仅展示指纹摘要' : '未记录 buvid3 指纹摘要',
  ].filter(Boolean).join('，');
  return `${escapeHtml(summary)}${hints ? `<div class="form-hint" style="margin-top:4px;">${escapeHtml(hints)}</div>` : ''}`;
}

export function formatBilibiliCredentialFilterLabel(activeFilterValue = '', expiryFilterValue = '') {
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
        ? '有效期内'
        : expiryFilterValue === 'unset'
          ? '未设置过期时间'
          : '全部';
  return `激活筛选: ${activeLabel}，过期筛选: ${expiryLabel}`;
}

export function formatBilibiliCredentialSummary(items, activeFilterValue = '', expiryFilterValue = '', renderedCount = items.length) {
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
  const filteredConfiguredExpiringSoon = filteredItems.filter((item) => {
    if (!isBilibiliCredentialConfigured(item)) return false;
    return getBilibiliCredentialExpiryState(item.expires_at, now).expiringSoon;
  }).length;
  const filteredConfiguredUnsetExpiry = filteredItems.filter((item) => {
    if (!isBilibiliCredentialConfigured(item)) return false;
    return !getBilibiliCredentialExpiryState(item.expires_at, now).hasExpiry;
  }).length;
  const filteredConfiguredActive = filteredItems.filter((item) => (
    isBilibiliCredentialConfigured(item) && (item.is_active || item.active)
  )).length;
  const filteredConfiguredInactive = Math.max(0, filteredConfigured - filteredConfiguredActive);
  const filteredConfiguredUsed = filteredItems.filter((item) => isBilibiliCredentialConfigured(item) && item.last_used_at).length;
  const filteredConfiguredUnused = Math.max(0, filteredConfigured - filteredConfiguredUsed);
  const filteredIncompleteUsed = filteredItems.filter((item) => !isBilibiliCredentialConfigured(item) && item.last_used_at).length;
  const filteredIncompleteNeverUsed = Math.max(0, filteredIncomplete - filteredIncompleteUsed);
  const filteredIncompleteValid = filteredItems.filter((item) => {
    if (isBilibiliCredentialConfigured(item)) return false;
    const expiry = getBilibiliCredentialExpiryState(item.expires_at, now);
    return expiry.hasExpiry && !expiry.expired;
  }).length;
  const filteredIncompleteExpired = filteredItems.filter((item) => {
    if (isBilibiliCredentialConfigured(item)) return false;
    return getBilibiliCredentialExpiryState(item.expires_at, now).expired;
  }).length;
  const filteredIncompleteExpiringSoon = filteredItems.filter((item) => {
    if (isBilibiliCredentialConfigured(item)) return false;
    return getBilibiliCredentialExpiryState(item.expires_at, now).expiringSoon;
  }).length;
  const filteredIncompleteUnsetExpiry = filteredItems.filter((item) => {
    if (isBilibiliCredentialConfigured(item)) return false;
    return !getBilibiliCredentialExpiryState(item.expires_at, now).hasExpiry;
  }).length;
  const filteredIncompleteActive = filteredItems.filter((item) => (
    !isBilibiliCredentialConfigured(item) && (item.is_active || item.active)
  )).length;
  const filteredIncompleteInactive = Math.max(0, filteredIncomplete - filteredIncompleteActive);
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
  const filteredConfiguredActiveStateText = activeFilterValue
    ? ''
    : `，完整且激活 ${filteredConfiguredActive} 个，完整但未激活 ${filteredConfiguredInactive} 个`;
  const filteredIncompleteActiveStateText = activeFilterValue
    ? ''
    : `，缺字段且激活 ${filteredIncompleteActive} 个，缺字段且未激活 ${filteredIncompleteInactive} 个`;
  const filteredSummaryText = activeFilterValue || expiryFilterValue
    ? `，筛选结果完整 ${filteredConfigured} 个${filteredConfiguredActiveStateText}，完整且有效 ${filteredConfiguredValid} 个，完整且已过期 ${filteredConfiguredExpired} 个，完整且即将过期 ${filteredConfiguredExpiringSoon} 个，完整且未设置过期 ${filteredConfiguredUnsetExpiry} 个，完整且已使用 ${filteredConfiguredUsed} 个，完整但未使用 ${filteredConfiguredUnused} 个，缺字段 ${filteredIncomplete} 个${filteredIncompleteActiveStateText}，缺字段但已使用 ${filteredIncompleteUsed} 个，缺字段且从未使用 ${filteredIncompleteNeverUsed} 个，缺字段但有效 ${filteredIncompleteValid} 个，缺字段且已过期 ${filteredIncompleteExpired} 个，缺字段且即将过期 ${filteredIncompleteExpiringSoon} 个，缺字段且未设置过期 ${filteredIncompleteUnsetExpiry} 个${filteredActiveStateText}，已使用 ${filteredUsed} 个，从未使用 ${filteredNeverUsed} 个，有效 ${filteredValid} 个，已过期 ${filteredExpired} 个，即将过期 ${filteredExpiringSoon} 个，未设置过期 ${filteredUnsetExpiry} 个`
    : '';
  return `共 ${total} 个凭证，激活中 ${active} 个，未激活 ${inactive} 个，激活且完整 ${activeConfigured} 个，未激活但完整 ${inactiveConfigured} 个，激活但缺字段 ${activeIncomplete} 个，未激活且缺字段 ${inactiveIncomplete} 个，激活且已使用 ${activeUsed} 个，激活但从未使用 ${activeNeverUsed} 个，未激活且已使用 ${inactiveUsed} 个，未激活但从未使用 ${inactiveNeverUsed} 个，激活且有效 ${activeValid} 个，未激活且有效 ${inactiveValid} 个，激活已过期 ${activeExpired} 个，未激活已过期 ${inactiveExpired} 个，激活即将过期 ${activeExpiringSoon} 个，未激活即将过期 ${inactiveExpiringSoon} 个，激活未设置过期 ${activeUnsetExpiry} 个，未激活未设置过期 ${inactiveUnsetExpiry} 个，字段完整 ${configured} 个，完整且有效 ${configuredValid} 个，完整且已过期 ${configuredExpired} 个，完整即将过期 ${configuredExpiringSoon} 个，完整未设置过期 ${configuredUnsetExpiry} 个，完整且已使用 ${configuredUsed} 个，完整但未使用 ${configuredUnused} 个，字段缺失 ${incomplete} 个，缺字段但已使用 ${incompleteUsed} 个，缺字段且未使用 ${incompleteNeverUsed} 个，缺字段但有效 ${incompleteValid} 个，缺字段且已过期 ${incompleteExpired} 个，缺字段即将过期 ${incompleteExpiringSoon} 个，缺字段未设置过期 ${incompleteUnsetExpiry} 个，已使用 ${used} 个，从未使用 ${neverUsed} 个，设置过期时间 ${expiring} 个，有效 ${valid} 个，已过期 ${expired} 个，即将过期 ${expiringSoon} 个，未设置 ${unsetExpiry} 个；筛选条件: ${filterLabel}，当前展示 ${renderedCount} 个${filteredSummaryText}`;
}

export function filterBilibiliCredentials(items, activeFilterValue = '', expiryFilterValue = '') {
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

export function getBilibiliCredentialEmptyMessage(activeFilterValue = '', expiryFilterValue = '') {
  if (activeFilterValue || expiryFilterValue) {
    return `当前筛选暂无匹配凭证（${formatBilibiliCredentialFilterLabel(activeFilterValue, expiryFilterValue)}），可调整筛选条件后重试`;
  }
  return '暂无凭证，请先添加并激活可用凭证用于鉴权';
}
