import type { IdentityLink, MemoryGrant, MemorySpace, PrismaClient } from '@prisma/client';

import { getPrisma } from '../../../lib/prisma.js';
import type {
  CreateMemorySpaceInput,
  IdentityLinkRecord,
  ListIdentityLinkOptions,
  ListMemoryGrantOptions,
  ListMemorySpaceOptions,
  MemoryGrantRecord,
  MemorySpaceRecord,
  UpsertIdentityLinkInput,
  UpsertMemoryGrantInput,
} from '../../../app/memory/types.js';

type MemoryPrismaClient = Pick<PrismaClient, 'identityLink' | 'memoryGrant' | 'memorySpace'>;

export type MemoryRepository = {
  listSpaces(filters?: ListMemorySpaceOptions): Promise<MemorySpaceRecord[]>;
  createSpace(input: CreateMemorySpaceInput): Promise<MemorySpaceRecord>;
  listGrants(filters?: ListMemoryGrantOptions): Promise<MemoryGrantRecord[]>;
  upsertGrant(input: UpsertMemoryGrantInput): Promise<MemoryGrantRecord>;
  listIdentityLinks(filters?: ListIdentityLinkOptions): Promise<IdentityLinkRecord[]>;
  upsertIdentityLink(input: UpsertIdentityLinkInput): Promise<IdentityLinkRecord>;
};

const DEFAULT_SPACE_TYPE = 'operator';
const DEFAULT_ACCESS_LEVEL = 'read';
const DEFAULT_PLATFORM = 'bilibili';

function mapMemorySpace(record: MemorySpace): MemorySpaceRecord {
  return {
    id: record.id,
    space_key: record.space_key,
    space_type: record.space_type,
    title: record.title,
    summary: record.summary,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

function mapMemoryGrant(record: MemoryGrant): MemoryGrantRecord {
  return {
    id: record.id,
    space_id: record.space_id,
    subject_type: record.subject_type,
    subject_id: record.subject_id,
    access_level: record.access_level,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

function mapIdentityLink(record: IdentityLink): IdentityLinkRecord {
  return {
    id: record.id,
    subject_type: record.subject_type,
    subject_id: record.subject_id,
    platform: record.platform,
    external_id: record.external_id,
    display_name: record.display_name,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

export function createMemoryRepository(prisma: MemoryPrismaClient = getPrisma() as MemoryPrismaClient): MemoryRepository {
  return {
    async listSpaces(filters = {}) {
      const where: {
        id?: { in: number[] };
        space_key?: { in: string[] };
        space_type?: string;
      } = {};

      if (filters.ids?.length) {
        where.id = { in: filters.ids };
      }
      if (filters.spaceKeys?.length) {
        where.space_key = { in: filters.spaceKeys };
      }
      if (filters.spaceType) {
        where.space_type = filters.spaceType;
      }

      const results = await prisma.memorySpace.findMany({
        where,
        orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
      });

      return results.map(mapMemorySpace);
    },

    async createSpace(input) {
      const result = await prisma.memorySpace.create({
        data: {
          space_key: input.space_key,
          space_type: input.space_type ?? DEFAULT_SPACE_TYPE,
          title: input.title,
          summary: input.summary ?? '',
        },
      });

      return mapMemorySpace(result);
    },

    async listGrants(filters = {}) {
      const where: {
        space_id?: number;
        subject_id?: string;
        subject_type?: string;
      } = {};

      if (typeof filters.spaceId === 'number') {
        where.space_id = filters.spaceId;
      }
      if (filters.subjectType) {
        where.subject_type = filters.subjectType;
      }
      if (filters.subjectId) {
        where.subject_id = filters.subjectId;
      }

      const results = await prisma.memoryGrant.findMany({
        where,
        orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
      });

      return results.map(mapMemoryGrant);
    },

    async upsertGrant(input) {
      const result = await prisma.memoryGrant.upsert({
        where: {
          uq_memory_grants_subject: {
            space_id: input.space_id,
            subject_type: input.subject_type,
            subject_id: input.subject_id,
          },
        },
        update: {
          access_level: input.access_level ?? DEFAULT_ACCESS_LEVEL,
          updated_at: new Date(),
        },
        create: {
          space_id: input.space_id,
          subject_type: input.subject_type,
          subject_id: input.subject_id,
          access_level: input.access_level ?? DEFAULT_ACCESS_LEVEL,
        },
      });

      return mapMemoryGrant(result);
    },

    async listIdentityLinks(filters = {}) {
      const where: {
        external_id?: string;
        platform?: string;
        subject_id?: string;
        subject_type?: string;
      } = {};

      if (filters.subjectType) {
        where.subject_type = filters.subjectType;
      }
      if (filters.subjectId) {
        where.subject_id = filters.subjectId;
      }
      if (filters.platform) {
        where.platform = filters.platform;
      }
      if (filters.externalId) {
        where.external_id = filters.externalId;
      }

      const results = await prisma.identityLink.findMany({
        where,
        orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
      });

      return results.map(mapIdentityLink);
    },

    async upsertIdentityLink(input) {
      const result = await prisma.identityLink.upsert({
        where: {
          uq_identity_links_platform_external: {
            platform: input.platform ?? DEFAULT_PLATFORM,
            external_id: input.external_id,
          },
        },
        update: {
          subject_type: input.subject_type,
          subject_id: input.subject_id,
          display_name: input.display_name ?? null,
          updated_at: new Date(),
        },
        create: {
          subject_type: input.subject_type,
          subject_id: input.subject_id,
          platform: input.platform ?? DEFAULT_PLATFORM,
          external_id: input.external_id,
          display_name: input.display_name ?? null,
        },
      });

      return mapIdentityLink(result);
    },
  };
}
