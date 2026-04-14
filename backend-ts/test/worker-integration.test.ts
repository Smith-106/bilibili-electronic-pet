/**
 * Worker integration tests
 * Tests end-to-end worker task processing with mock services
 */

// Speed up LLM fallback in test environment
process.env.LLM_TIMEOUT = '1000';
process.env.LLM_RETRIES = '1';
process.env.LLM_PROVIDER = 'ollama';
process.env.LLM_BASE_URL = 'http://127.0.0.1:1';

import type { Queue } from 'bullmq';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { createCommentEventQueue } from '../src/workers/tasks/comment-event.task.js';
import { buildWorkerServices } from '../src/services/index.js';
import type { WorkerServices } from '../src/services/interfaces.js';
import type { CommentEventPayload } from '../src/workers/tasks/comment-event.task.js';
import { parseBoolean, parseInteger } from '../src/workers/worker-main.js';

const trackedEnvKeys = [
  'LLM_PROVIDER',
  'LLM_BASE_URL',
  'LLM_MODEL',
  'LLM_API_KEY',
  'LLM_TIMEOUT',
  'LLM_RETRIES',
  'SEARCH_PROVIDER',
  'SEARCH_API_KEY',
  'SEARCH_MAX_RESULTS',
  'SEARCH_TIMEOUT',
  'SEARCH_CX',
  'PUBLISHER_MODE',
  'PUBLISHER_WEBHOOK_URL',
  'PUBLISHER_WEBHOOK_TOKEN',
  'PUBLISHER_TIMEOUT_SECONDS',
  'PUBLISHER_CIRCUIT_BREAKER_ENABLED',
] as const;

const originalEnv = Object.fromEntries(trackedEnvKeys.map((key) => [key, process.env[key]])) as Record<
  (typeof trackedEnvKeys)[number],
  string | undefined
>;

function restoreTrackedEnv(): void {
  for (const key of trackedEnvKeys) {
    if (originalEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalEnv[key];
    }
  }
}

describe('worker integration tests', () => {
  let mockServices: WorkerServices;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  const createdQueues: Array<Queue<CommentEventPayload>> = [];

  beforeEach(() => {
    restoreTrackedEnv();
    process.env.LLM_TIMEOUT = '1000';
    process.env.LLM_RETRIES = '1';
    process.env.LLM_PROVIDER = 'ollama';
    process.env.LLM_BASE_URL = 'http://127.0.0.1:1';
    process.env.PUBLISHER_CIRCUIT_BREAKER_ENABLED = 'false';
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    // Build mock services with test configuration
    mockServices = buildWorkerServices({
      killSwitch: false,
      roleProfileDefault: 'doro',
    });
  });

  afterEach(async () => {
    await Promise.all(
      createdQueues.splice(0).map(async (queue) => {
        await queue.close().catch(() => undefined);
      }),
    );
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    vi.unstubAllGlobals();
    restoreTrackedEnv();
  });

  describe('comment event worker', () => {
    it('creates queue', () => {
      const queue = createCommentEventQueue('test-comment-event');
      createdQueues.push(queue);
      expect(queue).toBeDefined();
    });

    it('validates payload structure', () => {
      const validPayload: CommentEventPayload = {
        comment_id: 'test-comment-123',
        source: 'test',
        platform: 'bilibili',
        trace_id: 'test-trace-123',
      };

      expect(validPayload.comment_id).toBe('test-comment-123');
      expect(validPayload.source).toBe('test');
      expect(validPayload.platform).toBe('bilibili');
    });
  });

  describe('worker runtime config helpers', () => {
    it('parses boolean worker flags from environment-style strings', () => {
      expect(parseBoolean('true', false)).toBe(true);
      expect(parseBoolean('YES', false)).toBe(true);
      expect(parseBoolean('0', true)).toBe(false);
      expect(parseBoolean(undefined, true)).toBe(true);
    });

    it('parses positive integers and falls back for invalid values', () => {
      expect(parseInteger('300', 60)).toBe(300);
      expect(parseInteger('0', 60)).toBe(60);
      expect(parseInteger('not-a-number', 60)).toBe(60);
      expect(parseInteger(undefined, 60)).toBe(60);
    });
  });

  describe('service behavior contracts', () => {
    it('ensures trace ID generation', () => {
      const traceId = mockServices.ensureTraceId();
      expect(traceId).toBeDefined();
      expect(typeof traceId).toBe('string');
      expect(traceId.length).toBeGreaterThan(0);
    });

    it('ensures existing trace ID', () => {
      const existingId = 'existing-trace-id';
      const traceId = mockServices.ensureTraceId(existingId);
      expect(traceId).toBe(existingId);
    });

    it('generates different trace IDs', () => {
      const id1 = mockServices.ensureTraceId();
      const id2 = mockServices.ensureTraceId();
      expect(id1).not.toBe(id2);
    });

    it('records observability event without error', () => {
      expect(() => {
        mockServices.recordObservabilityEvent({
          event_type: 'test_event',
          trace_id: 'test-trace',
          comment_id: 'test-comment',
          status: 'test',
        });
      }).not.toThrow();
    });

    it('builds log context', () => {
      const context = mockServices.buildLogContext({
        trace_id: 'test-trace',
        comment_id: 'test-comment',
        status: 'processing',
      });

      expect(context).toBeDefined();
      expect(typeof context).toBe('string');
      expect(context).toContain('test-trace');
    });

    it('should reply decision returns default', async () => {
      const [should, styleMode, lengthMode] = await mockServices.shouldReply({
        comment_id: 'test-comment',
      });

      expect(typeof should).toBe('boolean');
      expect(typeof styleMode).toBe('string');
      expect(typeof lengthMode).toBe('string');
    });

    it('should reply decision accepts interaction input', async () => {
      const [should, styleMode, lengthMode] = await mockServices.shouldReplyForInteraction({
        interaction: {
          platform: 'bilibili',
          ingressSource: 'test',
          reference: {
            subjectKind: 'comment',
            externalId: 'test-comment',
            canonicalId: 'bilibili:test-comment',
          },
          content: {
            text: 'hello there',
          },
          legacyComment: {
            commentId: 'test-comment',
          },
        },
        styleProfile: 'doro',
      });

      expect(typeof should).toBe('boolean');
      expect(typeof styleMode).toBe('string');
      expect(typeof lengthMode).toBe('string');
    });

    it('safety check returns result', async () => {
      const [safe, riskFlags] = await mockServices.safetyCheck('test content');

      expect(typeof safe).toBe('boolean');
      expect(typeof riskFlags).toBe('object');
    });

    it('decides safety action correctly', () => {
      const actionOk = mockServices.decideSafetyAction(true, {});
      expect(actionOk).toBe('ok');

      const actionBlocked = mockServices.decideSafetyAction(false, { decision: 'blocked' });
      expect(actionBlocked).toBe('blocked');

      const actionManual = mockServices.decideSafetyAction(false, { decision: 'manual_review' });
      expect(actionManual).toBe('manual_queue');
    });

    it('generates reply with deterministic fallback when LLM provider is unreachable', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => {
        throw new Error('llm_unreachable');
      }));

      const result = await mockServices.generateReplyWithMeta({
        content: 'test comment',
        style_mode: 'doro',
        length_mode: 'medium',
        knowledge_context: '',
        search_context: '',
        role_profile: 'doro',
      });

      expect(result.reply_text).toBeDefined();
      expect(result.reply_text).toContain('[Doro_Doro]');
      expect(result.provider).toBe('mock');
      expect(result.used_fallback).toBe(true);
      expect(result.resolved_role_profile).toBe('doro');
    }, 15000);

    it('returns provider output when LLM request is configured and succeeds', async () => {
      process.env.LLM_PROVIDER = 'ollama';
      process.env.LLM_BASE_URL = 'http://ollama.local';
      process.env.LLM_MODEL = 'llama3.1';

      const fetchMock = vi.fn(async () => ({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'configured llm reply' } }],
        }),
      }));
      vi.stubGlobal('fetch', fetchMock);

      const result = await mockServices.generateReplyWithMeta({
        content: 'configured test comment',
        style_mode: 'normal',
        length_mode: 'short',
        knowledge_context: '',
        search_context: '',
        role_profile: 'default',
      });

      expect(result.reply_text).toBe('configured llm reply');
      expect(result.provider).toBe('ollama');
      expect(result.used_fallback).toBe(false);
      expect(fetchMock).toHaveBeenCalledOnce();
    });

    it('publishes reply with result defaults to manual_queue when mode is unset', async () => {
      const originalPublisherMode = process.env.PUBLISHER_MODE;
      const commentId = `test-comment-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      delete process.env.PUBLISHER_MODE;

      try {
        const [published, reason, publishedAt] = await mockServices.publishReplyWithResult(
          commentId,
          'test reply',
          'test-trace',
        );

        expect(published).toBe(true);
        expect(reason).toBe('manual_queued');
        expect(publishedAt).toBeDefined();
      } finally {
        if (originalPublisherMode !== undefined) {
          process.env.PUBLISHER_MODE = originalPublisherMode;
        } else {
          delete process.env.PUBLISHER_MODE;
        }
      }
    });

    it('publishes a platform-agnostic intent through the compatibility publisher', async () => {
      const originalPublisherMode = process.env.PUBLISHER_MODE;
      delete process.env.PUBLISHER_MODE;

      try {
        const [published, reason, publishedAt] = await mockServices.publishIntentWithResult({
          traceId: 'intent-trace-1',
          source: 'worker-test',
          target: {
            platform: 'qq',
            targetKind: 'comment-reply',
            externalId: `intent-message-${Date.now()}`,
            canonicalId: `qq:intent-message-${Date.now()}`,
            route: {
              containerId: 'group-42',
              parentExternalId: 'message-0',
              metadata: {
                chat_type: 'group',
              },
            },
          },
          payload: {
            text: 'intent reply',
          },
        });

        expect(published).toBe(true);
        expect(reason).toBe('manual_queued');
        expect(publishedAt).toBeDefined();
      } finally {
        if (originalPublisherMode !== undefined) {
          process.env.PUBLISHER_MODE = originalPublisherMode;
        } else {
          delete process.env.PUBLISHER_MODE;
        }
      }
    });

    it('publishes reply through configured webhook mode', async () => {
      process.env.PUBLISHER_MODE = 'webhook';
      process.env.PUBLISHER_WEBHOOK_URL = 'https://example.com/publish';
      process.env.PUBLISHER_WEBHOOK_TOKEN = 'test-token';
      process.env.PUBLISHER_CIRCUIT_BREAKER_ENABLED = 'false';

      const fetchMock = vi.fn(async () => ({
        ok: true,
        json: async () => ({ ok: true, id: 'remote-1' }),
      }));
      vi.stubGlobal('fetch', fetchMock);

      const [published, reason, publishedAt] = await mockServices.publishReplyWithResult(
        `webhook-comment-${Date.now()}`,
        'webhook reply',
        'trace-webhook',
      );

      expect(published).toBe(true);
      expect(reason).toBe('webhook_published');
      expect(publishedAt).toBeDefined();
      expect(fetchMock).toHaveBeenCalledWith(
        'https://example.com/publish',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        }),
      );
    });

    it('fails webhook publish with explicit not-configured reason when url is missing', async () => {
      process.env.PUBLISHER_MODE = 'webhook';
      delete process.env.PUBLISHER_WEBHOOK_URL;
      process.env.PUBLISHER_CIRCUIT_BREAKER_ENABLED = 'false';

      const [published, reason] = await mockServices.publishReplyWithResult(
        `webhook-missing-${Date.now()}`,
        'test reply',
        'trace-webhook-missing',
      );

      expect(published).toBe(false);
      expect(reason).toBe('webhook_not_configured');
    });

    it('publishes reply with result (fails without Bilibili config)', async () => {
      const originalPublisherMode = process.env.PUBLISHER_MODE;
      const commentId = `test-comment-${Date.now()}`;
      process.env.PUBLISHER_MODE = 'real_publish';

      try {
        const [published, reason, publishedAt] = await mockServices.publishReplyWithResult(
          commentId,
          'test reply',
          'test-trace',
        );

        expect(published).toBe(false);
        // Without real Bilibili credentials, the API call fails
        expect(['publish_failed', 'not_configured']).toContain(reason);
        expect(publishedAt).toBeDefined();
      } finally {
        if (originalPublisherMode !== undefined) {
          process.env.PUBLISHER_MODE = originalPublisherMode;
        } else {
          delete process.env.PUBLISHER_MODE;
        }
      }
    });

    it('searches knowledge (placeholder)', async () => {
      const entries = await mockServices.searchKnowledge('test query');
      expect(Array.isArray(entries)).toBe(true);
    });

    it('builds knowledge context', () => {
      const context = mockServices.buildKnowledgeContext([{ category: 'test' }, { category: 'example' }]);
      expect(context).toContain('Knowledge Context');
      expect(context).toContain('Category: test');
      expect(context).toContain('Category: example');
    });

    it('returns fallback-empty search results when search provider is not configured', async () => {
      delete process.env.SEARCH_API_KEY;
      const result = await mockServices.searchWeb('test query');
      expect(result.items).toBeDefined();
      expect(result.items).toEqual([]);
    });

    it('returns ranked and deduped items when search provider is configured', async () => {
      process.env.SEARCH_PROVIDER = 'serpapi';
      process.env.SEARCH_API_KEY = 'search-key';
      process.env.SEARCH_MAX_RESULTS = '5';

      const fetchMock = vi.fn(async () => ({
        ok: true,
        json: async () => ({
          organic_results: [
            { link: 'https://example.com/a', title: 'Test topic', snippet: 'first snippet' },
            { link: 'https://example.com/a', title: 'Test topic', snippet: 'first snippet' },
            { link: 'https://example.com/b', title: 'Other', snippet: 'second snippet' },
          ],
        }),
      }));
      vi.stubGlobal('fetch', fetchMock);

      const result = await mockServices.searchWeb('test topic query');
      expect(result.error_type).toBeUndefined();
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items[0]?.source).toBe('https://example.com/a');
      expect(new Set(result.items.map((item) => item.source)).size).toBe(result.items.length);
      expect(fetchMock).toHaveBeenCalled();
    });

    it('builds search context', () => {
      const context = mockServices.buildSearchContext([{ source: 'test', title: 'Test', snippet: 'Test snippet' }]);
      expect(context).toContain('Search Context');
    });

    it('checks duplicate (placeholder)', async () => {
      const isDup = await mockServices.isRecentDuplicate('user-123', 'test phrase');
      expect(typeof isDup).toBe('boolean');
    });

    it('remembers phrase (placeholder)', async () => {
      await expect(mockServices.rememberReplyPhrase('user-123', 'test phrase')).resolves.toBeUndefined();
    });
  });
});
