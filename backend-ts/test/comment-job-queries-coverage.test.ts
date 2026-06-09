import { describe, expect, it, vi } from 'vitest';

import {
  __commentJobQueryTesting,
  buildCommentRouteContext,
  createCommentJobQueryHelpers,
} from '../src/server/comment-job-queries.js';

function normalizeNullableIsoTimestamp(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function csvEscape(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function buildPrisma() {
  return {
    comment: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    replyJob: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  };
}

function buildHelpers(prisma = buildPrisma()) {
  return {
    helpers: createCommentJobQueryHelpers({
      getPrisma: () => prisma as never,
      normalizeNullableIsoTimestamp,
      csvEscape,
    }),
    prisma,
  };
}

function buildComment(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    platform: 'qq',
    canonical_comment_id: 'qq:comment-1',
    comment_id: 'comment-1',
    video_id: 'group-1',
    user_id: 'user-1',
    content: 'comment text',
    parent_id: 'message-0',
    created_at: new Date('2026-06-09T01:00:00.000Z'),
    ...overrides,
  };
}

function buildJob(overrides: Record<string, unknown> = {}) {
  return {
    id: 101,
    comment_id: 'comment-1',
    canonical_comment_id: 'qq:comment-1',
    status: 'manual_queue',
    reply_text: 'reply text',
    style_profile: 'gentle',
    role_profile: 'comfort',
    role_card_key: 'card-1',
    force_long: true,
    created_at: new Date('2026-06-09T02:00:00.000Z'),
    updated_at: new Date('2026-06-09T03:00:00.000Z'),
    ...overrides,
  };
}

describe('comment job query helpers coverage', () => {
  it('covers direct status, platform, and record normalization helper fallbacks', () => {
    expect(__commentJobQueryTesting.buildAdminJobStatusWhere()).toEqual({});
    expect(__commentJobQueryTesting.buildAdminJobStatusWhere(' pending_review ')).toEqual({
      status: { in: ['manual_queue', 'blocked', 'dedupe_skipped'] },
    });
    expect(__commentJobQueryTesting.inferPlatformFromCanonicalCommentId(null)).toBeNull();
    expect(__commentJobQueryTesting.inferPlatformFromCanonicalCommentId('no-separator')).toBeNull();
    expect(__commentJobQueryTesting.inferPlatformFromCanonicalCommentId(':missing-platform')).toBeNull();

    expect(__commentJobQueryTesting.normalizeQueryJobRecord({}, normalizeNullableIsoTimestamp)).toEqual({
      id: 0,
      comment_id: '',
      canonical_comment_id: null,
      status: '',
      reply_text: null,
      style_profile: null,
      role_profile: null,
      role_card_key: null,
      force_long: null,
      platform: null,
      route_context: null,
      created_at: null,
      updated_at: null,
      comment_content: null,
    });
    expect(
      __commentJobQueryTesting.normalizeQueryJobRecord(
        { comment_content: 'legacy content' },
        normalizeNullableIsoTimestamp,
        { commentContent: 'explicit content' },
      ).comment_content,
    ).toBe('explicit content');
    expect(
      __commentJobQueryTesting.normalizeQueryJobRecord(
        { comment_content: 'legacy content' },
        normalizeNullableIsoTimestamp,
      ).comment_content,
    ).toBe('legacy content');
  });

  it('builds route contexts for empty, QQ group, QQ private, and non-QQ comments', () => {
    expect(buildCommentRouteContext({})).toBeNull();
    expect(buildCommentRouteContext({ userId: ' user-only ' })).toEqual({ user_id: 'user-only' });
    expect(buildCommentRouteContext({ platform: ' QQ ', videoId: ' group-1 ', userId: 'user-1' })).toEqual({
      platform: 'qq',
      container_id: 'group-1',
      user_id: 'user-1',
      chat_type: 'group',
    });
    expect(buildCommentRouteContext({ platform: 'qq', userId: 'user-1' })).toEqual({
      platform: 'qq',
      user_id: 'user-1',
      chat_type: 'private',
    });
    expect(buildCommentRouteContext({ platform: 'qq' })).toEqual({ platform: 'qq' });
    expect(buildCommentRouteContext({ platform: 'douyin', parentId: ' parent-1 ' })).toEqual({
      platform: 'douyin',
      parent_external_id: 'parent-1',
    });
  });

  it('returns comment details with normalized jobs and route context', async () => {
    const { helpers, prisma } = buildHelpers();
    prisma.comment.findFirst.mockResolvedValue(buildComment());
    prisma.replyJob.findMany.mockResolvedValue([buildJob()]);

    const result = await helpers.getComment({ commentId: ' comment-1 ' });

    expect(result).toMatchObject({
      ok: true,
      comment: {
        platform: 'qq',
        route_context: {
          platform: 'qq',
          container_id: 'group-1',
          user_id: 'user-1',
          parent_external_id: 'message-0',
          chat_type: 'group',
        },
      },
      jobs: [
        {
          id: 101,
          platform: 'qq',
          comment_content: 'comment text',
          route_context: expect.objectContaining({ chat_type: 'group' }),
        },
      ],
    });
    expect(prisma.comment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ comment_id: 'comment-1' }, { canonical_comment_id: 'comment-1' }],
        },
      }),
    );
  });

  it('serializes nullable comment creation dates in comment detail responses', async () => {
    const { helpers, prisma } = buildHelpers();
    prisma.comment.findFirst.mockResolvedValue(buildComment({ created_at: null }));
    prisma.replyJob.findMany.mockResolvedValue([]);

    const result = await helpers.getComment({ commentId: 'comment-1' });

    expect(result.comment.created_at).toBeNull();
  });

  it('throws not found errors for missing comments and jobs', async () => {
    const { helpers, prisma } = buildHelpers();
    prisma.comment.findFirst.mockResolvedValue(null);
    prisma.replyJob.findUnique.mockResolvedValue(null);

    await expect(helpers.getComment({ commentId: 'missing' })).rejects.toMatchObject({
      statusCode: 404,
      detail: 'comment_not_found',
    });
    await expect(helpers.getJob({ jobId: 404 })).rejects.toMatchObject({
      statusCode: 404,
      detail: 'job_not_found',
    });

    await expect(helpers.getComment({ commentId: undefined as never })).rejects.toMatchObject({
      statusCode: 404,
      detail: 'comment_not_found',
    });
    expect(prisma.comment.findFirst).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ comment_id: '' }, { canonical_comment_id: '' }],
        },
      }),
    );
  });

  it('normalizes single jobs with inferred platform when the comment lookup misses', async () => {
    const { helpers, prisma } = buildHelpers();
    prisma.replyJob.findUnique.mockResolvedValue(
      buildJob({
        canonical_comment_id: 'douyin:comment-99',
        reply_text: null,
        style_profile: null,
        role_profile: null,
        role_card_key: null,
        force_long: null,
      }),
    );
    prisma.comment.findFirst.mockResolvedValue(null);

    const result = await helpers.getJob({ jobId: 101 });

    expect(result).toMatchObject({
      ok: true,
      item: {
        platform: 'douyin',
        route_context: null,
        comment_content: null,
        reply_text: null,
        force_long: null,
      },
    });
  });

  it('normalizes single jobs without canonical ids and uses comment fallbacks', async () => {
    const { helpers, prisma } = buildHelpers();
    prisma.replyJob.findUnique.mockResolvedValue(buildJob({ canonical_comment_id: null }));
    prisma.comment.findFirst.mockResolvedValue(
      buildComment({
        platform: null,
        video_id: null,
        user_id: null,
        parent_id: null,
        created_at: null,
      }),
    );

    const result = await helpers.getJob({ jobId: 101 });

    expect(prisma.comment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ comment_id: 'comment-1' }],
        },
      }),
    );
    expect(result.item).toMatchObject({
      platform: null,
      route_context: null,
      comment_content: 'comment text',
    });
  });

  it('lists jobs without querying comments when no identifiers are present', async () => {
    const { helpers, prisma } = buildHelpers();
    prisma.replyJob.findMany.mockResolvedValue([buildJob({ comment_id: '', canonical_comment_id: null })]);

    const result = await helpers.listJobs({ status: 'pending_review', limit: 10, offset: 5 });

    expect(result.items[0]).toMatchObject({
      id: 101,
      platform: null,
      route_context: null,
    });
    expect(prisma.replyJob.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: { in: ['manual_queue', 'blocked', 'dedupe_skipped'] } },
        skip: 5,
        take: 10,
      }),
    );
    expect(prisma.comment.findMany).not.toHaveBeenCalled();
  });

  it('joins listed jobs to comments by canonical or plain comment id', async () => {
    const { helpers, prisma } = buildHelpers();
    prisma.replyJob.findMany.mockResolvedValue([
      buildJob({ id: 1, comment_id: 'comment-1', canonical_comment_id: 'qq:comment-1' }),
      buildJob({ id: 2, comment_id: 'comment-2', canonical_comment_id: null }),
    ]);
    prisma.comment.findMany.mockResolvedValue([
      buildComment({ comment_id: 'comment-1', canonical_comment_id: 'qq:comment-1', content: 'canonical hit' }),
      buildComment({
        platform: 'bilibili',
        comment_id: 'comment-2',
        canonical_comment_id: 'bilibili:comment-2',
        video_id: 'BV123',
        parent_id: null,
        content: 'plain hit',
      }),
    ]);

    const result = await helpers.listJobs({ status: 'published', limit: 20, offset: 0 });

    expect(result.items).toEqual([
      expect.objectContaining({
        id: 1,
        platform: 'qq',
        comment_content: 'canonical hit',
      }),
      expect.objectContaining({
        id: 2,
        platform: 'bilibili',
        comment_content: 'plain hit',
        route_context: expect.objectContaining({ container_id: 'BV123' }),
      }),
    ]);
    expect(prisma.replyJob.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'published' },
      }),
    );
  });

  it('queries listed job comments when only one identifier family is present', async () => {
    const { helpers, prisma } = buildHelpers();
    prisma.replyJob.findMany.mockResolvedValueOnce([buildJob({ comment_id: 'plain-only', canonical_comment_id: null })]);
    prisma.comment.findMany.mockResolvedValueOnce([
      buildComment({ comment_id: 'plain-only', canonical_comment_id: 'qq:plain-only' }),
    ]);

    await helpers.listJobs({ status: undefined, limit: 5, offset: 0 });
    expect(prisma.comment.findMany).toHaveBeenNthCalledWith(1, {
      where: {
        OR: [{ comment_id: { in: ['plain-only'] } }],
      },
    });

    prisma.replyJob.findMany.mockResolvedValueOnce([buildJob({ comment_id: '', canonical_comment_id: 'qq:canon-only' })]);
    prisma.comment.findMany.mockResolvedValueOnce([
      buildComment({ comment_id: 'canon-only', canonical_comment_id: 'qq:canon-only' }),
    ]);

    await helpers.listJobs({ status: undefined, limit: 5, offset: 0 });
    expect(prisma.comment.findMany).toHaveBeenNthCalledWith(2, {
      where: {
        OR: [{ canonical_comment_id: { in: ['qq:canon-only'] } }],
      },
    });
  });

  it('exports empty created_at CSV fields for nullable records', async () => {
    const { helpers, prisma } = buildHelpers();
    prisma.replyJob.findMany.mockResolvedValue([
      buildJob({
        id: 8,
        comment_id: 'comment-8',
        status: 'blocked',
        created_at: null,
      }),
    ]);

    await expect(helpers.exportJobsCsv({ status: undefined, limit: 1 })).resolves.toBe(
      'job_id,comment_id,status,created_at\n8,"comment-8","blocked",""\n',
    );
  });

  it('exports jobs as CSV with escaped values and empty status filters', async () => {
    const { helpers, prisma } = buildHelpers();
    prisma.replyJob.findMany.mockResolvedValue([
      buildJob({
        id: 7,
        comment_id: 'comment,"quoted"',
        status: 'manual_queue',
      }),
    ]);

    const csv = await helpers.exportJobsCsv({ status: ' ', limit: 1 });

    expect(csv).toBe(
      'job_id,comment_id,status,created_at\n7,"comment,""quoted""","manual_queue","2026-06-09T02:00:00.000Z"\n',
    );
    expect(prisma.replyJob.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        take: 1,
      }),
    );
  });
});
