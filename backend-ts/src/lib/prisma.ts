import 'dotenv/config';
import path from 'node:path';

import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

export const DEFAULT_DATABASE_URL = 'file:./dev.db';

let prismaSingleton: PrismaClient | null = null;

export function resolveDatabaseUrl(databaseUrl = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL): string {
  if (!databaseUrl.startsWith('file:')) {
    return databaseUrl;
  }

  const filePath = databaseUrl.slice('file:'.length);
  if (filePath === ':memory:') {
    return databaseUrl;
  }

  return `file:${path.resolve(filePath)}`;
}

export function createPrismaClient(databaseUrl?: string): PrismaClient {
  const url = resolveDatabaseUrl(databaseUrl);
  const rawPoolSize = process.env.PRISMA_POOL_SIZE
    ? Number.parseInt(process.env.PRISMA_POOL_SIZE, 10)
    : NaN;
  const concurrency = Number.isFinite(rawPoolSize) && rawPoolSize > 0 ? rawPoolSize : undefined;
  const adapter = new PrismaLibSql({
    url,
    ...(concurrency != null ? { concurrency } : {}),
  });
  return new PrismaClient({ adapter } as never);
}

export function getPrisma(): PrismaClient {
  if (!prismaSingleton) {
    prismaSingleton = createPrismaClient();
  }

  return prismaSingleton;
}

export async function disconnectPrisma(): Promise<void> {
  if (!prismaSingleton) {
    return;
  }

  await prismaSingleton.$disconnect();
  prismaSingleton = null;
}
