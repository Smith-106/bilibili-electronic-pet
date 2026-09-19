# Performance Baseline

Repeatable, comparable performance baseline for the hot paths.

## Rerun

```bash
npm run perf:baseline                 # backend bench + frontend build-size
node scripts/perf-baseline.mjs --skip-frontend   # backend only
node scripts/perf-baseline.mjs --skip-backend    # frontend only
```

Writes `perf/baseline/baseline-<ISO-ts>.json` and refreshes `latest.json`.

## What it measures

- **backend** (`backend-ts/scripts/perf-baseline.ts`): key data-access paths
  (comments/jobs/publish-log/audit/observability/credentials) timed over R runs
  on a seeded temp SQLite DB — reports `p50_ms`, `p95_ms`, `mean_ms`, and
  `queries_per_run` (call count through the instrumented Prisma client).
- **frontend**: `vite build` output for the admin SPA — per-chunk raw + gzip
  bytes and the configured `manualChunks` split (`vendor`, `router`, `query`).

## Comparing runs

Wall-clock ms varies with machine load — compare `p50_ms`/`p95_ms` and
`queries_per_run` for the same seed volume on the same host. `seed_rows_per_table`
and `runs` are recorded in each report's `config`.

## Structural notes

- `pollAllVideos` was changed from an unbounded `findMany` (all enabled videos
  resident) to an id-cursor batched fetch (`POLL_VIDEO_BATCH_SIZE`, default 200,
  max 1000). Coverage is unchanged (loop until a short batch); only per-batch
  resident memory is bounded — see `comparison_notes.unbounded_query_fix` in the
  report and `PERF-002` in the changelog.
- All paginated list paths issue 2 queries/run (`count` + `findMany`); scalar
  `count`/`groupBy` paths issue 1.
