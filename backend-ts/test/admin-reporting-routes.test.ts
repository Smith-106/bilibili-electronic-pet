import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerAdminReportingRoutes } from '../src/routes/admin-reporting.js';
import type { RuntimeSettings } from '../src/server/contracts.js';

const mockPrisma = vi.hoisted(() => ({
  operationAuditLog: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  comment: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  replyJob: {
    count: vi.fn(),
    findMany: vi.fn(),
    groupBy: vi.fn(),
  },
  observabilityEvent: {
    groupBy: vi.fn(),
  },
}));

vi.mock('../src/lib/prisma.js', () => ({
  getPrisma: () => mockPrisma,
}));

function parseAdminLimit(value: unknown, defaultValue: number, min: number, max: number): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(parsed)) return defaultValue;
  if (parsed < min) return min;
  if (parsed > max) return max;
  return parsed;
}

function parseAdminOffset(value: unknown, defaultValue: number, min: number, max: number): number {
  return parseAdminLimit(value, defaultValue, min, max);
}

function parseAdminString(value: unknown): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return undefined;
  const normalized = raw.trim();
  return normalized || undefined;
}

function parseAdminBoolean(value: unknown): boolean | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw === 'boolean') return raw;
  if (typeof raw !== 'string') return undefined;
  const normalized = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return undefined;
}

function parseJsonRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function csvEscape(value: string): string {
  if (!value) return '';
  if (/[,"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildApp(options: { authorized?: boolean } = {}) {
  const app = Fastify();
  registerAdminReportingRoutes(app, {
    settings: {} as RuntimeSettings,
    checkApiKey: (_request, reply) => {
      if (options.authorized === false) {
        void reply.code(401).send({ detail: 'unauthorized' });
        return false;
      }
      return true;
    },
    parseAdminString,
    parseAdminLimit,
    parseAdminOffset,
    parseAdminBoolean,
    parseJsonRecord,
    getAuditLogDetail: (payload) => (typeof payload.detail === 'string' ? payload.detail : null),
    csvEscape,
    summarizeAdminAuditLogs: (input) => ({
      ok: true,
      days: input.days,
      total: 3,
      totals: { audit_logs: 3, ok: input.ok === false ? 0 : 2, failed: input.ok === false ? 3 : 1 },
      by_action: input.action ? { [input.action]: 3 } : {},
      by_result: { ok: input.ok === false ? 0 : 2, failed: input.ok === false ? 3 : 1 },
    }),
    normalizeAdminAuditSummaryPayload: (summary) => ({
      ...summary,
      ok_count: Number((summary.totals as Record<string, unknown>).ok ?? 0),
      failed_count: Number((summary.totals as Record<string, unknown>).failed ?? 0),
    }),
    getObservabilitySummary: (input) => ({ ok: true, summary: { window_minutes: input.windowMinutes } }),
  });
  return app;
}

function resetMockPrisma(): void {
  mockPrisma.operationAuditLog.count.mockReset();
  mockPrisma.operationAuditLog.findMany.mockReset();
  mockPrisma.comment.count.mockReset();
  mockPrisma.comment.findMany.mockReset();
  mockPrisma.replyJob.count.mockReset();
  mockPrisma.replyJob.findMany.mockReset();
  mockPrisma.replyJob.groupBy.mockReset();
  mockPrisma.observabilityEvent.groupBy.mockReset();
}

beforeEach(() => {
  resetMockPrisma();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('admin reporting route registration', () => {
  it('normalizes admin audit summary route responses', async () => {
    const app = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/audit/summary?days=999&action=%20approve%20&ok=no',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      days: 90,
      total: 3,
      totals: { audit_logs: 3, ok: 0, failed: 3 },
      by_action: { approve: 3 },
      by_result: { ok: 0, failed: 3 },
      ok_count: 0,
      failed_count: 3,
    });

    await app.close();
  });

  it('returns legacy audit summary without normalization', async () => {
    const app = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/audit-logs/summary?days=2&action=retry&ok=true',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      days: 2,
      totals: { audit_logs: 3, ok: 2, failed: 1 },
      by_action: { retry: 3 },
    });

    await app.close();
  });

  it('lists audit logs through aliases with filters and parsed payload details', async () => {
    mockPrisma.operationAuditLog.count.mockResolvedValue(1);
    mockPrisma.operationAuditLog.findMany.mockResolvedValue([
      {
        id: 7,
        action: 'approve',
        target_type: 'reply_job',
        target_id: 42,
        ok: true,
        payload: JSON.stringify({ status: 'published', trace_id: 'trace-1', detail: 'approved reply' }),
        created_at: new Date('2026-06-08T01:02:03.000Z'),
      },
    ]);
    const app = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/audit-log?action=approve&ok=1&target_id=42&trace_id=trace-1&limit=9999&offset=-1',
    });

    expect(response.statusCode).toBe(200);
    expect(mockPrisma.operationAuditLog.count).toHaveBeenCalledWith({
      where: {
        action: 'approve',
        ok: true,
        target_id: 42,
        trace_id: 'trace-1',
      },
    });
    expect(mockPrisma.operationAuditLog.findMany).toHaveBeenCalledWith({
      where: {
        action: 'approve',
        ok: true,
        target_id: 42,
        trace_id: 'trace-1',
      },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      skip: 0,
      take: 5000,
    });
    expect(response.json()).toEqual({
      ok: true,
      summary: { total: 1, returned: 1, limit: 5000 },
      items: [
        {
          id: 7,
          action: 'approve',
          target_type: 'reply_job',
          target_id: 42,
          ok: true,
          status: 'published',
          trace_id: 'trace-1',
          detail: 'approved reply',
          payload: { status: 'published', trace_id: 'trace-1', detail: 'approved reply' },
          created_at: '2026-06-08T01:02:03.000Z',
        },
      ],
    });

    await app.close();
  });

  it('lists audit logs with default filters and null display fallbacks', async () => {
    mockPrisma.operationAuditLog.count.mockResolvedValue(1);
    mockPrisma.operationAuditLog.findMany.mockResolvedValue([
      {
        id: 8,
        action: 'retry',
        target_type: 'reply_job',
        target_id: null,
        ok: false,
        payload: {},
        created_at: null,
      },
    ]);
    const app = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/audit-logs',
    });

    expect(response.statusCode).toBe(200);
    expect(mockPrisma.operationAuditLog.count).toHaveBeenCalledWith({ where: {} });
    expect(mockPrisma.operationAuditLog.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      skip: 0,
      take: 200,
    });
    expect(response.json()).toEqual({
      ok: true,
      summary: { total: 1, returned: 1, limit: 200 },
      items: [
        {
          id: 8,
          action: 'retry',
          target_type: 'reply_job',
          target_id: null,
          ok: false,
          status: null,
          trace_id: null,
          detail: null,
          payload: {},
          created_at: null,
        },
      ],
    });

    await app.close();
  });

  it('exports filtered audit logs as escaped csv', async () => {
    mockPrisma.operationAuditLog.findMany.mockResolvedValue([
      {
        id: 3,
        action: 'approve,quoted',
        target_type: 'reply_job',
        target_id: null,
        ok: false,
        payload: { status: 'failed', trace_id: 'trace-csv', reason: 'bad "quote"' },
        created_at: new Date('2026-06-08T02:00:00.000Z'),
      },
    ]);
    const app = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/export/audit-logs.csv?action=approve&ok=off&target_id=5&limit=0',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toContain('attachment; filename="audit_logs_export_');
    expect(mockPrisma.operationAuditLog.findMany).toHaveBeenCalledWith({
      where: {
        action: 'approve',
        ok: false,
        target_id: 5,
      },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      take: 1,
    });
    expect(response.body).toContain('id,action,target_type,target_id,ok,status,trace_id,payload,created_at');
    expect(response.body).toContain('3,"approve,quoted",reply_job,,false,failed,trace-csv,');
    expect(response.body).toContain('bad \\""quote\\""');

    await app.close();
  });

  it('exports audit logs with default filters, string payloads, and empty fallbacks', async () => {
    mockPrisma.operationAuditLog.findMany.mockResolvedValue([
      {
        id: 4,
        action: 'plain',
        target_type: '',
        target_id: 9,
        ok: true,
        payload: JSON.stringify({}),
        created_at: null,
      },
      {
        id: 5,
        action: 'null_payload',
        target_type: 'reply_job',
        target_id: undefined,
        ok: true,
        payload: null,
        created_at: undefined,
      },
    ]);
    const app = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/export/audit-logs.csv',
    });

    expect(response.statusCode).toBe(200);
    expect(mockPrisma.operationAuditLog.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      take: 1000,
    });
    expect(response.body).toContain('4,plain,,9,true,,,{');
    expect(response.body).toContain('5,null_payload,reply_job,,true,,,{}');

    await app.close();
  });

  it('aggregates non-admin audit summary by action status and result', async () => {
    mockPrisma.operationAuditLog.findMany.mockResolvedValue([
      {
        action: 'z_action',
        ok: false,
        payload: { status: 'failed' },
      },
      {
        action: 'a_action',
        ok: true,
        payload: JSON.stringify({ status: 'published' }),
      },
      {
        action: 'a_action',
        ok: true,
        payload: JSON.stringify({}),
      },
    ]);
    const app = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/audit-logs/summary?days=-5&action=%20a_action%20&ok=yes',
    });

    expect(response.statusCode).toBe(200);
    expect(mockPrisma.operationAuditLog.findMany).toHaveBeenCalledWith({
      where: {
        created_at: { gte: expect.any(Date) },
        action: 'a_action',
        ok: true,
      },
    });
    expect(response.json()).toEqual({
      ok: true,
      days: 1,
      totals: { audit_logs: 3 },
      by_action: {
        a_action: 2,
        z_action: 1,
      },
      by_status: {
        failed: 1,
        published: 1,
      },
      by_result: {
        ok: 2,
        failed: 1,
      },
    });

    await app.close();
  });

  it('aggregates audit summary without optional filters and null payload fallback', async () => {
    mockPrisma.operationAuditLog.findMany.mockResolvedValue([
      {
        action: 'retry',
        ok: false,
        payload: null,
      },
    ]);
    const app = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/audit-logs/summary',
    });

    expect(response.statusCode).toBe(200);
    expect(mockPrisma.operationAuditLog.findMany).toHaveBeenCalledWith({
      where: {
        created_at: { gte: expect.any(Date) },
      },
    });
    expect(response.json()).toEqual({
      ok: true,
      days: 7,
      totals: { audit_logs: 1 },
      by_action: { retry: 1 },
      by_status: {},
      by_result: { ok: 0, failed: 1 },
    });

    await app.close();
  });

  it('serves daily metrics with null dates and missing status buckets', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-08T12:00:00.000Z'));

    mockPrisma.comment.findMany.mockResolvedValue([
      { created_at: null },
      { created_at: new Date('2026-06-08T01:00:00.000Z') },
      { created_at: new Date('2026-06-07T01:00:00.000Z') },
    ]);
    mockPrisma.replyJob.findMany.mockResolvedValue([
      { created_at: null, status: 'queued' },
      { created_at: new Date('2026-06-08T02:00:00.000Z'), status: 'published' },
      { created_at: new Date('2026-06-09T02:00:00.000Z'), status: 'failed' },
    ]);
    const app = buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/metrics/daily?days=999',
    });

    expect(response.statusCode).toBe(200);
    expect(mockPrisma.comment.findMany).toHaveBeenCalledWith({
      where: { created_at: { gte: expect.any(Date) } },
      select: { created_at: true },
      orderBy: { created_at: 'asc' },
    });
    expect(mockPrisma.replyJob.findMany).toHaveBeenCalledWith({
      where: { created_at: { gte: expect.any(Date) } },
      select: { created_at: true, status: true },
      orderBy: { created_at: 'asc' },
    });
    const body = response.json();
    expect(body.ok).toBe(true);
    expect(body.days).toBe(60);
    expect(body.totals).toEqual({ queued: 1, published: 1, failed: 1 });
    expect(body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          date: '2026-06-07',
          comments: 1,
          jobs: 0,
          queued: 0,
          published: 0,
          failed: 0,
          skipped: 0,
          status_breakdown: {},
        }),
        expect.objectContaining({
          date: '2026-06-08',
          comments: 2,
          jobs: 2,
          queued: 1,
          published: 1,
          failed: 0,
          skipped: 0,
          status_breakdown: { published: 1, queued: 1 },
        }),
        expect.objectContaining({
          date: '2026-06-09',
          comments: 0,
          jobs: 1,
          queued: 0,
          published: 0,
          failed: 1,
          skipped: 0,
          status_breakdown: { failed: 1 },
        }),
      ]),
    );

    await app.close();
  });

  it('serves metrics overview with numeric and nested group counts', async () => {
    mockPrisma.replyJob.count.mockResolvedValue(5);
    mockPrisma.comment.count.mockResolvedValue(8);
    mockPrisma.replyJob.groupBy.mockResolvedValue([
      { status: 'published', _count: 2 },
      { status: 'failed', _count: { _all: 3 } },
      { status: 'queued', _count: {} },
    ]);
    mockPrisma.observabilityEvent.groupBy.mockResolvedValue([
      { error_subclass: 'behavior_anomaly', _count: { _all: 4 } },
      { error_subclass: 'rate_limit', _count: 1 },
      { error_subclass: null, _count: { _all: 0 } },
    ]);
    const app = buildApp();

    const response = await app.inject({ method: 'GET', url: '/api/metrics/overview' });

    expect(response.statusCode).toBe(200);
    expect(mockPrisma.observabilityEvent.groupBy).toHaveBeenCalledWith({
      by: ['error_subclass'],
      where: {
        event_type: { in: ['backoff_applied', 'antirisk_signal_detected'] },
        created_at: { gte: expect.any(Date) },
        error_subclass: { not: null },
      },
      _count: { _all: true },
    });
    expect(response.json()).toEqual({
      ok: true,
      totals: { comments: 8, jobs: 5 },
      by_status: {
        published: 2,
        failed: 3,
        queued: 0,
      },
      by_antirisk_subclass: {
        behavior_anomaly: 4,
        rate_limit: 1,
      },
    });

    await app.close();
  });

  it('serves metrics overview with empty by_antirisk_subclass when no antirisk events recorded', async () => {
    mockPrisma.replyJob.count.mockResolvedValue(0);
    mockPrisma.comment.count.mockResolvedValue(0);
    mockPrisma.replyJob.groupBy.mockResolvedValue([]);
    mockPrisma.observabilityEvent.groupBy.mockResolvedValue([]);
    const app = buildApp();

    const response = await app.inject({ method: 'GET', url: '/api/metrics/overview' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      ok: true,
      totals: { comments: 0, jobs: 0 },
      by_status: {},
      by_antirisk_subclass: {},
    });

    await app.close();
  });

  it('serves compact audit log total summary', async () => {
    mockPrisma.operationAuditLog.count.mockResolvedValue(12);
    const app = buildApp();

    const response = await app.inject({ method: 'GET', url: '/api/audit-logs/summary?days=abc' });

    expect(response.statusCode).toBe(200);
    expect(mockPrisma.operationAuditLog.count).toHaveBeenCalledWith({
      where: { created_at: { gte: expect.any(Date) } },
    });
    expect(response.json()).toEqual({ ok: true, days: 7, total: 12 });

    await app.close();
  });

  it('returns early when authorization fails for admin summaries', async () => {
    const app = buildApp({ authorized: false });

    const auditSummary = await app.inject({ method: 'GET', url: '/api/admin/audit/summary' });
    const legacySummary = await app.inject({ method: 'GET', url: '/api/admin/audit-logs/summary' });
    const observability = await app.inject({ method: 'GET', url: '/api/admin/observability/summary' });

    expect(auditSummary.statusCode).toBe(401);
    expect(legacySummary.statusCode).toBe(401);
    expect(observability.statusCode).toBe(401);
    expect(auditSummary.json()).toEqual({ detail: 'unauthorized' });
    expect(legacySummary.json()).toEqual({ detail: 'unauthorized' });
    expect(observability.json()).toEqual({ detail: 'unauthorized' });
    expect(mockPrisma.operationAuditLog.findMany).not.toHaveBeenCalled();

    await app.close();
  });

  it('returns early when authorization fails for data-backed reporting routes', async () => {
    const app = buildApp({ authorized: false });

    const csv = await app.inject({ method: 'GET', url: '/export/audit-logs.csv' });
    const auditSummary = await app.inject({ method: 'GET', url: '/audit-logs/summary' });
    const metricsOverview = await app.inject({ method: 'GET', url: '/api/metrics/overview' });
    const compactSummary = await app.inject({ method: 'GET', url: '/api/audit-logs/summary' });

    expect(csv.statusCode).toBe(401);
    expect(auditSummary.statusCode).toBe(401);
    expect(metricsOverview.statusCode).toBe(401);
    expect(compactSummary.statusCode).toBe(401);
    expect(mockPrisma.operationAuditLog.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.replyJob.count).not.toHaveBeenCalled();
    expect(mockPrisma.operationAuditLog.count).not.toHaveBeenCalled();

    await app.close();
  });
});
