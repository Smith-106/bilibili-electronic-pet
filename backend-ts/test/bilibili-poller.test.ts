import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadBilibiliRuntimeConfig = vi.fn();
const mockPrisma = {
  bilibiliVideo: {
    findMany: vi.fn(),
  },
  $disconnect: vi.fn(),
};
const createPrismaClient = vi.fn(() => mockPrisma);

vi.mock('../src/services/bilibili-runtime-config.js', () => ({
  loadBilibiliRuntimeConfig,
}));

vi.mock('../src/lib/prisma.js', () => ({
  createPrismaClient,
}));

const { pollAllVideos } = await import('../src/services/bilibili-poller.js');

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
  mockPrisma.bilibiliVideo.findMany.mockReset();
  mockPrisma.$disconnect.mockReset();
  createPrismaClient.mockClear();
});

describe('pollAllVideos runtime config integration', () => {
  it('returns disabled when no runtime credential is available', async () => {
    loadBilibiliRuntimeConfig.mockResolvedValue(null);

    const result = await pollAllVideos();

    expect(createPrismaClient).toHaveBeenCalledOnce();
    expect(loadBilibiliRuntimeConfig).toHaveBeenCalledWith(mockPrisma);
    expect(mockPrisma.bilibiliVideo.findMany).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: 'disabled',
      videos: 0,
      comments: 0,
      events_injected: 0,
      details: [],
    });
    expect(mockPrisma.$disconnect).toHaveBeenCalledOnce();
  });

  it('queries enabled videos once a runtime credential is available', async () => {
    loadBilibiliRuntimeConfig.mockResolvedValue(runtimeConfig);
    mockPrisma.bilibiliVideo.findMany.mockResolvedValue([]);

    const result = await pollAllVideos();

    expect(mockPrisma.bilibiliVideo.findMany).toHaveBeenCalledWith({
      where: { poll_enabled: true },
    });
    expect(result).toEqual({
      status: 'no_videos',
      videos: 0,
      comments: 0,
      events_injected: 0,
      details: [],
    });
    expect(mockPrisma.$disconnect).toHaveBeenCalledOnce();
  });
});
