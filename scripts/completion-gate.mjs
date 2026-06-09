#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRootFromScript = resolve(scriptDir, '..');

export const DEFAULT_COVERAGE_PROJECTS = [
  { name: 'backend-ts', coveragePath: 'backend-ts/coverage/coverage-final.json' },
  { name: 'frontend', coveragePath: 'frontend/coverage/coverage-final.json' },
  { name: 'pet-companion-web', coveragePath: 'pet-companion-web/coverage/coverage-final.json' },
  { name: 'docs-site', coveragePath: 'docs-site/coverage/coverage-final.json' },
  { name: 'douyin-sidecar', coveragePath: 'douyin-sidecar/coverage/coverage-final.json' },
  { name: 'qq-sidecar', coveragePath: 'qq-sidecar/coverage/coverage-final.json' },
];

const REQUIRED_REMOTE_PLATFORMS = ['douyin', 'qq'];

function parseArgs(argv) {
  const options = {
    scope: 'production',
    repoRoot: repoRootFromScript,
    artifactsDir: '.artifacts/staging',
    reportPath: null,
    json: false,
    requireCleanGit: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];

    if (current === '--scope' && next) {
      options.scope = next;
      index += 1;
      continue;
    }
    if (current.startsWith('--scope=')) {
      options.scope = current.slice('--scope='.length);
      continue;
    }
    if (current === '--artifacts-dir' && next) {
      options.artifactsDir = next;
      index += 1;
      continue;
    }
    if (current.startsWith('--artifacts-dir=')) {
      options.artifactsDir = current.slice('--artifacts-dir='.length);
      continue;
    }
    if (current === '--report' && next) {
      options.reportPath = next;
      index += 1;
      continue;
    }
    if (current.startsWith('--report=')) {
      options.reportPath = current.slice('--report='.length);
      continue;
    }
    if (current === '--json') {
      options.json = true;
      continue;
    }
    if (current === '--require-clean-git') {
      options.requireCleanGit = true;
      continue;
    }
    if (current === '--allow-dirty') {
      options.requireCleanGit = false;
      continue;
    }
    if (current === '--help' || current === '-h') {
      options.help = true;
    }
  }

  return options;
}

function usage() {
  return `Usage:
  node scripts/completion-gate.mjs [--scope repo|production] [--artifacts-dir .artifacts/staging] [--report path] [--json]

Scopes:
  repo        Checks repo-controlled completion evidence: 100% coverage, expanded preflight, strict product smoke.
  production  Checks repo scope plus Bilibili native real-chain and remote QQ/Douyin signoff evidence.

Evidence conventions:
  - Coverage must exist at each */coverage/coverage-final.json and every statement/branch/function/line must be covered.
  - Expanded preflight must be a JSON report with status=preflight_ready and expanded_scope_trial=true.
  - Strict product smoke must be a JSON report with status=passed, strict=true, and a strict_product passed check.
  - Real-chain must be a JSON report with status=passed, pre_release_real_chain=true, and a pre_release_real_chain passed check.
  - QQ/Douyin remote reports must be status=passed, mention the platform, and include either production_signoff=true/remote=true or a non-local target URL.
`;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function percent(covered, total) {
  if (total === 0) return 100;
  return Number(((covered / total) * 100).toFixed(2));
}

function countMapValues(values = {}) {
  const entries = Object.values(values);
  return {
    covered: entries.filter((value) => Number(value) > 0).length,
    total: entries.length,
  };
}

function countBranchValues(values = {}) {
  const branchCounts = Object.values(values).flatMap((value) => (Array.isArray(value) ? value : []));
  return {
    covered: branchCounts.filter((value) => Number(value) > 0).length,
    total: branchCounts.length,
  };
}

function countLineValues(fileCoverage) {
  const lines = new Map();
  for (const [statementId, location] of Object.entries(fileCoverage.statementMap ?? {})) {
    const line = location?.start?.line;
    if (!Number.isFinite(line)) continue;
    const current = lines.get(line) ?? { covered: false };
    current.covered = current.covered || Number(fileCoverage.s?.[statementId] ?? 0) > 0;
    lines.set(line, current);
  }

  return {
    covered: [...lines.values()].filter((entry) => entry.covered).length,
    total: lines.size,
  };
}

export function summarizeCoveragePayload(payload) {
  const totals = {
    statements: { covered: 0, total: 0 },
    branches: { covered: 0, total: 0 },
    functions: { covered: 0, total: 0 },
    lines: { covered: 0, total: 0 },
  };

  for (const fileCoverage of Object.values(payload)) {
    const statements = countMapValues(fileCoverage.s);
    const branches = countBranchValues(fileCoverage.b);
    const functions = countMapValues(fileCoverage.f);
    const lines = countLineValues(fileCoverage);

    for (const [key, value] of Object.entries({ statements, branches, functions, lines })) {
      totals[key].covered += value.covered;
      totals[key].total += value.total;
    }
  }

  return Object.fromEntries(
    Object.entries(totals).map(([key, value]) => [
      key,
      {
        ...value,
        percent: percent(value.covered, value.total),
        complete: value.covered === value.total,
      },
    ]),
  );
}

export function collectCoverageSummary(repoRoot, projects = DEFAULT_COVERAGE_PROJECTS) {
  return projects.map((project) => {
    const absolutePath = resolve(repoRoot, project.coveragePath);
    if (!existsSync(absolutePath)) {
      return {
        name: project.name,
        path: absolutePath,
        ok: false,
        missing: true,
        metrics: null,
      };
    }

    const metrics = summarizeCoveragePayload(readJson(absolutePath));
    const ok = Object.values(metrics).every((metric) => metric.complete);
    return {
      name: project.name,
      path: absolutePath,
      ok,
      missing: false,
      metrics,
    };
  });
}

function listJsonFiles(directory) {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => {
      const path = resolve(directory, entry.name);
      return {
        name: entry.name,
        path,
        mtimeMs: statSync(path).mtimeMs,
      };
    })
    .sort((left, right) => right.mtimeMs - left.mtimeMs);
}

function normalizeCheckName(check) {
  if (typeof check === 'string') return check.split(':')[0];
  return String(check?.name ?? '').trim();
}

function checkPassed(report, name) {
  return Array.isArray(report?.checks)
    && report.checks.some((check) => {
      const checkName = normalizeCheckName(check);
      const status = typeof check === 'string' ? 'passed' : String(check?.status ?? '').trim();
      return checkName === name && status === 'passed';
    });
}

function hasNoPreflightBlockers(report) {
  const blockers = report?.delivery_preflight?.blockers;
  return Array.isArray(blockers) && blockers.length === 0;
}

function stringifySmallEvidence(report, fileName) {
  return [
    fileName,
    report?.mode,
    report?.platform,
    report?.target_platform,
    report?.service,
    report?.scope,
    report?.target_scope,
    report?.evidence_scope,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function collectStringValues(value, output = []) {
  if (typeof value === 'string') {
    output.push(value);
    return output;
  }
  if (!value || typeof value !== 'object') return output;
  if (Array.isArray(value)) {
    for (const item of value) collectStringValues(item, output);
    return output;
  }
  for (const item of Object.values(value)) collectStringValues(item, output);
  return output;
}

function isExternalUrl(value) {
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(host)) return false;
    if (host.endsWith('.localhost')) return false;
    if (host === 'example.com' || host === 'example.invalid' || host.endsWith('.example')) return false;
    if (value.includes('replace-with')) return false;
    return true;
  } catch {
    return false;
  }
}

function hasRemoteMarker(report) {
  const scopeText = [
    report?.target_scope,
    report?.scope,
    report?.evidence_scope,
    report?.environment,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return report?.remote === true
    || report?.production_signoff === true
    || report?.remote_signoff === true
    || scopeText.includes('remote')
    || scopeText.includes('production');
}

function isRemotePlatformReport(report, fileName, platform) {
  if (report?.status !== 'passed') return false;
  const platformMentioned = stringifySmallEvidence(report, fileName).includes(platform);
  if (!platformMentioned) return false;
  const hasExternalTarget = collectStringValues(report).some(isExternalUrl);
  return hasRemoteMarker(report) || hasExternalTarget;
}

function findLatestReport(files, predicate) {
  for (const file of files) {
    try {
      const report = readJson(file.path);
      if (predicate(report, file.name)) {
        return {
          file: file.path,
          status: report.status ?? null,
          completed_at: report.completed_at ?? null,
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function findCompletionEvidence(repoRoot, artifactsDir = '.artifacts/staging') {
  const files = listJsonFiles(resolve(repoRoot, artifactsDir));

  const expandedPreflight = findLatestReport(
    files,
    (report) => report.status === 'preflight_ready'
      && report.preflight_only === true
      && report.expanded_scope_trial === true
      && hasNoPreflightBlockers(report),
  );

  const strictProduct = findLatestReport(
    files,
    (report) => report.status === 'passed'
      && report.strict === true
      && checkPassed(report, 'strict_product'),
  );

  const realChain = findLatestReport(
    files,
    (report) => report.status === 'passed'
      && report.strict === true
      && report.pre_release_real_chain === true
      && checkPassed(report, 'pre_release_real_chain'),
  );

  const remotePlatforms = Object.fromEntries(
    REQUIRED_REMOTE_PLATFORMS.map((platform) => [
      platform,
      findLatestReport(files, (report, fileName) => isRemotePlatformReport(report, fileName, platform)),
    ]),
  );

  return {
    artifacts_dir: resolve(repoRoot, artifactsDir),
    expanded_preflight: expandedPreflight,
    strict_product: strictProduct,
    real_chain: realChain,
    remote_platforms: remotePlatforms,
  };
}

function collectGitStatus(repoRoot) {
  try {
    const stdout = execFileSync('git', ['status', '--porcelain'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return null;
  }
}

function addBlocker(blockers, code, message, severity = 'P1', details = {}) {
  blockers.push({ severity, code, message, ...details });
}

export function runCompletionGate({
  repoRoot = repoRootFromScript,
  scope = 'production',
  artifactsDir = '.artifacts/staging',
  projects = DEFAULT_COVERAGE_PROJECTS,
  requireCleanGit = null,
} = {}) {
  const normalizedScope = String(scope).trim().toLowerCase() || 'production';
  if (!['repo', 'production'].includes(normalizedScope)) {
    throw new Error(`Unsupported completion scope: ${scope}`);
  }

  const blockers = [];
  const coverage = collectCoverageSummary(repoRoot, projects);
  for (const project of coverage) {
    if (project.missing) {
      addBlocker(blockers, 'coverage_missing', `${project.name} coverage-final.json is missing`, 'P1', {
        path: project.path,
      });
      continue;
    }
    if (!project.ok) {
      const incomplete = Object.entries(project.metrics)
        .filter(([, metric]) => !metric.complete)
        .map(([name, metric]) => `${name}=${metric.percent}% (${metric.covered}/${metric.total})`);
      addBlocker(blockers, 'coverage_not_100', `${project.name} coverage is not 100%: ${incomplete.join(', ')}`, 'P1', {
        path: project.path,
      });
    }
  }

  const evidence = findCompletionEvidence(repoRoot, artifactsDir);
  if (!evidence.expanded_preflight) {
    addBlocker(
      blockers,
      'expanded_preflight_missing',
      'Missing expanded-scope preflight report with status=preflight_ready and no blockers.',
      'P1',
    );
  }
  if (!evidence.strict_product) {
    addBlocker(
      blockers,
      'strict_product_missing',
      'Missing strict staging report with status=passed and strict_product check passed.',
      'P1',
    );
  }

  if (normalizedScope === 'production') {
    if (!evidence.real_chain) {
      addBlocker(
        blockers,
        'real_chain_missing',
        'Missing Bilibili native real-chain report with status=passed and pre_release_real_chain check passed.',
        'P0',
      );
    }

    for (const platform of REQUIRED_REMOTE_PLATFORMS) {
      if (!evidence.remote_platforms[platform]) {
        addBlocker(
          blockers,
          `${platform}_remote_signoff_missing`,
          `Missing ${platform} remote production smoke/signoff report. Local mock reports do not count.`,
          'P0',
        );
      }
    }
  }

  const shouldRequireCleanGit = requireCleanGit ?? normalizedScope === 'production';
  const gitStatus = shouldRequireCleanGit ? collectGitStatus(repoRoot) : null;
  if (shouldRequireCleanGit && Array.isArray(gitStatus) && gitStatus.length > 0) {
    addBlocker(blockers, 'git_dirty', 'Working tree is not clean; create a release commit before production signoff.', 'P1', {
      changed_files: gitStatus.slice(0, 50),
      truncated: gitStatus.length > 50,
    });
  }

  return {
    status: blockers.length === 0 ? 'passed' : 'failed',
    scope: normalizedScope,
    generated_at: new Date().toISOString(),
    coverage,
    evidence,
    git: {
      clean_required: shouldRequireCleanGit,
      status_checked: shouldRequireCleanGit && Array.isArray(gitStatus),
      dirty_count: Array.isArray(gitStatus) ? gitStatus.length : null,
    },
    blockers,
  };
}

function formatMetric(metric) {
  return `${metric.percent}% (${metric.covered}/${metric.total})`;
}

function formatConsoleReport(result) {
  const lines = [];
  lines.push(result.status === 'passed' ? '== COMPLETION GATE PASS ==' : '== COMPLETION GATE FAIL ==');
  lines.push(`scope=${result.scope}`);
  lines.push('');
  lines.push('Coverage:');
  for (const project of result.coverage) {
    if (project.missing) {
      lines.push(`  - ${project.name}: missing ${project.path}`);
      continue;
    }
    const metrics = project.metrics;
    lines.push(
      `  - ${project.name}: statements ${formatMetric(metrics.statements)}, branches ${formatMetric(metrics.branches)}, functions ${formatMetric(metrics.functions)}, lines ${formatMetric(metrics.lines)}`,
    );
  }
  lines.push('');
  lines.push('Evidence:');
  lines.push(`  - expanded preflight: ${result.evidence.expanded_preflight?.file ?? 'missing'}`);
  lines.push(`  - strict product: ${result.evidence.strict_product?.file ?? 'missing'}`);
  lines.push(`  - Bilibili real-chain: ${result.evidence.real_chain?.file ?? 'missing'}`);
  for (const platform of REQUIRED_REMOTE_PLATFORMS) {
    lines.push(`  - ${platform} remote signoff: ${result.evidence.remote_platforms[platform]?.file ?? 'missing'}`);
  }
  if (result.git.clean_required) {
    lines.push(`  - clean git required: dirty_count=${String(result.git.dirty_count)}`);
  }

  if (result.blockers.length > 0) {
    lines.push('');
    lines.push('Blockers:');
    for (const blocker of result.blockers) {
      lines.push(`  - [${blocker.severity}] ${blocker.code}: ${blocker.message}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function writeGateReport(reportPath, result) {
  if (!reportPath) return null;
  const outputPath = resolve(process.cwd(), reportPath);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  return outputPath;
}

function isDirectExecution() {
  const entry = process.argv[1];
  return Boolean(entry) && import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (isDirectExecution()) {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    process.exit(0);
  }

  const result = runCompletionGate(options);
  const outputPath = writeGateReport(options.reportPath, result);
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    process.stdout.write(formatConsoleReport(result));
    if (outputPath) {
      console.log(`Report written to ${outputPath}`);
    }
  }
  process.exit(result.status === 'passed' ? 0 : 1);
}
