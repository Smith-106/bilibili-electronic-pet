import { spawn, spawnSync } from 'node:child_process';
import { createServer as createHttpServer } from 'node:http';
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

async function runStrictWithStubRuntime(envText) {
  const tempDir = mkdtempSync(join(tmpdir(), 'staging-check-strict-'));
  const envFile = join(tempDir, 'strict.env');
  const reportPath = join(tempDir, 'report.json');
  tempDirs.push(tempDir);

  writeFileSync(envFile, envText, 'utf8');

  const sockets = new Set();
  const server = createHttpServer((request, response) => {
    const url = request.url ?? '/';
    response.setHeader('Connection', 'close');
    if (url === '/health') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ ok: true }));
      return;
    }
    if (url === '/admin') {
      response.writeHead(200, { 'Content-Type': 'text/html' });
      response.end('<!doctype html><html><head><link rel="stylesheet" href="/assets/app.css"></head><body><script src="/assets/app.js"></script></body></html>');
      return;
    }
    if (url === '/assets/app.js') {
      response.writeHead(200, { 'Content-Type': 'application/javascript' });
      response.end('console.log("ok");');
      return;
    }
    if (url === '/assets/app.css') {
      response.writeHead(200, { 'Content-Type': 'text/css' });
      response.end('body { color: #000; }');
      return;
    }
    if (url === '/readiness') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(
        JSON.stringify({
          ready: true,
          foundation_ready: true,
          delivery_ready: true,
          foundation_blockers: [],
          delivery_blockers: [],
          delivery_capability_blockers: [],
          delivery_capabilities: {
            blockers: [],
            capabilities: [
              { capability: 'llm_generation', status: 'configured', mode: 'openai', missing_inputs: [] },
              { capability: 'search_enrichment', status: 'configured', mode: 'serpapi', missing_inputs: [] },
              { capability: 'webhook_publish', status: 'configured', mode: 'webhook', missing_inputs: [] },
              { capability: 'native_bilibili_publish', status: 'inactive', mode: 'webhook', missing_inputs: [] },
            ],
            summary: [
              { capability: 'llm_generation', status: 'configured', mode: 'openai', missing_inputs: [] },
              { capability: 'search_enrichment', status: 'configured', mode: 'serpapi', missing_inputs: [] },
              { capability: 'webhook_publish', status: 'configured', mode: 'webhook', missing_inputs: [] },
              { capability: 'native_bilibili_publish', status: 'inactive', mode: 'webhook', missing_inputs: [] },
            ],
          },
          config: {
            llm_provider: 'openai',
            llm_api_key_configured: true,
            search_provider: 'serpapi',
            search_api_key_configured: true,
            search_cx_configured: false,
          },
          publish: {
            mode: 'webhook',
            webhook_url_configured: true,
            bilibili_enabled: false,
            bilibili_publish_enabled: false,
            bilibili_env_credential_configured: false,
          },
          kill_switch: false,
        }),
      );
      return;
    }
    if (url === '/api/admin/overview') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ ok: true }));
      return;
    }
    if (url === '/api/admin/bilibili/status') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(
        JSON.stringify({
          ok: true,
          diagnostics: {
            ready: true,
            effective_publish_mode: 'webhook',
            blocking_reasons: [],
            checks: {
              worker_or_publish: {
                ready: true,
                errors: [],
              },
            },
            release_gates: {
              worker_or_publish_ready: true,
            },
            signals: {
              effective_publish_mode: 'webhook',
            },
          },
        }),
      );
      return;
    }

    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('not found');
  });
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const result = await new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [scriptPath, '--strict', '--base-url', baseUrl, '--api-key', 'runtime-key', '--env-file', envFile, '--report', reportPath],
        {
          cwd: backendRoot,
          env: buildSpawnEnv(),
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
      child.on('error', reject);
      child.on('close', (code, signal) => {
        resolve({
          status: code,
          signal,
          stdout,
          stderr,
        });
      });
    });

    return {
      result,
      report: JSON.parse(readFileSync(reportPath, 'utf8')),
    };
  } finally {
    for (const socket of sockets) {
      socket.destroy();
    }
    await new Promise((resolve) => server.close(resolve));
  }
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

  it('records runtime summary and warns when checker env differs from the target runtime', async () => {
    const { result, report } = await runStrictWithStubRuntime(`
LLM_PROVIDER=mock
SEARCH_PROVIDER=serpapi
PUBLISHER_MODE=manual_queue
`);

    if (result.status !== 0) {
      throw new Error(`strict stub failed: status=${String(result.status)}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
    }
    expect(result.stdout).toContain('== STAGING CHECK PASS ==');
    expect(result.stderr).toContain('Checker env suggests missing or fallback delivery inputs');
    expect(report.status).toBe('passed');
    expect(report.warnings).toContain('checker_env_differs_from_target_runtime');
    expect(report.runtime_summary).toMatchObject({
      source: 'target_runtime',
      readiness: {
        ready: true,
        foundation_ready: true,
        delivery_ready: true,
      },
      publish: {
        mode: 'webhook',
      },
      bilibili: {
        effective_publish_mode: 'webhook',
      },
    });
    expect(report.input_scopes).toMatchObject({
      checker_env: expect.stringContaining('staging-check itself'),
      target_runtime: expect.stringContaining('/readiness'),
    });
  });
});
