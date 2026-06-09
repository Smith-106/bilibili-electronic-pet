import { describe, expect, it } from 'vitest';
import { createServer } from '../src/main.js';
function buildSettings(overrides = {}) {
  return {
    databaseUrl: 'file:./test.db',
    celeryBrokerUrl: 'redis://localhost:6379/0',
    celeryResultBackend: 'redis://localhost:6379/1',
    apiKey: '',
    adminSessionSecret: '',
    adminSessionTtlSeconds: 60 * 60 * 12,
    llmProvider: 'mock',
    llmApiKeyConfigured: false,
    llmFallbackToMock: true,
    searchProvider: 'serpapi',
    searchApiKeyConfigured: false,
    searchCxConfigured: false,
    publisherMode: 'webhook',
    publisherWebhookUrlConfigured: false,
    bilibiliEnabled: false,
    bilibiliPollEnabled: false,
    bilibiliPollIntervalSeconds: 300,
    bilibiliPublishEnabled: false,
    bilibiliEnvCredentialConfigured: false,
    killSwitch: false,
    gatewayToken: '',
    gatewayHmacSecret: '',
    commentIngressToken: '',
    publicCompanionActionsEnabled: false,
    platformBilibiliEnabled: false,
    platformQqEnabled: false,
    platformDouyinEnabled: false,
    platformKuaishouEnabled: false,
    platformBilibiliPublishSource: 'bilibili-bot',
    platformQqPublishSource: 'qq-sidecar',
    platformDouyinPublishSource: 'douyin-bot',
    platformKuaishouPublishSource: 'kuaishou-bot',
    ...overrides,
  };
}
function buildDeps(overrides = {}) {
  return {
    settings: buildSettings(),
    checkDatabaseConnection: async () => ({ connected: true }),
    checkRedisConnection: async () => ({ connected: true }),
    buildBilibiliDiagnostics: async () => ({
      ready: false,
      blocking_reasons: [],
      effective_publish_mode: 'webhook',
      checks: {
        worker_or_publish: {
          ready: true,
          errors: [],
        },
      },
      release_gates: {
        worker_or_publish_ready: true,
      },
      signals: {},
    }),
    ...overrides,
  };
}
describe('health/readiness parity', () => {
  it('returns ok for /health', async () => {
    const app = createServer(buildDeps());
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
    await app.close();
  });
  it('returns readiness payload shape', async () => {
    const app = createServer(buildDeps());
    const response = await app.inject({ method: 'GET', url: '/readiness' });
    const data = response.json();
    expect(response.statusCode).toBe(200);
    expect(data).toHaveProperty('ready');
    expect(data).toHaveProperty('database');
    expect(data).toHaveProperty('redis');
    expect(data).toHaveProperty('config');
    expect(data).toHaveProperty('publish');
    expect(data).toHaveProperty('kill_switch');
    expect(data).toHaveProperty('foundation_ready');
    expect(data).toHaveProperty('delivery_ready');
    expect(data).toHaveProperty('foundation_blockers');
    expect(data).toHaveProperty('delivery_blockers');
    expect(data).toHaveProperty('blocking_reasons');
    expect(data).toHaveProperty('delivery_signals');
    expect(data).toHaveProperty('bilibili_diagnostics');
    expect(typeof data.database).toBe('object');
    expect(typeof data.redis).toBe('object');
    expect(Array.isArray(data.foundation_blockers)).toBe(true);
    expect(Array.isArray(data.delivery_blockers)).toBe(true);
    expect(Array.isArray(data.blocking_reasons)).toBe(true);
    expect(typeof data.delivery_signals).toBe('object');
    expect(typeof data.bilibili_diagnostics).toBe('object');
    expect(data.database).toHaveProperty('connected');
    expect(data.redis).toHaveProperty('connected');
    await app.close();
  });
  it('reflects database failure in foundation and delivery blockers', async () => {
    const app = createServer(
      buildDeps({
        checkDatabaseConnection: async () => ({ connected: false, error: 'connection failed' }),
      }),
    );
    const response = await app.inject({ method: 'GET', url: '/readiness' });
    const data = response.json();
    expect(data.ready).toBe(false);
    expect(data.database.connected).toBe(false);
    expect(data.foundation_ready).toBe(false);
    expect(data.delivery_ready).toBe(false);
    expect(data.database).toHaveProperty('error');
    expect(data.foundation_blockers.some((reason) => reason.startsWith('database:'))).toBe(true);
    expect(data.delivery_blockers.some((reason) => reason.startsWith('database:'))).toBe(true);
    await app.close();
  });
  it('reflects redis failure in foundation and delivery blockers', async () => {
    const app = createServer(
      buildDeps({
        checkRedisConnection: async () => ({ connected: false, error: 'redis_unavailable' }),
      }),
    );
    const response = await app.inject({ method: 'GET', url: '/readiness' });
    const data = response.json();
    expect(data.ready).toBe(false);
    expect(data.redis.connected).toBe(false);
    expect(data.foundation_ready).toBe(false);
    expect(data.delivery_ready).toBe(false);
    expect(data.redis).toHaveProperty('error');
    expect(data.foundation_blockers.some((reason) => reason.startsWith('redis:'))).toBe(true);
    expect(data.delivery_blockers.some((reason) => reason.startsWith('redis:'))).toBe(true);
    await app.close();
  });
  it('adds bilibili blockers for native publish mode diagnostics', async () => {
    const app = createServer(
      buildDeps({
        buildBilibiliDiagnostics: async () => ({
          ready: false,
          blocking_reasons: ['auth:no active credential'],
          effective_publish_mode: 'native_bilibili',
          signals: {},
        }),
      }),
    );
    const response = await app.inject({ method: 'GET', url: '/readiness' });
    const data = response.json();
    expect(data.ready).toBe(true);
    expect(data.foundation_ready).toBe(true);
    expect(data.delivery_ready).toBe(false);
    expect(data.delivery_blockers).toContain('bilibili:auth:no active credential');
    await app.close();
  });
  it('allows webhook mode with worker_or_publish gate', async () => {
    const app = createServer(
      buildDeps({
        settings: buildSettings({
          publisherMode: 'webhook',
          publisherWebhookUrlConfigured: true,
          llmProvider: 'openai',
          llmApiKeyConfigured: true,
          llmFallbackToMock: false,
          searchProvider: 'serpapi',
          searchApiKeyConfigured: true,
          commentIngressToken: 'comment-token',
        }),
        buildBilibiliDiagnostics: async () => ({
          ready: false,
          blocking_reasons: ['config:bilibili_enabled is false'],
          effective_publish_mode: 'webhook',
          checks: {
            worker_or_publish: {
              ready: true,
              errors: [],
            },
          },
          release_gates: {
            worker_or_publish_ready: true,
          },
          signals: {},
        }),
      }),
    );
    const response = await app.inject({ method: 'GET', url: '/readiness' });
    const data = response.json();
    expect(data.ready).toBe(true);
    expect(data.foundation_ready).toBe(true);
    expect(data.delivery_ready).toBe(true);
    expect(data.delivery_capability_blockers).toEqual([]);
    expect(data.delivery_blockers).not.toContain('bilibili:delivery_diagnostics_not_ready');
    expect(data.delivery_blockers.some((reason) => reason.startsWith('bilibili:config:'))).toBe(false);
    await app.close();
  });
  it('keeps simulated mode blocked', async () => {
    const app = createServer(
      buildDeps({
        settings: buildSettings({ publisherMode: 'simulated' }),
        buildBilibiliDiagnostics: async () => ({
          ready: false,
          blocking_reasons: [],
          effective_publish_mode: 'simulated',
          checks: {
            worker_or_publish: {
              ready: true,
              errors: [],
            },
          },
          release_gates: {
            worker_or_publish_ready: true,
          },
          signals: {},
        }),
      }),
    );
    const response = await app.inject({ method: 'GET', url: '/readiness' });
    const data = response.json();
    expect(data.ready).toBe(true);
    expect(data.foundation_ready).toBe(true);
    expect(data.delivery_ready).toBe(false);
    expect(data.delivery_blockers).toContain('bilibili:publish_mode_not_delivery_capable:simulated');
    expect(data.delivery_blockers).toContain('bilibili:delivery_diagnostics_not_ready');
    await app.close();
  });
});
describe('gateway/auth parity', () => {
  const basePayload = {
    comment_id: 'comment-1',
    reply_text: 'reply text',
  };
  it('rejects invalid bearer token', async () => {
    const app = createServer(
      buildDeps({
        settings: buildSettings({ gatewayToken: 'gateway-token' }),
      }),
    );
    const response = await app.inject({
      method: 'POST',
      url: '/gateway/publish',
      payload: basePayload,
    });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ detail: 'unauthorized' });
    await app.close();
  });
  it('rejects invalid signature', async () => {
    const app = createServer(
      buildDeps({
        settings: buildSettings({ gatewayHmacSecret: 'gateway-hmac' }),
        verifyPayloadSignature: () => false,
      }),
    );
    const response = await app.inject({
      method: 'POST',
      url: '/gateway/publish',
      payload: basePayload,
      headers: {
        'x-signature': 'invalid-signature',
      },
    });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ detail: 'invalid_signature' });
    await app.close();
  });
  it('returns duplicate replay contract and skips publisher', async () => {
    let publishCalled = false;
    const app = createServer(
      buildDeps({
        reservePublishLog: () => ({ duplicate: true, reservationKey: 'existing' }),
        publishGatewayReply: () => {
          publishCalled = true;
          return { published: true, reason: 'should_not_happen' };
        },
      }),
    );
    const response = await app.inject({
      method: 'POST',
      url: '/gateway/publish',
      payload: {
        ...basePayload,
        source: 'gateway',
        trace_id: 'trace-dup-1',
      },
    });
    const body = response.json();
    expect(response.statusCode).toBe(200);
    expect(publishCalled).toBe(false);
    expect(body).toEqual({
      ok: true,
      published: false,
      duplicate: true,
      reason: 'idempotent_replay',
      trace_id: 'trace-dup-1',
    });
    await app.close();
  });
  it('publishes successfully and keeps adapter reason', async () => {
    const finalized = [];
    let capturedInput = null;
    const app = createServer(
      buildDeps({
        settings: buildSettings({
          gatewayToken: 'gateway-token',
          gatewayHmacSecret: 'gateway-hmac',
        }),
        verifyPayloadSignature: () => true,
        reservePublishLog: () => ({ duplicate: false, reservationKey: 'reservation-1' }),
        finalizePublishLog: (input) => {
          finalized.push(input);
        },
        publishGatewayReply: (input) => {
          capturedInput = input;
          return {
            published: true,
            reason: 'official_publish_ok',
            publishedAt: new Date('2026-03-07T01:00:00.000Z'),
          };
        },
      }),
    );
    const response = await app.inject({
      method: 'POST',
      url: '/gateway/publish',
      payload: {
        comment_id: 'comment-3',
        reply_text: 'reply text',
        force_publish: true,
        source: 'gateway',
        trace_id: 'trace-3',
      },
      headers: {
        authorization: 'Bearer gateway-token',
        'x-signature': 'a'.repeat(64),
      },
    });
    const body = response.json();
    expect(response.statusCode).toBe(200);
    expect(body).toEqual({
      ok: true,
      published: true,
      reason: 'official_publish_ok',
      comment_id: 'comment-3',
      published_at: '2026-03-07T01:00:00.000Z',
      trace_id: 'trace-3',
    });
    expect(capturedInput).toEqual({
      commentId: 'comment-3',
      replyText: 'reply text',
      forcePublish: true,
      source: 'gateway',
      traceId: 'trace-3',
    });
    expect(finalized).toHaveLength(1);
    expect(finalized[0]).toMatchObject({
      reservationKey: 'reservation-1',
      status: 'published',
      source: 'gateway',
    });
    await app.close();
  });
  it('normalizes publish failure reason and finalizes failed log', async () => {
    const finalized = [];
    const app = createServer(
      buildDeps({
        reservePublishLog: () => ({ duplicate: false, reservationKey: 'reservation-fail' }),
        finalizePublishLog: (input) => {
          finalized.push(input);
        },
        publishGatewayReply: () => ({
          published: false,
          reason: 'real_publish_error:ReadTimeout',
        }),
      }),
    );
    const response = await app.inject({
      method: 'POST',
      url: '/gateway/publish',
      payload: {
        comment_id: 'comment-5',
        reply_text: 'reply text',
        source: 'gateway',
        trace_id: 'trace-5',
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: false,
      published: false,
      reason: 'timeout',
      comment_id: 'comment-5',
      trace_id: 'trace-5',
    });
    expect(finalized).toEqual([
      {
        reservationKey: 'reservation-fail',
        status: 'failed',
        source: 'gateway',
        failureReason: 'timeout',
      },
    ]);
    await app.close();
  });
  it('returns platform_disabled for disabled platform routes', async () => {
    const app = createServer(
      buildDeps({
        settings: buildSettings({
          platformBilibiliEnabled: false,
          platformDouyinEnabled: false,
          platformKuaishouEnabled: false,
        }),
      }),
    );
    const bilibili = await app.inject({ method: 'POST', url: '/gateway/publish/bilibili', payload: basePayload });
    const douyin = await app.inject({ method: 'POST', url: '/gateway/publish/douyin', payload: basePayload });
    const kuaishou = await app.inject({ method: 'POST', url: '/gateway/publish/kuaishou', payload: basePayload });
    expect(bilibili.statusCode).toBe(403);
    expect(douyin.statusCode).toBe(403);
    expect(kuaishou.statusCode).toBe(403);
    expect(bilibili.json()).toEqual({ detail: 'platform_disabled' });
    expect(douyin.json()).toEqual({ detail: 'platform_disabled' });
    expect(kuaishou.json()).toEqual({ detail: 'platform_disabled' });
    await app.close();
  });
  it('uses platform adapter and configured platform source for bilibili route', async () => {
    const finalized = [];
    let capturedInput = null;
    const app = createServer(
      buildDeps({
        settings: buildSettings({
          platformBilibiliEnabled: true,
          platformBilibiliPublishSource: 'bilibili-open',
        }),
        reservePublishLog: () => ({ duplicate: false, reservationKey: 'reservation-bili' }),
        finalizePublishLog: (input) => {
          finalized.push(input);
        },
        publishPlatformReply: (input) => {
          capturedInput = input;
          return {
            published: true,
            reason: 'platform_publish_ok',
            publishedAt: new Date('2026-03-07T02:00:00.000Z'),
          };
        },
      }),
    );
    const response = await app.inject({
      method: 'POST',
      url: '/gateway/publish/bilibili',
      payload: {
        comment_id: 'comment-bili-1',
        reply_text: 'reply text',
        force_publish: true,
        trace_id: 'trace-bili-1',
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      published: true,
      reason: 'platform_publish_ok',
      comment_id: 'comment-bili-1',
      published_at: '2026-03-07T02:00:00.000Z',
      trace_id: 'trace-bili-1',
    });
    expect(capturedInput).toEqual({
      platform: 'bilibili',
      commentId: 'comment-bili-1',
      replyText: 'reply text',
      forcePublish: true,
      traceId: 'trace-bili-1',
    });
    expect(finalized).toHaveLength(1);
    expect(finalized[0]).toMatchObject({
      reservationKey: 'reservation-bili',
      status: 'published',
      source: 'bilibili-open',
    });
    await app.close();
  });
  it('uses fallback source when douyin publish source is empty', async () => {
    const finalized = [];
    const app = createServer(
      buildDeps({
        settings: buildSettings({
          platformDouyinEnabled: true,
          platformDouyinPublishSource: '',
        }),
        reservePublishLog: () => ({ duplicate: false, reservationKey: 'reservation-dy' }),
        finalizePublishLog: (input) => {
          finalized.push(input);
        },
        publishPlatformReply: () => ({
          published: true,
          reason: 'platform_publish_ok',
          publishedAt: new Date('2026-03-07T02:30:00.000Z'),
        }),
      }),
    );
    const response = await app.inject({
      method: 'POST',
      url: '/gateway/publish/douyin',
      payload: {
        comment_id: 'comment-douyin-1',
        reply_text: 'reply text',
        trace_id: 'trace-douyin-1',
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().ok).toBe(true);
    expect(finalized).toHaveLength(1);
    expect(finalized[0]).toMatchObject({
      source: 'douyin-bot',
      status: 'published',
    });
    await app.close();
  });
  it('standardizes gateway publish failure reasons', async () => {
    const cases = [
      { input: 'upstream_status_502', expected: '5xx' },
      { input: 'invalid_signature', expected: 'auth' },
      { input: '', expected: 'invalid_response' },
    ];
    for (const testCase of cases) {
      const app = createServer(
        buildDeps({
          reservePublishLog: () => ({ duplicate: false, reservationKey: `reservation-${testCase.expected}` }),
          finalizePublishLog: () => undefined,
          publishGatewayReply: () => ({ published: false, reason: testCase.input }),
        }),
      );
      const response = await app.inject({
        method: 'POST',
        url: '/gateway/publish',
        payload: {
          comment_id: `comment-${testCase.expected}`,
          reply_text: 'reply text',
        },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().reason).toBe(testCase.expected);
      await app.close();
    }
  });
});
