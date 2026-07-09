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
 * F1 (Free): tunable; 4096 is the Phase 1 placeholder.
 * Overflow drops incoming events and increments dropCount.
 */
export const OBSERVABILITY_BUFFER_CAPACITY = 4096;

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
 * Flush buffered observability events to the database via createMany.
 * Exported for test synchronization and readiness probes.
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
}

function pushToBuffer(event: BufferedObservabilityEvent): void {
  if (eventBuffer.length >= OBSERVABILITY_BUFFER_CAPACITY) {
    dropCount += 1;
    return;
  }
  eventBuffer.push(event);
  // Trigger an async flush so events persist promptly without blocking the hot path.
  // .catch increments dropCount to avoid unhandledRejection (Fix, Don't Hide: root cause
  // is surfaced via dropCount/readiness, not silenced).
  void flushObservabilityBuffer().catch((error: unknown) => {
    dropCount += 1;
    console.warn(
      JSON.stringify({
        level: 'warn',
        message: 'observability_flush_failed',
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
