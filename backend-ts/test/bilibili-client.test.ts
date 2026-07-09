import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const loadBilibiliRuntimeConfig = vi.fn();
const fetchMock = vi.fn();

vi.mock('../src/services/bilibili-runtime-config.js', () => ({
  loadBilibiliRuntimeConfig,
}));

vi.stubGlobal('fetch', fetchMock);

const { isBilibiliConfigured, postReply, probeBilibiliAuth } = await import('../src/services/bilibili-client.js');

const runtimeConfig = {
  sessdata: 'db-sess',
  biliJct: 'db-jct',
  buvid: 'db-buvid',
  buvid4: '',
  dedeuserid: '',
  baseUrl: 'https://api.bilibili.com',
  userAgent: 'TestAgent/1.0',
  timeout: 30000,
  retries: 3,
  source: 'database' as const,
  credentialId: 7,
  credentialName: '主账号',
};

beforeEach(() => {
  loadBilibiliRuntimeConfig.mockReset();
  fetchMock.mockReset();
  vi.restoreAllMocks();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('bilibili-client runtime config integration', () => {
  it('posts replies with the loaded runtime credential when no explicit config is provided', async () => {
    loadBilibiliRuntimeConfig.mockResolvedValue(runtimeConfig);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 0,
        data: { rpid: 8899 },
      }),
    });

    const result = await postReply('12345', '你好');

    expect(result).toEqual({ success: true, rpid: '8899' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.bilibili.com/x/v2/reply/add',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          type: 1,
          oid: '12345',
          message: '你好',
          csrf: 'db-jct',
        }),
        headers: expect.objectContaining({
          'User-Agent': 'TestAgent/1.0',
          Cookie: 'SESSDATA=db-sess; bili_jct=db-jct; BUVID3=db-buvid;',
        }),
      }),
    );
  });

  it('returns a safe failure result when no runtime credential is available', async () => {
    loadBilibiliRuntimeConfig.mockResolvedValue(null);

    const result = await postReply('12345', 'hello');

    expect(result).toEqual({ success: false, rpid: '' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses explicit config without loading runtime credential', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 0,
        data: { rpid: 9901 },
      }),
    });

    const explicitConfig = {
      ...runtimeConfig,
      source: 'environment' as const,
      baseUrl: 'https://custom.bilibili.test',
      credentialId: null,
      credentialName: null,
    };

    const result = await postReply('7788', 'explicit-config-reply', explicitConfig);

    expect(result).toEqual({ success: true, rpid: '9901' });
    expect(loadBilibiliRuntimeConfig).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://custom.bilibili.test/x/v2/reply/add',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('throws when the configured request returns a non-200 HTTP status', async () => {
    loadBilibiliRuntimeConfig.mockResolvedValue(runtimeConfig);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'upstream failure',
    });

    await expect(postReply('12345', 'hello')).rejects.toThrow('Bilibili reply API error: 500');
  });

  it('clears the reply timeout when reading an HTTP error response throws', async () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => {
        throw new Error('body unavailable');
      },
    });

    await expect(postReply('12345', 'hello', runtimeConfig)).rejects.toThrow('body unavailable');
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('surfaces a -352 response with error_code and v_voucher for antirisk classification', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        code: -352,
        message: '风控校验失败',
        data: { v_voucher: 'voucher-abc-123' },
      }),
    });

    const result = await postReply('12345', 'hello', runtimeConfig);

    expect(result).toEqual({
      success: false,
      rpid: '',
      error_code: -352,
      v_voucher: 'voucher-abc-123',
    });
  });

  it('surfaces a -352 response with undefined v_voucher when the body omits it', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        code: -352,
        message: '风控校验失败',
      }),
    });

    const result = await postReply('12345', 'hello', runtimeConfig);

    expect(result).toEqual({
      success: false,
      rpid: '',
      error_code: -352,
      v_voucher: undefined,
    });
  });

  it('returns error_code for non-zero, non-352 API codes', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        code: -101,
        message: 'not logged in',
      }),
    });

    await expect(postReply('12345', 'hello', runtimeConfig)).resolves.toEqual({
      success: false,
      rpid: '',
      error_code: -101,
    });
  });

  it('returns error_code when the reply API payload is not successful', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        code: -101,
        message: 'not logged in',
      }),
    });

    await expect(postReply('12345', 'hello', runtimeConfig)).resolves.toEqual({
      success: false,
      rpid: '',
      error_code: -101,
    });
  });

  it('uses the raw payload as the reply API error fallback when no message is returned', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        code: -101,
        data: { reason: 'missing-message' },
      }),
    });

    await expect(postReply('12345', 'hello', runtimeConfig)).resolves.toEqual({
      success: false,
      rpid: '',
      error_code: -101,
    });
  });

  it('propagates network errors instead of swallowing them to success:false', async () => {
    fetchMock.mockRejectedValue(new Error('network offline'));

    await expect(postReply('12345', 'hello', runtimeConfig)).rejects.toThrow('network offline');
  });

  it('aborts reply requests after the configured timeout', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fetchMock.mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), {
            once: true,
          });
        }),
    );

    const pending = postReply('12345', 'hello', { ...runtimeConfig, timeout: 10 });
    // Attach an early handler so the abort rejection is never momentarily unhandled
    // between the fake-timer firing and the await chain resuming.
    const asserted = pending.then(
      (value) => value,
      (error) => error,
    );
    await vi.advanceTimersByTimeAsync(10);
    await expect(pending).rejects.toThrow('aborted');
    await asserted;
    vi.useRealTimers();
  });

  it('reports whether a runtime credential is available', async () => {
    loadBilibiliRuntimeConfig
      .mockResolvedValueOnce(runtimeConfig)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...runtimeConfig, sessdata: '' });

    await expect(isBilibiliConfigured()).resolves.toBe(true);
    await expect(isBilibiliConfigured()).resolves.toBe(false);
    await expect(isBilibiliConfigured()).resolves.toBe(false);
  });

  it('reports auth probe as not configured when no credential is available', async () => {
    loadBilibiliRuntimeConfig.mockResolvedValue(null);

    await expect(probeBilibiliAuth()).resolves.toEqual({
      ok: false,
      reason: 'not_configured',
    });
  });

  it('verifies runtime auth through the nav endpoint', async () => {
    loadBilibiliRuntimeConfig.mockResolvedValue(runtimeConfig);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        code: 0,
        data: { isLogin: true },
      }),
    });

    await expect(probeBilibiliAuth()).resolves.toEqual({
      ok: true,
      reason: 'verified',
      status: 200,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.bilibili.com/x/web-interface/nav',
      expect.objectContaining({
        method: 'GET',
      }),
    );
  });

  it('fails runtime auth verification when the nav endpoint says the user is not logged in', async () => {
    loadBilibiliRuntimeConfig.mockResolvedValue(runtimeConfig);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        code: 0,
        data: { isLogin: false },
      }),
    });

    await expect(probeBilibiliAuth()).resolves.toEqual({
      ok: false,
      reason: 'not_logged_in',
      status: 200,
    });
  });

  it('reports HTTP auth probe failures with status', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
    });

    await expect(probeBilibiliAuth(runtimeConfig)).resolves.toEqual({
      ok: false,
      reason: 'http_503',
      status: 503,
    });
  });

  it('uses API error messages and fallback probe reasons', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          code: -1,
          message: ' auth expired ',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          code: -1,
          message: '   ',
        }),
      });

    await expect(probeBilibiliAuth(runtimeConfig)).resolves.toEqual({
      ok: false,
      reason: 'auth expired',
      status: 200,
    });
    await expect(probeBilibiliAuth(runtimeConfig)).resolves.toEqual({
      ok: false,
      reason: 'api_error',
      status: 200,
    });
  });

  it('normalizes Error and non-Error auth probe exceptions', async () => {
    fetchMock.mockRejectedValueOnce(new Error('nav timeout')).mockRejectedValueOnce('');

    await expect(probeBilibiliAuth(runtimeConfig)).resolves.toEqual({
      ok: false,
      reason: 'nav timeout',
    });
    await expect(probeBilibiliAuth(runtimeConfig)).resolves.toEqual({
      ok: false,
      reason: 'probe_failed',
    });
  });

  it('caps auth probe timeout to a readiness-friendly window', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    loadBilibiliRuntimeConfig.mockResolvedValue(runtimeConfig);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        code: 0,
        data: { isLogin: true },
      }),
    });

    await probeBilibiliAuth();

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
  });

  it('falls back to the default auth probe timeout for invalid configured timeouts', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        code: 0,
        data: { isLogin: true },
      }),
    });

    await probeBilibiliAuth({ ...runtimeConfig, timeout: 0 });

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
  });
});
