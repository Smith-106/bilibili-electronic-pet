import { createServer } from 'node:http';
import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveSidecarUrls, runRemotePlatformSmoke } from '../scripts/remote-platform-smoke.mjs';

async function withServer(handler, callback) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    return await callback(baseUrl);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

test('resolveSidecarUrls accepts either a base url or publish url', () => {
  assert.deepEqual(resolveSidecarUrls('https://sidecar.example.test'), {
    publishUrl: 'https://sidecar.example.test/publish',
    healthUrl: 'https://sidecar.example.test/health',
  });
  assert.deepEqual(resolveSidecarUrls('https://sidecar.example.test/api/publish'), {
    publishUrl: 'https://sidecar.example.test/api/publish',
    healthUrl: 'https://sidecar.example.test/api/health',
  });
});

test('runRemotePlatformSmoke sends a Douyin payload and produces non-production local test evidence', async () => {
  const seen = {};
  await withServer(async (request, response) => {
    if (request.url === '/health') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ ok: true, service: 'douyin-sidecar', mode: 'webhook_proxy' }));
      return;
    }
    if (request.url === '/publish') {
      seen.authorization = request.headers.authorization;
      seen.payload = await readJson(request);
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ published: true, reason: 'remote_ok' }));
      return;
    }
    response.writeHead(404);
    response.end();
  }, async (baseUrl) => {
    const report = await runRemotePlatformSmoke({
      platform: 'douyin',
      url: baseUrl,
      token: 'sidecar-token',
      confirmRemote: true,
      allowLocal: true,
      commentId: 'douyin-smoke-1',
      traceId: 'trace-douyin-smoke-1',
      replyText: 'hello douyin',
    });

    assert.equal(report.status, 'passed');
    assert.equal(report.platform, 'douyin');
    assert.equal(report.remote, false);
    assert.equal(report.production_signoff, false);
    assert.equal(seen.authorization, 'Bearer sidecar-token');
    assert.deepEqual(seen.payload, {
      platform: 'douyin',
      comment_id: 'douyin-smoke-1',
      reply_text: 'hello douyin',
      force_publish: false,
      trace_id: 'trace-douyin-smoke-1',
    });
  });
});

test('runRemotePlatformSmoke sends QQ private routing metadata', async () => {
  const seen = {};
  await withServer(async (request, response) => {
    if (request.url === '/health') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ ok: true, service: 'qq-sidecar', mode: 'onebot_http' }));
      return;
    }
    if (request.url === '/publish') {
      seen.payload = await readJson(request);
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ published: true, reason: 'onebot_http_ok' }));
      return;
    }
    response.writeHead(404);
    response.end();
  }, async (baseUrl) => {
    const report = await runRemotePlatformSmoke({
      platform: 'qq',
      url: `${baseUrl}/publish`,
      confirmRemote: true,
      allowLocal: true,
      qqTarget: 'private',
      qqUserId: 'user-42',
      commentId: 'qq-smoke-1',
      traceId: 'trace-qq-smoke-1',
      replyText: 'hello qq',
    });

    assert.equal(report.status, 'passed');
    assert.equal(seen.payload.platform, 'qq');
    assert.equal(seen.payload.routing_metadata.chat_type, 'private');
    assert.equal(seen.payload.routing_metadata.user_id, 'user-42');
    assert.equal(seen.payload.container_id, undefined);
  });
});

test('runRemotePlatformSmoke refuses localhost unless allowLocal is explicit', async () => {
  await assert.rejects(
    () => runRemotePlatformSmoke({
      platform: 'douyin',
      url: 'http://127.0.0.1:18081',
      confirmRemote: true,
    }),
    /remote_endpoint_required/,
  );
});

test('runRemotePlatformSmoke requires an explicit remote confirmation', async () => {
  await assert.rejects(
    () => runRemotePlatformSmoke({
      platform: 'qq',
      url: 'https://qq-sidecar.example.test',
    }),
    /confirm_remote_required/,
  );
});
