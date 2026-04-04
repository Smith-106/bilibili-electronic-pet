/**
 * Business service interfaces for worker task processors
 * Each service matches Python implementation semantics
 */

import type { Comment, ReplyJob, KnowledgeEntry, RoleCard, RoleCardValue } from '../models/entities.js';

/**
 * Decision service: should_reply
 * Maps to: app.services.decider.should_reply
 */
export type ShouldReplyService = (event: {
  comment_id: string;
  video_id?: string;
  user_id?: string;
  content?: string;
  parent_id?: string;
  platform?: string;
  trace_id?: string;
  force_long?: boolean;
  style_profile?: string;
  role_profile?: string;
  role_card_key?: string;
}) => Promise<[boolean, string, string]>; // [should_reply, style_mode, length_mode]

/**
 * Safety service: safety_check
 * Maps to: app.services.safety.safety_check
 */
export type SafetyCheckService = (text: string) => Promise<[boolean, Record<string, unknown>]>;

/**
 * Decision service: decide_safety_action
 * Maps to: app.services.decider.decide_safety_action
 */
export type DecideSafetyActionService = (
  safe: boolean,
  riskFlags: Record<string, unknown>
) => string; // 'ok' | 'blocked' | 'manual_queue'

/**
 * Generation service: generate_reply_with_meta
 * Maps to: app.services.generator.generate_reply_with_meta
 */
export type GenerateReplyService = (params: {
  content: string;
  style_mode: string;
  length_mode: string;
  knowledge_context: string;
  search_context: string;
  role_profile: string;
  role_card?: {
    key: string;
    enabled: boolean;
    system_prompt: string;
    tone: RoleCardValue;
    constraints: RoleCardValue;
  };
  active_role_card?: {
    key: string;
    enabled: boolean;
    system_prompt: string;
    tone: RoleCardValue;
    constraints: RoleCardValue;
  };
}) => Promise<{
  reply_text: string;
  provider: string;
  used_fallback: boolean;
  resolved_role_profile: string;
  resolved_role_card_key?: string;
  error_type?: string;
  error_message?: string;
}>;

/**
 * Deduplication service: is_recent_duplicate
 * Maps to: app.services.dedupe.is_recent_duplicate
 */
export type IsRecentDuplicateService = (
  userId: string,
  replyText: string
) => Promise<boolean>;

/**
 * Deduplication service: remember_reply_phrase
 * Maps to: app.services.dedupe.remember_reply_phrase
 */
export type RememberReplyPhraseService = (
  userId: string,
  replyText: string
) => Promise<void>;

/**
 * Publish service: publish_reply_with_result
 * Maps to: app.services.publisher.publish_reply_with_result
 */
export type PublishReplyService = (
  commentId: string,
  replyText: string,
  traceId?: string
) => Promise<[boolean, string, Date | null, Record<string, unknown> | null]>;
// [published, reason, published_at, result]

/**
 * Knowledge service: search_knowledge
 * Maps to: app.services.knowledge.search_knowledge
 */
export type SearchKnowledgeService = (
  query: string
) => Promise<Array<Partial<KnowledgeEntry>>>;

/**
 * Knowledge service: build_knowledge_context
 * Maps to: app.services.knowledge.build_knowledge_context
 */
export type BuildKnowledgeContextService = (
  entries: Array<Partial<KnowledgeEntry>>
) => string;

/**
 * Search service: search_web
 * Maps to: app.services.search_provider.search_web
 */
export type SearchWebService = (query: string) => Promise<{
  items: Array<{ source: string; title?: string; snippet?: string }>;
  error_type?: string;
  error_message?: string;
}>;

/**
 * Search service: build_search_context
 * Maps to: app.services.search_provider.build_search_context
 */
export type BuildSearchContextService = (
  items: Array<{ source: string; title?: string; snippet?: string }>
) => string;

/**
 * Observability service: ensure_trace_id
 * Maps to: app.services.observability.ensure_trace_id
 */
export type EnsureTraceIdService = (traceId?: string) => string;

/**
 * Observability service: record_observability_event
 * Maps to: app.services.observability.record_observability_event
 */
export type RecordObservabilityEventService = (event: {
  event_type: string;
  trace_id: string;
  comment_id?: string | null;
  job_id?: number;
  status?: string;
  duration_ms?: number;
  metadata?: Record<string, unknown>;
}) => void;

/**
 * Observability service: build_log_context
 * Maps to: app.services.observability.build_log_context
 */
export type BuildLogContextService = (params: {
  trace_id: string;
  comment_id?: string;
  job_id?: number;
  status: string;
  error_type?: string;
  error_message?: string;
  [key: string]: unknown;
}) => string;

/**
 * Aggregated worker services interface
 */
export type WorkerServices = {
  // Database
  getCommentByCanonicalId: (canonicalId: string) => Promise<Comment | null>;
  createReplyJob: (job: Omit<ReplyJob, 'id' | 'created_at'>) => Promise<number>;

  // Decision
  shouldReply: ShouldReplyService;
  decideSafetyAction: DecideSafetyActionService;

  // Safety
  safetyCheck: SafetyCheckService;

  // Generation
  generateReplyWithMeta: GenerateReplyService;

  // Deduplication
  isRecentDuplicate: IsRecentDuplicateService;
  rememberReplyPhrase: RememberReplyPhraseService;

  // Publishing
  publishReplyWithResult: PublishReplyService;

  // Knowledge
  searchKnowledge: SearchKnowledgeService;
  buildKnowledgeContext: BuildKnowledgeContextService;

  // Search
  searchWeb: SearchWebService;
  buildSearchContext: BuildSearchContextService;

  // Role cards
  getRoleCardByKey: (key: string) => Promise<RoleCard | null>;
  getActiveRoleCard: () => Promise<RoleCard | null>;

  // Observability
  ensureTraceId: EnsureTraceIdService;
  recordObservabilityEvent: RecordObservabilityEventService;
  buildLogContext: BuildLogContextService;

  // Settings
  killSwitch: boolean;
  roleProfileDefault: string;
};
