import type { PrismaClient } from '@prisma/client';

import type { ReplyJob } from './contracts.js';

type CommentJobQueryDeps = {
  getPrisma: () => PrismaClient;
  normalizeNullableIsoTimestamp: (value: Date | string | null | undefined) => string | null;
  csvEscape: (value: string) => string;
};

const REVIEWABLE_JOB_STATUSES = ['manual_queue', 'blocked', 'dedupe_skipped'] as const;

function buildAdminJobStatusWhere(status?: string): Record<string, unknown> {
  const normalized = String(status ?? '').trim();
  if (!normalized) {
    return {};
  }
  if (normalized === 'pending_review') {
    return {
      status: {
        in: [...REVIEWABLE_JOB_STATUSES],
      },
    };
  }
  return { status: normalized };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function inferPlatformFromCanonicalCommentId(canonicalCommentId: string | null | undefined): string | null {
  if (!canonicalCommentId) {
    return null;
  }
  const normalized = String(canonicalCommentId).trim();
  const separator = normalized.indexOf(':');
  if (separator <= 0) {
    return null;
  }
  return normalized.slice(0, separator);
}

export function buildCommentRouteContext(input: {
  platform?: string | null;
  videoId?: unknown;
  userId?: unknown;
  parentId?: unknown;
}): ReplyJob['route_context'] {
  const platform = isNonEmptyString(input.platform) ? input.platform.trim().toLowerCase() : undefined;
  const containerId = isNonEmptyString(input.videoId) ? String(input.videoId).trim() : undefined;
  const userId = isNonEmptyString(input.userId) ? String(input.userId).trim() : undefined;
  const parentExternalId = isNonEmptyString(input.parentId) ? String(input.parentId).trim() : undefined;

  if (!platform && !containerId && !userId && !parentExternalId) {
    return null;
  }

  const routeContext: NonNullable<ReplyJob['route_context']> = {
    ...(platform ? { platform } : {}),
    ...(containerId ? { container_id: containerId } : {}),
    ...(userId ? { user_id: userId } : {}),
    ...(parentExternalId ? { parent_external_id: parentExternalId } : {}),
  };

  if (platform === 'qq') {
    if (containerId) {
      routeContext.chat_type = 'group';
    } else if (userId) {
      routeContext.chat_type = 'private';
    }
  }

  return routeContext;
}

function normalizeQueryJobRecord(
  item: Record<string, unknown>,
  normalizeNullableIsoTimestamp: (value: Date | string | null | undefined) => string | null,
  options: {
    commentContent?: string | null;
    platform?: string | null;
    routeContext?: ReplyJob['route_context'];
  } = {},
): ReplyJob {
  const canonicalCommentId = isNonEmptyString(item.canonical_comment_id) ? item.canonical_comment_id : null;
  const inferredPlatform = options.platform ?? inferPlatformFromCanonicalCommentId(canonicalCommentId);

  return {
    id: Number(item.id ?? 0),
    comment_id: String(item.comment_id ?? ''),
    canonical_comment_id: canonicalCommentId,
    status: String(item.status ?? ''),
    reply_text: typeof item.reply_text === 'string' ? item.reply_text : null,
    style_profile: typeof item.style_profile === 'string' ? item.style_profile : null,
    role_profile: typeof item.role_profile === 'string' ? item.role_profile : null,
    role_card_key: typeof item.role_card_key === 'string' ? item.role_card_key : null,
    force_long: typeof item.force_long === 'boolean' ? item.force_long : null,
    platform: inferredPlatform ?? null,
    route_context: options.routeContext ?? null,
    created_at: normalizeNullableIsoTimestamp(item.created_at as Date | string | null | undefined),
    updated_at: normalizeNullableIsoTimestamp(item.updated_at as Date | string | null | undefined),
    comment_content: options.commentContent ?? (typeof item.comment_content === 'string' ? item.comment_content : null),
  };
}

async function getComment(
  deps: CommentJobQueryDeps,
  input: { commentId: string },
): Promise<{ ok: boolean; comment: Record<string, unknown>; jobs: ReplyJob[] }> {
  const prisma = deps.getPrisma();
  const commentId = String(input.commentId ?? '').trim();
  const comment = await prisma.comment.findFirst({
    where: {
      OR: [{ comment_id: commentId }, { canonical_comment_id: commentId }],
    },
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
  });

  if (!comment) {
    throw { statusCode: 404, detail: 'comment_not_found' };
  }

  const jobs = await prisma.replyJob.findMany({
    where: {
      OR: [{ comment_id: comment.comment_id }, { canonical_comment_id: comment.canonical_comment_id }],
    },
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
  });

  return {
    ok: true,
    comment: {
      id: comment.id,
      platform: comment.platform,
      canonical_comment_id: comment.canonical_comment_id,
      comment_id: comment.comment_id,
      video_id: comment.video_id,
      user_id: comment.user_id,
      content: comment.content,
      parent_id: comment.parent_id,
      route_context: buildCommentRouteContext({
        platform: comment.platform,
        videoId: comment.video_id,
        userId: comment.user_id,
        parentId: comment.parent_id,
      }),
      created_at: comment.created_at?.toISOString() ?? null,
    },
    jobs: jobs.map((job) =>
      normalizeQueryJobRecord(job as unknown as Record<string, unknown>, deps.normalizeNullableIsoTimestamp, {
        commentContent: comment.content,
        platform: comment.platform,
        routeContext: buildCommentRouteContext({
          platform: comment.platform,
          videoId: comment.video_id,
          userId: comment.user_id,
          parentId: comment.parent_id,
        }),
      }),
    ),
  };
}

async function getJob(deps: CommentJobQueryDeps, input: { jobId: number }): Promise<{ ok: boolean; item: ReplyJob }> {
  const prisma = deps.getPrisma();
  const job = await prisma.replyJob.findUnique({ where: { id: input.jobId } });
  if (!job) {
    throw { statusCode: 404, detail: 'job_not_found' };
  }

  const comment = await prisma.comment.findFirst({
    where: {
      OR: [{ comment_id: job.comment_id }, ...(job.canonical_comment_id ? [{ canonical_comment_id: job.canonical_comment_id }] : [])],
    },
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
  });

  return {
    ok: true,
    item: normalizeQueryJobRecord(job as unknown as Record<string, unknown>, deps.normalizeNullableIsoTimestamp, {
      commentContent: comment?.content ?? null,
      platform: comment?.platform ?? null,
      routeContext: buildCommentRouteContext({
        platform: comment?.platform ?? null,
        videoId: comment?.video_id,
        userId: comment?.user_id,
        parentId: comment?.parent_id,
      }),
    }),
  };
}

async function listJobs(
  deps: CommentJobQueryDeps,
  input: { status?: string; limit: number; offset: number },
): Promise<{ ok: boolean; items: ReplyJob[] }> {
  const prisma = deps.getPrisma();
  const where = buildAdminJobStatusWhere(input.status);
  const items = await prisma.replyJob.findMany({
    where,
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    skip: input.offset,
    take: input.limit,
  });

  const commentIds = [...new Set(items.map((item) => item.comment_id).filter((value): value is string => Boolean(value)))];
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
    ok: true,
    items: items.map((item) => {
      const comment =
        (item.canonical_comment_id && commentByCanonicalId.get(item.canonical_comment_id)) ||
        commentByCommentId.get(item.comment_id);
      return normalizeQueryJobRecord(item as unknown as Record<string, unknown>, deps.normalizeNullableIsoTimestamp, {
        commentContent: comment?.content ?? null,
        platform: comment?.platform ?? null,
        routeContext: buildCommentRouteContext({
          platform: comment?.platform ?? null,
          videoId: comment?.video_id,
          userId: comment?.user_id,
          parentId: comment?.parent_id,
        }),
      });
    }),
  };
}

async function exportJobsCsv(deps: CommentJobQueryDeps, input: { status?: string; limit: number }): Promise<string> {
  const prisma = deps.getPrisma();
  const where = buildAdminJobStatusWhere(input.status);
  const items = await prisma.replyJob.findMany({
    where,
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    take: input.limit,
  });

  const header = 'job_id,comment_id,status,created_at';
  const rows = items.map((item) =>
    [item.id, deps.csvEscape(item.comment_id), deps.csvEscape(item.status), deps.csvEscape(item.created_at?.toISOString() ?? '')].join(
      ',',
    ),
  );

  return `${[header, ...rows].join('\n')}\n`;
}

export function createCommentJobQueryHelpers(deps: CommentJobQueryDeps) {
  return {
    getComment: (input: { commentId: string }) => getComment(deps, input),
    getJob: (input: { jobId: number }) => getJob(deps, input),
    listJobs: (input: { status?: string; limit: number; offset: number }) => listJobs(deps, input),
    exportJobsCsv: (input: { status?: string; limit: number }) => exportJobsCsv(deps, input),
  };
}
