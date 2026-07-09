import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createTaskQueueMock, createTaskWorkerMock, upsertCompanionFeedItemMock } = vi.hoisted(() => ({
  createTaskQueueMock: vi.fn(),
  createTaskWorkerMock: vi.fn(),
  upsertCompanionFeedItemMock: vi.fn(),
}));

const { getActivePersonaNameMock } = vi.hoisted(() => ({
  getActivePersonaNameMock: vi.fn(),
}));

vi.mock('../src/app/memory/companion-feed.js', () => ({
  upsertCompanionFeedItem: upsertCompanionFeedItemMock,
}));

vi.mock('../src/workers/task-queue.js', () => ({
  createTaskQueue: createTaskQueueMock,
  createTaskWorker: createTaskWorkerMock,
}));

// Mock the persona accessor so the C-layer rate-limit check (TASK-006) never touches the
// real Prisma in unit tests. Default returns null → checkPersonaRateLimit(null) fail-opens.
vi.mock('../src/services/bilibili-runtime-config.js', () => ({
  getActivePersonaName: getActivePersonaNameMock,
}));

import type { Job } from 'bullmq';
import type { WorkerServices } from '../src/services/interfaces.js';
import { NonRetryableWorkerError, RetryableWorkerError } from '../src/workers/errors.js';
import { __resetBucketsForTest } from '../src/services/persona-token-bucket.js';
import {
  createCommentEventQueue,
  createCommentEventWorker,
  type CommentEventPayload,
} from '../src/workers/tasks/comment-event.task.js';

type CommentEventProcessor = (job: Job<CommentEventPayload>) => Promise<Record<string, unknown>>;

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

function buildRoleCard(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    key: 'card-1',
    enabled: true,
    is_active: true,
    system_prompt: 'system prompt',
    tone: 'gentle',
    constraints: { maxLength: 80 },
    created_at: new Date('2026-03-07T00:00:00.000Z'),
    updated_at: new Date('2026-03-07T00:00:00.000Z'),
    ...overrides,
  };
}

function buildServices(overrides: Partial<WorkerServices> = {}): WorkerServices {
  return {
    getCommentByCanonicalId: vi.fn(async () => buildComment()),
    createReplyJob: vi.fn(async () => 101),
    shouldReply: vi.fn(async () => [true, 'normal', 'short']),
    shouldReplyForInteraction: vi.fn(async () => [true, 'normal', 'short']),
    decideSafetyAction: vi.fn(() => 'ok'),
    safetyCheck: vi.fn(async () => [true, {}]),
    generateReplyWithMeta: vi.fn(async () => ({
      reply_text: 'generated reply',
      provider: 'mock',
      used_fallback: false,
      resolved_role_profile: 'doro',
    })),
    isRecentDuplicate: vi.fn(async () => false),
    rememberReplyPhrase: vi.fn(async () => undefined),
    publishIntentWithResult: vi.fn(async () => [
      true,
      'webhook_published',
      new Date('2026-03-07T01:00:00.000Z'),
      { new_rpid: 'remote-1' },
    ]),
    publishReplyWithResult: vi.fn(async () => [true, 'unused', null, null]),
    searchKnowledge: vi.fn(async () => [{ category: 'faq' }]),
    buildKnowledgeContext: vi.fn(() => 'knowledge context'),
    searchWeb: vi.fn(async () => ({ items: [{ source: 'https://example.test' }] })),
    buildSearchContext: vi.fn(() => 'search context'),
    getRoleCardByKey: vi.fn(async () => null),
    getActiveRoleCard: vi.fn(async () => null),
    ensureTraceId: vi.fn((traceId?: string) => traceId ?? 'trace-worker-1'),
    recordObservabilityEvent: vi.fn(),
    buildLogContext: vi.fn(() => 'log context'),
    killSwitch: false,
    roleProfileDefault: 'doro',
    ...overrides,
  } as WorkerServices;
}

function buildJob(data: Partial<CommentEventPayload> = {}): Job<CommentEventPayload> {
  return {
    id: 'job-1',
    data: {
      comment_id: 'comment-1',
      video_id: 'video-1',
      user_id: 'user-1',
      content: 'payload content',
      parent_id: 'parent-1',
      platform: 'bilibili',
      source: 'unit-test',
      trace_id: 'trace-worker-1',
      ...data,
    },
  } as unknown as Job<CommentEventPayload>;
}

function buildProcessor(services = buildServices()): CommentEventProcessor {
  createCommentEventWorker('unit-comment-event', services);
  return createTaskWorkerMock.mock.calls.at(-1)?.[1] as CommentEventProcessor;
}

describe('comment event task worker', () => {
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    createTaskQueueMock.mockImplementation((queueName: string) => ({ queueName }));
    createTaskWorkerMock.mockImplementation(
      (queueName: string, processor: CommentEventProcessor, workerConfig: Record<string, unknown>) => ({
        queueName,
        processor,
        workerConfig,
      }),
    );
    upsertCompanionFeedItemMock.mockResolvedValue(undefined);
    // Default: no active persona → checkPersonaRateLimit(null) returns {allowed:true} (fail-open).
    // Tests that exercise the rate-limit path override this with a concrete persona name.
    getActivePersonaNameMock.mockResolvedValue(null);
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('creates a named comment event queue', () => {
    const queue = createCommentEventQueue('custom-comment-event');

    expect(queue).toEqual({ queueName: 'custom-comment-event' });
    expect(createTaskQueueMock).toHaveBeenCalledWith('custom-comment-event');
  });

  it('short-circuits when the service kill switch is enabled', async () => {
    const services = buildServices({ killSwitch: true });
    const processor = buildProcessor(services);

    const result = await processor(buildJob());

    expect(result).toEqual({
      ok: false,
      reason: 'kill_switch_enabled',
      trace_id: 'trace-worker-1',
    });
    expect(services.getCommentByCanonicalId).not.toHaveBeenCalled();
    expect(services.recordObservabilityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'job_finished',
        status: 'kill_switch_enabled',
      }),
    );
  });

  it('rejects payloads without a comment id as non-retryable', async () => {
    const processor = buildProcessor();

    await expect(processor(buildJob({ comment_id: '' }))).rejects.toBeInstanceOf(NonRetryableWorkerError);
  });

  it('returns comment_not_found when canonical lookup misses', async () => {
    const services = buildServices({
      getCommentByCanonicalId: vi.fn(async () => null),
    });
    const processor = buildProcessor(services);

    const result = await processor(buildJob({ platform: ' QQ ' }));

    expect(result).toEqual({
      ok: false,
      reason: 'comment_not_found',
      trace_id: 'trace-worker-1',
    });
    expect(services.getCommentByCanonicalId).toHaveBeenCalledWith('qq:comment-1');
    expect(services.recordObservabilityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'job_finished',
        status: 'comment_not_found',
      }),
    );
  });

  it('defaults missing payload platform to bilibili before canonical lookup', async () => {
    const services = buildServices({
      getCommentByCanonicalId: vi.fn(async () => null),
    });
    const processor = buildProcessor(services);

    const result = await processor(buildJob({ platform: undefined }));

    expect(result).toEqual({
      ok: false,
      reason: 'comment_not_found',
      trace_id: 'trace-worker-1',
    });
    expect(services.getCommentByCanonicalId).toHaveBeenCalledWith('bilibili:comment-1');
  });

  it('creates a skipped reply job and swallows companion signal failures', async () => {
    const services = buildServices({
      shouldReplyForInteraction: vi.fn(async () => [false, 'gentle', 'medium']),
    });
    upsertCompanionFeedItemMock.mockRejectedValue(new Error('feed offline'));
    const processor = buildProcessor(services);

    const result = await processor(buildJob());

    expect(result).toEqual({
      ok: true,
      status: 'skipped',
      trace_id: 'trace-worker-1',
    });
    expect(services.shouldReplyForInteraction).toHaveBeenCalledWith(
      expect.objectContaining({
        interaction: expect.objectContaining({
          actor: { platformUserId: 'user-1' },
          content: { text: 'comment text' },
          legacyComment: expect.objectContaining({ commentId: 'comment-1' }),
        }),
        forceLong: undefined,
        styleProfile: undefined,
        roleProfile: undefined,
        roleCardKey: undefined,
      }),
    );
    expect(services.createReplyJob).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'skipped',
        style_mode: 'gentle',
        length_mode: 'medium',
        attempts: 0,
      }),
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('worker_companion_signal_failed'));
  });

  it('records dedupe_skipped with generation diagnostics and role cards', async () => {
    const services = buildServices({
      getRoleCardByKey: vi.fn(async () => buildRoleCard({ key: 'explicit-card' })),
      getActiveRoleCard: vi.fn(async () => buildRoleCard({ key: 'active-card' })),
      searchKnowledge: vi.fn(async () => {
        throw new Error('knowledge down');
      }),
      searchWeb: vi.fn(async () => ({
        items: [{ source: 'https://example.test/a' }],
        error_type: 'timeout',
        error_message: 'search slow',
      })),
      generateReplyWithMeta: vi.fn(async () => ({
        reply_text: 'duplicate reply',
        provider: 'mock',
        used_fallback: true,
        resolved_role_profile: 'doro',
        resolved_role_card_key: 'explicit-card',
        error_type: 'llm_timeout',
        error_message: 'fallback used',
      })),
      isRecentDuplicate: vi.fn(async () => true),
    });
    const processor = buildProcessor(services);

    const result = await processor(
      buildJob({
        role_card_key: 'explicit-card',
        role_profile: 'auto',
      }),
    );

    expect(result).toEqual({
      ok: true,
      status: 'dedupe_skipped',
      trace_id: 'trace-worker-1',
    });
    expect(services.generateReplyWithMeta).toHaveBeenCalledWith(
      expect.objectContaining({
        role_profile: 'doro',
        role_card: expect.objectContaining({ key: 'explicit-card' }),
        active_role_card: expect.objectContaining({ key: 'active-card' }),
      }),
    );
    expect(services.createReplyJob).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'dedupe_skipped',
        reply_text: 'duplicate reply',
        risk_flags: expect.objectContaining({
          knowledge_error: 'Error: knowledge down',
          search_error: 'timeout: search slow',
          llm_error_type: 'llm_timeout',
          llm_error_message: 'fallback used',
          reason: 'recent_phrase_duplicate',
        }),
      }),
    );
  });

  it('queues unsafe replies for manual review', async () => {
    const services = buildServices({
      safetyCheck: vi.fn(async () => [false, { decision: 'manual_review' }]),
      decideSafetyAction: vi.fn(() => 'manual_queue'),
    });
    const processor = buildProcessor(services);

    const result = await processor(buildJob());

    expect(result).toEqual({
      ok: true,
      status: 'manual_queue',
      risk_flags: { decision: 'manual_review' },
      trace_id: 'trace-worker-1',
    });
    expect(services.publishIntentWithResult).not.toHaveBeenCalled();
    expect(services.createReplyJob).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'manual_queue',
        risk_flags: expect.objectContaining({ decision: 'manual_review' }),
      }),
    );
  });

  it('keeps processing when web search throws', async () => {
    const services = buildServices({
      searchWeb: vi.fn(async () => {
        throw new Error('search offline');
      }),
    });
    const processor = buildProcessor(services);

    const result = await processor(buildJob());

    expect(result).toMatchObject({
      ok: true,
      status: 'published',
      trace_id: 'trace-worker-1',
    });
    expect(services.buildSearchContext).not.toHaveBeenCalled();
    expect(services.createReplyJob).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'published',
        risk_flags: expect.objectContaining({
          search_error: 'Error: search offline',
        }),
      }),
    );
  });

  it('blocks unsafe replies when safety action is blocked (L10 hard_reject, no BullMQ retry)', async () => {
    const services = buildServices({
      safetyCheck: vi.fn(async () => [false, { decision: 'blocked' }]),
      decideSafetyAction: vi.fn(() => 'blocked'),
    });
    const processor = buildProcessor(services);

    const result = await processor(buildJob());

    // L10: hard_reject returns {ok:false} WITHOUT throwing → BullMQ marks the job
    // completed → NO retry. This is intentional (avoid stacking backoff on content
    // that will never pass safety review). createReplyJob still records status:'blocked'.
    expect(result).toMatchObject({
      ok: false,
      status: 'hard_reject',
      risk_flags: { decision: 'blocked' },
    });
    expect(services.publishIntentWithResult).not.toHaveBeenCalled();
    expect(services.createReplyJob).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'blocked',
        risk_flags: expect.objectContaining({ decision: 'blocked' }),
      }),
    );
  });

  it('publishes replies through platform intent and remembers successful phrases', async () => {
    const publishedAt = new Date('2026-03-07T01:00:00.000Z');
    const services = buildServices({
      publishIntentWithResult: vi.fn(async () => [true, 'webhook_published', publishedAt, { new_rpid: 'remote-1' }]),
    });
    const processor = buildProcessor(services);

    const result = await processor(
      buildJob({
        interaction: {
          platform: 'qq',
          ingressSource: 'qq-sidecar',
          traceId: 'trace-worker-1',
          actor: { platformUserId: 'qq-user-1' },
          reference: {
            subjectKind: 'comment',
            externalId: 'message-1',
            canonicalId: 'qq:message-1',
            containerId: 'group-42',
            parentExternalId: 'message-0',
          },
          content: { text: 'message content' },
          legacyComment: { commentId: 'message-1', videoId: 'group-42' },
        },
      }),
    );

    expect(result).toEqual({
      ok: true,
      status: 'published',
      published_at: '2026-03-07T01:00:00.000Z',
      trace_id: 'trace-worker-1',
    });
    expect(services.publishIntentWithResult).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: 'trace-worker-1',
        source: 'comment-event-worker',
        target: expect.objectContaining({
          platform: 'qq',
          externalId: 'message-1',
          route: {
            containerId: 'group-42',
            parentExternalId: 'message-0',
            metadata: {
              chat_type: 'group',
              user_id: 'qq-user-1',
            },
          },
        }),
        payload: { text: 'generated reply' },
      }),
    );
    expect(services.createReplyJob).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'published',
        risk_flags: expect.objectContaining({
          publish_reason: 'webhook_published',
          gateway_duplicate: false,
          new_rpid: 'remote-1',
        }),
      }),
    );
    expect(services.rememberReplyPhrase).toHaveBeenCalledWith('user-1', 'generated reply');
  });

  it('publishes QQ private replies without route user metadata and falls back to the comment actor for decisions', async () => {
    const publishedAt = new Date('2026-03-07T01:05:00.000Z');
    const services = buildServices({
      getCommentByCanonicalId: vi.fn(async () =>
        buildComment({
          canonical_comment_id: 'qq:message-private',
          comment_id: 'message-private',
          video_id: '',
          user_id: 'comment-user-1',
          content: 'private message content',
        }),
      ),
      searchWeb: vi.fn(async () => ({
        items: [],
        error_type: 'timeout',
        error_message: '',
      })),
      getRoleCardByKey: vi.fn(async () => buildRoleCard({ key: 'disabled-card', enabled: false })),
      publishIntentWithResult: vi.fn(async () => [true, 'webhook_published', publishedAt, null]),
    });
    const processor = buildProcessor(services);

    const result = await processor(
      buildJob({
        interaction: {
          platform: 'qq',
          ingressSource: 'qq-sidecar',
          traceId: 'trace-worker-1',
          reference: {
            subjectKind: 'comment',
            externalId: 'message-private',
            canonicalId: 'qq:message-private',
          },
          content: { text: 'private payload text' },
        },
        role_card_key: 'disabled-card',
      }),
    );

    expect(result).toEqual({
      ok: true,
      status: 'published',
      published_at: '2026-03-07T01:05:00.000Z',
      trace_id: 'trace-worker-1',
    });
    expect(services.shouldReplyForInteraction).toHaveBeenCalledWith(
      expect.objectContaining({
        interaction: expect.objectContaining({
          actor: { platformUserId: 'comment-user-1' },
          content: { text: 'private message content' },
        }),
        roleCardKey: 'disabled-card',
      }),
    );
    expect(services.generateReplyWithMeta).toHaveBeenCalledWith(
      expect.objectContaining({
        role_card: undefined,
      }),
    );
    expect(services.publishIntentWithResult).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          platform: 'qq',
          route: {
            containerId: undefined,
            parentExternalId: undefined,
            metadata: {
              chat_type: 'private',
            },
          },
        }),
      }),
    );
    expect(services.createReplyJob).toHaveBeenCalledWith(
      expect.objectContaining({
        risk_flags: expect.objectContaining({
          search_error: 'timeout:',
        }),
      }),
    );
  });

  it('stores manual_queue when publish fails', async () => {
    const services = buildServices({
      publishIntentWithResult: vi.fn(async () => [false, 'webhook_failed', null, null]),
    });
    const processor = buildProcessor(services);

    const result = await processor(buildJob());

    expect(result).toEqual({
      ok: true,
      status: 'manual_queue',
      published_at: null,
      trace_id: 'trace-worker-1',
    });
    expect(services.createReplyJob).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'manual_queue',
        published_at: null,
        risk_flags: expect.objectContaining({
          publish_reason: 'webhook_failed',
          gateway_duplicate: false,
        }),
      }),
    );
    expect(services.rememberReplyPhrase).not.toHaveBeenCalled();
  });

  it('uses payload fallbacks for blank platform, comment content, and publish metadata', async () => {
    const publishedAt = new Date('2026-03-07T01:00:00.000Z');
    const services = buildServices({
      getCommentByCanonicalId: vi.fn(async () =>
        buildComment({
          platform: '',
          canonical_comment_id: 'bilibili:comment-1',
          video_id: '',
          user_id: '',
          content: '',
          parent_id: '',
        }),
      ),
      searchKnowledge: vi.fn(async () => []),
      searchWeb: vi.fn(async () => ({ items: [] })),
      generateReplyWithMeta: vi.fn(async () => ({
        reply_text: 'generated reply',
        provider: 'mock',
        used_fallback: false,
        resolved_role_profile: 'custom',
      })),
      publishIntentWithResult: vi.fn(async () => [
        true,
        'idempotent_replay',
        publishedAt,
        { new_rpid: 'ignored-remote-id' },
      ]),
    });
    const processor = buildProcessor(services);

    const result = await processor(
      buildJob({
        platform: '   ',
        video_id: undefined,
        parent_id: undefined,
        user_id: undefined,
        content: 'payload fallback text',
        role_profile: 'custom',
      }),
    );

    expect(result).toEqual({
      ok: true,
      status: 'published',
      published_at: '2026-03-07T01:00:00.000Z',
      trace_id: 'trace-worker-1',
    });
    expect(services.getCommentByCanonicalId).toHaveBeenCalledWith('bilibili:comment-1');
    expect(services.shouldReplyForInteraction).toHaveBeenCalledWith(
      expect.objectContaining({
        interaction: expect.objectContaining({
          actor: undefined,
          content: { text: 'payload fallback text' },
          legacyComment: expect.objectContaining({
            videoId: undefined,
            parentId: undefined,
          }),
        }),
      }),
    );
    expect(services.generateReplyWithMeta).toHaveBeenCalledWith(
      expect.objectContaining({
        content: '',
        role_profile: 'custom',
      }),
    );
    expect(services.publishIntentWithResult).toHaveBeenCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({
          platform: 'bilibili',
          route: expect.objectContaining({
            containerId: undefined,
            parentExternalId: undefined,
            metadata: undefined,
          }),
        }),
      }),
    );
    expect(services.createReplyJob).toHaveBeenCalledWith(
      expect.objectContaining({
        risk_flags: expect.not.objectContaining({
          new_rpid: expect.anything(),
        }),
      }),
    );
    expect(services.rememberReplyPhrase).not.toHaveBeenCalled();
  });

  it('logs non-Error companion feed failures without failing the worker', async () => {
    const services = buildServices({
      shouldReplyForInteraction: vi.fn(async () => [false, 'gentle', 'medium']),
    });
    upsertCompanionFeedItemMock.mockRejectedValue('plain feed failure');
    const processor = buildProcessor(services);

    const result = await processor(buildJob());

    expect(result).toEqual({
      ok: true,
      status: 'skipped',
      trace_id: 'trace-worker-1',
    });
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('plain feed failure'));
  });

  describe('C-layer per-persona rate limit (TASK-006)', () => {
    beforeEach(() => {
      // Reset the shared token-bucket Map between tests so capacity/refill start fresh.
      __resetBucketsForTest();
    });

    it('throws RetryableWorkerError(rate_limited_retryable) when the persona bucket is exhausted (L10 retryable)', async () => {
      // Use a distinct persona so this test's bucket is isolated from others.
      const persona = 'rate-limit-persona';
      getActivePersonaNameMock.mockResolvedValue(persona);
      // CAPACITY=20: exhaust the bucket by running 20 successful publishes first.
      const services = buildServices();
      const processor = buildProcessor(services);
      for (let i = 0; i < 20; i++) {
        // eslint-disable-next-line no-await-in-loop
        const r = await processor(buildJob());
        expect(r).toMatchObject({ ok: true, status: 'published' });
      }
      // 21st call: bucket empty → RetryableWorkerError('rate_limited_retryable')
      await expect(processor(buildJob())).rejects.toThrow(RetryableWorkerError);
      await expect(processor(buildJob())).rejects.toThrow('rate_limited_retryable');
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('worker_persona_rate_limited'));
    });

    it('does NOT throw and does NOT retry when safety blocks (L10 hard_reject, distinct from rate_limited)', async () => {
      // hard_reject must return a value (no throw) → BullMQ completes, no retry.
      // This is the L10 distinction: hard_reject vs rate_limited_retryable.
      const services = buildServices({
        safetyCheck: vi.fn(async () => [false, { decision: 'blocked' }]),
        decideSafetyAction: vi.fn(() => 'blocked'),
      });
      const processor = buildProcessor(services);

      const result = await processor(buildJob());

      expect(result).toMatchObject({ ok: false, status: 'hard_reject' });
    });

    it('bypasses the bucket when ANTIRISK_C_RATE_LIMIT_ENABLED=false (L8 flag isolation)', async () => {
      const previous = process.env.ANTIRISK_C_RATE_LIMIT_ENABLED;
      process.env.ANTIRISK_C_RATE_LIMIT_ENABLED = 'false';
      const persona = 'flag-off-persona';
      getActivePersonaNameMock.mockResolvedValue(persona);
      const services = buildServices();
      const processor = buildProcessor(services);

      // Exhaust the bucket 20x, then prove the 21st still publishes (flag off → no limit).
      for (let i = 0; i < 25; i++) {
        // eslint-disable-next-line no-await-in-loop
        const r = await processor(buildJob());
        expect(r).toMatchObject({ ok: true, status: 'published' });
      }

      if (previous === undefined) {
        delete process.env.ANTIRISK_C_RATE_LIMIT_ENABLED;
      } else {
        process.env.ANTIRISK_C_RATE_LIMIT_ENABLED = previous;
      }
    });
  });
});
