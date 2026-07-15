/**
 * Per-worker in-memory SQLite DB + schema initialization (ISS-20260710-004 flake fix).
 *
 * Root cause of the flake: vitest forks pool ran many test files concurrently, each
 * reusing the module-level prismaSingleton against the same on-disk `file:./dev.db`.
 * Concurrent writes to one SQLite file produced PrismaClientKnownRequestError
 * (write-lock/busy), which is NOT matched by isPublishLogStorageError (it only
 * recognizes "no such table/column" schema errors), so publishIntentWithResult's
 * findFirst rethrew → outer catch → published=false → flaky assertion failure
 * (~40% rate under full parallel runs).
 *
 * Fix: give each worker its own on-disk SQLite file (named by VITEST_WORKER_ID so
 * parallel workers never share one file → no write contention) and build the schema
 * on it directly with node:sqlite before any test imports prisma. The module-level
 * prismaSingleton then resolves to this pre-schema'd file via DATABASE_URL.
 *
 * Design choices:
 *  - node:sqlite (DatabaseSync) builds schema synchronously at the top level, so no
 *    top-level await is needed and the schema is ready before any test file loads.
 *  - This file does NOT import src/lib/prisma.ts. A static or dynamic import there
 *    would instantiate the real @prisma/adapter-libsql during setup, before the
 *    mock-based prisma unit tests (prisma-helpers / prisma-memory-service-coverage)
 *    can substitute it via vi.mock, breaking their call-count assertions. Reading
 *    migration.sql with node:sqlite keeps prisma.ts untouched and mocks intact.
 *  - SQLite's on-disk file format is shared across drivers, so the client prisma's
 *    libsql adapter reads the same file node:sqlite just wrote schema to.
 *
 * Fix-Don't-Hide: isPublishLogStorageError is intentionally narrow (real DB faults
 * MUST surface as readiness signal) and is left untouched — the defect was DB
 * isolation, not error handling.
 */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function splitSqlStatements(sql: string): string[] {
  // Migrations are plain DDL (CREATE TABLE/INDEX, no procedure bodies), so a
  // statement-level split after stripping line comments is sufficient.
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((stmt) => stmt.trim())
    .filter((stmt) => stmt.length > 0);
}

const workerId = process.env.VITEST_WORKER_ID ?? 'single';
const dbPath = path.join(tmpdir(), `bilibili-pet-test-${workerId}.db`);

// setupFiles runs once per test file, but a worker hosts many files in one process.
// Build the schema only on the first file; subsequent files inherit the same
// process.env.DATABASE_URL + ready file. globalThis is shared across the worker's
// isolated module registries, so the guard survives cross-file re-execution.
const guard = globalThis as { __bilibiliPetTestDbReady?: boolean };
if (!guard.__bilibiliPetTestDbReady) {
  // Start from a clean file so a stale schema from a prior run can't drift.
  if (existsSync(dbPath)) {
    rmSync(dbPath, { force: true });
  }

  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys=OFF;');
  const migrationsDir = path.resolve(__dirname, '../prisma/migrations');
  const migrationDirs = readdirSync(migrationsDir)
    .filter((dir) => !dir.endsWith('.toml'))
    .sort();
  for (const dir of migrationDirs) {
    const sql = readFileSync(path.join(migrationsDir, dir, 'migration.sql'), 'utf8');
    for (const stmt of splitSqlStatements(sql)) {
      db.exec(stmt);
    }
  }
  db.exec('PRAGMA foreign_keys=ON;');
  db.close();

  // Route every test in this worker onto the pre-schema'd file.
  process.env.DATABASE_URL = `file:${dbPath}`;

  // Clean up the temp file when the worker process exits.
  process.on('exit', () => {
    rmSync(dbPath, { force: true });
  });

  guard.__bilibiliPetTestDbReady = true;
}
