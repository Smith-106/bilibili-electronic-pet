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

export type MemoryService = {
  listSpaces(filters?: ListMemorySpaceOptions): Promise<MemorySpaceRecord[]>;
  listAccessibleSpaces(subjectType: string, subjectId: string): Promise<MemorySpaceRecord[]>;
  createSpace(input: CreateMemorySpaceInput): Promise<MemorySpaceRecord>;
  listItems(filters?: ListMemoryItemOptions): Promise<MemoryItemRecord[]>;
  listSpaceItems(spaceId: number): Promise<MemoryItemRecord[]>;
  upsertItem(input: UpsertMemoryItemInput): Promise<MemoryItemRecord>;
  listGrants(filters?: ListMemoryGrantOptions): Promise<MemoryGrantRecord[]>;
  listSpaceGrants(spaceId: number): Promise<MemoryGrantRecord[]>;
  listSubjectGrants(subjectType: string, subjectId: string): Promise<MemoryGrantRecord[]>;
  grantSpaceAccess(input: UpsertMemoryGrantInput): Promise<MemoryGrantRecord>;
  listIdentityLinks(filters?: ListIdentityLinkOptions): Promise<IdentityLinkRecord[]>;
  linkIdentity(input: UpsertIdentityLinkInput): Promise<IdentityLinkRecord>;
};
