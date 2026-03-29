/**
 * Observability services for tracing and event recording
 * Migrated from Python: app/services/observability.py
 */

import type {
  EnsureTraceIdService,
  RecordObservabilityEventService,
  BuildLogContextService,
} from './interfaces.js';
import { prisma as getPrisma } from './db-queries.js';

/**
 * Generate or ensure trace ID
 * Migrated from: app.services.observability.ensure_trace_id
 */
export const ensureTraceId: EnsureTraceIdService = (traceId?: string): string => {
  if (traceId && typeof traceId === 'string' && traceId.trim()) {
    return traceId.trim();
  }
  // Generate UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Record observability event — persists to database
 * Migrated from: app.services.observability.record_observability_event
 */
export const recordObservabilityEvent: RecordObservabilityEventService = async (event) => {
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
    })
  );

  try {
    const prisma = getPrisma();
    await prisma.observabilityEvent.create({
      data: {
        event_type: event.event_type,
        trace_id: event.trace_id,
        comment_id: event.comment_id ?? null,
        job_id: event.job_id ?? null,
        status: event.status ?? null,
        duration_ms: event.duration_ms ?? null,
        event_metadata: JSON.stringify(event.metadata ?? {}),
      },
    });
  } catch (dbError) {
    console.error('[observability] Failed to persist event:', dbError);
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
    if (
      !['trace_id', 'comment_id', 'job_id', 'status', 'error_type', 'error_message'].includes(key)
    ) {
      context[key] = value;
    }
  }

  return JSON.stringify(context);
};
