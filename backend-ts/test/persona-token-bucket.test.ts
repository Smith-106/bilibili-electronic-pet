import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the persona accessor so tests never touch the real Prisma. The bucket module imports
// getActivePersonaName for resolvePersonaIdForRateLimit; we stub it here.
const { getActivePersonaNameMock } = vi.hoisted(() => ({
  getActivePersonaNameMock: vi.fn(),
}));

vi.mock('../src/services/bilibili-runtime-config.js', () => ({
  getActivePersonaName: getActivePersonaNameMock,
}));

import {
  checkPersonaRateLimit,
  resolvePersonaIdForRateLimit,
  __resetBucketsForTest,
  __getBucketForTest,
  __C_RATE_LIMIT_CONSTANTS,
} from '../src/services/persona-token-bucket.js';

describe('persona-token-bucket (TASK-006, F2)', () => {
  beforeEach(() => {
    __resetBucketsForTest();
    getActivePersonaNameMock.mockReset();
    getActivePersonaNameMock.mockResolvedValue(null);
  });

  afterEach(() => {
    delete process.env.ANTIRISK_C_RATE_LIMIT_ENABLED;
  });

  it('exposes F2 capacity=20 and refill rate=20/min (0.333 tokens/s)', () => {
    expect(__C_RATE_LIMIT_CONSTANTS.CAPACITY).toBe(20);
    expect(__C_RATE_LIMIT_CONSTANTS.REFILL_RATE_PER_SEC).toBeCloseTo(20 / 60, 5);
  });

  it('starts with a full bucket and allows up to CAPACITY consecutive calls before rate_limited', () => {
    const persona = 'persona-full';
    for (let i = 0; i < 20; i++) {
      const result = checkPersonaRateLimit(persona);
      expect(result).toEqual({ allowed: true, reason: 'ok' });
    }
    // 21st call → bucket empty
    const exhausted = checkPersonaRateLimit(persona);
    expect(exhausted).toEqual({ allowed: false, reason: 'rate_limited' });
  });

  it('refills tokens over time (tokens replenish after waiting)', () => {
    const persona = 'persona-refill';
    // Exhaust the bucket.
    for (let i = 0; i < 20; i++) {
      checkPersonaRateLimit(persona);
    }
    expect(checkPersonaRateLimit(persona)).toEqual({ allowed: false, reason: 'rate_limited' });

    // Advance fake time by 3 seconds → 3 * (20/60) = 1 token refilled.
    const now = Date.now();
    const bucket = __getBucketForTest(persona)!;
    // Simulate 3s elapsed by rewinding lastRefill so refill computes 3s of accrual.
    bucket.lastRefill = now - 3000;
    bucket.tokens = 0;

    const result = checkPersonaRateLimit(persona);
    expect(result).toEqual({ allowed: true, reason: 'ok' });
    // The single refilled token was consumed → bucket should be ~0 again.
    expect(checkPersonaRateLimit(persona)).toEqual({ allowed: false, reason: 'rate_limited' });
  });

  it('returns {allowed:true, reason:"ok"} for null/empty persona (fail-open, L7)', () => {
    expect(checkPersonaRateLimit(null)).toEqual({ allowed: true, reason: 'ok' });
    expect(checkPersonaRateLimit(undefined)).toEqual({ allowed: true, reason: 'ok' });
    expect(checkPersonaRateLimit('')).toEqual({ allowed: true, reason: 'ok' });
  });

  it('always returns ok when ANTIRISK_C_RATE_LIMIT_ENABLED=false (L8 flag isolation)', () => {
    process.env.ANTIRISK_C_RATE_LIMIT_ENABLED = 'false';
    const persona = 'flag-off-persona';
    // Even after exhausting the bucket, the flag-off path bypasses the check.
    for (let i = 0; i < 30; i++) {
      expect(checkPersonaRateLimit(persona)).toEqual({ allowed: true, reason: 'ok' });
    }
    // No bucket state created when flag is off.
    expect(__getBucketForTest(persona)).toBeUndefined();
  });

  it('isolates buckets per persona (one persona exhausting does not affect another)', () => {
    const a = 'persona-A';
    const b = 'persona-B';
    for (let i = 0; i < 20; i++) {
      checkPersonaRateLimit(a);
    }
    expect(checkPersonaRateLimit(a)).toEqual({ allowed: false, reason: 'rate_limited' });
    // persona-B still has its own full bucket.
    expect(checkPersonaRateLimit(b)).toEqual({ allowed: true, reason: 'ok' });
  });

  it('resolvePersonaIdForRateLimit prefers the explicit payload persona_id', async () => {
    getActivePersonaNameMock.mockResolvedValue('db-persona');
    const resolved = await resolvePersonaIdForRateLimit('payload-persona');
    expect(resolved).toBe('payload-persona');
    expect(getActivePersonaNameMock).not.toHaveBeenCalled();
  });

  it('resolvePersonaIdForRateLimit falls back to getActivePersonaName when payload persona is missing', async () => {
    getActivePersonaNameMock.mockResolvedValue('db-persona');
    const resolved = await resolvePersonaIdForRateLimit(undefined);
    expect(resolved).toBe('db-persona');
    expect(getActivePersonaNameMock).toHaveBeenCalledTimes(1);
  });

  it('resolvePersonaIdForRateLimit returns null when both payload and DB lookup miss', async () => {
    getActivePersonaNameMock.mockResolvedValue(null);
    const resolved = await resolvePersonaIdForRateLimit(undefined);
    expect(resolved).toBeNull();
  });
});
