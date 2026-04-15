import { afterEach, describe, expect, it, vi } from 'vitest';

import { createServer } from '../src/server.js';

describe('qq sidecar server', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports health', async () => {
    const app = createServer({});
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      service: 'qq-sidecar',
      mode: 'mock',
      onebot_configured: false,
    });
    await app.close();
  });

  it('rejects unauthorized publish requests when token is configured', async () => {
    const app = createServer({ QQ_SIDECAR_TOKEN: 'secret-token' });
    const response = await app.inject({
      method: 'POST',
      url: '/publish',
      payload: {
        platform: 'qq',
        comment_id: 'comment-1',
        reply_text: 'reply text',
        force_publish: false,
        trace_id: 'trace-1',
      },
    });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ published: false, reason: 'auth' });
    await app.close();
  });

  it('returns mock publish success by default', async () => {
    const app = createServer({ QQ_SIDECAR_TOKEN: 'secret-token' });
    const response = await app.inject({
      method: 'POST',
      url: '/publish',
      headers: { authorization: 'Bearer secret-token' },
      payload: {
        platform: 'qq',
        comment_id: 'comment-1',
        reply_text: 'reply text',
        force_publish: false,
        trace_id: 'trace-1',
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      published: true,
      reason: 'sidecar_publish_ok',
    });
    await app.close();
  });

  it('proxies to upstream when configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        published: true,
        reason: 'upstream_publish_ok',
        published_at: '2026-04-14T12:00:00.000Z',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const app = createServer({
      QQ_DRIVER_MODE: 'webhook_proxy',
      QQ_UPSTREAM_URL: 'https://upstream.example.test/publish',
      QQ_UPSTREAM_TOKEN: 'upstream-token',
    });
    const response = await app.inject({
      method: 'POST',
      url: '/publish',
      payload: {
        platform: 'qq',
        comment_id: 'comment-1',
        reply_text: 'reply text',
        force_publish: false,
        trace_id: 'trace-1',
      },
    });
    expect(response.statusCode).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://upstream.example.test/publish',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer upstream-token',
        }),
      }),
    );
    expect(response.json()).toEqual({
      published: true,
      reason: 'upstream_publish_ok',
      published_at: '2026-04-14T12:00:00.000Z',
    });
    await app.close();
  });

  it('publishes to OneBot HTTP group endpoint when configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'ok',
        retcode: 0,
        data: { message_id: 'msg-100' },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const app = createServer({
      QQ_DRIVER_MODE: 'onebot_http',
      QQ_ONEBOT_URL: 'http://127.0.0.1:3000',
      QQ_ONEBOT_TOKEN: 'onebot-token',
    });
    const response = await app.inject({
      method: 'POST',
      url: '/publish',
      payload: {
        platform: 'qq',
        comment_id: 'message-1',
        container_id: 'group-42',
        routing_metadata: {
          chat_type: 'group',
        },
        reply_text: 'reply text',
        force_publish: false,
        trace_id: 'trace-1',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:3000/send_group_msg',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer onebot-token',
        }),
        body: JSON.stringify({
          group_id: 'group-42',
          message: [
            { type: 'reply', data: { id: 'message-1' } },
            { type: 'text', data: { text: 'reply text' } },
          ],
        }),
      }),
    );
    expect(response.json()).toMatchObject({
      published: true,
      reason: 'onebot_http_ok',
    });
    await app.close();
  });

  it('publishes to OneBot HTTP private endpoint when routing metadata provides user_id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'ok',
        retcode: 0,
        data: { message_id: 'msg-101' },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const app = createServer({
      QQ_DRIVER_MODE: 'onebot_http',
      QQ_ONEBOT_URL: 'http://127.0.0.1:3000',
      QQ_ONEBOT_TOKEN: 'onebot-token',
    });
    const response = await app.inject({
      method: 'POST',
      url: '/publish',
      payload: {
        platform: 'qq',
        comment_id: 'message-2',
        routing_metadata: {
          chat_type: 'private',
          user_id: 'user-8',
        },
        reply_text: 'private hello',
        force_publish: false,
        trace_id: 'trace-2',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:3000/send_private_msg',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer onebot-token',
        }),
        body: JSON.stringify({
          user_id: 'user-8',
          message: [
            { type: 'reply', data: { id: 'message-2' } },
            { type: 'text', data: { text: 'private hello' } },
          ],
        }),
      }),
    );
    expect(response.json()).toMatchObject({
      published: true,
      reason: 'onebot_http_ok',
    });
    await app.close();
  });

  it('returns unsupported_target when OneBot mode lacks routing information', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const app = createServer({
      QQ_DRIVER_MODE: 'onebot_http',
      QQ_ONEBOT_URL: 'http://127.0.0.1:3000',
    });
    const response = await app.inject({
      method: 'POST',
      url: '/publish',
      payload: {
        platform: 'qq',
        comment_id: 'message-1',
        reply_text: 'reply text',
        force_publish: false,
        trace_id: 'trace-1',
      },
    });

    expect(response.statusCode).toBe(502);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.json()).toEqual({
      published: false,
      reason: 'unsupported_target',
    });
    await app.close();
  });
});
