import { afterEach, describe, expect, it, vi } from 'vitest';

import { createServer } from '../src/server.js';

describe('douyin sidecar server', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports health', async () => {
    const app = createServer({});
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      service: 'douyin-sidecar',
      mode: 'mock',
    });
    await app.close();
  });

  it('rejects unauthorized publish requests when token is configured', async () => {
    const app = createServer({ DOUYIN_SIDECAR_TOKEN: 'secret-token' });
    const response = await app.inject({
      method: 'POST',
      url: '/publish',
      payload: {
        platform: 'douyin',
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
    const app = createServer({ DOUYIN_SIDECAR_TOKEN: 'secret-token' });
    const response = await app.inject({
      method: 'POST',
      url: '/publish',
      headers: { authorization: 'Bearer secret-token' },
      payload: {
        platform: 'douyin',
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
        platform: 'douyin',
        comment_id: '',
        reply_text: 'reply text',
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
    const app = createServer({ DOUYIN_DRIVER_MODE: 'webhook_proxy' });
    const response = await app.inject({
      method: 'POST',
      url: '/publish',
      payload: {
        platform: 'douyin',
        comment_id: 'comment-1',
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
        published_at: '2026-04-13T12:00:00.000Z',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const app = createServer({
      DOUYIN_DRIVER_MODE: 'webhook_proxy',
      DOUYIN_UPSTREAM_URL: 'https://upstream.example.test/publish',
      DOUYIN_UPSTREAM_TOKEN: 'upstream-token',
    });
    const response = await app.inject({
      method: 'POST',
      url: '/publish',
      payload: {
        platform: 'douyin',
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
      published_at: '2026-04-13T12:00:00.000Z',
    });
    await app.close();
  });

  it('uses default upstream success fields when webhook response omits them', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', fetchMock);

    const app = createServer({
      DOUYIN_DRIVER_MODE: 'webhook_proxy',
      DOUYIN_UPSTREAM_URL: 'https://upstream.example.test/publish',
    });
    const response = await app.inject({
      method: 'POST',
      url: '/publish',
      payload: {
        platform: 'douyin',
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
    expect(response.json().published_at).toEqual(expect.any(String));
    await app.close();
  });

  it('maps upstream HTTP failures to a proxy failure reason', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', fetchMock);

    const app = createServer({
      DOUYIN_DRIVER_MODE: 'webhook_proxy',
      DOUYIN_UPSTREAM_URL: 'https://upstream.example.test/publish',
    });
    const response = await app.inject({
      method: 'POST',
      url: '/publish',
      payload: {
        platform: 'douyin',
        comment_id: 'comment-1',
        reply_text: 'reply text',
        force_publish: false,
        trace_id: 'trace-1',
      },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({ published: false, reason: 'upstream_503' });
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
      DOUYIN_DRIVER_MODE: 'webhook_proxy',
      DOUYIN_UPSTREAM_URL: 'https://upstream.example.test/publish',
    });
    const response = await app.inject({
      method: 'POST',
      url: '/publish',
      payload: {
        platform: 'douyin',
        comment_id: 'comment-1',
        reply_text: 'reply text',
        force_publish: false,
        trace_id: 'trace-1',
      },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({ published: false, reason: 'upstream_418' });
    await app.close();
  });

  it('preserves upstream failure reasons and auth status in webhook mode', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ reason: 'rate_limited' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ reason: 'auth' }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const app = createServer({
      DOUYIN_DRIVER_MODE: 'webhook_proxy',
      DOUYIN_UPSTREAM_URL: 'https://upstream.example.test/publish',
    });
    const payload = {
      platform: 'douyin',
      comment_id: 'comment-1',
      reply_text: 'reply text',
      force_publish: false,
      trace_id: 'trace-1',
    };

    const failureResponse = await app.inject({ method: 'POST', url: '/publish', payload });
    expect(failureResponse.statusCode).toBe(502);
    expect(failureResponse.json()).toEqual({ published: false, reason: 'rate_limited' });

    const authResponse = await app.inject({ method: 'POST', url: '/publish', payload });
    expect(authResponse.statusCode).toBe(401);
    expect(authResponse.json()).toEqual({ published: false, reason: 'auth' });
    await app.close();
  });

  it('returns upstream network errors as publish failures', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network_down'));
    vi.stubGlobal('fetch', fetchMock);

    const app = createServer({
      DOUYIN_DRIVER_MODE: 'webhook_proxy',
      DOUYIN_UPSTREAM_URL: 'https://upstream.example.test/publish',
    });
    const response = await app.inject({
      method: 'POST',
      url: '/publish',
      payload: {
        platform: 'douyin',
        comment_id: 'comment-1',
        reply_text: 'reply text',
        force_publish: false,
        trace_id: 'trace-1',
      },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({ published: false, reason: 'network_down' });
    await app.close();
  });

  it('maps non-error upstream throws to upstream_error', async () => {
    const fetchMock = vi.fn().mockRejectedValue('socket_down');
    vi.stubGlobal('fetch', fetchMock);

    const app = createServer({
      DOUYIN_DRIVER_MODE: 'webhook_proxy',
      DOUYIN_UPSTREAM_URL: 'https://upstream.example.test/publish',
    });
    const response = await app.inject({
      method: 'POST',
      url: '/publish',
      payload: {
        platform: 'douyin',
        comment_id: 'comment-1',
        reply_text: 'reply text',
        force_publish: false,
        trace_id: 'trace-1',
      },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual({ published: false, reason: 'upstream_error' });
    await app.close();
  });
});
