/**
 * Observability services for tracing and event recording
 * Migrated from Python: app/services/observability.py
 *
 * BG-002 三件套：
 * - 签名 RecordObservabilityEventService = (...) => Promise<void>（调用方可选 await 或 fire-and-forget）
 * - ensureTraceId 用 crypto.randomUUID 替代 Math.random UUID（L9）
 * - 落库走模块级内存有界缓冲 + 背景 flush（prisma.observabilityEvent.createMany），
 *   缓冲溢出 / flush 失败递增 dropCount，导出 getObservabilityDropCount() 供 readiness 派生
 *
 * 普通观测事件 fire-and-forget 不阻塞热路径；风控信号同步 await 路径由 TASK-003 落地。
 */

import { randomUUID } from 'node:crypto';
import type { EnsureTraceIdService, RecordObservabilityEventService, BuildLogContextService } from './interfaces.js';
import { prisma as getPrisma } from './db-queries.js';

/**
 * Memory-bounded buffer capacity for observability events.
 * F1 (Free): tunable via OBSERVABILITY_BUFFER_CAPACITY env (default 4096).
 * Overflow drops incoming events and increments dropCount.
 *
 * Exported for tests that need the resolved capacity (env-driven, evaluated at
 * module load). Mutating the env after import does NOT retroactively resize
 * the running buffer.
 */
export const OBSERVABILITY_BUFFER_CAPACITY = (() => {
  const raw = Number.parseInt(process.env.OBSERVABILITY_BUFFER_CAPACITY ?? '4096', 10);
  // Guard (review-odyssey 002): NaN 会让 `length >= NaN` 永真 false → buffer 永不溢出 →
  // 无限增长 OOM。isFinite + [1, 1_000_000] 守护, 与 llm-client/search env 数值守护标准一致。
  return Number.isFinite(raw) && raw > 0 && raw <= 1_000_000 ? raw : 4096;
})();

/**
 * Drop-count threshold (F2). When getObservabilityDropCount() >= this value,
 * an ObservabilityEvent {event_type:'observability_drop_count'} is emitted
 * periodically via the normal observation buffer path so readiness can flag red.
 */
const DROP_COUNT_THRESHOLD = (() => {
  const raw = Number.parseInt(process.env.OBSERVABILITY_DROP_COUNT_THRESHOLD ?? '100', 10);
  // Guard (review-odyssey 002): NaN 会让 `dropCount >= NaN` 永真 false → 告警永不触发,
  // 且 NaN 进 event_metadata 持久化。isFinite + [1, 1_000_000] 守护。
  return Number.isFinite(raw) && raw > 0 && raw <= 1_000_000 ? raw : 100;
})();

/**
 * Drop-count alert interval (ms). When drop_count crosses the threshold, a
 * periodic ObservabilityEvent is emitted (not more often than this) so the
 * overflow stays visible in the observability stream instead of a one-shot blip.
 */
const DROP_COUNT_ALERT_INTERVAL_MS = 30_000;

/**
 * Flush batch size for background createMany writes.
 */
const OBSERVABILITY_FLUSH_BATCH_SIZE = 128;

/**
 * Background flush interval (ms). Reuses the task-queue.ts queue/worker pattern
 * (in-memory bounded buffer + background worker) without instantiating a new BullMQ Queue.
 */
const OBSERVABILITY_FLUSH_INTERVAL_MS = 5000;

type BufferedObservabilityEvent = {
  event_type: string;
  trace_id: string;
  comment_id: string | null;
  job_id: number | null;
  status: string | null;
  duration_ms: number | null;
  event_metadata: string;
};

const eventBuffer: BufferedObservabilityEvent[] = [];
let dropCount = 0;
let flushInFlight = false;
let flushTimer: NodeJS.Timeout | null = null;
let dropCountAlertTimer: NodeJS.Timeout | null = null;

/**
 * Generate or ensure trace ID
 * Migrated from: app.services.observability.ensure_trace_id
 */
export const ensureTraceId: EnsureTraceIdService = (traceId?: string): string => {
  if (traceId && typeof traceId === 'string' && traceId.trim()) {
    return traceId.trim();
  }
  // L9: crypto.randomUUID replaces Math.random UUID
  return randomUUID();
};

function scheduleBackgroundFlush(): void {
  if (flushTimer) {
    return;
  }
  flushTimer = setInterval(() => {
    void flushObservabilityBuffer().catch((error: unknown) => {
      dropCount += 1;
      console.warn(
        JSON.stringify({
          level: 'warn',
          message: 'observability_background_flush_failed',
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    });
  }, OBSERVABILITY_FLUSH_INTERVAL_MS);
  // unref so the timer never keeps the event loop alive on its own
  if (typeof flushTimer.unref === 'function') {
    flushTimer.unref();
  }
}

/**
 * Schedule a periodic drop-count alert. When drop_count crosses DROP_COUNT_THRESHOLD,
 * an ObservabilityEvent {event_type:'observability_drop_count', metadata:{count}}
 * is emitted via the normal observation buffer path (recordObservabilityEvent) so
 * the overflow stays visible in the observability stream — readiness (TASK-005)
 * also reads isDropCountThresholdExceeded() directly to flag the blocker red.
 *
 * The alert itself re-enters recordObservabilityEvent → pushToBuffer; if the buffer
 * is saturated the alert event is itself dropped (and counted), which is the correct
 * fail-closed behaviour: a broken observability path must not crash the alerter.
 */
function scheduleDropCountAlert(): void {
  if (dropCountAlertTimer) {
    return;
  }
  dropCountAlertTimer = setInterval(() => {
    if (!isDropCountThresholdExceeded()) {
      return;
    }
    const count = getObservabilityDropCount();
    // Fire-and-forget on the normal observation buffer path (L1/L4): the alert is a
    // regular observability event, NOT an antirisk signal, so it must not block.
    void recordObservabilityEvent({
      event_type: 'observability_drop_count',
      trace_id: ensureTraceId(),
      metadata: { count, threshold: DROP_COUNT_THRESHOLD },
    }).catch((error: unknown) => {
      // Last-resort: even the structured-log landing point of recordObservabilityEvent
      // could throw (e.g. JSON.stringify on a thrown proxy). Never unhandledRejection.
      dropCount += 1;
      console.warn(
        JSON.stringify({
          level: 'warn',
          message: 'observability_drop_count_alert_failed',
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    });
  }, DROP_COUNT_ALERT_INTERVAL_MS);
  if (typeof dropCountAlertTimer.unref === 'function') {
    dropCountAlertTimer.unref();
  }
}

/**
 * Flush buffered observability events to the database via createMany.
 * Exported for test synchronization and readiness probes.
 *
 * On flush failure, the entire spliced batch is counted as dropped
 * (dropCount += batch.length), NOT a single +1 — losing a 128-event batch
 * must register as 128 drops so the readiness threshold reflects real loss,
 * not an undercount (ISS-003). The rejection is swallowed here (fail-closed
 * to dropCount) so callers' fire-and-forget .catch never sees a per-event
 * batch failure; they keep their +1 as an overflow-only backstop.
 */
export async function flushObservabilityBuffer(): Promise<void> {
  if (flushInFlight || eventBuffer.length === 0) {
    return;
  }
  flushInFlight = true;
  const batch = eventBuffer.splice(0, OBSERVABILITY_FLUSH_BATCH_SIZE);
  try {
    const prisma = getPrisma();
    await prisma.observabilityEvent.createMany({ data: batch });
  } catch (error: unknown) {
    // Entire batch lost — count every event so drop_count reflects real loss.
    dropCount += batch.length;
    scheduleDropCountAlert();
    console.warn(
      JSON.stringify({
        level: 'warn',
        message: 'observability_flush_failed',
        dropped: batch.length,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  } finally {
    flushInFlight = false;
  }
}

/**
 * Current dropped-event count (buffer overflow or flush failure).
 * Consumed by readiness derivation (antirisk:drop_count_threshold_exceeded blocker).
 */
export function getObservabilityDropCount(): number {
  return dropCount;
}

/**
 * Whether drop_count has crossed the configured threshold (F2). Readiness route
 * (TASK-005) uses this to flag the antirisk:drop_count_threshold_exceeded blocker
 * red — silent event loss on Redis/DB pressure must surface, not stay hidden.
 */
export function isDropCountThresholdExceeded(): boolean {
  return getObservabilityDropCount() >= DROP_COUNT_THRESHOLD;
}

/**
 * Reset drop count and buffer. Test-only helper; readiness probes should read
 * getObservabilityDropCount() instead.
 */
export function __resetObservabilityBufferForTest(): void {
  eventBuffer.length = 0;
  dropCount = 0;
  flushInFlight = false;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (dropCountAlertTimer) {
    clearTimeout(dropCountAlertTimer);
    dropCountAlertTimer = null;
  }
}

function pushToBuffer(event: BufferedObservabilityEvent): void {
  if (eventBuffer.length >= OBSERVABILITY_BUFFER_CAPACITY) {
    dropCount += 1;
    // Overflow arms the drop-count alert scheduler so the threshold breach surfaces
    // as an observability_drop_count event (and, via TASK-005, a readiness blocker).
    scheduleDropCountAlert();
    return;
  }
  eventBuffer.push(event);
  // Trigger an async flush so events persist promptly without blocking the hot path.
  // flushObservabilityBuffer swallows createMany failures internally (dropCount += batch.length,
  // ISS-003); this .catch is a defensive backstop for unexpected sync throws only —
  // normal flush failures are already counted inside flushObservabilityBuffer.
  void flushObservabilityBuffer().catch((error: unknown) => {
    dropCount += 1;
    scheduleDropCountAlert();
    console.warn(
      JSON.stringify({
        level: 'warn',
        message: 'observability_flush_unexpected_error',
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  });
  scheduleBackgroundFlush();
}

/**
 * Record observability event — persists to database
 * Migrated from: app.services.observability.record_observability_event
 *
 * First landing point: structured JSON console.log (level:info) for immediate visibility.
 * Persistence: pushes into an in-memory bounded buffer; a background timer flushes
 * via prisma.observabilityEvent.createMany in batches. Overflow / flush failure
 * increments dropCount (exported via getObservabilityDropCount).
 */
export const recordObservabilityEvent: RecordObservabilityEventService = async (event) => {
  // First landing point: structured log for immediate operator visibility
  console.log(
    JSON.stringify({
      level: 'info',
      message: `observability_event_${event.event_type}`,
      trace_id: event.trace_id,
      comment_id: event.comment_id || null,
      job_id: event.job_id || null,
      status: event.status || null,
      duration_ms: event.duration_ms || null,
      metadata: event.metadata || {},
      timestamp: new Date().toISOString(),
    }),
  );

  pushToBuffer({
    event_type: event.event_type,
    trace_id: event.trace_id,
    comment_id: event.comment_id ?? null,
    job_id: event.job_id ?? null,
    status: event.status ?? null,
    duration_ms: event.duration_ms ?? null,
    event_metadata: JSON.stringify(event.metadata ?? {}),
  });
};

/**
 * Antirisk signal input. error_subclass is the subclass classifier
 * (-352 behavior_anomaly / -429 rate_limit per coding spec). persona_id is the
 * optional persona attribution.
 */
export type RecordAntiriskSignalInput = {
  event_type: string;
  trace_id: string;
  comment_id?: string | null;
  job_id?: number | null;
  status?: string | null;
  duration_ms?: number | null;
  metadata?: Record<string, unknown>;
  error_subclass: string;
  persona_id?: string | null;
};

/**
 * Record antirisk signal — synchronous fail-closed persistence (L3, BG-P1-001).
 *
 * Unlike recordObservabilityEvent (普通观测，内存有界缓冲 fire-and-forget),
 * antirisk signals (-352 behavior_anomaly / -429 rate_limit) MUST be persisted
 * synchronously via await prisma.observabilityEvent.create so they are never
 * dropped (LD-04 > LD-02, user ruling).
 *
 * DB-reject containment (TASK-003 偏差4 / TASK-004 fail-closed 传播链):
 * Callers await this inside publisher.ts catch blocks; an uncontained prisma.create
 * rejection would escape as unhandledRejection. Here the DB failure is caught:
 * console.error logs the structured failure AND dropCount increments (same accounting
 * as normal-buffer overflow), then the function resolves normally. Readiness flagging
 * red on DB-down is handled by the TASK-005 DB gate blocker, NOT by re-rejecting here —
 * re-rejection would just get swallowed by the enclosing catch and hide the failure.
 *
 * First landing point: structured console.log (level:warn) for immediate visibility.
 */
export const recordAntiriskSignal = async (event: RecordAntiriskSignalInput): Promise<void> => {
  // First landing point: structured log for immediate operator visibility
  console.log(
    JSON.stringify({
      level: 'warn',
      message: `antirisk_signal_${event.event_type}`,
      trace_id: event.trace_id,
      comment_id: event.comment_id || null,
      job_id: event.job_id || null,
      status: event.status || null,
      duration_ms: event.duration_ms || null,
      error_subclass: event.error_subclass,
      persona_id: event.persona_id || null,
      metadata: event.metadata || {},
      timestamp: new Date().toISOString(),
    }),
  );

  const prisma = getPrisma();
  try {
    await prisma.observabilityEvent.create({
      data: {
        event_type: event.event_type,
        trace_id: event.trace_id,
        comment_id: event.comment_id ?? null,
        job_id: event.job_id ?? null,
        status: event.status ?? null,
        duration_ms: event.duration_ms ?? null,
        event_metadata: JSON.stringify(event.metadata ?? {}),
        error_subclass: event.error_subclass,
        persona_id: event.persona_id ?? null,
      },
    });
  } catch (error) {
    // Fail-closed containment: DB-down must NOT become an unhandledRejection escaping
    // publisher.ts's catch block. The lost signal is accounted into dropCount (same
    // channel as normal-buffer overflow) so the readiness drop_count blocker (TASK-005)
    // flags red, and the structured error log gives operators an immediate trail.
    dropCount += 1;
    scheduleDropCountAlert();
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'antirisk_signal_persist_failed',
        event_type: event.event_type,
        trace_id: event.trace_id,
        error_subclass: event.error_subclass,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }),
    );
  }
};

/**
 * Build log context for structured logging
 * Migrated from: app.services.observability.build_log_context
 */
export const buildLogContext: BuildLogContextService = (params) => {
  const context: Record<string, unknown> = {
    trace_id: params.trace_id,
  };

  if (params.comment_id !== undefined) {
    context.comment_id = params.comment_id;
  }
  if (params.job_id !== undefined) {
    context.job_id = params.job_id;
  }
  if (params.status !== undefined) {
    context.status = params.status;
  }
  if (params.error_type !== undefined) {
    context.error_type = params.error_type;
  }
  if (params.error_message !== undefined) {
    context.error_message = params.error_message;
  }

  // Add any additional fields
  for (const [key, value] of Object.entries(params)) {
    if (!['trace_id', 'comment_id', 'job_id', 'status', 'error_type', 'error_message'].includes(key)) {
      context[key] = value;
    }
  }

  return JSON.stringify(context);
};
