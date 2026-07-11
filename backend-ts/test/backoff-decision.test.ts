import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { recordAntiriskSignalMock, prismaMock } = vi.hoisted(() => ({
  recordAntiriskSignalMock: vi.fn(),
  prismaMock: {
    observabilityEvent: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../src/services/observability.js', () => ({
  recordAntiriskSignal: recordAntiriskSignalMock,
}));

vi.mock('../src/services/db-queries.js', () => ({
  prisma: () => prismaMock,
}));

// AntiriskSubclass is a type-only import from publisher.js — no runtime dependency.
// We don't mock publisher.js so the type-only import is erased at compile time.

const {
  isPersonaInBackoff,
  applyBackoff,
  rebuildBackoffFromDb,
  isBackoffEnabled,
  __resetBackoffMapForTest,
  __getBackoffStateForTest,
  DEFAULT_BACKOFF_CAP_BEHAVIOR_ANOMALY_SECONDS,
} = await import('../src/services/backoff-decision.js');

const trackedEnvKeys = [
  'ANTIRISK_BACKOFF_ENABLED',
  'ANTIRISK_BACKOFF_CAP_BEHAVIOR_ANOMALY',
  'ANTIRISK_BACKOFF_CAP_RATE_LIMIT',
] as const;

function clearBackoffEnv(): void {
  for (const key of trackedEnvKeys) {
    delete process.env[key];
  }
}

beforeEach(() => {
  clearBackoffEnv();
  __resetBackoffMapForTest();
  recordAntiriskSignalMock.mockReset();
  prismaMock.observabilityEvent.findMany.mockReset();
  recordAntiriskSignalMock.mockResolvedValue(undefined);
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  clearBackoffEnv();
  __resetBackoffMapForTest();
});

describe('backoff-decision applyBackoff', () => {
  it('sets backoffMap with cap 600s for behavior_anomaly and records backoff_applied', async () => {
    const before = Date.now();
    await applyBackoff('persona-A', 'behavior_anomaly', 'trace-1');

    const state = __getBackoffStateForTest('persona-A');
    expect(state).toBeDefined();
    expect(state!.subclass).toBe('behavior_anomaly');
    expect(state!.backoffUntil).toBeGreaterThanOrEqual(before + 600 * 1000 - 50);
    expect(state!.backoffUntil).toBeLessThanOrEqual(Date.now() + 600 * 1000 + 50);
    expect(state!.startedAt).toBeGreaterThanOrEqual(before);

    expect(recordAntiriskSignalMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'backoff_applied',
        persona_id: 'persona-A',
        error_subclass: 'behavior_anomaly',
        status: 'behavior_anomaly',
        metadata: { cap_seconds: 600 },
      }),
    );
  });

  it('sets backoffMap with cap 60s for rate_limit', async () => {
    const before = Date.now();
    await applyBackoff('persona-B', 'rate_limit', 'trace-2');

    const state = __getBackoffStateForTest('persona-B');
    expect(state).toBeDefined();
    expect(state!.subclass).toBe('rate_limit');
    expect(state!.backoffUntil).toBeGreaterThanOrEqual(before + 60 * 1000 - 50);
    expect(state!.backoffUntil).toBeLessThanOrEqual(Date.now() + 60 * 1000 + 50);
    expect(recordAntiriskSignalMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { cap_seconds: 60 },
      }),
    );
  });

  it('honors configurable cap via env', async () => {
    process.env.ANTIRISK_BACKOFF_CAP_BEHAVIOR_ANOMALY = '120';
    const before = Date.now();
    await applyBackoff('persona-C', 'behavior_anomaly', 'trace-3');

    const state = __getBackoffStateForTest('persona-C');
    expect(state!.backoffUntil).toBeGreaterThanOrEqual(before + 120 * 1000 - 50);
    expect(state!.backoffUntil).toBeLessThanOrEqual(Date.now() + 120 * 1000 + 50);
    expect(recordAntiriskSignalMock).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { cap_seconds: 120 } }),
    );
  });

  it('is a no-op when the feature flag is off (L8 rollback)', async () => {
    process.env.ANTIRISK_BACKOFF_ENABLED = 'false';
    await applyBackoff('persona-D', 'behavior_anomaly', 'trace-4');

    expect(__getBackoffStateForTest('persona-D')).toBeUndefined();
    expect(recordAntiriskSignalMock).not.toHaveBeenCalled();
    expect(isBackoffEnabled()).toBe(false);
  });

  it('still records the backoff_applied signal when persona_id is null (defensive)', async () => {
    await applyBackoff(null, 'behavior_anomaly', 'trace-5');
    // No persona state stored, but signal still recorded for online eval.
    expect(__getBackoffStateForTest('null')).toBeUndefined();
    expect(recordAntiriskSignalMock).toHaveBeenCalledWith(
      expect.objectContaining({ persona_id: null, event_type: 'backoff_applied' }),
    );
  });
});

describe('backoff-decision isPersonaInBackoff', () => {
  it('returns true during backoff and false after expiry', async () => {
    process.env.ANTIRISK_BACKOFF_CAP_RATE_LIMIT = '1'; // 1s for fast test
    await applyBackoff('persona-E', 'rate_limit', 'trace-6');

    expect(isPersonaInBackoff('persona-E')).toBe(true);

    // Wait past expiry.
    await new Promise((resolve) => setTimeout(resolve, 1200));
    expect(isPersonaInBackoff('persona-E')).toBe(false);
    // Expired entry is evicted from the map.
    expect(__getBackoffStateForTest('persona-E')).toBeUndefined();
  });

  it('returns false for unknown persona and null persona_id', () => {
    expect(isPersonaInBackoff('unknown-persona')).toBe(false);
    expect(isPersonaInBackoff(null)).toBe(false);
    expect(isPersonaInBackoff(undefined)).toBe(false);
  });

  it('returns false for all personas when the flag is off', async () => {
    await applyBackoff('persona-F', 'behavior_anomaly', 'trace-7');
    process.env.ANTIRISK_BACKOFF_ENABLED = 'false';
    expect(isPersonaInBackoff('persona-F')).toBe(false);
  });
});

describe('backoff-decision rebuildBackoffFromDb', () => {
  it('reconstructs backoffMap from antirisk_signal_detected rows within the max cap window', async () => {
    // behavior_anomaly row from 30s ago → cap 600s → backoffUntil = created_at + 600s (still active)
    const createdBehavior = new Date(Date.now() - 30 * 1000);
    // rate_limit row from 10s ago → cap 60s → backoffUntil = created_at + 60s (still active)
    const createdRate = new Date(Date.now() - 10 * 1000);
    // Expired rate_limit row from 120s ago → backoffUntil = created_at + 60s (expired)
    const createdExpired = new Date(Date.now() - 120 * 1000);

    prismaMock.observabilityEvent.findMany.mockResolvedValue([
      { persona_id: 'persona-G', error_subclass: 'behavior_anomaly', created_at: createdBehavior },
      { persona_id: 'persona-H', error_subclass: 'rate_limit', created_at: createdRate },
      { persona_id: 'persona-I', error_subclass: 'rate_limit', created_at: createdExpired },
      // Unknown subclass row — skipped.
      { persona_id: 'persona-J', error_subclass: 'unknown_subclass', created_at: createdBehavior },
      // Null persona — skipped.
      { persona_id: null, error_subclass: 'behavior_anomaly', created_at: createdBehavior },
    ]);

    await rebuildBackoffFromDb();

    const stateG = __getBackoffStateForTest('persona-G');
    const stateH = __getBackoffStateForTest('persona-H');
    const stateI = __getBackoffStateForTest('persona-I');
    const stateJ = __getBackoffStateForTest('persona-J');

    expect(stateG).toBeDefined();
    expect(stateG!.subclass).toBe('behavior_anomaly');
    expect(stateG!.backoffUntil).toBe(createdBehavior.getTime() + 600 * 1000);

    expect(stateH).toBeDefined();
    expect(stateH!.subclass).toBe('rate_limit');
    expect(stateH!.backoffUntil).toBe(createdRate.getTime() + 60 * 1000);

    // Expired row skipped.
    expect(stateI).toBeUndefined();
    // Unknown subclass skipped.
    expect(stateJ).toBeUndefined();

    // Queries antirisk_signal_detected within the max cap window (600s).
    expect(prismaMock.observabilityEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          event_type: 'antirisk_signal_detected',
          persona_id: { not: null },
        }),
      }),
    );
    const callArg = prismaMock.observabilityEvent.findMany.mock.calls[0][0] as {
      where: { created_at: { gte: Date } };
    };
    const since = callArg.where.created_at.gte.getTime();
    // since is now - 600s (max cap).
    expect(since).toBeLessThanOrEqual(Date.now() - DEFAULT_BACKOFF_CAP_BEHAVIOR_ANOMALY_SECONDS * 1000 + 100);
    expect(since).toBeGreaterThanOrEqual(Date.now() - DEFAULT_BACKOFF_CAP_BEHAVIOR_ANOMALY_SECONDS * 1000 - 100);
  });

  it('keeps the latest backoffUntil per persona when multiple rows exist', async () => {
    // The "latest backoffUntil" is computed per row as created_at + cap*1000.
    // An older behavior_anomaly row (cap 600s) can produce a later backoffUntil
    // than a newer rate_limit row (cap 60s), so the older row wins on backoffUntil.
    const older = new Date(Date.now() - 100 * 1000); // behavior_anomaly, cap 600 → now+500s
    const newer = new Date(Date.now() - 5 * 1000); // rate_limit, cap 60 → now+55s
    const expectedOld = older.getTime() + 600 * 1000;
    const expectedNew = newer.getTime() + 60 * 1000;
    expect(expectedOld).toBeGreaterThan(expectedNew); // sanity: older row wins on backoffUntil

    prismaMock.observabilityEvent.findMany.mockResolvedValue([
      { persona_id: 'persona-K', error_subclass: 'rate_limit', created_at: newer },
      { persona_id: 'persona-K', error_subclass: 'behavior_anomaly', created_at: older },
    ]);

    await rebuildBackoffFromDb();

    const state = __getBackoffStateForTest('persona-K');
    expect(state).toBeDefined();
    expect(state!.backoffUntil).toBe(expectedOld);
    expect(state!.subclass).toBe('behavior_anomaly');
  });

  it('logs a warning and leaves backoffMap empty when DB query fails (Fix-Don\'t-Hide)', async () => {
    __resetBackoffMapForTest();
    // Pre-populate to verify clear-on-failure does not happen (we only clear on success).
    // Actually, the implementation returns early on failure without clearing — verify empty stays empty.
    prismaMock.observabilityEvent.findMany.mockRejectedValue(new Error('db unreachable'));

    await rebuildBackoffFromDb();

    // No state populated.
    expect(__getBackoffStateForTest('any')).toBeUndefined();
    // Warning logged (console.warn spy).
    expect(console.warn).toHaveBeenCalled();
  });
});
