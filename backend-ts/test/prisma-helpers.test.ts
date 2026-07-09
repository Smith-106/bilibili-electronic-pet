import { afterEach, describe, expect, it, vi } from 'vitest';

const { mockDisconnect, mockPrismaClient, mockPrismaLibSql } = vi.hoisted(() => {
  const disconnect = vi.fn(async () => undefined);
  const PrismaClient = vi.fn(function PrismaClient(this: { $disconnect: typeof disconnect }, options: unknown) {
    this.$disconnect = disconnect;
    return { $disconnect: disconnect, options };
  });
  const PrismaLibSql = vi.fn(function PrismaLibSql(this: { url: string }, options: { url: string }) {
    this.url = options.url;
    return { url: options.url };
  });
  return {
    mockDisconnect: disconnect,
    mockPrismaClient: PrismaClient,
    mockPrismaLibSql: PrismaLibSql,
  };
});

vi.mock('@prisma/client', () => ({
  PrismaClient: mockPrismaClient,
}));

vi.mock('@prisma/adapter-libsql', () => ({
  PrismaLibSql: mockPrismaLibSql,
}));

const { DEFAULT_DATABASE_URL, createPrismaClient, disconnectPrisma, getPrisma, resolveDatabaseUrl } =
  await import('../src/lib/prisma.js');

afterEach(async () => {
  await disconnectPrisma();
  vi.clearAllMocks();
  delete process.env.DATABASE_URL;
});

describe('prisma helper coverage', () => {
  it('resolves non-file, memory, default, and relative file URLs', () => {
    expect(resolveDatabaseUrl('libsql://example.test/db')).toBe('libsql://example.test/db');
    expect(resolveDatabaseUrl('file::memory:')).toBe('file::memory:');
    expect(resolveDatabaseUrl(DEFAULT_DATABASE_URL)).toMatch(/^file:.*dev\.db$/);
    expect(resolveDatabaseUrl('file:./nested/test.db')).toMatch(/^file:.*nested.*test\.db$/);
  });

  it('creates a Prisma client through the libsql adapter', () => {
    const client = createPrismaClient('file::memory:');

    expect(mockPrismaLibSql).toHaveBeenCalledWith({ url: 'file::memory:' });
    expect(mockPrismaClient).toHaveBeenCalledWith({ adapter: { url: 'file::memory:' } });
    expect(client).toHaveProperty('$disconnect', mockDisconnect);
  });

  it('creates a Prisma client with PRISMA_POOL_SIZE concurrency when set', () => {
    process.env.PRISMA_POOL_SIZE = '5';
    const client = createPrismaClient('file::memory:');

    expect(mockPrismaLibSql).toHaveBeenCalledWith({ url: 'file::memory:', concurrency: 5 });
    expect(client).toHaveProperty('$disconnect', mockDisconnect);
  });

  it('ignores non-finite PRISMA_POOL_SIZE values', () => {
    process.env.PRISMA_POOL_SIZE = 'abc';
    createPrismaClient('file::memory:');

    expect(mockPrismaLibSql).toHaveBeenCalledWith({ url: 'file::memory:' });
  });

  it('ignores zero and negative PRISMA_POOL_SIZE values', () => {
    process.env.PRISMA_POOL_SIZE = '0';
    createPrismaClient('file::memory:');
    vi.clearAllMocks();

    process.env.PRISMA_POOL_SIZE = '-3';
    createPrismaClient('file::memory:');

    expect(mockPrismaLibSql).toHaveBeenCalledWith({ url: 'file::memory:' });
  });

  it('reuses the singleton and disconnects it once', async () => {
    process.env.DATABASE_URL = 'file::memory:';

    const first = getPrisma();
    const second = getPrisma();

    expect(second).toBe(first);
    expect(mockPrismaClient).toHaveBeenCalledTimes(1);

    await disconnectPrisma();
    await disconnectPrisma();

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });
});
