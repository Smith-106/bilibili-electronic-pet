import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { registerAdminCoreRoutes, type AdminCoreRouteDependencies } from '../src/routes/admin-core.js';
import type { CompanionStateV2, RuntimeSettings } from '../src/server/contracts.js';

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
    platformBilibiliEnabled: true,
    platformQqEnabled: true,
    platformDouyinEnabled: true,
    platformKuaishouEnabled: true,
    platformBilibiliPublishSource: 'bilibili-bot',
    platformQqPublishSource: 'qq-sidecar',
    platformDouyinPublishSource: 'douyin-bot',
    platformKuaishouPublishSource: 'kuaishou-bot',
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
      proactiveSignals: [],
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
      recentInteractions: [],
    },
  };
}

function buildDeps(overrides: Partial<AdminCoreRouteDependencies> = {}): AdminCoreRouteDependencies {
  return {
    settings: buildSettings(),
    checkApiKey: (request, reply, settings) => {
      if (request.headers['x-api-key'] === settings.apiKey) return true;
      void reply.code(401).send({ detail: 'unauthorized' });
      return false;
    },
    getHeaderValue: (value) => (Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '')),
    issueAdminSession: () => ({ token: 'session-token', expiresAt: '2026-06-09T01:00:00.000Z' }),
    getAdminOverview: vi.fn(() => ({ totals: { comments: 1 } })),
    getCompanionStateV2: vi.fn(buildCompanionState),
    listPlatformConnections: vi.fn(() => ({ ok: true, items: [] })),
    updatePlatformConnectionControl: vi.fn(({ platform, enabled }) => ({
      ok: true,
      item: {
        platform,
        enabled,
        adapterKey: `${platform}-adapter`,
        status: enabled ? 'connected' : 'disconnected',
        capabilities: [],
      },
    })),
    recordCompanionAction: vi.fn(({ action, note }) => ({ ok: true, action, item_key: note ?? 'none' })),
    normalizeAdminOverviewPayload: (overview) => ({ ...overview, normalized: true }),
    listAdminJobs: vi.fn(() => ({ total: 1, items: [{ id: 1, status: 'manual_queue' }] })),
    parseAdminString: (value) => (typeof value === 'string' && value.trim() ? value.trim() : undefined),
    parseAdminLimit: (value, defaultValue, min, max) => {
      const parsed = Number.parseInt(String(value ?? ''), 10);
      if (!Number.isFinite(parsed)) return defaultValue;
      return Math.min(max, Math.max(min, parsed));
    },
    parseAdminOffset: (value, defaultValue, min, max) => {
      const parsed = Number.parseInt(String(value ?? ''), 10);
      if (!Number.isFinite(parsed)) return defaultValue;
      return Math.min(max, Math.max(min, parsed));
    },
    normalizeAdminJobListItem: (item) => ({ ...item, normalized: true }),
    ...overrides,
  };
}

function createApp(overrides: Partial<AdminCoreRouteDependencies> = {}) {
  const app = Fastify();
  const deps = buildDeps(overrides);
  registerAdminCoreRoutes(app, deps);
  return { app, deps };
}

describe('admin core route coverage', () => {
  it('rejects login when auth is unconfigured, credentials are wrong, or sessions are unavailable', async () => {
    const unconfigured = createApp({ settings: buildSettings({ apiKey: '' }) });
    const noSession = createApp({ issueAdminSession: () => null });

    const unconfiguredResponse = await unconfigured.app.inject({
      method: 'POST',
      url: '/api/admin/session/login',
      payload: { api_key: 'admin-key' },
    });
    const unauthorizedResponse = await noSession.app.inject({
      method: 'POST',
      url: '/api/admin/session/login',
      payload: { apiKey: 'wrong' },
    });
    const noSessionResponse = await noSession.app.inject({
      method: 'POST',
      url: '/api/admin/session/login',
      payload: { api_key: 'admin-key' },
    });

    expect(unconfiguredResponse.statusCode).toBe(503);
    expect(unconfiguredResponse.json()).toEqual({ detail: 'admin_auth_unconfigured' });
    expect(unauthorizedResponse.statusCode).toBe(401);
    expect(unauthorizedResponse.json()).toEqual({ detail: 'unauthorized' });
    expect(noSessionResponse.statusCode).toBe(503);
    expect(noSessionResponse.json()).toEqual({ detail: 'admin_session_unavailable' });

    await unconfigured.app.close();
    await noSession.app.close();
  });

  it('accepts apiKey login payloads and rejects missing credentials', async () => {
    const { app } = createApp();

    const missingCredentials = await app.inject({
      method: 'POST',
      url: '/api/admin/session/login',
      payload: {},
    });
    const authorized = await app.inject({
      method: 'POST',
      url: '/api/admin/session/login',
      payload: { apiKey: ' admin-key ' },
    });

    expect(missingCredentials.statusCode).toBe(401);
    expect(missingCredentials.json()).toEqual({ detail: 'unauthorized' });
    expect(authorized.statusCode).toBe(200);
    expect(authorized.json()).toEqual({
      ok: true,
      session_token: 'session-token',
      expires_at: '2026-06-09T01:00:00.000Z',
    });

    await app.close();
  });

  it('serves and guards companion pet overview', async () => {
    const getCompanionStateV2 = vi.fn(buildCompanionState);
    const { app } = createApp({ getCompanionStateV2 });

    const unauthorized = await app.inject({
      method: 'GET',
      url: '/api/admin/pet/overview',
    });
    const authorized = await app.inject({
      method: 'GET',
      url: '/api/admin/pet/overview',
      headers: { 'x-api-key': 'admin-key' },
    });

    expect(unauthorized.statusCode).toBe(401);
    expect(authorized.statusCode).toBe(200);
    expect(authorized.json()).toEqual({ ok: true, item: buildCompanionState() });
    expect(getCompanionStateV2).toHaveBeenCalledTimes(1);

    await app.close();
  });

  it('records normalized pet actions and rejects invalid actions', async () => {
    const recordCompanionAction = vi.fn(({ action, note }) => ({ ok: true, action, item_key: note }));
    const { app } = createApp({ recordCompanionAction });

    const invalid = await app.inject({
      method: 'POST',
      url: '/api/admin/pet/actions',
      headers: { 'x-api-key': 'admin-key' },
      payload: { action: 'dance' },
    });
    const missing = await app.inject({
      method: 'POST',
      url: '/api/admin/pet/actions',
      headers: { 'x-api-key': 'admin-key' },
      payload: {},
    });
    const valid = await app.inject({
      method: 'POST',
      url: '/api/admin/pet/actions',
      headers: { 'x-api-key': 'admin-key' },
      payload: { action: ' PAT ', note: 'x'.repeat(300) },
    });

    expect(invalid.statusCode).toBe(400);
    expect(invalid.json()).toEqual({ detail: 'action_invalid' });
    expect(missing.statusCode).toBe(400);
    expect(missing.json()).toEqual({ detail: 'action_invalid' });
    expect(valid.statusCode).toBe(200);
    expect(recordCompanionAction).toHaveBeenCalledWith({ action: 'pat', note: 'x'.repeat(256) });

    await app.close();
  });

  it('records pet actions without notes', async () => {
    const recordCompanionAction = vi.fn(({ action, note }) => ({ ok: true, action, item_key: note ?? 'none' }));
    const { app } = createApp({ recordCompanionAction });

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/pet/actions',
      headers: { 'x-api-key': 'admin-key' },
      payload: { action: 'feed' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, action: 'feed', item_key: 'none' });
    expect(recordCompanionAction).toHaveBeenCalledWith({ action: 'feed', note: undefined });

    await app.close();
  });

  it('serves and guards platform connection lists', async () => {
    const listPlatformConnections = vi.fn(() => ({
      ok: true,
      items: [
        {
          platform: 'bilibili' as const,
          enabled: true,
          adapterKey: 'bilibili-bot',
          status: 'connected' as const,
          capabilities: [],
        },
      ],
    }));
    const { app } = createApp({ listPlatformConnections });

    const unauthorized = await app.inject({
      method: 'GET',
      url: '/api/admin/platforms',
    });
    const authorized = await app.inject({
      method: 'GET',
      url: '/api/admin/platforms',
      headers: { 'x-api-key': 'admin-key' },
    });

    expect(unauthorized.statusCode).toBe(401);
    expect(authorized.statusCode).toBe(200);
    expect(authorized.json()).toEqual({
      ok: true,
      items: [
        {
          platform: 'bilibili',
          enabled: true,
          adapterKey: 'bilibili-bot',
          status: 'connected',
          capabilities: [],
        },
      ],
    });
    expect(listPlatformConnections).toHaveBeenCalledTimes(1);

    await app.close();
  });

  it('guards platform control auth, rejects unknown platforms, and forwards authorized controls', async () => {
    const updatePlatformConnectionControl = vi.fn(({ platform, enabled }) => ({
      ok: true,
      item: {
        platform,
        enabled,
        adapterKey: `${platform}-adapter`,
        status: 'connected',
        capabilities: [],
      },
    }));
    const { app } = createApp({ updatePlatformConnectionControl });

    const unauthorized = await app.inject({
      method: 'POST',
      url: '/api/admin/platforms/qq/control',
      payload: { enabled: true },
    });
    const invalidPlatform = await app.inject({
      method: 'POST',
      url: '/api/admin/platforms/mastodon/control',
      headers: { 'x-api-key': 'admin-key' },
      payload: { enabled: true },
    });
    const authorized = await app.inject({
      method: 'POST',
      url: '/api/admin/platforms/qq/control',
      headers: { 'x-api-key': 'admin-key' },
      payload: { enabled: 1 },
    });

    expect(unauthorized.statusCode).toBe(401);
    expect(invalidPlatform.statusCode).toBe(400);
    expect(invalidPlatform.json()).toEqual({ detail: 'platform_invalid' });
    expect(authorized.statusCode).toBe(200);
    expect(authorized.json()).toMatchObject({ ok: true, item: { platform: 'qq', enabled: true } });
    expect(updatePlatformConnectionControl).toHaveBeenCalledWith({ platform: 'qq', enabled: true });

    await app.close();
  });

  it('normalizes platform route params before validation', async () => {
    const updatePlatformConnectionControl = vi.fn(({ platform, enabled }) => ({
      ok: true,
      item: {
        platform,
        enabled,
        adapterKey: `${platform}-adapter`,
        status: 'disconnected',
        capabilities: [],
      },
    }));
    const { app } = createApp({ updatePlatformConnectionControl });

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/platforms/%20Douyin%20/control',
      headers: { 'x-api-key': 'admin-key' },
      payload: { enabled: 0 },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ ok: true, item: { platform: 'douyin', enabled: false } });
    expect(updatePlatformConnectionControl).toHaveBeenCalledWith({ platform: 'douyin', enabled: false });

    await app.close();
  });

  it('normalizes overview and job list responses', async () => {
    const listAdminJobs = vi.fn(() => ({ total: 1, items: [{ id: 7, status: 'manual_queue' }] }));
    const { app } = createApp({ listAdminJobs });

    const overview = await app.inject({
      method: 'GET',
      url: '/api/admin/overview',
      headers: { 'x-api-key': 'admin-key' },
    });
    const metrics = await app.inject({
      method: 'GET',
      url: '/api/admin/metrics/overview',
      headers: { 'x-api-key': 'admin-key' },
    });
    const jobs = await app.inject({
      method: 'GET',
      url: '/api/admin/jobs?status=pending_review&limit=999&offset=-5',
      headers: { 'x-api-key': 'admin-key' },
    });

    expect(overview.json()).toMatchObject({ ok: true, normalized: true });
    expect(metrics.json()).toEqual({ totals: { comments: 1 } });
    expect(jobs.json()).toEqual({ ok: true, total: 1, items: [{ id: 7, status: 'manual_queue', normalized: true }] });
    expect(listAdminJobs).toHaveBeenCalledWith({ status: 'pending_review', limit: 999, offset: 0 });

    await app.close();
  });

  it('guards metrics overview and job list routes', async () => {
    const { app, deps } = createApp();

    const metrics = await app.inject({
      method: 'GET',
      url: '/api/admin/metrics/overview',
    });
    const jobs = await app.inject({
      method: 'GET',
      url: '/api/admin/jobs',
    });

    expect(metrics.statusCode).toBe(401);
    expect(jobs.statusCode).toBe(401);
    expect(deps.getAdminOverview).not.toHaveBeenCalled();
    expect(deps.listAdminJobs).not.toHaveBeenCalled();

    await app.close();
  });
});
