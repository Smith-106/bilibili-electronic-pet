import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

import {
  buildGatewayPublishIntent,
  buildPlatformPublishIntent,
  resolveCommentReplyIntentParts,
} from '../../domain/publish/comment-reply-intent.js';
import { getPrisma } from '../../lib/prisma.js';
import { publishViaSidecarWebhook } from '../../platforms/sidecar-webhook.js';
import { postReply } from '../../services/bilibili-client.js';
import type {
  PublishExecutionResult,
  PublishFinalizeInput,
  PublishGatewayInput,
  PublishPlatformInput,
  PublishReservationInput,
  ReservePublishLogResult,
  RuntimeSettings,
} from '../contracts.js';
import { stableStringify } from '../normalizers.js';
import { normalizePublishMode } from '../runtime-platform.js';

const STANDARD_PUBLISH_FAILURE_REASONS = new Set([
  'timeout',
  '5xx',
  'auth',
  'invalid_response',
  'network_error',
  'not_configured',
  'webhook_not_configured',
  'sidecar_webhook_not_configured',
  'platform_disabled',
  'bilibili_reference_adapter_only',
  'bilibili_not_configured',
  'bilibili_api_error',
  'publish_failed',
  'stage_quota_exceeded',
  'stage_quota_misconfigured',
  'runtime_credentials_required',
]);
const TIMEOUT_HINTS = ['timeout', 'timedout', 'readtimeout', 'connecttimeout'];
// 与 publisher.ts normalizeFailureReason (L218-224) NETWORK 分支对齐 — gateway HTTP 路径
// webhook fetch 失败 (主机宕/DNS/AbortError) 的 error.message 含 fetch failed/econn/enotfound
// 等, MUST 命中 network_error 而非 fallback invalid_response, 否则与 worker 路径 enum 漂移
// (worker 产 network_error, gateway 产 invalid_response), publish_log.failure_reason 在两条
// 路径间不一致, 在线 eval 统计失真. errno 族衡全 (review-odyssey 006 同源补全).
const NETWORK_HINTS = [
  'fetch failed',
  'network',
  'econn',
  'enotfound',
  'etimedout',
  'eaddr',
  'ehostunreach',
  'enetunreach',
  'epipe',
  'eai',
  'enetreset',
  'abort', // AbortError (AbortSignal.timeout 触发)
];
const AUTH_HINTS = ['401', '403', 'unauthorized', 'forbidden', 'token', 'signature', 'auth'];
// 与 publisher.ts normalizeFailureReason (L204/210) 对齐 — Bilibili API reject (非 2xx HTTP
// 或 -352 behavior_anomaly 风控) 是最高严重度 antirisk code, MUST 先于 5xx/auth 识别, 否则
// "Bilibili reply API error: 500" 会被 5xx 吞, "-352 behavior_anomaly" 会落 invalid_response,
// 丢失风控语义. gateway-publish HTTP 路径 defaultPublishGatewayReply real_publish catch 产出
// error.message 原文 (default-dependencies.ts L586), 经此归一化写入 publish_log.failure_reason.
const BILIBILI_API_ERROR_HINTS = ['bilibili reply api error', '-352', 'behavior_anomaly', 'v_voucher'];

export function defaultVerifyPayloadSignature(
  payload: Record<string, unknown>,
  secret: string,
  signature: string,
): boolean {
  const canonical = stableStringify(payload);
  const expected = createHmac('sha256', secret).update(canonical, 'utf8').digest();

  const normalizedSignature = String(signature).trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalizedSignature)) {
    return false;
  }

  const actual = Buffer.from(normalizedSignature, 'hex');
  return timingSafeEqual(expected, actual);
}

export function defaultNormalizePublishFailureReason(reason: string | undefined): string {
  const normalized = String(reason ?? '')
    .trim()
    .toLowerCase();
  if (!normalized) {
    return 'invalid_response';
  }
  if (STANDARD_PUBLISH_FAILURE_REASONS.has(normalized)) {
    return normalized;
  }
  if (TIMEOUT_HINTS.some((hint) => normalized.includes(hint))) {
    return 'timeout';
  }
  if (BILIBILI_API_ERROR_HINTS.some((hint) => normalized.includes(hint))) {
    return 'bilibili_api_error';
  }
  if (NETWORK_HINTS.some((hint) => normalized.includes(hint))) {
    return 'network_error';
  }
  if (/(^|\D)5\d\d(\D|$)/.test(normalized)) {
    return '5xx';
  }
  if (AUTH_HINTS.some((hint) => normalized.includes(hint))) {
    return 'auth';
  }
  if (normalized.includes('webhook_not_configured')) {
    return 'webhook_not_configured';
  }
  if (normalized.includes('sidecar') && normalized.includes('not_configured')) {
    return 'sidecar_webhook_not_configured';
  }
  if (normalized.includes('reference_adapter_only')) {
    return 'bilibili_reference_adapter_only';
  }
  if (normalized.includes('runtime_credentials_required')) {
    return 'runtime_credentials_required';
  }
  if (normalized.includes('publish_failed')) {
    return 'publish_failed';
  }
  return 'invalid_response';
}

/**
 * Gateway HTTP publish reply — executes the publish intent via the mode selected
 * by `settings.publisherMode` (normalizePublishMode). Branch semantics:
 * - `manual_queue`: returns pending_review (no publish, queued for admin approval)
 * - `simulated`: returns published=true (dry-run, no side effects)
 * - `webhook`: POSTs to PUBLISHER_WEBHOOK_URL with AbortSignal.timeout (env
 *   PUBLISHER_TIMEOUT_SECONDS, default 15s, aligned with publisher.ts worker path).
 *   non-2xx → `webhook_http_${status}`; catch → error.message (caller normalizes).
 * - `native_bilibili`/`real_publish`: calls postReply; structured failure surfaces
 *   error_code as `bilibili_error_${code}` (caller maps to bilibili_api_error).
 * Failure events are emitted by the caller (gateway-publish.ts) via
 * recordObservabilityEvent — this function is a pure execution primitive with no
 * deps injection, so observability stays at the route layer (H9 pattern).
 */
export async function defaultPublishGatewayReply(
  settings: RuntimeSettings,
  input: PublishGatewayInput,
): Promise<PublishExecutionResult> {
  const normalizedMode = normalizePublishMode(settings.publisherMode);
  const publishedAt = new Date();
  const intent = buildGatewayPublishIntent(input);
  const { commentId, replyText } = resolveCommentReplyIntentParts(intent);

  if (normalizedMode === 'manual_queue') {
    return {
      published: true,
      reason: 'manual_queued',
      publishedAt,
      status: 'pending_review',
    };
  }

  if (normalizedMode === 'simulated') {
    return {
      published: true,
      reason: 'simulated',
      publishedAt,
      status: 'published',
    };
  }

  if (normalizedMode === 'webhook') {
    const webhookUrl = process.env.PUBLISHER_WEBHOOK_URL;
    const webhookToken = process.env.PUBLISHER_WEBHOOK_TOKEN;
    // Fix-Don't-Hide + 与 publisher.ts:538 worker webhook 路径对齐 — gateway HTTP 路径 webhook fetch
    // 原无超时, 主机宕/DNS 失败时 fetch 挂起致 caller (gateway-publish) 等不到结果 → BullMQ
    // stall → redeliver → double-publish 窗口 (reliability F1). 复用同源 PUBLISHER_TIMEOUT_SECONDS
    // env (默认 15s, 上界 300s), NaN/越界守护与 publisher.ts 一致 (AbortSignal.timeout(NaN) 抛 RangeError).
    const timeoutRaw = Number.parseInt(process.env.PUBLISHER_TIMEOUT_SECONDS || '15', 10);
    const timeoutSeconds = Number.isFinite(timeoutRaw) && timeoutRaw > 0 && timeoutRaw <= 300 ? timeoutRaw : 15;

    if (!webhookUrl) {
      return { published: false, reason: 'webhook_not_configured', status: 'failed' };
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhookToken ? { Authorization: `Bearer ${webhookToken}` } : {}),
        },
        body: JSON.stringify({
          comment_id: commentId,
          reply_text: replyText,
          force_publish: input.forcePublish,
          source: intent.source,
          trace_id: intent.traceId,
        }),
        signal: AbortSignal.timeout(timeoutSeconds * 1000),
      });

      if (!response.ok) {
        return {
          published: false,
          reason: `webhook_http_${response.status}`,
          publishedAt,
          status: 'failed',
        };
      }

      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const resolvedPublishedAt =
        typeof payload.published_at === 'string' && payload.published_at ? new Date(payload.published_at) : publishedAt;

      return {
        published: payload.published !== false,
        reason: typeof payload.reason === 'string' && payload.reason ? payload.reason : 'webhook_published',
        publishedAt: resolvedPublishedAt,
        status: payload.published === false ? 'failed' : 'published',
      };
    } catch (error) {
      return {
        published: false,
        reason: error instanceof Error ? error.message : 'webhook_failed',
        publishedAt,
        status: 'failed',
      };
    }
  }

  if (normalizedMode === 'native_bilibili' || normalizedMode === 'real_publish') {
    if (!settings.bilibiliEnabled || !settings.bilibiliPublishEnabled) {
      return {
        published: false,
        reason: 'bilibili_not_configured',
        publishedAt,
        status: 'failed',
      };
    }

    let result: { success: boolean; rpid: string; error_code?: number; v_voucher?: string };
    try {
      result = await postReply(commentId, replyText);
    } catch (error) {
      return {
        published: false,
        reason: error instanceof Error ? error.message : 'publish_failed',
        publishedAt,
        status: 'failed',
      };
    }
    if (!result.success) {
      return {
        published: false,
        reason: result.error_code !== undefined ? `bilibili_error_${result.error_code}` : 'publish_failed',
        publishedAt,
        status: 'failed',
      };
    }

    return {
      published: true,
      reason: 'published',
      publishedAt,
      status: 'published',
    };
  }

  return {
    published: false,
    reason: 'not_configured',
    status: 'failed',
  };
}

export async function defaultPublishPlatformReply(input: PublishPlatformInput): Promise<PublishExecutionResult> {
  const intent = buildPlatformPublishIntent(input);
  const { commentId, replyText, platform, canonicalId, route } = resolveCommentReplyIntentParts(intent);

  if (platform === 'bilibili') {
    return { published: false, reason: 'bilibili_reference_adapter_only', status: 'failed' };
  }

  const result = await publishViaSidecarWebhook({
    platform: input.platform,
    commentId,
    canonicalId,
    targetKind: intent.target.targetKind,
    route,
    replyText,
    forcePublish: input.forcePublish,
    traceId: input.traceId,
  });

  if (!result.published && result.reason === 'not_configured') {
    return {
      ...result,
      reason: 'sidecar_webhook_not_configured',
      status: 'failed',
    };
  }

  return {
    ...result,
    status: result.published ? 'published' : 'failed',
  };
}

export function isMissingReservationKeyColumnError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const normalized = error.message.toLowerCase();
  return normalized.includes('no such column') && normalized.includes('reservation_key');
}

/**
 * Durable publish-log store — reservation/finalize with TOCTOU-safe dedupe.
 *
 * `reserve`: idempotent reservation keyed by the unique index
 * `uq_publish_logs_canonical_reply(canonical_comment_id, reply_hash)`. Returns
 * `{duplicate:true, reservationKey}` if a row already exists (dedupe success),
 * otherwise creates a pending row and returns `{duplicate:false, reservationKey}`.
 * 4-layer fallback path handles (1) missing `reservation_key` column (legacy schema
 * → findFirst fallback), (2) P2002 on create (TOCTOU race → findUnique conflict
 * resolution), (3) missing-column retry, (4) final conflict lookup. Each layer
 * preserves the unique-index-as-row-lock guarantee (unique index is the dedupe
 * source of truth, not a SELECT-then-CREATE window).
 *
 * `finalize`: updates the reserved row by `reservation_key` to its terminal
 * status/failure_reason/published_at, then nulls the reservation_key. Swallows
 * only `isMissingReservationKeyColumnError` (legacy schema); other errors rethrow.
 */
export function createDurablePublishLogStore() {
  return {
    async reserve(input: PublishReservationInput): Promise<ReservePublishLogResult> {
      const prisma = getPrisma();
      let existing;
      try {
        existing = await prisma.publishLog.findUnique({
          where: {
            uq_publish_logs_canonical_reply: {
              canonical_comment_id: input.canonicalCommentId,
              reply_hash: input.replyHash,
            },
          },
          select: {
            id: true,
            reservation_key: true,
          },
        });
      } catch (error) {
        if (!isMissingReservationKeyColumnError(error)) {
          throw error;
        }
        existing = await prisma.publishLog.findFirst({
          where: {
            canonical_comment_id: input.canonicalCommentId,
            reply_hash: input.replyHash,
          },
          select: {
            id: true,
          },
        });
      }
      if (existing) {
        const existingWithReservationKey = existing as { id: number; reservation_key?: string | null };
        return {
          duplicate: true,
          reservationKey: existingWithReservationKey.reservation_key ?? `publish-log:${existing.id}`,
        };
      }

      const reservationKey = `publish-log:${randomUUID()}`;
      try {
        await prisma.publishLog.create({
          data: {
            platform: input.platform,
            reservation_key: reservationKey,
            canonical_comment_id: input.canonicalCommentId,
            comment_id: input.commentId,
            reply_hash: input.replyHash,
            source: input.source,
            status: 'pending',
            published_at: null,
            failure_reason: null,
          },
        });
      } catch (error) {
        const fallbackConflict = async () => {
          const conflict = await prisma.publishLog.findFirst({
            where: {
              canonical_comment_id: input.canonicalCommentId,
              reply_hash: input.replyHash,
            },
            select: { id: true },
          });
          if (conflict) {
            return {
              duplicate: true,
              reservationKey: `publish-log:${conflict.id}`,
            };
          }
          throw error;
        };

        if (isMissingReservationKeyColumnError(error)) {
          try {
            await prisma.publishLog.create({
              data: {
                platform: input.platform,
                canonical_comment_id: input.canonicalCommentId,
                comment_id: input.commentId,
                reply_hash: input.replyHash,
                source: input.source,
                status: 'pending',
                published_at: null,
                failure_reason: null,
              },
            });
            return { duplicate: false, reservationKey };
          } catch (retryError) {
            if (isMissingReservationKeyColumnError(retryError)) {
              return fallbackConflict();
            }
            throw retryError;
          }
        }

        const conflict = await prisma.publishLog.findUnique({
          where: {
            uq_publish_logs_canonical_reply: {
              canonical_comment_id: input.canonicalCommentId,
              reply_hash: input.replyHash,
            },
          },
          select: {
            id: true,
            reservation_key: true,
          },
        });
        if (conflict) {
          return {
            duplicate: true,
            reservationKey: conflict.reservation_key ?? `publish-log:${conflict.id}`,
          };
        }
        throw error;
      }

      return { duplicate: false, reservationKey };
    },
    async finalize(input: PublishFinalizeInput): Promise<void> {
      const prisma = getPrisma();
      try {
        await prisma.publishLog.updateMany({
          where: { reservation_key: input.reservationKey },
          data: {
            status: input.status,
            source: input.source,
            failure_reason: input.failureReason ?? null,
            published_at: input.publishedAt ?? null,
            reservation_key: null,
          },
        });
      } catch (error) {
        if (!isMissingReservationKeyColumnError(error)) {
          throw error;
        }
      }
    },
  };
}

export function defaultCreateTraceId(preferred?: string): string {
  const normalized = String(preferred ?? '').trim();
  return normalized || randomUUID();
}
