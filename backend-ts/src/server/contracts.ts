import type {
  CompanionActionEnvelope,
  CompanionInteraction,
  CompanionInteractionKind,
  CompanionState,
  CompanionStateV2,
  PetActionName,
  PetCoreStateSnapshot,
  PetNeedSnapshot,
  PetProfile,
  PetProgressState,
  PetProactiveSignal,
  PetRelationshipState,
} from './pet-contracts.js';
import type {
  PlatformAdapterContract,
  PlatformCapabilityDescriptor,
  PlatformCapabilityStatus,
  PlatformConnectionSnapshot,
  PlatformIdentityBinding,
  PlatformIngressEnvelope,
  PlatformName,
  PlatformPublishEnvelope,
  PlatformPublishOutcome,
} from './platform-contracts.js';
import type {
  InteractionActor,
  InteractionContent,
  InteractionEvent,
  InteractionReference,
  InteractionSubjectKind,
  LegacyCommentReference,
} from '../domain/interaction/types.js';

export type ConnectionStatus = {
  connected: boolean;
  error?: string;
};

export type RuntimeSettings = {
  databaseUrl: string;
  celeryBrokerUrl: string;
  celeryResultBackend: string;
  apiKey: string;
  llmProvider: string;
  llmApiKeyConfigured: boolean;
  llmFallbackToMock: boolean;
  searchProvider: string;
  searchApiKeyConfigured: boolean;
  searchCxConfigured: boolean;
  publisherMode: string;
  publisherWebhookUrlConfigured: boolean;
  bilibiliEnabled: boolean;
  bilibiliPollEnabled: boolean;
  bilibiliPollIntervalSeconds: number;
  bilibiliPublishEnabled: boolean;
  bilibiliEnvCredentialConfigured: boolean;
  killSwitch: boolean;
  gatewayToken: string;
  gatewayHmacSecret: string;
  platformBilibiliEnabled: boolean;
  platformQqEnabled: boolean;
  platformDouyinEnabled: boolean;
  platformKuaishouEnabled: boolean;
  platformBilibiliPublishSource: string;
  platformQqPublishSource: string;
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
  canonical_id?: string;
  container_id?: string;
  user_id?: string;
  parent_external_id?: string;
  routing_metadata?: Record<string, string>;
};

export type PublishExecutionResult = {
  published: boolean;
  reason: string;
  publishedAt?: Date;
  status?: 'published' | 'failed' | 'pending' | 'pending_review';
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
  status: 'published' | 'failed' | 'pending' | 'pending_review';
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
  canonicalId?: string;
  containerId?: string;
  userId?: string;
  parentExternalId?: string;
  routingMetadata?: Record<string, string>;
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
  total?: number;
  ok_count?: number;
  failed_count?: number;
  totals: Record<string, unknown>;
  by_action: Record<string, unknown>;
  by_status?: Record<string, unknown>;
  by_result: Record<string, unknown>;
};

export type KnowledgeEntry = {
  id: number;
  category: string;
  title: string;
  content: string;
  enabled: boolean;
  created_at?: string | null;
  updated_at: string | null;
};

export type MemorySpace = {
  id: number;
  space_key: string;
  space_type: string;
  title: string;
  summary: string;
  created_at: string | null;
  updated_at: string | null;
};

export type MemoryGrant = {
  id: number;
  space_id: number;
  subject_type: string;
  subject_id: string;
  access_level: string;
  created_at: string | null;
  updated_at: string | null;
};

export type MemoryItem = {
  id: number;
  space_id: number;
  item_key: string;
  content: string;
  content_type: string;
  source: string;
  item_metadata: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
};

export type IdentityLink = {
  id: number;
  subject_type: string;
  subject_id: string;
  platform: string;
  external_id: string;
  display_name: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type RoleCardValue = string | Record<string, unknown>;

export type RoleCard = {
  id: number;
  key: string;
  name: string;
  description: string;
  system_prompt: string;
  tone: RoleCardValue;
  constraints: RoleCardValue;
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
  route_context?: {
    platform?: string;
    container_id?: string;
    user_id?: string;
    parent_external_id?: string;
    chat_type?: 'group' | 'private';
  } | null;
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
  comment_count?: number | null;
  last_polled_at?: string | null;
  last_poll_status?: string | null;
  last_poll_error?: string | null;
  last_rpid?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type {
  CompanionActionEnvelope,
  CompanionInteraction,
  CompanionInteractionKind,
  InteractionActor,
  InteractionContent,
  InteractionEvent,
  InteractionReference,
  InteractionSubjectKind,
  LegacyCommentReference,
  CompanionState,
  CompanionStateV2,
  PetActionName,
  PetCoreStateSnapshot,
  PetNeedSnapshot,
  PetProfile,
  PetProgressState,
  PetProactiveSignal,
  PetRelationshipState,
  PlatformAdapterContract,
  PlatformCapabilityDescriptor,
  PlatformCapabilityStatus,
  PlatformConnectionSnapshot,
  PlatformIdentityBinding,
  PlatformIngressEnvelope,
  PlatformName,
  PlatformPublishEnvelope,
  PlatformPublishOutcome,
};
