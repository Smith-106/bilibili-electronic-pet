import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockPrisma = {
  bilibiliCredential: {
    findFirst: vi.fn(),
  },
};

vi.mock('../src/lib/prisma.js', () => ({
  getPrisma: () => mockPrisma,
}));

const { loadBilibiliRuntimeConfig } = await import('../src/services/bilibili-runtime-config.js');

const trackedEnvKeys = [
  'BILIBILI_SESSDATA',
  'BILIBILI_BILI_JCT',
  'BILIBILI_BUVID3',
  'BILIBILI_BUVID4',
  'BILIBILI_DEDEUSERID',
  'BILIBILI_BASE_URL',
  'BILIBILI_USER_AGENT',
  'BILIBILI_TIMEOUT',
  'BILIBILI_RETRIES',
  'CREDENTIAL_ENCRYPTION_KEY',
] as const;

const originalEnv = Object.fromEntries(trackedEnvKeys.map((key) => [key, process.env[key]])) as Record<
  (typeof trackedEnvKeys)[number],
  string | undefined
>;

function clearCredentialEnv(): void {
  for (const key of trackedEnvKeys) {
    delete process.env[key];
  }
}

function restoreCredentialEnv(): void {
  clearCredentialEnv();
  for (const key of trackedEnvKeys) {
    if (originalEnv[key] !== undefined) {
      process.env[key] = originalEnv[key];
    }
  }
}

beforeEach(() => {
  mockPrisma.bilibiliCredential.findFirst.mockReset();
  clearCredentialEnv();
});

afterAll(() => {
  restoreCredentialEnv();
});

describe('loadBilibiliRuntimeConfig', () => {
  it('prefers the active database credential over environment variables', async () => {
    process.env.BILIBILI_SESSDATA = 'env-sess';
    process.env.BILIBILI_BILI_JCT = 'env-jct';
    process.env.BILIBILI_BUVID3 = 'env-buvid';

    mockPrisma.bilibiliCredential.findFirst.mockResolvedValue({
      id: 7,
      name: '主账号',
      sessdata: 'db-sess',
      bili_jct: 'db-jct',
      buvid3: 'db-buvid',
      buvid4: 'db-buvid4',
    });

    const config = await loadBilibiliRuntimeConfig();

    expect(mockPrisma.bilibiliCredential.findFirst).toHaveBeenCalledWith({
      where: { is_active: true },
      orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
    });
    expect(config).toMatchObject({
      source: 'database',
      credentialId: 7,
      credentialName: '主账号',
      sessdata: 'db-sess',
      biliJct: 'db-jct',
      buvid: 'db-buvid',
      buvid4: 'db-buvid4',
      baseUrl: 'https://api.bilibili.com',
      timeout: 30000,
      retries: 3,
    });
  });

  it('falls back to environment variables when the active database credential is incomplete', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    process.env.BILIBILI_SESSDATA = 'env-sess';
    process.env.BILIBILI_BILI_JCT = 'env-jct';
    process.env.BILIBILI_BUVID3 = 'env-buvid';
    process.env.BILIBILI_TIMEOUT = '15000';
    process.env.BILIBILI_RETRIES = '5';

    mockPrisma.bilibiliCredential.findFirst.mockResolvedValue({
      id: 8,
      name: '半残凭证',
      sessdata: '',
      bili_jct: 'db-jct',
      buvid3: '',
      buvid4: null,
    });

    const config = await loadBilibiliRuntimeConfig();

    expect(config).toMatchObject({
      source: 'environment',
      credentialId: null,
      credentialName: null,
      sessdata: 'env-sess',
      biliJct: 'env-jct',
      buvid: 'env-buvid',
      timeout: 15000,
      retries: 5,
    });
    expect(warnSpy).toHaveBeenCalledOnce();
    warnSpy.mockRestore();
  });

  it('falls back to environment variables when the database lookup fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    process.env.BILIBILI_SESSDATA = 'env-sess';
    process.env.BILIBILI_BILI_JCT = 'env-jct';
    process.env.BILIBILI_BUVID3 = 'env-buvid';

    mockPrisma.bilibiliCredential.findFirst.mockRejectedValue(new Error('db unavailable'));

    const config = await loadBilibiliRuntimeConfig();

    expect(config).toMatchObject({
      source: 'environment',
      sessdata: 'env-sess',
      biliJct: 'env-jct',
      buvid: 'env-buvid',
    });
    expect(warnSpy).toHaveBeenCalledOnce();
    warnSpy.mockRestore();
  });

  it('returns null when neither the database nor the environment provides a usable credential', async () => {
    mockPrisma.bilibiliCredential.findFirst.mockResolvedValue(null);

    const config = await loadBilibiliRuntimeConfig();

    expect(config).toBeNull();
  });
});
