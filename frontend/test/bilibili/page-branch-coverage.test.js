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

const { render } = await import('../../src/pages/bilibili.js');

function resetBilibiliMocks() {
  for (const mock of Object.values(mockApi)) {
    mock.mockReset();
  }
  mockShowToast.mockReset();
  globalThis.confirm = vi.fn(() => true);

  mockApi.getBilibiliStatus.mockResolvedValue({
    ok: true,
    enabled: false,
    polling_enabled: false,
    publish_enabled: false,
    video_count: 0,
    config: {},
    videos: {},
    credential: null,
    diagnostics: null,
  });
  mockApi.getReadinessStatus.mockResolvedValue({
    foundation_ready: undefined,
    delivery_ready: undefined,
    foundation_blockers: [],
    delivery_blockers: [],
    delivery_capability_blockers: [],
    delivery_capabilities: 'unavailable',
  });
  mockApi.getBilibiliVideos.mockResolvedValue({ items: [], total: 0 });
  mockApi.getBilibiliCredentials.mockResolvedValue({ items: [] });
  mockApi.triggerBilibiliPoll.mockResolvedValue({ ok: true });
  mockApi.addBilibiliVideo.mockResolvedValue({ ok: true });
  mockApi.toggleBilibiliVideoPoll.mockResolvedValue({ ok: true });
  mockApi.syncBilibiliVideo.mockResolvedValue({ ok: true });
  mockApi.deleteBilibiliVideo.mockResolvedValue({ ok: true });
  mockApi.addBilibiliCredential.mockResolvedValue({ ok: true });
  mockApi.activateBilibiliCredential.mockResolvedValue({ ok: true });
  mockApi.deleteBilibiliCredential.mockResolvedValue({ ok: true });
}

describe('bilibili page branch coverage', () => {
  beforeEach(() => {
    resetBilibiliMocks();
  });

  it('renders fallback status cards when diagnostics and capability matrix are unavailable', async () => {
    const container = createPageContainer();

    await render(container);

    expect(mockApi.getBilibiliStatus).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('未配置活跃凭证');
    expect(container.textContent).not.toContain('Readiness 状态加载失败');
  });

  it('renders sparse readiness capability entries and runtime credential fallbacks', async () => {
    const container = createPageContainer();
    mockApi.getBilibiliStatus.mockResolvedValueOnce({
      ok: true,
      enabled: true,
      polling_enabled: false,
      publish_enabled: true,
      config: {},
      videos: {},
      credential: null,
      diagnostics: {
        ready: false,
        blocking_reasons: [],
        effective_publish_mode: '',
        signals: {},
        release_gates: {
          credential_present: true,
          credential_complete: true,
          real_auth_ready: false,
        },
      },
    });
    mockApi.getReadinessStatus.mockResolvedValueOnce({
      foundation_ready: true,
      delivery_ready: false,
      foundation_blockers: ['db_down'],
      delivery_blockers: [],
      delivery_capability_blockers: [],
      delivery_capabilities: {
        summary: [
          null,
          [],
          {
            capability: '',
            status: undefined,
            mode: undefined,
            missing_inputs: 'bad',
          },
          {
            capability: 'custom_runtime',
            status: undefined,
            mode: undefined,
            missing_inputs: [],
          },
        ],
      },
    });

    await render(container);

    expect(container.textContent).toContain('db_down');
    expect(container.textContent).toContain('custom_runtime');
    expect(container.textContent).toContain('mode=unknown');
  });

  it('renders empty capability summaries and runtime credential incomplete state', async () => {
    const container = createPageContainer();
    mockApi.getBilibiliStatus.mockResolvedValueOnce({
      ok: true,
      enabled: false,
      polling_enabled: false,
      publish_enabled: false,
      video_count: null,
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
          real_auth_ready: false,
        },
      },
    });
    mockApi.getReadinessStatus.mockResolvedValueOnce({
      foundation_ready: true,
      delivery_ready: true,
      foundation_blockers: [],
      delivery_blockers: [],
      delivery_capability_blockers: [],
      delivery_capabilities: {},
    });

    await render(container);

    expect(container.textContent).not.toContain('custom_runtime');
    expect(mockApi.getBilibiliStatus).toHaveBeenCalledTimes(1);
  });

  it('renders array and null video and credential payload fallbacks', async () => {
    const arrayContainer = createPageContainer();
    mockApi.getBilibiliVideos.mockResolvedValueOnce([
      {
        id: '',
        video_id: 'video-fallback-id',
        bvid: 'BV1GJ411x7fD',
        aid: 1001,
        title: 'array video',
        poll_enabled: false,
        comment_count: 0,
        last_polled_at: null,
        last_poll_status: null,
        last_poll_error: null,
        last_rpid: null,
      },
    ]);
    mockApi.getBilibiliCredentials.mockResolvedValueOnce([
      {
        id: '',
        credential_id: 'credential-fallback-id',
        name: 'array credential',
        is_active: false,
        active: false,
        has_sessdata: true,
        has_bili_jct: true,
        buvid3: 'fingerprint',
        expires_at: undefined,
      },
    ]);

    await render(arrayContainer);

    expect(arrayContainer.querySelector('.bili-toggle-poll').dataset.id).toBe('video-fallback-id');
    expect(arrayContainer.querySelector('.bili-delete').dataset.id).toBe('video-fallback-id');
    expect(arrayContainer.querySelector('.cred-activate').dataset.id).toBe('credential-fallback-id');
    expect(arrayContainer.querySelector('.cred-delete').dataset.id).toBe('credential-fallback-id');

    const emptyContainer = createPageContainer();
    mockApi.getBilibiliVideos.mockResolvedValueOnce(null);
    mockApi.getBilibiliCredentials.mockResolvedValueOnce(null);

    await render(emptyContainer);

    expect(emptyContainer.querySelector('#bili-videos-wrapper .table-empty')).toBeTruthy();
    expect(emptyContainer.querySelector('#bili-creds-wrapper .table-empty')).toBeTruthy();
  });

  it('shows non-auto-activated credential add success text', async () => {
    const container = createPageContainer();
    mockApi.addBilibiliCredential.mockResolvedValueOnce({ ok: true, item: { is_active: false } });

    await render(container);

    container.querySelector('#cred-name').value = 'new credential';
    container.querySelector('#cred-sessdata').value = 'sess';
    container.querySelector('#cred-bili-jct').value = 'jct';
    container.querySelector('#cred-buvid3').value = 'buvid3';
    container.querySelector('#cred-add').click();
    await flushPromises();

    expect(mockApi.addBilibiliCredential).toHaveBeenCalledWith(expect.objectContaining({
      name: 'new credential',
      expires_at: undefined,
    }));
    expect(mockShowToast).toHaveBeenLastCalledWith(expect.any(String), 'success');
  });

  it('covers keyboard guard branches, poll filter change, and first-page previous no-op', async () => {
    const container = createPageContainer();

    await render(container);
    mockApi.addBilibiliVideo.mockClear();
    mockApi.getBilibiliVideos.mockClear();

    const bvidInput = container.querySelector('#bili-video-bvid');
    const addButton = container.querySelector('#bili-video-add');

    bvidInput.value = 'BV1GJ411x7fD';
    bvidInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    await flushPromises();
    expect(mockApi.addBilibiliVideo).not.toHaveBeenCalled();

    addButton.disabled = true;
    bvidInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await flushPromises();
    expect(mockApi.addBilibiliVideo).not.toHaveBeenCalled();

    container.querySelector('#bili-video-poll-filter').value = 'false';
    container.querySelector('#bili-video-poll-filter').dispatchEvent(new Event('change'));
    await flushPromises();
    expect(mockApi.getBilibiliVideos).toHaveBeenCalledWith({
      limit: 50,
      offset: 0,
      poll_enabled: false,
    });

    mockApi.getBilibiliVideos.mockClear();
    container.querySelector('#bili-video-prev').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flushPromises();
    expect(mockApi.getBilibiliVideos).not.toHaveBeenCalled();
  });
});
