import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { registerBilibiliAdminRoutes, type BilibiliAdminRouteDependencies } from '../src/routes/bilibili-admin.js';
import type { RuntimeSettings } from '../src/server/contracts.js';

const prisma = vi.hoisted(() => ({
  bilibiliVideo: {
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  bilibiliCredential: {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  comment: {
    count: vi.fn(),
  },
}));

const pollAllVideos = vi.hoisted(() => vi.fn());
const pollVideoById = vi.hoisted(() => vi.fn());

vi.mock('../src/lib/prisma.js', () => ({
  getPrisma: () => prisma,
}));

vi.mock('../src/services/bilibili-poller.js', () => ({
  pollAllVideos,
  pollVideoById,
}));

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

function buildDeps(overrides: Partial<BilibiliAdminRouteDependencies> = {}): BilibiliAdminRouteDependencies {
  return {
    settings: buildSettings(),
    checkApiKey: (request, reply, settings) => {
      if (request.headers['x-api-key'] === settings.apiKey) return true;
      void reply.code(401).send({ detail: 'unauthorized' });
      return false;
    },
    parseAdminBoolean: (value) => {
      if (typeof value === 'boolean') return value;
      if (typeof value !== 'string') return undefined;
      const normalized = value.trim().toLowerCase();
      if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
      if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
      return undefined;
    },
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
    getBilibiliStatus: vi.fn(() => ({
      ok: true,
      config: {},
      credential: null,
      videos: {},
      diagnostics: {},
    })),
    listBilibiliVideos: vi.fn(() => ({ ok: true, total: 0, items: [] })),
    addBilibiliVideo: vi.fn(({ bvid, pollEnabled }) => ({ ok: true, item: { id: 1, bvid, poll_enabled: pollEnabled } })),
    normalizeBilibiliStatusPayload: (payload) => ({ ...payload, normalized: true }),
    normalizeBilibiliVideoRecord: (row, options) => ({
      id: row.id,
      bvid: row.bvid,
      poll_enabled: row.poll_enabled,
      comment_count: options?.commentCount ?? 0,
    }),
    ...overrides,
  };
}

function createApp(overrides: Partial<BilibiliAdminRouteDependencies> = {}) {
  const app = Fastify();
  const deps = buildDeps(overrides);
  registerBilibiliAdminRoutes(app, deps);
  return { app, deps };
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const model of [prisma.bilibiliVideo, prisma.bilibiliCredential, prisma.comment]) {
    for (const fn of Object.values(model)) {
      fn.mockReset();
    }
  }
  pollAllVideos.mockReset();
  pollVideoById.mockReset();
});

describe('bilibili admin route coverage', () => {
  it('rejects unauthorized bilibili admin routes and normalizes status payloads', async () => {
    const getBilibiliStatus = vi.fn(() => ({
      ok: true,
      config: { enabled: true },
      credential: null,
      videos: {},
      diagnostics: {},
    }));
    const { app } = createApp({ getBilibiliStatus });

    const unauthorizedStatus = await app.inject({ method: 'GET', url: '/api/admin/bilibili/status' });
    const unauthorizedVideos = await app.inject({ method: 'GET', url: '/api/admin/bilibili/videos' });
    const unauthorizedCreate = await app.inject({ method: 'POST', url: '/api/admin/bilibili/videos', payload: {} });
    const unauthorizedToggle = await app.inject({ method: 'POST', url: '/api/admin/bilibili/videos/1/toggle-poll', payload: {} });
    const unauthorizedDeleteVideo = await app.inject({ method: 'DELETE', url: '/api/admin/bilibili/videos/1' });
    const unauthorizedSync = await app.inject({ method: 'POST', url: '/api/admin/bilibili/videos/1/sync' });
    const unauthorizedPoll = await app.inject({ method: 'POST', url: '/api/admin/bilibili/poll' });
    const unauthorizedCredentials = await app.inject({ method: 'GET', url: '/api/admin/bilibili/credentials' });
    const unauthorizedCreateCredential = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/credentials',
      payload: {},
    });
    const unauthorizedActivate = await app.inject({ method: 'POST', url: '/api/admin/bilibili/credentials/1/activate' });
    const unauthorizedDeleteCredential = await app.inject({ method: 'DELETE', url: '/api/admin/bilibili/credentials/1' });
    const status = await app.inject({
      method: 'GET',
      url: '/api/admin/bilibili/status',
      headers: { 'x-api-key': 'admin-key' },
    });

    for (const response of [
      unauthorizedStatus,
      unauthorizedVideos,
      unauthorizedCreate,
      unauthorizedToggle,
      unauthorizedDeleteVideo,
      unauthorizedSync,
      unauthorizedPoll,
      unauthorizedCredentials,
      unauthorizedCreateCredential,
      unauthorizedActivate,
      unauthorizedDeleteCredential,
    ]) {
      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ detail: 'unauthorized' });
    }
    expect(status.json()).toMatchObject({ ok: true, normalized: true, config: { enabled: true } });
    expect(getBilibiliStatus).toHaveBeenCalledOnce();

    await app.close();
  });

  it('parses video list filters and validates create video input', async () => {
    const listBilibiliVideos = vi.fn(() => ({ ok: true, total: 0, items: [] }));
    const addBilibiliVideo = vi.fn(({ bvid, pollEnabled }) => ({
      ok: true,
      item: { bvid, poll_enabled: pollEnabled },
    }));
    const { app } = createApp({ listBilibiliVideos, addBilibiliVideo });

    const listTrue = await app.inject({
      method: 'GET',
      url: '/api/admin/bilibili/videos?poll_enabled=1&limit=999&offset=-2',
      headers: { 'x-api-key': 'admin-key' },
    });
    const listFalse = await app.inject({
      method: 'GET',
      url: '/api/admin/bilibili/videos?poll_enabled=false',
      headers: { 'x-api-key': 'admin-key' },
    });
    const missingBvid = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/videos',
      headers: { 'x-api-key': 'admin-key' },
      payload: {},
    });
    const invalidPoll = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/videos',
      headers: { 'x-api-key': 'admin-key' },
      payload: { bvid: 'BV1234567890', poll_enabled: 'maybe' },
    });
    const invalidBvid = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/videos',
      headers: { 'x-api-key': 'admin-key' },
      payload: { bvid: 'AV123' },
    });
    const created = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/videos',
      headers: { 'x-api-key': 'admin-key' },
      payload: { bvid: 'BV1234567890', poll_enabled: 'false' },
    });

    expect(listTrue.statusCode).toBe(200);
    expect(listFalse.statusCode).toBe(200);
    expect(listBilibiliVideos).toHaveBeenNthCalledWith(1, { pollEnabled: true, limit: 200, offset: 0 });
    expect(listBilibiliVideos).toHaveBeenNthCalledWith(2, { pollEnabled: false, limit: 50, offset: 0 });
    expect(missingBvid.json()).toEqual({ detail: 'bvid_required' });
    expect(invalidPoll.json()).toEqual({ detail: 'invalid_poll_enabled' });
    expect(invalidBvid.json()).toEqual({ detail: 'invalid_bvid_format' });
    expect(created.json()).toEqual({ ok: true, item: { bvid: 'BV1234567890', poll_enabled: false } });
    expect(addBilibiliVideo).toHaveBeenCalledWith({ bvid: 'BV1234567890', pollEnabled: false });

    await app.close();
  });

  it('defaults video creation poll flag and applies explicit poll toggles', async () => {
    const addBilibiliVideo = vi.fn(({ bvid, pollEnabled }) => ({
      ok: true,
      item: { bvid, poll_enabled: pollEnabled },
    }));
    prisma.bilibiliVideo.findUnique.mockResolvedValue({ id: 6, bvid: 'BV1234567890', poll_enabled: false });
    prisma.bilibiliVideo.update.mockResolvedValue({});
    const { app } = createApp({ addBilibiliVideo });

    const created = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/videos',
      headers: { 'x-api-key': 'admin-key' },
      payload: { bvid: 'BV1234567890' },
    });
    const toggled = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/videos/6/toggle-poll',
      headers: { 'x-api-key': 'admin-key' },
      payload: { poll_enabled: 'true' },
    });

    expect(created.json()).toEqual({ ok: true, item: { bvid: 'BV1234567890', poll_enabled: true } });
    expect(addBilibiliVideo).toHaveBeenCalledWith({ bvid: 'BV1234567890', pollEnabled: true });
    expect(toggled.json()).toEqual({ ok: true, item: { id: 6, bvid: 'BV1234567890', poll_enabled: true } });
    expect(prisma.bilibiliVideo.update).toHaveBeenCalledWith({ where: { id: 6 }, data: { poll_enabled: true } });

    await app.close();
  });

  it('handles video toggle and delete 400, 404, default toggle, and explicit toggle branches', async () => {
    prisma.bilibiliVideo.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 5, bvid: 'BV1234567890', poll_enabled: false })
      .mockResolvedValueOnce({ id: 5, bvid: 'BV1234567890', poll_enabled: true })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 5, bvid: 'BV1234567890', poll_enabled: true });
    prisma.bilibiliVideo.update.mockResolvedValue({});
    prisma.bilibiliVideo.delete.mockResolvedValue({});
    const { app } = createApp();

    const invalidId = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/videos/nope/toggle-poll',
      headers: { 'x-api-key': 'admin-key' },
      payload: {},
    });
    const missing = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/videos/5/toggle-poll',
      headers: { 'x-api-key': 'admin-key' },
      payload: {},
    });
    const invalidPoll = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/videos/5/toggle-poll',
      headers: { 'x-api-key': 'admin-key' },
      payload: { poll_enabled: 'maybe' },
    });
    const toggled = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/videos/5/toggle-poll',
      headers: { 'x-api-key': 'admin-key' },
      payload: {},
    });
    const deleteMissing = await app.inject({
      method: 'DELETE',
      url: '/api/admin/bilibili/videos/5',
      headers: { 'x-api-key': 'admin-key' },
    });
    const invalidDelete = await app.inject({
      method: 'DELETE',
      url: '/api/admin/bilibili/videos/nope',
      headers: { 'x-api-key': 'admin-key' },
    });
    const deleted = await app.inject({
      method: 'DELETE',
      url: '/api/admin/bilibili/videos/5',
      headers: { 'x-api-key': 'admin-key' },
    });

    expect(invalidId.json()).toEqual({ detail: 'invalid_video_id' });
    expect(missing.json()).toEqual({ detail: 'video_not_found' });
    expect(invalidPoll.json()).toEqual({ detail: 'invalid_poll_enabled' });
    expect(toggled.json()).toEqual({ ok: true, item: { id: 5, bvid: 'BV1234567890', poll_enabled: false } });
    expect(deleteMissing.json()).toEqual({ detail: 'video_not_found' });
    expect(invalidDelete.statusCode).toBe(400);
    expect(invalidDelete.json()).toEqual({ detail: 'invalid_video_id' });
    expect(deleted.json()).toEqual({ ok: true, deleted_id: 5 });

    await app.close();
  });

  it('maps sync and poller statuses to admin responses', async () => {
    prisma.bilibiliVideo.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValue({ id: 8, bvid: 'BV1234567890', poll_enabled: true });
    prisma.comment.count.mockResolvedValue(3);
    pollVideoById
      .mockResolvedValueOnce({ status: 'disabled' })
      .mockResolvedValueOnce({ status: 'not_found' })
      .mockResolvedValueOnce({ status: 'error', error: 'boom' })
      .mockResolvedValueOnce({ status: 'ok', changed: 1 });
    pollAllVideos.mockResolvedValueOnce({ status: 'disabled' }).mockResolvedValueOnce({ status: 'ok' });
    const { app } = createApp();

    const missing = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/videos/8/sync',
      headers: { 'x-api-key': 'admin-key' },
    });
    const disabled = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/videos/8/sync',
      headers: { 'x-api-key': 'admin-key' },
    });
    const notFound = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/videos/8/sync',
      headers: { 'x-api-key': 'admin-key' },
    });
    const error = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/videos/8/sync',
      headers: { 'x-api-key': 'admin-key' },
    });
    const ok = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/videos/8/sync',
      headers: { 'x-api-key': 'admin-key' },
    });
    const pollDisabled = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/poll',
      headers: { 'x-api-key': 'admin-key' },
    });
    const pollOk = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/poll',
      headers: { 'x-api-key': 'admin-key' },
    });

    expect(missing.statusCode).toBe(404);
    expect(disabled.statusCode).toBe(409);
    expect(disabled.json()).toMatchObject({ detail: 'bilibili_not_configured' });
    expect(notFound.statusCode).toBe(404);
    expect(error.statusCode).toBe(502);
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toMatchObject({ ok: true, item: { id: 8, bvid: 'BV1234567890', comment_count: 3 } });
    expect(pollDisabled.statusCode).toBe(409);
    expect(pollOk.json()).toEqual({ ok: true, result: { status: 'ok' } });

    await app.close();
  });

  it('rejects invalid sync ids before polling', async () => {
    const { app } = createApp();

    const invalidSync = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/videos/nope/sync',
      headers: { 'x-api-key': 'admin-key' },
    });

    expect(invalidSync.statusCode).toBe(400);
    expect(invalidSync.json()).toEqual({ detail: 'invalid_video_id' });
    expect(pollVideoById).not.toHaveBeenCalled();

    await app.close();
  });

  it('falls back to the pre-sync video when refreshed lookup misses', async () => {
    prisma.bilibiliVideo.findUnique
      .mockResolvedValueOnce({ id: 9, bvid: 'BV-refresh-miss', poll_enabled: true })
      .mockResolvedValueOnce(null);
    prisma.comment.count.mockResolvedValueOnce(2);
    pollVideoById.mockResolvedValueOnce({ status: 'ok', changed: 0 });
    const { app } = createApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/videos/9/sync',
      headers: { 'x-api-key': 'admin-key' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      item: { id: 9, bvid: 'BV-refresh-miss', comment_count: 2 },
    });
    expect(prisma.comment.count).toHaveBeenCalledWith({ where: { video_id: 'BV-refresh-miss' } });

    await app.close();
  });

  it('lists, creates, activates, and deletes credentials including validation branches', async () => {
    prisma.bilibiliCredential.findMany.mockResolvedValue([
      {
        id: 1,
        name: 'primary',
        is_active: true,
        sessdata: 'sess',
        bili_jct: '',
        buvid3: '1234567890abcdef',
        expires_at: new Date('2026-06-09T00:00:00.000Z'),
        last_used_at: null,
        created_at: new Date('2026-06-08T00:00:00.000Z'),
        updated_at: new Date('2026-06-09T00:00:00.000Z'),
      },
    ]);
    prisma.bilibiliCredential.count.mockResolvedValueOnce(0).mockResolvedValueOnce(2);
    prisma.bilibiliCredential.create.mockResolvedValueOnce({
      id: 2,
      name: 'new',
      is_active: true,
      expires_at: null,
    });
    prisma.bilibiliCredential.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 2 })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 2 });
    prisma.bilibiliCredential.updateMany.mockResolvedValue({});
    prisma.bilibiliCredential.update.mockResolvedValue({});
    prisma.bilibiliCredential.delete.mockResolvedValue({});
    const { app } = createApp();

    const list = await app.inject({
      method: 'GET',
      url: '/api/admin/bilibili/credentials',
      headers: { 'x-api-key': 'admin-key' },
    });
    const missingName = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/credentials',
      headers: { 'x-api-key': 'admin-key' },
      payload: {},
    });
    const missingSessdata = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/credentials',
      headers: { 'x-api-key': 'admin-key' },
      payload: { name: 'new' },
    });
    const missingBiliJct = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/credentials',
      headers: { 'x-api-key': 'admin-key' },
      payload: { name: 'new', sessdata: 'sess' },
    });
    const missingBuvid = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/credentials',
      headers: { 'x-api-key': 'admin-key' },
      payload: { name: 'new', sessdata: 'sess', bili_jct: 'jct' },
    });
    const invalidExpires = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/credentials',
      headers: { 'x-api-key': 'admin-key' },
      payload: { name: 'new', sessdata: 'sess', bili_jct: 'jct', buvid3: 'buvid', expires_at: 'nope' },
    });
    const created = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/credentials',
      headers: { 'x-api-key': 'admin-key' },
      payload: { name: 'new', sessdata: 'sess', bili_jct: 'jct', buvid3: 'buvid', buvid4: '' },
    });
    const invalidActivate = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/credentials/nope/activate',
      headers: { 'x-api-key': 'admin-key' },
    });
    const missingActivate = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/credentials/2/activate',
      headers: { 'x-api-key': 'admin-key' },
    });
    const activated = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/credentials/2/activate',
      headers: { 'x-api-key': 'admin-key' },
    });
    const invalidDelete = await app.inject({
      method: 'DELETE',
      url: '/api/admin/bilibili/credentials/nope',
      headers: { 'x-api-key': 'admin-key' },
    });
    const missingDelete = await app.inject({
      method: 'DELETE',
      url: '/api/admin/bilibili/credentials/2',
      headers: { 'x-api-key': 'admin-key' },
    });
    const deleted = await app.inject({
      method: 'DELETE',
      url: '/api/admin/bilibili/credentials/2',
      headers: { 'x-api-key': 'admin-key' },
    });

    expect(list.json().items[0]).toMatchObject({
      id: 1,
      has_sessdata: true,
      has_bili_jct: false,
      buvid3: '12345678...',
      expires_at: '2026-06-09T00:00:00.000Z',
    });
    expect(missingName.json()).toEqual({ detail: 'name_required' });
    expect(missingSessdata.json()).toEqual({ detail: 'sessdata_required' });
    expect(missingBiliJct.json()).toEqual({ detail: 'bili_jct_required' });
    expect(missingBuvid.json()).toEqual({ detail: 'buvid3_required' });
    expect(invalidExpires.json()).toEqual({ detail: 'invalid_expires_at' });
    expect(created.json()).toEqual({ ok: true, item: { id: 2, name: 'new', is_active: true, expires_at: null } });
    expect(invalidActivate.json()).toEqual({ detail: 'invalid_credential_id' });
    expect(missingActivate.json()).toEqual({ detail: 'credential_not_found' });
    expect(activated.json()).toEqual({ ok: true, active_credential_id: 2 });
    expect(invalidDelete.json()).toEqual({ detail: 'invalid_credential_id' });
    expect(missingDelete.json()).toEqual({ detail: 'credential_not_found' });
    expect(deleted.json()).toEqual({ ok: true, deleted_id: 2 });
    expect(prisma.bilibiliCredential.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: 'new', sessdata: 'sess', bili_jct: 'jct', buvid3: 'buvid', buvid4: null }),
    });

    await app.close();
  });

  it('serializes credential optional dates, short buvid values, and inactive creation with expiry', async () => {
    prisma.bilibiliCredential.findMany.mockResolvedValue([
      {
        id: 3,
        name: 'short',
        is_active: false,
        sessdata: '',
        bili_jct: 'jct',
        buvid3: 'short',
        expires_at: null,
        last_used_at: new Date('2026-06-09T01:00:00.000Z'),
        created_at: null,
        updated_at: null,
      },
    ]);
    prisma.bilibiliCredential.count.mockResolvedValue(4);
    prisma.bilibiliCredential.create.mockResolvedValue({
      id: 4,
      name: 'expiring',
      is_active: false,
      expires_at: new Date('2026-06-10T00:00:00.000Z'),
    });
    const { app } = createApp();

    const list = await app.inject({
      method: 'GET',
      url: '/api/admin/bilibili/credentials',
      headers: { 'x-api-key': 'admin-key' },
    });
    const created = await app.inject({
      method: 'POST',
      url: '/api/admin/bilibili/credentials',
      headers: { 'x-api-key': 'admin-key' },
      payload: {
        name: 'expiring',
        sessdata: 'sess',
        bili_jct: 'jct',
        buvid3: 'short',
        buvid4: 'buvid4',
        expires_at: '2026-06-10T00:00:00.000Z',
      },
    });

    expect(list.json().items[0]).toMatchObject({
      id: 3,
      has_sessdata: false,
      has_bili_jct: true,
      buvid3: 'short',
      expires_at: null,
      last_used_at: '2026-06-09T01:00:00.000Z',
      created_at: null,
      updated_at: null,
    });
    expect(created.json()).toEqual({
      ok: true,
      item: {
        id: 4,
        name: 'expiring',
        is_active: false,
        expires_at: '2026-06-10T00:00:00.000Z',
      },
    });
    expect(prisma.bilibiliCredential.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'expiring',
        buvid4: 'buvid4',
        is_active: false,
        expires_at: new Date('2026-06-10T00:00:00.000Z'),
      }),
    });

    await app.close();
  });
});
