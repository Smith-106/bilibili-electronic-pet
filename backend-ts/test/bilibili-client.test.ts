import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const loadBilibiliRuntimeConfig = vi.fn();
const fetchMock = vi.fn();

vi.mock('../src/services/bilibili-runtime-config.js', () => ({
  loadBilibiliRuntimeConfig,
}));

vi.stubGlobal('fetch', fetchMock);

const { isBilibiliConfigured, postReply } = await import('../src/services/bilibili-client.js');

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

  it('reports whether a runtime credential is available', async () => {
    loadBilibiliRuntimeConfig
      .mockResolvedValueOnce(runtimeConfig)
      .mockResolvedValueOnce(null);

    await expect(isBilibiliConfigured()).resolves.toBe(true);
    await expect(isBilibiliConfigured()).resolves.toBe(false);
  });
});
