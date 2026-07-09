import type { PrismaClient } from '@prisma/client';

import type { CollectorSource } from '../services/collector.js';
import {
  normalizeCommentEventToInteractionEvent,
  normalizeInteractionEventToCommentEvent,
} from '../services/collector.js';
import { getActivePersonaName } from '../services/bilibili-runtime-config.js';
import { TRIGGER_KEYWORDS } from '../services/decider.js';
import { recordObservabilityEvent } from '../services/observability.js';
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

/**
 * Feature flag for the C-layer passive-response gate (L8 isolation).
 * Default ON — only @self / triggerKeyword-hit comments are enqueued for reply.
 * Set PASSIVE_RESPONSE_GATE_ENABLED=false to fall back to enqueuing all comments
 * (independent rollback that leaves poller ingestion / DB storage untouched).
 */
function isPassiveResponseGateEnabled(): boolean {
  return process.env.PASSIVE_RESPONSE_GATE_ENABLED !== 'false';
}

/**
 * C-layer passive-response gate (TASK-003, L9 legal red-line enforcement).
 *
 * LEGAL RED-LINE: the bot MUST only reply when passively invoked — either an
 * explicit @<personaName> mention (the bot itself) OR a triggerKeyword hit.
 * Active solicitation (replying to comments that did not invoke the bot) is
 * forbidden — it is the arch red-line "全评论入队 = 主动骚扰" violation. This
 * gate is the enforcement point: non-eligible comments are NOT enqueued for
 * reply but ARE still persisted to DB by poller.ts:242 / comment.create above
 * (audit trail preserved).
 *
 * F3 @regex (mentionRegex below): global match tolerant of B站 @格式:
 * @用户名 with Chinese + English + underscore + surrounding whitespace.
 * Extracts the token after @ and compares it to personaName (case-insensitive,
 * whitespace-trimmed) to detect @self. triggerKeywords are reused from
 * decider DEFAULT_RULES (single source of truth, not redefined here).
 *
 * Returns {eligible, reason} so the caller can emit a structured observability
 * counter (passive_response_gate passed/rejected) for online eval.
 */
export function isPassiveResponseEligible(
  content: string,
  personaName: string | null,
): { eligible: boolean; reason: string } {
  const text = content ?? '';

  // 1. @self detection — only when a persona name is configured.
  if (personaName) {
    const mentionRegex = /@\s*[一-龥\w]+\s*/g;
    const normalizedName = personaName.trim().toLowerCase();
    let match: RegExpExecArray | null;
    while ((match = mentionRegex.exec(text)) !== null) {
      // Strip the leading @ and surrounding whitespace to recover the token.
      const token = match[0].replace(/^@\s*/, '').trim().toLowerCase();
      if (token && token === normalizedName) {
        return { eligible: true, reason: '@self' };
      }
    }
  }

  // 2. triggerKeyword hit — reuse decider DEFAULT_RULES.triggerKeywords.
  const lowered = text.toLowerCase();
  for (const keyword of TRIGGER_KEYWORDS) {
    if (keyword && lowered.includes(keyword.toLowerCase())) {
      return { eligible: true, reason: 'trigger_keyword' };
    }
  }

  return { eligible: false, reason: 'no_trigger' };
}

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

  // TASK-002: read the active persona name (BilibiliCredential.name) and attach it to the
  // queue payload so the C-layer @self detection gate (TASK-003) can match incoming
  // mentions against the bot's own persona. Read here (before the duplicate/queue split)
  // so both the enqueue path AND the duplicate_ignored path carry the persona name — the
  // non-enqueued path stays auditable via the structured payload. getActivePersonaName is
  // fail-safe (null on error), so a persona lookup failure never breaks ingest.
  const personaId = await getActivePersonaName();
  if (personaId) {
    queuePayload.persona_id = personaId;
  }

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

  // TASK-003 / L9: C-layer passive-response gate. Before enqueuing the freshly
  // stored comment for reply, check whether it passively invoked the bot —
  // either @<personaName> (@self) OR a triggerKeyword hit. Non-eligible comments
  // are NOT enqueued (no reply generated) but ARE already persisted to DB above
  // (prisma.comment.create) so the audit trail stays complete. This is the legal
  // red-line enforcement point — active harassment (replying without invocation)
  // is forbidden. Flag-gated (L8): PASSIVE_RESPONSE_GATE_ENABLED=false falls back
  // to enqueuing all comments for independent rollback. The persona read at :88
  // is reused here (no second DB call). The recovery path above (:122) is NOT
  // gated — it requeues a previously-gated eligible comment from the backlog.
  if (isPassiveResponseGateEnabled()) {
    const { eligible, reason } = isPassiveResponseEligible(commentEvent.content ?? '', personaId);
    // Fire-and-forget observability counter (normal observation event, not an
    // antirisk signal) so online eval can track gate pass/reject rates.
    void recordObservabilityEvent({
      event_type: 'passive_response_gate',
      trace_id: traceId,
      comment_id: commentEvent.comment_id,
      status: eligible ? 'passed' : 'rejected',
      metadata: { reason },
    }).catch((error: unknown) => {
      console.warn(
        JSON.stringify({
          level: 'warn',
          message: 'passive_response_gate_counter_failed',
          trace_id: traceId,
          comment_id: commentEvent.comment_id,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    });
    if (!eligible) {
      return {
        ok: true,
        queued: false,
        message: 'not_passive_eligible',
        comment_id: commentEvent.comment_id,
        trace_id: traceId,
      };
    }
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
