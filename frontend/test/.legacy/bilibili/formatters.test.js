import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  bilibiliVideoPageSize,
  formatBilibiliBlockingReasons,
  formatBilibiliCoverage,
  formatBilibiliCredentialHealth,
  formatBilibiliDiagnosticHealth,
  formatBilibiliHintTime,
  formatBilibiliPollInterval,
  formatBilibiliPollIntervalHint,
  formatBilibiliPollResultMessage,
  formatBilibiliPublishMode,
  formatBilibiliPublishModeHealth,
  formatBilibiliRateLimit,
  formatBilibiliRateLimitHint,
  formatBilibiliToggleState,
  formatBilibiliVideoSplit,
  getBilibiliErrorMessage,
  normalizeOptionalDateTimeValue,
  validateBilibiliCredentialInput,
  validateBilibiliVideoInput,
} from '../../src/pages/bilibili/formatters.js';

describe('bilibili formatters', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-04-10T03:30:00.000Z'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('validates bilibili input and normalizes datetimes', () => {
    expect(bilibiliVideoPageSize).toBe(50);

    expect(getBilibiliErrorMessage(new Error('bilibili_sync_failed'))).toBeTruthy();
    expect(getBilibiliErrorMessage('request_failed')).toBeTruthy();
    expect(getBilibiliErrorMessage(null)).toBeTruthy();

    expect(validateBilibiliVideoInput('')).toBe('bvid_required');
    expect(validateBilibiliVideoInput('BV123')).toBe('invalid_bvid_format');
    expect(validateBilibiliVideoInput('BV1GJ411x7fD')).toBeNull();

    expect(validateBilibiliCredentialInput({})).toBe('name_required');
    expect(validateBilibiliCredentialInput({ name: 'a' })).toBe('sessdata_required');
    expect(validateBilibiliCredentialInput({ name: 'a', sessdata: 's' })).toBe('bili_jct_required');
    expect(validateBilibiliCredentialInput({ name: 'a', sessdata: 's', bili_jct: 'j' })).toBe('buvid3_required');
    expect(validateBilibiliCredentialInput({ name: 'a', sessdata: 's', bili_jct: 'j', buvid3: 'b', expires_at: null })).toBe('invalid_expires_at');
    expect(validateBilibiliCredentialInput({ name: 'a', sessdata: 's', bili_jct: 'j', buvid3: 'b', expires_at: '2026-01-01T00:00:00.000Z' })).toBeNull();

    expect(normalizeOptionalDateTimeValue()).toBeUndefined();
    expect(normalizeOptionalDateTimeValue('bad-date')).toBeNull();
    expect(normalizeOptionalDateTimeValue('2026-04-10T03:30:00.000Z')).toBe('2026-04-10T03:30:00.000Z');
  });

  it('formats blocking reasons, modes, toggles, and rate limits', () => {
    expect(formatBilibiliBlockingReasons(null)).toBe('');
    expect(formatBilibiliBlockingReasons(['auth:no active credential', '', 'custom_reason'])).toContain('custom_reason');

    expect(formatBilibiliPublishMode('')).toBeTruthy();
    expect(formatBilibiliPublishMode('native_bilibili')).toBeTruthy();
    expect(formatBilibiliPublishMode('unknown_mode')).toContain('unknown_mode');

    expect(formatBilibiliToggleState(true, 'on', 'off')).toBe('on');
    expect(formatBilibiliToggleState(false, 'on', 'off')).toBe('off');

    expect(formatBilibiliPollInterval(-1)).toContain('');
    expect(formatBilibiliPollInterval(120)).toContain('2');
    expect(formatBilibiliPollInterval(75)).toContain('75');

    expect(formatBilibiliPollIntervalHint(0)).toContain('');
    expect(formatBilibiliPollIntervalHint(30)).toContain('2');
    expect(formatBilibiliPollIntervalHint(120)).toContain('30');
    expect(formatBilibiliPollIntervalHint(7200)).toContain('2');

    expect(formatBilibiliRateLimit(0)).toContain('');
    expect(formatBilibiliRateLimit(120)).toContain('120');
    expect(formatBilibiliRateLimitHint(0)).toContain('');
    expect(formatBilibiliRateLimitHint(120)).toContain('2');
    expect(formatBilibiliRateLimitHint(1)).toContain('60');
  });

  it('formats coverage, splits, results, and hint time', () => {
    expect(formatBilibiliCoverage(1, 0, '覆盖')).toContain('监控对象');
    expect(formatBilibiliCoverage(12, 10, '覆盖')).toContain('10');
    expect(formatBilibiliCoverage(Number.NaN, 10, '覆盖')).toContain('0');

    expect(formatBilibiliVideoSplit(0, 0)).toContain('BVID');
    expect(formatBilibiliVideoSplit(10, 4)).toContain('4');
    expect(formatBilibiliVideoSplit(Number.NaN, 4)).toContain('BVID');

    expect(formatBilibiliPollResultMessage({ videos: 3, comments: 2, events_injected: 4 })).toContain('3');
    expect(formatBilibiliPollResultMessage({ videos: 1 }, { subject: '视频' })).toContain('视频');
    expect(formatBilibiliPollResultMessage({ videos: 0 }, { subject: '轮询' })).toContain('暂无');

    expect(formatBilibiliHintTime('更新时间', '')).toBe('');
    expect(formatBilibiliHintTime('更新时间', 'bad-date')).toContain('bad-date');
    expect(formatBilibiliHintTime('更新时间', '2026-04-10T03:29:45.000Z')).toContain('更新时间');
  });

  it('formats health states for credentials, diagnostics, and publish mode', () => {
    expect(formatBilibiliCredentialHealth(false, false)).toBeTruthy();
    expect(formatBilibiliCredentialHealth(true, true)).toBeTruthy();
    expect(formatBilibiliCredentialHealth(true, false)).toBeTruthy();

    expect(formatBilibiliDiagnosticHealth({ checks: {}, signals: {} })).toBeTruthy();
    expect(
      formatBilibiliDiagnosticHealth({
        checks: { auth: { ready: true }, worker_or_publish: { ready: true } },
        signals: { polling_worker_enabled: true, native_publish_enabled: true, real_auth_ready: true },
        blocking_reasons: ['dependency:diagnostics_unavailable'],
      }),
    ).toBeTruthy();
    expect(
      formatBilibiliDiagnosticHealth({
        checks: { auth: { ready: true }, worker_or_publish: { ready: false } },
        signals: { polling_worker_enabled: true, native_publish_enabled: false },
        blocking_reasons: ['auth:credential_validation_failed'],
      }),
    ).toBeTruthy();
    expect(
      formatBilibiliDiagnosticHealth({
        checks: { auth: { ready: false }, worker_or_publish: { ready: true } },
        signals: { polling_worker_enabled: false, native_publish_enabled: true },
        blocking_reasons: ['config:bilibili_enabled is false'],
      }),
    ).toBeTruthy();

    expect(
      formatBilibiliPublishModeHealth({
        signals: { publish_mode_config_ready: false, native_publish_enabled: false, polling_worker_enabled: false },
      }),
    ).toContain('');
    expect(
      formatBilibiliPublishModeHealth({
        signals: { publish_mode_config_ready: true, native_publish_enabled: true, polling_worker_enabled: true },
      }),
    ).toContain('');
  });

  it('covers numeric formatter boundary fallbacks', () => {
    expect(formatBilibiliPollIntervalHint(5)).toBeTruthy();
    expect(formatBilibiliPollIntervalHint(600)).toBeTruthy();
    expect(formatBilibiliPollIntervalHint(36000)).toBeTruthy();

    expect(formatBilibiliRateLimitHint(600)).toBeTruthy();

    expect(formatBilibiliCoverage(1, undefined)).toBeTruthy();
    expect(formatBilibiliCoverage(undefined, 10)).toBeTruthy();

    expect(formatBilibiliVideoSplit(undefined, 4)).toBeTruthy();
    expect(formatBilibiliVideoSplit(10, undefined)).toBeTruthy();
    expect(formatBilibiliVideoSplit(10, Number.NaN)).toBeTruthy();

    expect(formatBilibiliPollResultMessage({ videos: 1 })).toBeTruthy();
  });

  it('covers diagnostic health with disabled auth paths and blockers', () => {
    expect(
      formatBilibiliDiagnosticHealth({
        signals: { polling_worker_enabled: false, native_publish_enabled: false },
        blocking_reasons: ['dependency:diagnostics_unavailable'],
      }),
    ).toBeTruthy();
  });
});
