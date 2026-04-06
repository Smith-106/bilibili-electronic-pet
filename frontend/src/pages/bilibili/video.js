import { escapeHtml, renderTimestamp } from '../../utils/format.js';
import { renderBoolBadge } from '../../components/badge.js';
import { formatBilibiliHintTime, bilibiliVideoPageSize } from './formatters.js';

const bilibiliPollStatusMessages = {
  ok: { label: '轮询成功', cls: 'badge-success' },
  no_new: { label: '无新增评论', cls: 'badge-muted' },
  error: { label: '轮询失败', cls: 'badge-danger' },
};

const bilibiliPollErrorMessages = {
  no_aid: '缺少视频 aid，暂时无法轮询评论。',
  retry_exhausted: '评论抓取重试耗尽。',
};

export { bilibiliPollErrorMessages };

function renderBilibiliPollStatus(status, error, lastRpid) {
  const normalized = String(status ?? '').trim().toLowerCase();
  if (!normalized) return '-';
  const info = bilibiliPollStatusMessages[normalized] || { label: '未识别轮询状态', cls: 'badge-muted' };
  const errorText = normalized === 'error' && error
    ? bilibiliPollErrorMessages[String(error).trim().toLowerCase()] || String(error)
    : '';
  const titleAttr = errorText ? ` title="${escapeHtml(errorText)}"` : '';
  const cursorText = typeof lastRpid === 'number' && Number.isFinite(lastRpid)
    ? `评论游标: ${lastRpid}`
    : '';
  const statusHint = normalized === 'ok'
    ? (cursorText ? '轮询完成，评论游标已推进' : '轮询完成')
    : normalized === 'no_new'
      ? (cursorText ? '本次未发现新评论，评论游标已保留' : '本次未发现新评论')
      : !bilibiliPollStatusMessages[normalized]
        ? `原始状态值: ${normalized}`
      : '';
  const hints = [statusHint, errorText, cursorText]
    .filter(Boolean)
    .map((text) => `<div class="form-hint" style="margin-top:4px;">${escapeHtml(text)}</div>`)
    .join('');
  return `<span class="status-badge ${info.cls}"${titleAttr}>${escapeHtml(info.label)}</span>${hints}`;
}

function renderBilibiliVideoPollResult(video) {
  const normalized = String(video?.last_poll_status ?? '').trim().toLowerCase();
  if (normalized) {
    return renderBilibiliPollStatus(video?.last_poll_status, video?.last_poll_error, video?.last_rpid);
  }
  if (!video?.last_polled_at) {
    return `<span class="status-badge badge-muted">未轮询</span><div class="form-hint" style="margin-top:4px;">${escapeHtml(getBilibiliVideoNeverPolledHint(video))}</div>`;
  }
  const detail = typeof video?.last_rpid === 'number' && Number.isFinite(video.last_rpid)
    ? '已轮询但未记录结果，评论游标已保留'
    : '已轮询但未记录结果';
  return `<span class="status-badge badge-muted">轮询完成</span><div class="form-hint" style="margin-top:4px;">${escapeHtml(detail)}</div>`;
}

export function parseBilibiliPollFilter(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

export function getBilibiliVideoEmptyMessage(filterValue) {
  if (filterValue === 'true') return '当前筛选暂无轮询中视频，可切换筛选查看停用项';
  if (filterValue === 'false') return '当前筛选暂无已停用视频，可切换筛选查看轮询中项';
  return '暂无监控视频，请先添加 BVID 作为监控对象';
}

function hasBilibiliVideoAid(video) {
  return typeof video?.aid === 'number' && Number.isFinite(video.aid);
}

function getBilibiliVideoNeverPolledHint(video) {
  if (!hasBilibiliVideoAid(video)) {
    return bilibiliPollErrorMessages.no_aid;
  }
  return video?.poll_enabled ? '等待首次自动轮询，可稍后刷新查看' : '轮询未启用，可手动同步评论';
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

function countBilibiliVideosWithPollDisabledButMissingAid(items) {
  return items.filter((item) => !item?.poll_enabled && !hasBilibiliVideoAid(item)).length;
}

function countBilibiliVideosWithPollDisabledAndNeverPolled(items) {
  return items.filter((item) => !item?.poll_enabled && !item?.last_polled_at).length;
}

function countBilibiliVideosWithPollDisabledAndPolled(items) {
  return items.filter((item) => !item?.poll_enabled && item?.last_polled_at).length;
}

function countBilibiliVideosWithPollEnabledButNeverPolled(items) {
  return items.filter((item) => item?.poll_enabled && !item?.last_polled_at).length;
}

function countBilibiliVideosWithPollEnabledAndPolled(items) {
  return items.filter((item) => item?.poll_enabled && item?.last_polled_at).length;
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
  const bvid = String(video?.bvid ?? '').trim();
  const recordId = String(video?.id ?? video?.video_id ?? '').trim();
  const hints = [
    hasAid ? `aid: ${video.aid}` : bilibiliPollErrorMessages.no_aid,
  ];
  if (!bvid) {
    hints.push(recordId ? `记录 ID: ${recordId}` : '未同步 BVID');
  }
  return `${escapeHtml(bvid || '未同步 BVID')}${hints
    .filter(Boolean)
    .map((text) => `<div class="form-hint" style="margin-top:4px;">${escapeHtml(text)}</div>`)
    .join('')}`;
}

function getBilibiliVideoMissingMetadataFields(video) {
  const missing = [];
  if (!hasBilibiliVideoAid(video)) {
    missing.push('aid');
  }
  if (!String(video?.title ?? '').trim()) {
    missing.push('标题');
  }
  if (!(typeof video?.owner_mid === 'number' && Number.isFinite(video.owner_mid))) {
    missing.push('UP主 MID');
  }
  return missing;
}

function renderBilibiliVideoTitle(video) {
  const hints = [];
  const title = String(video?.title ?? '').trim();
  const missingMetadataFields = getBilibiliVideoMissingMetadataFields(video);
  if (missingMetadataFields.length > 0) {
    hints.push(`缺少 ${missingMetadataFields.join(' / ')}`);
  }
  if (typeof video?.owner_mid === 'number' && Number.isFinite(video.owner_mid)) {
    hints.push(`UP主 MID: ${video.owner_mid}`);
  }
  if (video?.updated_at) {
    hints.push(formatBilibiliHintTime('更新', video.updated_at));
  }
  if (video?.created_at) {
    hints.push(formatBilibiliHintTime('创建', video.created_at));
  }
  return `${escapeHtml(title || '未同步标题')}${hints
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

function renderBilibiliVideoPollState(video) {
  const hasAid = hasBilibiliVideoAid(video);
  let hint = bilibiliPollErrorMessages.no_aid;
  if (hasAid) {
    hint = video?.poll_enabled ? '自动轮询中，等待计划任务执行' : '轮询停用，可手动同步评论';
  }
  return `${renderBoolBadge(video?.poll_enabled)}<div class="form-hint" style="margin-top:4px;">${escapeHtml(hint)}</div>`;
}

function renderBilibiliVideoCommentCount(video) {
  const count = Number(video?.comment_count ?? 0);
  const safeCount = Number.isFinite(count) && count > 0 ? count : 0;
  const hasCursor = typeof video?.last_rpid === 'number' && Number.isFinite(video.last_rpid);
  let hint = getBilibiliVideoNeverPolledHint(video);
  if (safeCount > 0) {
    hint = hasCursor ? '已有评论，游标已记录' : '已有评论，缺少游标';
  } else if (video?.last_polled_at) {
    hint = hasCursor ? '已轮询无评论，保留游标' : '已轮询无评论，未记录游标';
  }
  return `${escapeHtml(safeCount)}<div class="form-hint" style="margin-top:4px;">${escapeHtml(hint)}</div>`;
}

function renderBilibiliLastPolledCell(video) {
  if (video?.last_polled_at) {
    const cursorHint = typeof video?.last_rpid === 'number' && Number.isFinite(video.last_rpid)
      ? `评论游标: ${video.last_rpid}`
      : '未记录评论游标，可在下次轮询后补齐';
    return `${renderTimestamp(video.last_polled_at)}<div class="form-hint" style="margin-top:4px;">${escapeHtml(cursorHint)}</div>`;
  }
  return `从未轮询<div class="form-hint" style="margin-top:4px;">${escapeHtml(getBilibiliVideoNeverPolledHint(video))}</div>`;
}

function formatBilibiliVideoSummary(total, renderedCount, filterValue, offset = 0, limit = bilibiliVideoPageSize, items = []) {
  const filterLabel = filterValue === 'true'
    ? '轮询中'
    : filterValue === 'false'
      ? '已停用'
      : '全部状态';
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pollEnabledCount = countBilibiliVideosWithPollEnabled(items);
  const pollDisabledCount = Math.max(0, items.length - pollEnabledCount);
  const pollEnabledMissingAidCount = countBilibiliVideosWithPollEnabledButMissingAid(items);
  const pollDisabledSyncReadyCount = countBilibiliVideosWithPollDisabledButSyncReady(items);
  const pollDisabledMissingAidCount = countBilibiliVideosWithPollDisabledButMissingAid(items);
  const pollDisabledNeverPolledCount = countBilibiliVideosWithPollDisabledAndNeverPolled(items);
  const pollDisabledPolledCount = countBilibiliVideosWithPollDisabledAndPolled(items);
  const pollEnabledNeverPolledCount = countBilibiliVideosWithPollEnabledButNeverPolled(items);
  const pollEnabledPolledCount = countBilibiliVideosWithPollEnabledAndPolled(items);
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
  const pollDisabledSyncReadyText = filterValue === '' && pollDisabledSyncReadyCount > 0 ? `，轮询停用但可手动同步 ${pollDisabledSyncReadyCount} 条` : '';
  const pollDisabledMissingAidText = filterValue === '' && pollDisabledMissingAidCount > 0 ? `，轮询停用且缺少 aid ${pollDisabledMissingAidCount} 条` : '';
  const pollDisabledNeverPolledText = filterValue === '' && pollDisabledNeverPolledCount > 0 ? `，轮询停用且从未轮询 ${pollDisabledNeverPolledCount} 条` : '';
  const pollDisabledPolledText = filterValue === '' && pollDisabledPolledCount > 0 ? `，轮询停用且已有轮询记录 ${pollDisabledPolledCount} 条` : '';
  const pollEnabledNeverPolledText = filterValue === '' && pollEnabledNeverPolledCount > 0 ? `，轮询开启但尚未轮询 ${pollEnabledNeverPolledCount} 条` : '';
  const pollEnabledPolledText = filterValue === '' && pollEnabledPolledCount > 0 ? `，轮询开启且已有轮询记录 ${pollEnabledPolledCount} 条` : '';
  const syncReadyText = syncReadyCount > 0 ? `，可手动同步 ${syncReadyCount} 条` : '';
  const healthyPollText = healthyPollCount > 0 ? `，正常轮询 ${healthyPollCount} 条` : '';
  const successfulPollText = successfulPollCount > 0 ? `，成功轮询 ${successfulPollCount} 条` : '';
  const noNewPollText = noNewPollCount > 0 ? `，无新增评论 ${noNewPollCount} 条` : '';
  const pollErrorText = pollErrorCount > 0 ? `，轮询失败 ${pollErrorCount} 条` : '';
  const polledCountText = polledCount > 0 ? `，已有轮询记录 ${polledCount} 条` : '';
  const neverPolledText = neverPolledCount > 0 ? `，尚未轮询 ${neverPolledCount} 条` : '';
  const syncReadyNeverPolledText = syncReadyNeverPolledCount > 0 ? `，可手动同步但尚未轮询 ${syncReadyNeverPolledCount} 条` : '';
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
  return `筛选条件: ${filterLabel}，共 ${total} 条，当前展示 ${renderedCount} 条，第 ${currentPage}/${totalPages} 页${pollEnabledText}${pollDisabledText}${missingAidText}${pollEnabledMissingAidText}${pollDisabledSyncReadyText}${pollDisabledMissingAidText}${pollDisabledNeverPolledText}${pollDisabledPolledText}${pollEnabledNeverPolledText}${pollEnabledPolledText}${syncReadyText}${healthyPollText}${successfulPollText}${noNewPollText}${pollErrorText}${polledCountText}${neverPolledText}${syncReadyNeverPolledText}${ownerCountText}${missingOwnerText}${titledCountText}${missingTitleText}${completeMetadataText}${incompleteMetadataText}${polledIncompleteMetadataText}${commentedVideoText}${uncommentedVideoText}${polledWithoutCommentsText}${cursorVideoText}${commentedWithoutCursorText}${cursorWithoutCommentsText}${missingCursorVideoText}${polledWithoutCursorText}${commentCountText}`;
}

export {
  renderBilibiliVideoIdentity,
  renderBilibiliVideoTitle,
  renderBilibiliSyncButton,
  renderBilibiliVideoPollState,
  renderBilibiliVideoCommentCount,
  renderBilibiliLastPolledCell,
  renderBilibiliVideoPollResult,
  formatBilibiliVideoSummary,
};
