import { beforeEach, describe, expect, it, vi } from 'vitest';

const { companionFeedMock, dbPrismaMock, publishIntentWithResultMock } = vi.hoisted(() => ({
  companionFeedMock: vi.fn(),
  dbPrismaMock: {
    userState: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
  publishIntentWithResultMock: vi.fn(),
}));

vi.mock('../src/app/memory/companion-feed.js', () => ({
  upsertCompanionFeedItem: companionFeedMock,
}));

vi.mock('../src/services/db-queries.js', () => ({
  prisma: () => dbPrismaMock,
}));

vi.mock('../src/services/publisher.js', () => ({
  publishIntentWithResult: publishIntentWithResultMock,
}));

import { createCommentJobActionHelpers } from '../src/server/comment-job-actions.js';

type CommentJobActionDeps = Parameters<typeof createCommentJobActionHelpers>[0];

function buildReplyJob(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    comment_id: 'comment-1',
    canonical_comment_id: 'bilibili:comment-1',
    status: 'manual_queue',
    length_mode: 'short',
    style_mode: 'normal',
    reply_text: 'queued reply',
    risk_flags: { existing: true },
    attempts: 1,
    published_at: null,
    created_at: new Date('2026-03-07T00:00:00.000Z'),
    ...overrides,
  };
}

function buildComment(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    platform: 'bilibili',
    canonical_comment_id: 'bilibili:comment-1',
    comment_id: 'comment-1',
    video_id: 'video-1',
    user_id: 'user-1',
    content: 'comment text',
    parent_id: null,
    created_at: new Date('2026-03-07T00:00:00.000Z'),
    ...overrides,
  };
}

function buildPrisma() {
  return {
    replyJob: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    comment: {
      findUnique: vi.fn(),
    },
  };
}

function buildDeps(
  prisma = buildPrisma(),
  overrides: Partial<CommentJobActionDeps> = {},
): { deps: CommentJobActionDeps; prisma: ReturnType<typeof buildPrisma> } {
  const deps = {
    getPrisma: () => prisma,
    createTraceId: vi.fn(() => 'trace-action-1'),
    writeAuditLog: vi.fn(async () => undefined),
    enqueueCommentEventJob: vi.fn(async () => ({ queued: true })),
    ...overrides,
  } as unknown as CommentJobActionDeps;

  return { deps, prisma };
}

describe('comment job action helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    companionFeedMock.mockResolvedValue(undefined);
    dbPrismaMock.userState.findUnique.mockResolvedValue({
      user_id: 'user-1',
      recent_phrases: JSON.stringify({
        phrases: Array.from({ length: 20 }, (_, index) => `old-${index}`),
      }),
    });
    dbPrismaMock.userState.upsert.mockResolvedValue({});
    publishIntentWithResultMock.mockResolvedValue([
      true,
      'webhook_published',
      new Date('2026-03-07T01:00:00.000Z'),
      { new_rpid: 'remote-1' },
    ]);
  });

  it('requeues a reply job with platform and profile overrides', async () => {
    const { deps, prisma } = buildDeps();
    prisma.replyJob.findUnique.mockResolvedValue(
      buildReplyJob({ canonical_comment_id: 'douyin:comment-1' }),
    );
    const helpers = createCommentJobActionHelpers(deps);

    const result = await helpers.retryJob({
      jobId: 1,
      forceLong: true,
      styleProfile: 'gentle',
      roleProfile: 'doro',
      roleCardKey: 'card-1',
    });

    expect(result).toEqual({
      ok: true,
      requeued: true,
      job_id: 1,
      trace_id: 'trace-action-1',
      error: undefined,
    });
    expect(deps.enqueueCommentEventJob).toHaveBeenCalledWith({
      comment_id: 'comment-1',
      platform: 'douyin',
      force_long: true,
      style_profile: 'gentle',
      role_profile: 'doro',
      role_card_key: 'card-1',
      trace_id: 'trace-action-1',
      source: 'retry',
    });
    expect(deps.writeAuditLog).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        action: 'retry_single',
        ok: true,
        status: 'queued',
      }),
    );
  });

  it('reports queue_unavailable when retry enqueue fails', async () => {
    const { deps, prisma } = buildDeps(undefined, {
      enqueueCommentEventJob: vi.fn(async () => ({ queued: false, error: 'redis offline' })),
    });
    prisma.replyJob.findUnique.mockResolvedValue(buildReplyJob({ canonical_comment_id: null }));
    const helpers = createCommentJobActionHelpers(deps);

    const result = await helpers.retryJob({ jobId: 1, forceLong: false });

    expect(result).toEqual({
      ok: false,
      requeued: false,
      job_id: 1,
      trace_id: 'trace-action-1',
      error: 'queue_unavailable',
    });
    expect(deps.enqueueCommentEventJob).toHaveBeenCalledWith(
      expect.objectContaining({
        platform: 'bilibili',
        trace_id: 'trace-action-1',
      }),
    );
    expect(deps.writeAuditLog).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        ok: false,
        status: 'queue_unavailable',
        payload: expect.objectContaining({ queue_error: 'redis offline' }),
      }),
    );
  });

  it('requeues with platform and audit fallbacks when optional retry fields are omitted', async () => {
    const { deps, prisma } = buildDeps();
    prisma.replyJob.findUnique.mockResolvedValue(
      buildReplyJob({ canonical_comment_id: ':comment-1' }),
    );
    const helpers = createCommentJobActionHelpers(deps);

    const result = await helpers.retryJob({ jobId: 1 });

    expect(result).toEqual({
      ok: true,
      requeued: true,
      job_id: 1,
      trace_id: 'trace-action-1',
      error: undefined,
    });
    expect(deps.enqueueCommentEventJob).toHaveBeenCalledWith({
      comment_id: 'comment-1',
      platform: 'bilibili',
      force_long: undefined,
      style_profile: undefined,
      role_profile: undefined,
      role_card_key: undefined,
      trace_id: 'trace-action-1',
      source: 'retry',
    });
    expect(deps.writeAuditLog).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        payload: {
          comment_id: 'comment-1',
          force_long: undefined,
          queue_error: null,
        },
      }),
    );
  });

  it('audits retry attempts for missing jobs', async () => {
    const { deps, prisma } = buildDeps();
    prisma.replyJob.findUnique.mockResolvedValue(null);
    const helpers = createCommentJobActionHelpers(deps);

    await expect(helpers.retryJob({ jobId: 404 })).rejects.toMatchObject({
      statusCode: 404,
      detail: 'job_not_found',
    });
    expect(deps.enqueueCommentEventJob).not.toHaveBeenCalled();
    expect(deps.writeAuditLog).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        action: 'retry_single',
        targetId: 404,
        ok: false,
        status: 'job_not_found',
      }),
    );
  });

  it('publishes an approved queued job and records state side effects', async () => {
    const { deps, prisma } = buildDeps();
    const publishedAt = new Date('2026-03-07T01:00:00.000Z');
    prisma.replyJob.findUnique.mockResolvedValue(
      buildReplyJob({
        risk_flags: JSON.stringify({ existing: true }),
        reply_text: ' original reply ',
      }),
    );
    prisma.comment.findUnique.mockResolvedValue(
      buildComment({
        platform: 'qq',
        canonical_comment_id: 'qq:comment-1',
        video_id: 'group-42',
        parent_id: 'message-0',
      }),
    );
    prisma.replyJob.update.mockImplementation(async (input: { data: { published_at: Date } }) => ({
      id: 1,
      published_at: input.data.published_at,
    }));
    publishIntentWithResultMock.mockResolvedValue([
      true,
      'webhook_published',
      publishedAt,
      { new_rpid: 'remote-1' },
    ]);
    const helpers = createCommentJobActionHelpers(deps);

    const result = await helpers.approveJob({
      jobId: 1,
      overrideReplyText: ' approved reply ',
    });

    expect(result).toEqual({
      ok: true,
      job_id: 1,
      status: 'published',
      published_at: '2026-03-07T01:00:00.000Z',
      trace_id: 'trace-action-1',
    });
    expect(publishIntentWithResultMock).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: 'trace-action-1',
        source: 'approve-job',
        target: expect.objectContaining({
          platform: 'qq',
          route: expect.objectContaining({
            containerId: 'group-42',
            parentExternalId: 'message-0',
            metadata: {
              chat_type: 'group',
              user_id: 'user-1',
            },
          }),
        }),
        payload: { text: 'approved reply' },
      }),
    );
    expect(prisma.replyJob.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        status: 'published',
        reply_text: 'approved reply',
        attempts: 2,
        published_at: publishedAt,
      }),
    });
    const updateInput = prisma.replyJob.update.mock.calls[0]?.[0] as { data: { risk_flags: string } };
    expect(JSON.parse(updateInput.data.risk_flags)).toEqual({
      existing: true,
      approved: true,
      publish_reason: 'webhook_published',
      new_rpid: 'remote-1',
    });
    expect(dbPrismaMock.userState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user_id: 'user-1' },
        update: expect.objectContaining({
          recent_phrases: expect.stringContaining('approved reply'),
        }),
      }),
    );
    expect(companionFeedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        itemKey: 'signal:approval-latest',
        source: 'admin_approval',
      }),
    );
    expect(deps.writeAuditLog).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        action: 'approve_single',
        ok: true,
        status: 'published',
      }),
    );
  });

  it('publishes using bilibili fallbacks when optional publish fields are absent', async () => {
    const { deps, prisma } = buildDeps();
    prisma.replyJob.findUnique.mockResolvedValue(
      buildReplyJob({
        canonical_comment_id: null,
        reply_text: ' job reply ',
        risk_flags: null,
        attempts: 0,
      }),
    );
    prisma.comment.findUnique.mockResolvedValue(
      buildComment({
        platform: null,
        video_id: null,
        parent_id: null,
      }),
    );
    prisma.replyJob.update.mockImplementation(async (input: { data: { published_at: Date } }) => ({
      id: 1,
      published_at: null,
      requestedPublishedAt: input.data.published_at,
    }));
    publishIntentWithResultMock.mockResolvedValue([true, 'local_only', null, {}]);
    dbPrismaMock.userState.findUnique.mockResolvedValueOnce(null);
    const helpers = createCommentJobActionHelpers(deps);

    const result = await helpers.approveJob({ jobId: 1 });

    expect(result).toEqual({
      ok: true,
      job_id: 1,
      status: 'published',
      published_at: null,
      trace_id: 'trace-action-1',
    });
    expect(prisma.comment.findUnique).toHaveBeenCalledWith({
      where: { canonical_comment_id: 'bilibili:comment-1' },
    });
    expect(publishIntentWithResultMock).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          platform: 'bilibili',
          route: {
            containerId: undefined,
            parentExternalId: undefined,
            metadata: undefined,
          },
        }),
        payload: { text: 'job reply' },
      }),
    );
    expect(prisma.replyJob.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        attempts: 1,
        published_at: expect.any(Date),
      }),
    });
    const updateInput = prisma.replyJob.update.mock.calls[0]?.[0] as { data: { risk_flags: string } };
    expect(JSON.parse(updateInput.data.risk_flags)).toEqual({
      approved: true,
      publish_reason: 'local_only',
    });
    expect(dbPrismaMock.userState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: {
          user_id: 'user-1',
          recent_phrases: JSON.stringify({ phrases: ['job reply'] }),
        },
      }),
    );
  });

  it('publishes qq private approvals without user metadata and ignores feed failures', async () => {
    const { deps, prisma } = buildDeps();
    prisma.replyJob.findUnique.mockResolvedValue(buildReplyJob());
    prisma.comment.findUnique.mockResolvedValue(
      buildComment({
        platform: 'qq',
        video_id: null,
        parent_id: null,
        user_id: null,
      }),
    );
    prisma.replyJob.update.mockResolvedValue({
      id: 1,
      published_at: new Date('2026-03-07T01:00:00.000Z'),
    });
    companionFeedMock.mockRejectedValueOnce(new Error('feed offline'));
    const helpers = createCommentJobActionHelpers(deps);

    await expect(helpers.approveJob({ jobId: 1 })).resolves.toMatchObject({
      ok: true,
      status: 'published',
    });

    expect(publishIntentWithResultMock).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          platform: 'qq',
          route: {
            containerId: undefined,
            parentExternalId: undefined,
            metadata: { chat_type: 'private' },
          },
        }),
      }),
    );
    expect(dbPrismaMock.userState.findUnique).not.toHaveBeenCalled();
    expect(companionFeedMock).toHaveBeenCalledTimes(1);
  });

  it('normalizes non-array user phrases and ignores user state failures', async () => {
    const { deps, prisma } = buildDeps();
    prisma.replyJob.findUnique
      .mockResolvedValueOnce(buildReplyJob({ reply_text: 'first reply' }))
      .mockResolvedValueOnce(buildReplyJob({ reply_text: 'second reply' }));
    prisma.comment.findUnique.mockResolvedValue(buildComment());
    prisma.replyJob.update.mockResolvedValue({
      id: 1,
      published_at: new Date('2026-03-07T01:00:00.000Z'),
    });
    dbPrismaMock.userState.findUnique
      .mockResolvedValueOnce({
        user_id: 'user-1',
        recent_phrases: { phrases: 'not-an-array' },
      })
      .mockRejectedValueOnce(new Error('state offline'));
    const helpers = createCommentJobActionHelpers(deps);

    await expect(helpers.approveJob({ jobId: 1 })).resolves.toMatchObject({
      ok: true,
      status: 'published',
    });
    expect(dbPrismaMock.userState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { recent_phrases: JSON.stringify({ phrases: ['first reply'] }) },
      }),
    );

    await expect(helpers.approveJob({ jobId: 1 })).resolves.toMatchObject({
      ok: true,
      status: 'published',
    });
    expect(dbPrismaMock.userState.upsert).toHaveBeenCalledTimes(1);
    expect(deps.writeAuditLog).toHaveBeenLastCalledWith(
      prisma,
      expect.objectContaining({
        action: 'approve_single',
        ok: true,
        status: 'published',
      }),
    );
  });

  it('rejects approve when the job cannot be approved', async () => {
    const { deps, prisma } = buildDeps();
    prisma.replyJob.findUnique.mockResolvedValue(buildReplyJob({ status: 'published' }));
    const helpers = createCommentJobActionHelpers(deps);

    await expect(helpers.approveJob({ jobId: 1 })).rejects.toMatchObject({
      statusCode: 400,
      detail: 'job_status_not_approvable',
    });
    expect(deps.writeAuditLog).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        action: 'approve_single',
        ok: false,
        status: 'not_approvable',
      }),
    );
  });

  it('audits approve attempts for missing jobs', async () => {
    const { deps, prisma } = buildDeps();
    prisma.replyJob.findUnique.mockResolvedValue(null);
    const helpers = createCommentJobActionHelpers(deps);

    await expect(helpers.approveJob({ jobId: 404 })).rejects.toMatchObject({
      statusCode: 404,
      detail: 'job_not_found',
    });
    expect(publishIntentWithResultMock).not.toHaveBeenCalled();
    expect(deps.writeAuditLog).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        action: 'approve_single',
        targetId: 404,
        ok: false,
        status: 'job_not_found',
      }),
    );
  });

  it('rejects approve when comment or reply text is missing', async () => {
    const { deps, prisma } = buildDeps();
    const helpers = createCommentJobActionHelpers(deps);

    prisma.replyJob.findUnique.mockResolvedValueOnce(buildReplyJob());
    prisma.comment.findUnique.mockResolvedValueOnce(null);
    await expect(helpers.approveJob({ jobId: 1 })).rejects.toMatchObject({
      statusCode: 404,
      detail: 'comment_not_found',
    });

    prisma.replyJob.findUnique.mockResolvedValueOnce(buildReplyJob({ reply_text: null }));
    prisma.comment.findUnique.mockResolvedValueOnce(buildComment());
    await expect(helpers.approveJob({ jobId: 1 })).rejects.toMatchObject({
      statusCode: 400,
      detail: 'empty_reply_text',
    });
  });

  it('audits approve publish failures', async () => {
    const { deps, prisma } = buildDeps();
    prisma.replyJob.findUnique.mockResolvedValue(buildReplyJob());
    prisma.comment.findUnique.mockResolvedValue(buildComment());
    publishIntentWithResultMock.mockResolvedValue([false, 'webhook_failed', null, null]);
    const helpers = createCommentJobActionHelpers(deps);

    await expect(helpers.approveJob({ jobId: 1 })).rejects.toMatchObject({
      statusCode: 500,
      detail: 'approve_publish_failed',
    });
    expect(deps.writeAuditLog).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        action: 'approve_single',
        ok: false,
        status: 'publish_failed',
        payload: expect.objectContaining({ publish_reason: 'webhook_failed' }),
      }),
    );
  });

  it('summarizes mixed approve batch results', async () => {
    const { deps, prisma } = buildDeps();
    prisma.replyJob.findUnique
      .mockResolvedValueOnce(buildReplyJob({ id: 1 }))
      .mockResolvedValueOnce(buildReplyJob({ id: 2, status: 'published' }));
    prisma.comment.findUnique.mockResolvedValue(buildComment());
    prisma.replyJob.update.mockResolvedValue({
      id: 1,
      published_at: new Date('2026-03-07T01:00:00.000Z'),
    });
    const helpers = createCommentJobActionHelpers(deps);

    const result = await helpers.approveJobsBatch({ jobIds: [1, 2] });

    expect(result).toEqual({
      ok: true,
      summary: { total: 2, success: 1, failed: 1 },
      results: [
        { job_id: 1, ok: true, status: 'published' },
        { job_id: 2, ok: false, error: 'job_status_not_approvable' },
      ],
      trace_id: 'trace-action-1',
    });
    expect(deps.writeAuditLog).toHaveBeenLastCalledWith(
      prisma,
      expect.objectContaining({
        action: 'approve_batch',
        ok: false,
        status: 'partial_failure',
      }),
    );
  });

  it('reports default approve batch errors and all-success status', async () => {
    const { deps, prisma } = buildDeps();
    const helpers = createCommentJobActionHelpers(deps);

    prisma.replyJob.findUnique.mockImplementation(async ({ where }: { where: { id: number } }) => {
      if (where.id === 1) {
        return buildReplyJob({ id: 1 });
      }
      throw new Error('database unavailable');
    });
    prisma.comment.findUnique.mockResolvedValue(buildComment());
    prisma.replyJob.update.mockResolvedValue({
      id: 1,
      published_at: new Date('2026-03-07T01:00:00.000Z'),
    });

    const mixedResult = await helpers.approveJobsBatch({ jobIds: [1, 2] });

    expect(mixedResult.results).toEqual([
      { job_id: 1, ok: true, status: 'published' },
      { job_id: 2, ok: false, error: 'database unavailable' },
    ]);

    prisma.replyJob.findUnique.mockRejectedValueOnce({});
    await expect(helpers.approveJobsBatch({ jobIds: [4] })).resolves.toMatchObject({
      results: [{ job_id: 4, ok: false, error: 'approve_failed' }],
    });

    prisma.replyJob.findUnique.mockResolvedValue(buildReplyJob({ id: 3 }));
    const successResult = await helpers.approveJobsBatch({ jobIds: [3] });

    expect(successResult).toEqual({
      ok: true,
      summary: { total: 1, success: 1, failed: 0 },
      results: [{ job_id: 3, ok: true, status: 'published' }],
      trace_id: 'trace-action-1',
    });
    expect(deps.writeAuditLog).toHaveBeenLastCalledWith(
      prisma,
      expect.objectContaining({
        action: 'approve_batch',
        ok: true,
        status: 'published',
      }),
    );
  });

  it('summarizes mixed retry batch results', async () => {
    const { deps, prisma } = buildDeps(undefined, {
      enqueueCommentEventJob: vi
        .fn()
        .mockResolvedValueOnce({ queued: true })
        .mockResolvedValueOnce({ queued: false, error: 'redis offline' }),
    });
    prisma.replyJob.findUnique
      .mockResolvedValueOnce(buildReplyJob({ id: 1 }))
      .mockResolvedValueOnce(buildReplyJob({ id: 2 }))
      .mockResolvedValueOnce(null);
    const helpers = createCommentJobActionHelpers(deps);

    const result = await helpers.retryJobsBatch({ jobIds: [1, 2, 3], forceLong: true });

    expect(result).toEqual({
      ok: false,
      summary: { total: 3, success: 1, failed: 2 },
      results: [
        { job_id: 1, ok: true, requeued: true },
        { job_id: 2, ok: false, requeued: false, error: 'queue_unavailable' },
        { job_id: 3, ok: false, error: 'job_not_found' },
      ],
      trace_id: 'trace-action-1',
    });
    expect(deps.writeAuditLog).toHaveBeenLastCalledWith(
      prisma,
      expect.objectContaining({
        action: 'retry_batch',
        ok: false,
        status: 'partial_failure',
      }),
    );
  });

  it('reports default retry batch errors for non-detail failures', async () => {
    const { deps, prisma } = buildDeps();
    prisma.replyJob.findUnique.mockRejectedValueOnce('database offline');
    const helpers = createCommentJobActionHelpers(deps);

    const result = await helpers.retryJobsBatch({ jobIds: [1] });

    expect(result).toEqual({
      ok: false,
      summary: { total: 1, success: 0, failed: 1 },
      results: [{ job_id: 1, ok: false, error: 'retry_failed' }],
      trace_id: 'trace-action-1',
    });
    expect(deps.writeAuditLog).toHaveBeenLastCalledWith(
      prisma,
      expect.objectContaining({
        action: 'retry_batch',
        ok: false,
        status: 'partial_failure',
      }),
    );
  });

  it('summarizes all-success retry batch results', async () => {
    const { deps, prisma } = buildDeps();
    prisma.replyJob.findUnique
      .mockResolvedValueOnce(buildReplyJob({ id: 1 }))
      .mockResolvedValueOnce(buildReplyJob({ id: 2 }));
    const helpers = createCommentJobActionHelpers(deps);

    const result = await helpers.retryJobsBatch({ jobIds: [1, 2] });

    expect(result).toEqual({
      ok: true,
      summary: { total: 2, success: 2, failed: 0 },
      results: [
        { job_id: 1, ok: true, requeued: true },
        { job_id: 2, ok: true, requeued: true },
      ],
      trace_id: 'trace-action-1',
    });
    expect(deps.writeAuditLog).toHaveBeenLastCalledWith(
      prisma,
      expect.objectContaining({
        action: 'retry_batch',
        ok: true,
        status: 'queued',
      }),
    );
  });
});
