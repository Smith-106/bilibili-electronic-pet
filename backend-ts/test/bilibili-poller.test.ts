import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const loadBilibiliRuntimeConfig = vi.fn();
const fetchMock = vi.fn();
const mockPrisma = {
  bilibiliVideo: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  comment: {
    create: vi.fn(),
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

vi.stubGlobal('fetch', fetchMock);

const { pollAllVideos, pollVideoById } = await import('../src/services/bilibili-poller.js');

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
  mockPrisma.bilibiliVideo.findMany.mockReset();
  mockPrisma.bilibiliVideo.findUnique.mockReset();
  mockPrisma.bilibiliVideo.update.mockReset();
  mockPrisma.comment.create.mockReset();
  mockPrisma.$disconnect.mockReset();
  createPrismaClient.mockClear();
});

afterAll(() => {
  vi.unstubAllGlobals();
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

describe('pollVideoById', () => {
  it('returns not_found when the requested video does not exist', async () => {
    loadBilibiliRuntimeConfig.mockResolvedValue(runtimeConfig);
    mockPrisma.bilibiliVideo.findUnique.mockResolvedValue(null);

    const result = await pollVideoById(31);

    expect(loadBilibiliRuntimeConfig).toHaveBeenCalledWith(mockPrisma);
    expect(mockPrisma.bilibiliVideo.findUnique).toHaveBeenCalledWith({
      where: { id: 31 },
    });
    expect(result).toEqual({
      status: 'not_found',
      videos: 0,
      comments: 0,
      events_injected: 0,
      details: [],
    });
    expect(mockPrisma.$disconnect).toHaveBeenCalledOnce();
  });

  it('polls a single video and reports the refreshed result', async () => {
    loadBilibiliRuntimeConfig.mockResolvedValue(runtimeConfig);
    mockPrisma.bilibiliVideo.findUnique
      .mockResolvedValueOnce({
        id: 31,
        bvid: 'BV1GJ411x7fD',
        aid: 1001,
        last_rpid: 0,
      })
      .mockResolvedValueOnce({
        id: 31,
        bvid: 'BV1GJ411x7fD',
        aid: 1001,
        last_rpid: 0,
        last_poll_status: null,
      });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          replies: [],
        },
      }),
    });

    const result = await pollVideoById(31);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.bilibili.com/x/v2/reply?type=1&oid=1001&pn=1&ps=20&sort=1',
      expect.objectContaining({
        headers: expect.objectContaining({
          Cookie: 'SESSDATA=db-sess; bili_jct=db-jct; BUVID3=db-buvid;',
          'User-Agent': 'TestAgent/1.0',
        }),
      }),
    );
    expect(mockPrisma.bilibiliVideo.update).toHaveBeenCalledWith({
      where: { id: 31 },
      data: {
        last_polled_at: expect.any(Date),
        last_poll_status: 'no_new',
        last_poll_error: null,
      },
    });
    expect(mockPrisma.comment.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: 'completed',
      videos: 1,
      comments: 0,
      events_injected: 0,
      details: [
        {
          bvid: 'BV1GJ411x7fD',
          comments: 0,
          status: 'success',
        },
      ],
    });
    expect(mockPrisma.$disconnect).toHaveBeenCalledOnce();
  });
});
