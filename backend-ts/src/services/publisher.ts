/**
 * Reply publishing service
 * Migrated from Python: app/services/publisher.py
 *
 * Enhanced: Multi-mode publish support (manual_queue, simulated, webhook, real_publish)
 * + Bilibili API integration
 */

import type { PublishIntentService, PublishReplyService } from './interfaces.js';
import type { PublishIntent } from '../domain/publish/types.js';
import { prisma as getPrisma } from './db-queries.js';
import { postReply } from './bilibili-client.js';
import { createHash } from 'node:crypto';

// ── Publisher mode configuration ───────────────────────────

type PublisherMode = 'manual_queue' | 'simulated' | 'webhook' | 'real_publish';

function getPublisherMode(): PublisherMode {
  const mode = (process.env.PUBLISHER_MODE || 'manual_queue').trim().toLowerCase();
  if (['manual_queue', 'simulated', 'webhook', 'real_publish'].includes(mode)) {
    return mode as PublisherMode;
  }
  return 'manual_queue';
}

// ── Circuit breaker (per-platform isolation) ──────────────

interface CircuitBreaker {
  failureCount: number;
  openUntil: number;
}

const breakers = new Map<string, CircuitBreaker>();

function getPlatformBreaker(platform: string): CircuitBreaker {
  let breaker = breakers.get(platform);
  if (!breaker) {
    breaker = { failureCount: 0, openUntil: 0 };
    breakers.set(platform, breaker);
  }
  return breaker;
}

function isCircuitBreakerOpen(platform: string): boolean {
  if (!isCircuitBreakerEnabled()) return false;
  const breaker = getPlatformBreaker(platform);
  if (breaker.openUntil > Date.now()) return true;
  return false;
}

function recordFailure(platform: string): void {
  if (!isCircuitBreakerEnabled()) return;
  const breaker = getPlatformBreaker(platform);
  breaker.failureCount++;
  const threshold = parseInt(process.env.PUBLISHER_CIRCUIT_FAILURE_THRESHOLD || '3', 10);
  if (breaker.failureCount >= threshold) {
    const openSeconds = parseInt(process.env.PUBLISHER_CIRCUIT_OPEN_SECONDS || '30', 10);
    breaker.openUntil = Date.now() + openSeconds * 1000;
    console.warn(`[publisher] Circuit breaker OPEN for platform=${platform} for ${openSeconds}s after ${breaker.failureCount} failures`);
  }
}

function recordSuccess(platform: string): void {
  const breaker = getPlatformBreaker(platform);
  breaker.failureCount = 0;
  breaker.openUntil = 0;
}

function isCircuitBreakerEnabled(): boolean {
  return process.env.PUBLISHER_CIRCUIT_BREAKER_ENABLED !== 'false';
}

function isPublishLogStorageError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes('no such table: main.publish_logs') ||
    (message.includes('no such column') && message.includes('reservation_key'))
  );
}

async function safeCreatePublishLog(data: {
  platform: string;
  canonical_comment_id: string;
  comment_id: string;
  reply_hash: string;
  source: string;
  status: string;
  published_at: Date | null;
  failure_reason: string | null;
}): Promise<void> {
  const prisma = getPrisma();
  try {
    await prisma.publishLog.create({ data });
  } catch (error) {
    if (!isPublishLogStorageError(error)) {
      throw error;
    }
  }
}

// ── Hash helper ────────────────────────────────────────────

function createReplyHash(commentId: string, replyText: string): string {
  const raw = `${commentId}::${replyText.trim()}`;
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

function resolveIntentCommentId(intent: PublishIntent): string {
  if (intent.target.targetKind !== 'comment-reply') {
    throw new Error(`unsupported_publish_target:${intent.target.targetKind}`);
  }
  return intent.target.externalId;
}

function resolveIntentReplyText(intent: PublishIntent): string {
  return intent.payload.text.trim();
}

function resolveIntentCanonicalCommentId(intent: PublishIntent): string {
  return intent.target.canonicalId;
}

function resolveIntentPlatform(intent: PublishIntent): string {
  return intent.target.platform.trim() || 'unknown';
}

type PublishLogContext = {
  platform: string;
  canonicalCommentId: string;
  commentId: string;
  source: string;
};

// ── Mode implementations ───────────────────────────────────

/**
 * manual_queue mode: Record job for human review
 */
async function publishManualQueue(
  context: PublishLogContext,
  replyText: string,
): Promise<[boolean, string, Date | null, Record<string, unknown> | null]> {
  const replyHash = createReplyHash(context.commentId, replyText);
  const now = new Date();

  await safeCreatePublishLog({
    platform: context.platform,
    canonical_comment_id: context.canonicalCommentId,
    comment_id: context.commentId,
    reply_hash: replyHash,
    source: context.source,
    status: 'pending_review',
    published_at: now,
    failure_reason: null,
  });

  console.log(`[publisher] Queued for manual review: comment ${context.commentId}`);
  return [true, 'manual_queued', now, null];
}

/**
 * simulated mode: Simulate successful publish without calling API
 */
async function publishSimulated(
  context: PublishLogContext,
  replyText: string,
): Promise<[boolean, string, Date | null, Record<string, unknown> | null]> {
  const replyHash = createReplyHash(context.commentId, replyText);
  const now = new Date();

  await safeCreatePublishLog({
    platform: context.platform,
    canonical_comment_id: context.canonicalCommentId,
    comment_id: context.commentId,
    reply_hash: replyHash,
    source: context.source,
    status: 'published',
    published_at: now,
    failure_reason: null,
  });

  console.log(`[publisher] Simulated publish: comment ${context.commentId}`);
  return [true, 'simulated', now, null];
}

/**
 * webhook mode: Call external webhook for publish
 */
async function publishWebhook(
  commentId: string,
  replyText: string,
): Promise<[boolean, string, Date | null, Record<string, unknown> | null]> {
  const webhookUrl = process.env.PUBLISHER_WEBHOOK_URL;
  const webhookToken = process.env.PUBLISHER_WEBHOOK_TOKEN;
  const timeout = parseInt(process.env.PUBLISHER_TIMEOUT_SECONDS || '15', 10) * 1000;
  const now = new Date();

  if (!webhookUrl) {
    return [false, 'webhook_not_configured', now, null];
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (webhookToken) {
      headers['Authorization'] = `Bearer ${webhookToken}`;
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ comment_id: commentId, reply_text: replyText }),
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      return [false, `webhook_http_${response.status}`, now, null];
    }

    const data = await response.json();
    return [true, 'webhook_published', now, { webhook_response: data }];
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return [false, `webhook_error: ${msg}`, now, null];
  }
}

/**
 * real_publish mode: Post reply via Bilibili API
 */
async function publishReal(
  context: PublishLogContext,
  replyText: string,
): Promise<[boolean, string, Date | null, Record<string, unknown> | null]> {
  const result = await postReply(context.commentId, replyText);
  const publishedAt = new Date();

  if (!result.success) {
    const replyHash = createReplyHash(context.commentId, replyText);

    await safeCreatePublishLog({
      platform: context.platform,
      canonical_comment_id: context.canonicalCommentId,
      comment_id: context.commentId,
      reply_hash: replyHash,
      source: context.source,
      status: 'failed',
      failure_reason: 'publish_failed',
      published_at: publishedAt,
    });

    return [false, 'publish_failed', publishedAt, null];
  }

  const replyHash = createReplyHash(context.commentId, replyText);

  await safeCreatePublishLog({
    platform: context.platform,
    canonical_comment_id: context.canonicalCommentId,
    comment_id: context.commentId,
    reply_hash: replyHash,
    source: context.source,
    status: 'published',
    published_at: publishedAt,
    failure_reason: null,
  });

  return [true, 'published', publishedAt, { new_rpid: result.rpid }];
}

// ── Public API ─────────────────────────────────────────────

/**
 * Publish reply with result
 * Migrated from: app.services.publisher.publish_reply_with_result
 *
 * Supports 4 publish modes:
 * - manual_queue: Record for human review
 * - simulated: Simulate success without API call
 * - webhook: Delegate to external webhook
 * - real_publish: Call Bilibili API directly
 */
export const publishReplyWithResult: PublishReplyService = async (commentId, replyText, _traceId?: string) => {
  return publishIntentWithResult({
    traceId: _traceId,
    source: 'legacy-reply-publish',
    target: {
      platform: 'bilibili',
      targetKind: 'comment-reply',
      externalId: commentId,
      canonicalId: `bilibili:${commentId}`,
    },
    payload: {
      text: replyText,
    },
  });
};

export const publishIntentWithResult: PublishIntentService = async (intent) => {
  const commentId = resolveIntentCommentId(intent);
  const replyText = resolveIntentReplyText(intent);
  const canonicalCommentId = resolveIntentCanonicalCommentId(intent);
  const platform = resolveIntentPlatform(intent);
  const source = intent.source?.trim() || getPublisherMode();
  const context: PublishLogContext = {
    platform,
    canonicalCommentId,
    commentId,
    source,
  };

  try {
    // 1. Check duplicate via Publish log
    const prisma = getPrisma();
    const replyHash = createReplyHash(commentId, replyText);

    let existing: { id: number; published_at: Date | null } | null = null;
    try {
      existing = await prisma.publishLog.findFirst({
        where: {
          canonical_comment_id: canonicalCommentId,
          reply_hash: replyHash,
        },
        select: {
          id: true,
          published_at: true,
        },
      });
    } catch (error) {
      if (!isPublishLogStorageError(error)) {
        throw error;
      }
    }

    if (existing) {
      console.log(`[publisher] Duplicate reply for comment ${commentId}, skipping`);
      return [true, 'duplicate_reply', existing.published_at, { rpid: String(existing.id) }];
    }

    // 2. Check circuit breaker (per-platform)
    if (isCircuitBreakerOpen(platform)) {
      const now = new Date();
      return [false, 'circuit_breaker_open', now, null];
    }

    // 3. Dispatch to mode-specific handler
    const mode = getPublisherMode();
    let result: [boolean, string, Date | null, Record<string, unknown> | null];

    switch (mode) {
      case 'manual_queue':
        result = await publishManualQueue(context, replyText);
        break;
      case 'simulated':
        result = await publishSimulated(context, replyText);
        break;
      case 'webhook':
        result = await publishWebhook(commentId, replyText);
        break;
      case 'real_publish':
      default:
        result = await publishReal(context, replyText);
        break;
    }

    // 4. Update circuit breaker (per-platform)
    if (result[0]) {
      recordSuccess(platform);
    } else {
      recordFailure(platform);
    }

    return result;
  } catch (error) {
    console.error(`[publisher] Publish failed for comment ${commentId}:`, error);

    const errorMsg = error instanceof Error ? error.message : String(error);
    const publishedAt = new Date();

    try {
      const replyHash = createReplyHash(commentId, replyText);
      await safeCreatePublishLog({
        platform,
        canonical_comment_id: canonicalCommentId,
        comment_id: commentId,
        reply_hash: replyHash,
        source,
        status: 'failed',
        failure_reason: errorMsg,
        published_at: publishedAt,
      });
    } catch (dbError) {
      console.error('[publisher] Failed to record publish log:', dbError);
    }

    if (errorMsg.includes('rate')) {
      return [false, 'rate_limited', publishedAt, null];
    }
    return [false, 'publish_failed', publishedAt, null];
  }
};
