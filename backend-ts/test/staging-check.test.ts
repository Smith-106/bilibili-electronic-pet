import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

const currentFile = fileURLToPath(import.meta.url);
const testDir = dirname(currentFile);
const backendRoot = resolve(testDir, '..');
const scriptPath = resolve(backendRoot, 'scripts/staging-check.mjs');
const tempDirs = [];

function buildSpawnEnv() {
  return {
    PATH: process.env.PATH ?? '',
    PATHEXT: process.env.PATHEXT ?? '',
    SystemRoot: process.env.SystemRoot ?? '',
    TEMP: process.env.TEMP ?? '',
    TMP: process.env.TMP ?? '',
    ComSpec: process.env.ComSpec ?? '',
  };
}

function runPreflight(envText) {
  const tempDir = mkdtempSync(join(tmpdir(), 'staging-check-'));
  const envFile = join(tempDir, 'preflight.env');
  const reportPath = join(tempDir, 'report.json');
  tempDirs.push(tempDir);

  writeFileSync(envFile, envText, 'utf8');

  const result = spawnSync(
    process.execPath,
    [scriptPath, '--preflight-only', '--env-file', envFile, '--report', reportPath],
    {
      cwd: backendRoot,
      env: buildSpawnEnv(),
      encoding: 'utf8',
    },
  );

  return {
    result,
    report: JSON.parse(readFileSync(reportPath, 'utf8')),
  };
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('staging-check external-delivery preflight', () => {
  it('reports missing prerequisites for real delivery capabilities', () => {
    const { result, report } = runPreflight(`
LLM_PROVIDER=openai
SEARCH_PROVIDER=google
PUBLISHER_MODE=webhook
BILIBILI_ENABLED=true
BILIBILI_PUBLISH_ENABLED=true
`);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('== STAGING PREFLIGHT COMPLETE ==');
    expect(result.stdout).toContain('preflight llm_generation: status=missing_inputs');
    expect(result.stdout).toContain('preflight search_enrichment: status=missing_inputs');
    expect(result.stdout).toContain('preflight webhook_publish: status=missing_inputs');
    expect(result.stdout).toContain('preflight native_bilibili_publish: status=runtime_credentials_required');
    expect(report.status).toBe('preflight_incomplete');
    expect(report.delivery_preflight.blockers).toEqual([
      'llm_generation',
      'search_enrichment',
      'webhook_publish',
      'native_bilibili_publish',
    ]);
    expect(report.delivery_preflight.capabilities.map((entry) => entry.capability)).toEqual([
      'llm_generation',
      'search_enrichment',
      'webhook_publish',
      'native_bilibili_publish',
    ]);
  });

  it('reports a ready preflight when delivery prerequisites are configured', () => {
    const { result, report } = runPreflight(`
LLM_PROVIDER=openai
LLM_API_KEY=sk-test
SEARCH_PROVIDER=google
SEARCH_API_KEY=search-key
SEARCH_CX=test-cx
PUBLISHER_MODE=webhook
PUBLISHER_WEBHOOK_URL=https://example.com/webhook
BILIBILI_ENABLED=true
BILIBILI_PUBLISH_ENABLED=true
BILIBILI_SESSDATA=test-sess
BILIBILI_BILI_JCT=test-jct
BILIBILI_BUVID3=test-buvid3
CREDENTIAL_ENCRYPTION_KEY=test-secret
`);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('preflight llm_generation: status=configured');
    expect(result.stdout).toContain('preflight search_enrichment: status=configured');
    expect(result.stdout).toContain('preflight webhook_publish: status=configured');
    expect(result.stdout).toContain('preflight native_bilibili_publish: status=configured');
    expect(report.status).toBe('preflight_ready');
    expect(report.delivery_preflight.blockers).toEqual([]);
    expect(
      report.delivery_preflight.capabilities.every((entry) => entry.status === 'configured'),
    ).toBe(true);
  });

  it('treats real_publish mode as native delivery capability and reports missing credentials', () => {
    const { result, report } = runPreflight(`
LLM_PROVIDER=openai
LLM_API_KEY=sk-test
SEARCH_PROVIDER=serpapi
SEARCH_API_KEY=search-key
PUBLISHER_MODE=real_publish
`);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('preflight native_bilibili_publish: status=runtime_credentials_required');
    expect(report.status).toBe('preflight_incomplete');
    expect(report.delivery_preflight.blockers).toContain('native_bilibili_publish');

    const nativeEntry = report.delivery_preflight.capabilities.find(
      (entry) => entry.capability === 'native_bilibili_publish',
    );
    expect(nativeEntry).toMatchObject({
      active: true,
      mode: 'real_publish',
      status: 'runtime_credentials_required',
    });
  });
});
