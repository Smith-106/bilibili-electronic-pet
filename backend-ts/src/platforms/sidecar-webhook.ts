import type { PlatformName, PublishExecutionResult } from '../server/contracts.js';
import type { PublishTargetKind, PublishTargetRoute } from '../domain/publish/types.js';

function getPlatformEnvPrefix(platform: PlatformName): string {
  return `PLATFORM_${platform.toUpperCase()}`;
}

export interface SidecarWebhookPublishPayload {
  platform: PlatformName;
  target_kind?: PublishTargetKind;
  comment_id: string;
  canonical_id?: string;
  container_id?: string;
  parent_external_id?: string;
  routing_metadata?: Record<string, string>;
  reply_text: string;
  force_publish: boolean;
  trace_id: string;
}

export interface SidecarWebhookConfig {
  envPrefix: string;
  webhookUrlEnv: string;
  webhookTokenEnv: string;
  webhookUrl?: string;
  hasToken: boolean;
}

export function getSidecarWebhookConfig(platform: PlatformName): SidecarWebhookConfig {
  const envPrefix = getPlatformEnvPrefix(platform);
  const webhookUrlEnv = `${envPrefix}_WEBHOOK_URL`;
  const webhookTokenEnv = `${envPrefix}_WEBHOOK_TOKEN`;
  const webhookUrl = process.env[webhookUrlEnv];
  const webhookToken = process.env[webhookTokenEnv];

  return {
    envPrefix,
    webhookUrlEnv,
    webhookTokenEnv,
    webhookUrl,
    hasToken: Boolean(webhookToken),
  };
}

export function buildSidecarWebhookPayload(input: {
  platform: PlatformName;
  commentId: string;
  canonicalId?: string;
  targetKind?: PublishTargetKind;
  route?: PublishTargetRoute;
  replyText: string;
  forcePublish: boolean;
  traceId: string;
}): SidecarWebhookPublishPayload {
  return {
    platform: input.platform,
    target_kind: input.targetKind,
    comment_id: input.commentId,
    canonical_id: input.canonicalId,
    container_id: input.route?.containerId,
    parent_external_id: input.route?.parentExternalId,
    routing_metadata: input.route?.metadata,
    reply_text: input.replyText,
    force_publish: input.forcePublish,
    trace_id: input.traceId,
  };
}

export async function publishViaSidecarWebhook(input: {
  platform: PlatformName;
  commentId: string;
  canonicalId?: string;
  targetKind?: PublishTargetKind;
  route?: PublishTargetRoute;
  replyText: string;
  forcePublish: boolean;
  traceId: string;
}): Promise<PublishExecutionResult> {
  const config = getSidecarWebhookConfig(input.platform);
  const webhookUrl = config.webhookUrl;
  const webhookToken = process.env[config.webhookTokenEnv];

  if (!webhookUrl) {
    return { published: false, reason: 'not_configured' };
  }

  try {
    // isFinite + 上界守护 (对齐 sibling publisher.ts:538-539 / publish-execution.ts:177):
    // 非 numeric env (如 'abc'/'30s') → parseInt NaN → AbortSignal.timeout(NaN) RangeError 同步抛,
    // 会被下方 catch 收敛为 sidecar_webhook_failed 误导. 无效配置回退 15s 默认.
    const timeoutRaw = Number.parseInt(process.env.SIDECAR_WEBHOOK_TIMEOUT_SECONDS || '15', 10);
    const timeoutSeconds = Number.isFinite(timeoutRaw) && timeoutRaw > 0 && timeoutRaw <= 300 ? timeoutRaw : 15;
    const timeout = timeoutSeconds * 1000;
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(webhookToken ? { Authorization: `Bearer ${webhookToken}` } : {}),
      },
      body: JSON.stringify(buildSidecarWebhookPayload(input)),
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      return { published: false, reason: `sidecar_http_${response.status}` };
    }

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const published = payload.published !== false;
    const publishedAt =
      typeof payload.published_at === 'string' && payload.published_at ? new Date(payload.published_at) : new Date();

    return {
      published,
      reason: typeof payload.reason === 'string' && payload.reason ? payload.reason : 'sidecar_webhook_ok',
      publishedAt,
    };
  } catch {
    // CWE-209: 不透传原始 error.message (如 'connection refused'/'fetch failed') 进 reason
    // — reason 经 gateway-publish normalizePublishFailureReason 归一化后写入 PublishLog.failure_reason
    // 与 HTTP body reason, 会泄露内部网络/上游细节给客户端. 收敛为固定 enum.
    return {
      published: false,
      reason: 'sidecar_webhook_failed',
    };
  }
}
