/**
 * Reply publishing service
 * Migrated from Python: app/services/publisher.py
 *
 * Enhanced: Phase 3 - Bilibili API integration
 */

import type { PublishReplyService } from './interfaces.js';
import { prisma as getPrisma } from './db-queries.js';
import { postReply } from './bilibili-client.js';

/**
 * Create a hash for reply deduplication
 */
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

/**
 * Publish reply with result
 * Migrated from: app.services.publisher.publish_reply_with_result
 *
 * Enhancement: Real Bilibili API integration with:
 * - Duplicate check via database
 * - Idempotent publish via Bilibili API
 * - Publish status tracking
 * - Error handling with retries
 */
export const publishReplyWithResult: PublishReplyService = async (
  commentId,
  replyText,
  traceId?: string
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
      console.log(`[publisher] Duplicate reply detected for comment ${commentId}, skipping`);
      return [true, 'duplicate_reply', existing.published_at, { rpid: String(existing.id) }];
    }

    // 2. Post reply via Bilibili API
    const result = await postReply(commentId, replyText);
    const publishedAt = new Date();

    if (!result.success) {
      // Record failure
      await prisma.publishLog.create({
        data: {
          platform: 'bilibili',
          canonical_comment_id: commentId,
          comment_id: commentId,
          reply_hash: replyHash,
          source: 'bili-pet-bot',
          status: 'failed',
          failure_reason: 'api_error',
          published_at: publishedAt,
        },
      });
      return [false, 'publish_failed', publishedAt, null];
    }

    // 3. Record success in publish log
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

    console.log(`[publisher] Reply published: ${result.rpid} for comment ${commentId}`);
    return [true, 'published', publishedAt, { new_rpid: result.rpid }];
  } catch (error) {
    console.error(`[publisher] Publish failed for comment ${commentId}:`, error);

    const errorMsg = error instanceof Error ? error.message : String(error);
    const publishedAt = new Date();

    // Record failure in publish log
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
}
