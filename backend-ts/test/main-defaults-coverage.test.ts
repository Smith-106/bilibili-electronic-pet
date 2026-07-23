/* eslint-disable @typescript-eslint/no-explicit-any */

import { createHmac } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RuntimeSettings } from '../src/server/contracts.js';
import { resetPlatformControlState, setPlatformControlState } from '../src/platforms/control-state.js';

const {
  buildDefaultServerDependenciesMock,
  capturedDefaultInput,
  createMemoryServiceMock,
  createPetCoreServiceMock,
  postReplyMock,
  prismaMock,
  publishViaSidecarWebhookMock,
  redisClientMock,
  redisConfigs,
  RedisMock,
} = vi.hoisted(() => {
  const capturedDefaultInput: { current: any } = { current: null };
  const redisConfigs: any[] = [];
  const redisClientMock = {
    connect: vi.fn(),
    ping: vi.fn(),
    disconnect: vi.fn(),
  };
  const RedisMock = vi.fn(function Redis(config: any) {
    redisConfigs.push(config);
    return redisClientMock;
  });
  const prismaMock = {
    $queryRawUnsafe: vi.fn(),
    bilibiliCredential: {
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    bilibiliVideo: {
      count: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    comment: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    knowledgeEntry: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    operationAuditLog: {
      count: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    publishLog: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    replyJob: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    observabilityEvent: {
      groupBy: vi.fn(),
    },
    roleCard: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  };
  const createMemoryServiceMock = vi.fn();
  const createPetCoreServiceMock = vi.fn();
  const postReplyMock = vi.fn();
  const publishViaSidecarWebhookMock = vi.fn();

  const buildDefaultServerDependenciesMock = vi.fn((input: any) => {
    capturedDefaultInput.current = input;
    const settings = input.buildSettings();
    const logStore = input.createLogStore();
    const diagnostics = () => input.buildBilibiliDiagnostics(settings, input.probeBilibiliAuth);

    return {
      settings,
      checkDatabaseConnection: () => input.checkDatabaseConnection(),
      checkRedisConnection: () => input.checkRedisConnection(),
      probeBilibiliAuth: (config: any) => input.probeBilibiliAuth(config),
      buildBilibiliDiagnostics: diagnostics,
      verifyPayloadSignature: input.verifyPayloadSignature,
      reservePublishLog: (value: any) => logStore.reserve(value),
      finalizePublishLog: (value: any) => logStore.finalize(value),
      publishGatewayReply: () => ({ published: false, reason: 'not_configured' }),
      publishPlatformReply: () => ({ published: false, reason: 'not_configured' }),
      normalizePublishFailureReason: input.normalizePublishFailureReason,
      isPlatformEnabled: input.isPlatformEnabled,
      getPlatformPublishSource: input.getPlatformPublishSource,
      createTraceId: input.createTraceId,
      getAdminOverview: input.getAdminOverview,
      listAdminJobs: (value: any) => input.listAdminJobs(value),
      listAdminGatewayLogs: (value: any) => input.listAdminGatewayLogs(value),
      summarizeAdminAuditLogs: (value: any) => input.summarizeAdminAuditLogs(value),
      listKnowledgeEntries: (value: any) => input.listKnowledgeEntries(value),
      createKnowledgeEntry: (value: any) => input.createKnowledgeEntry(value),
      disableKnowledgeEntry: (value: any) => input.disableKnowledgeEntry(value),
      listMemorySpaces: (value: any) => input.listMemorySpaces(value),
      createMemorySpace: (value: any) => input.createMemorySpace(value),
      listMemoryItems: (value: any) => input.listMemoryItems(value),
      upsertMemoryItem: (value: any) => input.upsertMemoryItem(value),
      listMemoryGrants: (value: any) => input.listMemoryGrants(value),
      grantMemorySpaceAccess: (value: any) => input.grantMemorySpaceAccess(value),
      listMemoryIdentityLinks: (value: any) => input.listMemoryIdentityLinks(value),
      linkMemoryIdentity: (value: any) => input.linkMemoryIdentity(value),
      getStyleProfile: input.getStyleProfile,
      setStyleProfile: (value: any) => input.setStyleProfile(value),
      getRoleProfile: input.getRoleProfile,
      setRoleProfile: (value: any) => input.setRoleProfile(value),
      listRoleCards: (value: any) => input.listRoleCards(value),
      createRoleCard: (value: any) => input.createRoleCard(value),
      updateRoleCard: (value: any) => input.updateRoleCard(value),
      disableRoleCard: (value: any) => input.disableRoleCard(value),
      activateRoleCard: (value: any) => input.activateRoleCard(value),
      getObservabilitySummary: (value: any) => input.getObservabilitySummary(value),
      ingestCommentEvent: (value: any) => input.ingestCommentEvent(value),
      retryJob: (value: any) => input.retryJob(value),
      approveJob: (value: any) => input.approveJob(value),
      approveJobsBatch: (value: any) => input.approveJobsBatch(value),
      retryJobsBatch: (value: any) => input.retryJobsBatch(value),
      getComment: (value: any) => input.getComment(value),
      getJob: (value: any) => input.getJob(value),
      listJobs: (value: any) => input.listJobs(value),
      exportJobsCsv: (value: any) => input.exportJobsCsv(value),
      getBilibiliStatus: () => input.getBilibiliStatus({ settings, buildBilibiliDiagnostics: diagnostics }),
      listBilibiliVideos: (value: any) => input.listBilibiliVideos(value),
      addBilibiliVideo: (value: any) => input.addBilibiliVideo(value),
      getCompanionState: input.getCompanionState,
      getCompanionStateV2: input.getCompanionStateV2,
      recordCompanionAction: (value: any) => input.recordCompanionAction(value),
      listPlatformConnections: () => input.listPlatformConnections(settings),
      updatePlatformConnectionControl: (value: any) => input.updatePlatformConnectionControl(settings, value),
    };
  });

  return {
    buildDefaultServerDependenciesMock,
    capturedDefaultInput,
    createMemoryServiceMock,
    createPetCoreServiceMock,
    postReplyMock,
    prismaMock,
    publishViaSidecarWebhookMock,
    redisClientMock,
    redisConfigs,
    RedisMock,
  };
});

vi.mock('../src/server/dependencies.js', () => ({
  buildDefaultServerDependencies: buildDefaultServerDependenciesMock,
}));

vi.mock('../src/lib/prisma.js', () => ({
  DEFAULT_DATABASE_URL: 'file:./default-test.db',
  getPrisma: () => prismaMock,
  // H4 fix: checkDatabaseConnection 委派到 lib/prisma.ts — mock 工厂须暴露, 复刻原 $queryRawUnsafe('SELECT 1') 逻辑使测试断言成立.
  checkDatabaseConnection: async () => {
    try {
      await prismaMock.$queryRawUnsafe('SELECT 1');
      return { connected: true };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'database_unavailable',
      };
    }
  },
}));

vi.mock('ioredis', () => ({
  Redis: RedisMock,
}));

vi.mock('../src/app/memory/index.js', () => ({
  createMemoryService: createMemoryServiceMock,
}));

vi.mock('../src/app/pet-core/index.js', () => ({
  createPetCoreService: createPetCoreServiceMock,
}));

vi.mock('../src/services/bilibili-client.js', () => ({
  postReply: postReplyMock,
  probeBilibiliAuth: vi.fn(() => ({ ok: false, reason: 'not_configured' })),
}));

vi.mock('../src/platforms/sidecar-webhook.js', () => ({
  publishViaSidecarWebhook: publishViaSidecarWebhookMock,
}));

const { createServer, __mainTesting } = await import('../src/main.js');

const platformControlTempDirs: string[] = [];

function useIsolatedPlatformControlState(prefix = 'platform-control-main-defaults-'): void {
  const tempDir = mkdtempSync(join(tmpdir(), prefix));
  platformControlTempDirs.push(tempDir);
  process.env.PLATFORM_CONTROL_STATE_FILE = join(tempDir, 'control-state.json');
}

function cleanupPlatformControlTempDirs(): void {
  while (platformControlTempDirs.length > 0) {
    const tempDir = platformControlTempDirs.pop();
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  }
}

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
    publisherMode: 'manual_queue',
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

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
    .join(',')}}`;
}

function signPayload(payload: Record<string, unknown>, secret: string): string {
  return createHmac('sha256', secret).update(stableStringify(payload), 'utf8').digest('hex');
}

async function captureDefaults(): Promise<any> {
  const app = createServer();
  await app.close();
  return capturedDefaultInput.current;
}

function resetEnv(): void {
  for (const key of [
    'ADMIN_SESSION_TTL_SECONDS',
    'ADMIN_SESSION_SECRET',
    'API_KEY',
    'BILIBILI_BILI_JCT',
    'BILIBILI_BUVID3',
    'BILIBILI_ENABLED',
    'BILIBILI_POLL_ENABLED',
    'BILIBILI_POLL_INTERVAL_SECONDS',
    'BILIBILI_PUBLISH_ENABLED',
    'BILIBILI_SESSDATA',
    'CELERY_BROKER_URL',
    'CELERY_RESULT_BACKEND',
    'COMMENT_INGRESS_TOKEN',
    'DATABASE_URL',
    'GATEWAY_HMAC_SECRET',
    'GATEWAY_TOKEN',
    'KILL_SWITCH',
    'LLM_API_KEY',
    'LLM_FALLBACK_TO_MOCK',
    'LLM_PROVIDER',
    'NODE_ENV',
    'PLATFORM_BILIBILI_ENABLED',
    'PLATFORM_BILIBILI_PUBLISH_SOURCE',
    'PLATFORM_DOUYIN_ENABLED',
    'PLATFORM_DOUYIN_PUBLISH_SOURCE',
    'PLATFORM_DOUYIN_WEBHOOK_URL',
    'PLATFORM_KUAISHOU_ENABLED',
    'PLATFORM_KUAISHOU_PUBLISH_SOURCE',
    'PLATFORM_KUAISHOU_WEBHOOK_URL',
    'PLATFORM_QQ_ENABLED',
    'PLATFORM_QQ_PUBLISH_SOURCE',
    'PLATFORM_QQ_WEBHOOK_URL',
    'PUBLISHER_MODE',
    'PUBLISHER_WEBHOOK_TOKEN',
    'PUBLISHER_WEBHOOK_URL',
    'PUBLIC_COMPANION_ACTIONS_ENABLED',
    'REDIS_HOST',
    'REDIS_PASSWORD',
    'REDIS_PORT',
    'ROLE_PROFILE_DEFAULT',
    'SEARCH_API_KEY',
    'SEARCH_CX',
    'SEARCH_PROVIDER',
    'STYLE_PROFILE_DEFAULT',
  ]) {
    delete process.env[key];
  }
}

function resetMocks(): void {
  buildDefaultServerDependenciesMock.mockClear();
  capturedDefaultInput.current = null;
  createMemoryServiceMock.mockReset();
  createPetCoreServiceMock.mockReset();
  postReplyMock.mockReset();
  publishViaSidecarWebhookMock.mockReset();
  RedisMock.mockClear();
  redisConfigs.length = 0;
  redisClientMock.connect.mockReset();
  redisClientMock.ping.mockReset();
  redisClientMock.disconnect.mockReset();
  prismaMock.$queryRawUnsafe.mockReset();
  prismaMock.bilibiliCredential.findFirst.mockReset();
  prismaMock.bilibiliCredential.count.mockReset();
  prismaMock.bilibiliCredential.create.mockReset();
  prismaMock.bilibiliCredential.findUnique.mockReset();
  prismaMock.bilibiliCredential.updateMany.mockReset();
  prismaMock.bilibiliCredential.update.mockReset();
  prismaMock.bilibiliCredential.delete.mockReset();
  prismaMock.bilibiliVideo.count.mockReset();
  prismaMock.bilibiliVideo.findMany.mockReset();
  prismaMock.bilibiliVideo.create.mockReset();
  prismaMock.bilibiliVideo.update.mockReset();
  prismaMock.bilibiliVideo.findUnique.mockReset();
  prismaMock.bilibiliVideo.delete.mockReset();
  prismaMock.comment.count.mockReset();
  prismaMock.comment.findMany.mockReset();
  prismaMock.knowledgeEntry.findMany.mockReset();
  prismaMock.knowledgeEntry.create.mockReset();
  prismaMock.knowledgeEntry.update.mockReset();
  prismaMock.operationAuditLog.count.mockReset();
  prismaMock.operationAuditLog.create.mockReset();
  prismaMock.operationAuditLog.findMany.mockReset();
  prismaMock.publishLog.findUnique.mockReset();
  prismaMock.publishLog.findFirst.mockReset();
  prismaMock.publishLog.findMany.mockReset();
  prismaMock.publishLog.create.mockReset();
  prismaMock.publishLog.updateMany.mockReset();
  prismaMock.replyJob.count.mockReset();
  prismaMock.replyJob.groupBy.mockReset();
  prismaMock.replyJob.findMany.mockReset();
  prismaMock.observabilityEvent.groupBy.mockReset();
  prismaMock.roleCard.findMany.mockReset();
  prismaMock.roleCard.create.mockReset();
  prismaMock.roleCard.update.mockReset();
  prismaMock.roleCard.updateMany.mockReset();
  vi.restoreAllMocks();
  resetPlatformControlState();
  resetEnv();
}

beforeEach(() => {
  useIsolatedPlatformControlState();
  resetMocks();
});

afterEach(() => {
  resetMocks();
  delete process.env.PLATFORM_CONTROL_STATE_FILE;
  cleanupPlatformControlTempDirs();
});

describe('main default dependency coverage', () => {
  it('builds settings, checks database and redis, and verifies sorted HMAC payloads', async () => {
    process.env.LLM_PROVIDER = 'openai';
    process.env.LLM_API_KEY = 'sk-test';
    process.env.LLM_FALLBACK_TO_MOCK = 'off';
    process.env.SEARCH_PROVIDER = 'google';
    process.env.SEARCH_API_KEY = 'search-key';
    process.env.SEARCH_CX = 'cx';
    process.env.BILIBILI_ENABLED = 'yes';
    process.env.BILIBILI_POLL_ENABLED = 'true';
    process.env.BILIBILI_PUBLISH_ENABLED = 'on';
    process.env.BILIBILI_SESSDATA = 'sess';
    process.env.BILIBILI_BILI_JCT = 'jct';
    process.env.BILIBILI_BUVID3 = 'buvid';
    process.env.KILL_SWITCH = '1';
    process.env.PUBLIC_COMPANION_ACTIONS_ENABLED = 'true';
    process.env.ADMIN_SESSION_TTL_SECONDS = 'invalid';
    process.env.REDIS_HOST = 'redis.local';
    process.env.REDIS_PORT = '6380';
    process.env.REDIS_PASSWORD = 'secret';

    const defaults = await captureDefaults();
    const settings = defaults.buildSettings();

    expect(settings).toMatchObject({
      llmProvider: 'openai',
      llmApiKeyConfigured: true,
      llmFallbackToMock: false,
      searchProvider: 'google',
      searchApiKeyConfigured: true,
      searchCxConfigured: true,
      bilibiliEnabled: true,
      bilibiliPollEnabled: true,
      bilibiliPublishEnabled: true,
      bilibiliEnvCredentialConfigured: true,
      killSwitch: true,
      publicCompanionActionsEnabled: true,
      adminSessionTtlSeconds: 60 * 60 * 12,
    });

    prismaMock.bilibiliCredential.findFirst.mockResolvedValueOnce(null);
    await expect(
      defaults.buildBilibiliDiagnostics(buildSettings({ publisherMode: 'manual_queue' }), vi.fn()),
    ).resolves.toMatchObject({
      ready: false,
      effective_publish_mode: 'manual_queue',
    });

    prismaMock.$queryRawUnsafe.mockResolvedValueOnce([{ ok: 1 }]);
    await expect(defaults.checkDatabaseConnection()).resolves.toEqual({ connected: true });
    expect(prismaMock.$queryRawUnsafe).toHaveBeenCalledWith('SELECT 1');

    prismaMock.$queryRawUnsafe.mockRejectedValueOnce(new Error('db_down'));
    await expect(defaults.checkDatabaseConnection()).resolves.toEqual({ connected: false, error: 'db_down' });
    prismaMock.$queryRawUnsafe.mockRejectedValueOnce('offline');
    await expect(defaults.checkDatabaseConnection()).resolves.toEqual({
      connected: false,
      error: 'database_unavailable',
    });

    redisClientMock.connect.mockResolvedValue(undefined);
    redisClientMock.ping.mockResolvedValueOnce('PONG').mockResolvedValueOnce('NOPE');
    await expect(defaults.checkRedisConnection()).resolves.toEqual({ connected: true });
    await expect(defaults.checkRedisConnection()).resolves.toEqual({ connected: false });
    redisClientMock.connect.mockRejectedValueOnce('redis_offline');
    await expect(defaults.checkRedisConnection()).resolves.toEqual({
      connected: false,
      error: 'redis_unavailable',
    });
    redisClientMock.connect.mockRejectedValueOnce(new Error('redis_down'));
    await expect(defaults.checkRedisConnection()).resolves.toEqual({
      connected: false,
      error: 'redis_down',
    });
    expect(redisConfigs.at(0)).toMatchObject({
      host: 'redis.local',
      port: 6380,
      password: 'secret',
      lazyConnect: true,
      connectTimeout: 1000,
    });
    expect(redisClientMock.disconnect).toHaveBeenCalledTimes(4);

    const payload = { z: [2, { b: true, a: 'first' }], a: 'root' };
    const signature = signPayload(payload, 'secret');
    expect(defaults.verifyPayloadSignature(payload, 'secret', signature.toUpperCase())).toBe(true);
    expect(defaults.verifyPayloadSignature(payload, 'secret', 'not-hex')).toBe(false);
    expect(defaults.verifyPayloadSignature(payload, 'secret', signature.replace(/.$/, '0'))).toBe(false);
  });

  it('uses durable publish log fallbacks for missing reservation_key migrations and conflicts', async () => {
    const defaults = await captureDefaults();
    const logStore = defaults.createLogStore();
    const input = {
      platform: 'bilibili',
      canonicalCommentId: 'bilibili:comment:1',
      commentId: 'comment-1',
      replyHash: 'hash-1',
      source: 'admin',
    };
    const missingReservationKey = new Error('SQLITE_ERROR: no such column: reservation_key');

    prismaMock.publishLog.findUnique.mockRejectedValueOnce(missingReservationKey);
    prismaMock.publishLog.findFirst.mockResolvedValueOnce({ id: 42 });
    await expect(logStore.reserve(input)).resolves.toEqual({
      duplicate: true,
      reservationKey: 'publish-log:42',
    });

    prismaMock.publishLog.findUnique.mockResolvedValueOnce(null);
    prismaMock.publishLog.create.mockRejectedValueOnce(missingReservationKey).mockResolvedValueOnce({ id: 43 });
    await expect(logStore.reserve({ ...input, replyHash: 'hash-2' })).resolves.toMatchObject({
      duplicate: false,
    });
    expect(prismaMock.publishLog.create).toHaveBeenLastCalledWith({
      data: {
        platform: 'bilibili',
        canonical_comment_id: 'bilibili:comment:1',
        comment_id: 'comment-1',
        reply_hash: 'hash-2',
        source: 'admin',
        status: 'pending',
        published_at: null,
        failure_reason: null,
      },
    });

    prismaMock.publishLog.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 44, reservation_key: null });
    prismaMock.publishLog.create.mockRejectedValueOnce(new Error('unique constraint failed'));
    await expect(logStore.reserve({ ...input, replyHash: 'hash-3' })).resolves.toEqual({
      duplicate: true,
      reservationKey: 'publish-log:44',
    });

    prismaMock.publishLog.findUnique.mockRejectedValueOnce(new Error('database offline'));
    await expect(logStore.reserve({ ...input, replyHash: 'hash-4' })).rejects.toThrow('database offline');

    prismaMock.publishLog.findUnique.mockResolvedValueOnce(null);
    prismaMock.publishLog.create
      .mockRejectedValueOnce(missingReservationKey)
      .mockRejectedValueOnce(missingReservationKey);
    prismaMock.publishLog.findFirst.mockResolvedValueOnce(null);
    await expect(logStore.reserve({ ...input, replyHash: 'hash-5' })).rejects.toThrow(
      'SQLITE_ERROR: no such column: reservation_key',
    );

    prismaMock.publishLog.findUnique.mockResolvedValueOnce(null);
    prismaMock.publishLog.create
      .mockRejectedValueOnce(missingReservationKey)
      .mockRejectedValueOnce(missingReservationKey);
    prismaMock.publishLog.findFirst.mockResolvedValueOnce({ id: 45 });
    await expect(logStore.reserve({ ...input, replyHash: 'hash-6' })).resolves.toEqual({
      duplicate: true,
      reservationKey: 'publish-log:45',
    });

    const retryError = new Error('retry insert failed');
    prismaMock.publishLog.findUnique.mockResolvedValueOnce(null);
    prismaMock.publishLog.create.mockRejectedValueOnce(missingReservationKey).mockRejectedValueOnce(retryError);
    await expect(logStore.reserve({ ...input, replyHash: 'hash-7' })).rejects.toThrow('retry insert failed');

    const createError = new Error('create failed without conflict');
    prismaMock.publishLog.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    prismaMock.publishLog.create.mockRejectedValueOnce(createError);
    await expect(logStore.reserve({ ...input, replyHash: 'hash-8' })).rejects.toThrow('create failed without conflict');

    prismaMock.publishLog.updateMany.mockResolvedValueOnce({ count: 1 });
    await expect(
      logStore.finalize({
        reservationKey: 'reservation-ok',
        status: 'published',
        source: 'admin',
        failureReason: undefined,
        publishedAt: undefined,
      }),
    ).resolves.toBeUndefined();
    expect(prismaMock.publishLog.updateMany).toHaveBeenLastCalledWith({
      where: { reservation_key: 'reservation-ok' },
      data: {
        status: 'published',
        source: 'admin',
        failure_reason: null,
        published_at: null,
        reservation_key: null,
      },
    });

    prismaMock.publishLog.updateMany.mockRejectedValueOnce(missingReservationKey);
    await expect(
      logStore.finalize({
        reservationKey: 'reservation-missing-column',
        status: 'failed',
        source: 'admin',
        failureReason: 'timeout',
        publishedAt: new Date('2026-06-09T05:00:00.000Z'),
      }),
    ).resolves.toBeUndefined();

    prismaMock.publishLog.updateMany.mockRejectedValueOnce(new Error('write failed'));
    await expect(
      logStore.finalize({
        reservationKey: 'reservation-error',
        status: 'failed',
        source: 'admin',
        failureReason: '5xx',
        publishedAt: null,
      }),
    ).rejects.toThrow('write failed');
  });

  it('publishes gateway replies through default manual, simulated, webhook, native, and fallback modes', async () => {
    const payload = { comment_id: 'c-1', reply_text: 'hello', force_publish: true, source: 'admin' };

    for (const [publisherMode, expected] of [
      ['manual_queue', { ok: true, published: true, reason: 'manual_queued', status: 'pending_review' }],
      ['simulated', { ok: true, published: true, reason: 'simulated', status: 'published' }],
      ['unknown', { ok: false, published: false, reason: 'not_configured', status: 'failed' }],
    ] as const) {
      const finalized: any[] = [];
      const app = createServer({
        settings: buildSettings({ publisherMode }),
        reservePublishLog: () => ({ duplicate: false, reservationKey: `reservation-${publisherMode}` }),
        finalizePublishLog: (input) => finalized.push(input),
        createTraceId: () => `trace-${publisherMode}`,
      });

      const response = await app.inject({ method: 'POST', url: '/gateway/publish', payload });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        ok: expected.ok,
        published: expected.published,
        reason: expected.reason,
      });
      expect(finalized[0]).toMatchObject({
        status: expected.status,
        source: 'admin',
        reservationKey: `reservation-${publisherMode}`,
      });

      await app.close();
    }

    const missingWebhookApp = createServer({
      settings: buildSettings({ publisherMode: 'webhook' }),
      reservePublishLog: () => ({ duplicate: false, reservationKey: 'reservation-webhook-missing' }),
      finalizePublishLog: vi.fn(),
    });
    const missingWebhook = await missingWebhookApp.inject({ method: 'POST', url: '/gateway/publish', payload });
    expect(missingWebhook.json()).toMatchObject({
      ok: false,
      published: false,
      reason: 'webhook_not_configured',
    });
    await missingWebhookApp.close();

    process.env.PUBLISHER_WEBHOOK_URL = 'https://publisher.example/reply';
    process.env.PUBLISHER_WEBHOOK_TOKEN = 'publisher-token';
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ reason: 'remote_ok', published_at: '2026-06-09T00:00:00.000Z' }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    const webhookFinalized: any[] = [];
    const webhookApp = createServer({
      settings: buildSettings({ publisherMode: 'webhook' }),
      reservePublishLog: () => ({ duplicate: false, reservationKey: 'reservation-webhook' }),
      finalizePublishLog: (input) => webhookFinalized.push(input),
      createTraceId: () => 'trace-webhook',
    });
    const webhookResponse = await webhookApp.inject({ method: 'POST', url: '/gateway/publish', payload });
    expect(webhookResponse.json()).toMatchObject({ ok: true, published: true, reason: 'remote_ok' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://publisher.example/reply',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer publisher-token' }),
      }),
    );
    expect(webhookFinalized[0]).toMatchObject({ status: 'published', source: 'admin' });
    expect(webhookFinalized[0].publishedAt.toISOString()).toBe('2026-06-09T00:00:00.000Z');
    await webhookApp.close();

    const failedFetch = vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }));
    vi.stubGlobal('fetch', failedFetch);
    const webhookHttpApp = createServer({
      settings: buildSettings({ publisherMode: 'webhook' }),
      reservePublishLog: () => ({ duplicate: false, reservationKey: 'reservation-webhook-http' }),
      finalizePublishLog: vi.fn(),
    });
    const webhookHttpResponse = await webhookHttpApp.inject({ method: 'POST', url: '/gateway/publish', payload });
    expect(webhookHttpResponse.json()).toMatchObject({ ok: false, reason: '5xx' });
    await webhookHttpApp.close();

    postReplyMock.mockResolvedValueOnce({ success: false }).mockResolvedValueOnce({ success: true, rpid: 'rpid-1' });
    const nativeDisabledApp = createServer({
      settings: buildSettings({
        publisherMode: 'native_bilibili',
        bilibiliEnabled: false,
        bilibiliPublishEnabled: false,
      }),
      reservePublishLog: () => ({ duplicate: false, reservationKey: 'reservation-native-disabled' }),
      finalizePublishLog: vi.fn(),
    });
    const nativeDisabled = await nativeDisabledApp.inject({ method: 'POST', url: '/gateway/publish', payload });
    expect(nativeDisabled.json()).toMatchObject({ ok: false, reason: 'bilibili_not_configured' });
    await nativeDisabledApp.close();

    const nativeFailApp = createServer({
      settings: buildSettings({ publisherMode: 'real_publish', bilibiliEnabled: true, bilibiliPublishEnabled: true }),
      reservePublishLog: () => ({ duplicate: false, reservationKey: 'reservation-native-fail' }),
      finalizePublishLog: vi.fn(),
    });
    const nativeFail = await nativeFailApp.inject({ method: 'POST', url: '/gateway/publish', payload });
    expect(nativeFail.json()).toMatchObject({ ok: false, reason: 'publish_failed' });
    await nativeFailApp.close();

    const nativeOkApp = createServer({
      settings: buildSettings({
        publisherMode: 'native_bilibili',
        bilibiliEnabled: true,
        bilibiliPublishEnabled: true,
      }),
      reservePublishLog: () => ({ duplicate: false, reservationKey: 'reservation-native-ok' }),
      finalizePublishLog: vi.fn(),
    });
    const nativeOk = await nativeOkApp.inject({ method: 'POST', url: '/gateway/publish', payload });
    expect(nativeOk.json()).toMatchObject({ ok: true, published: true, reason: 'published' });
    await nativeOkApp.close();
  });

  it('uses default platform publishing for bilibili references and sidecar platforms', async () => {
    const payload = {
      comment_id: 'qq-comment-1',
      reply_text: 'hello qq',
      force_publish: false,
      source: 'admin',
      canonical_id: 'qq:comment:1',
      container_id: 'group-1',
      parent_external_id: 'parent-1',
      routing_metadata: { room: 'alpha' },
    };

    const bilibiliApp = createServer({
      settings: buildSettings({ platformBilibiliEnabled: true }),
      reservePublishLog: () => ({ duplicate: false, reservationKey: 'reservation-bilibili-platform' }),
      finalizePublishLog: vi.fn(),
    });
    const bilibili = await bilibiliApp.inject({ method: 'POST', url: '/gateway/publish/bilibili', payload });
    expect(bilibili.json()).toMatchObject({ ok: false, reason: 'bilibili_reference_adapter_only' });
    await bilibiliApp.close();

    publishViaSidecarWebhookMock
      .mockResolvedValueOnce({ published: false, reason: 'not_configured' })
      .mockResolvedValueOnce({ published: false, reason: 'sidecar_http_502' })
      .mockResolvedValueOnce({
        published: true,
        reason: 'sidecar_ok',
        publishedAt: new Date('2026-06-09T01:00:00.000Z'),
      });
    setPlatformControlState('qq', { enabled: true, updatedAt: '2026-06-09T01:00:00.000Z' });
    const finalized: any[] = [];
    const app = createServer({
      settings: buildSettings({ platformQqEnabled: true, platformQqPublishSource: 'qq-sidecar-custom' }),
      reservePublishLog: () => ({ duplicate: false, reservationKey: 'reservation-qq' }),
      finalizePublishLog: (input) => finalized.push(input),
      createTraceId: () => 'trace-qq',
    });

    const missing = await app.inject({ method: 'POST', url: '/gateway/publish/qq', payload });
    const httpFailure = await app.inject({ method: 'POST', url: '/gateway/publish/qq', payload });
    const success = await app.inject({ method: 'POST', url: '/gateway/publish/qq', payload });

    expect(missing.json()).toMatchObject({ ok: false, reason: 'sidecar_webhook_not_configured' });
    expect(httpFailure.json()).toMatchObject({ ok: false, reason: '5xx' });
    expect(success.json()).toMatchObject({ ok: true, published: true, reason: 'sidecar_ok' });
    expect(publishViaSidecarWebhookMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        platform: 'qq',
        commentId: 'qq-comment-1',
        canonicalId: 'qq:comment:1',
        traceId: 'trace-qq',
        route: expect.objectContaining({
          containerId: 'group-1',
          parentExternalId: 'parent-1',
          metadata: { room: 'alpha' },
        }),
      }),
    );
    expect(finalized.at(-1)).toMatchObject({
      status: 'published',
      source: 'qq-sidecar-custom',
      publishedAt: new Date('2026-06-09T01:00:00.000Z'),
    });
    await app.close();
  });

  it('covers default memory providers, profiles, and observability summary', async () => {
    const now = new Date('2026-06-09T02:00:00.000Z');
    const memoryService = {
      listAccessibleSpaces: vi.fn(async () => [
        {
          id: 2,
          space_key: 'user:alice',
          space_type: 'operator',
          title: 'Alice',
          summary: 'Accessible',
          created_at: now,
          updated_at: now,
        },
      ]),
      listSpaces: vi.fn(async () => [
        {
          id: 1,
          space_key: 'system',
          space_type: 'system',
          title: 'System',
          summary: 'All',
          created_at: now,
          updated_at: now,
        },
      ]),
      createSpace: vi.fn(async (input) => ({
        id: 3,
        space_type: input.space_type ?? 'operator',
        summary: input.summary ?? '',
        created_at: now,
        updated_at: now,
        ...input,
      })),
      listItems: vi.fn(async () => [
        {
          id: 4,
          space_id: 1,
          item_key: 'status',
          content: 'Memory content',
          content_type: 'note',
          source: 'operator',
          item_metadata: { score: 1 },
          created_at: now,
          updated_at: now,
        },
      ]),
      upsertItem: vi.fn(async (input) => ({
        id: 5,
        content_type: input.content_type ?? 'note',
        source: input.source ?? 'operator',
        item_metadata: input.item_metadata ?? {},
        created_at: now,
        updated_at: now,
        ...input,
      })),
      listGrants: vi.fn(async () => [
        {
          id: 6,
          space_id: 1,
          subject_type: 'user',
          subject_id: 'alice',
          access_level: 'write',
          created_at: now,
          updated_at: now,
        },
      ]),
      grantSpaceAccess: vi.fn(async (input) => ({
        id: 7,
        access_level: input.access_level ?? 'read',
        created_at: now,
        updated_at: now,
        ...input,
      })),
      listIdentityLinks: vi.fn(async () => [
        {
          id: 8,
          subject_type: 'user',
          subject_id: 'alice',
          platform: 'bilibili',
          external_id: 'uid-1',
          display_name: null,
          created_at: now,
          updated_at: now,
        },
      ]),
      linkIdentity: vi.fn(async (input) => ({
        id: 9,
        platform: input.platform ?? 'bilibili',
        display_name: input.display_name ?? null,
        created_at: now,
        updated_at: now,
        ...input,
      })),
    };
    createMemoryServiceMock.mockReturnValue(memoryService);
    const defaults = await captureDefaults();

    await expect(
      defaults.listMemorySpaces({ limit: 1, offset: 0, subjectType: 'user', subjectId: 'alice' }),
    ).resolves.toMatchObject({ ok: true, items: [{ id: 2, created_at: now.toISOString() }] });
    await expect(defaults.listMemorySpaces({ limit: 1, offset: 0, spaceType: 'system' })).resolves.toMatchObject({
      items: [{ space_key: 'system' }],
    });
    await expect(defaults.createMemorySpace({ space_key: 'new', title: 'New' })).resolves.toMatchObject({
      item: { space_type: 'operator', summary: '' },
    });
    await expect(
      defaults.listMemoryItems({ limit: 1, offset: 0, spaceId: 1, itemKey: 'status', source: 'operator' }),
    ).resolves.toMatchObject({ items: [{ item_key: 'status', item_metadata: { score: 1 } }] });
    await expect(defaults.upsertMemoryItem({ space_id: 1, item_key: 'x', content: 'body' })).resolves.toMatchObject({
      item: { content_type: 'note', source: 'operator' },
    });
    await expect(defaults.listMemoryGrants({ limit: 1, offset: 0, spaceId: 1 })).resolves.toMatchObject({
      items: [{ subject_id: 'alice' }],
    });
    await expect(
      defaults.grantMemorySpaceAccess({ space_id: 1, subject_type: 'user', subject_id: 'bob' }),
    ).resolves.toMatchObject({ item: { access_level: 'read' } });
    await expect(
      defaults.listMemoryIdentityLinks({ limit: 1, offset: 0, platform: 'bilibili' }),
    ).resolves.toMatchObject({ items: [{ external_id: 'uid-1' }] });
    await expect(
      defaults.linkMemoryIdentity({ subject_type: 'user', subject_id: 'bob', external_id: 'uid-2' }),
    ).resolves.toMatchObject({ item: { platform: 'bilibili', display_name: null } });

    expect(defaults.getStyleProfile()).toMatchObject({ style_profile: 'auto' });
    await expect(defaults.setStyleProfile({ styleProfile: 'meme' })).resolves.toEqual({
      ok: true,
      style_profile: 'meme',
    });
    delete process.env.ROLE_PROFILE_DEFAULT;
    expect(defaults.getRoleProfile()).toMatchObject({ role_profile: 'auto' });
    process.env.ROLE_PROFILE_DEFAULT = 'comfort';
    expect(defaults.getRoleProfile()).toMatchObject({ role_profile: 'comfort' });
    await expect(defaults.setRoleProfile({ roleProfile: 'playful' })).resolves.toEqual({
      ok: true,
      role_profile: 'playful',
    });
    prismaMock.observabilityEvent.groupBy.mockResolvedValueOnce([
      { error_subclass: 'behavior_anomaly', _count: { _all: 3 } },
      { error_subclass: 'rate_limit', _count: { _all: 5 } },
    ]);
    await expect(defaults.getObservabilitySummary({ windowMinutes: 30 })).resolves.toEqual({
      ok: true,
      summary: {
        window_minutes: 30,
        by_error_subclass: { behavior_anomaly: 3, rate_limit: 5 },
        observability_drop_count: 0,
      },
    });
  });

  it('derives default companion states from pet-core, memory, legacy v2 fallback, and degraded paths', async () => {
    const now = new Date('2026-06-09T03:00:00.000Z');
    const petCoreState = {
      petName: 'Core Mochi',
      statusLine: 'Core ready',
      loopMode: 'Core',
      lastCheckIn: now.toISOString(),
      adapterLabel: 'Core adapter',
      loopHint: 'Core hint',
      mood: { label: 'Bonded', note: 'Core note' },
      memoryTitle: 'Core memory',
      memorySummary: 'Core summary',
      vitals: [{ label: 'Bond', value: '80%' }],
      recentSignals: ['core signal'],
      recentInteractions: [],
    };
    const petCoreV2 = {
      version: 'v2',
      snapshot: {
        profile: { petName: 'Core Mochi' },
        relationship: { level: 'Bonded', note: 'Core note' },
        progress: { stage: 'core', progressLabel: 'Core ready', nextMilestone: null },
        needs: [],
        proactiveSignals: [],
      },
      companion: petCoreState,
    };
    const petCoreService = {
      getCompanionState: vi.fn(),
      getCompanionStateV2: vi.fn(),
      recordAction: vi.fn(),
    };
    createPetCoreServiceMock.mockReturnValue(petCoreService);
    const defaults = await captureDefaults();

    petCoreService.getCompanionState.mockResolvedValueOnce(petCoreState);
    await expect(defaults.getCompanionState()).resolves.toBe(petCoreState);

    petCoreService.getCompanionState.mockResolvedValue(null);
    const memoryService = {
      listSpaces: vi.fn(async () => [
        {
          id: 1,
          space_key: 'companion:system',
          space_type: 'system',
          title: 'Companion System',
          summary: 'Signals',
          created_at: now,
          updated_at: now,
        },
        {
          id: 2,
          space_key: 'operator:alice',
          space_type: 'operator',
          title: 'Alice',
          summary: 'Operator memory',
          created_at: now,
          updated_at: now,
        },
      ]),
      listItems: vi.fn(async () => [
        {
          id: 11,
          space_id: 1,
          item_key: 'pat',
          content: 'Pat content',
          content_type: 'companion_event',
          source: 'companion_action',
          item_metadata: { action: 'pat', entry_mode: 'history' },
          created_at: now,
          updated_at: now,
        },
        {
          id: 12,
          space_id: 1,
          item_key: 'feed',
          content: 'Feed content',
          content_type: 'companion_event',
          source: 'companion_action',
          item_metadata: { action: 'feed', entry_mode: 'history' },
          created_at: now,
          updated_at: now,
        },
        {
          id: 13,
          space_id: 1,
          item_key: 'wake',
          content: 'Wake content',
          content_type: 'companion_event',
          source: 'companion_action',
          item_metadata: { action: 'wake', entry_mode: 'history' },
          created_at: now,
          updated_at: now,
        },
        {
          id: 14,
          space_id: 1,
          item_key: 'fallback',
          content: 'Fallback content',
          content_type: 'companion_event',
          source: 'fallback_worker',
          item_metadata: { action: 'fallback', entry_mode: 'history' },
          created_at: now,
          updated_at: now,
        },
        {
          id: 15,
          space_id: 2,
          item_key: 'summary',
          content: 'General item',
          content_type: 'note',
          source: 'operator',
          item_metadata: {},
          created_at: now,
          updated_at: now,
        },
      ]),
      listGrants: vi.fn(async () => [
        {
          id: 21,
          space_id: 2,
          subject_type: 'user',
          subject_id: 'alice',
          access_level: 'read',
          created_at: now,
          updated_at: now,
        },
      ]),
      listIdentityLinks: vi.fn(async () => [
        {
          id: 31,
          subject_type: 'user',
          subject_id: 'alice',
          platform: 'bilibili',
          external_id: 'uid-1',
          display_name: 'Alice',
          created_at: now,
          updated_at: now,
        },
      ]),
    };
    createMemoryServiceMock.mockReturnValue(memoryService);

    const memoryState = await defaults.getCompanionState();
    expect(memoryState).toMatchObject({
      petName: 'Mochi',
      mood: { label: 'Attentive' },
      recentInteractions: [
        { kind: 'pat', title: 'Pat interaction' },
        { kind: 'feed', title: 'Feed interaction' },
        { kind: 'wake', title: 'Wake interaction' },
        { kind: 'fallback', title: 'Fallback interaction' },
      ],
    });
    expect(memoryState.memorySummary).toContain('Pat interaction');

    createMemoryServiceMock.mockReturnValue({
      listSpaces: vi.fn(async () => [
        {
          id: 1,
          space_key: 'companion:system',
          space_type: 'system',
          title: 'Companion System',
          summary: '',
          created_at: null,
          updated_at: null,
        },
      ]),
      listItems: vi.fn(async () => [
        {
          id: 16,
          space_id: 1,
          item_key: 'signal',
          content: 'Signal content',
          content_type: 'companion_event',
          source: '',
          item_metadata: { action: 'unknown' },
          created_at: null,
          updated_at: null,
        },
      ]),
      listGrants: vi.fn(async () => []),
      listIdentityLinks: vi.fn(async () => []),
    });
    const signalState = await defaults.getCompanionState();
    expect(signalState.recentInteractions[0]).toMatchObject({
      kind: 'signal',
      title: 'Unknown interaction',
      timestamp: 'Pending',
      source: 'System',
    });

    createMemoryServiceMock.mockReturnValue({
      listSpaces: vi.fn(async () => [
        {
          id: 3,
          space_key: 'operator:notes',
          space_type: 'user',
          title: 'Operator Notes',
          summary: '',
          created_at: now,
          updated_at: now,
        },
      ]),
      listItems: vi.fn(async () => [
        {
          id: 17,
          space_id: 3,
          item_key: 'general',
          content: 'General memory content',
          content_type: 'note',
          source: 'operator',
          item_metadata: {},
          created_at: now,
          updated_at: now,
        },
      ]),
      listGrants: vi.fn(async () => []),
      listIdentityLinks: vi.fn(async () => []),
    });
    const pendingFeedState = await defaults.getCompanionState();
    expect(pendingFeedState.recentInteractions[0]).toMatchObject({
      title: 'Companion feed pending',
      detail: 'Persisted memory exists, but no companion-specific feed items have been written yet.',
      timestamp: now.toISOString(),
    });
    expect(pendingFeedState.memorySummary).toContain('1 persisted memory item');
    expect(pendingFeedState.vitals).toEqual(expect.arrayContaining([{ label: 'Focus', value: 'Active memory' }]));

    createMemoryServiceMock.mockReturnValue({
      listSpaces: vi.fn(async () => [
        {
          id: 4,
          space_key: 'blank:title',
          space_type: 'user',
          title: '',
          summary: '',
          created_at: now,
          updated_at: now,
        },
      ]),
      listItems: vi.fn(async () => []),
      listGrants: vi.fn(async () => []),
      listIdentityLinks: vi.fn(async () => []),
    });
    const untitledSpaceState = await defaults.getCompanionState();
    expect(untitledSpaceState.memorySummary).toBe('Known spaces: untitled.');
    expect(untitledSpaceState.vitals).toEqual(expect.arrayContaining([{ label: 'Focus', value: 'Persisted' }]));

    createMemoryServiceMock.mockReturnValue({
      listSpaces: vi.fn(async () => []),
      listItems: vi.fn(async () => []),
      listGrants: vi.fn(async () => []),
      listIdentityLinks: vi.fn(async () => []),
    });
    const emptyState = await defaults.getCompanionState();
    expect(emptyState).toMatchObject({
      mood: { label: 'Settling' },
      recentInteractions: [{ title: 'No companion interactions yet' }],
    });

    createMemoryServiceMock.mockReturnValue({
      listSpaces: vi.fn(async () => {
        throw 'memory-offline';
      }),
      listItems: vi.fn(),
      listGrants: vi.fn(),
      listIdentityLinks: vi.fn(),
    });
    const degradedState = await defaults.getCompanionState();
    expect(degradedState).toMatchObject({
      loopMode: 'Backend companion degraded',
      mood: { note: expect.stringContaining('unknown_backend_error') },
    });

    createMemoryServiceMock.mockReturnValue({
      listSpaces: vi.fn(async () => {
        throw new Error('memory_db_down');
      }),
      listItems: vi.fn(),
      listGrants: vi.fn(),
      listIdentityLinks: vi.fn(),
    });
    const errorDegradedState = await defaults.getCompanionState();
    expect(errorDegradedState).toMatchObject({
      loopMode: 'Backend companion degraded',
      mood: { note: expect.stringContaining('memory_db_down') },
    });

    petCoreService.getCompanionStateV2.mockResolvedValueOnce(petCoreV2);
    await expect(defaults.getCompanionStateV2()).resolves.toBe(petCoreV2);
    petCoreService.getCompanionStateV2.mockRejectedValueOnce(new Error('v2 offline'));
    createMemoryServiceMock.mockReturnValue({
      listSpaces: vi.fn(async () => []),
      listItems: vi.fn(async () => []),
      listGrants: vi.fn(async () => []),
      listIdentityLinks: vi.fn(async () => []),
    });
    await expect(defaults.getCompanionStateV2()).resolves.toMatchObject({
      version: 'v2',
      snapshot: { profile: { petName: 'Mochi' } },
      companion: { petName: 'Mochi' },
    });
    petCoreService.getCompanionStateV2.mockResolvedValueOnce(null);
    createMemoryServiceMock.mockReturnValue({
      listSpaces: vi.fn(async () => []),
      listItems: vi.fn(async () => []),
      listGrants: vi.fn(async () => []),
      listIdentityLinks: vi.fn(async () => []),
    });
    await expect(defaults.getCompanionStateV2()).resolves.toMatchObject({
      version: 'v2',
      snapshot: { profile: { petName: 'Mochi' } },
      companion: { petName: 'Mochi' },
    });
  });

  it('records default companion actions into memory and tolerates pet-core persistence failures', async () => {
    const now = new Date('2026-06-09T04:00:00.000Z');
    const memoryService = {
      listSpaces: vi.fn(async () => [
        {
          id: 1,
          space_key: 'companion:system',
          space_type: 'system',
          title: 'Companion System',
          summary: '',
          created_at: now,
          updated_at: now,
        },
      ]),
      createSpace: vi.fn(),
      upsertItem: vi.fn(async (input) => ({
        id: Math.floor(Math.random() * 1000),
        content_type: input.content_type ?? 'companion_signal',
        source: input.source ?? 'system',
        item_metadata: input.item_metadata ?? {},
        created_at: now,
        updated_at: now,
        ...input,
      })),
    };
    const petCoreService = {
      getCompanionState: vi.fn(),
      getCompanionStateV2: vi.fn(),
      recordAction: vi
        .fn()
        .mockRejectedValueOnce('pet-core-offline')
        .mockRejectedValueOnce(new Error('pet-core-error')),
    };
    createMemoryServiceMock.mockReturnValue(memoryService);
    createPetCoreServiceMock.mockReturnValue(petCoreService);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const defaults = await captureDefaults();

    await expect(defaults.recordCompanionAction({ action: 'feed', note: ' snack time ' })).resolves.toMatchObject({
      ok: true,
      action: 'feed',
      item_key: 'action:feed-latest',
    });
    await expect(defaults.recordCompanionAction({ action: 'wake' })).resolves.toMatchObject({
      ok: true,
      action: 'wake',
      item_key: 'action:wake-latest',
    });

    expect(memoryService.upsertItem).toHaveBeenCalledWith(
      expect.objectContaining({
        space_id: 1,
        item_key: 'action:feed-latest',
        content_type: 'companion_signal',
        source: 'companion_action',
        item_metadata: expect.objectContaining({ action: 'feed', note: ' snack time ', entry_mode: 'latest' }),
      }),
    );
    expect(memoryService.upsertItem).toHaveBeenCalledWith(
      expect.objectContaining({
        item_key: expect.stringMatching(/^action:feed:/),
        content_type: 'companion_event',
        item_metadata: expect.objectContaining({ entry_mode: 'history' }),
      }),
    );
    expect(petCoreService.recordAction).toHaveBeenCalledTimes(2);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('pet_core_action_persist_failed'));
  });

  it('serves default admin overview, job lists, gateway logs, and audit summaries from prisma', async () => {
    const defaults = await captureDefaults();
    const now = new Date('2026-06-09T06:00:00.000Z');

    prismaMock.comment.count.mockResolvedValueOnce(5);
    prismaMock.replyJob.count.mockResolvedValueOnce(4);
    prismaMock.replyJob.groupBy.mockResolvedValueOnce([
      { status: 'published', _count: 2 },
      { status: 'manual_queue', _count: { _all: 1 } },
      { status: 'blocked', _count: { _all: 1 } },
      { status: 'unknown', _count: { _all: Number.NaN } },
    ]);
    await expect(defaults.getAdminOverview()).resolves.toMatchObject({
      totals: {
        comments: 5,
        jobs: 4,
        published: 2,
        pending_review: 2,
        failed: 0,
      },
      by_status: {
        published: 2,
        manual_queue: 1,
        blocked: 1,
        unknown: 0,
      },
    });

    prismaMock.comment.count.mockResolvedValueOnce(1);
    prismaMock.replyJob.count.mockResolvedValueOnce(1);
    prismaMock.replyJob.groupBy.mockResolvedValueOnce([{ status: 'manual_queue', _count: { _all: 1 } }]);
    await expect(defaults.getAdminOverview()).resolves.toMatchObject({
      totals: {
        published: 0,
        pending_review: 1,
      },
      total_published: 0,
    });

    prismaMock.replyJob.count.mockResolvedValueOnce(2);
    prismaMock.replyJob.findMany.mockResolvedValueOnce([
      {
        id: 11,
        comment_id: 'c-1',
        canonical_comment_id: 'bilibili:c-1',
        status: 'manual_queue',
        reply_text: 'reply 1',
        risk_flags: JSON.stringify({ reason: 'manual', blocked_words: ['spam'], flags: ['review'] }),
        published_at: null,
        created_at: now,
      },
      {
        id: 12,
        comment_id: 'c-2',
        canonical_comment_id: null,
        status: '',
        reply_text: 'reply 2',
        risk_flags: ['pii', ''],
        published_at: now,
        created_at: now,
      },
    ]);
    prismaMock.comment.findMany.mockResolvedValueOnce([
      { comment_id: 'c-1', canonical_comment_id: 'bilibili:c-1', content: 'first comment' },
      { comment_id: 'c-2', canonical_comment_id: 'bilibili:c-2', content: 'second comment' },
    ]);
    await expect(defaults.listAdminJobs({ status: 'pending_review', limit: 20, offset: 3 })).resolves.toMatchObject({
      total: 2,
      limit: 20,
      offset: 3,
      items: [
        {
          id: '11',
          status: 'pending_review',
          raw_status: 'manual_queue',
          comment_text: 'first comment',
          risk_flags: ['manual', 'spam', 'review'],
        },
        {
          id: '12',
          status: 'queued',
          raw_status: '',
          comment_text: 'second comment',
          risk_flags: ['pii'],
          published_at: now.toISOString(),
        },
      ],
    });
    expect(prismaMock.replyJob.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { status: { in: ['manual_queue', 'blocked', 'dedupe_skipped'] } },
        skip: 3,
        take: 20,
      }),
    );

    prismaMock.replyJob.count.mockResolvedValueOnce(0);
    prismaMock.replyJob.findMany.mockResolvedValueOnce([]);
    await expect(defaults.listAdminJobs({ status: 'failed', limit: 5, offset: 0 })).resolves.toMatchObject({
      items: [],
      total: 0,
    });

    prismaMock.replyJob.count.mockResolvedValueOnce(1);
    prismaMock.replyJob.findMany.mockResolvedValueOnce([
      {
        id: 13,
        comment_id: 'plain-only',
        canonical_comment_id: null,
        status: 'manual_queue',
        reply_text: 'plain reply',
        risk_flags: {},
        published_at: null,
        created_at: now,
      },
    ]);
    prismaMock.comment.findMany.mockResolvedValueOnce([]);
    await expect(defaults.listAdminJobs({ limit: 1, offset: 0 })).resolves.toMatchObject({
      items: [{ id: '13', comment_text: null, comment_content: null }],
    });
    expect(prismaMock.comment.findMany).toHaveBeenLastCalledWith({
      where: {
        OR: [{ comment_id: { in: ['plain-only'] } }],
      },
    });

    prismaMock.replyJob.count.mockResolvedValueOnce(1);
    prismaMock.replyJob.findMany.mockResolvedValueOnce([
      {
        id: 14,
        comment_id: '',
        canonical_comment_id: 'bilibili:canon-only',
        status: 'manual_queue',
        reply_text: 'canonical reply',
        risk_flags: {},
        published_at: null,
        created_at: now,
      },
    ]);
    prismaMock.comment.findMany.mockResolvedValueOnce([]);
    await expect(defaults.listAdminJobs({ limit: 1, offset: 0 })).resolves.toMatchObject({
      items: [{ id: '14', comment_text: null, comment_content: null }],
    });
    expect(prismaMock.comment.findMany).toHaveBeenLastCalledWith({
      where: {
        OR: [{ canonical_comment_id: { in: ['bilibili:canon-only'] } }],
      },
    });

    prismaMock.publishLog.findMany.mockResolvedValueOnce([
      {
        id: 21,
        platform: 'bilibili',
        canonical_comment_id: 'bilibili:c-1',
        comment_id: 'c-1',
        reply_hash: 'hash',
        source: 'admin',
        status: 'published',
        published_at: now,
        failure_reason: null,
        created_at: now,
      },
      {
        id: 22,
        platform: 'qq',
        canonical_comment_id: null,
        comment_id: null,
        reply_hash: 'hash-2',
        source: 'qq-sidecar',
        status: 'failed',
        published_at: null,
        failure_reason: 'timeout',
        created_at: now,
      },
    ]);
    prismaMock.replyJob.findMany.mockResolvedValueOnce([
      { canonical_comment_id: 'bilibili:c-1', comment_id: 'c-1', reply_text: 'gateway reply' },
    ]);
    await expect(defaults.listAdminGatewayLogs({ commentId: 'c-1', limit: 10 })).resolves.toMatchObject({
      items: [
        {
          id: 21,
          reply_text: 'gateway reply',
          published_at: now.toISOString(),
        },
        {
          id: 22,
          reply_text: null,
          failure_reason: 'timeout',
        },
      ],
    });

    prismaMock.publishLog.findMany.mockResolvedValueOnce([{ id: 23, comment_id: null, canonical_comment_id: null }]);
    await expect(defaults.listAdminGatewayLogs({ limit: 1 })).resolves.toMatchObject({
      items: [{ id: 23, reply_text: null }],
    });

    prismaMock.publishLog.findMany.mockResolvedValueOnce([
      { id: 24, comment_id: 'plain-gateway', canonical_comment_id: null },
    ]);
    prismaMock.replyJob.findMany.mockResolvedValueOnce([
      { canonical_comment_id: null, comment_id: 'plain-gateway', reply_text: null },
      { canonical_comment_id: null, comment_id: 'plain-gateway', reply_text: 'duplicate ignored' },
    ]);
    await expect(defaults.listAdminGatewayLogs({ limit: 1 })).resolves.toMatchObject({
      items: [{ id: 24, reply_text: null }],
    });
    expect(prismaMock.replyJob.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { OR: [{ comment_id: { in: ['plain-gateway'] } }] },
      }),
    );

    prismaMock.publishLog.findMany.mockResolvedValueOnce([
      { id: 25, comment_id: null, canonical_comment_id: 'bilibili:gateway-canon' },
    ]);
    prismaMock.replyJob.findMany.mockResolvedValueOnce([
      { canonical_comment_id: 'bilibili:gateway-canon', comment_id: null, reply_text: 'canonical gateway reply' },
      { canonical_comment_id: 'bilibili:gateway-canon', comment_id: null, reply_text: 'duplicate ignored' },
    ]);
    await expect(defaults.listAdminGatewayLogs({ limit: 1 })).resolves.toMatchObject({
      items: [{ id: 25, reply_text: 'canonical gateway reply' }],
    });
    expect(prismaMock.replyJob.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { OR: [{ canonical_comment_id: { in: ['bilibili:gateway-canon'] } }] },
      }),
    );

    prismaMock.operationAuditLog.findMany.mockResolvedValueOnce([
      { action: 'approve', ok: true, payload: JSON.stringify({ status: 'published' }) },
      { action: 'approve', ok: false, payload: { status: 'failed' } },
      { action: 'retry', ok: false, payload: 'not-json' },
    ]);
    await expect(defaults.summarizeAdminAuditLogs({ days: 3, action: 'approve', ok: false })).resolves.toMatchObject({
      ok: true,
      days: 3,
      total: 3,
      ok_count: 1,
      failed_count: 2,
      by_action: { approve: 2, retry: 1 },
      by_status: { failed: 1, published: 1 },
      by_result: { ok: 1, failed: 2 },
    });
    expect(prismaMock.operationAuditLog.findMany).toHaveBeenLastCalledWith({
      where: {
        created_at: { gte: expect.any(Date) },
        action: 'approve',
        ok: false,
      },
    });
  });

  it('serves default knowledge and role card management helpers from prisma', async () => {
    const defaults = await captureDefaults();
    const now = new Date('2026-06-09T07:00:00.000Z');

    prismaMock.knowledgeEntry.findMany.mockResolvedValueOnce([
      {
        id: 31,
        category: 'tone',
        title: 'Tone',
        content: 'Friendly',
        enabled: true,
        created_at: null,
        updated_at: now,
      },
    ]);
    await expect(defaults.listKnowledgeEntries({ limit: 10, offset: 2 })).resolves.toMatchObject({
      items: [{ id: 31, created_at: now.toISOString(), updated_at: now.toISOString() }],
    });

    prismaMock.knowledgeEntry.findMany.mockResolvedValueOnce([
      {
        id: 33,
        category: 'empty',
        title: 'Empty',
        content: '',
        enabled: false,
        updated_at: null,
      },
    ]);
    await expect(defaults.listKnowledgeEntries({ limit: 1, offset: 0 })).resolves.toMatchObject({
      items: [{ id: 33, created_at: null, updated_at: null }],
    });

    prismaMock.knowledgeEntry.create.mockResolvedValueOnce({
      id: 32,
      category: 'reply',
      title: 'Reply',
      content: 'Use short replies',
      enabled: true,
      updated_at: now,
    });
    await expect(
      defaults.createKnowledgeEntry({ category: 'reply', title: 'Reply', content: 'Use short replies' }),
    ).resolves.toMatchObject({ item: { id: 32, enabled: true } });

    prismaMock.knowledgeEntry.create.mockResolvedValueOnce({
      id: 34,
      category: 'reply',
      title: 'No Date',
      content: 'No date content',
      enabled: true,
      updated_at: null,
    });
    await expect(
      defaults.createKnowledgeEntry({ category: 'reply', title: 'No Date', content: 'No date content' }),
    ).resolves.toMatchObject({ item: { id: 34, created_at: null, updated_at: null } });

    prismaMock.knowledgeEntry.update.mockResolvedValueOnce({
      id: 32,
      enabled: false,
      updated_at: now,
    });
    await expect(defaults.disableKnowledgeEntry({ entryId: 32 })).resolves.toEqual({
      ok: true,
      item: { id: 32, enabled: false, updated_at: now.toISOString() },
    });

    prismaMock.knowledgeEntry.update.mockResolvedValueOnce({
      id: 35,
      enabled: false,
      updated_at: null,
    });
    await expect(defaults.disableKnowledgeEntry({ entryId: 35 })).resolves.toEqual({
      ok: true,
      item: { id: 35, enabled: false, updated_at: null },
    });

    const roleCard = {
      id: 41,
      key: 'default',
      name: 'Default',
      description: 'desc',
      system_prompt: 'prompt',
      tone: JSON.stringify({ style: 'warm' }),
      constraints: 'short',
      enabled: true,
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    prismaMock.roleCard.findMany.mockResolvedValueOnce([
      roleCard,
      {
        ...roleCard,
        id: 42,
        key: 'empty',
        tone: '',
        constraints: '{"invalid"',
        is_active: false,
      },
    ]);
    await expect(defaults.listRoleCards({ limit: 100, offset: 0 })).resolves.toMatchObject({
      active_role_card_key: 'default',
      items: [
        { key: 'default', tone: { style: 'warm' }, constraints: 'short' },
        { key: 'empty', tone: '', constraints: '{"invalid"' },
      ],
    });

    prismaMock.roleCard.findMany.mockResolvedValueOnce([{ ...roleCard, key: 'inactive', is_active: false }]);
    await expect(defaults.listRoleCards({ limit: 1, offset: 0 })).resolves.toMatchObject({
      active_role_card_key: null,
      items: [{ key: 'inactive', is_active: false }],
    });

    prismaMock.roleCard.create.mockResolvedValueOnce({
      ...roleCard,
      id: 43,
      key: 'created',
      tone: 'playful',
      constraints: JSON.stringify({ max: 80 }),
      is_active: false,
    });
    await expect(
      defaults.createRoleCard({
        key: 'created',
        name: 'Created',
        description: 'created desc',
        system_prompt: 'created prompt',
        tone: ' playful ',
        constraints: { max: 80 },
        enabled: true,
      }),
    ).resolves.toMatchObject({ item: { key: 'created', tone: 'playful', constraints: { max: 80 } } });
    expect(prismaMock.roleCard.create).toHaveBeenLastCalledWith({
      data: expect.objectContaining({
        tone: 'playful',
        constraints: '{"max":80}',
        is_active: false,
      }),
    });

    prismaMock.roleCard.update.mockResolvedValueOnce({
      ...roleCard,
      description: 'updated desc',
      system_prompt: 'updated prompt',
      tone: JSON.stringify({ style: 'calm' }),
      constraints: 'updated constraints',
      enabled: false,
    });
    await expect(
      defaults.updateRoleCard({
        cardKey: 'default',
        name: 'Updated',
        description: 'updated desc',
        system_prompt: 'updated prompt',
        tone: { style: 'calm' },
        constraints: ' updated constraints ',
        enabled: false,
      }),
    ).resolves.toMatchObject({
      item: {
        name: 'Default',
        description: 'updated desc',
        tone: { style: 'calm' },
        constraints: 'updated constraints',
        enabled: false,
      },
    });
    expect(prismaMock.roleCard.update).toHaveBeenLastCalledWith({
      where: { key: 'default' },
      data: expect.objectContaining({
        name: 'Updated',
        description: 'updated desc',
        system_prompt: 'updated prompt',
        tone: '{"style":"calm"}',
        constraints: 'updated constraints',
        enabled: false,
      }),
    });

    prismaMock.roleCard.update.mockResolvedValueOnce({
      ...roleCard,
      key: 'minimal',
      updated_at: null,
    });
    await expect(defaults.updateRoleCard({ cardKey: 'minimal' })).resolves.toMatchObject({
      item: { key: 'minimal', updated_at: null },
    });
    expect(prismaMock.roleCard.update).toHaveBeenLastCalledWith({
      where: { key: 'minimal' },
      data: {
        updated_at: expect.any(Date),
      },
    });

    prismaMock.roleCard.update.mockResolvedValueOnce({
      ...roleCard,
      key: 'disabled',
      enabled: false,
      is_active: false,
    });
    await expect(defaults.disableRoleCard({ cardKey: 'disabled' })).resolves.toEqual({
      ok: true,
      item: { key: 'disabled', enabled: false, is_active: false, updated_at: now.toISOString() },
    });

    prismaMock.roleCard.updateMany.mockResolvedValueOnce({ count: 1 });
    prismaMock.roleCard.update.mockResolvedValueOnce({ ...roleCard, key: 'active' });
    await expect(defaults.activateRoleCard({ cardKey: 'active' })).resolves.toEqual({
      ok: true,
      active_role_card_key: 'active',
    });
  });

  it('serves default bilibili admin helpers from prisma', async () => {
    const defaults = await captureDefaults();
    const now = new Date('2026-06-09T08:00:00.000Z');

    prismaMock.bilibiliCredential.findFirst.mockResolvedValueOnce(null);
    prismaMock.bilibiliVideo.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    await expect(
      defaults.getBilibiliStatus({
        settings: buildSettings({ bilibiliPollIntervalSeconds: 45 }),
        buildBilibiliDiagnostics: () => ({ ready: false, blocking_reasons: ['auth:no active credential'] }),
      }),
    ).resolves.toMatchObject({
      credential: null,
      videos: { total: 0, poll_enabled_count: 0 },
      diagnostics: { ready: false },
      config: { poll_interval_seconds: 45 },
    });

    prismaMock.bilibiliCredential.findFirst.mockResolvedValueOnce({
      id: 51,
      name: 'Main credential',
      is_active: true,
      expires_at: null,
      last_used_at: now,
      created_at: null,
      updated_at: null,
    });
    prismaMock.bilibiliVideo.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    await expect(
      defaults.getBilibiliStatus({
        settings: buildSettings({ bilibiliEnabled: true, bilibiliPollEnabled: true, bilibiliPublishEnabled: true }),
        buildBilibiliDiagnostics: () => ({ ready: true, blocking_reasons: [] }),
      }),
    ).resolves.toMatchObject({
      credential: {
        id: 51,
        expires_at: null,
        last_used_at: now.toISOString(),
        created_at: null,
        updated_at: null,
      },
      videos: { total: 2, poll_enabled_count: 1 },
    });

    prismaMock.bilibiliVideo.count.mockResolvedValueOnce(2);
    prismaMock.bilibiliVideo.findMany.mockResolvedValueOnce([
      {
        id: 61,
        bvid: '',
        aid: '1001',
        title: 123,
        owner_mid: '99',
        poll_enabled: true,
        last_polled_at: now,
        last_poll_status: 200,
        last_poll_error: { message: 'oops' },
        last_rpid: '888',
        created_at: now,
        updated_at: now,
      },
      {
        id: 62,
        bvid: 'BV1GJ411x7fD',
        aid: null,
        title: null,
        owner_mid: null,
        poll_enabled: false,
        last_polled_at: null,
        last_poll_status: null,
        last_poll_error: null,
        last_rpid: null,
        created_at: null,
        updated_at: null,
      },
    ]);
    prismaMock.comment.findMany.mockResolvedValueOnce([{ video_id: '' }, { video_id: 'BV1GJ411x7fD' }]);
    await expect(defaults.listBilibiliVideos({ pollEnabled: false, limit: 2, offset: 1 })).resolves.toMatchObject({
      total: 2,
      items: [
        {
          id: 61,
          bvid: '',
          aid: 1001,
          title: '123',
          owner_mid: 99,
          comment_count: 0,
          last_poll_status: '200',
          last_poll_error: '[object Object]',
          last_rpid: 888,
        },
        {
          id: 62,
          bvid: 'BV1GJ411x7fD',
          comment_count: 1,
          created_at: null,
        },
      ],
    });
    expect(prismaMock.bilibiliVideo.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { poll_enabled: false },
        skip: 1,
        take: 2,
      }),
    );

    prismaMock.bilibiliVideo.count.mockResolvedValueOnce(1);
    prismaMock.bilibiliVideo.findMany.mockResolvedValueOnce([
      { id: 65, bvid: 'BV-with-null-comment', poll_enabled: true },
    ]);
    prismaMock.comment.findMany.mockResolvedValueOnce([{ video_id: null }, { video_id: 'BV-with-null-comment' }]);
    await expect(defaults.listBilibiliVideos({ limit: 1, offset: 0 })).resolves.toMatchObject({
      items: [{ id: 65, bvid: 'BV-with-null-comment', comment_count: 1 }],
    });

    prismaMock.bilibiliVideo.count.mockResolvedValueOnce(1);
    prismaMock.bilibiliVideo.findMany.mockResolvedValueOnce([{ id: 63, bvid: '', poll_enabled: true }]);
    await expect(defaults.listBilibiliVideos({ limit: 1, offset: 0 })).resolves.toMatchObject({
      items: [{ id: 63, bvid: '', comment_count: 0 }],
    });

    prismaMock.bilibiliVideo.create.mockResolvedValueOnce({
      id: 64,
      bvid: 'BV1Q541167Qg',
      poll_enabled: true,
      created_at: now,
      updated_at: now,
    });
    await expect(defaults.addBilibiliVideo({ bvid: 'BV1Q541167Qg' })).resolves.toMatchObject({
      item: { id: 64, bvid: 'BV1Q541167Qg', poll_enabled: true },
    });
    expect(prismaMock.bilibiliVideo.create).toHaveBeenLastCalledWith({
      data: {
        bvid: 'BV1Q541167Qg',
        poll_enabled: true,
      },
    });
  });

  it('lists and controls default platform connections', async () => {
    const defaults = await captureDefaults();

    process.env.PLATFORM_QQ_WEBHOOK_URL = 'https://qq.example/publish';
    process.env.PLATFORM_DOUYIN_WEBHOOK_URL = '';
    process.env.BILIBILI_POLL_ENABLED = 'false';
    setPlatformControlState('bilibili', { enabled: true, updatedAt: '2026-06-09T02:00:00.000Z' });
    setPlatformControlState('qq', { enabled: true, updatedAt: '2026-06-09T02:00:00.000Z' });
    setPlatformControlState('douyin', { enabled: true, updatedAt: '2026-06-09T02:00:00.000Z' });
    setPlatformControlState('kuaishou', { enabled: false, updatedAt: '2026-06-09T02:00:00.000Z' });
    const settings = buildSettings({
      bilibiliEnabled: false,
      bilibiliPollEnabled: false,
      platformBilibiliEnabled: true,
      platformQqEnabled: true,
      platformDouyinEnabled: true,
      platformKuaishouEnabled: false,
      platformQqPublishSource: 'qq-sidecar-custom',
    });

    const listed = defaults.listPlatformConnections(settings);
    expect(listed.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          platform: 'bilibili',
          enabled: true,
          status: 'degraded',
          lastError: 'runtime platform enabled but Bilibili runtime toggle is off',
          capabilities: expect.arrayContaining([
            expect.objectContaining({ key: 'publish', status: 'partial', note: 'bilibili-bot' }),
            expect.objectContaining({ key: 'polling', status: 'partial', note: '300s interval' }),
          ]),
        }),
        expect.objectContaining({
          platform: 'qq',
          enabled: true,
          status: 'connected',
          capabilities: expect.arrayContaining([
            expect.objectContaining({
              key: 'publish',
              status: 'available',
              note: 'qq-sidecar-custom via sidecar webhook',
            }),
          ]),
        }),
        expect.objectContaining({
          platform: 'douyin',
          enabled: true,
          status: 'degraded',
          lastError: 'sidecar webhook is not configured',
        }),
        expect.objectContaining({
          platform: 'kuaishou',
          enabled: false,
          status: 'disconnected',
          rolloutControl: expect.objectContaining({ enabled: false, stage: 'paused' }),
        }),
      ]),
    );

    expect(() => defaults.updatePlatformConnectionControl(settings, { platform: 'kuaishou', enabled: true })).toThrow(
      'platform_not_configured',
    );
    expect(defaults.updatePlatformConnectionControl(settings, { platform: 'qq', enabled: false })).toMatchObject({
      ok: true,
      item: {
        platform: 'qq',
        rolloutControl: { enabled: false, stage: 'paused' },
      },
    });

    process.env.BILIBILI_POLL_ENABLED = 'true';
    const pollingAvailable = defaults.listPlatformConnections(
      buildSettings({
        bilibiliEnabled: true,
        bilibiliPollEnabled: true,
        platformBilibiliEnabled: true,
      }),
    );
    expect(pollingAvailable.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          platform: 'bilibili',
          capabilities: expect.arrayContaining([expect.objectContaining({ key: 'polling', status: 'available' })]),
        }),
      ]),
    );
  });

  it('covers default comment ingress and companion v2 route compatibility paths', async () => {
    const petCoreV2 = {
      version: 'v2',
      snapshot: {
        profile: { petName: 'Route Mochi' },
        relationship: { level: 'Ready', note: 'route note' },
        progress: { stage: 'route', progressLabel: 'route ready', nextMilestone: null },
        needs: [],
        proactiveSignals: [],
      },
      companion: {
        petName: 'Route Mochi',
        statusLine: 'route ready',
        loopMode: 'route',
        lastCheckIn: '2026-06-09T09:00:00.000Z',
        adapterLabel: 'route adapter',
        loopHint: 'route hint',
        mood: { label: 'Ready', note: 'route note' },
        memoryTitle: 'route memory',
        memorySummary: 'route summary',
        vitals: [],
        recentSignals: [],
        recentInteractions: [],
      },
    };
    createPetCoreServiceMock.mockReturnValue({
      getCompanionState: vi.fn(),
      getCompanionStateV2: vi.fn(async () => petCoreV2),
      recordAction: vi.fn(),
    });
    const ingestCommentEvent = vi.fn(async ({ event }) => ({ ok: true, comment_id: event.comment_id }));
    const app = createServer({
      settings: buildSettings({ apiKey: 'admin-key', commentIngressToken: 'comment-token' }),
      ingestCommentEvent,
    });

    const companion = await app.inject({
      method: 'GET',
      url: '/companion/state-v2',
      headers: { 'x-api-key': 'admin-key' },
    });
    expect(companion.statusCode).toBe(200);
    expect(companion.json()).toMatchObject({ snapshot: { profile: { petName: 'Route Mochi' } } });

    createPetCoreServiceMock.mockReturnValue({
      getCompanionState: vi.fn(),
      getCompanionStateV2: vi.fn(async () => null),
      recordAction: vi.fn(),
    });
    createMemoryServiceMock.mockReturnValue({
      listSpaces: vi.fn(async () => []),
      listItems: vi.fn(async () => []),
      listGrants: vi.fn(async () => []),
      listIdentityLinks: vi.fn(async () => []),
    });
    const fallbackCompanion = await app.inject({
      method: 'GET',
      url: '/companion/state-v2',
      headers: { 'x-api-key': 'admin-key' },
    });
    expect(fallbackCompanion.statusCode).toBe(200);
    expect(fallbackCompanion.json()).toMatchObject({ snapshot: { profile: { petName: 'Mochi' } } });

    const invalidPayload = await app.inject({
      method: 'POST',
      url: '/events/comment',
      headers: { 'x-comment-ingress-token': 'comment-token' },
      payload: [],
    });
    expect(invalidPayload.statusCode).toBe(400);
    expect(invalidPayload.json()).toEqual({ detail: 'invalid_webhook_payload: missing_fields=comment_id' });

    const missingComment = await app.inject({
      method: 'POST',
      url: '/events/comment',
      headers: { Authorization: 'Bearer comment-token' },
      payload: { id: '', text: 'body', user: { id: 'u-1' } },
    });
    expect(missingComment.statusCode).toBe(400);
    expect(missingComment.json()).toEqual({ detail: 'invalid_webhook_payload: missing_fields=comment_id' });

    const accepted = await app.inject({
      method: 'POST',
      url: '/events/comment',
      headers: { 'x-comment-ingress-token': 'comment-token' },
      payload: { comment_id: 'c-1', content: 'body', user_id: 'u-1' },
    });
    expect(accepted.statusCode).toBe(200);
    expect(accepted.json()).toEqual({ ok: true, comment_id: 'c-1' });

    await app.close();
  });

  it('covers main helper parsing, normalization, auth, and failure-reason branches', async () => {
    const t = __mainTesting;
    const now = new Date('2026-06-09T10:00:00.000Z');

    expect(t.hasText(' value ')).toBe(true);
    expect(t.hasText('   ')).toBe(false);
    expect(t.parseBoolean(undefined, true)).toBe(true);
    expect(t.parseBoolean(' ON ', false)).toBe(true);
    expect(t.parseBoolean('off', true)).toBe(false);
    expect(t.parseInteger('42', 1)).toBe(42);
    expect(t.parseInteger('bad', 7)).toBe(7);
    expect(t.isProductionRuntime()).toBe(false);
    process.env.NODE_ENV = ' production ';
    expect(t.isProductionRuntime()).toBe(true);
    delete process.env.NODE_ENV;

    expect(t.parseAdminLimit(['0'], 20, 1, 50)).toBe(1);
    expect(t.parseAdminLimit(['999'], 20, 1, 50)).toBe(50);
    expect(t.parseAdminLimit(['bad'], 20, 1, 50)).toBe(20);
    expect(t.parseAdminOffset(['-5'], 0, 0, 100)).toBe(0);
    expect(t.parseAdminOffset(['200'], 0, 0, 100)).toBe(100);
    expect(t.parseAdminOffset(['bad'], 3, 0, 100)).toBe(3);
    expect(t.parseAdminString(['  status  '])).toBe('status');
    expect(t.parseAdminString(['   '])).toBeUndefined();
    expect(t.parseAdminString(12)).toBeUndefined();
    expect(t.parseAdminBoolean(true)).toBe(true);
    expect(t.parseAdminBoolean(['yes'])).toBe(true);
    expect(t.parseAdminBoolean(['off'])).toBe(false);
    expect(t.parseAdminBoolean(['maybe'])).toBeUndefined();
    expect(t.parseAdminBoolean(1)).toBeUndefined();

    expect(t.normalizeIsoTimestamp(now)).toBe(now.toISOString());
    expect(t.normalizeIsoTimestamp('invalid')).toBe('1970-01-01T00:00:00.000Z');
    expect(t.normalizeIsoTimestamp(undefined)).toBe('1970-01-01T00:00:00.000Z');
    expect(t.normalizeNullableIsoTimestamp(null)).toBeNull();
    expect(t.startCase('hello_runtime STATE')).toBe('Hello Runtime State');
    expect(t.normalizeCompanionInteractionKind('PAT')).toBe('pat');
    expect(t.normalizeCompanionInteractionKind('fallback')).toBe('fallback');
    expect(t.normalizeCompanionInteractionKind('unknown')).toBe('signal');
    expect(t.normalizeCompanionInteractionKind(undefined)).toBe('signal');
    expect(
      t.buildCompanionInteraction({
        item_key: 'item-1',
        content: 'body',
        source: '',
        item_metadata: { action: 'wake' },
        updated_at: now,
      }),
    ).toMatchObject({
      kind: 'wake',
      title: 'Wake interaction',
      source: 'System',
      timestamp: now.toISOString(),
    });
    expect(
      t.buildCompanionInteraction({
        item_key: 'item-2',
        content: 'body',
        source: 'system_event',
      }),
    ).toMatchObject({ kind: 'signal', title: 'System Event signal', timestamp: 'Pending' });

    expect(t.normalizeAdminJobStatus('')).toBe('queued');
    expect(t.normalizeAdminJobStatus(undefined)).toBe('queued');
    expect(t.normalizeAdminJobStatus('blocked')).toBe('pending_review');
    expect(t.normalizeAdminJobStatus('published')).toBe('published');
    expect(t.buildAdminJobStatusWhere()).toEqual({});
    expect(t.buildAdminJobStatusWhere('pending_review')).toEqual({
      status: { in: ['manual_queue', 'blocked', 'dedupe_skipped'] },
    });
    expect(t.buildAdminJobStatusWhere('failed')).toEqual({ status: 'failed' });

    expect(t.parseJsonRecord({ ok: true })).toEqual({ ok: true });
    expect(t.parseJsonRecord(['bad'])).toEqual({});
    expect(t.parseJsonRecord('{"ok":true}')).toEqual({ ok: true });
    expect(t.parseJsonRecord('[1]')).toEqual({});
    expect(t.parseJsonRecord('{bad')).toEqual({});
    expect(t.parseRoleCardValue({ tone: 'warm' })).toEqual({ tone: 'warm' });
    expect(t.parseRoleCardValue(12)).toBe('');
    expect(t.parseRoleCardValue('')).toBe('');
    expect(t.parseRoleCardValue('{"tone":"warm"}')).toEqual({ tone: 'warm' });
    expect(t.parseRoleCardValue('[1]')).toBe('[1]');
    expect(t.parseRoleCardValue('{bad')).toBe('{bad');
    expect(t.normalizeRoleCardInputValue({ max: 80 })).toEqual({ max: 80 });
    expect(t.normalizeRoleCardInputValue(' value ')).toBe('value');
    expect(t.normalizeRoleCardInputValue(1)).toBe('');
    expect(t.serializeRoleCardValue(' value ')).toBe('value');
    expect(t.serializeRoleCardValue({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
    expect(
      t.normalizeRoleCardRecord({
        id: '7',
        key: 'card',
        name: 'Card',
        description: null,
        system_prompt: 'prompt',
        tone: '{"style":"warm"}',
        constraints: '',
        enabled: 1,
        is_active: 0,
        created_at: 'bad-date',
        updated_at: now,
      }),
    ).toMatchObject({
      id: 7,
      tone: { style: 'warm' },
      constraints: '',
      enabled: true,
      is_active: false,
      created_at: '1970-01-01T00:00:00.000Z',
      updated_at: now.toISOString(),
    });
    expect(t.normalizeRoleCardRecord({})).toMatchObject({
      id: 0,
      key: '',
      name: '',
      description: '',
      system_prompt: '',
      tone: '',
      constraints: '',
    });

    expect(t.extractRiskFlagLabels([' pii ', '', null])).toEqual(['pii']);
    expect(
      t.extractRiskFlagLabels(
        JSON.stringify({
          reason: 'manual',
          decision: 'ok',
          label: 'review',
          risk_level: 'medium',
          blocked_words: ['spam'],
          risk_labels: ['abuse'],
          pii_types: ['email'],
          flags: ['manual'],
        }),
      ),
    ).toEqual(['manual', 'review', 'medium', 'spam', 'abuse', 'email']);
    expect(
      t.extractRiskFlagLabels(
        JSON.stringify({
          blocked_words: [null, ' block '],
          flags: [undefined, 'flag'],
        }),
      ),
    ).toEqual(['block', 'flag']);
    expect(
      t.extractRiskFlagLabels(
        JSON.stringify({
          reason: '',
          blocked_words: [''],
          risk_labels: [''],
          pii_types: [''],
          flags: [''],
        }),
      ),
    ).toEqual([]);
    expect(
      t.normalizeAdminJobListItem({
        id: null,
        status: '',
        comment_content: 'legacy comment',
        risk_flags: { reason: 'ok' },
        created_at: undefined,
        updated_at: 'bad-date',
        published_at: now,
      }),
    ).toMatchObject({
      id: '',
      status: 'queued',
      comment_text: 'legacy comment',
      risk_flags: [],
      created_at: null,
      updated_at: '1970-01-01T00:00:00.000Z',
      published_at: now.toISOString(),
    });
    expect(t.normalizeAdminJobListItem({})).toMatchObject({
      id: '',
      status: 'queued',
      comment_text: null,
      comment_content: null,
      risk_flags: [],
      created_at: null,
      updated_at: null,
      published_at: null,
    });

    expect(t.getGroupCount(3)).toBe(3);
    expect(t.getGroupCount({ _all: 4 })).toBe(4);
    expect(t.getGroupCount({ _all: Number.NaN })).toBe(0);
    expect(t.getGroupCount('bad')).toBe(0);
    expect(t.normalizeAdminOverviewPayload({ totals: { comments: 'bad' }, total_jobs: '2' })).toMatchObject({
      total_comments: 0,
      total_jobs: 2,
      total_published: 0,
      pending_review: 0,
      total_failed: 0,
    });
    expect(t.normalizeAdminOverviewPayload({ totals: { jobs: 6 } })).toMatchObject({
      total_jobs: 6,
    });
    expect(t.normalizeAdminOverviewPayload({})).toMatchObject({
      total_jobs: 0,
    });
    expect(
      t.normalizeAdminOverviewPayload({
        totals: [],
        total_comments: 'bad',
        total_jobs: 'bad',
        total_published: 'bad',
        pending_review: 'bad',
        total_failed: 'bad',
      }),
    ).toMatchObject({
      total_comments: 0,
      total_jobs: 0,
      total_published: 0,
      pending_review: 0,
      total_failed: 0,
    });
    expect(
      t.normalizeAdminAuditSummaryPayload({ totals: { audit_logs: 'bad' }, by_result: { success: '3' } }),
    ).toMatchObject({
      total: 0,
      ok_count: 3,
      failed_count: 0,
    });
    expect(t.normalizeAdminAuditSummaryPayload({ totals: { audit_logs: 7, ok: 4 } })).toMatchObject({
      total: 7,
      ok_count: 4,
    });
    expect(t.normalizeAdminAuditSummaryPayload({})).toMatchObject({
      total: 0,
      ok_count: 0,
    });
    expect(
      t.normalizeAdminAuditSummaryPayload({
        totals: [],
        by_result: [],
        total: 'bad',
        ok_count: 'bad',
        failed_count: 'bad',
      }),
    ).toMatchObject({
      total: 0,
      ok_count: 0,
      failed_count: 0,
    });
    expect(t.normalizeStyleProfilePayload({ style: '  WARM ' })).toMatchObject({
      style_profile: 'warm',
      style: 'warm',
    });
    expect(t.normalizeStyleProfilePayload({})).toMatchObject({ style_profile: '', style: '' });
    expect(t.normalizeRoleProfilePayload({ role: '  HERO ' })).toMatchObject({ role_profile: 'hero', role: 'hero' });
    expect(t.normalizeRoleProfilePayload({})).toMatchObject({ role_profile: '', role: '' });
    expect(
      t.normalizeBilibiliStatusPayload({ config: { enabled: true, poll_enabled: true }, videos: { total: 'bad' } }),
    ).toMatchObject({
      enabled: true,
      polling_enabled: true,
      poll_enabled: true,
      publish_enabled: false,
      video_count: 0,
    });
    expect(t.normalizeBilibiliStatusPayload({ config: [], videos: [], video_count: 'bad' })).toMatchObject({
      enabled: false,
      polling_enabled: false,
      poll_enabled: false,
      publish_enabled: false,
      video_count: 0,
    });
    expect(t.normalizeBilibiliStatusPayload({ videos: { poll_enabled_count: 3 } })).toMatchObject({
      video_count: 3,
    });
    expect(t.normalizeBilibiliStatusPayload({ videos: { total: 4 } })).toMatchObject({
      video_count: 4,
    });
    expect(t.normalizeBilibiliStatusPayload({})).toMatchObject({
      video_count: 0,
    });
    expect(
      t.normalizeBilibiliVideoRecord({ id: '5', aid: null, title: null, owner_mid: null, last_poll_status: null }),
    ).toMatchObject({
      id: 5,
      aid: null,
      title: null,
      owner_mid: null,
      comment_count: 0,
      last_poll_status: null,
    });
    expect(t.normalizeBilibiliVideoRecord({ last_poll_error: 'err' })).toMatchObject({
      id: 0,
      bvid: '',
      last_poll_error: 'err',
    });
    expect(
      t.normalizeBilibiliVideoRecord(
        {
          id: 6,
          bvid: 'BV',
          aid: '123',
          title: 456,
          owner_mid: '789',
          last_poll_status: 200,
          last_poll_error: { error: true },
          last_rpid: '100',
        },
        { commentCount: 8 },
      ),
    ).toMatchObject({
      aid: 123,
      title: '456',
      owner_mid: 789,
      comment_count: 8,
      last_poll_status: '200',
      last_poll_error: '[object Object]',
      last_rpid: 100,
    });
    expect(t.getAuditLogDetail({ detail: ' detail ' })).toBe('detail');
    expect(t.getAuditLogDetail({ status: ' failed ' })).toBe('failed');
    expect(t.getAuditLogDetail({})).toBeNull();

    expect(t.csvEscape('')).toBe('');
    expect(t.csvEscape('plain')).toBe('plain');
    expect(t.csvEscape('a,"b"\n')).toBe('"a,""b""\n"');
    expect(t.isNonEmptyString(' x ')).toBe(true);
    expect(t.isNonEmptyString('')).toBe(false);
    expect(t.parsePublishPayload(null)).toBeNull();
    expect(t.parsePublishPayload({ comment_id: 'c-1' })).toBeNull();
    const parsedPublish = t.parsePublishPayload({
      comment_id: 'c-1',
      reply_text: 'reply',
      source: '',
      force_publish: 1,
      trace_id: 'trace-1',
      canonical_id: 'canonical-1',
      container_id: 'container-1',
      user_id: 'user-1',
      parent_external_id: 'parent-1',
      routing_metadata: { keep: ' yes ', drop: '', nope: 1 },
    });
    expect(parsedPublish).toMatchObject({
      comment_id: 'c-1',
      reply_text: 'reply',
      source: 'bili-pet-bot',
      force_publish: true,
      routing_metadata: { keep: ' yes ' },
    });
    expect(t.gatewaySignaturePayload(parsedPublish)).toMatchObject({
      trace_id: 'trace-1',
      canonical_id: 'canonical-1',
      container_id: 'container-1',
      user_id: 'user-1',
      parent_external_id: 'parent-1',
      routing_metadata: { keep: ' yes ' },
    });
    expect(t.buildReplyHash('c-1', ' reply ')).toHaveLength(64);

    const signaturePayload = { b: 2, a: [1, { z: true }] };
    const signature = signPayload(signaturePayload, 'secret');
    expect(t.stableStringify(signaturePayload)).toBe('{"a":[1,{"z":true}],"b":2}');
    expect(t.defaultVerifyPayloadSignature(signaturePayload, 'secret', signature)).toBe(true);
    expect(t.defaultVerifyPayloadSignature(signaturePayload, 'secret', 'bad')).toBe(false);
    expect(t.defaultVerifyPayloadSignature(signaturePayload, 'secret', signature.replace(/.$/, '0'))).toBe(false);

    expect(t.defaultNormalizePublishFailureReason(undefined)).toBe('invalid_response');
    expect(t.defaultNormalizePublishFailureReason(' TIMEOUT while posting ')).toBe('timeout');
    expect(t.defaultNormalizePublishFailureReason('http 503')).toBe('5xx');
    expect(t.defaultNormalizePublishFailureReason('bad token')).toBe('auth');
    expect(t.defaultNormalizePublishFailureReason('webhook_not_configured: missing')).toBe('webhook_not_configured');
    expect(t.defaultNormalizePublishFailureReason('sidecar not_configured')).toBe('sidecar_webhook_not_configured');
    expect(t.defaultNormalizePublishFailureReason('reference_adapter_only')).toBe('bilibili_reference_adapter_only');
    expect(t.defaultNormalizePublishFailureReason('runtime_credentials_required')).toBe('runtime_credentials_required');
    expect(t.defaultNormalizePublishFailureReason('publish_failed')).toBe('publish_failed');
    expect(t.defaultNormalizePublishFailureReason('wrapped runtime_credentials_required error')).toBe(
      'runtime_credentials_required',
    );
    expect(t.defaultNormalizePublishFailureReason('native publish_failed upstream')).toBe('publish_failed');
    expect(t.defaultNormalizePublishFailureReason('unexpected')).toBe('invalid_response');
    expect(t.defaultNormalizePublishFailureReason('auth')).toBe('auth');
    expect(t.isMissingReservationKeyColumnError('plain')).toBe(false);
    expect(t.isMissingReservationKeyColumnError(new Error('no such column: reservation_key'))).toBe(true);

    const blockerTarget = ['existing'];
    t.addBlocker(blockerTarget, '');
    t.addBlocker(blockerTarget, 'existing');
    t.addBlocker(blockerTarget, 'new');
    expect(blockerTarget).toEqual(['existing', 'new']);
    expect(t.getHeaderValue(['first', 'second'])).toBe('first');
    expect(t.getHeaderValue([])).toBe('');
    expect(t.getHeaderValue(undefined)).toBe('');

    expect(t.buildDegradedCompanionState()).toMatchObject({
      mood: { note: 'Waiting for the next backend companion update.' },
      recentInteractions: [{ detail: 'Companion state is serving a degraded backend view.' }],
    });

    prismaMock.operationAuditLog.create.mockResolvedValueOnce({ id: 501 });
    await t.writeAuditLog(prismaMock as any, {
      action: 'direct_audit',
      targetId: null,
      ok: true,
      traceId: 'trace-audit',
    });
    expect(prismaMock.operationAuditLog.create).toHaveBeenLastCalledWith({
      data: {
        action: 'direct_audit',
        target_type: 'reply_job',
        target_id: null,
        ok: true,
        payload: JSON.stringify({ trace_id: 'trace-audit' }),
      },
    });
    prismaMock.operationAuditLog.create.mockRejectedValueOnce(new Error('audit_down'));
    await expect(
      t.writeAuditLog(prismaMock as any, {
        action: 'direct_audit_failed',
        targetId: 5,
        ok: false,
        traceId: 'trace-audit-failed',
      }),
    ).resolves.toBeUndefined();

    const reply = {
      code: vi.fn(function (this: any) {
        return this;
      }),
      send: vi.fn(function (this: any) {
        return this;
      }),
    };
    expect(
      t.checkApiKey(
        { headers: { 'x-api-key': 'admin-key' } } as any,
        reply as any,
        buildSettings({ apiKey: 'admin-key' }),
      ),
    ).toBe(true);
    expect(
      t.checkApiKey({ headers: { 'x-api-key': 'wrong' } } as any, reply as any, buildSettings({ apiKey: 'admin-key' })),
    ).toBe(false);
    process.env.NODE_ENV = 'production';
    expect(t.checkApiKey({ headers: {} } as any, reply as any, buildSettings({ apiKey: '' }))).toBe(false);
    expect(
      t.checkCommentIngressAuth({ headers: {} } as any, reply as any, buildSettings({ commentIngressToken: '' })),
    ).toBe(false);
    delete process.env.NODE_ENV;
    expect(
      t.checkCommentIngressAuth({ headers: {} } as any, reply as any, buildSettings({ commentIngressToken: '' })),
    ).toBe(true);
    expect(
      t.checkCommentIngressAuth(
        { headers: { authorization: 'Bearer comment-token' } } as any,
        reply as any,
        buildSettings({ commentIngressToken: 'comment-token' }),
      ),
    ).toBe(true);
    expect(
      t.checkCommentIngressAuth(
        { headers: { 'x-comment-ingress-token': 'wrong' } } as any,
        reply as any,
        buildSettings({ commentIngressToken: 'comment-token' }),
      ),
    ).toBe(false);
  });

  it('covers main default settings, readiness, diagnostics, and publish helper branches directly', async () => {
    const t = __mainTesting;

    process.env.DATABASE_URL = '';
    process.env.CELERY_BROKER_URL = '';
    process.env.CELERY_RESULT_BACKEND = '';
    process.env.API_KEY = 'admin-key';
    process.env.ADMIN_SESSION_SECRET = 'session-secret';
    process.env.ADMIN_SESSION_TTL_SECONDS = '90';
    process.env.LLM_PROVIDER = ' ';
    process.env.SEARCH_PROVIDER = ' ';
    process.env.PUBLISHER_MODE = 'webhook';
    process.env.PUBLISHER_WEBHOOK_URL = 'https://publisher.example/reply';
    process.env.BILIBILI_ENABLED = 'yes';
    process.env.BILIBILI_POLL_ENABLED = 'on';
    process.env.BILIBILI_POLL_INTERVAL_SECONDS = '45';
    process.env.BILIBILI_PUBLISH_ENABLED = 'true';
    process.env.BILIBILI_SESSDATA = 'sess';
    process.env.BILIBILI_BILI_JCT = 'jct';
    process.env.BILIBILI_BUVID3 = 'buvid';
    process.env.KILL_SWITCH = 'true';
    process.env.GATEWAY_TOKEN = 'gateway-token';
    process.env.GATEWAY_HMAC_SECRET = 'gateway-secret';
    process.env.COMMENT_INGRESS_TOKEN = 'comment-token';
    process.env.PUBLIC_COMPANION_ACTIONS_ENABLED = '1';
    process.env.PLATFORM_BILIBILI_ENABLED = '1';
    process.env.PLATFORM_QQ_ENABLED = '1';
    process.env.PLATFORM_DOUYIN_ENABLED = '1';
    process.env.PLATFORM_KUAISHOU_ENABLED = '1';
    process.env.PLATFORM_BILIBILI_PUBLISH_SOURCE = 'native';
    process.env.PLATFORM_QQ_PUBLISH_SOURCE = 'qq-custom';
    process.env.PLATFORM_DOUYIN_PUBLISH_SOURCE = 'douyin-custom';
    process.env.PLATFORM_KUAISHOU_PUBLISH_SOURCE = 'kuaishou-custom';

    const settings = t.buildDefaultSettings();
    expect(settings).toMatchObject({
      databaseUrl: '',
      apiKey: 'admin-key',
      adminSessionTtlSeconds: 90,
      llmProvider: 'mock',
      searchProvider: 'serpapi',
      publisherMode: 'webhook',
      publisherWebhookUrlConfigured: true,
      bilibiliPollIntervalSeconds: 45,
      bilibiliEnvCredentialConfigured: true,
      platformQqPublishSource: 'qq-custom',
    });
    expect(t.buildDefaultReadinessSummary(settings)).toMatchObject({
      config: {
        database_url_set: false,
        api_key_set: true,
        comment_ingress_token_set: true,
      },
      publish: {
        webhook_url_configured: true,
        bilibili_env_credential_configured: true,
      },
      kill_switch: true,
      public_companion_actions_enabled: true,
    });
    expect(
      t.buildDefaultReadinessSummary(
        buildSettings({ adminSessionTtlSeconds: undefined, publicCompanionActionsEnabled: undefined }),
      ),
    ).toMatchObject({
      config: { admin_session_ttl_seconds: 60 * 60 * 12 },
      public_companion_actions_enabled: false,
    });
    expect(t.createDeliveryCapability('llm_generation', true, 'configured', '', ['x'])).toMatchObject({
      ready: true,
      mode: 'unknown',
    });
    expect(
      t.buildDeliveryCapabilityMatrix(
        buildSettings({
          llmProvider: 'weird',
          searchProvider: 'weird',
          publisherMode: 'native_bilibili',
          bilibiliEnabled: false,
          bilibiliPublishEnabled: false,
          commentIngressToken: '',
        }),
        { ready: false, blocking_reasons: ['auth:no active credential'] },
        '',
      ),
    ).toMatchObject({
      blockers: expect.arrayContaining([
        'llm_generation',
        'search_enrichment',
        'native_bilibili_publish',
        'comment_ingress_auth',
      ]),
      summary: expect.arrayContaining([
        expect.objectContaining({ capability: 'llm_generation', status: 'unsupported' }),
        expect.objectContaining({ capability: 'search_enrichment', status: 'unsupported' }),
        expect.objectContaining({ capability: 'native_bilibili_publish', status: 'runtime_credentials_required' }),
      ]),
    });
    expect(
      t.buildDeliveryCapabilityMatrix(
        buildSettings({
          llmProvider: 'openai',
          llmApiKeyConfigured: false,
          searchProvider: 'google',
          searchApiKeyConfigured: true,
          searchCxConfigured: false,
          publisherMode: 'webhook',
          publisherWebhookUrlConfigured: false,
          commentIngressToken: 'comment-token',
        }),
        { ready: false, blocking_reasons: [] },
        '',
      ),
    ).toMatchObject({
      blockers: expect.arrayContaining(['llm_generation', 'search_enrichment', 'webhook_publish']),
    });
    expect(
      t.buildDeliveryCapabilityMatrix(
        buildSettings({
          llmProvider: 'claude',
          llmApiKeyConfigured: true,
          llmFallbackToMock: true,
          searchProvider: 'bing',
          searchApiKeyConfigured: true,
          publisherMode: 'manual_queue',
          commentIngressToken: 'comment-token',
        }),
        { ready: true, blocking_reasons: [] },
        'manual_queue',
      ),
    ).toMatchObject({
      blockers: ['llm_generation'],
      summary: expect.arrayContaining([
        expect.objectContaining({ capability: 'llm_generation', status: 'fallback_enabled' }),
      ]),
    });
    expect(
      t.buildDeliveryCapabilityMatrix(
        buildSettings({
          llmProvider: undefined as unknown as string,
          searchProvider: undefined as unknown as string,
          searchApiKeyConfigured: false,
          publisherMode: 'native_bilibili',
          bilibiliEnabled: true,
          bilibiliPublishEnabled: true,
          commentIngressToken: 'comment-token',
        }),
        { ready: false, blocking_reasons: ['config:probe_failed'] },
        '',
      ),
    ).toMatchObject({
      summary: expect.arrayContaining([
        expect.objectContaining({ capability: 'llm_generation', status: 'fallback_only', mode: 'mock' }),
        expect.objectContaining({ capability: 'search_enrichment', status: 'missing_inputs', mode: 'serpapi' }),
        expect.objectContaining({ capability: 'native_bilibili_publish', status: 'missing_inputs' }),
      ]),
    });
    expect(
      t.buildDeliveryCapabilityMatrix(
        buildSettings({
          llmProvider: '',
          searchProvider: '',
          searchApiKeyConfigured: false,
          publisherMode: 'native_bilibili',
          bilibiliEnabled: true,
          bilibiliPublishEnabled: true,
          commentIngressToken: 'comment-token',
        }),
        { ready: false, blocking_reasons: 'not-array' as unknown as string[] },
        '',
      ),
    ).toMatchObject({
      summary: expect.arrayContaining([
        expect.objectContaining({ capability: 'llm_generation', status: 'fallback_only', mode: 'mock' }),
        expect.objectContaining({ capability: 'search_enrichment', status: 'missing_inputs', mode: 'serpapi' }),
        expect.objectContaining({ capability: 'native_bilibili_publish', status: 'missing_inputs' }),
      ]),
    });

    delete process.env.BILIBILI_SESSDATA;
    delete process.env.BILIBILI_BILI_JCT;
    delete process.env.BILIBILI_BUVID3;
    delete process.env.BILIBILI_BUVID4;
    prismaMock.bilibiliCredential.findFirst.mockResolvedValueOnce(null);
    const noAuthDiagnostics = await t.defaultBilibiliDiagnostics(
      buildSettings({ bilibiliEnabled: false, bilibiliPollEnabled: false, publisherMode: 'manual_queue' }),
      vi.fn(),
    );
    expect(noAuthDiagnostics).toMatchObject({
      ready: false,
      blocking_reasons: [],
      release_gates: { delivery_capable_publish_mode: false },
      signals: { auth_probe_reason: 'not_required' },
    });

    delete process.env.PUBLISHER_WEBHOOK_URL;
    prismaMock.bilibiliCredential.findFirst.mockResolvedValueOnce(null);
    const webhookDiagnostics = await t.defaultBilibiliDiagnostics(
      buildSettings({ publisherMode: 'webhook', publisherWebhookUrlConfigured: false }),
      vi.fn(),
    );
    expect(webhookDiagnostics).toMatchObject({
      blocking_reasons: ['publish:webhook_not_configured'],
      checks: { config: { ready: false } },
    });

    prismaMock.bilibiliCredential.findFirst.mockResolvedValueOnce(null);
    const nativeDiagnostics = await t.defaultBilibiliDiagnostics(
      buildSettings({ bilibiliEnabled: true, bilibiliPublishEnabled: true, publisherMode: 'manual_queue' }),
      vi.fn(),
    );
    expect(nativeDiagnostics).toMatchObject({
      effective_publish_mode: 'native_bilibili',
      blocking_reasons: ['auth:no active credential'],
      release_gates: { native_publish_enabled: true, credential_present: false },
    });

    const payload = {
      commentId: 'comment-1',
      replyText: 'reply text',
      forcePublish: false,
      source: 'direct-test',
      traceId: 'trace-direct',
    };
    await expect(
      t.defaultPublishGatewayReply(buildSettings({ publisherMode: 'manual_queue' }), payload),
    ).resolves.toMatchObject({
      published: true,
      reason: 'manual_queued',
      status: 'pending_review',
    });
    await expect(
      t.defaultPublishGatewayReply(buildSettings({ publisherMode: 'simulated' }), payload),
    ).resolves.toMatchObject({
      published: true,
      reason: 'simulated',
      status: 'published',
    });
    await expect(
      t.defaultPublishGatewayReply(buildSettings({ publisherMode: 'unknown' }), payload),
    ).resolves.toMatchObject({
      published: false,
      reason: 'not_configured',
    });

    process.env.PUBLISHER_WEBHOOK_URL = 'https://publisher.example/reply';
    process.env.PUBLISHER_WEBHOOK_TOKEN = '';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('bad json');
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          published: false,
          reason: 'remote_rejected',
          published_at: '2026-06-09T11:00:00.000Z',
        }),
      })
      .mockRejectedValueOnce('plain webhook failure')
      .mockRejectedValueOnce(new Error('webhook boom'));
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      t.defaultPublishGatewayReply(buildSettings({ publisherMode: 'webhook' }), payload),
    ).resolves.toMatchObject({
      published: true,
      reason: 'webhook_published',
      status: 'published',
    });
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ 'Content-Type': 'application/json' });
    await expect(
      t.defaultPublishGatewayReply(buildSettings({ publisherMode: 'webhook' }), payload),
    ).resolves.toMatchObject({
      published: false,
      reason: 'remote_rejected',
      status: 'failed',
      publishedAt: new Date('2026-06-09T11:00:00.000Z'),
    });
    await expect(
      t.defaultPublishGatewayReply(buildSettings({ publisherMode: 'webhook' }), payload),
    ).resolves.toMatchObject({
      published: false,
      reason: 'webhook_failed',
      status: 'failed',
    });
    await expect(
      t.defaultPublishGatewayReply(buildSettings({ publisherMode: 'webhook' }), payload),
    ).resolves.toMatchObject({
      published: false,
      reason: 'webhook boom',
      status: 'failed',
    });

    postReplyMock.mockResolvedValueOnce({ success: true });
    await expect(
      t.defaultPublishGatewayReply(
        buildSettings({ publisherMode: 'native_bilibili', bilibiliEnabled: true, bilibiliPublishEnabled: true }),
        payload,
      ),
    ).resolves.toMatchObject({
      published: true,
      reason: 'published',
      status: 'published',
    });

    await expect(
      t.defaultPublishPlatformReply({
        platform: 'bilibili',
        commentId: 'comment-1',
        replyText: 'reply text',
        forcePublish: false,
        traceId: 'trace-1',
      }),
    ).resolves.toMatchObject({ published: false, reason: 'bilibili_reference_adapter_only' });
    publishViaSidecarWebhookMock
      .mockResolvedValueOnce({ published: false, reason: 'not_configured' })
      .mockResolvedValueOnce({ published: false, reason: 'remote_failed' })
      .mockResolvedValueOnce({ published: true, reason: 'remote_ok' });
    await expect(
      t.defaultPublishPlatformReply({
        platform: 'qq',
        commentId: 'comment-1',
        replyText: 'reply text',
        forcePublish: false,
        traceId: 'trace-2',
      }),
    ).resolves.toMatchObject({ published: false, reason: 'sidecar_webhook_not_configured', status: 'failed' });
    await expect(
      t.defaultPublishPlatformReply({
        platform: 'qq',
        commentId: 'comment-1',
        replyText: 'reply text',
        forcePublish: false,
        traceId: 'trace-3',
      }),
    ).resolves.toMatchObject({ published: false, reason: 'remote_failed', status: 'failed' });
    await expect(
      t.defaultPublishPlatformReply({
        platform: 'qq',
        commentId: 'comment-1',
        replyText: 'reply text',
        forcePublish: false,
        traceId: 'trace-4',
      }),
    ).resolves.toMatchObject({ published: true, reason: 'remote_ok', status: 'published' });

    expect(t.defaultCreateTraceId(' trace-id ')).toBe('trace-id');
    expect(t.defaultCreateTraceId()).toMatch(/^[0-9a-f-]{36}$/);
  });
});
