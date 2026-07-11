import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { postReplyMock, prismaMock, getActivePersonaNameMock } = vi.hoisted(() => ({
  postReplyMock: vi.fn(),
  prismaMock: {
    publishLog: {
      findFirst: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
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

const { applyBackoff, __resetBackoffMapForTest } = await import('../src/services/backoff-decision.js');

const trackedEnvKeys = [
  'PUBLISHER_MODE',
  'PUBLISHER_WEBHOOK_URL',
  'PUBLISHER_WEBHOOK_TOKEN',
  'PUBLISHER_TIMEOUT_SECONDS',
  'PUBLISHER_CIRCUIT_BREAKER_ENABLED',
  'PUBLISHER_CIRCUIT_FAILURE_THRESHOLD',
  'PUBLISHER_CIRCUIT_OPEN_SECONDS',
  'ANTIRISK_BACKOFF_ENABLED',
  'ANTIRISK_BACKOFF_CAP_RATE_LIMIT',
  'ANTIRISK_BACKOFF_CAP_BEHAVIOR_ANOMALY',
  'STAGE_GATE_ENABLED',
  'STAGE_REAL_PUBLISH_READY',
  'STAGE_DAILY_QUOTA',
  'PUBLISHER_SIMULATED_RESPONSES',
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
  prismaMock.publishLog.count.mockReset();
  prismaMock.observabilityEvent.create.mockReset();
  postReplyMock.mockReset();
  prismaMock.publishLog.findFirst.mockResolvedValue(null);
  prismaMock.publishLog.create.mockResolvedValue({ id: 1 });
  prismaMock.publishLog.count.mockResolvedValue(0);
  prismaMock.observabilityEvent.create.mockResolvedValue({ id: 1 });
  getActivePersonaNameMock.mockResolvedValue(null);
  __resetBackoffMapForTest();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  clearPublisherEnv();
  __resetBackoffMapForTest();
});

describe('publisher mode coverage', () => {
  it('simulated stage injects mock -352 via PUBLISHER_SIMULATED_RESPONSES → classifyAntiriskSubclass → backoff_applied (L7 end-to-end)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    process.env.PUBLISHER_MODE = 'simulated';
    process.env.PUBLISHER_SIMULATED_RESPONSES = 'error_code:-352,v_voucher:mock_v';
    // Two resolveActivePersonaId calls: entry (backoff intercept) + catch path.
    getActivePersonaNameMock.mockResolvedValue('simulated-persona');
    // postReply (mocked at module scope) returns the -352 result that the real
    // postReply short-circuit would yield for the injected mockPostReplyResult.
    postReplyMock.mockResolvedValueOnce({
      success: false,
      rpid: '',
      error_code: -352,
      v_voucher: 'mock_v',
    });

    const result = await publishIntentWithResult(buildIntent());

    // Chain: publishSimulated parses env → postReply(mockConfig) → result.error_code=-352
    //   → throw → publishIntentWithResult catch → classifyAntiriskSubclass='behavior_anomaly'
    //   → applyBackoff(persona_id,'behavior_anomaly') → backoff_applied (cap 600s)
    //   → recordAntiriskSignal antirisk_signal_detected → tuple [false,'rate_limited',...].
    expect(result.slice(0, 2)).toEqual([false, 'rate_limited']);

    expect(postReplyMock).toHaveBeenCalledWith(
      'comment-1',
      'reply text',
      expect.objectContaining({
        mockPostReplyResult: expect.objectContaining({
          error_code: -352,
          v_voucher: 'mock_v',
        }),
      }),
    );

    expect(prismaMock.observabilityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          event_type: 'backoff_applied',
          error_subclass: 'behavior_anomaly',
          persona_id: 'simulated-persona',
          event_metadata: JSON.stringify({ cap_seconds: 600 }),
        }),
      }),
    );
    expect(prismaMock.observabilityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          event_type: 'antirisk_signal_detected',
          error_subclass: 'behavior_anomaly',
        }),
      }),
    );
  });

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
    // F1 (review-odyssey 003): webhook catch now normalizes via normalizeFailureReason
    // (raw error.message no longer persisted). 'network_down' → network_error.
    expect(thrownResult.slice(0, 2)).toEqual([false, 'network_error']);
    expect(prismaMock.publishLog.create).not.toHaveBeenCalled();
  });

  it('normalizes non-Error webhook failures', async () => {
    process.env.PUBLISHER_MODE = 'webhook';
    process.env.PUBLISHER_WEBHOOK_URL = 'https://publisher.example/hook';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('plain webhook failure'));

    const result = await publishIntentWithResult(buildIntent());

    // F1: non-Error reject value → normalizeFailureReason returns 'publish_failed' (enum),
    // raw string no longer persisted to durable columns.
    expect(result.slice(0, 2)).toEqual([false, 'publish_failed']);
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

  it('end-to-end mock -352 chain: postReply v_voucher → classify → backoff_applied ObservabilityEvent (TASK-007)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    process.env.PUBLISHER_MODE = 'real_publish';
    // Two resolveActivePersonaId calls: entry (backoff intercept) + catch path.
    getActivePersonaNameMock.mockResolvedValue('bili-active-persona');
    // Mock fetch returns the -352 risk body with v_voucher — this is the eval-harness
    // injection point (no real Bilibili API call, convergence criterion 6).
    postReplyMock.mockResolvedValueOnce({
      success: false,
      rpid: '',
      error_code: -352,
      v_voucher: 'voucher_xxx',
    });

    const result = await publishIntentWithResult(buildIntent());

    // Chain: postReply {success:false,error_code:-352,v_voucher:'voucher_xxx'}
    //   → publishReal !success throw → publishIntentWithResult catch
    //   → classifyAntiriskSubclass → 'behavior_anomaly' (cap 600s)
    //   → applyBackoff(persona_id,'behavior_anomaly') → backoff_applied ObservabilityEvent
    //   → recordAntiriskSignal antirisk_signal_detected → tuple [false,'rate_limited',...].
    expect(result.slice(0, 2)).toEqual([false, 'rate_limited']);

    // backoff_applied ObservabilityEvent row written with the full antirisk attribution.
    expect(prismaMock.observabilityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          event_type: 'backoff_applied',
          error_subclass: 'behavior_anomaly',
          persona_id: 'bili-active-persona',
          event_metadata: JSON.stringify({ cap_seconds: 600 }),
        }),
      }),
    );
    // antirisk_signal_detected still recorded (TASK-001 path preserved).
    expect(prismaMock.observabilityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          event_type: 'antirisk_signal_detected',
          error_subclass: 'behavior_anomaly',
        }),
      }),
    );
  });

  it('surfaces -352 behavior_anomaly from postReply to the antirisk signal path', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    process.env.PUBLISHER_MODE = 'real_publish';
    // Two resolveActivePersonaId calls: entry (backoff intercept) + catch path.
    getActivePersonaNameMock.mockResolvedValue('bili-active-persona');
    postReplyMock.mockResolvedValueOnce({
      success: false,
      rpid: '',
      error_code: -352,
      v_voucher: 'voucher-xyz',
    });

    const result = await publishIntentWithResult(buildIntent());

    expect(result.slice(0, 2)).toEqual([false, 'rate_limited']);
    // backoff_applied is recorded first (TASK-004 applyBackoff, cap 600s behavior_anomaly).
    expect(prismaMock.observabilityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          event_type: 'backoff_applied',
          error_subclass: 'behavior_anomaly',
          persona_id: 'bili-active-persona',
        }),
      }),
    );
    // antirisk_signal_detected still recorded (TASK-001 path preserved).
    expect(prismaMock.observabilityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          event_type: 'antirisk_signal_detected',
          error_subclass: 'behavior_anomaly',
          persona_id: 'bili-active-persona',
        }),
      }),
    );
    expect(getActivePersonaNameMock).toHaveBeenCalledTimes(2);
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

  it('blocks publishIntent with [false, "backoff_active", ...] when the persona is in backoff (no throw, L7)', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    process.env.PUBLISHER_MODE = 'simulated';
    process.env.ANTIRISK_BACKOFF_CAP_RATE_LIMIT = '300';
    getActivePersonaNameMock.mockResolvedValue('persona-in-backoff');

    // Put the persona into backoff via applyBackoff (rate_limit, cap 300s).
    await applyBackoff('persona-in-backoff', 'rate_limit', 'trace-backoff-seed');

    const result = await publishIntentWithResult(buildIntent());

    // Tuple contract — no throw (L7). The publish never reaches the mode handler.
    expect(result[0]).toBe(false);
    expect(result[1]).toBe('backoff_active');
    expect(result[2]).toBeInstanceOf(Date);
    expect(result[3]).toBeNull();
    // The mode handler (publishSimulated) must NOT have been reached, so no publish log.
    expect(prismaMock.publishLog.create).not.toHaveBeenCalled();
  });

  it('does not block when ANTIRISK_BACKOFF_ENABLED is off (L8 rollback)', async () => {
    process.env.PUBLISHER_MODE = 'simulated';
    process.env.ANTIRISK_BACKOFF_ENABLED = 'false';
    process.env.ANTIRISK_BACKOFF_CAP_RATE_LIMIT = '300';
    getActivePersonaNameMock.mockResolvedValue('persona-rollback');

    await applyBackoff('persona-rollback', 'rate_limit', 'trace-rollback-seed');

    const result = await publishIntentWithResult(buildIntent());

    // Flag off → backoff intercept bypassed, publish proceeds to simulated mode.
    expect(result.slice(0, 2)).toEqual([true, 'simulated']);
  });

  it('dry_run mode skips publish_log, postReply, and enqueue (L1 stage 0)', async () => {
    process.env.PUBLISHER_MODE = 'dry_run';

    const result = await publishIntentWithResult(buildIntent());

    // dry_run: stage 0 — pure observation, no side effects.
    expect(result.slice(0, 2)).toEqual([true, 'dry_run_skipped']);
    expect(result[2]).toBeInstanceOf(Date);
    expect(result[3]).toBeNull();
    // MUST NOT write publish_log, MUST NOT call postReply.
    expect(prismaMock.publishLog.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.publishLog.create).not.toHaveBeenCalled();
    expect(postReplyMock).not.toHaveBeenCalled();
  });

  it('real_publish stage gate blocks with [false, "stage_gate_blocked", ...] when not ready (L1/SC4 fail-closed)', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    process.env.PUBLISHER_MODE = 'real_publish';
    process.env.STAGE_GATE_ENABLED = 'true';
    // STAGE_REAL_PUBLISH_READY unset → isStageRealPublishReady() false → fail-closed.
    getActivePersonaNameMock.mockResolvedValue('persona-stage-gate');

    const result = await publishIntentWithResult(buildIntent());

    // SC4 barrier: not ready → stage_gate_blocked, no blind real_publish.
    expect(result[0]).toBe(false);
    expect(result[1]).toBe('stage_gate_blocked');
    expect(result[2]).toBeInstanceOf(Date);
    expect(result[3]).toBeNull();
    expect(postReplyMock).not.toHaveBeenCalled();
    expect(prismaMock.publishLog.create).not.toHaveBeenCalled();
  });

  it('real_publish stage quota exceeds returns [false, "stage_quota_exceeded", ...] (L1 limited/full 区分)', async () => {
    process.env.PUBLISHER_MODE = 'real_publish';
    process.env.STAGE_GATE_ENABLED = 'true';
    process.env.STAGE_REAL_PUBLISH_READY = 'true';
    process.env.STAGE_DAILY_QUOTA = '2';
    getActivePersonaNameMock.mockResolvedValue('persona-quota');
    // Today's published count already at quota.
    prismaMock.publishLog.count.mockResolvedValue(2);

    const result = await publishIntentWithResult(buildIntent());

    expect(result[0]).toBe(false);
    expect(result[1]).toBe('stage_quota_exceeded');
    expect(result[2]).toBeInstanceOf(Date);
    expect(result[3]).toBeNull();
    expect(postReplyMock).not.toHaveBeenCalled();
  });
});
