import { createMemoryService } from '../../app/memory/index.js';
import { DuplicateKeyError, isPrismaP2002 } from '../../lib/duplicate-key-error.js';
import type { IdentityLink, MemoryGrant, MemoryItem, MemorySpace } from '../contracts.js';
import { normalizeNullableIsoTimestamp } from '../normalizers.js';

function normalizeMemorySpaceRecord(record: {
  id: number;
  space_key: string;
  space_type: string;
  title: string;
  summary: string;
  created_at: Date | string | null | undefined;
  updated_at: Date | string | null | undefined;
}): MemorySpace {
  return {
    id: record.id,
    space_key: record.space_key,
    space_type: record.space_type,
    title: record.title,
    summary: record.summary,
    created_at: normalizeNullableIsoTimestamp(record.created_at),
    updated_at: normalizeNullableIsoTimestamp(record.updated_at),
  };
}

function normalizeMemoryGrantRecord(record: {
  id: number;
  space_id: number;
  subject_type: string;
  subject_id: string;
  access_level: string;
  created_at: Date | string | null | undefined;
  updated_at: Date | string | null | undefined;
}): MemoryGrant {
  return {
    id: record.id,
    space_id: record.space_id,
    subject_type: record.subject_type,
    subject_id: record.subject_id,
    access_level: record.access_level,
    created_at: normalizeNullableIsoTimestamp(record.created_at),
    updated_at: normalizeNullableIsoTimestamp(record.updated_at),
  };
}

function normalizeMemoryItemRecord(record: {
  id: number;
  space_id: number;
  item_key: string;
  content: string;
  content_type: string;
  source: string;
  item_metadata: Record<string, unknown>;
  created_at: Date | string | null | undefined;
  updated_at: Date | string | null | undefined;
}): MemoryItem {
  return {
    id: record.id,
    space_id: record.space_id,
    item_key: record.item_key,
    content: record.content,
    content_type: record.content_type,
    source: record.source,
    item_metadata: record.item_metadata,
    created_at: normalizeNullableIsoTimestamp(record.created_at),
    updated_at: normalizeNullableIsoTimestamp(record.updated_at),
  };
}

function normalizeIdentityLinkRecord(record: {
  id: number;
  subject_type: string;
  subject_id: string;
  platform: string;
  external_id: string;
  display_name: string | null;
  created_at: Date | string | null | undefined;
  updated_at: Date | string | null | undefined;
}): IdentityLink {
  return {
    id: record.id,
    subject_type: record.subject_type,
    subject_id: record.subject_id,
    platform: record.platform,
    external_id: record.external_id,
    display_name: record.display_name,
    created_at: normalizeNullableIsoTimestamp(record.created_at),
    updated_at: normalizeNullableIsoTimestamp(record.updated_at),
  };
}

export async function defaultListMemorySpaces(input: {
  limit: number;
  offset: number;
  spaceType?: string;
  subjectType?: string;
  subjectId?: string;
}): Promise<{ ok: boolean; items: MemorySpace[] }> {
  const service = createMemoryService();
  const items =
    input.subjectType && input.subjectId
      ? await service.listAccessibleSpaces(input.subjectType, input.subjectId)
      : await service.listSpaces({ spaceType: input.spaceType });

  return {
    ok: true,
    items: items.slice(input.offset, input.offset + input.limit).map((item) => normalizeMemorySpaceRecord(item)),
  };
}

export async function defaultCreateMemorySpace(input: {
  space_key: string;
  space_type?: string;
  title: string;
  summary?: string;
}): Promise<{ ok: boolean; item: MemorySpace }> {
  const service = createMemoryService();
  let item;
  try {
    item = await service.createSpace(input);
  } catch (error) {
    // ISS-002: admin create of @unique space_key — P2002 means operator resubmitted an
    // existing space_key. catch-as-conflict (NOT duplicate-success like publisher P3):
    // admin must be told "duplicate" via 409, not a silent idempotent ok.
    if (isPrismaP2002(error)) {
      throw new DuplicateKeyError('memory_space_duplicate');
    }
    throw error;
  }
  return {
    ok: true,
    item: normalizeMemorySpaceRecord(item),
  };
}

export async function defaultListMemoryItems(input: {
  limit: number;
  offset: number;
  spaceId?: number;
  itemKey?: string;
  contentType?: string;
  source?: string;
}): Promise<{ ok: boolean; items: MemoryItem[] }> {
  const service = createMemoryService();
  const items = await service.listItems({
    spaceId: input.spaceId,
    itemKey: input.itemKey,
    contentType: input.contentType,
    source: input.source,
  });

  return {
    ok: true,
    items: items.slice(input.offset, input.offset + input.limit).map((item) => normalizeMemoryItemRecord(item)),
  };
}

export async function defaultUpsertMemoryItem(input: {
  space_id: number;
  item_key: string;
  content: string;
  content_type?: string;
  source?: string;
  item_metadata?: Record<string, unknown>;
}): Promise<{ ok: boolean; item: MemoryItem }> {
  const service = createMemoryService();
  const item = await service.upsertItem(input);
  return {
    ok: true,
    item: normalizeMemoryItemRecord(item),
  };
}

export async function defaultListMemoryGrants(input: {
  limit: number;
  offset: number;
  spaceId?: number;
  subjectType?: string;
  subjectId?: string;
}): Promise<{ ok: boolean; items: MemoryGrant[] }> {
  const service = createMemoryService();
  const items = await service.listGrants({
    spaceId: input.spaceId,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
  });

  return {
    ok: true,
    items: items.slice(input.offset, input.offset + input.limit).map((item) => normalizeMemoryGrantRecord(item)),
  };
}

export async function defaultGrantMemorySpaceAccess(input: {
  space_id: number;
  subject_type: string;
  subject_id: string;
  access_level?: string;
}): Promise<{ ok: boolean; item: MemoryGrant }> {
  const service = createMemoryService();
  const item = await service.grantSpaceAccess(input);
  return {
    ok: true,
    item: normalizeMemoryGrantRecord(item),
  };
}

export async function defaultListMemoryIdentityLinks(input: {
  limit: number;
  offset: number;
  subjectType?: string;
  subjectId?: string;
  platform?: string;
  externalId?: string;
}): Promise<{ ok: boolean; items: IdentityLink[] }> {
  const service = createMemoryService();
  const items = await service.listIdentityLinks({
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    platform: input.platform,
    externalId: input.externalId,
  });

  return {
    ok: true,
    items: items.slice(input.offset, input.offset + input.limit).map((item) => normalizeIdentityLinkRecord(item)),
  };
}

export async function defaultLinkMemoryIdentity(input: {
  subject_type: string;
  subject_id: string;
  platform?: string;
  external_id: string;
  display_name?: string | null;
}): Promise<{ ok: boolean; item: IdentityLink }> {
  const service = createMemoryService();
  const item = await service.linkIdentity(input);
  return {
    ok: true,
    item: normalizeIdentityLinkRecord(item),
  };
}
