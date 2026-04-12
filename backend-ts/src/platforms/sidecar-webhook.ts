import type { PlatformName, PublishExecutionResult } from '../server/contracts.js';

function getPlatformEnvPrefix(platform: PlatformName): string {
  return `PLATFORM_${platform.toUpperCase()}`;
}

export async function publishViaSidecarWebhook(input: {
  platform: PlatformName;
  commentId: string;
  replyText: string;
  forcePublish: boolean;
  traceId: string;
}): Promise<PublishExecutionResult> {
  const prefix = getPlatformEnvPrefix(input.platform);
  const webhookUrl = process.env[`${prefix}_WEBHOOK_URL`];
  const webhookToken = process.env[`${prefix}_WEBHOOK_TOKEN`];

  if (!webhookUrl) {
    return { published: false, reason: 'not_configured' };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(webhookToken ? { Authorization: `Bearer ${webhookToken}` } : {}),
      },
      body: JSON.stringify({
        platform: input.platform,
        comment_id: input.commentId,
        reply_text: input.replyText,
        force_publish: input.forcePublish,
        trace_id: input.traceId,
      }),
    });

    if (!response.ok) {
      return { published: false, reason: `sidecar_http_${response.status}` };
    }

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    const published = payload.published !== false;
    const publishedAt =
      typeof payload.published_at === 'string' && payload.published_at
        ? new Date(payload.published_at)
        : new Date();

    return {
      published,
      reason: typeof payload.reason === 'string' && payload.reason ? payload.reason : 'sidecar_webhook_ok',
      publishedAt,
    };
  } catch (error) {
    return {
      published: false,
      reason: error instanceof Error ? error.message : 'sidecar_webhook_failed',
    };
  }
}
