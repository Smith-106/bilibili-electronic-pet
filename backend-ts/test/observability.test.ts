import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  OBSERVABILITY_BUFFER_CAPACITY,
  __resetObservabilityBufferForTest,
  ensureTraceId,
  getObservabilityDropCount,
  recordAntiriskSignal,
  recordObservabilityEvent,
} from '../src/services/observability.js';

const mockPrisma = vi.hoisted(() => ({
  observabilityEvent: {
    createMany: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../src/services/db-queries.js', () => ({
  prisma: () => mockPrisma,
}));

beforeEach(() => {
  __resetObservabilityBufferForTest();
  mockPrisma.observabilityEvent.createMany.mockReset();
  mockPrisma.observabilityEvent.createMany.mockResolvedValue({ count: 0 });
  mockPrisma.observabilityEvent.create.mockReset();
  mockPrisma.observabilityEvent.create.mockResolvedValue({});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  __resetObservabilityBufferForTest();
});

describe('ensureTraceId', () => {
  it('uses crypto.randomUUID (no Math.random) for generated trace ids', () => {
    const mathSpy = vi.spyOn(Math, 'random');
    const id = ensureTraceId();
    expect(mathSpy).not.toHaveBeenCalled();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('preserves a caller-provided trimmed trace id', () => {
    expect(ensureTraceId('  abc-123  ')).toBe('abc-123');
  });

  it('generates distinct ids across calls', () => {
    const a = ensureTraceId();
    const b = ensureTraceId();
    expect(a).not.toBe(b);
  });
});

describe('recordObservabilityEvent drop_count', () => {
  it('increments drop_count when buffer capacity is exceeded', () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    // Force createMany to reject so microtask flushes fail and the buffer accumulates
    // rather than draining synchronously.
    mockPrisma.observabilityEvent.createMany.mockRejectedValue(new Error('db_down'));

    // Fire-and-forget: do NOT await, so microtask flushes stay queued and the buffer
    // accumulates synchronously until capacity is exceeded.
    const overflowCount = 5;
    for (let i = 0; i < OBSERVABILITY_BUFFER_CAPACITY + overflowCount; i++) {
      void recordObservabilityEvent({
        event_type: 'overflow_probe',
        trace_id: `trace-${i}`,
      });
    }

    // Overflow pushes (beyond capacity) are dropped synchronously and counted via drop_count.
    // We assert the count is non-zero (overflow detected) rather than an exact number,
    // since concurrent microtask flush failures also contribute to drop_count.
    expect(getObservabilityDropCount()).toBeGreaterThan(0);
  });

  it('keeps drop_count at zero on healthy flush path', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await recordObservabilityEvent({
      event_type: 'healthy',
      trace_id: 'trace-healthy-1',
    });

    // The push triggers a microtask flush; wait for createMany to be invoked at least once.
    await vi.waitFor(() => {
      expect(mockPrisma.observabilityEvent.createMany).toHaveBeenCalled();
    });

    expect(getObservabilityDropCount()).toBe(0);
  });

  it('increments drop_count on flush failure without bare console.error catch', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockPrisma.observabilityEvent.createMany.mockRejectedValueOnce(new Error('flush_down'));

    await recordObservabilityEvent({
      event_type: 'flush_fail',
      trace_id: 'trace-flush-fail',
    });

    await vi.waitFor(() => {
      expect(getObservabilityDropCount()).toBe(1);
    });
  });
});

describe('drop_count threshold alert (TASK-004)', () => {
  // Dynamic import with stubbed env so DROP_COUNT_THRESHOLD / BUFFER_CAPACITY are
  // evaluated at module load with small test values. The static import above keeps
  // the default 4096/100 constants and must NOT be affected by these stubs.
  async function loadWithThreshold(threshold: string, capacity: string) {
    vi.resetModules();
    vi.stubEnv('OBSERVABILITY_DROP_COUNT_THRESHOLD', threshold);
    vi.stubEnv('OBSERVABILITY_BUFFER_CAPACITY', capacity);
    const mod = await import('../src/services/observability.js');
    mod.__resetObservabilityBufferForTest();
    return mod;
  }

  it('isDropCountThresholdExceeded flips true once drop_count reaches the threshold', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    // recordAntiriskSignal catches prisma.create rejection and increments drop_count
    // deterministically (synchronous await path), giving us precise control over the
    // count without depending on buffer-overflow microtask timing.
    mockPrisma.observabilityEvent.create.mockRejectedValue(new Error('db_down'));

    const mod = await loadWithThreshold('2', '2');

    expect(mod.isDropCountThresholdExceeded()).toBe(false);

    await mod.recordAntiriskSignal({
      event_type: 'antirisk_signal_detected',
      trace_id: 'trace-1',
      error_subclass: 'behavior_anomaly',
    });
    // drop_count = 1, threshold = 2 → not yet exceeded.
    expect(mod.getObservabilityDropCount()).toBe(1);
    expect(mod.isDropCountThresholdExceeded()).toBe(false);

    await mod.recordAntiriskSignal({
      event_type: 'antirisk_signal_detected',
      trace_id: 'trace-2',
      error_subclass: 'rate_limit',
    });
    // drop_count = 2 >= threshold(2) → exceeded.
    expect(mod.getObservabilityDropCount()).toBe(2);
    expect(mod.isDropCountThresholdExceeded()).toBe(true);
  });

  it('emits an observability_drop_count event via the buffer path when threshold is breached', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    // Drive drop_count past the threshold via the antirisk-reject path (deterministic).
    mockPrisma.observabilityEvent.create.mockRejectedValue(new Error('db_down'));

    // Fake timers BEFORE module load so the setInterval registered by
    // scheduleDropCountAlert is owned by the fake timer system and can be advanced.
    vi.useFakeTimers();
    const mod = await loadWithThreshold('2', '2');

    for (let i = 0; i < 2; i += 1) {
      await mod.recordAntiriskSignal({
        event_type: 'antirisk_signal_detected',
        trace_id: `trace-${i}`,
        error_subclass: 'behavior_anomaly',
      });
    }
    expect(mod.getObservabilityDropCount()).toBe(2);
    expect(mod.isDropCountThresholdExceeded()).toBe(true);

    // Switch createMany to a healthy path so the alert event (emitted via the normal
    // observation buffer) actually reaches createMany when the timer fires.
    mockPrisma.observabilityEvent.createMany.mockReset();
    mockPrisma.observabilityEvent.createMany.mockResolvedValue({ count: 0 });

    // Advance past the 30s alert interval. The alert timer fires
    // recordObservabilityEvent({event_type:'observability_drop_count'}) → pushToBuffer
    // → microtask flush → createMany with a batch containing the alert row.
    await vi.advanceTimersByTimeAsync(31_000);
    const calls = mockPrisma.observabilityEvent.createMany.mock.calls;
    const dropAlertCall = calls.find((batch) =>
      batch[0].data.some(
        (row: { event_type: string }) => row.event_type === 'observability_drop_count',
      ),
    );
    expect(dropAlertCall).toBeDefined();
  });
});

describe('recordAntiriskSignal DB-reject containment (TASK-004 fail-closed propagation)', () => {
  it('catches prisma.create rejection, increments drop_count, and does NOT reject', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockPrisma.observabilityEvent.create.mockRejectedValueOnce(new Error('db_down'));

    // The await must NOT throw — containment means no unhandledRejection escapes
    // into publisher.ts's enclosing catch block.
    await expect(
      recordAntiriskSignal({
        event_type: 'antirisk_signal_detected',
        trace_id: 'trace-antirisk-1',
        error_subclass: 'behavior_anomaly',
        metadata: { platform: 'bilibili', error_message: '-352' },
      }),
    ).resolves.toBeUndefined();

    // The lost signal is accounted into drop_count (same channel as buffer overflow),
    // so the readiness drop_count blocker (TASK-005) can flag red.
    expect(getObservabilityDropCount()).toBe(1);
  });
});
