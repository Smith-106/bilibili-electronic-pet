import { afterEach, describe, expect, it } from 'vitest';

import {
  buildSidecarWebhookPayload,
  getSidecarWebhookConfig,
} from '../src/platforms/sidecar-webhook.js';

describe('sidecar-webhook helpers', () => {
  afterEach(() => {
    delete process.env.PLATFORM_QQ_WEBHOOK_URL;
    delete process.env.PLATFORM_QQ_WEBHOOK_TOKEN;
    delete process.env.PLATFORM_DOUYIN_WEBHOOK_URL;
    delete process.env.PLATFORM_DOUYIN_WEBHOOK_TOKEN;
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
});
