import { getPrisma } from '../lib/prisma.js';
import { buildDefaultServerDependencies, type ServerDependencies } from './dependencies.js';
import { normalizeNullableIsoTimestamp, parseJsonRecord } from './normalizers.js';
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
import {
  defaultListPlatformConnections,
  defaultUpdatePlatformConnectionControl,
} from './defaults/platform-connections.js';
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
  defaultListPlatformConnections,
  defaultNormalizePublishFailureReason,
  defaultPublishGatewayReply,
  defaultPublishPlatformReply,
  defaultUpdatePlatformConnectionControl,
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
