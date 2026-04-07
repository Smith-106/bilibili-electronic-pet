import { describe, expect, it } from 'vitest';

import { createServer, type RuntimeSettings, type ServerDependencies } from '../src/main.js';

function buildSettings(overrides: Partial<RuntimeSettings> = {}): RuntimeSettings {
  return {
    databaseUrl: 'file:./test.db',
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

  it('serves the admin HTML and referenced hashed assets', async () => {
    const app = createServer(buildDeps());

    const adminResponse = await app.inject({ method: 'GET', url: '/admin' });
    expect(adminResponse.statusCode).toBe(200);

    const cssMatch = adminResponse.body.match(/href="([^"]+\.css)"/);
    const jsMatch = adminResponse.body.match(/src="([^"]+\.js)"/);

    expect(cssMatch?.[1]).toBeTruthy();
    expect(jsMatch?.[1]).toBeTruthy();

    const cssResponse = await app.inject({ method: 'GET', url: String(cssMatch?.[1]) });
    const jsResponse = await app.inject({ method: 'GET', url: String(jsMatch?.[1]) });

    expect(cssResponse.statusCode).toBe(200);
    expect(jsResponse.statusCode).toBe(200);

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
    expect(response.json()).toMatchObject({
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

  it('requires auth for knowledge entries list', async () => {
    const app = createServer(
      buildDeps({
        settings: buildSettings({ apiKey: 'admin-key' }),
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/knowledge',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ detail: 'unauthorized' });

    await app.close();
  });

  it('lists knowledge entries with query clamping', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        listKnowledgeEntries: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            items: [
              {
                id: 1,
                category: 'general',
                title: 'Test Entry',
                content: 'Test content',
                enabled: true,
                updated_at: '2026-03-08T00:00:00.000Z',
              },
            ],
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/knowledge?limit=9999&offset=-5',
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([{ limit: 1000, offset: 0 }]);
    expect(response.json()).toEqual({
      ok: true,
      items: [
        {
          id: 1,
          category: 'general',
          title: 'Test Entry',
          content: 'Test content',
          enabled: true,
          updated_at: '2026-03-08T00:00:00.000Z',
        },
      ],
    });

    await app.close();
  });

  it('creates knowledge entry with validation', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        createKnowledgeEntry: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            item: {
              id: 1,
              category: input.category,
              title: input.title,
              content: input.content,
              enabled: true,
              updated_at: '2026-03-08T01:00:00.000Z',
            },
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/knowledge',
      payload: {
        category: '  test  ',
        title: '  Entry Title  ',
        content: '  Content here  ',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([
      {
        category: 'test',
        title: 'Entry Title',
        content: 'Content here',
      },
    ]);
    expect(response.json().ok).toBe(true);
    expect(response.json().item.category).toBe('test');

    await app.close();
  });

  it('rejects invalid knowledge entry creation', async () => {
    const app = createServer(buildDeps());

    const missingCategory = await app.inject({
      method: 'POST',
      url: '/api/admin/knowledge',
      payload: { title: 'T', content: 'C' },
    });

    expect(missingCategory.statusCode).toBe(400);
    expect(missingCategory.json()).toEqual({ detail: 'category_required' });

    const missingTitle = await app.inject({
      method: 'POST',
      url: '/api/admin/knowledge',
      payload: { category: 'C', content: 'C' },
    });

    expect(missingTitle.statusCode).toBe(400);
    expect(missingTitle.json()).toEqual({ detail: 'title_required' });

    const missingContent = await app.inject({
      method: 'POST',
      url: '/api/admin/knowledge',
      payload: { category: 'C', title: 'T' },
    });

    expect(missingContent.statusCode).toBe(400);
    expect(missingContent.json()).toEqual({ detail: 'content_required' });

    await app.close();
  });

  it('disables knowledge entry', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        disableKnowledgeEntry: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            item: {
              id: input.entryId,
              enabled: false,
              updated_at: '2026-03-08T02:00:00.000Z',
            },
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/knowledge/42/disable',
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([{ entryId: 42 }]);
    expect(response.json()).toEqual({
      ok: true,
      item: {
        id: 42,
        enabled: false,
        updated_at: '2026-03-08T02:00:00.000Z',
      },
    });

    await app.close();
  });

  it('gets and sets style profile with validation', async () => {
    let capturedProfile = 'auto';

    const app = createServer(
      buildDeps({
        getStyleProfile: () => ({
          ok: true,
          style_profile: capturedProfile,
          preset_profiles: ['auto', 'empathy', 'meme', 'normal'],
        }),
        setStyleProfile: (input) => {
          capturedProfile = input.styleProfile;
          return { ok: true, style_profile: input.styleProfile };
        },
      }),
    );

    const getResponse = await app.inject({
      method: 'GET',
      url: '/api/admin/style-profile',
    });

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json()).toEqual({
      ok: true,
      style_profile: 'auto',
      style: 'auto',
      preset_profiles: ['auto', 'empathy', 'meme', 'normal'],
    });

    const setResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/style-profile',
      payload: { style: '  EMPATHY  ' },
    });

    expect(setResponse.statusCode).toBe(200);
    expect(setResponse.json()).toEqual({ ok: true, style_profile: 'empathy', style: 'empathy' });

    const invalidResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/style-profile',
      payload: { style_profile: 'invalid' },
    });

    expect(invalidResponse.statusCode).toBe(400);
    expect(invalidResponse.json()).toEqual({ detail: 'invalid_style_profile' });

    await app.close();
  });

  it('gets and sets role profile with validation', async () => {
    let capturedProfile = 'auto';

    const app = createServer(
      buildDeps({
        getRoleProfile: () => ({
          ok: true,
          role_profile: capturedProfile,
          preset_profiles: ['auto', 'default', 'comfort', 'playful'],
        }),
        setRoleProfile: (input) => {
          capturedProfile = input.roleProfile;
          return { ok: true, role_profile: input.roleProfile };
        },
      }),
    );

    const getResponse = await app.inject({
      method: 'GET',
      url: '/api/admin/role-profile',
    });

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json()).toEqual({
      ok: true,
      role_profile: 'auto',
      role: 'auto',
      preset_profiles: ['auto', 'default', 'comfort', 'playful'],
    });

    const setResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/role-profile',
      payload: { role: '  COMFORT  ' },
    });

    expect(setResponse.statusCode).toBe(200);
    expect(setResponse.json()).toEqual({ ok: true, role_profile: 'comfort', role: 'comfort' });

    const invalidResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/role-profile',
      payload: { role_profile: 'invalid' },
    });

    expect(invalidResponse.statusCode).toBe(400);
    expect(invalidResponse.json()).toEqual({ detail: 'invalid_role_profile' });

    await app.close();
  });

  it('lists role cards with query clamping', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        listRoleCards: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            active_role_card_key: 'default',
            items: [
              {
                id: 1,
                key: 'default',
                name: 'Default Card',
                description: 'Default role card',
                system_prompt: 'You are helpful',
                tone: { style: 'friendly' },
                constraints: { max_length: 100 },
                enabled: true,
                is_active: true,
                created_at: '2026-03-08T00:00:00.000Z',
                updated_at: '2026-03-08T00:00:00.000Z',
              },
            ],
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/role-cards?limit=9999&offset=-5',
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([{ limit: 1000, offset: 0 }]);
    expect(response.json().active_role_card_key).toBe('default');
    expect(response.json().items).toHaveLength(1);

    await app.close();
  });

  it('creates role card with validation', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        createRoleCard: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            item: {
              id: 1,
              key: input.key,
              name: input.name,
              description: input.description,
              system_prompt: input.system_prompt,
              tone: input.tone,
              constraints: input.constraints,
              enabled: input.enabled,
              is_active: false,
              created_at: '2026-03-08T01:00:00.000Z',
              updated_at: '2026-03-08T01:00:00.000Z',
            },
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/role-cards',
      payload: {
        key: '  TEST-KEY  ',
        name: '  Test Card  ',
        description: 'Description',
        system_prompt: 'System prompt',
        tone: { style: 'formal' },
        constraints: { max_length: 200 },
        enabled: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([
      {
        key: 'test-key',
        name: 'Test Card',
        description: 'Description',
        system_prompt: 'System prompt',
        tone: { style: 'formal' },
        constraints: { max_length: 200 },
        enabled: true,
      },
    ]);

    await app.close();
  });

  it('rejects invalid role card creation', async () => {
    const app = createServer(buildDeps());

    const missingKey = await app.inject({
      method: 'POST',
      url: '/api/admin/role-cards',
      payload: { name: 'N', description: 'D', system_prompt: 'S' },
    });

    expect(missingKey.statusCode).toBe(400);
    expect(missingKey.json()).toEqual({ detail: 'role_card_key_required' });

    const missingName = await app.inject({
      method: 'POST',
      url: '/api/admin/role-cards',
      payload: { key: 'K', description: 'D', system_prompt: 'S' },
    });

    expect(missingName.statusCode).toBe(400);
    expect(missingName.json()).toEqual({ detail: 'role_card_name_required' });

    await app.close();
  });

  it('updates role card with partial fields', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        updateRoleCard: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            item: {
              id: 1,
              key: input.cardKey,
              name: input.name ?? 'Updated',
              description: input.description ?? '',
              system_prompt: input.system_prompt ?? '',
              tone: input.tone ?? {},
              constraints: input.constraints ?? {},
              enabled: input.enabled ?? true,
              is_active: false,
              created_at: '2026-03-08T00:00:00.000Z',
              updated_at: '2026-03-08T02:00:00.000Z',
            },
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/role-cards/test-key',
      payload: {
        name: '  Updated Name  ',
        description: 'New description',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([
      {
        cardKey: 'test-key',
        name: 'Updated Name',
        description: 'New description',
      },
    ]);

    await app.close();
  });

  it('disables and activates role card', async () => {
    const disableCaptured: Array<Record<string, unknown>> = [];
    const activateCaptured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        disableRoleCard: (input) => {
          disableCaptured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            item: {
              key: input.cardKey,
              enabled: false,
              is_active: false,
              updated_at: '2026-03-08T03:00:00.000Z',
            },
          };
        },
        activateRoleCard: (input) => {
          activateCaptured.push(input as unknown as Record<string, unknown>);
          return { ok: true, active_role_card_key: input.cardKey };
        },
      }),
    );

    const disableResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/role-cards/test-card/disable',
    });

    expect(disableResponse.statusCode).toBe(200);
    expect(disableCaptured).toEqual([{ cardKey: 'test-card' }]);
    expect(disableResponse.json()).toEqual({
      ok: true,
      item: {
        key: 'test-card',
        enabled: false,
        is_active: false,
        updated_at: '2026-03-08T03:00:00.000Z',
      },
    });

    const activateResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/role-cards/test-card/activate',
    });

    expect(activateResponse.statusCode).toBe(200);
    expect(activateCaptured).toEqual([{ cardKey: 'test-card' }]);
    expect(activateResponse.json()).toEqual({
      ok: true,
      active_role_card_key: 'test-card',
    });

    await app.close();
  });

  it('gets observability summary with window clamping', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        getObservabilitySummary: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            summary: {
              window_minutes: input.windowMinutes,
              metrics: { requests: 100 },
            },
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/observability/summary?window_minutes=9999',
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([{ windowMinutes: 1440 }]);
    expect(response.json()).toEqual({
      ok: true,
      summary: {
        window_minutes: 1440,
        metrics: { requests: 100 },
      },
    });

    await app.close();
  });
});

describe('comments domain parity', () => {
  it('ingests comment event from webhook', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        ingestCommentEvent: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            comment_id: input.event.comment_id,
            trace_id: 'trace-webhook-1',
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/events/comment',
      payload: {
        comment_id: 'comment-1',
        video_id: 'video-1',
        content: 'Test comment',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toHaveLength(1);
    expect(captured[0]).toMatchObject({
      event: {
        comment_id: 'comment-1',
        video_id: 'video-1',
        content: 'Test comment',
        source: 'webhook',
      },
      source: 'webhook',
    });
    expect(response.json()).toEqual({
      ok: true,
      comment_id: 'comment-1',
      trace_id: 'trace-webhook-1',
    });

    await app.close();
  });

  it('ingests comment event from bilibili platform', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        ingestCommentEvent: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            comment_id: input.event.comment_id,
            trace_id: 'trace-bilibili-1',
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/events/comment/bilibili',
      payload: {
        comment_id: 'bili-comment-1',
        content: 'Bilibili comment',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toHaveLength(1);
    expect(captured[0]).toMatchObject({
      event: {
        comment_id: 'bili-comment-1',
        platform: 'bilibili',
        source: 'bilibili',
      },
      source: 'bilibili',
    });

    await app.close();
  });

  it('returns degraded ingest response when event is persisted but not queued', async () => {
    const app = createServer(
      buildDeps({
        ingestCommentEvent: (input) => ({
          ok: false,
          queued: false,
          message: 'queue_unavailable',
          comment_id: input.event.comment_id,
          trace_id: 'trace-queue-down-1',
        }),
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/events/comment',
      payload: {
        comment_id: 'comment-degraded-1',
        content: 'Test comment',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: false,
      queued: false,
      message: 'queue_unavailable',
      comment_id: 'comment-degraded-1',
      trace_id: 'trace-queue-down-1',
    });

    await app.close();
  });

  it('rejects comment event without comment_id', async () => {
    const app = createServer(buildDeps());

    const response = await app.inject({
      method: 'POST',
      url: '/events/comment',
      payload: {
        video_id: 'video-1',
      },
    });

    expect(response.statusCode).toBe(400);
    expect((response.json() as { detail: string }).detail).toContain('comment_id');

    await app.close();
  });

  it('retries single job with optional parameters', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        retryJob: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            requeued: true,
            job_id: input.jobId,
            trace_id: 'trace-retry-1',
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/jobs/42/retry',
      payload: {
        force_long: true,
        style_profile: 'empathy',
        role_profile: 'comfort',
        role_card_key: 'test-card',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([
      {
        jobId: 42,
        forceLong: true,
        styleProfile: 'empathy',
        roleProfile: 'comfort',
        roleCardKey: 'test-card',
      },
    ]);
    expect(response.json()).toEqual({
      ok: true,
      requeued: true,
      job_id: 42,
      trace_id: 'trace-retry-1',
    });

    await app.close();
  });

  it('surfaces non-requeued single retry responses', async () => {
    const app = createServer(
      buildDeps({
        retryJob: (input) => ({
          ok: false,
          requeued: false,
          job_id: input.jobId,
          trace_id: 'trace-retry-down-1',
          error: 'queue_unavailable',
        }),
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/jobs/42/retry',
      payload: {},
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: false,
      requeued: false,
      job_id: 42,
      trace_id: 'trace-retry-down-1',
      error: 'queue_unavailable',
    });

    await app.close();
  });

  it('approves single job', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        approveJob: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            job_id: input.jobId,
            status: 'queued',
            trace_id: 'trace-approve-1',
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/jobs/100/approve',
      payload: {
        style_profile: 'meme',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([
      {
        jobId: 100,
        styleProfile: 'meme',
      },
    ]);

    await app.close();
  });

  it('rejects invalid job id for retry', async () => {
    const app = createServer(buildDeps());

    const response = await app.inject({
      method: 'POST',
      url: '/jobs/invalid/retry',
      payload: {},
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ detail: 'job_not_found' });

    await app.close();
  });

  it('approves batch jobs', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        approveJobsBatch: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            summary: { total: input.jobIds.length, success: input.jobIds.length, failed: 0 },
            results: input.jobIds.map((id) => ({ job_id: id, ok: true, status: 'queued' })),
            trace_id: 'trace-batch-approve-1',
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/jobs/approve-batch',
      payload: {
        job_ids: [1, 2, 3],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([{ jobIds: [1, 2, 3] }]);
    expect(response.json()).toMatchObject({
      ok: true,
      summary: { total: 3, success: 3, failed: 0 },
      trace_id: 'trace-batch-approve-1',
    });

    await app.close();
  });

  it('rejects empty job_ids for batch approve', async () => {
    const app = createServer(buildDeps());

    const response = await app.inject({
      method: 'POST',
      url: '/jobs/approve-batch',
      payload: {
        job_ids: [],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ detail: 'job_ids_required' });

    await app.close();
  });

  it('retries batch jobs with force_long', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        retryJobsBatch: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            summary: { total: input.jobIds.length, success: input.jobIds.length, failed: 0 },
            results: input.jobIds.map((id) => ({ job_id: id, ok: true, requeued: true })),
            trace_id: 'trace-batch-retry-1',
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/jobs/retry-batch',
      payload: {
        job_ids: [10, 20],
        force_long: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([
      {
        jobIds: [10, 20],
        forceLong: true,
      },
    ]);

    await app.close();
  });

  it('returns partial failure details for batch retry degradation', async () => {
    const app = createServer(
      buildDeps({
        retryJobsBatch: (input) => ({
          ok: false,
          summary: { total: input.jobIds.length, success: 1, failed: 1 },
          results: [
            { job_id: input.jobIds[0], ok: true, requeued: true },
            { job_id: input.jobIds[1], ok: false, requeued: false, error: 'queue_unavailable' },
          ],
          trace_id: 'trace-batch-retry-degraded-1',
        }),
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/jobs/retry-batch',
      payload: {
        job_ids: [10, 20],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: false,
      summary: { total: 2, success: 1, failed: 1 },
      results: [
        { job_id: 10, ok: true, requeued: true },
        { job_id: 20, ok: false, requeued: false, error: 'queue_unavailable' },
      ],
      trace_id: 'trace-batch-retry-degraded-1',
    });

    await app.close();
  });

  it('supports /api job aliases for get, retry, and approve', async () => {
    const getCaptured: Array<Record<string, unknown>> = [];
    const retryCaptured: Array<Record<string, unknown>> = [];
    const approveCaptured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        getJob: (input) => {
          getCaptured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            item: {
              id: input.jobId,
              comment_id: 'comment-1',
              status: 'queued',
            },
          };
        },
        retryJob: (input) => {
          retryCaptured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            requeued: true,
            job_id: input.jobId,
          };
        },
        approveJob: (input) => {
          approveCaptured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            job_id: input.jobId,
            status: 'queued',
          };
        },
      }),
    );

    const getResponse = await app.inject({
      method: 'GET',
      url: '/api/jobs/123',
    });
    expect(getResponse.statusCode).toBe(200);
    expect(getCaptured).toEqual([{ jobId: 123 }]);

    const retryResponse = await app.inject({
      method: 'POST',
      url: '/api/jobs/123/retry',
      payload: {
        force_long: true,
        style_profile: 'empathy',
      },
    });
    expect(retryResponse.statusCode).toBe(200);
    expect(retryCaptured).toEqual([
      {
        jobId: 123,
        forceLong: true,
        styleProfile: 'empathy',
        roleProfile: undefined,
        roleCardKey: undefined,
      },
    ]);

    const approveResponse = await app.inject({
      method: 'POST',
      url: '/api/jobs/123/approve',
      payload: {
        role_profile: 'comfort',
      },
    });
    expect(approveResponse.statusCode).toBe(200);
    expect(approveCaptured).toEqual([
      {
        jobId: 123,
        styleProfile: undefined,
        roleProfile: 'comfort',
        roleCardKey: undefined,
      },
    ]);

    await app.close();
  });

  it('supports /api job batch aliases and preserves validation', async () => {
    const approveCaptured: Array<Record<string, unknown>> = [];
    const retryCaptured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        approveJobsBatch: (input) => {
          approveCaptured.push(input as unknown as Record<string, unknown>);
          return { ok: true, summary: { total: input.jobIds.length, success: input.jobIds.length, failed: 0 } };
        },
        retryJobsBatch: (input) => {
          retryCaptured.push(input as unknown as Record<string, unknown>);
          return { ok: true, summary: { total: input.jobIds.length, success: input.jobIds.length, failed: 0 } };
        },
      }),
    );

    const approveResponse = await app.inject({
      method: 'POST',
      url: '/api/jobs/approve-batch',
      payload: {
        job_ids: [1, 2, 3],
      },
    });
    expect(approveResponse.statusCode).toBe(200);
    expect(approveCaptured).toEqual([{ jobIds: [1, 2, 3] }]);

    const retryResponse = await app.inject({
      method: 'POST',
      url: '/api/jobs/retry-batch',
      payload: {
        job_ids: [7, 8],
        force_long: true,
      },
    });
    expect(retryResponse.statusCode).toBe(200);
    expect(retryCaptured).toEqual([{ jobIds: [7, 8], forceLong: true }]);

    const invalidResponse = await app.inject({
      method: 'POST',
      url: '/api/jobs/approve-batch',
      payload: {
        job_ids: [],
      },
    });
    expect(invalidResponse.statusCode).toBe(400);
    expect(invalidResponse.json()).toEqual({ detail: 'job_ids_required' });

    await app.close();
  });

  it('supports /api comment detail alias', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        getComment: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            comment: {
              comment_id: input.commentId,
              content: 'alias comment',
            },
            jobs: [],
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/comments/comment-42',
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([{ commentId: 'comment-42' }]);
    expect(response.json()).toMatchObject({
      ok: true,
      comment: {
        comment_id: 'comment-42',
      },
    });

    await app.close();
  });

  it('exposes audit log and daily metrics aliases with auth parity', async () => {
    const app = createServer(
      buildDeps({
        settings: buildSettings({ apiKey: 'admin-key' }),
      }),
    );

    const urls = [
      '/api/audit-logs?limit=20&action=%20approve%20',
      '/api/audit-log?limit=20&ok=true',
      '/api/metrics/daily?days=30',
    ];

    for (const url of urls) {
      const response = await app.inject({
        method: 'GET',
        url,
      });
      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ detail: 'unauthorized' });
    }

    await app.close();
  });

  it('gets comment by id', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        getComment: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            comment: {
              comment_id: input.commentId,
              video_id: 'video-1',
              user_id: 'user-1',
              content: 'Test comment',
              parent_id: null,
              created_at: '2026-03-08T00:00:00.000Z',
            },
            jobs: [],
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/comments/test-comment-1',
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([{ commentId: 'test-comment-1' }]);
    expect(response.json()).toMatchObject({
      ok: true,
      comment: {
        comment_id: 'test-comment-1',
        video_id: 'video-1',
      },
    });

    await app.close();
  });

  it('gets job by id', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        getJob: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            item: {
              id: input.jobId,
              comment_id: 'comment-1',
              status: 'done',
              reply_text: 'Reply text',
              created_at: '2026-03-08T00:00:00.000Z',
            },
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/jobs/123',
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([{ jobId: 123 }]);

    await app.close();
  });

  it('rejects invalid job id for get', async () => {
    const app = createServer(buildDeps());

    const response = await app.inject({
      method: 'GET',
      url: '/jobs/invalid',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ detail: 'job_not_found' });

    await app.close();
  });

  it('lists jobs with status filter and pagination', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        listJobs: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            items: [
              {
                id: 1,
                comment_id: 'comment-1',
                status: input.status ?? 'pending',
                created_at: '2026-03-08T00:00:00.000Z',
              },
            ],
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/jobs?status=done&limit=100&offset=50',
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([
      {
        status: 'done',
        limit: 100,
        offset: 50,
      },
    ]);

    await app.close();
  });

  it('exports jobs as csv', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        exportJobsCsv: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return 'job_id,comment_id,status,created_at\n1,comment-1,done,2026-03-08T00:00:00Z\n';
        },
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/export/jobs.csv?status=done&limit=500',
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([
      {
        status: 'done',
        limit: 500,
      },
    ]);
    expect(response.headers['content-type']).toBe('text/csv');
    expect(response.body).toContain('job_id,comment_id');

    await app.close();
  });
});

describe('bilibili integration parity', () => {
  it('requires auth for bilibili status', async () => {
    const app = createServer(
      buildDeps({
        settings: buildSettings({ apiKey: 'admin-key' }),
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/bilibili/status',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ detail: 'unauthorized' });

    await app.close();
  });

  it('returns bilibili status with diagnostics', async () => {
    const app = createServer(
      buildDeps({
        getBilibiliStatus: () => ({
          ok: true,
          config: {
            enabled: true,
            poll_enabled: true,
            publish_enabled: false,
          },
          credential: {
            id: 1,
            name: 'Test Credential',
            is_active: true,
            expires_at: '2026-12-31T00:00:00.000Z',
          },
          videos: {
            poll_enabled_count: 5,
          },
          diagnostics: {
            ready: false,
            blocking_reasons: ['auth:no active credential'],
            effective_publish_mode: 'manual_queue',
          },
        }),
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/bilibili/status',
      headers: {
        'x-api-key': 'test-key',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      enabled: true,
      polling_enabled: true,
      publish_enabled: false,
      video_count: 5,
      config: {
        enabled: true,
        poll_enabled: true,
      },
      videos: {
        poll_enabled_count: 5,
      },
    });

    await app.close();
  });

  it('lists bilibili videos with query clamping', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        listBilibiliVideos: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            total: 1,
            items: [
              {
                id: 1,
                bvid: 'BV1GJ411x7fD',
                poll_enabled: true,
                title: 'Test Video',
              },
            ],
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/bilibili/videos?poll_enabled=true&limit=999&offset=-5',
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([
      {
        pollEnabled: true,
        limit: 200,
        offset: 0,
      },
    ]);
    expect(response.json()).toMatchObject({
      ok: true,
      total: 1,
      items: [
        {
          bvid: 'BV1GJ411x7fD',
          poll_enabled: true,
        },
      ],
    });

    await app.close();
  });

  it('adds bilibili video with validation', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        addBilibiliVideo: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            item: {
              id: 1,
              bvid: input.bvid,
              poll_enabled: input.pollEnabled ?? true,
              title: 'New Video',
            },
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/videos',
      payload: {
        bvid: 'BV1GJ411x7fD',
        poll_enabled: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([
      {
        bvid: 'BV1GJ411x7fD',
        pollEnabled: true,
      },
    ]);
    expect(response.json()).toMatchObject({
      ok: true,
      item: {
        bvid: 'BV1GJ411x7fD',
        poll_enabled: true,
      },
    });

    await app.close();
  });

  it('rejects invalid bvid format', async () => {
    const app = createServer(buildDeps());

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/videos',
      payload: {
        bvid: 'INVALID',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ detail: 'invalid_bvid_format' });

    await app.close();
  });

  it('rejects missing bvid', async () => {
    const app = createServer(buildDeps());

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/videos',
      payload: {
        title: 'Test',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ detail: 'bvid_required' });

    await app.close();
  });
});
