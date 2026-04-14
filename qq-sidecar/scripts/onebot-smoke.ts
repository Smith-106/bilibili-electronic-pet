import { createServer as createHttpServer } from 'node:http';
import { AddressInfo } from 'node:net';

import { createServer } from '../src/server.js';

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

async function readJsonBody(request: Parameters<typeof createHttpServer>[0] extends (
  req: infer T,
  ...args: never[]
) => unknown
  ? T
  : never): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const text = Buffer.concat(chunks).toString('utf8');
  return text.trim() ? (JSON.parse(text) as Record<string, unknown>) : {};
}

async function listen(server: ReturnType<typeof createHttpServer>): Promise<AddressInfo> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  return server.address() as AddressInfo;
}

async function main(): Promise<void> {
  const recordedRequests: RecordedRequest[] = [];

  const onebotServer = createHttpServer(async (request, response) => {
    if (request.method !== 'POST') {
      response.writeHead(405, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ status: 'failed', retcode: 1405 }));
      return;
    }

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

  const onebotAddress = await listen(onebotServer);
  const onebotBaseUrl = `http://127.0.0.1:${onebotAddress.port}`;

  const sidecar = createServer({
    QQ_DRIVER_MODE: 'onebot_http',
    QQ_ONEBOT_URL: onebotBaseUrl,
    QQ_ONEBOT_TOKEN: 'onebot-token',
    QQ_SIDECAR_TOKEN: 'sidecar-token',
  });

  try {
    const health = await sidecar.inject({ method: 'GET', url: '/health' });
    assert(health.statusCode === 200, `health expected 200, got ${health.statusCode}`);
    const healthBody = health.json();
    assert(healthBody.mode === 'onebot_http', 'health mode should be onebot_http');
    assert(healthBody.onebot_configured === true, 'health should report onebot_configured=true');

    const groupPublish = await sidecar.inject({
      method: 'POST',
      url: '/publish',
      headers: { authorization: 'Bearer sidecar-token' },
      payload: {
        platform: 'qq',
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
        force_publish: false,
        trace_id: 'trace-group-1',
      },
    });
    assert(groupPublish.statusCode === 200, `group publish expected 200, got ${groupPublish.statusCode}`);
    assert(groupPublish.json().reason === 'onebot_http_ok', 'group publish should return onebot_http_ok');

    const privatePublish = await sidecar.inject({
      method: 'POST',
      url: '/publish',
      headers: { authorization: 'Bearer sidecar-token' },
      payload: {
        platform: 'qq',
        comment_id: 'message-private-1',
        canonical_id: 'qq:message-private-1',
        routing_metadata: {
          chat_type: 'private',
          user_id: 'user-99',
        },
        reply_text: 'hello private',
        force_publish: false,
        trace_id: 'trace-private-1',
      },
    });
    assert(privatePublish.statusCode === 200, `private publish expected 200, got ${privatePublish.statusCode}`);
    assert(privatePublish.json().reason === 'onebot_http_ok', 'private publish should return onebot_http_ok');

    assert(recordedRequests.length === 2, `expected 2 recorded requests, got ${recordedRequests.length}`);

    const [groupRequest, privateRequest] = recordedRequests;
    assert(groupRequest.url === '/send_group_msg', `group request url mismatch: ${groupRequest.url}`);
    assert(groupRequest.authorization === 'Bearer onebot-token', 'group request token mismatch');
    assert(groupRequest.payload.group_id === 'group-42', 'group request should include group_id');
    assert(Array.isArray(groupRequest.payload.message), 'group request message should be an array');

    assert(privateRequest.url === '/send_private_msg', `private request url mismatch: ${privateRequest.url}`);
    assert(privateRequest.authorization === 'Bearer onebot-token', 'private request token mismatch');
    assert(privateRequest.payload.user_id === 'user-99', 'private request should include user_id');
    assert(Array.isArray(privateRequest.payload.message), 'private request message should be an array');

    console.log('QQ sidecar OneBot smoke passed.');
    console.log(
      JSON.stringify(
        {
          onebot_base_url: onebotBaseUrl,
          checks: [
            'health:onebot_http',
            'publish:group',
            'publish:private',
          ],
          recorded_requests: recordedRequests,
        },
        null,
        2,
      ),
    );
  } finally {
    await sidecar.close();
    await new Promise<void>((resolve, reject) => {
      onebotServer.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
