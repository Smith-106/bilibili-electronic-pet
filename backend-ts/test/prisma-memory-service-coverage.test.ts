import { afterEach, describe, expect, it, vi } from 'vitest';

const { mockPrismaClient, mockPrismaLibSql } = vi.hoisted(() => ({
  mockPrismaClient: vi.fn(),
  mockPrismaLibSql: vi.fn(),
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: mockPrismaClient,
}));

vi.mock('@prisma/adapter-libsql', () => ({
  PrismaLibSql: mockPrismaLibSql,
}));

const prismaModule = await import('../src/lib/prisma.js');
const { createMemoryService } = await import('../src/app/memory/memory-service.js');

afterEach(async () => {
  await prismaModule.disconnectPrisma();
  vi.restoreAllMocks();
  mockPrismaClient.mockReset();
  mockPrismaLibSql.mockReset();
  delete process.env.DATABASE_URL;
});

describe('prisma lib coverage branches', () => {
  it('resolves non-file, in-memory, relative, and env-backed database urls', () => {
    expect(prismaModule.resolveDatabaseUrl('libsql://remote.example/db')).toBe('libsql://remote.example/db');
    expect(prismaModule.resolveDatabaseUrl('file::memory:')).toBe('file::memory:');
    expect(prismaModule.resolveDatabaseUrl('file:./relative.db')).toMatch(/^file:.*relative\.db$/);

    process.env.DATABASE_URL = 'file:./from-env.db';
    expect(prismaModule.resolveDatabaseUrl()).toMatch(/^file:.*from-env\.db$/);
  });

  it('creates prisma clients with a libsql adapter and reuses the singleton until disconnect', async () => {
    const disconnect = vi.fn();
    const firstClient = { $disconnect: disconnect, marker: 'first' };
    mockPrismaLibSql.mockImplementation(function prismaLibSqlMock(args) {
      return { adapterArgs: args };
    });
    mockPrismaClient.mockImplementation(function prismaClientMock(args) {
      return { ...firstClient, ctorArgs: args };
    });

    const explicit = prismaModule.createPrismaClient('file::memory:');
    expect(mockPrismaLibSql).toHaveBeenLastCalledWith({ url: 'file::memory:' });
    expect(mockPrismaClient).toHaveBeenLastCalledWith({ adapter: { adapterArgs: { url: 'file::memory:' } } });
    expect(explicit).toMatchObject({ marker: 'first' });

    const singletonA = prismaModule.getPrisma();
    const singletonB = prismaModule.getPrisma();
    expect(singletonA).toBe(singletonB);

    await prismaModule.disconnectPrisma();
    expect(disconnect).toHaveBeenCalledTimes(1);

    await prismaModule.disconnectPrisma();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});

describe('memory service wrapper coverage branches', () => {
  function buildRepository() {
    return {
      listSpaces: vi.fn(async (filters) => [{ id: 1, filters }]),
      createSpace: vi.fn(async (input) => ({ id: 2, ...input })),
      listItems: vi.fn(async (filters) => [{ id: 3, filters }]),
      upsertItem: vi.fn(async (input) => ({ id: 4, ...input })),
      listGrants: vi.fn(async (filters) => [
        { id: 5, space_id: 9, filters },
        { id: 6, space_id: 9, filters },
      ]),
      upsertGrant: vi.fn(async (input) => ({ id: 7, ...input })),
      listIdentityLinks: vi.fn(async (filters) => [{ id: 8, filters }]),
      upsertIdentityLink: vi.fn(async (input) => ({ id: 9, ...input })),
    };
  }

  it('delegates all memory repository methods with normalized filters', async () => {
    const repository = buildRepository();
    const service = createMemoryService(repository as never);

    await expect(service.listSpaces({ limit: 5 })).resolves.toEqual([{ id: 1, filters: { limit: 5 } }]);
    await expect(service.listAccessibleSpaces('operator', 'alice')).resolves.toEqual([
      { id: 1, filters: { ids: [9] } },
    ]);
    await expect(service.createSpace({ space_key: 's', title: 'Space' })).resolves.toMatchObject({ space_key: 's' });
    await expect(service.listItems({ spaceId: 1 })).resolves.toEqual([{ id: 3, filters: { spaceId: 1 } }]);
    await expect(service.listSpaceItems(2)).resolves.toEqual([{ id: 3, filters: { spaceId: 2 } }]);
    await expect(service.upsertItem({ space_id: 1, item_key: 'i', content: 'body' })).resolves.toMatchObject({
      item_key: 'i',
    });
    await expect(service.listGrants({ subjectType: 'operator' })).resolves.toHaveLength(2);
    await expect(service.listSpaceGrants(3)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ filters: { spaceId: 3 } })]),
    );
    await expect(service.listSubjectGrants('operator', 'bob')).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ filters: { subjectType: 'operator', subjectId: 'bob' } })]),
    );
    await expect(
      service.grantSpaceAccess({ space_id: 1, subject_type: 'operator', subject_id: 'bob' }),
    ).resolves.toMatchObject({
      subject_id: 'bob',
    });
    await expect(service.listIdentityLinks({ platform: 'bilibili' })).resolves.toEqual([
      { id: 8, filters: { platform: 'bilibili' } },
    ]);
    await expect(
      service.linkIdentity({ subject_type: 'operator', subject_id: 'bob', external_id: 'uid' }),
    ).resolves.toMatchObject({
      external_id: 'uid',
    });

    expect(repository.listSpaces).toHaveBeenCalledWith({ ids: [9] });
    expect(repository.listGrants).toHaveBeenCalledWith({ subjectType: 'operator', subjectId: 'alice' });
  });

  it('returns no accessible spaces when there are no matching grants', async () => {
    const repository = buildRepository();
    repository.listGrants.mockResolvedValueOnce([]);
    const service = createMemoryService(repository as never);

    await expect(service.listAccessibleSpaces('operator', 'missing')).resolves.toEqual([]);

    expect(repository.listSpaces).not.toHaveBeenCalled();
  });
});
