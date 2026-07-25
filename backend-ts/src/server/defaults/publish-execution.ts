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
  'not_configured',
  'webhook_not_configured',
  'sidecar_webhook_not_configured',
  'platform_disabled',
  'bilibili_reference_adapter_only',
  'bilibili_not_configured',
  'bilibili_api_error',
  'publish_failed',
  'runtime_credentials_required',
]);
const TIMEOUT_HINTS = ['timeout', 'timedout', 'readtimeout', 'connecttimeout'];
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
