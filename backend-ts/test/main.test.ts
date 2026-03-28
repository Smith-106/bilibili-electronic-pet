import { describe, expect, it } from 'vitest';

import { createServer, type RuntimeSettings, type ServerDependencies } from '../src/main.js';

function buildSettings(overrides: Partial<RuntimeSettings> = {}): RuntimeSettings {
  return {
    databaseUrl: 'postgresql://test',
    celeryBrokerUrl: 'redis://localhost:6379/0',
    celeryResultBackend: 'redis://localhost:6379/1',
    apiKey: '',
    llmProvider: 'mock',
    llmFallbackToMock: true,
    publisherMode: 'webhook',
    bilibiliEnabled: false,
    bilibiliPollEnabled: false,
    bilibiliPollIntervalSeconds: 300,
    bilibiliPublishEnabled: false,
    killSwitch: false,
    gatewayToken: '',
    gatewayHmacSecret: '',
    platformBilibiliEnabled: false,
    platformDouyinEnabled: false,
    platformKuaishouEnabled: false,
    platformBilibiliPublishSource: 'bilibili-bot',
    platformDouyinPublishSource: 'douyin-bot',
    platformKuaishouPublishSource: 'kuaishou-bot',
    ...overrides,
  };
}

function buildDeps(overrides: Partial<ServerDependencies> = {}): Partial<ServerDependencies> {
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
    expect(data.foundation_blockers.some((reason: string) => reason.startsWith('database:'))).toBe(true);
    expect(data.delivery_blockers.some((reason: string) => reason.startsWith('database:'))).toBe(true);

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
    expect(data.foundation_blockers.some((reason: string) => reason.startsWith('redis:'))).toBe(true);
    expect(data.delivery_blockers.some((reason: string) => reason.startsWith('redis:'))).toBe(true);

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
        settings: buildSettings({ publisherMode: 'webhook' }),
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
    expect(data.delivery_blockers).not.toContain('bilibili:delivery_diagnostics_not_ready');
    expect(data.delivery_blockers.some((reason: string) => reason.startsWith('bilibili:config:'))).toBe(false);

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
    const finalized: Array<Record<string, unknown>> = [];
    let capturedInput: Record<string, unknown> | null = null;

    const app = createServer(
      buildDeps({
        settings: buildSettings({
          gatewayToken: 'gateway-token',
          gatewayHmacSecret: 'gateway-hmac',
        }),
        verifyPayloadSignature: () => true,
        reservePublishLog: () => ({ duplicate: false, reservationKey: 'reservation-1' }),
        finalizePublishLog: (input) => {
          finalized.push(input as unknown as Record<string, unknown>);
        },
        publishGatewayReply: (input) => {
          capturedInput = input as unknown as Record<string, unknown>;
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
    const finalized: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        reservePublishLog: () => ({ duplicate: false, reservationKey: 'reservation-fail' }),
        finalizePublishLog: (input) => {
          finalized.push(input as unknown as Record<string, unknown>);
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
    const finalized: Array<Record<string, unknown>> = [];
    let capturedInput: Record<string, unknown> | null = null;

    const app = createServer(
      buildDeps({
        settings: buildSettings({
          platformBilibiliEnabled: true,
          platformBilibiliPublishSource: 'bilibili-open',
        }),
        reservePublishLog: () => ({ duplicate: false, reservationKey: 'reservation-bili' }),
        finalizePublishLog: (input) => {
          finalized.push(input as unknown as Record<string, unknown>);
        },
        publishPlatformReply: (input) => {
          capturedInput = input as unknown as Record<string, unknown>;
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
    const finalized: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        settings: buildSettings({
          platformDouyinEnabled: true,
          platformDouyinPublishSource: '',
        }),
        reservePublishLog: () => ({ duplicate: false, reservationKey: 'reservation-dy' }),
        finalizePublishLog: (input) => {
          finalized.push(input as unknown as Record<string, unknown>);
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

describe('admin api parity', () => {
  it('requires x-api-key when configured', async () => {
    const app = createServer(
      buildDeps({
        settings: buildSettings({ apiKey: 'admin-key' }),
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/overview',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ detail: 'unauthorized' });

    await app.close();
  });

  it('supports overview alias endpoint with auth parity', async () => {
    const app = createServer(
      buildDeps({
        settings: buildSettings({ apiKey: 'admin-key' }),
        getAdminOverview: () => ({
          totals: { jobs: 5 },
          generated_at: '2026-03-08T00:00:00.000Z',
        }),
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/metrics/overview',
      headers: {
        'x-api-key': 'admin-key',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      totals: { jobs: 5 },
      generated_at: '2026-03-08T00:00:00.000Z',
    });

    await app.close();
  });

  it('normalizes jobs query params and keeps list response shape', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        listAdminJobs: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            items: [{ id: 'job-1', status: 'done' }],
            total: 1,
            limit: input.limit,
            offset: input.offset,
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/jobs?status=%20done%20&limit=2000&offset=-9',
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([
      {
        status: 'done',
        limit: 1000,
        offset: 0,
      },
    ]);
    expect(response.json()).toEqual({
      items: [{ id: 'job-1', status: 'done' }],
      total: 1,
      limit: 1000,
      offset: 0,
    });

    await app.close();
  });

  it('normalizes audit summary query and supports alias endpoint', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        summarizeAdminAuditLogs: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            days: input.days,
            totals: { audit_logs: 3, ok: 2, failed: 1 },
            by_action: { publish: 3 },
            by_result: { success: 2, failed: 1 },
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/audit-logs/summary?days=999&action=%20publish%20&ok=yes',
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([
      {
        days: 90,
        action: 'publish',
        ok: true,
      },
    ]);
    expect(response.json()).toEqual({
      ok: true,
      days: 90,
      totals: { audit_logs: 3, ok: 2, failed: 1 },
      by_action: { publish: 3 },
      by_result: { success: 2, failed: 1 },
    });

    await app.close();
  });

  it('normalizes gateway log timestamps and supports publish-logs alias', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        listAdminGatewayLogs: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            items: [
              {
                comment_id: 'comment-1',
                published_at: new Date('2026-03-08T12:00:00.000Z'),
                created_at: 'invalid-date',
              },
            ],
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/gateway/publish-logs?comment_id=%20comment-1%20&limit=999',
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([
      {
        commentId: 'comment-1',
        limit: 200,
      },
    ]);
    expect(response.json()).toEqual({
      items: [
        {
          comment_id: 'comment-1',
          published_at: '2026-03-08T12:00:00.000Z',
          created_at: '1970-01-01T00:00:00.000Z',
        },
      ],
    });

    await app.close();
  });
});
