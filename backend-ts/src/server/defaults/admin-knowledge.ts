import { getPrisma } from '../../lib/prisma.js';
import type {
  AdminAuditSummaryResponse,
  AdminGatewayLogsResponse,
  AdminJobsResponse,
  KnowledgeEntry,
} from '../contracts.js';
import {
  buildAdminJobStatusWhere,
  extractRiskFlagLabels,
  getGroupCount,
  normalizeAdminJobStatus,
  normalizeNullableIsoTimestamp,
  parseJsonRecord,
  REVIEWABLE_JOB_STATUSES,
} from '../normalizers.js';

export async function defaultAdminOverview(): Promise<Record<string, unknown>> {
  const prisma = getPrisma();
  const [totalComments, totalJobs, byStatusRows] = await Promise.all([
    prisma.comment.count(),
    prisma.replyJob.count(),
    prisma.replyJob.groupBy({
      by: ['status'],
      _count: {
        _all: true,
      },
    }),
  ]);

  const byStatus: Record<string, number> = {};
  for (const row of byStatusRows) {
    byStatus[row.status] = getGroupCount(row._count);
  }

  const totalPublished = byStatus.published ?? 0;
  const pendingReview = REVIEWABLE_JOB_STATUSES.reduce((sum, status) => sum + (byStatus[status] ?? 0), 0);
  const totalFailed = byStatus.failed ?? 0;

  return {
    generated_at: new Date().toISOString(),
    totals: {
      comments: totalComments,
      jobs: totalJobs,
      published: totalPublished,
      pending_review: pendingReview,
      failed: totalFailed,
    },
    by_status: byStatus,
    total_comments: totalComments,
    total_jobs: totalJobs,
    total_published: totalPublished,
    pending_review: pendingReview,
    total_failed: totalFailed,
  };
}

export async function defaultAdminJobs(input: {
  status?: string;
  limit: number;
  offset: number;
}): Promise<AdminJobsResponse> {
  const prisma = getPrisma();
  const where = buildAdminJobStatusWhere(input.status);
  const [total, items] = await Promise.all([
    prisma.replyJob.count({ where }),
    prisma.replyJob.findMany({
      where,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      skip: input.offset,
      take: input.limit,
    }),
  ]);

  const commentIds = [
    ...new Set(items.map((item) => item.comment_id).filter((value): value is string => Boolean(value))),
  ];
  const canonicalCommentIds = [
    ...new Set(items.map((item) => item.canonical_comment_id).filter((value): value is string => Boolean(value))),
  ];
  const comments =
    commentIds.length === 0 && canonicalCommentIds.length === 0
      ? []
      : await prisma.comment.findMany({
          where: {
            OR: [
              ...(commentIds.length > 0 ? [{ comment_id: { in: commentIds } }] : []),
              ...(canonicalCommentIds.length > 0 ? [{ canonical_comment_id: { in: canonicalCommentIds } }] : []),
            ],
          },
        });

  const commentByCanonicalId = new Map(comments.map((item) => [item.canonical_comment_id, item]));
  const commentByCommentId = new Map(comments.map((item) => [item.comment_id, item]));

  return {
    items: items.map((item) => {
      const comment =
        (item.canonical_comment_id && commentByCanonicalId.get(item.canonical_comment_id)) ||
        commentByCommentId.get(item.comment_id);
      return {
        id: String(item.id),
        comment_id: item.comment_id,
        canonical_comment_id: item.canonical_comment_id,
        status: normalizeAdminJobStatus(item.status),
        raw_status: item.status,
        reply_text: item.reply_text,
        risk_flags: extractRiskFlagLabels(item.risk_flags),
        published_at: normalizeNullableIsoTimestamp(item.published_at),
        created_at: normalizeNullableIsoTimestamp(item.created_at),
        comment_text: comment?.content ?? null,
        comment_content: comment?.content ?? null,
      };
    }),
    total,
    limit: input.limit,
    offset: input.offset,
  };
}

export async function defaultAdminGatewayLogs(input: {
  commentId?: string;
  limit: number;
}): Promise<AdminGatewayLogsResponse> {
  const prisma = getPrisma();
  const where: Record<string, unknown> = {};
  if (input.commentId) {
    where.comment_id = input.commentId;
  }

  const items = await prisma.publishLog.findMany({
    where,
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    take: input.limit,
  });
  const commentIds = [
    ...new Set(items.map((item) => item.comment_id).filter((value): value is string => Boolean(value))),
  ];
  const canonicalCommentIds = [
    ...new Set(items.map((item) => item.canonical_comment_id).filter((value): value is string => Boolean(value))),
  ];
  const jobs =
    commentIds.length === 0 && canonicalCommentIds.length === 0
      ? []
      : await prisma.replyJob.findMany({
          where: {
            OR: [
              ...(commentIds.length > 0 ? [{ comment_id: { in: commentIds } }] : []),
              ...(canonicalCommentIds.length > 0 ? [{ canonical_comment_id: { in: canonicalCommentIds } }] : []),
            ],
          },
          orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        });
  const jobByCanonicalId = new Map<string, (typeof jobs)[number]>();
  const jobByCommentId = new Map<string, (typeof jobs)[number]>();
  for (const job of jobs) {
    if (job.canonical_comment_id && !jobByCanonicalId.has(job.canonical_comment_id)) {
      jobByCanonicalId.set(job.canonical_comment_id, job);
    }
    if (job.comment_id && !jobByCommentId.has(job.comment_id)) {
      jobByCommentId.set(job.comment_id, job);
    }
  }

  return {
    items: items.map((item) => ({
      ...((item.canonical_comment_id && jobByCanonicalId.get(item.canonical_comment_id)) ||
      jobByCommentId.get(item.comment_id)
        ? {
            reply_text:
              (
                (item.canonical_comment_id && jobByCanonicalId.get(item.canonical_comment_id)) ||
                jobByCommentId.get(item.comment_id)
              )?.reply_text ?? null,
          }
        : {
            reply_text: null,
          }),
      id: item.id,
      platform: item.platform,
      canonical_comment_id: item.canonical_comment_id,
      comment_id: item.comment_id,
      reply_hash: item.reply_hash,
      source: item.source,
      status: item.status,
      published_at: normalizeNullableIsoTimestamp(item.published_at),
      failure_reason: item.failure_reason,
      created_at: normalizeNullableIsoTimestamp(item.created_at),
    })),
  };
}

export async function defaultAdminAuditSummary(input: {
  days: number;
  action?: string;
  ok?: boolean;
}): Promise<AdminAuditSummaryResponse> {
  const prisma = getPrisma();
  const startUtc = new Date(Date.now() - input.days * 24 * 3600 * 1000);
  const where: Record<string, unknown> = { created_at: { gte: startUtc } };
  if (input.action) {
    where.action = input.action;
  }
  if (input.ok !== undefined) {
    where.ok = input.ok;
  }

  const items = await prisma.operationAuditLog.findMany({ where });
  const byAction: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const byResult = { ok: 0, failed: 0 };

  for (const item of items) {
    byAction[item.action] = (byAction[item.action] ?? 0) + 1;
    const payload = parseJsonRecord(item.payload);
    const statusValue = String(payload.status ?? '').trim();
    if (statusValue) {
      byStatus[statusValue] = (byStatus[statusValue] ?? 0) + 1;
    }
    if (item.ok) {
      byResult.ok++;
    } else {
      byResult.failed++;
    }
  }

  return {
    ok: true,
    days: input.days,
    total: items.length,
    ok_count: byResult.ok,
    failed_count: byResult.failed,
    totals: {
      audit_logs: items.length,
      ok: byResult.ok,
      failed: byResult.failed,
    },
    by_action: Object.fromEntries(Object.entries(byAction).sort()),
    by_status: Object.fromEntries(Object.entries(byStatus).sort()),
    by_result: byResult,
  };
}

export async function defaultListKnowledgeEntries(input: {
  limit: number;
  offset: number;
}): Promise<{ ok: boolean; items: KnowledgeEntry[] }> {
  const prisma = getPrisma();
  const items = await prisma.knowledgeEntry.findMany({
    orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
    skip: input.offset,
    take: input.limit,
  });

  return {
    ok: true,
    items: items.map((item) => ({
      id: item.id,
      category: item.category,
      title: item.title,
      content: item.content,
      enabled: item.enabled,
      created_at: item.updated_at?.toISOString() ?? null,
      updated_at: item.updated_at?.toISOString() ?? null,
    })),
  };
}

export async function defaultCreateKnowledgeEntry(input: {
  category: string;
  title: string;
  content: string;
}): Promise<{ ok: boolean; item: KnowledgeEntry }> {
  const prisma = getPrisma();
  const item = await prisma.knowledgeEntry.create({
    data: {
      category: input.category,
      title: input.title,
      content: input.content,
      enabled: true,
    },
  });

  return {
    ok: true,
    item: {
      id: item.id,
      category: item.category,
      title: item.title,
      content: item.content,
      enabled: item.enabled,
      created_at: item.updated_at?.toISOString() ?? null,
      updated_at: item.updated_at?.toISOString() ?? null,
    },
  };
}

export async function defaultDisableKnowledgeEntry(input: {
  entryId: number;
}): Promise<{ ok: boolean; item: { id: number; enabled: boolean; updated_at: string | null } }> {
  const prisma = getPrisma();
  const item = await prisma.knowledgeEntry.update({
    where: { id: input.entryId },
    data: {
      enabled: false,
      updated_at: new Date(),
    },
  });

  return {
    ok: true,
    item: {
      id: item.id,
      enabled: item.enabled,
      updated_at: item.updated_at?.toISOString() ?? null,
    },
  };
}
