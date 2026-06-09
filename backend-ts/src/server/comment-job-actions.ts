import type { PrismaClient } from '@prisma/client';

import { upsertCompanionFeedItem } from '../app/memory/companion-feed.js';
import { buildCommentReplyPublishIntent } from '../domain/publish/comment-reply-intent.js';

type AuditLogInput = {
  action: string;
  targetId: number | null;
  ok: boolean;
  traceId: string;
  commentId?: string;
  status?: string;
  payload?: Record<string, unknown>;
};

type RetryJobInput = {
  jobId: number;
  forceLong?: boolean;
  styleProfile?: string;
  roleProfile?: string;
  roleCardKey?: string;
};

type ApproveJobInput = {
  jobId: number;
  overrideReplyText?: string;
  styleProfile?: string;
  roleProfile?: string;
  roleCardKey?: string;
};

type RetryJobResult = { ok: boolean; requeued: boolean; job_id: number; trace_id: string; error?: string };

type ApproveJobResult = {
  ok: boolean;
  job_id: number;
  status: string;
  published_at: string | null;
  trace_id: string;
};

type ApproveBatchResult = {
  ok: boolean;
  summary: { total: number; success: number; failed: number };
  results: Array<{ job_id: number; ok: boolean; status?: string; error?: string }>;
  trace_id: string;
};

type RetryBatchResult = {
  ok: boolean;
  summary: { total: number; success: number; failed: number };
  results: Array<{ job_id: number; ok: boolean; requeued?: boolean; error?: string }>;
  trace_id: string;
};

type QueueResult = { queued: boolean; error?: string };

type CommentJobActionDeps = {
  getPrisma: () => PrismaClient;
  createTraceId: (preferred?: string) => string;
  writeAuditLog: (prisma: PrismaClient, input: AuditLogInput) => Promise<void>;
  enqueueCommentEventJob: (payload: Record<string, unknown>) => Promise<QueueResult>;
};

async function retryJob(
  deps: CommentJobActionDeps,
  input: RetryJobInput,
): Promise<RetryJobResult> {
  const traceId = deps.createTraceId();
  const prisma = deps.getPrisma();
  const job = await prisma.replyJob.findUnique({ where: { id: input.jobId } });
  if (!job) {
    await deps.writeAuditLog(prisma, {
      action: 'retry_single',
      targetId: input.jobId,
      ok: false,
      traceId,
      status: 'job_not_found',
      payload: { error: 'job_not_found' },
    });
    throw { statusCode: 404, detail: 'job_not_found' };
  }

  const platform = (job.canonical_comment_id || 'bilibili:').split(':', 1)[0] || 'bilibili';

  const queueResult = await deps.enqueueCommentEventJob({
    comment_id: job.comment_id,
    platform,
    force_long: input.forceLong,
    style_profile: input.styleProfile,
    role_profile: input.roleProfile,
    role_card_key: input.roleCardKey,
    trace_id: traceId,
    source: 'retry',
  });

  await deps.writeAuditLog(prisma, {
    action: 'retry_single',
    targetId: input.jobId,
    ok: queueResult.queued,
    traceId,
    commentId: job.comment_id,
    status: queueResult.queued ? 'queued' : 'queue_unavailable',
    payload: { comment_id: job.comment_id, force_long: input.forceLong, queue_error: queueResult.error ?? null },
  });
  return {
    ok: queueResult.queued,
    requeued: queueResult.queued,
    job_id: input.jobId,
    trace_id: traceId,
    error: queueResult.queued ? undefined : 'queue_unavailable',
  };
}

async function approveJob(
  deps: CommentJobActionDeps,
  input: ApproveJobInput,
): Promise<ApproveJobResult> {
  const traceId = deps.createTraceId();
  const prisma = deps.getPrisma();

  const job = await prisma.replyJob.findUnique({ where: { id: input.jobId } });
  if (!job) {
    await deps.writeAuditLog(prisma, {
      action: 'approve_single',
      targetId: input.jobId,
      ok: false,
      traceId,
      status: 'job_not_found',
      payload: { error: 'job_not_found' },
    });
    throw { statusCode: 404, detail: 'job_not_found' };
  }

  const approvableStatuses = ['manual_queue', 'blocked', 'dedupe_skipped'];
  if (!approvableStatuses.includes(job.status)) {
    await deps.writeAuditLog(prisma, {
      action: 'approve_single',
      targetId: input.jobId,
      ok: false,
      traceId,
      commentId: job.comment_id,
      status: 'not_approvable',
      payload: { error: 'job_status_not_approvable', current_status: job.status },
    });
    throw { statusCode: 400, detail: 'job_status_not_approvable' };
  }

  const commentKey = job.canonical_comment_id || `bilibili:${job.comment_id}`;
  const comment = await prisma.comment.findUnique({ where: { canonical_comment_id: commentKey } });
  if (!comment) {
    throw { statusCode: 404, detail: 'comment_not_found' };
  }

  const replyText = (input.overrideReplyText || job.reply_text || '').trim();
  if (!replyText) {
    throw { statusCode: 400, detail: 'empty_reply_text' };
  }

  const { publishIntentWithResult } = await import('../services/publisher.js');
  const [published, publishReason, publishedAt, publishResult] = await publishIntentWithResult(
    buildCommentReplyPublishIntent({
      platform: comment.platform || 'bilibili',
      commentId: job.comment_id,
      replyText,
      traceId,
      source: 'approve-job',
      route: {
        containerId: comment.video_id || undefined,
        parentExternalId: comment.parent_id || undefined,
        metadata:
          (comment.platform || 'bilibili') === 'qq'
            ? {
                chat_type: comment.video_id ? 'group' : 'private',
                ...(comment.user_id ? { user_id: comment.user_id } : {}),
              }
            : undefined,
      },
    }),
  );

  if (!published) {
    await deps.writeAuditLog(prisma, {
      action: 'approve_single',
      targetId: input.jobId,
      ok: false,
      traceId,
      commentId: job.comment_id,
      status: 'publish_failed',
      payload: { error: 'approve_publish_failed', publish_reason: publishReason },
    });
    throw { statusCode: 500, detail: 'approve_publish_failed' };
  }

  const newRiskFlags = typeof job.risk_flags === 'string' ? JSON.parse(job.risk_flags) : job.risk_flags || {};
  const updatedJob = await prisma.replyJob.update({
    where: { id: input.jobId },
    data: {
      status: 'published',
      reply_text: replyText,
      risk_flags: JSON.stringify({
        ...newRiskFlags,
        approved: true,
        publish_reason: publishReason,
        ...(publishResult?.new_rpid ? { new_rpid: publishResult.new_rpid } : {}),
      }),
      published_at: publishedAt || new Date(),
      attempts: (job.attempts || 0) + 1,
    },
  });

  try {
    if (comment.user_id) {
      const { prisma: prismaFromDb } = await import('../services/db-queries.js');
      const p = prismaFromDb();
      const existingState = await p.userState.findUnique({ where: { user_id: comment.user_id } });
      const recentPhrases = existingState
        ? typeof existingState.recent_phrases === 'string'
          ? JSON.parse(existingState.recent_phrases)
          : existingState.recent_phrases
        : { phrases: [] };
      const phrases = Array.isArray(recentPhrases.phrases) ? recentPhrases.phrases : [];
      phrases.push(replyText.substring(0, 60));
      if (phrases.length > 20) phrases.shift();
      await p.userState.upsert({
        where: { user_id: comment.user_id },
        update: { recent_phrases: JSON.stringify({ phrases }) },
        create: { user_id: comment.user_id, recent_phrases: JSON.stringify({ phrases: [replyText.substring(0, 60)] }) },
      });
    }
  } catch {
    /* non-critical */
  }

  await deps.writeAuditLog(prisma, {
    action: 'approve_single',
    targetId: input.jobId,
    ok: true,
    traceId,
    commentId: job.comment_id,
    status: 'published',
    payload: { reply_text_preview: replyText.substring(0, 40) },
  });

  try {
    await upsertCompanionFeedItem({
      itemKey: 'signal:approval-latest',
      content: `Approved and published queued reply for comment ${job.comment_id}.`,
      source: 'admin_approval',
      metadata: {
        trace_id: traceId,
        job_id: input.jobId,
        comment_id: job.comment_id,
        publish_reason: publishReason,
      },
    });
  } catch {
    /* non-critical */
  }

  return {
    ok: true,
    job_id: input.jobId,
    status: 'published',
    published_at: updatedJob.published_at?.toISOString() ?? null,
    trace_id: traceId,
  };
}

async function approveJobsBatch(
  deps: CommentJobActionDeps,
  input: { jobIds: number[] },
): Promise<ApproveBatchResult> {
  const traceId = deps.createTraceId();
  const results: Array<{ job_id: number; ok: boolean; status?: string; error?: string }> = [];
  let success = 0;
  let failed = 0;

  for (const jobId of input.jobIds) {
    try {
      const result = await approveJob(deps, { jobId, overrideReplyText: undefined });
      success++;
      results.push({ job_id: jobId, ok: true, status: result.status });
    } catch (err: unknown) {
      failed++;
      const detail = err instanceof Error ? err.message : (err as { detail?: string })?.detail || 'approve_failed';
      results.push({ job_id: jobId, ok: false, error: detail });
    }
  }

  const summary = { total: input.jobIds.length, success, failed };

  const prisma = deps.getPrisma();
  await deps.writeAuditLog(prisma, {
    action: 'approve_batch',
    targetId: null,
    ok: failed === 0,
    traceId,
    status: failed === 0 ? 'published' : 'partial_failure',
    payload: { job_ids: input.jobIds, summary },
  });

  return { ok: true, summary, results, trace_id: traceId };
}

async function retryJobsBatch(
  deps: CommentJobActionDeps,
  input: { jobIds: number[]; forceLong?: boolean },
): Promise<RetryBatchResult> {
  const traceId = deps.createTraceId();
  const results: Array<{ job_id: number; ok: boolean; requeued?: boolean; error?: string }> = [];
  let success = 0;
  let failed = 0;

  for (const jobId of input.jobIds) {
    try {
      const result = await retryJob(deps, { jobId, forceLong: input.forceLong });
      if (result.requeued) {
        success++;
        results.push({ job_id: jobId, ok: true, requeued: true });
      } else {
        failed++;
        results.push({ job_id: jobId, ok: false, requeued: false, error: result.error });
      }
    } catch (error) {
      failed++;
      const detail = typeof error === 'object' && error !== null && 'detail' in error ? String(error.detail) : 'retry_failed';
      results.push({ job_id: jobId, ok: false, error: detail });
    }
  }

  const summary = { total: input.jobIds.length, success, failed };

  const prisma = deps.getPrisma();
  await deps.writeAuditLog(prisma, {
    action: 'retry_batch',
    targetId: null,
    ok: failed === 0,
    traceId,
    status: failed === 0 ? 'queued' : 'partial_failure',
    payload: { job_ids: input.jobIds, force_long: input.forceLong, summary },
  });

  return { ok: failed === 0, summary, results, trace_id: traceId };
}

export function createCommentJobActionHelpers(deps: CommentJobActionDeps) {
  return {
    retryJob: (input: RetryJobInput) => retryJob(deps, input),
    approveJob: (input: ApproveJobInput) => approveJob(deps, input),
    approveJobsBatch: (input: { jobIds: number[] }) => approveJobsBatch(deps, input),
    retryJobsBatch: (input: { jobIds: number[]; forceLong?: boolean }) => retryJobsBatch(deps, input),
  };
}
