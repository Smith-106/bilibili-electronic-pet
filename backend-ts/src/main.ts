import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

import Fastify, { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { collectCommentEvent } from './services/collector.js';
import { encrypt, decrypt } from './services/credential-crypto.js';

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

export type KnowledgeEntry = {
  id: number;
  category: string;
  title: string;
  content: string;
  enabled: boolean;
  updated_at: string | null;
};

export type RoleCard = {
  id: number;
  key: string;
  name: string;
  description: string;
  system_prompt: string;
  tone: Record<string, unknown>;
  constraints: Record<string, unknown>;
  enabled: boolean;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export type CommentEvent = {
  comment_id: string;
  video_id?: string;
  user_id?: string;
  content?: string;
  parent_id?: string;
  platform?: string;
  source: string;
  trace_id?: string;
};

export type ReplyJob = {
  id: number;
  comment_id: string;
  canonical_comment_id: string | null;
  status: string;
  reply_text: string | null;
  style_profile: string | null;
  role_profile: string | null;
  role_card_key: string | null;
  force_long: boolean | null;
  platform: string | null;
  created_at: string | null;
  updated_at: string | null;
  comment_content: string | null;
};

export type BilibiliVideo = {
  id: number;
  bvid: string;
  aid?: number | null;
  title?: string | null;
  owner_mid?: number | null;
  poll_enabled: boolean;
  last_polled_at?: string | null;
  last_poll_status?: string | null;
  last_poll_error?: string | null;
  last_rpid?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
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
  listKnowledgeEntries: (input: {
    limit: number;
    offset: number;
  }) => Promise<{ ok: boolean; items: KnowledgeEntry[] }> | { ok: boolean; items: KnowledgeEntry[] };
  createKnowledgeEntry: (input: {
    category: string;
    title: string;
    content: string;
  }) => Promise<{ ok: boolean; item: KnowledgeEntry }> | { ok: boolean; item: KnowledgeEntry };
  disableKnowledgeEntry: (input: {
    entryId: number;
  }) => Promise<{ ok: boolean; item: { id: number; enabled: boolean; updated_at: string | null } }> | { ok: boolean; item: { id: number; enabled: boolean; updated_at: string | null } };
  getStyleProfile: () => Promise<{ ok: boolean; style_profile: string; preset_profiles: string[] }> | { ok: boolean; style_profile: string; preset_profiles: string[] };
  setStyleProfile: (input: {
    styleProfile: string;
  }) => Promise<{ ok: boolean; style_profile: string }> | { ok: boolean; style_profile: string };
  getRoleProfile: () => Promise<{ ok: boolean; role_profile: string; preset_profiles: string[] }> | { ok: boolean; role_profile: string; preset_profiles: string[] };
  setRoleProfile: (input: {
    roleProfile: string;
  }) => Promise<{ ok: boolean; role_profile: string }> | { ok: boolean; role_profile: string };
  listRoleCards: (input: {
    limit: number;
    offset: number;
  }) => Promise<{ ok: boolean; active_role_card_key: string | null; items: RoleCard[] }> | { ok: boolean; active_role_card_key: string | null; items: RoleCard[] };
  createRoleCard: (input: {
    key: string;
    name: string;
    description: string;
    system_prompt: string;
    tone: Record<string, unknown>;
    constraints: Record<string, unknown>;
    enabled: boolean;
  }) => Promise<{ ok: boolean; item: RoleCard }> | { ok: boolean; item: RoleCard };
  updateRoleCard: (input: {
    cardKey: string;
    name?: string;
    description?: string;
    system_prompt?: string;
    tone?: Record<string, unknown>;
    constraints?: Record<string, unknown>;
    enabled?: boolean;
  }) => Promise<{ ok: boolean; item: RoleCard }> | { ok: boolean; item: RoleCard };
  disableRoleCard: (input: {
    cardKey: string;
  }) => Promise<{ ok: boolean; item: { key: string; enabled: boolean; is_active: boolean; updated_at: string | null } }> | { ok: boolean; item: { key: string; enabled: boolean; is_active: boolean; updated_at: string | null } };
  activateRoleCard: (input: {
    cardKey: string;
  }) => Promise<{ ok: boolean; active_role_card_key: string }> | { ok: boolean; active_role_card_key: string };
  getObservabilitySummary: (input: {
    windowMinutes: number;
  }) => Promise<{ ok: boolean; summary: Record<string, unknown> }> | { ok: boolean; summary: Record<string, unknown> };
  ingestCommentEvent: (input: {
    event: CommentEvent;
    source: string;
  }) => Promise<{ ok: boolean; comment_id: string; trace_id: string }> | { ok: boolean; comment_id: string; trace_id: string };
  retryJob: (input: {
    jobId: number;
    forceLong?: boolean;
    styleProfile?: string;
    roleProfile?: string;
    roleCardKey?: string;
  }) => Promise<{ ok: boolean; requeued: boolean; job_id: number; trace_id: string }> | { ok: boolean; requeued: boolean; job_id: number; trace_id: string };
  approveJob: (input: {
    jobId: number;
    styleProfile?: string;
    roleProfile?: string;
    roleCardKey?: string;
  }) => Promise<{ ok: boolean; job_id: number; status: string; trace_id: string }> | { ok: boolean; job_id: number; status: string; trace_id: string };
  approveJobsBatch: (input: {
    jobIds: number[];
  }) => Promise<{ ok: boolean; summary: { total: number; success: number; failed: number }; results: Array<{ job_id: number; ok: boolean; status?: string; error?: string }>; trace_id: string }> | { ok: boolean; summary: { total: number; success: number; failed: number }; results: Array<{ job_id: number; ok: boolean; status?: string; error?: string }>; trace_id: string };
  retryJobsBatch: (input: {
    jobIds: number[];
    forceLong?: boolean;
  }) => Promise<{ ok: boolean; summary: { total: number; success: number; failed: number }; results: Array<{ job_id: number; ok: boolean; requeued?: boolean; error?: string }>; trace_id: string }> | { ok: boolean; summary: { total: number; success: number; failed: number }; results: Array<{ job_id: number; ok: boolean; requeued?: boolean; error?: string }>; trace_id: string };
  getComment: (input: {
    commentId: string;
  }) => Promise<{ ok: boolean; comment: Record<string, unknown>; jobs: ReplyJob[] }> | { ok: boolean; comment: Record<string, unknown>; jobs: ReplyJob[] };
  getJob: (input: {
    jobId: number;
  }) => Promise<{ ok: boolean; item: ReplyJob }> | { ok: boolean; item: ReplyJob };
  listJobs: (input: {
    status?: string;
    limit: number;
    offset: number;
  }) => Promise<{ ok: boolean; items: ReplyJob[] }> | { ok: boolean; items: ReplyJob[] };
  exportJobsCsv: (input: {
    status?: string;
    limit: number;
  }) => Promise<string> | string;
  getBilibiliStatus: () => Promise<{ ok: boolean; config: Record<string, unknown>; credential: Record<string, unknown> | null; videos: Record<string, unknown>; diagnostics: Record<string, unknown> }> | { ok: boolean; config: Record<string, unknown>; credential: Record<string, unknown> | null; videos: Record<string, unknown>; diagnostics: Record<string, unknown> };
  listBilibiliVideos: (input: {
    pollEnabled?: boolean;
    limit: number;
    offset: number;
  }) => Promise<{ ok: boolean; total: number; items: BilibiliVideo[] }> | { ok: boolean; total: number; items: BilibiliVideo[] };
  addBilibiliVideo: (input: {
    bvid: string;
    pollEnabled?: boolean;
  }) => Promise<{ ok: boolean; item: BilibiliVideo }> | { ok: boolean; item: BilibiliVideo };
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

function defaultListKnowledgeEntries(input: { limit: number; offset: number }): { ok: boolean; items: KnowledgeEntry[] } {
  return {
    ok: true,
    items: [],
  };
}

function defaultCreateKnowledgeEntry(input: { category: string; title: string; content: string }): { ok: boolean; item: KnowledgeEntry } {
  return {
    ok: true,
    item: {
      id: 1,
      category: input.category,
      title: input.title,
      content: input.content,
      enabled: true,
      updated_at: new Date().toISOString(),
    },
  };
}

function defaultDisableKnowledgeEntry(input: { entryId: number }): { ok: boolean; item: { id: number; enabled: boolean; updated_at: string | null } } {
  return {
    ok: true,
    item: {
      id: input.entryId,
      enabled: false,
      updated_at: new Date().toISOString(),
    },
  };
}

function defaultGetStyleProfile(): { ok: boolean; style_profile: string; preset_profiles: string[] } {
  return {
    ok: true,
    style_profile: 'auto',
    preset_profiles: ['auto', 'empathy', 'meme', 'normal'],
  };
}

async function defaultSetStyleProfile(input: { styleProfile: string }): Promise<{ ok: boolean; style_profile: string }> {
  // Update runtime setting via environment override
  process.env.STYLE_PROFILE_DEFAULT = input.styleProfile;
  return {
    ok: true,
    style_profile: input.styleProfile,
  };
}

function defaultGetRoleProfile(): { ok: boolean; role_profile: string; preset_profiles: string[] } {
  return {
    ok: true,
    role_profile: process.env.ROLE_PROFILE_DEFAULT || 'auto',
    preset_profiles: ['auto', 'default', 'comfort', 'playful'],
  };
}

async function defaultSetRoleProfile(input: { roleProfile: string }): Promise<{ ok: boolean; role_profile: string }> {
  // Update runtime setting via environment override
  process.env.ROLE_PROFILE_DEFAULT = input.roleProfile;
  return {
    ok: true,
    role_profile: input.roleProfile,
  };
}

function defaultListRoleCards(input: { limit: number; offset: number }): { ok: boolean; active_role_card_key: string | null; items: RoleCard[] } {
  return {
    ok: true,
    active_role_card_key: null,
    items: [],
  };
}

function defaultCreateRoleCard(input: { key: string; name: string; description: string; system_prompt: string; tone: Record<string, unknown>; constraints: Record<string, unknown>; enabled: boolean }): { ok: boolean; item: RoleCard } {
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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

function defaultUpdateRoleCard(input: { cardKey: string; name?: string; description?: string; system_prompt?: string; tone?: Record<string, unknown>; constraints?: Record<string, unknown>; enabled?: boolean }): { ok: boolean; item: RoleCard } {
  return {
    ok: true,
    item: {
      id: 1,
      key: input.cardKey,
      name: input.name ?? '',
      description: input.description ?? '',
      system_prompt: input.system_prompt ?? '',
      tone: input.tone ?? {},
      constraints: input.constraints ?? {},
      enabled: input.enabled ?? true,
      is_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

function defaultDisableRoleCard(input: { cardKey: string }): { ok: boolean; item: { key: string; enabled: boolean; is_active: boolean; updated_at: string | null } } {
  return {
    ok: true,
    item: {
      key: input.cardKey,
      enabled: false,
      is_active: false,
      updated_at: new Date().toISOString(),
    },
  };
}

function defaultActivateRoleCard(input: { cardKey: string }): { ok: boolean; active_role_card_key: string } {
  return {
    ok: true,
    active_role_card_key: input.cardKey,
  };
}

function defaultGetObservabilitySummary(input: { windowMinutes: number }): { ok: boolean; summary: Record<string, unknown> } {
  return {
    ok: true,
    summary: {},
  };
}

async function defaultIngestCommentEvent(input: { event: CommentEvent; source: string }): Promise<{ ok: boolean; comment_id: string; trace_id: string; queued?: boolean; message?: string }> {
  const traceId = input.event.trace_id || randomUUID();
  const platform = input.event.platform || 'bilibili';
  const canonicalCommentId = `${platform}:${input.event.comment_id}`;

  const prisma = getPrisma();
  try {
    await prisma.comment.create({
      data: {
        platform,
        canonical_comment_id: canonicalCommentId,
        comment_id: input.event.comment_id,
        video_id: input.event.video_id || '',
        user_id: input.event.user_id || '',
        content: input.event.content || '',
        parent_id: input.event.parent_id || null,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('UNIQUE') || msg.includes('unique') || msg.includes('duplicate')) {
      return { ok: true, message: 'duplicate_ignored', comment_id: input.event.comment_id, trace_id: traceId };
    }
    throw err;
  }

  // Enqueue worker task via BullMQ
  try {
    const { createCommentEventQueue } = await import('./workers/tasks/comment-event.task.js');
    const queue = createCommentEventQueue('comment-event');
    await queue.add('comment-event', {
      comment_id: input.event.comment_id,
      video_id: input.event.video_id,
      user_id: input.event.user_id,
      content: input.event.content,
      parent_id: input.event.parent_id,
      platform,
      source: input.source,
      trace_id: traceId,
    }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
  } catch {
    // Worker queue unavailable — comment is persisted, will be processed later
  }

  return { ok: true, queued: true, comment_id: input.event.comment_id, trace_id: traceId };
}

async function defaultRetryJob(input: { jobId: number; forceLong?: boolean; styleProfile?: string; roleProfile?: string; roleCardKey?: string }): Promise<{ ok: boolean; requeued: boolean; job_id: number; trace_id: string }> {
  const traceId = randomUUID();
  const prisma = getPrisma();
  const job = await prisma.replyJob.findUnique({ where: { id: input.jobId } });
  if (!job) {
    await writeAuditLog(prisma, { action: 'retry_single', targetId: input.jobId, ok: false, traceId, status: 'job_not_found', payload: { error: 'job_not_found' } });
    throw { statusCode: 404, detail: 'job_not_found' };
  }

  const platform = (job.canonical_comment_id || 'bilibili:').split(':', 1)[0] || 'bilibili';

  // Enqueue worker task
  try {
    const { createCommentEventQueue } = await import('./workers/tasks/comment-event.task.js');
    const queue = createCommentEventQueue('comment-event');
    await queue.add('comment-event', {
      comment_id: job.comment_id,
      platform,
      force_long: input.forceLong,
      style_profile: input.styleProfile,
      role_profile: input.roleProfile,
      role_card_key: input.roleCardKey,
      trace_id: traceId,
      source: 'retry',
    }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
  } catch {
    // Queue unavailable — job still persisted
  }

  await writeAuditLog(prisma, { action: 'retry_single', targetId: input.jobId, ok: true, traceId, commentId: job.comment_id, status: 'queued', payload: { comment_id: job.comment_id, force_long: input.forceLong } });
  return { ok: true, requeued: true, job_id: input.jobId, trace_id: traceId };
}

async function defaultApproveJob(input: { jobId: number; overrideReplyText?: string; styleProfile?: string; roleProfile?: string; roleCardKey?: string }): Promise<{ ok: boolean; job_id: number; status: string; published_at: string | null; trace_id: string }> {
  const traceId = randomUUID();
  const prisma = getPrisma();

  const job = await prisma.replyJob.findUnique({ where: { id: input.jobId } });
  if (!job) {
    await writeAuditLog(prisma, { action: 'approve_single', targetId: input.jobId, ok: false, traceId, status: 'job_not_found', payload: { error: 'job_not_found' } });
    throw { statusCode: 404, detail: 'job_not_found' };
  }

  const approvableStatuses = ['manual_queue', 'blocked', 'dedupe_skipped'];
  if (!approvableStatuses.includes(job.status)) {
    await writeAuditLog(prisma, { action: 'approve_single', targetId: input.jobId, ok: false, traceId, commentId: job.comment_id, status: 'not_approvable', payload: { error: 'job_status_not_approvable', current_status: job.status } });
    throw { statusCode: 400, detail: 'job_status_not_approvable' };
  }

  // Look up comment for video context
  const commentKey = job.canonical_comment_id || `bilibili:${job.comment_id}`;
  const comment = await prisma.comment.findUnique({ where: { canonical_comment_id: commentKey } });
  if (!comment) {
    throw { statusCode: 404, detail: 'comment_not_found' };
  }

  const replyText = (input.overrideReplyText || job.reply_text || '').trim();
  if (!replyText) {
    throw { statusCode: 400, detail: 'empty_reply_text' };
  }

  // Publish reply
  const { publishReplyWithResult } = await import('./services/publisher.js');
  const [published, publishReason, publishedAt, publishResult] = await publishReplyWithResult(job.comment_id, replyText, traceId);

  if (!published) {
    await writeAuditLog(prisma, { action: 'approve_single', targetId: input.jobId, ok: false, traceId, commentId: job.comment_id, status: 'publish_failed', payload: { error: 'approve_publish_failed', publish_reason: publishReason } });
    throw { statusCode: 500, detail: 'approve_publish_failed' };
  }

  // Update job
  const newRiskFlags = typeof job.risk_flags === 'string' ? JSON.parse(job.risk_flags) : (job.risk_flags || {});
  const updatedJob = await prisma.replyJob.update({
    where: { id: input.jobId },
    data: {
      status: 'published',
      reply_text: replyText,
      risk_flags: JSON.stringify({
        ...newRiskFlags,
        approved: true,
        publish_reason: publishReason,
        ...(publishResult?.new_rpid ? { new_rpid: publishResult.new_rpid } : {}),
      }),
      published_at: publishedAt || new Date(),
      attempts: (job.attempts || 0) + 1,
    },
  });

  // Record dedup phrase
  try {
    if (comment.user_id) {
      const { prisma: prismaFromDb } = await import('./services/db-queries.js');
      const p = prismaFromDb();
      const existingState = await p.userState.findUnique({ where: { user_id: comment.user_id } });
      const recentPhrases = existingState ? (typeof existingState.recent_phrases === 'string' ? JSON.parse(existingState.recent_phrases) : existingState.recent_phrases) : { phrases: [] };
      const phrases = Array.isArray(recentPhrases.phrases) ? recentPhrases.phrases : [];
      phrases.push(replyText.substring(0, 60));
      if (phrases.length > 20) phrases.shift();
      await p.userState.upsert({
        where: { user_id: comment.user_id },
        update: { recent_phrases: JSON.stringify({ phrases }) },
        create: { user_id: comment.user_id, recent_phrases: JSON.stringify({ phrases: [replyText.substring(0, 60)] }) },
      });
    }
  } catch { /* non-critical */ }

  await writeAuditLog(prisma, { action: 'approve_single', targetId: input.jobId, ok: true, traceId, commentId: job.comment_id, status: 'published', payload: { reply_text_preview: replyText.substring(0, 40) } });

  return {
    ok: true,
    job_id: input.jobId,
    status: 'published',
    published_at: updatedJob.published_at?.toISOString() ?? null,
    trace_id: traceId,
  };
}

async function defaultApproveJobsBatch(input: { jobIds: number[] }): Promise<{ ok: boolean; summary: { total: number; success: number; failed: number }; results: Array<{ job_id: number; ok: boolean; status?: string; error?: string }>; trace_id: string }> {
  const traceId = randomUUID();
  const results: Array<{ job_id: number; ok: boolean; status?: string; error?: string }> = [];
  let success = 0;
  let failed = 0;

  for (const jobId of input.jobIds) {
    try {
      const result = await defaultApproveJob({ jobId, overrideReplyText: undefined });
      success++;
      results.push({ job_id: jobId, ok: true, status: result.status });
    } catch (err: unknown) {
      failed++;
      const detail = err instanceof Error ? err.message : (err as { detail?: string })?.detail || 'approve_failed';
      results.push({ job_id: jobId, ok: false, error: detail });
    }
  }

  const summary = { total: input.jobIds.length, success, failed };

  const prisma = getPrisma();
  await writeAuditLog(prisma, {
    action: 'approve_batch',
    targetId: null,
    ok: failed === 0,
    traceId,
    status: failed === 0 ? 'published' : 'partial_failure',
    payload: { job_ids: input.jobIds, summary },
  });

  return { ok: true, summary, results, trace_id: traceId };
}

async function defaultRetryJobsBatch(input: { jobIds: number[]; forceLong?: boolean }): Promise<{ ok: boolean; summary: { total: number; success: number; failed: number }; results: Array<{ job_id: number; ok: boolean; requeued?: boolean; error?: string }>; trace_id: string }> {
  const traceId = randomUUID();
  const results: Array<{ job_id: number; ok: boolean; requeued?: boolean; error?: string }> = [];
  let success = 0;
  let failed = 0;

  for (const jobId of input.jobIds) {
    try {
      await defaultRetryJob({ jobId, forceLong: input.forceLong });
      success++;
      results.push({ job_id: jobId, ok: true, requeued: true });
    } catch {
      failed++;
      results.push({ job_id: jobId, ok: false, error: 'retry_failed' });
    }
  }

  const summary = { total: input.jobIds.length, success, failed };

  const prisma = getPrisma();
  await writeAuditLog(prisma, {
    action: 'retry_batch',
    targetId: null,
    ok: failed === 0,
    traceId,
    status: failed === 0 ? 'queued' : 'partial_failure',
    payload: { job_ids: input.jobIds, force_long: input.forceLong, summary },
  });

  return { ok: true, summary, results, trace_id: traceId };
}

function defaultGetComment(input: { commentId: string }): { ok: boolean; comment: Record<string, unknown>; jobs: ReplyJob[] } {
  return {
    ok: true,
    comment: {
      comment_id: input.commentId,
      video_id: null,
      user_id: null,
      content: null,
      parent_id: null,
      created_at: null,
    },
    jobs: [],
  };
}

function defaultGetJob(input: { jobId: number }): { ok: boolean; item: ReplyJob } {
  return {
    ok: true,
    item: {
      id: input.jobId,
      comment_id: '',
      canonical_comment_id: null,
      status: 'pending',
      reply_text: null,
      style_profile: null,
      role_profile: null,
      role_card_key: null,
      force_long: null,
      platform: null,
      created_at: new Date().toISOString(),
      updated_at: null,
      comment_content: null,
    },
  };
}

function defaultListJobs(input: { status?: string; limit: number; offset: number }): { ok: boolean; items: ReplyJob[] } {
  return {
    ok: true,
    items: [],
  };
}

function defaultExportJobsCsv(input: { status?: string; limit: number }): string {
  return 'job_id,comment_id,status,created_at\n';
}

function defaultGetBilibiliStatus(): { ok: boolean; config: Record<string, unknown>; credential: Record<string, unknown> | null; videos: Record<string, unknown>; diagnostics: Record<string, unknown> } {
  return {
    ok: true,
    config: {
      enabled: false,
      poll_enabled: false,
      publish_enabled: false,
      poll_interval_seconds: 300,
      rate_limit_per_minute: 60,
    },
    credential: null,
    videos: {
      poll_enabled_count: 0,
    },
    diagnostics: {
      ready: false,
      blocking_reasons: [],
      effective_publish_mode: 'manual_queue',
      checks: {
        config: { ready: true, errors: [] },
        auth: { ready: false, errors: ['no active credential'] },
        dependency: { ready: false, errors: ['publisher not enabled'] },
        worker_or_publish: { ready: false, errors: ['no worker or publish path ready'] },
      },
      release_gates: {
        foundation_ready: true,
        delivery_ready: false,
        worker_or_publish_ready: false,
        native_publish_enabled: false,
        credential_present: false,
        credential_complete: false,
      },
      signals: {
        raw_publish_mode: 'manual_queue',
        effective_publish_mode: 'manual_queue',
        native_publish_enabled: false,
        polling_worker_enabled: false,
        credential_present: false,
        credential_complete: false,
        publish_mode_config_ready: true,
      },
    },
  };
}

function defaultListBilibiliVideos(input: { pollEnabled?: boolean; limit: number; offset: number }): { ok: boolean; total: number; items: BilibiliVideo[] } {
  return {
    ok: true,
    total: 0,
    items: [],
  };
}

function defaultAddBilibiliVideo(input: { bvid: string; pollEnabled?: boolean }): { ok: boolean; item: BilibiliVideo } {
  return {
    ok: true,
    item: {
      id: 1,
      bvid: input.bvid,
      poll_enabled: input.pollEnabled ?? true,
    },
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
    listKnowledgeEntries: (input) => defaultListKnowledgeEntries(input),
    createKnowledgeEntry: (input) => defaultCreateKnowledgeEntry(input),
    disableKnowledgeEntry: (input) => defaultDisableKnowledgeEntry(input),
    getStyleProfile: defaultGetStyleProfile,
    setStyleProfile: (input) => defaultSetStyleProfile(input),
    getRoleProfile: defaultGetRoleProfile,
    setRoleProfile: (input) => defaultSetRoleProfile(input),
    listRoleCards: (input) => defaultListRoleCards(input),
    createRoleCard: (input) => defaultCreateRoleCard(input),
    updateRoleCard: (input) => defaultUpdateRoleCard(input),
    disableRoleCard: (input) => defaultDisableRoleCard(input),
    activateRoleCard: (input) => defaultActivateRoleCard(input),
    getObservabilitySummary: (input) => defaultGetObservabilitySummary(input),
    ingestCommentEvent: (input) => defaultIngestCommentEvent(input),
    retryJob: (input) => defaultRetryJob(input),
    approveJob: (input) => defaultApproveJob(input),
    approveJobsBatch: (input) => defaultApproveJobsBatch(input),
    retryJobsBatch: (input) => defaultRetryJobsBatch(input),
    getComment: (input) => defaultGetComment(input),
    getJob: (input) => defaultGetJob(input),
    listJobs: (input) => defaultListJobs(input),
    exportJobsCsv: (input) => defaultExportJobsCsv(input),
    getBilibiliStatus: defaultGetBilibiliStatus,
    listBilibiliVideos: (input) => defaultListBilibiliVideos(input),
    addBilibiliVideo: (input) => defaultAddBilibiliVideo(input),
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

/** Lazy Prisma singleton for admin routes */
let _prisma: PrismaClient | null = null;
function getPrisma(): PrismaClient {
  if (!_prisma) _prisma = new PrismaClient();
  return _prisma;
}

/** Write an operation audit log entry (mirrors Python's _write_audit_log) */
async function writeAuditLog(
  prisma: PrismaClient,
  input: {
    action: string;
    targetId: number | null;
    ok: boolean;
    traceId: string;
    commentId?: string;
    status?: string;
    payload?: Record<string, unknown>;
  },
): Promise<void> {
  const enrichedPayload = {
    ...input.payload,
    trace_id: input.traceId,
    ...(input.commentId ? { comment_id: input.commentId } : {}),
    ...(input.status ? { status: input.status } : {}),
  };
  try {
    await prisma.operationAuditLog.create({
      data: {
        action: input.action,
        target_type: 'reply_job',
        target_id: input.targetId,
        ok: input.ok,
        payload: JSON.stringify(enrichedPayload),
      },
    });
  } catch {
    // Audit log write failure is non-critical
  }
}

/** Check x-api-key header; returns false and sends 401 on failure */
function checkApiKey(
  request: FastifyRequest,
  reply: FastifyReply,
  settings: RuntimeSettings,
): boolean {
  const expected = settings.apiKey.trim();
  if (!expected) return true;
  const provided = getHeaderValue(request.headers['x-api-key']).trim();
  if (provided !== expected) {
    void reply.code(401).send({ detail: 'unauthorized' });
    return false;
  }
  return true;
}

/** CSV-safe string escaping */
function csvEscape(value: string): string {
  if (!value) return '';
  if (/[,"\n\r]/.test(value)) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
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
  const listKnowledgeEntries = overrides.listKnowledgeEntries ?? defaults.listKnowledgeEntries;
  const createKnowledgeEntry = overrides.createKnowledgeEntry ?? defaults.createKnowledgeEntry;
  const disableKnowledgeEntry = overrides.disableKnowledgeEntry ?? defaults.disableKnowledgeEntry;
  const getStyleProfile = overrides.getStyleProfile ?? defaults.getStyleProfile;
  const setStyleProfile = overrides.setStyleProfile ?? defaults.setStyleProfile;
  const getRoleProfile = overrides.getRoleProfile ?? defaults.getRoleProfile;
  const setRoleProfile = overrides.setRoleProfile ?? defaults.setRoleProfile;
  const listRoleCards = overrides.listRoleCards ?? defaults.listRoleCards;
  const createRoleCard = overrides.createRoleCard ?? defaults.createRoleCard;
  const updateRoleCard = overrides.updateRoleCard ?? defaults.updateRoleCard;
  const disableRoleCard = overrides.disableRoleCard ?? defaults.disableRoleCard;
  const activateRoleCard = overrides.activateRoleCard ?? defaults.activateRoleCard;
  const getObservabilitySummary = overrides.getObservabilitySummary ?? defaults.getObservabilitySummary;
  const ingestCommentEvent = overrides.ingestCommentEvent ?? defaults.ingestCommentEvent;
  const retryJob = overrides.retryJob ?? defaults.retryJob;
  const approveJob = overrides.approveJob ?? defaults.approveJob;
  const approveJobsBatch = overrides.approveJobsBatch ?? defaults.approveJobsBatch;
  const retryJobsBatch = overrides.retryJobsBatch ?? defaults.retryJobsBatch;
  const getComment = overrides.getComment ?? defaults.getComment;
  const getJob = overrides.getJob ?? defaults.getJob;
  const listJobs = overrides.listJobs ?? defaults.listJobs;
  const exportJobsCsv = overrides.exportJobsCsv ?? defaults.exportJobsCsv;
  const getBilibiliStatus = overrides.getBilibiliStatus ?? defaults.getBilibiliStatus;
  const listBilibiliVideos = overrides.listBilibiliVideos ?? defaults.listBilibiliVideos;
  const addBilibiliVideo = overrides.addBilibiliVideo ?? defaults.addBilibiliVideo;

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

  // Knowledge entries
  app.get('/api/admin/knowledge', async (request, reply) => {
    const expectedApiKey = settings.apiKey.trim();
    if (expectedApiKey) {
      const providedApiKey = getHeaderValue(request.headers['x-api-key']).trim();
      if (providedApiKey !== expectedApiKey) {
        return reply.code(401).send({ detail: 'unauthorized' });
      }
    }

    const query = request.query as Record<string, unknown>;
    const response = await listKnowledgeEntries({
      limit: parseAdminLimit(query.limit, 200, 1, 1000),
      offset: parseAdminOffset(query.offset, 0, 0, 100000),
    });
    return reply.send(response);
  });

  app.post('/api/admin/knowledge', async (request, reply) => {
    const expectedApiKey = settings.apiKey.trim();
    if (expectedApiKey) {
      const providedApiKey = getHeaderValue(request.headers['x-api-key']).trim();
      if (providedApiKey !== expectedApiKey) {
        return reply.code(401).send({ detail: 'unauthorized' });
      }
    }

    const body = request.body as Record<string, unknown>;
    const category = String(body.category ?? '').trim().slice(0, 64);
    const title = String(body.title ?? '').trim().slice(0, 128);
    const content = String(body.content ?? '').trim().slice(0, 65535);

    if (!category) {
      return reply.code(400).send({ detail: 'category_required' });
    }
    if (!title) {
      return reply.code(400).send({ detail: 'title_required' });
    }
    if (!content) {
      return reply.code(400).send({ detail: 'content_required' });
    }

    const response = await createKnowledgeEntry({ category, title, content });
    return reply.send(response);
  });

  app.post('/api/admin/knowledge/:entry_id/disable', async (request, reply) => {
    const expectedApiKey = settings.apiKey.trim();
    if (expectedApiKey) {
      const providedApiKey = getHeaderValue(request.headers['x-api-key']).trim();
      if (providedApiKey !== expectedApiKey) {
        return reply.code(401).send({ detail: 'unauthorized' });
      }
    }

    const params = request.params as Record<string, unknown>;
    const entryId = Number.parseInt(String(params.entry_id ?? ''), 10);
    if (!Number.isFinite(entryId) || entryId <= 0) {
      return reply.code(404).send({ detail: 'knowledge_not_found' });
    }

    const response = await disableKnowledgeEntry({ entryId });
    return reply.send(response);
  });

  // Style profile
  app.get('/api/admin/style-profile', async (request, reply) => {
    const expectedApiKey = settings.apiKey.trim();
    if (expectedApiKey) {
      const providedApiKey = getHeaderValue(request.headers['x-api-key']).trim();
      if (providedApiKey !== expectedApiKey) {
        return reply.code(401).send({ detail: 'unauthorized' });
      }
    }

    const response = await getStyleProfile();
    return reply.send(response);
  });

  app.post('/api/admin/style-profile', async (request, reply) => {
    const expectedApiKey = settings.apiKey.trim();
    if (expectedApiKey) {
      const providedApiKey = getHeaderValue(request.headers['x-api-key']).trim();
      if (providedApiKey !== expectedApiKey) {
        return reply.code(401).send({ detail: 'unauthorized' });
      }
    }

    const body = request.body as Record<string, unknown>;
    const value = String(body.style_profile ?? '').trim().toLowerCase();
    const allowed = new Set(['auto', 'empathy', 'meme', 'normal']);
    if (!allowed.has(value)) {
      return reply.code(400).send({ detail: 'invalid_style_profile' });
    }

    const response = await setStyleProfile({ styleProfile: value });
    return reply.send(response);
  });

  // Role profile
  app.get('/api/admin/role-profile', async (request, reply) => {
    const expectedApiKey = settings.apiKey.trim();
    if (expectedApiKey) {
      const providedApiKey = getHeaderValue(request.headers['x-api-key']).trim();
      if (providedApiKey !== expectedApiKey) {
        return reply.code(401).send({ detail: 'unauthorized' });
      }
    }

    const response = await getRoleProfile();
    return reply.send(response);
  });

  app.post('/api/admin/role-profile', async (request, reply) => {
    const expectedApiKey = settings.apiKey.trim();
    if (expectedApiKey) {
      const providedApiKey = getHeaderValue(request.headers['x-api-key']).trim();
      if (providedApiKey !== expectedApiKey) {
        return reply.code(401).send({ detail: 'unauthorized' });
      }
    }

    const body = request.body as Record<string, unknown>;
    const value = String(body.role_profile ?? '').trim().toLowerCase();
    const allowed = new Set(['auto', 'default', 'comfort', 'playful']);
    if (!allowed.has(value)) {
      return reply.code(400).send({ detail: 'invalid_role_profile' });
    }

    const response = await setRoleProfile({ roleProfile: value });
    return reply.send(response);
  });

  // Role cards
  app.get('/api/admin/role-cards', async (request, reply) => {
    const expectedApiKey = settings.apiKey.trim();
    if (expectedApiKey) {
      const providedApiKey = getHeaderValue(request.headers['x-api-key']).trim();
      if (providedApiKey !== expectedApiKey) {
        return reply.code(401).send({ detail: 'unauthorized' });
      }
    }

    const query = request.query as Record<string, unknown>;
    const response = await listRoleCards({
      limit: parseAdminLimit(query.limit, 200, 1, 1000),
      offset: parseAdminOffset(query.offset, 0, 0, 100000),
    });
    return reply.send(response);
  });

  app.post('/api/admin/role-cards', async (request, reply) => {
    const expectedApiKey = settings.apiKey.trim();
    if (expectedApiKey) {
      const providedApiKey = getHeaderValue(request.headers['x-api-key']).trim();
      if (providedApiKey !== expectedApiKey) {
        return reply.code(401).send({ detail: 'unauthorized' });
      }
    }

    const body = request.body as Record<string, unknown>;
    const key = String(body.key ?? '').trim().toLowerCase().slice(0, 64);
    const name = String(body.name ?? '').trim().slice(0, 128);
    const description = String(body.description ?? '').trim().slice(0, 65535);
    const systemPrompt = String(body.system_prompt ?? '').trim().slice(0, 65535);
    const tone = (typeof body.tone === 'object' && body.tone !== null ? body.tone : {}) as Record<string, unknown>;
    const constraints = (typeof body.constraints === 'object' && body.constraints !== null ? body.constraints : {}) as Record<string, unknown>;
    const enabled = Boolean(body.enabled ?? true);

    if (!key) {
      return reply.code(400).send({ detail: 'role_card_key_required' });
    }
    if (!name) {
      return reply.code(400).send({ detail: 'role_card_name_required' });
    }

    const response = await createRoleCard({
      key,
      name,
      description,
      system_prompt: systemPrompt,
      tone,
      constraints,
      enabled,
    });
    return reply.send(response);
  });

  app.post('/api/admin/role-cards/:card_key', async (request, reply) => {
    const expectedApiKey = settings.apiKey.trim();
    if (expectedApiKey) {
      const providedApiKey = getHeaderValue(request.headers['x-api-key']).trim();
      if (providedApiKey !== expectedApiKey) {
        return reply.code(401).send({ detail: 'unauthorized' });
      }
    }

    const params = request.params as Record<string, unknown>;
    const cardKey = String(params.card_key ?? '').trim().toLowerCase().slice(0, 64);
    const body = request.body as Record<string, unknown>;

    const updateData: {
      cardKey: string;
      name?: string;
      description?: string;
      system_prompt?: string;
      tone?: Record<string, unknown>;
      constraints?: Record<string, unknown>;
      enabled?: boolean;
    } = { cardKey };

    if ('name' in body) {
      updateData.name = String(body.name ?? '').trim().slice(0, 128);
      if (!updateData.name) {
        return reply.code(400).send({ detail: 'role_card_name_required' });
      }
    }
    if ('description' in body) {
      updateData.description = String(body.description ?? '').trim().slice(0, 65535);
    }
    if ('system_prompt' in body) {
      updateData.system_prompt = String(body.system_prompt ?? '').trim().slice(0, 65535);
    }
    if ('tone' in body) {
      updateData.tone = (typeof body.tone === 'object' && body.tone !== null ? body.tone : {}) as Record<string, unknown>;
    }
    if ('constraints' in body) {
      updateData.constraints = (typeof body.constraints === 'object' && body.constraints !== null ? body.constraints : {}) as Record<string, unknown>;
    }
    if ('enabled' in body) {
      updateData.enabled = Boolean(body.enabled);
    }

    const response = await updateRoleCard(updateData);
    return reply.send(response);
  });

  app.post('/api/admin/role-cards/:card_key/disable', async (request, reply) => {
    const expectedApiKey = settings.apiKey.trim();
    if (expectedApiKey) {
      const providedApiKey = getHeaderValue(request.headers['x-api-key']).trim();
      if (providedApiKey !== expectedApiKey) {
        return reply.code(401).send({ detail: 'unauthorized' });
      }
    }

    const params = request.params as Record<string, unknown>;
    const cardKey = String(params.card_key ?? '').trim().toLowerCase();

    const response = await disableRoleCard({ cardKey });
    return reply.send(response);
  });

  app.post('/api/admin/role-cards/:card_key/activate', async (request, reply) => {
    const expectedApiKey = settings.apiKey.trim();
    if (expectedApiKey) {
      const providedApiKey = getHeaderValue(request.headers['x-api-key']).trim();
      if (providedApiKey !== expectedApiKey) {
        return reply.code(401).send({ detail: 'unauthorized' });
      }
    }

    const params = request.params as Record<string, unknown>;
    const cardKey = String(params.card_key ?? '').trim().toLowerCase();

    const response = await activateRoleCard({ cardKey });
    return reply.send(response);
  });

  // Observability
  app.get('/api/admin/observability/summary', async (request, reply) => {
    const expectedApiKey = settings.apiKey.trim();
    if (expectedApiKey) {
      const providedApiKey = getHeaderValue(request.headers['x-api-key']).trim();
      if (providedApiKey !== expectedApiKey) {
        return reply.code(401).send({ detail: 'unauthorized' });
      }
    }

    const query = request.query as Record<string, unknown>;
    const windowMinutes = parseAdminLimit(query.window_minutes, 60, 1, 1440);
    const response = await getObservabilitySummary({ windowMinutes });
    return reply.send(response);
  });

  // Comments event ingestion — uses collector for source-aware field mapping
  const commentSources = [
    { path: '/events/comment', source: 'webhook' as const },
    { path: '/events/comment/poller', source: 'poller' as const },
    { path: '/events/comment/official', source: 'official' as const },
    { path: '/events/comment/bilibili', source: 'bilibili' as const, platform: 'bilibili' },
    { path: '/events/comment/douyin', source: 'douyin' as const, platform: 'douyin' },
    { path: '/events/comment/kuaishou', source: 'kuaishou' as const, platform: 'kuaishou' },
  ];

  for (const { path, source, platform } of commentSources) {
    app.post(path, async (request, reply) => {
      const body = request.body as Record<string, unknown>;

      let event: CommentEvent;
      try {
        const collected = collectCommentEvent(body, source, platform);
        event = collected;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'invalid_payload';
        return reply.code(400).send({ detail: message });
      }

      if (!event.comment_id) {
        return reply.code(400).send({ detail: 'comment_id_required' });
      }

      const response = await ingestCommentEvent({ event, source });
      return reply.send(response);
    });
  }

  // Job management
  app.post('/jobs/:job_id/retry', async (request, reply) => {
    const params = request.params as Record<string, unknown>;
    const jobId = Number.parseInt(String(params.job_id ?? ''), 10);
    if (!Number.isFinite(jobId) || jobId <= 0) {
      return reply.code(404).send({ detail: 'job_not_found' });
    }

    const body = request.body as Record<string, unknown>;
    const response = await retryJob({
      jobId,
      forceLong: body.force_long ? Boolean(body.force_long) : undefined,
      styleProfile: body.style_profile ? String(body.style_profile) : undefined,
      roleProfile: body.role_profile ? String(body.role_profile) : undefined,
      roleCardKey: body.role_card_key ? String(body.role_card_key) : undefined,
    });
    return reply.send(response);
  });

  app.post('/jobs/:job_id/approve', async (request, reply) => {
    const params = request.params as Record<string, unknown>;
    const jobId = Number.parseInt(String(params.job_id ?? ''), 10);
    if (!Number.isFinite(jobId) || jobId <= 0) {
      return reply.code(404).send({ detail: 'job_not_found' });
    }

    const body = request.body as Record<string, unknown>;
    const response = await approveJob({
      jobId,
      styleProfile: body.style_profile ? String(body.style_profile) : undefined,
      roleProfile: body.role_profile ? String(body.role_profile) : undefined,
      roleCardKey: body.role_card_key ? String(body.role_card_key) : undefined,
    });
    return reply.send(response);
  });

  app.post('/jobs/approve-batch', async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const jobIds = Array.isArray(body.job_ids) ? body.job_ids.map((id) => Number.parseInt(String(id), 10)).filter((id) => Number.isFinite(id) && id > 0) : [];

    if (jobIds.length === 0) {
      return reply.code(400).send({ detail: 'job_ids_required' });
    }

    const response = await approveJobsBatch({ jobIds });
    return reply.send(response);
  });

  app.post('/jobs/retry-batch', async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const jobIds = Array.isArray(body.job_ids) ? body.job_ids.map((id) => Number.parseInt(String(id), 10)).filter((id) => Number.isFinite(id) && id > 0) : [];

    if (jobIds.length === 0) {
      return reply.code(400).send({ detail: 'job_ids_required' });
    }

    const response = await retryJobsBatch({
      jobIds,
      forceLong: body.force_long ? Boolean(body.force_long) : undefined,
    });
    return reply.send(response);
  });

  app.get('/comments', async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const limit = parseAdminLimit(query.limit, 50, 1, 500);
    const offset = parseAdminOffset(query.offset, 0, 0, 100000);
    const prisma = getPrisma();
    const [total, items] = await Promise.all([
      prisma.comment.count(),
      prisma.comment.findMany({ orderBy: { created_at: 'desc' }, skip: offset, take: limit }),
    ]);
    return reply.send({ ok: true, total, items });
  });

  app.get('/comments/:comment_id', async (request, reply) => {
    const params = request.params as Record<string, unknown>;
    const commentId = String(params.comment_id ?? '').trim();

    if (!commentId) {
      return reply.code(404).send({ detail: 'comment_not_found' });
    }

    const response = await getComment({ commentId });
    return reply.send(response);
  });

  app.get('/jobs/:job_id', async (request, reply) => {
    const params = request.params as Record<string, unknown>;
    const jobId = Number.parseInt(String(params.job_id ?? ''), 10);

    if (!Number.isFinite(jobId) || jobId <= 0) {
      return reply.code(404).send({ detail: 'job_not_found' });
    }

    const response = await getJob({ jobId });
    return reply.send(response);
  });

  app.get('/jobs', async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const response = await listJobs({
      status: parseAdminString(query.status),
      limit: parseAdminLimit(query.limit, 50, 1, 1000),
      offset: parseAdminOffset(query.offset, 0, 0, 100000),
    });
    return reply.send(response);
  });

  app.get('/export/jobs.csv', async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const csv = await exportJobsCsv({
      status: parseAdminString(query.status),
      limit: parseAdminLimit(query.limit, 500, 1, 5000),
    });

    return reply.type('text/csv').send(csv);
  });

  // Bilibili integration
  app.get('/api/admin/bilibili/status', async (request, reply) => {
    const expectedApiKey = settings.apiKey.trim();
    if (expectedApiKey) {
      const providedApiKey = getHeaderValue(request.headers['x-api-key']).trim();
      if (providedApiKey !== expectedApiKey) {
        return reply.code(401).send({ detail: 'unauthorized' });
      }
    }

    const response = await getBilibiliStatus();
    return reply.send(response);
  });

  app.get('/api/admin/bilibili/videos', async (request, reply) => {
    const expectedApiKey = settings.apiKey.trim();
    if (expectedApiKey) {
      const providedApiKey = getHeaderValue(request.headers['x-api-key']).trim();
      if (providedApiKey !== expectedApiKey) {
        return reply.code(401).send({ detail: 'unauthorized' });
      }
    }

    const query = request.query as Record<string, unknown>;
    const pollEnabledRaw = query.poll_enabled;
    const pollEnabled = pollEnabledRaw === 'true' || pollEnabledRaw === '1' ? true : pollEnabledRaw === 'false' || pollEnabledRaw === '0' ? false : undefined;

    const response = await listBilibiliVideos({
      pollEnabled,
      limit: parseAdminLimit(query.limit, 50, 1, 200),
      offset: parseAdminOffset(query.offset, 0, 0, 100000),
    });
    return reply.send(response);
  });

  app.post('/api/admin/bilibili/videos', async (request, reply) => {
    const expectedApiKey = settings.apiKey.trim();
    if (expectedApiKey) {
      const providedApiKey = getHeaderValue(request.headers['x-api-key']).trim();
      if (providedApiKey !== expectedApiKey) {
        return reply.code(401).send({ detail: 'unauthorized' });
      }
    }

    const body = request.body as Record<string, unknown>;
    const bvid = String(body.bvid ?? '').trim().slice(0, 20);
    const pollEnabled = body.poll_enabled !== undefined ? Boolean(body.poll_enabled) : true;

    if (!bvid) {
      return reply.code(400).send({ detail: 'bvid_required' });
    }

    // Basic BVID format validation (BV + 10 alphanumeric characters)
    if (!/^BV[a-zA-Z0-9]{10}$/.test(bvid)) {
      return reply.code(400).send({ detail: 'invalid_bvid_format' });
    }

    const response = await addBilibiliVideo({ bvid, pollEnabled });
    return reply.send(response);
  });

  // ── Bilibili video management (toggle-poll / delete / sync) ──

  app.post('/api/admin/bilibili/videos/:videoId/toggle-poll', async (request, reply) => {
    if (!checkApiKey(request, reply, settings)) return;
    const videoId = Number((request.params as Record<string, string>).videoId);
    if (!Number.isFinite(videoId)) return reply.code(400).send({ detail: 'invalid_video_id' });

    const prisma = getPrisma();
    const video = await prisma.bilibiliVideo.findUnique({ where: { id: videoId } });
    if (!video) return reply.code(404).send({ detail: 'video_not_found' });

    const body = request.body as Record<string, unknown> | undefined;
    const pollEnabled = body?.poll_enabled !== undefined ? Boolean(body.poll_enabled) : !video.poll_enabled;
    await prisma.bilibiliVideo.update({ where: { id: videoId }, data: { poll_enabled: pollEnabled } });

    return reply.send({ ok: true, item: { id: videoId, bvid: video.bvid, poll_enabled: pollEnabled } });
  });

  app.delete('/api/admin/bilibili/videos/:videoId', async (request, reply) => {
    if (!checkApiKey(request, reply, settings)) return;
    const videoId = Number((request.params as Record<string, string>).videoId);
    if (!Number.isFinite(videoId)) return reply.code(400).send({ detail: 'invalid_video_id' });

    const prisma = getPrisma();
    const video = await prisma.bilibiliVideo.findUnique({ where: { id: videoId } });
    if (!video) return reply.code(404).send({ detail: 'video_not_found' });

    await prisma.bilibiliVideo.delete({ where: { id: videoId } });
    return reply.send({ ok: true, deleted_id: videoId });
  });

  app.post('/api/admin/bilibili/videos/:videoId/sync', async (request, reply) => {
    if (!checkApiKey(request, reply, settings)) return;
    const videoId = Number((request.params as Record<string, string>).videoId);
    if (!Number.isFinite(videoId)) return reply.code(400).send({ detail: 'invalid_video_id' });

    const prisma = getPrisma();
    const video = await prisma.bilibiliVideo.findUnique({ where: { id: videoId } });
    if (!video) return reply.code(404).send({ detail: 'video_not_found' });

    // Sync: return current video info (Bilibili API sync requires configured client)
    return reply.send({
      ok: true,
      item: {
        id: video.id,
        bvid: video.bvid,
        aid: video.aid,
        title: video.title,
        owner_mid: video.owner_mid,
        note: 'sync_from_db',
      },
    });
  });

  // ── Bilibili poll trigger ──

  app.post('/api/admin/bilibili/poll', async (request, reply) => {
    if (!checkApiKey(request, reply, settings)) return;
    const { pollAllVideos } = await import('./services/bilibili-poller.js');
    const result = await pollAllVideos();
    return reply.send({ ok: true, result });
  });

  // ── Bilibili credentials CRUD ──

  app.get('/api/admin/bilibili/credentials', async (request, reply) => {
    if (!checkApiKey(request, reply, settings)) return;
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
    if (!checkApiKey(request, reply, settings)) return;
    const body = request.body as Record<string, unknown>;
    const name = String(body.name ?? '').trim().slice(0, 64);
    const sessdata = String(body.sessdata ?? '').trim();
    const biliJct = String(body.bili_jct ?? '').trim().slice(0, 128);
    const buvid3 = String(body.buvid3 ?? '').trim().slice(0, 128);
    const buvid4 = String(body.buvid4 ?? '').trim().slice(0, 128);
    const expiresAt = body.expires_at ? new Date(body.expires_at as string) : null;

    if (!name) return reply.code(400).send({ detail: 'name_required' });
    if (!sessdata) return reply.code(400).send({ detail: 'sessdata_required' });
    if (!biliJct) return reply.code(400).send({ detail: 'bili_jct_required' });
    if (!buvid3) return reply.code(400).send({ detail: 'buvid3_required' });

    const prisma = getPrisma();
    const existingCount = await prisma.bilibiliCredential.count();
    const isActive = existingCount === 0;

    // Encrypt sensitive fields before storage
    const encSessdata = encrypt(sessdata);
    const encBiliJct = encrypt(biliJct);

    const credential = await prisma.bilibiliCredential.create({
      data: {
        name,
        sessdata: encSessdata,
        bili_jct: encBiliJct,
        buvid3,
        buvid4: buvid4 || null,
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
    if (!checkApiKey(request, reply, settings)) return;
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
    if (!checkApiKey(request, reply, settings)) return;
    const credentialId = Number((request.params as Record<string, string>).credentialId);
    if (!Number.isFinite(credentialId)) return reply.code(400).send({ detail: 'invalid_credential_id' });

    const prisma = getPrisma();
    const credential = await prisma.bilibiliCredential.findUnique({ where: { id: credentialId } });
    if (!credential) return reply.code(404).send({ detail: 'credential_not_found' });

    await prisma.bilibiliCredential.delete({ where: { id: credentialId } });
    return reply.send({ ok: true, deleted_id: credentialId });
  });

  // ── Audit logs ──

  app.get('/audit-logs', async (request, reply) => {
    if (!checkApiKey(request, reply, settings)) return;
    const query = request.query as Record<string, unknown>;
    const prisma = getPrisma();

    const where: Record<string, unknown> = {};
    const action = parseAdminString(query.action);
    const okFilter = parseAdminBoolean(query.ok);
    const targetId = parseAdminLimit(query.target_id, -1, 0, Number.MAX_SAFE_INTEGER);
    const traceId = parseAdminString(query.trace_id);
    if (action) where.action = action;
    if (okFilter !== undefined) where.ok = okFilter;
    if (targetId >= 0) where.target_id = targetId;

    const limit = parseAdminLimit(query.limit, 200, 1, 5000);
    const offset = parseAdminOffset(query.offset, 0, 0, 100000);

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
      items: items.map((item) => ({
        id: item.id,
        action: item.action,
        target_type: item.target_type,
        target_id: item.target_id,
        ok: item.ok,
        payload: typeof item.payload === 'string' ? JSON.parse(item.payload) : item.payload,
        created_at: item.created_at?.toISOString() ?? null,
      })),
    });
  });

  app.get('/export/audit-logs.csv', async (request, reply) => {
    if (!checkApiKey(request, reply, settings)) return;
    const query = request.query as Record<string, unknown>;
    const prisma = getPrisma();

    const where: Record<string, unknown> = {};
    const action = parseAdminString(query.action);
    const okFilter = parseAdminBoolean(query.ok);
    const targetId = parseAdminLimit(query.target_id, -1, 0, Number.MAX_SAFE_INTEGER);
    if (action) where.action = action;
    if (okFilter !== undefined) where.ok = okFilter;
    if (targetId >= 0) where.target_id = targetId;

    const limit = parseAdminLimit(query.limit, 1000, 1, 5000);
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
        csvEscape(item.action),
        csvEscape(item.target_type),
        item.target_id ?? '',
        item.ok,
        csvEscape(String(payload.status ?? '')),
        csvEscape(String(payload.trace_id ?? '')),
        csvEscape(JSON.stringify(payload)),
        item.created_at?.toISOString() ?? '',
      ].join(',');
    });

    const csvBody = [header, ...rows].join('\n');
    const filename = `audit_logs_export_${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z.csv`;
    void reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    return reply.type('text/csv').send(csvBody);
  });

  app.get('/audit-logs/summary', async (request, reply) => {
    if (!checkApiKey(request, reply, settings)) return;
    const query = request.query as Record<string, unknown>;
    const days = parseAdminLimit(query.days, 7, 1, 90);
    const action = parseAdminString(query.action);
    const okFilter = parseAdminBoolean(query.ok);
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
      if (item.ok) byResult.ok++; else byResult.failed++;
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

  // ── Metrics /daily ──

  app.get('/metrics/daily', async (request, reply) => {
    if (!checkApiKey(request, reply, settings)) return;
    const query = request.query as Record<string, unknown>;
    const days = parseAdminLimit(query.days, 7, 1, 60);
    const prisma = getPrisma();

    const startUtc = new Date(Date.now() - days * 24 * 3600 * 1000);
    const jobs = await prisma.replyJob.findMany({
      where: { created_at: { gte: startUtc } },
      select: { created_at: true, status: true },
      orderBy: { created_at: 'asc' },
    });

    const grouped: Record<string, Record<string, number>> = {};
    const totalsByStatus: Record<string, number> = {};

    for (const job of jobs) {
      const dayKey = (job.created_at ?? new Date()).toISOString().slice(0, 10);
      if (!grouped[dayKey]) grouped[dayKey] = {};
      const status = job.status;
      grouped[dayKey][status] = (grouped[dayKey][status] ?? 0) + 1;
      totalsByStatus[status] = (totalsByStatus[status] ?? 0) + 1;
    }

    const items = Object.keys(grouped).sort().map((dayKey) => {
      const statusMap = grouped[dayKey];
      return {
        date: dayKey,
        queued: statusMap.queued ?? 0,
        published: statusMap.published ?? 0,
        manual_queue: statusMap.manual_queue ?? 0,
        blocked: statusMap.blocked ?? 0,
        dedupe_skipped: statusMap.dedupe_skipped ?? 0,
        skipped: statusMap.skipped ?? 0,
        status_breakdown: Object.fromEntries(Object.entries(statusMap).sort()),
        total: Object.values(statusMap).reduce((a, b) => a + b, 0),
      };
    });

    return reply.send({
      ok: true,
      days,
      totals: totalsByStatus,
      items,
    });
  });

  // ── Gateway publish-logs (top-level route) ──

  app.get('/gateway/publish-logs', async (request, reply) => {
    if (!checkApiKey(request, reply, settings)) return;
    const query = request.query as Record<string, unknown>;
    const prisma = getPrisma();

    const limit = parseAdminLimit(query.limit, 50, 1, 500);
    const offset = parseAdminOffset(query.offset, 0, 0, 100000);
    const status = parseAdminString(query.status);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [total, items] = await Promise.all([
      prisma.publishLog.count({ where }),
      prisma.publishLog.findMany({
        where,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        skip: offset,
        take: limit,
      }),
    ]);

    return reply.send({
      ok: true,
      total,
      items: items.map((item) => ({
        id: item.id,
        platform: item.platform,
        canonical_comment_id: item.canonical_comment_id,
        comment_id: item.comment_id,
        reply_hash: item.reply_hash,
        source: item.source,
        status: item.status,
        published_at: item.published_at?.toISOString() ?? null,
        failure_reason: item.failure_reason,
        created_at: item.created_at?.toISOString() ?? null,
      })),
    });
  });

  // ── Legacy compatibility routes (/api/ prefix aliases) ──

  app.get('/api/metrics/overview', async (request, reply) => {
    if (!checkApiKey(request, reply, settings)) return;
    const prisma = getPrisma();
    const totalJobs = await prisma.replyJob.count();
    const totalComments = await prisma.comment.count();
    const byStatusRows = await prisma.replyJob.groupBy({ by: ['status'], _count: true });
    const byStatus: Record<string, number> = {};
    for (const row of byStatusRows) {
      byStatus[row.status] = row._count;
    }
    return reply.send({
      ok: true,
      totals: { comments: totalComments, jobs: totalJobs },
      by_status: byStatus,
    });
  });

  app.get('/api/jobs', async (request, reply) => {
    if (!checkApiKey(request, reply, settings)) return;
    const query = request.query as Record<string, unknown>;
    const prisma = getPrisma();
    const limit = parseAdminLimit(query.limit, 50, 1, 500);
    const offset = parseAdminOffset(query.offset, 0, 0, 100000);
    const [total, items] = await Promise.all([
      prisma.replyJob.count(),
      prisma.replyJob.findMany({ orderBy: { created_at: 'desc' }, skip: offset, take: limit }),
    ]);
    return reply.send({ ok: true, total, items });
  });

  app.get('/api/audit-logs/summary', async (request, reply) => {
    if (!checkApiKey(request, reply, settings)) return;
    const query = request.query as Record<string, unknown>;
    const prisma = getPrisma();
    const days = parseAdminLimit(query.days, 7, 1, 90);
    const since = new Date(Date.now() - days * 86400000);
    const total = await prisma.operationAuditLog.count({ where: { created_at: { gte: since } } });
    return reply.send({ ok: true, days, total });
  });

  // ── Serve admin static files ──

  app.get('/admin', async (_request, reply) => {
    return reply.type('text/html').send(`<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bili Pet Admin</title>
  <link rel="stylesheet" href="/admin/admin.css" />
</head>
<body>
  <div id="admin-root"></div>
  <script src="/admin/admin.js"></script>
</body>
</html>`);
  });

  // Serve admin static assets
  app.get('/admin/admin.css', async (_request, reply) => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const cssPath = path.join(process.cwd(), 'public', 'admin', 'admin.css');
    try {
      const css = await fs.readFile(cssPath, 'utf-8');
      return reply.type('text/css').send(css);
    } catch {
      return reply.code(404).send({ error: 'not_found' });
    }
  });

  app.get('/admin/admin.js', async (_request, reply) => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const jsPath = path.join(process.cwd(), 'public', 'admin', 'admin.js');
    try {
      const js = await fs.readFile(jsPath, 'utf-8');
      return reply.type('application/javascript').send(js);
    } catch {
      return reply.code(404).send({ error: 'not_found' });
    }
  });

  // ── Static asset aliases (smoke test compatibility: /static/admin/*) ──

  app.get('/static/admin/admin.css', async (_request, reply) => {
    const fs = await import('fs/promises');
    const path = await import('path');
    try {
      const css = await fs.readFile(path.join(process.cwd(), 'public', 'admin', 'admin.css'), 'utf-8');
      return reply.type('text/css').send(css);
    } catch {
      return reply.code(404).send({ error: 'not_found' });
    }
  });

  app.get('/static/admin/admin.js', async (_request, reply) => {
    const fs = await import('fs/promises');
    const path = await import('path');
    try {
      const js = await fs.readFile(path.join(process.cwd(), 'public', 'admin', 'admin.js'), 'utf-8');
      return reply.type('application/javascript').send(js);
    } catch {
      return reply.code(404).send({ error: 'not_found' });
    }
  });

  return app;
}
