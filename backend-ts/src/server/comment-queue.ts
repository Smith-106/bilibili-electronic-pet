import type { PrismaClient } from '@prisma/client';

import type { InteractionEvent } from './contracts.js';
import { normalizeInteractionEventToCommentEvent } from '../services/collector.js';

export type CommentQueueRecovery = {
  backlog_id: number;
  status: 'pending_requeue' | 'requeued';
  recoverable: true;
  recovered?: boolean;
};

export function buildCommentEventQueuePayload(input: {
  event: InteractionEvent;
  source: string;
  traceId: string;
}): Record<string, unknown> {
  const legacy = normalizeInteractionEventToCommentEvent(input.event);

  return {
    comment_id: legacy.comment_id,
    video_id: legacy.video_id,
    user_id: legacy.user_id,
    content: legacy.content,
    parent_id: legacy.parent_id,
    platform: input.event.platform,
    source: input.source,
    trace_id: input.traceId,
    interaction: {
      ...input.event,
      ingressSource: input.source,
      traceId: input.traceId,
    },
  };
}

export async function getPendingCommentQueueBacklog(prisma: PrismaClient, canonicalCommentId: string) {
  const backlog = await prisma.commentQueueBacklog.findUnique({
    where: { canonical_comment_id: canonicalCommentId },
  });
  if (!backlog || backlog.status !== 'pending_requeue') {
    return null;
  }
  return backlog;
}

export async function upsertCommentQueueBacklog(
  prisma: PrismaClient,
  input: {
    canonicalCommentId: string;
    commentId: string;
    platform: string;
    source: string;
    payload: Record<string, unknown>;
    error?: string;
  },
): Promise<CommentQueueRecovery> {
  const now = new Date();
  const backlog = await prisma.commentQueueBacklog.upsert({
    where: { canonical_comment_id: input.canonicalCommentId },
    update: {
      platform: input.platform,
      comment_id: input.commentId,
      source: input.source,
      payload_json: JSON.stringify(input.payload),
      status: 'pending_requeue',
      last_error: input.error ?? 'queue_unavailable',
      queue_attempts: { increment: 1 },
      last_attempt_at: now,
      updated_at: now,
    },
    create: {
      platform: input.platform,
      canonical_comment_id: input.canonicalCommentId,
      comment_id: input.commentId,
      source: input.source,
      payload_json: JSON.stringify(input.payload),
      status: 'pending_requeue',
      last_error: input.error ?? 'queue_unavailable',
      queue_attempts: 1,
      last_attempt_at: now,
      updated_at: now,
    },
  });

  return {
    backlog_id: backlog.id,
    status: 'pending_requeue',
    recoverable: true,
  };
}

export async function resolveCommentQueueBacklog(
  prisma: PrismaClient,
  input: {
    canonicalCommentId: string;
    payload: Record<string, unknown>;
    source: string;
  },
): Promise<CommentQueueRecovery | null> {
  const existing = await getPendingCommentQueueBacklog(prisma, input.canonicalCommentId);
  if (!existing) {
    return null;
  }

  const now = new Date();
  const backlog = await prisma.commentQueueBacklog.update({
    where: { canonical_comment_id: input.canonicalCommentId },
    data: {
      source: input.source,
      payload_json: JSON.stringify(input.payload),
      status: 'requeued',
      last_error: null,
      queue_attempts: { increment: 1 },
      last_attempt_at: now,
      recovered_at: now,
      updated_at: now,
    },
  });

  return {
    backlog_id: backlog.id,
    status: 'requeued',
    recoverable: true,
    recovered: true,
  };
}
