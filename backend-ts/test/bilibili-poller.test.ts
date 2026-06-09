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
  credentialName: 'primary-account',
};

beforeEach(() => {
  vi.useRealTimers();
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
  vi.useRealTimers();
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

  it('aggregates video polling errors into the detail summary', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    loadBilibiliRuntimeConfig.mockResolvedValue(runtimeConfig);
    mockPrisma.bilibiliVideo.findMany.mockResolvedValue([
      {
        id: 91,
        bvid: 'BV-error',
        aid: 1234,
        last_rpid: 0,
      },
    ]);
    mockPrisma.bilibiliVideo.update.mockRejectedValueOnce(new Error('update failed'));
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          replies: [
            {
              rpid: 5001,
              mid: 42,
              content: { message: 'hi' },
              parent: 0,
              ctime: 1700000000,
            },
          ],
        },
      }),
    });

    const result = await pollAllVideos();

    expect(result).toEqual({
      status: 'completed',
      videos: 1,
      comments: 0,
      events_injected: 0,
      details: [
        {
          bvid: 'BV-error',
          comments: 0,
          status: 'error',
          error: 'update failed',
        },
      ],
    });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('normalizes non-Error video polling failures in the all-videos summary', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    loadBilibiliRuntimeConfig.mockResolvedValue(runtimeConfig);
    mockPrisma.bilibiliVideo.findMany.mockResolvedValue([
      {
        id: 93,
        bvid: 'BV-plain-error',
        aid: 1236,
        last_rpid: 0,
      },
    ]);
    mockPrisma.bilibiliVideo.update.mockRejectedValueOnce('plain update failure');
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          replies: [
            {
              rpid: 6101,
              mid: 44,
              content: { message: 'fresh' },
              parent: 0,
              ctime: 1700000000,
            },
          ],
        },
      }),
    });

    const result = await pollAllVideos();

    expect(result.details).toEqual([
      {
        bvid: 'BV-plain-error',
        comments: 0,
        status: 'error',
        error: 'plain update failure',
      },
    ]);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('plain update failure'));
    errorSpy.mockRestore();
  });

  it('aggregates successful video polling into totals and details', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    loadBilibiliRuntimeConfig.mockResolvedValue(runtimeConfig);
    mockPrisma.bilibiliVideo.findMany.mockResolvedValue([
      {
        id: 92,
        bvid: 'BV-success',
        aid: 1235,
        last_rpid: 0,
      },
    ]);
    mockPrisma.bilibiliVideo.update.mockResolvedValue(undefined);
    mockPrisma.comment.create.mockResolvedValue(undefined);
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            replies: [
              {
                rpid: 6001,
                mid: 43,
                content: { message: 'fresh' },
                parent: 0,
                ctime: 1700000000,
              },
            ],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            replies: [],
          },
        }),
      });

    const result = await pollAllVideos();

    expect(result).toEqual({
      status: 'completed',
      videos: 1,
      comments: 1,
      events_injected: 1,
      details: [
        {
          bvid: 'BV-success',
          comments: 1,
          status: 'success',
        },
      ],
    });
    expect(mockPrisma.comment.create).toHaveBeenCalledWith({
      data: {
        platform: 'bilibili',
        canonical_comment_id: 'bilibili:6001',
        comment_id: '6001',
        video_id: 'BV-success',
        user_id: '43',
        content: 'fresh',
        parent_id: null,
      },
    });
    expect(mockPrisma.$disconnect).toHaveBeenCalledOnce();
    infoSpy.mockRestore();
  });
});

describe('pollVideoById', () => {
  it('returns disabled when the runtime credential cannot be loaded', async () => {
    loadBilibiliRuntimeConfig.mockResolvedValue(null);

    const result = await pollVideoById(12);

    expect(result).toEqual({
      status: 'disabled',
      videos: 0,
      comments: 0,
      events_injected: 0,
      details: [],
    });
  });

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

  it('fetches a missing aid, injects new comments, and ignores duplicate inserts', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    loadBilibiliRuntimeConfig.mockResolvedValue(runtimeConfig);
    mockPrisma.bilibiliVideo.findUnique.mockResolvedValue({
      id: 31,
      bvid: 'BV1GJ411x7fD',
      aid: null,
      last_rpid: 10,
    });
    mockPrisma.bilibiliVideo.update.mockResolvedValue(undefined);
    mockPrisma.comment.create
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('duplicate comment'));
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            aid: 1001,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            replies: [
              {
                rpid: 12,
                mid: 2001,
                content: { message: 'first' },
                parent: 0,
                ctime: 1700000000,
              },
              {
                rpid: 11,
                mid: 2002,
                content: { message: 'second' },
                parent: 9,
                ctime: 1700000001,
              },
              {
                rpid: 9,
                mid: 2003,
                content: { message: 'older' },
                parent: 0,
                ctime: 1700000002,
              },
            ],
          },
        }),
      });

    const result = await pollVideoById(31);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.bilibili.com/x/web-interface/view?bvid=BV1GJ411x7fD',
      expect.objectContaining({
        headers: expect.objectContaining({
          Referer: 'https://www.bilibili.com',
          'User-Agent': 'TestAgent/1.0',
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.bilibili.com/x/v2/reply?type=1&oid=1001&pn=1&ps=20&sort=1',
      expect.objectContaining({
        headers: expect.objectContaining({
          Cookie: 'SESSDATA=db-sess; bili_jct=db-jct; BUVID3=db-buvid;',
        }),
      }),
    );
    expect(mockPrisma.bilibiliVideo.update).toHaveBeenNthCalledWith(1, {
      where: { id: 31 },
      data: { aid: 1001 },
    });
    expect(mockPrisma.bilibiliVideo.update).toHaveBeenNthCalledWith(2, {
      where: { id: 31 },
      data: {
        last_rpid: 12,
        last_polled_at: expect.any(Date),
        last_poll_status: 'ok',
        last_poll_error: null,
      },
    });
    expect(mockPrisma.comment.create).toHaveBeenNthCalledWith(1, {
      data: {
        platform: 'bilibili',
        canonical_comment_id: 'bilibili:12',
        comment_id: '12',
        video_id: 'BV1GJ411x7fD',
        user_id: '2001',
        content: 'first',
        parent_id: null,
      },
    });
    expect(mockPrisma.comment.create).toHaveBeenNthCalledWith(2, {
      data: {
        platform: 'bilibili',
        canonical_comment_id: 'bilibili:11',
        comment_id: '11',
        video_id: 'BV1GJ411x7fD',
        user_id: '2002',
        content: 'second',
        parent_id: '9',
      },
    });
    expect(result).toEqual({
      status: 'completed',
      videos: 1,
      comments: 1,
      events_injected: 1,
      details: [
        {
          bvid: 'BV1GJ411x7fD',
          comments: 1,
          status: 'success',
        },
      ],
    });
    expect(infoSpy).toHaveBeenCalled();
    infoSpy.mockRestore();
  });

  it('marks the video as error when aid resolution fails', async () => {
    loadBilibiliRuntimeConfig.mockResolvedValue(runtimeConfig);
    mockPrisma.bilibiliVideo.findUnique.mockResolvedValue({
      id: 41,
      bvid: 'BV-no-aid',
      aid: null,
      last_rpid: 0,
    });
    mockPrisma.bilibiliVideo.update.mockResolvedValue(undefined);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {},
      }),
    });

    const result = await pollVideoById(41);

    expect(mockPrisma.bilibiliVideo.update).toHaveBeenCalledWith({
      where: { id: 41 },
      data: { last_poll_status: 'error', last_poll_error: 'no_aid' },
    });
    expect(result).toEqual({
      status: 'completed',
      videos: 1,
      comments: 0,
      events_injected: 0,
      details: [
        {
          bvid: 'BV-no-aid',
          comments: 0,
          status: 'error',
        },
      ],
    });
  });

  it('marks the video as error when aid resolution returns a non-ok response', async () => {
    loadBilibiliRuntimeConfig.mockResolvedValue(runtimeConfig);
    mockPrisma.bilibiliVideo.findUnique.mockResolvedValue({
      id: 42,
      bvid: 'BV-no-aid-http',
      aid: null,
      last_rpid: 0,
    });
    mockPrisma.bilibiliVideo.update.mockResolvedValue(undefined);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        data: { aid: 9999 },
      }),
    });

    const result = await pollVideoById(42);

    expect(mockPrisma.bilibiliVideo.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: { last_poll_status: 'error', last_poll_error: 'no_aid' },
    });
    expect(result.details[0]).toMatchObject({
      bvid: 'BV-no-aid-http',
      comments: 0,
      status: 'error',
    });
  });

  it('returns no_new when all fetched comments are older than the stored watermark', async () => {
    loadBilibiliRuntimeConfig.mockResolvedValue(runtimeConfig);
    mockPrisma.bilibiliVideo.findUnique
      .mockResolvedValueOnce({
        id: 45,
        bvid: 'BV-old',
        aid: 1010,
        last_rpid: 50,
      })
      .mockResolvedValueOnce({
        id: 45,
        bvid: 'BV-old',
        aid: 1010,
        last_rpid: 50,
        last_poll_status: null,
      });
    mockPrisma.bilibiliVideo.update.mockResolvedValue(undefined);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          replies: [
            {
              rpid: 50,
              mid: 1,
              content: { message: 'same' },
              parent: 0,
              ctime: 1700000000,
            },
            {
              rpid: 49,
              mid: 2,
              content: { message: 'older' },
              parent: 0,
              ctime: 1700000001,
            },
          ],
        },
      }),
    });

    const result = await pollVideoById(45);

    expect(mockPrisma.comment.create).not.toHaveBeenCalled();
    expect(mockPrisma.bilibiliVideo.update).toHaveBeenCalledWith({
      where: { id: 45 },
      data: {
        last_polled_at: expect.any(Date),
        last_poll_status: 'no_new',
        last_poll_error: null,
      },
    });
    expect(result).toEqual({
      status: 'completed',
      videos: 1,
      comments: 0,
      events_injected: 0,
      details: [
        {
          bvid: 'BV-old',
          comments: 0,
          status: 'success',
        },
      ],
    });
  });

  it('treats non-array replies as an empty page and records no_new', async () => {
    loadBilibiliRuntimeConfig.mockResolvedValue(runtimeConfig);
    mockPrisma.bilibiliVideo.findUnique
      .mockResolvedValueOnce({
        id: 47,
        bvid: 'BV-empty-replies',
        aid: 1011,
        last_rpid: 0,
      })
      .mockResolvedValueOnce({
        id: 47,
        bvid: 'BV-empty-replies',
        aid: 1011,
        last_rpid: 0,
        last_poll_status: null,
      });
    mockPrisma.bilibiliVideo.update.mockResolvedValue(undefined);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          replies: null,
        },
      }),
    });

    const result = await pollVideoById(47);

    expect(mockPrisma.comment.create).not.toHaveBeenCalled();
    expect(mockPrisma.bilibiliVideo.update).toHaveBeenCalledWith({
      where: { id: 47 },
      data: {
        last_polled_at: expect.any(Date),
        last_poll_status: 'no_new',
        last_poll_error: null,
      },
    });
    expect(result).toEqual({
      status: 'completed',
      videos: 1,
      comments: 0,
      events_injected: 0,
      details: [
        {
          bvid: 'BV-empty-replies',
          comments: 0,
          status: 'success',
        },
      ],
    });
  });

  it('continues to the next page when all comments are newer than the watermark', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    loadBilibiliRuntimeConfig.mockResolvedValue(runtimeConfig);
    mockPrisma.bilibiliVideo.findUnique.mockResolvedValueOnce({
      id: 48,
      bvid: 'BV-new-page',
      aid: 1012,
      last_rpid: 10,
    });
    mockPrisma.bilibiliVideo.update.mockResolvedValue(undefined);
    mockPrisma.comment.create.mockResolvedValue(undefined);
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            replies: [
              {
                rpid: 12,
                mid: 3001,
              },
              {
                rpid: 11,
                mid: 3002,
                content: {},
              },
            ],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            replies: [],
          },
        }),
      });

    const result = await pollVideoById(48);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(mockPrisma.bilibiliVideo.update).toHaveBeenCalledWith({
      where: { id: 48 },
      data: {
        last_rpid: 12,
        last_polled_at: expect.any(Date),
        last_poll_status: 'ok',
        last_poll_error: null,
      },
    });
    expect(mockPrisma.comment.create).toHaveBeenNthCalledWith(1, {
      data: {
        platform: 'bilibili',
        canonical_comment_id: 'bilibili:12',
        comment_id: '12',
        video_id: 'BV-new-page',
        user_id: '3001',
        content: '',
        parent_id: null,
      },
    });
    expect(mockPrisma.comment.create).toHaveBeenNthCalledWith(2, {
      data: {
        platform: 'bilibili',
        canonical_comment_id: 'bilibili:11',
        comment_id: '11',
        video_id: 'BV-new-page',
        user_id: '3002',
        content: '',
        parent_id: null,
      },
    });
    expect(result).toEqual({
      status: 'completed',
      videos: 1,
      comments: 2,
      events_injected: 2,
      details: [
        {
          bvid: 'BV-new-page',
          comments: 2,
          status: 'success',
        },
      ],
    });
    infoSpy.mockRestore();
  });

  it('stops polling after the maximum page limit when every page has comments', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    loadBilibiliRuntimeConfig.mockResolvedValue(runtimeConfig);
    mockPrisma.bilibiliVideo.findUnique.mockResolvedValueOnce({
      id: 50,
      bvid: 'BV-max-pages',
      aid: 1014,
      last_rpid: 0,
    });
    mockPrisma.bilibiliVideo.update.mockResolvedValue(undefined);
    mockPrisma.comment.create.mockResolvedValue(undefined);
    fetchMock.mockImplementation(async (_url: string) => {
      const url = new URL(String(_url));
      const page = Number(url.searchParams.get('pn'));
      return {
        ok: true,
        json: async () => ({
          data: {
            replies: [
              {
                rpid: 7000 + page,
                mid: 4000 + page,
                content: { message: `page-${page}` },
                parent: 0,
                ctime: 1700000000 + page,
              },
            ],
          },
        }),
      };
    });

    const result = await pollVideoById(50);

    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(result).toEqual({
      status: 'completed',
      videos: 1,
      comments: 5,
      events_injected: 5,
      details: [
        {
          bvid: 'BV-max-pages',
          comments: 5,
          status: 'success',
        },
      ],
    });
    expect(mockPrisma.bilibiliVideo.update).toHaveBeenCalledWith({
      where: { id: 50 },
      data: {
        last_rpid: 7005,
        last_polled_at: expect.any(Date),
        last_poll_status: 'ok',
        last_poll_error: null,
      },
    });
    infoSpy.mockRestore();
  });

  it('marks retry exhaustion when the reply API returns HTTP errors', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
    loadBilibiliRuntimeConfig.mockResolvedValue(runtimeConfig);
    mockPrisma.bilibiliVideo.findUnique
      .mockResolvedValueOnce({
        id: 49,
        bvid: 'BV-http-error',
        aid: 1013,
        last_rpid: 0,
      })
      .mockResolvedValueOnce({
        id: 49,
        bvid: 'BV-http-error',
        aid: 1013,
        last_rpid: 0,
        last_poll_status: 'error',
      });
    mockPrisma.bilibiliVideo.update.mockResolvedValue(undefined);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    });

    const pending = pollVideoById(49);
    await vi.runAllTimersAsync();
    const result = await pending;

    expect(mockPrisma.bilibiliVideo.update).toHaveBeenCalledWith({
      where: { id: 49 },
      data: { last_poll_status: 'error', last_poll_error: 'retry_exhausted' },
    });
    expect(result).toEqual({
      status: 'completed',
      videos: 1,
      comments: 0,
      events_injected: 0,
      details: [
        {
          bvid: 'BV-http-error',
          comments: 0,
          status: 'success',
        },
      ],
    });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('HTTP 503'));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('HTTP 503'));
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('returns an error result when pollVideoComments throws inside pollVideoById', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    loadBilibiliRuntimeConfig.mockResolvedValue(runtimeConfig);
    mockPrisma.bilibiliVideo.findUnique.mockResolvedValue({
      id: 46,
      bvid: 'BV-throw',
      aid: null,
      last_rpid: 0,
    });
    mockPrisma.bilibiliVideo.update.mockRejectedValue(new Error('db write failed'));
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {},
      }),
    });

    const result = await pollVideoById(46);

    expect(result).toEqual({
      status: 'error',
      videos: 1,
      comments: 0,
      events_injected: 0,
      details: [
        {
          bvid: 'BV-throw',
          comments: 0,
          status: 'error',
          error: 'db write failed',
        },
      ],
    });
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('normalizes non-Error pollVideoById failures', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    loadBilibiliRuntimeConfig.mockResolvedValue(runtimeConfig);
    mockPrisma.bilibiliVideo.findUnique.mockResolvedValue({
      id: 52,
      bvid: 'BV-plain-throw',
      aid: null,
      last_rpid: 0,
    });
    mockPrisma.bilibiliVideo.update.mockRejectedValue('plain db failure');
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {},
      }),
    });

    const result = await pollVideoById(52);

    expect(result).toEqual({
      status: 'error',
      videos: 1,
      comments: 0,
      events_injected: 0,
      details: [
        {
          bvid: 'BV-plain-throw',
          comments: 0,
          status: 'error',
          error: 'plain db failure',
        },
      ],
    });
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('plain db failure'));
    errorSpy.mockRestore();
  });

  it('records retry exhaustion and suppresses the no_new overwrite after repeated failures', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
    loadBilibiliRuntimeConfig.mockResolvedValue(runtimeConfig);
    mockPrisma.bilibiliVideo.findUnique
      .mockResolvedValueOnce({
        id: 51,
        bvid: 'BV-retry',
        aid: 1002,
        last_rpid: 0,
      })
      .mockResolvedValueOnce({
        id: 51,
        bvid: 'BV-retry',
        aid: 1002,
        last_rpid: 0,
        last_poll_status: 'error',
      });
    mockPrisma.bilibiliVideo.update.mockResolvedValue(undefined);
    fetchMock.mockRejectedValue(new Error('network down'));

    const pending = pollVideoById(51);
    await vi.runAllTimersAsync();
    const result = await pending;

    expect(mockPrisma.bilibiliVideo.update).toHaveBeenCalledWith({
      where: { id: 51 },
      data: { last_poll_status: 'error', last_poll_error: 'retry_exhausted' },
    });
    expect(result).toEqual({
      status: 'completed',
      videos: 1,
      comments: 0,
      events_injected: 0,
      details: [
        {
          bvid: 'BV-retry',
          comments: 0,
          status: 'success',
        },
      ],
    });
    expect(warnSpy).toHaveBeenCalledTimes(3);
    expect(errorSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('records retry exhaustion when comment fetch aborts by timeout', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
    loadBilibiliRuntimeConfig.mockResolvedValue({ ...runtimeConfig, timeout: 5 });
    mockPrisma.bilibiliVideo.findUnique
      .mockResolvedValueOnce({
        id: 53,
        bvid: 'BV-timeout',
        aid: 1003,
        last_rpid: 0,
      })
      .mockResolvedValueOnce({
        id: 53,
        bvid: 'BV-timeout',
        aid: 1003,
        last_rpid: 0,
        last_poll_status: 'error',
      });
    mockPrisma.bilibiliVideo.update.mockResolvedValue(undefined);
    fetchMock.mockImplementation(
      async (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('aborted', 'AbortError')),
            { once: true },
          );
        }),
    );

    const pending = pollVideoById(53);
    await vi.runAllTimersAsync();
    const result = await pending;

    expect(result.details[0]).toMatchObject({
      bvid: 'BV-timeout',
      status: 'success',
      comments: 0,
    });
    expect(mockPrisma.bilibiliVideo.update).toHaveBeenCalledWith({
      where: { id: 53 },
      data: { last_poll_status: 'error', last_poll_error: 'retry_exhausted' },
    });
    expect(warnSpy).toHaveBeenCalledTimes(3);
    expect(errorSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('wraps non-Error fetch failures before retry logging', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
    loadBilibiliRuntimeConfig.mockResolvedValue(runtimeConfig);
    mockPrisma.bilibiliVideo.findUnique
      .mockResolvedValueOnce({
        id: 54,
        bvid: 'BV-plain-retry',
        aid: 1004,
        last_rpid: 0,
      })
      .mockResolvedValueOnce({
        id: 54,
        bvid: 'BV-plain-retry',
        aid: 1004,
        last_rpid: 0,
        last_poll_status: 'error',
      });
    mockPrisma.bilibiliVideo.update.mockResolvedValue(undefined);
    fetchMock.mockRejectedValue('plain network down');

    const pending = pollVideoById(54);
    await vi.runAllTimersAsync();
    const result = await pending;

    expect(result.details[0]).toMatchObject({
      bvid: 'BV-plain-retry',
      status: 'success',
      comments: 0,
    });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('plain network down'));
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('plain network down'));
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
