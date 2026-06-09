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

  it('rejects invalid publish payloads', async () => {
    const app = createServer({});
    const response = await app.inject({
      method: 'POST',
      url: '/publish',
      payload: {
        platform: 'qq',
        comment_id: 'message-1',
        reply_text: '',
        force_publish: false,
        trace_id: 'trace-1',
      },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ published: false, reason: 'invalid_payload' });
    await app.close();
  });

  it('rejects missing publish bodies', async () => {
    const app = createServer({});
    const response = await app.inject({
      method: 'POST',
      url: '/publish',
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ published: false, reason: 'invalid_payload' });
    await app.close();
  });

  it('returns not_configured when webhook proxy mode has no upstream URL', async () => {
    const app = createServer({ QQ_DRIVER_MODE: 'webhook_proxy' });
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
    expect(response.json()).toEqual({ published: false, reason: 'not_configured' });
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

  it('maps upstream HTTP and network failures in webhook proxy mode', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ reason: 'upstream_busy' }),
      })
      .mockRejectedValueOnce(new Error('network_down'));
    vi.stubGlobal('fetch', fetchMock);

    const app = createServer({
      QQ_DRIVER_MODE: 'webhook_proxy',
      QQ_UPSTREAM_URL: 'https://upstream.example.test/publish',
    });
    const payload = {
      platform: 'qq',
      comment_id: 'message-1',
      reply_text: 'reply text',
      force_publish: false,
      trace_id: 'trace-1',
    };

    const httpResponse = await app.inject({ method: 'POST', url: '/publish', payload });
    expect(httpResponse.statusCode).toBe(502);
    expect(httpResponse.json()).toEqual({ published: false, reason: 'upstream_busy' });

    const networkResponse = await app.inject({ method: 'POST', url: '/publish', payload });
    expect(networkResponse.statusCode).toBe(502);
    expect(networkResponse.json()).toEqual({ published: false, reason: 'network_down' });
    await app.close();
  });

  it('uses status fallback when upstream failure JSON cannot be parsed', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 418,
      json: async () => {
        throw new Error('invalid_json');
      },
    });
    vi.stubGlobal('fetch', fetchMock);

    const app = createServer({
      QQ_DRIVER_MODE: 'webhook_proxy',
      QQ_UPSTREAM_URL: 'https://upstream.example.test/publish',
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
    expect(response.json()).toEqual({ published: false, reason: 'upstream_418' });
    await app.close();
  });

  it('uses upstream status fallback, auth status, and non-error throw handling in webhook proxy mode', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ reason: 'auth' }),
      })
      .mockRejectedValueOnce('socket_down');
    vi.stubGlobal('fetch', fetchMock);

    const app = createServer({
      QQ_DRIVER_MODE: 'webhook_proxy',
      QQ_UPSTREAM_URL: 'https://upstream.example.test/publish',
    });
    const payload = {
      platform: 'qq',
      comment_id: 'message-1',
      reply_text: 'reply text',
      force_publish: false,
      trace_id: 'trace-1',
    };

    const statusResponse = await app.inject({ method: 'POST', url: '/publish', payload });
    expect(statusResponse.statusCode).toBe(502);
    expect(statusResponse.json()).toEqual({ published: false, reason: 'upstream_503' });

    const authResponse = await app.inject({ method: 'POST', url: '/publish', payload });
    expect(authResponse.statusCode).toBe(401);
    expect(authResponse.json()).toEqual({ published: false, reason: 'auth' });

    const throwResponse = await app.inject({ method: 'POST', url: '/publish', payload });
    expect(throwResponse.statusCode).toBe(502);
    expect(throwResponse.json()).toEqual({ published: false, reason: 'upstream_error' });
    await app.close();
  });

  it('uses default upstream success fields when webhook response omits them', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', fetchMock);

    const app = createServer({
      QQ_DRIVER_MODE: 'webhook_proxy',
      QQ_UPSTREAM_URL: 'https://upstream.example.test/publish',
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

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      published: true,
      reason: 'sidecar_publish_ok',
    });
    expect(response.json().published_at).toEqual(expect.any(String));
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

  it('uses parent_external_id before comment id when building OneBot reply messages', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'ok',
        retcode: 1,
      }),
    });
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
        container_id: 'group-42',
        parent_external_id: 'parent-99',
        reply_text: 'reply text',
        force_publish: false,
        trace_id: 'trace-1',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:3000/send_group_msg',
      expect.objectContaining({
        body: JSON.stringify({
          group_id: 'group-42',
          message: [
            { type: 'reply', data: { id: 'parent-99' } },
            { type: 'text', data: { text: 'reply text' } },
          ],
        }),
      }),
    );
    await app.close();
  });

  it('returns not_configured when OneBot mode has no endpoint URL', async () => {
    const app = createServer({
      QQ_DRIVER_MODE: 'onebot_http',
    });
    const response = await app.inject({
      method: 'POST',
      url: '/publish',
      payload: {
        platform: 'qq',
        comment_id: 'message-1',
        container_id: 'group-42',
        reply_text: 'reply text',
        force_publish: false,
        trace_id: 'trace-1',
      },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({ published: false, reason: 'not_configured' });
    await app.close();
  });

  it('maps OneBot HTTP status, retcode, and network failures', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'failed', retcode: 100, wording: 'permission denied' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok', retcode: 2 }),
      })
      .mockRejectedValueOnce(new Error('onebot_down'));
    vi.stubGlobal('fetch', fetchMock);

    const app = createServer({
      QQ_DRIVER_MODE: 'onebot_http',
      QQ_ONEBOT_URL: 'http://127.0.0.1:3000/',
    });
    const payload = {
      platform: 'qq',
      comment_id: 'message-1',
      container_id: 'group-42',
      reply_text: 'reply text',
      force_publish: false,
      trace_id: 'trace-1',
    };

    const statusResponse = await app.inject({ method: 'POST', url: '/publish', payload });
    expect(statusResponse.statusCode).toBe(502);
    expect(statusResponse.json()).toEqual({ published: false, reason: 'onebot_http_404' });

    const wordingResponse = await app.inject({ method: 'POST', url: '/publish', payload });
    expect(wordingResponse.statusCode).toBe(502);
    expect(wordingResponse.json()).toEqual({ published: false, reason: 'permission denied' });

    const retcodeResponse = await app.inject({ method: 'POST', url: '/publish', payload });
    expect(retcodeResponse.statusCode).toBe(502);
    expect(retcodeResponse.json()).toEqual({ published: false, reason: 'onebot_retcode_2' });

    const networkResponse = await app.inject({ method: 'POST', url: '/publish', payload });
    expect(networkResponse.statusCode).toBe(502);
    expect(networkResponse.json()).toEqual({ published: false, reason: 'onebot_down' });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:3000/send_group_msg',
      expect.objectContaining({ method: 'POST' }),
    );
    await app.close();
  });

  it('uses OneBot JSON parse fallback and default retcode status handling', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 451,
        json: async () => {
          throw new Error('invalid_json');
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });
    vi.stubGlobal('fetch', fetchMock);

    const app = createServer({
      QQ_DRIVER_MODE: 'onebot_http',
      QQ_ONEBOT_URL: 'http://127.0.0.1:3000',
    });
    const payload = {
      platform: 'qq',
      comment_id: 'message-1',
      container_id: 'group-42',
      reply_text: 'reply text',
      force_publish: false,
      trace_id: 'trace-1',
    };

    const failedJsonResponse = await app.inject({ method: 'POST', url: '/publish', payload });
    expect(failedJsonResponse.statusCode).toBe(502);
    expect(failedJsonResponse.json()).toEqual({ published: false, reason: 'onebot_http_451' });

    const defaultParsedResponse = await app.inject({ method: 'POST', url: '/publish', payload });
    expect(defaultParsedResponse.statusCode).toBe(200);
    expect(defaultParsedResponse.json()).toMatchObject({
      published: true,
      reason: 'onebot_http_ok',
    });
    await app.close();
  });

  it('maps non-error OneBot throws to onebot_http_error', async () => {
    const fetchMock = vi.fn().mockRejectedValue('onebot_down');
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
        container_id: 'group-42',
        reply_text: 'reply text',
        force_publish: false,
        trace_id: 'trace-1',
      },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({ published: false, reason: 'onebot_http_error' });
    await app.close();
  });
});
