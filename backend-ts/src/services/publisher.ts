/**
 * Reply publishing service — orchestrator + public API.
 * Migrated from Python: app/services/publisher.py
 *
 * Enhanced: Multi-mode publish support (manual_queue, simulated, webhook, real_publish)
 * + Bilibili API integration
 *
 * Module layout (extracted for single-responsibility, no behavior change):
 * - publisher-mode.ts:    PublisherMode resolution + stage gate
 * - publisher-breaker.ts: per-platform circuit breaker
 * - publisher-failure.ts: failure normalization + antirisk subclass classifier + mock env
 * - publisher-store.ts:   publish_log persistence + publish-intent resolution + persona
 * - publisher-modes.ts:   the 4 mode implementations
 * This file owns the dispatch orchestration + the public service entrypoints, and
 * re-exports the public symbols for backward compatibility.
 */

import type { PublishIntentService, PublishReplyService } from './interfaces.js';
import type { PublishReason } from '../domain/publish/types.js';
import { prisma as getPrisma } from './db-queries.js';
import {
  recordAntiriskSignal,
  recordObservabilityEvent,
  getObservabilityDropCount,
} from './observability.js';
import { isPersonaInBackoff, applyBackoff } from './backoff-decision.js';
import {
  getPublisherMode,
  resolveEffectivePublisherMode,
  isStageGateEnabled,
  isStageRealPublishReady,
  setStageReadyResolver,
  __resetStageReadyResolverForTest,
  type PublisherMode,
} from './publisher-mode.js';
import { isCircuitBreakerOpen, recordFailure, recordSuccess } from './publisher-breaker.js';
import {
  isPublishLogStorageError,
  normalizeFailureReason,
  classifyAntiriskSubclass,
  type AntiriskSubclass,
} from './publisher-failure.js';
import {
  safeCreatePublishLog,
  createReplyHash,
  resolveIntentCommentId,
  resolveIntentReplyText,
  resolveIntentCanonicalCommentId,
  resolveIntentPlatform,
  resolveActivePersonaId,
  type PublishLogContext,
} from './publisher-store.js';
import {
  publishManualQueue,
  publishSimulated,
  publishWebhook,
  publishReal,
} from './publisher-modes.js';

// ── Public re-exports (backward compatibility) ─────────────
export { setStageReadyResolver, __resetStageReadyResolverForTest, type PublisherMode };
export { classifyAntiriskSubclass, type AntiriskSubclass };

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

  // A 层 backoff intercept (TASK-004): resolve the active persona and short-circuit
  // when that persona is currently in backoff (per-persona isolation, L5). Returns the
  // tuple [false, 'backoff_active', date, null] — does NOT throw (L7 tuple contract),
  // so BullMQ retry is not triggered and the in-flight job simply fails this attempt.
  // persona_id is read via resolveActivePersonaId (TASK-002 source, fail-safe null on
  // any error). A null persona_id never enters backoff (isPersonaInBackoff returns false).
  const backoffPersonaId = await resolveActivePersonaId();
  if (isPersonaInBackoff(backoffPersonaId)) {
    // H9 fix: publish 被 A 层退避拦截 (readiness red via backoff), stdout-only 无 event —
    // 加 fire-and-forget ObservabilityEvent 使 block 可追溯 (与 applyBackoff 的 backoff_applied
    // event 语义不同: 那是退避应用时, 这是退避生效拦截 publish 时).
    void recordObservabilityEvent({
      event_type: 'publish_blocked_by_backoff',
      trace_id: intent.traceId ?? canonicalCommentId,
      comment_id: commentId,
      status: 'backoff_active',
      metadata: {
        persona_id: backoffPersonaId,
      },
    }).catch((error: unknown) => {
      console.warn(
        JSON.stringify({
          level: 'warn',
          message: 'publish_blocked_by_backoff_event_record_failed',
          comment_id: commentId,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    });
    console.warn(
      JSON.stringify({
        level: 'warn',
        message: 'publish_blocked_by_backoff',
        persona_id: backoffPersonaId,
        comment_id: commentId,
        trace_id: intent.traceId ?? canonicalCommentId,
        timestamp: new Date().toISOString(),
      }),
    );
    return [false, 'backoff_active', new Date(), null];
  }

  // P3 warmup stage gate (L1): dry_run 立即返回不写 publish_log 不调 postReply;
  // real_publish 在 STAGE_GATE_ENABLED 开启时校验 readiness 全绿 (STAGE_REAL_PUBLISH_READY)
  // + observability drop_count=0 (SC4), 不满足 fail-closed 返回 stage_gate_blocked.
  // COMPLIANCE_MODE='passive' (TASK-003): effectiveMode 已经把 real_publish 覆盖成 webhook,
  // 所以 stage-gate 分支在 passive 模式下天然不可达 — 合规红线不依赖 stage gate 拦截.
  const stageMode = resolveEffectivePublisherMode();
  if (stageMode === 'dry_run') {
    return [true, 'dry_run_skipped', new Date(), null];
  }
  if (stageMode === 'real_publish' && isStageGateEnabled() && !isStageRealPublishReady()) {
    // H9 fix: publish 被 stage gate 拦截 (readiness 未绿), stdout-only 无 event — 加
    // fire-and-forget ObservabilityEvent 使 block 可追溯 (operator 可见哪条 readiness 未绿).
    void recordObservabilityEvent({
      event_type: 'publish_blocked_by_stage_gate',
      trace_id: intent.traceId ?? canonicalCommentId,
      comment_id: commentId,
      status: 'stage_gate_blocked',
      metadata: {
        drop_count: getObservabilityDropCount(),
      },
    }).catch((error: unknown) => {
      console.warn(
        JSON.stringify({
          level: 'warn',
          message: 'publish_blocked_by_stage_gate_event_record_failed',
          comment_id: commentId,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    });
    console.warn(
      JSON.stringify({
        level: 'warn',
        message: 'publish_blocked_by_stage_gate',
        drop_count: getObservabilityDropCount(),
        comment_id: commentId,
        trace_id: intent.traceId ?? canonicalCommentId,
        timestamp: new Date().toISOString(),
      }),
    );
    return [false, 'stage_gate_blocked', new Date(), null];
  }

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
    // COMPLIANCE_MODE='passive' (TASK-003): resolveEffectivePublisherMode 已把 real_publish
    // 覆盖成 webhook, dispatch 走 publishWebhook, 永不达 publishReal (合规红线).
    const mode = resolveEffectivePublisherMode();
    let result: [boolean, PublishReason, Date | null, Record<string, unknown> | null];

    switch (mode) {
      case 'dry_run':
        // 防御性: guard 已在入口拦截 dry_run, 此处理论不可达.
        result = [true, 'dry_run_skipped', new Date(), null];
        break;
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
        result = await publishReal(context, replyText, intent.traceId);
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
    // console.error logs the raw error object (operator-only, never persisted) for diagnosis.
    console.error(`[publisher] Publish failed for comment ${commentId}:`, error);

    const publishedAt = new Date();
    // BUG-006 + F3: store the normalized enum, not the raw error message (which can contain
    // upstream Bilibili response bodies / v_voucher / fetch URL fragments), in BOTH
    // publish_log.failure_reason and the antirisk signal metadata.error_message. Raw upstream
    // content MUST NOT be persisted to either audit column.
    const failureReason = normalizeFailureReason(error);

    try {
      const replyHash = createReplyHash(commentId, replyText);
      await safeCreatePublishLog({
        platform,
        canonical_comment_id: canonicalCommentId,
        comment_id: commentId,
        reply_hash: replyHash,
        source,
        status: 'failed',
        failure_reason: failureReason,
        published_at: publishedAt,
      });
    } catch (dbError) {
      // H5 F5 / H8 fix: bare catch 吞所有 publishLog 写失败 (SQLITE_BUSY/P2028/connection loss,
      // P2002 已在 safeCreatePublishLog 内 catch-as-duplicate). 加 fire-and-forget ObservabilityEvent
      // 使 silent swallow 可见 — 非 antirisk 信号 (publish_log 写失败非账号风控), 走 observation buffer.
      void recordObservabilityEvent({
        event_type: 'publish_log_record_failed',
        trace_id: intent.traceId ?? canonicalCommentId,
        comment_id: commentId,
        status: 'failed',
        metadata: {
          failure_reason: failureReason,
          db_error: dbError instanceof Error ? dbError.message : String(dbError),
        },
      }).catch((recordError: unknown) => {
        console.warn(
          JSON.stringify({
            level: 'warn',
            message: 'publish_log_record_failed_event_record_failed',
            comment_id: commentId,
            error: recordError instanceof Error ? recordError.message : String(recordError),
          }),
        );
      });
      console.error('[publisher] Failed to record publish log:', dbError);
    }

    // BUG-003: a NotConfiguredError (credentials unconfigured / decryption failure) is an
    // operator error, not an antirisk signal — short-circuit to 'not_configured' so the real
    // root cause surfaces instead of being masked as a generic publish_failed. Duck-typed by
    // name (not instanceof) for mock safety (see normalizeFailureReason).
    if (error instanceof Error && error.name === 'NotConfiguredError') {
      return [false, 'not_configured', publishedAt, null];
    }

    // L3 / coding spec: classify antirisk signal subclass (-352 behavior_anomaly /
    // -429 rate_limit) and persist synchronously via recordAntiriskSignal (fail-closed,
    // not buffered). On DB failure the rejection propagates so readiness flags red.
    const subclass = classifyAntiriskSubclass(error);
    if (subclass) {
      // persona_id attribution (TASK-002): read the active BilibiliCredential.name via
      // getActivePersonaName. persona_id = credential.name string, shared with the C-layer
      // @self detection gate. resolveActivePersonaId is fail-safe (null on any error, L7),
      // so the antirisk signal still records even if the persona lookup fails.
      const personaId = await resolveActivePersonaId();

      // A 层 backoff (TASK-004): apply per-persona backoff BEFORE recording the
      // antirisk signal so the persona is blocked for subsequent publishIntent calls
      // (cap 600s behavior_anomaly / 60s rate_limit, L6). applyBackoff writes its own
      // ObservabilityEvent {event_type:'backoff_applied'} (fail-closed) and never throws.
      // CRITICAL: this is ADD after TASK-001's classifyAntiriskSubclass dispatch — the
      // existing recordAntiriskSignal path below is preserved unchanged.
      await applyBackoff(personaId, subclass, intent.traceId ?? canonicalCommentId);

      await recordAntiriskSignal({
        event_type: 'antirisk_signal_detected',
        trace_id: intent.traceId ?? canonicalCommentId,
        comment_id: commentId,
        status: subclass,
        error_subclass: subclass,
        persona_id: personaId,
        // F3 (security): persist the normalized failure_reason enum (not the raw errorMsg)
        // to observabilityEvent.event_metadata — the raw message can carry upstream Bilibili
        // response bodies / v_voucher (third-party content), which MUST NOT be stored
        // verbatim in the audit log (same rationale as publish_log.failure_reason above).
        // errorMsg is retained for the operator-only console.error at the catch entry.
        metadata: { source, platform, error_message: failureReason },
      });
      return [false, 'rate_limited', publishedAt, null];
    }
    // F15 (review-odyssey 006): 返回 normalize 算出的 failureReason (非硬编码 publish_failed),
    // 保持 tuple reason 与 L733 写入 publish_log.failure_reason 一致 — 否则同一失败的
    // risk_flags.publish_reason/gateway_reason (消费 tuple) 与 publish_log.failure_reason 分类不同
    // (network_error 错误会被 caller 记为 publish_failed, 隐藏网络错误语义, 与 ISS-20260712-001 同类不一致)。
    return [false, failureReason, publishedAt, null];
  }
};
