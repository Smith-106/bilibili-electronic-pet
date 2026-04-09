import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { getPrisma } from '../lib/prisma.js';
import type { ReplyJob, RuntimeSettings } from '../server/contracts.js';

export type JobsRouteDependencies = {
  settings: RuntimeSettings;
  checkApiKey: (request: FastifyRequest, reply: FastifyReply, settings: RuntimeSettings) => boolean;
  parseAdminString: (value: unknown) => string | undefined;
  parseAdminLimit: (value: unknown, defaultValue: number, min: number, max: number) => number;
  parseAdminOffset: (value: unknown, defaultValue: number, min: number, max: number) => number;
  retryJob: (input: {
    jobId: number;
    forceLong?: boolean;
    styleProfile?: string;
    roleProfile?: string;
    roleCardKey?: string;
  }) =>
    | Promise<{ ok: boolean; requeued: boolean; job_id: number; trace_id: string; error?: string }>
    | { ok: boolean; requeued: boolean; job_id: number; trace_id: string; error?: string };
  approveJob: (input: {
    jobId: number;
    styleProfile?: string;
    roleProfile?: string;
    roleCardKey?: string;
  }) =>
    | Promise<{ ok: boolean; job_id: number; status: string; trace_id: string }>
    | { ok: boolean; job_id: number; status: string; trace_id: string };
  approveJobsBatch: (input: { jobIds: number[] }) =>
    | Promise<{
        ok: boolean;
        summary: { total: number; success: number; failed: number };
        results: Array<{ job_id: number; ok: boolean; status?: string; error?: string }>;
        trace_id: string;
      }>
    | {
        ok: boolean;
        summary: { total: number; success: number; failed: number };
        results: Array<{ job_id: number; ok: boolean; status?: string; error?: string }>;
        trace_id: string;
      };
  retryJobsBatch: (input: { jobIds: number[]; forceLong?: boolean }) =>
    | Promise<{
        ok: boolean;
        summary: { total: number; success: number; failed: number };
        results: Array<{ job_id: number; ok: boolean; requeued?: boolean; error?: string }>;
        trace_id: string;
      }>
    | {
        ok: boolean;
        summary: { total: number; success: number; failed: number };
        results: Array<{ job_id: number; ok: boolean; requeued?: boolean; error?: string }>;
        trace_id: string;
      };
  getJob: (input: { jobId: number }) => Promise<{ ok: boolean; item: ReplyJob }> | { ok: boolean; item: ReplyJob };
  listJobs: (input: {
    status?: string;
    limit: number;
    offset: number;
  }) => Promise<{ ok: boolean; items: ReplyJob[] }> | { ok: boolean; items: ReplyJob[] };
  exportJobsCsv: (input: { status?: string; limit: number }) => Promise<string> | string;
};

function parseJobId(value: unknown): number | null {
  const jobId = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(jobId) && jobId > 0 ? jobId : null;
}

export function registerJobRoutes(app: FastifyInstance, deps: JobsRouteDependencies): void {
  const handleRetryJobRoute = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const params = request.params as Record<string, unknown>;
    const jobId = parseJobId(params.job_id);
    if (jobId == null) {
      return reply.code(404).send({ detail: 'job_not_found' });
    }

    const body = request.body as Record<string, unknown>;
    const response = await deps.retryJob({
      jobId,
      forceLong: body.force_long ? Boolean(body.force_long) : undefined,
      styleProfile: body.style_profile ? String(body.style_profile) : undefined,
      roleProfile: body.role_profile ? String(body.role_profile) : undefined,
      roleCardKey: body.role_card_key ? String(body.role_card_key) : undefined,
    });
    return reply.send(response);
  };

  app.post('/jobs/:job_id/retry', handleRetryJobRoute);
  app.post('/api/jobs/:job_id/retry', handleRetryJobRoute);

  const handleApproveJobRoute = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const params = request.params as Record<string, unknown>;
    const jobId = parseJobId(params.job_id);
    if (jobId == null) {
      return reply.code(404).send({ detail: 'job_not_found' });
    }

    const body = request.body as Record<string, unknown>;
    const response = await deps.approveJob({
      jobId,
      styleProfile: body.style_profile ? String(body.style_profile) : undefined,
      roleProfile: body.role_profile ? String(body.role_profile) : undefined,
      roleCardKey: body.role_card_key ? String(body.role_card_key) : undefined,
    });
    return reply.send(response);
  };

  app.post('/jobs/:job_id/approve', handleApproveJobRoute);
  app.post('/api/jobs/:job_id/approve', handleApproveJobRoute);

  const handleApproveJobsBatchRoute = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const body = request.body as Record<string, unknown>;
    const jobIds = Array.isArray(body.job_ids)
      ? body.job_ids.map((id) => Number.parseInt(String(id), 10)).filter((id) => Number.isFinite(id) && id > 0)
      : [];

    if (jobIds.length === 0) {
      return reply.code(400).send({ detail: 'job_ids_required' });
    }

    const response = await deps.approveJobsBatch({ jobIds });
    return reply.send(response);
  };

  app.post('/jobs/approve-batch', handleApproveJobsBatchRoute);
  app.post('/api/jobs/approve-batch', handleApproveJobsBatchRoute);

  const handleRetryJobsBatchRoute = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const body = request.body as Record<string, unknown>;
    const jobIds = Array.isArray(body.job_ids)
      ? body.job_ids.map((id) => Number.parseInt(String(id), 10)).filter((id) => Number.isFinite(id) && id > 0)
      : [];

    if (jobIds.length === 0) {
      return reply.code(400).send({ detail: 'job_ids_required' });
    }

    const response = await deps.retryJobsBatch({
      jobIds,
      forceLong: body.force_long ? Boolean(body.force_long) : undefined,
    });
    return reply.send(response);
  };

  app.post('/jobs/retry-batch', handleRetryJobsBatchRoute);
  app.post('/api/jobs/retry-batch', handleRetryJobsBatchRoute);

  const handleGetJobRoute = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const params = request.params as Record<string, unknown>;
    const jobId = parseJobId(params.job_id);
    if (jobId == null) {
      return reply.code(404).send({ detail: 'job_not_found' });
    }

    const response = await deps.getJob({ jobId });
    const item =
      response &&
      typeof response === 'object' &&
      'item' in response &&
      response.item &&
      typeof response.item === 'object' &&
      !Array.isArray(response.item)
        ? (response.item as Record<string, unknown>)
        : null;

    return reply.send(item ? { ...response, ...item, item } : response);
  };

  app.get('/jobs/:job_id', handleGetJobRoute);
  app.get('/api/jobs/:job_id', handleGetJobRoute);

  app.get('/jobs', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const query = request.query as Record<string, unknown>;
    const response = await deps.listJobs({
      status: deps.parseAdminString(query.status),
      limit: deps.parseAdminLimit(query.limit, 50, 1, 1000),
      offset: deps.parseAdminOffset(query.offset, 0, 0, 100000),
    });
    return reply.send(response);
  });

  app.get('/export/jobs.csv', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const query = request.query as Record<string, unknown>;
    const csv = await deps.exportJobsCsv({
      status: deps.parseAdminString(query.status),
      limit: deps.parseAdminLimit(query.limit, 500, 1, 5000),
    });

    return reply.type('text/csv').send(csv);
  });

  app.get('/api/jobs', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const query = request.query as Record<string, unknown>;
    const prisma = getPrisma();
    const limit = deps.parseAdminLimit(query.limit, 50, 1, 500);
    const offset = deps.parseAdminOffset(query.offset, 0, 0, 100000);
    const [total, items] = await Promise.all([
      prisma.replyJob.count(),
      prisma.replyJob.findMany({ orderBy: { created_at: 'desc' }, skip: offset, take: limit }),
    ]);

    return reply.send({ ok: true, total, items });
  });
}
