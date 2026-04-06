import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createPageContainer } from '../utils/dom.js';

const { mockApi, mockShowToast } = vi.hoisted(() => ({
  mockApi: {
    getOverview: vi.fn(),
    getJobs: vi.fn(),
    getGatewayLogs: vi.fn(),
    getAuditSummary: vi.fn(),
  },
  mockShowToast: vi.fn(),
}));

vi.mock('../../src/api/admin.js', () => ({
  createAdminApi: () => mockApi,
}));

vi.mock('../../src/components/toast.js', () => ({
  showToast: mockShowToast,
}));

import { render } from '../../src/pages/dashboard.js';

describe('frontend test harness smoke', () => {
  beforeEach(() => {
    mockApi.getOverview.mockResolvedValue({
      total_comments: 12,
      total_jobs: 7,
      total_published: 3,
      pending_review: 2,
      total_failed: 1,
    });
    mockApi.getJobs.mockResolvedValue({
      items: [
        {
          id: 'job-12345678',
          status: 'published',
          comment_text: '测试评论内容',
          created_at: '2026-04-07T00:00:00.000Z',
        },
      ],
    });
    mockApi.getGatewayLogs.mockResolvedValue({ items: [{ id: 1 }] });
    mockApi.getAuditSummary.mockResolvedValue({
      total: 10,
      ok_count: 8,
      failed_count: 2,
    });
  });

  it('renders dashboard stats and latest job data', async () => {
    const container = createPageContainer();

    await render(container);

    expect(container.textContent).toContain('系统概览');
    expect(container.textContent).toContain('评论总数');
    expect(container.textContent).toContain('12');
    expect(container.textContent).toContain('最近任务');
    expect(container.textContent).toContain('测试评论内容');
    expect(mockApi.getOverview).toHaveBeenCalledTimes(1);
    expect(mockApi.getJobs).toHaveBeenCalledWith({ limit: 5 });
    expect(mockApi.getGatewayLogs).toHaveBeenCalledWith({ limit: 5 });
    expect(mockApi.getAuditSummary).toHaveBeenCalledWith({ days: 7 });
  });
});
