import 'dotenv/config';
import path from 'node:path';

import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

let prismaSingleton: PrismaClient | null = null;

export function resolveDatabaseUrl(databaseUrl = process.env.DATABASE_URL ?? 'file:./dev.db'): string {
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
  const adapter = new PrismaLibSql({ url: resolveDatabaseUrl(databaseUrl) });
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
