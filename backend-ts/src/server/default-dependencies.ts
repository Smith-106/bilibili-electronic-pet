import { checkDatabaseConnection, DEFAULT_DATABASE_URL, getPrisma } from '../lib/prisma.js';
import { checkRedisConnection } from '../lib/redis.js';
import { getPlatformControlState, setPlatformControlState } from '../platforms/control-state.js';
import { listPlatformAdapters, resolvePlatformAdapter } from '../platforms/registry.js';
import type {
  BilibiliDiagnostics,
  ConnectionStatus,
  PlatformName,
  PlatformConnectionSnapshot,
  RuntimeSettings,
} from './contracts.js';
import { buildDefaultServerDependencies, type ServerDependencies } from './dependencies.js';
import { hasText, normalizeNullableIsoTimestamp, parseBoolean, parseInteger, parseJsonRecord } from './normalizers.js';
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
import {
  defaultGetObservabilitySummary,
  defaultIsBackoffActiveRateExceeded,
  defaultIsBehaviorAnomalyCountZero,
  defaultIsPassiveResponseViolationExceeded,
  defaultIsReplyVisibilityHealthy,
} from './defaults/observability-gates.js';
import {
  buildCompanionStateV2FromLegacy,
  buildDegradedCompanionState,
  defaultGetCompanionState,
  defaultGetCompanionStateV2,
  defaultRecordCompanionAction,
} from './defaults/companion-state.js';
import { createCommentIngestHelpers } from './comment-ingest.js';
import { createCommentJobActionHelpers } from './comment-job-actions.js';
import { createCommentJobQueryHelpers } from './comment-job-queries.js';
import { defaultGetPlatformPublishSource, defaultIsPlatformEnabled, normalizePublishMode } from './runtime-platform.js';
import {
  probeBilibiliAuth as probeBilibiliRuntimeAuth,
  type BilibiliAuthProbeResult,
} from '../services/bilibili-client.js';
import { loadBilibiliRuntimeConfig, type BilibiliRuntimeConfig } from '../services/bilibili-runtime-config.js';

// Re-export so main.ts barrel imports stay byte-identical.
export {
  buildCompanionStateV2FromLegacy,
  buildDegradedCompanionState,
  defaultCreateTraceId,
  defaultGetBilibiliStatus,
  defaultIsBackoffActiveRateExceeded,
  defaultIsBehaviorAnomalyCountZero,
  defaultIsPassiveResponseViolationExceeded,
  defaultIsReplyVisibilityHealthy,
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
