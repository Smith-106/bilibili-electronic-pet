import type { PrismaClient } from '@prisma/client';

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
  } catch {
    // Audit log write failure is non-critical
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
