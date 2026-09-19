#!/usr/bin/env node
/**
 * Performance baseline orchestrator (PERF-BASE-001).
 *
 * One command reruns the whole baseline and writes a timestamped, comparable
 * result file under perf/baseline/:
 *
 *   npm run perf:baseline            # backend bench + frontend build-size
 *   node scripts/perf-baseline.mjs --skip-frontend
 *
 * Sections:
 *   backend  — backend-ts/scripts/perf-baseline.ts (key data-access paths,
 *              p50/p95/mean + per-run query count on a seeded temp SQLite DB).
 *   frontend — `vite build` output chunk sizes (raw + gzip) for the admin SPA,
 *              plus the configured manualChunks split.
 *
 * Output: perf/baseline/baseline-<ISO-ts>.json  (and perf/baseline/latest.json).
 * The report is deterministic given the same seed volume; wall-clock ms vary
 * with machine load, so compare p50/p95 across runs on the same host.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const backendDir = path.join(root, 'backend-ts');
const frontendDir = path.join(root, 'frontend');
const outDir = path.join(root, 'perf', 'baseline');
const SKIP_FRONTEND = process.argv.includes('--skip-frontend');
const SKIP_BACKEND = process.argv.includes('--skip-backend');

const npmCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const npmRun = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(cmd, args, cwd, extraEnv = {}) {
  const res = spawnSync(cmd, args, {
    cwd,
    env: { ...process.env, ...extraEnv },
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    shell: process.platform === 'win32',
  });
  return res;
}

// ── Backend key-path bench ──
function benchBackend() {
  const script = path.join(backendDir, 'scripts', 'perf-baseline.ts');
  const res = run(npmCmd, ['tsx', script, '--runs', '40', '--seed', '2000'], backendDir);
  if (res.status !== 0) {
    return { ok: false, error: (res.stderr || res.stdout || '').slice(-2000) };
  }
  try {
    return { ok: true, report: JSON.parse(res.stdout) };
  } catch (e) {
    return { ok: false, error: `backend JSON parse failed: ${e.message}` };
  }
}

// ── Frontend build + bundle size ──
function benchFrontend() {
  const distDir = path.join(backendDir, 'public', 'admin'); // vite build outDir
  const build = run(npmRun, ['run', 'build'], frontendDir, { BUILD_OUT_DIR: distDir });
  if (build.status !== 0) {
    return { ok: false, error: (build.stderr || build.stdout || '').slice(-2000) };
  }
  const assetsDir = path.join(distDir, 'assets');
  const dir = existsSync(assetsDir) ? assetsDir : distDir;
  const files = [];
  let totalRaw = 0;
  let totalGzip = 0;
  if (existsSync(dir)) {
    for (const name of readdirSync(dir).filter((f) => /\.(js|css)$/.test(f))) {
      const fp = path.join(dir, name);
      const buf = readFileSync(fp);
      const raw = buf.length;
      const gz = gzipSync(buf).length;
      totalRaw += raw;
      totalGzip += gz;
      files.push({ file: `assets/${name}`, bytes: raw, gzip_bytes: gz });
    }
    files.sort((a, b) => b.gzip_bytes - a.gzip_bytes);
  }
  const indexHtml = path.join(dir === assetsDir ? distDir : dir, 'index.html');
  const entry = files.filter((f) => f.file.endsWith('.js')).slice(0, 1)[0] ?? null;
  return {
    ok: true,
    report: {
      kind: 'frontend-build-size',
      out_dir: path.relative(root, distDir),
      manual_chunks: ['vendor', 'router', 'query'],
      largest_entry_js: entry,
      totals: { files: files.length, raw_bytes: totalRaw, gzip_bytes: totalGzip },
      index_html_bytes: existsSync(indexHtml) ? statSync(indexHtml).size : null,
      files,
    },
  };
}

function main() {
  mkdirSync(outDir, { recursive: true });
  const backend = SKIP_BACKEND ? { ok: true, skipped: true } : benchBackend();
  const frontend = SKIP_FRONTEND ? { ok: true, skipped: true } : benchFrontend();

  const report = {
    kind: 'perf-baseline',
    generated_at: new Date().toISOString(),
    git_commit: run('git', ['rev-parse', '--short', 'HEAD'], root).stdout?.trim() ?? null,
    sections: {
      backend: backend.ok ? backend.report ?? backend : { error: backend.error },
      frontend: frontend.ok ? frontend.report ?? frontend : { error: frontend.error },
    },
    comparison_notes: {
      unbounded_query_fix:
        'pollAllVideos 由无界 findMany 改为 id 游标分批 (POLL_VIDEO_BATCH_SIZE 默认200上限1000): ' +
        '全部 enabled 视频仍覆盖, 但单批驻留内存有界 — 见 backend 路径 videos.* 与 changelog PERF-002.',
    },
  };

  const ts = report.generated_at.replace(/[:.]/g, '-');
  const file = path.join(outDir, `baseline-${ts}.json`);
  writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
  writeFileSync(path.join(outDir, 'latest.json'), JSON.stringify(report, null, 2) + '\n');

  // Console summary.
  console.log(`[perf-baseline] wrote ${path.relative(root, file)}`);
  if (backend.ok && backend.report?.results) {
    console.log('  backend key paths (p50 / p95 ms, queries/run):');
    for (const r of backend.report.results) {
      console.log(
        `    ${r.name.padEnd(46)} p50=${String(r.p50_ms).padStart(8)}  p95=${String(r.p95_ms).padStart(8)}  q=${r.queries_per_run?.p50 ?? '-'}`,
      );
    }
  } else if (!backend.ok) {
    console.error('  backend bench failed:', backend.error);
  }
  if (frontend.ok && frontend.report?.totals) {
    const t = frontend.report.totals;
    console.log(`  frontend admin bundle: ${t.files} files, ${(t.raw_bytes / 1024).toFixed(1)} KiB raw, ${(t.gzip_bytes / 1024).toFixed(1)} KiB gzip`);
    for (const f of frontend.report.files.slice(0, 6)) {
      console.log(`    ${f.file.padEnd(40)} ${(f.gzip_bytes / 1024).toFixed(1)} KiB gzip`);
    }
  } else if (!frontend.ok) {
    console.error('  frontend build failed:', frontend.error);
  }

  if (!backend.ok || !frontend.ok) process.exitCode = 1;
}

main();
