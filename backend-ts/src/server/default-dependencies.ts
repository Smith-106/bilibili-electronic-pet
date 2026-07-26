import { getPrisma } from '../lib/prisma.js';
import { getPlatformControlState, setPlatformControlState } from '../platforms/control-state.js';
import { listPlatformAdapters, resolvePlatformAdapter } from '../platforms/registry.js';
import type { PlatformName, PlatformConnectionSnapshot, RuntimeSettings } from './contracts.js';
import { buildDefaultServerDependencies, type ServerDependencies } from './dependencies.js';
import { hasText, normalizeNullableIsoTimestamp, parseJsonRecord } from './normalizers.js';
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
import {
  buildDefaultReadinessSummary,
  buildDefaultSettings,
  buildDeliveryCapabilityMatrix,
  createDeliveryCapability,
  defaultBilibiliDiagnostics,
  defaultCheckDatabaseConnection,
  defaultCheckRedisConnection,
} from './defaults/publish-diagnostics-capability.js';
import { createCommentIngestHelpers } from './comment-ingest.js';
import { createCommentJobActionHelpers } from './comment-job-actions.js';
import { createCommentJobQueryHelpers } from './comment-job-queries.js';
import { defaultGetPlatformPublishSource, defaultIsPlatformEnabled } from './runtime-platform.js';
import { probeBilibiliAuth as probeBilibiliRuntimeAuth } from '../services/bilibili-client.js';

// Re-export so main.ts barrel imports stay byte-identical.
export {
  buildCompanionStateV2FromLegacy,
  buildDefaultReadinessSummary,
  buildDefaultSettings,
  buildDeliveryCapabilityMatrix,
  buildDegradedCompanionState,
  createDeliveryCapability,
  defaultBilibiliDiagnostics,
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
