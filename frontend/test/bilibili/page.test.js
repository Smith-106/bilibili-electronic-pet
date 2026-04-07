import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createPageContainer, flushPromises } from '../utils/dom.js';

const { mockApi, mockShowToast } = vi.hoisted(() => ({
  mockApi: {
    getBilibiliStatus: vi.fn(),
    getReadinessStatus: vi.fn(),
    getBilibiliVideos: vi.fn(),
    getBilibiliCredentials: vi.fn(),
    triggerBilibiliPoll: vi.fn(),
    addBilibiliVideo: vi.fn(),
    toggleBilibiliVideoPoll: vi.fn(),
    syncBilibiliVideo: vi.fn(),
    deleteBilibiliVideo: vi.fn(),
    addBilibiliCredential: vi.fn(),
    activateBilibiliCredential: vi.fn(),
    deleteBilibiliCredential: vi.fn(),
  },
  mockShowToast: vi.fn(),
}));

vi.mock('../../src/api/admin.js', () => ({
  createAdminApi: () => mockApi,
}));

vi.mock('../../src/components/toast.js', () => ({
  showToast: mockShowToast,
}));

globalThis.confirm = vi.fn(() => true);

const { render } = await import('../../src/pages/bilibili.js');

describe('bilibili admin critical-path regression tests', () => {
  beforeEach(() => {
    mockApi.getBilibiliStatus.mockResolvedValue({
      ok: true,
      enabled: true,
      polling_enabled: true,
      publish_enabled: true,
      video_count: 2,
      config: {
        poll_interval_seconds: 300,
        rate_limit_per_minute: 30,
      },
      videos: {
        poll_enabled_count: 1,
      },
      credential: {
        id: 7,
        name: '主账号',
        is_active: true,
        expires_at: '2026-12-31T00:00:00.000Z',
      },
      diagnostics: {
        ready: true,
        blocking_reasons: [],
        effective_publish_mode: 'native_bilibili',
        signals: {
          credential_present: true,
          credential_complete: true,
          native_publish_enabled: true,
          polling_worker_enabled: true,
        },
        release_gates: {
          credential_present: true,
          credential_complete: true,
          worker_or_publish_ready: true,
        },
      },
    });
    mockApi.getBilibiliVideos.mockResolvedValue({
      total: 2,
      items: [
        {
          id: 1,
          bvid: 'BV1GJ411x7fD',
          aid: 1001,
          title: '带 aid 的视频',
          poll_enabled: true,
          comment_count: 5,
          last_polled_at: '2026-04-07T00:00:00.000Z',
          last_poll_status: 'ok',
          last_poll_error: null,
          last_rpid: 777,
        },
        {
          id: 2,
          bvid: 'BV1Q541167Qg',
          aid: null,
          title: '缺少 aid 的视频',
          poll_enabled: false,
          comment_count: 0,
          last_polled_at: null,
          last_poll_status: null,
          last_poll_error: null,
          last_rpid: null,
        },
      ],
    });
    mockApi.getBilibiliCredentials.mockResolvedValue({
      items: [
        {
          id: 7,
          credential_id: 7,
          name: '主账号',
          is_active: true,
          active: true,
          has_sessdata: true,
          has_bili_jct: true,
          buvid3: 'fingerprint',
          expires_at: '2026-12-31T00:00:00.000Z',
        },
      ],
    });
    mockApi.getReadinessStatus.mockResolvedValue({
      foundation_ready: true,
      delivery_ready: false,
      foundation_blockers: [],
      delivery_blockers: ['bilibili:delivery_diagnostics_not_ready'],
      delivery_capability_blockers: ['llm_generation', 'search_enrichment'],
      delivery_capabilities: {
        summary: [
          {
            capability: 'llm_generation',
            status: 'missing_inputs',
            mode: 'openai',
            missing_inputs: ['LLM_API_KEY'],
          },
          {
            capability: 'search_enrichment',
            status: 'missing_inputs',
            mode: 'google',
            missing_inputs: ['SEARCH_API_KEY', 'SEARCH_CX'],
          },
          {
            capability: 'webhook_publish',
            status: 'inactive',
            mode: 'manual_queue',
            missing_inputs: [],
          },
          {
            capability: 'native_bilibili_publish',
            status: 'configured',
            mode: 'native_bilibili',
            missing_inputs: [],
          },
        ],
      },
    });
    mockApi.triggerBilibiliPoll.mockResolvedValue({ ok: true });
  });

  it('renders diagnostics, videos, and credentials from mocked API', async () => {
    const container = createPageContainer();

    await render(container);

    expect(mockApi.getBilibiliStatus).toHaveBeenCalledTimes(1);
    expect(mockApi.getReadinessStatus).toHaveBeenCalledTimes(1);
    expect(mockApi.getBilibiliVideos).toHaveBeenCalledWith({
      limit: 50,
      offset: 0,
      poll_enabled: undefined,
    });
    expect(mockApi.getBilibiliCredentials).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('B站集成');
    expect(container.textContent).toContain('主账号');
    expect(container.textContent).toContain('原生 B 站发布');
    expect(container.textContent).toContain('基础就绪');
    expect(container.textContent).toContain('交付就绪');
    expect(container.textContent).toContain('llm_generation');
    expect(container.textContent).toContain('LLM_API_KEY');
    expect(container.textContent).toContain('带 aid 的视频');
    expect(container.textContent).toContain('缺少 aid 的视频');
    expect(container.querySelector('.bili-sync[disabled]')).toBeTruthy();
  });

  it('renders fallback hint when readiness endpoint is unavailable', async () => {
    const container = createPageContainer();
    mockApi.getReadinessStatus.mockRejectedValueOnce(new Error('readiness_down'));

    await render(container);

    expect(container.textContent).toContain('Readiness 状态加载失败');
    expect(container.textContent).toContain('readiness_down');
    expect(container.textContent).toContain('canonical: readiness_unavailable');
    expect(container.textContent).toContain('关键缺失项: readiness_unavailable');
    expect(container.textContent).not.toContain('关键缺失项: 无');
  });

  it('surfaces auth probe details when native auth validation fails', async () => {
    const container = createPageContainer();
    mockApi.getBilibiliStatus.mockResolvedValueOnce({
      ok: true,
      enabled: true,
      polling_enabled: false,
      publish_enabled: true,
      video_count: 0,
      config: {
        poll_interval_seconds: 300,
        rate_limit_per_minute: 30,
      },
      videos: {
        poll_enabled_count: 0,
      },
      credential: {
        id: 7,
        name: '主账号',
        is_active: true,
        expires_at: '2026-12-31T00:00:00.000Z',
      },
      diagnostics: {
        ready: false,
        blocking_reasons: ['auth:credential_validation_failed'],
        effective_publish_mode: 'native_bilibili',
        signals: {
          credential_present: true,
          credential_complete: true,
          native_publish_enabled: true,
          polling_worker_enabled: false,
          auth_probe_reason: '账号未登录',
          real_auth_ready: false,
        },
        release_gates: {
          credential_present: true,
          credential_complete: true,
          worker_or_publish_ready: false,
          real_auth_ready: false,
        },
      },
    });
    mockApi.getReadinessStatus.mockResolvedValueOnce({
      foundation_ready: true,
      delivery_ready: false,
      foundation_blockers: [],
      delivery_blockers: ['bilibili:auth:credential_validation_failed'],
      delivery_capability_blockers: ['native_bilibili_publish'],
      delivery_capabilities: {
        summary: [
          {
            capability: 'native_bilibili_publish',
            status: 'runtime_credentials_required',
            mode: 'native_bilibili',
            missing_inputs: ['BILIBILI_SESSDATA/BILIBILI_BILI_JCT/BILIBILI_BUVID3 or active DB credential'],
          },
        ],
      },
    });
    mockApi.getBilibiliVideos.mockResolvedValueOnce({ total: 0, items: [] });
    mockApi.getBilibiliCredentials.mockResolvedValueOnce({ items: [] });

    await render(container);

    expect(container.textContent).toContain('当前阻塞原因: 凭证字段存在，但运行时认证失败，请检查登录状态或凭证是否失效。');
    expect(container.textContent).toContain('原生认证探针: 账号未登录');
    expect(container.textContent).toContain('native_bilibili_publish');
  });

  it('refetches videos when poll filter changes', async () => {
    const container = createPageContainer();

    await render(container);
    mockApi.getBilibiliVideos.mockClear();

    container.querySelector('#bili-video-poll-filter').value = 'true';
    container.querySelector('#bili-video-filter-btn').click();
    await flushPromises();

    expect(mockApi.getBilibiliVideos).toHaveBeenCalledWith({
      limit: 50,
      offset: 0,
      poll_enabled: true,
    });
  });
});
