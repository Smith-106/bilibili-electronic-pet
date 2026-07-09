import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { getPrisma } from '../lib/prisma.js';
import type { RuntimeSettings } from '../server/contracts.js';
import { encrypt } from '../services/credential-crypto.js';

type BilibiliStatusResponse = {
  ok: boolean;
  config: Record<string, unknown>;
  credential: Record<string, unknown> | null;
  videos: Record<string, unknown>;
  diagnostics: Record<string, unknown>;
};

type BilibiliVideoResponse = {
  ok: boolean;
  total: number;
  items: Array<Record<string, unknown>>;
};

type BilibiliVideoCreateResponse = {
  ok: boolean;
  item: Record<string, unknown>;
};

export type BilibiliAdminRouteDependencies = {
  settings: RuntimeSettings;
  checkApiKey: (request: FastifyRequest, reply: FastifyReply, settings: RuntimeSettings) => boolean;
  parseAdminBoolean: (value: unknown) => boolean | undefined;
  parseAdminLimit: (value: unknown, defaultValue: number, min: number, max: number) => number;
  parseAdminOffset: (value: unknown, defaultValue: number, min: number, max: number) => number;
  getBilibiliStatus: () => Promise<BilibiliStatusResponse> | BilibiliStatusResponse;
  listBilibiliVideos: (input: {
    pollEnabled?: boolean;
    limit: number;
    offset: number;
  }) => Promise<BilibiliVideoResponse> | BilibiliVideoResponse;
  addBilibiliVideo: (input: {
    bvid: string;
    pollEnabled?: boolean;
  }) => Promise<BilibiliVideoCreateResponse> | BilibiliVideoCreateResponse;
  normalizeBilibiliStatusPayload: (payload: Record<string, unknown>) => Record<string, unknown>;
  normalizeBilibiliVideoRecord: (
    row: Record<string, unknown>,
    options?: { commentCount?: number },
  ) => Record<string, unknown>;
};

export function registerBilibiliAdminRoutes(app: FastifyInstance, deps: BilibiliAdminRouteDependencies): void {
  app.get('/api/admin/bilibili/status', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;
    const response = await deps.getBilibiliStatus();
    return reply.send(deps.normalizeBilibiliStatusPayload(response as unknown as Record<string, unknown>));
  });

  app.get('/api/admin/bilibili/videos', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const query = request.query as Record<string, unknown>;
    const pollEnabledRaw = query.poll_enabled;
    const pollEnabled =
      pollEnabledRaw === 'true' || pollEnabledRaw === '1'
        ? true
        : pollEnabledRaw === 'false' || pollEnabledRaw === '0'
          ? false
          : undefined;

    const response = await deps.listBilibiliVideos({
      pollEnabled,
      limit: deps.parseAdminLimit(query.limit, 50, 1, 200),
      offset: deps.parseAdminOffset(query.offset, 0, 0, 100000),
    });
    return reply.send(response);
  });

  app.post('/api/admin/bilibili/videos', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const body = request.body as Record<string, unknown>;
    const bvid = String(body.bvid ?? '')
      .trim()
      .slice(0, 20);
    const pollEnabled = body.poll_enabled !== undefined ? deps.parseAdminBoolean(body.poll_enabled) : undefined;

    if (!bvid) {
      return reply.code(400).send({ detail: 'bvid_required' });
    }
    if (body.poll_enabled !== undefined && pollEnabled === undefined) {
      return reply.code(400).send({ detail: 'invalid_poll_enabled' });
    }
    if (!/^BV[a-zA-Z0-9]{10}$/.test(bvid)) {
      return reply.code(400).send({ detail: 'invalid_bvid_format' });
    }

    const response = await deps.addBilibiliVideo({ bvid, pollEnabled: pollEnabled ?? true });
    return reply.send(response);
  });

  app.post('/api/admin/bilibili/videos/:videoId/toggle-poll', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;
    const videoId = Number((request.params as Record<string, string>).videoId);
    if (!Number.isFinite(videoId)) return reply.code(400).send({ detail: 'invalid_video_id' });

    const prisma = getPrisma();
    const video = await prisma.bilibiliVideo.findUnique({ where: { id: videoId } });
    if (!video) return reply.code(404).send({ detail: 'video_not_found' });

    const body = request.body as Record<string, unknown> | undefined;
    const requestedPollEnabled =
      body?.poll_enabled !== undefined ? deps.parseAdminBoolean(body.poll_enabled) : undefined;
    if (body?.poll_enabled !== undefined && requestedPollEnabled === undefined) {
      return reply.code(400).send({ detail: 'invalid_poll_enabled' });
    }
    const pollEnabled = requestedPollEnabled ?? !video.poll_enabled;
    await prisma.bilibiliVideo.update({ where: { id: videoId }, data: { poll_enabled: pollEnabled } });

    return reply.send({ ok: true, item: { id: videoId, bvid: video.bvid, poll_enabled: pollEnabled } });
  });

  app.delete('/api/admin/bilibili/videos/:videoId', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;
    const videoId = Number((request.params as Record<string, string>).videoId);
    if (!Number.isFinite(videoId)) return reply.code(400).send({ detail: 'invalid_video_id' });

    const prisma = getPrisma();
    const video = await prisma.bilibiliVideo.findUnique({ where: { id: videoId } });
    if (!video) return reply.code(404).send({ detail: 'video_not_found' });

    await prisma.bilibiliVideo.delete({ where: { id: videoId } });
    return reply.send({ ok: true, deleted_id: videoId });
  });

  app.post('/api/admin/bilibili/videos/:videoId/sync', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;
    const videoId = Number((request.params as Record<string, string>).videoId);
    if (!Number.isFinite(videoId)) return reply.code(400).send({ detail: 'invalid_video_id' });

    const prisma = getPrisma();
    const video = await prisma.bilibiliVideo.findUnique({ where: { id: videoId } });
    if (!video) return reply.code(404).send({ detail: 'video_not_found' });

    const { pollVideoById } = await import('../services/bilibili-poller.js');
    const result = await pollVideoById(videoId);
    if (result.status === 'disabled') {
      return reply.code(409).send({ detail: 'bilibili_not_configured', result });
    }
    if (result.status === 'not_found') {
      return reply.code(404).send({ detail: 'video_not_found', result });
    }
    if (result.status === 'error') {
      return reply.code(502).send({ detail: 'bilibili_sync_failed', result });
    }

    const refreshedVideo = await prisma.bilibiliVideo.findUnique({ where: { id: videoId } });
    const resolvedVideo = refreshedVideo ?? video;
    const commentCount = await prisma.comment.count({
      where: { video_id: resolvedVideo.bvid },
    });

    return reply.send({
      ok: true,
      item: deps.normalizeBilibiliVideoRecord(resolvedVideo as unknown as Record<string, unknown>, { commentCount }),
      result,
    });
  });

  app.post('/api/admin/bilibili/poll', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;
    const { pollAllVideos } = await import('../services/bilibili-poller.js');
    const result = await pollAllVideos();
    if (result.status === 'disabled') {
      return reply.code(409).send({ detail: 'bilibili_not_configured', result });
    }
    return reply.send({ ok: true, result });
  });

  app.get('/api/admin/bilibili/credentials', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;
    const prisma = getPrisma();
    const items = await prisma.bilibiliCredential.findMany({ orderBy: { updated_at: 'desc' } });

    return reply.send({
      ok: true,
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        is_active: item.is_active,
        has_sessdata: Boolean(item.sessdata),
        has_bili_jct: Boolean(item.bili_jct),
        buvid3: item.buvid3 && item.buvid3.length > 8 ? item.buvid3.slice(0, 8) + '...' : item.buvid3,
        expires_at: item.expires_at?.toISOString() ?? null,
        last_used_at: item.last_used_at?.toISOString() ?? null,
        created_at: item.created_at?.toISOString() ?? null,
        updated_at: item.updated_at?.toISOString() ?? null,
      })),
    });
  });

  app.post('/api/admin/bilibili/credentials', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;
    const body = request.body as Record<string, unknown>;
    const name = String(body.name ?? '')
      .trim()
      .slice(0, 64);
    const sessdata = String(body.sessdata ?? '').trim();
    const biliJct = String(body.bili_jct ?? '')
      .trim()
      .slice(0, 128);
    const buvid3 = String(body.buvid3 ?? '')
      .trim()
      .slice(0, 128);
    const buvid4 = String(body.buvid4 ?? '')
      .trim()
      .slice(0, 128);
    const expiresAt = body.expires_at ? new Date(body.expires_at as string) : null;

    if (!name) return reply.code(400).send({ detail: 'name_required' });
    if (!sessdata) return reply.code(400).send({ detail: 'sessdata_required' });
    if (!biliJct) return reply.code(400).send({ detail: 'bili_jct_required' });
    if (!buvid3) return reply.code(400).send({ detail: 'buvid3_required' });
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      return reply.code(400).send({ detail: 'invalid_expires_at' });
    }

    const prisma = getPrisma();
    const existingCount = await prisma.bilibiliCredential.count();
    const isActive = existingCount === 0;
    const encSessdata = encrypt(sessdata);
    const encBiliJct = encrypt(biliJct);
    const encBuvid3 = encrypt(buvid3);
    const encBuvid4 = buvid4 ? encrypt(buvid4) : null;

    const credential = await prisma.bilibiliCredential.create({
      data: {
        name,
        sessdata: encSessdata,
        bili_jct: encBiliJct,
        buvid3: encBuvid3,
        buvid4: encBuvid4,
        is_active: isActive,
        expires_at: expiresAt,
      },
    });

    return reply.send({
      ok: true,
      item: {
        id: credential.id,
        name: credential.name,
        is_active: credential.is_active,
        expires_at: credential.expires_at?.toISOString() ?? null,
      },
    });
  });

  app.post('/api/admin/bilibili/credentials/:credentialId/activate', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;
    const credentialId = Number((request.params as Record<string, string>).credentialId);
    if (!Number.isFinite(credentialId)) return reply.code(400).send({ detail: 'invalid_credential_id' });

    const prisma = getPrisma();
    const credential = await prisma.bilibiliCredential.findUnique({ where: { id: credentialId } });
    if (!credential) return reply.code(404).send({ detail: 'credential_not_found' });

    await prisma.bilibiliCredential.updateMany({ data: { is_active: false } });
    await prisma.bilibiliCredential.update({ where: { id: credentialId }, data: { is_active: true } });

    return reply.send({ ok: true, active_credential_id: credentialId });
  });

  app.delete('/api/admin/bilibili/credentials/:credentialId', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;
    const credentialId = Number((request.params as Record<string, string>).credentialId);
    if (!Number.isFinite(credentialId)) return reply.code(400).send({ detail: 'invalid_credential_id' });

    const prisma = getPrisma();
    const credential = await prisma.bilibiliCredential.findUnique({ where: { id: credentialId } });
    if (!credential) return reply.code(404).send({ detail: 'credential_not_found' });

    await prisma.bilibiliCredential.delete({ where: { id: credentialId } });
    return reply.send({ ok: true, deleted_id: credentialId });
  });
}
