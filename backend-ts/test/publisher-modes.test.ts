import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { postReplyMock, prismaMock, getActivePersonaNameMock } = vi.hoisted(() => ({
  postReplyMock: vi.fn(),
  prismaMock: {
    publishLog: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    observabilityEvent: {
      create: vi.fn(),
    },
  },
  getActivePersonaNameMock: vi.fn(),
}));

vi.mock('../src/services/db-queries.js', () => ({
  prisma: () => prismaMock,
}));

vi.mock('../src/services/bilibili-client.js', () => ({
  postReply: postReplyMock,
}));

vi.mock('../src/services/bilibili-runtime-config.js', () => ({
  getActivePersonaName: getActivePersonaNameMock,
}));

const { publishIntentWithResult, publishReplyWithResult } = await import('../src/services/publisher.js');

const trackedEnvKeys = [
  'PUBLISHER_MODE',
  'PUBLISHER_WEBHOOK_URL',
  'PUBLISHER_WEBHOOK_TOKEN',
  'PUBLISHER_TIMEOUT_SECONDS',
  'PUBLISHER_CIRCUIT_BREAKER_ENABLED',
  'PUBLISHER_CIRCUIT_FAILURE_THRESHOLD',
  'PUBLISHER_CIRCUIT_OPEN_SECONDS',
] as const;

function clearPublisherEnv(): void {
  for (const key of trackedEnvKeys) {
    delete process.env[key];
  }
}

function buildIntent(overrides: Record<string, unknown> = {}) {
  return {
    traceId: 'trace-publisher-modes-1',
    source: 'publisher-mode-test',
    target: {
      platform: 'bilibili',
      targetKind: 'comment-reply' as const,
      externalId: 'comment-1',
      canonicalId: 'bilibili:comment-1',
    },
    payload: {
      text: ' reply text ',
    },
    ...overrides,
  };
}

beforeEach(() => {
  clearPublisherEnv();
  process.env.PUBLISHER_CIRCUIT_BREAKER_ENABLED = 'false';
  prismaMock.publishLog.findFirst.mockReset();
  prismaMock.publishLog.create.mockReset();
  prismaMock.observabilityEvent.create.mockReset();
  postReplyMock.mockReset();
  prismaMock.publishLog.findFirst.mockResolvedValue(null);
  prismaMock.publishLog.create.mockResolvedValue({ id: 1 });
  prismaMock.observabilityEvent.create.mockResolvedValue({ id: 1 });
  getActivePersonaNameMock.mockResolvedValue(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  clearPublisherEnv();
});

describe('publisher mode coverage', () => {
  it('publishes simulated replies and falls back invalid modes to manual queue', async () => {
    process.env.PUBLISHER_MODE = 'simulated';

    const simulated = await publishIntentWithResult(
      buildIntent({
        source: '   ',
        target: {
          platform: '   ',
          targetKind: 'comment-reply' as const,
          externalId: 'comment-simulated',
          canonicalId: 'unknown:comment-simulated',
        },
      }),
    );

    expect(simulated[0]).toBe(true);
    expect(simulated[1]).toBe('simulated');
    expect(prismaMock.publishLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          platform: 'unknown',
          comment_id: 'comment-simulated',
          source: 'simulated',
          status: 'published',
          failure_reason: null,
        }),
      }),
    );

    process.env.PUBLISHER_MODE = 'not-a-mode';
    prismaMock.publishLog.create.mockClear();

    const manualFallback = await publishIntentWithResult(buildIntent());

    expect(manualFallback[0]).toBe(true);
    expect(manualFallback[1]).toBe('manual_queued');
    expect(prismaMock.publishLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: 'publisher-mode-test',
          status: 'pending_review',
        }),
      }),
    );
  });

  it('publishes through a webhook with bearer auth and response metadata', async () => {
    process.env.PUBLISHER_MODE = 'webhook';
    process.env.PUBLISHER_WEBHOOK_URL = 'https://publisher.example/hook';
    process.env.PUBLISHER_WEBHOOK_TOKEN = 'webhook-token';
    process.env.PUBLISHER_TIMEOUT_SECONDS = '2';
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ queued: true }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await publishIntentWithResult(buildIntent());

    expect(result[0]).toBe(true);
    expect(result[1]).toBe('webhook_published');
    expect(result[3]).toEqual({ webhook_response: { queued: true } });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://publisher.example/hook',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer webhook-token',
        },
        body: JSON.stringify({ comment_id: 'comment-1', reply_text: 'reply text' }),
      }),
    );
  });

  it('publishes through a webhook without bearer auth when no token is configured', async () => {
    process.env.PUBLISHER_MODE = 'webhook';
    process.env.PUBLISHER_WEBHOOK_URL = 'https://publisher.example/hook';
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await publishIntentWithResult(buildIntent());

    expect(result.slice(0, 2)).toEqual([true, 'webhook_published']);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://publisher.example/hook',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    );
  });

  it('skips duplicate replies and tolerates missing publish log schema during lookup and create', async () => {
    const publishedAt = new Date('2026-06-08T01:00:00.000Z');
    prismaMock.publishLog.findFirst.mockResolvedValueOnce({ id: 99, published_at: publishedAt });
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const duplicate = await publishIntentWithResult(buildIntent());

    expect(duplicate).toEqual([true, 'duplicate_reply', publishedAt, { rpid: '99' }]);

    prismaMock.publishLog.findFirst.mockRejectedValueOnce(new Error('no such table: main.publish_logs'));
    prismaMock.publishLog.create.mockRejectedValueOnce(new Error('no such column: reservation_key'));

    const manual = await publishIntentWithResult(
      buildIntent({
        target: {
          platform: 'bilibili',
          targetKind: 'comment-reply' as const,
          externalId: 'comment-missing-schema',
          canonicalId: 'bilibili:comment-missing-schema',
        },
      }),
    );

    expect(manual.slice(0, 2)).toEqual([true, 'manual_queued']);
  });

  it('returns webhook http and thrown errors without writing publish logs', async () => {
    process.env.PUBLISHER_MODE = 'webhook';
    process.env.PUBLISHER_WEBHOOK_URL = 'https://publisher.example/hook';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({}),
      })
      .mockRejectedValueOnce(new Error('network_down'));
    vi.stubGlobal('fetch', fetchMock);

    const httpResult = await publishIntentWithResult(buildIntent());
    const thrownResult = await publishIntentWithResult(
      buildIntent({
        target: {
          platform: 'bilibili',
          targetKind: 'comment-reply' as const,
          externalId: 'comment-2',
          canonicalId: 'bilibili:comment-2',
        },
      }),
    );

    expect(httpResult.slice(0, 2)).toEqual([false, 'webhook_http_503']);
    expect(thrownResult.slice(0, 2)).toEqual([false, 'webhook_error: network_down']);
    expect(prismaMock.publishLog.create).not.toHaveBeenCalled();
  });

  it('normalizes non-Error webhook failures', async () => {
    process.env.PUBLISHER_MODE = 'webhook';
    process.env.PUBLISHER_WEBHOOK_URL = 'https://publisher.example/hook';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('plain webhook failure'));

    const result = await publishIntentWithResult(buildIntent());

    expect(result.slice(0, 2)).toEqual([false, 'webhook_error: plain webhook failure']);
    expect(prismaMock.publishLog.create).not.toHaveBeenCalled();
  });

  it('publishes real Bilibili replies and records failed API publishes', async () => {
    process.env.PUBLISHER_MODE = 'real_publish';
    postReplyMock.mockResolvedValueOnce({ success: true, rpid: 'rpid-1' }).mockResolvedValueOnce({ success: false });

    const success = await publishIntentWithResult(buildIntent());
    const failure = await publishIntentWithResult(
      buildIntent({
        target: {
          platform: 'bilibili',
          targetKind: 'comment-reply' as const,
          externalId: 'comment-failed',
          canonicalId: 'bilibili:comment-failed',
        },
      }),
    );

    expect(success[0]).toBe(true);
    expect(success[1]).toBe('published');
    expect(success[3]).toEqual({ new_rpid: 'rpid-1' });
    expect(failure[0]).toBe(false);
    expect(failure[1]).toBe('publish_failed');
    expect(prismaMock.publishLog.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          comment_id: 'comment-failed',
          status: 'failed',
          failure_reason: 'publish_failed',
        }),
      }),
    );
  });

  it('maps unsupported targets and rate-limit failures through the catch path', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    prismaMock.publishLog.findFirst.mockRejectedValueOnce(new Error('rate limit exceeded'));

    await expect(
      publishIntentWithResult(
        buildIntent({
          target: {
            platform: 'bilibili',
            targetKind: 'direct-message',
            externalId: 'message-1',
            canonicalId: 'bilibili:message-1',
          },
        }),
      ),
    ).rejects.toThrow('unsupported_publish_target:direct-message');

    const rateLimited = await publishReplyWithResult('comment-rate', 'reply', 'trace-rate');

    expect(rateLimited.slice(0, 2)).toEqual([false, 'rate_limited']);
  });

  it('surfaces -352 behavior_anomaly from postReply to the antirisk signal path', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    process.env.PUBLISHER_MODE = 'real_publish';
    getActivePersonaNameMock.mockResolvedValueOnce('bili-active-persona');
    postReplyMock.mockResolvedValueOnce({
      success: false,
      rpid: '',
      error_code: -352,
      v_voucher: 'voucher-xyz',
    });

    const result = await publishIntentWithResult(buildIntent());

    expect(result.slice(0, 2)).toEqual([false, 'rate_limited']);
    expect(prismaMock.observabilityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          event_type: 'antirisk_signal_detected',
          error_subclass: 'behavior_anomaly',
          persona_id: 'bili-active-persona',
        }),
      }),
    );
    expect(getActivePersonaNameMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to persona_id=null when getActivePersonaName fails without breaking the tuple contract', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    process.env.PUBLISHER_MODE = 'real_publish';
    getActivePersonaNameMock.mockRejectedValueOnce(new Error('db unreachable'));
    postReplyMock.mockResolvedValueOnce({
      success: false,
      rpid: '',
      error_code: -352,
      v_voucher: 'voucher-fallback',
    });

    const result = await publishIntentWithResult(buildIntent());

    expect(result.slice(0, 2)).toEqual([false, 'rate_limited']);
    expect(prismaMock.observabilityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          error_subclass: 'behavior_anomaly',
          persona_id: null,
        }),
      }),
    );
  });

  it('reports publish failures and logs secondary persistence failures from the catch path', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    prismaMock.publishLog.findFirst.mockRejectedValueOnce('plain database failure');
    prismaMock.publishLog.create.mockRejectedValueOnce(new Error('record failed'));

    const result = await publishIntentWithResult(buildIntent());

    expect(result.slice(0, 2)).toEqual([false, 'publish_failed']);
    expect(errorSpy).toHaveBeenCalledWith(
      '[publisher] Failed to record publish log:',
      expect.objectContaining({ message: 'record failed' }),
    );
  });

  it('opens the circuit breaker after a failed publish when enabled', async () => {
    process.env.PUBLISHER_CIRCUIT_BREAKER_ENABLED = 'true';
    process.env.PUBLISHER_CIRCUIT_FAILURE_THRESHOLD = '1';
    process.env.PUBLISHER_CIRCUIT_OPEN_SECONDS = '30';
    process.env.PUBLISHER_MODE = 'webhook';
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const firstFailure = await publishIntentWithResult(buildIntent());
    const openCircuit = await publishIntentWithResult(
      buildIntent({
        target: {
          platform: 'bilibili',
          targetKind: 'comment-reply' as const,
          externalId: 'comment-circuit-open',
          canonicalId: 'bilibili:comment-circuit-open',
        },
      }),
    );

    expect(firstFailure.slice(0, 2)).toEqual([false, 'webhook_not_configured']);
    expect(openCircuit.slice(0, 2)).toEqual([false, 'circuit_breaker_open']);
  });

  it('uses default circuit breaker threshold and open duration when enabled', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2030-01-01T00:00:00.000Z'));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    process.env.PUBLISHER_CIRCUIT_BREAKER_ENABLED = 'false';
    process.env.PUBLISHER_MODE = 'simulated';
    await publishIntentWithResult(
      buildIntent({
        target: {
          platform: 'bilibili',
          targetKind: 'comment-reply' as const,
          externalId: 'comment-default-circuit-reset',
          canonicalId: 'bilibili:comment-default-circuit-reset',
        },
      }),
    );
    prismaMock.publishLog.create.mockClear();
    warnSpy.mockClear();

    process.env.PUBLISHER_CIRCUIT_BREAKER_ENABLED = 'true';
    process.env.PUBLISHER_MODE = 'webhook';

    await publishIntentWithResult(
      buildIntent({
        target: {
          platform: 'bilibili',
          targetKind: 'comment-reply' as const,
          externalId: 'comment-default-circuit-1',
          canonicalId: 'bilibili:comment-default-circuit-1',
        },
      }),
    );
    await publishIntentWithResult(
      buildIntent({
        target: {
          platform: 'bilibili',
          targetKind: 'comment-reply' as const,
          externalId: 'comment-default-circuit-2',
          canonicalId: 'bilibili:comment-default-circuit-2',
        },
      }),
    );
    const thirdFailure = await publishIntentWithResult(
      buildIntent({
        target: {
          platform: 'bilibili',
          targetKind: 'comment-reply' as const,
          externalId: 'comment-default-circuit-3',
          canonicalId: 'bilibili:comment-default-circuit-3',
        },
      }),
    );
    const openCircuit = await publishIntentWithResult(
      buildIntent({
        target: {
          platform: 'bilibili',
          targetKind: 'comment-reply' as const,
          externalId: 'comment-default-circuit-open',
          canonicalId: 'bilibili:comment-default-circuit-open',
        },
      }),
    );

    expect(thirdFailure.slice(0, 2)).toEqual([false, 'webhook_not_configured']);
    expect(openCircuit.slice(0, 2)).toEqual([false, 'circuit_breaker_open']);
    expect(warnSpy).toHaveBeenCalledWith(
      '[publisher] Circuit breaker OPEN for platform=bilibili for 30s after 3 failures',
    );
  });

  it('does not open the circuit breaker before the configured failure threshold and resets after success', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2030-01-01T00:00:31.000Z'));
    process.env.PUBLISHER_CIRCUIT_BREAKER_ENABLED = 'true';
    process.env.PUBLISHER_CIRCUIT_FAILURE_THRESHOLD = '99';
    process.env.PUBLISHER_CIRCUIT_OPEN_SECONDS = '30';
    process.env.PUBLISHER_MODE = 'webhook';
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const firstFailure = await publishIntentWithResult(buildIntent());
    expect(firstFailure.slice(0, 2)).toEqual([false, 'webhook_not_configured']);

    process.env.PUBLISHER_WEBHOOK_URL = 'https://publisher.example/hook';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ recovered: true }),
      })),
    );

    const success = await publishIntentWithResult(
      buildIntent({
        target: {
          platform: 'bilibili',
          targetKind: 'comment-reply' as const,
          externalId: 'comment-recovered',
          canonicalId: 'bilibili:comment-recovered',
        },
      }),
    );

    expect(success.slice(0, 2)).toEqual([true, 'webhook_published']);
    expect(console.warn).not.toHaveBeenCalled();
  });
});
