import 'dotenv/config';
import path from 'node:path';

import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

import type { ConnectionStatus } from '../server/contracts.js';

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
  const rawPoolSize = process.env.PRISMA_POOL_SIZE ? Number.parseInt(process.env.PRISMA_POOL_SIZE, 10) : NaN;
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

/**
 * Database connectivity probe for readiness checks (H4 fix).
 *
 * entry (main.ts) 不再直接调 $queryRawUnsafe 越层 — 委派给本 helper.
 * 'SELECT 1' 无插值无 SQL 注入面 (硬编码常量), 仅验证 prisma 连通性.
 */
export async function checkDatabaseConnection(): Promise<ConnectionStatus> {
  try {
    await getPrisma().$queryRawUnsafe('SELECT 1');
    return { connected: true };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'database_unavailable',
    };
  }
}
