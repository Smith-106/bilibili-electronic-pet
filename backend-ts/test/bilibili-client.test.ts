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

  it('returns a safe failure when configured request returns non-200', async () => {
    loadBilibiliRuntimeConfig.mockResolvedValue(runtimeConfig);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'upstream failure',
    });

    const result = await postReply('12345', 'hello');

    expect(result).toEqual({ success: false, rpid: '' });
  });

  it('reports whether a runtime credential is available', async () => {
    loadBilibiliRuntimeConfig.mockResolvedValueOnce(runtimeConfig).mockResolvedValueOnce(null);

    await expect(isBilibiliConfigured()).resolves.toBe(true);
    await expect(isBilibiliConfigured()).resolves.toBe(false);
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
});
