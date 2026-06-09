import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  filterBilibiliCredentials,
  formatBilibiliCredentialExpiryHint,
  formatBilibiliCredentialFilterLabel,
  formatBilibiliCredentialSummary,
  getBilibiliCredentialEmptyMessage,
  getBilibiliCredentialExpiryColor,
  getBilibiliCredentialExpiryState,
  getBilibiliCredentialMissingFields,
  getBilibiliCredentialUsageState,
  isBilibiliCredentialConfigured,
  renderBilibiliCredentialActiveState,
  renderBilibiliCredentialExpiry,
  renderBilibiliCredentialFingerprint,
  renderBilibiliCredentialName,
  renderBilibiliCredentialUsageCell,
} from '../../src/pages/bilibili/credential.js';

const now = Date.parse('2026-04-10T03:30:00.000Z');

function buildCredential(overrides = {}) {
  return {
    id: 1,
    name: 'primary',
    is_active: true,
    active: false,
    has_sessdata: true,
    has_bili_jct: true,
    buvid3: 'abcdef123456',
    expires_at: '2026-04-20T03:30:00.000Z',
    created_at: '2026-04-01T00:00:00.000Z',
    updated_at: '2026-04-09T00:00:00.000Z',
    ...overrides,
  };
}

describe('bilibili credential helpers', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(now);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('classifies expiry states and formats expiry hints', () => {
    const unset = getBilibiliCredentialExpiryState(undefined, now);
    const invalid = getBilibiliCredentialExpiryState('bad-date', now);
    const expired = getBilibiliCredentialExpiryState('2026-04-10T03:29:30.000Z', now);
    const expiringSoon = getBilibiliCredentialExpiryState('2026-04-10T05:30:00.000Z', now);
    const valid = getBilibiliCredentialExpiryState('2026-04-20T03:30:00.000Z', now);
    const immediateValid = getBilibiliCredentialExpiryState('2026-04-10T03:30:30.000Z', now);

    expect(unset).toMatchObject({ hasExpiry: false, expired: false, expiringSoon: false, cls: 'badge-muted' });
    expect(invalid).toMatchObject({ hasExpiry: true, expired: false, expiringSoon: false, cls: 'badge-danger' });
    expect(invalid.detail).toBe('bad-date');
    expect(expired).toMatchObject({ hasExpiry: true, expired: true, expiringSoon: false, cls: 'badge-danger' });
    expect(expiringSoon).toMatchObject({ hasExpiry: true, expired: false, expiringSoon: true, cls: 'badge-warning' });
    expect(valid).toMatchObject({ hasExpiry: true, expired: false, expiringSoon: false, cls: 'badge-success' });
    expect(immediateValid.detail).toBeTruthy();

    const unstableExpired = {
      count: 0,
      [Symbol.toPrimitive]() {
        this.count += 1;
        return this.count === 1 ? '2026-04-10T03:29:30.000Z' : 'bad-date';
      },
    };
    const unstableExpiring = {
      count: 0,
      [Symbol.toPrimitive]() {
        this.count += 1;
        return this.count === 1 ? '2026-04-10T05:30:00.000Z' : 'bad-date';
      },
    };
    const unstableValid = {
      count: 0,
      [Symbol.toPrimitive]() {
        this.count += 1;
        return this.count === 1 ? '2026-04-20T03:30:00.000Z' : 'bad-date';
      },
    };
    expect(getBilibiliCredentialExpiryState(unstableExpired, now).detail).toBe('bad-date');
    expect(getBilibiliCredentialExpiryState(unstableExpiring, now).detail).toBe('bad-date');
    expect(getBilibiliCredentialExpiryState(unstableValid, now).detail).toBe('bad-date');

    expect(formatBilibiliCredentialExpiryHint(unset)).toBeTruthy();
    expect(formatBilibiliCredentialExpiryHint(invalid)).toContain('bad-date');
    expect(formatBilibiliCredentialExpiryHint(expired)).toBeTruthy();
    expect(formatBilibiliCredentialExpiryHint(expiringSoon)).toBeTruthy();
    expect(formatBilibiliCredentialExpiryHint(valid)).toBeTruthy();
    expect(formatBilibiliCredentialExpiryHint(valid, false)).toBeTruthy();
    expect(formatBilibiliCredentialExpiryHint({ hasExpiry: true, label: 'custom', expired: false, expiringSoon: false, detail: '' }))
      .toBeTruthy();

    expect(getBilibiliCredentialExpiryColor(invalid)).toBe('var(--danger-color)');
    expect(getBilibiliCredentialExpiryColor(expiringSoon)).toBe('var(--warning-color)');
    expect(getBilibiliCredentialExpiryColor(valid)).toBe('var(--success-color)');
    expect(getBilibiliCredentialExpiryColor(unset)).toBe('var(--grey-2)');
    expect(renderBilibiliCredentialExpiry('bad-date')).toContain('badge-danger');
  });

  it('renders names, usage states, active states, and fingerprints', () => {
    expect(renderBilibiliCredentialName(null, 'fallback')).toContain('fallback');
    expect(renderBilibiliCredentialName(buildCredential({ name: '' }))).toContain('form-hint');
    expect(renderBilibiliCredentialName(buildCredential({
      name: 'named-only',
      updated_at: undefined,
      created_at: undefined,
    }))).toBe('named-only');

    expect(getBilibiliCredentialUsageState(null)).toEqual(expect.objectContaining({
      label: expect.any(String),
      detail: expect.any(String),
    }));

    expect(getBilibiliCredentialUsageState(buildCredential())).toEqual(expect.objectContaining({
      label: expect.any(String),
      detail: expect.stringContaining('2026'),
    }));
    expect(getBilibiliCredentialUsageState(buildCredential({ last_used_at: 'not-a-date' }))).toEqual(expect.objectContaining({
      label: expect.any(String),
      detail: expect.stringContaining('not-a-date'),
    }));
    expect(getBilibiliCredentialUsageState(buildCredential({ is_active: false, active: false }))).toEqual(expect.objectContaining({
      label: expect.any(String),
      detail: expect.any(String),
    }));
    expect(getBilibiliCredentialUsageState(buildCredential({
      is_active: false,
      active: false,
      has_sessdata: false,
      last_used_at: undefined,
    }))).toEqual(expect.objectContaining({
      label: expect.any(String),
      detail: expect.stringContaining('SESSDATA'),
    }));
    expect(getBilibiliCredentialUsageState(buildCredential({ has_sessdata: false }))).toEqual(expect.objectContaining({
      label: expect.any(String),
      detail: expect.stringContaining('SESSDATA'),
    }));
    expect(getBilibiliCredentialUsageState(buildCredential({
      is_active: false,
      active: false,
      has_bili_jct: false,
      last_used_at: '2026-04-09T03:30:00.000Z',
    }))).toEqual(expect.objectContaining({
      label: expect.any(String),
      detail: expect.stringContaining('bili_jct'),
    }));
    expect(getBilibiliCredentialUsageState(buildCredential({
      last_used_at: undefined,
      created_at: undefined,
      updated_at: undefined,
    }))).toEqual(expect.objectContaining({
      label: expect.any(String),
      detail: expect.any(String),
    }));
    expect(renderBilibiliCredentialUsageCell(buildCredential())).toContain('form-hint');
    expect(renderBilibiliCredentialUsageCell({
      is_active: true,
      active: false,
      has_sessdata: true,
      has_bili_jct: true,
      buvid3: 'manual-buvid3',
      last_used_at: undefined,
      updated_at: undefined,
      created_at: undefined,
    })).toContain('从未使用');

    expect(renderBilibiliCredentialActiveState(buildCredential())).toContain('form-hint');
    expect(renderBilibiliCredentialActiveState(buildCredential({ is_active: false, active: false }))).toContain('form-hint');
    expect(renderBilibiliCredentialActiveState(buildCredential({
      is_active: false,
      active: false,
      has_sessdata: false,
    }))).toContain('SESSDATA');
    expect(renderBilibiliCredentialActiveState(buildCredential({ has_sessdata: false, buvid3: '' }))).toContain('SESSDATA');

    expect(isBilibiliCredentialConfigured(buildCredential())).toBe(true);
    expect(isBilibiliCredentialConfigured(buildCredential({ has_sessdata: false }))).toBe(false);
    expect(getBilibiliCredentialMissingFields(buildCredential({
      has_sessdata: false,
      has_bili_jct: false,
      buvid3: '',
    }))).toEqual(['SESSDATA', 'bili_jct', 'buvid3']);

    expect(renderBilibiliCredentialFingerprint(buildCredential())).toContain('...3456');
    expect(renderBilibiliCredentialFingerprint(buildCredential({ buvid3: 'abcd' }))).toContain('abcd');
    expect(renderBilibiliCredentialFingerprint(buildCredential({ buvid3: 'abc' }))).toContain('buvid3:abc');
    expect(renderBilibiliCredentialFingerprint(buildCredential({ buvid3: 'cached...' }))).toContain('cached...');
    expect(renderBilibiliCredentialFingerprint(buildCredential({ buvid3: '   ' }))).toContain('buvid3');
    expect(renderBilibiliCredentialFingerprint(buildCredential({
      has_sessdata: false,
      has_bili_jct: false,
      buvid3: '',
    }))).toContain('SESSDATA');
  });

  it('formats summaries and filters credentials across active and expiry states', () => {
    const items = [
      buildCredential({ id: 1, is_active: true, active: false, expires_at: '2026-04-20T03:30:00.000Z' }),
      buildCredential({ id: 2, is_active: false, active: false, expires_at: '2026-04-09T03:30:00.000Z', last_used_at: '2026-04-09T03:30:00.000Z' }),
      buildCredential({ id: 3, is_active: true, active: false, expires_at: '2026-04-11T03:30:00.000Z', has_bili_jct: false }),
      buildCredential({ id: 4, is_active: false, active: false, expires_at: undefined, buvid3: '' }),
    ];

    expect(formatBilibiliCredentialFilterLabel()).toBeTruthy();
    expect(formatBilibiliCredentialFilterLabel('active', 'expired')).toBeTruthy();
    expect(formatBilibiliCredentialFilterLabel('inactive', 'expiring')).toBeTruthy();
    expect(formatBilibiliCredentialFilterLabel('', 'valid')).toBeTruthy();
    expect(formatBilibiliCredentialFilterLabel('', 'unset')).toBeTruthy();

    const allSummary = formatBilibiliCredentialSummary(items);
    const filteredSummary = formatBilibiliCredentialSummary(items, 'inactive', 'expired', 1);
    expect(allSummary).toContain('4');
    expect(filteredSummary).toContain('1');

    expect(filterBilibiliCredentials(items, 'active')).toHaveLength(2);
    expect(filterBilibiliCredentials(items, 'inactive')).toHaveLength(2);
    expect(filterBilibiliCredentials(items, '', 'expired')).toHaveLength(1);
    expect(filterBilibiliCredentials(items, '', 'expiring')).toHaveLength(1);
    expect(filterBilibiliCredentials(items, '', 'valid')).toHaveLength(2);
    expect(filterBilibiliCredentials(items, '', 'unset')).toHaveLength(1);
    expect(filterBilibiliCredentials(items, 'inactive', 'unset')).toHaveLength(1);

    expect(getBilibiliCredentialEmptyMessage()).toBeTruthy();
    expect(getBilibiliCredentialEmptyMessage('active', 'expired')).toContain(formatBilibiliCredentialFilterLabel('active', 'expired'));
  });
});
