import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RuntimeSettings, ServerDependencies } from '../src/main.js';

const mockPrisma = {
  comment: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  replyJob: {
    count: vi.fn(),
    findMany: vi.fn(),
    groupBy: vi.fn(),
  },
  publishLog: {
    findMany: vi.fn(),
  },
  operationAuditLog: {
    findMany: vi.fn(),
  },
};

vi.mock('../src/lib/prisma.js', () => ({
  DEFAULT_DATABASE_URL: 'file:./test.db',
  getPrisma: () => mockPrisma,
}));

const { createServer } = await import('../src/main.js');

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

function resetMockPrisma(): void {
  for (const model of Object.values(mockPrisma)) {
    for (const fn of Object.values(model)) {
      fn.mockReset();
    }
  }
}

beforeEach(() => {
  resetMockPrisma();
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
          published_at: '2026-04-04T11:00:00.000Z',
          failure_reason: null,
          created_at: '2026-04-04T10:59:00.000Z',
        },
      ],
    });

    await app.close();
  });
});
