import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { registerGatewayPublishRoutes, type GatewayPublishRouteDependencies } from '../src/routes/gateway-publish.js';
import type { GatewayPublishPayload, RuntimeSettings } from '../src/server/contracts.js';

const prisma = vi.hoisted(() => ({
  publishLog: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock('../src/lib/prisma.js', () => ({
  getPrisma: () => prisma,
}));

function buildSettings(overrides: Partial<RuntimeSettings> = {}): RuntimeSettings {
  return {
    databaseUrl: 'file:./test.db',
    celeryBrokerUrl: 'redis://localhost:6379/0',
    celeryResultBackend: 'redis://localhost:6379/1',
    apiKey: '',
    adminSessionSecret: '',
    adminSessionTtlSeconds: 3600,
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
    platformBilibiliEnabled: true,
    platformQqEnabled: true,
    platformDouyinEnabled: true,
    platformKuaishouEnabled: true,
    platformBilibiliPublishSource: 'bilibili-bot',
    platformQqPublishSource: 'qq-sidecar',
    platformDouyinPublishSource: 'douyin-bot',
    platformKuaishouPublishSource: 'kuaishou-bot',
    ...overrides,
  };
}

function parsePublishPayload(body: unknown): GatewayPublishPayload | null {
  if (!body || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  if (typeof record.comment_id !== 'string' || typeof record.reply_text !== 'string') return null;
  if (!record.comment_id.trim() || !record.reply_text.trim()) return null;
  return {
    comment_id: record.comment_id,
    reply_text: record.reply_text,
    force_publish: Boolean(record.force_publish),
    source: typeof record.source === 'string' && record.source.trim() ? record.source : 'test-source',
    ...(typeof record.trace_id === 'string' ? { trace_id: record.trace_id } : {}),
    ...(typeof record.canonical_id === 'string' ? { canonical_id: record.canonical_id } : {}),
    ...(typeof record.container_id === 'string' ? { container_id: record.container_id } : {}),
    ...(typeof record.user_id === 'string' ? { user_id: record.user_id } : {}),
    ...(typeof record.parent_external_id === 'string' ? { parent_external_id: record.parent_external_id } : {}),
    ...(record.routing_metadata && typeof record.routing_metadata === 'object'
      ? { routing_metadata: record.routing_metadata as Record<string, string> }
      : {}),
  };
}

function buildDeps(overrides: Partial<GatewayPublishRouteDependencies> = {}): GatewayPublishRouteDependencies {
  return {
    settings: buildSettings(),
    checkApiKey: (request, reply, settings) => {
      const expected = settings.apiKey.trim();
      if (!expected || request.headers['x-api-key'] === expected) return true;
      void reply.code(401).send({ detail: 'unauthorized' });
      return false;
    },
    getHeaderValue: (value) => (Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '')),
    parseAdminLimit: (value, defaultValue, min, max) => {
      const parsed = Number.parseInt(String(value ?? ''), 10);
      if (!Number.isFinite(parsed)) return defaultValue;
      return Math.min(max, Math.max(min, parsed));
    },
    parseAdminOffset: (value, defaultValue, min, max) => {
      const parsed = Number.parseInt(String(value ?? ''), 10);
      if (!Number.isFinite(parsed)) return defaultValue;
      return Math.min(max, Math.max(min, parsed));
    },
    parseAdminString: (value) => (typeof value === 'string' && value.trim() ? value.trim() : undefined),
    parsePublishPayload,
    buildReplyHash: (commentId, replyText) => `${commentId}:${replyText}`,
    gatewaySignaturePayload: (payload) => ({ comment_id: payload.comment_id, reply_text: payload.reply_text }),
    createTraceId: (preferred) => preferred || 'trace-generated',
    verifyPayloadSignature: vi.fn(() => true),
    reservePublishLog: vi.fn(() => ({ duplicate: false, reservationKey: 'reservation-1' })),
    finalizePublishLog: vi.fn(),
    publishGatewayReply: vi.fn(() => ({
      published: true,
      reason: 'published',
      publishedAt: new Date('2026-06-09T00:00:00.000Z'),
    })),
    publishPlatformReply: vi.fn(() => ({
      published: true,
      reason: 'published',
      publishedAt: new Date('2026-06-09T00:00:00.000Z'),
    })),
    normalizePublishFailureReason: (reason) => reason || 'publish_failed',
    isPlatformEnabled: () => true,
    getPlatformPublishSource: (platform) => `${platform}-source`,
    listAdminGatewayLogs: vi.fn(() => ({
      total: 1,
      items: [
        {
          id: 1,
          comment_id: 'c-1',
          published_at: new Date('2026-06-09T00:00:00.000Z'),
          created_at: '2026-06-09T00:00:01.000Z',
        },
      ],
    })),
    normalizeIsoTimestamp: (value) =>
      value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString(),
    ...overrides,
  };
}

function createApp(deps: Partial<GatewayPublishRouteDependencies> = {}) {
  const app = Fastify();
  const resolvedDeps = buildDeps(deps);
  registerGatewayPublishRoutes(app, resolvedDeps);
  return { app, deps: resolvedDeps };
}

const payload = {
  comment_id: 'comment-1',
  reply_text: 'hello',
  source: 'manual',
};

afterEach(() => {
  vi.restoreAllMocks();
  prisma.publishLog.count.mockReset();
  prisma.publishLog.findMany.mockReset();
});

describe('gateway publish route coverage', () => {
  it('rejects invalid publish payloads and production partial auth configuration', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const { app } = createApp({
      settings: buildSettings({ apiKey: 'api-key', gatewayToken: 'token', gatewayHmacSecret: '' }),
    });

    try {
      const invalid = await app.inject({
        method: 'POST',
        url: '/gateway/publish',
        payload: { comment_id: 'comment-1' },
      });
      const partialAuth = await app.inject({
        method: 'POST',
        url: '/gateway/publish',
        payload,
        headers: { 'x-api-key': 'api-key', authorization: 'Bearer token' },
      });

      expect(invalid.statusCode).toBe(400);
      expect(invalid.json()).toEqual({ detail: 'invalid_payload' });
      expect(partialAuth.statusCode).toBe(503);
      expect(partialAuth.json()).toEqual({ detail: 'gateway_auth_unconfigured' });
    } finally {
      if (previous == null) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
      await app.close();
    }
  });

  it('fails closed in production when gateway auth is not fully configured', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const { app } = createApp();

    try {
      const response = await app.inject({ method: 'POST', url: '/gateway/publish', payload });

      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({ detail: 'gateway_auth_unconfigured' });
    } finally {
      if (previous == null) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
      await app.close();
    }
  });

  it('rejects invalid api keys, bearer tokens, missing signatures, and invalid signatures', async () => {
    const verifyPayloadSignature = vi.fn(() => false);
    const { app } = createApp({
      settings: buildSettings({ apiKey: 'api-key', gatewayToken: 'token', gatewayHmacSecret: 'secret' }),
      verifyPayloadSignature,
    });

    const wrongApiKey = await app.inject({
      method: 'POST',
      url: '/gateway/publish',
      headers: { 'x-api-key': 'wrong' },
      payload,
    });
    const wrongToken = await app.inject({
      method: 'POST',
      url: '/gateway/publish',
      headers: { 'x-api-key': 'api-key', authorization: 'Bearer wrong' },
      payload,
    });
    const missingSignature = await app.inject({
      method: 'POST',
      url: '/gateway/publish',
      headers: { 'x-api-key': 'api-key', authorization: 'Bearer token' },
      payload,
    });
    const invalidSignature = await app.inject({
      method: 'POST',
      url: '/gateway/publish',
      headers: { 'x-api-key': 'api-key', authorization: 'Bearer token', 'x-signature': 'bad' },
      payload,
    });

    expect(wrongApiKey.statusCode).toBe(401);
    expect(wrongToken.statusCode).toBe(401);
    expect(missingSignature.statusCode).toBe(401);
    expect(missingSignature.json()).toEqual({ detail: 'missing_signature' });
    expect(invalidSignature.statusCode).toBe(401);
    expect(invalidSignature.json()).toEqual({ detail: 'invalid_signature' });
    expect(verifyPayloadSignature).toHaveBeenCalledOnce();

    await app.close();
  });

  it('returns duplicate replays and successful publishes without published timestamps', async () => {
    const reservePublishLog = vi
      .fn()
      .mockReturnValueOnce({ duplicate: true, reservationKey: 'reservation-duplicate' })
      .mockReturnValueOnce({ duplicate: false, reservationKey: 'reservation-success' });
    const finalizePublishLog = vi.fn();
    const publishGatewayReply = vi.fn(() => ({ published: true, reason: undefined }));
    const { app } = createApp({ reservePublishLog, finalizePublishLog, publishGatewayReply });

    const duplicate = await app.inject({ method: 'POST', url: '/gateway/publish', payload });
    const success = await app.inject({
      method: 'POST',
      url: '/gateway/publish',
      headers: { 'x-trace-id': 'trace-header' },
      payload,
    });

    expect(duplicate.json()).toMatchObject({
      ok: true,
      published: false,
      duplicate: true,
      reason: 'idempotent_replay',
    });
    expect(success.json()).toEqual({
      ok: true,
      published: true,
      comment_id: 'comment-1',
      published_at: null,
      trace_id: 'trace-header',
    });
    expect(finalizePublishLog).toHaveBeenCalledWith(
      expect.objectContaining({ reservationKey: 'reservation-success', status: 'published', publishedAt: undefined }),
    );

    await app.close();
  });

  it('uses platform publish metadata and finalizes failed and successful platform attempts', async () => {
    const finalizePublishLog = vi.fn();
    const publishPlatformReply = vi
      .fn()
      .mockResolvedValueOnce({ published: false, reason: undefined })
      .mockResolvedValueOnce({
        published: true,
        reason: 'published',
        publishedAt: new Date('2026-06-09T00:00:00.000Z'),
      });
    const { app } = createApp({
      finalizePublishLog,
      publishPlatformReply,
      createTraceId: () => 'trace-platform',
    });

    const failed = await app.inject({
      method: 'POST',
      url: '/gateway/publish/qq',
      payload: {
        ...payload,
        canonical_id: 'qq:comment-1',
        container_id: 'room-1',
        user_id: 'user-1',
        parent_external_id: 'parent-1',
        routing_metadata: { scene: 'comment' },
      },
    });
    const success = await app.inject({ method: 'POST', url: '/gateway/publish/qq', payload });

    expect(failed.statusCode).toBe(200);
    expect(failed.json()).toMatchObject({ ok: false, reason: 'publish_failed', trace_id: 'trace-platform' });
    expect(success.json()).toMatchObject({
      ok: true,
      published: true,
      comment_id: 'comment-1',
      published_at: '2026-06-09T00:00:00.000Z',
    });
    expect(publishPlatformReply).toHaveBeenCalledWith(
      expect.objectContaining({
        platform: 'qq',
        canonicalId: 'qq:comment-1',
        containerId: 'room-1',
        userId: 'user-1',
        parentExternalId: 'parent-1',
        routingMetadata: { scene: 'comment' },
      }),
    );
    expect(finalizePublishLog).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ status: 'failed', failureReason: 'publish_failed', source: 'manual' }),
    );
    expect(finalizePublishLog).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ status: 'published', source: 'qq-source' }),
    );

    await app.close();
  });

  it('returns Prisma backed gateway publish logs with parsed filters', async () => {
    prisma.publishLog.count.mockResolvedValue(1);
    prisma.publishLog.findMany.mockResolvedValue([
      {
        id: 7,
        platform: 'bilibili',
        canonical_comment_id: 'bilibili:c-1',
        comment_id: 'c-1',
        reply_hash: 'hash',
        source: 'manual',
        status: 'published',
        published_at: new Date('2026-06-09T00:00:00.000Z'),
        failure_reason: null,
        created_at: new Date('2026-06-09T00:00:01.000Z'),
      },
    ]);
    const { app } = createApp({ settings: buildSettings({ apiKey: 'admin-key' }) });

    const response = await app.inject({
      method: 'GET',
      url: '/gateway/publish-logs?status=published&limit=999&offset=2',
      headers: { 'x-api-key': 'admin-key' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      total: 1,
      items: [
        {
          id: 7,
          platform: 'bilibili',
          canonical_comment_id: 'bilibili:c-1',
          comment_id: 'c-1',
          reply_hash: 'hash',
          source: 'manual',
          status: 'published',
          published_at: '2026-06-09T00:00:00.000Z',
          failure_reason: null,
          created_at: '2026-06-09T00:00:01.000Z',
        },
      ],
    });
    expect(prisma.publishLog.count).toHaveBeenCalledWith({ where: { status: 'published' } });
    expect(prisma.publishLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 2, take: 500, where: { status: 'published' } }),
    );

    await app.close();
  });

  it('rejects unauthorized gateway log aliases and serializes missing log timestamps', async () => {
    prisma.publishLog.count.mockResolvedValue(1);
    prisma.publishLog.findMany.mockResolvedValue([
      {
        id: 8,
        platform: 'qq',
        canonical_comment_id: 'qq:c-8',
        comment_id: 'c-8',
        reply_hash: 'hash-8',
        source: 'qq-sidecar',
        status: 'failed',
        published_at: null,
        failure_reason: 'publish_failed',
        created_at: null,
      },
    ]);
    const { app } = createApp({ settings: buildSettings({ apiKey: 'admin-key' }) });

    const unauthorizedPublishLogs = await app.inject({ method: 'GET', url: '/gateway/publish-logs' });
    const unauthorizedAdminLogs = await app.inject({ method: 'GET', url: '/api/admin/gateway/logs' });
    const unauthorizedAdminPublishLogs = await app.inject({ method: 'GET', url: '/api/admin/gateway/publish-logs' });
    const logs = await app.inject({
      method: 'GET',
      url: '/gateway/publish-logs',
      headers: { 'x-api-key': 'admin-key' },
    });

    expect(unauthorizedPublishLogs.statusCode).toBe(401);
    expect(unauthorizedAdminLogs.statusCode).toBe(401);
    expect(unauthorizedAdminPublishLogs.statusCode).toBe(401);
    expect(logs.json().items[0]).toMatchObject({
      id: 8,
      published_at: null,
      created_at: null,
      failure_reason: 'publish_failed',
    });
    expect(prisma.publishLog.count).toHaveBeenCalledWith({ where: {} });

    await app.close();
  });

  it('normalizes admin gateway log aliases and preserves alias envelope differences', async () => {
    const listAdminGatewayLogs = vi.fn(() => ({
      total: 1,
      items: [
        {
          id: 2,
          comment_id: 'c-2',
          published_at: new Date('2026-06-09T00:00:02.000Z'),
          created_at: '2026-06-09T00:00:03.000Z',
        },
      ],
    }));
    const { app } = createApp({
      settings: buildSettings({ apiKey: 'admin-key' }),
      listAdminGatewayLogs,
    });

    const logs = await app.inject({
      method: 'GET',
      url: '/api/admin/gateway/logs?comment_id=c-2&limit=500',
      headers: { 'x-api-key': 'admin-key' },
    });
    const publishLogs = await app.inject({
      method: 'GET',
      url: '/api/admin/gateway/publish-logs?comment_id=c-2&limit=500',
      headers: { 'x-api-key': 'admin-key' },
    });

    expect(logs.json()).toMatchObject({ ok: true, total: 1 });
    expect(publishLogs.json()).toMatchObject({ total: 1 });
    expect(publishLogs.json()).not.toHaveProperty('ok');
    expect(logs.json().items[0]).toMatchObject({
      published_at: '2026-06-09T00:00:02.000Z',
      created_at: '2026-06-09T00:00:03.000Z',
    });
    expect(listAdminGatewayLogs).toHaveBeenCalledWith({ commentId: 'c-2', limit: 200 });

    await app.close();
  });
});
