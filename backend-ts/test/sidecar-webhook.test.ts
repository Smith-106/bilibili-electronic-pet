import { afterEach, describe, expect, it } from 'vitest';

import {
  buildSidecarWebhookPayload,
  getSidecarWebhookConfig,
} from '../src/platforms/sidecar-webhook.js';

describe('sidecar-webhook helpers', () => {
  afterEach(() => {
    delete process.env.PLATFORM_DOUYIN_WEBHOOK_URL;
    delete process.env.PLATFORM_DOUYIN_WEBHOOK_TOKEN;
  });

  it('builds the expected sidecar payload contract', () => {
    expect(
      buildSidecarWebhookPayload({
        platform: 'douyin',
        commentId: 'comment-1',
        replyText: 'reply text',
        forcePublish: true,
        traceId: 'trace-1',
      }),
    ).toEqual({
      platform: 'douyin',
      comment_id: 'comment-1',
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
});
