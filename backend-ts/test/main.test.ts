import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createServer } from '../src/main.js';
import { resetPlatformControlState } from '../src/platforms/control-state.js';
import type { RuntimeSettings } from '../src/server/contracts.js';
import type { ServerDependencies } from '../src/server/dependencies.js';

const platformControlTempDirs: string[] = [];

function useIsolatedPlatformControlState(prefix = 'platform-control-main-test-'): string {
  const tempDir = mkdtempSync(join(tmpdir(), prefix));
  platformControlTempDirs.push(tempDir);
  const filePath = join(tempDir, 'control-state.json');
  process.env.PLATFORM_CONTROL_STATE_FILE = filePath;
  return tempDir;
}

function buildSettings(overrides: Partial<RuntimeSettings> = {}): RuntimeSettings {
  return {
    databaseUrl: 'file:./test.db',
    celeryBrokerUrl: 'redis://localhost:6379/0',
    celeryResultBackend: 'redis://localhost:6379/1',
    apiKey: '',
    adminSessionSecret: '',
    adminSessionTtlSeconds: 60 * 60 * 12,
    llmProvider: 'mock',
    llmApiKeyConfigured: false,
    llmFallbackToMock: true,
    searchProvider: 'serpapi',
    searchApiKeyConfigured: false,
    searchCxConfigured: false,
    publisherMode: 'webhook',
    publisherWebhookUrlConfigured: false,
    bilibiliEnabled: false,
    bilibiliPollEnabled: false,
    bilibiliPollIntervalSeconds: 300,
    bilibiliPublishEnabled: false,
    bilibiliEnvCredentialConfigured: false,
    killSwitch: false,
    gatewayToken: '',
    gatewayHmacSecret: '',
    commentIngressToken: '',
    publicCompanionActionsEnabled: false,
    platformBilibiliEnabled: false,
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

function buildDeps(overrides: Partial<ServerDependencies> = {}): Partial<ServerDependencies> {
  return {
    settings: buildSettings(),
    checkDatabaseConnection: async () => ({ connected: true }),
    checkRedisConnection: async () => ({ connected: true }),
    buildBilibiliDiagnostics: async () => ({
      ready: false,
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
    }),
    ...overrides,
  };
}

async function withNodeEnv<T>(value: string, run: () => Promise<T>): Promise<T> {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = value;
  try {
    return await run();
  } finally {
    if (previous == null) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previous;
    }
  }
}

beforeEach(() => {
  useIsolatedPlatformControlState();
  resetPlatformControlState();
  // TASK-005 readiness security gate: isEncryptionAvailable() must return true so the
  // credential_encryption:not_configured blocker does not fire for product_ready assertions.
  process.env.CREDENTIAL_ENCRYPTION_KEY =
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
});

afterEach(() => {
  resetPlatformControlState();
  delete process.env.PLATFORM_CONTROL_STATE_FILE;
  delete process.env.CREDENTIAL_ENCRYPTION_KEY;
  while (platformControlTempDirs.length > 0) {
    const tempDir = platformControlTempDirs.pop();
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  }
});

describe('health/readiness parity', () => {
  it('returns ok for /health', async () => {
    const app = createServer(buildDeps());

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });

    await app.close();
  });

  it('serves the admin HTML and referenced hashed assets', async () => {
    const app = createServer(buildDeps());

    const adminResponse = await app.inject({ method: 'GET', url: '/admin' });
    expect(adminResponse.statusCode).toBe(200);

    const cssMatch = adminResponse.body.match(/href="([^"]+\.css)"/);
    const jsMatch = adminResponse.body.match(/src="([^"]+\.js)"/);

    expect(cssMatch?.[1]).toBeTruthy();
    expect(jsMatch?.[1]).toBeTruthy();

    const cssResponse = await app.inject({ method: 'GET', url: String(cssMatch?.[1]) });
    const jsResponse = await app.inject({ method: 'GET', url: String(jsMatch?.[1]) });

    expect(cssResponse.statusCode).toBe(200);
    expect(jsResponse.statusCode).toBe(200);

    await app.close();
  });

  it('serves the companion HTML and referenced hashed assets', async () => {
    const app = createServer(buildDeps());

    const companionResponse = await app.inject({ method: 'GET', url: '/companion' });
    expect(companionResponse.statusCode).toBe(200);

    const cssMatch = companionResponse.body.match(/href="([^"]+\.css)"/);
    const jsMatch = companionResponse.body.match(/src="([^"]+\.js)"/);

    expect(cssMatch?.[1]).toBeTruthy();
    expect(jsMatch?.[1]).toBeTruthy();

    const cssResponse = await app.inject({ method: 'GET', url: String(cssMatch?.[1]) });
    const jsResponse = await app.inject({ method: 'GET', url: String(jsMatch?.[1]) });

    expect(cssResponse.statusCode).toBe(200);
    expect(jsResponse.statusCode).toBe(200);

    await app.close();
  });

  it('returns companion state without admin auth', async () => {
    const app = createServer(
      buildDeps({
        getCompanionState: async () => ({
          petName: 'Mochi',
          statusLine: 'Tracking persisted memory.',
          loopMode: 'Backend memory companion',
          lastCheckIn: '2026-04-11T00:00:00.000Z',
          adapterLabel: 'Backend memory endpoint',
          loopHint: 'Companion state is sourced from backend memory.',
          mood: {
            label: 'Attentive',
            note: 'Companion sees stored spaces.',
          },
          memoryTitle: 'Persisted memory summary',
          memorySummary: 'Known spaces: Alpha Operator.',
          vitals: [
            { label: 'Spaces', value: '1' },
            { label: 'Grants', value: '1' },
          ],
          recentSignals: ['Recent spaces: Alpha Operator'],
          recentInteractions: [
            {
              kind: 'pat',
              title: 'Pat interaction',
              detail: 'A gentle pat settled Mochi and raised the bond signal.',
              timestamp: '2026-04-11T00:00:00.000Z',
              source: 'Companion Action',
            },
          ],
        }),
      }),
    );

    const response = await app.inject({ method: 'GET', url: '/companion/state' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      petName: 'Mochi',
      statusLine: 'Tracking persisted memory.',
      loopMode: 'Backend memory companion',
      lastCheckIn: '2026-04-11T00:00:00.000Z',
      adapterLabel: 'Backend memory endpoint',
      loopHint: 'Companion state is sourced from backend memory.',
      mood: {
        label: 'Attentive',
        note: 'Companion sees stored spaces.',
      },
      memoryTitle: 'Persisted memory summary',
      memorySummary: 'Known spaces: Alpha Operator.',
      vitals: [
        { label: 'Spaces', value: '1' },
        { label: 'Grants', value: '1' },
      ],
      recentSignals: ['Recent spaces: Alpha Operator'],
      recentInteractions: [
        {
          kind: 'pat',
          title: 'Pat interaction',
          detail: 'A gentle pat settled Mochi and raised the bond signal.',
          timestamp: '2026-04-11T00:00:00.000Z',
          source: 'Companion Action',
        },
      ],
    });

    await app.close();
  });

  it('returns a v2 companion envelope without admin auth', async () => {
    const app = createServer(
      buildDeps({
        getCompanionState: async () => ({
          petName: 'Mochi',
          statusLine: 'Tracking persisted memory.',
          loopMode: 'Backend memory companion',
          lastCheckIn: '2026-04-11T00:00:00.000Z',
          adapterLabel: 'Backend memory endpoint',
          loopHint: 'Companion state is sourced from backend memory.',
          mood: {
            label: 'Attentive',
            note: 'Companion sees stored spaces.',
          },
          memoryTitle: 'Persisted memory summary',
          memorySummary: 'Known spaces: Alpha Operator.',
          vitals: [
            { label: 'Spaces', value: '1' },
            { label: 'Grants', value: '1' },
          ],
          recentSignals: ['Recent spaces: Alpha Operator'],
          recentInteractions: [
            {
              kind: 'pat',
              title: 'Pat interaction',
              detail: 'A gentle pat settled Mochi and raised the bond signal.',
              timestamp: '2026-04-11T00:00:00.000Z',
              source: 'Companion Action',
            },
          ],
        }),
      }),
    );

    const response = await app.inject({ method: 'GET', url: '/companion/state-v2' });
    const data = response.json();

    expect(response.statusCode).toBe(200);
    expect(data.version).toBe('v2');
    expect(data.snapshot.profile.petName).toBe('Mochi');
    expect(data.companion.petName).toBe('Mochi');

    await app.close();
  });

  it('rejects companion actions when auth is neither configured nor explicitly public', async () => {
    const app = createServer(buildDeps());

    const response = await app.inject({
      method: 'POST',
      url: '/companion/actions',
      payload: {
        action: 'pat',
      },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ detail: 'companion_action_auth_unconfigured' });

    await app.close();
  });

  it('accepts public companion actions when explicitly enabled', async () => {
    const captured: Array<Record<string, unknown>> = [];
    const app = createServer(
      buildDeps({
        settings: buildSettings({ publicCompanionActionsEnabled: true }),
        recordCompanionAction: async (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            action: input.action,
            item_key: `action:${input.action}-latest`,
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/companion/actions',
      payload: {
        action: 'pat',
        note: 'soft tap',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([
      {
        action: 'pat',
        note: 'soft tap',
      },
    ]);
    expect(response.json()).toEqual({
      ok: true,
      action: 'pat',
      item_key: 'action:pat-latest',
    });

    const invalid = await app.inject({
      method: 'POST',
      url: '/companion/actions',
      payload: {
        action: 'dance',
      },
    });

    expect(invalid.statusCode).toBe(400);
    expect(invalid.json()).toEqual({ detail: 'action_invalid' });

    await app.close();
  });

  it('requires admin auth for companion actions when auth is configured', async () => {
    const captured: Array<Record<string, unknown>> = [];
    const app = createServer(
      buildDeps({
        settings: buildSettings({ apiKey: 'admin-key' }),
        recordCompanionAction: async (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            action: input.action,
            item_key: `action:${input.action}-latest`,
          };
        },
      }),
    );

    const unauthorized = await app.inject({
      method: 'POST',
      url: '/companion/actions',
      payload: {
        action: 'pat',
      },
    });

    expect(unauthorized.statusCode).toBe(401);
    expect(unauthorized.json()).toEqual({ detail: 'unauthorized' });

    const response = await app.inject({
      method: 'POST',
      url: '/companion/actions',
      headers: {
        'x-api-key': 'admin-key',
      },
      payload: {
        action: 'pat',
        note: 'guarded tap',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([
      {
        action: 'pat',
        note: 'guarded tap',
      },
    ]);

    await app.close();
  });

  it('records pet actions through the protected admin pet route', async () => {
    const captured: Array<Record<string, unknown>> = [];
    const app = createServer(
      buildDeps({
        settings: buildSettings({ apiKey: 'admin-key' }),
        recordCompanionAction: async (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            action: input.action,
            item_key: `action:${input.action}-latest`,
          };
        },
      }),
    );

    const unauthorized = await app.inject({
      method: 'POST',
      url: '/api/admin/pet/actions',
      payload: {
        action: 'feed',
      },
    });

    expect(unauthorized.statusCode).toBe(401);
    expect(unauthorized.json()).toEqual({ detail: 'unauthorized' });

    const invalid = await app.inject({
      method: 'POST',
      url: '/api/admin/pet/actions',
      headers: {
        'x-api-key': 'admin-key',
      },
      payload: {
        action: 'dance',
      },
    });

    expect(invalid.statusCode).toBe(400);
    expect(invalid.json()).toEqual({ detail: 'action_invalid' });

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/pet/actions',
      headers: {
        'x-api-key': 'admin-key',
      },
      payload: {
        action: 'feed',
        note: ' snack top-up ',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([
      {
        action: 'feed',
        note: 'snack top-up',
      },
    ]);
    expect(response.json()).toEqual({
      ok: true,
      action: 'feed',
      item_key: 'action:feed-latest',
    });

    await app.close();
  });

  it('returns readiness payload shape', async () => {
    const app = createServer(buildDeps());

    const response = await app.inject({ method: 'GET', url: '/readiness' });
    const data = response.json();

    expect(response.statusCode).toBe(200);
    expect(data).toHaveProperty('foundation_ready');
    expect(data).toHaveProperty('product_ready');
    expect(data).toHaveProperty('database');
    expect(data).toHaveProperty('redis');
    expect(data).toHaveProperty('config');
    expect(data).toHaveProperty('publish');
    expect(data).toHaveProperty('kill_switch');
    expect(data).toHaveProperty('public_companion_actions_enabled');
    expect(data).toHaveProperty('foundation_ready');
    expect(data).toHaveProperty('delivery_ready');
    expect(data).toHaveProperty('foundation_blockers');
    expect(data).toHaveProperty('delivery_blockers');
    expect(data).toHaveProperty('blocking_reasons');
    expect(data).toHaveProperty('delivery_capability_blockers');
    expect(data).toHaveProperty('delivery_capabilities');
    expect(data).toHaveProperty('delivery_signals');
    expect(data).toHaveProperty('bilibili_diagnostics');
    expect(data).toHaveProperty('product_ready');
    expect(data).toHaveProperty('product_blockers');
    expect(data).toHaveProperty('product_readiness');

    expect(typeof data.database).toBe('object');
    expect(typeof data.redis).toBe('object');
    expect(Array.isArray(data.foundation_blockers)).toBe(true);
    expect(Array.isArray(data.delivery_blockers)).toBe(true);
    expect(Array.isArray(data.blocking_reasons)).toBe(true);
    expect(Array.isArray(data.delivery_capability_blockers)).toBe(true);
    expect(Array.isArray(data.product_blockers)).toBe(true);
    expect(Array.isArray(data.delivery_capabilities.capabilities)).toBe(true);
    expect(typeof data.delivery_signals).toBe('object');
    expect(typeof data.bilibili_diagnostics).toBe('object');
    expect(typeof data.product_ready).toBe('boolean');
    expect(typeof data.product_readiness).toBe('object');
    expect(typeof data.public_companion_actions_enabled).toBe('boolean');
    expect(data.database).toHaveProperty('connected');
    expect(data.redis).toHaveProperty('connected');
    expect(data.config).toMatchObject({
      admin_session_secret_set: false,
      admin_session_ttl_seconds: 60 * 60 * 12,
    });
    expect(data.public_companion_actions_enabled).toBe(false);

    await app.close();
  });

  it('surfaces production auth blockers in product readiness', async () => {
    await withNodeEnv('production', async () => {
      const app = createServer(buildDeps());

      const response = await app.inject({ method: 'GET', url: '/readiness' });
      const data = response.json();

      expect(response.statusCode).toBe(200);
      expect(data.product_ready).toBe(false);
      expect(data.product_blockers).toContain('admin_auth:unconfigured');
      expect(data.product_blockers).toContain('gateway_auth:unconfigured');
      expect(data.product_blockers).toContain('comment_ingress_auth:unconfigured');
      expect(data.product_readiness.admin_control_plane).toMatchObject({
        comment_ingress_auth_configured: false,
      });
      expect(data.product_readiness.bilibili_delivery_contract).toMatchObject({
        gateway_auth_configured: false,
      });

      await app.close();
    });
  });

  it('surfaces product readiness for the bilibili-first admin/backend/companion MVP scope', async () => {
    const app = createServer(
      buildDeps({
        settings: buildSettings({
          apiKey: 'admin-key',
          commentIngressToken: 'comment-token',
          gatewayToken: 'gateway-token',
          gatewayHmacSecret: 'gateway-hmac-secret',
          llmProvider: 'openai',
          llmApiKeyConfigured: true,
          llmFallbackToMock: false,
          searchApiKeyConfigured: true,
          publisherMode: 'webhook',
          publisherWebhookUrlConfigured: true,
        }),
        getCompanionStateV2: async () => ({
          version: 'v2',
          snapshot: {
            profile: {
              petName: 'Mochi',
              species: 'fox spirit',
              archetype: 'listener',
            },
            relationship: {
              level: 'bonded',
              note: 'Operators keep the loop healthy.',
            },
            progress: {
              stage: 'growth',
              progressLabel: 'Trial-ready',
              nextMilestone: 'Multi-platform signoff',
            },
            needs: [{ key: 'energy', label: 'Energy', value: 'Stable', trend: 'steady' }],
            proactiveSignals: [
              {
                key: 'checkin',
                label: 'Check-in',
                detail: 'Prompt the operator to review the douyin rollout.',
                dueAt: '2026-04-13T00:00:00.000Z',
              },
            ],
          },
          companion: {
            petName: 'Mochi',
            statusLine: 'Trial controls are armed.',
            loopMode: 'Pet-core',
            lastCheckIn: '2026-04-13T00:00:00.000Z',
            adapterLabel: 'Pet-core service',
            loopHint: 'State comes from the persisted pet core.',
            mood: {
              label: 'Confident',
              note: 'The companion is ready for a staged external rollout.',
            },
            memoryTitle: 'Pet-core summary',
            memorySummary: 'Companion state is live.',
            vitals: [{ label: 'Signals', value: '1' }],
            recentSignals: ['Douyin trial connected'],
            recentInteractions: [
              {
                kind: 'signal',
                title: 'Trial ready',
                detail: 'The douyin sidecar is connected.',
                timestamp: '2026-04-13T00:00:00.000Z',
                source: 'System',
              },
            ],
          },
        }),
        listPlatformConnections: async () => ({
          ok: true,
          items: [
            {
              platform: 'bilibili',
              enabled: true,
              adapterKey: 'bilibili-reference',
              status: 'connected',
              lastCheckedAt: null,
              lastError: null,
              rolloutControl: {
                enabled: true,
                stage: 'trial',
                updatedAt: '2026-04-13T00:00:00.000Z',
              },
              capabilities: [
                { key: 'ingress', status: 'available' },
                { key: 'publish', status: 'available' },
              ],
            },
          ],
        }),
        buildBilibiliDiagnostics: async () => ({
          ready: true,
          blocking_reasons: [],
          effective_publish_mode: 'webhook',
          checks: {
            worker_or_publish: { ready: true, errors: [] },
          },
          release_gates: {
            worker_or_publish_ready: true,
          },
          signals: {},
        }),
      }),
    );

    const response = await app.inject({ method: 'GET', url: '/readiness' });
    const data = response.json();

    expect(response.statusCode).toBe(200);
    expect(data.product_ready).toBe(true);
    expect(data.product_blockers).toEqual([]);
    expect(data.completion_matrix).toMatchObject({
      scope: 'repo_controlled_product_completion',
      total: 100,
      categories: {
        ui_ux: 100,
        frontend: 100,
        backend: 100,
        frontend_backend_loop: 100,
        test: 100,
        deploy: 100,
      },
    });
    expect(data.product_readiness.scope).toMatchObject({
      key: 'bilibili_first_admin_companion_mvp',
      summary: 'Bilibili-first admin/backend/companion MVP',
      signed_off_surfaces: ['admin_control_plane', 'bilibili_delivery_contract', 'pet_core', 'companion_surface'],
      gated_surfaces: ['external_platform_trial'],
      excluded_surfaces: [],
    });
    expect(data.product_readiness.admin_control_plane).toMatchObject({
      ready: true,
      auth_configured: true,
      comment_ingress_auth_configured: true,
      public_companion_actions_enabled: false,
      platform_status_available: true,
    });
    expect(data.product_readiness.bilibili_delivery_contract).toMatchObject({
      ready: true,
      effective_publish_mode: 'webhook',
    });
    expect(data.product_readiness.pet_core).toMatchObject({
      ready: true,
      signed_off: true,
      pet_name: 'Mochi',
      proactive_signal_count: 1,
    });
    expect(data.product_readiness.companion_surface).toMatchObject({
      ready: true,
      signed_off: true,
      pet_name: 'Mochi',
      protected_actions_required: true,
    });
    expect(data.product_readiness.external_platform_trial).toMatchObject({
      ready: false,
      signed_off: false,
    });
    expect(data.product_readiness.completion_matrix.total).toBe(100);
    expect(data.product_readiness.external_platform_trial.active_platforms).toEqual([]);

    await app.close();
  });

  it('marks external sidecar platforms as degraded until their webhooks are configured and keeps bilibili aligned with legacy runtime', async () => {
    const originalQqWebhook = process.env.PLATFORM_QQ_WEBHOOK_URL;
    const originalDouyinWebhook = process.env.PLATFORM_DOUYIN_WEBHOOK_URL;
    delete process.env.PLATFORM_QQ_WEBHOOK_URL;
    delete process.env.PLATFORM_DOUYIN_WEBHOOK_URL;

    const app = createServer(
      buildDeps({
        settings: buildSettings({
          bilibiliEnabled: true,
          platformBilibiliEnabled: false,
          platformQqEnabled: true,
          platformDouyinEnabled: true,
        }),
      }),
    );

    const response = await app.inject({ method: 'GET', url: '/api/admin/platforms' });
    const data = response.json();
    const bilibili = data.items.find((entry: { platform: string }) => entry.platform === 'bilibili');
    const qq = data.items.find((entry: { platform: string }) => entry.platform === 'qq');
    const douyin = data.items.find((entry: { platform: string }) => entry.platform === 'douyin');

    expect(response.statusCode).toBe(200);
    expect(bilibili).toMatchObject({
      platform: 'bilibili',
      enabled: true,
      status: 'connected',
    });
    expect(qq).toMatchObject({
      platform: 'qq',
      enabled: true,
      status: 'degraded',
      lastError: 'sidecar webhook is not configured',
    });
    expect(qq.capabilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'publish',
          status: 'partial',
        }),
      ]),
    );
    expect(douyin).toMatchObject({
      platform: 'douyin',
      enabled: true,
      status: 'degraded',
      lastError: 'sidecar webhook is not configured',
    });
    expect(douyin.capabilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'publish',
          status: 'partial',
        }),
      ]),
    );

    await app.close();
    if (originalQqWebhook === undefined) {
      delete process.env.PLATFORM_QQ_WEBHOOK_URL;
    } else {
      process.env.PLATFORM_QQ_WEBHOOK_URL = originalQqWebhook;
    }
    if (originalDouyinWebhook === undefined) {
      delete process.env.PLATFORM_DOUYIN_WEBHOOK_URL;
    } else {
      process.env.PLATFORM_DOUYIN_WEBHOOK_URL = originalDouyinWebhook;
    }
  });

  it('returns canonical delivery capability names and statuses', async () => {
    const app = createServer(
      buildDeps({
        settings: buildSettings({
          llmProvider: 'openai',
          llmApiKeyConfigured: true,
          llmFallbackToMock: false,
          searchProvider: 'google',
          searchApiKeyConfigured: false,
          searchCxConfigured: false,
          publisherMode: 'webhook',
          publisherWebhookUrlConfigured: false,
        }),
        buildBilibiliDiagnostics: async () => ({
          ready: false,
          blocking_reasons: ['publish:webhook_not_configured'],
          effective_publish_mode: 'webhook',
          checks: {
            worker_or_publish: { ready: false, errors: ['webhook_not_configured'] },
          },
          release_gates: {
            worker_or_publish_ready: false,
          },
          signals: {},
        }),
      }),
    );

    const response = await app.inject({ method: 'GET', url: '/readiness' });
    const data = response.json();
    const names = (data.delivery_capabilities.capabilities as Array<{ capability: string }>).map(
      (entry) => entry.capability,
    );

    expect(response.statusCode).toBe(200);
    expect(names).toEqual([
      'llm_generation',
      'search_enrichment',
      'webhook_publish',
      'native_bilibili_publish',
      'comment_ingress_auth',
    ]);
    expect(data.delivery_capabilities.summary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ capability: 'llm_generation', status: 'configured' }),
        expect.objectContaining({ capability: 'search_enrichment', status: 'missing_inputs' }),
        expect.objectContaining({ capability: 'webhook_publish', status: 'missing_inputs' }),
        expect.objectContaining({ capability: 'native_bilibili_publish', status: 'inactive' }),
        expect.objectContaining({ capability: 'comment_ingress_auth', status: 'missing_inputs' }),
      ]),
    );
    expect(data.delivery_capability_blockers).toEqual(
      expect.arrayContaining(['search_enrichment', 'webhook_publish', 'comment_ingress_auth']),
    );
    expect(data.delivery_ready).toBe(false);

    await app.close();
  });

  it('marks native capability as runtime_credentials_required when native publish is blocked by auth', async () => {
    const app = createServer(
      buildDeps({
        settings: buildSettings({
          publisherMode: 'manual_queue',
          bilibiliEnabled: true,
          bilibiliPublishEnabled: true,
        }),
        buildBilibiliDiagnostics: async () => ({
          ready: false,
          blocking_reasons: ['auth:no active credential'],
          effective_publish_mode: 'native_bilibili',
          checks: {
            worker_or_publish: {
              ready: false,
              errors: ['no active credential'],
            },
          },
          release_gates: {
            worker_or_publish_ready: false,
          },
          signals: {},
        }),
      }),
    );

    const response = await app.inject({ method: 'GET', url: '/readiness' });
    const data = response.json();
    const nativeEntry = (data.delivery_capabilities.capabilities as Array<{ capability: string; status: string }>).find(
      (entry) => entry.capability === 'native_bilibili_publish',
    );

    expect(response.statusCode).toBe(200);
    expect(nativeEntry).toEqual(expect.objectContaining({ status: 'runtime_credentials_required' }));
    expect(data.delivery_capability_blockers).toContain('native_bilibili_publish');
    expect(data.delivery_blockers).toContain('bilibili:auth:no active credential');

    await app.close();
  });

  it('reflects database failure in foundation and delivery blockers', async () => {
    const app = createServer(
      buildDeps({
        checkDatabaseConnection: async () => ({ connected: false, error: 'connection failed' }),
      }),
    );

    const response = await app.inject({ method: 'GET', url: '/readiness' });
    const data = response.json();

    expect(data.foundation_ready).toBe(false);
    expect(data.database.connected).toBe(false);
    expect(data.foundation_ready).toBe(false);
    expect(data.delivery_ready).toBe(false);
    expect(data.database).toHaveProperty('error');
    expect(data.foundation_blockers.some((reason: string) => reason.startsWith('database:'))).toBe(true);
    expect(data.delivery_blockers.some((reason: string) => reason.startsWith('database:'))).toBe(true);

    await app.close();
  });

  it('reflects redis failure in foundation and delivery blockers', async () => {
    const app = createServer(
      buildDeps({
        checkRedisConnection: async () => ({ connected: false, error: 'redis_unavailable' }),
      }),
    );

    const response = await app.inject({ method: 'GET', url: '/readiness' });
    const data = response.json();

    expect(data.foundation_ready).toBe(false);
    expect(data.redis.connected).toBe(false);
    expect(data.foundation_ready).toBe(false);
    expect(data.delivery_ready).toBe(false);
    expect(data.redis).toHaveProperty('error');
    expect(data.foundation_blockers.some((reason: string) => reason.startsWith('redis:'))).toBe(true);
    expect(data.delivery_blockers.some((reason: string) => reason.startsWith('redis:'))).toBe(true);

    await app.close();
  });

  it('adds bilibili blockers for native publish mode diagnostics', async () => {
    const app = createServer(
      buildDeps({
        buildBilibiliDiagnostics: async () => ({
          ready: false,
          blocking_reasons: ['auth:no active credential'],
          effective_publish_mode: 'native_bilibili',
          signals: {},
        }),
      }),
    );

    const response = await app.inject({ method: 'GET', url: '/readiness' });
    const data = response.json();

    expect(data.foundation_ready).toBe(true);
    expect(data.foundation_ready).toBe(true);
    expect(data.delivery_ready).toBe(false);
    expect(data.delivery_blockers).toContain('bilibili:auth:no active credential');

    await app.close();
  });

  it('allows webhook mode with worker_or_publish gate', async () => {
    const app = createServer(
      buildDeps({
        settings: buildSettings({
          publisherMode: 'webhook',
          publisherWebhookUrlConfigured: true,
          llmProvider: 'openai',
          llmApiKeyConfigured: true,
          llmFallbackToMock: false,
          searchProvider: 'serpapi',
          searchApiKeyConfigured: true,
          commentIngressToken: 'comment-token',
        }),
        buildBilibiliDiagnostics: async () => ({
          ready: false,
          blocking_reasons: ['config:bilibili_enabled is false'],
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
        }),
      }),
    );

    const response = await app.inject({ method: 'GET', url: '/readiness' });
    const data = response.json();

    expect(data.foundation_ready).toBe(true);
    expect(data.foundation_ready).toBe(true);
    expect(data.delivery_ready).toBe(true);
    expect(data.delivery_capability_blockers).toEqual([]);
    expect(data.delivery_blockers).not.toContain('bilibili:delivery_diagnostics_not_ready');
    expect(data.delivery_blockers.some((reason: string) => reason.startsWith('bilibili:config:'))).toBe(false);

    await app.close();
  });

  it('keeps simulated mode blocked', async () => {
    const app = createServer(
      buildDeps({
        settings: buildSettings({ publisherMode: 'simulated' }),
        buildBilibiliDiagnostics: async () => ({
          ready: false,
          blocking_reasons: [],
          effective_publish_mode: 'simulated',
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
        }),
      }),
    );

    const response = await app.inject({ method: 'GET', url: '/readiness' });
    const data = response.json();

    expect(data.foundation_ready).toBe(true);
    expect(data.foundation_ready).toBe(true);
    expect(data.delivery_ready).toBe(false);
    expect(data.delivery_blockers).toContain('bilibili:publish_mode_not_delivery_capable:simulated');
    expect(data.delivery_blockers).toContain('bilibili:delivery_diagnostics_not_ready');

    await app.close();
  });
});

describe('gateway/auth parity', () => {
  const basePayload = {
    comment_id: 'comment-1',
    reply_text: 'reply text',
  };

  it('rejects production gateway publish when auth gates are unconfigured', async () => {
    await withNodeEnv('production', async () => {
      const app = createServer(buildDeps());

      const response = await app.inject({
        method: 'POST',
        url: '/gateway/publish',
        payload: basePayload,
      });

      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({ detail: 'gateway_auth_unconfigured' });

      await app.close();
    });
  });

  it('rejects invalid bearer token', async () => {
    const app = createServer(
      buildDeps({
        settings: buildSettings({ gatewayToken: 'gateway-token' }),
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/gateway/publish',
      payload: basePayload,
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ detail: 'unauthorized' });

    await app.close();
  });

  it('rejects invalid signature', async () => {
    const app = createServer(
      buildDeps({
        settings: buildSettings({ gatewayHmacSecret: 'gateway-hmac' }),
        verifyPayloadSignature: () => false,
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/gateway/publish',
      payload: basePayload,
      headers: {
        'x-signature': 'invalid-signature',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ detail: 'invalid_signature' });

    await app.close();
  });

  it('returns duplicate replay contract and skips publisher', async () => {
    let publishCalled = false;

    const app = createServer(
      buildDeps({
        reservePublishLog: () => ({ duplicate: true, reservationKey: 'existing' }),
        publishGatewayReply: () => {
          publishCalled = true;
          return { published: true, reason: 'should_not_happen' };
        },
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/gateway/publish',
      payload: {
        ...basePayload,
        source: 'gateway',
        trace_id: 'trace-dup-1',
      },
    });

    const body = response.json();
    expect(response.statusCode).toBe(200);
    expect(publishCalled).toBe(false);
    expect(body).toEqual({
      ok: true,
      published: false,
      duplicate: true,
      reason: 'idempotent_replay',
      trace_id: 'trace-dup-1',
    });

    await app.close();
  });

  it('publishes successfully and keeps adapter reason', async () => {
    const finalized: Array<Record<string, unknown>> = [];
    let capturedInput: Record<string, unknown> | null = null;

    const app = createServer(
      buildDeps({
        settings: buildSettings({
          gatewayToken: 'gateway-token',
          gatewayHmacSecret: 'gateway-hmac',
        }),
        verifyPayloadSignature: () => true,
        reservePublishLog: () => ({ duplicate: false, reservationKey: 'reservation-1' }),
        finalizePublishLog: (input) => {
          finalized.push(input as unknown as Record<string, unknown>);
        },
        publishGatewayReply: (input) => {
          capturedInput = input as unknown as Record<string, unknown>;
          return {
            published: true,
            reason: 'official_publish_ok',
            publishedAt: new Date('2026-03-07T01:00:00.000Z'),
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/gateway/publish',
      payload: {
        comment_id: 'comment-3',
        reply_text: 'reply text',
        force_publish: true,
        source: 'gateway',
        trace_id: 'trace-3',
      },
      headers: {
        authorization: 'Bearer gateway-token',
        'x-signature': 'a'.repeat(64),
      },
    });

    const body = response.json();
    expect(response.statusCode).toBe(200);
    expect(body).toEqual({
      ok: true,
      published: true,
      reason: 'official_publish_ok',
      comment_id: 'comment-3',
      published_at: '2026-03-07T01:00:00.000Z',
      trace_id: 'trace-3',
    });
    expect(capturedInput).toEqual({
      commentId: 'comment-3',
      replyText: 'reply text',
      forcePublish: true,
      source: 'gateway',
      traceId: 'trace-3',
    });
    expect(finalized).toHaveLength(1);
    expect(finalized[0]).toMatchObject({
      reservationKey: 'reservation-1',
      status: 'published',
      source: 'gateway',
    });

    await app.close();
  });

  it('normalizes publish failure reason and finalizes failed log', async () => {
    const finalized: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        reservePublishLog: () => ({ duplicate: false, reservationKey: 'reservation-fail' }),
        finalizePublishLog: (input) => {
          finalized.push(input as unknown as Record<string, unknown>);
        },
        publishGatewayReply: () => ({
          published: false,
          reason: 'real_publish_error:ReadTimeout',
        }),
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/gateway/publish',
      payload: {
        comment_id: 'comment-5',
        reply_text: 'reply text',
        source: 'gateway',
        trace_id: 'trace-5',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: false,
      published: false,
      reason: 'timeout',
      comment_id: 'comment-5',
      trace_id: 'trace-5',
    });
    expect(finalized).toEqual([
      {
        reservationKey: 'reservation-fail',
        status: 'failed',
        source: 'gateway',
        failureReason: 'timeout',
      },
    ]);

    await app.close();
  });

  it('returns platform_disabled for disabled platform routes', async () => {
    const app = createServer(
      buildDeps({
        settings: buildSettings({
          platformBilibiliEnabled: false,
          platformQqEnabled: false,
          platformDouyinEnabled: false,
          platformKuaishouEnabled: false,
        }),
      }),
    );

    const bilibili = await app.inject({ method: 'POST', url: '/gateway/publish/bilibili', payload: basePayload });
    const qq = await app.inject({ method: 'POST', url: '/gateway/publish/qq', payload: basePayload });
    const douyin = await app.inject({ method: 'POST', url: '/gateway/publish/douyin', payload: basePayload });
    const kuaishou = await app.inject({ method: 'POST', url: '/gateway/publish/kuaishou', payload: basePayload });

    expect(bilibili.statusCode).toBe(403);
    expect(qq.statusCode).toBe(403);
    expect(douyin.statusCode).toBe(403);
    expect(kuaishou.statusCode).toBe(403);
    expect(bilibili.json()).toEqual({ detail: 'platform_disabled' });
    expect(qq.json()).toEqual({ detail: 'platform_disabled' });
    expect(douyin.json()).toEqual({ detail: 'platform_disabled' });
    expect(kuaishou.json()).toEqual({ detail: 'platform_disabled' });

    await app.close();
  });

  it('uses platform adapter and configured platform source for bilibili route', async () => {
    const finalized: Array<Record<string, unknown>> = [];
    let capturedInput: Record<string, unknown> | null = null;

    const app = createServer(
      buildDeps({
        settings: buildSettings({
          platformBilibiliEnabled: true,
          platformBilibiliPublishSource: 'bilibili-open',
        }),
        reservePublishLog: () => ({ duplicate: false, reservationKey: 'reservation-bili' }),
        finalizePublishLog: (input) => {
          finalized.push(input as unknown as Record<string, unknown>);
        },
        publishPlatformReply: (input) => {
          capturedInput = input as unknown as Record<string, unknown>;
          return {
            published: true,
            reason: 'platform_publish_ok',
            publishedAt: new Date('2026-03-07T02:00:00.000Z'),
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/gateway/publish/bilibili',
      payload: {
        comment_id: 'comment-bili-1',
        reply_text: 'reply text',
        force_publish: true,
        trace_id: 'trace-bili-1',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      published: true,
      reason: 'platform_publish_ok',
      comment_id: 'comment-bili-1',
      published_at: '2026-03-07T02:00:00.000Z',
      trace_id: 'trace-bili-1',
    });
    expect(capturedInput).toEqual({
      platform: 'bilibili',
      commentId: 'comment-bili-1',
      replyText: 'reply text',
      forcePublish: true,
      traceId: 'trace-bili-1',
    });
    expect(finalized).toHaveLength(1);
    expect(finalized[0]).toMatchObject({
      reservationKey: 'reservation-bili',
      status: 'published',
      source: 'bilibili-open',
    });

    await app.close();
  });

  it('uses fallback source when douyin publish source is empty', async () => {
    const finalized: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        settings: buildSettings({
          platformDouyinEnabled: true,
          platformDouyinPublishSource: '',
        }),
        reservePublishLog: () => ({ duplicate: false, reservationKey: 'reservation-dy' }),
        finalizePublishLog: (input) => {
          finalized.push(input as unknown as Record<string, unknown>);
        },
        publishPlatformReply: () => ({
          published: true,
          reason: 'platform_publish_ok',
          publishedAt: new Date('2026-03-07T02:30:00.000Z'),
        }),
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/gateway/publish/douyin',
      payload: {
        comment_id: 'comment-douyin-1',
        reply_text: 'reply text',
        trace_id: 'trace-douyin-1',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().ok).toBe(true);
    expect(finalized).toHaveLength(1);
    expect(finalized[0]).toMatchObject({
      source: 'douyin-bot',
      status: 'published',
    });

    await app.close();
  });

  it('allows operators to pause and resume a platform trial', async () => {
    const app = createServer(
      buildDeps({
        settings: buildSettings({
          platformDouyinEnabled: true,
        }),
        reservePublishLog: () => ({ duplicate: false, reservationKey: 'reservation-douyin-control' }),
        finalizePublishLog: () => undefined,
        publishPlatformReply: () => ({
          published: true,
          reason: 'trial_publish_ok',
          publishedAt: new Date('2026-03-07T02:30:00.000Z'),
        }),
      }),
    );

    const paused = await app.inject({
      method: 'POST',
      url: '/api/admin/platforms/douyin/control',
      payload: { enabled: false },
    });
    expect(paused.statusCode).toBe(200);
    expect(paused.json().item.rolloutControl.enabled).toBe(false);

    const blocked = await app.inject({
      method: 'POST',
      url: '/gateway/publish/douyin',
      payload: {
        comment_id: 'comment-douyin-2',
        reply_text: 'reply text',
        trace_id: 'trace-douyin-2',
      },
    });
    expect(blocked.statusCode).toBe(403);

    const resumed = await app.inject({
      method: 'POST',
      url: '/api/admin/platforms/douyin/control',
      payload: { enabled: true },
    });
    expect(resumed.statusCode).toBe(200);
    expect(resumed.json().item.rolloutControl.enabled).toBe(true);

    const allowed = await app.inject({
      method: 'POST',
      url: '/gateway/publish/douyin',
      payload: {
        comment_id: 'comment-douyin-2',
        reply_text: 'reply text',
        trace_id: 'trace-douyin-2',
      },
    });
    expect(allowed.statusCode).toBe(200);
    expect(allowed.json().published).toBe(true);

    await app.close();
  });

  it('keeps platform rollout controls durable across server restarts', async () => {
    const tempDir = useIsolatedPlatformControlState('platform-control-main-');
    resetPlatformControlState();

    const { createServer: createFirstServer } = await import('../src/main.js');
    const firstApp = createFirstServer(
      buildDeps({
        settings: buildSettings({
          platformDouyinEnabled: true,
        }),
      }),
    );

    const paused = await firstApp.inject({
      method: 'POST',
      url: '/api/admin/platforms/douyin/control',
      payload: { enabled: false },
    });
    expect(paused.statusCode).toBe(200);
    await firstApp.close();

    vi.resetModules();
    const { createServer: createSecondServer } = await import('../src/main.js');
    const secondApp = createSecondServer(
      buildDeps({
        settings: buildSettings({
          platformDouyinEnabled: true,
        }),
      }),
    );

    const platformResponse = await secondApp.inject({ method: 'GET', url: '/api/admin/platforms' });
    const douyin = platformResponse.json().items.find((entry: { platform: string }) => entry.platform === 'douyin');
    expect(douyin).toMatchObject({
      platform: 'douyin',
      enabled: false,
      rolloutControl: {
        enabled: false,
        stage: 'paused',
      },
    });

    const blocked = await secondApp.inject({
      method: 'POST',
      url: '/gateway/publish/douyin',
      payload: {
        comment_id: 'comment-durable-douyin',
        reply_text: 'reply text',
      },
    });
    expect(blocked.statusCode).toBe(403);

    await secondApp.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('uses the default sidecar webhook publisher for douyin when configured', async () => {
    const originalUrl = process.env.PLATFORM_DOUYIN_WEBHOOK_URL;
    const originalToken = process.env.PLATFORM_DOUYIN_WEBHOOK_TOKEN;
    process.env.PLATFORM_DOUYIN_WEBHOOK_URL = 'https://sidecar.example.test/publish';
    process.env.PLATFORM_DOUYIN_WEBHOOK_TOKEN = 'secret-token';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        published: true,
        reason: 'sidecar_publish_ok',
        published_at: '2026-03-07T03:00:00.000Z',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const finalized: Array<Record<string, unknown>> = [];
    const app = createServer(
      buildDeps({
        settings: buildSettings({
          platformDouyinEnabled: true,
        }),
        reservePublishLog: () => ({ duplicate: false, reservationKey: 'reservation-dy-sidecar' }),
        finalizePublishLog: (input) => {
          finalized.push(input as unknown as Record<string, unknown>);
        },
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/gateway/publish/douyin',
      payload: {
        comment_id: 'comment-douyin-sidecar',
        reply_text: 'reply text',
        trace_id: 'trace-douyin-sidecar',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      published: true,
      reason: 'sidecar_publish_ok',
      comment_id: 'comment-douyin-sidecar',
      published_at: '2026-03-07T03:00:00.000Z',
      trace_id: 'trace-douyin-sidecar',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://sidecar.example.test/publish',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer secret-token',
        }),
      }),
    );
    expect(finalized[0]).toMatchObject({
      source: 'douyin-bot',
      status: 'published',
    });

    await app.close();
    vi.unstubAllGlobals();
    if (originalUrl === undefined) {
      delete process.env.PLATFORM_DOUYIN_WEBHOOK_URL;
    } else {
      process.env.PLATFORM_DOUYIN_WEBHOOK_URL = originalUrl;
    }
    if (originalToken === undefined) {
      delete process.env.PLATFORM_DOUYIN_WEBHOOK_TOKEN;
    } else {
      process.env.PLATFORM_DOUYIN_WEBHOOK_TOKEN = originalToken;
    }
  });

  it('uses the default sidecar webhook publisher for qq when configured', async () => {
    const originalUrl = process.env.PLATFORM_QQ_WEBHOOK_URL;
    const originalToken = process.env.PLATFORM_QQ_WEBHOOK_TOKEN;
    process.env.PLATFORM_QQ_WEBHOOK_URL = 'https://qq-sidecar.example.test/publish';
    process.env.PLATFORM_QQ_WEBHOOK_TOKEN = 'qq-secret-token';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        published: true,
        reason: 'qq_sidecar_publish_ok',
        published_at: '2026-04-14T12:30:00.000Z',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const finalized: Array<Record<string, unknown>> = [];
    const app = createServer(
      buildDeps({
        settings: buildSettings({
          platformQqEnabled: true,
          platformQqPublishSource: 'qq-sidecar',
        }),
        reservePublishLog: () => ({ duplicate: false, reservationKey: 'reservation-qq-sidecar' }),
        finalizePublishLog: (input) => {
          finalized.push(input as unknown as Record<string, unknown>);
        },
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/gateway/publish/qq',
      payload: {
        comment_id: 'comment-qq-sidecar',
        canonical_id: 'qq:comment-qq-sidecar',
        container_id: 'group-42',
        user_id: 'user-42',
        parent_external_id: 'message-0',
        routing_metadata: {
          chat_type: 'group',
          adapter: 'napcat',
        },
        reply_text: 'reply text',
        trace_id: 'trace-qq-sidecar',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      published: true,
      reason: 'qq_sidecar_publish_ok',
      comment_id: 'comment-qq-sidecar',
      published_at: '2026-04-14T12:30:00.000Z',
      trace_id: 'trace-qq-sidecar',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://qq-sidecar.example.test/publish',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer qq-secret-token',
        }),
        body: JSON.stringify({
          platform: 'qq',
          target_kind: 'comment-reply',
          comment_id: 'comment-qq-sidecar',
          canonical_id: 'qq:comment-qq-sidecar',
          container_id: 'group-42',
          parent_external_id: 'message-0',
          routing_metadata: {
            chat_type: 'group',
            adapter: 'napcat',
            user_id: 'user-42',
          },
          reply_text: 'reply text',
          force_publish: false,
          trace_id: 'trace-qq-sidecar',
        }),
      }),
    );
    expect(finalized[0]).toMatchObject({
      source: 'qq-sidecar',
      status: 'published',
    });

    await app.close();
    vi.unstubAllGlobals();
    if (originalUrl === undefined) {
      delete process.env.PLATFORM_QQ_WEBHOOK_URL;
    } else {
      process.env.PLATFORM_QQ_WEBHOOK_URL = originalUrl;
    }
    if (originalToken === undefined) {
      delete process.env.PLATFORM_QQ_WEBHOOK_TOKEN;
    } else {
      process.env.PLATFORM_QQ_WEBHOOK_TOKEN = originalToken;
    }
  });

  it('passes QQ route context through platform publish input when a platform route is mocked', async () => {
    let capturedInput: Record<string, unknown> | null = null;

    const app = createServer(
      buildDeps({
        settings: buildSettings({
          platformQqEnabled: true,
        }),
        reservePublishLog: () => ({ duplicate: false, reservationKey: 'reservation-qq-context' }),
        finalizePublishLog: () => undefined,
        publishPlatformReply: (input) => {
          capturedInput = input as unknown as Record<string, unknown>;
          return {
            published: true,
            reason: 'platform_publish_ok',
            publishedAt: new Date('2026-04-14T13:00:00.000Z'),
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/gateway/publish/qq',
      payload: {
        comment_id: 'message-qq-1',
        canonical_id: 'qq:message-qq-1',
        container_id: 'group-99',
        user_id: 'user-99',
        parent_external_id: 'message-root',
        routing_metadata: {
          chat_type: 'group',
          adapter: 'napcat',
        },
        reply_text: 'reply text',
        force_publish: true,
        trace_id: 'trace-qq-1',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(capturedInput).toEqual({
      platform: 'qq',
      commentId: 'message-qq-1',
      canonicalId: 'qq:message-qq-1',
      containerId: 'group-99',
      userId: 'user-99',
      parentExternalId: 'message-root',
      routingMetadata: {
        chat_type: 'group',
        adapter: 'napcat',
      },
      replyText: 'reply text',
      forcePublish: true,
      traceId: 'trace-qq-1',
    });

    await app.close();
  });

  it('standardizes gateway publish failure reasons', async () => {
    const cases = [
      { input: 'upstream_status_502', expected: '5xx' },
      { input: 'invalid_signature', expected: 'auth' },
      { input: '', expected: 'invalid_response' },
    ];

    for (const testCase of cases) {
      const app = createServer(
        buildDeps({
          reservePublishLog: () => ({ duplicate: false, reservationKey: `reservation-${testCase.expected}` }),
          finalizePublishLog: () => undefined,
          publishGatewayReply: () => ({ published: false, reason: testCase.input }),
        }),
      );

      const response = await app.inject({
        method: 'POST',
        url: '/gateway/publish',
        payload: {
          comment_id: `comment-${testCase.expected}`,
          reply_text: 'reply text',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().reason).toBe(testCase.expected);

      await app.close();
    }
  });
});

describe('admin api parity', () => {
  it('rejects production admin API access when auth is unconfigured', async () => {
    await withNodeEnv('production', async () => {
      const app = createServer(buildDeps());

      const response = await app.inject({
        method: 'GET',
        url: '/api/admin/overview',
      });

      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({ detail: 'admin_auth_unconfigured' });

      await app.close();
    });
  });

  it('requires x-api-key when configured', async () => {
    const app = createServer(
      buildDeps({
        settings: buildSettings({ apiKey: 'admin-key' }),
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/overview',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ detail: 'unauthorized' });

    await app.close();
  });

  it('issues admin session tokens via login endpoint', async () => {
    const app = createServer(
      buildDeps({
        settings: buildSettings({ apiKey: 'admin-key' }),
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/session/login',
      payload: {
        api_key: 'admin-key',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      session_token: expect.any(String),
      expires_at: expect.any(String),
    });

    await app.close();
  });

  it('rejects admin session login when auth is unconfigured', async () => {
    const app = createServer(buildDeps());

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/session/login',
      payload: {
        api_key: 'anything',
      },
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ detail: 'admin_auth_unconfigured' });

    await app.close();
  });

  it('rejects admin session login for wrong api key', async () => {
    const app = createServer(
      buildDeps({
        settings: buildSettings({ apiKey: 'admin-key' }),
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/session/login',
      payload: {
        api_key: 'wrong-key',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ detail: 'unauthorized' });

    await app.close();
  });

  it('accepts x-admin-session for protected admin routes', async () => {
    const app = createServer(
      buildDeps({
        settings: buildSettings({ apiKey: 'admin-key' }),
        getAdminOverview: () => ({
          totals: { jobs: 3 },
          generated_at: '2026-03-08T00:00:00.000Z',
        }),
      }),
    );

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/session/login',
      payload: {
        api_key: 'admin-key',
      },
    });
    const sessionToken = loginResponse.json().session_token;

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/overview',
      headers: {
        'x-admin-session': sessionToken,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      totals: { jobs: 3 },
    });

    await app.close();
  });

  it('accepts x-admin-session for companion actions', async () => {
    const captured: Array<Record<string, unknown>> = [];
    const app = createServer(
      buildDeps({
        settings: buildSettings({ apiKey: 'admin-key' }),
        recordCompanionAction: async (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            action: input.action,
            item_key: `action:${input.action}-latest`,
          };
        },
      }),
    );

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/session/login',
      payload: {
        api_key: 'admin-key',
      },
    });
    const sessionToken = loginResponse.json().session_token;

    const response = await app.inject({
      method: 'POST',
      url: '/companion/actions',
      headers: {
        'x-admin-session': sessionToken,
      },
      payload: {
        action: 'feed',
        note: 'session snack',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([
      {
        action: 'feed',
        note: 'session snack',
      },
    ]);

    await app.close();
  });

  it('supports overview alias endpoint with auth parity', async () => {
    const app = createServer(
      buildDeps({
        settings: buildSettings({ apiKey: 'admin-key' }),
        getAdminOverview: () => ({
          totals: { jobs: 5 },
          generated_at: '2026-03-08T00:00:00.000Z',
        }),
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/metrics/overview',
      headers: {
        'x-api-key': 'admin-key',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      totals: { jobs: 5 },
      generated_at: '2026-03-08T00:00:00.000Z',
    });

    await app.close();
  });

  it('normalizes jobs query params and keeps list response shape', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        listAdminJobs: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            items: [{ id: 'job-1', status: 'done' }],
            total: 1,
            limit: input.limit,
            offset: input.offset,
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/jobs?status=%20done%20&limit=2000&offset=-9',
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([
      {
        status: 'done',
        limit: 1000,
        offset: 0,
      },
    ]);
    expect(response.json()).toMatchObject({
      items: [{ id: 'job-1', status: 'done' }],
      total: 1,
      limit: 1000,
      offset: 0,
    });

    await app.close();
  });

  it('normalizes audit summary query and supports alias endpoint', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        summarizeAdminAuditLogs: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            days: input.days,
            totals: { audit_logs: 3, ok: 2, failed: 1 },
            by_action: { publish: 3 },
            by_result: { success: 2, failed: 1 },
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/audit-logs/summary?days=999&action=%20publish%20&ok=yes',
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([
      {
        days: 90,
        action: 'publish',
        ok: true,
      },
    ]);
    expect(response.json()).toEqual({
      ok: true,
      days: 90,
      totals: { audit_logs: 3, ok: 2, failed: 1 },
      by_action: { publish: 3 },
      by_result: { success: 2, failed: 1 },
    });

    await app.close();
  });

  it('normalizes gateway log timestamps and supports publish-logs alias', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        listAdminGatewayLogs: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            items: [
              {
                comment_id: 'comment-1',
                published_at: new Date('2026-03-08T12:00:00.000Z'),
                created_at: 'invalid-date',
              },
            ],
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/gateway/publish-logs?comment_id=%20comment-1%20&limit=999',
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([
      {
        commentId: 'comment-1',
        limit: 200,
      },
    ]);
    expect(response.json()).toEqual({
      items: [
        {
          comment_id: 'comment-1',
          published_at: '2026-03-08T12:00:00.000Z',
          created_at: '1970-01-01T00:00:00.000Z',
        },
      ],
    });

    await app.close();
  });

  it('requires auth for knowledge entries list', async () => {
    const app = createServer(
      buildDeps({
        settings: buildSettings({ apiKey: 'admin-key' }),
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/knowledge',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ detail: 'unauthorized' });

    await app.close();
  });

  it('lists knowledge entries with query clamping', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        listKnowledgeEntries: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            items: [
              {
                id: 1,
                category: 'general',
                title: 'Test Entry',
                content: 'Test content',
                enabled: true,
                updated_at: '2026-03-08T00:00:00.000Z',
              },
            ],
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/knowledge?limit=9999&offset=-5',
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([{ limit: 1000, offset: 0 }]);
    expect(response.json()).toEqual({
      ok: true,
      items: [
        {
          id: 1,
          category: 'general',
          title: 'Test Entry',
          content: 'Test content',
          enabled: true,
          updated_at: '2026-03-08T00:00:00.000Z',
        },
      ],
    });

    await app.close();
  });

  it('creates knowledge entry with validation', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        createKnowledgeEntry: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            item: {
              id: 1,
              category: input.category,
              title: input.title,
              content: input.content,
              enabled: true,
              updated_at: '2026-03-08T01:00:00.000Z',
            },
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/knowledge',
      payload: {
        category: '  test  ',
        title: '  Entry Title  ',
        content: '  Content here  ',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([
      {
        category: 'test',
        title: 'Entry Title',
        content: 'Content here',
      },
    ]);
    expect(response.json().ok).toBe(true);
    expect(response.json().item.category).toBe('test');

    await app.close();
  });

  it('rejects invalid knowledge entry creation', async () => {
    const app = createServer(buildDeps());

    const missingCategory = await app.inject({
      method: 'POST',
      url: '/api/admin/knowledge',
      payload: { title: 'T', content: 'C' },
    });

    expect(missingCategory.statusCode).toBe(400);
    expect(missingCategory.json()).toEqual({ detail: 'category_required' });

    const missingTitle = await app.inject({
      method: 'POST',
      url: '/api/admin/knowledge',
      payload: { category: 'C', content: 'C' },
    });

    expect(missingTitle.statusCode).toBe(400);
    expect(missingTitle.json()).toEqual({ detail: 'title_required' });

    const missingContent = await app.inject({
      method: 'POST',
      url: '/api/admin/knowledge',
      payload: { category: 'C', title: 'T' },
    });

    expect(missingContent.statusCode).toBe(400);
    expect(missingContent.json()).toEqual({ detail: 'content_required' });

    await app.close();
  });

  it('disables knowledge entry', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        disableKnowledgeEntry: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            item: {
              id: input.entryId,
              enabled: false,
              updated_at: '2026-03-08T02:00:00.000Z',
            },
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/knowledge/42/disable',
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([{ entryId: 42 }]);
    expect(response.json()).toEqual({
      ok: true,
      item: {
        id: 42,
        enabled: false,
        updated_at: '2026-03-08T02:00:00.000Z',
      },
    });

    await app.close();
  });

  it('requires auth for memory spaces list', async () => {
    const app = createServer(
      buildDeps({
        settings: buildSettings({ apiKey: 'admin-key' }),
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/memory/spaces',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ detail: 'unauthorized' });

    await app.close();
  });

  it('lists memory spaces with filtering and query clamping', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        listMemorySpaces: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            items: [
              {
                id: 7,
                space_key: 'operator:alpha',
                space_type: 'operator',
                title: 'Alpha Operator',
                summary: 'Primary operator memory',
                created_at: '2026-04-11T00:00:00.000Z',
                updated_at: '2026-04-11T00:05:00.000Z',
              },
            ],
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/memory/spaces?limit=9999&offset=-5&space_type=operator',
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([
      {
        limit: 1000,
        offset: 0,
        spaceType: 'operator',
        subjectType: undefined,
        subjectId: undefined,
      },
    ]);
    expect(response.json()).toEqual({
      ok: true,
      items: [
        {
          id: 7,
          space_key: 'operator:alpha',
          space_type: 'operator',
          title: 'Alpha Operator',
          summary: 'Primary operator memory',
          created_at: '2026-04-11T00:00:00.000Z',
          updated_at: '2026-04-11T00:05:00.000Z',
        },
      ],
    });

    await app.close();
  });

  it('creates a memory space with validation', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        createMemorySpace: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            item: {
              id: 7,
              space_key: input.space_key,
              space_type: input.space_type ?? 'operator',
              title: input.title,
              summary: input.summary ?? '',
              created_at: '2026-04-11T00:00:00.000Z',
              updated_at: '2026-04-11T00:05:00.000Z',
            },
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/memory/spaces',
      payload: {
        space_key: '  operator:alpha  ',
        space_type: '  operator  ',
        title: '  Alpha Operator  ',
        summary: '  Primary operator memory  ',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([
      {
        space_key: 'operator:alpha',
        space_type: 'operator',
        title: 'Alpha Operator',
        summary: 'Primary operator memory',
      },
    ]);

    const invalidResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/memory/spaces',
      payload: {
        title: 'Missing key',
      },
    });

    expect(invalidResponse.statusCode).toBe(400);
    expect(invalidResponse.json()).toEqual({ detail: 'space_key_required' });

    await app.close();
  });

  it('lists and upserts memory items', async () => {
    const listCaptured: Array<Record<string, unknown>> = [];
    const writeCaptured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        listMemoryItems: (input) => {
          listCaptured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            items: [
              {
                id: 21,
                space_id: 7,
                item_key: 'status:latest',
                content: 'Operator alpha is attentive.',
                content_type: 'summary',
                source: 'companion',
                item_metadata: { score: 0.8 },
                created_at: '2026-04-11T00:00:00.000Z',
                updated_at: '2026-04-11T00:10:00.000Z',
              },
            ],
          };
        },
        upsertMemoryItem: (input) => {
          writeCaptured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            item: {
              id: 21,
              space_id: input.space_id,
              item_key: input.item_key,
              content: input.content,
              content_type: input.content_type ?? 'note',
              source: input.source ?? 'operator',
              item_metadata: input.item_metadata ?? {},
              created_at: '2026-04-11T00:00:00.000Z',
              updated_at: '2026-04-11T00:10:00.000Z',
            },
          };
        },
      }),
    );

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/admin/memory/items?space_id=7&content_type=summary&limit=9999&offset=-5',
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listCaptured).toEqual([
      {
        limit: 1000,
        offset: 0,
        spaceId: 7,
        itemKey: undefined,
        contentType: 'summary',
        source: undefined,
      },
    ]);

    const postResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/memory/items',
      payload: {
        space_id: 7,
        item_key: 'status:latest',
        content: 'Operator alpha is attentive.',
        content_type: 'summary',
        source: 'companion',
        item_metadata: { score: 0.8 },
      },
    });

    expect(postResponse.statusCode).toBe(200);
    expect(writeCaptured).toEqual([
      {
        space_id: 7,
        item_key: 'status:latest',
        content: 'Operator alpha is attentive.',
        content_type: 'summary',
        source: 'companion',
        item_metadata: { score: 0.8 },
      },
    ]);

    const invalidResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/memory/items',
      payload: {
        space_id: 7,
        item_key: '',
        content: '',
      },
    });

    expect(invalidResponse.statusCode).toBe(400);
    expect(invalidResponse.json()).toEqual({ detail: 'item_key_required' });

    await app.close();
  });

  it('lists and upserts memory grants', async () => {
    const listCaptured: Array<Record<string, unknown>> = [];
    const writeCaptured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        listMemoryGrants: (input) => {
          listCaptured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            items: [
              {
                id: 3,
                space_id: 7,
                subject_type: 'operator',
                subject_id: 'alice',
                access_level: 'write',
                created_at: '2026-04-11T00:00:00.000Z',
                updated_at: '2026-04-11T00:05:00.000Z',
              },
            ],
          };
        },
        grantMemorySpaceAccess: (input) => {
          writeCaptured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            item: {
              id: 3,
              space_id: input.space_id,
              subject_type: input.subject_type,
              subject_id: input.subject_id,
              access_level: input.access_level ?? 'read',
              created_at: '2026-04-11T00:00:00.000Z',
              updated_at: '2026-04-11T00:05:00.000Z',
            },
          };
        },
      }),
    );

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/admin/memory/grants?space_id=7&limit=9999&offset=-5&subject_type=operator&subject_id=alice',
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listCaptured).toEqual([
      {
        limit: 1000,
        offset: 0,
        spaceId: 7,
        subjectType: 'operator',
        subjectId: 'alice',
      },
    ]);

    const postResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/memory/grants',
      payload: {
        space_id: 7,
        subject_type: 'operator',
        subject_id: 'alice',
        access_level: 'write',
      },
    });

    expect(postResponse.statusCode).toBe(200);
    expect(writeCaptured).toEqual([
      {
        space_id: 7,
        subject_type: 'operator',
        subject_id: 'alice',
        access_level: 'write',
      },
    ]);

    const invalidResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/memory/grants',
      payload: {
        subject_type: 'operator',
        subject_id: 'alice',
      },
    });

    expect(invalidResponse.statusCode).toBe(400);
    expect(invalidResponse.json()).toEqual({ detail: 'space_id_required' });

    await app.close();
  });

  it('lists and upserts memory identity links', async () => {
    const listCaptured: Array<Record<string, unknown>> = [];
    const writeCaptured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        listMemoryIdentityLinks: (input) => {
          listCaptured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            items: [
              {
                id: 9,
                subject_type: 'operator',
                subject_id: 'alice',
                platform: 'bilibili',
                external_id: 'uid-42',
                display_name: 'Alice',
                created_at: '2026-04-11T00:00:00.000Z',
                updated_at: '2026-04-11T00:05:00.000Z',
              },
            ],
          };
        },
        linkMemoryIdentity: (input) => {
          writeCaptured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            item: {
              id: 9,
              subject_type: input.subject_type,
              subject_id: input.subject_id,
              platform: input.platform ?? 'bilibili',
              external_id: input.external_id,
              display_name: input.display_name ?? null,
              created_at: '2026-04-11T00:00:00.000Z',
              updated_at: '2026-04-11T00:05:00.000Z',
            },
          };
        },
      }),
    );

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/admin/memory/identity-links?limit=9999&offset=-5&subject_type=operator&subject_id=alice&platform=bilibili&external_id=uid-42',
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listCaptured).toEqual([
      {
        limit: 1000,
        offset: 0,
        subjectType: 'operator',
        subjectId: 'alice',
        platform: 'bilibili',
        externalId: 'uid-42',
      },
    ]);

    const postResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/memory/identity-links',
      payload: {
        subject_type: 'operator',
        subject_id: 'alice',
        platform: 'bilibili',
        external_id: 'uid-42',
        display_name: 'Alice',
      },
    });

    expect(postResponse.statusCode).toBe(200);
    expect(writeCaptured).toEqual([
      {
        subject_type: 'operator',
        subject_id: 'alice',
        platform: 'bilibili',
        external_id: 'uid-42',
        display_name: 'Alice',
      },
    ]);

    const invalidResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/memory/identity-links',
      payload: {
        subject_type: 'operator',
        subject_id: 'alice',
      },
    });

    expect(invalidResponse.statusCode).toBe(400);
    expect(invalidResponse.json()).toEqual({ detail: 'external_id_required' });

    await app.close();
  });

  it('gets and sets style profile with validation', async () => {
    let capturedProfile = 'auto';

    const app = createServer(
      buildDeps({
        getStyleProfile: () => ({
          ok: true,
          style_profile: capturedProfile,
          preset_profiles: ['auto', 'empathy', 'meme', 'normal'],
        }),
        setStyleProfile: (input) => {
          capturedProfile = input.styleProfile;
          return { ok: true, style_profile: input.styleProfile };
        },
      }),
    );

    const getResponse = await app.inject({
      method: 'GET',
      url: '/api/admin/style-profile',
    });

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json()).toEqual({
      ok: true,
      style_profile: 'auto',
      style: 'auto',
      preset_profiles: ['auto', 'empathy', 'meme', 'normal'],
    });

    const setResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/style-profile',
      payload: { style: '  EMPATHY  ' },
    });

    expect(setResponse.statusCode).toBe(200);
    expect(setResponse.json()).toEqual({ ok: true, style_profile: 'empathy', style: 'empathy' });

    const invalidResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/style-profile',
      payload: { style_profile: 'invalid' },
    });

    expect(invalidResponse.statusCode).toBe(400);
    expect(invalidResponse.json()).toEqual({ detail: 'invalid_style_profile' });

    await app.close();
  });

  it('gets and sets role profile with validation', async () => {
    let capturedProfile = 'auto';

    const app = createServer(
      buildDeps({
        getRoleProfile: () => ({
          ok: true,
          role_profile: capturedProfile,
          preset_profiles: ['auto', 'default', 'comfort', 'playful'],
        }),
        setRoleProfile: (input) => {
          capturedProfile = input.roleProfile;
          return { ok: true, role_profile: input.roleProfile };
        },
      }),
    );

    const getResponse = await app.inject({
      method: 'GET',
      url: '/api/admin/role-profile',
    });

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.json()).toEqual({
      ok: true,
      role_profile: 'auto',
      role: 'auto',
      preset_profiles: ['auto', 'default', 'comfort', 'playful'],
    });

    const setResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/role-profile',
      payload: { role: '  COMFORT  ' },
    });

    expect(setResponse.statusCode).toBe(200);
    expect(setResponse.json()).toEqual({ ok: true, role_profile: 'comfort', role: 'comfort' });

    const invalidResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/role-profile',
      payload: { role_profile: 'invalid' },
    });

    expect(invalidResponse.statusCode).toBe(400);
    expect(invalidResponse.json()).toEqual({ detail: 'invalid_role_profile' });

    await app.close();
  });

  it('lists role cards with query clamping', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        listRoleCards: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            active_role_card_key: 'default',
            items: [
              {
                id: 1,
                key: 'default',
                name: 'Default Card',
                description: 'Default role card',
                system_prompt: 'You are helpful',
                tone: { style: 'friendly' },
                constraints: { max_length: 100 },
                enabled: true,
                is_active: true,
                created_at: '2026-03-08T00:00:00.000Z',
                updated_at: '2026-03-08T00:00:00.000Z',
              },
            ],
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/role-cards?limit=9999&offset=-5',
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([{ limit: 1000, offset: 0 }]);
    expect(response.json().active_role_card_key).toBe('default');
    expect(response.json().items).toHaveLength(1);

    await app.close();
  });

  it('creates role card with validation', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        createRoleCard: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            item: {
              id: 1,
              key: input.key,
              name: input.name,
              description: input.description,
              system_prompt: input.system_prompt,
              tone: input.tone,
              constraints: input.constraints,
              enabled: input.enabled,
              is_active: false,
              created_at: '2026-03-08T01:00:00.000Z',
              updated_at: '2026-03-08T01:00:00.000Z',
            },
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/role-cards',
      payload: {
        key: '  TEST-KEY  ',
        name: '  Test Card  ',
        description: 'Description',
        system_prompt: 'System prompt',
        tone: { style: 'formal' },
        constraints: { max_length: 200 },
        enabled: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([
      {
        key: 'test-key',
        name: 'Test Card',
        description: 'Description',
        system_prompt: 'System prompt',
        tone: { style: 'formal' },
        constraints: { max_length: 200 },
        enabled: true,
      },
    ]);

    await app.close();
  });

  it('rejects invalid role card creation', async () => {
    const app = createServer(buildDeps());

    const missingKey = await app.inject({
      method: 'POST',
      url: '/api/admin/role-cards',
      payload: { name: 'N', description: 'D', system_prompt: 'S' },
    });

    expect(missingKey.statusCode).toBe(400);
    expect(missingKey.json()).toEqual({ detail: 'role_card_key_required' });

    const missingName = await app.inject({
      method: 'POST',
      url: '/api/admin/role-cards',
      payload: { key: 'K', description: 'D', system_prompt: 'S' },
    });

    expect(missingName.statusCode).toBe(400);
    expect(missingName.json()).toEqual({ detail: 'role_card_name_required' });

    await app.close();
  });

  it('updates role card with partial fields', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        updateRoleCard: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            item: {
              id: 1,
              key: input.cardKey,
              name: input.name ?? 'Updated',
              description: input.description ?? '',
              system_prompt: input.system_prompt ?? '',
              tone: input.tone ?? {},
              constraints: input.constraints ?? {},
              enabled: input.enabled ?? true,
              is_active: false,
              created_at: '2026-03-08T00:00:00.000Z',
              updated_at: '2026-03-08T02:00:00.000Z',
            },
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/role-cards/test-key',
      payload: {
        name: '  Updated Name  ',
        description: 'New description',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([
      {
        cardKey: 'test-key',
        name: 'Updated Name',
        description: 'New description',
      },
    ]);

    await app.close();
  });

  it('disables and activates role card', async () => {
    const disableCaptured: Array<Record<string, unknown>> = [];
    const activateCaptured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        disableRoleCard: (input) => {
          disableCaptured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            item: {
              key: input.cardKey,
              enabled: false,
              is_active: false,
              updated_at: '2026-03-08T03:00:00.000Z',
            },
          };
        },
        activateRoleCard: (input) => {
          activateCaptured.push(input as unknown as Record<string, unknown>);
          return { ok: true, active_role_card_key: input.cardKey };
        },
      }),
    );

    const disableResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/role-cards/test-card/disable',
    });

    expect(disableResponse.statusCode).toBe(200);
    expect(disableCaptured).toEqual([{ cardKey: 'test-card' }]);
    expect(disableResponse.json()).toEqual({
      ok: true,
      item: {
        key: 'test-card',
        enabled: false,
        is_active: false,
        updated_at: '2026-03-08T03:00:00.000Z',
      },
    });

    const activateResponse = await app.inject({
      method: 'POST',
      url: '/api/admin/role-cards/test-card/activate',
    });

    expect(activateResponse.statusCode).toBe(200);
    expect(activateCaptured).toEqual([{ cardKey: 'test-card' }]);
    expect(activateResponse.json()).toEqual({
      ok: true,
      active_role_card_key: 'test-card',
    });

    await app.close();
  });

  it('gets observability summary with window clamping', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        getObservabilitySummary: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            summary: {
              window_minutes: input.windowMinutes,
              metrics: { requests: 100 },
            },
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/observability/summary?window_minutes=9999',
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([{ windowMinutes: 1440 }]);
    expect(response.json()).toEqual({
      ok: true,
      summary: {
        window_minutes: 1440,
        metrics: { requests: 100 },
      },
    });

    await app.close();
  });
});

describe('comments domain parity', () => {
  it('ingests comment event from webhook', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        ingestCommentEvent: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            comment_id: input.event.comment_id,
            trace_id: 'trace-webhook-1',
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/events/comment',
      payload: {
        comment_id: 'comment-1',
        video_id: 'video-1',
        content: 'Test comment',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toHaveLength(1);
    expect(captured[0]).toMatchObject({
      event: {
        comment_id: 'comment-1',
        video_id: 'video-1',
        content: 'Test comment',
        source: 'webhook',
      },
      source: 'webhook',
    });
    expect(response.json()).toEqual({
      ok: true,
      comment_id: 'comment-1',
      trace_id: 'trace-webhook-1',
    });

    await app.close();
  });

  it('rejects production comment ingress when auth is unconfigured', async () => {
    await withNodeEnv('production', async () => {
      const app = createServer(buildDeps());

      const response = await app.inject({
        method: 'POST',
        url: '/events/comment',
        payload: {
          comment_id: 'comment-prod-no-auth',
          content: 'Test comment',
        },
      });

      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({ detail: 'comment_ingress_auth_unconfigured' });

      await app.close();
    });
  });

  it('requires comment ingress token when configured', async () => {
    const captured: Array<Record<string, unknown>> = [];
    const app = createServer(
      buildDeps({
        settings: buildSettings({ commentIngressToken: 'comment-token' }),
        ingestCommentEvent: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            comment_id: input.event.comment_id,
            trace_id: 'trace-comment-token',
          };
        },
      }),
    );

    const unauthorized = await app.inject({
      method: 'POST',
      url: '/events/comment',
      payload: {
        comment_id: 'comment-token-required',
        content: 'Test comment',
      },
    });

    const authorized = await app.inject({
      method: 'POST',
      url: '/events/comment',
      headers: {
        'x-comment-ingress-token': 'comment-token',
      },
      payload: {
        comment_id: 'comment-token-required',
        content: 'Test comment',
      },
    });

    expect(unauthorized.statusCode).toBe(401);
    expect(unauthorized.json()).toEqual({ detail: 'unauthorized' });
    expect(authorized.statusCode).toBe(200);
    expect(authorized.json()).toEqual({
      ok: true,
      comment_id: 'comment-token-required',
      trace_id: 'trace-comment-token',
    });
    expect(captured).toHaveLength(1);
    expect(captured[0]).toMatchObject({
      source: 'webhook',
      event: {
        comment_id: 'comment-token-required',
      },
    });

    await app.close();
  });

  it('ingests comment event from bilibili platform', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        ingestCommentEvent: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            comment_id: input.event.comment_id,
            trace_id: 'trace-bilibili-1',
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/events/comment/bilibili',
      payload: {
        comment_id: 'bili-comment-1',
        content: 'Bilibili comment',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toHaveLength(1);
    expect(captured[0]).toMatchObject({
      event: {
        comment_id: 'bili-comment-1',
        platform: 'bilibili',
        source: 'bilibili',
      },
      source: 'bilibili',
    });

    await app.close();
  });

  it('returns degraded ingest response when event is persisted but not queued', async () => {
    const app = createServer(
      buildDeps({
        ingestCommentEvent: (input) => ({
          ok: false,
          queued: false,
          message: 'queue_unavailable',
          comment_id: input.event.comment_id,
          trace_id: 'trace-queue-down-1',
        }),
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/events/comment',
      payload: {
        comment_id: 'comment-degraded-1',
        content: 'Test comment',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: false,
      queued: false,
      message: 'queue_unavailable',
      comment_id: 'comment-degraded-1',
      trace_id: 'trace-queue-down-1',
    });

    await app.close();
  });

  it('rejects comment event without comment_id', async () => {
    const app = createServer(buildDeps());

    const response = await app.inject({
      method: 'POST',
      url: '/events/comment',
      payload: {
        video_id: 'video-1',
      },
    });

    expect(response.statusCode).toBe(400);
    expect((response.json() as { detail: string }).detail).toContain('comment_id');

    await app.close();
  });

  it('retries single job with optional parameters', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        retryJob: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            requeued: true,
            job_id: input.jobId,
            trace_id: 'trace-retry-1',
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/jobs/42/retry',
      payload: {
        force_long: true,
        style_profile: 'empathy',
        role_profile: 'comfort',
        role_card_key: 'test-card',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([
      {
        jobId: 42,
        forceLong: true,
        styleProfile: 'empathy',
        roleProfile: 'comfort',
        roleCardKey: 'test-card',
      },
    ]);
    expect(response.json()).toEqual({
      ok: true,
      requeued: true,
      job_id: 42,
      trace_id: 'trace-retry-1',
    });

    await app.close();
  });

  it('surfaces non-requeued single retry responses', async () => {
    const app = createServer(
      buildDeps({
        retryJob: (input) => ({
          ok: false,
          requeued: false,
          job_id: input.jobId,
          trace_id: 'trace-retry-down-1',
          error: 'queue_unavailable',
        }),
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/jobs/42/retry',
      payload: {},
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: false,
      requeued: false,
      job_id: 42,
      trace_id: 'trace-retry-down-1',
      error: 'queue_unavailable',
    });

    await app.close();
  });

  it('approves single job', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        approveJob: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            job_id: input.jobId,
            status: 'queued',
            trace_id: 'trace-approve-1',
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/jobs/100/approve',
      payload: {
        style_profile: 'meme',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([
      {
        jobId: 100,
        styleProfile: 'meme',
      },
    ]);

    await app.close();
  });

  it('rejects invalid job id for retry', async () => {
    const app = createServer(buildDeps());

    const response = await app.inject({
      method: 'POST',
      url: '/jobs/invalid/retry',
      payload: {},
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ detail: 'job_not_found' });

    await app.close();
  });

  it('approves batch jobs', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        approveJobsBatch: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            summary: { total: input.jobIds.length, success: input.jobIds.length, failed: 0 },
            results: input.jobIds.map((id) => ({ job_id: id, ok: true, status: 'queued' })),
            trace_id: 'trace-batch-approve-1',
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/jobs/approve-batch',
      payload: {
        job_ids: [1, 2, 3],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([{ jobIds: [1, 2, 3] }]);
    expect(response.json()).toMatchObject({
      ok: true,
      summary: { total: 3, success: 3, failed: 0 },
      trace_id: 'trace-batch-approve-1',
    });

    await app.close();
  });

  it('rejects empty job_ids for batch approve', async () => {
    const app = createServer(buildDeps());

    const response = await app.inject({
      method: 'POST',
      url: '/jobs/approve-batch',
      payload: {
        job_ids: [],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ detail: 'job_ids_required' });

    await app.close();
  });

  it('retries batch jobs with force_long', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        retryJobsBatch: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            summary: { total: input.jobIds.length, success: input.jobIds.length, failed: 0 },
            results: input.jobIds.map((id) => ({ job_id: id, ok: true, requeued: true })),
            trace_id: 'trace-batch-retry-1',
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/jobs/retry-batch',
      payload: {
        job_ids: [10, 20],
        force_long: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([
      {
        jobIds: [10, 20],
        forceLong: true,
      },
    ]);

    await app.close();
  });

  it('returns partial failure details for batch retry degradation', async () => {
    const app = createServer(
      buildDeps({
        retryJobsBatch: (input) => ({
          ok: false,
          summary: { total: input.jobIds.length, success: 1, failed: 1 },
          results: [
            { job_id: input.jobIds[0], ok: true, requeued: true },
            { job_id: input.jobIds[1], ok: false, requeued: false, error: 'queue_unavailable' },
          ],
          trace_id: 'trace-batch-retry-degraded-1',
        }),
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/jobs/retry-batch',
      payload: {
        job_ids: [10, 20],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: false,
      summary: { total: 2, success: 1, failed: 1 },
      results: [
        { job_id: 10, ok: true, requeued: true },
        { job_id: 20, ok: false, requeued: false, error: 'queue_unavailable' },
      ],
      trace_id: 'trace-batch-retry-degraded-1',
    });

    await app.close();
  });

  it('supports /api job aliases for get, retry, and approve', async () => {
    const getCaptured: Array<Record<string, unknown>> = [];
    const retryCaptured: Array<Record<string, unknown>> = [];
    const approveCaptured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        getJob: (input) => {
          getCaptured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            item: {
              id: input.jobId,
              comment_id: 'comment-1',
              status: 'queued',
            },
          };
        },
        retryJob: (input) => {
          retryCaptured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            requeued: true,
            job_id: input.jobId,
          };
        },
        approveJob: (input) => {
          approveCaptured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            job_id: input.jobId,
            status: 'queued',
          };
        },
      }),
    );

    const getResponse = await app.inject({
      method: 'GET',
      url: '/api/jobs/123',
    });
    expect(getResponse.statusCode).toBe(200);
    expect(getCaptured).toEqual([{ jobId: 123 }]);

    const retryResponse = await app.inject({
      method: 'POST',
      url: '/api/jobs/123/retry',
      payload: {
        force_long: true,
        style_profile: 'empathy',
      },
    });
    expect(retryResponse.statusCode).toBe(200);
    expect(retryCaptured).toEqual([
      {
        jobId: 123,
        forceLong: true,
        styleProfile: 'empathy',
        roleProfile: undefined,
        roleCardKey: undefined,
      },
    ]);

    const approveResponse = await app.inject({
      method: 'POST',
      url: '/api/jobs/123/approve',
      payload: {
        role_profile: 'comfort',
      },
    });
    expect(approveResponse.statusCode).toBe(200);
    expect(approveCaptured).toEqual([
      {
        jobId: 123,
        styleProfile: undefined,
        roleProfile: 'comfort',
        roleCardKey: undefined,
      },
    ]);

    await app.close();
  });

  it('supports /api job batch aliases and preserves validation', async () => {
    const approveCaptured: Array<Record<string, unknown>> = [];
    const retryCaptured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        approveJobsBatch: (input) => {
          approveCaptured.push(input as unknown as Record<string, unknown>);
          return { ok: true, summary: { total: input.jobIds.length, success: input.jobIds.length, failed: 0 } };
        },
        retryJobsBatch: (input) => {
          retryCaptured.push(input as unknown as Record<string, unknown>);
          return { ok: true, summary: { total: input.jobIds.length, success: input.jobIds.length, failed: 0 } };
        },
      }),
    );

    const approveResponse = await app.inject({
      method: 'POST',
      url: '/api/jobs/approve-batch',
      payload: {
        job_ids: [1, 2, 3],
      },
    });
    expect(approveResponse.statusCode).toBe(200);
    expect(approveCaptured).toEqual([{ jobIds: [1, 2, 3] }]);

    const retryResponse = await app.inject({
      method: 'POST',
      url: '/api/jobs/retry-batch',
      payload: {
        job_ids: [7, 8],
        force_long: true,
      },
    });
    expect(retryResponse.statusCode).toBe(200);
    expect(retryCaptured).toEqual([{ jobIds: [7, 8], forceLong: true }]);

    const invalidResponse = await app.inject({
      method: 'POST',
      url: '/api/jobs/approve-batch',
      payload: {
        job_ids: [],
      },
    });
    expect(invalidResponse.statusCode).toBe(400);
    expect(invalidResponse.json()).toEqual({ detail: 'job_ids_required' });

    await app.close();
  });

  it('supports /api comment detail alias', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        getComment: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            comment: {
              comment_id: input.commentId,
              content: 'alias comment',
            },
            jobs: [],
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/comments/comment-42',
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([{ commentId: 'comment-42' }]);
    expect(response.json()).toMatchObject({
      ok: true,
      comment: {
        comment_id: 'comment-42',
      },
    });

    await app.close();
  });

  it('requires x-api-key for jobs/comments compatibility endpoints when configured', async () => {
    const app = createServer(
      buildDeps({
        settings: buildSettings({ apiKey: 'admin-key' }),
      }),
    );

    const requests = [
      { method: 'GET', url: '/jobs/123' },
      { method: 'GET', url: '/jobs?status=done&limit=20' },
      { method: 'GET', url: '/export/jobs.csv?status=done&limit=20' },
      { method: 'POST', url: '/jobs/42/retry', payload: {} },
      { method: 'POST', url: '/jobs/42/approve', payload: {} },
      { method: 'POST', url: '/jobs/approve-batch', payload: { job_ids: [1] } },
      { method: 'POST', url: '/jobs/retry-batch', payload: { job_ids: [1] } },
      { method: 'GET', url: '/comments?limit=1' },
      { method: 'GET', url: '/comments/comment-42' },
      { method: 'GET', url: '/api/comments/comment-42' },
    ];

    for (const request of requests) {
      const response = await app.inject(request);
      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ detail: 'unauthorized' });
    }

    await app.close();
  });

  it('exposes audit log and daily metrics aliases with auth parity', async () => {
    const app = createServer(
      buildDeps({
        settings: buildSettings({ apiKey: 'admin-key' }),
      }),
    );

    const urls = [
      '/api/audit-logs?limit=20&action=%20approve%20',
      '/api/audit-log?limit=20&ok=true',
      '/api/metrics/daily?days=30',
    ];

    for (const url of urls) {
      const response = await app.inject({
        method: 'GET',
        url,
      });
      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ detail: 'unauthorized' });
    }

    await app.close();
  });

  it('gets comment by id', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        getComment: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            comment: {
              comment_id: input.commentId,
              video_id: 'video-1',
              user_id: 'user-1',
              content: 'Test comment',
              parent_id: null,
              created_at: '2026-03-08T00:00:00.000Z',
            },
            jobs: [],
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/comments/test-comment-1',
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([{ commentId: 'test-comment-1' }]);
    expect(response.json()).toMatchObject({
      ok: true,
      comment: {
        comment_id: 'test-comment-1',
        video_id: 'video-1',
      },
    });

    await app.close();
  });

  it('gets job by id', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        getJob: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            item: {
              id: input.jobId,
              comment_id: 'comment-1',
              status: 'done',
              reply_text: 'Reply text',
              created_at: '2026-03-08T00:00:00.000Z',
            },
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/jobs/123',
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([{ jobId: 123 }]);

    await app.close();
  });

  it('rejects invalid job id for get', async () => {
    const app = createServer(buildDeps());

    const response = await app.inject({
      method: 'GET',
      url: '/jobs/invalid',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ detail: 'job_not_found' });

    await app.close();
  });

  it('lists jobs with status filter and pagination', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        listJobs: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            items: [
              {
                id: 1,
                comment_id: 'comment-1',
                status: input.status ?? 'pending',
                created_at: '2026-03-08T00:00:00.000Z',
              },
            ],
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/jobs?status=done&limit=100&offset=50',
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([
      {
        status: 'done',
        limit: 100,
        offset: 50,
      },
    ]);

    await app.close();
  });

  it('exports jobs as csv', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        exportJobsCsv: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return 'job_id,comment_id,status,created_at\n1,comment-1,done,2026-03-08T00:00:00Z\n';
        },
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/export/jobs.csv?status=done&limit=500',
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([
      {
        status: 'done',
        limit: 500,
      },
    ]);
    expect(response.headers['content-type']).toBe('text/csv');
    expect(response.body).toContain('job_id,comment_id');

    await app.close();
  });
});

describe('bilibili integration parity', () => {
  it('requires auth for bilibili status', async () => {
    const app = createServer(
      buildDeps({
        settings: buildSettings({ apiKey: 'admin-key' }),
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/bilibili/status',
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ detail: 'unauthorized' });

    await app.close();
  });

  it('returns bilibili status with diagnostics', async () => {
    const app = createServer(
      buildDeps({
        getBilibiliStatus: () => ({
          ok: true,
          config: {
            enabled: true,
            poll_enabled: true,
            publish_enabled: false,
          },
          credential: {
            id: 1,
            name: 'Test Credential',
            is_active: true,
            expires_at: '2026-12-31T00:00:00.000Z',
          },
          videos: {
            poll_enabled_count: 5,
          },
          diagnostics: {
            ready: false,
            blocking_reasons: ['auth:no active credential'],
            effective_publish_mode: 'manual_queue',
          },
        }),
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/bilibili/status',
      headers: {
        'x-api-key': 'test-key',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      enabled: true,
      polling_enabled: true,
      publish_enabled: false,
      video_count: 5,
      config: {
        enabled: true,
        poll_enabled: true,
      },
      videos: {
        poll_enabled_count: 5,
      },
    });

    await app.close();
  });

  it('lists bilibili videos with query clamping', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        listBilibiliVideos: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            total: 1,
            items: [
              {
                id: 1,
                bvid: 'BV1GJ411x7fD',
                poll_enabled: true,
                title: 'Test Video',
              },
            ],
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/bilibili/videos?poll_enabled=true&limit=999&offset=-5',
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([
      {
        pollEnabled: true,
        limit: 200,
        offset: 0,
      },
    ]);
    expect(response.json()).toMatchObject({
      ok: true,
      total: 1,
      items: [
        {
          bvid: 'BV1GJ411x7fD',
          poll_enabled: true,
        },
      ],
    });

    await app.close();
  });

  it('adds bilibili video with validation', async () => {
    const captured: Array<Record<string, unknown>> = [];

    const app = createServer(
      buildDeps({
        addBilibiliVideo: (input) => {
          captured.push(input as unknown as Record<string, unknown>);
          return {
            ok: true,
            item: {
              id: 1,
              bvid: input.bvid,
              poll_enabled: input.pollEnabled ?? true,
              title: 'New Video',
            },
          };
        },
      }),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/videos',
      payload: {
        bvid: 'BV1GJ411x7fD',
        poll_enabled: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(captured).toEqual([
      {
        bvid: 'BV1GJ411x7fD',
        pollEnabled: true,
      },
    ]);
    expect(response.json()).toMatchObject({
      ok: true,
      item: {
        bvid: 'BV1GJ411x7fD',
        poll_enabled: true,
      },
    });

    await app.close();
  });

  it('rejects invalid bvid format', async () => {
    const app = createServer(buildDeps());

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/videos',
      payload: {
        bvid: 'INVALID',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ detail: 'invalid_bvid_format' });

    await app.close();
  });

  it('rejects missing bvid', async () => {
    const app = createServer(buildDeps());

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/videos',
      payload: {
        title: 'Test',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ detail: 'bvid_required' });

    await app.close();
  });
});
