import Fastify, { type FastifyInstance } from 'fastify';
import { createPetCoreService } from './app/pet-core/index.js';
import { listPlatformIngressRoutes } from './platforms/registry.js';
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
import { type ServerDependencies } from './server/dependencies.js';
import { issueAdminSession } from './server/admin-auth.js';
import {
  buildAdminJobStatusWhere,
  buildCompanionInteraction,
  extractRiskFlagLabels,
  getGroupCount,
  hasText,
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
  parseRoleCardValue,
  serializeRoleCardValue,
  stableStringify,
  startCase,
} from './server/normalizers.js';
import { csvEscape, getAuditLogDetail, writeAuditLog } from './server/audit-log.js';
import { checkApiKey, checkCommentIngressAuth, getHeaderValue } from './server/auth-prehandler.js';
import { normalizePublishMode } from './server/runtime-platform.js';
import { collectCommentEvent, type CollectorSource } from './services/collector.js';
import { isDropCountThresholdExceeded } from './services/observability.js';
import { isAuthProbeHealthy } from './services/probe-scheduler.js';
import { isCompliancePassive } from './services/compliance-mode.js';
import { isEncryptionAvailable } from './services/credential-crypto.js';
import type { CommentEvent, PlatformName } from './server/contracts.js';

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

import {
  buildCompanionStateV2FromLegacy,
  buildDefaultReadinessSummary,
  buildDefaultSettings,
  buildDegradedCompanionState,
  buildDeliveryCapabilityMatrix,
  createDeliveryCapability,
  defaultBilibiliDiagnostics,
  defaultCreateTraceId,
  defaultDependencies,
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
} from './server/default-dependencies.js';
import {
  addBlocker,
  buildReplyHash,
  gatewaySignaturePayload,
  parsePublishPayload,
} from './server/defaults/gateway-payload-helpers.js';
export { buildDegradedCompanionState };

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

  // security (review-odyssey ISS-002 F1, CWE-209): 默认 Fastify error handler 会把原始
  // error.message 序列化进 HTTP body — 对非 P2002 rethrow 的 Prisma error (SQLITE_BUSY/P2003/
  // 连接丢失) 会泄露表名/约束名/字段名/schema 信息给客户端. 全局 setErrorHandler:
  // 4xx (Fastify schema 验证错误 / 显式 throw 带 statusCode) 保留 statusCode + message;
  // 5xx / 无 statusCode 的未分类 error log 到服务端日志, 客户端只收 500 {detail:'internal_error'}.
  // 显式 reply.code(N).send({...}) 不经此 handler, 已有 400/409 等显式响应不受影响.
  app.setErrorHandler((error, request, reply) => {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode !== undefined && statusCode >= 400 && statusCode < 500) {
      const message = error instanceof Error ? error.message : String(error);
      return reply.code(statusCode).send({ detail: message });
    }
    request.log.error({ err: error }, 'unhandled_error');
    return reply.code(500).send({ detail: 'internal_error' });
  });

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
