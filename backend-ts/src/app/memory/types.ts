export type MemorySpaceRecord = {
  id: number;
  space_key: string;
  space_type: string;
  title: string;
  summary: string;
  created_at: Date;
  updated_at: Date;
};

export type MemoryItemRecord = {
  id: number;
  space_id: number;
  item_key: string;
  content: string;
  content_type: string;
  source: string;
  item_metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
};

export type MemoryGrantRecord = {
  id: number;
  space_id: number;
  subject_type: string;
  subject_id: string;
  access_level: string;
  created_at: Date;
  updated_at: Date;
};

export type IdentityLinkRecord = {
  id: number;
  subject_type: string;
  subject_id: string;
  platform: string;
  external_id: string;
  display_name: string | null;
  created_at: Date;
  updated_at: Date;
};

export type ListMemorySpaceOptions = {
  ids?: number[];
  spaceKeys?: string[];
  spaceType?: string;
};

export type ListMemoryGrantOptions = {
  spaceId?: number;
  subjectType?: string;
  subjectId?: string;
};

export type ListMemoryItemOptions = {
  spaceId?: number;
  itemKey?: string;
  contentType?: string;
  source?: string;
};

export type ListIdentityLinkOptions = {
  subjectType?: string;
  subjectId?: string;
  platform?: string;
  externalId?: string;
};

export type CreateMemorySpaceInput = {
  space_key: string;
  space_type?: string;
  title: string;
  summary?: string;
};

export type UpsertMemoryGrantInput = {
  space_id: number;
  subject_type: string;
  subject_id: string;
  access_level?: string;
};

export type UpsertMemoryItemInput = {
  space_id: number;
  item_key: string;
  content: string;
  content_type?: string;
  source?: string;
  item_metadata?: Record<string, unknown>;
};

export type UpsertIdentityLinkInput = {
  subject_type: string;
  subject_id: string;
  platform?: string;
  external_id: string;
  display_name?: string | null;
};

/**
 * D3 会话记忆上下文 (TASK-004 G4)
 * recall 返回的 top-K MemoryItem (已按 confidence DESC + updated_at DESC 排序, 截断到 MEMORY_RECALL_LIMIT).
 * confidence 存 item_metadata.confidence (number 0-1, optional; 缺失视为 0) — 不改 schema (C-009 零 migration).
 * memoryContext 是 GenerateReplyService 的 optional param, 不传时单轮行为 byte-for-byte 不变 (backward-compat).
 */
export type MemoryContext = {
  items: MemoryItemRecord[];
  limit: number;
};

/**
 * D3 记忆召回结果 (TASK-004 G4)
 * C-003: 全量召回后按 confidence DESC + updated_at DESC 排序, 取 top-MEMORY_RECALL_LIMIT 截断.
 */
export type RecallMemoryResult = MemoryContext;

export type MemoryService = {
  listSpaces(filters?: ListMemorySpaceOptions): Promise<MemorySpaceRecord[]>;
  listAccessibleSpaces(subjectType: string, subjectId: string): Promise<MemorySpaceRecord[]>;
  createSpace(input: CreateMemorySpaceInput): Promise<MemorySpaceRecord>;
  listItems(filters?: ListMemoryItemOptions): Promise<MemoryItemRecord[]>;
  listSpaceItems(spaceId: number): Promise<MemoryItemRecord[]>;
  upsertItem(input: UpsertMemoryItemInput): Promise<MemoryItemRecord>;
  /**
   * D3 会话记忆召回 (TASK-004 G4, C-003/C-009)
   * 取 spaceId 下全量 MemoryItem, 按 confidence DESC + updated_at DESC 排序, 取 top-MEMORY_RECALL_LIMIT.
   * confidence 从 item_metadata.confidence 读取 (number 0-1; 缺失/非有限数视为 0).
   * MEMORY_RECALL_LIMIT env (默认 20) 控制截断上限, 防爆 LLM context window.
   */
  recall(spaceId: number): Promise<RecallMemoryResult>;
  listGrants(filters?: ListMemoryGrantOptions): Promise<MemoryGrantRecord[]>;
  listSpaceGrants(spaceId: number): Promise<MemoryGrantRecord[]>;
  listSubjectGrants(subjectType: string, subjectId: string): Promise<MemoryGrantRecord[]>;
  grantSpaceAccess(input: UpsertMemoryGrantInput): Promise<MemoryGrantRecord>;
  listIdentityLinks(filters?: ListIdentityLinkOptions): Promise<IdentityLinkRecord[]>;
  linkIdentity(input: UpsertIdentityLinkInput): Promise<IdentityLinkRecord>;
};
