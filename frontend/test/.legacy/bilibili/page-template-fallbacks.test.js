import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createPageContainer } from '../utils/dom.js';

const { mockApi } = vi.hoisted(() => ({
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
}));

vi.mock('../../src/api/admin.js', () => ({
  createAdminApi: () => mockApi,
}));

vi.mock('../../src/components/toast.js', () => ({
  showToast: vi.fn(),
}));

vi.mock('../../src/pages/bilibili/formatters.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    formatBilibiliPollIntervalHint: vi.fn(() => ''),
    formatBilibiliRateLimitHint: vi.fn(() => ''),
  };
});

vi.mock('../../src/pages/bilibili/credential.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    formatBilibiliCredentialExpiryHint: vi.fn(() => ''),
    getBilibiliCredentialUsageState: vi.fn(() => ({ label: 'mock usage', detail: '' })),
  };
});

const { render } = await import('../../src/pages/bilibili.js');

function resetBilibiliMocks() {
  for (const mock of Object.values(mockApi)) {
    mock.mockReset();
  }

  mockApi.getBilibiliStatus.mockResolvedValue({
    ok: true,
    enabled: true,
    polling_enabled: true,
    publish_enabled: true,
    video_count: 0,
    config: {
      poll_interval_seconds: 60,
      rate_limit_per_minute: 120,
    },
    videos: {},
    credential: null,
    diagnostics: {
      ready: true,
      effective_publish_mode: 'native_bilibili',
      blocking_reasons: [],
      signals: {},
      release_gates: {},
    },
  });
  mockApi.getReadinessStatus.mockResolvedValue({
    foundation_ready: true,
    delivery_ready: true,
    delivery_capability_blockers: [],
    delivery_capabilities: {
      capabilities: [
        { status: 'configured', mode: 'native' },
        { capability: 'native_bilibili_publish', status: 'configured', mode: 'native', missing_inputs: [] },
      ],
    },
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

describe('bilibili page template fallback branches', () => {
  beforeEach(() => {
    resetBilibiliMocks();
  });

  it('renders status cards when optional helper hints are empty', async () => {
    const container = createPageContainer();

    await render(container);

    expect(container.querySelector('#bili-status-cards').textContent).toContain('mock usage');
    expect(container.querySelector('#bili-status-cards').textContent).toContain('原生 B 站发布');
  });
});
