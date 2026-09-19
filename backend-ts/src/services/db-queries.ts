/**
 * Database query services using Prisma Client
 * Replaces placeholder implementations with real database operations
 */

import type {
  Comment,
  ReplyJob,
  RoleCard,
  KnowledgeEntry,
  RoleCardValue,
} from '../models/entities.js';
import type {
  Comment as PrismaComment,
  ReplyJob as PrismaReplyJob,
  PublishLog as PrismaPublishLog,
  OperationAuditLog as PrismaAuditLog,
  BilibiliVideo as PrismaBilibiliVideo,
  BilibiliCredential as PrismaBilibiliCredential,
} from '@prisma/client';
import { getPrisma } from '../lib/prisma.js';

function parseRoleCardValue(value: unknown): RoleCardValue {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== 'string') {
    return '';
  }
  const normalized = value.trim();
  if (!normalized) {
    return '';
  }
  try {
    const parsed = JSON.parse(normalized);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : normalized;
  } catch {
    return normalized;
  }
}

/**
 * Get comment by canonical ID
 */
export async function getCommentByCanonicalId(canonicalId: string): Promise<Comment | null> {
  const prisma = getPrisma();
  const result = await prisma.comment.findUnique({
    where: { canonical_comment_id: canonicalId },
  });

  if (!result) return null;

  return {
    id: result.id,
    platform: result.platform,
    canonical_comment_id: result.canonical_comment_id,
    comment_id: result.comment_id,
    video_id: result.video_id,
    user_id: result.user_id,
    content: result.content,
    parent_id: result.parent_id,
    created_at: result.created_at,
  };
}

/**
 * Create reply job
 */
export async function createReplyJob(job: Partial<Omit<ReplyJob, 'id' | 'created_at'>>): Promise<number> {
  const prisma = getPrisma();
  const result = await prisma.replyJob.create({
    data: {
      comment_id: job.comment_id || '',
      canonical_comment_id: job.canonical_comment_id || null,
      status: job.status || 'queued',
      length_mode: job.length_mode || 'medium',
      style_mode: job.style_mode || 'doro',
      reply_text: job.reply_text || null,
      risk_flags: JSON.stringify(job.risk_flags || {}),
      attempts: job.attempts || 0,
      published_at: job.published_at || null,
    },
  });

  return result.id;
}

/**
 * Get role card by key
 */
export async function getRoleCardByKey(key: string): Promise<RoleCard | null> {
  const prisma = getPrisma();
  const result = await prisma.roleCard.findUnique({
    where: { key },
  });

  if (!result) return null;

  return {
    id: result.id,
    key: result.key,
    enabled: result.enabled,
    is_active: result.is_active,
    system_prompt: result.system_prompt,
    tone: parseRoleCardValue(result.tone),
    constraints: parseRoleCardValue(result.constraints),
    created_at: result.created_at,
    updated_at: result.updated_at,
  };
}

/**
 * Get active role card
 */
export async function getActiveRoleCard(): Promise<RoleCard | null> {
  const prisma = getPrisma();
  const result = await prisma.roleCard.findFirst({
    where: {
      enabled: true,
      is_active: true,
    },
    orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
  });

  if (!result) return null;

  return {
    id: result.id,
    key: result.key,
    enabled: result.enabled,
    is_active: result.is_active,
    system_prompt: result.system_prompt,
    tone: parseRoleCardValue(result.tone),
    constraints: parseRoleCardValue(result.constraints),
    created_at: result.created_at,
    updated_at: result.updated_at,
  };
}

/**
 * Search knowledge
 */
export async function searchKnowledge(query: string): Promise<Array<Partial<KnowledgeEntry>>> {
  const prisma = getPrisma();
  const results = await prisma.knowledgeEntry.findMany({
    where: {
      enabled: true,
      OR: [{ title: { contains: query } }, { content: { contains: query } }, { category: { contains: query } }],
    },
    take: 10,
  });

  return results.map((entry) => ({
    id: entry.id,
    category: entry.category,
    title: entry.title,
    answer: entry.content,
    enabled: entry.enabled,
    updated_at: entry.updated_at,
  }));
}

/**
 * Get user state
 */
export async function getUserState(userId: string): Promise<{
  id: number;
  user_id: string;
  recent_phrases: Record<string, unknown>;
  cooldown_enabled: boolean;
  updated_at: Date;
} | null> {
  const prisma = getPrisma();
  const result = await prisma.userState.findUnique({
    where: { user_id: userId },
  });

  if (!result) return null;

  return {
    id: result.id,
    user_id: result.user_id,
    recent_phrases:
      typeof result.recent_phrases === 'string' ? JSON.parse(result.recent_phrases) : result.recent_phrases,
    cooldown_enabled: result.cooldown_enabled,
    updated_at: result.updated_at,
  };
}

/**
 * Update user state
 */
export async function updateUserState(
  userId: string,
  updates: Partial<{
    recent_phrases: Record<string, unknown>;
    cooldown_enabled: boolean;
  }>,
): Promise<{
  id: number;
  user_id: string;
  recent_phrases: Record<string, unknown>;
  cooldown_enabled: boolean;
  updated_at: Date;
}> {
  const prisma = getPrisma();
  const result = await prisma.userState.upsert({
    where: { user_id: userId },
    update: {
      recent_phrases: JSON.stringify(updates.recent_phrases || {}),
      cooldown_enabled: updates.cooldown_enabled ?? false,
    },
    create: {
      user_id: userId,
      recent_phrases: JSON.stringify(updates.recent_phrases || {}),
      cooldown_enabled: updates.cooldown_enabled ?? false,
    },
  });

  return {
    id: result.id,
    user_id: result.user_id,
    recent_phrases:
      typeof result.recent_phrases === 'string' ? JSON.parse(result.recent_phrases) : result.recent_phrases,
    cooldown_enabled: result.cooldown_enabled,
    updated_at: result.updated_at,
  };
}

/**
 * Get publish log by canonical ID and reply hash
 */
export async function getPublishLogByCanonicalId(
  canonicalId: string,
  replyHash: string,
): Promise<{
  id: number;
  platform: string;
  canonical_comment_id: string;
  comment_id: string;
  reply_hash: string;
  source: string;
  status: string;
  published_at: Date | null;
  failure_reason: string | null;
  created_at: Date;
} | null> {
  const prisma = getPrisma();
  const result = await prisma.publishLog.findUnique({
    where: {
      uq_publish_logs_canonical_reply: {
        canonical_comment_id: canonicalId,
        reply_hash: replyHash,
      },
    },
  });

  if (!result) return null;

  return {
    id: result.id,
    platform: result.platform,
    canonical_comment_id: result.canonical_comment_id,
    comment_id: result.comment_id,
    reply_hash: result.reply_hash,
    source: result.source,
    status: result.status,
    published_at: result.published_at,
    failure_reason: result.failure_reason,
    created_at: result.created_at,
  };
}

/**
 * Create publish log
 */
export async function createPublishLog(log: {
  platform: string;
  canonical_comment_id: string;
  comment_id: string;
  reply_hash: string;
  source: string;
  status: string;
  published_at?: Date | null;
  failure_reason?: string | null;
}): Promise<{
  id: number;
  platform: string;
  canonical_comment_id: string;
  comment_id: string;
  reply_hash: string;
  source: string;
  status: string;
  published_at: Date | null;
  failure_reason: string | null;
  created_at: Date;
}> {
  const prisma = getPrisma();
  const result = await prisma.publishLog.create({
    data: {
      platform: log.platform,
      canonical_comment_id: log.canonical_comment_id,
      comment_id: log.comment_id,
      reply_hash: log.reply_hash,
      source: log.source,
      status: log.status,
      published_at: log.published_at || null,
      failure_reason: log.failure_reason || null,
    },
  });

  return {
    id: result.id,
    platform: result.platform,
    canonical_comment_id: result.canonical_comment_id,
    comment_id: result.comment_id,
    reply_hash: result.reply_hash,
    source: result.source,
    status: result.status,
    published_at: result.published_at,
    failure_reason: result.failure_reason,
    created_at: result.created_at,
  };
}

/**
 * Create comment
 */
export async function createComment(comment: Omit<Comment, 'id' | 'created_at'>): Promise<Comment> {
  const prisma = getPrisma();
  const result = await prisma.comment.create({
    data: {
      platform: comment.platform,
      canonical_comment_id: comment.canonical_comment_id,
      comment_id: comment.comment_id,
      video_id: comment.video_id,
      user_id: comment.user_id,
      content: comment.content,
      parent_id: comment.parent_id || null,
    },
  });

  return {
    id: result.id,
    platform: result.platform,
    canonical_comment_id: result.canonical_comment_id,
    comment_id: result.comment_id,
    video_id: result.video_id,
    user_id: result.user_id,
    content: result.content,
    parent_id: result.parent_id,
    created_at: result.created_at,
  };
}

/**
 * Get reply jobs by status
 */
export async function getReplyJobsByStatus(status: string, limit?: number): Promise<ReplyJob[]> {
  const prisma = getPrisma();
  const results = await prisma.replyJob.findMany({
    where: { status },
    orderBy: { created_at: 'asc' },
    take: limit || 100,
  });

  return results.map((result) => ({
    id: result.id,
    comment_id: result.comment_id,
    canonical_comment_id: result.canonical_comment_id,
    status: result.status as ReplyJob['status'],
    length_mode: result.length_mode,
    style_mode: result.style_mode,
    reply_text: result.reply_text,
    risk_flags: typeof result.risk_flags === 'string' ? JSON.parse(result.risk_flags) : result.risk_flags,
    attempts: result.attempts,
    published_at: result.published_at,
    created_at: result.created_at,
  }));
}

/**
 * Update reply job status
 */
export async function updateReplyJobStatus(id: number, status: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.replyJob.update({
    where: { id },
    data: { status },
  });
}

/**
 * Get reply job by ID
 */
export async function getReplyJobById(id: number): Promise<ReplyJob | null> {
  const prisma = getPrisma();
  const result = await prisma.replyJob.findUnique({
    where: { id },
  });

  if (!result) return null;

  return {
    id: result.id,
    comment_id: result.comment_id,
    canonical_comment_id: result.canonical_comment_id,
    status: result.status as ReplyJob['status'],
    length_mode: result.length_mode,
    style_mode: result.style_mode,
    reply_text: result.reply_text,
    risk_flags: typeof result.risk_flags === 'string' ? JSON.parse(result.risk_flags) : result.risk_flags,
    attempts: result.attempts,
    published_at: result.published_at,
    created_at: result.created_at,
  };
}

/* ===== Route-list data access (ISS-20260728-004: routes 不再直连 getPrisma) ===== */

export async function listComments(input: { offset: number; limit: number }): Promise<{ total: number; items: PrismaComment[] }> {
  const prisma = getPrisma();
  const [total, items] = await Promise.all([
    prisma.comment.count(),
    prisma.comment.findMany({ orderBy: { created_at: 'desc' }, skip: input.offset, take: input.limit }),
  ]);
  return { total, items };
}

export async function listReplyJobs(input: { offset: number; limit: number }): Promise<{ total: number; items: PrismaReplyJob[] }> {
  const prisma = getPrisma();
  const [total, items] = await Promise.all([
    prisma.replyJob.count(),
    prisma.replyJob.findMany({ orderBy: { created_at: 'desc' }, skip: input.offset, take: input.limit }),
  ]);
  return { total, items };
}

export async function listPublishLogs(input: {
  status?: string;
  offset: number;
  limit: number;
}): Promise<{ total: number; items: PrismaPublishLog[] }> {
  const prisma = getPrisma();
  const where: Record<string, unknown> = {};
  if (input.status) where.status = input.status;
  const [total, items] = await Promise.all([
    prisma.publishLog.count({ where }),
    prisma.publishLog.findMany({
      where,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      skip: input.offset,
      take: input.limit,
    }),
  ]);
  return { total, items };
}

export async function countAuditLogs(where: Record<string, unknown>): Promise<number> {
  const prisma = getPrisma();
  return prisma.operationAuditLog.count({ where });
}

export async function listAuditLogs(
  where: Record<string, unknown>,
  options: { offset?: number; take?: number; orderBy?: boolean },
): Promise<PrismaAuditLog[]> {
  const prisma = getPrisma();
  return prisma.operationAuditLog.findMany({
    where,
    ...(options.orderBy === false ? {} : { orderBy: [{ created_at: 'desc' }, { id: 'desc' }] }),
    ...(options.offset !== undefined ? { skip: options.offset } : {}),
    ...(options.take !== undefined ? { take: options.take } : {}),
  });
}

export async function getBilibiliVideoById(id: number): Promise<PrismaBilibiliVideo | null> {
  const prisma = getPrisma();
  return prisma.bilibiliVideo.findUnique({ where: { id } });
}

export async function updateBilibiliVideoPollEnabled(id: number, pollEnabled: boolean): Promise<void> {
  const prisma = getPrisma();
  await prisma.bilibiliVideo.update({ where: { id }, data: { poll_enabled: pollEnabled } });
}

export async function deleteBilibiliVideo(id: number): Promise<void> {
  const prisma = getPrisma();
  await prisma.bilibiliVideo.delete({ where: { id } });
}

export async function countCommentsByVideoId(videoId: string): Promise<number> {
  const prisma = getPrisma();
  return prisma.comment.count({ where: { video_id: videoId } });
}

export async function listBilibiliCredentials(limit: number): Promise<PrismaBilibiliCredential[]> {
  const prisma = getPrisma();
  return prisma.bilibiliCredential.findMany({ orderBy: { updated_at: 'desc' }, take: limit });
}

export async function countBilibiliCredentials(): Promise<number> {
  const prisma = getPrisma();
  return prisma.bilibiliCredential.count();
}

export async function getBilibiliCredentialById(id: number): Promise<PrismaBilibiliCredential | null> {
  const prisma = getPrisma();
  return prisma.bilibiliCredential.findUnique({ where: { id } });
}

export async function createBilibiliCredential(data: {
  name: string;
  sessdata: string;
  bili_jct: string;
  buvid3: string;
  buvid4: string | null;
  is_active: boolean;
  expires_at: Date | null;
}): Promise<PrismaBilibiliCredential> {
  const prisma = getPrisma();
  return prisma.bilibiliCredential.create({ data });
}

export async function activateBilibiliCredential(id: number): Promise<void> {
  const prisma = getPrisma();
  await prisma.bilibiliCredential.updateMany({ data: { is_active: false } });
  await prisma.bilibiliCredential.update({ where: { id }, data: { is_active: true } });
}

export async function deleteBilibiliCredential(id: number): Promise<void> {
  const prisma = getPrisma();
  await prisma.bilibiliCredential.delete({ where: { id } });
}

export async function countComments(): Promise<number> {
  const prisma = getPrisma();
  return prisma.comment.count();
}

export async function countReplyJobs(): Promise<number> {
  const prisma = getPrisma();
  return prisma.replyJob.count();
}

export async function listCommentDatesSince(sinceUtc: Date, take: number): Promise<Array<{ created_at: Date | null }>> {
  const prisma = getPrisma();
  return prisma.comment.findMany({
    where: { created_at: { gte: sinceUtc } },
    select: { created_at: true },
    orderBy: { created_at: 'asc' },
    take,
  });
}

export async function listJobDatesStatusSince(
  sinceUtc: Date,
  take: number,
): Promise<Array<{ created_at: Date | null; status: string }>> {
  const prisma = getPrisma();
  return prisma.replyJob.findMany({
    where: { created_at: { gte: sinceUtc } },
    select: { created_at: true, status: true },
    orderBy: { created_at: 'asc' },
    take,
  });
}

export async function countReplyJobsByStatus(): Promise<Record<string, number>> {
  const prisma = getPrisma();
  const rows = await prisma.replyJob.groupBy({ by: ['status'], _count: true });
  const result: Record<string, number> = {};
  for (const row of rows) {
    const count = row._count as unknown;
    result[row.status] =
      typeof count === 'number' ? count : Number((count as { _all?: number } | undefined)?._all ?? 0);
  }
  return result;
}

export async function countObservabilityEventsBySubclass(sinceUtc: Date): Promise<Record<string, number>> {
  const prisma = getPrisma();
  const rows = await prisma.observabilityEvent.groupBy({
    by: ['error_subclass'],
    where: {
      event_type: { in: ['backoff_applied', 'antirisk_signal_detected'] },
      created_at: { gte: sinceUtc },
      error_subclass: { not: null },
    },
    _count: { _all: true },
  });
  const result: Record<string, number> = {};
  for (const row of rows) {
    const count = row._count as unknown;
    const key = row.error_subclass;
    if (key) {
      result[key] = typeof count === 'number' ? count : Number((count as { _all?: number } | undefined)?._all ?? 0);
    }
  }
  return result;
}

export async function countAuditLogsSince(sinceUtc: Date): Promise<number> {
  const prisma = getPrisma();
  return prisma.operationAuditLog.count({ where: { created_at: { gte: sinceUtc } } });
}

// Export Prisma client for direct access if needed
export { getPrisma as prisma };
