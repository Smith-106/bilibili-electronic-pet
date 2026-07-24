import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

import { PrismaClient } from '@prisma/client';
import Fastify, { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';
import { createMemoryService } from './app/memory/index.js';
import { createPetCoreService } from './app/pet-core/index.js';
import { COMPANION_SYSTEM_SPACE_KEY, upsertCompanionFeedItem } from './app/memory/companion-feed.js';
import {
  buildGatewayPublishIntent,
  buildPlatformPublishIntent,
  resolveCommentReplyIntentParts,
} from './domain/publish/comment-reply-intent.js';
import { getPrisma, DEFAULT_DATABASE_URL, checkDatabaseConnection } from './lib/prisma.js';
import { DuplicateKeyError, isPrismaP2002 } from './lib/duplicate-key-error.js';
import { getPlatformControlState, setPlatformControlState } from './platforms/control-state.js';
import { publishViaSidecarWebhook } from './platforms/sidecar-webhook.js';
import { listPlatformAdapters, listPlatformIngressRoutes, resolvePlatformAdapter } from './platforms/registry.js';
import { registerAdminCoreRoutes } from './routes/admin-core.js';
import { registerAdminManagementRoutes } from './routes/admin-management.js';
import { registerAdminReportingRoutes } from './routes/admin-reporting.js';
import { registerAdminStaticRoutes } from './routes/admin-static.js';
import { registerBilibiliAdminRoutes } from './routes/bilibili-admin.js';
import { registerCommentRoutes } from './routes/comments.js';
import { registerCompanionRoutes } from './routes/companion.js';
import { registerGatewayPublishRoutes } from './routes/gateway-publish.js';
import { registerJobRoutes } from './routes/jobs.js';
import { registerReadinessRoute, threeLayerFlagsAllOn } from './routes/readiness.js';
import { createCommentIngestHelpers } from './server/comment-ingest.js';
import { createCommentJobActionHelpers } from './server/comment-job-actions.js';
import { createCommentJobQueryHelpers } from './server/comment-job-queries.js';
import type {
  AdminAuditSummaryResponse,
  AdminGatewayLogsResponse,
  AdminJobsResponse,
  BilibiliDiagnostics,
  BilibiliVideo,
  CommentEvent,
  CompanionInteraction,
  CompanionInteractionKind,
  CompanionState,
  CompanionStateV2,
  ConnectionStatus,
  GatewayPublishPayload,
  IdentityLink,
  KnowledgeEntry,
  MemoryGrant,
  MemoryItem,
  MemorySpace,
  PlatformName,
  PlatformConnectionSnapshot,
  PublishExecutionResult,
  PublishFinalizeInput,
  PublishGatewayInput,
  PublishPlatformInput,
  PublishReservationInput,
  ReservePublishLogResult,
  RoleCard,
  RoleCardValue,
  RuntimeSettings,
} from './server/contracts.js';
import { buildDefaultServerDependencies, type ServerDependencies } from './server/dependencies.js';
import { issueAdminSession, verifyAdminSessionToken } from './server/admin-auth.js';
import type { PetActionName } from './server/pet-contracts.js';
import {
  defaultGetPlatformPublishSource,
  defaultIsPlatformEnabled,
  normalizePublishMode,
} from './server/runtime-platform.js';
import { collectCommentEvent, type CollectorSource } from './services/collector.js';
import {
  postReply,
  probeBilibiliAuth as probeBilibiliRuntimeAuth,
  type BilibiliAuthProbeResult,
} from './services/bilibili-client.js';
import { loadBilibiliRuntimeConfig, type BilibiliRuntimeConfig } from './services/bilibili-runtime-config.js';
import {
  getObservabilityDropCount,
  isDropCountThresholdExceeded,
  recordObservabilityEvent,
  ensureTraceId,
} from './services/observability.js';
import { isAuthProbeHealthy } from './services/probe-scheduler.js';
import { isCompliancePassive } from './services/compliance-mode.js';
import { isEncryptionAvailable } from './services/credential-crypto.js';
import { checkRedisConnection } from './lib/redis.js';
import { timingSafeStringCompare } from './lib/timing-safe-compare.js';

type DeliveryCapabilityName =
  | 'llm_generation'
  | 'search_enrichment'
  | 'webhook_publish'
  | 'native_bilibili_publish'
  | 'comment_ingress_auth';

type DeliveryCapabilityStatus =
  | 'configured'
  | 'inactive'
  | 'fallback_only'
  | 'fallback_enabled'
  | 'unsupported'
  | 'missing_inputs'
  | 'runtime_credentials_required';

type DeliveryCapability = {
  capability: DeliveryCapabilityName;
  active: boolean;
  status: DeliveryCapabilityStatus;
  ready: boolean;
  mode: string;
  missing_inputs: string[];
};

type DeliveryCapabilityMatrix = {
  blockers: DeliveryCapabilityName[];
  capabilities: DeliveryCapability[];
  summary: Array<{
    capability: DeliveryCapabilityName;
    status: DeliveryCapabilityStatus;
    mode: string;
    missing_inputs: string[];
  }>;
};
export type {
  AdminAuditSummaryResponse,
  AdminGatewayLogsResponse,
  AdminJobsResponse,
  BilibiliDiagnostics,
  BilibiliVideo,
  CommentEvent,
  ConnectionStatus,
  GatewayPublishPayload,
  KnowledgeEntry,
  PlatformName,
  PublishExecutionResult,
  PublishFinalizeInput,
  PublishGatewayInput,
  PublishPlatformInput,
  PublishReservationInput,
  ReplyJob,
  ReservePublishLogResult,
  RoleCard,
  RoleCardValue,
  RuntimeSettings,
} from './server/contracts.js';
export type { ServerDependencies } from './server/dependencies.js';

const STANDARD_PUBLISH_FAILURE_REASONS = new Set([
  'timeout',
  '5xx',
  'auth',
  'invalid_response',
  'not_configured',
  'webhook_not_configured',
  'sidecar_webhook_not_configured',
  'platform_disabled',
  'bilibili_reference_adapter_only',
  'bilibili_not_configured',
  'publish_failed',
  'runtime_credentials_required',
]);
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

function isProductionRuntime(): boolean {
  return (
    String(process.env.NODE_ENV ?? '')
      .trim()
      .toLowerCase() === 'production'
  );
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

function normalizeNullableIsoTimestamp(value: Date | string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  return normalizeIsoTimestamp(value);
}

function startCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ');
}

function normalizeCompanionInteractionKind(value: unknown): CompanionInteractionKind {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();
  if (normalized === 'pat' || normalized === 'feed' || normalized === 'wake') {
    return normalized;
  }
  if (normalized === 'fallback') {
    return 'fallback';
  }
  return 'signal';
}

function buildCompanionInteraction(item: {
  item_key: string;
  content: string;
  source: string;
  item_metadata?: Record<string, unknown>;
  created_at?: Date | string | null;
  updated_at?: Date | string | null;
}): CompanionInteraction {
  const metadata = item.item_metadata ?? {};
  const action = typeof metadata.action === 'string' ? metadata.action.trim().toLowerCase() : '';
  const kind = normalizeCompanionInteractionKind(action);
  const sourceLabel = startCase(item.source || 'system');
  const title = action ? `${startCase(action)} interaction` : `${sourceLabel} signal`;
  const timestamp = item.updated_at ?? item.created_at;

  // F1 (security): the legacy companion-state path feeds an UNAUTHENTICATED GET endpoint
  // (GET /companion/state). item.content can carry user-submitted free text (POST
  // /companion/actions note, up to 256 chars) or Bilibili external identifiers (comment_id
  // from comment-job-actions) — both are PII that MUST NOT surface on the public response.
  // Use a curated, non-PII detail derived from kind/title/source only. The pet-core path
  // (toCompanionState) uses operator-authored event_detail, not user content, so it is safe.
  const detail = `${title} from ${sourceLabel.toLowerCase()}`;

  return {
    kind,
    title,
    detail,
    timestamp: timestamp ? normalizeIsoTimestamp(timestamp) : 'Pending',
    source: sourceLabel,
  };
}

const REVIEWABLE_JOB_STATUSES = ['manual_queue', 'blocked', 'dedupe_skipped'] as const;

function normalizeAdminJobStatus(status: unknown): string {
  const normalized = String(status ?? '').trim();
  if (!normalized) {
    return 'queued';
  }
  return REVIEWABLE_JOB_STATUSES.includes(normalized as (typeof REVIEWABLE_JOB_STATUSES)[number])
    ? 'pending_review'
    : normalized;
}

function buildAdminJobStatusWhere(status?: string): Record<string, unknown> {
  const normalized = String(status ?? '').trim();
  if (!normalized) {
    return {};
  }
  if (normalized === 'pending_review') {
    return {
      status: {
        in: [...REVIEWABLE_JOB_STATUSES],
      },
    };
  }
  return { status: normalized };
}

function parseJsonRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== 'string') {
    return {};
  }
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function parseRoleCardValue(value: unknown): RoleCardValue {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== 'string') {
    return '';
  }
  const normalized = value.trim();
  if (!normalized) {
    return '';
  }
  try {
    const parsed = JSON.parse(normalized);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : normalized;
  } catch {
    return normalized;
  }
}

function normalizeRoleCardInputValue(value: unknown): RoleCardValue {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  return '';
}

function serializeRoleCardValue(value: RoleCardValue): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  return stableStringify(value);
}

function normalizeRoleCardRecord(item: Record<string, unknown>): RoleCard {
  return {
    id: Number(item.id ?? 0),
    key: String(item.key ?? ''),
    name: String(item.name ?? ''),
    description: String(item.description ?? ''),
    system_prompt: String(item.system_prompt ?? ''),
    tone: parseRoleCardValue(item.tone),
    constraints: parseRoleCardValue(item.constraints),
    enabled: Boolean(item.enabled),
    is_active: Boolean(item.is_active),
    created_at: normalizeNullableIsoTimestamp(item.created_at as Date | string | null | undefined),
    updated_at: normalizeNullableIsoTimestamp(item.updated_at as Date | string | null | undefined),
  };
}

function extractRiskFlagLabels(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry ?? '').trim()).filter(Boolean);
  }

  const payload = parseJsonRecord(value);
  const labels: string[] = [];
  const directKeys = ['reason', 'decision', 'label', 'risk_level'];
  for (const key of directKeys) {
    const item = String(payload[key] ?? '').trim();
    if (item && item !== 'ok') {
      labels.push(item);
    }
  }

  const arrayKeys = ['blocked_words', 'risk_labels', 'pii_types', 'flags'];
  for (const key of arrayKeys) {
    const items = Array.isArray(payload[key]) ? payload[key] : [];
    for (const item of items) {
      const normalized = String(item ?? '').trim();
      if (normalized) {
        labels.push(normalized);
      }
    }
  }

  return [...new Set(labels)];
}

function normalizeAdminJobListItem(item: Record<string, unknown>): Record<string, unknown> {
  const rawStatus = String(item.raw_status ?? item.status ?? '').trim();
  const normalizedStatus = normalizeAdminJobStatus(rawStatus);
  const commentText = isNonEmptyString(item.comment_text)
    ? item.comment_text
    : isNonEmptyString(item.comment_content)
      ? item.comment_content
      : null;

  return {
    ...item,
    id: item.id == null ? '' : String(item.id),
    status: normalizedStatus,
    ...(rawStatus && rawStatus !== normalizedStatus ? { raw_status: rawStatus } : {}),
    comment_text: commentText,
    comment_content: commentText,
    risk_flags: extractRiskFlagLabels(item.risk_flags),
    created_at: normalizeNullableIsoTimestamp(item.created_at as Date | string | null | undefined),
    updated_at: normalizeNullableIsoTimestamp(item.updated_at as Date | string | null | undefined),
    published_at: normalizeNullableIsoTimestamp(item.published_at as Date | string | null | undefined),
  };
}

function getGroupCount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const nested = record._all;
    if (typeof nested === 'number' && Number.isFinite(nested)) {
      return nested;
    }
  }
  return 0;
}

function normalizeAdminOverviewPayload(overview: Record<string, unknown>): Record<string, unknown> {
  const totals =
    overview.totals && typeof overview.totals === 'object' && !Array.isArray(overview.totals)
      ? (overview.totals as Record<string, unknown>)
      : {};

  const totalComments = Number(overview.total_comments ?? totals.comments ?? 0);
  const totalJobs = Number(overview.total_jobs ?? totals.jobs ?? 0);
  const totalPublished = Number(overview.total_published ?? totals.published ?? totals.published_jobs ?? 0);
  const pendingReview = Number(
    overview.pending_review ?? totals.pending_review ?? totals.comments_manual_queue_or_processing ?? 0,
  );
  const totalFailed = Number(overview.total_failed ?? totals.failed ?? totals.failed_jobs ?? 0);

  return {
    ...overview,
    total_comments: Number.isFinite(totalComments) ? totalComments : 0,
    total_jobs: Number.isFinite(totalJobs) ? totalJobs : 0,
    total_published: Number.isFinite(totalPublished) ? totalPublished : 0,
    pending_review: Number.isFinite(pendingReview) ? pendingReview : 0,
    total_failed: Number.isFinite(totalFailed) ? totalFailed : 0,
  };
}

function normalizeAdminAuditSummaryPayload(summary: Record<string, unknown>): Record<string, unknown> {
  const totals =
    summary.totals && typeof summary.totals === 'object' && !Array.isArray(summary.totals)
      ? (summary.totals as Record<string, unknown>)
      : {};
  const byResult =
    summary.by_result && typeof summary.by_result === 'object' && !Array.isArray(summary.by_result)
      ? (summary.by_result as Record<string, unknown>)
      : {};

  const total = Number(summary.total ?? totals.audit_logs ?? 0);
  const okCount = Number(summary.ok_count ?? totals.ok ?? byResult.ok ?? byResult.success ?? 0);
  const failedCount = Number(summary.failed_count ?? totals.failed ?? byResult.failed ?? 0);

  return {
    ...summary,
    total: Number.isFinite(total) ? total : 0,
    ok_count: Number.isFinite(okCount) ? okCount : 0,
    failed_count: Number.isFinite(failedCount) ? failedCount : 0,
  };
}

function normalizeStyleProfilePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const styleProfile = String(payload.style_profile ?? payload.style ?? '')
    .trim()
    .toLowerCase();
  return {
    ...payload,
    style_profile: styleProfile,
    style: styleProfile,
  };
}

function normalizeRoleProfilePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const roleProfile = String(payload.role_profile ?? payload.role ?? '')
    .trim()
    .toLowerCase();
  return {
    ...payload,
    role_profile: roleProfile,
    role: roleProfile,
  };
}

function normalizeBilibiliStatusPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const config =
    payload.config && typeof payload.config === 'object' && !Array.isArray(payload.config)
      ? (payload.config as Record<string, unknown>)
      : {};
  const videos =
    payload.videos && typeof payload.videos === 'object' && !Array.isArray(payload.videos)
      ? (payload.videos as Record<string, unknown>)
      : {};

  const enabled = Boolean(payload.enabled ?? config.enabled);
  const pollingEnabled = Boolean(
    payload.polling_enabled ?? payload.poll_enabled ?? config.polling_enabled ?? config.poll_enabled,
  );
  const publishEnabled = Boolean(payload.publish_enabled ?? config.publish_enabled);
  const videoCount = Number(
    payload.video_count ?? videos.video_count ?? videos.total ?? videos.poll_enabled_count ?? 0,
  );

  return {
    ...payload,
    enabled,
    polling_enabled: pollingEnabled,
    poll_enabled: pollingEnabled,
    publish_enabled: publishEnabled,
    video_count: Number.isFinite(videoCount) ? videoCount : 0,
  };
}

function normalizeBilibiliVideoRecord(
  item: Record<string, unknown>,
  options: { commentCount?: number } = {},
): BilibiliVideo {
  return {
    id: Number(item.id ?? 0),
    bvid: String(item.bvid ?? ''),
    aid: typeof item.aid === 'number' ? item.aid : item.aid == null ? null : Number(item.aid),
    title: typeof item.title === 'string' ? item.title : item.title == null ? null : String(item.title),
    owner_mid:
      typeof item.owner_mid === 'number' ? item.owner_mid : item.owner_mid == null ? null : Number(item.owner_mid),
    poll_enabled: Boolean(item.poll_enabled),
    comment_count: options.commentCount ?? 0,
    last_polled_at: normalizeNullableIsoTimestamp(item.last_polled_at as Date | string | null | undefined),
    last_poll_status:
      typeof item.last_poll_status === 'string'
        ? item.last_poll_status
        : item.last_poll_status == null
          ? null
          : String(item.last_poll_status),
    last_poll_error:
      typeof item.last_poll_error === 'string'
        ? item.last_poll_error
        : item.last_poll_error == null
          ? null
          : String(item.last_poll_error),
    last_rpid:
      typeof item.last_rpid === 'number' ? item.last_rpid : item.last_rpid == null ? null : Number(item.last_rpid),
    created_at: normalizeNullableIsoTimestamp(item.created_at as Date | string | null | undefined),
    updated_at: normalizeNullableIsoTimestamp(item.updated_at as Date | string | null | undefined),
  };
}

function getAuditLogDetail(payload: Record<string, unknown>): string | null {
  const candidateKeys = ['detail', 'error', 'reason', 'publish_reason', 'reply_text_preview', 'message'];
  for (const key of candidateKeys) {
    const value = String(payload[key] ?? '').trim();
    if (value) {
      return value;
    }
  }
  const status = String(payload.status ?? '').trim();
  return status || null;
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
  return timingSafeEqual(expected, actual);
}

function buildDefaultSettings(): RuntimeSettings {
  const llmProvider = String(process.env.LLM_PROVIDER ?? 'mock').trim() || 'mock';
  const searchProvider = String(process.env.SEARCH_PROVIDER ?? 'serpapi').trim() || 'serpapi';

  const bilibiliEnvCredentialConfigured =
    hasText(process.env.BILIBILI_SESSDATA) &&
    hasText(process.env.BILIBILI_BILI_JCT) &&
    hasText(process.env.BILIBILI_BUVID3);

  return {
    databaseUrl: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
    celeryBrokerUrl: process.env.CELERY_BROKER_URL ?? 'redis://localhost:6379/0',
    celeryResultBackend: process.env.CELERY_RESULT_BACKEND ?? 'redis://localhost:6379/1',
    apiKey: process.env.API_KEY ?? '',
    adminSessionSecret: process.env.ADMIN_SESSION_SECRET ?? '',
    adminSessionTtlSeconds: parseInteger(process.env.ADMIN_SESSION_TTL_SECONDS, 60 * 60 * 12),
    llmProvider,
    llmApiKeyConfigured: hasText(process.env.LLM_API_KEY),
    llmFallbackToMock: parseBoolean(process.env.LLM_FALLBACK_TO_MOCK, true),
    searchProvider,
    searchApiKeyConfigured: hasText(process.env.SEARCH_API_KEY),
    searchCxConfigured: hasText(process.env.SEARCH_CX),
    publisherMode: normalizePublishMode(process.env.PUBLISHER_MODE ?? 'manual_queue'),
    publisherWebhookUrlConfigured: hasText(process.env.PUBLISHER_WEBHOOK_URL),
    bilibiliEnabled: parseBoolean(process.env.BILIBILI_ENABLED, false),
    bilibiliPollEnabled: parseBoolean(process.env.BILIBILI_POLL_ENABLED, false),
    bilibiliPollIntervalSeconds: parseInteger(process.env.BILIBILI_POLL_INTERVAL_SECONDS, 300),
    bilibiliPublishEnabled: parseBoolean(process.env.BILIBILI_PUBLISH_ENABLED, false),
    bilibiliEnvCredentialConfigured,
    killSwitch: parseBoolean(process.env.KILL_SWITCH, false),
    gatewayToken: process.env.GATEWAY_TOKEN ?? '',
    gatewayHmacSecret: process.env.GATEWAY_HMAC_SECRET ?? '',
    commentIngressToken: process.env.COMMENT_INGRESS_TOKEN ?? '',
    publicCompanionActionsEnabled: parseBoolean(process.env.PUBLIC_COMPANION_ACTIONS_ENABLED, false),
    platformBilibiliEnabled: parseBoolean(process.env.PLATFORM_BILIBILI_ENABLED, false),
    platformQqEnabled: parseBoolean(process.env.PLATFORM_QQ_ENABLED, false),
    platformDouyinEnabled: parseBoolean(process.env.PLATFORM_DOUYIN_ENABLED, false),
    platformKuaishouEnabled: parseBoolean(process.env.PLATFORM_KUAISHOU_ENABLED, false),
    platformBilibiliPublishSource: process.env.PLATFORM_BILIBILI_PUBLISH_SOURCE ?? 'bilibili-bot',
    platformQqPublishSource: process.env.PLATFORM_QQ_PUBLISH_SOURCE ?? 'qq-sidecar',
    platformDouyinPublishSource: process.env.PLATFORM_DOUYIN_PUBLISH_SOURCE ?? 'douyin-bot',
    platformKuaishouPublishSource: process.env.PLATFORM_KUAISHOU_PUBLISH_SOURCE ?? 'kuaishou-bot',
  };
}

function buildDefaultReadinessSummary(settings: RuntimeSettings): {
  config: Record<string, unknown>;
  publish: Record<string, unknown>;
  kill_switch: boolean;
  public_companion_actions_enabled: boolean;
} {
  return {
    config: {
      database_url_set: hasText(settings.databaseUrl),
      celery_broker_url_set: hasText(settings.celeryBrokerUrl),
      celery_result_backend_set: hasText(settings.celeryResultBackend),
      api_key_set: hasText(settings.apiKey),
      admin_session_secret_set: hasText(settings.adminSessionSecret),
      admin_session_ttl_seconds: settings.adminSessionTtlSeconds ?? 60 * 60 * 12,
      llm_provider: settings.llmProvider,
      llm_api_key_configured: settings.llmApiKeyConfigured,
      llm_fallback_to_mock: settings.llmFallbackToMock,
      search_provider: settings.searchProvider,
      search_api_key_configured: settings.searchApiKeyConfigured,
      search_cx_configured: settings.searchCxConfigured,
      comment_ingress_token_set: hasText(settings.commentIngressToken),
    },
    publish: {
      mode: settings.publisherMode,
      webhook_url_configured: settings.publisherWebhookUrlConfigured,
      bilibili_enabled: settings.bilibiliEnabled,
      bilibili_publish_enabled: settings.bilibiliPublishEnabled,
      bilibili_env_credential_configured: settings.bilibiliEnvCredentialConfigured,
    },
    kill_switch: settings.killSwitch,
    public_companion_actions_enabled: settings.publicCompanionActionsEnabled ?? false,
  };
}

function createDeliveryCapability(
  capability: DeliveryCapabilityName,
  active: boolean,
  status: DeliveryCapabilityStatus,
  mode: string,
  missingInputs: string[] = [],
): DeliveryCapability {
  return {
    capability,
    active,
    status,
    ready: status === 'configured',
    mode: mode || 'unknown',
    missing_inputs: missingInputs,
  };
}

function buildDeliveryCapabilityMatrix(
  settings: RuntimeSettings,
  bilibiliDiagnostics: BilibiliDiagnostics,
  effectivePublishMode: string,
): DeliveryCapabilityMatrix {
  const llmProvider =
    String(settings.llmProvider ?? 'mock')
      .trim()
      .toLowerCase() || 'mock';
  let llmStatus: DeliveryCapabilityStatus = 'configured';
  const llmMissing: string[] = [];
  if (llmProvider === 'mock') {
    llmStatus = 'fallback_only';
    llmMissing.push('LLM_PROVIDER(non-mock)');
  } else if (!['openai', 'claude', 'ollama'].includes(llmProvider)) {
    llmStatus = 'unsupported';
    llmMissing.push('LLM_PROVIDER=<openai|claude|ollama>');
  } else if ((llmProvider === 'openai' || llmProvider === 'claude') && !settings.llmApiKeyConfigured) {
    llmStatus = 'missing_inputs';
    llmMissing.push('LLM_API_KEY');
  } else if (settings.llmFallbackToMock) {
    llmStatus = 'fallback_enabled';
    llmMissing.push('LLM_FALLBACK_TO_MOCK=false');
  }

  const searchProvider =
    String(settings.searchProvider ?? 'serpapi')
      .trim()
      .toLowerCase() || 'serpapi';
  let searchStatus: DeliveryCapabilityStatus = 'configured';
  const searchMissing: string[] = [];
  if (!['serpapi', 'bing', 'google'].includes(searchProvider)) {
    searchStatus = 'unsupported';
    searchMissing.push('SEARCH_PROVIDER=<serpapi|bing|google>');
  } else {
    if (!settings.searchApiKeyConfigured) {
      searchStatus = 'missing_inputs';
      searchMissing.push('SEARCH_API_KEY');
    }
    if (searchProvider === 'google' && !settings.searchCxConfigured) {
      searchStatus = 'missing_inputs';
      searchMissing.push('SEARCH_CX');
    }
  }

  const normalizedMode = normalizePublishMode(effectivePublishMode || settings.publisherMode);
  const webhookActive = normalizedMode === 'webhook';
  const webhookStatus: DeliveryCapabilityStatus = webhookActive
    ? settings.publisherWebhookUrlConfigured
      ? 'configured'
      : 'missing_inputs'
    : 'inactive';
  const webhookMissing = webhookStatus === 'missing_inputs' ? ['PUBLISHER_WEBHOOK_URL'] : [];

  const nativePublishActive = normalizedMode === 'native_bilibili' || normalizedMode === 'real_publish';
  let nativeStatus: DeliveryCapabilityStatus = nativePublishActive ? 'configured' : 'inactive';
  const nativeMissing: string[] = [];
  const blockingReasons = Array.isArray(bilibiliDiagnostics.blocking_reasons)
    ? bilibiliDiagnostics.blocking_reasons.map((entry) => String(entry))
    : [];

  if (nativePublishActive && bilibiliDiagnostics.ready !== true) {
    if (blockingReasons.some((entry) => entry.startsWith('auth:'))) {
      nativeStatus = 'runtime_credentials_required';
      nativeMissing.push('BILIBILI_SESSDATA/BILIBILI_BILI_JCT/BILIBILI_BUVID3 or active DB credential');
    } else {
      nativeStatus = 'missing_inputs';
    }
    if (!settings.bilibiliEnabled && normalizedMode === 'native_bilibili') {
      nativeMissing.push('BILIBILI_ENABLED=true');
    }
    if (!settings.bilibiliPublishEnabled && normalizedMode === 'native_bilibili') {
      nativeMissing.push('BILIBILI_PUBLISH_ENABLED=true');
    }
  }

  const capabilities: DeliveryCapability[] = [
    createDeliveryCapability('llm_generation', true, llmStatus, llmProvider, llmMissing),
    createDeliveryCapability('search_enrichment', true, searchStatus, searchProvider, searchMissing),
    createDeliveryCapability('webhook_publish', webhookActive, webhookStatus, normalizedMode, webhookMissing),
    createDeliveryCapability(
      'native_bilibili_publish',
      nativePublishActive,
      nativeStatus,
      normalizedMode,
      nativeMissing,
    ),
    createDeliveryCapability(
      'comment_ingress_auth',
      true,
      hasText(settings.commentIngressToken) ? 'configured' : 'missing_inputs',
      'token',
      hasText(settings.commentIngressToken) ? [] : ['COMMENT_INGRESS_TOKEN'],
    ),
  ];

  const blockers = capabilities
    .filter((entry) => entry.status !== 'configured' && entry.status !== 'inactive')
    .map((entry) => entry.capability);

  return {
    blockers,
    capabilities,
    summary: capabilities.map((entry) => ({
      capability: entry.capability,
      status: entry.status,
      mode: entry.mode,
      missing_inputs: entry.missing_inputs,
    })),
  };
}

async function defaultBilibiliDiagnostics(
  settings: RuntimeSettings,
  probeBilibiliAuth: (
    config: BilibiliRuntimeConfig,
  ) => Promise<BilibiliAuthProbeResult> | BilibiliAuthProbeResult = probeBilibiliRuntimeAuth,
): Promise<BilibiliDiagnostics> {
  const nativePublishEnabled = settings.bilibiliEnabled && settings.bilibiliPublishEnabled;
  const rawPublishMode = normalizePublishMode(settings.publisherMode);
  const effectivePublishMode = nativePublishEnabled ? 'native_bilibili' : rawPublishMode;
  const pollingWorkerEnabled = settings.bilibiliEnabled && settings.bilibiliPollEnabled;
  const bilibiliApiPublishEnabled =
    effectivePublishMode === 'native_bilibili' || effectivePublishMode === 'real_publish';
  const webhookPublishEnabled = effectivePublishMode === 'webhook';
  const deliveryCapablePublishMode = bilibiliApiPublishEnabled || webhookPublishEnabled;
  const credential = await loadBilibiliRuntimeConfig();
  const credentialPresent = Boolean(credential);
  const credentialComplete = Boolean(credential?.sessdata && credential?.biliJct && credential?.buvid);
  const authRequired = bilibiliApiPublishEnabled || pollingWorkerEnabled;
  const authProbe =
    authRequired && credentialComplete && credential
      ? await probeBilibiliAuth(credential)
      : { ok: false, reason: 'no_active_credential' };
  const realAuthReady = authRequired ? authProbe.ok : false;
  const webhookConfigured = webhookPublishEnabled ? hasText(process.env.PUBLISHER_WEBHOOK_URL) : false;
  const workerPathReady = pollingWorkerEnabled ? realAuthReady : false;
  const publishPathReady = webhookPublishEnabled
    ? webhookConfigured
    : bilibiliApiPublishEnabled
      ? realAuthReady
      : false;
  const workerOrPublishReady = workerPathReady || publishPathReady;
  const dependencyReady = webhookPublishEnabled ? workerOrPublishReady : true;
  const authErrors =
    authRequired && !realAuthReady
      ? [credentialComplete ? 'credential_validation_failed' : 'no active credential']
      : [];
  const configErrors =
    webhookPublishEnabled && !webhookConfigured && !workerPathReady ? ['webhook_not_configured'] : [];
  const diagnosticsReady = authRequired ? realAuthReady : publishPathReady;
  const blockingReasons = [
    ...configErrors.map((reason) => `publish:${reason}`),
    ...authErrors.map((reason) => `auth:${reason}`),
  ];
  const preReleaseRealChainReady =
    effectivePublishMode === 'native_bilibili' && nativePublishEnabled && realAuthReady && dependencyReady;

  return {
    ready: diagnosticsReady,
    blocking_reasons: blockingReasons,
    effective_publish_mode: effectivePublishMode,
    checks: {
      config: { ready: configErrors.length === 0, errors: configErrors },
      auth: { ready: !authRequired || realAuthReady, errors: authErrors },
      worker_or_publish: {
        ready: workerOrPublishReady,
        errors: [...configErrors, ...authErrors],
      },
    },
    release_gates: {
      worker_or_publish_ready: workerOrPublishReady,
      native_publish_enabled: nativePublishEnabled,
      credential_present: credentialPresent,
      credential_complete: credentialComplete,
      real_auth_ready: realAuthReady,
      dependency_ready: dependencyReady,
      delivery_capable_publish_mode: deliveryCapablePublishMode,
      effective_publish_mode: effectivePublishMode,
      blocking_reasons: blockingReasons,
      pre_release_real_chain_ready: preReleaseRealChainReady,
    },
    signals: {
      raw_publish_mode: rawPublishMode,
      effective_publish_mode: effectivePublishMode,
      native_publish_enabled: nativePublishEnabled,
      polling_worker_enabled: pollingWorkerEnabled,
      credential_present: credentialPresent,
      credential_complete: credentialComplete,
      auth_probe_reason: authRequired ? authProbe.reason : 'not_required',
      publish_mode_config_ready: configErrors.length === 0,
      delivery_capable_publish_mode: deliveryCapablePublishMode,
      webhook_configured: webhookConfigured,
      real_auth_ready: realAuthReady,
      pre_release_real_chain_ready: preReleaseRealChainReady,
    },
  };
}

async function defaultCheckDatabaseConnection(): Promise<ConnectionStatus> {
  // H4 fix: 委派给 lib/prisma.ts 的 checkDatabaseConnection — entry 不再越层直接 $queryRawUnsafe.
  return checkDatabaseConnection();
}

async function defaultCheckRedisConnection(): Promise<ConnectionStatus> {
  // H4 fix: 委派给 lib/redis.ts 的 checkRedisConnection — entry 不再越层直接 new Redis().
  return checkRedisConnection();
}

function defaultNormalizePublishFailureReason(reason: string | undefined): string {
  const normalized = String(reason ?? '')
    .trim()
    .toLowerCase();
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
  if (normalized.includes('webhook_not_configured')) {
    return 'webhook_not_configured';
  }
  if (normalized.includes('sidecar') && normalized.includes('not_configured')) {
    return 'sidecar_webhook_not_configured';
  }
  if (normalized.includes('reference_adapter_only')) {
    return 'bilibili_reference_adapter_only';
  }
  if (normalized.includes('runtime_credentials_required')) {
    return 'runtime_credentials_required';
  }
  if (normalized.includes('publish_failed')) {
    return 'publish_failed';
  }
  return 'invalid_response';
}

async function defaultPublishGatewayReply(
  settings: RuntimeSettings,
  input: PublishGatewayInput,
): Promise<PublishExecutionResult> {
  const normalizedMode = normalizePublishMode(settings.publisherMode);
  const publishedAt = new Date();
  const intent = buildGatewayPublishIntent(input);
  const { commentId, replyText } = resolveCommentReplyIntentParts(intent);

  if (normalizedMode === 'manual_queue') {
    return {
      published: true,
      reason: 'manual_queued',
      publishedAt,
      status: 'pending_review',
    };
  }

  if (normalizedMode === 'simulated') {
    return {
      published: true,
      reason: 'simulated',
      publishedAt,
      status: 'published',
    };
  }

  if (normalizedMode === 'webhook') {
    const webhookUrl = process.env.PUBLISHER_WEBHOOK_URL;
    const webhookToken = process.env.PUBLISHER_WEBHOOK_TOKEN;

    if (!webhookUrl) {
      return { published: false, reason: 'webhook_not_configured', status: 'failed' };
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(webhookToken ? { Authorization: `Bearer ${webhookToken}` } : {}),
        },
        body: JSON.stringify({
          comment_id: commentId,
          reply_text: replyText,
          force_publish: input.forcePublish,
          source: intent.source,
          trace_id: intent.traceId,
        }),
      });

      if (!response.ok) {
        return {
          published: false,
          reason: `webhook_http_${response.status}`,
          publishedAt,
          status: 'failed',
        };
      }

      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const resolvedPublishedAt =
        typeof payload.published_at === 'string' && payload.published_at ? new Date(payload.published_at) : publishedAt;

      return {
        published: payload.published !== false,
        reason: typeof payload.reason === 'string' && payload.reason ? payload.reason : 'webhook_published',
        publishedAt: resolvedPublishedAt,
        status: payload.published === false ? 'failed' : 'published',
      };
    } catch (error) {
      return {
        published: false,
        reason: error instanceof Error ? error.message : 'webhook_failed',
        publishedAt,
        status: 'failed',
      };
    }
  }

  if (normalizedMode === 'native_bilibili' || normalizedMode === 'real_publish') {
    if (!settings.bilibiliEnabled || !settings.bilibiliPublishEnabled) {
      return {
        published: false,
        reason: 'bilibili_not_configured',
        publishedAt,
        status: 'failed',
      };
    }

    let result: { success: boolean; rpid: string; error_code?: number; v_voucher?: string };
    try {
      result = await postReply(commentId, replyText);
    } catch (error) {
      return {
        published: false,
        reason: error instanceof Error ? error.message : 'publish_failed',
        publishedAt,
        status: 'failed',
      };
    }
    if (!result.success) {
      return {
        published: false,
        reason: result.error_code !== undefined ? `bilibili_error_${result.error_code}` : 'publish_failed',
        publishedAt,
        status: 'failed',
      };
    }

    return {
      published: true,
      reason: 'published',
      publishedAt,
      status: 'published',
    };
  }

  return {
    published: false,
    reason: 'not_configured',
    status: 'failed',
  };
}

async function defaultPublishPlatformReply(input: PublishPlatformInput): Promise<PublishExecutionResult> {
  const intent = buildPlatformPublishIntent(input);
  const { commentId, replyText, platform, canonicalId, route } = resolveCommentReplyIntentParts(intent);

  if (platform === 'bilibili') {
    return { published: false, reason: 'bilibili_reference_adapter_only', status: 'failed' };
  }

  const result = await publishViaSidecarWebhook({
    platform: input.platform,
    commentId,
    canonicalId,
    targetKind: intent.target.targetKind,
    route,
    replyText,
    forcePublish: input.forcePublish,
    traceId: input.traceId,
  });

  if (!result.published && result.reason === 'not_configured') {
    return {
      ...result,
      reason: 'sidecar_webhook_not_configured',
      status: 'failed',
    };
  }

  return {
    ...result,
    status: result.published ? 'published' : 'failed',
  };
}

function isMissingReservationKeyColumnError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const normalized = error.message.toLowerCase();
  return normalized.includes('no such column') && normalized.includes('reservation_key');
}

function createDurablePublishLogStore() {
  return {
    async reserve(input: PublishReservationInput): Promise<ReservePublishLogResult> {
      const prisma = getPrisma();
      let existing;
      try {
        existing = await prisma.publishLog.findUnique({
          where: {
            uq_publish_logs_canonical_reply: {
              canonical_comment_id: input.canonicalCommentId,
              reply_hash: input.replyHash,
            },
          },
          select: {
            id: true,
            reservation_key: true,
          },
        });
      } catch (error) {
        if (!isMissingReservationKeyColumnError(error)) {
          throw error;
        }
        existing = await prisma.publishLog.findFirst({
          where: {
            canonical_comment_id: input.canonicalCommentId,
            reply_hash: input.replyHash,
          },
          select: {
            id: true,
          },
        });
      }
      if (existing) {
        const existingWithReservationKey = existing as { id: number; reservation_key?: string | null };
        return {
          duplicate: true,
          reservationKey: existingWithReservationKey.reservation_key ?? `publish-log:${existing.id}`,
        };
      }

      const reservationKey = `publish-log:${randomUUID()}`;
      try {
        await prisma.publishLog.create({
          data: {
            platform: input.platform,
            reservation_key: reservationKey,
            canonical_comment_id: input.canonicalCommentId,
            comment_id: input.commentId,
            reply_hash: input.replyHash,
            source: input.source,
            status: 'pending',
            published_at: null,
            failure_reason: null,
          },
        });
      } catch (error) {
        const fallbackConflict = async () => {
          const conflict = await prisma.publishLog.findFirst({
            where: {
              canonical_comment_id: input.canonicalCommentId,
              reply_hash: input.replyHash,
            },
            select: { id: true },
          });
          if (conflict) {
            return {
              duplicate: true,
              reservationKey: `publish-log:${conflict.id}`,
            };
          }
          throw error;
        };

        if (isMissingReservationKeyColumnError(error)) {
          try {
            await prisma.publishLog.create({
              data: {
                platform: input.platform,
                canonical_comment_id: input.canonicalCommentId,
                comment_id: input.commentId,
                reply_hash: input.replyHash,
                source: input.source,
                status: 'pending',
                published_at: null,
                failure_reason: null,
              },
            });
            return { duplicate: false, reservationKey };
          } catch (retryError) {
            if (isMissingReservationKeyColumnError(retryError)) {
              return fallbackConflict();
            }
            throw retryError;
          }
        }

        const conflict = await prisma.publishLog.findUnique({
          where: {
            uq_publish_logs_canonical_reply: {
              canonical_comment_id: input.canonicalCommentId,
              reply_hash: input.replyHash,
            },
          },
          select: {
            id: true,
            reservation_key: true,
          },
        });
        if (conflict) {
          return {
            duplicate: true,
            reservationKey: conflict.reservation_key ?? `publish-log:${conflict.id}`,
          };
        }
        throw error;
      }

      return { duplicate: false, reservationKey };
    },
    async finalize(input: PublishFinalizeInput): Promise<void> {
      const prisma = getPrisma();
      try {
        await prisma.publishLog.updateMany({
          where: { reservation_key: input.reservationKey },
          data: {
            status: input.status,
            source: input.source,
            failure_reason: input.failureReason ?? null,
            published_at: input.publishedAt ?? null,
            reservation_key: null,
          },
        });
      } catch (error) {
        if (!isMissingReservationKeyColumnError(error)) {
          throw error;
        }
      }
    },
  };
}

function defaultCreateTraceId(preferred?: string): string {
  const normalized = String(preferred ?? '').trim();
  return normalized || randomUUID();
}

async function defaultAdminOverview(): Promise<Record<string, unknown>> {
  const prisma = getPrisma();
  const [totalComments, totalJobs, byStatusRows] = await Promise.all([
    prisma.comment.count(),
    prisma.replyJob.count(),
    prisma.replyJob.groupBy({
      by: ['status'],
      _count: {
        _all: true,
      },
    }),
  ]);

  const byStatus: Record<string, number> = {};
  for (const row of byStatusRows) {
    byStatus[row.status] = getGroupCount(row._count);
  }

  const totalPublished = byStatus.published ?? 0;
  const pendingReview = REVIEWABLE_JOB_STATUSES.reduce((sum, status) => sum + (byStatus[status] ?? 0), 0);
  const totalFailed = byStatus.failed ?? 0;

  return {
    generated_at: new Date().toISOString(),
    totals: {
      comments: totalComments,
      jobs: totalJobs,
      published: totalPublished,
      pending_review: pendingReview,
      failed: totalFailed,
    },
    by_status: byStatus,
    total_comments: totalComments,
    total_jobs: totalJobs,
    total_published: totalPublished,
    pending_review: pendingReview,
    total_failed: totalFailed,
  };
}

async function defaultAdminJobs(input: { status?: string; limit: number; offset: number }): Promise<AdminJobsResponse> {
  const prisma = getPrisma();
  const where = buildAdminJobStatusWhere(input.status);
  const [total, items] = await Promise.all([
    prisma.replyJob.count({ where }),
    prisma.replyJob.findMany({
      where,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      skip: input.offset,
      take: input.limit,
    }),
  ]);

  const commentIds = [
    ...new Set(items.map((item) => item.comment_id).filter((value): value is string => Boolean(value))),
  ];
  const canonicalCommentIds = [
    ...new Set(items.map((item) => item.canonical_comment_id).filter((value): value is string => Boolean(value))),
  ];
  const comments =
    commentIds.length === 0 && canonicalCommentIds.length === 0
      ? []
      : await prisma.comment.findMany({
          where: {
            OR: [
              ...(commentIds.length > 0 ? [{ comment_id: { in: commentIds } }] : []),
              ...(canonicalCommentIds.length > 0 ? [{ canonical_comment_id: { in: canonicalCommentIds } }] : []),
            ],
          },
        });

  const commentByCanonicalId = new Map(comments.map((item) => [item.canonical_comment_id, item]));
  const commentByCommentId = new Map(comments.map((item) => [item.comment_id, item]));

  return {
    items: items.map((item) => {
      const comment =
        (item.canonical_comment_id && commentByCanonicalId.get(item.canonical_comment_id)) ||
        commentByCommentId.get(item.comment_id);
      return {
        id: String(item.id),
        comment_id: item.comment_id,
        canonical_comment_id: item.canonical_comment_id,
        status: normalizeAdminJobStatus(item.status),
        raw_status: item.status,
        reply_text: item.reply_text,
        risk_flags: extractRiskFlagLabels(item.risk_flags),
        published_at: normalizeNullableIsoTimestamp(item.published_at),
        created_at: normalizeNullableIsoTimestamp(item.created_at),
        comment_text: comment?.content ?? null,
        comment_content: comment?.content ?? null,
      };
    }),
    total,
    limit: input.limit,
    offset: input.offset,
  };
}

async function defaultAdminGatewayLogs(input: {
  commentId?: string;
  limit: number;
}): Promise<AdminGatewayLogsResponse> {
  const prisma = getPrisma();
  const where: Record<string, unknown> = {};
  if (input.commentId) {
    where.comment_id = input.commentId;
  }

  const items = await prisma.publishLog.findMany({
    where,
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    take: input.limit,
  });
  const commentIds = [
    ...new Set(items.map((item) => item.comment_id).filter((value): value is string => Boolean(value))),
  ];
  const canonicalCommentIds = [
    ...new Set(items.map((item) => item.canonical_comment_id).filter((value): value is string => Boolean(value))),
  ];
  const jobs =
    commentIds.length === 0 && canonicalCommentIds.length === 0
      ? []
      : await prisma.replyJob.findMany({
          where: {
            OR: [
              ...(commentIds.length > 0 ? [{ comment_id: { in: commentIds } }] : []),
              ...(canonicalCommentIds.length > 0 ? [{ canonical_comment_id: { in: canonicalCommentIds } }] : []),
            ],
          },
          orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        });
  const jobByCanonicalId = new Map<string, (typeof jobs)[number]>();
  const jobByCommentId = new Map<string, (typeof jobs)[number]>();
  for (const job of jobs) {
    if (job.canonical_comment_id && !jobByCanonicalId.has(job.canonical_comment_id)) {
      jobByCanonicalId.set(job.canonical_comment_id, job);
    }
    if (job.comment_id && !jobByCommentId.has(job.comment_id)) {
      jobByCommentId.set(job.comment_id, job);
    }
  }

  return {
    items: items.map((item) => ({
      ...((item.canonical_comment_id && jobByCanonicalId.get(item.canonical_comment_id)) ||
      jobByCommentId.get(item.comment_id)
        ? {
            reply_text:
              (
                (item.canonical_comment_id && jobByCanonicalId.get(item.canonical_comment_id)) ||
                jobByCommentId.get(item.comment_id)
              )?.reply_text ?? null,
          }
        : {
            reply_text: null,
          }),
      id: item.id,
      platform: item.platform,
      canonical_comment_id: item.canonical_comment_id,
      comment_id: item.comment_id,
      reply_hash: item.reply_hash,
      source: item.source,
      status: item.status,
      published_at: normalizeNullableIsoTimestamp(item.published_at),
      failure_reason: item.failure_reason,
      created_at: normalizeNullableIsoTimestamp(item.created_at),
    })),
  };
}

async function defaultAdminAuditSummary(input: {
  days: number;
  action?: string;
  ok?: boolean;
}): Promise<AdminAuditSummaryResponse> {
  const prisma = getPrisma();
  const startUtc = new Date(Date.now() - input.days * 24 * 3600 * 1000);
  const where: Record<string, unknown> = { created_at: { gte: startUtc } };
  if (input.action) {
    where.action = input.action;
  }
  if (input.ok !== undefined) {
    where.ok = input.ok;
  }

  const items = await prisma.operationAuditLog.findMany({ where });
  const byAction: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const byResult = { ok: 0, failed: 0 };

  for (const item of items) {
    byAction[item.action] = (byAction[item.action] ?? 0) + 1;
    const payload = parseJsonRecord(item.payload);
    const statusValue = String(payload.status ?? '').trim();
    if (statusValue) {
      byStatus[statusValue] = (byStatus[statusValue] ?? 0) + 1;
    }
    if (item.ok) {
      byResult.ok++;
    } else {
      byResult.failed++;
    }
  }

  return {
    ok: true,
    days: input.days,
    total: items.length,
    ok_count: byResult.ok,
    failed_count: byResult.failed,
    totals: {
      audit_logs: items.length,
      ok: byResult.ok,
      failed: byResult.failed,
    },
    by_action: Object.fromEntries(Object.entries(byAction).sort()),
    by_status: Object.fromEntries(Object.entries(byStatus).sort()),
    by_result: byResult,
  };
}

async function defaultListKnowledgeEntries(input: {
  limit: number;
  offset: number;
}): Promise<{ ok: boolean; items: KnowledgeEntry[] }> {
  const prisma = getPrisma();
  const items = await prisma.knowledgeEntry.findMany({
    orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
    skip: input.offset,
    take: input.limit,
  });

  return {
    ok: true,
    items: items.map((item) => ({
      id: item.id,
      category: item.category,
      title: item.title,
      content: item.content,
      enabled: item.enabled,
      created_at: item.updated_at?.toISOString() ?? null,
      updated_at: item.updated_at?.toISOString() ?? null,
    })),
  };
}

async function defaultCreateKnowledgeEntry(input: {
  category: string;
  title: string;
  content: string;
}): Promise<{ ok: boolean; item: KnowledgeEntry }> {
  const prisma = getPrisma();
  const item = await prisma.knowledgeEntry.create({
    data: {
      category: input.category,
      title: input.title,
      content: input.content,
      enabled: true,
    },
  });

  return {
    ok: true,
    item: {
      id: item.id,
      category: item.category,
      title: item.title,
      content: item.content,
      enabled: item.enabled,
      created_at: item.updated_at?.toISOString() ?? null,
      updated_at: item.updated_at?.toISOString() ?? null,
    },
  };
}

async function defaultDisableKnowledgeEntry(input: {
  entryId: number;
}): Promise<{ ok: boolean; item: { id: number; enabled: boolean; updated_at: string | null } }> {
  const prisma = getPrisma();
  const item = await prisma.knowledgeEntry.update({
    where: { id: input.entryId },
    data: {
      enabled: false,
      updated_at: new Date(),
    },
  });

  return {
    ok: true,
    item: {
      id: item.id,
      enabled: item.enabled,
      updated_at: item.updated_at?.toISOString() ?? null,
    },
  };
}

function normalizeMemorySpaceRecord(record: {
  id: number;
  space_key: string;
  space_type: string;
  title: string;
  summary: string;
  created_at: Date | string | null | undefined;
  updated_at: Date | string | null | undefined;
}): MemorySpace {
  return {
    id: record.id,
    space_key: record.space_key,
    space_type: record.space_type,
    title: record.title,
    summary: record.summary,
    created_at: normalizeNullableIsoTimestamp(record.created_at),
    updated_at: normalizeNullableIsoTimestamp(record.updated_at),
  };
}

function normalizeMemoryGrantRecord(record: {
  id: number;
  space_id: number;
  subject_type: string;
  subject_id: string;
  access_level: string;
  created_at: Date | string | null | undefined;
  updated_at: Date | string | null | undefined;
}): MemoryGrant {
  return {
    id: record.id,
    space_id: record.space_id,
    subject_type: record.subject_type,
    subject_id: record.subject_id,
    access_level: record.access_level,
    created_at: normalizeNullableIsoTimestamp(record.created_at),
    updated_at: normalizeNullableIsoTimestamp(record.updated_at),
  };
}

function normalizeMemoryItemRecord(record: {
  id: number;
  space_id: number;
  item_key: string;
  content: string;
  content_type: string;
  source: string;
  item_metadata: Record<string, unknown>;
  created_at: Date | string | null | undefined;
  updated_at: Date | string | null | undefined;
}): MemoryItem {
  return {
    id: record.id,
    space_id: record.space_id,
    item_key: record.item_key,
    content: record.content,
    content_type: record.content_type,
    source: record.source,
    item_metadata: record.item_metadata,
    created_at: normalizeNullableIsoTimestamp(record.created_at),
    updated_at: normalizeNullableIsoTimestamp(record.updated_at),
  };
}

function normalizeIdentityLinkRecord(record: {
  id: number;
  subject_type: string;
  subject_id: string;
  platform: string;
  external_id: string;
  display_name: string | null;
  created_at: Date | string | null | undefined;
  updated_at: Date | string | null | undefined;
}): IdentityLink {
  return {
    id: record.id,
    subject_type: record.subject_type,
    subject_id: record.subject_id,
    platform: record.platform,
    external_id: record.external_id,
    display_name: record.display_name,
    created_at: normalizeNullableIsoTimestamp(record.created_at),
    updated_at: normalizeNullableIsoTimestamp(record.updated_at),
  };
}

async function defaultListMemorySpaces(input: {
  limit: number;
  offset: number;
  spaceType?: string;
  subjectType?: string;
  subjectId?: string;
}): Promise<{ ok: boolean; items: MemorySpace[] }> {
  const service = createMemoryService();
  const items =
    input.subjectType && input.subjectId
      ? await service.listAccessibleSpaces(input.subjectType, input.subjectId)
      : await service.listSpaces({ spaceType: input.spaceType });

  return {
    ok: true,
    items: items.slice(input.offset, input.offset + input.limit).map((item) => normalizeMemorySpaceRecord(item)),
  };
}

async function defaultCreateMemorySpace(input: {
  space_key: string;
  space_type?: string;
  title: string;
  summary?: string;
}): Promise<{ ok: boolean; item: MemorySpace }> {
  const service = createMemoryService();
  let item;
  try {
    item = await service.createSpace(input);
  } catch (error) {
    // ISS-002: admin create of @unique space_key — P2002 means operator resubmitted an
    // existing space_key. catch-as-conflict (NOT duplicate-success like publisher P3):
    // admin must be told "duplicate" via 409, not a silent idempotent ok.
    if (isPrismaP2002(error)) {
      throw new DuplicateKeyError('memory_space_duplicate');
    }
    throw error;
  }
  return {
    ok: true,
    item: normalizeMemorySpaceRecord(item),
  };
}

async function defaultListMemoryItems(input: {
  limit: number;
  offset: number;
  spaceId?: number;
  itemKey?: string;
  contentType?: string;
  source?: string;
}): Promise<{ ok: boolean; items: MemoryItem[] }> {
  const service = createMemoryService();
  const items = await service.listItems({
    spaceId: input.spaceId,
    itemKey: input.itemKey,
    contentType: input.contentType,
    source: input.source,
  });

  return {
    ok: true,
    items: items.slice(input.offset, input.offset + input.limit).map((item) => normalizeMemoryItemRecord(item)),
  };
}

async function defaultUpsertMemoryItem(input: {
  space_id: number;
  item_key: string;
  content: string;
  content_type?: string;
  source?: string;
  item_metadata?: Record<string, unknown>;
}): Promise<{ ok: boolean; item: MemoryItem }> {
  const service = createMemoryService();
  const item = await service.upsertItem(input);
  return {
    ok: true,
    item: normalizeMemoryItemRecord(item),
  };
}

async function defaultListMemoryGrants(input: {
  limit: number;
  offset: number;
  spaceId?: number;
  subjectType?: string;
  subjectId?: string;
}): Promise<{ ok: boolean; items: MemoryGrant[] }> {
  const service = createMemoryService();
  const items = await service.listGrants({
    spaceId: input.spaceId,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
  });

  return {
    ok: true,
    items: items.slice(input.offset, input.offset + input.limit).map((item) => normalizeMemoryGrantRecord(item)),
  };
}

async function defaultGrantMemorySpaceAccess(input: {
  space_id: number;
  subject_type: string;
  subject_id: string;
  access_level?: string;
}): Promise<{ ok: boolean; item: MemoryGrant }> {
  const service = createMemoryService();
  const item = await service.grantSpaceAccess(input);
  return {
    ok: true,
    item: normalizeMemoryGrantRecord(item),
  };
}

async function defaultListMemoryIdentityLinks(input: {
  limit: number;
  offset: number;
  subjectType?: string;
  subjectId?: string;
  platform?: string;
  externalId?: string;
}): Promise<{ ok: boolean; items: IdentityLink[] }> {
  const service = createMemoryService();
  const items = await service.listIdentityLinks({
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    platform: input.platform,
    externalId: input.externalId,
  });

  return {
    ok: true,
    items: items.slice(input.offset, input.offset + input.limit).map((item) => normalizeIdentityLinkRecord(item)),
  };
}

async function defaultLinkMemoryIdentity(input: {
  subject_type: string;
  subject_id: string;
  platform?: string;
  external_id: string;
  display_name?: string | null;
}): Promise<{ ok: boolean; item: IdentityLink }> {
  const service = createMemoryService();
  const item = await service.linkIdentity(input);
  return {
    ok: true,
    item: normalizeIdentityLinkRecord(item),
  };
}

function defaultGetStyleProfile(): { ok: boolean; style_profile: string; preset_profiles: string[] } {
  return {
    ok: true,
    style_profile: 'auto',
    preset_profiles: ['auto', 'empathy', 'meme', 'normal'],
  };
}

async function defaultSetStyleProfile(input: {
  styleProfile: string;
}): Promise<{ ok: boolean; style_profile: string }> {
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

async function defaultListRoleCards(input: {
  limit: number;
  offset: number;
}): Promise<{ ok: boolean; active_role_card_key: string | null; items: RoleCard[] }> {
  const prisma = getPrisma();
  const items = await prisma.roleCard.findMany({
    orderBy: [{ is_active: 'desc' }, { updated_at: 'desc' }, { id: 'desc' }],
    skip: input.offset,
    take: input.limit,
  });
  const normalizedItems = items.map((item) => normalizeRoleCardRecord(item as unknown as Record<string, unknown>));

  return {
    ok: true,
    active_role_card_key: normalizedItems.find((item) => item.is_active)?.key ?? null,
    items: normalizedItems,
  };
}

async function defaultCreateRoleCard(input: {
  key: string;
  name: string;
  description: string;
  system_prompt: string;
  tone: RoleCardValue;
  constraints: RoleCardValue;
  enabled: boolean;
}): Promise<{ ok: boolean; item: RoleCard }> {
  const prisma = getPrisma();
  let item;
  try {
    item = await prisma.roleCard.create({
      data: {
        key: input.key,
        name: input.name,
        description: input.description,
        system_prompt: input.system_prompt,
        tone: serializeRoleCardValue(input.tone),
        constraints: serializeRoleCardValue(input.constraints),
        enabled: input.enabled,
        is_active: false,
      },
    });
  } catch (error) {
    // ISS-002: admin create of @unique roleCard.key — P2002 = duplicate key resubmit.
    // catch-as-conflict → 409 (admin path, not publisher's duplicate-success).
    if (isPrismaP2002(error)) {
      throw new DuplicateKeyError('role_card_duplicate');
    }
    throw error;
  }

  return {
    ok: true,
    item: normalizeRoleCardRecord(item as unknown as Record<string, unknown>),
  };
}

async function defaultUpdateRoleCard(input: {
  cardKey: string;
  name?: string;
  description?: string;
  system_prompt?: string;
  tone?: RoleCardValue;
  constraints?: RoleCardValue;
  enabled?: boolean;
}): Promise<{ ok: boolean; item: RoleCard }> {
  const prisma = getPrisma();
  const data: Record<string, unknown> = {
    updated_at: new Date(),
  };

  if (input.name !== undefined) {
    data.name = input.name;
  }
  if (input.description !== undefined) {
    data.description = input.description;
  }
  if (input.system_prompt !== undefined) {
    data.system_prompt = input.system_prompt;
  }
  if (input.tone !== undefined) {
    data.tone = serializeRoleCardValue(input.tone);
  }
  if (input.constraints !== undefined) {
    data.constraints = serializeRoleCardValue(input.constraints);
  }
  if (input.enabled !== undefined) {
    data.enabled = input.enabled;
  }

  const item = await prisma.roleCard.update({
    where: { key: input.cardKey },
    data,
  });

  return {
    ok: true,
    item: normalizeRoleCardRecord(item as unknown as Record<string, unknown>),
  };
}

async function defaultDisableRoleCard(input: {
  cardKey: string;
}): Promise<{ ok: boolean; item: { key: string; enabled: boolean; is_active: boolean; updated_at: string | null } }> {
  const prisma = getPrisma();
  const item = await prisma.roleCard.update({
    where: { key: input.cardKey },
    data: {
      enabled: false,
      is_active: false,
      updated_at: new Date(),
    },
  });

  return {
    ok: true,
    item: {
      key: item.key,
      enabled: item.enabled,
      is_active: item.is_active,
      updated_at: normalizeNullableIsoTimestamp(item.updated_at),
    },
  };
}

async function defaultActivateRoleCard(input: {
  cardKey: string;
}): Promise<{ ok: boolean; active_role_card_key: string }> {
  const prisma = getPrisma();
  await prisma.roleCard.updateMany({
    data: {
      is_active: false,
    },
  });
  const item = await prisma.roleCard.update({
    where: { key: input.cardKey },
    data: {
      enabled: true,
      is_active: true,
      updated_at: new Date(),
    },
  });

  return {
    ok: true,
    active_role_card_key: item.key,
  };
}

async function defaultGetObservabilitySummary(input: { windowMinutes: number }): Promise<{
  ok: boolean;
  summary: Record<string, unknown>;
}> {
  // G-002 / coding spec: online eval groupBy antirisk signal subclass.
  // Aggregates backoff_applied events (and antirisk_signal_detected) by error_subclass
  // so behavior_anomaly (-352) and rate_limit (-429) can be counted separately.
  const windowMs = Math.max(1, input.windowMinutes) * 60 * 1000;
  const since = new Date(Date.now() - windowMs);
  const prisma = getPrisma();
  const [bySubclassRows, dropCount] = await Promise.all([
    prisma.observabilityEvent.groupBy({
      by: ['error_subclass'],
      where: {
        created_at: { gte: since },
        event_type: { in: ['backoff_applied', 'antirisk_signal_detected'] },
        error_subclass: { not: null },
      },
      _count: { _all: true },
    }),
    Promise.resolve(getObservabilityDropCount()),
  ]);

  const byErrorSubclass: Record<string, number> = {};
  for (const row of bySubclassRows) {
    const key = row.error_subclass;
    if (key) {
      byErrorSubclass[key] = getGroupCount(row._count);
    }
  }

  return {
    ok: true,
    summary: {
      window_minutes: input.windowMinutes,
      by_error_subclass: byErrorSubclass,
      observability_drop_count: dropCount,
    },
  };
}

// TASK-007: readiness antirisk signal derivations. These count ObservabilityEvent /
// PublishLog rows over rolling windows to drive the backoff_active_rate and
// passive_response_violation_count readiness gates. Each is awaitable from the
// readiness route; on DB error they resolve false (fail-open) so a transient DB blip
// does not flip the gate red without evidence — the drop_count gate (fail-closed on
// the in-memory counter) covers the DB-down case separately.

// backoff_active_rate threshold (0.3): when >30% of publish attempts in the last
// 600s hit a -352/-429 (backoff_applied), the gate flips red.
const BACKOFF_ACTIVE_RATE_THRESHOLD = 0.3;
// backoff window (600s) matches the behavior_anomaly cap so the rate reflects the
// full backoff-pressure window, not just the last minute.
const BACKOFF_ACTIVE_RATE_WINDOW_SECONDS = 600;

async function defaultIsBackoffActiveRateExceeded(): Promise<boolean> {
  const prisma = getPrisma();
  const since = new Date(Date.now() - BACKOFF_ACTIVE_RATE_WINDOW_SECONDS * 1000);
  try {
    const [backoffAppliedCount, publishIntentCount] = await Promise.all([
      prisma.observabilityEvent.count({
        where: { event_type: 'backoff_applied', created_at: { gte: since } },
      }),
      // BUG-002: filter the denominator to delivery-attempted statuses only. Counting ALL
      // publishLog rows (incl. manual_queue 'pending_review') dilutes the rate: manual_queue
      // rows never hit the Bilibili API so they can't contribute to backoff_applied, yet they
      // inflate the denominator within the 600s window and mask real -352 pressure as green
      // (e.g. 100 manual + 10 real attempts, 4 backoff → 0.036 < 0.3 false green).
      prisma.publishLog.count({
        where: { created_at: { gte: since }, status: { in: ['published', 'failed'] } },
      }),
    ]);
    // No publish attempts in the window -> no rate to exceed (fail-open, avoids div-by-zero).
    if (publishIntentCount === 0) return false;
    const rate = backoffAppliedCount / publishIntentCount;
    return rate >= BACKOFF_ACTIVE_RATE_THRESHOLD;
  } catch (error) {
    // BUG-003: fail-closed on DB query error. The generic SELECT 1 ping (foundation gate)
    // can pass while these observability/publishLog queries fail (schema drift, row lock,
    // query timeout) — treating that as "no antirisk pressure" (green) masks real -352/-429
    // pressure. Mirror defaultIsBehaviorAnomalyCountZero: a query-level failure MUST flip red.
    console.warn(
      JSON.stringify({
        level: 'warn',
        message: 'backoff_active_rate_derivation_failed',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }),
    );
    // observability fix: readiness-gate DB 查询失败翻红 (fail-closed true) 但仅 console.warn 镜像,
    // 无 ObservabilityEvent — 运营无法从统一 observability 流追踪门控翻红原因. 补 fire-and-forget
    // event (readiness-red-without-event 反模式, H9 pattern). 非阻塞, 不影响 fail-closed 返回值.
    void recordObservabilityEvent({
      event_type: 'readiness_gate_error',
      trace_id: ensureTraceId(),
      status: 'failed',
      metadata: {
        gate: 'backoff_active_rate',
        error: error instanceof Error ? error.message : String(error),
      },
    }).catch((err: unknown) => {
      console.warn(
        JSON.stringify({
          level: 'warn',
          message: 'readiness_gate_error_event_record_failed',
          gate: 'backoff_active_rate',
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    });
    return true;
  }
}

// passive_response_gate reject-count threshold (10): when the C-layer rejects more
// than 10 comments in the window, the gate flips red.
const PASSIVE_RESPONSE_VIOLATION_THRESHOLD = 10;
// Window matches the readiness probe cadence (last 10 min of passive-response activity).
const PASSIVE_RESPONSE_VIOLATION_WINDOW_SECONDS = 600;

async function defaultIsPassiveResponseViolationExceeded(): Promise<boolean> {
  const prisma = getPrisma();
  const since = new Date(Date.now() - PASSIVE_RESPONSE_VIOLATION_WINDOW_SECONDS * 1000);
  try {
    const rejectedCount = await prisma.observabilityEvent.count({
      where: {
        event_type: 'passive_response_gate',
        status: 'rejected',
        created_at: { gte: since },
      },
    });
    return rejectedCount >= PASSIVE_RESPONSE_VIOLATION_THRESHOLD;
  } catch (error) {
    // BUG-003: fail-closed on DB query error (mirrors backoff_active_rate + behavior_anomaly).
    console.warn(
      JSON.stringify({
        level: 'warn',
        message: 'passive_response_violation_derivation_failed',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }),
    );
    void recordObservabilityEvent({
      event_type: 'readiness_gate_error',
      trace_id: ensureTraceId(),
      status: 'failed',
      metadata: {
        gate: 'passive_response_violation',
        error: error instanceof Error ? error.message : String(error),
      },
    }).catch((err: unknown) => {
      console.warn(
        JSON.stringify({
          level: 'warn',
          message: 'readiness_gate_error_event_record_failed',
          gate: 'passive_response_violation',
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    });
    return true;
  }
}

// TASK-003/P3 SC4 gate: behavior_anomaly count within the rolling window MUST be zero.
// -352 behavior_anomaly is the high-severity subclass (cap 600s backoff). Any occurrence
// in the window blocks full real_publish. Queries ObservabilityEvent rows where
// event_type IN ['backoff_applied','antirisk_signal_detected'] AND error_subclass=
// 'behavior_anomaly' AND created_at >= now - BEHAVIOR_ANOMALY_WINDOW_SECONDS*1000.
// Fail-closed (returns false on DB error): SC4 is the hard full real_publish barrier,
// so a DB blip must NOT be assumed safe — unlike the backoff_active_rate /
// passive_response_violation gates which are soft signals (fail-open). The window
// default (86400s / 24h) is a conservative placeholder tunable by SME DD-03.
const BEHAVIOR_ANOMALY_WINDOW_SECONDS = Number.parseInt(process.env.BEHAVIOR_ANOMALY_WINDOW_SECONDS ?? '', 10) || 86400;

async function defaultIsBehaviorAnomalyCountZero(): Promise<boolean> {
  const prisma = getPrisma();
  const since = new Date(Date.now() - BEHAVIOR_ANOMALY_WINDOW_SECONDS * 1000);
  try {
    const count = await prisma.observabilityEvent.count({
      where: {
        event_type: { in: ['backoff_applied', 'antirisk_signal_detected'] },
        error_subclass: 'behavior_anomaly',
        created_at: { gte: since },
      },
    });
    return count === 0;
  } catch (error) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        message: 'behavior_anomaly_count_query_failed',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }),
    );
    // observability fix: SC4 硬门 (real_publish barrier) DB 查询失败翻红 (fail-closed false) 但无
    // ObservabilityEvent — 最严重遗漏: DB blip 翻红阻止 real_publish 但运营无法从 observability 流
    // 追踪原因. 补 fire-and-forget event (readiness-red-without-event 反模式, H9 pattern).
    void recordObservabilityEvent({
      event_type: 'readiness_gate_error',
      trace_id: ensureTraceId(),
      status: 'failed',
      metadata: {
        gate: 'behavior_anomaly_count',
        error: error instanceof Error ? error.message : String(error),
      },
    }).catch((err: unknown) => {
      console.warn(
        JSON.stringify({
          level: 'warn',
          message: 'readiness_gate_error_event_record_failed',
          gate: 'behavior_anomaly_count',
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    });
    return false;
  }
}

// TASK-002/D1 gate: reply-visibility shadowbanned verdict count within the rolling window.
// A confirmed shadowbanned publish (ObservabilityEvent event_type='reply_visibility_check'
// AND error_subclass='shadowban') means the platform is silently swallowing replies — a
// sustained封号-grade signal. Fail-closed (returns false on ANY shadowbanned event in the
// window OR on DB error): mirrors isBehaviorAnomalyCountZero — a DB blip must NOT be assumed
// safe. probe_failed verdicts are NOT counted here (they record no antirisk signal, C-004
// fail-open), so a transient probe glitch cannot flip this red.
const REPLY_VISIBILITY_WINDOW_SECONDS = Number.parseInt(process.env.REPLY_VISIBILITY_WINDOW_SECONDS ?? '', 10) || 86400;

async function defaultIsReplyVisibilityHealthy(): Promise<boolean> {
  const prisma = getPrisma();
  const since = new Date(Date.now() - REPLY_VISIBILITY_WINDOW_SECONDS * 1000);
  try {
    const count = await prisma.observabilityEvent.count({
      where: {
        event_type: 'reply_visibility_check',
        error_subclass: 'shadowban',
        created_at: { gte: since },
      },
    });
    return count === 0;
  } catch (error) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        message: 'reply_visibility_count_query_failed',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }),
    );
    // observability fix: reply_visibility gate DB 查询失败翻红 (fail-closed false) 但无 ObservabilityEvent
    // (readiness-red-without-event 反模式, H9 pattern). 注意: 此处 message 名与 publisher.ts 已修的
    // 'reply_visibility_check' record_failed 不同 — 此处是 isReplyVisibilityHealthy 门控 DB 查询 catch
    // (翻红 reply_visibility gate), publisher.ts:783 是发布侧探针记录失败. 补 fire-and-forget event.
    void recordObservabilityEvent({
      event_type: 'readiness_gate_error',
      trace_id: ensureTraceId(),
      status: 'failed',
      metadata: {
        gate: 'reply_visibility_count',
        error: error instanceof Error ? error.message : String(error),
      },
    }).catch((err: unknown) => {
      console.warn(
        JSON.stringify({
          level: 'warn',
          message: 'readiness_gate_error_event_record_failed',
          gate: 'reply_visibility_count',
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    });
    return false;
  }
}

async function defaultGetBilibiliStatus(input: {
  settings: RuntimeSettings;
  buildBilibiliDiagnostics: () => Promise<BilibiliDiagnostics> | BilibiliDiagnostics;
}): Promise<{
  ok: boolean;
  config: Record<string, unknown>;
  credential: Record<string, unknown> | null;
  videos: Record<string, unknown>;
  diagnostics: Record<string, unknown>;
}> {
  const prisma = getPrisma();
  const [credential, totalVideos, pollEnabledCount, diagnostics] = await Promise.all([
    prisma.bilibiliCredential.findFirst({
      where: { is_active: true },
      orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
    }),
    prisma.bilibiliVideo.count({}),
    prisma.bilibiliVideo.count({ where: { poll_enabled: true } }),
    input.buildBilibiliDiagnostics(),
  ]);

  return {
    ok: true,
    config: {
      enabled: input.settings.bilibiliEnabled,
      poll_enabled: input.settings.bilibiliPollEnabled,
      publish_enabled: input.settings.bilibiliPublishEnabled,
      poll_interval_seconds: input.settings.bilibiliPollIntervalSeconds,
      rate_limit_per_minute: 60,
    },
    credential: credential
      ? {
          id: credential.id,
          name: credential.name,
          is_active: credential.is_active,
          expires_at: credential.expires_at?.toISOString() ?? null,
          last_used_at: credential.last_used_at?.toISOString() ?? null,
          created_at: credential.created_at?.toISOString() ?? null,
          updated_at: credential.updated_at?.toISOString() ?? null,
        }
      : null,
    videos: {
      total: totalVideos,
      video_count: totalVideos,
      poll_enabled_count: pollEnabledCount,
    },
    diagnostics,
  };
}

async function defaultListBilibiliVideos(input: {
  pollEnabled?: boolean;
  limit: number;
  offset: number;
}): Promise<{ ok: boolean; total: number; items: BilibiliVideo[] }> {
  const prisma = getPrisma();
  const where = input.pollEnabled === undefined ? {} : { poll_enabled: input.pollEnabled };
  const [total, items] = await Promise.all([
    prisma.bilibiliVideo.count({ where }),
    prisma.bilibiliVideo.findMany({
      where,
      orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
      skip: input.offset,
      take: input.limit,
    }),
  ]);
  const bvids = items.map((item) => item.bvid).filter((value): value is string => Boolean(value));
  const comments =
    bvids.length === 0
      ? []
      : await prisma.comment.findMany({
          where: { video_id: { in: bvids } },
          select: { video_id: true },
        });
  const commentCounts = new Map<string, number>();
  for (const comment of comments) {
    const videoId = String(comment.video_id ?? '');
    if (!videoId) {
      continue;
    }
    commentCounts.set(videoId, (commentCounts.get(videoId) ?? 0) + 1);
  }

  return {
    ok: true,
    total,
    items: items.map((item) =>
      normalizeBilibiliVideoRecord(item as unknown as Record<string, unknown>, {
        commentCount: commentCounts.get(item.bvid) ?? 0,
      }),
    ),
  };
}

async function defaultAddBilibiliVideo(input: {
  bvid: string;
  pollEnabled?: boolean;
}): Promise<{ ok: boolean; item: BilibiliVideo }> {
  const prisma = getPrisma();
  let item;
  try {
    item = await prisma.bilibiliVideo.create({
      data: {
        bvid: input.bvid,
        poll_enabled: input.pollEnabled ?? true,
      },
    });
  } catch (error) {
    // ISS-002: admin create of @unique bilibiliVideo.bvid — P2002 = duplicate bvid resubmit.
    // catch-as-conflict → 409 (admin path, not publisher's duplicate-success).
    if (isPrismaP2002(error)) {
      throw new DuplicateKeyError('bilibili_video_duplicate');
    }
    throw error;
  }

  return {
    ok: true,
    item: normalizeBilibiliVideoRecord(item as unknown as Record<string, unknown>),
  };
}

export function buildDegradedCompanionState(reason?: string): CompanionState {
  return {
    petName: 'Mochi',
    statusLine: 'Companion runtime is degraded and waiting for the next backend sync.',
    loopMode: 'Backend companion degraded',
    lastCheckIn: 'Pending',
    adapterLabel: 'Backend degraded runtime',
    loopHint: 'The backend companion endpoint is serving a degraded runtime view until persisted signals recover.',
    mood: {
      label: 'Curious',
      note: reason
        ? `Companion endpoint degraded gracefully: ${reason}.`
        : 'Waiting for the next backend companion update.',
    },
    memoryTitle: 'Short-term memory',
    memorySummary: 'Persisted companion memory is temporarily unavailable.',
    vitals: [
      { label: 'Spaces', value: '0' },
      { label: 'Grants', value: '0' },
      { label: 'Links', value: '0' },
      { label: 'Mode', value: 'Degraded' },
    ],
    recentSignals: ['Companion state is serving a degraded backend view.'],
    recentInteractions: [
      {
        kind: 'signal',
        title: 'Runtime degraded',
        detail: reason
          ? `Companion endpoint degraded gracefully: ${reason}.`
          : 'Companion state is serving a degraded backend view.',
        timestamp: 'Pending',
        source: 'Backend degraded',
      },
    ],
  };
}

async function defaultGetCompanionState(): Promise<CompanionState> {
  try {
    const petCoreService = createPetCoreService();
    const petCoreState = await petCoreService.getCompanionState();
    if (petCoreState) {
      return petCoreState;
    }
  } catch {
    // Fall through to the legacy memory-derived projection until pet-core persistence is available.
  }

  try {
    const service = createMemoryService();
    const [spaces, items, grants, links] = await Promise.all([
      service.listSpaces(),
      service.listItems(),
      service.listGrants(),
      service.listIdentityLinks(),
    ]);

    const latestTimestamp = [spaces, items, grants, links]
      .flat()
      .map((item) => item.updated_at)
      .filter((value): value is Date => value instanceof Date)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    const companionSpace = spaces.find((space) => space.space_key === COMPANION_SYSTEM_SPACE_KEY);
    const companionItems = companionSpace ? items.filter((item) => item.space_id === companionSpace.id) : [];
    const timelineSourceItems = companionItems.filter((item) => item.item_metadata?.entry_mode !== 'latest');
    const recentSpaceTitles = spaces
      .slice(0, 3)
      .map((space) => space.title)
      .filter(Boolean);
    // BUG-002 (security/data-leak): GET /companion/state is intentionally unauthenticated (it
    // feeds the frontend companion surface), so it MUST NOT surface user-identifying PII.
    // external_id (e.g. Bilibili mid) from identity links and raw memory-item content are
    // PII — replace them with aggregate counts only. Pet interaction narrative
    // (recentCompanionItems via buildCompanionInteraction) is curated content, not PII.
    const identityLinkCount = links.length;
    const recentItemCount = items.length;
    const recentCompanionItems = (timelineSourceItems.length > 0 ? timelineSourceItems : companionItems).slice(0, 4);
    const recentCompanionSummaries = recentCompanionItems.map((item) => {
      const interaction = buildCompanionInteraction(item);
      return `${interaction.title}: ${interaction.detail.slice(0, 48)}`;
    });
    const hasMemory = spaces.length > 0 || items.length > 0 || grants.length > 0 || links.length > 0;
    const recentInteractions: CompanionInteraction[] =
      recentCompanionItems.length > 0
        ? recentCompanionItems.map((item) => buildCompanionInteraction(item))
        : [
            {
              kind: 'signal',
              title: hasMemory ? 'Companion feed pending' : 'No companion interactions yet',
              detail: hasMemory
                ? 'Persisted memory exists, but no companion-specific feed items have been written yet.'
                : 'Trigger a companion action or write a feed signal to populate this timeline.',
              timestamp: latestTimestamp ? normalizeIsoTimestamp(latestTimestamp) : 'Pending',
              source: 'Memory',
            },
          ];

    return {
      petName: 'Mochi',
      statusLine: hasMemory
        ? `Tracking ${spaces.length} spaces, ${items.length} items, ${grants.length} grants, and ${links.length} linked identities.`
        : 'Waiting for the first persisted companion memory signal.',
      loopMode: 'Backend memory companion',
      lastCheckIn: latestTimestamp ? normalizeIsoTimestamp(latestTimestamp) : 'Pending',
      adapterLabel: 'Backend memory endpoint',
      loopHint: hasMemory
        ? 'This companion state is synthesized from the backend memory management surfaces.'
        : 'Create spaces, grants, or identity links in the admin memory page to enrich this view.',
      mood: {
        label: hasMemory ? 'Attentive' : 'Settling',
        note: hasMemory
          ? 'The companion is reading persisted management data and reflecting the latest memory signals.'
          : 'No persisted memory records exist yet, so the companion stays in a low-signal state.',
      },
      memoryTitle: hasMemory ? 'Persisted memory summary' : 'Memory bootstrap',
      memorySummary:
        recentCompanionSummaries.length > 0
          ? recentCompanionSummaries.join(' | ')
          : items.length > 0
            ? `${recentItemCount} persisted memory item${recentItemCount === 1 ? '' : 's'}.`
            : hasMemory
              ? `Known spaces: ${recentSpaceTitles.join(', ') || 'untitled'}.`
              : 'Persisted memory has not been populated yet.',
      vitals: [
        { label: 'Spaces', value: String(spaces.length) },
        { label: 'Items', value: String(items.length) },
        { label: 'Grants', value: String(grants.length) },
        { label: 'Links', value: String(links.length) },
        { label: 'Feed', value: companionItems.length > 0 ? `${companionItems.length} signals` : 'Quiet' },
        { label: 'Focus', value: items.length > 0 ? 'Active memory' : hasMemory ? 'Persisted' : 'Bootstrap' },
      ],
      recentSignals: [
        hasMemory
          ? 'Latest signal timestamps are sourced from persisted memory updates.'
          : 'No memory signals available yet.',
        recentCompanionSummaries.length > 0
          ? `Recent companion feed: ${recentCompanionSummaries.join(' | ')}`
          : 'No companion feed items yet.',
        recentItemCount > 0
          ? `${recentItemCount} persisted memory item${recentItemCount === 1 ? '' : 's'}.`
          : 'No recent items.',
        recentSpaceTitles.length > 0 ? `Recent spaces: ${recentSpaceTitles.join(', ')}` : 'No recent spaces.',
        identityLinkCount > 0
          ? `${identityLinkCount} linked identit${identityLinkCount === 1 ? 'y' : 'ies'}.`
          : 'No linked identities.',
      ],
      recentInteractions,
    };
  } catch (error) {
    return buildDegradedCompanionState(error instanceof Error ? error.message : 'unknown_backend_error');
  }
}

function buildCompanionStateV2FromLegacy(companion: CompanionState): CompanionStateV2 {
  return {
    version: 'v2',
    snapshot: {
      profile: {
        petName: companion.petName,
      },
      relationship: {
        level: companion.mood.label,
        note: companion.mood.note,
      },
      progress: {
        stage: companion.loopMode,
        progressLabel: companion.statusLine,
        nextMilestone: null,
      },
      needs: companion.vitals.map((entry) => ({
        key: entry.label.trim().toLowerCase().replace(/\s+/g, '-'),
        label: entry.label,
        value: entry.value,
      })),
      proactiveSignals: companion.recentSignals.slice(0, 3).map((detail, index) => ({
        key: `legacy-signal-${index + 1}`,
        label: 'Legacy signal',
        detail,
        dueAt: null,
      })),
    },
    companion,
  };
}

async function defaultGetCompanionStateV2(): Promise<CompanionStateV2> {
  try {
    const petCoreService = createPetCoreService();
    const state = await petCoreService.getCompanionStateV2({ bootstrap: true });
    if (state) {
      return state;
    }
  } catch {
    // Fall back to the legacy companion response shape wrapped in a v2 envelope.
  }

  const companion = await defaultGetCompanionState();
  return buildCompanionStateV2FromLegacy(companion);
}

async function defaultRecordCompanionAction(input: {
  action: PetActionName;
  note?: string;
}): Promise<{ ok: boolean; action: string; item_key: string }> {
  const actionMessages: Record<PetActionName, string> = {
    pat: 'A gentle pat settled Mochi and raised the bond signal.',
    feed: 'A quick snack topped up Mochi and eased the hunger signal.',
    wake: 'A bright nudge woke Mochi up for the next interaction window.',
  };

  const actionAt = new Date();
  const latestItemKey = `action:${input.action}-latest`;
  const historyItemKey = `action:${input.action}:${actionAt.toISOString()}`;
  const content = input.note ? `${actionMessages[input.action]} Note: ${input.note}` : actionMessages[input.action];
  const metadata = {
    action: input.action,
    note: input.note ?? null,
    action_at: actionAt.toISOString(),
  };
  const service = createMemoryService();

  await Promise.all([
    upsertCompanionFeedItem(
      {
        itemKey: latestItemKey,
        content,
        source: 'companion_action',
        metadata: {
          ...metadata,
          entry_mode: 'latest',
        },
      },
      service,
    ),
    upsertCompanionFeedItem(
      {
        itemKey: historyItemKey,
        content,
        contentType: 'companion_event',
        source: 'companion_action',
        metadata: {
          ...metadata,
          entry_mode: 'history',
        },
      },
      service,
    ),
  ]);

  try {
    const petCoreService = createPetCoreService();
    await petCoreService.recordAction(input);
  } catch (error) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        message: 'pet_core_action_persist_failed',
        action: input.action,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }

  return {
    ok: true,
    action: input.action,
    item_key: latestItemKey,
  };
}

function defaultDependencies(): ServerDependencies {
  return buildDefaultServerDependencies({
    buildSettings: buildDefaultSettings,
    createLogStore: createDurablePublishLogStore,
    checkDatabaseConnection: defaultCheckDatabaseConnection,
    checkRedisConnection: defaultCheckRedisConnection,
    probeBilibiliAuth: probeBilibiliRuntimeAuth,
    buildBilibiliDiagnostics: (settings, probeBilibiliAuth) => defaultBilibiliDiagnostics(settings, probeBilibiliAuth),
    verifyPayloadSignature: defaultVerifyPayloadSignature,
    normalizePublishFailureReason: defaultNormalizePublishFailureReason,
    isPlatformEnabled: defaultIsPlatformEnabled,
    getPlatformPublishSource: defaultGetPlatformPublishSource,
    createTraceId: defaultCreateTraceId,
    getAdminOverview: defaultAdminOverview,
    listAdminJobs: defaultAdminJobs,
    listAdminGatewayLogs: defaultAdminGatewayLogs,
    summarizeAdminAuditLogs: defaultAdminAuditSummary,
    listKnowledgeEntries: defaultListKnowledgeEntries,
    createKnowledgeEntry: defaultCreateKnowledgeEntry,
    disableKnowledgeEntry: defaultDisableKnowledgeEntry,
    listMemorySpaces: defaultListMemorySpaces,
    createMemorySpace: defaultCreateMemorySpace,
    listMemoryItems: defaultListMemoryItems,
    upsertMemoryItem: defaultUpsertMemoryItem,
    listMemoryGrants: defaultListMemoryGrants,
    grantMemorySpaceAccess: defaultGrantMemorySpaceAccess,
    listMemoryIdentityLinks: defaultListMemoryIdentityLinks,
    linkMemoryIdentity: defaultLinkMemoryIdentity,
    getStyleProfile: defaultGetStyleProfile,
    setStyleProfile: defaultSetStyleProfile,
    getRoleProfile: defaultGetRoleProfile,
    setRoleProfile: defaultSetRoleProfile,
    listRoleCards: defaultListRoleCards,
    createRoleCard: defaultCreateRoleCard,
    updateRoleCard: defaultUpdateRoleCard,
    disableRoleCard: defaultDisableRoleCard,
    activateRoleCard: defaultActivateRoleCard,
    getObservabilitySummary: defaultGetObservabilitySummary,
    ingestCommentEvent: defaultIngestCommentEvent,
    retryJob: defaultRetryJob,
    approveJob: defaultApproveJob,
    approveJobsBatch: defaultApproveJobsBatch,
    retryJobsBatch: defaultRetryJobsBatch,
    getComment: defaultGetComment,
    getJob: defaultGetJob,
    listJobs: defaultListJobs,
    exportJobsCsv: defaultExportJobsCsv,
    getBilibiliStatus: defaultGetBilibiliStatus,
    listBilibiliVideos: defaultListBilibiliVideos,
    addBilibiliVideo: defaultAddBilibiliVideo,
    getCompanionState: defaultGetCompanionState,
    getCompanionStateV2: defaultGetCompanionStateV2,
    recordCompanionAction: defaultRecordCompanionAction,
    listPlatformConnections: defaultListPlatformConnections,
    updatePlatformConnectionControl: defaultUpdatePlatformConnectionControl,
  });
}

function defaultListPlatformConnections(settings: RuntimeSettings): {
  ok: boolean;
  items: PlatformConnectionSnapshot[];
} {
  return {
    ok: true,
    items: listPlatformAdapters().map((adapter) => {
      const enabled = defaultIsPlatformEnabled(adapter.platform, settings);
      const supportsPolling = adapter.platform === 'bilibili';
      const pollingRuntime = adapter.resolvePollingRuntime(process.env);
      const control = getPlatformControlState(adapter.platform);
      const platformEnvPrefix = `PLATFORM_${adapter.platform.toUpperCase()}`;
      const sidecarWebhookConfigured =
        adapter.platform === 'bilibili' ? true : hasText(process.env[`${platformEnvPrefix}_WEBHOOK_URL`]);
      const status = !enabled
        ? 'disconnected'
        : adapter.platform === 'bilibili'
          ? settings.bilibiliEnabled
            ? 'connected'
            : 'degraded'
          : sidecarWebhookConfigured
            ? 'connected'
            : 'degraded';
      const lastError =
        status === 'degraded'
          ? adapter.platform === 'bilibili'
            ? 'runtime platform enabled but Bilibili runtime toggle is off'
            : 'sidecar webhook is not configured'
          : null;
      const publishCapabilityStatus = status === 'degraded' ? 'partial' : 'available';
      const publishCapabilityNote =
        adapter.platform === 'bilibili'
          ? adapter.resolvePublishSource(settings)
          : sidecarWebhookConfigured
            ? `${adapter.resolvePublishSource(settings)} via sidecar webhook`
            : `${adapter.resolvePublishSource(settings)} requires PLATFORM_${adapter.platform.toUpperCase()}_WEBHOOK_URL`;

      return {
        platform: adapter.platform,
        enabled,
        adapterKey: adapter.adapterKey,
        status,
        lastCheckedAt: null,
        lastError,
        rolloutControl: control
          ? {
              enabled: control.enabled,
              stage: control.stage,
              updatedAt: control.updatedAt,
            }
          : {
              enabled,
              stage: enabled ? 'trial' : 'paused',
              updatedAt: null,
            },
        capabilities: [
          {
            key: 'ingress',
            status: 'available',
            note: adapter.ingressRoutes.map((entry) => entry.path).join(', '),
          },
          {
            key: 'publish',
            status: publishCapabilityStatus,
            note: publishCapabilityNote,
          },
          {
            key: 'identity_binding',
            status: 'available',
          },
          {
            key: 'connection_health',
            status: 'available',
          },
          {
            key: 'polling',
            status: supportsPolling ? (pollingRuntime.enabled ? 'available' : 'partial') : 'planned',
            note: supportsPolling
              ? `${pollingRuntime.intervalSeconds}s interval`
              : 'No worker polling configured for this platform yet',
          },
        ],
      };
    }),
  };
}

function defaultUpdatePlatformConnectionControl(
  settings: RuntimeSettings,
  input: { platform: PlatformName; enabled: boolean },
): { ok: boolean; item: PlatformConnectionSnapshot } {
  const adapter = resolvePlatformAdapter(input.platform);
  const baseEnabled = adapter.isEnabled(settings);
  if (!baseEnabled && input.enabled) {
    throw new Error('platform_not_configured');
  }

  setPlatformControlState(input.platform, { enabled: input.enabled });
  const item = defaultListPlatformConnections(settings).items.find(
    (entry) => entry.platform === input.platform,
  ) as PlatformConnectionSnapshot;
  return { ok: true, item };
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

const { enqueueCommentEventJob, ingestCommentEvent: defaultIngestCommentEvent } = createCommentIngestHelpers({
  getPrisma,
  createTraceId: defaultCreateTraceId,
  parseJsonRecord,
  writeAuditLog,
});
const {
  retryJob: defaultRetryJob,
  approveJob: defaultApproveJob,
  approveJobsBatch: defaultApproveJobsBatch,
  retryJobsBatch: defaultRetryJobsBatch,
} = createCommentJobActionHelpers({
  getPrisma,
  createTraceId: defaultCreateTraceId,
  writeAuditLog,
  enqueueCommentEventJob,
});
const {
  getComment: defaultGetComment,
  getJob: defaultGetJob,
  listJobs: defaultListJobs,
  exportJobsCsv: defaultExportJobsCsv,
} = createCommentJobQueryHelpers({
  getPrisma,
  normalizeNullableIsoTimestamp,
  csvEscape,
});

/** Check x-api-key header; returns false and sends 401 on failure */
function checkApiKey(request: FastifyRequest, reply: FastifyReply, settings: RuntimeSettings): boolean {
  const providedSessionToken = getHeaderValue(request.headers['x-admin-session']).trim();
  if (providedSessionToken && verifyAdminSessionToken(providedSessionToken, settings)) {
    return true;
  }

  const expected = settings.apiKey.trim();
  if (!expected) {
    if (isProductionRuntime()) {
      void reply.code(503).send({ detail: 'admin_auth_unconfigured' });
      return false;
    }
    return true;
  }

  const provided = getHeaderValue(request.headers['x-api-key']).trim();
  // security fix: timing-safe compare 防 apiKey timing attack (原 !== 非 constant-time).
  if (!timingSafeStringCompare(provided, expected)) {
    void reply.code(401).send({ detail: 'unauthorized' });
    return false;
  }
  return true;
}

function checkCommentIngressAuth(request: FastifyRequest, reply: FastifyReply, settings: RuntimeSettings): boolean {
  const expected = settings.commentIngressToken.trim();
  if (!expected) {
    if (isProductionRuntime()) {
      void reply.code(503).send({ detail: 'comment_ingress_auth_unconfigured' });
      return false;
    }
    return true;
  }

  const providedToken = getHeaderValue(request.headers['x-comment-ingress-token']).trim();
  const authorization = getHeaderValue(request.headers.authorization).trim();
  // security fix: timing-safe compare 防 ingress token timing attack (原 === 非 constant-time).
  // 两路都算再 OR (避免 || 短路泄露哪路匹配).
  const tokenMatch = timingSafeStringCompare(providedToken, expected);
  const bearerMatch = timingSafeStringCompare(authorization, `Bearer ${expected}`);
  if (tokenMatch || bearerMatch) {
    return true;
  }

  void reply.code(401).send({ detail: 'unauthorized' });
  return false;
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
  const canonicalId = isNonEmptyString(record.canonical_id) ? record.canonical_id : undefined;
  const containerId = isNonEmptyString(record.container_id) ? record.container_id : undefined;
  const userId = isNonEmptyString(record.user_id) ? record.user_id : undefined;
  const parentExternalId = isNonEmptyString(record.parent_external_id) ? record.parent_external_id : undefined;
  const routingMetadata =
    record.routing_metadata && typeof record.routing_metadata === 'object' && !Array.isArray(record.routing_metadata)
      ? Object.fromEntries(
          Object.entries(record.routing_metadata as Record<string, unknown>).flatMap(([key, value]) =>
            typeof value === 'string' && value.trim() ? [[key, value]] : [],
          ),
        )
      : undefined;

  return {
    comment_id: record.comment_id,
    reply_text: record.reply_text,
    force_publish: forcePublish,
    source,
    ...(traceId ? { trace_id: traceId } : {}),
    ...(canonicalId ? { canonical_id: canonicalId } : {}),
    ...(containerId ? { container_id: containerId } : {}),
    ...(userId ? { user_id: userId } : {}),
    ...(parentExternalId ? { parent_external_id: parentExternalId } : {}),
    ...(routingMetadata && Object.keys(routingMetadata).length > 0 ? { routing_metadata: routingMetadata } : {}),
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
    ...(payload.canonical_id ? { canonical_id: payload.canonical_id } : {}),
    ...(payload.container_id ? { container_id: payload.container_id } : {}),
    ...(payload.user_id ? { user_id: payload.user_id } : {}),
    ...(payload.parent_external_id ? { parent_external_id: payload.parent_external_id } : {}),
    ...(payload.routing_metadata ? { routing_metadata: payload.routing_metadata } : {}),
  };
}

export function createServer(overrides: Partial<ServerDependencies> = {}): FastifyInstance {
  const defaults = defaultDependencies();
  const settings = overrides.settings ?? defaults.settings;
  const checkDatabaseConnection = overrides.checkDatabaseConnection ?? defaults.checkDatabaseConnection;
  const checkRedisConnection = overrides.checkRedisConnection ?? defaults.checkRedisConnection;
  const probeBilibiliAuth = overrides.probeBilibiliAuth ?? defaults.probeBilibiliAuth;
  const buildBilibiliDiagnostics =
    overrides.buildBilibiliDiagnostics ?? (() => defaultBilibiliDiagnostics(settings, probeBilibiliAuth));
  const verifyPayloadSignature = overrides.verifyPayloadSignature ?? defaults.verifyPayloadSignature;
  const reservePublishLog = overrides.reservePublishLog ?? defaults.reservePublishLog;
  const finalizePublishLog = overrides.finalizePublishLog ?? defaults.finalizePublishLog;
  const publishGatewayReply = overrides.publishGatewayReply ?? ((input) => defaultPublishGatewayReply(settings, input));
  const publishPlatformReply = overrides.publishPlatformReply ?? defaultPublishPlatformReply;
  const normalizePublishFailureReason =
    overrides.normalizePublishFailureReason ?? defaults.normalizePublishFailureReason;
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
  const listMemorySpaces = overrides.listMemorySpaces ?? defaults.listMemorySpaces;
  const createMemorySpace = overrides.createMemorySpace ?? defaults.createMemorySpace;
  const listMemoryItems = overrides.listMemoryItems ?? defaults.listMemoryItems;
  const upsertMemoryItem = overrides.upsertMemoryItem ?? defaults.upsertMemoryItem;
  const listMemoryGrants = overrides.listMemoryGrants ?? defaults.listMemoryGrants;
  const grantMemorySpaceAccess = overrides.grantMemorySpaceAccess ?? defaults.grantMemorySpaceAccess;
  const listMemoryIdentityLinks = overrides.listMemoryIdentityLinks ?? defaults.listMemoryIdentityLinks;
  const linkMemoryIdentity = overrides.linkMemoryIdentity ?? defaults.linkMemoryIdentity;
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
  const getBilibiliStatus =
    overrides.getBilibiliStatus ??
    (() =>
      defaultGetBilibiliStatus({
        settings,
        buildBilibiliDiagnostics,
      }));
  const listBilibiliVideos = overrides.listBilibiliVideos ?? defaults.listBilibiliVideos;
  const addBilibiliVideo = overrides.addBilibiliVideo ?? defaults.addBilibiliVideo;
  const getCompanionState = overrides.getCompanionState ?? defaults.getCompanionState;
  const recordCompanionAction = overrides.recordCompanionAction ?? defaults.recordCompanionAction;
  const listPlatformConnections = overrides.listPlatformConnections ?? (() => defaultListPlatformConnections(settings));
  const updatePlatformConnectionControl =
    overrides.updatePlatformConnectionControl ?? ((input) => defaultUpdatePlatformConnectionControl(settings, input));
  const getCompanionStateV2Compat = async () => {
    try {
      const petCoreService = createPetCoreService();
      const state = await petCoreService.getCompanionStateV2({ bootstrap: true });
      if (state) {
        return state;
      }
    } catch {
      // Fall back to the active companion state provider for compatibility.
    }

    return buildCompanionStateV2FromLegacy(await getCompanionState());
  };

  const app = Fastify();

  app.get('/health', async () => ({ ok: true }));

  registerReadinessRoute(app, {
    settings,
    checkDatabaseConnection,
    checkRedisConnection,
    buildBilibiliDiagnostics,
    getCompanionStateV2: getCompanionStateV2Compat,
    listPlatformConnections,
    buildDefaultReadinessSummary,
    defaultBilibiliDiagnostics,
    normalizePublishMode,
    addBlocker,
    buildDeliveryCapabilityMatrix,
    isEncryptionAvailable,
    isDropCountThresholdExceeded,
    isBackoffActiveRateExceeded: defaultIsBackoffActiveRateExceeded,
    isPassiveResponseViolationExceeded: defaultIsPassiveResponseViolationExceeded,
    threeLayerFlagsAllOn: () => threeLayerFlagsAllOn(),
    isBehaviorAnomalyCountZero: defaultIsBehaviorAnomalyCountZero,
    isAuthProbeHealthy: () => isAuthProbeHealthy(),
    isReplyVisibilityHealthy: defaultIsReplyVisibilityHealthy,
    isComplianceModePassive: () => isCompliancePassive(),
  });

  registerGatewayPublishRoutes(app, {
    settings,
    checkApiKey,
    getHeaderValue,
    parseAdminLimit,
    parseAdminOffset,
    parseAdminString,
    parsePublishPayload,
    buildReplyHash,
    gatewaySignaturePayload,
    createTraceId,
    verifyPayloadSignature,
    reservePublishLog,
    finalizePublishLog,
    publishGatewayReply,
    publishPlatformReply,
    normalizePublishFailureReason,
    isPlatformEnabled,
    getPlatformPublishSource,
    listAdminGatewayLogs,
    normalizeIsoTimestamp,
  });

  registerAdminCoreRoutes(app, {
    settings,
    checkApiKey,
    getHeaderValue,
    issueAdminSession: () => issueAdminSession(settings),
    getAdminOverview,
    getCompanionStateV2: getCompanionStateV2Compat,
    listPlatformConnections,
    updatePlatformConnectionControl,
    recordCompanionAction,
    normalizeAdminOverviewPayload,
    listAdminJobs,
    parseAdminString,
    parseAdminLimit,
    parseAdminOffset,
    normalizeAdminJobListItem,
  });

  registerAdminReportingRoutes(app, {
    settings,
    checkApiKey,
    parseAdminString,
    parseAdminLimit,
    parseAdminOffset,
    parseAdminBoolean,
    parseJsonRecord,
    getAuditLogDetail,
    csvEscape,
    summarizeAdminAuditLogs,
    normalizeAdminAuditSummaryPayload,
    getObservabilitySummary,
  });

  registerAdminManagementRoutes(app, {
    settings,
    checkApiKey,
    parseAdminLimit,
    parseAdminOffset,
    normalizeStyleProfilePayload,
    normalizeRoleProfilePayload,
    normalizeRoleCardInputValue,
    listKnowledgeEntries,
    createKnowledgeEntry,
    disableKnowledgeEntry,
    listMemorySpaces,
    createMemorySpace,
    listMemoryItems,
    upsertMemoryItem,
    listMemoryGrants,
    grantMemorySpaceAccess,
    listMemoryIdentityLinks,
    linkMemoryIdentity,
    getStyleProfile,
    setStyleProfile,
    getRoleProfile,
    setRoleProfile,
    listRoleCards,
    createRoleCard,
    updateRoleCard,
    disableRoleCard,
    activateRoleCard,
  });

  // Comments event ingestion — uses collector for source-aware field mapping
  const commentSources: Array<{ path: string; source: CollectorSource; platform?: PlatformName }> = [
    { path: '/events/comment', source: 'webhook' as const },
    { path: '/events/comment/poller', source: 'poller' as const },
    { path: '/events/comment/official', source: 'official' as const },
    ...listPlatformIngressRoutes(),
  ];

  for (const { path, source, platform } of commentSources) {
    app.post(path, async (request, reply) => {
      if (!checkCommentIngressAuth(request, reply, settings)) return;

      const body = request.body as Record<string, unknown>;

      let event: CommentEvent;
      try {
        const collected = collectCommentEvent(body, source, platform);
        event = collected;
      } catch (err) {
        const message = (err as Error).message;
        return reply.code(400).send({ detail: message });
      }

      const response = await ingestCommentEvent({ event, source });
      return reply.send(response);
    });
  }

  registerCommentRoutes(app, {
    settings,
    checkApiKey,
    parseAdminLimit,
    parseAdminOffset,
    getComment,
  });

  registerJobRoutes(app, {
    settings,
    checkApiKey,
    parseAdminString,
    parseAdminLimit,
    parseAdminOffset,
    retryJob,
    approveJob,
    approveJobsBatch,
    retryJobsBatch,
    getJob,
    listJobs,
    exportJobsCsv,
  });

  registerBilibiliAdminRoutes(app, {
    settings,
    checkApiKey,
    parseAdminBoolean,
    parseAdminLimit,
    parseAdminOffset,
    getBilibiliStatus,
    listBilibiliVideos,
    addBilibiliVideo,
    normalizeBilibiliStatusPayload,
    normalizeBilibiliVideoRecord,
  });

  registerCompanionRoutes(app, {
    settings,
    checkApiKey,
    getCompanionState,
    getCompanionStateV2: getCompanionStateV2Compat,
    recordCompanionAction,
  });

  registerAdminStaticRoutes(app);

  return app;
}

export const __mainTesting = {
  addBlocker,
  buildAdminJobStatusWhere,
  buildCompanionInteraction,
  buildDefaultReadinessSummary,
  buildDegradedCompanionState,
  buildDefaultSettings,
  buildDeliveryCapabilityMatrix,
  buildReplyHash,
  checkApiKey,
  checkCommentIngressAuth,
  createDeliveryCapability,
  csvEscape,
  defaultBilibiliDiagnostics,
  defaultCreateTraceId,
  defaultNormalizePublishFailureReason,
  defaultPublishGatewayReply,
  defaultPublishPlatformReply,
  defaultVerifyPayloadSignature,
  extractRiskFlagLabels,
  gatewaySignaturePayload,
  getAuditLogDetail,
  getGroupCount,
  getHeaderValue,
  hasText,
  isMissingReservationKeyColumnError,
  isNonEmptyString,
  isProductionRuntime,
  normalizeAdminAuditSummaryPayload,
  normalizeAdminJobListItem,
  normalizeAdminJobStatus,
  normalizeAdminOverviewPayload,
  normalizeBilibiliStatusPayload,
  normalizeBilibiliVideoRecord,
  normalizeCompanionInteractionKind,
  normalizeIsoTimestamp,
  normalizeNullableIsoTimestamp,
  normalizeRoleCardInputValue,
  normalizeRoleCardRecord,
  normalizeRoleProfilePayload,
  normalizeStyleProfilePayload,
  parseAdminBoolean,
  parseAdminLimit,
  parseAdminOffset,
  parseAdminString,
  parseBoolean,
  parseInteger,
  parseJsonRecord,
  parsePublishPayload,
  parseRoleCardValue,
  serializeRoleCardValue,
  stableStringify,
  startCase,
  writeAuditLog,
};
