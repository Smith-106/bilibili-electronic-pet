/**
 * Backend key-path performance baseline (PERF-BASE-001).
 *
 * Self-contained, repeatable benchmark of the hot data-access paths. Builds a
 * dedicated temp SQLite DB straight from prisma/migrations (same DDL the test
 * harness uses), seeds a representative row volume, then times each path R
 * iterations and reports p50 / p95 / mean plus a per-run query count.
 *
 * Run:
 *   cd backend-ts && npx tsx scripts/perf-baseline.ts [--runs 40] [--seed 2000]
 *
 * Emits one JSON document to stdout (the orchestrator redirects it to
 * perf/baseline/backend-<ts>.json). Deterministic given the same seed volume;
 * DB is created under os.tmpdir() and removed on exit.
 */
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..');

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = Number.parseInt(process.argv[i + 1] ?? '', 10);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}
const RUNS = arg('runs', 40);
const SEED = arg('seed', 2000);
const WARMUP = 5;

// ── Build a temp DB from migrations (same approach as test/setup-memory-db.ts) ──
const workDir = mkdtempSync(path.join(tmpdir(), 'bili-pet-perf-'));
const dbPath = path.join(workDir, 'perf.db');
process.env.DATABASE_URL = `file:${dbPath}`;

function splitSqlStatements(sql: string): string[] {
  return sql
    .split('\n')
    .filter((l) => !l.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
{
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys=OFF;');
  const migrationsDir = path.join(backendRoot, 'prisma/migrations');
  for (const dir of readdirSync(migrationsDir).filter((d) => !d.endsWith('.toml')).sort()) {
    const sql = readFileSync(path.join(migrationsDir, dir, 'migration.sql'), 'utf8');
    for (const stmt of splitSqlStatements(sql)) db.exec(stmt);
  }
  db.exec('PRAGMA foreign_keys=ON;');
  db.close();
}

// ── Seed representative volume ──
const { createPrismaClient } = await import('../src/lib/prisma.js');
const prisma = createPrismaClient(`file:${dbPath}`);

async function seed() {
  const now = Date.now();
  const comments = [] as Array<Record<string, unknown>>;
  const jobs = [] as Array<Record<string, unknown>>;
  const logs = [] as Array<Record<string, unknown>>;
  const audits = [] as Array<Record<string, unknown>>;
  const events = [] as Array<Record<string, unknown>>;
  const videos = [] as Array<Record<string, unknown>>;

  for (let i = 0; i < SEED; i++) {
    const cid = `bilibili:${i}`;
    const created = new Date(now - (i % 30) * 86400_000 - i * 1000);
    comments.push({
      platform: 'bilibili',
      canonical_comment_id: cid,
      comment_id: String(100000 + i),
      video_id: `BV${(i % 50).toString().padStart(6, '0')}`,
      user_id: `u${i % 500}`,
      content: `seeded comment ${i}`,
      parent_id: null,
      created_at: created,
    });
    jobs.push({
      comment_id: String(100000 + i),
      canonical_comment_id: cid,
      status: ['queued', 'published', 'skipped', 'failed'][i % 4],
      length_mode: 'medium',
      style_mode: 'doro',
      reply_text: `reply ${i}`,
      risk_flags: '{}',
      attempts: i % 3,
      created_at: created,
    });
    logs.push({
      platform: 'bilibili',
      canonical_comment_id: cid,
      comment_id: String(100000 + i),
      reply_hash: `h${i}`,
      status: i % 5 === 0 ? 'failed' : 'published',
      published_at: created,
      created_at: created,
    });
    audits.push({
      action: ['job_retry', 'job_cancel', 'credential_activate', 'video_toggle'][i % 4],
      target_type: 'reply_job',
      target_id: i,
      payload: `{"status":"${i % 2 === 0 ? 'ok' : 'failed'}"}`,
      ok: i % 3 !== 0,
      created_at: created,
    });
    events.push({
      event_type: ['antirisk_signal_detected', 'reply_visibility_check', 'backoff_applied'][i % 3],
      trace_id: `t${i}`,
      status: 'failed',
      error_subclass: ['behavior_anomaly', 'rate_limit', 'shadowban', null][i % 4],
      persona_id: `persona-${i % 8}`,
      created_at: created,
    });
    videos.push({
      bvid: `BV${(i % 50).toString().padStart(6, '0')}-${i}`,
      aid: 1000 + i,
      title: `video ${i}`,
      poll_enabled: i % 2 === 0,
      last_rpid: i,
      created_at: created,
      updated_at: created,
    });
  }

  await prisma.comment.createMany({ data: comments as never });
  await prisma.replyJob.createMany({ data: jobs as never });
  await prisma.publishLog.createMany({ data: logs as never });
  await prisma.operationAuditLog.createMany({ data: audits as never });
  await prisma.observabilityEvent.createMany({ data: events as never });
  await prisma.bilibiliVideo.createMany({ data: videos as never });
}

// ── Query counter: wrap the model methods each path touches on the SHARED client. ──
// db-queries.ts resolves its client via getPrisma() (the module singleton), not the
// local createPrismaClient() used for seeding — so instrument getPrisma()'s client,
// not `prisma`, or the count reads 0.
let queryCount = 0;
function instrument(client: Record<string, unknown>) {
  const models = [
    'comment',
    'replyJob',
    'publishLog',
    'operationAuditLog',
    'observabilityEvent',
    'bilibiliVideo',
    'bilibiliCredential',
    'knowledgeEntry',
    'userState',
  ];
  const methods = ['findMany', 'findUnique', 'findFirst', 'count', 'groupBy', 'create', 'update', 'delete'];
  for (const m of models) {
    const model = client[m] as Record<string, unknown> | undefined;
    if (!model) continue;
    for (const meth of methods) {
      const orig = model[meth];
      if (typeof orig !== 'function') continue;
      model[meth] = (...args: unknown[]) => {
        queryCount += 1;
        return (orig as (...a: unknown[]) => unknown).apply(model, args);
      };
    }
  }
}

// ── Stats ──
function pct(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}
function summarize(samples: number[]) {
  const s = [...samples].sort((a, b) => a - b);
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  return {
    runs: s.length,
    min_ms: +s[0].toFixed(3),
    p50_ms: +pct(s, 50).toFixed(3),
    p95_ms: +pct(s, 95).toFixed(3),
    max_ms: +s[s.length - 1].toFixed(3),
    mean_ms: +mean.toFixed(3),
  };
}

async function bench(name: string, fn: () => Promise<unknown>) {
  for (let i = 0; i < WARMUP; i++) await fn();
  const samples: number[] = [];
  const counts: number[] = [];
  for (let i = 0; i < RUNS; i++) {
    queryCount = 0;
    const t0 = performance.now();
    await fn();
    samples.push(performance.now() - t0);
    counts.push(queryCount);
  }
  const stats = summarize(samples);
  const qstats = summarize(counts);
  return { name, ...stats, queries_per_run: { p50: qstats.p50_ms, p95: qstats.p95_ms, max: qstats.max_ms } };
}

async function main() {
  await seed();
  // Instrument the singleton the queries actually use.
  const { getPrisma } = await import('../src/lib/prisma.js');
  instrument(getPrisma() as unknown as Record<string, unknown>);

  const dq = await import('../src/services/db-queries.js');

  const since = new Date(Date.now() - 7 * 86400_000);
  const results = [] as Array<Record<string, unknown>>;

  results.push(await bench('comments.list (offset=0 limit=50)', () => dq.listComments({ offset: 0, limit: 50 })));
  results.push(await bench('jobs.list (offset=0 limit=50)', () => dq.listReplyJobs({ offset: 0, limit: 50 })));
  results.push(
    await bench('gateway.publish_logs (status=published)', () =>
      dq.listPublishLogs({ status: 'published', offset: 0, limit: 50 }),
    ),
  );
  results.push(
    await bench('audit.list+count (action=job_retry)', async () => {
      const where = { action: 'job_retry' };
      await dq.countAuditLogs(where);
      await dq.listAuditLogs(where, { offset: 0, take: 50 });
    }),
  );
  results.push(await bench('comments.count', () => dq.countComments()));
  results.push(await bench('jobs.count', () => dq.countReplyJobs()));
  results.push(await bench('jobs.count_by_status (groupBy)', () => dq.countReplyJobsByStatus()));
  results.push(
    await bench('observability.count_by_subclass (7d)', () => dq.countObservabilityEventsBySubclass(since)),
  );
  results.push(await bench('audit.count_since (7d)', () => dq.countAuditLogsSince(since)));
  results.push(
    await bench('comments.dates_since (7d, take=500)', () => dq.listCommentDatesSince(since, 500)),
  );
  results.push(await bench('videos.credentials.list (take=50)', () => dq.listBilibiliCredentials(50)));
  results.push(
    await bench('videos.count_comments_by_video (in-list)', () => dq.countCommentsByVideoId('BV000000')),
  );

  const report = {
    kind: 'backend-perf-baseline',
    generated_at: new Date().toISOString(),
    config: { runs: RUNS, warmup: WARMUP, seed_rows_per_table: SEED, db: 'sqlite-temp' },
    node: process.version,
    results,
  };
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');

  await prisma.$disconnect();
  // rmSync on the live libsql handle can EPERM on Windows; disconnect above releases
  // it. Retry-tolerant removal keeps the temp dir clean without masking the result.
  try {
    rmSync(workDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
  } catch {
    /* temp dir cleanup best-effort */
  }
}

main().catch((err) => {
  console.error('[perf-baseline] failed:', err);
  try {
    rmSync(workDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
  } catch {
    /* best-effort */
  }
  process.exit(1);
});
