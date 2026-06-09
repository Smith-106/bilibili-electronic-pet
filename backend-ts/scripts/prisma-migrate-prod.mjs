#!/usr/bin/env node

import { closeSync, mkdirSync, openSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const DEFAULT_DATABASE_URL = 'file:./dev.db';

function resolveFileDatabasePath(databaseUrl = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL) {
  const normalizedUrl = String(databaseUrl ?? '').trim();
  if (!normalizedUrl.startsWith('file:')) {
    return null;
  }

  const rawPath = normalizedUrl.slice('file:'.length).split('?')[0].split('#')[0];
  if (!rawPath || rawPath === ':memory:') {
    return null;
  }

  return path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
}

function ensureSqliteDatabaseFile(databaseUrl = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL) {
  const resolvedPath = resolveFileDatabasePath(databaseUrl);
  if (!resolvedPath) {
    return null;
  }

  mkdirSync(path.dirname(resolvedPath), { recursive: true });
  const handle = openSync(resolvedPath, 'a');
  closeSync(handle);
  return resolvedPath;
}

function runPrismaMigrateDeploy() {
  ensureSqliteDatabaseFile();

  const prismaCliEntrypoint = path.resolve('node_modules/prisma/build/index.js');
  const result = spawnSync(process.execPath, [prismaCliEntrypoint, 'migrate', 'deploy'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  process.exit(result.status ?? 1);
}

runPrismaMigrateDeploy();
