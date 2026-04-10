import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPrisma = {
  roleCard: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
  memorySpace: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  memoryGrant: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  identityLink: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
};

vi.mock('../src/lib/prisma.js', () => ({
  getPrisma: () => mockPrisma,
}));

const { getActiveRoleCard, getRoleCardByKey } = await import('../src/services/db-queries.js');
const { createMemoryRepository } = await import('../src/infra/db/repositories/memory-repository.js');
const { createMemoryService } = await import('../src/app/memory/memory-service.js');

function resetMockPrisma(): void {
  mockPrisma.roleCard.findUnique.mockReset();
  mockPrisma.roleCard.findFirst.mockReset();
  mockPrisma.memorySpace.findMany.mockReset();
  mockPrisma.memorySpace.create.mockReset();
  mockPrisma.memoryGrant.findMany.mockReset();
  mockPrisma.memoryGrant.upsert.mockReset();
  mockPrisma.identityLink.findMany.mockReset();
  mockPrisma.identityLink.upsert.mockReset();
}

beforeEach(() => {
  resetMockPrisma();
});

describe('role card db queries', () => {
  it('returns null when the requested role card does not exist', async () => {
    mockPrisma.roleCard.findUnique.mockResolvedValue(null);

    await expect(getRoleCardByKey('missing-card')).resolves.toBeNull();
    expect(mockPrisma.roleCard.findUnique).toHaveBeenCalledWith({
      where: { key: 'missing-card' },
    });
  });

  it('preserves plain string tone values and parses object constraints', async () => {
    mockPrisma.roleCard.findUnique.mockResolvedValue({
      id: 11,
      key: 'default',
      enabled: true,
      is_active: false,
      system_prompt: 'Stay warm',
      tone: 'friendly',
      constraints: JSON.stringify({ max_length: 120 }),
      created_at: new Date('2026-04-04T16:00:00.000Z'),
      updated_at: new Date('2026-04-04T16:10:00.000Z'),
    });

    await expect(getRoleCardByKey('default')).resolves.toEqual({
      id: 11,
      key: 'default',
      enabled: true,
      is_active: false,
      system_prompt: 'Stay warm',
      tone: 'friendly',
      constraints: { max_length: 120 },
      created_at: new Date('2026-04-04T16:00:00.000Z'),
      updated_at: new Date('2026-04-04T16:10:00.000Z'),
    });
  });

  it('preserves plain string constraints for the active role card', async () => {
    mockPrisma.roleCard.findFirst.mockResolvedValue({
      id: 12,
      key: 'active-card',
      enabled: true,
      is_active: true,
      system_prompt: 'Be concise',
      tone: JSON.stringify({ style: 'formal' }),
      constraints: 'avoid spoilers',
      created_at: new Date('2026-04-04T16:20:00.000Z'),
      updated_at: new Date('2026-04-04T16:30:00.000Z'),
    });

    await expect(getActiveRoleCard()).resolves.toEqual({
      id: 12,
      key: 'active-card',
      enabled: true,
      is_active: true,
      system_prompt: 'Be concise',
      tone: { style: 'formal' },
      constraints: 'avoid spoilers',
      created_at: new Date('2026-04-04T16:20:00.000Z'),
      updated_at: new Date('2026-04-04T16:30:00.000Z'),
    });
    expect(mockPrisma.roleCard.findFirst).toHaveBeenCalledWith({
      where: {
        enabled: true,
        is_active: true,
      },
      orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
    });
  });
});

describe('memory repository and service', () => {
  it('lists memory spaces with repository filters', async () => {
    mockPrisma.memorySpace.findMany.mockResolvedValue([
      {
        id: 7,
        space_key: 'operator:alpha',
        space_type: 'operator',
        title: 'Alpha Operator',
        summary: 'Primary operator memory',
        created_at: new Date('2026-04-08T08:00:00.000Z'),
        updated_at: new Date('2026-04-08T08:30:00.000Z'),
      },
    ]);

    const repository = createMemoryRepository();

    await expect(repository.listSpaces({ spaceType: 'operator' })).resolves.toEqual([
      {
        id: 7,
        space_key: 'operator:alpha',
        space_type: 'operator',
        title: 'Alpha Operator',
        summary: 'Primary operator memory',
        created_at: new Date('2026-04-08T08:00:00.000Z'),
        updated_at: new Date('2026-04-08T08:30:00.000Z'),
      },
    ]);

    expect(mockPrisma.memorySpace.findMany).toHaveBeenCalledWith({
      where: { space_type: 'operator' },
      orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
    });
  });

  it('upserts memory grants with the composite space-subject key', async () => {
    mockPrisma.memoryGrant.upsert.mockResolvedValue({
      id: 5,
      space_id: 7,
      subject_type: 'operator',
      subject_id: 'alice',
      access_level: 'write',
      created_at: new Date('2026-04-08T09:00:00.000Z'),
      updated_at: new Date('2026-04-08T09:05:00.000Z'),
    });

    const repository = createMemoryRepository();

    await expect(
      repository.upsertGrant({
        space_id: 7,
        subject_type: 'operator',
        subject_id: 'alice',
        access_level: 'write',
      }),
    ).resolves.toEqual({
      id: 5,
      space_id: 7,
      subject_type: 'operator',
      subject_id: 'alice',
      access_level: 'write',
      created_at: new Date('2026-04-08T09:00:00.000Z'),
      updated_at: new Date('2026-04-08T09:05:00.000Z'),
    });

    expect(mockPrisma.memoryGrant.upsert).toHaveBeenCalledWith({
      where: {
        uq_memory_grants_subject: {
          space_id: 7,
          subject_type: 'operator',
          subject_id: 'alice',
        },
      },
      update: {
        access_level: 'write',
        updated_at: expect.any(Date),
      },
      create: {
        space_id: 7,
        subject_type: 'operator',
        subject_id: 'alice',
        access_level: 'write',
      },
    });
  });

  it('resolves accessible spaces from subject grants', async () => {
    mockPrisma.memoryGrant.findMany.mockResolvedValue([
      {
        id: 9,
        space_id: 7,
        subject_type: 'operator',
        subject_id: 'alice',
        access_level: 'write',
        created_at: new Date('2026-04-08T09:00:00.000Z'),
        updated_at: new Date('2026-04-08T09:05:00.000Z'),
      },
    ]);
    mockPrisma.memorySpace.findMany.mockResolvedValue([
      {
        id: 7,
        space_key: 'operator:alpha',
        space_type: 'operator',
        title: 'Alpha Operator',
        summary: 'Primary operator memory',
        created_at: new Date('2026-04-08T08:00:00.000Z'),
        updated_at: new Date('2026-04-08T08:30:00.000Z'),
      },
    ]);

    const service = createMemoryService();

    await expect(service.listAccessibleSpaces('operator', 'alice')).resolves.toEqual([
      {
        id: 7,
        space_key: 'operator:alpha',
        space_type: 'operator',
        title: 'Alpha Operator',
        summary: 'Primary operator memory',
        created_at: new Date('2026-04-08T08:00:00.000Z'),
        updated_at: new Date('2026-04-08T08:30:00.000Z'),
      },
    ]);

    expect(mockPrisma.memoryGrant.findMany).toHaveBeenCalledWith({
      where: {
        subject_type: 'operator',
        subject_id: 'alice',
      },
      orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
    });
    expect(mockPrisma.memorySpace.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: [7] },
      },
      orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
    });
  });

  it('upserts identity links with a platform/external identity key', async () => {
    mockPrisma.identityLink.upsert.mockResolvedValue({
      id: 12,
      subject_type: 'operator',
      subject_id: 'alice',
      platform: 'bilibili',
      external_id: 'uid-42',
      display_name: 'Alice',
      created_at: new Date('2026-04-08T10:00:00.000Z'),
      updated_at: new Date('2026-04-08T10:15:00.000Z'),
    });

    const service = createMemoryService();

    await expect(
      service.linkIdentity({
        subject_type: 'operator',
        subject_id: 'alice',
        external_id: 'uid-42',
        display_name: 'Alice',
      }),
    ).resolves.toEqual({
      id: 12,
      subject_type: 'operator',
      subject_id: 'alice',
      platform: 'bilibili',
      external_id: 'uid-42',
      display_name: 'Alice',
      created_at: new Date('2026-04-08T10:00:00.000Z'),
      updated_at: new Date('2026-04-08T10:15:00.000Z'),
    });

    expect(mockPrisma.identityLink.upsert).toHaveBeenCalledWith({
      where: {
        uq_identity_links_platform_external: {
          platform: 'bilibili',
          external_id: 'uid-42',
        },
      },
      update: {
        subject_type: 'operator',
        subject_id: 'alice',
        display_name: 'Alice',
        updated_at: expect.any(Date),
      },
      create: {
        subject_type: 'operator',
        subject_id: 'alice',
        platform: 'bilibili',
        external_id: 'uid-42',
        display_name: 'Alice',
      },
    });
  });
});
