/**
 * Database query services using Prisma Client
 * Replaces placeholder implementations with real database operations
 */

import type { Comment, ReplyJob, RoleCard, KnowledgeEntry, RoleCardValue } from '../models/entities.js';
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

// Export Prisma client for direct access if needed
export { getPrisma as prisma };
