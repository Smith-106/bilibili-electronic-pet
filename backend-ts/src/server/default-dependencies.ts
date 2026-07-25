import { createMemoryService } from '../app/memory/index.js';
import { createPetCoreService } from '../app/pet-core/index.js';
import { COMPANION_SYSTEM_SPACE_KEY, upsertCompanionFeedItem } from '../app/memory/companion-feed.js';
import { checkDatabaseConnection, DEFAULT_DATABASE_URL, getPrisma } from '../lib/prisma.js';
import { checkRedisConnection } from '../lib/redis.js';
import { getPlatformControlState, setPlatformControlState } from '../platforms/control-state.js';
import { listPlatformAdapters, resolvePlatformAdapter } from '../platforms/registry.js';
import type {
  BilibiliDiagnostics,
  CompanionInteraction,
  CompanionState,
  CompanionStateV2,
  ConnectionStatus,
  PlatformName,
  PlatformConnectionSnapshot,
  RuntimeSettings,
} from './contracts.js';
import { buildDefaultServerDependencies, type ServerDependencies } from './dependencies.js';
import {
  buildCompanionInteraction,
  getGroupCount,
  hasText,
  normalizeIsoTimestamp,
  normalizeNullableIsoTimestamp,
  parseBoolean,
  parseInteger,
  parseJsonRecord,
} from './normalizers.js';
import { csvEscape, writeAuditLog } from './audit-log.js';
import {
  defaultAdminAuditSummary,
  defaultAdminGatewayLogs,
  defaultAdminJobs,
  defaultAdminOverview,
  defaultCreateKnowledgeEntry,
  defaultDisableKnowledgeEntry,
  defaultListKnowledgeEntries,
} from './defaults/admin-knowledge.js';
import {
  defaultCreateMemorySpace,
  defaultGrantMemorySpaceAccess,
  defaultLinkMemoryIdentity,
  defaultListMemoryGrants,
  defaultListMemoryIdentityLinks,
  defaultListMemoryItems,
  defaultListMemorySpaces,
  defaultUpsertMemoryItem,
} from './defaults/memory-repository.js';
import {
  defaultActivateRoleCard,
  defaultCreateRoleCard,
  defaultDisableRoleCard,
  defaultGetRoleProfile,
  defaultGetStyleProfile,
  defaultListRoleCards,
  defaultSetRoleProfile,
  defaultSetStyleProfile,
  defaultUpdateRoleCard,
} from './defaults/role-card-and-profile.js';
import {
  defaultAddBilibiliVideo,
  defaultGetBilibiliStatus,
  defaultListBilibiliVideos,
} from './defaults/bilibili-admin.js';
import {
  createDurablePublishLogStore,
  defaultCreateTraceId,
  defaultNormalizePublishFailureReason,
  defaultPublishGatewayReply,
  defaultPublishPlatformReply,
  defaultVerifyPayloadSignature,
  isMissingReservationKeyColumnError,
} from './defaults/publish-execution.js';
import { createCommentIngestHelpers } from './comment-ingest.js';
import { createCommentJobActionHelpers } from './comment-job-actions.js';
import { createCommentJobQueryHelpers } from './comment-job-queries.js';
import type { PetActionName } from './pet-contracts.js';
import { defaultGetPlatformPublishSource, defaultIsPlatformEnabled, normalizePublishMode } from './runtime-platform.js';
import {
  probeBilibiliAuth as probeBilibiliRuntimeAuth,
  type BilibiliAuthProbeResult,
} from '../services/bilibili-client.js';
import { loadBilibiliRuntimeConfig, type BilibiliRuntimeConfig } from '../services/bilibili-runtime-config.js';
import { ensureTraceId, getObservabilityDropCount, recordObservabilityEvent } from '../services/observability.js';

// Re-export so main.ts barrel imports stay byte-identical.
export {
  defaultCreateTraceId,
  defaultGetBilibiliStatus,
  defaultNormalizePublishFailureReason,
  defaultPublishGatewayReply,
  defaultPublishPlatformReply,
  defaultVerifyPayloadSignature,
  isMissingReservationKeyColumnError,
};

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

export function buildDefaultSettings(): RuntimeSettings {
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
export function buildDefaultReadinessSummary(settings: RuntimeSettings): {
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

export function createDeliveryCapability(
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

export function buildDeliveryCapabilityMatrix(
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

export async function defaultBilibiliDiagnostics(
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

export async function defaultCheckDatabaseConnection(): Promise<ConnectionStatus> {
  // H4 fix: 委派给 lib/prisma.ts 的 checkDatabaseConnection — entry 不再越层直接 $queryRawUnsafe.
  return checkDatabaseConnection();
}

export async function defaultCheckRedisConnection(): Promise<ConnectionStatus> {
  // H4 fix: 委派给 lib/redis.ts 的 checkRedisConnection — entry 不再越层直接 new Redis().
  return checkRedisConnection();
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

export async function defaultIsBackoffActiveRateExceeded(): Promise<boolean> {
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

export async function defaultIsPassiveResponseViolationExceeded(): Promise<boolean> {
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

export async function defaultIsBehaviorAnomalyCountZero(): Promise<boolean> {
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

export async function defaultIsReplyVisibilityHealthy(): Promise<boolean> {
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

export function buildCompanionStateV2FromLegacy(companion: CompanionState): CompanionStateV2 {
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

export function defaultDependencies(): ServerDependencies {
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

export function defaultListPlatformConnections(settings: RuntimeSettings): {
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

export function defaultUpdatePlatformConnectionControl(
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
