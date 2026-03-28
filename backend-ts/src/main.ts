import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

import Fastify, { type FastifyInstance } from 'fastify';

export type ConnectionStatus = {
  connected: boolean;
  error?: string;
};

export type PlatformName = 'bilibili' | 'douyin' | 'kuaishou';

export type RuntimeSettings = {
  databaseUrl: string;
  celeryBrokerUrl: string;
  celeryResultBackend: string;
  apiKey: string;
  llmProvider: string;
  llmFallbackToMock: boolean;
  publisherMode: string;
  bilibiliEnabled: boolean;
  bilibiliPollEnabled: boolean;
  bilibiliPollIntervalSeconds: number;
  bilibiliPublishEnabled: boolean;
  killSwitch: boolean;
  gatewayToken: string;
  gatewayHmacSecret: string;
  platformBilibiliEnabled: boolean;
  platformDouyinEnabled: boolean;
  platformKuaishouEnabled: boolean;
  platformBilibiliPublishSource: string;
  platformDouyinPublishSource: string;
  platformKuaishouPublishSource: string;
};

export type BilibiliDiagnostics = {
  ready: boolean;
  blocking_reasons: string[];
  effective_publish_mode: string;
  signals: Record<string, unknown>;
  checks?: Record<string, unknown>;
  release_gates?: Record<string, unknown>;
};

export type GatewayPublishPayload = {
  comment_id: string;
  reply_text: string;
  force_publish: boolean;
  source: string;
  trace_id?: string;
};

export type PublishExecutionResult = {
  published: boolean;
  reason: string;
  publishedAt?: Date;
};

export type PublishReservationInput = {
  platform: PlatformName;
  canonicalCommentId: string;
  commentId: string;
  replyHash: string;
  source: string;
};

export type PublishFinalizeInput = {
  reservationKey: string;
  status: 'published' | 'failed';
  source: string;
  failureReason?: string;
  publishedAt?: Date;
};

export type ReservePublishLogResult = {
  duplicate: boolean;
  reservationKey: string;
};

export type PublishGatewayInput = {
  commentId: string;
  replyText: string;
  forcePublish: boolean;
  source: string;
  traceId: string;
};

export type PublishPlatformInput = {
  platform: PlatformName;
  commentId: string;
  replyText: string;
  forcePublish: boolean;
  traceId: string;
};

export type AdminJobsResponse = {
  items: Array<Record<string, unknown>>;
  total: number;
  limit: number;
  offset: number;
};

export type AdminGatewayLogsResponse = {
  items: Array<Record<string, unknown>>;
};

export type AdminAuditSummaryResponse = {
  ok: boolean;
  days: number;
  totals: Record<string, unknown>;
  by_action: Record<string, unknown>;
  by_result: Record<string, unknown>;
};

export type ServerDependencies = {
  settings: RuntimeSettings;
  checkDatabaseConnection: () => Promise<ConnectionStatus> | ConnectionStatus;
  checkRedisConnection: () => Promise<ConnectionStatus> | ConnectionStatus;
  buildBilibiliDiagnostics: () => Promise<BilibiliDiagnostics> | BilibiliDiagnostics;
  verifyPayloadSignature: (payload: Record<string, unknown>, secret: string, signature: string) => boolean;
  reservePublishLog: (input: PublishReservationInput) => Promise<ReservePublishLogResult> | ReservePublishLogResult;
  finalizePublishLog: (input: PublishFinalizeInput) => Promise<void> | void;
  publishGatewayReply: (input: PublishGatewayInput) => Promise<PublishExecutionResult> | PublishExecutionResult;
  publishPlatformReply: (input: PublishPlatformInput) => Promise<PublishExecutionResult> | PublishExecutionResult;
  normalizePublishFailureReason: (reason: string | undefined) => string;
  isPlatformEnabled: (platform: PlatformName, settings: RuntimeSettings) => boolean;
  getPlatformPublishSource: (platform: PlatformName, settings: RuntimeSettings) => string;
  createTraceId: (preferred?: string) => string;
  getAdminOverview: () => Promise<Record<string, unknown>> | Record<string, unknown>;
  listAdminJobs: (input: {
    status?: string;
    limit: number;
    offset: number;
  }) => Promise<AdminJobsResponse> | AdminJobsResponse;
  listAdminGatewayLogs: (input: {
    commentId?: string;
    limit: number;
  }) => Promise<AdminGatewayLogsResponse> | AdminGatewayLogsResponse;
  summarizeAdminAuditLogs: (input: {
    days: number;
    action?: string;
    ok?: boolean;
  }) => Promise<AdminAuditSummaryResponse> | AdminAuditSummaryResponse;
};

const STANDARD_PUBLISH_FAILURE_REASONS = new Set(['timeout', '5xx', 'auth', 'invalid_response']);
const TIMEOUT_HINTS = ['timeout', 'timedout', 'readtimeout', 'connecttimeout'];
const AUTH_HINTS = ['401', '403', 'unauthorized', 'forbidden', 'token', 'signature', 'auth'];

function hasText(value: string | undefined): boolean {
  return Boolean((value ?? '').trim());
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function parseInteger(value: string | undefined, defaultValue: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function parseAdminLimit(value: unknown, defaultValue: number, min: number, max: number): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }
  if (parsed < min) {
    return min;
  }
  if (parsed > max) {
    return max;
  }
  return parsed;
}

function parseAdminOffset(value: unknown, defaultValue: number, min: number, max: number): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }
  if (parsed < min) {
    return min;
  }
  if (parsed > max) {
    return max;
  }
  return parsed;
}

function parseAdminString(value: unknown): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') {
    return undefined;
  }
  const normalized = raw.trim();
  return normalized || undefined;
}

function parseAdminBoolean(value: unknown): boolean | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw === 'boolean') {
    return raw;
  }
  if (typeof raw !== 'string') {
    return undefined;
  }
  const normalized = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return undefined;
}

function normalizeIsoTimestamp(value: Date | string | undefined): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  const parsed = new Date(String(value ?? ''));
  return Number.isNaN(parsed.getTime()) ? new Date(0).toISOString() : parsed.toISOString();
}

function normalizePublishMode(mode: string): string {
  return mode.trim().toLowerCase();
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`);

  return `{${entries.join(',')}}`;
}

function defaultVerifyPayloadSignature(payload: Record<string, unknown>, secret: string, signature: string): boolean {
  const canonical = stableStringify(payload);
  const expected = createHmac('sha256', secret).update(canonical, 'utf8').digest();

  const normalizedSignature = String(signature).trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalizedSignature)) {
    return false;
  }

  const actual = Buffer.from(normalizedSignature, 'hex');
  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}

function buildDefaultSettings(): RuntimeSettings {
  return {
    databaseUrl: process.env.DATABASE_URL ?? '',
    celeryBrokerUrl: process.env.CELERY_BROKER_URL ?? 'redis://localhost:6379/0',
    celeryResultBackend: process.env.CELERY_RESULT_BACKEND ?? 'redis://localhost:6379/1',
    apiKey: process.env.API_KEY ?? '',
    llmProvider: process.env.LLM_PROVIDER ?? 'mock',
    llmFallbackToMock: parseBoolean(process.env.LLM_FALLBACK_TO_MOCK, true),
    publisherMode: normalizePublishMode(process.env.PUBLISHER_MODE ?? 'manual_queue'),
    bilibiliEnabled: parseBoolean(process.env.BILIBILI_ENABLED, false),
    bilibiliPollEnabled: parseBoolean(process.env.BILIBILI_POLL_ENABLED, false),
    bilibiliPollIntervalSeconds: parseInteger(process.env.BILIBILI_POLL_INTERVAL_SECONDS, 300),
    bilibiliPublishEnabled: parseBoolean(process.env.BILIBILI_PUBLISH_ENABLED, false),
    killSwitch: parseBoolean(process.env.KILL_SWITCH, false),
    gatewayToken: process.env.GATEWAY_TOKEN ?? '',
    gatewayHmacSecret: process.env.GATEWAY_HMAC_SECRET ?? '',
    platformBilibiliEnabled: parseBoolean(process.env.PLATFORM_BILIBILI_ENABLED, false),
    platformDouyinEnabled: parseBoolean(process.env.PLATFORM_DOUYIN_ENABLED, false),
    platformKuaishouEnabled: parseBoolean(process.env.PLATFORM_KUAISHOU_ENABLED, false),
    platformBilibiliPublishSource: process.env.PLATFORM_BILIBILI_PUBLISH_SOURCE ?? 'bilibili-bot',
    platformDouyinPublishSource: process.env.PLATFORM_DOUYIN_PUBLISH_SOURCE ?? 'douyin-bot',
    platformKuaishouPublishSource: process.env.PLATFORM_KUAISHOU_PUBLISH_SOURCE ?? 'kuaishou-bot',
  };
}

function buildDefaultReadinessSummary(settings: RuntimeSettings): {
  config: Record<string, unknown>;
  publish: Record<string, unknown>;
  kill_switch: boolean;
} {
  return {
    config: {
      database_url_set: hasText(settings.databaseUrl),
      celery_broker_url_set: hasText(settings.celeryBrokerUrl),
      celery_result_backend_set: hasText(settings.celeryResultBackend),
      api_key_set: hasText(settings.apiKey),
      llm_provider: settings.llmProvider,
      llm_fallback_to_mock: settings.llmFallbackToMock,
    },
    publish: {
      mode: settings.publisherMode,
      bilibili_enabled: settings.bilibiliEnabled,
      bilibili_publish_enabled: settings.bilibiliPublishEnabled,
    },
    kill_switch: settings.killSwitch,
  };
}

function defaultBilibiliDiagnostics(settings: RuntimeSettings): BilibiliDiagnostics {
  const effectivePublishMode = normalizePublishMode(settings.publisherMode);
  return {
    ready: false,
    blocking_reasons: [],
    effective_publish_mode: effectivePublishMode,
    signals: {
      raw_publish_mode: effectivePublishMode,
      effective_publish_mode: effectivePublishMode,
      native_publish_enabled: settings.bilibiliEnabled && settings.bilibiliPublishEnabled,
      polling_worker_enabled: settings.bilibiliEnabled && settings.bilibiliPollEnabled,
      credential_present: false,
      credential_complete: false,
      publish_mode_config_ready: true,
    },
  };
}

function defaultNormalizePublishFailureReason(reason: string | undefined): string {
  const normalized = String(reason ?? '').trim().toLowerCase();
  if (!normalized) {
    return 'invalid_response';
  }
  if (STANDARD_PUBLISH_FAILURE_REASONS.has(normalized)) {
    return normalized;
  }
  if (TIMEOUT_HINTS.some((hint) => normalized.includes(hint))) {
    return 'timeout';
  }
  if (/(^|\D)5\d\d(\D|$)/.test(normalized)) {
    return '5xx';
  }
  if (AUTH_HINTS.some((hint) => normalized.includes(hint))) {
    return 'auth';
  }
  return 'invalid_response';
}

function defaultIsPlatformEnabled(platform: PlatformName, settings: RuntimeSettings): boolean {
  if (platform === 'bilibili') return settings.platformBilibiliEnabled;
  if (platform === 'douyin') return settings.platformDouyinEnabled;
  return settings.platformKuaishouEnabled;
}

function defaultGetPlatformPublishSource(platform: PlatformName, settings: RuntimeSettings): string {
  if (platform === 'bilibili') return settings.platformBilibiliPublishSource.trim() || 'bilibili-bot';
  if (platform === 'douyin') return settings.platformDouyinPublishSource.trim() || 'douyin-bot';
  return settings.platformKuaishouPublishSource.trim() || 'kuaishou-bot';
}

function createInMemoryLogStore() {
  const entries = new Map<string, {
    reservationKey: string;
    status: 'reserved' | 'published' | 'failed';
    source: string;
    failureReason?: string;
    publishedAt?: Date;
  }>();

  return {
    reserve(input: PublishReservationInput): ReservePublishLogResult {
      const idempotencyKey = `${input.canonicalCommentId}::${input.replyHash}`;
      const existing = entries.get(idempotencyKey);
      if (existing) {
        return { duplicate: true, reservationKey: existing.reservationKey };
      }

      const reservationKey = `${input.canonicalCommentId}:${randomUUID()}`;
      entries.set(idempotencyKey, {
        reservationKey,
        status: 'reserved',
        source: input.source,
      });
      return { duplicate: false, reservationKey };
    },
    finalize(input: PublishFinalizeInput): void {
      for (const [idempotencyKey, entry] of entries.entries()) {
        if (entry.reservationKey === input.reservationKey) {
          entries.set(idempotencyKey, {
            ...entry,
            status: input.status,
            source: input.source,
            failureReason: input.failureReason,
            publishedAt: input.publishedAt,
          });
          return;
        }
      }
    },
  };
}

function defaultCreateTraceId(preferred?: string): string {
  const normalized = String(preferred ?? '').trim();
  return normalized || randomUUID();
}

function defaultAdminOverview(): Record<string, unknown> {
  return {
    totals: {
      comments: 0,
      jobs: 0,
      pending_jobs: 0,
      done_jobs: 0,
      failed_jobs: 0,
      published_jobs: 0,
      approved_comments: 0,
      replied_comments: 0,
      pending_comments: 0,
      comments_without_jobs: 0,
      comments_approved_pending_reply: 0,
      comments_awaiting_approval: 0,
      comments_approved_awaiting_reply: 0,
      comments_published_or_replied: 0,
      comments_manual_queue_or_processing: 0,
      comments_failed_needing_attention: 0,
      comments_above_threshold: 0,
      comments_below_threshold: 0,
      comments_queued_total: 0,
      comments_queued_recent_window: 0,
      comments_completed_recent_window: 0,
      comments_failed_recent_window: 0,
      comments_stale_pending: 0,
      comments_stale_manual_queue: 0,
      comments_stale_processing: 0,
      comments_auto_reply_eligible: 0,
      comments_auto_reply_skipped: 0,
      comments_auto_reply_success: 0,
      comments_auto_reply_failed: 0,
      comments_last_24h: 0,
      comments_last_7d: 0,
      comments_last_30d: 0,
      comments_high_priority: 0,
      comments_low_priority: 0,
      comments_with_risk_label: 0,
      comments_with_positive_label: 0,
      comments_with_negative_label: 0,
      comments_with_neutral_label: 0,
      jobs_retry_pending: 0,
      jobs_retry_in_progress: 0,
      jobs_retry_failed: 0,
      jobs_retry_succeeded: 0,
      jobs_with_gateway_trace: 0,
      jobs_without_gateway_trace: 0,
      jobs_published_last_24h: 0,
      jobs_failed_last_24h: 0,
      jobs_manual_intervention_required: 0,
      jobs_long_running: 0,
      jobs_stuck: 0,
      jobs_created_today: 0,
      jobs_updated_today: 0,
      jobs_with_platform_bilibili: 0,
      jobs_with_platform_douyin: 0,
      jobs_with_platform_kuaishou: 0,
      audit_logs_last_24h: 0,
      audit_logs_last_7d: 0,
      audit_logs_success_last_24h: 0,
      audit_logs_failure_last_24h: 0,
      gateway_publish_attempts_last_24h: 0,
      gateway_publish_success_last_24h: 0,
      gateway_publish_failure_last_24h: 0,
      gateway_publish_duplicate_last_24h: 0,
      gateway_publish_timeout_last_24h: 0,
      gateway_publish_5xx_last_24h: 0,
      gateway_publish_auth_last_24h: 0,
      gateway_publish_invalid_response_last_24h: 0,
      worker_heartbeat_missing: 0,
      worker_last_seen_seconds: 0,
      queue_depth_manual_queue: 0,
      queue_depth_processing: 0,
      queue_depth_retry: 0,
      queue_depth_failed: 0,
      queue_depth_completed: 0,
      release_gate_foundation_ready: 0,
      release_gate_delivery_ready: 0,
      release_gate_worker_or_publish_ready: 0,
      release_gate_real_auth_ready: 0,
      release_gate_dependency_ready: 0,
      release_gate_native_publish_enabled: 0,
      release_gate_credential_present: 0,
      release_gate_credential_complete: 0,
      publish_mode_delivery_capable: 0,
      publish_mode_native_bilibili: 0,
      publish_mode_webhook: 0,
      publish_mode_real_publish: 0,
      publish_mode_simulated: 0,
      kill_switch_enabled: 0,
      bilibili_enabled: 0,
      bilibili_publish_enabled: 0,
      bilibili_poll_enabled: 0,
      bilibili_poll_interval_seconds: 0,
      database_connected: 0,
      redis_connected: 0,
      api_key_set: 0,
      gateway_token_set: 0,
      gateway_hmac_set: 0,
    },
    generated_at: new Date(0).toISOString(),
  };
}

function defaultAdminJobs(input: { status?: string; limit: number; offset: number }): AdminJobsResponse {
  return {
    items: [],
    total: 0,
    limit: input.limit,
    offset: input.offset,
  };
}

function defaultAdminGatewayLogs(): AdminGatewayLogsResponse {
  return {
    items: [],
  };
}

function defaultAdminAuditSummary(input: { days: number }): AdminAuditSummaryResponse {
  return {
    ok: true,
    days: input.days,
    totals: {
      audit_logs: 0,
      ok: 0,
      failed: 0,
    },
    by_action: {},
    by_result: {},
  };
}

function defaultDependencies(): ServerDependencies {
  const settings = buildDefaultSettings();
  const logStore = createInMemoryLogStore();
  return {
    settings,
    checkDatabaseConnection: () => ({ connected: true }),
    checkRedisConnection: () => ({ connected: true }),
    buildBilibiliDiagnostics: () => defaultBilibiliDiagnostics(settings),
    verifyPayloadSignature: defaultVerifyPayloadSignature,
    reservePublishLog: (input) => logStore.reserve(input),
    finalizePublishLog: (input) => logStore.finalize(input),
    publishGatewayReply: () => ({ published: false, reason: 'invalid_response' }),
    publishPlatformReply: () => ({ published: false, reason: 'invalid_response' }),
    normalizePublishFailureReason: defaultNormalizePublishFailureReason,
    isPlatformEnabled: defaultIsPlatformEnabled,
    getPlatformPublishSource: defaultGetPlatformPublishSource,
    createTraceId: defaultCreateTraceId,
    getAdminOverview: defaultAdminOverview,
    listAdminJobs: (input) => defaultAdminJobs(input),
    listAdminGatewayLogs: () => defaultAdminGatewayLogs(),
    summarizeAdminAuditLogs: (input) => defaultAdminAuditSummary(input),
  };
}

function addBlocker(target: string[], message: string): void {
  if (message && !target.includes(message)) {
    target.push(message);
  }
}

function getHeaderValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return String(value[0] ?? '');
  }
  return String(value ?? '');
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parsePublishPayload(body: unknown): GatewayPublishPayload | null {
  if (typeof body !== 'object' || body == null) {
    return null;
  }

  const record = body as Record<string, unknown>;
  if (!isNonEmptyString(record.comment_id) || !isNonEmptyString(record.reply_text)) {
    return null;
  }

  const forcePublish = Boolean(record.force_publish ?? false);
  const source = isNonEmptyString(record.source) ? record.source : 'bili-pet-bot';
  const traceId = isNonEmptyString(record.trace_id) ? record.trace_id : undefined;

  return {
    comment_id: record.comment_id,
    reply_text: record.reply_text,
    force_publish: forcePublish,
    source,
    ...(traceId ? { trace_id: traceId } : {}),
  };
}

function buildReplyHash(commentId: string, replyText: string): string {
  const raw = `${commentId}::${replyText.trim()}`;
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

function gatewaySignaturePayload(payload: GatewayPublishPayload): Record<string, unknown> {
  return {
    comment_id: payload.comment_id,
    reply_text: payload.reply_text,
    force_publish: payload.force_publish,
    source: payload.source,
    ...(payload.trace_id ? { trace_id: payload.trace_id } : {}),
  };
}

export function createServer(overrides: Partial<ServerDependencies> = {}): FastifyInstance {
  const defaults = defaultDependencies();
  const settings = overrides.settings ?? defaults.settings;
  const checkDatabaseConnection = overrides.checkDatabaseConnection ?? defaults.checkDatabaseConnection;
  const checkRedisConnection = overrides.checkRedisConnection ?? defaults.checkRedisConnection;
  const buildBilibiliDiagnostics = overrides.buildBilibiliDiagnostics ?? defaults.buildBilibiliDiagnostics;
  const verifyPayloadSignature = overrides.verifyPayloadSignature ?? defaults.verifyPayloadSignature;
  const reservePublishLog = overrides.reservePublishLog ?? defaults.reservePublishLog;
  const finalizePublishLog = overrides.finalizePublishLog ?? defaults.finalizePublishLog;
  const publishGatewayReply = overrides.publishGatewayReply ?? defaults.publishGatewayReply;
  const publishPlatformReply = overrides.publishPlatformReply ?? defaults.publishPlatformReply;
  const normalizePublishFailureReason = overrides.normalizePublishFailureReason ?? defaults.normalizePublishFailureReason;
  const isPlatformEnabled = overrides.isPlatformEnabled ?? defaults.isPlatformEnabled;
  const getPlatformPublishSource = overrides.getPlatformPublishSource ?? defaults.getPlatformPublishSource;
  const createTraceId = overrides.createTraceId ?? defaults.createTraceId;
  const getAdminOverview = overrides.getAdminOverview ?? defaults.getAdminOverview;
  const listAdminJobs = overrides.listAdminJobs ?? defaults.listAdminJobs;
  const listAdminGatewayLogs = overrides.listAdminGatewayLogs ?? defaults.listAdminGatewayLogs;
  const summarizeAdminAuditLogs = overrides.summarizeAdminAuditLogs ?? defaults.summarizeAdminAuditLogs;

  const app = Fastify();

  app.get('/health', async () => ({ ok: true }));

  app.get('/readiness', async () => {
    const dbStatus = await checkDatabaseConnection();
    const redisStatus = await checkRedisConnection();
    const configStatus = buildDefaultReadinessSummary(settings);

    const foundationBlockers: string[] = [];
    if (!dbStatus.connected) {
      addBlocker(foundationBlockers, `database:${dbStatus.error ?? 'unavailable'}`);
    }
    if (!redisStatus.connected) {
      addBlocker(foundationBlockers, `redis:${redisStatus.error ?? 'unavailable'}`);
    }
    const foundationReady = foundationBlockers.length === 0;

    let bilibiliDiagnostics: BilibiliDiagnostics = defaultBilibiliDiagnostics(settings);
    if (dbStatus.connected) {
      try {
        bilibiliDiagnostics = await buildBilibiliDiagnostics();
      } catch {
        bilibiliDiagnostics = {
          ...bilibiliDiagnostics,
          ready: false,
          blocking_reasons: ['dependency:diagnostics_unavailable'],
        };
      }
    }

    const checks = typeof bilibiliDiagnostics.checks === 'object' && bilibiliDiagnostics.checks !== null
      ? bilibiliDiagnostics.checks
      : {};
    const workerOrPublishCheck = typeof checks.worker_or_publish === 'object' && checks.worker_or_publish !== null
      ? checks.worker_or_publish as { ready?: unknown; errors?: unknown }
      : {};
    const workerOrPublishErrors = Array.isArray(workerOrPublishCheck.errors)
      ? workerOrPublishCheck.errors
      : [];

    const releaseGates = typeof bilibiliDiagnostics.release_gates === 'object' && bilibiliDiagnostics.release_gates !== null
      ? bilibiliDiagnostics.release_gates
      : {};

    const effectivePublishMode = normalizePublishMode(
      String(bilibiliDiagnostics.effective_publish_mode || settings.publisherMode),
    );
    const nativePublishMode = effectivePublishMode === 'native_bilibili';
    const externalPublishMode = effectivePublishMode === 'webhook' || effectivePublishMode === 'real_publish';
    const deliveryCapablePublishMode = nativePublishMode || externalPublishMode;

    const workerOrPublishReady = Boolean(
      (releaseGates as Record<string, unknown>).worker_or_publish_ready ?? workerOrPublishCheck.ready ?? false,
    );

    const deliveryPathReady = nativePublishMode
      ? Boolean(bilibiliDiagnostics.ready)
      : (externalPublishMode ? workerOrPublishReady : false);

    const pollingRequested = settings.bilibiliEnabled && settings.bilibiliPollEnabled;

    const deliverySignals = {
      kill_switch_enabled: settings.killSwitch,
      polling_requested: pollingRequested,
      poll_interval_seconds: settings.bilibiliPollIntervalSeconds,
      worker_schedule_configured: pollingRequested && settings.bilibiliPollIntervalSeconds >= 60,
      bilibili_diagnostics_ready: Boolean(bilibiliDiagnostics.ready),
      delivery_path_ready: deliveryPathReady,
      delivery_capable_publish_mode: deliveryCapablePublishMode,
      worker_or_publish_ready: workerOrPublishReady,
      raw_publish_mode: normalizePublishMode(settings.publisherMode),
      effective_publish_mode: effectivePublishMode,
    };

    const deliveryBlockers = [...foundationBlockers];

    if (settings.killSwitch) {
      addBlocker(deliveryBlockers, 'control:kill_switch_enabled');
    }
    if (pollingRequested && !redisStatus.connected) {
      addBlocker(deliveryBlockers, 'worker:redis_unavailable_for_polling');
    }

    if (nativePublishMode) {
      for (const reason of bilibiliDiagnostics.blocking_reasons ?? []) {
        addBlocker(deliveryBlockers, `bilibili:${reason}`);
      }
    } else if (externalPublishMode) {
      if (!workerOrPublishReady) {
        for (const reason of workerOrPublishErrors) {
          addBlocker(deliveryBlockers, `bilibili:worker_or_publish:${String(reason)}`);
        }
      }
    } else {
      addBlocker(
        deliveryBlockers,
        `bilibili:publish_mode_not_delivery_capable:${effectivePublishMode || 'unknown'}`,
      );
    }

    if (!deliveryPathReady) {
      addBlocker(deliveryBlockers, 'bilibili:delivery_diagnostics_not_ready');
    }

    const deliveryReady = deliveryBlockers.length === 0;

    return {
      ready: foundationReady,
      database: dbStatus,
      redis: redisStatus,
      config: configStatus.config,
      publish: configStatus.publish,
      kill_switch: configStatus.kill_switch,
      foundation_ready: foundationReady,
      delivery_ready: deliveryReady,
      foundation_blockers: foundationBlockers,
      delivery_blockers: deliveryBlockers,
      blocking_reasons: deliveryBlockers,
      delivery_signals: deliverySignals,
      bilibili_diagnostics: bilibiliDiagnostics,
    };
  });

  const publishCore = async (
    requestBody: unknown,
    headers: Record<string, string | string[] | undefined>,
    platform?: PlatformName,
  ) => {
    const payload = parsePublishPayload(requestBody);
    if (!payload) {
      return { statusCode: 400, body: { detail: 'invalid_payload' } };
    }

    const expectedApiKey = settings.apiKey.trim();
    if (expectedApiKey) {
      const providedApiKey = getHeaderValue(headers['x-api-key']).trim();
      if (providedApiKey !== expectedApiKey) {
        return { statusCode: 401, body: { detail: 'unauthorized' } };
      }
    }

    const traceId = createTraceId(payload.trace_id ?? getHeaderValue(headers['x-trace-id']));

    const expectedToken = settings.gatewayToken.trim();
    if (expectedToken) {
      const authorization = getHeaderValue(headers.authorization);
      const expectedAuthorization = `Bearer ${expectedToken}`;
      if (authorization !== expectedAuthorization) {
        return { statusCode: 401, body: { detail: 'unauthorized' } };
      }
    }

    const hmacSecret = settings.gatewayHmacSecret.trim();
    if (hmacSecret) {
      const signature = getHeaderValue(headers['x-signature']);
      if (!signature) {
        return { statusCode: 401, body: { detail: 'missing_signature' } };
      }
      const valid = verifyPayloadSignature(gatewaySignaturePayload(payload), hmacSecret, signature);
      if (!valid) {
        return { statusCode: 401, body: { detail: 'invalid_signature' } };
      }
    }

    const resolvedPlatform: PlatformName = platform ?? 'bilibili';
    const canonicalCommentId = `${resolvedPlatform}:${payload.comment_id}`;
    const hashed = buildReplyHash(payload.comment_id, payload.reply_text);

    const reservation = await reservePublishLog({
      platform: resolvedPlatform,
      canonicalCommentId,
      commentId: payload.comment_id,
      replyHash: hashed,
      source: payload.source,
    });

    if (reservation.duplicate) {
      return {
        statusCode: 200,
        body: {
          ok: true,
          published: false,
          duplicate: true,
          reason: 'idempotent_replay',
          trace_id: traceId,
        },
      };
    }

    const publishResult = platform
      ? await publishPlatformReply({
        platform,
        commentId: payload.comment_id,
        replyText: payload.reply_text,
        forcePublish: payload.force_publish,
        traceId,
      })
      : await publishGatewayReply({
        commentId: payload.comment_id,
        replyText: payload.reply_text,
        forcePublish: payload.force_publish,
        source: payload.source,
        traceId,
      });

    if (!publishResult.published) {
      const normalizedReason = normalizePublishFailureReason(publishResult.reason);
      await finalizePublishLog({
        reservationKey: reservation.reservationKey,
        status: 'failed',
        source: payload.source,
        failureReason: normalizedReason,
      });
      return {
        statusCode: 200,
        body: {
          ok: false,
          published: false,
          reason: normalizedReason,
          comment_id: payload.comment_id,
          trace_id: traceId,
        },
      };
    }

    const sourceValue = platform
      ? getPlatformPublishSource(platform, settings)
      : payload.source;

    await finalizePublishLog({
      reservationKey: reservation.reservationKey,
      status: 'published',
      source: sourceValue,
      publishedAt: publishResult.publishedAt,
    });

    return {
      statusCode: 200,
      body: {
        ok: true,
        published: true,
        reason: publishResult.reason,
        comment_id: payload.comment_id,
        published_at: publishResult.publishedAt ? publishResult.publishedAt.toISOString() : null,
        trace_id: traceId,
      },
    };
  };

  app.post('/gateway/publish', async (request, reply) => {
    const result = await publishCore(request.body, request.headers);
    return reply.code(result.statusCode).send(result.body);
  });

  const platformRoutes: PlatformName[] = ['bilibili', 'douyin', 'kuaishou'];
  for (const platform of platformRoutes) {
    app.post(`/gateway/publish/${platform}`, async (request, reply) => {
      if (!isPlatformEnabled(platform, settings)) {
        return reply.code(403).send({ detail: 'platform_disabled' });
      }

      const result = await publishCore(request.body, request.headers, platform);
      return reply.code(result.statusCode).send(result.body);
    });
  }

  app.get('/api/admin/overview', async (request, reply) => {
    const expectedApiKey = settings.apiKey.trim();
    if (expectedApiKey) {
      const providedApiKey = getHeaderValue(request.headers['x-api-key']).trim();
      if (providedApiKey !== expectedApiKey) {
        return reply.code(401).send({ detail: 'unauthorized' });
      }
    }

    const overview = await getAdminOverview();
    return reply.send(overview);
  });

  app.get('/api/admin/metrics/overview', async (request, reply) => {
    const expectedApiKey = settings.apiKey.trim();
    if (expectedApiKey) {
      const providedApiKey = getHeaderValue(request.headers['x-api-key']).trim();
      if (providedApiKey !== expectedApiKey) {
        return reply.code(401).send({ detail: 'unauthorized' });
      }
    }

    const overview = await getAdminOverview();
    return reply.send(overview);
  });

  app.get('/api/admin/jobs', async (request, reply) => {
    const expectedApiKey = settings.apiKey.trim();
    if (expectedApiKey) {
      const providedApiKey = getHeaderValue(request.headers['x-api-key']).trim();
      if (providedApiKey !== expectedApiKey) {
        return reply.code(401).send({ detail: 'unauthorized' });
      }
    }

    const query = request.query as Record<string, unknown>;
    const response = await listAdminJobs({
      status: parseAdminString(query.status),
      limit: parseAdminLimit(query.limit, 50, 1, 1000),
      offset: parseAdminOffset(query.offset, 0, 0, 100000),
    });
    return reply.send(response);
  });

  app.get('/api/admin/audit/summary', async (request, reply) => {
    const expectedApiKey = settings.apiKey.trim();
    if (expectedApiKey) {
      const providedApiKey = getHeaderValue(request.headers['x-api-key']).trim();
      if (providedApiKey !== expectedApiKey) {
        return reply.code(401).send({ detail: 'unauthorized' });
      }
    }

    const query = request.query as Record<string, unknown>;
    const response = await summarizeAdminAuditLogs({
      days: parseAdminLimit(query.days, 7, 1, 90),
      action: parseAdminString(query.action),
      ok: parseAdminBoolean(query.ok),
    });
    return reply.send(response);
  });

  app.get('/api/admin/audit-logs/summary', async (request, reply) => {
    const expectedApiKey = settings.apiKey.trim();
    if (expectedApiKey) {
      const providedApiKey = getHeaderValue(request.headers['x-api-key']).trim();
      if (providedApiKey !== expectedApiKey) {
        return reply.code(401).send({ detail: 'unauthorized' });
      }
    }

    const query = request.query as Record<string, unknown>;
    const response = await summarizeAdminAuditLogs({
      days: parseAdminLimit(query.days, 7, 1, 90),
      action: parseAdminString(query.action),
      ok: parseAdminBoolean(query.ok),
    });
    return reply.send(response);
  });

  app.get('/api/admin/gateway/logs', async (request, reply) => {
    const expectedApiKey = settings.apiKey.trim();
    if (expectedApiKey) {
      const providedApiKey = getHeaderValue(request.headers['x-api-key']).trim();
      if (providedApiKey !== expectedApiKey) {
        return reply.code(401).send({ detail: 'unauthorized' });
      }
    }

    const query = request.query as Record<string, unknown>;
    const response = await listAdminGatewayLogs({
      commentId: parseAdminString(query.comment_id),
      limit: parseAdminLimit(query.limit, 50, 1, 200),
    });

    const normalizedItems = response.items.map((item) => ({
      ...item,
      published_at: normalizeIsoTimestamp(item.published_at as Date | string | undefined),
      created_at: normalizeIsoTimestamp(item.created_at as Date | string | undefined),
    }));

    return reply.send({
      ...response,
      items: normalizedItems,
    });
  });

  app.get('/api/admin/gateway/publish-logs', async (request, reply) => {
    const expectedApiKey = settings.apiKey.trim();
    if (expectedApiKey) {
      const providedApiKey = getHeaderValue(request.headers['x-api-key']).trim();
      if (providedApiKey !== expectedApiKey) {
        return reply.code(401).send({ detail: 'unauthorized' });
      }
    }

    const query = request.query as Record<string, unknown>;
    const response = await listAdminGatewayLogs({
      commentId: parseAdminString(query.comment_id),
      limit: parseAdminLimit(query.limit, 50, 1, 200),
    });

    const normalizedItems = response.items.map((item) => ({
      ...item,
      published_at: normalizeIsoTimestamp(item.published_at as Date | string | undefined),
      created_at: normalizeIsoTimestamp(item.created_at as Date | string | undefined),
    }));

    return reply.send({
      ...response,
      items: normalizedItems,
    });
  });

  return app;
}
