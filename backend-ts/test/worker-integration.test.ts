/**
 * Worker integration tests
 * Tests end-to-end worker task processing with mock services
 */

// Speed up LLM fallback in test environment
process.env.LLM_TIMEOUT = '1000';
process.env.LLM_RETRIES = '1';
process.env.LLM_PROVIDER = 'ollama';
process.env.LLM_BASE_URL = 'http://127.0.0.1:1';

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { createCommentEventQueue } from '../src/workers/tasks/comment-event.task.js';
import { buildWorkerServices } from '../src/services/index.js';
import type { WorkerServices } from '../src/services/interfaces.js';
import type { CommentEventPayload } from '../src/workers/tasks/comment-event.task.js';

describe('worker integration tests', () => {
  let mockServices: WorkerServices;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    // Build mock services with test configuration
    mockServices = buildWorkerServices({
      killSwitch: false,
      roleProfileDefault: 'doro',
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('comment event worker', () => {
    it('creates queue', () => {
      const queue = createCommentEventQueue('test-comment-event');
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

  describe('service placeholders', () => {
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

    it('generates reply with meta (fallback when no LLM key)', async () => {
      const result = await mockServices.generateReplyWithMeta({
        content: 'test comment',
        style_mode: 'doro',
        length_mode: 'medium',
        knowledge_context: '',
        search_context: '',
        role_profile: 'doro',
      });

      expect(result.reply_text).toBeDefined();
      // Without a real LLM API key, the service falls back to templates
      expect(['fallback_template', 'mock', 'openai', 'claude', 'ollama']).toContain(result.provider);
      expect(result.resolved_role_profile).toBe('doro');
    }, 15000);

    it('publishes reply with result defaults to manual_queue when mode is unset', async () => {
      const originalPublisherMode = process.env.PUBLISHER_MODE;
      const commentId = `test-comment-${Date.now()}`;
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

    it('searches web (placeholder)', async () => {
      const result = await mockServices.searchWeb('test query');
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
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
