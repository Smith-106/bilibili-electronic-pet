import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import type { AdminJobsResponse, RuntimeSettings } from '../server/contracts.js';

export type AdminCoreRouteDependencies = {
  settings: RuntimeSettings;
  getHeaderValue: (value: string | string[] | undefined) => string;
  getAdminOverview: () => Promise<Record<string, unknown>> | Record<string, unknown>;
  normalizeAdminOverviewPayload: (overview: Record<string, unknown>) => Record<string, unknown>;
  listAdminJobs: (input: { status?: string; limit: number; offset: number }) => Promise<AdminJobsResponse> | AdminJobsResponse;
  parseAdminString: (value: unknown) => string | undefined;
  parseAdminLimit: (value: unknown, defaultValue: number, min: number, max: number) => number;
  parseAdminOffset: (value: unknown, defaultValue: number, min: number, max: number) => number;
  normalizeAdminJobListItem: (item: Record<string, unknown>) => Record<string, unknown>;
};

function authorize(request: FastifyRequest, reply: FastifyReply, deps: AdminCoreRouteDependencies): boolean {
  const expectedApiKey = deps.settings.apiKey.trim();
  if (!expectedApiKey) {
    return true;
  }
  const providedApiKey = deps.getHeaderValue(request.headers['x-api-key']).trim();
  if (providedApiKey !== expectedApiKey) {
    void reply.code(401).send({ detail: 'unauthorized' });
    return false;
  }
  return true;
}

export function registerAdminCoreRoutes(app: FastifyInstance, deps: AdminCoreRouteDependencies): void {
  app.get('/api/admin/overview', async (request, reply) => {
    if (!authorize(request, reply, deps)) return;
    const overview = await deps.getAdminOverview();
    return reply.send({ ok: true, ...deps.normalizeAdminOverviewPayload(overview) });
  });

  app.get('/api/admin/metrics/overview', async (request, reply) => {
    if (!authorize(request, reply, deps)) return;
    const overview = await deps.getAdminOverview();
    return reply.send(overview);
  });

  app.get('/api/admin/jobs', async (request, reply) => {
    if (!authorize(request, reply, deps)) return;

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
