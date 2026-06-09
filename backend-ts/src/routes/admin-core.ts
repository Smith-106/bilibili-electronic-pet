import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import type {
  AdminJobsResponse,
  CompanionStateV2,
  PlatformConnectionSnapshot,
  RuntimeSettings,
} from '../server/contracts.js';
import { isPetActionName, type PetActionName } from '../server/pet-contracts.js';
import { isPlatformName } from '../server/platform-contracts.js';

export type AdminCoreRouteDependencies = {
  settings: RuntimeSettings;
  checkApiKey: (request: FastifyRequest, reply: FastifyReply, settings: RuntimeSettings) => boolean;
  getHeaderValue: (value: string | string[] | undefined) => string;
  issueAdminSession: () => { token: string; expiresAt: string } | null;
  getAdminOverview: () => Promise<Record<string, unknown>> | Record<string, unknown>;
  getCompanionStateV2: () => Promise<CompanionStateV2> | CompanionStateV2;
  listPlatformConnections: () =>
    | Promise<{ ok: boolean; items: PlatformConnectionSnapshot[] }>
    | { ok: boolean; items: PlatformConnectionSnapshot[] };
  updatePlatformConnectionControl: (input: {
    platform: PlatformConnectionSnapshot['platform'];
    enabled: boolean;
  }) => Promise<{ ok: boolean; item: PlatformConnectionSnapshot }> | { ok: boolean; item: PlatformConnectionSnapshot };
  recordCompanionAction: (input: {
    action: PetActionName;
    note?: string;
  }) => Promise<{ ok: boolean; action: string; item_key: string }> | { ok: boolean; action: string; item_key: string };
  normalizeAdminOverviewPayload: (overview: Record<string, unknown>) => Record<string, unknown>;
  listAdminJobs: (input: {
    status?: string;
    limit: number;
    offset: number;
  }) => Promise<AdminJobsResponse> | AdminJobsResponse;
  parseAdminString: (value: unknown) => string | undefined;
  parseAdminLimit: (value: unknown, defaultValue: number, min: number, max: number) => number;
  parseAdminOffset: (value: unknown, defaultValue: number, min: number, max: number) => number;
  normalizeAdminJobListItem: (item: Record<string, unknown>) => Record<string, unknown>;
};

export function registerAdminCoreRoutes(app: FastifyInstance, deps: AdminCoreRouteDependencies): void {
  app.post('/api/admin/session/login', async (request, reply) => {
    const expectedApiKey = deps.settings.apiKey.trim();
    if (!expectedApiKey) {
      return reply.code(503).send({ detail: 'admin_auth_unconfigured' });
    }

    const body = request.body as Record<string, unknown>;
    const providedApiKey = String(body.api_key ?? body.apiKey ?? '').trim();
    if (providedApiKey !== expectedApiKey) {
      return reply.code(401).send({ detail: 'unauthorized' });
    }

    const session = deps.issueAdminSession();
    if (!session) {
      return reply.code(503).send({ detail: 'admin_session_unavailable' });
    }

    return reply.send({
      ok: true,
      session_token: session.token,
      expires_at: session.expiresAt,
    });
  });

  app.get('/api/admin/overview', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;
    const overview = await deps.getAdminOverview();
    return reply.send({ ok: true, ...deps.normalizeAdminOverviewPayload(overview) });
  });

  app.get('/api/admin/metrics/overview', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;
    const overview = await deps.getAdminOverview();
    return reply.send(overview);
  });

  app.get('/api/admin/pet/overview', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;
    const item = await deps.getCompanionStateV2();
    return reply.send({ ok: true, item });
  });

  app.post('/api/admin/pet/actions', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const body = request.body as Record<string, unknown>;
    const action = String(body.action ?? '')
      .trim()
      .toLowerCase();
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 256) : undefined;

    if (!isPetActionName(action)) {
      return reply.code(400).send({ detail: 'action_invalid' });
    }

    const response = await deps.recordCompanionAction({
      action,
      note,
    });
    return reply.send(response);
  });

  app.get('/api/admin/platforms', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;
    const response = await deps.listPlatformConnections();
    return reply.send(response);
  });

  app.post('/api/admin/platforms/:platform/control', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;
    const platform = String((request.params as Record<string, unknown>).platform)
      .trim()
      .toLowerCase();
    if (!isPlatformName(platform)) {
      return reply.code(400).send({ detail: 'platform_invalid' });
    }
    const body = request.body as Record<string, unknown>;
    const response = await deps.updatePlatformConnectionControl({
      platform,
      enabled: Boolean(body.enabled),
    });
    return reply.send(response);
  });

  app.get('/api/admin/jobs', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const query = request.query as Record<string, unknown>;
    const response = await deps.listAdminJobs({
      status: deps.parseAdminString(query.status),
      limit: deps.parseAdminLimit(query.limit, 50, 1, 1000),
      offset: deps.parseAdminOffset(query.offset, 0, 0, 100000),
    });
    return reply.send({
      ok: true,
      ...response,
      items: response.items.map((item) => deps.normalizeAdminJobListItem(item)),
    });
  });
}
