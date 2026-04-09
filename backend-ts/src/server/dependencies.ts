import type { BilibiliAuthProbeResult } from '../services/bilibili-client.js';
import type { BilibiliRuntimeConfig } from '../services/bilibili-runtime-config.js';
import type {
  AdminAuditSummaryResponse,
  AdminGatewayLogsResponse,
  AdminJobsResponse,
  BilibiliDiagnostics,
  BilibiliVideo,
  CommentEvent,
  ConnectionStatus,
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
} from './contracts.js';

export type ServerDependencies = {
  settings: RuntimeSettings;
  checkDatabaseConnection: () => Promise<ConnectionStatus> | ConnectionStatus;
  checkRedisConnection: () => Promise<ConnectionStatus> | ConnectionStatus;
  probeBilibiliAuth: (
    config: BilibiliRuntimeConfig,
  ) => Promise<BilibiliAuthProbeResult> | BilibiliAuthProbeResult;
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
  }) =>
    | Promise<{ ok: boolean; item: { id: number; enabled: boolean; updated_at: string | null } }>
    | { ok: boolean; item: { id: number; enabled: boolean; updated_at: string | null } };
  getStyleProfile: () =>
    | Promise<{ ok: boolean; style_profile: string; preset_profiles: string[] }>
    | { ok: boolean; style_profile: string; preset_profiles: string[] };
  setStyleProfile: (input: {
    styleProfile: string;
  }) => Promise<{ ok: boolean; style_profile: string }> | { ok: boolean; style_profile: string };
  getRoleProfile: () =>
    | Promise<{ ok: boolean; role_profile: string; preset_profiles: string[] }>
    | { ok: boolean; role_profile: string; preset_profiles: string[] };
  setRoleProfile: (input: {
    roleProfile: string;
  }) => Promise<{ ok: boolean; role_profile: string }> | { ok: boolean; role_profile: string };
  listRoleCards: (input: {
    limit: number;
    offset: number;
  }) =>
    | Promise<{ ok: boolean; active_role_card_key: string | null; items: RoleCard[] }>
    | { ok: boolean; active_role_card_key: string | null; items: RoleCard[] };
  createRoleCard: (input: {
    key: string;
    name: string;
    description: string;
    system_prompt: string;
    tone: RoleCardValue;
    constraints: RoleCardValue;
    enabled: boolean;
  }) => Promise<{ ok: boolean; item: RoleCard }> | { ok: boolean; item: RoleCard };
  updateRoleCard: (input: {
    cardKey: string;
    name?: string;
    description?: string;
    system_prompt?: string;
    tone?: RoleCardValue;
    constraints?: RoleCardValue;
    enabled?: boolean;
  }) => Promise<{ ok: boolean; item: RoleCard }> | { ok: boolean; item: RoleCard };
  disableRoleCard: (input: {
    cardKey: string;
  }) =>
    | Promise<{ ok: boolean; item: { key: string; enabled: boolean; is_active: boolean; updated_at: string | null } }>
    | { ok: boolean; item: { key: string; enabled: boolean; is_active: boolean; updated_at: string | null } };
  activateRoleCard: (input: {
    cardKey: string;
  }) => Promise<{ ok: boolean; active_role_card_key: string }> | { ok: boolean; active_role_card_key: string };
  getObservabilitySummary: (input: {
    windowMinutes: number;
  }) => Promise<{ ok: boolean; summary: Record<string, unknown> }> | { ok: boolean; summary: Record<string, unknown> };
  ingestCommentEvent: (input: {
    event: CommentEvent;
    source: string;
  }) =>
    | Promise<{ ok: boolean; comment_id: string; trace_id: string; queued?: boolean; message?: string }>
    | { ok: boolean; comment_id: string; trace_id: string; queued?: boolean; message?: string };
  retryJob: (input: {
    jobId: number;
    forceLong?: boolean;
    styleProfile?: string;
    roleProfile?: string;
    roleCardKey?: string;
  }) =>
    | Promise<{ ok: boolean; requeued: boolean; job_id: number; trace_id: string; error?: string }>
    | { ok: boolean; requeued: boolean; job_id: number; trace_id: string; error?: string };
  approveJob: (input: {
    jobId: number;
    styleProfile?: string;
    roleProfile?: string;
    roleCardKey?: string;
  }) =>
    | Promise<{ ok: boolean; job_id: number; status: string; trace_id: string }>
    | { ok: boolean; job_id: number; status: string; trace_id: string };
  approveJobsBatch: (input: { jobIds: number[] }) =>
    | Promise<{
        ok: boolean;
        summary: { total: number; success: number; failed: number };
        results: Array<{ job_id: number; ok: boolean; status?: string; error?: string }>;
        trace_id: string;
      }>
    | {
        ok: boolean;
        summary: { total: number; success: number; failed: number };
        results: Array<{ job_id: number; ok: boolean; status?: string; error?: string }>;
        trace_id: string;
      };
  retryJobsBatch: (input: { jobIds: number[]; forceLong?: boolean }) =>
    | Promise<{
        ok: boolean;
        summary: { total: number; success: number; failed: number };
        results: Array<{ job_id: number; ok: boolean; requeued?: boolean; error?: string }>;
        trace_id: string;
      }>
    | {
        ok: boolean;
        summary: { total: number; success: number; failed: number };
        results: Array<{ job_id: number; ok: boolean; requeued?: boolean; error?: string }>;
        trace_id: string;
      };
  getComment: (input: {
    commentId: string;
  }) =>
    | Promise<{ ok: boolean; comment: Record<string, unknown>; jobs: ReplyJob[] }>
    | { ok: boolean; comment: Record<string, unknown>; jobs: ReplyJob[] };
  getJob: (input: { jobId: number }) => Promise<{ ok: boolean; item: ReplyJob }> | { ok: boolean; item: ReplyJob };
  listJobs: (input: {
    status?: string;
    limit: number;
    offset: number;
  }) => Promise<{ ok: boolean; items: ReplyJob[] }> | { ok: boolean; items: ReplyJob[] };
  exportJobsCsv: (input: { status?: string; limit: number }) => Promise<string> | string;
  getBilibiliStatus: () =>
    | Promise<{
        ok: boolean;
        config: Record<string, unknown>;
        credential: Record<string, unknown> | null;
        videos: Record<string, unknown>;
        diagnostics: Record<string, unknown>;
      }>
    | {
        ok: boolean;
        config: Record<string, unknown>;
        credential: Record<string, unknown> | null;
        videos: Record<string, unknown>;
        diagnostics: Record<string, unknown>;
      };
  listBilibiliVideos: (input: {
    pollEnabled?: boolean;
    limit: number;
    offset: number;
  }) =>
    | Promise<{ ok: boolean; total: number; items: BilibiliVideo[] }>
    | { ok: boolean; total: number; items: BilibiliVideo[] };
  addBilibiliVideo: (input: {
    bvid: string;
    pollEnabled?: boolean;
  }) => Promise<{ ok: boolean; item: BilibiliVideo }> | { ok: boolean; item: BilibiliVideo };
};

type PublishLogStore = {
  reserve: (input: PublishReservationInput) => ReservePublishLogResult;
  finalize: (input: PublishFinalizeInput) => void;
};

type DefaultServerDependenciesInput = {
  buildSettings: () => RuntimeSettings;
  createLogStore: () => PublishLogStore;
  checkDatabaseConnection: ServerDependencies['checkDatabaseConnection'];
  checkRedisConnection: ServerDependencies['checkRedisConnection'];
  probeBilibiliAuth: ServerDependencies['probeBilibiliAuth'];
  buildBilibiliDiagnostics: (
    settings: RuntimeSettings,
    probeBilibiliAuth: ServerDependencies['probeBilibiliAuth'],
  ) => ReturnType<ServerDependencies['buildBilibiliDiagnostics']>;
  verifyPayloadSignature: ServerDependencies['verifyPayloadSignature'];
  normalizePublishFailureReason: ServerDependencies['normalizePublishFailureReason'];
  isPlatformEnabled: ServerDependencies['isPlatformEnabled'];
  getPlatformPublishSource: ServerDependencies['getPlatformPublishSource'];
  createTraceId: ServerDependencies['createTraceId'];
  getAdminOverview: ServerDependencies['getAdminOverview'];
  listAdminJobs: ServerDependencies['listAdminJobs'];
  listAdminGatewayLogs: ServerDependencies['listAdminGatewayLogs'];
  summarizeAdminAuditLogs: ServerDependencies['summarizeAdminAuditLogs'];
  listKnowledgeEntries: ServerDependencies['listKnowledgeEntries'];
  createKnowledgeEntry: ServerDependencies['createKnowledgeEntry'];
  disableKnowledgeEntry: ServerDependencies['disableKnowledgeEntry'];
  getStyleProfile: ServerDependencies['getStyleProfile'];
  setStyleProfile: ServerDependencies['setStyleProfile'];
  getRoleProfile: ServerDependencies['getRoleProfile'];
  setRoleProfile: ServerDependencies['setRoleProfile'];
  listRoleCards: ServerDependencies['listRoleCards'];
  createRoleCard: ServerDependencies['createRoleCard'];
  updateRoleCard: ServerDependencies['updateRoleCard'];
  disableRoleCard: ServerDependencies['disableRoleCard'];
  activateRoleCard: ServerDependencies['activateRoleCard'];
  getObservabilitySummary: ServerDependencies['getObservabilitySummary'];
  ingestCommentEvent: ServerDependencies['ingestCommentEvent'];
  retryJob: ServerDependencies['retryJob'];
  approveJob: ServerDependencies['approveJob'];
  approveJobsBatch: ServerDependencies['approveJobsBatch'];
  retryJobsBatch: ServerDependencies['retryJobsBatch'];
  getComment: ServerDependencies['getComment'];
  getJob: ServerDependencies['getJob'];
  listJobs: ServerDependencies['listJobs'];
  exportJobsCsv: ServerDependencies['exportJobsCsv'];
  getBilibiliStatus: (input: {
    settings: RuntimeSettings;
    buildBilibiliDiagnostics: ServerDependencies['buildBilibiliDiagnostics'];
  }) => ReturnType<ServerDependencies['getBilibiliStatus']>;
  listBilibiliVideos: ServerDependencies['listBilibiliVideos'];
  addBilibiliVideo: ServerDependencies['addBilibiliVideo'];
};

export function buildDefaultServerDependencies(input: DefaultServerDependenciesInput): ServerDependencies {
  const settings = input.buildSettings();
  const logStore = input.createLogStore();
  const buildBilibiliDiagnostics = () => input.buildBilibiliDiagnostics(settings, input.probeBilibiliAuth);

  return {
    settings,
    checkDatabaseConnection: () => input.checkDatabaseConnection(),
    checkRedisConnection: () => input.checkRedisConnection(),
    probeBilibiliAuth: (config) => input.probeBilibiliAuth(config),
    buildBilibiliDiagnostics,
    verifyPayloadSignature: input.verifyPayloadSignature,
    reservePublishLog: (reservationInput) => logStore.reserve(reservationInput),
    finalizePublishLog: (finalizeInput) => logStore.finalize(finalizeInput),
    publishGatewayReply: () => ({ published: false, reason: 'not_configured' }),
    publishPlatformReply: () => ({ published: false, reason: 'not_configured' }),
    normalizePublishFailureReason: input.normalizePublishFailureReason,
    isPlatformEnabled: input.isPlatformEnabled,
    getPlatformPublishSource: input.getPlatformPublishSource,
    createTraceId: input.createTraceId,
    getAdminOverview: input.getAdminOverview,
    listAdminJobs: (jobsInput) => input.listAdminJobs(jobsInput),
    listAdminGatewayLogs: (gatewayLogsInput) => input.listAdminGatewayLogs(gatewayLogsInput),
    summarizeAdminAuditLogs: (auditSummaryInput) => input.summarizeAdminAuditLogs(auditSummaryInput),
    listKnowledgeEntries: (knowledgeListInput) => input.listKnowledgeEntries(knowledgeListInput),
    createKnowledgeEntry: (knowledgeCreateInput) => input.createKnowledgeEntry(knowledgeCreateInput),
    disableKnowledgeEntry: (knowledgeDisableInput) => input.disableKnowledgeEntry(knowledgeDisableInput),
    getStyleProfile: input.getStyleProfile,
    setStyleProfile: (styleProfileInput) => input.setStyleProfile(styleProfileInput),
    getRoleProfile: input.getRoleProfile,
    setRoleProfile: (roleProfileInput) => input.setRoleProfile(roleProfileInput),
    listRoleCards: (roleCardsInput) => input.listRoleCards(roleCardsInput),
    createRoleCard: (roleCardCreateInput) => input.createRoleCard(roleCardCreateInput),
    updateRoleCard: (roleCardUpdateInput) => input.updateRoleCard(roleCardUpdateInput),
    disableRoleCard: (roleCardDisableInput) => input.disableRoleCard(roleCardDisableInput),
    activateRoleCard: (roleCardActivateInput) => input.activateRoleCard(roleCardActivateInput),
    getObservabilitySummary: (observabilityInput) => input.getObservabilitySummary(observabilityInput),
    ingestCommentEvent: (commentEventInput) => input.ingestCommentEvent(commentEventInput),
    retryJob: (retryJobInput) => input.retryJob(retryJobInput),
    approveJob: (approveJobInput) => input.approveJob(approveJobInput),
    approveJobsBatch: (approveJobsBatchInput) => input.approveJobsBatch(approveJobsBatchInput),
    retryJobsBatch: (retryJobsBatchInput) => input.retryJobsBatch(retryJobsBatchInput),
    getComment: (commentInput) => input.getComment(commentInput),
    getJob: (jobInput) => input.getJob(jobInput),
    listJobs: (jobsListInput) => input.listJobs(jobsListInput),
    exportJobsCsv: (exportJobsInput) => input.exportJobsCsv(exportJobsInput),
    getBilibiliStatus: () =>
      input.getBilibiliStatus({
        settings,
        buildBilibiliDiagnostics,
      }),
    listBilibiliVideos: (videosInput) => input.listBilibiliVideos(videosInput),
    addBilibiliVideo: (addVideoInput) => input.addBilibiliVideo(addVideoInput),
  };
}
