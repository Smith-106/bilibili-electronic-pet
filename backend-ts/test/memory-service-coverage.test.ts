import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMemoryService } from '../src/app/memory/memory-service.js';
import type {
  CreateMemorySpaceInput,
  ListIdentityLinkOptions,
  ListMemoryGrantOptions,
  ListMemoryItemOptions,
  ListMemorySpaceOptions,
  UpsertIdentityLinkInput,
  UpsertMemoryGrantInput,
  UpsertMemoryItemInput,
} from '../src/app/memory/types.js';
import type { MemoryRepository } from '../src/infra/db/repositories/memory-repository.js';

function createRepository(): MemoryRepository {
  return {
    listSpaces: vi.fn(async (_filters?: ListMemorySpaceOptions) => []),
    createSpace: vi.fn(async (input: CreateMemorySpaceInput) => ({
      id: 1,
      space_key: input.space_key,
      space_type: input.space_type ?? 'operator',
      title: input.title,
      summary: input.summary ?? '',
      created_at: new Date('2026-06-08T00:00:00.000Z'),
      updated_at: new Date('2026-06-08T00:00:00.000Z'),
    })),
    listItems: vi.fn(async (_filters?: ListMemoryItemOptions) => []),
    upsertItem: vi.fn(async (input: UpsertMemoryItemInput) => ({
      id: 2,
      space_id: input.space_id,
      item_key: input.item_key,
      content: input.content,
      content_type: input.content_type ?? 'note',
      source: input.source ?? 'operator',
      item_metadata: input.item_metadata ?? {},
      created_at: new Date('2026-06-08T00:00:00.000Z'),
      updated_at: new Date('2026-06-08T00:00:00.000Z'),
    })),
    listGrants: vi.fn(async (_filters?: ListMemoryGrantOptions) => []),
    upsertGrant: vi.fn(async (input: UpsertMemoryGrantInput) => ({
      id: 3,
      space_id: input.space_id,
      subject_type: input.subject_type,
      subject_id: input.subject_id,
      access_level: input.access_level ?? 'read',
      created_at: new Date('2026-06-08T00:00:00.000Z'),
      updated_at: new Date('2026-06-08T00:00:00.000Z'),
    })),
    listIdentityLinks: vi.fn(async (_filters?: ListIdentityLinkOptions) => []),
    upsertIdentityLink: vi.fn(async (input: UpsertIdentityLinkInput) => ({
      id: 4,
      subject_type: input.subject_type,
      subject_id: input.subject_id,
      platform: input.platform ?? 'bilibili',
      external_id: input.external_id,
      display_name: input.display_name ?? null,
      created_at: new Date('2026-06-08T00:00:00.000Z'),
      updated_at: new Date('2026-06-08T00:00:00.000Z'),
    })),
  };
}

describe('memory service delegation coverage', () => {
  let repository: MemoryRepository;

  beforeEach(() => {
    repository = createRepository();
  });

  it('returns an empty accessible-space list without querying spaces when no grants exist', async () => {
    const service = createMemoryService(repository);

    await expect(service.listAccessibleSpaces('operator', 'alice')).resolves.toEqual([]);

    expect(repository.listGrants).toHaveBeenCalledWith({
      subjectType: 'operator',
      subjectId: 'alice',
    });
    expect(repository.listSpaces).not.toHaveBeenCalled();
  });

  it('delegates direct list and write helpers to repository filters', async () => {
    const service = createMemoryService(repository);

    await service.listSpaceItems(7);
    await service.listSpaceGrants(7);
    await service.listSubjectGrants('operator', 'alice');
    await service.grantSpaceAccess({
      space_id: 7,
      subject_type: 'operator',
      subject_id: 'alice',
      access_level: 'write',
    });

    expect(repository.listItems).toHaveBeenCalledWith({ spaceId: 7 });
    expect(repository.listGrants).toHaveBeenNthCalledWith(1, { spaceId: 7 });
    expect(repository.listGrants).toHaveBeenNthCalledWith(2, {
      subjectType: 'operator',
      subjectId: 'alice',
    });
    expect(repository.upsertGrant).toHaveBeenCalledWith({
      space_id: 7,
      subject_type: 'operator',
      subject_id: 'alice',
      access_level: 'write',
    });
  });
});
