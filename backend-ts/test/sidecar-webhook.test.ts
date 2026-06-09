import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildSidecarWebhookPayload,
  getSidecarWebhookConfig,
  publishViaSidecarWebhook,
} from '../src/platforms/sidecar-webhook.js';

describe('sidecar-webhook helpers', () => {
  afterEach(() => {
    delete process.env.PLATFORM_QQ_WEBHOOK_URL;
    delete process.env.PLATFORM_QQ_WEBHOOK_TOKEN;
    delete process.env.PLATFORM_DOUYIN_WEBHOOK_URL;
    delete process.env.PLATFORM_DOUYIN_WEBHOOK_TOKEN;
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('builds the expected sidecar payload contract', () => {
    expect(
      buildSidecarWebhookPayload({
        platform: 'douyin',
        commentId: 'comment-1',
        canonicalId: 'douyin:comment-1',
        targetKind: 'comment-reply',
        route: {
          containerId: 'aweme-1',
          parentExternalId: 'parent-1',
          metadata: {
            reply_mode: 'thread',
          },
        },
        replyText: 'reply text',
        forcePublish: true,
        traceId: 'trace-1',
      }),
    ).toEqual({
      platform: 'douyin',
      target_kind: 'comment-reply',
      comment_id: 'comment-1',
      canonical_id: 'douyin:comment-1',
      container_id: 'aweme-1',
      parent_external_id: 'parent-1',
      routing_metadata: {
        reply_mode: 'thread',
      },
      reply_text: 'reply text',
      force_publish: true,
      trace_id: 'trace-1',
    });
  });

  it('describes the current env contract for a sidecar platform', () => {
    process.env.PLATFORM_DOUYIN_WEBHOOK_URL = 'https://sidecar.example.test/publish';
    process.env.PLATFORM_DOUYIN_WEBHOOK_TOKEN = 'secret-token';

    expect(getSidecarWebhookConfig('douyin')).toEqual({
      envPrefix: 'PLATFORM_DOUYIN',
      webhookUrlEnv: 'PLATFORM_DOUYIN_WEBHOOK_URL',
      webhookTokenEnv: 'PLATFORM_DOUYIN_WEBHOOK_TOKEN',
      webhookUrl: 'https://sidecar.example.test/publish',
      hasToken: true,
    });
  });

  it('derives the QQ sidecar env contract from the shared platform naming scheme', () => {
    process.env.PLATFORM_QQ_WEBHOOK_URL = 'https://qq-sidecar.example.test/publish';
    process.env.PLATFORM_QQ_WEBHOOK_TOKEN = 'qq-secret-token';

    expect(getSidecarWebhookConfig('qq')).toEqual({
      envPrefix: 'PLATFORM_QQ',
      webhookUrlEnv: 'PLATFORM_QQ_WEBHOOK_URL',
      webhookTokenEnv: 'PLATFORM_QQ_WEBHOOK_TOKEN',
      webhookUrl: 'https://qq-sidecar.example.test/publish',
      hasToken: true,
    });
  });

  it('returns not_configured when the sidecar webhook URL is missing', async () => {
    await expect(
      publishViaSidecarWebhook({
        platform: 'douyin',
        commentId: 'comment-1',
        replyText: 'reply text',
        forcePublish: false,
        traceId: 'trace-1',
      }),
    ).resolves.toEqual({
      published: false,
      reason: 'not_configured',
    });
  });

  it('reports HTTP failures without parsing a response body', async () => {
    process.env.PLATFORM_DOUYIN_WEBHOOK_URL = 'https://sidecar.example.test/publish';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: vi.fn(),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      publishViaSidecarWebhook({
        platform: 'douyin',
        commentId: 'comment-1',
        replyText: 'reply text',
        forcePublish: false,
        traceId: 'trace-1',
      }),
    ).resolves.toEqual({
      published: false,
      reason: 'sidecar_http_503',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://sidecar.example.test/publish',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('falls back to an ok result when sidecar JSON parsing fails', async () => {
    process.env.PLATFORM_DOUYIN_WEBHOOK_URL = 'https://sidecar.example.test/publish';
    process.env.PLATFORM_DOUYIN_WEBHOOK_TOKEN = 'token-1';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockRejectedValue(new Error('invalid json')),
      }),
    );

    const result = await publishViaSidecarWebhook({
      platform: 'douyin',
      commentId: 'comment-1',
      replyText: 'reply text',
      forcePublish: true,
      traceId: 'trace-1',
    });

    expect(result.published).toBe(true);
    expect(result.reason).toBe('sidecar_webhook_ok');
    expect(result.publishedAt).toBeInstanceOf(Date);
  });

  it('uses the current time when published_at is absent from a sidecar success response', async () => {
    vi.useFakeTimers();
    const now = new Date('2026-06-09T10:30:00.000Z');
    vi.setSystemTime(now);
    process.env.PLATFORM_QQ_WEBHOOK_URL = 'https://qq-sidecar.example.test/publish';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          published: false,
          reason: 'manual_review',
        }),
      }),
    );

    const result = await publishViaSidecarWebhook({
      platform: 'qq',
      commentId: 'message-1',
      replyText: 'reply text',
      forcePublish: false,
      traceId: 'trace-1',
    });

    expect(result).toEqual({
      published: false,
      reason: 'manual_review',
      publishedAt: now,
    });
    vi.useRealTimers();
  });

  it('normalizes thrown Error and non-Error sidecar failures', async () => {
    process.env.PLATFORM_QQ_WEBHOOK_URL = 'https://qq-sidecar.example.test/publish';
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('connection refused'))
      .mockRejectedValueOnce('socket closed');
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      publishViaSidecarWebhook({
        platform: 'qq',
        commentId: 'message-1',
        replyText: 'reply text',
        forcePublish: false,
        traceId: 'trace-1',
      }),
    ).resolves.toEqual({
      published: false,
      reason: 'connection refused',
    });
    await expect(
      publishViaSidecarWebhook({
        platform: 'qq',
        commentId: 'message-2',
        replyText: 'reply text',
        forcePublish: false,
        traceId: 'trace-2',
      }),
    ).resolves.toEqual({
      published: false,
      reason: 'sidecar_webhook_failed',
    });
  });
});
