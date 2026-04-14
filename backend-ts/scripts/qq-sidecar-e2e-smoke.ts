import { createServer as createHttpServer } from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { dirname, resolve } from 'node:path';

import { createServer as createBackendServer } from '../src/main.js';
import type { RuntimeSettings, ServerDependencies } from '../src/server/contracts.js';
import { createServer as createQqSidecarServer } from '../../qq-sidecar/src/server.js';

type RecordedRequest = {
  url: string;
  authorization?: string;
  payload: Record<string, unknown>;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function parseArgs(argv: string[]): { reportPath: string | null } {
  let reportPath: string | null = null;
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    const next = argv[index + 1];
    if (current === '--report' && next) {
      reportPath = next;
      index += 1;
      continue;
    }
    if (current.startsWith('--report=')) {
      reportPath = current.slice('--report='.length);
    }
  }
  return { reportPath };
}

function normalizeReportPath(reportPath: string): string {
  if (process.platform !== 'win32') {
    return reportPath;
  }

  const normalized = reportPath.replace(/\\/g, '/');
  const gitBashPathMatch = /^(?:[A-Za-z]:)?\/Program Files\/Git\/mnt\/([a-zA-Z])\/(.*)$/.exec(normalized);
  const wslPathMatch = /^\/mnt\/([a-zA-Z])\/(.*)$/.exec(normalized);
  const match = gitBashPathMatch ?? wslPathMatch;
  if (!match) {
    return reportPath;
  }

  const [, driveLetter, remainder] = match;
  const windowsRemainder = remainder.replace(/\//g, '\\');
  return `${driveLetter.toUpperCase()}:\\${windowsRemainder}`;
}

function writeReport(reportPath: string | null, report: Record<string, unknown>): string | null {
  if (!reportPath) return null;
  const outputPath = resolve(process.cwd(), normalizeReportPath(reportPath));
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return outputPath;
}

async function readJsonBody(request: Parameters<typeof createHttpServer>[0] extends (req: infer T, ...args: never[]) => unknown ? T : never) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const text = Buffer.concat(chunks).toString('utf8');
  return text.trim() ? (JSON.parse(text) as Record<string, unknown>) : {};
}

async function listenNodeServer(server: ReturnType<typeof createHttpServer>): Promise<AddressInfo> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  return server.address() as AddressInfo;
}

function buildSettings(overrides: Partial<RuntimeSettings> = {}): RuntimeSettings {
  return {
    databaseUrl: 'file:./smoke.db',
    celeryBrokerUrl: 'redis://localhost:6379/0',
    celeryResultBackend: 'redis://localhost:6379/1',
    apiKey: '',
    llmProvider: 'mock',
    llmApiKeyConfigured: false,
    llmFallbackToMock: true,
    searchProvider: 'serpapi',
    searchApiKeyConfigured: false,
    searchCxConfigured: false,
    publisherMode: 'webhook',
    publisherWebhookUrlConfigured: false,
    bilibiliEnabled: false,
    bilibiliPollEnabled: false,
    bilibiliPollIntervalSeconds: 300,
    bilibiliPublishEnabled: false,
    bilibiliEnvCredentialConfigured: false,
    killSwitch: false,
    gatewayToken: '',
    gatewayHmacSecret: '',
    platformBilibiliEnabled: false,
    platformQqEnabled: true,
    platformDouyinEnabled: false,
    platformKuaishouEnabled: false,
    platformBilibiliPublishSource: 'bilibili-bot',
    platformQqPublishSource: 'qq-sidecar',
    platformDouyinPublishSource: 'douyin-bot',
    platformKuaishouPublishSource: 'kuaishou-bot',
    ...overrides,
  };
}

async function main(): Promise<void> {
  const { reportPath } = parseArgs(process.argv.slice(2));
  const recordedRequests: RecordedRequest[] = [];
  const report: Record<string, unknown> = {
    started_at: new Date().toISOString(),
    mode: 'qq-e2e',
    status: 'running',
  };

  const onebotServer = createHttpServer(async (request, response) => {
    const payload = await readJsonBody(request);
    recordedRequests.push({
      url: request.url ?? '/',
      authorization: request.headers.authorization,
      payload,
    });

    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(
      JSON.stringify({
        status: 'ok',
        retcode: 0,
        data: { message_id: `mock-${recordedRequests.length}` },
      }),
    );
  });

  const onebotAddress = await listenNodeServer(onebotServer);
  const onebotBaseUrl = `http://127.0.0.1:${onebotAddress.port}`;
  report.onebot_base_url = onebotBaseUrl;

  const sidecar = createQqSidecarServer({
    QQ_DRIVER_MODE: 'onebot_http',
    QQ_ONEBOT_URL: onebotBaseUrl,
    QQ_ONEBOT_TOKEN: 'onebot-token',
    QQ_SIDECAR_TOKEN: 'sidecar-token',
  });
  const sidecarUrl = await sidecar.listen({ port: 0, host: '127.0.0.1' });
  report.sidecar_url = sidecarUrl;

  const originalWebhookUrl = process.env.PLATFORM_QQ_WEBHOOK_URL;
  const originalWebhookToken = process.env.PLATFORM_QQ_WEBHOOK_TOKEN;
  process.env.PLATFORM_QQ_WEBHOOK_URL = `${sidecarUrl}/publish`;
  process.env.PLATFORM_QQ_WEBHOOK_TOKEN = 'sidecar-token';

  const finalized: Array<Record<string, unknown>> = [];
  const backend = createBackendServer({
    settings: buildSettings(),
    checkDatabaseConnection: async () => ({ connected: true }),
    checkRedisConnection: async () => ({ connected: true }),
    buildBilibiliDiagnostics: async () => ({
      ready: false,
      blocking_reasons: [],
      effective_publish_mode: 'webhook',
      signals: {},
      checks: { worker_or_publish: { ready: true, errors: [] } },
      release_gates: { worker_or_publish_ready: true },
    }),
    reservePublishLog: () => ({ duplicate: false, reservationKey: `reservation-${finalized.length + 1}` }),
    finalizePublishLog: (input) => {
      finalized.push(input as unknown as Record<string, unknown>);
    },
  } satisfies Partial<ServerDependencies>);

  try {
    const groupResponse = await backend.inject({
      method: 'POST',
      url: '/gateway/publish/qq',
      payload: {
        comment_id: 'message-group-1',
        canonical_id: 'qq:message-group-1',
        container_id: 'group-42',
        user_id: 'user-42',
        parent_external_id: 'message-root-42',
        routing_metadata: {
          chat_type: 'group',
          adapter: 'napcat',
        },
        reply_text: 'hello group',
        source: 'manual',
        force_publish: false,
        trace_id: 'trace-group-1',
      },
    });
    assert(groupResponse.statusCode === 200, `group publish expected 200, got ${groupResponse.statusCode}`);
    assert(groupResponse.json().published === true, 'group publish should succeed');

    const privateResponse = await backend.inject({
      method: 'POST',
      url: '/gateway/publish/qq',
      payload: {
        comment_id: 'message-private-1',
        canonical_id: 'qq:message-private-1',
        user_id: 'user-99',
        routing_metadata: {
          chat_type: 'private',
          adapter: 'napcat',
        },
        reply_text: 'hello private',
        source: 'manual',
        force_publish: false,
        trace_id: 'trace-private-1',
      },
    });
    assert(privateResponse.statusCode === 200, `private publish expected 200, got ${privateResponse.statusCode}`);
    assert(privateResponse.json().published === true, 'private publish should succeed');

    assert(recordedRequests.length === 2, `expected 2 OneBot requests, got ${recordedRequests.length}`);
    assert(finalized.length === 2, `expected 2 finalized publish logs, got ${finalized.length}`);

    const [groupRequest, privateRequest] = recordedRequests;
    assert(groupRequest.url === '/send_group_msg', `group request url mismatch: ${groupRequest.url}`);
    assert(groupRequest.authorization === 'Bearer onebot-token', 'group request token mismatch');
    assert(groupRequest.payload.group_id === 'group-42', 'group request should include group_id');

    assert(privateRequest.url === '/send_private_msg', `private request url mismatch: ${privateRequest.url}`);
    assert(privateRequest.authorization === 'Bearer onebot-token', 'private request token mismatch');
    assert(privateRequest.payload.user_id === 'user-99', 'private request should include user_id');

    report.completed_at = new Date().toISOString();
    report.status = 'passed';
    report.finalized = finalized;
    report.recorded_requests = recordedRequests;
    const outputPath = writeReport(reportPath, report);

    console.log('Backend -> QQ sidecar -> OneBot smoke passed.');
    if (outputPath) {
      console.log(`Report written to ${outputPath}`);
    }
    console.log(
      JSON.stringify(
        {
          sidecar_url: sidecarUrl,
          onebot_base_url: onebotBaseUrl,
          finalized,
          recorded_requests: recordedRequests,
        },
        null,
        2,
      ),
    );
  } finally {
    await backend.close();
    await sidecar.close();
    await new Promise<void>((resolve, reject) => {
      onebotServer.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    if (originalWebhookUrl === undefined) {
      delete process.env.PLATFORM_QQ_WEBHOOK_URL;
    } else {
      process.env.PLATFORM_QQ_WEBHOOK_URL = originalWebhookUrl;
    }
    if (originalWebhookToken === undefined) {
      delete process.env.PLATFORM_QQ_WEBHOOK_TOKEN;
    } else {
      process.env.PLATFORM_QQ_WEBHOOK_TOKEN = originalWebhookToken;
    }
  }
}

main().catch((error) => {
  const { reportPath } = parseArgs(process.argv.slice(2));
  const report = {
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    mode: 'qq-e2e',
    status: 'failed',
    error: error instanceof Error ? error.message : String(error),
  };
  const outputPath = writeReport(reportPath, report);
  console.error(error);
  if (outputPath) {
    console.error(`Report written to ${outputPath}`);
  }
  process.exit(1);
});
