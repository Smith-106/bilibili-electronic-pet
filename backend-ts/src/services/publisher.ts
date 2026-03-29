/**
 * Reply publishing service
 * Migrated from Python: app/services/publisher.py
 *
 * Enhanced: Multi-mode publish support (manual_queue, simulated, webhook, real_publish)
 * + Bilibili API integration
 */

import type { PublishReplyService } from './interfaces.js';
import { prisma as getPrisma } from './db-queries.js';
import { postReply } from './bilibili-client.js';

// ── Publisher mode configuration ───────────────────────────

type PublisherMode = 'manual_queue' | 'simulated' | 'webhook' | 'real_publish';

function getPublisherMode(): PublisherMode {
  const mode = (process.env.PUBLISHER_MODE || 'real_publish').trim().toLowerCase();
  if (['manual_queue', 'simulated', 'webhook', 'real_publish'].includes(mode)) {
    return mode as PublisherMode;
  }
  return 'real_publish';
}

// ── Circuit breaker ────────────────────────────────────────

interface CircuitBreaker {
  failureCount: number;
  openUntil: number;
}

let breaker: CircuitBreaker = { failureCount: 0, openUntil: 0 };

function isCircuitBreakerOpen(): boolean {
  if (!isCircuitBreakerEnabled()) return false;
  if (breaker.openUntil > Date.now()) return true;
  return false;
}

function recordFailure(): void {
  if (!isCircuitBreakerEnabled()) return;
  breaker.failureCount++;
  const threshold = parseInt(process.env.PUBLISHER_CIRCUIT_FAILURE_THRESHOLD || '3', 10);
  if (breaker.failureCount >= threshold) {
    const openSeconds = parseInt(process.env.PUBLISHER_CIRCUIT_OPEN_SECONDS || '30', 10);
    breaker.openUntil = Date.now() + openSeconds * 1000;
    console.warn(`[publisher] Circuit breaker OPEN for ${openSeconds}s after ${breaker.failureCount} failures`);
  }
}

function recordSuccess(): void {
  breaker.failureCount = 0;
  breaker.openUntil = 0;
}

function isCircuitBreakerEnabled(): boolean {
  return process.env.PUBLISHER_CIRCUIT_BREAKER_ENABLED !== 'false';
}

// ── Hash helper ────────────────────────────────────────────

function createReplyHash(text: string): string {
  let hash = 0;
  const str = text.trim().substring(0, 100);
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
    hash = hash & hash;
  }
  return String(hash >>> 0).padStart(8, '0');
}

// ── Mode implementations ───────────────────────────────────

/**
 * manual_queue mode: Record job for human review
 */
async function publishManualQueue(
  commentId: string,
  replyText: string,
): Promise<[boolean, string, Date | null, Record<string, unknown> | null]> {
  const prisma = getPrisma();
  const replyHash = createReplyHash(replyText);
  const now = new Date();

  await prisma.publishLog.create({
    data: {
      platform: 'bilibili',
      canonical_comment_id: commentId,
      comment_id: commentId,
      reply_hash: replyHash,
      source: 'manual_queue',
      status: 'pending_review',
      published_at: now,
      failure_reason: null,
    },
  });

  console.log(`[publisher] Queued for manual review: comment ${commentId}`);
  return [true, 'manual_queued', now, null];
}

/**
 * simulated mode: Simulate successful publish without calling API
 */
async function publishSimulated(
  commentId: string,
  replyText: string,
): Promise<[boolean, string, Date | null, Record<string, unknown> | null]> {
  const prisma = getPrisma();
  const replyHash = createReplyHash(replyText);
  const now = new Date();

  await prisma.publishLog.create({
    data: {
      platform: 'bilibili',
      canonical_comment_id: commentId,
      comment_id: commentId,
      reply_hash: replyHash,
      source: 'simulated',
      status: 'published',
      published_at: now,
      failure_reason: null,
    },
  });

  console.log(`[publisher] Simulated publish: comment ${commentId}`);
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
  commentId: string,
  replyText: string,
): Promise<[boolean, string, Date | null, Record<string, unknown> | null]> {
  const result = await postReply(commentId, replyText);
  const publishedAt = new Date();

  if (!result.success) {
    const prisma = getPrisma();
    const replyHash = createReplyHash(replyText);

    await prisma.publishLog.create({
      data: {
        platform: 'bilibili',
        canonical_comment_id: commentId,
        comment_id: commentId,
        reply_hash: replyHash,
        source: 'bili-pet-bot',
        status: 'failed',
        failure_reason: 'publish_failed',
        published_at: publishedAt,
      },
    });

    return [false, 'publish_failed', publishedAt, null];
  }

  const prisma = getPrisma();
  const replyHash = createReplyHash(replyText);

  await prisma.publishLog.create({
    data: {
      platform: 'bilibili',
      canonical_comment_id: commentId,
      comment_id: commentId,
      reply_hash: replyHash,
      source: 'bili-pet-bot',
      status: 'published',
      published_at: publishedAt,
      failure_reason: null,
    },
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
export const publishReplyWithResult: PublishReplyService = async (
  commentId,
  replyText,
  traceId?: string,
) => {
  try {
    // 1. Check duplicate via Publish log
    const prisma = getPrisma();
    const replyHash = createReplyHash(replyText);

    const existing = await prisma.publishLog.findFirst({
      where: {
        canonical_comment_id: commentId,
        reply_hash: replyHash,
      },
    });

    if (existing) {
      console.log(`[publisher] Duplicate reply for comment ${commentId}, skipping`);
      return [true, 'duplicate_reply', existing.published_at, { rpid: String(existing.id) }];
    }

    // 2. Check circuit breaker
    if (isCircuitBreakerOpen()) {
      const now = new Date();
      return [false, 'circuit_breaker_open', now, null];
    }

    // 3. Dispatch to mode-specific handler
    const mode = getPublisherMode();
    let result: [boolean, string, Date | null, Record<string, unknown> | null];

    switch (mode) {
      case 'manual_queue':
        result = await publishManualQueue(commentId, replyText);
        break;
      case 'simulated':
        result = await publishSimulated(commentId, replyText);
        break;
      case 'webhook':
        result = await publishWebhook(commentId, replyText);
        break;
      case 'real_publish':
      default:
        result = await publishReal(commentId, replyText);
        break;
    }

    // 4. Update circuit breaker
    if (result[0]) {
      recordSuccess();
    } else {
      recordFailure();
    }

    return result;
  } catch (error) {
    console.error(`[publisher] Publish failed for comment ${commentId}:`, error);

    const errorMsg = error instanceof Error ? error.message : String(error);
    const publishedAt = new Date();

    try {
      const prisma = getPrisma();
      const replyHash = createReplyHash(replyText);
      await prisma.publishLog.create({
        data: {
          platform: 'bilibili',
          canonical_comment_id: commentId,
          comment_id: commentId,
          reply_hash: replyHash,
          source: 'bili-pet-bot',
          status: 'failed',
          failure_reason: errorMsg,
          published_at: publishedAt,
        },
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
