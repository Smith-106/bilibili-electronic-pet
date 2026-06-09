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
    globalThis.confirm = vi.fn(() => true);
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
    mockApi.addBilibiliVideo.mockResolvedValue({ ok: true });
    mockApi.toggleBilibiliVideoPoll.mockResolvedValue({ ok: true });
    mockApi.syncBilibiliVideo.mockResolvedValue({
      ok: true,
      result: { videos: 1, comments: 2, events_injected: 3 },
    });
    mockApi.deleteBilibiliVideo.mockResolvedValue({ ok: true });
    mockApi.addBilibiliCredential.mockResolvedValue({ ok: true, item: { is_active: true } });
    mockApi.activateBilibiliCredential.mockResolvedValue({ ok: true });
    mockApi.deleteBilibiliCredential.mockResolvedValue({ ok: true });
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

  it('renders runtime-managed credential summary when diagnostics report external credential availability', async () => {
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
      credential: null,
      diagnostics: {
        ready: true,
        blocking_reasons: [],
        effective_publish_mode: 'native_bilibili',
        signals: {
          credential_present: true,
          credential_complete: true,
          native_publish_enabled: true,
          polling_worker_enabled: false,
          real_auth_ready: true,
          auth_probe_reason: 'verified',
        },
        release_gates: {
          credential_present: true,
          credential_complete: true,
          worker_or_publish_ready: true,
          real_auth_ready: true,
        },
      },
    });
    mockApi.getReadinessStatus.mockResolvedValueOnce({
      foundation_ready: true,
      delivery_ready: true,
      foundation_blockers: [],
      delivery_blockers: [],
      delivery_capability_blockers: [],
      delivery_capabilities: {
        summary: [
          {
            capability: 'native_bilibili_publish',
            status: 'configured',
            mode: 'native_bilibili',
            missing_inputs: [],
          },
        ],
      },
    });
    mockApi.getBilibiliVideos.mockResolvedValueOnce({ total: 0, items: [] });
    mockApi.getBilibiliCredentials.mockResolvedValueOnce({ items: [] });

    await render(container);

    expect(container.textContent).toContain('运行时外部凭证');
    expect(container.textContent).toContain('后台未托管该凭证');
    expect(container.textContent).toContain('运行时已验证');
    expect(container.textContent).not.toContain('未配置活跃凭证');
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

  it('runs video add, poll, refresh, row actions, and pagination controls', async () => {
    const container = createPageContainer();

    await render(container);

    container.querySelector('#bili-video-add').click();
    await flushPromises();
    expect(mockApi.addBilibiliVideo).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'warning');

    container.querySelector('#bili-video-bvid').value = 'BV1GJ411x7fD';
    container.querySelector('#bili-video-bvid').dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    }));
    await flushPromises();
    await flushPromises();
    expect(mockApi.addBilibiliVideo).toHaveBeenCalledWith('BV1GJ411x7fD');
    expect(container.querySelector('#bili-video-bvid').value).toBe('');

    container.querySelector('.bili-toggle-poll').click();
    await flushPromises();
    await flushPromises();
    expect(mockApi.toggleBilibiliVideoPoll).toHaveBeenCalledWith('1');

    container.querySelector('.bili-sync').click();
    await flushPromises();
    await flushPromises();
    expect(mockApi.syncBilibiliVideo).toHaveBeenCalledWith('1');

    container.querySelector('.bili-delete').click();
    await flushPromises();
    await flushPromises();
    expect(globalThis.confirm).toHaveBeenCalled();
    expect(mockApi.deleteBilibiliVideo).toHaveBeenCalledWith('1');

    container.querySelector('#bili-poll-btn').click();
    await flushPromises();
    await flushPromises();
    expect(mockApi.triggerBilibiliPoll).toHaveBeenCalledTimes(1);

    container.querySelector('#bili-refresh').click();
    await flushPromises();
    expect(container.querySelector('#bili-refresh').disabled).toBe(false);

    mockApi.getBilibiliVideos
      .mockResolvedValueOnce({
        total: 100,
        items: [
          {
            id: 50,
            bvid: 'BV1xx411c7mD',
            aid: 500,
            title: 'page 2 video',
            poll_enabled: true,
            comment_count: 0,
            last_polled_at: null,
            last_poll_status: null,
            last_poll_error: null,
            last_rpid: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        total: 100,
        items: [
          {
            id: 1,
            bvid: 'BV1GJ411x7fD',
            aid: 1001,
            title: 'page 1 video',
            poll_enabled: true,
            comment_count: 0,
            last_polled_at: null,
            last_poll_status: null,
            last_poll_error: null,
            last_rpid: null,
          },
        ],
      });
    mockApi.getBilibiliVideos.mockClear();

    container.querySelector('#bili-video-next').disabled = false;
    container.querySelector('#bili-video-next').click();
    await flushPromises();
    expect(mockApi.getBilibiliVideos).toHaveBeenCalledWith({
      limit: 50,
      offset: 50,
      poll_enabled: undefined,
    });

    container.querySelector('#bili-video-prev').disabled = false;
    container.querySelector('#bili-video-prev').click();
    await flushPromises();
    expect(mockApi.getBilibiliVideos).toHaveBeenLastCalledWith({
      limit: 50,
      offset: 0,
      poll_enabled: undefined,
    });
  });

  it('handles video pagination fallback and video action errors', async () => {
    const container = createPageContainer();
    mockApi.getBilibiliVideos.mockResolvedValueOnce({
      total: 100,
      items: [
        {
          id: 1,
          bvid: 'BV1GJ411x7fD',
          aid: 1001,
          title: 'page 1 video',
          poll_enabled: true,
          comment_count: 0,
          last_polled_at: null,
          last_poll_status: null,
          last_poll_error: null,
          last_rpid: null,
        },
      ],
    });

    await render(container);

    mockApi.getBilibiliVideos
      .mockResolvedValueOnce({ total: 100, items: [] })
      .mockResolvedValueOnce({ total: 100, items: [] });
    mockApi.getBilibiliVideos.mockClear();
    container.querySelector('#bili-video-next').disabled = false;
    container.querySelector('#bili-video-next').click();
    await flushPromises();
    await flushPromises();
    expect(mockApi.getBilibiliVideos).toHaveBeenNthCalledWith(1, {
      limit: 50,
      offset: 50,
      poll_enabled: undefined,
    });
    expect(mockApi.getBilibiliVideos).toHaveBeenNthCalledWith(2, {
      limit: 50,
      offset: 0,
      poll_enabled: undefined,
    });

    mockApi.getBilibiliVideos.mockResolvedValue({
      total: 2,
      items: [
        {
          id: 1,
          bvid: 'BV1GJ411x7fD',
          aid: 1001,
          title: 'video',
          poll_enabled: true,
          comment_count: 0,
          last_polled_at: null,
          last_poll_status: null,
          last_poll_error: null,
          last_rpid: null,
        },
        {
          id: 2,
          bvid: 'BV1Q541167Qg',
          aid: null,
          title: 'missing aid',
          poll_enabled: false,
          comment_count: 0,
          last_polled_at: null,
          last_poll_status: null,
          last_poll_error: null,
          last_rpid: null,
        },
      ],
    });
    container.querySelector('#bili-video-filter-btn').click();
    await flushPromises();

    mockApi.toggleBilibiliVideoPoll.mockRejectedValueOnce(new Error('toggle down'));
    container.querySelector('.bili-toggle-poll').click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('toggle down'), 'error');

    mockApi.syncBilibiliVideo.mockRejectedValueOnce(new Error('sync down'));
    container.querySelector('.bili-sync').click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('sync down'), 'error');

    const missingAidSync = [...container.querySelectorAll('.bili-sync')]
      .find((button) => button.dataset.hasAid === 'false');
    missingAidSync.disabled = false;
    missingAidSync.click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'warning');

    globalThis.confirm.mockReturnValueOnce(false);
    container.querySelector('.bili-delete').click();
    await flushPromises();
    expect(mockApi.deleteBilibiliVideo).not.toHaveBeenCalled();

    mockApi.deleteBilibiliVideo.mockRejectedValueOnce(new Error('delete down'));
    container.querySelector('.bili-delete').click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('delete down'), 'error');

    mockApi.getBilibiliVideos.mockRejectedValueOnce(new Error('video load down'));
    container.querySelector('#bili-video-filter-btn').click();
    await flushPromises();
    expect(container.querySelector('#bili-videos-wrapper .page-error').textContent).toContain('video load down');

    mockApi.addBilibiliVideo.mockRejectedValueOnce(new Error('add video down'));
    container.querySelector('#bili-video-bvid').value = 'BV1GJ411x7fD';
    container.querySelector('#bili-video-add').click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('add video down'), 'error');

    mockApi.triggerBilibiliPoll.mockRejectedValueOnce(new Error('poll down'));
    container.querySelector('#bili-poll-btn').click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('poll down'), 'error');
  });

  it('adds, filters, activates, and deletes credentials', async () => {
    const container = createPageContainer();
    mockApi.getBilibiliCredentials.mockResolvedValue({
      items: [
        {
          id: 7,
          name: 'active credential',
          is_active: true,
          active: true,
          has_sessdata: true,
          has_bili_jct: true,
          buvid3: 'fingerprint-active',
          expires_at: '2026-12-31T00:00:00.000Z',
        },
        {
          id: 8,
          name: 'inactive credential',
          is_active: false,
          active: false,
          has_sessdata: true,
          has_bili_jct: true,
          buvid3: 'fingerprint-inactive',
          expires_at: '2026-12-31T00:00:00.000Z',
        },
      ],
    });

    await render(container);

    container.querySelector('#cred-name').value = 'new credential';
    container.querySelector('#cred-sessdata').value = 'sess';
    container.querySelector('#cred-bili-jct').value = 'jct';
    container.querySelector('#cred-buvid3').value = 'buvid3';
    container.querySelector('#cred-buvid4').value = 'buvid4';
    container.querySelector('#cred-expires').value = '2026-12-31T00:00';
    container.querySelector('#cred-name').dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    }));
    await flushPromises();
    await flushPromises();

    expect(mockApi.addBilibiliCredential).toHaveBeenCalledWith(expect.objectContaining({
      name: 'new credential',
      sessdata: 'sess',
      bili_jct: 'jct',
      buvid3: 'buvid3',
      buvid4: 'buvid4',
      expires_at: expect.any(String),
    }));
    expect(container.querySelector('#cred-name').value).toBe('');

    mockApi.getBilibiliCredentials.mockClear();
    container.querySelector('#bili-cred-active-filter').value = 'inactive';
    container.querySelector('#bili-cred-active-filter').dispatchEvent(new Event('change'));
    await flushPromises();
    expect(mockApi.getBilibiliCredentials).toHaveBeenCalledTimes(1);

    container.querySelector('#bili-cred-expiry-filter').value = 'valid';
    container.querySelector('#bili-cred-expiry-filter').dispatchEvent(new Event('change'));
    await flushPromises();
    expect(mockApi.getBilibiliCredentials).toHaveBeenCalledTimes(2);

    container.querySelector('.cred-activate').click();
    await flushPromises();
    await flushPromises();
    expect(mockApi.activateBilibiliCredential).toHaveBeenCalledWith('8');

    container.querySelector('.cred-delete').click();
    await flushPromises();
    await flushPromises();
    expect(mockApi.deleteBilibiliCredential).toHaveBeenCalledWith(expect.any(String));
  });

  it('handles credential validation, load, activation, deletion, and add errors', async () => {
    const container = createPageContainer();
    mockApi.getBilibiliCredentials.mockResolvedValue({
      items: [
        {
          id: 8,
          name: 'inactive credential',
          is_active: false,
          active: false,
          has_sessdata: true,
          has_bili_jct: true,
          buvid3: 'fingerprint-inactive',
          expires_at: '2026-12-31T00:00:00.000Z',
        },
      ],
    });

    await render(container);

    container.querySelector('#cred-add').click();
    await flushPromises();
    expect(mockApi.addBilibiliCredential).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'warning');

    mockApi.addBilibiliCredential.mockRejectedValueOnce(new Error('add credential down'));
    container.querySelector('#cred-name').value = 'new credential';
    container.querySelector('#cred-sessdata').value = 'sess';
    container.querySelector('#cred-bili-jct').value = 'jct';
    container.querySelector('#cred-buvid3').value = 'buvid3';
    container.querySelector('#cred-add').click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('add credential down'), 'error');

    mockApi.activateBilibiliCredential.mockRejectedValueOnce(new Error('activate down'));
    container.querySelector('.cred-activate').click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('activate down'), 'error');

    globalThis.confirm.mockReturnValueOnce(false);
    container.querySelector('.cred-delete').click();
    await flushPromises();
    expect(mockApi.deleteBilibiliCredential).not.toHaveBeenCalled();

    mockApi.deleteBilibiliCredential.mockRejectedValueOnce(new Error('delete credential down'));
    container.querySelector('.cred-delete').click();
    await flushPromises();
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.stringContaining('delete credential down'), 'error');

    mockApi.getBilibiliCredentials.mockRejectedValueOnce(new Error('credential load down'));
    container.querySelector('#bili-cred-active-filter').dispatchEvent(new Event('change'));
    await flushPromises();
    expect(container.querySelector('#bili-creds-wrapper .page-error').textContent).toContain('credential load down');

    mockApi.getBilibiliCredentials.mockResolvedValueOnce({ items: [] });
    container.querySelector('#bili-cred-active-filter').value = 'active';
    container.querySelector('#bili-cred-active-filter').dispatchEvent(new Event('change'));
    await flushPromises();
    expect(container.querySelector('#bili-creds-wrapper .table-empty')).toBeTruthy();
  });

  it('renders status fallback branches for failed status and alternate readiness shapes', async () => {
    const failedContainer = createPageContainer();
    mockApi.getBilibiliStatus.mockRejectedValueOnce(new Error('status down'));

    await render(failedContainer);

    expect(failedContainer.querySelector('#bili-status-cards .page-error').textContent).toContain('status down');

    const alternateContainer = createPageContainer();
    mockApi.getBilibiliStatus.mockResolvedValueOnce({
      ok: true,
      enabled: false,
      polling_enabled: false,
      publish_enabled: false,
      video_count: 1,
      config: {},
      videos: {},
      credential: null,
      diagnostics: {
        ready: false,
        blocking_reasons: [],
        effective_publish_mode: '',
        signals: {
          credential_present: true,
          credential_complete: false,
          native_publish_enabled: false,
          polling_worker_enabled: false,
          real_auth_ready: false,
          auth_probe_reason: 'pending_probe',
        },
        release_gates: {},
      },
    });
    mockApi.getReadinessStatus.mockResolvedValueOnce({
      foundation_ready: undefined,
      delivery_ready: undefined,
      foundation_blockers: 'not-array',
      delivery_blockers: null,
      delivery_capability_blockers: [null, 'native_bilibili_publish'],
      delivery_capabilities: {
        capabilities: [
          {
            capability: 'custom_capability',
            status: 'custom_status',
            mode: '',
            missing_inputs: ['TOKEN', null],
          },
        ],
      },
    });
    mockApi.getBilibiliVideos.mockResolvedValueOnce({ total: 0, items: [] });
    mockApi.getBilibiliCredentials.mockResolvedValueOnce({ items: [] });

    await render(alternateContainer);

    expect(alternateContainer.textContent).toContain('custom_capability');
    expect(alternateContainer.textContent).toContain('custom_status');
    expect(alternateContainer.textContent).toContain('TOKEN');
    expect(alternateContainer.textContent).toContain('pending_probe');
  });
});
