import { mkdtempSync, writeFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  collectCoverageSummary,
  findCompletionEvidence,
  runCompletionGate,
  summarizeCoveragePayload,
} from '../scripts/completion-gate.mjs';

function coveredPayload({ branchCounts = [1, 1] } = {}) {
  return {
    '/repo/src/example.js': {
      path: '/repo/src/example.js',
      statementMap: {
        0: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
        1: { start: { line: 2, column: 0 }, end: { line: 2, column: 10 } },
      },
      fnMap: {
        0: { name: 'example', decl: {}, loc: {}, line: 1 },
      },
      branchMap: {
        0: { type: 'if', locations: [{}, {}], line: 1 },
      },
      s: { 0: 1, 1: 1 },
      f: { 0: 1 },
      b: { 0: branchCounts },
    },
  };
}

async function writeJson(path, payload) {
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

test('summarizeCoveragePayload requires every branch to be covered', () => {
  const summary = summarizeCoveragePayload(coveredPayload({ branchCounts: [1, 0] }));

  assert.equal(summary.statements.complete, true);
  assert.equal(summary.functions.complete, true);
  assert.equal(summary.lines.complete, true);
  assert.equal(summary.branches.complete, false);
  assert.equal(summary.branches.percent, 50);
});

test('collectCoverageSummary reports missing coverage-final.json', () => {
  const root = mkdtempSync(join(tmpdir(), 'completion-gate-'));
  const summary = collectCoverageSummary(root, [{ name: 'missing-project', coveragePath: 'missing/coverage-final.json' }]);

  assert.equal(summary.length, 1);
  assert.equal(summary[0].ok, false);
  assert.equal(summary[0].missing, true);
});

test('findCompletionEvidence accepts strict reports and rejects local-only remote smoke reports', async () => {
  const root = mkdtempSync(join(tmpdir(), 'completion-gate-'));
  const artifacts = join(root, '.artifacts', 'staging');
  await mkdir(artifacts, { recursive: true });

  await writeJson(join(artifacts, 'expanded.json'), {
    status: 'preflight_ready',
    preflight_only: true,
    expanded_scope_trial: true,
    delivery_preflight: { blockers: [] },
  });
  await writeJson(join(artifacts, 'strict.json'), {
    status: 'passed',
    strict: true,
    checks: [{ name: 'strict_product', status: 'passed' }],
  });
  await writeJson(join(artifacts, 'qq-local.json'), {
    status: 'passed',
    platform: 'qq',
    onebot_base_url: 'http://127.0.0.1:3000',
  });
  await writeJson(join(artifacts, 'douyin-remote.json'), {
    status: 'passed',
    platform: 'douyin',
    target_url: 'https://douyin-remote-signoff.internal/publish',
  });

  const evidence = findCompletionEvidence(root);

  assert.ok(evidence.expanded_preflight);
  assert.ok(evidence.strict_product);
  assert.equal(evidence.remote_platforms.qq, null);
  assert.ok(evidence.remote_platforms.douyin);
});

test('runCompletionGate passes production only when all external signoff evidence exists', async () => {
  const root = mkdtempSync(join(tmpdir(), 'completion-gate-'));
  const project = { name: 'sample', coveragePath: 'sample/coverage/coverage-final.json' };
  await mkdir(join(root, 'sample', 'coverage'), { recursive: true });
  writeFileSync(join(root, project.coveragePath), `${JSON.stringify(coveredPayload())}\n`, 'utf8');

  const artifacts = join(root, '.artifacts', 'staging');
  await mkdir(artifacts, { recursive: true });
  await writeJson(join(artifacts, 'expanded.json'), {
    status: 'preflight_ready',
    preflight_only: true,
    expanded_scope_trial: true,
    delivery_preflight: { blockers: [] },
  });
  await writeJson(join(artifacts, 'strict.json'), {
    status: 'passed',
    strict: true,
    checks: [{ name: 'strict_product', status: 'passed' }],
  });
  await writeJson(join(artifacts, 'real-chain.json'), {
    status: 'passed',
    strict: true,
    pre_release_real_chain: true,
    checks: [{ name: 'pre_release_real_chain', status: 'passed' }],
  });
  await writeJson(join(artifacts, 'qq-remote.json'), {
    status: 'passed',
    platform: 'qq',
    production_signoff: true,
    target_url: 'https://qq-remote-signoff.internal/publish',
  });
  await writeJson(join(artifacts, 'douyin-remote.json'), {
    status: 'passed',
    platform: 'douyin',
    remote: true,
    target_url: 'https://douyin-remote-signoff.internal/publish',
  });

  const result = runCompletionGate({
    repoRoot: root,
    scope: 'production',
    projects: [project],
    requireCleanGit: false,
  });

  assert.equal(result.status, 'passed');
  assert.equal(result.blockers.length, 0);
});
