import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { postReplyMock, verifyReplyVisibleMock, loadBilibiliRuntimeConfigMock, prismaMock, getActivePersonaNameMock } = vi.hoisted(() => ({
  postReplyMock: vi.fn(),
  verifyReplyVisibleMock: vi.fn(),
  loadBilibiliRuntimeConfigMock: vi.fn(),
  prismaMock: {
    publishLog: {
      findFirst: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    observabilityEvent: {
      create: vi.fn(),
      // TASK-002/D1: the visibility probe's visible/probe_failed path records a normal
      // observability event via recordObservabilityEvent → pushToBuffer → background
      // createMany flush. Without a createMany mock, the flush throws and dropCount climbs,
      // which would flip isStageRealPublishReady() false (getObservabilityDropCount()!==0)
      // and break the stage_quota test. Stub createMany so the flush is a no-op.
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
  getActivePersonaNameMock: vi.fn(),
}));

vi.mock('../src/services/db-queries.js', () => ({
  prisma: () => prismaMock,
}));

vi.mock('../src/services/bilibili-client.js', () => ({
  postReply: postReplyMock,
  verifyReplyVisible: verifyReplyVisibleMock,
}));

vi.mock('../src/services/bilibili-runtime-config.js', () => ({
  getActivePersonaName: getActivePersonaNameMock,
  loadBilibiliRuntimeConfig: loadBilibiliRuntimeConfigMock,
}));

const { publishIntentWithResult, publishReplyWithResult, setStageReadyResolver, __resetStageReadyResolverForTest } = await import('../src/services/publisher.js');

const { applyBackoff, __resetBackoffMapForTest } = await import('../src/services/backoff-decision.js');

const { __resetObservabilityBufferForTest } = await import('../src/services/observability.js');

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
  'ANTIRISK_BACKOFF_CAP_SHADOWBAN',
  'STAGE_GATE_ENABLED',
  'STAGE_REAL_PUBLISH_READY',
  'STAGE_DAILY_QUOTA',
  'PUBLISHER_SIMULATED_RESPONSES',
  'ANTIRISK_C_RATE_LIMIT_ENABLED',
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
  verifyReplyVisibleMock.mockReset();
  loadBilibiliRuntimeConfigMock.mockReset();
  // TASK-002/D1 default probe path: a visible verdict so the legacy real_publish success
  // tests (which do not mock the probe) still get status='published'. Tests that exercise
  // the shadowbanned / probe_failed paths override this mock per-case.
  verifyReplyVisibleMock.mockResolvedValue({
    visible: true,
    status: 'visible',
    probe_method: 'sender_cookie',
  });
  loadBilibiliRuntimeConfigMock.mockResolvedValue({
    sessdata: 'sess',
    biliJct: 'jct',
    buvid: 'buv',
    buvid4: '',
    dedeuserid: '',
    baseUrl: 'https://api.bilibili.com',
    userAgent: 'TestAgent/1.0',
    timeout: 30000,
    retries: 3,
    source: 'database',
    credentialId: 1,
    credentialName: 'probe-persona',
  });
  prismaMock.publishLog.findFirst.mockResolvedValue(null);
  prismaMock.publishLog.create.mockResolvedValue({ id: 1 });
  prismaMock.publishLog.count.mockResolvedValue(0);
  prismaMock.observabilityEvent.create.mockResolvedValue({ id: 1 });
  prismaMock.observabilityEvent.createMany.mockResolvedValue({ count: 0 });
  getActivePersonaNameMock.mockResolvedValue(null);
  __resetBackoffMapForTest();
  __resetStageReadyResolverForTest();
  // TASK-002/D1: reset the observability buffer + dropCount so the visible/probe_failed
  // probe path's fire-and-forget recordObservabilityEvent does not leak dropCount across
  // cases (would otherwise flip isStageRealPublishReady false via getObservabilityDropCount).
  __resetObservabilityBufferForTest();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  clearPublisherEnv();
  __resetBackoffMapForTest();
  __resetStageReadyResolverForTest();
  __resetObservabilityBufferForTest();
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

    // F1 (review-odyssey 004, fix-completeness): HTTP 非 2xx 是 L7 tuple-return 失败路径,
    // MUST 走 normalize 收敛 (spec S-20260711-x96s)。503 → '5xx' (STANDARD enum, 可重试 channel failure),
    // 不再用非 enum 的 webhook_http_503。
    expect(httpResult.slice(0, 2)).toEqual([false, '5xx']);
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
    // TASK-002/D1: the visibility probe (default mock returns 'visible') enriches the
    // success tuple metadata with the visibility verdict without changing the 'published'
    // status — the publish is still considered successful when the reply is visible.
    expect(success[3]).toEqual({ new_rpid: 'rpid-1', visibility: 'visible' });
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

  it('classifies errno-family network errors as network_error (F2 review-odyssey 006)', async () => {
    // F2: normalizeFailureReason errno regex MUST cover EHOSTUNREACH/ENETUNREACH/EPIPE
    // (f74e00a 漏的同类 errno族, 误分类 publish_failed 会污染 real_publish throw 路径的
    // publish_log.failure_reason enum). 经 real_publish throw 路径触发 normalizeFailureReason。
    process.env.PUBLISHER_MODE = 'real_publish';
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    for (const errnoMessage of ['connect EHOSTUNREACH 1.2.3.4:443', 'connect ENETUNREACH', 'write EPIPE', 'getaddrinfo EAI_AGAIN', 'network ENETRESET']) {
      postReplyMock.mockRejectedValueOnce(new Error(errnoMessage));
      const result = await publishIntentWithResult(buildIntent());
      expect(result.slice(0, 2)).toEqual([false, 'network_error']);
    }
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

  it('records a shadowbanned verdict → applyBackoff(600s) + reply_visibility_check antirisk signal + tuple [false,"shadowbanned",...] (TASK-002/D1, C-002/C-004 fail-closed)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    process.env.PUBLISHER_MODE = 'real_publish';
    // probePersonaId resolves to the active persona; entry backoff check uses the same value.
    getActivePersonaNameMock.mockResolvedValue('shadowbanned-persona');
    postReplyMock.mockResolvedValueOnce({ success: true, rpid: 'rpid-shadow' });
    // Probe returns shadowbanned (both views absent) → fail-closed.
    verifyReplyVisibleMock.mockResolvedValueOnce({
      visible: false,
      status: 'shadowbanned',
      probe_method: 'seek_rpid',
      reason: 'rpid_absent_dual_view',
    });

    const result = await publishIntentWithResult(buildIntent());

    // Fail-closed tuple: the publish is not actually visible, so surface failure.
    expect(result[0]).toBe(false);
    expect(result[1]).toBe('shadowbanned');
    expect(result[2]).toBeInstanceOf(Date);
    expect(result[3]).toMatchObject({ new_rpid: 'rpid-shadow', visibility: 'shadowbanned' });

    // PublishLog reuses the existing `status` column for the shadowbanned verdict (zero
    // migration — no new ReplyVisibilityLog model, C-002/ZM-001), and failure_reason carries
    // the probe_method detail.
    expect(prismaMock.publishLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'shadowbanned',
          failure_reason: 'shadowbanned:seek_rpid',
        }),
      }),
    );

    // A-layer backoff applied (cap 600s, mirrors behavior_anomaly).
    expect(prismaMock.observabilityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          event_type: 'backoff_applied',
          error_subclass: 'shadowban',
          persona_id: 'shadowbanned-persona',
          event_metadata: JSON.stringify({ cap_seconds: 600 }),
        }),
      }),
    );
    // C-002 double-write: reply_visibility_check antirisk signal recorded with the
    // shadowbanned verdict.
    expect(prismaMock.observabilityEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          event_type: 'reply_visibility_check',
          error_subclass: 'shadowban',
          status: 'shadowbanned',
          persona_id: 'shadowbanned-persona',
        }),
      }),
    );

    // C-008: the probe consumed one token from the shared C-layer bucket (single deduction
    // per publish regardless of verdict). Verify the bucket was decremented (the persona is
    // 'shadowbanned-persona').
    const { __getBucketForTest } = await import('../src/services/persona-token-bucket.js');
    const bucket = __getBucketForTest('shadowbanned-persona');
    expect(bucket).toBeDefined();
    // Capacity 20 - 1 (probe) = 19 remaining (within float tolerance).
    expect(bucket!.tokens).toBeLessThanOrEqual(19.01);
    expect(bucket!.tokens).toBeGreaterThanOrEqual(18.99);

    // Verify the persona is now in backoff (600s shadowban cap).
    const { isPersonaInBackoff } = await import('../src/services/backoff-decision.js');
    expect(isPersonaInBackoff('shadowbanned-persona')).toBe(true);
  });

  it('records a probe_failed verdict → fail-open (no applyBackoff, no antirisk signal, status="published") (TASK-002/D1, C-004 fail-open)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    process.env.PUBLISHER_MODE = 'real_publish';
    getActivePersonaNameMock.mockResolvedValue('probe-failed-persona');
    postReplyMock.mockResolvedValueOnce({ success: true, rpid: 'rpid-probe-fail' });
    // Probe faults (network/5xx) → fail-open.
    verifyReplyVisibleMock.mockResolvedValueOnce({
      visible: false,
      status: 'probe_failed',
      probe_method: 'sender_cookie',
      reason: 'fetch_failed',
    });

    const result = await publishIntentWithResult(buildIntent());

    // Fail-open: publish succeeded, probe faulted → still 'published' (not shadowbanned).
    expect(result[0]).toBe(true);
    expect(result[1]).toBe('published');
    expect(result[2]).toBeInstanceOf(Date);
    expect(result[3]).toMatchObject({ new_rpid: 'rpid-probe-fail', visibility: 'probe_failed' });

    // PublishLog keeps status='published' (the publish did succeed), failure_reason records
    // the probe_failed detail for audit.
    expect(prismaMock.publishLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'published',
          failure_reason: 'probe_failed:fetch_failed',
        }),
      }),
    );

    // C-004 fail-open: NO backoff_applied, NO reply_visibility_check antirisk signal.
    expect(prismaMock.observabilityEvent.create).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          event_type: 'backoff_applied',
          error_subclass: 'shadowban',
        }),
      }),
    );
    expect(prismaMock.observabilityEvent.create).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          event_type: 'reply_visibility_check',
          error_subclass: 'shadowban',
        }),
      }),
    );
    // The visible/probe_failed path records a normal (non-antirisk) observability event for
    // online eval — verify it was recorded with status='probe_failed' (NOT error_subclass).
    expect(prismaMock.observabilityEvent.create).not.toHaveBeenCalled();
    // (recordObservabilityEvent buffers to the in-memory observability buffer + background
    // flush, NOT prisma.observabilityEvent.create — so the create spy stays untouched here.
    // The fire-and-forget path is covered by observability.test.ts.)

    // Fail-open: persona NOT in backoff (probe_failed did not apply backoff).
    const { isPersonaInBackoff } = await import('../src/services/backoff-decision.js');
    expect(isPersonaInBackoff('probe-failed-persona')).toBe(false);
  });

  it('records a visible verdict → success tuple with visibility="visible" and no antirisk signal (TASK-002/D1)', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    process.env.PUBLISHER_MODE = 'real_publish';
    getActivePersonaNameMock.mockResolvedValue('visible-persona');
    postReplyMock.mockResolvedValueOnce({ success: true, rpid: 'rpid-visible' });
    verifyReplyVisibleMock.mockResolvedValueOnce({
      visible: true,
      status: 'visible',
      probe_method: 'sender_cookie',
    });

    const result = await publishIntentWithResult(buildIntent());

    expect(result.slice(0, 2)).toEqual([true, 'published']);
    expect(result[3]).toMatchObject({ new_rpid: 'rpid-visible', visibility: 'visible' });
    // PublishLog status='published', failure_reason=null (clean publish, reply visible).
    expect(prismaMock.publishLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'published',
          failure_reason: null,
        }),
      }),
    );
    // No antirisk signal (backoff_applied / reply_visibility_check with shadowban) recorded.
    expect(prismaMock.observabilityEvent.create).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ error_subclass: 'shadowban' }),
      }),
    );
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
    // ISS-20260710-001: stageReady resolver defaults to fail-closed (() => false) when
    // not injected → isStageRealPublishReady() false → stage_gate_blocked. publisher no
    // longer reads STAGE_REAL_PUBLISH_READY env directly (DI resolver replaces env bridge).
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
    // ISS-20260710-001: inject a stage-ready resolver (mimics worker-main boot wiring)
    // so the gate passes and execution proceeds to quota enforcement. Replaces the
    // previous direct STAGE_REAL_PUBLISH_READY env set.
    setStageReadyResolver(() => true);
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
