import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildGatewayPublishIntent,
  buildPlatformPublishIntent,
  resolveCommentReplyIntentParts,
} from '../src/domain/publish/comment-reply-intent.js';
import { registerCommentRoutes } from '../src/routes/comments.js';
import { registerCompanionRoutes } from '../src/routes/companion.js';
import { registerJobRoutes, type JobsRouteDependencies } from '../src/routes/jobs.js';
import type { ReplyJob, RuntimeSettings } from '../src/server/contracts.js';
import { shouldReplyForInteraction } from '../src/services/decider.js';
import { searchWeb } from '../src/services/search.js';

const mockPrisma = vi.hoisted(() => ({
  comment: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  replyJob: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  userState: {
    findUnique: vi.fn(),
  },
}));

vi.mock('../src/lib/prisma.js', () => ({
  getPrisma: () => mockPrisma,
}));

vi.mock('../src/services/db-queries.js', () => ({
  prisma: () => mockPrisma,
}));

const trackedEnvKeys = [
  'REPLY_BASE_PROBABILITY',
  'REPLY_COOLDOWN_MINUTES',
  'REPLY_QUIET_HOURS_START',
  'REPLY_QUIET_HOURS_END',
  'SEARCH_PROVIDER',
  'SEARCH_API_KEY',
  'SEARCH_MAX_RESULTS',
  'SEARCH_TIMEOUT',
] as const;
const originalEnv = Object.fromEntries(trackedEnvKeys.map((key) => [key, process.env[key]])) as Record<
  (typeof trackedEnvKeys)[number],
  string | undefined
>;

function buildSettings(overrides: Partial<RuntimeSettings> = {}): RuntimeSettings {
  return {
    databaseUrl: 'file:./test.db',
    celeryBrokerUrl: 'redis://localhost:6379/0',
    celeryResultBackend: 'redis://localhost:6379/1',
    apiKey: 'admin-key',
    adminSessionSecret: 'secret',
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

function restoreEnv(): void {
  for (const key of trackedEnvKeys) {
    if (originalEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalEnv[key];
    }
  }
}

function parseAdminLimit(value: unknown, defaultValue: number, min: number, max: number): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return defaultValue;
  return Math.min(max, Math.max(min, parsed));
}

function parseAdminString(value: unknown): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const normalized = typeof raw === 'string' ? raw.trim() : '';
  return normalized || undefined;
}

function buildJob(overrides: Partial<ReplyJob> = {}): ReplyJob {
  return {
    id: 7,
    comment_id: 'comment-7',
    canonical_comment_id: 'bilibili:comment-7',
    status: 'manual_queue',
    reply_text: 'reply text',
    style_profile: null,
    role_profile: null,
    role_card_key: null,
    force_long: null,
    platform: 'bilibili',
    route_context: null,
    created_at: null,
    updated_at: null,
    comment_content: null,
    ...overrides,
  };
}

function buildJobDeps(overrides: Partial<JobsRouteDependencies> = {}): JobsRouteDependencies {
  return {
    settings: buildSettings(),
    checkApiKey: (request, reply, settings) => {
      if (request.headers['x-api-key'] === settings.apiKey) return true;
      void reply.code(401).send({ detail: 'unauthorized' });
      return false;
    },
    parseAdminString,
    parseAdminLimit,
    parseAdminOffset: parseAdminLimit,
    retryJob: vi.fn(() => ({ ok: true, requeued: true, job_id: 7, trace_id: 'trace-retry' })),
    approveJob: vi.fn(() => ({ ok: true, job_id: 7, status: 'published', trace_id: 'trace-approve' })),
    approveJobsBatch: vi.fn(({ jobIds }) => ({
      ok: true,
      summary: { total: jobIds.length, success: jobIds.length, failed: 0 },
      results: jobIds.map((jobId) => ({ job_id: jobId, ok: true, status: 'published' })),
      trace_id: 'trace-approve-batch',
    })),
    retryJobsBatch: vi.fn(({ jobIds }) => ({
      ok: true,
      summary: { total: jobIds.length, success: jobIds.length, failed: 0 },
      results: jobIds.map((jobId) => ({ job_id: jobId, ok: true, requeued: true })),
      trace_id: 'trace-retry-batch',
    })),
    getJob: vi.fn(() => ({ ok: true, item: buildJob() })),
    listJobs: vi.fn(() => ({ ok: true, items: [buildJob()] })),
    exportJobsCsv: vi.fn(() => 'id,status\n7,manual_queue\n'),
    ...overrides,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  mockPrisma.comment.count.mockReset();
  mockPrisma.comment.findMany.mockReset();
  mockPrisma.replyJob.count.mockReset();
  mockPrisma.replyJob.findMany.mockReset();
  mockPrisma.userState.findUnique.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  restoreEnv();
});

describe('comment reply intent coverage gaps', () => {
  it('builds gateway and platform intents with default canonical ids and optional user metadata', () => {
    expect(
      buildGatewayPublishIntent({
        commentId: 'comment-1',
        replyText: 'reply',
        forcePublish: false,
        source: 'gateway',
        traceId: 'trace-gateway',
      }),
    ).toMatchObject({
      source: 'gateway',
      target: {
        platform: 'bilibili',
        canonicalId: 'bilibili:comment-1',
      },
    });

    expect(
      buildPlatformPublishIntent({
        platform: 'qq',
        commentId: 'message-1',
        replyText: 'reply',
        forcePublish: true,
        traceId: 'trace-platform',
        canonicalId: ' qq:message-1 ',
        containerId: 'group-1',
        userId: 'user-1',
        parentExternalId: 'parent-1',
        routingMetadata: { chat_type: 'group' },
      }),
    ).toMatchObject({
      source: 'platform-publish',
      target: {
        platform: 'qq',
        canonicalId: 'qq:message-1',
        route: {
          containerId: 'group-1',
          parentExternalId: 'parent-1',
          metadata: {
            chat_type: 'group',
            user_id: 'user-1',
          },
        },
      },
    });
  });

  it('rejects non comment-reply publish intents when resolving parts', () => {
    expect(() =>
      resolveCommentReplyIntentParts({
        target: {
          platform: 'bilibili',
          targetKind: 'profile-update',
          externalId: 'target-1',
          canonicalId: 'bilibili:target-1',
        },
        payload: { text: 'reply' },
      }),
    ).toThrow('unsupported_publish_target:profile-update');
  });
});

describe('route coverage gaps', () => {
  it('lists comments with route context and rejects blank comment ids', async () => {
    mockPrisma.comment.count.mockResolvedValue(1);
    mockPrisma.comment.findMany.mockResolvedValue([
      {
        id: 1,
        platform: 'qq',
        comment_id: 'message-1',
        video_id: 'group-1',
        user_id: 'user-1',
        parent_id: 'parent-1',
        created_at: new Date('2026-06-09T00:00:00.000Z'),
      },
    ]);
    const app = Fastify();
    const getComment = vi.fn();
    registerCommentRoutes(app, {
      settings: buildSettings(),
      checkApiKey: () => true,
      parseAdminLimit,
      parseAdminOffset: parseAdminLimit,
      getComment,
    });

    const list = await app.inject({ method: 'GET', url: '/comments?limit=999&offset=-1' });
    const blank = await app.inject({ method: 'GET', url: '/comments/%20%20' });

    expect(list.statusCode).toBe(200);
    expect(mockPrisma.comment.findMany).toHaveBeenCalledWith({
      orderBy: { created_at: 'desc' },
      skip: 0,
      take: 500,
    });
    expect(list.json()).toMatchObject({
      ok: true,
      total: 1,
      items: [
        {
          comment_id: 'message-1',
          route_context: {
            platform: 'qq',
            container_id: 'group-1',
            user_id: 'user-1',
            parent_external_id: 'parent-1',
            chat_type: 'group',
          },
        },
      ],
    });
    expect(blank.statusCode).toBe(404);
    expect(blank.json()).toEqual({ detail: 'comment_not_found' });
    expect(getComment).not.toHaveBeenCalled();

    await app.close();
  });

  it('normalizes jobs route invalid ids, empty batches, aliases, and raw fallback responses', async () => {
    const getJob = vi
      .fn()
      .mockReturnValueOnce({ ok: true, item: buildJob({ id: 9 }) })
      .mockReturnValueOnce({ ok: false, detail: 'not_found' });
    const retryJob = vi.fn(() => ({ ok: true, requeued: true, job_id: 11, trace_id: 'trace-retry' }));
    const app = Fastify();
    const deps = buildJobDeps({ getJob, retryJob });
    registerJobRoutes(app, deps);
    const headers = { 'x-api-key': 'admin-key' };

    const invalidRetry = await app.inject({ method: 'POST', url: '/jobs/abc/retry', headers, payload: {} });
    const invalidApprove = await app.inject({ method: 'POST', url: '/jobs/0/approve', headers, payload: {} });
    const emptyRetryBatch = await app.inject({
      method: 'POST',
      url: '/jobs/retry-batch',
      headers,
      payload: { job_ids: ['x', -1] },
    });
    const nonArrayRetryBatch = await app.inject({ method: 'POST', url: '/api/jobs/retry-batch', headers, payload: {} });
    const expandedGet = await app.inject({ method: 'GET', url: '/jobs/9', headers });
    const rawGet = await app.inject({ method: 'GET', url: '/api/jobs/10', headers });
    const retry = await app.inject({
      method: 'POST',
      url: '/api/jobs/11/retry',
      headers,
      payload: {
        force_long: '',
        style_profile: '',
        role_profile: ' comfort ',
        role_card_key: 123,
      },
    });

    expect(invalidRetry.statusCode).toBe(404);
    expect(invalidApprove.statusCode).toBe(404);
    expect(emptyRetryBatch.statusCode).toBe(400);
    expect(emptyRetryBatch.json()).toEqual({ detail: 'job_ids_required' });
    expect(nonArrayRetryBatch.statusCode).toBe(400);
    expect(nonArrayRetryBatch.json()).toEqual({ detail: 'job_ids_required' });
    expect(expandedGet.json()).toMatchObject({ ok: true, id: 9, item: { id: 9 } });
    expect(rawGet.json()).toEqual({ ok: false, detail: 'not_found' });
    expect(retry.statusCode).toBe(200);
    expect(retryJob).toHaveBeenCalledWith({
      jobId: 11,
      forceLong: undefined,
      styleProfile: undefined,
      roleProfile: ' comfort ',
      roleCardKey: '123',
    });

    await app.close();
  });

  it('handles job route alternate batch and approve payload branches', async () => {
    const approveJob = vi.fn(() => ({ ok: true, job_id: 12, status: 'published', trace_id: 'trace-approve' }));
    const approveJobsBatch = vi.fn(({ jobIds }) => ({
      ok: true,
      summary: { total: jobIds.length, success: jobIds.length, failed: 0 },
      results: jobIds.map((jobId) => ({ job_id: jobId, ok: true, status: 'published' })),
      trace_id: 'trace-approve-batch',
    }));
    const retryJobsBatch = vi.fn(({ jobIds, forceLong }) => ({
      ok: true,
      summary: { total: jobIds.length, success: jobIds.length, failed: 0 },
      results: jobIds.map((jobId) => ({ job_id: jobId, ok: true, requeued: true })),
      forceLong,
      trace_id: 'trace-retry-batch',
    }));
    const listJobs = vi.fn(() => ({ ok: true, items: [buildJob({ id: 14 })] }));
    const exportJobsCsv = vi.fn(() => 'id,status\n14,published\n');
    const app = Fastify();
    registerJobRoutes(app, buildJobDeps({ approveJob, approveJobsBatch, retryJobsBatch, listJobs, exportJobsCsv }));
    const headers = { 'x-api-key': 'admin-key' };

    const approve = await app.inject({
      method: 'POST',
      url: '/api/jobs/12/approve',
      headers,
      payload: { style_profile: 'warm', role_profile: 'guide', role_card_key: 'card-1' },
    });
    const approveBatchEmpty = await app.inject({ method: 'POST', url: '/jobs/approve-batch', headers, payload: {} });
    const approveBatch = await app.inject({
      method: 'POST',
      url: '/api/jobs/approve-batch',
      headers,
      payload: { job_ids: ['13', 'bad', 0] },
    });
    const retryBatch = await app.inject({
      method: 'POST',
      url: '/api/jobs/retry-batch',
      headers,
      payload: { job_ids: [15], force_long: 'yes' },
    });
    const list = await app.inject({ method: 'GET', url: '/jobs?status=published&limit=2&offset=1', headers });
    const csv = await app.inject({ method: 'GET', url: '/export/jobs.csv?status=published&limit=2', headers });

    expect(approve.json()).toEqual({ ok: true, job_id: 12, status: 'published', trace_id: 'trace-approve' });
    expect(approveJob).toHaveBeenCalledWith({
      jobId: 12,
      styleProfile: 'warm',
      roleProfile: 'guide',
      roleCardKey: 'card-1',
    });
    expect(approveBatchEmpty.statusCode).toBe(400);
    expect(approveBatchEmpty.json()).toEqual({ detail: 'job_ids_required' });
    expect(approveBatch.json()).toMatchObject({ ok: true, summary: { total: 1 } });
    expect(approveJobsBatch).toHaveBeenCalledWith({ jobIds: [13] });
    expect(retryBatch.json()).toMatchObject({ ok: true, forceLong: true });
    expect(retryJobsBatch).toHaveBeenCalledWith({ jobIds: [15], forceLong: true });
    expect(list.json()).toMatchObject({ ok: true, items: [{ id: 14 }] });
    expect(listJobs).toHaveBeenCalledWith({ status: 'published', limit: 2, offset: 1 });
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.body).toBe('id,status\n14,published\n');
    expect(exportJobsCsv).toHaveBeenCalledWith({ status: 'published', limit: 2 });

    await app.close();
  });

  it('serves /api/jobs from prisma with clamped pagination', async () => {
    mockPrisma.replyJob.count.mockResolvedValue(2);
    mockPrisma.replyJob.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const app = Fastify();
    registerJobRoutes(app, buildJobDeps());

    const response = await app.inject({
      method: 'GET',
      url: '/api/jobs?limit=9999&offset=-5',
      headers: { 'x-api-key': 'admin-key' },
    });

    expect(response.statusCode).toBe(200);
    expect(mockPrisma.replyJob.findMany).toHaveBeenCalledWith({
      orderBy: { created_at: 'desc' },
      skip: 0,
      take: 500,
    });
    expect(response.json()).toEqual({ ok: true, total: 2, items: [{ id: 1 }, { id: 2 }] });

    await app.close();
  });

  it('rejects unauthorized api jobs and resolves comment and companion empty-body defaults', async () => {
    const app = Fastify();
    registerJobRoutes(app, buildJobDeps());
    registerCommentRoutes(app, {
      settings: buildSettings(),
      checkApiKey: () => true,
      parseAdminLimit,
      parseAdminOffset: parseAdminLimit,
      getComment: vi.fn(({ commentId }) => ({ ok: true, comment: { comment_id: commentId }, jobs: [] })),
    });
    registerCompanionRoutes(app, {
      settings: buildSettings({ publicCompanionActionsEnabled: true }),
      checkApiKey: () => true,
      getCompanionState: vi.fn(() => ({ ok: true }) as never),
      getCompanionStateV2: vi.fn(() => ({ version: 'v2' }) as never),
      recordCompanionAction: vi.fn(),
    });

    const unauthorizedJobs = await app.inject({ method: 'GET', url: '/api/jobs' });
    const comment = await app.inject({ method: 'GET', url: '/api/comments/comment-1' });
    const companion = await app.inject({ method: 'POST', url: '/companion/actions', payload: {} });

    expect(unauthorizedJobs.statusCode).toBe(401);
    expect(unauthorizedJobs.json()).toEqual({ detail: 'unauthorized' });
    expect(comment.json()).toEqual({ ok: true, comment: { comment_id: 'comment-1' }, jobs: [] });
    expect(companion.statusCode).toBe(400);
    expect(companion.json()).toEqual({ detail: 'action_invalid' });

    await app.close();
  });
});

describe('decider and search coverage gaps', () => {
  it('uses same-day quiet hours, env probabilities, block keywords, cooldown expiry, and default style profile', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-08T18:00:00.000Z'));
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(Math, 'random').mockReturnValue(0.03);
    process.env.REPLY_BASE_PROBABILITY = '0.5';
    process.env.REPLY_COOLDOWN_MINUTES = '1';
    process.env.REPLY_QUIET_HOURS_START = '1';
    process.env.REPLY_QUIET_HOURS_END = '5';
    mockPrisma.userState.findUnique.mockResolvedValue({
      cooldown_enabled: true,
      updated_at: new Date('2026-06-08T17:58:00.000Z'),
    });

    const result = await shouldReplyForInteraction({
      interaction: {
        platform: 'bilibili',
        ingressSource: 'test',
        actor: { platformUserId: 'user-1' },
        reference: {
          subjectKind: 'comment',
          externalId: 'comment-1',
          canonicalId: 'bilibili:comment-1',
        },
        content: { text: 'help ' + 'x'.repeat(240) + ' 广告' },
      },
    });

    expect(result).toEqual([false, 'doro', 'long']);
    expect(mockPrisma.userState.findUnique).toHaveBeenCalledWith({ where: { user_id: 'user-1' } });
  });

  it('does not apply cooldown when user state is absent or disabled', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    mockPrisma.userState.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      cooldown_enabled: false,
      updated_at: new Date(),
    });

    await expect(
      shouldReplyForInteraction({
        interaction: {
          platform: 'bilibili',
          ingressSource: 'test',
          actor: { platformUserId: 'missing-user' },
          reference: {
            subjectKind: 'comment',
            externalId: 'comment-1',
            canonicalId: 'bilibili:comment-1',
          },
          content: { text: 'hello' },
        },
      }),
    ).resolves.toEqual([true, 'doro', 'medium']);
    await expect(
      shouldReplyForInteraction({
        interaction: {
          platform: 'bilibili',
          ingressSource: 'test',
          actor: { platformUserId: 'disabled-user' },
          reference: {
            subjectKind: 'comment',
            externalId: 'comment-2',
            canonicalId: 'bilibili:comment-2',
          },
          content: { text: 'hello' },
        },
      }),
    ).resolves.toEqual([true, 'doro', 'medium']);
  });

  it('returns empty items when provider timeout handling absorbs search failures', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    process.env.SEARCH_PROVIDER = 'serpapi';
    process.env.SEARCH_API_KEY = 'search-key';
    process.env.SEARCH_MAX_RESULTS = '2';
    process.env.SEARCH_TIMEOUT = '5';

    const result = await searchWeb('alpha beta gamma');

    expect(result).toEqual({ items: [] });
    expect(errorSpy).toHaveBeenCalledWith('[search] SerpAPI error:', expect.any(DOMException));
  });
});
