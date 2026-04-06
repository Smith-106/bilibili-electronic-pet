/**
 * Data model types matching Python SQLAlchemy entities
 */

/**
 * Comment entity
 * Maps to: app.models.entities.Comment
 */
export type Comment = {
  id: number;
  platform: string;
  canonical_comment_id: string;
  comment_id: string;
  video_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: Date;
};

/**
 * Reply job status enum
 */
export type ReplyJobStatus =
  | 'queued'
  | 'processing'
  | 'skipped'
  | 'dedupe_skipped'
  | 'blocked'
  | 'manual_queue'
  | 'published'
  | 'failed';

/**
 * Reply job entity
 * Maps to: app.models.entities.ReplyJob
 */
export type ReplyJob = {
  id: number;
  comment_id: string;
  canonical_comment_id: string | null;
  status: ReplyJobStatus;
  length_mode: string;
  style_mode: string;
  reply_text: string | null;
  risk_flags: Record<string, unknown>;
  attempts: number;
  published_at: Date | null;
  created_at: Date;
};

/**
 * User state entity
 * Maps to: app.models.entities.UserState
 */
export type UserState = {
  id: number;
  user_id: string;
  recent_phrases: Record<string, unknown>;
  cooldown_enabled: boolean;
  updated_at: Date;
};

/**
 * Publish log status
 */
export type PublishLogStatus = 'published' | 'failed' | 'pending';

/**
 * Publish log entity
 * Maps to: app.models.entities.PublishLog
 */
export type PublishLog = {
  id: number;
  platform: string;
  canonical_comment_id: string;
  comment_id: string;
  reply_hash: string;
  source: string;
  status: PublishLogStatus;
  published_at: Date | null;
  failure_reason: string | null;
  created_at: Date;
};

/**
 * Operation audit log entity
 * Maps to: app.models.entities.OperationAuditLog
 */
export type OperationAuditLog = {
  id: number;
  action: string;
  target_type: string;
  target_id: number | null;
  payload: Record<string, unknown>;
  ok: boolean;
  created_at: Date;
};

/**
 * Observability event entity
 * Maps to: app.models.entities.ObservabilityEvent
 */
export type ObservabilityEvent = {
  id: number;
  event_type: string;
  trace_id: string;
  comment_id: string | null;
  job_id: number | null;
  status: string | null;
  duration_ms: number | null;
  event_metadata: Record<string, unknown>;
  created_at: Date;
};

/**
 * Bilibili credential entity
 * Maps to: app.models.entities.BilibiliCredential
 */
export type BilibiliCredential = {
  id: number;
  name: string;
  sessdata: string; // Encrypted storage
  bili_jct: string; // Encrypted storage
  buvid3: string;
  buvid4: string | null;
  is_active: boolean;
  expires_at: Date | null;
  last_used_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

/**
 * Bilibili video entity
 * Maps to: app.models.entities.BilibiliVideo
 */
export type BilibiliVideo = {
  id: number;
  bvid: string;
  aid: number | null;
  title: string | null;
  owner_mid: number | null;
  poll_enabled: boolean;
  last_polled_at: Date | null;
  last_poll_status: string | null;
  last_poll_error: string | null;
  last_rpid: number;
  created_at: Date;
  updated_at: Date;
};

/**
 * Knowledge entry entity
 */
export type KnowledgeEntry = {
  id: number;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
};

/**
 * Role card entity
 */
export type RoleCardValue = string | Record<string, unknown>;

export type RoleCard = {
  id: number;
  key: string;
  enabled: boolean;
  is_active: boolean;
  system_prompt: string;
  tone: RoleCardValue;
  constraints: RoleCardValue;
  created_at: Date;
  updated_at: Date;
};

/**
 * Database query interface
 * Abstracts database operations for dependency injection
 */
export type DatabaseQueries = {
  // Comment queries
  getCommentByCanonicalId(canonicalId: string): Promise<Comment | null>;
  createComment(comment: Omit<Comment, 'id' | 'created_at'>): Promise<Comment>;

  // ReplyJob queries
  createReplyJob(job: Partial<Omit<ReplyJob, 'id' | 'created_at'>>): Promise<number>;
  getReplyJobById(id: number): Promise<ReplyJob | null>;
  getReplyJobsByStatus(status: ReplyJobStatus, limit?: number): Promise<ReplyJob[]>;
  updateReplyJobStatus(id: number, status: ReplyJobStatus): Promise<void>;

  // UserState queries
  getUserState(userId: string): Promise<UserState | null>;
  updateUserState(userId: string, updates: Partial<UserState>): Promise<UserState>;

  // PublishLog queries
  getPublishLogByCanonicalId(canonicalId: string, replyHash: string): Promise<PublishLog | null>;
  createPublishLog(log: Omit<PublishLog, 'id' | 'created_at'>): Promise<PublishLog>;

  // Knowledge queries
  searchKnowledge(query: string): Promise<Array<Partial<KnowledgeEntry>>>;

  // RoleCard queries
  getRoleCardByKey(key: string): Promise<RoleCard | null>;
  getActiveRoleCard(): Promise<RoleCard | null>;
};
