import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getComplianceMode,
  isCompliancePassive,
} from '../src/services/compliance-mode.js';

// ── compliance-mode accessor unit tests ──────────────────────────

describe('compliance-mode accessor (TASK-003, G3 ISS-001)', () => {
  const original = process.env.COMPLIANCE_MODE;

  beforeEach(() => {
    delete process.env.COMPLIANCE_MODE;
  });

  afterEach(() => {
    if (original === undefined) {
      delete process.env.COMPLIANCE_MODE;
    } else {
      process.env.COMPLIANCE_MODE = original;
    }
  });

  it('defaults to "off" when COMPLIANCE_MODE is unset (byte-for-byte backward compat)', () => {
    expect(getComplianceMode()).toBe('off');
    expect(isCompliancePassive()).toBe(false);
  });

  it('returns "off" for empty / unknown values (fail-safe to default, never silent passive)', () => {
    process.env.COMPLIANCE_MODE = '';
    expect(getComplianceMode()).toBe('off');

    process.env.COMPLIANCE_MODE = 'garbage';
    expect(getComplianceMode()).toBe('off');

    // A value that is NOT 'passive' after trim+lower stays 'off' (fail-safe — an invalid
    // config MUST NOT silently flip the system into passive mode).
    process.env.COMPLIANCE_MODE = 'passive-mode';
    expect(getComplianceMode()).toBe('off');
  });

  it('returns "passive" only for the exact literal (case-insensitive, whitespace-tolerant)', () => {
    process.env.COMPLIANCE_MODE = 'passive';
    expect(getComplianceMode()).toBe('passive');
    expect(isCompliancePassive()).toBe(true);

    // Whitespace + case are normalized, so '  PASSIVE  ' IS the passive literal.
    process.env.COMPLIANCE_MODE = '  PASSIVE  ';
    expect(getComplianceMode()).toBe('passive');
    expect(isCompliancePassive()).toBe(true);
  });
});

// ── publisher compliance override (force webhook, never real_publish) ────────
//
// Reuses the publisher-modes.test.ts mock harness shape so the compliance override is
// exercised end-to-end through publishIntentWithResult: a COMPLIANCE_MODE='passive' +
// PUBLISHER_MODE='real_publish' config MUST route to publishWebhook (never reach
// postReply / the real Bilibili API), proving the legal red-line is enforced at the
// dispatch layer.
//
// Single merged hoisted mock set: vi.mock is module-scoped so bilibili-client /
// bilibili-runtime-config / observability each need ONE factory that exports every
// symbol the publisher + probe-scheduler + comment-ingest paths import. Merging here
// avoids the "last vi.mock wins" clobber that would drop postReply (publisher) when
// probeBilibiliAuth (probe-scheduler) is also needed in the same file.

const {
  postReplyMock,
  verifyReplyVisibleMock,
  probeBilibiliAuthMock,
  recordAntiriskSignalMock,
  recordObservabilityEventMock,
  loadBilibiliRuntimeConfigMock,
  getActivePersonaNameMock,
  ensureTraceIdMock,
  prismaMock,
} = vi.hoisted(() => ({
  postReplyMock: vi.fn(),
  verifyReplyVisibleMock: vi.fn(),
  probeBilibiliAuthMock: vi.fn(),
  recordAntiriskSignalMock: vi.fn(),
  recordObservabilityEventMock: vi.fn(),
  loadBilibiliRuntimeConfigMock: vi.fn(),
  getActivePersonaNameMock: vi.fn(),
  ensureTraceIdMock: vi.fn(() => 'test-trace-id'),
  prismaMock: {
    publishLog: {
      findFirst: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    observabilityEvent: {
      create: vi.fn(),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  },
}));

vi.mock('../src/services/db-queries.js', () => ({
  prisma: () => prismaMock,
}));

vi.mock('../src/services/bilibili-client.js', () => ({
  postReply: postReplyMock,
  verifyReplyVisible: verifyReplyVisibleMock,
  probeBilibiliAuth: probeBilibiliAuthMock,
}));

vi.mock('../src/services/bilibili-runtime-config.js', () => ({
  getActivePersonaName: getActivePersonaNameMock,
  loadBilibiliRuntimeConfig: loadBilibiliRuntimeConfigMock,
}));

// observability: merge actual exports via importOriginal so publisher's
// __resetObservabilityBufferForTest keeps working, while recordAntiriskSignal /
// ensureTraceId (probe-scheduler) and recordObservabilityEvent (comment-ingest gate
// counter + readiness compliance_mode_check) are overridden with test spies.
vi.mock('../src/services/observability.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/services/observability.js')>();
  return {
    ...actual,
    recordAntiriskSignal: recordAntiriskSignalMock,
    recordObservabilityEvent: recordObservabilityEventMock,
    ensureTraceId: ensureTraceIdMock,
  };
});

const { publishIntentWithResult, __resetStageReadyResolverForTest } = await import(
  '../src/services/publisher.js'
);
const { __resetObservabilityBufferForTest } = await import('../src/services/observability.js');

const publisherTrackedEnv = [
  'PUBLISHER_MODE',
  'PUBLISHER_WEBHOOK_URL',
  'PUBLISHER_WEBHOOK_TOKEN',
  'PUBLISHER_TIMEOUT_SECONDS',
  'PUBLISHER_CIRCUIT_BREAKER_ENABLED',
  'STAGE_GATE_ENABLED',
  'STAGE_REAL_PUBLISH_READY',
  'STAGE_DAILY_QUOTA',
  'COMPLIANCE_MODE',
] as const;

function clearPublisherEnv(): void {
  for (const key of publisherTrackedEnv) {
    delete process.env[key];
  }
}

function buildIntent(overrides: Record<string, unknown> = {}) {
  return {
    traceId: 'trace-compliance-1',
    source: 'compliance-test',
    target: {
      platform: 'bilibili',
      targetKind: 'comment-reply' as const,
      externalId: 'comment-1',
      canonicalId: 'bilibili:comment-1',
    },
    payload: { text: ' reply text ' },
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
  prismaMock.publishLog.findFirst.mockResolvedValue(null);
  prismaMock.publishLog.create.mockResolvedValue({ id: 1 });
  prismaMock.publishLog.count.mockResolvedValue(0);
  prismaMock.observabilityEvent.create.mockResolvedValue({ id: 1 });
  // recordObservabilityEvent is mocked (shared observability factory) — default it to a
  // resolved Promise so publishReal's fire-and-forget `void recordObservabilityEvent(...).catch(...)`
  // does not throw on `undefined.catch`. comment-ingest's beforeEach re-asserts this too.
  recordObservabilityEventMock.mockResolvedValue(undefined);
  // Default visibility-probe verdict = visible so the real_publish backward-compat case
  // (which does not override the probe per-case) still gets status='published'. Mirrors
  // the publisher-modes.test.ts default mock wiring.
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
  getActivePersonaNameMock.mockResolvedValue(null);
  __resetStageReadyResolverForTest();
  __resetObservabilityBufferForTest();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  clearPublisherEnv();
  __resetStageReadyResolverForTest();
  __resetObservabilityBufferForTest();
});

describe('publisher compliance override (TASK-003, G3 ISS-001)', () => {
  it('COMPLIANCE_MODE=off (default) preserves real_publish behavior byte-for-byte', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    process.env.PUBLISHER_MODE = 'real_publish';
    // No COMPLIANCE_MODE set → default 'off' → real_publish path reachable.
    postReplyMock.mockResolvedValueOnce({ success: true, rpid: 'rpid-real' });
    verifyReplyVisibleMock.mockResolvedValueOnce({
      visible: true,
      status: 'visible',
      probe_method: 'sender_cookie',
    });

    const result = await publishIntentWithResult(buildIntent());

    // real_publish path reached (postReply called) — backward compat preserved.
    expect(postReplyMock).toHaveBeenCalledTimes(1);
    expect(result.slice(0, 2)).toEqual([true, 'published']);
  });

  it('COMPLIANCE_MODE=passive forces webhook even when PUBLISHER_MODE=real_publish (legal red-line: never real_publish)', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    process.env.PUBLISHER_MODE = 'real_publish';
    process.env.COMPLIANCE_MODE = 'passive';
    process.env.PUBLISHER_WEBHOOK_URL = 'https://compliance.example/hook';
    process.env.PUBLISHER_WEBHOOK_TOKEN = 'tok';
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ queued: true }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await publishIntentWithResult(buildIntent());

    // Forced into publishWebhook — postReply (real Bilibili API) MUST NOT be called.
    expect(result.slice(0, 2)).toEqual([true, 'webhook_published']);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://compliance.example/hook',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(postReplyMock).not.toHaveBeenCalled();
  });

  it('COMPLIANCE_MODE=passive forces webhook even when PUBLISHER_MODE=manual_queue', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    process.env.PUBLISHER_MODE = 'manual_queue';
    process.env.COMPLIANCE_MODE = 'passive';
    process.env.PUBLISHER_WEBHOOK_URL = 'https://compliance.example/hook';
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await publishIntentWithResult(buildIntent());

    expect(result.slice(0, 2)).toEqual([true, 'webhook_published']);
    expect(fetchMock).toHaveBeenCalled();
  });

  it('COMPLIANCE_MODE=passive preserves dry_run (compliance does not force active publishing)', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    process.env.PUBLISHER_MODE = 'dry_run';
    process.env.COMPLIANCE_MODE = 'passive';

    const result = await publishIntentWithResult(buildIntent());

    // dry_run is observation-only, compliance must not flip it into active webhook publishing.
    expect(result.slice(0, 2)).toEqual([true, 'dry_run_skipped']);
    expect(postReplyMock).not.toHaveBeenCalled();
  });

  it('COMPLIANCE_MODE=passive returns webhook_not_configured when no webhook URL is set (fail-observable, not silent real_publish)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    process.env.PUBLISHER_MODE = 'real_publish';
    process.env.COMPLIANCE_MODE = 'passive';
    // No PUBLISHER_WEBHOOK_URL — webhook mode returns webhook_not_configured rather than
    // falling back to real_publish. The operator MUST configure the webhook explicitly;
    // compliance never silently routes to the active Bilibili API.
    const result = await publishIntentWithResult(buildIntent());

    expect(result.slice(0, 2)).toEqual([false, 'webhook_not_configured']);
    expect(postReplyMock).not.toHaveBeenCalled();
  });
});

// ── probe-scheduler compliance skip (no active probing) ────────────────────
//
// observability / bilibili-client / bilibili-runtime-config mocks are merged above
// (single module-scoped factory each). probeBilibiliAuth, recordAntiriskSignal and
// loadBilibiliRuntimeConfig are already wired in the hoisted set.

const {
  probeBilibiliAuthScheduler,
  isAuthProbeHealthy,
  __resetProbeSchedulerForTest,
} = await import('../src/services/probe-scheduler.js');

describe('probe-scheduler compliance skip (TASK-003, G3 ISS-001)', () => {
  beforeEach(() => {
    __resetProbeSchedulerForTest();
    probeBilibiliAuthMock.mockReset();
    recordAntiriskSignalMock.mockReset();
    loadBilibiliRuntimeConfigMock.mockReset();
    process.env.BILIBILI_ENABLED = 'true';
  });

  afterEach(() => {
    __resetProbeSchedulerForTest();
    delete process.env.BILIBILI_ENABLED;
    delete process.env.COMPLIANCE_MODE;
  });

  it('COMPLIANCE_MODE=passive skips active probing even when BILIBILI_ENABLED=true (no active behavior)', async () => {
    process.env.COMPLIANCE_MODE = 'passive';
    probeBilibiliAuthMock.mockResolvedValue({ ok: false, reason: 'not_logged_in', status: 200 });

    await probeBilibiliAuthScheduler();

    // Probe skipped — healthy stays true, no antirisk signal, no config load.
    expect(isAuthProbeHealthy()).toBe(true);
    expect(probeBilibiliAuthMock).not.toHaveBeenCalled();
    expect(loadBilibiliRuntimeConfigMock).not.toHaveBeenCalled();
    expect(recordAntiriskSignalMock).not.toHaveBeenCalled();
  });

  it('COMPLIANCE_MODE=off (default) probes normally when BILIBILI_ENABLED=true (backward compat)', async () => {
    // No COMPLIANCE_MODE → default 'off' → probe runs.
    loadBilibiliRuntimeConfigMock.mockResolvedValue({
      sessdata: 'sess',
      biliJct: 'jct',
      buvid: 'bv',
      buvid4: '',
      dedeuserid: '',
      baseUrl: 'https://api.bilibili.com',
      userAgent: 'ua',
      timeout: 30000,
      retries: 3,
      source: 'environment',
      credentialId: null,
      credentialName: 'test-persona',
    });
    probeBilibiliAuthMock.mockResolvedValue({ ok: true, reason: 'verified', status: 200 });

    await probeBilibiliAuthScheduler();

    expect(probeBilibiliAuthMock).toHaveBeenCalledTimes(1);
    expect(isAuthProbeHealthy()).toBe(true);
  });
});

// ── comment-ingest compliance gate force-on ────────────────────────────────
//
// observability (recordObservabilityEvent) + bilibili-runtime-config
// (getActivePersonaName) mocks are merged above. comment-event.task / task-queue
// are ingest-local and mocked here.

const ingestMocks = vi.hoisted(() => ({
  createCommentEventQueueMock: vi.fn(),
  tryEnqueueTaskMock: vi.fn(),
}));

vi.mock('../src/workers/tasks/comment-event.task.js', () => ({
  createCommentEventQueue: ingestMocks.createCommentEventQueueMock,
}));

vi.mock('../src/workers/task-queue.js', () => ({
  tryEnqueueTask: ingestMocks.tryEnqueueTaskMock,
}));

const { createCommentIngestHelpers } = await import('../src/server/comment-ingest.js');
import type { InteractionEvent } from '../src/server/contracts.js';

function buildInteractionEvent(overrides: Partial<InteractionEvent> = {}): InteractionEvent {
  return {
    platform: 'qq',
    ingressSource: 'qq-sidecar',
    traceId: 'trace-compliance-ingest',
    actor: { platformUserId: 'user-1' },
    reference: {
      subjectKind: 'comment',
      externalId: 'comment-1',
      canonicalId: 'qq:comment-1',
      containerId: 'group-1',
      parentExternalId: 'message-0',
    },
    content: { text: '今天天气不错' },
    legacyComment: { commentId: 'comment-1', videoId: 'group-1', parentId: 'message-0' },
    ...overrides,
  };
}

function buildIngestPrisma() {
  return {
    comment: { create: vi.fn() },
    commentQueueBacklog: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
  } as never;
}

function buildIngestDeps(prisma: never, overrides: Record<string, unknown> = {}) {
  return {
    getPrisma: () => prisma,
    createTraceId: vi.fn((preferred?: string) => preferred ?? 'trace-generated'),
    parseJsonRecord: vi.fn((value: unknown) =>
      typeof value === 'string' ? (JSON.parse(value) as Record<string, unknown>) : {},
    ),
    writeAuditLog: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('comment-ingest compliance gate force-on (TASK-003, G3 ISS-001)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ingestMocks.createCommentEventQueueMock.mockReturnValue({
      name: 'comment-event',
      close: vi.fn(async () => undefined),
    });
    ingestMocks.tryEnqueueTaskMock.mockResolvedValue({ queued: true });
    getActivePersonaNameMock.mockResolvedValue(null);
    recordObservabilityEventMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env.COMPLIANCE_MODE;
    delete process.env.PASSIVE_RESPONSE_GATE_ENABLED;
  });

  it('COMPLIANCE_MODE=passive forces the gate on even when PASSIVE_RESPONSE_GATE_ENABLED=false (compliance red-line overrides L8 rollback)', async () => {
    process.env.COMPLIANCE_MODE = 'passive';
    process.env.PASSIVE_RESPONSE_GATE_ENABLED = 'false';
    const prisma = buildIngestPrisma();
    (prisma.comment.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1 });
    const helpers = createCommentIngestHelpers(buildIngestDeps(prisma));

    // Content has neither @self nor a triggerKeyword — would be enqueued with the gate off,
    // but compliance overrides the rollback flag and rejects it (passive-response hard constraint).
    const result = await helpers.ingestInteractionEvent({
      event: buildInteractionEvent(),
      source: 'qq-sidecar',
    });

    expect(result).toEqual({
      ok: true,
      queued: false,
      message: 'not_passive_eligible',
      comment_id: 'comment-1',
      trace_id: 'trace-compliance-ingest',
    });
    // Comment still persisted (audit trail), just not enqueued for reply.
    expect(prisma.comment.create).toHaveBeenCalledTimes(1);
    expect(ingestMocks.tryEnqueueTaskMock).not.toHaveBeenCalled();
    expect(recordObservabilityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'passive_response_gate',
        status: 'rejected',
      }),
    );
  });

  it('COMPLIANCE_MODE=passive still enqueues a passively-invoked comment (@self / triggerKeyword)', async () => {
    process.env.COMPLIANCE_MODE = 'passive';
    const prisma = buildIngestPrisma();
    (prisma.comment.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1 });
    const helpers = createCommentIngestHelpers(buildIngestDeps(prisma));

    const result = await helpers.ingestInteractionEvent({
      event: buildInteractionEvent({ content: { text: '请问这个怎么用' } }),
      source: 'qq-sidecar',
    });

    // triggerKeyword '请问' hit → eligible → enqueued (passive response, not active harassment).
    expect(result).toMatchObject({ ok: true, queued: true, message: 'queued' });
    expect(ingestMocks.tryEnqueueTaskMock).toHaveBeenCalledTimes(1);
  });

  it('COMPLIANCE_MODE=off respects PASSIVE_RESPONSE_GATE_ENABLED=false rollback (backward compat)', async () => {
    // No COMPLIANCE_MODE → default 'off' → rollback flag honored, all comments enqueued.
    process.env.PASSIVE_RESPONSE_GATE_ENABLED = 'false';
    const prisma = buildIngestPrisma();
    (prisma.comment.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1 });
    const helpers = createCommentIngestHelpers(buildIngestDeps(prisma));

    const result = await helpers.ingestInteractionEvent({
      event: buildInteractionEvent(),
      source: 'qq-sidecar',
    });

    expect(result).toMatchObject({ ok: true, queued: true, message: 'queued' });
    expect(ingestMocks.tryEnqueueTaskMock).toHaveBeenCalledTimes(1);
    // Gate counter NOT emitted when the flag is off (no gate evaluation).
    expect(recordObservabilityEventMock).not.toHaveBeenCalled();
  });
});

// ── readiness compliance signal (passive_mode_active + compliance_mode_check) ─

import Fastify from 'fastify';
import { registerReadinessRoute, type ReadinessRouteDependencies } from '../src/routes/readiness.js';
import type { BilibiliDiagnostics, CompanionStateV2, RuntimeSettings } from '../src/server/contracts.js';
import type { PlatformConnectionSnapshot } from '../src/server/platform-contracts.js';

function buildComplianceSettings(overrides: Partial<RuntimeSettings> = {}): RuntimeSettings {
  return {
    databaseUrl: 'file:./test.db',
    celeryBrokerUrl: 'redis://localhost:6379/0',
    celeryResultBackend: 'redis://localhost:6379/1',
    apiKey: 'admin-key',
    adminSessionSecret: 'secret',
    adminSessionTtlSeconds: 3600,
    llmProvider: 'mock',
    llmApiKeyConfigured: false,
    llmFallbackToMock: true,
    searchProvider: 'serpapi',
    searchApiKeyConfigured: false,
    searchCxConfigured: false,
    publisherMode: 'webhook',
    publisherWebhookUrlConfigured: true,
    bilibiliEnabled: true,
    bilibiliPollEnabled: false,
    bilibiliPollIntervalSeconds: 120,
    bilibiliPublishEnabled: true,
    bilibiliEnvCredentialConfigured: true,
    killSwitch: false,
    gatewayToken: 'gateway-token',
    gatewayHmacSecret: 'gateway-secret',
    commentIngressToken: 'comment-token',
    publicCompanionActionsEnabled: false,
    platformBilibiliEnabled: true,
    platformQqEnabled: false,
    platformDouyinEnabled: false,
    platformKuaishouEnabled: false,
    platformBilibiliPublishSource: 'bilibili-bot',
    platformQqPublishSource: 'qq-sidecar',
    platformDouyinPublishSource: 'douyin-bot',
    platformKuaishouPublishSource: 'kuaishou-bot',
    ...overrides,
  };
}

function buildComplianceDiagnostics(overrides: Partial<BilibiliDiagnostics> = {}): BilibiliDiagnostics {
  return {
    ready: true,
    blocking_reasons: [],
    effective_publish_mode: 'webhook',
    checks: { worker_or_publish: { ready: true, errors: [] } },
    release_gates: { worker_or_publish_ready: true },
    signals: {},
    ...overrides,
  };
}

function buildComplianceCompanion(): CompanionStateV2 {
  return {
    version: 'v2',
    snapshot: {
      profile: { petName: 'Mochi' },
      relationship: { level: 'friend', note: 'ok' },
      progress: { stage: 'seed', progressLabel: '1/3' },
      needs: [],
      proactiveSignals: [{ key: 'nudge', label: 'Nudge', detail: 'Check in' }],
    },
    companion: {
      petName: 'Mochi',
      statusLine: 'Ready',
      loopMode: 'test',
      lastCheckIn: '2026-06-09T00:00:00.000Z',
      adapterLabel: 'test',
      loopHint: 'test',
      mood: { label: 'Calm', note: 'ok' },
      memoryTitle: 'Memory',
      memorySummary: 'Summary',
      vitals: [],
      recentSignals: [],
      recentInteractions: [{ kind: 'pat', title: 'Pat', detail: 'ok', timestamp: 'now', source: 'test' }],
    },
  };
}

function buildCompliancePlatformConn(overrides: Partial<PlatformConnectionSnapshot> = {}): PlatformConnectionSnapshot {
  return {
    platform: 'bilibili',
    enabled: true,
    adapterKey: 'bilibili-reference',
    status: 'connected',
    capabilities: [{ key: 'publish', status: 'available' }],
    rolloutControl: { enabled: true, stage: 'trial' },
    ...overrides,
  };
}

function buildComplianceDeps(overrides: Partial<ReadinessRouteDependencies> = {}): ReadinessRouteDependencies {
  return {
    settings: buildComplianceSettings(),
    checkDatabaseConnection: vi.fn(() => ({ connected: true })),
    checkRedisConnection: vi.fn(() => ({ connected: true })),
    buildBilibiliDiagnostics: vi.fn(() => buildComplianceDiagnostics()),
    getCompanionStateV2: vi.fn(buildComplianceCompanion),
    listPlatformConnections: vi.fn(() => ({ ok: true, items: [buildCompliancePlatformConn()] })),
    buildDefaultReadinessSummary: (settings) => ({
      config: { api_key: Boolean(settings.apiKey) },
      publish: { mode: settings.publisherMode },
      kill_switch: settings.killSwitch,
      public_companion_actions_enabled: Boolean(settings.publicCompanionActionsEnabled),
    }),
    defaultBilibiliDiagnostics: vi.fn((settings) =>
      Promise.resolve(buildComplianceDiagnostics({ ready: false, effective_publish_mode: settings.publisherMode })),
    ),
    normalizePublishMode: (mode) => mode.trim().toLowerCase(),
    addBlocker: (target, message) => {
      if (message && !target.includes(message)) target.push(message);
    },
    buildDeliveryCapabilityMatrix: vi.fn(() => ({ blockers: [], capabilities: [] })),
    isEncryptionAvailable: vi.fn(() => true),
    isDropCountThresholdExceeded: vi.fn(() => false),
    isBackoffActiveRateExceeded: vi.fn(() => false),
    isPassiveResponseViolationExceeded: vi.fn(() => false),
    threeLayerFlagsAllOn: vi.fn(() => true),
    isBehaviorAnomalyCountZero: vi.fn(() => true),
    isAuthProbeHealthy: vi.fn(() => true),
    isReplyVisibilityHealthy: vi.fn(() => true),
    ...overrides,
  };
}

async function injectComplianceReadiness(overrides: Partial<ReadinessRouteDependencies> = {}) {
  const app = Fastify();
  const deps = buildComplianceDeps(overrides);
  registerReadinessRoute(app, deps);
  const response = await app.inject({ method: 'GET', url: '/readiness' });
  await app.close();
  return { response, deps };
}

describe('readiness compliance signal (TASK-003, G3 ISS-001)', () => {
  const originalCompliance = process.env.COMPLIANCE_MODE;

  beforeEach(() => {
    delete process.env.COMPLIANCE_MODE;
    // Stub observability fire-and-forget so the compliance_mode_check event does not touch DB.
    vi.stubGlobal('__complianceTestNoOp', true);
  });

  afterEach(() => {
    if (originalCompliance === undefined) {
      delete process.env.COMPLIANCE_MODE;
    } else {
      process.env.COMPLIANCE_MODE = originalCompliance;
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('COMPLIANCE_MODE=off (default) reports compliance_mode="off" and passive_mode_active gate present', async () => {
    const { response } = await injectComplianceReadiness();
    const body = response.json();

    expect(body.delivery_signals.compliance_mode).toBe('off');
    const gateKeys = body.completion_matrix.readiness_gates.map((g: { key: string }) => g.key);
    expect(gateKeys).toContain('passive_mode_active');
    // informational gate always passes — does not flip product_ready.
    expect(body.product_ready).toBe(true);
  });

  it('COMPLIANCE_MODE=passive reports compliance_mode="passive" and is NOT a product blocker', async () => {
    process.env.COMPLIANCE_MODE = 'passive';
    const { response } = await injectComplianceReadiness();
    const body = response.json();

    expect(body.delivery_signals.compliance_mode).toBe('passive');
    // passive mode is a deliberate operator opt-in — product stays ready (no blocker added).
    expect(body.product_ready).toBe(true);
    expect(body.product_blockers).not.toContain(expect.stringContaining('compliance'));
  });

  it('isComplianceModePassive dep override takes precedence over env read', async () => {
    // env says 'off' but the injected dep says passive — the dep wins (DI pattern).
    const { response } = await injectComplianceReadiness({
      isComplianceModePassive: () => true,
    });
    const body = response.json();

    expect(body.delivery_signals.compliance_mode).toBe('passive');
  });
});
