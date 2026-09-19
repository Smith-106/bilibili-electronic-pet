/**
 * Publisher mode implementations (manual_queue / simulated / webhook / real_publish).
 * Extracted from publisher.ts (pure extraction — behavior unchanged).
 */

import type { PublishReason } from '../domain/publish/types.js';
import { prisma as getPrisma } from './db-queries.js';
import { postReply, verifyReplyVisible } from './bilibili-client.js';
import { loadBilibiliRuntimeConfig } from './bilibili-runtime-config.js';
import { recordAntiriskSignal, recordObservabilityEvent } from './observability.js';
import { applyBackoff } from './backoff-decision.js';
import { checkPersonaRateLimit } from './persona-token-bucket.js';
import { isPublishLogStorageError, normalizeFailureReason, parseMockFromEnv, classifyAntiriskSubclass } from './publisher-failure.js';
import {
  safeCreatePublishLog,
  createReplyHash,
  resolveActivePersonaId,
  type PublishLogContext,
} from './publisher-store.js';

type PublishTuple = [boolean, PublishReason, Date | null, Record<string, unknown> | null];

/**
 * manual_queue mode: Record job for human review
 */
export async function publishManualQueue(
  context: PublishLogContext,
  replyText: string,
): Promise<PublishTuple> {
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
 * simulated mode: Simulate a publish. Default behavior (no PUBLISHER_SIMULATED_RESPONSES)
 * records a 'published' row without calling the API (backward compatible).
 *
 * When PUBLISHER_SIMULATED_RESPONSES is set (P3 warmup / L7), inject a mock
 * PostReplyResult via postReply's config.mockPostReplyResult short-circuit (no fetch).
 * If the mock yields -352 behavior_anomaly, throw so publishIntentWithResult's catch
 * path runs classifyAntiriskSubclass → applyBackoff (reuses the publishReal -352 throw
 * path, end-to-end online eval for the simulated stage).
 */
export async function publishSimulated(
  context: PublishLogContext,
  replyText: string,
): Promise<PublishTuple> {
  const mock = parseMockFromEnv();
  if (mock) {
    // Mock injection: postReply short-circuits on config.mockPostReplyResult (no fetch).
    // On -352, throw to route through classifyAntiriskSubclass → applyBackoff (mirrors
    // publishReal -352 throw path) so the simulated stage can exercise the full
    // antirisk chain end-to-end.
    const result = await postReply(context.commentId, replyText, { mockPostReplyResult: mock });
    if (!result.success && result.error_code === -352) {
      throw new Error(`-352 behavior_anomaly v_voucher=${result.v_voucher ?? ''}`);
    }
    // Non-352 mock failure (e.g. success:false without -352): MUST NOT fall through to
    // record status:'published' — that would silently flip a mock-declared failure into a
    // success publish_log row (state inconsistency, pollutes drop_count/quota eval).
    // Return a distinct non-published tuple instead. L7 tuple contract (no throw).
    if (!result.success) {
      return [false, 'simulated_mock_failed', new Date(), { error_code: result.error_code ?? null }];
    }
    // success:true mock: fall through to record the simulated publish.
  }

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
export async function publishWebhook(
  commentId: string,
  replyText: string,
): Promise<PublishTuple> {
  const webhookUrl = process.env.PUBLISHER_WEBHOOK_URL;
  const webhookToken = process.env.PUBLISHER_WEBHOOK_TOKEN;
  // Fix-Don't-Hide: parseInt('abc') === NaN, so the `|| '15'` fallback does not apply to a
  // non-numeric env value. AbortSignal.timeout(NaN) throws RangeError synchronously, which
  // would surface as a misleading `webhook_error` instead of a clean config error. Guard with
  // isFinite — invalid config keeps the documented 15s default.
  // review-odyssey 002: 加上界 300 (5min, webhook 单次超时封顶, 防挂起 × 重试长期阻塞 worker,
  // 与 llm-client timeoutMs 上界守护同标准)。
  const timeoutRaw = parseInt(process.env.PUBLISHER_TIMEOUT_SECONDS || '15', 10);
  const timeoutSeconds = Number.isFinite(timeoutRaw) && timeoutRaw > 0 && timeoutRaw <= 300 ? timeoutRaw : 15;
  const timeout = timeoutSeconds * 1000;
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
      // F1 (review-odyssey 004, fix-completeness): HTTP 非 2xx 是 L7 tuple-return 失败路径,
      // 与 catch 路径一样 MUST 走 normalize 收敛 (spec S-20260711-x96s)。status 是安全 number
      // 但 `webhook_http_${status}` 非 enum, queue 路径会原样持久化到 risk_flags 破坏 enum 一致性。
      // 5xx → '5xx' (STANDARD enum, 可重试 channel failure), 4xx → 'publish_failed' (client 配置错)。
      // status 保留进 metadata 供 operator 诊断, 不进 reason enum。
      console.error(`[publisher] webhook HTTP ${response.status}`);
      return [false, response.status >= 500 ? '5xx' : 'publish_failed', now, { webhook_http_status: response.status }];
    }

    const data = await response.json();
    return [true, 'webhook_published', now, { webhook_response: data }];
  } catch (error) {
    // F1 (review-odyssey 003, fix-completeness): webhook catch 走与 publishReal/publishIntentWithResult
    // catch 同一的 normalizeFailureReason 收敛为 enum, raw error.message (可含 webhook 主机名/URL 片段)
    // 仅留 console.error (operator-only), 不进 event_metadata/risk_flags durable 列 (spec S-20260711-9n3j)。
    console.error('[publisher] webhook publish failed:', error);
    return [false, normalizeFailureReason(error), now, null];
  }
}

/**
 * real_publish mode: Post reply via Bilibili API
 *
 * On a structured API failure (e.g. -352 behavior_anomaly), postReply now
 * surfaces `error_code` + `v_voucher` instead of swallowing to a bare
 * {success:false}. When the error code is an antirisk signal, we throw an
 * Error carrying the v_voucher so publishIntentWithResult's catch path
 * classifies it via classifyAntiriskSubclass and records the antirisk signal.
 */
export async function publishReal(
  context: PublishLogContext,
  replyText: string,
  traceId?: string,
): Promise<PublishTuple> {
  // STAGE_DAILY_QUOTA (P3 warmup): limited real_publish 配额 env, 区分 limited/full.
  // 当日 publishLog status='published' count >= STAGE_DAILY_QUOTA → stage_quota_exceeded.
  // fail-closed, 不盲飞 (L1 配额 env). 默认 10 (保守值, 运营调参).
  // CORR-003 fix: env 显式设为非数字 (如 'abc') 时 fail-closed 返回 stage_quota_misconfigured,
  // 不静默跳过配额守卫 (fail-open 无限发布违背 L1). env 未设走默认 10.
  const rawQuota = process.env.STAGE_DAILY_QUOTA;
  const dailyQuota = rawQuota === undefined ? 10 : parseInt(rawQuota, 10);
  if (!Number.isFinite(dailyQuota) || dailyQuota < 0) {
    return [false, 'stage_quota_misconfigured', new Date(), null];
  }
  {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    let todayPublished = 0;
    try {
      const prisma = getPrisma();
      todayPublished = await prisma.publishLog.count({
        where: {
          source: 'real_publish',
          status: 'published',
          published_at: { gte: startOfDay },
        },
      });
    } catch (error) {
      if (!isPublishLogStorageError(error)) {
        throw error;
      }
    }
    if (todayPublished >= dailyQuota) {
      return [false, 'stage_quota_exceeded', new Date(), null];
    }
  }

  const result = await postReply(context.commentId, replyText);
  const publishedAt = new Date();

  if (!result.success) {
    const replyHash = createReplyHash(context.commentId, replyText);

    // ISS-20260709-005: surface -352 behavior_anomaly (and any antirisk-classified
    // error_code) to the publishIntentWithResult catch path so classifyAntiriskSubclass
    // can record the signal and apply the behavior_anomaly backoff cap.
    if (result.error_code !== undefined) {
      const codeProbe = { code: result.error_code, message: `-${result.error_code}` };
      if (result.error_code === -352 || classifyAntiriskSubclass(codeProbe)) {
        const voucher = result.v_voucher ?? '';
        throw new Error(`-352 behavior_anomaly v_voucher=${voucher}`);
      }
    }

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

  // TASK-002/D1: post-publish visibility self-check. postReply returned a real rpid, but the
  // platform may have silently shadowbanned the reply (Avalon 阿瓦隆风控 ShadowBan 8-state —
  // the reply is accepted with 200 + rpid yet never appears in the public comment list). Probe
  // the comment list via verifyReplyVisible to close the platform-side semantic gap: a
  // publish_success MUST mean the reply is actually visible, not just accepted.
  //
  // C-008: the probe shares the C-layer persona token bucket (capacity 20 / refill 20-min) —
  // checkPersonaRateLimit consumes 1 token so the probe counts against the publish quota (a
  // probe-heavy loop leaves fewer tokens for real publishing). A null persona never consumes
  // (checkPersonaRateLimit fail-open on null). The probe runs regardless of the rate-limit
  // verdict: the publish already succeeded, withholding the visibility check would hide a
  // shadowban — the token accounting is the budget signal, not a probe gate.
  const probePersonaId = await resolveActivePersonaId();
  checkPersonaRateLimit(probePersonaId);

  const probeConfig = await loadBilibiliRuntimeConfig();
  // Visibility probe outcome — default fail-open ('probe_failed' with reason 'config_unavailable')
  // when the runtime config could not be reloaded: the publish itself succeeded (postReply
  // surfaced the rpid), so a config-reload gap MUST NOT flip this to shadowbanned (C-004
  // fail-open). Only a successful dual-view probe that finds the rpid absent in BOTH views
  // is classified shadowbanned (fail-closed).
  let visibilityStatus: 'visible' | 'shadowbanned' | 'probe_failed' = 'probe_failed';
  let visibilityProbeMethod: 'sender_cookie' | 'seek_rpid' | null = null;
  let visibilityReason: string | null = 'config_unavailable';
  if (probeConfig) {
    const probeResult = await verifyReplyVisible(result.rpid, context.commentId, probeConfig);
    visibilityStatus = probeResult.status;
    visibilityProbeMethod = probeResult.probe_method;
    visibilityReason = probeResult.reason ?? null;
  }

  // Map the probe verdict to the PublishLog row. Reuses the existing `status` column to carry
  // the visibility_status value (status='shadowbanned' on a confirmed shadowban; 'published'
  // otherwise) + `failure_reason` for the probe_method/detail — ZERO schema migration
  // (C-002/ZM-001: no new ReplyVisibilityLog model, no metadata JSON column added; the
  // visibility_status semantic rides on the existing status enum). The ObservabilityEvent
  // side of the double-write (event_type='reply_visibility_check') is persisted below only
  // for the shadowbanned verdict (antirisk signal path) per C-004 — probe_failed is fail-open
  // and records NO antirisk signal (only this PublishLog row + a normal observability event).
  const publishLogStatus =
    visibilityStatus === 'shadowbanned'
      ? 'shadowbanned'
      : visibilityStatus === 'probe_failed'
        ? 'published' // publish succeeded; probe faulted — keep 'published', record detail in failure_reason
        : 'published';
  const publishLogFailureReason =
    visibilityStatus === 'shadowbanned'
      ? `shadowbanned:${visibilityProbeMethod ?? 'unknown'}`
      : visibilityStatus === 'probe_failed'
        ? `probe_failed:${visibilityReason ?? 'unknown'}`
        : null;

  await safeCreatePublishLog({
    platform: context.platform,
    canonical_comment_id: context.canonicalCommentId,
    comment_id: context.commentId,
    reply_hash: replyHash,
    source: context.source,
    // visibility_status (TASK-002/D1): 'shadowbanned' on a confirmed shadowban, else 'published'.
    status: publishLogStatus,
    published_at: publishedAt,
    failure_reason: publishLogFailureReason,
  });

  // C-002/C-004 double-write: only a confirmed shadowbanned verdict records an antirisk
  // signal (event_type='reply_visibility_check', error_subclass='shadowban') + applies the
  // A-layer 600s backoff (mirrors behavior_anomaly cap). probe_failed records NOTHING here
  // (fail-open — a transient probe glitch must not trip 600s backoff / readiness red); the
  // visible verdict records a normal fire-and-forget observability event for online eval.
  if (visibilityStatus === 'shadowbanned') {
    // applyBackoff writes its own ObservabilityEvent {event_type:'backoff_applied'} with
    // error_subclass='shadowban' (fail-closed, never throws) — TASK-004 A-layer seam.
    // H2 fix: applyBackoff (内部含 recordAntiriskSignal 写 backoff_applied) 与本处
    // recordAntiriskSignal (写 reply_visibility_check) 是两条独立 antirisk signal, 各自
    // fail-closed (recordAntiriskSignal 内部 catch 不抛). Promise.all 并行省 1 个串行 DB
    // round-trip, 仍同步 await 完成 — 守 LD-04 (antirisk signal MUST 同步持久化, 非移 fire-and-forget).
    await Promise.all([
      applyBackoff(probePersonaId, 'shadowban', traceId ?? context.canonicalCommentId),
      recordAntiriskSignal({
        event_type: 'reply_visibility_check',
        trace_id: traceId ?? context.canonicalCommentId,
        comment_id: context.commentId,
        status: 'shadowbanned',
        error_subclass: 'shadowban',
        persona_id: probePersonaId,
        metadata: {
          visibility_status: 'shadowbanned',
          probe_method: visibilityProbeMethod ?? 'unknown',
          rpid: result.rpid,
          reason: visibilityReason ?? 'rpid_absent',
        },
      }),
    ]);
    // Fail-closed tuple: the publish is not actually visible, so surface failure (not
    // 'published') so the catch path / circuit breaker / readiness all reflect the truth.
    // Does NOT throw (L7 tuple contract) — publishIntentWithResult returns this tuple and
    // classifyAntiriskSubclass is NOT re-invoked (the antirisk signal was already recorded
    // inline above, the backoff already applied).
    return [false, 'shadowbanned', publishedAt, { new_rpid: result.rpid, visibility: visibilityStatus }];
  }

  // visible / probe_failed: record a normal observability event (fire-and-forget) for online
  // eval of the visibility-probe pass rate. NOT an antirisk signal.
  void recordObservabilityEvent({
    event_type: 'reply_visibility_check',
    trace_id: traceId ?? context.canonicalCommentId,
    comment_id: context.commentId,
    status: visibilityStatus,
    metadata: {
      visibility_status: visibilityStatus,
      probe_method: visibilityProbeMethod ?? 'unknown',
      rpid: result.rpid,
      reason: visibilityReason,
    },
  }).catch((error: unknown) => {
    // Fire-and-forget failure must not break the publish tuple (mirrors recordObservabilityEvent
    // containment in observability.ts). Log only.
    console.warn(
      JSON.stringify({
        level: 'warn',
        message: 'reply_visibility_check_record_failed',
        trace_id: traceId ?? context.canonicalCommentId,
        comment_id: context.commentId,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  });

  if (visibilityStatus === 'probe_failed') {
    // Fail-open: publish succeeded, probe faulted. Return published (not 'published_visible'
    // to avoid a status enum explosion — the probe detail is in failure_reason). Keep the
    // success tuple so the publish pipeline proceeds; the probe detail is auditable.
    return [true, 'published', publishedAt, { new_rpid: result.rpid, visibility: 'probe_failed' }];
  }

  return [true, 'published', publishedAt, { new_rpid: result.rpid, visibility: 'visible' }];
}
