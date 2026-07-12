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
import { getActivePersonaName } from './bilibili-runtime-config.js';
import { recordAntiriskSignal, getObservabilityDropCount } from './observability.js';
import { isPersonaInBackoff, applyBackoff } from './backoff-decision.js';
import { createHash } from 'node:crypto';

// ── Publisher mode configuration ───────────────────────────

// dry_run: stage 0 — no API call, no publish_log write, no enqueue (pure observation).
type PublisherMode = 'dry_run' | 'manual_queue' | 'simulated' | 'webhook' | 'real_publish';

function getPublisherMode(): PublisherMode {
  const mode = (process.env.PUBLISHER_MODE || 'manual_queue').trim().toLowerCase();
  if (['dry_run', 'manual_queue', 'simulated', 'webhook', 'real_publish'].includes(mode)) {
    return mode as PublisherMode;
  }
  return 'manual_queue';
}

// ── Stage gate (P3 warmup: 阶段门禁 guard) ────────────────
//
// real_publish 进阶前 MUST 校验 readiness 全绿 + observability drop_count=0
// (SC4: full real_publish 前 readiness 全绿 + drop_count=0 + 无 behavior_anomaly).
// fail-closed: 不满足返回 stage_gate_blocked, 不盲飞.
//
// STAGE_GATE_ENABLED (L1 env 隔离, 默认 false) 开启后 real_publish 走门禁校验;
// 关闭时维持既有行为 (legacy tests / 回退路径不受影响).
//
// MAINT-001 note: STAGE_REAL_PUBLISH_READY 是人工桥接 env (非机械派生) —
// 运营 MUST 仅在 readiness route 全绿时显式置 'true', readiness 翻红立即清零.
// 名称未含 _MANUAL/_ACK 是为保持 env 简短; 语义在此注释 + ISS-20260710-001 文档化.
// 长期 SME 介入后评估 DI 注入 isStageReady callback 替代 env 桥 (消除跨层隐式耦合).
// readiness 聚合通过此 env (避免直接 import readiness route 造成循环依赖, 见 risks).
function isStageGateEnabled(): boolean {
  return process.env.STAGE_GATE_ENABLED === 'true';
}

function isStageRealPublishReady(): boolean {
  return process.env.STAGE_REAL_PUBLISH_READY === 'true' && getObservabilityDropCount() === 0;
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
  // Fix-Don't-Hide: parseInt can return NaN on a non-numeric env value (e.g. 'abc' is
  // truthy so the `|| '3'` fallback does not apply), which would make the threshold
  // comparison always false and silently disable the circuit breaker (fail-open).
  // Guard with isFinite — invalid config keeps the documented default.
  const thresholdRaw = parseInt(process.env.PUBLISHER_CIRCUIT_FAILURE_THRESHOLD || '3', 10);
  const threshold = Number.isFinite(thresholdRaw) && thresholdRaw > 0 ? thresholdRaw : 3;
  if (breaker.failureCount >= threshold) {
    const openSecondsRaw = parseInt(process.env.PUBLISHER_CIRCUIT_OPEN_SECONDS || '30', 10);
    const openSeconds = Number.isFinite(openSecondsRaw) && openSecondsRaw > 0 ? openSecondsRaw : 30;
    breaker.openUntil = Date.now() + openSeconds * 1000;
    console.warn(
      `[publisher] Circuit breaker OPEN for platform=${platform} for ${openSeconds}s after ${breaker.failureCount} failures`,
    );
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

/**
 * BUG-006 (security): normalize a publish failure reason into a safe enum before persisting
 * it to publish_log.failure_reason (surfaced via admin gateway-logs routes). The raw thrown
 * Error.message can contain upstream Bilibili response bodies (e.g.
 * "Bilibili reply API error: 500: <raw upstream body>") or fetch URL fragments — third-party
 * content that must not be stored verbatim in the audit log. The raw message is still logged
 * to console.error (operator-only) and into the antirisk signal metadata for diagnosis.
 *
 * Classification mirrors the failure surface: not_configured (operator/credential error),
 * bilibili_api_error (non-2xx HTTP or Bilibili API reject), network_error (fetch-level),
 * publish_failed (anything else).
 */
function normalizeFailureReason(error: unknown): string {
  // BUG-003: duck-type NotConfiguredError by name (not instanceof) so the check still works
  // when the caller's module mock of bilibili-client does not re-export the class.
  if (error instanceof Error && error.name === 'NotConfiguredError') return 'not_configured';
  if (!(error instanceof Error)) return 'publish_failed';
  const message = error.message;
  if (message.startsWith('Bilibili reply API error:')) return 'bilibili_api_error';
  // F2: publishReal/publishSimulated re-throw -352 behavior_anomaly as
  // `-352 behavior_anomaly v_voucher=...` (publisher.ts:503/365). This is a Bilibili API
  // reject (the highest-severity antirisk code), so classify as bilibili_api_error — not
  // the generic publish_failed fallthrough. classifyAntiriskSubclass still routes it to
  // rate_limited + backoff downstream; this only fixes the publish_log audit classification.
  if (/-352|behavior_anomaly|v_voucher/i.test(message)) return 'bilibili_api_error';
  // fetch-level failures (AbortError, TypeError "fetch failed", DNS/network errors)
  // F2 (review-odyssey 004): 衡全 errno 族 — econn 前缀覆盖 econnreset/econnrefused/econnaborted,
  // eaddr 覆盖 eaddrinuse/eaddrnotavail (原正则漏 ECONNRESET 误分类为 publish_failed)。
  // F2 (review-odyssey 006): 补 ehostunreach/enetunreach/epipe/eai/enetreset — f74e00a 漏的同类 errno 族
  // (host/network unreachable + broken pipe + DNS EAI_AGAIN 临时失败 + ENETRESET 网络重置同属 fetch 层
  // 网络失败, 误分类 publish_failed 会污染 real_publish throw 路径的 publish_log.failure_reason enum,
  // 隐藏 network_error 语义)。eai 前缀覆盖 eai_again/eai_nodata 等 getaddrinfo 族。
  if (error.name === 'AbortError' || error.name === 'TypeError' || /fetch failed|network|econn|enotfound|etimedout|eaddr|ehostunreach|enetunreach|epipe|eai|enetreset/i.test(message)) {
    return 'network_error';
  }
  return 'publish_failed';
}

// ── Mock injection for the simulated stage (P3 warmup / L7) ──
//
// PUBLISHER_SIMULATED_RESPONSES drives the mock PostReplyResult injected into
// postReply via config.mockPostReplyResult when PUBLISHER_MODE=simulated. Lets the
// simulated stage emit -352 behavior_anomaly (or success) responses end-to-end
// through classifyAntiriskSubclass → applyBackoff for online eval, WITHOUT touching
// the real Bilibili API. Format: `error_code:-352,v_voucher:voucher_xxx` or
// `success:true,rpid:mock_123`. Unset → publishSimulated keeps the legacy
// "simulate success" behavior (backward compatible).
//
// Fail-closed: malformed env throws (not silently ignored) per risk mitigation.
type MockPostReplyResult = {
  success?: boolean;
  rpid?: string;
  error_code?: number;
  v_voucher?: string;
};

function parseMockFromEnv(): MockPostReplyResult | undefined {
  const raw = process.env.PUBLISHER_SIMULATED_RESPONSES;
  if (!raw || !raw.trim()) return undefined;

  const mock: MockPostReplyResult = {};
  for (const pair of raw.split(',')) {
    const sep = pair.indexOf(':');
    if (sep <= 0) {
      throw new Error(`PUBLISHER_SIMULATED_RESPONSES invalid pair (expected key:value): ${pair}`);
    }
    const key = pair.slice(0, sep).trim();
    const value = pair.slice(sep + 1).trim();
    if (!key) {
      throw new Error(`PUBLISHER_SIMULATED_RESPONSES empty key in pair: ${pair}`);
    }
    if (key === 'success') {
      mock.success = value === 'true';
    } else if (key === 'rpid') {
      mock.rpid = value;
    } else if (key === 'error_code') {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isFinite(parsed)) {
        throw new Error(`PUBLISHER_SIMULATED_RESPONSES error_code not finite: ${value}`);
      }
      mock.error_code = parsed;
    } else if (key === 'v_voucher') {
      mock.v_voucher = value;
    } else {
      throw new Error(`PUBLISHER_SIMULATED_RESPONSES unknown key: ${key}`);
    }
  }
  return mock;
}

/**
 * Antirisk error subclass classifier (coding spec: 错误码352须解析v_voucher子类分流).
 *
 * Bilibili -352 → behavior_anomaly (退避 cap 600s); HTTP 429 / generic rate limit → rate_limit (cap 60s).
 * Inspects the error message/code for known signals. Returns null when the error
 * is not an antirisk signal (then it flows through the normal publish_failed path).
 */
export type AntiriskSubclass = 'behavior_anomaly' | 'rate_limit';

export function classifyAntiriskSubclass(error: unknown): AntiriskSubclass | null {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : String(error ?? '');
  const lower = message.toLowerCase();
  const code = (error as { code?: unknown })?.code;

  // -352 behavior_anomaly (Bilibili risk-control). Also match the v_voucher /
  // behavior_anomaly markers per coding spec.
  if (message.includes('-352') || code === -352 || lower.includes('behavior_anomaly') || lower.includes('v_voucher')) {
    return 'behavior_anomaly';
  }

  // -429 / HTTP 429 / generic rate limit.
  if (
    message.includes('-429') ||
    code === -429 ||
    lower.includes('429') ||
    lower.includes('rate_limit') ||
    lower.includes('rate limit') ||
    lower.includes('rate-limited') ||
    lower.includes('ratelimited')
  ) {
    return 'rate_limit';
  }

  return null;
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
async function resolveActivePersonaId(): Promise<string | null> {
  try {
    return await getActivePersonaName();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
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
 * simulated mode: Simulate a publish. Default behavior (no PUBLISHER_SIMULATED_RESPONSES)
 * records a 'published' row without calling the API (backward compatible).
 *
 * When PUBLISHER_SIMULATED_RESPONSES is set (P3 warmup / L7), inject a mock
 * PostReplyResult via postReply's config.mockPostReplyResult short-circuit (no fetch).
 * If the mock yields -352 behavior_anomaly, throw so publishIntentWithResult's catch
 * path runs classifyAntiriskSubclass → applyBackoff (reuses the publishReal -352 throw
 * path, end-to-end online eval for the simulated stage).
 */
async function publishSimulated(
  context: PublishLogContext,
  replyText: string,
): Promise<[boolean, string, Date | null, Record<string, unknown> | null]> {
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
async function publishWebhook(
  commentId: string,
  replyText: string,
): Promise<[boolean, string, Date | null, Record<string, unknown> | null]> {
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
      return [
        false,
        response.status >= 500 ? '5xx' : 'publish_failed',
        now,
        { webhook_http_status: response.status },
      ];
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
async function publishReal(
  context: PublishLogContext,
  replyText: string,
): Promise<[boolean, string, Date | null, Record<string, unknown> | null]> {
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

  // A 层 backoff intercept (TASK-004): resolve the active persona and short-circuit
  // when that persona is currently in backoff (per-persona isolation, L5). Returns the
  // tuple [false, 'backoff_active', date, null] — does NOT throw (L7 tuple contract),
  // so BullMQ retry is not triggered and the in-flight job simply fails this attempt.
  // persona_id is read via resolveActivePersonaId (TASK-002 source, fail-safe null on
  // any error). A null persona_id never enters backoff (isPersonaInBackoff returns false).
  const backoffPersonaId = await resolveActivePersonaId();
  if (isPersonaInBackoff(backoffPersonaId)) {
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
  const stageMode = getPublisherMode();
  if (stageMode === 'dry_run') {
    return [true, 'dry_run_skipped', new Date(), null];
  }
  if (stageMode === 'real_publish' && isStageGateEnabled() && !isStageRealPublishReady()) {
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
    const mode = getPublisherMode();
    let result: [boolean, string, Date | null, Record<string, unknown> | null];

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
