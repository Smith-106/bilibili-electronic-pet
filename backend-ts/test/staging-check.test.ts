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

function runPreflight(envText, extraArgs = []) {
  const tempDir = mkdtempSync(join(tmpdir(), 'staging-check-'));
  const envFile = join(tempDir, 'preflight.env');
  const reportPath = join(tempDir, 'report.json');
  tempDirs.push(tempDir);

  writeFileSync(envFile, envText, 'utf8');

  const result = spawnSync(
    process.execPath,
    [scriptPath, '--preflight-only', ...extraArgs, '--env-file', envFile, '--report', reportPath],
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

async function runStrictWithStubRuntime(
  envText,
  options: {
    forceLoginCurlFallback?: boolean;
  } = {},
) {
  const tempDir = mkdtempSync(join(tmpdir(), 'staging-check-strict-'));
  const envFile = join(tempDir, 'strict.env');
  const reportPath = join(tempDir, 'report.json');
  tempDirs.push(tempDir);
  const stubSessionToken = 'stub-session-token';
  let loginAttempts = 0;

  writeFileSync(envFile, envText, 'utf8');

  async function readJsonBody(request) {
    const chunks = [];
    for await (const chunk of request) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    if (chunks.length === 0) {
      return {};
    }

    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }

  const sockets = new Set();
  const server = createHttpServer(async (request, response) => {
    const url = request.url ?? '/';
    response.setHeader('Connection', 'close');
    if (url === '/health') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ ok: true }));
      return;
    }
    if (url === '/admin') {
      response.writeHead(200, { 'Content-Type': 'text/html' });
      response.end(
        '<!doctype html><html><head><link rel="stylesheet" href="/assets/app.css"></head><body><script src="/assets/app.js"></script></body></html>',
      );
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
          product_ready: true,
          foundation_blockers: [],
          delivery_blockers: [],
          product_blockers: [],
          delivery_capability_blockers: [],
          delivery_capabilities: {
            blockers: [],
            capabilities: [
              { capability: 'llm_generation', status: 'configured', mode: 'openai', missing_inputs: [] },
              { capability: 'search_enrichment', status: 'configured', mode: 'serpapi', missing_inputs: [] },
              { capability: 'webhook_publish', status: 'configured', mode: 'webhook', missing_inputs: [] },
              { capability: 'native_bilibili_publish', status: 'inactive', mode: 'webhook', missing_inputs: [] },
              { capability: 'comment_ingress_auth', status: 'configured', mode: 'token', missing_inputs: [] },
            ],
            summary: [
              { capability: 'llm_generation', status: 'configured', mode: 'openai', missing_inputs: [] },
              { capability: 'search_enrichment', status: 'configured', mode: 'serpapi', missing_inputs: [] },
              { capability: 'webhook_publish', status: 'configured', mode: 'webhook', missing_inputs: [] },
              { capability: 'native_bilibili_publish', status: 'inactive', mode: 'webhook', missing_inputs: [] },
              { capability: 'comment_ingress_auth', status: 'configured', mode: 'token', missing_inputs: [] },
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
          completion_matrix: {
            scope: 'repo_controlled_product_completion',
            total: 100,
            categories: {
              ui_ux: 100,
              frontend: 100,
              backend: 100,
              frontend_backend_loop: 100,
              test: 100,
              deploy: 100,
            },
          },
          product_readiness: {
            scope: {
              key: 'bilibili_first_admin_companion_mvp',
              summary: 'Bilibili-first admin/backend/companion MVP',
              signed_off_surfaces: [
                'admin_control_plane',
                'bilibili_delivery_contract',
                'pet_core',
                'companion_surface',
              ],
              gated_surfaces: ['external_platform_trial'],
              excluded_surfaces: [],
            },
            bilibili_delivery_contract: {
              ready: true,
              effective_publish_mode: 'webhook',
              delivery_capability_blocker_count: 0,
              delivery_blocker_count: 0,
            },
            pet_core: {
              ready: true,
              signed_off: true,
              pet_name: 'Mochi',
              relationship_level: 'bonded',
              proactive_signal_count: 1,
            },
            companion_surface: {
              ready: true,
              signed_off: true,
              pet_name: 'Mochi',
              status_line: 'Trial ready',
              interaction_count: 1,
              protected_actions_required: true,
            },
            admin_control_plane: {
              ready: true,
              auth_configured: true,
              comment_ingress_auth_configured: true,
              public_companion_actions_enabled: false,
              platform_status_available: true,
              platform_count: 2,
              operator_managed_platforms: 2,
            },
            bilibili_reference_platform: {
              ready: true,
              status: 'connected',
              adapter_key: 'bilibili-reference',
            },
            external_platform_trial: {
              ready: true,
              active_platforms: [
                {
                  platform: 'douyin',
                  status: 'connected',
                  adapter_key: 'douyin-sidecar-trial',
                  rollout_enabled: true,
                  rollout_stage: 'trial',
                },
              ],
            },
            completion_matrix: {
              scope: 'repo_controlled_product_completion',
              total: 100,
            },
          },
          kill_switch: false,
        }),
      );
      return;
    }
    if (url === '/companion/state-v2') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(
        JSON.stringify({
          version: 'v2',
          snapshot: {
            profile: {
              petName: 'Mochi',
              species: 'fox spirit',
              archetype: 'listener',
            },
            relationship: {
              level: 'bonded',
              note: 'Operators keep the loop healthy.',
            },
            progress: {
              stage: 'growth',
              progressLabel: 'Trial-ready',
              nextMilestone: 'Signoff',
            },
            needs: [],
            proactiveSignals: [{ key: 'checkin', label: 'Check-in', detail: 'Review douyin rollout.' }],
          },
          companion: {
            petName: 'Mochi',
            statusLine: 'Trial ready',
            loopMode: 'Pet-core',
            lastCheckIn: '2026-04-13T00:00:00.000Z',
            adapterLabel: 'Pet-core service',
            loopHint: 'Companion state is live.',
            mood: {
              label: 'Confident',
              note: 'Ready for rollout.',
            },
            memoryTitle: 'Pet-core summary',
            memorySummary: 'Companion state is live.',
            vitals: [],
            recentSignals: [],
            recentInteractions: [],
          },
        }),
      );
      return;
    }
    if (url === '/api/admin/session/login' && request.method === 'POST') {
      loginAttempts += 1;
      if (options.forceLoginCurlFallback && loginAttempts === 1) {
        response.writeHead(403, { 'Content-Type': 'text/html' });
        response.end('<!doctype html><html><body>challenge</body></html>');
        return;
      }

      const body = await readJsonBody(request);
      if (body.api_key !== 'runtime-key') {
        response.writeHead(401, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ detail: 'unauthorized' }));
        return;
      }

      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(
        JSON.stringify({
          ok: true,
          session_token: stubSessionToken,
          expires_at: '2026-06-08T10:00:00.000Z',
        }),
      );
      return;
    }
    if (url === '/api/admin/overview') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ ok: true }));
      return;
    }
    if (url === '/companion/actions' && request.method === 'POST') {
      const body = await readJsonBody(request);
      if (request.headers['x-admin-session'] !== stubSessionToken) {
        response.writeHead(401, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ detail: 'unauthorized' }));
        return;
      }
      if (body.action !== 'pat') {
        response.writeHead(400, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ detail: 'action_invalid' }));
        return;
      }

      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ ok: true, action: 'pat', item_key: 'action:pat-latest' }));
      return;
    }
    if (url === '/api/admin/pet/overview') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(
        JSON.stringify({
          ok: true,
          item: {
            version: 'v2',
            snapshot: {
              profile: {
                petName: 'Mochi',
              },
              proactiveSignals: [{ key: 'checkin', label: 'Check-in', detail: 'Review douyin rollout.' }],
            },
          },
        }),
      );
      return;
    }
    if (url === '/api/admin/platforms') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(
        JSON.stringify({
          ok: true,
          items: [
            {
              platform: 'bilibili',
              enabled: true,
              adapterKey: 'bilibili-reference',
              status: 'connected',
              rolloutControl: {
                enabled: true,
                stage: 'trial',
              },
            },
            {
              platform: 'douyin',
              enabled: true,
              adapterKey: 'douyin-sidecar-trial',
              status: 'connected',
              rolloutControl: {
                enabled: true,
                stage: 'trial',
              },
            },
          ],
        }),
      );
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
        [
          scriptPath,
          '--strict',
          '--base-url',
          baseUrl,
          '--api-key',
          'runtime-key',
          '--env-file',
          envFile,
          '--report',
          reportPath,
        ],
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
      'comment_ingress_auth',
    ]);
    expect(report.delivery_preflight.capabilities.map((entry) => entry.capability)).toEqual([
      'llm_generation',
      'search_enrichment',
      'webhook_publish',
      'native_bilibili_publish',
      'comment_ingress_auth',
      'external_platform_trial',
    ]);
  });

  it('reports a ready preflight when delivery prerequisites are configured', () => {
    const { result, report } = runPreflight(`
LLM_PROVIDER=openai
LLM_API_KEY=sk-test
LLM_FALLBACK_TO_MOCK=false
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
COMMENT_INGRESS_TOKEN=comment-token
`);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('preflight llm_generation: status=configured');
    expect(result.stdout).toContain('preflight search_enrichment: status=configured');
    expect(result.stdout).toContain('preflight webhook_publish: status=configured');
    expect(result.stdout).toContain('preflight native_bilibili_publish: status=configured');
    expect(report.status).toBe('preflight_ready');
    expect(report.delivery_preflight.blockers).toEqual([]);
    expect(report.delivery_preflight.capabilities).toEqual([
      expect.objectContaining({ capability: 'llm_generation', status: 'configured' }),
      expect.objectContaining({ capability: 'search_enrichment', status: 'configured' }),
      expect.objectContaining({ capability: 'webhook_publish', status: 'configured' }),
      expect.objectContaining({ capability: 'native_bilibili_publish', status: 'configured' }),
      expect.objectContaining({ capability: 'comment_ingress_auth', status: 'configured' }),
      expect.objectContaining({ capability: 'external_platform_trial', status: 'inactive' }),
    ]);
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

  it('reports missing expanded-scope trial prerequisites when requested', () => {
    const { result, report } = runPreflight(
      `
LLM_PROVIDER=openai
LLM_API_KEY=sk-test
SEARCH_PROVIDER=serpapi
SEARCH_API_KEY=search-key
PUBLISHER_MODE=manual_queue
`,
      ['--expanded-scope-trial'],
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('preflight external_platform_trial: status=missing_inputs');
    expect(report.expanded_scope_trial).toBe(true);
    expect(report.delivery_preflight.blockers).toContain('external_platform_trial');

    const externalTrial = report.delivery_preflight.capabilities.find(
      (entry) => entry.capability === 'external_platform_trial',
    );
    expect(externalTrial).toMatchObject({
      active: true,
      mode: 'expanded_scope_trial',
      status: 'missing_inputs',
    });
    expect(externalTrial.missing_inputs).toEqual([
      'PLATFORM_DOUYIN_ENABLED=true',
      'PLATFORM_DOUYIN_WEBHOOK_URL',
      'PLATFORM_DOUYIN_PUBLISH_SOURCE',
      'PLATFORM_QQ_ENABLED=true',
      'PLATFORM_QQ_WEBHOOK_URL',
      'PLATFORM_QQ_PUBLISH_SOURCE',
    ]);
  });

  it('records runtime summary and warns when checker env differs from the target runtime', async () => {
    const { result, report } = await runStrictWithStubRuntime(`
LLM_PROVIDER=mock
SEARCH_PROVIDER=serpapi
PUBLISHER_MODE=manual_queue
`);

    if (result.status !== 0) {
      throw new Error(
        `strict stub failed: status=${String(result.status)}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
      );
    }
    expect(result.stdout).toContain('== STAGING CHECK PASS ==');
    expect(result.stderr).toContain('Checker env suggests missing or fallback delivery inputs');
    expect(report.status).toBe('passed');
    expect(report.warnings).toContain('checker_env_differs_from_target_runtime');
    expect(report.runtime_summary).toMatchObject({
      source: 'target_runtime',
      readiness: {
        foundation_ready: true,
        delivery_ready: true,
        product_ready: true,
      },
      publish: {
        mode: 'webhook',
      },
      pet_core: {
        public_state_version: 'v2',
        admin_state_version: 'v2',
        pet_name: 'Mochi',
      },
      platforms: {
        total: 2,
      },
      bilibili: {
        effective_publish_mode: 'webhook',
      },
    });
    expect(report.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'strict_product',
          status: 'passed',
          scope: 'bilibili_first_admin_companion_mvp',
          pet_core_signed_off: true,
          companion_surface_signed_off: true,
          completion_total: 100,
        }),
      ]),
    );
    expect(report.input_scopes).toMatchObject({
      checker_env: expect.stringContaining('staging-check itself'),
      target_runtime: expect.stringContaining('/readiness'),
    });
    expect(report.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'admin_session_login', status: 'passed' }),
        expect.objectContaining({ name: 'protected_companion_action', status: 'passed' }),
      ]),
    );
  });

  it('preserves POST body when retrying admin session login through curl fallback', async () => {
    const { result, report } = await runStrictWithStubRuntime(
      `
LLM_PROVIDER=mock
SEARCH_PROVIDER=serpapi
PUBLISHER_MODE=manual_queue
`,
      { forceLoginCurlFallback: true },
    );

    if (result.status !== 0) {
      throw new Error(
        `strict stub with curl fallback failed: status=${String(result.status)}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
      );
    }
    expect(result.stdout).toContain('== STAGING CHECK PASS ==');
    expect(result.stderr).toContain('/api/admin/session/login');
    expect(result.stderr).toContain('retrying with curl fallback');
    expect(report.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'admin_session_login', status: 'passed' }),
        expect.objectContaining({ name: 'protected_companion_action', status: 'passed' }),
      ]),
    );
  });
});
