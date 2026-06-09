import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { getPrisma } from '../lib/prisma.js';
import type { RuntimeSettings } from '../server/contracts.js';

export type AdminReportingRouteDependencies = {
  settings: RuntimeSettings;
  checkApiKey: (request: FastifyRequest, reply: FastifyReply, settings: RuntimeSettings) => boolean;
  parseAdminString: (value: unknown) => string | undefined;
  parseAdminLimit: (value: unknown, defaultValue: number, min: number, max: number) => number;
  parseAdminOffset: (value: unknown, defaultValue: number, min: number, max: number) => number;
  parseAdminBoolean: (value: unknown) => boolean | undefined;
  parseJsonRecord: (value: unknown) => Record<string, unknown>;
  getAuditLogDetail: (payload: Record<string, unknown>) => string | null;
  csvEscape: (value: string) => string;
  summarizeAdminAuditLogs: (input: {
    days: number;
    action?: string;
    ok?: boolean;
  }) => Promise<Record<string, unknown>> | Record<string, unknown>;
  normalizeAdminAuditSummaryPayload: (summary: Record<string, unknown>) => Record<string, unknown>;
  getObservabilitySummary: (input: {
    windowMinutes: number;
  }) => Promise<{ ok: boolean; summary: Record<string, unknown> }> | { ok: boolean; summary: Record<string, unknown> };
};

export function registerAdminReportingRoutes(app: FastifyInstance, deps: AdminReportingRouteDependencies): void {
  app.get('/api/admin/audit/summary', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const query = request.query as Record<string, unknown>;
    const response = await deps.summarizeAdminAuditLogs({
      days: deps.parseAdminLimit(query.days, 7, 1, 90),
      action: deps.parseAdminString(query.action),
      ok: deps.parseAdminBoolean(query.ok),
    });
    return reply.send({ ...deps.normalizeAdminAuditSummaryPayload(response), ok: true });
  });

  app.get('/api/admin/audit-logs/summary', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const query = request.query as Record<string, unknown>;
    const response = await deps.summarizeAdminAuditLogs({
      days: deps.parseAdminLimit(query.days, 7, 1, 90),
      action: deps.parseAdminString(query.action),
      ok: deps.parseAdminBoolean(query.ok),
    });
    return reply.send(response);
  });

  app.get('/api/admin/observability/summary', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const query = request.query as Record<string, unknown>;
    const windowMinutes = deps.parseAdminLimit(query.window_minutes, 60, 1, 1440);
    const response = await deps.getObservabilitySummary({ windowMinutes });
    return reply.send(response);
  });

  const handleListAuditLogsRoute = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const query = request.query as Record<string, unknown>;
    const prisma = getPrisma();

    const where: Record<string, unknown> = {};
    const action = deps.parseAdminString(query.action);
    const okFilter = deps.parseAdminBoolean(query.ok);
    const targetId = deps.parseAdminLimit(query.target_id, -1, 0, Number.MAX_SAFE_INTEGER);
    const traceId = deps.parseAdminString(query.trace_id);
    if (action) where.action = action;
    if (okFilter !== undefined) where.ok = okFilter;
    if (targetId >= 0) where.target_id = targetId;
    if (traceId) where.trace_id = traceId;

    const limit = deps.parseAdminLimit(query.limit, 200, 1, 5000);
    const offset = deps.parseAdminOffset(query.offset, 0, 0, 100000);

    const [total, items] = await Promise.all([
      prisma.operationAuditLog.count({ where }),
      prisma.operationAuditLog.findMany({
        where,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        skip: offset,
        take: limit,
      }),
    ]);

    return reply.send({
      ok: true,
      summary: { total, returned: items.length, limit },
      items: items.map((item) => {
        const payload = deps.parseJsonRecord(item.payload);
        return {
          id: item.id,
          action: item.action,
          target_type: item.target_type,
          target_id: item.target_id,
          ok: item.ok,
          status: String(payload.status ?? '').trim() || null,
          trace_id: String(payload.trace_id ?? '').trim() || null,
          detail: deps.getAuditLogDetail(payload),
          payload,
          created_at: item.created_at?.toISOString() ?? null,
        };
      }),
    });
  };

  app.get('/audit-logs', handleListAuditLogsRoute);
  app.get('/api/audit-logs', handleListAuditLogsRoute);
  app.get('/api/audit-log', handleListAuditLogsRoute);

  app.get('/export/audit-logs.csv', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const query = request.query as Record<string, unknown>;
    const prisma = getPrisma();

    const where: Record<string, unknown> = {};
    const action = deps.parseAdminString(query.action);
    const okFilter = deps.parseAdminBoolean(query.ok);
    const targetId = deps.parseAdminLimit(query.target_id, -1, 0, Number.MAX_SAFE_INTEGER);
    if (action) where.action = action;
    if (okFilter !== undefined) where.ok = okFilter;
    if (targetId >= 0) where.target_id = targetId;

    const limit = deps.parseAdminLimit(query.limit, 1000, 1, 5000);
    const items = await prisma.operationAuditLog.findMany({
      where,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      take: limit,
    });

    const header = 'id,action,target_type,target_id,ok,status,trace_id,payload,created_at';
    const rows = items.map((item) => {
      const payload = typeof item.payload === 'string' ? JSON.parse(item.payload) : (item.payload ?? {});
      return [
        item.id,
        deps.csvEscape(item.action),
        deps.csvEscape(item.target_type),
        item.target_id ?? '',
        item.ok,
        deps.csvEscape(String(payload.status ?? '')),
        deps.csvEscape(String(payload.trace_id ?? '')),
        deps.csvEscape(JSON.stringify(payload)),
        item.created_at?.toISOString() ?? '',
      ].join(',');
    });

    const csvBody = [header, ...rows].join('\n');
    const filename = `audit_logs_export_${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z.csv`;
    void reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    return reply.type('text/csv').send(csvBody);
  });

  app.get('/audit-logs/summary', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const query = request.query as Record<string, unknown>;
    const days = deps.parseAdminLimit(query.days, 7, 1, 90);
    const action = deps.parseAdminString(query.action);
    const okFilter = deps.parseAdminBoolean(query.ok);
    const prisma = getPrisma();

    const startUtc = new Date(Date.now() - days * 24 * 3600 * 1000);
    const where: Record<string, unknown> = { created_at: { gte: startUtc } };
    if (action) where.action = action;
    if (okFilter !== undefined) where.ok = okFilter;

    const items = await prisma.operationAuditLog.findMany({ where });

    const byAction: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byResult = { ok: 0, failed: 0 };

    for (const item of items) {
      byAction[item.action] = (byAction[item.action] ?? 0) + 1;
      const payload = typeof item.payload === 'string' ? JSON.parse(item.payload) : (item.payload ?? {});
      const statusValue = String(payload.status ?? '').trim();
      if (statusValue) byStatus[statusValue] = (byStatus[statusValue] ?? 0) + 1;
      if (item.ok) byResult.ok++;
      else byResult.failed++;
    }

    return reply.send({
      ok: true,
      days,
      totals: { audit_logs: items.length },
      by_action: Object.fromEntries(Object.entries(byAction).sort()),
      by_status: Object.fromEntries(Object.entries(byStatus).sort()),
      by_result: byResult,
    });
  });

  const handleDailyMetricsRoute = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const query = request.query as Record<string, unknown>;
    const days = deps.parseAdminLimit(query.days, 7, 1, 60);
    const prisma = getPrisma();

    const startUtc = new Date(Date.now() - days * 24 * 3600 * 1000);
    const comments = await prisma.comment.findMany({
      where: { created_at: { gte: startUtc } },
      select: { created_at: true },
      orderBy: { created_at: 'asc' },
    });
    const jobs = await prisma.replyJob.findMany({
      where: { created_at: { gte: startUtc } },
      select: { created_at: true, status: true },
      orderBy: { created_at: 'asc' },
    });

    const commentsByDay: Record<string, number> = {};
    const grouped: Record<string, Record<string, number>> = {};
    const totalsByStatus: Record<string, number> = {};

    for (const comment of comments) {
      const dayKey = (comment.created_at ?? new Date()).toISOString().slice(0, 10);
      commentsByDay[dayKey] = (commentsByDay[dayKey] ?? 0) + 1;
    }

    for (const job of jobs) {
      const dayKey = (job.created_at ?? new Date()).toISOString().slice(0, 10);
      if (!grouped[dayKey]) grouped[dayKey] = {};
      const status = job.status;
      grouped[dayKey][status] = (grouped[dayKey][status] ?? 0) + 1;
      totalsByStatus[status] = (totalsByStatus[status] ?? 0) + 1;
    }

    const allDayKeys = [...new Set([...Object.keys(commentsByDay), ...Object.keys(grouped)])].sort();
    const items = allDayKeys.map((dayKey) => {
      const statusMap = grouped[dayKey] ?? {};
      const commentCount = commentsByDay[dayKey] ?? 0;
      const totalJobs = Object.values(statusMap).reduce((a, b) => a + b, 0);
      const publishedCount = statusMap.published ?? 0;
      const failedCount = statusMap.failed ?? 0;
      const skippedCount = statusMap.skipped ?? 0;

      return {
        date: dayKey,
        comments: commentCount,
        comment_count: commentCount,
        jobs: totalJobs,
        job_count: totalJobs,
        queued: statusMap.queued ?? 0,
        published: publishedCount,
        published_count: publishedCount,
        manual_queue: statusMap.manual_queue ?? 0,
        blocked: statusMap.blocked ?? 0,
        failed: failedCount,
        failed_count: failedCount,
        dedupe_skipped: statusMap.dedupe_skipped ?? 0,
        skipped: skippedCount,
        skipped_count: skippedCount,
        status_breakdown: Object.fromEntries(Object.entries(statusMap).sort()),
        total: totalJobs,
      };
    });

    return reply.send({
      ok: true,
      days,
      totals: totalsByStatus,
      items,
    });
  };

  app.get('/metrics/daily', handleDailyMetricsRoute);
  app.get('/api/metrics/daily', handleDailyMetricsRoute);

  app.get('/api/metrics/overview', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const prisma = getPrisma();
    const totalJobs = await prisma.replyJob.count();
    const totalComments = await prisma.comment.count();
    const byStatusRows = await prisma.replyJob.groupBy({ by: ['status'], _count: true });
    const byStatus: Record<string, number> = {};
    for (const row of byStatusRows) {
      const count = row._count as unknown;
      byStatus[row.status] =
        typeof count === 'number' ? count : Number((count as { _all?: number } | undefined)?._all ?? 0);
    }

    return reply.send({
      ok: true,
      totals: { comments: totalComments, jobs: totalJobs },
      by_status: byStatus,
    });
  });

  app.get('/api/audit-logs/summary', async (request, reply) => {
    if (!deps.checkApiKey(request, reply, deps.settings)) return;

    const query = request.query as Record<string, unknown>;
    const prisma = getPrisma();
    const days = deps.parseAdminLimit(query.days, 7, 1, 90);
    const since = new Date(Date.now() - days * 86400000);
    const total = await prisma.operationAuditLog.count({ where: { created_at: { gte: since } } });
    return reply.send({ ok: true, days, total });
  });
}
