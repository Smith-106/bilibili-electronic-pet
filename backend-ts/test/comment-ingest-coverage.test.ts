import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createCommentEventQueueMock, tryEnqueueTaskMock, getActivePersonaNameMock } = vi.hoisted(() => ({
  createCommentEventQueueMock: vi.fn(),
  tryEnqueueTaskMock: vi.fn(),
  getActivePersonaNameMock: vi.fn(),
}));

vi.mock('../src/workers/tasks/comment-event.task.js', () => ({
  createCommentEventQueue: createCommentEventQueueMock,
}));

vi.mock('../src/workers/task-queue.js', () => ({
  tryEnqueueTask: tryEnqueueTaskMock,
}));

vi.mock('../src/services/bilibili-runtime-config.js', () => ({
  getActivePersonaName: getActivePersonaNameMock,
}));

import { createCommentIngestHelpers } from '../src/server/comment-ingest.js';
import type { InteractionEvent } from '../src/server/contracts.js';

type FakePrisma = ReturnType<typeof buildPrisma>;

function buildPrisma() {
  return {
    comment: {
      create: vi.fn(),
    },
    commentQueueBacklog: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
  };
}

function buildInteractionEvent(overrides: Partial<InteractionEvent> = {}): InteractionEvent {
  return {
    platform: 'qq',
    ingressSource: 'qq-sidecar',
    traceId: 'trace-input',
    actor: { platformUserId: 'user-1' },
    reference: {
      subjectKind: 'comment',
      externalId: 'comment-1',
      canonicalId: 'qq:comment-1',
      containerId: 'group-1',
      parentExternalId: 'message-0',
    },
    content: {
      text: 'hello',
    },
    legacyComment: {
      commentId: 'comment-1',
      videoId: 'group-1',
      parentId: 'message-0',
    },
    ...overrides,
  };
}

function buildDeps(prisma: FakePrisma, overrides: Record<string, unknown> = {}) {
  return {
    getPrisma: () => prisma as never,
    createTraceId: vi.fn((preferred?: string) => preferred ?? 'trace-generated'),
    parseJsonRecord: vi.fn((value: unknown) =>
      typeof value === 'string' ? (JSON.parse(value) as Record<string, unknown>) : {},
    ),
    writeAuditLog: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('comment ingest helper coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createCommentEventQueueMock.mockReturnValue({
      name: 'comment-event',
      close: vi.fn(async () => undefined),
    });
    tryEnqueueTaskMock.mockResolvedValue({ queued: true });
    getActivePersonaNameMock.mockResolvedValue(null);
  });

  it('returns duplicate_ignored when duplicate insert has no pending backlog', async () => {
    const prisma = buildPrisma();
    prisma.comment.create.mockRejectedValue(new Error('UNIQUE constraint failed'));
    prisma.commentQueueBacklog.findUnique.mockResolvedValue(null);
    const deps = buildDeps(prisma);
    const helpers = createCommentIngestHelpers(deps);

    const result = await helpers.ingestInteractionEvent({
      event: buildInteractionEvent(),
      source: 'qq-sidecar',
    });

    expect(result).toEqual({
      ok: true,
      message: 'duplicate_ignored',
      comment_id: 'comment-1',
      trace_id: 'trace-input',
    });
    expect(tryEnqueueTaskMock).not.toHaveBeenCalled();
    expect(deps.writeAuditLog).not.toHaveBeenCalled();
  });

  it('persists recovery backlog when duplicate recovery cannot be requeued', async () => {
    const prisma = buildPrisma();
    prisma.comment.create.mockRejectedValue(new Error('duplicate key'));
    prisma.commentQueueBacklog.findUnique.mockResolvedValue({
      id: 9,
      status: 'pending_requeue',
      payload_json: JSON.stringify({ old: true, trace_id: 'old-trace' }),
    });
    prisma.commentQueueBacklog.upsert.mockResolvedValue({ id: 10 });
    tryEnqueueTaskMock.mockResolvedValue({ queued: false, error: 'redis offline' });
    const deps = buildDeps(prisma);
    const helpers = createCommentIngestHelpers(deps);

    const result = await helpers.ingestInteractionEvent({
      event: buildInteractionEvent(),
      source: 'qq-sidecar',
    });

    expect(result).toEqual({
      ok: false,
      queued: false,
      message: 'queue_unavailable',
      comment_id: 'comment-1',
      trace_id: 'trace-input',
      recovery: {
        backlog_id: 10,
        status: 'pending_requeue',
        recoverable: true,
      },
    });
    expect(prisma.commentQueueBacklog.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { canonical_comment_id: 'qq:comment-1' },
        update: expect.objectContaining({
          platform: 'qq',
          comment_id: 'comment-1',
          source: 'qq-sidecar',
          status: 'pending_requeue',
          last_error: 'redis offline',
        }),
      }),
    );
    expect(deps.writeAuditLog).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        action: 'comment_ingest_recovery',
        ok: false,
        status: 'pending_requeue',
        payload: expect.objectContaining({
          backlog_id: 10,
          queue_error: 'redis offline',
          platform: 'qq',
        }),
      }),
    );
  });

  it('uses fallback queue error text when duplicate recovery enqueue returns no error', async () => {
    const prisma = buildPrisma();
    prisma.comment.create.mockRejectedValue(new Error('duplicate key'));
    prisma.commentQueueBacklog.findUnique.mockResolvedValue({
      id: 9,
      status: 'pending_requeue',
      payload_json: JSON.stringify({ old: true }),
    });
    prisma.commentQueueBacklog.upsert.mockResolvedValue({ id: 10 });
    tryEnqueueTaskMock.mockResolvedValue({ queued: false });
    const deps = buildDeps(prisma);
    const helpers = createCommentIngestHelpers(deps);

    const result = await helpers.ingestInteractionEvent({
      event: buildInteractionEvent(),
      source: 'qq-sidecar',
    });

    expect(result).toMatchObject({
      ok: false,
      queued: false,
      recovery: {
        backlog_id: 10,
        status: 'pending_requeue',
      },
    });
    expect(deps.writeAuditLog).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        payload: expect.objectContaining({
          queue_error: 'queue_unavailable',
        }),
      }),
    );
  });

  it('omits recovery details when duplicate recovery resolves without an updated row', async () => {
    const prisma = buildPrisma();
    prisma.comment.create.mockRejectedValue(new Error('duplicate key'));
    prisma.commentQueueBacklog.findUnique
      .mockResolvedValueOnce({
        id: 9,
        status: 'pending_requeue',
        payload_json: JSON.stringify({ old: true }),
      })
      .mockResolvedValueOnce(null);
    const deps = buildDeps(prisma);
    const helpers = createCommentIngestHelpers(deps);

    const result = await helpers.ingestInteractionEvent({
      event: buildInteractionEvent(),
      source: 'qq-sidecar',
    });

    expect(result).toEqual({
      ok: true,
      queued: true,
      message: 'requeued_from_backlog',
      comment_id: 'comment-1',
      trace_id: 'trace-input',
    });
    expect(deps.writeAuditLog).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        payload: expect.objectContaining({
          backlog_id: 9,
        }),
      }),
    );
  });

  it('resolves pending backlog after duplicate recovery is requeued', async () => {
    const prisma = buildPrisma();
    prisma.comment.create.mockRejectedValue('duplicate');
    prisma.commentQueueBacklog.findUnique
      .mockResolvedValueOnce({
        id: 9,
        status: 'pending_requeue',
        payload_json: JSON.stringify({ old: true }),
      })
      .mockResolvedValueOnce({
        id: 9,
        status: 'pending_requeue',
        payload_json: '{}',
      });
    prisma.commentQueueBacklog.update.mockResolvedValue({ id: 9 });
    const deps = buildDeps(prisma);
    const helpers = createCommentIngestHelpers(deps);

    const result = await helpers.ingestInteractionEvent({
      event: buildInteractionEvent({ traceId: undefined }),
      source: 'qq-sidecar',
    });

    expect(result).toEqual({
      ok: true,
      queued: true,
      message: 'requeued_from_backlog',
      comment_id: 'comment-1',
      trace_id: 'trace-generated',
      recovery: {
        backlog_id: 9,
        status: 'requeued',
        recoverable: true,
        recovered: true,
      },
    });
    expect(prisma.commentQueueBacklog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { canonical_comment_id: 'qq:comment-1' },
        data: expect.objectContaining({
          status: 'requeued',
          last_error: null,
        }),
      }),
    );
    expect(deps.writeAuditLog).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        action: 'comment_ingest_recovery',
        ok: true,
        status: 'requeued',
      }),
    );
  });

  it('stores a new backlog and audits when a fresh ingest cannot enqueue', async () => {
    const prisma = buildPrisma();
    prisma.comment.create.mockResolvedValue({ id: 1 });
    prisma.commentQueueBacklog.upsert.mockResolvedValue({ id: 11 });
    tryEnqueueTaskMock.mockResolvedValue({ queued: false });
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const deps = buildDeps(prisma);
    const helpers = createCommentIngestHelpers(deps);

    const result = await helpers.ingestCommentEvent({
      event: {
        comment_id: 'comment-2',
        video_id: 'group-2',
        user_id: 'user-2',
        content: 'fresh comment',
        parent_id: '',
        platform: 'qq',
        source: 'qq-sidecar',
      },
      source: 'qq-sidecar',
    });

    expect(result).toEqual({
      ok: false,
      queued: false,
      message: 'queue_unavailable',
      comment_id: 'comment-2',
      trace_id: 'trace-generated',
      recovery: {
        backlog_id: 11,
        status: 'pending_requeue',
        recoverable: true,
      },
    });
    expect(prisma.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          platform: 'qq',
          canonical_comment_id: 'qq:comment-2',
          comment_id: 'comment-2',
          parent_id: null,
        }),
      }),
    );
    expect(deps.writeAuditLog).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        action: 'comment_ingest',
        ok: false,
        status: 'pending_requeue',
        payload: expect.objectContaining({
          queue_error: 'queue_unavailable',
          platform: 'qq',
        }),
      }),
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('comment_event_queue_unavailable'));
    consoleWarnSpy.mockRestore();
  });

  it('returns queued with resolved backlog after a fresh ingest succeeds', async () => {
    const prisma = buildPrisma();
    prisma.comment.create.mockResolvedValue({ id: 1 });
    prisma.commentQueueBacklog.findUnique.mockResolvedValue({
      id: 12,
      status: 'pending_requeue',
      payload_json: '{}',
    });
    prisma.commentQueueBacklog.update.mockResolvedValue({ id: 12 });
    const deps = buildDeps(prisma);
    const helpers = createCommentIngestHelpers(deps);

    const result = await helpers.ingestInteractionEvent({
      event: buildInteractionEvent({
        platform: '',
        reference: {
          subjectKind: 'comment',
          externalId: 'comment-3',
          canonicalId: 'unknown:comment-3',
        },
        content: {},
        legacyComment: undefined,
      }),
      source: 'webhook',
    });

    expect(result).toEqual({
      ok: true,
      queued: true,
      message: 'queued',
      comment_id: 'comment-3',
      trace_id: 'trace-input',
      recovery: {
        backlog_id: 12,
        status: 'requeued',
        recoverable: true,
        recovered: true,
      },
    });
    expect(prisma.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          platform: 'unknown',
          canonical_comment_id: 'unknown:comment-3',
          video_id: '',
          user_id: 'user-1',
          content: '',
        }),
      }),
    );
  });

  it('returns queued without recovery when there is no pending backlog', async () => {
    const prisma = buildPrisma();
    prisma.comment.create.mockResolvedValue({ id: 1 });
    prisma.commentQueueBacklog.findUnique.mockResolvedValue(null);
    const deps = buildDeps(prisma, {
      createTraceId: vi.fn(() => 'trace-generated'),
    });
    const helpers = createCommentIngestHelpers(deps);

    const result = await helpers.ingestInteractionEvent({
      event: buildInteractionEvent({
        traceId: undefined,
        platform: '',
        actor: undefined,
        reference: {
          subjectKind: 'comment',
          externalId: 'comment-4',
          canonicalId: 'unknown:comment-4',
        },
        content: { text: undefined },
        legacyComment: undefined,
      }),
      source: 'webhook',
    });

    expect(result).toEqual({
      ok: true,
      queued: true,
      message: 'queued',
      comment_id: 'comment-4',
      trace_id: 'trace-generated',
    });
    expect(prisma.commentQueueBacklog.update).not.toHaveBeenCalled();
    expect(prisma.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          platform: 'unknown',
          video_id: '',
          user_id: '',
          content: '',
          parent_id: null,
        }),
      }),
    );
  });

  it('surfaces non-duplicate insert failures', async () => {
    const prisma = buildPrisma();
    prisma.comment.create.mockRejectedValue(new Error('database down'));
    const helpers = createCommentIngestHelpers(buildDeps(prisma));

    await expect(
      helpers.ingestInteractionEvent({
        event: buildInteractionEvent(),
        source: 'qq-sidecar',
      }),
    ).rejects.toThrow('database down');
    expect(tryEnqueueTaskMock).not.toHaveBeenCalled();
  });

  it('enqueues raw payloads with fallback job id fields and ignores queue close failures', async () => {
    const closeMock = vi.fn(async () => {
      throw new Error('close failed');
    });
    createCommentEventQueueMock.mockReturnValueOnce({
      name: 'comment-event',
      close: closeMock,
    });
    tryEnqueueTaskMock.mockResolvedValueOnce({ queued: true });
    const helpers = createCommentIngestHelpers(buildDeps(buildPrisma()));

    const result = await helpers.enqueueCommentEventJob({
      content: 'missing platform and id',
    });

    expect(result).toEqual({ queued: true });
    expect(tryEnqueueTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'comment-event' }),
      { content: 'missing platform and id' },
      'comment-event:bilibili:',
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );
    expect(closeMock).toHaveBeenCalled();
  });

  it('returns queue_unavailable when raw enqueue setup throws a non-error value', async () => {
    createCommentEventQueueMock.mockImplementationOnce(() => {
      throw 'queue setup failed';
    });
    const helpers = createCommentIngestHelpers(buildDeps(buildPrisma()));

    await expect(helpers.enqueueCommentEventJob({ comment_id: 'c-1', platform: 'qq' })).resolves.toEqual({
      queued: false,
      error: 'queue_unavailable',
    });
    expect(tryEnqueueTaskMock).not.toHaveBeenCalled();
  });

  it('returns setup error messages when raw enqueue setup throws Error instances', async () => {
    createCommentEventQueueMock.mockImplementationOnce(() => {
      throw new Error('redis refused connection');
    });
    const helpers = createCommentIngestHelpers(buildDeps(buildPrisma()));

    await expect(helpers.enqueueCommentEventJob({ comment_id: 'c-1', platform: 'qq' })).resolves.toEqual({
      queued: false,
      error: 'redis refused connection',
    });
    expect(tryEnqueueTaskMock).not.toHaveBeenCalled();
  });

  it('attaches the active persona name to the comment-event queue payload for @self detection (TASK-002)', async () => {
    const prisma = buildPrisma();
    prisma.comment.create.mockResolvedValue({ id: 1 });
    prisma.commentQueueBacklog.findUnique.mockResolvedValue(null);
    getActivePersonaNameMock.mockResolvedValueOnce('bili-active-persona');
    const deps = buildDeps(prisma);
    const helpers = createCommentIngestHelpers(deps);

    const result = await helpers.ingestInteractionEvent({
      event: buildInteractionEvent(),
      source: 'qq-sidecar',
    });

    expect(result).toEqual({
      ok: true,
      queued: true,
      message: 'queued',
      comment_id: 'comment-1',
      trace_id: 'trace-input',
    });
    expect(getActivePersonaNameMock).toHaveBeenCalledTimes(1);
    expect(tryEnqueueTaskMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ persona_id: 'bili-active-persona' }),
      expect.anything(),
      expect.anything(),
    );
  });

  it('does not attach persona_id when getActivePersonaName returns null but still enqueues', async () => {
    const prisma = buildPrisma();
    prisma.comment.create.mockResolvedValue({ id: 1 });
    prisma.commentQueueBacklog.findUnique.mockResolvedValue(null);
    const deps = buildDeps(prisma);
    const helpers = createCommentIngestHelpers(deps);

    await helpers.ingestInteractionEvent({
      event: buildInteractionEvent(),
      source: 'qq-sidecar',
    });

    const enqueuedPayload = tryEnqueueTaskMock.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(enqueuedPayload).toBeDefined();
    expect('persona_id' in enqueuedPayload).toBe(false);
  });
});
