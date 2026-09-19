/**
 * Publish-log persistence helpers + publish-intent resolution + persona resolution.
 * Extracted from publisher.ts (pure extraction — behavior unchanged).
 */

import { createHash } from 'node:crypto';

import type { PublishIntent } from '../domain/publish/types.js';
import { prisma as getPrisma } from './db-queries.js';
import { getActivePersonaName } from './bilibili-runtime-config.js';
import { recordObservabilityEvent, ensureTraceId } from './observability.js';
import { isPublishLogStorageError } from './publisher-failure.js';

export async function safeCreatePublishLog(data: {
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
    // H5 F1 fix: P2002 = unique([canonical_comment_id, reply_hash]) 违反 = 同 reply 已记录过
    // (redelivery race 兜底 — L855 findFirst dedupe 与本 create 之间的 TOCTOU window 被 unique
    // index 作 true row lock 兜住). catch-as-duplicate-success: 不 rethrow (audit 已记录, 幂等),
    // 加 fire-and-forget ObservabilityEvent 使 race 可见 (default 30s lockDuration redelivery 场景).
    const code = (error as { code?: unknown })?.code;
    if (code === 'P2002') {
      void recordObservabilityEvent({
        event_type: 'publish_log_duplicate_detected',
        trace_id: ensureTraceId(),
        comment_id: data.comment_id,
        status: 'duplicate',
        metadata: {
          canonical_comment_id: data.canonical_comment_id,
          source: data.source,
          intended_status: data.status,
        },
      }).catch((recordError: unknown) => {
        console.warn(
          JSON.stringify({
            level: 'warn',
            message: 'publish_log_duplicate_event_record_failed',
            comment_id: data.comment_id,
            error: recordError instanceof Error ? recordError.message : String(recordError),
          }),
        );
      });
      return;
    }
    if (!isPublishLogStorageError(error)) {
      throw error;
    }
  }
}

// ── Hash helper ────────────────────────────────────────────

export function createReplyHash(commentId: string, replyText: string): string {
  const raw = `${commentId}::${replyText.trim()}`;
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

export function resolveIntentCommentId(intent: PublishIntent): string {
  if (intent.target.targetKind !== 'comment-reply') {
    throw new Error(`unsupported_publish_target:${intent.target.targetKind}`);
  }
  return intent.target.externalId;
}

export function resolveIntentReplyText(intent: PublishIntent): string {
  return intent.payload.text.trim();
}

export function resolveIntentCanonicalCommentId(intent: PublishIntent): string {
  return intent.target.canonicalId;
}

export function resolveIntentPlatform(intent: PublishIntent): string {
  return intent.target.platform.trim() || 'unknown';
}

/**
 * Resolve the per-persona identifier for antirisk signal attribution (TASK-002).
 *
 * Delegates to getActivePersonaName (the dedicated persona accessor in
 * bilibili-runtime-config) which returns the active BilibiliCredential.name. persona_id
 * is the credential.name string — consistent with the C-layer @self detection gate which
 * matches on the same name field (L2: persona source = reuse BilibiliCredential.name/id,
 * no new table).
 *
 * L7: publishIntentWithResult has a tuple-return contract and MUST NOT throw from here.
 * getActivePersonaName already contains its own try/catch returning null on failure, but
 * this wrapper adds a defensive outer guard so any unexpected throw still resolves to null
 * (with a structured warn) rather than escaping into the antirisk-signal catch path.
 */
export async function resolveActivePersonaId(): Promise<string | null> {
  try {
    return await getActivePersonaName();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    // OBS-010: persona 归因失败 (null persona_id → C 层 @self 检测 gate 失配 +
    // antirisk signal persona_id=null 无 per-persona 退避归因) 原仅 console.warn.
    // 补 fire-and-forget event 使归因失败可追踪, 让 antirisk signal persona_id=null 可关联.
    void recordObservabilityEvent({
      event_type: 'persona_id_resolution_failed',
      trace_id: ensureTraceId(),
      status: 'failed',
      metadata: { error: msg },
    }).catch((err: unknown) => {
      console.warn(
        JSON.stringify({
          level: 'warn',
          message: 'persona_id_resolution_failed_event_record_failed',
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    });
    console.warn(
      JSON.stringify({
        level: 'warn',
        message: 'persona_id_resolution_failed',
        error: msg,
      }),
    );
    return null;
  }
}

export type PublishLogContext = {
  platform: string;
  canonicalCommentId: string;
  commentId: string;
  source: string;
};
