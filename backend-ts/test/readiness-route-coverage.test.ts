import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { registerReadinessRoute, type ReadinessRouteDependencies } from '../src/routes/readiness.js';
import type { BilibiliDiagnostics, CompanionStateV2, RuntimeSettings } from '../src/server/contracts.js';
import type { PlatformConnectionSnapshot } from '../src/server/platform-contracts.js';

function buildSettings(overrides: Partial<RuntimeSettings> = {}): RuntimeSettings {
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
    bilibiliPollEnabled: true,
    bilibiliPollIntervalSeconds: 120,
    bilibiliPublishEnabled: true,
    bilibiliEnvCredentialConfigured: true,
    killSwitch: false,
    gatewayToken: 'gateway-token',
    gatewayHmacSecret: 'gateway-secret',
    commentIngressToken: 'comment-token',
    publicCompanionActionsEnabled: false,
    platformBilibiliEnabled: true,
    platformQqEnabled: true,
    platformDouyinEnabled: false,
    platformKuaishouEnabled: false,
    platformBilibiliPublishSource: 'bilibili-bot',
    platformQqPublishSource: 'qq-sidecar',
    platformDouyinPublishSource: 'douyin-bot',
    platformKuaishouPublishSource: 'kuaishou-bot',
    ...overrides,
  };
}

function buildDiagnostics(overrides: Partial<BilibiliDiagnostics> = {}): BilibiliDiagnostics {
  return {
    ready: true,
    blocking_reasons: [],
    effective_publish_mode: 'webhook',
    checks: {
      worker_or_publish: {
        ready: true,
        errors: [],
      },
    },
    release_gates: {
      worker_or_publish_ready: true,
    },
    signals: {},
    ...overrides,
  };
}

function buildCompanionState(): CompanionStateV2 {
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

function platformConnection(overrides: Partial<PlatformConnectionSnapshot> = {}): PlatformConnectionSnapshot {
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

function buildDeps(overrides: Partial<ReadinessRouteDependencies> = {}): ReadinessRouteDependencies {
  return {
    settings: buildSettings(),
    checkDatabaseConnection: vi.fn(() => ({ connected: true })),
    checkRedisConnection: vi.fn(() => ({ connected: true })),
    buildBilibiliDiagnostics: vi.fn(() => buildDiagnostics()),
    getCompanionStateV2: vi.fn(buildCompanionState),
    listPlatformConnections: vi.fn(() => ({
      ok: true,
      items: [
        platformConnection(),
        platformConnection({
          platform: 'qq',
          adapterKey: 'qq-sidecar',
          enabled: true,
          status: 'connected',
          capabilities: [{ key: 'publish', status: 'partial' }],
          rolloutControl: { enabled: true, stage: 'trial' },
        }),
      ],
    })),
    buildDefaultReadinessSummary: (settings) => ({
      config: { api_key: Boolean(settings.apiKey) },
      publish: { mode: settings.publisherMode },
      kill_switch: settings.killSwitch,
      public_companion_actions_enabled: Boolean(settings.publicCompanionActionsEnabled),
    }),
    defaultBilibiliDiagnostics: vi.fn((settings) =>
      Promise.resolve(buildDiagnostics({ ready: false, effective_publish_mode: settings.publisherMode })),
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
    ...overrides,
  };
}

async function injectReadiness(overrides: Partial<ReadinessRouteDependencies> = {}) {
  const app = Fastify();
  const deps = buildDeps(overrides);
  registerReadinessRoute(app, deps);
  const response = await app.inject({ method: 'GET', url: '/readiness' });
  await app.close();
  return { response, deps };
}

describe('readiness route coverage', () => {
  it('falls back to default diagnostics when database is down and records foundation blockers', async () => {
    const { response, deps } = await injectReadiness({
      checkDatabaseConnection: () => ({ connected: false, error: 'down' }),
      checkRedisConnection: () => ({ connected: false }),
    });

    const body = response.json();
    expect(body.foundation_ready).toBe(false);
    expect(body.foundation_blockers).toEqual(['database:down', 'redis:unavailable']);
    expect(body.delivery_blockers).toContain('worker:redis_unavailable_for_polling');
    expect(body.bilibili_diagnostics.ready).toBe(false);
    expect(deps.buildBilibiliDiagnostics).not.toHaveBeenCalled();
    expect(deps.defaultBilibiliDiagnostics).toHaveBeenCalled();
  });

  it('uses default diagnostics when diagnostics builder throws', async () => {
    const { response } = await injectReadiness({
      buildBilibiliDiagnostics: () => {
        throw new Error('diagnostics failed');
      },
    });

    const body = response.json();
    expect(body.bilibili_diagnostics).toMatchObject({
      ready: false,
      blocking_reasons: ['dependency:diagnostics_unavailable'],
    });
    expect(body.delivery_blockers).toEqual([]);
  });

  it('reports native publish blockers, kill switch, and product auth blockers', async () => {
    const { response } = await injectReadiness({
      settings: buildSettings({
        apiKey: '',
        adminSessionSecret: '',
        commentIngressToken: '',
        gatewayToken: '',
        gatewayHmacSecret: '',
        publicCompanionActionsEnabled: true,
        killSwitch: true,
        publisherMode: 'native_bilibili',
      }),
      buildBilibiliDiagnostics: () =>
        buildDiagnostics({
          ready: false,
          blocking_reasons: ['credential_missing'],
          effective_publish_mode: 'native_bilibili',
        }),
      buildDeliveryCapabilityMatrix: () => ({ blockers: ['native_bilibili_publish'] }),
    });

    const body = response.json();
    expect(body.delivery_ready).toBe(false);
    expect(body.delivery_blockers).toEqual(
      expect.arrayContaining([
        'control:kill_switch_enabled',
        'bilibili:credential_missing',
        'bilibili:delivery_diagnostics_not_ready',
      ]),
    );
    expect(body.product_blockers).toEqual(
      expect.arrayContaining([
        'admin_auth:unconfigured',
        'companion_actions:public_write_enabled',
        'comment_ingress_auth:unconfigured',
        'gateway_auth:unconfigured',
      ]),
    );
    expect(body.delivery_capability_blockers).toEqual(['native_bilibili_publish']);
    expect(body.product_readiness.companion_surface.signed_off).toBe(false);
  });

  it('handles non delivery capable modes, companion failures, and platform status failures', async () => {
    const { response } = await injectReadiness({
      settings: buildSettings({ publisherMode: 'mock', bilibiliPollEnabled: false }),
      buildBilibiliDiagnostics: () =>
        buildDiagnostics({
          ready: true,
          effective_publish_mode: 'mock',
          checks: { worker_or_publish: { errors: 'not-array' } },
          release_gates: {},
        }),
      getCompanionStateV2: () => {
        throw new Error('pet core unavailable');
      },
      listPlatformConnections: () => {
        throw new Error('platform unavailable');
      },
    });

    const body = response.json();
    expect(body.delivery_blockers).toEqual(
      expect.arrayContaining([
        'bilibili:publish_mode_not_delivery_capable:mock',
        'bilibili:delivery_diagnostics_not_ready',
      ]),
    );
    expect(body.product_blockers).toEqual(
      expect.arrayContaining([
        'admin_control_plane:platform_status_unavailable',
        'pet_core:not_ready',
        'companion_surface:not_ready',
      ]),
    );
    expect(body.product_readiness.bilibili_reference_platform).toMatchObject({ ready: false, status: 'unknown' });
  });

  it('marks product ready when foundations, delivery, auth, companion, and platform signals are ready', async () => {
    const { response } = await injectReadiness();

    const body = response.json();
    expect(body.foundation_ready).toBe(true);
    expect(body.delivery_ready).toBe(true);
    expect(body.product_ready).toBe(true);
    expect(body.completion_matrix.total).toBe(100);
    expect(body.product_readiness.external_platform_trial).toMatchObject({
      ready: true,
      active_platforms: [
        {
          platform: 'qq',
          status: 'connected',
          adapter_key: 'qq-sidecar',
          rollout_enabled: true,
          rollout_stage: 'trial',
        },
      ],
    });
  });

  it('covers readiness fallbacks for missing optional signals and rollout defaults', async () => {
    const { response } = await injectReadiness({
      settings: buildSettings({ publisherMode: '' }),
      checkDatabaseConnection: () => ({ connected: false }),
      buildBilibiliDiagnostics: () =>
        buildDiagnostics({
          effective_publish_mode: '',
          checks: null as unknown as BilibiliDiagnostics['checks'],
          release_gates: null as unknown as BilibiliDiagnostics['release_gates'],
        }),
      defaultBilibiliDiagnostics: () =>
        Promise.resolve(
          buildDiagnostics({
            ready: false,
            blocking_reasons: undefined as unknown as string[],
            effective_publish_mode: '',
            checks: null as unknown as BilibiliDiagnostics['checks'],
            release_gates: null as unknown as BilibiliDiagnostics['release_gates'],
          }),
        ),
      getCompanionStateV2: () => ({
        ...buildCompanionState(),
        companion: { ...buildCompanionState().companion, petName: '' },
      }),
      listPlatformConnections: () => ({
        ok: true,
        items: [
          platformConnection({
            platform: 'qq',
            enabled: true,
            adapterKey: 'qq-sidecar',
            status: 'connected',
            capabilities: [],
            rolloutControl: undefined,
          }),
        ],
      }),
    });

    const body = response.json();
    expect(body.foundation_blockers).toEqual(['database:unavailable']);
    expect(body.delivery_blockers).toEqual(
      expect.arrayContaining(['database:unavailable', 'bilibili:publish_mode_not_delivery_capable:unknown']),
    );
    expect(body.product_blockers).toContain('companion_surface:not_ready');
    expect(body.product_readiness.companion_surface).toMatchObject({ ready: false, pet_name: '' });
    expect(body.product_readiness.external_platform_trial).toMatchObject({
      ready: false,
      active_platforms: [
        {
          platform: 'qq',
          rollout_enabled: true,
          rollout_stage: null,
        },
      ],
    });
  });

  it('handles native diagnostics without blocking reasons and malformed platform items', async () => {
    const { response } = await injectReadiness({
      settings: buildSettings({ publisherMode: 'native_bilibili' }),
      buildBilibiliDiagnostics: () =>
        buildDiagnostics({
          ready: false,
          blocking_reasons: undefined as unknown as string[],
          effective_publish_mode: 'native_bilibili',
        }),
      listPlatformConnections: () => ({
        ok: true,
        items: null as unknown as PlatformConnectionSnapshot[],
      }),
    });

    const body = response.json();
    expect(body.delivery_blockers).toContain('bilibili:delivery_diagnostics_not_ready');
    expect(body.product_readiness.bilibili_reference_platform).toMatchObject({ ready: false, status: 'unknown' });
    expect(body.product_readiness.external_platform_trial).toMatchObject({ active_platforms: [] });
  });

  it('derives completion_matrix.total from the gate array (Math.round(passed/total*100))', async () => {
    // 3 gates fail: db, redis, plus drop_count budget (3 antirisk gates share it).
    // total gates = 11 (TASK-007 added backoff_active_rate + passive_response_violation_count,
    // both fail-open here — they read false because their deps default to () => false).
    // Recompute gates: db=F, redis=F, admin_access=T, publish_mode_delivery_capable=T(webhook),
    // worker_or_publish_path_ready=T (webhook + release_gate ready), normal_buffer_healthy=F,
    // critical_queue_healthy=F, drop_count_within_budget=F,
    // backoff_active_rate_within_budget=T (default false => within budget), passive_response_violation_count_within_budget=T,
    // credential_encryption_key_present=T => passed = 6/11 => Math.round(6/11*100)=55.
    const { response } = await injectReadiness({
      checkDatabaseConnection: () => ({ connected: false, error: 'down' }),
      checkRedisConnection: () => ({ connected: false }),
      isDropCountThresholdExceeded: () => true,
    });

    const body = response.json();
    // foundation down -> delivery_path_ready false, publish_mode still webhook (delivery capable)
    expect(body.completion_matrix.total).toBe(55);
    expect(body.completion_matrix.readiness_gates).toHaveLength(11);
    expect(body.completion_matrix.readiness_gates.map((g: { key: string }) => g.key)).toEqual([
      'db_connected',
      'redis_connected',
      'admin_access_configured',
      'publish_mode_delivery_capable',
      'worker_or_publish_path_ready',
      'normal_buffer_healthy',
      'critical_queue_healthy',
      'drop_count_within_budget',
      'backoff_active_rate_within_budget',
      'passive_response_violation_count_within_budget',
      'credential_encryption_key_present',
    ]);
  });

  it('adds antirisk:backoff_active_rate_exceeded blocker when backoff active rate crosses threshold (TASK-007)', async () => {
    const { response } = await injectReadiness({
      isBackoffActiveRateExceeded: () => true,
    });

    const body = response.json();
    expect(body.product_blockers).toContain('antirisk:backoff_active_rate_exceeded');
    expect(body.product_ready).toBe(false);
    const rateGate = body.completion_matrix.readiness_gates.find(
      (g: { key: string }) => g.key === 'backoff_active_rate_within_budget',
    );
    expect(rateGate.passed).toBe(false);
  });

  it('adds antirisk:passive_response_violation_count_exceeded blocker when passive gate rejects cross threshold (TASK-007)', async () => {
    const { response } = await injectReadiness({
      isPassiveResponseViolationExceeded: () => true,
    });

    const body = response.json();
    expect(body.product_blockers).toContain('antirisk:passive_response_violation_count_exceeded');
    expect(body.product_ready).toBe(false);
    const passiveGate = body.completion_matrix.readiness_gates.find(
      (g: { key: string }) => g.key === 'passive_response_violation_count_within_budget',
    );
    expect(passiveGate.passed).toBe(false);
  });

  it('adds credential_encryption:not_configured blocker when encryption key missing', async () => {
    const { response } = await injectReadiness({
      isEncryptionAvailable: () => false,
    });

    const body = response.json();
    expect(body.product_blockers).toContain('credential_encryption:not_configured');
    expect(body.product_ready).toBe(false);
    // security gate should be false
    const securityGate = body.completion_matrix.readiness_gates.find(
      (g: { key: string }) => g.key === 'credential_encryption_key_present',
    );
    expect(securityGate.passed).toBe(false);
  });

  it('adds antirisk:drop_count_threshold_exceeded blocker when drop count over budget', async () => {
    const { response } = await injectReadiness({
      isDropCountThresholdExceeded: () => true,
    });

    const body = response.json();
    expect(body.product_blockers).toContain('antirisk:drop_count_threshold_exceeded');
    expect(body.product_ready).toBe(false);
    const budgetGate = body.completion_matrix.readiness_gates.find(
      (g: { key: string }) => g.key === 'drop_count_within_budget',
    );
    expect(budgetGate.passed).toBe(false);
  });

  it('no longer exposes top-level ready field (F4 dual-semantics removal)', async () => {
    const { response } = await injectReadiness();
    const body = response.json();
    expect(body).not.toHaveProperty('ready');
    expect(body).toHaveProperty('foundation_ready');
    expect(body).toHaveProperty('product_ready');
  });
});
