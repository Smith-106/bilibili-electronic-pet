import { describe, expect, it } from 'vitest';

import {
  formatBilibiliVideoSummary,
  getBilibiliVideoEmptyMessage,
  parseBilibiliPollFilter,
  renderBilibiliLastPolledCell,
  renderBilibiliSyncButton,
  renderBilibiliVideoCommentCount,
  renderBilibiliVideoIdentity,
  renderBilibiliVideoPollResult,
  renderBilibiliVideoPollState,
  renderBilibiliVideoTitle,
} from '../../src/pages/bilibili/video.js';

describe('bilibili video helpers', () => {
  it('parses poll filters and renders filter-specific empty messages', () => {
    expect(parseBilibiliPollFilter('true')).toBe(true);
    expect(parseBilibiliPollFilter('false')).toBe(false);
    expect(parseBilibiliPollFilter('')).toBeUndefined();

    expect(getBilibiliVideoEmptyMessage('true')).toBeTruthy();
    expect(getBilibiliVideoEmptyMessage('false')).toBeTruthy();
    expect(getBilibiliVideoEmptyMessage('')).toBeTruthy();
  });

  it('covers sparse poll, identity, and counter branches', () => {
    expect(renderBilibiliVideoPollResult({ last_poll_status: '   ' })).toContain('badge-muted');
    expect(renderBilibiliVideoPollResult({ last_poll_status: 'ok' })).toContain('badge-success');
    expect(renderBilibiliVideoPollResult({ last_poll_status: 'no_new' })).toContain('badge-muted');
    expect(renderBilibiliVideoPollResult({ last_poll_status: 'error', last_poll_error: 'raw_error' }))
      .toContain('raw_error');
    expect(renderBilibiliVideoPollResult({
      last_poll_status: '',
      last_polled_at: '2026-04-10T03:00:00.000Z',
      last_rpid: null,
    })).toContain('badge-muted');

    expect(renderBilibiliVideoIdentity({})).toContain('BVID');
    expect(renderBilibiliSyncButton({ video_id: 'video-fallback', aid: 1 })).toContain('video-fallback');
    expect(renderBilibiliVideoPollState({ aid: 1, poll_enabled: false })).toContain('badge');
    expect(renderBilibiliVideoCommentCount({ aid: 1, comment_count: 'bad', last_polled_at: null })).toContain('0');
    expect(renderBilibiliVideoCommentCount({ aid: 1, last_polled_at: null })).toContain('0');
    expect(renderBilibiliVideoCommentCount({ aid: 1, comment_count: 3, last_rpid: null })).toContain('3');
    expect(renderBilibiliVideoCommentCount({
      aid: 1,
      comment_count: 0,
      last_polled_at: '2026-04-10T03:00:00.000Z',
    })).toContain('0');
    expect(renderBilibiliLastPolledCell({ aid: 1, poll_enabled: true })).toContain('form-hint');
  });

  it('summarizes empty and sparse video pages', () => {
    expect(formatBilibiliVideoSummary(0, 0, 'true')).toContain('1/1');
    expect(formatBilibiliVideoSummary(0, 0, 'false', 0, 50, [])).toContain('1/1');

    const sparseSummary = formatBilibiliVideoSummary(2, 2, '', 0, 50, [
      {
        aid: null,
        title: null,
        owner_mid: Number.NaN,
        poll_enabled: false,
        comment_count: -1,
        last_polled_at: '2026-04-10T03:00:00.000Z',
        last_poll_status: '',
        last_rpid: null,
      },
      {
        aid: 12,
        title: undefined,
        owner_mid: 8,
        poll_enabled: false,
        comment_count: undefined,
        last_polled_at: null,
        last_poll_status: ' raw ',
        last_rpid: 77,
      },
      {
        aid: 13,
        title: 'comment without cursor',
        owner_mid: 9,
        poll_enabled: true,
        comment_count: 4,
        last_polled_at: '2026-04-10T03:00:00.000Z',
        last_poll_status: 'ok',
        last_rpid: undefined,
      },
    ]);

    expect(sparseSummary).toContain('2');
    expect(sparseSummary).toContain('aid');
  });

  it('renders poll results across empty, known, unknown, and historical states', () => {
    let readCount = 0;
    const unstableStatusVideo = {
      get last_poll_status() {
        readCount += 1;
        return readCount === 1 ? 'ok' : undefined;
      },
    };
    expect(renderBilibiliVideoPollResult(unstableStatusVideo)).toBe('-');
    expect(renderBilibiliVideoPollResult({ last_poll_status: '   ', last_polled_at: '2026-04-10T03:00:00.000Z' })).toContain('已轮询但未记录结果');
    expect(renderBilibiliVideoPollResult({ last_poll_status: '' })).toContain('未轮询');
    expect(renderBilibiliVideoPollResult({ last_poll_status: 'ok', last_rpid: 123 })).toContain('123');
    expect(renderBilibiliVideoPollResult({ last_poll_status: 'no_new', last_rpid: 123 })).toContain('123');
    expect(renderBilibiliVideoPollResult({ last_poll_status: 'error', last_poll_error: 'retry_exhausted' })).toContain('重试');
    expect(renderBilibiliVideoPollResult({ last_poll_status: 'custom_status' })).toContain('custom_status');
    expect(renderBilibiliVideoPollResult({
      last_poll_status: '',
      last_polled_at: '2026-04-10T03:00:00.000Z',
      last_rpid: 88,
    })).toContain('游标已保留');
    expect(renderBilibiliVideoPollResult({ last_poll_status: null })).toContain('未轮询');
    expect(renderBilibiliVideoPollResult({ last_poll_status: '   ' })).toContain('form-hint');
  });

  it('renders identity, metadata, sync, poll, count, and timestamp fallbacks', () => {
    const missingMetadata = {
      id: 9,
      bvid: '',
      aid: null,
      title: '',
      owner_mid: null,
      poll_enabled: false,
      comment_count: 0,
      last_polled_at: '2026-04-10T03:00:00.000Z',
      last_rpid: 99,
      created_at: '2026-04-01T00:00:00.000Z',
      updated_at: '2026-04-02T00:00:00.000Z',
    };
    const completeMetadata = {
      id: 10,
      bvid: 'BV1GJ411x7fD',
      aid: 1001,
      title: 'video title',
      owner_mid: 42,
      poll_enabled: true,
      comment_count: 3,
      last_polled_at: '2026-04-10T03:00:00.000Z',
      last_rpid: 100,
      created_at: '2026-04-01T00:00:00.000Z',
      updated_at: '2026-04-02T00:00:00.000Z',
    };

    expect(renderBilibiliVideoIdentity(missingMetadata)).toContain('记录 ID');
    expect(renderBilibiliVideoIdentity(completeMetadata)).toContain('aid: 1001');
    expect(renderBilibiliVideoTitle(missingMetadata)).toContain('缺少');
    expect(renderBilibiliVideoTitle(completeMetadata)).toContain('42');
    expect(renderBilibiliVideoTitle(completeMetadata)).toContain('更新');
    expect(renderBilibiliVideoTitle(completeMetadata)).toContain('创建');
    expect(renderBilibiliSyncButton(missingMetadata)).toContain('disabled');
    expect(renderBilibiliSyncButton(completeMetadata)).not.toContain('disabled');
    expect(renderBilibiliVideoPollState(missingMetadata)).toContain('缺少');
    expect(renderBilibiliVideoPollState(completeMetadata)).toContain('自动');
    expect(renderBilibiliVideoCommentCount(missingMetadata)).toContain('保留游标');
    expect(renderBilibiliVideoCommentCount(completeMetadata)).toContain('3');
    expect(renderBilibiliLastPolledCell(missingMetadata)).toContain('99');
  });

  it('summarizes mixed video pages with all diagnostic counters', () => {
    const summary = formatBilibiliVideoSummary(4, 4, '', 50, 50, [
      {
        aid: 1,
        title: 'ok comments',
        owner_mid: 1,
        poll_enabled: true,
        comment_count: 2,
        last_polled_at: '2026-04-10T03:00:00.000Z',
        last_poll_status: 'ok',
        last_rpid: 10,
      },
      {
        aid: 2,
        title: 'no new',
        owner_mid: 2,
        poll_enabled: true,
        comment_count: 0,
        last_polled_at: '2026-04-10T03:00:00.000Z',
        last_poll_status: 'no_new',
        last_rpid: 20,
      },
      {
        aid: null,
        title: '',
        owner_mid: null,
        poll_enabled: true,
        comment_count: 0,
        last_polled_at: null,
        last_poll_status: 'error',
        last_rpid: null,
      },
      {
        aid: 3,
        title: '',
        owner_mid: null,
        poll_enabled: false,
        comment_count: 0,
        last_polled_at: null,
        last_poll_status: '',
        last_rpid: null,
      },
    ]);

    expect(summary).toContain('第 2/1 页');
    expect(summary).toContain('轮询开启');
    expect(summary).toContain('轮询失败');
    expect(summary).toContain('缺少 aid');
    expect(summary).toContain('评论');
  });
  it('covers nullish video helper fallbacks', () => {
    expect(renderBilibiliVideoTitle({ aid: 1, title: undefined, owner_mid: 2 })).toContain('2');
    expect(renderBilibiliVideoCommentCount({
      aid: 1,
      comment_count: undefined,
      last_polled_at: '2026-04-10T03:00:00.000Z',
    })).toContain('0');
    expect(renderBilibiliLastPolledCell({
      aid: 1,
      last_polled_at: '2026-04-10T03:00:00.000Z',
      last_rpid: undefined,
    })).toContain('form-hint');
    expect(formatBilibiliVideoSummary(1, 1, '', 0, 50, [
      {
        aid: 1,
        title: 'polled no comments',
        owner_mid: 2,
        last_polled_at: '2026-04-10T03:00:00.000Z',
        comment_count: undefined,
      },
    ])).toContain('1');
  });
});
