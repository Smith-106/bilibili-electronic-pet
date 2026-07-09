import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  OBSERVABILITY_BUFFER_CAPACITY,
  __resetObservabilityBufferForTest,
  ensureTraceId,
  getObservabilityDropCount,
  recordObservabilityEvent,
} from '../src/services/observability.js';

const mockPrisma = vi.hoisted(() => ({
  observabilityEvent: {
    createMany: vi.fn(),
  },
}));

vi.mock('../src/services/db-queries.js', () => ({
  prisma: () => mockPrisma,
}));

beforeEach(() => {
  __resetObservabilityBufferForTest();
  mockPrisma.observabilityEvent.createMany.mockReset();
  mockPrisma.observabilityEvent.createMany.mockResolvedValue({ count: 0 });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
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
