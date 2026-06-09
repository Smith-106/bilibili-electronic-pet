import type { PrismaClient } from '@prisma/client';

import type { CollectorSource } from '../services/collector.js';
import {
  normalizeCommentEventToInteractionEvent,
  normalizeInteractionEventToCommentEvent,
} from '../services/collector.js';
import {
  buildCommentEventQueuePayload,
  getPendingCommentQueueBacklog,
  resolveCommentQueueBacklog,
  type CommentQueueRecovery,
  upsertCommentQueueBacklog,
} from './comment-queue.js';
import type { CommentEvent, InteractionEvent } from './contracts.js';

export type CommentIngestResult = {
  ok: boolean;
  comment_id: string;
  trace_id: string;
  queued?: boolean;
  message?: string;
  recovery?: CommentQueueRecovery;
};

export type CommentQueueJobResult = { queued: boolean; error?: string };

type AuditLogInput = {
  action: string;
  targetId: number | null;
  ok: boolean;
  traceId: string;
  commentId?: string;
  status?: string;
  payload?: Record<string, unknown>;
};

type CommentIngestDeps = {
  getPrisma: () => PrismaClient;
  createTraceId: (preferred?: string) => string;
  parseJsonRecord: (value: unknown) => Record<string, unknown>;
  writeAuditLog: (prisma: PrismaClient, input: AuditLogInput) => Promise<void>;
};

async function enqueueCommentEventJob(payload: Record<string, unknown>): Promise<CommentQueueJobResult> {
  try {
    const { createCommentEventQueue } = await import('../workers/tasks/comment-event.task.js');
    const { tryEnqueueTask } = await import('../workers/task-queue.js');
    const queue = createCommentEventQueue('comment-event');
    try {
      const jobId = `comment-event:${String(payload.platform ?? 'bilibili')}:${String(payload.comment_id ?? '')}`;
      return await tryEnqueueTask(queue, payload as never, jobId, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });
    } finally {
      await queue.close().catch(() => undefined);
    }
  } catch (error) {
    return {
      queued: false,
      error: error instanceof Error ? error.message : 'queue_unavailable',
    };
  }
}

async function ingestInteractionEvent(
  deps: CommentIngestDeps,
  input: { event: InteractionEvent; source: string },
): Promise<CommentIngestResult> {
  const commentEvent = normalizeInteractionEventToCommentEvent(input.event);
  const traceId = deps.createTraceId(input.event.traceId);
  const platform = input.event.platform || 'unknown';
  const canonicalCommentId = input.event.reference.canonicalId;
  const queuePayload = buildCommentEventQueuePayload({
    event: input.event,
    source: input.source,
    traceId,
  });

  const prisma = deps.getPrisma();
  try {
    await prisma.comment.create({
      data: {
        platform,
        canonical_comment_id: canonicalCommentId,
        comment_id: commentEvent.comment_id,
        video_id: commentEvent.video_id || '',
        user_id: commentEvent.user_id || '',
        content: commentEvent.content || '',
        parent_id: commentEvent.parent_id || null,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('UNIQUE') || msg.includes('unique') || msg.includes('duplicate')) {
      const pendingBacklog = await getPendingCommentQueueBacklog(prisma, canonicalCommentId);
      if (!pendingBacklog) {
        return { ok: true, message: 'duplicate_ignored', comment_id: commentEvent.comment_id, trace_id: traceId };
      }

      const backlogPayload = deps.parseJsonRecord(pendingBacklog.payload_json);
      const recoveredPayload = {
        ...backlogPayload,
        ...queuePayload,
        platform,
        source: input.source,
        trace_id: traceId,
      };
      const queueResult = await enqueueCommentEventJob(recoveredPayload);

      if (!queueResult.queued) {
        const recovery = await upsertCommentQueueBacklog(prisma, {
          canonicalCommentId,
          commentId: commentEvent.comment_id,
          platform,
          source: input.source,
          payload: recoveredPayload,
          error: queueResult.error,
        });
        await deps.writeAuditLog(prisma, {
          action: 'comment_ingest_recovery',
          targetId: null,
          ok: false,
          traceId,
          commentId: commentEvent.comment_id,
          status: 'pending_requeue',
          payload: {
            backlog_id: recovery.backlog_id,
            queue_error: queueResult.error ?? 'queue_unavailable',
            platform,
          },
        });
        return {
          ok: false,
          queued: false,
          message: 'queue_unavailable',
          comment_id: commentEvent.comment_id,
          trace_id: traceId,
          recovery,
        };
      }

      const recovery = await resolveCommentQueueBacklog(prisma, {
        canonicalCommentId,
        payload: recoveredPayload,
        source: input.source,
      });
      await deps.writeAuditLog(prisma, {
        action: 'comment_ingest_recovery',
        targetId: null,
        ok: true,
        traceId,
        commentId: commentEvent.comment_id,
        status: 'requeued',
        payload: {
          backlog_id: recovery?.backlog_id ?? pendingBacklog.id,
          platform,
        },
      });
      return {
        ok: true,
        queued: true,
        message: 'requeued_from_backlog',
        comment_id: commentEvent.comment_id,
        trace_id: traceId,
        ...(recovery ? { recovery } : {}),
      };
    }
    throw err;
  }

  const queueResult = await enqueueCommentEventJob(queuePayload);

  if (!queueResult.queued) {
    const recovery = await upsertCommentQueueBacklog(prisma, {
      canonicalCommentId,
      commentId: commentEvent.comment_id,
      platform,
      source: input.source,
      payload: queuePayload,
      error: queueResult.error,
    });
    console.warn(
      JSON.stringify({
        level: 'warn',
        message: 'comment_event_queue_unavailable',
        trace_id: traceId,
        comment_id: commentEvent.comment_id,
        error: queueResult.error,
        backlog_id: recovery.backlog_id,
      }),
    );
    await deps.writeAuditLog(prisma, {
      action: 'comment_ingest',
      targetId: null,
      ok: false,
      traceId,
      commentId: commentEvent.comment_id,
      status: 'pending_requeue',
      payload: {
        backlog_id: recovery.backlog_id,
        queue_error: queueResult.error ?? 'queue_unavailable',
        platform,
      },
    });
    return {
      ok: false,
      queued: false,
      message: 'queue_unavailable',
      comment_id: commentEvent.comment_id,
      trace_id: traceId,
      recovery,
    };
  }

  const recovery = await resolveCommentQueueBacklog(prisma, {
    canonicalCommentId,
    payload: queuePayload,
    source: input.source,
  });

  return {
    ok: true,
    queued: true,
    message: 'queued',
    comment_id: commentEvent.comment_id,
    trace_id: traceId,
    ...(recovery ? { recovery } : {}),
  };
}

export function createCommentIngestHelpers(deps: CommentIngestDeps) {
  return {
    enqueueCommentEventJob,
    ingestInteractionEvent: (input: { event: InteractionEvent; source: string }) => ingestInteractionEvent(deps, input),
    ingestCommentEvent: (input: { event: CommentEvent; source: string }) =>
      ingestInteractionEvent(deps, {
        event: normalizeCommentEventToInteractionEvent({
          ...input.event,
          source: input.source as CollectorSource,
        }),
        source: input.source,
      }),
  };
}
