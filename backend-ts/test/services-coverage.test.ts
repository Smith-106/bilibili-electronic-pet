import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { InteractionEvent } from '../src/domain/interaction/types.js';
import { __safetyTesting, safetyCheck } from '../src/services/safety.js';
import { __llmClientTesting, generateWithLLM } from '../src/services/llm-client.js';
import {
  collectCommentEvent,
  collectInteractionEvent,
  normalizeCommentEventToInteractionEvent,
  normalizeInteractionEventToCommentEvent,
} from '../src/services/collector.js';

const mockPrisma = vi.hoisted(() => ({
  userState: {
    findUnique: vi.fn(),
  },
  observabilityEvent: {
    create: vi.fn(),
  },
}));

vi.mock('../src/services/db-queries.js', () => ({
  prisma: () => mockPrisma,
}));

const { shouldReply, shouldReplyForInteraction, decideSafetyAction, __deciderTesting } = await import(
  '../src/services/decider.js'
);
const { buildLogContext, ensureTraceId, recordObservabilityEvent } = await import('../src/services/observability.js');

const trackedEnvKeys = [
  'SAFETY_KEYWORD_BLACKLIST',
  'SAFETY_ENABLE_KEYWORD_BLACKLIST',
  'SAFETY_ENABLE_PII_DETECTION',
  'SAFETY_MAX_REPLY_CHARS',
  'SAFETY_PII_ACTION',
  'SAFETY_SENSITIVITY_LEVEL',
  'LLM_PROVIDER',
  'LLM_API_KEY',
  'LLM_MODEL',
  'LLM_BASE_URL',
  'LLM_TEMPERATURE',
  'LLM_MAX_TOKENS',
  'LLM_TIMEOUT',
  'LLM_RETRIES',
  'REPLY_BASE_PROBABILITY',
  'REPLY_GLOBAL_COOLDOWN_ENABLED',
  'REPLY_COOLDOWN_MINUTES',
  'REPLY_QUIET_HOURS_START',
  'REPLY_QUIET_HOURS_END',
] as const;

const originalEnv = Object.fromEntries(trackedEnvKeys.map((key) => [key, process.env[key]])) as Record<
  (typeof trackedEnvKeys)[number],
  string | undefined
>;

function clearTrackedEnv(): void {
  for (const key of trackedEnvKeys) {
    delete process.env[key];
  }
}

function restoreTrackedEnv(): void {
  clearTrackedEnv();
  for (const key of trackedEnvKeys) {
    if (originalEnv[key] !== undefined) {
      process.env[key] = originalEnv[key];
    }
  }
}

function jsonResponse(body: unknown, ok = true, status = 200, statusText = 'OK') {
  return {
    ok,
    status,
    statusText,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  };
}

function buildInteraction(text: string, userId?: string): InteractionEvent {
  return {
    platform: 'bilibili',
    ingressSource: 'test',
    actor: userId ? { platformUserId: userId } : undefined,
    reference: {
      subjectKind: 'comment',
      externalId: 'comment-1',
      canonicalId: 'bilibili:comment-1',
      containerId: 'video-1',
    },
    content: { text },
    legacyComment: {
      commentId: 'comment-1',
      videoId: 'video-1',
    },
  };
}

beforeEach(() => {
  clearTrackedEnv();
  mockPrisma.userState.findUnique.mockReset();
  mockPrisma.observabilityEvent.create.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  restoreTrackedEnv();
});

describe('collector coverage branches', () => {
  it('normalizes poller, official, douyin, qq, and kuaishou payload aliases', () => {
    expect(
      collectCommentEvent(
        {
          event: {
            rpid: 120,
            oid: 300,
            mid: 400,
            message: 'poller text',
            root: 12,
            traceId: 'trace-poller',
          },
        },
        'poller',
        'bilibili',
      ),
    ).toMatchObject({
      comment_id: '120',
      video_id: '300',
      user_id: '400',
      content: 'poller text',
      parent_id: '12',
      platform: 'bilibili',
      source: 'poller',
      trace_id: 'trace-poller',
    });

    expect(
      collectCommentEvent(
        {
          data: {
            commentId: 'official-1',
            videoId: 'video-1',
            userId: 'user-1',
            message: 'official text',
            parentId: 'root-1',
            trace_id: 'trace-official',
          },
        },
        'official',
      ),
    ).toMatchObject({
      comment_id: 'official-1',
      video_id: 'video-1',
      user_id: 'user-1',
      content: 'official text',
      parent_id: 'root-1',
      platform: 'official',
      source: 'official',
      trace_id: 'trace-official',
    });

    expect(
      collectCommentEvent(
        {
          item_id: 'douyin-comment',
          aweme_id: 'aweme-1',
          sec_uid: 'sec-1',
          text: 'douyin text',
          reply_id: 'reply-1',
          meta: { trace_id: 'trace-douyin' },
        },
        'douyin',
      ),
    ).toMatchObject({
      comment_id: 'douyin-comment',
      video_id: 'aweme-1',
      user_id: 'sec-1',
      content: 'douyin text',
      parent_id: 'reply-1',
      platform: 'douyin',
      source: 'douyin',
      trace_id: 'trace-douyin',
    });

    expect(
      collectCommentEvent(
        {
          message_id: 'qq-message',
          group_id: 'group-1',
          sender_id: 'sender-1',
          raw_message: 'qq text',
          reply_to: 'reply-qq',
          meta: { trace_id: 'trace-qq' },
        },
        'qq',
      ),
    ).toMatchObject({
      comment_id: 'qq-message',
      video_id: 'group-1',
      user_id: 'sender-1',
      content: 'qq text',
      parent_id: 'reply-qq',
      platform: 'qq',
      source: 'qq',
      trace_id: 'trace-qq',
    });

    expect(
      collectCommentEvent(
        {
          comment_id_str: 'ks-comment',
          photo_id: 'photo-1',
          author_id: 'author-1',
          text: 'kuaishou text',
          root_comment_id: 'root-ks',
          meta: { trace_id: 'trace-ks' },
        },
        'kuaishou',
      ),
    ).toMatchObject({
      comment_id: 'ks-comment',
      video_id: 'photo-1',
      user_id: 'author-1',
      content: 'kuaishou text',
      parent_id: 'root-ks',
      platform: 'kuaishou',
      source: 'kuaishou',
      trace_id: 'trace-ks',
    });
  });

  it('handles blank optional fields, unsupported sources, and canonical platform fallbacks', () => {
    expect(
      collectCommentEvent(
        {
          comment_id: 42,
          video_id: '   ',
          user_id: null,
          content: '',
          parent_id: undefined,
        },
        'webhook',
        '',
      ),
    ).toEqual({
      comment_id: '42',
      video_id: undefined,
      user_id: undefined,
      content: undefined,
      parent_id: undefined,
      platform: '',
      source: 'webhook',
      trace_id: undefined,
    });

    expect(() => collectCommentEvent({ message: 'missing id' }, 'webhook')).toThrow(
      'invalid_webhook_payload: missing_fields=comment_id',
    );
    expect(() => collectCommentEvent({ comment_id: 'x' }, 'unsupported' as never)).toThrow(
      'unsupported_collector_source: unsupported',
    );

    const webhookInteraction = collectInteractionEvent({ commentId: 'w-1', message: 'body' }, 'webhook');
    expect(webhookInteraction.platform).toBe('unknown');
    expect(webhookInteraction.reference.canonicalId).toBe('webhook:w-1');

    const directPlatformInteraction = collectInteractionEvent({ rpid: 'b-1', text: 'direct' }, 'bilibili');
    expect(directPlatformInteraction.platform).toBe('bilibili');
    expect(directPlatformInteraction.reference.canonicalId).toBe('bilibili:b-1');

    expect(
      normalizeCommentEventToInteractionEvent({
        comment_id: 'official-2',
        platform: 'official',
        source: 'official',
      }),
    ).toMatchObject({
      platform: 'unknown',
      reference: {
        canonicalId: 'official:official-2',
      },
    });

    expect(
      normalizeCommentEventToInteractionEvent({
        comment_id: 'webhook-2',
        source: 'webhook',
      }),
    ).toMatchObject({
      platform: 'unknown',
      reference: {
        canonicalId: 'webhook:webhook-2',
      },
    });

    expect(
      normalizeCommentEventToInteractionEvent({
        comment_id: 'qq-source',
        platform: 'webhook',
        source: 'qq',
      }),
    ).toMatchObject({
      platform: 'qq',
      reference: {
        canonicalId: 'qq:qq-source',
      },
    });

    expect(
      normalizeCommentEventToInteractionEvent({
        comment_id: 'unknown-source',
        platform: '   ',
        source: '' as never,
      }),
    ).toMatchObject({
      platform: 'unknown',
      reference: {
        canonicalId: 'unknown:unknown-source',
      },
    });
  });

  it('round-trips interaction events through collector comment events', () => {
    const interaction: InteractionEvent = {
      platform: ' QQ ',
      ingressSource: 'qq',
      traceId: 'trace-round-trip',
      actor: { platformUserId: 'operator-1' },
      reference: {
        subjectKind: 'comment',
        externalId: 'fallback-comment',
        canonicalId: 'qq:fallback-comment',
        containerId: 'fallback-video',
        parentExternalId: 'fallback-parent',
      },
      content: { text: 'round trip' },
    };

    expect(normalizeInteractionEventToCommentEvent(interaction)).toEqual({
      comment_id: 'fallback-comment',
      video_id: 'fallback-video',
      user_id: 'operator-1',
      content: 'round trip',
      parent_id: 'fallback-parent',
      platform: 'qq',
      source: 'qq',
      trace_id: 'trace-round-trip',
    });
  });
});

describe('observability coverage branches', () => {
  it('generates trace ids and preserves trimmed caller-provided trace ids', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    expect(ensureTraceId(' trace-1 ')).toBe('trace-1');
    expect(ensureTraceId()).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('records observability events with null fallbacks and survives persistence errors', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockPrisma.observabilityEvent.create.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('db_down'));

    await recordObservabilityEvent({
      event_type: 'decision',
      trace_id: 'trace-obs-1',
    });
    await recordObservabilityEvent({
      event_type: 'publish',
      trace_id: 'trace-obs-2',
      comment_id: '',
      job_id: '',
      status: '',
      duration_ms: 0,
      metadata: undefined,
    });

    expect(mockPrisma.observabilityEvent.create).toHaveBeenNthCalledWith(1, {
      data: {
        event_type: 'decision',
        trace_id: 'trace-obs-1',
        comment_id: null,
        job_id: null,
        status: null,
        duration_ms: null,
        event_metadata: '{}',
      },
    });
    expect(mockPrisma.observabilityEvent.create).toHaveBeenNthCalledWith(2, {
      data: {
        event_type: 'publish',
        trace_id: 'trace-obs-2',
        comment_id: '',
        job_id: '',
        status: '',
        duration_ms: 0,
        event_metadata: '{}',
      },
    });
    expect(logSpy).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalledWith('[observability] Failed to persist event:', expect.any(Error));
  });

  it('builds log context with optional fields and passthrough extras', () => {
    expect(
      JSON.parse(
        buildLogContext({
          trace_id: 'trace-log',
          comment_id: 'comment-1',
          job_id: 12,
          status: 'failed',
          error_type: 'publish_error',
          error_message: 'publish failed',
          platform: 'bilibili',
        }),
      ),
    ).toEqual({
      trace_id: 'trace-log',
      comment_id: 'comment-1',
      job_id: 12,
      status: 'failed',
      error_type: 'publish_error',
      error_message: 'publish failed',
      platform: 'bilibili',
    });

    expect(JSON.parse(buildLogContext({ trace_id: 'trace-only' } as never))).toEqual({
      trace_id: 'trace-only',
    });
  });
});

describe('safetyCheck coverage branches', () => {
  it('covers safety helper disabled-rule and invalid-config branches directly', () => {
    process.env.SAFETY_SENSITIVITY_LEVEL = 'invalid';

    const config = __safetyTesting.loadSafetyConfig();
    expect(config.sensitivityLevel).toBe('medium');
    expect(__safetyTesting.checkProfanity('fuck', { ...config, enableProfanityCheck: false })).toBe(0);
    expect(__safetyTesting.checkSpam('AAAAAAAAAAAA!!!!!!', { ...config, enableSpamCheck: false })).toBe(0);
    expect(__safetyTesting.checkSpam('AAAAAAAAAAAA!!!!!!', { ...config, enableRepetitionCheck: false })).toBe(0);
    expect(__safetyTesting.checkUrls('https://example.test', { ...config, enableUrlCheck: false })).toBe(0);
    expect(__safetyTesting.checkUrls('plain text', config)).toBe(0);
    expect(__safetyTesting.checkKeywordBlacklist('blocked')).toEqual({ blocked: false, words: [] });

    process.env.SAFETY_ENABLE_KEYWORD_BLACKLIST = 'false';
    process.env.SAFETY_ENABLE_PII_DETECTION = 'false';
    expect(__safetyTesting.checkPii('mail test@example.com')).toEqual({ detected: false, matches: [] });
  });

  it('blocks custom keyword blacklist matches before later rules', async () => {
    process.env.SAFETY_KEYWORD_BLACKLIST = 'blocked, other';

    const [safe, flags] = await safetyCheck('this contains blocked content');

    expect(safe).toBe(false);
    expect(flags).toMatchObject({
      decision: 'blocked',
      reason: 'contains_blocked_words',
      blocked_words: ['blocked'],
      triggered_rules: ['keyword_blacklist'],
    });
  });

  it('deduplicates PII matches and honors blocked PII action', async () => {
    process.env.SAFETY_ENABLE_KEYWORD_BLACKLIST = 'false';
    process.env.SAFETY_PII_ACTION = 'blocked';

    const [safe, flags] = await safetyCheck('mail test@example.com then test@example.com');

    expect(safe).toBe(false);
    expect(flags.decision).toBe('blocked');
    expect(flags.reason).toBe('contains_pii');
    expect(flags.triggered_rules).toEqual(['pii_detection']);
    expect(flags.pii_matches).toEqual([{ type: 'email', value: 'test@example.com' }]);
  });

  it('queues PII for manual review by default', async () => {
    process.env.SAFETY_ENABLE_KEYWORD_BLACKLIST = 'false';

    const [safe, flags] = await safetyCheck('mail manual@example.com');

    expect(safe).toBe(false);
    expect(flags).toMatchObject({
      decision: 'manual_queue',
      reason: 'contains_pii',
      triggered_rules: ['pii_detection'],
      pii_matches: [{ type: 'email', value: 'manual@example.com' }],
    });
  });

  it('blocks replies over configured max length and falls back for invalid max length', async () => {
    process.env.SAFETY_ENABLE_KEYWORD_BLACKLIST = 'false';
    process.env.SAFETY_ENABLE_PII_DETECTION = 'false';
    process.env.SAFETY_MAX_REPLY_CHARS = '5';

    const [safe, flags] = await safetyCheck('123456');

    expect(safe).toBe(false);
    expect(flags).toMatchObject({
      decision: 'blocked',
      reason: 'too_long',
      max_length: 5,
      actual_length: 6,
      triggered_rules: ['length_limit'],
    });

    process.env.SAFETY_MAX_REPLY_CHARS = 'invalid';
    const [, fallbackFlags] = await safetyCheck('short');
    expect(fallbackFlags.max_length).toBe(900);
  });

  it('scores categorized spam and url content with sensitivity thresholds', async () => {
    process.env.SAFETY_ENABLE_KEYWORD_BLACKLIST = 'false';
    process.env.SAFETY_ENABLE_PII_DETECTION = 'false';
    process.env.SAFETY_SENSITIVITY_LEVEL = 'low';

    const [lowSafe, lowFlags] = await safetyCheck('sex https://example.test AAAAAAAAAAAA!!!!!!');

    expect(lowSafe).toBe(false);
    expect(lowFlags.decision).toBe('manual_review');
    expect(lowFlags.reason).toBe('medium_risk_content');
    expect(lowFlags.sensitivity_level).toBe('low');
    expect(lowFlags.detected_categories).toEqual([{ category: 'adult', score: 0.9 }]);
    expect(lowFlags.spam_detected).toBe(true);
    expect(lowFlags.urls_detected).toBe(true);

    process.env.SAFETY_SENSITIVITY_LEVEL = 'high';
    const [highSafe, highFlags] = await safetyCheck('sex porn');

    expect(highSafe).toBe(false);
    expect(highFlags.decision).toBe('blocked');
    expect(highFlags.reason).toBe('high_risk_content');
    expect(highFlags.sensitivity_level).toBe('high');
  });

  it('allows clean content and flags profanity when scoring stays below the block threshold', async () => {
    process.env.SAFETY_ENABLE_KEYWORD_BLACKLIST = 'false';
    process.env.SAFETY_ENABLE_PII_DETECTION = 'false';

    const [cleanSafe, cleanFlags] = await safetyCheck('plain friendly comment');
    expect(cleanSafe).toBe(true);
    expect(cleanFlags.decision).toBe('allow');
    expect(cleanFlags.risk_score).toBe(0);

    const [profaneSafe, profaneFlags] = await safetyCheck('fuck sex');
    expect(profaneSafe).toBe(false);
    expect(profaneFlags).toMatchObject({
      decision: 'manual_review',
      reason: 'medium_risk_content',
      profanity_detected: true,
    });
  });
});

describe('generateWithLLM coverage branches', () => {
  it('covers llm config defaults, direct parser fallbacks, and unknown provider call errors', async () => {
    process.env.LLM_RETRIES = '';

    process.env.LLM_PROVIDER = 'openai';
    process.env.LLM_MODEL = '';
    process.env.LLM_BASE_URL = '';
    expect(__llmClientTesting.loadLLMConfig()).toMatchObject({
      provider: 'openai',
      model: 'gpt-4',
      baseUrl: 'https://api.openai.com/v1',
    });

    process.env.LLM_PROVIDER = 'claude';
    process.env.LLM_MODEL = '';
    expect(__llmClientTesting.loadLLMConfig()).toMatchObject({
      provider: 'claude',
      model: 'claude-sonnet-4-6',
      baseUrl: 'https://api.anthropic.com',
    });

    process.env.LLM_PROVIDER = 'ollama';
    process.env.LLM_MODEL = '';
    expect(__llmClientTesting.loadLLMConfig()).toMatchObject({
      provider: 'ollama',
      model: 'llama3.1/latest',
      baseUrl: 'http://localhost:11434',
    });

    await expect(
      __llmClientTesting.callLLM([], {
        provider: 'unknown',
        apiKey: '',
        model: 'unknown-model',
        baseUrl: 'https://llm.example',
        temperature: 0,
        maxTokens: 1,
        timeoutMs: 1,
        retries: 1,
      } as never),
    ).rejects.toThrow('LLM error: Unknown provider: unknown');

    expect(
      __llmClientTesting.parseLLMResponse(
        {
          content: [{ type: 'image', text: 'ignored' }],
        },
        {
          provider: 'claude',
          apiKey: '',
          model: 'claude-test',
          baseUrl: '',
          temperature: 0,
          maxTokens: 1,
          timeoutMs: 1,
          retries: 1,
        },
      ),
    ).toMatchObject({ content: '' });
  });

  it('sends OpenAI-compatible chat requests and trims provider output', async () => {
    process.env.LLM_PROVIDER = 'openai';
    process.env.LLM_API_KEY = 'openai-key';
    process.env.LLM_MODEL = 'gpt-test';
    process.env.LLM_BASE_URL = 'https://llm.example/v1';
    process.env.LLM_TEMPERATURE = '0.2';
    process.env.LLM_MAX_TOKENS = '42';
    process.env.LLM_TIMEOUT = '1000';
    process.env.LLM_RETRIES = '1';

    const fetchMock = vi.fn(async () => jsonResponse({ choices: [{ message: { content: '  provider reply  ' } }] }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateWithLLM({
      systemPrompt: 'system prompt',
      userComment: 'comment body',
      knowledgeContext: 'knowledge',
      searchContext: 'search',
      roleProfile: 'doro',
      roleCardPrompt: 'role card',
      lengthMode: 'long',
    });

    expect(result).toEqual({
      reply_text: 'provider reply',
      provider: 'openai',
      used_fallback: false,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://llm.example/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer openai-key',
        }),
      }),
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toMatchObject({
      model: 'gpt-test',
      temperature: 0.2,
      max_tokens: 42,
    });
    expect(body.messages.map((message: { content: string }) => message.content).join('\n')).toContain('role card');
  });

  it('parses Claude text blocks and maps system prompts to user messages', async () => {
    process.env.LLM_PROVIDER = 'claude';
    process.env.LLM_API_KEY = 'claude-key';
    process.env.LLM_MODEL = 'claude-test';
    process.env.LLM_TIMEOUT = '1000';
    process.env.LLM_RETRIES = '1';

    const fetchMock = vi.fn(async () =>
      jsonResponse({
        content: [
          { type: 'text', text: 'hello ' },
          { type: 'image', text: 'ignored' },
          { type: 'text', text: 'world' },
        ],
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateWithLLM({
      systemPrompt: 'system',
      userComment: 'comment',
      knowledgeContext: '',
      searchContext: '',
      roleProfile: 'doro',
      lengthMode: 'short',
    });

    expect(result.reply_text).toBe('hello world');
    expect(result.provider).toBe('claude');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-api-key': 'claude-key',
          'anthropic-version': '2023-06-01',
        }),
      }),
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.messages[0]).toMatchObject({ role: 'user', content: 'system' });
  });

  it('parses Ollama message responses and falls back on provider failures', async () => {
    process.env.LLM_PROVIDER = 'ollama';
    process.env.LLM_BASE_URL = 'http://ollama.test';
    process.env.LLM_MODEL = 'llama-test';
    process.env.LLM_TIMEOUT = '1000';
    process.env.LLM_RETRIES = '1';

    const fetchMock = vi.fn(async () => jsonResponse({ message: { content: 'ollama reply' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      generateWithLLM({
        systemPrompt: '',
        userComment: 'comment',
        knowledgeContext: '',
        searchContext: '',
        roleProfile: 'doro',
        lengthMode: 'medium',
      }),
    ).resolves.toMatchObject({
      reply_text: 'ollama reply',
      provider: 'ollama',
      used_fallback: false,
    });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fetchMock.mockRejectedValueOnce(new Error('network_down'));

    const fallback = await generateWithLLM({
      systemPrompt: '',
      userComment: 'comment',
      knowledgeContext: '',
      searchContext: '',
      roleProfile: 'doro',
      lengthMode: 'medium',
    });

    expect(fallback.provider).toBe('fallback');
    expect(fallback.used_fallback).toBe(true);
    expect(fallback.reply_text.length).toBeGreaterThan(0);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('uses default OpenAI settings and parses raw provider payloads', async () => {
    process.env.LLM_RETRIES = '1';

    const fetchMock = vi.fn(async () => jsonResponse('raw provider text'));
    vi.stubGlobal('fetch', fetchMock);

    const result = await generateWithLLM({
      systemPrompt: '',
      userComment: 'comment',
      knowledgeContext: '',
      searchContext: '',
      roleProfile: 'doro',
      lengthMode: 'medium',
    });

    expect(result).toEqual({
      reply_text: 'raw provider text',
      provider: 'openai',
      used_fallback: false,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer ',
        }),
      }),
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toMatchObject({
      model: 'gpt-4',
      temperature: 0.7,
      max_tokens: 150,
    });
  });

  it('parses empty and object provider payload fallbacks', async () => {
    process.env.LLM_RETRIES = '1';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ choices: [{}] }))
      .mockResolvedValueOnce(jsonResponse({ unexpected: true }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      generateWithLLM({
        systemPrompt: '',
        userComment: 'comment',
        knowledgeContext: '',
        searchContext: '',
        roleProfile: 'doro',
        lengthMode: 'medium',
      }),
    ).resolves.toEqual({
      reply_text: '',
      provider: 'openai',
      used_fallback: false,
    });

    await expect(
      generateWithLLM({
        systemPrompt: '',
        userComment: 'comment',
        knowledgeContext: '',
        searchContext: '',
        roleProfile: 'doro',
        lengthMode: 'medium',
      }),
    ).resolves.toEqual({
      reply_text: '[object Object]',
      provider: 'openai',
      used_fallback: false,
    });
  });

  it('falls back after API errors and retries transient provider failures', async () => {
    process.env.LLM_PROVIDER = 'openai';
    process.env.LLM_API_KEY = 'openai-key';
    process.env.LLM_TIMEOUT = '1000';
    process.env.LLM_RETRIES = '1';

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchMock = vi.fn(async () => jsonResponse({ detail: 'bad request' }, false, 400, 'Bad Request'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      generateWithLLM({
        systemPrompt: '',
        userComment: 'comment',
        knowledgeContext: '',
        searchContext: '',
        roleProfile: 'doro',
        lengthMode: 'medium',
      }),
    ).resolves.toMatchObject({
      provider: 'fallback',
      used_fallback: true,
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[LLM] Primary provider failed, using fallback:',
      expect.objectContaining({ message: expect.stringContaining('LLM API error: 400 Bad Request') }),
    );

    vi.useFakeTimers();
    process.env.LLM_RETRIES = '2';
    const retryLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    fetchMock
      .mockRejectedValueOnce(new Error('temporary network down'))
      .mockResolvedValueOnce(jsonResponse({ choices: [{ message: { content: 'retry success' } }] }));

    const pending = generateWithLLM({
      systemPrompt: '',
      userComment: 'comment',
      knowledgeContext: '',
      searchContext: '',
      roleProfile: 'doro',
      lengthMode: 'medium',
    });
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toEqual({
      reply_text: 'retry success',
      provider: 'openai',
      used_fallback: false,
    });
    expect(retryLogSpy).toHaveBeenCalledWith('[LLM] Retry 1/2 after 1000ms');
  });

  it('wraps non-Error provider failures before using the fallback reply', async () => {
    process.env.LLM_RETRIES = '1';
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchMock = vi.fn().mockRejectedValue('plain failure');
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    await expect(
      generateWithLLM({
        systemPrompt: '',
        userComment: 'comment',
        knowledgeContext: '',
        searchContext: '',
        roleProfile: 'doro',
        lengthMode: 'medium',
      }),
    ).resolves.toMatchObject({
      provider: 'fallback',
      used_fallback: true,
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[LLM] Primary provider failed, using fallback:',
      expect.objectContaining({ message: expect.stringContaining('plain failure') }),
    );
  });

  it('falls back when the provider request is aborted by timeout', async () => {
    vi.useFakeTimers();
    process.env.LLM_PROVIDER = 'openai';
    process.env.LLM_API_KEY = 'openai-key';
    process.env.LLM_TIMEOUT = '10';
    process.env.LLM_RETRIES = '1';

    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchMock = vi.fn(
      async (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('aborted', 'AbortError')),
            { once: true },
          );
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const pending = generateWithLLM({
      systemPrompt: '',
      userComment: 'comment',
      knowledgeContext: '',
      searchContext: '',
      roleProfile: 'doro',
      lengthMode: 'short',
    });
    await vi.advanceTimersByTimeAsync(10);

    await expect(pending).resolves.toMatchObject({
      provider: 'fallback',
      used_fallback: true,
    });
    expect(console.error).toHaveBeenCalledWith(
      '[LLM] Primary provider failed, using fallback:',
      expect.objectContaining({ message: expect.stringContaining('LLM timeout after 10ms') }),
    );
  });

  it('rejects unsupported providers before fallback execution', async () => {
    process.env.LLM_PROVIDER = 'unknown';

    await expect(
      generateWithLLM({
        systemPrompt: '',
        userComment: 'comment',
        knowledgeContext: '',
        searchContext: '',
        roleProfile: 'doro',
        lengthMode: 'medium',
      }),
    ).rejects.toThrow('Unsupported LLM_PROVIDER');
  });
});

describe('decider coverage branches', () => {
  it('maps legacy force-long inputs to interaction decisions', async () => {
    const result = await shouldReply({
      platform: ' BILIBILI ',
      comment_id: 'comment-1',
      video_id: 'video-1',
      user_id: 'user-1',
      content: 'hello',
      force_long: true,
      style_profile: 'gentle',
      role_profile: 'comfort',
      role_card_key: 'card-1',
    });

    expect(result).toEqual([true, 'gentle', 'long']);
    expect(mockPrisma.userState.findUnique).not.toHaveBeenCalled();
  });

  it('honors the global cooldown disable setting before database cooldown checks', async () => {
    process.env.REPLY_GLOBAL_COOLDOWN_ENABLED = 'false';

    expect(__deciderTesting.loadReplyRules().globalCooldownEnabled).toBe(false);
    await expect(
      shouldReplyForInteraction({
        interaction: buildInteraction('hello', 'user-1'),
        styleProfile: 'doro',
      }),
    ).resolves.toEqual([true, 'doro', 'medium']);
    expect(mockPrisma.userState.findUnique).not.toHaveBeenCalled();
  });

  it('fails open when user cooldown lookup throws', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-08T04:00:00.000Z'));
    vi.spyOn(Math, 'random').mockReturnValue(0);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockPrisma.userState.findUnique.mockRejectedValue(new Error('db_down'));

    const result = await shouldReplyForInteraction({
      interaction: buildInteraction('hello', 'user-1'),
      styleProfile: 'doro',
    });

    expect(result).toEqual([true, 'doro', 'medium']);
    expect(console.error).toHaveBeenCalled();
  });

  it('rejects users still in cooldown', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-08T04:00:00.000Z'));
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    mockPrisma.userState.findUnique.mockResolvedValue({
      cooldown_enabled: true,
      updated_at: new Date('2026-06-08T03:59:00.000Z'),
    });

    const result = await shouldReplyForInteraction({
      interaction: buildInteraction('hello', 'user-1'),
      styleProfile: 'doro',
    });

    expect(result).toEqual([false, 'doro', 'medium']);
    expect(mockPrisma.userState.findUnique).toHaveBeenCalledWith({ where: { user_id: 'user-1' } });
  });

  it('rejects invalid length and applies quiet-hour probability', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-08T16:00:00.000Z'));
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(Math, 'random').mockReturnValue(0.22);

    await expect(
      shouldReplyForInteraction({
        interaction: buildInteraction(''),
        styleProfile: 'doro',
      }),
    ).resolves.toEqual([false, 'doro', 'medium']);

    await expect(
      shouldReplyForInteraction({
        interaction: buildInteraction('hello'),
        styleProfile: 'doro',
      }),
    ).resolves.toEqual([false, 'doro', 'medium']);
  });

  it('returns long length mode for long accepted comments', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-08T04:00:00.000Z'));
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const result = await shouldReplyForInteraction({
      interaction: buildInteraction('x'.repeat(101)),
      styleProfile: 'custom-style',
    });

    expect(result).toEqual([true, 'custom-style', 'long']);
  });

  it('maps safety decisions to worker actions', () => {
    expect(decideSafetyAction(true, {})).toBe('ok');
    expect(decideSafetyAction(false, { decision: 'blocked' })).toBe('blocked');
    expect(decideSafetyAction(false, { decision: 'manual_review' })).toBe('manual_queue');
    expect(decideSafetyAction(false, { decision: 'unknown' })).toBe('manual_queue');
  });
});
