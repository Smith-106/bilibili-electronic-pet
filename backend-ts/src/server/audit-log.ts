import type { PrismaClient } from '@prisma/client';

import { ensureTraceId, recordObservabilityEvent } from '../services/observability.js';

/** Write an operation audit log entry (mirrors Python's _write_audit_log) */
export async function writeAuditLog(
  prisma: PrismaClient,
  input: {
    action: string;
    targetId: number | null;
    ok: boolean;
    traceId: string;
    commentId?: string;
    status?: string;
    payload?: Record<string, unknown>;
  },
): Promise<void> {
  const enrichedPayload = {
    ...input.payload,
    trace_id: input.traceId,
    ...(input.commentId ? { comment_id: input.commentId } : {}),
    ...(input.status ? { status: input.status } : {}),
  };
  try {
    await prisma.operationAuditLog.create({
      data: {
        action: input.action,
        target_type: 'reply_job',
        target_id: input.targetId,
        ok: input.ok,
        payload: JSON.stringify(enrichedPayload),
      },
    });
  } catch (error) {
    // Audit log write failure is non-critical (不阻断业务流), but MUST 可观测 — 对照
    // publisher.ts:1022 publish_log 写失败 catch 已配 recordObservabilityEvent, audit-log
    // 写失败原裸吞致审计系统失声 (observability F5). console.warn 镜像 + fire-and-forget event.
    console.warn(
      JSON.stringify({
        level: 'warn',
        message: 'audit_log_write_failed',
        action: input.action,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }),
    );
    void recordObservabilityEvent({
      event_type: 'audit_log_write_failed',
      trace_id: ensureTraceId(input.traceId),
      comment_id: input.commentId,
      status: 'failed',
      metadata: {
        action: input.action,
        error: error instanceof Error ? error.message : String(error),
      },
    }).catch((err: unknown) => {
      console.warn(
        JSON.stringify({
          level: 'warn',
          message: 'audit_log_write_failed_event_record_failed',
          action: input.action,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    });
  }
}

/** CSV-safe string escaping */
export function csvEscape(value: string): string {
  if (!value) return '';
  if (/[,"\n\r]/.test(value)) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export function getAuditLogDetail(payload: Record<string, unknown>): string | null {
  const candidateKeys = ['detail', 'error', 'reason', 'publish_reason', 'reply_text_preview', 'message'];
  for (const key of candidateKeys) {
    const value = String(payload[key] ?? '').trim();
    if (value) {
      return value;
    }
  }
  const status = String(payload.status ?? '').trim();
  return status || null;
}
