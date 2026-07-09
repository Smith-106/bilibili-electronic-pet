import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RuntimeSettings } from '../src/server/contracts.js';
import type { ServerDependencies } from '../src/server/dependencies.js';

// Credential crypto is unit-tested elsewhere; here we mock it as identity so
// diagnostics/create flows can focus on orchestration logic without real
// AES round-trips. encrypt returns its input so stored fields stay readable.
vi.mock('../src/services/credential-crypto.js', () => ({
  encrypt: (plaintext: string) => plaintext,
  decrypt: (ciphertext: string) => ciphertext,
  isEncryptionAvailable: () => true,
}));

const { mockCommentQueueAdd, mockCommentQueueClose } = vi.hoisted(() => ({
  mockCommentQueueAdd: vi.fn(),
  mockCommentQueueClose: vi.fn().mockResolvedValue(undefined),
}));

const mockPrisma = {
  bilibiliCredential: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
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
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  comment: {
    count: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  commentQueueBacklog: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
  knowledgeEntry: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  roleCard: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  replyJob: {
    count: vi.fn(),
    findMany: vi.fn(),
    groupBy: vi.fn(),
    findUnique: vi.fn(),
  },
  publishLog: {
    count: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
  },
  operationAuditLog: {
    create: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn(),
  },
};

const mockPollAllVideos = vi.fn();
const mockPollVideoById = vi.fn();

vi.mock('../src/lib/prisma.js', () => ({
  DEFAULT_DATABASE_URL: 'file:./test.db',
  getPrisma: () => mockPrisma,
}));

vi.mock('../src/services/bilibili-poller.js', () => ({
  pollAllVideos: mockPollAllVideos,
  pollVideoById: mockPollVideoById,
}));

vi.mock('../src/workers/tasks/comment-event.task.js', () => ({
  createCommentEventQueue: () => ({
    add: mockCommentQueueAdd,
    close: mockCommentQueueClose,
  }),
}));

const { createServer } = await import('../src/main.js');

function buildSettings(overrides: Partial<RuntimeSettings> = {}): RuntimeSettings {
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

function resetMockPrisma(): void {
  for (const model of Object.values(mockPrisma)) {
    for (const fn of Object.values(model)) {
      fn.mockReset();
    }
  }
}

beforeEach(() => {
  resetMockPrisma();
  mockPollAllVideos.mockReset();
  mockPollVideoById.mockReset();
  mockCommentQueueAdd.mockReset();
  mockCommentQueueClose.mockClear();
  delete process.env.PUBLISHER_MODE;
  delete process.env.PUBLISHER_WEBHOOK_URL;
  delete process.env.PUBLISHER_WEBHOOK_TOKEN;
});

describe('default admin data providers', () => {
  it('returns frontend-compatible overview counters from prisma', async () => {
    mockPrisma.comment.count.mockResolvedValue(12);
    mockPrisma.replyJob.count.mockResolvedValue(7);
    mockPrisma.replyJob.groupBy.mockResolvedValue([
      { status: 'published', _count: { _all: 3 } },
      { status: 'manual_queue', _count: { _all: 2 } },
      { status: 'blocked', _count: { _all: 1 } },
      { status: 'failed', _count: { _all: 1 } },
    ]);

    const app = createServer(buildDeps());
    const response = await app.inject({ method: 'GET', url: '/api/admin/overview' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      total_comments: 12,
      total_jobs: 7,
      total_published: 3,
      pending_review: 3,
      total_failed: 1,
      totals: {
        comments: 12,
        jobs: 7,
        published: 3,
        pending_review: 3,
        failed: 1,
      },
      by_status: {
        published: 3,
        manual_queue: 2,
        blocked: 1,
        failed: 1,
      },
    });

    await app.close();
  });

  it('maps pending_review filters to reviewable statuses and shapes admin jobs for the frontend', async () => {
    mockPrisma.replyJob.count.mockResolvedValue(1);
    mockPrisma.replyJob.findMany.mockResolvedValue([
      {
        id: 101,
        comment_id: 'comment-1',
        canonical_comment_id: 'bilibili:comment-1',
        status: 'manual_queue',
        reply_text: '待人工确认',
        risk_flags: JSON.stringify({ reason: 'high_risk_content', blocked_words: ['spam'] }),
        published_at: null,
        created_at: new Date('2026-04-04T10:00:00.000Z'),
      },
    ]);
    mockPrisma.comment.findMany.mockResolvedValue([
      {
        id: 1,
        platform: 'bilibili',
        canonical_comment_id: 'bilibili:comment-1',
        comment_id: 'comment-1',
        video_id: 'video-1',
        user_id: 'user-1',
        content: '这条评论需要审核',
        parent_id: null,
        created_at: new Date('2026-04-04T09:00:00.000Z'),
      },
    ]);

    const app = createServer(buildDeps());
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/jobs?status=pending_review&limit=20',
    });

    expect(response.statusCode).toBe(200);
    expect(mockPrisma.replyJob.count).toHaveBeenCalledWith({
      where: {
        status: {
          in: ['manual_queue', 'blocked', 'dedupe_skipped'],
        },
      },
    });
    expect(mockPrisma.replyJob.findMany).toHaveBeenCalledWith({
      where: {
        status: {
          in: ['manual_queue', 'blocked', 'dedupe_skipped'],
        },
      },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      skip: 0,
      take: 20,
    });
    expect(response.json()).toMatchObject({
      ok: true,
      total: 1,
      limit: 20,
      offset: 0,
      items: [
        {
          id: '101',
          comment_id: 'comment-1',
          status: 'pending_review',
          raw_status: 'manual_queue',
          comment_text: '这条评论需要审核',
          comment_content: '这条评论需要审核',
          reply_text: '待人工确认',
          risk_flags: ['high_risk_content', 'spam'],
          created_at: '2026-04-04T10:00:00.000Z',
        },
      ],
    });

    await app.close();
  });

  it('flattens audit summary counters for the admin dashboard', async () => {
    mockPrisma.operationAuditLog.findMany.mockResolvedValue([
      {
        id: 1,
        action: 'approve_single',
        target_type: 'reply_job',
        target_id: 1,
        ok: true,
        payload: JSON.stringify({ status: 'published' }),
        created_at: new Date('2026-04-04T08:00:00.000Z'),
      },
      {
        id: 2,
        action: 'retry_single',
        target_type: 'reply_job',
        target_id: 2,
        ok: false,
        payload: JSON.stringify({ status: 'queued' }),
        created_at: new Date('2026-04-04T09:00:00.000Z'),
      },
      {
        id: 3,
        action: 'approve_single',
        target_type: 'reply_job',
        target_id: 3,
        ok: true,
        payload: JSON.stringify({ status: 'published' }),
        created_at: new Date('2026-04-04T10:00:00.000Z'),
      },
    ]);

    const app = createServer(buildDeps());
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/audit/summary?days=7',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      days: 7,
      total: 3,
      ok_count: 2,
      failed_count: 1,
      totals: {
        audit_logs: 3,
        ok: 2,
        failed: 1,
      },
      by_action: {
        approve_single: 2,
        retry_single: 1,
      },
      by_status: {
        published: 2,
        queued: 1,
      },
      by_result: {
        ok: 2,
        failed: 1,
      },
    });

    await app.close();
  });

  it('reads admin gateway logs from publish logs by default', async () => {
    mockPrisma.publishLog.findMany.mockResolvedValue([
      {
        id: 5,
        platform: 'bilibili',
        canonical_comment_id: 'bilibili:comment-9',
        comment_id: 'comment-9',
        reply_hash: 'hash-1',
        source: 'manual',
        status: 'published',
        published_at: new Date('2026-04-04T11:00:00.000Z'),
        failure_reason: null,
        created_at: new Date('2026-04-04T10:59:00.000Z'),
      },
    ]);
    mockPrisma.replyJob.findMany.mockResolvedValue([
      {
        id: 21,
        comment_id: 'comment-9',
        canonical_comment_id: 'bilibili:comment-9',
        status: 'published',
        reply_text: '这是一条网关回复摘要',
        created_at: new Date('2026-04-04T10:58:00.000Z'),
      },
    ]);

    const app = createServer(buildDeps());
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/gateway/logs?comment_id=comment-9&limit=5',
    });

    expect(response.statusCode).toBe(200);
    expect(mockPrisma.publishLog.findMany).toHaveBeenCalledWith({
      where: {
        comment_id: 'comment-9',
      },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      take: 5,
    });
    expect(mockPrisma.replyJob.findMany).toHaveBeenCalledWith({
      where: {
        OR: [{ comment_id: { in: ['comment-9'] } }, { canonical_comment_id: { in: ['bilibili:comment-9'] } }],
      },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
    expect(response.json()).toEqual({
      ok: true,
      items: [
        {
          id: 5,
          platform: 'bilibili',
          canonical_comment_id: 'bilibili:comment-9',
          comment_id: 'comment-9',
          reply_hash: 'hash-1',
          source: 'manual',
          status: 'published',
          reply_text: '这是一条网关回复摘要',
          published_at: '2026-04-04T11:00:00.000Z',
          failure_reason: null,
          created_at: '2026-04-04T10:59:00.000Z',
        },
      ],
    });

    await app.close();
  });

  it('returns frontend-compatible daily metrics aggregates from prisma', async () => {
    mockPrisma.comment.findMany.mockResolvedValue([
      {
        id: 1,
        created_at: new Date('2026-04-03T08:00:00.000Z'),
      },
      {
        id: 2,
        created_at: new Date('2026-04-03T10:00:00.000Z'),
      },
      {
        id: 3,
        created_at: new Date('2026-04-04T09:00:00.000Z'),
      },
    ]);
    mockPrisma.replyJob.findMany.mockResolvedValue([
      {
        id: 11,
        status: 'published',
        created_at: new Date('2026-04-03T11:00:00.000Z'),
      },
      {
        id: 12,
        status: 'failed',
        created_at: new Date('2026-04-03T12:00:00.000Z'),
      },
      {
        id: 13,
        status: 'skipped',
        created_at: new Date('2026-04-04T10:00:00.000Z'),
      },
    ]);

    const app = createServer(buildDeps());
    const response = await app.inject({
      method: 'GET',
      url: '/api/metrics/daily?days=30',
    });

    expect(response.statusCode).toBe(200);
    expect(mockPrisma.comment.findMany).toHaveBeenCalledWith({
      where: { created_at: { gte: expect.any(Date) } },
      select: { created_at: true },
      orderBy: { created_at: 'asc' },
    });
    expect(mockPrisma.replyJob.findMany).toHaveBeenCalledWith({
      where: { created_at: { gte: expect.any(Date) } },
      select: { created_at: true, status: true },
      orderBy: { created_at: 'asc' },
    });
    expect(response.json()).toEqual({
      ok: true,
      days: 30,
      totals: {
        published: 1,
        failed: 1,
        skipped: 1,
      },
      items: [
        {
          date: '2026-04-03',
          comments: 2,
          comment_count: 2,
          jobs: 2,
          job_count: 2,
          queued: 0,
          published: 1,
          published_count: 1,
          manual_queue: 0,
          blocked: 0,
          failed: 1,
          failed_count: 1,
          dedupe_skipped: 0,
          skipped: 0,
          skipped_count: 0,
          status_breakdown: {
            failed: 1,
            published: 1,
          },
          total: 2,
        },
        {
          date: '2026-04-04',
          comments: 1,
          comment_count: 1,
          jobs: 1,
          job_count: 1,
          queued: 0,
          published: 0,
          published_count: 0,
          manual_queue: 0,
          blocked: 0,
          failed: 0,
          failed_count: 0,
          dedupe_skipped: 0,
          skipped: 1,
          skipped_count: 1,
          status_breakdown: {
            skipped: 1,
          },
          total: 1,
        },
      ],
    });

    await app.close();
  });

  it('returns frontend-compatible bilibili status from prisma defaults', async () => {
    mockPrisma.bilibiliCredential.findFirst.mockResolvedValue({
      id: 7,
      name: '主账号',
      is_active: true,
      expires_at: new Date('2026-12-31T00:00:00.000Z'),
      last_used_at: new Date('2026-04-04T08:30:00.000Z'),
      created_at: new Date('2026-04-01T08:00:00.000Z'),
      updated_at: new Date('2026-04-04T08:35:00.000Z'),
    });
    mockPrisma.bilibiliVideo.count.mockResolvedValueOnce(3).mockResolvedValueOnce(2);

    const app = createServer(
      buildDeps({
        settings: buildSettings({
          bilibiliEnabled: true,
          bilibiliPollEnabled: true,
          bilibiliPublishEnabled: false,
        }),
        buildBilibiliDiagnostics: async () => ({
          ready: true,
          blocking_reasons: [],
          effective_publish_mode: 'manual_queue',
          checks: {
            worker_or_publish: { ready: true, errors: [] },
          },
          release_gates: {
            worker_or_publish_ready: true,
          },
          signals: {
            credential_present: true,
          },
        }),
      }),
    );
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/bilibili/status',
    });

    expect(response.statusCode).toBe(200);
    expect(mockPrisma.bilibiliCredential.findFirst).toHaveBeenCalledWith({
      where: { is_active: true },
      orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
    });
    expect(mockPrisma.bilibiliVideo.count).toHaveBeenNthCalledWith(1, {});
    expect(mockPrisma.bilibiliVideo.count).toHaveBeenNthCalledWith(2, {
      where: { poll_enabled: true },
    });
    expect(response.json()).toMatchObject({
      ok: true,
      enabled: true,
      polling_enabled: true,
      publish_enabled: false,
      video_count: 3,
      config: {
        enabled: true,
        poll_enabled: true,
        publish_enabled: false,
      },
      credential: {
        id: 7,
        name: '主账号',
        is_active: true,
        expires_at: '2026-12-31T00:00:00.000Z',
      },
      videos: {
        total: 3,
        video_count: 3,
        poll_enabled_count: 2,
      },
      diagnostics: {
        ready: true,
      },
    });

    await app.close();
  });

  it('derives default bilibili diagnostics from runtime credentials', async () => {
    mockPrisma.bilibiliCredential.findFirst.mockResolvedValue({
      id: 7,
      name: '主账号',
      is_active: true,
      sessdata: 'db-sess',
      bili_jct: 'db-jct',
      buvid3: 'db-buvid',
      buvid4: null,
      expires_at: new Date('2026-12-31T00:00:00.000Z'),
      last_used_at: null,
      created_at: new Date('2026-04-01T08:00:00.000Z'),
      updated_at: new Date('2026-04-04T08:35:00.000Z'),
    });
    mockPrisma.bilibiliVideo.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

    const app = createServer({
      settings: buildSettings({
        bilibiliEnabled: true,
        bilibiliPollEnabled: true,
      }),
      checkDatabaseConnection: async () => ({ connected: true }),
      checkRedisConnection: async () => ({ connected: true }),
      probeBilibiliAuth: async () => ({ ok: true, reason: 'verified' }),
    });
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/bilibili/status',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      diagnostics: {
        ready: true,
        blocking_reasons: [],
        checks: {
          auth: {
            ready: true,
            errors: [],
          },
        },
        release_gates: {
          worker_or_publish_ready: true,
          credential_present: true,
          credential_complete: true,
        },
        signals: {
          polling_worker_enabled: true,
          credential_present: true,
          credential_complete: true,
        },
      },
    });

    await app.close();
  });

  it('derives native real-chain diagnostics when native publish is enabled', async () => {
    const originalEnv = {
      BILIBILI_SESSDATA: process.env.BILIBILI_SESSDATA,
      BILIBILI_BILI_JCT: process.env.BILIBILI_BILI_JCT,
      BILIBILI_BUVID3: process.env.BILIBILI_BUVID3,
      PUBLISHER_WEBHOOK_URL: process.env.PUBLISHER_WEBHOOK_URL,
    };

    process.env.BILIBILI_SESSDATA = 'env-sess';
    process.env.BILIBILI_BILI_JCT = 'env-jct';
    process.env.BILIBILI_BUVID3 = 'env-buvid3';
    delete process.env.PUBLISHER_WEBHOOK_URL;
    mockPrisma.bilibiliCredential.findFirst.mockResolvedValue(null);
    mockPrisma.bilibiliVideo.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

    try {
      const app = createServer({
        settings: buildSettings({
          publisherMode: 'manual_queue',
          bilibiliEnabled: true,
          bilibiliPollEnabled: true,
          bilibiliPublishEnabled: true,
        }),
        checkDatabaseConnection: async () => ({ connected: true }),
        checkRedisConnection: async () => ({ connected: true }),
        probeBilibiliAuth: async () => ({ ok: true, reason: 'verified' }),
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/bilibili/status',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        diagnostics: {
          ready: true,
          blocking_reasons: [],
          effective_publish_mode: 'native_bilibili',
          release_gates: {
            worker_or_publish_ready: true,
            native_publish_enabled: true,
            credential_present: true,
            credential_complete: true,
            real_auth_ready: true,
            dependency_ready: true,
            pre_release_real_chain_ready: true,
          },
          signals: {
            effective_publish_mode: 'native_bilibili',
            native_publish_enabled: true,
            credential_present: true,
            credential_complete: true,
            pre_release_real_chain_ready: true,
          },
        },
      });

      await app.close();
    } finally {
      for (const [key, value] of Object.entries(originalEnv)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  });

  it('keeps native diagnostics blocked when the auth probe fails despite complete credentials', async () => {
    const originalEnv = {
      BILIBILI_SESSDATA: process.env.BILIBILI_SESSDATA,
      BILIBILI_BILI_JCT: process.env.BILIBILI_BILI_JCT,
      BILIBILI_BUVID3: process.env.BILIBILI_BUVID3,
    };

    process.env.BILIBILI_SESSDATA = 'env-sess';
    process.env.BILIBILI_BILI_JCT = 'env-jct';
    process.env.BILIBILI_BUVID3 = 'env-buvid3';
    mockPrisma.bilibiliCredential.findFirst.mockResolvedValue(null);
    mockPrisma.bilibiliVideo.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);

    try {
      const app = createServer({
        settings: buildSettings({
          publisherMode: 'manual_queue',
          bilibiliEnabled: true,
          bilibiliPublishEnabled: true,
        }),
        checkDatabaseConnection: async () => ({ connected: true }),
        checkRedisConnection: async () => ({ connected: true }),
        probeBilibiliAuth: async () => ({ ok: false, reason: 'not_logged_in' }),
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/bilibili/status',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        diagnostics: {
          ready: false,
          blocking_reasons: ['auth:credential_validation_failed'],
          effective_publish_mode: 'native_bilibili',
          release_gates: {
            credential_present: true,
            credential_complete: true,
            real_auth_ready: false,
            pre_release_real_chain_ready: false,
          },
          signals: {
            auth_probe_reason: 'not_logged_in',
          },
        },
      });

      await app.close();
    } finally {
      for (const [key, value] of Object.entries(originalEnv)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  });

  it('lists bilibili videos from prisma defaults with comment counts', async () => {
    mockPrisma.bilibiliVideo.count.mockResolvedValue(2);
    mockPrisma.bilibiliVideo.findMany.mockResolvedValue([
      {
        id: 31,
        bvid: 'BV1GJ411x7fD',
        aid: 1001,
        title: '视频一',
        owner_mid: 99,
        poll_enabled: true,
        last_polled_at: new Date('2026-04-04T09:00:00.000Z'),
        last_poll_status: 'ok',
        last_poll_error: null,
        last_rpid: 777,
        created_at: new Date('2026-04-03T09:00:00.000Z'),
        updated_at: new Date('2026-04-04T09:05:00.000Z'),
      },
      {
        id: 32,
        bvid: 'BV1Q541167Qg',
        aid: null,
        title: '视频二',
        owner_mid: null,
        poll_enabled: false,
        last_polled_at: null,
        last_poll_status: null,
        last_poll_error: null,
        last_rpid: 0,
        created_at: new Date('2026-04-02T09:00:00.000Z'),
        updated_at: new Date('2026-04-02T09:05:00.000Z'),
      },
    ]);
    mockPrisma.comment.findMany.mockResolvedValue([
      { video_id: 'BV1GJ411x7fD' },
      { video_id: 'BV1GJ411x7fD' },
      { video_id: 'BV1Q541167Qg' },
    ]);

    const app = createServer(buildDeps());
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/bilibili/videos?limit=20&offset=5',
    });

    expect(response.statusCode).toBe(200);
    expect(mockPrisma.bilibiliVideo.count).toHaveBeenCalledWith({ where: {} });
    expect(mockPrisma.bilibiliVideo.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
      skip: 5,
      take: 20,
    });
    expect(mockPrisma.comment.findMany).toHaveBeenCalledWith({
      where: { video_id: { in: ['BV1GJ411x7fD', 'BV1Q541167Qg'] } },
      select: { video_id: true },
    });
    expect(response.json()).toEqual({
      ok: true,
      total: 2,
      items: [
        {
          id: 31,
          bvid: 'BV1GJ411x7fD',
          aid: 1001,
          title: '视频一',
          owner_mid: 99,
          poll_enabled: true,
          comment_count: 2,
          last_polled_at: '2026-04-04T09:00:00.000Z',
          last_poll_status: 'ok',
          last_poll_error: null,
          last_rpid: 777,
          created_at: '2026-04-03T09:00:00.000Z',
          updated_at: '2026-04-04T09:05:00.000Z',
        },
        {
          id: 32,
          bvid: 'BV1Q541167Qg',
          aid: null,
          title: '视频二',
          owner_mid: null,
          poll_enabled: false,
          comment_count: 1,
          last_polled_at: null,
          last_poll_status: null,
          last_poll_error: null,
          last_rpid: 0,
          created_at: '2026-04-02T09:00:00.000Z',
          updated_at: '2026-04-02T09:05:00.000Z',
        },
      ],
    });

    await app.close();
  });

  it('creates bilibili videos through prisma defaults', async () => {
    mockPrisma.bilibiliVideo.create.mockResolvedValue({
      id: 33,
      bvid: 'BV1GJ411x7fD',
      aid: null,
      title: null,
      owner_mid: null,
      poll_enabled: true,
      last_polled_at: null,
      last_poll_status: null,
      last_poll_error: null,
      last_rpid: 0,
      created_at: new Date('2026-04-04T11:00:00.000Z'),
      updated_at: new Date('2026-04-04T11:00:00.000Z'),
    });

    const app = createServer(buildDeps());
    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/videos',
      payload: {
        bvid: 'BV1GJ411x7fD',
        poll_enabled: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(mockPrisma.bilibiliVideo.create).toHaveBeenCalledWith({
      data: {
        bvid: 'BV1GJ411x7fD',
        poll_enabled: true,
      },
    });
    expect(response.json()).toEqual({
      ok: true,
      item: {
        id: 33,
        bvid: 'BV1GJ411x7fD',
        aid: null,
        title: null,
        owner_mid: null,
        poll_enabled: true,
        comment_count: 0,
        last_polled_at: null,
        last_poll_status: null,
        last_poll_error: null,
        last_rpid: 0,
        created_at: '2026-04-04T11:00:00.000Z',
        updated_at: '2026-04-04T11:00:00.000Z',
      },
    });

    await app.close();
  });

  it('rejects invalid bilibili video poll_enabled payloads', async () => {
    const app = createServer(buildDeps());
    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/videos',
      payload: {
        bvid: 'BV1GJ411x7fD',
        poll_enabled: 'maybe',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(mockPrisma.bilibiliVideo.create).not.toHaveBeenCalled();
    expect(response.json()).toEqual({ detail: 'invalid_poll_enabled' });

    await app.close();
  });

  it('toggles bilibili video polling through prisma defaults with string boolean payloads', async () => {
    mockPrisma.bilibiliVideo.findUnique.mockResolvedValue({
      id: 31,
      bvid: 'BV1GJ411x7fD',
      poll_enabled: true,
    });
    mockPrisma.bilibiliVideo.update.mockResolvedValue({
      id: 31,
      bvid: 'BV1GJ411x7fD',
      poll_enabled: false,
    });

    const app = createServer(buildDeps());
    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/videos/31/toggle-poll',
      payload: {
        poll_enabled: 'false',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(mockPrisma.bilibiliVideo.findUnique).toHaveBeenCalledWith({
      where: { id: 31 },
    });
    expect(mockPrisma.bilibiliVideo.update).toHaveBeenCalledWith({
      where: { id: 31 },
      data: { poll_enabled: false },
    });
    expect(response.json()).toEqual({
      ok: true,
      item: {
        id: 31,
        bvid: 'BV1GJ411x7fD',
        poll_enabled: false,
      },
    });

    await app.close();
  });

  it('deletes bilibili videos through prisma defaults', async () => {
    mockPrisma.bilibiliVideo.findUnique.mockResolvedValue({
      id: 31,
      bvid: 'BV1GJ411x7fD',
      poll_enabled: true,
    });
    mockPrisma.bilibiliVideo.delete.mockResolvedValue({
      id: 31,
    });

    const app = createServer(buildDeps());
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/admin/bilibili/videos/31',
    });

    expect(response.statusCode).toBe(200);
    expect(mockPrisma.bilibiliVideo.findUnique).toHaveBeenCalledWith({
      where: { id: 31 },
    });
    expect(mockPrisma.bilibiliVideo.delete).toHaveBeenCalledWith({
      where: { id: 31 },
    });
    expect(response.json()).toEqual({
      ok: true,
      deleted_id: 31,
    });

    await app.close();
  });

  it('syncs bilibili videos through the poller and returns refreshed video data', async () => {
    mockPrisma.bilibiliVideo.findUnique
      .mockResolvedValueOnce({
        id: 31,
        bvid: 'BV1GJ411x7fD',
        aid: 1001,
        title: '同步前',
        owner_mid: 99,
        poll_enabled: true,
        last_polled_at: null,
        last_poll_status: null,
        last_poll_error: null,
        last_rpid: 0,
        created_at: new Date('2026-04-03T09:00:00.000Z'),
        updated_at: new Date('2026-04-04T09:05:00.000Z'),
      })
      .mockResolvedValueOnce({
        id: 31,
        bvid: 'BV1GJ411x7fD',
        aid: 1001,
        title: '同步后',
        owner_mid: 99,
        poll_enabled: true,
        last_polled_at: new Date('2026-04-04T12:00:00.000Z'),
        last_poll_status: 'ok',
        last_poll_error: null,
        last_rpid: 888,
        created_at: new Date('2026-04-03T09:00:00.000Z'),
        updated_at: new Date('2026-04-04T12:00:00.000Z'),
      });
    mockPrisma.comment.count.mockResolvedValue(4);
    mockPollVideoById.mockResolvedValue({
      status: 'completed',
      videos: 1,
      comments: 4,
      events_injected: 4,
      details: [
        {
          bvid: 'BV1GJ411x7fD',
          comments: 4,
          status: 'success',
        },
      ],
    });

    const app = createServer(buildDeps());
    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/videos/31/sync',
    });

    expect(response.statusCode).toBe(200);
    expect(mockPollVideoById).toHaveBeenCalledWith(31);
    expect(mockPrisma.bilibiliVideo.findUnique).toHaveBeenNthCalledWith(1, {
      where: { id: 31 },
    });
    expect(mockPrisma.bilibiliVideo.findUnique).toHaveBeenNthCalledWith(2, {
      where: { id: 31 },
    });
    expect(mockPrisma.comment.count).toHaveBeenCalledWith({
      where: { video_id: 'BV1GJ411x7fD' },
    });
    expect(response.json()).toEqual({
      ok: true,
      item: {
        id: 31,
        bvid: 'BV1GJ411x7fD',
        aid: 1001,
        title: '同步后',
        owner_mid: 99,
        poll_enabled: true,
        comment_count: 4,
        last_polled_at: '2026-04-04T12:00:00.000Z',
        last_poll_status: 'ok',
        last_poll_error: null,
        last_rpid: 888,
        created_at: '2026-04-03T09:00:00.000Z',
        updated_at: '2026-04-04T12:00:00.000Z',
      },
      result: {
        status: 'completed',
        videos: 1,
        comments: 4,
        events_injected: 4,
        details: [
          {
            bvid: 'BV1GJ411x7fD',
            comments: 4,
            status: 'success',
          },
        ],
      },
    });

    await app.close();
  });

  it('returns a conflict when bilibili video sync is requested without runtime credentials', async () => {
    mockPrisma.bilibiliVideo.findUnique.mockResolvedValue({
      id: 31,
      bvid: 'BV1GJ411x7fD',
      aid: 1001,
      title: '同步前',
      owner_mid: 99,
      poll_enabled: true,
      last_polled_at: null,
      last_poll_status: null,
      last_poll_error: null,
      last_rpid: 0,
      created_at: new Date('2026-04-03T09:00:00.000Z'),
      updated_at: new Date('2026-04-04T09:05:00.000Z'),
    });
    mockPollVideoById.mockResolvedValue({
      status: 'disabled',
      videos: 0,
      comments: 0,
      events_injected: 0,
      details: [],
    });

    const app = createServer(buildDeps());
    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/videos/31/sync',
    });

    expect(response.statusCode).toBe(409);
    expect(mockPrisma.bilibiliVideo.findUnique).toHaveBeenCalledTimes(1);
    expect(mockPrisma.comment.count).not.toHaveBeenCalled();
    expect(response.json()).toEqual({
      detail: 'bilibili_not_configured',
      result: {
        status: 'disabled',
        videos: 0,
        comments: 0,
        events_injected: 0,
        details: [],
      },
    });

    await app.close();
  });

  it('returns a conflict when manual bilibili polling is requested without runtime credentials', async () => {
    mockPollAllVideos.mockResolvedValue({
      status: 'disabled',
      videos: 0,
      comments: 0,
      events_injected: 0,
      details: [],
    });

    const app = createServer(buildDeps());
    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/poll',
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      detail: 'bilibili_not_configured',
      result: {
        status: 'disabled',
        videos: 0,
        comments: 0,
        events_injected: 0,
        details: [],
      },
    });

    await app.close();
  });

  it('lists bilibili credentials with safe summaries from prisma defaults', async () => {
    mockPrisma.bilibiliCredential.findMany.mockResolvedValue([
      {
        id: 7,
        name: '主账号',
        is_active: true,
        sessdata: 'stored-sess',
        bili_jct: 'stored-jct',
        buvid3: 'abcdefghi12345',
        expires_at: new Date('2026-12-31T00:00:00.000Z'),
        last_used_at: new Date('2026-04-04T08:30:00.000Z'),
        created_at: new Date('2026-04-01T08:00:00.000Z'),
        updated_at: new Date('2026-04-04T08:35:00.000Z'),
      },
    ]);

    const app = createServer(buildDeps());
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/bilibili/credentials',
    });

    expect(response.statusCode).toBe(200);
    expect(mockPrisma.bilibiliCredential.findMany).toHaveBeenCalledWith({
      orderBy: { updated_at: 'desc' },
    });
    expect(response.json()).toEqual({
      ok: true,
      items: [
        {
          id: 7,
          name: '主账号',
          is_active: true,
          has_sessdata: true,
          has_bili_jct: true,
          buvid3: 'abcdefgh...',
          expires_at: '2026-12-31T00:00:00.000Z',
          last_used_at: '2026-04-04T08:30:00.000Z',
          created_at: '2026-04-01T08:00:00.000Z',
          updated_at: '2026-04-04T08:35:00.000Z',
        },
      ],
    });

    await app.close();
  });

  it('creates bilibili credentials through prisma defaults and auto-activates the first credential', async () => {
    mockPrisma.bilibiliCredential.count.mockResolvedValue(0);
    mockPrisma.bilibiliCredential.create.mockResolvedValue({
      id: 8,
      name: '副账号',
      is_active: true,
      expires_at: new Date('2026-12-31T00:00:00.000Z'),
    });

    const app = createServer(buildDeps());
    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/credentials',
      payload: {
        name: '副账号',
        sessdata: 'sess-1',
        bili_jct: 'jct-1',
        buvid3: 'buvid-1',
        buvid4: 'buvid-4',
        expires_at: '2026-12-31T00:00:00.000Z',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(mockPrisma.bilibiliCredential.count).toHaveBeenCalledWith();
    expect(mockPrisma.bilibiliCredential.create).toHaveBeenCalledTimes(1);
    const credentialCreateArgs = mockPrisma.bilibiliCredential.create.mock.calls[0][0];
    expect(credentialCreateArgs).toMatchObject({
      data: {
        name: '副账号',
        is_active: true,
        expires_at: new Date('2026-12-31T00:00:00.000Z'),
      },
    });
    expect(typeof credentialCreateArgs.data.sessdata).toBe('string');
    expect(typeof credentialCreateArgs.data.bili_jct).toBe('string');
    expect(typeof credentialCreateArgs.data.buvid3).toBe('string');
    expect(typeof credentialCreateArgs.data.buvid4).toBe('string');
    expect(credentialCreateArgs.data.sessdata.length).toBeGreaterThan(0);
    expect(credentialCreateArgs.data.bili_jct.length).toBeGreaterThan(0);
    expect(credentialCreateArgs.data.buvid3.length).toBeGreaterThan(0);
    expect(credentialCreateArgs.data.buvid4.length).toBeGreaterThan(0);
    expect(response.json()).toEqual({
      ok: true,
      item: {
        id: 8,
        name: '副账号',
        is_active: true,
        expires_at: '2026-12-31T00:00:00.000Z',
      },
    });

    await app.close();
  });

  it('rejects invalid bilibili credential expiry timestamps', async () => {
    const app = createServer(buildDeps());
    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/credentials',
      payload: {
        name: '副账号',
        sessdata: 'sess-1',
        bili_jct: 'jct-1',
        buvid3: 'buvid-1',
        expires_at: 'not-a-date',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(mockPrisma.bilibiliCredential.count).not.toHaveBeenCalled();
    expect(mockPrisma.bilibiliCredential.create).not.toHaveBeenCalled();
    expect(response.json()).toEqual({ detail: 'invalid_expires_at' });

    await app.close();
  });

  it('activates bilibili credentials through prisma defaults', async () => {
    mockPrisma.bilibiliCredential.findUnique.mockResolvedValue({
      id: 8,
      name: '副账号',
      is_active: false,
    });
    mockPrisma.bilibiliCredential.updateMany.mockResolvedValue({ count: 2 });
    mockPrisma.bilibiliCredential.update.mockResolvedValue({
      id: 8,
      is_active: true,
    });

    const app = createServer(buildDeps());
    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/credentials/8/activate',
    });

    expect(response.statusCode).toBe(200);
    expect(mockPrisma.bilibiliCredential.findUnique).toHaveBeenCalledWith({
      where: { id: 8 },
    });
    expect(mockPrisma.bilibiliCredential.updateMany).toHaveBeenCalledWith({
      data: { is_active: false },
    });
    expect(mockPrisma.bilibiliCredential.update).toHaveBeenCalledWith({
      where: { id: 8 },
      data: { is_active: true },
    });
    expect(response.json()).toEqual({
      ok: true,
      active_credential_id: 8,
    });

    await app.close();
  });

  it('deletes bilibili credentials through prisma defaults', async () => {
    mockPrisma.bilibiliCredential.findUnique.mockResolvedValue({
      id: 8,
      name: '副账号',
      is_active: false,
    });
    mockPrisma.bilibiliCredential.delete.mockResolvedValue({
      id: 8,
    });

    const app = createServer(buildDeps());
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/admin/bilibili/credentials/8',
    });

    expect(response.statusCode).toBe(200);
    expect(mockPrisma.bilibiliCredential.findUnique).toHaveBeenCalledWith({
      where: { id: 8 },
    });
    expect(mockPrisma.bilibiliCredential.delete).toHaveBeenCalledWith({
      where: { id: 8 },
    });
    expect(response.json()).toEqual({
      ok: true,
      deleted_id: 8,
    });

    await app.close();
  });

  it('records durable pending gateway reservations and keeps webhook misconfiguration visible', async () => {
    process.env.PUBLISHER_MODE = 'webhook';

    mockPrisma.publishLog.findUnique.mockResolvedValue(null);
    mockPrisma.publishLog.create.mockResolvedValue({
      id: 91,
      reservation_key: 'publish-log:reservation-1',
    });
    mockPrisma.publishLog.updateMany.mockResolvedValue({ count: 1 });

    const app = createServer(buildDeps());
    const response = await app.inject({
      method: 'POST',
      url: '/gateway/publish',
      payload: {
        comment_id: 'comment-gateway-1',
        reply_text: 'hello gateway',
        source: 'gateway',
        trace_id: 'trace-gateway-1',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: false,
      published: false,
      reason: 'webhook_not_configured',
      comment_id: 'comment-gateway-1',
      trace_id: 'trace-gateway-1',
    });
    expect(mockPrisma.publishLog.create).toHaveBeenCalledWith({
      data: {
        platform: 'bilibili',
        reservation_key: expect.any(String),
        canonical_comment_id: 'bilibili:comment-gateway-1',
        comment_id: 'comment-gateway-1',
        reply_hash: expect.any(String),
        source: 'gateway',
        status: 'pending',
        published_at: null,
        failure_reason: null,
      },
    });
    expect(mockPrisma.publishLog.updateMany).toHaveBeenCalledWith({
      where: { reservation_key: expect.any(String) },
      data: {
        status: 'failed',
        source: 'gateway',
        failure_reason: 'webhook_not_configured',
        published_at: null,
        reservation_key: null,
      },
    });

    await app.close();
  });

  it('persists a recoverable queue backlog when comment ingest cannot enqueue', async () => {
    mockPrisma.comment.create.mockResolvedValue({
      id: 1,
      canonical_comment_id: 'bilibili:comment-queue-1',
    });
    mockCommentQueueAdd.mockRejectedValue(new Error('redis offline'));
    mockPrisma.commentQueueBacklog.upsert.mockResolvedValue({
      id: 77,
    });
    mockPrisma.operationAuditLog.create.mockResolvedValue({ id: 500 });

    const app = createServer(buildDeps());
    const response = await app.inject({
      method: 'POST',
      url: '/events/comment',
      payload: {
        comment_id: 'comment-queue-1',
        content: 'queue me later',
        trace_id: 'trace-queue-1',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: false,
      queued: false,
      message: 'queue_unavailable',
      comment_id: 'comment-queue-1',
      trace_id: 'trace-queue-1',
      recovery: {
        backlog_id: 77,
        status: 'pending_requeue',
        recoverable: true,
      },
    });
    expect(mockPrisma.commentQueueBacklog.upsert).toHaveBeenCalled();
    expect(mockPrisma.operationAuditLog.create).toHaveBeenCalledWith({
      data: {
        action: 'comment_ingest',
        target_type: 'reply_job',
        target_id: null,
        ok: false,
        payload: expect.stringContaining('"status":"pending_requeue"'),
      },
    });

    await app.close();
  });

  it('requeues duplicate comment ingests from the durable backlog once the queue returns', async () => {
    mockPrisma.comment.create.mockRejectedValue(new Error('UNIQUE constraint failed: comments.canonical_comment_id'));
    mockPrisma.commentQueueBacklog.findUnique.mockResolvedValue({
      id: 88,
      canonical_comment_id: 'bilibili:comment-queue-2',
      status: 'pending_requeue',
      payload_json: JSON.stringify({
        comment_id: 'comment-queue-2',
        content: 'stored payload',
        platform: 'bilibili',
        source: 'webhook',
      }),
    });
    mockCommentQueueAdd.mockResolvedValue({ id: 'job-queue-2' });
    mockPrisma.commentQueueBacklog.update.mockResolvedValue({
      id: 88,
    });
    mockPrisma.operationAuditLog.create.mockResolvedValue({ id: 501 });

    const app = createServer(buildDeps());
    const response = await app.inject({
      method: 'POST',
      url: '/events/comment',
      payload: {
        comment_id: 'comment-queue-2',
        content: 'retry now',
        trace_id: 'trace-queue-2',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      queued: true,
      message: 'requeued_from_backlog',
      comment_id: 'comment-queue-2',
      trace_id: 'trace-queue-2',
      recovery: {
        backlog_id: 88,
        status: 'requeued',
        recoverable: true,
        recovered: true,
      },
    });
    expect(mockPrisma.commentQueueBacklog.update).toHaveBeenCalledWith({
      where: { canonical_comment_id: 'webhook:comment-queue-2' },
      data: {
        source: 'webhook',
        payload_json: expect.any(String),
        status: 'requeued',
        last_error: null,
        queue_attempts: { increment: 1 },
        last_attempt_at: expect.any(Date),
        recovered_at: expect.any(Date),
        updated_at: expect.any(Date),
      },
    });

    await app.close();
  });
});

describe('default query and export providers', () => {
  it('returns comment details with related jobs from prisma', async () => {
    mockPrisma.comment.findFirst.mockResolvedValue({
      id: 11,
      platform: 'qq',
      canonical_comment_id: 'qq:comment-2',
      comment_id: 'comment-2',
      video_id: 'group-2',
      user_id: 'user-2',
      content: '这是评论正文',
      parent_id: 'message-root-2',
      created_at: new Date('2026-04-04T08:00:00.000Z'),
    });
    mockPrisma.replyJob.findMany.mockResolvedValue([
      {
        id: 7,
        comment_id: 'comment-2',
        canonical_comment_id: 'qq:comment-2',
        status: 'published',
        reply_text: '已回复',
        created_at: new Date('2026-04-04T09:00:00.000Z'),
      },
    ]);

    const app = createServer(buildDeps());
    const response = await app.inject({ method: 'GET', url: '/comments/comment-2' });

    expect(response.statusCode).toBe(200);
    expect(mockPrisma.comment.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [{ comment_id: 'comment-2' }, { canonical_comment_id: 'comment-2' }],
      },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
    expect(response.json()).toMatchObject({
      ok: true,
      comment: {
        comment_id: 'comment-2',
        canonical_comment_id: 'qq:comment-2',
        platform: 'qq',
        content: '这是评论正文',
        route_context: {
          platform: 'qq',
          container_id: 'group-2',
          user_id: 'user-2',
          parent_external_id: 'message-root-2',
          chat_type: 'group',
        },
        created_at: '2026-04-04T08:00:00.000Z',
      },
      jobs: [
        {
          id: 7,
          comment_id: 'comment-2',
          canonical_comment_id: 'qq:comment-2',
          status: 'published',
          reply_text: '已回复',
          comment_content: '这是评论正文',
          platform: 'qq',
          route_context: {
            platform: 'qq',
            container_id: 'group-2',
            user_id: 'user-2',
            parent_external_id: 'message-root-2',
            chat_type: 'group',
          },
          created_at: '2026-04-04T09:00:00.000Z',
        },
      ],
    });

    await app.close();
  });

  it('returns flattened top-level fields for the job detail query route', async () => {
    mockPrisma.replyJob.findUnique.mockResolvedValue({
      id: 101,
      comment_id: 'comment-9',
      canonical_comment_id: 'qq:comment-9',
      status: 'manual_queue',
      reply_text: '待人工审核回复',
      created_at: new Date('2026-04-04T10:00:00.000Z'),
    });
    mockPrisma.comment.findFirst.mockResolvedValue({
      id: 12,
      platform: 'qq',
      canonical_comment_id: 'qq:comment-9',
      comment_id: 'comment-9',
      video_id: 'group-9',
      user_id: 'user-9',
      content: '关联评论内容',
      parent_id: 'message-root-9',
      created_at: new Date('2026-04-04T09:30:00.000Z'),
    });

    const app = createServer(buildDeps());
    const response = await app.inject({ method: 'GET', url: '/api/jobs/101' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      id: 101,
      comment_id: 'comment-9',
      canonical_comment_id: 'qq:comment-9',
      status: 'manual_queue',
      reply_text: '待人工审核回复',
      comment_content: '关联评论内容',
      platform: 'qq',
      route_context: {
        platform: 'qq',
        container_id: 'group-9',
        user_id: 'user-9',
        parent_external_id: 'message-root-9',
        chat_type: 'group',
      },
      item: {
        id: 101,
        comment_id: 'comment-9',
        status: 'manual_queue',
      },
    });

    await app.close();
  });

  it('lists jobs from prisma with pending_review compatibility filtering', async () => {
    mockPrisma.replyJob.findMany.mockResolvedValue([
      {
        id: 15,
        comment_id: 'comment-15',
        canonical_comment_id: 'qq:comment-15',
        status: 'blocked',
        reply_text: null,
        created_at: new Date('2026-04-04T11:00:00.000Z'),
      },
    ]);
    mockPrisma.comment.findMany.mockResolvedValue([
      {
        id: 15,
        platform: 'qq',
        canonical_comment_id: 'qq:comment-15',
        comment_id: 'comment-15',
        video_id: '',
        user_id: 'user-15',
        content: '被拦截的评论',
        parent_id: null,
        created_at: new Date('2026-04-04T10:30:00.000Z'),
      },
    ]);

    const app = createServer(buildDeps());
    const response = await app.inject({
      method: 'GET',
      url: '/jobs?status=pending_review&limit=10&offset=5',
    });

    expect(response.statusCode).toBe(200);
    expect(mockPrisma.replyJob.findMany).toHaveBeenCalledWith({
      where: {
        status: {
          in: ['manual_queue', 'blocked', 'dedupe_skipped'],
        },
      },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      skip: 5,
      take: 10,
    });
    expect(response.json()).toEqual({
      ok: true,
      items: [
        {
          id: 15,
          comment_id: 'comment-15',
          canonical_comment_id: 'qq:comment-15',
          status: 'blocked',
          reply_text: null,
          style_profile: null,
          role_profile: null,
          role_card_key: null,
          force_long: null,
          platform: 'qq',
          route_context: {
            platform: 'qq',
            user_id: 'user-15',
            chat_type: 'private',
          },
          created_at: '2026-04-04T11:00:00.000Z',
          updated_at: null,
          comment_content: '被拦截的评论',
        },
      ],
    });

    await app.close();
  });

  it('exports jobs csv from prisma by default', async () => {
    mockPrisma.replyJob.findMany.mockResolvedValue([
      {
        id: 21,
        comment_id: 'comment-21',
        canonical_comment_id: 'bilibili:comment-21',
        status: 'manual_queue',
        reply_text: '等待审核',
        created_at: new Date('2026-04-04T12:00:00.000Z'),
      },
    ]);

    const app = createServer(buildDeps());
    const response = await app.inject({
      method: 'GET',
      url: '/export/jobs.csv?status=pending_review&limit=500',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('text/csv');
    expect(mockPrisma.replyJob.findMany).toHaveBeenCalledWith({
      where: {
        status: {
          in: ['manual_queue', 'blocked', 'dedupe_skipped'],
        },
      },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      take: 500,
    });
    expect(response.body).toBe(
      'job_id,comment_id,status,created_at\n21,comment-21,manual_queue,2026-04-04T12:00:00.000Z\n',
    );

    await app.close();
  });

  it('lists comments with derived route context for QQ records', async () => {
    mockPrisma.comment.count.mockResolvedValue(1);
    mockPrisma.comment.findMany.mockResolvedValue([
      {
        id: 51,
        platform: 'qq',
        canonical_comment_id: 'qq:comment-51',
        comment_id: 'comment-51',
        video_id: 'group-51',
        user_id: 'user-51',
        content: 'QQ comment',
        parent_id: 'message-root-51',
        created_at: new Date('2026-04-04T14:00:00.000Z'),
      },
    ]);

    const app = createServer(buildDeps());
    const response = await app.inject({
      method: 'GET',
      url: '/comments?limit=10&offset=0',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      total: 1,
      items: [
        {
          id: 51,
          platform: 'qq',
          canonical_comment_id: 'qq:comment-51',
          comment_id: 'comment-51',
          route_context: {
            platform: 'qq',
            container_id: 'group-51',
            user_id: 'user-51',
            parent_external_id: 'message-root-51',
            chat_type: 'group',
          },
        },
      ],
    });

    await app.close();
  });
});

describe('audit log list compatibility', () => {
  it('derives detail, status, and trace_id fields from audit payloads', async () => {
    mockPrisma.operationAuditLog.count.mockResolvedValue(1);
    mockPrisma.operationAuditLog.findMany.mockResolvedValue([
      {
        id: 31,
        action: 'approve_single',
        target_type: 'reply_job',
        target_id: 31,
        ok: false,
        payload: JSON.stringify({
          status: 'publish_failed',
          trace_id: 'trace-audit-31',
          error: 'approve_publish_failed',
        }),
        created_at: new Date('2026-04-04T13:00:00.000Z'),
      },
    ]);

    const app = createServer(buildDeps());
    const response = await app.inject({
      method: 'GET',
      url: '/api/audit-log?limit=30',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      summary: {
        total: 1,
        returned: 1,
        limit: 30,
      },
      items: [
        {
          id: 31,
          action: 'approve_single',
          target_type: 'reply_job',
          target_id: 31,
          ok: false,
          status: 'publish_failed',
          trace_id: 'trace-audit-31',
          detail: 'approve_publish_failed',
          payload: {
            status: 'publish_failed',
            trace_id: 'trace-audit-31',
            error: 'approve_publish_failed',
          },
          created_at: '2026-04-04T13:00:00.000Z',
        },
      ],
    });

    await app.close();
  });
});

describe('default knowledge providers', () => {
  it('lists knowledge entries from prisma with created_at compatibility', async () => {
    mockPrisma.knowledgeEntry.findMany.mockResolvedValue([
      {
        id: 41,
        category: 'persona',
        title: '角色设定',
        content: '保持温和回复',
        enabled: true,
        updated_at: new Date('2026-04-04T14:00:00.000Z'),
      },
    ]);

    const app = createServer(buildDeps());
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/knowledge?limit=50&offset=10',
    });

    expect(response.statusCode).toBe(200);
    expect(mockPrisma.knowledgeEntry.findMany).toHaveBeenCalledWith({
      orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
      skip: 10,
      take: 50,
    });
    expect(response.json()).toEqual({
      ok: true,
      items: [
        {
          id: 41,
          category: 'persona',
          title: '角色设定',
          content: '保持温和回复',
          enabled: true,
          created_at: '2026-04-04T14:00:00.000Z',
          updated_at: '2026-04-04T14:00:00.000Z',
        },
      ],
    });

    await app.close();
  });

  it('creates knowledge entries through prisma by default', async () => {
    mockPrisma.knowledgeEntry.create.mockResolvedValue({
      id: 42,
      category: 'persona',
      title: '新条目',
      content: '新的知识内容',
      enabled: true,
      updated_at: new Date('2026-04-04T14:10:00.000Z'),
    });

    const app = createServer(buildDeps());
    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/knowledge',
      payload: {
        category: '  persona  ',
        title: '  新条目  ',
        content: '  新的知识内容  ',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(mockPrisma.knowledgeEntry.create).toHaveBeenCalledWith({
      data: {
        category: 'persona',
        title: '新条目',
        content: '新的知识内容',
        enabled: true,
      },
    });
    expect(response.json()).toEqual({
      ok: true,
      item: {
        id: 42,
        category: 'persona',
        title: '新条目',
        content: '新的知识内容',
        enabled: true,
        created_at: '2026-04-04T14:10:00.000Z',
        updated_at: '2026-04-04T14:10:00.000Z',
      },
    });

    await app.close();
  });

  it('disables knowledge entries through prisma by default', async () => {
    mockPrisma.knowledgeEntry.update.mockResolvedValue({
      id: 42,
      category: 'persona',
      title: '旧条目',
      content: '旧内容',
      enabled: false,
      updated_at: new Date('2026-04-04T14:20:00.000Z'),
    });

    const app = createServer(buildDeps());
    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/knowledge/42/disable',
    });

    expect(response.statusCode).toBe(200);
    expect(mockPrisma.knowledgeEntry.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: {
        enabled: false,
        updated_at: expect.any(Date),
      },
    });
    expect(response.json()).toEqual({
      ok: true,
      item: {
        id: 42,
        enabled: false,
        updated_at: '2026-04-04T14:20:00.000Z',
      },
    });

    await app.close();
  });
});

describe('default role card providers', () => {
  it('lists role cards from prisma with parsed tone and constraints', async () => {
    mockPrisma.roleCard.findMany.mockResolvedValue([
      {
        id: 51,
        key: 'default',
        name: '默认角色卡',
        description: '默认说明',
        system_prompt: 'Be helpful',
        tone: 'friendly',
        constraints: JSON.stringify({ max_length: 120 }),
        enabled: true,
        is_active: true,
        created_at: new Date('2026-04-04T15:00:00.000Z'),
        updated_at: new Date('2026-04-04T15:10:00.000Z'),
      },
      {
        id: 52,
        key: 'backup',
        name: '备用角色卡',
        description: '备用说明',
        system_prompt: 'Be concise',
        tone: JSON.stringify({ style: 'formal' }),
        constraints: 'plain text',
        enabled: false,
        is_active: false,
        created_at: new Date('2026-04-04T14:00:00.000Z'),
        updated_at: new Date('2026-04-04T14:10:00.000Z'),
      },
    ]);

    const app = createServer(buildDeps());
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/role-cards?limit=100&offset=5',
    });

    expect(response.statusCode).toBe(200);
    expect(mockPrisma.roleCard.findMany).toHaveBeenCalledWith({
      orderBy: [{ is_active: 'desc' }, { updated_at: 'desc' }, { id: 'desc' }],
      skip: 5,
      take: 100,
    });
    expect(response.json()).toEqual({
      ok: true,
      active_role_card_key: 'default',
      items: [
        {
          id: 51,
          key: 'default',
          name: '默认角色卡',
          description: '默认说明',
          system_prompt: 'Be helpful',
          tone: 'friendly',
          constraints: { max_length: 120 },
          enabled: true,
          is_active: true,
          created_at: '2026-04-04T15:00:00.000Z',
          updated_at: '2026-04-04T15:10:00.000Z',
        },
        {
          id: 52,
          key: 'backup',
          name: '备用角色卡',
          description: '备用说明',
          system_prompt: 'Be concise',
          tone: { style: 'formal' },
          constraints: 'plain text',
          enabled: false,
          is_active: false,
          created_at: '2026-04-04T14:00:00.000Z',
          updated_at: '2026-04-04T14:10:00.000Z',
        },
      ],
    });

    await app.close();
  });

  it('creates role cards through prisma while preserving string tone inputs', async () => {
    mockPrisma.roleCard.create.mockResolvedValue({
      id: 53,
      key: 'new-card',
      name: '新角色卡',
      description: '新描述',
      system_prompt: 'Stay warm',
      tone: 'playful',
      constraints: 'keep short',
      enabled: true,
      is_active: false,
      created_at: new Date('2026-04-04T15:20:00.000Z'),
      updated_at: new Date('2026-04-04T15:20:00.000Z'),
    });

    const app = createServer(buildDeps());
    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/role-cards',
      payload: {
        key: '  NEW-CARD  ',
        name: '  新角色卡  ',
        description: '新描述',
        system_prompt: 'Stay warm',
        tone: '  playful  ',
        constraints: 'keep short',
        enabled: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(mockPrisma.roleCard.create).toHaveBeenCalledWith({
      data: {
        key: 'new-card',
        name: '新角色卡',
        description: '新描述',
        system_prompt: 'Stay warm',
        tone: 'playful',
        constraints: 'keep short',
        enabled: true,
        is_active: false,
      },
    });
    expect(response.json()).toEqual({
      ok: true,
      item: {
        id: 53,
        key: 'new-card',
        name: '新角色卡',
        description: '新描述',
        system_prompt: 'Stay warm',
        tone: 'playful',
        constraints: 'keep short',
        enabled: true,
        is_active: false,
        created_at: '2026-04-04T15:20:00.000Z',
        updated_at: '2026-04-04T15:20:00.000Z',
      },
    });

    await app.close();
  });

  it('updates role cards through prisma and serializes object constraints', async () => {
    mockPrisma.roleCard.update.mockResolvedValue({
      id: 53,
      key: 'new-card',
      name: '更新后角色卡',
      description: '更新描述',
      system_prompt: 'Stay warmer',
      tone: 'serious',
      constraints: JSON.stringify({ max_length: 80 }),
      enabled: true,
      is_active: false,
      created_at: new Date('2026-04-04T15:20:00.000Z'),
      updated_at: new Date('2026-04-04T15:30:00.000Z'),
    });

    const app = createServer(buildDeps());
    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/role-cards/new-card',
      payload: {
        name: '  更新后角色卡  ',
        tone: '  serious  ',
        constraints: { max_length: 80 },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(mockPrisma.roleCard.update).toHaveBeenCalledWith({
      where: { key: 'new-card' },
      data: {
        name: '更新后角色卡',
        tone: 'serious',
        constraints: JSON.stringify({ max_length: 80 }),
        updated_at: expect.any(Date),
      },
    });
    expect(response.json()).toEqual({
      ok: true,
      item: {
        id: 53,
        key: 'new-card',
        name: '更新后角色卡',
        description: '更新描述',
        system_prompt: 'Stay warmer',
        tone: 'serious',
        constraints: { max_length: 80 },
        enabled: true,
        is_active: false,
        created_at: '2026-04-04T15:20:00.000Z',
        updated_at: '2026-04-04T15:30:00.000Z',
      },
    });

    await app.close();
  });

  it('disables and activates role cards through prisma by default', async () => {
    mockPrisma.roleCard.update
      .mockResolvedValueOnce({
        id: 53,
        key: 'new-card',
        name: '更新后角色卡',
        description: '更新描述',
        system_prompt: 'Stay warmer',
        tone: 'serious',
        constraints: '{}',
        enabled: false,
        is_active: false,
        created_at: new Date('2026-04-04T15:20:00.000Z'),
        updated_at: new Date('2026-04-04T15:40:00.000Z'),
      })
      .mockResolvedValueOnce({
        id: 53,
        key: 'new-card',
        name: '更新后角色卡',
        description: '更新描述',
        system_prompt: 'Stay warmer',
        tone: 'serious',
        constraints: '{}',
        enabled: true,
        is_active: true,
        created_at: new Date('2026-04-04T15:20:00.000Z'),
        updated_at: new Date('2026-04-04T15:41:00.000Z'),
      });
    mockPrisma.roleCard.updateMany.mockResolvedValue({ count: 2 });

    const app = createServer(buildDeps());
    const disableResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/role-cards/new-card/disable',
    });
    const activateResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/role-cards/new-card/activate',
    });

    expect(disableResponse.statusCode).toBe(200);
    expect(disableResponse.json()).toEqual({
      ok: true,
      item: {
        key: 'new-card',
        enabled: false,
        is_active: false,
        updated_at: '2026-04-04T15:40:00.000Z',
      },
    });
    expect(mockPrisma.roleCard.updateMany).toHaveBeenCalledWith({
      data: {
        is_active: false,
      },
    });
    expect(activateResponse.statusCode).toBe(200);
    expect(activateResponse.json()).toEqual({
      ok: true,
      active_role_card_key: 'new-card',
    });

    await app.close();
  });
});
