import { createMemoryRepository, type MemoryRepository } from '../../infra/db/repositories/memory-repository.js';
import type {
  CreateMemorySpaceInput,
  ListIdentityLinkOptions,
  ListMemoryGrantOptions,
  ListMemorySpaceOptions,
  MemoryService,
  UpsertIdentityLinkInput,
  UpsertMemoryGrantInput,
} from './types.js';

export function createMemoryService(repository: MemoryRepository = createMemoryRepository()): MemoryService {
  return {
    async listSpaces(filters?: ListMemorySpaceOptions) {
      return repository.listSpaces(filters);
    },

    async listAccessibleSpaces(subjectType: string, subjectId: string) {
      const grants = await repository.listGrants({
        subjectType,
        subjectId,
      });

      const spaceIds = [...new Set(grants.map((grant) => grant.space_id))];
      if (!spaceIds.length) {
        return [];
      }

      return repository.listSpaces({ ids: spaceIds });
    },

    async createSpace(input: CreateMemorySpaceInput) {
      return repository.createSpace(input);
    },

    async listGrants(filters?: ListMemoryGrantOptions) {
      return repository.listGrants(filters);
    },

    async listSpaceGrants(spaceId: number) {
      return repository.listGrants({ spaceId });
    },

    async listSubjectGrants(subjectType: string, subjectId: string) {
      return repository.listGrants({
        subjectType,
        subjectId,
      });
    },

    async grantSpaceAccess(input: UpsertMemoryGrantInput) {
      return repository.upsertGrant(input);
    },

    async listIdentityLinks(filters?: ListIdentityLinkOptions) {
      return repository.listIdentityLinks(filters);
    },

    async linkIdentity(input: UpsertIdentityLinkInput) {
      return repository.upsertIdentityLink(input);
    },
  };
}
